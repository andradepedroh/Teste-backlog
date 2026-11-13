---
name: spec-test-plan
description: >
  spec-test-plan (Fase 7c — Plano de Testes de Negócio; roda ANTES da spec-tasks) — invocar SEMPRE quando o usuário
  pedir para gerar um plano de testes, cenários de validação de negócio, roteiro de homologação
  ou casos de teste para usuário final. Usar quando o usuário mencionar "plano de testes",
  "roteiro de homologação", "casos de teste de negócio", "UAT", "user acceptance test",
  "validação de negócio", "testar a épica" ou pedir um documento para validar funcionalidades
  antes da entrega. Consome os insumos da Fase 7 e é CONSUMIDO pela spec-tasks (Fase 8): requirements.md,
  product-requirements.md, business-rules.md, e opcionalmente data-model.json e
  api-contracts.yaml para contexto. Produz um único artefato: test-plan.md — documento
  legível por pessoas de negócio, organizado por Épica › Funcionalidade › Caso de Teste.
  O test-plan.md gerado é input opcional para a spec-tasks, que usa os casos TC-NNN como fonte
  dos cenários de aceite (testes automatizados) das tasks de desenvolvimento — não gera tasks
  nem stories de homologação no backlog.
version: "1.6"
updated: "2026-10-20"
---

# spec-test-plan — Geração de Plano de Testes de Negócio

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`EPIC-001`, `TC-001`, `MOD-EXEMPLO`).

## Papel

Converte **requisitos funcionais estabilizados** e **fluxos de produto** num **plano de
testes orientado a negócio** — um documento que uma pessoa sem conhecimento técnico
(PO, analista de negócio, cliente) consegue executar passo a passo para validar se a
épica funciona corretamente antes da entrega.

**Diferença fundamental em relação à spec-tasks:**

| Dimensão | spec-test-plan (este artefato) | spec-tasks (tasks.json) |
|----------|-------------------------------|------------------------|
| Público | PO, analista, cliente | Dev, QA técnico, agente de IA |
| Linguagem | Negócio — "clique em", "preencha com" | Técnica — BDD, API, schema |
| Formato | Markdown legível, tabelas simples | JSON estruturado, compact-prose |
| Foco | Jornadas de usuário e resultados visíveis | Implementação, testes unitários/automatizados |
| Uso | Roteiro que o cliente executa por conta própria (fora do backlog) **e** fonte dos cenários automatizados das tasks | Implementar e automatizar os cenários (rastreio `TC-NNN` em `coverageNote`) |

**Posição na pipeline:**
```
spec-product / spec-ingest → spec-data-model / spec-api-contracts
                                              ↓
                              spec-test-plan (este — Fase 7c)
                                              ↓
                              spec-tasks      (Fase 8  — consome test-plan.md como FONTE de
                                               cenários das tasks; não cria tasks de homologação)
```

**Fora de escopo:** ver «O que NÃO faz» ao final.

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

Vale para o `test-plan.md`: cada caso `TC-NNN` precisa ser executável por quem vai homologar, sem jargão de teste. "Passo" e "resultado esperado" em frases do tipo "quando X, o sistema Y".

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-test-plan | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

**Gate `TESTPLAN_COVERAGE` (WARNING — obrigatório na coluna `<questões em aberto>`):** registrar
os números da cobertura gerada, no formato:
`TESTPLAN_COVERAGE: casos=N (PRINCIPAL=a, VALIDAÇÃO=b, REGRA=c, ACESSO=d, ESTADO=e, INTEGRAÇÃO=f, BORDA=g) | RNs cobertas=X/Y (Z%)`.
Se `Z% < 100` e houver RN sem justificativa na Tabela de Cobertura RN × Caso, o gate está em
WARNING — reportar no chat e no banner `⚠️` do documento (nunca omitir a linha).

**Gate `EPIC_SIZE_SIGNAL` (WARNING):** quando alguma épica passar de ~20 casos, de 6
funcionalidades ou de 4 telas, acrescentar `EPIC_SIZE_SIGNAL: <EPIC-ID> (casos=N, RF=x, telas=y)
— sugerir divisão` na mesma coluna. O volume **não** autoriza cortar casos da matriz mínima nem
verificações de estado de UI — ver § "Teto de volume".

## Entradas canônicas

