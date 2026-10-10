-- ============================================================
-- 1) PORTAL_PROFILES: faltava a policy de insert para o próprio
-- utilizador. Sem isto, getOrCreateProfile() nunca conseguia
-- provisionar um simpatizante novo — a policy "portal_profiles_write_staff"
-- só cobre staff nacional, e não havia nenhuma policy de insert para
-- "id = auth.uid()".
-- ============================================================

create policy "portal_profiles_insert_own" on portal_profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- 2) CATÁLOGO GEOGRÁFICO — cache local de distritos/concelhias,
-- sincronizado a partir do Projeto A. Nunca tinha sido criado neste
-- projeto, apesar de várias queries já assumirem a sua existência
-- (concelhias!portal_profiles_concelhia_id_fkey, etc.)
-- ============================================================

create table if not exists districts (
  id uuid primary key,
  code varchar(2) not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists concelhias (
  id uuid primary key,
  district_id uuid references districts(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists concelhias_district_idx on concelhias (district_id);

alter table districts enable row level security;
alter table concelhias enable row level security;

create policy "districts_select_all" on districts for select
  using (auth.uid() is not null);
create policy "concelhias_select_all" on concelhias for select
  using (auth.uid() is not null);
-- escrita só pelo service role (usado pelo recetor de sincronização) —
-- sem policies de insert/update/delete para utilizadores autenticados.

-- liga portal_profiles à concelhia/distrito agora que as tabelas existem
-- (nomes de constraint por omissão do Postgres: <tabela>_<coluna>_fkey,
-- para bater certo com os embeds já usados no código: ex.
-- "concelhias!portal_profiles_concelhia_id_fkey")
alter table portal_profiles
  add constraint portal_profiles_concelhia_id_fkey
  foreign key (concelhia_id) references concelhias(id) on delete set null;

alter table portal_profiles
  add constraint portal_profiles_district_id_fkey
  foreign key (district_id) references districts(id) on delete set null;

-- ============================================================
-- 3) APROVAÇÕES DE MILITÂNCIA PENDENTES — staging para quando o
-- Projeto A aprova um email que ainda nunca fez login no Portal.
-- ============================================================

create table if not exists pending_member_approvals (
  email text primary key,
  member_id uuid not null,
  full_name text not null,
  member_number varchar(16) not null,
  concelhia_id uuid,
  district_id uuid,
  joined_member_at date,
  created_at timestamptz not null default now()
);

alter table pending_member_approvals enable row level security;
-- só o service role acede (recetor de sincronização + getOrCreateProfile
-- no primeiro login); sem policies para utilizadores autenticados.

-- ============================================================
-- 4) PORTAL_EVENTS: precisa de unicidade em source_event_id para o
-- upsert (onConflict) do recetor /api/sync/event funcionar.
-- ============================================================

alter table portal_events
  add constraint portal_events_source_event_id_key unique (source_event_id);

