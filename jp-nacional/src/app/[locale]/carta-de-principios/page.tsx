import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import RevealGrid from "@/components/RevealGrid";
import { CARTA_ARTIGOS } from "@/lib/carta-artigos";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("carta_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("carta-de-principios", locale) };
}

export default async function CartaDePrincipiosPage() {
  const t = await getTranslations("carta_page");

  return (
    <>
      <SiteHeader />
      <main className="bg-jp-blue-deep">
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6">
            <RevealGrid
              columns="grid-cols-1"
              items={CARTA_ARTIGOS.map((texto, i) => {
                const numero = i + 1;
                const azul = numero % 2 !== 0; // ímpares a azul, pares a amarelo
                return (
                  <div key={numero} className="grid grid-cols-[52px_1fr] gap-6">
                    <div
                      className={
                        azul
                          ? "w-12 h-12 rounded-full bg-jp-blue text-white font-display text-sm flex items-center justify-center"
                          : "w-12 h-12 rounded-full bg-jp-yellow text-jp-blue-deep font-display text-sm flex items-center justify-center"
                      }
                    >
                      {numero}º
                    </div>
                    <p className="text-white/80 leading-relaxed pt-2.5">{texto}</p>
                  </div>
                );
              })}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