| Arquivo | Obrigatório | Consumo |
|---------|-------------|---------|
| `outputs/spec/requirements/requirements.md` | Sim | RFs → objetivos dos casos de teste |
| `outputs/spec/product-requirements/product-requirements.md` | Sim | Fluxos UX → passos de execução |
| `outputs/spec/business-rules.md` | Recomendado | Regras → critérios de validação |
| `outputs/spec/data-model.json` | Opcional | Contexto de campos e estados |
| `outputs/spec/api-contracts.yaml` | Opcional | Contexto de respostas esperadas |
| `outputs/spec/flow-map.md` | Opcional | Estados de UI (`estadosUI`) por tela → casos `[ESTADO]` obrigatórios (1 por estado) |
| rules do projeto (`.cursor/rules/` ou `.claude/rules/`) | Sim | Padrões do projeto (para não contradizer arquitetura) |

> **Regra de idioma:** Todo o conteúdo do `test-plan.md` deve estar em **Português do Brasil**,
> em linguagem acessível para não-técnicos.

## Saída

**Arquivo único:** `outputs/spec/test-plan.md`

Override: variável de ambiente `PIPELINE_OUTPUTS_DIR` ou `metadata.paths.pipelineRoot`.

## Kickoff (mínimo)

Antes de gerar o `test-plan.md`, confirmar três decisões com o consultor — persistir as
respostas na seção **Metadados** do documento (ver §Estrutura), cada uma no seu próprio campo:

1. **Épicas em escopo** — todas as épicas do catálogo modular ou um subconjunto específico?
   → persistir em **Épicas cobertas**.
2. **Ambiente/sandbox de integrações** — os casos `[INTEGRAÇÃO]` terão acesso a um sandbox
   real dos sistemas externos, ou a homologação usa simuladores/mocks?
   → persistir em **Ambiente de integrações (sandbox/mock)**.
3. **Perfis de usuário** — quais perfis (papéis) precisam ser cobertos pelos casos de teste
   e aparecer no Anexo A (usuários de teste)?
   → persistir em **Perfis de usuário cobertos**.

## Estrutura do test-plan.md

Estrutura canônica completa no [`templates/test-plan.template.md`](templates/test-plan.template.md):

```
# Plano de Testes — [Nome do Projeto]
## Metadados
## Glossário (se necessário)
## [EPIC-001] — [Nome da Épica]
  ### Pré-requisitos da Épica
  ### [TC-001] [Título do Caso de Teste]
    Objetivo | Perfil | Pré-condições | Passos | Resultado Esperado | Resultado Obtido | Em caso de falha
  ### [TC-002] ...
## [EPIC-002] — ...
## Cobertura RN × Caso
## Sumário de Execução (preenchido na homologação)
## Anexos: Usuários de Teste · Dados Pré-necessários · Ambiente
```

## Regras de conteúdo

### Princípio de linguagem (CRÍTICO)

Cada caso de teste deve ser executável por alguém que **nunca leu o código**. A linguagem
é de negócio — o que o usuário vê, clica e recebe. Substituir terminologia de implementação:

| Proibido | Usar em vez |
|----------|------------|
| "Fazer POST para /pedidos" | "Clicar no botão Criar Pedido" |
| "Verificar status HTTP 422" | "Verificar que aparece a mensagem de erro X" |
| "Campo nullable=false" | "Campo obrigatório" |
| "Token JWT expirado" | "Sessão expirada / Fazer login novamente" |
| "Foreign key constraint" | "O [item] precisa existir no sistema antes" |
| "Banco de dados / tabela" | "Sistema / registro" |
| "Endpoint", "schema", "payload" | "Tela", "formulário", "dados" |

### Exceção — Validação de Integrações com Sistemas Externos

Quando a épica envolve integração com um sistema externo (ERP, gateway de pagamento,
serviço de CEP, API de parceiro, etc.), é válido — e necessário — criar casos de teste
que verifiquem o **resultado visível da integração**, descrito em linguagem de negócio.

**O que testar nas integrações:**
- O dado retornado pelo sistema externo apareceu corretamente na tela
- O sistema respondeu dentro de um tempo aceitável (ex.: "em até 5 segundos")
- O sistema tratou corretamente uma falha do serviço externo (ex.: serviço indisponível)
- O dado enviado ao sistema externo foi recebido e confirmado (via retorno visível)

**Como descrever — exemplos:**

