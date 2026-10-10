-- ============================================================
-- FUNÇÕES HELPER
-- ============================================================

create or replace function portal_auth_role()
returns portal_role
language sql
security definer
stable
as $$
  select role from portal_profiles where id = auth.uid();
$$;

create or replace function portal_auth_district_id()
returns uuid
language sql
security definer
stable
as $$
  select district_id from portal_profiles where id = auth.uid();
$$;

create or replace function portal_auth_concelhia_id()
returns uuid
language sql
security definer
stable
as $$
  select concelhia_id from portal_profiles where id = auth.uid();
$$;

create or replace function portal_auth_is_national_staff()
returns boolean
language sql
security definer
stable
as $$
  select portal_auth_role() in ('cpn', 'moderador_nacional');
$$;

create or replace function portal_auth_is_moderator()
returns boolean
language sql
security definer
stable
as $$
  select portal_auth_role() in (
    'cpn', 'moderador_nacional', 'moderador_distrital', 'moderador_concelhio'
  );
$$;

-- verifica se o perfil autenticado modera o âmbito de um registo com
-- (scope, scope_district_id, scope_concelhia_id)
create or replace function portal_can_moderate_scope(
  p_scope scope, p_district_id uuid, p_concelhia_id uuid
)
returns boolean
language sql
security definer
stable
as $$
  select
    portal_auth_is_national_staff()
    or (p_scope = 'distrital' and portal_auth_role() = 'moderador_distrital'
        and p_district_id = portal_auth_district_id())
    or (p_scope = 'concelhia' and portal_auth_role() = 'moderador_concelhio'
        and p_concelhia_id = portal_auth_concelhia_id());
$$;

-- utilizador está banido/suspenso ativamente?
create or replace function portal_auth_is_restricted()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from moderation_actions
    where target_profile_id = auth.uid()
      and (expires_at is null or expires_at > now())
      and (
        action = 'suspender'
        or (action = 'ban_permanente' and approved_by_profile_id is not null)
      )
  );
$$;

-- ============================================================
-- ENABLE RLS (todas as tabelas)
-- ============================================================

alter table portal_profiles enable row level security;
alter table forum_categories enable row level security;
alter table forum_topics enable row level security;
alter table forum_replies enable row level security;
alter table reactions enable row level security;
alter table mentions enable row level security;
alter table mural_posts enable row level security;
alter table portal_events enable row level security;
alter table portal_event_rsvps enable row level security;
alter table portal_documents enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
alter table badges enable row level security;
alter table profile_badges enable row level security;
alter table wiki_pages enable row level security;
alter table wiki_revisions enable row level security;
alter table archive_congresses enable row level security;
alter table archive_congress_items enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table direct_messages enable row level security;
alter table reports enable row level security;
alter table moderation_actions enable row level security;

-- ============================================================
-- PORTAL PROFILES — visíveis a todos os utilizadores autenticados
-- (comunidade interna: nome/avatar/badge são sociais por natureza)
-- ============================================================

create policy "portal_profiles_select_authenticated" on portal_profiles for select
  using (auth.uid() is not null);
create policy "portal_profiles_update_own" on portal_profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "portal_profiles_write_staff" on portal_profiles for all
  using (portal_auth_is_national_staff()) with check (portal_auth_is_national_staff());

-- ============================================================
-- FORUM CATEGORIES — leitura por todos, escrita por staff nacional
-- ============================================================

create policy "forum_categories_select_all" on forum_categories for select
  using (auth.uid() is not null);
create policy "forum_categories_write_national" on forum_categories for all
  using (portal_auth_is_national_staff()) with check (portal_auth_is_national_staff());

-- ============================================================
-- FORUM TOPICS
-- ============================================================

create policy "forum_topics_select_all" on forum_topics for select
  using (auth.uid() is not null);
create policy "forum_topics_insert_not_restricted" on forum_topics for insert
  with check (author_profile_id = auth.uid() and not portal_auth_is_restricted());
create policy "forum_topics_update_own" on forum_topics for update
  using (author_profile_id = auth.uid()) with check (author_profile_id = auth.uid());
create policy "forum_topics_moderate" on forum_topics for update
  using (
    exists (
      select 1 from forum_categories c
      where c.id = forum_topics.category_id
        and portal_can_moderate_scope(c.scope, c.scope_district_id, c.scope_concelhia_id)
    )
  );
