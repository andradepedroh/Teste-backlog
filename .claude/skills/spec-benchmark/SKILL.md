---
name: spec-benchmark
description: >
  spec-benchmark (Fase 4 — Benchmark de mercado) — Análise de mercado focada: 1 saída — benchmark.md. Pesquisa web obrigatória quando faltar
  material em inputs/. Seis etapas: concorrentes (diretos/indiretos/status quo SEMPRE incluído),
  dimensões de comparação, matriz de features com legenda e score 0-3, qualidade de fontes A/B/C/D,
  análise de modelo de negócio dos concorrentes, tendências de mercado, mapa 2×2 Mermaid,
  gaps (paridade/diferenciais/oportunidades), recomendações em Pyramid Principle.
  Conteúdo humano gerado em Português do Brasil.
version: "1.2"
updated: "2026-10-20"
---

# spec-benchmark — Análise Competitiva de Mercado

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §4). Ao terminar, adicionar UMA linha: `| # | data | spec-benchmark | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`. Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md) seção «Sync-log como memória cross-cutting».

## Papel

Traduzir `discovery-document.md` + `legacy.md` (`F-xxx`) em **um quadro de mercado** que oriente decisões de posicionamento, paridade de features, modelo de negócio e build/buy.

**Regra de ouro:** se o leitor pergunta "como o mercado resolve este problema, incluindo continuar como está hoje?", a resposta tem que estar em `benchmark.md`.

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

Vale para o `benchmark.md`: cada comparativo abre com a conclusão em uma frase, antes da tabela; cada recomendação diz o que fazer e por que importa, sem nome de produto ou de tecnologia sem explicação.

## Entradas obrigatórias

1. **`outputs/spec/discovery-document.md`** — problema central, atores, candidatos a RF
2. **`outputs/spec/context-map.md`** — `F-xxx` para rastreio
3. **`outputs/spec/legacy.md`** *(quando existir)* — domínios, fluxos, falhas, KPIs do AS-IS
4. **Material de pesquisa** *(quando houver — URLs de concorrentes, prints de UI, materiais comerciais; a ausência não bloqueia: ativa um dos modos degradados abaixo)*

---

## Pesquisa externa — método obrigatório

Quando não houver pacote fechado de evidências de mercado em `inputs/`, o agente **deve ir à internet** de forma **repetível e citável**:

| Passo | O que fazer |
|-------|-------------|
| 1 | Extrair do `discovery-document.md` os termos de mercado e montar **queries** (ex.: `"[categoria] software B2B"`, `"[concorrente] pricing"`, `"[produto] vs [alternativa]"`). |
| 2 | Para cada concorrente, abrir **fontes primárias**: site oficial, docs, página de preços, centro de ajuda, release notes. |
| 3 | Ler seções relevantes e **traduzir para linhas da matriz** — sem atribuir capacidade que não apareça na fonte. |
| 4 | Garantir que cada linha importante da matriz tem **URL** na coluna Fonte. |
| 5 | Incluir subsecção **«Método de pesquisa»** no `benchmark.md`: data, queries usadas, URLs-base por concorrente. |

---

## Modos de operação

| Modo | Quando ocorre | Comportamento |
|------|----------------|----------------|
| **Full** | Há acesso à internet e/ou pacote de evidências em `inputs/` | Pesquisa externa conforme método obrigatório acima; fontes A/B/C predominam; matriz com URLs reais |
| **Degradado-sem-web** | Sem acesso à internet e sem pacote de evidências em `inputs/` | Benchmark construído só com `inputs/` existentes + conhecimento geral do agente; **toda célula da matriz recebe fonte nível D**; documento abre com o banner `⚠️ BENCHMARK-PRELIMINAR` e cada afirmação sem fonte também vai para `## Questões em aberto` |
| **Degradado-nicho-sem-fontes** | Mercado nicho/vertical sem concorrentes documentados publicamente (ex.: fornecedor único, mercado regulado fechado) | Registrar a ausência de fontes como achado (não como falha do agente); Status Quo passa a ser o comparador central; recomendações ficam condicionadas a validação posterior com o cliente |

**Banner obrigatório em modo Degradado (qualquer variante):**
```
⚠️ BENCHMARK-PRELIMINAR — gerado sem pesquisa externa completa (modo Degradado).
Toda célula sem fonte real tem confiança D. Validar com pesquisa real antes de decisões de investimento.
```

---

