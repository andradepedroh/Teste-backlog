---
name: spec-tasks-azure
description: >
  spec-tasks-azure (Fase 9 — Publicação no Azure DevOps) — publica tasks.json (produzido
  por spec-tasks) no Azure DevOps como work items. Toda a execução e regras estão no
  Node.js. A IA não segue passos iterativos: roda o CLI em --dry-run, mostra o resumo,
  pede confirmação e só então publica.
version: "3.4"
updated: "2026-10-20"
---

# spec-tasks-azure — Publicação no Azure DevOps

Esta "skill" é apenas um wrapper para um script Node.js. A IA **não deve** tentar gerar payloads manualmente, fazer chamadas de API ou seguir kickoffs interativos para validar Epics. Toda a inteligência de publicação, criação dinâmica de Epics/Features/Stories e validação de work item types está contida no código Node.js.

## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)

<!-- linguagem-clara:v1 inicio -->
<!-- Bloco canônico (variante CLI). Ao alterar, rodar `python scripts/apply_linguagem_clara.py` para replicar. -->

**Nesta skill o texto não é gerado — é renderizado/publicado a partir do `tasks.json`.** As 10
regras completas de escrita vivem no bloco canônico do `spec-tasks` (a skill que ESCREVE o texto);
aqui a régua vira **conferência**, com o teste de 30 segundos:

1. Leia em voz alta a **primeira frase** dos campos narrativos que vão ao leitor. Travou a língua? É defeito da origem.
2. Existe sigla solta, código de regra no lugar do texto da regra, ou jargão de processo ("gate", "blueprint", nome de validator)? É defeito da origem.
3. Encontrou defeito → **avisar no chat e oferecer corrigir na origem (`spec-tasks`)** antes de renderizar/publicar — nunca corrigir só na saída.

> **Isto não autoriza cortar conteúdo.** A conferência é sobre a **forma** do texto que vai ao
> leitor; densidade e auto-suficiência do `tasks.json` continuam intocadas.

<!-- linguagem-clara:v1 fim -->

### Aplicação nesta skill

Aqui o texto **não é gerado, é publicado** — o conteúdo vem do `tasks.json`. Então a régua vira **conferência**.

Antes de subir, passe os campos narrativos pelo teste de 30 segundos acima. Se encontrar jargão de processo, sigla solta ou código de regra no lugar do texto da regra, **avise no chat e ofereça corrigir na origem** (`spec-tasks`) em vez de publicar assim: o work item publicado é a última parada antes do desenvolvedor.

Vale também para a devolutiva no chat — o que foi publicado, onde, e o que ficou pendente.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-tasks-azure | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

## Como usar

Sempre que o usuário pedir para "publicar no Azure", "enviar as tarefas", "rodar a skill spec-tasks-azure" ou algo semelhante, a IA executa **dois passos, nesta ordem**:

1. **Simular** — nada é enviado ao Azure DevOps e o PAT não é necessário:

   ```bash
   node <skills>/spec-tasks-azure/cli.mjs \
     --input <caminho_do_tasks.json> \
     --project <nome-do-projeto-ado> \
     --dry-run
   ```

   Mostre ao usuário o resumo que o CLI imprime: projeto, Epic pai, quantos itens de cada nível
   serão criados (ou atualizados, no modo `_change`) e a lista na ordem de publicação.

2. **Pedir confirmação no chat e só publicar depois de um "sim" explícito** — o mesmo comando, sem
   `--dry-run`. Publicar cria work items que não se apagam com um comando; a `security.md` (Camada
   J) exige confirmação humana antes de escrita irreversível. A confirmação vale para **aquela**
   simulação: se o `tasks.json`, o projeto ou o `--change` mudaram depois dela, simule de novo.

> `<skills>` = a pasta de skills **do espelho em uso** (`.cursor/skills/`, `.claude/skills/`,
> `plugin/skills/` ou `skills/`) — nunca cravar `.cursor/skills/`, que não existe em projeto
> só-Claude. A partir do próprio SKILL.md, o caminho equivalente é `./cli.mjs`. Ver
> [`../tools/references/paths.md`](../tools/references/paths.md) §Convenção de scripts.

### Parâmetros

