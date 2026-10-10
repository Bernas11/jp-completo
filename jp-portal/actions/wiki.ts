"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { moderatorActionClient, publisherActionClient, ActionError } from "@/lib/safe-action";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const createPageSchema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(10).max(50000),
  category: z.enum(["estatutos", "guias", "glossario"]),
});

export const createWikiPage = publisherActionClient()
  .schema(createPageSchema)
  .action(async ({ parsedInput, ctx }) => {
    const slug = slugify(parsedInput.title);

    const { data: existing } = await ctx.supabase
      .from("wiki_pages")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      throw new ActionError("Já existe uma página com um título muito semelhante.");
    }

    const { data: page, error } = await ctx.supabase
      .from("wiki_pages")
      .insert({
        slug,
        title: parsedInput.title,
        body: parsedInput.body,
        category: parsedInput.category,
        last_edited_by_profile_id: ctx.profile.id,
      })
      .select("id, slug")
      .single();

    if (error || !page) {
      throw new ActionError("Não foi possível criar a página.");
    }

    revalidatePath("/wiki");
    return { slug: page.slug };
  });

const updatePageSchema = z.object({
  pageId: z.string().uuid(),
  body: z.string().min(10).max(50000),
});

export const updateWikiPage = moderatorActionClient()
  .schema(updatePageSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: current, error: fetchError } = await ctx.supabase
      .from("wiki_pages")
      .select("id, slug, body")
      .eq("id", parsedInput.pageId)
      .single();

    if (fetchError || !current) {
      throw new ActionError("Página não encontrada.");
    }

    // guarda a versão ANTERIOR como revisão antes de sobrescrever — o
    // histórico fica sempre um passo atrás da versão atual, não duplicado
    await ctx.supabase.from("wiki_revisions").insert({
      page_id: current.id,
      body: current.body,
      edited_by_profile_id: ctx.profile.id,
    });

    const { error: updateError } = await ctx.supabase
      .from("wiki_pages")
      .update({
        body: parsedInput.body,
        last_edited_by_profile_id: ctx.profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsedInput.pageId);

    if (updateError) {
      throw new ActionError("Não foi possível guardar as alterações.");
    }

    revalidatePath(`/wiki/${current.slug}`);
    return { success: true as const };
  });
