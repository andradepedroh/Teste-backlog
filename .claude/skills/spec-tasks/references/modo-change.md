# spec-tasks — modo `_change` (alteração de escopo)

> Lido ao entrar no modo `_change` (os sinais estão na § «Modo _change» do `SKILL.md`).

### O que muda no modo _change

| Aspecto | Modo normal | Modo _change |
|---------|-------------|--------------|
| Entrada principal | requirements.md + data-model.json + api-contracts.yaml | scope-change-analysis.md + scope-change-impact-matrix.md + data-model_change.json + api-contracts_change.yaml + tasks.json existente(s) |
| Escopo de geração | Backlog completo do projeto | **Apenas o delta** — tasks para implementar as alterações de escopo |
| Arquivo de saída | `tasks.json` | `tasks-complementary_change-[sigla].json` |
| Reutilização de IDs | Sequência livre | Continuar numeração a partir do maior ID existente em todos os tasks.json + complementos |
| Regressões | Não se aplica | Tasks de regressão identificadas na análise devem ser incluídas como stories/tasks de correção |

### Kickoff do modo _change

Antes de gerar, confirmar com o usuário:

> "Modo _change ativado. Vou gerar `tasks-complementary_change-[sigla].json`.
>
> Confirmações necessárias:
> 1. Maior ID de task existente nos arquivos anteriores: TASK-XXX-XXX → próximo ID: TASK-XXX-XXX
> 2. CHGs CRÍTICOS e ALTOS respondidos em scope-change-gaps.md? ✅ / ❌
> 3. Incluo tasks de correção de regressão? ✅ Sim ([N tasks com risco ALTO]) / ❌ Não
> 4. Hierarquia de backlog: usar a mesma do tasks.json original? ([chosen atual]) ✅ / Ajustar?"

### Ordem de execução no modo _change

```
A_change → Carregar todos os artefatos _change + tasks.json(s) existentes
         ↪ Mapear maior ID de story e task usados → definir sequência de continuação
         ↪ Verificar CHGs com "Bloqueante para: spec-tasks_change" — devem estar respondidos

B_change → Para cada alteração em scope-change-analysis.md:
         ↪ Adições → novas stories/tasks de implementação
         ↪ Alterações → tasks de modificação (descrever claramente o que muda)
         ↪ Remoções → tasks de remoção/deprecação de código (não ignorar)
         ↪ Comportamento condicional → tasks que implementam a lógica condicional

C_change → Para cada regressão identificada (risco ALTO):
         ↪ Criar task de correção linkada à task original afetada
         ↪ Incluir no `agentExecutionContext.selfContainedSummary` o contexto de
           "o que estava implementado" e "o que precisa mudar"

D_change → Para cada novo cenário de teste identificado:
         ↪ Criar task de teste com cenários BDD específicos para o delta

E_change → Enriquecimento com artefatos _change (mesmas regras de auto-suficiência)
         ↪ Embutir conteúdo de data-model_change.json → persistenceModel das tasks afetadas
         ↪ Embutir conteúdo de api-contracts_change.yaml → apiContracts das tasks afetadas
         ↪ CRÍTICO: se um campo foi removido, o selfContainedSummary deve explicitar isso

F_change → Emitir tasks-complementary_change-[sigla].json
         ↪ Incluir em metadata:
           { "changeMode": true,
             "changeId": "[sigla]",
             "sourceAnalysis": "scope-change-analysis.md",
             "basedOnTasks": ["tasks.json", "tasks-complementary-*.json"],
             "regressionTasksIncluded": true/false,
             "breakingChangesAddressed": ["CHG-001", ...] }
```

### Regras específicas do modo _change

1. **Nunca sobrescrever** tasks.json existente — saída é sempre `tasks-complementary_change-[sigla].json`
2. **Continuar a numeração** de IDs a partir dos existentes — nunca reiniciar do STORY-001
3. **Tasks de remoção** são obrigatórias quando há REMOÇÃO no delta — não ignorar silenciosamente
4. **Tasks de correção de regressão** devem referenciar a task original no campo `relatedTasks`
5. **selfContainedSummary** de tasks _change deve incluir seção "Contexto da Alteração" explicando por que esta task existe (qual mudança de escopo a originou)
6. **Todos os validadores de auto-suficiência** (TASK_HAS_FULL_SUMMARY, etc.) aplicam-se igualmente no modo _change
7. **Se não há tasks a gerar** (ex.: apenas tasks de teste), ainda assim emitir o arquivo com nota explicativa em metadata
