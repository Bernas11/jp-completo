import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const MAX_ATTEMPTS = 6;
const BATCH_SIZE = 50;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function nextEligibleAt(attempts: number): Date {
  const delayMinutes = Math.min(2 ** attempts, 30);
  return new Date(Date.now() + delayMinutes * 60_000);
}

Deno.serve(async (req) => {
  const cronSecret = req.headers.get("X-Cron-Secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: templates } = await supabaseAdmin
    .from("email_templates")
    .select("key, brevo_template_id");

  const templateMap = new Map((templates ?? []).map((t) => [t.key, t.brevo_template_id]));

  const { data: pending, error: fetchError } = await supabaseAdmin
    .from("email_queue")
    .select("*")
    .eq("status", "pendente")
    .lt("attempts", MAX_ATTEMPTS)
    .lte("eligible_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("Erro ao ler email_queue:", fetchError);
    return new Response(JSON.stringify({ error: "Falha ao ler fila" }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const item of pending ?? []) {
    const brevoTemplateId = templateMap.get(item.template_key);

    if (!brevoTemplateId) {
      await supabaseAdmin
        .from("email_queue")
        .update({ status: "falhado", last_error: `Template desconhecido: ${item.template_key}` })
        .eq("id", item.id);
      failed++;
      continue;
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
        body: JSON.stringify({
          to: [{ email: item.to_email, name: item.to_name }],
          templateId: brevoTemplateId,
          params: item.params,
        }),
      });

      if (!response.ok) {
        throw new Error(`Brevo respondeu ${response.status}: ${await response.text()}`);
      }

      await supabaseAdmin
        .from("email_queue")
        .update({ status: "enviado", sent_at: new Date().toISOString() })
        .eq("id", item.id);

      sent++;
    } catch (err) {
      const attempts = item.attempts + 1;
      const willRetry = attempts < MAX_ATTEMPTS;

      await supabaseAdmin
        .from("email_queue")
        .update({
          attempts,
          status: willRetry ? "pendente" : "falhado",
          last_error: err instanceof Error ? err.message : String(err),
          eligible_at: willRetry ? nextEligibleAt(attempts).toISOString() : item.eligible_at,
        })
        .eq("id", item.id);

      console.error(`Email ${item.id} falhou (tentativa ${attempts}):`, err);
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: pending?.length ?? 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
