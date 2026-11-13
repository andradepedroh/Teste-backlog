# Gaps — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Total de gaps: 28 (24 abertos · 4 resolvidos)
Gerado por: spec-iterate (Etapa A — Auditoria Ativa)
Respostas em: outputs/spec/gaps-answers.md

---

## Como usar este arquivo

1. Leia o **Relatório de Revisão** abaixo.
2. Responda em `outputs/spec/gaps-answers.md` (ou no chat), por ID, com decisão, decisor, data e valor.
3. Peça «propagar respostas de gaps-answers.md» para a Etapa B.

Os GAP-001 a GAP-017 vêm do `outputs/explore/gaps.md` e mantêm o número. Os GAP-018 em diante são
desta auditoria. Dentro de cada severidade, a ordem segue o score ICE (impacto × confiança × facilidade).

---

## Relatório de Revisão

### 🔴 Problemas críticos

**[P-001] Nenhuma fonte de consentimento para ICMS, ITCD e parcelamentos → GAP-028**
A regra de consentimento exige opt-in vigente no canal (RN-NOVO-REG-002), mas a única API de opt-in
listada é a do IPVA (F-120). Com a regra como está, as réguas de ICMS, ITCD e parcelamentos não enviam nada.
→ **Pergunta:** o e-mail institucional exige opt-in? De onde vem o opt-in de SMS e WhatsApp fora do IPVA?

---

### 🟡 Inconsistências entre documentos

**[P-002] Metas dos RNF sem fonte → GAP-020**
Os valores-alvo de RNF-DES-001, RNF-DES-002, RNF-CON-001 e RNF-CON-002 foram propostos nesta simulação.
→ **Pergunta:** consolidação em até 4 horas, envio em até 6 horas e painéis até 08:00 estão aprovados?

**[P-003] Contato-chave existe no protótipo e não na ETF → GAP-025**
O dossiê do protótipo v3 tem contato-chave editável (INF-004); a ETF e o PR do dossiê não têm esse dado.
→ **Pergunta:** o contato-chave entra na v1? Quem pode editá-lo?

---

### 🔵 Pontos cegos identificados

**[P-004] Duração do ciclo da carteira e virada → GAP-023**
«Ciclo» é usado para a carga diária e para a carteira, sem duração definida da carteira nem regra de virada.
→ **Pergunta:** o ciclo é mensal? Réguas e casos abertos continuam na virada?

**[P-005] Casos de atendente desativado ou em férias → GAP-022**
→ **Pergunta:** os casos são redistribuídos automaticamente quando o atendente é desativado?

**[P-006] Retenção de dados pessoais → GAP-024**
Registros rejeitados guardam a linha original; comunicações e interações também têm dado pessoal.
→ **Pergunta:** por quanto tempo cada tipo de registro fica guardado?

**[P-007] Capacidade da cobrança qualificada → GAP-026**
→ **Pergunta:** existe limite de casos por atendente? O que acontece com o excedente?

**[P-008] Régua para quem já está em cobrança coercitiva → GAP-027**
→ **Pergunta:** contribuinte com protesto ativo sai da régua?

**Checagem dos 10 pontos cegos típicos:** offboarding → P-005 · volume extremo → P-007 (carteira
vazia já coberta nos cenários) · permissões → coberto (RF-MOD-GOVERNANCA-01 a 03; matriz no GAP-003) ·
auditoria → coberto (RN-NOVO-GOV-003, RN-NOVO-CQ-002) · falha de integração → coberto
(RN-NOVO-ING-006, RF-MOD-REGUAS-07) · migração de dados → coberto pela carga inicial
(RF-MOD-INGESTAO-07); sem legado · notificações → coberto (follow-up, alertas de fonte) ·
idioma e formatos → coberto (product-requirements «Linguagem e tom») · acessibilidade → coberto
(WCAG 2.2 AA, RNF-USA-001) · expiração e validade → P-004 e P-006.

---

### ⚪ Melhorias de qualidade

**[P-009] Indicadores sem linha de base → GAP-021** (convertido de `product-vision.md` QA-01 e QA-02).

**[P-010] Lint de prosa** `[lint-llm]`: 9 termos vagos em texto de contexto («vários sistemas», «corrigir
rápido») em product-vision.md, requirements.md e product-requirements.md; nenhum em critério de aceite.
Não vira GAP.

---

**Total:** 1 crítico · 2 inconsistências · 5 pontos cegos · 2 melhorias · 17 GAPs do Explore importados (2 resolvidos) · 2 contradições do context-map resolvidas por Pedro
**Próximo passo:** responder em `outputs/spec/gaps-answers.md` ou no chat.

