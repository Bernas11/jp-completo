-- CAUSA RAIZ do "Bucket not found" (documentos do Admin, CC da adesão):
-- nenhum bucket de storage existia de facto na base de dados. A 0014
-- já continha o insert para "documentos-publicos" mas nunca chegou a
-- ser aplicada nesta base (confirmado via Supabase: storage.buckets
-- estava vazio, apesar da 0014 estar no repositório).
-- Esta migration é idempotente e cria os DOIS buckets em falta.
-- Já aplicada diretamente à base de dados em produção (jp-militancia)
-- em 2026-09-23; este ficheiro serve para o repositório e histórico
-- de migrations ficarem sincronizados com a base real.

-- 1) documentos-publicos: documentos do Admin (regulamentos, atas, etc.)
--    Público para leitura (são documentos institucionais consultáveis
--    por qualquer visitante), escrita restrita a administrador/cpn.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-publicos',
  'documentos-publicos',
  true,
  15728640, -- 15MB, conforme já validado no código do Admin
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
    -- deliberadamente excluído: image/svg+xml e text/html (risco de XSS armazenado, bucket é público)
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documentos_publicos_leitura" on storage.objects;
create policy "documentos_publicos_leitura" on storage.objects for select
  using (bucket_id = 'documentos-publicos');

drop policy if exists "documentos_publicos_escrita" on storage.objects;
create policy "documentos_publicos_escrita" on storage.objects for insert
  with check (bucket_id = 'documentos-publicos' and auth_role() in ('administrador', 'cpn'));

drop policy if exists "documentos_publicos_eliminacao" on storage.objects;
create policy "documentos_publicos_eliminacao" on storage.objects for delete
  using (bucket_id = 'documentos-publicos' and auth_role() in ('administrador', 'cpn'));

-- 2) documentos-identificacao: fotocópias do Cartão de Cidadão do
--    formulário de adesão (/aderir) e dos pedidos de filiação.
--    PRIVADO: dados pessoais sensíveis. Só é acedido no código através
--    do service_role (upload em api/adesao, signed URL em membership-requests.ts),
--    que ignora RLS por definição — as políticas abaixo são uma segunda
--    camada de defesa caso algum dia se use uma chave não-service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-identificacao',
  'documentos-identificacao',
  false,
  8388608, -- 8MB, igual ao DOCUMENTO_TAMANHO_MAXIMO em src/lib/validation.ts
  array['image/jpeg', 'image/png', 'application/pdf'] -- igual a DOCUMENTO_TIPOS_VALIDOS
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documentos_identificacao_leitura_staff" on storage.objects;
create policy "documentos_identificacao_leitura_staff" on storage.objects for select
  using (bucket_id = 'documentos-identificacao' and auth_is_national_staff());

drop policy if exists "documentos_identificacao_escrita_staff" on storage.objects;
create policy "documentos_identificacao_escrita_staff" on storage.objects for insert
  with check (bucket_id = 'documentos-identificacao' and auth_is_national_staff());

drop policy if exists "documentos_identificacao_eliminacao_staff" on storage.objects;
create policy "documentos_identificacao_eliminacao_staff" on storage.objects for delete
  using (bucket_id = 'documentos-identificacao' and auth_is_national_staff());