## Passo 0 — Definir a pergunta estratégica

**Antes de começar**, definir explicitamente o que este benchmark precisa responder.

**Framework de escolha** (quando há múltiplas perguntas possíveis):

| Pergunta | Quando priorizar |
|----------|-----------------|
| **Posicionamento** | Ainda não decidimos onde nos colocamos no mercado |
| **Roadmap / paridade de features** | Time precisa saber o que construir primeiro |
| **Modelo de negócio / pricing** | Definição comercial em aberto |
| **Build / buy** | Considerando comprar em vez de construir |
| **Validação de diferencial** | Temos uma hipótese de diferenciação a confirmar |

Se mais de uma se aplica → responder a mais bloqueante primeiro; as demais viram seções secundárias. **Registrar a pergunta no cabeçalho do `benchmark.md`.**

---

## Passo 1 — Identificar concorrentes

```
Diretos    → Mesmo mercado, mesma proposta, mesma persona (máx. 3-5)
Indiretos  → Resolvem o mesmo problema de outra forma
Status Quo → O que o cliente faz hoje sem solução nenhuma (SEMPRE incluir)
```

**Status quo é quase sempre o concorrente mais relevante** — "continuar como está" é a alternativa real para a maioria das compras. Vem direto do `legacy.md` (AS-IS do cliente) ou do `discovery-document.md` Seção 5 (Sistemas Existentes) (quando não há legacy).

---

## Passo 2 — Definir dimensões de comparação

Construir a partir de **três fontes** (não inventar lista genérica):

1. **Transcrições** — o que stakeholders disseram que importa (`F-xxx` do `context-map.md`)
2. **JTBD das personas** — vem do `legacy.md` Dim. 2 ou do `discovery-document.md`
3. **O que os próprios concorrentes enfatizam** — vem da pesquisa

Agrupar em: Funcionalidade Core · Integrações · UX/Usabilidade · Performance · Segurança/Compliance · Modelo Comercial · Suporte · Escalabilidade.

### Método nomeado — Pontuação Ponderada da Matriz (Weighted Matrix Score)

Cada dimensão recebe um **peso de 1 a 3**, atribuído e justificado a partir da pergunta estratégica definida no Passo 0.

| Peso | Critério |
|------|----------|
| 3 | Decide diretamente a pergunta estratégica do Passo 0 |
| 2 | Influencia a decisão mas não é determinante isolada |
| 1 | Contexto — informa, não decide |

**Fórmula:**

```
score(alternativa) = Σ(peso_dim × score_dim) / Σ pesos
```

Onde `score_dim` é o score 0-3 da dimensão (Passo 3) para a alternativa/concorrente, e `peso_dim` é o peso atribuído acima. Registrar pesos e justificativa junto à matriz — todo peso cita a pergunta estratégica que o justifica (verificado por `MATRIX_WEIGHTED`).

---

## Passo 3 — Matriz de features

Cabeçalho da matriz (9 colunas, incluindo Status Quo, domínio do legacy, `F-xxx`, URL e
confiança), legenda ✅/🟡/❌/🔷 e a escala de score 0-3 estão prontos no template — preencher lá.
Exemplo de linha: `[Feature 1] | ✅ | ✅ | 🟡 | ❌ | Pagamentos | F-012 | https://... | A`.
Não usar média simples como decisão final (usar a fórmula ponderada do Passo 2).

---

## Passo 4 — Análise de modelo de negócio dos concorrentes

Para cada concorrente relevante, preencher a tabela do template (modelo comercial, ticket médio,
segmento-alvo, expansão de receita, fonte — incluindo a linha do Status Quo com custo de
horas/mês). **O que analisar:**
- Modelo (freemium, assinatura, pay-per-use, licença, serviço)
- Ancoragem de preço (por usuário, por transação, por volume, por empresa)
- Como o concorrente cresce dentro de um cliente (land and expand, upsell, seat expansion)
- Custo oculto do status quo (horas, erros, retrabalho) — sempre quantificar quando `F-xxx` tiver dado

---

## Passo 5 — Tendências de mercado

Seção obrigatória — não deixar em branco. Tabela de categorias (regulatória, tecnológica,
comportamental, momentum) pronta no template, com fonte por linha.

**Sinais de momentum:**
- Concorrentes recebendo investimento → mercado em crescimento
- Grandes players adquirindo ferramentas da categoria → consolidação
- Saída de players → segmento saturado ou commodity

### Porter 5 Forças

