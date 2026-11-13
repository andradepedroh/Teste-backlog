# spec-tasks — tabelas de validators

> Lido sob demanda a partir do `SKILL.md` (§ «Validators verticais e de auto-suficiência»): ao corrigir
> uma reprovação do `validate-tasks-business.mjs` ou do `validate-tasks-selfsufficiency.mjs`, ou ao
> mexer num validator. Os dois scripts já devolvem o código e a correção sugerida (`suggestedFix`);
> estas tabelas são a especificação de cada código.

### Validators de negócio e de hierarquia — `validate-tasks-business.mjs` (tabela canônica)

**Esta é a única tabela de códigos do `validate-tasks-business.mjs`.** Todos os códigos abaixo
são **emitidos pelo script**, e o script não emite nenhum código fora desta tabela — a
correspondência é verificável por `grep` nas duas direções. Nenhum validator é "auto-avaliado pelo
agente": o que não está aqui é **checklist**, e está na subseção seguinte.

O nível é aplicado a **todo** item do nível correspondente (Epic, Feature e Story compartilham os
validators de narrativa, regras e critérios — daí os códigos sem prefixo de nível). "Ativo quando"
refere-se a `metadata.backlogHierarchy.chosen`; quando o `chosen` não está declarado, o script
**infere** os níveis a partir dos arrays presentes (`epics[]`/`features[]`/`stories[]`), e reporta
a origem em `levelsSource` na saída JSON.

