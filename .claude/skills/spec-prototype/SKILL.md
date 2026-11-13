---
name: spec-prototype
description: >
  spec-prototype (Fase 5 — Protótipo) — Protótipo e UI ancorados em negócio: prototype.md com tabela UI→negócio (rota/componente,
  domínio, HU, RN, KPI, ref F-xxx, estados erro/vazio/carga). Quatro modos: Análise, Geração,
  Análise+Geração, Documentar-protótipo. Inclui decisão de fidelidade antes de gerar código.
  Modo Geração: levantamento de DESIGN SYSTEM antes do código — pede um arquivo de design
  system; se não existir, conduz questionário de design (cores, tipografia, densidade, dark
  mode, componentes) e gera design-system.md. Consulta frontend.mdc para ARQUITETURA/ESTRUTURA;
  o que já estiver definido lá NÃO é perguntado — só o que faltar. Em toda execução, ler
  artefatos spec-product se existirem. Fidelidade Alta = frontend COMPLETO com dados mockados:
  inventário de telas derivado de RF + entidades (todo cadastro/CRUD) + flow-map + transversais,
  100% gerado (gate FATAL SCREEN_INVENTORY_COMPLETE) — o flow-map é o mínimo, nunca o teto.
  Conteúdo humano gerado em Português do Brasil.
version: "1.4"
updated: "2026-10-20"
---

# spec-prototype — Protótipo e UI Ancorados em Negócio

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §4) e, especialmente, o modo escolhido (Análise / Geração / Documentar-protótipo) em execuções anteriores, para evitar regenerar UI já validada. Ao terminar, adicionar UMA linha: `| # | data | spec-prototype | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |` — o resumo deve incluir modo, fidelidade, e (se Geração) lista resumida de rotas geradas e a linha `SCREEN_INVENTORY:` do Passo 3.1.5. Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md) seção «Sync-log como memória cross-cutting».

## Papel

Garantir que **cada superfície de UI** é justificável em termos de **domínio**, **HU**, **RN**, **KPI** e **`F-xxx`**. Não é só «layout bonito»; é **materialização** das decisões de negócio já registradas — ou uma pendência em `## Questões em aberto` onde falta decisão.

**Ordem no fluxo:** sempre depois da sequência base (ingest → [legacy] → benchmark). Depois disso, o orquestrador escolhe **documentação primeiro** ou **protótipo primeiro**.

**Regra de ouro:** se um designer ou dev ler `prototype.md` e perguntar "por que esta tela existe?", a resposta tem que estar em uma linha da tabela UI → negócio.

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

Vale para `prototype.md`, `design-system.md` e `frontend-decisions.md`: cada decisão de interface diz o que o usuário ganha com ela, não apenas qual componente foi escolhido.

## Fronteira: arquitetura vs design vs negócio

Esta skill ancora **negócio em UI**. Ela **não** decide **arquitetura/estrutura** de frontend
(isso é do `frontend.mdc`), mas **é responsável por levantar o DESIGN** quando ele não existe.

| Decisão | Onde vive | Esta skill faz o quê |
|---------|-----------|----------------------|
| **Arquitetura/estrutura** — stack (Next/Vite, TS/JS, React/Vue), pastas (`src/`, `app/`, `components/`, `services/`), libs (Tailwind, shadcn, RHF, Zod, React Query), Server vs Client, services, HTTP, cache | a rule `frontend.mdc` do projeto | **Consulta, não decide, não pergunta** |
| **Design system** — paleta (primária/secundária/semânticas/neutras), tipografia, densidade, dark mode, componentes-base, tom visual | `design-system.md` (gerado por esta skill) **ou** `frontend.mdc` se já definido lá | **Levanta e materializa** o que faltar (ver Passo 3.0.1) |
| **Cobertura de RF/RN/PR em telas** | `prototype.md` (esta skill) | **Decide** |
| **Tabela UI → negócio** | `prototype.md` (esta skill) | **Decide** |
| **Estados de UI exigidos por cada tela (loading/empty/error)** | `prototype.md` + `product-requirements.md` | **Decide** quais estados são necessários |
| **Jornadas, atritos, questões em aberto de UX** | `prototype.md` (esta skill) | **Decide** |

**Regra de ouro (arquitetura):** se o conteúdo da decisão sobreviveria intacto trocando Next por Vite (ou React por Vue), NÃO é arquitetura — não pertence ao `frontend.mdc`.

**Regra de ouro (design):** o `.mdc` guarda **arquitetura e estrutura, não design**. Se houver
algum token de design no `.mdc` (paleta, fonte, tema), **siga e não pergunte**. Pergunte
**apenas o que não existir** em lugar nenhum, e materialize em `design-system.md`.

---

## Entradas obrigatórias

1. **`outputs/spec/context-map.md`** — `F-xxx` para rastreio
2. **`outputs/spec/legacy.md`** *(quando existir)* — fluxos, falhas, HUs, RN, KPIs, UX atual
3. **Material de design ou código** — Figma URL, protótipo navegável, código, prints, `src/`
4. **A rule `frontend.mdc` na pasta de rules do projeto** — resolver conforme `../tools/references/task-pipeline.md` §3 (`.cursor/rules/` → `.claude/rules/` → perguntar). É a **fonte de verdade para ARQUITETURA/ESTRUTURA do frontend** (stack, pastas, libs, Server vs Client, services, HTTP, cache). Obrigatório no modo Geração. Se ausente nos dois caminhos: **interromper antes de gerar código** e abrir `outputs/spec/frontend-decisions.md` (molde em [`templates/frontend-decisions.md`](templates/frontend-decisions.md)) como acordo de stack equivalente, com o usuário.
5. **Design system** — no modo Geração, **pedir um arquivo de design system** (ver Passo 3.0.1). Se existir, é a fonte de verdade de design. Se **não existir**, esta skill conduz o questionário de design e **gera `outputs/spec/design-system.md`**. Tokens de design que já estejam no `frontend.mdc` são seguidos e **não** perguntados novamente.

