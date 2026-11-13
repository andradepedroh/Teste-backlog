---
name: spec-hld
description: >
  spec-hld (Fase 6.6 — High-Level Design TO-BE) — invocar depois da spec-tech-rules (Fase 6.5) e
  antes da spec-data-model (Fase 7a) para desenhar a arquitetura do produto novo. Lê modules.md,
  requirements.md (RNF com métrica), context-map.md, flow-map.md, as rules de tech-rules/ e, no
  brownfield, architecture.md + threat-model.md do AS-IS. Produz um artefato: hld.md — contexto e
  containers (C4 níveis 1 e 2 em Mermaid), decomposição módulo → container, integrações externas,
  fluxos arquiteturais, topologia, RNF → tática ou risco aceito, fronteiras de confiança, ADRs com
  alternativas rejeitadas, riscos com spikes e delta AS-IS → TO-BE. Não redecide a stack: lê as
  decisões que já estão nas rules e registra cada uma como ADR. Validado por check-hld.py.
  Triggers: "desenho da arquitetura", "arquitetura TO-BE", "HLD", "high-level design", "diagrama
  de containers", "C4", "ADR", "decisão de arquitetura", "spec-hld". Conteúdo em Português do
  Brasil.
version: "1.0"
updated: "2026-08-25"
---

# spec-hld — Desenho de Alto Nível do produto TO-BE

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`CON-01`, `MOD-XXX`, `RNF-CATEGORIA-001`).

## Papel

Transforma as decisões técnicas já tomadas num **desenho do sistema novo** e confere esse desenho
contra os requisitos não funcionais.

A `spec-tech-rules` (Fase 6.5) é a camada **normativa**: o kickoff dela decide linguagem,
arquitetura, banco, autenticação e deploy, e essas decisões viram regras que todo mundo obedece.
Esta skill é a camada **descritiva e estrutural**: pega as mesmas decisões e mostra que peças
existem, quem fala com quem, onde cada módulo do produto vai morar e o que sustenta cada
requisito não funcional com métrica.

**Não há kickoff técnico aqui.** Esta skill **lê** as rules geradas na Fase 6.5 e registra cada
decisão macro como um ADR (Architecture Decision Record — o registro de uma decisão de
arquitetura, com o que foi descartado e o preço que a escolha cobra). Se uma decisão faltar nas
rules, ela entra em «Questões em aberto» — nunca é inventada aqui.

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

Vale para o `hld.md` inteiro. A regra 10 é obrigatória: cada container abre com uma frase dizendo o que ele faz para o negócio antes do nome da tecnologia, e cada ADR diz o que a escolha **custa** — não só qual foi. A tática de um RNF é escrita como efeito observável ("a consulta responde em até 2 s porque o resultado fica em cache"), nunca como nome de padrão solto.

## Posição no fluxo