---

## Tratamento decidido por Pedro (2026-11-13)

| GAP | Tratamento nesta simulação |
|-----|----------------------------|
| GAP-028 | **Bloqueado:** a regra de consentimento fica como está e as histórias de régua de ICMS, ITCD e parcelamentos ficam marcadas ⚠️ BLOQUEADO (RF-MOD-REGUAS-02, 04 e 05; RN-NOVO-REG-002) |
| GAP-015 | Aceito em aberto: segue sem mudar requisito |
| GAP-001, GAP-002, GAP-004, GAP-007, GAP-017, GAP-023 (os 6 altos) | Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados |

---

## GAPs

<!-- id: gap-028 -->

### GAP-028 — Fonte do consentimento por canal

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | CRÍTICA |
| **Status** | aberto — ⚠️ BLOQUEADO |
| **Tema** | Fonte do consentimento por canal |
| **Descrição** | A regra de consentimento (RN-NOVO-REG-002) só deixa enviar mensagem a quem tem opt-in vigente no canal. Mas a única API de consentimento listada é a do IPVA. Para ICMS, ITCD e parcelamentos não há fonte de opt-in para e-mail, SMS ou WhatsApp. |
| **Impacto se não resolvido** | Com a regra atual, nenhum contribuinte de ICMS, ITCD ou parcelamento recebe mensagem, e as réguas desses segmentos ficam vazias. |
| **Perguntas para o negócio** | 1) O e-mail institucional exige opt-in, ou o cadastro do contribuinte basta (sim/não)? 2) De onde vem o opt-in de SMS e WhatsApp para ICMS e ITCD: B-Cadastro, DT-e ou um novo cadastro? 3) Enquanto não houver fonte, as réguas desses segmentos usam só e-mail (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) + Jurídico + TI |
| **Sugestão de tratamento** | Reunião curta com Jurídico e TI para separar canais que exigem opt-in (WhatsApp) dos que não exigem (e-mail institucional) e apontar a fonte do opt-in. Resultado: regra de consentimento por canal. ICE: 5 × 4 × 3 = 60 |
| **Sugestão de artefato** | Ajustar RN-NOVO-REG-002 com consentimento por canal; nova integração de consentimento em requirements.md se houver fonte |
| **Afeta** | business-rules.md RN-NOVO-REG-002; requirements.md RF-MOD-REGUAS-04, RNF-SEG-002; especificacao-tecnica (integrações) |
| **Features bloqueadas** | RF-MOD-REGUAS-02, RF-MOD-REGUAS-04, RF-MOD-REGUAS-05 |
| **Fonte** | Origem: P-001; F-120, F-180 |

<!-- id: gap-015 -->

### GAP-015 — Validação jurídica dos modelos

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | EXTERNAL_DEPENDENCY |
| **Severidade** | CRÍTICA |
| **Status** | dep. externa |
| **Tema** | Validação jurídica dos modelos |
| **Descrição** | A matriz de canais × aceite e a redação dos modelos de mensagem precisam respeitar o sigilo fiscal e ainda não foram validadas pelo jurídico. |
| **Impacto se não resolvido** | As réguas não podem ser ativadas em produção sem a validação; risco de quebra de sigilo fiscal. |
| **Perguntas para o negócio** | 1) Quais dados (valor, tributo, número do débito) podem aparecer em SMS e WhatsApp? 2) Há modelo padrão aprovado pelo jurídico para reaproveitar (sim/não)? |
| **Dono sugerido** | Jurídico da SEFAZ-MT |
| **Sugestão de tratamento** | Enviar ao jurídico a lista de variáveis dos modelos e a matriz canal × dado; resultado: lista de dados permitidos por canal. ICE: 4 × 4 × 2 = 32 |
| **Sugestão de artefato** | Nova RN-NOVO-REG (dados permitidos por canal); validação de variáveis em RF-MOD-REGUAS-01 |
| **Afeta** | business-rules.md MOD-REGUAS; requirements.md RF-MOD-REGUAS-01, RF-MOD-REGUAS-05 |
| **Features bloqueadas** | RF-MOD-REGUAS-01, RF-MOD-REGUAS-05 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-015 |

<!-- id: gap-002 -->