---

## Leitura cruzada obrigatória — docs spec-product

Se **qualquer artefato de `spec-product`** existir, ler integralmente antes de executar:

| Arquivo | O que garantir |
|----------|---------------|
| `product-vision/product-vision.md` | Escopo É/Não É, personas e roadmap compatíveis com telas |
| `business-rules.md` | RNs (legado + novo produto) que condicionam UI estão refletidas |
| `requirements/requirements.md` | RF/RNF batem com comportamento implementado ou mockado |
| `product-requirements/product-requirements.md` | PR, estados de UI, TTFV e WCAG respeitados |

---

## Passo 1 — Decidir modo e fidelidade

### 1.1 — Modo de operação

```
Qual modo desta sessão?
[ ] Análise — comparar artefato existente (Figma, URL, código) contra legacy.md e requirements
[ ] Geração — produzir código novo em src/ alinhado a frontend.mdc
[ ] Análise + Geração — primeiro analisa, depois gera o que faltar ou corrige divergências
[ ] Documentar protótipo — extrair negócio a partir do protótipo; legacy.md pode não existir
```

### 1.2 — Decisão de fidelidade (antes de gerar qualquer artefato)

Antes do questionário de layout, definir qual fidelidade faz sentido **agora**:

| Fidelidade | Quando usar | Saída |
|------------|-------------|-------|
| **Baixa (wireframe / papel)** | Discovery muito inicial; decisões ainda abertas; cliente precisa validar fluxo, não visual | Sketch em texto ou Mermaid no `prototype.md`; sem `src/` |
| **Média (Figma / mockup)** | Fluxo validado; feedback de UX necessário; cliente visual | `prototype.md` com referências a frames; sem `src/` |
| **Alta (código em `src/`)** | Cliente precisa navegar o produto inteiro como se fosse o frontend final; base para a `spec-implement` — já nasce no padrão do `frontend.mdc` e não passa pela `spec-convert-prototype` | `prototype.md` + `src/` com **100% das telas do Inventário** (Passo 3.1.5) navegáveis e com dados mockados — não só os fluxos do `flow-map.md` |

**Pergunta ao usuário:**
```
Qual fidelidade para esta sessão?
[ ] Baixa — documentar fluxo em prototype.md sem gerar código
[ ] Média — prototype.md com referências a frames (Figma/mockup); sem código em src/
[ ] Alta — gerar o frontend completo em src/ com dados mockados: todas as telas do Inventário (RF + cadastros + fluxos + transversais), não só os fluxos principais (exige: leitura do frontend.mdc p/ arquitetura + levantamento de design system conforme Passo 3.0.1)
```

Se **baixa**: pular Passo 3 (Modo Geração) e ir direto para Passo 4 (tabela UI → negócio).
Se **média**: pular a geração de código do Passo 3 (3.0–3.1), mas aplicar o Padrão de Qualidade Funcional da fidelidade Média (Passo 3.2) ao descrever/mockar o fluxo em `prototype.md` (com referências a frames) — sem escrever em `src/`.
Se **alta**: executar Passo 3 completo antes de qualquer arquivo em `src/` — incluindo o Inventário completo de telas (3.1.5), que define **o que** será gerado; gerar só o `flow-map.md` é defeito (`SCREEN_INVENTORY_COMPLETE`).

---

## Passo 2 — Modo Análise

Comparar o artefato (Figma/URL/código) contra `legacy.md` em **4 frentes**:

### Frente 2.1 — Fluxos e variantes

| ID Fluxo | Caminho feliz coberto na UI? | Variantes cobertas | Variantes faltantes | Onde está na UI |
|----------|------------------------------|--------------------|--------------------|-----------------| 
| FL-PAG-01 | sim / parcial / não | V1, V3 | V2 | rota /pagamentos/novo |

### Frente 2.2 — Cenários de falha

| ID Falha | Tipo | Comportamento atual no legado | Resposta UX no artefato | Status |
|----------|------|------------------------------|------------------------|--------|
| CF-PAG-03 | integração | erro genérico no log | toast "Erro ao processar" | inadequado — falta retry visível |

### Frente 2.3 — RN que condicionam UI

| RN | Enunciado resumido | Como deveria aparecer na UI | Como aparece | Gap |
|----|---------------------|-----------------------------|--------------|-----|
| RN-PAG-007 | valor mínimo R$ 10 | botão disabled abaixo de R$10 | sem validação inline | sim |

### Frente 2.4 — KPIs com superfície de UI

| KPI | Onde aparece | Granularidade | Exportação? | Status |
|-----|--------------|---------------|-------------|--------|
| Taxa de aprovação | /dashboard | mensal | CSV | adequado |

---

## Passo 2-B — Modo Documentar-protótipo

Usado quando existe um protótipo (Figma, código, URL navegável) mas `legacy.md` **não existe ou está incompleto** — o protótipo passa a ser a fonte primária para extrair negócio, em vez do legado.

### 2-B.1 — Inventariar rotas/telas

Listar toda rota, tela ou frame do protótipo antes de analisar comportamento:

| Rota / Tela / Frame | Tipo (página / modal / componente) | Estado observável (dados reais / mock / placeholder) |
|------------------------|---------------------------------------|-------------------------------------------------------------|
| | | |

### 2-B.2 — Extrair decisões implícitas como PD-NNN

Para **cada comportamento observado que carrega uma decisão de negócio implícita** (validação, cálculo, regra de exibição condicional, KPI, fluxo), criar um item `PD-[DOMÍNIO]-NN`:

| Campo | Regra |
|-------|-------|
| **ID** | `PD-[DOMÍNIO]-NN` — numeração sequencial por domínio inferido |
| **Tipo** | HU / RN / KPI / Fluxo — escolher o mais específico |
| **Descrição** | O comportamento observado, escrito como decisão de negócio (não como descrição visual) |
| **Domínio inferido** | Melhor palpite de domínio; se incerto, registrar em `## Questões em aberto` |
| **Âncora** | `src/Caminho.tsx:linha` (modo código) ou `Figma frame X` (modo design) — sempre rastreável |
| **Prioridade de migração** | Alta / Média / Baixa — Alta quando bloqueia entendimento de RN crítica ou fluxo de receita |

Registrar cada item na tabela **"Itens descobertos no protótipo (PD-xxx)"** do [`templates/prototype.md`](templates/prototype.md).

### 2-B.3 — Preencher a tabela UI → negócio com PD-xxx

A tabela do Passo 4 é obrigatória também neste modo. Onde não existir `HU-xxx`/`RN-xxx` do legado, usar `PD-xxx` nas colunas HU/RN (ver regra do Passo 4).

### 2-B.4 — Registrar migração PD → legacy/business-rules

Ao final da sessão, preencher a checklist **"Artefatos que precisam ser criados/atualizados"** do template:

- [ ] `context-map.md` — adicionar `F-xxx` das fontes visuais usadas como evidência
- [ ] `legacy.md` — migrar `PD-xxx` do tipo HU/Fluxo (quando `spec-legacy` for executado ou revisitado)
- [ ] `business-rules.md` — migrar `PD-xxx` do tipo RN
- [ ] `requirements.md` — avaliar se algum `PD-xxx` vira candidato a RF
- [ ] `sync-log.md` — registrar quantos `PD-xxx` foram gerados e sua prioridade de migração

**PD-xxx nunca substitui `GAP-XXX`** — é um achado de negócio extraído do protótipo, não uma lacuna; a lacuna correspondente (se houver) vai em `## Questões em aberto`.

---

## Passo 3 — Modo Geração

### 3.0 — Gate de ARQUITETURA (consulta obrigatória ao `frontend.mdc`)

Esta skill **não decide arquitetura/estrutura** de frontend. Stack, libs, pastas, Server vs Client, services, HTTP e cache vêm da rule `frontend.mdc` do projeto (`.cursor/rules/` ou `.claude/rules/` — ver `../tools/references/task-pipeline.md` §3). Nunca duplicar essas decisões aqui.

Num projeto com o harness Elo, essa rule é a constituição `.claude/rules/harness/frontend.md` — mais o `frontend` da raiz, quando a `spec-tech-rules` já o escreveu. **Ler a constituição explicitamente**, antes do primeiro arquivo em `src/`: ela só carrega sozinha ao abrir um arquivo de tela, e aqui os arquivos ainda vão ser criados — às vezes noutro repositório.

| Situação detectada | Ação |
|--------------------|------|
| `frontend.mdc` existe e cobre arquitetura | Ler integralmente; usar como única referência de arquitetura/estrutura na sessão |
| `frontend.mdc` existe mas falta arquitetura (ex.: stack indefinida) | **Não inventar arquitetura.** Interromper, listar as lacunas, registrar em `outputs/spec/frontend-decisions.md`, e só então prosseguir |
| `frontend.mdc` ausente | **Interromper geração.** Acordar stack + estrutura com o usuário; registrar em `outputs/spec/frontend-decisions.md`; confirmar antes de gerar qualquer arquivo em `src/` |
| Já existe `package.json` no destino | Não rodar `create-*`. Integrar nos arquivos existentes seguindo a estrutura do `frontend.mdc` |

O comando exato de scaffold (`npx create-*`) vem do `frontend.mdc` ou do `frontend-decisions.md`
— nunca de flags hardcoded aqui.

### 3.0.1 — Levantamento de DESIGN SYSTEM (obrigatório antes de gerar `src/`)

Materializa o design antes de qualquer tela. Regra central: **seguir o que já existe, perguntar só o que faltar.**

**Passo A — Descobrir o que já existe (sem perguntar ainda):**

1. Ler o `frontend.mdc` procurando tokens de design (paleta, cores, fonte, tipografia, tema/dark mode, tokens de espaçamento). O que estiver lá → **é fonte de verdade, não perguntar**.
2. Verificar se existe `outputs/spec/design-system.md` de sessão anterior → se sim, usar e só confirmar.
3. Inspecionar o material de entrada (Figma, prints, `src/`, `tailwind.config`, CSS de tema) por tokens já definidos.

**Passo B — Pedir o arquivo de design system:**
```
Você tem um arquivo de design system / guia de marca / tokens
(ex.: design-system.md, tokens.json, tailwind.config, Figma com styles,
guia de identidade visual)?
  1. Sim — vou fornecer o arquivo/link  → leio e uso como fonte de verdade
  2. Não / não tenho certeza            → conduzo um questionário e gero design-system.md
```

- **Se “Sim”:** ler o arquivo, extrair os tokens, e **só perguntar o que estiver faltando** nele (usar o questionário do Passo C apenas para as lacunas).
- **Se “Não”:** executar o **questionário completo** do Passo C e, ao final, **gerar `outputs/spec/design-system.md`**.

**Passo C — Questionário de design (nível intermediário).** Apresentar bloco a bloco;
para cada item, sugerir um default sensato e aceitar confirmação, número ou texto livre.
**Pular qualquer item já resolvido no Passo A** (informar ao usuário: “já definido no
frontend.mdc/arquivo: X — mantendo”).

