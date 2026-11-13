---
name: auditoria-de-us
description: >
  auditoria-de-us (fase 🚀 Deliver do Harness Elo v2) — invocar ao concluir o desenvolvimento
  de CADA user story, antes de abrir PR / fechar a story. Audita o DELTA da US + regressão
  leve em 7 dimensões: (1) conformidade com a spec-como-contrato (`especificacao-tecnica.md` +
  os kernels do Plan em `outputs/spec/`) e com os critérios de aceite e regras de negócio do nó
  da US no `tasks.json`, mais os guardrails do CLAUDE.md; (2) segurança
  (OWASP/STRIDE/CVSS, vetores em referência compartilhada); (3) teste de mesa nos endpoints/dados reais tocados;
  (4) performance; (5) bugs técnicos; (6) testes e cobertura do delta; (7) observabilidade.
  No v2 o Plan é o kit: a skill lê a spec como contrato em `outputs/explore/` e `outputs/spec/` e a
  ficha da US no `tasks.json` que a `spec-tasks` emite — ela não os produz. Produz um relatório por
  US em `<docs>/outputs/spec/auditorias/US-XXX.md` com veredito
  APROVADA / APROVADA COM RESSALVAS / BLOQUEADA. Não modifica código.
  Triggers: "auditar user story", "auditoria de entrega", "fechar US", "revisar a US",
  "auditar o delta", "US pronta", "antes do PR", "auditoria-de-us".
version: "2.2"
updated: "2026-10-20"
---

# auditoria-de-us — Auditoria de Entrega por User Story

> **Posição no harness:** roda na fase 🚀 Deliver, ao concluir o desenvolvimento de cada user
> story, **antes de abrir PR / fechar a story**. Não modifica código — audita, reporta e, com o
> «sim» do usuário, cria a task SEC que faltar no backlog (Decisão 74).

## Princípio central

> **Nenhuma verificação parte de uma checklist fixa.** O Passo A lê o DELTA da US (o que mudou)
> e o mapa leve de vizinhança. O Passo A' transforma isso num plano de auditoria personalizado.
> Os passos B–H auditam **apenas o que a US tocou** (mais a regressão leve nos vizinhos) — não o
> projeto inteiro, nem o que uma checklist genérica assume existir.

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

Vale para o relatório `outputs/spec/auditorias/US-XXX.md` inteiro: veredito, achados e
recomendações. Quem lê é o desenvolvedor da US e o PO que decide se ela fecha — nenhum dos dois
esteve na auditoria. Um achado que só cita o código do vetor (`A01`, `CWE-79`) sem dizer o que o
sistema faz de errado é achado que não foi escrito.

## Fonte da verdade (nativa do harness)

A autoridade técnica é a **spec como contrato**: `outputs/explore/especificacao-tecnica.md` mais os
kernels do Plan em `outputs/spec/` — `data-model.json`, `business-rules.md`,
`requirements/requirements.md` — e o `gaps.md`. **No v2 o Plan é o kit**, então a ficha da US vem do
`tasks.json` que a `spec-tasks` emite, e não de um mapa de histórias em markdown. A skill lê esses
artefatos; ela não os produz. O conhecimento de segurança (vetores + OWASP/STRIDE/CVSS) vem da
referência compartilhada `.claude/references/seguranca/vetores.md` (comum à `revisao-de-seguranca`)
e a superfície é derivada do próprio código do delta.

## Entradas

