"use client";

import { useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { useAction } from "next-safe-action/hooks";
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  bulkImportRowSchema,
  COLUMN_LABELS,
  REQUIRED_COLUMNS,
  type BulkImportRow,
} from "@/lib/bulk-import-schema";
import {
  commitBulkImport,
  validateBulkImport,
  type BulkImportCommitResult,
  type BulkImportValidationResult,
} from "@/actions/bulk-import";

type WizardStep = "upload" | "preview" | "resultado";

/* CAUSA RAIZ do erro "de sintaxe" relatado nas datas/horas de militância:
 * quando uma célula do Excel tem formato de Data, o ExcelJS devolve um
 * objeto `Date` nativo do JS em `cell.value` (não uma string). O código
 * fazia `String(cell.value)`, que corre `Date.prototype.toString()` —
 * produz algo como "Sat Jan 01 2000 00:00:00 GMT+0000 (Coordinated
 * Universal Time)". O deslocamento GMT muda entre GMT+0000 e GMT+0100
 * consoante o horário de verão em Portugal na data em causa — daí "usa
 * horas +0 e +1" — e essa string verbosa não é um literal de data válido
 * para o Postgres, partindo o INSERT com um erro de sintaxe. Corrigido
 * convertendo explicitamente objetos Date para ISO antes de qualquer
 * outra coisa lhes tocar. */
function cellToText(value: unknown): string {
  if (value instanceof Date) {
    // não deveria acontecer para campos de texto, mas por segurança
    // também não deixamos a verborreia do toString() escapar por aqui
    return value.toISOString();
  }
  if (value && typeof value === "object" && "text" in (value as any)) {
    // ExcelJS às vezes devolve { text, hyperlink } para células com link
    return String((value as any).text ?? "").trim();
  }
  return String(value ?? "").trim();
}

function cellToDateOnly(value: unknown): string {
  if (value instanceof Date) {
    // usa a data em UTC (YYYY-MM-DD), sem componente de hora nem GMT
    return value.toISOString().slice(0, 10);
  }
  return cellToText(value);
}

function cellToDateTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return cellToText(value);
}