```
BLOCO D1 — Identidade e tom
  D1.1 Existe marca/logo? Cores obrigatórias da marca? (colar hex se houver)
  D1.2 Tom visual desejado?
       1. Corporativo/sóbrio  2. Moderno/minimalista  3. Amigável/vibrante
       4. Denso/data-heavy (dashboards)  5. Outro → descreva
  D1.3 Alguma referência/inspiração? (produto, site, "parecido com X")

BLOCO D2 — Cores
  D2.1 Cor primária (ação principal) — hex ou "sugira a partir do tom"
  D2.2 Cor secundária/acento — hex ou "derive da primária"
  D2.3 Cores semânticas: sucesso / atenção / erro / info — usar defaults? (S/N)
  D2.4 Neutros: fundo, superfície, borda, texto — claro por padrão? (S/N)

BLOCO D3 — Tipografia
  D3.1 Família principal (UI/corpo) — ex.: Inter, Roboto, system-ui  [default: Inter]
  D3.2 Família de títulos — igual ao corpo? (S/N; se não, qual)
  D3.3 Escala de tamanho: compacta / padrão / ampla  [default: padrão]

BLOCO D4 — Densidade e forma
  D4.1 Densidade da UI: compacta (dashboard) / confortável / espaçosa  [default: confortável]
  D4.2 Raio de canto: reto / suave / arredondado  [default: suave]
  D4.3 Sombra/elevação: sem sombra / sutil / marcada  [default: sutil]

BLOCO D5 — Tema
  D5.1 Modo: só claro / só escuro / claro + escuro com toggle  [default: só claro]
  D5.2 Se ambos: qual é o padrão de abertura?

BLOCO D6 — Componentes-base (materializar aparência)
  D6.1 Estilo de botão: sólido / contorno / suave (tonal)  [default: sólido]
  D6.2 Campos de formulário: contorno / preenchido / sublinhado  [default: contorno]
  D6.3 Navegação principal: sidebar / topbar / ambas  [default: sidebar p/ app, topbar p/ site]
  D6.4 Tabelas/listas densas no produto? (S/N — afeta densidade e paginação)
  D6.5 Biblioteca de ícones preferida? [default: a do frontend.mdc, senão Lucide]
```

**Passo D — Gerar/atualizar `outputs/spec/design-system.md`** (apenas quando o usuário não
tinha arquivo, ou para consolidar lacunas preenchidas). Usar o molde
[`templates/design-system.md`](templates/design-system.md) — estrutura completa lá (origem das
decisões por token, paleta, tipografia, densidade, tema, componentes-base, acessibilidade).

**Regras do levantamento de design:**
- ✅ **Perguntar o máximo necessário** para o protótipo ter aparência coerente — não gerar UI com estética arbitrária.
- ✅ Todo token que virou decisão precisa aparecer no `design-system.md` com sua origem.
- ❌ Não inventar cores/tipografia em silêncio quando o usuário não respondeu — ou usar o default anunciado, ou registrar em `## Questões em aberto` do `prototype.md`.
- ❌ Não colocar decisões de **arquitetura** no `design-system.md` (essas vão para `frontend.mdc`).

### 3.1 — Pré-requisito de leitura (obrigatório antes do primeiro arquivo em `src/`)

1. `frontend.mdc` lido integralmente (ou `frontend-decisions.md` acordado conforme 3.0)
2. **Design system resolvido conforme 3.0.1** — arquivo fornecido lido, OU `design-system.md` gerado. Não gerar `src/` sem tokens de design definidos.
3. Os 4 artefatos de `spec-product` lidos integralmente (tabela «Leitura cruzada obrigatória» acima) + `modules.md`

Se algum artefato de produto do item 3 não existir, **parar** — protótipo Modo Geração depende deles.

### 3.1.5 — Inventário completo de telas (obrigatório — gate `SCREEN_INVENTORY_COMPLETE`)

**Problema que este passo resolve (caso real):** o protótipo cobriu só as telas listadas no
`flow-map.md` — os fluxos principais — e saiu incompleto. Numa clínica de vacinas, gerou a tela de
registrar temperatura das geladeiras, mas **não** a tela de cadastrar as geladeiras. Quem navega
chega a um dado que não tem origem em lugar nenhum. O `flow-map.md` descreve **jornadas**, não o
sistema inteiro: ele é o **mínimo** do inventário, nunca o **teto**.

**Objetivo:** antes do primeiro arquivo em `src/`, listar **todas** as telas que o frontend final
precisa ter, como se o protótipo fosse o próprio produto entregue com dados mockados. Derivar de
**cinco fontes**, nesta ordem, e consolidar na tabela **«Inventário de telas»** do `prototype.md`
(molde em [`templates/prototype.md`](templates/prototype.md)):

| # | Fonte | O que extrair | Telas que gera |
|---|-------|---------------|----------------|
| A | `flow-map.md` § Telas (`TEL-xxx`) | Toda tela dos fluxos mapeados | Uma por `TEL-xxx` — **ponto de partida**, não o total |
| B | `requirements.md` — **todo** RF (Must, Should **e** Could) | Cada RF com comportamento visível ao usuário | ≥1 tela ou componente por RF; RF sem tela → justificar na coluna Origem («sem UI: job/integração») |
| C | **Entidades e cadastros** — substantivos que o usuário cria, edita, consulta ou seleciona: em `requirements.md`, `business-rules.md`, no «Inventário de campos» do `product-requirements.md` (todo `select`/lista cuja opção vem de um registro), em `modules.md` e, quando existir, em `data-model.json` | Cada entidade de domínio ou de apoio (equipamentos, unidades, profissionais, produtos, lotes, fornecedores, tabelas de parâmetros…) | **Conjunto CRUD completo:** listagem com busca/filtro/paginação · formulário criar/editar · detalhe (quando há histórico ou relações) · ativar/inativar ou excluir. Regra do exemplo: se existe «registrar temperatura do equipamento», existe «cadastro de equipamentos» |
| D | **Perfis e acesso** — personas de `product-vision.md`, RF/RN que citam perfil, permissão ou ownership | Autenticação e administração de acesso | Login · recuperação de senha · perfil do usuário · gestão de usuários e perfis/permissões (quando há mais de um perfil) |
| E | **Transversais** — KPIs de `product-vision.md`/`legacy.md`, RN parametrizáveis de `business-rules.md`, estados de UI e notificações de `product-requirements.md` | O que sustenta o uso diário além dos fluxos | Home/dashboard com os KPIs · navegação (menu com **todos** os módulos de `modules.md`) · parâmetros/configurações para toda RN que cita valor configurável · relatórios e exportações citados · central de notificações/alertas quando RF exige · páginas de erro/404 e vazio |

