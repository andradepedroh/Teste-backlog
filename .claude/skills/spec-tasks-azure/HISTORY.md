# spec-tasks-azure — Histórico

> Extraído do `SKILL.md`: changelog é contexto de manutenção e era relido a cada
> invocação sem alterar a saída.

## Changelog

### 3.4 — 2026-10-20 (harness-elo-v2, bifurcação nossa)

**Simular antes de publicar.** O CLI publicava direto, sem mostrar antes o que ia criar — e work
item criado não se apaga com um comando. A `security.md` do harness (Camada J) exige confirmação
humana antes de escrita irreversível, e confirmação só vale se a pessoa viu o que vai acontecer.

- **`--dry-run`** (`lib/publish-plan.mjs`, novo): monta, só a partir do `tasks.json`, a lista do que
  a publicação faria — nível, WIT, título, pai, tags, ação (criar / atualizar / criar ou atualizar /
  já existe / não publicar) e, no modo `_change`, os links `Related`. Não carrega o
  `azureDevopsService.js`, não lê o PAT e não chama `fetch`. O gate de auto-suficiência roda antes,
  como na publicação. JSON no stdout, resumo legível no stderr.
- O `cli.mjs` passou a carregar o `azureDevopsService.js` por `import()` dinâmico, só no caminho
  de publicação. Sem a flag, o comportamento é o de antes.
- O `SKILL.md` manda simular, mostrar o resumo e só publicar depois de um "sim" explícito
  (`PUBLISH_CONFIRMED`, FATAL).

**Teste:** `.claude/hooks/tasks-azure-dry-run.test.mjs` (harness) — prova que o dry-run não toca
serviço nem rede e que a lista de «criar» bate, em ordem, WIT, título, pai e tags, com o que o
`createFullStructure` envia de verdade (com `fetch` falso). Mudou a lógica de criação no serviço,
o teste de paridade fica vermelho até o `publish-plan.mjs` acompanhar.

**Ordem lógica e marca de regra de negócio (mesma versão; plano de melhoria das skills, Onda 6).**
Lidos da `spec-tasks` ≥ 1.7:

- criação na ordem de `executionOrder` (`porOrdemDeExecucao`), nos dois modos;
- `Microsoft.VSTS.Common.StackRank` = `executionOrder` na criação; processo sem o campo → aviso uma
  vez e segue sem ele (`createWorkItem` repete sem o campo); no upsert, só com `--reordenar`;
- `dependencies[]`/`dependsOn[]` → link `System.LinkTypes.Dependency-Reverse` (Predecessora), num
  segundo passo depois que todos os itens têm ID; no `_change`, sem duplicar (`getLinkedIds`);
- tag `regra-de-negocio` (ou `metadata.azureDevOps.businessRuleTag`) em item com
  `businessRuleHeavy: true`; no `_change`, item desmarcado perde só essa tag
  (`updateWorkItemMergingTags` com `removeTags`).

O `publish-plan.mjs` espelha tudo (`stackRank`, `stackRankNaAtualizacao`, `dependencias`,
`tagsRemovidasNaAtualizacao`), e o teste de paridade agora confere também StackRank e links.

**Revisão de riscos da Onda 6 (mesma versão, 2026-10-21).** Três defeitos do que entrou acima:

- **StackRank 1…N jogava tudo para o topo.** Num projeto com backlog, o item criado com StackRank =
  `executionOrder` passava à frente de tudo; no `_change` os novos se intercalavam com os antigos; o
  `--reordenar` regravava 1…k e colidia com o resto. Agora: na criação, StackRank = maior já
  existente no projeto (`maiorStackRank`: WIQL `ORDER BY … DESC` + leitura em lote, uma vez, antes
  de criar) + `executionOrder`; leitura falhou → sem StackRank, com aviso
  (`STACKRANK_BASE_UNREADABLE`), nunca no topo. O `--reordenar` permuta os StackRank que os itens
  já têm (por nível; `lerStackRanks`); item sem StackRank vai para depois do maior. No plano do
  `--dry-run`, `stackRank` virou `stackRankSoma` («maior existente + N») e `stackRankNaAtualizacao`
  virou `{ regra: 'permuta', posicao }`.
- **O PATCH não tinha o fallback do processo sem StackRank.** O `--reordenar` num projeto Scrum
  perdia a story inteira (TF51535, 400) e as tasks dela nem eram tentadas. `updateWorkItem` agora
  repete sem o campo, com o mesmo aviso único da criação (`desligarStackRank`).
- **A tag saía de item que a ferramenta nunca marcou.** Todo item com `businessRuleHeavy: false`
  perdia a tag a cada republicação, inclusive a posta à mão pelo time, e a comparação diferenciava
  maiúsculas (o ADO reaproveita a grafia da primeira tag criada). Agora a tag só sai de item que
  está no registro `ado-marcas-regra.json` (`lib/marcas-regra.mjs`, novo), gravado ao lado do
  `tasks.json` em toda criação ou atualização que pôs a tag; somar e tirar ignoram a caixa e a
  grafia que já está no item fica.

### 3.2 — 2026-08-11

Correções de **contrato de leitura**: o publicador lia chaves que o schema atual não emite, e o
conteúdo saía vazio no work item **sem nenhum erro na publicação** — o único jeito de notar era abrir
o item no ADO. Todos os fallbacks legados foram mantidos.

- **`name` vs. `title`** — `lib/load-tasks.mjs` normaliza `name = name ?? title ?? id` em `epics[]`,
  `features[]` e `stories[]` na **entrada**, uma vez, em vez de espalhar `?? title` por dezenas de
  pontos de render. Antes, uma story que trazia só `title` publicava como `"US-ACESSO-01:
  US-ACESSO-01"`.
- **Critérios de aceite da story** — `userStoryAcceptanceCriteriaText` aceita as três formas:
  `acceptanceCriteria[]` de objetos `{id, statement}` (canônico v5.3, com o `id` como prefixo),
  `acceptanceCriteria[]` de strings, e o legado `businessSummary.storyAcceptanceCriteria[]`. Lia
  **só** a terceira: o campo `Microsoft.VSTS.Common.AcceptanceCriteria` saía vazio em 100% das
  stories, mesmo com critérios bem escritos no JSON. Retorna `undefined` só quando as três estão
  vazias (o campo não é enviado, em vez de ser enviado em branco).
- **`traceability` como objeto** — `asObjArray()` devolvia `[]` para qualquer valor não-array, e o
  schema emite `traceability` como **objeto** (`{rf, productRequirement}` na story;
  `{sourceStoryIds, sourceTaskIds}` após o enriquecimento). A rastreabilidade era descartada em
  silêncio, em story **e** em task. Agora: objeto → lista de pares chave/valor com rótulos legíveis;
  array → comportamento anterior preservado.
- **Blocos novos** — `sourceRefs[]` ("Origem na especificação") em story, Epic e Feature; em Epic:
  `moduleScope`, `scopeBoundaries`, `containedFeatureIds`, `containedStoryIds`, `stakeholders`,
  `dependencies`; em Feature: `moduleCode`, `containedStoryIds`, `dependencies`. Critérios de Epic e
  Feature também aceitam a forma string.

**Teste de regressão:** `spec-tasks/templates/test-consumer-compat.mjs` roda os builders reais deste
pacote sobre `tasks.fixture-compat.json` e afirma que **toda** forma de cada chave divergente produz
saída legível — nenhuma cai em branco.

```bash
node <skills>/spec-tasks/templates/test-consumer-compat.mjs
```