| Parâmetro | Obrigatório | Descrição | Exemplo |
|-----------|-------------|-----------|---------|
| `--input`, `-i` | Não (padrão: `outputs/spec/tasks.json`) | Caminho para o tasks.json | `outputs/spec/tasks.json` |
| `--project`, `-p` | Não (override de `AZURE_DEVOPS_PROJECT`) | Nome do projeto no Azure DevOps (case-sensitive) | `MEU-PROJETO` |
| `--id-map` | Não | Caminho para `id-map.json` (correlação inicial de itens legados no modo `_change`) | `outputs/spec/id-map.json` |
| `--change` | Não (flag) | Força o modo `_change` (upsert) mesmo sem `metadata.changeMode` | — |
| `--dry-run` | Não (flag) — **obrigatória no primeiro passo** | Simula: lista o que seria criado/atualizado, na ordem, sem chamar a API e sem PAT. O gate de auto-suficiência roda também aqui | — |
| `--reordenar` | Não (flag) | Modo `_change`: regrava o `StackRank` também dos work items que **já existem** — eles **permutam** entre si os StackRank que já têm (por nível, na ordem calculada), sem colidir com itens de fora do arquivo; item sem StackRank vai para depois do maior. Sem ela, só item novo recebe a ordem (o time pode ter reordenado o board à mão) | — |
| `--help`, `-h` | Não (flag) | Exibe a ajuda do CLI | — |

Sem `--project` e sem `AZURE_DEVOPS_PROJECT` no `.env`, a execução falha — perguntar ao usuário
antes de rodar. Organização e credenciais vêm sempre do `.env` (seção "Como funciona").

### Como funciona

O comando irá:
1. Ler o `tasks.json` especificado
2. Conectar ao Azure DevOps usando credenciais lidas de um arquivo `.env` **na pasta da skill** (`skills/spec-tasks-azure/.env`), carregado automaticamente pelo CLI antes de qualquer chamada de API:
   - **`AZURE_DEVOPS_PAT`** — Personal Access Token (obrigatório)
   - **`AZURE_DEVOPS_ORG`** — Organização ADO (obrigatório)
   - **`AZURE_DEVOPS_PROJECT`** — Projeto ADO (obrigatório; pode ser sobreposto pelo parâmetro `--project`)

   Copie `.env.example` para `.env` e preencha os valores reais antes da primeira execução. **Nunca** versionar o `.env` com valores reais.
3. Criar a hierarquia configurada (Epics, Features, Stories, Tasks). **Epic pai pré-criado:**
   quando o backlog deve pendurar num Epic que já existe no ADO, informar o ID em
   `metadata.azureDevOps.epicWorkItemId` do `tasks.json` ou em `AZURE_DEVOPS_EPIC_WORK_ITEM_ID`
   no `.env` (o `.env.example` documenta; detalhes no `--help`)
4. Estabelecer links hierárquicos entre work items
5. Retornar os IDs criados

**Formatação de texto:** campos de texto do `tasks.json` (descrições, resumos, critérios, cenários) são tratados como **texto plano** e convertidos para HTML pelo código (`textToHtml`), preservando parágrafos, quebras de linha e listas `- `/`N.` — os campos do ADO (`System.Description`, `AcceptanceCriteria`) renderizam HTML e colapsariam `\n` cru.

**Contexto de UI (`uiContext`):** stories/tasks com `uiContext` no tasks.json ganham o bloco "Contexto de UI" na description do work item: tela, rota, fluxo/etapa, estados, regras, entidades/endpoints, o **inventário de campos** (`fields[]`, renderizado como tabela com opções transcritas, `optionsSource`, máscaras/formatos/limites, validações, dependências e rastreio), o contrato de `grid` e o `filterBehavior`. O screenshot **não substitui** `fields[]` — o agente implementador não lê imagens.

Se `uiContext.screenshot` existir como arquivo, ele é enviado como attachment (`AttachedFile`) e embutido como `<img>` na description; no modo `_change` o mesmo `fileName` **não** é re-anexado (idempotente). O caminho é resolvido **contra o diretório do `tasks.json`** (fallback: cwd) e passa por validação antes de qualquer leitura: extensão em `.png/.jpg/.jpeg/.gif/.webp`, caminho relativo (absoluto é recusado), contido no diretório do `tasks.json` (sem travessia por `..`) e no máximo 5 MB. Modo degradado: arquivo ausente, rejeitado pela validação ou falha de upload → work item publicado **sem** imagem, com aviso no stderr (nunca bloqueia).

---

## Configuração de Work Item Types (WITs)

O skill suporta **tipos de trabalho padrão** (Feature, User Story, Task, Epic) e **tipos operacionais** (Enabler, Spike, Technical Debt, Bug) introduzidos pela EloCore. Quando uma Feature ou Story tem `workItemType` no `tasks.json`, o WIT é resolvido assim:

| `workItemType` (tasks.json) | **WIT usado sem env var (default real)** | Env var para usar outro nome de WIT |
|------|---------|------|
| `FEATURE` | `Feature` | `AZURE_DEVOPS_WIT_FEATURE` |
| `USER_STORY` (default das Stories) | `User Story` | `AZURE_DEVOPS_WIT_USER_STORY` |
| `ENABLER` | `User Story` | `AZURE_DEVOPS_WIT_ENABLER` (ex.: `Enabler`) |
| `SPIKE` | `User Story` | `AZURE_DEVOPS_WIT_SPIKE` (ex.: `Spike`, `Investigation`) |
| `TECHNICAL_DEBT` | `User Story` | `AZURE_DEVOPS_WIT_TECHNICAL_DEBT` (ex.: `Technical Debt`) |
| `BUG` | `Bug` | `AZURE_DEVOPS_WIT_BUG` |

> Os tipos operacionais só viram WIT próprio (`Spike`, `Enabler`, …) **se** a env var
> correspondente estiver configurada com um WIT que exista no processo do projeto — sem ela, o
> default real é `User Story` (exceto `BUG` → `Bug`).

**Como configurar:** copiar `.env.example` → `.env` e preencher — o próprio `.env.example`
documenta todas as variáveis (credenciais, projeto, Epic pai, WITs) com exemplos e os fallbacks.

---

## Modo _change — Alteração de Escopo

Em modo normal, a skill é **create-only**: cria Epic/Feature/Story/Task. Em modo `_change`, ela passa a fazer **upsert** — atualiza (PATCH) os work items já existentes no Azure DevOps e cria (POST) apenas os que ainda não existem. O modo normal é **integralmente preservado** (backward compatible).

**Quando ativar:** `metadata.changeMode === true` no `tasks.json` de entrada (típico de `tasks-complementary_change-[sigla].json` produzido pela `spec-tasks`) ou a flag `--change`.

**Comportamento em alto nível:**
- Correlação do ID lógico (`TASK-XXX-XXX`) → work item do ADO: `id-map.json` → tag `logical-id:<ID>` (WIQL) → título legado `<ID>: ...` (WIQL), nessa ordem; sem correlação, emite aviso acionável e cria o item como novo.
- Tasks com `regressionOf`/`relatedTasks` recebem link `Related` para o work item original.
- Saída: relatório consolidado (`created`/`updated`/`skipped`/`relatedLinks`/`warnings`/`errors`); exit code 2 em falha parcial.

Detalhes completos (fluxo passo a passo, correlação em itens legados sem a tag, exemplos de comando, flags `--change`/`--id-map`): rode `node cli.mjs --help`.

---

## Ordem, dependências e marca de regra de negócio

A `spec-tasks` (≥ 1.7) grava a ordem lógica (`executionOrder`) e a marca de regra de negócio
(`businessRuleHeavy`) nos quatro níveis. O CLI as leva ao Azure DevOps — e o `--dry-run` mostra
cada uma antes:

- **Ordem de criação** = `executionOrder` (item sem o campo mantém a posição do array, depois dos
  ordenados). Vale também no `_change`, onde os arrays ficam na ordem original.
- **`Microsoft.VSTS.Common.StackRank`** — o campo que ordena o backlog no processo Agile. No item
  criado = **o maior StackRank já existente no projeto + `executionOrder`**: os itens novos entram
  depois do backlog que o time já tem, na ordem calculada (lido uma vez, antes de criar). Se essa
  leitura falhar, o item sai **sem** StackRank — o ADO o põe no fim, nunca no topo — com aviso.
  Processo sem o campo (Scrum usa outro): **aviso uma vez** e a publicação segue sem ele, na criação
  e na atualização. No upsert, item que já existe só tem o StackRank regravado com `--reordenar`,
  que **permuta** os StackRank que esses itens já têm (por nível) em vez de regravar 1…N.
- **Links de dependência**: `dependencies[]`/`dependsOn[]` viram link Predecessora/Sucessora, sem
  duplicar no `_change`. Dependência sem work item conhecido → aviso, sem link.
- **Tag de regra de negócio**: item com `businessRuleHeavy: true` ganha a tag `regra-de-negocio`
  (`metadata.azureDevOps.businessRuleTag` muda o nome), somada às outras, sem duplicar em outra caixa
  (o ADO não diferencia maiúsculas). No `_change`, item que deixou de ser marcado
  (`businessRuleHeavy: false`) perde **só essa tag, e só se foi esta ferramenta que a pôs** — o
  registro fica em `ado-marcas-regra.json`, ao lado do `tasks.json` (no layout padrão,
  `outputs/spec/`, junto do `id-map.json`; versione junto). Tag posta à mão pelo time, mesmo com o
  mesmo nome, fica.

---

## Gate de auto-suficiência (pré-publicação)