```
spec-tech-rules (5.5)  →  spec-hld (5.6)  →  spec-data-model (6a)  →  spec-api-contracts (6b)
   decide e normatiza      desenha e valida     entidades por contexto     fronteiras REST × evento
```

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver
[`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §4), que já diz se
o projeto tem legado (`legado=Sim|Parcial|Não`) e qual o ambiente de rules.

Ao terminar, adicionar UMA linha:
`| # | data | spec-hld | <resultado-resumo> | hld.md | <questões em aberto> | próximo: spec-data-model |`

O `<resultado-resumo>` registra:
- o resultado do gate `HLD_VALID` (exit 0, ou o motivo da falha corrigida);
- `HLD_COMPACT: <motivo>` quando o desenho saiu em modo compacto, dizendo **o que ficou de fora**;
- a degradação, quando houver: `TOOL_UNAVAILABLE:check-hld` (validador ausente → revisão humana
  declarada) ou `HLD_CROSS_PARTIAL: <fontes ausentes>` (gate que não pôde ser verificado por falta
  de `modules.md`, `context-map.md`, `requirements.md` ou `tech-rules/`).

## Entradas canônicas

| Arquivo | Obrigatório | Fonte | Consumo |
|---------|-------------|-------|---------|
| `modules.md` | Sim | Fase 6 | Todo `MOD-XXX` precisa aparecer na decomposição (gate `MODULES_MAPPED`) |
| `requirements/requirements.md` | Sim | Fase 6 | RNF com métrica → tática ou risco aceito (gate `NFR_TACTICS_MAPPED`); RF para dimensionar containers |
| `tech-rules/*.mdc` (via `spec-tech-rules`, Fase 6.5) | Sim — se ausentes, solicitar execução antes | Fase 6.5 | Decisões macro que viram ADR; stack de cada container |
| `context-map.md` | Sim | Fase 2 | Sistemas externos que precisam de linha `INT-NN` (gate `EXTERNAL_SYSTEMS_ADDRESSED`) |
| `product-requirements/product-requirements.md` | Recomendado | Fase 6 | Superfície de UI → containers de frontend |
| `flow-map.md` (via `check-flowmap.py --json`) | Recomendado | Fase 6 | `FLX-xxx` de maior volume/risco → fluxos arquiteturais |
| `benchmark.md` | Opcional | Fase 4 | Padrões de mercado que sustentam ou refutam uma alternativa do ADR |
| `architecture.md` (AS-IS C4 nível 2) | Sim no brownfield | Fase 3 | Inventário de componentes → delta AS-IS → TO-BE |
| `threat-model.md` (STRIDE do AS-IS) | Sim no brownfield | Fase 3 | `THR-xxx` que cada fronteira de confiança fecha ou herda |

**Regra de leitura do flow-map:** obter a estrutura por
`python3 ../tools/check-flowmap.py outputs/spec/flow-map.md --json` — **nunca** reparsear o `.md`
à mão. Sem flow-map, a seção de fluxos arquiteturais é derivada dos RF de maior peso e isso é
registrado em «Questões em aberto».

**Paths de saída:**
- Default: `outputs/spec/hld.md`
- Override: variável de ambiente `PIPELINE_OUTPUTS_DIR` (ver
  [`../tools/references/paths.md`](../tools/references/paths.md)).

## Saídas

| Artefato | Conteúdo |
|----------|----------|
| `hld.md` | Contexto e containers (C4 1 e 2), decomposição por módulo, integrações externas, fluxos arquiteturais, topologia de implantação, táticas por RNF, segurança de alto nível, ADRs, riscos e spikes, delta AS-IS → TO-BE, questões em aberto |

**As tabelas são a fonte de verdade.** O diagrama Mermaid é ilustração: quem consome o `hld.md`
(o relatório consolidado da `spec-estimate-report`, as skills seguintes) lê
`python3 ../tools/check-hld.py --json`, e esse JSON sai das tabelas. Um container que só existe no
diagrama não existe para ninguém — e o validador reprova.

**Fora de escopo:** ver «O que NÃO faz» ao final.

## Kickoff

Duas perguntas, e só quando a resposta não estiver no sync-log:

1. **Profundidade do desenho:**
   ```
   1) Completo  → as 10 seções do template (padrão)
   2) Compacto  → uma página: containers + integrações + as 3 ADRs de maior impacto
   ```
   O modo compacto **não desliga gate nenhum**: `MODULES_MAPPED`, `EXTERNAL_SYSTEMS_ADDRESSED`,
   `NFR_TACTICS_MAPPED` e `CONTAINERS_CONSISTENT` continuam valendo — o que encolhe é a prosa e
   as seções de fluxos, topologia, segurança e riscos. Escolhido o compacto, escrever
   `Modo: compacto` no cabeçalho do `hld.md` e registrar `HLD_COMPACT: <motivo>` no sync-log com
   a lista do que ficou de fora (gate `COMPACT_MODE_DECLARED`).

2. **Contexto:** greenfield ou brownfield. A linha `kickoff: legado=Sim|Parcial|Não` do sync-log
   já responde — perguntar só se ela não existir. Brownfield escreve `Contexto: brownfield` no
   cabeçalho e obriga a seção de delta (gate `ASIS_DELTA_PRESENT`).

## Ordem de execução

```
A → Carregar insumos      (modules + requirements + context-map + tech-rules + flow-map --json;
                           no brownfield, architecture.md e threat-model.md)
  ↪ PENSE: "Que decisões já estão fechadas nas rules? O que ainda não tem dono?"

B → Inventário de containers  (as peças que rodam e são implantadas sozinhas)
  ↪ PENSE: "O que roda separado? O que é só camada interna?" Camada interna NÃO é container.
  ↪ A tecnologia de cada container vem da rule correspondente — não escolher aqui.

C → Diagrama                  (Mermaid flowchart com subgraphs: contexto + containers)
  ↪ Cada nó carrega o CON-NN no rótulo; o validador confere que todo CON-NN citado existe.

D → Decomposição por módulo   (todo MOD-XXX do modules.md → CON-NN, ou N/A justificado)
  ↪ PENSE: "Onde a regra deste módulo executa? Onde ela aparece para o usuário?"

E → Integrações externas      (todo sistema do context-map → INT-NN, com estilo declarado)
  ↪ PENSE por integração: "espera resposta na hora (síncrono) ou responde depois (assíncrono)?
     E se o outro lado não responder, o que o usuário vê?"

F → Fluxos arquiteturais      (os FLX de maior volume/risco → caminho pelos containers)

G → Topologia + segurança     (onde cada container roda; onde o dado cruza fronteira de confiança)
  ↪ Brownfield: amarrar cada fronteira aos THR-xxx do threat-model do AS-IS.

H → Táticas por RNF           (todo RNF com métrica → tática OU risco aceito com justificativa)
  ↪ PENSE: "que peça do desenho faz este número acontecer?" Sem resposta, o risco é aceito
     explicitamente — nunca omitido.

I → ADRs                      (uma por decisão macro das rules + as que nasceram aqui)
  ↪ Cada ADR cita o arquivo de rule de origem e o que foi descartado.

J → Riscos e spikes           (o que ainda pode derrubar o desenho; spike como pergunta verificável)

K → Delta AS-IS → TO-BE       (só brownfield — destino de cada componente do architecture.md)

L → Emitir hld.md             (a partir de ./templates/hld.md)

M → Validação                 (rodar ../tools/check-hld.py — gate HLD_VALID; loop até exit 0)
```

## Validação (Etapa M — gate `HLD_VALID`)

```bash
python3 ../tools/check-hld.py outputs/spec/hld.md
```

Rodar da raiz do projeto; `../tools/` é relativo à pasta desta skill (ver
[`../tools/references/paths.md`](../tools/references/paths.md)). O script descobre sozinho as
fontes cruzadas ao lado do `hld.md` (`modules.md`, `context-map.md`,
`requirements/requirements.md`, `tech-rules/`); cada uma pode ser apontada por flag
(`--modules`, `--context-map`, `--requirements`, `--tech-rules`).

| Exit | Significado | Ação da skill |
|------|-------------|---------------|
| `0` | Gramática íntegra e gates FATAL cumpridos | Gate cumprido; colar o bloco MÉTRICAS na seção `## Cobertura` e seguir |
| `1` | Erro de gramática, referência quebrada ou gate FATAL reprovado | Corrigir o `hld.md` e rodar de novo (loop na própria fase) |
| `2` | Arquivo não encontrado | Corrigir o caminho |

**Fonte cruzada ausente** (projeto sem `modules.md`, sem `context-map.md`, sem `requirements.md`
ou sem `tech-rules/`): o gate correspondente sai como `N/A (fonte ausente)` com AVISO — **nunca**
como erro. Nesse caso, registrar `HLD_CROSS_PARTIAL: <fontes ausentes>` no sync-log e conferir o
ponto à mão.

**Fonte presente mas vazia** (o arquivo existe e o validador não achou nada nele para conferir):
o gate passa, mas sai um AVISO dizendo que passou **sem nada para conferir**. Gate verde sobre
zero itens não é gate cumprido — conferir se o arquivo de origem está no formato esperado antes
de seguir.

**Modo degradado `TOOL_UNAVAILABLE:check-hld`** (script ou Python ausentes): conforme
[`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md), gate → WARNING;
conferir à mão as quatro verificações FATAL (todo módulo mapeado, todo sistema externo
endereçado, todo RNF com métrica com tática ou risco aceito, todo `CON-NN` citado no inventário)
e registrar a revisão humana no sync-log.

## Validators (FATAL / WARNING)

### FATAL — bloqueia a entrega do artefato

| Código | Verificação |
|--------|-------------|
| `MODULES_MAPPED` | Todo `MOD-XXX` de `modules.md` (fora os `descontinuado`) aparece em `## Decomposição por módulo`, ligado a um `CON-NN` ou marcado `N/A` **com justificativa preenchida** |
| `EXTERNAL_SYSTEMS_ADDRESSED` | Todo sistema externo da seção «Sistemas, integrações, contratos mencionados» do `context-map.md` tem uma linha `INT-NN`, com Direção e Estilo (síncrono/assíncrono) declarados |
| `NFR_TACTICS_MAPPED` | Todo RNF com medida numérica em `requirements.md` aparece em `## Táticas por RNF` com tática ou com «Risco aceito — <motivo>» justificado |
| `CONTAINERS_CONSISTENT` | Todo `CON-NN` citado em qualquer ponto do arquivo — tabelas e diagrama — existe no inventário de `## Contexto e containers` |
| `HLD_VALID` | `../tools/check-hld.py` executado com **exit 0**. Exit 1 = FATAL. Degradações que rebaixam o gate a WARNING: `TOOL_UNAVAILABLE:check-hld` e `HLD_CROSS_PARTIAL` (fonte cruzada ausente) — ambas registradas no sync-log |

### WARNING — não bloqueia

| Código | Verificação |
|--------|-------------|
| `ADR_PER_DECISION` | Toda rule de projeto em `tech-rules/` (fora `security` e `frontend-default`, que são padrão fixo da empresa) é citada na coluna Origem de algum ADR; as não citadas saem listadas |
| `ASIS_DELTA_PRESENT` | Brownfield com `## Delta AS-IS → TO-BE` preenchido — uma linha por componente do `architecture.md` |
| `COMPACT_MODE_DECLARED` | Modo compacto declarado no cabeçalho **e** no sync-log (`HLD_COMPACT: <motivo>`), com a lista do que ficou de fora |
| `PTBR_STRINGS` | Todo texto legível por humanos em Português do Brasil |

## Definição de pronto

A validade estrutural é dos validators acima — o agente confere além deles:

- [ ] `python3 ../tools/check-hld.py outputs/spec/hld.md` com exit 0 e nenhum aviso não tratado
- [ ] Bloco MÉTRICAS colado em `## Cobertura`, com cada aviso tratado ou justificado ali
- [ ] Nenhum `[colchete]` de gabarito sobrando; tecnologia de cada container batendo com a rule
- [ ] Linha no `sync-log.md` com o resultado do gate e, se houver, `HLD_COMPACT` / `HLD_CROSS_PARTIAL`

## O que NÃO faz

- **Não decide stack, arquitetura, banco, autenticação ou deploy** — isso é `spec-tech-rules`
  (Fase 6.5). Aqui as decisões são lidas das rules e registradas como ADR.
- **Não modela entidades, colunas nem relacionamentos** — isso é `spec-data-model` (Fase 7a), que
  usa a decomposição daqui para agrupar entidades por contexto.
- **Não escreve contratos de API** — isso é `spec-api-contracts` (Fase 7b), que usa as linhas
  `INT-NN` daqui para separar o que é REST do que é evento.
- **Não gera código, scaffold, IaC nem docker-compose** — isso é `spec-scaffold` (Fase 10).
- **Não faz threat model** — o STRIDE do AS-IS é da `spec-legacy`; aqui só entram as fronteiras de
  confiança do TO-BE e a amarração aos `THR-xxx` existentes.
- **Não documenta o AS-IS** — `architecture.md` é da `spec-legacy`; aqui só entra o delta.
- **Não cria nem numera `GAP-XXX`** — lacunas entram em «Questões em aberto»; quem converte em GAP
  é o `spec-iterate` (§2.16 de `task-pipeline.md`).

## Templates

- [`./templates/hld.md`](./templates/hld.md) — template canônico com a gramática completa.
  **Passa no próprio validador** (`python3 ../tools/check-hld.py <template> --no-cross` → exit 0),
  então serve como exemplo executável do formato.

## Skills irmãs

| Skill | Fase | Relação com `spec-hld` |
|-------|------|------------------------|
| `spec-tech-rules` | 5.5 | Produz as rules que esta skill lê e transforma em ADR — roda **antes** |
| `spec-legacy` | 2 | Provê `architecture.md` (AS-IS) e `threat-model.md` para o delta e as fronteiras |
| `spec-product` | 5 | Provê `modules.md`, `requirements.md`, `product-requirements.md`, `flow-map.md` |
| `spec-data-model` | 6a | Consome a decomposição para agrupar entidades por contexto |
| `spec-api-contracts` | 6b | Consome as integrações `INT-NN` para separar fronteiras REST × eventos |
| `spec-tasks` | 7 | Consome os spikes da seção de riscos e agrupa tasks por container |
| `spec-estimate-report` | doc | Consome `check-hld.py --json` e desenha a arquitetura na aba Técnica |
| `spec-iterate` | (cross) | Varre o `hld.md` na reconciliação e converte as questões em aberto em GAP |
| `spec-scope-change` | 5.5-C | Propaga a alteração de escopo para o `hld.md` quando ela muda o desenho |

## Referências

- [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) — tabela canônica
  de fases, vocabulário de IDs e resolução das rules do projeto.
- [`../tools/references/paths.md`](../tools/references/paths.md) — onde o artefato é gravado e como
  os scripts são invocados.
- [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md) — política de
  degradação quando uma ferramenta não está disponível.
