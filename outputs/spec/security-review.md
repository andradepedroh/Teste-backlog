# Security Review — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

**Data:** 2026-11-13 · **tasks.json antes:** 60 histórias / 122 tarefas · **depois:** 61 histórias / 138 tarefas · **Analista:** spec-security-review (simulação; decisor Pedro)

> ⚠️ Aviso: o kernel não traz modelo de ameaças do sistema atual (não existe legado), então a seção de ameaças do AS-IS não se aplica.

## Sumário Executivo

A revisão leu o backlog com olhos de atacante. Os controles vieram do plano de segurança (o kernel, fonte única); a análise por história não achou risco novo que o kernel não cobrisse.

| Métrica | Valor |
|---------|-------|
| Stories analisadas | 60 |
| Stories sem gaps (nenhuma task SEC) | 48 |
| Stories com tasks SEC injetadas | 12 |
| Story de controles transversais | criada (ID: STORY-SEC-TRANSVERSAL, EPIC-007, implementar primeiro) |
| **Tasks SEC-NNN injetadas no tasks.json** | **16** |
| Tasks CRÍTICO injetadas | 0 |
| Tasks ALTO injetadas | 9 |
| Tasks MÉDIO injetadas | 7 |
| Findings não injetados (backlog futuro) | 3 |

## Tasks SEC Injetadas por Story

### [STORY-001] — RF-MOD-INGESTAO-01 — Receber débitos das fontes

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-001 | Cada fonte só acessa a própria API | ALTO | 8.1 | API2, API5 | S | Um usuário de integração por fonte, com OAuth 2.0 e REST API Access Policy que libera só o endpoint dela; usuário de integração sem papel de aplicação. Quando a fonte IPVA tenta enviar pela API da CCF, o sistema recusa e nada é gravado |
| SEC-005 | Limite de requisições e de tamanho nas APIs de ingestão | MÉDIO | 5.3 | API4 | S | Limite de requisições por usuário de integração e tamanho máximo de pacote; acima do limite, recusa com erro claro e o lote não é corrompido |

### [STORY-051] — RF-MOD-GOVERNANCA-02 — Isolar a visão do atendente

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-002 | Atendente não lê caso nem contribuinte de outro atendente | ALTO | 7.1 | A01, API1 | M | Query Business Rule + ACL limitando o atendente aos casos atribuídos a ele e aos contribuintes desses casos, inclusive na busca global e no acesso direto pelo endereço do registro |

### [STORY-050] — RF-MOD-GOVERNANCA-01 — Controlar acesso por papel

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-003 | Permissão de cada papel avaliada no próprio dado | ALTO | 7.5 | A01, API5 | M | ACL de tabela e de campo para os 5 papéis em todas as 26 tabelas; nenhum papel humano grava dado de origem; teste por papel × grupo de tabelas |

### [STORY-052] — RF-MOD-GOVERNANCA-03 — Mascarar CPF e restringir exportação

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-004 | CPF mascarado e exportação restrita e registrada | ALTO | 6.8 | A01, A02 | S | ACL de campo mascarando CPF de pessoa física por padrão; exportação só para papéis autorizados, com evento de auditoria por exportação |

### [STORY-002] — RF-MOD-INGESTAO-02 — Validar o documento do contribuinte

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-006 | Validação de toda entrada da ingestão | MÉDIO | 5.4 | A03, API3 | S | Validar tipo, tamanho e lista de valores de cada campo e o dígito do documento; aceitar só os campos do contrato (ignorar campos extras); registro inválido vai para rejeitados com motivo |

### [STORY-004] — RF-MOD-INGESTAO-04 — Evitar duplicidade no reenvio

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-007 | Reenvio e repetição não alteram dados | MÉDIO | 5.0 | A08 | S | Controle por fonte, lote e sequência de pacote; status repetido no retorno do provedor não muda nada |

### [STORY-031] — RF-MOD-REGUAS-06 — Receber o status de entrega

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-008 | Retorno de status só aceito do provedor autenticado | ALTO | 7.3 | A08, API2 | S | Credencial própria por provedor no retorno de status e conferência de que a comunicação existe; sem isso, alguém de fora marca comunicações como entregues e distorce o retorno das réguas |

