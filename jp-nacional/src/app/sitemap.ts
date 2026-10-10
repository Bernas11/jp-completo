import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SHOP_ENABLED } from "@/lib/features";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/seo";

const ROUTES = [
  "", "historia", "anteriores-lideres", "goncalo-begonha",
  "orgaos-nacionais", "concelhias", "documentacao", "carta-de-principios", "aderir",
  ...(SHOP_ENABLED ? ["marca-jp"] : []),
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_INDEXABLE) return [];

  return routing.locales.flatMap((locale) =>
    ROUTES.map((route) => ({
      url: locale === routing.defaultLocale ? `${SITE_URL}/${route}` : `${SITE_URL}/${locale}/${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
  );
}
