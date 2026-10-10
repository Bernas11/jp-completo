import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PortalProfile = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  member_number: string | null;
  concelhia_id: string | null;
};

const SELECT_FIELDS = "id, email, display_name, role, member_number, concelhia_id";

function deriveDisplayName(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "Novo membro";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/**
 * Garante que existe uma linha em `portal_profiles` para o utilizador
 * autenticado.
 *
 * Antes de criar como simpatizante, verifica se o Projeto A já aprovou
 * este email como militante entretanto (ficou em `pending_member_approvals`
 * porque o email ainda não tinha feito login aqui) — se sim, a linha já
 * nasce como militante, com o número de militante, concelhia e distrito
 * corretos.
 *
 * Sem isto, um simpatizante que nunca tenha sido sincronizado a partir do
 * Projeto A ficava sem qualquer perfil — e o resto do Portal (saudação,
 * página de perfil, server actions) partia do princípio de que o perfil
 * já existia, produzindo estados confusos (nome a mostrar "Militante"/
 * "Utilizador" como placeholder, "Perfil não encontrado", ações a falhar).
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
): Promise<PortalProfile | null> {
  const { data: existing } = await supabase
    .from("portal_profiles")
    .select(SELECT_FIELDS)
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as PortalProfile;

  const email = (user.email ?? `${user.id}@sem-email.jp`).toLowerCase();

  // A tabela de staging só é legível pelo service role (RLS não dá acesso
  // a utilizadores autenticados), por isso usa-se o cliente admin aqui.
  const admin = createSupabaseAdminClient();
  const { data: pending } = await admin
    .from("pending_member_approvals")
    .select("member_id, full_name, member_number, concelhia_id, district_id, joined_member_at, role")
    .eq("email", email)
    .maybeSingle();

  const newProfile: Record<string, unknown> = pending
    ? {
        id: user.id,
        email,
        display_name: pending.full_name,
        role: pending.role, // "militante" por omissão, ou já promovido a moderador/CPN no JP-Admin
        member_id: pending.member_id,
        member_number: pending.member_number,
        concelhia_id: pending.concelhia_id,
        district_id: pending.district_id,
        joined_member_at: pending.joined_member_at,
      }
    : { id: user.id, email, display_name: deriveDisplayName(email), role: "simpatizante" };

  const { data: created, error } = await supabase
    .from("portal_profiles")
    .insert(newProfile)
    .select(SELECT_FIELDS)
    .single();

  if (!error) {
    if (pending) await admin.from("pending_member_approvals").delete().eq("email", email);
    return created as PortalProfile;
  }

  // Condição de corrida: outro pedido em paralelo (ex.: layout + página)
  // já criou o perfil entretanto — vai buscar o que ficou criado.
  console.error("getOrCreateProfile: falha ao criar perfil, a tentar reler", error);
  const { data: retry } = await supabase
    .from("portal_profiles")
    .select(SELECT_FIELDS)
    .eq("id", user.id)
    .maybeSingle();

  return (retry as PortalProfile) ?? null;
}
