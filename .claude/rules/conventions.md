---
description: "Convenções de código da Cobrança Inteligente no ServiceNow: idioma, nomes, formato de erro das APIs, versões e tratamento de erros"
alwaysApply: false
paths: **/*.js, **/*.xml
---

# Convenções — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> Por que: nomes previsíveis deixam qualquer pessoa achar a regra certa sem perguntar, e um único
> formato de erro deixa os sistemas parceiros tratarem rejeições sem código especial por fonte.

---

## Idioma

- **Identificadores em português**, sem acento, como na ETF: `x_cbi_contribuinte`, `ApiIngestaoBase`, `calcularPrioridade`. Fonte: ETF §4 e §6.1; quadro técnico item 4.1.
- Interface, mensagens ao usuário e documentação em **português do Brasil**.
- Comentário explica **por que**, nunca repete o que o código faz.

## Nomenclatura

| Objeto | Padrão | Exemplo |
|--------|--------|---------|
| Tabela | `x_cbi_` + snake_case no singular | `x_cbi_carteira_item` |
| Campo | snake_case | `maior_atraso_dias` |
| Script Include | PascalCase, substantivo da responsabilidade | `ConsolidadorContribuinte` |
| Método | camelCase, verbo no infinitivo | `aplicarCriterios()` |
| Business Rule | `[Módulo] verbo + objeto` | `[Qualificacao] bloquear alteração de versão publicada` |
| Scheduled Job | `[Módulo] tarefa e frequência` | `[Reguas] processar etapas devidas (diário)` |
| Choice | valor em MAIÚSCULAS_COM_SUBLINHADO, rótulo em português | `EM_RISCO` — Em risco |
| Numeração | Number Maintenance | caso `CQ-AAAA-NNNN`, parcelamento `PAR-AAAA-NNNNN` |

## Versionamento de API

- Caminho com versão: `/api/x_cbi/v1/<recurso>`. Fonte: quadro técnico item 4.3 (parceiros externos).
- Mudança que quebra o contrato abre `v2` e mantém `v1` até todos os parceiros migrarem.

## Formato de erro

- Erro da requisição inteira (autenticação, lote inexistente, sequência inválida): **RFC 7807 Problem Details** (`type`, `title`, `status`, `detail`), com mensagem em português.
- Erro de registro dentro de um pacote: a resposta é 200 e traz, **por registro**, `aceito` ou `rejeitado` com o `motivo` da lista fechada (`DOC_INVALIDO`, `CAMPO_AUSENTE`, `CONTRIB_NAO_ENCONTRADO`, `FORMATO_INVALIDO`, `OUTRO`). Fonte: RN-NOVO-ING-004.
- Nunca expor stack trace, nome de tabela interna ou `sys_id` de configuração na resposta.

## Tratamento de erros

- Códigos de erro **tipados** (lista fechada por módulo), nunca texto livre para decidir fluxo. Fonte: quadro técnico item 4.6.
- Script Include lança erro com código; a camada de entrada converte para RFC 7807 ou para o resultado por registro.
- Falha de uma fonte ou de um envio não interrompe o processamento das demais (RN-NOVO-ING-006, RN-NOVO-REG-004).

## Paginação

- APIs de ingestão trabalham por **lote e pacote** (abrir lote, enviar pacotes numerados, fechar lote), não por paginação.
- Listas usam a paginação nativa do ServiceNow.

## Práticas de código

- Clean Code: funções curtas, nome que diz o que faz, sem duplicação. Um Script Include por responsabilidade. Fonte: quadro técnico item 2.3.

## Anti-padrões

- Nome em inglês misturado com português no mesmo módulo.
- Erro devolvido como texto solto sem código.
- Mensagem técnica em inglês na tela do usuário.
- Valor de choice traduzido no código (comparar sempre pelo valor, nunca pelo rótulo).
