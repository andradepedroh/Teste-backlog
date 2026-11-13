---
name: spec-convert-prototype
description: >
  spec-convert-prototype (Conversão de protótipo — apoio à Fase 10) — migração de protótipo
  externo ou fora do padrão do projeto (HTML + CSS + JS vanilla) para Next.js/React — não o
  de fidelidade Alta da spec-prototype, que já nasce no padrão — com dupla
  verificação obrigatória: (A) paridade 100% com o inventário do legado e (B) conformidade
  100% com a rule de frontend do projeto. Usar quando o usuário pedir para migrar, converter
  ou portar um protótipo HTML/JS para Next/React, ou mencionar "converter protótipo",
  "migrar app vanilla", "portar para Next", "spec-convert". A skill não contém normas de
  frontend — apenas processo, gates e onde abrir a rule. Encerra só com pendências vazias e
  a rule marcada como Cumprido; durante o trabalho, refactor + testes até eliminar
  inconformidades (sem usar ADR/OutOfScope como substituto). Validação técnica: build verde
  no scaffold e smoke build após CSS; lint/typecheck e testes quando houver scripts;
  evidência dos comandos ou bloqueio documentado.
version: "1.2"
updated: "2026-10-20"
---

# spec-convert-prototype — Migração HTML/JS → Next.js

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

Vale para o relatório de migração e para a devolutiva no chat: o que passou a funcionar, o que ficou de fora e o que quebrou — em português, antes de qualquer nome de arquivo ou de biblioteca.

## Âmbito — quando usar esta skill (Decisão 72)

Esta skill converte **protótipo externo ou fora do padrão** do projeto para o padrão do
`frontend.mdc`: HTML/CSS/JS vanilla, outro framework, protótipo feito por outro time ou outra
ferramenta, ou o protótipo da `spec-prototype` em fidelidade Baixa/Média.

O protótipo da `spec-prototype` em fidelidade **Alta** não passa por aqui: ele já nasce em
`src/` no padrão do `frontend.mdc`, com dados mockados, e a troca dos mocks por serviços reais é
da `spec-implement`.

Os artefatos de acompanhamento — a matriz de paridade, a verificação da rule e as duas listas de
pendências — ficam em `outputs/spec/convert-prototype/`, na raiz do projeto, junto dos demais
artefatos da spec. Não ficam dentro da app migrada. Nos scripts do `package.json` da app,
`<RAIZ>` é o caminho dessa raiz visto da pasta da app (ex.: `..`).

## Resolução da rule (multi-ambiente)

Este documento usa `.cursor/rules/frontend.mdc` como **notação abreviada** para "a rule de
frontend do projeto" — não um path fixo. Resolver o path real antes de agir, seguindo
`../tools/references/task-pipeline.md` §3 (Resolução de rules multi-ambiente):

1. Procurar em `.cursor/rules/frontend.mdc` (formato Cursor).
2. Se ausente, procurar em `.claude/rules/frontend.md` (formato Claude).
3. Se ausente em ambos, **perguntar ao usuário** onde está a rule de frontend deste projeto —
   ou recomendar rodar `spec-tech-rules` para gerá-la antes de continuar.

Num projeto com o harness Elo, a rule de frontend é também a constituição
`.claude/rules/harness/frontend.md`, que não é copiada para a raiz (Decisão 73): o `frontend` da
raiz, quando existe, é o complemento do projeto e remete a ela. **Ler as duas, explicitamente** — a
constituição só carrega sozinha ao abrir um arquivo de tela da raiz do harness, e a app migrada
costuma estar noutra pasta.

**As rules do projeto prevalecem** sobre qualquer suposição desta skill. Toda menção a
`.cursor/rules/frontend.mdc` no restante deste documento refere-se ao resultado desta
resolução — abrir o arquivo real do repositório, qualquer que seja seu path.

## Kickoff (bloqueante)

**Não iniciar a Etapa A sem confirmar as três respostas abaixo:**

1. **Onde está o HTML/JS fonte do protótipo?** (path do arquivo ou pasta)
2. **Qual é a pasta destino da app Next.js migrada?** (nova ou existente)
3. **Qual o path da rule de frontend deste projeto?** (resultado da § Resolução da rule acima)

Sem as três respostas a skill não sabe o que inventariar (Etapa A), onde escrever (Etapa B) nem
contra qual rule verificar (todas as fases seguintes). Perguntar antes de prosseguir.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) se o projeto tiver um — a migração
pode ocorrer num repositório separado do discovery; se não houver `outputs/spec/` neste
repositório, não há nada a ler.

Ao terminar (Migração encerrada, ou ao fechar uma "Fatia N navegável" como marco intermediário),
adicionar UMA linha: `| # | data | spec-convert-prototype | <fase alcançada / fatia> | <outputs/spec/convert-prototype/pending-legacy.md, outputs/spec/convert-prototype/pending-rule.md, outputs/spec/convert-prototype/legacy-parity-matrix.md, outputs/spec/convert-prototype/frontend-md-verification.md> | <pendências abertas> | <próximo passo> |`.

---

## ⚠️ PRIMEIRA AÇÃO OBRIGATÓRIA — LER O ARQUIVO REAL

**Abrir e ler a rule de frontend do projeto (ver § Resolução da rule acima) na íntegra antes de qualquer código.**

> Por que isto importa: Esta skill **não contém** resumos, normas, tabelas de stack, MUST/MUST NOT,
> nem checklist copiado do `frontend.mdc`. Se você avançar sem ler o arquivo, vai implementar com
> base em memória ou suposições — e a memória diverge do que está escrito. O artefato de verificação
> da Etapa G compara o código com o **texto real da rule**, não com o que esta skill diz.
> Abrir o arquivo é a única forma de garantir conformidade real.

**Como abrir:** `cat .cursor/rules/frontend.mdc` ou pelo editor. Ler até o fim antes de prosseguir.

### Âmbito desta skill — processo vs regras técnicas

| Vive **nesta skill** | Vive **apenas** em `.cursor/rules/frontend.mdc` |
|---------------------|-----------------------------------------------|
| Fases, ordem de trabalho, gates (`build`, testes, lint quando existirem), evidência de comandos, paridade com HTML/JS legado, artefatos (`legacy-parity-matrix`, `frontend-md-verification`, pendências), proibições de atalho (iframe, script legado como UI) | Stack, estrutura de `src/`, Server vs Client, HTTP/services/paths, Query, RHF/Zod, View Model, `AppError`, **Testes** (Vitest/RTL, mocks), **Estilo** (Tailwind, `cn`, MUST sobre CSS), **Componentização**, MUST/MUST NOT do produto |

