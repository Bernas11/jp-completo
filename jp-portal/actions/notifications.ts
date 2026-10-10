"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { authenticatedActionClient, ActionError } from "@/lib/safe-action";

export const markNotificationRead = authenticatedActionClient
  .schema(z.object({ notificationId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", parsedInput.notificationId)
      .eq("profile_id", ctx.profile.id);

    if (error) throw new ActionError("Não foi possível marcar como lida.");

    revalidatePath("/notificacoes");
    return { success: true as const };
  });

export const markAllNotificationsRead = authenticatedActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("profile_id", ctx.profile.id)
      .is("read_at", null);

    if (error) throw new ActionError("Não foi possível marcar as notificações como lidas.");

    revalidatePath("/notificacoes");
    return { success: true as const };
  });

export const updateWeeklyDigestPreference = authenticatedActionClient
  .schema(z.object({ optIn: z.boolean() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("portal_profiles")
      .update({ weekly_digest_opt_in: parsedInput.optIn })
      .eq("id", ctx.profile.id);

    if (error) throw new ActionError("Não foi possível atualizar a preferência.");

    return { success: true as const };
  });
