import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

describe("loginLimiter (5 tentativas / 10min)", () => {
  beforeEach(() => vi.resetModules());

  it("permite os primeiros 5 pedidos e bloqueia o 6º", async () => {
    const { loginLimiter } = await import("@/lib/rate-limit");
    const ip = "198.51.100.50";

    for (let i = 0; i < 5; i++) {
      expect((await loginLimiter.limit(ip)).success).toBe(true);
    }
    expect((await loginLimiter.limit(ip)).success).toBe(false);
  });

  it("não afeta o limite de um IP diferente (não bloqueia outros administradores)", async () => {
    const { loginLimiter } = await import("@/lib/rate-limit");
    const ipAtacante = "198.51.100.60";
    const ipLegitimo = "198.51.100.61";

    for (let i = 0; i < 5; i++) await loginLimiter.limit(ipAtacante);
    const bloqueado = await loginLimiter.limit(ipAtacante);
    const permitido = await loginLimiter.limit(ipLegitimo);

    expect(bloqueado.success).toBe(false);
    expect(permitido.success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extrai o primeiro IP de x-forwarded-for", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const headers = new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("198.51.100.1");
  });
});
