---
name: revisao-de-seguranca
description: >
  revisao-de-seguranca (Harness Elo v2 — segurança preventiva / shift-left) — modo ÚNICO
  `plano-geral` (Tempo B da cadeia técnica do 📐 Plan, logo após a spec-hld e antes da
  spec-tasks): lê especificacao-tecnica.md + especificacao-funcional.md + modelo-de-dados.md
  (em outputs/explore/) e produz o kernel `outputs/spec/plano-de-seguranca.md` — superfície de
  ameaça, controles transversais (OWASP/STRIDE/CVSS/DREAD) e catálogo mestre SEC-### rastreado à
  spec. Não injeta nada em backlog: quem consome esse kernel para injetar SEC-NNN no tasks.json,
  mais adiante na cadeia, é a spec-security-review do kit. Lê a base de vetores em
  .claude/references/seguranca/vetores.md (compartilhada com auditoria-de-us). Não modifica
  código. Fecha o loop com a auditoria-de-us, que verifica os SEC no fecho da US.
  Triggers: "plano de segurança", "revisão de segurança", "security review",
  "controles de segurança", "revisao-de-seguranca", "segurança preventiva", "shift-left".
version: "2.2"
updated: "2026-10-20"
---

# revisao-de-seguranca — Segurança Preventiva (shift-left) do Harness

> **Posição no harness:** um único momento — fim do Tempo B da cadeia técnica do 📐 Plan (ordem 3:
> depois da `spec-tech-rules`, antes da `spec-data-model` e da `spec-tasks`). Produz o kernel de
> segurança do sistema todo; quem aterrissa os controles no backlog, já com o `tasks.json` no ar,
> é a `spec-security-review` do kit. Complementa a `auditoria-de-us` (detectiva, no fecho de cada
> US no 🚀 Deliver). **Não modifica código.**

## Princípio central
Segurança **antes** do código. Modo único `plano-geral`: define a superfície e os controles do
sistema todo (macro), num kernel único. A aterrissagem por US (micro) é trabalho de outra skill —
ver "O que NÃO faz". Fonte única de vetores: [`.claude/references/seguranca/vetores.md`](../../references/seguranca/vetores.md).

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

Vale para o kernel `outputs/spec/plano-de-seguranca.md` inteiro: superfície de ameaça, controles e
Catálogo SEC. Quem lê é quem vai implementar cada `SEC-###` meses depois, sem ter estado na revisão.
Cada controle diz o que o sistema passa a fazer, em uma frase, antes do padrão que o justifica.

## Fonte da verdade (nativa do harness)
Autoridade técnica: a **spec como contrato** — `outputs/explore/especificacao-tecnica.md` +
`outputs/explore/modelo-de-dados.md` + `outputs/spec/gaps.md` —, conforme o CLAUDE.md. Os GAPs vêm
do `gaps.md` **vivo** do Plan, que a `spec-iterate` mantém em `outputs/spec/`; o
`outputs/explore/gaps.md` está congelado desde a promoção e só é lido quando o do Plan ainda não
existe. **No v2
o Plan é o kit**, e esta skill roda ANTES da `spec-tasks` (Tempo B, ordem 3 contra ordem 7): o
`tasks.json` ainda não existe quando ela produz o kernel, então a granularidade de story fica para
a `spec-security-review` mapear depois — não para esta skill. O próprio kernel que esta skill
produz, `outputs/spec/plano-de-seguranca.md`, já nasce em `outputs/spec/`: não há independência de
kit a declarar aqui. Os vetores vêm da referência compartilhada.

## Kickoff (K)
A stack real (linguagens, frameworks, auth, banco) **não é perguntada**: a `spec-tech-rules` já a
decidiu, e ela está em `outputs/spec/tech-rules/tech-rules-summary.md`. Ler dali; perguntar só o que
faltar. Confirmar com o usuário apenas o contexto regulatório (financeiro, PII/saúde, pagamentos,
menores, LGPD reforçada) quando os documentos não o declaram.

---

## MODO `plano-geral` (Tempo B, ordem 3 — macro)

### Entradas
| Artefato | Obrigatório | Local |
|----------|-------------|-------|
| `hld.md` — containers, integrações `INT-NN`, fronteiras, ADRs (roda logo antes desta skill) | Recomendado | `outputs/spec/` |
| `tech-rules-summary.md` — stack, auth, banco decididos | Recomendado | `outputs/spec/tech-rules/` |
| `especificacao-tecnica.md` | Recomendado | `outputs/explore/` |
| `especificacao-funcional.md` (F/RN) | Recomendado | `outputs/explore/` |
| `modelo-de-dados.md` (kernel do Explore) | Recomendado | `outputs/explore/` |
| `gaps.md` — GAPs abertos que tocam segurança | Recomendado | `outputs/spec/` (vivo, da `spec-iterate`); sem ele, `outputs/explore/` (congelado) |
| `.claude/references/seguranca/vetores.md` | Sim | repo |

