# spec-legacy — sinais determinísticos (Passo 0.7)

> Lido no Modo Digital ou Híbrido com código, logo após a mineração do grafo (Passo 0.6) e antes da
> Fase A.

## Passo 0.7 — Sinais determinísticos (enriquecimento — gate WARNING `SIGNALS_COLLECTED`)

**Quando executar:** Modo **Digital/Híbrido** com código, logo após a mineração do grafo (Passo 0.6) e **antes** da Fase A. **Pular** em Processo-Manual/skip — registrar «sinais N/A — sem código» no sync-log.

**Por quê:** a filosofia da skill é alimentar o modelo com **sinais medidos** em vez de impressões. LOC, complexidade ciclomática por função, churn, código morto e violações de camadas são fatos verificáveis por ferramenta determinística — o modelo **interpreta** os números; não os estima de cabeça.

> **Este passo é ENRIQUECIMENTO, não gate bloqueante.** Para cada ferramenta: **verificar → rota efêmera → degradar** — verificar disponibilidade (`<tool> --version`); ausente, usar a **rota efêmera** da tabela de [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md) (`npx`/`uvx`/`pipx run`/container — executa sem instalar, não muta o ambiente, dispensa aprovação e registra `TOOL_EPHEMERAL:<nome>`). Instalação que muta o ambiente é **apenas oferecida** ao usuário, com o comando exato à vista, e só roda com aprovação registrada (`TOOL_INSTALLED:<nome> (aprovado por <quem>, <comando>)`). Sem rota efêmera (ou ela falhou), a ferramenta é tratada como indisponível: `⚠️ WARNING` e linha `TOOL_UNAVAILABLE:<nome> (motivo curto)` no sync-log — a análise **segue** via leitura/LLM, com os valores correspondentes marcados `[estimado — ferramenta indisponível]`. **Nunca** parar a fase por causa deste passo.

Criar `outputs/spec/signals/` e coletar (toda saída salva lá). Comandos rodam da raiz do projeto;
caminhos `../tools/…` são relativos à pasta desta skill (ver [`../tools/references/paths.md`](../tools/references/paths.md)),
válidos em qualquer espelho (`skills/`, `.cursor/skills/`, `.claude/skills/`, `plugin/skills/`):

| # | Sinal | Como obter a ferramenta (verificar → rota efêmera → degradar; ver [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md)) | Comando (saída em `outputs/spec/signals/`) | Alimenta |
|---|-------|------------|---------------------------------------------|----------|
| 1 | Volume, complexidade por linguagem, COCOMO | binário Go — https://github.com/boyter/scc | `scc <staging> --format json > outputs/spec/signals/scc.json` | eixo **tecnologia** do scorecard (Passo 5); **repassado ao `spec-estimate`** |
| 2 | Complexidade ciclomática **por função** | `lizard --version`; ausente → rota efêmera `uvx lizard …` / `pipx run lizard …` | `lizard <staging> -l auto --csv > outputs/spec/signals/lizard.csv` — identificar funções **CC > 15** (dívida) e **CC > 50** (crítico) | Dim 12 · `top_complexity_drivers` |
| 3 | Hotspots churn × complexidade | já incluso (Python stdlib) | `python3 ../tools/hotspots.py <repo-git> --scc outputs/spec/signals/scc.json --json > outputs/spec/signals/hotspots.json` (exit 2 se não houver `.git` — registrar «churn N/A») | priorização **Reuse/Replace/Retire** pelo comportamento real: o que muda muito **e** é complexo |
| 4 | Candidatos a regra de negócio com **arquivo:linha** | `ast-grep --version` (ou `sg --version`); ausente → rota efêmera `npx --yes -p @ast-grep/cli ast-grep scan …` | `sg scan --config ../tools/ast-grep-rules/sgconfig.yml --json <staging> > outputs/spec/signals/rules-candidates.json` — usar o `sgconfig.yml` **versionado junto ao catálogo** (12 regras; ver o [README do catálogo](../tools/ast-grep-rules/README.md)) | Dimensão 8: o modelo interpreta cada achado e **redige as `RN-xxx` citando a evidência** |
| 5 | Código morto JS/TS | via npx (npm) | `npx knip --reporter json > outputs/spec/signals/knip.json` | evidência objetiva para **Retire** |
| 6 | Código/dependências mortas Python | `vulture --version` / `deptry --version`; ausentes → rota efêmera `uvx vulture …` · `uvx deptry …` | `vulture <src> > outputs/spec/signals/vulture.txt` · `deptry <raiz> -o outputs/spec/signals/deptry.json` | evidência objetiva para **Retire** |
| 7 | Schema real do banco | `tbls version`; ausente → rota efêmera por container `docker run --rm ghcr.io/k1low/tbls …` (instalação permanente só com «sim» explícito — ver [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md)) | `tbls doc <dsn> outputs/spec/signals/db-schema/` — **só quando houver acesso ao banco**; sem acesso, registrar «tbls N/A — sem DSN» (não é TOOL_UNAVAILABLE) | dimensão de dados do AS-IS (Passo 3.5) a partir do schema **REAL**, não do imaginado |
| 8 | Violações de camadas JS/TS | via npx (dependency-cruiser) | `npx depcruise --validate -T json <src> > outputs/spec/signals/depcruise.json` | violações de camadas **quantificadas** no `architecture.md` |
| 9 | Schema **declarado** a partir de arquivos DDL (sem banco de pé) | já incluso (Python stdlib) | `python3 ../tools/extract-ddl-schema.py <pasta-com-ddl> --out outputs/spec/signals/ddl-schema.json --csv outputs/spec/signals/ddl-fks.csv` | tabelas, chaves primárias e estrangeiras, índices e **tabelas sem chave primária**; alimenta a dimensão de dados e o `data-model.json` da Fase 7a |

