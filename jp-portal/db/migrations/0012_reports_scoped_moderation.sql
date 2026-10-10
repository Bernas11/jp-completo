-- Registo da migration `reports_scoped_moderation_and_notification_type` (aplicada em produção
-- a 2026-10-01). Denúncias passam a ser visíveis/resolúveis só por moderadores com âmbito sobre
-- o conteúdo; novo tipo de notificação `nova_denuncia` para avisar os moderadores.
alter type notification_type add value if not exists 'nova_denuncia';

create or replace function public.portal_can_moderate_report(p_entity_type text, p_entity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select portal_can_moderate_scope(c.scope, c.scope_district_id, c.scope_concelhia_id)
    from forum_topics t join forum_categories c on c.id = t.category_id
    where p_entity_type = 'forum_topic' and t.id = p_entity_id
    union all
    select portal_can_moderate_scope(c.scope, c.scope_district_id, c.scope_concelhia_id)
    from forum_replies r join forum_topics t on t.id = r.topic_id join forum_categories c on c.id = t.category_id
    where p_entity_type = 'forum_reply' and r.id = p_entity_id
    union all
    select portal_can_moderate_scope(m.scope, m.scope_district_id, m.scope_concelhia_id)
    from mural_posts m where p_entity_type = 'mural_post' and m.id = p_entity_id
    limit 1
  ), false);
$$;
revoke execute on function public.portal_can_moderate_report(text, uuid) from public, anon;
grant execute on function public.portal_can_moderate_report(text, uuid) to authenticated;

drop policy if exists reports_select_moderators on public.reports;
create policy reports_select_moderators on public.reports for select
  using (portal_auth_is_moderator() and portal_can_moderate_report(entity_type::text, entity_id));
drop policy if exists reports_update_moderators on public.reports;
create policy reports_update_moderators on public.reports for update
  using (portal_auth_is_moderator() and portal_can_moderate_report(entity_type::text, entity_id));
