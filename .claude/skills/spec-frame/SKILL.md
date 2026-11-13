---
name: spec-frame
description: >
  spec-frame (Fase 1 — Enquadramento, Hipóteses e Pré-protótipo) — primeira fase do discovery,
  OPCIONAL, antes do spec-ingest, para quando o material é pobre ou o problema está difuso.
  Transforma um pedido vago em: problema enquadrado; hipóteses de problema, solução ou
  oportunidade rotuladas (HIP-xxx); plano de levantamento a levar ao cliente (PRB-xxx); e opcional
  pré-protótipo HTML leve para consolidar ideias. Classifica a maturidade do insumo (ideia solta /
  material parcial / material rico); se já rico, manda entrar direto no spec-ingest. Diálogo
  socrático, uma pergunta por vez. Hard-gate: nada da cadeia dispara sem o consultor aprovar o
  enquadramento. Fronteira: o frame.md é fonte do spec-ingest — hipótese (HIP) vira
  inferência/questão lá; só fato relatado com âncora vira F. Não define produto nem gera RF,
  benchmark ou protótipo do produto. Saída: outputs/spec/frame.md. Triggers: spec-frame, enquadrar
  o problema, ideia difusa, planejar o levantamento, hipóteses de produto. Conteúdo em Português
  do Brasil.
version: "1.1"
updated: "2026-10-06"
---

# spec-frame — Enquadramento, Hipóteses e Pré-protótipo

> **Fase 1.** Roda **antes** do `spec-ingest`, e é **opcional**: existe para quando o material
> ainda é pobre ou o problema está difuso. Quando o insumo já é rico, esta skill se declara
> desnecessária e manda entrar direto no `spec-ingest` (Fase 2). Não substitui a ingestão — a
> **alimenta**.

**De onde ela parte, neste harness:** quando `outputs/explore/` traz o pré-projeto do Explore —
`hld-funcional.md`, `especificacao-funcional.md`, `especificacao-tecnica.md`, `gaps.md` e, quando
houver, `modelo-de-dados.md` —, ele mais o protótipo **já é** o enquadramento. É o caso normal no
começo do Plan. Nesse caso, ler `outputs/explore/` na Etapa A junto com `inputs/`, classificar o
insumo como **material rico** e recomendar entrar direto no `spec-ingest`: esta skill **não repete
o Explore**. Como a ingestão lê esses documentos está em `.claude/rules/harness/plan.md`. Sem
pré-projeto em `outputs/explore/`, esta skill segue o fluxo normal.

## Papel

Pegar um pedido difuso — muitas vezes só uma frase do consultor, um "o cliente quer modernizar o
X" — e transformar em material estruturado que o `spec-ingest` consegue processar:

1. **Problema enquadrado** — a dor por trás do pedido, não a solução pedida.
2. **Hipóteses rotuladas** (`HIP-xxx`) — de problema, de solução e de oportunidade, cada uma
   marcada como algo **a validar**, nunca como verdade.
3. **Plano de levantamento** (`PRB-xxx`) — o que perguntar ao cliente e que documentos pedir para
   fechar as lacunas antes de projetificar.
4. **Pré-protótipo opcional** — um esboço visual leve, só para consolidar uma ideia quando mostrar
   ajuda mais que descrever.

Tudo aqui é **hipótese de trabalho do consultor**. O valor da fase é organizar o pensamento e
planejar a conversa com o cliente — não decidir o produto.

<!-- linguagem-clara:v1 inicio -->
<!-- Bloco canônico. Ao alterar, rodar `python scripts/apply_linguagem_clara.py` para replicar em todas as skills. -->

## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)

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

