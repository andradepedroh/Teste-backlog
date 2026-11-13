# Regras de Negócio — [Nome do Projeto]

Status: draft
Última atualização: YYYY-MM-DD
Total de RN: 0 legado · 0 novo produto
Fonte: legacy.md (Dim. 8), prototype.md, benchmark.md, context-map.md (F-xxx)

---

## Seção A — Regras do Legado

*(Consolidação das `RN-[DOMÍNIO]-NNN` da Dimensão 8 do `legacy.md`. Só consolidar — não inventar regras novas aqui. **Omitir esta seção inteira quando não há legado.**)*

<!-- id: br-legacy -->

### Domínio: [Nome do Domínio]

#### RN-[DOMÍNIO]-001: [Título curto]

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-XXX *(código alinhado ao índice de `requirements.md`; opcional se RN só transversal)* |
| **Origem** | F-xxx — legacy.md Dim. 8 §[domínio] |
| **Domínio** | |
| **Tipo** | Fato / Restrição / Derivação / Inferência / Gatilho *(taxonomia BRG — ver [`../../tools/references/spec-requirements-depth.md`](../../tools/references/spec-requirements-depth.md) §5)* |
| **Enunciado** | *(SE X ENTÃO Y — sempre condicional clara)* |
| **Algoritmo** | *(**obrigatório se Tipo = Derivação** — passos numerados: 1. … 2. … 3. …; validador `RN_DERIVATION_HAS_ALGORITHM` = FATAL)* |
| **Exceções** | |
| **Conflitos** | |
| **Vinculada a** | HU-XXX, FL-XXX |
| **Fonte regulatória** | *(lei, norma, contrato — quando aplicável)* |
| **Status no novo produto** | Mantida / Adaptada / Substituída / Descontinuada |

---

*(Repetir bloco `### Domínio:` + `#### RN-*` para cada domínio do legado.)*

---

## Seção B — Regras do Novo Produto

*(Regras que o produto novo precisa definir — não existiam no legado, ou são decisões derivadas do protótipo, benchmark e discovery. Toda regra nova deve ter origem identificável.)*

<!-- id: br-new -->

### Domínio: [Nome do Domínio]

#### RN-NOVO-[DOMÍNIO]-001: [Título curto]

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-XXX *(alinhado ao índice modular de `requirements.md`)* |
| **Origem** | *(prototype.md §rota / benchmark.md §diferencial / discovery §4 F-xxx / decisão do cliente CHAT-XXX)* |
| **Domínio** | |
| **Tipo** | Fato / Restrição / Derivação / Inferência / Gatilho *(taxonomia BRG — ver [`../../tools/references/spec-requirements-depth.md`](../../tools/references/spec-requirements-depth.md) §5)* |
| **Enunciado** | *(SE X ENTÃO Y — sempre condicional clara)* |
| **Algoritmo** | *(**obrigatório se Tipo = Derivação** — passos numerados: 1. … 2. … 3. …; validador `RN_DERIVATION_HAS_ALGORITHM` = FATAL)* |
| **Exceções** | |
| **Conflitos** | *(com RNs do legado ou outras RNs novas)* |
| **Vinculada a** | RF-XXX, PR-XXX |
| **Justificativa** | *(por que esta regra é necessária no produto novo)* |

---

*(Repetir para cada RN nova por domínio.)*

---

<!-- id: br-conflicts -->

## Tabela de conflitos cruzados

*(Ao final: toda inconsistência entre Seção A e Seção B, ou entre RNs da mesma seção. Quando não há decisão de negócio ainda, registrar como `QA-NN` em `## Questões em aberto` abaixo — **não** atribuir `GAP-XXX` diretamente; essa numeração formal é responsabilidade exclusiva do `spec-iterate`.)*

| RN A | RN B | Tema do conflito | Resolução |
|------|------|------------------|-----------|
| | | | QA-NN ou decisão tomada |

---

<!-- id: br-open-questions -->

## Questões em aberto

*(Conflitos ou lacunas de regra ainda sem decisão de negócio. **Não** atribuir `GAP-XXX` aqui — a formalização como GAP é responsabilidade exclusiva do `spec-iterate`. Usar `QA-NN` como referência provisória interna.)*

| QA | RNs envolvidas | Descrição | Sugestão de tratamento |
|----|-----------------|------------|-------------------------|
| QA-01 | | | |
