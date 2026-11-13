---
name: spec-estimate-report
description: >
  spec-estimate-report — relatório HTML único e autocontido que consolida TODO o pipeline
  spec-* (Fases 0 a 8.5) num SPA navegável de 7 abas: Negócio, Técnica (com o desenho de
  arquitetura do hld.md), Testes, Segurança, Lacunas, Backlog e Estimativa (forecast Monte
  Carlo, custos tradicional × IA, caminho
  crítico, cenários). A IA NÃO escreve HTML: sintetiza os artefatos de outputs/spec/ num
  ÚNICO report-data.json seguindo o schema; o cli.mjs injeta o JSON no shell congelado e
  emite o HTML. Distinta de spec-report (só discovery em .md→HTML) e de spec-estimate
  (HTML só da estimativa). Invocar para "relatório consolidado", "report da especificação",
  "HTML executivo do projeto", "dossiê do projeto", "consolidar tudo num HTML",
  "spec-estimate-report". Saída: outputs/spec/estimate-report/spec-estimate-report.html.
  Conteúdo humano em Português do Brasil.
version: "1.3"
updated: "2026-10-20"
---

# spec-estimate-report — Relatório HTML consolidado do pipeline

## Papel

Produzir **um único arquivo HTML autocontido** que consolida o resultado de todo o fluxo
`spec-*` numa entrega executiva navegável — o mesmo formato do relatório de referência (o
exemplo do kit é um projeto fictício, «Exemplo — Portal de Pedidos»). É um SPA de **7 abas** (menu lateral + hash routing `#negocio` … `#estimativa`),
com tema claro/escuro, gráficos SVG gerados no cliente, árvore de backlog pesquisável e a
seção de estimativa com forecast Monte Carlo nos dois modos de execução (tradicional × IA).

Sem servidor, sem rede, sem CDN: CSS, engine de render e dados vão embutidos no arquivo.

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

Vale para todo texto que entra no HTML: títulos de seção, legendas de gráfico, notas de rodapé e a síntese executiva. Gráfico sem uma frase dizendo o que ele mostra e o que se conclui dele não está pronto.

## Regra de ouro — a IA não escreve HTML

O HTML é montado por [`cli.mjs`](cli.mjs), que injeta um **payload JSON** dentro de um
**shell congelado** ([`templates/report-shell.html`](templates/report-shell.html) — engine de
render + CSS, versionado e **não editado à mão** por esta skill). O trabalho da IA é **um só**:
produzir o `report-data.json`.

> **Congelado em tempo de execução, não para sempre.** Ao gerar um relatório, a IA nunca toca no
> shell — se o HTML não sai certo, o defeito está no `report-data.json`. Evoluir a engine (seção
> nova, gráfico novo) é **manutenção do kit**: acontece fora de um relatório, com
> `report-data.schema.md`, `SKILL.md`, `HISTORY.md` e os testes atualizados no mesmo commit.

> **DICA (economia de tokens):** não tente gerar o HTML na unha — daria truncation e mudaria a
> saída. Gere o `report-data.json` e rode o CLI. A engine já sabe desenhar tudo.

## Arquitetura

```
artefatos outputs/spec/  ──(IA sintetiza)──►  report-data.json  ──(cli.mjs injeta)──►  spec-estimate-report.html
                                              ▲ único artefato da IA      ▲ shell congelado + payload
```

- **Shell congelado:** `templates/report-shell.html` traz `<script id="payload">__PAYLOAD__</script>`
  e os marcadores `__REPORT_TITLE__ / __BRAND_NAME__ / __BRAND_SUB__`. O CLI substitui os quatro.
- **Payload:** o `report-data.json` vira o conteúdo do `<script id="payload">`; a engine faz
  `JSON.parse` e desenha as abas (contagens de heading são derivadas dos arrays — não há
  campo numérico para elas).

## Etapa A — Coletar os artefatos

