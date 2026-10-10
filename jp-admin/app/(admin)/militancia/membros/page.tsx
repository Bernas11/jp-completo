import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MembersTable } from "@/components/militancia/members-table";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function MembrosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: members, error }, { data: concelhias }] = await Promise.all([
    supabase
      .from("members")
      .select(
        "id, member_number, status, joined_at, profile_id, concelhia_id, profile:profiles(full_name, email), concelhia:concelhias(name)",
      )
      .order("member_number", { ascending: false }),
    supabase.from("concelhias").select("id, name").order("name"),
  ]);

  if (error) {
    console.error("[militancia/membros] falha ao carregar militantes:", error);
    return (
      <ErrorState
        title="Não foi possível carregar os militantes"
        description="Tenta novamente dentro de instantes ou contacta o suporte técnico."
      />
    );
  }

  const rows = (members ?? []).map((m: any) => ({
    id: m.id,
    member_number: m.member_number,
    status: m.status,
    joined_at: m.joined_at,
    concelhia_id: m.concelhia_id,
    full_name: m.profile?.full_name ?? "—",
    email: m.profile?.email ?? "—",
    concelhia_name: m.concelhia?.name ?? "—",
  }));

  return (
    <div>
      <PageHeader
        title="Militantes"
        description="Militantes com filiação aprovada. Para pedidos por rever, vai a Pedidos de Adesão."
      />
      <MembersTable members={rows} concelhias={concelhias ?? []} />
    </div>
  );
}
