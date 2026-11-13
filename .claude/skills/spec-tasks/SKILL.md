---
name: spec-tasks
description: >
  spec-tasks (Fase 8 — Geração de Tasks) — invocar SEMPRE quando o usuário pedir para gerar
  tasks, decompor requisitos em work items implementáveis, criar tasks.json ou mapear
  especificações para um backlog estruturado. Usar quando o usuário mencionar "gerar tasks",
  "decompor requisitos", "backlog técnico", "tasks.json" ou pedir work items estruturados.
  Consome requisitos estabilizados (Fase 5/5), data-model.json e api-contracts.yaml (Fase 7),
  e o diretório de regras completo. Produz exatamente dois artefatos: tasks.json e gaps-document.md.
  Inclui kickoff interativo de níveis de backlog (Feature, Epic, Story, Task) com sugestão
  baseada nos outputs/spec do projeto. Tasks geradas são COMPLETAMENTE AUTO-SUFICIENTES — agente
  implementador precisa APENAS de tasks.json + a pasta de rules do projeto (NUNCA ler data-model.json,
  api-contracts.yaml, requirements.md, etc.). Não gera tasks de homologação (UAT); o test-plan.md
  só alimenta os cenários de aceite. Conteúdo humano gerado em Português do Brasil.
version: "1.7"
updated: "2026-10-20"
---

# spec-tasks — Geração Automática de Tasks

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`MOD-EXEMPLO`, `RF-XXX`, `EPIC-001`, `FEAT-001`).

## Formato compact-prose

O `tasks.json` usa o formato **compact-prose**: campos complexos de API e modelo de dados são representados como **strings ricas estruturadas** (separadas por `|` e `;`), em vez de objetos profundamente aninhados. Isso reduz o tamanho do arquivo mantendo todas as informações.

**Documentação completa do formato** — [`./templates/tasks.format-reference.md`](./templates/tasks.format-reference.md)
(especificação) e [`./templates/tasks.example-completo.json`](./templates/tasks.example-completo.json)
(exemplo de task auto-suficiente). **Ler no Passo 9**, quando a escrita das tasks começa — nunca
antes do kickoff (que pode redefinir níveis ou abortar a sessão).

## Papel

Consome **requisitos estabilizados** (Fase 5/5) e **especificações técnicas** (Fase 7:
`data-model.json`, `api-contracts.yaml`) para decompor o projeto num **backlog estruturado e
rastreável** de work items implementáveis. Cada task é auto-suficiente para um agente de IA.

Começa com um **kickoff interativo** para definir os níveis de backlog ativos (§ Kickoff).

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

**Esta é a skill onde a régua mais importa.** O `tasks.json` gerado aqui é o que o desenvolvedor lê no work item, quase sempre sem ter lido nenhum outro documento antes. Se o texto da task exige tradução, o ganho de toda a cadeia anterior se perde nesse ponto.

Vale para: `narrative`, `businessRules[].title` / `.description` / `.rationale`, `acceptanceCriteria[]`, `acceptanceScenarios[].title` / `.given` / `.when` / `.then`, `agentExecutionContext.selfContainedSummary`, `implementationGuidance.*` e `validation`.

A regra 10 é obrigatória em `apiContracts[]` e em `persistenceModel`: o compact-prose continua exatamente como especificado, com uma frase de abertura em português antes dele.

> **Auto-suficiência e linguagem clara não se opõem.** A auto-suficiência manda **transcrever o conteúdo inteiro** para dentro da task; a linguagem clara manda **escrever esse conteúdo de forma que se entenda**. Nenhuma das 10 regras autoriza resumir, omitir campo ou trocar dado concreto por prosa — os validators de auto-suficiência continuam valendo integralmente.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver
`../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-tasks | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.
Registrar SEMPRE na coluna `<questões em aberto>` a origem dos cenários de aceite:
**`SCENARIOS_FROM: test-plan`** (derivados do `test-plan.md`, com rastreio TC-NNN) ou
**`SCENARIOS_FROM: derived`** (test-plan ausente — matriz mínima aplicada a RF+RN; ver
§ "5. `acceptanceScenarios[]`").
Registrar TAMBÉM, na mesma coluna, a linha **`VALIDATORS:`** consolidando os DOIS validadores
(negócio + auto-suficiência) — formato e exemplos em § "Execução obrigatória (não é
auto-avaliação)". Sem essa linha, não há evidência de que os gates rodaram.

| Artefato | Conteúdo |
|----------|----------|
| `tasks.json` | `metadata` (`schemaVersion: tasks/v5.3`, backlogHierarchy, compactProse, azureDevOps, **`effortSummary`**), `epics[]`, `features[]`, `stories[]` (cada task com **`effortHours`**), `globalDependencies`, `glossary`, `externalReferences` (na **raiz** do documento) |
| `gaps-document.md` | Gaps de negócio com IDs estáveis `GAP-NNN` |

**Fora de escopo:** gerar código; criar modelos de dados ou contratos de API (Fase 7 faz isso);
exportar para ferramentas externas (`spec-tasks-azure` faz isso); gerar scaffold de código
(`spec-scaffold` faz isso — Fase 10); implementar work items (`spec-implement` faz isso — Fase 11).

**Paths de saída:**
- Default: `outputs/spec/tasks.json` e `outputs/spec/gaps-document.md`
- Override: variável de ambiente `PIPELINE_OUTPUTS_DIR` ou `metadata.paths.pipelineRoot`.

> **Regra de idioma:** Em `tasks.json` e `gaps-document.md`, todos os valores de string legíveis
> por humanos devem estar em **Português do Brasil**. Nomes de propriedades JSON permanecem em inglês.

> **Regra de auto-suficiência (CRÍTICO):** Cada task DEVE ser COMPLETAMENTE auto-suficiente.
> Um agente que recebe APENAS `tasks.json` + a pasta de rules do projeto DEVE conseguir implementar a task
> SEM abrir nenhum outro documento (requirements.md, product-requirements.md, data-model.json,
> api-contracts.yaml, business-rules.md, etc.). Todos os contextos, schemas, regras de negócio
> e fluxos devem ser EMBUTIDOS na task. Referências externas são PROIBIDAS — copie o conteúdo
> completo dos artefatos da Fase 7 diretamente para dentro da task.

> **Regra de especificação (v5.0):** Esta skill NÃO infere modelos de dados ou contratos de API.
> Ela **consome** `data-model.json` e `api-contracts.yaml` da Fase 7 e **EMBUTE TODO O CONTEÚDO**
> relevante nas tasks. Quando ausentes, opera em **modo legado** com qualidade reduzida e avisos explícitos.

## Entrada opcional — Plano de Testes de Negócio (`testPlan`)

Antes de verificar o template Azure, checar se o usuário forneceu (ou se existe em
`outputs/spec/test-plan.md`) um plano de testes gerado pela `spec-test-plan`.

| Situação | Comportamento |
|----------|----------------|
| `test-plan.md` **ausente** | Cenários de aceite derivados da **matriz mínima** RF+RN (`SCENARIOS_FROM: derived`) |
| `test-plan.md` **presente** | Cada caso `TC-NNN` vira **fonte dos `acceptanceScenarios[]`** das tasks funcionais que cobrem a funcionalidade, traduzido para BDD técnico com `testData` concreto e rastreado em `coverageNote` (`SCENARIOS_FROM: test-plan`). **Nenhuma story ou task nova é criada** |

**Como ler o test-plan.md:**
1. Localizar as seções `## [EPIC-ID] — [Nome]` — uma por épica.
2. Extrair todos os casos de teste `### [TC-NNN]` de cada épica, com a funcionalidade (RF) e as RNs que cada um referencia.
3. Ao decompor a story/task que implementa aquele RF, converter cada TC em um `acceptanceScenario` técnico (Given/When/Then + `testData.request` / `expectedResponse` / `expectedDatabaseState`) e registrar `"coverageNote": "Cobre TC-NNN do plano de testes"` — detalhe em § "5. `acceptanceScenarios[]`". **Nunca o nome do arquivo** em `coverageNote`: `NO_EXTERNAL_REFS_IN_TASKS` (FATAL) reprova nome de artefato de especificação em qualquer campo da task, e o caminho já vai em `externalReferences` (passo 5).
4. Todo TC de uma épica em escopo precisa estar coberto por ≥1 cenário de alguma task funcional. TC sem task correspondente é sinal de RF não decomposto — corrigir a decomposição, **não** criar task de homologação.
5. Registrar em `externalReferences` (na **raiz** do `tasks.json`, não em `metadata`) o caminho do `test-plan.md`, para rastreabilidade:
   `{ "id": "TEST-PLAN", "type": "testPlan", "path": "outputs/spec/test-plan.md", "description": "Plano de testes de negócio gerado pela spec-test-plan — fonte dos cenários de aceite" }`

### Homologação NÃO entra no backlog — gate `NO_UAT_BACKLOG` (FATAL)

**Nunca** criar Story de Validação de Negócio, task `class: "uat"`, story `testType: "UAT"` nem
qualquer outro work item cujo entregável seja "executar o roteiro de homologação". Motivo:

- O backlog gerado aqui é de **desenvolvimento**. Homologação com o cliente é um processo do
  cliente, sem código a produzir — não é acelerável por IA e, como work item, **inflava prazo e
  custo** do forecast (`spec-estimate`) sem entregar software.
- O propósito do `test-plan.md` no pipeline é dar **contexto de teste às tasks de implementação**:
  cada TC vira cenário automatizado (unitário / integração / E2E) na própria task funcional que o
  `spec-implement` executa test-first. O roteiro humano continua disponível ao cliente como
  documento — fora do `tasks.json`.

O `validate-tasks-business.mjs` reprova (`NO_UAT_BACKLOG`, FATAL) qualquer story/task com
`class=uat`, `testType=UAT` ou `generatedBy: spec-test-plan`. A flag `--allow-uat` existe **só**
para validar um `tasks.json` legado que ainda as contém — nunca para gerar novas.

> **Histórico.** Até a versão 1.5 esta skill criava uma Story `[EPIC-ID]-VAL` por épica com tasks
> `class=uat` por categoria de TC. A classe `uat` permanece no schema `tasks/v5.3` e nos validators
> **apenas por retrocompatibilidade** de artefatos já publicados (racional em `./HISTORY.md` § 1.6).

---

## Entrada opcional — Contexto de UI (`flow-map.md` → `uiContext`)

Antes da decomposição, verificar se existe `outputs/spec/flow-map.md` (fonte canônica de fluxos/telas produzida pela `spec-product`).

| Situação | Comportamento |
|----------|----------------|
| `flow-map.md` **ausente** | Omitir os campos de fluxo do `uiContext` (`fluxo`, `etapa`) e registrar modo **`UI_CONTEXT_SKIPPED`** no sync-log. **Não** omitir o `uiContext` inteiro: quando o produto tem UI, `tela`/`rota`/`estadosUI`/`fields[]` continuam obrigatórios, derivados do PR de `product-requirements.md` e do `screens-manifest.json`. Sem flow-map **não há `TEL-xxx`**: preencher `uiContext.tela` com o **slug da rota** (ex.: rota `/propostas/nova` → `propostas-nova`), que é o que o schema aceita como alternativa ao `TEL-\d{3}` — alinhado ao contrato `screens-manifest.json`, onde `route` é a chave e `id` é opcional |
| `flow-map.md` **presente** | Para cada story/task que **toca UI** (tela do flow-map), preencher `uiContext` deterministicamente a partir de `python3 ../tools/check-flowmap.py outputs/spec/flow-map.md --json` |

