import { defineRouting } from "next-intl/routing";

/**
 * As 24 línguas oficiais da União Europeia.
 * `pt` é a língua-fonte com conteúdo real e completo.
 * As restantes têm ficheiros de mensagens prontos (fallback para PT)
 * à espera de tradução — a estrutura já suporta todas sem
 * qualquer alteração de código quando a tradução chegar.
 */
export const locales = [
  "pt", // Português — fonte
  "en", // Inglês
  "fr", // Francês
  "de", // Alemão
  "es", // Espanhol
  "it", // Italiano
  "nl", // Neerlandês
  "sv", // Sueco
  "da", // Dinamarquês
  "fi", // Finlandês
  "el", // Grego
  "pl", // Polaco
  "cs", // Checo
  "sk", // Eslovaco
  "hu", // Húngaro
  "ro", // Romeno
  "bg", // Búlgaro
  "hr", // Croata
  "sl", // Esloveno
  "et", // Estónio
  "lv", // Letão
  "lt", // Lituano
  "mt", // Maltês
  "ga", // Irlandês
] as const;

export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "pt",
  localePrefix: "as-needed", // pt (fonte) fica sem prefixo, as outras usam /en, /fr, etc.
  localeDetection: false, // isto lowkey não vai ser aberto fora da tuga
});