### GAP-002 — Licença do Platform Analytics

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | EXTERNAL_DEPENDENCY |
| **Severidade** | ALTA |
| **Status** | dep. externa |
| **Tema** | Licença do Platform Analytics |
| **Descrição** | Os indicadores e os dois painéis dependem do Platform Analytics, cuja licença não foi confirmada. |
| **Impacto se não resolvido** | Sem licença, o Painel Institucional e o Painel do Score precisam de outra solução, e a métrica principal fica sem painel. |
| **Perguntas para o negócio** | 1) A instância da SEFAZ-MT tem Platform Analytics licenciado (sim/não)? 2) Se não, os relatórios nativos do ServiceNow são aceitos como substituto (sim/não)? |
| **Dono sugerido** | SEFAZ-MT (gestão do contrato) |
| **Sugestão de tratamento** | Confirmar o licenciamento com a gestão do contrato; se não houver, definir o substituto antes da spec-hld. ICE: 4 × 5 × 4 = 80 |
| **Sugestão de artefato** | ADR na spec-hld; ajuste de RF-MOD-MONITORAMENTO-07 e RF-MOD-SCORE-04 |
| **Afeta** | requirements.md MOD-MONITORAMENTO, MOD-SCORE; product-requirements.md TEL-006, TEL-012 |
| **Features bloqueadas** | RF-MOD-MONITORAMENTO-03 a 07, RF-MOD-SCORE-04 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-002 |

<!-- id: gap-007 -->

### GAP-007 — Desempate entre segmentos

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | ALTA |
| **Status** | aberto |
| **Tema** | Desempate entre segmentos |
| **Descrição** | Um contribuinte pode atender aos critérios da massificada e da qualificada; a regra de um eixo por ciclo (RN-NOVO-QUA-002) não diz qual vence. |
| **Impacto se não resolvido** | A segmentação pode colocar o mesmo contribuinte em régua e em caso, ou depender de ordem de processamento. |
| **Perguntas para o negócio** | 1) Quando atende aos dois, vale a qualificada (sim/não)? 2) Se não, qual critério desempata: valor, atraso ou score? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Coordenação confirma a regra provisória (qualificada vence quando o valor passa do limite dela). ICE: 4 × 4 × 5 = 80 |
| **Sugestão de artefato** | Ajustar RN-NOVO-QUA-002 e o Cenário 3 de RF-MOD-QUALIFICACAO-04 |
| **Afeta** | business-rules.md RN-NOVO-QUA-002; requirements.md RF-MOD-QUALIFICACAO-04 |
| **Features bloqueadas** | RF-MOD-QUALIFICACAO-04 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-007; requirements.md#QA-01; business-rules.md#QA-01 |

<!-- id: gap-023 -->

### GAP-023 — Duração do ciclo de cobrança

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | ALTA |
| **Status** | aberto |
| **Tema** | Duração do ciclo de cobrança |
| **Descrição** | Os documentos usam «ciclo» para a carga diária e para a carteira (o protótipo mostra «Ciclo · Junho/2026»). Não está definido quanto dura o ciclo da carteira, quando ela é refeita e o que acontece com réguas e casos em andamento na virada. |
| **Impacto se não resolvido** | Sem isso, não dá para definir quando o grupo de controle é sorteado de novo, nem como os indicadores comparam ciclos. |
| **Perguntas para o negócio** | 1) O ciclo da carteira é mensal (sim/não)? 2) Na virada do ciclo, réguas em andamento continuam até o fim (sim/não)? 3) Casos abertos passam para o ciclo seguinte (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Coordenação define a duração do ciclo e a regra de virada; resultado: nova regra de ciclo. ICE: 5 × 3 × 4 = 60 |
| **Sugestão de artefato** | Nova RN-NOVO-QUA (ciclo e virada); ajuste em RF-MOD-QUALIFICACAO-06 e RF-MOD-MONITORAMENTO-07 |
| **Afeta** | business-rules.md MOD-QUALIFICACAO; requirements.md RF-MOD-QUALIFICACAO-05, 06; RF-MOD-MONITORAMENTO-04, 07 |
| **Features bloqueadas** | RF-MOD-QUALIFICACAO-05, RF-MOD-QUALIFICACAO-06, RF-MOD-MONITORAMENTO-04 |
| **Fonte** | Origem: P-004; F-133, F-170 |

<!-- id: gap-017 -->

### GAP-017 — Fonte da lista de contumazes

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | EXTERNAL_DEPENDENCY |
| **Severidade** | ALTA |
| **Status** | dep. externa |
| **Tema** | Fonte da lista de contumazes |
| **Descrição** | A exclusão de contumazes é critério da carteira, mas a TI informa que o controle de contumazes está no Credep, fora das seis fontes. |
| **Impacto se não resolvido** | O critério «excluir contumazes» não funciona sem a fonte. |
| **Perguntas para o negócio** | 1) O Credep vira fonte do produto (sim/não)? 2) Se não, a CCF consegue enviar a marca de contumaz (sim/não)? |
| **Dono sugerido** | TI SEFAZ-MT |
| **Sugestão de tratamento** | TI confirma a fonte; até lá, o indicador vem da CCF. ICE: 3 × 5 × 4 = 60 |
| **Sugestão de artefato** | Nova integração em requirements.md (se Credep) ou campo no contrato da CCF |
| **Afeta** | requirements.md RF-MOD-QUALIFICACAO-01; business-rules.md RN-NOVO-QUA-004 |
| **Features bloqueadas** | RF-MOD-QUALIFICACAO-01 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-017; requirements.md#QA-04; business-rules.md#QA-03 |

