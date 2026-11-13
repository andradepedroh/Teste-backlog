# Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT) — Product Discovery Kit

**Data de geração:** 2026-11-13
**Versão:** 1.0 (product-vision.md)
**Artefatos incluídos:** context-map, discovery-document, legacy (skip), product-vision, business-rules, requirements, product-requirements, modules, flow-map, sync-log
**Artefatos omitidos:** benchmark.md (spec-benchmark fora desta simulação, por decisão de Pedro); gaps.md do kit (spec-iterate ainda não rodou — as questões abertas estão em `outputs/explore/gaps.md`); architecture, legacy-analysis e threat-model (sem legado)
**Protótipo:** não gerado neste ciclo (isenção registrada); o protótipo v3 recebido fica como referência em `inputs/prototipo/`

> **Números do produto:** 7 módulos · **55 requisitos funcionais** · **7 requisitos não funcionais** ·
> **32 regras de negócio** · 14 telas · 7 fluxos. O resumo automático acima soma também os IDs
> preliminares do Explore (RF-001 a RF-055 e RN-001 a RN-030), citados nos documentos só para
> rastreio — por isso mostra números maiores.

---

## Sumário executivo

### Top 3 achados de negócio

1. A cobrança depende de débitos espalhados em vários sistemas e planilhas, sem visão única de uma base de cerca de 1,8 milhão de contribuintes; o atendente consulta CCF, SNE e SUCOM antes de cada contato (F-183, F-194).
2. A carteira é escolhida de forma empírica e o status é atualizado numa foto mensal, com risco de cobrar quem já pagou (F-189, F-195).
3. Ninguém mede o efeito da cobrança: o grupo de controle é sorteado à mão e os indicadores dependem de extração manual (F-191, F-193).

### Posicionamento recomendado

Sem benchmark nesta simulação. A visão do produto posiciona a Cobrança Inteligente contra a
operação manual de hoje: uma plataforma no ServiceNow que mede o crédito recuperado atribuível à
cobrança, com seleção auditável e versionada (product-vision.md §3).

### Top 3 GAPs críticos ainda abertos

1. GAP-001: contratos das APIs das fontes e do score (MPI, Big Data e UFMT sem resposta da TI) — a carga real depende deles; a v1 testa com lotes simulados.
2. GAP-002: licença do Platform Analytics não confirmada — sem ela, os dois painéis precisam de outra solução.
3. GAP-004 e GAP-015: provedor de e-mail, SMS e WhatsApp e validação jurídica dos modelos de mensagem — sem eles, as réguas não podem ser ativadas.

---

## Conclusões e Próximos Passos

### O que foi descoberto

A SEFAZ-MT cobra o crédito tributário de forma manual e fragmentada, sem visão única do
contribuinte, sem seleção auditável e sem medir o resultado. O material recebido (ETF, wiki do
produto e plano de implementação) é maduro: a avaliação do insumo deu 90%, pronto para
projetificação, com seis contradições entre fontes já encaminhadas (discovery-document.md §8).

### O que o produto vai ser

Uma plataforma de gestão e automação da cobrança administrativa no ServiceNow que consolida a
carteira todo dia, cobra a massa por réguas automáticas, prioriza os casos dos atendentes e mede o
efeito contra um grupo de controle.

- **É:** consolidação diária das seis fontes; critérios versionados com grupo de controle de 3%; score da UFMT com fallback; réguas por e-mail, SMS e WhatsApp; casos com fila e dossiê; Painel Institucional e Painel do Score; acesso por papel e auditoria.
- **Não é:** integração ponta a ponta com os parceiros; modelo de score; dívida ativa, protesto ou execução fiscal; Cobrança Ativa por telefone; distribuição por vínculo contador ↔ atendente; telas customizadas.

### Premissas aceitas

- O Platform Analytics será licenciado para os dois painéis.
- O ciclo de carga é diário.
- O score entra na v1, e a operação segue com critérios fixos quando ele faltar (decisão de Pedro, 2026-11-13).
- O grupo de controle é 3% da carteira e a distribuição de casos é por carga ou por grupo (decisões de Pedro, 2026-11-13).
- Os valores-alvo dos requisitos não funcionais são propostas desta simulação, a validar.

### Riscos identificados

1. Contratos das APIs com a TI e os parceiros ainda abertos (GAP-001).
2. Licença do Platform Analytics (GAP-002).
3. Provedor de mensagens e validação jurídica dos modelos (GAP-004, GAP-015).

### Próximos passos

| Passo | Responsável | Prioridade |
|-------|-------------|-----------|
| Rodar a `spec-iterate` para formalizar as questões abertas (QA-01 a QA-04) | Consultor | 🔴 Imediato |
| Confirmar o quadro técnico (`tech-rules/kickoff-proposto.md`) e congelar o Explore | Pedro | 🔴 Imediato |
| Cadeia técnica: regras técnicas, desenho de alto nível, plano de segurança, modelo de dados, contratos e plano de testes | Consultor + Tech Lead | 🟡 Próxima fase |
| Geração do backlog (`spec-tasks`) com histórias, critérios de aceite e dependências | Consultor + PM | 🟡 Próxima fase |
| Fechar com a TI os contratos das APIs e o provedor de mensagens | TI SEFAZ-MT | 🟡 Próxima fase |
