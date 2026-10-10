-- trg_enqueue_member_role_changed (AFTER UPDATE OF role ON profiles)
-- insere sempre event_type = 'member_role_changed' em sync_outbox, mas
-- esse valor nunca tinha sido acrescentado ao enum sync_event_type.
-- Qualquer alteração à coluna "role" de um profile (promover/despromover
-- alguém, ou até qualquer UPDATE que inclua a coluna role no SET mesmo
-- sem mudar o valor) fazia este trigger falhar com "invalid input value
-- for enum sync_event_type", revertendo o UPDATE inteiro.
-- Já aplicada diretamente à base de dados (jp-militancia) em 2026-09-27.
alter type sync_event_type add value if not exists 'member_role_changed';
