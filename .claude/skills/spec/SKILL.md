---
name: spec
description: >
  Orquestrador do discovery (Fases 1–6). Começa por um enquadramento opcional (spec-frame, Fase 1) quando o material é pobre ou o problema é difuso, e executa spec-ingest → spec-legacy (sempre roda; sem legado grava apenas o skip) → spec-benchmark, seguido de documentação-primeiro ou protótipo-primeiro (spec-prototype ↔ spec-product) e spec-iterate. Gera até 16 artefatos em outputs/spec/ — do frame e context-map ao product-requirements e flow-map (gate FATAL FLOWMAP_VALID para produtos com UI), incluindo AS-IS de legado (12 dimensões), threat-model (STRIDE), benchmark, gaps + sync-log e, opcionalmente, prototype e spec-report → HTML. Não gera backlog ADO; o escopo termina na definição do produto. Use para /spec, discovery, enquadramento, levantamento, análise de legado, benchmark, threat model, arquitetura AS-IS e especificação de produtos.
version: "1.4"
updated: "2026-10-20"
---

# spec — Orquestrador de Discovery

## Papel

Coordena o processo completo de discovery e especificação de produto, garantindo que cada etapa produz **profundidade de negócio real** — não esqueletos.

**Escopo deste repositório:** definição de produto (até `product-requirements.md`). Planejamento técnico do TO-BE (arquitetura nova, threat-model do TO-BE, deep RNF técnicos, geração de backlog, scaffold e implementação) é **fase posterior** — cadeia técnica Fases 6.5-11 via `spec-tech-rules` → `spec-hld` (desenho TO-BE) → `spec-data-model` … `spec-implement`.

**De onde ele parte, neste harness:** quando `outputs/explore/` traz o pré-projeto do Explore, os
documentos — `hld-funcional.md`, `especificacao-funcional.md`, `especificacao-tecnica.md`,
`gaps.md` e, quando houver, `modelo-de-dados.md` — mais o protótipo são o **pacote de fontes** da
`spec-ingest`. O orquestrador **não repete o pré-projeto**: ele o ingere. Como a ingestão os lê, e
como a coluna Âncora os cita, está em `.claude/rules/harness/plan.md`.

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

Vale para o que você escreve no chat durante o kickoff, para o texto de cada gate e para o resumo de cada etapa. Cada skill que este orquestrador invoca herda esta régua — se uma delas devolver texto em jargão, aponte isso antes de seguir para a etapa seguinte.

## Passo 0 — Kickoff obrigatório

### Pré-kickoff: classificar o que está em inputs/ ANTES de responder a pergunta 1

Se `inputs/` contiver arquivos, classificar cada um antes de formular as perguntas. A classificação define a resposta correta à pergunta 1 — não o usuário isoladamente.

| Sinal no arquivo | Classificação | Consequência |
|-----------------|---------------|--------------|
| Código React/Vue/Angular sem backend real (sem servidor, sem migrações de DB) | **Protótipo de validação** | → NÃO conta como legado. Usar `spec-prototype` após benchmark. |
| Arquivos `mock*.ts`, `data.json`, seed files, in-memory state, `localStorage` como "banco" | **Protótipo de validação** | → NÃO conta como legado. |
| Figma exports, screenshots, HTML estático, wireframes | **Insumo visual** | → NÃO conta como legado. Tratar em `spec-ingest` como fonte visual. |
| Schema SQL / migrações / DDL com dados reais ou histórico de uso | **Sistema legado** | → Conta como legado. Kickoff = Sim. |
| Código de servidor (Express, Django, Spring, etc.) com conexão a DB real | **Sistema legado** | → Conta como legado. Kickoff = Sim. |
| Planilhas, e-mails, PDFs de processo, fluxogramas de operação atual | **Processo manual (legado parcial)** | → Kickoff = Parcial. |
| Documentos normativos, ERS, SRS, leis, regulamentos | **Insumo normativo** | → NÃO conta como legado. Usar em `spec-ingest` como fonte documental. |
| Documentação existente do produto (RFs já escritos, visão anterior) | **Insumo documental** | → NÃO conta como legado. Usar em `spec-ingest`; divergências com protótipo → `spec-iterate`. |

