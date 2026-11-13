---
name: spec-ingest
description: >
  spec-ingest (Fase 2 — Ingestão) — Ingestão micro obrigatória: lê inputs/ e texto do chat; extrai fatos atômicos F-xxx com âncora obrigatória; INF-xxx para inferências; NCR para itens sem classificação; tabela de números/datas/SLAs; contradições entre fontes; candidatos a domínio com evidência F-xxx. Consolida a narrativa em discovery-document.md (problema central, atores, sistemas existentes, contexto organizacional, contradições) — espelho fiel do que foi ouvido, sem priorização nem metas (isso pertence ao spec-product). Suporta modo delta: se context-map.md já existe, só adiciona novas fontes e re-cruza contradições. Proíbe resumo vago que substitua a fonte. Ao final avalia a qualidade do insumo (clareza do problema, atores, densidade evidencial, integrações, métricas/SLAs, contradições, pedidos) e reporta no chat um resumo + nota de prontidão e maiores lacunas. Saídas: outputs/spec/context-map.md + outputs/spec/discovery-document.md.
version: "1.3"
updated: "2026-09-10"
---

# spec-ingest — Ingestão e Mapa de Contexto

---

## Modo de execução

Esta skill opera em dois modos. **Determinar o modo antes de iniciar:**

### Modo inicial (primeira execução)

`context-map.md` **não existe** em `outputs/spec/`. Executar todos os passos 1–8 normalmente.

### Modo delta (execuções subsequentes)

`context-map.md` **já existe**. Neste caso:

1. Ler o `context-map.md` e o `sync-log.md` existentes para entender o estado atual
2. Identificar quais fontes já foram processadas (ver tabela de inventário existente)
3. Processar **apenas as fontes novas** — adicionar novas seções `### Fonte:` ao `context-map.md` existente (não reescrever o arquivo)
4. Re-executar os Passos 3-7 com o conjunto completo de F-xxx; nas tabelas consolidadas (cruzamento de fontes, números/datas, candidatos a domínio, sistemas/atores, questões em aberto), adicionar linhas novas e marcar as alteradas com `(delta YYYY-MM-DD)`
5. **Atualizar** as seções afetadas do `discovery-document.md` — não reescrever seções que não mudaram
6. No cabeçalho de ambos os arquivos, atualizar `Última atualização` e `Fontes`

**Regra do modo delta:** o agente nunca reescreve F-xxx já existentes. Só adiciona, cruza e atualiza.

---

## Papel

Capturar **o máximo de informação de negócio e técnica** presente nos insumos, **sem substituir
o conteúdo por bullets genéricos**. O `context-map.md` é a memória bruta estruturada do projeto —
é a única fonte de verdade para rastreabilidade de todos os artefatos que vêm depois.

O `discovery-document.md` é um **espelho fiel do que foi ouvido** — não uma proto-visão de produto.
Priorização, metas e escopo pertencem ao `spec-product`. Aqui só entra o que as fontes dizem.

**Regra de ouro:** se alguém ler o `legacy.md` futuro e perguntar "de onde veio este fato?",
a resposta deve ser `F-xxx` + arquivo + linha/minuto. Se não conseguir responder, a ingestão falhou.

---

## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)

<!-- linguagem-clara:v1 inicio -->
<!-- Bloco canônico. Ao alterar, rodar `python scripts/apply_linguagem_clara.py` para replicar em todas as skills. -->

**Quem lê não é você.** É o desenvolvedor que pegou a task sem ter participado do discovery, o PO
que precisa aprovar, o analista que entrou no time semana passada. Texto correto e ilegível custa
uma reunião — e quem lê desiste e vai perguntar. Escrever difícil não é sinal de rigor: é defeito de
geração, do mesmo peso de um campo obrigatório faltando.

**Alvo verificável:** uma pessoa que nunca viu este projeto entende o que precisa fazer **lendo uma
vez**, sem abrir outro documento e sem precisar procurar o significado de nenhuma palavra.

### As 10 regras

1. **Frase curta, voz ativa, presente.** "O serviço confere o CPF antes de gravar" — não "a
   validação do CPF é realizada previamente à persistência". Alvo: até ~25 palavras por frase, uma
   ideia por frase.
