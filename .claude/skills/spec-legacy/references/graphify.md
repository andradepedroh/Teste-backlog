# spec-legacy — Graphify: o grafo de conhecimento (Passos 0.5 e 0.6)

> Lido no Modo Digital ou Híbrido com código em `inputs/`, antes de rodar o Graphify. Não se aplica
> ao Modo Processo-Manual nem ao skip.

### 0.5.1 — Instalar o Graphify automaticamente (não pedir permissão para instalar)

```bash
graphify --version 2>/dev/null || uv tool install graphifyy || pipx install graphifyy
# se o binário não aparecer no PATH após instalar:
export PATH="$HOME/.local/bin:$PATH"
uv tool update-shell 2>/dev/null || true
hash -r; graphify --version
```

Instalar é o comportamento padrão — **só** tratar como indisponível se a instalação for **realmente impossível** (sem rede, sem permissão) depois destas tentativas. A extração AST roda **localmente**; a etapa semântica usa o modelo do próprio assistente.

### 0.5.2 — Montar o staging da fonte (acelera e evita dupla contagem)

Não aponte o Graphify para `inputs/` cru se ele contiver libs/binários/duplicatas. Monte um **staging só com código-fonte de negócio**, de preferência em disco local rápido (o mount de origem pode ser lento):

```bash
SRC=outputs/spec/.graph-src            # staging local rápido
rm -rf "$SRC"; mkdir -p "$SRC"
# copiar só fontes; excluir libs/artefatos/duplicatas
rsync -a --prune-empty-dirs \
  --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude 'build' \
  --exclude 'target' --exclude 'bin' --exclude 'obj' --exclude 'out' \
  --exclude 'vendor' --exclude '*.jar' --exclude '*.class' --exclude '*.dll' \
  --exclude '*.min.js' --exclude '*.map' --exclude 'coverage' --exclude '__pycache__' \
  inputs/ "$SRC/"
```

Ajustar os excludes à stack real. Registrar no research log o que foi incluído/excluído do staging (é uma decisão de escopo consciente).

### 0.5.3 — Execução RESILIENTE (o modo padrão neste ambiente)

Este sandbox tem **timeout curto por comando** e **processos em background NÃO sobrevivem** entre chamadas. Portanto o modo padrão é um **loop idempotente** que aproveita o cache de AST por arquivo do Graphify (`--update`, hashes SHA256): rodar → checar `graph.json` → se incompleto, rodar de novo. Cada reexecução só reprocessa o que faltou; nunca começa do zero.

```bash
# rodar a partir de outputs/spec/ para o grafo cair em outputs/spec/graphify-out/
# (query/path/explain leem graphify-out/graph.json por padrão)
cd outputs/spec
GRAPHIFY_MAX_OUTPUT_TOKENS=32768 graphify .graph-src --mode deep --update
```

Repetir o **mesmo comando** em janelas sucessivas até o `graph.json` existir e ser não-trivial. Como `--update` é incremental e cacheado, reexecutar é barato e converge — o objetivo é 100% dos arquivos do staging em cache e o `graph.json` escrito. **Não** iniciar o Graphify em background e seguir; **não** avançar enquanto o loop não terminar. Ao terminar, **voltar à raiz do projeto** (`cd ../..`) — os comandos de validação (0.5.4, Passo 9) assumem cwd na raiz.

> Caminho de saída: por padrão o Graphify grava `graphify-out/` no diretório atual e os comandos `query`/`path`/`explain` leem `graphify-out/graph.json` do diretório atual. Rodar a partir de `outputs/spec/` mantém a saída em `outputs/spec/graphify-out/` (compatível com o kit HTML e o validador). Para consultar um grafo em outro caminho, use `graphify query "..." --graph <caminho>/graph.json`.

### 0.5.4 — GATE DE CONCLUSÃO EXPLÍCITO (`GRAPH_COMPLETED`)

O grafo só está **pronto** quando `outputs/spec/graphify-out/graph.json` **existe** E é **não-trivial** (`nós > 0` **e** `arestas > 0`). Verificar de forma programática e **parar aqui** até passar:

```bash
python3 ../tools/check-legacy-business.py --graph-only outputs/spec/graphify-out/graph.json
# saída: GRAPH_COMPLETED OK (nós=..., arestas=...)  → liberado
#        GRAPH_COMPLETED FALHOU                      → repetir 0.5.3
```

