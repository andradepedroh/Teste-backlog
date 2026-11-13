---
name: spec-status-report
description: >
  spec-status-report (Fase 13 — Relatório de Status/Conclusão) — invocar quando o usuário
  pedir relatório de status, conclusão, entrega, prestação de contas, "como está o projeto",
  "o que foi entregue" ou spec-status-report. Detecta a fase pelos artefatos e gera um HTML
  autocontido: sumário executivo, negócio, técnico, código, rastreabilidade
  RN/RF→código→teste, execução real de testes, coberturas, o que falta testar item a item,
  backlog e bugs por módulo. Antes de coletar,
  PERGUNTA as pastas de documentação, código e testes (cada resposta aceita várias, inclusive
  fora da raiz; o que já veio no prompt não é perguntado de novo). Só consolida o que existe
  — nada é reconstruído, estimado ou preenchido artificialmente.
version: "2.3"
updated: "2026-10-20"
---

# spec-status-report — Relatório de Status / Conclusão para o Cliente

> **Skill de compilação, não de criação.** Ela lê artefatos, varre o código, **executa os
> testes** e consulta o Azure DevOps. Não inventa conteúdo de negócio, não corrige
> documento, não fecha GAP. O que não existir, **aparece como ausente** — nunca como
> estimativa disfarçada de fato.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — o histórico de decisões
alimenta a leitura executiva. Ao terminar, adicionar UMA linha:
`| # | data | spec-status-report | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.
Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md) seção «Sync-log como memória cross-cutting».

---

## Papel

Produzir **um arquivo HTML único e autocontido** que sirva de **entrega ao cliente** em
qualquer ponto do projeto — status de sprint ou fechamento de escopo — respondendo a cinco
perguntas que o cliente sempre faz:

| Pergunta do cliente | Domínio do relatório | Fonte |
|---|---|---|
| “O que este produto faz e sob quais regras?” | Negócio | `product-vision.md`, `modules.md`, `business-rules.md`, `requirements.md`, `product-requirements.md`, `flow-map.md` |
| “Como foi construído tecnicamente?” | Técnico | `tech-rules/*.mdc` (+ `.cursor/rules`, `.claude/rules`), `data-model.json`, `api-contracts.yaml`, `threat-model.md`, `code-audit.md` |
| “Quanto de código foi escrito e com que decisões?” | Código | varredura do repositório, `git`, ADRs, `spec_story.md` (memória do `spec-implement`) |
| **“Onde cada coisa de negócio foi implementada?”** | Negócio (por operação) ou Código (rastro do pipeline) | cruzamento por ID entre documentos, código, testes e itens de trabalho |
| “Os testes passam e o que está coberto?” | Testes e Cobertura | **execução real** dos frameworks + cobertura de código/negócio/plano |
| “O que falta testar, e o que fazer com cada item?” | O que falta testar | matriz de rastreabilidade + `status/test-gaps.json` (análise do agente) |
| “As tarefas estão prontas?” | Execução e backlog | consulta ao tracker (REST) ou extração via MCP |
| “Onde estão os bugs, e quantos seguem abertos?” | Execução e backlog → Bugs por módulo | itens do tipo Bug no tracker, com a cadeia de pais até a Epic |

**Regra de ouro:** cada número exibido é rastreável a um artefato, a uma linha de código
(`arquivo:linha`) ou a um caso de teste que rodou nesta geração. Sem essa amarração, o
número não entra.

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

Vale para a `executive-summary.md`, para os textos de todas as abas e para o glossário. Aqui a regra 3 é literal: o glossário existe justamente porque sigla não explicada trava a leitura — e a primeira ocorrência de cada sigla já é marcada automaticamente, então escreva a expansão dando por certo que ela vai ser lida.

## Momento de execução — detecção de fase

A skill **não pergunta** em que fase o projeto está: infere dos artefatos presentes e
mostra a evidência da inferência no próprio relatório (domínio Sumário → «Ponto do
processo»).

| Fase detectada | Gatilho | Domínios que aparecem |
|---|---|---|
| `discovery` | artefatos de negócio existem; sem `tasks.json`/`data-model.json`/`api-contracts.yaml` | Sumário, Negócio, Riscos |
| `specification` | existe `data-model.json`, `api-contracts.yaml`, `tasks.json`, `test-plan.md`, `security-review.md`, `estimate-report.md` ou `id-map.json` | + Técnico, Azure DevOps |
| `implementation` | ≥ 3 arquivos de código de produção fora de `outputs/`, `inputs/`, `skills/`, `.cursor/`, `.claude/`, `plugin/` — ou algum `spec_story.md` | + Código, Testes |
| `delivery` | implementação + arquivos de teste + `code-audit.md` (Fase 12 executada) | todos |

A detecção também registra um sinal de **compatibilidade** quando os artefatos vêm de um
layout de versão anterior — o relatório mostra de onde cada um foi lido.

Override: `--phase discovery|specification|implementation|delivery`. Quando sobreposta, o
relatório **diz que foi sobreposta** e qual era a detecção automática — nunca finge que a
fase forçada foi observada.

**Montagem por presença:** domínio sem dado não é renderizado (e não deixa link órfão na
navegação). O rastro no código só aparece quando existe código — em discovery, uma matriz
“0% implementado” seria falso alarme, não informação. **A decisão final de quais abas
existem é do renderer**, que publica no menu apenas o domínio cujo HTML saiu não-vazio:
manter uma lista fixa em paralelo era o que produzia aba em branco no menu.

---

## Como usar

```bash
node <skills>/spec-status-report/cli.mjs \
  --mode status \
  --client "Nome do Cliente" \
  --author "Nome do Responsável" \
  --period "Sprint 12 · 01–14/08/2026"
```

> `<skills>` = a pasta de skills **do espelho em uso** (`.cursor/skills/`, `.claude/skills/`,
> `plugin/skills/` ou `skills/`) — nunca cravar `.cursor/skills/`, que não existe em projeto
> só-Claude. A partir do próprio SKILL.md, o caminho equivalente é `./cli.mjs`. Ver
> [`../tools/references/paths.md`](../tools/references/paths.md) §Convenção de scripts.

**A IA executa o CLI. A IA não gera o HTML.** Toda a renderização está em
`lib/render-status-html.mjs` + `lib/report-theme.css`. Montar HTML na conversa estoura
contexto, produz truncation e perde os gates.

---

## Kickoff obrigatório — de onde vem o escopo

**Antes de rodar o CLI, o agente PERGUNTA onde estão as pastas.** Quatro perguntas, nesta
ordem, e **cada resposta aceita mais de uma pasta**:

| # | Pergunta | Flag |
|---|---|---|
| 1 | Onde está a **documentação** do projeto? | `--docs` |
| 2 | Onde está o **código**? | `--code` |
| 3 | Onde estão os **testes**? | `--tests` |
| 4 | Há **mais alguma pasta** que deva entrar? | `--extra` |

**Se a informação já veio no prompt, ela é verdade e a pergunta correspondente não é
feita.** «Gere o relatório do SP07, código em `portal-gateway` e `portal-patrimonio`,
testes em `portal-tests`» responde 2 e 3 — pergunte só 1 e 4. Perguntar o que o usuário
acabou de dizer é ruído, e refazer a pergunta convida a uma resposta diferente da
primeira.

As pastas **podem estar fora de `--root`** — é exatamente o caso multi-repo. Com mais de
uma pasta de código, o caminho de cada arquivo é prefixado pelo rótulo dela, senão dois
`src/main/java/Service.java` de repositórios diferentes colidiriam no inventário, nos
hotspots e nos maiores arquivos.

```bash
node <skills>/spec-status-report/cli.mjs \
  --docs "outputs/spec,docs/negocio" \
  --code "gateway=../portal-gateway,patrimonio=../portal-patrimonio" \
  --tests "../portal-tests" \
  --extra "monolito=../portal-monolito" \
  --mode conclusao --client "Cliente Exemplo"
```

Sem nenhuma das quatro flags o CLI **não falha**: varre a raiz inteira, emite
`SCOPE_PRESUMED` e o relatório declara, em Anexos → «Escopo da coleta», que o escopo foi
presumido. É a diferença entre «varri tudo que existe» e «varri o que você me disse», e o
leitor precisa saber qual das duas leu.

Pasta declarada que não existe vira `SCOPE_DIR_MISSING` e sai da lista — a varredura não
morre no meio, e o relatório registra que aquela pasta foi pedida e não estava lá.

---

### Fluxo recomendado (6 passos)

1. **Perguntar o escopo** (acima) e **rodar a coleta** com as pastas declaradas. O CLI
   detecta a fase, lê os artefatos, varre o código, **executa as suítes de teste** e
   consulta o Azure DevOps.
2. **Ler os avisos no stderr.** Se aparecer `AZURE_CREDENTIALS_ABSENT` ou
   `AZURE_REQUEST_FAILED`, executar o **fallback MCP** (seção abaixo).
3. **Curar a camada editorial.** Escrever
   `outputs/spec/status/status-report-content.json` a partir de
   [`templates/status-report-content.example.json`](templates/status-report-content.example.json)
   — veredito, dimensões do semáforo com dono e evidência, pauta de decisões, marcos e a
   leitura do consultor. Alternativa mais simples: só o
   `executive-summary.md` ([`templates/executive-summary.md`](templates/executive-summary.md)).
   Sem nenhum dos dois o relatório sai completo, com o veredito derivado do semáforo
   calculado e o panorama automático — utilizável em status semanal, pobre em fechamento.
4. **(Opcional) Analisar o que falta testar** — escrever `status/test-gaps.json`. Ver o
   passo detalhado logo abaixo.
5. **Re-renderizar:** `node cli.mjs --render-only` (mais `--export-test-gaps-md` se o passo
   4 rodou). Re-renderiza em segundos **sem re-executar testes** e relê do disco **todos**
   os artefatos de extensão — camada editorial, `executive-summary.md`,
   `test-findings.json`, `test-gaps.json`, `bug-module-map.json` e os demais — registrando
   no log quais foram relidos. Não é preciso script externo para trocar `data.extras`.
   A releitura é gravada de volta só no `status/status-data.json` **padrão** do projeto. Com
   `--input <arquivo>` explícito, o arquivo de entrada é **só lido** — a releitura vai para o
   HTML, e o arquivo (de outra geração, de outra pessoa, de um anexo) fica intacto.
6. **Informar o caminho do HTML gerado** e registrar a linha no `sync-log.md`.

### Passo 4 — analisar o que falta testar (`status/test-gaps.json`)

A aba «O que falta testar» sai da matriz em forma reduzida: sabe **quais** itens não têm
teste citando o código, não sabe **o que fazer** com cada um. O passo 4 produz essa análise.

1. **Ler as fontes inteiras:** a regra de testes do projeto (por exemplo,
   `.cursor/rules/test-strategy.mdc` ou a equivalente em `.claude/rules/`) e os textos
   completos em `business-rules.md`, `requirements.md` e `product-requirements.md`.
2. **Partir da lista do CLI, nunca de uma lista montada à mão:** os itens sem teste estão em
   `status/status-data.json` → `testGaps.items` (e os que têm teste falhando, em
   `testGaps.failing`).
3. **Dividir em lotes por área**, até cerca de 40 itens por lote, e **rodar um agente por
   lote, em paralelo.** Cada agente, para cada item do lote:
   - localiza a implementação — pelo código do item e por palavras do domínio;
   - procura teste que já exercite o comportamento **sem citar o código** (é o caso
     «marcar o código», o mais barato);
   - propõe de 2 a 5 situações «quando…, o sistema…» com os **valores concretos da regra**,
     indicando camada (`unitario`, `integracao`, `contrato`, `e2e-api`, `e2e-tela`),
     repositório e arquivo sugerido;
   - registra em `poQuestions` toda divergência entre a especificação e o código.

   **O agente não inventa comportamento que não está na especificação.** Os agentes do lote
   **não abrem subagentes próprios**: buscam em sequência.

   **Sem subagentes paralelos** (Cursor ou Kiro sem esse suporte, ou qualquer ferramenta que
   não os ofereça): processar os lotes **em sequência, na própria sessão**, um lote por vez,
   com o mesmo roteiro por item. O resultado é o mesmo arquivo; só demora mais.
4. **Antes de gravar, conferir que cada id sem teste aparece exatamente uma vez.** O CLI
   avisa `TEST_GAPS_DUPLICATE_ID` e `TEST_GAPS_UNKNOWN_ID`, mas a conferência é do agente.
5. **Gravar `outputs/spec/status/test-gaps.json`** no formato de
   [`templates/test-gaps.example.json`](templates/test-gaps.example.json), com
   `generatedAt` (data da análise) e `traceTotal` (o `traceMatrix.total` da coleta usada) —
   são esses dois campos que deixam o CLI dizer que a análise ficou velha
   (`TEST_GAPS_STALE`). O agrupamento dos lotes vai em `areas`.
6. **Gerar a versão legível com o CLI**, não à mão: `--render-only --export-test-gaps-md`
   grava `status/testes-a-criar-<data>.md` com o mesmo conteúdo da aba. Escrever o mesmo
   conteúdo duas vezes é como as duas versões passam a divergir.

### Parâmetros

| Grupo | Flag | Efeito |
|---|---|---|
| Escopo | `--root <dir>` | raiz do repositório (default: cwd) |
| | `--outputs <dir>` | pasta de artefatos (default `outputs/spec`, ou `$PIPELINE_OUTPUTS_DIR/spec`) |
| | `--phase <fase>` | força a fase (`discovery`\|`specification`\|`implementation`\|`delivery`) |
| | `--mode <status\|conclusao>` | tom, título e severidade do semáforo de backlog |
| Capa | `--project-name`, `--client`, `--author`, `--period`, `--title` | metadados da capa |
| | `--no-confidential` | remove o aviso de confidencialidade do rodapé |
| Testes | `--no-tests` | não executa nada (usa só cobertura pré-existente) |
| | `--skip-e2e` | roda unitários/integração, pula funcionais/E2E e performance |
| | `--only-runners vitest,pytest` | restringe os frameworks |
| | `--only-kinds unitario,integracao` | restringe as naturezas |
| | `--no-coverage` | **não** mede cobertura (por padrão ela É medida) |
| | `--tests-timeout <seg>` | timeout por framework (default 900) |
| Gestão | `--project <nome>` | projeto no tracker (precede `AZURE_DEVOPS_PROJECT`) |
| | `--azure-area`, `--azure-iteration` | filtros de Area/Iteration Path |
| | `--azure-wiql <arquivo>` | consulta WIQL própria |
| | `--azure-snapshot <arquivo>` | usa snapshot JSON (rota MCP) em vez da consulta direta |
| | `--azure-max <n>` | limite de itens de trabalho (default 2000) |
| | `--bug-types "Bug,Defeito"` | tipos de item tratados como bug (default `Bug`) — processo customizado usa outros nomes |
| | `--no-azure` | não consulta o tracker |
| Código | `--no-code` | pula o inventário de código |
| | `--since-ref <ref>` | métricas de git a partir da ref (ex.: `v1.0`, `main~50`) |
| Execução | `--collect-only` / `--render-only` / `--input` / `-o` / `--check` / `--json` / `-q` | ver `node cli.mjs --help` |
| | `--export-test-gaps-md` | grava também `testes-a-criar-<data>.md` (a aba «O que falta testar» em Markdown) na pasta do HTML. Arquivo de mesmo nome escrito à mão não é sobrescrito: o export vai para `-cli.md` ao lado |

---

## Estrutura do relatório (domínios)

Menu superior fixo + sidebar contextual + hash routing `#dominio/ancora` (deep-link
funciona abrindo o arquivo direto). **Landing sempre no Sumário** — o cliente abre e lê o
executivo; o técnico está a um clique.

| Domínio | Hash | Conteúdo (resumo — o detalhe fino vive no renderer) | Presença |
|---|---|---|---|
| **Sumário** | `#visao` | Capa formal · como ler · **veredito + semáforo por dimensão** · marcos · KPIs · funil de entrega · **pauta de decisões do cliente** · leitura do consultor · **limitações desta geração** | sempre (landing) |
| **Negócio** | `#negocio` | Blocos independentes, cada um preso ao seu artefato: **operações** (`business-operations.json`), **catálogo** RN/RF/RNF/PR/CT (discovery), **fluxos** — o projeto vê exatamente os que tem | algum artefato de negócio |
| **Técnico** | `#tecnico` | Arquitetura · modelo de dados por entidade · superfície de API · segurança com a **decisão da auditoria lida da linha que a declara** · normas · docs técnicos | rules, data-model, contratos ou capítulo técnico |
| **Código** | `#codigo` | Volume · linguagens · estrutura · histórico git (commits, autores, hotspots) · **rastro do pipeline** (`arquivo:linha` com trecho) · decisões (ADRs + `spec_story.md`) · dívida TODO | há código |
| **Testes** | `#testes` | Resumo · falhas por causa-raiz (`test-findings.json`) · quadro por natureza · **as três coberturas** · suítes com exit code · **grid paginado** com filtros | há framework, suíte ou caso |
| **O que falta testar** | `#lacunas-teste` | Por que o número de cobertura de regras engana · ações (marcar o código / criar do zero / criar com a implementação) e **projeção de cobertura** · prioridade e área · regra para o teste contar · achados além dos testes · pontos para o Dono do Produto · **item a item** em cartões com filtros · anexo «têm teste, mas o teste falha» | matriz de rastreabilidade **medida** (código inventariado e testes executados); sem `test-gaps.json`, em forma reduzida e dizendo por quê |
| **Execução e backlog** | `#gestao` | Progresso · **bugs por módulo** (gráfico, tabela de apoio, evolução semanal, bug a bug com a pista) · fechamento no tempo · ritmo/projeção/carga (exigem iteração COM DATA — ver «Ritmo de entrega») · o que falta · todos os itens | tracker consultado (mesmo indisponível — a lacuna é declarada); bugs só com bug no escopo |
| **Riscos e decisões** | `#riscos` | Pauta com opções e recomendação · pontos de atenção · GAPs · próximos passos · histórico do `sync-log.md` | há risco, GAP, decisão ou próximo passo |
| **Anexos** | `#anexos` | Índice de documentos · glossário (siglas marcadas) · controle de revisões · **proveniência** · situação dos artefatos de extensão | há anexo, glossário, revisão ou proveniência |

---

## Artefatos de extensão — o relatório se adapta ao que o projeto tem

O relatório completo lê oito artefatos **opcionais**, além dos do pipeline. Nenhuma versão
anterior do kit os produz, e projetos antigos simplesmente não os têm.

**A regra, sem exceção: sem a fonte, a seção não existe.** Nada é reconstruído,
estimado ou aproximado para ocupar o lugar dela, e nenhuma outra informação é promovida
para preencher o espaço. O link some da navegação junto, para não sobrar âncora morta, e
a falta é declarada em «Limitações desta geração» e na tabela de artefatos em Anexos.

| Artefato (em `outputs/spec/`) | O que habilita | Sem ele |
|---|---|---|
| `business-operations.json` | Operações do escopo contratual: matriz de aceite, funil, entrega por frente, escopo detalhado com regra → `arquivo:linha` → teste | Funil, matriz e escopo por frente **não aparecem**. O catálogo de RN/RF continua saindo, porque é outro artefato — não um substituto |
| `business-flows.json` | Fluxos com etapas, atores, telas e subfluxos | Se houver `flow-map.md`, sai a versão dele — é a MESMA seção descrita por outro artefato, na forma disponível. Sem nenhum dos dois, **não há seção de fluxos** |
| `api-catalog.json` | Superfície de API com ficha requisição × resposta, códigos de status e idempotência | Se houver `api-contracts.yaml`, sai a superfície dele (método, rota, resumo) — mesma seção, outro artefato. Sem nenhum dos dois, não há seção de API |
| `test-findings.json` | Falhas classificadas por **causa-raiz** e por quem depende resolver. Também dá a causa no anexo «têm teste, mas o teste falha» e, quando a causa é **classificada como defeito de produto**, a coluna «Defeitos achados pelos testes» em Bugs por módulo | A seção **não existe**. A distribuição por tipo de teste permanece no quadro por natureza, em Testes, com o nome do que ela é — não é promovida ao Sumário no lugar da triagem |
| `status/test-gaps.json` | A análise **item a item** de «O que falta testar»: o que a regra diz, onde está no código, teste existente a marcar, testes a criar, prioridade, pontos para o Dono do Produto — e a **projeção de cobertura** | A aba sai **reduzida**, só com a camada automática, e diz por que está reduzida. Cada item leva o selo «análise detalhada pendente»; não há projeção. Como o passo 4 é opcional, a ausência **não** vira linha «ausente» nem entra em «Limitações desta geração»; presente e inválido ou velho, avisa (`EXTRA_ARTIFACT_INVALID`, `TEST_GAPS_STALE`) |
| `anexos-index.json` | Índice dos documentos que acompanham o HTML, por grupo e tamanho | Seção de anexos não aparece |
| `glossary.json` | Glossário + marcação automática da 1ª ocorrência de cada sigla **em cada aba** | Sem glossário e sem marcação; o texto fica intacto |
| `status/bug-module-map.json` | Correção manual do módulo de um bug (`{ "1001": "MOD-ESTOQUE" }`) — a primeira regra da atribuição | Nada some: os bugs seguem as outras pistas. Por isso a ausência dele **não** entra em «Limitações desta geração» |

Um artefato ilegível vira aviso `EXTRA_ARTIFACT_INVALID` e o relatório segue pelo caminho
alternativo — nunca exit 1 por causa de um extra.

### O que falta testar — as duas camadas

| Camada | Quem produz | O que traz |
|---|---|---|
| **Automática** | o CLI, sempre que há matriz **medida** | itens sem nenhum caso de teste citando o código (id, tipo, título, módulo, situação — implementado / só no backlog / sem vínculo —, `arquivo:linha` sem contar `.md`, tarefas e itens de trabalho) e, à parte, os itens com teste que falha, com a causa do `test-findings.json` casada pelo código do item no nome do caso |
| **Curada** | o agente, no passo 4 do fluxo | `status/test-gaps.json` — o CLI só lê, nunca escreve |

Regras de junção: id curado que a matriz não conhece vira `TEST_GAPS_UNKNOWN_ID` e não
entra; item da matriz sem análise sai só com os campos automáticos e o selo «análise
detalhada pendente»; análise mais antiga que a coleta ou feita sobre outro
`traceMatrix.total` vira `TEST_GAPS_STALE`, e a data da análise aparece no topo da aba.
As contagens por ação, prioridade e área saem dos itens, nunca de texto livre. A
projeção é (itens com teste + marcar o código + criar do zero) ÷ total da matriz, e só
aparece com a camada curada.

**Matriz medida** quer dizer código inventariado **e** testes executados. Com `--no-tests`
(ou sem código) a aba não existe: «sem teste» seria afirmação falsa sobre todos os itens,
quando o que houve foi teste não executado. Se havia `test-gaps.json`, o aviso
`TEST_GAPS_NOT_MEASURED` diz por que ele não foi usado.

A **área** é o módulo do item na forma canônica (`RF-MOD-HOME-002` → `MOD-HOME`, a mesma
regra dos bugs) ou o agrupamento que a análise declarou em `areas`.

O domínio **Anexos** fecha com a tabela «Artefatos de extensão», que lista os presentes e
os ausentes com o que cada um habilitaria. É a resposta a «por que o relatório do projeto
X tem uma seção que o do projeto Y não tem».

### Camada editorial — `status/status-report-content.json`

O que **nenhum coletor pode produzir**: o veredito, as dimensões do semáforo com dono e
evidência, a pauta de decisões do cliente, os marcos da linha do tempo, a leitura do
consultor e o texto de cada bloco de pergunta (`.asks`). Modelo comentado em
[`templates/status-report-content.example.json`](templates/status-report-content.example.json).

Todas as chaves são opcionais e aceitam nome em inglês ou português. Sem o arquivo:

- o **veredito** sai do semáforo calculado, e a seção passa a se chamar «Situação geral»
  em vez de «Situação por dimensão»: no lugar das dimensões aparece a tabela dos sinais
  medidos, com o que é — resultado de medição, não dimensão de entrega com dono e
  evidência, que só quem conduz o projeto pode declarar;
- **não há linha do tempo.** Marco é decisão de quem conduz — abertura do épico, alteração
  de escopo, auditoria, homologação. Sintetizar marcos do que foi medido produzia uma linha
  em que metade dos pontos era a própria geração do documento;
- a **leitura do consultor** cai no `executive-summary.md` e, sem ele, no panorama
  automático — apresentado como derivado, nunca como análise;
- os blocos de **pergunta**, os **callouts** e a **pauta** simplesmente não saem.

Em `--mode conclusao` sem nenhuma das duas fontes, o CLI emite `REPORT_CONTENT_ABSENT`:
fechamento de escopo com narrativa robotizada é entrega pobre.

`repo` neste arquivo (org, projeto, branch, provider `azure`/`github`/`gitlab`) é o que
transforma os `arquivo:linha` em links clicáveis. Sem ele, os caminhos saem como texto —
nunca como âncora morta. O objeto é reemitido em `window.REPORT_REPO`, no fim do HTML:
editar ali repontar o relatório inteiro para outra org ou branch, sem regerar. Os arquivos
que a matriz encontrou citando um item (aba «O que falta testar») usam `repo.repository` —
o nome do repositório — e, sem ele, o nome do projeto, que é o repositório padrão no Azure
DevOps.

### Ritmo de entrega — cada leitura exige o seu dado

O coletor busca as **iterações do projeto com data de início e fim**
(`wit/classificationnodes/iterations`), porque é a data que distingue um sprint de uma
pasta de organização de escopo. A partir daí, cada leitura tem a sua condição:

| Leitura | Exige | Sem isso |
|---|---|---|
| Fechamento por semana | `closedDate` nos itens | não é montado |
| Ritmo por sprint | iteração **com data** + itens atribuídos a ela | não é montado |
| Velocidade | sprint real encerrado | não é calculada |
| Projeção e burnup | velocidade | não são montados |
| Carga por pessoa (sprint × pessoa) | sprint real + 2 ou mais responsáveis | não é montada |

Quando as iterações existem mas não têm data, o CLI emite `AZURE_ITERATIONS_UNDATED` e o
relatório declara a lacuna — **nada é reconstruído** (nenhum sprint sintético, nenhuma
janela de 14 dias «simulada»). As decisões de cálculo — item conta no `iterationPath`
registrado, projeção pela **mediana**, contagem só de itens **folha** — estão implementadas
em `lib/derive-delivery.mjs` e declaradas no próprio relatório.

---

### Semáforo — como o nível é decidido

`ok` / `atenção` / `ação necessária`, sempre com o **motivo listado**, nunca só a cor. Os
critérios exatos por nível estão implementados no coletor; as duas calibrações que importam:
em `--mode conclusao` (ou fase `delivery`), backlog abaixo de 80% concluído é **crítico**;
progresso normal de sprint em relatório de status é **info** — pintar andamento normal de
vermelho treina o cliente a ignorar o semáforo.

O sinal **«Bugs abertos»** é informativo. Com **5 bugs abertos ou mais**
(`BUG_SIGNAL_MIN_OPEN`), vira **atenção** quando um único módulo concentra 40% ou mais dos
bugs abertos, ou quando mais de 25% dos abertos estão em «Sem módulo identificado» — e aí o
motivo recomenda marcar a tag `MOD-XXX` nos cards. Abaixo de 5 abertos o percentual não é
leitura (1 bug aberto seria «100% concentrado») e o sinal fica informativo. **Atenção: este
sinal muda o nível geral** — um «atenção» de bugs leva o semáforo do projeto inteiro a
«Atenção», no Sumário e no veredito derivado.

---

## Execução de testes — política

**A skill executa os testes de verdade, em qualquer linguagem** — é o que separa este
relatório de uma planilha de intenções. Os ~30 frameworks suportados (unitário, integração,
funcional/E2E, contrato, performance), a decisão de natureza (pelo que o teste **verifica**,
refinada por caminho e nome do caso) e o grid paginado com filtros estão implementados em
[`lib/test-runners.mjs`](lib/test-runners.mjs) e no renderer — adicionar suporte a uma
linguagem = adicionar uma entrada lá; nenhum outro arquivo muda.

Princípios que o agente precisa saber (todos implementados):

- **Relatório machine-readable, sempre** — todo runner grava em `outputs/spec/status/tests-raw/`; nada é extraído do stdout humano.
- **Teste falhando não é erro da skill** — exit code permanece `0`.
- **`npx --no-install`** — a skill nunca instala dependência de teste por conta própria.
- **Higiene de segredo e de ambiente** — variáveis sensíveis não são repassadas aos runners; `stderr` persistido passa por redação; variáveis que contaminam runner filho (`NODE_TEST_CONTEXT`, `NODE_OPTIONS`, …) são removidas.

## Cobertura — três medidas, não uma

O cliente pergunta "está coberto?" e há **três respostas diferentes**. O relatório mostra as
três lado a lado em vez de fingir que cobertura é um número só.

| Medida | O que responde | De onde vem |
|---|---|---|
| **Cobertura de código** | Que porcentagem das linhas os testes exercitam? | instrumentação do próprio runner |
| **Regras e requisitos verificados** | Quantas RN/RF têm ao menos um teste automatizado? | matriz de rastreabilidade |
| **Plano de homologação automatizado** | Quantos casos do `test-plan.md` (CT-xxx) têm teste? | cruzamento CT ↔ casos executados |

**A cobertura de código é MEDIDA por padrão** (`--no-coverage` desliga), com a ferramenta
nativa de cada stack e os formatos usuais lidos (istanbul, lcov, cobertura-XML, JaCoCo,
go-profile, …), consolidados por **soma de linhas**. Ferramenta de cobertura ausente → a
suíte é **reexecutada sem cobertura** (perder os resultados seria o pior desfecho) e o
relatório declara `COVERAGE_UNAVAILABLE` com o comando que resolve.

---

## Compatibilidade com versões anteriores das skills

Um relatório que só entende o layout atual **mente** sobre projetos antigos: diz "não há
requisitos" quando o `requirements.md` está noutro lugar. A skill procura cada artefato em
**todos os layouts conhecidos** — pastas antigas, nomes-alias, subpastas por artefato,
`tasks.json` v1–v5, variações de campo e todo o vocabulário de IDs — e **declara a
proveniência** de cada achado (normalizadores em `lib/collect-docs.mjs`).

**Leitura de layout antigo ≠ escrita nele.** Os artefatos são lidos de onde estiverem, mas
as saídas **sempre** vão para `outputs/spec/status/` — a regra do kit
([`references/paths.md`](../tools/references/paths.md)) é que produtores gravam no layout
atual. Quando há divergência, o CLI avisa `LEGACY_LAYOUT` e o Sumário ganha o painel
**«Proveniência dos artefatos»** listando o que veio de onde.

---

## Gestão do projeto — consulta direta com fallback MCP

Duas rotas, nesta ordem:

**1. REST (preferida).** Credenciais do `.env`, carregado de: `<skill>/.env` →
`<skill>/../spec-tasks-azure/.env` (reaproveita o que já está configurado) → `<root>/.env`.
Variáveis já presentes em `process.env` vencem, para CI. Requer
`AZURE_DEVOPS_PAT` (escopo *Work Items: Read*), `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`.

Escopo da consulta, em precedência: `--azure-wiql <arquivo>` → **`id-map.json`** (exatamente
os work items publicados por `spec-tasks-azure` — o escopo mais preciso) → projeto com
filtro opcional de área/iteração. IDs viram campos via `/wit/workitemsbatch` em lotes de 200.

**2. Snapshot (fallback MCP).** Sem credencial, o CLI **não falha**: emite
`AZURE_CREDENTIALS_ABSENT` e imprime as três linhas do fallback. O agente então:

1. busca os work items pelo **MCP do Azure DevOps** (preferir os IDs de `id-map.json`) —
   e, para os bugs, os **itens-pai até a Epic** mesmo fora do escopo, em `ancestors`, com
   os campos de severidade, prioridade, tags, pai e datas (ver o template);
2. grava `outputs/spec/status/azure-snapshot.json` no formato de
   [`templates/azure-snapshot.example.json`](templates/azure-snapshot.example.json) —
   aceita o **formato simplificado** ou a **resposta REST crua** (`fields: {...}`); prefira
   a crua, traduzir campo a campo à mão é onde os erros entram;
3. re-roda o CLI (o snapshot é detectado automaticamente, ou aponte com `--azure-snapshot`).

O relatório **declara a origem** («API REST» vs «snapshot coletado via MCP») e o horário da
coleta. Estado é normalizado para concluído/em andamento/a fazer/removido, preservando o
rótulo real do ADO ao lado — projeto com processo customizado não vira “outros”.

A ligação com a matriz de rastreabilidade é a tag `logical-id:<ID>` (gravada por
`spec-tasks-azure` em toda criação) ou o prefixo do título (`TASK-XXX-XXX: …`).

**Rollup só sobre folhas.** Progresso, pontos e horas são somados apenas nos itens
**folha** do escopo — item-pai não entra junto com os filhos (senão o mesmo trabalho conta
duas vezes). O relatório declara o escopo usado (`summary.scopeNote`).

---

## Bugs por módulo — como o módulo é atribuído

É bug todo item cujo `System.WorkItemType` seja `Bug`, ou um dos tipos de
`--bug-types "Bug,Defeito"`. Na rota REST, os pais dos bugs que ficaram fora da consulta
são buscados nível a nível até a Epic (`AZURE_ANCESTORS_UNAVAILABLE` se a busca falhar) e
guardados à parte: servem para decidir o módulo, **não** entram no progresso do backlog.

A atribuição tenta as pistas **nesta ordem — a primeira que achar vence, e cada bug guarda
qual regra decidiu**:

| # | Pista | Observação |
|---|---|---|
| 1 | `status/bug-module-map.json` | decisão humana registrada (`{ "1001": "MOD-ESTOQUE" }`) |
| 2 | tag `MOD-XXX` no card | em maiúsculas. Com mais de uma tag de módulo, o bug **conta em cada uma** e a seção avisa a dupla contagem |
| 3 | código `MOD-XXX` no título, ou prefixo entre colchetes (`[CAD - Clientes]`) | o prefixo é resolvido contra a lista de módulos (`modules.md` e, sem ele, os códigos que os documentos e as épicas do `tasks.json` declaram), **pelo nome ou pela sigla, com correspondência exata e única** |
| 4 | a cadeia de pais até a Epic | aplica 2 e 3 em cada nível; na Epic com `epic-json:EPIC-XXX`, usa o módulo que o `tasks.json` dá para ela (`modulesAffected`/`module`) |
| 5 | subnível do `System.AreaPath` | que corresponda a um módulo |
| 6 | nenhuma | «Sem módulo identificado», barra própria, sempre por último e em cor neutra |

**Nunca** se atribui módulo por semelhança de palavras do título: «Ajustes no formulário da
Estoque» não tem pista, e adivinhar produziria um gráfico que parece medido e não é. Um código
embutido num ID de requisito (`RF-MOD-HOME-002`) vale como `MOD-HOME`.

Sem bug no escopo, a seção não existe. Sem o campo de severidade, a coluna sai e
`BUG_SEVERITY_ABSENT` declara a ausência em «Limitações desta geração».

---

## Rastreabilidade negócio → código → teste

O coletor varre o código procurando os IDs do vocabulário do pipeline
(`RN|RF|RNF|PR|GAP|SEC|CHG|TASK|STORY|EPIC|FEAT|MOD|TEL|FLX|CT|TC`) em comentários,
nomes de teste e caminhos, e cruza com os IDs declarados nos artefatos.

| Situação | Significado |
|---|---|
| `verificado por teste` | há código citando o ID **e** caso de teste passando que o referencia |
| `teste falhando` | há código citando o ID e um teste que o referencia está falhando |
| `implementado` | há código citando o ID, sem teste referenciando o ID |
| `só no backlog` | nenhum código cita o ID, mas há task do `tasks.json` que o declara |
| `sem vínculo` | ninguém cita o ID |

> **Leitura honesta do painel:** "sem vínculo" mede a **marcação**, não a implementação —
> o relatório diz isso ao cliente. Para elevar o número, comentar o ID no código, não
> maquiar a métrica. "IDs órfãos" (código cita, documento não tem) → corrigir na skill de
> origem, não aqui.

O mesmo vale para o teste: a matriz conta um item como testado quando o código dele aparece
no **nome do teste** (ou num comentário do arquivo de teste), não pelo que o teste faz. A aba
«O que falta testar» é onde isso vira providência, item a item — inclusive os itens que já
têm teste esperando só a marcação.

---

## Saídas

| Arquivo | Papel |
|---|---|
| `outputs/spec/status/status-report.html` | **entrega** — HTML único, CSS embutido, zero rede |
| `outputs/spec/status/status-data.json` | contrato entre coleta e renderização (permite `--render-only` sem re-executar testes) |
| `outputs/spec/status/tests-raw/*` | relatórios brutos dos runners (evidência auditável) |
| `outputs/spec/status/executive-summary.md` | **opcional**, escrito pelo agente/consultor — a leitura executiva curada |
| `outputs/spec/status/status-report-content.json` | **opcional**, a camada editorial completa (veredito, dimensões, pauta, marcos, `.asks`) — ver a seção «Artefatos de extensão» |
| `outputs/spec/status/azure-snapshot.json` | **opcional**, rota MCP do Azure DevOps |
| `outputs/spec/status/test-gaps.json` | **opcional**, escrito pelo agente no passo 4 — a análise item a item de «O que falta testar» |
| `outputs/spec/status/testes-a-criar-<data>.md` | **opcional**, gerado pelo CLI com `--export-test-gaps-md` — a aba «O que falta testar» para entregar ao time |
| `outputs/spec/status/bug-module-map.json` | **opcional**, correção manual do módulo de bugs |

---

## Exit codes

| Código | Significado |
|---|---|
| `0` | Sucesso — relatório gerado. **Testes falhando não alteram este código.** |
| `1` | Fatal — sem pasta de artefatos, `status-data.json` ilegível, saída não gravável, renderer abortou |
| `2` | **Degradação** — relatório gerado, mas algum coletor ficou indisponível (ADO sem credencial, runner que não rodou, testes desativados). O HTML declara a lacuna no Sumário → «Limitações desta geração» |
| `3` | `--check` falhou (modo verificação; nada é gerado) |

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia a geração (verificado em código no `cli.mjs`)

| Código | Verificação | Implementação |
|---|---|---|
| `OUTPUTS_DIR_FOUND` | A pasta de artefatos existe (`outputs/spec`, `$PIPELINE_OUTPUTS_DIR/spec`, `--outputs` ou o layout legado `task-generator/outputs` com aviso). Ausente → **exit 1** com a instrução de rodar o discovery antes | `resolveOutputsDir()` + guard em `main()` |
| `PHASE_VALID` | `--phase` só aceita `discovery\|specification\|implementation\|delivery` → **exit 1** | `detectPhase()` |
| `STATUS_DATA_READABLE` | Em `--render-only`, o `status-data.json` existe e é JSON válido → **exit 1** | `readJson()` + guard |
| `HAS_DOMAIN` | O HTML sai com pelo menos um `data-domain=` — rede contra o defeito histórico «HTML vazio com exit 0» | `assertNoPlaceholder()` |
| `NO_PLACEHOLDER_LEFT` | Nenhum marcador **do renderer** (`<!-- X-PLACEHOLDER -->`, `__DEFAULT_DOMAIN__`, `__PROJECT_NAME__`) sobrevive no HTML → **exit 1**. Marcadores de **artefato** (`[Nome do Projeto]` num `product-vision.md` incorporado) são WARNING, nunca fatal: o relatório inteiro não pode morrer por conteúdo de documento do cliente | `assertNoPlaceholder()` + `stubWarnings()` |
| `HTML_NOT_EMPTY` | HTML final ≥ 4000 bytes → **exit 1** | `assertNoPlaceholder()` |
| `THEME_PRESENT` | `lib/report-theme.css` existe ao lado do renderer → **exit 1** | `loadCss()` |

### WARNING — não bloqueia; entra em «Limitações desta geração» no HTML

Cada aviso do CLI sai **autoexplicativo no stderr** com o que fazer — a lista completa vive
nas mensagens do próprio CLI. Os que **exigem reação do agente** antes de entregar:

| Código | Reação |
|---|---|
| `AZURE_CREDENTIALS_ABSENT` / `AZURE_REQUEST_FAILED` | Executar o **fallback MCP** (seção «Gestão do projeto») em vez de entregar o domínio Azure vazio |
| `EXEC_SUMMARY_STUB` / `PROJECT_NAME_STUB` | Marcador de template chegou perto do cliente — preencher o `executive-summary.md` / passar `--project-name` e re-renderizar |
| `ARTIFACT_STUB_CONTENT` | Artefato de negócio com marcador de template — corrigir **na skill de origem** antes de entregar |
| `REPORT_CONTENT_ABSENT` | Em `--mode conclusao`: escrever a camada editorial (ou ao menos o `executive-summary.md`) — fechamento com narrativa robotizada é entrega pobre |
| `AZURE_ITERATIONS_UNDATED` | Declarada a lacuna de sprint/projeção — se o cliente espera essas leituras, datar as iterações no tracker e regerar |
| `TEST_GAPS_UNKNOWN_ID` / `TEST_GAPS_DUPLICATE_ID` | `test-gaps.json` cita item que a matriz não conhece, ou repete item — corrigir o arquivo e rodar `--render-only` |
| `TEST_GAPS_STALE` | A análise é mais antiga que a coleta ou foi feita sobre outro total da matriz — refazer a análise antes de entregar a aba ao time |
| `TEST_GAPS_NOT_MEASURED` | Há `test-gaps.json`, mas a coleta não executou testes ou não inventariou código — a aba não foi montada; coletar de novo com código e testes |
| `BUG_SEVERITY_ABSENT` | Os bugs não têm severidade — a coluna sai e a ausência é declarada; se o cliente espera a leitura, trazer `Microsoft.VSTS.Common.Severity` no snapshot |
| `BUG_MODULE_MAP_UNKNOWN_ID` | `bug-module-map.json` cita item que não está entre os bugs coletados — corrigir o mapa |
| `AZURE_ANCESTORS_UNAVAILABLE` | Os pais dos bugs fora do escopo não foram lidos — o módulo desses bugs saiu só das pistas do próprio card |
| `AZURE_OPTIONAL_FIELDS_ABSENT` | O processo do projeto não tem `Severity` ou `ResolvedDate` (erro `TF51535`): o lote foi refeito sem eles e o backlog veio inteiro; a severidade fica fora desta geração |

### Responsabilidade do agente — não é gate do CLI

| Código | O que fazer |
|---|---|
| `SYNC_LOG_UPDATED` | Adicionar a linha no `sync-log.md` após gerar o HTML. O CLI não verifica (é escrita posterior) — cobrado na «Definição de pronto» |
| `EXEC_SUMMARY_CURATED` | Em relatório de **conclusão**, escrever o `executive-summary.md`. Panorama automático serve para status semanal; fechamento de escopo com narrativa robotizada é entrega pobre |
| `MCP_FALLBACK_DONE` | Ao ver `AZURE_CREDENTIALS_ABSENT`, executar o fallback MCP em vez de entregar o domínio Azure vazio |

---

## Manutenção da própria skill

**Ao mexer no CLI, nos coletores, nos parsers ou no renderer** — nunca na geração normal —,
seguir [`./MAINTENANCE.md`](./MAINTENANCE.md): reproduzir os 30 cenários de degradação com
fixtures temporárias e rodar `node --test tests/*.test.mjs` na pasta da skill (**93 casos de regressão** — 61
em `tests/regression.test.mjs` e 32 em `tests/lacunas-e-bugs.test.mjs` —, cada um travando
um defeito real ou uma promessa da especificação; se um ficar vermelho, o defeito voltou).

O porquê de algumas escolhas de desenho — perguntar as pastas em vez de adivinhar, a
rastreabilidade dentro das operações, a seção que some sem fonte, as três coberturas e o desenho
de «Bugs por módulo» — está no [`./MAINTENANCE.md`](./MAINTENANCE.md) § «Por que a skill é assim».
Ler ao mexer na skill; para gerar o relatório não é preciso.

---

## Definição de pronto

A estrutura do HTML (domínios por presença, âncoras, placeholders, grid, coberturas,
proveniência) é garantida pelos **gates do CLI e pela suíte de regressão** — validators
acima. O que o agente confere além deles:

- [ ] CLI executado com exit 0 ou 2 (2 = degradação **declarada** no relatório) e caminho do HTML informado
- [ ] Avisos do stderr tratados — em especial os da tabela «exigem reação» acima
- [ ] Em `--mode conclusao`: `executive-summary.md` (ou camada editorial completa) **curado**, não panorama automático
- [ ] Nenhum número sem fonte rastreável; nenhum domínio preenchido com estimativa
- [ ] **Sync-log atualizado** com a versão gerada e as questões em aberto
- [ ] Se o passo 4 rodou: nenhum `TEST_GAPS_*` em aberto e `testes-a-criar-<data>.md` gerado pelo CLI (`--export-test-gaps-md`), não escrito à mão
- [ ] **Ao mexer no CLI/coletores/renderer** (nunca na geração normal): `node --test tests/*.test.mjs` verde (93 casos) + cenários do [`./MAINTENANCE.md`](./MAINTENANCE.md)

---

## O que NÃO faz

- Não altera os `.md` fonte, o `tasks.json` nem o código — só lê, executa e compila.
- Não gera conteúdo de negócio novo: a narrativa executiva é curada por humano/agente em
  `executive-summary.md` e deve ser rastreável aos artefatos.
- Não instala dependências de teste nem cria ambiente de E2E — runner que não roda vira
  aviso, não instalação silenciosa no repositório do cliente.
- Não escreve nada no Azure DevOps (leitura apenas; publicação é `spec-tasks-azure`).
- Não decide, fecha nem prioriza GAP — reflete o estado de `gaps.md` no momento da geração.
- Não substitui `spec-code-audit` (Fase 12): reporta a decisão da auditoria, não a executa.
- Não substitui `spec-report` (kit de discovery): aquele compila a documentação de
  descoberta; este é a **entrega de status/conclusão** com código, testes e ADO.
- Não gera HTML fora do CLI.

---

## Skills irmãs

| Skill | Fase | Relação com `spec-status-report` |
|---|---|---|
| `spec-report` | doc | Kit HTML do **discovery**; este é o relatório de **entrega/status** (fontes se sobrepõem, propósitos não) |
| `spec-product` / `spec-ingest` | 1–5 | Produzem os artefatos do domínio Negócio |
| `spec-tech-rules` | 5.5 | Produz as rules exibidas no domínio Técnico |
| `spec-data-model` / `spec-api-contracts` | 6a/6b | Fontes do modelo de dados e da superfície de API |
| `spec-tasks` | 7 | `tasks.json` alimenta o vínculo backlog ↔ regra de negócio |
| `spec-test-plan` | 7a | Casos de negócio (UAT) listados ao lado dos testes automatizados |
| `spec-tasks-azure` | 8 | Publica os work items e grava `id-map.json` + tag `logical-id` — é o que torna a correlação ADO precisa |
| `spec-implement` | 10 | Escreve o código e mantém os `spec_story.md` lidos como decisões |
| `spec-code-audit` | 11 | `code-audit.md` alimenta o semáforo (APROVADO/BLOQUEADO) |
| `spec-estimate` | 7.5 | `estimate-report.md` entra como sinal de fase e contexto de delivery |
| `spec-debug-fix` | 10c | Destino natural das falhas de teste que este relatório expõe |

---

## Posição no fluxo

→ **Fase 13**, executável em **qualquer momento** após o discovery. Não é gate de nenhuma
outra skill e não altera artefato de ninguém: é o ponto de contato com o cliente.
