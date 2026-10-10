import { getTranslations, getLocale } from "next-intl/server";
import HeaderClient from "./HeaderClient";
import { SHOP_ENABLED } from "@/lib/features";

export default async function SiteHeader() {
  const t = await getTranslations();
  const locale = await getLocale();

  const items = [
    {
      label: "JP",
      href: "/historia",
      children: [
        { label: t("footer.historia"), href: "/historia" },
        { label: t("nav.causas"), href: "/#pilares" },
        { label: t("nav.anteriores_lideres"), href: "/anteriores-lideres" },
        { label: "Gonçalo Begonha", href: "/goncalo-begonha" },
        ...(SHOP_ENABLED ? [{ label: "Marca JP", href: "/marca-jp" }] : []),
      ],
    },
    {
      label: t("nav.orgaos"),
      href: "/orgaos-nacionais",
    },
    { label: t("nav.concelhias"), href: "/concelhias" },
    { label: t("nav.atividades"), href: "/#atividades" },
    { label: t("nav.documentacao"), href: "/documentacao" },
    { label: t("nav.contactos"), href: "/contactos" },
  ];

  return <HeaderClient items={items} ctaLabel={t("nav.aderir")} locale={locale} />;
}
