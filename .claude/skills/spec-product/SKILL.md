---
name: spec-product
description: >
  spec-product (Fase 6 — Definição de Negócio do Novo Produto). Gera seis artefatos: (1) modules.md, catálogo modular canônico; (2) product-vision.md (Moore, OKR/SMART, escopo, personas/JTBD e roadmap); (3) business-rules.md com regras do legado (RN-xxx) e do novo produto (RN-NOVO-xxx), rastreadas por módulo; (4) requirements.md com inventário de módulos, RF por módulo (RF-MOD-XXX-NN), matriz insumo→RF e nível SRS; (5) product-requirements.md (PR/UX) por módulo, estados de UI, inventário de campos, validações, filtros, TTFV e WCAG 2.2 (gate PR_FIELD_INVENTORY); (6) flow-map.md com Fluxos×Etapas×Telas×Transições, validado pelo check-flowmap.py (gate FLOWMAP_VALID ou WARNING se indisponível). Deriva a visão antes dos RF. Não cobre RNF técnicos, arquitetura TO-BE, APIs ou stack.
version: "1.5"
updated: "2026-10-20"
---

# spec-product — Definição de Negócio do Novo Produto

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` Seção A para entender decisões anteriores (kickoff, ramo escolhido, modo de legado). Ao terminar, adicionar linha registrando esta execução. Como esta skill produz 6 artefatos grandes, **uma linha agregada** descrevendo o conjunto é suficiente — não uma por artefato. A linha agregada inclui as 2 métricas de cobertura do flow-map (Passo 4.7): `% etapas com tela` e `% transições com RN`. Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md) seção «Sync-log como memória cross-cutting».

## Papel

Definir o **novo produto** do ponto de vista **de negócio**. **Não desenha o sistema técnico TO-BE.**

**Regra de ouro:** se um stakeholder pergunta "o que esse produto faz, para quem e por quê?", a resposta tem que estar aqui. Se a pergunta é "como vai ser construído tecnicamente?", **não está aqui**.

**Regra de ouro (GAPs):** `spec-product` **não cria** `GAP-XXX` — essa numeração formal é de responsabilidade exclusiva do `spec-iterate`. Lacunas ou conflitos encontrados durante este fluxo entram como `QA-NN` numa seção `## Questões em aberto` do artefato afetado; a seção **10. Visão ↔ GAPs** de `product-vision.md` apenas **referencia** GAPs já existentes (abertos em ciclos anteriores de `spec-iterate`), nunca cria novos.

### Fronteira negócio / técnico (profundidade SRS-like **de produto**)

A meta é **exaustão por módulo** semelhante a catálogos longos de requisitos (ex. SRS § funcional), **sem** virar IEEE técnico: comportamentos observáveis, critérios de aceite que o PO valida, integrações descritas por **finalidade** e **efeito no processo**.

| Permitido | Proibido neste fluxo |
|-----------|----------------------|
| RF como resultado observável (ator + sistema como caixa negra) | OAuth, TLS, schema, OpenAPI, stack |
| «O produto obtém X do [sistema institucional] para [efeito no processo]» | Endpoints, payloads, códigos HTTP |
| SLAs **percebidos** pelo requerente | HA %, dimensionamento de infra |
| Estados de jornada, erros e mensagens **de negócio** | Stack traces, logging técnico |

Heurísticas e teste de um RF: [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md).

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

Vale para `product-vision.md`, `requirements.md`, `product-requirements.md`, `business-rules.md`, `flow-map.md` e `modules.md`.

Duas ressalvas importantes:

- O padrão EARS (`QUANDO ..., o sistema DEVE ...`) define a **estrutura** do critério de aceite; ele não dispensa as 10 regras. O que vem depois de "o sistema DEVE" segue todas elas.
- O lint de prosa (gate `PROSE_LINTED`) cobre **ambiguidade**, não **complexidade**. Um critério pode passar no Vale sem nenhum alerta e continuar ilegível para quem vai implementar. As duas verificações são independentes.

## SKILL ↔ templates

| Saída em `outputs/spec/` | Template |
|---------------------------|----------|
| `modules.md` | [`templates/modules.md`](templates/modules.md) |
| `product-vision/product-vision.md` | [`templates/product-vision.md`](templates/product-vision.md) |
| `business-rules.md` | [`templates/business-rules.md`](templates/business-rules.md) |
| `requirements/requirements.md` | [`templates/requirements-functional.md`](templates/requirements-functional.md) |
| `product-requirements/product-requirements.md` | [`templates/product-requirements.md`](templates/product-requirements.md) |
| `flow-map.md` | [`templates/flow-map.md`](templates/flow-map.md) |

---

## Entradas obrigatórias

| Entrada | Origem | Para quê |
|---------|--------|----------|
| `outputs/spec/discovery-document.md` | `spec-ingest` | Problema central, atores, candidatos a RF |
| `outputs/spec/context-map.md` | `spec-ingest` | Rastreio `F-xxx` |
| `outputs/spec/benchmark.md` | `spec-benchmark` | Posicionamento, gaps, modelo de negócio |
| `outputs/spec/legacy.md` | `spec-legacy` *(quando existir)* | Domínios, HUs, KPIs, RN, dores, UX atual |
| `outputs/spec/legacy-analysis.md` | `spec-legacy` *(quando existir)* | Decisão Reuse/Replace/Retire |
| `outputs/spec/threat-model.md` | `spec-legacy` *(quando existir)* | Lacunas de segurança → RNF compliance |
| `outputs/spec/prototype.md` | `spec-prototype` *(se existir)* | **Leitura obrigatória** em toda execução |
| ERS, SRS, normas ou simulações em `inputs/` | Usuário | Cobertura negocial (sem copiar § técnica literalmente); alimentar matriz insumo→RF |

Se `prototype.md` existir: ler integralmente antes de redigir qualquer um dos 6 artefatos.

---

## Passo 0 — Derivar a visão a partir dos dados (antes de redigir qualquer doc)

**Não inventar a visão** — derivá-la dos dados já coletados. Responder estas perguntas com evidências:

