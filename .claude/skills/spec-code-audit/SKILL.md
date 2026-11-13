---
name: spec-code-audit
description: >
  spec-code-audit (Fase 12 — Auditoria Pós-Implementação) — invocar após implementação
  completa (spec-implement) para auditar o código em 7 dimensões: conformidade com as
  rules do projeto (.cursor/rules/ ou .claude/rules/), segurança (OWASP/STRIDE/CVSS),
  teste de mesa com vetores instanciados no código real, performance, bugs técnicos,
  testes/cobertura e observabilidade. Produz um único artefato: code-audit.md com decisão
  de deploy APROVADO / BLOQUEADO. Pré-requisito: código implementado no repositório.
  Triggers: "auditar código", "revisar código gerado", "code audit", "security audit",
  "teste de mesa", "simular invasão", "conformidade com rules", "cobertura de testes",
  "spec-code-audit".
version: "2.4"
updated: "2026-10-20"
---

# spec-code-audit — Auditoria Pós-Implementação

> **Posição no pipeline:** roda após `spec-implement` (Fase 11). É a última fase de validação
> antes do deploy. Não modifica código — audita, reporta e, com o «sim» do usuário, cria a task
> SEC que faltar no backlog (I.3).

---

## Princípio Central

> **Nenhuma verificação parte de uma lista fixa.** O Passo A lê o código e constrói o mapa
> do projeto. O Passo A' transforma esse mapa em um plano de auditoria personalizado. Os
> passos B–H executam verificações **apenas sobre o que foi descoberto** — não sobre o que
> uma checklist genérica assume que existe.

---

## Papel

Auditar o código implementado em **sete dimensões complementares**:

| Dimensão | O que verifica | Output |
|----------|---------------|--------|
| **Conformidade** | Código segue as rules do projeto (`.cursor/rules/` ou `.claude/rules/`) | Lista PASS / FAIL por diretiva |
| **Segurança** | Vulnerabilidades nos pontos identificados pelo inventário | Findings SEC-NNN |
| **Teste de mesa** | Vetores de ataque instanciados com endpoints e dados reais | Relatório por vetor |
| **Performance** | Gargalos no stack e padrões encontrados no código | Findings PERF-NNN |
| **Bugs técnicos** | Anti-padrões do stack e da linguagem do projeto | Findings BUG-NNN |
| **Testes e cobertura** | Cobertura dos módulos e fluxos encontrados | Score por módulo |
| **Observabilidade** | Logs, traces e métricas das operações do negócio | Checklist OBS-NNN |

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

Vale para cada finding. Ordem obrigatória em cada `BUG-NNN` e em cada achado: **o que quebra para o usuário**, em uma frase, antes do padrão técnico, do nome do anti-padrão e do arquivo. Finding que começa em "violação do padrão X na camada Y" não é priorizado, porque ninguém entende o risco.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-code-audit | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

---

## Pré-requisitos

| Artefato | Obrigatório | Localização |
|----------|-------------|-------------|
| Código implementado | Sim | Raiz do repositório |
| Rules do projeto | Recomendado — ausência degrada o Passo B (`RULES_DIR_MISSING`, WARNING) | `.cursor/rules/` ou `.claude/rules/` |
| `tasks.json` | Recomendado | `outputs/spec/tasks.json` |
| `security-review.md` | Recomendado | `outputs/spec/security-review.md` |
| `api-contracts.yaml` | Opcional | `outputs/spec/api-contracts.yaml` |
| `data-model.json` | Opcional | `outputs/spec/data-model.json` |

---

## Ordem de Execução

```
K   → Kickoff (escopo, stack declarado, diretório raiz)
0   → Varredura determinística (SAST + secrets + SCA → outputs/spec/audit-signals/)
A   → Inventário profundo do código (ler e mapear tudo)
A'  → Plano de auditoria personalizado (derivar do inventário)
B   → Auditoria de conformidade com rules
C   → Auditoria de segurança (pontos mapeados em A')
D   → Teste de mesa (vetores instanciados com dados reais de A')
E   → Auditoria de performance (padrões do stack real de A')
F   → Auditoria de bugs técnicos (padrões da linguagem real de A')
G   → Auditoria de testes e cobertura (módulos reais de A')
H   → Auditoria de observabilidade (operações reais de negócio de A')
I   → Scoring e priorização (consolidado de todas as dimensões)
J   → Gerar code-audit.md
```

---

## Kickoff (K)

Confirmar com o consultor antes de iniciar:

1. **Diretório raiz** — onde está o código implementado?
2. **Escopo** — código completo ou módulos específicos?
3. **Contexto regulatório especial** — financeiro, saúde, menores, PCI, HIPAA, LGPD reforçada?
4. **tasks.json disponível?** — ler se sim; calibrar severidades dos vetores

---

## Passo 0 — Varredura Determinística (ANTES das dimensões)

Rodar os três scanners abaixo e salvar os JSONs em `outputs/spec/audit-signals/` **antes** de
iniciar o inventário (Passo A). A varredura determinística produz sinais objetivos que as
dimensões consomem — ela **não substitui** a análise da IA, e a IA **não substitui** a varredura.

### 0.1 — Scanners obrigatórios

