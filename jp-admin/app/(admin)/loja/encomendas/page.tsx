import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrdersList } from "@/components/loja/orders-list";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function EncomendasPage() {
  // loja desligada só se NEXT_PUBLIC_SHOP_ENABLED=false
  if (process.env.NEXT_PUBLIC_SHOP_ENABLED === "false") notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, status, total_cents, shipping_address, created_at, profile:profiles(full_name, email), items:order_items(quantity, unit_price_cents, product:products(name))",
    )
    .order("created_at", { ascending: false });

  const rows = (orders ?? []).map((o: any) => ({
    id: o.id,
    status: o.status,
    totalCents: o.total_cents,
    customerName: o.profile?.full_name ?? o.shipping_address?.name ?? "—",
    customerEmail: o.profile?.email ?? o.shipping_address?.email ?? "—",
    createdAt: o.created_at,
    items: (o.items ?? []).map((i: any) => ({
      name: i.product?.name ?? "Produto removido",
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
    })),
  }));

  return (
    <div>
      <PageHeader title="Loja — Encomendas" description="Encomendas feitas na Loja da Juventude Popular." />
      {error ? (
        <ErrorState
          title="Não foi possível carregar as encomendas"
          description="Confirma que tens permissões para consultar esta área."
        />
      ) : (
        <OrdersList orders={rows} />
      )}
    </div>
  );
}
