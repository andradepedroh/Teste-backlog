# Documento de Visão de Produto — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Versão: 1.0
Autor: Pedro (decisor) · redigido na simulação do fluxo do harness
Classificação: Interno
Fonte: discovery-document.md e context-map.md (F-xxx). Sem `benchmark.md` (spec-benchmark fora desta simulação) e sem `legacy.md` de conteúdo (projeto sem legado).

<!-- id: pv-summary -->

## 1. Sumário Executivo

A Cobrança Inteligente substitui a cobrança manual e fragmentada da SEFAZ-MT por uma plataforma
única no ServiceNow (F-008, F-165). Ela consolida todo dia os débitos de seis fontes numa visão única
do contribuinte, forma a carteira por critérios versionados, cobra a massa por réguas automáticas
e entrega aos atendentes uma fila priorizada com dossiê (F-001 a F-005). O valor do produto é medido
pelo crédito recuperado **atribuível à cobrança**, descontado o grupo de controle (F-187). A v1
cobre os 7 módulos e usa o score da UFMT com fallback, por decisão de Pedro em 2026-11-13.

---

<!-- id: pv-context -->

## 2. Contexto e Oportunidade

### 2.1 Situação Atual (AS-IS)

| Dor | Impacto (quantificado) | Fonte |
|-----|------------------------|-------|
| Débitos espalhados em CCF, MPI, IPVA, ITCD, SNE e planilhas, sem visão única | o atendente consulta vários sistemas antes de cada contato; base de ~1,8 milhão de contribuintes | F-194, F-183 |
| Status atualizado só numa foto mensal | risco de cobrar quem já regularizou | F-195 |
| Seleção da carteira empírica | não auditável nem replicável | F-189 |
| Distribuição por planilha e Google Drive | trabalho manual e carga desequilibrada | F-190 |
| Disparo com confirmação manual em lote | sem régua estruturada | F-192 |
| Grupo de controle por sorteio manual | o efeito da cobrança não é medido | F-193 |
| Indicadores por extração manual | sem visão gerencial em tempo real | F-191 |

### 2.2 Oportunidade

- Para o negócio: recuperar mais crédito com o mesmo time, priorizando quem tem mais chance de pagar (F-187, F-184).
- Para o usuário: trabalhar numa fila priorizada com o histórico completo, sem planilha (F-190, F-194).
- Para o mercado: não analisado nesta simulação (sem benchmark); referência de retorno de réguas de ~5,15% (F-185).

### 2.3 Por que agora?

**Estratégico:** depois de 11 meses de diagnóstico e redesenho, começa a etapa de implementação de
7 meses, com o ServiceNow confirmado como plataforma (F-164, F-165).

### 2.4 Value Proposition Canvas (Osterwalder) — por persona primária

**Persona: Coordenador de Cobrança (CPRF)**

| Jobs (tarefas/objetivos) | Pains (dores) | Gains (ganhos esperados) |
|--------------------------|---------------|--------------------------|
| Definir quem cobrar a cada ciclo `F-010` | Seleção empírica, não auditável `F-189` | Seleção replicável e auditável `F-061` |
| Distribuir o trabalho da equipe `F-010` | Distribuição por planilha `F-190` | Casos distribuídos sem planilha `F-093` |
| Prestar contas dos resultados `F-172` | Indicadores por extração manual `F-191` | Efeito incremental medido contra o controle `F-187` |
| Disparar a cobrança em massa `F-010` | Confirmação manual em lote `F-192` | Réguas automáticas multicanal `F-004` |

| Pain relievers → dor atendida | Gain creators → ganho atendido |
|-------------------------------|--------------------------------|
| `MOD-QUALIFICACAO` alivia a seleção empírica (critérios versionados) | `MOD-QUALIFICACAO` cria seleção auditável |
| `MOD-QUALIFICADA` alivia a planilha de distribuição | `MOD-QUALIFICADA` cria distribuição automática |
| `MOD-MONITORAMENTO` alivia a extração manual | `MOD-MONITORAMENTO` cria a medição do efeito incremental |
| `MOD-REGUAS` alivia a confirmação manual | `MOD-REGUAS` cria réguas automáticas |

