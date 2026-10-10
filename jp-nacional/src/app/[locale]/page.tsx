import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Hero from "@/components/Hero";
import PilaresSection from "@/components/PilaresSection";
import Timeline from "@/components/Timeline";
import Trust from "@/components/Trust";
import VozesDaCasa from "@/components/VozesDaCasa";
import AtividadesSection from "@/components/AtividadesSection";
import MunicipiosMap from "@/components/MunicipiosMap";
import { getMunicipiosSvgPaths, MUNICIPIOS_VIEWBOX } from "@/lib/municipios-map";
import { getMilitanciaClient } from "@/lib/supabase";
import { MOTE_ATUAL } from "@/lib/citacoes";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

type ConcelhiaAtiva = { name: string; district: { name: string }[] };

// Notícias e eventos públicos vêm da BD do JP-Admin; revalida periodicamente
// em vez de renderizar 100% dinâmico (que anularia o trabalho de performance
// mobile) ou cachear indefinidamente (que esconderia conteúdo novo).
export const revalidate = 300;

export default async function HomePage() {
  const militancia = getMilitanciaClient();
  const [{ data: concelhiasAtivas }, { data: newsRows }, { data: eventRows }] = await Promise.all([
    militancia.from("concelhias").select("name, district:districts(name)").eq("active", true),
    militancia
      .from("news")
      .select("title, published_at, slug, summary, image_url, external_link, body")
      .eq("status", "publicado")
      .order("published_at", { ascending: false })
      .limit(6),
    militancia
      .from("events")
      .select("title, starts_at, external_link")
      .eq("is_public", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(6),
  ]);
  const t = await getTranslations();

  const noticias = (newsRows ?? []).map((n) => ({
    titulo: n.title,
    data: new Date(n.published_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }),
    imagemUrl: n.image_url ?? undefined,
    href: n.body ? `/noticias/${n.slug}` : n.external_link ?? undefined,
  }));
  const eventos = (eventRows ?? []).map((e) => ({
    titulo: e.title,
    data: new Date(e.starts_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }),
    href: e.external_link ?? undefined,
  }));

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-jp-yellow focus:text-jp-blue-deep focus:px-5 focus:py-3 focus:font-display focus:text-sm"
      >
        {t("a11y_skip_link")}
      </a>

      <SiteHeader />

      <main id="conteudo">
        <Hero
          copy={{
            eyebrow: t("hero.eyebrow"),
            title: t("hero.title"),
            lede: t("hero.lede"),
            ctaPrimary: t("hero.cta_primary"),
            ctaSecondary: t("hero.cta_secondary"),
            statLabels: [
              t("hero.stat_founded_label"),
              t("hero.stat_concelhias_label"),
              t("hero.stat_congress_label"),
              t("hero.stat_pilares_label"),
            ],
            marqueeItems: t.raw("marquee") as string[],
          }}
        />

        <PilaresSection
          eyebrow={t("pilares.eyebrow")}
          title={t("pilares.title")}
          lede={t("pilares.lede")}
          items={[
            { title: t("pilares.democracia_crista_title"), body: t("pilares.democracia_crista_body") },
            { title: t("pilares.conservadorismo_title"), body: t("pilares.conservadorismo_body") },
            { title: t("pilares.liberalismo_title"), body: t("pilares.liberalismo_body") },
          ]}
        />

        <Timeline
          eyebrow={t("timeline.eyebrow")}
          heading={t("timeline.heading")}
          marcos={t.raw("timeline.marcos") as { ano: string; title: string; text: string }[]}
        />
        <Trust
          eyebrow={t("trust.eyebrow")}
          heading={t("trust.heading")}
          lede={t("trust.lede")}
          items={t.raw("trust.items") as { title: string; text: string }[]}
        />

        {/* Concelhias */}
        <section id="concelhias" className="relative py-28 bg-jp-blue-deep text-white overflow-hidden">
          <div
            className="absolute -left-24 top-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full opacity-20 blur-[100px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #FDE021, transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-14 items-center">
            <div>
              <p className="font-display text-xs text-jp-yellow mb-3">{t("concelhias.eyebrow")}</p>
              <h2 className="font-headline text-3xl md:text-4xl mb-4">{t("concelhias.title")}</h2>
              <p className="text-white/65 text-lg mb-8 max-w-[42ch]">{t("concelhias.lede")}</p>
              <Link
                href="/concelhias"
                className="group font-display text-sm inline-flex items-center gap-2 bg-jp-yellow text-jp-blue-deep pl-7 pr-6 py-3.5 rounded-full hover:shadow-[0_0_32px_4px_rgba(253,224,33,0.3)] transition-shadow"
              >
                {t("concelhias.cta")}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <MunicipiosMap
              paths={getMunicipiosSvgPaths()}
              viewBox={MUNICIPIOS_VIEWBOX}
              ativos={((concelhiasAtivas ?? []) as ConcelhiaAtiva[]).map((c) => ({ concelho: c.name, distrito: c.district[0]?.name ?? "" }))}
            />
          </div>
        </section>

        <AtividadesSection
          eyebrow={t("atividades.eyebrow")}
          title={t("atividades.title")}
          lede={t("atividades.lede")}
          noticias={noticias}
          eventos={eventos}
          emptyNoticias={t("atividades.empty_noticias")}
          emptyEventos={t("atividades.empty_eventos")}
        />

        <VozesDaCasa />

        {/* Juntar */}
        <section id="juntar" className="py-28 bg-jp-blue-tint">
          <div className="mx-auto max-w-6xl px-6">
            <div className="relative bg-jp-blue-deep rounded-3xl p-12 md:p-20 text-white text-center overflow-hidden shadow-2xl shadow-jp-blue-deep/40">
              <div
                className="absolute -left-20 -top-20 w-[400px] h-[400px] rounded-full opacity-20 blur-[90px] pointer-events-none"
                style={{ background: "radial-gradient(circle, #FDE021, transparent 70%)" }}
                aria-hidden="true"
              />
              <div className="absolute left-10 top-10 w-8 h-8 bg-jp-yellow rotate-45 opacity-60 hidden md:block" aria-hidden="true" />
              <div className="relative">
                <p className="font-display text-xs text-jp-yellow mb-4">{MOTE_ATUAL.autor} · {MOTE_ATUAL.cargo}</p>
                <h2 className="font-headline text-3xl md:text-5xl mb-5">{MOTE_ATUAL.texto}</h2>
                <p className="text-white/70 text-lg mb-9 max-w-[48ch] mx-auto">{t("juntar.lede")}</p>
                <Link
                  href="/aderir"
                  className="group font-display text-sm inline-flex items-center gap-2 bg-jp-yellow text-jp-blue-deep pl-8 pr-7 py-4 rounded-full hover:shadow-[0_0_40px_6px_rgba(253,224,33,0.35)] transition-shadow"
                >
                  {t("juntar.cta")}
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
