# Histórico — spec-estimate-report

## 1.3 (2026-10-20) — harness-elo-v2, bifurcação nossa

O exemplo/golden e a documentação citavam o nome do cliente do projeto de referência. Primeiro o
nome foi trocado por «Exemplo» em `report-data.schema.md`, `SKILL.md`, neste histórico e no
exemplo. Não bastou: o conteúdo do exemplo continuava o do projeto real e identificável (locais,
sistemas, integrações, títulos e regras do backlog). **O exemplo foi substituído por um projeto
fictício**, «Exemplo — Portal de Pedidos» (autoatendimento de pedidos de uma distribuidora de
material de escritório), gerado por script, sem nenhum texto, ID ou nome do payload antigo.

- **Exemplo sintético.** De 1,4 MB (minificado) para ~220 KB (indentado, para leitura por trecho):
  4 épicos, 7 features, 15 histórias, 34 tasks. Tem toda chave e todo tipo do payload antigo
  (conferido por script) e tudo que o schema e o shell leem — inclusive `tecnica.hld`, que o antigo
  não tinha. É coerente: `meta.totais` e `backlog.totais` batem com a árvore, o esforço soma de baixo
  para cima, cada achado de segurança injetado tem a task SEC na história afetada, e o caminho
  crítico, os gargalos e o esforço por épico citam IDs que existem. Duas formas foram acertadas com o
  schema e o shell: `regrasNegocio[]` é `{id, texto}` (no antigo era string, e a aba Backlog mostrava
  bullet vazio nas 259 histórias) e `dataModel.enums[].valores[]` é string (no antigo era
  `{value, label}`, e a tag mostrava `[object Object]`). Saíram `_avisos` (fora do schema) e as
  chaves de `dependenciasGlobais` com nome de sistema do cliente. `STORY-001` usa os IDs do
  `tasks.hierarchy-example.json` da `spec-tasks`, para o `--montar` poder ser provado com ele.
  Renderizado em navegador: 7 abas, nenhum erro de console, nenhum `undefined`/`NaN`/`[object Object]`.
- **`--montar` preserva o texto da IA dentro da árvore do backlog.** Antes, trocava a árvore inteira
  pela montada do `tasks.json`, e o que o `tasks.json` não tem saía vazio — no exemplo antigo, 248
  de 259 histórias perdiam a Definição de pronto. Agora `montarReportData` casa cada épico, feature,
  história e task pelo ID (no mesmo nível) com o nó que já estava no `report-data.json` e herda dele
  o campo que saiu vazio (Definição de pronto, papéis, onda, casos de teste de negócio, enabler,
  fluxos, sistemas legados, testes RED/GREEN…); o contador acompanha o array herdado. Estrutura,
  títulos, esforço e totais continuam vindo do `tasks.json`; nó que saiu do `tasks.json` some.
- **Regra de negócio montada como `{id, texto}`**, a forma do schema — o `montarStory` gerava string.
- **`storiesNegocio` conta só USER_STORY.** SPIKE, TECHNICAL_DEBT e BUG entravam como «negócio» na
  faixa da aba Backlog; continuam na árvore, fora das três categorias.
- **Testes:** o caso do `<title>` lê o título do próprio exemplo, e a guarda «o fallback nunca vaza
  nome de outro projeto» lê o nome do exemplo em vez de fixá-lo. O limiar fixo de 500 000 bytes (que
  só valia para o payload de 1,4 MB) virou «shell + payload inteiro», e o payload tem de voltar
  idêntico do HTML. A guarda «a golden fixture não tem `tecnica.hld`» virou «o exemplo cobre
  `tecnica.hld` e continua válido sem ele». Caso novo: o exemplo é pequeno e coerente (totais,
  esforço, referências entre abas, regra como `{id, texto}`). 11 casos, 11 verdes. No agregador
  (`.claude/hooks/estimate-report-agregador.test.mjs`): preservação por ID no `--montar` (unidade e
  CLI), regra `{id, texto}`, `storiesNegocio`, e a comparação de formato passa a olhar também o
  item dos arrays.
- **Agregador determinístico (Decisão 70 do harness, Onda 5 do plano de melhoria das skills).** O
  que já existe em JSON deixa de ser transcrito pela IA: `lib/aggregate.mjs` monta o bloco
  `backlog` e os totais de backlog de `meta.totais` a partir do `tasks.json`, copia os arrays de
  `tecnica.hld` da saída do `check-hld.py --json` e tira os números de `estimativa.forecast` e
  `estimativa.caminhoCritico` do `estimate-calc.json` do `forecast.mjs`. O `cli.mjs` ganha
  `--tasks`, `--hld-json`, `--estimate-calc` e `--montar` (grava os blocos no `report-data.json` e
  preserva o texto da IA). Novo validator `META_TOTAIS_MATCH`, como **AVISO**: com `--tasks`, os
  totais de `meta.totais` têm de bater com o `tasks.json`. O formato de cada nó montado é conferido
  campo por campo contra o exemplo em `.claude/hooks/estimate-report-agregador.test.mjs`. Shell e
  engine não mudaram.
