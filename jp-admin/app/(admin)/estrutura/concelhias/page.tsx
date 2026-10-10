import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConcelhiasTable } from "@/components/estrutura/concelhias-table";
import { ErrorState } from "@/components/shared/states";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConcelhiasPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: concelhias, error: concelhiasError }, { data: districts }, { data: moderators }] =
    await Promise.all([
      supabase
        .from("concelhias")
        .select(
          "id, name, active, district_id, district:districts(name), moderator_profile_id, moderator:profiles!concelhias_moderator_profile_id_profiles_id_fk(full_name), members(count)",
        )
        .order("name"),
      supabase.from("districts").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["militante", "moderador_concelhio"])
        .order("full_name"),
    ]);

  if (concelhiasError) {
    console.error("[estrutura/concelhias] falha ao carregar concelhias:", concelhiasError);
    return (
      <ErrorState
        title="Não foi possível carregar a estrutura de concelhias"
        description="Confirma que tens permissões para esta área. Se o problema persistir, contacta o suporte técnico."
      />
    );
  }

  const rows = (concelhias ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    active: c.active,
    district_id: c.district_id,
    district_name: c.district?.name ?? "",
    moderator_profile_id: c.moderator_profile_id,
    moderator_name: c.moderator?.full_name ?? null,
    active_members: c.members?.[0]?.count ?? 0,
  }));

  return (
    <ConcelhiasTable
      concelhias={rows}
      districts={districts ?? []}
      moderatorCandidates={moderators ?? []}
    />
  );
}
