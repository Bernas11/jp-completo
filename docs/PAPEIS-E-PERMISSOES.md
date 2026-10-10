# Papéis e permissões

## Hierarquia

O backoffice usa uma hierarquia **linear**: um papel pode fazer tudo o que os inferiores fazem (`roleAtLeast` em `jp-admin/lib/safe-action.ts`).

```
cpn  >  administrador  >  moderador_nacional  >  moderador_distrital  >  moderador_concelhio  >  militante  >  simpatizante
```

| Papel | Descrição |
|---|---|
| `cpn` | Comissão Política Nacional — controlo total. |
| `administrador` | Gestão operacional (conta técnica de Suporte/TI). **No portal é tratado como `militante`**: não é uma função de moderação de comunidade. |
| `moderador_nacional` | Pessoal nacional: comunicação e eventos. |
| `moderador_distrital` | Âmbito do seu distrito (`profiles.district_id`). |
| `moderador_concelhio` | Âmbito das concelhias em que é `moderator_profile_id`. |
| `militante` | Membro aprovado; só usa o portal. |
| `simpatizante` | Conta sem filiação (papel por omissão). |

**Acesso ao backoffice** (`app/(admin)/layout.tsx`): só `moderador_concelhio` e acima; sem `cargo` preenchido, é enviado para `/onboarding`; os restantes vão para `/sem-permissao`.

> A verificação nas Server Actions é a «primeira barreira»; **a segurança definitiva são as políticas RLS** (ver `docs/schema/`). As duas camadas nem sempre coincidem — por exemplo, por RLS o `moderador_nacional` pode escrever em `members`, mas as Server Actions só deixam a CPN editar militantes.

## jp-admin — papel mínimo por ação

| Papel mínimo | Ações |
|---|---|
| **`cpn`** | Convidar administrador · alterar papel · revogar acesso de administrador · **importação em bulk** (validar/confirmar) · **revogar filiação** · **editar militante** · apagar concelhia · apagar documento público · criar/apagar cargos e atribuir/libertar titulares dos **órgãos nacionais** |
| **`administrador`** | **Aprovar/recusar pedidos** · ver cartão de cidadão (link temporário) · exportar militantes (CSV/Excel) · criar/editar/ativar concelhias e atribuir moderador de concelhia · atribuir moderador distrital · carregar/registar documentos públicos · CRUD de líderes · CRUD de Atividades (`news`) e tornar evento público · CRUD de produtos e stock · atualizar/cancelar encomendas · exportar estatísticas (Excel/PDF) |
| **`moderador_nacional`** | Criar rascunho e **enviar comunicados** · criar/editar/apagar eventos e ver presenças |
| Qualquer staff | Dashboard, perfil, leitura (limitada pelo RLS ao seu âmbito) |

Regras adicionais:
- Só a CPN pode atribuir os papéis `administrador` e `cpn` (trigger `prevent_self_privilege_escalation`).
- Ninguém altera o próprio papel ou distrito; não se pode remover o último membro da CPN.
- Todas as ações sensíveis ficam em `audit_log`.
- O número de militante é gerado automaticamente e não é editável.

## jp-portal — quem pode o quê

| Ação | Quem |
|---|---|
| Ler mural, fórum, sondagens, eventos, wiki, documentos, arquivo, perfis | Qualquer utilizador autenticado |
| Criar tópicos, responder, reagir, votar, enviar mensagens | Qualquer utilizador autenticado **não restrito** (sem suspensão ativa nem *ban* aprovado) |
| Publicar no mural/sondagens/documentos | `cpn`; moderador distrital/concelhio **apenas no seu âmbito** |
| Criar categorias globais do fórum, wiki, arquivo de congressos | `cpn` |
| Moderar (fechar/apagar tópicos, mural, sondagens, documentos) | `cpn`; `moderador_nacional` (âmbito nacional); distrital/concelhio no seu âmbito |
| Organizar eventos `geral` | Moderador do respetivo nível (nacional / distrital / concelhio) |
| Organizar eventos `conselho_nacional` e `congresso_nacional` | `cpn`, ou quem tenha uma concessão ativa em `event_permission_grants` |
| Resolver denúncias | Moderadores do âmbito do conteúdo denunciado |
| Aplicar silenciar/suspender | Moderadores; **`ban_permanente` só produz efeito depois de aprovado pela CPN** |
| Gerir perfis de outros / badges | `cpn`, `moderador_nacional` |

### Do backoffice para o portal (mapeamento de papéis)
`cpn`, `moderador_nacional`, `moderador_distrital`, `moderador_concelhio` mantêm-se; **qualquer outro (incluindo `administrador`) torna-se `militante`**. Um militante revogado passa a `simpatizante`.