| Artefato | Obrigatório | Localização |
|----------|-------------|-------------|
| Delta da US (diff da branch) | Sim | Repositório do projeto |
| `especificacao-tecnica.md` | Recomendado | `outputs/explore/` |
| `modelo-de-dados.md` (Explore) / `data-model.json` (Plan, autoridade) | Recomendado | `outputs/explore/` / `outputs/spec/` |
| `especificacao-funcional.md` (F/RN preliminares) | Recomendado | `outputs/explore/` |
| Ficha da US (nó em `stories[]`: `userStory`, `acceptanceCriteria[]`, `businessRules[]`) | Recomendado | `outputs/spec/tasks.json` |
| `gaps.md` (GAPs abertos, contexto) | Recomendado | `outputs/spec/` (vivo, da `spec-iterate`); sem ele, `outputs/explore/` (congelado desde a promoção) |
| Controles SEC da US (`SEC-NNN` injetados pela `spec-security-review` no `tasks.json` + `plano-de-seguranca.md`) | Recomendado | `outputs/spec/` |
| `CLAUDE.md` + `.claude/rules/harness/deliver.md` | Sim | Raiz / `.claude/rules/harness/` |

## Ordem de execução

```
K   → Kickoff (qual US, seus CA/RN, branch/diff)
A   → Inventário do DELTA + mapa leve de vizinhança (regressão)
A'  → Plano de auditoria da US (dimensões e vetores aplicáveis ao delta)
B   → Conformidade (spec-contrato + modelo-de-dados + CLAUDE.md + CA/RN da US)
C   → Segurança (vetores instanciados nos pontos tocados)
D   → Teste de mesa (vetores com dados reais do delta)
E   → Performance (anti-padrões no código novo)
F   → Bugs técnicos (anti-padrões da linguagem no código novo)
G   → Testes (CA viraram teste? TDD RED/GREEN? cobertura do delta)
H   → Observabilidade (operações novas logadas/instrumentadas)
R   → Regressão leve (impacto nos vizinhos do Passo A)
I   → Scoring + veredito
J   → Gerar outputs/spec/auditorias/US-XXX.md
```

## Kickoff (K)
Confirmar: (1) qual US e onde está sua ficha — o nó de `stories[]` no `outputs/spec/tasks.json`
cujo `id` corresponde à US; (2) a branch/diff que contém o delta; (3) contexto regulatório especial
(financeiro, saúde, LGPD reforçada).

## Passo A — Inventário do delta + vizinhança
1. Obter o diff da US (`git diff <base>...<branch-da-US>`). Listar arquivos/módulos tocados.
2. Para o delta, registrar: endpoints alterados/criados; entidades/modelos tocados; stack real
   envolvido (linguagem, framework, ORM, auth, validação).
3. **Mapa leve de vizinhança (regressão):** para cada ponto tocado, identificar contratos e
   entidades **compartilhadas** que o delta encosta (ex.: um schema alterado consumido por outro
   módulo, uma entidade com FK, um contrato de API reusado). Só o necessário para detectar
   regressão — não o projeto inteiro.
4. **Varredura determinística do delta** — o mesmo motor do passo G3 da `spec-implement`, sem
   modelo: segredo no código, dado pessoal em log, HTML cru, token no storage, injeção montada em
   texto, erro engolido, I/O dentro de laço (e Semgrep/gitleaks, quando instalados). Só linhas
   acrescentadas pela US:

   ```bash
   node .claude/ferramentas/varrer-entrega.mjs --desde-o-ramo <branch base> --repo <pasta do código>
   ```

   Cada achado sai com `arquivo:linha` e entra no Passo C como ponto de partida — conferir no disco,
   não aceitar de olhos fechados. Exit 2 (sem git, base inválida) → registrar
   `TOOL_UNAVAILABLE:varrer-entrega` no relatório e seguir só com a leitura do delta.

## Passo A' — Plano de auditoria da US
Antes de auditar, documentar: quais das 7 dimensões se aplicam a **este** delta; quais vetores
de segurança são aplicáveis (e quais são N/A, com justificativa do inventário); quais vizinhos
entram na regressão. Registrar o que **não** será auditado e por quê.

## Passo B — Conformidade
Verificar o delta contra:
1. **Spec como contrato:** o código segue a arquitetura/stack/padrões de `especificacao-tecnica.md`
   e o `data-model.json`? Introduziu tecnologia/biblioteca/padrão **fora da spec sem aprovação**?
   (guardrail do CLAUDE.md → não-conformidade).
