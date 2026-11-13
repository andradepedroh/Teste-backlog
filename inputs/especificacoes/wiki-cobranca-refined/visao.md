# Visão — Cobrança Inteligente
> Camada de Intenção · Spec-Driven Development
> Pergunta-mãe: *Quem somos, para quem, com que vocabulário e sob quais leis?*

Documento canônico da Camada de Intenção do produto **Cobrança Inteligente** (P2.6 — *Sistema de Cobrança Implantado*, SEFAZ-MT / Profisco II). Consolida em três capítulos a descrição do produto-alvo: **Produto** (quem somos e para quem), **Glossário** (qual é o vocabulário) e **Regras & Métricas** (quais são as leis e como nos medimos). As fontes que sustentam cada afirmação estão agrupadas na seção "Fontes", ao final.

> **Convenção de marcadores.** Inferências marcadas com `*(inferência)*`; lacunas com `⚠ NÃO IDENTIFICADO — definir: <pergunta>`. IDs (`JTBD-NN`, `RN-NN`, `RN-AI-NN`, `IM-NN`) são estáveis e referenciados pela Camada de Requisitos — não renumerar.

---

## 1. Produto

> *Quem somos e para quem?*

### Visão

A **Cobrança Inteligente** é a plataforma única de gestão da cobrança administrativa do crédito tributário da SEFAZ-MT. Ela substitui um modelo fragmentado — débitos espalhados entre Conta Corrente Fiscal, MPI, IPVA, ITCD, SNE e planilhas, integrados manualmente e sem visão única do contribuinte — por um sistema que **consolida débitos de múltiplas fontes, qualifica a carteira por regras parametrizáveis e risco, executa réguas de cobrança automatizadas e multicanal, distribui a cobrança qualificada entre atendentes com dossiê centralizado, e mensura em tempo real a efetividade da cobrança** (incluindo a causalidade entre ação e regularização, via grupo de controle).

A transformação que promove: sair de uma cobrança reativa, empírica e de baixo alcance, para uma cobrança **proativa, segmentada, auditável e mensurável**, que maximiza a recuperação de crédito por contribuinte e minimiza o custo da cobrança massiva. O produto é implantado sobre a plataforma **ServiceNow** *(inferência — modelo de execução do Profisco II adota ServiceNow para todos os produtos)*.

### Proposta de Valor

Para a **equipe de cobrança da SEFAZ-MT** (coordenação e atendentes da CPRF) que hoje opera a cobrança de forma fragmentada, manual e sem base analítica, a **Cobrança Inteligente** é uma **plataforma de gestão e automação da cobrança** que consolida toda a carteira em uma visão única, automatiza as réguas de comunicação e instrumentaliza a cobrança qualificada com dossiê e indicadores. Diferente do mosaico atual de sistemas legados e planilhas, ela entrega **rastreabilidade ponta a ponta do ciclo do crédito** e **decisão baseada em dados**.

Diferenciais:

- **Visão única do contribuinte** — toda a carteira (ICMS, IPVA, ITCD, parcelamentos) consolidada por contribuinte, independente do sistema de origem.
- **Réguas automatizadas e multicanal** — disparo sem confirmação manual, com escalonamento progressivo por comportamento e canais e-mail/SMS/WhatsApp (opt-in).
- **Qualificação parametrizável e auditável** — critérios de formação de carteira configuráveis e versionados, deixando de depender do conhecimento tácito do coordenador; preparado para incorporar o score de liquidez da UFMT.
- **Dossiê centralizado** — histórico completo do contribuinte (débitos, parcelamentos, contatos, notificações coercitivas) em tela única, antes do contato qualificado.
- **Mensuração causal** — grupo de controle automático e atribuição da origem da regularização (ativa vs. espontânea), permitindo medir o efeito incremental da cobrança.

### Personas

#### Persona 1 — Coordenador de Cobrança

**Quem é.** Gestor da coordenadoria de cobrança (CPRF). Responsável por definir a estratégia de cobrança, parametrizar as carteiras e réguas, distribuir o trabalho da equipe e prestar contas dos resultados (KPIs por tributo, canal e instrumento).

