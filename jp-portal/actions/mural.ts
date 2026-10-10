"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { moderatorActionClient, scopedPublisherActionClient, assertCanPublishScope, ActionError } from "@/lib/safe-action";

const scopeSchema = z
  .object({
    scope: z.enum(["nacional", "distrital", "concelhia"]),
    scopeDistrictId: z.string().uuid().optional(),
    scopeConcelhiaId: z.string().uuid().optional(),
  })
  .refine((s) => s.scope !== "distrital" || !!s.scopeDistrictId, {
    message: "Indica o distrito.",
  })
  .refine((s) => s.scope !== "concelhia" || !!s.scopeConcelhiaId, {
    message: "Indica a concelhia.",
  });

const createMuralPostSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(5).max(5000),
  segment: scopeSchema,
});

export const createMuralPost = scopedPublisherActionClient()
  .schema(createMuralPostSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertCanPublishScope(ctx.publisher, parsedInput.segment);

    const { error } = await ctx.supabase.from("mural_posts").insert({
      author_profile_id: ctx.profile.id,
      title: parsedInput.title,
      body: parsedInput.body,
      scope: parsedInput.segment.scope,
      scope_district_id: parsedInput.segment.scopeDistrictId ?? null,
      scope_concelhia_id: parsedInput.segment.scopeConcelhiaId ?? null,
    });

    if (error) {
      throw new ActionError(
        "Não foi possível publicar o aviso.",
      );
    }

    // notificação in-app "novo_aviso" para todos no âmbito é disparada por
    // um trigger de BD (ver notify-mural-post.sql), não aqui — evita ter de
    // paginar milhares de perfis dentro da própria server action

    revalidatePath("/mural");
    return { success: true as const };
  });

const deleteMuralPostSchema = z.object({ postId: z.string().uuid() });

export const deleteMuralPost = moderatorActionClient()
  .schema(deleteMuralPostSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("mural_posts").delete().eq("id", parsedInput.postId);

    if (error) {
      throw new ActionError("Não foi possível remover o aviso.");
    }

    revalidatePath("/mural");
    return { success: true as const };
  });
