---
description: Fase Explore — pré-projeto conversacional que fecha com quatro documentos e um protótipo de alta fidelidade.
paths: ".claude/rules/harness/explore.md"
---

# 🔍 Explore — pré-projeto

## Comportamento

Conversacional, *human in the loop*, **sem cadeia obrigatória de skills**. Negócio comanda,
técnico apoia. O trabalho é descobrir; os templates são onde a descoberta assenta.

Push direto na `main` é aceitável nesta fase.

## Primeiro artefato, antes de qualquer outro

`workspace.md` na raiz — o manifesto multi-repo. Ele declara o papel de cada repositório
(`docs`, `codigo`, `prototipo`) e é o que o `delivery-gate` usa depois para decidir o que
fiscalizar. Repositório com papel não declarado tem push negado.

Valide com: `node .claude/hooks/workspace.mjs --validar`

**Layout dos repositórios no disco.** Com mais de um repositório, a sessão abre na **pasta-pai**,
com os repositórios lado a lado como subpastas dela; o repo de docs é a única subpasta com
`outputs/explore/` e `outputs/spec/`. Repositório **aninhado** dentro do de docs (o de código em
`codigo/`, por exemplo) não é suportado: o harness cai em mono-repo e o `delivery-gate` passa a
negar o push do próprio repo de docs. O `--validar` e o aviso do início da sessão acusam esse
layout pela coluna «Pasta local» do manifesto.

Logo em seguida, `outputs/spec/sync-log.md` com a linha de kickoff — é pré-requisito da
`spec-prototype` e é a memória cronológica única das três fases.

## O que o Explore entrega

| Artefato | Caminho | Status no fecho |
|---|---|---|
| `workspace.md` | raiz | válido |
| `hld-funcional.md` | `outputs/explore/` | completo |
| `especificacao-funcional.md` | `outputs/explore/` | cobertura completa, profundidade preliminar |
| `especificacao-tecnica.md` | `outputs/explore/` | preliminar |
| `modelo-de-dados.md` | `outputs/explore/` | preliminar e **opcional** |
| `gaps.md` | `outputs/explore/` | vivo |
| `sync-log.md` | `outputs/spec/` | com linha de kickoff |
| protótipo | repositório próprio | alta fidelidade |

A ausência de `modelo-de-dados.md` não bloqueia o fecho, mas **exige linha de dispensa no
`gaps.md`** — decisão não registrada é decisão não tomada. A linha vai na tabela «Dispensas
registradas» do template, com o nome do arquivo na primeira coluna e Motivo, Quem decidiu e Data
preenchidos de verdade:

```markdown
| modelo-de-dados.md | o modelo nasce direto da spec-data-model no Plan | Fulana de Tal | 2026-08-25 |
```

O fecho confere: sem o documento e sem essa linha, ele nega e mostra a linha a escrever. Campo com
o token de exemplo (`<quem decidiu>`), vazio ou só com traço não conta.

Os templates estão em `.claude/templates/`. Copie para `outputs/explore/` e preencha.

## Vocabulário — quatro famílias, nada mais

`MOD-CODIGO` · `RF-nnn` · `RN-nnn` · `GAP-nnn`

`F-xxx` é proibido aqui. Ver `CLAUDE.md`, seção Vocabulário de IDs.

## Ordem interna — por dependência real, não por decreto

1. `workspace.md` e `sync-log.md` com a linha de kickoff
2. *opcional:* `spec-frame` (só se o pedido chegou vago) → `spec-ingest` → `spec-legacy` e/ou `spec-benchmark`
3. `hld-funcional.md` — visão, módulos com `MOD-CODIGO`, funcionalidades por módulo
4. `especificacao-funcional.md` — personas, matriz de acesso, telas, `RF-nnn` e `RN-nnn`
5. `especificacao-tecnica.md` preliminar · `modelo-de-dados.md` preliminar
6. `spec-prototype` modo Geração, fidelidade Alta
7. revisão do `gaps.md` e da tabela de telas contra o que o protótipo revelou

O passo 6 não roda antes do 4 por dependência real: a skill lê os documentos de produto antes do
primeiro arquivo em `src/`. O passo 7 é o retorno esperado — o protótipo encontra erro de
entendimento mais rápido que qualquer documento.

## Aceleradores opcionais

`spec-ingest`, `spec-legacy` e `spec-benchmark` estão disponíveis. Não são obrigatórios.

`spec-legacy` e `spec-benchmark` exigem `outputs/spec/context-map.md` (validadores `V-LEG-01` e
`V-BEN-01`). Portanto **quem quer uma das duas roda `spec-ingest` primeiro** — é um pacote, não
três escolhas independentes. Os três escrevem nos seus caminhos nativos em `outputs/spec/` e o
Plan herda pronto, rodando a `spec-ingest` em modo delta.

