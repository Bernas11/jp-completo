"use server";

import { z } from "zod";
import { authenticatedActionClient, ActionError } from "@/lib/safe-action";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export const savePushSubscription = authenticatedActionClient
  .schema(subscribeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("push_subscriptions").upsert(
      {
        profile_id: ctx.profile.id,
        endpoint: parsedInput.endpoint,
        keys: parsedInput.keys,
      },
      { onConflict: "endpoint" },
    );

    if (error) throw new ActionError("Não foi possível ativar as notificações push.");

    return { success: true as const };
  });

export const removePushSubscription = authenticatedActionClient
  .schema(z.object({ endpoint: z.string().url() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("push_subscriptions")
      .delete()
      .eq("profile_id", ctx.profile.id)
      .eq("endpoint", parsedInput.endpoint);

    if (error) throw new ActionError("Não foi possível desativar as notificações push.");

    return { success: true as const };
  });
