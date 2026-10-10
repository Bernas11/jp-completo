import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventsList } from "@/components/eventos/events-list";
import { CreateEventDialog } from "@/components/eventos/create-event-dialog";
import { PendingInvitations } from "@/components/eventos/pending-invitations";
import { ErrorState } from "@/components/ui/error-state";
import { isModeratorRole, canModerateEvent } from "@/lib/roles";

export default async function EventosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: events, error }] = await Promise.all([
    supabase
      .from("portal_profiles")
      .select(
        `role,
         district:districts!portal_profiles_district_id_fkey(id, name),
         concelhia:concelhias!portal_profiles_concelhia_id_fkey(id, name)`,
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("portal_events")
      .select(
        "id, title, description, location, starts_at, ends_at, concelhia_id, district_id, event_type, rsvps:portal_event_rsvps(profile_id)",
      )
      .order("starts_at"),
  ]);

  if (error) {
    console.error("Erro ao carregar eventos:", error);
    return <ErrorState message="Não foi possível carregar os eventos." />;
  }

  const role = profile?.role ?? null;
  const canCreate = isModeratorRole(role);
  const ownConcelhiaId = (profile?.concelhia as any)?.id ?? null;
  const ownDistrictId = (profile?.district as any)?.id ?? null;

  let districts: { id: string; name: string }[] = [];
  let concelhias: { id: string; name: string }[] = [];
  let grantedEventTypes: string[] = [];
  let pendingInvitations: { id: string; eventTitle: string; eventStartsAt: string }[] = [];

  if (canCreate) {
    if (role === "cpn") {
      const [d, c] = await Promise.all([
        supabase.from("districts").select("id, name").order("name"),
        supabase.from("concelhias").select("id, name").order("name"),
      ]);
      districts = d.data ?? [];
      concelhias = c.data ?? [];
    } else {
      const orFilter = [
        ownConcelhiaId ? `grantee_concelhia_id.eq.${ownConcelhiaId}` : null,
        ownDistrictId ? `grantee_district_id.eq.${ownDistrictId}` : null,
      ]
        .filter(Boolean)
        .join(",");
      const { data: grants } = orFilter
        ? await supabase.from("event_permission_grants").select("event_type").is("revoked_at", null).or(orFilter)
        : { data: [] };
      grantedEventTypes = (grants ?? []).map((g: any) => g.event_type);

      const invitationFilter = [
        ownConcelhiaId ? `invited_concelhia_id.eq.${ownConcelhiaId}` : null,
        ownDistrictId ? `invited_district_id.eq.${ownDistrictId}` : null,
      ]
        .filter(Boolean)
        .join(",");
      if (invitationFilter) {
        const { data: invites } = await supabase
          .from("event_invitations")
          .select("id, event:portal_events(title, starts_at)")
          .eq("status", "pendente")
          .or(invitationFilter);
        pendingInvitations = (invites ?? []).map((i: any) => ({
          id: i.id,
          eventTitle: i.event?.title ?? "Evento",
          eventStartsAt: i.event?.starts_at,
        }));
      }
    }
  }

  const rows = (events ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    attendeeCount: e.rsvps?.length ?? 0,
    userConfirmed: (e.rsvps ?? []).some((r: any) => r.profile_id === user.id),
    canModerate: canModerateEvent(
      { role, ownConcelhiaId, ownDistrictId },
      { concelhiaId: e.concelhia_id, districtId: e.district_id, eventType: e.event_type },
      grantedEventTypes,
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Eventos</h1>
        {canCreate && (
          <CreateEventDialog
            role={role!}
            ownConcelhia={(profile?.concelhia as any) ?? null}
            ownDistrict={(profile?.district as any) ?? null}
            districts={districts}
            concelhias={concelhias}
            grantedEventTypes={grantedEventTypes}
          />
        )}
      </div>
      <PendingInvitations invitations={pendingInvitations} />
      <EventsList events={rows} districts={districts} concelhias={concelhias} />
    </div>
  );
}
