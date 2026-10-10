"use server";

import { z } from "zod";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { bulkImportRowSchema } from "@/lib/bulk-import-schema";
import { flushSyncOutboxAfterResponse } from "@/lib/sync-outbox";

/* ------------------------------------------------------------------ */
/* VALIDAR (DRY RUN) — não escreve nada, só reporta problemas          */
/* ------------------------------------------------------------------ */

const validateSchema = z.object({ rows: z.array(bulkImportRowSchema) });

export type BulkImportValidationResult = {
  rowNumber: number;
  email: string;
  fullName: string;
  status: "ok" | "erro";
  errors: string[];
  resolvedConcelhiaId?: string;
};

export const validateBulkImport = roleProtectedActionClient("cpn")
  .schema(validateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: concelhias } = await ctx.supabase.from("concelhias").select("id, name");
    const concelhiaByName = new Map(
      (concelhias ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    const emailsInFile = new Map<string, number>(); // email -> primeira linha onde aparece
    const results: BulkImportValidationResult[] = [];

    for (const row of parsedInput.rows) {
      const errors: string[] = [];
      const emailKey = row.email.trim().toLowerCase();

      if (emailsInFile.has(emailKey)) {
        errors.push(`Email duplicado no próprio ficheiro (linha ${emailsInFile.get(emailKey)})`);
      } else {
        emailsInFile.set(emailKey, row.rowNumber);
      }

      const resolvedConcelhiaId = concelhiaByName.get(row.concelhiaName.trim().toLowerCase());
      if (!resolvedConcelhiaId) {
        errors.push(`Concelhia "${row.concelhiaName}" não encontrada no sistema`);
      }

      const { data: existingProfile } = await ctx.supabase
        .from("profiles")
        .select("id")
        .eq("email", row.email)
        .maybeSingle();

      if (existingProfile) {
        errors.push("Já existe uma conta com este email no sistema");
      }

      if (row.memberNumber) {
        const { data: existingMember } = await ctx.supabase
          .from("members")
          .select("id")
          .eq("member_number", row.memberNumber)
          .maybeSingle();

        if (existingMember) {
          errors.push(`Número de militante ${row.memberNumber} já está atribuído`);
        }
      }

      results.push({
        rowNumber: row.rowNumber,
        email: row.email,
        fullName: row.fullName,
        status: errors.length === 0 ? "ok" : "erro",
        errors,
        resolvedConcelhiaId,
      });
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "create",
      entity_type: "bulk_import_validation",
      metadata: {
        totalRows: results.length,
        validRows: results.filter((r) => r.status === "ok").length,
      },
    });

    return { results };
  });

/* ------------------------------------------------------------------ */
/* COMMIT — importa linha a linha; uma linha falhar não aborta as outras */
/* ------------------------------------------------------------------ */

const commitSchema = z.object({
  rows: z.array(
    bulkImportRowSchema.extend({
      resolvedConcelhiaId: z.string().uuid(),
    }),
  ),
});

export type BulkImportCommitResult = {
  rowNumber: number;
  email: string;
  status: "importado" | "erro";
  memberId?: string;
  error?: string;
};

export const commitBulkImport = roleProtectedActionClient("cpn")
  .schema(commitSchema)
  .action(async ({ parsedInput, ctx }) => {
    const results: BulkImportCommitResult[] = [];

    for (const row of parsedInput.rows) {
      const { data: memberId, error } = await ctx.supabase.rpc("bulk_import_member", {
        p_full_name: row.fullName,
        p_email: row.email,
        p_phone: row.phone,
        p_birth_date: row.birthDate,
        p_concelhia_id: row.resolvedConcelhiaId,
        p_citizen_card_number: row.citizenCardNumber,
        p_member_number: row.memberNumber || null,
        p_joined_at: row.joinedAt || new Date().toISOString(),
      });

      if (error) {
        results.push({
          rowNumber: row.rowNumber,
          email: row.email,
          status: "erro",
          error: error.message,
        });
        continue;
      }

      results.push({
        rowNumber: row.rowNumber,
        email: row.email,
        status: "importado",
        memberId: memberId as string,
      });
    }

    const importedCount = results.filter((r) => r.status === "importado").length;

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "create",
      entity_type: "bulk_import_commit",
      metadata: { totalRows: results.length, importedCount, failedCount: results.length - importedCount },
    });

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { results, importedCount };
  });
