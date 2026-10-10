# Supabase — Edge Functions (projeto `jp-militancia`)

Código exportado a partir do projeto em produção (`bcwbhhtsncuriueponuz`, versão 6 de cada função). A partir de agora, **este é o código de referência**.

| Função | `verify_jwt` | Autenticação | Função |
|---|---|---|---|
| `approve-membership` | sim | JWT do utilizador (papel `cpn` ou `administrador`) | Aprova um pedido de adesão (RPC `approve_membership_transaction`) e envia o email de aprovação |
| `sync-outbox-processor` | não | cabeçalho `X-Cron-Secret` | Entrega eventos de `sync_outbox` ao portal (HMAC, *retry* com *backoff*) |
| `email-queue-processor` | não | cabeçalho `X-Cron-Secret` | Envia emails de `email_queue` através do Brevo |

## Secrets necessários

`BREVO_API_KEY`, `BREVO_APPROVED_TEMPLATE_ID`, `CRON_SECRET`, `SYNC_SHARED_SECRET`, `PORTAL_SYNC_MEMBER_URL`, `PORTAL_SYNC_EVENT_URL`.

```bash
supabase secrets set --project-ref bcwbhhtsncuriueponuz BREVO_API_KEY=... CRON_SECRET=...
supabase functions deploy approve-membership --project-ref bcwbhhtsncuriueponuz
supabase functions deploy sync-outbox-processor --no-verify-jwt --project-ref bcwbhhtsncuriueponuz
supabase functions deploy email-queue-processor --no-verify-jwt --project-ref bcwbhhtsncuriueponuz
```

Ver também `docs/PONTOS-DE-ATENCAO.md` (a tabela `email_templates` está vazia).