### [STORY-053] — RF-MOD-GOVERNANCA-04 — Auditar ações e parâmetros

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-009 | Registros imutáveis e trilha de auditoria | ALTO | 6.5 | A09 | S | Interação, versão publicada, carteira confirmada e evento de auditoria sem update nem delete para nenhum papel (ACL + Business Rule); evento com usuário, ação, data e registro |

### [STORY-026] — RF-MOD-REGUAS-01 — Montar a régua

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-012 | Só dados permitidos pelo sigilo fiscal nas mensagens | ALTO | 6.5 | A04 | S | Lista de variáveis permitidas por canal (SMS e WhatsApp com menos dado que e-mail), validada na régua antes de salvar o modelo |

### [STORY-029] — RF-MOD-REGUAS-04 — Respeitar o consentimento ⚠️ BLOQUEADO (GAP-028)

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-013 | Envio só com base legal ou consentimento no canal | ALTO | 5.9 | A04 | S | Conferir consentimento no momento do envio e respeitar o opt-out no mesmo dia; registrar a base legal de cada canal |

### [STORY-055] — RF-MOD-GOVERNANCA-06 — Consultar auditoria

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-015 | Atendimento aos direitos do titular | MÉDIO | 4.0 | A04 | S | Procedimento para o encarregado de dados consultar e exportar o que o produto guarda de um contribuinte; base legal registrada (obrigação legal de cobrança) — a exclusão a pedido não se aplica ao débito tributário |

### [STORY-054] — RF-MOD-GOVERNANCA-05 — Administrar parâmetros, faixas e metas

| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |
|--------------|--------|------------|------|-------|---------|---------|
| SEC-018 | Parâmetros que mudam indicadores protegidos e auditados | MÉDIO | 5.5 | A01 | S | Só o papel admin altera parâmetros, faixas e metas, dentro de limites (ex.: grupo de controle de 1% a 20%), com valor anterior e novo auditados — senão o efeito incremental pode ser manipulado |

## Story de Controles Transversais

A história `STORY-SEC-TRANSVERSAL` (épico EPIC-007) reúne os controles que valem para a aplicação inteira e vem antes de todas as outras.

| Task | Controle cross-cutting | Severidade | CVSS | Esforço |
|------|----------------------|------------|------|---------|
| SEC-010 | Credenciais em cofre e com rotação | ALTO | 7.5 | S |
| SEC-011 | Nenhum dado pessoal nos logs | MÉDIO | 4.3 | S |
| SEC-017 | Nada fora do escopo x_cbi_ na instância compartilhada | MÉDIO | 6.0 | S |

## Referência de Auditoria — Findings CRÍTICO e ALTO

### [SEC-001] Cada fonte só acessa a própria API — ALTO

**CVSS:** 8.1 | **OWASP:** API2, API5 | **CWE:** CWE-285, CWE-863 | **STRIDE:** S
**Camada:** integration · **História:** STORY-001
**Problema:** Um usuário de integração por fonte, com OAuth 2.0 e REST API Access Policy que libera só o endpoint dela; usuário de integração sem papel de aplicação. Quando a fonte IPVA tenta enviar pela API da CCF, o sistema recusa e nada é gravado. Risco que fecha: um sistema parceiro (ou quem roubar a credencial dele) grava débitos de outra fonte, contaminando a carteira de cobrança.
**Risco:** um sistema parceiro (ou quem roubar a credencial dele) grava débitos de outra fonte, contaminando a carteira de cobrança.
**Fix:** Um usuário de integração por fonte, com OAuth 2.0 e REST API Access Policy que libera só o endpoint dela; usuário de integração sem papel de aplicação. Quando a fonte IPVA tenta enviar pela API da CCF, o sistema recusa e nada é gravado
**Teste (RED → GREEN):**
  RED:  Com o usuário de integração do IPVA, enviar um pacote para o recurso da CCF e receber 200 com registros gravados — prova que uma fonte escreve no lugar de outra.
  GREEN: Com a política de acesso por fonte, a mesma chamada recebe 403 ACESSO_NEGADO e nenhuma linha é gravada em débitos nem no lote.

### [SEC-002] Atendente não lê caso nem contribuinte de outro atendente — ALTO

