"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

/* ------------------------------------------------------------------ */
/* CARGOS (posições) — ex: "Presidente", "Secretário-Geral"           */
/* ------------------------------------------------------------------ */

const BODY_KEYS = ["cpn", "mcn", "disciplina", "jurisdicao", "mesa_conselho", "gabinete"] as const;

const createPositionSchema = z.object({
  title: z.string().min(2).max(120),
  bodyKey: z.enum(BODY_KEYS),
  displayOrder: z.number().int().min(0).default(0),
});

export const createNationalBodyPosition = roleProtectedActionClient("cpn")
  .schema(createPositionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("national_body_positions").insert({
      title: parsedInput.title,
      body_key: parsedInput.bodyKey,
      display_order: parsedInput.displayOrder,
    });

    if (error) {
      throw new ActionError("Não foi possível criar o cargo.");
    }

    revalidatePath("/estrutura/orgaos-nacionais");
    revalidatePath("/"); // reflete no site público (jp-nacional lê esta tabela)
    return { success: true as const };
  });

/* Remover um cargo.
 *
 * CORRIGIDO: o bloqueio original impedia eliminar QUALQUER cargo que
 * alguma vez tivesse tido um titular — mesmo depois de esse titular já
 * ter sido removido (end_date preenchido), sem forma de avançar a não
 * ser "contactar o suporte técnico". Isso tratava histórico encerrado
 * da mesma forma que um titular ativo, o que é demasiado rígido.
 *
 * Comportamento correto, em duas camadas:
 *   1. Titular ATIVO (end_date is null) continua a bloquear sempre,
 *      sem exceção — a UI já nem mostra o botão de eliminar neste caso,
 *      isto é defesa em profundidade caso a ação seja chamada diretamente.
 *   2. Histórico ENCERRADO (só mandatos com end_date preenchido, sem
 *      titular atual): já não bloqueia por si só. Sem `confirmDeleteHistory`,
 *      devolve a lista de titulares que serão perdidos para a UI pedir
 *      confirmação explícita e informada. Com `confirmDeleteHistory: true`,
 *      apaga o histórico e o cargo. A decisão final fica sempre com a CPN,
 *      nunca é automática. */
const deletePositionSchema = z.object({
  positionId: z.string().uuid(),
  confirmDeleteHistory: z.boolean().optional().default(false),
});

export const deleteNationalBodyPosition = roleProtectedActionClient("cpn")
  .schema(deletePositionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: activeHolder, error: activeError } = await ctx.supabase
      .from("national_body_members")
      .select("id")
      .eq("position_id", parsedInput.positionId)
      .is("end_date", null)
      .maybeSingle();

    if (activeError) {
      throw new ActionError("Não foi possível verificar o titular atual deste cargo.");
    }

    if (activeHolder) {
      throw new ActionError(
        "Este cargo ainda tem um titular ativo. Remove o titular primeiro (\"Remover titular\") antes de eliminar o cargo.",
      );
    }

    const { data: history, error: historyError } = await ctx.supabase
      .from("national_body_members")
      .select("id, full_name, start_date, end_date")
      .eq("position_id", parsedInput.positionId)
      .order("start_date", { ascending: false });

    if (historyError) {
      throw new ActionError("Não foi possível verificar o histórico deste cargo.");
    }

    if ((history?.length ?? 0) > 0 && !parsedInput.confirmDeleteHistory) {
      return {
        success: false as const,
        needsConfirmation: true as const,
        historicalHolders: history!.map((h) => ({
          fullName: h.full_name,
          startDate: h.start_date,
          endDate: h.end_date,
        })),
      };
    }

    if ((history?.length ?? 0) > 0) {
      const { error: deleteHistoryError } = await ctx.supabase
        .from("national_body_members")
        .delete()
        .eq("position_id", parsedInput.positionId);

      if (deleteHistoryError) {
        throw new ActionError("Não foi possível apagar o histórico deste cargo.");
      }
    }

    const { error } = await ctx.supabase
      .from("national_body_positions")
      .delete()
      .eq("id", parsedInput.positionId);

    if (error) {
      throw new ActionError("Não foi possível remover o cargo.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "delete",
      entity_type: "national_body_position",
      entity_id: parsedInput.positionId,
      metadata: {
        deletedHistoryCount: history?.length ?? 0,
        deletedHistory: history?.map((h) => ({ fullName: h.full_name, startDate: h.start_date, endDate: h.end_date })) ?? [],
      },
    });

    revalidatePath("/estrutura/orgaos-nacionais");
    return { success: true as const, needsConfirmation: false as const };
  });

