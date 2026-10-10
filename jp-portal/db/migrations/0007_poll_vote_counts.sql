-- Corrige C2: utilizadores não-moderadores nunca viam resultados de sondagens
-- porque a RLS de poll_votes só permite ler o próprio voto (poll_votes_select_own)
-- ou, para moderadores, todos (poll_votes_select_moderate). A contagem de votos
-- por opção, feita anteriormente via embed direto de poll_votes, ficava sempre
-- a zero para quem não é moderador.
--
-- Esta view expõe apenas contagens agregadas (sem profile_id), preservando a
-- privacidade de quem votou em quê. A app passa a usar esta view para os
-- totais e continua a usar o embed direto de poll_votes (RLS-limitado ao
-- próprio utilizador) só para saber "eu votei nesta opção?".
create or replace view public.poll_vote_counts
with (security_invoker = false) as
select option_id, count(*)::int as vote_count
from public.poll_votes
group by option_id;

grant select on public.poll_vote_counts to authenticated;

comment on view public.poll_vote_counts is
  'Contagem agregada de votos por opção, sem profile_id. Usada em /sondagens para que utilizadores não-moderadores vejam resultados sem violar a RLS de poll_votes.';
