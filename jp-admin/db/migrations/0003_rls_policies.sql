-- ============================================================
-- FUNÇÕES HELPER (SECURITY DEFINER) — evitam recursão de RLS
-- ============================================================

create or replace function auth_role()
returns role
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_district_id()
returns uuid
language sql
security definer
stable
as $$
  select district_id from profiles where id = auth.uid();
$$;

create or replace function auth_is_national_staff()
returns boolean
language sql
security definer
stable
as $$
  select auth_role() in ('cpn', 'administrador', 'moderador_nacional');
$$;

-- concelhias moderadas diretamente por este perfil
create or replace function auth_moderated_concelhia_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select id from concelhias where moderator_profile_id = auth.uid();
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table districts enable row level security;
alter table concelhias enable row level security;
alter table profiles enable row level security;
alter table membership_requests enable row level security;
alter table member_number_sequences enable row level security;
alter table members enable row level security;
alter table member_sensitive_data enable row level security;
alter table membership_transfers enable row level security;
alter table national_body_positions enable row level security;
alter table national_body_members enable row level security;
alter table previous_leaders enable row level security;
alter table public_documents enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table email_templates enable row level security;
alter table communications enable row level security;
alter table events enable row level security;
-- event_rsvps não existe no Projeto A (ver nota em schema.ts)
alter table audit_log enable row level security;
alter table feature_flags enable row level security;

-- ============================================================
-- DISTRICTS / CONCELHIAS — leitura pública (site + portal), escrita CPN/Admin
-- ============================================================

create policy "districts_select_all" on districts for select using (true);
create policy "districts_write_national_staff" on districts for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

create policy "concelhias_select_all" on concelhias for select using (true);
create policy "concelhias_write_national_staff" on concelhias for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());
-- moderador distrital pode editar (não criar/eliminar) concelhias do seu distrito
create policy "concelhias_update_district_moderator" on concelhias for update
  using (auth_role() = 'moderador_distrital' and district_id = auth_district_id())
  with check (district_id = auth_district_id());

-- ============================================================
-- PROFILES
-- ============================================================

create policy "profiles_select_own" on profiles for select
  using (id = auth.uid());
create policy "profiles_select_national_staff" on profiles for select
  using (auth_is_national_staff());
create policy "profiles_select_district_staff_basic" on profiles for select
  using (
    auth_role() in ('moderador_distrital', 'moderador_concelhio')
    and district_id = auth_district_id()
  );
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_write_national_staff" on profiles for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- MEMBERSHIP REQUESTS — só staff (nunca o próprio candidato, que não tem conta aqui)
-- ============================================================

create policy "membership_requests_select_national" on membership_requests for select
  using (auth_is_national_staff());
create policy "membership_requests_select_local_staff" on membership_requests for select
  using (
    (auth_role() = 'moderador_distrital'
      and concelhia_id in (select id from concelhias where district_id = auth_district_id()))
    or (auth_role() = 'moderador_concelhio'
      and concelhia_id in (select auth_moderated_concelhia_ids()))
  );
create policy "membership_requests_write_national" on membership_requests for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- MEMBERS — perfil básico visível a staff nacional e distrital/concelhio do seu território
-- ============================================================

create policy "members_select_national" on members for select
  using (auth_is_national_staff());
create policy "members_select_own" on members for select
  using (profile_id = auth.uid());
create policy "members_select_district_basic" on members for select
  using (
    auth_role() = 'moderador_distrital'
    and concelhia_id in (select id from concelhias where district_id = auth_district_id())
  );
create policy "members_select_concelhia_basic" on members for select
  using (
    auth_role() = 'moderador_concelhio'
    and concelhia_id in (select auth_moderated_concelhia_ids())
  );
create policy "members_write_national" on members for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- MEMBER SENSITIVE DATA — EXCLUSIVO CPN/Administrador (CC nunca visível a moderadores)
-- ============================================================

create policy "member_sensitive_national_only" on member_sensitive_data for all
  using (auth_role() in ('cpn', 'administrador'))
  with check (auth_role() in ('cpn', 'administrador'));

