# spec-tasks — task de UAT (legado)

> Lido só ao validar um `tasks.json` antigo com `--allow-uat`. A geração de task `uat` é proibida:
> `NO_UAT_BACKLOG` é FATAL.

### Task de UAT (legado) — `selfContainedSummary` é OBRIGATÓRIO

Vale **apenas** para `tasks.json` antigos validados com `--allow-uat` — a geração de tasks `uat`
está proibida (`NO_UAT_BACKLOG`). O exemplo
[`templates/tasks.uat-task-example.json`](./templates/tasks.uat-task-example.json) mostra
`agentExecutionContext.selfContainedSummary` na task de UAT. **Isto é exigência, não ilustração**
(a medição do incidente que a motivou está em `./HISTORY.md`).

Gate **`UAT_TASK_HAS_SUMMARY` (FATAL)** — para `class=uat`:

1. `agentExecutionContext.selfContainedSummary` **presente**, com ≥200 caracteres (piso menor que o
   de `functional`: é um roteiro de execução humana, não a transcrição de um RF);
2. os casos de teste cobertos **nomeados** — `testCaseIds[]` preenchido **ou** `TC-NNN` citado no
   summary/description. Sem isso não há como saber o que foi (ou não foi) homologado;
3. `minimumOutputToDeliver[]` preenchido (WARNING) — o entregável da homologação declarado.

A isenção de `uat` vale para o contrato **técnico**, não para o roteiro — é justamente o roteiro que
a task de UAT entrega.

> **Sobre "Consultar o roteiro completo em `test-plan.md`" no exemplo.** Essa linha é **legítima** e
> **não** é reprovada: `NO_EXTERNAL_REFS_IN_TASKS` isenta `test-plan.md` para `class=uat` (e **só**
> `test-plan.md` — ver a linha `uat` da tabela acima). A task de UAT é um script de execução humana e
> o roteiro é a fonte de quem executa. Qualquer outro artefato de especificação citado numa task de
> UAT continua **FATAL**.
