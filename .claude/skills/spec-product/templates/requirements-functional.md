# Requisitos Funcionais e Não Funcionais (negócio) — [Nome do Projeto]

Status: draft
Última atualização: YYYY-MM-DD
Versão: 1.0
Escopo: comportamento observável (RF) e qualidades exigíveis pelo negócio (RNF de negócio).
Fonte: legacy.md, benchmark.md, product-vision.md, business-rules.md, discovery-document.md §4; ERS/SRS ou outros docs em `inputs/` quando existirem.

> **Nota de escopo:** RNF técnicos profundos (cifragem específica, tuning de banco, padrões de container) são fase técnica futura. Aqui ficam os RNF que o **negócio** decide: SLA target, compliance, idioma, browsers suportados, limiares observáveis pelo usuário.

<!-- Opcional: descomente a linha seguinte para o script check-outputs.py avisar se faltar índice modular / seções ## Módulo -->
<!-- spec-check-modular: on -->

<!-- id: reqfun-modules -->

## Índice de módulos e cobertura

*(Preenchido no Passo 3.0 de `spec-product` **antes** de redigir RF. Ajustar códigos `MOD-*` ao kickoff do projeto.)*

> **⚠️ Ajustar ao kickoff:** as linhas abaixo são placeholders. Remover, renomear ou substituir conforme o catálogo modular real do projeto. O catálogo definitivo está em [`modules.md`](../modules.md) (fonte de verdade).

| Módulo | Objetivo de negócio | Nº RF planejado | Nº RF escritos | Lacunas (QA) |
|--------|---------------------|-----------------|----------------|---------------|
| MOD-EXEMPLO-A | *(preencher — objetivo mensurável do módulo)* | | | |
| MOD-EXEMPLO-B | | | | |

- Cada linha usada no projeto deve terminar com **≥ 1 RF Must** ou item **`QA-NN`** (ver `## Questões em aberto`) na coluna Lacunas (justificar ausência, ex.: fora do release). **Não** atribuir `GAP-XXX` aqui — essa numeração formal é exclusiva do `spec-iterate`.
- IDs de RF seguem `RF-[CÓDIGO-MÓDULO]-NN` (ex.: `RF-MOD-COBRANCA-014`). Ver [`../tools/references/spec-requirements-depth.md`](../../tools/references/spec-requirements-depth.md).
- Códigos `MOD-XXX` devem ser idênticos ao registro canônico em [`outputs/spec/modules.md`](../modules.md).

<!-- id: reqfun-coverage-input -->

## Matriz de cobertura (insumos → RF)

*(Mapear candidatos do discovery, ERS/SRS, workshops: cada linha do insumo relevante → RF ou `QA-NN` em `## Questões em aberto`. **Não** atribuir `GAP-XXX` aqui.)*

| Referência insumo (doc § / ID / tela) | Descrição curta | RF cobrindo | ou QA |
|---------------------------------------|-----------------|-------------|--------|
| | | | |

<!-- id: reqfun-tobe -->

## Visão TO-BE de negócio (delta vs. AS-IS)

| Domínio | Estado AS-IS (legacy.md § ou fonte) | Estado TO-BE (capacidade de negócio) | Delta principal | RFs envolvidos |
|---------|-------------------------------------|--------------------------------------|-----------------|----------------|
| | | | | |

<!-- id: reqfun-traceability -->

## Rastreabilidade global (RF / RNF)

| ID | Tipo | Módulo | Domínio / categoria | Legacy / benchmark / vision | Fato fonte (F-xxx) |
|----|------|--------|---------------------|----------------------------|---------------------|
| | RF ou RNF | MOD-XXX | | | |

---

<!-- id: rf -->

## Requisitos funcionais por módulo

*(Repetir o bloco `## Módulo:` para **cada** módulo listado no índice que tenha RF ou QA explícito. Ordem sugerida: mesma do índice.)*