| Pergunta | Fonte dos dados |
|----------|----------------|
| Qual dor tem o maior impacto financeiro ou operacional mensurado? | `context-map.md` F-xxx, `legacy.md` Dim. 7 (PD-xxx) |
| Qual oportunidade apareceu no benchmark e ainda não é bem servida? | `benchmark.md` Oportunidades |
| Qual diferencial o cliente enfatizou que nenhum concorrente entrega? | `benchmark.md` Diferenciais + `discovery-document.md` Seção 4 |
| O produto proposto resolve de fato a dor mensurada? | Cruzar discovery §1 com benchmark Passo 8 |
| O cliente pagaria por isso hoje? Por que sim/não? | `discovery-document.md` Seção 7, INF-xxx |

Registrar as respostas como **premissas da visão** antes de escrever o formato Moore. Toda premissa rastreável a `F-xxx` ou `GAP-XXX`.

**Validação rápida antes de prosseguir (3 perguntas):**
1. A visão resolve a dor mensurada mais crítica? (Se não → revisar)
2. A visão se diferencia do status quo claramente? (Se não → revisar benchmark)
3. O escopo "Não É" exclui pelo menos 3 itens que stakeholders pediram mas que desviam do foco? (Se não → escopo está vago)

---

## Passo 0.5 — Confirmação do catálogo modular (bloqueante)

**Antes** de redigir `product-vision.md`, `business-rules.md` ou `requirements.md`, alinhar com o consultor uma **lista candidata de módulos** — não o catálogo final (esse só fecha no Passo 3.0), mas o suficiente para não escrever quatro artefatos grandes sobre fronteiras de módulo erradas.

1. Derivar a lista candidata das fontes já disponíveis: `context-map.md` seção **Candidatos a módulo / capacidade** (quando existir), `discovery-document.md` §4 (funcionalidades desejadas), `benchmark.md`, `prototype.md` (rotas/fluxos, quando existir).
2. Apresentar a lista candidata ao consultor em formato curto (nome + 1 frase de objetivo por módulo) e pedir confirmação explícita — adicionar, renomear, fundir ou remover módulos antes de prosseguir.
3. **Gate bloqueante:** sem confirmação do consultor (ou decisão explícita de prosseguir com a lista candidata "as-is"), não iniciar o Passo 1. Registrar a resposta recebida.
4. **Registrar no `sync-log.md`** (Seção A), na mesma linha ou logo após o kickoff geral do projeto:

   ```
   modulos-kickoff: candidatos=<lista curta> · confirmado_por=<consultor/cliente> · data=<YYYY-MM-DD>
   ```

5. A lista candidata confirmada aqui é **insumo** do Passo 3.0 — não substitui a formalização em `modules.md` (aliases, status, limites detalhados), que continua obrigatória antes de `requirements.md`.

**Validador `MODULES_KICKOFF_CONFIRMED` (FATAL):** Passo 1 iniciado sem a linha `modulos-kickoff:` registrada em `sync-log.md`.

---

## Passo 1 — Gerar `product-vision.md`

### Nota: JTBD quando há protótipo existente

Quando o kickoff inclui protótipo já construído, o **JTBD Funcional** pode ser derivado diretamente das rotas e fluxos do protótipo (via `prototype.md`). O **JTBD Emocional** e as **dores** ainda devem vir do discovery — o protótipo mostra *o que* o usuário faz, não *por que* ele quer isso nem como se sente. Não simplificar a seção inteira; apenas indicar a fonte do JTBD Funcional como `prototype.md §rota`.

---

### Passo 1.5 — Value Proposition Canvas (Osterwalder) — **antes** do Moore

**Método:** `value-proposition-canvas`. Antes de declarar a visão no formato Moore, mapear o *fit* problema↔solução para **cada persona primária**. Sem este fit, a visão vira aspiração sem lastro.

**Procedimento:**

1. **Perfil do cliente** — para cada persona primária, tabela Jobs × Pains × Gains com evidência célula a célula (toda célula cita `F-xxx` ou `PD-xxx`) — tabela no template §2.4.
2. **Mapa de valor** — mapear cada dor/ganho a ≥ 1 módulo (`MOD-XXX`) do catálogo (pain relievers / gain creators — tabela no template §2.4).
3. **Regra de cobertura:** toda *pain* sem *pain reliever* mapeado a um `MOD-XXX` → registrar em `## Questões em aberto` (`QA-NN`). Não deixar dor órfã silenciosa.

**Validador `VPC_EVIDENCE` (FATAL):** qualquer célula de Jobs/Pains/Gains **sem** evidência (`F-xxx`/`PD-xxx`) bloqueia o handoff.

---

### Formato Moore (derivado do Passo 0)

Bloco pronto no template §3. Cada campo tem fonte fixa: segmento ← discovery §3 · necessidade ←
discovery §1 (quantificada) · categoria ← benchmark Passo 0 · benefício ← Oportunidade do
benchmark · alternativa atual ← status quo · diferenciação ← Diferencial do benchmark.

### Estrutura completa em 11 seções

As 11 seções (Sumário Executivo em Pyramid Principle → Histórico de versões) estão prontas, na
ordem, no `templates/product-vision.md` — preencher lá.

---

### North Star Metric + árvore de métricas (Seção 4)

**Método:** `north-star-tree`. A NSM traduz o valor central do produto num único número; a árvore liga esse número a alavancas influenciáveis.

**Procedimento de seleção (a NSM candidata passa nos 3 critérios):**

1. **Mede valor para o usuário**, não receita da empresa (ex.: «processos concluídos no prazo», não «MRR»);
2. **É influenciável pelo produto** (o time consegue mover a agulha com o que constrói);
3. **É leading, não lagging** (antecede o resultado de negócio em vez de só reportá-lo).

**Estrutura:** `NSM → 3-5 input metrics → cada input ligado a ≥ 1 MOD-XXX` (árvore no template §4.1).

**Validador `NSM_TREE` (WARNING):** input metric sem nenhum `MOD-XXX` associado (alavanca sem produto que a mova).

### OKR verificável (Seção 4)

**Método:** `verifiable-okr`. Todo KR é uma quádrupla verificável — sem baseline ou alvo numérico o KR não é aferível.

