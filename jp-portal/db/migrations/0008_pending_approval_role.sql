-- Corrige o gap: uma promoção a moderador/CPN feita no JP-Admin nunca chegava
-- ao Portal. portal_profiles.role ficava sempre "militante" para qualquer
-- membro aprovado, porque:
--   1. o evento member_approved nunca transportava role (correto — no momento
--      da aprovação, o novo militante é sempre "militante");
--   2. mas não existia NENHUM evento para quando essa role mudava depois
--      (ex.: promovido a moderador_concelhio de uma concelhia, ou a CPN).
--
-- Esta coluna guarda a role a aplicar quando a conta for criada no primeiro
-- login (ver getOrCreateProfile em lib/profile.ts), já refletindo qualquer
-- promoção que tenha acontecido antes desse primeiro login.
alter table pending_member_approvals
  add column role portal_role not null default 'militante';

comment on column pending_member_approvals.role is
  'Role a aplicar no portal_profiles quando este membro fizer o primeiro login. Vem do role em JP-Admin (profiles.role) no momento da aprovação ou de uma promoção posterior, mapeado para o enum portal_role. TI/administrador não é elevado aqui (ver /api/sync/member).';
