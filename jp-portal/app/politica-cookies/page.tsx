import { LegalPage } from "@/components/legal/legal-page";

export default function PoliticaCookiesPage() {
  return (
    <LegalPage title="Política de Cookies" updatedAt="[preencher antes de publicar]">
      <p>
        Esta página explica que cookies e tecnologias semelhantes o Portal da Juventude Popular
        utiliza.
      </p>

      <h2>1. Cookies estritamente necessários</h2>
      <p>
        Usamos cookies de sessão para manteres a tua sessão iniciada depois de entrares com o
        Magic Link. Estes cookies são essenciais para o funcionamento do Portal e não podem ser
        desativados sem impedir o acesso à tua conta.
      </p>

      <h2>2. Notificações push</h2>
      <p>
        Se ativares as notificações push nas Definições do teu perfil, o browser guarda uma
        subscrição local (não é um cookie tradicional, mas cumpre função semelhante) para nos
        permitir enviar-te avisos. Podes desativar isto a qualquer momento na página de Perfil.
      </p>

      <h2>3. Cookies de terceiros</h2>
      <p>
        Este Portal não usa cookies de publicidade nem de redes sociais. [Confirmar/atualizar caso
        seja adicionada alguma ferramenta de analítica no futuro — se isso acontecer, esta secção
        tem de ser atualizada e pode ser necessário um banner de consentimento.]
      </p>

      <h2>4. Como gerir cookies</h2>
      <p>
        Podes gerir ou eliminar cookies através das definições do teu browser. Como os cookies
        deste Portal são estritamente necessários para autenticação, bloqueá-los impede o acesso à
        tua conta.
      </p>
    </LegalPage>
  );
}
