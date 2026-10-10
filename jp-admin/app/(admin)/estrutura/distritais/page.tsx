import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DistrictModeratorsTable } from "@/components/estrutura/district-moderators-table";
import { ErrorState } from "@/components/shared/states";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function DistritaisPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: districts, error }, { data: people }] = await Promise.all([
    supabase.from("districts").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role, district_id, member:members(concelhia:concelhias(name, district_id))")
      .in("role", ["militante", "moderador_concelhio", "moderador_distrital"])
      .order("full_name"),
  ]);

  if (error) {
    console.error("[estrutura/distritais] falha ao carregar distritos:", error);
    return (
      <ErrorState
        title="Não foi possível carregar os distritos"
        description="Confirma que tens permissões para esta área. Se o problema persistir, contacta o suporte técnico."
      />
    );
  }

  // candidatos por distrito = militantes de concelhias desse distrito
  const candidatesByDistrict: Record<string, { id: string; full_name: string; concelhia: string }[]> = {};
  const currentByDistrict: Record<string, string | null> = {};

  for (const p of people ?? []) {
    const concelhia: any = one(one<any>(p.member as any)?.concelhia);
    if (concelhia?.district_id) {
      (candidatesByDistrict[concelhia.district_id] ??= []).push({
        id: p.id,
        full_name: p.full_name,
        concelhia: concelhia.name,
      });
    }
    if (p.role === "moderador_distrital" && p.district_id) {
      currentByDistrict[p.district_id] = p.id;
    }
  }

  return (
    <DistrictModeratorsTable
      rows={(districts ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        moderatorId: currentByDistrict[d.id] ?? null,
        candidates: candidatesByDistrict[d.id] ?? [],
      }))}
    />
  );
}