**Como preencher (determinístico, a partir do JSON do `check-flowmap.py --json`):**
1. `tela`/`telaNome`/`rota`: da linha de `## Telas` (`telas[]`: ID, Nome, Rota).
2. `fluxo`: string rica `FLX-xxx — Nome` do fluxo cuja etapa referencia a tela (`fluxos[]` + `etapas[]`).
3. `etapa`: string rica `ETP-xxx (ordem N) — Nome` (`etapas[]`, campo Ordem).
4. `estadosUI`: da coluna Estados UI da tela (um item por estado).
5. `regras`: das transições (`transicoes[]`) cujo De/Para é etapa desta tela — string rica `RN-xxx — texto curto da regra` (buscar o texto em business-rules/requirements e **embutir**, não só o ID).
6. `entidades`/`endpoints`: da `## Amarração Técnica` (`amarracao[]`), quando presente.
7. `screenshot`: caminho da coluna Screenshot (ex.: `outputs/spec/screens/TEL-001.png`) — **única** referência por caminho permitida no `uiContext`.
8. `fields[]` — **inventário de campos da tela (OBRIGATÓRIO quando há `uiContext`)**. Um item por
   campo de formulário, filtro ou coluna de grid. Fontes, nesta ordem de precedência:
   (a) seção **Inventário de campos** do PR em `product-requirements.md`;
   (b) **`requirements.md`** — os RF frequentemente enumeram os campos, os tipos e os valores
       no enunciado EARS e nos cenários BDD. **Varrer sempre**, mesmo quando (a) existe: é comum
       o RF ser a única fonte dos valores. Padrões a procurar: *"o sistema deve oferecer os
       filtros: X (seleção única), Y (seleção múltipla)…"*, *"o sistema deve oferecer as opções
       de X: A, B, C"*, *"deve exibir as colunas A, B, C"*;
   (c) `screens-manifest.json` → `screens[].fields[]` (colheita do protótipo);
   (d) `enumerations[]` do `data-model.json` para os valores de campos de domínio;
   (e) `enum` do `api-contracts.yaml` para valores aceitos pelo endpoint;
   (f) protótipo em `inputs/` — última instância, para máscara, default e comportamento de filtro.

   > **Nunca resolver com screenshot.** Um `visualReferences` apontando para PNG com a nota
   > "usar como referência visual de layout/conteúdo real" **não** satisfaz este item: o agente
   > implementador não lê imagens. Screenshot é complemento, jamais substituto de `fields[]`.
   > Este foi o mecanismo concreto pelo qual o inventário de campos se perdeu em produção.

   Shape de cada campo:

   ```json
   {
     "name": "status",
     "label": "Situação",
     "type": "select",
     "required": false,
     "optionsSource": { "kind": "enum", "ref": "StatusSolicitacao" },
     "options": [
       { "value": "PENDENTE", "label": "Pendente de análise" },
       { "value": "APROVADA", "label": "Aprovada" },
       { "value": "REJEITADA", "label": "Rejeitada" }
     ],
     "mask": null,
     "default": null,
     "validations": [{ "rule": "—", "errorMessage": "—" }]
   }
   ```

   Regras duras:
   - Campo `select`/`multiselect`/`dropdown`/`radio`/`autocomplete`/`lookup` **DEVE** ter
     `options[]` **transcrito** (value + label) ou `optionsSource` declarado. `optionsSource`
     sozinho só é aceito quando a lista é dinâmica em runtime (`kind: "endpoint"`); para
     `kind: "enum"` ou `"domainTable"`, os valores são conhecidos em tempo de especificação e
     **devem ser transcritos** em `options[]`.
   - **PROIBIDO** escrever "opções conforme data-model.json" ou equivalente — isso é falha
     `NO_EXTERNAL_REFS_IN_TASKS`.
   - Para grid/listagem, declarar também `uiContext.grid` (`columns[]`, `defaultSort`,
     `pagination`) e, quando houver filtros, `uiContext.filterBehavior`
     (`applyOn`: `change` | `submit`; `combination`: `AND` | `OR`; `clearAll`: bool).

   Validado por `TASK_UI_HAS_FIELD_CONTRACT`: **FATAL** quando o `uiContext` existe e o contrato
   de campo está ausente/incompleto (`fields[]` vazio, campo sem `name`/`type`, campo de opções
   sem `options[]` nem `optionsSource`); **WARNING** quando uma task de UI (`type` `frontend`/
   `ui`/`web`/`mobile`) simplesmente **não tem** `uiContext`. Ver § "Validators de
   auto-suficiência" para a justificativa das severidades.

> **Auto-suficiência (CRÍTICO):** o `uiContext` EMBUTE o conteúdo textual (nomes, estados, texto das regras). É PROIBIDO escrever "ver flow-map.md" ou equivalente — o implementador lê SÓ `tasks.json` + rules. Apenas a **imagem** permanece como caminho (a `spec-tasks-azure` a anexa ao work item).

**Ordem de construção (sugestão, não regra dura):** a **ordem das etapas** de cada fluxo (campo Ordem do flow-map) é insumo natural para as **dependências entre stories de UI** — stories de telas de etapas anteriores tendem a preceder as das etapas seguintes. Mencionar no kickoff/decomposição e usar como sugestão de sequenciamento; não bloquear emissão por divergência.

`uiContext` é validado pelo `validate-tasks-business.mjs` (checagens **WARNING**): cobertura de telas do flow-map no backlog e validade de cada `uiContext.tela`.

---

## Entrada opcional — Desenho de arquitetura (`hld.md`)

Quando `outputs/spec/hld.md` existe (Fase 6.6), ler a estrutura por
`python3 ../tools/check-hld.py outputs/spec/hld.md --json` — **nunca** reparsear o `.md`. Dois usos,
ambos aditivos (nada no backlog deixa de ser gerado por causa do HLD):

1. **Riscos técnicos → tasks `SPIKE`.** Cada linha `riscos[]` com `spike` diferente de `—` vira
   candidata a um work item `workItemType: SPIKE` (ver § Tipos de Demanda Operacional). O campo
   `spike` do HLD já é a pergunta com resposta verificável — usar como base da narrativa, e o
   `risco` como o «por que existe». Spike sem dono claro entra na Épica do módulo do `alvo`
   (`MOD-XXX`) ou, quando o alvo é `CON-NN`/`INT-NN`, na Épica que mais usa aquele container.
   Spike já coberto por uma incerteza levantada nos requisitos **não** é duplicado.
2. **Agrupamento por componente.** A `decomposicao` (módulo → container) e os `containers[]`
   dizem onde cada módulo executa. Usar para agrupar tasks técnicas do mesmo container e para
   nomear a camada em `scope`/`deliveryScope` com o nome real do container, em vez de um rótulo
   genérico. Módulo marcado `N/A` no HLD não gera task de implementação nesta entrega — se o
   backlog precisar dele mesmo assim, registrar a divergência no `gaps-document.md`.

Sem `hld.md` (projeto anterior à Fase 6.6): registrar `HLD_MISSING: projeto anterior à Fase 6.6`
no sync-log e seguir exatamente como antes — esta entrada é opcional.

## Entrada opcional — Template Azure DevOps (`azureTemplate`)

Antes do kickoff de níveis, verificar se o usuário forneceu um JSON de processo Azure (blueprint com `workItemTypes`, `processRules`, `workflowStates`, etc.).

| Situação | Comportamento |
|----------|----------------|
| `azureTemplate` **ausente** | Kickoff interativo (§ Kickoff) define `metadata.backlogHierarchy.chosen` |
| `azureTemplate` **presente** | Derivar `chosen` e `metadata.azureDevOps.workItemTypes` do template; kickoff pode ser confirmatório apenas |

**Schema da entrada:** [`templates/azure-template.schema.json`](./templates/azure-template.schema.json)

**Como aplicar (início da geração, não no fim):**
1. Ler `azureTemplate` (path ou objeto inline).
2. Mapear WITs habilitados → níveis: `Epic`→epic, `Feature`→feature, `User Story`→story, `Task`→task.
3. Gravar em `metadata.azureTemplate` (displayName, targetProvider, sourcePath) e `metadata.azureDevOps.workItemTypes` (wit, referenceName, campos `required`/`defaultValue`).
4. Em cada item gerado, preencher `adoWorkItemType` com o nome do WIT.
5. Respeitar campos obrigatórios do template ao redigir narrativa/critérios (ex.: `Acceptance Criteria` em Epic/Feature/Story).

**Backward compatibility:** sem template, o fluxo permanece válido; a versão canônica única do schema é `tasks/v5.3` (compact-prose com negócio obrigatório em Epic/Feature/Story).

## Princípio — Negócio primeiro na hierarquia (Kanban ADO)

Epic e Story são **cartões de Kanban** para negócio. Task é para implementação. Durante a decomposição (não após emitir o JSON):

1. **Definir** por Epic/Story os três mínimos: **Narrativa**, **Regras de negócio**, **Critérios de aceite** — **extraídos dos documentos de origem**, ver § "Ancoragem obrigatória na origem" logo abaixo.
2. **Gerar tasks** já alinhadas a essa story (regras e cenários nas tasks são fonte, não substituto do nível story).
3. **Consolidar** Task→Story→Epic no mesmo passe de escrita (promoção deduplicada com `sourceTaskIds` / `sourceStoryIds`).

Campos obrigatórios (schema `tasks/v5.3`): `narrative` (com `elevatorPitch`), `businessRules[]`, `acceptanceCriteria[]` (com `statement`, **sem** Given/When/Then) e `sourceRefs[]` em Epic, Feature (se ativo) e Story — a conformidade estrutural é verificada pelo script (§ Execução obrigatória), não por leitura do schema.

> **Chave de rótulo humano.** `name` é a chave **canônica** de rótulo humano em Epic, Feature e Story — é o que vira o título do work item no ADO e o cabeçalho no relatório HTML. `title` é **alias opcional**: o schema aceita qualquer um dos dois (`anyOf`), e os consumidores normalizam `name = name ?? title ?? id` na entrada (`normalizeLabels` em `spec-tasks-azure/lib/load-tasks.mjs` e `spec-tasks-html/lib/load-tasks.mjs`). **Emitir `name`.** Emitir só `title` funciona, mas emitir *nenhum* dos dois faz o ADO publicar `"<id>: <id>"` — defeito que `CONSUMER_CONTRACT` reprova.

---

### Ancoragem obrigatória na origem (passo 5 da ordem de execução)

O negócio de Epic, Feature e Story **não é inventado nem sintetizado a partir das tasks filhas**: é
**extraído** dos documentos de origem, e cada bloco declara de onde veio em `sourceRefs[]`.

*(Normativo porque, como recomendação, o passo era pulado e o resultado era narrativa genérica —
medição em `./HISTORY.md`.)*

#### Fonte obrigatória de cada campo, por nível

| Nível | Documento de origem | Campo de destino |
|-------|---------------------|------------------|
| **Story** | o **RF** que ela realiza, em `requirements.md` | descrição e enunciado EARS → `narrative.problem` / `narrative.deliveredValue` · atores → `narrative.actors` · pré-condições → complemento de `narrative.context` · **cenários BDD → `acceptanceCriteria[]`** (um `statement` por cenário) · **MoSCoW → `priority`** |
| **Story** | a(s) **RN** vinculada(s), em `business-rules.md` | enunciado + exceções + justificativa → `businessRules[].description` · fonte regulatória → `businessRules[].legalBasis` · id da RN → `businessRules[].id` |
| **Feature** | a entrada do **módulo** em `modules.md` | objetivo → `narrative.deliveredValue` · limites/fronteiras → complemento de `narrative.context` · nome canônico → `narrative` (capacidade) · código → `moduleCode` |
| **Feature** | as **stories filhas** | síntese em `narrative.context` · `containedStoryIds[]` · `touchpoints[]` (dos `uiContext` das filhas) |
| **Epic** | `product-vision.md` | problema/contexto → `narrative.problem` · objetivos e métricas SMART → `successMetrics[]` e `businessOutcomes[]` · escopo "não é" → `outOfScope[]` · módulos cobertos → `moduleScope[]` |

**Derivado das tasks — legítimo mesmo sem documento de origem:** apenas `narrative.mainFlow` e
`deliveryScope[]`. Todo o resto exige origem.

#### `sourceRefs[]` — obrigatório por nível

```json
"sourceRefs": [
  { "document": "requirements.md",   "section": "RF-XXX-001: <título do RF>", "itemId": "RF-XXX-001" },
  { "document": "business-rules.md", "section": "RN-XXX-001: <título da RN>", "itemId": "RN-XXX-001" }
]
```

Sem `sourceRefs[]` não há como distinguir conteúdo ancorado de conteúdo inventado. Story de
segurança aponta para `threat-model.md`; cenário derivado do `test-plan.md` rastreia o `TC-NNN`
em `coverageNote`.

#### Mínimos para `levelDetail = "full"`

`narrative.context` ≥200 chars ancorado · ≥1 `businessRule` com **id de RN real** e `description`
≥120 chars · ≥1 `acceptanceCriterion` derivado de cenário BDD do RF, com rastreio declarado ·
`priority` preenchida a partir do MoSCoW · ≥1 `sourceRef` resolvível.
Gate: **`LEVEL_GROUNDED_IN_SOURCE` (FATAL)**.