**Regra de ouro:** código de protótipo gerado para validação UX/negócio (mesmo que complexo) **não é legado**. Legado é sistema que esteve ou está em operação com dados reais de usuários reais.

Só depois desta classificação, fazer as três perguntas ao usuário:

```
1. Existe sistema ou processo legado a documentar?
   [ ] Sim — há sistema(s), código, DDL, fluxos ou processos formais a analisar
   [ ] Não — produto novo sem legado digital nem processo formalizado
   [ ] Parcial — há processos manuais (planilhas, e-mails, WhatsApp) mas sem sistema digital

2. Depois do benchmark, qual ramo?
   [ ] Documentação primeiro — spec-product → [spec-prototype opcional] → spec-iterate
   [ ] Protótipo primeiro — spec-prototype → spec-product → spec-iterate

3. Há arquivos em inputs/ para analisar?
   [ ] Sim — liste ou confirme o que está lá
   [ ] Não — vou colar texto/contexto no chat
```

Apresentar ao usuário a classificação feita antes de aguardar resposta. Exemplo: *"Identifiquei em `inputs/` o seguinte: `src/` = protótipo React (não conta como legado), `norma-exemplo.pdf` = insumo normativo. Com base nisso, sugiro resposta 1 = Não. Confirma?"*

**Protótipo já existente (Figma, URL, src/)** não altera a sequência base: colocar exports/código/links em `inputs/` e usar `spec-ingest` com fontes visuais; depois do benchmark, usar **`spec-prototype`** (modo Documentar / Análise) antes ou depois de `spec-product` conforme o ramo escolhido.

### Enquadramento opcional antes da ingestão — spec-frame (Fase 1)

Antes de rodar o `spec-ingest`, avaliar a **maturidade do material**. Quando o pedido ainda é difuso
ou o material é pobre, oferecer o **`spec-frame`** (Fase 1): ele enquadra o problema, levanta
hipóteses (`HIP-xxx`) e monta o plano de levantamento (`PRB-xxx`); o `frame.md` que ele gera vira uma
**fonte** do `spec-ingest`. Quando o material já é rico (problema, atores e pedidos claros), pular
direto para o `spec-ingest` — o próprio `spec-frame` se declara desnecessário nesse caso. É opcional
e **não** substitui a ingestão: hipótese (`HIP`) do frame vira inferência/questão no `spec-ingest`;
só `FATO` com âncora vira `F-xxx`.

Após resposta, mostrar o plano de execução antes de começar:

### Plano com legado (respostas 1 = Sim ou Parcial)

```
Plano para este projeto — sequência base + legado:
  Fase 1 (opcional): spec-frame → outputs/spec/frame.md (enquadramento + hipóteses + plano de levantamento)
                               Só quando o material é pobre/o problema é difuso; material rico pula.
  Fase 2: spec-ingest       → outputs/spec/context-map.md
                               outputs/spec/discovery-document.md (8 seções)
  Fase 3: spec-legacy       → outputs/spec/legacy.md (AS-IS por domínio, 12 dimensões)
                               outputs/spec/architecture.md (AS-IS apenas, Mermaid C2)
                               outputs/spec/legacy-analysis.md (scorecard + Reuse/Replace/Retire)
                               outputs/spec/threat-model.md (STRIDE do AS-IS)
  Fase 4: spec-benchmark    → outputs/spec/benchmark.md (mercado + concorrentes + pesquisa web)

  Depois — ramo escolhido:
  Ramo A (doc primeiro): spec-product → [spec-prototype opcional + src/] → spec-iterate
  Ramo B (proto primeiro): spec-prototype [+ src/] → spec-product → spec-iterate

  Sempre ao fechar ciclo: spec-iterate → outputs/spec/gaps.md + outputs/spec/sync-log.md

Confirma?
```

### Plano sem legado (resposta 1 = Não)

