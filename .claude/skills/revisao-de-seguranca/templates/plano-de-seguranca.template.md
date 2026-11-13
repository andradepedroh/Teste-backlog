# Plano de Segurança — <Nome do Projeto>

<!-- KERNEL de fonte única de segurança. Demais docs referenciam SEC-### por ID, não duplicam.
     Referenciado por ID a partir de outputs/explore/especificacao-tecnica.md. -->

> **ID do doc:** PLANO-SEG · **Versão:** 0.1 · **Atualizado:** <AAAA-MM-DD>

## Changelog
| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 0.1 | <AAAA-MM-DD> | <autor> | Criação (revisao-de-seguranca / plano-geral) |

## Superfície de ameaça
Pontos de entrada, dados sensíveis/PII, fronteiras de confiança, integrações externas e
modelo de autenticação do sistema, cruzados com IDs da spec (F/RN/módulo/entidade de
modelo-de-dados.md). O `tasks.json` ainda não existe neste ponto da cadeia — não há ID de story
para cruzar ainda.

| Elemento | Tipo | Dados sensíveis | Fonte (ID spec) |
|----------|------|-----------------|-----------------|
| <endpoint/tela/integração> | entrada/saída/fronteira | <PII/financeiro/nenhum> | <F-xx / RN-xx / entidade> |

## Controles transversais
Status de cada controle transversal (catálogo em `.claude/references/seguranca/vetores.md`)
frente ao que a spec declara.

| Controle | Status | Observação | SEC gerado |
|----------|--------|-----------|-----------|
| Autenticação | ✅ COBERTO / ⚠️ PARCIAL / ❌ AUSENTE | <nota> | SEC-### |
| RBAC / autorização | | | |
| Rate limiting | | | |
| Logging / auditoria | | | |
| Gestão de segredos | | | |
| Headers HTTP | | | |
| Auditoria de dependências (CI) | | | |
| LGPD — direitos do titular | | | |
| Tratamento central de erros | | | |
| MFA (se aplicável) | | | |

## Catálogo SEC
Catálogo mestre dos requisitos de segurança. Numeração global `SEC-001`, `SEC-002`…

### SEC-001 — <título do controle>
| Campo | Valor |
|-------|-------|
| Severidade | CRÍTICO / ALTO / MÉDIO / BAIXO |
| DREAD | <n/15> |
| CVSS | <0.0> |
| OWASP / STRIDE | <AXX / letra> |
| Controle esperado | <o que precisa existir> |
| Rastreabilidade | <F-xx · RN-xx · módulo · entidade> |
| Status | ABERTO / COBERTO / ADIADO (sem GAP externo ainda — o `gaps-document.md` só nasce na `spec-tasks`, mais adiante na cadeia) |

## Mapa de aplicabilidade
Quais SEC tendem a cair em quais Features/módulos — o `tasks.json` ainda não existe neste ponto da
cadeia. É este mapa que a `spec-security-review` usa depois para decidir em qual story do
`tasks.json` cada `SEC-###` entra.

| SEC | Feature/Módulos aplicáveis |
|-----|-----------------------------|
| SEC-001 | <F-xx, MOD-yy> |

## Recomendações de arquitetura
Recomendações de arquitetura de segurança em ordem de prioridade, ligadas aos SEC acima.
