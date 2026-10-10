import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { ThreadView } from "@/components/mensagens/thread-view";

export default async function ThreadPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId: otherProfileId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: otherProfile }, { data: messages, error }] = await Promise.all([
    supabase.from("portal_profiles").select("display_name").eq("id", otherProfileId).maybeSingle(),
    supabase
      .from("direct_messages")
      .select("id, body, created_at, sender_profile_id")
      .or(
        `and(sender_profile_id.eq.${user.id},recipient_profile_id.eq.${otherProfileId}),and(sender_profile_id.eq.${otherProfileId},recipient_profile_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true }),
  ]);

  if (!otherProfile) notFound();

  if (error) {
    console.error("Erro ao carregar a conversa:", error);
    return <ErrorState message="Não foi possível carregar a conversa." />;
  }

  const rows = (messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    fromMe: m.sender_profile_id === user.id,
  }));

  return (
    <ThreadView
      otherProfileId={otherProfileId}
      otherName={otherProfile.display_name}
      initialMessages={rows}
      myId={user.id}
    />
  );
}