**CVSS:** 7.1 | **OWASP:** A01, API1 (IDOR — quando um usuário consegue acessar o registro de outro) | **CWE:** CWE-639 | **STRIDE:** I
**Camada:** frontend · **História:** STORY-051
**Problema:** Query Business Rule + ACL limitando o atendente aos casos atribuídos a ele e aos contribuintes desses casos, inclusive na busca global e no acesso direto pelo endereço do registro. Risco que fecha: um atendente lê os casos e os dados de contribuintes atribuídos a colegas, inclusive trocando o identificador no endereço do registro.
**Risco:** um atendente lê os casos e os dados de contribuintes atribuídos a colegas, inclusive trocando o identificador no endereço do registro.
**Fix:** Query Business Rule + ACL limitando o atendente aos casos atribuídos a ele e aos contribuintes desses casos, inclusive na busca global e no acesso direto pelo endereço do registro
**Teste (RED → GREEN):**
  RED:  Atendente A1 abre pelo endereço direto o caso atribuído a A2 e vê o dossiê — prova o acesso indevido (IDOR).
  GREEN: Com a Query Business Rule e a ACL, o mesmo acesso não mostra o registro e a busca global também não o encontra.

### [SEC-003] Permissão de cada papel avaliada no próprio dado — ALTO

**CVSS:** 7.5 | **OWASP:** A01, API5 | **CWE:** CWE-285, CWE-862 | **STRIDE:** E
**Camada:** backend · **História:** STORY-050
**Problema:** ACL de tabela e de campo para os 5 papéis em todas as 26 tabelas; nenhum papel humano grava dado de origem; teste por papel × grupo de tabelas. Risco que fecha: um usuário com papel menor altera dado de origem ou de configuração que não lhe cabe, porque a permissão só existe no menu.
**Risco:** um usuário com papel menor altera dado de origem ou de configuração que não lhe cabe, porque a permissão só existe no menu.
**Fix:** ACL de tabela e de campo para os 5 papéis em todas as 26 tabelas; nenhum papel humano grava dado de origem; teste por papel × grupo de tabelas
**Teste (RED → GREEN):**
  RED:  Atendente grava pela lista um débito ou um parâmetro e a gravação é aceita — prova a escalada de privilégio.
  GREEN: Com as ACL de tabela e de campo por papel, a mesma gravação é negada e nada muda.

### [SEC-004] CPF mascarado e exportação restrita e registrada — ALTO

**CVSS:** 6.8 | **OWASP:** A01, A02 | **CWE:** CWE-359, CWE-200 | **STRIDE:** I
**Camada:** frontend · **História:** STORY-052
**Problema:** ACL de campo mascarando CPF de pessoa física por padrão; exportação só para papéis autorizados, com evento de auditoria por exportação. Risco que fecha: quem não precisa ver o CPF de pessoa física lê ou exporta a lista inteira de contribuintes com o documento em claro.
**Risco:** quem não precisa ver o CPF de pessoa física lê ou exporta a lista inteira de contribuintes com o documento em claro.
**Fix:** ACL de campo mascarando CPF de pessoa física por padrão; exportação só para papéis autorizados, com evento de auditoria por exportação
**Teste (RED → GREEN):**
  RED:  Coordenador exporta a lista de contribuintes e o arquivo traz CPF completo, sem registro na auditoria — prova o vazamento.
  GREEN: Com a ACL de campo e a restrição de exportação, o CPF sai mascarado (***.***.***-25) e cada exportação gera evento de auditoria.

### [SEC-008] Retorno de status só aceito do provedor autenticado — ALTO

**CVSS:** 7.3 | **OWASP:** A08, API2 | **CWE:** CWE-287, CWE-345 | **STRIDE:** S
**Camada:** integration · **História:** STORY-031
**Problema:** Credencial própria por provedor no retorno de status e conferência de que a comunicação existe; sem isso, alguém de fora marca comunicações como entregues e distorce o retorno das réguas. Risco que fecha: alguém de fora marca comunicações como entregues ou lidas e distorce o retorno das réguas e a atribuição da regularização.
**Risco:** alguém de fora marca comunicações como entregues ou lidas e distorce o retorno das réguas e a atribuição da regularização.
**Fix:** Credencial própria por provedor no retorno de status e conferência de que a comunicação existe; sem isso, alguém de fora marca comunicações como entregues e distorce o retorno das réguas
**Teste (RED → GREEN):**
  RED:  Sem credencial do provedor, enviar status ENTREGUE para um identificador conhecido e ver a comunicação mudar — prova a falsificação.
  GREEN: Com a credencial própria do provedor, a chamada sem credencial recebe 401 e a de outro sistema recebe 403; nada muda.

