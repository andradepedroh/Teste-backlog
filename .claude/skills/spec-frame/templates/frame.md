# Frame — Enquadramento, Hipóteses e Plano de Levantamento

> **O que é este documento.** Um espelho do pensamento do consultor **antes** da ingestão: qual é o
> problema, quais hipóteses vamos validar e o que ainda falta descobrir com o cliente. **Nada aqui é
> fato** — exceto o que estiver marcado como `FATO` com âncora. Este arquivo é uma **fonte** do
> `spec-ingest` (Fase 2), que reclassifica cada item.

- **Status:** draft <!-- draft | validado | aprovado -->
- **Última atualização:** AAAA-MM-DD
- **Fontes:** <!-- o que foi lido/ouvido: inputs/, texto do chat, call com cliente -->
- **Maturidade do insumo:** ideia solta | material parcial | material rico

---

## 1. Enquadramento do problema

<!-- 2-4 frases. A DOR, não a solução pedida. Quem sente, por que agora, custo atual (número quando houver). -->

**Solução que o cliente pediu (se pediu uma):** <!-- registrar como pedido, vira HIP de solução -->

---

## 2. Hipóteses a validar (HIP)

<!-- Cada linha é uma hipótese NOSSA. Tipo: problema / solução / oportunidade. -->

| ID | Tipo | Hipótese (linguagem do cliente) | O que a sugere | Como validar | Status |
|----|------|----------------------------------|----------------|--------------|--------|
| HIP-001 | problema | | | | segue / descartada (motivo) |
| HIP-002 | solução | | | | |
| HIP-003 | oportunidade | | | | |

---

## 3. Fatos relatados pelo consultor (FATO) — âncora obrigatória

<!-- SÓ o que um ator real disse/decidiu e o consultor está repassando. Tem fonte. Vira F-xxx no spec-ingest.
     Se ninguém de fora disse, NÃO entra aqui — é HIP. -->

| # | Fato (o que foi dito) | Âncora (quem disse, quando / documento) |
|---|------------------------|------------------------------------------|
| 1 | | call com cliente · AAAA-MM-DD |

<!-- Se não há nada relatado com âncora: «nenhum fato externo relatado — todo o conteúdo é hipótese». -->

---

## 4. Direções descartadas

<!-- Hipóteses de solução/oportunidade que NÃO seguem, com o motivo — evita reabrir a discussão. -->

| Direção | Por que foi descartada |
|---------|------------------------|
| | |

---

## 5. Pré-protótipo (opcional)

<!-- Preencher só se houve esboço em outputs/spec/frame/pre-prototype/. -->

- **Arquivo(s):** `outputs/spec/frame/pre-prototype/…`
- **HIP que ilustra:** HIP-xxx
- **O que o `spec-prototype` (Fase 5) deve aproveitar:** <!-- telas/fluxos que sobrevivem; o resto é descartável -->

<!-- Sem pré-protótipo: «não gerado — o enquadramento em texto foi suficiente». -->

---

## 6. Plano de levantamento (PRB)

<!-- O que falta descobrir com o cliente antes de projetificar. Produto de trabalho do consultor — não é fato. -->

| ID | Pergunta a fazer / documento a pedir | Para quem | Bloqueia projetificar? | Status |
|----|---------------------------------------|-----------|------------------------|--------|
| PRB-001 | | | sim / não | aberto |
| PRB-002 | | | | |

---

## 7. Próximo passo

<!-- Normalmente: rodar spec-ingest (Fase 2) com este frame.md como uma das fontes.
     Ou, se ainda muito pobre: fazer o levantamento (PRB) com o cliente antes de seguir. -->
