# spec-tech-rules

**Fase 6.5 do fluxo de especificação** — gera as regras técnicas de implementação de um projeto antes de `spec-data-model`.

---

## O que é

Uma skill interativa que lê os documentos de negócio já gerados (`discovery-document.md`, `requirements.md`, `product-requirements.md`), monta um perfil do projeto e conduz um kickoff estruturado de decisões técnicas. Ao final, gera as rules em `outputs/spec/tech-rules/*.mdc` (fonte versionada) e **materializa cópias diretamente** em `.cursor/rules/` e/ou `.claude/rules/` do repositório de implementação, conforme o ambiente escolhido no kickoff — nada a copiar manualmente.

Esses arquivos são o "constitution" técnico do projeto — todo agente de IA que implementar neste projeto lerá essas regras automaticamente: o Cursor via `globs`/`alwaysApply` em `.cursor/rules/*.mdc`, o Claude Code/Cowork via `paths` (ou sempre, se ausente) em `.claude/rules/*.md`.

---

## Posição no fluxo

```
spec-product
    ↓
spec-iterate
    ↓
spec-tech-rules  ◄ você está aqui
    ↓
spec-data-model
    ↓
spec-api-contracts
    ↓
spec-tasks
```

---

## Como invocar

No Cursor ou no Claude (Code/Cowork), digitar qualquer um destes triggers:

- `criar regras técnicas`
- `definir arquitetura`
- `tech rules`
- `setup técnico`
- `definir stack`
- `regras de implementação`
- `configurar cursor rules`

---

## O que a skill faz

### Passo 0 — Leitura de contexto

Antes de qualquer pergunta, lê os documentos de produto e extrai sinais que fundamentam as sugestões:

| Sinal | Fonte |
|-------|-------|
| Volume / SLO de latência | RNF em `requirements.md` |
| Dados pessoais / LGPD | `business-rules.md` |
| Integrações externas | `context-map.md`, `discovery-document.md` |
| Módulos de negócio | Seções `## Módulo:` em `requirements.md` |
| Fluxos de UI | `product-requirements.md` |
| Regras de negócio complexas | `business-rules.md` |
| Equipe / prazo | `discovery-document.md` |
| Cliente governamental | `discovery-document.md` |

Toda sugestão cita o documento e a seção que a embasa. Exemplo:
> *"requirements.md §RNF-03 exige latência < 200ms → Redis distribuído obrigatório"*

### Passos 1–2 — Kickoff interativo (10 blocos)

| Bloco | Decisões cobertas |
|-------|------------------|
| 1 — Linguagem e Runtime | Backend, versão, frontend |
| 2 — Arquitetura | Estilo (monolito/microserviços), padrão interno (hexagonal/layered), SOLID/Clean Code, comunicação entre módulos |
| 3 — Persistência | Banco, acesso a dados, migrações, cache, mensageria |
| 4 — Convenções | Idioma do código, naming de banco, versionamento de API, formato de erro, paginação, tratamento de exceções |
| 5 — Testes | Estratégia, cobertura, E2E (ferramenta + escopo UI/API), carga/performance |
| 6 — Observabilidade | Nível (completo/mínimo/nenhum), stack/destino, formato de log, métricas de negócio |
| 7 — Auth e Autorização | Autenticação, autorização (RBAC/ABAC), auditoria LGPD, rate limiting, idempotência |
| 8 — Deploy e Build | Containerização, ambientes, branching, infraestrutura compartilhada |
| 9 — Frontend | Stack (padrão empresa ou customizada), acessibilidade, i18n |
| 10 — Integrações | APIs externas, autenticação por integração, circuit breaker, PII |

### Passo 3 — Revisão consolidada

Apresenta resumo de todas as decisões para confirmação antes de gerar.

### Passo 4 — Geração dos arquivos

Copia cada template de `templates/`, substitui todos os placeholders `{{...}}` com os valores reais, e salva em `outputs/spec/tech-rules/`.

