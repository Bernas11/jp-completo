import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import AderirForm from "./AderirForm";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("aderir_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("aderir", locale) };
}

export default async function AderirPage() {
  const t = await getTranslations("aderir_page");

  return (
    <>
      <SiteHeader />
      <main className="bg-jp-blue-deep">
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-16">
          <div className="mx-auto max-w-2xl px-6">
            <AderirForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