Grafo vazio, truncado (extração cortada por tokens — reforçar `GRAPHIFY_MAX_OUTPUT_TOKENS`) ou ausente **bloqueia** a Fase A. `GRAPH_COMPLETED` é FATAL: sem ele, não escrever artefato, não registrar no sync-log, não recomendar próxima skill.

### 0.5.5 — Dois grafos (granularidade por uso) — gate por tamanho

Contar os arquivos do staging antes de decidir o custo:

| Tamanho do staging | O que gerar |
|--------------------|-------------|
| **< ~150 arquivos** (legado pequeno) | Só o grafo de deep (0.5.3) basta; **pular** reclustering fino — não pagar custo desnecessário |
| **≥ ~150 arquivos** | Gerar **os dois**: (a) grafo **file/classe-level** para o business-map e o kit HTML; (b) o **deep método-level** (0.5.3) guardado para estimativa/migração |

O grafo **(b) deep método-level** é o de 0.5.3 (`--mode deep`) — rico em relações, é a fonte para o Passo 0.6, para `spec-estimate` e para a migração.

O grafo **(a) file/classe-level** é uma visão **reclusterizada e mais grossa**, usada no `business-map.json` (fronteiras de `BM`/`DOM`) e **embutida no kit HTML** (deve renderizar bem — alvo **< 5.000 nós** na visualização embutida):

```bash
cd outputs/spec
graphify .graph-src --cluster-only --resolution 1.5   # reclusteriza em comunidades p/ descobrir BM/DOM (visão file/classe-level)
```

O `generate-legacy-report.py` (Passo 8) **deriva automaticamente** a visualização file-level reduzida a partir do `graph.json` (agrega por `source_file`) e a embute; o grafo completo é apenas **linkado** à parte (nunca embutido inteiro). Ver Passo 8.

### 0.5.6 — Fallback SÓ se o CLI for genuinamente indisponível

Se — e **somente se** — após as tentativas reais de instalação (0.5.1) e execução resiliente (0.5.3) o CLI permanecer indisponível (sem rede/permissão), **parar e perguntar ao consultor**: (a) resolver a instalação/execução e repetir, ou (b) autorizar seguir sem grafo, ciente de que a análise perde o motor de descoberta. **Nunca** seguir em silêncio sem grafo. Registrar a decisão (e a linha aplicada) no `sync-log.md` e, se (b), abrir `PENDÊNCIA:` em «Questões em aberto» («grafo do legado não gerado — CLI indisponível, autorizado por <consultor>»). Só nesse caso o `GRAPH_COMPLETED` é dispensado, com registro explícito.

**Papel no fluxo de negócio (usar nos Passos 0.6, A, B, 1 e 2):**

| Objetivo de negócio | Consulta ao grafo | Alimenta |
|---------------------|-------------------|----------|
| Descobrir fronteiras de capacidade | comunidades detectadas no `graph.json` (clusters de nós fortemente ligados) | candidatos a `BM-xxx` (Passo B) |
| Achar a entidade central de uma capacidade | `graphify query "o que lê/escreve na tabela/entidade X?"` | `primary_entities` e `entity_rule_crosswalk` |
| Localizar onde uma política vive | `graphify explain "<validar/calcular/aprovar...>"` | `business_rule_clusters` (BRC) e `RN-xxx` |
| Traçar a cadeia ação→serviço→persistência | `graphify path "<controller/action>" "<tabela/serviço>"` | cadeias da Fase A (Passo A) e `PROC-xxx` |
| Medir acoplamento entre capacidades | `graphify path BM_a BM_b` + grau de conexões dos nós | `overlaps_with`, `relationships` e o fator Acoplamento (Passo 5) |
| Confirmar cobertura de código | nós/arquivos (`source_file`) sem MOD/comunidade atribuída | `code_modules` faltantes + `graph_coverage` (Passo 0.6) |

**Regra de leitura do grafo para negócio:** comunidade do grafo é **hipótese** de fronteira, não verdade — sempre renomear para o **vocabulário do cliente** e confirmar com evidência (`F-xxx` ou arquivo). Aresta `EXTRACTED` = fato direto (nível `F-xxx`); `INFERRED` = inferência (nível `INF-xxx`), nunca apresentada como certeza.