**Persona: Atendente de Cobrança**

| Jobs (tarefas/objetivos) | Pains (dores) | Gains (ganhos esperados) |
|--------------------------|---------------|--------------------------|
| Contatar o contribuinte com contexto `F-011` | Consulta a vários sistemas `F-194` | Dossiê completo no caso `F-089` |
| Não abordar quem já pagou `F-011` | Status por foto mensal `F-195` | Caso encerrado ao regularizar `F-040` |
| Registrar o andamento `F-011` | Histórico disperso `F-196` | Interações registradas por caso `F-090` |

| Pain relievers → dor atendida | Gain creators → ganho atendido |
|-------------------------------|--------------------------------|
| `MOD-INGESTAO` alivia a consulta a vários sistemas (visão única) | `MOD-QUALIFICADA` cria o dossiê no caso |
| `MOD-INGESTAO` alivia a foto mensal (ciclo diário) | `MOD-INGESTAO` cria o encerramento automático |
| `MOD-QUALIFICADA` alivia o histórico disperso | `MOD-QUALIFICADA` cria o histórico por caso |

**Persona: Gestor de Integração**

| Jobs (tarefas/objetivos) | Pains (dores) | Gains (ganhos esperados) |
|--------------------------|---------------|--------------------------|
| Garantir a carga diária das fontes `F-012` | Fonte fora do ar pode travar o ciclo `F-133` | Ciclo segue com fonte em falha `F-037` |
| Corrigir rejeições `F-012` | Parceiros ainda não podem ser consumidos `F-140` | Testes com lotes simulados `F-046` |

| Pain relievers → dor atendida | Gain creators → ganho atendido |
|-------------------------------|--------------------------------|
| `MOD-INGESTAO` alivia a fonte fora do ar (degradação segura) | `MOD-INGESTAO` cria reprocesso sem novo envio |
| `MOD-INGESTAO` alivia a falta de parceiros (lotes simulados) | `MOD-SCORE` cria o acompanhamento da cobertura do score |

---

<!-- id: pv-vision -->

## 3. Declaração de Visão (Formato Moore)

```
PARA           a Coordenação de Cobrança (CPRF) e os atendentes de cobrança da SEFAZ-MT
QUE            hoje cobram ~1,8 milhão de contribuintes com débitos espalhados em vários sistemas e planilhas, sem saber quanto a cobrança recupera
O COBRANÇA INTELIGENTE É  uma plataforma de gestão e automação da cobrança administrativa no ServiceNow
QUE            consolida a carteira todo dia, cobra a massa por réguas automáticas, prioriza os casos dos atendentes e mede o efeito contra um grupo de controle
DIFERENTE DE   a operação atual com consulta manual a CCF, SNE e SUCOM, planilhas e disparos com confirmação em lote
NOSSO PRODUTO  mede o crédito recuperado atribuível à cobrança, com seleção auditável e versionada
```

---

<!-- id: pv-metrics -->

## 4. Objetivos e Métricas de Sucesso (SMART)

| Objetivo | Métrica | Baseline | Meta | Prazo | Dono |
|----------|---------|----------|------|-------|------|
| Provar o efeito da cobrança | Efeito incremental (taxa cobrada − taxa do controle) | sem baseline (QA-01) | ≥ +5 p.p. | 3 ciclos após o go-live | Coordenação de Cobrança |
| Aumentar a regularização | Taxa de regularização do ICMS Normal | ~30,9% (F-184) | 33% | 6 ciclos após o go-live | Coordenação de Cobrança |
| Eliminar a operação manual | Carteiras formadas com versão publicada | 0% — seleção empírica (F-189) | 100% | 1º ciclo após o go-live | Coordenação de Cobrança |

### 4.1 North Star Metric + árvore de métricas

