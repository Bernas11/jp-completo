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
  select * into v_request
  from membership_requests
  where id = p_membership_request_id
  for update; -- lock: impede aprovação dupla concorrente

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

  -- cria o registo de autenticação/perfil só neste momento (candidato não
  -- tinha conta antes de ser aprovado)
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

  -- o trigger trg_enqueue_member_approved (em sync-outbox.sql) dispara
  -- automaticamente aqui dentro da mesma transação, ao inserir em members.

  return v_new_member_id;
end;
$$;

-- NOTA: esta função assume que membership_requests guarda citizen_card_number
-- e birth_date diretamente (consistente com o schema.ts do Projeto A onde
-- citizenCardStoragePath já existe em membership_requests; adicionar
-- citizen_card_number e birth_date a essa tabela se ainda não existirem,
-- pois member_sensitive_data precisa desses valores na aprovação).
