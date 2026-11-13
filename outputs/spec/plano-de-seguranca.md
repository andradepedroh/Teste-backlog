# Plano de Segurança — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

<!-- KERNEL de fonte única de segurança. Demais docs referenciam SEC-### por ID, não duplicam. -->

> **ID do doc:** PLANO-SEG · **Versão:** 0.1 · **Atualizado:** 2026-11-13

> Contexto regulatório (dos documentos, sem pergunta adicional): **LGPD** (CPF, nome, contato do
> contribuinte), **sigilo fiscal** (débito tributário) e **cliente governamental**. Stack lida de
> `tech-rules/tech-rules-summary.md`: ServiceNow, aplicação escopada `x_cbi_`, SSO da instância,
> OAuth 2.0 por fonte, ACL na camada de dados. Arquitetura lida de `hld.md`.

## Changelog
| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 0.1 | 2026-11-13 | revisao-de-seguranca (simulação; decisor Pedro) | Criação (revisao-de-seguranca / plano-geral) |

## Superfície de ameaça

O sistema tem quatro portas de entrada: as APIs que recebem dados das fontes, o retorno de status
do provedor de mensagens, as telas dos usuários internos e a saída de mensagens ao contribuinte.
O dado mais sensível é a dívida tributária ligada ao CPF ou CNPJ (sigilo fiscal + LGPD).

| Elemento | Tipo | Dados sensíveis | Fonte (ID spec) |
|----------|------|-----------------|-----------------|
| APIs de ingestão das 6 fontes de débito | entrada | CPF/CNPJ, nome, débitos, parcelamentos, sinalizações coercitivas | INT-01 a INT-06 · CON-02 · RF-MOD-INGESTAO-01 · RN-NOVO-ING-004, 005, 008 |
| API de ingestão do score da UFMT | entrada | documento + score de liquidez | INT-07 · CON-02 · RF-MOD-SCORE-01 |
| Callback de status do provedor | entrada | identificador da comunicação, situação de entrega | INT-09 · CON-02 · RF-MOD-REGUAS-06 · TRB-04 |
| Envio de mensagens ao provedor | saída | nome, contato, tributo, valor, vencimento | INT-08 · CON-06 · RF-MOD-REGUAS-05 · TRB-03 |
| Telas nativas por papel (12 listas e formulários) | entrada | toda a carteira; CPF; interações | CON-01 · CON-04 · RF-MOD-GOVERNANCA-01 a 03 · TRB-02 |
| Painéis do Platform Analytics | saída | indicadores agregados por tributo, canal e atendente | CON-05 · RF-MOD-MONITORAMENTO-07 · RF-MOD-SCORE-04 |
| Exportação de listas | saída | CPF, débitos | RF-MOD-GOVERNANCA-03 · RN-NOVO-GOV-002 |
| Parâmetros, faixas e metas (admin) | entrada | parâmetros que mudam carteira e indicadores | RF-MOD-GOVERNANCA-05 · RN-NOVO-GOV-003 |
| Instância ServiceNow compartilhada | fronteira | dados de outros produtos do Profisco | INT-13 · ADR-01 · ADR-10 |
| Registros rejeitados (linha original guardada) | armazenamento | conteúdo bruto da fonte, com documento | entidade `x_cbi_registro_rejeitado` · RF-MOD-INGESTAO-08 · GAP-024 |

**Fronteiras de confiança:** TRB-01 (parceiros → aplicação), TRB-02 (usuário interno → dados),
TRB-03 (aplicação → provedor), TRB-04 (provedor → aplicação), do `hld.md`.

## Controles transversais

| Controle | Status | Observação | SEC gerado |
|----------|--------|-----------|-----------|
| Autenticação | ⚠️ PARCIAL | Usuários pelo SSO da instância (ADR-06); APIs com OAuth por fonte declarado, mas o callback do provedor ainda sem mecanismo definido | SEC-001, SEC-008 |
| RBAC / autorização | ⚠️ PARCIAL | 5 papéis e ACL no dado declarados; matriz ainda a validar (GAP-003) e isolamento do atendente precisa resistir a acesso direto pelo registro | SEC-002, SEC-003 |
| Rate limiting | ❌ AUSENTE | Declarado em `auth.mdc`, sem limite numérico nem tamanho máximo de pacote | SEC-005 |
| Logging / auditoria | ⚠️ PARCIAL | Auditoria completa declarada (RN-NOVO-GOV-003); falta proibir dado pessoal nos logs operacionais e garantir imutabilidade | SEC-009, SEC-011 |
| Gestão de segredos | ⚠️ PARCIAL | Regra diz «credencial fora do código», sem onde guardar nem rotação | SEC-010 |
| Headers HTTP | ✅ COBERTO | Interface nativa: HSTS, CSP e demais cabeçalhos são da instância (TI SEFAZ-MT); a aplicação não cria página própria | — |
| Auditoria de dependências (CI) | ✅ COBERTO | A aplicação escopada não usa biblioteca de terceiros; scripts de teste (k6) ficam fora da instância | — |
| LGPD — direitos do titular | ❌ AUSENTE | O contribuinte não usa o sistema; não há procedimento para atender pedido de acesso ou correção, nem base legal registrada por dado; consentimento por canal sem fonte (GAP-028) | SEC-013, SEC-014, SEC-015 |
| Tratamento central de erros | ✅ COBERTO | RFC 7807 sem stack trace e resultado por registro (`conventions.mdc`) | SEC-016 |
| MFA (se aplicável) | ⚠️ PARCIAL | Papel admin e exportação são alto risco; MFA depende do SSO da instância | SEC-019 |