| Código | Severidade | Verificação | Ativo quando | Correção |
|--------|-----------|-------------|--------------|----------|
| `NARRATIVE_ELEVATOR_PITCH` | **FATAL** | `narrative.elevatorPitch` ≥120 chars | Epic/Feature/Story presente | Escrever "Como `<ator>`, quero `<capacidade>`, para `<resultado>`" com ≥120 chars |
| `NARRATIVE_CONTEXT` | **FATAL** | `narrative.context` ≥200 chars | Epic/Feature/Story presente | Descrever situação atual, motivação e escopo com ≥200 chars |
| `NARRATIVE_TECHNICAL_TERM` | **FATAL** | Narrativa sem verbo/termo de implementação (`implementar`, `/api/`, JWT, Repository, React…) | idem, **isento** em `security`/`uat` | Remover o termo técnico; o técnico vive nas tasks |
| `MAINFLOW_TECHNICAL_TERM` | **FATAL** | `narrative.mainFlow[]` sem termo técnico | idem, **isento** em `security`/`uat` | Reescrever o passo como o que o usuário faz e obtém |
| `HAS_BUSINESS_RULES` | **FATAL** | `businessRules[]` ≥1 item | Epic/Feature/Story presente | Adicionar ≥1 regra como objeto `{id, title, description}` |
| `RULE_NOT_OBJECT` | **FATAL** | Cada `businessRules[i]` é **objeto**, não string | idem | Expandir a string para `{id, title, description}` (na task, também `implementation{}` e `testScenarios[]`) |
| `RULE_DESCRIPTION` | **FATAL** | `businessRules[i].description` ≥40 chars | idem | Transcrever a obrigação completa (condição, exceções, efeito) |
| `RULE_TECHNICAL` | **FATAL** | Regra sem linguagem de implementação | idem, **isento** em `security`/`uat` | Descrever a regra em termos de negócio; o algoritmo vive em `task.businessRules[].implementation` |
| `HAS_ACCEPTANCE_CRITERIA` | **FATAL** | `acceptanceCriteria[]` ≥1 item | Epic/Feature/Story presente | Adicionar ≥1 critério com `statement` de resultado de negócio |
| `CRITERION_STATEMENT` | **FATAL** | `acceptanceCriteria[i].statement` ≥20 chars | idem | Escrever o resultado de negócio verificável em ≥20 chars |
| `CRITERION_BDD_FORBIDDEN` | **FATAL** | Critério **sem** `given`/`when`/`then` | idem | GWT vive **apenas** em `task.acceptanceScenarios[]`; aqui usar `statement` |
| `CRITERION_EXECUTION` | **FATAL** | Critério descreve outcome, não conclusão de execução | idem, **isento** em `security`/`uat` | Trocar "task concluída"/"código implementado" pelo resultado observável |
| `CRITERION_TECHNICAL` | **FATAL** | Critério sem linguagem técnica | idem, **isento** em `security`/`uat` | Descrever o efeito para o usuário |
| `STORY_HAS_USER_STORY` | **FATAL** | `userStory.asA` + `iWant` + `soThat` preenchidos | "story" ativo | Preencher os três campos do formato INVEST |
| `STORY_HAS_DELIVERY_SCOPE` | **FATAL** | `deliveryScope[]` ≥1 item | "story" ativo, **isento** em `security`/`uat` | Uma entrada por task: `{taskId, title, businessOutcome}` |
| `EPIC_HAS_OUTCOME` | **FATAL** | `successMetrics[]` ≥1 métrica legível | "epic" ativo | Declarar métrica com número e prazo |
| `EPIC_HAS_CHILDREN` | **FATAL** | Epic tem ≥1 filho: Feature/Story com `epicId` deste Epic, Story de Feature deste Epic, ou `containedStoryIds[]` não vazio | "epic" ativo | Apontar os filhos (`epicId` no filho) ou listar `containedStoryIds[]`; Epic sem filho sai do backlog |
| `FEATURE_HAS_TOUCHPOINTS` | **FATAL** | `touchpoints[]` ≥1 superfície | "feature" ativo | Listar as superfícies tocadas em linguagem de negócio |
| `NO_DANGLING_PARENT` | **FATAL** | Todo `epicId`/`featureId`/`storyId` referenciado **existe** no documento (inclui `containedStoryIds[]` e `task.storyId` coerente com a story que a aninha) | sempre | Corrigir o id do pai ou criar o item referenciado |
| `LEVEL_USAGE_COHERENT` | **FATAL** | (a) Story/Feature declara o ponteiro do nível superior ativo; (b) ponteiro não aponta para nível ausente do documento; (c) `chosen` e arrays presentes coincidem | sempre | Declarar `featureId`/`epicId`, ou alinhar `metadata.backlogHierarchy.chosen` aos níveis realmente gerados |
| `NO_UAT_BACKLOG` | **FATAL** | Nenhuma story com `testType=UAT` / `class=uat` / `generatedBy: spec-test-plan` e nenhuma task `class=uat` — homologação não é work item de desenvolvimento | sempre (`--allow-uat` só para validar artefato legado) | Remover o item; usar o `test-plan.md` como fonte dos `acceptanceScenarios[]` das tasks funcionais (§ "Homologação NÃO entra no backlog") |
| `CONSUMER_CONTRACT` | **FATAL** | Cada chave que `spec-tasks-azure` e `spec-tasks-html` **leem** existe e está na forma que eles leem: `name` (rótulo humano), `narrative`, `businessRules`, `acceptanceCriteria` com `statement` (objeto) ou string, `priority` (story), `traceability` como objeto **ou** array | nível presente; os campos de negócio só quando `levelDetail` = `full` | Preencher a chave. Os consumidores **não têm fallback**: o campo sai vazio no work item e no relatório, sem erro na publicação |
| `LEVEL_GROUNDED_IN_SOURCE` | **FATAL** | (a) ≥1 `sourceRefs[]` resolvível `{document, itemId}`; (b) ≥1 `businessRules[]` com procedência (id de RN, `sourceRefs[]` ou `sourceTaskIds[]`); (c) ≥1 regra com `description` ≥120 chars; (d) ≥1 `acceptanceCriteria[]` com rastreio (`relatedRuleIds[]`, `sourceStoryIds[]`, `sourceTaskIds[]` ou id contendo o RF) | `levelDetail` do nível = `full`, **isento** em `security`/`uat` | Rodar `enrich-tasks.mjs --sources <dir>` para extrair e ancorar, ou preencher `sourceRefs[]` à mão. Narrativa sem `sourceRef` é narrativa inventada |
| `NARRATIVE_NOT_BOILERPLATE` | **FATAL** | (a) Nenhuma string da `NARRATIVE_BOILERPLATE_DENYLIST` aparece em narrativa, critério, regra ou `deliveryScope`; (b) nenhum par de itens do **mesmo nível** tem narrativa (ou `elevatorPitch`) idêntica | `levelDetail` do nível = `full`, **isento** em `security`/`uat` | Ancorar no RF/RN de origem, ou deixar o campo **vazio** e registrar em `metadata.enrichmentGaps[]`. Campo em branco é honesto; prosa genérica não |
| `LEVEL_DETAIL_INVALID` | **FATAL** | `metadata.backlogHierarchy.levelDetail.<nível>` ∈ {`title-only`, `full`} | campo declarado | Usar um dos dois valores suportados |
| `LEVEL_DETAIL_UNDECLARED` | **FATAL** | Nenhum campo `x-*` de desvio suspende validadores em prosa livre | `metadata` tem campo `x-…desvio/deviation/override` citando validador | Declarar a decisão em `metadata.backlogHierarchy.levelDetail`. O campo `x-` pode continuar como registro do racional, mas a suspensão precisa vir do campo suportado |
| `LEVEL_DETAIL_TITLE_ONLY` | WARNING | Registro da escolha de `title-only` e da consequência assumida | nível com `levelDetail` = `title-only` | Nenhuma ação — é o registro em auditoria de que os cartões daquele nível ficam sem contexto de negócio por decisão |
| `STORY_NO_SCENARIOS` | WARNING | Story tem ≥1 `acceptanceScenario` (na story ou em qualquer task) | "story" ativo, **isento** em `security`/`uat` | Derivar do `test-plan.md` ou da matriz mínima RF+RN — **FATAL por task** em `TASK_HAS_CONCRETE_TEST_DATA` |
| `STORY_FEW_SCENARIOS` | WARNING | Story tem ≥3 cenários agregados | idem | Completar a matriz: HAPPY_PATH + INVALID_INPUT + BUSINESS_RULE_VIOLATION |
| `STORY_HAPPY_PATH_ONLY` | WARNING | ≥1 cenário negativo (por `category`; sem `category`, por heurística de termo de negativa) | idem | Adicionar cenário negativo com `testData` concreto e a mensagem de erro exibida |
| `UI_TELA_SEM_COBERTURA` | WARNING | Toda TEL do `flow-map.md` aparece em ≥1 `uiContext` | `flow-map.md` legível por `check-flowmap.py --json` | Criar/ajustar a story ou task que entrega a tela e preencher o `uiContext` |
| `UI_CONTEXT_TELA_INVALIDA` | WARNING | Todo `uiContext.tela` é TEL válida do `flow-map.md` | idem | Usar o `TEL-xxx` real; sem flow-map, o slug da rota é aceito e este aviso é esperado |
| `BACKLOG_ORDER_ACYCLIC` | WARNING | Nenhum ciclo de dependência em nenhum nível — inclusive o que nasce quando a dependência entre filhos sobe para os pais (`scripts/order-backlog.mjs`) | sempre | Quebrar o ciclo no backlog; os itens do ciclo ficam na ordem de desempate até lá |
| `BACKLOG_DEPENDENCY_EXISTS` | WARNING | Todo ID em `dependencies[]`/`dependsOn[]` existe no backlog (`scripts/order-backlog.mjs`) | sempre | Corrigir o ID ou tirar a dependência |
| `BUSINESS_RULE_MARK_CONSISTENT` | WARNING | Marca de regra de negócio calculada por `scripts/mark-business-rules.mjs`; marca manual só com `businessRuleOverride.justification` (≥20 chars), e divergência do cálculo é avisada | sempre | Justificar a marca manual ou deixar o cálculo valer |

