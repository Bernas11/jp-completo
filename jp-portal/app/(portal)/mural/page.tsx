import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MuralList } from "@/components/mural/mural-list";
import { ErrorState } from "@/components/ui/error-state";
import { redirect } from "next/navigation";
import { getModeratorScopeContext } from "@/lib/moderator-scope";
import { loadScopeNames, scopeLabel } from "@/lib/scope-label";

export default async function MuralPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [scopeContext, names, { data: posts, error }] = await Promise.all([
    getModeratorScopeContext(supabase, user.id),
    loadScopeNames(supabase),
    supabase
      .from("mural_posts")
      .select(
        "id, title, body, scope, scope_district_id, scope_concelhia_id, created_at, author:portal_profiles(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (error) {
    console.error("Erro ao carregar mural:", error);
    return <ErrorState message="Não foi possível carregar o mural." />;
  }

  const rows = (posts ?? []).map((p: any) => ({
    ...p,
    scope_label: scopeLabel(p.scope, p.scope_district_id, p.scope_concelhia_id, names),
    author_display_name: p.author?.display_name ?? "Membro",
  }));

  return <MuralList posts={rows} scopeContext={scopeContext} />;
}