<!-- id: gap-001 -->

### GAP-001 — Contratos das APIs das fontes

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | EXTERNAL_DEPENDENCY |
| **Severidade** | ALTA |
| **Status** | dep. externa |
| **Tema** | Contratos das APIs das fontes |
| **Descrição** | Os campos exatos de cada fonte não estão fechados; MPI, Big Data e UFMT estão sem resposta da TI e IPVA e ITCD estão «a desenvolver». |
| **Impacto se não resolvido** | A integração real atrasa; a v1 só é testada com lotes simulados. |
| **Perguntas para o negócio** | 1) Qual a data para a TI responder sobre MPI, Big Data e UFMT? 2) Os parceiros aceitam o padrão comum de lote proposto (sim/não)? |
| **Dono sugerido** | TI SEFAZ-MT e parceiros |
| **Sugestão de tratamento** | Levar o contrato comum da API aos parceiros na spec-api-contracts e registrar prazos. ICE: 5 × 5 × 2 = 50 |
| **Sugestão de artefato** | api-contracts.yaml com o padrão comum; GAP por fonte se houver divergência |
| **Afeta** | requirements.md MOD-INGESTAO, MOD-SCORE; api-contracts (futuro) |
| **Features bloqueadas** | RF-MOD-INGESTAO-01, RF-MOD-SCORE-01 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-001 |

<!-- id: gap-004 -->

### GAP-004 — Provedor de mensagens

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | EXTERNAL_DEPENDENCY |
| **Severidade** | ALTA |
| **Status** | dep. externa |
| **Tema** | Provedor de mensagens |
| **Descrição** | O contrato técnico do provedor de e-mail, SMS e WhatsApp está fora da estimativa, a contratação do WhatsApp precisa ser verificada e o papel do SNE como canal não está definido. |
| **Impacto se não resolvido** | As réguas não têm canal de envio. |
| **Perguntas para o negócio** | 1) O WhatsApp Business já está contratado (sim/não)? 2) O e-mail sai pelo serviço institucional da SEFAZ (sim/não)? |
| **Dono sugerido** | TI SEFAZ-MT (DevSecOps) |
| **Sugestão de tratamento** | TI informa provedores e prazos; o produto mantém a camada por canal para trocar de provedor. ICE: 4 × 5 × 2 = 40 |
| **Sugestão de artefato** | ADR na spec-hld; contratos de saída na spec-api-contracts |
| **Afeta** | requirements.md RF-MOD-REGUAS-05 a 07 |
| **Features bloqueadas** | RF-MOD-REGUAS-05, RF-MOD-REGUAS-06 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-004 |

<!-- id: gap-003 -->

