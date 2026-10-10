"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { authenticatedActionClient, ActionError } from "@/lib/safe-action";

const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(2, "Escreve pelo menos 2 caracteres.").max(80),
});

export const updateDisplayName = authenticatedActionClient
  .schema(updateDisplayNameSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("portal_profiles")
      .update({ display_name: parsedInput.displayName })
      .eq("id", ctx.profile.id);

    if (error) {
      throw new ActionError("Não foi possível atualizar o nome. Tenta novamente.");
    }

    revalidatePath("/perfil");
    revalidatePath("/");
    return { success: true as const };
  });

const updateDarkModeSchema = z.object({ darkMode: z.boolean() });

export const updateDarkMode = authenticatedActionClient
  .schema(updateDarkModeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("portal_profiles")
      .update({ dark_mode: parsedInput.darkMode })
      .eq("id", ctx.profile.id);

    if (error) {
      throw new ActionError("Não foi possível atualizar a aparência. Tenta novamente.");
    }

    revalidatePath("/", "layout");
    return { success: true as const };
  });
