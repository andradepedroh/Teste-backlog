---
name: spec-implement
description: >
  spec-implement (Fase 11 — Implementação) — invocar quando o usuário quiser implementar
  work items (tasks, user stories) gerados por spec-tasks. Lê o work item do Azure DevOps
  ou o tasks.json (fonte única de verdade), aplica as regras do projeto, executa as
  validações e atualiza o estado do work item. Trabalha test-first: antes de qualquer
  código de produção monta o Test Blueprint — as camadas que as rules técnicas exigem
  (unit, integração, contrato, E2E, carga) e a matriz de cenários (caminho feliz, entrada
  inválida, violação de regra de negócio, autorização, borda, falha externa), planejando
  os cenários quando o work item não os traz estruturados. Nunca só o caminho feliz.
  Suporta implementação incremental (uma task por vez) ou em lote. Termina sempre com uma
  devolutiva no chat, em português simples, sobre o que mudou para o negócio, as decisões
  técnicas sem jargão e como o código faz isso. Pré-requisito: tasks.json gerado por spec-tasks (Fase 8). Conteúdo
  humano gerado em Português do Brasil.
version: "2.4"
updated: "2026-10-19"
---

# spec-implement — Implementação de Work Items (test-first)

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`TASK-001`, `MOD-XXX`, `RF-XXX`).

## Papel

Esta é a **Fase 11** da cadeia técnica. Implementa work items (tasks, user stories) individuais gerados pela Fase 8 (`spec-tasks`).

Orchestrates **end-to-end implementation** of a single **work item** (or a **User Story** with explicit scope) using:

1. **Azure DevOps MCP** (`@azure-devops/mcp`) ou `tasks.json` local para ler work items — **fonte única de verdade** (spec-tasks garante que cada work item é auto-suficiente).
2. **Technical rules** from a **rules directory** supplied by the user (e.g. the project's `.cursor/rules/`) — incluindo a **estratégia de testes automatizados** declarada nelas.
3. **Code changes** limited to **repository folders** the user names (one or more roots under the workspace).
4. **Technical specs** (`data-model.json`, `api-contracts.yaml` from Fase 7) — **optional cross-check only**, used **only when the work item itself explicitly references them**. On conflict, the **work item wins**; report the divergence in the ADO comment.

**Out of scope:** generating `tasks.json` (use **`spec-tasks`** — Fase 8); scaffolding a brand-new module from rules only (use **`spec-scaffold`** — Fase 10 when the user needs a new deployable skeleton first).

> **Language:** Skill text is **English** (agent-facing). Language policy for product code identifiers is defined in the project rules — follow them exactly.

---

## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)

<!-- linguagem-clara:v1 inicio -->
<!-- Bloco canônico. Ao alterar, rodar `python scripts/apply_linguagem_clara.py` para replicar em todas as skills. -->

**Quem lê não é você.** É o desenvolvedor que pegou a task sem ter participado do discovery, o PO
que precisa aprovar, o analista que entrou no time semana passada. Texto correto e ilegível custa
uma reunião — e quem lê desiste e vai perguntar. Escrever difícil não é sinal de rigor: é defeito de
geração, do mesmo peso de um campo obrigatório faltando.

**Alvo verificável:** uma pessoa que nunca viu este projeto entende o que precisa fazer **lendo uma
vez**, sem abrir outro documento e sem precisar procurar o significado de nenhuma palavra.

### As 10 regras

1. **Frase curta, voz ativa, presente.** "O serviço confere o CPF antes de gravar" — não "a
   validação do CPF é realizada previamente à persistência". Alvo: até ~25 palavras por frase, uma
   ideia por frase.
2. **Termo técnico ganha explicação de meia linha na primeira aparição:** "no repository (a classe
   que conversa com o banco)", "um índice único (o banco passa a recusar duplicados sozinho)". Da
   segunda vez em diante, usar o termo puro.
3. **Nenhuma sigla solta.** Expandir na primeira aparição — inclusive as siglas do negócio e as da
   própria metodologia: "IDOR (quando um usuário consegue acessar o registro de outro)",
   "DV (Documento de Visão)", "RN (Regra de Negócio)".
4. **Código de regra ou de requisito nunca substitui o conteúdo dela.** Escrever a regra por extenso
   e pôr o código no fim, entre parênteses: "não deixa cadastrar dois clientes com o mesmo CPF
   (RN-012)". "Implementar a RN-012" não informa nada a quem não tem o documento aberto.
5. **Nome de arquivo, tabela, rota ou classe sempre acompanhado do papel dele.**
   `PedidoService.java` sozinho não diz nada; `PedidoService.java — onde ficam as regras de quando
   um pedido pode ser aprovado` diz. Vale igual para `TB_PEDIDO` e para `POST /pedidos`.
6. **Sem jargão de processo.** "blueprint", "gate", "FATAL", "matriz de cenários", "compact-prose",
   nome de validator, nome de camada de arquitetura: isso é vocabulário interno das skills, não do
   leitor. Traduzir — em vez de "6 cenários da matriz em VERDE", escrever "testei 6 situações, todas
   passaram".
7. **Sem "simplesmente", "basta", "apenas", "trivial", "é só".** Minimizam a dificuldade e afastam
   quem não entendeu de primeira.
8. **Verbo no lugar de substantivo; ativa no lugar de passiva.** "realizar a validação" → "validar";
   "efetuar o cadastramento" → "cadastrar"; "é disponibilizado ao usuário" → "o sistema mostra";
   "deve ser efetuada a persistência" → "grava no banco".
9. **Cenário de teste é uma frase "quando X, o sistema Y"** — nunca o id do cenário, nunca o nome do
   método de teste: "quando o CPF já existe, o sistema recusa e mostra 'CPF já cadastrado'".
10. **Bloco técnico denso abre com uma frase em português dizendo o que ele significa.** Contrato de
    API, colunas de tabela, status HTTP, schema, JSON: o conteúdo continua **completo e preciso** —
    o que muda é que antes dele vem uma linha do tipo "esta rota cria o pedido e devolve o número
    dele; se o CPF não existir, recusa com 404". Precisão técnica e legibilidade não competem: a
    frase de abertura é o mapa, o bloco é o território.

### Antes → depois (referência de tom)

| Complexo (não usar) | Claro (usar) |
|---|---|
| "Implementar validação de unicidade conforme RN-012, com persistência idempotente." | "Impedir o cadastro de dois clientes com o mesmo CPF. Se o CPF já existir, o sistema recusa e mostra 'CPF já cadastrado' — nada é gravado. Se a mesma requisição chegar duas vezes, o resultado é o mesmo da primeira (RN-012)." |
| "A entidade é submetida ao processo de normalização previamente à sua persistência." | "Antes de gravar, o sistema padroniza os dados: tira acento, deixa em maiúscula e remove espaço sobrando." |
| "Realizar o tratamento de exceções no fluxo de integração." | "Se o sistema externo não responder, tentar mais 2 vezes. Se ainda falhar, guardar a solicitação na fila e avisar o usuário que o processamento termina depois." |
| "Garantir a aderência aos padrões arquiteturais definidos." | "Seguir o padrão do projeto: a tela nunca fala direto com o banco, sempre passa pelo serviço." |
| "Disponibilizar endpoint para consulta paginada de pedidos com filtros." | "Criar a busca de pedidos: quem chama informa a página e pode filtrar por cliente, período e situação. A resposta traz 20 pedidos por vez e o total encontrado." |
| "Efetuar refatoração do componente visando redução do acoplamento." | "Separar o componente em dois, para que mudar a regra de desconto deixe de exigir mexer na tela." |

### Como conferir antes de entregar (30 segundos)

1. Leia em voz alta a **primeira frase de cada seção**. Travou a língua? Reescreva.
2. Existe alguma palavra que um analista de primeiro emprego **não usaria numa conversa**? Troque, ou
   explique entre parênteses na primeira aparição.
3. Alguma frase obriga a abrir outro documento para fazer sentido — sigla, código de regra, nome de
   arquivo sem o papel dele? Complete ali mesmo.
4. Algum bloco técnico começa direto no JSON, na tabela ou no YAML? Ponha a frase de abertura.

> **Isto não autoriza cortar conteúdo.** Nenhuma das regras acima permite resumir, omitir campo
> obrigatório ou trocar dado concreto por prosa. Linguagem clara é sobre a **forma**; densidade,
> precisão e auto-suficiência continuam sendo sobre o **conteúdo**. As duas coisas valem juntas.

<!-- linguagem-clara:v1 fim -->

### Aplicação nesta skill

Vale para o `spec_story.md`, para o comentário no work item e para a devolutiva no chat do passo J. As **Regras de escrita** da seção de devolutiva (mais abaixo) são a aplicação desta régua ao formato daquele passo — as duas valem, não há conflito entre elas.

## Princípio central — o teste é o plano, não o resíduo

Esta skill trabalha **test-first**. A ordem não é negociável:

```
o que precisa ser verdade  →  como isso será provado  →  código que torna verdade  →  provas rodando
   (cenários)                  (Test Blueprint)            (implementação)              (testes verdes)
```

**Por quê.** Enquanto os testes eram a última etapa, eles competiam com "a task já está funcionando"
e perdiam: o agente escrevia o caminho feliz e declarava pronto. Quando a matriz de cenários e os
nomes dos arquivos de teste existem **antes** da primeira linha de produção, a implementação passa a
ser *o que falta para essas linhas passarem* — e a cobertura deixa de depender de disciplina no fim
do fôlego. Não é TDD estrito (o teste não precisa ser escrito antes do código), mas a **decisão do
que será testado** é sempre anterior ao código.

**Consequência prática:** o Test Blueprint (§ Fase 2) é um **gate FATAL**. Editar código de produção
antes de ele existir é defeito de execução, não estilo.

---

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-implement | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

**Gate `IMPL_COVERAGE` (WARNING — obrigatório na coluna `<questões em aberto>`):** registrar os
números do blueprint, no formato:
`IMPL_COVERAGE: cenários=N (verdes=a, vermelhos=b, não cobertos=c) | camadas=unit/int/contrato/e2e/carga | fonte=structured|derived|mista`.

---

## Quick start (execution order)