**Normas técnicas não são copiadas nem resumidas aqui** — a skill diz *quando* abrir a rule e *que gates rodar*; o *o quê* técnico é sempre o texto integral do `frontend.mdc`. Exemplos de nomes de script ou de arquivos neste documento são **convenção de migração ilustrativa** ou do repo que mantém o script; não substituem seções da rule.

---

## Objetivo e contrato de fecho

Esta skill entrega **dois "100%" simultâneos** — ambos obrigatórios para declarar **Migração encerrada**.
Entregar apenas um não é migração completa.

### Tabela resumo

| Objetivo | Fechado quando |
|----------|----------------|
| **100% legado** | `outputs/spec/convert-prototype/pending-legacy.md` **vazio**. Matriz `outputs/spec/convert-prototype/legacy-parity-matrix.md`: cada linha inventariada com **Coberto por** real + navegável e **Estado = Resolvido**, com **paridade de comportamento** face ao HTML/JS fonte (não só layout parecido). |
| **100% rule** | `outputs/spec/convert-prototype/pending-rule.md` **vazio**. Em `outputs/spec/convert-prototype/frontend-md-verification.md`, **cada** seção `## …` do `frontend.mdc` está **Cumprido** com evidência que resiste ao Double-check B (texto integral da seção). Gate mecânico verde **e** reconciliação manual concluída. |

### Encerramento estrito — sem atalhos de âmbito

Os seguintes pontos são **normativos** para a declaração final **Migração encerrada**:

1. **Legado — zero inconformidades em aberto**  
   - **Proibido** fechar com itens em `outputs/spec/convert-prototype/pending-legacy.md`.  
   - **Proibido** usar ADR, OutOfScope ou “fatia posterior” para **dispensar** linhas do inventário da Etapa A: ou se implementa a superfície/comportamento equivalente em React, ou **não** se declara migração completa (ficam apenas os marcos intermediários **Fatia N navegável**, sem usar esse marco como substituto de encerramento).

2. **Rule — alinhamento integral ao texto do `frontend.mdc`**  
   - **Proibido** estado final **Desvio** no artefato de verificação.  
   - **N/A** **não** é via para ignorar obrigações que o código migrado **deveria** cumprir: se uma seção da rule se aplica ao produto (UI, HTTP, Query, rotas, testes, etc.), o estado final tem de ser **Cumprido** após implementação ou refactor.  
   - **Única** forma legítima de não implementar uma obrigação da rule é **alterar primeiro** o arquivo `.cursor/rules/frontend.mdc` no repositório (commit explícito que remove ou restringe essa obrigação para este produto), **depois** revisar o artefato — nunca o contrário (marcar N/A sem mudança na rule).

3. **ADR**  
   - ADRs podem documentar **decisões de arquitetura** ou histórico, mas **não** substituem o critério acima: **não** contam como “lacuna resolvida” para legado nem como “Desvio aceito” para a rule no encerramento.

4. **Se o âmbito for grande demais para uma sessão**  
   - Entregar **fatias navegáveis** e **ciclos Etapa G → Etapa H** até esgotar pendências; **não** declarar Migração encerrada até o cumprimento integral dos pontos 1 e 2.

---

## Estratégia de execução — context-mode e subagentes

**Por que usar context-mode e subagentes:**
Protótipos reais têm centenas de linhas de HTML/JS e o `frontend.mdc` pode ter 20+ seções.
Carregar tudo no contexto ao mesmo tempo excede a janela útil e produz respostas degradadas.
Context-mode permite referenciar arquivos por índice sem os carregar inteiros.
Subagentes permitem trabalho paralelo: inventário + leitura da rule ao mesmo tempo,
double-check A e B em paralelo na Etapa G.

**Como usar:**

- **Context-mode (Cursor) / leitura parcial (Claude Code):** para protótipos com mais de ~200
  linhas de JS ou HTML, navegar o legado e o `frontend.mdc` por referências indexadas (Cursor)
  ou por leituras parciais com offset/limit (Claude Code) — não por paste no chat.
- **Subagentes paralelos — quando lançar:**
  - Etapa A: subagente A → inventário HTML/JS; subagente B → leitura e mapeamento do `frontend.mdc`.
  - Etapa F: fatias sem dependência mútua podem ser implementadas em paralelo.
  - Etapa G: subagente A → Double-check A (paridade legado); subagente B → Double-check B (conformidade rule).
- **Orquestração:** o agente principal mantém dois arquivos como fonte de verdade compartilhada:
  `outputs/spec/convert-prototype/legacy-parity-matrix.md` e `outputs/spec/convert-prototype/frontend-md-verification.md`.
  Subagentes reportam achados ao orquestrador antes de qualquer declaração de conformidade.
  O orquestrador nunca declara "100%" sem receber confirmação de ambos os subagentes.

---

## Obrigações específicas desta migração

Estas regras existem porque são os erros mais comuns ao migrar um protótipo vanilla:

1. **Proibido** usar **iframe**, **`document.write`** ou **`<script src="…app.js">`** como superfície principal da UI migrada.
   > Por quê: estas técnicas incorporam o legado em vez de migrá-lo — o resultado parece funcionar mas
   > não passa no Double-check A nem no B, porque o código não é React e a rule não é cumprida.

2. O HTML/JS vanilla é **só** fonte para inventário e paridade — **não** runtime dentro do Next.

3. Todo o produto final é **árvore React** sob `src/`, com rotas compondo views conforme o `frontend.mdc`.

4. Qualquer desvio temporário face ao `frontend.mdc` durante o trabalho tem de ser **corrigido** antes do encerramento — ou a rule tem de ser **atualizada** por commit explícito no repo (ver § Encerramento estrito).

---

## Fronteira Server ↔ Client

**Por que isto é uma seção separada:**
Next.js App Router tem React Server Components (RSC) que rodam no servidor.
Props passadas de RSC para componentes `"use client"` têm de ser serializáveis (JSON-safe).
Se o legado injeta funções no DOMAIN (ex.: `stageGates`), essas funções não podem ir como props.

**Como resolver:**
- Separar dados serializáveis (strings, números, arrays de dados) da lógica de negócio.
- A lógica que depende de funções vive em módulos client ou em hooks, nunca em props de RSC.
- Reconciliar sempre com as seções relevantes do `frontend.mdc` — a rule pode ter padrões específicos
  para esta fronteira.

---

## Validação técnica contínua e testes unitários (derivam do `frontend.mdc`)

**Por que esta seção existe:** o `frontend.mdc` não só define stack (**Vitest** + RTL + `jsdom` na tabela **Stack**) como dedica uma seção **Testes** a mocks HTTP, `safeParse` em schemas, padrões para hooks Query, etc. Esta skill **não copia** esses detalhes — obriga a **ler a rule** e a **traduzir** essas obrigações em trabalho e em comandos na app migrada.

### Leitura mínima na rule (além do arquivo completo)

- **Stack** — nome da ferramenta de unitários (hoje: Vitest) e RTL/`jsdom` quando lá estiverem.
- **Testes** — o que é MUST para mocks, schemas, hooks e o que é MUST NOT.

### Comportamento genérico do agente

1. **Checklist derivado da rule:** após ler **Testes**, listar mentalmente (ou nas notas de trabalho) quais obrigações aplicam ao código já migrado (ex.: schemas com negócio → testes `safeParse`; services HTTP → mock centralizado de `@/shared/services/http` ou MSW conforme o texto).
2. **Se a rule exige unitários** e o projeto ainda **não** tem `vitest` / script `npm test` / config compatível → introduzir o scaffold na **Etapa B** (ou início da **Etapa C**), alinhado ao que está escrito na rule — não substituir por outra framework sem alterar o `frontend.mdc`.
3. **Durante as fases 3–5**, quando se criam ou alteram `schemas/`, `mappers/`, `utils/` ou `*.service.ts` tocados pela migração, **implementar ou atualizar** os testes que a seção **Testes** exija para esse tipo de artefato (critério: “o texto da seção **Testes** pede cobertura disto?” → sim → escrever/atualizar teste).
4. **Em cada marco “Fatia N navegável”** e antes do **Auditório final**, executar o **§ Gate de validação técnica** abaixo; falhas bloqueiam a declaração correspondente até ficarem verdes ou até lacunas ficarem registradas em `outputs/spec/convert-prototype/pending-rule.md` com plano explícito.

### Gate de validação técnica (pasta raiz da app migrada)

Executar os **quatro primeiros comandos do § Gate mecânico — comandos** (typecheck / lint /
test quando existirem em `package.json` + `build`, sempre) — a sequência canônica, com as regras
sobre `npm test` e o script agregado `validate`, vive naquela seção; aqui não se repete.

Integração com a seção **Testes** do artefato `outputs/spec/convert-prototype/frontend-md-verification.md`: evidência **Cumprido** tem de ser consistente com testes que passem no gate acima e com o texto real da rule **Testes**.

### Evidência dos comandos e falhas de ambiente

- **Afirmações sem execução são inválidas:** antes de declarar **Etapa B concluída**, **Fatia N navegável** ou **Migração encerrada**, o agente deve **ter rodado** na pasta raiz da app migrada os comandos aplicáveis do § Gate (ou equivalente `npm run validate` quando existir) e registrar **exit code 0** de forma verificável na sessão (transcrição resumida dos comandos e do resultado).
- **Sandbox / path / ENOENT:** se `npm` ou `node` **não** conseguirem acessar o `package.json` do projeto ou falharem por ambiente, **proibido** declarar marcos ou migração encerrada como se os gates tivessem passado. Registrar bloqueio explícito (ex.: entrada em `outputs/spec/convert-prototype/pending-rule.md`: *Validação técnica — comandos não executados neste ambiente; usuário deve rodar localmente `npm run validate` ou a sequência do § Gate*) e só encerrar depois de evidência de execução bem-sucedida **ou** repetir os comandos quando o repo estiver acessível ao runner.

---

## Etapa A — Inventário (precisão obrigatória)

**Por que fazer inventário antes de qualquer código:**
Sem inventário, não há forma de verificar que nada ficou por migrar.
O Double-check A da Etapa G confronta o código com este inventário — se o inventário for incompleto,
o double-check passa mesmo com lacunas.

**Como fazer:**
- Usar context-mode para protótipos grandes; subagente dedicado ao inventário é recomendado.
- Ser exaustivo — cada item omitido aqui vai faltar no produto final.

| Fonte | O que registrar e porquê |
|-------|------------------------|
| **HTML** | Árvore de landmarks e **classes exatas** dos blocos principais — necessário para replicar o layout. IDs usados por JS — necessário para mapear listeners. `<style>` — necessário para a Etapa C. Fontes e tokens `:root` — necessário para tokens CSS. |
| **JS** | Estado global (variáveis que persistem entre renders) — mapear para Context/useReducer na Etapa E. Cada `render*` / overlay ↔ DOM — cada um é um componente React. Listeners — cada um é um handler. Validação de config (`DOMAIN`) — mapear para Zod/validação na Etapa D. |
| **Persistência** | `localStorage` / `sessionStorage`: chaves, formato, momento de escrita — necessário para manter comportamento idêntico ao legado. |
| **Rede** | `fetch`/XHR: URLs, métodos, payloads, fluxos de sucesso/erro — necessário para a Etapa F.6. |
| **Superfícies com submit** | Lista de toda superfície equivalente a formulário — cruzar na Etapa F.7 com a seção de formulários do `frontend.mdc`. |

**Saída obrigatória desta fase:**
Criar `outputs/spec/convert-prototype/legacy-parity-matrix.md` com uma linha por item inventariado.
Colunas mínimas: `ID | Tipo | Descrição legado | Coberto por (path React) | Estado`.
Deixar "Coberto por" e "Estado" em branco — serão preenchidos nas fases seguintes.

> ⚠️ Não avançar para a Etapa B sem a primeira versão da matriz criada.

---

## Etapa B — Destino e scaffold

**Objetivo:** ter uma estrutura de pastas conforme o `frontend.mdc` com rotas navegáveis.

1. Definir pasta/projeto destino e convenção de rotas.

2. **Abrir `frontend.mdc`** nas seções de **stack** e **estrutura de pastas** — antes de criar qualquer pasta.

3. Criar o scaffold exatamente como o `frontend.mdc` descreve.

4. **Windows — problema específico:** se `create-next-app` falhar com `EPERM` ao renomear `app` → `src/app`,
   gerar sem `--src-dir` e mover para `src/` manualmente após a criação.

5. Garantir `tsconfig` paths `@/*` → `./src/*`.

6. Materializar toda a estrutura de pastas que o `frontend.mdc` exige para `src/` — incluindo `.gitkeep` onde aplicável.

7. **Testes e validação no scaffold:** ler **Stack** e **Testes** no `frontend.mdc` e garantir em `package.json` os scripts que o projeto vá usar (`build`, e — quando aplicável — `test`, `typecheck`, `lint`, `validate`). Configurar a ferramenta de unitários que a rule nomear (hoje Vitest + RTL/`jsdom` conforme o arquivo) antes de encerrar a Etapa B, para o **§ Gate de validação técnica** poder rodar nas fatias seguintes.

8. **Gate desta fase — scaffold não é só árvore de pastas:**
   - **Rotas:** fluxo principal **navegável** (`next dev` ou preview).
   - **`npm run build` com código de saída 0** na raiz da app migrada **antes** de declarar a Etapa B encerrada (projetos Next devem ter script `build`; ausência é inconformidade do scaffold).
   > Por quê: rotas só vistas em dev não substituem o bundle de produção; erros de import, paths TS e CSS aparecem muitas vezes apenas no `build`.
   - **Evidência:** cumprir § **Evidência dos comandos e falhas de ambiente**.

---

## Etapa C — CSS e tokens

**Objetivo:** ter o sistema de estilo alinhado ao `frontend.mdc` e ao CSS do legado, nessa ordem.

**Ordem de prioridade — importante:**
1. Primeiro: cumprir o que o `frontend.mdc` estabelece para estilo e componentização, bibliotecas e frameworks.
2. Segundo: alinhar aparência às classes do HTML legado.

> Por quê esta ordem: usar "as mesmas classes do HTML" pode parecer mais rápido, mas viola a rule
> se o `frontend.mdc` exigir uma abordagem diferente — não usar os frameworks definidos em `frontend.mdc`
> quebra as regras. A aparência visual vem depois da conformidade estrutural — não antes.

**Passos:**

1. Extrair `<style>…</style>` do HTML legado com o mecanismo definido **no próprio projeto** (ex.: script `extract-prototype-css` em `package.json`, se existir — ver § **CSS do protótipo** só como nota de fluxo). **Onde** guardar folhas, como combinar com Tailwind e `next/font` → seções **Estilo**, **Estrutura** e **Stack** do `frontend.mdc`, não prescrever aqui além de “seguir o repo + a rule”.

2. Verificar bibliotecas e frameworks de estilo em `frontend.mdc` e adequar o estilo do legado a essas bibliotecas e frameworks.

3. **Abrir `frontend.mdc`** nas seções aplicáveis de estilo e componentização.
   Aplicar ao JSX o que lá estiver escrito antes de avançar para a Etapa D.

4. **Critérios verificáveis pós-extract (proibido placeholder silencioso — critério de processo, não de design system):**
   - O CSS gerado **não** pode ser apenas um stub (“placeholder até extrair”): o extrato deve refletir **volume e regras proporcionais** ao bloco `<style>` do HTML fonte (tokens `:root`, classes de layout usadas pelo JSX migrado).
   - Variáveis referenciadas no legado mas não definidas no extrato (ex.: `--shadow-md`) devem ser **corrigidas** no pipeline de extract ou por um bloco `:root` posterior documentado — não deixar `var(--…)` indefinido.

5. **Smoke build obrigatório ao fechar a Etapa C:** `npm run build` → código **0** após ligar o CSS ao layout/segmentos corretos.
   > Por quê: `@import`, ordem de folhas e `html,body{overflow:hidden}` quebram frequentemente só na compilação ou no runtime de produção.

6. **Conflitos globais (folhas do protótipo vs app):** decidir explicitamente onde o extrato é importado (layout raiz vs segmento) para não aplicar resets do HTML legado onde não faz sentido; **sempre** reconciliar com o que o `frontend.mdc` disser sobre **Estilo** e composição de layouts.

---

## Etapa D — Contrato de domínio

**Objetivo:** converter `window.DOMAIN` / scripts injetados em módulos TypeScript com validação de fronteira.

**Por que fazer antes dos componentes:**
Se o contrato de domínio não estiver definido, os componentes vão usar `any` ou assumir tipos —
e a correção posterior introduz regressões difíceis de rastrear.

**Passos:**

1. `window.DOMAIN` / scripts injetados → módulo TS + validação na fronteira (Zod ou equivalente **se a rule o exigir** — verificar no `frontend.mdc` antes de decidir).

2. **Abrir `frontend.mdc`** nas seções de **negócio/dados/view model** e **serviços/HTTP**.
   Implementar conforme o que lá está escrito — não assumir que Zod é o padrão sem verificar.

3. Evitar validação/parse em massa no render do componente.
   > Por quê: validar no render re-executa a cada re-render, é ineficiente e pode mascarar erros.

4. Dados demo: mesmo contrato que produção.
   > Por quê: dados demo com tipo diferente produzem testes que passam em dev e falham em prod.

---

## Etapa E — Estado e comportamento

**Objetivo:** mapear o estado global do legado para a solução React correta conforme o `frontend.mdc`.

**Por que não assumir Context + useReducer diretamente:**
O `frontend.mdc` pode ter padrões específicos para gestão de estado. Ler antes de decidir.

**Passos:**

1. Mapear `STATE` → solução React (Context + `useReducer`, composição de hooks, ou outro padrão
   que o `frontend.mdc` especifique), preservando a semântica original.
   Serializar o que atravessa persistência conforme o `frontend.mdc`.

2. **Abrir `frontend.mdc`** nas seções de **negócio/dados** e **React Query** (ou equivalente).

3. Para cada função `render*` do legado, criar uma tabela curta **antes** de implementar:
   | Função legado | Componente/hook React | Condição de visibilidade |
   — sincronizar esta tabela com a matriz de paridade.
   > Por quê: implementar sem esta tabela resulta em funções esquecidas que só aparecem no Double-check A.

---

## Etapa F — Fatias verticais

