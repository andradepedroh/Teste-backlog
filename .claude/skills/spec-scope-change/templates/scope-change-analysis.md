---
generated-by: spec-scope-change v1.2
project: "[Nome do Projeto]"
date: "YYYY-MM-DD"
change-documents: []
development-phase: ""
global-risk: ""
delta-size: ""
total-chgs: 0
regressions-identified: 0
---

# Análise de Alteração de Escopo — [Nome do Projeto]

| Campo | Valor |
|-------|-------|
| Documentos de alteração | [lista] |
| Data de análise | YYYY-MM-DD |
| Projeto | [nome] |
| Estado do desenvolvimento | [Especificação / Em desenvolvimento / Em testes / Em produção] |
| Risco global | 🔴 ALTO / 🟡 MÉDIO / 🟢 BAIXO |
| Tamanho estimado do delta | PEQUENO / MÉDIO / GRANDE |
| CHGs identificados | N (X críticos · Y altos · Z médios · W baixos) |
| Regressões potenciais | N tasks afetadas |
| Sigla do change | [sigla definida no kickoff] |

---

## Resumo executivo

[Parágrafo 1: O que muda e por quê — em linguagem de negócio, sem jargão técnico]

[Parágrafo 2: Impacto principal no que já foi desenvolvido — o que pode quebrar]

[Parágrafo 3: O que ainda precisa ser decidido antes de implementar — CHGs críticos]

[Parágrafo 4: Recomendação de próximo passo — ação imediata]

---

## Alterações por documento

### [Nome do Documento de Alteração 1]

**Data do documento:** YYYY-MM-DD
**Origem:** [quem definiu / reunião de origem]

#### Regras definidas

| # | Regra | Tipo | Camadas afetadas |
|---|-------|------|-----------------|
| 1 | [descrição da regra] | ADIÇÃO / ALTERAÇÃO / REMOÇÃO / COMPORTAMENTO_CONDICIONAL / RESPONSABILIDADE / VIGÊNCIA | [camadas] |

#### Impacto por camada

**Negócio:**
[O que muda nas regras de negócio — nova RN, RN alterada, RN removida]

**Contrato de API:**
[Endpoints afetados, campos adicionados/removidos/alterados, novos endpoints, novos erros]

**Modelo de Dados:**
[Tabelas/colunas afetadas, novas entidades, constraints alteradas, migração necessária]

**Tela / UX:**
[Componentes afetados, campos novos/ocultos, novos fluxos, novas mensagens para o usuário]

**Testes / Homologação:**
[Cenários existentes que precisam ser revisados, novos cenários necessários, pré-condições de ambiente]

#### Fora do escopo desta alteração
[Copiar literalmente do documento de alteração — limites declarados]

#### Critérios de aceite de negócio
[Copiar do documento de alteração — base para os cenários de teste das tasks _change]

---

## Análise de regressão

### Código já entregue que a mudança toca

*(Fontes: `spec_story.md` de [pastas de código lidas] · estado das tasks: [ADO `System.State` / `spec_story.md`]. Sem `spec_story.md` com o desenvolvimento iniciado: «busca no código — `SPEC_STORY_ABSENT`». Nada entregue ainda: escrever «nenhum código entregue» no lugar da tabela.)*

| Task ID | Estado | Arquivo e símbolo | Teste que prende o comportamento atual | O que muda |
|---------|--------|-------------------|----------------------------------------|------------|
| TASK-XXX | [Testing / Done / implementada] | [`caminho/arquivo` — `CONSTANTE`, função ou validação] | [`caminho/arquivo.test` — cenário de borda] | [valor ou regra atual → novo] |

### Tasks com risco 🔴 ALTO de regressão

| Task ID | Título | Motivo | Ação necessária |
|---------|--------|--------|-----------------|
| TASK-XXX | [título] | [campo removido / obrigatoriedade alterada / responsabilidade mudou] | [Alterar implementação / Remover campo / Ajustar validação] |

### Tasks com risco 🟡 MÉDIO de regressão

| Task ID | Título | Motivo | Ação necessária |
|---------|--------|--------|-----------------|
| TASK-XXX | [título] | [mesma frente de trabalho / cenário desatualizado / dependência indireta] | [Adicionar cenário de teste / Verificar colateral] |

### Tasks que precisam de novos cenários de teste

| Task ID | Título | Cenário novo necessário |
|---------|--------|------------------------|
| TASK-XXX | [título] | [descrição do cenário que precisa ser adicionado] |

### Tasks sem impacto confirmado 🟢

[Lista de task IDs auditados e considerados seguros, com breve justificativa]

---

## O que pode avançar sem aguardar CHGs

[Lista de implementações que podem ser iniciadas mesmo com gaps em aberto — especificar quais CHGs NÃO bloqueiam cada item]

---

## O que está bloqueado por CHGs

| CHG ID | Severidade | O que bloqueia |
|--------|------------|----------------|
| CHG-001 | CRÍTICA | [spec-data-model_change / spec-api-contracts_change / spec-tasks_change — motivo] |

---

*Documento gerado por spec-scope-change v1.0 — ver scope-change-gaps.md para CHGs detalhados.*
