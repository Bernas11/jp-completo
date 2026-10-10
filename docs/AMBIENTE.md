# Variáveis de ambiente

Apenas **nomes e finalidade** — os valores ficam na Vercel (Project Settings → Environment Variables) e em `.env.local` (nunca no Git). Cada app tem um `.env.example`.

## jp-nacional

| Variável | Finalidade |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL público do site |
| `SUPABASE_MILITANCIA_URL`, `SUPABASE_MILITANCIA_SERVICE_ROLE_KEY` | Acesso (servidor) à `jp-militancia` |
| `SUPABASE_PORTAL_URL`, `SUPABASE_PORTAL_SERVICE_ROLE_KEY` | Acesso (servidor) à `jp-portal` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | *Rate limiting* |
| `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASS` | Envio de emails |
| `EMAIL_FROM`, `EMAIL_CPN` | Remetente e destinatário dos avisos de adesão |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagamentos da loja |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics |
| `NEXT_PUBLIC_SHOP_ENABLED` | Loja «Marca JP». **Ligada por omissão**; só `false` a desliga (menu, rodapé, páginas e checkout) |

## jp-admin

| Variável | Finalidade |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase (`jp-militancia`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Operações privilegiadas (convidar admins, sincronização) |
| `DATABASE_URL` | Ligação direta Postgres (Drizzle) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | *Rate limiting* (login, aprovações) |
| `CRON_SECRET` | Autenticação dos crons |
| `SYNC_SHARED_SECRET` | Chave HMAC da sincronização (**igual** no portal) |
| `PORTAL_SYNC_MEMBER_URL`, `PORTAL_SYNC_EVENT_URL`, `PORTAL_GET_ATTENDEES_URL` | Endpoints `/api/sync/*` do portal |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Emails |
| `NEXT_PUBLIC_SHOP_ENABLED` | Mostra/oculta a loja (só `false` desliga) |
| `E2E_*` | Só para testes Playwright (ver `docs/TESTES.md`) |


## jp-portal

| Variável | Finalidade |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase (`jp-portal`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Operações privilegiadas na `jp-portal` |
| `SUPABASE_MILITANCIA_URL`, `SUPABASE_MILITANCIA_SERVICE_ROLE_KEY` | Acesso à `jp-militancia` a partir do servidor do portal |
| `DATABASE_URL` | Ligação direta Postgres (Drizzle) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | *Rate limiting* |
| `SYNC_SHARED_SECRET` | Valida a assinatura dos eventos de sincronização (**igual** no admin) |
| `CRON_SECRET` | Autenticação do cron *keepalive* (opcional) |
| `VAPID_PUBLIC_KEY` | Notificações *push* |
| `UPLOADTHING_TOKEN` (ou `UPLOADTHING_SECRET`) | Uploads do portal (UploadThing); confirma o nome exato na tua conta |

## Edge Functions (Supabase → Edge Functions → Secrets)

`BREVO_API_KEY`, `BREVO_APPROVED_TEMPLATE_ID`, `CRON_SECRET`, `SYNC_SHARED_SECRET`, `PORTAL_SYNC_MEMBER_URL`, `PORTAL_SYNC_EVENT_URL` (mais as variáveis `SUPABASE_*` injetadas automaticamente).
