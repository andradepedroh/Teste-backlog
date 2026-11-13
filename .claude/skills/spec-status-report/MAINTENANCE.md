# spec-status-report — Guia de manutenção

> **Contexto de manutenção, não de execução.** Ler apenas ao **mexer no CLI, nos coletores,
> nos parsers ou no renderer** — nunca para gerar um relatório (o fluxo de execução vive no
> `SKILL.md`).

## Cenários de degradação a verificar

Ao mexer no CLI, nos coletores ou no renderer, reproduzir com fixtures em `/tmp` (fora do
repositório):

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | **Pós-discovery** (só artefatos de negócio) | exit 0 ou 2; domínios `visao, negocio, riscos, anexos`; **sem** Código nem Testes; landing no Sumário |
| 2 | **Pós-especificação** (+ data-model, contratos, tasks, rules) | + `tecnico`, `gestao`; nenhum número de código inventado |
| 3 | **Pós-código com testes verdes** | + `codigo`, `testes`; suítes com exit code e duração reais |
| 4 | **Pós-código com teste falhando e teste ignorado** | **exit 0**; semáforo `crítico` por teste falhando; falha renderizada com mensagem; o item de negócio correspondente vira `teste falhando` na matriz |
| 5 | **Sem credencial de ADO** | exit 2; domínio Azure com aviso de indisponibilidade; instrução do fallback MCP no stdout; **nenhum número de backlog inventado** |
| 6 | **Snapshot MCP presente** | exit 0; origem declarada como «snapshot coletado via MCP» com data da coleta |
| 7 | **`--no-tests`** | exit 2; domínio Testes com o motivo declarado; cobertura pré-existente ainda lida |
| 8 | **Sem `outputs/spec`** | **exit 1**, nada gravado, mensagem com a instrução de rodar o discovery ou usar `--outputs` |
| 9 | **`executive-summary.md` só com o template** | exit 0 (2 se houver outra lacuna de coletor); aviso `EXEC_SUMMARY_STUB`; panorama automático no lugar; **`[Nome do Projeto]` nunca aparece no HTML** |
| 10 | **`--render-only` após editar o `executive-summary.md`** | exit 0 em segundos, sem re-executar testes; **narrativa relida do disco** e curada na abertura; `status-data.json` atualizado |
| 11 | **Projeto Python / Go / Java / PHP** | framework detectado e executado; LOC contada com a sintaxe de comentário certa; cobertura lida no formato nativo (cobertura-xml, go-profile, JaCoCo, clover) |
| 12 | **Sem ferramenta de cobertura instalada** | suíte reexecutada sem cobertura; resultados preservados; `COVERAGE_UNAVAILABLE` com o comando que resolve |
| 13 | **Layout `task-generator/outputs` + `tasks.json` v3** | artefatos lidos e rotulados como legado; backlog achatado com nota de compatibilidade; **saída em `outputs/spec/status/`**, nada escrito no layout descontinuado |
| 14 | **Testes em `tests/e2e/` e `tests/integration/`** | quadro por natureza com os três blocos; grid marca cada linha com o tipo correto |
| 15 | **Projeto com 100+ casos** | grid pagina em 50 por página; filtro de tipo + situação + busca combinam por E; ordenação por coluna |
| 16 | **Sem nenhum artefato de extensão** | Negócio sai pelo caminho clássico (RN/RF/RNF); funil, matriz de aceite, glossário e anexos **não são renderizados** e **não deixam link na navegação**; nenhum bloco em branco |
| 17 | **Com todos os artefatos de extensão** | matriz de aceite, funil, entrega por frente, ficha de endpoint, causas-raiz, glossário com siglas marcadas e índice de anexos; o bloco clássico de RN **não** duplica a leitura |
| 18 | **Artefato de extensão ilegível** | aviso `EXTRA_ARTIFACT_INVALID`; o domínio cai no caminho alternativo; **nunca exit 1** |
| 19 | **Tracker sem iteração com data** | aviso `AZURE_ITERATIONS_UNDATED`; **sem** seção de sprint, velocidade, projeção e carga por pessoa; o fechamento por semana continua, porque data de fechamento é fato |
| 20 | **`--mode conclusao` sem camada editorial** | aviso `REPORT_CONTENT_ABSENT`; «Situação geral» com a tabela de sinais medidos; **sem** linha do tempo e **sem** pauta |
| 21 | **Tracker COM iteração datada** | sprints com o nome do tracker, velocidade sobre os encerrados e projeção pela mediana nos três cenários |
| 22 | **Falhas sem `test-findings.json`** | **sem** seção de causa-raiz no Sumário; a distribuição por tipo de teste permanece no quadro por natureza, em Testes |
| 23 | **Matriz medida, sem `test-gaps.json`** | aba «O que falta testar» em forma **reduzida**, dizendo por quê; cada item com o selo «análise detalhada pendente»; **sem** projeção de cobertura; anexo «têm teste, mas o teste falha» com a causa da triagem quando há `test-findings.json` |
| 24 | **Com `test-gaps.json`** | ações, projeção (itens com teste + marcar + criar do zero ÷ total), prioridade e área, achados, pontos para o PO sem repetição, cartões com filtros por prioridade/ação/camada/repositório; `--export-test-gaps-md` grava `testes-a-criar-<data>.md` com o mesmo conteúdo |
| 25 | **`test-gaps.json` com id desconhecido, repetido ou velho** | `TEST_GAPS_UNKNOWN_ID` (o item não entra), `TEST_GAPS_DUPLICATE_ID` (vale a primeira), `TEST_GAPS_STALE` (análise mais antiga que a coleta ou com outro `traceTotal`); a data da análise no topo da aba |
| 26 | **Sem matriz (sem RN/RF), ou `--no-tests` / `--no-code`** | a aba **não existe** e não deixa link no menu; com `test-gaps.json` presente, `TEST_GAPS_NOT_MEASURED` diz por que ele não foi usado |
| 27 | **Bugs no escopo** | seção «Bugs por módulo» em Execução: barras abertos × fechados, «Sem módulo identificado» por último e neutro, tabela de apoio, lista bug a bug com a pista; bug com duas tags `MOD-XXX` conta nas duas, com aviso de dupla contagem; sinal «Bugs abertos» no semáforo |
| 28 | **Bugs sem severidade / nenhum bug** | sem o campo, a coluna sai e `BUG_SEVERITY_ABSENT` vai para «Limitações desta geração»; sem bug no escopo, nem seção nem sinal |
| 29 | **Bugs com menos de 4 semanas de dado** | **sem** evolução semanal; uma nota diz quantas semanas havia |
| 30 | **`--render-only` depois de editar um extra** | `test-findings.json`, `test-gaps.json`, `bug-module-map.json` e a camada editorial relidos do disco, o log lista quais; os avisos dos extras são **trocados**, não acumulados; `status-data.json` de versão anterior tem os módulos das épicas relidos do `tasks.json` (nota de compatibilidade no log) |

