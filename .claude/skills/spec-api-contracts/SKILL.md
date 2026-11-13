---
name: spec-api-contracts
description: >
  spec-api-contracts (Fase 7b — Especificação técnica) — invocar quando o usuário quiser gerar
  contratos de API (api-contracts.yaml em formato OpenAPI + suplemento JSON) a partir de requisitos
  estabilizados e do modelo de dados. Lê requirements.md, product-requirements.md, data-model.json,
  contexto de legado e o diretório de regras do projeto para produzir especificações completas:
  endpoints, schemas, autenticação, erros, idempotência, rate limiting e semântica HTTP.
  Suporta novos endpoints (CREATE) e modificações em existentes (ALTER). Produz exatamente dois
  artefatos: api-contracts.yaml e api-contracts-supplement.json.
  Pré-requisito: data-model.json de spec-data-model concluído.
  Conteúdo humano gerado em Português do Brasil.
version: "1.5"
updated: "2026-10-20"
---

# spec-api-contracts — Especificação de Contratos de API

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`operacao-exemplo`, `MOD-XXX`, `RF-XXX`).

## Papel

Lê os requisitos estabilizados (Fase 5/5) e o `data-model.json` (Fase 7a — skill anterior) para
produzir **contratos de API completos** que a Fase 8 (`spec-tasks`) consome para popular `apiContract`
/ `apiContracts` em cada task. Trata tanto criação de novos endpoints quanto alteração de existentes.

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

