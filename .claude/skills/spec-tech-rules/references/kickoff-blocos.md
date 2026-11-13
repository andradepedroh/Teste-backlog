# spec-tech-rules — os dez blocos do kickoff (PASSO 2)

> Lido antes de montar o quadro do Modo expresso (Turno 1) ou de começar o modo detalhado. O BLOCO 9
> (Frontend) só se `temUI = true`.

### BLOCO 1 — Linguagem e Runtime

**1.1 — Linguagem do backend:**
```
Qual a linguagem/runtime do backend?
  1. Java + Spring Boot
  2. Node.js + TypeScript + NestJS
  3. Node.js + TypeScript + Fastify
  4. Python + FastAPI
  5. C# + .NET
  6. Go
  7. Outra → descreva

[Sugestão baseada no perfil — citar o sinal que embasa:
 - dominioComplexo = true OU modulosDistintos ≥ 3 → Java Spring Boot (ecossistema hexagonal + DDD maduro)
 - prazoApertado = true E temUI = true → Node.js TypeScript (isomorfismo, menos contexto de switch)
 - dados analíticos / ML detectados nos requisitos → Python FastAPI
 - discovery menciona Azure / ecossistema Microsoft → C# .NET
 - padrão quando sem sinal claro: Java Spring Boot]
```

**1.2 — Versão:** sugerir LTS mais recente (Java 21, Node 22, Python 3.12, .NET 8). Confirmar.

**1.3 — Frontend:**
```
Há interface de usuário no produto?
  1. Sim — padrão empresa (Next.js App Router + TypeScript + shadcn/ui + React Query)
  2. Sim — cliente exige outra stack → descreva
  3. Não há UI — produto é API/serviço puro

[Se product-requirements.md tem fluxos de UI → sugerir opção 1 citando os módulos encontrados]
```

---

### BLOCO 2 — Arquitetura

**2.1 — Estilo arquitetural:**
```
Estilo arquitetural do sistema?
  1. Monolito simples  (deployable único, sem fronteiras de módulo)
  2. Monolito modular  (cada módulo é um deployable independente — mesmo repo/monorepo, stack e, tipicamente, base de dados compartilhados; comunicação entre módulos via rede)
  3. Microserviços  (serviços autônomos — deploy, base de dados e time independentes por serviço)
  4. Strangler fig (migração gradual de legado)

[Sugestão:
 - modulosDistintos ≤ 2 OU prazoApertado → Monolito simples
 - modulosDistintos ≥ 3 sem times independentes por domínio → Monolito modular (cada módulo é um deployable próprio, compartilhando monorepo/convenções/base de dados)
 - times independentes por domínio OU base de dados/escala independentes por serviço → Microserviços
 - legado detectado no spec-legacy → Strangler fig
 → citar os módulos identificados em requirements.md]
```

**2.2 — Padrão interno:**
```
Padrão de arquitetura interna?
  1. Layered (Controller → Service → Repository)
  2. Hexagonal (Ports & Adapters)
  3. Hexagonal + DDD tático (Aggregates, Value Objects, Domain Events)
  4. Clean Architecture

[Sugestão:
 - dominioComplexo = true → Hexagonal + DDD tático
 - CRUD simples OU prazoApertado → Layered
 - padrão: Hexagonal + DDD tático (testabilidade, isolamento de infra)
 → citar a complexidade encontrada em business-rules.md]
```

**2.3 — Práticas de código obrigatórias:**
```
Quais práticas de design de código são obrigatórias neste projeto?
  1. SOLID + Clean Code  ← recomendado para Hexagonal e projetos com longevidade
  2. Apenas Clean Code (nomenclatura, funções pequenas, sem duplicação)
  3. Apenas SOLID
  4. Nenhuma definida formalmente — equipe decide caso a caso

[Sugestão:
 - Hexagonal escolhido → SOLID obrigatório (Dependency Inversion é o núcleo do hexagonal)
 - dominioComplexo = true → SOLID + Clean Code
 - prazoApertado OU protótipo → opção 4 (não engessa desnecessariamente)
 → essas práticas entram em conventions.mdc como MUST]
```