Ler o que existir em `outputs/spec/` (e onde o projeto guardar os outputs). Cada aba tem sua fonte:

| Aba | Fontes principais | Skill de origem |
|-----|-------------------|-----------------|
| **Negócio** | `product-vision.md`, `modules.md`, `business-rules.md`, `requirements.md`, `product-requirements.md`, `flow-map.md`, `discovery-document.md`, `gaps.md` | spec-product, spec-ingest, spec-iterate |
| **Técnica** (arquitetura) | `hld.md` — **via `python3 ../tools/check-hld.py outputs/spec/hld.md --json`** (subprocess; nunca reparsear o `.md`) | spec-hld |
| **Técnica** | `.cursor/rules/`/`.claude/rules/` (ou `tech-rules/*.mdc`), `data-model.json`, `api-contracts.yaml` + `api-contracts-supplement.json` | spec-tech-rules, spec-data-model, spec-api-contracts |
| **Testes** | `test-plan.md` | spec-test-plan |
| **Segurança** | `security-review.md` + tasks SEC-NNN em `tasks.json` | spec-security-review |
| **Lacunas** | `gaps.md`, `sync-log.md` | spec-iterate, spec-scope-change |
| **Backlog** | `tasks.json` (Epic › Feature › Story › Task) | spec-tasks |
| **Estimativa** | `estimate-data.json`, `estimate-report.md` | spec-estimate |

`meta.fases[]` sai do log de fases do `sync-log.md`; `meta.totais` agrega as contagens de todos
os artefatos. Artefato ausente → a aba correspondente fica sem dados (ver «Degradação»).

## Etapa B — Sintetizar o `report-data.json`

Montar **um** objeto JSON com as chaves `meta, negocio, tecnica, testes, seguranca, gaps,
backlog, estimativa`, seguindo **[`templates/report-data.schema.md`](templates/report-data.schema.md)**.
Para ver a forma exata de um campo, **consultar
[`templates/report-data.example.json`](templates/report-data.example.json) por busca/trecho**
(grep ou leitura parcial) — o arquivo tem **~220 KB (~65k tokens)**: é a golden fixture dos
testes, um projeto fictício e coerente (4 épicos, 15 histórias, 34 tasks) que cobre todos os campos
do schema, inclusive `tecnica.hld`. Ler inteiro custa caro; prefira o trecho do campo. O conteúdo é
inventado — serve de forma, **nunca** de texto para o relatório de um projeto.

Regras ao preencher:

1. **Fidelidade, não invenção.** Todo valor deve ser rastreável a um artefato. Contagens
   (`meta.totais`, faixas de métrica) devem bater com os artefatos — números do relatório são
   verificáveis.
2. **A aba Estimativa é remapeada, não copiada.** A engine usa nomes próprios (a lista
   completa está no schema) — traduza o `estimate-data.json` para essa forma. Se não houver
   estimativa assistida por IA, omita `forecast.iaAssistida` e os campos `ia*` — os painéis
   de comparação degradam.
3. **Notas editoriais (`*Nota`) são opcionais e aceitam HTML inline** (`<b>`, `<code>`, `<br>`).
   São a voz do consultor (ex.: `negocio.gaps.nota`, `estimativa.calibracaoNota`,
   `tecnica.api.bloqueadosNota`). Omita e a seção some sem quebrar o layout. **Nunca** reaproveite
   texto de outro projeto num campo `*Nota`.
4. **Arquitetura → `tecnica.hld`.** Quando existir `outputs/spec/hld.md`, rodar
   `python3 ../tools/check-hld.py outputs/spec/hld.md --json` e copiar os arrays `containers`,
   `decomposicao`, `integracoes`, `taticas` e `adrs` da saída para `tecnica.hld` — os nomes e a
   forma são os mesmos, não há remapeamento. Acrescentar, se quiser, `modo`, `resumo`,
   `taticasNota` e `adrsNota` (editoria do consultor). **Nunca** reparsear o `hld.md` à mão: o
   `--json` é o contrato. Sem `hld.md` (projeto anterior à Fase 6.6), **omitir `tecnica.hld`** —
   a seção «Arquitetura (HLD)» some inteira e o resto da aba Técnica continua igual.
