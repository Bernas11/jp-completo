import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { isModeratorRole } from "@/lib/roles";


export default async function WikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("id, title, body, updated_at, editor:portal_profiles!wiki_pages_last_edited_by_profile_id_portal_profiles_id_fk(display_name)")
    .eq("slug", slug)
    .single();

  if (!page) notFound();

  const { data: revisions } = await supabase
    .from("wiki_revisions")
    .select("id, body, created_at, editor:portal_profiles!wiki_revisions_edited_by_profile_id_portal_profiles_id_fk(display_name)")
    .eq("page_id", page.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <WikiPageView
      pageId={page.id}
      title={page.title}
      body={page.body}
      canEdit={isModeratorRole(profile?.role)}
      updatedAt={page.updated_at}
      lastEditedBy={(page as any).editor?.display_name ?? null}
      revisions={(revisions ?? []).map((r: any) => ({
        id: r.id,
        body: r.body,
        created_at: r.created_at,
        editor_name: r.editor?.display_name ?? "Moderador",
      }))}
    />
  );
}