### GAP-003 — Matriz de acesso por papel

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Matriz de acesso por papel |
| **Descrição** | A matriz de acesso dos 5 papéis e o compartilhamento dos painéis são proposta da ETF, marcada «a validar». |
| **Impacto se não resolvido** | Permissões erradas na v1 expõem dados ou travam a operação. |
| **Perguntas para o negócio** | 1) A matriz da ETF §6.4 está aprovada como está (sim/não)? 2) O Gestor de Integração pode ver o Painel do Score (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Validar a matriz em reunião com a Coordenação. ICE: 4 × 4 × 3 = 48 |
| **Sugestão de artefato** | Ajuste em especificacao-funcional (congelado → requirements.md) e no plano de segurança |
| **Afeta** | requirements.md RF-MOD-GOVERNANCA-01, 02; product-requirements.md |
| **Features bloqueadas** | RF-MOD-GOVERNANCA-01 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-003 |

<!-- id: gap-008 -->

### GAP-008 — Atribuição com vários canais

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Atribuição com vários canais |
| **Descrição** | Quando houve contato por mais de um canal na janela de atribuição, não está definido qual canal recebe o crédito; vale provisoriamente o mais recente. |
| **Impacto se não resolvido** | O retorno por canal pode favorecer o último canal da régua. |
| **Perguntas para o negócio** | 1) Vale o contato mais recente (sim/não)? 2) A janela de 30 dias está aprovada (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Coordenação confirma a regra provisória. ICE: 3 × 4 × 4 = 48 |
| **Sugestão de artefato** | Ajuste em RN-NOVO-MON-003 |
| **Afeta** | business-rules.md RN-NOVO-MON-003; requirements.md RF-MOD-MONITORAMENTO-02 |
| **Features bloqueadas** | RF-MOD-MONITORAMENTO-02, RF-MOD-MONITORAMENTO-05 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-008; requirements.md#QA-03; business-rules.md#QA-02 |

<!-- id: gap-022 -->

### GAP-022 — Atendente desativado ou ausente

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Atendente desativado ou ausente |
| **Descrição** | Não está definido o que acontece com os casos quando um atendente é desativado ou sai de férias. |
| **Impacto se não resolvido** | Casos ficam parados na fila de quem não está trabalhando. |
| **Perguntas para o negócio** | 1) Ao desativar um atendente, os casos dele são redistribuídos automaticamente (sim/não)? 2) Em férias, o coordenador reatribui à mão (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Definir a regra de redistribuição usando a mesma regra de distribuição. ICE: 3 × 3 × 5 = 45 |
| **Sugestão de artefato** | Nova RN-NOVO-CQ (redistribuição); cenário em RF-MOD-QUALIFICADA-02 |
| **Afeta** | business-rules.md RN-NOVO-CQ-001; requirements.md RF-MOD-QUALIFICADA-02, 07 |
| **Features bloqueadas** | RF-MOD-QUALIFICADA-02, RF-MOD-QUALIFICADA-07 |
| **Fonte** | Origem: P-005; F-180 (API de férias e afastamentos) |

<!-- id: gap-027 -->

### GAP-027 — Régua para quem tem protesto

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Régua para quem tem protesto |
| **Descrição** | Contribuinte com sinalização de cobrança coercitiva ativa (ex.: protesto via PGE) continua elegível à régua; não está definido se ele deve ser excluído. |
| **Impacto se não resolvido** | Mensagens de cobrança administrativa a quem já está em cobrança coercitiva podem confundir o contribuinte. |
| **Perguntas para o negócio** | 1) Contribuinte com sinalização ativa sai da régua (sim/não)? 2) Ele pode virar caso na qualificada (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Coordenação decide; se excluir, a sinalização vira critério da carteira. ICE: 3 × 3 × 5 = 45 |
| **Sugestão de artefato** | Ajuste em RN-NOVO-ING-007 e no motor de critérios (RN-NOVO-QUA-004) |
| **Afeta** | business-rules.md RN-NOVO-ING-007, RN-NOVO-QUA-004 |
| **Features bloqueadas** | RF-MOD-QUALIFICACAO-01, RF-MOD-REGUAS-02 |
| **Fonte** | Origem: P-008; F-157 |

<!-- id: gap-025 -->

### GAP-025 — Contato-chave do contribuinte

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Contato-chave do contribuinte |
| **Descrição** | O protótipo v3 tem contato-chave editável (nome, cargo, telefone, e-mail) no dossiê; a ETF não modela esse dado. |
| **Impacto se não resolvido** | Ou o dossiê perde um dado útil ao atendente, ou entra dado pessoal sem base legal definida. |
| **Perguntas para o negócio** | 1) O contato-chave entra na v1 (sim/não)? 2) Se sim, quem pode editá-lo? |
| **Dono sugerido** | Coordenação de Cobrança + Jurídico |
| **Sugestão de tratamento** | Decidir junto com a Cobrança Ativa (fora da v1), de onde o campo veio. ICE: 2 × 4 × 5 = 40 |
| **Sugestão de artefato** | Campo no dossiê (PR-MOD-QUALIFICADA-002) e entidade no data-model, se aprovado |
| **Afeta** | product-requirements.md PR-MOD-QUALIFICADA-002; requirements.md RF-MOD-QUALIFICADA-04 |
| **Features bloqueadas** | RF-MOD-QUALIFICADA-04 |
| **Fonte** | Origem: P-003; INF-004 |

<!-- id: gap-026 -->

