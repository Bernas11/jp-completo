import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SHOP_ENABLED } from "@/lib/features";

const ROUTES = [
  "", "historia", "anteriores-lideres", "goncalo-begonha",
  "orgaos-nacionais", "concelhias", "documentacao", "carta-de-principios", "aderir",
  ...(SHOP_ENABLED ? ["marca-jp"] : []),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://juventudepopular.pt";
  return routing.locales.flatMap((locale) =>
    ROUTES.map((route) => ({
      url: locale === routing.defaultLocale ? `${base}/${route}` : `${base}/${locale}/${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    }))
  );
}