5. **O que já existe em JSON entra por código, não à mão (Decisão 70).** O bloco `backlog`
   (árvore Epic › Feature › Story › Task e totais), os totais de backlog em `meta.totais`, os
   arrays de `tecnica.hld` e os números de `estimativa.forecast` e `estimativa.caminhoCritico`
   são montados pelo `cli.mjs --montar` a partir do `tasks.json`, da saída do `check-hld.py
   --json` e do `estimate-calc.json` do `forecast.mjs` (Etapa C). A IA escreve o resto — o
   texto de negócio, as notas, os cenários — e não transcreve esses blocos.
6. **Salvar em** `outputs/spec/estimate-report/report-data.json` (o caminho que o CLI descobre
   sozinho). Não gerar Markdown intermediário.

## Etapa C — Rodar o CLI

```bash
node cli.mjs
```

Descobre o `report-data.json`, injeta no shell e grava
`outputs/spec/estimate-report/spec-estimate-report.html`. Opções úteis:

```bash
node cli.mjs -i outputs/spec/estimate-report/report-data.json -o outputs/spec/estimate-report/spec-estimate-report.html
node cli.mjs --stdout > /tmp/preview.html   # inspeção
node cli.mjs --help
```

Montar por código os blocos que já existem em JSON (Decisão 70) — rodar **antes** de gerar o HTML
final. O `--montar` grava os blocos no `report-data.json` e preserva o texto que a IA escreveu —
fora dos blocos e dentro da árvore do backlog: cada épico, feature, história e task é casado pelo
ID com o que já estava no arquivo, e o campo que o `tasks.json` não preenche (Definição de pronto,
papéis, onda de rollout, casos de teste de negócio, enabler, fluxos, sistemas legados…) fica como
estava. Estrutura, títulos, esforço e totais vêm do `tasks.json`:

```bash
python3 ../tools/check-hld.py outputs/spec/hld.md --json > outputs/spec/estimate-report/hld.json
node cli.mjs -i outputs/spec/estimate-report/report-data.json \
  --tasks outputs/spec/tasks.json \
  --hld-json outputs/spec/estimate-report/hld.json \
  --estimate-calc outputs/spec/estimate/estimate-calc.json \
  --montar
```

Cada fonte é opcional: sem `hld.md`, omita `--hld-json`; sem `estimate-calc.json`, omita
`--estimate-calc`. Sem `--montar`, o `--tasks` só confere os totais (`META_TOTAIS_MATCH`).

Ordem de descoberta do input quando `-i` é omitido: `outputs/spec/estimate-report/report-data.json`
→ `outputs/spec/report-data.json` → `outputs/report-data.json` → variantes sob
`$PIPELINE_OUTPUTS_DIR`.

## Etapa D — Fechar

1. Conferir os `AVISO:` em `stderr` (aba ausente, `meta.projeto`/`meta.totais` faltando,
   `META_TOTAIS_MATCH`).
2. Avisar o usuário com o caminho do HTML gerado.
3. Registrar uma linha no `sync-log.md` (Seção A) com a geração do HTML e a data.

## Degradação limpa

- **Aba sem objeto** → não renderiza + `AVISO` no CLI (o menu ainda mostra o item — prefira preencher as 7).
- **Sem `tecnica.hld`** (ou com `containers` vazio) → a seção «Arquitetura (HLD)» some inteira, sem título nem âncora órfã. É o caso de todo projeto anterior à Fase 6.6.
- **Sem `meta.projeto`** → título/marca caem em fallback genérico (nunca vaza o nome de outro projeto).
- **Template defasado/errado** → o CLI **aborta com exit 1** pedindo a atualização do pacote de skills. Nenhum HTML truncado é gravado (guard de tamanho mínimo).

