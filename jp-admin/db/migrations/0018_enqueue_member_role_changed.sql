-- Sincroniza promoções/despromoções de role (ex: militante -> moderador_concelhio
-- em assignConcelhiaModerator, ou qualquer alteração via updateAdminRole em
-- Administradores) para o Portal. Sem isto, um moderador nomeado aqui nunca
-- ganhava poderes de moderação no Portal — portal_profiles ficava sempre
-- "militante", e a própria página /moderacao do Portal era inacessível na
-- prática, porque nenhuma conta lá tinha uma role de moderador ou CPN.
--
-- Só dispara para perfis que já são membros aprovados (existe em `members`).
-- 'administrador' (TI/Suporte Técnico-Digital) não é propagado como elevação
-- no Portal — é uma conta técnica de suporte, não uma role de moderação de
-- comunidade; ver o mapeamento no recetor (/api/sync/member no JP-Portal).
create or replace function enqueue_member_role_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  select id into v_member_id from members where profile_id = new.id;
  if v_member_id is null then
    return new; -- staff sem registo de militância (não deveria acontecer, mas não bloqueia)
  end if;

  insert into sync_outbox (event_type, entity_id, payload)
  values (
    'member_role_changed',
    v_member_id,
    jsonb_build_object(
      'member_id', v_member_id,
      'email', new.email,
      'admin_role', new.role
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_enqueue_member_role_changed on profiles;
create trigger trg_enqueue_member_role_changed
  after update of role on profiles
  for each row
  execute function enqueue_member_role_changed();
