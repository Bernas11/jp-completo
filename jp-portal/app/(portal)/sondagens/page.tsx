import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { PollCard } from "@/components/sondagens/poll-card";
import { CreatePollDialog } from "@/components/sondagens/create-poll-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getModeratorScopeContext } from "@/lib/moderator-scope";
import { canPublishScoped } from "@/lib/roles";

export default async function SondagensPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [scopeContext, { data: polls, error }, { data: voteCounts, error: countsError }] = await Promise.all([
    getModeratorScopeContext(supabase, user.id),
    supabase
      .from("polls")
      .select(
        "id, question, multiple_choice, closes_at, options:poll_options!poll_options_poll_id_polls_id_fk(id, label, display_order, my_vote:poll_votes!poll_votes_option_id_poll_options_id_fk(profile_id))"
      )
      .order("created_at", { ascending: false }),
    supabase.from("poll_vote_counts").select("option_id, vote_count"),
  ]);

  if (error) {
    console.error("Erro ao carregar sondagens:", error);
    return <ErrorState message="Não foi possível carregar as sondagens." />;
  }
  // Os totais são acessórios: se a vista falhar, mostra as sondagens com 0 votos
  // em vez de esconder tudo.
  if (countsError) console.error("Erro ao carregar contagens de votos:", countsError);

  const countByOption = new Map((voteCounts ?? []).map((v) => [v.option_id, v.vote_count]));

  const rows = (polls ?? []).map((p: any) => {
    const options = (p.options ?? [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((o: any) => ({ id: o.id, label: o.label, voteCount: countByOption.get(o.id) ?? 0 }));

    const totalVotes = options.reduce((sum: number, o: any) => sum + o.voteCount, 0);
    const userVotedOptionIds = (p.options ?? [])
      .flatMap((o: any) => (o.my_vote ?? []).some((v: any) => v.profile_id === user.id) ? [o.id] : []);

    return {
      id: p.id,
      question: p.question,
      multipleChoice: p.multiple_choice,
      isClosed: p.closes_at ? new Date(p.closes_at) < new Date() : false,
      options,
      totalVotes,
      userVotedOptionIds,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Sondagens</h1>
        {scopeContext.canModerate && canPublishScoped(scopeContext.moderator.role) && (
          <CreatePollDialog
            moderator={scopeContext.moderator}
            districts={scopeContext.districts}
            concelhias={scopeContext.concelhias}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem sondagens ativas"
          description="Assim que houver uma nova sondagem, vais poder votar aqui."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <PollCard key={p.id} pollId={p.id} {...p} />
          ))}
        </div>
      )}
    </div>
  );
}
