-- VULNERABILIDADE CORRIGIDA: fuga de dados cross-concelhia em profiles
--
-- A policy profiles_select_district_staff_basic usava district_id =
-- auth_district_id() para AMBOS moderador_distrital e
-- moderador_concelhio. Isto está correto para moderador_distrital (o
-- distrito é mesmo o seu âmbito), mas ERRADO para moderador_concelhio,
-- cujo âmbito real é a(s) concelhia(s) que modera
-- (auth_moderated_concelhia_ids()), não o distrito inteiro onde essa
-- concelhia se insere.
--
-- Confirmado com teste real: um moderador_concelhio que modera só a
-- "Concelhia A" conseguia ler o perfil de um militante da "Concelhia B",
-- só por as duas pertencerem ao mesmo distrito. A tabela members já
-- tinha a policy correta (members_select_concelhia_basic, usa
-- auth_moderated_concelhia_ids()) — esta corrige a mesma inconsistência
-- em profiles.

drop policy if exists "profiles_select_district_staff_basic" on profiles;

create policy "profiles_select_district_staff" on profiles for select
  using (
    auth_role() = 'moderador_distrital'
    and district_id = auth_district_id()
  );

create policy "profiles_select_concelhia_staff" on profiles for select
  using (
    auth_role() = 'moderador_concelhio'
    and id in (
      select profile_id from members
      where concelhia_id in (select auth_moderated_concelhia_ids())
    )
  );