Vale para `summary`, `description`, a descrição de cada resposta de erro e o suplemento. A regra 10 é obrigatória: cada operação abre com uma frase dizendo o que ela faz e o que devolve, em português, antes do schema.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver
`../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-api-contracts | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.
O `<resultado-resumo>` deve registrar: resultado do gate `CONTRACT_LINT_CLEAN` (0 erros + **lista
de warnings de lint remanescentes**), resultado do gate `BREAKING_CHANGES_MAPPED` quando em modo
ALTER/_change, o gate `UI_BINDING_UPDATED` (nº de telas amarradas + endpoints órfãos justificados)
ou `UI_BINDING_SKIPPED: sem flow-map`, e qualquer degradação `TOOL_UNAVAILABLE:<nome>` (`vacuum`, `oasdiff`).

## Entradas canónicas

| Arquivo | Obrigatório | Fonte | Consumo |
|----------|-------------|-------|---------|
| `data-model.json` | Sim (pré-requisito crítico) | Fase 7a (spec-data-model) | Entidades → schemas de request/response |
| `requirements/requirements.md` | Sim | Fase 5/5 | Casos de uso → operações HTTP |
| `product-requirements/product-requirements.md` | Sim | Fase 5/5 | Fluxos UX → endpoints |
| `hld.md` (via `spec-hld`, Fase 6.6) | Recomendado — ausente = WARNING `HLD_MISSING` | Fase 6.6 | Integrações `INT-NN`: separam fronteira REST (síncrono) de evento (assíncrono); containers → agrupamento de tags |
| `context/apis/*.yaml` | Recomendado (brownfield) | Fase 0 | APIs existentes → delta |
| Diretório de regras do projeto (default `.cursor/rules/`, senão `.claude/rules/`; override `RULES_DIR`) | Sim | Projeto | Convenções de path, autenticação, versionamento |

> **Como usar o `hld.md` (quando existir):** ler a estrutura por
> `python3 ../tools/check-hld.py outputs/spec/hld.md --json` — **nunca** reparsear o `.md`. Cada
> linha `INT-NN` traz o campo `estilo`: `síncrono` vira operação HTTP no contrato; `assíncrono`
> vira canal (fila, tópico, arquivo) e **não** deve virar endpoint REST só para caber no YAML —
> vai para `asyncInterfaces` do `data-model.json` e para o suplemento. Os `containers` do HLD dão
> o agrupamento natural das tags. Projetos anteriores à Fase 6.6 não têm o arquivo: registrar
> `HLD_MISSING: projeto anterior à Fase 6.6` no sync-log e seguir pelos requisitos, como antes.

**Paths de saída:**
- Default: `outputs/spec/api-contracts.yaml` e `outputs/spec/api-contracts-supplement.json`
- Override: variável de ambiente `PIPELINE_OUTPUTS_DIR` ou `metadata.paths.pipelineRoot`.

## Saídas

| Artefato | Conteúdo |
|----------|----------|
| `api-contracts.yaml` | Especificação OpenAPI 3.0+ com paths, schemas, security, examples |
| `api-contracts-supplement.json` | Campos não cobertos pelo OpenAPI: chaves de idempotência, semântica HTTP por operação, rate limiting, metadata de operação |

**Fora de escopo:** gerar código de servidor/cliente (`spec-scaffold` e `spec-implement` fazem isso — Fases 10-11), testes ou páginas de documentação.

> **Regra de idioma:** Nos dois artefatos, todos os valores de string legíveis por humanos
> (summaries, descriptions, mensagens de erro, exemplos com texto ao usuário) devem estar em
> **Português do Brasil**. Chaves estruturais (nomes de propriedades JSON, keywords OpenAPI,
> métodos HTTP) permanecem em inglês.

> **Regra de alteração (brownfield):** Quando `context/` revelar APIs existentes, os contratos
> devem distinguir novos endpoints de modificações. Cada endpoint modificado documenta o delta:
> novos campos, validação alterada, novos códigos de erro, autenticação modificada.

## Kickoff

Não há kickoff interativo nesta skill — verificar antes de iniciar:

0. **1º ler `auth.mdc`/`conventions.mdc`** (ou equivalentes em `.claude/rules/`, ver
   `../tools/references/task-pipeline.md` §3) — usar as decisões já registradas ali **sem
   perguntar**; perguntar ao usuário só se essas rules não existirem no diretório de regras.
1. `data-model.json` está disponível e completo? (pré-requisito crítico)
2. Projeto tem APIs existentes? (determina se `context/apis/` é lido)
3. Há convenção de versionamento de API? (ex.: `/v1/`, headers, etc.)

## Princípios de API (obrigatórios)

### Piso de maturidade — Richardson Maturity Model, Nível 2

Todo contrato gerado por esta skill atende, no mínimo, o **Nível 2 do Richardson Maturity Model**:

- **Recursos** identificados por URI como substantivos, não verbos (`/pedidos`, nunca `/criarPedido`);
- **Verbos HTTP** usados com sua semântica correta (GET idempotente e sem efeito colateral; POST para criação; PUT para substituição idempotente; PATCH para atualização parcial; DELETE para remoção);
- **Status codes HTTP** usados para comunicar o resultado da operação — nunca `200`/`500` genérico com o erro real só no corpo.

Nível 3 (HATEOAS/hypermedia) é opcional — só exigir se o diretório de regras do projeto declarar essa convenção explicitamente.

### Catálogo de estilo (Zalando / Google AIP)

Convenções obrigatórias, salvo override explícito no diretório de regras do projeto:

| Tema | Regra |
|------|-------|
| **Paginação** | **Cursor-based** para listas que crescem ou mudam com frequência (feeds, logs, dados transacionais) — evita duplicatas/saltos sob escrita concorrente. **Offset-based** (`?page=`/`?pageSize=`) só para listas pequenas/estáveis ou quando a UI exige salto para página arbitrária. Documentar a escolha e o motivo no contrato de cada endpoint de listagem. |
| **Filtros** | `?filter[campo]=valor` para filtros de campo simples; múltiplos filtros combinam múltiplas chaves (`?filter[status]=ativo&filter[categoria]=x`). Não inventar sintaxe de filtro ad-hoc por endpoint. |
| **Erros** | RFC 7807 (`application/problem+json`) — ver «Alinhamento com o catálogo de erros» abaixo. |
| **Versionamento** | Versão explícita na URI (`/v1/...`) salvo o diretório de regras do projeto declarar outra convenção (header, content negotiation). Nunca versionar implicitamente. |
| **Idempotência** | Todo `POST` que não é naturalmente idempotente (cria recurso com efeito colateral não repetível — pagamento, envio, criação de registro único) **exige** suporte ao header `Idempotency-Key`: o cliente envia uma chave única por tentativa lógica e o servidor devolve a mesma resposta para a mesma chave sem duplicar o efeito. Documentar no catálogo de erros o comportamento para chave repetida com payload diferente (`409`/`422`, conforme regra do projeto). |

### Alinhamento com o catálogo de erros (RFC 7807)

O catálogo de erros do Passo D (`Ordem de execução`) usa o formato **RFC 7807 Problem Details** (`type`, `title`, `status`, `detail`, `instance`, mais extensões `x-*` específicas do domínio — ex.: `x-rn-violada` para a regra de negócio violada). Todo `4xx`/`5xx` documentado no catálogo de erros corresponde a um schema de erro RFC 7807 reutilizável em `components/schemas/Problem` no `api-contracts.yaml`.

---

## Ordem de execução

```
A → Carregar insumos           (requirements + data-model + context + diretório de regras)
  ↪ PENSE: "Quais operações os casos de uso implicam? Que modelo de dados estou expondo?"

B → Inventário de endpoints    (varrer casos de uso por operações HTTP)
  ↪ PENSE: "Para cada caso de uso: qual HTTP verb + path?
     CRUD → POST/GET/PUT/DELETE. Busca → GET com query params.
     Batch → POST com array."

C → Derivação de schemas       (derivar request/response de data-model.json)
  ↪ PENSE: "Para cada endpoint: quais colunas da entidade viram campos de request?
     Quais viram campos de response? Qual é a projeção?"

D → Catálogo de erros          (mapear regras de negócio + exceções para erros HTTP, formato RFC 7807)
  ↪ PENSE: "Para cada violação de regra de negócio: qual HTTP status?
     400 = input inválido. 409 = conflito de estado. 422 = regra de negócio. 404 = não encontrado.
     Todo erro é um Problem Details RFC 7807 — ver «Princípios de API»."

E → Idempotência e rate limiting  (baseados em requisitos NFR e regras do projeto; POST não-idempotente exige Idempotency-Key — ver «Princípios de API»)

F → Semântica HTTP              (significado de cada status por operação)
  ↪ PENSE: "Para cada status code documentado: o que exatamente ele significa
     nesta operação? Um 200 de listagem tem semântica diferente de um 200 de
     atualização — registrar no suplemento, não deixar implícito."

G → Segurança                   (autenticação, autorização, headers obrigatórios)
  ↪ PENSE: "Este endpoint exige autenticação? Que escopo/role? Há headers
     obrigatórios (ex.: tenant, correlação) definidos nas regras do projeto
     que preciso propagar em todo endpoint?"

H → Exemplos                    (request/response realistas com valores de domínio em pt-BR)

I → Suplemento JSON             (preencher api-contracts-supplement.json com o que OpenAPI não cobre)

J → Emitir                      (escrever ambos os artefatos)

K → Gate de lint do contrato    (vacuum lint base — FATAL; ruleset OWASP — WARNING separado.
                                 Comandos, loop de correção e degradação em «Gate de lint do contrato»)
  ↪ Cruzamento contrato × suplemento, determinístico:
       node ../tools/check-contracts.mjs api-contracts.yaml api-contracts-supplement.json
     exit 1 lista os furos de SUPPLEMENT_MATCHES_YAML e EVERY_OPERATION_TRACED — corrigir e
     rodar de novo; no modo _change, o mesmo comando sobre o par *_change
     (WARNING CONTRACTS_CROSSCHECK_SCRIPT)

L → Amarração UI (Endpoints)    (condicional — endpoints → telas na ## Amarração Técnica do
                                 flow-map.md — ver «Amarração UI (Endpoints)»)
  ↪ Só roda quando outputs/spec/flow-map.md existe; senão registrar UI_BINDING_SKIPPED: sem flow-map no sync-log
```

## Schema do suplemento

Ver [`./templates/api-contracts-supplement.stub.json`](./templates/api-contracts-supplement.stub.json).

## Gate de lint do contrato (Passo K — `CONTRACT_LINT_CLEAN`)

Passo final obrigatório após emitir os artefatos: lintar o `api-contracts.yaml` com o **vacuum**.

1. **Verificar / obter o vacuum** — verificar → rota efêmera (`npx --yes @quobix/vacuum …`) →
   degradar, conforme [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md)
   (instalação permanente só com aprovação registrada).
2. **Lint base — comando exato e determinístico** (é o que o gate FATAL cobra):

   ```bash
   npx --yes @quobix/vacuum lint -d outputs/spec/api-contracts.yaml
   # vacuum instalado no PATH: vacuum lint -d outputs/spec/api-contracts.yaml
   ```

3. **Ruleset OWASP API Security — gate separado, WARNING** (`CONTRACT_LINT_OWASP`). O vacuum é
   compatível com rulesets Spectral, mas o ruleset OWASP **não vem embutido** e a resolução do
   pacote depende de rede/npm — invocação não determinística. Procedimento fixo:

   ```bash
   # 1. criar (uma vez) o ruleset no projeto, caminho fixo: .vacuum/owasp-ruleset.yaml
   mkdir -p .vacuum && printf 'extends:\n  - "@stoplight/spectral-owasp-ruleset"\n' > .vacuum/owasp-ruleset.yaml
   # 2. rodar com caminho de ruleset explícito
   npx --yes @quobix/vacuum lint -r .vacuum/owasp-ruleset.yaml -d outputs/spec/api-contracts.yaml
   ```

   Se o ruleset não resolver (sem rede, pacote indisponível, erro de `extends`), **não travar**:
   registrar `TOOL_UNAVAILABLE:vacuum-owasp-ruleset (motivo curto)` no sync-log e cobrir o OWASP API
   Security Top 10 pelo **checklist manual** da própria skill, marcando os achados como
   `[owasp-llm]`. Este passo **nunca** é FATAL enquanto a invocação não for determinística.

**Gate `CONTRACT_LINT_CLEAN` (FATAL):** vale sobre o **lint base do item 2** — comando fixo, sem
placeholder. A skill só declara o artefato concluído com **0 erros**. Warnings não bloqueiam, mas
viram **lista explícita no sync-log**. Se houver erro de lint → corrigir o YAML e rodar de novo
(loop na própria fase, quantas vezes for necessário).

**Modo degradado `TOOL_UNAVAILABLE:vacuum`:** política de
[`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md) — **verificar
(`vacuum version`) → rota efêmera (`npx --yes @quobix/vacuum`) → degradar**. Sem nenhuma das duas
(sem `npx`, sem rede, sem binário), o gate rebaixa de FATAL para WARNING, registra
`TOOL_UNAVAILABLE:vacuum (motivo curto)` no sync-log e a validação segue por **releitura LLM**
do YAML (sintaxe OpenAPI, refs quebradas, checklist OWASP API Security manual), marcando o
artefato como **não validado por ferramenta**. Nunca instalar por iniciativa própria.

**`oasdiff` (gate `BREAKING_CHANGES_MAPPED`) — mesma lógica, com a ressalva do binário Go:**
verificar `oasdiff --version` → **rota efêmera por container**
`docker run --rm -v "$PWD:/w" -w /w tufin/oasdiff breaking <anterior> <novo>` → degradar. **Sem
oasdiff nativo e sem Docker não há rota determinística**, e nesse caso o gate **não pode ser FATAL**:
rebaixa para WARNING, registra `TOOL_UNAVAILABLE:oasdiff (sem binário nem container)` no sync-log e
a detecção de breaking changes é feita por **releitura LLM dos dois contratos com revisão manual
declarada** (`BREAKING_CHANGES_MAPPED: modo=revisao-manual · revisor=<quem>`). Instalação
(`go install`, binário do release) só com aprovação humana registrada.

> **Nota — mock server (Prism, opcional, não é gate):** com o contrato lintado, é possível subir
> um mock imediato com `npx @stoplight/prism-cli mock api-contracts.yaml` para validação
> antecipada — front-end e integrações conseguem consumir a API especificada antes de existir
> implementação. Ver também o uso no `spec-prototype` (protótipo conectado).

## Amarração UI — Endpoints (Passo L — gate `UI_BINDING_UPDATED`)

Passo condicional executado **após** o `CONTRACT_LINT_CLEAN`: amarrar os endpoints do contrato às
telas do produto na seção `## Amarração Técnica` do `outputs/spec/flow-map.md` (gramática canônica
em `spec-product/templates/flow-map.md`).

**Condição de execução:** só roda quando `outputs/spec/flow-map.md` existe. Se não existir,
registrar `UI_BINDING_SKIPPED: sem flow-map` no sync-log e encerrar a skill normalmente.

1. **Derivar tela → endpoints** — para cada tela de `## Telas`, identificar quais operações do
   contrato ela consome, cruzando:
   - os PR de `product-requirements.md` (coluna RF/PR da tela × `linkedRequirements` de cada operação);
   - as etapas e transições do flow-map (qual ação de tela dispara qual operação);
   - o próprio desenho do contrato (Passo B — de qual caso de uso/tela cada endpoint nasceu).
2. **Preencher/atualizar a coluna Endpoints** da amarração, no formato `METHOD /path`
   (METHOD ∈ GET|POST|PUT|PATCH|DELETE), separados por vírgula, ou `—`:
   - Path **idêntico** ao declarado em `paths:` do `api-contracts.yaml` (incluindo prefixo de
     versão `/v1/...` e parâmetros `{id}`);
   - Seção ausente (Fase 7a não amarrou) → criar com o cabeçalho `| Tela | Entidades | Endpoints |`,
     uma linha por tela de `## Telas` e Entidades = `—`;
   - **Preservar a coluna Entidades** preenchida pela Fase 7a — nunca sobrescrever.
3. **Validar em loop até exit 0:**
   ```bash
   python3 ../tools/check-flowmap.py outputs/spec/flow-map.md --contracts outputs/spec/api-contracts.yaml
   ```
   (quando `data-model.json` existir, acrescentar `--data-model outputs/spec/data-model.json`
   para não regredir a amarração de entidades)
   - `ERRO` (exit 1 — endpoint malformado, tela inexistente/duplicada, célula vazia) → corrigir
     o flow-map.md e rodar de novo;
   - `AVISO: amarração TEL-xxx: endpoint «...» não existe no contrato` (não bloqueia — exit 0)
     → método/path divergente do YAML: alinhar e rodar de novo; o passo só encerra **sem nenhum
     aviso desse tipo**;
   - Métrica `endpoints órfãos (no contrato, sem amarração)` (exit 0) → cada órfão deve ser
     **justificado no sync-log** (job agendado, integração sistema-a-sistema, webhook, callback —
     sem UI por natureza) **OU**, se deveria ter tela e não tem, sinalizado como pendência para
     virar GAP no spec-iterate/spec-tasks — nunca criar `GAP-XXX` diretamente aqui (§2.16).

**Gate `UI_BINDING_UPDATED` (WARNING):** ao concluir, registrar no `<resultado-resumo>` do sync-log:
`UI_BINDING_UPDATED: N telas amarradas; endpoints órfãos justificados: [endpoint → motivo]; órfãos → GAP: [lista ou nenhum]`.

**No modo _change:** atualizar as linhas da amarração afetadas pelo delta (endpoint removido pelo
change sai da amarração; endpoint novo entra nas telas que o consomem) e validar `--contracts`
contra o contrato resultante (o mesmo `<resultante>` que o D_change monta com
`../tools/merge-contract-delta.py`) — o `api-contracts_change.yaml` contém só o delta e, passado
ao validador, geraria falsos avisos para endpoints pré-existentes. Com `noContractChanges: true`,
o passo não se aplica.

## Validators (FATAL / WARNING)

### FATAL — bloqueia emissão

| Código | Verificação |
|--------|-------------|
| `OPENAPI_PARSES` | `api-contracts.yaml` é OpenAPI 3.0+ sintaticamente válido (parse sem erros) |
| `SUPPLEMENT_MATCHES_YAML` | Todo `operationId` presente em `api-contracts.yaml` tem entrada correspondente em `api-contracts-supplement.json`, e vice-versa (cross-check bidirecional) |
| `EVERY_OPERATION_TRACED` | Toda operação tem `linkedRequirements` (RF-XXX) não vazio |
| `ERROR_CATALOG_COMPLETE` | Toda RN violável pela operação tem um `4xx` documentado no catálogo de erros |
| `CONTRACT_LINT_CLEAN` | Lint base (comando fixo do item 2 do § Gate de lint) retorna **0 erros**; warnings listados no sync-log — degradação `TOOL_UNAVAILABLE:vacuum` no mesmo § |
| `BREAKING_CHANGES_MAPPED` | *(modo ALTER/_change)* `oasdiff breaking <anterior> <novo>` executado e toda breaking change mapeada a CHG/GAP ou justificada — semântica completa na regra 6 do modo _change; política de ferramenta e degradação no § Gate de lint |

### WARNING — não bloqueia

| Código | Verificação |
|--------|-------------|
| `CONTRACTS_CROSSCHECK_SCRIPT` | `node ../tools/check-contracts.mjs <contrato> <suplemento>` rodado no Passo K; exit 1 = furo de `SUPPLEMENT_MATCHES_YAML`/`EVERY_OPERATION_TRACED` a corrigir antes do handoff; exit 2 ou script ausente → `TOOL_UNAVAILABLE:check-contracts` no sync-log. Os dois FATAL continuam valendo — o script é a evidência deles, e vira gate quando rodar em projeto real sem falso positivo |
| `PTBR_SUMMARIES` | `summary`/`description`/mensagens de erro estão em Português do Brasil |
| `HLD_BOUNDARIES_HONORED` | *(só quando `hld.md` existe)* Toda `INT-NN` de estilo `síncrono` tem operação no contrato e nenhuma de estilo `assíncrono` virou endpoint REST sem justificativa; divergência registrada em `x-open-questions`. Sem `hld.md`: registrar `HLD_MISSING: projeto anterior à Fase 6.6` no sync-log |
| `CONTRACT_LINT_OWASP` | Ruleset OWASP rodado com o procedimento fixo do item 3 do § Gate de lint; não resolvível → `TOOL_UNAVAILABLE:vacuum-owasp-ruleset` + checklist manual `[owasp-llm]`. **Nunca FATAL** |
| `UI_BINDING_UPDATED` | *(só quando `flow-map.md` existe)* Coluna Endpoints da `## Amarração Técnica` preenchida, `check-flowmap.py --contracts` com exit 0 e sem aviso de endpoint desconhecido; endpoints órfãos justificados no sync-log ou sinalizados para GAP — ver § Amarração UI (Endpoints). Sem flow-map: registrar `UI_BINDING_SKIPPED: sem flow-map` |

## O que NÃO faz
- **Não inventar** endpoints sem evidência nos casos de uso — registrar como questão em aberto (`x-open-questions`) quando falta informação; nunca criar `GAP-XXX` diretamente (§2.16 — numeração exclusiva de spec-iterate/spec-tasks).
- **Não gerar** código de cliente ou servidor.
- **Não assumir** esquema de autenticação sem evidência nas regras do projeto ou `context/`.

(Erros 4xx omitidos e delta brownfield omitido já são bloqueados por `ERROR_CATALOG_COMPLETE` e pela Regra de alteração.)

## Templates

- [`./templates/openapi.stub.yaml`](./templates/openapi.stub.yaml) — stub OpenAPI 3.0 mínimo.
- [`./templates/api-contracts-supplement.stub.json`](./templates/api-contracts-supplement.stub.json) — stub do suplemento.

## References

- Diretório de regras do projeto (resolver conforme [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §3) — convenções de autenticação, versionamento e paths.
- [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) — vocabulário da cadeia técnica.

## Skills irmãs

| Skill | Consome | Produz |
|-------|---------|--------|
| `spec-tech-rules` | — | `auth.mdc`/`conventions.mdc` (`.cursor/rules/**`) que esta skill lê antes de gerar |
| `spec-hld` | — | `hld.md` — integrações `INT-NN` que separam fronteira REST de evento |
| `spec-data-model` | — | `data-model.json` — entidades usadas para derivar schemas de request/response |
| `spec-product` / `spec-iterate` | `requirements.md`, `product-requirements.md` | Requisitos estabilizados consumidos por esta skill |
| `spec-tasks` | `api-contracts.yaml` + `api-contracts-supplement.json` (desta skill) | `tasks.json` com `apiContract`/`apiContracts` embutido |

---

## Modo _change — Alteração de Escopo

Invocar este modo quando o prompt contiver qualquer um destes sinais:
- "modo _change", "gere o api-contracts_change", "alteração de escopo", "scope-change-analysis.md"
- O usuário apresentou `data-model_change.json` ou `scope-change-analysis.md` como entrada

### O que muda no modo _change

| Aspecto | Modo normal | Modo _change |
|---------|-------------|--------------|
| Entrada principal | data-model.json + requirements.md | data-model_change.json + scope-change-analysis.md + api-contracts.yaml existente |
| Escopo de geração | Todos os contratos do projeto | **Apenas o delta** — endpoints novos e alterações em endpoints existentes |
| Arquivo de saída | `api-contracts.yaml` + `api-contracts-supplement.json` | `api-contracts_change.yaml` + `api-contracts-supplement_change.json` |
| Endpoints gerados | Todos como novos | NEW para endpoints novos; ALTER para endpoints modificados; REMOVED para endpoints removidos |
| Referência ao existente | Não se aplica | Obrigatório — cada ALTER documenta o que muda no contrato atual |

### Ordem de execução no modo _change

```
A_change → Carregar scope-change-analysis.md e data-model_change.json
         ↪ Identificar quais endpoints da Camada 2 (Contrato de API) foram afetados
         ↪ Verificar CHGs com "Bloqueante para: spec-api-contracts_change" — devem estar respondidos

B_change → Carregar api-contracts.yaml existente
         ↪ Localizar cada endpoint afetado pelo delta

C_change → Para cada delta de contrato identificado (toda operação do delta carrega
           `x-operation-type: NEW | ALTER | REMOVED`; ALTER traz a operação COMPLETA, não um
           remendo — campo removido é campo ausente; o mesmo vale para components/schemas):
         ↪ ADIÇÃO de endpoint → `x-operation-type: NEW`, gerar contrato completo
         ↪ REMOÇÃO de endpoint → `x-operation-type: REMOVED` (a operação fica no delta só com a
           marca; quando o path inteiro sai, a marca vai no nível do path)
         ↪ REMOÇÃO de campo no request → ALTER, documentar campo removido + breaking change flag
         ↪ ADIÇÃO de campo no request → ALTER, documentar se obrigatório ou opcional
         ↪ ALTERAÇÃO de obrigatoriedade → ALTER, documentar regra condicional completa
         ↪ NOVO código de erro → ALTER, adicionar ao catálogo de erros do endpoint
         ↪ MUDANÇA DE RESPONSABILIDADE → ALTER, documentar qual sistema passa a calcular o campo

D_change → Verificar breaking changes (gate BREAKING_CHANGES_MAPPED — obrigatório)
         ↪ Gravar o delta do C_change como `api-contracts_change.yaml` (rascunho do E_change)
         ↪ Montar o CONTRATO RESULTANTE (vigente + delta) num arquivo temporário — nunca
           sobrescrevendo o vigente:
             python3 ../tools/merge-contract-delta.py api-contracts.yaml \
               api-contracts_change.yaml --out <resultante>
           Comparar o vigente com o delta faria o oasdiff acusar como REMOVIDO todo endpoint
           que o delta não repete. `AVISO:` do script = delta incoerente com o vigente
           (NEW que já existe, ALTER/REMOVED do que não existe, marca escrita `operationType`
           sem o `x-`) → corrigir o delta antes. `AVISO:` de propriedade ou `required` do
           vigente que o schema ALTER não traz = remoção: se intencional, fica (regra 3; o
           oasdiff a acusa); se não, o delta passa a trazer o schema completo.
           Sem PyYAML (exit 3, `TOOL_UNAVAILABLE:pyyaml`): registrar no sync-log e montar o
           resultante à mão pelas mesmas regras (docstring do script), ou converter os dois
           arquivos para JSON — o script lê JSON sem dependência
         ↪ Rodar `oasdiff breaking api-contracts.yaml <resultante>` — vigente × resultante
           (política de ferramenta e degradação: § Gate de lint do contrato)
         ↪ A saída do oasdiff é INSUMO OBRIGATÓRIO da análise de impacto:
           cada breaking change detectado deve ser mapeado a um CHG/GAP existente
           OU justificado explicitamente (por que é aceitável / intencional)
         ↪ Complementar com a auditoria manual:
           • Remoção de campo obrigatório = breaking change → sinalizar em metadata do endpoint
           • Alteração de tipo = breaking change → sinalizar
           • Adição de campo obrigatório = breaking change → sinalizar
         ↪ Sub-passo «Telas impactadas» (com flow-map presente): para cada breaking change
           reportada pelo oasdiff, cruzar endpoint → telas (## Amarração Técnica do flow-map.md)
           → etapas/fluxos (## Etapas via coluna Tela; fluxo pela coluna Fluxo da etapa) e
           produzir a lista «breaking change → telas → etapas do fluxo» como parte do INSUMO
           do gate BREAKING_CHANGES_MAPPED (a justificativa/mapeamento a CHG/GAP deve citar
           as telas afetadas)
         ↪ Sem flow-map, sem ## Amarração Técnica ou com a coluna Endpoints em «—»:
           registrar no sync-log que o impacto de telas NÃO pôde ser derivado mecanicamente
           (breaking changes mapeadas sem lista de telas)

E_change → Emitir api-contracts_change.yaml + api-contracts-supplement_change.json
         ↪ Incluir em info.x-change-metadata: { "changeMode": true,
             "sourceAnalysis": "scope-change-analysis.md",
             "basedOn": "api-contracts.yaml", "changeId": "[sigla]",
             "breakingChanges": [lista] }
         ↪ NÃO replicar endpoints sem alteração
```

### Regras específicas do modo _change

1. **Nunca sobrescrever** `api-contracts.yaml` — saída é sempre `api-contracts_change.yaml`
2. **Breaking changes** devem ser sinalizados explicitamente — remoção de campo obrigatório é breaking change mesmo se a intenção for "simplificar"
3. **Campos removidos** devem ser documentados no suplemento com `deprecated: true` e `removedInChange: [sigla]` para rastreabilidade — no YAML do delta o campo removido **não aparece** (ALTER é a operação completa), senão o contrato resultante o mantém e o oasdiff não vê a remoção
4. **CHGs em aberto** relevantes aos contratos devem aparecer como `x-open-questions` no endpoint afetado — nunca assumir silenciosamente
5. **Se não há impacto nos contratos**, gerar `api-contracts_change.yaml` mínimo com `info.x-change-metadata.noContractChanges: true` — nunca omitir o arquivo
6. **Gate `BREAKING_CHANGES_MAPPED` (FATAL no modo ALTER/_change):** o handoff só acontece quando
   `oasdiff breaking` foi executado e **toda** breaking change reportada está mapeada a um CHG/GAP
   ou justificada em `info.x-change-metadata.breakingChanges[]`; com flow-map amarrado, cada item
   de `breakingChanges[]` cita as telas/etapas impactadas (sub-passo «Telas impactadas» do D_change).
   Degradação (`TOOL_UNAVAILABLE:oasdiff` → WARNING + releitura LLM com
   `modo=revisao-manual · revisor=<quem>`): § Gate de lint do contrato
