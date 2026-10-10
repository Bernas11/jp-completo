"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { flushSyncOutboxAfterResponse } from "@/lib/sync-outbox";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "jp-admin:membership-actions",
});

async function assertNotRateLimited(profileId: string) {
  const { success } = await ratelimit.limit(profileId);
  if (!success) {
    throw new ActionError("Demasiados pedidos. Aguarda um momento antes de tentar novamente.");
  }
}

/* ------------------------------------------------------------------ */
/* APROVAR                                                            */
/* ------------------------------------------------------------------ */

const approveMembershipRequestSchema = z.object({
  membershipRequestId: z.string().uuid(),
});

export const approveMembershipRequest = roleProtectedActionClient("administrador")
  .schema(approveMembershipRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertNotRateLimited(ctx.profile.id);

    const {
      data: { session },
    } = await ctx.supabase.auth.getSession();

    if (!session) {
      throw new ActionError("Sessão inválida.");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-membership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ membershipRequestId: parsedInput.membershipRequestId }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ActionError(body.error ?? "Não foi possível aprovar o pedido.");
    }

    revalidatePath("/militancia/pedidos");
    revalidatePath("/militancia/lista");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* RECUSAR                                                            */
/* ------------------------------------------------------------------ */

const rejectMembershipRequestSchema = z.object({
  membershipRequestId: z.string().uuid(),
  reason: z.string().min(10, "Explica em poucas palavras o motivo da recusa.").max(500),
});

export const rejectMembershipRequest = roleProtectedActionClient("administrador")
  .schema(rejectMembershipRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertNotRateLimited(ctx.profile.id);

    const { data: request, error: fetchError } = await ctx.supabase
      .from("membership_requests")
      .select("id, status, email, full_name")
      .eq("id", parsedInput.membershipRequestId)
      .single();

    if (fetchError || !request) {
      throw new ActionError("Pedido de filiação não encontrado.");
    }

    if (request.status !== "pendente") {
      throw new ActionError("Este pedido já foi processado.");
    }

    const { error: updateError } = await ctx.supabase
      .from("membership_requests")
      .update({
        status: "recusado",
        reviewed_by_profile_id: ctx.profile.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: parsedInput.reason,
      })
      .eq("id", parsedInput.membershipRequestId);

    if (updateError) {
      throw new ActionError("Não foi possível recusar o pedido.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "reject",
      entity_type: "membership_request",
      entity_id: parsedInput.membershipRequestId,
      metadata: { reason: parsedInput.reason },
    });

    // email de recusa disparado de forma assíncrona via trigger de BD
    // (on update de membership_requests para status='recusado'), não aqui —
    // mantém a action rápida e a entrega do email desacoplada de falhas de rede.

    revalidatePath("/militancia/pedidos");

    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* VER CARTÃO DE CIDADÃO (URL assinada, expira em 1h, fica em auditoria) */
/* ------------------------------------------------------------------ */

const getCitizenCardUrlSchema = z.object({
  membershipRequestId: z.string().uuid(),
});

export const getCitizenCardSignedUrl = roleProtectedActionClient("administrador")
  .schema(getCitizenCardUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertNotRateLimited(ctx.profile.id);

    const { data: request, error } = await ctx.supabase
      .from("membership_requests")
      .select("citizen_card_storage_path")
      .eq("id", parsedInput.membershipRequestId)
      .single();

    if (error || !request?.citizen_card_storage_path) {
      throw new ActionError("Documento não encontrado para este pedido.");
    }

    const admin = createSupabaseAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from("documentos-identificacao")
      .createSignedUrl(request.citizen_card_storage_path, 3600);

    if (signError || !signed) {
      throw new ActionError("Não foi possível gerar o acesso ao documento.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "view_citizen_card",
      entity_type: "membership_request",
      entity_id: parsedInput.membershipRequestId,
    });

    const extensao = request.citizen_card_storage_path.split(".").pop()?.toLowerCase() ?? "";

    return { url: signed.signedUrl, isPdf: extensao === "pdf" };
  });

/* ------------------------------------------------------------------ */
/* REVOGAR FILIAÇÃO                                                   */
/* ------------------------------------------------------------------ */

const revokeMembershipSchema = z.object({
  memberId: z.string().uuid(),
  reason: z.string().min(10, "Indica o motivo da revogação.").max(500),
});

export const revokeMembership = roleProtectedActionClient("cpn")
  .schema(revokeMembershipSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertNotRateLimited(ctx.profile.id);

    const { data: member, error: fetchError } = await ctx.supabase
      .from("members")
      .select("id, status")
      .eq("id", parsedInput.memberId)
      .single();

    if (fetchError || !member) {
      throw new ActionError("Militante não encontrado.");
    }

    if (member.status === "revogado") {
      throw new ActionError("A filiação deste militante já está revogada.");
    }

    const { error: updateError } = await ctx.supabase
      .from("members")
      .update({
        status: "revogado",
        revoked_at: new Date().toISOString(),
        revoked_reason: parsedInput.reason,
      })
      .eq("id", parsedInput.memberId);

    if (updateError) {
      throw new ActionError("Não foi possível revogar a filiação.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "revoke",
      entity_type: "member",
      entity_id: parsedInput.memberId,
      metadata: { reason: parsedInput.reason },
    });

    // o trigger trg_enqueue_member_status_change trata da propagação
    // ao Portal (downgrade automático a Simpatizante) via outbox.

    revalidatePath("/militancia/lista");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* EDITAR DADOS DE UM MILITANTE                                       */
/* Em falta até agora — a CPN não tinha nenhuma forma de corrigir o
 * nome, email ou concelhia de um militante já aprovado (só existia
 * revogar). Cobre os campos de identidade + concelhia; mudar a
 * concelhia aqui dispara automaticamente trg_enqueue_member_transferred
 * (ver migration 0025), que avisa o Portal. Não inclui a role — isso já
 * tem o seu próprio fluxo em actions/admins.ts, mantém-se separado de
 * propósito. */
/* ------------------------------------------------------------------ */
const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  fullName: z.string().min(3).max(150),
  email: z.string().email(),
  concelhiaId: z.string().uuid(),
});

export const updateMember = roleProtectedActionClient("cpn")
  .schema(updateMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: member, error: fetchError } = await ctx.supabase
      .from("members")
      .select("id, profile_id")
      .eq("id", parsedInput.memberId)
      .single();

    if (fetchError || !member) {
      throw new ActionError("Militante não encontrado.");
    }

    const { error: profileError } = await ctx.supabase
      .from("profiles")
      .update({ full_name: parsedInput.fullName, email: parsedInput.email })
      .eq("id", member.profile_id);

    if (profileError) {
      if (profileError.message?.toLowerCase().includes("duplicate")) {
        throw new ActionError("Já existe outro perfil com este email.");
      }
      throw new ActionError("Não foi possível atualizar os dados pessoais.");
    }

    const { error: memberError } = await ctx.supabase
      .from("members")
      .update({ concelhia_id: parsedInput.concelhiaId })
      .eq("id", parsedInput.memberId);

    if (memberError) {
      throw new ActionError("Não foi possível atualizar a concelhia.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "member",
      entity_id: parsedInput.memberId,
      metadata: { fullName: parsedInput.fullName, email: parsedInput.email, concelhiaId: parsedInput.concelhiaId },
    });

    revalidatePath("/militancia/membros");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });
