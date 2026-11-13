# Documento de Gaps — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

**Gerado por:** spec-tasks v5.3
**Data:** 2026-11-13
**Projeto:** Cobrança Inteligente — aplicação escopada x_cbi_ no ServiceNow

> **Instruções:** cada lacuna abaixo mantém o mesmo número da lista de lacunas do Plan. A seção «Respostas» traz o que já foi decidido; quando uma lacuna for respondida, o agente propaga a resposta para o backlog e para o registro cronológico.

> Nenhuma lacuna nova foi aberta na montagem do backlog: as dúvidas encontradas já estavam numeradas.

---

## Gaps Identificados

### GAP-028 — Fonte do consentimento por canal

**Área:** REGUAS
**Impacto:** Alta
**Tipo:** INTEGRAÇÃO
**Situação:** aberto — ⚠️ BLOQUEADO
**Histórias afetadas:** STORY-027, STORY-029, STORY-030
**Tasks afetadas:** TASK-027-01, TASK-027-02, TASK-029-01, TASK-029-02, TASK-030-01, TASK-030-02, TASK-059-01

**Descrição:**
A regra de consentimento (RN-NOVO-REG-002) só deixa enviar mensagem a quem tem opt-in vigente no canal. Mas a única API de consentimento listada é a do IPVA. Para ICMS, ITCD e parcelamentos não há fonte de opt-in para e-mail, SMS ou WhatsApp.

**Contexto:**
Impacto se não resolvido: Com a regra atual, nenhum contribuinte de ICMS, ITCD ou parcelamento recebe mensagem, e as réguas desses segmentos ficam vazias.

**Opções identificadas:**
1. Reunião curta com Jurídico e TI para separar canais que exigem opt-in (WhatsApp) dos que não exigem (e-mail institucional) e apontar a fonte do opt-in. Resultado: regra de consentimento por canal. ICE: 5 × 4 × 3 = 60
2. Perguntas ao negócio: 1) O e-mail institucional exige opt-in, ou o cadastro do contribuinte basta (sim/não)? 2) De onde vem o opt-in de SMS e WhatsApp para ICMS e ITCD: B-Cadastro, DT-e ou um novo cadastro? 3) Enquanto não houver fonte, as réguas desses segmentos usam só e-mail (sim/não)?

---

### GAP-015 — Validação jurídica dos modelos

**Área:** REGUAS
**Impacto:** Alta
**Tipo:** REGULATÓRIO
**Situação:** dep. externa
**Histórias afetadas:** STORY-026, STORY-030
**Tasks afetadas:** TASK-026-01, TASK-026-02, TASK-030-01, TASK-030-02

**Descrição:**
A matriz de canais × aceite e a redação dos modelos de mensagem precisam respeitar o sigilo fiscal e ainda não foram validadas pelo jurídico.

**Contexto:**
Impacto se não resolvido: As réguas não podem ser ativadas em produção sem a validação; risco de quebra de sigilo fiscal.

**Opções identificadas:**
1. Enviar ao jurídico a lista de variáveis dos modelos e a matriz canal × dado; resultado: lista de dados permitidos por canal. ICE: 4 × 4 × 2 = 32
2. Perguntas ao negócio: 1) Quais dados (valor, tributo, número do débito) podem aparecer em SMS e WhatsApp? 2) Há modelo padrão aprovado pelo jurídico para reaproveitar (sim/não)?

---

### GAP-002 — Licença do Platform Analytics

**Área:** MONITORAMENTO, SCORE
**Impacto:** Alta
**Tipo:** NEGÓCIO
**Situação:** dep. externa
**Histórias afetadas:** STORY-025, STORY-044
**Tasks afetadas:** TASK-025-01, TASK-025-02, TASK-044-01, TASK-044-02, TASK-058-01

**Descrição:**
Os indicadores e os dois painéis dependem do Platform Analytics, cuja licença não foi confirmada.

**Contexto:**
Impacto se não resolvido: Sem licença, o Painel Institucional e o Painel do Score precisam de outra solução, e a métrica principal fica sem painel.

