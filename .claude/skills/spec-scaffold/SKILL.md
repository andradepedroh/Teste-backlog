---
name: spec-scaffold
description: >
  spec-scaffold (Fase 10 — Scaffold) — invocar quando o usuário quiser gerar estrutura
  inicial de código (scaffold) a partir de regras e arquitetura definidas. Lê o diretório
  de regras do projeto (fonte obrigatória) e, quando existirem, data-model.json,
  api-contracts.yaml e requirements (recomendados — a ausência ativa o modo degradado
  W-NO-SPECS) para criar módulos, estrutura de pastas, builds, testes e configurações
  iniciais. Produz código base estruturado pronto para implementação. Conteúdo humano
  gerado em Português do Brasil.
version: "1.2"
updated: "2026-10-20"
---

# spec-scaffold — Geração de Estrutura de Código (Scaffold)

> **Skill agnóstica de projeto.** Não contém referências a projetos específicos.
> Todos os exemplos usam placeholders (`MOD-EXEMPLO`, `RF-XXX`, `ENTIDADE-XXX`).

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-scaffold | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

## Papel

Esta é a **Fase 10** da cadeia técnica. Gera estrutura inicial de código (scaffold) a partir de:
- Regras e arquitetura do projeto (`.cursor/rules/` ou `.claude/rules/`)
- Modelo de dados (`data-model.json` da Fase 7a) — quando disponível
- Contratos de API (`api-contracts.yaml` da Fase 7b) — quando disponível
- Requisitos funcionais (`requirements.md` da Fase 5/5) — quando disponível

Produz código base estruturado pronto para implementação (Fase 11). **As regras do projeto são
a única fonte normativa** de arquitetura, stack, naming e expectativas de entrega — esta skill
não embute nenhuma stack default.

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

Vale para o README e para os comentários de estrutura gerados, e para a devolutiva no chat: cada pasta criada vem com o papel dela em uma linha.

## Pré-requisitos

| Insumo | Obrigatório? | Consumo |
|--------|--------------|---------|
| Diretório de regras do projeto (`.cursor/rules/` ou `.claude/rules/`) | **Sim** | Única fonte de arquitetura, stack, naming e expectativas de entrega |
| Target path (caminho de destino da nova árvore) | **Sim** (operacional) | Raiz onde o scaffold será criado — não substitui o diretório de regras |
| `data-model.json` (Fase 7a, `spec-data-model`) | Recomendado — degrada com aviso | Deriva estrutura de entidades/modelos |
| `api-contracts.yaml` (Fase 7b, `spec-api-contracts`) | Recomendado — degrada com aviso | Deriva controllers/rotas/endpoints |
| `outputs/spec/hld.md` (`spec-hld`) — lido **só** via `python3 ../tools/check-hld.py outputs/spec/hld.md --json`, nunca reparseando o `.md` | Recomendado | Os `containers` e a `decomposicao` dão os nomes e as fronteiras dos serviços e módulos; a forma de cada um continua vindo das rules. Sem ele, a árvore sai só das rules |
| `outputs/spec/requirements/requirements.md` (Fase 5/5) | Recomendado | Contexto de requisitos funcionais para nomear módulos |
| Contexto adicional (ADRs, protótipo, trechos de OpenAPI, etc.) | Opcional | Refina nomenclatura/exemplos; nunca sobrepõe as regras |

**Modo degradado `W-NO-SPECS`** — quando `data-model.json` e/ou `api-contracts.yaml` estão
ausentes: a skill gera **apenas a estrutura organizacional** (pastas, build, configs, testes
vazios) prevista pelas regras — **não** gera entidades, migrations, controllers ou rotas
concretas. O relatório final deve avisar explicitamente quais artefatos não foram gerados por
falta de insumo e recomendar rodar `spec-data-model` / `spec-api-contracts` antes de uma nova
execução completa.

**Path de saída (regra única):** se o usuário não informou o destino, **propor `src/` no
workspace root e confirmar em uma linha** — sem destino confirmado após a pergunta, o gate
`TARGET_PATH_MISSING` bloqueia. O destino é localização de saída, não um segundo parâmetro de
regras.

---

## Entradas

O que cada insumo é e sua obrigatoriedade estão na tabela **Pré-requisitos** acima. Regras de
resolução:

> **Localizar regras:** se o usuário não informar um diretório de regras explícito, usar o do
> repositório do projeto — `.claude/rules/` ou `.cursor/rules/`, resolvido conforme
> `../tools/references/task-pipeline.md` §3. Regras do projeto prevalecem sobre as genéricas.
> Sempre aplicar `security.mdc`/`security.md`.

### Descobrindo quais arquivos ler

