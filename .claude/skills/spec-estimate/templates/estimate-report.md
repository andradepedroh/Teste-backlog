# Estimativa de Delivery — [Nome do Projeto]

Status: draft | final
Última atualização: YYYY-MM-DD
Modo: Full | Backlog-only | Greenfield-Preliminar | Recalibração
Throughput baseline: history | reference-class | cold-start
Apetite de risco: conservador | balanceado | agressivo
Modo de implementação: convencional | ia-assistida | ambos
Fontes: tasks.json, data-model.json, api-contracts.yaml, requirements.md, business-rules.md

> Este documento responde: **quando termina, quanto custa, quão confiantes estamos e o que fazer agora.**
> Cada prazo é uma faixa probabilística — P50 é o cenário mais provável, P85 é o compromisso seguro para stakeholders externos.
> Toda métrica é rastreável ao backlog (taskId, RF-XXX, MOD-XXX, GAP-XXX).

<!-- spec-check-modular: on -->

---

<!-- id: dlv-executive-summary -->

## 1. Resumo Executivo

> **Para o gestor:** esta seção é autocontida. Você não precisa ler o resto para tomar uma decisão.

### O projeto em uma frase

*(Descreva o que está sendo construído, para quem e qual o objetivo de negócio. 1–2 frases, sem jargão técnico.)*

### Prazo e custo

| | Cenário mais provável (P50) | Compromisso seguro (P85) | Pior caso (P95) |
|-|----------------------------|--------------------------|-----------------|
| **Prazo** | `XX dias úteis` (YYYY-MM-DD) | `XX dias úteis` (YYYY-MM-DD) | `XX dias úteis` (YYYY-MM-DD) |
| **Custo** | `R$ XXX.XXX` | `R$ XXX.XXX` | `R$ XXX.XXX` |
| **Time necessário** | `N pessoas em M squads` | — | — |

> **P50** = cenário que tem 50% de chance de ser cumprido (use internamente para planejamento).
> **P85** = cenário que tem 85% de chance de ser cumprido (use para compromissos com clientes e stakeholders).

*(Se modo IA ativado, adicionar linha comparativa:)*

| | Convencional (time humano) | IA-assistida (spec-implement) | Ganho |
|-|---------------------------|-------------------------------|-------|
| **Prazo P50** | `XX dias` | `XX dias` | `XX% mais rápido` |
| **Custo P50** | `R$ XX` | `R$ XX` | `XX% mais barato` |

### Nossa confiança na estimativa

**DCI = XX/100** — *(Índice de Confiança de Entrega — 0 = sem confiança, 100 = certeza)*

| Banda | Significado | O que fazer |
|-------|-------------|-------------|
| 🟢 80–100 | Alta — comprometa o P85 com confiança | Seguir o plano |
| 🟡 60–79 | Moderada — aceitar com mitigações implementadas | Resolver os riscos antes de comprometer |
| 🟠 40–59 | Baixa — re-escopar antes de assumir compromisso | Priorizar ações de §6 antes de qualquer data formal |
| 🔴 0–39 | Crítica — não comprometer prazo agora | Escalar; implementar ações de §6; recalibrar em Sprint 1 |

**Status atual:** *(copiar a banda correta acima e explicar em 1 frase por que o DCI está nesse nível)*

### Os 3 maiores riscos agora

*(Em linguagem de negócio — sem IDs técnicos nesta seção)*

1. **[Nome do risco em linguagem simples]** — *(o que pode acontecer, impacto em dias/R$)*
2. **[Nome do risco em linguagem simples]** — *(o que pode acontecer, impacto em dias/R$)*
3. **[Nome do risco em linguagem simples]** — *(o que pode acontecer, impacto em dias/R$)*

### O que fazer esta semana (antes do Sprint 1)

1. *(Ação concreta, quem faz, por que é urgente)*
2. *(Ação concreta, quem faz, por que é urgente)*
3. *(Ação concreta, quem faz, por que é urgente)*

---

<!-- id: dlv-complexity -->

## 2. Análise de Complexidade

*(Explique aqui o que o backlog revelou sobre a complexidade do projeto. Quantas tarefas, quais módulos são mais pesados, o que isso significa para o time. 2–3 parágrafos antes das tabelas.)*

### Tamanho e esforço do projeto