**Opções identificadas:**
1. Confirmar o licenciamento com a gestão do contrato; se não houver, definir o substituto antes da spec-hld. ICE: 4 × 5 × 4 = 80
2. Perguntas ao negócio: 1) A instância da SEFAZ-MT tem Platform Analytics licenciado (sim/não)? 2) Se não, os relatórios nativos do ServiceNow são aceitos como substituto (sim/não)?

---

### GAP-007 — Desempate entre segmentos

**Área:** QUALIFICACAO
**Impacto:** Alta
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-019
**Tasks afetadas:** TASK-019-01, TASK-019-02

**Descrição:**
Um contribuinte pode atender aos critérios da massificada e da qualificada; a regra de um eixo por ciclo (RN-NOVO-QUA-002) não diz qual vence.

**Contexto:**
Impacto se não resolvido: A segmentação pode colocar o mesmo contribuinte em régua e em caso, ou depender de ordem de processamento.

**Opções identificadas:**
1. Coordenação confirma a regra provisória (qualificada vence quando o valor passa do limite dela). ICE: 4 × 4 × 5 = 80
2. Perguntas ao negócio: 1) Quando atende aos dois, vale a qualificada (sim/não)? 2) Se não, qual critério desempata: valor, atraso ou score?

---

### GAP-023 — Duração do ciclo de cobrança

**Área:** MONITORAMENTO, QUALIFICACAO
**Impacto:** Alta
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-020, STORY-021, STORY-045
**Tasks afetadas:** TASK-020-01, TASK-020-02, TASK-021-01, TASK-021-02, TASK-045-01, TASK-045-02

**Descrição:**
Os documentos usam «ciclo» para a carga diária e para a carteira (o protótipo mostra «Ciclo · Junho/2026»). Não está definido quanto dura o ciclo da carteira, quando ela é refeita e o que acontece com réguas e casos em andamento na virada.

**Contexto:**
Impacto se não resolvido: Sem isso, não dá para definir quando o grupo de controle é sorteado de novo, nem como os indicadores comparam ciclos.

**Opções identificadas:**
1. Coordenação define a duração do ciclo e a regra de virada; resultado: nova regra de ciclo. ICE: 5 × 3 × 4 = 60
2. Perguntas ao negócio: 1) O ciclo da carteira é mensal (sim/não)? 2) Na virada do ciclo, réguas em andamento continuam até o fim (sim/não)? 3) Casos abertos passam para o ciclo seguinte (sim/não)?

---

### GAP-017 — Fonte da lista de contumazes

**Área:** QUALIFICACAO
**Impacto:** Alta
**Tipo:** INTEGRAÇÃO
**Situação:** dep. externa
**Histórias afetadas:** STORY-016
**Tasks afetadas:** TASK-016-01, TASK-016-02

**Descrição:**
A exclusão de contumazes é critério da carteira, mas a TI informa que o controle de contumazes está no Credep, fora das seis fontes.

**Contexto:**
Impacto se não resolvido: O critério «excluir contumazes» não funciona sem a fonte.

**Opções identificadas:**
1. TI confirma a fonte; até lá, o indicador vem da CCF. ICE: 3 × 5 × 4 = 60
2. Perguntas ao negócio: 1) O Credep vira fonte do produto (sim/não)? 2) Se não, a CCF consegue enviar a marca de contumaz (sim/não)?

---

### GAP-001 — Contratos das APIs das fontes

**Área:** INGESTAO, SCORE
**Impacto:** Alta
**Tipo:** INTEGRAÇÃO
**Situação:** dep. externa
**Histórias afetadas:** STORY-001, STORY-022
**Tasks afetadas:** TASK-001-01, TASK-001-02, TASK-022-01, TASK-022-02, TASK-060-01

**Descrição:**
Os campos exatos de cada fonte não estão fechados; MPI, Big Data e UFMT estão sem resposta da TI e IPVA e ITCD estão «a desenvolver».

**Contexto:**
Impacto se não resolvido: A integração real atrasa; a v1 só é testada com lotes simulados.

