import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import { Mail, MapPin, Phone } from "lucide-react";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("contactos_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("contactos", locale) };
}

export default async function ContactosPage() {
  const t = await getTranslations("contactos_page");
  const items = [
    { icon: MapPin, label: t("label_sede"), value: "Largo Adelino Amaro da Costa, 5, 1149-063 Lisboa" },
    { icon: Mail, label: t("label_email"), value: "sedenacional@juventudepopular.org" },
    { icon: Phone, label: t("label_telefone"), value: "+351 218 814 726" },
  ];
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-20 bg-jp-blue-tint">
          <div className="mx-auto max-w-3xl px-6 grid sm:grid-cols-3 gap-5">
            {items.map((i) => {
              const Icon = i.icon;
              return (
                <div key={i.label} className="bg-jp-blue-tint2 border border-jp-line rounded-2xl p-6 text-center min-w-0">
                  <Icon size={22} className="text-jp-blue mx-auto mb-3" />
                  <p className="font-display text-xs text-jp-blue mb-1">{i.label}</p>
                  <p className="text-jp-ink-soft text-sm break-words">{i.value}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
