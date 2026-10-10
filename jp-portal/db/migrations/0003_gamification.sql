-- ============================================================
-- SEED de emblemas base
-- ============================================================

insert into badges (key, name, description) values
  ('primeiro_post', 'Primeiro Post', 'Publicou o primeiro tópico ou resposta no fórum'),
  ('dez_respostas', 'Voz Ativa', 'Publicou 10 respostas nos fóruns'),
  ('cem_participantes_evento', 'Mobilizador', 'Confirmou presença em 5 eventos diferentes'),
  ('primeiro_evento', 'Presente', 'Confirmou presença no primeiro evento')
on conflict (key) do nothing;

-- ============================================================
-- Atribuição automática: primeiro post (tópico ou resposta)
-- ============================================================

create or replace function award_badge_if_missing(p_profile_id uuid, p_badge_key text)
returns void
language plpgsql
as $$
declare
  v_badge_id uuid;
begin
  select id into v_badge_id from badges where key = p_badge_key;
  if v_badge_id is null then
    return;
  end if;

  insert into profile_badges (profile_id, badge_id)
  values (p_profile_id, v_badge_id)
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

create or replace function check_forum_participation_badges()
returns trigger
language plpgsql
as $$
declare
  v_reply_count integer;
begin
  perform award_badge_if_missing(new.author_profile_id, 'primeiro_post');

  select count(*) into v_reply_count
  from forum_replies
  where author_profile_id = new.author_profile_id;

  if v_reply_count >= 10 then
    perform award_badge_if_missing(new.author_profile_id, 'dez_respostas');
  end if;

  return new;
end;
$$;

create trigger trg_check_forum_participation_badges
  after insert on forum_replies
  for each row
  execute function check_forum_participation_badges();

-- ============================================================
-- Atribuição automática: participação em eventos
-- ============================================================

create or replace function check_event_participation_badges()
returns trigger
language plpgsql
as $$
declare
  v_rsvp_count integer;
begin
  perform award_badge_if_missing(new.profile_id, 'primeiro_evento');

  select count(*) into v_rsvp_count
  from portal_event_rsvps
  where profile_id = new.profile_id;

  if v_rsvp_count >= 5 then
    perform award_badge_if_missing(new.profile_id, 'cem_participantes_evento');
  end if;

  return new;
end;
$$;

create trigger trg_check_event_participation_badges
  after insert on portal_event_rsvps
  for each row
  execute function check_event_participation_badges();

-- ============================================================
-- Ranking de participação por concelhia
-- ============================================================

create or replace view ranking_participacao_concelhia as
select
  p.concelhia_id,
  count(distinct t.id) as topics_created,
  count(distinct r.id) as replies_posted,
  count(distinct rsvp.event_id) as events_attended,
  (count(distinct t.id) * 3 + count(distinct r.id) + count(distinct rsvp.event_id) * 2) as participation_score
from portal_profiles p
left join forum_topics t on t.author_profile_id = p.id
left join forum_replies r on r.author_profile_id = p.id
left join portal_event_rsvps rsvp on rsvp.profile_id = p.id
where p.concelhia_id is not null
group by p.concelhia_id
order by participation_score desc;

revoke all on ranking_participacao_concelhia from authenticated, anon;

create or replace function get_ranking_participacao_concelhia()
returns setof ranking_participacao_concelhia
language sql
security definer
stable
as $$
  select * from ranking_participacao_concelhia;
$$;

grant execute on function get_ranking_participacao_concelhia() to authenticated;