**Opções identificadas:**
1. Levar o contrato comum da API aos parceiros na spec-api-contracts e registrar prazos. ICE: 5 × 5 × 2 = 50
2. Perguntas ao negócio: 1) Qual a data para a TI responder sobre MPI, Big Data e UFMT? 2) Os parceiros aceitam o padrão comum de lote proposto (sim/não)?

---

### GAP-004 — Provedor de mensagens

**Área:** REGUAS
**Impacto:** Alta
**Tipo:** INTEGRAÇÃO
**Situação:** dep. externa
**Histórias afetadas:** STORY-030, STORY-031
**Tasks afetadas:** TASK-030-01, TASK-030-02, TASK-031-01, TASK-031-02, TASK-057-01

**Descrição:**
O contrato técnico do provedor de e-mail, SMS e WhatsApp está fora da estimativa, a contratação do WhatsApp precisa ser verificada e o papel do SNE como canal não está definido.

**Contexto:**
Impacto se não resolvido: As réguas não têm canal de envio.

**Opções identificadas:**
1. TI informa provedores e prazos; o produto mantém a camada por canal para trocar de provedor. ICE: 4 × 5 × 2 = 40
2. Perguntas ao negócio: 1) O WhatsApp Business já está contratado (sim/não)? 2) O e-mail sai pelo serviço institucional da SEFAZ (sim/não)?

---

### GAP-003 — Matriz de acesso por papel

**Área:** GOVERNANCA
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-050
**Tasks afetadas:** TASK-050-01, TASK-050-02

**Descrição:**
A matriz de acesso dos 5 papéis e o compartilhamento dos painéis são proposta da ETF, marcada «a validar».

**Contexto:**
Impacto se não resolvido: Permissões erradas na v1 expõem dados ou travam a operação.

**Opções identificadas:**
1. Validar a matriz em reunião com a Coordenação. ICE: 4 × 4 × 3 = 48
2. Perguntas ao negócio: 1) A matriz da ETF §6.4 está aprovada como está (sim/não)? 2) O Gestor de Integração pode ver o Painel do Score (sim/não)?

---

### GAP-008 — Atribuição com vários canais

**Área:** MONITORAMENTO
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-043, STORY-046
**Tasks afetadas:** TASK-043-01, TASK-043-02, TASK-046-01, TASK-046-02

**Descrição:**
Quando houve contato por mais de um canal na janela de atribuição, não está definido qual canal recebe o crédito; vale provisoriamente o mais recente.

**Contexto:**
Impacto se não resolvido: O retorno por canal pode favorecer o último canal da régua.

**Opções identificadas:**
1. Coordenação confirma a regra provisória. ICE: 3 × 4 × 4 = 48
2. Perguntas ao negócio: 1) Vale o contato mais recente (sim/não)? 2) A janela de 30 dias está aprovada (sim/não)?

---

### GAP-022 — Atendente desativado ou ausente

**Área:** QUALIFICADA
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-036, STORY-041
**Tasks afetadas:** TASK-036-01, TASK-036-02, TASK-041-01, TASK-041-02

**Descrição:**
Não está definido o que acontece com os casos quando um atendente é desativado ou sai de férias.

**Contexto:**
Impacto se não resolvido: Casos ficam parados na fila de quem não está trabalhando.

**Opções identificadas:**
1. Definir a regra de redistribuição usando a mesma regra de distribuição. ICE: 3 × 3 × 5 = 45
2. Perguntas ao negócio: 1) Ao desativar um atendente, os casos dele são redistribuídos automaticamente (sim/não)? 2) Em férias, o coordenador reatribui à mão (sim/não)?

---

### GAP-027 — Régua para quem tem protesto

**Área:** QUALIFICACAO, REGUAS
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-016, STORY-027
**Tasks afetadas:** TASK-016-01, TASK-016-02, TASK-027-01, TASK-027-02

**Descrição:**
Contribuinte com sinalização de cobrança coercitiva ativa (ex.: protesto via PGE) continua elegível à régua; não está definido se ele deve ser excluído.