`KR = { métrica, baseline (F-xxx ou "sem baseline" → Questões em aberto), alvo numérico, prazo }`.

- Se não há baseline medida, escrever explicitamente `sem baseline` e abrir `QA-NN` em `## Questões em aberto` para instrumentá-la.
- **Banda operacional:** 2-4 KRs por objetivo (🟢 2-3 · 🟡 4 · 🔴 > 4 — ver [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md) §7).

**Validador `KR_HAS_BASELINE` (WARNING):** KR sem baseline (`F-xxx`) e sem marcação explícita `sem baseline` + `QA-NN`.

### Personas — JTBD como job story (Seção 6)

**Método:** `jtbd-job-story`. Cada persona expressa suas necessidades em **job stories** na forma canônica:

> **Quando** `<situação>`, **quero** `<motivação>`, **para** `<resultado esperado>`.

**Procedimento:**

- 2-5 job stories por persona; cada uma rastreada a ≥ 1 `F-xxx`.
- Persona **sem** nenhuma job story evidenciada por `F-xxx` → rotular **"persona hipotética"** e registrar `QA-NN` em `## Questões em aberto` (não removê-la, mas sinalizar que carece de validação).
- **Banda operacional:** 2-5 personas primárias (🟢 2-3 · 🟡 4-5 · 🔴 > 5); job stories por persona (🟢 2-5 · 🟡 1 · 🔴 0 = hipotética) — ver ref §7.

---

## Passo 2 — Gerar `business-rules.md`

`business-rules.md` tem **duas seções obrigatórias**:

### Seção A — Regras do Legado (quando há legado)

Catálogo das `RN-[DOMÍNIO]-NNN` encontradas em `legacy.md` Dimensão 8. **Não inventar regras novas aqui** — só consolidar o que já existe.

Bloco campo a campo de cada RN pronto no template (`templates/business-rules.md` — Módulo,
Origem, Domínio, Enunciado «SE X ENTÃO Y», Exceções, Conflitos, Vinculada a, Fonte regulatória,
**Status no novo produto**: Mantida / Adaptada / Substituída / Descontinuada).

**Quando não há legado:** omitir Seção A completamente. Iniciar direto na Seção B.

### Seção B — Regras do Novo Produto

Regras que o produto novo precisa **definir e implementar** — não existiam no legado, ou são novas decisões derivadas do protótipo, benchmark e discovery. Toda regra nova deve ter origem identificável.

Bloco campo a campo pronto no template (mesmos campos da Seção A, trocando Status por
**Justificativa** e vinculando a RF/PR). **Origens válidas para RNs novas:**
- Protótipo implementou comportamento que implica regra (ex.: campo desabilitado abaixo de R$10)
- Benchmark revelou prática de mercado que precisamos adotar (ex.: confirmação dupla em estorno)
- Discovery identificou necessidade não coberta pelo legado
- Decisão explícita do cliente em reunião (`F-xxx` ou `CHAT-XXX`)

### Classificação por tipo (BRG / von Halle) — obrigatória em ambas as seções

**Método:** `rn-typing`. Toda RN (legado **e** novo produto) recebe um campo **Tipo**: `Fato | Restrição | Derivação | Inferência | Gatilho`. Definições e regra do algoritmo em [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md) §5.

- **RN tipo Derivação** exige um campo **Algoritmo** em **passos numerados** — é o que o `spec-tasks` consome em `businessRules[].implementation.algorithm[]` e o `spec-estimate` usa em `ruleComplexity`.
- **Validador `RN_DERIVATION_HAS_ALGORITHM` (FATAL):** RN classificada como Derivação sem campo Algoritmo em passos numerados bloqueia o handoff.

### Tabela de conflitos cruzados (ao final do documento)

*(Quando o conflito ainda não tem decisão de negócio, registrar como `QA-NN` em `## Questões em aberto` — **não** cunhar `GAP-XXX` diretamente; a formalização como GAP é responsabilidade exclusiva do `spec-iterate` na próxima auditoria.)*

| RN A | RN B | Tema do conflito | Resolução |
|------|------|------------------|-----------|
| RN-PAG-001 | RN-NOVO-COB-001 | Cobrança × suspensão | QA-03 |

---

## Passo 3.0 — Inventário de capacidades (módulos de negócio)

**Antes** de redigir RF em sequência única, gerar o **registro canônico de módulos** em [`outputs/spec/modules.md`](templates/modules.md). Esse arquivo é a **fonte de verdade** consultada pelos demais documentos.

### 3.0.1 — Gerar `modules.md`

Copiar do template [`templates/modules.md`](templates/modules.md) e preencher uma linha por módulo identificado. Critérios de inclusão e taxonomia ficam abaixo neste passo.

### 3.0.2 — Refletir no `requirements.md`

Após `modules.md` fechar, preencher o **índice de módulos e cobertura** no topo de `requirements/requirements.md` usando os mesmos códigos. O índice de `requirements.md` é a visão operacional (com colunas Nº RF planejado / escritos / Lacunas); `modules.md` é o registro semântico (códigos + nomes + aliases + status).

> **Regra de consistência:** os códigos `MOD-XXX` em `requirements.md`, `business-rules.md` (campo Módulo de cada RN), `product-requirements.md` (seções `## Módulo:`), `prototype.md` e `gaps.md` devem **todos** existir em `modules.md`. Divergência é problema de processo — rodar `python3 ../tools/check-modules.py` ao final do passo para validar (caminho relativo ao SKILL.md — ver [`../tools/references/paths.md`](../tools/references/paths.md)).

### Fontes

- `discovery-document.md` §4 (funcionalidades desejadas)
- `context-map.md` — seção **Candidatos a módulo / capacidade** (`spec-ingest`), quando existir
- `benchmark.md`, `prototype.md`, `product-vision.md` escopo É/Não É
- ERS/SRS ou normas em `inputs/` — só para **efeitos de negócio** e rastreio (sem copiar § técnica)

### Taxonomia — derivar do escopo do projeto

