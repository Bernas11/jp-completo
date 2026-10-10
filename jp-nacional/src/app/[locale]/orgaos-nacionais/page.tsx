import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";
import RevealGrid from "@/components/RevealGrid";
import { getMilitanciaClient } from "@/lib/supabase";

// Sem isto a página é gerada no build e nunca mais atualiza (conteúdo publicado no Admin não aparecia).
export const revalidate = 60;

type NationalBodyPosition = {
  body_key: string;
  title: string;
  national_body_members: { full_name: string; end_date: string | null }[];
};

const BODY_KEYS = ["cpn", "mcn", "disciplina", "jurisdicao", "mesa_conselho", "gabinete"] as const;

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("orgaos_page");
  return { title: t("title"), description: t("lede"), alternates: buildAlternates("orgaos-nacionais", locale) };
}

export default async function OrgaosNacionaisPage() {
  const t = await getTranslations("orgaos_page");

  const { data: positions } = await getMilitanciaClient()
    .from("national_body_positions")
    .select("body_key, title, display_order, national_body_members(full_name, end_date)")
    .order("display_order");

  const typedPositions = (positions ?? []) as NationalBodyPosition[];
  const orgaos = BODY_KEYS.map((key) => {
    const membros = typedPositions
      .filter((p) => p.body_key === key)
      .map((p) => ({
        cargo: p.title,
        nome: p.national_body_members.find((m) => m.end_date === null)?.full_name ?? null,
      }));
    return {
      key,
      title: t(`${key}_title`),
      body: t(`${key}_body`),
      membros,
    };
  });

  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow={t("eyebrow")} title={t("title")} lede={t("lede")} />
        <section className="py-20 bg-jp-blue-tint">
          <div className="mx-auto max-w-6xl px-6">
            <RevealGrid
              items={orgaos.map((o, i) => (
                <div key={o.key} className="bg-jp-blue-tint2 border border-jp-line rounded-2xl p-7 hover:-translate-y-1 hover:shadow-lg hover:shadow-jp-blue/10 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-jp-blue text-jp-yellow font-display text-sm flex items-center justify-center mb-5">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h2 className="font-headline text-lg text-jp-blue-deep mb-2">{o.title}</h2>
                  <p className="text-jp-ink-soft mb-5">{o.body}</p>
                  <div className="border-t border-jp-line pt-4 space-y-2">
                    {o.membros.length === 0 ? (
                      <p className="text-sm text-jp-ink-soft">Composição a anunciar.</p>
                    ) : (
                      o.membros.map((m) => (
                        <div key={m.cargo} className="flex justify-between text-sm">
                          <span className="text-jp-ink-soft">{m.cargo}</span>
                          <span className="text-jp-blue-deep font-medium">{m.nome ?? "—"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