**Contexto:**
Impacto se não resolvido: Mensagens de cobrança administrativa a quem já está em cobrança coercitiva podem confundir o contribuinte.

**Opções identificadas:**
1. Coordenação decide; se excluir, a sinalização vira critério da carteira. ICE: 3 × 3 × 5 = 45
2. Perguntas ao negócio: 1) Contribuinte com sinalização ativa sai da régua (sim/não)? 2) Ele pode virar caso na qualificada (sim/não)?

---

### GAP-025 — Contato-chave do contribuinte

**Área:** QUALIFICADA
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-038
**Tasks afetadas:** TASK-038-01, TASK-038-02

**Descrição:**
O protótipo v3 tem contato-chave editável (nome, cargo, telefone, e-mail) no dossiê; a ETF não modela esse dado.

**Contexto:**
Impacto se não resolvido: Ou o dossiê perde um dado útil ao atendente, ou entra dado pessoal sem base legal definida.

**Opções identificadas:**
1. Decidir junto com a Cobrança Ativa (fora da v1), de onde o campo veio. ICE: 2 × 4 × 5 = 40
2. Perguntas ao negócio: 1) O contato-chave entra na v1 (sim/não)? 2) Se sim, quem pode editá-lo?

---

### GAP-026 — Capacidade da cobrança qualificada

**Área:** QUALIFICADA
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-035, STORY-036
**Tasks afetadas:** TASK-035-01, TASK-035-02, TASK-036-01, TASK-036-02

**Descrição:**
Não há limite de casos por atendente; a carteira qualificada pode gerar mais casos do que a equipe consegue trabalhar.

**Contexto:**
Impacto se não resolvido: Filas enormes sem prioridade efetiva e casos que nunca são abertos.

**Opções identificadas:**
1. Coordenação informa a capacidade da equipe; resultado: regra de limite. ICE: 3 × 3 × 4 = 36
2. Perguntas ao negócio: 1) Existe um limite de casos abertos por atendente (sim/não; quantos)? 2) Casos acima da capacidade ficam em espera ou voltam para a massificada?

---

### GAP-016 — Edição de régua em uso

**Área:** REGUAS
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** STORY-026
**Tasks afetadas:** TASK-026-01, TASK-026-02

**Descrição:**
Não está definido se alterar uma régua ativa cria nova versão ou altera a vigente.

**Contexto:**
Impacto se não resolvido: Contribuintes no meio da régua podem receber etapas inconsistentes.

**Opções identificadas:**
1. Adotar o mesmo modelo de versão dos critérios. ICE: 3 × 3 × 4 = 36
2. Perguntas ao negócio: 1) Alterar régua ativa cria nova versão (sim/não)? 2) Quem está no meio da régua termina na versão antiga (sim/não)?

---

### GAP-020 — Metas dos requisitos não funcionais

**Área:** transversal
**Impacto:** Média
**Tipo:** INTEGRAÇÃO
**Situação:** aberto
**Histórias afetadas:** —
**Tasks afetadas:** TASK-056-01

**Descrição:**
Os valores-alvo dos RNF (consolidação em até 4 horas, envio em até 6 horas, alerta em até 15 minutos, coleta até 08:00) foram propostos nesta simulação, sem fonte.

**Contexto:**
Impacto se não resolvido: Testes de carga e aceite usariam metas que ninguém aprovou.

**Opções identificadas:**
1. Validar as quatro metas com Coordenação e TI. ICE: 3 × 2 × 5 = 30
2. Perguntas ao negócio: 1) A consolidação pode levar até 4 horas (sim/não)? 2) O envio diário pode levar até 6 horas (sim/não)? 3) Os painéis precisam estar atualizados até 08:00 (sim/não)?

---

### GAP-024 — Retenção de dados pessoais

**Área:** INGESTAO
**Impacto:** Média
**Tipo:** REGULATÓRIO
**Situação:** aberto
**Histórias afetadas:** STORY-008
**Tasks afetadas:** TASK-008-01, TASK-008-02