```
NSM: crédito recuperado atribuível à cobrança por ciclo (líquido do grupo de controle) — F-187
 ├─ input 1: % de contribuintes da carteira notificados no ciclo → MOD-REGUAS, MOD-QUALIFICADA
 ├─ input 2: retorno das réguas (pagas em até 30 dias ÷ enviadas) → MOD-REGUAS
 ├─ input 3: casos da qualificada com interação registrada no ciclo → MOD-QUALIFICADA
 ├─ input 4: cobertura do score na carteira → MOD-SCORE
 └─ input 5: fontes consolidadas no ciclo → MOD-INGESTAO
```

### 4.2 OKR verificável

| Objective | KR | Métrica | Baseline (F-xxx / "sem baseline") | Alvo numérico | Prazo |
|-----------|----|---------|------------------------------------|---------------|-------|
| Cobrança mensurável e efetiva | KR1 | Efeito incremental | sem baseline (QA-01) | ≥ +5 p.p. | 3 ciclos após o go-live |
| Cobrança mensurável e efetiva | KR2 | Retorno das réguas | ~5,15% (F-185) | ≥ 6% | 6 ciclos após o go-live |
| Cobrança mensurável e efetiva | KR3 | Taxa de regularização do ICMS ST | ~22,5% (F-184) | ≥ 25% | 6 ciclos após o go-live |
| Operação sem planilha | KR1 | Casos distribuídos automaticamente | 0% — planilha (F-190) | 100% | 1º ciclo após o go-live |
| Operação sem planilha | KR2 | Ciclos com as seis fontes consolidadas | sem baseline (QA-02) | ≥ 95% | 3 ciclos após o go-live |

---

<!-- id: pv-scope -->

## 5. Escopo — É / Não É

| Esta versão É | Esta versão NÃO É |
|---------------|-------------------|
| Consolidação diária das seis fontes por API (MOD-INGESTAO) | Integração ponta a ponta com cada parceiro (testes com lotes simulados) |
| Critérios versionados, segmentação e grupo de controle de 3% (MOD-QUALIFICACAO) | Desenvolvimento ou recalibração do modelo de score (é da UFMT) |
| Score da UFMT com fallback determinístico (MOD-SCORE) | Inscrição em dívida ativa, protesto ou execução fiscal (PGE e produto 2.4) |
| Réguas por e-mail, SMS e WhatsApp com consentimento (MOD-REGUAS) | Cobrança Ativa por telefone com lista de ligações |
| Casos distribuídos por carga ou grupo, fila e dossiê (MOD-QUALIFICADA) | Distribuição por vínculo contador ↔ atendente |
| Painel Institucional e Painel do Score (MOD-MONITORAMENTO, MOD-SCORE) | Telas customizadas, portal ou workspace |
| Acesso por papel, mascaramento e auditoria (MOD-GOVERNANCA) | Login e SSO (responsabilidade da instância) |

| Item fora do escopo | Justificativa | Quando revisar |
|---------------------|---------------|----------------|
| Cobrança Ativa por telefone | não está na ETF; decisão de Pedro em 2026-11-13 (INF-001) | após o 1º ciclo de operação assistida |
| Distribuição por vínculo contador ↔ atendente | ETF prevê carga ou grupo; decisão de Pedro em 2026-11-13 (F-198) | junto com o uso do Cadastro de Contadores (GAP-012) |
| Integração ponta a ponta com parceiros | fora da estimativa da ETF (F-140) | quando a TI fechar os contratos (GAP-001) |
| Modelo de score | é da UFMT (F-200) | — |

---

<!-- id: pv-personas -->

## 6. Personas e Jobs to Be Done

```
PERSONA: Coordenadora Helena (fictícia)
Perfil:    Coordenadora de Cobrança da CPRF
Contexto:  define a estratégia de cada ciclo, distribui o trabalho e presta contas dos resultados

JTBD Emocional:  "Quero me sentir segura ao defender a estratégia de cobrança com números."

Dores principais:
  1. Seleção empírica da carteira — origem: F-189
  2. Distribuição por planilha — origem: F-190
  3. Sem indicador em tempo real — origem: F-191

Ganhos esperados:
  1. Carteira formada por critérios publicados e auditáveis
  2. Efeito incremental medido a cada ciclo
```

