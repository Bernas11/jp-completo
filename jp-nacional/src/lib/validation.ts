import { z } from "zod";
import { calcularIdade } from "./idade";

export const AdesaoSchema = z
  .object({
    nome: z.string().trim().min(3, "Nome demasiado curto"),
    dataNascimento: z.string().refine((d) => !Number.isNaN(new Date(d).getTime()), "Data inválida"),
    email: z.string().trim().email("Email inválido"),
    telemovel: z.string().trim().min(9, "Telemóvel inválido"),
    estabelecimentoEnsino: z.string().trim().optional().default(""),
    localTrabalho: z.string().trim().optional().default(""),
    morada: z.string().trim().min(3, "Morada obrigatória"),
    numero: z.string().trim().optional().default(""),
    localidade: z.string().trim().min(2, "Localidade obrigatória"),
    codigoPostal: z.string().trim().optional().default(""),
    distrito: z.string().trim().min(2, "Distrito obrigatório"),
    concelho: z.string().trim().min(2, "Concelho obrigatório"),
    numeroCC: z.string().trim().min(5, "Número de CC inválido"),
    encNome: z.string().trim().optional().default(""),
    encContacto: z.string().trim().optional().default(""),
    termos: z.union([z.literal("true"), z.literal("false")]).transform((v) => v === "true"),
  })
  // Idade mínima de filiação: 14 anos (regra de negócio confirmada)
  .refine((d) => calcularIdade(d.dataNascimento) >= 14, {
    message: "Idade mínima de filiação: 14 anos",
    path: ["dataNascimento"],
  })
  // Idade máxima de filiação: 30 anos
  .refine((d) => calcularIdade(d.dataNascimento) <= 30, {
    message: "Idade máxima de filiação: 30 anos",
    path: ["dataNascimento"],
  })
  // Entre 14 e 15 anos, exige-se autorização do encarregado de educação
  .refine(
    (d) => {
      const idade = calcularIdade(d.dataNascimento);
      if (idade >= 14 && idade < 16) return d.encNome.length > 0 && d.encContacto.length > 0;
      return true;
    },
    { message: "Autorização do encarregado de educação obrigatória entre os 14 e os 15 anos", path: ["encNome"] }
  )
  .refine((d) => d.termos === true, { message: "É obrigatório aceitar os termos", path: ["termos"] });

export type AdesaoInput = z.infer<typeof AdesaoSchema>;

export const DOCUMENTO_TIPOS_VALIDOS = ["image/jpeg", "image/png", "application/pdf"] as const;
export const DOCUMENTO_TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8MB