Antes de escrever **qualquer coisa** no Azure DevOps, o `cli.mjs` roda o validator de
auto-suficiência da `spec-tasks` sobre o `tasks.json` de entrada (racional no comentário do
próprio `cli.mjs`). As mensagens do CLI cobrem os três desfechos — gate OK (segue), FATAL
(**aborta com exit 3**, nada é escrito no ADO, e o próprio abort imprime o comando do relatório
completo) e degradação (validator ausente/crash → aviso no stderr e publicação sem o gate,
nunca bloqueio silencioso).

**Override de emergência:** `AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE=1` desativa o gate. Fica
registrado no stderr e o motivo **deve** ser anotado no `sync-log.md`.

### Exit codes do CLI

| Código | Significado |
|--------|-------------|
| `0` | Sucesso |
| `1` | Erro fatal (input ilegível, credenciais ausentes, exceção não tratada) |
| `2` | Falha parcial (erros/avisos por item; no modo `_change` inclui correlação não resolvida) |
| `3` | Publicação abortada pelo gate de auto-suficiência (`tasks.json` com FATAL) |

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia publicação

| Código | Verificação |
|--------|-------------|
| `TASKS_JSON_VALID` | `tasks.json` de entrada existe e é JSON válido antes de iniciar a publicação |
| `CREDENTIALS_PRESENT` | `.env` da skill contém `AZURE_DEVOPS_PAT`, `AZURE_DEVOPS_ORG` e um projeto resolvido (`--project` ou `AZURE_DEVOPS_PROJECT`) |
| `NO_CYCLIC_HIERARCHY` | Hierarquia Epic → Feature → Story → Task sem referências circulares de parent |
| `SELF_SUFFICIENCY_GATE` | Gate pré-publicação passou (0 FATAL) — semântica completa no § Gate de auto-suficiência |
| `PUBLISH_CONFIRMED` | A publicação só roda depois do `--dry-run` mostrado ao usuário e de um "sim" explícito no chat para aquela simulação (§ Como usar) |

### WARNING — não bloqueia, entra no relatório consolidado

| Código | Verificação |
|--------|-------------|
| `UNRESOLVED_CORRELATION` | Item de alteração/regressão sem correlação ID lógico → ADO (id-map/tag/título) — criado como novo |
| `SELF_SUFFICIENCY_GATE_SKIPPED` | Gate degradado ou desativado (§ Gate de auto-suficiência) — publicação segue com aviso no stderr |
| `PARTIAL_FAILURE` | Execução terminou com exit code 2 (§ Exit codes) |
| `CHANGE_MODE_IMPLICIT` | `metadata.changeMode === true` detectado sem a flag `--change` ter sido passada explicitamente |
| `STACKRANK_UNSUPPORTED` | O processo do projeto não aceita `Microsoft.VSTS.Common.StackRank` — itens criados e atualizados na ordem lógica, sem a ordem gravada no backlog (§ Ordem, dependências e marca) |
| `STACKRANK_BASE_UNREADABLE` | A leitura do maior StackRank do projeto falhou — os itens novos saem sem StackRank, no fim do backlog (nunca no topo); `--change --reordenar` grava a ordem depois |
| `DEPENDENCY_LINK_UNRESOLVED` | Dependência sem work item conhecido — o link não foi criado (aviso no relatório; preencher o `id-map.json` no `_change`) |

---

## Skills irmãs

| Skill | Fase | Relação com `spec-tasks-azure` |
|-------|------|---------------------------------|
| `spec-tasks` | 7 | Produz o `tasks.json` publicado por esta skill |
| `spec-estimate` | 7.5 | Roda antes ou em paralelo — diagnóstico de delivery precede a publicação |
| `spec-tasks-html` | 7c | Gera relatório HTML navegável a partir do mesmo `tasks.json` |
| `spec-scope-change` | 5.5-C | Produz `tasks-complementary_change-*.json`, consumido no modo `_change` |
| `spec-implement` | 10 | Implementa os work items publicados por esta skill |

---

## O que NÃO faz

- Não publica sem simular e sem confirmação explícita do usuário (`PUBLISH_CONFIRMED`).
- Não gera `tasks.json` nem decide a hierarquia de backlog — use `spec-tasks` (Fase 8).
- Não faz chamadas de API manualmente nem gera payloads na conversa — toda a lógica está no CLI Node.js.
- Não segue kickoffs interativos para validar Epics — validação é determinística no código.
- Não implementa os work items publicados — use `spec-implement` (Fase 11).
- Não decide credenciais/organização fora do `.env` local da skill.

---

## Histórico

Changelog em [`./HISTORY.md`](./HISTORY.md) — contexto de manutenção, não de execução.
