import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { NewConversationDialog } from "@/components/mensagens/new-conversation-dialog";

const SENDER_FK = "direct_messages_sender_profile_id_portal_profiles_id_fk";
const RECIPIENT_FK = "direct_messages_recipient_profile_id_portal_profiles_id_fk";

export default async function MensagensPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: messages, error } = await supabase
    .from("direct_messages")
    .select(
      `id, body, created_at, read_at, sender_profile_id, recipient_profile_id,
       sender:portal_profiles!${SENDER_FK}(display_name),
       recipient:portal_profiles!${RECIPIENT_FK}(display_name)`,
    )
    .or(`sender_profile_id.eq.${user.id},recipient_profile_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar mensagens:", error);
    return <ErrorState message="Não foi possível carregar as mensagens." />;
  }

  const conversations = new Map<
    string,
    { otherId: string; otherName: string; lastBody: string; lastAt: string; unread: number }
  >();

  for (const m of messages ?? []) {
    const iAmSender = m.sender_profile_id === user.id;
    const otherId = iAmSender ? m.recipient_profile_id : m.sender_profile_id;
    const otherName = (iAmSender ? (m as any).recipient?.display_name : (m as any).sender?.display_name) ?? "Membro";

    if (!conversations.has(otherId)) {
      conversations.set(otherId, { otherId, otherName, lastBody: m.body, lastAt: m.created_at, unread: 0 });
    }
    if (!iAmSender && !m.read_at) {
      conversations.get(otherId)!.unread += 1;
    }
  }

  const rows = [...conversations.values()];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Mensagens</h1>
        <NewConversationDialog />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Ainda não tens conversas"
          description="Começa uma nova conversa com outro membro da comunidade."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <Link
              key={c.otherId}
              href={`/mensagens/${c.otherId}`}
              className="surface-card flex items-center justify-between gap-4 rounded-2xl border border-jp-line p-4 transition-colors hover:border-jp-blue"
            >
              <div className="min-w-0">
                <p className="font-medium text-jp-ink dark:text-white">{c.otherName}</p>
                <p className="truncate text-sm text-muted-foreground">{c.lastBody}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-jp-yellow px-1.5 text-xs font-bold text-jp-blue-deep">
                    {c.unread}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(c.lastAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
