# Mapa de Fluxos e Telas — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Fonte: discovery-document.md, product-requirements.md, business-rules.md (sem legado: todos os fluxos são TO-BE)

## Fluxos

| ID | Nome | Tipo | Ator principal | Origem (AS-IS) | Objetivo |
|----|------|------|----------------|----------------|----------|
| FLX-001 | Carga diária e consolidação | TO-BE | Gestor de Integração | — | Manter a visão única do contribuinte atualizada a cada ciclo |
| FLX-002 | Qualificação da carteira do ciclo | TO-BE | Coordenador de Cobrança | — | Formar a carteira do ciclo com critérios publicados |
| FLX-003 | Recebimento e uso do score | TO-BE | Gestor de Integração | — | Receber o score da UFMT e acompanhar a cobertura |
| FLX-004 | Cobrança massificada por régua | TO-BE | Coordenador de Cobrança | — | Comunicar a carteira massificada sem confirmação manual |
| FLX-005 | Cobrança qualificada | TO-BE | Atendente de Cobrança | — | Conduzir os casos priorizados até o desfecho |
| FLX-006 | Monitoramento do ciclo | TO-BE | Coordenador de Cobrança | — | Medir a recuperação e o efeito incremental |
| FLX-007 | Governança e auditoria | TO-BE | Administrador da aplicação | — | Manter parâmetros e auditar a operação |

## Etapas

| ID | Fluxo | Ordem | Nome | Ator | Tela | Entrada | Saída |
|----|-------|-------|------|------|------|---------|-------|
| ETP-001 | FLX-001 | 1 | Receber lotes das fontes | Sistema parceiro | — | Lote de débitos da fonte | Registros aceitos e rejeitados |
| ETP-002 | FLX-001 | 2 | Validar e consolidar | Sistema | — | Registros aceitos | Posição por contribuinte e tributo |
| ETP-003 | FLX-001 | 3 | Fechar ciclo e acompanhar fontes | Gestor de Integração | TEL-001 | Situação das fontes | Fontes conferidas |
| ETP-004 | FLX-001 | 4 | Reprocessar rejeitados | Gestor de Integração | TEL-001 | Registros rejeitados | Registros reprocessados |
| ETP-005 | FLX-001 | 5 | Consultar carteira consolidada | Coordenador de Cobrança | TEL-002 | Posições consolidadas | Posições analisadas |
| ETP-006 | FLX-001 | 6 | Consultar visão única | Coordenador de Cobrança | TEL-003 | Contribuinte | Contribuinte analisado |
| ETP-007 | FLX-002 | 1 | Parametrizar rascunho | Coordenador de Cobrança | TEL-004 | Última versão publicada | Rascunho de critérios |
| ETP-008 | FLX-002 | 2 | Gerar prévia | Coordenador de Cobrança | TEL-005 | Rascunho de critérios | Carteira simulada |
| ETP-009 | FLX-002 | 3 | Publicar versão | Coordenador de Cobrança | TEL-004 | Rascunho com prévia vigente | Versão publicada |
| ETP-010 | FLX-002 | 4 | Confirmar carteira | Coordenador de Cobrança | TEL-005 | Carteira da versão publicada | Carteira confirmada |
| ETP-011 | FLX-003 | 1 | Receber lote de score | UFMT (sistema) | — | Lote de score | Scores vigentes por contribuinte |
| ETP-012 | FLX-003 | 2 | Acompanhar Painel do Score | Gestor de Integração | TEL-006 | Scores vigentes | Cobertura acompanhada |
| ETP-013 | FLX-004 | 1 | Montar régua | Coordenador de Cobrança | TEL-007 | Segmento | Régua ativa |
| ETP-014 | FLX-004 | 2 | Processar etapas devidas | Sistema | — | Carteira massificada e régua ativa | Comunicações enviadas |
| ETP-015 | FLX-004 | 3 | Acompanhar execução | Coordenador de Cobrança | TEL-008 | Comunicações | Envio conferido |
| ETP-016 | FLX-004 | 4 | Encaminhar à qualificada | Sistema | — | Contribuinte com régua esgotada | Contribuinte encaminhado |
| ETP-017 | FLX-005 | 1 | Criar e distribuir casos | Sistema | — | Carteira qualificada ou encaminhamento | Casos atribuídos |
| ETP-018 | FLX-005 | 2 | Trabalhar a fila | Atendente de Cobrança | TEL-009 | Casos atribuídos | Caso escolhido |
| ETP-019 | FLX-005 | 3 | Conduzir caso e registrar interação | Atendente de Cobrança | TEL-010 | Caso escolhido | Interação registrada |
| ETP-020 | FLX-005 | 4 | Encerrar caso por regularização | Sistema | — | Regularização na carga | Caso encerrado |
| ETP-021 | FLX-006 | 1 | Atribuir origem da regularização | Sistema | — | Regularização registrada | Regularização com origem |
| ETP-022 | FLX-006 | 2 | Acompanhar Painel Institucional | Coordenador de Cobrança | TEL-012 | Indicadores do ciclo | Decisão para o próximo ciclo |
| ETP-023 | FLX-006 | 3 | Conferir regularizações | Coordenador de Cobrança | TEL-011 | Regularizações com origem | Regularizações conferidas |
| ETP-024 | FLX-007 | 1 | Administrar parâmetros, faixas e metas | Administrador da aplicação | TEL-013 | Parâmetros vigentes | Parâmetros atualizados |
| ETP-025 | FLX-007 | 2 | Auditar a operação | Auditor | TEL-014 | Eventos de auditoria | Auditoria concluída |

