# Sincronização jp-militancia → jp-portal

## Princípio
A `jp-militancia` é a fonte de verdade. Triggers escrevem **eventos** na tabela `sync_outbox`; um processador entrega-os ao portal por HTTP, assinados. O portal aplica-os de forma **idempotente**.

## Eventos

| `event_type` | Origem (trigger) | Destino | Payload | Efeito no portal |
|---|---|---|---|---|
| `member_approved` | `members` (insert) | `/api/sync/member` | `member_id, email, full_name, member_number, concelhia_id, district_id, joined_at` | Atualiza `portal_profiles` pelo email (→ `militante`); se a pessoa **ainda não fez login**, guarda em `pending_member_approvals` |
| `member_revoked` | `members` (status) | `/api/sync/member` | `member_id, revoked_reason` | `portal_profiles.role = 'simpatizante'` |
| `member_transferred` | `members` / `membership_transfers` | `/api/sync/member` | `member_id, to_concelhia_id` | Atualiza concelhia e distrito |
| `member_role_changed` | `profiles` (role) | `/api/sync/member` | `member_id, email, admin_role` | Mapeia o papel (ver `PAPEIS-E-PERMISSOES.md`) |
| `member_catalog_concelhia` | `concelhias` | `/api/sync/member` | `id, district_id, name` | *Upsert* em `concelhias` do portal (sem isto a aprovação falhava a FK) |
| `event_upserted` | `events` | `/api/sync/event` | `event_id, title, description, location, starts_at, ends_at, concelhia_id` | Cria/atualiza `portal_events` (`source_event_id`) |
| `event_deleted` | `events` | `/api/sync/event` | `event_id` | Apaga o evento do portal |

Sentido inverso: o admin pede as **presenças** de um evento ao portal com `POST /api/sync/attendees` (`{ eventId }` → `{ attendees: [...] }`).

## Envelope e assinatura

```json
{ "eventId": "<uuid de sync_outbox.id>", "eventType": "member_approved", "payload": { ... } }
```

- Cabeçalho `X-Sync-Signature` = **HMAC-SHA256 em hexadecimal** do corpo em bruto, com `SYNC_SHARED_SECRET` (igual nos dois lados).
- O portal compara em tempo constante e responde `401` se a assinatura falhar.
- **Idempotência:** o portal guarda cada `eventId` processado em `sync_log`; reentregas respondem `{ ok: true, skipped: "duplicate" }`.

## Entrega e *retry*

| Mecanismo | Frequência | Estado |
|---|---|---|
| Entrega imediata após ações no admin (`flushSyncOutboxAfterResponse`) | Sempre | Ativo |
| Vercel Cron `/api/cron/sync-outbox` | 1×/dia (06:00 UTC) | Ativo |
| `pg_cron` → Edge Function `sync-outbox-processor` | A cada minuto (`process-sync-outbox`) | **Configurado com valores de substituição — não funciona** (ver `PONTOS-DE-ATENCAO.md`) |

Lotes de 25–50 eventos; *backoff* exponencial; máximo 8 tentativas, depois `status='falhado'` com `last_error`.

## Primeiro login de um militante

1. O admin aprova → a RPC cria o utilizador em `auth.users` (só email) e o `members`.
2. O evento `member_approved` chega ao portal: sem conta no portal ainda → fica em `pending_member_approvals`.
3. O militante pede o *magic link* em `/login` e entra. O trigger `portal_profiles_guard_insert` cria o perfil com o papel e o número de militante vindos de `pending_member_approvals` (se o email não estiver lá, fica `simpatizante`).

## Diagnóstico

```sql
-- jp-militancia
select event_type, status, count(*) from sync_outbox group by 1,2;
select id, event_type, attempts, last_error from sync_outbox where status <> 'processado' order by created_at;
-- jp-portal
select * from sync_log order by processed_at desc limit 20;
select email, member_number from pending_member_approvals;
```