- **`caminhoCritico.gargalos` montado, e campo obrigatório ausente avisa (D59, teste ponta a ponta
  de 2026-10-21).** O `--montar` montava `caminhoCritico` sem `gargalos`, o shell lê
  `E.caminhoCritico.gargalos.length` sem guarda, e a aba Estimativa lançava TypeError ao abrir — com
  o CLI em exit 0 e nenhum AVISO. Agora `montarForecast` monta `gargalos` dos `gargalos` do
  `estimate-calc.json` (forma do schema `{id, nome, score, porque, acao}`: score do cálculo, nome do
  `tasks.json`, `porque`/`acao` herdados pelo ID do que a IA escreveu); `estimate-calc.json` sem
  `gargalos` não mexe no que estava lá. E `lib/load-data.mjs` confere os caminhos que a aba
  Estimativa lê sem guarda (`OBRIGATORIOS_ESTIMATIVA`): o que falta vira `AVISO: CAMPO_OBRIGATORIO`
  e entra vazio no dado que vai para o HTML (o `report-data.json` no disco não muda). O shell
  continua congelado. Testes em `.claude/hooks/estimate-report-agregador.test.mjs` (D59).

## 1.2 (2026-08-25)

Aba Técnica ganha a seção **«Arquitetura (HLD)»**, no topo, alimentada pelo `hld.md` da nova
`spec-hld` (Fase 5.6). Mudança de **manutenção** do shell: o «congelado» vale em tempo de execução
(a IA nunca edita o shell ao gerar um relatório), não impede evoluir a engine com schema, SKILL,
histórico e testes atualizados no mesmo passo.

- **Engine:** `hldSection()` monta a seção e `hldDiagram()` desenha o C4 nível 2 em **SVG no
  cliente**, no mesmo padrão dos gráficos existentes — containers dentro da fronteira do sistema,
  sistemas externos à direita, uma aresta por integração (traço cheio = síncrono, tracejado =
  assíncrono). Nada de CDN: o shell não carrega recurso externo, então Mermaid não renderiza aqui.
- **Payload:** novo bloco **opcional** `tecnica.hld` (`containers[]`, `decomposicao[]`,
  `integracoes[]`, `taticas[]`, `adrs[]` + `modo`, `resumo`, `taticasNota`, `adrsNota`). Os cinco
  arrays saem com o mesmo nome e a mesma forma do `check-hld.py --json` — a IA copia, não remapeia.
- **Degradação:** sem `tecnica.hld` (ou com `containers` vazio) a seção some inteira, sem título
  nem host órfão. É o caso de todo projeto anterior à Fase 5.6 — inclusive a golden fixture, que
  **não foi regenerada**.
- **Testes:** 4 casos novos em `tests/regression.test.mjs` — presença do código no shell e ausência
  de recurso externo, ida e volta do bloco pelo payload, degradação sem `tecnica.hld`, e a golden
  fixture intacta. O render foi conferido em navegador com payload sintético: 5 containers, 4
  sistemas externos, 5 arestas, nenhum texto estourando a caixa, sem erro de console.
- **Validadores do CLI** (`TEMPLATE_OK`, `NO_PLACEHOLDER_LEFT`, `MIN_SIZE`) continuam passando sem
  marcador novo — a seção é dado, não placeholder.

## 1.0 (2026-08-13)

Skill inicial. Congela o relatório HTML consolidado de referência (projeto real de cliente; desde 1.3 o exemplo é fictício) como
**shell + CSS + engine de render** em `templates/report-shell.html` e passa a gerá-lo por CLI a
partir de um `report-data.json`.

- **Arquitetura:** `cli.mjs` injeta o payload JSON no `<script id="payload">` do shell congelado
  (escaping script-safe `<` → `<`) e preenche `__REPORT_TITLE__ / __BRAND_NAME__ /
  __BRAND_SUB__`. A IA produz só o JSON; a engine (client-side) desenha as 7 abas.
- **Parametrização:** todos os literais específicos do projeto de referência foram removidos da engine —
  contagens de heading viraram derivadas dos arrays (`rules.length`, `findings.length`, …) e as
  notas editoriais viraram campos opcionais do payload (`*Nota`, aceitando HTML inline). Nenhum
  texto de projeto sobra no template.
- **Libs:** `lib/load-data.mjs` (parse + validação leve + avisos de aba ausente),
  `lib/build-html.mjs` (injeção + guards de template/placeholder/tamanho), `lib/escape.mjs`.
- **Exemplo/golden:** `templates/report-data.example.json` era o payload real do projeto de referência (até 1.3),
  enriquecido com os campos `*Nota` para reproduzir o relatório original; roda idêntico pelo CLI.
- **Verificação:** as 7 abas renderizam sem erro de console; contagens dinâmicas conferidas em
  navegador (35 decisões, 12 regras técnicas, 42 achados, 14 pontos, 8 jornadas, 10 camadas).
