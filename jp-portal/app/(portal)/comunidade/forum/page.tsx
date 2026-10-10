import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ForumCategories } from "@/components/forum/forum-categories";
import { NewCategoryDialog } from "@/components/forum/new-category-dialog";
import { canPublishScoped } from "@/lib/roles";
import { getModeratorScopeContext } from "@/lib/moderator-scope";
import { loadScopeNames, scopeLabel } from "@/lib/scope-label";

export default async function ForumPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [scopeContext, names] = await Promise.all([getModeratorScopeContext(supabase, user.id), loadScopeNames(supabase)]);

  const { data: categories, error } = await supabase
    .from("forum_categories")
    .select(
      "id, name, scope, scope_district_id, scope_concelhia_id, topics:forum_topics(count)"
    )
    .order("display_order");

  if (error) {
    return <div className="p-8 text-center text-muted-foreground">Não foi possível carregar os fóruns.</div>;
  }

  const rows = (categories ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    scope: c.scope,
    scopeLabel: scopeLabel(c.scope, c.scope_district_id, c.scope_concelhia_id, names),
    topicCount: c.topics?.[0]?.count ?? 0,
  }));

  return (
    <ForumCategories
      categories={rows}
      action={
        scopeContext.canModerate && canPublishScoped(scopeContext.moderator.role) ? (
          <NewCategoryDialog
            moderator={scopeContext.moderator}
            districts={scopeContext.districts}
            concelhias={scopeContext.concelhias}
          />
        ) : null
      }
    />
  );
}
