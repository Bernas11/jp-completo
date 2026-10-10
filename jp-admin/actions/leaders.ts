"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

/* CAUSA RAIZ do item 6 ("continua sem ser possível guardar alterações à
 * localização das fotografias"): as fotos dos antigos líderes NÃO usam
 * Supabase Storage — são ficheiros estáticos em /public/lideres/ no
 * jp-nacional, e o campo na BD é sempre um caminho relativo, por exemplo
 * "/lideres/ccr.jpg" (confirmado nos 16 registos existentes). Mas o
 * schema aqui exigia `z.string().url()`, que só aceita URLs absolutos
 * com protocolo (https://...) — um caminho relativo nunca passava nesta
 * validação, por isso QUALQUER tentativa de guardar (criar ou editar)
 * falhava sempre, incluindo para os líderes que já tinham photo_url
 * preenchido. Corrigido para aceitar tanto um caminho relativo
 * ("/lideres/nome.jpg") como um URL absoluto, mantendo a validação para
 * não aceitar texto arbitrário sem ser nenhuma das duas formas. */
const photoUrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//.test(value),
    "Usa um caminho relativo (ex: /lideres/nome.jpg) ou um URL completo (https://...).",
  )
  .optional();

const leaderSchema = z.object({
  fullName: z.string().min(2).max(150),
  photoUrl: photoUrlSchema,
  startDate: z.string(),
  endDate: z.string(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createLeader = roleProtectedActionClient("administrador")
  .schema(leaderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.endDate < parsedInput.startDate) {
      throw new ActionError("A data de fim não pode ser anterior à data de início.");
    }

    const { error } = await ctx.supabase.from("previous_leaders").insert({
      full_name: parsedInput.fullName,
      photo_url: parsedInput.photoUrl ?? null,
      start_date: parsedInput.startDate,
      end_date: parsedInput.endDate,
      display_order: parsedInput.displayOrder,
    });

    if (error) throw new ActionError("Não foi possível criar o registo.");

    revalidatePath("/estrutura/lideres");
    revalidatePath("/anteriores-lideres"); // site público
    return { success: true as const };
  });

const updateLeaderSchema = leaderSchema.extend({ leaderId: z.string().uuid() });

export const updateLeader = roleProtectedActionClient("administrador")
  .schema(updateLeaderSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { leaderId, ...rest } = parsedInput;
    if (rest.endDate < rest.startDate) {
      throw new ActionError("A data de fim não pode ser anterior à data de início.");
    }
    const { error } = await ctx.supabase
      .from("previous_leaders")
      .update({
        full_name: rest.fullName,
        photo_url: rest.photoUrl ?? null,
        start_date: rest.startDate,
        end_date: rest.endDate,
        display_order: rest.displayOrder,
      })
      .eq("id", leaderId);

    if (error) throw new ActionError("Não foi possível atualizar o registo.");

    revalidatePath("/estrutura/lideres");
    revalidatePath("/anteriores-lideres");
    return { success: true as const };
  });

export const deleteLeader = roleProtectedActionClient("administrador")
  .schema(z.object({ leaderId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("previous_leaders")
      .delete()
      .eq("id", parsedInput.leaderId);

    if (error) throw new ActionError("Não foi possível eliminar o registo.");

    revalidatePath("/estrutura/lideres");
    revalidatePath("/anteriores-lideres");
    return { success: true as const };
  });
