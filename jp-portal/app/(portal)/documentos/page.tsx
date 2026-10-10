import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsLibrary } from "@/components/documentos/documents-library";
import { ErrorState } from "@/components/ui/error-state";
import { resolveFileUrl } from "@/lib/file-url";
import { getModeratorScopeContext } from "@/lib/moderator-scope";
import { loadScopeNames, scopeLabel } from "@/lib/scope-label";
import { getMilitanciaClient } from "@/lib/supabase/militancia";

const BUCKET = "documentos-portal";
const ADMIN_BUCKET = "documentos-publicos";

export default async function DocumentosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A leitura dos documentos nacionais (outro projeto Supabase) é um extra: se
  // faltarem as variáveis SUPABASE_MILITANCIA_* ou a query falhar, a página
  // continua a mostrar os documentos do Portal em vez de rebentar por inteiro.
  let militancia: ReturnType<typeof getMilitanciaClient> | null = null;
  try {
    militancia = getMilitanciaClient();
  } catch (e) {
    console.error("[documentos] cliente da Militância indisponível:", e);
  }

  const [scopeContext, names, { data: documents, error }, nationalResult] = await Promise.all([
    getModeratorScopeContext(supabase, user.id),
    loadScopeNames(supabase),
    supabase
      .from("portal_documents")
      .select("id, title, scope, scope_district_id, scope_concelhia_id, storage_path, created_at")
      .order("created_at", { ascending: false }),
    // documentos nacionais geridos em /documentacao no Admin — ver
    // lib/supabase/militancia.ts para o porquê desta leitura direta
    militancia
      ? militancia
          .from("public_documents")
          // a coluna chama-se published_at (não existe created_at nesta tabela)
          .select("id, title, storage_path, created_at:published_at")
          .order("published_at", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (nationalResult.error) {
    console.error("[documentos] falha ao ler public_documents:", nationalResult.error);
  }
  const nationalDocs = nationalResult.data as
    | { id: string; title: string; storage_path: string; created_at: string }[]
    | null;

  if (error) {
    console.error("Erro ao carregar documentos:", error);
    return <ErrorState message="Não foi possível carregar os documentos." />;
  }

  const nacionaisFundidos = (militancia ? nationalDocs ?? [] : []).map((d) => ({
    id: `admin-${d.id}`,
    title: d.title,
    scope: "nacional" as const,
    scope_label: "Nacional",
    scope_district_id: null,
    scope_concelhia_id: null,
    downloadUrl: /^https?:\/\//.test(d.storage_path)
      ? d.storage_path
      : militancia!.storage.from(ADMIN_BUCKET).getPublicUrl(d.storage_path).data.publicUrl,
    created_at: d.created_at,
    readOnly: true as const,
  }));

  const documentosPortalComUrl = (documents ?? []).map((d) => ({
    ...d,
    scope_label: scopeLabel(d.scope, d.scope_district_id, d.scope_concelhia_id, names),
    downloadUrl: resolveFileUrl(supabase, BUCKET, d.storage_path),
  }));

  const todosDocumentos = [...nacionaisFundidos, ...documentosPortalComUrl].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <DocumentsLibrary documents={todosDocumentos} scopeContext={scopeContext} />
  );
}
