import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsPanel } from "@/components/documentos/documents-panel";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function DocumentacaoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: documents, error } = await supabase
    .from("public_documents")
    .select("id, title, category, version, storage_path, created_at:published_at")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[documentacao] falha ao carregar public_documents:", error);
  }

  return (
    <div>
      <PageHeader
        title="Documentação Pública"
        description="Documentos institucionais disponibilizados publicamente."
      />
      {error ? (
        <ErrorState
          title="Não foi possível carregar os documentos"
          description="Erro técnico ao consultar a base de dados. Se persistir, contacta o suporte técnico."
        />
      ) : (
        <DocumentsPanel documents={documents ?? []} />
      )}
    </div>
  );
}
