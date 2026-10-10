import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatsDashboard } from "@/components/estatisticas/stats-dashboard";
import { redirect } from "next/navigation";

export const revalidate = 300; // 5 minutos — dados estatísticos não precisam de ser real-time

export default async function EstatisticasPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [growth, approvalRate, concelhiaActivity, districtSummary] = await Promise.all([
    supabase.rpc("get_stats_member_growth"),
    supabase.rpc("get_stats_approval_rate"),
    supabase.rpc("get_stats_concelhia_activity"),
    supabase.rpc("get_stats_district_summary"),
  ]);

  if (growth.error || approvalRate.error || concelhiaActivity.error || districtSummary.error) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Não tens permissão para consultar as estatísticas, ou ocorreu um erro ao carregar os
        dados.
      </div>
    );
  }

  return (
    <StatsDashboard
      growth={growth.data ?? []}
      approvalRate={approvalRate.data ?? []}
      concelhiaActivity={concelhiaActivity.data ?? []}
      districtSummary={districtSummary.data ?? []}
    />
  );
}
