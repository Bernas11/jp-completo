# Esquema — `jp-portal`

Extraído da base de dados de produção (2026-10-10). `!` = NOT NULL. Todas as tabelas têm RLS ativo. Utilizador «autenticado» = `auth.uid() IS NOT NULL`.

## Enums
`portal_role` (`cpn`, `moderador_nacional`, `moderador_distrital`, `moderador_concelhio`, `militante`, `simpatizante`) · `scope` (`nacional`, `distrital`, `concelhia`) · `event_type` (`geral`, `conselho_nacional`, `congresso_nacional`) · `forum_topic_status` (`aberto`, `fechado`) · `moderation_action` (`silenciar`, `suspender`, `ban_permanente`) · `notification_type` (`resposta_topico`, `mencao`, `novo_aviso`, `evento_proximo`, `mensagem_direta`, `denuncia_resolvida`, `filiacao_aprovada`, `nova_denuncia`) · `reaction_type` (`gosto`, `apoio`, `concordo`, `discordo`, `haha`) · `report_action` (`nenhuma`, `silenciar`, `suspender`, `pedido_ban_cpn`) · `report_status` (`pendente`, `em_analise`, `resolvido`, `rejeitado`)

> `portal_role` **não tem `administrador`**: no portal essa conta técnica é tratada como `militante`.

## Tabelas

**Perfis:** `portal_profiles` (id, email, display_name, bio, avatar_url, role, member_id, member_number, concelhia_id, district_id, joined_member_at, terms_accepted_at, dark_mode, weekly_digest_opt_in) · `pending_member_approvals` (email, member_id, full_name, member_number, concelhia_id, district_id, joined_member_at, role) · `badges` (key, name, description, icon_url) · `profile_badges` · `push_subscriptions` (endpoint, keys)

**Comunidade:** `mural_posts` (title, body, scope + âmbito) · `forum_categories` (name, scope + âmbito, display_order) · `forum_topics` (title, pinned, status, view_count, last_reply_at) · `forum_replies` · `reactions` (reply_id ou topic_id, type) · `mentions` · `direct_messages` (sender, recipient, body, read_at) · `notifications` (type, payload, read_at) · `polls` (question, scope, multiple_choice, closes_at) · `poll_options` · `poll_votes` (+ vista `poll_vote_counts`)

**Eventos e conteúdo:** `portal_events` (source_event_id = id do evento no admin, title, location, starts_at, ends_at, concelhia_id, district_id, event_type) · `portal_event_rsvps` · `event_invitations` · `event_permission_grants` (concede a uma concelhia/distrito o direito de organizar eventos de um `event_type`; `revoked_at`) · `portal_documents` (scope, category, is_public) · `wiki_pages` / `wiki_revisions` · `archive_congresses` / `archive_congress_items` · `newsletter_subscritores`

**Moderação e sistema:** `reports` (entity_type, entity_id, reason, status, action) · `moderation_actions` (target, action, reason, applied_by, approved_by, expires_at) · `sync_log` (event_id, event_type, processed_at — garante idempotência da sincronização) · `ranking_participacao_concelhia` (vista) · `districts`, `concelhias` (cópia de referência sincronizada)

## Funções de permissão

| Função | Regra |
|---|---|
| `portal_auth_is_national_staff()` | papel ∈ (`cpn`, `moderador_nacional`) |
| `portal_auth_is_moderator()` | papel ∈ (`cpn`, `moderador_nacional`, `moderador_distrital`, `moderador_concelhio`) |
| `portal_can_publish()` | só `cpn` |
| `portal_can_publish_scope(scope, distrito, concelhia)` | `cpn`; ou moderador distrital no seu distrito (âmbito `distrital`); ou moderador concelhio na sua concelhia (âmbito `concelhia`) |
| `portal_can_moderate_scope(...)` | `cpn`; `moderador_nacional` (âmbito `nacional`); distrital/concelhio no seu âmbito |
| `portal_can_moderate_event(...)` | `cpn`; para eventos `geral`, o moderador do respetivo nível; para `conselho_nacional`/`congresso_nacional`, só com uma concessão ativa em `event_permission_grants` |
| `portal_can_moderate_report(tipo, id)` | resolve o âmbito do tópico/resposta/post denunciado |
| `portal_auth_is_restricted()` | o utilizador tem uma ação `suspender` ativa, ou `ban_permanente` já aprovada pela CPN |
| `portal_profiles_guard_insert` (trigger) | no **primeiro login** força `role`, `member_id`, etc. a partir de `pending_member_approvals` (pelo email); sem registo pendente, a conta fica `simpatizante` |

## Políticas RLS (resumo)

- **Leitura:** quase tudo é legível por qualquer utilizador autenticado (mural, fórum, sondagens, eventos, wiki, documentos, arquivo, perfis, distritos/concelhias). Anónimos não leem nada.
- **Mensagens diretas:** só remetente e destinatário leem; só o destinatário marca como lida; quem está restrito não envia.
- **Publicar:** `portal_can_publish_scope` (mural, sondagens, documentos, categorias do fórum); apenas `cpn` cria categorias globais, wiki e arquivo.
- **Fórum:** qualquer utilizador não restrito cria tópicos e respostas (não em tópicos fechados); autor edita o seu; moderadores do âmbito fecham/apagam.
- **Denúncias:** qualquer utilizador denuncia e vê as suas; moderadores veem/resolvem as do seu âmbito.
- **Moderação:** moderadores aplicam ações; só a `cpn` aprova ou rejeita um `ban_permanente`.
- **Perfis:** cada um atualiza o seu; pessoal nacional (`cpn`, `moderador_nacional`) gere todos.
- **Sem políticas (só *service role*):** `pending_member_approvals`, `sync_log`, `newsletter_subscritores`.

> **Atenção:** a política `mentions_insert_system` permite `INSERT` com `true` (sem restrição). Convém restringi-la.
