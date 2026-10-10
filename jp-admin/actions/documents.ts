"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

const documentCategoryValues = [
  "convocatoria",
  "estatuto",
  "minuta",
  "resolucao",
  "outro",
] as const;

const BUCKET = "documentos-publicos";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/* ------------------------------------------------------------------ */
/* UPLOAD                                                              */
/* CORRIGIDO: o upload do ficheiro corria antes DIRETAMENTE do browser
 * para o Supabase Storage (createSupabaseBrowserClient), o que exigia
 * que o browser conseguisse ler a cookie de sessão. Mas o cliente
 * servidor (lib/supabase/server.ts) e o middleware.ts escrevem SEMPRE
 * essa cookie com `httpOnly: true` — o que é correto para segurança
 * (impede JS malicioso de roubar o token via XSS), mas também impede
 * QUALQUER leitura client-side dessa cookie, incluindo pelo próprio
 * createBrowserClient do Supabase. Resultado: o upload ia sempre sem
 * sessão válida, `auth.uid()` era null do lado do storage, e a policy
 * de escrita (exige administrador/cpn) bloqueava sempre com "new row
 * violates row-level security policy" — não porque a policy estivesse
 * errada, mas porque o pedido chegava sem autenticação nenhuma.
 * Esta era a ÚNICA chamada direta do browser ao Supabase em todo o
 * Admin; todas as restantes escritas já passam por Server Actions
 * (ctx.supabase, que lê a cookie do lado do servidor, onde httpOnly não
 * é um problema). Corrigido trazendo o upload para aqui também, em vez
 * de baixar a segurança da cookie de sessão para o resto da app. */
/* UPLOAD EM DOIS PASSOS
 * A Vercel limita o corpo de qualquer função a ~4,5MB, por isso um PDF
 * de 5-15MB enviado DENTRO da Server Action falhava antes de chegar cá
 * (o `bodySizeLimit: 15mb` do Next não contorna o limite da plataforma).
 * Agora: (1) esta action valida permissões/tipo/tamanho e devolve um URL
 * de upload assinado; (2) o browser envia o ficheiro DIRETO para o
 * Supabase Storage com esse token (não precisa da cookie de sessão, que é
 * httpOnly); (3) `registerPublicDocument` confirma que o ficheiro existe
 * e cria o registo em public_documents. */
const requestUploadSchema = z.object({
  category: z.enum(documentCategoryValues),
  fileName: z.string().min(1).max(200),
  fileType: z.string().refine((t) => ALLOWED_TYPES.includes(t), "Formato de ficheiro não suportado (usa PDF ou Word)."),
  fileSize: z.number().int().positive().max(MAX_BYTES, "O ficheiro excede 15MB."),
});

export const requestDocumentUpload = roleProtectedActionClient("administrador")
  .schema(requestUploadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const safeName = parsedInput.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const storagePath = `${parsedInput.category}/${Date.now()}-${safeName}`;

    const { data, error } = await ctx.supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw new ActionError("Não foi possível preparar o envio do ficheiro: " + (error?.message ?? "sem resposta"));
    }

    return { storagePath, token: data.token };
  });

const registerDocumentSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.enum(documentCategoryValues),
  storagePath: z.string().min(1).max(400),
  // se fornecido, este documento passa a ser uma nova versão do indicado
  supersedesId: z.string().uuid().optional(),
});

export const registerPublicDocument = roleProtectedActionClient("administrador")
  .schema(registerDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!parsedInput.storagePath.startsWith(`${parsedInput.category}/`)) {
      throw new ActionError("Caminho do ficheiro inválido para esta categoria.");
    }

    // confirma que o ficheiro chegou mesmo ao Storage
    const folder = parsedInput.storagePath.split("/")[0];
    const fileName = parsedInput.storagePath.slice(folder.length + 1);
    const { data: found } = await ctx.supabase.storage.from(BUCKET).list(folder, { search: fileName, limit: 1 });
    if (!found || found.length === 0) {
      throw new ActionError("O ficheiro não chegou ao armazenamento. Tenta enviar novamente.");
    }

    let version = 1;

    if (parsedInput.supersedesId) {
      const { data: previous, error: previousError } = await ctx.supabase
        .from("public_documents")
        .select("id, version, category")
        .eq("id", parsedInput.supersedesId)
        .single();

      if (previousError || !previous) {
        throw new ActionError("Documento anterior não encontrado.");
      }
      if (previous.category !== parsedInput.category) {
        throw new ActionError("A nova versão tem de manter a mesma categoria do documento original.");
      }
      version = previous.version + 1;
    }

    const { data: document, error } = await ctx.supabase
      .from("public_documents")
      .insert({
        title: parsedInput.title,
        category: parsedInput.category,
        storage_path: parsedInput.storagePath,
        version,
        supersedes_id: parsedInput.supersedesId ?? null,
        uploaded_by_profile_id: ctx.profile.id,
      })
      .select("id")
      .single();

    if (error || !document) {
      // o ficheiro já está no storage mas o registo falhou — remove o órfão
      await ctx.supabase.storage.from(BUCKET).remove([parsedInput.storagePath]);
      throw new ActionError("Não foi possível publicar o documento.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "create",
      entity_type: "public_document",
      entity_id: document.id,
      metadata: { title: parsedInput.title, version },
    });

    revalidatePath("/documentacao");
    revalidatePath("/"); // página pública de Documentação

    return { documentId: document.id, version };
  });

/* ------------------------------------------------------------------ */
/* ELIMINAR (só a versão mais recente, para não quebrar o histórico)  */
/* ------------------------------------------------------------------ */

const deleteDocumentSchema = z.object({ documentId: z.string().uuid() });

export const deletePublicDocument = roleProtectedActionClient("cpn")
  .schema(deleteDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { count } = await ctx.supabase
      .from("public_documents")
      .select("id", { count: "exact", head: true })
      .eq("supersedes_id", parsedInput.documentId);

    if (count && count > 0) {
      throw new ActionError(
        "Não é possível eliminar esta versão porque existem versões mais recentes que a substituem.",
      );
    }

    const { error } = await ctx.supabase
      .from("public_documents")
      .delete()
      .eq("id", parsedInput.documentId);

    if (error) {
      throw new ActionError("Não foi possível eliminar o documento.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "delete",
      entity_type: "public_document",
      entity_id: parsedInput.documentId,
    });

    revalidatePath("/documentacao");
    revalidatePath("/");

    return { success: true as const };
  });
