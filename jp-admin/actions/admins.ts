"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { flushSyncOutboxAfterResponse } from "@/lib/sync-outbox";

const adminRoleValues = ["cpn", "administrador", "moderador_nacional"] as const;

/* ------------------------------------------------------------------ */
/* CONVIDAR NOVO ADMINISTRADOR                                        */
/* ------------------------------------------------------------------ */

const inviteAdminSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(150),
  role: z.enum(adminRoleValues),
});

// só CPN pode criar novos administradores — é a ação mais sensível do
// sistema (concede acesso a dados de CC e capacidade de aprovar filiações)
export const inviteAdmin = roleProtectedActionClient("cpn")
  .schema(inviteAdminSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: existingProfile } = await ctx.supabase
      .from("profiles")
      .select("id")
      .eq("email", parsedInput.email)
      .maybeSingle();

    if (existingProfile) {
      throw new ActionError("Já existe uma conta com este email.");
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      parsedInput.email,
      { data: { full_name: parsedInput.fullName } },
    );

    if (inviteError || !invited.user) {
      throw new ActionError(`Não foi possível convidar o utilizador: ${inviteError?.message}`);
    }

    // O trigger `on_auth_user_created` (handle_new_admin_user) já criou o perfil ao
    // convidar o utilizador (como "simpatizante"); um INSERT aqui falhava sempre com
    // chave duplicada e o convite era revertido. Por isso atualiza-se o perfil.
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: invited.user.id,
        email: parsedInput.email,
        full_name: parsedInput.fullName,
        role: parsedInput.role,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      // reverte o convite para não deixar um utilizador Auth órfão sem perfil
      console.error("[admins] falha ao criar/atualizar perfil do convidado:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      throw new ActionError(`Não foi possível criar o perfil de administrador: ${profileError.message}`);
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "create",
      entity_type: "admin_profile",
      entity_id: invited.user.id,
      metadata: { email: parsedInput.email, role: parsedInput.role },
    });

    revalidatePath("/administradores");

    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* ALTERAR ROLE                                                       */
/* ------------------------------------------------------------------ */

const updateAdminRoleSchema = z.object({
  targetProfileId: z.string().uuid(),
  role: z.enum(adminRoleValues),
});

export const updateAdminRole = roleProtectedActionClient("cpn")
  .schema(updateAdminRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.targetProfileId === ctx.profile.id) {
      throw new ActionError("Não podes alterar o teu próprio nível de acesso.");
    }

    if (parsedInput.role !== "cpn") {
      const remainingCpnCount = await countOtherCpn(ctx.supabase, parsedInput.targetProfileId);
      if (remainingCpnCount === 0) {
        throw new ActionError(
          "Não é possível remover o último membro da CPN. Promove outro perfil primeiro.",
        );
      }
    }

    const { error } = await ctx.supabase
      .from("profiles")
      .update({ role: parsedInput.role })
      .eq("id", parsedInput.targetProfileId);

    if (error) {
      throw new ActionError("Não foi possível alterar o nível de acesso.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "admin_profile",
      entity_id: parsedInput.targetProfileId,
      metadata: { newRole: parsedInput.role },
    });

    revalidatePath("/administradores");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* REVOGAR ACESSO DE ADMINISTRADOR                                    */
/* ------------------------------------------------------------------ */

const revokeAdminAccessSchema = z.object({ targetProfileId: z.string().uuid() });

export const revokeAdminAccess = roleProtectedActionClient("cpn")
  .schema(revokeAdminAccessSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.targetProfileId === ctx.profile.id) {
      throw new ActionError("Não podes revogar o teu próprio acesso.");
    }

    const remainingCpnCount = await countOtherCpn(ctx.supabase, parsedInput.targetProfileId);
    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", parsedInput.targetProfileId)
      .single();

    if (target?.role === "cpn" && remainingCpnCount === 0) {
      throw new ActionError("Não é possível revogar o último membro da CPN.");
    }

    // despromove a militante em vez de eliminar o perfil, preservando o
    // histórico de auditoria e a filiação (se aplicável)
    const { error } = await ctx.supabase
      .from("profiles")
      .update({ role: "militante" })
      .eq("id", parsedInput.targetProfileId);

    if (error) {
      throw new ActionError("Não foi possível revogar o acesso.");
    }

    const supabaseAdmin = createSupabaseAdminClient();
    await supabaseAdmin.auth.admin.signOut(parsedInput.targetProfileId, "global");

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "revoke",
      entity_type: "admin_profile",
      entity_id: parsedInput.targetProfileId,
    });

    revalidatePath("/administradores");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* HELPER                                                              */
/* ------------------------------------------------------------------ */

async function countOtherCpn(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>,
  excludingProfileId: string,
): Promise<number> {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "cpn")
    .neq("id", excludingProfileId);

  return count ?? 0;
}
