import type { SupabaseClient } from "@supabase/supabase-js";
import { isModeratorRole } from "@/lib/roles";
import type { ModeratorContext } from "@/components/moderacao/scope-picker";

const NATIONAL_ROLES = ["cpn", "moderador_nacional"];

export type ModeratorScopeContext =
  | { canModerate: false }
  | {
      canModerate: true;
      moderator: ModeratorContext;
      districts: { id: string; name: string }[];
      concelhias: { id: string; name: string }[];
    };

export async function getModeratorScopeContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ModeratorScopeContext> {
  const { data: profile, error } = await supabase
    .from("portal_profiles")
    .select(
      `role,
       district:districts!portal_profiles_district_id_fkey(id, name),
       concelhia:concelhias!portal_profiles_concelhia_id_fkey(id, name)`,
    )
    .eq("id", userId)
    .maybeSingle();

  // Se a tabela `districts` ou a FK não existirem no projeto Supabase atual,
  // o embed acima falha — cai para uma leitura simples (sem nomes) para não
  // esconder a moderação por completo a quem tem direito a ela.
  let role = profile?.role as string | undefined;
  let district = profile?.district as any;
  let concelhia = profile?.concelhia as any;

  if (error) {
    console.error("getModeratorScopeContext: embed falhou, a tentar leitura simples", error);
    const { data: fallback } = await supabase
      .from("portal_profiles")
      .select("role, district_id, concelhia_id")
      .eq("id", userId)
      .maybeSingle();
    role = fallback?.role;
    district = fallback?.district_id ? { id: fallback.district_id, name: null } : null;
    concelhia = fallback?.concelhia_id ? { id: fallback.concelhia_id, name: null } : null;
  }

  if (!role || !isModeratorRole(role)) {
    return { canModerate: false };
  }

  const moderator: ModeratorContext = {
    role,
    ownDistrictId: district?.id ?? null,
    ownDistrictName: district?.name ?? null,
    ownConcelhiaId: concelhia?.id ?? null,
    ownConcelhiaName: concelhia?.name ?? null,
  };

  // Só o staff nacional precisa das listas completas — os restantes
  // moderadores ficam presos à sua própria concelhia/distrito.
  if (!NATIONAL_ROLES.includes(role)) {
    return { canModerate: true, moderator, districts: [], concelhias: [] };
  }

  const [{ data: districts }, { data: concelhias }] = await Promise.all([
    supabase.from("districts").select("id, name").order("name"),
    supabase.from("concelhias").select("id, name").order("name"),
  ]);

  return {
    canModerate: true,
    moderator,
    districts: districts ?? [],
    concelhias: concelhias ?? [],
  };
}
