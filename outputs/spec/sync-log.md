# Log de sincronização — ServiceNow - 2.6 Cobrança

Última atualização: 2026-11-13

Este log é a **memória cronológica do projeto**. Toda execução de skill (`spec-ingest`, `spec-legacy`, `spec-benchmark`, `spec-product`, `spec-prototype`, `spec-iterate`, `spec-report`) registra uma linha aqui ao terminar. Skills subsequentes leem este log no início para entender de onde viemos antes de produzir novo conteúdo.

<!-- id: sync-log -->

---

## Seção A — Execuções de skills (timeline)

Ordem cronológica, mais recente no topo. Cada execução = uma linha.

| # | Data/Hora | Skill | Modo / contexto | Inputs consumidos | Outputs gerados ou atualizados | Decisões-chave (1–3 bullets) | Decisor | Próximo passo recomendado |
|--:|-----------|-------|-----------------|-------------------|-------------------------------|------------------------------|---------|---------------------------|
| 4 | 2026-11-13 16:12 | spec-ingest | inicial; fontes = outputs/explore/ (âncora arquivo §seção ID) + inputs/; protótipo só como intenção (INF) | outputs/explore/ (5 docs), inputs/especificacoes/ (ETF, wiki), inputs/briefing/ (plano v3), inputs/prototipo/ | outputs/spec/context-map.md, outputs/spec/discovery-document.md | 200 F-xxx (todas as 55 RF e 30 RN do Explore ancoradas), 4 INF, 0 NCR; 6 contradições (score v1 × H2, grupo de controle 3% × ~500, distribuição, Cobrança Ativa, cronograma, contumazes); prontidão 90% (pronto) | Pedro | spec-legacy (skip: sem legado) → spec-product |
| 3 | 2026-11-13 15:25 | pré-projeto Explore (manual) | ramo=A (documentação primeiro), sem protótipo; simulação do fluxo do harness até o backlog, sem horas | inputs/especificacoes/ (ETF, wiki), inputs/briefing/ (plano v3), inputs/prototipo/ (só referência) | outputs/explore/hld-funcional.md, especificacao-funcional.md, especificacao-tecnica.md, modelo-de-dados.md, gaps.md; outputs/spec/revisao.json | 7 módulos, 55 RF e 30 RN preliminares; 17 GAPs; protótipo dispensado (isenção a registrar) | Pedro | isenção do protótipo → fecho do Explore → spec-ingest (Plan) |
| 2 | 2026-11-13 15:16 | backlog-preliminar (fora da cadeia do kit) | resumido, sem protótipo: tarefas por funcionalidade para avaliação | inputs/especificacoes/etf-cobranca-inteligente.pdf (§2.1, §2.2, §3, §4, §6), inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx (slides 7, 9, 14-19, 22-23) | outputs/backlog-preliminar/backlog.json, outputs/backlog-preliminar/kanban.html | Protótipo não será usado por enquanto; 6 funcionalidades (F1-F6) + transversal, 62 tarefas, horas batem com a ETF (224 h + 36 h; 408 h no total) | Pedro | avaliar o kanban → histórias com critérios de aceite e dependências |
| 1 | 2026-11-13 13:35 | kickoff | kickoff: legado=Não · ramo=— · ambiente=claude · inputs=ETF Cobrança Inteligente (PDF), wiki TO-BE refined (HTML + 15 MD), plano de implementação v3 (PPTX anonimizado), protótipo v3 (HTML, 13 telas) | inputs/especificacoes/, inputs/briefing/, inputs/prototipo/ | workspace.md, outputs/spec/sync-log.md | Não existe sistema legado de cobrança (projeto greenfield); nomes dos repositórios aprovados: Teste-backlog (docs), servicenow-cobranca-prototipo, servicenow-cobranca | Pedro | definir ramo (A/B) e insumos em inputs/ → hld-funcional.md |

**Convenções de preenchimento:**
- **Modo / contexto:** o que diferenciou esta execução das outras (ex.: `delta` se for re-execução; `proto-first` vs `doc-first` etc.). É também a coluna dos **marcadores de skip** lidos pelo `check-outputs.py` — ver abaixo.
- **Inputs consumidos:** lista curta — caminhos de arquivos em `inputs/` ou referências a `outputs/spec/` lidos.
- **Outputs:** apenas arquivos efetivamente criados/modificados nesta execução.
- **Decisões-chave:** o que **mudou** o entendimento do projeto. Não listar "extraí 47 F-xxx" — listar "decidimos não migrar dados do legado".
- **Decisor:** quem assinou a decisão (consultor / cliente / nome). `—` se foi puramente derivado dos artefatos.
- **Próximo passo:** o que o orquestrador deve invocar depois.

