-- VULNERABILIDADE CRÍTICA CORRIGIDA: autorização ausente em funções
-- SECURITY DEFINER chamáveis diretamente via API (IDOR / BOLA / bypass
-- total de autorização).
--
-- Estas funções ignoram RLS por definição (SECURITY DEFINER corre com os
-- privilégios do dono da função, não do chamador). A única coisa que as
-- protegia até agora era a camada de Server Actions da app
-- (roleProtectedActionClient) — mas isso não impede uma chamada direta
-- via supabase.rpc(...) com a sessão de QUALQUER utilizador autenticado
-- (ou, sem grant explícito, até sem sessão nenhuma, via PUBLIC/anon).
--
-- Confirmado neste código: approve_membership_transaction não validava
-- nem o âmbito territorial do chamador nem a identidade do "reviewer"
-- (parâmetro controlado pelo cliente, permitindo forjar a auditoria).
-- adjust_product_stock e bulk_import_member não tinham nenhuma
-- verificação de autorização.

-- ============================================================
-- 1. approve_membership_transaction
--
-- Esta função só é chamada legitimamente pela Edge Function
-- approve-membership.ts, que já valida o JWT do utilizador e o role
-- ('cpn'/'administrador') ANTES de invocar isto com a service_role key
-- (necessária para a transação atómica com vários inserts). Sob
-- service_role, auth.uid() é sempre null — por isso o check de role
-- aqui dentro só se aplica SE alguém conseguir chamar isto com um JWT de
-- utilizador normal (o que o REVOKE/GRANT abaixo impede por completo).
--
-- A proteção real e suficiente é a combinação de:
--   (a) REVOKE EXECUTE FROM PUBLIC — nenhum cliente autenticado comum
--       consegue chamar isto diretamente via supabase.rpc(), só
--       service_role (que ignora GRANTs, daí a Edge Function continuar
--       a funcionar sem precisar de grant nenhum);
--   (b) a Edge Function já validada, que continua a ser o único caminho
--       de facto alcançável por um cliente.
-- ============================================================

drop function if exists approve_membership_transaction(uuid);