```
Plano para este projeto — sem inventário AS-IS (spec-legacy):
  Fase 1 (opcional): spec-frame → outputs/spec/frame.md (enquadramento + hipóteses + plano de levantamento)
                               Só quando o material é pobre/o problema é difuso; material rico pula.
  Fase 2: spec-ingest       → outputs/spec/context-map.md
                               outputs/spec/discovery-document.md (8 seções)
  Fase 3: spec-legacy       → APENAS outputs/spec/legacy.md (arquivo curto "skipped",
                               template legacy-sem-legado.md — PARAR a skill aqui)
                               NÃO gerar architecture.md, legacy-analysis.md, threat-model.md
  Fase 4: spec-benchmark    → outputs/spec/benchmark.md

  Depois — ramo escolhido:
  Ramo A (doc primeiro): spec-product → [spec-prototype opcional + src/] → spec-iterate
  Ramo B (proto primeiro): spec-prototype [+ src/] → spec-product → spec-iterate

  Sempre ao fechar ciclo: spec-iterate → outputs/spec/gaps.md + outputs/spec/sync-log.md

  Nota: business-rules.md sem seção "sistema legado"; apenas normas/regras do novo produto +
        referências regulatórias quando necessário.
  Protótipo em inputs/ NÃO é legado — é validação de intenção (ver spec-ingest).

Confirma?
```

### Persistir o kickoff (obrigatório antes de invocar spec-ingest)

Ao final deste Passo 0, com o plano confirmado, gravar a **primeira linha da Seção A** de `outputs/spec/sync-log.md` (criar o arquivo a partir de `spec-iterate/templates/sync-log.md` se ainda não existir), conforme `../tools/references/task-pipeline.md` §4:

```
kickoff: legado=<Sim|Parcial|Não> · ramo=<A|B> · ambiente=<cursor|claude|kiro|ambos> · inputs=<lista>
```

**De onde vem o `ambiente=`** — as três perguntas acima não o coletam, e não precisam: ele é a
ferramenta que vai ler as rules do projeto, e o `harness.json` da raiz já diz qual é, no campo
`runtime.rotulo`. Derivar sem perguntar:

- começa com `Claude` → `claude`
- começa com `Cursor` → `cursor`
- começa com `Kiro` → `kiro`

Sem `harness.json` (o kit usado fora do harness), perguntar junto com as outras três: *"4. Em que
ferramenta as rules do projeto vão ser lidas? cursor · claude · kiro · ambos (cursor e claude)"*.

Skills seguintes leem essa linha no início da própria execução e **só perguntam de novo** se a informação estiver ausente.

---

## Ciclo de vida do discovery — visão geral

O fluxo tem **dois momentos distintos** (não confundir com as Fases numeradas do pipeline —
«Fase 2» é `spec-ingest` e «Fase 3» é `spec-legacy`; ver `../tools/references/task-pipeline.md` §1):

### Momento 1 — Discovery inicial (roda uma vez)

```
spec (kickoff)
  ↓
[spec-frame] → spec-ingest → [spec-legacy] → spec-benchmark
  ↓
spec-product (Ramo A ou B)
  ↓
spec-iterate (primeira auditoria)
```

`spec-frame` entre colchetes é opcional: roda quando o material é pobre/o problema é difuso e
alimenta o `spec-ingest` com o `frame.md`. Material rico entra direto no `spec-ingest`.

### Momento 2 — Iteração contínua (repete quantas vezes precisar)

Toda vez que chega nova informação (ata, transcrição, decisão, documento):

```
nova fonte → spec-ingest (modo delta) → spec-iterate → propagar cirurgicamente
```

`spec-product` **não é rerrodado** neste ciclo — só se `spec-iterate` detectar GAP com tag `⚠️ REQUER spec-product` (mudança estrutural: novo módulo, virada de escopo, nova persona principal).

**Por que isso importa:** `spec-product` gera 6 artefatos grandes (incluindo `modules.md` e o `flow-map.md`) e é caro. A grande maioria das iterações envolve novas fontes que ajustam seções específicas de `requirements.md` ou `business-rules.md` — trabalho do iterate, não do product.

---

## Sequência base (Momento 1)

`spec-ingest → spec-legacy → spec-benchmark` — com ou sem legado. Sem legado, `spec-legacy` grava
apenas o `legacy.md` de skip e termina (semântica completa em `LEGACY_MODE_RESPECTED` e no gate
`V-LEG-01` abaixo).

---

## Ramos após a sequência base

