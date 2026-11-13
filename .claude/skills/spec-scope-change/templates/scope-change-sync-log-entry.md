---
generated-by: spec-scope-change v1.2
project: "[Nome do Projeto]"
date: "YYYY-MM-DD"
---

# Entrada para sync-log.md

> Copiar a linha abaixo e colar na Seção A do `sync-log.md` do projeto. O formato segue as
> **9 colunas canônicas** da Seção A (dono: `spec-iterate/templates/sync-log.md`) — colar sem
> remover nem reordenar colunas.

## Etapa A — Análise do delta

| # | Data/Hora | Skill | Modo / contexto | Inputs consumidos | Outputs gerados | Decisões-chave | Decisor | Próximo passo |
|--:|-----------|-------|-----------------|-------------------|-----------------|----------------|---------|----------------|
| 1 | YYYY-MM-DD HH:MM | spec-scope-change | Etapa A — análise de [N] documentos de alteração | [documentos de alteração], tasks.json, [artefatos existentes] | scope-change-analysis.md, scope-change-impact-matrix.md, scope-change-gaps.md, scope-change-sync-log-entry.md | Risco global [🔴/🟡/🟢], tamanho [PEQUENO/MÉDIO/GRANDE]; [1–3 decisões-chave]; [N] CHGs em aberto ([resumo por severidade]) | [consultor/área] | Responder scope-change-gaps.md com a área negocial; rodar spec-data-model (modo _change) |

## Etapa B — Propagação das respostas

| # | Data/Hora | Skill | Modo / contexto | Inputs consumidos | Outputs gerados | Decisões-chave | Decisor | Próximo passo |
|--:|-----------|-------|-----------------|-------------------|-----------------|----------------|---------|----------------|
| 2 | YYYY-MM-DD HH:MM | spec-scope-change | Etapa B — propagação de [N] CHGs respondidos | scope-change-gaps.md (Respostas preenchidas) | scope-change-analysis.md, scope-change-impact-matrix.md, scope-change-gaps.md (atualizados) | CHGs fechados: [lista]; [N] ainda em aberto ([lista], `dep. externa` se aplicável) | [nome/área decisora] | [skills liberadas em modo _change — ex.: spec-data-model, spec-api-contracts] |

---

*Gerar a linha de Etapa B apenas quando a Etapa B desta skill for executada — não antecipar antes das respostas chegarem.*
