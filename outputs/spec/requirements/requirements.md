# Requisitos Funcionais e Não Funcionais (negócio) — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Versão: 1.0
Escopo: comportamento observável (RF) e qualidades exigíveis pelo negócio (RNF de negócio).
Fonte: context-map.md (F-xxx), discovery-document.md §4, product-vision.md, business-rules.md, ETF e plano de implementação v3 em `inputs/`.

> **Nota de escopo:** RNF técnicos profundos ficam para a fase técnica. Aqui ficam os RNF que o
> **negócio** decide. Cada RF promove um RF preliminar do Explore (`RF-nnn`, citado nas Notas); o
> fato de origem (F-xxx) ancora o RF do Explore em `especificacao-funcional.md §3`.
> Decisões de escopo de Pedro em 2026-11-13: score na v1 com fallback; grupo de controle de 3%;
> distribuição por carga ou grupo; Cobrança Ativa por telefone fora da v1.

<!-- spec-check-modular: on -->

<!-- id: reqfun-modules -->

## Índice de módulos e cobertura

| Módulo | Objetivo de negócio | Nº RF planejado | Nº RF escritos | Lacunas (QA) |
|--------|---------------------|-----------------|----------------|---------------|
| MOD-INGESTAO | Manter, a cada ciclo diário, a visão única de cada contribuinte com todos os débitos das seis fontes | 15 | 15 | QA-02 |
| MOD-QUALIFICACAO | Formar a carteira de cada ciclo por critérios versionados e auditáveis, com grupo de controle sorteado | 6 | 6 | QA-01, QA-04 |
| MOD-SCORE | Usar o score da UFMT para priorizar quem cobrar, sem depender dele para operar | 4 | 4 | — |
| MOD-REGUAS | Comunicar a carteira massificada por e-mail, SMS e WhatsApp sem confirmação manual | 9 | 9 | — |
| MOD-QUALIFICADA | Dar a cada atendente uma fila priorizada de casos com o dossiê completo do contribuinte | 7 | 7 | — |
| MOD-MONITORAMENTO | Medir a recuperação e o efeito incremental da cobrança contra o grupo de controle | 8 | 8 | QA-03 |
| MOD-GOVERNANCA | Garantir que cada papel veja só o que lhe cabe e que toda ação relevante fique auditável | 6 | 6 | — |

<!-- id: reqfun-coverage-input -->

## Matriz de cobertura (insumos → RF)

| Referência insumo (doc § / ID / tela) | Descrição curta | RF cobrindo | ou QA |
|---------------------------------------|-----------------|-------------|--------|
| especificacao-funcional.md §3 RF-001 | Receber débitos das fontes | RF-MOD-INGESTAO-01 | — |
| especificacao-funcional.md §3 RF-002 | Validar o documento do contribuinte | RF-MOD-INGESTAO-02 | — |
| especificacao-funcional.md §3 RF-003 | Consolidar débitos por contribuinte | RF-MOD-INGESTAO-03 | — |
| especificacao-funcional.md §3 RF-004 | Evitar duplicidade no reenvio | RF-MOD-INGESTAO-04 | — |
| especificacao-funcional.md §3 RF-005 | Fechar o ciclo diário e acompanhar as fontes | RF-MOD-INGESTAO-05 | — |
| especificacao-funcional.md §3 RF-006 | Seguir operando com fonte em falha | RF-MOD-INGESTAO-06 | — |
| especificacao-funcional.md §3 RF-007 | Carga inicial e reconciliação | RF-MOD-INGESTAO-07 | — |
| especificacao-funcional.md §3 RF-008 | Reprocessar registros rejeitados | RF-MOD-INGESTAO-08 | — |
| especificacao-funcional.md §3 RF-009 | Atualizar a regularização durante o ciclo | RF-MOD-INGESTAO-09 | — |
| especificacao-funcional.md §3 RF-010 | Alertar parcelamento em risco | RF-MOD-INGESTAO-10 | — |
| especificacao-funcional.md §3 RF-011 | Transição MPI → Big Data | RF-MOD-INGESTAO-11 | — |
| especificacao-funcional.md §3 RF-012 | Receber sinalização coercitiva | RF-MOD-INGESTAO-12 | — |
| especificacao-funcional.md §3 RF-013 | Visão única do contribuinte | RF-MOD-INGESTAO-13 | — |
| especificacao-funcional.md §3 RF-014 | Carteira consolidada | RF-MOD-INGESTAO-14 | — |
| especificacao-funcional.md §3 RF-015 | Simular cargas das fontes | RF-MOD-INGESTAO-15 | — |
| especificacao-funcional.md §3 RF-016 | Parametrizar critérios da carteira | RF-MOD-QUALIFICACAO-01 | — |
| especificacao-funcional.md §3 RF-017 | Versionar critérios | RF-MOD-QUALIFICACAO-02 | — |
| especificacao-funcional.md §3 RF-018 | Simular a carteira | RF-MOD-QUALIFICACAO-03 | — |
| especificacao-funcional.md §3 RF-019 | Segmentar massificada × qualificada | RF-MOD-QUALIFICACAO-04 | — |
| especificacao-funcional.md §3 RF-020 | Sortear o grupo de controle | RF-MOD-QUALIFICACAO-05 | — |
| especificacao-funcional.md §3 RF-021 | Confirmar a carteira | RF-MOD-QUALIFICACAO-06 | — |
| especificacao-funcional.md §3 RF-022 | Receber o score da UFMT | RF-MOD-SCORE-01 | — |
| especificacao-funcional.md §3 RF-023 | Classificar o score em faixas | RF-MOD-SCORE-02 | — |
| especificacao-funcional.md §3 RF-024 | Operar sem score | RF-MOD-SCORE-03 | — |
| especificacao-funcional.md §3 RF-025 | Painel do Score | RF-MOD-SCORE-04 | — |
| especificacao-funcional.md §3 RF-026 | Montar a régua | RF-MOD-REGUAS-01 | — |
| especificacao-funcional.md §3 RF-027 | Enviar a etapa devida | RF-MOD-REGUAS-02 | — |
| especificacao-funcional.md §3 RF-028 | Escalonar e encaminhar | RF-MOD-REGUAS-03 | — |
| especificacao-funcional.md §3 RF-029 | Respeitar o consentimento | RF-MOD-REGUAS-04 | — |
| especificacao-funcional.md §3 RF-030 | Enviar por canal | RF-MOD-REGUAS-05 | — |
| especificacao-funcional.md §3 RF-031 | Receber o status de entrega | RF-MOD-REGUAS-06 | — |
| especificacao-funcional.md §3 RF-032 | Reenviar falhas | RF-MOD-REGUAS-07 | — |
| especificacao-funcional.md §3 RF-033 | Pausar e retomar a régua | RF-MOD-REGUAS-08 | — |
| especificacao-funcional.md §3 RF-034 | Acompanhar a execução | RF-MOD-REGUAS-09 | — |
| especificacao-funcional.md §3 RF-035 | Criar casos | RF-MOD-QUALIFICADA-01 | — |
| especificacao-funcional.md §3 RF-036 | Distribuir casos | RF-MOD-QUALIFICADA-02 | — |
| especificacao-funcional.md §3 RF-037 | Fila priorizada | RF-MOD-QUALIFICADA-03 | — |
| especificacao-funcional.md §3 RF-038 | Dossiê do caso | RF-MOD-QUALIFICADA-04 | — |
| especificacao-funcional.md §3 RF-039 | Registrar interação | RF-MOD-QUALIFICADA-05 | — |
| especificacao-funcional.md §3 RF-040 | Follow-up com lembrete | RF-MOD-QUALIFICADA-06 | — |
| especificacao-funcional.md §3 RF-041 | Reatribuir casos | RF-MOD-QUALIFICADA-07 | — |
| especificacao-funcional.md §3 RF-042 | Marcar notificado e regularizado | RF-MOD-MONITORAMENTO-01 | — |
| especificacao-funcional.md §3 RF-043 | Atribuir a origem da regularização | RF-MOD-MONITORAMENTO-02 | — |
| especificacao-funcional.md §3 RF-044 | Indicadores de funil | RF-MOD-MONITORAMENTO-03 | — |
| especificacao-funcional.md §3 RF-045 | Efeito incremental | RF-MOD-MONITORAMENTO-04 | — |
| especificacao-funcional.md §3 RF-046 | Retorno das réguas | RF-MOD-MONITORAMENTO-05 | — |
| especificacao-funcional.md §3 RF-047 | Realizado × meta | RF-MOD-MONITORAMENTO-06 | — |
| especificacao-funcional.md §3 RF-048 | Painel Institucional | RF-MOD-MONITORAMENTO-07 | — |
| especificacao-funcional.md §3 RF-049 | Regularizações por origem | RF-MOD-MONITORAMENTO-08 | — |
| especificacao-funcional.md §3 RF-050 | Controlar acesso por papel | RF-MOD-GOVERNANCA-01 | — |
| especificacao-funcional.md §3 RF-051 | Isolar a visão do atendente | RF-MOD-GOVERNANCA-02 | — |
| especificacao-funcional.md §3 RF-052 | Mascarar CPF e restringir exportação | RF-MOD-GOVERNANCA-03 | — |
| especificacao-funcional.md §3 RF-053 | Auditar ações e parâmetros | RF-MOD-GOVERNANCA-04 | — |
| especificacao-funcional.md §3 RF-054 | Administrar parâmetros, faixas e metas | RF-MOD-GOVERNANCA-05 | — |
| especificacao-funcional.md §3 RF-055 | Consultar auditoria | RF-MOD-GOVERNANCA-06 | — |
| ETF §6.6 · tela «Integrações & Sincronização» | tela do protótipo | RF-MOD-INGESTAO-01, RF-MOD-INGESTAO-02, RF-MOD-INGESTAO-04, RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06, RF-MOD-INGESTAO-07, RF-MOD-INGESTAO-08, RF-MOD-INGESTAO-11, RF-MOD-INGESTAO-15 | — |
| ETF §6.6 · tela «Carteira Consolidada» | tela do protótipo | RF-MOD-INGESTAO-14, RF-MOD-INGESTAO-03 | — |
| ETF §6.6 · tela «Visão Única do Contribuinte» | tela do protótipo | RF-MOD-INGESTAO-13, RF-MOD-INGESTAO-09, RF-MOD-INGESTAO-10, RF-MOD-INGESTAO-12, RF-MOD-GOVERNANCA-03 | — |
| ETF §6.6 · tela «Critérios de Qualificação» | tela do protótipo | RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-02 | — |
| ETF §6.6 · tela «Prévia da Carteira Segmentada» | tela do protótipo | RF-MOD-QUALIFICACAO-03, RF-MOD-QUALIFICACAO-04, RF-MOD-QUALIFICACAO-05, RF-MOD-QUALIFICACAO-06, RF-MOD-SCORE-03 | — |
| ETF §6.6 · tela «Painel do Score de Liquidez» | tela do protótipo | RF-MOD-SCORE-04, RF-MOD-SCORE-01, RF-MOD-SCORE-02 | — |
| ETF §6.6 · tela «Editor de Régua» | tela do protótipo | RF-MOD-REGUAS-01, RF-MOD-REGUAS-08 | — |
| ETF §6.6 · tela «Execução & Status de Disparo» | tela do protótipo | RF-MOD-REGUAS-09, RF-MOD-REGUAS-02, RF-MOD-REGUAS-04, RF-MOD-REGUAS-05, RF-MOD-REGUAS-06, RF-MOD-REGUAS-07, RF-MOD-REGUAS-03 | — |
| ETF §6.6 · tela «Minha Fila» | tela do protótipo | RF-MOD-QUALIFICADA-03, RF-MOD-QUALIFICADA-01, RF-MOD-QUALIFICADA-02, RF-MOD-GOVERNANCA-02 | — |
| ETF §6.6 · tela «Dossiê & Caso» | tela do protótipo | RF-MOD-QUALIFICADA-04, RF-MOD-QUALIFICADA-05, RF-MOD-QUALIFICADA-06, RF-MOD-QUALIFICADA-07 | — |
| ETF §6.6 · tela «Regularizações & Origem» | tela do protótipo | RF-MOD-MONITORAMENTO-08, RF-MOD-MONITORAMENTO-01, RF-MOD-MONITORAMENTO-02 | — |
| ETF §6.6 · tela «Painel Institucional de Cobrança» | tela do protótipo | RF-MOD-MONITORAMENTO-07, RF-MOD-MONITORAMENTO-03, RF-MOD-MONITORAMENTO-04, RF-MOD-MONITORAMENTO-05, RF-MOD-MONITORAMENTO-06 | — |
| ETF §6.6 · tela «Parâmetros, faixas de score e metas» | tela do protótipo | RF-MOD-GOVERNANCA-05, RF-MOD-GOVERNANCA-04, RF-MOD-SCORE-02 | — |
| ETF §6.6 · tela «Auditoria» | tela do protótipo | RF-MOD-GOVERNANCA-06, RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-03, RF-MOD-GOVERNANCA-04 | — |
| protótipo v3 · «Cobrança Ativa — Lista de Ligações» | cobrança por telefone (INF-001) | — | fora da v1 (decisão de Pedro, 2026-11-13) |
| ETF §2.1 · contumazes | exclusão de contumazes na carteira | RF-MOD-QUALIFICACAO-01 | QA-04 |