### [SEC-009] Registros imutáveis e trilha de auditoria — ALTO

**CVSS:** 6.5 | **OWASP:** A09 | **CWE:** CWE-778, CWE-284 | **STRIDE:** R
**Camada:** backend · **História:** STORY-053
**Problema:** Interação, versão publicada, carteira confirmada e evento de auditoria sem update nem delete para nenhum papel (ACL + Business Rule); evento com usuário, ação, data e registro. Risco que fecha: alguém apaga ou altera uma interação, uma versão publicada ou um evento de auditoria e some com a prova do que fez.
**Risco:** alguém apaga ou altera uma interação, uma versão publicada ou um evento de auditoria e some com a prova do que fez.
**Fix:** Interação, versão publicada, carteira confirmada e evento de auditoria sem update nem delete para nenhum papel (ACL + Business Rule); evento com usuário, ação, data e registro
**Teste (RED → GREEN):**
  RED:  Coordenador exclui um evento de auditoria pela lista e a exclusão é aceita — prova a trilha adulterável.
  GREEN: Com ACL e regra de negócio de imutabilidade, alteração e exclusão são negadas para todos os papéis, inclusive admin.

### [SEC-010] Credenciais em cofre e com rotação — ALTO

**CVSS:** 7.5 | **OWASP:** A02, A05 | **CWE:** CWE-798, CWE-522 | **STRIDE:** I
**Camada:** infrastructure · **História:** STORY-SEC-TRANSVERSAL
**Problema:** Credenciais OAuth e do provedor em registro de credencial protegido da instância, nunca em script ou propriedade aberta; rotação documentada. Risco que fecha: quem lê um script ou uma propriedade da aplicação obtém a credencial OAuth de uma fonte ou do provedor e passa a agir em nome dele.
**Risco:** quem lê um script ou uma propriedade da aplicação obtém a credencial OAuth de uma fonte ou do provedor e passa a agir em nome dele.
**Fix:** Credenciais OAuth e do provedor em registro de credencial protegido da instância, nunca em script ou propriedade aberta; rotação documentada
**Teste (RED → GREEN):**
  RED:  Procurar segredo em scripts e propriedades da aplicação e encontrar a credencial do provedor em texto — prova o vazamento.
  GREEN: Com o registro de credencial protegido da instância, a busca não encontra segredo e a rotação está documentada com data.

### [SEC-012] Só dados permitidos pelo sigilo fiscal nas mensagens — ALTO

**CVSS:** 6.5 | **OWASP:** A04 | **CWE:** CWE-359, CWE-200 | **STRIDE:** I
**Camada:** backend · **História:** STORY-026
**Problema:** Lista de variáveis permitidas por canal (SMS e WhatsApp com menos dado que e-mail), validada na régua antes de salvar o modelo. Risco que fecha: uma mensagem de SMS ou WhatsApp expõe valor e natureza da dívida a quem vê a tela do celular do contribuinte, ferindo o sigilo fiscal.
**Risco:** uma mensagem de SMS ou WhatsApp expõe valor e natureza da dívida a quem vê a tela do celular do contribuinte, ferindo o sigilo fiscal.
**Fix:** Lista de variáveis permitidas por canal (SMS e WhatsApp com menos dado que e-mail), validada na régua antes de salvar o modelo
**Teste (RED → GREEN):**
  RED:  Salvar um modelo de SMS com as variáveis valor_total e tributo e ver o modelo aceito — prova a exposição.
  GREEN: Com a lista de variáveis permitidas por canal, o modelo de SMS com variável proibida é recusado ao salvar, com a mensagem «Variável não permitida neste canal»; a lista final depende da validação jurídica (GAP-015).

### [SEC-013] Envio só com base legal ou consentimento no canal — ALTO

