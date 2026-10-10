-- VULNERABILIDADE CRÍTICA CORRIGIDA: privilege escalation via auto-update
--
-- A policy "profiles_update_own" (0003_rls_policies.sql) permite a
-- qualquer utilizador autenticado fazer UPDATE na sua própria linha em
-- profiles, mas o "using (id = auth.uid())" só restringe QUAL LINHA pode
-- ser alterada — não restringe QUAIS COLUNAS. Isto significa que uma
-- chamada direta à API (fora da app, sem passar pelo frontend) como:
--
--   supabase.from('profiles').update({ role: 'cpn' }).eq('id', meuId)
--
-- era aceite pela RLS, porque id = auth.uid() continua verdadeiro.
-- Qualquer "simpatizante" conseguia auto-promover-se a "cpn" (role de
-- topo) só com a anon key, sem precisar de nenhum acesso privilegiado.
--
-- RLS do Postgres não tem forma nativa de restringir colunas específicas
-- num UPDATE dentro da própria policy — a solução correta é um trigger
-- BEFORE UPDATE que compara o valor novo com o antigo.

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not auth_is_national_staff() then
    if new.role is distinct from old.role then
      raise exception 'Não é permitido alterar o próprio role.';
    end if;
    if new.district_id is distinct from old.district_id then
      raise exception 'Não é permitido alterar o próprio distrito.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on profiles;

create trigger trg_prevent_self_privilege_escalation
  before update on profiles
  for each row
  execute function public.prevent_self_privilege_escalation();