2. **CA/RN da US:** cada critério de aceite (`acceptanceCriteria[]`) e regra de negócio
   (`businessRules[]`) do nó da US em `stories[]` (`outputs/spec/tasks.json`) foi cumprido no
   código? Mapear cada `id` de critério/regra → arquivo:linha.
3. **Guardrails do CLAUDE.md e do `.claude/rules/harness/deliver.md`:** TDD, unidades pequenas,
   padrões existentes.
Produzir tabela `Diretiva/CA | arquivo:linha | PASS/FAIL/PARCIAL/N/A`.

## Passo C — Segurança
Base de vetores: [`.claude/references/seguranca/vetores.md`](../../references/seguranca/vetores.md)
(OWASP/STRIDE/CVSS/DREAD + mapa operação×risco) — fonte única, compartilhada com `revisao-de-seguranca`.
Derivar a superfície do delta (endpoints/entidades tocados). Para cada vetor aplicável, verificar o
controle no código real, adaptado ao stack encontrado. **Verificação preventiva:** se a US tem
controles `SEC-NNN` planejados (injetados no nó da US em `tasks.json` pela `spec-security-review`,
a partir do kernel `plano-de-seguranca.md` que a `revisao-de-seguranca` produziu no Plan), confirmar
que cada um foi implementado (RED/GREEN); SEC CRÍTICO/ALTO planejado e não implementado ⇒ finding
bloqueante. Findings no formato SEC-NNN (CVSS/OWASP/STRIDE, arquivo:linha, problema, risco, fix,
TDD RED/GREEN, GAP recomendado).

## Passo D — Teste de mesa
Vetores obrigatórios e mapa operação×risco: [`.claude/references/seguranca/vetores.md`](../../references/seguranca/vetores.md).
Rastrear o fluxo de dados do delta como um atacante, com endpoints/entidades REAIS. Instanciar
cada vetor obrigatório aplicável ou marcá-lo N/A com justificativa do inventário:
IDOR · Auth Bypass · Privilege Escalation · Injeção · Secret Exposure · Mass Assignment ·
Rate Limiting · Race Condition · adicionais do stack (prompt injection se há LLM, SSRF se aceita
URL do usuário, etc.). Resultado por vetor: BLOQUEADO ✅ / VULNERÁVEL ❌ / N/A.

## Passo E — Performance
No código novo: N+1, queries sem índice, falta de paginação, I/O serial, cache ausente, bundle,
timeout ausente — **apenas se o stack correspondente aparece no delta**. Findings PERF-NNN.

## Passo F — Bugs técnicos
No código novo, adaptado à linguagem real: erros silenciados, null/undefined não tratado,
recursos sem fechamento, race async, off-by-one, timezone implícito, env var sem default.
Findings BUG-NNN.

## Passo G — Testes
1. Cada CA da US virou teste? 2. Há TDD RED/GREEN para o comportamento novo? 3. Cobertura do
delta (caminho feliz + erro). 4. Anti-padrões (asserção trivial, mock que suprime a lógica,
happy-path sem erro). 5. Findings de segurança CRÍTICO/ALTO do Passo C têm teste RED/GREEN?

## Passo H — Observabilidade
Para cada operação nova introduzida pela US: log estruturado com contexto suficiente? PII
mascarada (campos do `data-model.json`)? métrica/trace de negócio quando relevante? Health
check não regrediu? Findings OBS-NNN.

## Passo R — Regressão leve
Para cada vizinho do mapa (Passo A): o delta pode ter quebrado o contrato/entidade compartilhada?
Verificar assinatura, schema, invariantes. Registrar impacto detectado com evidência.

## Passo I — Scoring e veredito
Consolidar findings (SEC/PERF/BUG/CONF/OBS-NNN) cruzados com IDs do harness (US/F/RN/CA/GAP).