**2.4 — Comunicação entre módulos** *(apresentar apenas se monolito modular ou microserviços)*:
```
Como os módulos/serviços se comunicam?
  1. Chamada direta via interfaces (in-process)  ← só dentro do mesmo deployable
  2. REST HTTP síncrono
  3. Mensageria assíncrona
  4. Misto: síncrono para consultas, assíncrono para eventos

[Sugestão:
 - monolito modular → opção 4 (cada módulo é um deployable independente — comunicação entre módulos sempre via rede: REST síncrono + mensageria para eventos; a opção 1 só se aplica entre camadas dentro de um mesmo módulo)
 - microserviços → opção 4
 - temOperacaoIrreversivel = true → mensageria obrigatória para eventos pós-commit]
```

---

### BLOCO 3 — Persistência

**3.1 — Banco de dados:**
```
Banco de dados principal?
  1. PostgreSQL
  2. PostgreSQL + PostGIS  (dados geoespaciais)
  3. MySQL / MariaDB
  4. SQL Server
  5. MongoDB
  6. Outro → descreva

[Sugestão:
 - dados geoespaciais OU sistema ambiental/territorial → PostgreSQL + PostGIS
 - padrão → PostgreSQL]
```

**3.2 — Acesso a dados:**
```
Como o código acessa o banco?
  1. ORM completo  (Spring Data JPA / Prisma / TypeORM)
  2. ORM para escrita + SQL nativo para leitura complexa
  3. Query builder type-safe  (JOOQ / Drizzle)
  4. SQL nativo com mapeamento manual

[Sugestão:
 - Java + Hexagonal → opção 2: JPA para escrita, JPQL/SQL para projeções
 - TypeScript → Prisma
 - muitas queries analíticas/relatórios → JOOQ / Drizzle]
```

**3.3 — Migrações:**
```
Ferramenta de migrações?
  1. Flyway  (Java — forward-only, versionado)
  2. Liquibase  (Java — rollback suportado)
  3. Prisma Migrate  (TypeScript)
  4. Alembic  (Python)
  5. EF Core Migrations  (C#)

[Sugestão: seguir a ferramenta canônica da linguagem escolhida]
```

**3.4 — Cache:**
```
O sistema precisa de cache?
  1. Não
  2. Cache in-process  (Caffeine / node-lru-cache)
  3. Redis distribuído
  4. Redis + cache in-process (L1/L2)

[Sugestão:
 - idempotência OU rate limiting escolhidos → Redis obrigatório
 - volumeAlto OU latência < 200ms → Redis
 - temIntegracaoExterna = true (APIs externas lentas) → Redis para cachear respostas
 → citar o RNF ou decisão que justifica]
```

**3.5 — Mensageria** *(apresentar apenas se assíncrono escolhido em 2.4)*:
```
Broker de mensageria?
  1. RabbitMQ  (filas, roteamento, operações de negócio padrão)
  2. Kafka  (alto volume, event log imutável, replay, event sourcing)
  3. AWS SQS/SNS  (cloud-first AWS)
  4. Redis Pub/Sub  (notificações simples, sem garantia de entrega)

[Sugestão:
 - > 100k msgs/dia OU event sourcing → Kafka
 - workflows assíncronos padrão → RabbitMQ
 - temOperacaoIrreversivel = true → DLQ obrigatória qualquer que seja o broker]
```

---

### BLOCO 4 — Convenções

**4.1 — Idioma do código:**
```
Idioma dos identificadores de código?
  1. Inglês no código + pt-BR na UI e mensagens ao usuário  ← padrão empresa
  2. Inglês em tudo
  3. Português em tudo

[Sugestão: opção 1 — padrão empresa, facilita onboarding e integração com libs]
```

**4.2 — Nomenclatura de banco:**
```
Convenção de nomenclatura do banco?
  1. snake_case  ← recomendado
  2. PascalCase
  3. UPPER_SNAKE_CASE

Prefixo de tabela por módulo?  S/N
[Sugestão: snake_case sempre; prefixo se monolito modular com ≥ 3 módulos]
```

**4.3 — Versionamento de API:**
```
Como versionar as APIs REST?
  1. Path versioning: /api/v1/recursos  ← recomendado
  2. Header versioning
  3. Sem versionamento  (API interna, contrato único)

[Sugestão: path versioning se há clientes externos; sem versão se API interna]
```