2. **Termo técnico ganha explicação de meia linha na primeira aparição:** "no repository (a classe
   que conversa com o banco)", "um índice único (o banco passa a recusar duplicados sozinho)". Da
   segunda vez em diante, usar o termo puro.
3. **Nenhuma sigla solta.** Expandir na primeira aparição — inclusive as siglas do negócio e as da
   própria metodologia: "IDOR (quando um usuário consegue acessar o registro de outro)",
   "DV (Documento de Visão)", "RN (Regra de Negócio)".
4. **Código de regra ou de requisito nunca substitui o conteúdo dela.** Escrever a regra por extenso
   e pôr o código no fim, entre parênteses: "não deixa cadastrar dois clientes com o mesmo CPF
   (RN-012)". "Implementar a RN-012" não informa nada a quem não tem o documento aberto.
5. **Nome de arquivo, tabela, rota ou classe sempre acompanhado do papel dele.**
   `PedidoService.java` sozinho não diz nada; `PedidoService.java — onde ficam as regras de quando
   um pedido pode ser aprovado` diz. Vale igual para `TB_PEDIDO` e para `POST /pedidos`.
6. **Sem jargão de processo.** "blueprint", "gate", "FATAL", "matriz de cenários", "compact-prose",
   nome de validator, nome de camada de arquitetura: isso é vocabulário interno das skills, não do
   leitor. Traduzir — em vez de "6 cenários da matriz em VERDE", escrever "testei 6 situações, todas
   passaram".
7. **Sem "simplesmente", "basta", "apenas", "trivial", "é só".** Minimizam a dificuldade e afastam
   quem não entendeu de primeira.
8. **Verbo no lugar de substantivo; ativa no lugar de passiva.** "realizar a validação" → "validar";
   "efetuar o cadastramento" → "cadastrar"; "é disponibilizado ao usuário" → "o sistema mostra";
   "deve ser efetuada a persistência" → "grava no banco".
9. **Cenário de teste é uma frase "quando X, o sistema Y"** — nunca o id do cenário, nunca o nome do
   método de teste: "quando o CPF já existe, o sistema recusa e mostra 'CPF já cadastrado'".
10. **Bloco técnico denso abre com uma frase em português dizendo o que ele significa.** Contrato de
    API, colunas de tabela, status HTTP, schema, JSON: o conteúdo continua **completo e preciso** —
    o que muda é que antes dele vem uma linha do tipo "esta rota cria o pedido e devolve o número
    dele; se o CPF não existir, recusa com 404". Precisão técnica e legibilidade não competem: a
    frase de abertura é o mapa, o bloco é o território.

### Antes → depois (referência de tom)

| Complexo (não usar) | Claro (usar) |
|---|---|
| "Implementar validação de unicidade conforme RN-012, com persistência idempotente." | "Impedir o cadastro de dois clientes com o mesmo CPF. Se o CPF já existir, o sistema recusa e mostra 'CPF já cadastrado' — nada é gravado. Se a mesma requisição chegar duas vezes, o resultado é o mesmo da primeira (RN-012)." |
| "A entidade é submetida ao processo de normalização previamente à sua persistência." | "Antes de gravar, o sistema padroniza os dados: tira acento, deixa em maiúscula e remove espaço sobrando." |
| "Realizar o tratamento de exceções no fluxo de integração." | "Se o sistema externo não responder, tentar mais 2 vezes. Se ainda falhar, guardar a solicitação na fila e avisar o usuário que o processamento termina depois." |
| "Garantir a aderência aos padrões arquiteturais definidos." | "Seguir o padrão do projeto: a tela nunca fala direto com o banco, sempre passa pelo serviço." |
| "Disponibilizar endpoint para consulta paginada de pedidos com filtros." | "Criar a busca de pedidos: quem chama informa a página e pode filtrar por cliente, período e situação. A resposta traz 20 pedidos por vez e o total encontrado." |
| "Efetuar refatoração do componente visando redução do acoplamento." | "Separar o componente em dois, para que mudar a regra de desconto deixe de exigir mexer na tela." |

### Como conferir antes de entregar (30 segundos)

1. Leia em voz alta a **primeira frase de cada seção**. Travou a língua? Reescreva.
2. Existe alguma palavra que um analista de primeiro emprego **não usaria numa conversa**? Troque, ou
   explique entre parênteses na primeira aparição.
