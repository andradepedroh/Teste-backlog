# Registro Canônico de Módulos — [Nome do Projeto]

Status: draft
Última atualização: YYYY-MM-DD
Fonte de verdade para todos os documentos. Códigos `MOD-XXX` usados em `requirements.md`, `business-rules.md`, `product-requirements.md`, `prototype.md` e `gaps.md` devem corresponder a uma linha desta tabela.

<!-- id: modules-registry -->

## Catálogo

| Código | Nome canônico (linguagem do cliente) | Aliases aceitos | Atores primários | Objetivo de negócio (1 frase) | Limites (o que NÃO faz) | Status |
|--------|--------------------------------------|-----------------|------------------|-------------------------------|-------------------------|--------|
| MOD-EXEMPLO-A | *(nome curto e direto)* | *(nomes informais que aparecem nas fontes)* | | | | ativo |

**Convenções:**
- **Código:** prefixo `MOD-` + abreviação curta (5-15 chars). Não usar nomes de tela (`MOD-TELA-X`) nem termos técnicos (`MOD-API-X`).
- **Nome canônico:** a forma exata como aparece nos títulos `## Módulo:` dos demais documentos.
- **Aliases:** outras formas que apareceram em transcrições ou no protótipo — útil para reconciliação de menções soltas.
- **Status:** `ativo` (no escopo atual) · `futuro` (Next/Later no roadmap) · `descontinuado` (decidido fora do escopo).

---

## Regras de uso

1. **Toda referência a módulo** em qualquer documento usa o código canônico desta tabela.
2. **Adição de módulo** só após `spec-product` Passo 3.0 ser revisado — não criar módulos durante geração de RF.
3. **Renomeação** registra alias antigo na coluna Aliases (rastreabilidade de menções já feitas).
4. **Validação automática:** `python3 ../tools/check-modules.py` (caminho relativo ao `SKILL.md` do `spec-product`, conforme `tools/references/paths.md`) reporta divergências entre este registro e os 5 documentos.

---

## Histórico de mudanças no catálogo

| Data | Mudança | Motivo |
|------|---------|--------|
| YYYY-MM-DD | Versão inicial | Passo 3.0 de spec-product |