```
A → Collect inputs — work item id, Azure DevOps project, code folder(s), rules path(s)
B → Read spec_story.md — load module memory from each code folder (if exists)
C → Fetch work item via MCP (Mode A) or locate it in tasks.json (Mode B)
D → If User Story — confirm scope: single deliverable vs children; stop and ask if ambiguous
D2 → Conferir as dependências da task (andamento.mjs conferir) — dependência aberta → perguntar;
     na primeira task da US, criar o marcador outputs/spec/em-andamento.md (andamento.mjs abrir-us)

    ── FASE 2 — PROJETO DE TESTES (nenhum código de produção ainda) ──
E1 → Descobrir a estratégia de testes automatizados nas rules técnicas e tirar a linha de base
     dos comandos (validar.mjs linha-de-base), antes de qualquer código
E2 → Montar a matriz de cenários (do work item, ou PLANEJAR quando ele não os traz)
E3 → Mapear cada cenário → camada de teste → arquivo::nome do teste
E4 → Congelar o Test Blueprint e reportá-lo (gate TEST_BLUEPRINT_BEFORE_CODE)

    ── FASE 3 — IMPLEMENTAÇÃO ──
F  → Implementar nas pastas listadas, guiado pelo blueprint (rules + spec_story.md)

    ── FASE 4 — PROVAS ──
G1 → Escrever os testes do blueprint, camada por camada
G2 → Rodar testes → build → lint; cobertura vs. threshold das rules
G3 → Validação independente: validar.mjs + validadores e corretor em laço, até APROVADO ou PARADO
H  → Mode A: update Azure DevOps — comment with results + matriz condensada, state → Testing
     Mode B: andamento.mjs concluir — status "DONE" na task do tasks.json
I  → Update spec_story.md — entrada nova com o que foi feito, decisões, matriz e pendências
J  → Devolutiva em chat — explicar o que foi feito (negócio), as decisões técnicas sem
     jargão (para quem não é técnico) e como foi feito (técnico), em linguagem simples,
     SEMPRE, nos dois modos
```

---

## Prerequisites (environment)

| Requirement | Details |
|-------------|---------|
| **Azure DevOps MCP** | Cursor must have the **`ado`** (or equivalent) MCP server enabled. |
| **Agent mode** | Tools must be invocable so the agent can call work-item operations. |
| **Project name** | Azure DevOps **project** name (as in the URL/API), not only the Git repo name. |

If MCP is unavailable **and no `tasks.json` was provided**, **stop** and tell the user to configure
MCP; do not pretend work-item data was fetched. With a `tasks.json` in hand, MCP is not required —
run **Mode B** (below), where the ADO-specific steps simply do not exist.

---

## A — Inputs (normative)

The user must provide the following (ask once for any missing piece):

| Input | Required | Description |
|-------|----------|-------------|
| **Work item ID** | Yes (Mode A) | Numeric id (e.g. `12345`). Em **Mode B**, o equivalente é o `task.id` dentro do `tasks.json` (ex.: `TASK-014`). |
| **Azure DevOps project** | Yes (Mode A) | Project name string for API/MCP calls (`project` parameter on tools such as get/update work item). Não se aplica em **Mode B**. |
| **`tasks.json`** | Yes (Mode B) | Caminho do `tasks.json` produzido pela `spec-tasks`, quando não há Azure DevOps. Substitui os dois campos acima. |
| **Code folders** | Yes | One or more workspace-relative or absolute paths to **roots where edits are allowed** (e.g. `src/`, `backend/`, `my-module/`). The agent must **not** modify files outside these roots except if the user explicitly expands scope. |
| **Rules directory or @mentions** | Yes | Path(s) to norms. When a directory is given: enumerate and **read every** normative file under it (e.g. all `*.mdc`), **without cherry-picking** by topic — implementation must comply with the **merged** corpus. **A regra de testes é de leitura obrigatória** (ver Fase 2 · E1). @mentions may add files outside that directory. **How to locate the rules dir per environment** — see "Resolve rules location" below. |

**Optional**

| Input | Use |
|-------|-----|
| **Organization / server** | Only if the user's MCP setup requires distinguishing hosts; default is dev.azure.com via MCP. |
| **Override target state** | If the process template does not use a state literally named `Testing`, the user may supply the exact **state name** for QA handoff (must match Azure DevOps). |
| **data-model.json / api-contracts.yaml** | **Optional cross-check only** — read **only if the work item explicitly references them**. Never primary inputs; the work item's own description/AC is authoritative. |
| **`--no-e2e` / `--no-load`** | Free-text instruction from the user to **adiar** camadas caras nesta invocação. Não remove a linha da matriz e **não dispensa a criação do script**: o arquivo de teste é escrito e commitado, a linha fica `NÃO COBERTO (adiado pelo usuário — script em <caminho>)` e vira `E2E_SCENARIO_DEFERRED` / `LOAD_SCENARIO_DEFERRED` (WARNING). |

---

## Resolve rules location (multi-environment)

This skill runs in **Cursor**, **Claude Code**, **Claude Cowork**, or **Kiro**. The rules corpus
lives in a different place in each — resolve it in this order and **read every** matching
rule file (`*.mdc` / `*.md`) from **all** locations found, merging them. Project rules **win** on
conflict.

1. **Project repo rules (highest priority):** if the project's code folder/repo contains
   `.claude/rules/`, `.cursor/rules/` or `.kiro/steering/`, read every file there. These are the
   project-specific norms and **override** anything generic.
