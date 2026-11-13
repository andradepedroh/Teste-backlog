# Harness Elo v2

Harness único de método e produção: o pré-projeto conversacional do `harness-elo` com a cadeia de
produção do `Elo-Spec-Kit`. Entregue como **pacote `.zip`**: extraia numa pasta vazia. O guia do
usuário é distribuído à parte.

## Pré-requisitos

Antes do primeiro projeto, a máquina precisa de:

| # | Dependência | Para quê | Quando morde |
|---|---|---|---|
| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |
| 2 | **Node ≥18** (LTS 20 ou 22) | verificadores e CLIs de skill. Ambos usam só módulos `node:` — zero pacotes externos | sempre |
| 3 | **Git** | branch por US, gate no push, conexão ao ADO | sempre |
| 4 | **Python 3** no PATH como `python3` | `tools/*.py` do kit. `check-flowmap.py` é FATAL na `spec-data-model`, `spec-api-contracts` e `spec-iterate` | Plan e Deliver |
| 5 | **npm com acesso a registry** | **somente o protótipo.** Nenhum CLI do harness tem dependência externa | Explore |
| 6 | **PAT do Azure DevOps** — `AZURE_DEVOPS_PAT`, `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT` | publicar os work items | marco do Plan |
| 7 | *opcional:* `pytm`, `scc`, `ast-grep`, `vale` | threat model, hotspots, lint. O kit tem rota degradada para cada um | Plan |

**Confira tudo de uma vez, na pasta recém-extraída:**

```bash
node .claude/ferramentas/doutor.mjs
```

Ele relata e nunca bloqueia. Duas coisas ele **não** sonda, de propósito: acesso ao registry npm
(exigiria rede, e sondagem de rede pendura — 2,5 a 42 s medidos numa share fora do ar) e o valor do
PAT (confere presença das variáveis, nunca imprime o conteúdo).

**Duas armadilhas conhecidas:**

- **Item 4, em Windows:** o comando é `python3`, mas o Windows instala o Python como `python` e
  mantém um *App Execution Alias* de `python3.exe` que **abre a Microsoft Store** em vez de falhar.
  O script não roda, o exit code engana e a mensagem não ajuda. Confirme com
  `python3 -c "import sys; print(sys.executable)"` — tem que imprimir um caminho real.
- **Item 6 é provisionamento com prazo**, não instalação. Quem pedir o PAT na véspera do marco do
  Plan vai esperar.

## Instalação

Crie uma pasta vazia com o nome do projeto e extraia o `.zip` **dentro dela**. Confira que **não**
veio `.git/` nem `.harness-template` — o pacote é gerado sem os dois — e que **veio** o
`harness-zona.lock.json` na raiz: é o manifesto da zona imutável, versione-o junto e não o edite.

Atualizando uma pasta que veio de um zip anterior? Apague, se existirem, o `GUIA.html` da raiz e os
arquivos `docs/verificacoes-primeiro-dia*.md` que as versões 2.1.0 a 2.3.0 deixavam — só esses
arquivos, não a pasta `docs/` (ela pode ser sua): eles não fazem mais parte do harness.

Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.

## Estrutura

| Caminho | O que é |
|---|---|
| `inputs/` | insumos brutos: briefing, transcrições, material de mercado, código de legado |
| `outputs/explore/` | os quatro documentos do pré-projeto mais `gaps.md` — entregável versionado |
| `outputs/spec/` | tudo que as skills do kit escrevem |
| `workspace.md` | manifesto multi-repo — qual repositório tem qual papel |
| `.claude/rules/harness/` | as cinco rules do método (zona imutável) |
| `.claude/templates/` | os seis templates do Explore (zona imutável) |
| `.claude/hooks/` | os verificadores da camada — disparados **por evento**, com orçamento de latência (zona imutável) |
| `.claude/ferramentas/` | os executáveis de mão — rodados **por comando**, sem orçamento (zona imutável) |
| `.claude/skills/` | a cadeia `spec-*` vendorizada (zona imutável) |

## As duas zonas

| Zona | Caminho | Regra |
|---|---|---|
| **Imutável** | `CLAUDE.md`, `.claude/hooks/`, `.claude/ferramentas/`, `.claude/settings.json`, `.claude/templates/`, `.claude/rules/harness/`, `.claude/skills/` | nunca edite — a atualização sobrescreve |
| **Mutável** | `inputs/`, `outputs/`, raiz de `.claude/rules/`, `.cursor/rules/` | é onde o projeto vive |

Atualizar o template é **sobrescrever a zona imutável**, não fazer merge. Se ninguém editou o
maquinário, a atualização não conflita.