export function BulkImportWizard() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedRows, setParsedRows] = useState<BulkImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<BulkImportValidationResult[]>([]);
  const [commitResults, setCommitResults] = useState<BulkImportCommitResult[]>([]);

  const validateAction = useAction(validateBulkImport, {
    onSuccess: ({ data }) => {
      if (data) {
        setValidationResults(data.results);
        setStep("preview");
      }
    },
  });

  const commitAction = useAction(commitBulkImport, {
    onSuccess: ({ data }) => {
      if (data) {
        setCommitResults(data.results);
        setStep("resultado");
      }
    },
  });

  const handleFile = useCallback((file: File) => {
    setParseErrors([]);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          setParseErrors(["O ficheiro não tem nenhuma folha de cálculo."]);
          return;
        }

        // primeira linha = cabeçalhos
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          headers[colNumber] = String(cell.value ?? "").trim();
        });

        const rawRows: Record<string, unknown>[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return; // salta o cabeçalho
          const obj: Record<string, unknown> = {};
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const header = headers[colNumber];
            if (header) obj[header] = cell.value ?? "";
          });
          rawRows.push(obj);
        });

        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !(COLUMN_LABELS[col] in (rawRows[0] ?? {})),
        );
        if (missingColumns.length > 0) {
          setParseErrors([
            `Colunas em falta no ficheiro: ${missingColumns.map((c) => COLUMN_LABELS[c]).join(", ")}`,
          ]);
          return;
        }

        const rows: BulkImportRow[] = [];
        const errors: string[] = [];

        rawRows.forEach((raw, index) => {
          const candidate = {
            rowNumber: index + 2, // +2: linha 1 é cabeçalho, humanos contam a partir de 1
            fullName: cellToText(raw[COLUMN_LABELS.fullName]),
            email: cellToText(raw[COLUMN_LABELS.email]),
            phone: cellToText(raw[COLUMN_LABELS.phone]),
            birthDate: cellToDateOnly(raw[COLUMN_LABELS.birthDate]),
            concelhiaName: cellToText(raw[COLUMN_LABELS.concelhiaName]),
            citizenCardNumber: cellToText(raw[COLUMN_LABELS.citizenCardNumber]),
            memberNumber: cellToText(raw[COLUMN_LABELS.memberNumber]) || undefined,
            joinedAt: cellToDateTime(raw[COLUMN_LABELS.joinedAt]) || undefined,
          };

          const parsed = bulkImportRowSchema.safeParse(candidate);
          if (parsed.success) {
            rows.push(parsed.data);
          } else {
            errors.push(
              `Linha ${candidate.rowNumber}: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
            );
          }
        });

        setParsedRows(rows);
        setParseErrors(errors);
      } catch {
        setParseErrors(["Não foi possível ler o ficheiro. Confirma que é um .xlsx válido."]);
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="font-headline text-2xl text-jp-ink">Importar Militantes em Lote</p>
        <p className="mt-1 text-sm text-jp-ink-soft">
          Carrega uma folha de cálculo para adicionar vários militantes de uma vez.
        </p>
      </div>

      {step === "upload" && (
        <div className="surface-card rounded-2xl border border-jp-line p-8 text-center">
          <Upload className="mx-auto h-10 w-10 text-jp-blue" />
          <p className="mt-3 text-sm text-muted-foreground">
            Carrega um ficheiro .xlsx com as colunas: {Object.values(COLUMN_LABELS).join(", ")}
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="mt-4 block w-full text-sm"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {parseErrors.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-left text-sm text-red-700">
              {parseErrors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          {parsedRows.length > 0 && parseErrors.length === 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm">
                <CheckCircle2 className="inline h-4 w-4 text-green-600 mr-1" />
                {parsedRows.length} linhas lidas com sucesso. Segue para a validação.
              </p>
              <Button
                className="bg-jp-blue text-white hover:bg-jp-blue-deep"
                onClick={() => validateAction.execute({ rows: parsedRows })}
                disabled={validateAction.isExecuting}
              >
                {validateAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Validar ficheiro
              </Button>
            </div>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-800">
              {validationResults.filter((r) => r.status === "ok").length} válidas
            </Badge>
            <Badge className="bg-red-100 text-red-800">
              {validationResults.filter((r) => r.status === "erro").length} com erros
            </Badge>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border border-jp-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-jp-blue/5">
                <tr>
                  <th className="px-3 py-2 text-left">Linha</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {validationResults.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-jp-line">
                    <td className="px-3 py-2">{r.rowNumber}</td>
                    <td className="px-3 py-2">{r.fullName}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">
                      {r.status === "ok" ? (
                        <Badge className="bg-green-100 text-green-800">Válida</Badge>
                      ) : (
                        <div className="flex items-start gap-1 text-red-600">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">{r.errors.join("; ")}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Voltar
            </Button>
            <Button
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={
                validationResults.filter((r) => r.status === "ok").length === 0 ||
                commitAction.isExecuting
              }
              onClick={() => {
                const validRows = validationResults
                  .filter((r) => r.status === "ok")
                  .map((r) => {
                    const original = parsedRows.find((row) => row.rowNumber === r.rowNumber)!;
                    return { ...original, resolvedConcelhiaId: r.resolvedConcelhiaId! };
                  });
                commitAction.execute({ rows: validRows });
              }}
            >
              {commitAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {validationResults.filter((r) => r.status === "ok").length} militantes válidos
            </Button>
          </div>
        </div>
      )}

      {step === "resultado" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {commitResults.filter((r) => r.status === "importado").length} importados
            </Badge>
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {commitResults.filter((r) => r.status === "erro").length} falharam
            </Badge>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border border-jp-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-jp-blue/5">
                <tr>
                  <th className="px-3 py-2 text-left">Linha</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {commitResults.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-jp-line">
                    <td className="px-3 py-2">{r.rowNumber}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">
                      {r.status === "importado" ? (
                        <Badge className="bg-green-100 text-green-800">Importado</Badge>
                      ) : (
                        <span className="text-xs text-red-600">{r.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setStep("upload");
              setParsedRows([]);
              setValidationResults([]);
              setCommitResults([]);
            }}
          >
            Nova importação
          </Button>
        </div>
      )}
    </div>
  );
}
