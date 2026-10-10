import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("goncalo_begonha_page");
  return { title: t("title"), description: t("meta_description"), alternates: buildAlternates("goncalo-begonha", locale) };
}

export default async function GoncaloBegonhaPage() {
  const t = await getTranslations("goncalo_begonha_page");
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
            <div className="bg-jp-blue-tint2 border border-jp-line rounded-2xl p-8 md:p-10 space-y-6">
              <p className="text-jp-ink leading-relaxed">
                Gonçalo Botelho Gomes Begonha nasceu a 14 de Setembro de 1980. No Porto, onde nasceu e cresceu, bem cedo se interessou pelo debate político, nunca escondendo convicções à direita.
                Estudou Engenharia Mecânica na Universidade do Porto. Destacado militante da Juventude Popular, militou na concelhia do Porto, tendo falecido enquanto seu Presidente.
                Foi também dirigente nacional, eleito duas vezes para a Comissão Política Nacional, nas liderança de João Almeida.
              </p>
              <p className="text-jp-ink leading-relaxed">
                Estudioso por natureza, fundamentava a fundo todos os temas e posições, com especial paixão pela Defesa Nacional. Chefiou o Gabinete de Defesa Nacional da JP e foi várias vezes chamado a pronunciar-se no Conselho Consultivo da NATO, sendo ainda estudante.
                A 4 de Julho de 2004, inesperadamente, um aneurisma cerebral privou a Juventude Popular de um dos seus mais promissores militantes.
              </p>
              <p className="text-jp-ink leading-relaxed">
                Para homenagear um militante de excelência que fazia do estudo e da paixão pelos livros, pelos argumentos e pelo debate político fundamentado e tolerante, marcas da sua personalidade e forma de estar na vida, a Juventude Popular decidiu dar o seu nome ao seu Gabinete de Estudos.
              </p>
              <p className="text-sm text-jp-ink-soft italic">
                Fonte: Gabinete de Estudos Gonçalo Begonha
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
