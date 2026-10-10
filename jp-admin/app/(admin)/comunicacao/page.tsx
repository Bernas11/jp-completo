import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommunicationsPanel } from "@/components/comunicacao/communications-panel";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { isEmailConfigured } from "@/lib/email-queue";

export const dynamic = "force-dynamic";

export default async function ComunicacaoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: communications, error }, { data: districts }, { data: concelhias }, { count: pending }, { count: failed }] = await Promise.all([
    supabase
      .from("communications")
      .select(
        "id, title, sent_at, open_rate, segment_district_id, segment_concelhia_id, district:districts(name), concelhia:concelhias(name), created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("districts").select("id, name").order("name"),
    supabase.from("concelhias").select("id, name, district_id").order("name"),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "falhado"),
  ]);

  const rows = (communications ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    sentAt: c.sent_at,
    openRate: c.open_rate,
    scopeLabel: c.concelhia?.name
      ? `Concelhia: ${c.concelhia.name}`
      : c.district?.name
        ? `Distrito: ${c.district.name}`
        : "Nacional",
  }));

  return (
    <div>
      <PageHeader
        title="Comunicação"
        description="Envia comunicados por email aos militantes, para todos, para um distrito ou para uma concelhia. O histórico dos envios fica nesta página."
      />
      {error ? (
        <ErrorState
          title="Não foi possível carregar os comunicados"
          description="Confirma que tens permissões para esta área."
        />
      ) : (
        <CommunicationsPanel
          districts={districts ?? []}
          concelhias={concelhias ?? []}
          history={rows}
          queue={{ pending: pending ?? 0, failed: failed ?? 0, emailConfigured: isEmailConfigured() }}
        />
      )}
    </div>
  );
}