### Passos 5–6 — Sumário e sync-log

Gera `tech-rules-summary.md` com todas as decisões e justificativas, e registra entrada no `sync-log.md`.

---

## Arquivos gerados

| Arquivo | `alwaysApply` | Quando gerar |
|---------|--------------|--------------|
| `security.mdc` | `true` | Sempre — regra universal da empresa |
| `architecture.mdc` | `false` | Sempre |
| `conventions.mdc` | `true` | Sempre |
| `database.mdc` | `false` | Sempre |
| `test-strategy.mdc` | `false` | Sempre |
| `observability.mdc` | `false` | Sempre (versão simplificada se POC) |
| `auth.mdc` | `false` | Se há autenticação |
| `deploy-and-build.mdc` | `false` | Sempre |
| `frontend.mdc` | `false` | Se há UI |
| `messaging-and-queue.mdc` | `false` | Se há mensageria assíncrona |
| `integrations.mdc` | `false` | Se há integrações externas |

Após gerados, as rules já estão materializadas em `.cursor/rules/*.mdc` e/ou `.claude/rules/*.md` no repositório de implementação, conforme o ambiente escolhido no kickoff — nenhuma cópia manual é necessária.

---

## Estrutura de arquivos da skill

```
spec-tech-rules/
  SKILL.md                    ← orquestrador principal (este é o arquivo que o Cursor lê)
  README.md                   ← este arquivo
  docs/
    spec-tech-rules.html      ← documentação visual completa
  templates/
    security.mdc              ← FIXO — copiado sem modificação (regra universal da empresa)
    frontend-default.mdc      ← FIXO — padrão empresa Next.js + shadcn/ui + React Query
    architecture.mdc          ← template com placeholders {{...}}
    conventions.mdc           ← template com placeholders {{...}}
    database.mdc              ← template com placeholders {{...}}
    test-strategy.mdc         ← template com placeholders {{...}}
    observability.mdc         ← template com placeholders {{...}}
    auth.mdc                  ← template com placeholders {{...}}
    deploy-and-build.mdc      ← template com placeholders {{...}}
    frontend.mdc              ← template com placeholders {{...}}
    messaging-and-queue.mdc   ← template com placeholders {{...}}
    integrations.mdc          ← template com placeholders {{...}}
```

### Templates fixos vs templates com placeholders

**Templates fixos** (`security.mdc`, `frontend-default.mdc`): copiados integralmente ou com adição mínima de seção de decisões do projeto. O conteúdo não muda entre projetos.

**Templates com placeholders**: cada `{{NOME}}` é substituído pelo valor real da decisão correspondente. Blocos `{{#if CONDICAO}}...{{/if}}` são incluídos ou removidos conforme as respostas do kickoff. Nenhum placeholder sobrevive no output final.

---

## Relação com outras skills

| Skill anterior | Artefatos consumidos |
|---------------|---------------------|
| `spec-product` | `requirements.md`, `product-requirements.md`, `business-rules.md` |
| `spec-iterate` | `gaps.md` respondidos, `sync-log.md` |

| Skill seguinte | Artefatos produzidos para ela |
|---------------|-------------------------------|
| `spec-data-model` | `.cursor/rules/*.mdc` — lidos automaticamente via globs |
| `spec-tasks` | `.cursor/rules/*.mdc` — cada task gerada é auto-suficiente com base nas rules |
| `spec-implement` | `.cursor/rules/*.mdc` — agente de implementação guiado pelas rules |

---

## Convenções de placeholders

| Sintaxe | Significado |
|---------|-------------|
| `{{NOME}}` | Substituir pelo valor real |
| `{{#if CONDICAO}}...{{/if}}` | Incluir bloco se condição verdadeira |
| `{{#if CONDICAO}}...{{else}}...{{/if}}` | Condicional com alternativa |

---

*Versão 4.1 — Agosto 2026*
