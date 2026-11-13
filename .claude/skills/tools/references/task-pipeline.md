# task-pipeline — vocabulário canônico, fases e resolução de rules

> Referência normativa compartilhada. Resolve §2.7 (fases), §2.9 (rules multi-ambiente), §2.1 (paths, ver `paths.md`) e o vocabulário de IDs. Skills apontam para este arquivo em vez de repetir as definições.

## 1. Tabela canônica de fases

| Fase | Skill | Papel |
|---|---|---|
| 0 | spec-init | Bootstrap do repositório (.cursor/ / .claude/ + CLAUDE.md) |
| 1 | spec-frame | Enquadramento, hipóteses e pré-protótipo — antes da ingestão (opcional; material rico pula direto para spec-ingest) |
| 2 | spec-ingest | Ingestão de insumos → context-map + discovery-document |
| 3 | spec-legacy | AS-IS do legado (quando há legado) |
| 4 | spec-benchmark | Análise de mercado |
| 5 | spec-prototype | Protótipo e UI ancorados em negócio |
| 6 | spec-product | Definição de negócio do novo produto |
| iter | spec-iterate | Reconciliação + ciclo de GAPs (cross-fase) |
| 6.5 | spec-tech-rules | Regras técnicas de implementação |
| 6.5-C | spec-scope-change | Alteração de escopo (evento, não etapa) |
| 6.6 | spec-hld | Desenho TO-BE (HLD): containers, integrações, NFR→táticas, ADRs |
| 7a | spec-data-model | Modelo de dados (data-model.json) |
| 7b | spec-api-contracts | Contratos de API (OpenAPI + suplemento) |
| 7c | spec-test-plan | Plano de testes de negócio (UAT) — fonte dos cenários das tasks; não gera work items |
| 8 | spec-tasks | Geração de tasks (tasks.json) |
| 8b | spec-security-review | Revisão de segurança do backlog |
| 8.5 | spec-estimate | Estimativa preditiva & engenharia de delivery |
| 8c | spec-tasks-html | Relatório HTML das tasks |
| 9 | spec-tasks-azure | Publicação no Azure DevOps |
| 10 | spec-scaffold | Scaffold do código |
| 10-C | spec-convert-prototype | Conversão de protótipo HTML/JS → Next.js (apoio à Fase 10, quando há protótipo a migrar) |
| 11 | spec-implement | Implementação dos work items |
| 11c | spec-debug-fix | Debug baseado em evidência & correção (evento, não etapa) |
| 12 | spec-code-audit | Auditoria pós-implementação |
| 13 | spec-status-report | Relatório de status/conclusão para o cliente (executa os testes; lê o ADO) |
| doc | spec-report | Compilação HTML dos documentos (só documentação) |
| doc | spec-estimate-report | Relatório HTML consolidado do pipeline (7 abas, após 8.5) |

`spec` é o orquestrador do discovery (fases 1-6 + iterate). A Fase 1 (`spec-frame`) é opcional: quando o material já é rico, o kickoff pode entrar direto na Fase 2 (`spec-ingest`).

### «Fase N» é reservado a esta tabela

O número de fase identifica a **skill** no pipeline — nunca uma etapa interna dela. Etapas
internas de uma skill usam **letras**: `## Etapa A`, `## Etapa B`, … (ou `## Passo N`, quando a
skill já usa essa forma). Motivo: enquanto `spec-debug-fix` (Fase 11c) numerava as próprias etapas
de 0 a 9, «Fase 10» significava ao mesmo tempo *spec-scaffold* e *o fechamento do debug* — e o
mesmo arquivo citava as duas coisas. Sub-etapas seguem a letra do pai (`Etapa F.6`).

## 2. Vocabulário de IDs

