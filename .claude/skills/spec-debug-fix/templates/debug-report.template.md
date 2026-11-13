# Debug Report — <TASK-ID> · <título curto do retorno>

> Gerado por `spec-debug-fix` em <data>. Baseline: <repo@commit> (+ demais repos).
> Classe da falha: **(a) CÓDIGO | (b) DADO/CARGA | (c) AMBIENTE | (d) CONFORME SPEC** — por sintoma, se houver mais de um.

## 1. Resumo executivo

| Campo | Valor |
|-------|-------|
| Task/bug | <TASK-ID> — <fonte: ADO/tasks.json/texto> |
| Sintoma(s) | S-01: <resumo> · S-02: <resumo> |
| Causa-raiz | <uma frase, com EVID-NN citado> |
| Classe | (a)/(b)/(c)/(d) |
| Fix | <uma frase> ou N/A (classe b/c/d) |
| Regressão | <suítes rodadas e resultado> |
| Pendências externas | <lista ou "nenhuma"> |

## 2. O que foi reportado (Etapa A)

- **Esperado:** …
- **Observado:** …
- **Payload(s) de exemplo:** (literal)
- **Ambiente do relato:** <URL/data/usuário de teste>

## 3. Mapa do fluxo (Etapa B)

Ver `flow-map.md`. Etapas relevantes ao diagnóstico:

| # | Etapa | Repo | Arquivo:linha | O que decide |
|---|-------|------|---------------|--------------|

## 4. Baseline do código (Etapa C)

| Repo | Branch | Commit | Divergências vs handoff |
|------|--------|--------|-------------------------|

## 5. Reprodução (Etapa F)

| Cenário | Payload | Resultado | Reproduziu? |
|---------|---------|-----------|-------------|

Paridade de ambiente (diferenças vs relato): …

## 6. Diagnóstico (Etapa G)

### Hypothesis ledger

| H-ID | Hipótese | Previsão observável | Evidência | Status |
|------|----------|---------------------|-----------|--------|

### Evidências

```
EVID-01 — <serviço> · <origem> · <timestamp> · traceId=<id>
> trecho literal do log
Interpretação: …
```

### Causa-raiz

<Afirmação causal citando EVID-NN + classificação justificada.>

## 7. Correção (Etapa H) — somente classe (a)

- **Diff:** <arquivos tocados, resumo por camada/repo>
- **Teste de regressão RED→GREEN:** `<arquivo::teste>` — saída RED (baseline) e GREEN (pós-fix)
- **Compatibilidade preservada:** <contratos/serialização/idempotência verificados>

## 8. Verificação end-to-end (Etapa I)

| Sintoma | EVID antes | EVID depois |
|---------|-----------|-------------|

Limites reconhecidos (dependência de dado/carga/credencial): …

## 9. Análise de regressão (Etapa J)

| Mudança | Usado também por | Risco | Verificação feita |
|---------|------------------|-------|-------------------|

- **Suítes executadas:** <comando → resultado>
- **Riscos residuais:** …

## 10. Higiene da instrumentação (Etapa K)

Ver `instrumentation.md`. Verificação final: `grep DEBUG-FIX(<TASK-ID>)` → <resultado>.
Itens retidos de propósito (higiene pré-merge): …

## 11. Dependências externas pendentes

| # | Dependência | Classe | Dono sugerido | Evidência |
|---|-------------|--------|---------------|-----------|

## 12. Warnings emitidos

`ENV_DEPENDENCY_PENDING` / `NO_AUTOMATED_REPRO` / `INSTRUMENTATION_RETAINED` / `TIMEBOX_REACHED` / `FLAKY_SUSPECTED` / `NO_SPEC_CONTEXT` / `ENV_PARITY_GAP` — <quais e por quê>

---

## 13. Rascunho do comentário para o work item (publicar SÓ com aprovação)

> **Retorno de teste — diagnóstico e correção**
>
> **Causa-raiz:** …
> **O que foi feito:** …
> **Como validar:** …
> **Depende de terceiros:** …
> **Regressão:** suítes <X> verdes; teste permanente `regression_<TASK-ID>_<sintoma>` adicionado.
