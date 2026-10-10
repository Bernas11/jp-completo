import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { notFound } from "next/navigation";
import { SHOP_ENABLED } from "@/lib/features";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import MarcaJPCatalog from "@/components/MarcaJPCatalog";
import { getMilitanciaClient } from "@/lib/supabase";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("marca_jp_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("marca-jp", locale) };
}

export default async function MarcaJPPage() {
  if (!SHOP_ENABLED) notFound(); // loja desligada (ver src/lib/features.ts)

  const t = await getTranslations("marca_jp_page");

  const { data } = await getMilitanciaClient()
    .from("products")
    .select("id, name, description, price_cents, images, category, active")
    .eq("active", true)
    .order("name");

  const produtos = (data ?? []).map((p) => ({
    id: p.id,
    nome: p.name,
    descricao: p.description ?? "",
    preco: p.price_cents,
    imagens: p.images ?? [],
    categoria: p.category,
    disponivel: p.active,
  }));

  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-20 bg-jp-blue-tint">
          <div className="mx-auto max-w-6xl px-6">
            <MarcaJPCatalog produtos={produtos} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
