---
titulo: Blueprint — Cobrança Inteligente
tipo: blueprint
atualizado_em: 2026-06-15
status: ativo
---
# Blueprint — Cobrança Inteligente

Visão geral da solução organizada pela **cadeia de valor da cobrança administrativa**: do dado bruto de débitos à recuperação mensurada do crédito. Cada etapa agrupa as features que a compõem. Marcadores: `[ator:<ator>]` = persona principal; `[ia]` = feature com componente de IA.

## 1. Identificação e Consolidação
- [Ingestão e Carteira Consolidada](Requisitos/ingestao-carteira.md) — consolida débitos de CCF/MPI/Big Data/IPVA/ITCD/SNE em visão única por contribuinte, com atualização intraciclo.  [ator:Coordenador]

## 2. Qualificação e Priorização
- [Qualificação e Parametrização da Carteira](Requisitos/qualificacao-carteira.md) — forma carteiras por critérios versionados, segmenta massificada/qualificada e sorteia grupo de controle.  [ator:Coordenador]
- [Scoring de Liquidez (Priorização Inteligente)](Requisitos/scoring-liquidez.md) — integra e usa o score da UFMT como critério de priorização (com fallback).  [ator:Coordenador] [ia]

## 3. Cobrança Massificada
- [Réguas de Cobrança Massificada Multicanal](Requisitos/reguas-cobranca.md) — desenha e dispara réguas escalonadas por e-mail/SMS/WhatsApp/SNE, com opt-in e marcação de origem.  [ator:Coordenador]

## 4. Cobrança Qualificada
- [Cobrança Qualificada — Operação do Atendente](Requisitos/cobranca-qualificada.md) — distribui casos, consolida dossiê e registra interações no atendimento individualizado.  [ator:Atendente]

## 5. Monitoramento e Aprendizado
- [Monitoramento, KPIs e Grupo de Controle](Requisitos/monitoramento-kpis.md) — apura KPIs por tributo/canal/instrumento, calcula efeito incremental e gera insumos de revisão.  [ator:Coordenador]

## Relacionado
- [Visão do produto](visao.md)
- [Modelo de dados (transversal)](modelo-dados.md)
- [Requisitos transversais](requisitos-transversais.md)
- [Telas comuns (arquétipos)](telas-comuns.md)
- [Índice do wiki](index.md)
