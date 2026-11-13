# Discovery — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Fontes: outputs/explore/ (pré-projeto do Explore), inputs/especificacoes/etf-cobranca-inteligente.pdf, inputs/especificacoes/wiki-cobranca-refined/, inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx, inputs/prototipo/prototipo-cobranca-v3.html (só intenção). Todos os fatos citados estão em `outputs/spec/context-map.md`.

<!-- id: dd-problem -->

## 1. Problema Central

A cobrança administrativa do crédito tributário da SEFAZ-MT depende de débitos espalhados em vários
sistemas (CCF, MPI, IPVA, ITCD, SNE) e em planilhas, sem uma visão única do contribuinte (F-194).
A coordenação escolhe quem cobrar de forma empírica, distribui o trabalho por planilha e dispara
mensagens com confirmação manual em lote (F-189, F-190, F-192). Como o status só é atualizado numa
foto mensal e o grupo de controle é sorteado à mão, a equipe corre o risco de cobrar quem já pagou e
não consegue medir quanto a cobrança realmente recupera (F-193, F-195).

<!-- id: dd-context -->

## 2. Contexto de Negócio

- **Por que agora:** depois de 11 meses de diagnóstico e redesenho dos 7 produtos do programa, começa
  a etapa de implementação e capacitação, de 7 meses (F-164). O ServiceNow foi confirmado como
  plataforma (F-165), e o plano prevê construção de dezembro de 2026 a abril de 2027 (F-170).
- **Quem é afetado:** a Coordenação de Cobrança (CPRF) e os atendentes de cobrança (F-010, F-011),
  numa base de cerca de 1,8 milhão de contribuintes (F-183).
- **Tamanho do problema:** a quitação histórica é de cerca de 30,9% no ICMS Normal e 22,5% no ICMS
  ST (F-184); réguas de referência retornam cerca de 5,15% em até 30 dias (F-185). As fontes não
  trazem o custo atual da operação manual.
- **Restrições já decididas:** telas nativas do ServiceNow, sem interface customizada (F-008, F-136);
  integração ponta a ponta com os parceiros fora do escopo, com testes por lotes simulados (F-140);
  modelo de score e dívida ativa fora do produto (F-009, F-200).

<!-- id: dd-stakeholders -->

## 3. Atores e Stakeholders

| Ator | Papel | Interesse principal | Poder de decisão | Fonte |
|------|-------|---------------------|------------------|-------|
| Coordenação de Cobrança (CPRF) | dona do produto | seleção auditável, réguas automáticas, indicadores e efeito da cobrança | alto | F-010, F-172 |
| Atendentes de cobrança | usuários-chave | dossiê completo e fila priorizada, sem consultar vários sistemas | médio | F-011, F-173, F-194 |
| Gestor de Integração | operação das cargas | saber se cada fonte entregou e corrigir rejeições | médio | F-012 |
| Auditor | controle | rastreio de versões e ações | baixo | F-013 |
| Administrador da aplicação | configuração | manter parâmetros, faixas e metas | baixo | F-014 |
| TI SEFAZ-MT | dona das integrações | disponibilizar APIs, acessos e ambientes | alto | F-166, F-175 |
| UFMT | parceira do score | fornecer o score de liquidez | médio | F-123, F-200 |
| SQUAD Cobrança e EloGroup | construção e homologação | entregar e homologar com evidências | médio | F-174 |
| Contribuinte | destinatário das comunicações | receber mensagens adequadas e respeitar o consentimento | baixo | F-016, F-188 |

<!-- id: dd-requests -->

## 4. O que o cliente pediu (linguagem bruta)

| # | O que foi pedido (linguagem do cliente) | Ator que pediu | Origem (F-xxx) |
|---|----------------------------------------|----------------|----------------|
| 1 | Consolidar automaticamente os débitos de todas as fontes numa visão única do contribuinte | Coordenação de Cobrança | F-001, F-032 a F-046, F-167 |
| 2 | Não abordar quem já regularizou: atualizar o status durante o ciclo e encerrar caso e régua | Atendentes | F-040, F-048, F-195 |
| 3 | Alertar parcelamento com parcela vencida | Coordenação de Cobrança | F-041 |
| 4 | Qualificar a carteira por critérios parametrizáveis, versionados e auditáveis, com prévia antes de publicar | Coordenação de Cobrança | F-002, F-055 a F-060, F-189 |
| 5 | Separar a carteira em massificada e qualificada e sortear o grupo de controle | Coordenação de Cobrança | F-058, F-059, F-193 |
| 6 | Usar o score de liquidez da UFMT, com critérios determinísticos quando ele faltar | Coordenação de Cobrança | F-003, F-067 a F-071 |
| 7 | Réguas automáticas por e-mail, SMS e WhatsApp, sem confirmação manual, respeitando o consentimento | Coordenação de Cobrança | F-004, F-072 a F-080, F-192 |
| 8 | Criar e distribuir automaticamente os casos da qualificada numa fila priorizada, sem planilha | Coordenação de Cobrança | F-005, F-086 a F-088, F-190 |
| 9 | Dossiê do contribuinte e registro de interações e follow-ups por caso | Atendentes | F-089 a F-091, F-196 |
| 10 | Painéis com funil, efeito incremental contra o grupo de controle e realizado × meta | Coordenação de Cobrança | F-006, F-096 a F-103, F-191 |
| 11 | Marcar a origem de cada regularização: espontânea ou resposta à cobrança | Coordenação de Cobrança | F-097, F-104, F-152 |
| 12 | Acesso por papel, atendente vendo só os próprios casos, CPF mascarado e auditoria das ações | Coordenação de Cobrança | F-007, F-108 a F-116 |
| 13 | Cobrança ativa por telefone, com lista de ligações distribuída entre atendentes (sugestão do protótipo, não está na ETF) | Coordenação de Cobrança (protótipo v3) | INF-001 |