Definidos na pergunta 2 do kickoff (e detalhados nos planos acima):
**Ramo A** — `spec-product → [spec-prototype opcional] → spec-iterate` ·
**Ramo B** — `spec-prototype → spec-product → spec-iterate`.

Protótipo já existente **não cria um terceiro ramo**: entra como insumo visual do `spec-ingest`
e `spec-prototype` roda em modo Documentar/Análise no ponto do ramo escolhido (ver Passo 0).

---

## Pastas

```
projeto/
├── inputs/          ← insumos brutos (transcrições, código, docs, diagramas)
├── outputs/
│   └── spec/        ← TODOS os artefatos gerados aqui
│       ├── frame.md                   (spec-frame — opcional; enquadramento + hipóteses HIP + plano PRB)
│       ├── frame/pre-prototype/        (spec-frame — opcional; esboço HTML/wireframe, não-canônico)
│       ├── context-map.md            (spec-ingest)
│       ├── discovery-document.md     (spec-ingest — 8 seções: 7 narrativas + readiness score)
│       ├── legacy.md                 (spec-legacy — skipped OU AS-IS 12 dim.)
│       │   └── domains/*.md          (opcional, se volume alto)
│       ├── architecture.md           (spec-legacy — AS-IS apenas, Mermaid C2) [quando há legado]
│       ├── legacy-analysis.md        (spec-legacy — scorecard + R/R/R) [quando há legado]
│       ├── threat-model.md           (spec-legacy — STRIDE do AS-IS) [quando há legado]
│       ├── benchmark.md              (spec-benchmark — mercado + concorrentes)
│       ├── product-vision/
│       │   └── product-vision.md     (spec-product — PRD ou One-Pager)
│       ├── business-rules.md         (spec-product — RN normativas / AS-IS ref. + RN do novo produto)
│       ├── requirements/
│       │   └── requirements.md       (spec-product — RF + RNF de negócio)
│       ├── product-requirements/
│       │   └── product-requirements.md (spec-product — PR/UX)
│       ├── modules.md                (spec-product — catálogo modular canônico)
│       ├── flow-map.md               (spec-product Passo 4.7 — Fluxos×Etapas×Telas×Transições; gate FATAL FLOWMAP_VALID)
│       ├── prototype.md              (spec-prototype — opcional)
│       ├── screens-manifest.json     (spec-prototype — inventário de telas; contrato em tools/references/screens-manifest.md)
│       ├── screens/<TEL-ID>.png      (spec-prototype — screenshots das telas)
│       ├── frontend-decisions.md     (spec-prototype — opcional, fallback)
│       ├── gaps.md                   (spec-iterate)
│       ├── sync-log.md               (spec-iterate)
│       └── report/
│           └── product-discovery-kit.html  (spec-report — opcional; HTML único)
└── src/             ← código de protótipo (apenas spec-prototype modo geração)
```

---

## Gates de qualidade — verificar antes de passar à etapa seguinte

Para auditar a saúde da estrutura, executar `python3 ../tools/check-outputs.py` (caminho relativo ao SKILL.md, conforme [`../tools/references/paths.md`](../tools/references/paths.md) — válido em qualquer espelho da skill: `skills/`, `.cursor/skills/`, `.claude/skills/`, `plugin/skills/`). Ele lista quais documentos faltam, incluindo o `flow-map.md`. Script indisponível → registrar `TOOL_UNAVAILABLE:check-outputs` no `sync-log.md` e conferir manualmente.