**Regra:** cada fatia **`npm run build` com código 0** e **navegável** antes da seguinte começar; evidência alinhada ao § **Evidência dos comandos e falhas de ambiente**.

**Por que esta restrição:** uma fatia que não compila bloqueia subagentes que dependem dela.
Fatias navegáveis permitem validação visual incremental — erros de layout são detectados cedo.
**Dev só não chega:** `next dev` sem build verde permite avançar com erros que só o bundle de produção revela.

**Subagentes paralelos:** fatias sem dependência mútua podem ser lançadas em paralelo.
Identificar dependências antes de decidir quais paralelizar.

**Antes de cada fatia — passo obrigatório:**

1. Identificar no `frontend.mdc` quais seções esta fatia pode violar se mal executada.

2. Para cada seção identificada em risco, ler o texto completo no `frontend.mdc`.

3. **Checkpoint substancial por fatia:** para cada `## …` do `frontend.mdc` identificado como
   em risco para esta fatia, cruzar com os arquivos tocados. Resultado binário por seção:
   - `«cruzado com código»` — demonstrar com path concreto
   - `«pendente → backlog antes do fecho»` — registrar explicitamente

4. **Gate por fatia:** atualizar `outputs/spec/convert-prototype/frontend-md-verification.md` com todas as seções `## …`
   classificadas; atualizar a matriz de paridade para os itens da fatia.

**Ordem sugerida de fatias** (exemplo ilustrativo — adaptar aos blocos reais do protótipo):

1. Shell: layout base (header, navegação, grid principal).
2. Painéis/colunas secundárias do layout.
3. Área central: bloco de conteúdo principal e suas variações de exibição.
4. Componentes de interação secundária do domínio (ex.: painel lateral, chat, notificações — o que existir no protótipo).
5. Overlays: configurações, listas, modais, banners — um fluxo de cada vez.
6. **Persistência e rede:** após UI estável — **abrir `frontend.mdc`** nas seções de **serviços**, **paths**, **erros**, **dados e mutações** antes de implementar.
7. **Formulários:** **abrir `frontend.mdc`** na seção de **formulários e composição de páginas** — implementar **conforme esse texto**, não conforme o HTML legado diretamente.

---

## Refactor intermediário — antes da Etapa G

**Por que existe esta etapa:**
Após as fatias, o artefato de verificação pode ter lacunas acumuladas — seções classificadas como
"pendente" em fatias anteriores, ou seções que foram cruzadas com código mas que entretanto mudaram.
Esta etapa fecha essas lacunas antes da verificação final.

**Passos:**

1. **Reler `frontend.mdc` na íntegra.** Não usar memória desta skill nem de execuções anteriores.

2. Para cada seção, abrir o código da evidência já registrada — corrigir gaps ou ajustar estado no artefato.

3. Executar o checklist do `frontend.mdc` (seção **Processo para a IA** ou equivalente) como última passagem — cobre ângulos que as fases anteriores podem ter ignorado.

4. Executar o **§ Gate de validação técnica** completo — não avançar para a Etapa G com falhas.

5. Atualizar `outputs/spec/convert-prototype/frontend-md-verification.md` com evidências por seção.

**Índice de navegação no `frontend.mdc`** (títulos podem mudar no repo — verificar sempre):

| Tema | Seção típica no `frontend.mdc` |
|------|--------------------------------|
| Stack / tooling | Stack |
| Árvore `src/` | Estrutura (`src/`) |
| Server vs Client | Server vs Client |
| HTTP / services | Serviços e HTTP |
| Negócio / view model | Negócio, dados e View Model |
| Erros | Erros (`AppError`) |
| TanStack Query | React Query |
| Providers | Providers |
| Formulários | Formulários e `page.tsx` |
| Estilo / env | Estilo e env |
| Dados e mutações | Decisões: dados e mutações |
| Auth | Auth (resumo) |
| Rotas especiais | Rotas |
| Testes | Testes |
| Componentização | Componentização |
| Anti-patterns | MUST NOT / Anti-patterns |
| Nomenclatura | Nomenclatura |
| SOLID | SOLID (resumo) |
| Checklist IA | Processo para a IA |

> ⚠️ Este índice é uma **ajuda de navegação**, não um substituto do arquivo.
> Os títulos reais podem diferir — verificar sempre contra o texto do repo.

---

## Etapa G — Diagnóstico completo (só verificação, sem implementação)

⚠️ **Reler `frontend.mdc` na íntegra antes de executar esta fase.**
Não usar memória desta skill, do índice acima, nem de execuções anteriores.
> Por quê: a Etapa G compara o código com o texto real da rule.
> Qualquer memória intermediária é uma fonte de erro — o único oráculo válido é o arquivo.

**Regra desta fase:** a Etapa G só diagnostica — não implementa, não corrige, não refatora.
Toda a implementação acontece na Etapa H. Misturar diagnóstico com implementação produz
diagnósticos incompletos porque o modelo para de verificar assim que começa a corrigir.

**Saída obrigatória desta fase:** dois documentos de pendências:

- `outputs/spec/convert-prototype/pending-legacy.md` — itens do legado não migrados ou com comportamento divergente.
- `outputs/spec/convert-prototype/pending-rule.md` — seções do `frontend.mdc` com lacuna ou evidência falsa.

Se ambos os documentos estiverem **vazios** ao final da Etapa G **e** a matriz de legado estiver coerente com **100% Resolvido** **e** o artefato `frontend-md-verification.md` cumprir o § Encerramento estrito → executar gates finais + **Auditório final**.
Se **não**: há erro no inventário/diagnóstico — **não** declarar encerramento até corrigir.

Recomendado: lançar Double-check A e Double-check B como subagentes paralelos.
Subagentes reportam achados ao orquestrador — o orquestrador consolida as duas listas de pendências
antes de qualquer declaração. Não declarar nada sem receber confirmação de ambos.

### Double-check A — Paridade com o legado

**Objetivo:** produzir a lista completa de itens do legado não migrados ou com comportamento divergente.
Não corrigir nada aqui — registrar tudo em `outputs/spec/convert-prototype/pending-legacy.md`.

**Por que não confiar na memória das fases anteriores:**
Cada fase atualiza a matriz incrementalmente — atualizações incrementais acumulam omissões silenciosas.
O Double-check A faz uma varredura completa e independente da matriz contra o código.

**Processo passo a passo:**