create or replace function approve_membership_transaction(
  p_membership_request_id uuid,
  p_reviewer_profile_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_request membership_requests%rowtype;
  v_district_id uuid;
  v_member_number text;
  v_new_member_id uuid;
  v_new_profile_id uuid;
begin
  -- defesa em profundidade: só relevante se algum dia isto for chamado
  -- com um JWT de utilizador em vez de service_role (auth.uid() só é
  -- não-nulo nesse caso) — nunca deve bloquear a Edge Function.
  if auth.uid() is not null and not auth_is_national_staff() then
    raise exception 'Sem permissão para aprovar pedidos de filiação.';
  end if;

  select * into v_request
  from membership_requests
  where id = p_membership_request_id
  for update;

  if v_request is null then
    raise exception 'Pedido de filiação não encontrado';
  end if;

  if v_request.status <> 'pendente' then
    raise exception 'Pedido já processado (estado atual: %)', v_request.status;
  end if;

  if v_request.citizen_card_number is null then
    raise exception 'Número do Cartão de Cidadão não foi preenchido na revisão da ficha';
  end if;

  select district_id into v_district_id
  from concelhias where id = v_request.concelhia_id;

  insert into auth.users (id, email)
  values (gen_random_uuid(), v_request.email)
  returning id into v_new_profile_id;

  insert into profiles (id, email, full_name, role, district_id)
  values (v_new_profile_id, v_request.email, v_request.full_name, 'militante', v_district_id);

  v_member_number := generate_member_number(v_district_id);

  insert into members (profile_id, membership_request_id, member_number, concelhia_id, status)
  values (v_new_profile_id, v_request.id, v_member_number, v_request.concelhia_id, 'ativo')
  returning id into v_new_member_id;

  insert into member_sensitive_data (member_id, citizen_card_number, citizen_card_storage_path, birth_date)
  values (v_new_member_id, v_request.citizen_card_number, v_request.citizen_card_storage_path, v_request.birth_date);

  update membership_requests
  set status = 'aprovado',
      reviewed_by_profile_id = p_reviewer_profile_id,
      reviewed_at = now()
  where id = p_membership_request_id;

  insert into audit_log (profile_id, action, entity_type, entity_id, metadata)
  values (
    p_reviewer_profile_id, 'approve', 'membership_request', p_membership_request_id,
    jsonb_build_object('member_id', v_new_member_id, 'member_number', v_member_number)
  );

  return v_new_member_id;
end;
$$;

-- ============================================================
-- 2. adjust_product_stock — verificação de autorização em falta
-- ============================================================

create or replace function adjust_product_stock(p_product_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_new_stock integer;
begin
  if not auth_is_national_staff() then
    raise exception 'Sem permissão para gerir stock da loja.';
  end if;

  update products
  set stock = stock + p_delta
  where id = p_product_id
  returning stock into v_new_stock;

  if v_new_stock is null then
    raise exception 'Produto não encontrado';
  end if;

  if v_new_stock < 0 then
    raise exception 'Stock insuficiente: esta operação deixaria o stock negativo';
  end if;

  return v_new_stock;
end;
$$;

-- ============================================================
-- 3. bulk_import_member — verificação de autorização em falta
--    (a app restringe isto a role 'cpn'; alinhado aqui)
-- ============================================================

create or replace function bulk_import_member(
  p_full_name text,
  p_email text,
  p_phone text,
  p_birth_date date,
  p_concelhia_id uuid,
  p_citizen_card_number text,
  p_member_number text default null,
  p_joined_at timestamptz default now(),
  p_citizen_card_storage_path text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_district_id uuid;
  v_member_number text;
  v_new_profile_id uuid;
  v_new_member_id uuid;
  v_membership_request_id uuid;
begin
  if auth_role() <> 'cpn' then
    raise exception 'Sem permissão para importar militantes em lote.';
  end if;

  if exists (select 1 from profiles where email = p_email) then
    raise exception 'Já existe um perfil com o email %', p_email;
  end if;

  select district_id into v_district_id from concelhias where id = p_concelhia_id;
  if v_district_id is null then
    raise exception 'Concelhia não encontrada';
  end if;

  insert into membership_requests (
    full_name, email, phone, birth_date, concelhia_id,
    citizen_card_storage_path, citizen_card_number, status, reviewed_at
  )
  values (
    p_full_name, p_email, p_phone, p_birth_date, p_concelhia_id,
    p_citizen_card_storage_path, p_citizen_card_number, 'aprovado', p_joined_at
  )
  returning id into v_membership_request_id;

  insert into auth.users (id, email)
  values (gen_random_uuid(), p_email)
  returning id into v_new_profile_id;

  insert into profiles (id, email, full_name, role, district_id)
  values (v_new_profile_id, p_email, p_full_name, 'militante', v_district_id);

  v_member_number := coalesce(p_member_number, generate_member_number(v_district_id));

  insert into members (profile_id, membership_request_id, member_number, concelhia_id, status, joined_at)
  values (v_new_profile_id, v_membership_request_id, v_member_number, p_concelhia_id, 'ativo', p_joined_at)
  returning id into v_new_member_id;

  insert into member_sensitive_data (member_id, citizen_card_number, citizen_card_storage_path, birth_date)
  values (v_new_member_id, p_citizen_card_number, p_citizen_card_storage_path, p_birth_date);

  return v_new_member_id;
end;
$$;

-- ============================================================
-- 4. Blindagem de GRANTs — defesa em profundidade mesmo que uma das
--    verificações acima tenha um bug: nunca deixar PUBLIC/anon executar
--    nada disto, e funções puramente internas (nunca chamadas
--    diretamente pelo cliente) ficam sem grant nenhum.
-- ============================================================

revoke execute on function approve_membership_transaction(uuid, uuid) from public;
revoke execute on function adjust_product_stock(uuid, integer) from public;
revoke execute on function bulk_import_member(text, text, text, date, uuid, text, text, timestamptz, text) from public;
revoke execute on function generate_member_number(uuid) from public;

-- approve_membership_transaction NÃO tem grant a authenticated de
-- propósito — só a Edge Function (via service_role, que ignora GRANTs)
-- deve conseguir chamar isto. Um cliente autenticado comum não deve ter
-- forma nenhuma de a invocar diretamente.
grant execute on function adjust_product_stock(uuid, integer) to authenticated;
grant execute on function bulk_import_member(text, text, text, date, uuid, text, text, timestamptz, text) to authenticated;
-- generate_member_number NUNCA é chamada diretamente pelo cliente — só
-- internamente pelas duas funções acima, que correm com privilégios de
-- dono e por isso não precisam do grant para o conseguir chamar.
