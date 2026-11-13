# spec-tasks-html — Histórico

> Extraído do `SKILL.md`: changelog é contexto de manutenção e era relido a cada
> invocação sem alterar a saída.

## Changelog

### 6.3 — 2026-10-20 (harness-elo-v2, bifurcação nossa)

Ordem lógica e marca de regra de negócio (plano de melhoria das skills, Onda 6), lidas da
`spec-tasks` ≥ 1.7: epics, features, stories e tasks na ordem de `executionOrder`
(`porOrdemDeExecucao`; sem o campo, a ordem do array), selo `#N` em cada cartão, selo «Regra de
negócio» no item com `businessRuleHeavy` e o filtro `#filtro-regra`, que esconde `data-regra="nao"`
— item marcado e todo pai de item marcado ficam `data-regra="sim"`. Sem a marca no backlog, o
relatório sai como antes. Teste: `.claude/hooks/tasks-html-ordem-marca.test.mjs` (harness).

### 5.1 — 2026-08-11

Correções de **contrato de leitura**. O caso mais grave: um `tasks.json` no formato v5.0 (só
`businessSummary`, sem `narrative`) renderizava com **todos** os painéis de negócio vazios — o mesmo
documento publicava com negócio no ADO e sem negócio no HTML.

- **Narrativa legado** — `renderStoryBizPanels` passa a cair para `businessSummary` (problema, valor
  entregue, atores, fluxo) quando a story não tem `narrative`. Antes, documento v5.0 perdia todo o
  conteúdo de negócio no relatório.
- **Critérios de aceite** — `renderAcceptanceCriteriaInner` aceita critério em **string** (antes
  `asObjArray()` os descartava e o painel aparecia vazio) e cai para o legado
  `businessSummary.storyAcceptanceCriteria[]` quando `acceptanceCriteria[]` está ausente. Strings no
  formato `"AC-X-01 — texto"` têm o id separado do enunciado.
- **`name` vs. `title`** — `lib/load-tasks.mjs` normaliza `name = name ?? title ?? id` na entrada; e
  `renderStoryCard` passa a cair para `title` antes do id. A story era o **único** nível sem esse
  fallback: o corpo mostrava só o ID enquanto a sidebar mostrava o título por outro caminho, o que
  tornava o defeito difícil de notar.
- **`traceability` como objeto** — `asObjArray()` devolvia `[]` para não-array e o painel
  simplesmente não aparecia (o schema emite objeto). Agora objeto → pares chave/valor com rótulos
  legíveis; array → comportamento anterior. Vale para story e task.
- **Painel novo** — "Origem na especificação" (`sourceRefs[]`: `{document, section, itemId}`), que
  liga o cartão de volta ao `requirements.md` / `business-rules.md` que o originou.

**Teste de regressão:** `spec-tasks/templates/test-consumer-compat.mjs` roda `renderTasksHtml` sobre
`tasks.fixture-compat.json` e afirma que toda forma de cada chave divergente aparece na saída.

```bash
node <skills>/spec-tasks/templates/test-consumer-compat.mjs
```

### 6.1 — 2026-08-12

Duas perdas de conteúdo, das quais a primeira apagava um nível inteiro do backlog.

- **Nível Feature renderizado (era ignorado).** `lib/render-html.mjs` lia `doc.epics[]` e
  `doc.stories[]` e passava por cima de `doc.features[]`; o `cli.mjs` emitia um aviso em stderr e
  seguia em frente. Num backlog real com **1 Epic + 9 Features**, o relatório saía com as 36
  stories achatadas num único cartão e **sem os 9 blocos de negócio de módulo** — 130 regras de
  negócio e 96 critérios de aceite que existiam no `tasks.json` e não chegavam ao leitor. O
  contorno usado era uma projeção externa mapeando Feature→Epic, que deixa de ser necessária.
  Agora: cartão de Feature com os mesmos painéis do Epic (narrativa, critérios, regras) mais
  pontos de contato, dependências, rastreabilidade e "Origem na especificação"; árvore da barra
  lateral em quatro níveis; âncora `#feature-<id>`.
- **Rótulo de narrativa sensível ao nível.** Era a string fixa "Narrativa do épico", que faria o
  cartão de módulo anunciar-se como épico. Epic → "Narrativa do épico"; Feature → "Narrativa da
  feature".
- **Rótulo da cadeia na barra lateral** vem de `metadata.backlogHierarchy.chosen`, filtrado por
  presença real no JSON — não de uma string fixa.
- **Três campos de entidade que sumiam no HTML.** `renderPersistenceModelV52` lia uma lista fechada
  de chaves: `uniqueConstraints`, `checkConstraints` e `migrationNotes` eram descartados sem aviso.
  Medido no mesmo backlog: `migrationNotes` em **16/16** entidades, `checkConstraints` em **5/16**,
  `uniqueConstraints` em **1/16**. São o que decide se a migração sai certa — unicidade define
  conflito, check define domínio válido, nota de migração diz se a tabela é para criar, alterar ou
  só ler. Cada bloco aparece depois de "Índices", e só com conteúdo. Aceita string compact-prose e
  array de strings.
- **`apiContracts[].tags`** (presente em **24/24** operações, nunca renderizado) sai como pills no
  cabeçalho do cartão de API. Aceita array e string separada por pipe.
- **Rede contra a repetição do defeito.** Os dois renderers comparam `Object.keys(objeto)` com as
  chaves que realmente consomem; chave presente, não vazia e não consumida gera aviso em stderr
  pelo `cli.mjs` — `WARN_UNRENDERED_KEY`. O silêncio total foi o que fez esses campos passarem
  meses sem ninguém notar.

**Retrocompatibilidade verificada:** documento **sem** `features[]` renderiza com markup **byte a
byte idêntico** à v6.0 (Epic→Story→Task, flat Story→Task e o fixture legado), e o CSS é
estritamente aditivo — nenhuma regra existente alterada. O caminho antigo
(`renderEpicsWithStories`) permanece intacto; o novo (`renderEpicsWithFeatures`) só é escolhido
quando há `features[]`. As adições da lista acima (tags e os três blocos de entidade) mudam a
saída de propósito, em qualquer hierarquia: são justamente os campos que antes desapareciam.

**Casos degenerados cobertos por teste:** Epic sem Feature (stories direto no épico), Feature sem
Epic (bloco próprio, stories preservadas), story com `featureId` inexistente e story sem
`featureId` em documento com features — nenhuma dessas cai em "Stories sem Epic" por engano; só
cai quem não tem vínculo nenhum.