**Contexto de uso.** Define e versiona os critérios de qualificação da carteira e os modelos de régua; acompanha painéis institucionais; ajusta a estratégia a cada ciclo com base na efetividade observada; configura o grupo de controle.

**Dores.**
- Seleção da carteira qualificada baseada em conhecimento empírico, não auditável nem replicável.
- Distribuição manual da carteira via planilhas e Google Drive.
- Falta de visão gerencial em tempo real; KPIs dependem de extração e cruzamento manual.
- Disparo de cobrança exige confirmações manuais em lote; sem régua estruturada.
- Grupo de controle montado por sorteio manual, sem cálculo sistemático do efeito incremental.

#### Persona 2 — Atendente de Cobrança

**Quem é.** Servidor da equipe de cobrança qualificada, que conduz o atendimento individualizado dos contribuintes da carteira.

**Contexto de uso.** Recebe casos distribuídos automaticamente; consulta o dossiê do contribuinte antes do contato; registra interações e andamentos; acompanha o status de regularização e parcelamento dos seus casos.

**Dores.**
- Precisa consultar múltiplos sistemas (CCF, SNE, SUCOM) para montar o histórico do contribuinte antes de um contato.
- Risco de abordar contribuinte que já regularizou (status atualizado apenas em "foto mensal").
- Histórico de interações disperso, sem registro estruturado por caso.

#### Persona 3 — Contribuinte — fora do escopo (ator externo)

O **contribuinte** (pessoa física ou jurídica) é o destinatário das notificações e o sujeito do crédito, mas **não é usuário da plataforma**. Ele interage de forma indireta: recebe comunicações das réguas (e-mail/SMS/WhatsApp), regulariza ou parcela débitos nos canais próprios da SEFAZ, e gere seu opt-in de mensageria. Sua experiência é endereçada pela qualidade e cadência das comunicações, não por telas do produto.

#### Persona 4 — Cientista/parceiro do modelo de score (UFMT) — fora do escopo de operação

A **UFMT** desenvolve, por convênio, o **score de liquidez** (probabilidade de recuperação). O produto **consome** o score como insumo de priorização, mas o desenvolvimento e a recalibração do modelo ocorrem fora da plataforma *(inferência — convênio externo)*; a feature de scoring no produto trata da **integração e do uso** do score, não de sua construção.

### Jobs / Necessidades

- **JTBD-01** — Quando há débitos espalhados por vários sistemas, quero consolidá-los automaticamente em uma carteira única por contribuinte, para enxergar o ciclo do crédito sem varredura manual.
- **JTBD-02** — Quando preciso decidir quem cobrar e como, quero qualificar e segmentar a carteira por critérios parametrizáveis (valor, tributo, atraso, perfil, risco/score), para que a seleção seja auditável e replicável.
- **JTBD-03** — Quando um lote de devedores precisa ser comunicado, quero disparar réguas automatizadas e escalonadas por múltiplos canais, para maximizar o retorno minimizando o esforço manual.
- **JTBD-04** — Quando atendo um contribuinte da carteira qualificada, quero acessar um dossiê centralizado e registrar as interações em um caso, para conduzir a cobrança com contexto completo e histórico rastreável.
- **JTBD-05** — Quando a carteira qualificada cresce, quero que os casos sejam distribuídos automaticamente entre atendentes por regras e prioridade, para eliminar a planilha e equilibrar a carga.
- **JTBD-06** — Quando presto contas da cobrança, quero painéis com KPIs em tempo real e a origem da regularização, para decidir com dados e medir o efeito incremental via grupo de controle.
- **JTBD-07** — Quando um contribuinte regulariza durante um ciclo, quero que o status atualize quase em tempo real e o caso encerre, para não abordá-lo novamente.

### Não-objetivos