Checagem rápida do HTML gerado:

```bash
grep -c 'data-domain=' relatorio.html && grep -c -E 'undefined|NaN|\[object Object\]' relatorio.html
```

O primeiro precisa ser > 0; o segundo, 0. A suíte de regressão automatiza os dois, mais a
verificação de âncora órfã (todo `data-anchor` tem um `id` correspondente), de célula
vazia e de balanceamento das tags.

---

## Testes de regressão da própria skill

`node --test tests/*.test.mjs` na pasta da skill (ou `npm test`) roda `tests/regression.test.mjs`
(**61 casos**) e `tests/lacunas-e-bugs.test.mjs` (**32 casos**: 20 da v2.2 e 12 da revisão
dela — ver abaixo), **93 no total**. Rode sempre com o caminho dos testes: o `node --test`
sem argumento também carrega `lib/test-runners.mjs` (o padrão `**/test-*.mjs`) e reporta 94,
um caso a mais que não é teste. E passe os arquivos, não a pasta: no Node 22+ o argumento é
padrão de arquivo, e `node --test tests/` falha com `Cannot find module …\tests`. Cada
execução apaga as pastas temporárias que criou. Os 61 reproduzem
defeitos reais já corrigidos, entre eles: build Gradle verde reportado como não executado;
PAT do ADO vazando para o HTML; `[Nome do Projeto]` de artefato abortando o relatório;
`data-model.json`/`tasks.json`/`azure-snapshot.json` com campo em forma de mapa derrubando o
CLI; `describe` contado como caso de teste no TAP; pai e filho somados no rollup do ADO;
`### CT-001` descartado do `test-plan.md`; `javascript:` chegando a `href`; `<failure>` dentro
de `<system-out>` reprovando teste verde; argumento com espaço partido no Windows; e as duas
regressões de complexidade (`parseIdBlocks` e JUnit sem `classname`, com orçamento de tempo
no próprio teste).

