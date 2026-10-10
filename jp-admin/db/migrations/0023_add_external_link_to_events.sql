-- Complemento ao item 7: tal como as notícias/atividades, um evento
-- também deve poder apontar para um link externo (ex: Instagram) quando
-- não faz sentido ter uma página de detalhe própria no site.
-- Já aplicada diretamente à base de dados (jp-militancia) em 2026-09-25.
alter table events add column if not exists external_link text;
