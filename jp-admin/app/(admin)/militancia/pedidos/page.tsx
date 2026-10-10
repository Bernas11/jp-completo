import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { MembershipRequestsTable } from "@/components/militancia/membership-requests-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: requests, error } = await supabase
    .from("membership_requests")
    .select(
      "id, full_name, email, phone, created_at, concelhia:concelhias(name, district:districts(name))",
    )
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

  const rows = (requests ?? []).map((r: any) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    concelhiaName: r.concelhia?.name ?? "—",
    districtName: r.concelhia?.district?.name ?? "—",
    createdAt: r.created_at,
  }));

  return (
    <div>
      <PageHeader
        title="Pedidos de Adesão"
        description="Pedidos de novos militantes à espera de decisão."
      />

      {error ? (
        <ErrorState
          title="Não foi possível carregar os pedidos"
          description="Confirma que tens permissões para consultar esta área. Se o problema persistir, contacta o suporte técnico."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ainda não há pedidos de adesão pendentes"
          description="Assim que alguém submeter um pedido de adesão no site nacional, aparece aqui para revisão."
        />
      ) : (
        <MembershipRequestsTable data={rows} />
      )}
    </div>
  );
}
