"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { flushSyncOutboxAfterResponse } from "@/lib/sync-outbox";

/* Moderador distrital = profiles.role 'moderador_distrital' + profiles.district_id
 * (é o que as políticas RLS usam em auth_district_id()). A alteração do role dispara
 * o trigger de sync e o Portal passa a reconhecê-lo. O Portal deduz o distrito pela
 * concelhia do militante, por isso só se aceita quem pertence a este distrito. */

const assignSchema = z.object({
  districtId: z.string().uuid(),
  moderatorProfileId: z.string().uuid().nullable(),
});

const ASSIGNABLE_ROLES = ["militante", "moderador_concelhio", "moderador_distrital"];

export const assignDistrictModerator = roleProtectedActionClient("administrador")
  .schema(assignSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { districtId, moderatorProfileId } = parsedInput;

    const { data: district } = await ctx.supabase.from("districts").select("id, name").eq("id", districtId).single();
    if (!district) throw new ActionError("Distrito não encontrado.");

    // 1) valida o novo moderador antes de mexer em quem já está
    if (moderatorProfileId) {
      const { data: candidate } = await ctx.supabase
        .from("profiles")
        .select("id, role, member:members(concelhia:concelhias(district_id))")
        .eq("id", moderatorProfileId)
        .single();

      if (!candidate) throw new ActionError("Perfil não encontrado.");
      if (!ASSIGNABLE_ROLES.includes(candidate.role)) {
        throw new ActionError("Esta pessoa já tem um papel superior; não é necessário atribuir moderação distrital.");
      }

      const member: any = Array.isArray(candidate.member) ? candidate.member[0] : candidate.member;
      const concelhia: any = Array.isArray(member?.concelhia) ? member.concelhia[0] : member?.concelhia;
      if (!concelhia || concelhia.district_id !== districtId) {
        throw new ActionError(`Só pode ser moderador do distrito de ${district.name} um militante de uma concelhia desse distrito.`);
      }
    }

    // 2) retira o papel a quem era moderador deste distrito (exceto o novo)
    const { data: current } = await ctx.supabase
      .from("profiles")
      .select("id")
      .eq("role", "moderador_distrital")
      .eq("district_id", districtId);

    for (const holder of current ?? []) {
      if (holder.id === moderatorProfileId) continue;

      const { count } = await ctx.supabase
        .from("concelhias")
        .select("id", { count: "exact", head: true })
        .eq("moderator_profile_id", holder.id);

      const { error } = await ctx.supabase
        .from("profiles")
        .update({ role: (count ?? 0) > 0 ? "moderador_concelhio" : "militante", district_id: null })
        .eq("id", holder.id);
      if (error) throw new ActionError("Não foi possível retirar o moderador anterior.");
    }

    // 3) atribui o novo
    if (moderatorProfileId) {
      const { error } = await ctx.supabase
        .from("profiles")
        .update({ role: "moderador_distrital", district_id: districtId })
        .eq("id", moderatorProfileId);
      if (error) throw new ActionError("Não foi possível atribuir o moderador distrital.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "district",
      entity_id: districtId,
      metadata: { moderator_profile_id: moderatorProfileId },
    });

    revalidatePath("/estrutura/distritais");
    flushSyncOutboxAfterResponse();
    return { success: true as const };
  });
