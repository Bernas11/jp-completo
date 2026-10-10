# Contribuir

> Repositório público de portefólio (protótipo). Pode ficar **arquivado** (só de leitura); se for desarquivado, seguir as regras abaixo.

## Fluxo de trabalho
1. Cria um ramo a partir de `main`: `feat/…`, `fix/…`, `docs/…`.
2. Faz alterações pequenas e focadas, numa só app sempre que possível (cada app é um projeto independente).
3. Antes de abrir o *Pull Request*, na pasta da app: `npm run lint && npm run typecheck && npm test`.
4. Abre o PR com o modelo do repositório; o CI corre lint, tipos, testes e *build* das três apps.
5. Faz *merge* depois de revisão. `main` está ligado ao deploy de produção na Vercel — não fazer *push* direto.

## Convenções
- **Commits** (Conventional Commits): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Português** nos textos para o utilizador, mensagens de erro e documentação; código e identificadores como já estão em cada app.
- **Validação** de entradas com Zod; **permissões** nas Server Actions via `roleProtectedActionClient` e, sempre, também em RLS.
- **Novas variáveis de ambiente:** adicionar a `.env.example` e a `docs/AMBIENTE.md`.

## Base de dados
- A produção é a fonte de verdade. Alterações de esquema/RLS: escrever o SQL, aplicá-lo em ambiente de teste, guardá-lo no repositório (migration) e atualizar `docs/schema/`.
- **Nunca** correr `drizzle-kit migrate` contra produção (ver `docs/PONTOS-DE-ATENCAO.md`).
- Alterações às Edge Functions: editar em `supabase/functions/` e fazer *deploy* a partir daí.

## Segurança
Nunca incluir segredos, chaves, dados de militantes ou cartões de cidadão no repositório, nem em *issues*/PRs. Ver [`SECURITY.md`](SECURITY.md).
