import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { buildAlternates, OG_LOCALES } from "@/lib/seo";
import PageTransition from "@/components/PageTransition";
import Analytics from "@/components/Analytics";
import MotionProvider from "@/components/MotionProvider";
import { Archivo } from "next/font/google";
import "../globals.css";

// Fonte variável: 1 ficheiro cobre todos os pesos (antes eram 5 pesos × 2 estilos = 10 ficheiros
// pré-carregados no caminho crítico). O itálico (só usado em títulos .font-display) não é
// pré-carregado e só se descarrega quando aparece.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const archivoItalic = Archivo({
  subsets: ["latin"],
  style: "italic",
  variable: "--font-archivo-italic",
  display: "swap",
  preload: false,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  const description = t("lede");
  const title = { default: "Juventude Popular", template: "%s · Juventude Popular" };

  return {
    metadataBase: new URL("https://juventudepopular.pt"),
    title,
    description,
    alternates: buildAlternates("", locale),
    openGraph: {
      type: "website",
      locale: OG_LOCALES[locale] || "pt_PT",
      siteName: "Juventude Popular",
      title: "Juventude Popular",
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: "Juventude Popular",
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // NÃO ler headers()/cookies() aqui: obriga TODAS as páginas a renderizar dinamicamente
  // (sem cache de CDN, e os `revalidate` das páginas ficam sem efeito).

  return (
    <html lang={locale} className={`${archivo.variable} ${archivoItalic.variable}`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "PoliticalParty",
              name: "Juventude Popular",
              alternateName: "JP",
              url: "https://juventudepopular.pt",
              foundingDate: "1974",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Largo Adelino Amaro da Costa, 5",
                postalCode: "1149-063",
                addressLocality: "Lisboa",
                addressCountry: "PT",
              },
              sameAs: [
                "https://www.facebook.com/JuventudePopular/",
                "https://www.instagram.com/juventudepopular/",
              ],
            }),
          }}
        />
        <Analytics />
        <NextIntlClientProvider>
          <MotionProvider>
            <PageTransition>{children}</PageTransition>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
