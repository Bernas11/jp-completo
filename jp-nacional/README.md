# jp-nacional — Site público da Juventude Popular (protótipo)

> Protótipo não oficial. Demonstração: https://jp-nacional.vercel.app

Next.js 16 (App Router) · React 19 · next-intl · Tailwind · Framer Motion · Zod 4 · Stripe · PostHog.

## Funcionalidades

- Páginas institucionais: início, História, Carta de Princípios, Órgãos Nacionais, Anteriores Líderes, Concelhias (pesquisa + mapa), Contactos, Documentação (filtrável por categoria), políticas de privacidade/cookies/termos.
- **Adesão** (`/aderir`): formulário em 3 passos com upload do documento de identificação → `POST /api/adesao`.
- **Loja «Marca JP»** (`/marca-jp`), ligada por omissão (desliga-se com `NEXT_PUBLIC_SHOP_ENABLED=false`): checkout Stripe (`/api/checkout`, `/api/stripe-webhook`) e encomendas (`/api/encomenda`).
- **Newsletter** (`/api/newsletter`).
- **Internacionalização**: português é o idioma base (sem prefixo); os restantes usam prefixo (`/en`, `/fr`, …). Textos em `messages/*.json`.

## API

| Rota | Função |
|---|---|
| `POST /api/adesao` | Cria o pedido de adesão (valida, *rate limit*, *honeypot*, grava ficheiro e registo) |
| `POST /api/newsletter` | Subscrição da newsletter |
| `POST /api/checkout` | Cria sessão de pagamento Stripe |
| `POST /api/stripe-webhook` | Webhook do Stripe |
| `POST /api/encomenda` | Registo de encomenda |

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
npm run test:e2e   # ver docs/TESTES.md
```

Variáveis em [`docs/AMBIENTE.md`](../docs/AMBIENTE.md). Esquema de referência da BD em `docs/supabase-schema-militancia.sql`.