**Confiança da aresta → rastreabilidade:** ao citar o grafo como evidência técnica numa dimensão, tratar `EXTRACTED` como fato direto (nível `F-xxx`) e `INFERRED` como inferência (nível `INF-xxx`).

**Segurança (Camada H da `security.md`):** o Graphify processa AST **localmente** e grava apenas em `graphify-out/`. Não enviar `graph.json` nem trechos de código a LLMs de terceiros sem DPA; não commitar `graphify-out/` se contiver segredos embutidos no código-fonte.

## Passo 0.6 — Mineração do grafo (obrigatório — o que grep/DDL NÃO dão)

**Quando executar:** logo após `GRAPH_COMPLETED` (0.5.4) e **antes** da Fase A. Idealmente delegado a **um subagente dedicado** ("mineração do grafo"), que devolve só contagens + caminho do fragmento — não o JSON inteiro. **Pular** apenas em Processo-Manual/skip ou no fallback autorizado 0.5.6 (registrar N/A).

**Por quê:** existir grafo não basta — o valor vem de **minerar** o grafo com `query`/`path`/`explain` e com métricas de topologia. Estes achados não saem de grep nem de DDL. Grave **tudo** no `legacy-research-log.md` (trilha legível) **e** no bloco `graph_findings` do `business-map.json` (estruturado — esquema em `templates/business-map.md`).

| Achado | Como obter | Grava em `graph_findings` | Uso downstream |
|--------|-----------|---------------------------|----------------|
| **God classes / God-DAOs** | nós de **maior grau** (in+out) no `graph.json` | `god_classes[]` (`node`, `file`, `degree`, `why`) | Dim 12 · complexidade (dívida) · Replace |
| **Seams de migração (Strangler Fig)** | nós de **corte / alta intermediação** (betweenness / articulation points) | `migration_seams[]` (`node`, `file`, `seam_rationale`) | `legacy-analysis` (pontos de costura) · estratégia de migração |
| **Ciclos de dependência** | ciclos dirigidos no grafo (`imports`/`calls` circulares) | `dependency_cycles[]` (`members[]`, `impact`) | Dim 12 · `migration_blockers` |
| **Código morto candidato a Retire** | nós/arquivos **órfãos** (grau 0 ou sem caminho para entradas) | `orphan_files[]` (`file`, `evidence`) | Reuse/Replace/**Retire** |
| **Crosswalk entidade × regra × módulo** | `graphify query "o que lê/escreve na tabela X?"` + `graphify explain "<validar/calcular/aprovar>"` | alimenta `cross_cutting_views.entity_rule_crosswalk` | Passo B.3 · `RN-xxx` |
| **Cadeias de execução ponta-a-ponta** | `graphify path "<action>" "<tabela/serviço>"` por capacidade | `capability_chains[]` (`capability`, `path[]`) | Fase A (A.3) · `PROC-xxx` |
| **Comunidades → BM (nomeação por hub)** | comunidades do `--cluster-only`; se **sem backend de LLM** ficam **sem nome** | `communities[]` (`community_id`, `hub_nodes[]`, `suggested_name`, `mapped_bm_id`) | Passo B.2 (candidatos a `BM`) |
| **Cobertura de arquivos** | lista de `source_file` do `graph.json` × `root_paths` dos `MOD` | `graph_coverage` (`total_files`, `files_without_domain[]`) | Passo 1 (pontos cegos) |

**Comunidades sem nome (sem LLM):** detectar quando o Graphify não nomeou as comunidades (etapa semântica ausente) e **cair na nomeação por hub** — nomear cada top comunidade a partir dos seus nós-hub e **mapear comunidade → BM** explicitamente em `communities[].mapped_bm_id`. Este mapeamento é passo obrigatório e é checado no Passo 9.

**Cobertura como ponto cego:** usar a lista de `source_file` do grafo como **checagem de cobertura** — todo arquivo de negócio deve cair sob algum `MOD` (e portanto algum `BM`/`DOM`). Os que não caírem entram em `graph_coverage.files_without_domain[]` e viram ponto cego declarado (não silêncio). O `check-legacy-business.py --graph` valida isso (Passo 9).

**Anti-padrão explícito a evitar:** produzir os catálogos só com DDL + documentação + `grep`, sem citar uma única consulta ao grafo. As `relationships[].coupling_level` e parte dos `evidence[]`/`notes` devem citar o grafo (grau, `path`, `query`, `explain`, comunidade) — o validador exige isso (Passo 9).
