# jp-nacional — Site público da Juventude Popular (protótipo)

> Protótipo não oficial. Demonstração: https://jp-nacional.vercel.app

Next.js 16 (App Router) · React 19 · next-intl · Tailwind · Framer Motion · Zod 4 · Stripe · PostHog.

## Funcionalidades

- Páginas institucionais: início, História, Carta de Princípios, Órgãos Nacionais, Anteriores Líderes, Concelhias (pesquisa + mapa), Contactos, Documentação (filtrável por categoria), políticas de privacidade/cookies/termos.
- **Adesão** (`/aderir`): desativada em modo de demonstração; o `POST /api/adesao` recusa pedidos antes de ler/gravar dados pessoais.
- **Loja «Marca JP»** (`/marca-jp`): desligada por omissão; só ativa fora do modo demo com `NEXT_PUBLIC_SHOP_ENABLED=true` e Stripe configurado.
- **Newsletter**: desativada em modo de demonstração; `POST /api/newsletter` recusa gravações.
- **Internacionalização**: português é o idioma base (sem prefixo); os restantes usam prefixo (`/en`, `/fr`, …). Textos em `messages/*.json`.

## API

| Rota | Função |
|---|---|
| `POST /api/adesao` | Recusa com `503` em modo demo; em modo ativo valida e grava pedido/documento |
| `POST /api/newsletter` | Recusa com `503` em modo demo; em modo ativo subscreve newsletter |
| `POST /api/checkout` | Cria sessão de pagamento Stripe |
| `POST /api/stripe-webhook` | Webhook do Stripe |

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
npm run test:e2e   # ver docs/TESTES.md
```

Variáveis em [`docs/AMBIENTE.md`](../docs/AMBIENTE.md). Esquema de referência da BD em `docs/supabase-schema-militancia.sql`.