| Métrica | Valor | O que significa |
|---------|-------|-----------------|
| Total de tarefas | `XX` | — |
| Esforço total (ajustado) | `XX person-months` | Meses de trabalho de 1 pessoa — dividir pelo tamanho do time para chegar no prazo |
| Horas de engenharia | `XX h` | — |
| Custo total P50 | `R$ XXX.XXX` | Inclui multiplicadores de risco e compliance |
| Módulo mais complexo | `MOD-XXX (XX% do escopo)` | O módulo que mais vai demandar atenção |

### Cross-check bottom-up × top-down

*(Preencher SOMENTE quando o `tasks.json` traz `effortHours` — base bottom-up da `spec-tasks`. Confronta o esforço estimado por soma das horas das tarefas contra o esforço top-down (COCOMO/HDF). O HDF é a estimativa primária; o bottom-up é a âncora de sanidade. Quando divergem muito, explicar e ancorar o número executivo na base bottom-up. Se `effortHours` ausente, omitir esta subseção e registrar `NO_EFFORT_BASELINE` nos Avisos.)*

| Base | Manual (humano) | IA-assistida | Origem |
|------|-----------------|--------------|--------|
| Bottom-up (soma das tarefas) | `XX person-days` | `XX person-days` | `effortHours` / `metadata.effortSummary` |
| Top-down (COCOMO/HDF) | `XX person-days` | `XX person-days` | Layer 1 (`PM_adjusted × 21`) |
| **Divergência** | `±XX%` | `±XX%` | `(top-down − bottom-up) / bottom-up` |

*(Se `|divergência| > 40%` → WARNING `EFFORT_CROSSCHECK_DIVERGENCE`: explicar a causa provável — HDF/EMs empilhados — e recomendar ancorar o compromisso na base bottom-up ou reconciliar antes de comprometer.)*

### Por que esse esforço? — Fatores de ajuste aplicados

*(Explique em linguagem simples o que inflou ou deflou o esforço base. Ex: "O projeto não tem legado para migrar, o que ajuda. Mas as integrações com sistemas externos como RastroLog e RegistraPlus adicionam 50% de esforço adicional.")*

| Fator | Multiplicador | Impacto na estimativa |
|-------|---------------|-----------------------|
| Legado/migração | `1,XX` | *(Nenhum legado / Migração parcial / Migração completa)* |
| Complexidade arquitetural | `1,XX` | *(N módulos + FK entre módulos)* |
| Experiência do time | `1,XX` | *(Time novo no projeto / time experiente)* |
| Ferramental e ambiente | `0,XX` | *(Ambiente configurado / do zero)* |
| Compliance (LGPD, etc.) | `1,XX` | *(Requisitos regulatórios presentes/ausentes)* |
| Questões em aberto | `1,XX` | *(N decisões de negócio ainda não tomadas)* |

### Distribuição por módulo

*(Quais módulos concentram mais trabalho e por que isso importa para o planejamento de squads.)*

| Módulo | Tarefas | % do projeto | Complexidade média |
|--------|---------|--------------|-------------------|
| MOD-XXX | XX | XX% | 🟢/🟡/🔴 |

### As 10 tarefas mais complexas

*(Estas são as tarefas que mais merecem atenção antes das sprints. Cada uma delas pode ser um ponto de risco se não planejada com antecedência.)*

| Tarefa | O que faz | Por que é complexa | Módulo |
|--------|-----------|--------------------|--------|
| TASK-XXX | *(descrição em linguagem simples)* | *(api rica / muitas integrações / regras complexas)* | MOD-XXX |

---

<!-- id: dlv-dependency -->

## 3. Caminho Crítico e Paralelização

*(Explique aqui como as tarefas se encadeiam. Qual é o caminho mais longo que determina o prazo mínimo possível? Quantas frentes podem trabalhar em paralelo? 2–3 parágrafos.)*

### Quanto podemos paralelizar?

O projeto tem `XX%` de paralelização possível — isso significa que `XX%` do trabalho **pode
acontecer em paralelo** entre squads, e apenas `XX%` é serial (uma coisa após a outra).

O prazo mínimo teórico (com equipe infinita) seria `XX dias`. Com o time recomendado de `N squads`,
o prazo realista é `XX dias`.

| Métrica | Valor | O que significa |
|---------|-------|-----------------|
| Caminho crítico | `XX dias úteis` | O prazo mínimo possível — nenhuma contratação adicional reduz abaixo disso |
| Paralelização possível | `XX%` | Quanto do trabalho pode acontecer ao mesmo tempo em squads diferentes |
| Streams paralelas | `N` | Número de frentes de trabalho independentes identificadas |

### O caminho crítico — a sequência que determina o prazo

*(Liste as tarefas do caminho crítico em linguagem simples. Explique por que cada uma precisa terminar antes da próxima.)*

