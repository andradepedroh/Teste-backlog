---
name: spec-estimate
description: >-
  spec-estimate (Fase 8.5 — Estimativa Preditiva & Engenharia de Delivery). Use sempre que houver pedido de prazo, custo, esforço, dimensionamento de equipe, paralelização, gargalos, otimização de delivery, dependências, critical path, forecast (P50/P85/P95), confiança ou risco de execução. Complementa planning poker e story points, gerando previsões com base em complexidade, acoplamento, dependências e topologia organizacional. Executa após spec-tasks, consumindo backlog, documentos de produto, legado, modelo de dados e APIs. Gera estimate-report.md, estimate-data.json e estimate-report.html (via cli.mjs; a IA não escreve HTML). Utiliza COCOMO II, CPM/DAG, Brooks, Team Topologies e Monte Carlo. Suporta re-forecast com FlowPulse usando throughput do Azure DevOps e calibração brownfield via outputs/spec/signals/scc.json. Saída em Português do Brasil.
version: "1.7"
updated: "2026-10-20"
---

# spec-estimate — Estimativa Preditiva & Engenharia de Delivery

> **Skill agnóstica de projeto.** Todos os exemplos usam placeholders (`TASK-001`, `MOD-XXX`,
> `BC-XXX`, `SQUAD-001`). **Skill autocontida:** todas as fórmulas, heurísticas e regras de
> interpretação estão neste documento — não é necessário pesquisar metodologias acadêmicas
> em runtime.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) para entender decisões anteriores
(kickoff, ramo escolhido, modo de legado, níveis de backlog em `spec-tasks`). Ao terminar,
adicionar **uma linha agregada** registrando esta execução (forecast emitido, DCI calculado,
recomendações geradas, modo de calibração). Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md)
seção «Sync-log como memória cross-cutting».

## Papel

Esta é a **Fase 8.5** da cadeia técnica — camada de **engenharia de delivery** que opera
**acima das metodologias ágeis tradicionais**. Roda **entre `spec-tasks` (Fase 8)** e
**`spec-tasks-azure` (Fase 9)** ou em **paralelo** a eles.

A skill responde, sobre um backlog já estruturado:

| Pergunta | Métrica produzida no relatório |
|----------|--------------------------------|
| Quanto tempo o projeto realmente leva? | `schedule.p50_days / p85_days / p95_days` |
| Qual o custo estimado? | `cost.p50 / p85 / p95` (faixa em moeda do kickoff) |
| Quanto esforço efetivo é necessário? | `effort.person_months / engineering_hours` |
| Quantas pessoas realmente ajudam? | `team.optimal_size` (curva Brooks) |
| Qual a composição ideal do time? | `team.recommended_topology[]` (Team Topologies) |
| Quais tarefas podem ocorrer em paralelo? | `parallel_streams[]` |
| Qual o limite real de paralelização? | `parallelization_index` + `amdahl_max_speedup` |
| Onde estão os gargalos? | `bottlenecks[]` com score e justificativa |
| Onde existe alto acoplamento? | `coupling.high_coupling_pairs[]` |
| Qual o risco da estimativa? | `risk.schedule_risk_index` + risk register |
| Qual a confiança do delivery? | `delivery_confidence_index` (0-100) |

**Fora de escopo:**
- Gerar tasks, stories ou contratos (use `spec-tasks`, `spec-api-contracts`, `spec-data-model`)
- Publicar backlog em ferramenta externa (use `spec-tasks-azure`)
- Implementar tasks (use `spec-implement`)
- Refazer arquitetura ou requisitos (use `spec-product`, `spec-iterate`)
- Substituir cerimônias ágeis — esta skill **complementa**, não substitui

**Paths de saída (SEMPRE os três — o HTML é padrão, não opcional):**
- `outputs/spec/estimate/estimate-report.md` — relatório executivo (Markdown)
- `outputs/spec/estimate/estimate-data.json` — dados estruturados que alimentam o gerador HTML
- `outputs/spec/estimate/estimate-report.html` — relatório premium navegável (gráficos + grafo), gerado por `cli.mjs`
- Override do diretório base: variável de ambiente `PIPELINE_OUTPUTS_DIR`.

> **Regra do HTML (OBRIGATÓRIA):** ao final de toda execução a skill DEVE emitir também o
> `estimate-report.html`. Ele é produzido de forma determinística pelo gerador Node desta pasta
> (`cli.mjs` + `lib/render-estimate-html.mjs`) a partir do `estimate-data.json` — **a IA não
> escreve HTML manualmente** (mesma filosofia da `spec-tasks-html`). Ver §«Geração do HTML».

> **Regra de idioma:** o relatório `estimate-report.md` é **integralmente em Português do
> Brasil** (descrições, justificativas, recomendações, nomes de gargalos). Códigos de
> validators, IDs de score (ex.: `complexity_score`) e tokens técnicos permanecem em inglês.

> **Regra de evidência (CRÍTICA):** cada métrica DEVE ter rastreabilidade explícita às
> fontes — `taskId`, `RF-XXX`, `RN-XXX`, `MOD-XXX`, `BC-XXX`, `F-xxx` ou `GAP-XXX` (quando já
> existente em `gaps.md`). Esta skill **NÃO** inventa números: deriva de artefatos das fases
> anteriores. Insumo ausente → registrar em Questões em aberto (§7 Avisos do relatório) +
> recomendar rodar `spec-iterate` — nunca chutar. Esta skill **NÃO** cria novos GAP-XXX.

> **Regra de incerteza (CRÍTICA):** todo prazo, custo ou esforço é **faixa probabilística**
> (P50/P85/P95). Número único sem intervalo é falha bloqueante (`NO_POINT_ESTIMATES`).

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

Vale para o `estimate-report.md` e para a devolutiva no chat. As **Regras de legibilidade humana H1–H5** desta skill (mais abaixo) são a aplicação específica desta régua ao relatório executivo — as duas valem juntas: as 10 regras dizem **como escrever a frase**, as H1–H5 dizem **como montar a seção**.

## Pré-requisitos

Esta skill roda **depois** de `spec-tasks` (Fase 8) e consome **cinco grupos de insumo**
produzidos pelas skills anteriores da metodologia:

### Grupo 1 — Backlog estruturado (de `spec-tasks`, Fase 8)

| Insumo | Obrigatório | Consumo |
|--------|-------------|---------|
| `outputs/spec/tasks.json` | Sim | DAG de dependências, complexidade base, top-level para todas as 4 camadas |
| `tasks.json` → `task.effortHours` + `metadata.effortSummary` | Recomendado | **Base bottom-up** (horas por task, manual + IA) para o **cross-check** contra o forecast top-down — ver § "Esforço por task (`effortHours`) — cross-check bottom-up" |

#### Esforço por task (`effortHours`) — cross-check bottom-up

`effortHours.manual`/`.aiAssisted` (por task) + `metadata.effortSummary` (rollup) são a **base
bottom-up** da `spec-tasks` v1.4+. O HDF permanece primário; fórmulas, sinais e regra dura na
seção canônica **«Cross-check bottom-up × top-down»** (Layer 1).

| Situação | Comportamento |
|----------|----------------|
| `effortHours`/`effortSummary` **presentes** | Rodar o cross-check e a sanidade de headcount (`EFFORT_CROSSCHECK_DIVERGENCE` / `HEADCOUNT_SANITY`) |
| **ausentes** (`tasks.json` anterior à v1.4) | Sem cross-check; registrar `NO_EFFORT_BASELINE` (WARNING informativo) |

### Grupo 2 — Documentos negociais (de `spec-product`, Fase 5/5)

| Insumo | Obrigatório | Consumo |
|--------|-------------|---------|
| `outputs/spec/product-vision/product-vision.md` | Recomendado | Personas, escopo (É/Não É), prioridades estratégicas → calibração de risco |
| `outputs/spec/business-rules.md` | Sim | Volume + complexidade de RN → `ruleComplexity` |
| `outputs/spec/requirements/requirements.md` | Sim | RFs + RNF de negócio (SLA, compliance) → effort multipliers |
| `outputs/spec/product-requirements/product-requirements.md` | Recomendado | Estados UI + fluxos alternativos → `uiComplexity` |
| `outputs/spec/modules.md` | Sim | Catálogo modular (MOD-XXX) → bounded contexts → topologia de squads |

### Grupo 3 — Análise de legado (de `spec-legacy`, Fase 2; quando há legado)

| Insumo | Obrigatório | Consumo |
|--------|-------------|---------|
| `outputs/spec/legacy.md` | Quando há legado | Volume AS-IS → `legacy_factor` |
| `outputs/spec/legacy-analysis.md` | Quando há legado | Scorecard Reuse/Replace/Retire → `gap_risk_factor` |
| `outputs/spec/architecture.md` (AS-IS) | Quando há legado | Acoplamento legado → coupling de migração |
| `outputs/spec/threat-model.md` (AS-IS) | Opcional | Riscos de segurança → `risk_register` |
| `outputs/spec/signals/scc.json` | Opcional (gerado por `spec-legacy`) | KLOC + complexidade **medidos** do legado → calibração brownfield do COCOMO II (ver Layer 1) |

### Grupo 4 — Especificação técnica (de `spec-data-model` 6a, `spec-api-contracts` 6b)

| Insumo | Obrigatório | Consumo |
|--------|-------------|---------|
| `outputs/spec/data-model.json` | Recomendado | FKs cross-BC, entidades compartilhadas → acoplamento estrutural |
| `outputs/spec/api-contracts.yaml` | Recomendado | Contratos compartilhados, integrações → `apiComplexity` + coupling |

### Grupo 5 — Contexto cruzado e histórico

| Insumo | Obrigatório | Consumo |
|--------|-------------|---------|
| `outputs/spec/gaps.md` | Quando existir | GAPs abertos → `risk_register` (categoria `gap`) |
| `outputs/spec/sync-log.md` | Sim | Decisões anteriores, kickoff, ramo |
| `delivery-history.json` (throughput real) | Opcional | Calibração Monte Carlo com amostras reais |
| rules do projeto (`.cursor/rules/**` ou `.claude/rules/**`) | Sim | Tech stack → `tooling_maturity` e `team_experience` |

### Modos de operação

| Modo | Insumos | Comportamento |
|------|---------|---------------|
| **Full** | tasks.json + data-model + api-contracts + modules + arch | Todas as camadas; DCI completo |
| **Backlog-only** | tasks.json apenas | Layer 1+2+4; team optimization heurística; warning `NO_ARCH_CONTEXT` |
| **Greenfield-Preliminar** | requirements + modules (sem tasks.json) | Apenas estimativa preliminar; warning `PRELIMINARY_MODE` |
| **Recalibração** | Full + `delivery-history.json` | Monte Carlo com amostras reais; DCI corrigido |
| **Re-forecast** | `estimate-data.json` anterior + backlog publicado no ADO (Fase 9) | Throughput real via FlowPulse (WIQL) → forecast calibrado; compara P50/P85/P95 original × calibrado e registra a deriva no sync-log — ver §«Modo Re-forecast» |