## Saída

| Arquivo | Papel |
|---------|-------|
| `outputs/spec/estimate-report/report-data.json` | Único artefato produzido pela IA (Etapa B) |
| `outputs/spec/estimate-report/spec-estimate-report.html` | HTML final montado pelo `cli.mjs` |

## Definição de pronto

A validade estrutural (input, JSON, template, placeholders, tamanho, abas) é dos **gates do
CLI** — validators abaixo. O agente confere além deles:

- [ ] `node cli.mjs` sem erro; nenhum `AVISO` de aba ausente que não seja intencional
- [ ] Números rastreáveis aos artefatos (`meta.totais` confere); nenhum campo `*Nota` com texto de outro projeto
- [ ] Linha adicionada ao `sync-log.md` registrando a geração

## Validators (verificados pelo `cli.mjs`)

| Código | Verificação | Ação |
|--------|-------------|------|
| `INPUT_FOUND` | `report-data.json` existe (descoberto ou via `-i`) | ausente → **exit 1** listando os caminhos procurados |
| `VALID_JSON` | input parseia e é objeto com `meta` | inválido → **exit 1** |
| `TEMPLATE_OK` | shell tem `__PAYLOAD__`, `__REPORT_TITLE__`, `__BRAND_NAME__`, `__BRAND_SUB__` e `id="payload"` | defasado → **exit 1** com instrução de atualizar o pacote |
| `NO_PLACEHOLDER_LEFT` | nenhum marcador sobrevive no HTML final | sobrou → **exit 1** |
| `MIN_SIZE` | HTML final ≥ 50 000 bytes (não truncado) | menor → **exit 1** |
| `PANE_PRESENT` | cada uma das 7 abas tem objeto | ausente → **AVISO** (não bloqueia) |
| `META_TOTAIS_MATCH` | com `--tasks`: `meta.totais` (epics, features, stories, tasks, enablers) bate com o `tasks.json` (Decisão 70) | diverge → **AVISO** (não bloqueia; entra como WARNING) |

## O que NÃO faz

- Não escreve HTML à mão nem edita `templates/report-shell.html` (shell congelado, versionado).
- Não altera os artefatos fonte — só lê e consolida; correções de conteúdo voltam às skills de
  origem.
- Não gera conteúdo de negócio novo — a síntese deve ser rastreável aos artefatos.
- Não substitui `spec-report` (kit de discovery em `.md→HTML`) nem `spec-estimate` (HTML só da
  estimativa); consolida a saída de todas as skills num relatório único.
- Não publica nem envia o HTML a lugar nenhum — só grava o arquivo local.

## Skills irmãs

| Skill | Papel na consolidação |
|-------|-----------------------|
| `spec-product` / `spec-ingest` | Aba Negócio (visão, dores, personas, domínios, módulos, regras, rollout) |
| `spec-hld` | Aba Técnica — seção «Arquitetura (HLD)»: containers, integrações, módulo → container, RNF → tática, ADRs |
| `spec-tech-rules` / `spec-data-model` / `spec-api-contracts` | Aba Técnica (rules, modelo de dados, contratos) |
| `spec-test-plan` | Aba Testes |
| `spec-security-review` | Aba Segurança (findings, camadas, pontos auditados) |
| `spec-iterate` / `spec-scope-change` | Aba Lacunas (gaps, conjuntos, decisões) |
| `spec-tasks` | Aba Backlog (Epic › Feature › Story › Task) |
| `spec-estimate` | Aba Estimativa (forecast, custos, caminho crítico, cenários) |

## Posição no fluxo

→ **Depois** de o pipeline ter gerado os artefatos (tipicamente após `spec-estimate`, a última
fase técnica). É opcional e não altera nada — só compila a entrega HTML consolidada, sempre que
o usuário precisar.