```
[Tarefa A] → [Tarefa B] → [Tarefa C] → ... → [Tarefa Final]
```

| Passo | Tarefa | Por que vem antes | Duração |
|-------|--------|-------------------|---------|
| 1 | *(o que faz em linguagem simples)* | *(dependência explicada)* | `Xd` |

### Frentes de trabalho paralelas

| Frente | Módulos cobertos | Duração | Squad sugerido |
|--------|-----------------|---------|----------------|
| Frente A | MOD-XXX | XX dias | SQUAD-001 |

### Os gargalos — o que pode travar tudo

*(Os gargalos são tarefas que, se atrasarem, atrasam o projeto inteiro. Explique cada um em linguagem de negócio.)*

| # | O que é | Por que é gargalo | Impacto se atrasar | O que fazer |
|---|---------|-------------------|-------------------|-------------|
| 1 | *(descrição simples)* | *(converge X outras tarefas / único ponto de integração)* | `+N dias no prazo` | *(ação concreta)* |

### Módulos muito acoplados — onde mudanças propagam

*(Explique quais partes do sistema "conversam" muito entre si, e por que isso exige coordenação especial entre squads.)*

| Módulo A | Módulo B | Como se relacionam | Risco |
|----------|----------|-------------------|-------|
| MOD-XXX | MOD-YYY | *(compartilham dados / chamadas de API)* | *(conflitos de merge / estado inconsistente)* |

---

<!-- id: dlv-team -->

## 4. Time Recomendado

*(Explique o raciocínio por trás da composição sugerida. Por que esse número de pessoas? Por que essa divisão? O que acontece se colocar mais gente? 2–3 parágrafos.)*

Adicionar mais pessoas nem sempre acelera o projeto. Existe um ponto ótimo a partir do qual
o custo de comunicação entre as pessoas supera o ganho de produtividade — **o time ótimo para
este projeto é de `N` pessoas por squad** (calculado pela curva de Brooks).

### Composição sugerida

| Squad | Tipo | Tamanho | O que faz | Carga de responsabilidades |
|-------|------|---------|-----------|---------------------------|
| SQUAD-001 | Desenvolvimento | `N` | *(descreva em linguagem simples)* | 🟢 OK / 🟡 Alta / 🔴 Excessiva |
| PLATFORM-001 | Plataforma | `N` | *(infraestrutura, auth, observability)* | 🟢/🟡/🔴 |

> **Carga de responsabilidades (Cognitive Load):** mede o quanto cada squad está sobrecarregada
> com módulos, integrações e dependências. Acima de 7 começa a impactar qualidade e velocidade.
> Acima de 9 é obrigatório dividir a squad ou criar apoio especializado.

### Sanidade de headcount (cross-check com a base bottom-up)

*(Preencher SOMENTE quando há `effortHours`. Confronta o headcount **derivado de esforço** top-down (`team_size_ideal = esforço ajustado ÷ prazo`) com o `team_sanity` ancorado na base bottom-up (`soma das horas ÷ p50`). NÃO é o `optimal_team_size` de Brooks — esse é a recomendação de time e não é o que infla. É o guard contra dimensionamento inflado por esforço.)*

| Fonte | Headcount | Base |
|-------|-----------|------|
| Top-down por esforço (`team_size_ideal`) | `N` | esforço ajustado (HDF×EMs) ÷ prazo |
| Bottom-up (`team_sanity`) | `M` | soma das horas das tarefas ÷ p50 |
| Recomendação (Brooks, `optimal_team_size`) | `K` | curva de comunicação — referência de time |

*(Se `N > 2 × M` → WARNING `HEADCOUNT_SANITY`: apresentar os dois números, NUNCA o `team_size_ideal` top-down sozinho como recomendação, e ancorar o time no valor reconciliado — tipicamente próximo do bottom-up / de Brooks. Explicar a divergência em linguagem de negócio.)*

### O que o time precisa que ainda não tem

*(Liste as competências que estão em falta e o que isso significa para o cronograma.)*

| Competência necessária | Cobertura atual | Impacto se não resolver | O que fazer | Urgência |
|------------------------|-----------------|------------------------|-------------|----------|
| *(ex: Geoespacial/PostGIS)* | XX% | `+N dias no prazo` | *(contratar / parceiro / treinamento)* | Antes do Sprint 1 |

### O alinhamento entre squads e arquitetura

*(Explique se a divisão de squads reflete bem a estrutura do software. Se não refletir, gera atrito e retrabalho.)*

