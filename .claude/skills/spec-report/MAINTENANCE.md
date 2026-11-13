# spec-report — Guia de manutenção

> **Contexto de manutenção, não de execução.** Este arquivo só precisa ser lido ao **mexer
> no gerador (`tools/generate-report.py`), nos templates ou no `check-flowmap.py`** — nunca
> para gerar um relatório (o fluxo de execução vive no `SKILL.md`).

## Cenários de degradação a verificar

Ao mexer no gerador, nos templates ou no `check-flowmap.py`, verificar **estes sete
cenários** com fixtures temporárias (fora do repositório — `/tmp`, `%TEMP%`). Os três
primeiros foram exatamente os que passaram desapercebidos por harness cujos fixtures
tinham todos `flow-map.md` válido; os cenários 6 e 7 são o domínio Revisão, e estão
automatizados em `.claude/hooks/report-dominios.test.mjs` (harness Elo v2):

| # | Cenário | Como montar | Resultado esperado |
|---|---------|-------------|--------------------|
| 1 | **Com flow-map válido** | `outputs/spec/` com `flow-map.md` que passa no `check-flowmap.py` | exit **0**; domínios `visao, documentos, fluxos, …`; `default: visao`; Mermaid por fluxo |
| 2 | **Sem flow-map** | mesma pasta, **sem** `flow-map.md` | exit **0**; domínio `fluxos` ausente; **`default: visao`** (nunca `documentos`); capa + resumo executivo visíveis ao abrir; nenhum banner |
| 3 | **Flow-map inválido** | `flow-map.md` com erro de gramática (coluna faltando, `FLX-1`, referência quebrada) | exit **0**; domínio `fluxos` ausente; `default: visao`; **alerta vermelho `role="alert"`** listando os erros. Variante: renomear/remover o `check-flowmap.py` do diretório do gerador → **aviso amarelo `role="status"` com `TOOL_MISSING`**, e *nenhuma* menção a erro de gramática |
| 4 | **Template desatualizado** | `--templates-dir` para uma cópia do `report-shell.html` **antigo** (sem `data-shell-version="3.0"` / sem `DOMAINS-PLACEHOLDER`) | **exit 1**, nada gravado, `stderr` com «template do spec-report desatualizado/incompatível» + a lista de problemas + instrução de atualizar o pacote de skills |
| 5 | **Sem nome de projeto** | `outputs/spec/` sem `capa.md` e com `product-vision.md` ainda no título de template (`— [Nome do Projeto]`) | exit **0**; `AVISO: nome do projeto não encontrado …`; capa e `<title>` saem com **`Projeto sem nome definido`** — o fallback nunca é o token `[Nome do Projeto]`, senão a rede de segurança pós-substituição mataria o build |
| 6 | **Com `revisao.json`** | `outputs/spec/revisao.json` no contrato do `revisao.mjs` (`{versao, resumo, listas[]}`, as oito listas presentes, algumas vazias) | exit **0**; `Domínios: … revisao …`; `<section class="domain" data-domain="revisao">` com o capítulo `rev-resumo` (os três números do `resumo`) e **uma seção por lista não vazia** — lista vazia **não** vira seção. JSON ilegível → domínio omitido + `AVISO: revisao.json ilegível` no `stderr`, **sem** abortar |
| 7 | **Sem `revisao.json`** | mesma pasta, **sem** `revisao.json` | exit **0**; nenhum `data-domain="revisao"` no HTML e nenhum `revisao` na linha `Domínios:` — montagem por presença, como o domínio Fluxos sem flow-map |

Checagem rápida do HTML gerado nos cenários 1–3: `grep -c 'data-domain='` > 0 e
`grep -c -- '-PLACEHOLDER -->'` == 0 (a palavra `PLACEHOLDER` ainda aparece no comentário
de documentação herdado do shell — o que não pode sobrar é o **marcador** `<!-- …-PLACEHOLDER -->`).

## Contrato de versão única

`templates/report-shell.html` (`data-shell-version`), `templates/report-embedded.css`
(stamp `report-embedded vX.Y`), `tools/generate-report.py` (`REPORT_VERSION`) e a **nota de
layout** no topo do `SKILL.md` são versionados **em conjunto** — o `version` do frontmatter do
`SKILL.md` **não** entra nessa conta (parágrafo seguinte). Ao mudar o shell/CSS/gerador de forma
incompatível, subir a versão nos quatro lugares e atualizar o pacote de skills — o script aborta
com exit 1 quando encontra template defasado (gate `TEMPLATE_VERSION_MATCH`).

O `version` do frontmatter do `SKILL.md` é **outro contrato**: ele sobe a cada edição da skill,
e mudança **compatível** do gerador não move a `REPORT_VERSION`. Foi o caso do domínio Revisão e
do capítulo «Regras técnicas» (harness Elo v2, Plano 5, 2026-09-10): skill `3.1`, layout `3.0` —
shell e CSS não foram tocados, e o shell não conhece nomes de domínio, logo domínio novo montado
por presença não quebra template antigo.