1. Se o diretório de regras contém um arquivo UTF-8 chamado **`reading-order.txt`** (ou
   **`RULES_ORDER.txt`**): tratar como manifesto — um caminho **relativo** por linha sob esse
   diretório; linhas iniciadas com `#` e linhas em branco são ignoradas. Ler os arquivos
   listados **nessa ordem**; se um arquivo listado estiver ausente, parar e pedir ao usuário
   para corrigir o manifesto ou os caminhos.
2. **Caso contrário:** ler **todos** os
   arquivos `.mdc`, `.md` ou `.txt` do diretório (não recursivo: **apenas** o diretório em si,
   não subpastas), ordenados por **caminho completo** lexicograficamente. Nenhuma fica de fora:
   a tabela de cobertura abaixo cobra autenticação, observabilidade e integrações, e é das rules
   `auth`, `observability` e `integrations` que saem a configuração de auth e CORS, o formato do
   log e a pasta dos adapters. Se o diretório estiver vazio ou sem arquivos correspondentes,
   parar e pedir ao usuário para adicionar regras ou fornecer um manifesto.
3. **Projeto com o harness Elo — as duas rules do harness, lidas explicitamente.** A `security` e a
   constituição de frontend moram em `.claude/rules/harness/security.md` e
   `.claude/rules/harness/frontend.md` e não são copiadas para a raiz (Decisão 73). Ler a
   `security` sempre e, quando o produto tem UI, a de frontend — ela só carrega sozinha ao abrir
   um arquivo de tela, e o scaffold cria esses arquivos, não os abre. O `frontend` da raiz, quando
   existe, é o complemento do projeto e remete a ela.

Não assumir nomes de arquivo além dessa descoberta. Não trazer arquivos de regra
de fora do **diretório de regras**, a menos que o usuário os adicione em **contexto adicional**,
uma **regra lida** aponte explicitamente para outro caminho (raro), ou sejam as duas do harness
do passo 3.

**Contexto adicional:** lido **depois** de todas as regras, na ordem do usuário — refina
nomenclatura/exemplos e **não** sobrepõe as regras, a menos que o usuário declare override
explícito.

---

## Regras rígidas (proibição de templates)

- **Proibido:** usar outro repositório ou projeto irmão como fonte **em massa** (copiar/renomear
  árvores inteiras) **a menos que** uma regra carregada instrua explicitamente espelhar uma
  referência nomeada.
- **Proibido:** fixar esta skill a uma stack (ex.: "sempre Gradle", "sempre `br.gov.*`") ou a um
  ecossistema de produto; **inferir** das regras.

---

## Expectativa de cobertura (checklist agnóstico)

Depois de ler o conjunto de regras descoberto, verificar — **a partir do texto carregado** — que
o scaffold aborda todo tópico que as regras tocam. Esta tabela **não** é uma stack fixa; é **o
que procurar** nas regras.

| # | Área do tópico | Verificar nas regras |
|---|-----------------|------------------------|
| 1 | **Papel do repositório/workspace** | Como este artefato se relaciona com outros repositórios ou serviços (se declarado). |
| 2 | **Arquitetura e camadas** | Módulos, camadas, dependências proibidas, política de naming/linguagem. |
| 3 | **Forma do projeto** | Layout de diretórios, estilo de API pública, onde os testes vivem. |
| 4 | **Entrega e runtime** | Containers, compose local, observabilidade, exemplos de env — **se** as regras exigirem. |
| 5 | **Build e dados** | Como validar builds; bancos de dados e migrations — **se** as regras mencionarem. |
| 6 | **Integração** | Serviços externos, gateways, auth — **se** estiver no escopo. |
| 7 | **Posicionamento de testes** | Unitário vs. cross-service ou E2E — **se** as regras distinguirem. |
| 8 | **APIs ou engines específicos do domínio** | Consumo de uma API central — **se** as regras disserem N/A, pular. |

Se as regras forem **silenciosas** numa linha, tratar como **fora de escopo** até que o usuário
adicione um arquivo de regra que a aborde. Se as regras **se contradisserem**, perguntar ao
usuário uma vez sobre a precedência.

---

## Precedência

- **Regras no diretório de regras** governam a conformidade.
- **Contexto adicional** refina nomenclatura ou exemplos de produto; em conflito, seguir as
  **regras**, a menos que o usuário sobreponha explicitamente na invocação.

---

## Fluxo de execução sugerido