### Passos
- **PG-A — Carregar spec.** Ler as entradas acima. O `hld.md` é a fonte da arquitetura TO-BE: os
  containers e as integrações `INT-NN` dele são os pontos de entrada e as fronteiras de confiança do
  PG-B, e cada ADR que decide auth, armazenamento ou integração é insumo de controle. Os GAPs
  abertos do `gaps.md` que tocam segurança entram no catálogo (PG-D) como `SEC-###` rastreado ao
  `GAP-nnn` ou como `ADIADO` com o GAP como motivo. Ausência ⇒ WARNING + análise parcial.
- **PG-B — Superfície de ameaça.** Mapear pontos de entrada, dados sensíveis/PII, fronteiras de
  confiança, integrações e modelo de auth, cruzando com IDs da spec (F/RN/módulo/entidade) e do
  HLD (container, `INT-NN`, ADR).
- **PG-C — Controles transversais.** Para cada controle do catálogo transversal da referência,
  marcar COBERTO / PARCIAL / AUSENTE frente ao que a spec declara.
- **PG-D — Catálogo SEC.** Cada gap vira um `SEC-###` com severidade (DREAD/CVSS da referência),
  OWASP/STRIDE, controle esperado e **rastreabilidade a ID da spec**. Numeração global `SEC-001…`.
- **PG-E — Recomendações de arquitetura** de segurança, priorizadas.
- **PG-F — Mapa de aplicabilidade** (`SEC-###` × Feature/módulo). O `tasks.json` ainda não existe
  neste ponto da cadeia, então o mapa fica em granularidade de Feature/módulo — é isso que a
  `spec-security-review` usa depois para decidir em qual story do `tasks.json` injetar cada
  `SEC-###`, quando o backlog já existir.

### Saída
`outputs/spec/plano-de-seguranca.md` — **kernel**, seguindo
[`./templates/plano-de-seguranca.template.md`](./templates/plano-de-seguranca.template.md).
Quem o referencia é a linha desta skill no `sync-log.md` (total de `SEC-###` por severidade) e a
`spec-security-review`, que o consome. A `especificacao-tecnica.md` do Explore **não** é editada:
neste ponto da cadeia o Explore já está congelado (`plan.md`, «Congelamento do Explore»).

SEC CRÍTICO/ALTO que fique ADIADO neste ponto da cadeia registra o próprio status `ADIADO` na
tabela do Catálogo SEC deste kernel (Regra de Ouro adaptada ao momento): o
`outputs/spec/gaps-document.md` só nasce depois, na `spec-tasks` (ordem 7), então ainda não existe
destino externo para cruzar quando este kernel é emitido.

Este kernel não é a última palavra sobre segurança na US: a `spec-security-review` **consome**
`outputs/spec/plano-de-seguranca.md` para injetar `SEC-NNN` no `tasks.json` — ela não deriva
controles sozinha (ver `.claude/rules/harness/plan.md`, seção "Kernels de fonte única"). É essa
mesma consumidora que o `cadeia.mjs` trava: a `spec-security-review` não roda sem
`plano-de-seguranca.md` no ar.

---

## Validators
| Código | Verificação | Severidade |
|--------|-------------|------------|
| `THREAT_SURFACE_DONE` | Superfície (PG-B) feita antes do catálogo | FATAL |
| `SEC_TRACEABILITY` | Todo `SEC-###` rastreado a ID da spec | FATAL |
| `CROSSCUTTING_COVERED` | Todos os controles transversais avaliados | FATAL |
| `SPEC_TECH_MISSING` | `especificacao-tecnica.md` ausente → parcial | WARNING |
| `FUNC_SPEC_MISSING` | `especificacao-funcional.md` ausente → parcial | WARNING |
| `HLD_MISSING` | `outputs/spec/hld.md` ausente → superfície sem a arquitetura TO-BE (projeto anterior à `spec-hld`) | WARNING |

FATAL impede concluir/gravar; WARNING não bloqueia (banner ⚠️ no topo da saída).

## Definição de pronto
- [ ] Superfície + controles transversais + catálogo SEC rastreado (spec, HLD e GAPs); kernel
  salvo em `outputs/spec/plano-de-seguranca.md` e registrado no `sync-log.md`.

## O que NÃO faz
- Não modifica código nem cria testes — produz o kernel de segurança do sistema todo.
- Não executa DAST/SAST nem pentest ativo — análise estática (a auditoria faz o teste de mesa).
- Não injeta nada em backlog, ADO ou `tasks.json`, e não classifica operação alguma US a US. Isso
  descontinuou neste harness — quem aterrissa `SEC-NNN` no `tasks.json`, story a story, é a
  `spec-security-review` do kit, consumindo o kernel que esta skill produz (ver
  `.claude/rules/harness/deliver.md`, seção "Segurança nesta fase").

## Skills irmãs
| Skill | Relação |
|-------|---------|
| `auditoria-de-us` | Detectiva, no fecho da US — verifica os `SEC-NNN` que a `spec-security-review` injetou a partir do kernel desta skill; compartilha a referência de vetores |
