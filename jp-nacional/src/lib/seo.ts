import { routing } from "@/i18n/routing";

/** Domínio estável do protótipo publicado; não aponta para o domínio oficial da JP. */
export const SITE_URL = "https://jp-nacional.vercel.app";

/** A demonstração não deve competir nos motores de busca com o site oficial. */
export const SITE_INDEXABLE = false;

/** Mapeamento código de língua → formato og:locale (xx_XX). */
export const OG_LOCALES: Record<string, string> = {
  pt: "pt_PT", en: "en_US", fr: "fr_FR", de: "de_DE", es: "es_ES",
  it: "it_IT", nl: "nl_NL", sv: "sv_SE", da: "da_DK", fi: "fi_FI",
  el: "el_GR", pl: "pl_PL", cs: "cs_CZ", sk: "sk_SK", hu: "hu_HU",
  ro: "ro_RO", bg: "bg_BG", hr: "hr_HR", sl: "sl_SI", et: "et_EE",
  lv: "lv_LV", lt: "lt_LT", mt: "mt_MT", ga: "ga_IE",
};

/**
 * Constrói o objeto `alternates` (canonical + hreflang) para uma página,
 * dado o seu caminho relativo (ex: "", "aderir", "historia").
 */
export function buildAlternates(path: string, currentLocale: string) {
  const suffix = path ? `/${path}` : "";
  const urlFor = (locale: string) =>
    locale === routing.defaultLocale ? `${SITE_URL}${suffix}` : `${SITE_URL}/${locale}${suffix}`;

  const languages: Record<string, string> = { "x-default": urlFor(routing.defaultLocale) };
  for (const locale of routing.locales) languages[locale] = urlFor(locale);

  return { canonical: urlFor(currentLocale), languages };
}