| Etapa concluída | Critério mínimo de passagem | Se falhar |
|---|---|---|
| spec-frame (opcional) | `frame.md` com problema enquadrado, hipóteses `HIP-xxx` rotuladas, plano de levantamento `PRB-xxx`; nada marcado `FATO` sem âncora real; enquadramento aprovado pelo consultor antes de seguir | `V-FRM-01` hipótese anotada como `FATO` sem âncora → **WARNING:** reclassificar como `HIP` antes de invocar `spec-ingest` (o `spec-ingest` já converte `HIP`→`INF`/questão) |
| spec-ingest | (1) `context-map.md` com tabela F-xxx por fonte, números/datas, contradições; (2) `discovery-document.md` com **8** seções (7 narrativas + readiness score) e linguagem do cliente — toda afirmação rastreável a `F-xxx` ou GAP; **sem priorização MoSCoW, sem metas com alvo** (isso é spec-product); protótipo tratado como validação de intenção, não legado; ao final, resumo do insumo + nota de prontidão reportados ao usuário no chat | `V-ING-01` context-map sem tabela F-xxx → **FATAL:** não invocar próxima skill; listar fontes faltantes |
| spec-legacy | **Kickoff Não:** só `legacy.md` skipped (template). **Kickoff Sim/Parcial:** `legacy.md` + `architecture.md` + `legacy-analysis.md` + `threat-model.md` conforme skill. **Protótipo não conta como legado.** | `V-LEG-01` kickoff Sim/Parcial sem os 4 artefatos → **FATAL:** não invocar spec-benchmark; listar artefatos faltantes |
| spec-benchmark | `benchmark.md` com pergunta estratégica, status quo presente como concorrente, fontes A/B/C/D em todas as células, mapa 2x2 com eixos heterogêneos, análise de modelo de negócio dos concorrentes, tendências de mercado, gaps em 3 categorias, recomendações em Pyramid Principle | `V-BEN-01` status quo ausente da matriz de concorrentes → **FATAL:** não invocar ramo A/B; reabrir Passo 3 do benchmark |
| spec-product | **6 arquivos**: `modules.md` (catálogo modular canônico — código + nome + aliases + status), `product-vision.md` (Moore + OKR/SMART + É/Não É + personas com JTBD + roadmap), `business-rules.md` (**sem legado AS-IS:** seção normativa/ref.; **com legado:** seção AS-IS + novo produto; coluna Módulo nas RNs quando aplicável), `requirements.md` (**índice modular** + cobertura insumo→RF ou GAPs + RF por seção `## Módulo:` com IDs `RF-MOD-XXX-NN`, BDD×3, RNF de negócio com métrica, matriz RF↔RNF — ver `../tools/references/spec-requirements-depth.md`), `product-requirements.md` (PR **agrupados por módulo**, cada um ligado a RF + estados UI + TTFV + WCAG 2.2 AA + campo **Etapa do fluxo** fechado no Passo 4.7), `flow-map.md` (Passo 4.7 — 4 seções em gramática estrita FLX/ETP/TEL/TRS, validado por `python3 ../tools/check-flowmap.py`, métricas coladas em `## Cobertura`) | `V-PRD-01` módulo no índice sem ≥ 1 RF Must nem `QA-NN` de justificativa → **FATAL:** não invocar spec-iterate; completar o módulo · `V-PRD-02` produto com UI sem `flow-map.md` válido (gate `FLOWMAP_VALID`) → **FATAL:** não invocar spec-iterate. Exceções que **não** são falha: `FLOWMAP_SKIPPED` (produto sem UI, justificado no sync-log) e `TOOL_UNAVAILABLE:check-flowmap` (validador ausente → WARNING, flow-map aceito sob revisão humana declarada) |
| spec-prototype | **Inventário de telas** completo (RF + entidades/CRUD + flow-map + acesso + transversais — o flow-map é o mínimo, não o teto; gate `SCREEN_INVENTORY_COMPLETE`, FATAL em fidelidade Alta: 100% gerado, sem stub); tabela UI → negócio com 7 colunas; `screens-manifest.json` emitido cobrindo todas as rotas (gate WARNING `SCREENS_MANIFEST_EMITTED`, contrato em `../tools/references/screens-manifest.md`); cada rota com 3 estados (erro/vazio/carga); gate de arquitetura (Passo 3.0) + questionário de design (Passo 3.0.1) antes de `src/`; modo Geração só após ler integralmente a rule `frontend.mdc` do projeto; modo Documentar-protótipo: PD-xxx listados com tipo e prioridade de migração; seção "Artefatos que precisam ser criados" preenchida | `V-PRO-01` geração de `src/` sem ler `frontend.mdc` (Passo 3.0) → **FATAL:** interromper geração; acordar arquitetura com o usuário |
| spec-iterate | `gaps.md` com 13 campos por GAP **priorizando negócio** (ver skill); **não** confundir dívida técnica do protótipo mock com GAP; **colheita do protótipo** quando existe protótipo (manifesto → runtime → estático; `PROTOTYPE_HARVESTED` no sync-log) e **auditoria da amarração técnica** quando `data-model.json`/`api-contracts.yaml` existem (`UI_BINDING_AUDITED`); `sync-log.md` atualizado | `V-ITE-01` GAP sem os 13 campos ou sem propagação a "Afeta" → **FATAL:** não marcar GAP como resolvido; manter `Status: aberto` · `V-ITE-02` protótipo existente sem colheita registrada (`PROTOTYPE_HARVESTED`, inclusive `camada=skipped` justificada) → **WARNING:** rodar a colheita antes de fechar a Etapa A do `spec-iterate` |
| spec-report | `report/product-discovery-kit.html` único com CSS embutido; sumário executivo na capa; índice lateral com **ordem stakeholder-first** (descoberta e mapa de contexto **por último**, ver `generate-report.py`); todos os `.md` incorporados **exceto** `prototype.md`, `frontend-decisions.md`, `gaps-answers.md` | `V-REP-01` `capa.md` ausente ou com marcador de stub → **WARNING:** `generate-report.py` gera o resumo executivo automaticamente e apenas emite aviso; preencher `capa.md` antes da entrega final |