| ❌ Técnico (proibido) | ✅ Negócio (correto) |
|----------------------|---------------------|
| "Validar que o POST /pagamentos retorna 200 com `transactionId`" | "Verificar que o sistema exibe a mensagem 'Pagamento aprovado' e o número da transação" |
| "Testar timeout de 30s na chamada ao serviço de CEP" | "Preencher o CEP e aguardar: se o endereço não carregar em 5 segundos, verificar se aparece a mensagem 'Serviço de CEP indisponível, preencha o endereço manualmente'" |

**Categoria dedicada para integrações:** `[INTEGRAÇÃO]` — usar essa tag nos TCs de integração.

**Pré-condição típica de integração:** indicar se o ambiente de homologação tem conexão
real com o sistema externo ou se usa um simulador (ex.: "ambiente de sandbox do gateway").
Isso deve aparecer nos pré-requisitos da épica e no pré-requisito do caso de teste.

### Categorias de casos de teste

Cada épica deve ter casos de teste cobrindo:

| Categoria | Tag | Descrição |
|-----------|-----|-----------|
| Fluxo principal | `[PRINCIPAL]` | Caminho feliz do usuário — tudo funciona como esperado |
| Validação de campo | `[VALIDAÇÃO]` | Campos obrigatórios, formatos inválidos, limites |
| Regra de negócio | `[REGRA]` | Violação de uma RN específica (com ID da regra) |
| Permissão de acesso | `[ACESSO]` | Perfis que podem/não podem realizar a ação |
| Estado/Transição | `[ESTADO]` | Mudanças de estado do item (ex.: rascunho → publicado) |
| Integração visível | `[INTEGRAÇÃO]` | Efeitos em outras telas/módulos do sistema |
| Caso de borda | `[BORDA]` | Situações extremas, zero itens, máximo de caracteres |

### MATRIZ DE CENÁRIOS por funcionalidade (mínimo nomeado — obrigatório)

Cada **funcionalidade (RF)** coberta pela épica deve ter uma matriz de cenários com, no mínimo:

| Mínimo | Categoria | Regra de geração |
|--------|-----------|-------------------|
| ≥1 | `[PRINCIPAL]` | Caminho feliz do RF com dados válidos concretos |
| ≥1 | `[VALIDAÇÃO]` | Entrada inválida — campo obrigatório ausente, formato errado ou limite estourado |
| ≥1 **por RN aplicável** | `[REGRA]` | **Cada RN-xxx do `business-rules.md` aplicável ao RF** tem ≥1 caso exercitando sua violação — não basta 1 RN por épica |
| ≥1 | `[ACESSO]` | Quando existem perfis/papéis (ver kickoff): perfil sem permissão tenta a ação e é negado |
| ≥1 | `[BORDA]` | Situação extrema: zero itens, máximo de caracteres, duplicidade, limite numérico |

**NUNCA emitir uma funcionalidade só com caminho feliz.** Se uma categoria não se aplica ao RF
(ex.: não há perfis distintos), registrar a **justificativa** na Tabela de Cobertura RN × Caso —
nunca omitir silenciosamente. *(Gates: `EPIC_HAS_MINIMUM_COVERAGE` é FATAL no agregado da épica;
`FUNC_HAS_SCENARIO_MATRIX` cobra a matriz por RF como WARNING — com justificativa obrigatória por
categoria omitida.)*

**Estados de UI (quando `flow-map.md`/`uiContext` disponível):** cada estado de tela declarado
em `estadosUI` (ex.: `vazio`, `carregando`, `erro`) exige **1 verificação `[ESTADO]`** da tela
correspondente. Uma verificação **não** é obrigatoriamente um TC dedicado: os estados de uma
mesma tela podem ser **agrupados num único TC `[ESTADO]` por tela**, com um passo numerado e um
**resultado esperado próprio por estado**. É isso que `UI_STATE_HAS_CASE` cobra — rastreio de
cada estado, não contagem de arquivos.

#### Teto de volume

Os mínimos de cobertura **prevalecem sobre qualquer teto** — o teto é sinal de fatiamento, nunca
licença para omitir caso:

| Regra | Valor | Natureza |
|-------|-------|----------|
| **Mínimos nomeados por funcionalidade** (matriz acima) | ≥1 PRINCIPAL, ≥1 VALIDAÇÃO, ≥1 REGRA **por RN aplicável**, ≥1 ACESSO quando há perfis, ≥1 BORDA | **Obrigatório — prevalece sobre qualquer teto** |
| **Verificação por estado de UI** | 1 por estado de `estadosUI`, agrupável num TC `[ESTADO]` por tela | **Obrigatório — fora do teto** |
| **Teto de volume** | **3–8 casos por FUNCIONALIDADE (RF)** | Orientação: acima de 8, a funcionalidade está grande demais ou a matriz está a duplicar cenários |
| **Volume por épica** | ~20 casos como **sinal de fatiamento**, não como limite | Orientação: acima disso, **dividir a épica** |

