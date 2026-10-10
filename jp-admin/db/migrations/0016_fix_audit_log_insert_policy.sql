-- BUG FUNCIONAL/DE INTEGRIDADE CORRIGIDO: audit_log nunca gravava nada
--
-- A tabela audit_log tinha RLS ativa com uma policy de SELECT
-- (audit_log_select_national) mas NENHUMA policy de INSERT. O código da
-- app (24 pontos em actions/*.ts) escreve na tabela usando a sessão do
-- próprio utilizador (ctx.supabase), não service_role — sem policy de
-- insert, o Postgres nega por omissão. Confirmado com teste real: um
-- insert válido (enum correto) foi rejeitado com "new row violates
-- row-level security policy". Isto significa que, em produção, NENHUM
-- destes 24 registos de auditoria (convites de admin, aprovações,
-- exports, acessos a CC, etc.) estava de facto a ser gravado — a
-- operação principal tinha sucesso, o log ficava silenciosamente por
-- fazer.
--
-- A policy só permite ao utilizador inserir registos EM SEU PRÓPRIO
-- NOME (profile_id = auth.uid()), impedindo forjar entradas atribuídas
-- a outra pessoa. Não existe policy de UPDATE nem DELETE — o log
-- continua imutável para todos, incluindo para quem o escreveu.

create policy "audit_log_insert_own" on audit_log for insert
  with check (profile_id = auth.uid());