Da v1.1: **`PATH` removido do ambiente dos filhos** porque o filtro de segredo casava com
"PAT" (todo comando sumia com ENOENT); LOC contada com `#` em Java; extensões de artefato
(`.coverage`, `go.mod`) virando "linguagens"; cobertura em lcov/cobertura/JaCoCo/go-profile;
`tasks.json` v1/v2/v3; layout legado gravando a saída na pasta descontinuada; testes de
`tests/e2e/` contados como unitários; e a aba de backlog citando a ferramenta.

Da v1.2: `NODE_TEST_CONTEXT` herdado fazendo a suíte do cliente reportar **zero casos**
quando a skill roda dentro de outro test runner — o defeito apareceu justamente porque o
teste do grid rodava aninhado.

Da **v2.0** (casos 22 a 32), todos defeitos encontrados ao montar esta versão:

| Caso | Defeito que trava |
|---|---|
| 22, 25 | Seção sem fonte deixando **link órfão** na navegação e bloco em branco no corpo |
| 23 | Caminho rico e caminho clássico saindo **os dois juntos**, duplicando a leitura de negócio |
| 24 | Artefato de extensão ilegível derrubando o domínio inteiro em vez de virar aviso |
| 26 | Projeção e sprints aparecendo **sem dado de backlog** para sustentá-los |
| 27 | Média mascarando o pico de remediação e **antecipando prazo**; sprint reconstruído sem a etiqueta «simulado» |
| 28 | Item-pai somado junto com as filhas no progresso e no ritmo |
| 29 | Decisão da auditoria invertida por busca de substring: uma re-auditoria usa «BLOQUEADO» dezenas de vezes para dizer que o **vetor de ataque** está bloqueado |
| 30 | Marcação de sigla entrando dentro de `<code>` e de atributo, quebrando o HTML |
| 31 | Filtro de grid sem atributo correspondente na linha (select que não filtra) e coluna numérica ordenando `10` antes de `9` |
| 32 | Script embutido com erro de sintaxe — o documento abre, mas não troca de aba |

Três defeitos de infraestrutura corrigidos junto, porque impediam a própria suíte de rodar:

- **`await import()` com caminho do Windows** (`C:\…`) rejeitado pelo loader ESM com
  `ERR_UNSUPPORTED_ESM_URL_SCHEME` — a suíte inteira morria na primeira linha. Agora passa
  por `pathToFileURL`.
- **Resultados de teste perdidos quando falta a ferramenta de cobertura.** O `npx
  --no-install` recusa baixar o `c8` e o console em português responde «não é reconhecido»;
  nenhuma das duas mensagens casava com as regex em inglês, então a reexecução sem
  cobertura não acontecia e um projeto de suíte verde saía com **zero casos**. A
  recuperação passou a ter um gatilho **estrutural** — comando instrumentado que falha sem
  produzir relatório é sempre reexecutado sem cobertura, independentemente do idioma.
