"""Gera outputs/spec/gaps.md e gaps-answers.md (spec-iterate, Etapa A)."""
import sys
from pathlib import Path

OUT = Path(sys.argv[1]) / "outputs" / "spec"
EXP = "Origem: outputs/explore/gaps.md#"
# id, tipo, sev, status, tema, descricao, impacto, perguntas, dono, sugestao(ICE), artefato, afeta, features, fonte, ice
G = [
 ("GAP-028", "PENDING_DECISION", "CRÍTICA", "aberto — ⚠️ BLOQUEADO", "Fonte do consentimento por canal",
  "A regra de consentimento (RN-NOVO-REG-002) só deixa enviar mensagem a quem tem opt-in vigente no canal. Mas a única API de consentimento listada é a do IPVA. Para ICMS, ITCD e parcelamentos não há fonte de opt-in para e-mail, SMS ou WhatsApp.",
  "Com a regra atual, nenhum contribuinte de ICMS, ITCD ou parcelamento recebe mensagem, e as réguas desses segmentos ficam vazias.",
  "1) O e-mail institucional exige opt-in, ou o cadastro do contribuinte basta (sim/não)? 2) De onde vem o opt-in de SMS e WhatsApp para ICMS e ITCD: B-Cadastro, DT-e ou um novo cadastro? 3) Enquanto não houver fonte, as réguas desses segmentos usam só e-mail (sim/não)?",
  "Coordenação de Cobrança (CPRF) + Jurídico + TI", "Reunião curta com Jurídico e TI para separar canais que exigem opt-in (WhatsApp) dos que não exigem (e-mail institucional) e apontar a fonte do opt-in. Resultado: regra de consentimento por canal. ICE: 5 × 4 × 3 = 60",
  "Ajustar RN-NOVO-REG-002 com consentimento por canal; nova integração de consentimento em requirements.md se houver fonte", "business-rules.md RN-NOVO-REG-002; requirements.md RF-MOD-REGUAS-04, RNF-SEG-002; especificacao-tecnica (integrações)", "RF-MOD-REGUAS-02, RF-MOD-REGUAS-04, RF-MOD-REGUAS-05", "Origem: P-001; F-120, F-180", 60),
 ("GAP-015", "EXTERNAL_DEPENDENCY", "CRÍTICA", "dep. externa", "Validação jurídica dos modelos",
  "A matriz de canais × aceite e a redação dos modelos de mensagem precisam respeitar o sigilo fiscal e ainda não foram validadas pelo jurídico.",
  "As réguas não podem ser ativadas em produção sem a validação; risco de quebra de sigilo fiscal.",
  "1) Quais dados (valor, tributo, número do débito) podem aparecer em SMS e WhatsApp? 2) Há modelo padrão aprovado pelo jurídico para reaproveitar (sim/não)?",
  "Jurídico da SEFAZ-MT", "Enviar ao jurídico a lista de variáveis dos modelos e a matriz canal × dado; resultado: lista de dados permitidos por canal. ICE: 4 × 4 × 2 = 32",
  "Nova RN-NOVO-REG (dados permitidos por canal); validação de variáveis em RF-MOD-REGUAS-01", "business-rules.md MOD-REGUAS; requirements.md RF-MOD-REGUAS-01, RF-MOD-REGUAS-05", "RF-MOD-REGUAS-01, RF-MOD-REGUAS-05", EXP + "GAP-015", 32),
 ("GAP-002", "EXTERNAL_DEPENDENCY", "ALTA", "dep. externa", "Licença do Platform Analytics",
  "Os indicadores e os dois painéis dependem do Platform Analytics, cuja licença não foi confirmada.",
  "Sem licença, o Painel Institucional e o Painel do Score precisam de outra solução, e a métrica principal fica sem painel.",
  "1) A instância da SEFAZ-MT tem Platform Analytics licenciado (sim/não)? 2) Se não, os relatórios nativos do ServiceNow são aceitos como substituto (sim/não)?",
  "SEFAZ-MT (gestão do contrato)", "Confirmar o licenciamento com a gestão do contrato; se não houver, definir o substituto antes da spec-hld. ICE: 4 × 5 × 4 = 80",
  "ADR na spec-hld; ajuste de RF-MOD-MONITORAMENTO-07 e RF-MOD-SCORE-04", "requirements.md MOD-MONITORAMENTO, MOD-SCORE; product-requirements.md TEL-006, TEL-012", "RF-MOD-MONITORAMENTO-03 a 07, RF-MOD-SCORE-04", EXP + "GAP-002", 80),
 ("GAP-007", "PENDING_DECISION", "ALTA", "aberto", "Desempate entre segmentos",
  "Um contribuinte pode atender aos critérios da massificada e da qualificada; a regra de um eixo por ciclo (RN-NOVO-QUA-002) não diz qual vence.",
  "A segmentação pode colocar o mesmo contribuinte em régua e em caso, ou depender de ordem de processamento.",
  "1) Quando atende aos dois, vale a qualificada (sim/não)? 2) Se não, qual critério desempata: valor, atraso ou score?",
  "Coordenação de Cobrança (CPRF)", "Coordenação confirma a regra provisória (qualificada vence quando o valor passa do limite dela). ICE: 4 × 4 × 5 = 80",
  "Ajustar RN-NOVO-QUA-002 e o Cenário 3 de RF-MOD-QUALIFICACAO-04", "business-rules.md RN-NOVO-QUA-002; requirements.md RF-MOD-QUALIFICACAO-04", "RF-MOD-QUALIFICACAO-04", EXP + "GAP-007; requirements.md#QA-01; business-rules.md#QA-01", 80),
 ("GAP-023", "PENDING_DECISION", "ALTA", "aberto", "Duração do ciclo de cobrança",
  "Os documentos usam «ciclo» para a carga diária e para a carteira (o protótipo mostra «Ciclo · Junho/2026»). Não está definido quanto dura o ciclo da carteira, quando ela é refeita e o que acontece com réguas e casos em andamento na virada.",
  "Sem isso, não dá para definir quando o grupo de controle é sorteado de novo, nem como os indicadores comparam ciclos.",
  "1) O ciclo da carteira é mensal (sim/não)? 2) Na virada do ciclo, réguas em andamento continuam até o fim (sim/não)? 3) Casos abertos passam para o ciclo seguinte (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Coordenação define a duração do ciclo e a regra de virada; resultado: nova regra de ciclo. ICE: 5 × 3 × 4 = 60",
  "Nova RN-NOVO-QUA (ciclo e virada); ajuste em RF-MOD-QUALIFICACAO-06 e RF-MOD-MONITORAMENTO-07", "business-rules.md MOD-QUALIFICACAO; requirements.md RF-MOD-QUALIFICACAO-05, 06; RF-MOD-MONITORAMENTO-04, 07", "RF-MOD-QUALIFICACAO-05, RF-MOD-QUALIFICACAO-06, RF-MOD-MONITORAMENTO-04", "Origem: P-004; F-133, F-170", 60),
 ("GAP-017", "EXTERNAL_DEPENDENCY", "ALTA", "dep. externa", "Fonte da lista de contumazes",
  "A exclusão de contumazes é critério da carteira, mas a TI informa que o controle de contumazes está no Credep, fora das seis fontes.",
  "O critério «excluir contumazes» não funciona sem a fonte.",
  "1) O Credep vira fonte do produto (sim/não)? 2) Se não, a CCF consegue enviar a marca de contumaz (sim/não)?",
  "TI SEFAZ-MT", "TI confirma a fonte; até lá, o indicador vem da CCF. ICE: 3 × 5 × 4 = 60",
  "Nova integração em requirements.md (se Credep) ou campo no contrato da CCF", "requirements.md RF-MOD-QUALIFICACAO-01; business-rules.md RN-NOVO-QUA-004", "RF-MOD-QUALIFICACAO-01", EXP + "GAP-017; requirements.md#QA-04; business-rules.md#QA-03", 60),
 ("GAP-001", "EXTERNAL_DEPENDENCY", "ALTA", "dep. externa", "Contratos das APIs das fontes",
  "Os campos exatos de cada fonte não estão fechados; MPI, Big Data e UFMT estão sem resposta da TI e IPVA e ITCD estão «a desenvolver».",
  "A integração real atrasa; a v1 só é testada com lotes simulados.",
  "1) Qual a data para a TI responder sobre MPI, Big Data e UFMT? 2) Os parceiros aceitam o padrão comum de lote proposto (sim/não)?",
  "TI SEFAZ-MT e parceiros", "Levar o contrato comum da API aos parceiros na spec-api-contracts e registrar prazos. ICE: 5 × 5 × 2 = 50",
  "api-contracts.yaml com o padrão comum; GAP por fonte se houver divergência", "requirements.md MOD-INGESTAO, MOD-SCORE; api-contracts (futuro)", "RF-MOD-INGESTAO-01, RF-MOD-SCORE-01", EXP + "GAP-001", 50),
 ("GAP-004", "EXTERNAL_DEPENDENCY", "ALTA", "dep. externa", "Provedor de mensagens",
  "O contrato técnico do provedor de e-mail, SMS e WhatsApp está fora da estimativa, a contratação do WhatsApp precisa ser verificada e o papel do SNE como canal não está definido.",
  "As réguas não têm canal de envio.",
  "1) O WhatsApp Business já está contratado (sim/não)? 2) O e-mail sai pelo serviço institucional da SEFAZ (sim/não)?",
  "TI SEFAZ-MT (DevSecOps)", "TI informa provedores e prazos; o produto mantém a camada por canal para trocar de provedor. ICE: 4 × 5 × 2 = 40",
  "ADR na spec-hld; contratos de saída na spec-api-contracts", "requirements.md RF-MOD-REGUAS-05 a 07", "RF-MOD-REGUAS-05, RF-MOD-REGUAS-06", EXP + "GAP-004", 40),
 ("GAP-003", "PENDING_DECISION", "MÉDIA", "aberto", "Matriz de acesso por papel",
  "A matriz de acesso dos 5 papéis e o compartilhamento dos painéis são proposta da ETF, marcada «a validar».",
  "Permissões erradas na v1 expõem dados ou travam a operação.",
  "1) A matriz da ETF §6.4 está aprovada como está (sim/não)? 2) O Gestor de Integração pode ver o Painel do Score (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Validar a matriz em reunião com a Coordenação. ICE: 4 × 4 × 3 = 48",
  "Ajuste em especificacao-funcional (congelado → requirements.md) e no plano de segurança", "requirements.md RF-MOD-GOVERNANCA-01, 02; product-requirements.md", "RF-MOD-GOVERNANCA-01", EXP + "GAP-003", 48),
 ("GAP-008", "PENDING_DECISION", "MÉDIA", "aberto", "Atribuição com vários canais",
  "Quando houve contato por mais de um canal na janela de atribuição, não está definido qual canal recebe o crédito; vale provisoriamente o mais recente.",
  "O retorno por canal pode favorecer o último canal da régua.",
  "1) Vale o contato mais recente (sim/não)? 2) A janela de 30 dias está aprovada (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Coordenação confirma a regra provisória. ICE: 3 × 4 × 4 = 48",
  "Ajuste em RN-NOVO-MON-003", "business-rules.md RN-NOVO-MON-003; requirements.md RF-MOD-MONITORAMENTO-02", "RF-MOD-MONITORAMENTO-02, RF-MOD-MONITORAMENTO-05", EXP + "GAP-008; requirements.md#QA-03; business-rules.md#QA-02", 48),
 ("GAP-020", "PENDING_DECISION", "MÉDIA", "aberto", "Metas dos requisitos não funcionais",
  "Os valores-alvo dos RNF (consolidação em até 4 horas, envio em até 6 horas, alerta em até 15 minutos, coleta até 08:00) foram propostos nesta simulação, sem fonte.",
  "Testes de carga e aceite usariam metas que ninguém aprovou.",
  "1) A consolidação pode levar até 4 horas (sim/não)? 2) O envio diário pode levar até 6 horas (sim/não)? 3) Os painéis precisam estar atualizados até 08:00 (sim/não)?",
  "Coordenação de Cobrança + TI", "Validar as quatro metas com Coordenação e TI. ICE: 3 × 2 × 5 = 30",
  "Ajuste dos RNF em requirements.md", "requirements.md RNF-DES-001, RNF-DES-002, RNF-CONF-001, RNF-CONF-002", "RNF-DES-001, RNF-DES-002", "Origem: P-002; requirements.md#QA-02", 30),
 ("GAP-026", "PENDING_DECISION", "MÉDIA", "aberto", "Capacidade da cobrança qualificada",
  "Não há limite de casos por atendente; a carteira qualificada pode gerar mais casos do que a equipe consegue trabalhar.",
  "Filas enormes sem prioridade efetiva e casos que nunca são abertos.",
  "1) Existe um limite de casos abertos por atendente (sim/não; quantos)? 2) Casos acima da capacidade ficam em espera ou voltam para a massificada?",
  "Coordenação de Cobrança (CPRF)", "Coordenação informa a capacidade da equipe; resultado: regra de limite. ICE: 3 × 3 × 4 = 36",
  "Nova RN-NOVO-CQ (limite por atendente)", "business-rules.md MOD-QUALIFICADA; requirements.md RF-MOD-QUALIFICADA-01, 02", "RF-MOD-QUALIFICADA-02", "Origem: P-007; INF-002", 36),
 ("GAP-022", "PENDING_DECISION", "MÉDIA", "aberto", "Atendente desativado ou ausente",
  "Não está definido o que acontece com os casos quando um atendente é desativado ou sai de férias.",
  "Casos ficam parados na fila de quem não está trabalhando.",
  "1) Ao desativar um atendente, os casos dele são redistribuídos automaticamente (sim/não)? 2) Em férias, o coordenador reatribui à mão (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Definir a regra de redistribuição usando a mesma regra de distribuição. ICE: 3 × 3 × 5 = 45",
  "Nova RN-NOVO-CQ (redistribuição); cenário em RF-MOD-QUALIFICADA-02", "business-rules.md RN-NOVO-CQ-001; requirements.md RF-MOD-QUALIFICADA-02, 07", "RF-MOD-QUALIFICADA-02, RF-MOD-QUALIFICADA-07", "Origem: P-005; F-180 (API de férias e afastamentos)", 45),
 ("GAP-027", "PENDING_DECISION", "MÉDIA", "aberto", "Régua para quem tem protesto",
  "Contribuinte com sinalização de cobrança coercitiva ativa (ex.: protesto via PGE) continua elegível à régua; não está definido se ele deve ser excluído.",
  "Mensagens de cobrança administrativa a quem já está em cobrança coercitiva podem confundir o contribuinte.",
  "1) Contribuinte com sinalização ativa sai da régua (sim/não)? 2) Ele pode virar caso na qualificada (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Coordenação decide; se excluir, a sinalização vira critério da carteira. ICE: 3 × 3 × 5 = 45",
  "Ajuste em RN-NOVO-ING-007 e no motor de critérios (RN-NOVO-QUA-004)", "business-rules.md RN-NOVO-ING-007, RN-NOVO-QUA-004", "RF-MOD-QUALIFICACAO-01, RF-MOD-REGUAS-02", "Origem: P-008; F-157", 45),
 ("GAP-024", "PENDING_DECISION", "MÉDIA", "aberto", "Retenção de dados pessoais",
  "Não há política de retenção para registros rejeitados (que guardam a linha original), comunicações, interações e contatos.",
  "Risco de manter dado pessoal além do necessário (LGPD).",
  "1) Por quanto tempo os registros rejeitados ficam guardados? 2) Comunicações e interações seguem o prazo de guarda dos processos fiscais (sim/não)?",
  "Jurídico / encarregado de dados (DPO)", "Levar ao encarregado de dados; resultado: prazos por tipo de registro. ICE: 3 × 3 × 3 = 27",
  "Novo RNF de retenção em requirements.md; regra no plano de segurança", "requirements.md (novo RNF); business-rules.md MOD-GOVERNANCA", "RF-MOD-INGESTAO-08", "Origem: P-006; ETF §4.2 x_cbi_registro_rejeitado", 27),
 ("GAP-025", "PENDING_DECISION", "MÉDIA", "aberto", "Contato-chave do contribuinte",
  "O protótipo v3 tem contato-chave editável (nome, cargo, telefone, e-mail) no dossiê; a ETF não modela esse dado.",
  "Ou o dossiê perde um dado útil ao atendente, ou entra dado pessoal sem base legal definida.",
  "1) O contato-chave entra na v1 (sim/não)? 2) Se sim, quem pode editá-lo?",
  "Coordenação de Cobrança + Jurídico", "Decidir junto com a Cobrança Ativa (fora da v1), de onde o campo veio. ICE: 2 × 4 × 5 = 40",
  "Campo no dossiê (PR-MOD-QUALIFICADA-002) e entidade no data-model, se aprovado", "product-requirements.md PR-MOD-QUALIFICADA-002; requirements.md RF-MOD-QUALIFICADA-04", "RF-MOD-QUALIFICADA-04", "Origem: P-003; INF-004", 40),
 ("GAP-010", "PENDING_DECISION", "MÉDIA", "aberto", "Janela do ciclo diário",
  "A consolidação diária para ~1,8 milhão de contribuintes é assumida; faltam os horários-limite de cada fonte.",
  "O fechamento do ciclo (RF-MOD-INGESTAO-05) não tem horário para marcar a fonte em falha.",
  "1) Qual o horário-limite de entrega de cada fonte? 2) A consolidação roda de madrugada (sim/não)?",
  "TI SEFAZ-MT", "TI informa os horários; entram como parâmetro. ICE: 3 × 3 × 3 = 27",
  "Valores do parâmetro PRAZO_RECEBIMENTO_FONTE", "requirements.md RF-MOD-INGESTAO-05; product-requirements.md TEL-013", "RF-MOD-INGESTAO-05", EXP + "GAP-010", 27),
 ("GAP-016", "PENDING_DECISION", "MÉDIA", "aberto", "Edição de régua em uso",
  "Não está definido se alterar uma régua ativa cria nova versão ou altera a vigente.",
  "Contribuintes no meio da régua podem receber etapas inconsistentes.",
  "1) Alterar régua ativa cria nova versão (sim/não)? 2) Quem está no meio da régua termina na versão antiga (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Adotar o mesmo modelo de versão dos critérios. ICE: 3 × 3 × 4 = 36",
  "Nova RN-NOVO-REG (versão de régua)", "business-rules.md MOD-REGUAS; requirements.md RF-MOD-REGUAS-01", "RF-MOD-REGUAS-01", EXP + "GAP-016", 36),
 ("GAP-014", "PENDING_DECISION", "MÉDIA", "aberto", "Premissas do plano",
  "As premissas com a gestão do contrato (ritos, ambientes, dados, homologação, treinamento, mudança de escopo) estão a preencher.",
  "Homologação e ambientes sem acordo formal.",
  "1) As premissas serão fechadas na missão presencial (sim/não)?",
  "Gestão do contrato", "Fechar na missão presencial. ICE: 2 × 4 × 3 = 24",
  "Atualização do plano de implementação (fora do kit)", "—", "—", EXP + "GAP-014", 24),
 ("GAP-021", "PENDING_DECISION", "BAIXA", "aberto", "Linha de base dos indicadores",
  "O efeito incremental e o percentual de ciclos completos não têm linha de base: o grupo de controle hoje é sorteado à mão e não há série.",
  "As metas dos OKR ficam sem referência.",
  "1) Aceita medir no primeiro ciclo e recalibrar as metas depois (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Medir no primeiro ciclo. ICE: 2 × 4 × 5 = 40",
  "Ajuste em product-vision.md §4", "product-vision.md §4", "—", "Origem: product-vision.md#QA-01, #QA-02", 40),
 ("GAP-012", "PENDING_DECISION", "BAIXA", "aberto", "B-Cadastro e Cadastro de Contadores",
  "Há APIs prontas de cadastro e de vínculo contador–contribuinte que a ETF não usa.",
  "O dossiê pode ficar sem dados cadastrais e sem o contador.",
  "1) O dossiê deve mostrar o contador do contribuinte (sim/não)?",
  "Coordenação de Cobrança + TI", "Decidir junto com o GAP-025. ICE: 2 × 4 × 4 = 32",
  "Nova integração em requirements.md, se aprovada", "requirements.md MOD-INGESTAO", "—", EXP + "GAP-012", 32),
 ("GAP-011", "PENDING_DECISION", "BAIXA", "aberto", "Escopo dos instrumentos coercitivos",
  "Hoje a sinalização coercitiva é só informativa (RN-NOVO-ING-007); falta confirmar que o produto não opera protesto nem inscrição.",
  "Pedido futuro de operar protesto viraria mudança de escopo.",
  "1) Confirma que o produto só exibe a sinalização (sim/não)?",
  "Coordenação de Cobrança (CPRF)", "Confirmação simples. ICE: 1 × 4 × 5 = 20",
  "—", "business-rules.md RN-NOVO-ING-007", "—", EXP + "GAP-011", 20),
 ("GAP-013", "EXTERNAL_DEPENDENCY", "BAIXA", "dep. externa", "Nome do escopo da aplicação",
  "O nome do escopo (`x_cbi_`) está a confirmar.",
  "Renomear tabelas depois da construção custa retrabalho.",
  "1) O escopo `x_cbi_` está aprovado pela TI (sim/não)?",
  "TI SEFAZ-MT", "Confirmar antes da spec-data-model. ICE: 2 × 4 × 5 = 40",
  "Nome do escopo no data-model", "modelo de dados (futuro data-model.json)", "—", EXP + "GAP-013", 40),
 ("GAP-006", "PENDING_DECISION", "BAIXA", "aberto", "Cronograma e equipe",
  "A ETF prevê um desenvolvedor por 13 semanas; o plano fala em squad até abril de 2027.",
  "Fora desta simulação (sem horas); afeta a estimativa quando ela rodar.",
  "1) A construção será por um desenvolvedor ou por squad?",
  "Gestão do contrato", "Tratar quando a spec-estimate rodar. ICE: 1 × 4 × 4 = 16",
  "Parâmetros da spec-estimate", "—", "—", EXP + "GAP-006", 16),
 ("GAP-005", "PENDING_DECISION", "BAIXA", "resolvido", "Cobrança Ativa por telefone",
  "O protótipo v3 tem a «Cobrança Ativa — Lista de Ligações», que a ETF não cobre. **Decisão consolidada:** fica fora da v1 — Pedro, 2026-11-13 (seguiu a sugestão).",
  "—", "—", "Pedro", "Decidido. ICE: —", "Registrado no escopo Não É e no roadmap Later", "product-vision.md §5 e §8; requirements.md matriz de cobertura; modules.md", "—", EXP + "GAP-005", 0),
 ("GAP-009", "PENDING_DECISION", "BAIXA", "resolvido", "Regra de distribuição de casos",
  "A wiki previa vínculo contador ↔ atendente e a ETF, carga ou grupo. **Decisão consolidada:** distribuição por carga ou por grupo; vínculo contador ↔ atendente fora da v1 — Pedro, 2026-11-13 (seguiu a sugestão).",
  "—", "—", "Pedro", "Decidido. ICE: —", "RN-NOVO-CQ-001 com algoritmo", "business-rules.md RN-NOVO-CQ-001; product-vision.md §5", "—", EXP + "GAP-009", 0),
 ("GAP-018", "PENDING_DECISION", "BAIXA", "resolvido", "Score na v1",
  "ETF e plano punham o score na v1; wiki e protótipo, no segundo horizonte. **Decisão consolidada:** score na v1 com critérios determinísticos quando faltar — Pedro, 2026-11-13.",
  "—", "—", "Pedro", "Decidido. ICE: —", "RN-NOVO-SCO-001", "business-rules.md RN-NOVO-SCO-001; requirements.md MOD-SCORE; product-vision.md §5", "—", "Origem: context-map.md#1 (contradição)", 0),
 ("GAP-019", "PENDING_DECISION", "BAIXA", "resolvido", "Tamanho do grupo de controle",
  "ETF: 3% da carteira; wiki: cerca de 500 por ciclo. **Decisão consolidada:** 3% da carteira segmentada, parametrizável — Pedro, 2026-11-13.",
  "—", "—", "Pedro", "Decidido. ICE: —", "RN-NOVO-QUA-003 com algoritmo", "business-rules.md RN-NOVO-QUA-003; product-requirements.md TEL-013", "—", "Origem: context-map.md#2 (contradição)", 0),
]

