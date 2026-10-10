import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import MunicipiosMap from "@/components/MunicipiosMap";
import { getMunicipiosSvgPaths, MUNICIPIOS_VIEWBOX } from "@/lib/municipios-map";
import ConcelhiasSearch from "@/components/ConcelhiasSearch";
import { getMilitanciaClient } from "@/lib/supabase";

// Sem isto a página é gerada no build e nunca mais atualiza (conteúdo publicado no Admin não aparecia).
export const revalidate = 60;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("concelhias_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("concelhias", locale) };
}

export default async function ConcelhiasPage() {
  const t = await getTranslations("concelhias_page");

  const { data } = await getMilitanciaClient()
    .from("concelhias")
    .select("name, slug, contact_email, instagram_handle, district:districts(name)")
    .eq("active", true)
    .order("name");

  const concelhias = (data ?? []).map((c: any) => ({
    nome: c.name,
    distrito: c.district?.name ?? "",
    email: c.contact_email,
    instagram: c.instagram_handle as string | null,
  }));

  const municipiosPaths = getMunicipiosSvgPaths();

  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />

        <section className="py-16 bg-jp-blue-tint">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12">
              <MunicipiosMap
                paths={municipiosPaths}
                viewBox={MUNICIPIOS_VIEWBOX}
                ativos={concelhias.map((c) => ({ concelho: c.nome, distrito: c.distrito }))}
              />
            </div>

            <ConcelhiasSearch
              concelhias={concelhias}
              searchPlaceholder={t("search_placeholder")}
              searchClearLabel={t("search_clear")}
              noResultsTitle={t("search_no_results_title")}
              noResultsHint={t("search_no_results_hint")}
              emptyInstagramLabel={t("empty_instagram")}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
