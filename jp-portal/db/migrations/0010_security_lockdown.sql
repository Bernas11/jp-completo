-- Registo da migration `security_lockdown_profiles_and_definer_triggers`, aplicada
-- diretamente em produção a 2026-09-29 (Supabase). Idempotente: é seguro correr de novo.
-- Corrige: (1) qualquer utilizador podia pôr-se como CPN (update/insert em portal_profiles);
-- (2) triggers de medalhas e de avisos do mural falhavam por RLS (fórum, presenças, mural).

revoke insert, update, delete, truncate on public.portal_profiles from anon;
revoke update on public.portal_profiles from authenticated;
grant update (display_name, bio, avatar_url, dark_mode, weekly_digest_opt_in, terms_accepted_at, updated_at)
  on public.portal_profiles to authenticated;

create or replace function public.portal_profiles_guard_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_pending pending_member_approvals%rowtype;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  new.id := auth.uid();
  new.email := coalesce(v_email, lower(new.email));

  select * into v_pending from pending_member_approvals where email = new.email;

  if found then
    new.role := v_pending.role;
    new.member_id := v_pending.member_id;
    new.member_number := v_pending.member_number;
    new.concelhia_id := v_pending.concelhia_id;
    new.district_id := v_pending.district_id;
    new.joined_member_at := v_pending.joined_member_at;
  else
    new.role := 'simpatizante';
    new.member_id := null;
    new.member_number := null;
    new.concelhia_id := null;
    new.district_id := null;
    new.joined_member_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.portal_profiles_guard_insert() from public, anon, authenticated;

drop trigger if exists trg_portal_profiles_guard_insert on public.portal_profiles;
create trigger trg_portal_profiles_guard_insert
  before insert on public.portal_profiles
  for each row execute function public.portal_profiles_guard_insert();

alter function public.award_badge_if_missing(uuid, text) security definer;
alter function public.check_forum_participation_badges() security definer;
alter function public.check_event_participation_badges() security definer;
alter function public.notify_mural_post() security definer;

revoke execute on function public.award_badge_if_missing(uuid, text) from public, anon, authenticated;
revoke execute on function public.check_forum_participation_badges() from public, anon, authenticated;
revoke execute on function public.check_event_participation_badges() from public, anon, authenticated;
revoke execute on function public.notify_mural_post() from public, anon, authenticated;
