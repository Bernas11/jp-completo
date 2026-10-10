import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TopicList } from "@/components/forum/topic-list";
import { NewTopicForm } from "@/components/forum/new-topic-form";
import { loadScopeNames, scopeLabel } from "@/lib/scope-label";

export default async function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: category } = await supabase
    .from("forum_categories")
    .select("id, name, scope, scope_district_id, scope_concelhia_id")
    .eq("id", categoryId)
    .single();

  if (!category) notFound();

  const names = await loadScopeNames(supabase);

  const { data: topics } = await supabase
    .from("forum_topics")
    .select(
      "id, title, pinned, status, view_count, last_reply_at, created_at, author:portal_profiles!forum_topics_author_profile_id_portal_profiles_id_fk(display_name), replies:forum_replies!forum_replies_topic_id_forum_topics_id_fk(count)"
    )
    .eq("category_id", categoryId)
    .order("pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false });

  const rows = (topics ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    pinned: t.pinned,
    status: t.status,
    viewCount: t.view_count,
    replyCount: (t.replies?.[0]?.count ?? 1) - 1,
    authorName: t.author?.display_name ?? "Membro",
    lastActivityAt: t.last_reply_at ?? t.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display uppercase text-2xl text-jp-blue-deep">{category.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scopeLabel(category.scope, category.scope_district_id, category.scope_concelhia_id, names)}
          </p>
        </div>
        <NewTopicForm categoryId={categoryId} />
      </div>
      <TopicList topics={rows} categoryId={categoryId} />
    </div>
  );
}
