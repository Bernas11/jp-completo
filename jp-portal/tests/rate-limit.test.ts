import { describe, it, expect, beforeEach, vi } from "vitest";

// força o fallback em memória, sem depender de credenciais Upstash reais
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

describe("magicLinkLimiter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("permite os primeiros 5 pedidos do mesmo IP dentro da janela", async () => {
    const { magicLinkLimiter } = await import("@/lib/rate-limit");
    const ip = "203.0.113.10";

    for (let i = 0; i < 5; i++) {
      const { success } = await magicLinkLimiter.limit(ip);
      expect(success).toBe(true);
    }
  });

  it("bloqueia o 6º pedido do mesmo IP dentro da janela de 10 minutos", async () => {
    const { magicLinkLimiter } = await import("@/lib/rate-limit");
    const ip = "203.0.113.20";

    for (let i = 0; i < 5; i++) {
      await magicLinkLimiter.limit(ip);
    }
    const { success } = await magicLinkLimiter.limit(ip);
    expect(success).toBe(false);
  });

  it("não afeta o limite de um IP diferente", async () => {
    const { magicLinkLimiter } = await import("@/lib/rate-limit");
    const ipA = "203.0.113.30";
    const ipB = "203.0.113.31";

    for (let i = 0; i < 5; i++) {
      await magicLinkLimiter.limit(ipA);
    }
    const bloqueadoA = await magicLinkLimiter.limit(ipA);
    const permitidoB = await magicLinkLimiter.limit(ipB);

    expect(bloqueadoA.success).toBe(false);
    expect(permitidoB.success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extrai o primeiro IP de x-forwarded-for", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const headers = new Headers({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("203.0.113.1");
  });

  it("devolve 'desconhecido' quando o header não existe", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("desconhecido");
  });
});
