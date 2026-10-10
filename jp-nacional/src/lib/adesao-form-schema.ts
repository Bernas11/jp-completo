import { z } from "zod";
import { calcularIdade } from "./idade";

type TFunc = (key: string) => string;

function buildStep1Schema(t: TFunc) {
  return z
    .object({
      nome: z.string().trim().min(3, t("nome_curto")),
      dataNascimento: z.string().min(1, t("data_obrigatoria")),
      email: z.string().trim().email(t("email_invalido")),
      telemovel: z.string().trim().min(9, t("telemovel_invalido")),
      estabelecimentoEnsino: z.string().optional(),
      encNome: z.string().optional(),
      encContacto: z.string().optional(),
    })
    .superRefine((d, ctx) => {
      const idade = calcularIdade(d.dataNascimento);
      if (Number.isNaN(idade)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dataNascimento"], message: t("data_invalida") });
        return;
      }
      if (idade < 14) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dataNascimento"], message: t("idade_min") });
      }
      if (idade > 30) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dataNascimento"], message: t("idade_max") });
      }
      if (idade >= 14 && idade < 16) {
        if (!d.encNome?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["encNome"], message: t("enc_obrigatorio") });
        if (!d.encContacto?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["encContacto"], message: t("enc_obrigatorio") });
      }
    });
}

function buildStep2Schema(t: TFunc) {
  return z.object({
    morada: z.string().trim().min(3, t("morada_obrigatoria")),
    numero: z.string().optional(),
    localidade: z.string().trim().min(2, t("localidade_obrigatoria")),
    codigoPostal: z.string().optional(),
    distrito: z.string().trim().min(2, t("distrito_obrigatorio")),
    concelho: z.string().trim().min(2, t("concelho_obrigatorio")),
  });
}

function buildStep3Schema(t: TFunc) {
  return z.object({
    numeroCC: z.string().trim().min(5, t("cc_invalido")),
    termos: z.boolean().refine((v) => v === true, t("termos_obrigatorio")),
  });
}

/** Builds the full Zod schema with translated validation messages. */
export function createFullFormSchema(t: TFunc) {
  return buildStep1Schema(t).and(buildStep2Schema(t)).and(buildStep3Schema(t));
}

// Static PT-only schema kept for type inference (message strings unused for typing).
const ptFallback: TFunc = (key) => key;
export const fullFormSchema = createFullFormSchema(ptFallback);
export type AderirFormValues = z.infer<typeof fullFormSchema>;
