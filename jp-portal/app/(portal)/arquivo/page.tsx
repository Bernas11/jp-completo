import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArchiveBrowser, NewCongressDialog } from "@/components/arquivo/archive-browser";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Archive } from "lucide-react";
import { resolveFileUrl } from "@/lib/file-url";
import { canPublish } from "@/lib/roles";

const BUCKET = "arquivo-congressos";

export default async function ArquivoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("portal_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: congresses, error } = await supabase
    .from("archive_congresses")
    .select("id, title, year, description, items:archive_congress_items(id, kind, title, storage_path)")
    .order("year", { ascending: false });

  if (error) {
    console.error("Erro ao carregar arquivo:", error);
    return <ErrorState message="Não foi possível carregar o arquivo de congressos." />;
  }

  // Vazio não pode esconder o botão "Novo congresso": sem ele a CPN nunca cria o primeiro.
  if (!congresses || congresses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Arquivo de Congressos</h1>
          {canPublish(profile?.role) && <NewCongressDialog />}
        </div>
        <EmptyState
          icon={Archive}
          title="Ainda não há congressos no arquivo"
          description="Documentos, fotografias e resoluções de congressos vão aparecer aqui."
        />
      </div>
    );
  }

  return (
    <ArchiveBrowser
      congresses={congresses as any}
      canManage={canPublish(profile?.role)}
      getDownloadUrl={(path) => resolveFileUrl(supabase, BUCKET, path)}
    />
  );
}
