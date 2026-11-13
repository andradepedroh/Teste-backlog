# Log de sincronização — ServiceNow - 2.6 Cobrança

Última atualização: 2026-11-13

Este log é a **memória cronológica do projeto**. Toda execução de skill (`spec-ingest`, `spec-legacy`, `spec-benchmark`, `spec-product`, `spec-prototype`, `spec-iterate`, `spec-report`) registra uma linha aqui ao terminar. Skills subsequentes leem este log no início para entender de onde viemos antes de produzir novo conteúdo.

<!-- id: sync-log -->

---

## Seção A — Execuções de skills (timeline)

Ordem cronológica, mais recente no topo. Cada execução = uma linha.

| # | Data/Hora | Skill | Modo / contexto | Inputs consumidos | Outputs gerados ou atualizados | Decisões-chave (1–3 bullets) | Decisor | Próximo passo recomendado |
|--:|-----------|-------|-----------------|-------------------|-------------------------------|------------------------------|---------|---------------------------|
| 12 | 2026-11-13 20:02 | revisao-de-seguranca | plano-geral; contexto LGPD + sigilo fiscal + governo (dos documentos) | hld.md, tech-rules/, business-rules.md, requirements.md, gaps.md, outputs/explore/ (congelado), vetores.md | outputs/spec/plano-de-seguranca.md | 19 SEC: 0 CRÍTICO · 9 ALTO · 9 MÉDIO · 1 BAIXO (15 abertos, 1 coberto, 3 adiados); 10 controles transversais avaliados (2 ausentes: rate limiting e direitos do titular) | Pedro | spec-data-model |
| 11 | 2026-11-13 20:00 | spec-hld | completo, greenfield; HLD_VALID: exit 0 (1 aviso tratado: kickoff-proposto.md não é rule) | modules.md, requirements.md, product-requirements.md, flow-map.md, context-map.md, tech-rules/ | outputs/spec/hld.md | 6 containers numa única aplicação escopada (ADR-01); 15 integrações (7 APIs de entrada com padrão de lote); 10 ADRs; 5 spikes (volume de consolidação, provedor, Platform Analytics, opt-in, tamanho do lote de score); RNF-CON-* renomeados para RNF-CONF-* (colisão com CON-NN) | Pedro | revisao-de-seguranca (plano-geral) → spec-data-model |
| 10 | 2026-11-13 19:46 | spec-tech-rules | ambiente=claude; modo expresso, quadro confirmado sem exceções | requirements.md, product-requirements.md, business-rules.md, discovery-document.md, context-map.md, tech-rules/kickoff-proposto.md | rules geradas: security, frontend-default, frontend, architecture, conventions, database, test-strategy, observability, auth, deploy-and-build, integrations (+ tech-rules-summary.md); 9 materializadas em .claude/rules/; check-rules 0 achados | plataforma ServiceNow nativa (aplicação escopada x_cbi_, sem tela customizada); testes com ATF + k6; GitHub Flow com um branch por história · Questões em aberto: 3 | Pedro | spec-hld |
| 9 | 2026-11-13 19:44 | spec-iterate | Etapa B (respostas no chat) | outputs/spec/gaps.md | gaps.md, requirements/requirements.md (RF-MOD-REGUAS-02, 04, 05), business-rules.md (RN-NOVO-REG-002) | GAP-028 marcado ⚠️ BLOQUEADO (regra mantida, réguas de ICMS, ITCD e parcelamentos bloqueadas); GAP-015 e os 6 altos (001, 002, 004, 007, 017, 023) aceitos em aberto, sem mudança de requisito | Pedro | spec-tech-rules com o quadro confirmado |
| 8 | 2026-11-13 19:34 | spec-iterate | Etapa A (auditoria); ponte do Explore (17 GAPs importados com o mesmo número) | todos os artefatos de outputs/spec/ + outputs/explore/gaps.md | outputs/spec/gaps.md, outputs/spec/gaps-answers.md | 28 GAPs (24 abertos: 2 críticos, 6 altos); novos GAP-018 a GAP-028, com destaque para GAP-028 (sem fonte de consentimento fora do IPVA); 10 pontos cegos checados; GAP-005, 009, 018 e 019 resolvidos pelas decisões de Pedro | Pedro | responder GAP-028 e GAP-015 (críticos) → congelar Explore → spec-tech-rules |
| 7 | 2026-11-13 19:24 | spec-report | layout 3.0; capa curada; domínios visao, documentos, fluxos, revisao, qualidade | outputs/spec/ (context-map, discovery-document, legacy skip, 6 artefatos da spec-product, sync-log, revisao.json) | outputs/spec/capa.md, outputs/spec/report/product-discovery-kit.html | sem benchmark e sem gaps.md do kit (spec-iterate pendente); contador automático da capa infla RF/RN por somar IDs do Explore — números corretos na capa; GAPs abertos em destaque: GAP-001, GAP-002, GAP-004, GAP-015 | Pedro | spec-iterate → spec-tech-rules (após confirmação do quadro técnico) |
| 6 | 2026-11-13 17:28 | spec-product | completo, ramo A, sem benchmark e sem protótipo (isenção); simulação sem horas | context-map.md, discovery-document.md, legacy.md (skip), outputs/explore/ | modules.md, product-vision/product-vision.md, business-rules.md, requirements/requirements.md, product-requirements/product-requirements.md, flow-map.md | 7 módulos; 55 RF (26 Must, 24 Should, 5 Could), 7 RNF, 32 RN-NOVO (9 Derivação com algoritmo), 14 PR de tela; decisões de Pedro aplicadas: score v1 com fallback, controle 3%, distribuição por carga/grupo, Cobrança Ativa fora da v1; flow-map etapas_com_tela=68% · transicoes_com_rn=85,2%; promocao.mjs 85 cobertos, 0 órfãos | Pedro | spec-tech-rules (Tempo B do Plan) |
| 5 | 2026-11-13 17:14 | spec-legacy | LEGACY_SKIPPED: motivo=greenfield · justificativa=kickoff legado=Não e inputs/ só tem especificação, plano e protótipo de validação | inputs/ (classificação do Passo 0), outputs/spec/context-map.md | outputs/spec/legacy.md | modo skip; grafo e sinais N/A (sem código); spec-benchmark fora da simulação por decisão de Pedro | Pedro | spec-product (ramo A) |
| 4 | 2026-11-13 16:12 | spec-ingest | inicial; fontes = outputs/explore/ (âncora arquivo §seção ID) + inputs/; protótipo só como intenção (INF) | outputs/explore/ (5 docs), inputs/especificacoes/ (ETF, wiki), inputs/briefing/ (plano v3), inputs/prototipo/ | outputs/spec/context-map.md, outputs/spec/discovery-document.md | 200 F-xxx (todas as 55 RF e 30 RN do Explore ancoradas), 4 INF, 0 NCR; 6 contradições (score v1 × H2, grupo de controle 3% × ~500, distribuição, Cobrança Ativa, cronograma, contumazes); prontidão 90% (pronto) | Pedro | spec-legacy (skip: sem legado) → spec-product |
| 3 | 2026-11-13 15:25 | pré-projeto Explore (manual) | ramo=A (documentação primeiro), sem protótipo; simulação do fluxo do harness até o backlog, sem horas | inputs/especificacoes/ (ETF, wiki), inputs/briefing/ (plano v3), inputs/prototipo/ (só referência) | outputs/explore/hld-funcional.md, especificacao-funcional.md, especificacao-tecnica.md, modelo-de-dados.md, gaps.md; outputs/spec/revisao.json | 7 módulos, 55 RF e 30 RN preliminares; 17 GAPs; protótipo dispensado (isenção a registrar) | Pedro | isenção do protótipo → fecho do Explore → spec-ingest (Plan) |
| 2 | 2026-11-13 15:16 | backlog-preliminar (fora da cadeia do kit) | resumido, sem protótipo: tarefas por funcionalidade para avaliação | inputs/especificacoes/etf-cobranca-inteligente.pdf (§2.1, §2.2, §3, §4, §6), inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx (slides 7, 9, 14-19, 22-23) | outputs/backlog-preliminar/backlog.json, outputs/backlog-preliminar/kanban.html | Protótipo não será usado por enquanto; 6 funcionalidades (F1-F6) + transversal, 62 tarefas, horas batem com a ETF (224 h + 36 h; 408 h no total) | Pedro | avaliar o kanban → histórias com critérios de aceite e dependências |
| 1 | 2026-11-13 13:35 | kickoff | kickoff: legado=Não · ramo=— · ambiente=claude · inputs=ETF Cobrança Inteligente (PDF), wiki TO-BE refined (HTML + 15 MD), plano de implementação v3 (PPTX anonimizado), protótipo v3 (HTML, 13 telas) | inputs/especificacoes/, inputs/briefing/, inputs/prototipo/ | workspace.md, outputs/spec/sync-log.md | Não existe sistema legado de cobrança (projeto greenfield); nomes dos repositórios aprovados: Teste-backlog (docs), servicenow-cobranca-prototipo, servicenow-cobranca | Pedro | definir ramo (A/B) e insumos em inputs/ → hld-funcional.md |

