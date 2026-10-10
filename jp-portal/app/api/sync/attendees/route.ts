import { NextResponse } from "next/server";
import { verifySyncSignature } from "@/lib/sync-signature";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/* Peça em falta do "sistema de presenças": o RSVP em si já existia e
 * funcionava (rsvpEvent/cancelRsvp, portal_event_rsvps), mas não havia
 * NENHUM endpoint para o Admin conseguir perguntar ao Portal quem
 * confirmou presença num evento — actions/events.ts (jp-admin) já
 * chamava PORTAL_GET_ATTENDEES_URL, mas essa rota nunca tinha sido
 * criada aqui. É por isso que a lista de presenças no Admin nunca
 * mostrava nada (ou dava erro de fetch a um URL que não existe).
 *
 * Pedido: POST assinado (mesmo esquema HMAC dos outros /api/sync/*),
 * corpo { eventId }. Resposta: { attendees: [...] }, na forma exata que
 * getEventAttendees já espera. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = await verifySyncSignature(rawBody, request.headers.get("X-Sync-Signature"));
  if (!valid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const { eventId } = JSON.parse(rawBody) as { eventId: string };
  if (!eventId) {
    return NextResponse.json({ error: "eventId em falta" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: portalEvent, error: eventError } = await supabase
    .from("portal_events")
    .select("id")
    .eq("source_event_id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Erro ao procurar evento do Portal:", eventError);
    return NextResponse.json({ error: "Falha ao procurar evento" }, { status: 500 });
  }

  // O evento ainda não chegou ao Portal (sync pendente) ou não é
  // publico — devolve lista vazia em vez de erro, é um estado válido.
  if (!portalEvent) {
    return NextResponse.json({ attendees: [] });
  }

  const { data: rsvps, error: rsvpsError } = await supabase
    .from("portal_event_rsvps")
    .select("confirmed_at, profile:portal_profiles(display_name, email, member_number)")
    .eq("event_id", portalEvent.id)
    .order("confirmed_at", { ascending: true });

  if (rsvpsError) {
    console.error("Erro ao carregar presenças:", rsvpsError);
    return NextResponse.json({ error: "Falha ao carregar presenças" }, { status: 500 });
  }

  const attendees = (rsvps ?? []).map((r: any) => ({
    displayName: r.profile?.display_name ?? "—",
    email: r.profile?.email ?? "—",
    memberNumber: r.profile?.member_number ?? null,
    confirmedAt: r.confirmed_at,
  }));

  return NextResponse.json({ attendees });
}