| # | Job story | Rastreio |
|---|-----------|----------|
| 1 | Quando começa um ciclo, quero formar a carteira por critérios versionados, para que a seleção seja auditável. | F-189, F-061 |
| 2 | Quando presto contas, quero ver o efeito da cobrança contra o grupo de controle, para provar o resultado. | F-187, F-193 |
| 3 | Quando a carteira é confirmada, quero que os casos sejam distribuídos sozinhos, para eliminar a planilha. | F-190 |

```
PERSONA: Atendente Rafael (fictício)
Perfil:    Atendente da cobrança qualificada
Contexto:  contata contribuintes de maior valor e registra cada andamento

JTBD Emocional:  "Quero me sentir preparado antes de cada contato."

Dores principais:
  1. Consulta a vários sistemas — origem: F-194
  2. Risco de cobrar quem já pagou — origem: F-195
  3. Histórico disperso — origem: F-196

Ganhos esperados:
  1. Dossiê completo no caso
  2. Fila já priorizada
```

| # | Job story | Rastreio |
|---|-----------|----------|
| 1 | Quando abro um caso, quero ver todo o histórico do contribuinte, para não consultar vários sistemas. | F-194 |
| 2 | Quando o contribuinte regulariza, quero que o caso saia da minha fila, para não cobrá-lo de novo. | F-195 |
| 3 | Quando termino um contato, quero registrar o resultado no caso, para o histórico não se perder. | F-196 |

```
PERSONA: Gestor de Integração Marcos (fictício)
Perfil:    responsável pela carga diária das fontes
Contexto:  confere a entrega de cada fonte e trata rejeições

JTBD Emocional:  "Quero ter certeza de que a carga do dia está completa."

Dores principais:
  1. Uma fonte fora do ar pode travar o ciclo — origem: F-133
  2. Parceiros ainda não disponíveis — origem: F-140

Ganhos esperados:
  1. Alerta de fonte em falha
  2. Reprocesso sem novo envio
```

| # | Job story | Rastreio |
|---|-----------|----------|
| 1 | Quando uma fonte não entrega, quero ser alertado e manter a última carga válida, para o ciclo seguir. | F-037, F-133 |
| 2 | Quando um registro é rejeitado, quero reprocessá-lo sem pedir novo envio, para corrigir rápido. | F-039 |

---

<!-- id: pv-constraints -->

## 7. Premissas, Dependências e Restrições

| Tipo | Descrição | Impacto se falhar | Dono |
|------|-----------|-------------------|------|
| premissa | Platform Analytics licenciado para os dois painéis (F-138) | painéis precisam de outra solução | SEFAZ-MT (gestão do contrato) |
| premissa | Ciclo diário de carga (F-133) | indicadores e réguas defasam | TI SEFAZ-MT |
| dependência | Contratos de campos das seis fontes e do score (F-140, F-177) | integração real atrasa | TI SEFAZ-MT e parceiros |
| dependência | Provedor de e-mail, SMS e WhatsApp contratado (F-141, F-179) | réguas sem canal | TI SEFAZ-MT (DevSecOps) |
| restrição | Só telas nativas do ServiceNow e dois dashboards (F-136, F-137) | — | — |
| restrição | LGPD: CPF mascarado e exportação registrada (F-115) | — | — |

---

<!-- id: pv-roadmap -->

## 8. Roadmap de Alto Nível (Now / Next / Later)

