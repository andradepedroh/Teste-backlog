# Auditoria de Entrega — [US-XXX] <título da user story>

- **User Story:** US-XXX — <título>
- **Features/IDs cobertos:** F-XX · RN-XX · CA-XX
- **Branch/commit auditado:** <branch> @ <commit curto>
- **Data:** YYYY-MM-DD
- **Auditor:** skill `auditoria-de-us`

---

## 1. Inventário do delta
**Arquivos/módulos tocados pela US:** <paths reais>
**Endpoints alterados/criados:** <lista ou N/A>
**Entidades/modelos tocados:** <lista ou N/A>
**Stack envolvido no delta:** <linguagem, framework, ORM — do código real>

## 2. Mapa de regressão leve
Contratos e entidades compartilhadas que o delta encosta e que exigem verificação de impacto:
| Ponto vizinho | Por que o delta o afeta | Risco |
|---------------|-------------------------|-------|
| <arquivo/contrato/entidade> | <motivo> | alto/médio/baixo |

## 3. Plano de auditoria executado
**Dimensões auditadas:** <lista das que se aplicam ao delta>
**Não auditado (e por quê):** <ex.: "Race Condition — N/A: a US não toca operação financeira">

## 4. Conformidade
Verificado contra `especificacao-tecnica.md` + `modelo-de-dados.md` + guardrails do `CLAUDE.md`, e contra os CA/RN da US.
| Diretiva / decisão da spec / CA | Arquivo:linha | Status | Observação |
|---------------------------------|---------------|--------|------------|
| <texto exato> | path:L42 | ✅ PASS / ❌ FAIL / ⚠️ PARCIAL / N/A | |

**CA da US cumpridos?** <sim/não — listar cada CA-XX>
**Tecnologia fora da spec sem aprovação?** <não / qual>

## 5. Findings de Segurança
### 5.1 CRÍTICOS/ALTOS — bloqueantes
### 5.2 MÉDIOS/BAIXOS
Formato de cada finding:
> **[SEC-NNN] <nome> — CRÍTICO/ALTO/MÉDIO** · CVSS X.X · OWASP AXX · STRIDE X
> Arquivo: path:L42 · Contexto: <endpoint/entidade da US>
> Problema · Risco · Fix · TDD RED · TDD GREEN · GAP recomendado: GAP-XX

## 6. Testes de mesa (vetores no delta)
| Vetor | Endpoint/dado real da US | Resultado | Evidência |
|-------|--------------------------|-----------|-----------|
| IDOR / Auth Bypass / Priv. Escalation / Injeção / Secret / Mass Assignment / Rate Limit / Race Condition / adicionais | <real ou N/A> | ✅/❌/N/A | path:L42 |

## 7. Findings de Performance
[PERF-NNN — tipo, arquivo:linha, contexto do delta, impacto, fix]

## 8. Findings de Bugs Técnicos
[BUG-NNN — tipo, linguagem, arquivo:linha, cenário, consequência, fix]

## 9. Testes
**CA viraram teste?** <por CA> · **TDD RED/GREEN presente?** <sim/não> · **Cobertura do delta:** <avaliação>
| Arquivo de teste | Cobre caminho feliz? | Cobre erro? | Avaliação |
|------------------|----------------------|-------------|-----------|

## 10. Observabilidade
| Operação nova da US | Logada? | Métrica/trace? | Finding OBS-NNN |
|---------------------|---------|----------------|-----------------|

## 11. Regressão leve
Resultado da verificação dos pontos vizinhos do item 2:
| Ponto vizinho | Impacto detectado? | Evidência |
|---------------|--------------------|-----------|

## 12. Veredito
**Resultado:** ✅ APROVADA / ⚠️ APROVADA COM RESSALVAS / ❌ BLOQUEADA

| Condição de bloqueio | Status |
|----------------------|--------|
| Sem SEC CRÍTICO/ALTO aberto | ✅/❌ |
| Sem BUG ALTO bloqueante | ✅/❌ |
| Todos os CA da US cumpridos | ✅/❌ |
| Nenhuma tecnologia fora da spec sem aprovação | ✅/❌ |
| Todo SEC CRÍTICO/ALTO com GAP registrado | ✅/❌ |

## 13. Pontos a revisar / próximos passos
*(Preencher quando o veredito NÃO for APROVADA.)*
| # | Finding (ID) | Arquivo:linha | O que corrigir | Onde registrar |
|---|--------------|---------------|----------------|----------------|
| 1 | SEC-/BUG-/CONF-NNN | path:L42 | <correção> | `outputs/spec/gaps-document.md` (GAP-NNN) |

---

<!-- gate:status -->
veredito: <APROVADA | APROVADA COM RESSALVAS | BLOQUEADA>
commits-auditados: <Repo@sha-curto por repositório da US, separados por vírgula — ex.: Projeto.Api@3d3a682, Projeto.Web@6abeb08>
achados-bloqueantes: <IDs separados por vírgula, ex.: SEC-001, BUG-003 | nenhum>
<!-- /gate:status -->

> Bloco lido pelo `delivery-gate` (hook PreToolUse) para liberar ou bloquear a integração da US.
> `commits-auditados` traz **um commit por repositório** da US: o gate, ao ver o push de um repo,
> exige que a entrada **daquele repo** esteja entre os commits do push. Em workspace mono-repo a
> forma escalar `commit-auditado: <sha>` continua aceita.
> `achados-bloqueantes` lista os IDs que sustentam um veredito BLOQUEADA; em APROVADA/COM RESSALVAS use `nenhum`.