**Regra «sem ponta solta» (verificação obrigatória sobre o inventário):**
1. Todo dado **exibido ou selecionado** em uma tela tem a tela de **origem** (cadastro) no inventário.
2. Toda **ação** (botão, link, linha clicável) leva a uma rota que **existe** no inventário.
3. Todo módulo `MOD-xxx` de `modules.md` tem ≥1 tela e aparece na navegação.
4. Toda entidade da fonte C tem o conjunto CRUD, salvo justificativa explícita (ex.: «somente leitura — dado vem de integração»), registrada na coluna Origem.

**Tabela «Inventário de telas»** (uma linha por tela; colunas obrigatórias):

| ID | Rota | Nome | Tipo | Origem | Módulo | Status |
|----|------|------|------|--------|--------|--------|
| TEL-004 | /equipamentos/:id/temperaturas | Registro de temperatura | formulário | FLX-002 / RF-MOD-EQP-03 | MOD-EQP | gerada |
| TEL-NEW-01 | /equipamentos | Equipamentos — listagem | lista | entidade Equipamento (fonte C) — origem do dado de TEL-004 | MOD-EQP | gerada |
| TEL-NEW-02 | /equipamentos/novo | Equipamento — cadastro | formulário | entidade Equipamento (fonte C) | MOD-EQP | gerada |

- **ID:** `TEL-xxx` quando a tela já existe no `flow-map.md`; **`TEL-NEW-nn`** (sequencial) para tela descoberta pelo inventário. Esta skill **não** numera `TEL-xxx` novos — isso é do `flow-map.md` (`spec-product`/`spec-iterate`); `TEL-NEW-nn` é placeholder rastreável até a incorporação (ver Passo 8).
- **Tipo:** `lista` · `formulário` · `detalhe` · `dashboard` · `modal` · `autenticação` · `configuração` · `relatório`.
- **Status:** `gerada` (navegável em `src/`, com mock e estados) · `stub` (listada no Inventário, sem código — **só** em fidelidade Média; a rota não existe, porque Média não escreve em `src/`) · `pendente` (não gerada — **proibido** em Alta; em Média, listar em `## Questões em aberto`).
- Toda linha do inventário gera uma linha na tabela UI → negócio do Passo 4 e uma entrada em `screens-manifest.json`.

**Registro no `sync-log.md`** (na linha desta execução):

```
SCREEN_INVENTORY: telas=<N> · flowmap=<N> · novas=<N> · rf_cobertos=<N/M> · entidades_com_crud=<N/M> · geradas=<N> · stub=<N> · pendente=<N>
```

**Retroalimentação:** toda `TEL-NEW-nn` é uma tela que o `flow-map.md` e o `product-requirements.md` não previram. Registrar em `## Divergências protótipo ↔ documento` com decisão `proto→doc` para o `spec-iterate` incorporar (novo `TEL-xxx` + PR de tela) — ver Passo 8. Não é GAP: é lacuna de documentação, não decisão de negócio em aberto.

### 3.2 — Padrão de Qualidade Funcional (Modo Geração)

O escopo de implementação **depende da fidelidade declarada no Passo 1.2**:

| Fidelidade | Escopo de implementação | Mock de dados | Estados de UI |
|------------|------------------------|---------------|---------------|
| **Baixa** | Não chega aqui — Passo 3 é pulado | — | — |
| **Média** | Inventário completo (3.1.5) emitido; descrever no `prototype.md` o happy path e os fluxos críticos (Must) com referências a frames; **toda** tela do Inventário aparece na tabela do 3.1.5 — as não desenhadas com `Status: stub` — sem escrever em `src/`. Nenhuma tela do inventário pode faltar na tabela | Dados ilustrativos do fluxo principal | Sucesso + vazio (mínimo) |
| **Alta** | **Frontend completo:** 100% das telas do Inventário (3.1.5) com `Status: gerada` — Must, Should **e** Could, todos os CRUDs de entidade, autenticação/acesso e transversais; **nenhum stub**. Navegação (menu) cobre todos os módulos. BDD cenário 1 (feliz) e cenário 3 (erro de negócio) materializados em toda tela; cenário 2 (alternativo) quando crítico | **Camada de dados mockados única** (pasta/módulo conforme `frontend.mdc`, ex.: `src/mocks/`): um repositório em memória por entidade, com massa realista e as bordas das RN. O CRUD **funciona de verdade dentro da sessão** — criar aparece na listagem, editar reflete no detalhe, inativar some do `select` que consumia o registro | 6 estados (carregando, sucesso, erro validação, erro sistema, vazio, offline) em **todas** as telas |

**Comuns a Média e Alta:**
- O `flow-map.md` define os **fluxos**; o **Inventário de telas** (3.1.5) define o **escopo do protótipo**. Gerar só as telas do flow-map é entrega incompleta
- A estética é secundária; valor está na **materialização do negócio**, não em pixel-perfect
- Toda tela gerada deve ter linha correspondente na tabela UI→negócio do Passo 4
- RN-NOVO-xxx do `business-rules.md` devem se refletir em comportamento mockado (validação, transição, mensagem) — não só em comentário
- Proibido marcar tela como "implementada" se a RN que ela materializa não está representada na lógica do mock