### GAP-026 — Capacidade da cobrança qualificada

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Capacidade da cobrança qualificada |
| **Descrição** | Não há limite de casos por atendente; a carteira qualificada pode gerar mais casos do que a equipe consegue trabalhar. |
| **Impacto se não resolvido** | Filas enormes sem prioridade efetiva e casos que nunca são abertos. |
| **Perguntas para o negócio** | 1) Existe um limite de casos abertos por atendente (sim/não; quantos)? 2) Casos acima da capacidade ficam em espera ou voltam para a massificada? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Coordenação informa a capacidade da equipe; resultado: regra de limite. ICE: 3 × 3 × 4 = 36 |
| **Sugestão de artefato** | Nova RN-NOVO-CQ (limite por atendente) |
| **Afeta** | business-rules.md MOD-QUALIFICADA; requirements.md RF-MOD-QUALIFICADA-01, 02 |
| **Features bloqueadas** | RF-MOD-QUALIFICADA-02 |
| **Fonte** | Origem: P-007; INF-002 |

<!-- id: gap-016 -->

### GAP-016 — Edição de régua em uso

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Edição de régua em uso |
| **Descrição** | Não está definido se alterar uma régua ativa cria nova versão ou altera a vigente. |
| **Impacto se não resolvido** | Contribuintes no meio da régua podem receber etapas inconsistentes. |
| **Perguntas para o negócio** | 1) Alterar régua ativa cria nova versão (sim/não)? 2) Quem está no meio da régua termina na versão antiga (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Adotar o mesmo modelo de versão dos critérios. ICE: 3 × 3 × 4 = 36 |
| **Sugestão de artefato** | Nova RN-NOVO-REG (versão de régua) |
| **Afeta** | business-rules.md MOD-REGUAS; requirements.md RF-MOD-REGUAS-01 |
| **Features bloqueadas** | RF-MOD-REGUAS-01 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-016 |

<!-- id: gap-020 -->

### GAP-020 — Metas dos requisitos não funcionais

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Metas dos requisitos não funcionais |
| **Descrição** | Os valores-alvo dos RNF (consolidação em até 4 horas, envio em até 6 horas, alerta em até 15 minutos, coleta até 08:00) foram propostos nesta simulação, sem fonte. |
| **Impacto se não resolvido** | Testes de carga e aceite usariam metas que ninguém aprovou. |
| **Perguntas para o negócio** | 1) A consolidação pode levar até 4 horas (sim/não)? 2) O envio diário pode levar até 6 horas (sim/não)? 3) Os painéis precisam estar atualizados até 08:00 (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança + TI |
| **Sugestão de tratamento** | Validar as quatro metas com Coordenação e TI. ICE: 3 × 2 × 5 = 30 |
| **Sugestão de artefato** | Ajuste dos RNF em requirements.md |
| **Afeta** | requirements.md RNF-DES-001, RNF-DES-002, RNF-CON-001, RNF-CON-002 |
| **Features bloqueadas** | RNF-DES-001, RNF-DES-002 |
| **Fonte** | Origem: P-002; requirements.md#QA-02 |

<!-- id: gap-024 -->

### GAP-024 — Retenção de dados pessoais

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Retenção de dados pessoais |
| **Descrição** | Não há política de retenção para registros rejeitados (que guardam a linha original), comunicações, interações e contatos. |
| **Impacto se não resolvido** | Risco de manter dado pessoal além do necessário (LGPD). |
| **Perguntas para o negócio** | 1) Por quanto tempo os registros rejeitados ficam guardados? 2) Comunicações e interações seguem o prazo de guarda dos processos fiscais (sim/não)? |
| **Dono sugerido** | Jurídico / encarregado de dados (DPO) |
| **Sugestão de tratamento** | Levar ao encarregado de dados; resultado: prazos por tipo de registro. ICE: 3 × 3 × 3 = 27 |
| **Sugestão de artefato** | Novo RNF de retenção em requirements.md; regra no plano de segurança |
| **Afeta** | requirements.md (novo RNF); business-rules.md MOD-GOVERNANCA |
| **Features bloqueadas** | RF-MOD-INGESTAO-08 |
| **Fonte** | Origem: P-006; ETF §4.2 x_cbi_registro_rejeitado |

<!-- id: gap-010 -->

