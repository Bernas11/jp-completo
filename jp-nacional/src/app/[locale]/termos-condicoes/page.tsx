import { SHOP_ENABLED } from "@/lib/features";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/PageHero";

export async function generateMetadata() {
  return { title: "Termos e Condições — Juventude Popular" };
}

export default function TermosCondicoesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Legal"
          title="Termos e Condições"
          lede={SHOP_ENABLED ? "Condições de utilização deste site, incluindo o pedido de adesão e a loja online." : "Condições de utilização deste site, incluindo o pedido de adesão."}
        />
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 prose prose-sm [&_h2]:font-display [&_h2]:text-jp-blue [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
            <p className="text-jp-ink-soft text-xs">Esta versão em português é a única juridicamente vinculativa deste documento, independentemente do idioma em que estejas a ler o site.</p>

            <h2>1. Objeto</h2>
            <p>
              Este site é o site oficial da Juventude Popular, e permite consultar informação
              institucional e submeter um pedido de adesão{SHOP_ENABLED ? " e adquirir produtos na loja online" : ""}.
            </p>

            <h2>2. Pedido de adesão</h2>
            <p>
              Submeter o formulário de adesão constitui um pedido, não uma filiação automática. A
              tua filiação fica sujeita a aprovação pela estrutura competente da Juventude Popular,
              nos termos dos estatutos. Os dados que forneces devem ser verdadeiros e exatos.
            </p>

            {SHOP_ENABLED && (
              <>
            <h2>3. Loja online</h2>
            <ul>
              <li>Os preços apresentados incluem os impostos aplicáveis, salvo indicação em contrário.</li>
              <li>O pagamento é processado através de um prestador de serviços de pagamento externo; não guardamos os dados do teu cartão.</li>
              <li>As condições de entrega e devolução aplicáveis à encomenda são as indicadas no processo de checkout.</li>
            </ul>
              </>
            )}

            <h2>4. Utilização aceitável</h2>
            <p>
              Não podes usar este site para submeter informação falsa, tentar aceder sem autorização
              a áreas restritas (como o Portal do Militante ou a Área de Administração), ou para
              qualquer fim ilegal.
            </p>

            <h2>5. Propriedade intelectual</h2>
            <p>
              A marca, o logótipo e os conteúdos deste site são propriedade da Juventude Popular,
              salvo indicação em contrário, e não podem ser reproduzidos sem autorização.
            </p>

            <h2>6. Limitação de responsabilidade</h2>
            <p>
              Fazemos esforços razoáveis para manter a informação deste site atualizada e correta,
              mas não garantimos a ausência de erros ou a disponibilidade ininterrupta do serviço.
            </p>

            <h2>7. Alterações</h2>
            <p>Podemos atualizar estes termos periodicamente. A data da última atualização consta no topo desta página quando aplicável.</p>

            <h2>8. Contacto</h2>
            <p>Para questões sobre estes termos: sedenacional@juventudepopular.org.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
