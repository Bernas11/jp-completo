# Juventude Popular — Ecossistema digital (jp-completo)

> ⚠️ **Protótipo — não é o site oficial da Juventude Popular.**
> Projeto de portefólio desenvolvido como proposta, que **não foi o escolhido**. O nome e a identidade
> visual da JP são usados **com autorização da organização**; pertencem à JP e o uso neste repositório
> não implica que seja um produto oficial. **Não contém dados reais.** Ver [`docs/ARQUIVO.md`](docs/ARQUIVO.md).

O protótipo explora um ecossistema digital único para a Juventude Popular: informação pública nacional,
gestão administrativa e participação de militantes e simpatizantes, através de um site, um backoffice e um portal.

## Demonstração (protótipo)

| Aplicação | URL |
|---|---|
| Site público (`jp-nacional`) | https://jp-nacional.vercel.app |

O backoffice (`jp-admin`) e o portal (`jp-portal`) **não estão disponíveis publicamente**.

Monorepo com as **três aplicações** da JP e a documentação do sistema.

| Pasta | Aplicação | Para quem | Base de dados |
|---|---|---|---|
| [`jp-nacional/`](jp-nacional/README.md) | Site público (Next.js 16, next-intl, Stripe, PostHog) | Visitantes e candidatos | `jp-militancia` |
| [`jp-admin/`](jp-admin/README.md) | Backoffice (Next.js 15) | CPN, administradores e moderadores | `jp-militancia` |
| [`jp-portal/`](jp-portal/README.md) | Portal do militante (Next.js 15) | Militantes aprovados | `jp-portal` |
| [`supabase/`](supabase/README.md) | Edge Functions exportadas do projeto `jp-militancia` | — | — |

Cada aplicação é um projeto Next.js independente (cada uma com o seu `package.json` e o seu deploy na Vercel). Não há workspace partilhado: instala as dependências dentro de cada pasta.

## Documentação

| Documento | Conteúdo |
|---|---|
| [Arquitetura e fluxos](docs/ARQUITETURA.md) | Visão geral, adesão, aprovação, emails, crons |
| [Estrutura das apps](docs/APPS.md) | Pastas e padrões de cada aplicação |
| [Autenticação e sessão](docs/AUTENTICACAO.md) | Login do admin (TOTP), *magic link* do portal, rate limiting |
| [Sincronização](docs/SINCRONIZACAO.md) | Eventos, assinatura HMAC, idempotência, primeiro login |
| [Base de dados](docs/BASE-DE-DADOS.md) | Visão geral · esquemas completos em [`docs/schema/`](docs/schema/) |
| [Papéis e permissões](docs/PAPEIS-E-PERMISSOES.md) | Matriz por ação (admin e portal) |
| [Variáveis de ambiente](docs/AMBIENTE.md) | Nomes e finalidade (sem valores) |
| [Deploy](docs/DEPLOY.md) | Vercel, Supabase, Stripe, Brevo, crons, checklist |
| [Operações](docs/OPERACOES.md) | Primeira conta CPN, limpar dados, Storage, diagnóstico |
| [Testes](docs/TESTES.md) | Vitest, Playwright, CI |
| [Pontos de atenção](docs/PONTOS-DE-ATENCAO.md) | Problemas encontrados e a corrigir |
| [Estado do protótipo](docs/ARQUIVO.md) | O que está desativado e como repor em produção |
| [Contribuir](CONTRIBUTING.md) · [Segurança](SECURITY.md) | Regras do repositório |

## Arranque rápido (qualquer uma das apps)

```bash
cd jp-admin            # ou jp-portal / jp-nacional
cp .env.example .env.local   # preencher os valores (ver docs/AMBIENTE.md)
npm install
npm run dev            # http://localhost:3000
```

Scripts comuns a todas: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (Vitest) e `npm run test:e2e` (Playwright).

## Segurança — ler antes de publicar

- Este repositório é público: **não contém dados reais**. O sistema original trata dados pessoais de militantes (incluindo cartão de cidadão), por isso qualquer ambiente real deve ser privado e protegido.
- **Nunca** fazer commit de `.env*`, nem de chaves `service_role`, `STRIPE_SECRET_KEY`, `BREVO_*`, `SYNC_SHARED_SECRET` ou `CRON_SECRET`. O `.gitignore` já exclui `.env*` (exceto `.env.example`).

## Licença

Código: todos os direitos reservados, com consulta permitida como portefólio — ver [`LICENSE`](LICENSE). Marca e conteúdos da JP: pertencem à JP.