## Catálogo SEC

### SEC-001 — Cada fonte só acessa a própria API
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 11/15 |
| CVSS | 8.1 |
| OWASP / STRIDE | API2, API5 / Spoofing, Elevation of Privilege |
| Controle esperado | Um usuário de integração por fonte, com OAuth 2.0 e REST API Access Policy que libera só o endpoint dela; usuário de integração sem papel de aplicação. Quando a fonte IPVA tenta enviar pela API da CCF, o sistema recusa e nada é gravado |
| Rastreabilidade | INT-01 a INT-07 · TRB-01 · ADR-06 · RF-MOD-INGESTAO-01 · RN-NOVO-ING-008 |
| Status | ABERTO |

### SEC-002 — Atendente não lê caso nem contribuinte de outro atendente
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 11/15 |
| CVSS | 7.1 |
| OWASP / STRIDE | A01, API1 (IDOR — quando um usuário consegue acessar o registro de outro) / Information Disclosure |
| Controle esperado | Query Business Rule + ACL limitando o atendente aos casos atribuídos a ele e aos contribuintes desses casos, inclusive na busca global e no acesso direto pelo endereço do registro |
| Rastreabilidade | RN-NOVO-MON-002 · RF-MOD-GOVERNANCA-02 · RF-MOD-QUALIFICADA-03 · TRB-02 |
| Status | ABERTO |

### SEC-003 — Permissão de cada papel avaliada no próprio dado
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 10/15 |
| CVSS | 7.5 |
| OWASP / STRIDE | A01, API5 / Elevation of Privilege |
| Controle esperado | ACL de tabela e de campo para os 5 papéis em todas as 26 tabelas; nenhum papel humano grava dado de origem; teste por papel × grupo de tabelas |
| Rastreabilidade | RN-NOVO-GOV-001 · RN-NOVO-ING-008 · RF-MOD-GOVERNANCA-01 · RNF-SEG-001 · GAP-003 |
| Status | ABERTO |

### SEC-004 — CPF mascarado e exportação restrita e registrada
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 10/15 |
| CVSS | 6.8 |
| OWASP / STRIDE | A01, A02 / Information Disclosure |
| Controle esperado | ACL de campo mascarando CPF de pessoa física por padrão; exportação só para papéis autorizados, com evento de auditoria por exportação |
| Rastreabilidade | RN-NOVO-GOV-002 · RF-MOD-GOVERNANCA-03 · RF-MOD-MONITORAMENTO-08 |
| Status | ABERTO |

### SEC-005 — Limite de requisições e de tamanho nas APIs de ingestão
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 8/15 |
| CVSS | 5.3 |
| OWASP / STRIDE | API4 / Denial of Service |
| Controle esperado | Limite de requisições por usuário de integração e tamanho máximo de pacote; acima do limite, recusa com erro claro e o lote não é corrompido |
| Rastreabilidade | INT-01 a INT-07 · RSK-05 · RNF-DES-001 |
| Status | ABERTO |

### SEC-006 — Validação de toda entrada da ingestão
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 8/15 |
| CVSS | 5.4 |
| OWASP / STRIDE | A03, API3 / Tampering |
| Controle esperado | Validar tipo, tamanho e lista de valores de cada campo e o dígito do documento; aceitar só os campos do contrato (ignorar campos extras); registro inválido vai para rejeitados com motivo |
| Rastreabilidade | RN-NOVO-ING-004 · RF-MOD-INGESTAO-02 · RF-MOD-SCORE-01 |
| Status | ABERTO |

### SEC-007 — Reenvio e repetição não alteram dados
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 7/15 |
| CVSS | 5.0 |
| OWASP / STRIDE | A08 / Tampering |
| Controle esperado | Controle por fonte, lote e sequência de pacote; status repetido no retorno do provedor não muda nada |
| Rastreabilidade | RN-NOVO-ING-005 · RF-MOD-INGESTAO-04 · RF-MOD-REGUAS-06 · INT-09 |
| Status | ABERTO |

