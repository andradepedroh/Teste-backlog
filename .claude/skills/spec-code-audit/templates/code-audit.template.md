# Code Audit — [Nome do Projeto]

Data: YYYY-MM-DD
Versão auditada: [branch/commit]
Auditor: spec-code-audit v2.3

---

## 1. Inventário do Projeto

**Stack:** <linguagem, framework, banco, ORM, auth, cache — derivado de A.2>
**Camadas:** <frontend / backend / workers — derivado de A.1>
**Endpoints mapeados:** N | **Com dado sensível:** N
**Entidades:** N | **Com PII:** N | **Com dado financeiro:** N
**Módulos com `spec_story.md` consultado:** N (ver A.9)

---

## 2. Plano de Auditoria Executado

[Resumo de A'.7 — o que foi e o que não foi auditado, com justificativa]

---

## 3. Auditoria de Conformidade

### Score por Rule
[tabela do Passo B.2]

### Não-conformidades
[achados FAIL com arquivo:linha e diretiva violada]

---

## 4. Findings de Segurança

### 4.1 CRÍTICOS — bloqueantes
[findings SEC-NNN CRÍTICO do Passo C.3 — cada um com task SEC de rastreabilidade (I.3)]

### 4.2 ALTOS — bloqueantes
[findings SEC-NNN ALTO do Passo C.3 — cada um com task SEC de rastreabilidade (I.3)]

### 4.3 MÉDIOS — próximo sprint
[findings SEC-NNN MÉDIO do Passo C.3]

---

## 5. Resultado dos Testes de Mesa

| Vetor | Endpoint / Dado real | Resultado | Evidência |
|-------|---------------------|-----------|-----------|
| IDOR | <endpoint real de A.3> | ✅ / ❌ / N/A | arquivo:linha |
| Auth Bypass | <endpoint real> | ✅ / ❌ / N/A | |
| Privilege Escalation | <endpoint real> | ✅ / ❌ / N/A | |
| Injection | <query real de A.4> | ✅ / ❌ / N/A | |
| Secret Exposure | — | ✅ / ❌ | |
| Mass Assignment | <endpoint real> | ✅ / ❌ / N/A | |
| Rate Limiting | <endpoint de auth real> | ✅ / ❌ / N/A | |
| Race Condition | <operação real ou N/A> | ✅ / ❌ / N/A | |
| [adicionais derivados do stack] | | | |

---

## 6. Findings de Performance

[findings PERF-NNN do Passo E.3 por impacto]

---

## 7. Findings de Bugs Técnicos

[findings BUG-NNN do Passo F.3 por severidade]

---

## 8. Auditoria de Testes

### Score de Testes: X%
### Módulos sem cobertura adequada
[tabela de G.2 — apenas ⚠️ e ❌]
### Fluxos críticos sem cobertura
[tabela de G.3 — apenas não cobertos]
### Anti-padrões encontrados
[tabela de G.4 — apenas encontrados, com arquivo:linha]
### Testes SEC implementados
[tabela de G.5 — cruzando `security-review.md` E/OU tasks SEC do `tasks.json`]

---

## 9. Auditoria de Observabilidade

### Score OBS: X%
### Gaps de logging
[itens ❌ de H.1]
### Gaps de traces
[itens N/A ou ❌ de H.2 — se aplicável]
### Gaps de métricas técnicas
[itens ❌ de H.3]
### Gaps de métricas de negócio
[eventos sem instrumentação de H.4]
### Findings OBS-NNN
[findings do Passo H.5]

---

## 10. Inventário de Dependências com Risco

[tabela do Passo A.8 — apenas dependências com risco identificado]

---

## 11. Plano de Remediação

Ordenado por severidade. Para cada finding CRÍTICO/ALTO de segurança, a coluna **Task SEC**
é obrigatória (I.3 — Regra de Ouro): a task do backlog — já existente ou criada agora, com o «sim»
do usuário — ou, se ela ainda não existe, o `SEC-NNN` proposto e o `GAP-NNN` registrado em
`gaps-document.md`. Sem task registrada no backlog, o finding
não pode ser considerado fechado mesmo que o código já esteja corrigido.

| Prioridade | Finding | Ação | Esforço | Task SEC (tasks.json/ADO) — ou SEC proposto + GAP | Bloqueia deploy? |
|-----------|---------|------|---------|---------------------------------------------------|-----------------|
| 1 | SEC-NNN | | XS/S/M/L | SEC-NNN / ADO#NNN — ou — SEC-NNN (proposto) · GAP-NNN | sim |

---

## 12. Decisão de Deploy

| Condição | Status |
|---------|--------|
| Sem SEC CRÍTICO | ✅ / ❌ |
| Sem SEC ALTO | ✅ / ❌ |
| Sem BUG ALTO | ✅ / ❌ |
| Conformidade ≥ 80% | ✅ / ❌ |
| Nenhum tipo de teste obrigatório ausente | ✅ / ❌ |
| Health check presente | ✅ / ❌ |
| Métricas de negócio instrumentadas | ✅ / ❌ |
| Todo SEC CRÍTICO/ALTO tem task SEC registrada (I.3) | ✅ / ❌ |

**Resultado:** ✅ APROVADO / ❌ BLOQUEADO / ⚠️ APROVADO COM PLANO DE AÇÃO
