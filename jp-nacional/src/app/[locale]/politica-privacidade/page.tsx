import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";

export async function generateMetadata() {
  return { title: "Política de Privacidade — Juventude Popular" };
}

export default function PoliticaPrivacidadePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Legal"
          title="Política de Privacidade"
          lede="Como tratamos os teus dados pessoais quando visitas este site ou pedes para aderir à Juventude Popular."
        />
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 prose prose-sm [&_h2]:font-display [&_h2]:text-jp-blue [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
            <p className="text-jp-ink-soft text-xs">Esta versão em português é a única juridicamente vinculativa deste documento, independentemente do idioma em que estejas a ler o site.</p>

            <h2>1. Responsável pelo tratamento</h2>
            <p>
              Juventude Popular, com sede em Largo Adelino Amaro da Costa, 5, 1149-063 Lisboa, é a
              entidade responsável pelo tratamento dos dados pessoais recolhidos através deste
              site. Contacto: sedenacional@juventudepopular.org.
            </p>

            <h2>2. Que dados recolhemos</h2>
            <ul>
              <li>Dados que preenches nos formulários de adesão (nome, email, contacto, morada, concelho).</li>
              <li>Dados que preenches no formulário de contacto ou na subscrição da newsletter.</li>
              <li>Dados de encomendas na loja (nome, morada de entrega, dados de pagamento — processados pelo nosso processador de pagamentos).</li>
              <li>Dados de navegação estritamente necessários ao funcionamento do site.</li>
            </ul>

            <h2>3. Para que usamos os teus dados</h2>
            <ul>
              <li>Processar o teu pedido de adesão à Juventude Popular e criar o teu registo de militante.</li>
              <li>Responder a pedidos de contacto.</li>
              <li>Enviar a newsletter, caso te tenhas inscrito (podes cancelar a qualquer momento).</li>
              <li>Processar e entregar encomendas da loja.</li>
            </ul>

            <h2>4. Com quem partilhamos dados</h2>
            <p>
              Os dados de adesão são partilhados internamente com a estrutura da Juventude Popular
              responsável pela tua concelhia/distrito. Os dados de encomendas são partilhados com o
              processador de pagamentos e com o serviço de transporte, apenas na medida necessária
              para processar a tua encomenda.
            </p>

            <h2>5. Quanto tempo guardamos os dados</h2>
            <p>
              Os dados de adesão são conservados enquanto durar a tua filiação, e nos termos
              exigidos pela legislação sobre partidos políticos. Os dados de contacto/newsletter são
              conservados até pedires o cancelamento.
            </p>

            <h2>6. Os teus direitos</h2>
            <p>
              Podes exercer os direitos de acesso, retificação, apagamento, limitação,
              portabilidade e oposição, contactando sedenacional@juventudepopular.org. Tens
              também o direito de apresentar reclamação junto da Comissão Nacional de Proteção de
              Dados (CNPD).
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
