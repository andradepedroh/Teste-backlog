# Geradores — scripts da simulação Cobrança 2.6

Scripts usados para montar os artefatos do Plan desta simulação. Servem de **molde** para o próximo
MVP: a estrutura (leitura dos artefatos, montagem do JSON/Markdown, formato exigido pelos
validadores) se reaproveita; o **conteúdo de domínio** embutido em alguns deles não.

Rodar sempre da raiz do repositório, com `python3 -I`.

| Script | Gera | Reaproveitável como está? |
|---|---|---|
| `gerar_context_map.py`, `montar_context_map.py` | `context-map.md` (spec-ingest) | Não — índice de fatos do projeto; usar como molde de formato |
| `sp_dados.py` + `sp_gerar.py` + `sp_telas.py` + `sp_finalizar.py` | `modules.md`, `business-rules.md`, `requirements.md`, `product-requirements.md`, `flow-map.md` (spec-product) | Não — `sp_dados.py` e `sp_telas.py` têm os dados do projeto; `sp_gerar.py` é o molde |
| `it_gaps.py` | `gaps.md` + `gaps-answers.md` (spec-iterate) | Não — lista de GAPs do projeto; molde de formato |
| `dm_gerar.py` | `data-model.json` (spec-data-model) a partir do texto da especificação técnica | Parcial — o parser depende do layout do PDF de origem |
| `ac_gerar.py` | `api-contracts.yaml` + suplemento | Parcial — a lista de fontes/operações é do projeto; erros, schemas e suplemento são genéricos |
| `tp_gerar.py` | `test-plan.md` | Sim, exceto o dicionário `DERIV` (casos de cálculo escritos à mão) |
| `tk_gerar.py` | `tasks.json` (spec-tasks) | Sim — lê tudo de `outputs/spec/`; ajustar textos de `DECISOES`, `SPIKE_GAP`/`SPIKE_MOD` e métricas do épico |
| `sec_gerar.py` | `tasks-sec.json` + história transversal (spec-security-review) | Não — o dicionário `D` (um controle por SEC) é do projeto; o resto é genérico |
| `sr_gerar.py` | `security-review.md` | Sim, revisando a tabela de controles transversais |
| `gd_gerar.py` | `gaps-document.md` | Sim |
| `pendencias.py` | Página HTML de pendências (um botão por decisão) | Sim — ver `pendencias-exemplo.json` |
| `../backlog/gerar-kanban.py` | `outputs/backlog/kanban.html` | Sim |

## Lições que economizam retrabalho

- O hook da zona imutável bloqueia `find`/`cd` dentro de `.claude/skills`: rodar os scripts do kit a partir da raiz, com caminho completo.
- `check-flowmap.py`: toda rota de tela começa com `/`.
- IDs de RNF não podem começar com o prefixo de container (`CON-`): usar `RNF-CONF-*`, `RNF-DES-*` etc.
- Kernel de segurança: SEC adiado não pode ter a palavra «aberto» no Status, senão o `inject-sec.mjs` cobra a tarefa.
- Tasks: nada de `§` nem nome de arquivo `.md`/`.yaml`/`.json` no texto (`NO_EXTERNAL_REFS_IN_TASKS`); colunas do `persistenceModel` com tipo SQL (`VARCHAR(n)`, `INTEGER`…).
- O `enrich-tasks.mjs` repete os critérios de aceite com outro id; o `gerar-kanban.py` esconde as cópias.
- Ferramentas por rota efêmera, sem instalar: `npx --yes @quobix/vacuum`, `npx ajv-cli`.