<!-- id: reqfun-tobe -->

## Visão TO-BE de negócio (delta vs. AS-IS)

| Domínio | Estado AS-IS (legacy.md § ou fonte) | Estado TO-BE (capacidade de negócio) | Delta principal | RFs envolvidos |
|---------|-------------------------------------|--------------------------------------|-----------------|----------------|
| Ingestão e Carteira Consolidada | processo manual: consulta a CCF, SNE e SUCOM e foto mensal (F-194, F-195) | visão única diária por contribuinte e tributo | de mensal e manual para diário e automático | RF-MOD-INGESTAO-01 a 15 |
| Qualificação da Carteira | seleção empírica, sorteio manual do controle (F-189, F-193) | critérios versionados com prévia e sorteio reproduzível | seleção auditável e replicável | RF-MOD-QUALIFICACAO-01 a 06 |
| Scoring de Liquidez | não existe | score da UFMT usado com fallback | priorização com base analítica | RF-MOD-SCORE-01 a 04 |
| Réguas de Cobrança | disparo com confirmação manual em lote (F-192) | réguas automáticas multicanal com consentimento | fim da confirmação manual | RF-MOD-REGUAS-01 a 09 |
| Cobrança Qualificada | distribuição por planilha, histórico disperso (F-190, F-196) | casos distribuídos, fila priorizada, dossiê e interações | fim da planilha e histórico por caso | RF-MOD-QUALIFICADA-01 a 07 |
| Monitoramento | indicadores por extração manual (F-191) | painéis diários com efeito incremental | medição causal | RF-MOD-MONITORAMENTO-01 a 08 |
| Governança | sem controle formal | acesso por papel, mascaramento e auditoria | conformidade com LGPD e auditoria | RF-MOD-GOVERNANCA-01 a 06 |

<!-- id: reqfun-traceability -->

## Rastreabilidade global (RF / RNF)

| ID | Tipo | Módulo | Domínio / categoria | Legacy / benchmark / vision | Fato fonte (F-xxx) |
|----|------|--------|---------------------|----------------------------|---------------------|
| RF-MOD-INGESTAO-01 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-032, F-001, F-018 |
| RF-MOD-INGESTAO-02 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-033 |
| RF-MOD-INGESTAO-03 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-034 |
| RF-MOD-INGESTAO-04 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-035 |
| RF-MOD-INGESTAO-05 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-036 |
| RF-MOD-INGESTAO-06 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-037 |
| RF-MOD-INGESTAO-07 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-038 |
| RF-MOD-INGESTAO-08 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-039 |
| RF-MOD-INGESTAO-09 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-040, F-020 |
| RF-MOD-INGESTAO-10 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-041 |
| RF-MOD-INGESTAO-11 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-042 |
| RF-MOD-INGESTAO-12 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-043 |
| RF-MOD-INGESTAO-13 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-044 |
| RF-MOD-INGESTAO-14 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-045, F-019 |
| RF-MOD-INGESTAO-15 | RF | MOD-INGESTAO | Ingestão e Carteira Consolidada | product-vision.md §5 | F-046 |
| RF-MOD-QUALIFICACAO-01 | RF | MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | product-vision.md §5 | F-055, F-002, F-021 |
| RF-MOD-QUALIFICACAO-02 | RF | MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | product-vision.md §5 | F-056 |
| RF-MOD-QUALIFICACAO-03 | RF | MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | product-vision.md §5 | F-057, F-022 |
| RF-MOD-QUALIFICACAO-04 | RF | MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | product-vision.md §5 | F-058 |
| RF-MOD-QUALIFICACAO-05 | RF | MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | product-vision.md §5 | F-059 |
| RF-MOD-QUALIFICACAO-06 | RF | MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | product-vision.md §5 | F-060 |
| RF-MOD-SCORE-01 | RF | MOD-SCORE | Scoring de Liquidez | product-vision.md §5 | F-067, F-003, F-029 |
| RF-MOD-SCORE-02 | RF | MOD-SCORE | Scoring de Liquidez | product-vision.md §5 | F-068, F-030 |
| RF-MOD-SCORE-03 | RF | MOD-SCORE | Scoring de Liquidez | product-vision.md §5 | F-069 |
| RF-MOD-SCORE-04 | RF | MOD-SCORE | Scoring de Liquidez | product-vision.md §5 | F-070 |
| RF-MOD-REGUAS-01 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-072, F-004, F-023 |
| RF-MOD-REGUAS-02 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-073, F-024 |
| RF-MOD-REGUAS-03 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-074 |
| RF-MOD-REGUAS-04 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-075 |
| RF-MOD-REGUAS-05 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-076 |
| RF-MOD-REGUAS-06 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-077 |
| RF-MOD-REGUAS-07 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-078 |
| RF-MOD-REGUAS-08 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-079 |
| RF-MOD-REGUAS-09 | RF | MOD-REGUAS | Réguas de Cobrança Massificada | product-vision.md §5 | F-080 |
| RF-MOD-QUALIFICADA-01 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-086, F-005, F-025 |
| RF-MOD-QUALIFICADA-02 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-087 |
| RF-MOD-QUALIFICADA-03 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-088 |
| RF-MOD-QUALIFICADA-04 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-089, F-026 |
| RF-MOD-QUALIFICADA-05 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-090 |
| RF-MOD-QUALIFICADA-06 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-091 |
| RF-MOD-QUALIFICADA-07 | RF | MOD-QUALIFICADA | Cobrança Qualificada | product-vision.md §5 | F-092 |
| RF-MOD-MONITORAMENTO-01 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-096, F-006, F-027 |
| RF-MOD-MONITORAMENTO-02 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-097 |
| RF-MOD-MONITORAMENTO-03 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-098, F-028 |
| RF-MOD-MONITORAMENTO-04 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-099 |
| RF-MOD-MONITORAMENTO-05 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-100 |
| RF-MOD-MONITORAMENTO-06 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-101 |
| RF-MOD-MONITORAMENTO-07 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-102 |
| RF-MOD-MONITORAMENTO-08 | RF | MOD-MONITORAMENTO | Monitoramento e KPIs | product-vision.md §5 | F-103 |
| RF-MOD-GOVERNANCA-01 | RF | MOD-GOVERNANCA | Governança, Acesso e Auditoria | product-vision.md §5 | F-108, F-007, F-031 |
| RF-MOD-GOVERNANCA-02 | RF | MOD-GOVERNANCA | Governança, Acesso e Auditoria | product-vision.md §5 | F-109 |
| RF-MOD-GOVERNANCA-03 | RF | MOD-GOVERNANCA | Governança, Acesso e Auditoria | product-vision.md §5 | F-110 |
| RF-MOD-GOVERNANCA-04 | RF | MOD-GOVERNANCA | Governança, Acesso e Auditoria | product-vision.md §5 | F-111 |
| RF-MOD-GOVERNANCA-05 | RF | MOD-GOVERNANCA | Governança, Acesso e Auditoria | product-vision.md §5 | F-112 |
| RF-MOD-GOVERNANCA-06 | RF | MOD-GOVERNANCA | Governança, Acesso e Auditoria | product-vision.md §5 | F-113 |
| RNF-DES-001 | RNF | MOD-INGESTAO | Desempenho | product-vision.md §4 | F-183, F-133 |
| RNF-DES-002 | RNF | MOD-REGUAS | Desempenho | product-vision.md §4 | F-150 |
| RNF-CON-001 | RNF | MOD-INGESTAO | Confiabilidade | product-vision.md §4 | F-133 |
| RNF-SEG-001 | RNF | MOD-GOVERNANCA | Segurança | product-vision.md §4 | F-017, F-158 |
| RNF-SEG-002 | RNF | MOD-REGUAS | Segurança | product-vision.md §4 | F-188 |
| RNF-USA-001 | RNF | MOD-GOVERNANCA | Usabilidade | product-vision.md §4 | F-008 |
| RNF-CON-002 | RNF | MOD-MONITORAMENTO | Confiabilidade | product-vision.md §4 | F-147 |

---

<!-- id: rf -->

## Requisitos funcionais por módulo

## Módulo: Ingestão e Carteira Consolidada (`MOD-INGESTAO`)

### RF-MOD-INGESTAO-01: Receber débitos das fontes

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Receber débitos das fontes

**Descrição (User Story):**
Como sistema parceiro,
quero enviar os débitos do dia em lotes,
para a carteira refletir os débitos de todas as fontes.

**Enunciado EARS *(1 padrão)*:** QUANDO um sistema parceiro fecha um lote de débitos, o sistema DEVE gravar os registros válidos e responder, por registro, o que foi aceito e o que foi rejeitado.

**Atores:** Sistema parceiro
**Prioridade MoSCoW:** Must
**Complexidade:** Alta

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Lote completo aceito
  Dado que a CCF abriu um lote e enviou 3 pacotes válidos
  Quando ela fecha o lote informando 3 pacotes
  Então o lote fica OK e os débitos aparecem na posição dos contribuintes
Cenário 2: Lote com parte rejeitada
  Dado que um pacote tem 2 registros com campo obrigatório ausente
  Quando a fonte fecha o lote
  Então o lote fica Parcial e a resposta lista os 2 registros com o motivo
Cenário 3: Fonte enviando por outra API
  Dado que o usuário de integração do IPVA chama a API da CCF
  Quando envia um pacote
  Então o sistema recusa o envio e nada é gravado
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-008
**Dependências:** —
**Rastreabilidade:** F-032, F-001, F-018
**Notas:** promove RF-001 do Explore.

---

### RF-MOD-INGESTAO-02: Validar o documento do contribuinte

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Validar o documento do contribuinte

**Descrição (User Story):**
Como sistema parceiro,
quero saber quais registros têm documento inválido,
para corrigir na origem.

**Enunciado EARS *(1 padrão)*:** SE o CPF/CNPJ de um registro tem dígito verificador inválido, ENTÃO o sistema DEVE rejeitar o registro e devolver o motivo «CPF/CNPJ inválido» na resposta.

**Atores:** Sistema parceiro
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Documento válido com máscara
  Dado um registro com CNPJ válido escrito com pontos e barra
  Quando o lote é processado
  Então o documento é gravado só com dígitos
Cenário 2: CPF válido de pessoa física
  Dado um registro do IPVA com CPF válido
  Quando o lote é processado
  Então o contribuinte é gravado como pessoa física
Cenário 3: Dígito inválido
  Dado um registro com CPF de dígito errado
  Quando o lote é processado
  Então o registro vai para a lista de rejeitados com o motivo «CPF/CNPJ inválido»
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-004
**Dependências:** RF-MOD-INGESTAO-01
**Rastreabilidade:** F-033
**Notas:** promove RF-002 do Explore.

---

### RF-MOD-INGESTAO-03: Consolidar débitos por contribuinte

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Consolidar débitos por contribuinte

**Descrição (User Story):**
Como sistema,
quero juntar os débitos de várias fontes do mesmo contribuinte,
para ter uma visão única por contribuinte e por tributo.

**Enunciado EARS *(1 padrão)*:** QUANDO um débito válido é gravado, o sistema DEVE vinculá-lo ao contribuinte do mesmo documento e atualizar a posição do tributo.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Contribuinte em duas fontes
  Dado que o contribuinte tem um débito de ICMS na CCF e um de ITCD
  Quando os dois lotes são processados
  Então ele aparece uma vez, com posição em ICMS e em ITCD
Cenário 2: Contribuinte novo
  Dado um documento que ainda não existe na base
  Quando o débito é gravado
  Então o sistema cria o contribuinte e a posição do tributo
Cenário 3: Mesmo débito pelo MPI e pelo Big Data
  Dado o mesmo débito recebido pelas duas fontes
  Quando os lotes são processados
  Então a posição conta o débito uma vez só
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-001
**Dependências:** RF-MOD-INGESTAO-02
**Rastreabilidade:** F-034
**Notas:** promove RF-003 do Explore.

---

### RF-MOD-INGESTAO-04: Evitar duplicidade no reenvio

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Evitar duplicidade no reenvio

