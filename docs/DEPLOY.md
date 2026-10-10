# Deploy

> **Nota:** o projeto é um protótipo (ver [`ARQUIVO.md`](ARQUIVO.md)). Só o `jp-nacional` está publicado (https://jp-nacional.vercel.app). Este guia descreve como **repor o ecossistema completo** num ambiente novo, caso o projeto venha a ser retomado.

Cada app é um projeto **Vercel** independente ligado ao mesmo repositório, com *Root Directory* próprio.

| Projeto Vercel | Root Directory | Framework | Notas |
|---|---|---|---|
| `jp-nacional` | `jp-nacional` | Next.js | Domínio público do site |
| `jp-admin` | `jp-admin` | Next.js | Tem `vercel.json` com 2 crons |
| `jp-portal` | `jp-portal` | Next.js | Tem `vercel.json` com 1 cron |

## 1. Ordem recomendada (ambiente novo)
1. **Supabase:** criar os dois projetos; restaurar o esquema a partir de um *dump* (`supabase db dump --schema public`) — ver `docs/BASE-DE-DADOS.md`; criar os buckets `documentos-identificacao` (privado) e `documentos-publicos` (público); fazer *deploy* das Edge Functions e definir os *secrets* (`supabase/README.md`).
2. **Supabase Auth:** `jp-militancia` → ativar MFA TOTP. `jp-portal` → Site URL e Redirect URLs (`/auth/callback`).
3. **Upstash:** criar uma base Redis (partilhável) → `UPSTASH_REDIS_REST_URL/TOKEN`.
4. **Brevo:** SMTP (para o site público) + API key (admin e Edge Functions) + templates transacionais; registar as chaves/IDs em `email_templates`.
5. **Stripe:** chave secreta e *webhook* (passo 3 abaixo).
6. **Vercel:** criar os 3 projetos, definir variáveis (`docs/AMBIENTE.md`) e fazer *deploy*.
7. **Ligações entre apps:** definir `PORTAL_SYNC_MEMBER_URL`, `PORTAL_SYNC_EVENT_URL`, `PORTAL_GET_ATTENDEES_URL` no admin com o domínio real do portal (`https://<portal>/api/sync/member|event|attendees`); `SYNC_SHARED_SECRET` **idêntico** no admin, portal e Edge Functions.
8. **Primeira conta CPN:** `docs/OPERACOES.md`.

## 2. Variáveis por ambiente
Definir em *Production* e, se usares *Preview*, apontar para projetos Supabase **de teste** (nunca para os de produção). `NEXT_PUBLIC_*` são embebidas no *build*: alterar exige novo *deploy*.
Manter `NEXT_PUBLIC_DEMO_MODE=true` enquanto o site for uma demonstração: adesões e newsletter ficam bloqueadas no cliente e no servidor. Só definir `false` após autorização, revisão de privacidade e configuração do ambiente real.

## 3. Stripe (loja)
- *Webhook endpoint:* `https://<site>/api/stripe-webhook`, evento **`checkout.session.completed`** (é o único tratado) → copiar o segredo para `STRIPE_WEBHOOK_SECRET`.
- Métodos de pagamento usados no checkout: cartão, Multibanco e MB WAY (têm de estar ativos na conta Stripe).
- `NEXT_PUBLIC_SITE_URL` define os URLs de sucesso/cancelamento.
- A loja começa desligada; só ativa fora do modo demo com `NEXT_PUBLIC_SHOP_ENABLED=true` e Stripe configurado.

## 4. Crons
| Onde | O quê |
|---|---|
| Vercel (admin) | `/api/cron/sync-outbox` 06:00 UTC · `/api/cron/email-queue` 07:00 UTC |
| Vercel (portal) | `/api/cron/keepalive` 05:00 UTC |
| Supabase `pg_cron` | `process-sync-outbox` (a cada minuto) — **corrigir antes de depender dele** (`PONTOS-DE-ATENCAO.md`) |

Defina `CRON_SECRET` nas variáveis de ambiente da Vercel: a Vercel envia-o como `Authorization: Bearer`. Nota: o plano gratuito da Vercel limita os crons a execuções diárias.

## 5. Domínios e emails
- Apontar o domínio principal para `jp-nacional`; subdomínios para `jp-admin` e `jp-portal`.
- Configurar SPF/DKIM do domínio de envio no Brevo para que os emails não caiam em spam.

## 6. Checklist pós-deploy
- [ ] Em modo demo, `/aderir`, newsletter e checkout estão bloqueados e não recebem dados pessoais.
- [ ] Apenas num ambiente de teste autorizado, desativar o modo demo e usar dados sintéticos para validar o formulário de adesão.
- [ ] Login no admin com TOTP funciona; `/administradores` abre.
- [ ] Aprovar um pedido de teste → evento em `sync_outbox` → `processado`.
- [ ] Magic link do portal chega e entra; o papel é `militante`.
- [ ] Webhook do Stripe responde `200` (painel Stripe → Webhooks).
- [ ] `email_templates` preenchida.
- [ ] Repositório e *Preview deployments* sem segredos expostos.