**CMI = X,XX** — *(Índice de Desalinhamento Conway: quanto menor, melhor. Abaixo de 0,25 está ótimo; acima de 0,40 recomenda-se reorganizar.)*

*(Descreva o que está desalinhado e o que fazer a respeito, se aplicável.)*

---

<!-- id: dlv-forecast -->

## 5. Forecast e Confiança

*(Explique o que o modelo probabilístico revelou. Como chegamos nesses números? O que eles representam? 2 parágrafos antes das tabelas.)*

O forecast foi calculado simulando o projeto **10.000 vezes** com variações aleatórias de
velocidade do time, para chegar numa distribuição de prazos. O prazo P85 significa: "em
85 de cada 100 simulações, o projeto terminou antes desta data."

### Cenários de prazo e custo

| Cenário | Prazo | Data de entrega | Custo | Quando usar |
|---------|-------|-----------------|-------|-------------|
| Otimista (P15) | `XX dias` | YYYY-MM-DD | `R$ XXX` | Referência interna — não comprometa com stakeholders |
| **Provável (P50)** | **`XX dias`** | **YYYY-MM-DD** | **`R$ XXX`** | **Planejamento interno e alocação de recursos** |
| Seguro (P85) | `XX dias` | YYYY-MM-DD | `R$ XXX` | **Compromisso com stakeholders e contratos** |
| Pessimista (P95) | `XX dias` | YYYY-MM-DD | `R$ XXX` | Reserva de contingência orçamentária |

*(Se modo IA ativado, adicionar tabela comparativa:)*

### Comparativo: time humano vs. IA-assistida (spec-implement)

*(Explique em 1 parágrafo o que muda no cenário IA: quem faz o quê, como o custo é diferente.)*

| | Convencional | IA-assistida | Diferença |
|-|-------------|-------------|-----------|
| Prazo P50 | `XX dias` | `XX dias` | `XX% mais rápido` |
| Prazo P85 | `XX dias` | `XX dias` | — |
| Custo P50 | `R$ XX` | `R$ XX` | `XX% mais barato/caro` |
| Time necessário | `N devs + 0 orquestradores` | `N orquestradores + 0 devs` | — |
| Principais riscos IA | — | *(tarefas de integração, lógica complexa)* | — |

> **O que é caro na IA:** tokens de LLM + tooling (Cursor) + infraestrutura de agentes.
> **O que é barato na IA:** salários de desenvolvedor (substituídos por orquestradores).
> **O que não muda:** o caminho crítico e as dependências entre tarefas.

### Nossa confiança — DCI detalhado

**DCI = XX/100 🟢/🟡/🟠/🔴**

*(Explique em linguagem simples por que a confiança está nesse nível. Qual componente está puxando para baixo?)*

| O que mede | Peso | Resultado | Contribuição |
|------------|------|-----------|--------------|
| Consistência do forecast (P95 vs P50) | 30% | `XX%` | `+XX pts` |
| Ausência de gargalos críticos | 20% | `XX%` | `+XX pts` |
| Saúde do time (carga de responsabilidades) | 20% | `XX%` | `+XX pts` |
| Estabilidade da arquitetura | 15% | `XX%` | `+XX pts` |
| Risco de dependências externas | 10% | `XX%` | `-XX pts` |
| Risco de questões em aberto | 5% | `XX%` | `-XX pts` |

### Registro de riscos

| # | Risco | Probabilidade | Se acontecer, atrasa | O que fazer | Responsável |
|---|-------|--------------|---------------------|-------------|-------------|
| 1 | *(descrição em linguagem de negócio)* | XX% | `+N dias` | *(ação)* | *(owner)* |

### O que mais impacta o prazo (análise de sensibilidade)

Se você pudesse resolver apenas 3 problemas antes do Sprint 1, estes são os que mais reduzem o prazo:

1. **[Problema]** → resolvendo isso, o prazo P85 reduz `N dias`
2. **[Problema]** → resolvendo isso, o prazo P85 reduz `N dias`
3. **[Problema]** → resolvendo isso, o prazo P85 reduz `N dias`

---

<!-- id: dlv-recommendations -->

## 6. Plano de Ação

> Esta seção é um **plano priorizado** — não uma lista de sugestões. As ações estão em ordem
> de impacto no prazo e na confiança da estimativa.

### Ações imediatas (antes do Sprint 1)

| # | O que fazer | Por que é urgente | Quem faz | Esforço |
|---|-------------|-------------------|----------|---------|
| 1 | *(ação clara e concreta, verbo imperativo)* | *(impacto em dias se não fizer)* | *(owner)* | S / M / L |
| 2 | | | | |
| 3 | | | | |