**Descrição (User Story):**
Como sistema parceiro,
quero reenviar um pacote sem medo de duplicar,
para recuperar falhas de comunicação.

**Enunciado EARS *(1 padrão)*:** SE um lote ou registro já recebido chega de novo com o mesmo identificador, ENTÃO o sistema DEVE manter um único registro.

**Atores:** Sistema parceiro
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Pacote reenviado
  Dado que o pacote 2 do lote 100 já foi gravado
  Quando a fonte reenvia o pacote 2
  Então nenhum débito é duplicado
Cenário 2: Registro atualizado
  Dado um débito já gravado
  Quando a fonte envia o mesmo débito com novo valor em outro lote
  Então o débito é atualizado, não duplicado
Cenário 3: Pacote fora de sequência
  Dado um lote que esperava 3 pacotes
  Quando chega o pacote 5
  Então o sistema recusa o pacote e informa a sequência esperada
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-005
**Dependências:** RF-MOD-INGESTAO-01
**Rastreabilidade:** F-035
**Notas:** promove RF-004 do Explore.

---

### RF-MOD-INGESTAO-05: Fechar o ciclo diário e acompanhar as fontes

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Fechar o ciclo diário e acompanhar as fontes

**Descrição (User Story):**
Como gestor de integração,
quero ver a situação de cada fonte no dia,
para agir quando uma fonte não entregou.

**Enunciado EARS *(1 padrão)*:** QUANDO chega o horário-limite de recebimento de uma fonte, o sistema DEVE marcar como Falha a fonte que não entregou e consolidar o que chegou.

**Atores:** Gestor de Integração
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Todas entregaram
  Dado que as seis fontes fecharam seus lotes até o horário-limite
  Quando o ciclo fecha
  Então todas aparecem como OK com a hora da última carga
Cenário 2: Lote parcial
  Dado que a fonte ITCD fechou o lote com rejeições
  Quando o ciclo fecha
  Então a fonte aparece como Parcial com a contagem de rejeitados
Cenário 3: Fonte não entregou
  Dado que a fonte IPVA não enviou o lote até o horário-limite
  Quando o ciclo fecha
  Então a fonte fica em Falha e o Gestor de Integração recebe alerta
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-006
**Dependências:** RF-MOD-INGESTAO-01
**Rastreabilidade:** F-036
**Notas:** promove RF-005 do Explore.

---

### RF-MOD-INGESTAO-06: Seguir operando com fonte em falha

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Seguir operando com fonte em falha

**Descrição (User Story):**
Como sistema,
quero manter a carteira utilizável quando uma fonte falha,
para a cobrança não parar.

**Enunciado EARS *(1 padrão)*:** SE uma fonte fica em Falha no ciclo, ENTÃO o sistema DEVE manter a última carga válida dessa fonte e consolidar as demais.

**Atores:** Sistema
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Uma fonte falha
  Dado que a fonte SNE ficou em Falha
  Quando o ciclo consolida
  Então as outras cinco fontes são consolidadas e ficam OK
Cenário 2: Fonte volta no dia seguinte
  Dado que a fonte SNE falhou ontem
  Quando ela entrega hoje
  Então a carga de hoje substitui a última carga válida
Cenário 3: Nenhuma carga válida
  Dado uma fonte que nunca entregou lote válido
  Quando o ciclo consolida
  Então a fonte aparece sem dados e o alerta indica «sem carga válida»
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-006
**Dependências:** RF-MOD-INGESTAO-05
**Rastreabilidade:** F-037
**Notas:** promove RF-006 do Explore.

---

### RF-MOD-INGESTAO-07: Carga inicial e reconciliação

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Carga inicial e reconciliação

**Descrição (User Story):**
Como gestor de integração,
quero receber o histórico das fontes,
para começar a operar com a base completa.

**Enunciado EARS *(1 padrão)*:** QUANDO uma fonte envia a carga inicial, o sistema DEVE gravá-la pelas mesmas APIs e mostrar os totais por fonte e por tributo para conferência.

**Atores:** Gestor de Integração
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Carga inicial conferida
  Dado que a CCF enviou o histórico em 50 pacotes
  Quando o lote fecha
  Então o Gestor de Integração vê os totais por tributo para conferir com a fonte
Cenário 2: Carga inicial em 3 lotes
  Dado que o histórico do IPVA veio em 3 lotes
  Quando os 3 fecham
  Então os totais somam os 3 lotes
Cenário 3: Total divergente
  Dado que a fonte informa um total diferente do gravado
  Quando o lote fecha
  Então o lote fica Parcial e a divergência aparece na conferência
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-005
**Dependências:** RF-MOD-INGESTAO-01
**Rastreabilidade:** F-038
**Notas:** promove RF-007 do Explore.

---

### RF-MOD-INGESTAO-08: Reprocessar registros rejeitados

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Reprocessar registros rejeitados

**Descrição (User Story):**
Como gestor de integração,
quero reprocessar um registro rejeitado sem pedir novo envio,
para corrigir rejeições por causa já resolvida.

**Enunciado EARS *(1 padrão)*:** QUANDO o Gestor de Integração aciona o reprocesso de um registro rejeitado, o sistema DEVE validar de novo o conteúdo guardado e gravá-lo se passar.

**Atores:** Gestor de Integração
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Reprocesso aceito
  Dado um registro rejeitado por «Contribuinte não encontrado»
  Quando o contribuinte já existe e o gestor aciona o reprocesso
  Então o registro é gravado e sai da lista de rejeitados
Cenário 2: Reprocesso em lote
  Dado 10 registros rejeitados do mesmo lote
  Quando o gestor seleciona os 10 e reprocessa
  Então cada um é revalidado e o resultado aparece por registro
Cenário 3: Reprocesso falha de novo
  Dado um registro com CPF de dígito inválido
  Quando o gestor reprocessa
  Então ele continua rejeitado com o mesmo motivo
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-004
**Dependências:** RF-MOD-INGESTAO-02
**Rastreabilidade:** F-039
**Notas:** promove RF-008 do Explore.

---

### RF-MOD-INGESTAO-09: Atualizar a regularização durante o ciclo

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Atualizar a regularização durante o ciclo

**Descrição (User Story):**
Como sistema,
quero saber no dia quem regularizou,
para não cobrar quem já pagou.

**Enunciado EARS *(1 padrão)*:** QUANDO a carga do dia mostra um débito regularizado, o sistema DEVE encerrar o caso e a régua do contribuinte naquele ciclo.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Regularização total
  Dado um contribuinte em régua com um único débito
  Quando a carga mostra o débito regularizado
  Então a régua e o caso são encerrados
Cenário 2: Regularização parcial
  Dado um contribuinte com dois débitos
  Quando só um é regularizado
  Então ele continua na régua pelo débito em aberto
Cenário 3: Comunicação já agendada
  Dado uma etapa de régua prevista para hoje
  Quando o contribuinte regularizou na carga do dia
  Então a etapa não é enviada
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-002
**Dependências:** RF-MOD-INGESTAO-03
**Rastreabilidade:** F-040, F-020
**Notas:** promove RF-009 do Explore.

---

### RF-MOD-INGESTAO-10: Alertar parcelamento em risco

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Alertar parcelamento em risco

**Descrição (User Story):**
Como coordenador,
quero saber quais parcelamentos têm parcela vencida,
para agir antes do rompimento.

**Enunciado EARS *(1 padrão)*:** QUANDO a carga mostra parcela vencida em um parcelamento ativo, o sistema DEVE marcar o parcelamento como «Em risco».

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Parcela vencida
  Dado um parcelamento ativo
  Quando a carga mostra uma parcela vencida
  Então o parcelamento e a posição do tributo ficam «Em risco»
Cenário 2: Parcela quitada
  Dado um parcelamento «Em risco»
  Quando a carga mostra a parcela paga
  Então ele volta a «Ativo»
Cenário 3: Parcelamento encerrado
  Dado um parcelamento encerrado
  Quando a carga traz parcela vencida antiga
  Então ele não é marcado como em risco
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-INGESTAO-03
**Rastreabilidade:** F-041
**Notas:** promove RF-010 do Explore.

---

### RF-MOD-INGESTAO-11: Transição MPI → Big Data

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Transição MPI → Big Data

**Descrição (User Story):**
Como gestor de integração,
quero receber as duas fontes durante a transição,
para não perder débitos enquanto o MPI é desligado.

**Enunciado EARS *(1 padrão)*:** ENQUANTO o MPI estiver ativo, o sistema DEVE receber MPI e Big Data sem duplicar débitos e mostrar o percentual de regras migradas.

**Atores:** Gestor de Integração
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Débito só no MPI
  Dado um débito que só o MPI envia
  Quando o lote é processado
  Então o débito entra na posição do contribuinte
Cenário 2: Percentual de migração
  Dado que o MPI informa 60% das regras migradas
  Quando o lote fecha
  Então a fonte MPI mostra 60% de migração
Cenário 3: Débito nas duas fontes
  Dado o mesmo débito pelo MPI e pelo Big Data
  Quando os lotes são processados
  Então existe um único débito
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-003
**Dependências:** RF-MOD-INGESTAO-03
**Rastreabilidade:** F-042
**Notas:** promove RF-011 do Explore.

---

### RF-MOD-INGESTAO-12: Receber sinalização coercitiva

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Receber sinalização coercitiva

**Descrição (User Story):**
Como atendente,
quero ver se outra coordenadoria já está cobrando de forma coercitiva,
para não conflitar com protesto ou notificação.

**Enunciado EARS *(1 padrão)*:** QUANDO a SNE/DT-e envia uma sinalização de cobrança coercitiva, o sistema DEVE mostrá-la no contribuinte como informação, sem agir sobre ela.

**Atores:** Atendente
**Prioridade MoSCoW:** Could
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Sinalização ativa
  Dado um protesto via PGE enviado pela SNE
  Quando o atendente abre o dossiê
  Então vê a sinalização ativa com tipo e data
Cenário 2: Sinalização encerrada
  Dado uma sinalização marcada como inativa pela fonte
  Quando o dossiê é aberto
  Então ela aparece no histórico como encerrada
Cenário 3: Tentativa de ação
  Dado uma sinalização no dossiê
  Quando o atendente procura uma ação sobre ela
  Então não existe ação disponível, só leitura
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-007
**Dependências:** RF-MOD-INGESTAO-01
**Rastreabilidade:** F-043
**Notas:** promove RF-012 do Explore.

---

### RF-MOD-INGESTAO-13: Visão única do contribuinte

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Visão única do contribuinte

**Descrição (User Story):**
Como coordenador,
quero ver tudo de um contribuinte num lugar só,
para decidir sem consultar outros sistemas.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE mostrar, no formulário do contribuinte, os débitos, parcelamentos, comunicações e sinalizações dele.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Contribuinte com histórico
  Dado um contribuinte com débitos em duas fontes e duas comunicações
  Quando o coordenador abre o formulário
  Então vê débitos, parcelamentos, comunicações e sinalizações em listas
Cenário 2: Contribuinte sem comunicação
  Dado um contribuinte nunca cobrado
  Quando o formulário é aberto
  Então a lista de comunicações mostra «Nenhuma comunicação enviada»
Cenário 3: Atendente sem o caso
  Dado um atendente sem caso deste contribuinte
  Quando tenta abrir o formulário
  Então o sistema nega o acesso
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-001, RN-NOVO-GOV-001
**Dependências:** RF-MOD-INGESTAO-03
**Rastreabilidade:** F-044
**Notas:** promove RF-013 do Explore.

---

### RF-MOD-INGESTAO-14: Carteira consolidada

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Carteira consolidada

**Descrição (User Story):**
Como coordenador,
quero listar a posição dos contribuintes por tributo,
para escolher onde atuar.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE listar a posição contribuinte × tributo com filtros salvos por tributo, atraso, valor e situação.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Filtro por tributo
  Dado a carteira consolidada
  Quando o coordenador filtra ICMS Normal com atraso acima de 90 dias
  Então vê só essas posições, ordenadas por valor
Cenário 2: Filtro salvo
  Dado um filtro salvo «IPVA acima de R$ 5 mil»
  Quando o coordenador o seleciona
  Então a lista aplica o filtro
Cenário 3: Filtro sem resultado
  Dado um filtro que não encontra posições
  Quando é aplicado
  Então a lista mostra «Nenhuma posição encontrada para os filtros»
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-INGESTAO-03
**Rastreabilidade:** F-045, F-019
**Notas:** promove RF-014 do Explore.

---

### RF-MOD-INGESTAO-15: Simular cargas das fontes

**Épico:** Ingestão e Carteira Consolidada
**Funcionalidade:** Simular cargas das fontes

