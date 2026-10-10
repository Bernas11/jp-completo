import { NextResponse } from "next/server";
import { verifySyncSignature } from "@/lib/sync-signature";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MemberApprovedPayload = {
  member_id: string;
  email: string;
  full_name: string;
  member_number: string;
  concelhia_id: string | null;
  district_id: string | null;
  joined_at: string;
};

type MemberRevokedPayload = { member_id: string; revoked_reason: string | null };
type MemberTransferredPayload = { member_id: string; to_concelhia_id: string };
type MemberRoleChangedPayload = { member_id: string; email: string; admin_role: string };

/** Role do JP-Admin (profiles.role) -> role do Portal (portal_profiles.role).
 * 'administrador' (TI/Suporte Técnico-Digital) não é elevado: é uma conta
 * técnica de suporte, não uma role de moderação de comunidade — ver a regra
 * de hierarquia do ecossistema. Continua "militante" no Portal, tal como
 * qualquer role desconhecida. */
function mapAdminRoleToPortalRole(adminRole: string): string {
  switch (adminRole) {
    case "cpn":
    case "moderador_nacional":
    case "moderador_distrital":
    case "moderador_concelhio":
      return adminRole;
    default:
      return "militante";
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const valid = await verifySyncSignature(rawBody, request.headers.get("X-Sync-Signature"));
  if (!valid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const { eventId, eventType, payload } = JSON.parse(rawBody) as {
    eventId: string;
    eventType: "member_approved" | "member_revoked" | "member_transferred" | "member_role_changed" | "member_catalog_concelhia";
    payload:
      | MemberApprovedPayload
      | MemberRevokedPayload
      | MemberTransferredPayload
      | MemberRoleChangedPayload
      | { id: string; district_id: string; name: string };
  };

  const supabase = createSupabaseAdminClient();

  // Idempotência: se este evento já foi processado (reentrega do outbox
  // após um retry), não repete os efeitos.
  const { data: alreadyProcessed } = await supabase
    .from("sync_log")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, skipped: "duplicate" });
  }

  try {
    // Catálogo: a concelhia criada/renomeada no Admin passa a existir no Portal, com ou sem
    // moderador (sem isto, aprovar um militante dessa concelhia falhava a FK de portal_profiles).
    if (eventType === "member_catalog_concelhia") {
      const p = payload as { id: string; district_id: string; name: string };
      const { error: catalogError } = await supabase
        .from("concelhias")
        .upsert({ id: p.id, district_id: p.district_id, name: p.name }, { onConflict: "id" });
      if (catalogError) throw catalogError;
    } else if (eventType === "member_approved") {
      const p = payload as MemberApprovedPayload;
      const email = p.email.toLowerCase();

      const { data: updated, error: updateError } = await supabase
        .from("portal_profiles")
        .update({
          role: "militante",
          member_id: p.member_id,
          member_number: p.member_number,
          concelhia_id: p.concelhia_id,
          district_id: p.district_id,
          joined_member_at: p.joined_at,
        })
        .eq("email", email)
        .select("id");

      if (updateError) throw updateError;

      // Ainda não fez login no Portal — fica em espera até ao primeiro acesso.
      if (!updated || updated.length === 0) {
        const { error: stageError } = await supabase.from("pending_member_approvals").upsert({
          email,
          member_id: p.member_id,
          full_name: p.full_name,
          member_number: p.member_number,
          concelhia_id: p.concelhia_id,
          district_id: p.district_id,
          joined_member_at: p.joined_at,
        });
        if (stageError) throw stageError;
      }
    } else if (eventType === "member_revoked") {
      const p = payload as MemberRevokedPayload;
      const { error } = await supabase
        .from("portal_profiles")
        .update({ role: "simpatizante" })
        .eq("member_id", p.member_id);
      if (error) throw error;
    } else if (eventType === "member_transferred") {
      const p = payload as MemberTransferredPayload;

      const { data: concelhia } = await supabase
        .from("concelhias")
        .select("district_id")
        .eq("id", p.to_concelhia_id)
        .maybeSingle();

      const { error } = await supabase
        .from("portal_profiles")
        .update({ concelhia_id: p.to_concelhia_id, district_id: concelhia?.district_id ?? null })
        .eq("member_id", p.member_id);
      if (error) throw error;
    } else if (eventType === "member_role_changed") {
      const p = payload as MemberRoleChangedPayload;
      const email = p.email.toLowerCase();
      const portalRole = mapAdminRoleToPortalRole(p.admin_role);

      const { data: updated, error: updateError } = await supabase
        .from("portal_profiles")
        .update({ role: portalRole })
        .eq("member_id", p.member_id)
        .select("id");

      if (updateError) throw updateError;

      // Ainda não fez login: guarda a role pretendida para ser aplicada
      // no momento em que a conta for criada (ver getOrCreateProfile).
      if (!updated || updated.length === 0) {
        const { error: stageError } = await supabase
          .from("pending_member_approvals")
          .update({ role: portalRole })
          .eq("email", email);
        if (stageError) throw stageError;
      }
    } else {
      return NextResponse.json({ error: `Tipo de evento desconhecido: ${eventType}` }, { status: 400 });
    }

    await supabase.from("sync_log").insert({ event_id: eventId, event_type: eventType });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Erro ao processar evento de sync ${eventType} (${eventId}):`, err);
    // 500 → o outbox do Projeto A tenta reentregar com backoff exponencial.
    return NextResponse.json({ error: "Falha ao processar evento" }, { status: 500 });
  }
}
