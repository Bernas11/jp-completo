"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { contentActionClient, scopedPublisherActionClient, assertCanPublishScope, ActionError } from "@/lib/safe-action";

const scopeSchema = z
  .object({
    scope: z.enum(["nacional", "distrital", "concelhia"]),
    scopeDistrictId: z.string().uuid().optional(),
    scopeConcelhiaId: z.string().uuid().optional(),
  })
  .refine((s) => s.scope !== "distrital" || !!s.scopeDistrictId, { message: "Indica o distrito." })
  .refine((s) => s.scope !== "concelhia" || !!s.scopeConcelhiaId, { message: "Indica a concelhia." });

const createPollSchema = z.object({
  question: z.string().min(5).max(300),
  options: z.array(z.string().min(1).max(150)).min(2).max(10),
  multipleChoice: z.boolean().default(false),
  segment: scopeSchema,
  closesAt: z.string().datetime().optional(),
});

export const createPoll = scopedPublisherActionClient()
  .schema(createPollSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertCanPublishScope(ctx.publisher, parsedInput.segment);

    const { data: poll, error: pollError } = await ctx.supabase
      .from("polls")
      .insert({
        question: parsedInput.question,
        scope: parsedInput.segment.scope,
        scope_district_id: parsedInput.segment.scopeDistrictId ?? null,
        scope_concelhia_id: parsedInput.segment.scopeConcelhiaId ?? null,
        multiple_choice: parsedInput.multipleChoice,
        created_by_profile_id: ctx.profile.id,
        closes_at: parsedInput.closesAt ?? null,
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      throw new ActionError("Não foi possível criar a sondagem.");
    }

    const { error: optionsError } = await ctx.supabase.from("poll_options").insert(
      parsedInput.options.map((label, i) => ({ poll_id: poll.id, label, display_order: i })),
    );

    if (optionsError) {
      await ctx.supabase.from("polls").delete().eq("id", poll.id);
      throw new ActionError("Não foi possível criar as opções da sondagem.");
    }

    revalidatePath("/sondagens");
    return { pollId: poll.id };
  });

const voteSchema = z.object({ pollId: z.string().uuid(), optionIds: z.array(z.string().uuid()).min(1) });

export const voteOnPoll = contentActionClient
  .schema(voteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: poll, error: pollError } = await ctx.supabase
      .from("polls")
      .select("id, multiple_choice, closes_at")
      .eq("id", parsedInput.pollId)
      .single();

    if (pollError || !poll) {
      throw new ActionError("Sondagem não encontrada.");
    }

    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      throw new ActionError("Esta sondagem já está encerrada.");
    }

    if (!poll.multiple_choice && parsedInput.optionIds.length > 1) {
      throw new ActionError("Esta sondagem só permite uma escolha.");
    }

    // limpa votos anteriores deste utilizador nesta sondagem antes de
    // inserir os novos — permite mudar de voto sem violar a chave única
    await ctx.supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", parsedInput.pollId)
      .eq("profile_id", ctx.profile.id);

    const { error: voteError } = await ctx.supabase.from("poll_votes").insert(
      parsedInput.optionIds.map((optionId) => ({
        poll_id: parsedInput.pollId,
        option_id: optionId,
        profile_id: ctx.profile.id,
      })),
    );

    if (voteError) {
      throw new ActionError("Não foi possível registar o voto.");
    }

    revalidatePath("/sondagens");
    return { success: true as const };
  });