**Descrição (User Story):**
Como gestor de integração,
quero gerar lotes de teste por fonte,
para testar as APIs antes da integração real.

**Enunciado EARS *(1 padrão)*:** ONDE o ambiente não for produção, o sistema DEVE gerar lotes simulados por fonte, inclusive com registros inválidos e repetidos.

**Atores:** Gestor de Integração
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Lote simulado válido
  Dado o ambiente de testes
  Quando o gestor gera um lote simulado da CCF
  Então o lote passa pelas mesmas validações e grava os débitos
Cenário 2: Lote com inválidos
  Dado um lote simulado com 5% de documentos inválidos
  Quando é processado
  Então os inválidos aparecem como rejeitados
Cenário 3: Ambiente de produção
  Dado o ambiente de produção
  Quando alguém tenta gerar lote simulado
  Então a opção não existe
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-004, RN-NOVO-ING-005
**Dependências:** RF-MOD-INGESTAO-01
**Rastreabilidade:** F-046
**Notas:** promove RF-015 do Explore.

---

## Módulo: Qualificação e Parametrização da Carteira (`MOD-QUALIFICACAO`)

### RF-MOD-QUALIFICACAO-01: Parametrizar critérios da carteira

**Épico:** Qualificação e Parametrização da Carteira
**Funcionalidade:** Parametrizar critérios da carteira

**Descrição (User Story):**
Como coordenador,
quero definir os critérios de quem entra na carteira,
para a seleção ser replicável.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE permitir ao coordenador definir, no rascunho, valor mínimo, tributos, atraso mínimo, instrumentos, exclusão de contumazes e limite de score.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Rascunho completo
  Dado um rascunho aberto
  Quando o coordenador define ICMS Normal, valor mínimo R$ 10 mil e atraso de 60 dias
  Então o rascunho guarda os critérios
Cenário 2: Sem limite de score
  Dado um rascunho
  Quando o coordenador deixa o limite de score vazio
  Então a carteira não filtra por score
Cenário 3: Valor negativo
  Dado um rascunho
  Quando o coordenador informa valor mínimo negativo
  Então o sistema recusa e mostra «O valor mínimo deve ser zero ou maior»
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-001, RN-NOVO-QUA-004
**Dependências:** —
**Rastreabilidade:** F-055, F-002, F-021
**Notas:** promove RF-016 do Explore.

---

### RF-MOD-QUALIFICACAO-02: Versionar critérios

**Épico:** Qualificação e Parametrização da Carteira
**Funcionalidade:** Versionar critérios

**Descrição (User Story):**
Como coordenador,
quero publicar uma nova versão dos critérios,
para a carteira usar regras aprovadas e auditáveis.

**Enunciado EARS *(1 padrão)*:** QUANDO o coordenador publica um rascunho com prévia vigente e fundamentação, o sistema DEVE criar a versão seguinte e torná-la imutável.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Publicação
  Dado um rascunho com prévia vigente
  Quando o coordenador publica com fundamentação
  Então nasce a versão seguinte, publicada e imutável
Cenário 2: Nova versão a partir da publicada
  Dado a versão 3 publicada
  Quando o coordenador cria um rascunho
  Então o rascunho parte dos critérios da versão 3
Cenário 3: Sem fundamentação
  Dado um rascunho com prévia
  Quando o coordenador publica sem fundamentação
  Então o sistema recusa e mostra «Informe a fundamentação para publicar»
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-001, RN-NOVO-QUA-005, RN-NOVO-QUA-006
**Dependências:** RF-MOD-QUALIFICACAO-01
**Rastreabilidade:** F-056
**Notas:** promove RF-017 do Explore.

---

### RF-MOD-QUALIFICACAO-03: Simular a carteira

**Épico:** Qualificação e Parametrização da Carteira
**Funcionalidade:** Simular a carteira

**Descrição (User Story):**
Como coordenador,
quero ver a carteira antes de publicar,
para avaliar o efeito dos critérios.

**Enunciado EARS *(1 padrão)*:** QUANDO o coordenador pede a prévia de um rascunho, o sistema DEVE gerar a carteira simulada sem alterar a operação.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Prévia gerada
  Dado um rascunho
  Quando o coordenador gera a prévia
  Então vê quantos contribuintes entram por segmento e por tributo
Cenário 2: Prévia refeita
  Dado uma prévia gerada
  Quando o coordenador muda um parâmetro
  Então a prévia anterior perde a validade e ele precisa gerar outra
Cenário 3: Prévia vazia
  Dado critérios que ninguém atende
  Quando a prévia é gerada
  Então o sistema mostra «Nenhum contribuinte atende aos critérios»
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-004, RN-NOVO-QUA-006
**Dependências:** RF-MOD-QUALIFICACAO-01
**Rastreabilidade:** F-057, F-022
**Notas:** promove RF-018 do Explore.

---

### RF-MOD-QUALIFICACAO-04: Segmentar massificada × qualificada

**Épico:** Qualificação e Parametrização da Carteira
**Funcionalidade:** Segmentar massificada × qualificada

**Descrição (User Story):**
Como sistema,
quero separar a carteira em dois eixos,
para cada contribuinte receber a estratégia certa.

**Enunciado EARS *(1 padrão)*:** QUANDO a carteira é gerada, o sistema DEVE classificar cada contribuinte no segmento-alvo da versão.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Segmentação
  Dado uma versão com tipo-alvo qualificada para valores acima de R$ 500 mil
  Quando a carteira é gerada
  Então esses contribuintes ficam na qualificada e os demais na massificada
Cenário 2: Sem qualificada
  Dado uma versão só com tipo-alvo massificada
  Quando a carteira é gerada
  Então todos ficam na massificada
Cenário 3: Contribuinte nos dois critérios
  Dado um contribuinte que atende aos dois segmentos
  Quando a carteira é gerada
  Então ele fica num único segmento e o caso vai para revisão (desempate pendente, QA-01)
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-002
**Dependências:** RF-MOD-QUALIFICACAO-03
**Rastreabilidade:** F-058
**Notas:** promove RF-019 do Explore.

---

### RF-MOD-QUALIFICACAO-05: Sortear o grupo de controle

**Épico:** Qualificação e Parametrização da Carteira
**Funcionalidade:** Sortear o grupo de controle

**Descrição (User Story):**
Como sistema,
quero sortear quem não será cobrado,
para medir o efeito da cobrança.

**Enunciado EARS *(1 padrão)*:** QUANDO a carteira é segmentada, o sistema DEVE sortear o grupo de controle no percentual do parâmetro, com semente gravada.

**Atores:** Sistema
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Sorteio padrão
  Dado uma carteira de 10.000 contribuintes e parâmetro de 3%
  Quando o sorteio roda
  Então 300 itens ficam como controle
Cenário 2: Sorteio refeito
  Dado a semente gravada da carteira
  Quando o sorteio é refeito
  Então o mesmo grupo é sorteado
Cenário 3: Controle não é cobrado
  Dado um item do grupo de controle
  Quando a carteira é confirmada
  Então ele não entra em régua nem vira caso
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-003
**Dependências:** RF-MOD-QUALIFICACAO-04
**Rastreabilidade:** F-059
**Notas:** promove RF-020 do Explore.

---

### RF-MOD-QUALIFICACAO-06: Confirmar a carteira

**Épico:** Qualificação e Parametrização da Carteira
**Funcionalidade:** Confirmar a carteira

**Descrição (User Story):**
Como coordenador,
quero confirmar a carteira do ciclo,
para liberar as réguas e criar os casos.

**Enunciado EARS *(1 padrão)*:** QUANDO o coordenador confirma a carteira de uma versão publicada, o sistema DEVE liberar as réguas da massificada e criar os casos da qualificada.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Confirmação
  Dado uma carteira gerada com a versão 4 publicada
  Quando o coordenador confirma
  Então as réguas começam no próximo ciclo e os casos são criados
Cenário 2: Carteira já confirmada
  Dado uma carteira confirmada
  Quando alguém tenta alterá-la
  Então o sistema recusa, porque a carteira confirmada é imutável
Cenário 3: Versão em rascunho
  Dado uma carteira simulada com rascunho
  Quando o coordenador tenta confirmar
  Então o sistema recusa e mostra «Só é possível confirmar com versão publicada»
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-005, RN-NOVO-QUA-006
**Dependências:** RF-MOD-QUALIFICACAO-05
**Rastreabilidade:** F-060
**Notas:** promove RF-021 do Explore.

---

## Módulo: Scoring de Liquidez (`MOD-SCORE`)

### RF-MOD-SCORE-01: Receber o score da UFMT

**Épico:** Scoring de Liquidez
**Funcionalidade:** Receber o score da UFMT

**Descrição (User Story):**
Como UFMT (sistema),
quero enviar o score por lote,
para o produto priorizar com base analítica.

**Enunciado EARS *(1 padrão)*:** QUANDO a UFMT fecha um lote de score, o sistema DEVE vincular cada score ao contribuinte pelo documento e registrar a versão do modelo.

**Atores:** UFMT (sistema)
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Lote de score
  Dado um lote com a versão 2.1 do modelo
  Quando ele fecha
  Então cada contribuinte encontrado recebe o novo score como vigente
Cenário 2: Contribuinte inexistente
  Dado um score de documento sem contribuinte na base
  Quando o lote é processado
  Então o registro vai para rejeitados com «Contribuinte não encontrado»
Cenário 3: Lote sem versão do modelo
  Dado um lote sem versão do modelo
  Quando a UFMT tenta fechá-lo
  Então o sistema recusa o fechamento e informa o campo ausente
```

**Regras de Negócio aplicáveis:** RN-NOVO-SCO-001
**Dependências:** RF-MOD-INGESTAO-03
**Rastreabilidade:** F-067, F-003, F-029
**Notas:** promove RF-022 do Explore.

---

### RF-MOD-SCORE-02: Classificar o score em faixas

**Épico:** Scoring de Liquidez
**Funcionalidade:** Classificar o score em faixas

**Descrição (User Story):**
Como sistema,
quero classificar o score em faixas,
para o coordenador usar faixas na estratégia.

**Enunciado EARS *(1 padrão)*:** QUANDO um score é recebido, o sistema DEVE classificá-lo na faixa parametrizada que contém o valor.

**Atores:** Sistema
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Score na faixa
  Dado as faixas Baixa (0 a 0,33), Média e Alta
  Quando chega score 0,80
  Então ele é classificado como Alta
Cenário 2: Faixas alteradas
  Dado que o admin alterou os limites das faixas
  Quando chega o próximo lote
  Então os novos scores usam os novos limites
Cenário 3: Valor fora das faixas
  Dado faixas que não cobrem o valor recebido
  Quando o score chega
  Então fica sem faixa e o Gestor de Integração recebe alerta
```

**Regras de Negócio aplicáveis:** RN-NOVO-SCO-002
**Dependências:** RF-MOD-SCORE-01
**Rastreabilidade:** F-068, F-030
**Notas:** promove RF-023 do Explore.

---

### RF-MOD-SCORE-03: Operar sem score

**Épico:** Scoring de Liquidez
**Funcionalidade:** Operar sem score

**Descrição (User Story):**
Como coordenador,
quero continuar qualificando e priorizando sem score,
para a operação não depender do modelo da UFMT.

**Enunciado EARS *(1 padrão)*:** SE o contribuinte não tem score vigente, ENTÃO o sistema DEVE qualificá-lo e priorizá-lo só pelos critérios determinísticos.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Sem score
  Dado um contribuinte do ITCD sem score
  Quando a carteira é gerada
  Então ele é avaliado sem o limite de score
Cenário 2: Score chega depois
  Dado um contribuinte que recebeu score hoje
  Quando a próxima carteira é gerada
  Então o limite de score passa a valer para ele
Cenário 3: Modelo indisponível
  Dado que a UFMT não envia lote há 30 dias
  Quando a fila é ordenada
  Então a prioridade usa valor e atraso e o painel do score mostra a cobertura baixa
