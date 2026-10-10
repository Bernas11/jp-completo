# Como aplicar esta documentação ao teu repositório

O zip original (`jp-completo.zip`) tinha pastas duplicadas (`jp-admin/jp-admin`, `jp-portal/jp-portal`, `jp-nacional/jp-nacional`). Esta documentação assume a estrutura **achatada**:

```
repo/
├── README.md, docs/, scripts/, supabase/
├── jp-nacional/   (conteúdo de jp-nacional/jp-nacional)
├── jp-admin/      (conteúdo de jp-admin/jp-admin)
└── jp-portal/     (conteúdo de jp-portal/jp-portal)
```

1. Cria o repositório no GitHub **como privado**. Só o tornas público no passo 7, depois de verificares tudo.
2. Move o código das 3 apps para as pastas acima (sem a pasta duplicada).
3. Copia por cima deste conjunto de ficheiros: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.gitignore`, `.github/`, `docs/`, `scripts/`, `supabase/` e os `README.md`, `.env.example` e specs Playwright de cada app (o README de `jp-nacional` substitui o texto padrão do `create-next-app`).
   - Em `.github/CODEOWNERS` e `SECURITY.md`, preenche o teu utilizador do GitHub e o contacto de segurança.
   - O CI assume que cada app tem `package-lock.json` (usa `npm ci`); se usares outro gestor, ajusta o workflow.
4. Antes do primeiro commit, confirma que **não existe nenhum `.env*` com valores reais** (`git status` e `git diff --cached --name-only`). Os `.vercel/` também ficam de fora.
5. `git add . && git commit -m "docs: documentação do sistema" && git push`.
6. **Descrição, site e arquivo** (GitHub CLI; o repositório é um protótipo):

```powershell
gh repo edit --description "Protótipo (não oficial) do ecossistema digital da JP: site, backoffice e portal" `
             --homepage "https://jp-nacional.vercel.app"
gh repo edit --add-topic prototype --add-topic nextjs --add-topic supabase
# quando já não for mexer mais (fica só de leitura; reversível nas definições):
gh repo archive --yes
```
7. **Antes de tornar público** — checklist:
   - [ ] Pesquisa de segredos sem resultados (o script PowerShell já faz uma; para mais rigor: `winget install gitleaks.gitleaks` e `gitleaks detect --source . --no-git`)
   - [ ] Repositório novo, sem histórico antigo (o script usa `git init`); se vieres de outro repositório, **não** publiques o histórico antigo
   - [ ] Nenhum `.env*` real nem ficheiros `.vercel/` (`git ls-files | Select-String "\.env|\.vercel"` só deve mostrar `.env.example`)
   - [ ] Fotografias e nomes de dirigentes (`jp-nacional/public/lideres`) cobertos pela autorização da JP
   - [ ] `SECURITY.md` com o teu contacto e `CODEOWNERS` com o teu utilizador
   - [ ] No GitHub: 2FA na conta, *secret scanning* e *push protection* ativos
   - [ ] Projetos Supabase com **service role** e chaves nunca expostas; se alguma esteve exposta, rodá-la

```powershell
gh repo edit --visibility public --accept-visibility-change-consequences
gh repo edit --description "Protótipo (não oficial) do ecossistema digital da JP: site, backoffice e portal" `
             --homepage "https://jp-nacional.vercel.app"
```
