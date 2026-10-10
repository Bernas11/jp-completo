# Pontos de atenção (limitações conhecidas)

> Mantidos aqui por transparência: o código é público e estes pontos são visíveis nele. Só o `jp-nacional` está publicado; `jp-admin` e `jp-portal` não estão expostos. Se o projeto for retomado, **resolvê-los antes de ir para produção**.

Fotografia histórica da revisão do código e da configuração descrita para as bases de dados (2026-10-10); o estado dos serviços remotos não foi verificado nesta atualização. Não assumir que os valores ou estados abaixo continuam atuais. Os marcados **[corrigir]** merecem ação; **[verificar]** requerem confirmação no código ou na conta.

## Críticos

1. **[verificar] O `pg_cron` da sincronização foi descrito com valores de substituição.** A fotografia de 2026-10-10 indica que o job `process-sync-outbox` (a cada minuto) tinha `<PROJECT_REF>` no URL e `<CRON_SECRET>` no cabeçalho. Não foi verificado nesta revisão se continua assim. Antes de depender do cron, confirmar o estado diretamente no painel autorizado; nunca guardar o URL/segredo real neste repositório.
   Se o problema se confirmar, corrigir a configuração no Supabase autorizado, guardar o segredo no Vault e testar a entrega antes de depender do job.
2. **[verificar] A tabela `email_templates` foi descrita como vazia.** A fotografia de 2026-10-10 indica que a Edge Function `email-queue-processor` marcava como `falhado` («Template desconhecido») qualquer email cuja `template_key` não existisse. Confirmar a tabela antes de usar comunicados em massa e registar as chaves/IDs do Brevo que estejam em falta.
3. **[corrigido no código] *Open redirect* no login do portal.** O callback agora só aceita caminhos locais e usa `/` como destino seguro para URLs absolutas, destinos `//host` ou entradas inválidas. Confirmar o deploy do portal antes de considerar o risco encerrado no serviço.
4. **[decisão de produto] O portal permite registo aberto.** O login usa `signInWithOtp`; um email novo pode criar uma conta `simpatizante`, em linha com o texto atual do portal. Se o acesso tiver de ser só por convite, restringir a criação de contas no Supabase Auth ou usar `shouldCreateUser: false`.

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
15. **Loja desligada por omissão no código.** A «Marca JP» só fica ativa com `NEXT_PUBLIC_DEMO_MODE=false` e `NEXT_PUBLIC_SHOP_ENABLED=true`; confirmar que a configuração de produção respeita o estado de demonstração.
16. **Plano gratuito do Supabase** pausa projetos inativos (ver `docs/OPERACOES.md`); o cron `keepalive` só protege a `jp-portal`.
17. **Traduções.** O site tem 24 línguas, mas só `pt.json` está traduzido; as outras 23 são cópias do português (ver `jp-nacional/messages/README.md`).
18. **Testes Playwright** (`tests/e2e`) foram escritos a partir do código e **ainda não foram executados**; o teste de *rate limit* do portal depende do limitador configurado.
19. **Modo de demonstração no site público.** O código bloqueia por omissão adesões, newsletter e loja; confirmar que a variável Vercel não desativa esse modo até existir autorização e uma revisão operacional/privacidade.
