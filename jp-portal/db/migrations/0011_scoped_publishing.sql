-- Registo da migration `scoped_publishing_for_moderators`, aplicada diretamente em produção
-- a 2026-09-30 (Supabase). Modelo: CPN publica em qualquer âmbito (única a publicar a nível
-- nacional); moderador distrital publica no seu distrito; concelhio na sua concelhia;
-- moderador nacional só modera. Wiki e arquivo continuam só CPN (portal_can_publish).

create or replace function public.portal_can_publish_scope(p_scope scope, p_district_id uuid, p_concelhia_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    portal_auth_role() = 'cpn'
    or (p_scope = 'distrital' and p_district_id is not null and portal_auth_role() = 'moderador_distrital'
        and p_district_id = portal_auth_district_id())
    or (p_scope = 'concelhia' and p_concelhia_id is not null and portal_auth_role() = 'moderador_concelhio'
        and p_concelhia_id = portal_auth_concelhia_id());
$$;

revoke execute on function public.portal_can_publish_scope(scope, uuid, uuid) from public, anon;
grant execute on function public.portal_can_publish_scope(scope, uuid, uuid) to authenticated;

drop policy if exists mural_posts_insert_publish on public.mural_posts;
create policy mural_posts_insert_publish on public.mural_posts for insert
  with check (author_profile_id = auth.uid()
              and portal_can_publish_scope(scope, scope_district_id, scope_concelhia_id));

drop policy if exists polls_insert_publish on public.polls;
create policy polls_insert_publish on public.polls for insert
  with check (created_by_profile_id = auth.uid()
              and portal_can_publish_scope(scope, scope_district_id, scope_concelhia_id));

drop policy if exists poll_options_insert_publish on public.poll_options;
create policy poll_options_insert_publish on public.poll_options for insert
  with check (exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
      and p.created_by_profile_id = auth.uid()
      and portal_can_publish_scope(p.scope, p.scope_district_id, p.scope_concelhia_id)));

drop policy if exists portal_documents_insert_publish on public.portal_documents;
create policy portal_documents_insert_publish on public.portal_documents for insert
  with check (uploaded_by_profile_id = auth.uid()
              and portal_can_publish_scope(scope, scope_district_id, scope_concelhia_id));

drop policy if exists forum_categories_insert_scoped on public.forum_categories;
create policy forum_categories_insert_scoped on public.forum_categories for insert
  with check (portal_can_publish_scope(scope, scope_district_id, scope_concelhia_id));
drop policy if exists forum_categories_delete_scoped on public.forum_categories;
create policy forum_categories_delete_scoped on public.forum_categories for delete
  using (portal_can_publish_scope(scope, scope_district_id, scope_concelhia_id));
