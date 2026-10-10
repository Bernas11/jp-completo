import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { notFound } from "next/navigation";
import { SHOP_ENABLED } from "@/lib/features";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Link } from "@/i18n/navigation";
import { CheckCircle } from "lucide-react";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("sucesso_page");
  return { title: t("title"), alternates: buildAlternates("marca-jp/sucesso", locale) };
}

export default async function SucessoPage() {
  if (!SHOP_ENABLED) notFound(); // loja desligada (ver src/lib/features.ts)

  const t = await getTranslations("sucesso_page");
  return (
    <>
      <SiteHeader />
      <main className="bg-jp-blue-deep min-h-[70vh] flex items-center justify-center py-24">
        <div className="text-center px-6 max-w-lg">
          <CheckCircle size={56} className="text-jp-yellow mx-auto mb-6" />
          <h1 className="font-headline text-3xl text-white mb-4">{t("title")}</h1>
          <p className="text-white/70 mb-8">{t("message")}</p>
          <Link href="/marca-jp" className="inline-block bg-jp-yellow text-jp-blue-deep font-display text-sm px-7 py-3.5 rounded-full">
            {t("cta")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