**Critério de divisão de épica** (quando o volume por épica passa de ~20 casos): dividir por
jornada/funcionalidade de modo que cada épica resultante tenha **≤6 funcionalidades (RF)** e
**≤4 telas**. Registrar a divisão no sync-log.

### TABELA DE COBERTURA RN × Caso (obrigatória — final do documento)

O `test-plan.md` termina (antes dos Anexos) com a seção `## Cobertura RN × Caso`, cruzando
**toda RN-xxx do `business-rules.md`** em escopo com os casos que a exercitam:

```markdown
## Cobertura RN × Caso

| RN | Descrição curta | Casos que cobrem | Status |
|----|-----------------|------------------|--------|
| RN-001 | [resumo da regra] | TC-003, TC-007 | ✅ Coberta |
| RN-014 | [resumo da regra] | — | ⚠️ Não coberta — justificativa: [ex.: regra de processamento em lote sem efeito visível em homologação] |
```

**Regra:** toda RN-xxx deve aparecer em ≥1 caso **ou** ter justificativa explícita na coluna
Status. RN sem caso e sem justificativa → WARNING `RN_NOT_COVERED`. Os totais desta tabela
alimentam o gate `TESTPLAN_COVERAGE` do sync-log (ver §Sync-log).

### Técnicas de design de teste por tipo de caso

Usar a técnica de design apropriada conforme o tipo de regra/campo, para garantir cobertura sistemática (não apenas "acho que cobri"):

| Técnica | Quando aplicar | Regra de geração |
|---------|-----------------|-------------------|
| **Partição de equivalência** | Regra de negócio (`[REGRA]`) com faixas de valor (ex.: idade, faixa de renda, categoria) | Cada faixa de valor da RN → ≥1 caso `[REGRA]` |
| **Análise de valor-limite** | Campo com faixa numérica ou de tamanho (`[VALIDAÇÃO]`) | Para todo campo com faixa (min/max), gerar casos em `min-1`, `min`, `max`, `max+1` |
| **Tabela de decisão** | RN com ≥3 condições combinadas (ex.: perfil + status + valor) | Montar tabela de decisão com todas as combinações relevantes; cada linha da tabela → 1 caso `[REGRA]` |

**Regra para RN de Derivação (cálculo):** quando a RN referenciada for do tipo **Derivação** (ver taxonomia de regras de negócio em [`../tools/references/spec-requirements-depth.md`](../tools/references/spec-requirements-depth.md) §5), o caso de teste deve conter os **valores de entrada** usados no cálculo **e** o **resultado esperado já calculado** — não apenas "o sistema calcula corretamente".

### Anatomia de um caso de teste

Cada caso de teste deve ter **exatamente** estas seções:

```markdown
### [TC-NNN] Título descritivo em linguagem de negócio [CATEGORIA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | O que este teste valida (1–2 frases) |
| **Perfil do testador** | Quem executa (ex.: "Usuário com perfil Gerente") |
| **RN/RF relacionado** | IDs dos requisitos cobertos (ex.: RF-001, RN-003) |

**Pré-condições:**
- [o que precisa existir/estar configurado antes de começar]
- [dados de entrada necessários]

**Passos:**
1. Acesse [tela/módulo]
2. Preencha o campo [Nome] com [valor de exemplo]
3. Clique em [botão/ação]
4. ...

**Resultado esperado:**
- ✅ [O que deve acontecer — afirmações positivas]
- ✅ [Segundo resultado esperado, se houver]

**Resultado obtido:** _(em branco na emissão — preenchido por quem executa a homologação; o modo
_change preserva este campo nos TCs existentes)_

**Em caso de falha:** [O que fazer / a quem reportar / como capturar evidência]
```

> **Nota sobre dados de exemplo:** Sempre fornecer valores concretos nos passos
> (ex.: "preencha com '2024-01-15'" em vez de "preencha com uma data válida").
> Incluir massa de dados de teste no Anexo ao final do documento.

### Rastreabilidade

