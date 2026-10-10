create or replace function notify_mural_post()
returns trigger
language plpgsql
as $$
begin
  insert into notifications (profile_id, type, payload)
  select
    p.id,
    'novo_aviso',
    jsonb_build_object('muralPostId', new.id, 'title', new.title)
  from portal_profiles p
  where (
    new.scope = 'nacional'
    or (new.scope = 'distrital' and p.district_id = new.scope_district_id)
    or (new.scope = 'concelhia' and p.concelhia_id = new.scope_concelhia_id)
  )
  -- não notifica o próprio autor
  and p.id <> new.author_profile_id;

  return new;
end;
$$;

create trigger trg_notify_mural_post
  after insert on mural_posts
  for each row
  execute function notify_mural_post();