**`spec-frame` — só para pedido vago, e antes de tudo.** Quando o que chegou é uma frase solta
(«o cliente quer modernizar o X») e ainda não há material para a `spec-ingest` ancorar, a
`spec-frame` enquadra o problema, levanta hipóteses (`HIP-xxx`) e o plano de levantamento
(`PRB-xxx`), e grava `outputs/spec/frame.md` (mais o pré-protótipo descartável em
`outputs/spec/frame/pre-prototype/`, se houver). A ordem é `spec-frame` → `spec-ingest`: a
ingestão lê o `frame.md` como fonte, e hipótese não vira `F-xxx`. A Decisão 71 tirou a skill do
**fluxo padrão** — o pré-projeto do Explore é o enquadramento, e com material rico ela mesma se
declara desnecessária —, mas não a proibiu: este é o único lugar onde ela roda. No Plan ela não
roda (`.claude/rules/harness/plan.md`).

## Protótipo — obrigatório, alta fidelidade

A `spec-prototype` roda em modo Geração, fidelidade **Alta**, sem negociar a stack: a constituição
frontend já está materializada em `.claude/rules/harness/frontend.md` e o Passo 3.0 da skill a
encontra.

**O fecho confere a fidelidade declarada**, não só a presença dos arquivos. Ele lê a linha
`Fidelidade:` do cabeçalho do `outputs/spec/prototype.md` — a que a skill escreve no Passo 1.2 — e
só fecha o Explore com `Fidelidade: alta` mais os três artefatos (`prototype.md`, `design-system.md`
e `screens-manifest.json`). Fidelidade Média ou Baixa não fecha a fase, nem com o `design-system.md`
gerado por fora: o `design-system.md` é saída do modo Geração, e a fidelidade menor pula esse modo.
Linha ausente, ou ainda com as opções do template (`baixa | média | alta`), conta como não
declarada. Se o pré-projeto foi legitimamente reduzido a um protótipo de fidelidade menor — o
cliente aprovou wireframe, por exemplo —, o caminho é a isenção (ver **Marco da fase**), que fica
registrada com autor, data e motivo.

O Passo 3.1 da skill exige cinco artefatos do kit que não existem no Explore. Este é o de-para —
a skill **não é editada**:

| Exigência (Passo 3.1) | Satisfeita no Explore por |
|---|---|
| `modules.md` — catálogo `MOD-CODIGO` | `hld-funcional.md` §2 e §3 |
| `requirements.md` — RF/RNF | `especificacao-funcional.md` §3 — `RF-nnn` |
| `business-rules.md` — RN | `especificacao-funcional.md` §3 — `RN-nnn` |
| `product-requirements.md` — PR, estados de UI, TTFV, WCAG | `especificacao-funcional.md` §1 e §2; estados de UI, TTFV e WCAG vêm da constituição frontend |
| `context-map.md` — `F-xxx` | dispensado no Explore. Se o pacote opcional rodou, usa-se o real |
| `frontend.mdc` | `.claude/rules/harness/frontend.md` |
| Design system | questionário do Passo 3.0.1 → `design-system.md` |

Os cenários de caminho feliz e de erro de negócio da fidelidade Alta são **derivados pela skill a
partir das `RN-nnn`** — não lidos de um documento. É por isso que não há CT nem CA nesta fase.

**O protótipo é do repositório, não da máquina.** Se o registry npm estiver bloqueado localmente,
construa o repo onde o npm funciona e consuma o resultado navegável para revisão.

## Forma agora, profundidade no Plan

O fecho valida **presença, gramática e preenchimento** — nunca profundidade. Documento preenchido
e raso passa; documento **vazio** não passa.

Isso é deliberado: lacuna vira `GAP-nnn`, e profundidade é o que o Plan agrega via `spec-product`.
`gaps.md` com GAPs abertos **não bloqueia** — GAP aberto é combustível do Plan, não defeito do
Explore.

Não deixe token de preenchimento (`<produto>`, `<CODIGO>`, `<nnn>`, `<data>`) no documento
entregue. Se um campo não se aplica, escreva por que não se aplica — não deixe o placeholder.

## Cabeçalho de todo documento do Explore

Este é o contrato. Os cinco documentos de `outputs/explore/` precisam das duas coisas abaixo, e o
`gramatica.mjs` avisa na hora quando falta uma delas. Os templates de `.claude/templates/` já
nascem com as duas — copiar e preencher basta.

**1. Uma versão declarada na linha de cabeçalho.** A palavra *Versão*, dois-pontos, e o número, na
mesma linha:

```markdown
> **Fase:** Explore · **Versão:** 0.1 · **Status:** preliminar
```

