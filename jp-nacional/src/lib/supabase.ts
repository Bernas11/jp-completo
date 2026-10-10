import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Projeto A — Militância.
 * Base de dados isolada, acesso restrito à CPN. Guarda dados de filiação
 * e o storage privado de documentos de identificação.
 *
 * Usa a service role key APENAS em código de servidor (API routes,
 * server actions) — nunca no browser. A key pública (anon) não chega
 * a ser exposta aqui porque este ficheiro só deve ser importado
 * por ficheiros "server-only".
 */
let _militanciaClient: SupabaseClient | null = null;

export function getMilitanciaClient(): SupabaseClient {
  if (_militanciaClient) return _militanciaClient;

  const url = process.env.SUPABASE_MILITANCIA_URL;
  const serviceKey = process.env.SUPABASE_MILITANCIA_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Configuração em falta: SUPABASE_MILITANCIA_URL / SUPABASE_MILITANCIA_SERVICE_ROLE_KEY. " +
      "Ver .env.example."
    );
  }

  _militanciaClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return _militanciaClient;
}

/**
 * Projeto B — Portal (fóruns, mural, eventos, documentos).
 * Nunca tem acesso direto às tabelas do Projeto A.
 */
let _portalClient: SupabaseClient | null = null;

export function getPortalClient(): SupabaseClient {
  if (_portalClient) return _portalClient;

  const url = process.env.SUPABASE_PORTAL_URL;
  const serviceKey = process.env.SUPABASE_PORTAL_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Configuração em falta: SUPABASE_PORTAL_URL / SUPABASE_PORTAL_SERVICE_ROLE_KEY. " +
      "Ver .env.example."
    );
  }

  _portalClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return _portalClient;
}