## Gêmeo `generate-legacy-report.py` (kit AS-IS da spec-legacy)

O gerador do kit AS-IS importa `discover_templates_dir()`/`inspect_templates_dir()` deste
`generate-report.py` via `importlib` (gate `REPORT_TWIN_PRESENT`: os dois scripts precisam estar
no mesmo `<espelho>/tools/`; espelho incompleto → exit 1 com instrução de sync). Ele herda
`TEMPLATES_MIRROR_FOUND` e `TEMPLATE_VERSION_MATCH` com `require_shell=False` (monta o próprio
shell, só exige o `report-embedded.css`) e tem `MARKDOWN_AVAILABLE` próprio. `NO_PLACEHOLDER_LEFT`
e `EXCLUSIONS_RESPECTED` **não** se aplicam a ele. Ao mudar a descoberta/inspeção de templates
neste gerador, testar também o gêmeo.

## O que o gerador já implementa — saiu do SKILL.md

Saiu do `SKILL.md` na Onda 4 do plano de melhoria das skills do harness (2026-10-20): é o que o
`generate-report.py` já faz sozinho, e só serve a quem mexe no gerador — ou, no caso do fallback
manual, a quem precisa montar o HTML sem ele. O texto é o mesmo que estava lá.

### Em «Domínios do relatório (layout v3.0)»

O HTML é organizado em **domínios**: menu **superior fixo** com um item por domínio + **sidebar lateral contextual** que muda conforme o domínio ativo. Navegação por **hash routing** com JS vanilla embutido — `#dominio` ou `#dominio/ancora` (ex.: `#fluxos/FLX-001/TEL-003`); deep-link funciona ao abrir o arquivo direto com o hash. Cada domínio só é renderizado **se houver artefato** (montagem por presença):

| Domínio | Hash | Conteúdo (resumo — detalhe no docstring do `generate-report.py`) | Condição de presença |
|---------|------|----------|----------------------|
| **Visão Geral** | `#visao` | Resumo executivo automático + `capa.md` (quando preenchida) + painel de cobertura do flow-map + avisos | Sempre presente — e **sempre a landing** |
| **Documentos** | `#documentos` | Capítulos clássicos (pivot por módulo + tabela 1–14 abaixo), sidebar por grupos. `gaps.md`/`sync-log.md` saem daqui quando **Qualidade & GAPs** existe (sidebar aponta `#qualidade/q-gaps` / `#qualidade/q-sync`) | Qualquer capítulo presente |
| **Fluxos & Telas** | `#fluxos` | Por fluxo: cabeçalho + diagrama Mermaid gerado + etapas em cards; por tela (âncora `#fluxos/FLX-xxx/TEL-yyy`): rota, estados, RF/PR, chips de amarração, screenshot base64 ou placeholder; matriz estado×tela; painel de cobertura | `flow-map.md` existe **e** parseia (exit 0 do `check-flowmap.py`) |
| **Técnico** | `#tecnico` | Entidades de `data-model.json` (com chips «Telas»), SVGs de ER, referência a `api-contracts.yaml` (sem parsear YAML), índice reverso endpoint→telas com órfãos/entidades sem tela; capítulo «Regras técnicas» a partir de `tech-rules/tech-rules-summary.md` (os `.mdc` não entram) | `data-model.json` e/ou SVG em outputs/spec, ou `tech-rules/tech-rules-summary.md` |
| **Revisão** | `#revisao` | O que a revisão automática do harness (`revisao.json`, emitida por `node .claude/hooks/revisao.mjs --json`) encontrou ao cruzar os documentos do pré-projeto: resumo e uma seção por lista **não vazia** | `outputs/spec/revisao.json` existe e é JSON legível |
| **Qualidade & GAPs** | `#qualidade` | `gaps.md` + `sync-log.md` (âncoras `q-gaps`/`q-sync`) — **dono único** desses dois arquivos no kit | Algum dos dois existe |

**Insumos:** `outputs/spec/flow-map.md` (dados **exclusivamente** via `tools/check-flowmap.py --json` por subprocess, nunca reparseando o .md), `outputs/spec/screens/<TEL-ID>.png` e `screens-manifest.json` (opcional). Com `data-model.json`/`api-contracts.yaml`, o subprocess recebe `--data-model`/`--contracts` — habilita «% telas com amarração», endpoints órfãos e entidades sem tela.

Mermaid é carregado via CDN (padrão já usado no kit) e renderizado sob demanda quando o domínio fica visível; sem rede (ou com erro de sintaxe no diagrama), a Promise do `mermaid.run()` é tratada e o diagrama degrada para o **texto-fonte escapado** — o fonte nunca é injetado como HTML cru. Todo o resto (CSS, screenshots dentro do cap, SVG com ids prefixados) é embutido — um único arquivo, sem servidor.

### Em «Estrutura do Documento»

### 0 — Especificação por Módulo (grupo condicional, antes dos capítulos de documentos completos)