```

**Regras de Negócio aplicáveis:** RN-NOVO-SCO-001
**Dependências:** RF-MOD-QUALIFICACAO-03
**Rastreabilidade:** F-069
**Notas:** promove RF-024 do Explore.

---

### RF-MOD-SCORE-04: Painel do Score

**Épico:** Scoring de Liquidez
**Funcionalidade:** Painel do Score

**Descrição (User Story):**
Como gestor de integração,
quero acompanhar a cobertura e a distribuição do score,
para saber se o score está sendo útil.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE mostrar no Painel do Score a cobertura por tributo, o score médio, a distribuição por faixa e os últimos lotes.

**Atores:** Gestor de Integração
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Painel completo
  Dado lotes de score recebidos
  Quando o gestor abre o painel
  Então vê cobertura por tributo, média, distribuição e últimos lotes
Cenário 2: Filtro por tributo
  Dado o painel aberto
  Quando o gestor filtra IPVA
  Então os indicadores mostram só o IPVA
Cenário 3: Atendente
  Dado um usuário atendente
  Quando tenta abrir o painel
  Então o sistema nega o acesso
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-002
**Dependências:** RF-MOD-SCORE-02
**Rastreabilidade:** F-070
**Notas:** promove RF-025 do Explore.

---

## Módulo: Réguas de Cobrança Massificada (`MOD-REGUAS`)

### RF-MOD-REGUAS-01: Montar a régua

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Montar a régua

**Descrição (User Story):**
Como coordenador,
quero cadastrar a régua de um segmento,
para definir quando e por qual canal cobrar.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE permitir ao coordenador cadastrar régua por segmento com etapas ordenadas por prazo, canal e modelo de mensagem.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Régua nova
  Dado o segmento IPVA
  Quando o coordenador cria a régua com etapas no dia 0 por e-mail, dia 10 por SMS e dia 20 por WhatsApp
  Então a régua fica pronta para ativar
Cenário 2: Régua a partir de outra
  Dado uma régua de ICMS Normal
  Quando o coordenador cria outra a partir dela
  Então as etapas são copiadas para edição
Cenário 3: Etapa duplicada
  Dado uma régua com etapa no dia 10
  Quando o coordenador adiciona outra no dia 10 pelo mesmo canal
  Então o sistema recusa e mostra «Já existe etapa neste prazo e canal»
```

**Regras de Negócio aplicáveis:** RN-NOVO-REG-004
**Dependências:** —
**Rastreabilidade:** F-072, F-004, F-023
**Notas:** promove RF-026 do Explore.

---

### RF-MOD-REGUAS-02: Enviar a etapa devida

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Enviar a etapa devida

**Descrição (User Story):**
Como sistema,
quero enviar a etapa certa no dia certo,
para cobrar sem confirmação manual.

**Enunciado EARS *(1 padrão)*:** QUANDO o processamento diário identifica etapa devida para um contribuinte da massificada, o sistema DEVE criar e enviar a comunicação.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Alta

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Etapa do dia
  Dado um contribuinte na régua há 10 dias
  Quando o processamento diário roda
  Então a etapa do dia 10 é enviada
Cenário 2: Sem etapa no dia
  Dado um contribuinte na régua há 12 dias e etapas nos dias 10 e 20
  Quando o processamento roda
  Então nada é enviado
Cenário 3: Contribuinte regularizou
  Dado um contribuinte que regularizou ontem
  Quando o processamento roda
  Então nenhuma etapa é enviada
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-002, RN-NOVO-QUA-002, RN-NOVO-REG-002
**Dependências:** RF-MOD-QUALIFICACAO-06
**Rastreabilidade:** F-073, F-024
**Notas:** promove RF-027 do Explore.

---

### RF-MOD-REGUAS-03: Escalonar e encaminhar

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Escalonar e encaminhar

**Descrição (User Story):**
Como sistema,
quero intensificar a cobrança de quem não responde,
para aumentar a recuperação.

**Enunciado EARS *(1 padrão)*:** QUANDO o contribuinte termina a última etapa sem regularizar, o sistema DEVE encaminhá-lo à cobrança qualificada.

**Atores:** Sistema
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Régua esgotada
  Dado um contribuinte que recebeu a última etapa há 10 dias
  Quando ele não regularizou
  Então vira caso na cobrança qualificada
Cenário 2: Regularizou no meio
  Dado um contribuinte na etapa 2
  Quando ele regulariza
  Então a régua é encerrada e ele não vira caso
Cenário 3: Régua pausada
  Dado uma régua pausada
  Quando o prazo de encaminhamento vence
  Então ninguém é encaminhado até a régua ser retomada
```

**Regras de Negócio aplicáveis:** RN-NOVO-REG-002
**Dependências:** RF-MOD-REGUAS-02
**Rastreabilidade:** F-074
**Notas:** promove RF-028 do Explore.

---

### RF-MOD-REGUAS-04: Respeitar o consentimento

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Respeitar o consentimento

**Descrição (User Story):**
Como sistema,
quero conferir o consentimento antes de enviar,
para não mandar mensagem a quem não autorizou.

**Enunciado EARS *(1 padrão)*:** SE o contribuinte não tem opt-in vigente no canal da etapa, ENTÃO o sistema NÃO DEVE enviar por esse canal.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Com opt-in
  Dado opt-in vigente no WhatsApp
  Quando a etapa de WhatsApp é devida
  Então a mensagem é enviada
Cenário 2: Opt-out no dia
  Dado que o contribuinte fez opt-out hoje de manhã
  Quando a etapa é processada à tarde
  Então a mensagem não é enviada
Cenário 3: Sem opt-in
  Dado nenhum consentimento registrado para SMS
  Quando a etapa de SMS é devida
  Então a comunicação fica como «Não enviada — sem consentimento»
```

**Regras de Negócio aplicáveis:** RN-NOVO-REG-003
**Dependências:** RF-MOD-REGUAS-02
**Rastreabilidade:** F-075
**Notas:** promove RF-029 do Explore.

---

### RF-MOD-REGUAS-05: Enviar por canal

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Enviar por canal

**Descrição (User Story):**
Como sistema,
quero enviar por e-mail, SMS ou WhatsApp,
para alcançar o contribuinte pelo canal da etapa.

**Enunciado EARS *(1 padrão)*:** QUANDO uma comunicação é liberada para envio, o sistema DEVE enviá-la pelo provedor do canal e registrar a situação «Enviada».

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Alta

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Envio por e-mail
  Dado uma comunicação de e-mail liberada
  Quando o envio roda
  Então o provedor recebe a mensagem e ela fica «Enviada»
Cenário 2: Troca de provedor
  Dado que o provedor de SMS foi trocado em parâmetro
  Quando a próxima comunicação de SMS é enviada
  Então ela usa o novo provedor
Cenário 3: Variável ausente
  Dado um modelo que usa uma variável sem valor para o contribuinte
  Quando a comunicação é montada
  Então ela fica «Falha — dado ausente» e não é enviada
```

**Regras de Negócio aplicáveis:** RN-NOVO-REG-003
**Dependências:** RF-MOD-REGUAS-04
**Rastreabilidade:** F-076
**Notas:** promove RF-030 do Explore.

---

### RF-MOD-REGUAS-06: Receber o status de entrega

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Receber o status de entrega

**Descrição (User Story):**
Como Provedor de mensagens (sistema),
quero informar se a mensagem foi entregue,
para a régua saber o que chegou ao contribuinte.

**Enunciado EARS *(1 padrão)*:** QUANDO o provedor informa o status de uma comunicação, o sistema DEVE atualizar a situação dela, sem duplicar quando o mesmo status chega de novo.

**Atores:** Provedor de mensagens (sistema)
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Entregue
  Dado uma comunicação «Enviada»
  Quando o provedor informa entrega
  Então ela fica «Entregue»
Cenário 2: Status repetido
  Dado uma comunicação «Entregue»
  Quando o mesmo status chega de novo
  Então nada muda
Cenário 3: Status de comunicação inexistente
  Dado um identificador desconhecido
  Quando o provedor envia o status
  Então o sistema recusa e registra o evento
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-REGUAS-05
**Rastreabilidade:** F-077
**Notas:** promove RF-031 do Explore.

---

### RF-MOD-REGUAS-07: Reenviar falhas

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Reenviar falhas

**Descrição (User Story):**
Como sistema,
quero reenviar o que falhou,
para não perder a comunicação por falha momentânea.

**Enunciado EARS *(1 padrão)*:** SE uma comunicação fica em Falha, ENTÃO o sistema DEVE reenviá-la até o limite de tentativas do parâmetro.

**Atores:** Sistema
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Reenvio com sucesso
  Dado uma comunicação em Falha e limite de 3 tentativas
  Quando o reenvio roda
  Então ela é reenviada e fica «Enviada»
Cenário 2: Limite alterado
  Dado que o admin mudou o limite para 5
  Quando a próxima falha ocorre
  Então valem 5 tentativas
Cenário 3: Limite atingido
  Dado uma comunicação que falhou 3 vezes com limite 3
  Quando o reenvio roda
  Então ela fica «Falha definitiva» e não é reenviada
```

**Regras de Negócio aplicáveis:** RN-NOVO-REG-001
**Dependências:** RF-MOD-REGUAS-05
**Rastreabilidade:** F-078
**Notas:** promove RF-032 do Explore.

---

### RF-MOD-REGUAS-08: Pausar e retomar a régua

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Pausar e retomar a régua

**Descrição (User Story):**
Como coordenador,
quero pausar uma régua,
para interromper a cobrança sem perder o histórico.

**Enunciado EARS *(1 padrão)*:** QUANDO o coordenador pausa uma régua, o sistema DEVE parar de criar comunicações dela e manter as já enviadas.

**Atores:** Coordenador
**Prioridade MoSCoW:** Could
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Pausa
  Dado uma régua ativa
  Quando o coordenador pausa
  Então nenhuma comunicação nova é criada
Cenário 2: Retomada
  Dado uma régua pausada há 5 dias
  Quando o coordenador retoma
  Então o processamento seguinte envia as etapas devidas a partir de hoje
Cenário 3: Pausa com envios no dia
  Dado comunicações já enviadas hoje
  Quando a régua é pausada
  Então elas continuam registradas e não são canceladas
```

**Regras de Negócio aplicáveis:** RN-NOVO-REG-005
**Dependências:** RF-MOD-REGUAS-01
**Rastreabilidade:** F-079
**Notas:** promove RF-033 do Explore.

---

### RF-MOD-REGUAS-09: Acompanhar a execução

**Épico:** Réguas de Cobrança Massificada
**Funcionalidade:** Acompanhar a execução

**Descrição (User Story):**
Como coordenador,
quero ver o que foi enviado e o que falhou,
para corrigir problemas de envio.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE listar as comunicações por régua, canal e situação, com filtros.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Lista do dia
  Dado as comunicações enviadas hoje
  Quando o coordenador abre a execução
  Então vê as comunicações por régua, canal e situação
Cenário 2: Filtro por falha
  Dado comunicações enviadas, entregues e em falha definitiva
  Quando o coordenador filtra «Falha definitiva»
  Então vê só essas
Cenário 3: Sem comunicações
  Dado uma régua ainda não iniciada
  Quando o coordenador a filtra
  Então vê «Nenhuma comunicação para esta régua»
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-REGUAS-02
**Rastreabilidade:** F-080
**Notas:** promove RF-034 do Explore.

---

## Módulo: Cobrança Qualificada (`MOD-QUALIFICADA`)

### RF-MOD-QUALIFICADA-01: Criar casos

**Épico:** Cobrança Qualificada
**Funcionalidade:** Criar casos

**Descrição (User Story):**
Como sistema,
quero criar o caso de cobrança qualificada,
para o atendente ter onde trabalhar.

**Enunciado EARS *(1 padrão)*:** QUANDO a carteira é confirmada ou o contribuinte esgota a régua, o sistema DEVE criar um caso com número CQ-ano-sequencial.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Carteira confirmada
  Dado 120 contribuintes na qualificada
  Quando a carteira é confirmada
  Então nascem 120 casos numerados
Cenário 2: Régua esgotada
  Dado um contribuinte da massificada que esgotou a régua
  Quando o encaminhamento roda
  Então nasce um caso para ele
Cenário 3: Caso já aberto
  Dado um contribuinte com caso aberto
  Quando ele seria encaminhado de novo
  Então o sistema não cria outro caso
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-002, RN-NOVO-QUA-002
**Dependências:** RF-MOD-QUALIFICACAO-06
**Rastreabilidade:** F-086, F-005, F-025
**Notas:** promove RF-035 do Explore.

---

### RF-MOD-QUALIFICADA-02: Distribuir casos

**Épico:** Cobrança Qualificada
**Funcionalidade:** Distribuir casos

**Descrição (User Story):**
Como sistema,
quero atribuir cada caso a um atendente,
para a carga ficar equilibrada sem planilha.

**Enunciado EARS *(1 padrão)*:** QUANDO um caso é criado, o sistema DEVE atribuí-lo ao atendente do grupo com menos casos abertos.

**Atores:** Sistema
**Prioridade MoSCoW:** Should
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Distribuição por carga
  Dado atendentes com 10, 12 e 8 casos abertos
  Quando um caso é criado
  Então ele vai para quem tem 8
Cenário 2: Distribuição por grupo
  Dado um grupo de atendentes configurado para ITCD
  Quando um caso de ITCD é criado
  Então ele vai para alguém desse grupo
Cenário 3: Grupo sem atendente ativo
  Dado um grupo sem ninguém ativo
  Quando um caso é criado
  Então ele fica sem atendente e o coordenador recebe alerta
```