#### Quando o documento de origem não está disponível

**NÃO sintetizar prosa.** Registrar a lacuna em `metadata.enrichmentGaps[]`
(`{scope, field, reason}`) e deixar o campo **ausente**. Campo em branco com lacuna registrada é
honesto e auditável; prosa genérica no lugar dele é indistinguível de conteúdo real e reprovada por
`NARRATIVE_NOT_BOILERPLATE`.

**Mecanismo executável:**

```bash
node <skills>/spec-tasks/scripts/enrich-tasks.mjs --input outputs/spec/tasks.json --sources outputs/spec
```

Lê `requirements.md`, `business-rules.md`, `modules.md` e `product-vision.md` do diretório, ancora
os três níveis e grava `sourceRefs[]`. É **aditivo**: só preenche campo vazio, faz união em arrays e
nunca sobrescreve conteúdo escrito à mão (ver § "Enriquecimento aditivo").

---

### Modo de detalhe por nível (`levelDetail`)

Há projetos em que a decisão de processo é deliberada: Epic e Feature carregam **só o título**, e o
negócio vive na Story. Isso é legítimo — mas precisa ser **declarado**, não improvisado.

```json
"metadata": {
  "backlogHierarchy": {
    "chosen": ["epic", "feature", "story", "task"],
    "levelDetail": { "epic": "title-only", "feature": "title-only", "story": "full" },
    "rationale": "<por que este projeto concentra o negócio na Story>"
  }
}
```

| Valor | Efeito |
|-------|--------|
| `"full"` (**default**, inclusive quando o campo é ausente) | `NARRATIVE_*`, `HAS_BUSINESS_RULES`, `HAS_ACCEPTANCE_CRITERIA`, `LEVEL_GROUNDED_IN_SOURCE` e `NARRATIVE_NOT_BOILERPLATE` são **FATAL** para o nível |
| `"title-only"` | Esses validadores ficam **INATIVOS** para aquele nível — *inativos por contrato*, não suprimidos. A escolha entra no relatório (`levelDetail`, `businessValidatorsInactiveFor`) e gera o WARNING `LEVEL_DETAIL_TITLE_ONLY` |

Continuam ativos em `title-only`: o **rótulo humano** (`CONSUMER_CONTRACT` exige `name`/`title`) e
toda a **integridade referencial** (`NO_DANGLING_PARENT`, `LEVEL_USAGE_COHERENT`,
`EPIC_HAS_CHILDREN`) — Epic órfão é escopo perdido em qualquer modo.

> **Aviso, e a consequência é assumida por quem escolhe.** `title-only` produz cartões de Kanban
> **sem contexto de negócio**: quem abre o Epic no board vê um rótulo e nada mais — nem o problema,
> nem o resultado esperado, nem as regras que o delimitam. A decisão é suportada; o custo é real.

**O modo vale POR NÍVEL, de propósito** — isenção genérica esconde vazamento de desvio para os
níveis que deveriam continuar `full` (medição em `./HISTORY.md`). Declarar por nível torna isso
visível: `{"epic":"title-only","feature":"title-only","story":"full"}` mantém a Story sob gate FATAL.

**Proibido:** suspender validadores em campo `x-*` com prosa livre (ex.:
`metadata["x-desvios-do-schema-default"]: "…isso sobrepõe os validadores NARRATIVE_*…"`). O campo
`x-` pode registrar o **racional**, mas a suspensão precisa vir de `levelDetail` — senão não há como
distinguir decisão deliberada de esquecimento. Gate: **`LEVEL_DETAIL_UNDECLARED` (FATAL)**.

### Narrativa (`narrative`) — híbrida (elevator + complemento)

| Campo | Story | Epic |
|-------|-------|------|
| `elevatorPitch` | ≥120 chars — ator, capacidade, dor atual, proposta, impacto (sem jargão técnico) | Idem, visão macro do épico |
| `context` | `elevatorPitch` + parágrafo opcional de complemento (escopo/limites) | Idem |
| `problem` | Dor de negócio | `problemStatement` ou agregado |
| `deliveredValue` | Valor entregue | `businessOutcomes` / métricas |
| `actors` | Personas | União das stories |
| `mainFlow` | Passos de negócio (não técnicos) | Capacidades macro |
| `operationalImpact` | Opcional | KPIs / `successMetrics` |
| `regulatoryContext` | Base legal das regras | Regras transversais |

> <!-- linguagem-clara:campos --> **Como escrever (§ Linguagem clara, regras 1, 2, 3 e 6).** O `elevatorPitch` é a primeira
> coisa que o desenvolvedor lê no work item — ele tem que fazer sentido sozinho, para quem nunca viu
> o projeto. Frase curta e voz ativa; nenhuma sigla sem expansão; nada de "blueprint", "gate" ou nome
> de camada de arquitetura. O `mainFlow` em passos que uma pessoa consegue narrar: "o atendente busca
> o cliente pelo CPF → escolhe o plano → o sistema calcula o valor e mostra na tela".

### Regras (`businessRules[]`)

Objetos `ConsolidatedBusinessRule`: `id`, `title`, `description` (≥40 chars, linguagem executiva), `legalBasis`, `exceptions`, `sourceTaskIds` / `sourceStoryIds` / `scopeNote`. Texto da regra = obrigação/comportamento; rastreio fica nos IDs, não no corpo.

> **Como escrever (§ Linguagem clara, regra 4).** A `description` diz **o que a regra obriga ou
> proíbe**, por extenso e em português, e só depois traz o código entre parênteses. "Não deixa
> cadastrar dois clientes com o mesmo CPF (RN-012)" — nunca "conforme RN-012". `legalBasis` também:
> a obrigação em uma frase antes do número da lei ou da portaria.

### Critérios de aceite (`acceptanceCriteria[]`)

**BusinessAcceptanceCriterion** com `id`, `statement`, `category` (ex.: `OUTCOME`). **Sem** `given`/`when`/`then` em Epic/Feature/Story — Given/When/Then vive **apenas** em `task.acceptanceScenarios[]`. Fontes: `businessSummary.storyAcceptanceCriteria`, `epicAcceptanceCriteria` (filtrar critérios de “entrega concluída”), 1 outcome representativo por story/task. Tasks mantêm BDD em `acceptanceScenarios`.

### Enriquecimento aditivo (OBRIGATÓRIO) — nunca substituir conteúdo existente

`scripts/enrich-tasks.mjs` é **aditivo por padrão**: preenche apenas campo ausente/vazio e faz
**união** em arrays (`acceptanceCriteria`, `businessRules`, `deliveryScope`, `sourceRefs`). Entradas
existentes sobrevivem verbatim e na ordem original.

*(Regra e não preferência: a substituição silenciosa já perdeu conteúdo específico sem diff —
detalhes em `./HISTORY.md`.)*

| Modo | Comando | Comportamento |
|------|---------|---------------|
| Aditivo (**default**) | `node enrich-tasks.mjs --input <tasks.json> --sources <dir>` | Só preenche vazio; união em arrays; **idempotente** (2ª execução é byte-idêntica) |
| Substituição | `… --overwrite` | Substitui conteúdo existente **e imprime no stdout o diff do que será perdido, item por item**, antes de gravar |
| Simulação | `… --dry-run` | Calcula tudo e **não grava** — para conferir lacunas e diff antes de decidir |

**Gate `ENRICHMENT_NO_CONTENT_LOSS`.** O script compara o documento antes/depois e **bloqueia a
gravação** (exit 1) se, em modo aditivo, qualquer array de `acceptanceCriteria`/`businessRules`/
`deliveryScope` encolher, qualquer `statement`/id existente desaparecer, ou qualquer campo de
narrativa preenchido ficar vazio ou ser reescrito.

**Sem fallback de conteúdo de domínio.** Quando não há insumo real para um campo, o correto é **não
preencher** e registrar em `metadata.enrichmentGaps[]`. A lib mantém
`NARRATIVE_BOILERPLATE_DENYLIST` com as strings de fallback removidas, e
`NARRATIVE_NOT_BOILERPLATE` (FATAL) reprova qualquer reintrodução — por edição da lib ou por texto
colado no `tasks.json`. Vale também para narrativa **idêntica entre dois itens do mesmo nível**: dois
Epics distintos com o mesmo pitch não descrevem dois recortes de negócio distintos.

### Síntese, não concatenação (OBRIGATÓRIO)

Ao promover Task→Story→Epic, **sintetizar** em linguagem de negócio — **não** colar `selfContainedSummary` nem `FLUXO PRINCIPAL` técnico.

| Nível | Fazer | Não fazer |
|-------|-------|-----------|
| Story `elevatorPitch` / `context` | Template elevator (ator, capacidade, dor, valor, impacto) + complemento opcional | Concatenar tasks ou OBJETIVO técnico |
| Story `mainFlow` | `business.businessFlowSteps` ou títulos humanizados (máx. 7) | JWT, Repository, endpoints |
| Story `acceptanceCriteria` | `statement` de outcome por critério | BDD GWT; critérios de “stories entregues” |
| Epic `elevatorPitch` / `context` | Visão macro + complemento de capacidades/histórias | Concatenar contextos inteiros das stories |
| Epic `acceptanceCriteria` | Outcomes macro + 1 `statement` por story filha | “Todas as stories validadas em homologação” |

Preencher `deliveryScope[]` em cada story: `{ taskId, title, businessOutcome }`.

### Validadores de negócio (FATAL para Epic/Story quando nível ativo)

