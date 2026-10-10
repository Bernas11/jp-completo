# Estado das migrations do portal (revisão de 2026-09-29)

**A base de dados de produção é a fonte de verdade, não esta pasta.** O histórico de
migrations nunca foi mantido de forma consistente:

- `db/migrations/0000–0005` são geradas pelo drizzle e estão no `_journal.json`.
- `0006–0012` são ficheiros escritos à mão e **não estão no journal** — o `drizzle-kit migrate`
  ignora-os. Não corras `drizzle-kit migrate` contra produção.
- Produção foi alterada diretamente no Supabase (tabela `supabase_migrations`), com migrations
  que **nunca tiveram ficheiro aqui**:
  `sync_receiver_and_catalog`, `scope_moderation_vs_publishing`, `forum_categories_cpn_only_write`,
  `archive_cpn_only_write`, `events_publish_vs_moderate`, `events_district_type_grants_invitations`,
  `portal_documents_public_category` (reconciliada em 0009), `cleanup_and_lock_ranking`,
  `fix_ranking_revoke_and_search_path_v2`, `newsletter_subscribers` (a tabela chama-se
  `newsletter_subscritores`), `poll_vote_counts_view` (0007), `pending_member_approvals_role` (0008).
- `db/schema.ts` não declara: `event_invitations`, `event_permission_grants`, `sync_log`,
  `newsletter_subscritores`, as views `poll_vote_counts` e `ranking_participacao_concelhia`,
  nem as colunas `district_id`/`event_type` de `portal_events`.

Para criar uma BD nova (dev/CI) com o estado de produção, gera um dump do schema
(`supabase db dump --schema public`) em vez de correr estes ficheiros por ordem.