1. Abrir `outputs/spec/convert-prototype/legacy-parity-matrix.md` e o inventário da Etapa A em paralelo.
2. Para cada linha da matriz, verificar que a coluna "Coberto por" tem um path React real e navegável.
   - "Real" = o arquivo existe no `src/` e exporta o componente/hook.
   - "Navegável" = é possível chegar a essa superfície a partir da rota principal.
   > Por quê esta distinção: é comum registrar "Coberto por src/components/X.tsx" quando o componente
   > existe mas não está montado em nenhuma rota — a superfície não é navegável, logo não está migrada.
3. Para cada linha com "Coberto por" vazio, path inexistente ou componente não navegável:
   → registrar em `outputs/spec/convert-prototype/pending-legacy.md` com: ID da linha, descrição do item, lacuna exata.
   Não implementar — apenas registrar.
4. Verificar paridade de comportamento visível (não apenas existência do componente) — exemplos ilustrativos, adaptar aos blocos reais do protótipo:
   - Estados/transições dos controles alinhados ao inventário do JS original.
   - Modos ou variantes de exibição de cada bloco secundário como no JS original.
   - Comportamento condicional do bloco central conforme o tipo/estado definido no legado.
   - Visibilidade condicional de componentes de interação secundária como no legado.
   > Para cada divergência de comportamento → registrar em `outputs/spec/convert-prototype/pending-legacy.md`.

**Gate Double-check A:** `outputs/spec/convert-prototype/pending-legacy.md` produzido com **todas** as lacunas listadas.
"100% legado" só se declara **após** a Etapa H com o arquivo **vazio** (§ Encerramento estrito).

---

### Double-check B — Conformidade com frontend.mdc

**Objetivo:** produzir a lista completa de seções da rule com lacuna ou evidência falsa.
Não corrigir nada aqui — registrar tudo em `outputs/spec/convert-prototype/pending-rule.md`.

**Por que o gate mecânico não é suficiente:**
O script `verify:frontend-md` verifica formato e presença de títulos — não verifica se a evidência
demonstra realmente o que a seção exige. É possível ter gate mecânico verde com linhas "Cumprido"
que não cumprem nada. O Double-check B fecha esta lacuna pela leitura do texto real.

**Processo passo a passo:**

1. Abrir `frontend.mdc` e `outputs/spec/convert-prototype/frontend-md-verification.md` em paralelo (dois arquivos ao mesmo tempo).
2. Percorrer na ordem do `frontend.mdc` cada título `## …` e ler o texto completo dessa seção.
   > Por quê percorrer na ordem do `frontend.mdc` e não do artefato: o artefato pode ter títulos em
   > ordem diferente ou ligeiramente distintos. A fonte de verdade é o `frontend.mdc` — percorrê-lo
   > garante que nenhuma seção é pulada.
3. Para cada seção aplicável (não N/A), comparar as obrigações tal como escritas com:
   - (a) o estado e evidência na linha correspondente do artefato
   - (b) os arquivos referidos na evidência (abrir e verificar)
4. Se houver lacuna entre o que a rule exige e o que o código demonstra:
   → registrar em `outputs/spec/convert-prototype/pending-rule.md` com: título da seção, obrigação específica, lacuna exata.
   Não implementar — apenas registrar.
5. Para cada linha que se queira marcar N/A: aplicar o **§ Encerramento estrito (ponto 2)** —
   ler o texto integral da seção; se a UI já toca no assunto de alguma forma → **não** é N/A;
   registrar em `outputs/spec/convert-prototype/pending-rule.md`.

### Auditório binário — responder antes de fechar o Double-check B

Estas perguntas existem para forçar verificação real, não declaração por convicção:

1. Para cada `## …` do `frontend.mdc`, li o texto completo (não só o título na tabela)?
   Se não: reler. Títulos enganam — o que importa é o texto.
2. Para cada linha Cumprido, o path citado demonstra o que a seção exige
   — não apenas que a pasta existe ou que o componente tem o nome certo?
   Se não: registrar a lacuna em `outputs/spec/convert-prototype/pending-rule.md`.
3. Para cada linha N/A no artefato de verificação: existe **commit** no repo que altera o `frontend.mdc`
   e elimina essa obrigação para este produto?
   Se **não**: é lacuna — registrar em `outputs/spec/convert-prototype/pending-rule.md` e implementar até **Cumprido**.
4. Existem linhas Cumprido que são apenas «compatíveis com o gate mecânico»
   mas incompatíveis com o texto da seção?
   Se sim: registrar em `outputs/spec/convert-prototype/pending-rule.md`.

**Gate Double-check B:** `outputs/spec/convert-prototype/pending-rule.md` produzido com **todas** as lacunas da rule listadas.
Se **ambas** as listas estiverem **vazias** **e** o artefato cumprir o § Encerramento estrito →
executar o **§ Gate mecânico — comandos**; gates verdes → candidato a **Migração encerrada**
após o Auditório final. Caso contrário → **Etapa H** obrigatória.

---

## Etapa H — Refatoração e resolução de pendências

**Objetivo:** implementar tudo o que a Etapa G identificou em `outputs/spec/convert-prototype/pending-legacy.md`
e `outputs/spec/convert-prototype/pending-rule.md` até **ambas as listas estarem vazias** e o artefato da rule cumprir o § Encerramento estrito
(só **Cumprido**, salvo seções já retiradas/reescritas no `frontend.mdc` por commit).

**Regra desta fase:** a Etapa H só implementa — não faz novo diagnóstico.
Se durante a implementação surgir uma divergência nova (ex: corrigir um componente revela
que outro componente dependente também está errado), o comportamento obrigatório é:

Terminar de implementar o item atual (não parar no meio) → registrar a divergência nova
em `outputs/spec/convert-prototype/pending-legacy.md` ou `outputs/spec/convert-prototype/pending-rule.md` → continuar o lote da Etapa H →
ao fim do lote, voltar à Etapa G para novo ciclo de diagnóstico completo.

> Por que terminar o item atual antes de voltar à Etapa G:
> Parar no meio de uma implementação deixa o código num estado inconsistente — o próximo diagnóstico
> vai encontrar o mesmo item como pendente mais a nova divergência, tornando o relatório confuso.
> Terminar o item fecha-o de forma limpa antes do próximo ciclo.