**CVSS:** 5.9 | **OWASP:** A04 | **CWE:** CWE-359 | **STRIDE:** I
**Camada:** backend · **História:** STORY-029
**Problema:** Conferir consentimento no momento do envio e respeitar o opt-out no mesmo dia; registrar a base legal de cada canal. Risco que fecha: o sistema envia mensagem de cobrança a quem não autorizou o canal ou já pediu para sair, expondo a SEFAZ a reclamação e a sanção pela LGPD.
**Risco:** o sistema envia mensagem de cobrança a quem não autorizou o canal ou já pediu para sair, expondo a SEFAZ a reclamação e a sanção pela LGPD.
**Fix:** Conferir consentimento no momento do envio e respeitar o opt-out no mesmo dia; registrar a base legal de cada canal
**Teste (RED → GREEN):**
  RED:  Contribuinte com opt-out de SMS registrado hoje recebe SMS da régua — prova o envio sem base.
  GREEN: Com a conferência no envio, a comunicação fica SEM_OPT_IN e não sai; ICMS, ITCD e parcelamentos ficam bloqueados enquanto não houver fonte de opt-in (GAP-028).

## Findings não injetados (backlog futuro)

### [SEC-014] Prazo de guarda dos dados pessoais — MÉDIO

**CVSS:** 4.0 | **OWASP / STRIDE:** A04 / Information Disclosure
**Problema:** Prazo de guarda por tipo de registro (rejeitados com linha original, comunicações, interações) e expurgo agendado
**Motivo de não injetar:** ADIADO no kernel: prazos de guarda a definir pelo encarregado de dados (GAP-024)
**Rastreio:** GAP-024 · RF-MOD-INGESTAO-08 · entidade `x_cbi_registro_rejeitado`

### [SEC-019] Segundo fator para administração e exportação — MÉDIO

**CVSS:** 5.9 | **OWASP / STRIDE:** A07 / Spoofing, Elevation of Privilege
**Problema:** MFA (segundo fator de login) exigido para o papel admin e para exportação, pelo SSO da instância
**Motivo de não injetar:** ADIADO no kernel: depende da configuração de segundo fator no SSO da instância (TI SEFAZ-MT)
**Rastreio:** RF-MOD-GOVERNANCA-03 · RF-MOD-GOVERNANCA-05 · ADR-06

### [SEC-016] Erro ao parceiro sem detalhe interno — BAIXO

**CVSS:** 3.1 | **OWASP / STRIDE:** A05 / Information Disclosure
**Problema:** Respostas no formato RFC 7807 com mensagem em português, sem stack trace, nome de tabela ou identificador interno
**Motivo de não injetar:** COBERTO no kernel pela convenção de erro (RFC 7807 sem detalhe interno); conferir na auditoria de cada história — BAIXO, tech debt se faltar
**Rastreio:** ADR-03 · RN-NOVO-ING-004 · RF-MOD-INGESTAO-01

| Severidade | Ação |
|-----------|------|
| MÉDIO (esforço M/L) | Registrar aqui; priorizar como task no **próximo sprint** — não bloqueia a story atual |
| BAIXO | Registrar aqui como **tech debt** — sem prazo definido |

## Análise de Cobertura por Story

Cada história funcional foi lida pela operação dominante. As tarefas já trazem ACL no dado, log sem dado pessoal e erro genérico; o que faltava veio do kernel.

