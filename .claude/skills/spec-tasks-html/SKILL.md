---
name: spec-tasks-html
description: >
  spec-tasks-html (Fase 8c — Relatório HTML de Tasks) — gera relatório HTML navegável
  a partir do tasks.json (spec-tasks v5+). Renderiza a cadeia completa
  Epic → Feature → Story → Task com navegação lateral e âncoras por nível, resumo
  estruturado, API e persistência compact-prose legíveis, tema claro "Enterprise".
  Painéis por tipo operacional (Spike, Dívida Técnica, Defeito). Execução via Node.js
  (cli.mjs); a IA deve rodar o comando, não gerar HTML manualmente.
version: "6.3"
updated: "2026-10-20"
---

# spec-tasks-html — Relatório HTML Premium de Tasks

Esta "skill" é apenas um wrapper para um script Node.js. A IA **não deve** tentar gerar o HTML manualmente nem inventar markup fora do CLI. Toda a inteligência de renderização está no código-fonte Node.js desta pasta (`lib/render-html.mjs`, `lib/report-theme.css`).

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

Aqui o texto **não é gerado, é renderizado** — o conteúdo vem do `tasks.json`. A régua vira **conferência**: se os campos narrativos vierem em jargão, avise no chat e ofereça corrigir na origem (`spec-tasks`) antes de gerar o HTML. Vale também para os rótulos, legendas e textos de apoio do próprio relatório.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-tasks-html | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

## O que o renderer produz

O renderer é **totalmente dinâmico** e cobre a cadeia completa `Epic → Feature → Story → Task` e
qualquer subconjunto dela (hierarquia parcial, features/stories órfãs em blocos "sem Epic",
arrays vazios com mensagem própria) — o rótulo da cadeia vem de
`metadata.backlogHierarchy.chosen`, filtrado pelos níveis presentes no JSON, e o id declarado no
**filho** sempre vence o `containedXIds[]` do pai. Renderiza `selfContainedSummary`
compact-prose em seções legíveis, persistência e APIs completas, o bloco **Contexto de UI**
(`uiContext` com `fields[]`, `grid`, `filterBehavior`; screenshot embutido em base64) e painéis
por tipo operacional (Spike, Dívida Técnica, Defeito). O detalhe de comportamento vive no código
(`lib/render-html.mjs`) e no [`./HISTORY.md`](./HISTORY.md).

**Ordem e marca (spec-tasks ≥ 1.7):** lista os quatro níveis na ordem de `executionOrder` (sem o
campo, a ordem do array), com o número `#N` visível; item com `businessRuleHeavy` ganha o selo
**Regra de negócio**, e o relatório oferece o filtro «Mostrar só o que é regra de negócio» — que
nunca esconde o pai de um item marcado. Backlog sem a marca sai como antes, sem filtro.

**Cap de imagem (única configuração via ambiente):** screenshot acima de **1,5 MB** (default)
não é embutido — aviso inline + seção "⚠️ Imagens não embutidas" + mensagem no `stderr`. Ajustar
com **`SPEC_TASKS_HTML_MAX_IMAGE_KB`** (valor em KB), ex.:
`SPEC_TASKS_HTML_MAX_IMAGE_KB=4096 node cli.mjs …`.

## Como usar

Sempre que o usuário pedir para "gerar o HTML", "rodar a skill spec-tasks-html" ou algo semelhante, a IA deve simplesmente executar o seguinte comando no terminal:

```bash
node <pasta_das_skills>/spec-tasks-html/cli.mjs --input <caminho_do_tasks.json> --output <caminho_de_saida.html>
```

Se o usuário não fornecer os caminhos, a IA deve perguntar ou assumir:
- **Input Padrão:** `outputs/spec/tasks.json`
- **Output Padrão:** `outputs/spec/report/tasks.html`

**IMPORTANTE:** Para **gerar** o relatório, execute apenas o comando acima. Para **alterar** layout ou parsing, edite os arquivos em `lib/` **desta skill** (caminho relativo a este `SKILL.md` — vale nos espelhos `skills/`, `.cursor/skills/`, `.claude/skills/` e `plugin/skills/`; nunca hardcodar `.cursor/…`, que quebra em projeto só-Claude).

---

## Falhas e avisos do CLI

**Falha dura (o CLI aborta):** `tasks.json` inexistente ou JSON inválido, ou caminho de saída
não gravável — corrigir a entrada/caminho e rodar de novo.

**Avisos (não bloqueiam):**

| Situação | Como aparece |
|----------|--------------|
| `epics`/`stories` vazios | No próprio HTML: "Nenhum item para exibir" |
| Stories sem `epicId` | No próprio HTML: seção "Stories sem Epic" |
| compact-prose ausente (`selfContainedSummary`/persistência/API) | No próprio HTML: seções de resumo incompletas |
| Screenshot acima do cap | Aviso inline + seção "⚠️ Imagens não embutidas" + mensagem no `stderr` |
| Chave de `persistenceModel`/`apiContracts` não consumida pelo renderer | `stderr`: `spec-tasks-html [aviso]: <task>.<caminho>.<chave> … não renderizada` — ou o renderer passa a cobrir a chave, ou o campo não deveria estar no `tasks.json` (racional no comentário do `cli.mjs`) |

---

## Skills irmãs

| Skill | Fase | Relação com `spec-tasks-html` |
|-------|------|--------------------------------|
| `spec-tasks` | 7 | Produz o `tasks.json` renderizado por esta skill |
| `spec-tasks-azure` | 8 | Publica o mesmo `tasks.json` no Azure DevOps |
| `spec-estimate` | 7.5 | Pode ser citado no relatório como contexto de forecast/delivery |

---

## O que NÃO faz

- Não gera `tasks.json` — use `spec-tasks` (Fase 8).
- Não publica em ferramenta externa — use `spec-tasks-azure` (Fase 9).
- Não altera dados do backlog — apenas renderiza o que já existe em `tasks.json`.

---

## Histórico

Changelog em [`./HISTORY.md`](./HISTORY.md) — contexto de manutenção, não de execução.
