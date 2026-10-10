import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";

export async function generateMetadata() {
  return { title: "Política de Cookies — Juventude Popular" };
}

export default function PoliticaCookiesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Legal"
          title="Política de Cookies"
          lede="Que cookies este site usa e como os podes gerir."
        />
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 prose prose-sm [&_h2]:font-display [&_h2]:text-jp-blue [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
            <p className="text-jp-ink-soft text-xs">Esta versão em português é a única juridicamente vinculativa deste documento, independentemente do idioma em que estejas a ler o site.</p>

            <h2>1. Cookies estritamente necessários</h2>
            <p>
              Usamos cookies técnicos indispensáveis ao funcionamento do site — por exemplo, para
              lembrar a tua escolha de idioma e para processar formulários (adesão, contacto,
              encomendas). Estes cookies não podem ser desativados sem afetar o funcionamento
              básico do site.
            </p>

            <h2>2. Cookies de checkout e loja</h2>
            <p>
              Ao fazer uma encomenda na loja, o nosso processador de pagamentos pode definir
              cookies próprios necessários para processar a transação em segurança.
            </p>

            <h2>3. Cookies de terceiros / redes sociais</h2>
            <p>
              As ligações às nossas redes sociais no rodapé do site abrem os respetivos serviços
              externos, que têm as suas próprias políticas de cookies — não temos controlo sobre
              elas.
            </p>

            <h2>4. Cookies de analítica</h2>
            <p>
              [Preencher: se este site usar alguma ferramenta de analítica de visitas — Google
              Analytics, Plausible, etc. — tem de ser identificada aqui, e pode ser necessário um
              banner de consentimento antes de a ativar, dependendo do tipo de cookie que usar.]
            </p>

            <h2>5. Como gerir cookies</h2>
            <p>
              Podes gerir ou eliminar cookies nas definições do teu browser a qualquer momento.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
