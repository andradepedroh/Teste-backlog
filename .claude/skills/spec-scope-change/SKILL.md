---
name: spec-scope-change
description: >
  spec-scope-change (Fase 6.5-C — Análise de Alteração de Escopo) — opera em duas fases como
  o spec-iterate. ETAPA A: recebe documentos de alteração de escopo sobre projeto já especificado
  e com tasks no ADO; analisa o delta, classifica impactos por camada, mapeia regressões,
  identifica CHGs e produz 4 artefatos. ETAPA B: recebe o scope-change-gaps.md com respostas
  preenchidas e propaga as decisões para os artefatos _change, fecha CHGs e libera o caminho
  para spec-data-model, spec-api-contracts e spec-tasks em modo _change.
  Invocar Etapa A quando apresentar "Documento de Alteração de Escopo" ou mencionar
  "alteração de escopo", "escopo mudou", "novo escopo", "mudança de requisito".
  Invocar Etapa B quando disser "propagar respostas dos CHGs", "os gaps foram respondidos",
  "fechar os CHGs" ou apresentar scope-change-gaps.md preenchido.
  Conteúdo humano em Português do Brasil.
version: "1.3"
updated: "2026-10-21"
---

# spec-scope-change — Análise de Alteração de Escopo

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`MOD-EXEMPLO`, `RF-XXX`, `CHG-001`).

---

## Papel

Opera em **duas fases** — exatamente como o `spec-iterate`:

**Etapa A — Análise do delta:** recebe os Documentos de Alteração de Escopo e os artefatos
existentes do projeto para produzir uma análise estruturada — o que muda, o que quebra, o que
é novo, o que precisa ser decidido. Gera os CHGs que o negócio precisa responder.

**Etapa B — Propagação das respostas:** recebe o `scope-change-gaps.md` com as respostas
preenchidas e propaga cada decisão para os artefatos de análise, fecha os CHGs, atualiza
riscos e libera o caminho para as skills `spec-data-model`, `spec-api-contracts` e `spec-tasks`
em modo _change com entradas precisas e rastreáveis.

**Regra de ouro:** um CHG só está fechado quando (1) tem decisão específica em Respostas,
(2) foi propagado para os artefatos em "Afeta camadas", e (3) entrou no `sync-log.md`
no mesmo turno.

Esta skill é o **portão de entrada obrigatório** para qualquer ciclo de alteração de escopo
em projeto que já possui tasks no Azure DevOps.

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

Vale para `scope-change-analysis.md`, `scope-change-gaps.md` e a matriz de impacto. Este documento é lido por PO e por cliente para decidir se aprovam a mudança: o impacto vem em prazo, custo e o que deixa de ser entregue, em linguagem de negócio, antes de qualquer lista de artefatos afetados.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver
`../tools/references/task-pipeline.md` §4) e o histórico de decisões do projeto original.

Ao terminar **cada etapa**, adicionar UMA linha na Seção A, no **formato canônico de 9 colunas**
do `sync-log.md` (`# | Data/Hora | Skill | Modo / contexto | Inputs consumidos | Outputs gerados |
Decisões-chave | Decisor | Próximo passo` — dono do formato: `spec-iterate/templates/sync-log.md`),
com Skill = `spec-scope-change (Etapa A|B)`. Esta skill já gera essa linha pronta como **artefato
dedicado** (Artefato 4, no mesmo formato de 9 colunas) — colar o conteúdo desse artefato no
`sync-log.md` é o mecanismo de fechamento desta seção, não uma etapa adicional.

---

## Quando invocar

| Sinal | Invocar? |
|-------|----------|
| Documento com título "Documento de Alteração de Escopo" | **Sim — imediatamente** |
| "O escopo mudou, precisamos ajustar as tasks" | **Sim** |
| "Recebi uma nova regra de negócio do cliente" | **Sim** |
| "Precisamos adicionar uma feature ao projeto em andamento" | **Sim** |
| "Rodar tudo de novo porque o projeto mudou" | **Sim — em vez de rerrodar tudo** |
| Novo projeto sem especificação anterior | **Não — usar spec (orquestrador)** |
| Fechamento de gap isolado sem novo escopo | **Não — usar spec-iterate Etapa B** |

### Quando invocar cada etapa

| Etapa | Invocar quando |
|-------|----------------|
| **Etapa A** | Apresentar documento de alteração de escopo pela primeira vez neste ciclo |
| **Etapa B** | Dizer "os CHGs foram respondidos", "propagar respostas", "fechar os CHGs", ou apresentar `scope-change-gaps.md` com seção Respostas preenchida |

---

## Pré-requisitos

