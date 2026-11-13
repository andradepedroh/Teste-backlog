# Respostas aos GAPs — Cobrança Inteligente

Preencha um bloco por GAP. Resposta válida tem **decisão concreta + decisor + data + valor ou regra**.
Resposta ainda pendente: `**Resposta:** [PENDENTE — levar para cliente]`.

## GAP-028 — Fonte do consentimento por canal
**Perguntas:** 1) O e-mail institucional exige opt-in, ou o cadastro do contribuinte basta (sim/não)? 2) De onde vem o opt-in de SMS e WhatsApp para ICMS e ITCD: B-Cadastro, DT-e ou um novo cadastro? 3) Enquanto não houver fonte, as réguas desses segmentos usam só e-mail (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md RN-NOVO-REG-002; requirements.md RF-MOD-REGUAS-04, RNF-SEG-002; especificacao-tecnica (integrações)

## GAP-015 — Validação jurídica dos modelos
**Perguntas:** 1) Quais dados (valor, tributo, número do débito) podem aparecer em SMS e WhatsApp? 2) Há modelo padrão aprovado pelo jurídico para reaproveitar (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md MOD-REGUAS; requirements.md RF-MOD-REGUAS-01, RF-MOD-REGUAS-05

## GAP-002 — Licença do Platform Analytics
**Perguntas:** 1) A instância da SEFAZ-MT tem Platform Analytics licenciado (sim/não)? 2) Se não, os relatórios nativos do ServiceNow são aceitos como substituto (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md MOD-MONITORAMENTO, MOD-SCORE; product-requirements.md TEL-006, TEL-012

## GAP-007 — Desempate entre segmentos
**Perguntas:** 1) Quando atende aos dois, vale a qualificada (sim/não)? 2) Se não, qual critério desempata: valor, atraso ou score?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md RN-NOVO-QUA-002; requirements.md RF-MOD-QUALIFICACAO-04

## GAP-023 — Duração do ciclo de cobrança
**Perguntas:** 1) O ciclo da carteira é mensal (sim/não)? 2) Na virada do ciclo, réguas em andamento continuam até o fim (sim/não)? 3) Casos abertos passam para o ciclo seguinte (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md MOD-QUALIFICACAO; requirements.md RF-MOD-QUALIFICACAO-05, 06; RF-MOD-MONITORAMENTO-04, 07

## GAP-017 — Fonte da lista de contumazes
**Perguntas:** 1) O Credep vira fonte do produto (sim/não)? 2) Se não, a CCF consegue enviar a marca de contumaz (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md RF-MOD-QUALIFICACAO-01; business-rules.md RN-NOVO-QUA-004

## GAP-001 — Contratos das APIs das fontes
**Perguntas:** 1) Qual a data para a TI responder sobre MPI, Big Data e UFMT? 2) Os parceiros aceitam o padrão comum de lote proposto (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md MOD-INGESTAO, MOD-SCORE; api-contracts (futuro)

## GAP-004 — Provedor de mensagens
**Perguntas:** 1) O WhatsApp Business já está contratado (sim/não)? 2) O e-mail sai pelo serviço institucional da SEFAZ (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md RF-MOD-REGUAS-05 a 07

## GAP-003 — Matriz de acesso por papel
**Perguntas:** 1) A matriz da ETF §6.4 está aprovada como está (sim/não)? 2) O Gestor de Integração pode ver o Painel do Score (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md RF-MOD-GOVERNANCA-01, 02; product-requirements.md

## GAP-008 — Atribuição com vários canais
**Perguntas:** 1) Vale o contato mais recente (sim/não)? 2) A janela de 30 dias está aprovada (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md RN-NOVO-MON-003; requirements.md RF-MOD-MONITORAMENTO-02

## GAP-022 — Atendente desativado ou ausente
**Perguntas:** 1) Ao desativar um atendente, os casos dele são redistribuídos automaticamente (sim/não)? 2) Em férias, o coordenador reatribui à mão (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md RN-NOVO-CQ-001; requirements.md RF-MOD-QUALIFICADA-02, 07

## GAP-027 — Régua para quem tem protesto
**Perguntas:** 1) Contribuinte com sinalização ativa sai da régua (sim/não)? 2) Ele pode virar caso na qualificada (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md RN-NOVO-ING-007, RN-NOVO-QUA-004

## GAP-025 — Contato-chave do contribuinte
**Perguntas:** 1) O contato-chave entra na v1 (sim/não)? 2) Se sim, quem pode editá-lo?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** product-requirements.md PR-MOD-QUALIFICADA-002; requirements.md RF-MOD-QUALIFICADA-04

## GAP-026 — Capacidade da cobrança qualificada
**Perguntas:** 1) Existe um limite de casos abertos por atendente (sim/não; quantos)? 2) Casos acima da capacidade ficam em espera ou voltam para a massificada?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md MOD-QUALIFICADA; requirements.md RF-MOD-QUALIFICADA-01, 02

## GAP-016 — Edição de régua em uso
**Perguntas:** 1) Alterar régua ativa cria nova versão (sim/não)? 2) Quem está no meio da régua termina na versão antiga (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md MOD-REGUAS; requirements.md RF-MOD-REGUAS-01

## GAP-020 — Metas dos requisitos não funcionais
**Perguntas:** 1) A consolidação pode levar até 4 horas (sim/não)? 2) O envio diário pode levar até 6 horas (sim/não)? 3) Os painéis precisam estar atualizados até 08:00 (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md RNF-DES-001, RNF-DES-002, RNF-CONF-001, RNF-CONF-002

## GAP-024 — Retenção de dados pessoais
**Perguntas:** 1) Por quanto tempo os registros rejeitados ficam guardados? 2) Comunicações e interações seguem o prazo de guarda dos processos fiscais (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md (novo RNF); business-rules.md MOD-GOVERNANCA

## GAP-010 — Janela do ciclo diário
**Perguntas:** 1) Qual o horário-limite de entrega de cada fonte? 2) A consolidação roda de madrugada (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md RF-MOD-INGESTAO-05; product-requirements.md TEL-013

## GAP-014 — Premissas do plano
**Perguntas:** 1) As premissas serão fechadas na missão presencial (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** —

## GAP-021 — Linha de base dos indicadores
**Perguntas:** 1) Aceita medir no primeiro ciclo e recalibrar as metas depois (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** product-vision.md §4

## GAP-013 — Nome do escopo da aplicação
**Perguntas:** 1) O escopo `x_cbi_` está aprovado pela TI (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** modelo de dados (futuro data-model.json)

## GAP-012 — B-Cadastro e Cadastro de Contadores
**Perguntas:** 1) O dossiê deve mostrar o contador do contribuinte (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** requirements.md MOD-INGESTAO

## GAP-011 — Escopo dos instrumentos coercitivos
**Perguntas:** 1) Confirma que o produto só exibe a sinalização (sim/não)?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** business-rules.md RN-NOVO-ING-007

## GAP-006 — Cronograma e equipe
**Perguntas:** 1) A construção será por um desenvolvedor ou por squad?
**Resposta:** [PENDENTE — levar para cliente]
**Decisor e data:**
**Novo F-xxx gerado?**
**Artefatos afetados:** —