**Não usar lista pré-fabricada.** O catálogo modular deve sair das fontes (discovery, benchmark, prototype.md), não de exemplos genéricos. Heurística para nomear: nome curto em linguagem do cliente que descreva uma capacidade de negócio observável (ex.: `MOD-COBRANCA`, `MOD-ATENDIMENTO`, `MOD-CADASTRO`). Evitar nomes técnicos (`MOD-API-X`) ou puramente UI (`MOD-TELA-HOME`).

### Para cada módulo listado

| Campo | Conteúdo |
|-------|----------|
| Nome em linguagem do cliente | Título da linha no índice + seção `## Módulo:` |
| Atores primários | Quem dispara e quem recebe o resultado |
| Objetivo de negócio | Uma frase mensurável ou outcome |
| Limites | O que este módulo **não** cobre (reduz overlap) |

### Saídas deste passo

1. Tabela **Índice de módulos e cobertura** preenchida com estimativa «Nº RF planejado» por linha.
2. Tabela **Matriz de cobertura (insumos → RF)** iniciada: cada item relevante do discovery/ERS/SRS → RF futuro ou item `QA-NN` em `## Questões em aberto` (**não** `GAP-XXX` — essa numeração é exclusiva do `spec-iterate`).
3. Se o insumo tiver mapa de telas/jornadas (ex. Apêndice B de SRS): garantir que cada entrada terá **≥ 1 RF** ou registro `QA-NN` em `## Questões em aberto` antes do encerramento do Passo 3.1.

---

## Passo 3.1 — Gerar `requirements.md` (RF + RNF de negócio), **módulo a módulo**

Ordem de execução: completar **um módulo de cada vez** (seção `## Módulo: …` + todos os `### RF-MOD-XXX-NN` daquele módulo), atualizar o índice (colunas «RF escritos» e «Lacunas»), só então passar ao módulo seguinte.

### Critérios MoSCoW detalhados