3. Alguma frase obriga a abrir outro documento para fazer sentido — sigla, código de regra, nome de
   arquivo sem o papel dele? Complete ali mesmo.
4. Algum bloco técnico começa direto no JSON, na tabela ou no YAML? Ponha a frase de abertura.

> **Isto não autoriza cortar conteúdo.** Nenhuma das regras acima permite resumir, omitir campo
> obrigatório ou trocar dado concreto por prosa. Linguagem clara é sobre a **forma**; densidade,
> precisão e auto-suficiência continuam sendo sobre o **conteúdo**. As duas coisas valem juntas.

<!-- linguagem-clara:v1 fim -->

### Aplicação nesta skill

Vale para o `context-map.md` (a redação de cada `F-xxx`), para as 8 seções do `discovery-document.md` e para o resumo do insumo + nota de prontidão reportados no chat. Aqui a regra 6 é dupla: nem jargão de processo, nem jargão técnico genérico — o vocabulário é o **do cliente** ("leva 3 dias para processar pedidos", não "sistema lento").

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | <skill> | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

---

## Política — protótipo de validação (não é legado, não é v1)

Quando `inputs/` contiver **protótipo** (React, Figma, HTML mock, «BD de testes»):

| Verdade | Implicação para o agente |
|---------|---------------------------|
| O protótipo existe para **validar intenção**, jornada e regras de negócio **antes** do desenvolvimento produtivo acordado. | Extrair **intenção normativa/UX** e regras declaradas; gerar `F-xxx` para essas decisões com âncora no arquivo de especificação ou nos mocks **como hipótese de produto**. |
| **Não** é versão v0/v1 do sistema final nem sistema em produção. | **Não** documentar o código do protótipo como AS-IS em `spec-legacy`. **Não** abrir GAPs de produto por lacunas técnicas do mock (auth real, persistência, cliente HTTP, estado de router) — essas pertencem à **fase de engenharia** após aprovação do discovery. |
| Base de dados / mocks são descartáveis. | Nunca inferir modelo de dados definitivo só a partir do protótipo sem decisão explícita do cliente. |

Se o kickoff declarar **sem legado**, menções a sistemas de apoio (ex.: um ERP ou um gestor de processos) ou a fluxos atuais nos documentos entram no `context-map` como **contexto institucional / baseline de substituição**, não como substituto da skill `spec-legacy`.

---

## Política — origem: `frame.md` (hipótese, não fato)

Quando `inputs/` ou `outputs/spec/` contiver **`frame.md`** produzido pelo `spec-frame` (Fase 1),
tratá-lo como uma **fonte especial**: quase tudo ali é hipótese de trabalho do consultor, não fato.
Respeitar as etiquetas do próprio `frame.md`:

| Etiqueta no `frame.md` | Como o `spec-ingest` classifica |
|------------------------|----------------------------------|
| `HIP-xxx` (hipótese de problema, solução ou oportunidade) | Vira `INF-xxx` (inferência) **e** uma linha em `## Questões em aberto` («validar com cliente»). **Nunca** `F-xxx`. |
| `PRB-xxx` (pergunta de levantamento) | Vira `## Questões em aberto`. Não é fato. |
| `FATO` com âncora (um ator real disse/decidiu, relatado pelo consultor) | Vira `F-xxx` normalmente — âncora: `frame.md · relato do consultor · <quem, quando>`. |

**Por que isso importa:** o `frame.md` foi escrito **antes** da ingestão, para organizar o
pensamento. Se as hipóteses dele entrarem como `F-xxx`, a base de evidência fica contaminada com
achismo ancorado em "a gente supôs no enquadramento". Só o que tem fonte externa real (etiqueta
`FATO`) é fato. Na dúvida entre `INF-xxx` e `F-xxx` para um item vindo do `frame.md`, é `INF-xxx`.

O pré-protótipo em `outputs/spec/frame/pre-prototype/` é **esboço descartável** — mesmo tratamento do
protótipo de validação acima: extrair só intenção ou regra declarada como hipótese, nunca como AS-IS.

---

## O que é um fato atômico (`F-xxx`)

Uma linha = **uma** afirmação que:
- Pode ser localizada na fonte (linha, §, minuto de vídeo, "pág. N")
- Não mistura três decisões em um bullet
- Está literalmente na fonte (se não está, é `INF-xxx`)

