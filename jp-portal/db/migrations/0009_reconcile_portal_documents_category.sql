-- Reconciliação, não uma migration nova: estas colunas já existem na BD de
-- produção, aplicadas por uma migration feita diretamente no Supabase
-- (20260914213851_portal_documents_public_category) que nunca teve ficheiro
-- correspondente neste repositório nem em db/migrations. O db/schema.ts do
-- Drizzle também estava desatualizado (não as declarava).
--
-- Este ficheiro serve para que uma BD local/nova (dev, CI) fique alinhada
-- com produção. Usa IF NOT EXISTS por segurança — em produção não faz nada,
-- porque as colunas já lá estão.
--
-- Nota: nenhum código atual lê ou escreve category/is_public em
-- portal_documents. Ficam disponíveis mas não têm ainda nenhuma
-- funcionalidade ligada — não inventei essa lógica aqui.
alter table portal_documents add column if not exists category text;
alter table portal_documents add column if not exists is_public boolean not null default false;