<!-- id: dd-existing-systems -->

## 5. Sistemas Existentes (candidatos a AS-IS)

O kickoff declarou **sem legado**: não há sistema de cobrança a substituir por migração. Os sistemas
abaixo continuam existindo e passam a **alimentar** o produto, ou são o processo manual que ele
substitui.

- **Fontes de dados que continuam:** Conta Corrente Fiscal, MPI (em descontinuação, rumo ao Big Data
  P2.2), Sistema IPVA, GIA-ITCD, SNE/DT-e e o modelo de score da UFMT (F-117 a F-123, F-161).
- **Cadastros com API pronta:** B-Cadastro, Cadastro de Contadores e SSO (F-126, F-180).
- **Credep:** onde a TI diz que fica o controle de contumazes (F-178).
- **Processo manual a substituir:** planilhas e Google Drive para distribuir a carteira, consulta
  manual a CCF, SNE e SUCOM para montar o histórico, e disparos com confirmação em lote (F-190, F-192,
  F-194).

<!-- id: dd-contradictions -->

## 6. Contradições e Inconsistências

| Tema | Posição A (F-xxx) | Posição B (F-xxx) | Decisão pendente |
|------|-------------------|-------------------|------------------|
| Score na v1 ou no segundo horizonte | ETF e plano: na v1 (F-139, F-169) | wiki e protótipo: horizonte H2 (F-197, INF-003) | Questão 1 do `context-map.md` |
| Tamanho do grupo de controle | 3% da carteira (F-151) | cerca de 500 por ciclo (F-186) | Questão 2 |
| Regra de distribuição de casos | por carga ou grupo (F-087, F-093) | vínculo contador ↔ atendente (F-198) | Questão 3 (GAP-009) |
| Cobrança Ativa por telefone | fora da ETF (F-137) | criada no protótipo v3 (INF-001) | Questão 4 (GAP-005) |
| Cronograma e equipe | um desenvolvedor, 13 semanas (F-143, F-145) | squad até abril de 2027 (F-170) | Questão 7 (GAP-006) |
| Fonte de contumazes | critério alimentado pelas fontes (F-055) | controle no Credep (F-178) | Questão 5 (GAP-017) |

<!-- id: dd-org-context -->

## 7. Contexto Organizacional

| Fator | Descrição | Impacto no projeto | Fonte |
|-------|-----------|-------------------|-------|
| Resistência interna | nenhum fator identificado nas fontes | baixo | — |
| Campeão do projeto | a Coordenação de Cobrança (CPRF) é dona do produto e assina o aceite | alto | F-172 |
| Dependência externa | integrações dependem da TI (19 APIs, 3 sem resposta), do contrato com a UFMT, do provedor de mensagens e da licença do Platform Analytics | alto | F-166, F-176, F-177, F-182 |
| Restrição política | programa Profisco II com 7 produtos em paralelo; premissas com a gestão do contrato ainda não preenchidas | médio | F-164, F-181 |
| Janela de oportunidade | Etapa 4 de 7 meses começando, com ServiceNow confirmado e time técnico alocado | alto | F-164, F-165 |

<!-- id: dd-readiness -->

## 8. Avaliação de Prontidão do Insumo (Readiness Score)

| Dimensão | Nota (0-3) | Justificativa |
|----------|------------|----------------|
| Clareza do problema | 2 | Dores bem descritas e base quantificada (1,8 milhão de contribuintes, taxas de quitação), mas sem custo atual da operação manual |
| Cobertura de atores | 3 | Papéis, interesse e poder de decisão mapeados, inclusive na homologação |
| Densidade evidencial (F-xxx vs INF-xxx/NCR) | 3 | 200 fatos com âncora, 4 inferências justificadas (só do protótipo), nenhum item sem classificação |
| Sistemas e integrações | 3 | Sistemas, direção, dado e protocolo descritos, com a situação de cada API |
| Métricas e SLAs | 3 | Volumes, percentuais, janelas e métrica principal com fonte |
| Contradições resolvidas | 2 | Seis contradições listadas e encaminhadas como questões, ainda sem decisão |
| Clareza dos pedidos | 3 | Pedidos específicos, com ator e origem |

**Nota consolidada:** 90% — **Classificação:** Pronto para projetificação

**Maiores lacunas:**

| Dimensão | Por quê |
|----------|---------|
| Contradições resolvidas | Score na v1 × H2, tamanho do grupo de controle e regra de distribuição seguem em aberto |
| Clareza do problema | O custo atual da cobrança manual não está quantificado nas fontes |

**Recomendação:** seguir. O `spec-legacy` só registra que não há legado, e o `spec-benchmark` fica fora desta simulação por decisão de Pedro. As questões 1 a 4 do `context-map.md` devem ser levadas ao `spec-product`.