**Regras de Negócio aplicáveis:** RN-NOVO-CQ-001
**Dependências:** RF-MOD-QUALIFICADA-01
**Rastreabilidade:** F-087
**Notas:** promove RF-036 do Explore.

---

### RF-MOD-QUALIFICADA-03: Fila priorizada

**Épico:** Cobrança Qualificada
**Funcionalidade:** Fila priorizada

**Descrição (User Story):**
Como atendente,
quero ver meus casos do mais prioritário ao menos,
para começar pelo que mais recupera.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE mostrar ao atendente só os casos atribuídos a ele, ordenados por prioridade.

**Atores:** Atendente
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Minha fila
  Dado 15 casos atribuídos ao atendente
  Quando ele abre «Minha fila»
  Então vê os 15 do maior para o menor em prioridade
Cenário 2: Caso sem score
  Dado um caso de contribuinte sem score
  Quando a fila é ordenada
  Então a prioridade dele usa valor e atraso
Cenário 3: Caso de outro atendente
  Dado um caso atribuído a outro atendente
  Quando o atendente procura por ele
  Então o caso não aparece
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-002, RN-NOVO-SCO-001, RN-NOVO-CQ-003
**Dependências:** RF-MOD-QUALIFICADA-02
**Rastreabilidade:** F-088
**Notas:** promove RF-037 do Explore.

---

### RF-MOD-QUALIFICADA-04: Dossiê do caso

**Épico:** Cobrança Qualificada
**Funcionalidade:** Dossiê do caso

**Descrição (User Story):**
Como atendente,
quero ver tudo do contribuinte dentro do caso,
para conduzir o contato com contexto.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE reunir no formulário do caso os débitos, parcelamentos, interações, follow-ups, sinalizações e vínculos econômicos do contribuinte.

**Atores:** Atendente
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Dossiê completo
  Dado um caso de contribuinte com débitos, parcelamento e sinalização
  Quando o atendente abre o caso
  Então vê tudo em listas no mesmo formulário
Cenário 2: Grupo econômico
  Dado um contribuinte com duas empresas vinculadas
  Quando o caso é aberto
  Então os vínculos aparecem com a natureza da relação
Cenário 3: CPF de pessoa física
  Dado um caso de pessoa física
  Quando o atendente abre o caso
  Então o CPF aparece mascarado
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-007, RN-NOVO-GOV-002
**Dependências:** RF-MOD-INGESTAO-13
**Rastreabilidade:** F-089, F-026
**Notas:** promove RF-038 do Explore.

---

### RF-MOD-QUALIFICADA-05: Registrar interação

**Épico:** Cobrança Qualificada
**Funcionalidade:** Registrar interação

**Descrição (User Story):**
Como atendente,
quero registrar cada contato com o contribuinte,
para manter o histórico do caso.

**Enunciado EARS *(1 padrão)*:** QUANDO o atendente salva uma interação, o sistema DEVE gravá-la com autor e data e impedir alteração ou exclusão.

**Atores:** Atendente
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Interação registrada
  Dado um caso aberto
  Quando o atendente registra contato telefônico com resultado «Promessa de pagamento»
  Então a interação aparece no histórico com autor e data
Cenário 2: Correção de interação
  Dado uma interação com erro
  Quando o atendente precisa corrigir
  Então ele registra nova interação de correção, e a anterior continua
Cenário 3: Tentativa de editar
  Dado uma interação salva
  Quando alguém tenta editar ou excluir
  Então o sistema recusa
```

**Regras de Negócio aplicáveis:** RN-NOVO-CQ-002
**Dependências:** RF-MOD-QUALIFICADA-01
**Rastreabilidade:** F-090
**Notas:** promove RF-039 do Explore.

---

### RF-MOD-QUALIFICADA-06: Follow-up com lembrete

**Épico:** Cobrança Qualificada
**Funcionalidade:** Follow-up com lembrete

**Descrição (User Story):**
Como atendente,
quero agendar o próximo contato,
para não esquecer de voltar ao contribuinte.

**Enunciado EARS *(1 padrão)*:** QUANDO chega a data de um follow-up, o sistema DEVE notificar o atendente responsável.

**Atores:** Atendente
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Lembrete no dia
  Dado um follow-up para hoje
  Quando o dia começa
  Então o atendente recebe a notificação
Cenário 2: Follow-up reagendado
  Dado um follow-up para amanhã
  Quando o atendente muda para a próxima semana
  Então a notificação acontece na nova data
Cenário 3: Data no passado
  Dado um caso
  Quando o atendente agenda follow-up para ontem
  Então o sistema recusa e mostra «A data do follow-up deve ser hoje ou futura»
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-QUALIFICADA-01
**Rastreabilidade:** F-091
**Notas:** promove RF-040 do Explore.

---

### RF-MOD-QUALIFICADA-07: Reatribuir casos

**Épico:** Cobrança Qualificada
**Funcionalidade:** Reatribuir casos

**Descrição (User Story):**
Como coordenador,
quero mudar o atendente de um caso,
para cobrir férias e ajustar a carga.

**Enunciado EARS *(1 padrão)*:** QUANDO o coordenador reatribui um caso, o sistema DEVE transferi-lo ao novo atendente e registrar a mudança.

**Atores:** Coordenador
**Prioridade MoSCoW:** Could
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Reatribuição
  Dado um caso do atendente A
  Quando o coordenador o transfere para B
  Então ele sai da fila de A e entra na de B
Cenário 2: Reatribuição em lote
  Dado 20 casos de um atendente em férias
  Quando o coordenador os transfere de uma vez
  Então os 20 mudam e cada mudança é registrada
Cenário 3: Atendente comum tenta reatribuir
  Dado um atendente
  Quando tenta transferir um caso
  Então o sistema recusa
```

**Regras de Negócio aplicáveis:** RN-NOVO-CQ-001, RN-NOVO-CQ-002
**Dependências:** RF-MOD-QUALIFICADA-02
**Rastreabilidade:** F-092
**Notas:** promove RF-041 do Explore.

---

## Módulo: Monitoramento e KPIs (`MOD-MONITORAMENTO`)

### RF-MOD-MONITORAMENTO-01: Marcar notificado e regularizado

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Marcar notificado e regularizado

**Descrição (User Story):**
Como sistema,
quero marcar o andamento de cada item da carteira,
para os indicadores contarem direto das tabelas.

**Enunciado EARS *(1 padrão)*:** QUANDO uma comunicação é enviada ou uma interação é registrada, o sistema DEVE marcar o item da carteira como notificado.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Notificado por comunicação
  Dado um item da massificada
  Quando a primeira comunicação é enviada
  Então o item fica notificado
Cenário 2: Notificado por interação
  Dado um item da qualificada
  Quando o atendente registra o primeiro contato
  Então o item fica notificado
Cenário 3: Item do grupo de controle
  Dado um item de controle
  Quando o ciclo corre
  Então ele nunca fica notificado
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-004
**Dependências:** RF-MOD-REGUAS-05
**Rastreabilidade:** F-096, F-006, F-027
**Notas:** promove RF-042 do Explore.

---

### RF-MOD-MONITORAMENTO-02: Atribuir a origem da regularização

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Atribuir a origem da regularização

**Descrição (User Story):**
Como sistema,
quero saber se a regularização veio da cobrança,
para medir o efeito da cobrança.

**Enunciado EARS *(1 padrão)*:** QUANDO uma regularização é registrada, o sistema DEVE classificá-la como espontânea ou resposta à cobrança, com canal e instrumento.

**Atores:** Sistema
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Resposta à cobrança
  Dado um SMS entregue há 12 dias
  Quando o débito é regularizado
  Então a origem é «Resposta à cobrança», canal SMS
Cenário 2: Espontânea
  Dado nenhum contato nos últimos 30 dias
  Quando o débito é regularizado
  Então a origem é «Espontânea»
Cenário 3: Grupo de controle
  Dado um item do grupo de controle
  Quando ele regulariza
  Então a origem é sempre «Espontânea»
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-001, RN-NOVO-MON-003
**Dependências:** RF-MOD-MONITORAMENTO-01
**Rastreabilidade:** F-097
**Notas:** promove RF-043 do Explore.

---

### RF-MOD-MONITORAMENTO-03: Indicadores de funil

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Indicadores de funil

**Descrição (User Story):**
Como coordenador,
quero ver o funil do ciclo,
para acompanhar a recuperação.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE calcular identificados, notificados, regularizados e crédito recuperado, por tributo.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Funil do ciclo
  Dado a carteira de junho
  Quando o coordenador abre o painel
  Então vê identificados, notificados, regularizados e crédito recuperado
Cenário 2: Recorte por tributo
  Dado o painel
  Quando o coordenador filtra ITCD
  Então o funil mostra só ITCD
Cenário 3: Ciclo sem carteira
  Dado um ciclo sem carteira confirmada
  Quando o painel é aberto
  Então o funil mostra só os identificados e o aviso «Sem carteira confirmada no ciclo»
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-004
**Dependências:** RF-MOD-MONITORAMENTO-01
**Rastreabilidade:** F-098, F-028
**Notas:** promove RF-044 do Explore.

---

### RF-MOD-MONITORAMENTO-04: Efeito incremental

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Efeito incremental

**Descrição (User Story):**
Como coordenador,
quero comparar a carteira cobrada com o grupo de controle,
para provar o efeito da cobrança.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE calcular a taxa de regularização da carteira cobrada, a do grupo de controle e a diferença em pontos percentuais.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Efeito positivo
  Dado taxa cobrada de 30,8% e de controle de 21,4%
  Quando o painel calcula
  Então mostra efeito incremental de +9,4 p.p.
Cenário 2: Por tributo
  Dado o painel
  Quando o coordenador filtra IPVA
  Então o efeito é calculado só com itens de IPVA
Cenário 3: Controle vazio
  Dado um ciclo sem grupo de controle
  Quando o painel calcula
  Então o efeito aparece como «Indisponível — sem grupo de controle»
