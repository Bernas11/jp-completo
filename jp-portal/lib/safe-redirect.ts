/**
 * Resolve um destino pós-autenticação apenas dentro da origem do pedido.
 * Aceita caminhos absolutos locais (/rota), nunca URLs absolutas ou URLs //host.
 */
export function getSafeInternalRedirect(redirectTo: string | null, requestUrl: string): URL {
  const fallback = new URL("/", requestUrl);
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return fallback;
  }

  try {
    const destination = new URL(redirectTo, requestUrl);
    return destination.origin === fallback.origin ? destination : fallback;
  } catch {
    return fallback;
  }
}
