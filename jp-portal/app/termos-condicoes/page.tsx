import { LegalPage } from "@/components/legal/legal-page";

export default function TermosCondicoesPage() {
  return (
    <LegalPage title="Termos e Condições" updatedAt="[preencher antes de publicar]">
      <p>
        Ao aceder e utilizar o Portal da Juventude Popular ("Portal"), aceitas os seguintes termos.
      </p>

      <h2>1. Acesso</h2>
      <p>
        O acesso é feito por Magic Link enviado para o email associado à tua conta. És responsável
        por manter o acesso ao teu email seguro, já que é o único meio de autenticação.
      </p>

      <h2>2. Quem pode usar o Portal</h2>
      <p>
        O Portal destina-se a militantes e simpatizantes da Juventude Popular. O teu nível de
        acesso (militante ou simpatizante) é determinado a partir do registo oficial de filiação;
        não é possível autoatribuir-se o estatuto de militante.
      </p>

      <h2>3. Regras de conduta</h2>
      <ul>
        <li>Não publicar conteúdo ofensivo, discriminatório, difamatório ou que incite à violência.</li>
        <li>Não assediar, ameaçar ou intimidar outros membros.</li>
        <li>Não publicar informação falsa fazendo-a passar por comunicação oficial da JP.</li>
        <li>Não usar o Portal para fins ilegais ou não relacionados com a atividade da JP.</li>
      </ul>
      <p>
        O incumprimento destas regras pode levar à remoção de conteúdo, silenciamento temporário,
        suspensão, ou — mediante aprovação da Comissão Política Nacional — exclusão permanente do
        Portal.
      </p>

      <h2>4. Conteúdo publicado por ti</h2>
      <p>
        Manténs os direitos sobre o conteúdo que publicas, mas concedes à Juventude Popular uma
        licença para o exibir dentro do Portal enquanto a tua publicação estiver ativa. Podes
        eliminar as tuas publicações a qualquer momento (sujeito às regras de moderação).
      </p>

      <h2>5. Moderação</h2>
      <p>
        O Portal tem moderadores concelhios, distritais e nacionais, com poderes de moderação
        limitados à área da comunidade sob a sua alçada. Suspensões e remoções de conteúdo podem
        ser aplicadas por moderadores; exclusões permanentes ("bans") exigem sempre aprovação da
        Comissão Política Nacional.
      </p>

      <h2>6. Disponibilidade do serviço</h2>
      <p>
        Fazemos esforços razoáveis para manter o Portal disponível, mas não garantimos
        funcionamento ininterrupto. Podemos suspender o serviço para manutenção sem aviso prévio.
      </p>

      <h2>7. Alterações a estes termos</h2>
      <p>
        Podemos atualizar estes termos periodicamente. Alterações relevantes serão comunicadas
        através do Portal.
      </p>

      <h2>8. Contacto</h2>
      <p>Para questões sobre estes termos, contacta [email de contacto].</p>
    </LegalPage>
  );
}
