import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeadersPanel } from "@/components/estrutura/leaders-panel";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function LideresPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: leaders, error } = await supabase
    .from("previous_leaders")
    .select("id, full_name, photo_url, start_date, end_date, display_order")
    .order("display_order");

  return (
    <div>
      <PageHeader
        title="Líderes Anteriores"
        description="Histórico de antigos dirigentes nacionais da Juventude Popular."
      />
      {error ? (
        <ErrorState
          title="Não foi possível carregar os líderes"
          description="Confirma que tens permissões para esta área."
        />
      ) : (
        <LeadersPanel leaders={leaders ?? []} />
      )}
    </div>
  );
}