**Errado:** "Falaram de integração com ERP e melhorias de UX."
**Certo:** `F-012` — "Integração batch noturna com SAP para atualização de estoque." Âncora: `reuniao-01.txt` 00:14:20

---

## O que é proibido

- Marcar GAP para algo que está literalmente na fonte (isso é falha de extração)
- Fundir workshops diferentes sem coluna Fonte distinta
- Inventar fato que não está em nenhuma fonte

---

## Critério de saturação

A extração de uma fonte **termina** quando: **1 passada completa de leitura + 1 passada de revisão SEM produzir nenhum `F-xxx` novo**. Só então a fonte é declarada "extraída" e o agente avança para a próxima. Se a passada de revisão ainda gerar `F-xxx` novo, repetir mais uma passada de revisão até saturar.

---

## Passos de execução (ordem fixa)

### Passo 1 — Inventariar inputs/

Listar e classificar cada arquivo em `inputs/`:

| # | Caminho | Tipo | Tamanho / data | Lido na íntegra? |
|---|---------|------|----------------|------------------|
| 1 | | transcrição / código / doc / diagrama / API | | sim / parcial — porquê |

Texto colado no chat → tratar como fonte `CHAT-YYYYMMDD-N`.

Código/DDL/OpenAPI de **sistema legado real** (kickoff Sim/Parcial) → registrar aqui; dimensão 12 em `spec-legacy`.
Código de **protótipo de validação** → usar só para extrair regra de negócio ou cópia de texto normativo; ver política «Protótipo de validação» acima.

### Fontes visuais e de código (caminho design-first)

Se os inputs incluírem protótipos, Figma, URLs ou código src/:

| Tipo de fonte visual | Como extrair F-xxx |
|---------------------|--------------------|-
| Figma URL | Cada frame/componente com label = F-xxx: "Tela X implementa fluxo Y com estado Z" — âncora: "Figma [nome do frame]" |
| URL navegável | Cada rota visitada = F-xxx descrevendo o comportamento observado — âncora: "URL /rota, sessão YYYY-MM-DD" |
| Código src/ | Cada componente com lógica de negócio (validação, condição, estado) = F-xxx — âncora: "src/Arquivo.tsx linha N" |
| Screenshot | Cada elemento UI que implica regra de negócio = F-xxx — âncora: "screenshot-nome.png região X" |

Fontes visuais produzem INF-xxx mais frequentemente que F-xxx (o que se vê é inferência sobre o que foi decidido). Marcar Confiança como "média" por padrão e listar fundamento visual.

### Passo 2 — Extrair fatos por fonte (codificação aberta)

Para **cada fonte relevante**, criar uma seção `### Fonte: [nome]` contendo:

#### A) Tabela de Fatos atômicos

| ID | Fato (máx. precisão; citação curta se necessário) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Confiança |
|----|----------------------------------------------------|---------------------------|-------------------|-----------| 
| F-001 | | | | alta/média/baixa |
| F-002 | | | | |

Extrair na **ordem de leitura** da fonte (preserva fluxo narrativo na âncora).

Capturar obrigatoriamente:
- Nomes de sistemas, ferramentas, fornecedores
- Números, datas, volumes, SLAs, KPIs, percentuais
- Nomes de papéis, cargos, departamentos
- Fluxos de trabalho descritos (cada passo = um F-xxx)
- Regras negadas ("não pode", "nunca", "obrigatório")
- Dores explicitadas ("demora X dias", "o problema é")
- Decisões já tomadas vs. ainda em aberto
- Integrações entre sistemas
- Contexto organizacional (resistências, campeões, riscos políticos) — usar INF-xxx quando inferido

#### B) Tabela de Inferências (INF-xxx)

Para tudo que **não está literalmente na fonte** mas pode ser deduzido:

| ID | Inferência | Fundamento | Risco se errado |
|----|------------|------------|-----------------|
| INF-001 | | F-xxx que justifica | |

#### C) Verbatim estendido (opcional)

Quando um trecho isolado destruiria o contexto se extraído como F-xxx:

```
[colar bloco citado com âncora]
```

#### D) Itens não classificados (NCR)

Fatos que aparecem na fonte mas não têm domínio claro ainda:

| ID | Texto / fato | Hipótese de domínio |
|----|---------------|---------------------|
| NCR-001 | | |

