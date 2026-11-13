# Protótipo e UI — [Nome do Projeto]

Status: draft | validado | aprovado
Última atualização: YYYY-MM-DD
Modo: análise | geração | análise+geração | documentar-protótipo
Fidelidade: baixa | média | alta
Fonte: legacy.md + [Figma URL / código / URL / etc.]
Rule aplicada: .cursor/rules/frontend.mdc | frontend-decisions.md | N/A (documentar-protótipo)

<!-- id: exp-summary -->

## Resumo da sessão

- Objetivo: (análise / geração / documentar protótipo existente)
- Artefatos de negócio disponíveis como entrada: (legacy.md sim/não | requirements.md sim/não | business-rules.md sim/não)
- PD-xxx gerados nesta sessão (só modo documentar-protótipo): N itens — ver seção PD abaixo

<!-- id: screen-inventory -->

## Inventário de telas

*(SKILL §Passo 3.1.5 / validador `SCREEN_INVENTORY_COMPLETE`. Uma linha por tela que o frontend final precisa ter — derivada de 5 fontes: A `flow-map.md` (TEL-xxx), B todo RF, C entidades/cadastros (conjunto CRUD), D perfis e acesso, E transversais (home, navegação, parâmetros, relatórios, notificações). O `flow-map.md` é o mínimo, não o teto. ID = `TEL-xxx` quando já existe no flow-map, `TEL-NEW-nn` quando descoberta aqui (registrar em Divergências para o spec-iterate incorporar). Status = gerada | stub (só fidelidade Média) | pendente (proibido em Alta).)*

| ID | Rota | Nome | Tipo (lista / formulário / detalhe / dashboard / modal / autenticação / configuração / relatório) | Origem (FLX/RF/entidade/perfil/transversal) | Módulo (código do módulo) | Status |
|----|------|------|------|--------|--------|--------|

**Regra «sem ponta solta» conferida:** [ ] todo dado exibido/selecionado tem tela de origem · [ ] toda ação leva a rota existente · [ ] todo `MOD-xxx` tem tela e está no menu · [ ] toda entidade tem CRUD ou justificativa

**Resumo:** telas=[N] · do flow-map=[N] · novas (TEL-NEW)=[N] · RF cobertos=[N]/[M] · entidades com CRUD=[N]/[M] · geradas=[N] · stub=[N] · pendente=[N]

<!-- id: ui-anchors -->

## Mapeamento UI → negócio

*(As 7 primeiras colunas são obrigatórias — SKILL §Passo 4 / validador `UI_BUSINESS_TABLE_7COLS`. "Notas" é a 8ª coluna, opcional, para comentário livre. Toda linha do Inventário de telas acima tem uma linha aqui.)*

| UI (rota / componente) | Domínio (código do módulo) | HU (ou PD-xxx) | RN (ou PD-xxx) | KPI | Ref. (F-xxx / legacy §) | Estados erro/vazio/carga (ou PENDÊNCIA) | Notas *(opcional)* |
|------------------------|---------------------|----------------|----------------|-----|--------------------------|-----------------------------------|----------------------|

<!-- id: pd-discovered -->

## Itens descobertos no protótipo (PD-xxx) — só modo documentar-protótipo

*(Migrar para legacy.md quando spec-legacy for executado)*

| ID | Tipo (HU / RN / KPI / Fluxo) | Descrição | Domínio inferido | Fonte no protótipo | Prioridade de migração |
|----|-------------------------------|-----------|------------------|--------------------|------------------------|
| PD-001 | | | | Figma frame X / src/Y.tsx linha N | Alta / Média / Baixa |

<!-- id: journeys -->

## Jornadas e pontos de atrito

*(Por persona: passos felizes + variantes + risco de abandono. Ligar a FL-XX e HU-XX do legacy quando existirem, ou PD-xxx quando ainda não houver legacy.)*

<!-- id: divergences -->

## Divergências protótipo ↔ documento

*(Preenchido quando Modo Análise detecta diferenças. Para cada divergência: tipo, decisão tomada, propagação.)*

| Rota / componente | O que o protótipo faz | O que o documento diz | Decisão | Propagado para |
|-------------------|-----------------------|-----------------------|---------|----------------|

## Questões em aberto <!-- id: open-questions -->

*(Decisões de UX que faltam: RN não refletida, conflito entre documento e `frontend.mdc`, estado sem definição, ambiguidade não resolvida. Esta skill não cria IDs `GAP-XXX` — ver `../../tools/references/task-pipeline.md`. Se a questão já corresponde a um `GAP-XXX` existente em `gaps.md`, citar o ID na coluna Evidência/contexto; nunca criar um ID novo aqui.)*

| # | Pergunta | Evidência/contexto | Bloqueia próxima fase? |
|---|----------|---------------------|-------------------------|

<!-- id: artifacts-needed -->

## Artefatos que precisam ser criados/atualizados após esta sessão

*(Só preencher quando há PD-xxx ou divergências)*

- [ ] context-map.md — adicionar F-xxx das fontes visuais
- [ ] legacy.md — migrar PD-xxx (HUs, RNs, KPIs descobertos)
- [ ] business-rules.md — atualizar RN-XXX corrigidas
- [ ] requirements.md — atualizar RF-XXX impactados
- [ ] sync-log.md — registrar propagações desta sessão
