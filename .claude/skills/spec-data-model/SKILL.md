---
name: spec-data-model
description: >
  spec-data-model (Fase 7a — Especificação técnica) — invocar quando o usuário quiser gerar
  o modelo de dados estruturado (data-model.json) a partir de requisitos estabilizados.
  Lê requirements.md, product-requirements.md, contexto de legado e o diretório de regras do
  projeto para produzir um modelo completo: entidades, atributos, relacionamentos, índices,
  enumerações, notas de migração, canais assíncronos e questões em aberto. Suporta projetos greenfield (CREATE)
  e brownfield (ALTER em estruturas existentes). Produz o data-model.json e, a partir dele, o
  data-model.md legível por humanos.
  Pré-requisito: requirements.md e product-requirements.md estabilizados (Fase 5/5).
  Conteúdo humano gerado em Português do Brasil.
version: "1.6"
updated: "2026-10-20"
---

# spec-data-model — Especificação do Modelo de Dados

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`ENTIDADE-EXEMPLO`, `MOD-XXX`, `RF-XXX`).

## Papel

Lê os requisitos estabilizados (Fase 5/5) e produz um **modelo de dados completo e estruturado**
que a Fase 8 (`spec-tasks`) consome para popular `persistenceModel` e `asyncInterfaces` em cada task.
Trata tanto criação de novas estruturas quanto alteração de existentes (brownfield).

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