**4.4 — Formato de erro da API:**
```
Formato de resposta de erro?
  1. RFC 7807 Problem Details  ← recomendado (Spring 6 / NestJS nativos)
  2. Envelope customizado { code, message, details }
  3. HTTP status + body simples

[Sugestão: RFC 7807 — padrão aberto, zero código extra em Spring 6]
```

**4.5 — Paginação e filtros:**
```
Como são implementadas listas paginadas e filtros?
  1. Offset/limit: ?page=1&size=20  ← recomendado para maioria
  2. Cursor-based: ?cursor=abc&size=20  (grandes volumes, feeds)
  3. Sem padrão definido — cada endpoint decide

Parâmetros de ordenação: ?sort=campo&direction=asc  S/N

[Sugestão:
 - volumeAlto = true OU feeds em tempo real → cursor-based
 - relatórios / grids admin → offset/limit
 → citar se requirements menciona listagem com grande volume]
```

**4.6 — Tratamento de erros e exceções:**
```
Como modelar e propagar erros no sistema?
  1. Exceções de domínio customizadas + handler global na borda HTTP
  2. Result type (Either/Result) — sem exceções de controle de fluxo
  3. Exceções + códigos de erro tipados (enum de códigos)

[Sugestão:
 - Hexagonal + DDD → opção 1 ou 3: domain exceptions propagadas até o handler global
 - dominioComplexo = true com múltiplos ramos de erro → opção 3 (enum tipado evita strings soltas)
 - TypeScript → opção 2 (Result type integra bem com tipagem estática)]
```

---

### BLOCO 5 — Testes

**5.1 — Estratégia geral:**
```
Quais camadas de teste o projeto terá?
  1. Unitário apenas
  2. Unitário + Integração  ← mínimo recomendado
  3. Unitário + Integração + E2E
  4. Unitário + Integração + E2E + Carga/Performance

[Sugestão:
 - temUI = true → opção 3 mínimo
 - volumeAlto = true OU SLO de performance definido → opção 4 obrigatório
 - clienteGoverno OU temDadosPessoais → E2E em fluxos críticos obrigatório
 → citar os RNFs que justificam]
```

**5.2 — Cobertura mínima:**
```
Threshold de cobertura de testes?
  1. 80% de linha (global)
  2. Por camada: domínio 100% / aplicação 80% / infra 60%  ← se hexagonal
  3. 90% global  (sistema crítico / financeiro / saúde)
  4. Sem threshold formal

[Sugestão:
 - Hexagonal escolhido → opção 2 (domínio sem infra deve ter 100%)
 - Layered → opção 1
 - temOperacaoIrreversivel = true → opção 3]
```

**5.3 — E2E** *(apresentar apenas se opção 3 ou 4 em 5.1)*:
```
Ferramenta para testes E2E?
  1. Playwright  ← recomendado
  2. Cypress
  3. Selenium  (legado)
  4. Outro → descreva

Escopo dos testes E2E:
  A. Apenas UI  (navegação, formulários, fluxos visuais)
  B. UI + API  (Playwright testa HTTP diretamente além da UI)
  C. Apenas API  (sem UI, testa endpoints HTTP end-to-end)

[Sugestão:
 - Playwright suporta A, B e C nativamente
 - Cypress é mais UI-focused (B e C são possíveis mas menos ergonômicos)
 - temUI = true → escopo B (UI + API dos fluxos críticos)
 - sem UI → escopo C com Playwright ou supertest/httpx]
```

**5.4 — Carga/Performance** *(apresentar apenas se opção 4 em 5.1 ou SLO nos RNFs)*:
```
Ferramenta para testes de carga?
  1. k6  ← recomendado (JavaScript, integra com Grafana nativamente)
  2. Gatling  (Scala/Java, relatórios ricos)
  3. Locust  (Python, fácil de escrever)
  4. JMeter  (GUI, legado — evitar em CI moderno)

O que os testes de carga devem validar?
  → Derivar dos RNFs de performance encontrados em requirements.md
  → Confirmar: endpoints a testar, SLO (p95, taxa de erro, throughput)
```

---

### BLOCO 6 — Observabilidade

