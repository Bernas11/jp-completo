"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { CATEGORIAS_ATIVIDADE } from "@/lib/activity-categories";

/* "news" cobre notícias, comunicados e outras atividades da JP Nacional
 * que não precisam de inscrição/participação (isso continua a ser o
 * papel de "events"). Ver migration 0022 para o porquê desta escolha
 * de arquitetura em vez de uma tabela "activities" nova. */

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* Uma atividade precisa de UM sítio para onde apontar quando alguém quer
 * "ler mais": ou tem corpo de texto próprio (fica com página de detalhe
 * em /noticias/[slug]) ou aponta para um link externo (ex: Instagram da
 * JP). Pelo menos um dos dois tem de existir — caso contrário o cartão
 * na listagem não teria destino nenhum ao clicar. */
const newsSchema = z
  .object({
    title: z.string().min(3).max(200),
    summary: z.string().max(500).optional(),
    body: z.string().max(20000).optional(),
    imageUrl: z
      .string()
      .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "URL de imagem inválido.")
      .optional(),
    category: z.enum(CATEGORIAS_ATIVIDADE).default("noticia"),
    externalLink: z.string().url().optional().or(z.literal("")),
    status: z.enum(["rascunho", "publicado"]).default("rascunho"),
    publishedAt: z.string(),
  })
  .refine((v) => Boolean(v.body?.trim()) || Boolean(v.externalLink?.trim()), {
    message: "Preenche o corpo da notícia (para ter página própria) ou um link externo (ex: Instagram).",
    path: ["body"],
  });

export const createNews = roleProtectedActionClient("administrador")
  .schema(newsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const baseSlug = slugify(parsedInput.title);

    // evita colidir com o índice único de slugs (news_slug_unique_idx)
    const { data: existing } = await ctx.supabase.from("news").select("slug").like("slug", `${baseSlug}%`);
    const taken = new Set((existing ?? []).map((r) => r.slug));
    let slug = baseSlug;
    let i = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${i}`;
      i += 1;
    }

    const { error } = await ctx.supabase.from("news").insert({
      title: parsedInput.title,
      summary: parsedInput.summary || null,
      body: parsedInput.body || null,
      image_url: parsedInput.imageUrl || null,
      category: parsedInput.category,
      external_link: parsedInput.externalLink || null,
      status: parsedInput.status,
      slug,
      published_at: parsedInput.publishedAt,
      created_by_profile_id: ctx.profile.id,
    });

    if (error) throw new ActionError("Não foi possível criar a atividade.");

    revalidatePath("/noticias");
    revalidatePath("/");
    return { success: true as const, slug };
  });

const updateNewsSchema = newsSchema.and(z.object({ newsId: z.string().uuid() }));

export const updateNews = roleProtectedActionClient("administrador")
  .schema(updateNewsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { newsId, ...rest } = parsedInput;
    const { error } = await ctx.supabase
      .from("news")
      .update({
        title: rest.title,
        summary: rest.summary || null,
        body: rest.body || null,
        image_url: rest.imageUrl || null,
        category: rest.category,
        external_link: rest.externalLink || null,
        status: rest.status,
        published_at: rest.publishedAt,
      })
      .eq("id", newsId);

    if (error) throw new ActionError("Não foi possível atualizar a atividade.");

    revalidatePath("/noticias");
    revalidatePath("/");
    return { success: true as const };
  });

export const deleteNews = roleProtectedActionClient("administrador")
  .schema(z.object({ newsId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("news").delete().eq("id", parsedInput.newsId);

    if (error) throw new ActionError("Não foi possível remover a atividade.");

    revalidatePath("/noticias");
    revalidatePath("/");
    return { success: true as const };
  });

export const toggleEventPublic = roleProtectedActionClient("administrador")
  .schema(z.object({ eventId: z.string().uuid(), isPublic: z.boolean() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("events")
      .update({ is_public: parsedInput.isPublic })
      .eq("id", parsedInput.eventId);

    if (error) throw new ActionError("Não foi possível atualizar a visibilidade do evento.");

    revalidatePath("/eventos");
    revalidatePath("/");
    return { success: true as const };
  });
