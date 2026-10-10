create or replace function adjust_product_stock(p_product_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_new_stock integer;
begin
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