| História | Operação dominante | Dados sensíveis | Tasks SEC |
|----------|--------------------|-----------------|-----------|
| STORY-016 — RF-MOD-QUALIFICACAO-01 — Parametrizar critérios da carteira | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-017 — RF-MOD-QUALIFICACAO-02 — Versionar critérios | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-018 — RF-MOD-QUALIFICACAO-03 — Simular a carteira | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-019 — RF-MOD-QUALIFICACAO-04 — Segmentar massificada × qualificada | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-020 — RF-MOD-QUALIFICACAO-05 — Sortear o grupo de controle | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-021 — RF-MOD-QUALIFICACAO-06 — Confirmar a carteira | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-026 — RF-MOD-REGUAS-01 — Montar a régua | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | SEC-012 |
| STORY-033 — RF-MOD-REGUAS-08 — Pausar e retomar a régua | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-027 — RF-MOD-REGUAS-02 — Enviar a etapa devida | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-029 — RF-MOD-REGUAS-04 — Respeitar o consentimento ⚠️ BLOQUEADO (GAP-028) | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | SEC-013 |
| STORY-030 — RF-MOD-REGUAS-05 — Enviar por canal ⚠️ BLOQUEADO (GAP-028) | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-028 — RF-MOD-REGUAS-03 — Escalonar e encaminhar | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-032 — RF-MOD-REGUAS-07 — Reenviar falhas | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-034 — RF-MOD-REGUAS-09 — Acompanhar a execução | Relatório / leitura | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-057 — Investigação — O provedor pode não sustentar 22 mil envios por dia | Investigação | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-059 — Investigação — Sem fonte de opt-in fora do IPVA, as réguas de ICMS, ITCD e parcelamentos ficam paradas | Investigação | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-031 — RF-MOD-REGUAS-06 — Receber o status de entrega | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | SEC-008 |
| STORY-050 — RF-MOD-GOVERNANCA-01 — Controlar acesso por papel | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | SEC-003 |
| STORY-053 — RF-MOD-GOVERNANCA-04 — Auditar ações e parâmetros | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | SEC-009 |
| STORY-054 — RF-MOD-GOVERNANCA-05 — Administrar parâmetros, faixas e metas | Configuração / admin | PII (CPF/CNPJ, contato) e dívida tributária | SEC-018 |
| STORY-051 — RF-MOD-GOVERNANCA-02 — Isolar a visão do atendente | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | SEC-002 |
| STORY-055 — RF-MOD-GOVERNANCA-06 — Consultar auditoria | Relatório / leitura | PII (CPF/CNPJ, contato) e dívida tributária | SEC-015 |
| STORY-052 — RF-MOD-GOVERNANCA-03 — Mascarar CPF e restringir exportação | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | SEC-004 |
| STORY-045 — RF-MOD-MONITORAMENTO-04 — Efeito incremental | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-042 — RF-MOD-MONITORAMENTO-01 — Marcar notificado e regularizado | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-044 — RF-MOD-MONITORAMENTO-03 — Indicadores de funil | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-048 — RF-MOD-MONITORAMENTO-07 — Painel Institucional | Relatório / leitura | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-047 — RF-MOD-MONITORAMENTO-06 — Realizado × meta | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-043 — RF-MOD-MONITORAMENTO-02 — Atribuir a origem da regularização | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-046 — RF-MOD-MONITORAMENTO-05 — Retorno das réguas | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-049 — RF-MOD-MONITORAMENTO-08 — Regularizações por origem | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-058 — Investigação — Platform Analytics sem licença | Investigação | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-056 — Investigação — A consolidação de ~1,8 milhão de contribuintes pode passar de 4 horas na instância | Investigação | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-001 — RF-MOD-INGESTAO-01 — Receber débitos das fontes | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | SEC-001, SEC-005 |
| STORY-005 — RF-MOD-INGESTAO-05 — Fechar o ciclo diário e acompanhar as fontes | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-006 — RF-MOD-INGESTAO-06 — Seguir operando com fonte em falha | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-007 — RF-MOD-INGESTAO-07 — Carga inicial e reconciliação | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-015 — RF-MOD-INGESTAO-15 — Simular cargas das fontes | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-012 — RF-MOD-INGESTAO-12 — Receber sinalização coercitiva | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-002 — RF-MOD-INGESTAO-02 — Validar o documento do contribuinte | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | SEC-006 |
| STORY-008 — RF-MOD-INGESTAO-08 — Reprocessar registros rejeitados | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-003 — RF-MOD-INGESTAO-03 — Consolidar débitos por contribuinte | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-011 — RF-MOD-INGESTAO-11 — Transição MPI → Big Data | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-014 — RF-MOD-INGESTAO-14 — Carteira consolidada | Relatório / leitura | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-009 — RF-MOD-INGESTAO-09 — Atualizar a regularização durante o ciclo | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-013 — RF-MOD-INGESTAO-13 — Visão única do contribuinte | Relatório / leitura | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-010 — RF-MOD-INGESTAO-10 — Alertar parcelamento em risco | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-004 — RF-MOD-INGESTAO-04 — Evitar duplicidade no reenvio | Integração externa | PII (CPF/CNPJ, contato) e dívida tributária | SEC-007 |
| STORY-024 — RF-MOD-SCORE-03 — Operar sem score | Integração externa | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-060 — Investigação — Lote de score com ~1,4 milhão de linhas pode estourar o limite de requisição da plataforma | Investigação | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-022 — RF-MOD-SCORE-01 — Receber o score da UFMT | Integração externa | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-023 — RF-MOD-SCORE-02 — Classificar o score em faixas | Criação / atualização de recurso | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-025 — RF-MOD-SCORE-04 — Painel do Score | Relatório / leitura | dívida tributária agregada | — (sem lacuna além dos controles transversais) |
| STORY-035 — RF-MOD-QUALIFICADA-01 — Criar casos | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-036 — RF-MOD-QUALIFICADA-02 — Distribuir casos | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-037 — RF-MOD-QUALIFICADA-03 — Fila priorizada | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-039 — RF-MOD-QUALIFICADA-05 — Registrar interação | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-038 — RF-MOD-QUALIFICADA-04 — Dossiê do caso | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-040 — RF-MOD-QUALIFICADA-06 — Follow-up com lembrete | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |
| STORY-041 — RF-MOD-QUALIFICADA-07 — Reatribuir casos | Criação / atualização de recurso | PII (CPF/CNPJ, contato) e dívida tributária | — (sem lacuna além dos controles transversais) |

