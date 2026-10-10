# Autenticação e sessão

## jp-admin (staff)
1. `/login` → `verifyCredentials` (Server Action): valida email/palavra-passe com `signInWithPassword`, **depois** de aplicar *rate limit* (5 tentativas / 10 min por IP).
2. O browser recebe os tokens e corre o passo de **MFA**: sem fator TOTP → **inscrição** (QR + segredo) e verificação; com fator → pede o código de 6 dígitos.
3. Só após o MFA, `establishServerSession` grava a sessão em *cookies* `httpOnly`, `sameSite=strict`, `secure` em produção.
4. O `middleware.ts` revalida o utilizador em cada pedido, redireciona para `/login` sem sessão e **termina a sessão após 30 min de inatividade** (cookie `jp-admin-last-activity`). Exceção: `/login` e `/api/cron/*` (estes autenticam-se com `CRON_SECRET`).
5. O *layout* exige `cargo` preenchido (senão `/onboarding`) e papel de staff (senão `/sem-permissao`).

**Requisito no Supabase:** ativar o MFA TOTP em *Authentication → Multi-Factor* do projeto `jp-militancia`, caso contrário a inscrição falha.

## jp-portal (militantes)
- Login por *magic link*: `signInWithOtp` com `emailRedirectTo`; o link passa por `/auth/callback`, que troca o `code` por sessão (`exchangeCodeForSession`) e redireciona.
- Limite de 5 pedidos / 10 min por IP. Sem Upstash configurado, o limitador é **em memória** (por instância serverless — não partilhado).
- O papel e o número de militante vêm de `pending_member_approvals` no primeiro login (ver `SINCRONIZACAO.md`).

**Requisito no Supabase:** em *Authentication → URL Configuration* do projeto `jp-portal`, definir o *Site URL* e adicionar o URL do portal (`https://…/auth/callback`) aos *Redirect URLs*.

## jp-nacional
Sem autenticação de utilizadores: as rotas de API usam a *service role* apenas no servidor.

## Rate limiting (todas as apps)
`@upstash/ratelimit` com Redis (Upstash). Sem `UPSTASH_REDIS_REST_URL/TOKEN` cai para memória local — aceitável em desenvolvimento, **não em produção**.
