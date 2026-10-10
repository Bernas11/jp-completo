import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> };

function createMemoryLimiter(limite: number, janelaMs: number): Limiter {
  const tentativas = new Map<string, { count: number; reset: number }>();
  return {
    async limit(key: string) {
      const agora = Date.now();
      const registo = tentativas.get(key);
      if (!registo || agora > registo.reset) {
        tentativas.set(key, { count: 1, reset: agora + janelaMs });
        return { success: true };
      }
      registo.count += 1;
      return { success: registo.count <= limite };
    },
  };
}

function createLimiter(prefix: string, limite: number, janela: `${number} ${"s" | "m" | "h"}`): Limiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redis = new Redis({ url, token });
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limite, janela),
      prefix: `jp-admin:${prefix}`,
    });
  }

  const [n, unit] = janela.split(" ");
  const ms = Number(n) * (unit === "h" ? 3600_000 : unit === "m" ? 60_000 : 1000);
  return createMemoryLimiter(limite, ms);
}

/**
 * 5 tentativas de login por 10 minutos por IP — a porta de entrada mais
 * sensível de toda a plataforma, alvo natural de força bruta.
 */
export const loginLimiter = createLimiter("login", 5, "10 m");

/** Extrai o IP do pedido a partir dos headers habituais em Vercel/proxies. */
export function getClientIp(headersList: Headers): string {
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}