modulos-kickoff: candidatos=MOD-INGESTAO, MOD-QUALIFICACAO, MOD-SCORE, MOD-REGUAS, MOD-QUALIFICADA, MOD-MONITORAMENTO, MOD-GOVERNANCA (os 7 módulos do Explore, sem fusão nem renomeação) · confirmado_por=Pedro (aprovou seguir com o catálogo e as 4 decisões de escopo) · data=2026-11-13

FLOWMAP_VALID: etapas_com_tela=68.0% · transicoes_com_rn=85.2% · avisos=3 tratados/justificados (estados de etapas automáticas, ver flow-map.md §Cobertura)
TOOL_UNAVAILABLE:vale (binário ausente; rota efêmera por docker falhou: daemon não está rodando)
PROSE_LINTED: arquivos=requirements.md, product-requirements.md · ocorrencias=62 · criticas=4 · corrigidas=4 · justificadas=0 · demais=58 ⚪ agregadas (EngProc.Ambiguidade: 55 «adequado» numa frase repetida, corrigida no gerador; restam 2) · modo=llm · estilos_confirmados=não · relint_pos_4.7=0

PROSE_LINTED: ocorrencias=9 · modo=llm (spec-iterate Etapa A; TOOL_UNAVAILABLE:vale — binário ausente e daemon docker parado)
PROTOTYPE_HARVESTED: camada=skipped · telas_manifesto=0 · avisos_crosscheck=0 — protótipo dispensado por isenção; o HTML v3 em inputs/prototipo/ é só referência e não tem prototype.md
UI_BINDING_AUDITED: n/a — data-model.json e api-contracts.yaml ainda não existem

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
| 2026-11-13 | doc→doc | GAP-005 | decisão no chat (Pedro) | product-vision.md §5 e §8; requirements.md matriz de cobertura; modules.md | Cobrança Ativa por telefone fora da v1 | Pedro |
| 2026-11-13 | doc→doc | GAP-009 | decisão no chat (Pedro) | business-rules.md RN-NOVO-CQ-001; product-vision.md §5 | distribuição por carga ou grupo; vínculo contador ↔ atendente fora da v1 | Pedro |
| 2026-11-13 | doc→doc | GAP-018 | decisão no chat (Pedro) | business-rules.md RN-NOVO-SCO-001; requirements.md MOD-SCORE | score na v1 com critérios determinísticos quando faltar | Pedro |
| 2026-11-13 | doc→doc | GAP-019 | decisão no chat (Pedro) | business-rules.md RN-NOVO-QUA-003 | grupo de controle de 3% da carteira, parametrizável | Pedro |
| 2026-11-13 | doc→doc | GAP-028 | decisão no chat (Pedro) | requirements.md RF-MOD-REGUAS-02, 04, 05; business-rules.md RN-NOVO-REG-002 | marcado ⚠️ BLOQUEADO até haver fonte de opt-in fora do IPVA | Pedro |
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