Os códigos, severidades e correções estão na **tabela canônica única** —
§ ["Validators de negócio e de hierarquia — `validate-tasks-business.mjs`"](#validators-de-negócio-e-de-hierarquia--validate-tasks-businessmjs-tabela-canônica)
— que cobre narrativa, regras, critérios e hierarquia deste nível (não re-listar códigos aqui:
qualquer código citado no arquivo existe lá e é emitido pelo script). GWT (`given`/`when`/`then`)
vive **apenas** em `task.acceptanceScenarios[]`; Epic/Feature/Story usam `statement`.

**Scripts de apoio (regenerar artefato existente com a mesma lógica):**
- `node <skills>/spec-tasks/scripts/enrich-tasks.mjs --input <tasks.json> [--azure-template <blueprint.json>]`
- `node <skills>/spec-tasks/scripts/validate-tasks-business.mjs <tasks.json>`

(`<skills>` = a raiz de skills em uso — `skills/`, `.cursor/skills/`, `.claude/skills/` ou
`plugin/skills/`. Nunca fixar `.cursor/skills/…`: quebra em projeto só-Claude. Ver
[`../tools/references/paths.md`](../tools/references/paths.md) § "Convenção de scripts".)

## Tipos de Demanda Operacional (EloCore) — Enabler, Spike, Technical Debt, Bug

> Fonte normativa: políticas gerais de Value Stream EloCore (hierarquia de tipos de demanda e
> conteúdo esperado de card). Toda Story do `tasks.json` é uma **demanda operacional** e carrega
> um `workItemType` — `USER_STORY` (default, retrocompatível), `ENABLER`, `SPIKE`,
> `TECHNICAL_DEBT` ou `BUG`. Classificar o tipo correto é parte da decomposição (Passo 5/6 da
> § "Ordem de execução"), **antes** de escrever a narrativa — o tipo determina o que a narrativa
> deve responder.

### Quando usar cada tipo

| `workItemType` | O que é | Quando usar | Por que existe |
|----------------|---------|--------------|-----------------|
| `USER_STORY` (default) | Menor unidade de valor entregue direto ao usuário final | RF resolvível em poucos dias, sem grande planejamento | Traduz Épico/Feature em ação concreta |
| `ENABLER` | Trabalho de suporte (técnico ou de processo) sem valor direto ao usuário, que viabiliza Features/Stories/Bugs | Preparar terreno: pipeline de deploy, modelo de dados, guideline, integração, automação | Reduz risco e viabiliza entregas de valor futuras |
| `SPIKE` | Investigação temporária para reduzir incerteza antes de comprometer uma solução | Incerteza técnica, funcional ou de negócio relevante — viabilidade de tecnologia, comparação de arquitetura, restrição de performance | Evita retrabalho e decisões equivocadas |
| `TECHNICAL_DEBT` | Limitação técnica, decisão de curto prazo ou solução paliativa acumulada | Registrar débito em código/arquitetura/infra/processo que precisa ser pago | Dá visibilidade ao débito e permite planejar a quitação |
| `BUG` | Defeito ou comportamento inesperado em produção/homologação | Corrigir falha que já afeta o usuário ou a operação | Rastreabilidade e correção estruturada de falhas |

Ao classificar uma story como `ENABLER`, `SPIKE`, `TECHNICAL_DEBT` ou `BUG`, ler
[`references/tipos-operacionais.md`](references/tipos-operacionais.md): o que a narrativa de cada
tipo responde, as isenções de validators dos tipos técnicos, onde o Enabler fica na hierarquia e o
nome do tipo no Azure DevOps.

## Estimativa de esforço em horas (dois formatos)

> **Por que esta skill estima (e não só a `spec-estimate`).** O forecast top-down da
> `spec-estimate` sozinho infla (medição em `./HISTORY.md`); a âncora é a estimativa **bottom-up**
> por task, construída das evidências concretas da própria task (operações de API, regras,
> entidades, cenários, integrações, campos de UI), consumida pela `spec-estimate` como
> **cross-check** contra o top-down.

Cada task de implementação (`class: functional`) carrega **`effortHours`** com **dois formatos**:

```json
"effortHours": {
  "manual": 18.0,
  "aiAssisted": 7.5,
  "basis": "base 15h (2 setup +6 API +4 RN +3 cenários) ×1,0 backend · IA: 15/2,0×1,35 +15×0,15"
}
```

- **`manual`** — horas para um desenvolvedor **humano** implementar a task **na mão**.
- **`aiAssisted`** — horas com **implementação IA-assistida via `spec-implement`** (execução do
  agente + revisão humana).
- **`basis`** — rastro curto de como os números saíram (opcional, mas recomendado para auditoria).

### Fórmula do `manual` (bottom-up ancorado)

Contar, a partir da **própria task já enriquecida** (passos 9–11 da Ordem de execução):

| Sinal | Fonte na task |
|-------|----------------|
| `apiOps` | nº de itens em `apiContracts[]` |
| `bizRules` | nº de itens em `businessRules[]` |
| `entities` | nº de `persistenceModel.entities[]` |
| `scenarios` | nº de `acceptanceScenarios[]` |
| `extInt` | nº de integrações externas (`type: "integration"` ou `apiContracts[]` cross-BC/externo) |
| `uiFields` | nº de `uiContext.fields[]` (0 se ausente) |

```
base_h = 2
       + 1,5·apiOps + 1,0·bizRules + 2,0·entities
       + 1,5·scenarios + 3,0·extInt + 0,5·uiFields

typeFactor:  backend 1,0 · frontend 1,1 · integration 1,3 · database 0,9 · infrastructure 1,2 · documentation 0,6

manual = arredondar(base_h × typeFactor, para 0,5)
```

Calibração de referência: task **M** cai ~8–16h, task **XL** ~24–40h. Os coeficientes são o
**botão de calibração** — ajustar aqui (com uma linha de justificativa no `sync-log`) se a realidade
do time divergir. É deliberadamente **realista**, sem o empilhamento inflado do top-down.

### Fórmula do `aiAssisted` (reusa a metodologia de IA da `spec-estimate`)

Aplica sobre a **base bottom-up** a velocidade por tipo + retentativa + overhead de revisão — os
mesmos fatores já validados na `spec-estimate` (§ "Premissas base do modo IA"):

```
speed:  backend 2,0 · frontend 1,8 · integration 1,2 · database 2,0 · infrastructure 1,2 · documentation 2,5
review = 0,30 se (extInt ≥ 2 OU bizRules ≥ 8)  senão  0,15

aiAssisted = arredondar( (manual / speed[type]) × 1,35 + manual × review , para 0,5 )
```

### Classes especiais

| Classe | `manual` | `aiAssisted` |
|--------|----------|--------------|
| `spike` | `timeboxDays × 8` | igual ao `manual` (investigação humana; sem ganho de código) |
| `uat` *(legado — **não gerar**; `NO_UAT_BACKLOG`)* | `0,5 × nº de testCaseIds` | igual ao `manual` |
| `security` | fórmula funcional acima | fórmula funcional acima |

### Rollup em `metadata.effortSummary`

Ao final, agregar todas as tasks (para consumidores, `spec-estimate` e relatório HTML). `hoursPerDay`
é a constante de conversão hora↔dia (**default 8**):

```json
"effortSummary": {
  "hoursPerDay": 8,
  "method": "bottom-up grounded (spec-tasks)",
  "manualHoursTotal": 320,
  "aiAssistedHoursTotal": 128,
  "manualDaysTotal": 40,
  "aiAssistedDaysTotal": 16,
  "byType": { "backend": { "manual": 200, "aiAssisted": 90 }, "integration": { "manual": 120, "aiAssisted": 38 } }
}
```

### Validador

`TASK_HAS_EFFORT_HOURS` (**WARNING**, em `validate-tasks-selfsufficiency.mjs`): task `functional`
sem `effortHours.manual`/`effortHours.aiAssisted` numéricos (> 0). É WARNING — nunca bloqueia — para
manter retrocompatibilidade com `tasks.json` anteriores, mas a geração **deve** preencher o campo.

## Kickoff — Níveis de Backlog (OBRIGATÓRIO antes de gerar)

Antes de ler qualquer artefato, executar este kickoff com o usuário — **salvo** quando `azureTemplate` já definiu `chosen` (confirmar apenas).

### Passo K1 — Análise automática e sugestão

Ler `outputs/spec/` e apresentar:
- Número de módulos (MOD-*) identificados em `requirements.md`
- Volume aproximado de RFs
- Presença de legado (sim/parcial/não, de `legacy.md`)
- Presença de UI inventory (de `product-requirements.md`)
- Presença de `flow-map.md` (sim/não) — se sim, mencionar que o `uiContext` será preenchido e que
  a **ordem das etapas** dos fluxos servirá de insumo para as dependências entre stories de UI
  (sugestão de sequenciamento, não regra dura — ver § Contexto de UI)

Com base nessa análise, **recomendar** um conjunto de níveis:
- ≥4 módulos ou grande volume RF → `["epic", "feature", "story", "task"]`
- 2–3 módulos, sem legado → `["feature", "story", "task"]`
- 1 módulo ou projeto enxuto → `["story", "task"]`

Apresentar ao usuário:

> "Analisei `outputs/spec/` (módulos: N; volume RF: X; legado: Sim/Não/Parcial; UI inventory: Sim/Não).
> **Recomendação:** níveis = `[lista]` porque `[racional curto]`. Aceitas?"
> - [ ] Aceito a sugestão
> - [ ] Quero ajustar (ver próximo passo)

### Passo K2 — Seleção de níveis (se K1 não aceito)

> "Marca os níveis que entram no backlog deste ciclo:
>
> 1. **Feature** — agrupamento de entregas/capacidades que desbloqueiam valor de negócio;
>    no Azure DevOps mapeia tipicamente para *Feature* sob um *Epic*.
>    [ ] Sim  [ ] Não
>
> 2. **Epic** — iniciativa ou tema grande do produto/programa; no Azure DevOps mapeia para *Epic*.
>    Pode ser **pré-criado manualmente** no projeto ADO — o pipeline usa o ID existente.
>    [ ] Sim  [ ] Não
>
> 3. **Story** — incremento orientado a usuário (entrega de valor coesa); no Azure DevOps mapeia
>    para *User Story* (Agile) ou *Product Backlog Item* (Scrum).
>    [ ] Sim  [ ] Não
>
> 4. **Task** — fatia implementável (0,5–2 dias) executável por agente/dev; filha de Story
>    na maioria dos processos Azure DevOps.
>    [ ] Sim  [ ] Não
>
> Hierarquia ADO de leitura: **Epic › Feature › Story › Task**.
> Pode usar 2, 3 ou 4 níveis em qualquer combinação coerente."

### Passo K3 — Racional

> "Em uma frase, por que esta combinação?"
> (Gravado em `metadata.backlogHierarchy.rationale`)

### Passo K4 — Persistência

Gravar em `metadata.backlogHierarchy` com esta forma (objeto literal):

```json
"backlogHierarchy": {
  "levels": ["epic", "feature", "story", "task"],
  "suggested": ["feature", "story", "task"],
  "chosen": ["epic", "feature", "story", "task"],
  "rationale": "Uma frase explicando a combinação escolhida (do Passo K3).",
  "decidedAt": "2026-07-07",
  "decidedBy": "user"
}
```

- `levels`: universo de níveis suportados.
- `suggested`: recomendação do Passo K1.
- `chosen`: níveis efetivamente ativos neste ciclo (`minItems: 1`).
- `rationale`: racional do Passo K3.
- `decidedBy`: `user` ou `agent`.

O restante da `metadata` (`backlogHierarchy`, `compactProse`, …) segue o schema — validado por script; exemplo preenchido no `tasks.example-completo.json` (lido no Passo 9).

### Combinações suportadas e regras

| `chosen` | Semântica | Caso de uso comum |
|----------|-----------|-------------------|
| `["story","task"]` | Modo legado — comportamento original | Projetos pequenos |
| `["epic","story","task"]` | Epic agrupa stories; sem Feature | Scrum simples |
| `["feature","story","task"]` | Features são raiz; sem Epic | ADO com Feature como topo |
| `["epic","feature","story","task"]` | Cadeia completa | Projetos grandes |
| `["epic","feature","task"]` | Tasks descem direto da Feature | Engenharia clássica |

**Regras:**
- Pelo menos um nível terminal (Story ou Task) deve existir.
- Se `task` em `chosen` mas `story` não: cada Task deve ter `featureId` ou `epicId`.
- Os validators de hierarquia (UI inventory, embedding/auto-suficiência e verticais) são **condicionais** aos níveis ativos em `chosen` — ver § "Validators verticais e de auto-suficiência".

## Métodos de fatiamento e qualidade de story

> Notas de método complementares — não alteram o schema, os validators formais nem a tabela de classes de task (§ "Classes de task e validators aplicáveis"), que permanecem a fonte única de verdade para bloqueio de emissão.

### Checklist INVEST (qualidade de story)

Antes de fechar uma Story, checar contra os seis critérios INVEST. Cada critério violado é um sinal de alerta (`WARNING` conceitual) a corrigir ou justificar antes de consolidar a Story — não é um validator FATAL do schema:

| Critério | Pergunta de verificação |
|----------|--------------------------|
| **I**ndependent | A story pode ser desenvolvida sem esperar outra story do mesmo sprint? |
| **N**egotiable | A story descreve o quê/porquê, não uma solução técnica fechada? |
| **V**aluable | Entrega valor perceptível ao usuário/negócio (não só valor técnico interno)? |
| **E**stimable | O time consegue estimar esforço com a narrativa e regras disponíveis? |
| **S**mall | Cabe em tasks de 0,5–2 dias (ver § SPIDR abaixo quando não couber)? |
| **T**estable | Existe ≥1 critério de aceite ou cenário BDD verificável? |

### SPIDR — método de fatiamento de tasks/stories XL

Quando uma task ou story é grande demais para caber em 0,5–2 dias (viola o critério **Small** de INVEST), fatiar usando **SPIDR** antes de gerar as tasks finais:

| Letra | Eixo de corte | Como aplicar |
|-------|---------------|---------------|
| **S**pike | Investigação/incerteza técnica isolável | Extrair uma task de pesquisa/prova de conceito, com timebox, separada da implementação |
| **P**ath | Caminhos/fluxos alternativos do mesmo RF | Fatiar por caminho: happy path numa task, cada exceção/caminho alternativo em outra |
| **I**nterface | Camada de interface (API, UI, CLI) | Fatiar por superfície: task de backend/API separada de task de frontend/UI |
| **D**ata | Tipo ou origem de dado | Fatiar por variação de dado (ex.: um tipo de entidade por vez, ou um formato de import por vez) |
| **R**ules | Regras de negócio combinadas | Fatiar por regra ou grupo de regras (RN-1 numa task, RN-2 noutra) quando várias RNs independentes co-habitam a mesma task |

**Quando usar:** aplicar SPIDR no Passo 7 ("Decomposição + tasks") sempre que uma task estimada ultrapassar 2 dias — escolher o eixo de corte mais natural para o RF em questão e documentar a escolha (ex.: no `title` da task fatiada: "Cadastro de cliente — Path: fluxo de exceção CPF duplicado").

> **Nota:** este método é a resposta operacional ao "quebrar antes da sprint" que a `spec-estimate` (Fase 8.5) identifica pelo tamanho estimado da task — a `spec-estimate` sinaliza a necessidade; SPIDR, aplicado aqui na `spec-tasks`, é o método usado para executar a quebra antes da estimativa rodar.

## Princípio de Auto-Suficiência — Como Embutir Contexto Completo

### Objetivo

**ELIMINAR** a necessidade de um agente implementador abrir qualquer arquivo além de `tasks.json` e da pasta de rules do projeto (`.cursor/rules/` ou `.claude/rules/` — ver `../tools/references/task-pipeline.md` §3).

> **Regra de leitura vs. escrita (CRÍTICA — leia antes das seções abaixo).**
> As seções seguintes indicam, em "Fonte de informação", **onde VOCÊ (gerador) vai LER**.
> Nenhuma delas autoriza **ESCREVER** o nome do arquivo dentro da task. O movimento correto é
> sempre: **abrir a fonte → TRANSCREVER o conteúdo para o campo → fechar a fonte**. O nome do
> arquivo de origem morre no seu contexto; ele não entra no artefato.
>
> | Errado (viola `NO_EXTERNAL_REFS_IN_TASKS`) | Certo |
> |---|---|
> | `"Informação completa em requirements.md"` | *(o texto completo da seção do RF, transcrito)* |
> | `"Detalhes no product-requirements.md"` | *(o fluxo passo-a-passo, transcrito)* |
> | `"Regras conforme business-rules.md"` | *(cada RN como objeto expandido, transcrito)* |
> | `"Ver enumeração StatusPedido no data-model.json"` | `"options: [{value:'ATIVO',label:'Ativo'}, …]"` *(valores transcritos)* |
>
> Se o conteúdo é volumoso, **ele é volumoso na task também** — essa é a função da task. Resumir
> para caber, ou apontar para a fonte, é defeito de geração, não economia.

> **IMPORTANTE:** Ver [`./templates/tasks.example-completo.json`](./templates/tasks.example-completo.json) para exemplo genérico completo aplicável a qualquer domínio. Os exemplos abaixo são conceituais para demonstrar o nível de detalhe esperado — você DEVE adaptar ao domínio e contexto específico do seu projeto.

### Campos que DEVEM ser expandidos (não apenas referenciados)

#### 1. `agentExecutionContext.selfContainedSummary`

**Fonte de leitura (transcrever, nunca citar — ver § Regra de leitura vs. escrita):**
- Ler a seção do RF em `requirements.md` e **transcrever** o contexto de negócio completo
- Ler as rules do projeto e **transcrever** as decisões arquiteturais relevantes à task
- Se UI: ler o PR correspondente em `product-requirements.md` e **transcrever** o fluxo passo-a-passo

**Tamanho mínimo:** 800–2000 caracteres.

> **Como escrever (§ Linguagem clara — este é o campo mais lido de toda a task).** Comece pelo que a
> pessoa passa a conseguir fazer que antes não conseguia, em uma frase. Depois o contexto, depois o
> fluxo. Transcrever a fonte **não** significa copiar a frase pesada do documento: se o
> `requirements.md` diz "realizar a validação de elegibilidade previamente à efetivação", aqui vira
> "antes de confirmar, o sistema confere se a pessoa tem direito ao benefício". O conteúdo é o mesmo;
> a forma é legível. Nenhuma sigla sem expansão na primeira aparição.

**Conteúdo obrigatório:**
- Descrição completa da funcionalidade
- Contexto de negócio (por quê essa task existe, qual problema resolve)
- Atores envolvidos e seus objetivos
- Fluxo principal de execução passo-a-passo (5-10 passos)
- Pré-condições e pós-condições
- Decisões arquiteturais relevantes (da rule de backend do projeto ou equivalente)
- Integrações com sistemas externos

**Ver exemplo:** `templates/tasks.example-completo.json` → campo `agentExecutionContext.selfContainedSummary`

#### 2. `apiContracts[]` — Schema Completo da API (Formato Compact-Prose v5.3)

**Fonte de informação:**
- Extrair o contrato completo do `api-contracts.yaml` (Fase 7)
- Converter para formato compact-prose conforme [`./templates/tasks.format-reference.md`](./templates/tasks.format-reference.md)

> **Como escrever (§ Linguagem clara, regra 10).** O compact-prose fica **exatamente** como
> especificado abaixo — completo, preciso, sem simplificação. O que se acrescenta é o `description`
> em português dizendo o que a operação faz e o que ela devolve, antes dos campos técnicos: "cria o
> pedido e devolve o número dele; se o cliente estiver com boleto vencido, recusa com 409". Sem essa
> frase, quem lê tem que reconstruir a intenção a partir do schema.

**Conteúdo obrigatório para cada operação** (strings ricas no compact-prose do format-reference):
- `method`, `path`, `operationId`, `signature`, `summary`, `description`
- `auth` (tipo, roles, claims)
- `request` (path/query/body/headers)
- `responses` com **TODOS** os status codes que o `api-contracts.yaml` declara para a operação (2xx, 400, 404, 409, 422, 500, 503…) — o gate exige ≥1 2xx e ≥1 4xx; 5xx que o contrato não declara não se inventa (aviso, não FATAL)
- `policies` (rate limiting, caching, idempotency — extrair também do `api-contracts-supplement.json`)
- `openApiRef` (referência rastreável ao arquivo fonte) e `tags`

**Ver formato:** `templates/tasks.format-reference.md` → seção "apiContracts"
**Ver exemplo:** `templates/tasks.example-completo.json` → campo `apiContracts[]`

#### 3. `persistenceModel` — Modelo de Dados Completo (Formato Compact-Prose v5.3)

**Fonte de informação:**
- Extrair o modelo de dados completo do `data-model.json` (Fase 7)
- Converter para formato compact-prose conforme [`./templates/tasks.format-reference.md`](./templates/tasks.format-reference.md)

> **Como escrever (§ Linguagem clara, regra 10).** `purpose` é a frase de abertura da regra 10: o que
> esta tabela guarda e para que serve, em português, antes da lista de colunas — "guarda um registro
> por pedido feito no portal; é a fonte do relatório de faturamento". As colunas seguem no
> compact-prose, sem cortes.

**Conteúdo obrigatório** (strings ricas no compact-prose do format-reference):
- `table`, `purpose`, `boundedContext`
- `operationType` (NEW, ALTER, DROP) e `identifierStrategy` (SEQUENCE, UUID, AUTO_INCREMENT, MANUAL)
- `primaryKey` + **TODAS** as `columns`
- `relationships`, `indexes`, `uniqueConstraints` e `checkConstraints` (quando aplicáveis)
- `migrationNotes` se for tabela nova ou alteração de legado
- `dataModelRef` (referência rastreável ao arquivo fonte)

**Ver formato:** `templates/tasks.format-reference.md` → seção "persistenceModel"
**Ver exemplo:** `templates/tasks.example-completo.json` → campo `persistenceModel`

#### 4. `businessRules[]` — Regras de Negócio Expandidas

**Fonte de leitura (transcrever, nunca citar — ver § Regra de leitura vs. escrita):**
- Ler as seções RN-XXX em `requirements.md` / `business-rules.md` e **transcrever** cada regra por extenso
- Expandir cada regra em objeto completo com algoritmo e mensagens de erro (`description` ≥200 chars)

> **Como escrever (§ Linguagem clara, regras 1, 4 e 8).** `description` é a regra por extenso, em
> frases curtas e voz ativa — não a paráfrase do código dela. `rationale` responde "por que isso
> existe" em linguagem de negócio, não em linguagem de sistema. E cada `errorMessages` é a mensagem
> que o usuário final vai ler: "CPF já cadastrado para João Silva", não "constraint violation".

**Conteúdo obrigatório para cada regra:**
- `id`, `title`, `description` completa (não apenas resumo)
- `rationale` (por quê essa regra existe)
- `source` (documento e seção de origem)
- `implementation` detalhada:
  - `validationPoint` (onde validar)
  - `algorithm` passo-a-passo (array de strings)
  - `errorMessages` para cada falha possível (objeto com chaves UPPERCASE)
- `testScenarios` (happy path + violações)
- `traceability` (RF origem, base legal)

**Como construir:**
1. Localizar RN-XXX em `requirements.md`
2. Copiar descrição completa para `description`
3. Criar `algorithm[]` detalhando cada passo de validação
4. Mapear cada cenário de erro para `errorMessages{}` com chave UPPERCASE
5. Criar `testScenarios[]` com pelo menos 1 happy path e 1 violação

**Ver exemplo:** `templates/tasks.example-completo.json` → campo `businessRules[]`

#### 5. `acceptanceScenarios[]` — Cenários Completos com Dados de Exemplo

**Fonte de informação (nesta ordem — registrar a escolha no sync-log via `SCENARIOS_FROM`):**
1. **`test-plan.md` presente** → derivar os cenários da story/task dos casos de teste
   (`TC-NNN`) das funcionalidades que ela cobre, traduzindo-os para BDD técnico e
   **rastreando o ID do caso** em `coverageNote` (ex.: `"coverageNote": "Cobre TC-004 do
   plano de testes"` — o ID do caso, nunca o nome do arquivo, que `NO_EXTERNAL_REFS_IN_TASKS`
   reprova; o caminho fica em `externalReferences`). Registrar **`SCENARIOS_FROM: test-plan`** no sync-log.
2. **`test-plan.md` ausente** → derivar da **matriz mínima** aplicada a RF+RN:
   ≥1 `HAPPY_PATH`, ≥1 `INVALID_INPUT`, ≥1 `BUSINESS_RULE_VIOLATION` **por RN aplicável**,
   ≥1 `AUTHORIZATION` (quando há perfis/ownership de recurso), ≥1 `EDGE_CASE` (entrada
   vazia/limite/duplicidade) — omissão de categoria condicional sempre justificada.
   Registrar **`SCENARIOS_FROM: derived`** no sync-log.
- **NUNCA omitir `acceptanceScenarios[]`** — task `class=functional` sem cenários é **FATAL**
  (`TASK_HAS_CONCRETE_TEST_DATA`; racional do endurecimento em `./HISTORY.md`).
- **NUNCA gerar só caminho feliz** — conjunto de `acceptanceScenarios[]` composto apenas por
  `HAPPY_PATH` é defeito de geração (o `validate-tasks-business.mjs` emite WARNING
  `STORY_HAPPY_PATH_ONLY` no nível da story; no nível da task, cada cenário declarado é validado
  com `testData` obrigatório).
- Incluir massa de dados realista (do modelo de dados da Fase 7)

> **Como escrever (§ Linguagem clara, regra 9).** O `title` de cada cenário é uma frase
> **"quando X, o sistema Y"** — "quando o CPF já existe, o sistema recusa e mostra 'CPF já
> cadastrado'". Nunca o id do cenário, nunca o nome do método de teste, nunca "validar unicidade".
> `given` / `when` / `then` seguem com os dados concretos completos; a frase do título é o que
> permite ler a lista de cenários e entender a task sem abrir nenhum deles.

**Conteúdo obrigatório para cada cenário:**
- `id`, `category`, `title`
- `given` detalhado (estado inicial completo com dados concretos)
- `when` (ação específica com payloads completos)
- `then` (lista de verificações esperadas — não apenas "retorna 201")
- `testData` completo:
  - `request` (method, path, headers, body)
  - `mockedExternalResponse` (se aplicável — respostas de sistemas externos)
  - `expectedDatabaseState` (estado esperado de TODAS as tabelas afetadas)
  - `expectedEvents` (eventos publicados)
  - `expectedResponse` (estrutura completa da resposta)
- `verificationSteps` (como verificar cada asserção do `then`)
- `relatedRules` (regras de negócio exercitadas)

**Ver exemplo:** `templates/tasks.example-completo.json` → campo `acceptanceScenarios[]` (com 3 cenários completos, `testData` sem placeholder)

#### 6. `implementationGuidance`

**Fonte de informação:**
- Deduzir orientações de implementação das rules do projeto (backend, frontend, etc.)
- Incluir decisões arquiteturais e fluxo de dados detalhado

> **Como escrever (§ Linguagem clara, regras 5 e 6).** Cada passo do `dataFlow[]` diz o que acontece,
> não só por onde passa: "o serviço confere se o cliente tem limite disponível" em vez de
> "Service.validate()". Todo arquivo, tabela ou rota citado vem com o papel dele. Cada
> `architecturalDecisions[]` traz o motivo em uma frase — decisão sem motivo é contornada na primeira
> dificuldade. E `errorHandling[].userImpact` é o que a pessoa vê na tela, em português.

**Conteúdo obrigatório em `implementationGuidance`:**
- `architecturalDecisions[]` (padrões, bibliotecas, trade-offs) — mínimo 3 itens
- `dataFlow[]` (passo-a-passo detalhado layer-by-layer) — mínimo 10 passos
- `errorHandling{}` (todos os cenários de erro com scenario/action/userImpact) — mínimo 3 cenários
- `observability{}` (logs estruturados, métricas, traces, alertas)
- `securityConsiderations[]`
- `performanceConsiderations[]`
- `testingStrategy{}` (unit, integration, contract, e2e, load tests)

**Ver exemplo:** `templates/tasks.example-completo.json` → campo `implementationGuidance`

### Validadores de Auto-Suficiência

> **Tabela única (autoritativa):** a especificação completa destes validadores — códigos, critério de falha em termos de **compact-prose** e severidade — está em **§ "Validators de auto-suficiência (SEMPRE ativos — CRÍTICOS)"** (mais abaixo). Não duplicar critérios aqui: esta seção apenas lista os campos que devem ser expandidos; a régua de validação é aquela tabela. Aplicam-se conforme a **classe** da task (ver § "Classes de task e validators aplicáveis").

## Pré-requisitos

- `outputs/spec/requirements/requirements.md` e `product-requirements/product-requirements.md` — estabilizados.
- `outputs/spec/data-model.json` — Fase 7a (recomendado; fallback: modo legado com aviso).
- `outputs/spec/api-contracts.yaml` — Fase 7b (recomendado; fallback: modo legado com aviso).
- `outputs/spec/hld.md` — Fase 6.6 (opcional; ausente → `HLD_MISSING` no sync-log e nada muda).
- Diretório de regras do projeto — resolver conforme `../tools/references/task-pipeline.md` §3 (`.cursor/rules/` → `.claude/rules/`); override via `RULES_DIR`.

## Entradas canónicas

| Arquivo | Obrigatório | Fase | Consumo |
|----------|-------------|------|---------|
| `requirements/requirements.md` | Sim | 4/5 | RFs → stories + tasks |
| `product-requirements/product-requirements.md` | Sim | 4/5 | Fluxos UX → tasks frontend |
| `data-model.json` | Recomendado | 6 | → `task.persistenceModel` |
| `api-contracts.yaml` | Recomendado | 6 | → `task.apiContract` / `task.apiContracts` |
| `test-plan.md` | Opcional | 7a | → fonte dos `acceptanceScenarios[]` das tasks funcionais (`SCENARIOS_FROM: test-plan`, rastreio `TC-NNN` em `coverageNote`); **não** gera stories/tasks (ver § Plano de Testes) |
| `flow-map.md` | Opcional | 4/5 | → `uiContext` de stories/tasks de UI (ver § Contexto de UI); ausente → `UI_CONTEXT_SKIPPED` |
| `hld.md` | Opcional | 5.6 | → tasks `SPIKE` a partir dos riscos técnicos; agrupamento de tasks por container (ver § Entrada opcional — Desenho de arquitetura) |
| pasta de rules do projeto (`.cursor/rules/**` ou `.claude/rules/**`) | Sim | Projeto | Padrões técnicos, testes, observabilidade |

## Saídas

Exatamente **dois artefatos**: `outputs/spec/tasks.json` (schema `tasks/v5.3`) e
`outputs/spec/gaps-document.md`. Schemas e exemplos de referência em `./templates/`
(catálogo comentado em § "Templates e Schemas").

## Ordem de execução

Passos numerados, únicos e sequenciais. As referências apontam para **seções reais** desta skill (não para §N inexistentes).

```
0. Plano de testes (opcional)   → § "Entrada opcional — Plano de Testes de Negócio (testPlan)"
                                  (ler test-plan.md se presente — só como fonte de cenários das
                                  tasks funcionais; NUNCA gera story/task de homologação)

1. Template Azure (opcional)    → § "Entrada opcional — Template Azure DevOps (azureTemplate)"
                                  (define chosen + WITs; se presente, o passo 2 é confirmatório)

2. Kickoff de níveis            → § "Kickoff — Níveis de Backlog" (se o passo 1 não definiu chosen)

3. Carregar insumos             → requirements + Fase 7 + regras + azureTemplate + test-plan +
                                  flow-map.md via check-flowmap.py --json (se houver; senão
                                  modo UI_CONTEXT_SKIPPED — ver § Contexto de UI)

4. Inventário de RF             → mapear RF → Epic/Feature/Story

5. Esboço de negócio por nível  → § "Ancoragem obrigatória na origem" (ANTES das tasks)
     ↪ Por Epic:  narrative + businessRules + acceptanceCriteria + successMetrics + moduleScope,
       EXTRAÍDOS de product-vision.md e modules.md — com sourceRefs[]
     ↪ Por Feature: classificar `workItemType` (§ "Tipos de Demanda Operacional (EloCore)") —
       FEATURE (default) | ENABLER — antes de escrever a narrativa
     ↪ Por Feature: narrative + businessRules + acceptanceCriteria + moduleCode + touchpoints,
       EXTRAÍDOS da entrada do módulo em modules.md — com sourceRefs[]
     ↪ Por Story: classificar `workItemType` (§ "Tipos de Demanda Operacional (EloCore)") —
       USER_STORY (default) | ENABLER | SPIKE | TECHNICAL_DEBT | BUG — ANTES de escrever a
       narrativa, pois o tipo determina o que ela deve responder
     ↪ Por Story: narrative + businessRules + acceptanceCriteria + priority, EXTRAÍDOS do RF em
       requirements.md (descrição, EARS, atores, pré-condições, cenários BDD → critérios;
       MoSCoW → priority) e da(s) RN em business-rules.md (enunciado, exceções, justificativa,
       fonte regulatória) — com sourceRefs[]; para tipo técnico (ENABLER/SPIKE/TECHNICAL_DEBT/BUG),
       benefício/impacto conforme a tabela de conteúdo por tipo
     ↪ Declarar metadata.backlogHierarchy.levelDetail se algum nível carrega SÓ título
     ↪ Sem documento de origem: NÃO sintetizar prosa — registrar em metadata.enrichmentGaps[]
     ↪ Não emitir story "vazia" esperando preencher depois
     ↪ Mecanismo: node <skills>/spec-tasks/scripts/enrich-tasks.mjs --input <tasks.json>
       --sources outputs/spec   (aditivo e idempotente; --dry-run para conferir antes)

6. Cross-cutting scan           → identificar concerns transversais (auth, logging, etc.)

7. Decomposição + tasks         → § "Kickoff" (níveis) + tasks de 0,5–2 dias que referenciam
                                  regras/cenários da story
     ↪ Com flow-map: ordem das etapas do fluxo como insumo das dependências entre stories
       de UI (sugestão, não regra dura — ver § Contexto de UI)

8. Consolidação hierárquica     → § "Síntese, não concatenação" (mesmo passe dos passos 7/9)
     ↪ Task → Story: síntese (userStory + businessSummary + deliveryScope); não concatenar
       selfContainedSummary técnico
     ↪ Story → Epic: visão executiva + uma linha por story; critérios macro (não flood de tasks)

9. Enriquecimento Fase 7        → § "Campos que DEVEM ser expandidos" (compact-prose) — aplicar
                                  integralmente o que está descrito ali (formato exato em
                                  templates/tasks.format-reference.md).
     ↪ uiContext (story/task de UI, se flow-map presente): embutir tela/rota/fluxo/etapa/
       estadosUI/regras/entidades/endpoints a partir do check-flowmap.py --json; screenshot
       fica como caminho (§ "Entrada opcional — Contexto de UI")

10. Regras e cenários           → EXPANDIR businessRules (objetos, não IDs) + acceptanceScenarios COM testData
     ↪ Cada businessRule: objeto com description completa, implementation.algorithm[], errorMessages{}
     ↪ Cada acceptanceScenario: testData com request/response/expectedDatabaseState

11. Cenários de teste           → unitTests, integrationTests, e2e, load com dados concretos

11b. Esforço em horas           → § "Estimativa de esforço em horas (dois formatos)"
     ↪ Por task functional/security: calcular effortHours { manual, aiAssisted, basis } bottom-up
       a partir dos sinais já presentes (apiOps/bizRules/entities/scenarios/extInt/uiFields)
     ↪ spike: timeboxDays×8
     ↪ Agregar metadata.effortSummary (hoursPerDay=8, totais em horas e dias, byType)

12. Contexto de agente          → § "Princípio de Auto-Suficiência"
     ↪ selfContainedSummary EXPANDIDO (≥800 chars): contexto de negócio + fluxo + decisões arquiteturais
     ↪ implementationGuidance: architecturalDecisions + dataFlow + errorHandling + observability + testingStrategy

13. Validators                  → § "Execução obrigatória (não é auto-avaliação)"
     ↪ PASSO OBRIGATÓRIO E EXECUTÁVEL — rodar os comandos LITERAIS abaixo, nesta ordem:
         node <skills>/spec-tasks/scripts/enrich-tasks.mjs --input outputs/spec/tasks.json \
              --sources outputs/spec
         node <skills>/spec-tasks/scripts/order-backlog.mjs --input outputs/spec/tasks.json
         node <skills>/spec-tasks/scripts/mark-business-rules.mjs --input outputs/spec/tasks.json
         node <skills>/spec-tasks/scripts/validate-tasks-business.mjs        outputs/spec/tasks.json --write
         node <skills>/spec-tasks/scripts/validate-tasks-selfsufficiency.mjs outputs/spec/tasks.json --write --report
     ↪ Ordem lógica e marca de regra de negócio antes dos validators, porque mudam campos que eles leem:
       o order-backlog grava executionOrder/layer nos quatro níveis — precedência declarada (story
       mustImplementFirst primeiro; task SEC no início da story; o que elas exigem sobe junto),
       dependência (herdada pelos pais), camada (data → service → ui → integration → quality), etapa
       do flow-map, prioridade e ID, nessa precedência — e, na geração completa, reescreve os arrays
       nessa ordem (no _change, não); a spec-security-review roda o mesmo script no fim do Passo E;
       o mark-business-rules grava businessRuleHeavy/businessRuleShare (task: fora das camadas
       data/ui/integration e das stories ENABLER/TECHNICAL_DEBT/SPIKE, com businessRules[] próprio
       e ≥ metade dos cenários existindo para provar RN — BUSINESS_RULE_VIOLATION, ou HAPPY_PATH/
       EDGE_CASE cujo relatedRules cita RN da própria task; relatedRules sozinho não marca;
       story/feature/epic: > metade do esforço em tasks marcadas; limite em
       metadata.businessRuleMark.threshold, 0,5). Avisos: BACKLOG_ORDER_ACYCLIC,
       BACKLOG_DEPENDENCY_EXISTS, BUSINESS_RULE_MARK_CONSISTENT (WARNING)
     ↪ Negócio primeiro porque defeito de negócio muda a decomposição e invalida o trabalho de task.
     ↪ Executar TODOS os validators aplicáveis por classe (§ "Classes de task e validators aplicáveis")
     ↪ Bloquear emissão se qualquer FATAL ativo (ex.: NO_EXTERNAL_REFS_IN_TASKS) falhar
     ↪ --write grava metadata.fatalErrors[] + metadata.validation — a ausência de fatalErrors só
       significa "limpo" quando metadata.validation está presente
     ↪ Consolidar as duas saídas numa linha VALIDATORS: … no sync-log (shape idêntico:
       {code, scope, field, message, suggestedFix})

14. Gate de homologação         → § "Homologação NÃO entra no backlog" (NO_UAT_BACKLOG)
     ↪ Conferir que NENHUMA story/task de UAT foi criada (class=uat, testType=UAT)
     ↪ Com test-plan.md: todo TC coberto por ≥1 acceptanceScenario de task funcional (coverageNote);
       TEST-PLAN em externalReferences (raiz do tasks.json)

15. Emitir                      → tasks.json (schemaVersion tasks/v5.3) + gaps-document.md
     ↪ Verificação final: tasks.json + rules do projeto devem ser SUFICIENTES para implementação
     ↪ Validar estrutura via scripts (§ Execução obrigatória) — nunca ler o schema para conferir à mão
```

## Validators verticais e de auto-suficiência

### Validators de negócio e de hierarquia — `validate-tasks-business.mjs` (tabela canônica)

A tabela canônica dos códigos do `validate-tasks-business.mjs` — severidade, quando cada um está
ativo e a correção — está em [`references/validators.md`](references/validators.md). Ler quando o
script reprovar (exit 1) ou ao mexer num validator; o script já devolve o código e a correção
sugerida (`suggestedFix`).

### Checklist do agente (NÃO são validators — nenhum script verifica)

Julgamento editorial, não verificação mecânica. **Não têm código de validator** e não aparecem em
nenhum relatório: o agente confere ao consolidar a hierarquia (Passo 8) e registra a decisão no
sync-log. (Já foram "validators só em prosa" — histórico em `./HISTORY.md`.)

- **Fatiamento vertical da Feature** (ex-`FEATURE_HAS_SLICING`): as stories de cada Feature são
  fatias verticais entregáveis, não camadas técnicas (ver § SPIDR). O que o script verifica é só a
  integridade referencial (`NO_DANGLING_PARENT` em `containedStoryIds[]`, `EPIC_HAS_CHILDREN`) —
  se o fatiamento é *bom* não é decidível por script.
- **Rastreio de métrica na vertical** (ex-`VERTICAL_METRIC_TRACE`): cada Story explicita, em
  `successMetricsContribution[]`, **como** contribui para uma `successMetrics[]` do Epic. Presença
  de texto é trivial de falsear (uma linha genérica passa); a ligação real é julgamento.

### Validators de auto-suficiência (SEMPRE ativos — CRÍTICOS)

Os critérios de cada código do `validate-tasks-selfsufficiency.mjs` estão em
[`references/validators.md`](references/validators.md) — ler quando o script reprovar. O que a
task precisa ter para passar está em § «Campos que DEVEM ser expandidos».

**Política de bloqueio:**
- Qualquer validator com severidade **FATAL** ATIVO bloqueia a emissão de `tasks.json`.
- Emitir `fatalErrors[]` em `metadata` com lista de falhas.

### Contrato de API e modelo de dados — presença é obrigatória, não opcional

Nada de "embutir `apiContracts`/`persistenceModel` **quando houver** API/dados": critério
subjetivo não é gate, porque quem julga se "houve" é o próprio gerador. A regra é dura, sem juízo
de valor no meio (a medição que motivou o endurecimento está em [`./HISTORY.md`](./HISTORY.md)):

1. **Task que CONSOME um endpoint embute o contrato completo dele — inclusive task de frontend**
   (quem escreve a chamada precisa de method, path, request, erros e auth). Gatilho e conteúdo
   exigido: linha `TASK_MISSING_API_CONTRACT` da tabela acima.
2. **Task que LÊ ou ESCREVE em tabela embute a entidade completa — inclusive frontend que só
   exibe o dado** (quem monta a grade precisa de coluna real, tipo, nulidade, domínio). Gatilho e
   conteúdo: linha `TASK_MISSING_PERSISTENCE_MODEL`.
3. **Parcial conta como ausente para efeito de revisão.** Embutir 7 de 13 colunas entrega ao
   implementador a certeza errada de que a lista está completa — pior que não embutir nada. O
   gate de qualidade (`TASK_HAS_COMPLETE_DATA_MODEL`) cobra tipo + descrição por coluna; a
   **completude da lista** é responsabilidade do gerador e vai ao `gaps-document.md` quando a
   fonte não tiver a informação.

O gatilho da verificação mecânica é objetivo: serializa-se a task **exceto** o próprio bloco e
procura-se a citação — rota que aparece **só** dentro de `apiContracts[]` não dispara nada.
Isenções: `class=uat` e `class=spike`.

### Execução obrigatória (não é auto-avaliação)

Estes validators **não** devem ser conferidos "de cabeça" pelo agente. São **dois** scripts, com
escopos distintos e complementares, executados **nesta ordem**:

```bash
# 0) ANCORAGEM (aditivo, idempotente) — extrai o negócio dos documentos de origem e grava
#    sourceRefs[]. Sem isto, LEVEL_GROUNDED_IN_SOURCE reprova todo nível com levelDetail=full.
#    Cobre TAMBÉM o contrato técnico das tasks: para cada rota/tabela citada sem
#    apiContracts/persistenceModel, preenche a partir de api-contracts.yaml / data-model.json
#    quando eles estão em --sources e a fonte é completa; caso contrário registra a lacuna em
#    metadata.enrichmentGaps[]. Nunca inventa contrato e nunca sobrescreve bloco existente.
node <skills>/spec-tasks/scripts/enrich-tasks.mjs --input outputs/spec/tasks.json --sources outputs/spec

# 1) NEGÓCIO — nível Epic / Feature / Story (narrativa, regras, critérios, ancoragem, contrato
#    de consumidor). `--write` grava os FATAL em metadata.fatalErrors[].
node <skills>/spec-tasks/scripts/validate-tasks-business.mjs        outputs/spec/tasks.json --write

# 2) AUTO-SUFICIÊNCIA — nível Task (contratos embutidos, cenários com testData, sem refs externas)
node <skills>/spec-tasks/scripts/validate-tasks-selfsufficiency.mjs outputs/spec/tasks.json --write --report
```

**`metadata.fatalErrors[]` — obrigatório e escrito pelos scripts.** Com `--write`, cada validador
grava os próprios FATAL no formato `{code, message, scope, affectedField, suggestedFix}` e registra a
execução em `metadata.validation.{business|selfsufficiency}`. Os dois escrevem no **mesmo** array e
cada um só substitui as suas entradas (códigos de task começam por `TASK_`/`UAT_`/`SPIKE_`/
`NO_EXTERNAL_`), então rodar um não apaga o resultado do outro. Quando não há FATAL, o campo é
**removido**.

**Por que negócio primeiro:** os defeitos de negócio são estruturais e mudam a decomposição
(story sem narrativa, sem regras ou sem `deliveryScope` costuma ser refatorada em outras stories).
Corrigir auto-suficiência de tasks que vão ser redistribuídas é retrabalho.

- Exit 0 → prosseguir. Exit 1 → **corrigir e rodar de novo**; nunca entregar com FATAL aberto.
- Exit 2 (**os dois scripts**) → entrada não aplicável: arquivo inexistente, JSON ilegível, ou
  documento sem o nível analisado (`business`: sem `epics[]`/`features[]`/`stories[]`;
  `selfsufficiency`: sem nenhuma task). **Investigar antes de continuar — exit 2 não é aprovação.**
  Nunca tratar exit 2 como "passou": o script está a dizer que não analisou nada. Apontar os
  validadores para o `tasks.json`, não para o schema nem para um fragmento de exemplo.

**Shape de saída — idêntico nos dois scripts.** Cada item de `errors[]` e `warnings[]` é
`{code, scope, field, message, suggestedFix}`, e ambos emitem também `errorsByCode` /
`warningsByCode`. A raiz traz `validator: "business" | "selfsufficiency"`, `ok`, `input`,
`errorCount` e `warningCount`. Isto permite concatenar as duas saídas sem transformação:

```bash
node .../validate-tasks-business.mjs        outputs/spec/tasks.json > /tmp/v-biz.json
node .../validate-tasks-selfsufficiency.mjs outputs/spec/tasks.json > /tmp/v-self.json
# consolidação: os itens dos dois arquivos têm exatamente as mesmas chaves
```

**Sobreposição deliberada (não é conflito de severidade):** o mesmo defeito de fundo pode ser
reportado nos dois níveis com códigos distintos — WARNING agregado na story, FATAL no contrato da
task (ex.: `STORY_NO_SCENARIOS` × `TASK_HAS_CONCRETE_TEST_DATA`). As severidades de cada código
estão nas duas tabelas canônicas.

**Linha obrigatória no sync-log — consolidada, os dois validadores numa linha:**

```
VALIDATORS: BUSINESS <n> FATAL / <w> WARNING · SELFSUFFICIENCY <n> FATAL em <m> tasks / <w> WARNING
```

Exemplos: `VALIDATORS: BUSINESS ok · SELFSUFFICIENCY ok` ·
`VALIDATORS: BUSINESS 3 FATAL / 5 WARNING · SELFSUFFICIENCY 12 FATAL em 7 tasks / 41 WARNING`.
Quando houver FATAL, acrescentar os **códigos** em ordem de frequência (de `errorsByCode`), ex.:
`(NO_EXTERNAL_REFS_IN_TASKS=8, TASK_HAS_CONCRETE_TEST_DATA=4)`.

> **Por que isto é obrigatório:** instrução sem verificação mecânica não é gate (o incidente que
> provou isso está em `./HISTORY.md`).

## Classes de task e validators aplicáveis

Toda task tem um campo `class` (enum `functional` | `uat` | `security` | `spike`; default `functional`). A classe determina **quais validators de auto-suficiência se aplicam** e qual **shape** a task segue.

> **Isenção nunca significa ausência de gate.** Cada classe isenta do contrato técnico tem um gate
> **próprio e FATAL**: `uat` → `UAT_TASK_HAS_SUMMARY`; `spike` → `SPIKE_TASK_COMPLETE`. (Isenção
> sem gate substituto já produziu tasks rasas "aprovadas" — medição em `./HISTORY.md`.)

| `class` | Validators aplicáveis | Shape |
|---------|-----------------------|-------|
| `functional` (default) | **Todos** os validators de auto-suficiência e de negócio, com todas as severidades da tabela acima. Em particular: `TASK_HAS_CONCRETE_TEST_DATA` é **FATAL** tanto na ausência de `acceptanceScenarios[]` quanto no preenchimento incompleto; `TASK_MISSING_API_CONTRACT` e `TASK_MISSING_PERSISTENCE_MODEL` são **FATAL** por citação de rota/tabela (ver § "Contrato de API e modelo de dados — presença é obrigatória"). | Task completa (agentExecutionContext + implementationGuidance + validation + **apiContracts para toda rota citada** + **persistenceModel para toda tabela citada** — ver a regra dura logo abaixo). |
| `uat` *(legado — **não gerar**: `NO_UAT_BACKLOG` é FATAL; linha mantida só para validar artefatos antigos com `--allow-uat`)* | **Isenta** do piso de 800 chars de `TASK_HAS_FULL_SUMMARY` (o campo continua **obrigatório**, apenas sem mínimo de tamanho) e de `TASK_HAS_CONCRETE_TEST_DATA`, `TASK_HAS_IMPLEMENTATION_GUIDANCE`, `TASK_UI_HAS_FIELD_CONTRACT`, `TASK_CITES_ID_ONLY`, `TASK_SUMMARY_BOILERPLATE` e das heurísticas de `TASK_SELF_SUFFICIENT_CHECK` (a checagem de **placeholder** — TODO/TBD/A DEFINIR — continua ativa). `TASK_HAS_COMPLETE_API_SCHEMAS` e `TASK_HAS_COMPLETE_DATA_MODEL` **não se aplicam** por construção: a task UAT não declara `apiContracts` nem `persistenceModel` (se declarar, são validados). Em `NO_EXTERNAL_REFS_IN_TASKS` a isenção é **apenas para `test-plan.md`** — é a fonte humana da homologação e **pode** ser referenciada; qualquer outro artefato de especificação (`requirements.md`, `data-model.json`, `api-contracts.yaml`, …) continua **FATAL**, porque o executor da homologação também não tem acesso a eles. | Task de execução de homologação em artefatos antigos (ver § "Homologação NÃO entra no backlog"). Ex.: [`templates/tasks.uat-task-example.json`](./templates/tasks.uat-task-example.json). |
| `security` | Exige `implementationGuidance` no shape do schema + sub-objeto `security{}`. Demais validators de auto-suficiência aplicam-se ao conteúdo técnico, com uma exceção: a **ausência** de `acceptanceScenarios[]` é **WARNING** (não FATAL) — o shape SEC ancora a verificação em `security{}` + `acceptanceCriteria`. Cenário **presente e incompleto** continua FATAL. | Task SEC injetada por `spec-security-review`. Ex.: [`templates/tasks.sec-task-example.json`](./templates/tasks.sec-task-example.json). |
| `spike` | **Isenta** do contrato técnico inteiro (`TASK_HAS_FULL_SUMMARY`, `TASK_HAS_COMPLETE_API_SCHEMAS`, `TASK_HAS_COMPLETE_DATA_MODEL`, `TASK_HAS_CONCRETE_TEST_DATA`, `TASK_HAS_IMPLEMENTATION_GUIDANCE`, `TASK_UI_HAS_FIELD_CONTRACT`, `TASK_SUMMARY_BOILERPLATE`) — não há API, dados nem cenário a entregar, porque o resultado é uma **DECISÃO**. Em troca, `SPIKE_TASK_COMPLETE` é **FATAL** e exige `description` ≥80 chars, `spike.question`, `spike.timeboxDays`, `spike.exitCriteria[]` e `spike.closesGapId`. | Task de investigação com timebox. Ex.: [`templates/tasks.spike-task-example.json`](./templates/tasks.spike-task-example.json). |

> **Propriedade do contrato:** a **skill que ESCREVE o artefato é dona do contrato**. `spec-tasks` define o shape de todas as classes de task e das stories. A skill irmã `spec-security-review` **apenas declara a classe** (`security`) e preenche os campos conforme este schema — não define shape divergente. A `spec-test-plan` não escreve no `tasks.json`: fornece o `test-plan.md` como fonte de cenários.

---

### Task de UAT (legado) — `selfContainedSummary` é OBRIGATÓRIO

Só ao validar `tasks.json` antigo com `--allow-uat`: ler
[`references/classe-uat-legado.md`](references/classe-uat-legado.md). Não gerar task `uat` —
`NO_UAT_BACKLOG` é FATAL.

---

### Task de SPIKE — investigação com timebox

Ao gerar task `class=spike`, ler o esqueleto e as quatro exigências em
[`references/tipos-operacionais.md`](references/tipos-operacionais.md) § «Task de SPIKE». O gate é
`SPIKE_TASK_COMPLETE` (FATAL).

---

### `description` e `validation` — exigidos por CLASSE, não pelo schema

Decisão que eliminou uma divergência silenciosa entre schema e prática (medição em `./HISTORY.md`)
— cada campo resolvido para um lado, os dois documentados:

| Campo | Decisão | Onde é cobrado |
|-------|---------|----------------|
| `description` | **Continua required** para `class=functional` no schema (`if/then/else`) — é o primeiro texto que uma pessoa lê no cartão do ADO. O validador foi **alinhado para cima**: ausência ou <80 chars é **FATAL** para `functional` (antes era WARNING). Para `spike`, é cobrada por `SPIKE_TASK_COMPLETE`. Para `uat`, o carrier é o roteiro em `selfContainedSummary`. | `TASK_HAS_DESCRIPTION` (FATAL, `functional`) · `SPIKE_TASK_COMPLETE` (FATAL, `spike`) |
| `validation` | **Sai de required** no schema. Nenhum validador o cobrava, e o conteúdo equivalente **já é** cobrado onde importa: cenários com dados concretos. Exigir no schema o que nenhum gate verifica é a definição da divergência que este fix elimina. | `TASK_HAS_CONCRETE_TEST_DATA` (FATAL) em `acceptanceScenarios[].testData` |

`class=uat` e `class=spike` são isentas de ambos no schema (`if/then/else`), com os gates próprios
descritos acima.

O campo `class` está no schema (`#/definitions/Task`) com requisitos condicionais por classe (`if/then/else`). Tasks sem `class` são tratadas como `functional`.

> **Validators de negócio (linguagem executiva) — isenção para `security`/`uat`:** o validador `validate-tasks-business.mjs` reconhece a classe (explícita, via `generatedBy` `spec-security-review`/`spec-test-plan`, ou pela classe predominante das tasks) e **isenta stories/epics `security` ou `uat`** dos validators de linguagem de negócio que geram falsos positivos nessas classes — `NARRATIVE_TECHNICAL_TERM`, `MAINFLOW_TECHNICAL_TERM`, `RULE_TECHNICAL`, `CRITERION_TECHNICAL`, `CRITERION_EXECUTION` e `STORY_HAS_DELIVERY_SCOPE`. Os validators **estruturais** (narrativa presente, critérios/regras válidos) permanecem ativos para todas as classes.

> **`workItemType` (Story/Feature) é ortogonal a `class` (Task).** `class` governa o shape/isenções da **Task** (functional/uat/security). `workItemType` classifica a **Story/Feature** conforme o EloCore (USER_STORY/ENABLER/SPIKE/TECHNICAL_DEBT/BUG — § "Tipos de Demanda Operacional (EloCore)") e recebe as mesmas isenções de linguagem de negócio de `security`/`uat` quando técnico (ENABLER/SPIKE/TECHNICAL_DEBT/BUG). Uma Story `workItemType: BUG` pode conter tasks `class: functional` normalmente.

## O que NÃO faz
- **Não inventar** modelos de dados ou contratos de API — consumir da Fase 7.
- **Não agregar** listas normativas de ≥3 itens num único task genérico.
- **Não embutir** cross-cutting concerns em tasks de epic-story (usar story dedicada).
- **Não emitir** `tasks.json` com validators fatais activos.
- **Não gerar** stories/tasks de homologação (UAT) a partir do `test-plan.md` — homologação com o cliente não é work item de desenvolvimento (`NO_UAT_BACKLOG`); o plano entra só como fonte dos `acceptanceScenarios[]`.
- **Não usar** exemplos com nomes de projetos reais nesta skill.
- **Modo legado** (`chosen` ausente): apenas `stories[]` + `tasks[]` — comportamento original mantido.

## Templates e Schemas

### Schema atual

- [`./templates/tasks.schema-atual.json`](./templates/tasks.schema-atual.json) — Schema JSON Schema completo do `tasks.json` (`tasks/v5.3`, compact-prose). Usar para validação de estrutura. Regressão automatizada em [`./templates/validate-examples.mjs`](./templates/validate-examples.mjs).

### Formato compact-prose

- [`./templates/tasks.format-reference.md`](./templates/tasks.format-reference.md) — Documentação completa dos formatos compact-prose para `apiContracts` e `persistenceModel`. Consultar para entender como converter objetos em strings ricas estruturadas.

### Exemplo de task auto-suficiente

- [`./templates/tasks.example-completo.json`](./templates/tasks.example-completo.json) — Exemplo completo de task de **backend** no formato `tasks/v5.3` compact-prose com todas as seções obrigatórias, incluindo `acceptanceScenarios[]` com HAPPY_PATH + INVALID_INPUT + BUSINESS_RULE_VIOLATION e `testData` concreto. Domínio genérico de "gestão de pedidos" aplicável a qualquer contexto. **Usar como referência ao gerar tasks de backend.**

### Exemplo de contrato de tela (`uiContext` completo)

- [`./templates/tasks.frontend-example.json`](./templates/tasks.frontend-example.json) — **exemplo canônico do contrato de UI** (extraído do hierarchy-example para leitura barata): `STORY-001.uiContext` com `fields[]` (`options[]` transcritas e `optionsSource`, máscaras, `validations[]` com mensagem de erro), `grid{}` (`columns[]`, `defaultSort`, `pagination`, `rowActions`, `emptyState`) e `filterBehavior{}` (`applyOn`, `combination`, `clearAll`, `persistence`) + `TASK-001-002` (`type: "frontend"`). **Usar como referência ao gerar tasks de frontend.**

### Exemplo hierárquico (Epic + Story + Task com negócio)

- [`./templates/tasks.hierarchy-example.json`](./templates/tasks.hierarchy-example.json) — Epic/Story já com `narrative`, `businessRules`, `acceptanceCriteria` e tasks filhas. Ler **só** quando precisar ver a cadeia hierárquica completa montada — para o contrato de UI, usar o `tasks.frontend-example.json` acima (bem menor).

### Template Azure (entrada opcional)

- [`./templates/azure-template.schema.json`](./templates/azure-template.schema.json) — Contrato do JSON de processo ADO.

### Template de gaps

- [`./templates/gaps-document.md`](./templates/gaps-document.md) — Template do documento de gaps.

### Exemplo de task de investigação (`class=spike`)

- [`./templates/tasks.spike-task-example.json`](./templates/tasks.spike-task-example.json) — Task de spike com os quatro campos obrigatórios (`spike.question`, `timeboxDays`, `exitCriteria[]`, `closesGapId`). **Usar como referência ao gerar spikes** — ver § "Task de SPIKE".

### Fixtures de regressão

- [`./templates/tasks.fixture-compat.json`](./templates/tasks.fixture-compat.json) — **Fixture de retrocompatibilidade.** Exercita as DUAS formas de cada chave divergente que já causou perda silenciosa nos consumidores: rótulo humano (`name` vs. só `title`), `acceptanceCriteria` (objetos `{id,statement}` vs. strings vs. legado `businessSummary.storyAcceptanceCriteria[]`), `traceability` (objeto vs. array) e narrativa (`narrative` v5.3 vs. `businessSummary` v5.0). Inclui `levelDetail` com um nível em `title-only`.
- [`./templates/test-consumer-compat.mjs`](./templates/test-consumer-compat.mjs) — **Teste executável do fixture acima.** Roda os consumidores reais (`spec-tasks-html/lib/render-html.mjs` e `spec-tasks-azure/lib/ado-narrative-html.mjs` + `azureDevopsService.js`) e afirma que **toda** forma produz saída legível — nenhuma cai em branco. Conformidade de schema não prova isso: as quatro perdas silenciosas que motivaram o teste eram todas *válidas* contra o schema.

  ```bash
  node <skills>/spec-tasks/templates/test-consumer-compat.mjs
  ```

- [`./templates/tasks.fixture-validators.json`](./templates/tasks.fixture-validators.json) — **Fixture NEGATIVO.** Cada item existe para provar que um validador FATAL dispara (`NARRATIVE_NOT_BOILERPLATE`, `LEVEL_GROUNDED_IN_SOURCE`, `CONSUMER_CONTRACT`, `LEVEL_DETAIL_UNDECLARED`, `UAT_TASK_HAS_SUMMARY`, `SPIKE_TASK_COMPLETE`). Os dois validadores devem sair com **exit 1** sobre ele; se passarem, houve regressão.

  ```bash
  node <skills>/spec-tasks/scripts/validate-tasks-business.mjs        <skills>/spec-tasks/templates/tasks.fixture-validators.json
  node <skills>/spec-tasks/scripts/validate-tasks-selfsufficiency.mjs <skills>/spec-tasks/templates/tasks.fixture-validators.json
  ```

## References

- Pasta de rules do projeto (`.cursor/rules/` ou `.claude/rules/`) — padrões técnicos do projeto.
- [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) — vocabulário e convenções da cadeia técnica.

## Skills irmãs

| Skill | Fase | Relação com `spec-tasks` |
|-------|------|---------------------------|
| `spec-data-model` | 6a | Produz `data-model.json` — embutido em `persistenceModel` das tasks |
| `spec-api-contracts` | 6b | Produz `api-contracts.yaml` — embutido em `apiContract`/`apiContracts` das tasks |
| `spec-test-plan` | 7a | **Antes** desta skill quando existe; os `TC-NNN` do `test-plan.md` são a fonte dos `acceptanceScenarios[]` das tasks funcionais (`SCENARIOS_FROM: test-plan`). **Não** gera stories/tasks de homologação (`NO_UAT_BACKLOG`) |
| `spec-security-review` | 7b | **Depois** desta skill; injeta tasks `class: "security"` in-place (o shape é desta skill — a irmã só declara a classe) |
| `spec-estimate` | 7.5 | Depois de 7/7b; consome o backlog (SEC incluídas) para o forecast |
| `spec-tasks-html` | 7c | Relatório HTML navegável do `tasks.json` |
| `spec-tasks-azure` | 8 | Publica o `tasks.json` no Azure DevOps |

---

## Modo _change — Alteração de Escopo

Invocar este modo quando o prompt contiver qualquer um destes sinais:
- "modo _change", "gere o tasks-complementary_change", "alteração de escopo"
- O usuário apresentou `api-contracts_change.yaml`, `data-model_change.json` ou `scope-change-analysis.md` como entrada
- O usuário menciona "complementar as tasks" ou "tasks para a alteração"

Ao entrar neste modo, ler [`references/modo-change.md`](references/modo-change.md) antes de
gerar: o que muda, o kickoff, a ordem de execução e as regras específicas do `_change`.

---

## Histórico

Changelog, erros históricos dos validators, renomeações de código e o racional de cada
endurecimento de gate vivem em [`./HISTORY.md`](./HISTORY.md). São contexto de **manutenção**
da skill — não instrução de geração. Ler ao alterar um validator ou investigar por que um
gate tem a severidade que tem; não é preciso ler para gerar `tasks.json`.
