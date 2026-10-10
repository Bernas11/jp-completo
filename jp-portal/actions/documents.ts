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
  .refine((s) => s.scope !== "distrital" || !!s.scopeDistrictId, { message: "Indica o distrito." })
  .refine((s) => s.scope !== "concelhia" || !!s.scopeConcelhiaId, { message: "Indica a concelhia." });

const uploadDocumentSchema = z.object({
  title: z.string().min(3).max(200),
  storagePath: z.string().min(1),
  segment: scopeSchema,
});

export const uploadPortalDocument = scopedPublisherActionClient()
  .schema(uploadDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    assertCanPublishScope(ctx.publisher, parsedInput.segment);

    const { error } = await ctx.supabase.from("portal_documents").insert({
      title: parsedInput.title,
      storage_path: parsedInput.storagePath,
      scope: parsedInput.segment.scope,
      scope_district_id: parsedInput.segment.scopeDistrictId ?? null,
      scope_concelhia_id: parsedInput.segment.scopeConcelhiaId ?? null,
      uploaded_by_profile_id: ctx.profile.id,
    });

    if (error) {
      throw new ActionError("Não foi possível publicar o documento.");
    }

    revalidatePath("/documentos");
    return { success: true as const };
  });

const deleteDocumentSchema = z.object({ documentId: z.string().uuid() });

export const deletePortalDocument = moderatorActionClient()
  .schema(deleteDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("portal_documents")
      .delete()
      .eq("id", parsedInput.documentId);

    if (error) {
      throw new ActionError("Não foi possível remover o documento.");
    }

    revalidatePath("/documentos");
    return { success: true as const };
  });