sev_ord = {"CRÍTICA": 0, "ALTA": 1, "MÉDIA": 2, "BAIXA": 3}
G.sort(key=lambda g: (sev_ord[g[2]], g[3] == "resolvido", -g[14]))
abertos = [g for g in G if g[3] != "resolvido"]

rel = """### 🔴 Problemas críticos

**[P-001] Nenhuma fonte de consentimento para ICMS, ITCD e parcelamentos → GAP-028**
A regra de consentimento exige opt-in vigente no canal (RN-NOVO-REG-002), mas a única API de opt-in
listada é a do IPVA (F-120). Com a regra como está, as réguas de ICMS, ITCD e parcelamentos não enviam nada.
→ **Pergunta:** o e-mail institucional exige opt-in? De onde vem o opt-in de SMS e WhatsApp fora do IPVA?

---

### 🟡 Inconsistências entre documentos

**[P-002] Metas dos RNF sem fonte → GAP-020**
Os valores-alvo de RNF-DES-001, RNF-DES-002, RNF-CONF-001 e RNF-CONF-002 foram propostos nesta simulação.
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
"""

out = [f"""# Gaps — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Total de gaps: {len(G)} ({len(abertos)} abertos · {len(G) - len(abertos)} resolvidos)
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

{rel}
---

## Tratamento decidido por Pedro (2026-11-13)

| GAP | Tratamento nesta simulação |
|-----|----------------------------|
| GAP-028 | **Bloqueado:** a regra de consentimento fica como está e as histórias de régua de ICMS, ITCD e parcelamentos ficam marcadas ⚠️ BLOQUEADO (RF-MOD-REGUAS-02, 04 e 05; RN-NOVO-REG-002) |
| GAP-015 | Aceito em aberto: segue sem mudar requisito |
| GAP-001, GAP-002, GAP-004, GAP-007, GAP-017, GAP-023 (os 6 altos) | Aceitos em aberto: não seguram a cadeia técnica nem o backlog; seguem registrados |

---

## GAPs
"""]
for g in G:
    (gid, tipo, sev, st, tema, desc, imp, perg, dono, sug, art, afeta, feat, fonte, _ice) = g
    out.append(f"""<!-- id: {gid.lower()} -->

### {gid} — {tema}

| Campo | Conteúdo |
|-------|----------|
| **Tipo** | {tipo} |
| **Severidade** | {sev} |
| **Status** | {st} |
| **Tema** | {tema} |
| **Descrição** | {desc} |
| **Impacto se não resolvido** | {imp} |
| **Perguntas para o negócio** | {perg} |
| **Dono sugerido** | {dono} |
| **Sugestão de tratamento** | {sug} |
| **Sugestão de artefato** | {art} |
| **Afeta** | {afeta} |
| **Features bloqueadas** | {feat} |
| **Fonte** | {fonte} |
""")
(OUT / "gaps.md").write_text("\n".join(out), encoding="utf-8")

ans = ["""# Respostas aos GAPs — Cobrança Inteligente

Preencha um bloco por GAP. Resposta válida tem **decisão concreta + decisor + data + valor ou regra**.
Resposta ainda pendente: `**Resposta:** [PENDENTE — levar para cliente]`.
"""]
for g in G:
    if g[3] == "resolvido":
        continue
    ans.append(f"""## {g[0]} — {g[4]}
**Perguntas:** {g[7]}
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** {g[11]}
""")
(OUT / "gaps-answers.md").write_text("\n".join(ans), encoding="utf-8")
print("gaps:", len(G), "abertos:", len(abertos), "| crít:", sum(1 for g in abertos if g[2] == "CRÍTICA"), "altos:", sum(1 for g in abertos if g[2] == "ALTA"))
