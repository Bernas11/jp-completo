import ExcelJS from "exceljs";

/**
 * Neutraliza injeção de fórmulas em Excel (CWE-1236): se um valor começar
 * por um caractere que o Excel interpreta como início de fórmula
 * (=, +, -, @), prefixa com apóstrofo para forçar leitura como texto
 * literal. Aplicado a todos os exports que passam por aqui.
 */
function sanitizeCell(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

/**
 * Gera um workbook .xlsx a partir de um ou mais conjuntos de dados JSON,
 * um por folha. Cada linha de `rows` tem de ser um objeto simples
 * (chave => valor primitivo) — os nomes das chaves tornam-se cabeçalhos.
 *
 * Substitui o pacote `xlsx` (SheetJS), removido por ter vulnerabilidades
 * conhecidas (Prototype Pollution, ReDoS) sem correção publicada no npm.
 */
export async function buildXlsxWorkbook(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
): Promise<string> {
  const workbook = new ExcelJS.Workbook();

  for (const { name, rows } of sheets) {
    // nomes de folha do Excel: máx 31 caracteres, sem : \ / ? * [ ]
    const safeName = name.replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Folha";
    const sheet = workbook.addWorksheet(safeName);

    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    sheet.columns = columns.map((key) => ({ header: key, key, width: 18 }));
    sheet.addRows(
      rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, sanitizeCell(v)]))),
    );
    sheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}
