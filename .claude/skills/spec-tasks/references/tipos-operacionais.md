# spec-tasks — tipos de demanda operacional e task de spike

> Lido sob demanda a partir do `SKILL.md`: ao classificar uma story como `ENABLER`, `SPIKE`,
> `TECHNICAL_DEBT` ou `BUG`, e ao gerar task `class=spike`.

### Conteúdo da narrativa por tipo (o que preencher em `narrative`)

A **Story** continua usando os mesmos campos de `narrative` (§ "Narrativa (`narrative`) —
híbrida"), mas o conteúdo de cada campo muda com o `workItemType`. Mapeamento — Descrição
esperada (EloCore § 4) → campos do schema:

| Tipo | `elevatorPitch` / `context` | `problem` | `deliveredValue` | Campo estruturado adicional |
|------|------------------------------|-----------|-------------------|-------------------------------|
| `USER_STORY` | Ator, capacidade, dor, proposta (formato "Como/Quero/Para") | Dor de negócio atual | Valor entregue ao usuário | `userStory {asA, iWant, soThat}` |
| `ENABLER` | O que deve ser implementado, configurado ou estruturado | Limitação/risco que existe sem o enabler | Benefício técnico ou operacional obtido | — (narrativa basta; `userStory` fica de fora) |
| `SPIKE` | Qual dúvida, risco ou incerteza precisa ser esclarecida | Risco de decidir/desenhar sem a investigação | Resultado que a investigação produz (aprendizado/recomendação/decisão) | `spikeDetails {question, timebox, expectedOutcome}` |
| `TECHNICAL_DEBT` | Qual limitação técnica existe hoje | Impactos que a limitação causa hoje (qualidade, performance, segurança, manutenibilidade) | O que melhora após o tratamento | `technicalDebtDetails {limitation, currentImpact, improvementAfterFix}` |
| `BUG` | Qual comportamento incorreto foi observado | Como reproduzir + resultado atual | Resultado esperado depois da correção | `bugReport {observedBehavior, reproductionSteps[], currentResult, expectedResult}` |

> **Auto-suficiência:** os campos estruturados (`spikeDetails`, `technicalDebtDetails`,
> `bugReport`) são **complemento**, não substituto de `narrative` — preencher os dois. O texto de
> `narrative.elevatorPitch`/`context` sempre precisa ≥120/≥200 chars (validators
> `NARRATIVE_ELEVATOR_PITCH`/`NARRATIVE_CONTEXT` continuam ativos para todos os tipos).

### Isenções de validators para tipos técnicos

`ENABLER`, `SPIKE`, `TECHNICAL_DEBT` e `BUG` são, por natureza, descritos em linguagem técnica
("implementar", "configurar", "investigar viabilidade", "limitação técnica") — o mesmo motivo
pelo qual `class: security`/`uat` já são isentos. `validate-tasks-business.mjs` reconhece
`story.workItemType` e isenta esses quatro tipos de `NARRATIVE_TECHNICAL_TERM`,
`MAINFLOW_TECHNICAL_TERM`, `RULE_TECHNICAL`, `CRITERION_TECHNICAL`, `CRITERION_EXECUTION` e
`STORY_HAS_DELIVERY_SCOPE` (mesma lista de isenções de `security`/`uat` — ver § "Classes de task e
validators aplicáveis"). Também isenta `STORY_HAS_USER_STORY`: o formato de persona
"Como/Quero/Para" é específico de `USER_STORY` e não é natural para os demais tipos. Os
validators **estruturais** (narrativa presente, `businessRules[]`/`acceptanceCriteria[]` com
`≥1` item bem formado) continuam ativos para todos os tipos — só a checagem de *linguagem de
negócio* é isenta.

**SPIKE sem `workItemType` declarado.** Story sem `workItemType` cujas tasks são todas `class=spike`
é tratada como `SPIKE` — ela só investiga, não entrega capacidade ao usuário. Antes disso ela caía
como `USER_STORY` e tomava FATAL de procedência (`LEVEL_GROUNDED_IN_SOURCE`), de consumidor
(`CONSUMER_CONTRACT` de narrativa/regras/critérios/prioridade), de user story e de escopo de entrega
(D34 do teste ponta a ponta). `workItemType: "USER_STORY"` explícito é decisão do autor e não é
reinterpretado. A regra de negócio do SPIKE pode ser a RN que a investigação destrava (com
`sourceTaskIds[]` apontando o spike), e o critério, a decisão que precisa sair dela.

### Posicionamento hierárquico do Enabler (EloCore § 1.5)

O Enabler é sempre da **camada operacional**, mas pode ocupar dois níveis diferentes na
hierarquia, dependendo do alcance:

- **Enabler de nível 3** (comum): serve apenas às demandas de uma Feature — entra em `stories[]`
  com `workItemType: "ENABLER"` e `featureId` apontando para a Feature, igual a qualquer Story.
- **Enabler de nível 2** (habilita várias Features): quando o trabalho é comum a mais de uma
  Feature do mesmo Épico, o Enabler é **filho direto do Épico** — entra em `features[]` (não em
  `stories[]`) com `workItemType: "ENABLER"` e `epicId` apontando para o Épico. Estruturalmente é
  tratado como uma Feature (contém `stories[]`/`tasks[]` próprias), mas semanticamente é uma
  demanda operacional, não uma entrega tática homologável por negócio.

Regra de decisão: "este trabalho prepara terreno para **uma** Feature, ou para **mais de uma**
Feature do mesmo Épico?" — uma resposta única → nível 3; mais de uma → nível 2.

### Mapeamento para Azure DevOps

Sem `azureTemplate`, `spec-tasks-azure`/`enrich-tasks.mjs` preenchem `adoWorkItemType` com o
rótulo default de cada tipo: `Enabler`, `Spike`, `Technical Debt`, `Bug`. Com `azureTemplate`
(§ "Entrada opcional — Template Azure DevOps"), o nome real do WIT do processo (ex.: `Feature`
para times que modelam Enabler de nível 2 como um WIT `Feature`, quando o processo não tem um
WIT `Enabler` dedicado) prevalece — ver `scripts/lib/azure-template.mjs` →
`OPERATIONAL_WIT_ALIASES`.

**Exemplo:** [`templates/tasks.operational-types-example.json`](./templates/tasks.operational-types-example.json).

### Task de SPIKE — investigação com timebox

Um spike é definido por **quatro** coisas, e as quatro são obrigatórias — sem elas não é
investigação delimitada, é item aberto no board. Esqueleto:

```json
{
  "id": "SPIKE-001",
  "storyId": "STORY-XXX-01",
  "class": "spike",
  "type": "documentation",
  "title": "Spike — <o que precisa ser decidido>",
  "durationEstimatedDays": 2,
  "description": "<o que é desconhecido hoje, por que bloqueia a decomposição e o que a investigação vai produzir — ≥80 chars>",
  "spike": {
    "question": "<pergunta FECHADA, respondível ao fim do timebox — pergunta aberta produz spike sem fim>",
    "timeboxDays": 2,
    "exitCriteria": [
      "<o que precisa estar DECIDIDO ao final — não 'pesquisado' — e onde a decisão fica registrada>",
      "<a evidência que sustenta a decisão, e onde fica anexada>"
    ],
    "closesGapId": "GAP-NNN",
    "findings": ""
  },
  "agentExecutionContext": {
    "selfContainedSummary": "<escopo da investigação, onde registrar o resultado, e o que fazer se o timebox terminar sem resposta>",
    "minimumOutputToDeliver": ["spike.findings preenchido", "decisão registrada na rule do projeto", "GAP-NNN fechado citando este work item"]
  }
}
```

Gate **`SPIKE_TASK_COMPLETE` (FATAL)**: `description` ≥80 chars · `spike.question` ≥20 chars ·
`spike.timeboxDays` > 0 (WARNING acima de 5 dias — spike longo costuma ser entrega disfarçada) ·
`spike.exitCriteria[]` ≥1 · `spike.closesGapId`. Exemplo completo:
[`templates/tasks.spike-task-example.json`](./templates/tasks.spike-task-example.json).