> Por que não corrigir a divergência nova inline na Etapa H:
> A Etapa H não tem o processo de diagnóstico completo da Etapa G — corrigir inline pode mascarar
> outras dependências. A Etapa G é o único lugar onde o diagnóstico é feito de forma exaustiva.

**Processo passo a passo da Etapa H:**

1. Abrir `outputs/spec/convert-prototype/pending-legacy.md` e `outputs/spec/convert-prototype/pending-rule.md`.
2. Para cada item em `outputs/spec/convert-prototype/pending-legacy.md`:
   - Implementar o que falta (componente, rota, comportamento, persistência, etc.).
   - Confirmar que o componente está montado e navegável.
   - Atualizar `outputs/spec/convert-prototype/legacy-parity-matrix.md`: preencher "Coberto por" e marcar **Estado = Resolvido** com paridade verificada.
   - Remover o item de `outputs/spec/convert-prototype/pending-legacy.md`.
   - Se durante esta implementação surgir divergência nova → registrar no arquivo relevante e continuar.
3. Para cada item em `outputs/spec/convert-prototype/pending-rule.md`:
   - Implementar o que falta até a seção poder ser marcada **Cumprido** com evidência válida,
     **ou** propor primeiro alteração ao `frontend.mdc` (commit) se a norma deixar de aplicar-se ao produto.
   - Atualizar `outputs/spec/convert-prototype/frontend-md-verification.md` em conformidade.
   - Remover o item de `outputs/spec/convert-prototype/pending-rule.md`.
   - Se durante esta implementação surgir divergência nova → registrar no arquivo relevante e continuar.
4. Ao terminar o lote:
   - Se `outputs/spec/convert-prototype/pending-legacy.md` ou `outputs/spec/convert-prototype/pending-rule.md` têm itens novos (registrados durante o lote):
     → voltar à Etapa G para novo ciclo de diagnóstico completo (racional no preâmbulo desta etapa).
   - Se ambas as listas estão vazias: avançar para o passo 5.
5. **Gates finais (executar após listas vazias):** ver **§ Gate mecânico — comandos** (abaixo) — os mesmos comandos, sem repetir aqui; todos com código 0.

**Evidência:** todos os comandos executados conforme § **Evidência dos comandos e falhas de ambiente** (sem declarar fecho se o ambiente impediu a execução).

### Auditório final — responder **sim** a todas antes de declarar **Migração encerrada**

1. `outputs/spec/convert-prototype/pending-legacy.md` está **vazio**?
2. `outputs/spec/convert-prototype/pending-rule.md` está **vazio**?
3. Em `outputs/spec/convert-prototype/frontend-md-verification.md`, **todas** as seções estão **Cumprido**, ou a seção foi **removida/reescrita** no `frontend.mdc` (commit) de forma consistente com o artefato?
4. **Não** há **Desvio** nem **N/A** usado como atalho sem alteração correspondente ao `frontend.mdc`?
5. **§ Gate mecânico — comandos** completo com código 0 em todos os aplicáveis — incluindo `verify:frontend-md:closure` — e, nos testes, cobertura mínima consistente com a seção **Testes** da rule?
6. Cada **Cumprido** tem evidência real (paths + conteúdo que satisfaz o texto da seção)?
7. O item 5 foi **de fato executado** neste repo (ou bloqueio documentado segundo § **Evidência dos comandos e falhas de ambiente**), não apenas assumido?

Se alguma resposta for **não** → voltar à Etapa G. **Não** declarar conclusão.
Todas **sim** → declarar **Migração encerrada**.

### Declarações permitidas

| Declaração | Critério mínimo | Por quê |
|------------|-----------------|--------|
| Fatia N navegável | `npm run build` código 0 para o estado do repo dessa fatia + navegável + evidência § **Evidência dos comandos**; registro honesto do que falta para encerramento | Marco intermediário — **não** substitui migração completa |
| 100% legado | Double-check A + Etapa H até `pending-legacy` vazio + matriz **Resolvido** | Inventário completo |
| 100% rule | Double-check B + artefato conforme § Encerramento estrito | Gate mecânico ≠ semântica |
| Migração encerrada | Ambos 100% + gates finais verdes + auditório acima | Contrato normativo desta skill |
| Análise sem resolução | — | **Proibido** como estado final |

### Armadilhas

| Risco | Por quê | Mitigação |
|-------|---------|-----------|
| ADR / OutOfScope em vez de código | Pressão para “fechar” | § Encerramento estrito |
| iframe / `document.write` / script legado | Atalho visual | Obrigações específicas da skill |
| Plan mode | Sem escrita | Agent mode |
| EPERM scaffold | Windows | Etapa B |
| Drift visual | CSS ≠ HTML | Extrair CSS do legado |
| Monólito | Cruzamento com rule | Features + views |
| “Já parece o protótipo” | Só UI | Paridade de comportamento |
| Memória vs `frontend.mdc` | Erro de norma | Ler arquivo real |
| Gate mecânico verde | Script limitado | Double-check B integral |
| Props RSC→Client | DOMAIN com funções | § Fronteira Server ↔ Client |
| Ignorar **Testes** / lint / typecheck na rule | Falsa sensação de conclusão | § Validação técnica contínua + Auditório itens 5 e 7 |
| Scaffold sem **build** verde | Etapa B encerrada só com `dev` | Etapa B § gate **build** obrigatório |
| CSS placeholder / extract não rodado | Layout legado ausente apesar da matriz verde | Etapa C § critérios pós-extract + smoke **build** |
| Sandbox sem `npm` | Falso “gates OK” | § **Evidência dos comandos e falhas de ambiente** |

---

## Artefatos na app migrada

| Artefato | Função | Quando criar |
|-----------|--------|----------------|
| `outputs/spec/convert-prototype/frontend-md-verification.md` | Linhas por `## …` do `frontend.mdc`; **encerramento**: só **Cumprido** (salvo rule alterada por commit) | Etapa A → atualizar até fecho |
| `outputs/spec/convert-prototype/legacy-parity-matrix.md` | Inventário → paths React; **Resolvido** no encerramento | Etapa A → atualizar até fecho |
| `outputs/spec/convert-prototype/pending-legacy.md` / `outputs/spec/convert-prototype/pending-rule.md` | Etapa G; **vazios** para declarar migração encerrada | Etapa G → esvaziar na Etapa H |

---

## Gate mecânico — comandos