O script monta um **capítulo-pivot** (`chapter-modules`, título "Especificação por Módulo") **antes** de percorrer a lista de arquivos completos — só aparece se `requirements/requirements.md` ou `product-requirements/product-requirements.md` tiverem pelo menos uma seção `## Módulo:`. Para cada código `MOD-XXX` encontrado, o script agrega na mesma seção do HTML:

| Bloco do módulo | Fonte | Contrato de heading exigido |
|---|---|---|
| Requisitos Funcionais | `requirements/requirements.md` | `## Módulo: <Nome> (MOD-XXX)` — código entre parênteses, com ou sem crase |
| Requisitos de UX | `product-requirements/product-requirements.md` | mesmo contrato |
| Regras de Negócio | `business-rules.md` | heading `### RN-…`/`#### RN-…` com linha `| **Módulo** | MOD-XXX |` na tabela |
| GAPs | `gaps.md` | heading `### GAP-XXX` contendo `MOD-XXX` em qualquer campo do bloco |

Nav lateral: grupo **"Especificação por módulo"** com link "Visão geral" (`#chapter-modules`) + um link por `MOD-XXX` encontrado. Se nenhum módulo for encontrado, o grupo inteiro (título + capítulo) é omitido — sem link órfão.

### 1-14 — Documentos completos

| Ordem | Capítulo no HTML | Anchor | Arquivo(s) | Grupo no índice lateral |
|------:|------------------|--------|-------------|------------------------|
| 1 | Capa & Sumário | `chapter-cover` | `capa.md` | Abertura |
| 2 | Visão de Produto | `chapter-vision` | `product-vision/product-vision.md` | Documentos completos |
| 3 | Regras de Negócio | `chapter-rules` | `business-rules.md` | Documentos completos |
| 4 | Requisitos do Sistema (RF/RNF por módulo) | `chapter-requirements` | `requirements/requirements.md` | Documentos completos |
| 5 | Requisitos de UX (PR por módulo) | `chapter-ux` | `product-requirements/product-requirements.md` | Documentos completos |
| 6 | Benchmark | `chapter-benchmark` | `benchmark.md` | Mercado |
| 7 | Legado AS-IS | `chapter-legacy` | `legacy.md` *(ou «skipped»; + `domains/*.md` só se existirem)* | Legado AS-IS |
| 8 | Arquitetura AS-IS | `chapter-architecture` | `architecture.md` *(só se existir — kickoff com legado Sim/Parcial)* | Legado AS-IS |
| 9 | Análise de Legado | `chapter-analysis` | `legacy-analysis.md` *(só se existir)* | Legado AS-IS |
| 10 | Modelo de Ameaças | `chapter-threats` | `threat-model.md` *(só se existir)* | Legado AS-IS |
| 11 | Gaps e Respostas | `chapter-gaps` | `gaps.md` *(renderizado no domínio **Qualidade & GAPs** como `q-gaps` quando esse domínio existe — o que é o caso sempre que `gaps.md` existe; a sidebar de Documentos linka `#qualidade/q-gaps`)* | Governança |
| 12 | Log de Sincronização | `chapter-sync` | `sync-log.md` *(idem — `#qualidade/q-sync`)* | Governança |
| 13 | Descoberta | `chapter-discovery` | `discovery-document.md` | Contexto bruto |
| 14 | Mapa de Contexto | `chapter-context` | `context-map.md` *(tabelas longas dobradas no HTML por `generate-report.py`)* | Contexto bruto |

Arquivos **`architecture.md`**, **`legacy-analysis.md`**, **`threat-model.md`** só entram no kit quando existirem (kickoff com legado **Sim/Parcial**). Se não existirem, omitir capítulos e links órfãos no índice.

### Em «Fallback manual (só se o script não rodar)»

Só seguir estes passos se `generate-report.py` falhar e não houver tempo hábil para corrigir o script. Marcar o HTML resultante com `⚠️ REPORT-MANUAL` no rodapé (`kit-footer-note`) e registrar o motivo no `sync-log.md`.

1. Converter cada `.md` da tabela de capítulos para HTML semântico (`h1`–`h4`, `p`, `ul`/`ol`, `table`, `pre`/`code`, `blockquote`); Mermaid vira `pre.language-mermaid` ou nota *«ver arquivo fonte»*.
2. Dar `id` único a cada `<article class="chapter">`, igual aos anchors da tabela de capítulos (`chapter-cover`, `chapter-vision`, …).
3. Montar dentro de [`templates/report-shell.html`](templates/report-shell.html), injetando o CSS de [`templates/report-embedded.css`](templates/report-embedded.css) em `<style>` no `<head>` — sem CSS externo.
4. Reproduzir o índice lateral (`nav-rail`), incluindo o grupo "Especificação por módulo" se houver `## Módulo:` em `requirements.md`/`product-requirements.md`.
5. Garantir `overflow-x: auto` em tabelas largas e `@media print` escondendo a navegação lateral.
6. Salvar em `outputs/spec/report/product-discovery-kit.html`, adicionar `⚠️ REPORT-MANUAL` no rodapé e registrar no `sync-log.md`.
