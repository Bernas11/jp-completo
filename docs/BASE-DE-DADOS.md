# Base de dados

São dois projetos Supabase (Postgres 17, região UE):

| Projeto | Ref | Região | Usado por |
|---|---|---|---|
| `jp-militancia` | `bcwbhhtsncuriueponuz` | eu-west-1 | jp-nacional, jp-admin |
| `jp-portal` | `ffstmmzzrbznuwtvnbkp` | eu-central-1 | jp-portal |

> **A base de dados de produção é a fonte de verdade, não as pastas de migrations.** O histórico de migrations nunca foi mantido de forma consistente (ver `jp-portal/db/LEIA-ME.md` e `docs/PONTOS-DE-ATENCAO.md`). Para recriar um ambiente, gera um dump com `supabase db dump --schema public` em vez de correr migrations por ordem.

> **Esquema detalhado** (colunas, chaves estrangeiras, funções e políticas RLS): [`schema/jp-militancia.md`](schema/jp-militancia.md) e [`schema/jp-portal.md`](schema/jp-portal.md).

## jp-militancia

Todas as tabelas têm **RLS ativo**.

**Pessoas e filiação:** `profiles` (contas do backoffice; criadas automaticamente por trigger ao criar um utilizador Auth), `membership_requests`, `members`, `member_sensitive_data` (dados do cartão de cidadão), `membership_transfers`, `member_number_sequences` (contadores do número de militante).

**Estrutura:** `districts`, `concelhias`, `national_body_positions`, `national_body_members`, `previous_leaders`.

**Conteúdo:** `news` (Atividades), `events`, `public_documents`, `communications`.

**Loja:** `products`, `orders`, `order_items`.

**Sistema:** `audit_log`, `sync_outbox`, `email_queue`, `email_templates`, `feature_flags`.

### Enums
`role` (`cpn`, `administrador`, `moderador_nacional`, `moderador_distrital`, `moderador_concelhio`, `militante`, `simpatizante`) · `membership_request_status` (`pendente`, `aprovado`, `recusado`) · `member_status` (`ativo`, `revogado`, `suspenso`) · `document_category` (`convocatoria`, `estatuto`, `minuta`, `resolucao`, `outro`) · `order_status` (`pendente`, `enviado`, `entregue`, `cancelado`) · `audit_action` (`create`, `update`, `delete`, `approve`, `reject`, `revoke`, `login`, `export`) · `email_queue_status` (`pendente`, `enviado`, `falhado`) · `sync_event_status` (`pendente`, `processado`, `falhado`) · `sync_event_type` (`member_approved`, `member_revoked`, `member_transferred`, `event_upserted`, `event_deleted`, `member_role_changed`, `member_catalog_concelhia`).

### Funções (schema `public`)
- Aprovação e números: `approve_membership_transaction`, `generate_member_number` (formato `<código do distrito>-<6 dígitos>`), `bulk_import_member`.
- Permissões (usadas nas políticas RLS): `auth_role`, `auth_district_id`, `auth_is_national_staff`, `auth_moderated_concelhia_ids`.
- Estatísticas: `get_stats_approval_rate`, `get_stats_concelhia_activity`, `get_stats_district_summary`, `get_stats_member_growth`.
- Loja: `adjust_product_stock`.
- Sincronização: `enqueue_member_approved`, `enqueue_member_status_change`, `enqueue_member_transferred`, `enqueue_member_role_changed`, `enqueue_event_upserted`, `enqueue_event_deleted`, `enqueue_concelhia_catalog`, `enqueue_membership_rejected_email`.
- Segurança: `prevent_self_privilege_escalation`, `handle_new_admin_user`.

### Triggers
| Tabela | Trigger |
|---|---|
| `auth.users` | `on_auth_user_created` (cria o perfil) |
| `profiles` | `trg_prevent_self_privilege_escalation`, `trg_enqueue_member_role_changed` |
| `members` | `trg_enqueue_member_approved`, `trg_enqueue_member_status_change`, `trg_enqueue_member_transferred` |
| `membership_transfers` | `trg_enqueue_member_transferred` |
| `membership_requests` | `trg_enqueue_membership_rejected_email` |
| `events` | `trg_enqueue_event_upserted`, `trg_enqueue_event_deleted` |
| `concelhias` | `trg_concelhias_catalog_sync` |

### Storage
| Bucket | Visibilidade | Conteúdo |
|---|---|---|
| `documentos-identificacao` | **privado** | Cartões de cidadão dos pedidos (`pendentes/<id>/…`) |
| `documentos-publicos` | público | Documentação pública (`convocatoria/`, `estatuto/`, …) |

### Edge Functions
`approve-membership` (JWT obrigatório), `sync-outbox-processor` e `email-queue-processor` (autenticadas por `X-Cron-Secret`). Código em [`supabase/functions/`](../supabase/README.md).

## jp-portal

**Utilizadores e permissões:** `portal_profiles`, `pending_member_approvals`, `badges`, `profile_badges`, `push_subscriptions`.

**Comunidade:** `mural_posts`, `forum_categories`, `forum_topics`, `forum_replies`, `reactions`, `mentions`, `direct_messages`, `notifications`, `polls`, `poll_options`, `poll_votes` (+ vista `poll_vote_counts`).

**Conteúdo:** `portal_events`, `portal_event_rsvps`, `event_invitations`, `event_permission_grants`, `portal_documents`, `wiki_pages`, `wiki_revisions`, `archive_congresses`, `archive_congress_items`, `newsletter_subscritores`.

**Moderação e sistema:** `reports`, `moderation_actions`, `sync_log`, `ranking_participacao_concelhia`.

**Referência (cópia sincronizada):** `districts`, `concelhias`.

**Funções:** permissões `portal_auth_*` e `portal_can_*` (usadas nas políticas RLS), gamificação (`award_badge_if_missing`, `check_event_participation_badges`, `check_forum_participation_badges`), `get_ranking_participacao_concelhia`, `notify_mural_post`, `portal_profiles_guard_insert`.

## Dados de referência (não apagar)

`districts` (20), `concelhias` (≈28 na `jp-militancia`), `previous_leaders`, `national_body_*`, `products`, e na `jp-portal` os `badges` e as `forum_categories`.

## Tarefas agendadas na base de dados

`pg_cron` (extensão ativa na `jp-militancia`): job `process-sync-outbox`, a cada minuto — **atualmente com valores de substituição, ver `PONTOS-DE-ATENCAO.md` (ponto 1)**.