Cada caso de teste deve referenciar ao menos um RF ou RN do `requirements.md` por meio
do campo `RN/RF relacionado`. Isso permite que a spec-tasks rastreie cada TC no cenário de aceite da task de desenvolvimento que o cobre (`coverageNote`).

## Ordem de execução

```
A → Carregar insumos     (requirements.md + product-requirements.md + business-rules.md)

B → Inventário de épicas  (mapear RFs por módulo → épicas; herdar estrutura do spec-tasks
                           se tasks.json já existir em outputs/; ver nomenclatura determinística abaixo)

C → Por épica:
  C1 → Identificar pré-requisitos da épica (dados, perfis, configurações)
  C2 → Mapear fluxos UX do product-requirements.md → casos [PRINCIPAL]
  C3 → Mapear RNs do requirements.md → casos [REGRA]
  C4 → Inspecionar campos obrigatórios → casos [VALIDAÇÃO]
  C5 → Identificar perfis de acesso → casos [ACESSO] (se aplicável)
  C6 → Identificar transições de estado → casos [ESTADO] (se aplicável;
       com flow-map.md/uiContext: 1 caso [ESTADO] por estado de tela declarado em estadosUI)
  C7 → Identificar integrações visíveis → casos [INTEGRAÇÃO] (se aplicável)
  C8 → Adicionar casos de borda críticos → casos [BORDA]

D → Verificar MATRIZ DE CENÁRIOS      (mínimos nomeados da § MATRIZ DE CENÁRIOS por RF;
                                       categoria não aplicável exige justificativa)

D2 → Montar TABELA DE COBERTURA RN × Caso (toda RN-xxx do business-rules.md em ≥1 caso ou
                                       justificativa; calcular números do gate TESTPLAN_COVERAGE)

E → Construir anexo de massa de dados (ambientes, credenciais de teste, dados pré-criados)

F → Passe de linguagem               (remover TODA terminologia técnica — ver tabela §Princípio)

G → Emitir test-plan.md
  ↪ Conferir com o script (contagens, cobertura RN × caso e os validators checáveis por texto):
       node ../tools/check-testplan.mjs outputs/spec/test-plan.md \
         --business-rules outputs/spec/business-rules.md
     A linha TESTPLAN_COVERAGE que ele imprime é a que vai para o sync-log — números contados,
     não estimados. Achado FATAL → corrigir o documento e rodar de novo
     (WARNING TESTPLAN_SCRIPT_CHECK). O escopo são as RN com bloco próprio no business-rules.md;
     a RN do Explore (RN-001…) citada só na Origem de uma RN-NOVO já está coberta por ela — não
     acrescentar linha «via RN-NOVO» na Tabela de Cobertura para ela
     (o script lista a equivalência em rns.promovidas)
```

### Nomenclatura determinística de épicas

Quando `spec-test-plan` roda **antes** de `spec-tasks` (ainda não existe `tasks.json` em
`outputs/`), a numeração das épicas é derivada de forma determinística do catálogo modular,
para que a `spec-tasks` (Fase 8) preserve os mesmos IDs ao montar o backlog e consiga casar
cada `TC-NNN` com a story/task que cobre o RF:

- **`EPIC-NNN`** — numerado **na ordem dos módulos `MOD-*`** listados em `requirements.md`;
  título da épica = **nome do módulo**.
- Quando a hierarquia de backlog do projeto **não usa nível de épica** (ex.: só Story/Task),
  as seções do plano continuam agrupadas por módulo (`## MOD-XXX — [Nome]`); o casamento com o
  backlog é feito pelo RF citado em cada TC.

Se `tasks.json` já existir em `outputs/`, **herdar os IDs de épica de lá** (Passo B) em vez de
recalcular — a `spec-tasks` é a fonte de verdade quando já rodou antes desta skill.

## Validadores (passe G — antes de emitir)