**Veredito:**
- **BLOQUEADA** — qualquer: SEC CRÍTICO/ALTO aberto · BUG ALTO bloqueante · CA da US não cumprido
  · tecnologia fora da spec sem aprovação.
- **APROVADA COM RESSALVAS** — só findings MÉDIO/BAIXO, com débito registrado em `gaps-document.md`.
- **APROVADA** — sem findings bloqueantes; CA cumpridos e testados.

**Regra de Ouro (rastreabilidade)** — a mesma das três auditorias, em
`.claude/references/seguranca/rastreio-sec.md` (Decisões 69 e 74): todo finding SEC CRÍTICO/ALTO só
fecha com teste RED/GREEN, fix **e a task `SEC-NNN` no backlog**. Quando a task ainda não existe, a
skill **propõe** o `SEC-NNN` e **pergunta ao usuário se quer criar** a task agora:

- **Sim** — cria no `tasks.json` (`inject-sec.mjs --acrescentar`) e no Azure DevOps pelo MCP do
  Azure DevOps, com a tag `logical-id:SEC-NNN`, e grava o ID no `id-map.json`, como manda a
  referência. O relatório cita o work item criado.
- **Não** — registra o `GAP-NNN` em `outputs/spec/gaps-document.md` (o mesmo formato que a
  `spec-tasks` usa), apontando o SEC proposto.

Sem a task no backlog, o finding continua aberto, com veredito BLOQUEADA, mesmo que o código já
tenha sido corrigido. A skill não altera código. **Não é** o `outputs/explore/gaps.md`
do Explore: aquele já está **congelado** a esta altura da fase 🚀 Deliver (ver
`.claude/rules/harness/plan.md`, "Congelamento do Explore") — o registro vivo de gaps, que sobrevive
ao Plan e chega ao Deliver, é o `gaps-document.md`.

## Passo J — Gerar o relatório
**Path:** `<docs>/outputs/spec/auditorias/US-XXX.md`, onde `<docs>` é o repositório de papel `docs`
do manifesto — obtenha com `node .claude/hooks/workspace.mjs --docs` (em workspace mono-repo o
comando devolve o próprio cwd e o caminho é o de sempre).

**Repositórios da US:** leia `repositorios` do bloco `estado:us` do marcador e audite o delta de
**cada** um deles. O bloco `gate:status` registra `commits-auditados` com **um commit por
repositório** (`Repo@sha`), porque o gate ancora por repositório no push de cada um.

Seguir o template
[`./templates/relatorio-us.template.md`](./templates/relatorio-us.template.md) — 13 seções na
ordem. A seção 13 (Pontos a revisar) é obrigatória quando o veredito **não** for APROVADA.
**Obrigatório:** preencher o bloco `gate:status` no fim do relatório com o veredito, o
`commits-auditados` (o mesmo commit do cabeçalho por repositório) e os `achados-bloqueantes` (IDs que sustentam uma
BLOQUEADA, ou `nenhum`). Esse bloco é a fonte que o `delivery-gate` (hook PreToolUse) lê para liberar
ou bloquear o push/PR da US — sem ele, o gate bloqueia por falta de auditoria fresca.

**Limpeza do marcador (obrigatório):** emitido o relatório com veredito **≠ BLOQUEADA**, **apague**
`outputs/spec/em-andamento.md` e **commite a remoção** — o marcador efêmero da US (ver
`.claude/rules/harness/deliver.md`). A US fechou; o marcador não sobrevive a ela (o gate lê a árvore
do commit, não o worktree, então apagar sem commitar não basta). Com veredito **BLOQUEADA**,
**mantenha** o marcador e deixe `proximo-passo` apontando a correção dos findings — **exceto** se,
depois, um override de falso-positivo (`US-XXX.override.md`) neutralizar **todos** os achados
bloqueantes: nesse caso a US fecha de fato e o marcador deve ser apagado e a remoção commitada antes
do push, mesmo fora do fluxo normal desta skill. O `delivery-gate` bloqueia o push se o marcador
ainda estiver na árvore, então deixá-lo para trás travaria a integração.

