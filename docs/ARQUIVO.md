# Estado do protótipo

O ecossistema (`jp-nacional`, `jp-admin`, `jp-portal`) foi desenvolvido como **proposta/protótipo** e **não foi o escolhido** como site oficial da Juventude Popular. Este repositório serve de **referência técnica**.

## Estado atual (2026-10-10)

| Elemento | Estado |
|---|---|
| Site público | Publicado como demonstração: https://jp-nacional.vercel.app |
| Backoffice e portal | Backoffice (sem acesso): jp-admin-pi.vercel.app | Portal: jp-portal.vercel.app |
| Bases de dados (`jp-militancia`, `jp-portal`) | Limpas de dados de teste: sem militantes, pedidos, contas, comunicados, auditoria, eventos ou encomendas. Mantidos só os dados de referência (distritos, concelhias, ex-dirigentes, órgão nacional, produtos, *badges*, categoria do fórum). **Não existe nenhuma conta**, nem de administrador |
| Edge Functions | Código exportado para `supabase/functions/` |
| Ficheiros em Storage | Os de teste devem ser apagados (`scripts/limpar-storage.mjs`) |
| Dados reais | **Nenhum.** Não introduzir dados reais sem autorização |

## Desativar o protótipo (recomendado se não vai ser usado)

1. **Vercel:** apagar ou pausar os projetos `jp-admin` e `jp-portal`. Manter apenas `jp-nacional` se a demonstração for para mostrar.
2. **Supabase:** pausar os projetos *(Project Settings → General → Pause project)*. São recuperáveis.
3. **Chaves e segredos:** revogar ou rodar `SUPABASE_*SERVICE_ROLE*`, `STRIPE_*`, `BREVO_*`, `UPSTASH_*`, `SYNC_SHARED_SECRET`, `CRON_SECRET`. Desativar o *webhook* do Stripe.
4. **Site de demonstração:** se a loja não estiver configurada, `NEXT_PUBLIC_SHOP_ENABLED=false`; sem Supabase ativo, o formulário de adesão e a newsletter deixam de funcionar — confirmar o que a demo mostra.
5. **GitHub:** repositório público de portefólio; no fim, arquivado (`gh repo archive`) para ficar só de leitura.

## Repor em produção (se o projeto for retomado)

Seguir [`DEPLOY.md`](DEPLOY.md) e [`OPERACOES.md`](OPERACOES.md) e **resolver primeiro** os pontos críticos de [`PONTOS-DE-ATENCAO.md`](PONTOS-DE-ATENCAO.md): agendamento `pg_cron` com valores de substituição, `email_templates` vazia, possível *open redirect* no portal, registo aberto no portal e políticas RLS permissivas.

## Marca, direitos e licença

- O protótipo usa o nome, a identidade visual e conteúdos da Juventude Popular **com autorização da organização**. Esses elementos continuam a pertencer à JP.
- O **código** é do autor e está sob a licença do ficheiro [`LICENSE`](../LICENSE) (*todos os direitos reservados*, com permissão para consulta como portefólio). Se quiseres uma licença aberta (por exemplo MIT), substitui o ficheiro, deixando de fora a marca, os logótipos e as fotografias da JP.
- **Fotografias e nomes de dirigentes** (`jp-nacional/public/lideres`): confirma que a autorização da JP também cobre a sua publicação, ou retira-as antes de tornar o repositório público.