**Marcadores de skip (lidos pelo `check-outputs.py` — obrigatoriedade condicional):**

| Marcador | Quem escreve | Quando | Efeito |
|---|---|---|---|
| `LEGACY_SKIPPED: motivo=<…> · justificativa=<1 frase>` | `spec-legacy` (Passo 0, linhas 2 e 3 da tabela de decisão) | projeto sem legado real em `inputs/` — os 4 artefatos do AS-IS não são gerados | `legacy.md`, `architecture.md`, `legacy-analysis.md`, `threat-model.md` viram «não se aplica» (⬜) em vez de falta |
| `FLOWMAP_SKIPPED: motivo=<API pura\|batch\|worker> · justificativa=<1 frase>` | `spec-product` (Passo 4.7) | produto sem UI — `flow-map.md` não é gerado | `flow-map.md` vira «não se aplica» (⬜) |

Escrever o marcador **abrindo** a célula **Modo / contexto** da própria linha da execução (forma preferida) ou em **linha própria** fora da tabela:

```
| 2 | YYYY-MM-DD HH:MM | spec-legacy | LEGACY_SKIPPED: motivo=greenfield · justificativa=inputs/ só tem transcrições | inputs/reuniao-01.txt | legacy.md | — | consultor | spec-benchmark |
```

Regras (as quatro são verificadas pelo `check-outputs.py`; a tabela e o exemplo acima são **documentação** e por isso não desligam nada):

1. o marcador só vale **abrindo** a linha ou a célula — citá-lo no meio de uma frase (ex.: «o marcador `LEGACY_SKIPPED` não se aplica aqui») **não** desliga o gate;
2. em tabela, só vale na coluna **Modo / contexto** — a mesma string na coluna «Marcador» desta seção, ou numa coluna de anti-padrão/«não fazer», não declara nada;
3. `motivo=` tem de estar **preenchido de verdade**: `motivo=<…>` e `motivo=<API pura|batch|worker>` são placeholders deste template e não desligam gate nenhum (substituir por `motivo=greenfield`, `motivo=API pura`, …). Pelo mesmo motivo, linha que ainda traga `YYYY-MM-DD`/`HH:MM` é exemplo, não registro;
4. precedências: `kickoff: legado=Sim|Parcial` vence `LEGACY_SKIPPED`, e `FLOWMAP_VALID:` (escrito pela `spec-product` quando o `flow-map.md` foi gerado — logo, o produto **tem** UI) vence `FLOWMAP_SKIPPED`.

Nada em bloco de código (``` … ``` ou indentado por 4 espaços) é lido como declaração — os exemplos deste arquivo continuam sendo só exemplos.

---

## Seção B — Propagações de GAP

Mudanças entre artefatos resultantes do fecho de GAPs (Etapa B do `spec-iterate`).

| Data | Direção | GAP fechado | Origem da decisão | Artefatos tocados | Resumo | Decisor |
|------|---------|-------------|-------------------|-------------------|--------|---------|
| YYYY-MM-DD | doc→proto \| proto→doc \| doc→doc | GAP-XXX | gaps-answers.md / chat / nova evidência F-xxx | arquivo §seção | resumo da mudança | consultor / cliente / nome |

*(Direção: `doc→proto` = documento gerou alteração no protótipo; `proto→doc` = protótipo revelou alteração em documento; `doc→doc` = mudança entre documentos sem protótipo.)*

---

## Como usar este log nas próximas skills

**No início de qualquer skill, ler primeiro a Seção A:**
- Última execução de cada skill já rodada — não duplicar trabalho.
- Decisões-chave já tomadas — não relitigar sem motivo novo.
- Modo / contexto de execuções anteriores — manter coerência (ex.: se kickoff disse "sem legado", não inverter agora sem nova decisão registrada).

**Ao terminar a skill, **antes de declarar conclusão**:**
- Adicionar nova linha em Seção A com a execução que acabou.
- Se a execução fechou ou propagou GAPs, adicionar linhas em Seção B.
- Atualizar `Última atualização` no topo.

**Skills que produzem grandes alterações** (`spec-product`, `spec-prototype` Modo Geração) podem registrar **uma linha por artefato principal** quando o salto for grande — mas sem inflar para "uma linha por arquivo tocado".
