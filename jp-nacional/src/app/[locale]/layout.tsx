import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { buildAlternates, OG_LOCALES, SITE_INDEXABLE, SITE_URL } from "@/lib/seo";
import PageTransition from "@/components/PageTransition";
import Analytics from "@/components/Analytics";
import MotionProvider from "@/components/MotionProvider";
import { Archivo } from "next/font/google";
import "../globals.css";

const SITE_DESCRIPTION = "Protótipo de portefólio não oficial da Juventude Popular. Demonstra um site nacional; não introduzas dados reais.";

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
  const description = SITE_DESCRIPTION;
  const title = { default: "Juventude Popular (protótipo)", template: "%s · Juventude Popular (protótipo)" };

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: buildAlternates("", locale),
    openGraph: {
      type: "website",
      locale: OG_LOCALES[locale] || "pt_PT",
      siteName: "JP-Completo — protótipo não oficial",
      title: "Juventude Popular (protótipo)",
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: "Juventude Popular (protótipo)",
      description,
    },
    robots: { index: SITE_INDEXABLE, follow: true },
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
        <aside
          role="note"
          aria-label="Aviso sobre o estado do site"
          className="fixed inset-x-0 top-0 z-[60] bg-jp-yellow px-3 py-1.5 text-center text-[10px] font-semibold tracking-wide text-jp-blue-deep sm:text-xs"
        >
          Protótipo de portefólio não oficial · Não introduzas dados reais
        </aside>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "JP-Completo — protótipo não oficial",
              url: SITE_URL,
              description: SITE_DESCRIPTION,
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
