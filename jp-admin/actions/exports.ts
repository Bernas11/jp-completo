"use server";

import { z } from "zod";
import { buildXlsxWorkbook } from "@/lib/xlsx-export";

/**
 * Neutraliza injeção de fórmulas em CSV/Excel: se um valor começar por um
 * caractere que o Excel/Sheets interpreta como início de fórmula (=, +, -, @),
 * prefixa com um apóstrofo para forçar leitura como texto literal.
 * Vulnerabilidade real e conhecida (CWE-1236) em exports gerados a partir
 * de dados fornecidos por utilizadores (ex: nome do militante).
 */
function sanitizeForSpreadsheet(value: unknown): string {
  const str = String(value ?? "");
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
}
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

const exportFiltersSchema = z.object({
  concelhiaId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  status: z.enum(["ativo", "revogado", "suspenso"]).optional(),
});

async function fetchMembersForExport(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>,
  filters: z.infer<typeof exportFiltersSchema>,
) {
  let query = supabase
    .from("members")
    .select(
      `id, member_number, status, joined_at,
       profile:profiles(full_name, email),
       concelhia:concelhias(name, district:districts(name))`,
    )
    .order("member_number", { ascending: true });

  if (filters.concelhiaId) query = query.eq("concelhia_id", filters.concelhiaId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;

  if (error) {
    throw new ActionError("Não foi possível obter a lista de militantes.");
  }

  // filtro por distrito aplicado em memória (relação aninhada não é
  // diretamente filtrável via PostgREST sem uma view dedicada)
  const rows = filters.districtId
    ? (data ?? []).filter((m: any) => m.concelhia?.district?.id === filters.districtId)
    : (data ?? []);

  return rows.map((m: any) => ({
    "Nº Militante": m.member_number,
    Nome: m.profile?.full_name ?? "",
    Email: m.profile?.email ?? "",
    Concelhia: m.concelhia?.name ?? "",
    Distrito: m.concelhia?.district?.name ?? "",
    Estado: m.status,
    "Data de Filiação": m.joined_at,
  }));
}

/* ------------------------------------------------------------------ */
/* CSV                                                                */
/* ------------------------------------------------------------------ */

export const exportMembersCsv = roleProtectedActionClient("administrador")
  .schema(exportFiltersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const rows = await fetchMembersForExport(ctx.supabase, parsedInput);

    if (rows.length === 0) {
      throw new ActionError("Não há militantes que correspondam aos filtros escolhidos.");
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(";"),
      ...rows.map((row) =>
        headers
          .map((h) => `"${sanitizeForSpreadsheet((row as any)[h]).replace(/"/g, '""')}"`)
          .join(";"),
      ),
    ];
    const csv = "\uFEFF" + csvLines.join("\n"); // BOM para acentuação correta no Excel

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "export",
      entity_type: "members",
      metadata: { format: "csv", rowCount: rows.length, filters: parsedInput },
    });

    return { csv, filename: `militantes-${new Date().toISOString().slice(0, 10)}.csv` };
  });

/* ------------------------------------------------------------------ */
/* EXCEL                                                              */
/* ------------------------------------------------------------------ */

export const exportMembersExcel = roleProtectedActionClient("administrador")
  .schema(exportFiltersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const rows = await fetchMembersForExport(ctx.supabase, parsedInput);

    if (rows.length === 0) {
      throw new ActionError("Não há militantes que correspondam aos filtros escolhidos.");
    }

    const buffer = await buildXlsxWorkbook([{ name: "Militantes", rows }]);

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "export",
      entity_type: "members",
      metadata: { format: "xlsx", rowCount: rows.length, filters: parsedInput },
    });

    return {
      base64: buffer,
      filename: `militantes-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  });
