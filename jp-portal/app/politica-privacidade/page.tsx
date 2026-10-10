import { LegalPage } from "@/components/legal/legal-page";

export default function PoliticaPrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="[preencher antes de publicar]">
      <p>
        Esta Política de Privacidade explica como o Portal da Juventude Popular ("Portal", "nós")
        trata os dados pessoais dos seus utilizadores, em cumprimento do Regulamento Geral sobre a
        Proteção de Dados (RGPD) e da legislação nacional aplicável.
      </p>

      <p className="rounded-lg border border-dashed border-jp-line bg-jp-blue-tint/40 p-3 text-sm">
        <strong>Nota interna:</strong> os campos entre parêntesis retos têm de ser preenchidos com
        a identificação legal real da Juventude Popular (pessoa coletiva, morada da sede, contacto
        do encarregado de proteção de dados, se aplicável) antes desta página ser publicada. Este
        texto é um ponto de partida estruturado, não aconselhamento jurídico — recomenda-se revisão
        por um jurista antes de entrar em produção.
      </p>

      <h2>1. Responsável pelo tratamento</h2>
      <p>
        [Nome legal da Juventude Popular], com sede em [morada da sede], é a entidade responsável
        pelo tratamento dos dados pessoais recolhidos através deste Portal. Para questões sobre
        proteção de dados, contacta [email de contacto para proteção de dados].
      </p>

      <h2>2. Que dados recolhemos</h2>
      <ul>
        <li>Dados de conta: email, nome apresentado no Portal.</li>
        <li>
          Dados de participação: se és militante, número de militante, concelhia, distrito e data
          de adesão (sincronizados a partir do registo de filiação da Juventude Popular).
        </li>
        <li>
          Conteúdo que publicas: mensagens no mural, tópicos e respostas nos fóruns, mensagens
          diretas a outros membros, votos em sondagens.
        </li>
        <li>Preferências: modo escuro, subscrição ao resumo semanal, notificações push.</li>
        <li>Dados técnicos: registos de sessão necessários para manter a conta segura.</li>
      </ul>

      <h2>3. Para que usamos os teus dados</h2>
      <ul>
        <li>Autenticar o teu acesso e identificar-te como militante ou simpatizante.</li>
        <li>Mostrar-te conteúdo relevante para a tua concelhia/distrito.</li>
        <li>Permitir a participação na comunidade (mural, fóruns, sondagens, mensagens).</li>
        <li>Enviar notificações que ativaste (push, resumo semanal por email).</li>
        <li>Prevenir abusos, através do sistema de denúncias e moderação.</li>
      </ul>

      <h2>4. Com quem partilhamos dados</h2>
      <p>
        Os teus dados de filiação são partilhados com o sistema de gestão de militância da
        Juventude Popular (para manter o teu estatuto atualizado) e com o fornecedor de
        infraestrutura que aloja a base de dados (Supabase) e o alojamento da aplicação. Não
        vendemos nem partilhamos os teus dados com terceiros para fins de marketing.
      </p>

      <h2>5. Quanto tempo guardamos os dados</h2>
      <p>
        Mantemos os teus dados enquanto a tua conta estiver ativa. Podes pedir a eliminação da tua
        conta e dos dados associados a qualquer momento, sujeito a obrigações legais de conservação
        aplicáveis a registos de filiação partidária.
      </p>

      <h2>6. Os teus direitos</h2>
      <p>
        Podes exercer os direitos de acesso, retificação, apagamento, limitação, portabilidade e
        oposição relativamente aos teus dados pessoais, contactando [email de contacto]. Tens
        também o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados
        (CNPD).
      </p>

      <h2>7. Segurança</h2>
      <p>
        Aplicamos medidas técnicas e organizativas adequadas para proteger os teus dados,
        incluindo controlo de acesso por função e encriptação em trânsito.
      </p>
    </LegalPage>
  );
}
