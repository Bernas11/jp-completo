import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RequestDetail } from "@/components/militancia/request-detail";

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: request } = await supabase
    .from("membership_requests")
    .select(
      "id, full_name, email, phone, birth_date, status, rejection_reason, created_at, citizen_card_storage_path, concelhia:concelhias(name, district:districts(name))"
    )
    .eq("id", id)
    .single();

  if (!request) notFound();

  return (
    <RequestDetail
      request={{
        id: request.id,
        fullName: request.full_name,
        email: request.email,
        phone: request.phone,
        birthDate: request.birth_date,
        status: request.status,
        rejectionReason: request.rejection_reason,
        createdAt: request.created_at,
        hasDocument: !!request.citizen_card_storage_path,
        concelhiaName: (request as any).concelhia?.name ?? "—",
        districtName: (request as any).concelhia?.district?.name ?? "—",
      }}
    />
  );
}
