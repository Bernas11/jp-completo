import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import RevealGrid from "@/components/RevealGrid";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("historia_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("historia", locale) };
}

export default async function HistoriaPage() {
  const t = await getTranslations("historia_page");
  const marcos = t.raw("marcos") as { titulo: string; texto: string }[];

  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow={t("eyebrow")}
          title={t("title")}
          lede={t("lede")}
        />
        <section className="py-20 bg-jp-blue-tint">
          <div className="mx-auto max-w-3xl px-6">
            <RevealGrid
              columns="grid-cols-1"
              items={marcos.map((m) => (
                <div key={m.titulo} className="bg-jp-blue-tint2 border border-jp-line rounded-2xl p-7">
                  <h2 className="font-headline text-xl text-jp-blue-deep mb-2">{m.titulo}</h2>
                  <p className="text-jp-ink-soft leading-relaxed">{m.texto}</p>
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
