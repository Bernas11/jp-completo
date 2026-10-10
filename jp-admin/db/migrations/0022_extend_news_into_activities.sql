-- ITEM 7: secção de "Atividades" no Admin (notícias, eventos, outras
-- atividades). Já existiam DUAS tabelas com propósitos distintos:
--   - "events": muito mais rica (concelhia, sync-outbox para o Portal,
--     lista de presenças) — continua a ser o modelo certo para eventos
--     com inscrição/participação real. Não mexido aqui.
--   - "news": já existia (title, summary, published_at) mas sem imagem,
--     categoria, link externo, corpo de texto nem estado de publicação
--     — insuficiente para o pedido. É o modelo certo para generalizar
--     porque já não tem a complexidade de participação do "events".
-- Em vez de inventar uma terceira tabela "activities" a duplicar
-- conceitos, estendemos "news" para cobrir notícias + outras atividades
-- que não precisam de inscrição, mantendo "events" como está.
-- Já aplicada diretamente à base de dados em produção (jp-militancia)
-- em 2026-09-25; este ficheiro serve para o repositório e histórico de
-- migrations ficarem sincronizados com a base real.

create extension if not exists unaccent;

alter table news
  add column if not exists body text,
  add column if not exists image_url text,
  add column if not exists category text not null default 'noticia',
  add column if not exists external_link text,
  add column if not exists status text not null default 'rascunho',
  add column if not exists slug text;

alter table news
  add constraint news_category_check check (category in ('noticia', 'comunicado', 'atividade', 'outro'));

alter table news
  add constraint news_status_check check (status in ('rascunho', 'publicado'));

create unique index if not exists news_slug_unique_idx on news (slug) where slug is not null;

-- backfill de slugs para notícias que já existissem antes desta migration,
-- marcando-as como publicadas (não havia estado de publicação antes,
-- portanto o comportamento implícito até aqui era "sempre publicado")
update news
set slug = trim(both '-' from regexp_replace(lower(unaccent(title)), '[^a-z0-9]+', '-', 'g')),
    status = 'publicado'
where slug is null;

-- Só notícias/atividades publicadas são visíveis publicamente; pessoal
-- nacional continua a ver e a gerir tudo (rascunhos incluídos) através
-- da policy "news_write_national" já existente (ALL, sem alteração).
drop policy if exists "news_select_all" on news;
create policy "news_select_published" on news for select
  using (status = 'publicado' or auth_is_national_staff());