/* Esvaziar um cargo (remover o titular atual sem nomear substituto).
 * Fecha o mandato em curso; o cargo passa a "Por atribuir". */
const vacateSchema = z.object({ positionId: z.string().uuid(), endDate: z.string().date() });

export const vacateNationalBodyPosition = roleProtectedActionClient("cpn")
  .schema(vacateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: currentHolder, error: findError } = await ctx.supabase
      .from("national_body_members")
      .select("id")
      .eq("position_id", parsedInput.positionId)
      .is("end_date", null)
      .maybeSingle();

    if (findError) {
      throw new ActionError("Não foi possível verificar o titular atual.");
    }

    if (!currentHolder) {
      throw new ActionError("Este cargo já não tem titular atribuído.");
    }

    const { error } = await ctx.supabase
      .from("national_body_members")
      .update({ end_date: parsedInput.endDate })
      .eq("id", currentHolder.id);

    if (error) {
      throw new ActionError("Não foi possível remover o titular.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "national_body_position",
      entity_id: parsedInput.positionId,
      metadata: { vacated: true },
    });

    revalidatePath("/estrutura/orgaos-nacionais");
    revalidatePath("/");
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* ATRIBUIR TITULAR — fecha automaticamente o mandato anterior         */
/* ------------------------------------------------------------------ */

const assignHolderSchema = z.object({
  positionId: z.string().uuid(),
  fullName: z.string().min(2).max(150),
  photoUrl: z.string().url().optional(),
  startDate: z.string().date(),
});

export const assignNationalBodyHolder = roleProtectedActionClient("cpn")
  .schema(assignHolderSchema)
  .action(async ({ parsedInput, ctx }) => {
    // fecha o mandato atual (end_date null) deste cargo, se existir
    const { data: currentHolder } = await ctx.supabase
      .from("national_body_members")
      .select("id")
      .eq("position_id", parsedInput.positionId)
      .is("end_date", null)
      .maybeSingle();

    if (currentHolder) {
      const { error: closeError } = await ctx.supabase
        .from("national_body_members")
        .update({ end_date: parsedInput.startDate })
        .eq("id", currentHolder.id);

      if (closeError) {
        throw new ActionError("Não foi possível encerrar o mandato anterior.");
      }
    }

    const { error: insertError } = await ctx.supabase.from("national_body_members").insert({
      position_id: parsedInput.positionId,
      full_name: parsedInput.fullName,
      photo_url: parsedInput.photoUrl ?? null,
      start_date: parsedInput.startDate,
    });

    if (insertError) {
      throw new ActionError("Não foi possível atribuir o cargo.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "national_body_position",
      entity_id: parsedInput.positionId,
      metadata: { newHolder: parsedInput.fullName },
    });

    revalidatePath("/estrutura/orgaos-nacionais");
    revalidatePath("/"); // página pública de órgãos

    return { success: true as const };
  });

/* Nota: o CRUD de "Anteriores Líderes" vive em actions/leaders.ts, usado por
 * /estrutura/lideres. Havia aqui uma segunda implementação (createPreviousLeader/
 * deletePreviousLeader) nunca ligada a nenhuma UI — foi removida para não haver
 * duas fontes de verdade sobre a mesma tabela `previous_leaders`. */