**6.1 — Nível de observabilidade:**
```
Qual o nível de observabilidade do projeto?
  1. Completa: traces + métricas + logs estruturados  ← recomendado
  2. Logs estruturados + métricas  (sem traces distribuídos)
  3. Apenas logs estruturados
  4. Mínimo: health check + logs básicos  (POC / projeto interno sem SLA)
  5. Nenhuma  (script / ferramenta CLI)

[Sugestão:
 - volumeAlto OU SLO definido → opção 1 obrigatório
 - microserviços → opção 1 obrigatório (traces distribuídos essenciais)
 - padrão para sistemas com usuários → opção 1
 - POC sem SLA → opção 4]
```

**6.2 — Stack / destino da telemetria** *(se opção 1, 2 ou 3)*:
```
Para onde vai a telemetria?
  1. OpenTelemetry → stack própria  (Prometheus + Grafana + Loki + Tempo)
  2. OpenTelemetry → Datadog
  3. OpenTelemetry → New Relic
  4. OpenTelemetry → Azure Monitor / Application Insights
  5. OpenTelemetry → outro vendor → descreva
  6. Sem OpenTelemetry — biblioteca nativa do vendor  (ex: Datadog Agent direto)
  7. ELK / OpenSearch  (logs estruturados, sem OTEL)

[Sugestão:
 - vendor mencionado no discovery → usar o vendor (OTEL exporta para qualquer destino)
 - clienteGoverno → stack própria (dados de telemetria não saem para vendor externo)
 - padrão: OTEL → stack própria
 → citar se discovery menciona infraestrutura existente]
```

**6.3 — Formato de log:**
```
Formato de logs?
  1. JSON estruturado com trace-id/correlation-id  ← recomendado
  2. Texto semi-estruturado  (logback pattern, mais legível no terminal)
  3. Sem formato definido

[Sugestão: JSON estruturado — parseável por qualquer stack, obrigatório para correlacionar com traces]
```

**6.4 — Métricas de negócio** *(além das técnicas RED: Rate, Errors, Duration)*:
```
O projeto deve expor métricas de negócio customizadas?
  1. Não — métricas técnicas são suficientes
  2. Sim → listar derivando dos RNFs/KPIs encontrados em requirements.md

[Sugestão: sim se requirements.md tem SLOs de negócio ou clienteGoverno com relatório de uso]
```

---

### BLOCO 7 — Auth e Autorização

**7.1 — Autenticação:**
```
Mecanismo de autenticação?
  1. JWT Bearer Token  (stateless, sem SSO)
  2. OIDC / OAuth 2.0 via Keycloak  (SSO, múltiplos sistemas)
  3. OIDC via provedor externo  (Auth0, Entra ID, Cognito)
  4. Session-based  (cookie httpOnly, monolito)
  5. API Key  (integrações B2B / webhooks)
  6. Misto: OIDC para usuários + API Key para integrações
  7. Sem autenticação

[Sugestão:
 - clienteGoverno + múltiplos sistemas → Keycloak OIDC
 - SaaS multi-tenant → Auth0 / Cognito
 - API B2B pura → API Key
 - padrão com UI → OIDC
 → citar os tipos de usuário encontrados em requirements.md]
```

**7.2 — Autorização:**
```
Modelo de autorização?
  1. RBAC simples  (roles fixas no token)
  2. RBAC + permissões granulares  (roles + permissions por recurso)
  3. ABAC  (atributos dinâmicos: município, órgão, contexto)
  4. Sem autorização diferenciada

[Sugestão:
 - roles bem definidas nos requirements → RBAC simples
 - regras de acesso dependem de atributos do recurso (ex: analista só vê processos do seu município) → ABAC
 → citar as regras de acesso encontradas em requirements.md]
```

**7.3 — Auditoria / LGPD:**
```
Trilha de auditoria?
  1. Completa  (CREATE/UPDATE/DELETE em entidades com dados pessoais)
  2. Apenas operações críticas  (decisões, protocolos, emissões)
  3. Não necessário

[Sugestão:
 - temDadosPessoais = true → opção 1 obrigatória (LGPD)
 - clienteGoverno = true → opção 1 (accountability regulatória)
 → citar as entidades com PII encontradas em requirements.md]
```