**Descrição:**
Não há política de retenção para registros rejeitados (que guardam a linha original), comunicações, interações e contatos.

**Contexto:**
Impacto se não resolvido: Risco de manter dado pessoal além do necessário (LGPD).

**Opções identificadas:**
1. Levar ao encarregado de dados; resultado: prazos por tipo de registro. ICE: 3 × 3 × 3 = 27
2. Perguntas ao negócio: 1) Por quanto tempo os registros rejeitados ficam guardados? 2) Comunicações e interações seguem o prazo de guarda dos processos fiscais (sim/não)?

---

### GAP-010 — Janela do ciclo diário

**Área:** INGESTAO
**Impacto:** Média
**Tipo:** INTEGRAÇÃO
**Situação:** aberto
**Histórias afetadas:** STORY-005
**Tasks afetadas:** TASK-005-01, TASK-005-02, TASK-005-03

**Descrição:**
A consolidação diária para ~1,8 milhão de contribuintes é assumida; faltam os horários-limite de cada fonte.

**Contexto:**
Impacto se não resolvido: O fechamento do ciclo (RF-MOD-INGESTAO-05) não tem horário para marcar a fonte em falha.

**Opções identificadas:**
1. TI informa os horários; entram como parâmetro. ICE: 3 × 3 × 3 = 27
2. Perguntas ao negócio: 1) Qual o horário-limite de entrega de cada fonte? 2) A consolidação roda de madrugada (sim/não)?

---

### GAP-014 — Premissas do plano

**Área:** transversal
**Impacto:** Média
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
As premissas com a gestão do contrato (ritos, ambientes, dados, homologação, treinamento, mudança de escopo) estão a preencher.

**Contexto:**
Impacto se não resolvido: Homologação e ambientes sem acordo formal.

**Opções identificadas:**
1. Fechar na missão presencial. ICE: 2 × 4 × 3 = 24
2. Perguntas ao negócio: 1) As premissas serão fechadas na missão presencial (sim/não)?

---

### GAP-021 — Linha de base dos indicadores

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
O efeito incremental e o percentual de ciclos completos não têm linha de base: o grupo de controle hoje é sorteado à mão e não há série.

**Contexto:**
Impacto se não resolvido: As metas dos OKR ficam sem referência.

**Opções identificadas:**
1. Medir no primeiro ciclo. ICE: 2 × 4 × 5 = 40
2. Perguntas ao negócio: 1) Aceita medir no primeiro ciclo e recalibrar as metas depois (sim/não)?

---

### GAP-013 — Nome do escopo da aplicação

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** dep. externa
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
O nome do escopo (`x_cbi_`) está a confirmar.

**Contexto:**
Impacto se não resolvido: Renomear tabelas depois da construção custa retrabalho.

**Opções identificadas:**
1. Confirmar antes da spec-data-model. ICE: 2 × 4 × 5 = 40
2. Perguntas ao negócio: 1) O escopo `x_cbi_` está aprovado pela TI (sim/não)?

---

### GAP-012 — B-Cadastro e Cadastro de Contadores

**Área:** transversal
**Impacto:** Baixa
**Tipo:** INTEGRAÇÃO
**Situação:** aberto
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
Há APIs prontas de cadastro e de vínculo contador–contribuinte que a ETF não usa.

**Contexto:**
Impacto se não resolvido: O dossiê pode ficar sem dados cadastrais e sem o contador.

**Opções identificadas:**
1. Decidir junto com o GAP-025. ICE: 2 × 4 × 4 = 32
2. Perguntas ao negócio: 1) O dossiê deve mostrar o contador do contribuinte (sim/não)?

---

### GAP-011 — Escopo dos instrumentos coercitivos

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
Hoje a sinalização coercitiva é só informativa (RN-NOVO-ING-007); falta confirmar que o produto não opera protesto nem inscrição.

**Contexto:**
Impacto se não resolvido: Pedido futuro de operar protesto viraria mudança de escopo.

