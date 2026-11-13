---
generated-by: spec-scope-change v1.2
project: "[Nome do Projeto]"
date: "YYYY-MM-DD"
---

# Matriz de Impacto — Alteração de Escopo — [Nome do Projeto]

**Audiência:** devs, QA
**Propósito:** mapa rápido e visual do que muda em cada camada e artefato

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🔴 | Impacto direto — alteração necessária |
| 🟡 | Impacto indireto — verificar e possivelmente ajustar |
| 🟢 | Sem impacto confirmado |
| ➕ | Novo artefato / entidade / endpoint |

---

## Impacto por camada e elemento

| Camada | Elemento | Tipo | Descrição da mudança | CHG relacionado |
|--------|----------|------|-----------------------|------------------|
| Negócio / Contrato / Dados / Tela / Testes | [nome do elemento] | 🔴 / 🟡 / 🟢 / ➕ | [descrição objetiva da mudança] | CHG-XXX |

---

## Tasks existentes afetadas

| Task ID | Risco | Tipo de impacto | Ação necessária |
|---------|-------|------------------|-------------------|
| TASK-XXX | 🔴 ALTO / 🟡 MÉDIO | [campo removido / obrigatoriedade alterada / cenário desatualizado] | [ação concreta] |

---

## Novos artefatos necessários

| Artefato | Tipo | Skill geradora | Arquivo de saída (_change) |
|----------|------|-----------------|------------------------------|
| [nome] | entidade / endpoint / tela / cenário de teste | spec-data-model / spec-api-contracts / spec-tasks | [arquivo]_change.[ext] |

---

*Documento gerado por spec-scope-change v1.0 — ver `scope-change-analysis.md` para o detalhe narrativo e `scope-change-gaps.md` para os CHGs completos.*