## Módulo: [Nome em linguagem do cliente] (`MOD-XXX`)

*(Cada RF: 1 resultado observável, escrito em **1** dos 5 padrões EARS, aprovado no checklist ISO/IEC/IEEE 29148 — ver [`../../tools/references/spec-requirements-depth.md`](../../tools/references/spec-requirements-depth.md) §1-3. Validadores `RF_SINGULAR` = FATAL · `RF_EARS_PATTERN` = WARNING.)*

### RF-MOD-XXX-001: [Título]

**Épico:**
**Funcionalidade:**

**Descrição (User Story):**
Como [ator],
quero [ação],
para que [benefício].

**Enunciado EARS *(1 padrão)*:** *(Ubíquo / QUANDO… / ENQUANTO… / SE…ENTÃO… / ONDE…)*

**Atores:**
**Prioridade MoSCoW:**
**Complexidade:**

**Pré-condições:**
-

**Critérios de Aceite (BDD):**

```gherkin
Cenário 1: [Fluxo principal]
  Dado que
  Quando
  Então

Cenário 2: [Fluxo alternativo]

Cenário 3: [Fluxo de erro ou bloqueio de negócio]
```

**Regras de Negócio aplicáveis:** RN-XXX, RN-NOVO-XXX
**Dependências:**
**Rastreabilidade:** F-xxx
**Notas:**

---

*(Repetir `### RF-MOD-XXX-NNN` dentro desta seção até esgotar o módulo; depois abrir nova seção `## Módulo:`.)*

---

<!-- id: reqfun-integrations -->

## Integrações negociais *(opcional)*

*(Sem contrato técnico: apenas finalidade e efeito no processo.)*

| Sistema / fonte institucional | Finalidade para o processo | Efeito observável para o ator | RF relacionados |
|-------------------------------|----------------------------|-------------------------------|-----------------|
| | | | |

<!-- id: rnf -->

## Requisitos Não Funcionais (negócio)

*(Método `quality-attribute-scenario`: todo RNF em cenário de 6 partes categorizado por ISO/IEC 25010 — ver [`../../tools/references/spec-requirements-depth.md`](../../tools/references/spec-requirements-depth.md) §4. Validador `RNF_HAS_MEASURE` = **FATAL** se faltar medida numérica na parte "resposta".)*

### RNF-[CATEGORIA]-001: [Título]

**Categoria (ISO 25010):** Desempenho / Segurança / Usabilidade / Confiabilidade / Manutenibilidade / Portabilidade / Compatibilidade / Adequação funcional
**Prioridade MoSCoW:**
**Módulo principal *(opcional)*:** MOD-XXX

**Declaração:**

**Cenário (6 partes):**
- Fonte do estímulo:
- Estímulo:
- Ambiente:
- Artefato:
- Resposta:
- Medida da resposta *(numérica — obrigatória)*:

**Métrica mensurável:**
- Indicador:
- Valor alvo:
- Condições:

**Critério de aceite:**

**Método de verificação:**

**Rastreabilidade:**
**Vinculado a:** [QA-NN, RF-XXX, decisão de negócio ou GAP-XXX já existente]

---

<!-- id: rf-rnf-matrix -->

## Matriz RF ↔ RNF

| RF | Título | Módulo | RNFs impactados |
|----|--------|--------|-----------------|
| | | MOD-XXX | |

---

<!-- id: reqfun-open-questions -->

## Questões em aberto

*(Lacunas ou conflitos identificados durante a redação deste documento que ainda não têm decisão de negócio. **Não** atribuir `GAP-XXX` diretamente — essa numeração formal é responsabilidade exclusiva do `spec-iterate` na próxima auditoria. Usar apenas `QA-NN` como referência interna provisória.)*

| QA | Descrição | Onde aparece | Sugestão de tratamento |
|----|-----------|---------------|-------------------------|
| QA-01 | | | |
