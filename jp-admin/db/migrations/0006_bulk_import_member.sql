create or replace function bulk_import_member(
  p_full_name text,
  p_email text,
  p_phone text,
  p_birth_date date,
  p_concelhia_id uuid,
  p_citizen_card_number text,
  p_member_number text default null, -- se null, gera um novo
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
  if exists (select 1 from profiles where email = p_email) then
    raise exception 'Já existe um perfil com o email %', p_email;
  end if;

  select district_id into v_district_id from concelhias where id = p_concelhia_id;
  if v_district_id is null then
    raise exception 'Concelhia não encontrada';
  end if;

  -- a importação em bulk não passa por um pedido de filiação real (são
  -- militantes já existentes a migrar); cria-se um registo de
  -- membership_request já 'aprovado' só para preservar a integridade
  -- referencial e o histórico de auditoria consistente com o fluxo normal
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