- **Desenvolver o modelo de score de liquidez.** A construção/recalibração do modelo é da UFMT; o produto integra e usa o score (RN-AI-01).
- **Inscrição em dívida ativa e execução fiscal.** O produto trata da cobrança **administrativa**; o encaminhamento à PGE/PAT e o contencioso ficam em outros produtos da Receita Digital (2.4 Contencioso) e na PGE.
- **Operação dos instrumentos coercitivos** (protesto, cautelar fiscal, negativação, etc.). São lacunas estratégicas mapeadas, concentradas em outras áreas/PGE; o produto pode **sinalizar** elegibilidade no dossiê, mas não os executa. ⚠ NÃO IDENTIFICADO — definir: escopo de coerção dentro do produto.
- **Portal/autoatendimento do contribuinte.** O contribuinte recebe comunicações e regulariza em canais próprios, não em telas deste produto.
- **Cadastro-base do contribuinte.** A qualidade cadastral e a base de contatos vêm do produto 2.2 (B-Cadastro/Big Data); a Cobrança Inteligente consome, não mantém o cadastro mestre.

---

## 2. Glossário

> *Qual é o vocabulário?*

### Termos do domínio

#### Atendente
**Definição**: Servidor da equipe de cobrança qualificada que conduz o atendimento individualizado de contribuintes que lhe foram distribuídos.
**Sinônimos a evitar**: "operador" (genérico), "agente".
**Exemplo**: O atendente abre o dossiê antes de ligar para o contribuinte.

#### Carteira
**Definição**: Conjunto de débitos/contribuintes selecionados para uma ação de cobrança, formado pela aplicação de critérios de qualificação. Pode ser **massificada** (lote, comunicação automatizada) ou **qualificada** (atendimento individualizado).
**Sinônimos a evitar**: "base" (designa a totalidade de débitos, não o recorte).
**Exemplo**: A carteira qualificada de ICMS deste ciclo tem 1.200 contribuintes acima de R$ 500 mil.

#### Cobrança Massificada
**Definição**: Eixo de atuação centrado no grande volume de contribuintes, com foco em prevenção e autorregularização, via comunicação automatizada e ações em lote (réguas). Minimiza o custo da cobrança.
**Sinônimos a evitar**: "cobrança em massa" (use "massificada").
**Exemplo**: A régua de IPVA dispara lembretes massificados antes do vencimento.

#### Cobrança Qualificada
**Definição**: Eixo de atuação centrado nos grandes/contumazes devedores, com foco em investigação, dossiê, atendimento individualizado e coerção. Maximiza o retorno por contribuinte.
**Sinônimos a evitar**: "cobrança ativa" (no MT, o que se chama "qualificada" hoje se assemelha à cobrança ativa; padronizar como "qualificada").
**Exemplo**: O caso entrou na cobrança qualificada por débito acima do limite e bom histórico de recuperação.

#### Conta Corrente Fiscal (CCF)
**Definição**: Sistema legado que registra a situação dos débitos do contribuinte; fonte primária do status de regularização e de parcelamentos.
**Sinônimos a evitar**: "conta corrente" sem qualificar.
**Exemplo**: A consulta diária ao CCF detecta a regularização e encerra o caso.

#### Débito
**Definição**: Crédito tributário em aberto devido por um contribuinte, identificado por tributo, valor, vencimento e instrumento de constituição.
**Sinônimos a evitar**: "dívida" (reservar para "dívida ativa").
**Exemplo**: O débito de ICMS foi consolidado a partir do MPI.

#### Dossiê
**Definição**: Visão consolidada e estruturada de um contribuinte para uso na cobrança qualificada: débitos, parcelamentos, histórico de contatos, notificações e sinalizações coercitivas, montado automaticamente a partir de múltiplas fontes.
**Sinônimos a evitar**: "ficha", "prontuário".
**Exemplo**: O dossiê mostra notificações coercitivas ativas em outra coordenadoria.

#### Grupo de Controle
**Definição**: Subconjunto de contribuintes elegíveis deliberadamente **não** submetidos à ação de cobrança, sorteado para permitir medir o efeito incremental (causal) da cobrança.
**Sinônimos a evitar**: "amostra".
**Exemplo**: ~500 elegíveis ficam no grupo de controle por ciclo.

