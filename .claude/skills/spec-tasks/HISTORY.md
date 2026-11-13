# spec-tasks — Histórico

> Extraído do `SKILL.md` para não ser pago em tokens a cada invocação. Nada aqui muda o que
> o agente gera; tudo aqui explica **por que** as regras do `SKILL.md` são como são.
> Consultar ao mexer nos validators ou ao questionar a severidade de um gate.

## Changelog

### 1.7 — 2026-10-21 (harness-elo-v2: defeitos do teste ponta a ponta)

Sete defeitos achados rodando a cadeia inteira num projeto de teste (versão em `servers[].url`,
tabelas sem prefixo, BDD no formato do template da `spec-product`). Sem subir a `version` — o
pacote já leva a 1.7. Testes que prendem: `.claude/hooks/tasks-correcoes-e2e.test.mjs` no harness,
e o novo «gatilhos do projeto em sincronia» do `templates/validate-examples.mjs`.

- **`coverageNote` reprovado pela própria skill (D33).** A skill mandava gravar «Cobre TC-NNN do
  test-plan.md», e o `NO_EXTERNAL_REFS_IN_TASKS` reprova nome de artefato de especificação em
  qualquer campo da task (6 FATAL no teste). A frase passa a ser «Cobre TC-NNN do plano de testes»
  (SKILL.md, schema e mensagem do `NO_UAT_BACKLOG`); o caminho do arquivo já vai em
  `externalReferences`. A allowlist **não** ganhou `coverageNote`: abriria a porta para «os demais
  cenários estão no test-plan.md» passar calado.
- **Gates de presença mudos por naming (D29).** `TASK_MISSING_API_CONTRACT` /
  `TASK_MISSING_PERSISTENCE_MODEL` só casavam `/vN/…` e `tb_`/`dm_`/`ft_`/`obt_`. Agora também a rota
  que existe no `api-contracts.yaml` (citada com verbo HTTP, como `"path"` de cenário ou com o
  prefixo do servidor) e a tabela que existe no `data-model.json` (`tabela <nome>`, SQL, coluna
  qualificada, nome com `_`). Rota de tela e nome de domínio em prosa não contam. O validador lê
  o contrato de `--sources`, da pasta do `tasks.json` ou da pai, com leitor próprio; o bloco de
  gatilhos é idêntico ao da lib e o `validate-examples.mjs` confere.
- **Conversor de contrato (D30).** `lib/technical-contracts.mjs` ganhou um leitor de YAML de verdade
  (o subconjunto que a `spec-api-contracts` escreve: `$ref`, coleção em linha, parâmetro no nível
  do path) e resolve `$ref` de schema, response, parameter, requestBody e securityScheme; lê o
  `security` global sem depender de `opts`. 5xx deixa de ser exigido: no gate de qualidade
  (`TASK_HAS_COMPLETE_API_SCHEMAS`) vira **aviso** — a `spec-api-contracts` não manda declarar 5xx
  por operação (o stub dela não tem nenhum), e exigir obrigava a inventar contrato. No teste, as 11
  operações do projeto e o stub da skill passaram a converter (antes: nenhuma).
- **Body exigido em todo POST (D31).** O `body` do cenário só é exigido quando a operação tem corpo
  — `Body:` no `request` do `apiContracts[]` da task, ou `requestBody` no `api-contracts.yaml`;
  sem contrato para o par, vale o verbo. Corpo vazio declarado (`"body": {}`) vale em
  `INVALID_INPUT`.
- **Story de spikes tratada como USER_STORY (D34).** Story sem `workItemType` cujas tasks são todas
  `class=spike` passa a ser `SPIKE` no `validate-tasks-business.mjs` — isenta de procedência,
  consumidor, user story e escopo de entrega, como `references/tipos-operacionais.md` diz; os gates
  estruturais (narrativa, ≥1 regra, ≥1 critério) continuam.
- **`mustImplementFirst` ignorado (D39).** É o critério 0 do `order-backlog.mjs`: a story sai em 1º
  no backlog inteiro (mesmo em outra epic), com o que ela exige por dependência; dentro da story, a
  task SEC abre a fila. A `spec-security-review` termina o Passo E rodando o order-backlog, e rodá-lo
  depois do `inject-sec.mjs` não desfaz a ordem que ele grava.
