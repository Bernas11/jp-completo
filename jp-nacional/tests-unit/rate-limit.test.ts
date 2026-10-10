import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

describe("adesaoLimiter (5 pedidos / 10min)", () => {
  beforeEach(() => vi.resetModules());

  it("permite os primeiros 5 pedidos e bloqueia o 6º", async () => {
    const { adesaoLimiter } = await import("@/lib/rate-limit");
    const ip = "198.51.100.10";

    for (let i = 0; i < 5; i++) {
      expect((await adesaoLimiter.limit(ip)).success).toBe(true);
    }
    expect((await adesaoLimiter.limit(ip)).success).toBe(false);
  });
});

describe("newsletterLimiter (3 pedidos / 1min)", () => {
  beforeEach(() => vi.resetModules());

  it("permite os primeiros 3 pedidos e bloqueia o 4º", async () => {
    const { newsletterLimiter } = await import("@/lib/rate-limit");
    const ip = "198.51.100.20";

    for (let i = 0; i < 3; i++) {
      expect((await newsletterLimiter.limit(ip)).success).toBe(true);
    }
    expect((await newsletterLimiter.limit(ip)).success).toBe(false);
  });

  it("mantém limites independentes entre adesão e newsletter para o mesmo IP", async () => {
    const { adesaoLimiter, newsletterLimiter } = await import("@/lib/rate-limit");
    const ip = "198.51.100.30";

    for (let i = 0; i < 3; i++) await newsletterLimiter.limit(ip);
    expect((await newsletterLimiter.limit(ip)).success).toBe(false);

    // o mesmo IP ainda deve poder pedir adesão — são limitadores distintos
    expect((await adesaoLimiter.limit(ip)).success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extrai o primeiro IP de x-forwarded-for", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("198.51.100.1");
  });

  it("devolve 'desconhecido' quando o header não existe", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("desconhecido");
  });
});