#### Macroprocesso
**Definição**: Agrupamento de processos da cobrança. No produto: Identificação e Qualificação de Débitos, Cobrança Massificada, Cobrança Qualificada, Indicadores e Monitoramento.
**Sinônimos a evitar**: "módulo".
**Exemplo**: A régua pertence ao macroprocesso de Cobrança Massificada.

#### MPI
**Definição**: Sistema legado de varredura/identificação de débitos, em descontinuação — será substituído pelo **Big Data** (produto 2.2). A integração deve contemplar a transição.
**Sinônimos a evitar**: —.
**Exemplo**: As regras de elegibilidade hoje no MPI migrarão para o Big Data.

#### Opt-in
**Definição**: Consentimento estruturado do contribuinte para receber comunicações por um canal (notadamente WhatsApp), com gestão de opt-out e logs.
**Sinônimos a evitar**: "aceite".
**Exemplo**: O disparo via WhatsApp respeita o opt-in vigente.

#### Régua de Cobrança
**Definição**: Instrumento que consolida, para um perfil de devedor/dívida, a sequência temporal de ações de comunicação (cadência, periodicidade, canais, critérios de segmentação e escalonamento) ao longo do ciclo.
**Sinônimos a evitar**: "fluxo de e-mail" (a régua é multicanal e condicional).
**Exemplo**: A régua do ICMS Contas-Declaração envia lembrete -5d, -2d, 0d e notificação +15d.

#### Score de Liquidez
**Definição**: Estimativa (modelo da UFMT) da probabilidade de recuperação/capacidade de pagamento de um débito/contribuinte, usada como critério de priorização da carteira.
**Sinônimos a evitar**: "rating" (relacionado, mas o termo do convênio é "score de liquidez").
**Exemplo**: O score prioriza a fila do atendente.

#### SNE / DT-e
**Definição**: Sistema de Notificação Eletrônica (SNE) e Domicílio Tributário Eletrônico (DT-e) — canal oficial de notificação e de ciência do contribuinte. Hoje, baixa abertura limita a efetividade.
**Sinônimos a evitar**: —.
**Exemplo**: A régua usa canais diretos (e-mail/WhatsApp) sem depender só do DT-e.

### Convenções de nomenclatura

1. **Massificada vs. Qualificada**: usar sempre "cobrança massificada" e "cobrança qualificada"; não usar "ativa".
2. **Débito vs. Dívida**: "débito" = crédito em aberto na cobrança administrativa; "dívida ativa" = pós-inscrição (fora do escopo).
3. **Carteira vs. Base**: "carteira" = recorte qualificado para ação; "base" = totalidade consolidada de débitos.
4. **Régua vs. Notificação**: "régua" = sequência configurada de ações; "notificação"/"comunicação" = um disparo individual da régua.
5. **Caso**: instância de cobrança qualificada associada a um contribuinte e a um atendente (a unidade de trabalho do atendente).

---

## 3. Regras & Métricas

> *Quais são as leis do produto, e como saber se ele cumpre a missão?*

### Regras de Negócio

#### RN-01 — Consolidação por contribuinte
**Enunciado**: Débitos de fontes distintas (CCF, MPI/Big Data, IPVA, ITCD, SNE) que pertencem ao mesmo contribuinte (mesmo CPF/CNPJ) são vinculados a uma única visão de contribuinte; a duplicidade entre fontes é resolvida por regra de sobreposição.
**Justificativa**: Visão única é a base de toda a operação.
**Impacta**: Ingestão, Dossiê, Carteira.

#### RN-02 — Atualização intraciclo de regularização
**Enunciado**: O status de regularização/parcelamento é atualizado periodicamente (diária *(inferência)*) durante o ciclo; ao detectar regularização, o caso/ação correspondente é encerrado e o contribuinte não é mais abordado naquele ciclo.
**Justificativa**: Evita abordar quem já regularizou; substitui a "foto mensal".
**Impacta**: Réguas, Cobrança Qualificada, Monitoramento.