**Método:** `moscow-objective`. Este passo **não** redefine os níveis MoSCoW — a **única** tabela canônica de critério objetivo (Must / Should / Could / Won't) está em [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md) §6. Aplicar essa tabela diretamente: cada `Must` cita a jornada crítica ou a RN (fonte legal) que o justifica. Banda `MUST_INFLATION` (WARNING): `Must` > 50% dos RFs do módulo → revisar critérios (ver ref §6 e §7).

### Granularidade e sintaxe de RF

**Método:** `ears-rf`. Escrever e testar cada RF conforme [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md):

- **§1 — Teste de granularidade:** um RF = uma capacidade aceitável pelo PO **sem** mencionar implementação, com **1 resultado observável** e cenários BDD ≤ 12 linhas. Falhou → dividir.
- **§2 — Sintaxe EARS:** todo RF usa **exatamente 1** dos 5 padrões (Ubíquo / Evento / Estado / Comportamento indesejado / Opcional). RF que precisa de 2 padrões = 2 RFs.
- **§3 — Checklist ISO/IEC/IEEE 29148:** necessário · não ambíguo · completo · singular · viável · verificável · rastreável.
- Parágrafo com N comportamentos → **N** RF ou épico + RF filhos numerados `RF-MOD-XXX-NN`. Cada fluxo alternativo e erro de negócio relevante: refletir nos cenários BDD 2 e 3.

**Validadores:** `RF_SINGULAR` (**FATAL**: RF com dois resultados observáveis distintos) · `RF_EARS_PATTERN` (WARNING: RF fora dos 5 padrões EARS).

### Tabela TO-BE de negócio (delta vs. AS-IS)

| Domínio | Estado AS-IS | Estado TO-BE (capacidade de negócio) | Delta | RFs envolvidos |
|---------|--------------|--------------------------------------|-------|----------------|
| | legacy.md §XX (ou "processo manual") | [capacidade, não tecnologia] | | RF-MOD-XXX-NN |

### Bloco RF (estrutura obrigatória)

IDs: **`RF-[CÓDIGO-MÓDULO]-NN`** (ex.: `RF-MOD-AIA-SIM-014`). O código do módulo repete o do índice (`MOD-AIA-SIM` → prefixo `RF-MOD-AIA-SIM-`).

Estrutura no `requirements.md` (por RF):

1. Secção «## Módulo: [Nome cliente] (MOD-XXX)»
2. Cabeçalho `### RF-MOD-XXX-001: [título]` com Épico, Funcionalidade, User Story, MoSCoW, Complexidade
3. Um bloco Gherkin único com **Cenário 1** (feliz), **Cenário 2** (alternativo), **Cenário 3** (erro ou bloqueio de negócio)
4. Regras de Negócio + Rastreabilidade `F-xxx`

*(Ver template [`templates/requirements-functional.md`](templates/requirements-functional.md) para o esqueleto completo.)*

### Integrações negociais (opcional)

Tabela no template: sistema \| finalidade \| efeito observável \| RF — **sem** contrato técnico.

### Bloco RNF (RNF de negócio apenas)

**Método:** `quality-attribute-scenario`. Todo RNF de negócio é escrito como **Quality Attribute Scenario (SEI) de 6 partes** — `{fonte do estímulo, estímulo, ambiente, artefato, resposta, medida da resposta}` — e categorizado pelas categorias **ISO/IEC 25010**. Sintaxe, exemplos e categorias em [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md) §4.

```markdown
### RNF-[CATEGORIA]-001: [título]

**Declaração:** [o que o negócio exige]
**Cenário (6 partes):** [fonte] [estímulo] [ambiente] [artefato] [resposta] [medida numérica]
**Métrica mensurável:** [indicador] ≥/≤ [valor] em [condição]
**Critério de aceite:** [como verificar]
**Rastreabilidade:** F-xxx / benchmark.md §X
```

**Validador `RNF_HAS_MEASURE` (promovido a FATAL):** RNF sem medida numérica na parte "resposta" do cenário bloqueia o handoff (ver ref §4).

---

## Passo 4 — Gerar `product-requirements.md` (PR / UX)

Agrupar PR por **mesmo índice modular** que `requirements.md` (seções `## Módulo:`). Cada PR mantém **RF relacionado** obrigatório; um RF pode sustentar vários PR.

> **Ordem de execução dos sub-passos (obrigatória):** `Passo 4` (redigir os PR, **sem** o campo «Etapa do fluxo») → `Passo 4.5` (lint de prosa de `requirements.md` + `product-requirements.md`) → `Passo 4.7` (gerar `flow-map.md` **e** preencher «Etapa do fluxo» nos PR de tela) → **relint do delta** do 4.7 (ver fim do Passo 4.5). *(Não existe Passo 4.6 — a numeração salta de 4.5 para 4.7.)*
>
> **Por que essa ordem:** os IDs `ETP-xxx` **só existem depois** do Passo 4.7, e o Passo 4.7 deriva a seção `## Telas` **dos PR** deste passo. A dependência é resolvida em duas passadas — nunca inventando IDs.

### Princípios de experiência (3-5, todos com origem em dor real)

```
### Princípio: [nome]
**Origem:** PD-XX (legacy.md Dim. 7) ou F-xxx
**Descrição:** [comportamento esperado do produto]
**Como verificar:** [teste mensurável]
```

### PR-XXX estrutura obrigatória

A estrutura canônica de cada PR — **6 estados de UI**, **Inventário de campos**, **TTFV** e **WCAG 2.2 AA** — está definida **no template** [`templates/product-requirements.md`](templates/product-requirements.md), que é a **fonte canônica**. Preencher conforme o template; esta skill **não** re-especifica a lista de estados para evitar divergência. Regras de rastreio: cada PR liga a ≥ 1 `RF-MOD-XXX-NN`; campo **Origem** obrigatório (`Protótipo` / `Discovery` / `Normativo`); cada PR que documenta uma **tela** DEVE indicar a(s) etapa(s) do fluxo em que ela aparece — campo **Etapa do fluxo** = `ETP-xxx` do `flow-map.md`.

> **Campo «Etapa do fluxo» — quando preencher (evita a dependência circular PR ↔ flow-map):**
> neste passo o campo fica **literalmente** com o marcador `— (pendente Passo 4.7)`. **Nunca inventar `ETP-xxx`.**
> Ao fechar o Passo 4.7, substituir o marcador pelos IDs reais. A cobrança do campo (Definição de pronto e
> gate `PR_ETAPA_FLUXO`) é **condicional à conclusão do Passo 4.7**: com `FLOWMAP_SKIPPED` (produto sem UI) ou
> `TOOL_UNAVAILABLE:check-flowmap`, o campo permanece `—` e isso **não** é pendência.

#### Inventário de campos (obrigatório em PR de tela) — gate `PR_FIELD_INVENTORY`

O PR é a **nascente prescritiva** do detalhe de campo. Sem ele, a `spec-tasks` não tem fonte determinística para `uiContext.fields[]` e o detalhe não chega a quem implementa.

Para cada PR que documenta uma tela, preencher a tabela **Inventário de campos** do template com uma linha por campo de formulário, filtro ou coluna de grid. Regras:

- **Tipo** de cada campo pelo vocabulário fechado do template (`text`, `select`, `multiselect`, `date`, `month`, `autocomplete`, …). Não usar tipo livre.
- **Opções transcritas por extenso** (`valor — rótulo`) para todo campo de seleção cuja lista é conhecida em tempo de especificação. `enum:` e `domainTable:` **exigem** transcrição; só `endpoint:` pode ficar como *(dinâmica)*.
- **Origem das opções** sempre declarada, com a referência (`enum:SituacaoCadastral`, `endpoint:GET /contabilistas`).
- Preencher também os blocos **Grid / listagem** (colunas, ordenação default, paginação, mensagem de vazio) e **Comportamento dos filtros** (aplica ao alterar ou por botão, AND/OR, limpar todos, persistência, dependências entre filtros).

**Onde colher:** os RF de `requirements.md` costumam já enumerar campos, tipos e valores no enunciado EARS e nos cenários BDD — varrer primeiro. Depois `enumerations[]` do `data-model.json`, o `screens-manifest.json` (quando houver protótipo colhido) e, por último, o protótipo em `inputs/` para máscara, default e comportamento.

> **Screenshot não substitui a tabela.** Anexar imagem da tela é bem-vindo como complemento; o inventário textual é obrigatório porque o agente implementador não lê imagens.

**Gate `PR_FIELD_INVENTORY`:** todo PR de tela tem Inventário de campos preenchido, com Tipo em todas as linhas e Opções transcritas em todo campo de seleção não dinâmico. Produto sem UI (API pura, batch, worker) → não se aplica; registrar a inaplicabilidade **em linha própria** no `sync-log.md`:

```
PR_FIELD_INVENTORY: n/a · motivo=<API pura|batch|worker> (produto sem PR de tela)
```

*(Produto **com** UI nunca emite `FLOWMAP_SKIPPED` — por isso a inaplicabilidade tem registro próprio e não fica pendurada nessa linha.)*

### Jornadas + heurísticas de Nielsen

**Método:** `nielsen-journey`. Cada jornada por persona é padronizada e auditada contra as 10 heurísticas de usabilidade de Nielsen.

1. **Jornada padronizada de 5 passos** (toda jornada segue esta espinha):

   `entrada → ação principal → confirmação → erro/recuperação → saída/próximo`

2. **Checklist de heurísticas** (tabela heurística × jornada) — marcar cada uma das 10 heurísticas de Nielsen para cada jornada. A lista das 10 e a estrutura estão no template [`templates/product-requirements.md`](templates/product-requirements.md), seção «Jornadas por persona».

---

## Passo 4.5 — Verificação de prosa (lint de ambiguidade) — gate `PROSE_LINTED`

Sub-passo obrigatório da geração de `requirements.md` **e** `product-requirements.md`: antes de
dar qualquer um dos dois por concluído, rodar o linter de prosa **Vale** com os estilos
`EngProc` sobre os `.md` gerados. Detalhes dos estilos em
[`../tools/vale-styles/README.md`](../tools/vale-styles/README.md).

1. **Preparar e rodar o Vale** seguindo [`../tools/vale-styles/README.md`](../tools/vale-styles/README.md)
   § «Uso no projeto», antes de dar os dois artefatos por concluídos: o `.vale.ini` com o
   `StylesPath` descoberto (nunca presumido), a confirmação de que os estilos `EngProc` carregaram
   — sem ela, «0 ocorrências» é resultado **inválido** — e o comando sobre `requirements.md` e
   `product-requirements.md`.

2. **Triagem por criticidade** (teto de esforço — mesma regra da Etapa A do `spec-iterate`). O dicionário
   `EngProc.Ambiguidade` inclui termos de altíssima frequência («etc», «e/ou», «vários», «geralmente»,
   «normalmente»): tratar **toda** ocorrência de um `requirements.md` real são centenas de itens sem
   ganho proporcional. Cortar assim:

   | Onde está a ocorrência | Tratamento |
   |---|---|
   | 🟡 Enunciado de **RF `Must`**, **critério de aceitação/BDD**, **medida de RNF** ou **campo de RN** | **Obrigatório** corrigir (critério mensurável — valor, unidade, prazo, condição verificável) **ou** justificar em 1 frase |
   | ⚪ Texto de apoio, contexto, visão, notas, `EngProc.PronomesVagos` fora de critério | **Opcional** — listar agregado por regra (`<regra>: N ocorrências`), sem tratar item a item |

   Regras aplicadas: `EngProc.Ambiguidade` (termos não-testáveis), `EngProc.PronomesVagos`
   (referente ambíguo) e `EngProc.EARS` (critério de aceitação sem gatilho EARS).

3. **Registrar o gate no `sync-log.md`** (Seção A, na linha agregada da execução ou logo após):

   ```
   PROSE_LINTED: arquivos=<lista> · ocorrencias=<N> · criticas=<n 🟡> · corrigidas=<n> · justificadas=<n> · demais=<n ⚪ agregadas> · modo=<vale|llm> · estilos_confirmados=<sim|não>
   ```

**Relint do delta após o Passo 4.7:** o Passo 4.7 acrescenta o campo «Etapa do fluxo» aos PR de tela
depois deste lint. Não reexecutar o lint inteiro — rodar o `vale` **apenas** sobre
`product-requirements.md` e tratar somente ocorrências 🟡 nas linhas alteradas; anexar
`relint_pos_4.7=<n ocorrencias>` à linha `PROSE_LINTED`. Nada alterado além do campo → registrar
`relint_pos_4.7=0`.

**Vale ausente:** quando o Vale não estiver disponível, seguir o modo degradado do
[`../tools/vale-styles/README.md`](../tools/vale-styles/README.md) § «Uso no projeto» — verificar →
rota efêmera → degradar para a revisão via LLM com o mesmo dicionário e a mesma triagem do item 2,
registrando o gate com `modo=llm`.
Este gate é **WARNING** — nunca bloqueia o handoff.

---

## Passo 4.7 — Fluxos e Telas (`flow-map.md`) — gate `FLOWMAP_VALID`

Após `product-requirements.md`, gerar `outputs/spec/flow-map.md` a partir do template
[`templates/flow-map.md`](templates/flow-map.md) — a **gramática estrita** (4 seções, colunas fixas,
IDs `FLX/ETP/TEL/TRS-\d{3}`, células vazias = `—`) vive no template; não re-especificar aqui.

**Pré-requisito de ordem:** só rodar **depois** do Passo 4 (PR redigidos) — a seção `## Telas` deriva dos PR. Ao terminar, este passo **fecha** o campo «Etapa do fluxo» dos PR (item 4) e dispara o relint do delta (fim do Passo 4.5).

1. **Derivar Fluxos:** AS-IS dos processos do legado (`PROC-xxx` de `legacy.md`, quando existirem); TO-BE do discovery e da visão.
2. **Derivar Telas:** uma linha por tela documentada nos PR de `product-requirements.md` (RF/PR rastreados); Transições condicionadas pelas RN de `business-rules.md`.
3. **Validar até exit 0:** rodar `python3 ../tools/check-flowmap.py outputs/spec/flow-map.md` e corrigir todos os ERROs; tratar ou justificar os AVISOs. Caminho relativo ao SKILL.md, conforme [`../tools/references/paths.md`](../tools/references/paths.md) — válido em qualquer espelho da skill (`skills/`, `.cursor/skills/`, `.claude/skills/`, `plugin/skills/`).
4. **Cobertura e fechamento dos PR:** colar o bloco MÉTRICAS na seção `## Cobertura` do próprio `flow-map.md` e **substituir o marcador `— (pendente Passo 4.7)`** do campo **Etapa do fluxo** pelos `ETP-xxx` reais em cada PR de tela (ver Passo 4). Só aqui os IDs passam a existir.
5. **Sync-log:** registrar na linha agregada da execução (Seção A):

   ```
   FLOWMAP_VALID: etapas_com_tela=<X%> · transicoes_com_rn=<Y%> · avisos=<n tratados/justificados>
   ```

**Amarração Técnica — fora do escopo desta skill:** a 5ª seção OPCIONAL `## Amarração Técnica` do template NÃO é preenchida aqui — deixar ausente ou com colunas em `—`. Quem a preenche/atualiza são as fases técnicas: 6a `spec-data-model` (coluna Entidades) e 6b `spec-api-contracts` (coluna Endpoints). O template já traz a seção com as linhas de exemplo **comentadas** — mantê-las comentadas, sob pena de a métrica «% telas com amarração técnica» sair falsa (100% com dados de exemplo).

**Gate `FLOWMAP_VALID` (FATAL quando o produto tem UI):** `flow-map.md` existe **e** `check-flowmap.py` retorna exit 0.

**Degradação por ferramenta ausente — `TOOL_UNAVAILABLE:check-flowmap` (WARNING):** o gate distingue **flow-map inválido** de **validador indisponível** (mesma distinção do gerador de relatório).

| Situação | Efeito |
|---|---|
| `check-flowmap.py` roda e retorna **exit 1** (erro de gramática/integridade: ID fora do padrão, coluna renomeada, célula vazia, referência inexistente) | **FATAL** — corrigir o `flow-map.md` e rodar de novo, quantas vezes for necessário. Não há degradação para erro de conteúdo |
| `check-flowmap.py` retorna **exit 2** (arquivo não encontrado) | **FATAL** — o artefato não foi gerado; gerar |
| Script **ausente** no espelho de skills, sem Python 3 no ambiente, ou **timeout** da execução | **WARNING** — registrar `TOOL_UNAVAILABLE:check-flowmap (motivo curto)` no `sync-log.md`; o `flow-map.md` é **aceito sob revisão humana declarada**: conferir manualmente as 4 seções (colunas na ordem do template, IDs `FLX/ETP/TEL/TRS-\d{3}` únicos, toda referência cruzada existente, nenhuma célula vazia) e registrar `FLOWMAP_VALID: modo=revisao-humana · revisor=<quem> · secoes_conferidas=4` no sync-log. **Nunca** travar a fase por ferramenta ausente (invariante do [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md)) |

Nesse modo degradado as métricas de cobertura não são calculáveis: registrar `etapas_com_tela=n/d · transicoes_com_rn=n/d` e encaminhar a conferência ao `spec-iterate`, que reexecuta o validador na Etapa A. *(Mesma distinção adotada pelo `spec-report` no gate `FLOWMAP_TOOL_UNAVAILABLE` — ferramenta ausente/timeout nunca é reportada como flow-map inválido.)*

**Modo degradado `FLOWMAP_SKIPPED` (produto sem UI):** API pura, batch ou worker — não gerar `flow-map.md`; registrar no `sync-log.md`:

```
FLOWMAP_SKIPPED: motivo=<API pura|batch|worker> · justificativa=<1 frase>
```

**O `motivo=` tem de vir preenchido de verdade:** copiar a linha acima com o placeholder `<API pura|batch|worker>`
intacto **não** desliga o gate — o `check-outputs.py` rejeita placeholder pela mesma regra que aplica ao `kickoff:`.
O marcador vale em linha própria ou abrindo a célula da coluna **Modo / contexto** da Seção A; citá-lo no meio de
uma frase, dentro de bloco de código, ou numa coluna de exemplo/anti-padrão **não** desliga o gate. E a linha
`FLOWMAP_VALID:` (emitida quando o produto tem UI) tem precedência sobre ele.

*(Produto **com** UI nunca emite `FLOWMAP_SKIPPED` — validador ausente usa `TOOL_UNAVAILABLE:check-flowmap`, não este código.)*

---

## Passo 5 — Roadmap Now / Next / Later (critério de corte)

**Método:** `roadmap-cut`. O horizonte de cada iniciativa não é opinião — segue critério objetivo, e **cada item referencia RF/MOD**:

| Horizonte | Critério de corte | Referência obrigatória |
|-----------|-------------------|------------------------|
| **Now** | `Must` da jornada crítica + pré-requisitos técnicos que a habilitam | RF-MOD-XXX-NN / MOD-XXX |
| **Next** | `Should` ligados a KRs (contribuem para a árvore NSM) | RF-MOD-XXX-NN + KR |
| **Later** | `Could` / apostas ainda não validadas | MOD-XXX / QA-NN |

Registrar no `product-vision.md` seção 8, com a coluna de RF/MOD referenciado por linha.

---

## Passo 6 — Consolidação e bandas operacionais

Antes do handoff, conferir todas as métricas do fluxo contra a **tabela de bandas operacionais** em [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md) §7 (% de Musts por módulo, personas primárias, KRs por objetivo, job stories por persona, RNF com medida completa, RN Derivação com algoritmo). Faixa 🔴 → corrigir ou justificar com `QA-NN` antes de encerrar.

---

## Saídas (6 arquivos)

| Arquivo | Template |
|---------|----------|
| `outputs/spec/modules.md` | [`templates/modules.md`](templates/modules.md) |
| `outputs/spec/product-vision/product-vision.md` | [`templates/product-vision.md`](templates/product-vision.md) |
| `outputs/spec/business-rules.md` | [`templates/business-rules.md`](templates/business-rules.md) |
| `outputs/spec/requirements/requirements.md` | [`templates/requirements-functional.md`](templates/requirements-functional.md) |
| `outputs/spec/product-requirements/product-requirements.md` | [`templates/product-requirements.md`](templates/product-requirements.md) |
| `outputs/spec/flow-map.md` *(omitido só em `FLOWMAP_SKIPPED`)* | [`templates/flow-map.md`](templates/flow-map.md) |

---

## Definição de pronto

A lista de fechamento são os **Validators** abaixo — conferir cada código FATAL e WARNING um a um,
inclusive as linhas de sync-log que eles exigem (`modulos-kickoff:`, `PROSE_LINTED`,
`FLOWMAP_VALID`/`FLOWMAP_SKIPPED`, `PR_FIELD_INVENTORY: n/a` quando aplicável). Além deles:

- [ ] Passo 0 executado: premissas da visão derivadas dos dados, 3 perguntas de validação respondidas
- [ ] `requirements.md` com **matriz insumo→RF** preenchida (ou `QA-NN` em `## Questões em aberto`) e **tabela TO-BE de negócio**
- [ ] Mapa de telas/jornadas do insumo (se existir): cada entrada mapeada a ≥ 1 RF ou `QA-NN` na matriz de cobertura
- [ ] Toda RN nova com origem identificável (prototype.md, benchmark.md, F-xxx ou decisão explícita)
- [ ] **Bandas operacionais** conferidas contra `../tools/references/spec-requirements-depth.md` §7; faixas 🔴 corrigidas ou justificadas com `QA-NN`
- [ ] Nenhum RF/PR descreve contrato de API, stack ou detalhe de segurança de baixo nível (fronteira negócio/técnico)

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia handoff (não registrar no sync-log, não recomendar próxima skill)

| Código | Verificação |
|--------|-------------|
| `MODULES_KICKOFF_CONFIRMED` | Linha `modulos-kickoff:` registrada em `sync-log.md` (Passo 0.5) antes de iniciar o Passo 1 |
| `MOORE_FORMAT_PRESENT` | `product-vision.md` tem declaração de visão em formato Moore completa (6 linhas) |
| `VPC_EVIDENCE` | Value Proposition Canvas: nenhuma célula de Jobs/Pains/Gains sem evidência `F-xxx`/`PD-xxx` |
| `RN_DERIVATION_HAS_ALGORITHM` | Toda RN tipo Derivação tem campo Algoritmo em passos numerados (ref §5) |
| `RF_SINGULAR` | Nenhum RF com dois resultados observáveis distintos (ref §1-2) |
| `RNF_HAS_MEASURE` | Todo RNF de negócio tem medida numérica na parte "resposta" do cenário de 6 partes (ref §4) |
| `SCOPE_TABLES_BOTH` | Escopo É / Não É com ambas as tabelas preenchidas |
| `BUSINESS_RULES_SECTIONS` | `business-rules.md` tem Seção A (legado, quando aplicável) + Seção B (novo produto) |
| `MODULES_CATALOG_OK` | `modules.md` gerado e `python3 ../tools/check-modules.py` retorna `"ok": true` — o script confere o catálogo **e** a consistência dos códigos `MOD-XXX` entre `requirements.md`, `product-requirements.md` e `business-rules.md`. Script indisponível → `TOOL_UNAVAILABLE:check-modules` no sync-log e conferência manual dos códigos nos quatro documentos (rebaixa para WARNING) |
| `MODULE_SECTIONS_PRESENT` | `requirements.md` tem seção `## Módulo:` com pelo menos um `RF-MOD-XXX-NN` para cada módulo do índice |
| `RF_THREE_BDD` | Todo RF tem os 3 cenários BDD (feliz / alternativo / erro de negócio) |
| `MODULE_GATE` | Todo módulo do índice tem **≥ 1 RF Must** ou `QA-NN` em `## Questões em aberto` justificando ausência |
| `FLOWMAP_VALID` | *(só quando o produto tem UI)* `flow-map.md` existe e `check-flowmap.py` retorna exit 0 — semântica completa (exit 1/2, validador ausente → WARNING `TOOL_UNAVAILABLE:check-flowmap`, produto sem UI → `FLOWMAP_SKIPPED`) na tabela de degradação do Passo 4.7 |
| `NO_GAP_MINTED` | Nenhum `GAP-XXX` criado por esta skill — apenas `QA-NN` em `## Questões em aberto` |
| `SYNC_LOG_UPDATED` | Linha agregada adicionada na Seção A do `sync-log.md` |

### WARNING — não bloqueia; sinalizar na Definição de pronto

| Código | Verificação |
|--------|-------------|
| `PR_SIX_UI_STATES` | Cada PR documenta os 6 estados de UI obrigatórios (estrutura canônica no template) |
| `PR_FIELD_INVENTORY` | Cada PR de tela com **Inventário de campos** conforme as regras do Passo 4 (tipo em todas as linhas, opções transcritas, Grid/filtros); produto sem UI → linha própria `PR_FIELD_INVENTORY: n/a` no sync-log |
| `PR_ETAPA_FLUXO` | *(só cobrado **após** o Passo 4.7 concluir)* Todo PR de tela com `ETP-xxx` existentes no `flow-map.md` — semântica do marcador `— (pendente Passo 4.7)` e das exceções no Passo 4. Inventar `ETP-xxx` é violação |
| `NSM_TREE` | Nenhuma input metric da árvore NSM sem `MOD-XXX` associado |
| `KR_HAS_BASELINE` | Todo KR tem baseline (`F-xxx`) ou marcação explícita `sem baseline` + `QA-NN` |
| `RF_EARS_PATTERN` | Todo RF usa exatamente 1 dos 5 padrões EARS (ref §2) |
| `MUST_INFLATION` | `Must` ≤ 50% dos RFs por módulo (ref §6-7) |
| `RF_RNF_MATRIX` | Matriz RF↔RNF presente em `requirements.md` |
| `PROTOTYPE_READ` | `prototype.md` lido integralmente antes de redigir os 6 artefatos, quando existir |
| `PROSE_LINTED` | Lint de prosa executado conforme o Passo 4.5 (carga dos estilos confirmada, triagem 🟡/⚪, relint do delta) e linha `PROSE_LINTED:` no sync-log |

---

## O que NÃO faz

- Não desenha arquitetura TO-BE, RNF técnico profundo, contratos de API ou stack — fronteira negócio/técnico (ver tabela no início da skill)
- Não cria `GAP-XXX` — essa numeração é exclusiva de `spec-iterate`; lacunas entram como `QA-NN` em `## Questões em aberto`
- Não documenta o AS-IS do legado — isso é `spec-legacy`; aqui só se consulta `legacy.md`/`legacy-analysis.md` como insumo
- Não analisa mercado ou concorrência — isso é `spec-benchmark`; aqui só se consome `benchmark.md` como insumo
- Não gera protótipo, código ou telas — isso é `spec-prototype`; aqui só se lê `prototype.md` quando existir
- Não gera backlog, tasks ou work items — fase posterior (`spec-tasks` em diante)

---

## Skills irmãs

| Skill | Consome | Produz |
|-------|---------|--------|
| `spec-ingest` | — | `discovery-document.md`, `context-map.md` — insumos de visão, RF e RN |
| `spec-legacy` | — | `legacy.md` (RN legado), `legacy-analysis.md` (Reuse/Replace/Retire), `threat-model.md` (RNF de compliance) — quando existir legado |
| `spec-benchmark` | — | `benchmark.md` — posicionamento, gaps de paridade, modelo de negócio |
| `spec-prototype` | `product-vision.md`, `requirements.md`, `product-requirements.md` (ramo A) | `prototype.md` — leitura obrigatória antes de redigir os 6 artefatos, quando existir |
| `spec-iterate` | `product-vision.md`, `business-rules.md`, `requirements.md`, `product-requirements.md`, `modules.md` | `GAP-XXX` a partir dos `QA-NN` registrados; rerroda esta skill só com tag `⚠️ REQUER spec-product` |
| `spec-tech-rules` | `requirements.md`, `product-requirements.md` (Fase 6.5) | `tech-rules/*.mdc` — regras técnicas de implementação |

---

## Próxima etapa

→ **`spec-prototype`** (se ainda não rodou) ou **`spec-iterate`** (reconciliação e GAPs).