## Telas

| ID | Nome | Rota | Módulo | Estados UI | RF/PR | Screenshot |
|----|------|------|--------|------------|-------|------------|
| TEL-001 | Integrações & Sincronização | /x_cbi_fonte_list.do | MOD-INGESTAO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-INGESTAO-01, RF-MOD-INGESTAO-02, RF-MOD-INGESTAO-04, RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06, RF-MOD-INGESTAO-07, RF-MOD-INGESTAO-08, RF-MOD-INGESTAO-11, RF-MOD-INGESTAO-15, PR-MOD-INGESTAO-001 | — |
| TEL-002 | Carteira Consolidada | /x_cbi_posicao_tributo_list.do | MOD-INGESTAO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-INGESTAO-14, RF-MOD-INGESTAO-03, PR-MOD-INGESTAO-002 | — |
| TEL-003 | Visão Única do Contribuinte | /x_cbi_contribuinte.do | MOD-INGESTAO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-INGESTAO-13, RF-MOD-INGESTAO-09, RF-MOD-INGESTAO-10, RF-MOD-INGESTAO-12, RF-MOD-GOVERNANCA-03, PR-MOD-INGESTAO-003 | — |
| TEL-004 | Critérios de Qualificação | /x_cbi_criterio_versao.do | MOD-QUALIFICACAO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-02, PR-MOD-QUALIFICACAO-001 | — |
| TEL-005 | Prévia da Carteira Segmentada | /x_cbi_carteira_item_list.do | MOD-QUALIFICACAO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-QUALIFICACAO-03, RF-MOD-QUALIFICACAO-04, RF-MOD-QUALIFICACAO-05, RF-MOD-QUALIFICACAO-06, RF-MOD-SCORE-03, PR-MOD-QUALIFICACAO-002 | — |
| TEL-006 | Painel do Score de Liquidez | /$pa_dashboard.do?name=painel-score-liquidez | MOD-SCORE | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-SCORE-04, RF-MOD-SCORE-01, RF-MOD-SCORE-02, PR-MOD-SCORE-001 | — |
| TEL-007 | Editor de Régua | /x_cbi_regua.do | MOD-REGUAS | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-REGUAS-01, RF-MOD-REGUAS-08, PR-MOD-REGUAS-001 | — |
| TEL-008 | Execução & Status de Disparo | /x_cbi_comunicacao_list.do | MOD-REGUAS | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-REGUAS-09, RF-MOD-REGUAS-02, RF-MOD-REGUAS-04, RF-MOD-REGUAS-05, RF-MOD-REGUAS-06, RF-MOD-REGUAS-07, RF-MOD-REGUAS-03, PR-MOD-REGUAS-002 | — |
| TEL-009 | Minha Fila | /x_cbi_caso_list.do?sysparm_query=assigned_to=javascript:gs.getUserID() | MOD-QUALIFICADA | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-QUALIFICADA-03, RF-MOD-QUALIFICADA-01, RF-MOD-QUALIFICADA-02, RF-MOD-GOVERNANCA-02, PR-MOD-QUALIFICADA-001 | — |
| TEL-010 | Dossiê & Caso | /x_cbi_caso.do | MOD-QUALIFICADA | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-QUALIFICADA-04, RF-MOD-QUALIFICADA-05, RF-MOD-QUALIFICADA-06, RF-MOD-QUALIFICADA-07, PR-MOD-QUALIFICADA-002 | — |
| TEL-011 | Regularizações & Origem | /x_cbi_regularizacao_list.do | MOD-MONITORAMENTO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-MONITORAMENTO-08, RF-MOD-MONITORAMENTO-01, RF-MOD-MONITORAMENTO-02, PR-MOD-MONITORAMENTO-001 | — |
| TEL-012 | Painel Institucional de Cobrança | /$pa_dashboard.do?name=painel-institucional-cobranca | MOD-MONITORAMENTO | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-MONITORAMENTO-07, RF-MOD-MONITORAMENTO-03, RF-MOD-MONITORAMENTO-04, RF-MOD-MONITORAMENTO-05, RF-MOD-MONITORAMENTO-06, PR-MOD-MONITORAMENTO-002 | — |
| TEL-013 | Parâmetros, faixas de score e metas | /x_cbi_parametro_list.do | MOD-GOVERNANCA | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-GOVERNANCA-05, RF-MOD-GOVERNANCA-04, RF-MOD-SCORE-02, PR-MOD-GOVERNANCA-001 | — |
| TEL-014 | Auditoria | /x_cbi_auditoria_evento_list.do | MOD-GOVERNANCA | Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline | RF-MOD-GOVERNANCA-06, RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-03, RF-MOD-GOVERNANCA-04, PR-MOD-GOVERNANCA-002 | — |