#### RN-03 — Critérios de qualificação parametrizáveis e versionados
**Enunciado**: A formação de carteira usa critérios configuráveis (valor mínimo, tributo, tempo de atraso, instrumento, exclusões como contumazes, perfil/risco); cada conjunto de critérios é versionado e auditável, sem depender de conhecimento tácito.
**Justificativa**: Seleção auditável e replicável.
**Impacta**: Qualificação da Carteira.

#### RN-04 — Separação massificada vs. qualificada
**Enunciado**: A carteira é dividida automaticamente entre abordagem massificada e qualificada por critérios de valor, risco e histórico; um contribuinte segue um único eixo por ciclo. ⚠ NÃO IDENTIFICADO — definir: regra de desempate quando o contribuinte se enquadra nos dois.
**Justificativa**: Estratégias e custos distintos por eixo.
**Impacta**: Qualificação, Réguas, Cobrança Qualificada.

#### RN-05 — Escalonamento progressivo da régua
**Enunciado**: As ações da régua escalonam conforme o comportamento do contribuinte (sem resposta → renotificação → intensificação; com regularização → encerramento), respeitando a cadência temporal configurada.
**Justificativa**: Aumenta a percepção de risco e a efetividade.
**Impacta**: Réguas.

#### RN-06 — Consentimento de canal (opt-in)
**Enunciado**: Disparos por WhatsApp (e demais canais sujeitos a consentimento) só ocorrem para contribuintes com opt-in vigente; opt-out é respeitado imediatamente e registrado.
**Justificativa**: Base legal e relacionamento.
**Impacta**: Réguas, Gestão de canais.

#### RN-07 — Distribuição automática equilibrada
**Enunciado**: Casos da carteira qualificada são distribuídos automaticamente entre atendentes por regras (ex.: vínculo contador↔atendente, balanceamento de carga, prioridade por score/estágio), sem montagem manual de planilhas.
**Justificativa**: Elimina planilha; equilibra carga.
**Impacta**: Cobrança Qualificada.

#### RN-08 — Rastreabilidade da origem da regularização
**Enunciado**: Toda regularização é marcada quanto à origem — espontânea vs. resposta à cobrança (por canal/instrumento) — permitindo atribuição causal.
**Justificativa**: Mensurar efeito da cobrança.
**Impacta**: Monitoramento, Réguas.

#### RN-09 — Grupo de controle
**Enunciado**: Um subconjunto de elegíveis é sorteado automaticamente para o grupo de controle (não cobrado) por ciclo; sua taxa de regularização é comparada à da carteira cobrada para calcular o efeito incremental.
**Justificativa**: Causalidade da cobrança.
**Impacta**: Qualificação, Monitoramento.

#### RN-10 — Trilha de auditoria de ações e configurações
**Enunciado**: Toda ação relevante (disparo, distribuição, alteração de regra/régua, encerramento de caso, registro de interação) é registrada com ator, data/hora e payload, de forma imutável.
**Justificativa**: Cobrança auditável e defensável.
**Impacta**: Todas as features.

#### RN-11 — Visibilidade por perfil
**Enunciado**: O coordenador tem visão completa (toda a carteira, comparativos, KPIs); o atendente tem visão individual (sua carteira/casos), não comparativa entre atendentes.
**Justificativa**: Governança e privacidade interna.
**Impacta**: Monitoramento, Cobrança Qualificada.

#### RN-12 — Continuidade de fonte na transição MPI→Big Data
**Enunciado**: A identificação de débitos deve permanecer operante na transição do MPI para o Big Data (P2.2); as regras de elegibilidade são mapeadas na nova fonte sem ruptura da carteira.
**Justificativa**: MPI será descontinuado.
**Impacta**: Ingestão.

### Regras dependentes de IA

