"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { flushEmailQueueAfterResponse } from "@/lib/email-queue";

const segmentSchema = z
  .object({
    scope: z.enum(["nacional", "distrital", "concelhia"]),
    districtId: z.string().uuid().optional(),
    concelhiaId: z.string().uuid().optional(),
  })
  .refine((s) => s.scope !== "distrital" || !!s.districtId, {
    message: "Indica o distrito para um envio distrital.",
  })
  .refine((s) => s.scope !== "concelhia" || !!s.concelhiaId, {
    message: "Indica a concelhia para um envio concelhio.",
  });

const createCommunicationSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(20000),
  segment: segmentSchema,
});

/* ------------------------------------------------------------------ */
/* CRIAR RASCUNHO                                                     */
/* ------------------------------------------------------------------ */

export const createCommunicationDraft = roleProtectedActionClient("moderador_nacional")
  .schema(createCommunicationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: communication, error } = await ctx.supabase
      .from("communications")
      .insert({
        title: parsedInput.title,
        body: parsedInput.body,
        segment_district_id:
          parsedInput.segment.scope === "distrital" ? parsedInput.segment.districtId : null,
        segment_concelhia_id:
          parsedInput.segment.scope === "concelhia" ? parsedInput.segment.concelhiaId : null,
      })
      .select("id")
      .single();

    if (error || !communication) {
      throw new ActionError("Não foi possível guardar o rascunho.");
    }

    revalidatePath("/comunicacao");

    return { communicationId: communication.id };
  });

/* ------------------------------------------------------------------ */
/* ENVIAR — cria uma campanha Brevo segmentada e dispara imediatamente */
/* ------------------------------------------------------------------ */

const sendCommunicationSchema = z.object({ communicationId: z.string().uuid() });

export const sendCommunication = roleProtectedActionClient("moderador_nacional")
  .schema(sendCommunicationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: communication, error: fetchError } = await ctx.supabase
      .from("communications")
      .select("id, title, body, sent_at, segment_district_id, segment_concelhia_id")
      .eq("id", parsedInput.communicationId)
      .single();

    if (fetchError || !communication) {
      throw new ActionError("Comunicado não encontrado.");
    }

    if (communication.sent_at) {
      throw new ActionError("Este comunicado já foi enviado.");
    }

    // Destinatários = militantes ativos (com conta) no segmento escolhido. O distrito
    // vem da concelhia do militante: profiles.district_id só existe para a staff.
    const { data: members, error: recipientsError } = await ctx.supabase
      .from("members")
      .select("concelhia_id, concelhia:concelhias(district_id), profile:profiles(email, full_name)")
      .eq("status", "ativo");

    const one = (v: any) => (Array.isArray(v) ? v[0] : v);
    const seen = new Set<string>();
    const recipients = (members ?? [])
      .filter((m: any) => {
        if (communication.segment_concelhia_id) return m.concelhia_id === communication.segment_concelhia_id;
        if (communication.segment_district_id) return one(m.concelhia)?.district_id === communication.segment_district_id;
        return true;
      })
      .map((m: any) => one(m.profile))
      .filter((p: any) => p?.email && !seen.has(p.email) && seen.add(p.email)) as { email: string; full_name: string }[];

    if (recipientsError || recipients.length === 0) {
      throw new ActionError("Não foram encontrados destinatários para este segmento.");
    }

    const campaignEmailTemplateKey = "communication_generic";

    const queueRows = recipients.map((recipient) => ({
      template_key: campaignEmailTemplateKey,
      to_email: recipient.email,
      to_name: recipient.full_name,
      params: { title: communication.title, body: communication.body },
    }));

    const { error: queueError } = await ctx.supabase.from("email_queue").insert(queueRows);

    if (queueError) {
      throw new ActionError("Não foi possível colocar o comunicado na fila de envio.");
    }

    await ctx.supabase
      .from("communications")
      .update({
        sent_at: new Date().toISOString(),
        sent_by_profile_id: ctx.profile.id,
      })
      .eq("id", parsedInput.communicationId);

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "communication",
      entity_id: parsedInput.communicationId,
      metadata: { recipientCount: recipients.length },
    });

    revalidatePath("/comunicacao");
    flushEmailQueueAfterResponse();

    return { success: true as const, recipientCount: recipients.length };
  });