**Opções identificadas:**
1. Confirmação simples. ICE: 1 × 4 × 5 = 20
2. Perguntas ao negócio: 1) Confirma que o produto só exibe a sinalização (sim/não)?

---

### GAP-006 — Cronograma e equipe

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** aberto
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
A ETF prevê um desenvolvedor por 13 semanas; o plano fala em squad até abril de 2027.

**Contexto:**
Impacto se não resolvido: Fora desta simulação (sem horas); afeta a estimativa quando ela rodar.

**Opções identificadas:**
1. Tratar quando a spec-estimate rodar. ICE: 1 × 4 × 4 = 16
2. Perguntas ao negócio: 1) A construção será por um desenvolvedor ou por squad?

---

### GAP-005 — Cobrança Ativa por telefone

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** resolvido
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
O protótipo v3 tem a «Cobrança Ativa — Lista de Ligações», que a ETF não cobre. **Decisão consolidada:** fica fora da v1 — Pedro, 2026-11-13 (seguiu a sugestão).

**Contexto:**
Impacto se não resolvido: —

**Opções identificadas:**
1. Decidido. ICE: —
2. Perguntas ao negócio: —

---

### GAP-009 — Regra de distribuição de casos

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** resolvido
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
A wiki previa vínculo contador ↔ atendente e a ETF, carga ou grupo. **Decisão consolidada:** distribuição por carga ou por grupo; vínculo contador ↔ atendente fora da v1 — Pedro, 2026-11-13 (seguiu a sugestão).

**Contexto:**
Impacto se não resolvido: —

**Opções identificadas:**
1. Decidido. ICE: —
2. Perguntas ao negócio: —

---

### GAP-018 — Score na v1

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** resolvido
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
ETF e plano punham o score na v1; wiki e protótipo, no segundo horizonte. **Decisão consolidada:** score na v1 com critérios determinísticos quando faltar — Pedro, 2026-11-13.

**Contexto:**
Impacto se não resolvido: —

**Opções identificadas:**
1. Decidido. ICE: —
2. Perguntas ao negócio: —

---

### GAP-019 — Tamanho do grupo de controle

**Área:** transversal
**Impacto:** Baixa
**Tipo:** NEGÓCIO
**Situação:** resolvido
**Histórias afetadas:** —
**Tasks afetadas:** —

**Descrição:**
ETF: 3% da carteira; wiki: cerca de 500 por ciclo. **Decisão consolidada:** 3% da carteira segmentada, parametrizável — Pedro, 2026-11-13.

**Contexto:**
Impacto se não resolvido: —

**Opções identificadas:**
1. Decidido. ICE: —
2. Perguntas ao negócio: —

---

## Respostas

### GAP-028
**Decisão:** **Bloqueado:** a regra de consentimento fica como está e as histórias de régua de ICMS, ITCD e parcelamentos ficam marcadas ⚠️ BLOQUEADO (RF-MOD-REGUAS-02, 04 e 05; RN-NOVO-REG-002)
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** histórias marcadas ⚠️ BLOQUEADO: STORY-027, STORY-029, STORY-030

### GAP-015
**Decisão:** Aceito em aberto: segue sem mudar requisito
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-002
**Decisão:** Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-007
**Decisão:** Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-023
**Decisão:** Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-017
**Decisão:** Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-001
**Decisão:** Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-004
**Decisão:** Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados
**Decidido por:** Pedro
**Data:** 2026-11-13
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-003
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-008
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-022
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-027
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-025
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-026
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-016
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-020
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-024
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-010
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** sem mudança no backlog enquanto em aberto

### GAP-014
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-021
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-013
**Decisão:** dep. externa
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-012
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-011
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-006
**Decisão:** aberto
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-005
**Decisão:** resolvido
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-009
**Decisão:** resolvido
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-018
**Decisão:** resolvido
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

### GAP-019
**Decisão:** resolvido
**Decidido por:** A preencher pelo responsável de negócio
**Data:** —
**Impacto na task:** —

---

*Após preencher as respostas pendentes, informar ao agente para propagar para tasks.json e sync-log.md.*