| # | Ferramenta | Comando | Output | O que detecta |
|---|-----------|---------|--------|---------------|
| 1 | **opengrep** (SAST; fork LGPL do Semgrep — https://www.opengrep.dev/) | `opengrep scan --json > outputs/spec/audit-signals/sast.json` | `sast.json` | Padrões de vulnerabilidade no código (injeção, XSS, crypto fraca…) |
| 2 | **gitleaks** (secrets — https://github.com/gitleaks/gitleaks) | `gitleaks detect --report-format json --report-path outputs/spec/audit-signals/secrets.json` | `secrets.json` | Segredos e credenciais no código e no histórico git |
| 3 | **osv-scanner** (SCA — https://google.github.io/osv-scanner/) | `osv-scanner --format json -r . > outputs/spec/audit-signals/deps.json` | `deps.json` | Vulnerabilidades conhecidas nas dependências (base OSV) |
| 4 | **motor determinístico do harness** (o mesmo do G3 da `spec-implement` e da `auditoria-de-us` — Decisão 69; sem instalar nada) | `node .claude/ferramentas/varrer-entrega.mjs --tudo --repo <pasta do código> --sem-externas --json > outputs/spec/audit-signals/harness.json` | `harness.json` | Segredo no código, dado pessoal em log, HTML cru, token no storage, SQL/shell montado em texto, erro engolido, I/O em laço — com `arquivo:linha` |

**`<pasta do código>`** é o «Diretório raiz» do Kickoff — no harness, a «Pasta local» do repositório
de papel `codigo` no `workspace.md` (ex.: `codigo/`). Sem `--repo`, o motor varre a pasta corrente,
que no workspace do harness é o repositório de **docs**: «0 achados» ali é falso alívio. Por isso o
`--tudo` numa pasta sem código-fonte sai com **exit 2** e o motivo no stderr — corrigir o `--repo` e
rodar de novo; não registrar como varredura limpa nem como `TOOL_UNAVAILABLE`.

**Ferramenta ausente? Não instalar.** Aplicar a política de
[`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md):
**verificar → rota efêmera → degradar** (o gate está em 0.2). As três ferramentas têm **rota
efêmera por container** — roda sem instalar nada, não muta o ambiente, dispensa aprovação
(registrar `TOOL_EPHEMERAL:<nome> (container)` no `sync-log.md`):

| Ferramenta | Verificação | Rota efêmera (sem aprovação) |
|---|---|---|
| opengrep | `opengrep --version` | `docker run --rm -v "$PWD:/src" ghcr.io/opengrep/opengrep …` |
| gitleaks | `gitleaks version` | `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect -s /repo` |
| osv-scanner | `osv-scanner --version` | `docker run --rm -v "$PWD:/src" ghcr.io/google/osv-scanner …` |

Alternativa ao opengrep também sem instalar: **semgrep CE** por `uvx semgrep …` / `pipx run
semgrep …` com rules locais. Sem container e sem `uvx`/rede → **degradar** conforme 0.2
(`TOOL_UNAVAILABLE:<nome> (motivo curto)` + análise via LLM marcada no relatório).

Instalação permanente é **apenas oferecida** ao usuário no fim do passo, com o comando exato da
coluna «Instalação (só com aprovação)» do `tool-bootstrap.md` (binário do release), e só executada
depois do «sim», registrado como `TOOL_INSTALLED:<nome> (aprovado por <quem>, <comando>)`.
**Proibido em qualquer caso:** `curl … | bash` (script remoto não auditado — inclusive o
`install.sh` do opengrep), `go install`, `npm i -g` ou `pip install` por iniciativa do agente,
`sudo` e `pip install --break-system-packages`.

> **CodeQL NÃO é permitido como default** — a licença do CodeQL proíbe análise de código
> proprietário de cliente sem licença comercial GitHub Advanced Security. Usar apenas se o
> cliente possuir licença e autorizar por escrito.

### 0.2 — Gate `SCANNERS_EXECUTED` (WARNING)

Verificar que os três JSONs dos scanners existem em `outputs/spec/audit-signals/` (o `harness.json`
do item 4 também, quando o harness está presente). Ferramenta ausente segue
a política de 0.1 (verificar → rota efêmera → degradar). Quando degradar:

1. Registrar no `sync-log.md` a marca `TOOL_UNAVAILABLE:<nome> (motivo curto)` — uma por ferramenta ausente.
2. A análise **segue via LLM** para aquela dimensão, com marcação explícita no `code-audit.md`: `⚠️ Análise sem varredura determinística (<nome> indisponível) — cobertura reduzida`.
3. O gate emite **WARNING** (não bloqueia), listando quais ferramentas rodaram e quais faltaram.

### 0.3 — Como as dimensões consomem os sinais

As dimensões **2 (Segurança — Passo C)** e **3 (Teste de mesa — Passo D)** CONSOMEM esses
resultados obrigatoriamente:

- A IA faz a **triagem** de cada finding bruto: é explorável neste contexto? é falso positivo? qual endpoint/entidade real do inventário (Passo A) é afetado?
- A IA **prioriza** (cruzando com severidade, EPSS/KEV — ver I.2b) e **monta vetores de ataque** do Passo D a partir dos hits confirmados.
- A IA **NÃO substitui a varredura**: um finding do scanner só pode ser descartado com justificativa explícita de não-explorabilidade; e a ausência de hits do scanner não dispensa a análise das categorias do Passo C.

---

## Passo A — Inventário Profundo do Código

**Este é o passo mais importante.** Ler o código antes de qualquer verificação. O objetivo é
construir um mapa completo do projeto que guiará todos os passos seguintes.

### A.1 — Estrutura e camadas

Ler a árvore de pastas e arquivos. Identificar:

```
Descobertas obrigatórias:
□ Quais camadas existem? (frontend / backend / BFF / workers / jobs / etc.)
□ Onde está cada camada? (paths exatos)
□ Qual linguagem e framework em cada camada?
□ Existe monorepo ou múltiplos serviços?
□ Há arquivos de infraestrutura? (Docker, k8s, terraform, etc.)
□ Há pipeline CI/CD definido? (.github/, .azuredevops/, etc.)
```

### A.2 — Stack real

Ler arquivos de manifesto (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`, `Gemfile`, etc.) e arquivos de configuração principais:

```
Descobertas obrigatórias:
□ ORM / query builder usado (SQLAlchemy, Prisma, Sequelize, GORM, Hibernate…)
□ Framework HTTP (FastAPI, Express, NestJS, Django, Rails, Gin…)
□ Banco de dados (PostgreSQL, MySQL, MongoDB, DynamoDB, SQLite…)
□ Biblioteca de autenticação (Passport, NextAuth, jose, python-jose, Spring Security…)
□ Biblioteca de validação de input (Zod, Pydantic, Joi, Yup, class-validator…)
□ Biblioteca de hash de senha (bcrypt, argon2, passlib…)
□ Sistema de cache (Redis, Memcached, in-memory, nenhum)
□ Fila/mensageria (RabbitMQ, SQS, Kafka, Bull, Celery, nenhum)
□ Frontend framework (React, Vue, Angular, Svelte, nenhum)
□ Biblioteca de logging (Winston, Pino, loguru, structlog, stdlib logging…)
□ SDK de observabilidade (OpenTelemetry, Datadog, Sentry, NewRelic, nenhum)
□ Biblioteca de rate limiting (slowapi, express-rate-limit, Throttler, nenhum)
□ BaaS (Supabase, Firebase, nenhum)
□ Uso de LLM/IA (SDK OpenAI, Anthropic, LangChain, MCP, nenhum)
```

### A.3 — Superfície de API / entrada de dados

Ler todos os arquivos de rotas, controllers, handlers, resolvers:

```
Para cada endpoint/rota encontrado, registrar:
□ Método HTTP e path real (ex.: POST /api/v1/pedidos)
□ Autenticação: exige token? qual middleware?
□ Autorização: verifica role/permissão? qual decorator/guard?
□ Input: recebe body/params/query? há validação de schema?
□ Dado sensível: manipula PII, financeiro, senha, documento?
□ Operação de escopo: filtra por usuário dono do recurso?
□ Taxa de acesso: é endpoint de auth/OTP/reset que precisa de rate limit?
```

Produzir tabela:

| Endpoint real | Método | Auth? | AuthZ/owner? | Input validado? | Dado sensível | Rate limit? |
|---------------|--------|-------|--------------|-----------------|---------------|-------------|
| `POST /api/v1/usuarios` | POST | não | N/A | sim/não | sim/não | sim/não |
| *(todos os endpoints encontrados)* | | | | | | |

### A.4 — Modelos de dados e entidades

Ler modelos, schemas, migrations, DDL ou equivalente:

```
Para cada entidade/tabela encontrada:
□ Nome da entidade
□ Campos com PII (nome, email, CPF, telefone, endereço, data de nascimento…)
□ Campos financeiros (saldo, valor, preço, conta…)
□ Campos de credencial (senha, token, API key…)
□ Relacionamentos (FK para user/owner?)
□ Operações de escrita sobre ela (quem pode escrever?)
□ Índices declarados (para detectar queries sem índice depois)
```

### A.5 — Fluxos de negócio críticos

Identificar os fluxos de mais alto risco lendo o código (ou cruzando com `tasks.json`):

```
□ Fluxo de autenticação: como o usuário faz login? qual o caminho completo?
□ Fluxo de autorização: como é verificado que o usuário pode acessar um recurso?
□ Operações de escrita críticas: o que pode ser criado/alterado/deletado?
□ Operações financeiras ou de estoque: há read-modify-write sobre saldo/inventário?
□ Uploads: o sistema recebe arquivos? qual o caminho completo do arquivo?
□ Integrações externas: quais APIs externas são chamadas? com quais dados?
□ Fluxos de IA/LLM: input do usuário chega a um LLM? qual o caminho?
```

### A.6 — Cobertura de testes existente

Ler pastas de testes e identificar:

```
□ Quais frameworks de teste estão configurados?
□ Quais módulos/entidades têm arquivos de teste?
□ Quais fluxos críticos (encontrados em A.5) têm teste correspondente?
□ Há testes de segurança (SEC-NNN) implementados?
□ Há testes de integração, E2E, contrato, carga?
```

### A.7 — Observabilidade implementada

Ler configuração de logging, métricas e traces:

```
□ Qual biblioteca de logging é usada? em qual formato (JSON / texto)?
□ O logger é usado em handlers, services, repositórios?
□ Há correlation ID / request ID nos logs?
□ Há SDK de tracing inicializado?
□ Há instrumentação de métricas (Prometheus, StatsD, Datadog, OTel)?
□ Há health check / readiness / liveness endpoints?
□ Quais eventos de negócio são logados ou emitidos como métrica?
```

### A.8 — Dependências com risco

Ler todos os arquivos de manifesto e identificar:

```
□ Versão de cada dependência crítica (auth, cripto, ORM, parsing)
□ Dependências com CVE conhecida ou muito desatualizadas — cruzar com outputs/spec/audit-signals/deps.json (Passo 0)
□ Dependências de IA/LLM adicionadas recentemente (risco slopsquatting)
□ Dependências não verificadas sugeridas por IA
```

### A.9 — Histórico de implementação (`spec_story.md`)

Ler o `spec_story.md` de cada módulo implementado (mantido pelo `spec-implement`) como
insumo adicional do inventário: o que foi implementado, decisões tomadas, padrões
estabelecidos e o que foi deixado para depois, task a task. Isso ajuda a explicar **por que**
um padrão foi escolhido antes de reportá-lo como bug ou não-conformidade — e a identificar
débito técnico já conhecido e documentado pela equipe, em vez de descobri-lo do zero.

```
Para cada módulo com spec_story.md encontrado:
□ Quais decisões arquiteturais já foram justificadas ali?
□ Quais pendências ("deixado para depois") ainda estão abertas?
□ Algum FAIL potencial do Passo B já é um débito técnico conhecido e aceito pela equipe?
```

---

## Passo A' — Plano de Auditoria Personalizado

Com base no inventário do Passo A, construir o plano específico para este projeto antes de
executar qualquer verificação. Documentar explicitamente o que será auditado e por quê.

### A'.1 — Superfície de segurança a auditar

Derivar do Passo A.3 (endpoints) e A.4 (entidades):

```
Endpoints que exigem verificação de IDOR:
  → listar todos com "operação de recurso + parâmetro de ID + dado sensível"

Endpoints que exigem verificação de auth bypass:
  → listar todos que têm auth declarado (verificar se o middleware é efetivo)

Endpoints que exigem verificação de privilege escalation:
  → listar todos com verificação de role/permissão

Endpoints que exigem rate limiting:
  → listar todos de login, reset, OTP, cadastro (se aplicável)

Entidades que exigem verificação de injeção:
  → listar todas onde input do usuário vai para query (derivado do ORM e endpoints)

Entidades com PII que exigem verificação de log masking:
  → listar campos PII encontrados em A.4

Operações financeiras/inventário que exigem verificação de race condition:
  → listar operações de read-modify-write sobre saldo/estoque/cota
```

### A'.2 — Vetores de ataque a instanciar

Para cada vetor obrigatório (IDOR, Auth Bypass, Privilege Escalation, Injection, Secret Exposure,
Mass Assignment, Rate Limiting, Race Condition), determinar:

- **Aplicável?** — o projeto tem o padrão que o vetor explora?
- **Ponto de entrada real** — endpoint/componente específico encontrado em A.3
- **Dado alvo real** — entidade/campo específico encontrado em A.4
- **N/A** — se o projeto não tem aquele padrão (ex.: sem operações financeiras → Race Condition N/A)

### A'.3 — Padrões de performance a verificar

Derivar do stack real (A.2) e dos fluxos (A.5):

```
□ N+1 queries: aplicável se usa ORM + relacionamentos? → quais relacionamentos encontrados?
□ Queries sem índice: quais filtros frequentes sobre colunas sem índice (cruzar A.4 + A.3)?
□ SELECT *: o ORM ou as queries selecionam colunas específicas ou tudo?
□ Paginação: quais endpoints de listagem existem? têm limit/offset/cursor?
□ Cache: quais dados poderiam ser cacheados? o stack tem cache (A.2)? está sendo usado?
□ I/O serial: há múltiplas chamadas externas? poderiam ser paralelas?
□ Frontend: existe frontend (A.2)? → quais componentes pesados? há lazy loading?
```

### A'.4 — Padrões de bug a verificar

Derivar das linguagens e frameworks reais (A.2):

```
□ Para cada linguagem encontrada → quais padrões de erro/null são específicos dela?
  (Python: try/except bare; JS/TS: promises sem catch; Go: error não verificado;
   Java: NullPointerException; Rust: unwrap() em prod; etc.)
□ Há operações assíncronas? quais padrões de concorrência são usados?
□ Há abertura de arquivos ou conexões de banco gerenciadas manualmente?
□ Há uso de datas/timezone? em qual biblioteca?
□ Há comparações de tipo na linguagem usada?
```

### A'.5 — Módulos a verificar em testes

Derivar dos módulos encontrados em A.1 e A.3:

```
Para cada módulo/domínio encontrado no código:
□ <NomeDoMódulo>: tem arquivo de teste? cobre caminho feliz? cobre erros?

Para cada fluxo crítico encontrado em A.5:
□ <NomeDoFluxo>: há teste end-to-end ou de integração?

Para cada task SEC-NNN do security-review.md (se disponível):
□ SEC-NNN: o teste RED e GREEN foram implementados?
```

### A'.6 — Métricas de negócio a verificar

Derivar de `tasks.json` (KPIs, acceptance criteria) e dos fluxos críticos (A.5):

```
Identificar quais eventos de negócio são importantes para este projeto:
□ Quais são as conversões principais? (ex.: pedido criado, pagamento confirmado, cadastro)
□ Quais são os fluxos críticos que têm SLA? (ex.: tempo de processamento de pedido)
□ Quais erros de negócio importam rastrear? (ex.: pagamento recusado, estoque esgotado)
```

### A'.7 — Documento do plano

Produzir antes de iniciar B–H:

```
## Plano de Auditoria — [Nome do Projeto]

**Stack real:** <linguagem, framework, banco, ORM, auth lib>
**Camadas presentes:** <frontend / backend / workers / etc.>
**Total de endpoints mapeados:** N
**Endpoints com dado sensível:** N
**Entidades com PII:** N
**Operações financeiras/críticas:** N

### O que SERÁ auditado (e por quê)
[lista derivada de A'.1 a A'.6]

### O que NÃO será auditado (e por quê)
[ex.: "Race condition — N/A: o projeto não tem operações financeiras"]
[ex.: "LLM/IA — N/A: nenhum SDK de IA encontrado"]
[ex.: "Frontend — auditoria limitada: apenas API, sem SPA"]
```

---

## Passo B — Auditoria de Conformidade com Rules

Para cada rule em `.cursor/rules/` ou `.claude/rules/`, extrair as diretivas MUST / MUST NOT /
Proibido / Obrigatório e verificar **nos arquivos específicos** encontrados no Passo A.

### B.1 — Formato de verificação por rule

```
## Rule: <nome do arquivo da rule (.mdc ou .md)>

Para cada diretiva da rule:

| Diretiva | Arquivo(s) verificado(s) | Linha | Status | Observação |
|---------|--------------------------|-------|--------|------------|
| MUST: <texto exato da diretiva> | <path real do arquivo> | L42 | ✅ PASS / ❌ FAIL / ⚠️ PARCIAL | |
```

**Instrução:** não listar diretivas que a rule menciona mas que não se aplicam ao stack
deste projeto (ex.: se a rule fala em Supabase mas o projeto não usa Supabase, marcar N/A
com justificativa). Focar nas diretivas aplicáveis.

### B.2 — Score de conformidade

| Rule | Diretivas aplicáveis | PASS | FAIL | PARCIAL | N/A | % Conformidade |
|------|---------------------|------|------|---------|-----|----------------|
| *(cada rule encontrada no diretório de rules)* | | | | | | |
| **TOTAL** | | | | | | |

**Gate:** conformidade < 80% em qualquer rule aplicável → ❌ na condição "Conformidade ≥ 80%"
da Decisão de Deploy (Passo J, Seção 12) — a decisão final é sempre a do Passo J.

### B.3 — Conformidade de arquitetura e código morto (opcional, determinístico)

Quando aplicável, complementar a verificação manual com sinais determinísticos:

| Verificação | Condição | Comando | Uso |
|-------------|----------|---------|-----|
| Regras de dependência entre camadas | Existe `.dependency-cruiser.js` no repo | `npx depcruise --validate` | Violações viram FAIL na rule de arquitetura correspondente |
| Código morto / exports não usados (JS/TS) | Projeto JS/TS | `npx knip` | Sinal de qualidade — reportar como observação, não FAIL automático |
| Dependências não usadas / código morto (Python) | Projeto Python | `deptry .` — ausente: `uvx deptry .` (rota efêmera) | Idem |

Ferramenta indisponível → registrar `TOOL_UNAVAILABLE:<nome>` no sync-log e seguir com análise
via LLM marcada (mesmo protocolo do Passo 0.2).

---

## Passo C — Auditoria de Segurança

**Input:** Plano de auditoria (A'.1) — não uma checklist genérica — **+ os sinais determinísticos
de `outputs/spec/audit-signals/` (Passo 0)**: triar cada hit de `sast.json` e `secrets.json`
(explorável neste contexto? falso positivo?) e incorporar os confirmados como findings SEC-NNN.

Para cada item do plano A'.1, verificar o código correspondente.

### C.1 — Protocolo de verificação

Para cada ponto de segurança identificado em A'.1:

```
**Verificação:** <descrição do controle — derivada do plano>
**Onde verificar:** <arquivo(s) específico(s) encontrado(s) no Passo A>
**O que procurar:** <padrão específico para o stack real do projeto>
**Resultado:** ✅ IMPLEMENTADO / ❌ AUSENTE / ⚠️ PARCIAL / N/A
**Evidência:** <arquivo:linha da defesa ou do gap>
```

Exemplos de como instanciar (não são fixos — derivar do projeto real):

- Se o projeto usa **Prisma** → verificar se queries usam `where: { userId: ctx.user.id }` em recursos privados
- Se o projeto usa **SQLAlchemy** → verificar `.filter(Resource.user_id == current_user.id)`
- Se o projeto usa **NextAuth** → verificar se `getServerSession()` é chamado em cada route handler protegido
- Se o projeto usa **Zod** → verificar se `schema.parse()` é chamado antes de usar o body
- Se o projeto não tem nenhum desses → adaptar ao padrão da biblioteca encontrada

### C.2 — Categorias universais de verificação

Independente do stack, verificar as categorias abaixo — **adaptando o "o que procurar" ao stack real**:

| Categoria | Aplicável? | Pontos específicos a verificar (derivados de A'.1) |
|-----------|-----------|--------------------------------------------------|
| Autenticação e credenciais | sim/não | <endpoints/arquivos reais do projeto> |
| Autorização e controle de acesso (IDOR) | sim/não | <entidades e endpoints reais> |
| Validação de input | sim/não | <endpoints com body/params reais> |
| Injeção (SQL/NoSQL/Command) | sim/não | <queries reais encontradas> |
| Criptografia | sim/não | <onde senhas/dados são hash/criptografados> |
| Secrets e credenciais expostos | sempre | <arquivos de config, .env, código fonte> |
| CORS e headers | sim/não | <configuração de CORS real do projeto> |
| Upload | sim/não | <endpoints de upload encontrados em A.3> |
| Rate limiting | sim/não | <endpoints de auth identificados em A'.1> |
| Race conditions | sim/não | <operações financeiras/inventário de A.5> |
| AI/LLM | sim/não | <se stack de IA encontrado em A.2> |

### C.3 — Findings de segurança

Formato canônico: **«Formato de Finding Obrigatório» da rule `security.md`** (global em
`~/.claude/rules/` e/ou nas rules do projeto) — usar todos os campos dela (CVSS, OWASP,
CWE, STRIDE, ASVS 5.0, EPSS/KEV, Camada, Problema, Risco, Fix, Teste RED→GREEN) e as
quatro severidades (CRÍTICO/ALTO/MÉDIO/BAIXO). Esta skill **acrescenta** ao bloco:

```
**Origem:** <análise LLM / sast.json / secrets.json / deps.json (Passo 0)>
**Arquivo:** path/arquivo.ext:L42
**Contexto:** <qual entidade/endpoint/fluxo real está afetado>
```

---

## Passo D — Teste de Mesa (Desk Testing)

**Input:** Plano de auditoria (A'.2) — vetores instanciados com dados reais.

**Princípio:** rastrear o fluxo de dados no código como um atacante, usando os endpoints,
entidades e caminhos REAIS encontrados no Passo A. Nunca usar paths genéricos.

### D.1 — Protocolo de rastreamento

Para cada vetor do plano A'.2 marcado como **Aplicável**:

```
## VETOR-NN — <nome do vetor>

**Aplicável?** Sim — <justificativa baseada no inventário>
**Ponto de entrada real:** <endpoint exato encontrado em A.3>
**Dado alvo real:** <entidade/campo específico encontrado em A.4>
**Ator:** <usuário autenticado / anônimo / admin>

Rastreamento passo a passo:
1. Entrada: <método + path real> com <parâmetro real>
2. <Arquivo:linha do handler/controller real>
   → <verificação específica do código encontrado>
3. <Arquivo:linha do service/repositório real>
   → <verificação específica do código encontrado>
4. Resposta: <o que o sistema retorna>

Resultado: BLOQUEADO ✅ / VULNERÁVEL ❌ / PARCIAL ⚠️
Evidência: <arquivo:linha>
CVSS (se vulnerável): X.X
```

Para vetores marcados como **N/A** no plano A'.2:

```
## VETOR-NN — <nome> — N/A

**Motivo:** <por que o projeto não tem este padrão — baseado no inventário>
```

### D.2 — Vetores obrigatórios a instanciar

Os 8 vetores obrigatórios são os de **A'.2** — cada um instanciado com dados do projeto ou
marcado N/A com justificativa do inventário. Dois complementos:

- **Secret Exposure** — sempre aplicável: bundle, config, handlers de erro.
- **Vetores adicionais** — derivar do stack específico (ex.: prompt injection se há LLM; RLS bypass se usa Supabase; SSRF se aceita URLs de usuário).

### D.3 — Conformidade de contrato com Schemathesis (opcional)

Quando existir `outputs/spec/api-contracts.yaml` **e** um ambiente da aplicação de pé, rodar
**Schemathesis** — prova objetiva de conformidade implementação × contrato (fuzzing dirigido
pelo schema OpenAPI: gera casos, valida respostas, status, tipos):

```bash
# rota efêmera (não muta o ambiente, dispensa aprovação — TOOL_EPHEMERAL:schemathesis):
uvx --from schemathesis st run outputs/spec/api-contracts.yaml --url <base-url-do-ambiente>
# se `st` já estiver no PATH: st run outputs/spec/api-contracts.yaml --url <base-url>
# `pip install schemathesis` (em venv) só como oferta, com aprovação registrada
```

Divergências (resposta fora do schema, status não declarado, erro 500 em input válido) viram
findings SEC/BUG conforme a natureza. Sem contrato ou sem ambiente → marcar N/A com justificativa.
Ferramenta indisponível → `TOOL_UNAVAILABLE:schemathesis` no sync-log.

---

## Passo E — Auditoria de Performance

**Input:** Plano de auditoria (A'.3) — padrões do stack real encontrado.

### E.1 — Protocolo de verificação de gargalo

Para cada padrão de performance identificado em A'.3 como aplicável:

```
**Padrão:** <tipo de gargalo>
**Onde verificar:** <arquivo(s) e contexto específico — derivado do inventário>
**O que procurar:** <anti-padrão específico para o ORM/stack real>
**Encontrado?** sim/não
**Arquivo:Linha:** <se encontrado>
**Impacto estimado:** <volume ou carga que dispara — baseado no modelo de dados real>
```

### E.2 — Categorias de performance a verificar (adaptar ao stack)

Para cada categoria, aplicar **somente se o stack correspondente foi encontrado** em A.2:

| Categoria | Condição de aplicação | O que investigar no código real |
|-----------|----------------------|-------------------------------|
| N+1 queries | ORM com relacionamentos encontrado | Loops sobre resultados com queries aninhadas |
| Queries sem índice | DB relacional encontrado | Filtros nas colunas de alta cardinalidade sem índice em A.4 |
| Falta de paginação | Endpoints de listagem em A.3 | Ausência de limit/offset/cursor nas queries de listagem |
| I/O serial | Chamadas externas em A.5 | Chamadas sequenciais que poderiam ser paralelas |
| Cache ausente | Redis/Memcached em A.2 OU ausência | Dados computacionalmente caros recalculados por request |
| Bundle bloat | Frontend SPA em A.2 | Imports de biblioteca completa, assets sem lazy loading |
| Timeout ausente | Chamadas HTTP externas em A.5 | fetch/requests/http sem timeout configurado |

### E.3 — Findings de performance

```
### [PERF-NNN] <Nome> — ALTO / MÉDIO

**Tipo:** <N+1 / Cache ausente / I/O serial / Paginação / Bundle / Timeout>
**Arquivo:** path/arquivo.ext:L42
**Contexto específico:** <qual entidade, endpoint ou componente real — de A.3/A.4>
**Rastreamento:**
  1. <onde o dado entra>
  2. <onde o gargalo ocorre — arquivo:linha>
  3. <impacto estimado com volume realista baseado no modelo de dados>
**Fix:** <solução no padrão do stack real do projeto>
```

---

## Passo F — Auditoria de Bugs Técnicos

**Input:** Plano de auditoria (A'.4) — padrões das linguagens e frameworks reais.

### F.1 — Protocolo de verificação

Para cada categoria de bug identificada em A'.4 como aplicável à linguagem/framework real:

```
**Padrão:** <tipo de bug — específico para a linguagem encontrada>
**Onde verificar:** <módulos/arquivos mais propensos — derivado do inventário>
**O que procurar:** <anti-padrão específico para a linguagem/framework real>
**Encontrado?** sim/não
**Arquivo:Linha:** <se encontrado>
**Severidade:** ALTO (falha silenciosa de negócio) / MÉDIO (degradação) / BAIXO
```

### F.2 — Categorias universais (adaptar à linguagem real)

Estas categorias se aplicam a qualquer stack — o "como identificar" varia:

| Categoria | Aplicar sempre | Como identificar no stack real |
|-----------|---------------|-------------------------------|
| Erros silenciados | Sim | Derivar do padrão de try/catch/except da linguagem — buscar blocos que capturam mas não relançam, não logam e não notificam |
| Null/undefined não tratado | Sim | Derivar do sistema de tipos da linguagem — acesso a propriedade sem guard, retorno nulo de função chamado diretamente |
| Recursos sem fechamento garantido | Sim | Derivar das APIs de I/O da linguagem — conexões, arquivos, sockets sem guarantee de fechamento |
| Race conditions assíncronas | Se há I/O assíncrono | Operações de leitura-modificação-escrita sem sincronização |
| Off-by-one em paginação | Se há paginação | Comparações de boundary em loops e cálculos de offset |
| Timezone implícito em datas | Se há manipulação de datas | Criação de data sem timezone explícito |
| Variáveis de ambiente sem default | Sempre | Leitura de env var em código crítico sem valor default seguro |

### F.3 — Findings de bugs

```
### [BUG-NNN] <Nome> — ALTO / MÉDIO

**Tipo:** <categoria de bug>
**Linguagem/padrão afetado:** <tecnologia específica>
**Arquivo:** path/arquivo.ext:L42
**Cenário que dispara:** <quando/como o bug ocorre — com dados reais do projeto>
**Consequência:** <o que falha ou fica corrompido>
**Fix:** <correção no idioma da linguagem/framework real>
```

---

## Passo G — Auditoria de Testes e Cobertura

**Input:** Plano de auditoria (A'.5) — módulos e fluxos reais do projeto.

### G.1 — Inventário real de testes

Listar os arquivos de teste encontrados no Passo A.6, classificados:

| Tipo | Arquivos encontrados (paths reais) | Framework detectado | Nº de casos |
|------|-----------------------------------|---------------------|-------------|
| Unitários | | | |
| Integração | | | |
| E2E | | | |
| Contrato | | | |
| Carga | | | |

### G.2 — Cobertura por módulo real

Para cada módulo/domínio identificado no Passo A.1, verificar cobertura:

| Módulo / Domínio real | Arquivo(s) de teste correspondente | Caminho feliz coberto? | Erros cobertos? | Avaliação |
|-----------------------|-----------------------------------|----------------------|-----------------|-----------|
| *(cada módulo encontrado em A.1)* | | sim/não | sim/não | ✅ / ⚠️ / ❌ |

### G.3 — Fluxos críticos com cobertura

Para cada fluxo crítico identificado em A.5:

| Fluxo crítico real | Tipo de teste | Arquivo de teste | Coberto? |
|-------------------|--------------|-----------------|---------|
| *(cada fluxo de A.5)* | | | sim/não/parcial |

### G.4 — Qualidade dos testes (anti-padrões universais)

Verificar nos arquivos de teste encontrados — adaptar o "como identificar" ao framework real:

| Anti-padrão | Como identificar no framework real | Encontrado? | Arquivo:Linha |
|-------------|-----------------------------------|------------|---------------|
| Asserção sem critério real | asserção trivial que nunca falha (ex.: `assert True`, `expect(true).toBe(true)`) | sim/não | |
| Mock que suprime a lógica testada | mock cobre o objeto sob teste, não suas dependências | sim/não | |
| Happy path sem teste de erro | arquivo de teste sem nenhum caso de falha, exceção ou input inválido | sim/não | |
| Setup compartilhado com acoplamento | estado mutado em `beforeAll`/`setUp` afeta testes subsequentes | sim/não | |
| Dados de teste irreais | strings vazias ou genéricas onde o domínio tem formato específico | sim/não | |

### G.5 — Testes de segurança (SEC-NNN)

Verificar **SEC-NNN de `security-review.md` E/OU tasks SEC no `tasks.json`** — a
`spec-security-review` (Fase 8b) injeta as tasks SEC diretamente nas stories do backlog;
`security-review.md` é o relatório de auditoria da revisão, e `tasks.json` é a **fonte de
verdade executável** (campo `security.mustCompleteBeforeStoryClose` marca as obrigatórias).
Cruzar os dois: uma task SEC pode ter sido implementada mesmo sem constar isoladamente no
relatório, e um finding do relatório pode ter sido rebaixado para "Findings não injetados"
(MÉDIO/BAIXO) sem virar task — nesse caso não é uma FAIL de cobertura.

| Finding/Task SEC | Origem (security-review.md / tasks.json) | TDD RED implementado? | TDD GREEN implementado? | Arquivo de teste |
|-------------------|--------------------------------------------|----------------------|-------------------------|-----------------|
| *(cada SEC-NNN encontrado em qualquer uma das duas fontes)* | | sim/não | sim/não | |

### G.6 — Mutation testing nos módulos críticos (opcional)

A **cobertura de linha é inflável** — código executado por um teste sem asserção real conta
como coberto. O **mutation testing** complementa a cobertura injetando defeitos ("mutantes") e
medindo quantos os testes matam (mutation score). Rodar **apenas nos módulos críticos**
identificados em A.5 (auth, autorização, operações financeiras) — não no projeto inteiro (custo alto).

| Stack | Ferramenta | Comando |
|-------|-----------|---------|
| JS/TS | **StrykerJS** | `npx stryker run` (escopo restrito aos módulos críticos via `mutate` no config) |
| Python | **mutmut** | `mutmut run --paths-to-mutate <módulo_crítico>` — ausente: `uvx mutmut run …` (rota efêmera) |

Quando executado, reportar em conjunto: **"cobertura X% / mutation score Y%"** por módulo crítico.
Ferramenta indisponível → `TOOL_UNAVAILABLE:<nome>` no sync-log; reportar só a cobertura, marcada.

### G.7 — Score de testes

```
Score = (módulos_com_cobertura_adequada / total_módulos_críticos) × 100%

Gate: ausência de qualquer tipo de teste obrigatório pelas rules → FAIL automático
```

---

## Passo H — Auditoria de Observabilidade

**Input:** Plano de auditoria (A'.6) — operações reais do negócio e stack de observabilidade real.

### H.1 — Logging

Verificar nos arquivos onde a biblioteca de logging real (encontrada em A.2) é usada:

| Verificação | Aplicável ao stack real? | Encontrado? | Arquivo:Linha |
|-------------|--------------------------|------------|---------------|
| Logs em formato estruturado (JSON/campos) | sim/não — depende da lib encontrada | sim/não | |
| Log nas operações críticas identificadas em A.5 | sim | sim/não | |
| Contexto suficiente nos erros (tipo, mensagem, request ID) | sim | sim/não | |
| Correlation/Request ID propagado | sim | sim/não | |
| PII mascarado (campos PII identificados em A.4) | sim se PII encontrado | sim/não | |
| Logs de auditoria em operações sensíveis (identificadas em A.5) | sim | sim/não | |
| Sem logging em hot path (loops/queries em volume) | sim | sim/não | |

### H.2 — Traces

*(Aplicar apenas se: múltiplos serviços / chamadas externas identificadas em A.5 / SDK de tracing em A.2)*

| Verificação | Resultado |
|-------------|-----------|
| SDK de tracing inicializado | sim/não/N/A |
| Spans nas operações críticas de A.5 | sim/não/N/A |
| Trace propagado em chamadas externas de A.5 | sim/não/N/A |
| Erros marcados no span | sim/não/N/A |

### H.3 — Métricas técnicas

Verificar instrumentação das métricas do sistema — adaptando ao SDK real (A.2):

| Métrica técnica | Instrumentada? | Como (library/endpoint real) | Alerta definido? |
|----------------|---------------|------------------------------|-----------------|
| Taxa de erros HTTP | sim/não | | sim/não |
| Latência de resposta | sim/não | | sim/não |
| Throughput | sim/não | | sim/não |
| Pool de conexões de banco | sim/não / N/A | | sim/não |
| Fila/mensageria (se encontrada em A.2) | sim/não / N/A | | sim/não |
| Health check / liveness endpoint | sim/não | | — |

### H.4 — Métricas de negócio

**Derivar do plano A'.6 e de `tasks.json`** — não usar exemplos genéricos.

Para cada evento de negócio identificado em A'.6:

| Evento de negócio real (derivado do projeto) | Instrumentado? | Onde no código | Alerta? |
|----------------------------------------------|---------------|---------------|---------|
| *(cada evento identificado em A'.6)* | sim/não | arquivo:linha | sim/não |

Se nenhuma métrica de negócio estiver instrumentada → OBS-NNN MÉDIO.

### H.5 — Findings de observabilidade

```
### [OBS-NNN] <Nome> — ALTO / MÉDIO / BAIXO

**Área:** Logging / Trace / Métrica técnica / Métrica de negócio / Alerta
**Operação afetada:** <qual fluxo/evento do projeto — de A'.6>
**Problema:** <o que está ausente ou mal implementado>
**Risco operacional:** <o que a equipe não consegue fazer em produção sem esse dado>
**Fix no stack real:** <o que implementar usando a biblioteca encontrada em A.2>
```

### H.6 — Score de observabilidade

```
Score OBS = (itens_implementados / total_itens_aplicáveis) × 100%

Gates mínimos:
  - Health check endpoint presente (absoluto)
  - Logging estruturado nas operações críticas de A.5
  - Pelo menos 1 métrica de negócio dos eventos de A'.6
```

---

## Passo I — Scoring e Priorização

### I.1 — Consolidar todos os findings

| ID | Dimensão | Descrição | Arquivo:Linha | Severidade |
|----|---------|-----------|---------------|------------|
| SEC-NNN | Segurança | | | CRÍTICO / ALTO / MÉDIO |
| PERF-NNN | Performance | | | Alto / Médio / Baixo |
| BUG-NNN | Bug técnico | | | Alto / Médio / Baixo |
| CONF-NNN | Conformidade | | | FAIL / PARCIAL |
| OBS-NNN | Observabilidade | | | Alto / Médio / Baixo |

### I.2b — Priorização de findings de dependências (EPSS + CISA KEV, além do CVSS)

Findings originados de `deps.json` (Passo 0 — vulnerabilidades de dependência) **não** são
priorizados só por CVSS: aplicar o **«Ajuste por EPSS + KEV» da rule `security.md`** (KEV ou
EPSS alto sobe para no mínimo ALTO; CVSS crítico com EPSS baixíssimo fora do KEV pode ser
rebaixado com justificativa registrada). Registrar EPSS e presença no KEV no campo
**EPSS/KEV** de cada finding de dependência.

**Taxonomia de referência (atualizada):** o mapeamento OWASP usa **OWASP Top 10:2025**
(novidades: **A03 Software Supply Chain Failures** — antes restrito a componentes vulneráveis;
**A10 Mishandling of Exceptional Conditions**) e o **CWE Top 25 2025**. Não citar versões
antigas (2021) na classificação dos findings. Numeração oficial 2025 a usar: **A01** Broken Access
Control · **A02** Security Misconfiguration · **A03** Software Supply Chain Failures · **A04**
Cryptographic Failures · **A05** Injection · **A06** Insecure Design · **A07** Authentication
Failures · **A08** Software or Data Integrity Failures · **A09** Security Logging and Alerting
Failures · **A10** Mishandling of Exceptional Conditions (SSRF não é mais categoria própria —
tratado em A01/A02; no API Top 10 segue como API7).

### I.2 — Calcular índice de saúde

```
Saúde Geral = max(0, 1 - (SEC_CRÍTICO×10 + SEC_ALTO×5 + PERF_ALTO×3 + BUG_ALTO×3 + OBS_ALTO×2 + MÉDIO×1) / 150) × 100%
-- Nota de calibração: o denominador 150 satura em ~0% com poucos findings críticos/altos combinados; o max(0, …) evita score negativo quando o total de pesos ultrapassa 150.

Score de Testes = (módulos_com_cobertura_adequada / total_módulos_críticos) × 100%
Score de OBS    = (itens_obs_implementados / total_itens_aplicáveis) × 100%
```

**Gates de aprovação para deploy:** as **8 condições da Seção 12 do template**
([`./templates/code-audit.template.md`](./templates/code-audit.template.md)) são a lista
canônica — preencher todas na Decisão de Deploy.

### I.3 — Regra de Ouro (rastreabilidade de fix)

Para cada finding **SEC CRÍTICO ou ALTO** encontrado nos Passos C/D: registrar o finding no
`code-audit.md` (Passo J) com título, CVSS estimado e severidade Likelihood×Impact, além da
**proposta** da task SEC-NNN. Quando a task ainda não existe, a skill **pergunta ao usuário se
quer criar** a task agora (Decisão 74): com «sim», cria no `tasks.json`
(`inject-sec.mjs --acrescentar`) e no Azure DevOps pelo MCP do Azure DevOps, como manda
`.claude/references/seguranca/rastreio-sec.md`; com «não», a criação fica com a
`spec-security-review` (Fase 8b) ou com o dono do backlog, pelo GAP abaixo.

No Plano de Remediação (Seção 11), a coluna **Task SEC** recebe uma de duas coisas:

- a task que **já existe** no backlog, ou que acabou de ser criada com o «sim» do usuário
  (`SEC-NNN` do `tasks.json` / `ADO#NNN`); ou
- quando ela ainda não existe e o usuário não quis criá-la agora, um **`SEC-NNN` proposto**
  (numerado depois do maior `SEC-NNN` do kernel e do `tasks.json`) **e** o `GAP-NNN`
  correspondente, registrado por esta skill em `outputs/spec/gaps-document.md` (o mesmo formato da
  `spec-tasks`, a mesma regra da `auditoria-de-us`), apontando o SEC proposto.

Proposta não fecha nada: enquanto a task não existir no backlog, o finding permanece **aberto** na
Decisão de Deploy (Seção 12, condição 8 ❌) e o veredito é **BLOQUEADO** — mesmo com o código já
corrigido sem registro formal. Espelha a **Regra de Ouro da rule `security.md`** (as três
entregas: teste RED/GREEN + fix + task SEC-NNN). O relatório que aponta o achado sai sempre: é ele
que leva o achado a quem cria a task. Neste harness a regra é uma só para as três auditorias:
`.claude/references/seguranca/rastreio-sec.md` (Decisão 69).

---

## Passo J — Gerar `code-audit.md`

**Path:** `outputs/spec/code-audit.md`

O relatório segue o template canônico em
[`./templates/code-audit.template.md`](./templates/code-audit.template.md) — **12 seções, na
ordem do template**, todas preenchidas. Atenção a duas obrigações: a coluna **Task SEC** no
Plano de Remediação (Seção 11 — I.3) e as 8 condições da Decisão de Deploy (Seção 12).

---

## Validators (FATAL / WARNING)

| Código | Verificação | Severidade |
|--------|-------------|------------|
| `CODE_INVENTORY_COMPLETE` | Passo A executado com A.1–A.9 documentados antes de qualquer verificação | FATAL |
| `SCANNERS_EXECUTED` | Passo 0 executado: `sast.json`, `secrets.json`, `deps.json` em `outputs/spec/audit-signals/`; ferramentas ausentes registradas como `TOOL_UNAVAILABLE:<nome>` no sync-log e marcadas no relatório | WARNING |
| `AUDIT_PLAN_PRODUCED` | Passo A' (plano de auditoria personalizado) produzido antes de B–H | FATAL |
| `VECTORS_ADDRESSED` | Cada vetor obrigatório de D.2 foi rastreado com dados reais ou marcado N/A com justificativa do inventário | FATAL |
| `FINDINGS_HAVE_EVIDENCE` | Todo finding SEC/PERF/BUG/OBS tem `arquivo:linha` como evidência | FATAL |
| `GOLDEN_RULE_TRACEABILITY` | Todo finding SEC CRÍTICO/ALTO tem, no Plano de Remediação (I.3), a task SEC do backlog (já existente, ou criada com o «sim» do usuário — Decisão 74) **ou** um `SEC-NNN` proposto com o `GAP-NNN` registrado em `outputs/spec/gaps-document.md`; finding sem task no backlog deixa a condição 8 da Seção 12 em ❌ e o veredito em BLOQUEADO | FATAL |
| `DEPLOY_DECISION_EXPLICIT` | Seção 12 (Decisão de Deploy) preenchida com veredito explícito (APROVADO/BLOQUEADO/APROVADO COM PLANO) | FATAL |
| `RULES_DIR_MISSING` | `.cursor/rules/` (ou `.claude/rules/`) ausente — conformidade (Passo B) não pôde ser auditada | WARNING |
| `TASKS_JSON_ABSENT` | `tasks.json` ausente — severidades calibradas sem contexto de negócio | WARNING |
| `SECURITY_REVIEW_ABSENT` | `security-review.md` ausente — G.5 não pôde cruzar SEC-NNN previstos | WARNING |
| `SPEC_STORY_ABSENT` | `spec_story.md` de algum módulo ausente — inventário sem histórico de implementação (A.9) | WARNING |

**Política de bloqueio:** FATAL impede a emissão do `code-audit.md`. WARNING não bloqueia —
emitir com banner `⚠️` no topo do relatório listando os avisos.

---

## Definição de Pronto

O essencial já está codificado nos validators acima (inventário, plano, varredura, vetores,
evidência, rastreabilidade, decisão). Conferir além deles:

- [ ] Dimensões B–H executadas por completo (B com score calculado; G.1–G.7; H.1–H.6)
- [ ] Índice de Saúde Geral calculado e Plano de Remediação ordenado por prioridade
- [ ] `code-audit.md` salvo em `outputs/spec/` (raiz única — `tools/references/paths.md`)

---

## Nota sobre Limitações

Esta skill realiza **varredura determinística (SAST/secrets/SCA no Passo 0), análise estática
e teste de mesa** — não executa **DAST** (como OWASP ZAP) nem pentest ativo. O Schemathesis
(D.3) é conformidade de contrato, não DAST de segurança. Para projetos de alto risco
regulatório, complementar com:

- DAST automatizado (`zap-api-scan`) no ambiente de staging
- Pentest externo antes do primeiro deploy em produção
- Revisão de configuração de infraestrutura (cloud, containers, networking)

---

## O que NÃO faz

- Não modifica código — audita e reporta; correções ficam a cargo dos devs / `spec-implement`.
- Não executa DAST nem pentest ativo, nem substitui revisão de infraestrutura — ver Nota sobre Limitações.
- Não gera stories nem contratos. A escrita fora do relatório é só a da Regra de Ouro (I.3): a task SEC que falta — no `tasks.json` e no Azure DevOps, e só com o «sim» do usuário — ou o `GAP-NNN` em `gaps-document.md`.
- Não decide arquitetura ou requisitos — reporta desvios para correção em fases anteriores (`spec-iterate`, `spec-tech-rules`).
- Não fecha um finding SEC CRÍTICO/ALTO sem task rastreável (I.3).

## Skills irmãs

| Skill | Fase | Relação com `spec-code-audit` |
|-------|------|-------------------------------|
| `spec-implement` | 10 | Gera o código auditado por esta skill e mantém o `spec_story.md` por módulo — histórico de implementação usado como insumo do inventário (A.9) |
| `spec-security-review` | 7b | Provê `security-review.md` (findings SEC-NNN previstos) e/ou tasks SEC no `tasks.json`, cruzados no Passo G.5 |
| `spec-tasks` | 7 | Provê `tasks.json` para calibrar severidades e cruzar cobertura de testes |
| `spec-tech-rules` | 5.5 | Dona das rules (`.cursor/rules/` ou `.claude/rules/`) auditadas no Passo B |
| `spec-estimate` | 7.5 | Pode ser reacionada se o plano de remediação gerar retrabalho relevante no cronograma |
