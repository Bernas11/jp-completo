# Testes

| Camada | Ferramenta | Comando | Onde |
|---|---|---|---|
| Unitários | Vitest | `npm test` | `jp-admin/tests/*.test.ts`, `jp-portal/tests/*.test.ts` |
| End-to-end | Playwright | `npm run test:e2e` | `jp-*/tests/e2e/` (e `jp-nacional/tests/`) |
| Tipos / lint | TypeScript / ESLint | `npm run typecheck`, `npm run lint` | cada app |

## Playwright

```bash
npx playwright install chromium
```

Cada app arranca o seu próprio servidor (`npm run build && npm run start`). Para testar um site já publicado, define `E2E_BASE_URL`.

### Especificações incluídas

- **`jp-nacional/tests/smoke.spec.ts`** — carrega as 14 rotas públicas (sem erros HTTP/JS), 404, validação do formulário de adesão, API da newsletter. O teste *«adesão completa»* **escreve na BD e envia emails**: só corre com `E2E_ALLOW_WRITE=1`.
- **`jp-admin/tests/e2e/admin.spec.ts`** — todas as rotas protegidas redirecionam para `/login` sem sessão; credenciais inválidas; com sessão (CPN) abre as 18 rotas. Variáveis: `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_TOTP_SECRET` (segredo base32 mostrado no QR; requer `npm i -D otplib`).
- **`jp-portal/tests/e2e/portal.spec.ts`** — rotas protegidas redirecionam para `/login`, páginas públicas, `/verificar/<n.º>` e pedido de *magic link*.

> **Estado:** estes specs foram escritos a partir da leitura do código e **ainda não foram executados**. Corre-os e ajusta seletores/mensagens que tenham mudado.

### Boas práticas

- Usar contas e emails de teste (`@example.com`); limpar depois com `docs/OPERACOES.md`.
- O login do admin tem *rate limit* por IP: evita repetir logins falhados em massa.
- Não correr os testes de escrita contra produção sem avisar a CPN.

## Integração contínua (GitHub Actions)

`.github/workflows/ci.yml` corre, para cada app (`jp-nacional`, `jp-admin`, `jp-portal`): `npm ci` → lint → typecheck → Vitest → build (com variáveis fictícias). O Playwright **não** corre no CI por omissão — precisa de um ambiente de teste (projetos Supabase de teste) e de segredos próprios; usa-se manualmente (`workflow_dispatch`).

## Testes de segurança SQL

`jp-admin/db/security-tests/red-team-suite.sql` contém verificações de RLS/permissões para executar **num ambiente de teste** (nunca em produção).
