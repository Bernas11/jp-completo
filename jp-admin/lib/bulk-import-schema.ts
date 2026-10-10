import { z } from "zod";

export const bulkImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  fullName: z.string().min(2, "Nome demasiado curto"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(9, "Telefone inválido"),
  birthDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Data de nascimento inválida"),
  concelhiaName: z.string().min(1, "Concelhia em falta"),
  citizenCardNumber: z.string().min(5, "Número de CC inválido"),
  memberNumber: z.string().optional(), // se vazio, é gerado; se preenchido, preserva o histórico
  joinedAt: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Data de filiação inválida"),
});

export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;

export const REQUIRED_COLUMNS = [
  "fullName",
  "email",
  "phone",
  "birthDate",
  "concelhiaName",
  "citizenCardNumber",
] as const;

export const COLUMN_LABELS: Record<string, string> = {
  fullName: "Nome Completo",
  email: "Email",
  phone: "Telefone",
  birthDate: "Data de Nascimento",
  concelhiaName: "Concelhia",
  citizenCardNumber: "Número do CC",
  memberNumber: "Nº Militante (opcional)",
  joinedAt: "Data de Filiação (opcional)",
};