Tabela obrigatória (as 5 forças × evidência A/B/C/D × implicação) — pronta no template. Situa o
produto na estrutura competitiva do mercado, além da comparação feature-a-feature.

---

## Passo 6 — Qualidade das fontes

| Nível | Fonte | Como usar |
|-------|-------|-----------|
| A | Documentação oficial, pricing oficial, demo gravada | Evidência forte |
| B | Case público, release note, material comercial | Evidência boa, pode ser enviesada |
| C | Review de usuário, fórum, blog | Sinal — confirmar quando afetar decisão |
| D | Suposição sem fonte | Registrar como hipótese ou em `## Questões em aberto` |

---

## Passo 7 — Mapa de posicionamento 2×2

`quadrantChart` Mermaid com os players posicionados — esqueleto (com eixos placeholder) no
template. **Os eixos nunca vêm de exemplo**: são derivados pela regra abaixo.

### Método nomeado — Eixos por Variância (Objective Axes Rule)

Os eixos do mapa **não são escolha arbitrária**: entre as dimensões de comparação do Passo 2/3, escolher as **2 dimensões de maior variância** entre os players mapeados (nosso produto + concorrentes + status quo) — isto é, aquelas cujos scores 0-3 mais se diferenciam entre os players. Calcular a variância (ou, como proxy simples, a amplitude máx-mín) dos scores de cada dimensão entre os players e selecionar as 2 maiores. Documentar, junto ao mapa, qual dimensão foi escolhida para cada eixo e o valor de variância/amplitude que a justificou.

**Escolha eixos que distribuam os players heterogeneamente** — a regra da variância acima é o critério objetivo para isso.

---

## Passo 8 — Análise de gaps e recomendações

**Nota de escopo:** as "três categorias de gaps" abaixo são lente analítica de mercado, não IDs
de backlog (regra de `GAP-XXX` em «O que NÃO faz»); suposições sem fonte vão para
`## Questões em aberto`.

### Três categorias de gaps

**Paridade** (sem eles nem somos considerados) · **Diferenciais** (o que temos que outros não
têm) · **Oportunidades** (ninguém serve bem ainda — potencial Blue Ocean). As três seções, com as
frases de orientação, estão prontas no template.

### ERRC Grid (Eliminar / Reduzir / Elevar / Criar — Blue Ocean)

Usar as 3 categorias de gaps acima como insumo direto da grade — cada quadrante deriva de uma categoria específica:

| Quadrante | Pergunta | Insumo (a partir dos gaps) |
|-----------|----------|------------------------------|
| **Eliminar** | Que fatores dados como certos pela indústria devem ser eliminados? | Funcionalidades/processos que geram custo sem diferenciar (contraste com Status Quo/Diferenciais) |
| **Reduzir** | Que fatores devem ser reduzidos bem abaixo do padrão da indústria? | Gaps de paridade de baixo valor percebido pelo cliente — investir o mínimo necessário |
| **Elevar** | Que fatores devem ser elevados bem acima do padrão da indústria? | Diferenciais já identificados — aprofundar a vantagem |
| **Criar** | Que fatores nunca oferecidos pela indústria devem ser criados? | Oportunidades (Blue Ocean) identificadas acima |

As recomendações em Pyramid Principle abaixo devem indicar, quando aplicável, o quadrante ERRC que sustentam.

### Recomendações em Pyramid Principle

Cada recomendação = assertiva de posicionamento (não pergunta) + "Por quê" com evidências
`F-xxx`/fonte A-B + "Implicações" ligando a RF/RNF/Visão do `spec-product` — bloco pronto no
template.

---

## Estrutura final do `benchmark.md` (3 blocos)

| Bloco | Conteúdo |
|-------|----------|
| **1. Discovery resumido** | Referência cruzada a `discovery-document.md` (não duplicar) |
| **2. Mercado** | Passos 0-8 acima |
| **3. Estratégia** | Posicionamento, será/não será, trade-offs, métricas com baseline |

---

## Saída

| Arquivo | Template em |
|---------|-------------|
| **`outputs/spec/benchmark.md`** | [`templates/benchmark.md`](templates/benchmark.md) |

---

## Definição de pronto

A lista de fechamento são os **Validators** abaixo — conferir cada código FATAL e WARNING um a um.
Item sem validator próprio: suposições sem fonte (nível D) e decisões pendentes consolidadas em
`## Questões em aberto`.

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia emissão

