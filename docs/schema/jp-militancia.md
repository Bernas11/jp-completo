# Esquema — `jp-militancia`

Extraído da base de dados de produção (2026-10-10). Notação: `!` = NOT NULL · `→` = chave estrangeira. Todas as tabelas têm RLS ativo.

## Tabelas

### Pessoas e filiação
**profiles** — `id uuid!` (= `auth.users.id`), `email text!` (único), `full_name text!`, `role role!` (padrão `simpatizante`), `district_id uuid` → districts (SET NULL), `totp_enabled bool!`, `last_login_at`, `cargo text`, `created_at!`, `updated_at!`

**membership_requests** — `id!`, `full_name!`, `email!`, `phone varchar(20)!`, `birth_date date!`, `concelhia_id!` → concelhias (RESTRICT), `citizen_card_storage_path`, `citizen_card_number`, `status!` (`pendente`/`aprovado`/`recusado`), `reviewed_by_profile_id` → profiles (SET NULL), `reviewed_at`, `rejection_reason`, `education_or_workplace`, `address`, `address_number`, `postal_code`, `city`, `guardian_name`, `guardian_contact`, `created_at!`

**members** — `id!`, `profile_id!` → profiles (RESTRICT, único), `membership_request_id!` → membership_requests (RESTRICT, único), `member_number varchar(16)!` (único), `concelhia_id!` → concelhias (RESTRICT), `status!` (`ativo`/`revogado`/`suspenso`), `joined_at!`, `revoked_at`, `revoked_reason`, `created_at!`, `updated_at!`

**member_sensitive_data** — `member_id!` → members (CASCADE), `citizen_card_number!`, `citizen_card_storage_path`, `birth_date!`, `address`, `updated_at!`

**membership_transfers** — `id!`, `member_id!` → members (CASCADE), `from_concelhia_id!`, `to_concelhia_id!` → concelhias (RESTRICT), `requested_by_profile_id!` → profiles (SET NULL), `created_at!`

**member_number_sequences** — `district_id!` → districts (RESTRICT), `last_value int!` (padrão 0). Usada por `generate_member_number`.

### Estrutura
**districts** — `id!`, `code varchar(2)!` (único), `name!`, `created_at!`

**concelhias** — `id!`, `district_id!` → districts (RESTRICT), `name!`, `slug varchar(120)!` (único), `active bool!` (padrão `false`), `moderator_profile_id` → profiles (SET NULL), `contact_email`, `instagram_handle`, `created_at!`, `updated_at!`

**national_body_positions** — `id!`, `title!`, `display_order int!`, `body_key text!` (padrão `cpn`)

**national_body_members** — `id!`, `position_id!` → national_body_positions (CASCADE), `full_name!`, `photo_url`, `start_date!`, `end_date`, `created_at!`

**previous_leaders** — `id!`, `full_name!`, `photo_url`, `start_date!`, `end_date!`, `display_order int!`

### Conteúdo
**news** («Atividades») — `id!`, `title!`, `summary`, `body`, `image_url`, `category!` (padrão `noticia`), `external_link`, `status!` (padrão `rascunho`; publicado = `publicado`), `slug`, `published_at date!`, `created_by_profile_id` → profiles, `created_at!`

**events** — `id!`, `title!`, `description`, `location`, `starts_at!`, `ends_at`, `concelhia_id` → concelhias (SET NULL), `created_by_profile_id` → profiles (SET NULL), `is_public bool!` (padrão `false`), `external_link`, `created_at!`

**public_documents** — `id!`, `title!`, `category!` (`convocatoria`/`estatuto`/`minuta`/`resolucao`/`outro`), `storage_path!`, `version int!`, `supersedes_id`, `uploaded_by_profile_id` → profiles (SET NULL), `published_at!`

**communications** — `id!`, `title!`, `body!`, `segment_district_id` → districts, `segment_concelhia_id` → concelhias, `sent_by_profile_id` → profiles, `sent_at`, `brevo_campaign_id int`, `open_rate numeric(5,2)`, `created_at!`

### Loja
**products** — `id!`, `name!`, `description`, `price_cents int!`, `stock int!`, `image_url`, `images text[]!`, `category`, `slug varchar(80)` (único), `active bool!` (padrão `true`), `created_at!`

**orders** — `id!`, `profile_id` → profiles (RESTRICT), `guest_name`, `guest_email`, `status!` (`pendente`/`enviado`/`entregue`/`cancelado`), `total_cents int!`, `shipping_address jsonb!`, `stripe_session_id` (único), `created_at!`, `updated_at!`

**order_items** — `id!`, `order_id!` → orders (CASCADE), `product_id!` → products (RESTRICT), `quantity int!`, `unit_price_cents int!`

