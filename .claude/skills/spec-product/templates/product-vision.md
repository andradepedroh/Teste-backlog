# Documento de Visão de Produto — [Nome do Projeto]

Status: draft
Última atualização: YYYY-MM-DD
Versão: 1.0
Autor: [Nome]
Classificação: Interno
Fonte: discovery-document.md (F-xxx), legacy.md, benchmark.md

<!-- id: pv-summary -->

## 1. Sumário Executivo

*(Pyramid Principle: conclusão primeiro. Máx. 5 frases.)*

---

<!-- id: pv-context -->

## 2. Contexto e Oportunidade

### 2.1 Situação Atual (AS-IS)

| Dor | Impacto (quantificado) | Fonte |
|-----|------------------------|-------|
| | | F-xxx |

### 2.2 Oportunidade

- Para o negócio:
- Para o usuário:
- Para o mercado:

### 2.3 Por que agora?

*(Gatilho: regulatório, competitivo, tecnológico, estratégico — escolher um.)*

### 2.4 Value Proposition Canvas (Osterwalder) — por persona primária

*(Método `value-proposition-canvas`, **antes** do Moore. Uma tabela por persona primária. Toda célula cita evidência `F-xxx` ou `PD-xxx`. Validador `VPC_EVIDENCE` = FATAL se célula sem evidência.)*

**Persona: [Nome]**

| Jobs (tarefas/objetivos) | Pains (dores) | Gains (ganhos esperados) |
|--------------------------|---------------|--------------------------|
| … `F-xxx` | … `PD-xxx` | … `F-xxx` |

| Pain relievers → dor atendida | Gain creators → ganho atendido |
|-------------------------------|--------------------------------|
| `MOD-XXX` alivia … | `MOD-XXX` cria … |

*(Regra: toda `pain` sem `pain reliever` mapeado a um `MOD-XXX` → registrar em `## Questões em aberto` como `QA-NN`.)*

---

<!-- id: pv-vision -->

## 3. Declaração de Visão (Formato Moore)

```
PARA           [segmento de usuário primário]
QUE            [necessidade ou oportunidade]
O [PRODUTO] É  [categoria]
QUE            [benefício principal]
DIFERENTE DE   [alternativa atual — vem do benchmark.md]
NOSSO PRODUTO  [diferenciação chave]
```

---

<!-- id: pv-metrics -->

## 4. Objetivos e Métricas de Sucesso (SMART)

| Objetivo | Métrica | Baseline | Meta | Prazo | Dono |
|----------|---------|----------|------|-------|------|
| | | | | | |

### 4.1 North Star Metric + árvore de métricas

*(Método `north-star-tree`. NSM passa nos 3 critérios: mede valor para o usuário — não receita; é influenciável pelo produto; é leading — não lagging. Cada input metric liga a ≥ 1 `MOD-XXX`. Validador `NSM_TREE` = WARNING se input sem módulo.)*

```
NSM: [métrica de valor para o usuário]
 ├─ input 1: [métrica] → MOD-XXX
 ├─ input 2: [métrica] → MOD-XXX
 └─ input 3: [métrica] → MOD-XXX
```

### 4.2 OKR verificável

*(Método `verifiable-okr`. Cada KR = `{ métrica, baseline (F-xxx ou "sem baseline" → Questões em aberto), alvo numérico, prazo }`. Banda: 2-4 KRs por objetivo. Validador `KR_HAS_BASELINE` = WARNING.)*

| Objective | KR | Métrica | Baseline (F-xxx / "sem baseline") | Alvo numérico | Prazo |
|-----------|----|---------|------------------------------------|---------------|-------|
| | KR1 | | | | |
| | KR2 | | | | |

---

<!-- id: pv-scope -->

## 5. Escopo — É / Não É

| Esta versão É | Esta versão NÃO É |
|---------------|-------------------|
| | |

| Item fora do escopo | Justificativa | Quando revisar |
|---------------------|---------------|----------------|
| | | |

---

<!-- id: pv-personas -->

## 6. Personas e Jobs to Be Done

```
PERSONA: [Nome fictício]
Perfil:    [cargo, área, contexto]
Contexto:  [dia a dia relevante]

JTBD Emocional:  "Quero me sentir [estado] ao [usar o produto]."

Dores principais (vindas do legacy.md Dim. 7):
  1. — origem: PD-XX, F-xxx

Ganhos esperados:
  1.
```

**Job stories (forma canônica JTBD — método `jtbd-job-story`):**

*(2-5 job stories por persona, cada uma na forma `Quando <situação>, quero <motivação>, para <resultado esperado>` e rastreada a ≥ 1 `F-xxx`. Persona sem nenhuma job story evidenciada = rotular **"persona hipotética"** e abrir `QA-NN`. Banda: 2-5 personas primárias.)*

| # | Job story | Rastreio |
|---|-----------|----------|
| 1 | Quando [situação], quero [motivação], para [resultado esperado]. | F-xxx |

*(Repetir para cada persona-chave.)*

---

<!-- id: pv-constraints -->

## 7. Premissas, Dependências e Restrições

| Tipo | Descrição | Impacto se falhar | Dono |
|------|-----------|-------------------|------|
| premissa | | | |
| dependência | | | |
| restrição | | | |

---

<!-- id: pv-roadmap -->

## 8. Roadmap de Alto Nível (Now / Next / Later)

*(Método `roadmap-cut`. Critério de corte objetivo por horizonte; **cada iniciativa referencia RF/MOD**. Now = `Must` da jornada crítica + pré-requisitos técnicos; Next = `Should` ligados a KRs; Later = `Could` / apostas.)*

| Horizonte | Critério de corte | Iniciativas | RF / MOD referenciado | Valor Esperado | Risco / dependência |
|-----------|-------------------|-------------|-----------------------|----------------|---------------------|
| Now (0-3m) | Must da jornada crítica + pré-requisitos técnicos | | RF-MOD-XXX-NN / MOD-XXX | | |
| Next (3-6m) | Should ligados a KRs | | RF-MOD-XXX-NN + KR | | |
| Later (6m+) | Could / apostas não validadas | | MOD-XXX / QA-NN | | |

---

<!-- id: pv-raci -->

## 9. Stakeholders e RACI

| Stakeholder | R | A | C | I |
|-------------|---|---|---|---|
| | | | | |

---

<!-- id: pv-gaps -->

## 10. Visão ↔ GAPs

*(Temas em aberto vinculados a `GAP-XXX` **já existentes** — abertos por `spec-iterate` em ciclos anteriores. Esta skill **não** cria `GAP-XXX`; lacunas novas entram como `QA-NN` em `## Questões em aberto`.)*

| GAP existente | Tema em aberto | Impacto na visão | Referência |
|---------------|----------------|------------------|------------|
| GAP-XXX | | | |

---

<!-- id: pv-history -->

## 11. Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | | | Versão inicial |

---

<!-- id: pv-open-questions -->

## Questões em aberto

*(Lacunas identificadas ao derivar a visão — VPC com dor órfã, KR sem baseline, persona hipotética. **Não** atribuir `GAP-XXX` aqui; usar `QA-NN` — a formalização como GAP é exclusiva do `spec-iterate`.)*

| QA | Descrição | Onde aparece | Sugestão de tratamento |
|----|-----------|--------------|-------------------------|
| QA-01 | | | |
