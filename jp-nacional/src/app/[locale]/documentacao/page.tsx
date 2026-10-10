import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import DocumentacaoBrowser from "./DocumentacaoBrowser";
import { getPortalClient, getMilitanciaClient } from "@/lib/supabase";

// Sem isto a página é gerada no build e nunca mais atualiza (conteúdo publicado no Admin não aparecia).
export const revalidate = 60;

const PORTAL_BUCKET = "documentos-portal";
const PUBLIC_BUCKET = "documentos-publicos";

/* Mapa das categorias de "public_documents" (Admin/militância) para as
 * categorias já existentes nesta página — evita ter de acrescentar uma
 * 5ª categoria e chaves de tradução novas em 24 locales só para isto.
 * "resolucao" cabe em "Estatutos e Regulamentos" e "outro" cabe em
 * "Minutas e Documentos" (o catch-all já existente). */
const CATEGORIA_ADMIN_PARA_PAGINA: Record<string, string> = {
  convocatoria: "convocatorias",
  estatuto: "estatutos",
  resolucao: "estatutos",
  minuta: "minutas",
  outro: "minutas",
};

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("documentacao_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("documentacao", locale) };
}

export default async function DocumentacaoPage() {
  const t = await getTranslations("documentacao_page");

  const categorias = [
    { id: "convocatorias", label: t("cat_convocatorias") },
    { id: "estatutos", label: t("cat_estatutos") },
    { id: "minutas", label: t("cat_minutas") },
    { id: "premios", label: t("cat_premios") },
  ];

  const portal = getPortalClient();
  const militancia = getMilitanciaClient();

  /* CAUSA RAIZ do "carrega no Admin mas não aparece no site público":
   * esta página só lia "portal_documents" (jp-portal, documentos locais
   * de concelhia/distrito) — nunca "public_documents" (jp-admin, os
   * documentos nacionais geridos em /documentacao no Admin). São dois
   * projetos Supabase diferentes; um documento nacional publicado no
   * Admin nunca ia aparecer aqui só por existir lá. Agora lê os dois e
   * junta. */
  const [{ data: portalDocs }, { data: publicDocs }] = await Promise.all([
    portal
      .from("portal_documents")
      .select("title, category, storage_path, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    militancia
      .from("public_documents")
      .select("title, category, storage_path, created_at:published_at")
      .order("published_at", { ascending: false }),
  ]);

  const documentosPortal = (portalDocs ?? []).map((d) => ({
    titulo: d.title,
    categoria: d.category ?? "estatutos",
    data: d.created_at,
    ficheiro: /^https?:\/\//.test(d.storage_path)
      ? d.storage_path
      : portal.storage.from(PORTAL_BUCKET).getPublicUrl(d.storage_path).data.publicUrl,
  }));

  const documentosNacionais = (publicDocs ?? []).map((d) => ({
    titulo: d.title,
    categoria: CATEGORIA_ADMIN_PARA_PAGINA[d.category] ?? "minutas",
    data: d.created_at,
    ficheiro: militancia.storage.from(PUBLIC_BUCKET).getPublicUrl(d.storage_path).data.publicUrl,
  }));

  const documentos = [...documentosNacionais, ...documentosPortal].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );

  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-16 bg-jp-blue-tint">
          <div className="mx-auto max-w-5xl px-6">
            <DocumentacaoBrowser
              categorias={categorias}
              documentos={documentos}
              searchPlaceholder={t("search_placeholder")}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