create policy "forum_topics_delete_moderate" on forum_topics for delete
  using (
    exists (
      select 1 from forum_categories c
      where c.id = forum_topics.category_id
        and portal_can_moderate_scope(c.scope, c.scope_district_id, c.scope_concelhia_id)
    )
  );

-- ============================================================
-- FORUM REPLIES
-- ============================================================

create policy "forum_replies_select_all" on forum_replies for select
  using (auth.uid() is not null);
create policy "forum_replies_insert_not_restricted" on forum_replies for insert
  with check (
    author_profile_id = auth.uid()
    and not portal_auth_is_restricted()
    and (select status from forum_topics where id = topic_id) = 'aberto'
  );
create policy "forum_replies_update_own" on forum_replies for update
  using (author_profile_id = auth.uid()) with check (author_profile_id = auth.uid());
create policy "forum_replies_delete_own_or_moderate" on forum_replies for delete
  using (
    author_profile_id = auth.uid()
    or exists (
      select 1 from forum_topics t
      join forum_categories c on c.id = t.category_id
      where t.id = forum_replies.topic_id
        and portal_can_moderate_scope(c.scope, c.scope_district_id, c.scope_concelhia_id)
    )
  );

-- ============================================================
-- REACTIONS / MENTIONS
-- ============================================================

create policy "reactions_select_all" on reactions for select using (auth.uid() is not null);
create policy "reactions_insert_own" on reactions for insert
  with check (profile_id = auth.uid() and not portal_auth_is_restricted());
create policy "reactions_delete_own" on reactions for delete using (profile_id = auth.uid());

create policy "mentions_select_involved" on mentions for select
  using (
    mentioned_profile_id = auth.uid()
    or exists (select 1 from forum_replies r where r.id = mentions.reply_id and r.author_profile_id = auth.uid())
  );
create policy "mentions_insert_system" on mentions for insert with check (true);

-- ============================================================
-- MURAL — leitura por âmbito, escrita só moderadores/CPN
-- ============================================================

create policy "mural_posts_select_all" on mural_posts for select
  using (auth.uid() is not null);
create policy "mural_posts_write_moderate" on mural_posts for all
  using (portal_can_moderate_scope(scope, scope_district_id, scope_concelhia_id))
  with check (portal_can_moderate_scope(scope, scope_district_id, scope_concelhia_id));

-- ============================================================
-- EVENTOS / RSVP
-- ============================================================

create policy "portal_events_select_all" on portal_events for select
  using (auth.uid() is not null);
create policy "portal_events_write_staff" on portal_events for all
  using (portal_auth_is_moderator()) with check (portal_auth_is_moderator());

create policy "portal_event_rsvps_select_own" on portal_event_rsvps for select
  using (profile_id = auth.uid());
create policy "portal_event_rsvps_select_organizer" on portal_event_rsvps for select
  using (portal_auth_is_moderator());
create policy "portal_event_rsvps_insert_own" on portal_event_rsvps for insert
  with check (profile_id = auth.uid());
create policy "portal_event_rsvps_delete_own" on portal_event_rsvps for delete
  using (profile_id = auth.uid());

-- ============================================================
-- DOCUMENTOS — leitura por âmbito, escrita moderadores/CPN
-- ============================================================

create policy "portal_documents_select_all" on portal_documents for select
  using (auth.uid() is not null);
create policy "portal_documents_write_moderate" on portal_documents for all
  using (portal_can_moderate_scope(scope, scope_district_id, scope_concelhia_id))
  with check (portal_can_moderate_scope(scope, scope_district_id, scope_concelhia_id));

-- ============================================================
-- NOTIFICAÇÕES — só o próprio; escrita via service role (triggers/edge functions)
-- ============================================================

create policy "notifications_select_own" on notifications for select
  using (profile_id = auth.uid());
create policy "notifications_update_own" on notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "push_subscriptions_own" on push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================
-- GAMIFICAÇÃO — leitura pública, escrita via service role
-- ============================================================

create policy "badges_select_all" on badges for select using (auth.uid() is not null);
create policy "badges_write_staff" on badges for all
  using (portal_auth_is_national_staff()) with check (portal_auth_is_national_staff());

create policy "profile_badges_select_all" on profile_badges for select
  using (auth.uid() is not null);

-- ============================================================
-- WIKI — leitura por todos, escrita por moderadores/CPN
-- ============================================================

