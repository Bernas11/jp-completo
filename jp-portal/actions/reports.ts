"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticatedActionClient, moderatorActionClient, ActionError } from "@/lib/safe-action";

const createReportSchema = z.object({
  entityType: z.enum(["forum_reply", "forum_topic", "mural_post"]),
  entityId: z.string().uuid(),
  reason: z.string().min(10, "Explica em poucas palavras o motivo da denúncia").max(1000),
});

export const createReport = authenticatedActionClient
  .schema(createReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("reports").insert({
      reporter_profile_id: ctx.profile.id,
      entity_type: parsedInput.entityType,
      entity_id: parsedInput.entityId,
      reason: parsedInput.reason,
    });

    if (error) {
      throw new ActionError("Não foi possível submeter a denúncia.");
    }

    // Avisa os moderadores que podem tratar esta denúncia (falhar aqui nunca deve
    // impedir a denúncia de ficar registada).
    try {
      await notifyModeratorsOfReport(parsedInput.entityType, parsedInput.entityId, ctx.profile.id);
    } catch (err) {
      console.error("[reports] falha ao notificar moderadores:", err);
    }

    revalidatePath("/moderacao");
    return { success: true as const };
  });

async function notifyModeratorsOfReport(entityType: string, entityId: string, reporterId: string) {
  const admin = createSupabaseAdminClient();

  // âmbito do conteúdo denunciado (mesma regra de portal_can_moderate_report)
  let categoryId: string | null = null;
  let scope: string = "nacional";
  let districtId: string | null = null;
  let concelhiaId: string | null = null;

  if (entityType === "mural_post") {
    const { data } = await admin
      .from("mural_posts")
      .select("scope, scope_district_id, scope_concelhia_id")
      .eq("id", entityId)
      .maybeSingle();
    if (!data) return;
    ({ scope, scope_district_id: districtId, scope_concelhia_id: concelhiaId } = data as any);
  } else {
    let topicId = entityId;
    if (entityType === "forum_reply") {
      const { data: reply } = await admin.from("forum_replies").select("topic_id").eq("id", entityId).maybeSingle();
      if (!reply) return;
      topicId = reply.topic_id;
    }
    const { data: topic } = await admin.from("forum_topics").select("category_id").eq("id", topicId).maybeSingle();
    categoryId = topic?.category_id ?? null;
    if (!categoryId) return;
    const { data: cat } = await admin
      .from("forum_categories")
      .select("scope, scope_district_id, scope_concelhia_id")
      .eq("id", categoryId)
      .maybeSingle();
    if (!cat) return;
    scope = cat.scope;
    districtId = cat.scope_district_id;
    concelhiaId = cat.scope_concelhia_id;
  }

  const filters = ["role.eq.cpn"];
  if (scope === "nacional") filters.push("role.eq.moderador_nacional");
  if (scope === "distrital" && districtId) filters.push(`and(role.eq.moderador_distrital,district_id.eq.${districtId})`);
  if (scope === "concelhia" && concelhiaId) filters.push(`and(role.eq.moderador_concelhio,concelhia_id.eq.${concelhiaId})`);

  const { data: moderators } = await admin.from("portal_profiles").select("id").or(filters.join(","));
  const rows = (moderators ?? [])
    .filter((m) => m.id !== reporterId)
    .map((m) => ({ profile_id: m.id, type: "nova_denuncia" as const, payload: { entityType, entityId } }));

  if (rows.length > 0) await admin.from("notifications").insert(rows);
}

/* ------------------------------------------------------------------ */
/* RESOLVER — silenciar/suspender aplicam-se de imediato; um pedido de */
/* ban fica pendente em moderation_actions até a CPN aprovar           */
/* ------------------------------------------------------------------ */

const resolveReportSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["nenhuma", "silenciar", "suspender", "pedido_ban_cpn"]),
  targetProfileId: z.string().uuid(),
  reason: z.string().min(5).max(500),
  suspensionDays: z.number().int().min(1).max(90).optional(),
});

export const resolveReport = moderatorActionClient()
  .schema(resolveReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error: reportError } = await ctx.supabase
      .from("reports")
      .update({
        status: "resolvido",
        action: parsedInput.action,
        resolved_by_profile_id: ctx.profile.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", parsedInput.reportId);

    if (reportError) {
      throw new ActionError("Não foi possível atualizar a denúncia.");
    }

    if (parsedInput.action === "nenhuma") {
      revalidatePath("/moderacao/denuncias");
      return { success: true as const, pending: false };
    }

    const moderationAction =
      parsedInput.action === "silenciar"
        ? ("silenciar" as const)
        : parsedInput.action === "suspender"
          ? ("suspender" as const)
          : ("ban_permanente" as const);

    const expiresAt =
      moderationAction === "suspender" && parsedInput.suspensionDays
        ? new Date(Date.now() + parsedInput.suspensionDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error: actionError } = await ctx.supabase.from("moderation_actions").insert({
      target_profile_id: parsedInput.targetProfileId,
      action: moderationAction,
      reason: parsedInput.reason,
      applied_by_profile_id: ctx.profile.id,
      expires_at: expiresAt,
      // ban_permanente fica sem approved_by_profile_id (pendente); só é
      // efetivo depois de approveBanRequest ser chamado por um perfil CPN
    });

    if (actionError) {
      throw new ActionError("Não foi possível aplicar a ação de moderação.");
    }

    if (moderationAction === "ban_permanente") {
      const { data: cpnProfiles } = await ctx.supabase
        .from("portal_profiles")
        .select("id")
        .eq("role", "cpn");

      if (cpnProfiles && cpnProfiles.length > 0) {
        await createSupabaseAdminClient().from("notifications").insert(
          cpnProfiles.map((p) => ({
            profile_id: p.id,
            type: "denuncia_resolvida" as const,
            payload: {
              pendingBanTargetProfileId: parsedInput.targetProfileId,
              reason: parsedInput.reason,
            },
          })),
        );
      }
    }

    revalidatePath("/moderacao/denuncias");
    return { success: true as const, pending: moderationAction === "ban_permanente" };
  });

/* ------------------------------------------------------------------ */
/* APROVAR / REJEITAR BAN — exclusivo CPN                             */
/* ------------------------------------------------------------------ */

const approveBanSchema = z.object({ moderationActionId: z.string().uuid() });

export const approveBanRequest = moderatorActionClient()
  .schema(approveBanSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.profile.role !== "cpn") {
      throw new ActionError("Só a CPN pode aprovar bans permanentes.");
    }

    const { error } = await ctx.supabase
      .from("moderation_actions")
      .update({ approved_by_profile_id: ctx.profile.id })
      .eq("id", parsedInput.moderationActionId)
      .eq("action", "ban_permanente");

    if (error) {
      throw new ActionError("Não foi possível aprovar o ban.");
    }

    revalidatePath("/moderacao/bans-pendentes");
    return { success: true as const };
  });

const rejectBanSchema = z.object({ moderationActionId: z.string().uuid() });

export const rejectBanRequest = moderatorActionClient()
  .schema(rejectBanSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.profile.role !== "cpn") {
      throw new ActionError("Só a CPN pode rejeitar pedidos de ban.");
    }

    const { error } = await ctx.supabase
      .from("moderation_actions")
      .delete()
      .eq("id", parsedInput.moderationActionId)
      .eq("action", "ban_permanente")
      .is("approved_by_profile_id", null);

    if (error) {
      throw new ActionError("Não foi possível rejeitar o pedido.");
    }

    revalidatePath("/moderacao/bans-pendentes");
    return { success: true as const };
  });
