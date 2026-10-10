import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Leitura (só leitura, service role) do projeto "jp-militancia" (o mesmo
 * que o Admin usa), usada apenas para mostrar os documentos nacionais
 * geridos em /documentacao no Admin também aqui no Portal.
 *
 * NOTA DE ARQUITETURA: o resto da comunicação entre o Portal e a
 * Militância passa pelo sync_outbox (eventos assinados, não leitura
 * direta à BD do outro projeto) — ver lib/sync-signature.ts. Optei aqui
 * por uma leitura direta, mais simples, porque é só leitura de conteúdo
 * público (documentos nacionais, sem dados pessoais) e replica
 * exatamente o que o jp-nacional já faz para a mesma página de
 * documentação. Se preferires manter tudo a passar pelo sync_outbox por
 * consistência, isto dá para reescrever como um novo tipo de evento
 * ("document_published") — é mais trabalho, mas fica arquiteturalmente
 * uniforme. Diz se preferes essa via.
 *
 * MACACOS: precisa de SUPABASE_MILITANCIA_URL e
 * SUPABASE_MILITANCIA_SERVICE_ROLE_KEY nas variáveis de ambiente deste
 * projeto (mesmos valores já usados no jp-nacional). */
let _militanciaClient: SupabaseClient | null = null;

export function getMilitanciaClient(): SupabaseClient {
  if (_militanciaClient) return _militanciaClient;

  const url = process.env.SUPABASE_MILITANCIA_URL;
  const serviceKey = process.env.SUPABASE_MILITANCIA_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Configuração em falta: SUPABASE_MILITANCIA_URL / SUPABASE_MILITANCIA_SERVICE_ROLE_KEY.",
    );
  }

  _militanciaClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _militanciaClient;
}
