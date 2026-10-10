-- Sem isto, criar um utilizador via Dashboard (Authentication → Users →
-- Add user) deixa-o sem linha correspondente em public.profiles, e o
-- login falha silenciosamente (getUser() encontra o user, mas o layout
-- não encontra o profile e manda sempre de volta para /login).

create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_admin_user();