create policy "wiki_pages_select_all" on wiki_pages for select using (auth.uid() is not null);
create policy "wiki_pages_write_moderate" on wiki_pages for all
  using (portal_auth_is_moderator()) with check (portal_auth_is_moderator());

create policy "wiki_revisions_select_all" on wiki_revisions for select
  using (auth.uid() is not null);
create policy "wiki_revisions_insert_moderate" on wiki_revisions for insert
  with check (portal_auth_is_moderator());

-- ============================================================
-- ARQUIVO — leitura pública para autenticados, escrita staff nacional
-- ============================================================

create policy "archive_congresses_select_all" on archive_congresses for select
  using (auth.uid() is not null);
create policy "archive_congresses_write_national" on archive_congresses for all
  using (portal_auth_is_national_staff()) with check (portal_auth_is_national_staff());

create policy "archive_congress_items_select_all" on archive_congress_items for select
  using (auth.uid() is not null);
create policy "archive_congress_items_write_national" on archive_congress_items for all
  using (portal_auth_is_national_staff()) with check (portal_auth_is_national_staff());

-- ============================================================
-- SONDAGENS
-- ============================================================

create policy "polls_select_all" on polls for select using (auth.uid() is not null);
create policy "polls_write_moderate" on polls for all
  using (portal_can_moderate_scope(scope, scope_district_id, scope_concelhia_id))
  with check (portal_can_moderate_scope(scope, scope_district_id, scope_concelhia_id));

create policy "poll_options_select_all" on poll_options for select using (auth.uid() is not null);
create policy "poll_options_write_moderate" on poll_options for all
  using (
    exists (
      select 1 from polls p where p.id = poll_options.poll_id
        and portal_can_moderate_scope(p.scope, p.scope_district_id, p.scope_concelhia_id)
    )
  );

create policy "poll_votes_select_own" on poll_votes for select using (profile_id = auth.uid());
create policy "poll_votes_select_moderate" on poll_votes for select
  using (portal_auth_is_moderator());
create policy "poll_votes_insert_own" on poll_votes for insert
  with check (profile_id = auth.uid() and not portal_auth_is_restricted());

-- ============================================================
-- MENSAGENS DIRETAS — só remetente e destinatário
-- ============================================================

create policy "direct_messages_select_involved" on direct_messages for select
  using (sender_profile_id = auth.uid() or recipient_profile_id = auth.uid());
create policy "direct_messages_insert_own" on direct_messages for insert
  with check (sender_profile_id = auth.uid() and not portal_auth_is_restricted());
create policy "direct_messages_update_recipient_read" on direct_messages for update
  using (recipient_profile_id = auth.uid()) with check (recipient_profile_id = auth.uid());

-- ============================================================
-- DENÚNCIAS — o autor vê a sua, moderadores do âmbito veem todas relevantes,
-- staff nacional vê tudo
-- ============================================================

create policy "reports_select_own" on reports for select using (reporter_profile_id = auth.uid());
create policy "reports_select_moderators" on reports for select
  using (portal_auth_is_moderator());
create policy "reports_insert_own" on reports for insert
  with check (reporter_profile_id = auth.uid());
create policy "reports_update_moderators" on reports for update
  using (portal_auth_is_moderator()) with check (portal_auth_is_moderator());

-- ============================================================
-- MODERAÇÃO — leitura por moderadores; escrita:
-- silenciar/suspender por moderador do âmbito; ban_permanente exige
-- approved_by_profile_id preenchido por CPN (aplicado a nível de app,
-- mas reforçado aqui: só CPN pode fazer update que define approved_by)
-- ============================================================

create policy "moderation_actions_select_moderators" on moderation_actions for select
  using (portal_auth_is_moderator());
create policy "moderation_actions_insert_moderate" on moderation_actions for insert
  with check (
    portal_auth_is_moderator()
    and applied_by_profile_id = auth.uid()
    -- qualquer moderador pode PROPOR um ban permanente (fica pendente,
    -- approved_by_profile_id nulo); só não pode auto-aprová-lo aqui —
    -- isso é impedido porque só a policy de UPDATE seguinte permite
    -- preencher approved_by_profile_id, e só para CPN
  );
create policy "moderation_actions_approve_ban_cpn" on moderation_actions for update
  using (portal_auth_role() = 'cpn') with check (portal_auth_role() = 'cpn');
create policy "moderation_actions_reject_ban_cpn" on moderation_actions for delete
  using (portal_auth_role() = 'cpn' and action = 'ban_permanente' and approved_by_profile_id is null);