### Sistema
**audit_log** — `id!`, `profile_id` → profiles (SET NULL), `action audit_action!`, `entity_type varchar(60)!`, `entity_id`, `metadata jsonb`, `ip_address varchar(45)`, `created_at!`

**sync_outbox** — `id!`, `event_type!`, `entity_id!`, `payload jsonb!`, `status!` (`pendente`/`processado`/`falhado`), `attempts int!`, `last_error`, `eligible_at!`, `created_at!`, `processed_at`

**email_queue** — `id!`, `template_key varchar(80)!`, `to_email!`, `to_name!`, `params jsonb!`, `status!` (`pendente`/`enviado`/`falhado`), `attempts int!`, `eligible_at!`, `last_error`, `created_at!`, `sent_at`

**email_templates** — `id!`, `key varchar(80)!` (único), `subject!`, `brevo_template_id int!`, `updated_at!`

**feature_flags** — `key varchar(80)!`, `enabled bool!`, `description`, `updated_at!`

## Funções-chave

- **`approve_membership_transaction(request_id, reviewer_id)`** (SECURITY DEFINER, numa transação): bloqueia o pedido; recusa se já foi processado ou se `citizen_card_number` não foi preenchido na revisão; cria o utilizador em `auth.users` (só email, sem palavra-passe), o `profiles` (`militante`, com o distrito da concelhia), o `members` com número gerado, o `member_sensitive_data`; marca o pedido `aprovado` e regista em `audit_log`.
- **`generate_member_number(district_id)`**: formato **`<código do distrito>-<sequência com 6 dígitos>`** (ex.: `11-000042`), com contador atómico em `member_number_sequences`.
- **`auth_role()`, `auth_district_id()`, `auth_moderated_concelhia_ids()`, `auth_is_national_staff()`** (SECURITY DEFINER): usadas pelas políticas RLS. `auth_is_national_staff()` = papel em (`cpn`, `administrador`, `moderador_nacional`).
- **`prevent_self_privilege_escalation`** (trigger em `profiles`): ninguém altera o próprio `role` nem `district_id`; só a CPN atribui `administrador` ou `cpn`.
- **`handle_new_admin_user`** (trigger em `auth.users`): cria o perfil (`simpatizante`) quando nasce um utilizador Auth.
- `get_stats_*` (estatísticas), `adjust_product_stock`, `bulk_import_member`, `enqueue_*` (outbox/emails).

## Políticas RLS (resumo)

| Tabela | Leitura | Escrita |
|---|---|---|
| `districts`, `concelhias`, `events`, `national_body_*`, `previous_leaders`, `public_documents`, `feature_flags` | **Qualquer pessoa** (incl. anónimos) | Pessoal nacional (`feature_flags`: só `cpn`/`administrador`) |
| `concelhias` | — | Também **moderador distrital** pode `UPDATE` as concelhias do seu distrito |
| `events` | — | Pessoal nacional; moderador distrital/concelhio pode **criar** eventos no seu âmbito |
| `news` | Publicadas (`status='publicado'`) para todos; rascunhos só pessoal nacional | Pessoal nacional |
| `products` | Ativos para todos; todos para pessoal nacional | Pessoal nacional |
| `profiles` | O próprio; moderador distrital (mesmo distrito); moderador concelhio (membros das suas concelhias); pessoal nacional | O próprio (`UPDATE`); pessoal nacional |
| `members` | O próprio; moderador distrital/concelhio (âmbito); pessoal nacional | Pessoal nacional |
| `membership_requests` | Pessoal nacional; moderadores distrital/concelhio (âmbito) | Pessoal nacional |
| `member_sensitive_data` | **Só `cpn` e `administrador`** | **Só `cpn` e `administrador`** |
| `membership_transfers`, `communications`, `email_templates`, `email_queue` (leitura), `audit_log` (leitura) | Pessoal nacional | Pessoal nacional (`audit_log`: cada utilizador só insere linhas com o seu `profile_id`) |
| `orders` | O próprio comprador; pessoal nacional | Insert do próprio; `UPDATE` pessoal nacional |
| `order_items` | Via encomenda própria; pessoal nacional | Pessoal nacional |
| `sync_outbox` | Sem políticas (só *service role*) | Sem políticas (só *service role*) |

### Storage (`storage.objects`)
- `documentos-identificacao` (privado): ler, inserir e apagar **só pessoal nacional**. O site público grava com a *service role*.
- `documentos-publicos`: escrever/inserir/apagar só `administrador` e `cpn`.

> **Nota:** «pessoal nacional» inclui `moderador_nacional`. Por RLS, este papel pode escrever em `members`, `membership_requests` e `profiles` (a trigger bloqueia apenas a atribuição de `administrador`/`cpn`). As restrições mais finas (por exemplo, só administradores aprovam) estão nas Server Actions — ver `docs/PAPEIS-E-PERMISSOES.md`.