- **«ao o vendedor» nos critérios (D52).** `scenarioToStatement` montava «Quando <dado>, ao
  <quando>, …» com «ao» fixo; o «Quando» do template é oração. A frase sai «Dado que <oração>,
  quando <oração>, <oração>.», com o conector que o autor usou (`givenKeyword` do leitor).

### 1.7 — 2026-10-20 (harness-elo-v2, bifurcação nossa)

Duas mudanças do plano de melhoria das skills do harness, registradas no `MANUTENCAO.md` dele:

- **Ordem lógica e marca de regra de negócio (Onda 6).** `scripts/order-backlog.mjs` e
  `scripts/mark-business-rules.mjs` rodam no passo 13, antes dos validators; campos opcionais
  `executionOrder`, `layer`, `businessRuleHeavy`, `businessRuleShare`, `businessRuleOverride` no
  schema; três WARNING novos.
- **A marca de regra de negócio discrimina (revisão de riscos, 2026-10-21).** O critério da task
  contava como prova de RN qualquer cenário com `relatedRules[]` — e a skill põe `relatedRules` em
  todo cenário, inclusive no HAPPY_PATH: nos exemplos do kit, enabler, bug, techdebt e tela saíam
  marcados. Agora a task precisa das três coisas: trabalho de regra (fora das camadas
  `data`/`ui`/`integration` e das stories `ENABLER`/`TECHNICAL_DEBT`/`SPIKE`), `businessRules[]`
  próprio, e ≥ metade dos cenários provando RN pela categoria (`BUSINESS_RULE_VIOLATION`, ou
  `HAPPY_PATH`/`EDGE_CASE` ligado a uma RN da própria task). Nos exemplos do kit, só o
  `tasks.example-completo.json` (criar pedido validando estoque, com a RN na task) é marcado.
- **SKILL.md mais curto, sem perder regra (Onda 4).** Saíram para `references/`, lidos sob
  demanda: as duas tabelas de validators (`references/validators.md` — os scripts já devolvem o
  código e o `suggestedFix`), os tipos de demanda operacional e a task de spike
  (`references/tipos-operacionais.md`), a task de UAT legada (`references/classe-uat-legado.md`)
  e o modo `_change` (`references/modo-change.md`). O SKILL.md cita cada um com a condição de
  leitura. Todo código de validador, toda linha com FATAL/MUST/NUNCA e todo ID continuam na pasta
  da skill — conferido por `.claude/ferramentas/preservacao.mjs` no harness.

### 1.6 — 2026-09-03

Homologação sai do backlog. O `test-plan.md` deixa de gerar work items e passa a ser **só** fonte
de cenários das tasks de desenvolvimento.

- **Motivação (caso real).** Num projeto o `tasks.json` saiu com uma Story `[EPIC-ID]-VAL` por
  épica e dezenas de tasks `class=uat` ("executar testes PRINCIPAL/VALIDAÇÃO/REGRA…"). A
  `spec-estimate` somou essas tasks ao prazo e ao custo — e homologação com o cliente **não é
  acelerável por IA** (o `aiAssisted` era igual ao `manual`), então o cenário assistido ficou
  artificialmente caro e longo. Além disso, homologação é processo do cliente, não entrega de
  software: não pertence a um backlog de desenvolvimento.