- **Fixture do Gradle só em POSIX**, que o `cmd` do Windows não executa.

Da **v2.2** (casos 43 a 61, em `tests/lacunas-e-bugs.test.mjs`) — a aba «O que falta testar»,
a seção «Bugs por módulo» e o `--render-only` relendo os extras:

| Caso | O que trava |
|---|---|
| 43 | item sem teste na camada automática (com `arquivo:linha`, sem `.md`); item com teste falhando no anexo, com a causa da triagem |
| 44, 45 | `TEST_GAPS_UNKNOWN_ID` (o item não entra) e `TEST_GAPS_STALE` (data anterior à coleta; outro `traceTotal`); mesmo dia não é desatualização |
| 46, 47 | projeção calculada dos itens e ausente sem a camada curada; ordem das seções da aba; filtros com atributo na linha; o `.md` com o mesmo conteúdo |
| 48, 48b | sem matriz, sem aba e sem link; com `--no-tests`, sem aba — «não executado» não vira «sem teste» |
| 49 | `--render-only` relê `test-findings.json` e `test-gaps.json` escritos depois da coleta, e troca os avisos em vez de acumular |
| 50–53 | atribuição 1→6 com a regra que decidiu; duas tags contam duas vezes; **nenhuma** atribuição por palavra do título; a fixture de escala (144 = 13 + 11 + 90 + 30) |
| 54, 55 | evolução semanal só com 4 semanas; semáforo por concentração (≥ 40%) e por falta de módulo (> 25%) |
| 56–59 | gráfico com `title`/`desc` e cor por classe; severidade só com o campo; sem bug, sem seção; `--bug-types`; cruzamento só com defeito **classificado**; pais buscados até a Epic na rota REST, sem laço em ciclo de vínculo |
| 60, 61 | contrato dos grids novos (filtro múltiplo) e HTML bem formado; área pelo módulo canônico (`RF-MOD-CADASTRO-002` → `MOD-CADASTRO`) |

Da **revisão da v2.2** (casos 62 a 73, no mesmo arquivo):

| Caso | O que trava |
|---|---|
| 62 | semáforo de bugs só aplica os percentuais com 5 abertos ou mais (`BUG_SIGNAL_MIN_OPEN`) — 1 bug aberto não rebaixa o projeto |
| 63, 64 | semana dos bugs e «análise velha» no fuso do relatório (`lib/fuso.mjs`); `start` da semana em `AAAA-MM-DD`; ano no rótulo quando a janela cruza anos |
| 65 | `--input` explícito não é regravado; o `status-data.json` padrão é |
| 66 | `test-gaps.json` ausente não vira «ausente» nem limitação (passo opcional) |
| 67 | lote REST refeito sem `Severity`/`ResolvedDate` quando o processo os recusa (`TF51535`), com `AZURE_OPTIONAL_FIELDS_ABSENT` |
| 68, 69 | `bugTypes` em texto; código de módulo com prefixo qualquer (`STORY-`, `TC-`, `US-`) e fronteira à direita |
| 70, 71 | link markdown protocolo-relativo (`//host`, `/\host`) recusado; `arquivo:linha` de «O que falta testar» com link quando há `repo` |
| 72 | ids dos gráficos estáveis por renderização |
| 73 | rules lidas das três pastas que existirem (Claude Code, Cursor, steering do Kiro), cada uma com o rótulo da pasta real |

Três cuidados que esta versão ensinou:

- **Nome de arquivo em `lib/` não começa por `test-`.** O `node --test` sem argumento carrega
  `**/test-*.mjs` como arquivo de teste; um `lib/test-gaps.mjs` entrava na contagem da suíte
  como «teste que passou». Por isso os módulos novos se chamam `lacunas-teste*.mjs`. O
  `lib/test-runners.mjs`, que já existia, é o motivo de o `node --test` sem argumento
  reportar um caso a mais — por isso a suíte roda com `node --test tests/*.test.mjs`.