**Anti-padrão a evitar (alimentado pelo feedback do consultor):** transformar verificação de campo de tela em RN no business-rules. O protótipo pode ter validação inline (ex.: "campo obrigatório") sem que essa validação vire RN-NOVO-xxx — só vira RN quando há **decisão de negócio** subjacente (ex.: "campo obrigatório porque é exigência regulatória X").

### 3.2.1 — Protótipo conectado (opcional — não é gate)

Se `outputs/spec/api-contracts.yaml` **já existir** (Fase 7b concluída ou em andamento), preferir
protótipo **conectado** a dados hardcoded: subir um mock server do contrato e fazer o protótipo
consumir a API especificada.

```bash
npx @stoplight/prism-cli mock outputs/spec/api-contracts.yaml
```

- O Prism serve os endpoints do contrato com respostas derivadas dos schemas/examples — o
  protótipo faz `fetch` real contra `http://localhost:4010` em vez de arrays mockados.
- Benefício: **divergências front × contrato aparecem na fase mais barata** (campo faltante,
  tipo errado, status code inesperado) — registrar cada divergência em `## Questões em aberto`
  e no Passo 8 (retroalimentação).
- Se o `npx`/Prism não estiver disponível ou o contrato ainda não existir, seguir normalmente
  com mocks locais conforme a tabela do Passo 3.2 — este sub-passo é opcional e não bloqueia nada.

### 3.3 — Resolução de conflitos

| Cenário | Decisão |
|---------|---------|
| Documento de produto contradiz `frontend.mdc` em decisão técnica de UI (ex.: produto pede React Native, mdc é web) | Prevalece `frontend.mdc` até alteração explícita no repositório; registrar em `## Questões em aberto` para reconciliação |
| Documento de produto define comportamento de negócio que `frontend.mdc` não cobre (ex.: regra de validação de campo) | Implementar conforme produto; `frontend.mdc` só governa **como** construir, não **o que** o negócio exige |
| `frontend.mdc` ausente | Bloquear geração até `frontend-decisions.md` ser acordado (ver 3.0) |
| Design não definido em lugar nenhum | Bloquear geração até 3.0.1 concluído (arquivo lido OU `design-system.md` gerado) |
| Token de design conflita entre `frontend.mdc` e arquivo/design-system | Prevalece o `frontend.mdc`; registrar no `design-system.md` a divergência e, se relevante, em `## Questões em aberto` |
| Solução viola RN do `business-rules.md` | Registrar em `## Questões em aberto`, seguir RN |
| Solução viola WCAG 2.2 AA definido em `product-requirements.md` | Registrar em `## Questões em aberto`, ajustar |

---

## Passo 4 — Tabela UI → negócio (obrigatório em todos os modos)

**7 colunas obrigatórias** (o template em [`templates/prototype.md`](templates/prototype.md) adiciona uma 8ª coluna **opcional** "Notas" para comentário livre — não conta para a validação `UI_BUSINESS_TABLE_7COLS`):

| UI (rota / componente) | Domínio | HU | RN | KPI | Ref. (F-xxx ou legacy §) | Estados (erro / vazio / carga) |
|-----------------------|---------|-----|-----|-----|--------------------------|-------------------------------|
| /pagamentos/novo | MOD-PAG | HU-PAG-02 | RN-PAG-007, RN-NOVO-PAG-001 | Taxa de aprovação | F-019, legacy §3.2 | erro: toast retry / vazio: CTA "criar" / carga: skeleton |

**Regras:**
- Cobertura: **toda** linha do Inventário de telas (3.1.5) tem linha aqui — inclusive cadastros (`TEL-NEW-nn`), autenticação e transversais; tela de cadastro rastreia ao RF/RN que consome a entidade e ao `F-xxx` que a menciona
- Domínio: usar o código `MOD-XXX` do catálogo de módulos (`modules.md`, gerado por `spec-product`) — a ferramenta `check-modules.py` extrai `MOD-XXX` desta coluna para validar consistência entre `prototype.md` e o catálogo
- HU: `HU-[DOMÍNIO]-NN` do legacy, OU `PD-[DOMÍNIO]-NN` se legacy não existe
- RN: incluir tanto RNs do legado (RN-xxx) quanto do novo produto (RN-NOVO-xxx)
- Estados: **3 obrigatórios** por rota; ausência → registrar `PENDÊNCIA:` por estado em `## Questões em aberto`

---

## Passo 5 — Jornadas com pontos de atrito

```
JORNADA: [Persona] — [Objetivo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Passo 1: [ação do usuário]
  Expectativa: [o que o usuário espera]
  Realidade atual (AS-IS): [o que acontece hoje]
  Requisito TO-BE: [o que vamos entregar — PR-XXX se existir]
  Risco de abandono: Alto / Médio / Baixo
  Telas envolvidas: [rotas da tabela UI → negócio]
```

---

## Passo 6 — Questões em aberto de UX <!-- id: open-questions -->

Esta skill **não cria** IDs `GAP-XXX` (essa numeração pertence ao backlog central, gerido em fase posterior — ver [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md)). Toda decisão de UX que falta — RN não refletida, conflito entre documento e `frontend.mdc`, estado sem definição, ambiguidade não resolvida — é registrada na tabela `## Questões em aberto` do `prototype.md`.

| # | Pergunta | Evidência/contexto | Bloqueia próxima fase? |
|---|----------|---------------------|-------------------------|
| 1 | comportamento mobile < 320px | /pagamentos/novo, RN-PAG-007 | Média |