- **O que o `test-plan.md` é para.** Dar contexto de teste às tasks de implementação: cada
  `TC-NNN` vira `acceptanceScenario` com `testData` concreto na task funcional que cobre o RF
  (`SCENARIOS_FROM: test-plan`, `coverageNote: "Cobre TC-NNN do test-plan.md"`), e o
  `spec-implement` automatiza esses cenários test-first. Isso já existia (§ "5.
  `acceptanceScenarios[]`") e continua igual — o que foi removido é a Story de Validação.
- **Gate novo `NO_UAT_BACKLOG` (FATAL)** em `validate-tasks-business.mjs`: reprova story com
  `testType=UAT` / `class=uat` / `generatedBy: spec-test-plan` e task `class=uat` (inclusive
  `tasks[]` na raiz). Flag `--allow-uat` só para validar artefato legado que ainda as contém.
- **Retrocompatibilidade.** A classe `uat` fica no schema `tasks/v5.3`, no
  `UAT_TASK_HAS_SUMMARY` e nas isenções dos demais validators — artefatos publicados continuam
  válidos com `--allow-uat`, e os consumidores (`spec-tasks-html`, `spec-tasks-azure`) seguem
  renderizando `testType`. O fixture negativo `tasks.fixture-validators.json` mantém `STORY-UAT`
  para provar que `UAT_TASK_HAS_SUMMARY` ainda dispara; ele agora também dispara `NO_UAT_BACKLOG`.
- Passo 14 da Ordem de execução deixa de criar stories e vira conferência do gate; a tabela de
  entradas canônicas, as classes especiais de esforço e as skills irmãs foram alinhadas.
  `spec-test-plan` 1.4 atualizada no mesmo sentido.

### 1.4 — 2026-08-13

Estimativa de esforço em horas por task, calculada **na própria spec-tasks** (bottom-up), para
ancorar a acuracidade da `spec-estimate`.

- **Motivação.** O forecast top-down da `spec-estimate` (tamanho × HDF ~3× × produto de effort
  multipliers, com headcount = esforço ÷ prazo curto) **inflava** — num projeto real sugeriu 32 devs
  onde cabiam ~5. A causa é o empilhamento multiplicativo sem âncora bottom-up. Agora cada task
  recebe uma estimativa em horas construída das **evidências concretas da própria task**
  (nº de operações de API, regras, entidades, cenários, integrações, campos de UI), que a
  `spec-estimate` consome como **cross-check** (o HDF segue primário — decisão do usuário).
- **Campo novo `effortHours`** por task (`{ manual, aiAssisted, basis }`) — `manual` é o dev humano
  na mão; `aiAssisted` é via `spec-implement` (reusa velocidade por tipo + retry 1,35 + overhead de
  revisão, os mesmos fatores já validados na `spec-estimate`). Fórmula, coeficientes e classes
  especiais (spike/uat/security) em § "Estimativa de esforço em horas (dois formatos)".
- **Rollup `metadata.effortSummary`** (hoursPerDay=8, totais em horas e dias, `byType`).
- **Validador novo `TASK_HAS_EFFORT_HOURS` (WARNING)** em `validate-tasks-selfsufficiency.mjs`:
  task `functional` sem `effortHours{manual,aiAssisted}` numéricos. WARNING (não FATAL) para não
  quebrar `tasks.json` anteriores.
- **Schema `tasks/v5.3` (aditivo):** `effortHours` em `Task` e `effortSummary` em `metadata`, ambos
  opcionais — `tasks.json` antigos continuam válidos e publicam/renderizam normalmente.
- **Passo novo 11b** na Ordem de execução (após "Cenários de teste"), e exemplo preenchido em
  `templates/tasks.example-completo.json`.

### 1.3 — 2026-08-11

Doze defeitos confirmados empiricamente contra um `tasks.json` real. Cada linha diz o que estava
errado e onde a correção vive.

- **`business-enrichment.mjs` truncado em 23 000 bytes** (instrução `export` incompleta) causava
  `SyntaxError` na importação e derrubava `validate-tasks-business.mjs` **e** `enrich-tasks.mjs` —
  nenhum validador de negócio ou de auto-suficiência jamais rodou. Export completo com as quatro
  constantes (`TECH_FLOW_PATTERN`, `TECH_SCENARIO_PATTERN`, `EXECUTION_CRITERION_PATTERN`,
  `IMPLEMENTATION_VERB_PATTERN`).
- **Contrato `name` vs. `title`.** `name` declarado como chave canônica de rótulo humano e `title`
  como alias (schema com `anyOf`); normalização defensiva `name = name ?? title ?? id` na entrada de
  **todos** os consumidores (`normalizeLabels` nos dois `lib/load-tasks.mjs`); `render-html.mjs`
  passa a cair para `title` antes do id no corpo da story — era a única exceção entre os níveis.
- **Critérios de aceite da story chegam ao ADO.** `userStoryAcceptanceCriteriaText` aceita as três
  formas (objetos `{id,statement}`, strings, legado `businessSummary.storyAcceptanceCriteria[]`);
  antes lia só a terceira e o campo `Microsoft.VSTS.Common.AcceptanceCriteria` saía vazio em 100% das
  stories. A mesma normalização foi aplicada a Epic, Feature e ao renderer HTML.
- **`traceability` como OBJETO deixa de ser descartado.** `asObjArray()` devolvia `[]` para
  não-array; agora objeto vira lista de pares chave/valor legíveis e array mantém o comportamento
  anterior — em story e task, nos dois consumidores. Bloco novo "Origem na especificação"
  (`sourceRefs[]`).
- **Epic e Feature com narrativa no ADO.** `buildEpicNarrativeHtml`/`buildFeatureNarrativeHtml`
  passam a render também `moduleScope`, `moduleCode`, `scopeBoundaries`, `containedFeatureIds`,
  `containedStoryIds`, `stakeholders`, `dependencies`, `traceability` e `sourceRefs`.
- **Builder de story lê as chaves v5.3** (`narrative`, `userStory`, `acceptanceCriteria`) mantendo
  `businessSummary` como fallback. No renderer HTML, um documento v5.0 puro perdia **todo** o negócio
  (painéis vazios): agora `businessSummary` alimenta a narrativa e os critérios.
- **Validadores executados e reportados.** `--write` nos dois scripts grava
  `metadata.fatalErrors[]` (`{code, message, scope, affectedField, suggestedFix}`) e
  `metadata.validation`; o passo 13 da ordem de execução traz os comandos literais. Novo
  **`CONSUMER_CONTRACT`** (FATAL): verifica que cada chave lida por `spec-tasks-azure` e
  `spec-tasks-html` existe **e** está na forma que eles leem — é o teste que teria pegado os quatro
  defeitos acima na origem.
- **Contradições internas resolvidas.** A isenção de `test-plan.md` para `class=uat` em
  `NO_EXTERNAL_REFS_IN_TASKS` está documentada na tabela de classes (a referência ao roteiro é
  legítima: é script de execução humana). `TASK_HAS_COMPLETE_API_SCHEMAS` opera no formato
  compact-prose (`method`, `path`, `operationId`, `auth`, `request`, `responses`, …), sem redação
  baseada em objetos aninhados.
- **UAT e SPIKE deixam de sair rasas.** `selfContainedSummary` é normativo na task de UAT
  (**`UAT_TASK_HAS_SUMMARY`**, FATAL, com os TCs cobertos nomeados); template de spike com os quatro
  campos obrigatórios (**`SPIKE_TASK_COMPLETE`**, FATAL: pergunta, timebox, critério de saída, GAP
  fechado) e exemplo canônico. `description` e `validation` deixam de divergir entre schema e prática
  — `description` alinhada **para cima** (`TASK_HAS_DESCRIPTION`, FATAL para `functional`),
  `validation` sai de `required` porque o conteúdo já é cobrado por `TASK_HAS_CONCRETE_TEST_DATA`.
- **Modo `title-only` passa a ser suportado, não tolerado.**
  `metadata.backlogHierarchy.levelDetail` (`"title-only" | "full"`, **por nível**) desativa os
  validadores de conteúdo de negócio daquele nível por contrato e registra a escolha no relatório.
  Suspender validadores em campo `x-` com prosa livre passa a ser FATAL
  (**`LEVEL_DETAIL_UNDECLARED`**). Modo por nível de propósito: o desvio real isentava Epic e Feature
  mas 44/45 stories vazaram junto, sem declaração.
- **Motor de síntese descontaminado e não-destrutivo.** Removidos **todos** os fallbacks de conteúdo
  de domínio (vinham de um projeto de licenciamento ambiental e produziam pitch idêntico e
  factualmente falso em qualquer outro domínio); sem insumo real o campo fica **ausente** e a lacuna
  vai para `metadata.enrichmentGaps[]`. Enriquecimento agora é **aditivo** (só preenche vazio, união
  em arrays, **idempotente** — 2ª execução byte-idêntica); substituir exige `--overwrite`, que
  imprime o diff do que será perdido. Gates novos: **`NARRATIVE_NOT_BOILERPLATE`** (FATAL — denylist
  + narrativa clonada entre itens do mesmo nível) e **`ENRICHMENT_NO_CONTENT_LOSS`** (bloqueia a
  gravação se qualquer array encolher ou statement desaparecer). Concordância do template corrigida:
  `"Para <ator>, <capacidade> — <oferta>"`, sem artigo nem gênero assumidos.
- **Níveis de Kanban ancorados nos documentos de origem.** Novo `lib/source-docs.mjs` lê
  `requirements.md`, `business-rules.md`, `modules.md` e `product-vision.md` e extrai por RF
  (descrição, EARS, atores, pré-condições, MoSCoW, cenários BDD) e por RN (enunciado, exceções,
  justificativa, fonte regulatória). Campo novo **`sourceRefs[]`** por nível
  (`{document, section, itemId}`) e gate **`LEVEL_GROUNDED_IN_SOURCE`** (FATAL): narrativa sem
  `sourceRef` é narrativa inventada. O passo B' deixou de ser prosa e virou
  `enrich-tasks.mjs --sources <dir>`.

**Fixtures e testes novos:** `templates/tasks.fixture-compat.json` +
`templates/test-consumer-compat.mjs` (42 asserções sobre a saída real dos três consumidores),
`templates/tasks.fixture-validators.json` (negativo — deve reprovar) e
`templates/tasks.spike-task-example.json`.

**Retrocompatibilidade.** Todo fallback legado permanece: `businessSummary`, `traceability` em array,
`acceptanceCriteria` em string, `name` sem `title`, `epic.summary`/`feat.valueProposition`. Um
`tasks.json` antigo continua publicando e renderizando — e agora renderiza **mais**, porque o
caminho legado do HTML deixou de perder o negócio.

### 1.2 — 2026-07-30

Validators de auto-suficiência implementados em `validate-tasks-selfsufficiency.mjs`; tabela canônica
única de códigos; guard de entrada não aplicável (exit 2) nos dois validadores.

---

## Erros históricos dos validators de auto-suficiência

> **Erros históricos corrigidos (não repetir):**
> 1. A especificação original usava `/(ver|consultar|ler)\s+\S*\.(yaml|json|md)\b/i` — detecção
>    por **enumeração de verbos**. Não pegava as formulações reais: *"informação completa em
>    requirements.md"*, *"detalhes no requirements.md"*, *"conforme requirements.md"*.
>    A regra correta é por **padrão de nome de arquivo + allowlist de chaves**.
> 2. A correção seguinte exagerou no sentido oposto: aceitava
>    `regras|lista|valores|critérios|descrição` + até 3 palavras + `requisitos?|especificação`
>    como ponteiro. Como "requisitos" e "regras de negócio" são expressões **correntes em
>    PT-BR**, gerava FATAL em prosa legítima — *"As regras de negócio e requisitos funcionais
>    aplicáveis…"*, *"Lista de requisitos atendidos: RF-01, RF-02"*, *"Valores permitidos
>    conforme a especificação do enum StatusProposta: ATIVO, INATIVO"*. Daí a exigência de
>    **marcador** na tabela acima. Regra geral: **um gate que reprova conteúdo correto perde a
>    autoridade para reprovar conteúdo errado.**
> 3. `TASK_SUMMARY_BOILERPLATE` era FATAL a ≥75% de similaridade. Tasks **irmãs** (mesma story)
>    ficam em 82–83% porque cada uma recarrega o contexto do RF — repetição que esta própria
>    SKILL EXIGE (auto-suficiência). Similaridade textual é proxy **fraco** para "summary
>    genérico"; passou a **WARNING**, com limiar mais alto para tasks da mesma story. O gate
>    bloqueante do conteúdo específico é `TASK_UI_HAS_FIELD_CONTRACT` + `TASK_HAS_CONCRETE_TEST_DATA`.
> 4. `TASK_UI_HAS_FIELD_CONTRACT` era FATAL para toda task `type: "frontend"` sem `uiContext` —
>    quebrava qualquer `tasks.json` de frontend anterior e exigia inventar um `tela` casando
>    `^TEL-\d{3}$` que só existe com `flow-map.md`. Hoje: FATAL quando o `uiContext` **existe** e
>    o contrato de campo está incompleto; WARNING quando o `uiContext` está ausente. O schema
>    aceita em `uiContext.tela` o `TEL-xxx` **ou** o slug da rota (contrato `screens-manifest.json`).
> 5. `TASK_HAS_CONCRETE_TEST_DATA` tratava **ausência** de `acceptanceScenarios[]` como WARNING
>    e preenchimento incompleto como FATAL — omitir era mais barato que preencher, e o requisito
>    central ("nunca só caminho feliz") ficava sem gate bloqueante. Hoje ausência é FATAL para
>    `class=functional`.
> 6. O detector de placeholder era `/\b(TODO|TBD|…)\b/i` e produziu **74 de 104** WARNINGs num
>    backlog real, **todos falsos**. Duas causas, ambas de PT-BR: `todo` é palavra corrente
>    (*"delimita **todo** o escopo"*) e `\b` não vê acento como letra — sem a flag `u`, `é` é
>    caractere não-word, então `\btodo\b` casa o "todo" dentro de *"mé|todo"* (**método**). Hoje
>    exige-se forma de placeholder real: `TODO`/`FIXME`/`XXX`/`HACK` **em maiúsculas** e seguidos
>    de marca de anotação (`:`, `(`, `!`, ` - `) ou isolados como token, `TBD` em maiúsculas, e as
>    formas PT-BR sem homônimo (`A DEFINIR`, `A SER DEFINIDO`, `PREENCHER`, `COMPLETAR AQUI`,
>    `LOREM IPSUM`). Mesma lição do item 2: **um gate que reprova conteúdo correto perde a
>    autoridade para reprovar conteúdo errado.**
> 7. `SQL_TYPE_PATTERN` era Postgres-cêntrico e não incluía **`NUMBER`**, o tipo numérico
>    canônico do **Oracle** — reprovou 65 de 132 segmentos de coluna corretos num data-model
>    Oracle. Hoje a lista cobre também `NUMBER`/`NUMBER(p,s)`, `VARCHAR2`, `NVARCHAR2`, `NCLOB`,
>    `RAW`, `LONG`, `BINARY_FLOAT`, `BINARY_DOUBLE` e `INTERVAL`. Regra: **o tipo certo é o do
>    banco do projeto — quem cede é o validador, nunca o artefato.** Não reescrever
>    `NUMBER(19)` para agradar regex.

---

## Renomeações de código de validator (2026-07)

**Renomeações (2026-07) — o nome do código é o que o script emite.** A tabela anterior declarava
códigos por nível que o script emite **sem** prefixo de nível (um único check serve Epic, Feature e
Story). Ficou um nome na SKILL e outro no relatório. Correspondência para quem tem relatório antigo:

| Nome antigo (só na SKILL) | Código emitido hoje |
|---------------------------|---------------------|
| `STORY_HAS_NARRATIVE`, `EPIC_HAS_NARRATIVE` | `NARRATIVE_CONTEXT` (+ `NARRATIVE_ELEVATOR_PITCH`) |
| `STORY_HAS_BUSINESS_RULES`, `EPIC_HAS_BUSINESS_RULES` | `HAS_BUSINESS_RULES` (+ `RULE_NOT_OBJECT`, `RULE_DESCRIPTION`) |
| `STORY_HAS_ACCEPTANCE_CRITERIA`, `EPIC_HAS_ACCEPTANCE_CRITERIA`, `FEATURE_HAS_AC` | `HAS_ACCEPTANCE_CRITERIA` (+ `CRITERION_STATEMENT`, `CRITERION_BDD_FORBIDDEN`) |
| `STORY_HAS_SCENARIOS` | `STORY_NO_SCENARIOS` (WARNING; o gate FATAL é por task) |

---

## Por que presença de contrato virou gate duro (medição da v1.3)

Até a v1.3 esta seção dizia "`apiContracts`/`persistenceModel` **quando houver** API/dados".
Critério subjetivo não é gate: quem decide se "houve" API é o próprio gerador, e ele decidiu que
não havia. Medição em backlog real (39 tasks funcionais): **18** citavam uma rota literal sem
`apiContracts`, **27** citavam uma tabela física sem `persistenceModel`, e **0 das 15** tasks
`type:"frontend"` tinham contrato — embora 11 delas chamassem endpoints. O validador saiu com
**exit 0 e nenhum FATAL**, porque `TASK_HAS_COMPLETE_API_SCHEMAS` e
`TASK_HAS_COMPLETE_DATA_MODEL` só olham o campo **já preenchido**.

---

## Por que `--write` existe

> **Por que `--write` existe.** A SKILL declarava "qualquer validator FATAL ativo bloqueia a emissão
> do `tasks.json`; emitir `fatalErrors[]` em `metadata`" — e **nenhum script escrevia o campo**. Num
> artefato real `metadata.fatalErrors` estava simplesmente ausente, o que é indistinguível de
> "passou". Com `metadata.validation` presente, a ausência de `fatalErrors` passa a significar
> **"validado e limpo"**; a ausência dos dois significa **"nunca validado"**.