## Validators
| Código | Verificação | Severidade |
|--------|-------------|------------|
| `DELTA_INVENTORY_DONE` | Passo A (delta + vizinhança) feito antes de auditar | FATAL |
| `AUDIT_PLAN_PRODUCED` | Passo A' produzido antes de B–H | FATAL |
| `VECTORS_ADDRESSED` | Cada vetor aplicável rastreado ou N/A justificado | FATAL |
| `FINDINGS_HAVE_EVIDENCE` | Todo finding com `arquivo:linha` | FATAL |
| `GOLDEN_RULE_GAP` | Todo SEC CRÍTICO/ALTO tem a task SEC do backlog (já existente, ou criada com o «sim» do usuário — Decisão 74) **ou** `SEC-NNN` proposto com o `GAP-NNN` em `gaps-document.md`; sem task no backlog, veredito BLOQUEADA (`rastreio-sec.md`) | FATAL |
| `VERDICT_EXPLICIT` | Seção 12 com veredito explícito | FATAL |
| `MARKER_CLEARED` | Veredito ≠ BLOQUEADA ⇒ `outputs/spec/em-andamento.md` apagado **e a remoção commitada** (verificado ao concluir o Passo J) | FATAL |
| `SPEC_TECH_MISSING` | `especificacao-tecnica.md` ausente — conformidade parcial | WARNING |
| `DATA_MODEL_MISSING` | `data-model.json` ausente | WARNING |
| `US_MAP_MISSING` | Nó da US ausente em `tasks.json` — CA/RN não cruzados | WARNING |
| `FUNC_SPEC_MISSING` | `especificacao-funcional.md` ausente — F/RN sem fonte para cruzar | WARNING |
| `GAPS_MISSING` | `gaps-document.md` ausente — Regra de Ouro sem destino | WARNING |

FATAL impede emitir o relatório — no caso do `MARKER_CLEARED`, impede **concluir o Passo J** (a
limpeza é posterior à emissão). WARNING não bloqueia — emitir com banner ⚠️ no topo.

## Definição de pronto
- [ ] Passo A: delta + vizinhança inventariados
- [ ] Passo A': plano da US produzido (o que foi/não auditado)
- [ ] B–H + R executados sobre o delta e vizinhos
- [ ] Findings com `arquivo:linha`; SEC CRÍTICO/ALTO sem task: perguntado se cria — task criada
  (`tasks.json` + Azure DevOps) ou GAP em `gaps-document.md`
- [ ] Veredito explícito; seção 13 preenchida se não-APROVADA
- [ ] `outputs/spec/auditorias/US-XXX.md` salvo
- [ ] Veredito ≠ BLOQUEADA ⇒ `outputs/spec/em-andamento.md` apagado e a remoção commitada

## O que NÃO faz
- Não modifica código nem cria testes — recomenda; a correção fica com o dev.
- Não cria work item nem mexe no `tasks.json` sem o «sim» do usuário naquela execução — e só para
  a task SEC que falta (Decisão 74).
- Não audita o projeto inteiro — só o delta da US + regressão leve nos vizinhos.
- Não executa DAST nem pentest ativo — a análise estática é a varredura determinística do delta
  (Passo A.4, com Semgrep/gitleaks quando instalados) mais a leitura do código e o teste de mesa.
- Não produz nenhum dos artefatos que lê — `especificacao-tecnica.md`, os kernels do Plan em
  `outputs/spec/` e o `tasks.json` são do Elo-Spec-Kit; esta skill só audita o delta contra eles.

## Skills irmãs
| Skill | Relação |
|-------|---------|
| `revisao-de-seguranca` | Preventiva (fim do Tempo B do Plan) — produz o kernel `plano-de-seguranca.md` que a `spec-security-review` consome para injetar `SEC-NNN` no `tasks.json`; esta auditoria verifica esses `SEC-NNN` no fecho da US; compartilha a referência de vetores |