-- ============================================================
-- TRANSFERS
-- ============================================================

create policy "membership_transfers_select_national" on membership_transfers for select
  using (auth_is_national_staff());
create policy "membership_transfers_write_national" on membership_transfers for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- ÓRGÃOS NACIONAIS — leitura pública, escrita CPN/Admin
-- ============================================================

create policy "national_body_positions_select_all" on national_body_positions for select using (true);
create policy "national_body_positions_write" on national_body_positions for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

create policy "national_body_members_select_all" on national_body_members for select using (true);
create policy "national_body_members_write" on national_body_members for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

create policy "previous_leaders_select_all" on previous_leaders for select using (true);
create policy "previous_leaders_write" on previous_leaders for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- DOCUMENTAÇÃO PÚBLICA — leitura pública, escrita CPN/Admin
-- ============================================================

create policy "public_documents_select_all" on public_documents for select using (true);
create policy "public_documents_write" on public_documents for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- PRODUTOS — leitura pública (só ativos), escrita CPN/Admin
-- ============================================================

create policy "products_select_active" on products for select using (active = true);
create policy "products_select_staff_all" on products for select using (auth_is_national_staff());
create policy "products_write" on products for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- ENCOMENDAS — o próprio vê as suas, staff vê todas
-- ============================================================

create policy "orders_select_own" on orders for select using (profile_id = auth.uid());
create policy "orders_select_staff" on orders for select using (auth_is_national_staff());
create policy "orders_insert_own" on orders for insert with check (profile_id = auth.uid());
create policy "orders_update_staff" on orders for update
  using (auth_is_national_staff()) with check (auth_is_national_staff());

create policy "order_items_select_via_order" on order_items for select
  using (
    order_id in (select id from orders where profile_id = auth.uid())
    or auth_is_national_staff()
  );
create policy "order_items_write_staff" on order_items for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- COMUNICAÇÃO — só staff nacional
-- ============================================================

create policy "email_templates_staff" on email_templates for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());
create policy "communications_staff" on communications for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());

-- ============================================================
-- EVENTOS — leitura pública, escrita staff nacional/território
-- ============================================================

create policy "events_select_all" on events for select using (true);
create policy "events_write_national" on events for all
  using (auth_is_national_staff()) with check (auth_is_national_staff());
create policy "events_write_local_staff" on events for insert
  with check (
    (auth_role() = 'moderador_distrital'
      and concelhia_id in (select id from concelhias where district_id = auth_district_id()))
    or (auth_role() = 'moderador_concelhio'
      and concelhia_id in (select auth_moderated_concelhia_ids()))
  );

-- RSVP não existe no Projeto A — ver nota em schema.ts (vive só no Portal).

-- ============================================================
-- AUDIT LOG — só leitura por staff nacional; escrita apenas via service role
-- ============================================================

create policy "audit_log_select_national" on audit_log for select
  using (auth_is_national_staff());
-- sem policy de insert para utilizadores autenticados: só service_role (bypassa RLS) grava

-- ============================================================
-- FEATURE FLAGS — leitura pública, escrita CPN/Admin
-- ============================================================

create policy "feature_flags_select_all" on feature_flags for select using (true);
create policy "feature_flags_write" on feature_flags for all
  using (auth_role() in ('cpn', 'administrador'))
  with check (auth_role() in ('cpn', 'administrador'));

-- ============================================================
-- STORAGE: bucket "documentos-publicos" (Documentação do site)
-- Criar manualmente no painel Supabase: público, sem tamanho máximo especial.
-- Policy de escrita: só utilizadores com role administrador/cpn.
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('documentos-publicos', 'documentos-publicos', true);
-- create policy "documentos_publicos_leitura" on storage.objects for select using (bucket_id = 'documentos-publicos');
-- create policy "documentos_publicos_escrita" on storage.objects for insert
--   with check (bucket_id = 'documentos-publicos' and auth_role() in ('administrador','cpn'));
