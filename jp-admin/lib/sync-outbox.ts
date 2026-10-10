import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { signSyncPayload } from "@/lib/sync-signature";

/* ACHADO GRAVE: a tabela sync_outbox (com colunas status/attempts/
 * last_error/eligible_at/processed_at, claramente desenhadas para um
 * processador com retries) nunca teve NENHUM processador. O comentário
 * em lib/sync-signature.ts refere um
 * "projeto-a-militancia/supabase-functions/sync-outbox-processor.ts"
 * que nunca chegou a existir em nenhum dos três projetos. Confirmado
 * diretamente na BD: 8 eventos acumulados, todos "pendente", attempts=0,
 * processed_at=null — nunca ninguém tentou entregá-los. É por isto que
 * o Portal "não verifica se é militante nem moderador": os eventos
 * member_approved/member_role_changed nunca chegam a /api/sync/member.
 *
 * Esta rota faz UMA passagem pelos eventos pendentes e entrega-os ao
 * Portal, com backoff exponencial em caso de falha. Precisa de ser
 * chamada periodicamente — ver vercel.json (Vercel Cron chama isto a
 * cada poucos minutos, autenticado com CRON_SECRET).
 *
 * MACACOS: variáveis de ambiente necessárias em produção:
 *   - CRON_SECRET (Vercel define isto automaticamente ao configurar o
 *     cron job, mas tens de o definir tu nas env vars do projeto)
 *   - PORTAL_SYNC_MEMBER_URL  (ex: https://jp-portal.vercel.app/api/sync/member)
 *   - PORTAL_SYNC_EVENT_URL   (ex: https://jp-portal.vercel.app/api/sync/event)
 * (SYNC_SHARED_SECRET já existe, é o mesmo usado por getEventAttendees) */

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 50;

function targetUrlFor(eventType: string): string | null {
  if (eventType.startsWith("member_")) return process.env.PORTAL_SYNC_MEMBER_URL ?? null;
  if (eventType.startsWith("event_")) return process.env.PORTAL_SYNC_EVENT_URL ?? null;
  return null;
}

function backoffSeconds(attempts: number): number {
  // 1min, 2min, 4min, 8min... até 1h no máximo
  return Math.min(60 * 2 ** attempts, 3600);
}

export async function processSyncOutbox() {
  const supabase = createSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("sync_outbox")
    .select("id, event_type, entity_id, payload, attempts")
    .eq("status", "pendente")
    .lte("eligible_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[sync-outbox] falha ao ler eventos pendentes:", error);
    throw new Error("Falha ao ler a fila");
  }

  let delivered = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const targetUrl = targetUrlFor(row.event_type);

    if (!targetUrl) {
      console.error(`[sync-outbox] sem URL de destino configurado para ${row.event_type}`);
      skipped += 1;
      continue;
    }

    const body = JSON.stringify({ eventId: row.id, eventType: row.event_type, payload: row.payload });

    try {
      const signature = await signSyncPayload(body);
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sync-Signature": signature },
        body,
        redirect: "manual", // um redirect (ex.: para /login) NÃO é uma entrega
      });

      if (response.status >= 300 && response.status < 400) {
        throw new Error(`Redirecionado (HTTP ${response.status}) para ${response.headers.get("location")} — o destino não aceitou o evento`);
      }

      if (response.ok) {
        await supabase
          .from("sync_outbox")
          .update({ status: "processado", processed_at: new Date().toISOString() })
          .eq("id", row.id);
        delivered += 1;
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => "")}`);
      }
    } catch (err) {
      const attempts = row.attempts + 1;
      const errorMessage = err instanceof Error ? err.message : String(err);

      await supabase
        .from("sync_outbox")
        .update({
          attempts,
          last_error: errorMessage.slice(0, 500),
          status: attempts >= MAX_ATTEMPTS ? "falhado" : "pendente",
          eligible_at: new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString(),
        })
        .eq("id", row.id);

      failed += 1;
      console.error(`[sync-outbox] falha ao entregar ${row.event_type} (${row.id}), tentativa ${attempts}:`, errorMessage);
    }
  }

  return { processed: rows?.length ?? 0, delivered, failed, skipped };
}

/**
 * Entrega os eventos pendentes ao Portal logo DEPOIS de a resposta ir para o
 * utilizador (não atrasa a action). O cron diário fica como rede de segurança
 * para retries. Chamar no fim de qualquer action que dispare um trigger de
 * sync_outbox (aprovar militante, mudar papel, transferir, eventos).
 */
export function flushSyncOutboxAfterResponse() {
  try {
    after(async () => {
      try {
        await processSyncOutbox();
      } catch (err) {
        console.error("[sync-outbox] flush imediato falhou:", err);
      }
    });
  } catch {
    // fora de um contexto de pedido (ex.: scripts) — o cron trata do resto
  }
}