**A garantia está no PR, não só no agente.** A trava do agente nega escrita na zona, mas o terminal e
a IDE passam por fora dela. Para fechar isso, ligue uma vez a verificação da zona como *build
validation* da `main` do repositório onde o harness mora: o pipeline é o
`.claude/templates/pipeline-verificar-zona.yml`, e o cabeçalho dele tem o passo a passo. Ele roda
`node .claude/ferramentas/verificar-zona.mjs`, que confere cada arquivo da zona contra o
`harness-zona.lock.json` do pacote e falha se algo foi editado, apagado ou criado ali. Uma
atualização do harness passa, e o log mostra de qual versão para qual.

**Agente ou skill próprios do projeto são permitidos.** Um agente novo em `.claude/agents/` ou uma
skill nova em `.claude/skills/<nome>/`, com nome que o pacote não tem, é extensão do projeto: a trava
deixa criar e o `verificar-zona.mjs` só avisa. O que veio no pacote continua intocável.

**Isso vale para o seu projeto.** Para quem **mantém o template**, a zona `.claude/skills/` tem
procedimento próprio a partir de 2026-09-09: ela é a fonte única de verdade do `Elo-spec-kit`, e
atualizá-la é merge de três pontas, não sobrescrita. Ver [`MANUTENCAO.md`](./MANUTENCAO.md).

## Rodar os testes

```bash
node --test .claude/hooks/*.test.mjs .claude/ferramentas/*.test.mjs
```

**A forma de diretório não funciona.** `node --test .claude/hooks/` sai com código 1 e `# fail 1`
sem rodar teste nenhum: o descobridor de arquivos do Node ignora diretório cujo nome começa com
ponto, e o caminho cai no carregador de módulo. Se você vir `Cannot find module ...\.claude\hooks`,
é isso — não é a suíte quebrada.

`report-dominios.test.mjs` roda o `generate-report.py` do kit de verdade, por subprocesso — e o
gerador precisa do pacote Python `markdown`. Aponte `PYTHON_REPORT` para um interpretador que o
tenha (por exemplo um venv) antes de rodar a suíte:

```bash
export PYTHON_REPORT="/caminho/para/um/venv/com/markdown/bin/python"        # Linux/macOS
export PYTHON_REPORT="C:/caminho/para/um/venv/com/markdown/.venv/Scripts/python.exe"  # Windows
node --test .claude/hooks/report-dominios.test.mjs
```

Sem isso, esses testes falham alto e claro por design — o primeiro teste da suíte é um pré-voo
que nomeia exatamente essa falta; nunca silenciam com `test.skip`.

## Validar o manifesto

```bash
node .claude/hooks/workspace.mjs --validar
```

## Ferramentas de mão

Rodadas por comando, quando você precisa. Não são disparadas por evento e não têm orçamento de
latência — ao contrário dos verificadores, elas podem levar um segundo e podem escrever arquivo.

| Comando | Quando |
|---|---|
| `node .claude/ferramentas/doutor.mjs` | uma vez, na pasta recém-extraída: confere os pré-requisitos da máquina |
| `node .claude/ferramentas/verificar-zona.mjs` | quando quiser saber se a zona imutável está como veio no pacote; no PR, pelo pipeline `.claude/templates/pipeline-verificar-zona.yml` (com `--base origin/main`) |
| `node .claude/ferramentas/promocao.mjs` | no marco do Plan, quando a `spec-product` termina: relatório de cobertura de promoção |
| `node .claude/ferramentas/promocao.mjs --congelar` | depois de aceitar o relatório: carimba `outputs/explore/` e liga o congelamento |
| `node .claude/ferramentas/wiki.mjs --saida <dir>` | quando for publicar a wiki do cliente |
| `node .claude/ferramentas/bench.mjs` | quando quiser medir o custo da camada |
| `node .claude/ferramentas/validar.mjs iniciar --task <TASK>` | no Deliver, depois dos testes verdes da `spec-implement`: valida a task com agentes independentes, manda corrigir o que bloqueia e revalida, até zero bloqueantes. Antes de escrever código, `validar.mjs linha-de-base --task <TASK>` guarda como os comandos do projeto saem; passe o arquivo em `--linha-de-base` para que a falha que já existia não bloqueie. Depois de cada ação, `validar.mjs avancar --task <TASK>`. Rode com timeout alto (os testes e o build do projeto rodam dentro; no Windows, no Git Bash). No Kiro, ou sem subagentes, acrescente `--sem-agentes`. Opções no cabeçalho do arquivo |
| `node .claude/ferramentas/empacotar.mjs --saida <dir>` | **só na cópia do template**, por quem mantém: gera o zip publicável do `HEAD`, com o nome `harness-elo-v2-<versao>.zip`. Procedimento completo em `MANUTENCAO.md`, "Gerar e publicar o zip" |