#### RN-AI-01 — Priorização por score de liquidez
**Enunciado**: Quando disponível, o score de liquidez da UFMT (probabilidade de recuperação/capacidade de pagamento) é consumido como variável parametrizável na qualificação da carteira e na priorização da fila do atendente, com threshold configurável pelo coordenador.
**Justificativa**: Substituir progressivamente a seleção empírica por base analítica.
**Fallback**: Na ausência/indisponibilidade do score, a qualificação e a priorização operam apenas com os critérios determinísticos de RN-03 (valor, atraso, histórico, etc.); o caso é tratado como "sem score".
**Impacta**: Qualificação da Carteira, Cobrança Qualificada, Scoring.

> Observação: o **escalonamento** da régua (RN-05), a **segmentação** (RN-03/RN-04), o **grupo de controle** (RN-09) e a **atribuição de origem** (RN-08) são lógica **determinística** — não entram aqui.

### Métricas de sucesso

**North Star Metric (NSM): Crédito tributário recuperado atribuível à cobrança.**

```
NSM = Σ valor regularizado atribuído à ação de cobrança (por tributo, canal, instrumento)
      / Σ valor da carteira acionada
      — líquido do baseline do grupo de controle (efeito incremental)
```

Conta no numerador o valor regularizado por contribuintes acionados, marcado como resposta à cobrança (RN-08), descontada a taxa de regularização espontânea observada no grupo de controle (RN-09). Atribuição: regularização em até 30 dias da comunicação (regra geral) *(inferência — convenção das réguas EloGroup)*.

**Cadência.** Por ciclo de cobrança e consolidação mensal.

**Por que esta métrica.** Traduz a missão (recuperar crédito) e, ao descontar o grupo de controle, distingue **efeito da cobrança** de regularização que ocorreria de qualquer forma.

**Baseline de referência.** Histórico de quitação: ICMS Normal ~30,9% / ICMS ST ~22,5%; taxa de retorno de réguas em referência EloGroup ~5,15% (valor pago em até 30 dias). *(inferência — números de carteira/benchmark, não meta imposta.)*

**Guard-rails**

- **IM-01 — Taxa de regularização espontânea (grupo de controle).** Mantida para isolar o efeito incremental; queda relativa do incremental indica perda de efetividade da cobrança.
- **IM-02 — Reclamações/opt-out por canal.** Não deve crescer enquanto a NSM é otimizada; mede pressão excessiva ou comunicação inadequada.

---

## Questões em aberto

- ⚠ Escopo dos instrumentos coercitivos dentro do produto (sinalizar vs. operar).
- ⚠ Regra de desempate massificada↔qualificada para contribuinte elegível a ambos (RN-04).
- ⚠ Periodicidade exata da consolidação/atualização intraciclo (diária assumida).
- ⚠ Confirmação de que a plataforma-alvo é ServiceNow para todos os módulos.
- ⚠ Janela de atribuição causal definitiva (30 dias assumido) e modelo de atribuição por canal.

---

## Fontes

- **Cap. 1 (Produto/Personas/Jobs)**: "[SEFAZ-MT] Executivo Cobrança", "Desenho Solução de Cobrança (Interno)", "Diagnóstico de Situação Atual - Cobrança", "Levantamento de Necessidades - 2.6 Cobrança", "Executivo Soluções" (seção 2.6).
- **Cap. 2 (Glossário)**: "DECK Cobrança Inteligente - Estratégia Digital", "Diagnóstico de Situação Atual - Cobrança".
- **Cap. 3 (Regras & Métricas)**: "Planning_Poker_dados" (Produto 6 — Sistema de Cobrança, US 1-14), "Potenciais oportunidades - P2.6", réguas/retorno do DECK.

## Relacionado
- [Blueprint](blueprint.md)
- [Modelo de dados (transversal)](modelo-dados.md)
- [Requisitos transversais](requisitos-transversais.md)
- [Telas comuns (arquétipos)](telas-comuns.md)
- [Índice do wiki](index.md)

---

*Camada de Intenção. Documento canônico — descreve o produto-alvo: quem é, com que vocabulário e sob quais leis.*