**Modo `_change` (delta).** Quando `metadata.changeMode = true` ou `metadata.basedOnTasks[]` está
preenchido, o arquivo é um **delta** e os pais podem viver no `tasks.json` base, que o validador não
carrega. Nesse modo a **resolução** de ponteiro (`NO_DANGLING_PARENT`, `LEVEL_USAGE_COHERENT` casos
(b) e (c)-nível-ausente) cai para **WARNING**; a **exigência** do ponteiro (caso (a)) e todos os
demais validators permanecem **FATAL**. A saída JSON traz `deltaMode`, `levelsActive` e
`levelsSource` para o relatório do sync-log.

**Exit codes** — idênticos ao `validate-tasks-selfsufficiency.mjs`: `0` sem FATAL · `1` com ≥1
FATAL · `2` **entrada não aplicável** (arquivo inexistente, JSON ilegível, ou documento sem
`epics[]`/`features[]`/`stories[]` — JSON Schema, fragmento de Task, artefato de outra fase).
Exit 2 **não** é reprovação: é "não analisei". Um `tasks.json` corrompido nunca sai como exit 1.

### Validators de auto-suficiência (SEMPRE ativos — CRÍTICOS)

| Código | Verificação | Critério de falha | Severidade |
|--------|-------------|-------------------|------------|
| `TASK_HAS_FULL_SUMMARY` | `agentExecutionContext.selfContainedSummary` tem ≥800 caracteres E inclui: contexto de negócio, fluxo principal, pré/pós-condições, decisões arquiteturais | `length < 800` OU campos obrigatórios ausentes | **FATAL** |
| `TASK_HAS_COMPLETE_API_SCHEMAS` | Cada `apiContracts[]` (string rica compact-prose) tem `auth` **não vazio**, `request` com ao menos um componente `Body:` / `Path:` / `Query:`, e `responses` contendo ao menos um **2xx** E um **4xx** (e o **5xx** que o contrato declarar) | `auth` vazio OU `request` sem nenhum componente OU `responses` sem 2xx/4xx. **5xx ausente → WARNING**: a `spec-api-contracts` não manda declarar 5xx por operação (o stub dela não tem nenhum), e exigir obrigava a inventar contrato | **FATAL** (auth, request, 2xx, 4xx) · **WARNING** (5xx) |
| `TASK_HAS_COMPLETE_DATA_MODEL` | Cada entity tem `columns` (string rica compact-prose) com **≥1 segmento** separado por `\|` contendo **TIPO** e **descrição após `—`** | `columns` vazio OU nenhum segmento com tipo + descrição após `—` | **FATAL** |
| `TASK_MISSING_API_CONTRACT` | Gate de **PRESENÇA** — os dois de cima são de **qualidade** e só olham o campo já preenchido. Toda task que **cita uma rota literal** (`/\/v\d+\/[a-z0-9\-\/{}]+/i`, ou uma rota que **existe no `api-contracts.yaml` do projeto** citada com verbo HTTP — `POST /pedidos/{id}/envio` —, como `"path"` de cenário ou com o prefixo de versão/base do servidor) em qualquer campo que **não** seja o próprio `apiContracts` embute o contrato completo daquela operação. Rota de tela (`uiContext.rota`) e nome de domínio em prosa não contam. O contrato é lido de `--sources <dir>`, da pasta do `tasks.json` ou da pai. Vale para `type:"frontend"`: quem **consome** o endpoint precisa do shape | **FATAL:** rota literal citada e `apiContracts[]`/`apiContract` ausente ou vazio. **WARNING:** task de código (`frontend`/`backend`/`fullstack`/…) sem `apiContracts`, cuja **story-pai** declara rota, sem a própria task citar rota literal | **FATAL** (citação explícita) · **WARNING** (sinal fraco via story-pai; e task `security` com rota que só os arquivos do projeto reconhecem — o `inject-sec` não embute contrato) · isento (`uat`, `spike`) |
| `TASK_MISSING_PERSISTENCE_MODEL` | Gate de **PRESENÇA**: toda task que **cita uma tabela física** (`/\b(tb_\|dm_\|ft_\|obt_)[a-z0-9_]+/i`, ou uma tabela que **existe no `data-model.json` do projeto** citada como `tabela <nome>`, em SQL — `FROM`/`JOIN`/`INTO`/`UPDATE <nome>` —, como coluna qualificada `<nome>.<coluna>` ou, se o nome tem `_`/`.`, pelo próprio nome) fora do próprio `persistenceModel` embute a entidade completa. Vale para task de frontend que só **exibe** o dado | **FATAL:** tabela física citada e `persistenceModel.entities[]` ausente ou vazio. **WARNING:** task de código sem `persistenceModel`, cuja **story-pai** declara tabela, sem a própria task citar tabela literal | **FATAL** (citação explícita) · **WARNING** (sinal fraco via story-pai; e task `security` com tabela que só os arquivos do projeto reconhecem — o `inject-sec` não embute entidade) · isento (`uat`, `spike`) |
| `TASK_HAS_EXPANDED_BUSINESS_RULES` | Cada item em `businessRules[]` é **objeto** (não string) com: `id`, `title`, `description` (≥200 chars), `implementation.algorithm[]`, `implementation.errorMessages{}`, `testScenarios[]` | Regra é string simples OU `description < 200` chars OU `algorithm[]` ausente | **FATAL** |
| `TASK_HAS_CONCRETE_TEST_DATA` | `acceptanceScenarios[]` **não vazio** E cada item contém `testData.request` (method, path, headers, body), `testData.expectedResponse` (statusCode, body), `testData.expectedDatabaseState` (estado de TODAS as tabelas afetadas) | `acceptanceScenarios[]` **ausente/vazio** (task `functional`) OU `testData` ausente OU qualquer subseção vazia. O `body` do request só é exigido quando a **operação tem corpo** — `Body:` no `request` do `apiContracts[]` da task, ou `requestBody` no `api-contracts.yaml` do projeto; sem contrato para o par método + rota, vale o verbo (GET/HEAD/DELETE/OPTIONS sem corpo). Corpo vazio **declarado** (`"body": {}`) vale em cenário `INVALID_INPUT` | **FATAL** (`functional`) · **WARNING** (`security`) · isento (`uat`) |
| `TASK_HAS_IMPLEMENTATION_GUIDANCE` | Campo `implementationGuidance` presente em cada task com: `architecturalDecisions[]` (≥3 itens), `dataFlow[]` (≥10 passos), `errorHandling{}` (≥3 cenários), `observability.structuredLogging[]`, `observability.metrics[]`, `testingStrategy{}` | Campo ausente OU qualquer subseção vazia | **FATAL** |
| `NO_EXTERNAL_REFS_IN_TASKS` | Nenhum **nome de arquivo de especificação** e nenhum **ponteiro para documento externo** aparece no corpo da task, em qualquer formulação | (a) ocorrência de `/\b[\w][\w.-]*\.(ya?ml\|json\|md)\b/i` fora das chaves da allowlist (ver abaixo); (b) **marcador de documento externo** — ver § "Detecção de ponteiro" | **FATAL** (arquivo de especificação reconhecido ou ponteiro) · **WARNING** (arquivo não reconhecido) |
| `TASK_UI_HAS_FIELD_CONTRACT` | Task com `uiContext` tem `uiContext.fields[]` não vazio; cada campo com `name` e `type`; campos `select`/`multiselect`/`dropdown`/`combo`/`radio`/`checkboxgroup`/`autocomplete`/`lookup` declaram `options[]` **ou** `optionsSource` | **FATAL:** `uiContext` presente com `fields[]` vazio OU campo sem `name`/`type` OU campo de opções sem lista nem origem. **WARNING:** `type` de UI (`frontend`/`ui`/`web`/`mobile`) **sem** `uiContext`, ou texto indicando UI sem `uiContext` | **FATAL** (uiContext declarado e incompleto) · **WARNING** (uiContext ausente) |
| `TASK_CITES_ID_ONLY` | Task não se limita a **indexar** requisitos: se o `selfContainedSummary` cita ≥3 requisitos no formato `ID (título)`, a task traz conteúdo derivado deles — `uiContext.fields[]`, `acceptanceScenarios[]` ou `businessRules[]` | **FATAL:** ≥3 citações `ID (título)` e **nenhum** dos três. **WARNING:** ≥3 citações e nenhum `acceptanceScenario` derivado | **FATAL** (índice puro) · **WARNING** (sem cenários) |
| `TASK_SUMMARY_BOILERPLATE` | Densidade, não tamanho: o `selfContainedSummary` não é um template repetido. Jaccard de 8-shingles contra os demais summaries (tasks `uat` isentas) | ≥85% de coincidência com task **da mesma story**, ou ≥75% com task de **story diferente** | **WARNING** |
| `TASK_SELF_SUFFICIENT_CHECK` | Verificação holística: para cada task, simular um agente que só tem acesso a tasks.json + rules — identificar qualquer informação ausente necessária para implementação. Inclui: placeholders não resolvidos (`TODO:`/`TODO(`/`FIXME`/`TBD`/`A DEFINIR` — **só em MAIÚSCULAS**; racional em `./HISTORY.md`), summary sem pré/pós-condições, task sem nenhuma superfície declarada | Informação crítica ausente (ex: status code esperado, nome de coluna, opção de dropdown, validação de negócio) | **WARNING** |
| `TASK_HAS_DESCRIPTION` | `description` presente com ≥80 caracteres — é o primeiro texto que uma pessoa lê no cartão do ADO | Ausente OU `< 80` chars | **FATAL** (`functional`) · coberto por `SPIKE_TASK_COMPLETE` (`spike`) · isento (`uat`, o carrier é o roteiro) |
| `UAT_TASK_HAS_SUMMARY` | `class=uat`: `agentExecutionContext.selfContainedSummary` presente com ≥200 chars E os casos cobertos nomeados (`testCaseIds[]` ou `TC-NNN` citado) | Campo ausente OU `< 200` chars OU nenhum TC nomeado | **FATAL** (`uat`) · `minimumOutputToDeliver[]` vazio → **WARNING** |
| `SPIKE_TASK_COMPLETE` | `class=spike`: `description` ≥80 chars, `spike.question` ≥20 chars, `spike.timeboxDays` > 0, `spike.exitCriteria[]` ≥1, `spike.closesGapId` | Qualquer um dos cinco ausente | **FATAL** (`spike`) · `timeboxDays` > 5 → **WARNING** |
| `TASK_HAS_EFFORT_HOURS` | `class=functional`: `effortHours.manual` e `effortHours.aiAssisted` numéricos (> 0) — estimativa de esforço em horas nos dois formatos (§ "Estimativa de esforço em horas (dois formatos)") | `effortHours` ausente OU `manual`/`aiAssisted` não numérico ou ≤ 0 | **WARNING** (`functional`) · isento (`uat`, `spike`, `security`) |