### Passo 3 — Cruzar fontes

Após extrair todos os F-xxx de todas as fontes:

**Contradições:**

| Tema | Fonte A (F-xxx) | Fonte B (F-xxx) | Como resolver |
|------|-----------------|-----------------|---------------|
| | | | registrar em `## Questões em aberto` ou decisão já tomada |

**Duplicados:** se o mesmo fato aparece em duas fontes, referenciar ambas numa linha.

### Passo 4 — Tabela de números, datas, volumes e SLAs

Nunca perder valores mensuráveis:

| Valor | Contexto | Fonte (F-xxx ou arquivo) |
|-------|----------|--------------------------| 
| | | |

Exemplos do que capturar: "3 dias para processar", "10.000 usuários", "SLA de 99,9%",
"deadline Q2 2026", "R$50k por mês de custo", "2 horas de downtime mensal".

### Passo 5 — Candidatos a domínio de negócio (codificação axial)

**Só após** completar as tabelas por fonte:

| Domínio (nome em vocabulário do cliente) | F-xxx que sustentam | Lacunas |
|------------------------------------------|---------------------|---------| 
| | F-001, F-007, F-023 | |

- Domínio sem evidência → marcar *hipotético* + nota "validar com cliente"
- Usar o vocabulário que o **cliente usa**, não jargão técnico genérico

**Revisão obrigatória dos NCR (itens não classificados):** antes de fechar este passo, revisar todos os `NCR-xxx` registrados no Passo 2.D: promover cada um a `F-xxx` com domínio atribuído (quando a evidência permitir) ou converter em questão do Passo 7. NCR remanescente sem uma dessas duas resoluções = `WARNING` (`NCR_UNRESOLVED`).

### Passo 6 — Sistemas, integrações e atores

**Sistemas e integrações:**

| Nome | Papel no processo | Protocolo / formato de dado | F-xxx |
|------|-------------------|-----------------------------|-------|
| | | | |

**Atores e papéis:**

| Ator / papel | Responsabilidade citada | Frequência de uso | F-xxx |
|--------------|-------------------------|-------------------|-------|
| | | | |

### Passo 6.5 — Candidatos a módulo / capacidade *(opcional)*

**Objetivo:** alimentar o **Passo 3.0** de `spec-product` sem duplicar RF aqui — apenas uma visão consolidada do que as fontes sugerem como **áreas de produto** ou capacidades de alto nível.

Adicionar ao `context-map.md` a seção **«Candidatos a módulo / capacidade»** (template) com:

| Rótulo provisório (capacidade ou módulo de negócio) | Fatos que sustentam (F-xxx) | Colisão com domínio candidato (Passo 5)? | Nota para `spec-product` 3.0 |
|-----------------------------------------------------|------------------------------|--------------------------------------------|------------------------------|
| | F-… | | ex.: fundir com MOD-SD |

- Não numerar como RF; não escrever critérios de aceite.
- Se as fontes não sugerirem cortes modulares, declarar *«não aplicável — validar no kickoff de spec-product»* e uma linha na tabela.

### Passo 6.6 — Consolidar Dores e métricas

Varrer todos os `F-xxx` já extraídos (Passo 2) marcados como "dores explicitadas" e as métricas já capturadas na tabela de números/datas (Passo 4) e preencher a seção **«Dores e métricas»** do `context-map.md`:

| Dor ou métrica | Impacto citado | Fonte |
|-----------------|-----------------|-------|
| | | F-xxx |

- Não inventar dor ou métrica que não tenha `F-xxx` de sustentação.
- Se nenhuma dor ou métrica explícita foi capturada nas fontes, declarar *«nenhuma dor/métrica explícita nas fontes disponíveis — validar com cliente»*.

### Passo 7 — Questões em aberto