2. **Engine rules (generic):**
   - **Kiro:** the workspace `.kiro/steering/*.md` (the harness ones are named `harness-*.md`; the
     rest are the project's, written by `spec-tech-rules`), the global `~/.kiro/steering/`, and
     `AGENTS.md`. **Read the files explicitly, whatever their `inclusion` mode says.** Kiro loads
     steering by itself only per `inclusion`, and the Kiro CLI V1/V2 loads only `always` rules on
     its own — a `fileMatch` or `auto` rule (frontend, tests…) would be silently missing from the
     implementation if this skill relied on auto-loading.
   - **Cursor:** the user's `.cursor/rules/`.
   - **Claude Code:** `~/.claude/rules/` (user layer) and/or the Eng_Proc repo's `.claude/rules/`.
   - **Claude Cowork:** the rules bundled with the **eng-proc-spec plugin** (`rules/` inside
     the plugin) and/or the connected Eng_Proc folder's `.claude/rules/`. `~/.claude/` is
     **not** read in Cowork — do not rely on it there.
3. **Always apply `security.mdc`** regardless of file type. Apply context rules
   (e.g. `frontend.mdc`) when touching files they cover (`.ts/.tsx/.js/.jsx/.html/.css`).
4. **Harness Elo:** a `security` e a constituição de frontend do harness moram em
   `.claude/rules/harness/security.md` e `.claude/rules/harness/frontend.md`, na pasta do harness —
   que pode não ser a do código — e não são copiadas para a raiz (Decisão 73). Ler as duas
   **explicitamente**; a de frontend sempre que a task tocar tela. Ela só carrega sozinha quando se
   abre um arquivo de tela da raiz do harness, e o `frontend` da raiz, quando existe, é o complemento
   do projeto e remete a ela.

If you cannot locate any rules directory, **stop and ask** the user where the project's
rules are — do not implement against generic assumptions only.

> **Cowork folder check:** if the project's code folder is **not connected** to the current
> Cowork session, stop and ask the user to connect it (the "+"/folder picker). The agent can
> only read/edit folders connected to the session.

---

## B — Read spec_story.md (module memory)

Before fetching the work item, load the memory of each code folder:

1. For **each code folder** supplied by the user, check if `spec_story.md` exists at its root.
2. If the file exists, **read it in full** before doing anything else.
3. Treat its contents as authoritative context for this session:
   - **Padrões estabelecidos** — patterns that must be followed in all new code (naming, soft delete strategy, pagination style, migration naming, etc.). These override any generic assumption the agent might make.
   - **Estratégia de testes do módulo** — runner, localização dos testes, comandos que já rodaram
     antes, fixtures/factories reutilizáveis. Usar isso na Fase 2 · E1 antes de redescobrir o stack.
   - **Histórico de tasks** — what was already implemented, which files/endpoints exist, decisions already made. Use this to avoid duplicating work or contradicting prior decisions.
4. If `spec_story.md` does **not** exist, proceed normally — it will be created at the end (passo I).
5. If multiple code folders are given, read each folder's `spec_story.md` independently.

> **Why this matters:** Each task runs in a fresh session with no memory of prior tasks. The `spec_story.md` is the only persistent record of what was built before. Ignoring it risks reimplementing existing code, breaking established patterns, or contradicting prior decisions.

---

## C — Fetch work item (MCP) — Mode A

1. Call the MCP tool that **gets a work item by ID** (e.g. `wit_get_work_item` on the Cursor `ado` server — parameters include **`id`** and **`project`**).
2. Parse at minimum:
   - Title, **Description**, **Acceptance Criteria** (or custom fields your process uses)
   - **State**, **Work Item Type**, **Iteration**, **Area**
   - **Links** (parent/child, predecessor — conferida no § D2 —, related PRs)
   - **Attachments** — if acceptance depends on images/specs, use the attachment download tool when available
3. If the description is empty, check **history/comments** for scope; if still unclear, **ask the user** before large assumptions.

**Tool names** may vary slightly by MCP client; always read the **MCP tool descriptor** before invoking.

> Work items exportados por `spec-tasks-azure` carregam no corpo o conteúdo das tasks do
> `tasks.json` (cenários, regras, contratos). Ler a descrição inteira **antes** de concluir que a
> task "não tem cenários" — em Mode A eles costumam vir em prosa/HTML, não em JSON.

---

## C (alt) — Mode B — tasks.json local

Everything above ("Prerequisites", "C — Fetch work item (MCP) — Mode A") describes **Mode A — Azure DevOps**,
the default when an ADO project + work item id are available. When no Azure DevOps project/work
item id is given, or the user explicitly points to a `tasks.json` produced by `spec-tasks`
(Fase 8), run in **Mode B** instead:

1. **Locate the task by id** inside `tasks.json` under `stories[].tasks[]` (search every
   story's `tasks[]` array for `task.id === <TASK-ID>`). If the id is not found, stop and ask
   the user to confirm the id or the `tasks.json` path.
2. Treat the located task object as the **work item** for every remaining step of this skill —
   its `title`, `description`/`prompt`, `acceptanceCriteria`/`acceptanceScenarios[]`, and any
   `businessRules[]` / `apiContracts[]` / `persistenceModel` / `implementationGuidance` fields
   play the same role as the ADO fields described in "Fetch work item (MCP)".
3. **Classe da task (`class`)** muda o que se espera encontrar — ver § "Classes de task e o
   blueprint" na Fase 2.
4. Skip everything that is **ADO-specific**: there is no MCP call, no work item comment, and no
   `System.State` transition. O equivalente do estado é o `status` da task no `tasks.json`: as
   dependências são conferidas nele antes de começar (§ D2) e a task fecha nele no fim (§ H (Mode B)).
5. **Final step (replaces "Update Azure DevOps — comment + state Testing"):** com o G3 em `fim`,
   gravar a task como concluída no `tasks.json` (§ H (Mode B)), then update
   `spec_story.md` per "I — Update spec_story.md (module memory)" below, then entregar a
   **devolutiva em chat** do passo **J** — que em Mode B é o único relatório existente e, por isso,
   acrescenta ao formato do passo J os dados que em Mode A iriam para o comentário do ADO: matriz
   de cenários condensada, comandos rodados e saída, e qualquer divergência encontrada no
   cross-check opcional com `data-model.json`/`api-contracts.yaml`.

Everything else in this skill (rules resolution, `spec_story.md` read, Test Blueprint,
implementation boundaries, validations, hard rules) applies identically in Mode A and Mode B.

---

## D — User Story vs Task (including parents with children)

| Scenario | Behavior |
|----------|----------|
| **Task / Bug with clear scope** | Implement directly per description + AC. |
| **User Story** **without** requiring children | Implement that **single** work item (the story) per its description + AC. |
| **User Story** that **has child** work items (tasks under the story) | **Do not** automatically read every child and implement **all** of them in one go. You may use MCP to **list child links** only to **inform** scope and to ask a precise question. **Default:** one implementation target per invocation — either the **story id** the user gave (story-level scope only) **or** **one child id** the user explicitly names. **Full backlog under a story** (implement every child) requires the user to **state that explicitly** (e.g. "implement all tasks under story X"); then process in **clear order** (the backlog's `executionOrder`, each child checked first per § D2) and still **one child work item moved to Testing at a time** unless the user allows batching state updates. If the user only passes the **parent story id** and children exist, **stop and ask** whether to target the parent only, **one** child id, or **all** children. |
| **Epic** | Do not implement in one shot; split with the user into stories/tasks. |

> Em execução "all children", o Test Blueprint é **por task filha** — não existe blueprint único
> para a story inteira. Cada filha completa o ciclo Fase 2 → 2 → 3 antes de a próxima começar.

## D2 — Dependências da task e marcador da US (antes da Fase 2)

**Por quê.** Task implementada antes da dependência dela é escrita em cima de código que ainda não
existe, ou que vai mudar. E, em Mode B, o `tasks.json` é o único lugar em que a próxima sessão vê o
que já terminou: se ninguém grava ali, toda task parece pendente para sempre.

**1. Conferir as dependências.** Em Mode B, da raiz do harness:

```bash
node .claude/ferramentas/andamento.mjs conferir --task <TASK-ID> [--tasks outputs/spec/tasks.json]
```

O script lê as `dependencies` (e o apelido `dependsOn`) da task e dos níveis acima dela — story,
feature, epic —, as stories com `mustImplementFirst: true` e o `executionOrder`, e imprime uma linha
JSON. Concluída é a task com `status: "DONE"` — o valor que o
§ H (Mode B) grava. O schema da `spec-tasks` deixa `status` livre, com padrão `PENDING`; ausente ou
qualquer outro valor conta como aberto.

| `acao` (exit) | O que fazer |
|---|---|
| `seguir` (0) | Siga para a Fase 2. Se vier `antesNaOrdem`, diga no relato do blueprint (E4) que há tasks anteriores na ordem do backlog ainda abertas — é aviso, não bloqueio. |
| `perguntar` (1) | **Pare e pergunte** ao usuário, com a `mensagem` e os `pendentes` (dependência declarada aberta ou fora do backlog, story `mustImplementFirst` com task aberta, ou a própria task já `DONE`), se segue mesmo assim. Com o «sim», registre `DEPENDENCY_PENDING` e a decisão no `spec_story.md` (passo I) e na devolutiva (J). Execução desassistida: não comece; devolutiva do J em modo falha. |
| erro (2) | Task ou `tasks.json` não encontrados — o mesmo caminho do item 1 do C (alt). |

Em Mode A, quem diz se a dependência terminou é o Azure DevOps: leia os links de predecessora do
work item (passo C) e o estado de cada uma. Predecessora que não chegou a Testing (ou depois) leva à
mesma pergunta. O `tasks.json` local não guarda estado em Mode A: o dono do estado é o board.

**2. Abrir a US, na primeira task dela.** `outputs/spec/em-andamento.md` é o marcador da US aberta
(`.claude/rules/harness/deliver.md`): existe se e somente se há US em andamento. Quem o cria é esta
skill; quem o apaga é a `auditoria-de-us`, ao fechar a US (FATAL `MARKER_CLEARED` dela). Da raiz do
harness, nos dois modos:

```bash
node .claude/ferramentas/andamento.mjs abrir-us --us <US-ID> --repositorios <repo1,repo2> [--task <TASK-ID>]
```

- `--us`: o id da US como a `auditoria-de-us` vai chamá-la — o `story` que o `conferir` devolveu
  (Mode B) ou o id do work item User Story (Mode A).
- `--repositorios`: os nomes, no `workspace.md`, dos repositórios que a US toca
  (`node .claude/hooks/workspace.mjs --validar` lista as entradas). É desse campo que a
  `auditoria-de-us` tira quais deltas auditar.

O script copia `.claude/templates/em-andamento.md`, preenche o bloco `estado:us` e grava o marcador na
raiz de artefatos do workspace — o repositório de docs, onde o `delivery-gate` o procura.

| `acao` (exit) | O que fazer |
|---|---|
| `criado` (0) | **Commite o marcador** no repositório de docs, na branch da US, antes do primeiro commit de código: o `delivery-gate` lê a árvore do commit, não a pasta. |
| `ja-aberta` (0) | A US já estava aberta (task seguinte da mesma US). Siga. |
| `perguntar` (1) | Outra US está aberta. Pare e pergunte: o marcador é de uma US só, e sai na auditoria dela. |

Enquanto o marcador estiver na árvore, o `delivery-gate` nega o push. É o desenho: o push da US vem
depois da `auditoria-de-us`, que apaga o marcador ao aprová-la.

---

# FASE 2 — Projeto de testes (antes de qualquer código de produção)

> **Nada nesta fase escreve código de produção.** A saída é o **Test Blueprint**: a lista fechada
> do que precisa ser provado, em que camada, em que arquivo, com que dados.

## E1 — Descobrir a estratégia de testes automatizados nas rules

**Sempre procurar** — não assumir que o projeto não tem testes automatizados só porque a task não
os menciona.

**1. Localizar a regra de testes** no corpus de rules já resolvido, nesta ordem:

- arquivo dedicado: `test-strategy.mdc` / `test-strategy.md` / `testing.mdc` / `tests.mdc`;
- qualquer rule cujo `globs` case com caminhos de teste (`**/*Test*`, `**/*Spec*`, `**/test/**`,
  `**/__tests__/**`);
- qualquer seção intitulada "Testes", "Estratégia de Testes", "Pirâmide de Testes" dentro de
  `architecture.mdc` / `conventions.mdc` / `deploy-and-build.mdc`;
- convenções de nomenclatura de teste em `conventions.mdc` (contexto + condição + resultado).

**2. Extrair o que a regra declara.** O `test-strategy.mdc` gerado pela `spec-tech-rules` traz os
blocos abaixo — **E2E e Carga são condicionais** (só existem se o projeto os ativou) e a camada de
**contrato** normalmente só aparece como linha da tabela da pirâmide, sem bloco próprio. Ausência de
bloco significa "o projeto não adotou essa camada", não "esqueceram de escrever":

| O que extrair | Onde costuma estar | Uso nesta skill |
|---|---|---|
| **Pirâmide** (camada · ferramenta · localização · threshold) | tabela "Pirâmide de Testes" | define quais camadas existem e **onde** o arquivo de teste nasce |
| **Restrições de teste de domínio** | "Testes Unitários — Domínio" | proíbe anotação de framework/DI e mock de infra no domínio |
| **Regra de mock** | "Testes Unitários — Use Cases / Services" | mockar só portas de saída, nunca classe concreta de infra |
| **Tipo de teste de integração** + ferramenta de banco | "Testes de Integração" | o tipo de slice e a ferramenta de banco **que a regra declarar** (o template os deixa como parâmetro do projeto); banco fake é **proibido** quando a regra o proíbe |
| **Ferramenta e threshold de cobertura** | "Cobertura" | comando de cobertura + gate `COVERAGE_BELOW_THRESHOLD` |
| **E2E**: ferramenta, localização, escopo (UI / UI+API / API), fluxos críticos | "E2E" | decide se esta task exige cenário E2E |
| **Carga**: ferramenta, localização, tabela de SLO | "Carga" | decide se esta task exige script de carga |
| **Anti-patterns** | "Anti-patterns" | proibições que valem para os testes escritos aqui |

**3. Confirmar contra o repositório.** A rule **declara**; o repositório **confirma o comando**.
Ler `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` / `Makefile` / workflow de CI
para obter o **comando real** de teste, integração, cobertura, E2E e carga. Reutilizar o que já
existe (helpers, factories, fixtures, base classes) — ver também a seção "Estratégia de testes do
módulo" do `spec_story.md`.

**4. Divergências e ausências:**

- Rule declara uma ferramenta que **não está no repositório** → **não instalar nem trocar de stack
  por conta própria**. Usar o que o repositório tem, escrever o teste mesmo assim e reportar
  `TEST_STACK_MISSING` (WARNING).
- **Nenhuma regra de testes** encontrada → inferir a convenção **dos testes que já existem** no
  repositório (localização, nomenclatura, runner) e seguir. Reportar `NO_TEST_STACK_DECLARED`
  (WARNING).
- Nenhuma regra **e** nenhum teste no repositório → **parar e perguntar** ao usuário qual stack
  adotar antes de introduzir um framework de teste (é decisão de projeto, não de task). Se a
  execução for desassistida: **não** escolher framework; entregar a matriz de cenários como
  checklist de verificação manual documentado e reportar `NO_TEST_STACK_DECLARED` em destaque.

**5. Decidir quais camadas se aplicam a ESTA task** (a matriz da pirâmide filtrada pelo que a task
toca):

| Camada | Criar quando a task… | Pode ser dispensada quando… |
|---|---|---|
| **Unit — domínio** | toca entidade, value object, invariante ou cálculo de regra de negócio | a task não altera domínio (só fiação/config) |
| **Unit — use case / service** | toca orquestração, decisão de fluxo, chamada a porta de saída | não há orquestração nova |
| **Integração — slice HTTP / contrato de endpoint** | cria/altera rota, payload, serialização, status de erro, auth | a mudança não cruza a fronteira do processo |
| **Integração — banco/repositório** | cria/altera migration, query, índice, constraint, transação | não há persistência envolvida |
| **Contrato (consumer/provider)** | altera contrato consumido por outro serviço **e** as rules declaram testes de contrato | as rules não declaram essa camada |
| **E2E** | fecha ou altera um fluxo crítico listado na seção **E2E** da regra de testes, ou declarado no `uiContext` da task | o fluxo já é coberto e não mudou — **justificar na matriz** |
| **Carga** | toca endpoint com SLO declarado na tabela de carga das rules ou RNF de performance citado na task | nenhum SLO declarado alcança o que a task toca |

**Dispensa exige linha na matriz com motivo.** Omissão silenciosa de camada é o defeito que este
gate existe para impedir (`TEST_LAYERS_FROM_RULES`).

**6. Tirar a linha de base dos comandos — antes de qualquer código.** Com os comandos confirmados no
passo 3 (o de testes completo, cobertura, lint e o build que o G2 vai rodar), rode uma vez, da raiz
do harness:

```bash
node .claude/ferramentas/validar.mjs linha-de-base --task <TASK-ID> --repo <pasta do código> --cmd-testes "<comando>" [--cmd-cobertura "<comando>"] [--cmd-lint "<comando>"] [--cmd-build "<comando>"]
```

Ela grava como cada comando sai **antes** da task e imprime o caminho do arquivo. No G3, esse arquivo
faz a falha que já existia (um teste vermelho antigo, o lint ou a cobertura do repositório inteiro)
deixar de bloquear — e só ela: linha de falha nova bloqueia como sempre. Tirada depois do código, ela
esconderia a falha da própria task; por isso o relatório do G3 lista os arquivos da entrega que já
estavam alterados quando ela foi tirada. Em lote, uma por task.

## E2 — Montar a matriz de cenários

**Não começar pelo caminho feliz.** Enumerar tudo que o work item implica, em uma tabela:

| ID | Categoria | Fonte | Camada | Arquivo::nome do teste | Dados (fixture) | Status |
|----|-----------|-------|--------|------------------------|-----------------|--------|

Categorias canônicas — as **cinco** que a `spec-tasks` emite em `acceptanceScenarios[].category`
(`HAPPY_PATH` · `INVALID_INPUT` · `BUSINESS_RULE_VIOLATION` · `AUTHORIZATION` · `EDGE_CASE`), mais
`EXTERNAL_SERVICE_FAILURE`, **planejada aqui** quando a task chama serviço externo ou fila. A Fase 8
não emite essa sexta categoria hoje: uma linha `EXTERNAL_SERVICE_FAILURE` é sempre de origem
`derived`, mesmo numa task estruturada.

Status: `PLANEJADO` → `ESCRITO` → `VERDE` / `VERMELHO` / `NÃO COBERTO (<motivo>)`.

**Vocabulário fechado da coluna `Fonte`** (cada linha usa exatamente um destes):

| Valor | Significa | Conta como |
|---|---|---|
| `AS-<id>` | veio de um `acceptanceScenarios[]` do work item | structured |
| `RN-<id>` | veio de `businessRules[].testScenarios[]` / `errorMessages{}` | structured |
| `EH-<chave>` | veio de `implementationGuidance.errorHandling{}` | structured |
| `UI-<estado>` / `UI-<campo>` | veio de `uiContext.estadosUI[]` / `uiContext.fields[]` | structured |
| `API-<status>` | veio de um status declarado em `apiContracts[]` | structured |
| `AC-<n>` | veio de um bullet de `acceptanceCriteria` sem cenário correspondente | structured |
| `TC-<nnn>` | veio de um caso do `test-plan.md` citado pela task (via `coverageNote`) | structured |
| `derived` | planejado aqui a partir da prosa (Caminho 2) ou categoria que a Fase 8 não emite | derived |
| `descoberto` | apareceu durante a implementação, depois do congelamento do blueprint | derived |

O cabeçalho do blueprint (E4) e o relatório de fechamento agregam nas duas últimas colunas:
`structured` / `derived` / `mista (N structured + M derived)`.

### Caminho 1 — o work item traz cenários estruturados (preferencial)

Popular a matriz a partir dos campos que a `spec-tasks` garante:

1. **Cada `acceptanceScenarios[]`** — já traz `category` e `testData` concreto (`request`,
   `mockedExternalResponse`, `expectedResponse`, `expectedDatabaseState`, `expectedEvents`).
   **Usar esse `testData` como fixture e asserção do teste** — não inventar dado mais leve nem
   "simplificar" o payload. `verificationSteps` viram as asserções; `relatedRules` amarram a linha
   à regra de negócio.
2. **Cada `businessRules[].testScenarios[]`** — uma regra com condição negativa (suas
   `implementation.errorMessages{}`, chaves UPPERCASE) **não está implementada** enquanto não
   houver teste provando que a violação é rejeitada **com aquela mensagem exata**.
3. **Cada `implementationGuidance.errorHandling{}`** (a `spec-tasks` garante ≥3 por task) — um
   teste por `scenario`, asseverando o `action`/`userImpact` documentado.
4. **`implementationGuidance.testingStrategy{}`** — quando presente, lista os testes que a Fase 8
   já previu (`unitTests[]` é a única subchave que a `spec-tasks` garante por nome; as demais
   camadas — integração, contrato, e2e, carga — aparecem conforme o projeto). É **piso, não teto**:
   fundir com as camadas decididas em E1; conflito → vence a união dos dois.
5. **`uiContext` (task de UI derivada do flow-map)** — cada estado em `uiContext.estadosUI[]`
   (`vazio`, `carregando`, `erro`, …) é **cenário obrigatório**, um por estado. As
   `uiContext.regras[]` (RN-xxx) **reforçam** as linhas `BUSINESS_RULE_VIOLATION`: toda RN citada
   ali precisa de cenário de violação na matriz.
6. **`uiContext.fields[]`** (a `spec-tasks` o exige em toda task de UI, com `name`, `type`,
   obrigatoriedade e `options[]`/`optionsSource`) — é a fonte mais rica de `INVALID_INPUT`: campo
   obrigatório ausente, tipo errado, valor fora da lista de opções. Ao menos uma linha por classe de
   violação que o inventário de campos permite.
7. **`apiContracts[]` (compact-prose)** — para cada status de resposta declarado (2xx, 4xx, 5xx),
   deve existir linha na matriz. Um 4xx documentado sem teste é cobertura ausente, não detalhe.
8. **`acceptanceCriteria` — todo bullet precisa de destino.** Um critério de aceite que **não** tem
   `acceptanceScenario` correspondente vira **linha própria** na matriz (`Fonte: AC-<n>`), resolvida
   como cenário automatizado, passo manual (`MANUAL_QA_REMAINING`) ou check de build/lint. É o caso
   típico da task `class=security`, cuja âncora é `implementationGuidance.security{}` +
   `acceptanceCriteria`, e não `acceptanceScenarios[]`.

Preencher a coluna `Fonte` com o vocabulário fechado acima.

### Caminho 2 — o work item NÃO traz cenários estruturados

Vale para task antiga, work item de Mode A sem `tasks.json`, Bug, ou task escrita à mão.
**Aqui a skill PLANEJA os cenários** — não é motivo para pular a matriz. Derivar da descrição, dos
critérios de aceite e de qualquer regra em prosa, com este **piso mínimo**:

- **1 `HAPPY_PATH`** — o fluxo documentado com dados válidos.
- **1 `INVALID_INPUT`** — payload malformado, campo obrigatório ausente ou tipo errado.
- **1 `BUSINESS_RULE_VIOLATION` por condição negativa explícita** no texto ("não pode", "deve",
  "obrigatório", "somente se", "apenas quando", "must", "cannot", "only if") — o teste viola a
  condição e assevera **o erro documentado**, não um 4xx genérico.
- **1 `AUTHORIZATION`/ownership** — quando o recurso pertence a um usuário/tenant, um teste que
  tenta ler/alterar recurso de outro dono e assevera a negativa (alinhar com `security.mdc`,
  Camada B — IDOR). Dispensar **apenas** se a task não tem recurso por dono, e dizer isso na linha.
- **1 `EDGE_CASE`** — entrada vazia/nula, limite de tamanho, duplicidade, ou escrita concorrente
  quando a task toca estado mutável compartilhado.
- **1 `EXTERNAL_SERVICE_FAILURE`** — quando a task chama serviço externo/fila: timeout ou resposta
  de erro, asseverando o comportamento documentado (retry, fallback, erro propagado).

**Inventar os dados que faltam, explicitamente.** Sem `testData` pronto, construir fixtures
concretas a partir do modelo de dados/contratos que a própria task declara (`persistenceModel`,
`apiContracts`) e **registrar na matriz** que a massa foi construída aqui. Fixture com placeholder
(`"TODO"`, `"xxx"`, `"a definir"`) não conta como cenário coberto.

Marcar toda linha assim derivada com `Fonte: derived` → dispara `SCENARIOS_DERIVED_FROM_TEXT`
(WARNING): a cobertura é *best-effort*, não garantida pela spec.

> **Não confundir com a `spec-test-plan`.** O `test-plan.md` (Fase 8a) é homologação de negócio,
> executada por pessoa. A matriz desta skill é técnica e automatizada. Quando a `spec-tasks` deriva
> um cenário de um caso de homologação, ela registra o ID em `acceptanceScenarios[].coverageNote`
> (ex.: `"Cobre TC-004 do plano de testes"`) — extrair o `TC-NNN` dali e usá-lo na coluna `Fonte`
> (`TC-004`). É o que permite rastrear homologação ↔ teste automatizado.

### Categoria que não se aplica

Escrever a linha assim mesmo, com a categoria, `NÃO COBERTO` e o motivo
(`SCENARIO_CATEGORY_SKIPPED`, WARNING). **Nunca** omitir a categoria em silêncio — a diferença
entre "não se aplica" e "esqueci" é exatamente o que se perde na omissão.

## E3 — Mapear cenário → camada → arquivo::nome do teste

Cada linha da matriz recebe, **antes de existir código**:

1. **Camada** — da tabela de E1 (unit-domínio, unit-use case, integração-HTTP, integração-banco,
   contrato, E2E, carga). Um cenário pode aparecer em mais de uma camada; nesse caso, uma linha por
   camada.
2. **Arquivo::nome do teste** — caminho conforme a **localização declarada nas rules** e nome
   conforme a **convenção de nomenclatura de teste** do projeto (tipicamente contexto + condição +
   resultado). Ex.: `test/domain/PedidoTest.java::deveRejeitarPedidoComValorNegativo`. Sem convenção
   declarada, espelhar a nomenclatura dos testes que já existem no repositório.
3. **Fixture** — o `testData` do cenário, ou a massa construída em E2, referenciada por nome
   (`fixturePedidoValido`) se for reaproveitável.

**Escolher a camada mais barata que ainda prova o cenário.** Regra de domínio se prova em unit de
domínio, não em E2E; contrato de erro HTTP se prova no slice de integração, não subindo o sistema
inteiro. Escalar de camada só quando a prova barata não alcança o comportamento.

## E4 — Congelar e reportar o Test Blueprint

O **Test Blueprint** é a matriz de E2 completa com as colunas de E3 preenchidas, mais o cabeçalho:

```
Test Blueprint — TASK-XXX
Stack: <runner> | Integração: <ferramenta> | Cobertura: <ferramenta> @ <threshold> | E2E: <ferramenta ou N/A> | Carga: <ferramenta ou N/A>
Fonte dos cenários: structured | derived | mista (N structured + M derived)
Camadas aplicáveis a esta task: <lista> | Dispensadas: <camada — motivo>
Cenários: N (HAPPY_PATH=a, INVALID_INPUT=b, BUSINESS_RULE_VIOLATION=c, AUTHORIZATION=d, EDGE_CASE=e, EXTERNAL_SERVICE_FAILURE=f)
```

**Gate `TEST_BLUEPRINT_BEFORE_CODE` (FATAL):** o blueprint existe, com camada e `arquivo::nome`
preenchidos em toda linha, **antes** da primeira edição em código de produção.

**Reportar o blueprint ao usuário em chat** antes de implementar (é barato e é onde o usuário
corrige o rumo com o menor custo). **Não** bloquear esperando aprovação — seguir direto para a
Fase 3 — **exceto** quando: o usuário pediu confirmação explícita; a derivação produziu zero
cenários; ou a task é ambígua a ponto de o caminho feliz não ser determinável. Nesses casos,
**parar e perguntar**.

## Classes de task e o blueprint

| `class` da task | O que esperar |
|---|---|
| `functional` (padrão) | Blueprint completo. `acceptanceScenarios[]` + `businessRules[].testScenarios[]` + `errorHandling{}` são a fonte; ausência é defeito da Fase 8 → cair no Caminho 2 e sinalizar. |
| `security` (injetada por `spec-security-review`) | O conteúdo âncora é `implementationGuidance.security{}` + `acceptanceCriteria`. `acceptanceScenarios[]` pode não existir — **derivar** cenários de ataque/negação a partir da regra de segurança citada (o caso negativo é o ponto da task). |
| `uat` *(legado)* | **Não gera testes automatizados.** É roteiro de homologação humana. A `spec-tasks` **não gera mais** esta classe (`NO_UAT_BACKLOG`); se um backlog antigo trouxer uma, reportar isso e apontar o `test-plan.md`/executor humano. |
| `spike` | Sem blueprint de produção. A saída é a investigação documentada; registrar no `spec_story.md` e reportar. |

---

# FASE 3 (passo F) — Implementação guiada pelo blueprint

1. **Discover git root:** Changes go under the user's **code folders**; run `git` commands **inside** the correct repo when the user expects a branch/commit (workspace may contain multiple repos — consult the project's workspace map or `AGENTS.md` if present).
2. **Apply rules:** Read every rule file in the **rules directory** supplied by the user; follow all applicable architecture, naming, testing, and build rules for the touched codebase.
3. **Work item is the single source of truth:** Implement strictly from the work item's own description, acceptance criteria, and attachments — `spec-tasks` guarantees each work item is self-sufficient. **Do not** read `data-model.json` or `api-contracts.yaml` as primary inputs. Open them **only** as an **optional cross-check** when the work item **itself explicitly references** one of them (e.g. names a specific entity or endpoint defined there). If a cross-check reveals a **conflict**, the **work item wins** — implement per the work item and **report the divergence** in the ADO comment (passo H) instead of silently reconciling it.
4. **O blueprint é o contrato de trabalho.** Toda mudança em código de produção deve ser rastreável
   a pelo menos uma linha da matriz. Código sem linha correspondente é escopo extra — remover ou
   justificar.
5. **Testabilidade é requisito, não consequência.** Se uma linha do blueprint não é testável no
   desenho escolhido (regra de domínio presa a framework, dependência concreta impossível de
   substituir, efeito colateral sem ponto de observação), **o desenho está errado** — ajustar a
   implementação (extrair porta, injetar dependência, isolar o domínio) em vez de rebaixar a linha
   para "não coberto". Ajuste feito → registrar `TESTABILITY_REFACTOR` (WARNING) e a decisão no
   `spec_story.md`. Rebaixar só quando as rules do projeto impedem o ajuste; aí o motivo vai escrito
   na matriz.
6. **RED→GREEN — obrigatório para Bug, recomendado no resto.**
   - **Work item do tipo `Bug`** (ou task cuja descrição é a correção de um defeito): o teste que
     reproduz o defeito é escrito **antes** do fix, evidenciado falhando (RED) e passando depois
     (GREEN). Isto é **obrigatório** e alinha com o gate `FIX_HAS_RED_GREEN` da `spec-debug-fix` —
     o mesmo trabalho não pode ter rigor diferente conforme a porta de entrada. Se o bug veio de
     **retorno de teste/homologação** (QA reprovou, divergência em homolog), a skill correta é a
     **`spec-debug-fix`**, que traz o protocolo de evidência completo — apontar isso ao usuário.
   - **Demais tasks:** recomendado (não obrigatório) nas linhas de alto risco — violação de regra de
     negócio, autorização — quando o runner já existe. É o único jeito barato de saber que o teste
     realmente testa. Registrar em quais linhas foi aplicado.
7. **Naming and language policy:** Follow the language/naming convention defined in the project rules for each codebase component (e.g. legacy vs new code may have different conventions).
8. **No scope creep:** Do not refactor unrelated modules or add features not required by the work item.
9. **Cenário descoberto durante a implementação:** adicionar linha à matriz com
   `Fonte: descoberto na implementação` e cobri-la como qualquer outra. Descobrir é normal;
   descobrir e não registrar é o defeito (`SCENARIO_ADDED_DURING_IMPLEMENTATION`, WARNING).

> **Preparação de contexto para módulos grandes (repomix):** ao precisar ler/entender um módulo existente volumoso antes de alterá-lo, empacotar só esse módulo com `npx repomix --include "<módulo>/**" --compress` — o `--compress` preserva assinaturas/estrutura e remove corpos de implementação, mantendo a leitura dentro do orçamento de tokens (evita carregar o repositório inteiro no contexto). Preparação de contexto opcional; `npx` indisponível → ler os arquivos diretamente.

---

# FASE 4 — Provas (escrever, rodar, medir)

## G1 — Escrever os testes do blueprint

Percorrer a matriz **na ordem das camadas**, da mais barata para a mais cara: unit-domínio →
unit-use case → integração-banco → integração-HTTP → contrato → E2E → carga.

Para cada linha:

1. Criar o arquivo no caminho planejado em E3 (ou abrir o existente).
2. Escrever o teste com o nome planejado, usando a fixture da matriz.
3. Asseverar **o comportamento documentado**, não um genérico:
   - violação de regra → **a mensagem/código de erro exato** de `errorMessages{}`;
   - erro de entrada → status **e** corpo documentados em `apiContracts[]`/`expectedResponse`;
   - efeito de persistência → `expectedDatabaseState` (todas as tabelas afetadas);
   - evento publicado → `expectedEvents`;
   - estado de UI → o estado declarado em `uiContext.estadosUI[]` renderizado.
4. Respeitar as proibições das rules: sem anotação de framework no teste de domínio; mock só de
   porta de saída; banco real pela ferramenta que a regra declarar (nunca banco fake, quando ela o
   proíbe); `data-testid` como seletor primário em E2E de UI.
5. Atualizar o Status da linha para `ESCRITO`.

## G2 — Rodar

Executar **em ordem de custo**, com o comando real confirmado em E1:

1. **Testes unitários e de integração** cobrindo **toda** linha da matriz — caminho feliz **e**
   todo negativo/erro/borda.
2. **Cobertura** — rodar a ferramenta declarada e comparar com o threshold das rules. Abaixo do
   threshold → `COVERAGE_BELOW_THRESHOLD` (WARNING) com o número, no relatório de fechamento.
3. **Build** — preferir validação via **Docker** quando o repositório oferecer (checar as regras de
   build do projeto).
4. **Lint / checagens estáticas**, se fizerem parte do comando padrão do projeto.
5. **E2E / carga**, quando o blueprint os marcou como aplicáveis e o ambiente permite. Sem ambiente
   — ou com a camada adiada a pedido do usuário — a linha vira
   `NÃO COBERTO (<motivo> — script criado em <caminho>)` e sai como `E2E_SCENARIO_DEFERRED` /
   `LOAD_SCENARIO_DEFERRED` (WARNING). **O script é criado e commitado nos dois casos**: adiar a
   execução não é adiar a escrita.

Atualizar cada linha para `VERDE` ou `VERMELHO`.

**Se uma validação falha:** **não** mudar o estado para Testing. Corrigir, ou documentar o
bloqueio no comentário do work item e deixar o estado inalterado (ou um estado de bloqueio, se o
processo permitir — padrão: inalterado).

**Se o work item lista apenas QA manual:** rodar o que for automatizável e registrar os
**passos manuais restantes** no comentário de fechamento (`MANUAL_QA_REMAINING`).

## Reportar a matriz

O relatório de fechamento (comentário no ADO em Mode A, chat em Mode B) **deve** trazer a matriz
condensada:

```
Cobertura de cenários — TASK-XXX
Total: N | Verdes: a | Vermelhos: b | Não cobertos: c
Por categoria: HAPPY_PATH a/a · INVALID_INPUT b/b · BUSINESS_RULE_VIOLATION c/c · AUTHORIZATION d/d · EDGE_CASE e/e · EXTERNAL_SERVICE_FAILURE f/f
Camadas criadas: unit(N) · integração(N) · contrato(N) · E2E(N) · carga(N)
Cobertura: X% (threshold Y%)
Não cobertos: <ID> — <motivo> ; <ID> — <motivo>
Fonte dos cenários: structured | derived | mista
```

A matriz fica registrada em dois lugares duráveis — o **bloco Testes** do `spec_story.md` e o
comentário do work item — para que a `spec-code-audit` (Fase 12, Passo A.9, que lê o `spec_story.md`)
e qualquer revisor humano confiram cobertura sem re-derivar tudo do zero. **A auditoria continua
independente:** ela redescobre a cobertura a partir do código real; a matriz é ponto de comparação,
nunca substituto da verificação dela.

## G3 — Validação independente: validar, corrigir, revalidar

**Por quê.** Até aqui, quem escreveu o código também escreveu os testes e marcou VERDE. O G3 traz uma
validação que não depende de quem implementou:

- as perguntas saem do work item, por código;
- antes de qualquer modelo, uma varredura por código acha o que regra fixa pega (segredo, dado
  pessoal em log, HTML cru, SQL montado, erro engolido, consulta em laço, `fetch` na tela);
- até seis validadores, cada um com contexto limpo, julgam a entrega em um turno;
- outro agente corrige o que bloqueia, só nos arquivos dos itens;
- a validação roda de novo, só sobre o que a correção mudou, até zero bloqueantes.

Bloqueia CRÍTICO e ALTO. MÉDIO e BAIXO **não são avaliados no G3** — quem os cobre é a
`auditoria-de-us` (veredito APROVADA COM RESSALVAS, débito em `gaps-document.md`). Nenhum agente fixa
modelo: todos herdam o da sessão, em qualquer ferramenta.

**Quem decide cada passo é o script** — você só executa a ação que ele imprime.

**Quando.** Depois do G2 verde, antes do H, nos dois modos.

**Pré-requisitos.**

- O `tasks.json` local, porque é dele que o script tira as perguntas.
- Para o ciclo completo, um ambiente com subagentes — Claude Code ou Cursor —, com os agentes de
  `.claude/agents/` carregados. Eles só aparecem numa sessão aberta depois de instalados.
  - **No Cursor o campo `tools:` dos agentes é ignorado**: a restrição de ferramentas (validador só
    lê e grava o próprio resultado) vale só no Claude Code. Quem garante que o validador não mexeu em
    nada é a guarda do `validar.mjs`, que recusa a rodada que alterou arquivo fora da pasta de trabalho.
  - O `omitClaudeMd: true` dos agentes é campo do Claude Code 2.1.295 ou mais novo; versão anterior,
    Cursor e Kiro o ignoram.

**Sem subagente** (Kiro, Cowork, ou a ferramenta de subagente indisponível na sessão): **não pule o
G3** — rode-o com `--sem-agentes`. A parte determinística decide sozinha (comandos, varredura,
mensagens de erro), nenhuma ação dispara agente, e o `corrigir` é seu: você corrige e roda `avancar`.
O relatório registra `"modo": "sem-agentes"` e as dimensões que ficaram sem validador.

Só **sem `tasks.json` local** (Mode A sem o arquivo): pule o G3, registre `VALIDACAO_INDISPONIVEL` e
siga. Nesse caso a `auditoria-de-us` continua sendo a barreira.

**Timeout.** `iniciar` e `avancar` rodam os comandos do projeto (testes, cobertura, lint) e o Semgrep
e o gitleaks quando instalados — pode levar minutos. Rode os dois **com timeout alto** (no Bash do
Claude Code, `timeout: 600000`) ou **em segundo plano**, esperando terminar. O script grava o
`estado.json` antes de cada comando longo: **se o processo cair** (timeout, sessão fechada), rode
`avancar` de novo — ele retoma de onde parou. Não rode `iniciar` de novo para "destravar": ele
recomeça do zero e limpa a pasta de trabalho.

**O laço.**

1. Rode da raiz do harness, com os comandos que você confirmou no E1:

   ```bash
   node .claude/ferramentas/validar.mjs iniciar --task <TASK-ID> --repo <pasta do código> --base <ref> --linha-de-base <arquivo> --cmd-testes "<comando>" [--cmd-cobertura "<comando>"] [--cmd-lint "<comando>"] [--cmd-build "<comando>"] [--shell bash|cmd|powershell] [--sem-agentes] [--regras-frontend auto|sim|nao]
   ```

   `--base` é a referência de antes da task: o commit de onde a branch saiu, ou `HEAD` se nada da
   task foi commitado.

   `--linha-de-base` é o arquivo que o passo 6 do E1 gravou, com os **mesmos** comandos. A falha de
   comando igual à da linha de base vai para `preExistentes` no relatório, não bloqueia e não vai
   para o corretor: reporte-a como `VALIDACAO_FALHA_PRE_EXISTENTE`. Sem linha de base, toda falha de
   comando bloqueia.

   `--cmd-build` é o build que o G2 rodou. Ele roda de novo a cada rodada, depois do corretor.

   No Windows os comandos rodam no **Git Bash** (o mesmo shell do G2), nunca no bash do WSL;
   `--shell cmd|powershell` força outro. O relatório registra o shell usado.

   `--cmd-testes` é o comando **completo** de testes do projeto, nunca um arquivo só. O corretor cria
   testes novos, e o teste que o comando não roda fica fora da checagem por código. Comando que não
   existe no projeto não é passado (`--cmd-lint ""` também vale): o relatório o lista em
   `naoInformados`.

   `--regras-frontend` liga ou desliga as duas regras da varredura que só a rule de frontend Next.js
   sustenta (`fetch` na tela, formatação no JSX). O padrão `auto` as liga quando a rule de frontend do
   harness existe e nenhuma rule de frontend do projeto (raiz de `.claude/rules/`) fala de outra stack.
2. O script imprime **uma linha JSON**. Execute a ação dela:

   | `acao` | O que fazer |
   |---|---|
   | `validar` | Dispare **todos** os `agentes` numa única mensagem, em paralelo. Use a ferramenta de subagente do ambiente — no Claude Code, Agent com `subagent_type` igual ao `tipo`; no Cursor, o subagente de nome igual ao `tipo` — e o prompt `Leia <entrada> e siga.` Se o item trouxer `problema`, acrescente `Da última vez: <problema>.` Espere todos terminarem. |
   | `corrigir` com `agente: "corretor"` | Dispare **um** agente `corretor` com o prompt `Leia <entrada> e siga.` |
   | `corrigir` com `executor: "sessao"` (`--sem-agentes`) | Leia a `entrada` e corrija **você mesmo**: teste que falha antes, correção, teste que passa, só nos arquivos do escopo dela. A mesma guarda vale. |
   | `fim` | Veredito APROVADO. Siga para o H (em Mode B, o § H (Mode B)). Com `semAgentes: true`, registre no H e no I que só a parte determinística validou. |
   | `parar` | O ciclo não fechou; o motivo está no JSON e no relatório. **Não** mude o estado do work item. Nesta ordem: (a) comente no work item os bloqueantes e o motivo, com o estado inalterado — o mesmo caminho do G2 quando uma validação falha (Mode B: no relatório da task); (b) faça a devolutiva do J em modo falha; (c) se `editadosPeloCorretor` não está vazio, mostre ao usuário o diff desses arquivos e pergunte se mantém ou descarta — nunca descarte sozinho; (d) em lote, não comece a próxima task em cima desta: espere a decisão. |

3. Depois de cada `validar` ou `corrigir`, rode:

   ```bash
   node .claude/ferramentas/validar.mjs avancar --task <TASK-ID> --tokens <tipo>=<subagent_tokens>,<tipo>=<subagent_tokens>
   ```

   O `--tokens` leva o `subagent_tokens` do rodapé de cada agente: é o registro de custo do ciclo.
4. Repita os passos 2 e 3 até `fim` ou `parar`. Depois deles, `avancar` só repete a ação final.

**O que você NÃO faz no G3.** É isso que mantém a validação independente:

- não abre os arquivos de entrada nem os resultados: passa só o caminho;
- não corrige nada durante o ciclo: quem corrige é o `corretor` (com `--sem-agentes`, você corrige
  só quando a ação é `corrigir`, e só o que a entrada dela pede);
- não reinterpreta achado, não rebaixa severidade e não pula ação.

**Relatório.** Fica em `outputs/spec/auditorias/<TASK-ID>.validacao.json` e traz:

- o veredito e o histórico das rodadas;
- os bloqueantes, os incertos e os descartados (evidência que não conferiu no disco);
- `preExistentes`: as falhas de comando iguais às da linha de base, que não bloquearam;
- `naoCorrigidos`: o que o corretor recusou e por quê (refatoração, dependência nova, item que ele
  acha errado). Se ele recusa tudo sem mudar nada, o ciclo para ali, com esse motivo;
- `medioEBaixo`: a declaração de que MÉDIO e BAIXO não são avaliados no G3 — a ausência de achado
  médio no relatório não diz nada sobre o código;
- as ferramentas da varredura determinística (a própria, e Semgrep e gitleaks quando instalados) e
  se as regras de frontend Next.js estavam em vigor;
- o modo (`com-agentes` ou `sem-agentes`), o shell, os comandos rodados, os não informados e os tokens.

Evidência de segredo sai **mascarada** no relatório e na entrada do corretor (prefixo de 4
caracteres + `****`): o arquivo e a linha bastam para corrigir.

No H e no I, cite o veredito, as contagens, as falhas pré-existentes e que MÉDIO e BAIXO não foram
avaliados no G3.

---

## H — Update Azure DevOps: comment + state "Testing"

After validations **pass** and the G3 ends in `fim` (or was skipped with `VALIDACAO_INDISPONIVEL`
recorded) — or manual steps are explicitly deferred with user acknowledgment. With the G3 ended in
`parar`, only step 1 runs — the comment carries the blockers and the reason — and step 2 does not:
the state stays as it is (see the `parar` row in G3).

1. **Add a work item comment** (MCP tool such as `wit_add_work_item_comment`) summarizing:
   - Repos/folders touched
   - Key files or endpoints changed
   - **Test Blueprint** (cabeçalho de E4) e **matriz condensada** (§ Reportar a matriz), com toda
     linha não coberta e seu motivo
   - Arquivos de teste criados/alterados, por camada
   - Commands run (tests/build/coverage) and outcome
   - Remaining manual tests, if any
   - Any divergence found between the work item and `data-model.json`/`api-contracts.yaml` during an optional cross-check (see FASE 3 §3) — state that the work item's own description/AC was followed

2. **Update state** using the work-item **update** tool (e.g. `wit_update_work_item` with field updates). Set **`System.State`** to the state that represents **Testing / ready for QA** in your process.

   - Many teams use a state named **`Testing`** or **`Ready for QA`** — the **exact string** must match a valid transition for that **work item type** and **current state**.
   - If unsure, use **`wit_get_work_item_type`** (project + workItemType) to inspect allowed states, or read the board configuration in Azure DevOps.

3. If the transition **fails** (permission or invalid transition), leave the comment with validation results and explain the **correct next state** for the user.

## H (Mode B) — Status da task no `tasks.json`

Em Mode B não há work item para mover: quem registra que a task terminou é o `status` dela no
`tasks.json`, e é ele que o `conferir` (§ D2) da próxima task lê. Com o G2 verde e o G3 em `fim`, da
raiz do harness:

```bash
node .claude/ferramentas/andamento.mjs concluir --task <TASK-ID> [--tasks outputs/spec/tasks.json]
```

O script confere o relatório do G3 (`outputs/spec/auditorias/<TASK-ID>.validacao.json`). Só com
veredito APROVADO, e da mesma task, ele grava `status: "DONE"` — muda só esse campo e mantém a
indentação e o fim de linha do arquivo. Task `spike` conclui sem G3: a entrega dela é uma decisão,
não código.

- `concluida` / `ja-concluida` (exit 0): siga para o I. Cite no I e no J que a task ficou `DONE` no
  `tasks.json`.
- `recusar` (exit 1): nada foi gravado. Com o G3 em `parar` é o esperado — o status fica como está,
  como o estado do work item em Mode A. Fora disso, o `motivo` diz o que falta (relatório ausente, de
  outra task, ou veredito que não é APROVADO).

Mode A não roda este passo: o dono do estado é o Azure DevOps (H acima).

---

## I — Update spec_story.md (module memory)

After Azure DevOps has been updated (comment + state), update the `spec_story.md` for each touched code folder:

### If spec_story.md already exists
Prepend a new entry to the **Histórico de tasks** section (most recent first), immediately
after the `## Histórico de tasks` heading, using the entry structure of the canonical template
`./templates/spec_story.template.md`.

O bloco **Testes** é obrigatório e traz a **matriz condensada** (§ Reportar a matriz) mais os
arquivos de teste criados. É o único registro persistente que uma task futura (ou a
`spec-code-audit`) tem do que foi **provado** versus **assumido**.

Se esta task **descobriu ou fixou** algo sobre o stack de testes do módulo (runner, comando,
localização, fixture/factory reutilizável, Testcontainers configurado), registrar na seção
**Estratégia de testes do módulo** — é o que evita a próxima task redescobrir tudo em E1.

If any decision in this task establishes a **recurring pattern** (naming convention, architectural choice, cross-cutting rule), also add it to the **Padrões estabelecidos** section.

### If spec_story.md does not exist
Create it at the root of the code folder from the canonical template
`./templates/spec_story.template.md`, then add the entry per above.

### Rules for this step
- **Never** overwrite or delete existing entries.
- **Never** modify existing **Padrões estabelecidos** items — only append new ones.
- **Never** create `spec_story.md` outside the module's code folder (never at the workspace root).
- The file is **append-friendly**: new entries go at the top of the history, below the patterns section.
- Use **Português do Brasil** for all human-readable content.
- Keep entries **factual and terse** — future agents read this, not humans reviewing style.
- If the task touched multiple code folders, create/update the `spec_story.md` in **each** of them.

### On-demand maintenance (owned by this skill)

Maintaining `spec_story.md` is **this skill's responsibility** (a `spec-debug-fix` também escreve nele ao fechar um bug, no mesmo formato) — there is no separate
skill for it. Besides the automatic read (passo B) and update (passo I) around each task, the user
may ask for these operations directly, and this skill handles them against the module's
`spec_story.md` using the same template and hard rules above:

- **`view`** — read and display the full `spec_story.md`, highlighting **Padrões estabelecidos** at the top.
- **`init`** — create `spec_story.md` from the template for a module that has none (never overwrite an existing one without explicit confirmation).
- **`add-entry`** — insert a new task entry at the top of **Histórico de tasks**; if it establishes a recurring pattern, ask before also adding to **Padrões estabelecidos**.
- **`add-pattern`** — append a new item to **Padrões estabelecidos**.
- **`edit-entry`** — locate an entry by task id and **correct or complement** it; never remove listed **Implementado** items (mark as superseded instead) and append the suffix `(editado YYYY-MM-DD: motivo)`.

---

## J — Devolutiva em chat (obrigatória, nos dois modos)

**Toda execução termina com uma explicação em chat, em português simples, do que foi feito e de
como foi feito.** Não é resumo do comentário do ADO nem cópia da matriz: é a tradução do trabalho
para quem precisa entendê-lo sem ter acompanhado a implementação.

**Público-alvo (escrever para estas duas pessoas, literalmente):**

- **Uma pessoa NÃO técnica** — o PO, o gestor, o cliente — que nunca leu código. Ela precisa sair da
  leitura sabendo **o que o sistema passou a fazer**, **quais decisões técnicas foram tomadas e por
  quê**, e **o que cada decisão custa ou deixa de fora**. É para ela a seção "As decisões técnicas,
  sem jargão", e é ela quem dita o tom do texto inteiro.
- **Um desenvolvedor que acabou de chegar no projeto**, conhece pouco da stack e nada do negócio. Ele
  precisa saber **por onde o código faz isso**. É para ele a seção "Como foi feito".

Se uma frase só fizer sentido para o desenvolvedor, ela pertence a "Como foi feito" — nunca às
seções de negócio e de decisões.

**Por que existe:** o comentário do work item é registro de auditoria — dita para quem já conhece o
contexto. O `spec_story.md` é memória para o próximo agente. Nenhum dos dois é uma explicação para
uma pessoa. Sem este passo, o trabalho fica correto e ilegível, e quem revisa ou dá manutenção
recomeça do zero.

Ao chegar neste passo, ler [`references/devolutiva.md`](references/devolutiva.md) antes de
escrever: o formato das seções, as regras de escrita verificáveis, o exemplo preenchido, a checagem
antes de enviar e a relação com os outros relatórios.

---

## Hard rules

As proibições já codificadas como validators FATAL não se repetem aqui — valem as tabelas abaixo
(`WORK_ITEM_SOURCED`, `TEST_BLUEPRINT_BEFORE_CODE`, `TEST_LAYERS_FROM_RULES`,
`VALIDATIONS_PASSED`, `NO_STATE_CHANGE_ON_FAILURE`, `NEGATIVE_PATHS_COVERED`,
`CHAT_HANDOFF_DELIVERED`). Restam as sem validator:

- **Never** assumir que o projeto não tem testes automatizados sem ter procurado a regra de testes
  **e** inspecionado o repositório (Fase 2 · E1).
- **Never** "simplificar" o `testData` que a task entregou — payload completo, estado de banco
  completo, mensagem de erro literal.
- **Never** deixar fixture com placeholder (`TODO`, `xxx`, `a definir`) e contar a linha como
  coberta.
- **Never** report `VALIDATIONS_PASSED` without the matriz de cenários attached to the closing
  comment/report.
- **Never** introduzir um framework de teste novo por conta própria quando o projeto não tem
  nenhum — perguntar.
- **Credentials:** do not echo PATs or tokens in comments or chat logs.

---

## Validators (FATAL / WARNING)

### FATAL — blocks completion

| Code | Check |
|------|-------|
| `WORK_ITEM_SOURCED` | Work item data comes from MCP (Mode A) or a located `stories[].tasks[]` entry (Mode B) — never invented |
| `DEPENDENCIES_CHECKED` | Antes da Fase 2, as dependências da task foram conferidas (§ D2: `andamento.mjs conferir` em Mode B, links de predecessora em Mode A) e, com dependência aberta, o usuário confirmou antes de começar |
| `US_MARKER_OPEN` | Antes do primeiro commit de código da US, `outputs/spec/em-andamento.md` existe — criado com `andamento.mjs abrir-us` a partir de `.claude/templates/em-andamento.md` — e está commitado no repositório de docs |
| `TASK_STATUS_RECORDED` | Mode B: com o G3 em `fim`, `andamento.mjs concluir` gravou `status: "DONE"` no `tasks.json` antes do passo I; com `parar`, o status ficou inalterado |
| `TEST_BLUEPRINT_BEFORE_CODE` | O Test Blueprint (matriz com categoria, camada e `arquivo::nome` em toda linha) foi produzido **antes** da primeira edição em código de produção |
| `TEST_LAYERS_FROM_RULES` | Toda camada que as rules técnicas exigem para o código tocado (unit, integração, contrato, E2E, carga) tem ao menos um teste criado — ou linha de dispensa com motivo na matriz |
| `VALIDATIONS_PASSED` | Tests/build mandated by the work item ran and passed before any state change or "done" report |
| `SCOPE_CONFIRMED` | For a User Story with children, the scope (story-only / one child / all children) was confirmed with the user before implementing |
| `NO_STATE_CHANGE_ON_FAILURE` | State is never set to `Testing` (Mode A) if a mandated build/test failed |
| `ALL_SCENARIOS_TESTED` | Every `acceptanceScenarios[]` entry and every `businessRules[].testScenarios[]` entry the work item declares has a matching row in the scenario matrix with a passing test — or an explicit, justified exception |
| `NEGATIVE_PATHS_COVERED` | For every `INVALID_INPUT`/`BUSINESS_RULE_VIOLATION` scenario, `errorHandling{}` entry, or explicit negative condition in prose, a test exists that forces the failure and asserts the documented error — not just the happy path |
| `CHAT_HANDOFF_DELIVERED` | A devolutiva em chat do passo J foi entregue, nos dois modos e também em caso de falha, no formato e nas regras de escrita da seção — negócio, decisões técnicas sem jargão (problema, comparação do dia a dia, alternativa, preço) **e** técnico, sem jargão não explicado |
| `VALIDACAO_INDEPENDENTE_APROVADA` | O G3 terminou em `fim` (APROVADO) antes do H, ou foi pulado com `VALIDACAO_INDISPONIVEL` registrado. Nenhum estado vai para Testing com o G3 em andamento ou terminado em `parar`; com `parar`, o H se reduz ao comentário dos bloqueantes, com o estado inalterado |

### WARNING — does not block, goes in the closing comment/report

| Code | Check |
|------|-------|
| `MANUAL_QA_REMAINING` | Work item lists manual QA steps that could not be automated — recorded in the closing comment/report |
| `DEPENDENCY_PENDING` | A task começou com dependência não concluída (§ D2), com o «sim» do usuário — a decisão está no `spec_story.md` e na devolutiva |
| `CROSS_CHECK_DIVERGENCE` | `data-model.json`/`api-contracts.yaml` referenced by the work item diverge from it — divergence reported, work item wins |
| `STATE_TRANSITION_FAILED` | Mode A state transition to `Testing` failed (permission or invalid transition) — explained to the user |
| `SCENARIOS_DERIVED_FROM_TEXT` | Work item had no structured `acceptanceScenarios[]`/`businessRules[]`; a matriz foi planejada a partir da prosa (Caminho 2) — cobertura é best-effort |
| `SCENARIO_CATEGORY_SKIPPED` | A mandatory category (authorization/edge/external failure) was marked not-applicable — the reason is recorded in the matrix, not silently omitted |
| `NO_TEST_STACK_DECLARED` | Nenhuma regra de testes encontrada no corpus — a convenção foi inferida dos testes existentes, ou o usuário foi consultado |
| `TEST_STACK_MISSING` | As rules declaram uma ferramenta ausente do repositório — usou-se o stack real e a divergência foi reportada (nada foi instalado por conta própria) |
| `COVERAGE_BELOW_THRESHOLD` | Cobertura medida ficou abaixo do threshold declarado nas rules — número reportado |
| `E2E_SCENARIO_DEFERRED` | Linha E2E aplicável não executada (sem ambiente ou adiada pelo usuário) — script criado e caminho informado |
| `LOAD_SCENARIO_DEFERRED` | Linha de carga aplicável não executada — script criado e caminho informado |
| `SCENARIO_ADDED_DURING_IMPLEMENTATION` | Cenário descoberto depois do congelamento do blueprint — adicionado à matriz e coberto, não absorvido em silêncio |
| `TESTABILITY_REFACTOR` | O desenho foi ajustado (porta extraída, dependência injetada) para tornar uma linha testável — registrado como decisão no `spec_story.md` |
| `IMPL_COVERAGE` | A linha de cobertura (`cenários`, `verdes`, `não cobertos`, `camadas`, `fonte`) foi registrada no sync-log, na coluna `<questões em aberto>` |
| `VALIDACAO_PARADA` | O G3 terminou em `parar` (limite de rodadas, oscilação, incerteza que só uma pessoa decide, ou o corretor recusou todos os itens) — bloqueantes comentados no work item, devolutiva do J em modo falha, diff das edições do corretor mostrado e a decisão do usuário (manter ou descartar) registrada, estado inalterado; em lote, a próxima task esperou |
| `VALIDACAO_FALHA_PRE_EXISTENTE` | Um comando do projeto falhou no G3 igual ao que já falhava na linha de base (E1, passo 6) — não bloqueou; a falha vai no comentário e na devolutiva, com o comando |
| `VALIDACAO_INDISPONIVEL` | O G3 não rodou porque não há `tasks.json` local — registrado no comentário e na devolutiva. Sem subagente (Kiro, Cowork, ou Claude Code/Cursor sem os agentes de `.claude/agents/` carregados) **não** é indisponível: o G3 roda com `--sem-agentes` |

---

## Retrocompatibilidade (v1.x → v2.x)

Uma invocação escrita para a v1.x roda sem alteração — o contrato (bloco de invocação, Mode A/B,
fronteiras de código, cross-check opcional, spec_story, regra de estado, códigos de validator)
foi preservado; o que mudou foi **quando** o agente pensa nos testes. Detalhes completos da
migração em [`./HISTORY.md`](./HISTORY.md). Dois pontos com efeito prático em arquivos antigos:
task sem `acceptanceScenarios[]` **não** é bloqueio (Caminho 2 + `SCENARIOS_DERIVED_FROM_TEXT`);
`spec_story.md` existente **não precisa de migração** (as seções novas nascem na próxima escrita).

---

## O que NÃO faz

- Does not generate `tasks.json` or gap documents — use `spec-tasks` (Fase 8).
- Does not scaffold a brand-new module skeleton from rules only — use `spec-scaffold` (Fase 10).
- Does not treat `data-model.json`/`api-contracts.yaml` as primary inputs — they are an
  **optional cross-check only** when the work item itself references them (see FASE 3 §3).
- **Não** escreve plano de homologação de negócio — isso é `spec-test-plan` (Fase 8a). A matriz
  daqui é técnica e automatizada.
- **Não** escolhe o stack de testes do projeto — isso é decisão de `spec-tech-rules` (a regra
  `test-strategy`) ou do usuário. Esta skill lê a decisão e a cumpre.
- **Não** executa task `class=uat` — é roteiro humano.
- Does not implement a whole Epic in one shot — split into stories/tasks with the user first.
- Does not change a work item's state to `Testing` (Mode A) when a mandated build/test failed.
- Does not audit security/quality/coverage after delivery — use `spec-code-audit` (Fase 12). This
  skill writes the scenario-driven tests and reports the matrix; `spec-code-audit` audits the real
  code de forma independente e pode usar a matriz registrada no `spec_story.md` como comparação.

---

## Relationship to other skills

| Skill | When |
|-------|------|
| `spec-tech-rules` | Produz a regra `test-strategy` (pirâmide, ferramentas, threshold, E2E, carga) que a **Fase 2 · E1** lê para decidir as camadas de teste desta task. |
| `spec-tasks` | Produce or refresh `tasks.json` / gaps from requirements (Fase 8). Entrega `acceptanceScenarios[]` com `testData`, `businessRules[].testScenarios[]`, `errorHandling{}` e `testingStrategy{}` — a fonte primária da matriz. |
| `spec-test-plan` | Fase 8a — `test-plan.md`, homologação humana. Quando o work item cita `TC-NNN`, o caso vira fonte de cenário técnico aqui (rastreabilidade homologação ↔ teste automatizado). |
| `spec-scaffold` | New deployable module skeleton from rules only (Fase 10). |
| `spec-data-model` | Produces `data-model.json` (Fase 7) — optional cross-check only, see FASE 3 §3. |
| `spec-api-contracts` | Produces `api-contracts.yaml` (Fase 7) — optional cross-check only, see FASE 3 §3. |
| `spec-security-review` | Injeta tasks `class=security`; seus cenários de ataque/negação entram na matriz como `AUTHORIZATION`/`BUSINESS_RULE_VIOLATION`. |
| `spec-debug-fix` | Handles a task that came back from testing with a bug — evidence-based debug & fix com teste de regressão RED→GREEN; shares this skill's `spec_story.md`. |
| `spec-code-audit` | Runs after implementation to audit security, quality, tests, and observability (Fase 12). Lê o `spec_story.md` no Passo A.9, onde a matriz desta skill fica registrada — ponto de **comparação** para a auditoria, não substituto dela: a audit redescobre a cobertura a partir do código real. |

---

## Workspace references

- **Histórico e motivação dos gates:** [`./HISTORY.md`](./HISTORY.md) — contexto de manutenção, não de execução.

---

## Invocation

**Cursor:** use in **agent mode** with the Azure DevOps MCP enabled; reference this skill with `@.cursor/skills/spec-implement/SKILL.md`.

**Claude Code / Cowork:** say "use the spec-implement skill" (or `@.claude/skills/spec-implement/SKILL.md` if the file is mirrored there). If the Azure DevOps MCP is not configured, point to a `tasks.json` and a task id instead — see **Mode B — tasks.json local** above.

**Optional preamble (same message, any language):** You may add free text before or after the block, e.g. that work might already exist in the repo. The agent must then **reconcile** Azure DevOps description/acceptance criteria against the **current** code under the allowed **code folders**; implement **only** missing behavior, fixes, or **divergences** — do **not** rewrite or duplicate what already matches. If nothing is left to do, report that and only update ADO (comment/state) per user instruction.

> Mesmo quando o código já existe, **o Test Blueprint continua obrigatório**: é ele que revela se o
> que já está lá cobre os cenários da task. "Já implementado" sem matriz é afirmação sem prova — e a
> reconciliação vira exatamente a lista de cenários ainda não cobertos.

Example user line (Portuguese):

```text
Pode ser que já tenha sido implementado — verifica. Implementa só o que ainda não foi feito ou o que está divergente.
```

```markdown
@.cursor/skills/spec-implement/SKILL.md

- Azure DevOps project: <your-ado-project>        # Mode B: trocar por `tasks.json: <path>` + `Task id: TASK-NNN`
- Work item id: <numeric-id>
- Code folders: <path/to/repo-root>
- Rules: <path/to/rules-directory/>
- Target state (optional): Testing
```

Variações — mesma estrutura, mudando 1 linha:
- **Child task only** (preferido quando a story tem muitas tasks): acrescentar
  `(This is a Task under STORY-XXX; do not implement sibling tasks.)`
- **Whole story**: trocar o id por `Parent User Story id: <id> — implement all child tasks in order; confirm before starting.`
- **Adiamento de camada cara** (E2E/carga sem ambiente): acrescentar
  `Adiar E2E nesta rodada (sem ambiente) — criar o script mesmo assim.`

Adjust paths to match your workspace layout.

---

## Limitations

- **Process template:** State names (`Testing`, `Resolved`, etc.) must match your project; invalid transitions fail at the API — use `get_work_item_type` / board docs.
- **Large stories:** Implementing "all children" in one chat may hit context or time limits — prefer one child work item id per session unless the user accepts a phased run.
- **MCP tool shapes:** `wit_update_work_item` expects the **`updates`** payload shape defined in the tool descriptor — follow it exactly for `System.State` and other fields.
- **Blueprint é planejamento, não garantia:** ele fixa o que **deve** ser provado. Cobertura real
  continua sendo o que os testes verdes mostram — por isso a matriz reporta status por linha, e não
  um "ok" agregado.
- **E2E e carga dependem de ambiente:** sem ambiente disponível, o script é criado e a linha fica
  adiada com código de WARNING — a skill não simula execução.
