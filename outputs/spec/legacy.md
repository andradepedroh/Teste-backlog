# Legado AS-IS — não aplicável

Status: **skipped**  
Modo: **skip** (sem legado)  
Última atualização: 2026-11-13  

## Declaração do kickoff

Na linha de kickoff do `sync-log.md` foi registrado `legado=Não`: **não existe sistema digital nem
processo manual formalizado a tratar como inventário AS-IS** neste ciclo de discovery. A Cobrança
Inteligente é um produto novo, construído no ServiceNow.

## Classificação de `inputs/` (Passo 0)

| Arquivo | Classificação | Ação |
|---|---|---|
| `inputs/especificacoes/etf-cobranca-inteligente.pdf` | Documentação de produto (especificação do TO-BE) | ignorado nesta skill — fonte da `spec-ingest` |
| `inputs/especificacoes/wiki-cobranca-refined/` e o navegador HTML | Documentação de produto (wiki do TO-BE) | ignorado nesta skill — fonte da `spec-ingest` |
| `inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx` | Documentação de produto (plano de implementação) | ignorado nesta skill — fonte da `spec-ingest` |
| `inputs/prototipo/prototipo-cobranca-v3.html` | Protótipo de validação (HTML estático com dados fictícios, sem servidor nem banco) | ignorado nesta skill |

Resultado: **legado real não confirmado**. Kickoff «Não» × classificação «não confirmado» =
linha 3 da tabela de decisão: skip normal, consistente.

Os sistemas que continuam existindo (Conta Corrente Fiscal, MPI, Big Data, IPVA, ITCD, SNE/DT-e,
UFMT) passam a **alimentar** o produto por API; não são substituídos por ele. O processo manual
atual (planilhas, Google Drive, consulta a vários sistemas) está descrito como contexto no
`discovery-document.md`, seção 5.

## O que NÃO foi produzido

- `architecture.md` (AS-IS) — omitido  
- `legacy-analysis.md` — omitido  
- `threat-model.md` (STRIDE AS-IS) — omitido  
- `business-map.json`, `legacy-research-log.md` e pastas `domains/*.md` — omitidos  
- Grafo de conhecimento e sinais determinísticos — N/A, sem código no legado  

## Próximo passo do fluxo

O `spec-benchmark` fica fora desta simulação por decisão de Pedro (2026-11-13). O fluxo segue para
**`spec-product`** (ramo A, documentação primeiro).

## Anti-confusão

- **Protótipo / código em `inputs/`** não é “legado”: é artefato de **validação de intenção** do produto-alvo, coberto por `spec-ingest` e `spec-prototype`, nunca por `spec-legacy`.
