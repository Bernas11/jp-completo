-- SEGUNDA AUDITORIA (red-team) — 2 gaps reais encontrados na correção
-- anterior (0012_prevent_self_privilege_escalation.sql), ambos
-- confirmados com ataques reais contra Postgres local:
--
-- GAP 1: um 'administrador' conseguia promover QUALQUER OUTRO utilizador
-- a 'cpn' via update direto em profiles, porque a policy
-- profiles_write_national_staff usa auth_is_national_staff() (que inclui
-- cpn/administrador/moderador_nacional) — mais permissiva do que a app
-- realmente pretende (inviteAdmin/updateAdminRole/revokeAdminAccess
-- exigem 'cpn' especificamente). O trigger anterior só verificava
-- auto-alteração (auth.uid() = old.id), nunca alterações a terceiros.
--
-- GAP 2: um 'moderador_nacional' conseguia auto-promover-se a 'cpn',
-- porque o trigger anterior só bloqueava auto-alteração quando
-- "not auth_is_national_staff()" — e moderador_nacional PASSA esse
-- teste (é considerado "national staff"), pelo que o bloqueio nunca
-- disparava para este role especificamente.
--
-- Regra correta, validada contra o comportamento real das actions:
--   1. NINGUÉM pode alterar o PRÓPRIO role via update direto — sem
--      exceções. Alterações de role são sempre uma ação sobre outra
--      pessoa (admins.ts), nunca sobre si próprio.
--   2. Só 'cpn' pode definir o role de QUALQUER pessoa (própria ou
--      terceiros) como 'administrador' ou 'cpn'. Promoções a roles de
--      moderação (moderador_concelhio/distrital/nacional) continuam
--      permitidas a quem já passa na policy RLS de escrita nacional —
--      preserva o fluxo legítimo de assignConcelhiaModerator
--      (administrador promove alguém a moderador_concelhio).

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. ninguém altera o próprio role, nunca, seja qual for o role atual
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Não é permitido alterar o próprio role.';
  end if;

  -- 1b. idem para district_id — sem uso legítimo de auto-atribuição
  if auth.uid() = old.id and new.district_id is distinct from old.district_id then
    raise exception 'Não é permitido alterar o próprio distrito.';
  end if;

  -- 2. só 'cpn' pode conceder 'administrador' ou 'cpn' a alguém,
  --    própria conta ou terceiros
  if new.role is distinct from old.role
     and new.role in ('administrador', 'cpn')
     and auth_role() <> 'cpn' then
    raise exception 'Só a CPN pode atribuir o role de administrador ou cpn.';
  end if;

  return new;
end;
$$;