Rodar apenas as linhas aplicáveis à stack (knip/depcruise só em JS/TS; vulture/deptry só em Python) — as demais registrar «N/A — stack».

**Sinal 7 contra sinal 9 — quando usar cada um.** O `tbls` (7) lê o banco **rodando** e mostra o que
existe de fato, inclusive o que foi criado fora do DDL versionado. O `extract-ddl-schema` (9) lê os
**arquivos** e mostra o que o projeto **declara**. Legado antigo quase sempre chega como pasta de DDL
sem banco nenhum para conectar — nesse caso o 9 é a única fonte de schema, e sem ele a skill cai no
anti-padrão de inventar a dimensão de dados. Havendo os dois, a **divergência entre eles é achado**:
tabela que existe no banco e o DDL não declara, ou chave declarada que o banco não tem.

> **Por que este sinal existe.** Extrator de DDL improvisado erra sempre do mesmo jeito: casa a
> cláusula `references` por conta própria e conta duas vezes o mesmo comando
> `alter table … foreign key (…) references … (…)`. O número sai inflado e ninguém percebe, porque
> continua parecendo uma contagem de chave estrangeira. O script lê **por comando**, não por linha, e
> ainda deduplica por (tabela filha, colunas, tabela pai, colunas). Num legado Oracle real ele
> derrubou uma contagem de 899 para as 458 chaves que de fato existiam. **Não improvise um
> substituto em `grep`.**
>
> Ele também responde de graça duas perguntas que a dimensão de dados sempre faz: quantas tabelas
> estão **sem chave primária** (candidatas a «tabela vermelha») e quais **tabelas pai são citadas por
> chave estrangeira mas não têm DDL na entrega** — sinal objetivo de export incompleto.

### Gate `SIGNALS_COLLECTED` (WARNING)

Ao final do passo, registrar no `sync-log.md` **uma linha de sinais**: quais foram coletados (com o arquivo em `signals/`) e quais ficaram `TOOL_UNAVAILABLE:<nome>` ou `N/A`. Exemplo: `SIGNALS_COLLECTED: scc ✓ · lizard ✓ · hotspots ✓ · ast-grep ✓ · knip N/A-stack · vulture ✓ · deptry ✓ · tbls N/A-sem-DSN · ddl-schema ✓ · depcruise TOOL_UNAVAILABLE:dependency-cruiser`.

### Uso obrigatório dos sinais nos artefatos (quando disponíveis)

| Artefato | Obrigação |
|----------|-----------|
| `legacy-analysis.md` (Passo 5) | O scorecard e a complexidade 50/50 **DEVEM citar os números medidos** — LOC e COCOMO (scc), CC média/máx e nº de funções CC>15 (lizard), top hotspots (churn×complexidade), % de código morto (knip/vulture) — em vez de notas puramente qualitativas. Sinal indisponível → nota qualitativa marcada `[estimado — ferramenta indisponível]` |
| `legacy.md` — Dimensão 8 | Cada `RN-xxx` cuja origem foi um achado do ast-grep **DEVE citar a evidência `arquivo:linha`** do `rules-candidates.json`; achados descartados como falso positivo não viram RN |
| `legacy-analysis.md` — Retire | Recomendações Retire citam os relatórios de código morto (knip/vulture/deptry) e os órfãos do grafo (Passo 0.6) |
| `architecture.md` | Violações de camadas do depcruise entram quantificadas (nº e exemplos) |
| `spec-estimate` | `signals/scc.json` (volume/COCOMO) e `signals/hotspots.json` são insumos diretos do forecast — não apagar |
