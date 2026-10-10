import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import RevealGrid from "@/components/RevealGrid";
import LiderAvatar from "@/components/LiderAvatar";
import { getMilitanciaClient } from "@/lib/supabase";

// Sem isto a página é gerada no build e nunca mais atualiza (conteúdo publicado no Admin não aparecia).
export const revalidate = 60;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("anteriores_lideres_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("anteriores-lideres", locale) };
}

export default async function AnterioresLideresPage() {
  const t = await getTranslations("anteriores_lideres_page");
  const militancia = getMilitanciaClient();

  const [{ data: anteriores }, { data: atual }] = await Promise.all([
    militancia
      .from("previous_leaders")
      .select("full_name, photo_url, start_date, end_date")
      .order("display_order"),
    militancia
      .from("national_body_members")
      .select("full_name, photo_url, start_date, position:national_body_positions!inner(title, body_key)")
      .eq("position.body_key", "cpn")
      .eq("position.title", "Presidente")
      .is("end_date", null)
      .maybeSingle(),
  ]);

  const lideres = [
    ...(anteriores ?? []).map((l) => ({
      nome: l.full_name,
      foto: l.photo_url,
      inicio: new Date(l.start_date).getFullYear(),
      fim: String(new Date(l.end_date).getFullYear()),
      atual: false,
    })),
    ...(atual
      ? [
          {
            nome: atual.full_name,
            foto: atual.photo_url,
            inicio: new Date(atual.start_date).getFullYear(),
            fim: "presente",
            atual: true,
          },
        ]
      : []),
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-20 bg-jp-blue-tint">
          <div className="mx-auto max-w-5xl px-6">
            <RevealGrid
              columns="sm:grid-cols-2 md:grid-cols-3"
              items={lideres.map((l) => (
                <div key={l.nome} className={`bg-jp-blue-tint2 border rounded-2xl p-6 text-center ${l.atual ? "border-jp-yellow border-2" : "border-jp-line"}`}>
                  <div className="w-20 h-20 rounded-full bg-jp-blue mx-auto mb-4 overflow-hidden relative">
                    <LiderAvatar src={l.foto ?? ""} alt={l.nome} />
                  </div>
                  {l.atual && <span className="inline-block bg-jp-yellow text-jp-blue-deep text-[10px] font-display px-2 py-0.5 rounded-full mb-2">{t("atual")}</span>}
                  <h2 className="font-headline text-base text-jp-blue-deep mb-1">{l.nome}</h2>
                  <p className="text-xs text-jp-ink-soft">{l.inicio} — {l.fim === "presente" ? t("presente") : l.fim}</p>
                </div>
              ))}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
