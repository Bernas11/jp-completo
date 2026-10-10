# Política de segurança

Este sistema trata **dados pessoais** (incluindo documentos de identificação) de militantes.

## Estado do projeto
Este repositório é um **protótipo público de portefólio**, usado com autorização da Juventude Popular para o nome e a identidade visual. Não está em produção e **não deve receber dados reais de militantes**.

## Reportar uma vulnerabilidade
Não abras *issues* públicas com detalhes de vulnerabilidades. Contacta a CPN / responsável técnico por email (**preencher aqui o contacto**) com: descrição, passos para reproduzir e impacto. Respondemos o mais depressa possível.

## Regras essenciais
- Repositório público: **nada sensível no código nem no histórico**. Ativar 2FA na conta GitHub, *secret scanning* e *push protection* (Settings → Code security).
- Nunca fazer *commit* de `.env*`, chaves `service_role`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_*`, `SYNC_SHARED_SECRET`, `CRON_SECRET` ou *connection strings*.
- Se um segredo for exposto: **rodar a chave no serviço respetivo** (apagar o commit não chega) e avisar o responsável.
- Ambientes de teste/*Preview* nunca usam dados reais de militantes.
- Contas de staff com TOTP; revogar o acesso de quem sai (`/administradores`).

## O que está protegido por desenho
RLS em todas as tabelas · cartões de cidadão em bucket privado com ligações temporárias · MFA obrigatório no backoffice · *rate limiting* · assinatura HMAC na sincronização · registo de auditoria. Detalhes em `docs/`.
