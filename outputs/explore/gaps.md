# GAPs e Questões Abertas — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> **Fase:** Explore · **Versão:** 0.1 · **KERNEL — registro único de questões abertas.**
> **Documentos irmãos:** [HLD](./hld-funcional.md) · [Funcional](./especificacao-funcional.md) · [Técnica](./especificacao-tecnica.md) · [Modelo de Dados](./modelo-de-dados.md)

> **Legenda de Status:** ✅ Respondido · 🟡 Parcialmente · ⏳ Aguardando

## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-11-13 | versão inicial, com as questões levantadas na ETF, na wiki TO-BE, no plano de implementação e no protótipo v3 |

## Questões abertas

| ID | Descrição | Status | Impacto | Responsável |
|---|---|---|---|---|
| GAP-001 | Contrato definitivo das APIs de cada fonte (campos exatos). MPI, Big Data e Score UFMT estão sem resposta da TI; IPVA e ITCD estão «a desenvolver». Enquanto isso, as APIs são testadas com lotes simulados (RF-015). Fonte: plano, slides 22 e 23; ETF §1.1 | ⏳ Aguardando | alto | TI SEFAZ-MT e cada sistema parceiro |
| GAP-002 | Licença do Platform Analytics ainda não confirmada. Sem ela, os indicadores e os dois painéis (RF-025, RF-044 a RF-048) precisam de outra solução. Fonte: ETF §1.1 | ⏳ Aguardando | alto | SEFAZ-MT (gestão do contrato) |
| GAP-003 | A matriz de acesso por papel é proposta da ETF e está marcada «a validar», assim como o compartilhamento dos painéis por papel. Fonte: ETF §6.4 e §6.5 | ⏳ Aguardando | médio | Coordenação de Cobrança (CPRF) |
| GAP-004 | Provedor de e-mail, SMS e WhatsApp: contrato técnico fora da estimativa, contratação do WhatsApp a verificar, volumetria do serviço de e-mail institucional a confirmar e papel do SNE como canal a definir. Fonte: ETF §1.1; plano, slides 17 e 22 | ⏳ Aguardando | alto | TI SEFAZ-MT (DevSecOps) |
| GAP-005 | O protótipo v3 tem a tela «Cobrança Ativa — Lista de Ligações» (cobrança massificada por telefone, distribuída entre atendentes), que a ETF não cobre. Decidir se entra na v1. Fonte: protótipo v3; wiki `log.md` (22/06) | ⏳ Aguardando | médio | Coordenação de Cobrança (CPRF) |
| GAP-006 | Cronograma: a ETF prevê um desenvolvedor sênior por 13 semanas; o plano fala em squad de dezembro de 2026 a abril de 2027. Fonte: ETF §2 e §3; plano, slide 11 | ⏳ Aguardando | médio | Gestão do contrato |
| GAP-007 | Regra de desempate quando o contribuinte se enquadra nos dois segmentos, massificada e qualificada (RN-004). Fonte: wiki, «Regras & Métricas» | ⏳ Aguardando | médio | Coordenação de Cobrança (CPRF) |
| GAP-008 | Janela de atribuição da origem da regularização: 30 dias é o padrão assumido; falta definir o modelo de atribuição quando há mais de um canal (RN-026). Fonte: wiki, «Questões em aberto» | 🟡 Parcialmente | médio | Coordenação de Cobrança (CPRF) |
| GAP-009 | Regra de distribuição de casos: a wiki e o protótipo citam vínculo contador ↔ atendente; a ETF prevê distribuição por carga ou por grupo (RN-007). Fonte: wiki; protótipo v3; ETF §2.1 | ⏳ Aguardando | médio | Coordenação de Cobrança (CPRF) |
| GAP-010 | Periodicidade e janela do ciclo: consolidação diária assumida para cerca de 1,8 milhão de contribuintes; confirmar a janela e os prazos de recebimento de cada fonte. Fonte: wiki, «Questões em aberto»; ETF §4 | 🟡 Parcialmente | médio | TI SEFAZ-MT |
| GAP-011 | Escopo dos instrumentos coercitivos dentro do produto: hoje só sinalização informativa (RN-017). Confirmar que o produto não opera protesto nem inscrição. Fonte: wiki, «Questões em aberto» | 🟡 Parcialmente | baixo | Coordenação de Cobrança (CPRF) |
| GAP-012 | Uso do B-Cadastro e do Cadastro de Contadores (APIs prontas segundo o plano), que a ETF não prevê como fonte. Fonte: plano, slide 23 | ⏳ Aguardando | baixo | TI SEFAZ-MT |
| GAP-013 | Nome do escopo da aplicação (`x_cbi_`) a confirmar. Fonte: ETF §1.1 | ⏳ Aguardando | baixo | TI SEFAZ-MT |
| GAP-014 | Premissas do plano de implementação (banco de horas, ritos, ambientes, dados, homologação, treinamento, mudança de escopo) ainda não preenchidas. Fonte: plano, slide 3 | ⏳ Aguardando | médio | Gestão do contrato |
| GAP-015 | Matriz de canais × aceite e redação dos modelos de mensagem sob sigilo fiscal, a validar com o jurídico. Fonte: wiki `log.md` (22/06) | ⏳ Aguardando | alto | Jurídico da SEFAZ-MT |
| GAP-016 | Edição de régua em uso: gera nova versão ou altera a vigente? Fonte: wiki `log.md` (22/06) | ⏳ Aguardando | médio | Coordenação de Cobrança (CPRF) |
| GAP-017 | Fonte da lista de contumazes: segundo a TI, o controle está no sistema Credep, não na CCF. Fonte: plano, slide 22 | ⏳ Aguardando | médio | TI SEFAZ-MT |

## Dispensas registradas

| Artefato dispensado | Motivo | Quem decidiu | Data |
|---|---|---|---|
| protótipo de alta fidelidade (spec-prototype) | simulação do fluxo do harness focada em gerar o backlog; a solução usa telas nativas do ServiceNow, e o protótipo v3 existente fica como insumo (`inputs/prototipo/`). Isenção formal em `outputs/spec/auditorias/_isencoes/` | Pedro | 2026-11-13 |
