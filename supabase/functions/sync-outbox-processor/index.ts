import { createClient } from "jsr:@supabase/supabase-js@2";
import { portalUrlFor, nextEligibleAt, signPayload as signPayloadWith } from "./_shared/sync-logic.ts";

const PORTAL_SYNC_MEMBER_URL = Deno.env.get("PORTAL_SYNC_MEMBER_URL")!;
const PORTAL_SYNC_EVENT_URL = Deno.env.get("PORTAL_SYNC_EVENT_URL")!;
const SYNC_SHARED_SECRET = Deno.env.get("SYNC_SHARED_SECRET")!;
const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 25;

const portalUrls = { member: PORTAL_SYNC_MEMBER_URL, event: PORTAL_SYNC_EVENT_URL };

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const signPayload = (body: string) => signPayloadWith(body, SYNC_SHARED_SECRET);

Deno.serve(async (req) => {
  const cronSecret = req.headers.get("X-Cron-Secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: pendingEvents, error: fetchError } = await supabaseAdmin
    .from("sync_outbox")
    .select("*")
    .eq("status", "pendente")
    .lt("attempts", MAX_ATTEMPTS)
    .lte("eligible_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("Erro ao ler sync_outbox:", fetchError);
    return new Response(JSON.stringify({ error: "Falha ao ler fila" }), { status: 500 });
  }

  let processed = 0;
  let failed = 0;

  for (const event of pendingEvents ?? []) {
    const body = JSON.stringify({
      eventId: event.id,
      eventType: event.event_type,
      payload: event.payload,
    });
    const signature = await signPayload(body);

    try {
      const response = await fetch(portalUrlFor(event.event_type, portalUrls), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sync-Signature": signature,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Portal respondeu ${response.status}: ${await response.text()}`);
      }

      await supabaseAdmin
        .from("sync_outbox")
        .update({ status: "processado", processed_at: new Date().toISOString() })
        .eq("id", event.id);

      processed++;
    } catch (err) {
      const attempts = event.attempts + 1;
      const willRetry = attempts < MAX_ATTEMPTS;

      await supabaseAdmin
        .from("sync_outbox")
        .update({
          attempts,
          status: willRetry ? "pendente" : "falhado",
          last_error: err instanceof Error ? err.message : String(err),
          eligible_at: willRetry ? nextEligibleAt(attempts).toISOString() : event.eligible_at,
        })
        .eq("id", event.id);

      console.error(`Evento ${event.id} falhou (tentativa ${attempts}):`, err);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed, failed, total: pendingEvents?.length ?? 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
