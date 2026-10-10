"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { authenticatedActionClient, ActionError } from "@/lib/safe-action";

export const sendDirectMessage = authenticatedActionClient
  .schema(
    z.object({
      recipientId: z.string().uuid(),
      body: z.string().trim().min(1, "Escreve uma mensagem.").max(4000),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.recipientId === ctx.profile.id) {
      throw new ActionError("Não podes enviar uma mensagem a ti próprio.");
    }

    const { error } = await ctx.supabase.from("direct_messages").insert({
      sender_profile_id: ctx.profile.id,
      recipient_profile_id: parsedInput.recipientId,
      body: parsedInput.body,
    });

    if (error) throw new ActionError("Não foi possível enviar a mensagem.");

    revalidatePath("/mensagens");
    revalidatePath(`/mensagens/${parsedInput.recipientId}`);
    return { success: true as const };
  });

export const markConversationRead = authenticatedActionClient
  .schema(z.object({ otherProfileId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_profile_id", ctx.profile.id)
      .eq("sender_profile_id", parsedInput.otherProfileId)
      .is("read_at", null);

    if (error) throw new ActionError("Não foi possível marcar como lidas.");

    revalidatePath("/mensagens");
    return { success: true as const };
  });

export const searchProfilesToMessage = authenticatedActionClient
  .schema(z.object({ query: z.string().trim().min(2).max(80) }))
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("portal_profiles")
      .select("id, display_name, role")
      .ilike("display_name", `%${parsedInput.query}%`)
      .neq("id", ctx.profile.id)
      .limit(10);

    if (error) throw new ActionError("Não foi possível pesquisar.");

    return { results: data ?? [] };
  });