Vale para os campos de texto do `data-model.json` — `purpose`, a `description` de cada entidade e de cada coluna, `migrationNotes` — e para a devolutiva no chat. A regra 10 é obrigatória aqui: cada entidade abre com uma frase dizendo o que ela guarda e para que serve, antes da lista de colunas.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver
`../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-data-model | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.
O `<resultado-resumo>` deve registrar o resultado do gate `DATAMODEL_VALID` (exit 0 = validação
completa; exit 2 = **validação reduzida**, gate como WARNING; ou motivo da falha corrigida) e
qualquer degradação/rota efêmera registrada pelo validador — `TOOL_UNAVAILABLE:node`,
`TOOL_UNAVAILABLE:ajv (validação reduzida)` ou `TOOL_EPHEMERAL:ajv (npx ajv-cli)`;
se o Passo M rodou, citar o `.d2`/SVG gerado nos `<artefatos>`; para o Passo N, registrar
`UI_BINDING_UPDATED` (nº de telas amarradas + entidades sem tela) ou `UI_BINDING_SKIPPED: sem flow-map`;
para o Passo O, citar o `data-model.md` nos `<artefatos>`.

## Entradas canónicas

| Arquivo | Obrigatório | Fonte | Consumo |
|----------|-------------|-------|---------|
| `requirements/requirements.md` | Sim | Fase 5/5 | Entidades, campos, regras de negócio |
| `product-requirements/product-requirements.md` | Sim | Fase 5/5 | Fluxos UX → campos de persistência |
| `tech-rules/*.mdc` (via `spec-tech-rules`, Fase 6.5) | Sim — se ausentes, solicitar execução antes | Fase 6.5 | Decisões técnicas de banco/nomenclatura |
| `hld.md` (via `spec-hld`, Fase 6.6) | Recomendado — ausente = WARNING `HLD_MISSING` | Fase 6.6 | Decomposição módulo → container: agrupa entidades por contexto; ADRs de persistência |
| `context/domains/*.json` | Recomendado (brownfield) | Fase 0 | Entidades existentes → delta |
| `context/technical.json` | Opcional | Fase 0 | Tecnologia DB, encoding, constraints existentes |
| Diretório de regras do projeto (default `.cursor/rules/`, senão `.claude/rules/`; override `RULES_DIR`) | Sim | Projeto | Convenções de nomenclatura, padrões de ID, encoding |

> **Como usar o `hld.md` (quando existir):** ler a estrutura por
> `python3 ../tools/check-hld.py outputs/spec/hld.md --json` — **nunca** reparsear o `.md`. A
> tabela `decomposicao` (módulo → container) é o ponto de partida dos **bounded contexts**: cada
> container que guarda dado próprio tende a ser um contexto, e um módulo marcado `N/A` no HLD não
> gera entidade nesta entrega. Divergir dessa leitura é permitido — desde que o motivo entre em
> `openQuestions`. Projetos anteriores à Fase 6.6 não têm o arquivo: registrar
> `HLD_MISSING: projeto anterior à Fase 6.6` no sync-log e derivar os contextos dos requisitos,
> como antes.

**Paths de saída:**
- Default: `outputs/spec/data-model.json`
- Override: variável de ambiente `PIPELINE_OUTPUTS_DIR` ou `metadata.paths.pipelineRoot` no `tasks.json`.

## Saídas

| Artefato | Conteúdo |
|----------|----------|
| `data-model.json` | Bounded contexts, entidades (novas + alteradas), colunas, relacionamentos, índices, enumerações, canais assíncronos, notas de migração, questões em aberto (`openQuestions`) |
| `data-model.md` | **Derivado do `data-model.json`** — changelog, entidades, origem e propriedade, diagrama de entidades em Mermaid, enumerações, canais assíncronos, delta do modelo, estado declarado das migrations e questões em aberto. Gerado pelo passo O; nunca editado à mão |

**Fora de escopo:** gerar DDL, código ou migrações. Esta skill produz a **especificação**
que a implementação (`spec-scaffold` e `spec-implement` — Fases 10-11) usa para escrever DDL/código real.

> **Regra de idioma:** Em `data-model.json`, todos os valores de string legíveis por humanos
> (descrições, propósitos, notas) devem estar em **Português do Brasil**. Nomes de propriedades
> JSON permanecem em inglês. Identificadores seguem as convenções de nomenclatura do diretório
> de regras carregado (§ Ordem de execução — Passo A).

> **Regra de alteração (brownfield):** Quando `context/` revelar estruturas existentes, o modelo
> deve distinguir entre entidades/colunas `NEW` e operações `ALTER`. Cada alteração documenta
> o estado atual e o estado alvo — o agente implementador precisa conhecer o delta, não só o alvo.
>
> **Nota (brownfield/ALTER com banco acessível):** quando houver acesso ao banco vivo, recomenda-se
> rodar `tbls diff` entre o schema real e o documentado para conferir se o "estado atual" declarado
> nos `currentStateIfAlter` bate com a realidade. Detalhes de instalação e uso do `tbls` ficam no
> `spec-legacy` — aqui é apenas referência de cross-check.

## Kickoff

Não há kickoff interativo — a skill roda logo após `spec-tech-rules` (Fase 6.5). Verificar antes
de iniciar: (1) gaps respondidos e sync-log atualizado; (2) greenfield ou brownfield; (3) tecnologia
de banco (ler `database.mdc`; perguntar só se ausente).

## Princípios de modelagem (obrigatórios)

### Piso de normalização — 3FN (Terceira Forma Normal)

Todo modelo, greenfield ou brownfield, parte da **3ª Forma Normal (3FN)** como piso. Desnormalizar um campo/entidade só é aceitável quando:

1. Motivado por um **padrão de acesso documentado** (ex.: leitura de altíssima frequência que exigiria join custoso em tempo de execução);
2. Registrado explicitamente em `migrationNotes` da entidade, explicando **qual** padrão de acesso justifica o campo desnormalizado e **qual** risco de inconsistência está sendo assumido.

Desnormalização sem essa justificativa em `migrationNotes` é tratada como campo inventado (ver `NO_INVENTED_FIELDS`).

### DDD tático — Agregados como fronteira de consistência

- **Agregado = fronteira de consistência transacional.** Cada agregado tem uma raiz (aggregate root); toda invariante que precisa ser verdadeira *imediatamente* após uma escrita vive **dentro** do mesmo agregado.
- **Referência cross-agregado só por ID** — nunca join transacional entre agregados diferentes. Um agregado que precisa de dado de outro guarda o identificador (`xxxId`), não uma referência estrutural às colunas do outro agregado.
- **Invariantes dentro do agregado**: regra de negócio que exige consistência forte e imediata (ex.: "saldo não pode ficar negativo") deve estar contida nas entidades/atributos de um único agregado. Regra que cruza agregados é consistência eventual, não invariante transacional — documentar como tal (ex.: via canal assíncrono, nunca via constraint cross-tabela).

### Naming — convenção única

A convenção de nomenclatura (case, prefixos, singular/plural, sufixo de chave estrangeira etc.) é **lida de `database.mdc`** (ou equivalente no diretório de regras do projeto) e aplicada sem re-decidir. Esta skill não escolhe nem propõe convenção alternativa — se `database.mdc` estiver ausente ou omisso quanto a um ponto de nomenclatura, registrar em `openQuestions`, nunca inventar convenção nova.

---

## Ordem de execução

```
A → Carregar insumos          (requirements + context + diretório de regras)
  ↪ PENSE: "Quais documentos descrevem os dados? Quais estruturas legadas existem?"

B → Identificar bounded contexts  (agrupar entidades por domínios de negócio)
  ↪ PENSE: "Quais domínios de negócio aparecem nos requisitos?
     Cada domínio = um bounded context no modelo."

C → Inventário de entidades   (varrer cada RF por sinais de criação/modificação de dados)
  ↪ PENSE: "Para cada caso de uso: que dados são Criados, Lidos, Atualizados, Deletados?
     Cada substantivo que é persistido = entidade candidata."

D → Extração de atributos     (para cada entidade, extrair cada campo de regras e fluxos)
  ↪ PENSE: "Para cada regra de negócio que restringe um valor: que coluna ela implica?
     Tipo? Nullable? Default? Único? E estados/statuses?"

E → Mapeamento de relacionamentos  (FKs, cardinalidade, cascade)
  ↪ PENSE: "Entidade A referencia Entidade B? Qual é a cardinalidade?
     A pode existir sem B? O que acontece quando B é deletado?"

F → Índices e performance     (baseado em padrões de query nos requisitos)

G → Enumerações               (constantes de domínio com valores fixos)

H → Canais assíncronos        (queues, topics, webhooks, jobs agendados)

I → Notas de migração (brownfield) (o que precisa migrar, transformar ou deprecar)

J → Questões em aberto        (o que falta para implementação — sem especulação)

K → Emitir                    (escrever data-model.json)

L → Validação estrutural      (rodar scripts/validate-data-model.mjs — gate DATAMODEL_VALID)
  ↪ Erro reportado → corrigir o data-model.json e rodar de novo (loop na própria fase)

M → Diagrama ER (opcional)    (rodar scripts/render-er.mjs — gera .d2 e SVG se o d2 estiver instalado)

N → Amarração UI (condicional)  (entidades → telas na ## Amarração Técnica do flow-map.md — ver «Amarração UI»)
  ↪ Só roda quando outputs/spec/flow-map.md existe; senão registrar UI_BINDING_SKIPPED: sem flow-map no sync-log

O → Documento legível (data-model.md)  (rodar scripts/render-data-model-md.mjs)
  ↪ Derivado do JSON: nunca editar à mão. Depende só do passo L; roda por último porque é a
     leitura final do modelo já assentado.
```

## Schema de saída (`data-model.json`)

Ver schema completo em [`./templates/data-model.schema.json`](./templates/data-model.schema.json).
Ver exemplos em [`./templates/`](./templates/).

## Validação estrutural (Passo L — gate `DATAMODEL_VALID`)

Após emitir o artefato, rodar o validador da própria skill:

```bash
node <dir-desta-skill>/scripts/validate-data-model.mjs outputs/spec/data-model.json
node <dir-desta-skill>/scripts/check-traceability.mjs outputs/spec/data-model.json
```

O segundo comando confere o que o schema não alcança — `TRACEABILITY_PRESENT`,
`ALTER_HAS_CURRENT_STATE` e `HYBRID_HAS_NOTES` — e lista cada furo por entidade (exit 1). Corrigir e
rodar de novo; os três continuam FATAL, o script é a evidência deles (WARNING
`TRACEABILITY_SCRIPT_CHECK`).

O script valida contra [`./templates/data-model.schema.json`](./templates/data-model.schema.json).
Defaults de caminho: `outputs/spec/data-model.json` → `outputs/data-model.json`; usar `--help` para
ver as opções. Além do schema, o script executa 2 checagens semânticas:

1. Todo `relationships[].targetEntity` referencia uma entidade existente no modelo (entidades legadas devem ser declaradas com `operationType: EXISTING_REF`);
2. Nomes de entidade são únicos em todo o modelo (cross bounded contexts).

As **2 checagens semânticas rodam sempre**, em qualquer rota — elas não dependem do ajv.

### Rotas de validação de schema (o que realmente acontece)

O ajv usado pelo kit fica em `spec-tasks/templates/node_modules`, que é **gitignored** — em clone
limpo ou no plugin distribuído ele **não existe**. Por isso o validador tenta três rotas, nesta
ordem (política de [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md)):

| # | Rota | Quando | Resultado |
|---|---|---|---|
| 1 | **ajv vendorizado/local** — `spec-tasks/templates/node_modules`, depois `node_modules` do projeto (cwd) e desta skill | vendor presente (após `npm ci`, ver abaixo) ou projeto já tem ajv | validação **completa** → exit `0` / `1` |
| 2 | **Rota efêmera `npx`** — `npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate …` | vendor ausente, `npx` + rede disponíveis. Não instala nada no ambiente (cache do npm) → **não precisa de aprovação** | validação **completa** → exit `0` / `1`; registrar `TOOL_EPHEMERAL:ajv (npx ajv-cli)` no sync-log |
| 3 | **Validador reduzido embutido** (JS puro, zero dependência) | vendor ausente **e** sem `npx`/rede, ou com `--no-npx` / `SPEC_KIT_NO_NPX=1` | validação **reduzida** → exit `2` (sem erros) / `1` (com erros); registrar `TOOL_UNAVAILABLE:ajv (validação reduzida)` |

O validador reduzido cobre o subconjunto do draft-07 que este schema usa e **lista no relatório**
qualquer keyword que não tenha conferido. Ele não substitui o ajv: por isso o gate cai para
WARNING nessa rota.

**Restaurar a validação completa (offline, sem rota efêmera):**
`npm ci --prefix <kit>/skills/spec-tasks/templates` (manifesto pinado e versionado). Instala
dependências no diretório do kit — mutação de ambiente: só com aprovação registrada, conforme
[`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md).

**Gate `DATAMODEL_VALID`** — semântica pelos exit codes (no modo _change, passar
`data-model_change.json` como 1º argumento; com `noModelChanges: true` o gate não se aplica):

| Exit | Significado | Ação da skill |
|---|---|---|
| `0` | Válido — validação completa (ajv vendorizado/local ou `npx`) | Gate cumprido; seguir |
| `1` | Inválido (schema ou semântica) **ou** erro de uso (arquivo/JSON) — **nunca** por dependência ausente | Corrigir o JSON e repetir (loop na própria fase) |
| `2` | Válido em **validação reduzida** (ajv indisponível) | Gate → WARNING, `TOOL_UNAVAILABLE:ajv (validação reduzida)` no sync-log, artefato marcado como validado parcialmente, **fase segue** |

**Modo degradado `TOOL_UNAVAILABLE:node`** (improvável): Node não tem rota efêmera — ausente,
degradar direto conforme o `tool-bootstrap.md` (gate → WARNING; validação por releitura LLM do
schema + as 2 checagens semânticas; artefato marcado **não validado por ferramenta**).

## Diagrama ER (Passo M — opcional)

Após a validação estrutural, opcionalmente gerar um diagrama ER do modelo:

```bash
node <dir-desta-skill>/scripts/render-er.mjs outputs/spec/data-model.json
```

O script (zero dependências) lê o `data-model.json` e gera um arquivo `.d2` na sintaxe `sql_table`
do **D2** — entidades como tabelas com colunas/tipos/PK/FK, relacionamentos como arestas com a
cardinalidade no label. Se o binário `d2` estiver no PATH, o SVG é renderizado automaticamente
(`d2 arquivo.d2 arquivo.svg`); senão, apenas o `.d2` é gerado com a instrução de renderização.

- D2: verificar `d2 --version`; **não há rota efêmera** — ausente, gerar só o `.d2` e registrar
  `TOOL_UNAVAILABLE:d2` no sync-log (instalação só com aprovação — comandos na tabela do
  [`tool-bootstrap.md`](../tools/references/tool-bootstrap.md)).
- Relatórios (ex.: `spec-report`) podem **embutir o SVG** gerado.
- Não é gate: a ausência do `d2` não bloqueia nada; o `.d2` fica versionado como artefato de apoio.

## Amarração UI (Passo N — gate `UI_BINDING_UPDATED`)

Passo condicional executado **após** a validação `DATAMODEL_VALID`: amarrar as entidades do
`data-model.json` às telas do produto na seção `## Amarração Técnica` do `outputs/spec/flow-map.md`
(gramática canônica em `spec-product/templates/flow-map.md`).

**Condição de execução:** só roda quando `outputs/spec/flow-map.md` existe. Se não existir,
registrar `UI_BINDING_SKIPPED: sem flow-map` no sync-log e encerrar a skill normalmente.

1. **Mapear entidades → telas** cruzando três fontes de evidência:
   - `product-requirements.md` — o campo "Etapa do fluxo" de cada PR liga PR → etapa → tela
     (via coluna Tela de `## Etapas` do flow-map);
   - flow-map `## Transições` — a coluna "Estado da entidade" (`Entidade.estado`) indica em quais
     telas cada entidade muda de estado (a matriz estado×tela do validador ajuda a conferir);
   - RF de `requirements.md` — a coluna RF/PR de `## Telas` indica que dados cada tela cria/lê/atualiza.
2. **Preencher/atualizar a coluna Entidades** da seção `## Amarração Técnica` do `flow-map.md`:
   - Seção ausente → criar ao final do arquivo com o cabeçalho `| Tela | Entidades | Endpoints |`
     e uma linha por tela de `## Telas` (tela única por linha);
   - Entidades = nomes **exatamente como em `entities[].name`** do data-model.json, separados por
     vírgula; tela sem entidade → `—` (célula nunca vazia);
   - **Preservar a coluna Endpoints** — manter o valor já preenchido pela Fase 7b ou `—`;
     nunca apagar endpoints existentes.
3. **Validar em loop até exit 0:**
   ```bash
   python3 ../tools/check-flowmap.py outputs/spec/flow-map.md --data-model outputs/spec/data-model.json
   # (rodar da raiz do projeto; `../tools/` é relativo à pasta desta skill — ver paths.md)
   ```
   - `ERRO` (exit 1 — tela inexistente/duplicada na amarração, célula vazia, colunas divergentes)
     → corrigir o flow-map.md e rodar de novo;
   - `AVISO: amarração TEL-xxx: entidade «X» não existe no data-model` (não bloqueia — exit 0)
     → grafia divergente: alinhar ao `entities[].name` e rodar de novo; o passo só encerra
     **sem nenhum aviso desse tipo**;
   - Métrica `entidades do data-model sem tela` (exit 0) → **aceitável** — entidades internas
     (auditoria, junção, configuração, filas) não têm tela; listá-las no sync-log, **nunca**
     forçar amarração artificial.

**Gate `UI_BINDING_UPDATED` (WARNING):** ao concluir, registrar no `<resultado-resumo>` do sync-log:
`UI_BINDING_UPDATED: N telas amarradas; entidades sem tela: [lista ou nenhuma]`.

**No modo _change:** atualizar apenas as linhas da amarração afetadas pelo delta e validar com o
`data-model.json` vigente/consolidado — o `data-model_change.json` contém só o delta e, passado ao
validador, geraria falsos avisos para entidades pré-existentes. Com `noModelChanges: true`, o passo
não se aplica.

## Documento legível (Passo O — `data-model.md`)

Depois do gate `DATAMODEL_VALID`, gerar a leitura humana do modelo:

```bash
node <dir-desta-skill>/scripts/render-data-model-md.mjs outputs/spec/data-model.json
```

O script (zero dependências) lê o `data-model.json` e escreve `data-model.md` ao lado dele:
changelog, entidades com o rastreio por extenso, origem e propriedade do dado, **diagrama de
entidades em Mermaid (`erDiagram`)**, enumerações, canais assíncronos, delta do modelo, estado
declarado das migrations e questões em aberto.

**O JSON é a autoridade e o markdown é derivado.** Nunca edite o `data-model.md` à mão: a execução
seguinte o reescreve. Para mudar o modelo, mude o JSON e gere de novo. O cabeçalho do arquivo
gerado diz isso a quem abrir.

**Não é o mesmo que o Passo M.** O `render-er.mjs` gera `.d2` e SVG, que relatórios **embutem**;
este gera markdown com Mermaid, que renderiza no repositório e na wiki mas exige renderizador no
consumidor. Os dois convivem — nenhum substitui o outro.

**Guarda de saída:** como o `render-er.mjs`, o script recusa com exit 3 escrever dentro de uma pasta
`skills/` (ou os espelhos `.cursor/skills`, `.claude/skills`, `plugin/skills`) — é o caso de rodar
contra um exemplo de `templates/`, que poluiria o repositório do kit.

**No modo `_change`:** gerar a partir do `data-model.json` vigente/consolidado, não do
`data-model_change.json`, que contém só o delta e produziria um documento que descreve um modelo
que não existe. Com `noModelChanges: true`, o passo não se aplica.

## Validators (FATAL / WARNING)

### FATAL — bloqueia emissão

| Código | Verificação |
|--------|-------------|
| `TRACEABILITY_PRESENT` | Cada entidade tem `traceability[]` com ≥1 item referenciando RF/RN de origem |
| `NO_INVENTED_FIELDS` | Toda coluna sem `businessRuleRef` (RN-XXX) e sem `traceability` correspondente na entidade deve estar registrada em `openQuestions` — nunca emitida como fato sem rastreio |
| `ALTER_HAS_CURRENT_STATE` | Toda entidade com `operationType: ALTER*` documenta `currentStateIfAlter` (estado atual → estado alvo); o delta de cada **coluna** alterada vai nas `notes` da coluna (padrão do exemplo brownfield) |
| `SCHEMA_VALID` | `data-model.json` valida contra [`./templates/data-model.schema.json`](./templates/data-model.schema.json) |
| `DATAMODEL_VALID` | `scripts/validate-data-model.mjs` executado com **exit 0** (schema + relacionamentos íntegros + nomes de entidade únicos) — ver § Validação estrutural. **Exit 1 = FATAL (modelo inválido ou erro de uso)**. Degradações que rebaixam o gate a **WARNING** (nunca abortam a fase): **exit 2** = ajv indisponível → validação reduzida, registrar `TOOL_UNAVAILABLE:ajv (validação reduzida)`; `TOOL_UNAVAILABLE:node` → releitura LLM registrada no sync-log. Rota efêmera `npx` valida por completo e só registra `TOOL_EPHEMERAL:ajv (npx ajv-cli)` |
| `HYBRID_HAS_NOTES` | Toda entidade com `dataOwnership.mode: HYBRID` tem `notes` preenchido, explicando o que é externo e o que é nosso. **O schema não pega isto** — exigiria `if`/`then`, keyword fora do validador reduzido do kit —, então é responsabilidade desta skill |

### WARNING — não bloqueia

| Código | Verificação |
|--------|-------------|
| `TRACEABILITY_SCRIPT_CHECK` | `scripts/check-traceability.mjs` rodado no Passo L; exit 1 lista os furos de `TRACEABILITY_PRESENT`, `ALTER_HAS_CURRENT_STATE` e `HYBRID_HAS_NOTES` a corrigir antes do handoff; exit 2 ou script ausente → `TOOL_UNAVAILABLE:check-traceability` no sync-log. Vira gate quando rodar em projeto real sem falso positivo |
| `PTBR_STRINGS` | Strings legíveis por humanos (`purpose`, `notes`, `description`, labels de enum) estão em Português do Brasil |
| `HLD_ALIGNED` | *(só quando `hld.md` existe)* Cada `boundedContext` do modelo tem correspondência na `decomposicao` do HLD (container ou módulo); divergência deliberada registrada em `openQuestions`. Sem `hld.md`: registrar `HLD_MISSING: projeto anterior à Fase 6.6` no sync-log |
| `UI_BINDING_UPDATED` | *(só quando `flow-map.md` existe)* Coluna Entidades da `## Amarração Técnica` preenchida, `check-flowmap.py --data-model` com exit 0 e sem aviso de entidade desconhecida; linha no sync-log com nº de telas amarradas + entidades sem tela — ver § Amarração UI. Sem flow-map: registrar `UI_BINDING_SKIPPED: sem flow-map` |
| `DATAMODEL_MD_EMITTED` | `data-model.md` gerado pelo passo O a partir do `data-model.json` que passou no gate, e citado nos `<artefatos>` do sync-log |

## O que NÃO faz
- **Não gerar DDL, código ou migrações** — apenas a especificação (`data-model.json` e o `data-model.md` derivado dele); implementação é das Fases 10-11.
- **Não assumir** tecnologia de banco sem evidência em `context/technical.json` ou regras do projeto.
- **Não misturar** entidades de bounded contexts diferentes num mesmo objeto.

(Campos inventados e delta omitido já são bloqueados pelos gates `NO_INVENTED_FIELDS` e `ALTER_HAS_CURRENT_STATE`.)

## Templates

- [`./templates/data-model.schema.json`](./templates/data-model.schema.json) — schema completo do artefato.
- [`./templates/data-model.stub.json`](./templates/data-model.stub.json) — stub mínimo para copiar e preencher. **Passa no próprio gate** (exit 0): `generatedAt` traz um ISO-8601 de exemplo (`2026-01-15T09:30:00Z`), não um placeholder textual, porque o schema exige `format: date-time`. Ao preencher, substituir `generatedAt` pelo timestamp real e `projectName` por `NOME-DO-PROJETO` → nome real — o validador emite `atenção:` (não bloqueia) enquanto esses dois valores continuarem os do stub.
- [`./templates/data-model.greenfield.example.json`](./templates/data-model.greenfield.example.json) — exemplo greenfield com placeholders.
- [`./templates/data-model.brownfield.example.json`](./templates/data-model.brownfield.example.json) — exemplo brownfield com delta.

## References

- Diretório de regras do projeto (resolver conforme [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §3 — `.cursor/rules/` → `.claude/rules/` → perguntar) — convenções de nomenclatura e padrões.
- [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) — vocabulário e convenções da cadeia técnica.

## Skills irmãs

| Skill | Consome | Produz |
|-------|---------|--------|
| `spec-tech-rules` | — | Regras técnicas (`.cursor/rules/**`) que esta skill lê antes de gerar |
| `spec-hld` | — | `hld.md` — decomposição módulo → container que agrupa as entidades por contexto |
| `spec-product` / `spec-iterate` | `requirements.md`, `product-requirements.md` | Requisitos estabilizados consumidos por esta skill |
| `spec-api-contracts` | `data-model.json` (desta skill) | Contratos de API (schemas derivados das entidades) |
| `spec-tasks` | `data-model.json` (desta skill) | `tasks.json` com `persistenceModel` embutido |

---

## Modo _change — Alteração de Escopo

Invocar este modo quando o prompt contiver qualquer um destes sinais:
- "modo _change", "gere o data-model_change", "alteração de escopo", "scope-change-analysis.md"
- O usuário apresentou um `scope-change-analysis.md` ou `scope-change-gaps.md` como entrada

### O que muda no modo _change

| Aspecto | Modo normal | Modo _change |
|---------|-------------|--------------|
| Entrada principal | requirements.md + product-requirements.md | scope-change-analysis.md + scope-change-gaps.md (CHGs respondidos) + data-model.json existente |
| Escopo de geração | Modelo completo do projeto | **Apenas o delta** — entidades novas e alterações em entidades existentes |
| Arquivo de saída | `data-model.json` | `data-model_change.json` |
| Operações geradas | NEW para tudo | NEW para entidades novas; ALTER para entidades existentes; DROP quando necessário |
| Referência ao existente | Não se aplica | Obrigatório — cada ALTER documenta estado atual → estado alvo |

### Ordem de execução no modo _change

```
A_change → Carregar scope-change-analysis.md e scope-change-gaps.md (respostas preenchidas)
         ↪ Identificar quais camadas de dados foram impactadas
         ↪ Verificar CHGs com campo "Bloqueante para: spec-data-model_change" — devem estar respondidos

B_change → Carregar data-model.json existente
         ↪ Inventariar entidades e campos já especificados nas áreas afetadas

C_change → Para cada delta de modelo identificado na análise:
         ↪ ADIÇÃO de entidade → operationType: NEW
         ↪ ADIÇÃO de coluna em entidade existente → operationType: ALTER, documentar estado atual
         ↪ REMOÇÃO de coluna → operationType: ALTER com nota de deprecação/remoção
         ↪ ALTERAÇÃO de constraint → operationType: ALTER, documentar constraint antes e depois
         ↪ COMPORTAMENTO_CONDICIONAL → documentar na coluna o critério de aplicação

D_change → Verificar se há entidades NÃO afetadas que podem ter impacto indireto
         ↪ (ex.: FK para nova entidade, índice que precisa ser ajustado)

E_change → Emitir data-model_change.json
         ↪ Incluir em metadata: { "changeMode": true, "sourceAnalysis": "scope-change-analysis.md",
                                   "basedOn": "data-model.json", "changeId": "[sigla do change]" }
         ↪ NÃO replicar entidades sem alteração — apenas o delta
```

### Regras específicas do modo _change

1. **Nunca sobrescrever** `data-model.json` — o arquivo de saída é sempre `data-model_change.json`
2. **Sempre documentar o delta** para operações ALTER: campo `currentStateIfAlter` na entidade (estado atual → estado alvo), como no modo normal — não inventar campos fora do schema
3. **CHGs em aberto** relevantes ao modelo devem ser registrados como `openQuestions` dentro do `data-model_change.json`, não resolvidos com premissa silenciosa
4. **Se não há impacto no modelo de dados**, gerar `data-model_change.json` com `{ "metadata": { "changeMode": true, "noModelChanges": true, "reason": "..." } }` — nunca omitir o arquivo

