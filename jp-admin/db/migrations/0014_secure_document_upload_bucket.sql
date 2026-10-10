-- VULNERABILIDADE CORRIGIDA: upload de documentos sem validação real
--
-- Encontrado: a criação do bucket "documentos-publicos" e as suas
-- policies de storage estavam apenas como COMENTÁRIOS SQL no ficheiro
-- 0003_rls_policies.sql — nunca foram executadas por nenhuma migration,
-- dependiam de alguém as correr manualmente no dashboard do Supabase.
-- Além disso, não existia nenhum limite de tamanho nem restrição de tipo
-- de ficheiro: o bucket é público, por isso um ficheiro .svg/.html
-- malicioso disfarçado de "documento" seria servido diretamente aos
-- visitantes do site, com risco real de XSS armazenado.
--
-- Esta migration cria o bucket a sério, com limites aplicados pelo
-- próprio Supabase Storage (não dependem de nenhuma validação no
-- cliente, que é sempre contornável).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-publicos',
  'documentos-publicos',
  true,
  15728640, -- 15 MB, o limite que já estava definido no código mas nunca era aplicado
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
    -- deliberadamente EXCLUÍDO: image/svg+xml e text/html — podem conter
    -- <script> e seriam servidos publicamente, risco de XSS armazenado
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