### SEC-008 — Retorno de status só aceito do provedor autenticado
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 9/15 |
| CVSS | 7.3 |
| OWASP / STRIDE | A08, API2 / Spoofing, Tampering |
| Controle esperado | Credencial própria por provedor no retorno de status e conferência de que a comunicação existe; sem isso, alguém de fora marca comunicações como entregues e distorce o retorno das réguas |
| Rastreabilidade | INT-09 · TRB-04 · RF-MOD-REGUAS-06 |
| Status | ABERTO |

### SEC-009 — Registros imutáveis e trilha de auditoria
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 9/15 |
| CVSS | 6.5 |
| OWASP / STRIDE | A09 / Repudiation, Tampering |
| Controle esperado | Interação, versão publicada, carteira confirmada e evento de auditoria sem update nem delete para nenhum papel (ACL + Business Rule); evento com usuário, ação, data e registro |
| Rastreabilidade | RN-NOVO-CQ-002 · RN-NOVO-QUA-005 · RN-NOVO-GOV-003 · RF-MOD-GOVERNANCA-04 · RF-MOD-QUALIFICADA-05 |
| Status | ABERTO |

### SEC-010 — Credenciais em cofre e com rotação
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 9/15 |
| CVSS | 7.5 |
| OWASP / STRIDE | A02, A05 / Information Disclosure |
| Controle esperado | Credenciais OAuth e do provedor em registro de credencial protegido da instância, nunca em script ou propriedade aberta; rotação documentada |
| Rastreabilidade | TRB-03 · ADR-05 · ADR-06 · INT-08 |
| Status | ABERTO |

### SEC-011 — Nenhum dado pessoal nos logs
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 7/15 |
| CVSS | 4.3 |
| OWASP / STRIDE | A09 / Information Disclosure |
| Controle esperado | Log estruturado só com identificador do lote, fonte, contagens e duração; CPF, e-mail, telefone e conteúdo de mensagem nunca em claro |
| Rastreabilidade | ADR-09 · RF-MOD-INGESTAO-05 · RF-MOD-REGUAS-05 |
| Status | ABERTO |

### SEC-012 — Só dados permitidos pelo sigilo fiscal nas mensagens
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 10/15 |
| CVSS | 6.5 |
| OWASP / STRIDE | A04 / Information Disclosure |
| Controle esperado | Lista de variáveis permitidas por canal (SMS e WhatsApp com menos dado que e-mail), validada na régua antes de salvar o modelo |
| Rastreabilidade | GAP-015 · RF-MOD-REGUAS-01 · RF-MOD-REGUAS-05 · RN-NOVO-REG-003 |
| Status | ADIADO — depende da validação jurídica (GAP-015, aceito em aberto por Pedro em 2026-11-13) |

### SEC-013 — Envio só com base legal ou consentimento no canal
| Campo | Valor |
|-------|-------|
| Severidade | ALTO |
| DREAD | 9/15 |
| CVSS | 5.9 |
| OWASP / STRIDE | A04 / Information Disclosure |
| Controle esperado | Conferir consentimento no momento do envio e respeitar o opt-out no mesmo dia; registrar a base legal de cada canal |
| Rastreabilidade | RN-NOVO-REG-002 · RF-MOD-REGUAS-04 · RNF-SEG-002 · GAP-028 |
| Status | ABERTO — histórias de régua de ICMS, ITCD e parcelamentos bloqueadas pelo GAP-028 |

### SEC-014 — Prazo de guarda dos dados pessoais
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 7/15 |
| CVSS | 4.0 |
| OWASP / STRIDE | A04 / Information Disclosure |
| Controle esperado | Prazo de guarda por tipo de registro (rejeitados com linha original, comunicações, interações) e expurgo agendado |
| Rastreabilidade | GAP-024 · RF-MOD-INGESTAO-08 · entidade `x_cbi_registro_rejeitado` |
| Status | ADIADO — prazos a definir pelo encarregado de dados (GAP-024) |

### SEC-015 — Atendimento aos direitos do titular
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 6/15 |
| CVSS | 4.0 |
| OWASP / STRIDE | A04 / Information Disclosure |
| Controle esperado | Procedimento para o encarregado de dados consultar e exportar o que o produto guarda de um contribuinte; base legal registrada (obrigação legal de cobrança) — a exclusão a pedido não se aplica ao débito tributário |
| Rastreabilidade | F-016 (contribuinte não é usuário) · RF-MOD-GOVERNANCA-06 · discovery-document.md §3 |
| Status | ABERTO |

### SEC-016 — Erro ao parceiro sem detalhe interno
| Campo | Valor |
|-------|-------|
| Severidade | BAIXO |
| DREAD | 5/15 |
| CVSS | 3.1 |
| OWASP / STRIDE | A05 / Information Disclosure |
| Controle esperado | Respostas no formato RFC 7807 com mensagem em português, sem stack trace, nome de tabela ou identificador interno |
| Rastreabilidade | ADR-03 · RN-NOVO-ING-004 · RF-MOD-INGESTAO-01 |
| Status | COBERTO (pela rule `conventions.mdc`; verificar na auditoria da história) |

