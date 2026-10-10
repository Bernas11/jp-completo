"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { publisherActionClient, ActionError } from "@/lib/safe-action";

const createCongressSchema = z.object({
  title: z.string().min(3).max(200),
  year: z.number().int().min(1974).max(new Date().getFullYear() + 1),
  description: z.string().max(2000).optional(),
});

export const createCongress = publisherActionClient()
  .schema(createCongressSchema)
  .action(async ({ parsedInput, ctx }) => {

    const { data: congress, error } = await ctx.supabase
      .from("archive_congresses")
      .insert({
        title: parsedInput.title,
        year: parsedInput.year,
        description: parsedInput.description ?? null,
      })
      .select("id")
      .single();

    if (error || !congress) {
      throw new ActionError("Não foi possível criar o congresso.");
    }

    revalidatePath("/arquivo");
    return { congressId: congress.id };
  });

const addItemSchema = z.object({
  congressId: z.string().uuid(),
  kind: z.enum(["documento", "foto", "resolucao"]),
  title: z.string().min(2).max(200),
  storagePath: z.string().min(1),
});

export const addArchiveItem = publisherActionClient()
  .schema(addItemSchema)
  .action(async ({ parsedInput, ctx }) => {

    const { error } = await ctx.supabase.from("archive_congress_items").insert({
      congress_id: parsedInput.congressId,
      kind: parsedInput.kind,
      title: parsedInput.title,
      storage_path: parsedInput.storagePath,
    });

    if (error) {
      throw new ActionError("Não foi possível adicionar o item ao arquivo.");
    }

    revalidatePath(`/arquivo/${parsedInput.congressId}`);
    return { success: true as const };
  });

const deleteItemSchema = z.object({ itemId: z.string().uuid(), congressId: z.string().uuid() });

export const deleteArchiveItem = publisherActionClient()
  .schema(deleteItemSchema)
  .action(async ({ parsedInput, ctx }) => {

    const { error } = await ctx.supabase
      .from("archive_congress_items")
      .delete()
      .eq("id", parsedInput.itemId);

    if (error) {
      throw new ActionError("Não foi possível remover o item.");
    }

    revalidatePath(`/arquivo/${parsedInput.congressId}`);
    return { success: true as const };
  });
