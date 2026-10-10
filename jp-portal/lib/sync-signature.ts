const SYNC_SHARED_SECRET = process.env.SYNC_SHARED_SECRET!;

async function hmacHex(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SYNC_SHARED_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/**
 * Verifica o header `X-Sync-Signature` de um pedido vindo do outbox do
 * Projeto A (ver `projeto-a-militancia/supabase-functions/sync-outbox-processor.ts`).
 * A assinatura é HMAC-SHA256 (hex) do corpo em bruto, com o segredo partilhado
 * `SYNC_SHARED_SECRET` (o mesmo dos dois lados).
 */
export async function verifySyncSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = await hmacHex(rawBody);
  return timingSafeEqual(expected, signatureHeader);
}
