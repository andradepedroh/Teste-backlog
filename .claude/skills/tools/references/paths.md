# Paths canônicos do pipeline Eng_Proc

> Fonte única de verdade para onde cada artefato é gravado e lido. Referenciado por todas as skills (§2.1 da auditoria). Um único override documentado.

## Regra de override

- **Default único:** `outputs/spec/` (relativo à raiz do repositório do projeto).
- **Override:** variável de ambiente `PIPELINE_OUTPUTS_DIR`. Quando definida, substitui `outputs/spec/` em produtores e consumidores.
- **Compatibilidade:** consumidores procuram primeiro em `outputs/spec/`; se não encontrarem, tentam `task-generator/outputs/` (layout antigo) emitindo aviso `⚠️ layout legado`. Produtores **sempre** gravam em `outputs/spec/`.
- A pasta `task-generator/` está **descontinuada** — não é mais criada por nenhuma skill.

## Tabela artefato → path (por fase)

| Fase | Skill | Artefato(s) | Path |
|---|---|---|---|
| 0 | spec-init | `.cursor/` / `.claude/` + CLAUDE.md | raiz do repo |
| 1 | spec-ingest | context-map.md, discovery-document.md | `outputs/spec/` |
| 2 | spec-legacy | legacy.md (+ domains/), architecture.md, legacy-analysis.md, threat-model.md, signals/ (sinais determinísticos do Passo 0.7) | `outputs/spec/` |
| 3 | spec-benchmark | benchmark.md | `outputs/spec/` |
| 4 | spec-prototype | prototype.md, design-system.md, src/, screens-manifest.json, screens/`<TEL-ID>`.png | `outputs/spec/` |
| 5 | spec-product | modules.md, product-vision.md, business-rules.md, requirements.md, product-requirements.md, **flow-map.md** (gate FATAL `FLOWMAP_VALID`; omitido só em `FLOWMAP_SKIPPED`) | `outputs/spec/` |
| iter | spec-iterate | gaps.md, gaps-answers.md, sync-log.md, screens-manifest.json + screens/ (só quando a colheita runtime/estático gera o manifesto que o protótipo não emitiu) | `outputs/spec/` |
| 5.5 | spec-tech-rules | tech-rules/*.mdc (fonte) + cópias em `.cursor/rules/` `.claude/rules/` | `outputs/spec/tech-rules/` |
| 5.5-C | spec-scope-change | scope-change-*.md | `outputs/spec/` |
| 5.6 | spec-hld | hld.md (gate `HLD_VALID` via `check-hld.py`) | `outputs/spec/` |
| 6a | spec-data-model | data-model.json | `outputs/spec/` |
| 6b | spec-api-contracts | api-contracts.yaml, api-contracts-supplement.json | `outputs/spec/` |
| 6c | spec-test-plan | test-plan.md | `outputs/spec/` |
| 7 | spec-tasks | tasks.json, gaps-document.md | `outputs/spec/` |
| 7b | spec-security-review | security-review.md (+ injeção in-place em tasks.json) | `outputs/spec/` |
| 7.5 | spec-estimate | estimate-report.md | `outputs/spec/` |
| 7c | spec-tasks-html | report HTML das tasks | `outputs/spec/` |
| 8 | spec-tasks-azure | id-map.json | `outputs/spec/` |
| 9 | spec-scaffold | código base | repo de implementação |
| 10 | spec-implement | código + spec_story.md por módulo | repo de implementação |
| 11 | spec-code-audit | code-audit.md | `outputs/spec/` |
| 12 | spec-status-report | status/status-report.html, status/status-data.json, status/tests-raw/, status/executive-summary.md (opcional), status/azure-snapshot.json (opcional) | `outputs/spec/status/` |
| doc | spec-report | report/product-discovery-kit.html | `outputs/spec/report/` |

## Convenção de screenshots de tela

- **Arquivo no disco:** `outputs/spec/screens/<TEL-ID>.png` (tela sem `TEL-xxx` → `outputs/spec/screens/<slug-da-rota>.png`).
- **Como referenciar:** artefatos que **moram dentro** de `outputs/spec/` (`flow-map.md`, `screens-manifest.json`) citam o caminho **relativo a `outputs/spec/`** → `screens/TEL-001.png`. É a única forma aceita pelo validador (`check-flowmap.py`, coluna Screenshot).
- Artefatos consumidos **da raiz do repositório** (ex.: `tasks.json`) prefixam `outputs/spec/` → `outputs/spec/screens/TEL-001.png`. Mesma imagem, prefixo diferente porque a base é outra — nunca uma terceira forma.

## Convenção de scripts

Scripts são invocados de forma relativa ao SKILL.md: `../tools/<script>.py` (válido nos 3 espelhos: `skills/`, `.cursor/skills/`, `plugin/skills/`).

**Forma canônica — única aceita nas skills:** `python3 ../tools/<script>.py` (ou `node ../tools/<script>.mjs`).

- **Proibido** `skills/tools/<script>.py` — esse prefixo só existe no repositório do kit; no repositório do cliente as skills vivem em `.cursor/skills/` ou `.claude/skills/` e o caminho não resolve.
- **Proibido** `.cursor/skills/tools/<script>.py` — quebra em projeto só-Claude (`.claude/`) e em execução via `plugin/skills/`.
- **`python3`, nunca `python`** — em Linux/macOS típicos `python` não existe no PATH (ou aponta para Python 2). No Windows, onde só há `python`, o agente troca ao executar; a instrução escrita permanece `python3`.
- Todo gate que depende de script segue a política de [`tool-bootstrap.md`](tool-bootstrap.md): **script ausente ou com timeout não é artefato inválido** — registrar `TOOL_UNAVAILABLE:<script>` no `sync-log.md` e cair no modo degradado documentado da skill, inclusive quando o gate é FATAL.