- **Edite os arquivos CRLF sem `sed -i`.** Oito arquivos da skill vêm do upstream com fim de
  linha CRLF (`SKILL.md`, `MAINTENANCE.md`, `package.json`, `cli.mjs`, `build-status-data.mjs`,
  `collect-docs.mjs`, `detect-phase.mjs`, `render-domains.mjs`) e a zona das skills está sob
  `-text` para que o merge de três pontas compare byte a byte. O `sed -i` do Git Bash grava LF e transforma o
  arquivo inteiro em diferença.
- **Data sem hora é dia, não instante.** `fmtDate("2026-04-08")` saía 07/04 no fuso de
  Brasília; agora data `AAAA-MM-DD` é formatada sem conversão de fuso (afetava também os
  marcos da linha do tempo).

**Rodar a suíte é obrigatório ao mexer em qualquer coletor, parser ou no renderer.** Cada
teste tem no comentário o caso concreto que estava quebrado — se um deles ficar vermelho, o
defeito voltou.

---

## Por que a skill é assim — justificativas de design

Saíram do `SKILL.md` na Onda 4 do plano de melhoria das skills do harness (2026-10-20): explicam
escolhas já implementadas e só servem a quem mantém a skill. O texto é o mesmo que estava lá.

### Em «Kickoff obrigatório — de onde vem o escopo»

Por que perguntar em vez de adivinhar — os dois casos são a norma, não a exceção:

- **Entrega multi-repositório.** O produto vive em quatro repositórios, cada um com o seu
  clone. Varrer «a raiz» pega um e ignora os outros, ou pega uma pasta de trabalho que
  contém **também** outros subprojetos e mistura entrega alheia no relatório do cliente.
- **Monorepo com vários produtos.** A raiz tem dez aplicações e o relatório é de uma.
  Contar as dez infla a entrega e o cliente recebe um número que não é dele.

### Em «Estrutura do relatório (domínios)»

> A **rastreabilidade** deixou de ser aba própria: com `business-operations.json` ela vive
> dentro de cada operação (regra → `arquivo:linha` → caso de teste), que é onde o cliente
> a procura; sem ele, aparece como «Rastro do pipeline no código» no domínio Código. Uma
> aba separada obrigava o leitor a cruzar duas telas para responder «onde isto foi feito».

### Em «Artefatos de extensão — o relatório se adapta ao que o projeto tem»

Não há fluxo de telas nos documentos? Não há seção de fluxos. Não há sprint configurado no
tracker? Não há gráfico de sprint, nem velocidade, nem projeção. O que se perde é
vistosidade; o que se ganha é que todo número resiste à pergunta «de onde saiu isso?».

### Em «Cobertura — três medidas, não uma»

Um projeto com 90% de cobertura de código e 20% de regras verificadas está testando muito
código e pouca **regra** — e é exatamente isso que o cliente precisa enxergar.

### Em «Bugs por módulo — como o módulo é atribuído»

A seção (em «Execução e backlog») traz: barras horizontais por módulo, empilhadas em abertos
e fechados, ordenadas por abertos e depois pelo total, com o número de cada barra; a tabela de
apoio (abertos, fechados, total, abertos por severidade quando há o campo, idade média dos
abertos, contagem por regra de atribuição e — quando o `test-findings.json` tem causa
classificada como defeito de produto — os defeitos achados pelos testes, rotulados como fonte
diferente); a evolução semanal de abertos e fechados, **só com 4 semanas ou mais de dado**
(semanas de segunda a domingo no fuso do relatório, America/Sao_Paulo; o rótulo leva o ano
quando a janela cruza anos); e
a lista bug a bug com a pista que decidiu. Os gráficos são SVG gerado no renderer, sem
biblioteca e sem rede, com `title`/`desc` e tabela equivalente; as cores vêm de tokens do
`report-theme.css`, com variante escura sob `[data-theme="dark"]`.
