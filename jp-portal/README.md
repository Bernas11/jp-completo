# jp-portal — Portal do militante (protótipo)

> Protótipo não oficial; não está publicado. Ver `docs/ARQUIVO.md`.

Next.js 15 (App Router) · React 19 · Supabase (SSR) · Drizzle · next-safe-action · Upstash Ratelimit · UploadThing · Web Push.

## Acesso

Login por **magic link** (email, sem palavra-passe) em `/login`; pedidos limitados por IP. As contas dos militantes chegam por sincronização a partir do backoffice (`/api/sync/member`).

## Áreas

Início (`/`), Mural, Fórum (categorias → tópicos), Sondagens, Eventos (RSVP), Wiki, Documentos, Arquivo (congressos), Mensagens diretas, Notificações, Perfil, **Moderação** (denúncias e ações; só moderadores). Páginas públicas: `/login`, políticas e `/verificar/<n.º de militante>` (confirma a validade de um militante).

## API interna

| Rota | Função |
|---|---|
| `POST /api/sync/member` | Recebe eventos de militantes (assinatura HMAC `X-Sync-Signature`) |
| `POST /api/sync/event` | Recebe eventos (criar/atualizar/apagar) do admin |
| `/api/sync/attendees` | Devolve participantes de um evento ao admin |
| `GET /api/cron/keepalive` | Mantém o projeto Supabase ativo (cron diário) |

## Base de dados

Ver [`docs/BASE-DE-DADOS.md`](../docs/BASE-DE-DADOS.md) e `db/LEIA-ME.md`. **Não correr `drizzle-kit migrate` contra produção.**

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
npm test && npm run typecheck && npm run lint
```