| Código | Verificação | Severidade |
|--------|-------------|------------|
| `TESTPLAN_SCRIPT_CHECK` | `node ../tools/check-testplan.mjs` rodado depois de emitir (passo G): a linha `TESTPLAN_COVERAGE` do sync-log sai dele, e achado FATAL do script volta para correção. Script ausente ou exit 2 → `TOOL_UNAVAILABLE:check-testplan` no sync-log e contagem manual. WARNING até rodar em projeto real sem falso positivo | WARNING |
| `TC_HAS_PRECONDITIONS` | Cada TC tem ≥1 pré-condição listada | WARNING |
| `TC_HAS_STEPS` | Cada TC tem ≥3 passos numerados | FATAL |
| `TC_HAS_EXPECTED_RESULT` | Cada TC tem ≥1 resultado esperado com ✅ | FATAL |
| `TC_HAS_TRACEABILITY` | Cada TC referencia ≥1 RF ou RN | WARNING |
| `EPIC_HAS_MINIMUM_COVERAGE` | Cada épica tem ≥1 PRINCIPAL + ≥1 VALIDAÇÃO + ≥1 REGRA | FATAL |
| `FUNC_HAS_SCENARIO_MATRIX` | Cada funcionalidade (RF) cumpre a matriz mínima nomeada (≥1 PRINCIPAL, ≥1 VALIDAÇÃO, ≥1 REGRA por RN aplicável, ≥1 ACESSO quando há perfis, ≥1 BORDA) ou tem justificativa por categoria omitida | WARNING |
| `RN_NOT_COVERED` | Toda RN-xxx do `business-rules.md` em escopo aparece em ≥1 caso OU tem justificativa na Tabela de Cobertura RN × Caso | WARNING |
| `PLAN_HAS_COVERAGE_TABLE` | Documento tem a seção `## Cobertura RN × Caso` com todas as RNs em escopo | WARNING |
| `UI_STATE_HAS_CASE` | Com flow-map.md/uiContext disponível: cada estado de `estadosUI` de tela em escopo tem **1 verificação `[ESTADO]`** — TC dedicado **ou** passo com resultado esperado próprio dentro do TC `[ESTADO]` da tela (ver § Teto de volume) | WARNING |
| `EPIC_SIZE_SIGNAL` | Épica com >~20 casos, ou >6 funcionalidades, ou >4 telas — sinal de que a épica deve ser dividida (o teto **não** autoriza omitir casos: ver § Teto de volume) | WARNING |
| `NO_TECHNICAL_LANGUAGE` | Nenhum TC contém termos de implementação proibidos (POST, GET, PUT, DELETE, HTTP status code, JSON, JWT, schema, payload, nullable, FK, foreign key, banco de dados, tabela, endpoint). **Exceção:** termos como "API", "sistema externo", "serviço de X", "gateway" são permitidos em TCs da categoria `[INTEGRAÇÃO]` quando descrevem o resultado visível, não a chamada técnica. | FATAL |
| `TC_HAS_CONCRETE_DATA` | Passos usam valores concretos, não placeholders como "valor X" | WARNING |
| `PLAN_HAS_ANNEX` | Documento tem seção de Anexo com massa de dados | WARNING |
| `RN_CALC_HAS_EXPECTED_VALUE` | Todo TC que referencia uma RN de Derivação (cálculo — ver `../tools/references/spec-requirements-depth.md` §5) tem valores de entrada concretos E o resultado calculado esperado explícito no "Resultado esperado" | FATAL |

**Política de bloqueio (canônica):**
- **FATAL** → **não emitir** o `test-plan.md`. Reportar as falhas no chat e corrigir antes de gerar o arquivo.
- **WARNING** → **emitir** o `test-plan.md` com um **banner `⚠️` no topo** listando os warnings, ex.:
  `> ⚠️ ATENÇÃO: X avisos (WARNING) — revisar antes de usar em homologação: [lista].`

## Integração com spec-tasks

> **Propriedade do contrato:** o **shape da Story e da Task é definido pela `spec-tasks`** (schema
> `tasks/v5.3`). Esta skill **não escreve** no `tasks.json` — apenas fornece o `test-plan.md`.

Quando `test-plan.md` existe em `outputs/spec/`, a **spec-tasks** (Fase 8) o usa **exclusivamente
como fonte de cenários** das tasks de desenvolvimento:

1. Lê os casos `TC-NNN` por épica, com o RF e as RNs que cada um referencia.
2. Na task funcional que implementa aquele RF, converte cada TC em um `acceptanceScenario`
   técnico (Given/When/Then + `testData` concreto) e registra
   `"coverageNote": "Cobre TC-NNN do plano de testes"` — sync-log `SCENARIOS_FROM: test-plan`. O
   nome do arquivo não entra na frase: o `NO_EXTERNAL_REFS_IN_TASKS` da `spec-tasks` reprova, e o
   caminho já vai em `externalReferences`.
3. O `spec-implement` (Fase 11) automatiza esses cenários test-first (unitário / integração / E2E).
4. Referencia o arquivo em `externalReferences` (raiz do `tasks.json`) para rastreabilidade.