**7.4 — Proteções adicionais** *(múltipla escolha)*:
```
Proteções adicionais necessárias?
  1. Rate limiting por usuário/IP
  2. Idempotência em operações de escrita irreversíveis
  3. MFA em operações de alto risco
  4. Validação de upload  (MIME real, tamanho máximo, storage isolado)

[Sugestão:
 - qualquer acesso externo → opção 1 obrigatório
 - temOperacaoIrreversivel = true → opção 2 obrigatório
 - painel admin → opção 3
 - requirements menciona upload → opção 4
 → citar as operações irreversíveis identificadas em business-rules.md]
```

---

### BLOCO 8 — Deploy e Build

**8.1 — Containerização:**
```
Como o sistema é empacotado e entregue?
  1. Dockerfile por módulo + Docker Compose para dev local  ← padrão empresa
  2. Dockerfile + Kubernetes  (manifests ou Helm entregues)
  3. Build artefato sem container  (cliente exige)

[Sugestão: opção 1 — padrão empresa, pipeline e registry são do cliente]
```

**8.2 — Ambientes:**
```
Quais ambientes existem?
  1. local → dev → prod
  2. local → dev → homolog → prod  ← recomendado
  3. local → prod apenas  (POC)

[Sugestão: opção 2 — homolog é onde o cliente valida antes de prod]
```

**8.3 — Branching:**
```
Estratégia de branching?
  1. Gitflow  (main + develop + feature/* + release/* + hotfix/*)  ← recomendado
  2. GitHub Flow  (main + feature/*, deploy contínuo)
  3. Trunk-based

[Sugestão: Gitflow se há releases planejadas e gate de aprovação do cliente]
```

**8.4 — Infraestrutura compartilhada:**
```
Há rede Docker ou serviços de infra compartilhados com outros módulos do projeto?
(Redis, RabbitMQ, OTEL Collector, banco de dados)
  1. Não — cada módulo sobe sua própria infra
  2. Sim → nome da rede Docker e lista de serviços compartilhados

[Essa resposta alimenta deploy-and-build.mdc e os docker-compose das tasks de implementação]
```

---

### BLOCO 9 — Frontend *(apresentar apenas se temUI = true)*

**9.1 — Stack:**
```
O cliente exige algo diferente do padrão empresa?
(Next.js App Router + TypeScript + shadcn/ui + React Query)
  1. Não — adotar padrão empresa
  2. Sim → descreva

[Se opção 1: gerar o frontend.mdc (stub com as decisões do projeto, referenciando o padrão)
 E materializar o frontend-default.mdc ao lado — a referência precisa resolver no repo gerado;
 no harness Elo essa cópia já existe: é a rule de frontend do harness (PASSO 4)]
```

**9.2 — Acessibilidade (não é perguntada):** o nível é **WCAG 2.2 AA**, lido da rule de frontend —
no harness Elo, `.claude/rules/harness/frontend.md`, § «Acessibilidade»; fora dele,
`templates/frontend-default.mdc`, mesma seção. É o nível que a `spec-product` cobra no
`product-requirements.md`, e a rule é a dona dele. Mostrar como informação, com a fonte — no quadro
do Modo expresso, linha informativa, fora das exceções por número — e preencher `{{A11Y_LEVEL}}` com
ele.

Exigência maior do cliente (AAA em parte do fluxo, norma setorial citada no `discovery-document.md`)
entra como exceção registrada no `frontend.mdc` do projeto, com a fonte; abaixo de AA, nunca.
Cliente governamental que cita WCAG 2.1 AA: o 2.2 AA atende, porque conteúdo conforme ao 2.2 também
é conforme ao 2.1 — registrar a norma citada como fonte.

**9.3 — Internacionalização:**
```
Frontend com i18n?
  1. Não — apenas pt-BR
  2. Sim → listar idiomas
```

---

### BLOCO 10 — Integrações Externas

**10.1:**
```
O sistema integra com APIs externas?
[Apresentar lista derivada de context-map.md e discovery-document.md]
  1. Não
  2. Sim — confirmar/complementar a lista identificada nos documentos

Para cada integração confirmar:
  - Autenticação  (API Key, OAuth 2.0, mTLS, sem auth)
  - Onde fica o adapter  (módulo dedicado ou cada módulo consome diretamente)
  - Precisa de circuit breaker?  (SLA da API é garantido?)
  - Retorna PII?  (impacta masking em logs e auditoria)
```
