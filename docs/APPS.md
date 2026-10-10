# Estrutura interna das aplicações

## jp-nacional (site público)
```
jp-nacional/
├── src/
│   ├── app/[locale]/        páginas (início, aderir, concelhias, contactos, documentação, história, carta, órgãos, líderes, marca-jp, notícias/[slug], políticas)
│   ├── app/api/             adesao · newsletter · checkout · stripe-webhook · encomenda · sitemap
│   ├── components/          Hero, Header/Footer, mapa de municípios, pesquisa de concelhias, Timeline, Newsletter, Analytics (PostHog), CartContext…
│   ├── i18n/                routing.ts (24 línguas, pt sem prefixo), request.ts
│   ├── lib/                 supabase.ts, validation.ts, adesao-form-schema.ts, email.ts, rate-limit.ts, features.ts (SHOP_ENABLED), seo.ts, concelhos-por-distrito.json…
│   └── proxy.ts             middleware de i18n (Next.js 16)
├── messages/                *.json por língua (só pt está traduzido)
├── docs/                    supabase-schema-militancia.sql (referência)
├── tests/ · tests-unit/     Playwright · Vitest
└── public/                  imagens (brand, líderes, merchandise) e dados
```
- **Adesão:** validação com Zod (`validation.ts`), concelhias normalizadas sem acentos (cria a concelhia, inativa, se não existir), upload para `documentos-identificacao`.
- **Idiomas:** acrescentar uma língua = ficheiro em `messages/` + entrada em `src/i18n/routing.ts`.
- **Analytics:** PostHog via `Analytics.tsx` (`NEXT_PUBLIC_POSTHOG_*`).

## jp-admin (backoffice)
```
jp-admin/
├── app/(admin)/             páginas protegidas (ver README)
├── app/login · onboarding · sem-permissao
├── app/api/cron/            sync-outbox · email-queue
├── actions/                 Server Actions por domínio (admins, news, products, membership-requests…)
├── components/              UI por domínio + layout (sidebar, user-menu)
├── lib/                     safe-action (papéis), rate-limit, sync-outbox, sync-signature, email-queue, bulk-import-schema, xlsx-export, supabase/{client,server,database.types}
├── db/                      schema.ts (Drizzle), migrations/, security-tests/red-team-suite.sql
├── middleware.ts            sessão, inatividade, redirecionamento
└── tests/                   Vitest (bulk-import, rate-limit, sync-logic) + e2e/
```
- **Padrão das ações:** `roleProtectedActionClient("<papel mínimo>")` → valida o Zod → executa com o cliente Supabase da sessão (**sujeito a RLS**) ou, onde necessário, com a *service role* → regista em `audit_log` → `revalidatePath`.
- `db/security-tests/red-team-suite.sql` contém testes de segurança SQL (RLS) que podem ser executados contra um ambiente de teste.

## jp-portal (portal do militante)
```
jp-portal/
├── app/(portal)/            mural, comunidade/forum, sondagens, eventos, wiki, documentos, arquivo, mensagens, notificações, perfil, moderação
├── app/login · auth/callback · verificar/[memberNumber] · políticas
├── app/api/                 sync/{member,event,attendees} · cron/keepalive · uploadthing
├── actions/                 archive, auth, documents, events, forum, messages, mural, notifications, polls, profile, push, reports, wiki
├── lib/                     roles, moderator-scope, scope-label, safe-action, rate-limit, sync-signature, uploadthing, file-url
├── db/                      schema.ts (Drizzle, incompleto) · migrations/ · LEIA-ME.md
└── tests/                   Vitest (rate-limit) + e2e/
```
- **Âmbitos (`scope`):** nacional / distrital / concelhia determinam quem publica e modera (ver `docs/PAPEIS-E-PERMISSOES.md`).
- **Notificações:** tabela `notifications` + *Web Push* (`push_subscriptions`, `VAPID_PUBLIC_KEY`).