A forma acima é a dos templates e é a que se recomenda. O que o harness exige é menos que isso: a
ênfase é opcional, os dois-pontos podem estar dentro ou fora dela, e o espaçamento é livre —
`**Versão:** 0.1`, `**Versão**: 0.1`, `*Versão:* 0.1` e `Versão: 0.1` são todos aceitos. O que
**não** é aceito é a ausência: documento sem nenhuma versão declarada. A coluna `Versão` da tabela
do changelog não conta — ela é o cabeçalho da tabela, não a declaração do documento.

**2. Uma seção de changelog.** Um título de `##` a `####` cujo texto seja *Changelog*:

```markdown
## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-27 | versão inicial |
```

Nível, caixa, numeração (`## 0. Changelog`) e sufixo (`## Changelog do documento`) são livres. O
que **não** é aceito é a ausência da seção.

**Por que as duas.** O documento do Explore é revisado pelo cliente mais de uma vez, e o
`revisao.mjs` e o fecho de fase comparam revisões. Sem versão e sem changelog não há como dizer o
que mudou entre a conversa da semana passada e a desta — e é exatamente essa a pergunta que o
Nível 1 do caminho de revisão faz.

**Este é o dono do contrato.** Até a rodada J ele não tinha nenhum: as duas regex do
`gramatica.mjs` eram a única definição no repositório inteiro, de modo que ninguém tinha decidido
o quão rígidas elas deviam ser. Se o contrato mudar, muda aqui primeiro — e o `gramatica.mjs`
segue. Nem a rule nem o verificador exigem profundidade: uma linha de changelog é uma linha de
changelog.

## Caminho de revisão — quem lê o quê

| Nível | Quem | Tempo | O que lê |
|---|---|---|---|
| 1 | Decisor | ~10 min | `hld-funcional.md` mais o relatório do `revisao.mjs` |
| 2 | Validador de negócio | ~1 h | o protótipo navegável, mais a `especificacao-funcional.md` do seu módulo |
| 3 | Auditoria | sob demanda | `gaps.md`, `sync-log.md` e, se o pacote opcional rodou, `context-map.md` |

O protótipo de alta fidelidade é o principal instrumento de revisão: clicar em telas reais com os
seis estados encontra erro de entendimento mais rápido que ler documento.

O `product-discovery-kit.html` **não** é entregável do Explore — é do Plan.

## Marco da fase

O `fecho-explore` morde na primeira escrita em `outputs/spec/` fora da whitelist do Explore, ou na
invocação de uma skill de fase Plan. Ele verifica presença, gramática, preenchimento, a linha de
dispensa do `modelo-de-dados.md` ausente, o protótipo (os três artefatos e a `Fidelidade: alta`
declarada) e o relatório de revisão. Pré-projeto legitimamente reduzido declara isenção em arquivo,
com repositório, autor, data e motivo.

### A isenção — onde mora e como se escreve

Até aqui quem ensinava isto era a mensagem de negação. Funciona, mas depender de ser barrado para
descobrir que a saída de emergência existe é frágil, e ela é a **única** saída do único verificador
bloqueante desta camada.

O arquivo mora em **`outputs/spec/auditorias/_isencoes/`**. O nome dele é livre — o que o gate lê é
o bloco:

```markdown
<!-- gate:isencao -->
repositorio: https://dev.azure.com/acme/portal/_git/portal-docs
autor: Fulana de Tal
data: 2026-08-25
motivo: pré-projeto herdado de outro fornecedor, já especificado em contrato anterior
<!-- /gate:isencao -->
```

**Os quatro campos têm que ser preenchidos de verdade.** Campo vazio, campo só com espaço e campo
que ainda carrega o token de exemplo entre `<` e `>` — `<quem decidiu>`, `<AAAA-MM-DD>` — são
recusados, e o gate continua negando. Isso é deliberado: colar o bloco de exemplo sem editar
liberava o Plan de um pré-projeto vazio, o que fazia da isenção um botão de desligar em vez de uma
trilha de auditoria. O que **não** é conferido é o conteúdo em si — data plausível, URL que
resolve, autor que exista. Isso é julgamento humano sobre uma decisão humana.

Não há ledger agregado: o registro é o próprio arquivo, versionado no git com autor e data. É por
isso que os quatro campos importam — eles são a trilha.

Num workspace multi-repo, o arquivo vai em `outputs/spec/auditorias/_isencoes/` **do repo de
docs**, o mesmo lugar onde moram os outros artefatos. Se o gate reclamar de *workspace
indeterminado*, é porque há mais de uma subpasta com `outputs/explore/` e `outputs/spec/` e ele não
sabe qual é o repo de docs: `node .claude/hooks/workspace.mjs --validar` diz quais são as
candidatas.
