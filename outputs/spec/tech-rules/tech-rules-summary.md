# Tech Rules — Sumário de Decisões

**Gerado em:** 2026-11-13  **Por:** spec-tech-rules (modo expresso; quadro confirmado por Pedro sem exceções — ver `kickoff-proposto.md`)

## Decisões

| Bloco | Decisão | Justificativa (documento e sinal) |
|-------|---------|----------------------------------|
| Linguagem | JavaScript do lado do servidor do ServiceNow (Script Includes, Business Rules, Scripted REST, Flow Designer) | ETF §1.1 e §6 indicam aplicação escopada no App Engine → plataforma já definida |
| Frontend | Telas nativas do ServiceNow + 2 dashboards do Platform Analytics (exceção ao padrão Next.js) | ETF §1.1 e §6.6 indicam «nenhuma tela customizada» → interface nativa |
| Arquitetura | Monolito simples: uma aplicação escopada `x_cbi_`, 7 módulos lógicos; camadas entrada → Script Include → tabelas | modules.md indica 7 módulos de um só time; ETF §1.1 → um escopo só |
| Banco | Tabelas da plataforma (26 `x_cbi_`), GlideRecord/GlideAggregate, sem cache | ETF §4 define as 26 tabelas → banco da plataforma |
| Migrações | Controle de versão do Studio ligado ao GitHub; promoção dev → homologação → produção | repositório em uso no GitHub → versionar a aplicação nele |
| Convenções | Identificadores em português; `x_cbi_` + snake_case; API `/api/x_cbi/v1`; RFC 7807 + resultado por registro; códigos de erro tipados | ETF §4 e §6.1 usam nomes em português; RN-NOVO-ING-004 exige resposta por registro |
| Testes | Unitário (ATF) + integração (kit de payloads) + ponta a ponta (ATF) + carga (k6); todas as regras de cálculo e cenários de aceite automatizados | requirements.md RNF-DES-001 e RNF-DES-002 (volume) → carga obrigatória; business-rules.md tem 9 regras de Derivação |
| Observabilidade | Logs estruturados + métricas nativas, identificador do lote como correlação, sem OpenTelemetry | requirements.md RNF-CONF-001 (alerta de fonte em falha) → rastro por lote |
| Auth | SSO da instância para usuários; OAuth 2.0 com um usuário por fonte nas APIs | ETF §1.1 e §2.1 → login fora do escopo, autenticação das APIs no escopo |
| Autorização | 5 papéis, ACL na camada de dados, isolamento do atendente por Query Business Rule | ETF §6.4; business-rules.md RN-NOVO-GOV-001 e RN-NOVO-MON-002 |
| Auditoria | Completa | discovery-document.md (cliente governamental, dado pessoal); RN-NOVO-GOV-003 |
| Deploy | Aplicação escopada sem container; 3 ambientes; GitHub Flow com um branch por história | plano, slide 13 (homologação); disciplina de git do harness |
| Integrações | 7 APIs de entrada com padrão comum de lote; provedor por canal com reenvio limitado; callback de status | context-map.md (sistemas e integrações); ETF §6.3 |

## Arquivos gerados

| Arquivo | alwaysApply | Propósito |
|---------|------------|-----------|
| security.mdc | true | Regra universal da empresa — 10 camadas (A–J) OWASP+LGPD (cópia integral; no projeto vale a rule do harness) |
| frontend-default.mdc | false | Padrão de frontend da empresa (cópia integral; referência do frontend.mdc; no projeto vale a rule do harness) |
| frontend.mdc | false | Exceção: interface nativa do ServiceNow e 2 dashboards |
| architecture.mdc | false | Camadas, módulos e onde cada tipo de lógica mora |
| conventions.mdc | false | Idioma, nomes, versão de API, formato de erro |
| database.mdc | false | Tabelas `x_cbi_`, idempotência, imutáveis, dado pessoal |
| test-strategy.mdc | false | Camadas de teste e cobertura exigida |
| observability.mdc | false | Logs por lote, métricas e alertas |
| auth.mdc | false | SSO, OAuth por fonte, papéis, auditoria |
| deploy-and-build.mdc | false | Escopo, ambientes, branches |
| integrations.mdc | false | Padrão de lote, provedor por canal, falhas |
| *(messaging-and-queue.mdc)* | — | Não gerado: sem mensageria (item 3.5) |

Materializadas em `.claude/rules/*.md` (9 rules; `security` e `frontend-default` puladas porque o
harness já carrega as dele). Conferência: `check-rules.mjs` — 20 arquivos, 0 achados.

## Questões em aberto <!-- id: open-questions -->

| # | Pergunta | Evidência/contexto (bloco/decisão) | Bloqueia próxima fase? |
|---|----------|-------------------------------------|-------------------------|
| 1 | Qual a release da instância ServiceNow da SEFAZ-MT? | item 1.2 — versão não informada | não |
| 2 | O nome do escopo `x_cbi_` está aprovado? | gaps.md GAP-013 | não (confirmar antes da spec-data-model) |
| 3 | O Platform Analytics está licenciado? | gaps.md GAP-002; frontend.mdc | não para o backlog |

## Como usar

1. As rules estão em `outputs/spec/tech-rules/*.mdc` (fonte versionada) e materializadas em `.claude/rules/*.md`. Nada a copiar manualmente.
2. **Claude (Code/Cowork):** aplica nativamente via `.claude/rules/*.md`; `security` e o padrão de frontend vêm das rules do harness em `.claude/rules/harness/`.
3. spec-data-model e spec-tasks lerão as rules sem configuração adicional.
