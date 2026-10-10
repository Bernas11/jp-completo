# Pontos de atenção (limitações conhecidas)

> Mantidos aqui por transparência: o código é público e estes pontos são visíveis nele. Só o `jp-nacional` está publicado; `jp-admin` e `jp-portal` não estão expostos. Se o projeto for retomado, **resolvê-los antes de ir para produção**.

Itens encontrados ao analisar o código e as bases de dados em produção (2026-10-10), por ordem de importância. Os marcados **[corrigir]** merecem ação; **[verificar]** requerem confirmação no código ou na conta.

## Críticos

1. **[corrigir] O `pg_cron` da sincronização está configurado com valores de substituição.** Na `jp-militancia` existe o job `process-sync-outbox` (a cada minuto), mas o comando guardado tem o texto literal `<PROJECT_REF>` no URL (e, pela migration `0004`, `<CRON_SECRET>` no cabeçalho). Nunca chega a chamar a Edge Function. Hoje a sincronização depende da entrega imediata após ações no admin e do cron diário da Vercel. Para corrigir, num SQL Editor (com os valores reais, **sem os guardar no repositório**):
   ```sql
   select cron.unschedule('process-sync-outbox');
   select cron.schedule('process-sync-outbox', '* * * * *', $$
     select net.http_post(
       url := 'https://bcwbhhtsncuriueponuz.functions.supabase.co/sync-outbox-processor',
       headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret','<CRON_SECRET_REAL>'),
       body := '{}'::jsonb);
   $$);
   ```
   Idealmente o segredo vem do Supabase Vault em vez de ficar escrito no comando.
2. **[corrigir] A tabela `email_templates` está vazia.** A Edge Function `email-queue-processor` marca como `falhado` («Template desconhecido») qualquer email cuja `template_key` não exista. Antes de usar comunicados em massa, regista as chaves e os IDs de template do Brevo. O email de aprovação usa a variável `BREVO_APPROVED_TEMPLATE_ID` da Edge Function `approve-membership`.
3. **[verificar] Possível *open redirect* no login do portal.** `jp-portal/app/auth/callback/route.ts` faz `new URL(redirect_to, request.url)` com o parâmetro `redirect_to` recebido; um URL absoluto leva o utilizador para outro site. Convém aceitar apenas caminhos relativos (começados por `/` e não por `//`).
4. **[verificar] O portal permite registo aberto.** O login usa `signInWithOtp`; qualquer email que peça o *magic link* ganha conta `simpatizante` (o trigger força o papel). Se isso não for pretendido, usar `shouldCreateUser: false` ou restringir no Supabase Auth.

## Segurança e dados

5. **Política RLS permissiva em `mentions`.** `mentions_insert_system` permite `INSERT` com condição `true`. Restringir ao utilizador autenticado.
6. **`moderador_nacional` tem escrita ampla por RLS** em `members`, `membership_requests`, `profiles`, `orders`… (as Server Actions são mais restritivas, mas a base de dados aceitaria pedidos diretos com o seu token). Rever se é o pretendido.
7. **Bucket `documentos-publicos` é público.** Não carregar nada confidencial; os cartões de cidadão ficam em `documentos-identificacao` (privado).
8. **Rate limiting em memória** sem Upstash: não é partilhado entre instâncias. Definir `UPSTASH_REDIS_REST_*` em produção.
9. **Segredos partilhados.** `SYNC_SHARED_SECRET` tem de ser idêntico no admin, portal e Edge Functions; `CRON_SECRET` no admin e nas Edge Functions. Ao rodar, alterar todos em simultâneo.
10. **Sessão do admin** expira aos 30 min de inatividade e exige TOTP: guardar o segredo/recuperação do autenticador da conta CPN.

## Operação e manutenção

11. **Edge Functions sem versionamento.** Existiam apenas no Supabase; foram exportadas para `supabase/functions/` (versão 6). Passa a ser este o código de referência.
12. **Migrations incoerentes.** Em `jp-portal/db/` as migrations `0006–0012` não estão no *journal* do Drizzle e a produção foi alterada diretamente. **Não correr `drizzle-kit migrate` contra produção.** Usar `supabase db dump`. No `jp-admin`, `db/migrations/0004` contém os marcadores `<PROJECT_REF>`/`<CRON_SECRET>` (ver ponto 1).
13. **Emails e crons diários.** Os crons da Vercel (plano gratuito) correm 1×/dia: um comunicado em fila pode demorar até 24 h a sair se não houver outro processador.
14. **Versões diferentes entre apps.** `jp-nacional` usa Next.js 16 e Zod 4; `jp-admin` e `jp-portal` usam Next.js 15 e Zod 3; o Drizzle também difere (0.45 vs 0.36). Evitar partilhar código sem testar.
15. **Loja ligada por omissão.** A «Marca JP» está ativa a não ser que `NEXT_PUBLIC_SHOP_ENABLED=false`. Sem Stripe configurado, desligar.
16. **Plano gratuito do Supabase** pausa projetos inativos (ver `docs/OPERACOES.md`); o cron `keepalive` só protege a `jp-portal`.
17. **Traduções.** O site tem 24 línguas, mas só `pt.json` está traduzido; as outras 23 são cópias do português (ver `jp-nacional/messages/README.md`).
18. **Testes Playwright** (`tests/e2e`) foram escritos a partir do código e **ainda não foram executados**; o teste de *rate limit* do portal depende do limitador configurado.