```

**Regras de Negócio aplicáveis:** RN-NOVO-QUA-003, RN-NOVO-MON-003, RN-NOVO-MON-005
**Dependências:** RF-MOD-QUALIFICACAO-05
**Rastreabilidade:** F-099
**Notas:** promove RF-045 do Explore.

---

### RF-MOD-MONITORAMENTO-05: Retorno das réguas

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Retorno das réguas

**Descrição (User Story):**
Como coordenador,
quero saber quanto as réguas trazem de pagamento,
para ajustar canais e etapas.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE calcular a parcela das comunicações enviadas que resultaram em pagamento em até 30 dias, por canal e tributo.

**Atores:** Coordenador
**Prioridade MoSCoW:** Could
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Retorno por canal
  Dado 1.000 e-mails enviados e 52 pagos em até 30 dias
  Quando o painel calcula
  Então mostra 5,2% para e-mail
Cenário 2: Janela em aberto
  Dado comunicações enviadas há 10 dias
  Quando o painel calcula
  Então elas contam como em observação
Cenário 3: Sem envio
  Dado um canal sem envios no ciclo
  Quando o painel calcula
  Então o retorno aparece como «—»
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-003
**Dependências:** RF-MOD-MONITORAMENTO-02
**Rastreabilidade:** F-100
**Notas:** promove RF-046 do Explore.

---

### RF-MOD-MONITORAMENTO-06: Realizado × meta

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Realizado × meta

**Descrição (User Story):**
Como coordenador,
quero comparar o realizado com a meta por tributo,
para saber onde a cobrança está abaixo do esperado.

**Enunciado EARS *(1 padrão)*:** SE a taxa realizada de um tributo fica abaixo da meta do ciclo, ENTÃO o sistema DEVE mostrar alerta de meta não atingida.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Meta não atingida
  Dado meta de 32% no ICMS Normal e realizado de 29,6%
  Quando o painel é aberto
  Então aparece alerta com −2,4 p.p.
Cenário 2: Meta atingida
  Dado meta de 45% no IPVA e realizado de 51,2%
  Quando o painel é aberto
  Então aparece +6,2 p.p. sem alerta
Cenário 3: Sem meta cadastrada
  Dado um tributo sem meta no ciclo
  Quando o painel é aberto
  Então a coluna meta mostra «Sem meta»
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-MONITORAMENTO-03
**Rastreabilidade:** F-101
**Notas:** promove RF-047 do Explore.

---

### RF-MOD-MONITORAMENTO-07: Painel Institucional

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Painel Institucional

**Descrição (User Story):**
Como coordenador,
quero ver os indicadores do ciclo num painel,
para prestar contas e decidir.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE mostrar ao coordenador o Painel Institucional com funil, KPIs com variação, tendência cobrada × controle e tabela por tributo com meta.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Painel completo
  Dado indicadores do ciclo
  Quando o coordenador abre o painel
  Então vê funil, KPIs, tendência e tabela por tributo
Cenário 2: Filtro de ciclo
  Dado o painel
  Quando o coordenador escolhe o ciclo de maio
  Então todos os indicadores mostram maio
Cenário 3: Atendente
  Dado um atendente
  Quando tenta abrir o painel
  Então o sistema nega o acesso
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-002, RN-NOVO-MON-004
**Dependências:** RF-MOD-MONITORAMENTO-03
**Rastreabilidade:** F-102
**Notas:** promove RF-048 do Explore.

---

### RF-MOD-MONITORAMENTO-08: Regularizações por origem

**Épico:** Monitoramento e KPIs
**Funcionalidade:** Regularizações por origem

**Descrição (User Story):**
Como coordenador,
quero listar as regularizações por origem,
para conferir o que veio da cobrança.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE listar as regularizações com filtros por origem, canal, instrumento e tributo.

**Atores:** Coordenador
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Lista filtrada
  Dado regularizações do ciclo
  Quando o coordenador filtra «Resposta à cobrança» por WhatsApp
  Então vê só essas
Cenário 2: Exportação
  Dado a lista filtrada
  Quando o coordenador exporta
  Então a exportação é registrada
Cenário 3: Sem regularização
  Dado um filtro sem resultado
  Quando é aplicado
  Então aparece «Nenhuma regularização para os filtros»
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-001, RN-NOVO-GOV-002
**Dependências:** RF-MOD-MONITORAMENTO-02
**Rastreabilidade:** F-103
**Notas:** promove RF-049 do Explore.

---

## Módulo: Governança, Acesso e Auditoria (`MOD-GOVERNANCA`)

### RF-MOD-GOVERNANCA-01: Controlar acesso por papel

**Épico:** Governança, Acesso e Auditoria
**Funcionalidade:** Controlar acesso por papel

**Descrição (User Story):**
Como admin,
quero aplicar as permissões de cada papel,
para cada pessoa ver só o que lhe cabe.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE avaliar a permissão do papel do usuário em cada consulta e gravação de dado.

**Atores:** Admin
**Prioridade MoSCoW:** Must
**Complexidade:** Alta

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Coordenador
  Dado um coordenador
  Quando consulta a carteira
  Então vê todos os contribuintes
Cenário 2: Auditor
  Dado um auditor
  Quando abre uma versão de critérios
  Então lê, mas não consegue editar
Cenário 3: Acesso direto pelo endereço
  Dado um gestor de integração
  Quando tenta abrir um caso pelo endereço do registro
  Então o sistema nega o acesso
```

**Regras de Negócio aplicáveis:** RN-NOVO-ING-008, RN-NOVO-GOV-001
**Dependências:** —
**Rastreabilidade:** F-108, F-007, F-031
**Notas:** promove RF-050 do Explore.

---

### RF-MOD-GOVERNANCA-02: Isolar a visão do atendente

**Épico:** Governança, Acesso e Auditoria
**Funcionalidade:** Isolar a visão do atendente

**Descrição (User Story):**
Como atendente,
quero ver só meus casos e os contribuintes deles,
para proteger os dados dos demais.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE limitar o atendente aos casos atribuídos a ele e aos dados dos contribuintes desses casos.

**Atores:** Atendente
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Contribuinte do meu caso
  Dado um caso atribuído ao atendente
  Quando ele abre o contribuinte
  Então vê os dados
Cenário 2: Caso reatribuído
  Dado um caso que saiu da fila do atendente
  Quando ele tenta abrir de novo
  Então não tem mais acesso
Cenário 3: Busca de outro contribuinte
  Dado um contribuinte sem caso do atendente
  Quando ele busca pelo CNPJ
  Então não encontra
```

**Regras de Negócio aplicáveis:** RN-NOVO-MON-002, RN-NOVO-GOV-001
**Dependências:** RF-MOD-GOVERNANCA-01
**Rastreabilidade:** F-109
**Notas:** promove RF-051 do Explore.

---

### RF-MOD-GOVERNANCA-03: Mascarar CPF e restringir exportação

**Épico:** Governança, Acesso e Auditoria
**Funcionalidade:** Mascarar CPF e restringir exportação

**Descrição (User Story):**
Como coordenador,
quero proteger o CPF e controlar exportações,
para cumprir a LGPD.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE mostrar o CPF de pessoa física mascarado por padrão e permitir exportação só a papéis autorizados.

**Atores:** Coordenador
**Prioridade MoSCoW:** Must
**Complexidade:** Média

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: CPF mascarado
  Dado um contribuinte pessoa física
  Quando qualquer papel abre o formulário
  Então vê o CPF mascarado
Cenário 2: Exportação autorizada
  Dado um coordenador
  Quando exporta a carteira
  Então o arquivo é gerado e a exportação fica registrada
Cenário 3: Exportação negada
  Dado um atendente
  Quando tenta exportar a fila
  Então o sistema recusa
```

**Regras de Negócio aplicáveis:** RN-NOVO-GOV-002
**Dependências:** RF-MOD-GOVERNANCA-01
**Rastreabilidade:** F-110
**Notas:** promove RF-052 do Explore.

---

### RF-MOD-GOVERNANCA-04: Auditar ações e parâmetros

**Épico:** Governança, Acesso e Auditoria
**Funcionalidade:** Auditar ações e parâmetros

**Descrição (User Story):**
Como auditor,
quero ver o histórico das alterações,
para verificar quem mudou o quê.

**Enunciado EARS *(1 padrão)*:** QUANDO um parâmetro, meta ou faixa de score é alterado, o sistema DEVE gravar valor anterior, valor novo, autor e vigência.

**Atores:** Auditor
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Alteração de parâmetro
  Dado o percentual do grupo de controle em 3%
  Quando o admin muda para 5%
  Então a auditoria registra 3% → 5%, autor e data
Cenário 2: Alteração de meta
  Dado a meta do IPVA
  Quando o admin a altera
  Então a alteração aparece no histórico
Cenário 3: Tentativa de apagar evento
  Dado um evento de auditoria
  Quando qualquer papel tenta excluir
  Então o sistema recusa
```

**Regras de Negócio aplicáveis:** RN-NOVO-CQ-002, RN-NOVO-GOV-003
**Dependências:** RF-MOD-GOVERNANCA-01
**Rastreabilidade:** F-111
**Notas:** promove RF-053 do Explore.

---

### RF-MOD-GOVERNANCA-05: Administrar parâmetros, faixas e metas

**Épico:** Governança, Acesso e Auditoria
**Funcionalidade:** Administrar parâmetros, faixas e metas

**Descrição (User Story):**
Como admin,
quero manter os parâmetros da cobrança,
para ajustar a operação sem desenvolvimento.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE permitir ao admin manter os parâmetros gerais, as faixas de score e as metas por tributo e ciclo.

**Atores:** Admin
**Prioridade MoSCoW:** Should
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Parâmetro alterado
  Dado o parâmetro «janela de atribuição» em 30 dias
  Quando o admin muda para 45
  Então as próximas atribuições usam 45 dias
Cenário 2: Meta nova
  Dado o ciclo de julho sem meta
  Quando o admin cadastra meta de 32% para ICMS Normal
  Então o painel passa a comparar com 32%
Cenário 3: Valor fora do limite
  Dado o parâmetro do grupo de controle
  Quando o admin informa 60%
  Então o sistema recusa e mostra «O percentual deve ficar entre 1% e 20%»
```

**Regras de Negócio aplicáveis:** —
**Dependências:** RF-MOD-GOVERNANCA-01
**Rastreabilidade:** F-112
**Notas:** promove RF-054 do Explore.

---

### RF-MOD-GOVERNANCA-06: Consultar auditoria

**Épico:** Governança, Acesso e Auditoria
**Funcionalidade:** Consultar auditoria

**Descrição (User Story):**
Como auditor,
quero consultar versões, eventos e histórico,
para auditar a operação.

**Enunciado EARS *(1 padrão)*:** O sistema DEVE permitir ao auditor ler versões de critérios, eventos de auditoria e histórico, sem escrita.

**Atores:** Auditor
**Prioridade MoSCoW:** Could
**Complexidade:** Baixa

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: Consulta
  Dado eventos do último mês
  Quando o auditor filtra por usuário
  Então vê os eventos desse usuário
Cenário 2: Versões
  Dado as versões de critérios
  Quando o auditor abre a versão 3
  Então vê critérios, fundamentação e quem publicou
Cenário 3: Tentativa de editar
  Dado um auditor
  Quando tenta editar qualquer registro
  Então o sistema recusa