### SEC-017 — Nada fora do escopo x_cbi_ na instância compartilhada
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 8/15 |
| CVSS | 6.0 |
| OWASP / STRIDE | A05 / Elevation of Privilege |
| Controle esperado | Nenhuma ACL, tabela ou propriedade global alterada sem acordo da TI; acessos entre escopos negados por padrão |
| Rastreabilidade | INT-13 · ADR-01 · ADR-10 |
| Status | ABERTO |

### SEC-018 — Parâmetros que mudam indicadores protegidos e auditados
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 7/15 |
| CVSS | 5.5 |
| OWASP / STRIDE | A01 / Tampering |
| Controle esperado | Só o papel admin altera parâmetros, faixas e metas, dentro de limites (ex.: grupo de controle de 1% a 20%), com valor anterior e novo auditados — senão o efeito incremental pode ser manipulado |
| Rastreabilidade | RF-MOD-GOVERNANCA-05 · RN-NOVO-GOV-003 · RN-NOVO-QUA-003 |
| Status | ABERTO |

### SEC-019 — Segundo fator para administração e exportação
| Campo | Valor |
|-------|-------|
| Severidade | MÉDIO |
| DREAD | 7/15 |
| CVSS | 5.9 |
| OWASP / STRIDE | A07 / Spoofing, Elevation of Privilege |
| Controle esperado | MFA (segundo fator de login) exigido para o papel admin e para exportação, pelo SSO da instância |
| Rastreabilidade | RF-MOD-GOVERNANCA-03 · RF-MOD-GOVERNANCA-05 · ADR-06 |
| Status | ADIADO — depende da configuração do SSO da instância (TI SEFAZ-MT) |

## Mapa de aplicabilidade

| SEC | Feature/Módulos aplicáveis |
|-----|-----------------------------|
| SEC-001 | MOD-INGESTAO, MOD-SCORE |
| SEC-002 | MOD-QUALIFICADA, MOD-GOVERNANCA |
| SEC-003 | MOD-GOVERNANCA (transversal a todos os módulos) |
| SEC-004 | MOD-GOVERNANCA, MOD-INGESTAO, MOD-MONITORAMENTO |
| SEC-005 | MOD-INGESTAO, MOD-SCORE |
| SEC-006 | MOD-INGESTAO, MOD-SCORE |
| SEC-007 | MOD-INGESTAO, MOD-REGUAS |
| SEC-008 | MOD-REGUAS |
| SEC-009 | MOD-QUALIFICADA, MOD-QUALIFICACAO, MOD-GOVERNANCA |
| SEC-010 | MOD-INGESTAO, MOD-REGUAS |
| SEC-011 | transversal |
| SEC-012 | MOD-REGUAS |
| SEC-013 | MOD-REGUAS |
| SEC-014 | MOD-INGESTAO, MOD-REGUAS, MOD-QUALIFICADA |
| SEC-015 | MOD-GOVERNANCA |
| SEC-016 | MOD-INGESTAO, MOD-SCORE |
| SEC-017 | transversal |
| SEC-018 | MOD-GOVERNANCA, MOD-QUALIFICACAO |
| SEC-019 | MOD-GOVERNANCA |

## Recomendações de arquitetura

1. **Fechar o acesso por papel antes de qualquer tela** (SEC-003, SEC-002): validar a matriz (GAP-003) e implementar a ACL e o isolamento do atendente junto com as tabelas, não depois.
2. **Isolar cada fonte na própria API** (SEC-001, SEC-005, SEC-006): o padrão comum de lote nasce com autenticação, limite e validação; as sete APIs herdam.
3. **Autenticar o retorno de status do provedor** (SEC-008): sem isso, o retorno das réguas — e parte da métrica principal — pode ser falsificado.
4. **Tratar dado pessoal como regra de modelo** (SEC-004, SEC-011, SEC-014): máscara de CPF no campo, logs sem PII e prazo de guarda definidos com o encarregado de dados.
5. **Resolver as dependências jurídicas das réguas** (SEC-012, SEC-013): validação dos modelos (GAP-015) e fonte de consentimento (GAP-028) antes de ativar réguas em produção.

**Totais:** 19 SEC — 0 CRÍTICO · 9 ALTO · 9 MÉDIO · 1 BAIXO. Status: 15 ABERTO (SEC-013 com bloqueio do GAP-028) · 1 COBERTO (SEC-016) · 3 ADIADO (SEC-012 pelo GAP-015, SEC-014 pelo GAP-024, SEC-019 pelo SSO da instância).
