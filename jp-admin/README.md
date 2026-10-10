# jp-admin — Backoffice da Juventude Popular (protótipo)

> Protótipo não oficial; não está publicado. Ver `docs/ARQUIVO.md`.

Next.js 15 (App Router) · React 19 · Supabase (SSR) · Drizzle · next-safe-action · Zod 3 · Upstash Ratelimit.

## Acesso

Login com email + palavra-passe e **TOTP obrigatório** (QR no primeiro acesso). Sessão expira aos 30 min de inatividade. Primeira conta: ver [`docs/OPERACOES.md`](../docs/OPERACOES.md).

## Áreas (menu lateral)

| Secção | Rota | O que faz |
|---|---|---|
| Militância | `/militancia/pedidos` | Pedidos de adesão: ver, aprovar, recusar (com motivo), ver cartão de cidadão por link temporário |
| | `/militancia/membros` | Lista, filtros, exportação Excel, edição e revogação (CPN) |
| | `/militancia/importar` | Importação em *bulk* com validação |
| Estrutura | `/estrutura/concelhias` | Gestão de concelhias |
| | `/estrutura/distritais` | Moderadores distritais |
| | `/estrutura/orgaos-nacionais` | Órgãos nacionais (aparecem no site público) |
| | `/estrutura/lideres` | Histórico de líderes |
| Conteúdo | `/noticias` | Atividades |
| | `/documentacao` | Documentos públicos por categoria |
| | `/loja/produtos`, `/loja/encomendas` | Loja |
| | `/comunicacao` | Comunicados por email segmentados |
| | `/eventos` | Eventos (sincronizados para o portal) |
| Sistema | `/estatisticas` | Estatísticas e crescimento |
| | `/auditoria` | Registo de ações |
| | `/administradores` | Convidar administradores e alterar papéis (CPN) |
| — | `/perfil`, `/onboarding` | Perfil da conta e primeiro acesso |

## Código

- `app/` — rotas (App Router); `app/api/cron/*` tarefas agendadas (sincronização e fila de emails);
- `actions/` — Server Actions (uma por domínio) protegidas por papel (`roleProtectedActionClient`).
- `lib/` — Supabase, *rate limit*, fila de emails, *outbox* de sincronização, assinatura HMAC, importação.
- `components/` — UI por domínio.
- `tests/` — Vitest (unitários) e Playwright (`tests/e2e`).

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
npm test && npm run typecheck && npm run lint
```

Crons (Vercel): `vercel.json`. Documentação geral em [`docs/`](../docs/).
