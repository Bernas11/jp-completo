# Operações

> Projeto em estado de protótipo — ver [`ARQUIVO.md`](ARQUIVO.md). Estes procedimentos aplicam-se se o ambiente for reposto.

## Criar a primeira conta CPN (base vazia)

1. Supabase → projeto `jp-militancia` → **Authentication → Users → Add user → Create new user**, com *Auto Confirm User*.
2. O trigger `on_auth_user_created` cria o perfil como `simpatizante`. No **SQL Editor**:

```sql
update public.profiles
set role = 'cpn', cargo = 'Presidente'
where email = 'EMAIL@exemplo.pt';
```

3. Abrir o `jp-admin` → `/login`. No primeiro acesso, ler o **QR code** com uma app de autenticação e confirmar o código de 6 dígitos (TOTP obrigatório). Preencher `cargo` no SQL evita o ecrã de *onboarding*.
4. Novos administradores são convidados depois, por email, em **Administradores** (só a CPN).

## Limpar dados de teste

Na `jp-militancia`, por esta ordem (respeita as chaves estrangeiras):

```sql
delete from email_queue;
delete from sync_outbox;
delete from communications;
delete from audit_log;
delete from member_sensitive_data;
delete from membership_transfers;
delete from members;
delete from membership_requests;
delete from member_number_sequences;   -- reinicia a numeração de militantes
delete from news;
-- opcional: contas (cuidado, deixa o admin sem acessos)
-- delete from auth.users;  delete from profiles;
```

Na `jp-portal`:

```sql
delete from pending_member_approvals;
delete from reports;
delete from sync_log;
-- opcional: delete from portal_profiles;  delete from auth.users;
```

Não apagar os dados de referência (ver `docs/BASE-DE-DADOS.md`).

## Apagar ficheiros do Storage

O Supabase **bloqueia** `delete from storage.objects` por SQL. Usa o painel (Storage → bucket → selecionar → Delete) ou o script:

```bash
npm i @supabase/supabase-js
: "${SUPABASE_URL:?Define a URL do projeto num ambiente privado}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Define a chave num ambiente privado}"
SUPABASE_URL="$SUPABASE_URL" \\
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \\
node scripts/limpar-storage.mjs
```

## Sincronização presa ou emails por enviar

```sql
-- eventos que falharam (jp-militancia)
select id, event_type, attempts, last_error from sync_outbox where status = 'falhado';
-- emails que falharam
select id, template_key, to_email, last_error from email_queue where status = 'falhado';
```

Para reprocessar, volta a pôr `status = 'pendente'` e `attempts = 0`, e chama o cron (`/api/cron/sync-outbox`, `/api/cron/email-queue`) com `Authorization: Bearer $CRON_SECRET`.

## Projeto Supabase pausado

No plano gratuito o Supabase pausa o projeto após ~7 dias sem atividade. O cron `keepalive` do portal mitiga isto para a `jp-portal`; a `jp-militancia` depende do tráfego normal. Se houver erros `504`/`ENOTFOUND`, verifica o estado do projeto no painel.