## Transições

| ID | De | Para | Gatilho | Regras | Estado da entidade |
|----|----|------|---------|--------|--------------------|
| TRS-001 | ETP-001 | ETP-002 | Fonte fecha o lote | RN-NOVO-ING-004, RN-NOVO-ING-005 | Lote.ok |
| TRS-002 | ETP-002 | ETP-003 | Horário-limite das fontes vence | RN-NOVO-ING-006 | Fonte.falha |
| TRS-003 | ETP-003 | ETP-004 | Gestor abre a lista de rejeitados | RN-NOVO-ING-004 | — |
| TRS-004 | ETP-003 | ETP-005 | Ciclo consolidado | RN-NOVO-ING-001 | PosicaoTributo.atualizada |
| TRS-005 | ETP-005 | ETP-006 | Coordenador abre um contribuinte | RN-NOVO-GOV-001 | — |
| TRS-006 | ETP-006 | — | Coordenador fecha o contribuinte | — | — |
| TRS-007 | ETP-004 | — | Reprocesso concluído | RN-NOVO-ING-005 | RegistroRejeitado.reprocessado |
| TRS-008 | ETP-007 | ETP-008 | Coordenador pede a prévia | RN-NOVO-QUA-004 | CriterioVersao.rascunho |
| TRS-009 | ETP-008 | ETP-009 | Coordenador publica com fundamentação | RN-NOVO-QUA-006 | CriterioVersao.publicada |
| TRS-010 | ETP-009 | ETP-010 | Coordenador confirma a carteira | RN-NOVO-QUA-005, RN-NOVO-QUA-003 | Carteira.confirmada |
| TRS-011 | ETP-010 | — | Carteira confirmada libera réguas e casos | RN-NOVO-QUA-002 | Carteira.confirmada |
| TRS-012 | ETP-011 | ETP-012 | UFMT fecha o lote de score | RN-NOVO-SCO-001 | Score.vigente |
| TRS-013 | ETP-012 | — | Gestor encerra a consulta | — | — |
| TRS-014 | ETP-013 | ETP-014 | Régua ativada | RN-NOVO-REG-004 | Regua.ativa |
| TRS-015 | ETP-014 | ETP-015 | Processamento diário concluído | RN-NOVO-REG-002, RN-NOVO-REG-003 | Comunicacao.enviada |
| TRS-016 | ETP-015 | ETP-016 | Contribuinte esgota a régua sem regularizar | RN-NOVO-REG-002 | CarteiraItem.encaminhado |
| TRS-017 | ETP-016 | ETP-017 | Encaminhamento à cobrança qualificada | RN-NOVO-QUA-002 | Caso.novo |
| TRS-018 | ETP-017 | ETP-018 | Caso atribuído ao atendente | RN-NOVO-CQ-001 | Caso.atribuido |
| TRS-019 | ETP-018 | ETP-019 | Atendente abre o caso | RN-NOVO-CQ-003, RN-NOVO-MON-002 | — |
| TRS-020 | ETP-019 | ETP-020 | Carga mostra o débito regularizado | RN-NOVO-ING-002 | Caso.encerrado |
| TRS-021 | ETP-020 | ETP-021 | Regularização registrada | RN-NOVO-MON-001 | Regularizacao.registrada |
| TRS-022 | ETP-021 | ETP-022 | Coleta diária dos indicadores | RN-NOVO-MON-003, RN-NOVO-MON-004 | — |
| TRS-023 | ETP-022 | ETP-023 | Coordenador detalha as regularizações | RN-NOVO-MON-002 | — |
| TRS-024 | ETP-023 | — | Conferência concluída | — | — |
| TRS-025 | ETP-024 | ETP-025 | Alteração de parâmetro gera evento de auditoria | RN-NOVO-GOV-003 | AuditoriaEvento.gravado |
| TRS-026 | ETP-025 | — | Auditoria concluída | — | — |
| TRS-027 | ETP-015 | — | Régua pausada pelo coordenador | RN-NOVO-REG-005 | Regua.pausada |