> **Definição canônica** desta sequência de comandos — Etapa G e Etapa H apenas referenciam esta
> seção; não a repetem.

Na raiz da app migrada:

```bash
npm run typecheck    # se existir — TypeScript strict
npm run lint         # se existir — ex.: next lint / eslint
npm test             # se existir — obrigatório código 0 (não declarar fatia nem migração com testes que falharam)
npm run build        # sempre — obrigatório antes de qualquer marco
npm run verify:frontend-md
npm run verify:frontend-md:closure
```

- **Script agregado:** se existir `"validate"` (ex.: `typecheck && test && build`), pode ser usado como atalho **desde que** inclua pelo menos `build` e, quando existirem, `test` e `typecheck`.
- `verify:frontend-md` — modo incremental (permite **N/A** / **Desvio** no artefato).
- `verify:frontend-md:closure` — passa **`--strict-closure`**: só **Cumprido** por seção — obrigatório no **Auditório final** antes de declarar migração encerrada.

`package.json` — scripts típicos (adaptar ao repo):

```json
"typecheck": "tsc --noEmit",
"lint": "next lint",
"test": "vitest run",
"validate": "npm run typecheck && npm run test && npm run build",
"verify:frontend-md": "node ./scripts/verify-frontend-md-compliance.mjs --frontend-mdc <PATH> --verification <RAIZ>/outputs/spec/convert-prototype/frontend-md-verification.md --audit-src-fail ./src",
"verify:frontend-md:closure": "node ./scripts/verify-frontend-md-compliance.mjs --frontend-mdc <PATH> --verification <RAIZ>/outputs/spec/convert-prototype/frontend-md-verification.md --audit-src-fail ./src --strict-closure"
```
### Script `verify-frontend-md-compliance.mjs`

Modelo canônico: [`./templates/verify-frontend-md-compliance.mjs`](./templates/verify-frontend-md-compliance.mjs)
— copiar para `scripts/verify-frontend-md-compliance.mjs` na raiz da app migrada (caminho
referenciado no `package.json` acima) se lá não existir. O cabeçalho do próprio script documenta
o que ele verifica, os parâmetros CLI e os modos (incremental × `--strict-closure` × auditoria de `src/`).

### CSS do protótipo (fluxo de trabalho, não norma de stack)

Muitos repos definem um script do tipo:

```bash
npm run extract-prototype-css
```

**Âmbito:** isso é **convenção do repositório** que mantém o script (caminho do HTML fonte, nome dos `.css` gerados, entrypoint com `@import`). **Não** faz parte da constituição técnica: onde pôr `styles/`, Tailwind, `next/font`, proibições de `style={{}}` para layout estático, etc. → **`frontend.mdc`**.

Após alterar extract ou imports de CSS, cumprir o gate de **smoke `build`** previsto na Etapa C.

**Vitest / transform JSX:** qualquer ajuste de configuração de testes → seções **Stack** e **Testes** do `frontend.mdc` + arquivos do projeto; **não** duplicar prescrições técnicas nesta skill.

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia a declaração de marco ou de "Migração encerrada"

| Código | Verificação |
|--------|-------------|
| `PENDING_LEGACY_EMPTY` | `outputs/spec/convert-prototype/pending-legacy.md` **vazio** antes de declarar "100% legado" ou "Migração encerrada" |
| `PENDING_RULE_EMPTY` | `outputs/spec/convert-prototype/pending-rule.md` **vazio** antes de declarar "100% rule" ou "Migração encerrada" |
| `ALL_SECTIONS_CUMPRIDO` | Toda seção `## …` da rule está **Cumprido** em `outputs/spec/convert-prototype/frontend-md-verification.md`, ou foi removida/reescrita na própria rule por commit explícito |
| `BUILD_GREEN` | `npm run build` código 0 antes de qualquer marco (Fatia N navegável, Migração encerrada) |
| `VERIFY_CLOSURE_GREEN` | `npm run verify:frontend-md:closure` código 0 — só **Cumprido** aceito, sem `N/A`/`Desvio` |
| `NO_LEGACY_SHORTCUT` | Proibido `iframe`, `document.write` ou `<script src="…app.js">` como superfície principal da UI migrada |
| `COMMANDS_ACTUALLY_EXECUTED` | Os gates do Auditório final foram **de fato executados** nesta sessão — ou bloqueio de ambiente documentado (§ Evidência dos comandos e falhas de ambiente), nunca assumidos |

### WARNING — não bloqueia, registrar e seguir

| Código | Verificação |
|--------|-------------|
| `TEST_SCRIPT_ABSENT` | `npm test` ausente no `package.json` quando a rule exige cobertura de testes — registrar em `outputs/spec/convert-prototype/pending-rule.md` |
| `ENV_EXECUTION_BLOCKED` | Sandbox/path impediu a execução dos comandos do gate — bloqueio documentado, sem assumir sucesso |
| `ADR_USED_AS_SUBSTITUTE` | ADR referenciado sem implementação correspondente no código — ADR não fecha inconformidade sozinho |

---

## Skills irmãs

| Skill | Consome | Produz |
|-------|---------|--------|
| `spec-prototype` | HU, RN, decisões de negócio do produto | `prototype.md` + protótipo — **entrada** desta skill só em fidelidade Baixa/Média; em fidelidade Alta o `src/` já nasce no padrão do `frontend.mdc` e vai direto para a `spec-implement` |
| `spec-tech-rules` | Documentos de produto | `frontend.mdc` / `frontend.md` — a rule que esta skill lê e contra a qual verifica conformidade (nunca copiada ou resumida aqui) |
| `spec-scaffold` | Rules técnicas + `data-model.json` + `api-contracts.yaml` | Estrutura inicial de código — via alternativa quando não há protótipo legado a migrar |

## O que NÃO faz
- Não define nem resume normas de frontend — normas vivem **apenas** na rule (`frontend.mdc`/`frontend.md`), lida na íntegra em cada fase
- Não gera negócio, HU ou RN — isso é `spec-prototype`
- Não decide arquitetura de backend, banco de dados ou contratos de API
- Não altera a rule por conta própria — mudar uma obrigação da rule exige commit explícito no `frontend.mdc`, nunca uma decisão silenciosa desta skill
- Não declara "Migração encerrada" com pendências abertas, ADR como substituto de código, ou gates não executados de fato