| Prefixo | Significado | Nasce em |
|---|---|---|
| HIP-xxx | Hipótese (de problema, de solução ou de oportunidade) a validar | spec-frame |
| PRB-xxx | Pergunta / pendência de levantamento a levar ao cliente | spec-frame |
| F-xxx | Fato atômico com âncora na fonte | spec-ingest |
| INF-xxx | Inferência | spec-ingest |
| NCR | Item não classificado (revisar) | spec-ingest |
| PD-NNN | Decisão implícita extraída de protótipo | spec-prototype |
| MOD-XXX | Módulo do catálogo modular | spec-product |
| BC | Bounded context | spec-product / data-model |
| RF-MOD-XXX-NN | Requisito funcional por módulo | spec-product |
| RNF | Requisito não funcional (Quality Attribute Scenario) | spec-product |
| RN-xxx / RN-NOVO-xxx | Regra de negócio (legado / novo) | spec-legacy / spec-product |
| GAP-XXX | Lacuna rastreável | **apenas** spec-iterate (gaps.md) e spec-tasks (gaps-document.md) |
| CHG-XXX | Mudança de escopo | spec-scope-change |
| SEC-NNN | Task de segurança | spec-security-review (a task real); recomendação em spec-legacy/code-audit |
| THR-xxx | Ameaça (threat) | spec-legacy (threat-model) |

### Propriedade de GAPs (§2.16)

IDs `GAP-XXX` só são **criados/numerados/fechados** em `gaps.md` (spec-iterate) e `gaps-document.md` (spec-tasks). Todas as demais skills registram lacunas numa seção padronizada, **sem IDs GAP**:

```markdown
## Questões em aberto <!-- id: open-questions -->

| # | Pergunta | Evidência/contexto (F-xxx ou arquivo:linha) | Bloqueia próxima fase? |
|---|----------|---------------------------------------------|------------------------|
```

O spec-iterate varre essas seções e converte cada entrada em `GAP-XXX` com campo `Origem: <artefato>#<n>`. Referenciar GAPs existentes (rastreabilidade) é permitido em qualquer artefato; apenas a criação é exclusiva dos dois donos.

## 3. Resolução de rules multi-ambiente (§2.9)

Ao precisar das rules técnicas do projeto (frontend, security, etc.):

1. Procurar em `.cursor/rules/` (formato `.mdc`).
2. Se ausente, procurar em `.claude/rules/` (formato `.md`).
3. Se ausente em ambos, perguntar ao usuário onde estão / gerar via spec-tech-rules.

**Projeto com o harness Elo.** As rules que o harness traz moram numa subpasta e valem junto com as
da raiz: a `security` e a constituição de frontend (`.claude/rules/harness/security.md` e
`.claude/rules/harness/frontend.md`). Elas não são copiadas para a raiz (Decisão 73 do harness), e a
de frontend só carrega sozinha quando se abre um arquivo de tela da raiz do harness — o código pode
estar noutro repositório, ou ainda nem existir. Por isso quem gera ou altera tela lê a constituição
**explicitamente**. O `frontend` da raiz, quando existe, é o complemento do projeto e remete a ela.

As **rules do projeto prevalecem** sobre defaults do engine. Referir-se às rules por caminho textual ("o arquivo `frontend.mdc` na pasta de rules do projeto"), nunca por link relativo frágil.

## 4. Persistência de kickoff (§2.11)

Decisões de kickoff (legado Sim/Não/Parcial, ramo, ambiente cursor/claude/kiro/ambos, inputs) são gravadas como a **primeira linha da Seção A do sync-log**:

```
kickoff: legado=<Sim|Parcial|Não> · ramo=<A|B> · ambiente=<cursor|claude|kiro|ambos> · inputs=<lista>
```

O `ambiente=` não é pergunta quando há `harness.json`: o orquestrador (`spec`) o deriva do `runtime.rotulo`.

Skills seguintes leem dali e **só perguntam se a informação estiver ausente**.

## 5. Paths

Ver `paths.md` (mesmo diretório). Default `outputs/spec/`, override `PIPELINE_OUTPUTS_DIR`.
