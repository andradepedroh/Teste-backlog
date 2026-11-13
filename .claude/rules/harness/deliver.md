---
description: Fase Deliver — construção por work item, auditoria por US e gate de push.
paths: ".claude/rules/harness/deliver.md"
---

# 🚀 Deliver — construção

## Comportamento — human *on the loop*

O humano acompanha e decide nos pontos de controle; não revisa cada passo. O que garante
qualidade é o loop fechado por US, não a supervisão contínua.

## Loop por work item

`spec-scaffold` levanta a estrutura inicial. Depois, para cada user story:

```
spec-implement (G3: validar → corrigir → revalidar, por task) → auditoria-de-us → delivery-gate no push → PR
```

O G3 roda dentro da `spec-implement`, em cada task: o `validar.mjs` decide, validadores
independentes julgam e um corretor conserta, até zero bloqueantes. Ver o G3 no `SKILL.md` da skill.

- **Um branch é uma user story.** Convenção recomendada: mesmo nome de branch nos repositórios
  daquela US.
- `outputs/spec/em-andamento.md` é o marcador efêmero da US aberta — existe **se e somente se** há
  US em andamento. **Quem cria** é a `spec-implement`, na primeira task da US:
  `node .claude/ferramentas/andamento.mjs abrir-us --us <US> --repositorios <repos>` copia
  `.claude/templates/em-andamento.md` para o repositório de docs, e o marcador é commitado na branch
  da US. **Quem apaga** é a `auditoria-de-us`, ao fechar a US com veredito diferente de BLOQUEADA,
  commitando a remoção (`MARKER_CLEARED`). Enquanto ele estiver na árvore, o `delivery-gate` nega o
  push.
- **Dependência e status da task** (Mode B, `tasks.json` local): antes de começar,
  `andamento.mjs conferir` diz se a task depende de trabalho não concluído, e o agente pergunta antes
  de seguir; com o G3 em `fim`, `andamento.mjs concluir` grava `status: "DONE"` no `tasks.json`. Em
  Mode A, quem guarda o estado é o Azure DevOps.
- As auditorias vivem em `outputs/spec/auditorias/`.

## O gate e a política de branch

O `delivery-gate` bloqueia o push quando não há auditoria fresca e aprovada ancorada no commit
**daquele repositório**, ou quando o marcador ainda está na árvore do push.

**Ele é a camada local.** É `PreToolUse` em `Bash`: intercepta o `git push` emitido pelo agente.
Push digitado no terminal, disparado pela IDE ou feito de outra máquina não passa por ele. A
garantia autoritativa de que nada sobe sem revisão é o PR e a política de branch do Azure DevOps.

O gate economiza o *round-trip*; ele não substitui a política.

## Auditoria — três granularidades, todas ficam

- o G3 da `spec-implement` valida **cada task**, com correção automática
- `auditoria-de-us` audita o **delta** de uma US, com regressão leve
- `spec-code-audit` varre o **código inteiro** em 7 dimensões no fim, com veredito
  APROVADO/BLOQUEADO

Não é duplicação: são granularidades diferentes. O G3 não substitui a `auditoria-de-us`: é o
`gate:status` dela que o `delivery-gate` lê.

As três usam **o mesmo motor determinístico** — `validar.mjs` na task, `varrer-entrega.mjs
--desde-o-ramo` na US, `varrer-entrega.mjs --tudo` no repositório — e **a mesma regra de rastreio
SEC**: `.claude/references/seguranca/rastreio-sec.md` (Decisões 69 e 74). Achado SEC CRÍTICO/ALTO
só fecha com a task `SEC-NNN` no backlog. Sem ela, a auditoria pergunta se cria a task: com «sim»,
cria no `tasks.json` e no Azure DevOps pelo MCP; com «não», SEC proposto + `GAP-NNN`, e bloqueia.

## Segurança nesta fase

A `revisao-de-seguranca` modo `por-us` **não existe mais**. A `spec-security-review` já injetou
`SEC-NNN` no backlog inteiro, uma vez, no Plan. Sobrevive apenas o modo `plano-geral`, que rodou
no Plan.

## Ferramentas de apoio

- `spec-status-report` — detecta a fase, roda os testes, lê o ADO, gera HTML de acompanhamento
- `spec-scope-change` — virada de escopo
- `spec-debug-fix` — bugs
