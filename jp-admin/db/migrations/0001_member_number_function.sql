-- Gera o próximo número de militante para um distrito de forma atómica,
-- evitando race conditions quando duas aprovações acontecem em simultâneo.
-- Formato: DD-NNNNNN (ex: "11-000042" para Lisboa se code='11')

create or replace function generate_member_number(p_district_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_next_value integer;
  v_district_code text;
begin
  select code into v_district_code from districts where id = p_district_id;

  if v_district_code is null then
    raise exception 'Distrito % não encontrado', p_district_id;
  end if;

  insert into member_number_sequences (district_id, last_value)
  values (p_district_id, 1)
  on conflict (district_id)
  do update set last_value = member_number_sequences.last_value + 1
  returning last_value into v_next_value;

  return v_district_code || '-' || lpad(v_next_value::text, 6, '0');
end;
$$;