**Allowlist de chaves de `NO_EXTERNAL_REFS_IN_TASKS` (10 — idêntica ao script):**
`openApiRef`, `dataModelRef`, `screenshot`, `sourceDocument`, `sourceFile`, `specRef`, `path`
(path de endpoint HTTP), `exactTestCommands`, `files` (`visualReferences.files[]`) e `source`
(objeto `{document, section, excerpt}` — aceito **apenas** quando `excerpt` está preenchido, isto
é, quando o conteúdo está embutido e o nome do arquivo é só procedência).

**Detecção de ponteiro para documento externo (marcadores).** Só é FATAL com um **marcador de
documento externo**; prosa que apenas MENCIONA requisitos não é ponteiro:

| Marcador | Dispara | Não dispara |
|----------|---------|-------------|
| nome de arquivo | `conforme requirements.md`, `detalhes em api-contracts.yaml` | `security.mdc`, `frontend.mdc` (o implementador tem as rules) |
| `verbo+artefato` | `consultar o arquivo`, `ver o documento de`, `ler a documentação` | `ver os valores abaixo`, `consultar o campo` |
| `artefato-de-especificação` | `no documento de requisitos`, `conforme o artefato de negócio` | `no arquivo de log`, `a especificação do enum StatusProposta` |
| `conforme-descrito-em` | `conforme descrito em`, `conforme definido no` | `descrito em apiContracts desta task` (qualificador interno) |
| `referência-a-seção` | `§4.2 do business-rules`, `seção 4.2`, `seção "Regras"` | `passo 4`, `coluna 3`, `§3 de auth.mdc` (arquivo de rules) |

Vetos que anulam a deteção (janela de ±60/80 caracteres em volta do match): qualificador de
escopo interno (`desta task`, `deste work item`, `acima`, `abaixo`), nome de **campo da task**
(`apiContracts`, `persistenceModel`, `uiContext`, `businessRules`, …), alvo interno
(`passo`, `item`, `tabela`, `coluna`, `campo`, `cenário`, `algoritmo`) e referência a arquivo de
**rules** (`*.mdc` e nomes conhecidos).


**Política de bloqueio:**
- Qualquer validator com severidade **FATAL** ATIVO bloqueia a emissão de `tasks.json`.
- Emitir `fatalErrors[]` em `metadata` com lista de falhas.
