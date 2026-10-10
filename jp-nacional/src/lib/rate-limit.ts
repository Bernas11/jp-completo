import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting distribuído via Upstash Redis quando as env vars
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN estão definidas
 * (necessário em produção, com múltiplas instâncias serverless).
 *
 * Sem essas env vars (ex: desenvolvimento local), cai automaticamente
 * para um limitador em memória por processo — funciona out-of-the-box
 * mas não é partilhado entre instâncias.
 */

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
      prefix: `jp:${prefix}`,
    });
  }

  const [n, unit] = janela.split(" ");
  const ms = Number(n) * (unit === "h" ? 3600_000 : unit === "m" ? 60_000 : 1000);
  return createMemoryLimiter(limite, ms);
}

/** 5 pedidos por 10 minutos por IP — formulário de adesão. */
export const adesaoLimiter = createLimiter("adesao", 5, "10 m");

/** 3 pedidos por minuto por IP — subscrição de newsletter. */
export const newsletterLimiter = createLimiter("newsletter", 3, "1 m");

/** Extrai o IP do pedido a partir dos headers habituais em Vercel/proxies. */
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}