| Artefato | Obrigatório | Fonte |
|----------|-------------|-------|
| Um ou mais Documentos de Alteração de Escopo | **Sim** | Área negocial / cliente |
| `tasks.json` (original + complementos já gerados) | **Sim** | outputs/spec/ do projeto |
| `spec_story.md` de cada pasta de código (memória do módulo, mantida pela `spec-implement`) | **Sim**, quando o desenvolvimento já começou (K3) | raiz de cada pasta de código — no harness Elo, a «Pasta local» de cada repositório de papel `codigo` no `workspace.md` |
| `gaps-document.md` ou `gaps.md` originais | Recomendado | outputs/spec/ do projeto |
| `data-model.json` | Recomendado | outputs/spec/ ou equivalente |
| `api-contracts.yaml` | Recomendado | outputs/spec/ ou equivalente |
| Especificação original (requirements.md, business-rules.md etc.) | Recomendado | outputs/spec do projeto |

**Paths de saída (default):**
Salvar todos os artefatos na mesma pasta onde está o `tasks.json` do projeto
(normalmente `outputs/spec/` do subprojeto).

---

## Kickoff obrigatório

Antes de qualquer análise, executar este kickoff com o usuário:

### Passo K1 — Identificar os documentos de alteração

Listar os documentos de alteração recebidos e confirmar:

> "Identifiquei os seguintes documentos de alteração de escopo:
> - [Doc 1] — Tema: [tema] — Data: [data] — Status: [status]
> - [Doc 2] — Tema: [tema] — Data: [data] — Status: [status]
>
> Confirma que esses são todos os documentos desta rodada de alteração?"

### Passo K2 — Mapear os artefatos existentes

Localizar e confirmar o que existe do projeto:

> "Encontrei os seguintes artefatos do projeto:
> - tasks.json: ✅ [N stories, N tasks] / ❌ não encontrado
> - tasks-complementary-*.json: ✅ [N arquivos] / ❌ não encontrado
> - data-model.json: ✅ / ❌ não encontrado (análise de modelo será em modo degradado)
> - api-contracts.yaml: ✅ / ❌ não encontrado (análise de contratos será em modo degradado)
> - gaps-document.md: ✅ [N gaps] / ❌ não encontrado
> - spec_story.md: ✅ [N pastas de código, N tasks registradas] / ❌ nenhum (o código entregue
>   será localizado só por busca no código — `SPEC_STORY_ABSENT`)
> - estado das tasks: ✅ ADO (`System.State` de cada work item) / só `spec_story.md` (sem backlog
>   publicado)
>
> Posso prosseguir com o que está disponível?"

### Passo K3 — Confirmar o estado do desenvolvimento

> "Em que fase está o desenvolvimento do projeto?
> - [ ] Especificação — não iniciado
> - [ ] Em desenvolvimento ativo
> - [ ] Em testes / homologação  ← situação mais comum para alterações
> - [ ] Em produção
>
> Isso determina o nível de risco de regressão que aplicarei na análise."

### Passo K4 — Confirmar destino das tasks e sigla do change

> "As tasks novas geradas por esta alteração devem ir para um novo arquivo complementar.
> Qual sigla devo usar para identificar este ciclo de alteração?
> Exemplo: `[tema-curto-da-mudanca]`, `v2-scope-[mes/ano]`
>
> O arquivo gerado será: tasks-complementary_change-[sigla].json
>
> Recomendação: use uma sigla curta que identifique o tema principal desta alteração."

---

## Ordem de execução

```
K  → Kickoff (§ Kickoff obrigatório)

A  → Leitura dos documentos de alteração
   ↪ Para cada documento: extrair regras definidas, critérios de aceite,
     impactos declarados, questões em aberto e vigência

B  → Leitura dos artefatos existentes
   ↪ tasks.json + complementos: inventariar stories e tasks por área afetada
   ↪ estado de cada task: `System.State` do work item no ADO (backlog publicado) ou a linha
     `**State:**` da entrada da task no spec_story.md — separar entregue de não iniciado
   ↪ spec_story.md de cada pasta de código dos módulos afetados: tasks já implementadas,
     arquivos em «Implementado», testes em «Testes», «Padrões estabelecidos»
   ↪ data-model.json: identificar entidades e campos relevantes ao delta
   ↪ api-contracts.yaml: identificar endpoints e schemas relevantes ao delta
   ↪ gaps-document.md: identificar gaps anteriores relacionados ao novo escopo

C  → Classificação do delta (§ Classificação do delta)
   ↪ Para cada mudança: ADIÇÃO / ALTERAÇÃO / REMOÇÃO /
     COMPORTAMENTO_CONDICIONAL / RESPONSABILIDADE / VIGÊNCIA

D  → Análise de impacto por camada (§ Análise por camada)
   ↪ Negócio → Contrato de API → Modelo de dados → Tela/UX → Testes
   ↪ Contrato afetado: oasdiff + derivação mecânica de telas — mecânica completa na § Camada 2

E  → Mapeamento de regressões (§ Regressões potenciais)
   ↪ Quais tasks já entregues podem quebrar com a mudança?
   ↪ Qual código já entregue a mudança toca (arquivo, símbolo, teste que prende o valor atual)?
   ↪ O que precisa ser alterado vs. o que é apenas adição?

F  → Identificação de gaps (§ Gaps da alteração)
   ↪ Questões abertas declaradas no documento de alteração
   ↪ Questões que o documento não responde mas que a implementação precisará
   ↪ Inconsistências entre a alteração e os artefatos existentes

G  → Avaliação de risco e tamanho (§ Avaliação de risco)

H  → Geração dos 4 artefatos de saída (§ Saídas)

I  → Orientação explícita dos próximos passos (§ Próximos passos)
```