```

**Regras de Negócio aplicáveis:** RN-NOVO-GOV-003
**Dependências:** RF-MOD-GOVERNANCA-04
**Rastreabilidade:** F-113
**Notas:** promove RF-055 do Explore.

---

<!-- id: reqfun-integrations -->

## Integrações negociais *(opcional)*

| Sistema / fonte institucional | Finalidade para o processo | Efeito observável para o ator | RF relacionados |
|-------------------------------|----------------------------|-------------------------------|-----------------|
| Conta Corrente Fiscal, MPI, Big Data, IPVA, ITCD, SNE/DT-e | enviar os débitos, parcelamentos e sinalizações do dia | a carteira mostra a posição atualizada de cada contribuinte | RF-MOD-INGESTAO-01 a 12 |
| UFMT (modelo de score) | enviar o score de liquidez por lote | a fila e a carteira passam a considerar o score | RF-MOD-SCORE-01 a 03 |
| Provedor de e-mail, SMS e WhatsApp | entregar as mensagens das réguas e devolver o status | o coordenador vê o que foi entregue e o que falhou | RF-MOD-REGUAS-05 a 07 |

<!-- id: rnf -->

## Requisitos Não Funcionais (negócio)

> Os valores-alvo abaixo são **propostas desta simulação**, derivadas dos volumes das fontes; a
> Coordenação e a TI precisam validá-los (QA-02).

### RNF-DES-001: Consolidação dentro da janela do ciclo

**Categoria (ISO 25010):** Desempenho
**Prioridade MoSCoW:** Must
**Módulo principal *(opcional)*:** MOD-INGESTAO

**Declaração:** A base de cerca de 1,8 milhão de contribuintes precisa estar consolidada antes do início do trabalho do dia.

**Cenário (6 partes):**
- Fonte do estímulo: Sistemas parceiros
- Estímulo: fechamento do ciclo diário com as seis fontes
- Ambiente: operação normal, volume de cerca de 1,8 milhão de contribuintes
- Artefato: consolidação por contribuinte e posição por tributo
- Resposta: posição atualizada de todos os contribuintes com débito recebido
- Medida da resposta *(numérica — obrigatória)*: ≤ 4 horas entre o último horário-limite das fontes e o fim da consolidação

**Métrica mensurável:**
- Indicador: Tempo de consolidação do ciclo
- Valor alvo: ≤ 4 horas
- Condições: carga diária completa das seis fontes

**Critério de aceite:** Em 5 ciclos consecutivos com lotes simulados de volume real, a consolidação termina em até 4 horas

**Método de verificação:** Teste com o kit de lotes simulados

**Rastreabilidade:** F-183, F-133
**Vinculado a:** RF-MOD-INGESTAO-03, QA-02

---

### RNF-DES-002: Envio diário das comunicações

**Categoria (ISO 25010):** Desempenho
**Prioridade MoSCoW:** Must
**Módulo principal *(opcional)*:** MOD-REGUAS

**Declaração:** As comunicações devidas no dia precisam sair no mesmo dia, para a cadência da régua valer.

**Cenário (6 partes):**
- Fonte do estímulo: Processamento diário das réguas
- Estímulo: cerca de 22 mil comunicações devidas no dia
- Ambiente: operação normal, provedores disponíveis
- Artefato: camada de envio por canal
- Resposta: todas as comunicações devidas enviadas ao provedor
- Medida da resposta *(numérica — obrigatória)*: 100% das comunicações devidas entregues ao provedor em até 6 horas do início do processamento

**Métrica mensurável:**
- Indicador: Comunicações devidas enviadas no dia
- Valor alvo: 100% em até 6 horas
- Condições: 22 mil comunicações por dia

**Critério de aceite:** Em teste com 22 mil comunicações simuladas, todas chegam ao provedor em até 6 horas

**Método de verificação:** Teste de volume

**Rastreabilidade:** F-150
**Vinculado a:** RF-MOD-REGUAS-02, RF-MOD-REGUAS-05

---

### RNF-CON-001: Fonte em falha não interrompe o ciclo

**Categoria (ISO 25010):** Confiabilidade
**Prioridade MoSCoW:** Must
**Módulo principal *(opcional)*:** MOD-INGESTAO

**Declaração:** Uma fonte fora do ar não pode impedir a consolidação das demais.

**Cenário (6 partes):**
- Fonte do estímulo: Uma fonte de débitos
- Estímulo: não entrega o lote até o horário-limite
- Ambiente: ciclo diário em andamento
- Artefato: fechamento do ciclo
- Resposta: as demais fontes são consolidadas e a fonte com falha mantém a última carga válida
- Medida da resposta *(numérica — obrigatória)*: 100% das fontes que entregaram consolidadas no ciclo, com alerta em até 15 minutos após o horário-limite

**Métrica mensurável:**
- Indicador: Fontes consolidadas com uma em falha
- Valor alvo: 100% das que entregaram; alerta ≤ 15 min
- Condições: simulação de falha de uma fonte

**Critério de aceite:** Em teste com uma fonte sem entrega, as outras cinco são consolidadas e o alerta chega em até 15 minutos

**Método de verificação:** Teste de falha simulada

**Rastreabilidade:** F-133
**Vinculado a:** RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06

---

### RNF-SEG-001: Acesso restrito ao papel

**Categoria (ISO 25010):** Segurança
**Prioridade MoSCoW:** Must
**Módulo principal *(opcional)*:** MOD-GOVERNANCA

**Declaração:** Cada papel vê e altera só o que a matriz de acesso permite.

**Cenário (6 partes):**
- Fonte do estímulo: Usuário de qualquer um dos 5 papéis
- Estímulo: tenta ler ou alterar dado fora da sua permissão, inclusive pelo endereço direto do registro
- Ambiente: operação normal
- Artefato: dados da aplicação
- Resposta: o acesso é negado
- Medida da resposta *(numérica — obrigatória)*: 0 acessos indevidos em teste com os 5 papéis sobre todos os grupos de tabelas

**Métrica mensurável:**
- Indicador: Acessos indevidos em teste
- Valor alvo: 0
- Condições: roteiro de teste por papel × grupo de tabelas

**Critério de aceite:** O roteiro de teste por papel não encontra nenhum acesso fora da matriz

**Método de verificação:** Teste de permissões por papel

**Rastreabilidade:** F-017, F-158
**Vinculado a:** RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-02

---

### RNF-SEG-002: Opt-out respeitado na hora

**Categoria (ISO 25010):** Segurança
**Prioridade MoSCoW:** Must
**Módulo principal *(opcional)*:** MOD-REGUAS

**Declaração:** Quem retira o consentimento não recebe mais mensagem naquele canal.

**Cenário (6 partes):**
- Fonte do estímulo: Contribuinte
- Estímulo: registra opt-out em um canal
- Ambiente: régua ativa com etapa devida no mesmo dia
- Artefato: verificação de consentimento
- Resposta: nenhuma comunicação é enviada no canal após o registro
- Medida da resposta *(numérica — obrigatória)*: 0 comunicações enviadas no canal após o opt-out

**Métrica mensurável:**
- Indicador: Envios após opt-out
- Valor alvo: 0
- Condições: teste com opt-out registrado antes do processamento

**Critério de aceite:** Nenhuma comunicação sai no canal depois do opt-out

**Método de verificação:** Teste de régua com opt-out

**Rastreabilidade:** F-188
**Vinculado a:** RF-MOD-REGUAS-04

---

### RNF-USA-001: Acessibilidade das telas nativas

**Categoria (ISO 25010):** Usabilidade
**Prioridade MoSCoW:** Should
**Módulo principal *(opcional)*:** MOD-GOVERNANCA

**Declaração:** As telas e os painéis seguem o nível AA de acessibilidade, em português do Brasil.

**Cenário (6 partes):**
- Fonte do estímulo: Usuário interno
- Estímulo: usa listas, formulários e painéis
- Ambiente: navegador corporativo
- Artefato: telas nativas e dashboards
- Resposta: todas as telas em português do Brasil, navegáveis por teclado
- Medida da resposta *(numérica — obrigatória)*: 0 erros críticos de acessibilidade na verificação automática das 14 telas

**Métrica mensurável:**
- Indicador: Erros críticos de acessibilidade
- Valor alvo: 0
- Condições: verificação automática nas 14 telas

**Critério de aceite:** A verificação automática não aponta erro crítico em nenhuma tela

**Método de verificação:** Verificação automática de acessibilidade

**Rastreabilidade:** F-008
**Vinculado a:** RF-MOD-MONITORAMENTO-07

---

### RNF-CON-002: Painéis atualizados a cada dia

**Categoria (ISO 25010):** Confiabilidade
**Prioridade MoSCoW:** Should
**Módulo principal *(opcional)*:** MOD-MONITORAMENTO

**Declaração:** Os indicadores do dia anterior precisam estar disponíveis no início do expediente.

**Cenário (6 partes):**
- Fonte do estímulo: Coleta agendada dos indicadores
- Estímulo: fechamento do ciclo do dia anterior
- Ambiente: operação normal
- Artefato: Painel Institucional e Painel do Score
- Resposta: indicadores atualizados com os dados do ciclo anterior
- Medida da resposta *(numérica — obrigatória)*: coleta concluída até 08:00 em 95% dos dias úteis do mês

**Métrica mensurável:**
- Indicador: Dias com coleta concluída até 08:00
- Valor alvo: ≥ 95%
- Condições: dias úteis do mês

**Critério de aceite:** Em um mês de operação assistida, a coleta termina até 08:00 em pelo menos 95% dos dias úteis

**Método de verificação:** Acompanhamento da coleta

**Rastreabilidade:** F-147
**Vinculado a:** RF-MOD-MONITORAMENTO-07, RF-MOD-SCORE-04

---

<!-- id: rf-rnf-matrix -->

## Matriz RF ↔ RNF

| RF | Título | Módulo | RNFs impactados |
|----|--------|--------|-----------------|
| RF-MOD-INGESTAO-01 | Receber débitos das fontes | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-02 | Validar o documento do contribuinte | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-03 | Consolidar débitos por contribuinte | MOD-INGESTAO | RNF-DES-001 |
| RF-MOD-INGESTAO-04 | Evitar duplicidade no reenvio | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-05 | Fechar o ciclo diário e acompanhar as fontes | MOD-INGESTAO | RNF-CON-001 |
| RF-MOD-INGESTAO-06 | Seguir operando com fonte em falha | MOD-INGESTAO | RNF-CON-001 |
| RF-MOD-INGESTAO-07 | Carga inicial e reconciliação | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-08 | Reprocessar registros rejeitados | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-09 | Atualizar a regularização durante o ciclo | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-10 | Alertar parcelamento em risco | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-11 | Transição MPI → Big Data | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-12 | Receber sinalização coercitiva | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-13 | Visão única do contribuinte | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-14 | Carteira consolidada | MOD-INGESTAO | — |
| RF-MOD-INGESTAO-15 | Simular cargas das fontes | MOD-INGESTAO | — |
| RF-MOD-QUALIFICACAO-01 | Parametrizar critérios da carteira | MOD-QUALIFICACAO | — |
| RF-MOD-QUALIFICACAO-02 | Versionar critérios | MOD-QUALIFICACAO | — |
| RF-MOD-QUALIFICACAO-03 | Simular a carteira | MOD-QUALIFICACAO | — |
| RF-MOD-QUALIFICACAO-04 | Segmentar massificada × qualificada | MOD-QUALIFICACAO | — |
| RF-MOD-QUALIFICACAO-05 | Sortear o grupo de controle | MOD-QUALIFICACAO | — |
| RF-MOD-QUALIFICACAO-06 | Confirmar a carteira | MOD-QUALIFICACAO | — |
| RF-MOD-SCORE-01 | Receber o score da UFMT | MOD-SCORE | — |
| RF-MOD-SCORE-02 | Classificar o score em faixas | MOD-SCORE | — |
| RF-MOD-SCORE-03 | Operar sem score | MOD-SCORE | — |
| RF-MOD-SCORE-04 | Painel do Score | MOD-SCORE | RNF-CON-002 |
| RF-MOD-REGUAS-01 | Montar a régua | MOD-REGUAS | — |
| RF-MOD-REGUAS-02 | Enviar a etapa devida | MOD-REGUAS | RNF-DES-002 |
| RF-MOD-REGUAS-03 | Escalonar e encaminhar | MOD-REGUAS | — |
| RF-MOD-REGUAS-04 | Respeitar o consentimento | MOD-REGUAS | RNF-SEG-002 |
| RF-MOD-REGUAS-05 | Enviar por canal | MOD-REGUAS | RNF-DES-002 |
| RF-MOD-REGUAS-06 | Receber o status de entrega | MOD-REGUAS | — |
| RF-MOD-REGUAS-07 | Reenviar falhas | MOD-REGUAS | — |
| RF-MOD-REGUAS-08 | Pausar e retomar a régua | MOD-REGUAS | — |
| RF-MOD-REGUAS-09 | Acompanhar a execução | MOD-REGUAS | — |
| RF-MOD-QUALIFICADA-01 | Criar casos | MOD-QUALIFICADA | — |
| RF-MOD-QUALIFICADA-02 | Distribuir casos | MOD-QUALIFICADA | — |
| RF-MOD-QUALIFICADA-03 | Fila priorizada | MOD-QUALIFICADA | — |
| RF-MOD-QUALIFICADA-04 | Dossiê do caso | MOD-QUALIFICADA | — |
| RF-MOD-QUALIFICADA-05 | Registrar interação | MOD-QUALIFICADA | — |
| RF-MOD-QUALIFICADA-06 | Follow-up com lembrete | MOD-QUALIFICADA | — |
| RF-MOD-QUALIFICADA-07 | Reatribuir casos | MOD-QUALIFICADA | — |
| RF-MOD-MONITORAMENTO-01 | Marcar notificado e regularizado | MOD-MONITORAMENTO | — |
| RF-MOD-MONITORAMENTO-02 | Atribuir a origem da regularização | MOD-MONITORAMENTO | — |
| RF-MOD-MONITORAMENTO-03 | Indicadores de funil | MOD-MONITORAMENTO | — |
| RF-MOD-MONITORAMENTO-04 | Efeito incremental | MOD-MONITORAMENTO | — |
| RF-MOD-MONITORAMENTO-05 | Retorno das réguas | MOD-MONITORAMENTO | — |
| RF-MOD-MONITORAMENTO-06 | Realizado × meta | MOD-MONITORAMENTO | — |
| RF-MOD-MONITORAMENTO-07 | Painel Institucional | MOD-MONITORAMENTO | RNF-USA-001, RNF-CON-002 |
| RF-MOD-MONITORAMENTO-08 | Regularizações por origem | MOD-MONITORAMENTO | — |
| RF-MOD-GOVERNANCA-01 | Controlar acesso por papel | MOD-GOVERNANCA | RNF-SEG-001 |
| RF-MOD-GOVERNANCA-02 | Isolar a visão do atendente | MOD-GOVERNANCA | RNF-SEG-001 |
| RF-MOD-GOVERNANCA-03 | Mascarar CPF e restringir exportação | MOD-GOVERNANCA | — |
| RF-MOD-GOVERNANCA-04 | Auditar ações e parâmetros | MOD-GOVERNANCA | — |
| RF-MOD-GOVERNANCA-05 | Administrar parâmetros, faixas e metas | MOD-GOVERNANCA | — |
| RF-MOD-GOVERNANCA-06 | Consultar auditoria | MOD-GOVERNANCA | — |

<!-- id: reqfun-open-questions -->

## Questões em aberto

| QA | Descrição | Onde aparece | Sugestão de tratamento |
|----|-----------|---------------|-------------------------|
| QA-01 | Desempate entre massificada e qualificada para quem atende aos dois critérios | RF-MOD-QUALIFICACAO-04 | Coordenação decide (gaps.md GAP-007) |
| QA-02 | Valores-alvo dos RNF de desempenho e confiabilidade são propostas desta simulação | RNF-DES-001, RNF-DES-002, RNF-CON-001, RNF-CON-002 | Validar com a Coordenação e a TI |
| QA-03 | Atribuição de origem quando há contato por mais de um canal na janela | RF-MOD-MONITORAMENTO-02 | Validar com a Coordenação (GAP-008) |
| QA-04 | Fonte da lista de contumazes: CCF ou Credep | RF-MOD-QUALIFICACAO-01 | TI confirma (GAP-017) |
