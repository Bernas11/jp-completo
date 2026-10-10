import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProductsPanel } from "@/components/loja/products-panel";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  // loja desligada só se NEXT_PUBLIC_SHOP_ENABLED=false
  if (process.env.NEXT_PUBLIC_SHOP_ENABLED === "false") notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, description, price_cents, stock, image_url, active")
    .order("name");

  return (
    <div>
      <PageHeader title="Loja — Produtos" description="Artigos disponíveis na Loja da Juventude Popular." />
      {error ? (
        <ErrorState
          title="Não foi possível carregar os produtos"
          description="Confirma que tens permissões para gerir esta área."
        />
      ) : (
        <ProductsPanel products={products ?? []} />
      )}
    </div>
  );
}