| Horizonte | Critério de corte | Iniciativas | RF / MOD referenciado | Valor Esperado | Risco / dependência |
|-----------|-------------------|-------------|-----------------------|----------------|---------------------|
| Now (0-3m) | Must da jornada crítica + pré-requisitos técnicos | carga e consolidação; critérios e confirmação da carteira; réguas com consentimento; fila e interação; efeito incremental e Painel Institucional; acesso por papel | RF-MOD-INGESTAO-01 a 05, 09, 13 · RF-MOD-QUALIFICACAO-01, 04, 06 · RF-MOD-SCORE-01, 03 · RF-MOD-REGUAS-01, 02, 04, 05 · RF-MOD-QUALIFICADA-01, 03, 05 · RF-MOD-MONITORAMENTO-01, 02, 04, 07 · RF-MOD-GOVERNANCA-01 a 03 | primeira carteira medida contra o controle | contratos das fontes (GAP-001); licença do Platform Analytics (GAP-002) |
| Next (3-6m) | Should ligados a KRs | versionamento com prévia, sorteio reproduzível, faixas de score, escalonamento, status e reenvio, distribuição, dossiê, funil e metas | RF-MOD-QUALIFICACAO-02, 03, 05 · RF-MOD-SCORE-02, 04 · RF-MOD-REGUAS-03, 06, 07, 09 · RF-MOD-QUALIFICADA-02, 04, 06 · RF-MOD-MONITORAMENTO-03, 06, 08 + KR1 e KR2 | retorno das réguas e efeito incremental | provedor de mensagens (GAP-004) |
| Later (6m+) | Could / apostas não validadas | sinalização coercitiva, pausa de régua, reatribuição, retorno das réguas por canal, consulta de auditoria; Cobrança Ativa por telefone | RF-MOD-INGESTAO-12 · RF-MOD-REGUAS-08 · RF-MOD-QUALIFICADA-07 · RF-MOD-MONITORAMENTO-05 · RF-MOD-GOVERNANCA-06 · QA-03 | refinamento da operação | decisão sobre Cobrança Ativa (GAP-005) |

---

<!-- id: pv-raci -->

## 9. Stakeholders e RACI

| Stakeholder | R | A | C | I |
|-------------|---|---|---|---|
| Coordenação de Cobrança (CPRF) | | ✅ escopo, critérios de aceite e go/no-go | ✅ | ✅ |
| Atendentes de cobrança | ✅ execução da homologação | | ✅ | ✅ |
| SQUAD Cobrança | ✅ construção e correção | | | ✅ |
| EloGroup | ✅ roteiro e condução da homologação | | ✅ | ✅ |
| TI SEFAZ-MT | ✅ integrações, acessos e ambientes | | ✅ | ✅ |
| UFMT | ✅ lotes de score | | ✅ | ✅ |

---

<!-- id: pv-gaps -->

## 10. Visão ↔ GAPs

| GAP existente | Tema em aberto | Impacto na visão | Referência |
|---------------|----------------|------------------|------------|
| GAP-001 | Contratos das APIs das fontes e do score | atrasa a carga real; v1 testada com lotes simulados | outputs/explore/gaps.md |
| GAP-002 | Licença do Platform Analytics | sem ela, a NSM não tem painel | outputs/explore/gaps.md |
| GAP-004 | Provedor de mensagens | réguas sem canal | outputs/explore/gaps.md |
| GAP-005 | Cobrança Ativa por telefone | fora da v1 por decisão de Pedro | outputs/explore/gaps.md |
| GAP-007 | Desempate entre segmentos | segmentação com regra provisória | outputs/explore/gaps.md |
| GAP-015 | Validação jurídica dos modelos sob sigilo fiscal | réguas só ativam após validação | outputs/explore/gaps.md |

---

<!-- id: pv-history -->

## 11. Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-11-13 | Pedro (decisor) | Versão inicial na simulação do fluxo do harness |

---

<!-- id: pv-open-questions -->

## Questões em aberto

| QA | Descrição | Onde aparece | Sugestão de tratamento |
|----|-----------|--------------|-------------------------|
| QA-01 | Efeito incremental sem baseline: o grupo de controle hoje é sorteado à mão e não há série histórica | §4 e §4.2 KR1 | Medir no primeiro ciclo e recalibrar a meta |
| QA-02 | Percentual de ciclos com as seis fontes consolidadas sem baseline | §4.2 | Medir na operação assistida |
| QA-03 | Cobrança Ativa por telefone fica no Later sem decisão de entrada | §8 | Reavaliar após o 1º ciclo |
