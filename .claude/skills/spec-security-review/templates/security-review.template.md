# Security Review — [Nome do Projeto]

Data: YYYY-MM-DD
tasks.json analisado e modificado: vX.X → vX.X+sec
Analista: spec-security-review v1.3

---

## Sumário Executivo

| Métrica | Valor |
|---------|-------|
| Stories analisadas | N |
| Stories sem gaps (nenhuma task SEC) | N |
| Stories com tasks SEC injetadas | N |
| Story de controles transversais | criada / reutilizada (ID: STORY-SEC-TRANSVERSAL) |
| **Tasks SEC-NNN injetadas no tasks.json** | **N** |
| Tasks CRÍTICO injetadas | N |
| Tasks ALTO injetadas | N |
| Tasks MÉDIO injetadas | N |
| Findings não injetados (backlog futuro) | N |

---

## Tasks SEC Injetadas por Story

### [STORY-ID] — <título>

**Operação dominante:** <tipo> | **Dados sensíveis:** <PII/financeiro/nenhum> | **Riscos:** AXX · AXX

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-NNN | … | CRÍTICO/ALTO/MÉDIO | X.X | AXX | XS/S/M/L | <nome do controle> |

*(repetir para cada story com tasks SEC — coluna Esforço reflete `effortEstimate`, que alimenta `durationEstimatedDays` na task: XS=0,25 · S=0,5 · M=1 · L=2 dias)*

---

## Story de Controles Transversais

**Story:** STORY-SEC-TRANSVERSAL | **Criação:** nova / reutilizou [ID]

| Task | Controle cross-cutting | Severidade | CVSS | Esforço |
|------|----------------------|------------|------|---------|
| SEC-NNN | Setup de autenticação (hash + sessão) | ALTO | 8.1 | M |
| SEC-NNN | RBAC / política de autorização global | ALTO | 8.1 | M |
| SEC-NNN | Rate limiting em auth | MÉDIO | 5.3 | S |
| SEC-NNN | Headers de segurança (HSTS, CSP) | MÉDIO | 4.8 | XS |

---

## Referência de Auditoria — Findings CRÍTICO e ALTO

*(Para rastreabilidade do time de segurança. As tasks já estão no tasks.json.)*

### [SEC-NNN] <Nome> — CRÍTICO / ALTO

**CVSS:** X.X | **Severidade:** CRÍTICO/ALTO (Prob. × Impacto) | **OWASP:** AXX (Top 10:2025) | **STRIDE:** X
**Story:** STORY-ID | **security.mustCompleteBeforeStoryClose:** true
**Problema:** <gap identificado na especificação>
**Risco:** <o que um atacante consegue>
**TDD RED:** <asserção que prova o ataque>
**TDD GREEN:** <asserção que valida a defesa>

*(repetir para cada finding CRÍTICO e ALTO)*

---

## Findings não injetados (backlog futuro)

**Seção obrigatória.** Cobre os findings **MÉDIO com esforço M/L** e **todo finding BAIXO**
identificados no Passo C.4 que **não** foram injetados como task SEC-NNN no `tasks.json` —
eles não bloqueiam a story, mas precisam ficar rastreados. Usar o formato de finding da rule
`security.md` do projeto:

```
### [SEC-NNN] <Nome da vulnerabilidade> — MÉDIO / BAIXO

**CVSS:** X.X | **OWASP:** AXX / API-X | **STRIDE:** S/T/R/I/D/E
**Camada:** Frontend / Backend / Database / API / Auth / AI / Pipeline
**Problema:** <o que está errado no código/design — referência a story/task se possível>
**Risco:** <o que um atacante consegue ao explorar — ação concreta>
**Fix:** <correção recomendada — pseudocódigo ou padrão independente de linguagem>
**Teste (RED → GREEN):**
  RED:  <asserção que prova o ataque — deve falhar sem a defesa>
  GREEN: <asserção que valida a defesa — deve passar com o fix>
```

**Destino de cada severidade:**

| Severidade | Ação |
|-----------|------|
| MÉDIO (esforço M/L) | Registrar aqui; priorizar como task no **próximo sprint** — não bloqueia a story atual |
| BAIXO | Registrar aqui como **tech debt** — sem prazo definido |

*(repetir para cada finding MÉDIO/BAIXO não injetado; omitir a subseção de severidade sem findings)*

---

## Análise de Cobertura por Story

[resultado completo do Passo C por story — tabela de controles ✅/⚠️/❌]

---

## Controles Cross-Cutting

[tabela do Passo D com status de cada controle transversal]

---

## Ameaças do AS-IS não mitigadas no TO-BE

[THR-X-NNN do threat-model.md sem controle correspondente nas tasks — omitir seção se threat-model não disponível]

---

## Recomendações de Arquitetura de Segurança

[decisões estruturais que não viram tasks mas devem ser consideradas no scaffold — ex.: ausência de middleware de autenticação centralizado, necessidade de política de CORS global, biblioteca de rate limiting a incluir no scaffold]