---

## Classificação do delta

Para cada mudança identificada, classificar com um dos tipos abaixo:

| Tipo | Definição | Exemplo |
|------|-----------|---------|
| `ADIÇÃO` | Funcionalidade nova que não existia | Nova consulta por um identificador que o sistema não expunha |
| `ALTERAÇÃO` | Regra ou comportamento existente que muda | Campo obrigatório torna-se condicional |
| `REMOÇÃO` | Algo especificado que deixa de existir | Campo removido do payload de uma operação |
| `COMPORTAMENTO_CONDICIONAL` | Lógica nova que depende de contexto específico | Obrigatoriedade de campo ativa apenas no cenário X |
| `RESPONSABILIDADE` | Quem calcula / valida / persiste muda de sistema | Classificação que sai de um sistema e passa para outro |
| `VIGÊNCIA` | Regra que passa a valer a partir de uma data/evento | Regra ativa a partir do próximo exercício |

---

## Análise por camada

Para cada delta, analisar o impacto em todas as camadas relevantes:

### Camada 1 — Regras de Negócio
- Qual regra nova foi definida?
- Qual regra existente foi alterada ou removida?
- A nova regra conflita com alguma regra já documentada?
- A regra tem exceções ou condições de contorno não cobertas?

### Camada 2 — Contrato de API
- Quais endpoints são afetados?
- Campos adicionados / removidos / com obrigatoriedade alterada no request?
- Campos adicionados / removidos / com tipo alterado no response?
- Novos endpoints necessários?
- Novos códigos de erro necessários?
- Semântica HTTP alterada em alguma operação?

**Delta determinístico com oasdiff (obrigatório quando `api-contracts.yaml` é afetado):**
quando a alteração de escopo toca o contrato de API e existe uma versão proposta do contrato
(fornecida no documento de alteração ou rascunhada nesta análise), rodar:

```bash
oasdiff breaking <api-contracts.yaml vigente> <contrato proposto>
```

A lista determinística de
breaking changes produzida pelo oasdiff **alimenta diretamente** a classificação de impactos por
camada (esta seção) e a geração dos `CHG-XXX` — cada breaking change vira um CHG ou é justificado
na análise. O fechamento formal ocorre depois, no gate `BREAKING_CHANGES_MAPPED` do
`spec-api-contracts` (modo _change), que reexecuta o oasdiff sobre o contrato final.

**Obtenção do oasdiff** — política de [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md):
**verificar (`oasdiff --version`) → rota efêmera → degradar**. Rota efêmera (não muta o ambiente,
dispensa aprovação):

```bash
docker run --rm -v "$PWD:/w" -w /w tufin/oasdiff breaking <vigente> <proposto>
```

