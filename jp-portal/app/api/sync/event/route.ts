import { NextResponse } from "next/server";
import { verifySyncSignature } from "@/lib/sync-signature";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EventUpsertedPayload = {
  event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  concelhia_id: string | null;
};

type EventDeletedPayload = { event_id: string };

export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = await verifySyncSignature(rawBody, request.headers.get("X-Sync-Signature"));
  if (!valid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const { eventId, eventType, payload } = JSON.parse(rawBody) as {
    eventId: string;
    eventType: "event_upserted" | "event_deleted";
    payload: EventUpsertedPayload | EventDeletedPayload;
  };

  const supabase = createSupabaseAdminClient();

  const { data: alreadyProcessed } = await supabase
    .from("sync_log")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, skipped: "duplicate" });
  }

  try {
    if (eventType === "event_upserted") {
      const p = payload as EventUpsertedPayload;
      const { error } = await supabase.from("portal_events").upsert(
        {
          source_event_id: p.event_id,
          title: p.title,
          description: p.description,
          location: p.location,
          starts_at: p.starts_at,
          ends_at: p.ends_at,
          concelhia_id: p.concelhia_id,
        },
        { onConflict: "source_event_id" },
      );
      if (error) throw error;
    } else if (eventType === "event_deleted") {
      const p = payload as EventDeletedPayload;
      const { error } = await supabase.from("portal_events").delete().eq("source_event_id", p.event_id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: `Tipo de evento desconhecido: ${eventType}` }, { status: 400 });
    }

    await supabase.from("sync_log").insert({ event_id: eventId, event_type: eventType });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Erro ao processar evento de sync ${eventType} (${eventId}):`, err);
    return NextResponse.json({ error: "Falha ao processar evento" }, { status: 500 });
  }
}