### GAP-010 — Janela do ciclo diário

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Janela do ciclo diário |
| **Descrição** | A consolidação diária para ~1,8 milhão de contribuintes é assumida; faltam os horários-limite de cada fonte. |
| **Impacto se não resolvido** | O fechamento do ciclo (RF-MOD-INGESTAO-05) não tem horário para marcar a fonte em falha. |
| **Perguntas para o negócio** | 1) Qual o horário-limite de entrega de cada fonte? 2) A consolidação roda de madrugada (sim/não)? |
| **Dono sugerido** | TI SEFAZ-MT |
| **Sugestão de tratamento** | TI informa os horários; entram como parâmetro. ICE: 3 × 3 × 3 = 27 |
| **Sugestão de artefato** | Valores do parâmetro PRAZO_RECEBIMENTO_FONTE |
| **Afeta** | requirements.md RF-MOD-INGESTAO-05; product-requirements.md TEL-013 |
| **Features bloqueadas** | RF-MOD-INGESTAO-05 |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-010 |

<!-- id: gap-014 -->

### GAP-014 — Premissas do plano

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | MÉDIA |
| **Status** | aberto |
| **Tema** | Premissas do plano |
| **Descrição** | As premissas com a gestão do contrato (ritos, ambientes, dados, homologação, treinamento, mudança de escopo) estão a preencher. |
| **Impacto se não resolvido** | Homologação e ambientes sem acordo formal. |
| **Perguntas para o negócio** | 1) As premissas serão fechadas na missão presencial (sim/não)? |
| **Dono sugerido** | Gestão do contrato |
| **Sugestão de tratamento** | Fechar na missão presencial. ICE: 2 × 4 × 3 = 24 |
| **Sugestão de artefato** | Atualização do plano de implementação (fora do kit) |
| **Afeta** | — |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-014 |

<!-- id: gap-021 -->

### GAP-021 — Linha de base dos indicadores

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | aberto |
| **Tema** | Linha de base dos indicadores |
| **Descrição** | O efeito incremental e o percentual de ciclos completos não têm linha de base: o grupo de controle hoje é sorteado à mão e não há série. |
| **Impacto se não resolvido** | As metas dos OKR ficam sem referência. |
| **Perguntas para o negócio** | 1) Aceita medir no primeiro ciclo e recalibrar as metas depois (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Medir no primeiro ciclo. ICE: 2 × 4 × 5 = 40 |
| **Sugestão de artefato** | Ajuste em product-vision.md §4 |
| **Afeta** | product-vision.md §4 |
| **Features bloqueadas** | — |
| **Fonte** | Origem: product-vision.md#QA-01, #QA-02 |

<!-- id: gap-013 -->

### GAP-013 — Nome do escopo da aplicação

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | EXTERNAL_DEPENDENCY |
| **Severidade** | BAIXA |
| **Status** | dep. externa |
| **Tema** | Nome do escopo da aplicação |
| **Descrição** | O nome do escopo (`x_cbi_`) está a confirmar. |
| **Impacto se não resolvido** | Renomear tabelas depois da construção custa retrabalho. |
| **Perguntas para o negócio** | 1) O escopo `x_cbi_` está aprovado pela TI (sim/não)? |
| **Dono sugerido** | TI SEFAZ-MT |
| **Sugestão de tratamento** | Confirmar antes da spec-data-model. ICE: 2 × 4 × 5 = 40 |
| **Sugestão de artefato** | Nome do escopo no data-model |
| **Afeta** | modelo de dados (futuro data-model.json) |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-013 |

<!-- id: gap-012 -->

### GAP-012 — B-Cadastro e Cadastro de Contadores

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | aberto |
| **Tema** | B-Cadastro e Cadastro de Contadores |
| **Descrição** | Há APIs prontas de cadastro e de vínculo contador–contribuinte que a ETF não usa. |
| **Impacto se não resolvido** | O dossiê pode ficar sem dados cadastrais e sem o contador. |
| **Perguntas para o negócio** | 1) O dossiê deve mostrar o contador do contribuinte (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança + TI |
| **Sugestão de tratamento** | Decidir junto com o GAP-025. ICE: 2 × 4 × 4 = 32 |
| **Sugestão de artefato** | Nova integração em requirements.md, se aprovada |
| **Afeta** | requirements.md MOD-INGESTAO |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-012 |

<!-- id: gap-011 -->

### GAP-011 — Escopo dos instrumentos coercitivos

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | aberto |
| **Tema** | Escopo dos instrumentos coercitivos |
| **Descrição** | Hoje a sinalização coercitiva é só informativa (RN-NOVO-ING-007); falta confirmar que o produto não opera protesto nem inscrição. |
| **Impacto se não resolvido** | Pedido futuro de operar protesto viraria mudança de escopo. |
| **Perguntas para o negócio** | 1) Confirma que o produto só exibe a sinalização (sim/não)? |
| **Dono sugerido** | Coordenação de Cobrança (CPRF) |
| **Sugestão de tratamento** | Confirmação simples. ICE: 1 × 4 × 5 = 20 |
| **Sugestão de artefato** | — |
| **Afeta** | business-rules.md RN-NOVO-ING-007 |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-011 |

