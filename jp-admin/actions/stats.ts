"use server";

import { z } from "zod";
import { buildXlsxWorkbook } from "@/lib/xlsx-export";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

async function fetchAllStats(ctx: {
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;
}) {
  const [growth, approvalRate, concelhiaActivity, districtSummary] = await Promise.all([
    ctx.supabase.rpc("get_stats_member_growth"),
    ctx.supabase.rpc("get_stats_approval_rate"),
    ctx.supabase.rpc("get_stats_concelhia_activity"),
    ctx.supabase.rpc("get_stats_district_summary"),
  ]);

  if (growth.error || approvalRate.error || concelhiaActivity.error || districtSummary.error) {
    throw new ActionError("Não foi possível obter os dados estatísticos.");
  }

  return {
    growth: growth.data ?? [],
    approvalRate: approvalRate.data ?? [],
    concelhiaActivity: concelhiaActivity.data ?? [],
    districtSummary: districtSummary.data ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* EXCEL — uma folha por conjunto de dados                            */
/* ------------------------------------------------------------------ */

export const exportStatsExcel = roleProtectedActionClient("administrador")
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const stats = await fetchAllStats(ctx);

    const base64 = await buildXlsxWorkbook([
      { name: "Crescimento Mensal", rows: stats.growth },
      { name: "Aprovações", rows: stats.approvalRate },
      { name: "Concelhias", rows: stats.concelhiaActivity },
      { name: "Distritos", rows: stats.districtSummary },
    ]);

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "export",
      entity_type: "stats",
      metadata: { format: "xlsx" },
    });

    return { base64, filename: `estatisticas-${new Date().toISOString().slice(0, 10)}.xlsx` };
  });

/* ------------------------------------------------------------------ */
/* PDF — relatório tabular (sem gráficos renderizados: um relatório    */
/* de números para arquivo/impressão, não uma cópia visual do dashboard) */
/* ------------------------------------------------------------------ */

export const exportStatsPdf = roleProtectedActionClient("administrador")
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const stats = await fetchAllStats(ctx);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const jpBlue = rgb(0 / 255, 51 / 255, 198 / 255);

    let page = pdfDoc.addPage([595, 842]); // A4
    let y = 800;

    const drawTitle = (text: string) => {
      page.drawText(text, { x: 50, y, size: 18, font: boldFont, color: jpBlue });
      y -= 30;
    };

    const drawSectionHeader = (text: string) => {
      if (y < 100) {
        page = pdfDoc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(text, { x: 50, y, size: 13, font: boldFont, color: jpBlue });
      y -= 20;
    };

    const drawRow = (text: string) => {
      if (y < 60) {
        page = pdfDoc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(text, { x: 60, y, size: 9, font });
      y -= 14;
    };

    drawTitle("Juventude Popular — Relatório Estatístico");
    page.drawText(new Date().toLocaleDateString("pt-PT"), {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 30;

    drawSectionHeader("Crescimento de Militantes por Mês");
    for (const row of stats.growth) {
      drawRow(
        `${new Date(row.month).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })} — Novos: ${row.new_members} | Total acumulado: ${row.cumulative_members}`,
      );
    }
    y -= 10;

    drawSectionHeader("Aprovações / Recusas por Mês");
    for (const row of stats.approvalRate) {
      drawRow(
        `${new Date(row.month).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })} — Aprovados: ${row.approved} | Recusados: ${row.rejected} | Taxa: ${row.approval_rate_pct ?? "—"}%`,
      );
    }
    y -= 10;

    drawSectionHeader("Resumo por Distrito");
    for (const row of stats.districtSummary) {
      drawRow(
        `${row.district_name} — Concelhias ativas: ${row.active_concelhia_count}/${row.concelhia_count} | Militantes ativos: ${row.active_members}`,
      );
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "export",
      entity_type: "stats",
      metadata: { format: "pdf" },
    });

    return { base64, filename: `estatisticas-${new Date().toISOString().slice(0, 10)}.pdf` };
  });