**Só** o que não está em nenhuma fonte e é necessário para continuar. Preencher a seção `## Questões em aberto` (id: `open-questions`) do `context-map.md` — sem criar IDs `GAP-XXX` (ver [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §2.16):

| # | Pergunta | Evidência/contexto | Bloqueia próxima fase? |
|---|----------|---------------------|--------------------------|
| | | | |

---

## Passo 8 — Consolidar `discovery-document.md`

Após `context-map.md` estar completo (Passos 1-7), gerar **`outputs/spec/discovery-document.md`** — documento narrativo consolidado para entrega a stakeholder. **100% derivado** do `context-map.md` que acabou de ser produzido — nada novo aqui, só consolidação em linguagem do cliente.

**Regra de ouro:** se o stakeholder ler só o `discovery-document.md` e perguntar "de onde veio essa afirmação?", a resposta tem que estar em um `F-xxx` rastreado para o `context-map.md`.

**Fronteira com `spec-product`:** o discovery-document é um espelho do que foi ouvido, não uma proto-visão. Priorização (MoSCoW), metas com alvo, escopo É/Não É e declaração de visão pertencem ao `product-vision.md` gerado pelo `spec-product`. Aqui só entra o que as fontes evidenciam.

### Estrutura obrigatória — 8 seções

Use [`templates/discovery-document.md`](templates/discovery-document.md) e preencha:

#### Seção 1 — Problema Central

2-3 frases. **Sem solução**, sem produto, sem tecnologia. Só a dor.

**Errado:** "Vamos construir um portal moderno para gestão de pagamentos."
**Certo:** "O time financeiro espera 3 dias para fechar o relatório mensal porque o sistema atual não suporta a janela de processamento, gerando retrabalho de R$ 45k/mês em horas extras."

**Quando o cliente articula uma solução em vez de um problema:** extrair a dor implícita. Exemplo: cliente diz "preciso de um app mobile" → problema real pode ser "vendedores externos não conseguem acessar o sistema em campo". Registrar a solução pedida como INF-xxx e a dor real como F-xxx (se evidenciada) ou como entrada em `## Questões em aberto` (se precisa confirmação).

#### Seção 2 — Contexto de Negócio

Por que agora? Quem é afetado? Qual o custo atual do problema? Quantificar quando `F-xxx` tiver número.

#### Seção 3 — Atores e Stakeholders

Atores com papel, interesse principal, poder de decisão e fonte `F-xxx` — a tabela está no template.

#### Seção 4 — O que o cliente pediu (linguagem bruta)

Lista do que foi mencionado como desejo ou necessidade nas fontes — **sem priorização, sem MoSCoW, sem julgamento**.
Cada item com origem `F-xxx`. Esta seção alimenta o `spec-product` como insumo bruto para definição de RF.

| # | O que foi pedido (linguagem do cliente) | Ator que pediu | Origem (F-xxx) |
|---|----------------------------------------|----------------|----------------|
| 1 | | | |

#### Seção 5 — Sistemas Existentes (candidatos a AS-IS)

Tecnologias, integrações, sistemas legados mencionados nas fontes. Vai alimentar a Dimensão 12 do `legacy.md` na próxima etapa. **Se não há sistemas digitais**: documentar ferramentas informais (planilhas, e-mails, WhatsApp) como "sistema atual" — isso é legado de processo.

#### Seção 6 — Contradições e Inconsistências

Copiar diretamente da seção "Contradições" do `context-map.md` — a tabela está no template.

#### Seção 7 — Contexto Organizacional

Fatores que influenciam o sucesso do projeto além do produto em si (resistência interna, campeão
do projeto, dependência externa, restrição política, janela de oportunidade). A tabela com os
fatores pré-listados e a linha de fallback («nenhum fator identificado nas fontes») já está no
template — preencher lá, com fonte `F-xxx` ou `INF-xxx` por linha.

#### Seção 8 — Avaliação de Prontidão do Insumo (Readiness Score)

Metodologia completa no **Passo 9** (abaixo). Esta seção do `discovery-document.md` recebe o resultado: tabela de notas por dimensão, nota consolidada, classificação e recomendação.

### Regras gerais do discovery

Valem as regras já dadas: rastreabilidade total a `F-xxx` (Regra de ouro acima), linguagem do
cliente («Aplicação nesta skill») e nenhuma priorização (fronteira com `spec-product`).
Sem `[A DEFINIR]` em nenhuma seção.

---

## Passo 9 — Avaliar qualidade do insumo (Readiness Score)

**Objetivo:** usando **só** o que já foi extraído nos Passos 1-8 (nenhuma fonte nova é lida aqui), responder uma pergunta prática para quem decide avançar o projeto: **este material é bom insumo para projetificar um software, ou falta levantamento antes de seguir?**

Este passo não julga o produto nem o cliente — julga a **qualidade do material recebido** como insumo de descoberta.

### 9.1 — Pontuar as dimensões

Preencher a tabela abaixo (vai para a Seção 8 do `discovery-document.md`) usando **somente** evidência já registrada em `context-map.md` / `discovery-document.md`. Cada dimensão recebe 0-3:

| Dimensão | O que observar | 0 — Insuficiente | 1 — Básico | 2 — Adequado | 3 — Rico |
|----------|-----------------|-------------------|------------|----------------|----------|
| Clareza do problema | Seção 1 do discovery | sem problema articulado | problema descrito sem impacto | problema com impacto qualitativo | problema quantificado (custo, tempo, volume) |
| Cobertura de atores | Seção 3 / Passo 6 | nenhum ator identificado | atores citados sem papel | atores com papel e interesse | atores com poder de decisão e interesse mapeados |
| Densidade evidencial | proporção F-xxx vs INF-xxx vs NCR não resolvido (Passos 2 e 5) | maioria INF-xxx/NCR | mais NCR do que o razoável | poucos NCR, INF-xxx justificado | quase tudo rastreado a F-xxx; INF-xxx pontual e justificado |
| Sistemas e integrações | Seção 5 / Passo 6 | nenhum sistema citado | sistemas citados sem integração | sistemas e integrações citados | sistemas, integrações e protocolo/formato de dado descritos |
| Métricas e SLAs | Passo 4 + Dores e métricas (Passo 6.6) | nenhum número | números soltos sem contexto | alguns números com contexto | números, SLAs e metas com fonte F-xxx |
| Contradições resolvidas | Passo 3 | contradições não verificadas | contradições listadas sem decisão | decisão pendente registrada | contradições resolvidas ou claramente encaminhadas |
| Clareza dos pedidos | Seção 4 | pedidos vagos ("modernizar") | pedidos genéricos sem ator | pedidos específicos com ator | pedidos específicos, com ator e origem F-xxx |

Nota consolidada = soma das notas ÷ (3 × nº de dimensões aplicáveis), em percentual. Dimensão sem evidência disponível conta como 0 — não pular linha.

### 9.2 — Classificar

| Nota consolidada | Classificação | Recomendação |
|-------------------|----------------|---------------|
| ≥ 80% | **Pronto para projetificação** | Seguir para `spec-legacy` / `spec-benchmark` sem nova rodada de levantamento |
| 50–79% | **Parcialmente pronto** | Seguir, mas registrar as lacunas como perguntas prioritárias em `## Questões em aberto` antes do `spec-product` |
| < 50% | **Insuficiente** | Recomendar ao consultor uma nova rodada de levantamento (entrevista, documento adicional) antes de avançar a cadeia |

### 9.3 — Reportar no chat (obrigatório, além do arquivo)

Gravar a Seção 8 do `discovery-document.md` **não é suficiente**. Ao final da execução, o agente deve enviar uma mensagem de chat ao usuário com:

1. Resumo de 2-4 frases do que o(s) documento(s) processado(s) tratam (problema, contexto, quem pediu)
2. Nota consolidada e classificação (Pronto / Parcialmente pronto / Insuficiente)
3. As 2-3 dimensões com pior nota (maiores lacunas)
4. A recomendação prática (seguir / seguir com ressalvas / nova rodada de levantamento)

**Modelo de mensagem:**

```
📄 Resumo do insumo processado
[2-4 frases: do que trata o material, problema central, quem pediu o quê]

📊 Prontidão para projetificação: XX% — [Pronto / Parcialmente pronto / Insuficiente]

Maiores lacunas:
- [Dimensão]: [por quê]
- [Dimensão]: [por quê]

Recomendação: [seguir para spec-legacy/spec-benchmark | seguir com ressalvas registradas em Questões em aberto | nova rodada de levantamento antes de prosseguir]
```

---

## Saídas

| Arquivo | Template em |
|---------|-------------|
| **`outputs/spec/context-map.md`** | [`templates/context-map.md`](templates/context-map.md) |
| **`outputs/spec/discovery-document.md`** | [`templates/discovery-document.md`](templates/discovery-document.md) |

O cabeçalho obrigatório (título, `Status`, `Última atualização`, `Fontes`) já vem nos templates.
`Status` usa o enum `draft | validado | aprovado`; `Fontes` lista os arquivos processados.
