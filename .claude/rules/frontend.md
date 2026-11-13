---
description: "Interface da Cobrança Inteligente: telas nativas do ServiceNow por papel e dois dashboards do Platform Analytics, como exceção ao padrão Next.js da empresa"
alwaysApply: false
paths: **/*.xml
---

# Frontend — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> Stack customizada pelo cliente: **interface nativa do ServiceNow** (listas, formulários,
> listas relacionadas e filtros salvos por papel) mais **dois dashboards do Platform Analytics**.
> Exceção registrada ao padrão da empresa (Next.js App Router + shadcn/ui, em `frontend-default.mdc`
> e na rule de frontend do harness). Fonte: ETF §1.1 e §6.6; quadro técnico itens 1.3 e 9.1.

> Por que: a ETF não prevê nenhuma tela customizada; construir React aqui seria um segundo
> produto para manter, fora do escopo contratado.

---

## O que vale do padrão da empresa

- **Acessibilidade WCAG 2.2 AA** (a rule de frontend do harness é a dona do nível) — item 9.2.
- **Seis estados de interface** de cada tela (carregando, sucesso, erro de validação, erro de sistema, vazio, sem conexão), como descritos em `product-requirements.md`.
- Textos em **português do Brasil** (item 9.3), sem termos técnicos na tela.

## O que não vale

- Next.js, React, shadcn/ui, Tailwind, React Query: não se aplicam.
- Widgets, páginas de UI Builder, workspace e portal: fora do escopo (ETF §1.1).

## Regras das telas nativas

**MUST:**
- Cada tela de `product-requirements.md` vira **módulo de menu** com lista ou formulário e **filtro salvo** por papel.
- Ordenação default e colunas exatamente como no inventário de campos do PR da tela.
- Situação nunca indicada só por cor (Falha, Em risco, abaixo da meta têm texto).
- Painéis só para Coordenador (Institucional) e Gestor de Integração + Coordenador (Score); atendente não vê dashboard.

**MUST NOT:**
- Client Script com regra de negócio (a regra mora no Script Include — ver architecture.mdc).
- UI Policy como única proteção de campo (proteção é ACL).

## Anti-padrões

- Tela customizada para «melhorar» uma lista nativa.
- Campo editável na tela que a ACL bloqueia (o usuário vê o erro só ao salvar).
- Rótulo em inglês herdado do campo técnico.