## Controles Cross-Cutting

| Controle cross-cutting | Story existente? | ID da story | Gap? |
|------------------------|-----------------|-------------|------|
| Setup de autenticação | Sim — SSO da instância (fora do escopo) e OAuth por fonte | STORY-001 (SEC-001) | Não |
| RBAC / política de autorização global | Sim | RF-MOD-GOVERNANCA-01 (SEC-003) | Não |
| Rate limiting | Sim | STORY-001 (SEC-005) | Não — valor numérico ainda a definir |
| Logging e auditoria de operações sensíveis | Sim | STORY-SEC-TRANSVERSAL (SEC-011) e RF-MOD-GOVERNANCA-04 (SEC-009) | Não |
| Gestão de segredos | Sim | STORY-SEC-TRANSVERSAL (SEC-010) | Não |
| Hardening de headers HTTP | Plataforma | — (cabeçalhos da instância ServiceNow, responsabilidade da TI) | Não aplicável |
| Auditoria de dependências no CI | Não | — | Não aplicável: aplicação escopada sem dependências de pacote; detector de segredos no SEC-010 |
| Supply chain / build (A03:2025) | Parcial | STORY-SEC-TRANSVERSAL (SEC-017) | Não — controle de versão no GitHub e escopo travado |
| Tratamento de exceções (A10:2025) | Sim | convenção de erro (SEC-016 coberto) | Não |
| LGPD — direitos do titular | Sim | RF-MOD-GOVERNANCA-06 (SEC-015) | Não — exclusão a pedido não se aplica a débito tributário |
| Tratamento centralizado de erros | Sim | convenção de erro | Não |
| MFA em operações de alto risco | Adiado | SEC-019 | Sim — adiado (SSO da instância) |
| Segurança de IA/agentes | — | — | Não aplicável: produto sem IA |

## Ameaças do AS-IS não mitigadas no TO-BE

Não se aplica: não existe sistema legado, então não há modelo de ameaças do AS-IS para cruzar.

## Recomendações de Arquitetura de Segurança

- Implementar primeiro a história transversal (cofre de credenciais, log sem dado pessoal, escopo travado).
- Fechar com a TI o valor numérico do limite de requisições e do tamanho de pacote antes da homologação das fontes (SEC-005).
- Confirmar o mecanismo de autenticação do provedor de mensagens assim que ele for escolhido (SEC-008, GAP-004).
- Receber a validação jurídica das variáveis por canal para fechar o SEC-012 (GAP-015).
- Testar ACL por papel × grupo de tabelas no ATF a cada história, não só no fim.

## Questões em aberto

Nenhum controle derivado fora do kernel: a análise por história não encontrou risco que o plano de segurança não cobrisse.