> **O que NÃO acontece:** a `spec-tasks` **não cria** Story de Validação, task `class: "uat"` nem
> qualquer work item de "executar o roteiro". Homologação com o cliente é processo do cliente,
> sem código e não acelerável por IA — entrar no backlog inflava prazo e custo do forecast
> (`spec-estimate`). O `validate-tasks-business.mjs` reprova isso (`NO_UAT_BACKLOG`, FATAL). O
> roteiro humano deste documento continua sendo entregue ao cliente **como documento**.

## Exemplo de saída (trecho)

```markdown
# Plano de Testes — [Nome do Projeto]

**Versão:** 1.0 | **Data:** AAAA-MM-DD | **Gerado por:** spec-test-plan

---

## Metadados

| Campo | Valor |
|-------|-------|
| Projeto | [Nome do Projeto] |
| Épicas cobertas | EPIC-001, EPIC-002 |
| Total de casos de teste | 14 |
| Responsável | [A preencher] |
| Ambiente alvo | Homologação |
| Ambiente de integrações (sandbox/mock) | Sandbox real do gateway de pagamento |
| Perfis de usuário cobertos | Administrador, Atendente |

---

## [EPIC-001] — Gestão de Cadastro de Clientes

### Pré-requisitos da Épica

- Ambiente de homologação disponível e com dados limpos
- Usuário de teste criado com perfil **Administrador** (ver Anexo A)
- Usuário de teste criado com perfil **Atendente** (ver Anexo A)

---

### [TC-001] Cadastrar novo cliente com todos os dados obrigatórios [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que é possível criar um novo cliente fornecendo todos os campos obrigatórios. |
| **Perfil do testador** | Usuário com perfil Atendente |
| **RN/RF relacionado** | RF-CAD-001, RN-001 |

**Pré-condições:**
- Estar logado com o usuário Atendente (ver Anexo A)
- Acessar o módulo **Clientes** pelo menu lateral

**Passos:**
1. Clique em **Novo Cliente**
2. Preencha o campo **Nome Completo** com `[nome fictício do Anexo B]`
3. Preencha o campo **CPF** com `[CPF de teste válido do Anexo B — nunca CPF real]`
4. Preencha o campo **E-mail** com `[e-mail de teste do Anexo B]`
5. Preencha o campo **Telefone** com `[telefone de teste do Anexo B]`
6. Clique em **Salvar**

**Resultado esperado:**
- ✅ Mensagem de confirmação "Cliente cadastrado com sucesso" é exibida
- ✅ O cliente recém-criado aparece na lista de clientes
- ✅ Ao abrir o cadastro, todos os dados preenchidos estão corretos

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela e registrar no chamado informando o passo em que falhou.

*(No plano real, os passos usam os valores concretos da massa de teste dos Anexos — dados
fictícios, nunca dados pessoais reais.)*

---

```

## Anexo de Massa de Dados (seção obrigatória)

O documento termina com os anexos do template (`templates/test-plan.template.md`):
**Anexo A — Usuários de Teste** (perfil, usuário, senha `[definir com equipe]`),
**Anexo B — Dados Pré-necessários** (registros que devem existir antes dos testes) e
**Anexo C — Ambiente** (URL, versão, data, testador). Estrutura pronta no template — preencher lá.

## Modo _change — Alteração de Escopo

Invocar este modo quando o prompt contiver qualquer um destes sinais:
- "modo _change", "gere o test-plan_change", "alteração de escopo", "scope-change-analysis.md"
- O usuário apresentou `requirements_change.md`/`business-rules_change.md` ou
  `scope-change-analysis.md` como entrada, com um `test-plan.md` já existente em `outputs/spec/`

### O que muda no modo _change

| Aspecto | Modo normal | Modo _change |
|---------|-------------|--------------|
| Entrada principal | `requirements.md` + `product-requirements.md` completos | `scope-change-analysis.md` + `requirements_change.md`/`business-rules_change.md` + `test-plan.md` existente |
| Escopo de geração | Todos os casos de teste de todas as épicas | **Apenas** os casos de teste novos ou alterados pelo delta |
| Arquivo de saída | `test-plan.md` | `test-plan_change-[sigla].md` |
| Numeração dos TCs | `TC-001`, `TC-002`... **sequencial global** ao longo do documento inteiro (nunca reinicia por épica) | **Contínua** a partir do maior `TC-NNN` já usado no `test-plan.md` existente — nunca reaproveitar número já usado |
| Preservação de execução | N/A | `test-plan.md` original **não é sobrescrito** — o `Resultado obtido` já preenchido em homologações anteriores permanece intacto |

