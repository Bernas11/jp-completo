"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { contentActionClient, moderatorActionClient, scopedPublisherActionClient, assertCanPublishScope, ActionError } from "@/lib/safe-action";

/* ------------------------------------------------------------------ */
/* CRIAR TÓPICO                                                       */
/* ------------------------------------------------------------------ */

const createTopicSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(5, "Título demasiado curto").max(200),
  body: z.string().min(10, "Escreve um pouco mais no primeiro post").max(10000),
});

export const createTopic = contentActionClient
  .schema(createTopicSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: topic, error: topicError } = await ctx.supabase
      .from("forum_topics")
      .insert({ category_id: parsedInput.categoryId, author_profile_id: ctx.profile.id, title: parsedInput.title })
      .select("id")
      .single();

    if (topicError || !topic) {
      throw new ActionError("Não foi possível criar o tópico.");
    }

    const { error: replyError } = await ctx.supabase.from("forum_replies").insert({
      topic_id: topic.id,
      author_profile_id: ctx.profile.id,
      body: parsedInput.body,
    });

    if (replyError) {
      // tópico ficaria sem primeiro post — reverte para não deixar dados órfãos
      await ctx.supabase.from("forum_topics").delete().eq("id", topic.id);
      throw new ActionError("Não foi possível publicar o tópico.");
    }

    revalidatePath("/comunidade/forum");

    return { topicId: topic.id };
  });

/* ------------------------------------------------------------------ */
/* RESPONDER                                                          */
/* ------------------------------------------------------------------ */

const createReplySchema = z.object({
  topicId: z.string().uuid(),
  body: z.string().min(2, "Resposta demasiado curta").max(10000),
  mentionedProfileIds: z.array(z.string().uuid()).max(20).default([]),
});

export const createReply = contentActionClient
  .schema(createReplySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: reply, error } = await ctx.supabase
      .from("forum_replies")
      .insert({ topic_id: parsedInput.topicId, author_profile_id: ctx.profile.id, body: parsedInput.body })
      .select("id")
      .single();

    if (error || !reply) {
      throw new ActionError(
        error?.message.includes("row-level security")
          ? "Este tópico está fechado e já não aceita respostas."
          : "Não foi possível publicar a resposta.",
      );
    }

    await ctx.supabase
      .from("forum_topics")
      .update({ last_reply_at: new Date().toISOString() })
      .eq("id", parsedInput.topicId);

    if (parsedInput.mentionedProfileIds.length > 0) {
      await ctx.supabase.from("mentions").insert(
        parsedInput.mentionedProfileIds.map((profileId) => ({
          reply_id: reply.id,
          mentioned_profile_id: profileId,
        })),
      );

      await createSupabaseAdminClient().from("notifications").insert(
        parsedInput.mentionedProfileIds.map((profileId) => ({
          profile_id: profileId,
          type: "mencao" as const,
          payload: { topicId: parsedInput.topicId, replyId: reply.id },
        })),
      );
    }

    // notifica o autor do tópico (se não for quem está a responder)
    const { data: topic } = await ctx.supabase
      .from("forum_topics")
      .select("author_profile_id")
      .eq("id", parsedInput.topicId)
      .single();

    if (topic && topic.author_profile_id !== ctx.profile.id) {
      await createSupabaseAdminClient().from("notifications").insert({
        profile_id: topic.author_profile_id,
        type: "resposta_topico",
        payload: { topicId: parsedInput.topicId, replyId: reply.id },
      });
    }

    revalidatePath(`/comunidade/forum/topico/${parsedInput.topicId}`);

    return { replyId: reply.id };
  });

/* ------------------------------------------------------------------ */
/* FIXAR / FECHAR (moderação)                                         */
/* ------------------------------------------------------------------ */

const pinTopicSchema = z.object({ topicId: z.string().uuid(), pinned: z.boolean() });

export const pinTopic = moderatorActionClient()
  .schema(pinTopicSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("forum_topics")
      .update({ pinned: parsedInput.pinned })
      .eq("id", parsedInput.topicId);

    if (error) {
      throw new ActionError("Não foi possível fixar o tópico (verifica se moderas este âmbito).");
    }

    revalidatePath("/comunidade/forum");
    return { success: true as const };
  });

const closeTopicSchema = z.object({ topicId: z.string().uuid(), status: z.enum(["aberto", "fechado"]) });

export const setTopicStatus = moderatorActionClient()
  .schema(closeTopicSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("forum_topics")
      .update({ status: parsedInput.status })
      .eq("id", parsedInput.topicId);

    if (error) {
      throw new ActionError("Não foi possível alterar o estado do tópico.");
    }

    revalidatePath(`/comunidade/forum/topico/${parsedInput.topicId}`);
    return { success: true as const };
  });


/* ------------------------------------------------------------------ */
/* CATEGORIAS (só CPN)                                                */
/* ------------------------------------------------------------------ */

const createCategorySchema = z.object({
  name: z.string().min(3, "Nome demasiado curto").max(120),
  scope: z.enum(["nacional", "distrital", "concelhia"]),
  scopeDistrictId: z.string().uuid().nullable().optional(),
  scopeConcelhiaId: z.string().uuid().nullable().optional(),
});

export const createForumCategory = scopedPublisherActionClient()
  .schema(createCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    assertCanPublishScope(ctx.publisher, parsedInput);

    if (parsedInput.scope === "distrital" && !parsedInput.scopeDistrictId) {
      throw new ActionError("Escolhe o distrito desta categoria.");
    }
    if (parsedInput.scope === "concelhia" && !parsedInput.scopeConcelhiaId) {
      throw new ActionError("Escolhe a concelhia desta categoria.");
    }

    const { data: last } = await ctx.supabase
      .from("forum_categories")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await ctx.supabase.from("forum_categories").insert({
      name: parsedInput.name,
      scope: parsedInput.scope,
      scope_district_id: parsedInput.scope === "distrital" ? parsedInput.scopeDistrictId : null,
      scope_concelhia_id: parsedInput.scope === "concelhia" ? parsedInput.scopeConcelhiaId : null,
      display_order: (last?.display_order ?? 0) + 1,
    });

    if (error) throw new ActionError("Não foi possível criar a categoria.");

    revalidatePath("/comunidade/forum");
    return { success: true as const };
  });

const deleteCategorySchema = z.object({ categoryId: z.string().uuid() });

export const deleteForumCategory = scopedPublisherActionClient()
  .schema(deleteCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("forum_categories").delete().eq("id", parsedInput.categoryId);
    if (error) throw new ActionError("Não foi possível apagar a categoria.");
    revalidatePath("/comunidade/forum");
    return { success: true as const };
  });
