-- ============================================================
-- SUITE DE TESTES DE REGRESSÃO DE SEGURANÇA
-- ============================================================
--
-- Captura todos os ataques validados manualmente nas auditorias de
-- segurança (1ª, 2ª e 3ª rondas). NÃO corre em CI automaticamente
-- (precisa de uma base Postgres com o schema aplicado e stubs de
-- auth.uid()/auth.users/storage.* — ver README no fim deste ficheiro).
--
-- Como correr: aplica todas as migrations a uma base de teste, depois:
--   psql -h localhost -U postgres -d <base_teste> -f este_ficheiro.sql
--
-- Cada bloco termina com um SELECT que devolve 'PASS' ou 'FAIL'.
-- Corre isto sempre que alterares RLS, funções SECURITY DEFINER, ou
-- triggers relacionados com autorização.

\set ON_ERROR_STOP off

-- ------------------------------------------------------------
-- Setup: perfis de teste com cada role relevante
-- ------------------------------------------------------------
insert into profiles (id, email, full_name, role) values
  ('e0000000-0000-0000-0000-000000000001', 'test-simpatizante@seguranca.teste', 'Teste Simpatizante', 'simpatizante'),
  ('e0000000-0000-0000-0000-000000000002', 'test-administrador@seguranca.teste', 'Teste Administrador', 'administrador'),
  ('e0000000-0000-0000-0000-000000000003', 'test-modnacional@seguranca.teste', 'Teste ModNacional', 'moderador_nacional'),
  ('e0000000-0000-0000-0000-000000000004', 'test-cpn@seguranca.teste', 'Teste CPN', 'cpn'),
  ('e0000000-0000-0000-0000-000000000005', 'test-alvo@seguranca.teste', 'Teste Alvo', 'militante')
on conflict (id) do update set role = excluded.role;

-- ------------------------------------------------------------
-- TESTE 1: simpatizante não consegue auto-promover-se
-- Esperado: FALHA (exception capturada = PASS do teste de segurança)
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);
  begin
    update profiles set role = 'cpn' where id = 'e0000000-0000-0000-0000-000000000001';
    raise notice 'TESTE 1: FAIL — simpatizante conseguiu auto-promover-se a cpn';
  exception when others then
    raise notice 'TESTE 1: PASS — auto-promoção bloqueada (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 2: administrador não consegue promover TERCEIROS a cpn
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000002', true);
  begin
    update profiles set role = 'cpn' where id = 'e0000000-0000-0000-0000-000000000005';
    raise notice 'TESTE 2: FAIL — administrador conseguiu promover terceiro a cpn';
  exception when others then
    raise notice 'TESTE 2: PASS — promoção de terceiro bloqueada (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 3: moderador_nacional não consegue auto-promover-se
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000003', true);
  begin
    update profiles set role = 'cpn' where id = 'e0000000-0000-0000-0000-000000000003';
    raise notice 'TESTE 3: FAIL — moderador_nacional conseguiu auto-promover-se';
  exception when others then
    raise notice 'TESTE 3: PASS — auto-promoção bloqueada (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 4: cpn CONSEGUE promover legitimamente (não deve bloquear)
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000004', true);
  begin
    update profiles set role = 'administrador' where id = 'e0000000-0000-0000-0000-000000000005';
    raise notice 'TESTE 4: PASS — cpn promoveu legitimamente';
    update profiles set role = 'militante' where id = 'e0000000-0000-0000-0000-000000000005'; -- reset
  exception when others then
    raise notice 'TESTE 4: FAIL — cpn devia conseguir promover, mas foi bloqueado (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 5: utilizador comum não chama approve_membership_transaction
-- diretamente (só a Edge Function, via service_role, deve conseguir)
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000004', true);
  begin
    perform approve_membership_transaction('00000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000004');
    raise notice 'TESTE 5: FAIL — RPC de aprovação chamável diretamente por authenticated';
  exception when others then
    raise notice 'TESTE 5: PASS — RPC bloqueado para authenticated (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 6: simpatizante não manipula stock de produtos
-- ------------------------------------------------------------
do $$
begin
  insert into products (id, name, price_cents, stock) values
    ('e0000000-0000-0000-0000-000000000010', 'Produto Teste Segurança', 1000, 5)
  on conflict (id) do nothing;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);
  begin
    perform adjust_product_stock('e0000000-0000-0000-0000-000000000010', -100);
    raise notice 'TESTE 6: FAIL — simpatizante conseguiu manipular stock';
  exception when others then
    raise notice 'TESTE 6: PASS — manipulação de stock bloqueada (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 7: audit_log não aceita entradas forjadas em nome de outrem
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000002', true);
  begin
    insert into audit_log (profile_id, action, entity_type, entity_id, metadata)
    values ('e0000000-0000-0000-0000-000000000005', 'create', 'test', gen_random_uuid(), '{}');
    raise notice 'TESTE 7: FAIL — conseguiu forjar entrada de audit_log em nome de outro utilizador';
  exception when others then
    raise notice 'TESTE 7: PASS — forja de audit_log bloqueada (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- TESTE 8: audit_log ACEITA entrada legítima em nome próprio
-- ------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000002', true);
  begin
    insert into audit_log (profile_id, action, entity_type, entity_id, metadata)
    values ('e0000000-0000-0000-0000-000000000002', 'create', 'test', gen_random_uuid(), '{}');
    raise notice 'TESTE 8: PASS — insert legítimo em nome próprio aceite';
  exception when others then
    raise notice 'TESTE 8: FAIL — insert legítimo foi bloqueado indevidamente (%)', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------
-- README — como interpretar
-- ------------------------------------------------------------
-- Corre este ficheiro e lê os NOTICEs no output. Todos devem dizer
-- "PASS". Qualquer "FAIL" é uma regressão de segurança introduzida por
-- alguma alteração recente às migrations — trata como bloqueante.
--
-- Este script assume que a base de teste já tem:
--   - schema auth com uma função auth.uid() que lê
--     current_setting('request.jwt.claim.sub', true)::uuid
--   - roles authenticated/anon/service_role criados
--   - todas as migrations em db/migrations/ aplicadas (exceto a que
--     precisa de pg_cron/pg_net, exclusiva de Supabase gerido)