<!-- id: gap-006 -->

### GAP-006 — Cronograma e equipe

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | aberto |
| **Tema** | Cronograma e equipe |
| **Descrição** | A ETF prevê um desenvolvedor por 13 semanas; o plano fala em squad até abril de 2027. |
| **Impacto se não resolvido** | Fora desta simulação (sem horas); afeta a estimativa quando ela rodar. |
| **Perguntas para o negócio** | 1) A construção será por um desenvolvedor ou por squad? |
| **Dono sugerido** | Gestão do contrato |
| **Sugestão de tratamento** | Tratar quando a spec-estimate rodar. ICE: 1 × 4 × 4 = 16 |
| **Sugestão de artefato** | Parâmetros da spec-estimate |
| **Afeta** | — |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-006 |

<!-- id: gap-005 -->

### GAP-005 — Cobrança Ativa por telefone

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | resolvido |
| **Tema** | Cobrança Ativa por telefone |
| **Descrição** | O protótipo v3 tem a «Cobrança Ativa — Lista de Ligações», que a ETF não cobre. **Decisão consolidada:** fica fora da v1 — Pedro, 2026-11-13 (seguiu a sugestão). |
| **Impacto se não resolvido** | — |
| **Perguntas para o negócio** | — |
| **Dono sugerido** | Pedro |
| **Sugestão de tratamento** | Decidido. ICE: — |
| **Sugestão de artefato** | Registrado no escopo Não É e no roadmap Later |
| **Afeta** | product-vision.md §5 e §8; requirements.md matriz de cobertura; modules.md |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-005 |

<!-- id: gap-009 -->

### GAP-009 — Regra de distribuição de casos

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | resolvido |
| **Tema** | Regra de distribuição de casos |
| **Descrição** | A wiki previa vínculo contador ↔ atendente e a ETF, carga ou grupo. **Decisão consolidada:** distribuição por carga ou por grupo; vínculo contador ↔ atendente fora da v1 — Pedro, 2026-11-13 (seguiu a sugestão). |
| **Impacto se não resolvido** | — |
| **Perguntas para o negócio** | — |
| **Dono sugerido** | Pedro |
| **Sugestão de tratamento** | Decidido. ICE: — |
| **Sugestão de artefato** | RN-NOVO-CQ-001 com algoritmo |
| **Afeta** | business-rules.md RN-NOVO-CQ-001; product-vision.md §5 |
| **Features bloqueadas** | — |
| **Fonte** | Origem: outputs/explore/gaps.md#GAP-009 |

<!-- id: gap-018 -->

### GAP-018 — Score na v1

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | resolvido |
| **Tema** | Score na v1 |
| **Descrição** | ETF e plano punham o score na v1; wiki e protótipo, no segundo horizonte. **Decisão consolidada:** score na v1 com critérios determinísticos quando faltar — Pedro, 2026-11-13. |
| **Impacto se não resolvido** | — |
| **Perguntas para o negócio** | — |
| **Dono sugerido** | Pedro |
| **Sugestão de tratamento** | Decidido. ICE: — |
| **Sugestão de artefato** | RN-NOVO-SCO-001 |
| **Afeta** | business-rules.md RN-NOVO-SCO-001; requirements.md MOD-SCORE; product-vision.md §5 |
| **Features bloqueadas** | — |
| **Fonte** | Origem: context-map.md#1 (contradição) |

<!-- id: gap-019 -->

### GAP-019 — Tamanho do grupo de controle

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | PENDING_DECISION |
| **Severidade** | BAIXA |
| **Status** | resolvido |
| **Tema** | Tamanho do grupo de controle |
| **Descrição** | ETF: 3% da carteira; wiki: cerca de 500 por ciclo. **Decisão consolidada:** 3% da carteira segmentada, parametrizável — Pedro, 2026-11-13. |
| **Impacto se não resolvido** | — |
| **Perguntas para o negócio** | — |
| **Dono sugerido** | Pedro |
| **Sugestão de tratamento** | Decidido. ICE: — |
| **Sugestão de artefato** | RN-NOVO-QUA-003 com algoritmo |
| **Afeta** | business-rules.md RN-NOVO-QUA-003; product-requirements.md TEL-013 |
| **Features bloqueadas** | — |
| **Fonte** | Origem: context-map.md#2 (contradição) |