### Ordem de execução no modo _change

```
A_change → Carregar test-plan.md existente + scope-change-analysis.md (+ requirements_change.md)
         ↪ Identificar o maior TC-NNN já usado no test-plan.md existente (base da numeração contínua)

B_change → Para cada delta de requisito/regra identificado no scope-change-analysis.md:
         ↪ Requisito/fluxo NOVO → gerar TC(s) novo(s) — tag [PRINCIPAL]/[VALIDAÇÃO]/[REGRA] conforme o caso
         ↪ Requisito/regra ALTERADO → gerar TC(s) que exercitam o novo comportamento;
            referenciar o TC substituído em "TC anterior substituído"
         ↪ Requisito REMOVIDO → marcar o TC correspondente do test-plan.md original como
            "Obsoleto" (nunca excluir — mantém rastreabilidade e histórico de execução)

C_change → Numerar os TCs novos continuando a partir do maior TC-NNN existente (nunca reiniciar em TC-001)

D_change → Emitir test-plan_change-[sigla].md contendo:
         ↪ Metadados com referência ao test-plan.md base e ao scope-change-analysis.md
         ↪ Apenas os TCs novos/alterados/obsoletos — nunca replicar TCs inalterados
```

### Regras específicas do modo _change

1. **Nunca sobrescrever** `test-plan.md` — a saída é sempre `test-plan_change-[sigla].md`.
2. **Nunca reiniciar** a numeração de TC — a numeração contínua preserva o `Resultado obtido`
   já registrado nos TCs existentes do `test-plan.md` original.
3. **TCs obsoletos** (requisito removido) são marcados como "Obsoleto", nunca apagados —
   permite auditoria de regressão.
4. **Sem impacto** nos casos de teste → emitir `test-plan_change-[sigla].md` mínimo com a nota
   "Nenhum caso de teste impactado nesta alteração de escopo" — nunca omitir o arquivo.

## O que NÃO faz

- Não gera código, testes unitários, automatizados ou de carga (`spec-tasks` faz isso via
  `implementationGuidance.testingStrategy`).
- Não publica em Azure DevOps ou qualquer ferramenta externa (`spec-tasks-azure` faz isso).
- Não implementa features (`spec-implement` faz isso).
- Não define o shape de Story/Task do backlog — o schema é propriedade da `spec-tasks`
  (`tasks/v5.3`); esta skill apenas fornece o `test-plan.md` como insumo.
- Não cria nem numera `GAP-XXX` — lacunas entram como Questões em aberto (`spec-iterate`
  converte para GAP quando aplicável).
- Não substitui testes automatizados ou QA técnico — produz um roteiro de homologação manual
  para pessoas de negócio, que também serve de fonte aos cenários automatizados das tasks.
- Não gera (nem induz a `spec-tasks` a gerar) stories/tasks de homologação (UAT) no backlog —
  a `spec-tasks` reprova isso (`NO_UAT_BACKLOG`). Homologação com o cliente fica fora do
  `tasks.json`.

## Skills irmãs

| Skill | Fase | Relação com `spec-test-plan` |
|-------|------|-------------------------------|
| `spec-product` | 4/5 | Provê `requirements.md`, `product-requirements.md`, `business-rules.md` — insumo principal |
| `spec-iterate` | (cross) | Estabiliza requisitos antes desta skill rodar |
| `spec-data-model` | 6a | Provê contexto opcional de campos e estados |
| `spec-api-contracts` | 6b | Provê contexto opcional de respostas esperadas |
| `spec-tasks` | 7 | **Consome `test-plan.md`** como fonte dos `acceptanceScenarios[]` das tasks de desenvolvimento (`coverageNote: "Cobre TC-NNN"`); **não** cria stories/tasks de homologação (`NO_UAT_BACKLOG`) |
| `spec-implement` | 10 | Automatiza os cenários derivados dos `TC-NNN` (test-first) — rastreabilidade homologação ↔ teste técnico |

## Templates

- [`./templates/test-plan.template.md`](./templates/test-plan.template.md) — Template em branco do `test-plan.md` para referência de estrutura.

## Referências

- [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) — vocabulário e convenções da cadeia técnica (as relações com as outras skills estão na tabela Skills irmãs acima).