| Código | Verificação |
|--------|-------------|
| `RESEARCH_METHOD_LOGGED` | Método de pesquisa registrado (queries + datas + URLs-base) quando houve pesquisa externa |
| `STRATEGIC_QUESTION_DEFINED` | Pergunta estratégica do Passo 0 registrada no cabeçalho do `benchmark.md` |
| `STATUS_QUO_IN_MATRIX` | Status Quo presente como concorrente na matriz de features (Passo 3) |
| `MATRIX_LEGEND_PRESENT` | Legenda ✅/🟡/❌/🔷 e score 0-3 presentes junto à matriz |
| `SOURCE_LEVEL_PER_CELL` | Toda célula relevante da matriz tem nível de fonte A/B/C/D |
| `BUSINESS_MODEL_PER_COMPETITOR` | Análise de modelo de negócio preenchida para cada concorrente relevante (Passo 4) |
| `TRENDS_MIN_TWO_CATEGORIES` | Seção de tendências (Passo 5) preenchida com no mínimo 2 categorias |
| `QUADRANT_AXES_HETEROGENEOUS` | Mapa 2×2 (Passo 7) usa eixos que distribuem os players de forma não degenerada |
| `GAPS_THREE_CATEGORIES` | Gaps (Passo 8) cobrem as 3 categorias: paridade, diferenciais, oportunidades |
| `RECOMMENDATIONS_PYRAMID_LINKED` | Recomendações em Pyramid Principle, cada uma ligada a RF/RNF/Visão em `spec-product` |
| `NO_GAP_IDS_CREATED` | Nenhum `GAP-XXX` novo criado por esta skill — só referência a IDs existentes |
| `SYNC_LOG_UPDATED` | Linha adicionada em `sync-log.md` Seção A com pergunta estratégica + posicionamento recomendado |

### WARNING — não bloqueia, vai na seção «Avisos»

| Código | Verificação |
|--------|-------------|
| `LOW_CONFIDENCE_MAJORITY` | Mais da metade das células da matriz com fonte nível D (hipótese sem fonte) |
| `SINGLE_SOURCE_PER_COMPETITOR` | Concorrente relevante analisado a partir de uma única fonte |
| `DEGRADED_MODE_ACTIVE` | Execução em modo Degradado-sem-web ou Degradado-nicho-sem-fontes (ver `## Modos de operação`) |
| `BLOCO1_DUPLICATES_DISCOVERY` | Bloco 1 do `benchmark.md` duplica (em vez de referenciar) conteúdo de `discovery-document.md` |
| `MATRIX_WEIGHTED` | Pesos 1-3 por dimensão definidos e justificados pela pergunta estratégica (Passo 2), e `score(alternativa)` calculado pela fórmula ponderada |
| `AXES_JUSTIFIED` | Eixos do mapa 2×2 (Passo 7) correspondem às 2 dimensões de maior variância entre os players, com variância/amplitude documentada |

---

## Skills irmãs

| Skill | Fase | Relação com `spec-benchmark` |
|-------|------|-------------------------------|
| `spec-ingest` | 1 | Provê `discovery-document.md` e `context-map.md` (`F-xxx`) consumidos aqui |
| `spec-legacy` | 2 | Provê `legacy.md` (quando há legado) — status quo, domínios, KPIs do AS-IS |
| `spec-prototype` | 4 | Consome a pergunta estratégica e o posicionamento recomendado (ramo protótipo-primeiro) |
| `spec-product` | 5 | Consome recomendações para RF/RNF/Visão (ramo documentação-primeiro) |
| `spec-iterate` | (cross) | Converte `## Questões em aberto` em `GAP-XXX`; reabre o benchmark se o posicionamento mudar |

---

## O que NÃO faz
- Não cria IDs `GAP-XXX` — apenas referencia GAPs existentes ou registra em `## Questões em aberto`
- Não decide requisitos funcionais/não funcionais — apenas recomenda insumos para RF/RNF em `spec-product`
- Não substitui `spec-legacy` — usa o AS-IS já produzido, não analisa o legado
- Não gera protótipo ou UI — isso é `spec-prototype`
- Não define arquitetura ou stack técnica
- Não persiste pesquisa fora de `benchmark.md` — capturas avulsas (prints, PDFs) ficam em `inputs/`

---

## Próxima etapa

→ **`spec-product`** (ramo doc-first) ou **`spec-prototype`** (ramo proto-first).