1. Resolver o **diretório de regras**; rodar a **descoberta de arquivos** (seção "Descobrindo
   quais arquivos ler").
2. Ler todo arquivo de regra descoberto **na ordem determinada**.
3. Ler os arquivos de **contexto adicional**, se houver, na ordem informada.
4. **Ler as especificações técnicas** (quando disponíveis):
   - `data-model.json` → derivar estruturas de entidade/modelo
   - `api-contracts.yaml` → derivar controllers/rotas/endpoints
   - Se ausentes, ativar o **modo degradado `W-NO-SPECS`** (ver Pré-requisitos).
5. Confirmar o **caminho de destino** da nova árvore.
6. Mapear o conteúdo para a **Expectativa de cobertura**; listar lacunas ou contradições para o
   usuário se forem bloqueantes.
7. **Gerar** os arquivos (descritores de build, código-fonte, config, testes, Docker, etc.)
   **apenas** conforme especificado pelas regras — sem stack default embutida nesta skill.
8. **Executar o build canônico da stack** identificado nas regras do projeto (ex.: `npm run
   build`, `./gradlew build -x test`, `dotnet build`, ou equivalente indicado pelas regras).
   Anexar ao relatório final o **comando executado** e o **resultado** (sucesso/erro, log
   resumido). Build falhou → **o scaffold não é considerado entregue** (`BUILD_FAILED`, FATAL)
   — ou, se a stack não define um comando de build validável, **documentar o bloqueio
   explicitamente** e confirmar com o usuário antes de encerrar.
9. Ao citar normas no chat, usar **caminhos relativos ao diretório de regras** (ou ao caminho
   informado pelo usuário para os arquivos de contexto).

---

## Checklist de qualidade (antes de entregar)

A lista de fechamento são os **Validators** abaixo — conferir cada código. Itens sem validator
próprio:

- [ ] Todo arquivo descoberto no diretório de regras foi lido antes das decisões maiores
- [ ] Tópicos da **Expectativa de cobertura** satisfeitos no limite do que as regras definem; lacunas apontadas
- [ ] Arquivos de **contexto adicional**, se listados, foram lidos

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia entrega

| Código | Verificação |
|--------|-------------|
| `RULES_DIR_MISSING` | Diretório de regras vazio, ausente ou sem arquivos `.mdc`/`.md`/`.txt` |
| `TARGET_PATH_MISSING` | Caminho de destino não informado nem confirmado com o usuário |
| `BUILD_FAILED` | Build canônico da stack executado e retornou erro |

### WARNING — não bloqueia, vai na seção de avisos

| Código | Verificação |
|--------|-------------|
| `NO_SPECS_DEGRADED_MODE` | Modo `W-NO-SPECS` ativado (`data-model.json` e/ou `api-contracts.yaml` ausentes) |
| `BUILD_NOT_SPECIFIED` | Regras não definem comando de build validável — bloqueio documentado em vez de FATAL |
| `RULES_CONTRADICTION` | Regras carregadas se contradizem em algum tópico da Expectativa de cobertura |

---

## Skills irmãs

| Skill | Fase | Relação com `spec-scaffold` |
|-------|------|-------------------------------|
| `spec-data-model` | 6a | Produz `data-model.json` consumido por esta skill (opcional — ver modo `W-NO-SPECS`) |
| `spec-api-contracts` | 6b | Produz `api-contracts.yaml` consumido por esta skill (opcional — ver modo `W-NO-SPECS`) |
| `spec-tasks` | 7 | Produz `tasks.json` que pode referenciar a estrutura do scaffold |
| `spec-implement` | 10 | Usa a estrutura do scaffold para implementar work items |

---

## O que NÃO faz

- Não gera `tasks.json` nem documentos de gaps — use `spec-tasks` (Fase 8).
- Não implementa funcionalidades — use `spec-implement` (Fase 11).
- Não inventa normas quando o diretório de regras está vazio ou ausente — para e pergunta.
- Não fixa uma stack default — toda decisão de arquitetura/stack vem das regras do projeto.
- Não substitui a leitura dos arquivos de regra — este documento é apenas orquestração.

---

## Invocação

Referenciar esta skill: `@.cursor/skills/spec-scaffold/SKILL.md` (Cursor) ou "use a skill
spec-scaffold" (Claude Code / Cowork).

**Exemplo de invocação** (linhas opcionais comentadas):

```markdown
@.cursor/skills/spec-scaffold/SKILL.md

- Diretório de regras: .cursor/rules/         # ou <path/to/rules-folder>
- Caminho de destino: src/                     # ou <path/to/new-project-root>
- data-model.json: outputs/spec/data-model.json        # opcional (sem ele: W-NO-SPECS)
- api-contracts.yaml: outputs/spec/api-contracts.yaml  # opcional (sem ele: W-NO-SPECS)
- Contexto adicional: <path/to/extra-doc.md>           # opcional
```

O manifesto `reading-order.txt` (opcional, dentro da pasta de regras) segue o formato da seção
«Descobrindo quais arquivos ler» — usar quando a ordem importar mais do que a alfabética.
