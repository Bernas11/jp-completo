import { notFound } from "next/navigation";
import { getMilitanciaClient } from "@/lib/supabase";
import { buildAlternates } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/* Página de detalhe para notícias/comunicados/atividades geridos em
 * /noticias no Admin (item 7). Só existe para conteúdo com "body"
 * preenchido — quando a atividade só tem link externo, o cartão na
 * homepage aponta diretamente para esse link, nunca para aqui. */
export const revalidate = 300;

async function getNoticia(slug: string) {
  const militancia = getMilitanciaClient();
  const { data } = await militancia
    .from("news")
    .select("title, summary, body, image_url, published_at, category")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const noticia = await getNoticia(slug);
  if (!noticia) return {};
  return {
    title: noticia.title,
    description: noticia.summary ?? undefined,
    alternates: buildAlternates(`noticias/${slug}`, locale),
  };
}

const CATEGORIA_LABEL: Record<string, string> = {
  noticia: "Notícia",
  comunicado: "Comunicado",
  atividade: "Atividade",
  outro: "Atividade",
};

export default async function NoticiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const noticia = await getNoticia(slug);

  if (!noticia || !noticia.body) {
    notFound();
  }

  const data = new Date(noticia.published_at).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-jp-blue-deep text-white py-20 border-b border-white/10">
          <div className="relative mx-auto max-w-3xl px-6">
            <p className="font-display text-xs text-jp-yellow mb-3">
              {CATEGORIA_LABEL[noticia.category] ?? "Atividade"} · {data}
            </p>
            <h1 className="font-headline text-3xl md:text-4xl">{noticia.title}</h1>
            {noticia.summary && <p className="text-white/70 text-lg mt-4">{noticia.summary}</p>}
          </div>
        </section>

        <section className="py-16 bg-jp-blue-tint">
          <div className="mx-auto max-w-3xl px-6">
            {noticia.image_url && (
              <div className="relative w-full h-64 md:h-96 mb-10 rounded-2xl overflow-hidden bg-jp-blue-tint2">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL arbitrária introduzida livremente no Admin, pode ser de qualquer domínio externo */}
                <img
                  src={noticia.image_url}
                  alt={noticia.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-jp-ink leading-relaxed">
              {noticia.body}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
