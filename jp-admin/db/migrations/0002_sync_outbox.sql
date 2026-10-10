-- ============================================================
-- OUTBOX: eventos a propagar do Projeto A (militância) para o
-- Projeto B (portal). Garante entrega fiável mesmo que o portal
-- esteja indisponível no momento da aprovação.
-- ============================================================

create type sync_event_type as enum (
  'member_approved',
  'member_revoked',
  'member_transferred',
  'event_upserted',
  'event_deleted'
);

create type sync_event_status as enum ('pendente', 'processado', 'falhado');

create table sync_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type sync_event_type not null,
  entity_id uuid not null, -- member.id ou event.id, consoante event_type
  payload jsonb not null,
  status sync_event_status not null default 'pendente',
  attempts integer not null default 0,
  last_error text,
  eligible_at timestamptz not null default now(), -- backoff: só reprocessar a partir daqui
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index sync_outbox_status_idx on sync_outbox (status, eligible_at);

alter table sync_outbox enable row level security;

-- só o service role (usado pelo processador) acede; sem policy para utilizadores
-- autenticados, logo RLS bloqueia tudo por defeito.

-- ------------------------------------------------------------
-- Função + trigger: ao aprovar um militante (insert em members),
-- enfileira o evento na MESMA transação da aprovação.
-- ------------------------------------------------------------

create or replace function enqueue_member_approved()
returns trigger
language plpgsql
as $$
declare
  v_profile profiles%rowtype;
  v_concelhia concelhias%rowtype;
begin
  select * into v_profile from profiles where id = new.profile_id;
  select * into v_concelhia from concelhias where id = new.concelhia_id;

  insert into sync_outbox (event_type, entity_id, payload)
  values (
    'member_approved',
    new.id,
    jsonb_build_object(
      'member_id', new.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'member_number', new.member_number,
      'concelhia_id', new.concelhia_id,
      'district_id', v_concelhia.district_id,
      'joined_at', new.joined_at
    )
  );
  return new;
end;
$$;

create trigger trg_enqueue_member_approved
  after insert on members
  for each row
  execute function enqueue_member_approved();

-- ------------------------------------------------------------
-- Função + trigger: ao revogar (status -> 'revogado') ou reativar
-- ------------------------------------------------------------

create or replace function enqueue_member_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and new.status = 'revogado' then
    insert into sync_outbox (event_type, entity_id, payload)
    values (
      'member_revoked',
      new.id,
      jsonb_build_object(
        'member_id', new.id,
        'revoked_reason', new.revoked_reason
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_enqueue_member_status_change
  after update of status on members
  for each row
  execute function enqueue_member_status_change();

-- ------------------------------------------------------------
-- Função + trigger: transferência de concelhia
-- ------------------------------------------------------------

create or replace function enqueue_member_transferred()
returns trigger
language plpgsql
as $$
begin
  insert into sync_outbox (event_type, entity_id, payload)
  values (
    'member_transferred',
    new.member_id,
    jsonb_build_object(
      'member_id', new.member_id,
      'to_concelhia_id', new.to_concelhia_id
    )
  );
  return new;
end;
$$;

create trigger trg_enqueue_member_transferred
  after insert on membership_transfers
  for each row
  execute function enqueue_member_transferred();

-- ------------------------------------------------------------
-- Função + trigger: evento criado/editado -> propaga para o Portal
-- ------------------------------------------------------------

create or replace function enqueue_event_upserted()
returns trigger
language plpgsql
as $$
begin
  insert into sync_outbox (event_type, entity_id, payload)
  values (
    'event_upserted',
    new.id,
    jsonb_build_object(
      'event_id', new.id,
      'title', new.title,
      'description', new.description,
      'location', new.location,
      'starts_at', new.starts_at,
      'ends_at', new.ends_at,
      'concelhia_id', new.concelhia_id
    )
  );
  return new;
end;
$$;

create trigger trg_enqueue_event_upserted
  after insert or update on events
  for each row
  execute function enqueue_event_upserted();

-- ------------------------------------------------------------
-- Função + trigger: evento eliminado -> propaga eliminação
-- ------------------------------------------------------------

create or replace function enqueue_event_deleted()
returns trigger
language plpgsql
as $$
begin
  insert into sync_outbox (event_type, entity_id, payload)
  values ('event_deleted', old.id, jsonb_build_object('event_id', old.id));
  return old;
end;
$$;

create trigger trg_enqueue_event_deleted
  before delete on events
  for each row
  execute function enqueue_event_deleted();