Vale para cada `HIP-xxx` e `PRB-xxx` do `frame.md`, para o texto do enquadramento e para as
perguntas que você faz no chat. Aqui o vocabulário é o **do cliente** — "leva 3 dias para fechar o
pedido", não "gargalo no fluxo de aprovação".

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — pode já existir a linha de kickoff do
orquestrador `spec` (ver [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §4).
Ao terminar, adicionar UMA linha:
`| # | data | spec-frame | <resultado-resumo> | frame.md (+pre-prototype) | <PRB abertos> | <próximo passo> |`.

---

## A fronteira que não pode quebrar

O `spec-frame` **gera hipótese**; o `spec-ingest` **extrai fato com âncora**. Se as hipóteses desta
fase entrarem na cadeia como se fossem fato, a rastreabilidade do `spec-ingest` — que é o valor
inteiro dele — quebra. Por isso o `frame.md` **não** é lido pelas fases seguintes direto: ele é
tratado como **uma fonte** do `spec-ingest`, que reclassifica cada item.

Cada linha do `frame.md` nasce com uma **etiqueta** explícita:

| Etiqueta no frame.md | O que é | Como o `spec-ingest` trata (Fase 2) |
|----------------------|---------|--------------------------------------|
| `HIP-xxx` | Hipótese nossa (de problema, solução ou oportunidade) — sem fonte externa | Vira `INF-xxx` (inferência) **e** entra em `## Questões em aberto` para validar com o cliente. **Nunca** vira `F-xxx`. |
| `FATO` (com âncora) | Algo que um ator real disse/decidiu e o consultor está relatando — tem fonte (quem, quando) | Vira `F-xxx` normalmente, como qualquer fonte de chat (âncora: "frame.md · relato do consultor · call cliente dd/mm"). |
| `PRB-xxx` | Pergunta de levantamento ainda sem resposta | Vira `## Questões em aberto`. Não é fato. |

**Regra prática:** se ninguém de fora disse aquilo, é `HIP` — a etiqueta `FATO` exige uma âncora de
verdade (uma call, um e-mail, um documento que o consultor está repassando). Na dúvida entre `HIP` e
`FATO`, é `HIP`.

## Hard-gate (duplo)

1. **Nada da cadeia dispara sem aprovação.** Não invocar `spec-ingest` nem nenhuma outra skill, não
   gerar `frame.md` final, enquanto o consultor não aprovar o enquadramento. Apresentar, **parar**,
   esperar o "sim".
2. **Nada sai como fato sem âncora.** O `frame.md` só carrega `FATO` para itens com fonte real; o
   resto é `HIP`/`PRB`. Isso protege o `spec-ingest`.

---

## Classificação por maturidade do insumo (dizer em voz alta)

Antes da primeira pergunta, classificar o material recebido e **anunciar a classificação** para o
consultor poder corrigir:

- **Ideia solta** — não há material, só um pedido difuso. → Enquadramento completo: problema,
  hipóteses, plano de levantamento; pré-protótipo se ajudar.
- **Material parcial** — há alguns documentos, mas o problema ainda está difuso. → Afiar o problema
  e produzir um plano de levantamento **dirigido** às lacunas; poucas hipóteses.
- **Material rico** — o problema, os atores e os pedidos já estão claros no material. → **Curto-
  circuito:** dizer que o `spec-frame` não agrega aqui e recomendar entrar direto no `spec-ingest`
  (Fase 2), que já mede a prontidão do insumo no fim (Readiness Score).

**Quando surge complexidade escondida:** se no meio do enquadramento ficar claro que o "produto" são
na verdade vários produtos independentes, parar e ajudar a **decompor** — quais são as peças, como se
relacionam, em que ordem atacar — e enquadrar a primeira peça. Não gastar hipóteses refinando um
escopo que precisa ser quebrado antes.

## Vocabulário de IDs

`HIP-xxx` (hipótese) e `PRB-xxx` (pergunta de levantamento) nascem aqui — ver
[`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §2. **Não** criar
`F-xxx` (é do `spec-ingest`) nem `GAP-XXX` (é do `spec-iterate`). `FATO` no `frame.md` é uma
**etiqueta**, não um ID numerado — o `F-xxx` só nasce quando o `spec-ingest` ingere a fonte.

---

## Etapas de execução (ordem fixa)

### Etapa A — Ler contexto e classificar maturidade

1. Ler `inputs/` (se houver) e o `sync-log.md`. Listar rapidamente o que existe.
2. Classificar a maturidade (seção acima) e **anunciar**. Se for **material rico**, recomendar pular
   para o `spec-ingest` e encerrar aqui (gravando só a linha de sync-log e uma nota).

### Etapa B — Enquadrar o problema (diálogo socrático)

Uma pergunta por vez, múltipla escolha quando der. Objetivo: separar a **dor** da **solução pedida**.

- Quando o consultor traz uma solução ("preciso de um app mobile"), perguntar pela dor por trás
  ("o que hoje não dá para fazer sem isso?"). A solução pedida vira `HIP` de solução; a dor, se um
  ator confirmou, vira `FATO`; se é dedução nossa, vira `HIP` de problema.
- Cobrir: qual a dor, quem sente, por que agora, qual o custo atual (número quando houver).
- Não avançar para hipóteses de solução antes de o problema estar nomeado.

### Etapa C — Divergir em hipóteses (2 a 4 direções)

Levantar de 2 a 4 **direções** de solução ou oportunidade, cada uma com um trade-off curto e a sua
recomendação com o porquê. YAGNI: cortar o que não serve à dor. Registrar cada direção como
`HIP-xxx`. Isto **não** é definição de produto — é hipótese a validar; nada de RF, nada de escopo
fechado, nada de benchmark (isso é `spec-product` / `spec-benchmark`, fases depois).

### Etapa D — Convergir

O consultor escolhe quais hipóteses seguem para validação. As descartadas ficam registradas no
`frame.md` com o **motivo** do descarte — decisão registrada evita reabrir a mesma discussão depois.

### Etapa E — Pré-protótipo (opcional)

Só quando **mostrar ajuda mais que descrever** — uma tela, um fluxo, um layout hipotético. Gerar um
esboço **leve e estático**: um arquivo HTML simples (sem framework, sem build) ou um wireframe em
texto, salvo em `outputs/spec/frame/pre-prototype/`. Marcar no topo do arquivo:
`<!-- PRÉ-PROTÓTIPO — esboço de hipótese, NÃO é o protótipo do produto (spec-prototype, Fase 5) -->`.

Regras do pré-protótipo:

- Serve para **consolidar a ideia**, não para especificar. É descartável.
- Cada tela/fluxo esboçado aponta a `HIP-xxx` que ele ilustra.
- **Ponte com o `spec-prototype`:** o que sobreviver aqui é insumo daquela fase — anotar no
  `frame.md`, na seção «Pré-protótipo», o que o `spec-prototype` deve aproveitar. O pré-protótipo
  **não** compete com o protótipo do produto e **não** conta como legado.

### Etapa F — Plano de levantamento (PRB)

Listar o que ainda falta descobrir com o cliente para o material ficar bom o suficiente para
projetificar: perguntas a fazer, documentos a pedir, pessoas a entrevistar. Cada item é um
`PRB-xxx` com prioridade (bloqueia projetificar? sim/não). Este é o **produto de trabalho do
consultor** — não é ingerido como fato.

### Etapa G — Gate + saída

Apresentar o enquadramento no chat (problema, hipóteses que seguem, plano de levantamento, e o
pré-protótipo se houver). **Parar e esperar o "sim".** Só então gravar o `frame.md`, gravar a linha
do sync-log, e reportar o próximo passo (normalmente: rodar `spec-ingest` tendo o `frame.md` como
uma das fontes).

---

## Saídas

| Arquivo | Template em |
|---------|-------------|
| **`outputs/spec/frame.md`** | [`templates/frame.md`](templates/frame.md) |
| `outputs/spec/frame/pre-prototype/` (opcional) | esboço HTML/wireframe leve, não-canônico |

O cabeçalho obrigatório (título, `Status`, `Última atualização`, `Fontes`) já vem no template.
`Status` usa o enum `draft | validado | aprovado`.

---

## O que NÃO faz

- Não extrai fato com âncora nem gera `context-map.md`/`discovery-document.md` — isso é o
  `spec-ingest` (Fase 2), que recebe o `frame.md` como fonte.
- Não define produto, não numera RF, não escreve regra de negócio nem visão — isso é o `spec-product`
  (Fase 6).
- Não faz benchmark de mercado — isso é o `spec-benchmark` (Fase 4).
- Não gera o protótipo do produto — o pré-protótipo aqui é um esboço descartável; o protótipo real é
  o `spec-prototype` (Fase 5).
- Não trata protótipo nem mock como legado, e não abre `GAP-XXX` (isso é do `spec-iterate`).
- Não dispara nenhuma skill da cadeia sem o consultor aprovar o enquadramento (hard-gate).
