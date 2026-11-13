# Registro Canônico de Módulos — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Fonte de verdade para todos os documentos. Códigos `MOD-XXX` usados em `requirements.md`, `business-rules.md`, `product-requirements.md`, `prototype.md` e `gaps.md` devem corresponder a uma linha desta tabela.

<!-- id: modules-registry -->

## Catálogo

| Código | Nome canônico (linguagem do cliente) | Aliases aceitos | Atores primários | Objetivo de negócio (1 frase) | Limites (o que NÃO faz) | Status |
|--------|--------------------------------------|-----------------|------------------|-------------------------------|-------------------------|--------|
| MOD-INGESTAO | Ingestão e Carteira Consolidada | F1, Ingestão, Carteira Consolidada, Visão Única | Sistemas parceiros; Gestor de Integração; Coordenador | Manter, a cada ciclo diário, a visão única de cada contribuinte com todos os débitos das seis fontes | Não calcula score, não forma carteira de cobrança e não opera cobrança coercitiva | ativo |
| MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | F2, Qualificação, Critérios de Carteira | Coordenador | Formar a carteira de cada ciclo por critérios versionados e auditáveis, com grupo de controle sorteado | Não envia comunicações nem distribui casos | ativo |
| MOD-SCORE | Scoring de Liquidez | F3, Score UFMT, Priorização Inteligente | UFMT (sistema); Gestor de Integração; Coordenador | Usar o score da UFMT para priorizar quem cobrar, sem depender dele para operar | Não constrói nem recalibra o modelo de score | ativo |
| MOD-REGUAS | Réguas de Cobrança Massificada | F4, Réguas, Cobrança Massificada | Coordenador; Provedor de mensagens (sistema) | Comunicar a carteira massificada por e-mail, SMS e WhatsApp sem confirmação manual | Não faz cobrança por telefone (Cobrança Ativa fora da v1) nem atendimento individual | ativo |
| MOD-QUALIFICADA | Cobrança Qualificada | F5, Operação do Atendente, Dossiê, Minha Fila | Atendente; Coordenador | Dar a cada atendente uma fila priorizada de casos com o dossiê completo do contribuinte | Não distribui por vínculo contador ↔ atendente na v1 e não inclui a Cobrança Ativa por telefone | ativo |
| MOD-MONITORAMENTO | Monitoramento e KPIs | F6, Painel Institucional, Analytics | Coordenador; Gestor de Integração | Medir a recuperação e o efeito incremental da cobrança contra o grupo de controle | Não altera dados operacionais; o atendente não acessa painéis | ativo |
| MOD-GOVERNANCA | Governança, Acesso e Auditoria | Transversais, Papéis e ACLs, Auditoria | Admin; Auditor; todos os papéis | Garantir que cada papel veja só o que lhe cabe e que toda ação relevante fique auditável | Não faz login nem SSO (responsabilidade da instância) | ativo |

**Convenções:**
- **Código:** prefixo `MOD-` + abreviação curta. Os 7 códigos vêm do `hld-funcional.md` do Explore, sem renomeação.
- **Aliases:** a coluna traz os rótulos F1 a F6 do plano de implementação e os nomes de tela do protótipo.
- **Status:** todos `ativo` na v1. A Cobrança Ativa por telefone (protótipo v3) não virou módulo: ficou fora da v1 por decisão de Pedro em 2026-11-13.

---

## Regras de uso

1. **Toda referência a módulo** em qualquer documento usa o código canônico desta tabela.
2. **Adição de módulo** só após `spec-product` Passo 3.0 ser revisado — não criar módulos durante geração de RF.
3. **Renomeação** registra alias antigo na coluna Aliases (rastreabilidade de menções já feitas).
4. **Validação automática:** `python3 ../tools/check-modules.py` reporta divergências entre este registro e os documentos.

---

## Histórico de mudanças no catálogo

| Data | Mudança | Motivo |
|------|---------|--------|
| 2026-11-13 | Versão inicial, com os 7 módulos do Explore | Passo 3.0 de spec-product; lista confirmada por Pedro (`modulos-kickoff` no sync-log) |