---

## Validators (FATAL / WARNING)

Os códigos `V-XXX-NN` **por etapa** (`V-ING-01`, `V-LEG-01`, `V-BEN-01`, `V-PRD-01`, `V-PRD-02`,
`V-PRO-01`, `V-ITE-01`, `V-ITE-02`, `V-REP-01`) estão definidos na coluna «Se falhar» da tabela
**Gates de qualidade** acima, com a severidade em cada linha — não são repetidos aqui. Esta seção
lista só os validators **transversais**, que não pertencem a uma etapa isolada.

### FATAL — bloqueia avanço para a próxima etapa da sequência

| Código | Verificação |
|--------|-------------|
| `KICKOFF_PERSISTED` | Linha `kickoff: legado=… · ramo=… · ambiente=… · inputs=…` gravada na Seção A do `sync-log.md` ao final do Passo 0, antes de invocar `spec-ingest` |
| `NO_ADO_BACKLOG` | Nenhuma skill deste orquestrador gera work items / backlog no Azure DevOps — escopo termina em `product-requirements.md` |
| `LEGACY_MODE_RESPECTED` | Kickoff «Não» → `spec-legacy` só grava skip; kickoff «Sim/Parcial» → as 4 saídas de `spec-legacy` são geradas antes de `spec-benchmark` |

### WARNING — não bloqueia; registrar no `sync-log.md`

| Código | Verificação |
|--------|-------------|
| `SPEC_PRODUCT_NOT_RERUN` | `spec-product` não foi rerrodado sem um GAP com tag `⚠️ REQUER spec-product` |
| `PROTOTYPE_NOT_MISCLASSIFIED` | Nenhum protótipo de validação (`inputs/`, mock, BD de teste) tratado como legado (ver tabela de classificação do Passo 0) |

---

## O que NÃO faz

- Não gera backlog, tasks ou work items no Azure DevOps — escopo termina em `product-requirements.md`; a cadeia técnica (`spec-tech-rules` em diante) é fase posterior
- Não define arquitetura TO-BE, RNF técnico profundo ou contratos de API — isso é responsabilidade das skills da Fase 7 em diante
- Não cria `GAP-XXX` diretamente — essa numeração é exclusiva de `spec-iterate`; demais skills registram `## Questões em aberto`
- Não rerroda `spec-product` a cada nova fonte de informação — o ciclo normal é `spec-ingest` (delta) → `spec-iterate` → propagação cirúrgica
- Não decide sozinho se algo é legado — segue a tabela de classificação do Passo 0 antes de perguntar ao usuário

---

## Sync-log como memória cross-cutting

**Regra obrigatória para TODAS as skills filhas** (`spec-ingest`, `spec-legacy`, `spec-benchmark`, `spec-product`, `spec-prototype`, `spec-iterate`, `spec-report`):

