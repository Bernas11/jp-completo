import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsQueue } from "@/components/denuncias/reports-queue";
import { PendingBansQueue } from "@/components/denuncias/pending-bans-queue";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";
import { isModeratorRole } from "@/lib/roles";
import { EventGrantsManager } from "@/components/eventos/event-grants-manager";


// Denúncias referem-se a conteúdo por referência polimórfica (entity_type/entity_id);
// resolve-se aqui o autor e uma pré-visualização, consoante o tipo.
async function resolveReportedEntity(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  entityType: string,
  entityId: string
) {
  const table = { forum_topic: "forum_topics", forum_reply: "forum_replies", mural_post: "mural_posts" }[
    entityType
  ];
  const contentField = entityType === "forum_topic" ? "title" : entityType === "mural_post" ? "title" : "body";
  const authorField = entityType === "mural_post" ? "author_profile_id" : "author_profile_id";
  if (!table) return { targetProfileId: "", targetName: "Desconhecido", preview: null };

  const { data } = await supabase
    .from(table)
    .select(`${authorField}, ${contentField}, author:portal_profiles!${table}_author_profile_id_portal_profiles_id_fk(display_name)`)
    .eq("id", entityId)
    .maybeSingle();

  return {
    targetProfileId: (data as any)?.[authorField] ?? "",
    targetName: (data as any)?.author?.display_name ?? "Desconhecido",
    preview: (data as any)?.[contentField]?.slice(0, 140) ?? null,
  };
}

export default async function ModeracaoPage() {
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

  if (!isModeratorRole(profile?.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Área reservada"
        description="Esta secção é apenas para moderadores do Portal."
      />
    );
  }

  const [{ data: reports }, { data: pendingBans }, grantsData] = await Promise.all([
    supabase
      .from("reports")
      .select("id, entity_type, entity_id, reason, created_at, reporter:portal_profiles!reports_reporter_profile_id_portal_profiles_id_fk(display_name)")
      .eq("status", "pendente")
      .order("created_at", { ascending: false }),
    supabase
      .from("moderation_actions")
      .select(
        "id, reason, created_at, target:portal_profiles!moderation_actions_target_profile_id_portal_profiles_id_fk(display_name), applied_by:portal_profiles!moderation_actions_applied_by_profile_id_portal_profiles_id_fk(display_name)"
      )
      .eq("action", "pedido_ban")
      .is("approved_by_profile_id", null)
      .order("created_at", { ascending: false }),
    profile?.role === "cpn"
      ? Promise.all([
          supabase
            .from("event_permission_grants")
            .select(
              "id, event_type, concelhia:concelhias(name), district:districts(name)",
            )
            .is("revoked_at", null),
          supabase.from("districts").select("id, name").order("name"),
          supabase.from("concelhias").select("id, name").order("name"),
        ])
      : null,
  ]);

  const resolvedReports = await Promise.all(
    (reports ?? []).map(async (r: any) => {
      const entity = await resolveReportedEntity(supabase, r.entity_type, r.entity_id);
      return {
        id: r.id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        reason: r.reason,
        created_at: r.created_at,
        reporter_display_name: r.reporter?.display_name ?? "Membro",
        target_profile_id: entity.targetProfileId,
        target_display_name: entity.targetName,
        content_preview: entity.preview,
      };
    })
  );

  return (
    <div className="space-y-10">
      <ReportsQueue reports={resolvedReports} />
      <div className="border-t border-jp-line pt-8">
        <PendingBansQueue
          pendingBans={(pendingBans ?? []).map((b: any) => ({
            id: b.id,
            target_display_name: b.target?.display_name ?? "Membro",
            reason: b.reason,
            applied_by_display_name: b.applied_by?.display_name ?? "Moderador",
            created_at: b.created_at,
          }))}
        />
      </div>
      {profile?.role === "cpn" && grantsData && (
        <div className="border-t border-jp-line pt-8">
          <EventGrantsManager
            grants={(grantsData[0].data ?? []).map((g: any) => ({
              id: g.id,
              eventType: g.event_type,
              concelhiaName: g.concelhia?.name ?? null,
              districtName: g.district?.name ?? null,
            }))}
            districts={grantsData[1].data ?? []}
            concelhias={grantsData[2].data ?? []}
          />
        </div>
      )}
    </div>
  );
}
