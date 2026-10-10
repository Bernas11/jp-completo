-- CAUSA RAIZ de "não é possível colocar comunicado na fila de envio":
-- email_queue tem RLS ativo mas NUNCA teve nenhuma policy. Toda a gente
-- (exceto service_role) ficava sempre bloqueada, incluindo a própria
-- action sendCommunication (que corre como o utilizador autenticado,
-- não como service_role). Sem policy de SELECT também, não dava sequer
-- para depurar isto a partir do Admin.
-- Já aplicada diretamente à base de dados (jp-militancia) em 2026-09-27.
create policy "email_queue_insert_national" on email_queue for insert
  with check (auth_is_national_staff());

create policy "email_queue_select_national" on email_queue for select
  using (auth_is_national_staff());