---

## Modo Re-forecast — calibração pós-publicação com throughput real (FlowPulse)

Rodável **a qualquer momento após `spec-tasks-azure` (Fase 9) publicar o backlog no ADO** —
tipicamente ao fim de cada sprint ou antes de renegociar compromissos de prazo. Este modo
**não re-executa as Layers 1–3**: ele recalibra a Layer 4 (forecast) com o throughput
**medido** do projeto e compara com o forecast original.

### Ferramenta: FlowPulse

[FlowPulse](https://github.com/LetPeopleWork/FlowPulse) lê o throughput real do Azure DevOps
via **WIQL** e produz forecast Monte Carlo **calibrado com dados reais**: «quando terminam
N itens» (*When*) e «quantos itens até a data D» (*How Many*).

1. **Obter a ferramenta:** verificar → rota efêmera (`uvx flowpulse …` / `pipx run flowpulse …`,
   registrando `TOOL_EPHEMERAL:flowpulse (uvx)`) → degradar — política e instalação permanente no
   §«Modo degradado (FlowPulse indisponível)» abaixo.
2. **Credenciais:** **reutilizar o `.env` da skill `spec-tasks-azure`** — `AZURE_DEVOPS_ORG`,
   `AZURE_DEVOPS_PROJECT` e `AZURE_DEVOPS_PAT` já existem lá (ver
   [`../spec-tasks-azure/.env.example`](../spec-tasks-azure/.env.example)). Não pedir
   credenciais novamente ao usuário. URL da organização: `https://dev.azure.com/<AZURE_DEVOPS_ORG>`.
3. **Configurar:** a primeira execução de `flowpulse` gera um arquivo de configuração de
   exemplo. Preencher: URL da organização + PAT (do `.env` acima) e a **query WIQL** que
   delimita os itens do projeto (filtrar pelo Epic pai do backlog publicado, área ou tag
   `logical-id:` que a `spec-tasks-azure` grava nos work items), com data de fechamento.
4. **Rodar** `flowpulse` e extrair os percentis calibrados (P50/P85/P95) do *When* para o
   total de itens restantes do backlog.

### Relatório do re-forecast (obrigatório)

Acrescentar/atualizar a seção **«Re-forecast»** no `estimate-report.md` com a tabela
comparativa **original × calibrado** — os valores originais vêm de
`outputs/spec/estimate/estimate-data.json` (nunca de memória):

| Percentil | Forecast original (data) | Re-forecast calibrado (data) | Deriva (dias úteis) |
|-----------|--------------------------|------------------------------|---------------------|
| P50 / P85 / P95 | … | … | ±N |

Interpretar a deriva em linguagem de negócio (Regra H5) e, se a deriva de P85 exceder ±10%
do prazo original, recomendar as ações correspondentes (§6 Recomendações) e/ou re-rodar a
skill completa em modo Recalibração.

**Registrar a deriva no `sync-log.md`** (Seção A):

```
re-forecast: itens_concluidos=<n>/<total> · p50=<orig>→<calib> · p85=<orig>→<calib> · p95=<orig>→<calib> · deriva_p85=<±N dias> · fonte=<flowpulse|csv-manual>
```

### Modo degradado (FlowPulse indisponível)

Seguir a política de [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md):
**verificar → rota efêmera → degradar**. Verificar `flowpulse --version`; ausente → **rota efêmera**
(não muta o ambiente, dispensa aprovação e não gera `TOOL_INSTALLED`): `uvx flowpulse …` ou
`pipx run flowpulse …`. Instalação permanente (`pip install flowpulse` em venv do projeto) só é
**oferecida** ao usuário e executada com aprovação registrada
(`TOOL_INSTALLED:flowpulse (aprovado por <quem>, <comando>)`) — nunca `--break-system-packages`.
Só quando nem a rota efêmera funciona (sem `uv`/`pipx`, sem rede, política do ambiente):
registrar **`TOOL_UNAVAILABLE:flowpulse (motivo curto)`** no `sync-log.md` e seguir uma das
rotas — nunca é gate FATAL:

1. **Export CSV manual do ADO:** exportar via query de work items fechados (com
   `Closed Date`) do Epic do projeto; agregar o throughput por semana e gravar as amostras em
   `delivery-history.json`; rodar esta skill em modo **Recalibração** (Monte Carlo próprio da
   skill, mesmos passos da Layer 4 — o `cli.mjs` regenera o HTML a partir do
   `estimate-data.json` atualizado). Registrar `fonte=csv-manual` na linha `re-forecast:`.
2. **Sem acesso ao ADO:** registrar o bloqueio no `sync-log.md`
   (`re-forecast: BLOQUEADO · motivo=<…>`) e manter o forecast original, sinalizando na seção
   «Avisos» do relatório que o forecast está sem calibração real.

---

## Kickoff de calibração (OBRIGATÓRIO antes de gerar)

Antes de ler `tasks.json`, executar este kickoff. **Sem confirmação destas cinco decisões a
skill não emite forecast.**

### Passo K1 — Análise automática

Ler `outputs/spec/sync-log.md`, `tasks.json/metadata` e `modules.md`. Apresentar:

- Modo detectado (Full / Backlog-only / Greenfield-Preliminar / Recalibração)
- Total de epics/features/stories/tasks identificados
- Total de módulos (MOD-*) e bounded contexts (BC-*)
- Presença de `data-model.json`, `api-contracts.yaml` e `delivery-history.json`
- Presença de `outputs/spec/signals/scc.json` (calibração brownfield — ver Layer 1)
- Modo de legado (Sim/Parcial/Não — de `legacy.md`)

### Passo K2 — Calibração

Apresentar ao usuário:

> "Para calibrar o forecast, preciso de cinco decisões:
>
> **1. Throughput baseline**
>    - [ ] Histórico (`delivery-history.json` detectado)
>    - [ ] Reference class (projeto similar do tenant)
>    - [ ] Cold start (heurística — recomenda recalibração após Sprint 1)
>
> **2. Custo médio do engenheiro/mês** (base para `cost_estimate`)
>    - [ ] R$ 30.000/mês (default sênior BR)
>    - [ ] Outro: _________
>
> **3. Apetite de risco**
>    - [ ] Conservador — reportar P85 como compromisso externo
>    - [ ] Balanceado — interno P50, externo P85 *(recomendado)*
>    - [ ] Agressivo — externo P50 (alto risco)
>
> **4. Fator de realismo de duração (HDF)** — apenas para cenário convencional
>    - [ ] Usar valor derivado automaticamente do backlog *(recomendado)*: `HDF = X,X`
>          *(calculado a partir de avg_api_ops, avg_biz_rules, avg_ext_int)*
>    - [ ] Ajustar manualmente: _________
>    - *(Para IA-assistida, HDF = 1,0 sempre — não perguntar)*
>    - *(Se o `tasks.json` trouxer `effortHours`, existe uma **base bottom-up** que será usada como
>      **cross-check** do resultado com HDF — o HDF segue primário; ver § "Esforço por task
>      (`effortHours`) — cross-check bottom-up". Se divergir muito, o relatório sinaliza.)*
>
> **5. Modo de implementação**
>    - [ ] Convencional — time humano implementa (padrão histórico)
>    - [ ] IA-assistida — `spec-implement` executa tasks via agente IA (Cursor/Claude Code);
>          humanos orquestram, revisam e resolvem bloqueios
>    - [ ] Ambos — gerar os dois cenários lado a lado no relatório *(recomendado para projetos
>          que ainda estão decidindo o modelo de execução)*
>
> Confirma?"

### Passo K3 — Persistência

Gravar no cabeçalho do relatório (Seção 9.1 — Parâmetros de calibração).

---

## Dois cenários, quatro layers cada

Quando o kickoff K2 seleciona modo **IA-assistida** ou **Ambos**, as **4 layers são executadas
duas vezes** — uma para o cenário convencional (time humano) e uma para o cenário IA-assistida
(`spec-implement`). Cada layer tem premissas diferentes para cada cenário. Os resultados
são exibidos lado a lado no relatório.

```
                    ┌─────────────────────────────────┐
                    │         CENÁRIO HUMANO          │
                    │  Layer 1 → 2 → 3 → 4            │
                    │  Devs, squads, Brooks, Monte     │
                    └─────────────────────────────────┘
                    ┌─────────────────────────────────┐
                    │       CENÁRIO IA-ASSISTIDA       │
                    │  Layer 1IA → 2IA → 3IA → 4IA    │
                    │  Agentes, orquestradores, DCI_IA │
                    └─────────────────────────────────┘
```

### Premissas base do modo IA (usadas em todas as layers)

O agente `spec-implement` (Cursor / Claude Code) executa tasks do backlog autonomamente,
com loops de revisão humana. Velocidade por tipo de task:

| Tipo | Multiplicador | Faixa | Confiança | Base empírica |
|------|--------------|-------|-----------|---------------|
| `backend` | **2,0×** | 1,5–3× | 🟢 Alta | CRUD, endpoints REST com spec rica: bem dominado; complexidade regulatória reduz ganho |
| `test` | **2,5×** | 2–3× | 🟢 Alta | `acceptanceScenarios[]` → geração de testes muito acelerada |
| `frontend` | **1,8×** | 1,5–2× | 🟢 Alta | Componentes React/Next.js com PR-XXX e design system |
| `integration` | **1,2×** | 1,0–1,5× | 🟡 Moderada | APIs de terceiros com fallback/retry complexo; IA acelera boilerplate mas lógica exige humano |
| `infra` | **1,2×** | 1,0–1,4× | 🟡 Moderada | Manifestos K8s; ajuste de ambiente restrito de terceiro exige acesso real |

> **Base:** evidências reais de 2025-2026 mostram que para projetos enterprise bem especificados
> a aceleração é 1,5–3× para a maioria das tasks — não 4–6×. Tasks de integração com sistemas
> de terceiros ficam perto de 1× porque dependem de APIs com comportamento imprevisível e
> validação formal.
> Fonte: estudos IBM/Copilot (52% prod boost), METR time-horizons, arxiv:2511.04427.

**Regras derivadas (o porquê em 1 linha cada):**

- Integração com terceiros fica perto de 1×: edge cases não documentados só aparecem em execução
  (é o que o `retry_factor` captura), homologação/credenciais são burocracia que IA não acelera, e
  o feedback loop do ambiente de terceiro é lento.
- Domínios cuja saída é **sempre plausível mesmo quando errada** (ex.: cálculo espacial/visual —
  o resultado "parece válido" e passa no smoke test) falham silenciosamente: marcar as tasks com
  `high_risk_silent_failure = true`, aplicar `review_overhead` **elevado** e o relatório deve
  recomendar revisor humano com expertise no domínio.

**Overhead de revisão humana por task:**
- Padrão: `review_overhead = 0,15` (15% da duração original HDF do backlog)
- Elevado: `review_overhead = 0,30` — quando `integrationComplexity ≥ 2` OU `businessRules ≥ 8` OU `high_risk_silent_failure = true`

**Fator de re-tentativa:** `retry_factor = 1,35`
— Base: 67% de merge rate em tarefas bem definidas (33% precisam de retrabalho).
— Em projetos enterprise com integrações complexas, usar 1,35 (conservador entre 1,10 e 1,49).

**Duração efetiva por task no modo IA:**
```
duration_IA(task) = (duration_backlog / speed_multiplier) × retry_factor
                  + duration_backlog × review_overhead
```

> Note: `duration_backlog` é `durationEstimatedDays` **sem HDF** — a IA não precisa do HDF
> porque executa à velocidade da spec, não à velocidade humana de compreensão e implementação.

---

## Arquitetura da skill — 4 camadas (executadas 2× quando modo IA ativo)

```
Layer 1 — Complexity & Effort     (COCOMO II adaptado + métricas modernas)
    ↓
Layer 2 — Dependency & Parallel.  (DAG + CPM + Amdahl/Gustafson)
    ↓
Layer 3 — Team Optimization       (Brooks + Dunbar + Team Topologies + Conway + Cognitive Load)
    ↓
Layer 4 — Forecast & Confidence   (Monte Carlo + Reference Class + Risk-Adjusted Schedule)
```

Cada camada consome a saída da anterior. As metodologias estão **embutidas** abaixo —
não consultar fontes externas durante execução.

---

## Layer 1 — Complexity & Effort Engine

### Base conceitual embutida

**COCOMO II (Boehm, 2000) adaptado.** Forma canônica:
`PM = A × Size^E × Π EM_i` onde `E = B + 0,01 × Σ SF_j`.

Nesta skill **NÃO** usamos KSLOC (linhas de código). Substituímos `Size` por **Complexity
Units (CU)** derivadas de evidências concretas em `tasks.json`. A constante `A` é
calibrada localmente via reference class (default 0,012). O expoente `E = 1,05` (sub-linear,
captura economia de escala leve).

**Exceção — calibração brownfield com métricas medidas (`scc.json`):** quando existir
`outputs/spec/signals/scc.json` (gerado pelo `spec-legacy` a partir da varredura do
repositório legado com a ferramenta `scc`), usar o **KLOC e a complexidade MEDIDOS** como
entrada do COCOMO II **em vez de estimativas**, para a parcela brownfield do trabalho:

- Tasks de **migração/alteração de código legado**: ancorar `Size` no KSLOC medido dos
  módulos afetados (forma canônica `PM = A × Size^E × Π EM`), em vez de CU derivada só do
  backlog — reduz a incerteza da parcela que depende do volume real do legado.
- Calibrar `legacy_factor` e `arch_complexity` pela **complexidade medida** (complexity/LOC
  por linguagem no `scc.json`), não pela classificação qualitativa Sim/Parcial/Não.
- **Rastreabilidade obrigatória:** citar `outputs/spec/signals/scc.json` como fonte na §8
  (Rastreabilidade) do `estimate-report.md` e na Seção 9.1 (Parâmetros de calibração) —
  campo `size_source = scc.json (medido)` vs. `size_source = CU (derivado)`.
- Arquivo ausente (greenfield ou `spec-legacy` sem acesso ao código): seguir o fluxo padrão
  por CU — nada bloqueia.

**Métricas de complexidade modernas:**
- *Cyclomatic proxy* — `# critérios BDD + # caminhos alternativos por RF`
- *Function Point analog* — `# entidades + # operações API + # eventos`
- *Coupling Between Object analog* — `# bounded contexts tocados pela task`

### Cálculo de Complexity Unit (CU) por task

Para cada task em `tasks.json`:

```
CU(task) = w1·rfComplexity         + w2·dataComplexity     + w3·apiComplexity
         + w4·integrationComplexity+ w5·asyncComplexity    + w6·uiComplexity
         + w7·ruleComplexity
```

Pesos default `(w1..w7) = (1,2; 1,5; 1,4; 2,0; 1,8; 1,1; 1,3)`.

**Como derivar cada componente** (sempre de evidências, nunca chutado):

| Componente | Fonte | Cálculo |
|-----------|-------|---------|
| `rfComplexity` | `task.acceptanceScenarios[]` + RF vinculados | `# cenários BDD + 0,3 × # RN aplicáveis` |
| `dataComplexity` | `task.persistenceModel.entities[]` | `# entidades tocadas + 0,5 × # relationships` |
| `apiComplexity` | `task.apiContracts[]` | `# operações + 0,4 × # status codes + 0,3 × # roles auth` |
| `integrationComplexity` | `task.apiContracts[]` cross-BC | `# integrações síncronas externas × 1,5` |
| `asyncComplexity` | eventos pub/sub na task | `# eventos publicados + # eventos consumidos + 2 × # sagas` |
| `uiComplexity` | `product-requirements.md` referenciado | `# estados UI + 0,5 × # fluxos alternativos` |
| `ruleComplexity` | `task.businessRules[].implementation.algorithm[]` | `Σ # passos do algorithm / 3` |

### Bandas de complexidade por task

| Banda | Faixa CU | Significado | Ação recomendada |
|-------|----------|-------------|------------------|
| **S** | ≤ 4 | Trivial | Implementar como está |
| **M** | 5–10 | Padrão | Implementar como está |
| **L** | 11–20 | Alta | Revisar antes da sprint |
| **XL** | > 20 | Crítica | **Quebrar antes da sprint** |

### Effort Multipliers (EM) adaptados

Não usamos os 17 EMs originais do COCOMO. Mantemos **6 multiplicadores ancorados em
evidências**:

| Driver | Faixa | Como derivar (sempre de artefato) |
|--------|-------|------------------------------------|
| `legacy_factor` | 1,0–1,6 | `legacy.md`: Não=1,0; Parcial=1,2; Sim=1,4; com migração de dados=1,6 |
| `arch_complexity` | 1,0–1,5 | `1,0 + 0,08 × #BCs + 0,05 × #FKs_cross_BC` (cap 1,5) |
| `team_experience` | 0,85–1,4 | cold-start=1,2; calibrado por reference class |
| `tooling_maturity` | 0,9–1,2 | scaffold pronto + regras maduras=0,9; ausente=1,2 |
| `compliance_factor` | 1,0–1,4 | LGPD=1,1; +PCI=1,2; +HIPAA/Banking=1,4 |
| `gap_risk_factor` | 1,0–1,5 | `1,0 + min(0,5; 0,03 × #GAPs_criticos_abertos)` |

### Fator de realismo de duração — CRÍTICO

O campo `durationEstimatedDays` em `tasks.json` é gerado pela skill `spec-tasks` como
estimativa de tamanho relativo — **não como duração real de implementação por um dev humano**.
Para tarefas enterprise (múltiplos contratos de API, regras de negócio ricas, integrações
externas), a estimativa tende a ser otimista em 3–6× para um desenvolvedor humano sênior.

**`human_duration_factor` (HDF) — aplicado APENAS ao cenário convencional:**

```
duration_human_real(task) = task.durationEstimatedDays × HDF
```

| HDF | Perfil da tarefa | Quando usar |
|-----|-----------------|-------------|
| 1,0 | Tarefas simples, bem isoladas, tech stack dominada | Raramente em projetos enterprise |
| 2,0 | Tasks moderadas (3–5 APIs, 5–8 regras, 1–2 integrações) | Projetos mid-complexity |
| **3,0** | Tasks complexas (6–9 APIs, 10–15 regras, integrações ext.) | **Default para backlog gerado por spec-tasks** |
| 4,0 | Tasks muito complexas (> 9 APIs, > 15 regras, regulatório/compliance) | Projetos regulados / de alta conformidade |
| 5,0+ | Tasks de integração crítica com sistemas legados complexos | Migração, sistemas financeiros |

**Regra de derivação automática do HDF** (a partir do backlog, sem input manual):

O HDF é uma **soma linear ponderada** de três indicadores de complexidade — não uma média.
Cada coeficiente representa quantos dias extras de esforço humano cada unidade do indicador
tipicamente gera, baseado em benchmarks da indústria:

```
avg_api_ops   = média de operações de API por task           (coeficiente: +0,15 dia por op.)
avg_biz_rules = média de regras de negócio por task          (coeficiente: +0,10 dia por regra)
avg_ext_int   = média de integrações externas por task       (coeficiente: +0,30 dia por integração)

HDF = 1,0
    + 0,15 × avg_api_ops      ← cada operação de API adiciona 0,15× à duração
    + 0,10 × avg_biz_rules    ← cada regra de negócio adiciona 0,10×
    + 0,30 × avg_ext_int      ← cada integração externa adiciona 0,30× (peso maior: risco de bloqueio)

HDF = cap(HDF, min=2,0, max=6,0)
```

> **Exemplo:** HDF = 1,0 + 0,15×5,3 + 0,10×6,5 + 0,30×2,6 = 1,0 + 0,80 + 0,65 + 0,78 = **3,23 ≈ 3,2**
> Significa: as tarefas levam em média 3,2× mais tempo para um dev humano do que o valor bruto do backlog indica.
> O backlog indica 1,88 dias/task → realidade humana: **6,0 dias/task**.

**Para IA-assistida: HDF = 1,0** — os agentes executam à velocidade de `durationEstimatedDays`;
o ajuste de velocidade já está capturado nos `speed_multiplier` por tipo.

**Apresentar HDF no kickoff** — mostrar o valor derivado automaticamente e perguntar ao
usuário se quer ajustar. Isso é calibração, não input arbitrário: o usuário está confirmando
ou corrigindo uma derivação do backlog.

> **Anti-padrão crítico:** usar `durationEstimatedDays` diretamente como duração humana
> sem aplicar HDF resulta em estimativas 3–5× otimistas demais, levando a compromissos
> impossíveis de cumprir. Este é um dos erros mais comuns em estimativas de software.

### Fórmula final de esforço e custo — regra de base única

**Regra crítica:** custo humano e custo IA DEVEM usar a mesma base de cálculo para serem comparáveis. A base correta é **pessoas × meses de duração do projeto** (custo de calendário), não esforço-pessoa.

```
custo = team_size × salary_monthly × duration_months
```

Onde `duration_months = p50_days / 21`.

Isso reflete a realidade: as pessoas são contratadas pela duração do projeto, não por número de tarefas.

**Fórmula de esforço** (usada como input para dimensionamento, não para custo diretamente):
```
PM_base = A × (Σ CU)^E × Π EM_i
A = 0,012   E = 1,05

engineering_hours = PM_base × 160   (horas totais de trabalho)
team_size_ideal   = round(PM_base / (p50_days / 21))   (pessoas necessárias dado o prazo)
```

**Custo total do projeto (independente do headcount):**
```
cost_total = PM_adjusted × engineerMonthlyCost

cost_p50 = cost_total                   (mediana do esforço ajustado)
cost_p85 = cost_total × 1,22
cost_p95 = cost_total × 1,42
```

> **Por que o custo não depende do headcount?** Porque `PM_adjusted` já representa o esforço
> total. Se você dobra o time, reduz o prazo pela metade — mas o produto `pessoas × meses`
> permanece constante. Adicionar pessoas não cria trabalho novo nem o elimina.
>
> **Exceção:** times muito grandes têm custo ligeiramente maior devido ao overhead de
> comunicação (Brooks). O ajuste é: `cost_overhead = cost_total × (overhead_factor - 1)`,
> onde `overhead_factor` é calculado pela curva de headcount. Para times no ponto ótimo, este
> overhead é ≤ 15% e pode ser ignorado na estimativa executiva.
>
> **Custo IA:** calculado diferente porque o esforço muda (IA executa mais rápido):
> `cost_IA = PM_IA_adjusted × salary_orchestrator + token_cost + tooling + infra`
> Isso é comparável ao `cost_total` humano porque ambos partem do esforço ajustado.

### Cross-check bottom-up × top-down (quando há `effortHours`)

O top-down (COCOMO/HDF × EMs) tende a **inflar** — é o que motivou a base bottom-up da
`spec-tasks`. Quando `tasks.json` traz `effortHours`/`effortSummary`, **confrontar** as duas
estimativas. O HDF **permanece primário**; o bottom-up é a âncora de sanidade.

```
hoursPerDay          = metadata.effortSummary.hoursPerDay  (default 8)
bottomUp_manual_days = Σ task.effortHours.manual     / hoursPerDay     (= effortSummary.manualDaysTotal)
bottomUp_ai_days     = Σ task.effortHours.aiAssisted / hoursPerDay     (= effortSummary.aiAssistedDaysTotal)
topDown_person_days  = PM_adjusted × 21          (cenário humano — já calculado na Layer 1)
divergence_pct       = (topDown_person_days − bottomUp_manual_days) / bottomUp_manual_days × 100

headcount_topdown  = topDown_person_days  / p50_days   (headcount que o ESFORÇO top-down exige — é o
                                                        `team_size_ideal` da Layer 1, o que inflava p/ 32)
team_sanity        = bottomUp_manual_days / p50_days    (mesmo cálculo sobre a base bottom-up ancorada)
```

> **Não confundir com Brooks.** `optimal_team_size` (curva de Brooks, Layer 3) é a **recomendação
> de time** e tipicamente fica em ~5 — ele **não** é o que infla. O que infla é o headcount
> **derivado de esforço** (`team_size_ideal = esforço_ajustado ÷ prazo`): com o esforço top-down
> empilhado (HDF × EMs), ele estoura. O guard compara esse número contra o `team_sanity` bottom-up,
> não contra Brooks.

**Sinais (WARNING — nunca bloqueiam, vão para a seção «Avisos» e para o §2/§4 do relatório):**

| Código | Dispara quando | Ação no relatório |
|--------|----------------|-------------------|
| `EFFORT_CROSSCHECK_DIVERGENCE` | `|divergence_pct| > 40` | Mostrar os dois totais lado a lado; explicar a divergência; recomendar ancorar o número executivo na base bottom-up (ou reconciliar antes de comprometer) |
| `HEADCOUNT_SANITY` | `headcount_topdown > 2 × team_sanity` (equivale a `divergence_pct > 100`) | Mostrar **os dois** headcounts (`team_size_ideal` top-down e `team_sanity`) e recomendar investigar antes de dimensionar o time — guard direto do caso "32 vs 5" |
| `NO_EFFORT_BASELINE` | `effortHours` ausente no backlog | Informar que não há base bottom-up para cross-check (rodar `spec-tasks` v1.4+) |

**Regra dura:** quando `HEADCOUNT_SANITY` dispara, o relatório **não** apresenta o headcount
top-down como recomendação sem a nota de cross-check ao lado. O número que vai para o board é o
**reconciliado** — tipicamente próximo do `team_sanity` bottom-up — com a divergência explicada.

O cenário IA usa `bottomUp_ai_days` como base bottom-up equivalente (cross-check contra
`PM_IA_adj × 21`), com os mesmos dois sinais.

**Pelo script.** O `forecast.mjs` faz a parte do cross-check que dá para contar (campo `crossCheck`
do `estimate-calc.json`): `razão = (P50 × nStreams) ÷ (Σ effortHours.manual ÷ horas por dia)` — o
top-down em dias-pessoa de calendário que o forecast ocupa; task sem `effortHours` entra pela duração
do backlog — e avisa `HEADCOUNT_SANITY` fora de **0,5×–2×** (no cenário IA, com `aiAssisted` e o P50
da IA). Sem `effortHours` em nenhuma task, avisa `NO_EFFORT_BASELINE`. O limite de 40% do
`EFFORT_CROSSCHECK_DIVERGENCE` não é aplicado a essa razão — fila, rampa de Tuckman e sprint inteira a
põem sempre acima dele —; o confronto com `PM_adjusted × 21` continua com a IA. Aviso do script vai
para a seção «Avisos» do relatório com os dois totais lado a lado, como manda a regra dura acima.

### Layer 1IA — Effort Multipliers no modo IA-assistida

No cenário IA os EMs são recalculados com premissas diferentes. Apenas os EMs que mudam:

| Driver | Valor humano | Valor IA | Justificativa |
|--------|-------------|----------|---------------|
| `team_experience` | 0,85–1,4 | **sempre 0,90** | Agentes IA não têm curva de aprendizado — a spec rica é o onboarding |
| `tooling_maturity` | 0,9–1,2 | **sempre 0,80** | Cursor + spec-tasks + spec-implement = ambiente de máxima maturidade; benefício maior que no humano |
| `legacy_factor` | 1,0–1,6 | **mantido** | Legado gera incerteza de contexto para o agente; mesmo fator |
| `arch_complexity` | 1,0–1,5 | **mantido** | Estrutura arquitetural não muda com o executor |
| `compliance_factor` | 1,0–1,4 | **mantido** | Requisitos regulatórios são independentes do executor |
| `gap_risk_factor` | 1,0–1,5 | **mantido** | Gaps de negócio bloqueiam tanto humano quanto IA |

**Fórmula IA:**
```
PM_IA_base = Σ duration_IA(task) / 21     (person-months equivalentes de orquestrador)
PM_IA_adj  = PM_IA_base × legacy_factor × arch_complexity × 0,90 × 0,80 × compliance_factor × gap_risk_factor
```

**Custo IA** (modelo diferente do convencional):
```
cost_IA_p50 = (n_orchestrators × salary_orchestrator × months_IA)
            + (token_cost_per_task × n_tasks)
            + (tooling_cost_monthly × n_orchestrators × months_IA)
            + (infra_cost_monthly × months_IA)
```
- `n_orchestrators` = 1 tech lead + 1 revisor por BC dominante (não por squad inteiro)
- `token_cost_per_task` default: R$ 8,00/task
- `tooling_cost_monthly` default: R$ 1.200/orquestrador
- `infra_cost_monthly` default: R$ 2.000

### Scores agregados emitidos pela Layer 1

| Score | Fórmula | Banda verde / amarela / vermelha |
|-------|---------|----------------------------------|
| `complexity_score` (0-100) | `100 × (Σ CU) / (max_observado_reference_class)` | ≤ 40 / 41-70 / > 70 |
| `architectural_complexity_score` | `100 × (arch_complexity - 1) / 0,5` | ≤ 35 / 36-65 / > 65 |
| `technical_risk_score` | média ponderada de `legacy_factor`, `compliance_factor`, `gap_risk_factor` × 50 | ≤ 30 / 31-60 / > 60 |

> **Nota:** `complexity_score` e `architectural_complexity_score` são idênticos nos dois cenários — medem o projeto, não o executor. Apenas `technical_risk_score` pode diferir levemente via `gap_risk_factor`.

---

## Layer 2 — Dependency & Parallelization Engine

### Base conceitual embutida

**DAG (Directed Acyclic Graph)** — nós = tasks, arestas = dependências. **Topological sort
de Kahn** detecta ciclos (falha fatal se cíclico).

**Critical Path Method (CPM)** — caminho mais longo do DAG. Forward pass calcula `ES`
(earliest start) e `EF` (earliest finish); backward pass calcula `LS` (latest start) e
`LF` (latest finish). Slack `TF = LS - ES`. Nós com `TF = 0` formam o **caminho crítico**.

**Amdahl's Law (1967)** — limite de speedup com paralelização:
`speedup_max = 1 / s` onde `s` = fração serial. Heurística: nesta skill `s =
critical_path_duration / total_work`.

**Gustafson-Barsis (1988)** — workload escalável: `speedup = s + p × N`. Usamos como
referência para projetos onde escopo pode crescer com mais time (raro em delivery fixo,
mas útil para ROI marginal).

### Construção do DAG

1. **Nós:** toda task de `tasks.json`.
2. **Arestas dirigidas** (cada tipo é evidência rastreável):

| Tipo de aresta | Como detectar |
|----------------|---------------|
| `explicit` | `task.dependsOn[]` declarado em `tasks.json` |
| `data-coupled` | Duas tasks escrevem na mesma entidade (`persistenceModel.entities[].table`) |
| `api-coupled` | Task A consome operação API que task B implementa (cross-ref em `apiContracts[]`) |
| `contract-coupled` | Mesmo `boundedContext` + ordem semântica imposta por RN (ex.: RN-X exige RF anterior) |

3. **Topological sort (Kahn):** processar nós com in-degree=0; remover; repetir. Se sobrarem
   nós → `CYCLIC_DEPENDENCIES` (fatal).

### CPM passo a passo

**Forward pass** (visitar em ordem topológica):
```
ES(j) = max( EF(i) ) para todo i predecessor de j;  ES(j)=0 se sem predecessor
EF(j) = ES(j) + duration(j)
```
onde `duration(j) = CU(j) × hours_per_CU`. Default: `hours_per_CU = 5` (calibrado por
reference class).

**Backward pass** (visitar em ordem topológica reversa):
```
LF(i) = min( LS(j) ) para todo j sucessor de i;  LF(i)=EF(i) se sem sucessor
LS(i) = LF(i) - duration(i)
```

**Slack/Float:** `TF(i) = LS(i) - ES(i)`.

**Critical path:** sequência ordenada de nós com `TF = 0`.

### Amdahl / Gustafson aplicado

```
total_work_hours      = Σ duration(task)
critical_path_hours   = max EF entre nós terminais
serial_fraction (s)   = critical_path_hours / total_work_hours
parallelization_index = 1 - s      ∈ [0,1]
amdahl_max_speedup    = 1 / s      (limite teórico)
gustafson_speedup     = s + (1-s) × N   (N = team size projetado)
```

### Detecção de gargalos

```
bottleneck_score(t) = min(100,
    (fan_in(t) + fan_out(t)) × 5
  + duration_norm(t) × 30                  // duration_norm = duration(t) / max_duration
  + (40 if slack(t) == 0 else 0)
  + architectural_centrality(t) × 25
)
```

`architectural_centrality(t)` ∈ [0,1] cresce quando:
- Task pertence a BC tocado por > 50% dos demais BCs (+0,3)
- Task altera entidade referenciada por > 30% das demais tasks (+0,3)
- Task implementa contrato API consumido por > 3 consumidores (+0,4)

**Threshold operacional:** `bottleneck_score ≥ 60` entra na lista; top-5 sempre vão para
recomendações.

### Acoplamento entre BCs

Para cada par `(BC_A, BC_B)`:

```
coupling(A,B) = #FKs(A→B) + #FKs(B→A)                     // data
              + #operações_API_compartilhadas(A,B)         // api
              + #eventos_pub_sub_entre(A,B)                // event
```

`high_coupling_pair` quando `coupling(A,B) ≥ 3` ou `coupling(A,B) > 0,3 × média_global`.

### Parallel streams

Após topological sort, agrupar tasks em **streams** maximizando independência:
1. Identificar componentes fracamente conectados no DAG após remover críticas.
2. Cada stream = sequência de tasks pertencentes majoritariamente a 1 BC.
3. `max_parallel_streams = # streams identificados`.

### Saídas obrigatórias da Layer 2

`critical_path[]`, `critical_path_duration_hours`, `parallelization_index`,
`amdahl_max_speedup`, `max_parallel_streams`, `parallel_streams[]`, `bottlenecks[]` (com
`justification ≥ 120 chars` + `suggested_action`), `blocked_tasks[]`,
`high_coupling_pairs[]`, `coupling_score`.

### Layer 2IA — Critical path e gargalos no modo IA

O DAG, o CPM e os bottlenecks são **idênticos** nos dois cenários — a estrutura de
dependências é determinada pela lógica de negócio, não pelo executor. O que muda:

**Critical path IA:** re-calcular com `duration_IA(task)` em vez de `duration_human_real(task)`.
```
cp_duration_IA = Σ duration_IA(task) para tasks no critical_path[]
```

**Paralelização IA:** com múltiplos agentes rodando em paralelo por stream, o número efetivo
de "workers" por stream é maior. Usar:
```
n_agents_per_stream = n_orchestrators / n_streams   (mínimo 1)
parallelization_index_IA = parallelization_index     (mesmo — estrutura não muda)
amdahl_speedup_IA = 1 / serial_fraction              (mesmo — serial fraction não muda)
```

**Bottlenecks IA:** os scores de bottleneck são recalculados com `duration_IA`:
```
duration_norm_IA(t) = duration_IA(t) / max(duration_IA)
bottleneck_score_IA(t) = mesma fórmula com duration_norm_IA
```

> Muitos bottlenecks perdem força no modo IA porque a duração das tasks cai — tasks de
> backend e test ficam muito mais rápidas, reduzindo seu `duration_norm`. Tasks de
> `integration` continuam pesadas (aceleração de só 1,2× — tabela de velocidade do modo IA) e mantêm score alto.

---

## Layer 3 — Team Optimization Engine

### Base conceitual embutida

**Brooks's Law (1975)** — "adding manpower to a late software project makes it later".
Comunicação cresce quadraticamente: `C(n) = n(n-1)/2` canais. Throughput efetivo:
```
throughput(n) = n × p - k × C(n)
```
onde `p` = produtividade individual (CU/dia) e `k` = custo por canal/dia. Maximizando:
```
n* = √(p / k)   → tamanho ótimo do time
```

**Team Topologies (Skelton & Pais, 2019)** — quatro tipos de equipe:

| Tipo | Função | Tamanho típico | Quando usar |
|------|--------|----------------|-------------|
| `stream-aligned` | Entrega valor end-to-end de um BC | 5-8 | Default por BC dominante |
| `platform` | Self-service para reduzir cognitive load das stream-aligned | 4-6 | > 3 BCs compartilham infra/observability/auth |
| `enabling` | Coaching/upskill temporário (cap ≤ 6 meses) | 2-4 | Skill gap detectado |
| `complicated-subsystem` | Isola complexidade técnica (ML, criptografia, cálculo financeiro) | 3-5 | Tech complexa não dominada por stream-aligned |

**Modos de interação:** Collaboration (curto prazo), X-as-a-Service (estável), Facilitating
(enabling).

**Cognitive Load Theory (Sweller, 1988)** aplicada a times — três cargas: intrínseca
(domínio), extrínseca (ferramenta), germane (aprendizado). Limite operacional **7±2 (Miller)**.

```
CL(squad) = # bounded_contexts_owned
          + # tech_stacks_used
          + # external_integrations
          + 0,5 × # cross_squad_dependencies
```

**Dunbar (cap social):** 5/15/50/150 — confirma two-pizza team de Amazon/Spotify.

**Conway's Law (1968)** — "qualquer organização que projeta um sistema produz um projeto cuja
estrutura é uma cópia da estrutura de comunicação da organização." **Inverse Conway maneuver:**
desenhar a organização para forçar a arquitetura desejada.

```
CMI (Conway Misalignment Index) = 1 - similarity(comm_graph, arch_graph)
```

Onde `comm_graph` é o grafo `squad → BC tocado` e `arch_graph` é o grafo de acoplamento
entre BCs (derivado de data-model + api-contracts). `similarity` = Jaccard sobre arestas
normalizadas.

### Calibração default (cold-start)

- `p = 4 CU/dia` (engenheiro mid-sênior, projeto típico)
- `k = 0,15 CU/(canal·dia)` (custo de comunicação por canal)
- → `n* = √(4 / 0,15) ≈ 5,16` (arredondar para `5` ou `6`)

Reference class deve sobrescrever `p` e `k` quando disponível.

### Headcount e custo — princípios fundamentais

**Princípio 1 — O custo é determinado pelo esforço, não pelo headcount.**

```
custo_total = PM_adjusted × engineerMonthlyCost    (≈ constante para qualquer team_size)
```

Isso é matematicamente inevitável: adicionar pessoas reduz o prazo, mas elas trabalham por menos
tempo — o produto `pessoas × meses` permanece aproximadamente constante (menos o ganho de
overhead reduzido com times maiores, que é pequeno). A skill NUNCA deve apresentar custo como
variável do headcount sem explicar este princípio.

**Princípio 2 — O headcount controla o prazo, não o custo.**

O gestor escolhe um ponto na curva `prazo × risco`:
- Time menor → prazo maior, CL por pessoa maior, risco de ausências maior, custo ≈ igual
- Time maior → prazo menor, CL por pessoa menor, overhead de comunicação maior, custo ≈ igual

**Princípio 3 — Nunca cravar um headcount sem derivar dos dados.**

A skill calcula a curva completa e recomenda o ponto ótimo. O usuário ajusta.

### Cálculo da curva prazo × headcount

Para cada tamanho de time candidato `n`:

```
p50(n) = max(cp_duration_days,                            # piso: caminho crítico
             PM_adjusted_person_days / (n × pi))          # teto: capacidade paralela

overhead_factor(n) = 1 + (k × C(n)) / (n × p)            # penalidade de Brooks
                    onde C(n) = n(n-1)/2

p50_real(n) = p50(n) × overhead_factor(n)

custo(n)    = PM_adjusted × engineerMonthlyCost           # ≈ constante
```

**Ponto ótimo recomendado:** menor `n` onde `overhead_factor(n) ≤ 1,15` (overhead ≤ 15%).
Abaixo deste ponto, o time está trabalhando com CL elevado; acima, o overhead de comunicação
consome mais do que o ganho de paralelismo.

**Apresentar no relatório:** tabela com n = [mínimo, ótimo, +50%, máximo útil] e deixar o
gestor escolher. Destacar o ótimo como recomendação.

### Sugestão de squad topology

1. **Calcular o ponto ótimo de headcount primeiro.** A topologia segue — não o contrário.
2. Distribuir devs pelas streams mais críticas (maior `Σ CU` ou no caminho crítico).
3. **Grupos de BC, não squads por BC:** agrupar BCs por domínio até CL ≤ 7 por grupo.
4. **Platform:** criar somente se ≥ 3 grupos E infra/auth compartilhada E `PM_adjusted > 20`.
5. **Enabling:** criar se `specialization_gap.coverage < 30%` em skill crítica. Máximo 6 meses.
6. **Complicated-subsystem:** criar somente se task XL com `integrationComplexity` dominante coloca CL > 9 no grupo existente E `PM_adjusted > 15`.

### Conway Misalignment — quando recomendar reorganização

| CMI | Status | Ação |
|-----|--------|------|
| < 0,25 | 🟢 Alinhado | Sem ação |
| 0,25–0,40 | 🟡 Atenção | Monitorar; pequenos ajustes de ownership |
| > 0,40 | 🔴 Desalinhado | **Inverse Conway maneuver:** redesenhar squads para espelhar BCs |

### Layer 3IA — Time no modo IA-assistida

No cenário IA, a estrutura do time é radicalmente diferente. **Não há squads de desenvolvimento.**

**Composição do time IA:**
```
n_orchestrators = 1 tech lead (arquitetura + decisões de design)
               + 1 revisor por grupo de BCs (não por BC individual)
               onde grupo_de_BCs = conjunto de BCs com CL_combinado ≤ 10 e Σcu_pct ≤ 40%

total_IA_team  = n_orchestrators (tipicamente 3–6 pessoas para projetos médios)
```

**Regra de agrupamento de BCs para IA:**
- BCs no mesmo domínio de negócio e sem dependências externas complexas → 1 revisor
- BCs com integrações externas críticas (`integrationComplexity > 2`) → revisor dedicado
- Um tech lead é suficiente para até 10 BCs com specs ricas da metodologia

**Cognitive Load no modo IA:** não aplicar CL por squad (não há squads). Calcular:
```
CL_revisor = # BCs_supervisionados + # integrações_externas_do_grupo
```
Limite: `CL_revisor ≤ 10` (humano revisa IA output, não implementa — carga diferente)

**CMI no modo IA:** não aplicável — não há squads para desalinhar com a arquitetura.
Registrar como `CMI_IA = N/A`.

**Saídas Layer 3IA:**
`ia.n_orchestrators`, `ia.reviewer_groups[]` (com BCs e CL_revisor), `ia.total_ia_team`,
`ia.high_risk_tasks[]` (tasks com `review_overhead = 0,30`), `ia.specialization_gaps[]`
(gaps que afetam a capacidade de revisão humana, não de implementação)

### Saídas obrigatórias da Layer 3

`optimal_team_size`, `total_team_size`, `recommended_squad_topology[]` (com `cognitive_load`
e `rationale`), `communication_overhead_pct`, `coordination_cost_score`,
`conway_misalignment_index`, `cognitive_load_distribution[]`, `specialization_gaps[]`,
alertas de over/under sizing (`OVERSIZED_TEAM` quando aplicável).

---

## Layer 4 — Forecast & Confidence Engine

### Base conceitual embutida

**Monte Carlo Forecasting (Magennis, 2011)** — simular o projeto N vezes amostrando do
histograma de throughput. Distribuição empírica resultante → percentis P50/P85/P95.

**Reference Class Forecasting (Kahneman/Flyvbjerg, 2006)** — usar distribuição empírica de
projetos similares para combater planning fallacy. Ajuste típico: estimativa interna ×
1,3 a 2,0 quando sem histórico.

**Risk-Adjusted Schedule:**
```
schedule_adjusted = schedule_base × (1 + Σ risk_i.probability × risk_i.impact_normalized)
```

### Tuckman's Stages aplicado ao forecast (OBRIGATÓRIO)

O modelo de Tuckman (1965) descreve como times passam por quatro estágios antes de
atingir plena produtividade: **Forming → Storming → Norming → Performing**.
Esta skill modela o impacto de Tuckman diretamente no throughput de cada sprint.

**Tuckman para time humano (cold-start):**

| Sprint | Estágio | Produtividade relativa | O que acontece |
|--------|---------|----------------------|----------------|
| 1–2 | Forming | **35%** | Time se conhece, papéis indefinidos, setup do ambiente |
| 3–4 | Storming | **55%** | Conflitos de abordagem, retrabalho frequente, processos sendo definidos |
| 5–6 | Norming | **75%** | Acordos estabelecidos, ritmo começando |
| 7–8 | Late Norming | **85%** | Fluxo consistente |
| 9+ | Performing | **90%** | Plena capacidade (nunca 100% — overhead natural de coordenação) |

> Sprints de 10 dias úteis (2 semanas). Reference class pode ajustar esses valores.
> Se o time já trabalhou junto em projeto similar recente, comprimir: Forming=55%, Storming=70%.

**Tuckman para equipe IA-assistida (cold-start):**

O ramp-up de IA é mais curto que o humano (não há conflitos interpessoais), mas é real:
configurar ambiente, calibrar prompts, ajustar context window, descobrir edge cases do domínio.

| Sprint | Estágio | Produtividade relativa | O que acontece |
|--------|---------|----------------------|----------------|
| 0 (setup) | IA Forming | **20%** | Setup CI/CD, primeiros PRs rejeitados, prompts básicos |
| 1 | IA Storming | **40%** | Ajuste de context, muitos retries nas integrações externas |
| 2 | IA Norming | **60%** | Fluxo melhorando, revisores calibrando |
| 3–4 | IA Late Norming | **75%** | Ritmo estabelecido |
| 5+ | IA Performing | **82%** | Plena capacidade IA (cap 85% — edge cases de integração sempre voltam ao humano) |

### Procedimento Monte Carlo (obrigatório 10.000 iterações)

O MC desta skill simula throughput **por sprint com Tuckman** — não por histograma agregado.
Isso captura o ramp-up real e produz bandas de incerteza mais honestas.

**Input:** total de trabalho ajustado = `total_seq_days × EM_produto` (cenário humano)
ou `total_ia_days × EM_IA_produto` (cenário IA) — onde
`total_seq_days = Σ duration_human_real(task)` (soma sequencial dos dias-HDF de todas as tasks do
backlog, antes de paralelização — Layer 1) e `total_ia_days = Σ duration_IA(task)` (Layer 6).

**Para cada iteração (1 a 10.000):**

```
1. Amostrar scope_factor ~ LogNormal(μ=0, σ=0.25)  [incerteza de escopo ±25%]
   scope_factor = clip(scope_factor, 0.7, 1.8)
   total_work = total_seq_days × EM × scope_factor

2. Para cada sprint até remaining > 0:
   a. Determinar produtividade Tuckman: prod = tuck[sprint] se sprint < len(tuck), senão perf
   b. mean_tp = n_streams × sprint_days × prod
   c. Amostrar throughput ~ LogNormal(mean=mean_tp, CV=0.30)
      tp = clip(sample, mean_tp×0.2, mean_tp×2.5)
   d. Aplicar Amdahl: tp_eff = tp × (par_idx + (1-par_idx)/n_streams)
      [par_idx = parallelization_index do CPM (Layer 2) — não confundir com a produtividade
       individual `pi` da curva de Brooks (Layer 3)]
   e. Risco de bloqueio externo: com prob block_prob, adicionar block_sprints×sprint_days
      (sistema externo indisponível, terceiro não responde, GAP de negócio, aprovação pendente)
   f. remaining -= tp_eff

3. Registrar: sprints × sprint_days + extra_days_bloqueio
```

**Parâmetros default (cold-start):**
- `sigma_scope = 0.25` (incerteza de escopo ±25%)
- `sigma_tp = 0.30` (variância de throughput por sprint)
- `block_prob = 0.05` (prob de bloqueio por sprint — humano)
- `block_prob_ia = 0.08` (prob de bloqueio por sprint — IA enfrenta mais edge cases de integração)
- `block_sprints = 1.5` (sprints perdidos por bloqueio)
- `sprint_days = 10` (2 semanas)

> Reference class e histórico devem calibrar `block_prob` e `sigma_scope`.
> **Cap DCI a 70** em cold-start (validator `CALIBRATION_WARNING_COLD_START`).

**Distribuição empírica:**
- `p50_days` = mediana
- `p85_days` = percentil 85
- `p95_days` = percentil 95
- `p15_days` = percentil 15 (otimista)

**Datas:** `p50_date = startDate + p50_days` (dias úteis BR; pular fins de semana).

### Risk register

Riscos rastreados **sempre**:

| Categoria | Como gerar | Probabilidade default | Impact (dias) |
|-----------|------------|-----------------------|---------------|
| `gap` | Para cada GAP crítico aberto | 0,5 + 0,1 × severidade | severidade × 4 |
| `bottleneck` | Para cada top-5 bottleneck | bottleneck_score / 200 | bottleneck_score / 10 |
| `conway` | Se CMI > 0,40 | CMI | (CMI - 0,25) × 30 |
| `specialization` | Para cada gap > 50% | gap_pct / 100 | leadTimeDays × 0,3 |
| `external` | Integração com vendor/legado | 0,3 (default) | 5 (default; ajustar por evidência) |
| `compliance` | RNF de compliance presente | 0,2 | 5 |

`expected_impact_days = probability × impact_days`.

### Schedule Risk Index (SRI)

```
SRI = min(100,
    100 × (Σ expected_impact_days) / p50_days
)
```

| SRI | Banda |
|-----|-------|
| 0-25 | 🟢 |
| 26-50 | 🟡 |
| > 50 | 🔴 |

### Delivery Confidence Index (DCI)

```
DCI = round(100 × clip(
      0,30 × forecastConfidence
    + 0,20 × (1 - bottleneckPenalty)
    + 0,20 × teamHealth
    + 0,15 × architectureStability
    - 0,10 × externalRisk
    - 0,05 × gapRisk
  , 0, 1))
```

Componentes (cada um ∈ [0,1]):

| Componente | Cálculo |
|-----------|---------|
| `forecastConfidence` | `1 - (p95 - p50) / p50` (cap em [0,1]) |
| `bottleneckPenalty` | `mean(top5_bottleneck_score) / 100` |
| `teamHealth` | `1 - max(0, (avg_CL - 7) / 3)` |
| `architectureStability` | `1 - coupling_score / 100` |
| `externalRisk` | `min(1, sum_external_risks_expected_impact / 30)` |
| `gapRisk` | `min(1, sum_gap_risks_expected_impact / 30)` |

**Cap em cold-start:** se `throughputSource = cold-start`, `DCI = min(DCI, 70)`.

| DCI | Status | Significado |
|-----|--------|-------------|
| 80-100 | 🟢 Alta | Compromisso P85 defensável |
| 60-79 | 🟡 Moderada | Aceitar com mitigações |
| 40-59 | 🟠 Baixa | Re-escopar antes de comprometer |
| 0-39 | 🔴 Crítica | Bloquear; voltar a `spec-iterate` |

### Layer 4IA — Forecast & DCI no modo IA-assistida

O Monte Carlo IA usa throughput diferente — baseado na velocidade dos agentes por tipo:

**Throughput IA por sprint:**
```
mean_sprint_CU_IA = Σ (n_tasks_por_tipo × CU_médio_tipo × speed_multiplier_tipo) / n_sprints_estimados
                  × parallelization_index   (mesma estrutura de dependências)
sigma_IA          = 0,20 × mean_sprint_CU_IA  (menor variância que humano — agentes são mais consistentes)
```

**Monte Carlo IA (10.000 iterações):**
- Mesma estrutura do cenário humano, mas com `mean_sprint_CU_IA` e `sigma_IA`
- Trabalho total: `Σ duration_IA(task)` em vez de `Σ duration_human_real(task) × EM`
- Cap DCI em 70 para cold-start (mesmo critério)

**DCI_IA — componentes recalculados para IA:**

| Componente | Cálculo no cenário IA | Diferença vs. humano |
|-----------|----------------------|---------------------|
| `forecastConfidence_IA` | `1 - (p95_IA - p50_IA) / p50_IA` | Geralmente maior — agentes têm menor variância |
| `bottleneckPenalty_IA` | `mean(top5_bottleneck_score_IA) / 100` | Menor — tasks de backend/test perdem peso |
| `teamHealth_IA` | `1 - max(0, (avg_CL_revisor - 10) / 3)` | Limite diferente (10, não 7) — revisores têm carga diferente de devs |
| `architectureStability` | **idêntico** ao cenário humano | Arquitetura não muda com o executor |
| `externalRisk_IA` | **idêntico** ao cenário humano | Sistemas externos têm mesma incerteza |
| `gapRisk_IA` | **idêntico** ao cenário humano | GAPs de negócio são independentes do executor |

**Risk register IA:** os riscos de `gap`, `external` e `compliance` são idênticos.
Os de `bottleneck`, `specialization` e `conway` são recalculados:
- `bottleneck` IA: usar `bottleneck_score_IA` (geralmente menor)
- `specialization` IA: o gap relevante é de **revisores**, não de implementadores — ex.: "não temos humano que domine o domínio X o suficiente para revisar o output do agente"
- `conway`: não aplicável no modo IA (`CMI_IA = N/A`)

**Saídas Layer 4IA:**
`ia.p15/p50/p85/p95` (dias e datas), `ia.cost_p50/p85/p95`, `ia.DCI`, `ia.SRI`,
`ia.speedup_vs_human` (`p50_human / p50_IA`), `ia.cost_delta_pct` (positivo = mais barato com IA),
`ia.high_risk_tasks[]` (tasks `integration` ou `infra` — sempre revisão reforçada)

### Sensitivity analysis

Top-3 fatores que mais movem `p85`:
- Para cada fator (cada bottleneck, GAP, coupling pair, specialization gap):
  - Calcular `p85` removendo o fator do risco
  - `impact_days_p85 = p85_atual - p85_sem_fator`
- Ordenar decrescente, top-3.

### Saídas obrigatórias da Layer 4

`p15/p50/p85/p95 days e dates`, `cost.p50/p85/p95`, `scenarios.optimistic/realistic/pessimistic`,
`delivery_confidence_index` (+ componentes), `forecast_confidence_score`,
`delivery_predictability` (1 - CV), `risk_register[]`, `schedule_risk_index`,
`sensitivity_analysis[]`.

---

## Ordem de execução

```
K  → Kickoff de calibração            (5 decisões; bloqueia se incompleto)

A  → Carregar insumos                  (tasks.json + Fase 5-6 + arch + history opcional)
     ↪ Detectar modo: Full / Backlog-only / Greenfield-Preliminar / Recalibração / Re-forecast
     ↪ Se Re-forecast: atalho — pular B–E (Layers 1–3 não re-executam) e seguir
       §«Modo Re-forecast» (FlowPulse ou modo degradado), depois H–J

A' → Calcular a parte determinística — SEMPRE pelo script, nunca à mão:
       node <dir-desta-skill>/forecast.mjs outputs/spec/tasks.json \
         --calibracao outputs/spec/estimate/calibracao.json \
         --saida outputs/spec/estimate/estimate-calc.json
     ↪ calibracao.json = as decisões do K3 (startDate, nStreams, EMs, HDF "auto" ou o valor
       confirmado, parâmetros do Monte Carlo); o que faltar fica no default desta SKILL.md
     ↪ exit 1 = CYCLIC_DEPENDENCIES ou ALL_TASKS_SCORED (task sem duração): parar e reportar —
       o backlog volta para a spec-tasks; nada é estimado por cima de dado ausente
     ↪ CU e banda por task, ΣCU, HDF, DAG com o tipo de cada aresta, CPM (caminho crítico,
       folga, paralelização, Amdahl), score de gargalo e Monte Carlo 10.000 (P15/P50/P85/P95 e
       datas, humano e IA) saem do estimate-calc.json, com a evidência de cada número.
       B, C e E usam ESSES números e acrescentam o que é julgamento (EMs, DCI, SRI, riscos,
       Brooks/squads, justificativa dos gargalos, recomendações)

B  → Layer 1: Complexity & Effort — CU(task), EMs, effort_pm/custo, bandas por BC
     + cross-check bottom-up × top-down quando há effortHours (saídas e sinais na própria Layer)

C  → Layer 2: Dependency & Parallelization — DAG + Kahn (CYCLIC_DEPENDENCIES bloqueia),
     CPM → critical_path/slack, Amdahl → parallelization_index, bottlenecks top-5 justificados

D  → Layer 3: Team Optimization — Brooks (n*), Team Topologies, Cognitive Load (≤7),
     CMI (>0,40 → inverse Conway), specialization_gaps[]

E  → Layer 4: Forecast & Confidence (humano) — Monte Carlo 10k (§ Procedimento),
     P15/P50/P85/P95 + datas, risk register, DCI (cap 70 cold-start), sensitivity top-3

[SE modo IA ativado — rodar B_IA até E_IA em paralelo com B até E, cada uma com as
 premissas/saídas da sua Layer IA: duration_IA + EMs IA (B_IA), CPM IA + high_risk_tasks
 (C_IA), orquestradores/revisores sem Brooks/CMI (D_IA), Monte Carlo IA + DCI_IA +
 comparativo Humano × IA (E_IA)]

F  → Recomendações priorizadas
     ↪ Cada bottleneck top-5 → ação concreta (verbo imperativo)
     ↪ Cada coupling pair de alto volume → ação
     ↪ CMI > 0,40 → reorganização sugerida
     ↪ Gaps de especialização → hiring/training/enabling/contracting
     ↪ DCI < 60 → re-escopo/MVP/faseamento
     ↪ Cada recomendação: {id, layer, severity, action, expected_impact, effort S/M/L/XL}

G  → Validators (§ Validators) — bloqueia emissão se FATAL ativo

H  → Emitir o relatório Markdown:
     outputs/spec/estimate/estimate-report.md
     ↪ 9 seções obrigatórias na ordem do template embutido

I  → Emitir os dados estruturados + gerar o HTML (SEMPRE — não é opcional):
     1. Gravar outputs/spec/estimate/estimate-data.json
        ↪ Schema/exemplo em templates/estimate-data.example.json
        ↪ Mesmos números do .md (fonte única de verdade); nenhum valor novo
        ↪ Os números calculados entram pelo script, não à mão:
            node <dir-desta-skill>/forecast.mjs outputs/spec/tasks.json \
              --calibracao outputs/spec/estimate/calibracao.json \
              --preencher outputs/spec/estimate/estimate-data.json
          (copia calibration.hdf/mcIterations/startDate, complexity.bands, dependency.metrics,
          forecast.scenarios e allTasks; o texto do JSON fica como está)
     2. Rodar o gerador Node (regra de ouro no §«Geração do HTML»):
        ↪ node <skill_dir>/cli.mjs   (usa PIPELINE_OUTPUTS_DIR ou ./outputs)
        ↪ ou: node <skill_dir>/cli.mjs -i <data.json> -o <estimate-report.html>
        ↪ produz outputs/spec/estimate/estimate-report.html
     3. Se o Node não estiver disponível, reportar o comando ao usuário como fallback.

J  → Atualizar sync-log.md Seção A (uma linha agregada) — registrar os 3 artefatos
```

---

## Validators

### FATAL — bloqueia emissão

| Código | Verificação |
|--------|-------------|
| `TASKS_JSON_PRESENT` | `tasks.json` da Fase 8 existe e é JSON válido |
| `KICKOFF_COMPLETE` | 5 decisões de calibração registradas |
| `NO_POINT_ESTIMATES` | Todo prazo/custo é faixa P50/P85/P95 |
| `CYCLIC_DEPENDENCIES` | DAG é acíclico |
| `EVIDENCE_TRACEABILITY` | Cada score tem fontes rastreáveis (taskId/RF/MOD/BC/F-xxx/GAP) |
| `ALL_TASKS_SCORED` | Toda task de `tasks.json` aparece na tabela `taskComplexity` |
| `BOTTLENECKS_JUSTIFIED` | Cada bottleneck tem `justification ≥ 120 chars` + `suggested_action` |
| `DCI_COMPONENTS_COMPLETE` | DCI tem os 6 componentes calculados |
| `MONTE_CARLO_ITERATIONS` | Monte Carlo rodou ≥ 10.000 iterações |
| `NO_INVENTED_DATA` | Nenhum score é gerado sem insumo correspondente |
| `HTML_GENERATED` | `estimate-data.json` gravado e `estimate-report.html` gerado via `cli.mjs` (mesmos números do `.md`) |

### WARNING — não bloqueia, vai na seção «Avisos»

| Código | Verificação |
|--------|-------------|
| `FORECAST_SCRIPT_USED` | `forecast.mjs` rodado no Passo A' e os números do `.md` e do `estimate-data.json` saem do `estimate-calc.json` (o `--preencher` copia os do JSON). Cálculo à mão só com `TOOL_UNAVAILABLE:forecast` registrado no sync-log. Vira gate quando rodar em projeto real sem divergência |
| `RISK_REGISTER_NON_EMPTY` | ≥ 1 risco quando # tasks > 10 |
| `RECOMMENDATIONS_ACTIONABLE` | Cada recomendação inicia com verbo no imperativo |
| `TOPOLOGY_COVERS_BCs` | Todo BC de `modules.md` tem dono em alguma squad |
| `CALIBRATION_WARNING_COLD_START` | DCI ≤ 70 quando `throughputSource = cold-start` |
| `NO_ARCH_CONTEXT` | Modo Backlog-only (sem data-model/api-contracts) |
| `PRELIMINARY_MODE` | Modo Greenfield-Preliminar (sem tasks.json) |
| `EFFORT_CROSSCHECK_DIVERGENCE` | `\|divergence_pct\| > 40` entre top-down (HDF) e base bottom-up (`effortHours`) — ver § "Cross-check bottom-up × top-down" |
| `HEADCOUNT_SANITY` | `headcount_topdown > 2 × team_sanity` (headcount ancorado no bottom-up) — guard do caso "32 vs 5"; **não** comparar com `optimal_team_size` (Brooks), que já é são por construção |
| `NO_EFFORT_BASELINE` | `tasks.json` sem `effortHours`/`effortSummary` (anterior à `spec-tasks` v1.4) — sem base bottom-up para cross-check |

---

## Bandas operacionais (referência rápida)

| Score | 🟢 Verde | 🟡 Amarelo | 🔴 Vermelho |
|-------|---------|-----------|-------------|
| `complexity_score` | 0–40 | 41–70 | 71–100 |
| `architectural_complexity_score` | 0–35 | 36–65 | 66–100 |
| `technical_risk_score` | 0–30 | 31–60 | 61–100 |
| `parallelization_index` | > 0,70 | 0,40–0,70 | < 0,40 |
| `bottleneck_score` (por task) | 0–30 | 31–60 | 61–100 |
| `cognitive_load` (por squad) | ≤ 5 | 6–7 | ≥ 8 |
| `communication_overhead_pct` | < 15% | 15–30% | > 30% |
| `conway_misalignment_index` | < 0,25 | 0,25–0,40 | > 0,40 |
| `delivery_confidence_index` | 80–100 | 60–79 | < 60 |
| `schedule_risk_index` | 0–25 | 26–50 | > 50 |
| `delivery_predictability` | > 0,75 | 0,50–0,75 | < 0,50 |

---

## Template do output — `estimate-report.md` (+ `.json` + `.html`)

O relatório é **um único arquivo `.md`**, em `outputs/spec/estimate/estimate-report.md`,
seguindo o template canônico em [`./templates/estimate-report.md`](./templates/estimate-report.md).

**Estrutura obrigatória (9 seções, na ordem)** — Executive Summary · Complexity (L1) ·
Dependency & Parallelization (L2) · Team Optimization (L3) · Forecast & Confidence (L4, com
comparativo Humano × IA quando o modo IA rodou) · Recomendações priorizadas · Avisos + Questões
em aberto (nunca `GAP-XXX` novo) · Rastreabilidade · Anexos. **O detalhamento de cada seção, as
convenções visuais** (cabeçalho, `spec-check-modular`, âncoras `dlv-*`, emojis de banda, faixas
P50/P85/P95, Mermaid da §3.3, footer) **e os esqueletos estão no template** — que é lido de
qualquer forma; preencher lá.

**Princípio crítico:** o relatório executivo em **Markdown** (`.md`) é a fonte de verdade
narrativa. Além dele, a skill SEMPRE emite `estimate-data.json` (dados estruturados) e
`estimate-report.html` (relatório premium com gráficos) — ver §«Geração do HTML».

---

## Geração do HTML (OBRIGATÓRIA)

A skill produz, ao final, um **relatório HTML premium** — resumo executivo curto no topo,
conteúdo completo das 9 seções e uma explicação de **como cada etapa foi calculada** (caixas
🧮), legível por equipe de negócio e cliente. Ele traz gráficos (Chart.js) e o grafo de
dependências (Mermaid), navegação lateral e tema Enterprise.

**Regra de ouro (igual à `spec-tasks-html`):** a IA **não** escreve HTML manualmente. Toda a
renderização vive no gerador Node desta pasta. O trabalho da IA é apenas **popular o
`estimate-data.json`** e **rodar o CLI**.

### Arquivos do gerador (nesta skill)

| Arquivo | Papel |
|---------|-------|
| `cli.mjs` | Lê `estimate-data.json` e grava `estimate-report.html` |
| `lib/render-estimate-html.mjs` | Layout, CSS, gráficos e seções (data-driven) |
| `lib/escape.mjs` | Escape/format (pt-BR, bandas) |
| `templates/estimate-data.example.json` | **Schema + exemplo** do contrato de dados |

### Fluxo (passo I da Ordem de execução)

1. Montar `estimate-data.json` seguindo `templates/estimate-data.example.json`. Preencher
   **com os mesmos números do `.md`** (Layers 1-4). Bandas aceitam `S/M/L/XL` ou
   `green/amber/orange/red`. Campos `how*`/`note*` aceitam HTML inline (usar `<pre>` para
   fórmulas). Campos ausentes degradam para «—» — nunca inventar valores.
2. Rodar: `node <skill_dir>/cli.mjs` (procura `outputs/spec/estimate/estimate-data.json` e
   grava `estimate-report.html` ao lado) ou `node <skill_dir>/cli.mjs -i <in> -o <out>`.
3. Confirmar ao usuário os três caminhos gerados.

### Contrato de dados

O contrato completo (todos os blocos, incluindo os que alimentam gráficos) está no
`templates/estimate-data.example.json` — schema + exemplo na mesma peça, lida no passo 1 do fluxo.

---

## Regras de legibilidade humana (OBRIGATÓRIAS)

O relatório é lido por **gestores, POs e líderes de negócio** — não apenas por engenheiros.
As regras abaixo são tão obrigatórias quanto as regras de evidência e rastreabilidade.

<!-- linguagem-clara:xref -->
> As 10 regras da seção **"Linguagem clara"** (no início desta skill) continuam valendo em cada frase.
> As H1–H5 abaixo tratam de **como montar a seção**; as 10 regras tratam de **como escrever a frase**.
> H2 (jargão explicado) é a regra 2 aplicada ao vocabulário de estimativa.

### Regra H1 — Narrativa antes de métrica

**Cada seção começa com 1–2 parágrafos em linguagem natural** explicando o que foi encontrado
e o que isso significa na prática. As tabelas e scores vêm depois, como suporte — nunca como
abertura. O leitor deve entender a conclusão sem precisar interpretar os números.

❌ **Proibido:** abrir uma seção com tabela de scores sem contexto.
✅ **Correto:** "O projeto tem [N] tarefas distribuídas em [M] módulos. O módulo mais pesado é
[o módulo de maior esforço] ([X]% do trabalho), e os principais riscos estão em [origem real dos
riscos do projeto]..." — e só então apresentar a tabela.

### Regra H2 — Jargão explicado na primeira ocorrência

Todo termo técnico deve ser acompanhado de uma explicação entre parênteses ou em nota na
primeira vez que aparece no documento. A partir da segunda ocorrência, pode ser usado livremente.

Exemplos obrigatórios de tradução:
- `DCI (Índice de Confiança de Entrega — quanto confiamos que o projeto será entregue no prazo; 0=sem confiança, 100=certeza)`
- `P85 (o prazo que tem 85% de chance de ser cumprido — use este para compromissos externos)`
- `bottleneck (gargalo — tarefa que bloqueia várias outras e pode atrasar todo o projeto)`
- `critical path (caminho crítico — sequência de tarefas que determina o prazo mínimo possível)`
- `Cognitive Load / Carga Cognitiva (quanto um squad está sobrecarregado de responsabilidades; acima de 7 começa a afetar a qualidade)`
- `CMI (Índice de Desalinhamento Conway — mede o quanto a estrutura de squads não reflete a estrutura do software; acima de 0,40 recomenda-se reorganizar)`

### Regra H3 — Seção executiva de 1 página real

A §1 (Executive Summary) deve ser **completamente autocontida e legível em 2–3 minutos**.
Estrutura obrigatória:
1. **O que vamos construir e quando termina** — 2 frases
2. **O que vai custar** — 1 frase com P50 e P85
3. **Qual a nossa confiança** — DCI em linguagem humana ("Confiança Crítica — não comprometa prazo agora")
4. **Os 3 maiores riscos** — em linguagem de negócio, sem IDs técnicos
5. **O que fazer esta semana** — as 2–3 ações mais urgentes, concretas e numeradas

O leitor executivo NÃO precisa ler as demais seções para tomar uma decisão.

### Regra H4 — Recomendações como plano de ação

A §6 deve ser apresentada como **plano de ação priorizado**, não como lista de otimizações.
Formato obrigatório por recomendação:
- **O que fazer** (verbo imperativo claro, sem jargão)
- **Por que importa** (impacto em dias ou R$, em linguagem simples)
- **Quem faz** (owner)
- **Quando** (antes do Sprint X / em D+N dias)
- **Esforço** (S = menos de 1 dia; M = 2–5 dias; L = mais de 1 semana)

### Regra H5 — Métricas com âncora de significado

Toda métrica numérica deve vir acompanhada de sua banda de cor E de uma frase interpretando
o que aquele número significa para o projeto específico. Nunca apresentar score solto.

❌ **Proibido:** `DCI = 39/100 🔴`
✅ **Correto:** `DCI = 39/100 🔴 — Confiança Crítica: não recomendamos assumir compromisso
formal de prazo com o cliente até que as ações de gargalo (§6.4) sejam implementadas.`

---

## SKILL ↔ templates

| Saída em `outputs/spec/estimate/` | Template / Gerador |
|------------------------------------|----------|
| `estimate-report.md` | [`templates/estimate-report.md`](templates/estimate-report.md) |
| `estimate-data.json` | [`templates/estimate-data.example.json`](templates/estimate-data.example.json) (schema + exemplo) |
| `estimate-report.html` | [`cli.mjs`](cli.mjs) + [`lib/render-estimate-html.mjs`](lib/render-estimate-html.mjs) (gerador Node — não escrever HTML na unha) |

---

## Anti-padrões a evitar

Os erros já cobertos por validator (data única, DCI incompleto, sem rastreabilidade, sem
sync-log, HTML na unha, três artefatos) não se repetem aqui — valem as tabelas de Validators.
Restam os que nenhum gate captura:

- **Tratar story points como input direto** — usar CU calculada de evidências reais
- **Sugerir aumento linear de time** — aplicar sempre Brooks's curve (`n* = √(p/k)`)
- **Ignorar acoplamento estrutural** — tasks que escrevem na mesma entidade NÃO são paralelizáveis
- **Inferir dependências apenas de `dependsOn[]`** — extrair também de data-model, api-contracts e business-rules
- **Recomendar "contratar mais devs"** sem análise de Brooks + Cognitive Load
- **Esquecer Conway** — squads desalinhados com BCs são gargalo disfarçado; reorganização só com justificativa via CMI
- **Tratar microsserviço como mesmo custo de monolito** — `arch_complexity` ajusta isso
- **Ignorar GAPs abertos** — gaps críticos vão no `risk_register[]` com probabilidade > 0,5
- **Misturar custo de discovery com custo de implementação** — esta skill estima APENAS Fase 7-10
- **Pesquisar metodologias em runtime** — todas estão embutidas neste documento

---

## O que NÃO faz
- Não substitui sprint planning, planning poker ou estimativa colaborativa
- Não gera tasks, stories, modelo de dados ou contratos
- Não implementa código (use `spec-implement`)
- Não publica em ferramenta externa (use `spec-tasks-azure`)
- Não substitui retrospectivas — alimenta-as com dados
- Não decide quem entra em qual squad — sugere composição; alocação é do gestor
- Não prevê eventos externos imprevisíveis — captura-os como riscos

---

## Skills irmãs

| Skill | Fase | Relação com `spec-estimate` |
|-------|------|---------|
| `spec-product` | 4/5 | **Provê documentos negociais consumidos aqui** (vision, business-rules, requirements, product-requirements, modules) |
| `spec-legacy` | 1 | **Provê análise de legado consumida aqui** (quando há legado): legacy, legacy-analysis, architecture AS-IS, threat-model |
| `spec-data-model` | 6a | Provê modelo de dados → acoplamento estrutural |
| `spec-api-contracts` | 6b | Provê contratos de API → coupling cross-service |
| `spec-tasks` | 7 | **Provê o backlog estruturado** — entrada principal de `spec-estimate` |
| `spec-tasks-azure` | 8 | Publica backlog **após** o diagnóstico desta skill |
| `spec-implement` | 10 | Consome forecast para validação de pace durante execução |
| `spec-iterate` | (cross) | Re-acionar se decisões reabrirem RF/modelo com impacto na estimativa |