1. **Ao iniciar**, ler `outputs/spec/sync-log.md` Seção A (timeline de execuções). Se o arquivo não existir, criar a partir do template e registrar como primeira execução. As decisões-chave já registradas são contexto — não relitigar sem motivo novo.
2. **Ao terminar**, adicionar uma linha na Seção A com:
   - Data/hora
   - Nome da skill
   - Modo / contexto da execução
   - Inputs consumidos (curto)
   - Outputs gerados ou atualizados
   - Decisões-chave (1–3 bullets do que mudou o entendimento do projeto)
   - Decisor (consultor / cliente / nome / `—` se derivação automática)
   - Próximo passo recomendado
3. Não declarar a skill concluída sem essa entrada. Se `spec-iterate` propaga GAPs, adicionar entradas também na Seção B.

Esse log é a **única fonte de verdade cronológica** do projeto. Skills consultam-no para evitar duplicar trabalho e para manter coerência de decisões.

---

## Inversão de caminho (pode ocorrer em qualquer ponto)

### Documento → Protótipo (durante document-first)

Quando na geração de requirements ou product-requirements surge necessidade de validar visualmente:

1. Registrar estado atual nos artefatos abertos
2. Invocar spec-prototype (modo Geração) com os artefatos existentes como entrada
3. Após protótipo validado, continuar ou voltar a spec-product para ajustes
4. Usar spec-iterate para propagar qualquer mudança que o protótipo revelou

### Protótipo → Documento (regra mal definida encontrada na documentação)

Quando spec-prototype (Análise) ou spec-product detectam inconsistência no protótipo:

1. Registrar a inconsistência em `## Questões em aberto` (`QA-NN`) do artefato afetado (regra de criação de `GAP-XXX` em «O que NÃO faz»)
2. Corrigir o artefato de negócio (business-rules.md, requirements.md)
3. Invocar spec-prototype novamente com instrução explícita de atualizar src/ para refletir a decisão
4. Registrar propagação no sync-log.md

---

## Skills irmãs (fora deste orquestrador)

Este orquestrador termina na definição de produto (`product-requirements.md`).
A cadeia técnica pós-discovery é gerida pelas skills abaixo — cada uma tem o seu próprio
`SKILL.md` e `templates/`:

| Skill | Fase | Artefato produzido |
|-------|------|--------------------|
| `spec-tech-rules` | 5.5 | `outputs/spec/tech-rules/*.mdc` + `tech-rules-summary.md` |
| `spec-hld` | 5.6 | `hld.md` (desenho TO-BE: containers, integrações, NFR→táticas, ADRs) |
| `spec-data-model` | 6a | `data-model.json` |
| `spec-api-contracts` | 6b | `api-contracts.yaml` + `api-contracts-supplement.json` |
| `spec-test-plan` | 6c | `test-plan.md` — plano de testes de negócio; fonte dos cenários de aceite que a `spec-tasks` grava nas tasks |
| `spec-tasks` | 7 | `tasks.json` + `gaps-document.md` |
| `spec-tasks-html` | 7c | `report/tasks.html` |
| `spec-tasks-azure` | 8 | Work items no Azure DevOps |

Documentação completa de cada uma no respectivo `../<skill>/SKILL.md` (ex.:
[`../spec-tasks/SKILL.md`](../spec-tasks/SKILL.md)); a tabela canônica de **artefato → path**
por fase está em [`../tools/references/paths.md`](../tools/references/paths.md) — caminhos
relativos a este `SKILL.md`.

---

## Anti-padrões a evitar

Erros já cobertos por gate ou validator (classificação de protótipo, modo do legado, rerun do
`spec-product`, propagação de GAP, escopo do discovery-document) não são repetidos aqui — valem as
duas tabelas acima. Restam os que nenhum gate captura:

- Aceitar "domínio X está documentado" sem checar as 12 dimensões
- Gerar requirements sem ter benchmark concluído
- Usar `[A DEFINIR]` em artefatos formais — registrar `GAP-XXX` (só `spec-iterate` cria) ou `QA-NN` em `## Questões em aberto`
- **Misturar AS-IS técnico com definição de negócio do novo produto** — `spec-legacy` analisa o existente, `spec-product` define o novo
