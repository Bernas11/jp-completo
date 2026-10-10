import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TopicView } from "@/components/forum/topic-view";
import { canModerateScope } from "@/lib/roles";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ categoryId: string; topicId: string }>;
}) {
  const { categoryId, topicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: category }, { data: topic }] = await Promise.all([
    supabase
      .from("portal_profiles")
      .select("role, district_id, concelhia_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("forum_categories")
      .select("scope, scope_district_id, scope_concelhia_id")
      .eq("id", categoryId)
      .single(),
    supabase
      .from("forum_topics")
      .select("id, title, pinned, status, author:portal_profiles!forum_topics_author_profile_id_portal_profiles_id_fk(display_name)")
      .eq("id", topicId)
      .single(),
  ]);

  if (!topic) notFound();

  const { data: replies } = await supabase
    .from("forum_replies")
    .select("id, body, created_at, edited_at, author:portal_profiles!forum_replies_author_profile_id_portal_profiles_id_fk(id, display_name, avatar_url)")
    .eq("topic_id", topicId)
    .order("created_at");

  const rows = (replies ?? []).map((r: any) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    authorId: r.author?.id ?? "",
    authorName: r.author?.display_name ?? "Membro",
    authorAvatarUrl: r.author?.avatar_url ?? null,
  }));

  const canModerate = category
    ? canModerateScope(
        { role: profile?.role, districtId: profile?.district_id ?? null, concelhiaId: profile?.concelhia_id ?? null },
        {
          scope: category.scope,
          districtId: category.scope_district_id,
          concelhiaId: category.scope_concelhia_id,
        },
      )
    : false;

  return (
    <TopicView
      categoryId={categoryId}
      topic={{
        id: topic.id,
        title: topic.title,
        pinned: topic.pinned,
        status: topic.status,
        authorName: (topic as any).author?.display_name ?? "Membro",
      }}
      replies={rows}
      canModerate={canModerate}
    />
  );
}