> Esforço: **S** = menos de 1 dia · **M** = 2 a 5 dias · **L** = mais de 1 semana

### Ações de curto prazo (Sprint 1–2)

| # | O que fazer | Impacto esperado | Quem faz | Esforço |
|---|-------------|-----------------|----------|---------|
| 1 | | | | |

### Decisões de negócio pendentes que bloqueiam o projeto

*(Liste aqui as questões em aberto que dependem de decisão do cliente/negócio — não de tecnologia.
Se a questão já existir como GAP registrado em `gaps.md`, referencie o GAP-XXX existente. Se for
uma questão nova identificada durante esta estimativa — por exemplo, insumo ausente ou incompleto —
NÃO invente um novo GAP-XXX: registre-a na tabela «Questões em aberto» da §7 e recomende rodar
`spec-iterate` para formalizá-la.)*

| Questão | Impacto se não decidir | Prazo para decidir | Quem decide |
|---------|----------------------|--------------------|-------------|
| *(descrição simples — referenciar GAP-XXX existente quando aplicável)* | `+N dias` | *(antes do Sprint X)* | *(stakeholder)* |

### Próximos passos para recalibrar a estimativa

| Quando | O que fazer |
|--------|-------------|
| Após Sprint 1 | Re-rodar `spec-estimate` com dados reais de velocidade do time — a confiança vai subir significativamente |
| Se escopo mudar | Acionar `spec-iterate` antes de re-estimar — mudanças de requisito invalidam este forecast |

---

<!-- id: dlv-warnings -->

## 7. Avisos Técnicos

*(Para o leitor técnico — lista de alertas do sistema de validação da skill que não bloquearam a geração mas merecem atenção.)*

| Aviso | O que significa | O que fazer |
|-------|----------------|-------------|
| *(código do aviso)* | *(explicação em linguagem simples)* | *(ação sugerida)* |

### Questões em aberto <!-- id: open-questions -->

*(Insumo ausente, incompleto ou ambíguo encontrado durante esta estimativa. Esta skill NUNCA
cria um novo GAP-XXX — questões novas ficam registradas aqui até serem formalizadas via
`spec-iterate`. Ver a referência `task-pipeline.md` da metodologia para o vocabulário e as
convenções da cadeia técnica.)*

| # | Pergunta | Evidência/contexto | Bloqueia próxima fase? |
|---|----------|---------------------|------------------------|
| 1 | *(o que precisa ser esclarecido/decidido)* | *(artefato/seção onde o insumo faltou ou ficou ambíguo)* | Sim/Não |

---

<!-- id: dlv-traceability -->

## 8. Rastreabilidade (para auditoria)

*(Esta seção é para o time técnico auditar de onde veio cada número. O leitor executivo pode ignorar.)*

| Métrica | De onde veio |
|---------|-------------|
| Prazo P50/P85/P95 | Monte Carlo 10.000 iterações · throughput baseline: *(history/cold-start)* |
| Esforço total | `tasks.json` durationEstimatedDays × multiplicadores EM |
| DCI | Composição das 4 camadas de análise · componente limitante: *(nomear)* |
| Gargalos | `tasks.json` + dependências inferidas de `api-contracts.yaml` e `data-model.json` |
| Composição de squads | Curva de Brooks (n* = √(p/k)) + Cognitive Load por módulo |
| Riscos | `gaps.md` (questões abertas) + bottlenecks identificados + gaps de competência |

---

## 9. Parâmetros de calibração

*(Decisões tomadas no kickoff — registradas para reprodutibilidade.)*

- **Throughput baseline:** `history | reference-class | cold-start`
- **Custo/engenheiro-mês:** `R$ XX.XXX`
- **Apetite de risco:** `conservador | balanceado | agressivo`
- **Modo de implementação:** `convencional | ia-assistida | ambos`
- *(Se IA:)* **Custo de tokens/task:** `R$ X,XX` · **Tooling/mês:** `R$ X.XXX`
- **Simulações Monte Carlo:** 10.000
- **Data de início assumida:** YYYY-MM-DD
- **Gerado em:** YYYY-MM-DD por `spec-estimate` Fase 8.5

---

*Para reprocessar: invocar `spec-estimate` com `tasks.json` atualizado e/ou `delivery-history.json`.
Mudanças de escopo (novos requisitos, RNs alteradas) devem passar por `spec-iterate` antes de re-estimar.*