Se a questão já corresponde a um `GAP-XXX` existente em `gaps.md` (rastreabilidade), citar o ID na coluna Evidência/contexto — nunca criar um ID novo aqui.

---

## Passo 7 — Validação antes de fechar prototype.md

Antes de declarar o protótipo fechado, checar com o usuário/consultor:

| Item de validação | Status |
|-------------------|--------|
| Todas as jornadas da persona principal foram percorridas? | sim / parcial / não |
| RNs do novo produto (Seção B do business-rules.md) estão refletidas na UI? | |
| Estados de erro críticos (CF-XX com impacto alto) têm resposta UX? | |
| Nenhuma tela existe sem linha na tabela UI → negócio? | |
| Todo RF de `requirements.md` (Must/Should/Could) tem tela ou justificativa «sem UI» no Inventário? | |
| Toda entidade que o usuário cria/edita/seleciona tem o conjunto CRUD (lista, formulário, detalhe) gerado? | |
| Navegando o protótipo, nenhum dado exibido ou opção de `select` fica sem tela de origem (regra «sem ponta solta»)? | |
| *(Alta)* Nenhuma tela do Inventário está como `stub` ou `pendente`? | |

Se qualquer item estiver "não": registrar em `## Questões em aberto` antes de fechar.

---

## Passo 8 — Retroalimentação para documentos

| Tipo de divergência | O que fazer |
|---------------------|-------------|
| Protótipo está certo, documento errado | Corrigir documento; registrar sync-log.md |
| Documento está certo, protótipo errado | Registrar em `## Questões em aberto`; se Modo Geração, corrigir src/ |
| Ambos incompletos | Registrar em `## Questões em aberto` como PENDING_DECISION; não alterar nenhum até decisão |
| Tela necessária **ausente** do `flow-map.md`/PR — descoberta pelo Inventário (3.1.5), ex.: cadastro da entidade que outra tela consome | Gerar a tela (`TEL-NEW-nn`); registrar em `## Divergências protótipo ↔ documento` com decisão `proto→doc`; o `spec-iterate` incorpora como novo `TEL-xxx` no `flow-map.md` e PR de tela no `product-requirements.md` |

---

## Saídas

| Arquivo | Quando |
|---------|--------|
| `outputs/spec/prototype.md` | Sempre — inclui a tabela «Inventário de telas» (3.1.5) em Geração/Documentar |
| `outputs/spec/design-system.md` | Modo Geração, quando o usuário não tinha arquivo de design system (gerado a partir do questionário 3.0.1) |
| `outputs/spec/frontend-decisions.md` | Apenas se `frontend.mdc` ausente (arquitetura) |
| `src/` (código) | Apenas fidelidade Alta, Modo Geração — **todas** as telas do Inventário, com camada de mocks única |
| `outputs/spec/screens-manifest.json` | Sempre que houver telas (Geração **ou** Documentar) — **gate `SCREENS_MANIFEST_EMITTED`** |
| `outputs/spec/screens/<TEL-ID>.png` | Screenshots das telas, quando capturáveis (fidelidade Alta / protótipo navegável) |

### Manifesto de telas (`screens-manifest.json`) — gate `SCREENS_MANIFEST_EMITTED` (WARNING)

Todo protótipo — inclusive gerado por skills custom de projeto — **DEVE** emitir `outputs/spec/screens-manifest.json` conforme o contrato em [`../tools/references/screens-manifest.md`](../tools/references/screens-manifest.md) (exemplo: [`../tools/references/screens-manifest.example.json`](../tools/references/screens-manifest.example.json)), com screenshots em `outputs/spec/screens/<TEL-ID>.png`. É isso que habilita a colheita do `spec-iterate`, as visões por tela do `spec-report` e o `uiContext.fields[]` do `spec-tasks`.

Conferir ao fechar a skill:

1. O arquivo existe e é JSON válido.
2. Toda rota do Inventário de telas — e, portanto, da tabela UI → negócio do `prototype.md` — tem entrada correspondente em `screens[].route` (contagem igual e rotas idênticas). Tela `TEL-NEW-nn` entra **sem** `id` (o match do `check-flowmap.py --manifest` é por `route`) e aparecerá como «ausente do flow-map» — é o esperado até o `spec-iterate` incorporar.
3. `route` presente e única em todas as entradas; `screenshot`, quando preenchido, no formato `screens/<TEL-ID>.png` (relativo a `outputs/spec/` — ver [`../tools/references/paths.md`](../tools/references/paths.md)).
4. Registrar no `sync-log.md`, na linha desta execução:

   ```
   SCREENS_MANIFEST_EMITTED: telas=<N> · rotas_cobertas=<N/M> · screenshots=<N> · generatedBy=spec-prototype/<modo>
   ```

**Gate WARNING** (não bloqueia a emissão do `prototype.md`): protótipo sem tela navegável (ex.: só wireframe em imagem) registra `SCREENS_MANIFEST_EMITTED: n/a · motivo=<1 frase>` — e o `spec-iterate` cai nas camadas runtime/estático da colheita sabendo por quê.

---

## Definição de pronto

A lista de fechamento são os **Validators** abaixo — conferir cada código FATAL e WARNING um a um.
Item sem validator próprio: questões em aberto de UX consolidadas em `## Questões em aberto` do
`prototype.md`.

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia emissão