## Amarração Técnica

*(Coluna Entidades preenchida pela spec-data-model a partir do `data-model.json`; Endpoints pela spec-api-contracts.)*

| Tela | Entidades | Endpoints |
|------|-----------|-----------|
| TEL-001 | Fonte, LoteCarga, RegistroRejeitado | — |
| TEL-002 | PosicaoTributo, Contribuinte | — |
| TEL-003 | Contribuinte, Debito, Parcelamento, Comunicacao, Sinalizacao | — |
| TEL-004 | CriterioVersao | — |
| TEL-005 | Carteira, CarteiraItem | — |
| TEL-006 | Score, ScoreFaixa, LoteCarga | — |
| TEL-007 | Regua, ReguaEtapa, ModeloMensagem | — |
| TEL-008 | Comunicacao, Regua, Consentimento | — |
| TEL-009 | Caso | — |
| TEL-010 | Caso, Interacao, Followup, Debito, Parcelamento, Sinalizacao, VinculoEconomico | — |
| TEL-011 | Regularizacao | — |
| TEL-012 | CarteiraItem, Regularizacao, Comunicacao, Meta | — |
| TEL-013 | Parametro, ScoreFaixa, Meta | — |
| TEL-014 | EventoAuditoria, CriterioVersao | — |

## Cobertura

```
AVISO: estado sem tela associada (matriz estado×tela): Caso.novo
AVISO: estado sem tela associada (matriz estado×tela): Lote.ok
AVISO: estado sem tela associada (matriz estado×tela): Regularizacao.registrada
MÉTRICAS:
  fluxos=7 etapas=25 telas=14 transições=27
  % etapas com tela: 68.0%
  % transições com regra RN: 85.2%
  telas órfãs: nenhuma
  fluxos sem etapas: nenhum
  matriz estado×tela:
    AuditoriaEvento.gravado → TEL-013, TEL-014
    Carteira.confirmada → TEL-004, TEL-005
    CarteiraItem.encaminhado → TEL-008
    Caso.atribuido → TEL-009
    Caso.encerrado → TEL-010
    Caso.novo → SEM TELA — verificar
    Comunicacao.enviada → TEL-008
    CriterioVersao.publicada → TEL-004, TEL-005
    CriterioVersao.rascunho → TEL-004, TEL-005
    Fonte.falha → TEL-001
    Lote.ok → SEM TELA — verificar
    PosicaoTributo.atualizada → TEL-001, TEL-002
    RegistroRejeitado.reprocessado → TEL-001
    Regua.ativa → TEL-007
    Regua.pausada → TEL-008
    Regularizacao.registrada → SEM TELA — verificar
    Score.vigente → TEL-006
  % telas com amarração técnica: 100.0%
  entidades do data-model sem tela: Usuario
RESULTADO: OK (0 erro(s), 3 aviso(s))
```

**Avisos tratados (3):** os estados abaixo nascem em etapas automáticas, sem tela própria, e
aparecem em telas de outras etapas do mesmo fluxo:

- `Lote.ok` (TRS-001): o resultado do lote aparece na TEL-001 Integrações & Sincronização (ETP-003).
- `Caso.novo` (TRS-017): o caso novo aparece na TEL-009 Minha Fila assim que é atribuído (ETP-018).
- `Regularizacao.registrada` (TRS-021): a regularização aparece na TEL-011 Regularizações & Origem (ETP-023).

**Etapas sem tela (8 de 25):** todas são processamento automático (carga, consolidação, score,
motor de réguas, encaminhamento, criação de casos, encerramento e atribuição de origem).
**Transições sem regra (4 de 27):** são encerramentos de consulta, sem condição de negócio.
