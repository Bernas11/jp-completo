import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/* A fila `email_queue` existia mas NINGUÉM a consumia: os comunicados (e e-mails de
 * pedidos/recusas) ficavam eternamente "pendente". Este processador envia-os pela API
 * transacional do Brevo. Sem BREVO_API_KEY + BREVO_SENDER_EMAIL não faz nada e não
 * marca nada como falhado — assim que as variáveis forem definidas, o que estiver na
 * fila segue. */

const BATCH = 50;
const MAX_ATTEMPTS = 5;

export function isEmailConfigured() {
  return !!process.env.BREVO_API_KEY && !!process.env.BREVO_SENDER_EMAIL;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#1c2540">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;padding:28px">
<h2 style="margin:0 0 16px;color:#1b3a8a">${esc(title)}</h2>
${bodyHtml}
<p style="margin-top:28px;font-size:12px;color:#7a869a">Juventude Popular</p>
</div></div></body></html>`;
}

function render(templateKey: string, toName: string, params: Record<string, any>) {
  switch (templateKey) {
    case "communication_generic":
      // o corpo é escrito pela staff nacional e aceita HTML simples
      return { subject: String(params.title ?? "Comunicado"), html: wrap(String(params.title ?? "Comunicado"), String(params.body ?? "")) };
    case "membership_rejected":
      return {
        subject: "Pedido de adesão",
        html: wrap("Pedido de adesão", `<p>Olá ${esc(toName)},</p><p>Lamentamos informar que o teu pedido de adesão não foi aprovado.${params.reason ? ` Motivo: ${esc(params.reason)}.` : ""}</p>`),
      };
    default:
      return {
        subject: String(params.title ?? "Juventude Popular"),
        html: wrap(String(params.title ?? "Juventude Popular"), `<p>Olá ${esc(toName)},</p><p>${esc(params.message ?? "Tens uma nova atualização.")}</p>`),
      };
  }
}

export async function processEmailQueue() {
  if (!isEmailConfigured()) return { processed: 0, sent: 0, failed: 0, skipped: true as const };

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("email_queue")
    .select("id, template_key, to_email, to_name, params, attempts")
    .eq("status", "pendente")
    .lte("eligible_at", new Date().toISOString())
    .order("created_at")
    .limit(BATCH);

  if (error) throw new Error("Falha ao ler a fila de emails");

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      const { subject, html } = render(row.template_key, row.to_name, (row.params ?? {}) as Record<string, any>);
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME ?? "Juventude Popular" },
          to: [{ email: row.to_email, name: row.to_name }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) throw new Error(`Brevo HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);

      await supabase.from("email_queue").update({ status: "enviado", sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      sent++;
    } catch (err) {
      const attempts = (row.attempts ?? 0) + 1;
      await supabase
        .from("email_queue")
        .update({
          attempts,
          status: attempts >= MAX_ATTEMPTS ? "falhado" : "pendente",
          last_error: err instanceof Error ? err.message : String(err),
          eligible_at: new Date(Date.now() + attempts * 10 * 60 * 1000).toISOString(),
        })
        .eq("id", row.id);
      failed++;
    }
  }

  return { processed: rows?.length ?? 0, sent, failed, skipped: false as const };
}

/** Envia logo após a resposta ao utilizador; o cron diário fica como rede de segurança. */
export function flushEmailQueueAfterResponse() {
  try {
    after(async () => {
      try {
        await processEmailQueue();
      } catch (err) {
        console.error("[email-queue] flush imediato falhou:", err);
      }
    });
  } catch {
    /* fora de um contexto de pedido */
  }
}