**Sem binário no PATH e sem Docker não existe rota determinística** — nesse caso o passo **não é
bloqueante em nenhuma hipótese**: registrar `TOOL_UNAVAILABLE:oasdiff (sem binário nem container)`
no sync-log e fazer a comparação por releitura LLM dos dois contratos com **revisão manual
declarada** (`revisor=<quem>`), marcando a análise como não verificada por ferramenta. Instalação
permanente (binário de https://github.com/oasdiff/oasdiff, `go install`) só é **oferecida** ao
usuário e executada com aprovação registrada (`TOOL_INSTALLED:oasdiff (aprovado por <quem>, <comando>)`).

**Telas e etapas afetadas (derivação mecânica via Amarração Técnica):** quando
`outputs/spec/flow-map.md` existe com a seção `## Amarração Técnica` e a coluna Endpoints
preenchida (Fase 7b), derivar **mecanicamente** cada impacto de contrato:
breaking change → endpoint (`METHOD /path`) → tela(s) (linhas da amarração que citam o endpoint)
→ etapa(s)/fluxo(s) (linhas de `## Etapas` cuja coluna Tela referencia a TEL-xxx; fluxo pela
coluna Fluxo). Essa cadeia alimenta:

- a subseção **"Telas e etapas afetadas"** do relatório de impacto (`scope-change-analysis.md`,
  Artefato 1) e a coluna correspondente na matriz (Artefato 2);
- os `CHG-XXX` que tocam contrato — cada um **deve citar as telas afetadas** (TEL-xxx) nos campos
  Descrição / Impacto se não resolvido / Afeta camadas.

**Modo degradado `[impacto-llm]`:** sem flow-map, sem `## Amarração Técnica` ou com a coluna
Endpoints em `—`, derivar o impacto de telas por análise do modelo (leitura de PRs, telas e
contrato), marcando **cada item assim derivado** com o sufixo `[impacto-llm]` — sinaliza que a
lista não foi derivada mecanicamente e deve ser conferida quando a amarração for preenchida.

### Camada 3 — Modelo de Dados
- Quais entidades / tabelas são afetadas?
- Colunas adicionadas / removidas / com constraint alterada?
- Novas entidades necessárias?
- Relacionamentos novos ou alterados?
- Dados existentes impactados — migração ou transformação necessária?

### Camada 4 — Tela / UX
- Quais telas / componentes são afetados?
- Campos novos a exibir ou ocultar?
- Novos fluxos ou opções na interface?
- Mensagens novas para o usuário (bloqueios, validações, notificações)?
- Tela de referência fornecida no documento? (usar como fonte de verdade visual)

### Camada 5 — Testes / Homologação
- Quais cenários de teste existentes precisam ser revisados?
- Quais novos cenários de teste são necessários?
- Existem parametrizações prévias (dados de configuração, cadastros de apoio, flags de ambiente) necessárias antes de testar?
- Os critérios de aceite do documento de alteração são testáveis como estão?

### Camada de arquitetura (HLD) *(condicional — só quando existe `outputs/spec/hld.md`)*

Não entra na contagem das 5 camadas (severidade e Definição de Pronto continuam contando 5) —
é uma checagem extra que só existe em projetos que rodaram a Fase 6.6:
- Algum módulo novo do delta não tem container? Algum módulo marcado `N/A` voltou ao escopo?
- O delta cria integração com sistema externo que ainda não tem linha `INT-NN`?
- Algum RNF novo ou alterado fica sem tática — ou vira risco aceito?
- Alguma decisão macro do delta contradiz um ADR já registrado? (contradizer é permitido; virar
  ADR novo que substitui o anterior, não silenciosamente)

---

## Regressões potenciais

Esta é a análise mais crítica para projetos em testes ou produção.

O `tasks.json` diz o que foi **planejado**; o que já foi **entregue** está em outro lugar. Antes da
tabela, montar o retrato do que existe — sem ele, uma mudança em regra já implementada passa como
se fosse só texto de especificação:

1. **Estado de cada task.** Com o backlog publicado no ADO, o `System.State` do work item (MCP
   `wit_get_work_item`); sem ADO, a linha `**State:**` da entrada `### Task #<id>` no
   `spec_story.md`. Task sem entrada no `spec_story.md` e sem estado no ADO conta como não
   iniciada — e isso fica escrito na análise.
2. **Memória dos módulos afetados.** Ler inteiro o `spec_story.md` da raiz de cada pasta de código
   que o delta toca (é a memória do módulo, mantida pela `spec-implement` e pela `spec-debug-fix`):
   a lista «Implementado» de cada task traz os arquivos; o bloco «Testes», os testes que provam o
   comportamento atual; «Padrões estabelecidos» e «Decisões», o que a mudança pode contradizer.
3. **Código já entregue que a mudança toca.** Para cada regra, campo, faixa ou mensagem que muda,
   procurar nos arquivos do passo 2 (e, por busca, no resto da pasta de código) onde o valor atual
   está escrito: constante, enum, tabela de faixas, validação, mensagem, e o teste de borda que
   prende o valor antigo. Cada achado vira linha da tabela «Código já entregue que a mudança toca»
   do `scope-change-analysis.md` — task, estado, arquivo e símbolo, teste que prende o
   comportamento atual, o que muda. Sem `spec_story.md` com desenvolvimento iniciado (K3), fazer só
   a busca e registrar `SPEC_STORY_ABSENT`.

Com esse retrato, para cada task em `tasks.json` + complementos, verificar:

| Pergunta de auditoria | Nível de risco |
|-----------------------|----------------|
| Esta task já entregue fixou em código ou em teste o valor ou a regra que muda (constante, enum, faixa, mensagem)? | 🔴 ALTO — o código e o teste de borda mudam juntos |
| Esta task implementou campo que será removido? | 🔴 ALTO — retrabalho certo |
| Esta task implementou obrigatoriedade que passa a ser condicional? | 🔴 ALTO — lógica de validação muda |
| Esta task depende de comportamento que mudou de responsável de sistema? | 🟡 MÉDIO — orquestração afetada |
| Esta task testa cenário que agora tem nova ramificação? | 🟡 MÉDIO — cenário desatualizado |
| Esta task está na mesma frente de trabalho / módulo do que mudou? | 🟡 MÉDIO — verificar colaterais |
| Esta task está em módulo distinto sem dependência declarada? | 🟢 BAIXO — provavelmente segura |

**Regra crítica:** se a task possui `acceptanceScenarios` com `testData` concreto, verificar
se o payload/schema nesses cenários ainda é válido após a alteração. Payload desatualizado
em cenário de teste é regressão confirmada.

---

## Avaliação de risco

### Nível de risco global

| Nível | Critério |
|-------|----------|
| 🔴 ALTO | Há REMOÇÃO de campo usado em tasks desenvolvidas; OU mudança de RESPONSABILIDADE entre sistemas; OU vigência imediata sem período de adaptação; OU CHGs críticos sem resposta |
| 🟡 MÉDIO | Há COMPORTAMENTO_CONDICIONAL em fluxo existente; OU nova validação em área já implementada; OU novos cenários em tela já desenvolvida; OU CHGs altos sem resposta |
| 🟢 BAIXO | Apenas ADIÇÕES em áreas não implementadas; sem campos removidos; sem mudança de responsabilidade; todos os CHGs respondidos |

### Tamanho estimado do delta

| Tamanho | Critério orientativo |
|---------|---------------------|
| PEQUENO | ≤ 3 tasks novas; impacto em ≤ 2 camadas; nenhuma regressão confirmada |
| MÉDIO | 4–8 tasks novas; impacto em 3 camadas; até 2 regressões identificadas |
| GRANDE | ≥ 9 tasks novas; impacto em 4+ camadas; ≥ 3 regressões; OU CHGs críticos em aberto |

---

## Gaps da alteração — formato CHG-XXX

Os gaps desta skill usam prefixo `CHG-` para distinguir dos GAPs de especificação original.

### Tipos de CHG

| Tipo | Quando usar |
|------|-------------|
| `QUESTÃO_ABERTA` | Pergunta declarada no próprio documento de alteração ainda sem resposta |
| `INCOMPLETO` | A alteração define "o quê" mas não define "como" o suficiente para implementar |
| `CONFLITO` | A alteração contradiz algo já documentado ou já implementado |
| `DEPENDÊNCIA_EXTERNA` | Implementação depende de configuração, dado ou ação de outro sistema/equipe |
| `VIGÊNCIA_INDEFINIDA` | A regra não define quando começa a valer |

### Formato obrigatório do CHG

Bloco de **12 campos + Decisão consolidada** pronto em
[`templates/scope-change-gaps.md`](templates/scope-change-gaps.md) — os nomes dos campos estão
enumerados no gate `EVERY_CHG_12_FIELDS`; **Decisão consolidada** é preenchida só na Etapa B
(texto da decisão + nome/área do decisor + data).

### Heurística de severidade para CHGs

| Severidade | Quando usar |
|------------|-------------|
| `CRÍTICA` | Bloqueia geração de tasks ou contratos; sem a resposta a implementação vai errar |
| `ALTA` | Permite gerar tasks com premissa assumida, mas com risco alto de retrabalho |
| `MÉDIA` | Gera incerteza em cenário específico; implementação principal pode avançar |
| `BAIXA` | Detalhe que não afeta fluxo principal; pode ser resolvido em sprint |

**Quota mínima:** registrar TODOS os CHGs identificados, inclusive os de severidade BAIXA.
Questões abertas declaradas pelo próprio documento de alteração são CHGs automáticos.

---

## Saídas — os 4 artefatos

### Artefato 1: `scope-change-analysis.md`
**Audiência:** PM, arquiteto, tech lead
**Propósito:** visão completa do delta — o que muda, o que quebra, o que está em aberto

Estrutura obrigatória em [`templates/scope-change-analysis.md`](templates/scope-change-analysis.md)
— o template é a forma canônica (inclui seções que a prosa não repete, como critérios de aceite de
negócio e tasks sem impacto). A subseção **«Telas e etapas afetadas»** vem da derivação mecânica
da § Camada 2 (itens sem amarração marcados `[impacto-llm]`); a tabela **«Código já entregue que a
mudança toca»** vem da § Regressões potenciais (estado das tasks + `spec_story.md`).

---

### Artefato 2: `scope-change-impact-matrix.md`
**Audiência:** devs, QA
**Propósito:** mapa rápido e visual do que muda em cada camada e artefato

Ver template em [`templates/scope-change-impact-matrix.md`](templates/scope-change-impact-matrix.md).

---

### Artefato 3: `scope-change-gaps.md`
**Audiência:** PM, área negocial
**Propósito:** documento de decisões pendentes — preencher antes de rodar as skills _change

Ver template em [`templates/scope-change-gaps.md`](templates/scope-change-gaps.md) — CHGs
organizados por severidade + seção `## Respostas` vazia para o negócio preencher.

---

### Artefato 4: `scope-change-sync-log-entry.md`
**Audiência:** consultor / agente
**Propósito:** entrada pré-formatada para colar no sync-log.md do projeto

Ver template em [`templates/scope-change-sync-log-entry.md`](templates/scope-change-sync-log-entry.md)
— traz uma linha de tabela para a Etapa A e outra para a Etapa B (gerar a de Etapa B só quando
essa fase rodar).

---

## Próximos passos após esta skill

Ao final da análise, o agente orienta explicitamente com esta estrutura:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRÓXIMOS PASSOS — Alteração de Escopo [Projeto]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSO 1 — [SE CHGs CRÍTICOS ou ALTOS em aberto]
  Responder scope-change-gaps.md com área negocial ANTES de prosseguir.
  CHGs bloqueantes identificados: CHG-001 (bloqueia modelo + tasks),
                                  CHG-003 (bloqueia contratos)

PASSO 2 — Modelo de dados [APÓS CHGs críticos respondidos]
  Invocar: spec-data-model
  Prompt: "Gere o data-model_change.json considerando as alterações em
           scope-change-analysis.md. Este é um modo _change: gerar apenas
           o delta em relação ao data-model.json existente."
  Saída esperada: data-model_change.json

PASSO 3 — Contratos de API
  Invocar: spec-api-contracts
  Prompt: "Gere api-contracts_change.yaml e api-contracts-supplement_change.json
           com base no data-model_change.json e scope-change-analysis.md.
           Este é um modo _change: documentar apenas endpoints novos ou alterados."
  Saída esperada: api-contracts_change.yaml + api-contracts-supplement_change.json

PASSO 4 — Tasks de implementação
  Invocar: spec-tasks
  Prompt: "Gere tasks-complementary_change-[sigla].json com base nos artefatos
           _change gerados. Este é um modo _change: não alterar tasks existentes,
           apenas gerar o delta de implementação para as alterações de escopo."
  Saída esperada: tasks-complementary_change-[sigla].json

PASSO 5 — Relatório visual
  Invocar: spec-tasks-html
  Saída: tasks-complementary_change-[sigla]-view.html

PASSO 6 — Publicar no ADO
  Invocar: spec-tasks-azure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Etapa B — Propagação das Respostas

### Como o consultor/PM responde aos CHGs

Três caminhos equivalentes:

**Caminho A — Resposta no chat:**
Colar as respostas por ID (`CHG-001: "a regra vale para todos os tipos de doação"`).
O agente atualiza `scope-change-gaps.md` e propaga imediatamente.

**Caminho B — `scope-change-gaps.md` preenchido:**
Preencher a seção `## Respostas` do arquivo gerado na Etapa A e invocar a skill novamente:
> "Os CHGs foram respondidos em scope-change-gaps.md. Propague as respostas."

**Caminho C — Nova evidência:**
Se a resposta vier como novo documento (ata de reunião, e-mail, documento complementar)
→ extrair as decisões como respostas aos CHGs correspondentes e depois propagar.

### Ordem de execução na Etapa B

```
A2 → Ler scope-change-gaps.md — identificar CHGs com respostas preenchidas
   ↪ Separar: respondidos / em aberto / dep. externa

B2 → Para cada CHG respondido:
   ↪ Verificar se a resposta é ESPECÍFICA o suficiente para gerar artefato
   ↪ Resposta vaga ("o time vai decidir") → manter aberto, pedir resposta acionável
   ↪ Resposta específica → prosseguir com propagação

C2 → Propagar para scope-change-analysis.md:
   ↪ Atualizar status do CHG (aberto → fechado)
   ↪ Atualizar risco global se CHG CRÍTICO foi respondido (pode baixar de 🔴 para 🟡)
   ↪ Mover item de "O que está bloqueado" para "O que pode avançar"
   ↪ Registrar a decisão no campo "Decisão consolidada" do CHG

D2 → Propagar para scope-change-impact-matrix.md:
   ↪ Atualizar linhas afetadas pelo CHG com a decisão tomada
   ↪ Adicionar notas de implementação derivadas da resposta

D2b → Propagar para hld.md (só quando o arquivo existe e o delta toca a arquitetura):
   ↪ Módulo novo → linha em ## Decomposição por módulo; módulo que saiu → N/A com justificativa
   ↪ Sistema externo novo → linha INT-NN com Direção e Estilo declarados
   ↪ RNF novo/alterado → linha em ## Táticas por RNF (tática ou risco aceito justificado)
   ↪ Decisão macro que muda → ADR novo citando o ADR que ele substitui (nunca editar o antigo)
   ↪ Revalidar: `python3 ../tools/check-hld.py outputs/spec/hld.md` até exit 0
   ↪ Sem hld.md (projeto anterior à Fase 6.6) → registrar HLD_MISSING no sync-log e seguir

E2 → Atualizar scope-change-gaps.md:
   ↪ Marcar CHG como `Status: decidido`
   ↪ Registrar decisor e data
   ↪ Se resposta DIVERGE de "Sugestão de tratamento" → registrar divergência explicitamente
   ↪ Se resposta CONFIRMA a sugestão → registrar "seguiu sugestão"

F2 → Gerar scope-change-sync-log-entry.md atualizado:
   ↪ Entrada de Etapa B separada da entrada de Etapa A
   ↪ Incluir: CHGs fechados, decisor de cada um, artefatos propagados

G2 → Emitir relatório de status para o usuário (§ Relatório de Etapa B)
   ↪ O que foi fechado e o que continua aberto
   ↪ Confirmação de que o caminho está liberado para as próximas skills
```

### Relatório de Etapa B — saída obrigatória ao usuário

Ao final da Etapa B, emitir sempre este relatório:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA B CONCLUÍDA — Propagação de CHGs — [Projeto]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHGs fechados neste turno: N
  ✅ CHG-001 — [tema] — decidido por [nome/área]
  ✅ CHG-002 — [tema] — decidido por [nome/área]

CHGs ainda em aberto: N
  ⏳ CHG-003 — [tema] — dep. externa: [quem decide]
  ⏳ CHG-004 — [tema] — aguardando resposta

Risco global: [antes] → [depois]  (se mudou)

━━━ O QUE ESTÁ LIBERADO PARA AS PRÓXIMAS SKILLS ━━━

✅ LIBERADO — pode prosseguir agora:
  → spec-data-model (modo _change)
  → spec-api-contracts (modo _change)

⚠️  PARCIALMENTE BLOQUEADO — pode gerar com premissa assumida:
  → spec-tasks (modo _change) — CHG-003 em aberto afeta [área específica];
    gerar tasks com nota de pendência em selfContainedSummary

❌ BLOQUEADO — não prosseguir:
  → [nenhum / ou skill específica com motivo]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Critérios de fechamento de CHG

Mesmo critério de **resposta válida** do `spec-iterate`: a resposta contém, na mesma entrada, os
**quatro elementos** — decisão concreta + decisor (nome/papel) + data + **valor ou regra
específica**. Além disso: propagada para todos os artefatos em "Afeta camadas" e entrada gerada em
`scope-change-sync-log-entry.md` no mesmo turno (`SYNC_ENTRY_EMITTED`). Resposta vaga ("o time vai
avaliar") → registrar parcial, manter `Status: aberto` (`VAGUE_ANSWER_REJECTED`).

### Tratamento de CHG com resposta parcialmente bloqueante

Quando um CHG CRÍTICO continua em aberto mas as demais skills precisam avançar:

1. Registrar `Status: dep. externa` com nome do responsável e prazo esperado
2. Na Etapa B, orientar a skill seguinte a gerar o artefato com **premissa assumida explícita**
3. A premissa assumida deve aparecer no `selfContainedSummary` das tasks afetadas:
   > "⚠️ PREMISSA: [descrição da premissa assumida]. CHG-XXX em aberto — revisar antes de implementar."
4. Registrar no `scope-change-analysis.md` que aquela área tem task com premissa pendente

---

## Definição de pronto

A lista de fechamento são os **Validators** abaixo — conferir cada código um a um. Itens sem
validator próprio:

**Etapa A:**
- [ ] Kickoff K1–K4 executado (documentos, artefatos, fase do desenvolvimento, sigla)
- [ ] Delta classificado por tipo e impacto analisado nas 5 camadas para cada mudança
- [ ] Os 4 artefatos gerados

**Etapa B:**
- [ ] Divergências entre resposta e sugestão original registradas explicitamente
- [ ] Relatório de Etapa B emitido (liberado / parcial / bloqueado por skill `_change`)
- [ ] CHGs com `dep. externa` têm responsável e prazo registrados


---

## Validators (FATAL / WARNING)

### FATAL — bloqueia o handoff para as skills `_change`

| Código | Verificação |
|--------|-------------|
| `EVERY_CHG_12_FIELDS` | Todo CHG identificado tem os 12 campos obrigatórios preenchidos (Tipo, Severidade, Status, Documento de origem, Tema, Descrição, Impacto se não resolvido, Pergunta para o negócio, Dono sugerido, Sugestão de tratamento, Afeta camadas, Bloqueante para) |
| `REGRESSION_AUDIT_COMPLETE` | Todas as tasks existentes (`tasks.json` + complementos) foram auditadas contra o delta, com o estado de cada uma (ADO ou `spec_story.md`); o `spec_story.md` dos módulos afetados foi lido e a tabela «Código já entregue que a mudança toca» está no `scope-change-analysis.md` (ou declara que nada foi entregue); payloads de `acceptanceScenarios` verificados contra o novo escopo |
| `OUT_OF_SCOPE_CAPTURED` | A seção "Fora do escopo desta alteração" de cada documento de alteração foi copiada literalmente para `scope-change-analysis.md` |
| `VAGUE_ANSWER_REJECTED` | (Etapa B) Nenhuma resposta vaga ("o time vai decidir", "depende do contexto") foi aceita como fechamento de CHG — CHG permanece `aberto` até resposta acionável |
| `SYNC_ENTRY_EMITTED` | `scope-change-sync-log-entry.md` foi gerado (Etapa A) ou atualizado com entrada separada (Etapa B) no mesmo turno em que os CHGs foram fechados |

### WARNING — não bloqueia, registrar e seguir

| Código | Verificação |
|--------|-------------|
| `LOW_SEVERITY_CHG_MISSING` | Quota mínima: CHGs de severidade BAIXA identificados mas não registrados no documento de gaps |
| `NEXT_STEPS_NOT_EXPLICIT` | Próximos passos não apresentados com prompts prontos para cada skill `_change` (§ Próximos passos) |
| `OASDIFF_DELTA_MISSING` | `api-contracts.yaml` afetado pelo delta sem `oasdiff breaking` executado nem `TOOL_UNAVAILABLE:oasdiff` registrado — política completa na § Camada 2 |
| `CHG_WITHOUT_SCREENS` | CHG que toca contrato de API sem citar as telas afetadas (TEL-xxx ou `[impacto-llm]`) — derivação na § Camada 2 |
| `SPEC_STORY_ABSENT` | Desenvolvimento já iniciado (K3) e nenhum `spec_story.md` nas pastas de código — o código entregue foi localizado só por busca, sem o histórico das tasks (§ Regressões potenciais) |

---

## Skills irmãs

| Skill | Consome | Produz |
|-------|---------|--------|
| `spec-iterate` | — (padrão de duas fases replicado por esta skill) | `gaps.md` — mecanismo análogo, mas para a especificação original, não para alterações |
| `spec-data-model` | `scope-change-analysis.md` + CHGs respondidos | `data-model_change.json` |
| `spec-api-contracts` | `data-model_change.json` + `scope-change-analysis.md` | `api-contracts_change.yaml` + suplemento |
| `spec-tasks` | Artefatos `_change` + CHGs fechados | `tasks-complementary_change-[sigla].json` |
| `spec-tasks-html` | `tasks-complementary_change-*.json` | Relatório HTML do change |
| `spec-tasks-azure` | `tasks-complementary_change-*.json` | Work items publicados no ADO |

## O que NÃO faz
- Não re-executa `spec-ingest`, `spec-legacy` ou `spec-product` do zero — preserva os artefatos base do projeto
- Não gera ou altera o `tasks.json` principal — apenas o arquivo complementar `_change`
- Não implementa código, modelo de dados ou contratos — apenas analisa o delta e propaga decisões
- Não substitui a validação de negócio — apenas identifica e organiza o que precisa ser decidido

---

## Anti-padrões

Os erros já cobertos por gate ou pelo «O que NÃO faz» acima não se repetem aqui. Restam dois que
nenhum gate captura:

| Anti-padrão | Por que evitar |
|-------------|----------------|
| Gerar artefatos _change sem o sufixo `_change` no nome do arquivo | Rompe rastreabilidade do ciclo de alteração |
| Analisar apenas o documento mais recente ignorando complementos anteriores | Um change pode depender de outro; analisar todos da rodada |

---

## Templates

- [`templates/scope-change-gaps.md`](templates/scope-change-gaps.md) — template do documento de CHGs (Artefato 3)
- [`templates/scope-change-analysis.md`](templates/scope-change-analysis.md) — stub da análise principal (Artefato 1)
- [`templates/scope-change-impact-matrix.md`](templates/scope-change-impact-matrix.md) — stub da matriz de impacto (Artefato 2)
- [`templates/scope-change-sync-log-entry.md`](templates/scope-change-sync-log-entry.md) — entrada pronta para o sync-log.md (Artefato 4)

## References

- [`../spec-iterate/SKILL.md`](../spec-iterate/SKILL.md) — propagação de gaps após respostas (Etapa B)
- [`../spec-data-model/SKILL.md`](../spec-data-model/SKILL.md) — skill seguinte (modo _change)
- [`../spec-api-contracts/SKILL.md`](../spec-api-contracts/SKILL.md) — skill seguinte (modo _change)
- [`../spec-tasks/SKILL.md`](../spec-tasks/SKILL.md) — skill seguinte (modo _change)
- `../tools/references/task-pipeline.md` — vocabulário da cadeia técnica