| Código | Verificação |
|--------|-------------|
| `MODE_FIDELITY_DECLARED` | Modo e fidelidade declarados no cabeçalho do `prototype.md` |
| `UI_BUSINESS_TABLE_7COLS` | Tabela UI → negócio com as 7 colunas obrigatórias preenchidas para cada rota principal (8ª coluna "Notas" do template é opcional e não é validada) |
| `UI_STATES_OR_PENDENCIA` | Toda rota tem os 3 estados (erro/vazio/carga) ou `PENDÊNCIA:` explícita em `## Questões em aberto` por estado ausente |
| `NEW_RN_REFLECTED` | `RN-NOVO-xxx` do `business-rules.md` refletidas na coluna RN da tabela |
| `VALIDATION_STEP7_RUN` | Validação do Passo 7 executada; itens "não" registrados em `## Questões em aberto` |
| `SCREEN_INVENTORY_COMPLETE` | *(Modo Geração e Documentar)* Tabela «Inventário de telas» (3.1.5) emitida com as 7 colunas, derivada das 5 fontes; 100% dos RF com tela ou justificativa «sem UI»; 100% das entidades da fonte C com CRUD ou justificativa; regra «sem ponta solta» conferida; linha `SCREEN_INVENTORY:` no sync-log. **Em fidelidade Alta:** 100% das telas com `Status: gerada` — qualquer `stub`/`pendente` é FATAL |
| `ARCH_GATE_RESPECTED` | *(Modo Geração)* `frontend.mdc` lido integralmente, ou `frontend-decisions.md` acordado, antes do primeiro arquivo em `src/` |
| `DESIGN_SYSTEM_RESOLVED` | *(Modo Geração)* Design resolvido conforme 3.0.1 antes do primeiro arquivo em `src/` |
| `NO_ARCHITECTURE_DECISIONS_HERE` | Nenhuma decisão de arquitetura/stack feita dentro do `prototype.md` |
| `NO_GAP_IDS_CREATED` | Nenhum `GAP-XXX` novo criado por esta skill |
| `SYNC_LOG_UPDATED` | Linha adicionada em `sync-log.md` Seção A com modo, fidelidade e rotas tocadas |

### WARNING — não bloqueia, vai na seção «Avisos»

| Código | Verificação |
|--------|-------------|
| `SCREENS_MANIFEST_EMITTED` | Checklist de 4 itens do § Manifesto de telas cumprido (JSON válido, rotas cobertas, formato de screenshot, linha no sync-log); protótipo sem tela navegável → `n/a` com motivo |
| `DESIGN_TOKENS_REASKED` | Algum token já presente no `frontend.mdc`/arquivo de design foi reperguntado em vez de seguido |
| `PD_MIGRATION_PENDING` | Existem `PD-xxx` (Modo Documentar-protótipo) ainda não migrados para `legacy.md`/`business-rules.md` |
| `MEDIA_FIDELITY_NO_STUB` | Fidelidade Média com tela do fluxo ou do cadastro **ausente da tabela do Inventário** (3.1.5) — em Média, presença na tabela com `Status: stub` é o mínimo; rota não é exigida |
| `SCREEN_INVENTORY_STUBS` | *(Média)* Telas com `Status: stub`/`pendente` listadas em `## Questões em aberto` com o que falta para virar `gerada` |
| `FLOWMAP_SCREENS_EXTRA` | Existem `TEL-NEW-nn` no Inventário ainda não registradas em `## Divergências protótipo ↔ documento` (decisão `proto→doc`) para o `spec-iterate` incorporar ao `flow-map.md` |
| `PROTO_DOC_DIVERGENCE_OPEN` | Divergência protótipo ↔ documento registrada no Passo 8 sem decisão tomada |

---

## Skills irmãs

| Skill | Fase | Relação com `spec-prototype` |
|-------|------|-------------------------------|
| `spec-ingest` | 1 | Provê `context-map.md` (`F-xxx`) consumido aqui |
| `spec-legacy` | 2 | Provê `legacy.md` (fluxos, falhas, HUs, RN, KPIs); quando ausente, aciona o Modo Documentar-protótipo |
| `spec-benchmark` | 3 | Antecede esta skill na sequência base |
| `spec-product` | 5 | Provê/recebe `business-rules.md`, `requirements.md`, `product-requirements.md`, `modules.md` e `flow-map.md` — leitura cruzada obrigatória; RF, entidades e módulos alimentam o Inventário de telas (3.1.5) |
| `spec-tech-rules` | 5.5 | Provê `frontend.mdc` — fonte de verdade de arquitetura/estrutura |
| `spec-convert-prototype` | (cross) | Migra protótipo externo ou fora do padrão do projeto (HTML/JS vanilla, outro framework, ou desta skill em fidelidade Baixa/Média) para a stack do `frontend.mdc`; o de fidelidade Alta não passa por ela |
| `spec-iterate` | (cross) | Converte `## Questões em aberto` em `GAP-XXX`; reconcilia divergências do Passo 8 — inclusive incorporar as `TEL-NEW-nn` do Inventário ao `flow-map.md` e aos PR |

---

## O que NÃO faz
- Não decide arquitetura/estrutura de frontend — consulta `frontend.mdc`, nunca decide (ver «Fronteira»)
- Não cria IDs `GAP-XXX` — registra em `## Questões em aberto`
- Não substitui `spec-legacy` — no Modo Documentar-protótipo apenas extrai achados `PD-xxx` para migração futura
- Não conecta a backend real — o protótipo Alta é o **frontend completo com dados mockados** (todas as telas do Inventário); a troca dos mocks por serviços reais é da `spec-implement`
- Não trata o `flow-map.md` como lista de telas a gerar — ele é o mínimo; o escopo vem do Inventário de telas (3.1.5)
- Não decide RN de negócio a partir de validação de campo isolada (ver anti-padrão do Passo 3.2)
- Não migra protótipo externo ou fora do padrão para a stack definitiva do projeto — isso é `spec-convert-prototype`

---

## Próxima etapa

→ **`spec-product`** (se ainda não existirem os 4 artefatos de negócio) ou **`spec-iterate`** (reconciliação e fecho de GAPs).
