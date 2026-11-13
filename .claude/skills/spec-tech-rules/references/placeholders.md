# spec-tech-rules — placeholders de cada template (PASSO 4)

> Lido no PASSO 4, ao preencher cada template `.mdc`. Os placeholders comuns a todos os arquivos
> estão no `SKILL.md`, PASSO 4.

### `architecture.mdc` ← `./templates/architecture.mdc`

| Placeholder | Valor |
|-------------|-------|
| `{{ARCHITECTURE_DESCRIPTION}}` | 1 linha: linguagem + estilo + padrão + práticas. Ex: `"Java 21 Spring Boot — monolito modular (módulos deployáveis independentes) hexagonal+DDD, SOLID obrigatório"` |
| `{{ARCHITECTURE_STYLE}}` | Decisão 2.1 |
| `{{ARCHITECTURE_RATIONALE}}` | 1–2 frases do contexto: módulos identificados, escala, equipe |
| `{{INTERNAL_PATTERN}}` | Decisão 2.2 |
| `{{LAYER_DIAGRAM}}` | Diagrama ASCII das camadas na ordem de dependência |
| `{{LAYERS_TABLE}}` | camada \| responsabilidade \| pode depender de |
| `{{DOMAIN_LAYER}}` | Nome da camada de domínio: `domain` / `core` |
| `{{INFRA_LAYER}}` | Nome da camada de infra: `infrastructure` |
| `{{USECASE_LAYER}}` | Nome da camada de use cases: `application/usecase` |
| `{{FOLDER_STRUCTURE}}` | Árvore com pacotes reais do projeto |
| `{{CORRECT_EXAMPLE}}` | Use case correto: porta → domínio → adapter, com nomes reais |
| `{{WRONG_EXAMPLE}}` | Anti-pattern: infra injetada diretamente, com nomes reais |
| `{{INTER_MODULE_RULES}}` | Decisão 2.4: regras reais com exemplos de imports proibidos; vazio se monolito simples |

*(As práticas de código da decisão 2.3 — SOLID/Clean Code + checklist de PR — são materializadas
pelo `conventions.mdc` via blocos `{{#if SOLID}}`/`{{#if CLEAN_CODE}}` e `{{PR_CHECKLIST}}` — não
duplicar aqui.)*

---

### `conventions.mdc` ← `./templates/conventions.mdc`

| Placeholder | Valor |
|-------------|-------|
| `{{CONVENTIONS_DESCRIPTION}}` | 1 linha incluindo idioma, formatter, práticas de código |
| `{{CODE_LANGUAGE}}` | Decisão 4.1: `inglês` |
| `{{UI_LANGUAGE}}` | `pt-BR` ou conforme decisão |
| `{{CODE_LANGUAGE_VIOLATION_EXAMPLE}}` | Ex: `buscarProcessoPorId` (português em identificador Java) |
| `{{NAMING_TABLE}}` | Todos os artefatos da linguagem: classe, método, constante, pacote, arquivo, teste, DTO, port, use case, domain exception, enum, value object |
| `{{FORMATTER_TOOL}}` | Spotless / Prettier / Black |
| `{{FORMATTER_COMMAND}}` | Comando real |
| `{{FORMATTER_CONFIG}}` | Snippet de configuração |
| `{{DI_RULES}}` | Java: injeção por construtor, sem `@Autowired` em campo. TypeScript: sem `any`, `unknown` + parse. Python: sem global mutable state |
| `{{TEST_NAMING_CORRECT}}` | 3 exemplos corretos: contexto + condição + resultado |
| `{{TEST_NAMING_WRONG}}` | 3 exemplos proibidos |
| `{{SOLID}}` | `true` se decisão 2.3 inclui SOLID |
| `{{SOLID_DIP_EXAMPLE}}` | Exemplo de DIP na linguagem: classe recebe interface por construtor vs instancia concreta |
| `{{MAX_SERVICE_LINES}}` | Limite de linhas para SRP: `200` (Java) / `150` (TypeScript) |
| `{{CLEAN_CODE}}` | `true` se decisão 2.3 inclui Clean Code |
| `{{MAX_FUNCTION_LINES}}` | Limite de linhas para funções: `20` (Java) / `15` (TypeScript) |
| `{{CLEAN_CODE_MAGIC_NUMBER_EXAMPLE}}` | Exemplo: `if (status == 3)` → `if (status == StatusProcesso.AUTORIZADO)` |
| `{{PR_CHECKLIST}}` | Lista de verificação antes do PR — incluir itens de SOLID/Clean Code se decisão 2.3 os exige |

---

### `database.mdc` ← `./templates/database.mdc`

| Placeholder | Valor |
|-------------|-------|
| `{{DATABASE_DESCRIPTION}}` | 1 linha: banco + naming + ferramenta de migration |
| `{{DB_TOOL_GLOB}}` | `**/flyway*` / `**/*.prisma` / etc |
| `{{NAMING_CONVENTION}}` | Decisão 4.2 |
| `{{MODULE_PREFIX}}` | `true/false` da decisão 4.2 |
| `{{MODULE_PREFIX_TABLE}}` | Prefixos reais por módulo (ex: `aia_`, `sd_`, `core_`) |
| `{{PK_TYPE}}` | `UUID` (PostgreSQL) / `CHAR(36)` / `String @id` |
| `{{PK_DEFAULT}}` | `gen_random_uuid()` / `uuid()` / `@default(uuid())` |
| `{{TIMESTAMP_TYPE}}` | `TIMESTAMPTZ` / `TIMESTAMP` / `DateTime` |
| `{{TYPES_TABLE}}` | Tipos preferidos para o banco: monetário → `NUMERIC(15,2)`, geoespacial → `GEOMETRY` (se PostGIS), etc |
| `{{DDL_EXAMPLE}}` | DDL mínimo real de uma tabela do projeto com todas as convenções |
| `{{MIGRATION_TOOL}}` | Decisão 3.3 |
| `{{MIGRATION_NAMING_PATTERN}}` | Ex: `V{N}__{verbo_snake_case}.sql` |
| `{{MIGRATION_CONFIG}}` | Configuração mínima da ferramenta |
| `{{SEED_LOCATION}}` | Caminho dos seeds de dev |

---

### `test-strategy.mdc` ← `./templates/test-strategy.mdc`

| Placeholder | Valor |
|-------------|-------|
| `{{TEST_DESCRIPTION}}` | 1 linha: linguagem + ferramentas + threshold + E2E + carga |
| `{{TEST_PYRAMID_TABLE}}` | camada \| ferramenta real \| localização \| threshold |
| `{{DI_FRAMEWORK_ANNOTATION}}` | O que NÃO usar em testes de domínio: `@SpringBootTest` / `@Injectable()` / etc |
| `{{DOMAIN_TEST_EXAMPLE}}` | Teste de domínio puro sem framework |
| `{{MOCK_TARGET}}` | `interfaces de porta de saída` / `repositórios` |
| `{{USECASE_TEST_EXAMPLE}}` | Teste de use case com mock da porta |
| `{{INTEGRATION_TEST_TYPE}}` | `@WebMvcTest` slice / Supertest / TestClient |
| `{{INTEGRATION_TEST_RULES}}` | Regras do tipo de teste de integração escolhido |
| `{{DB_TEST_TOOL}}` | Testcontainers / pytest-docker |
| `{{FAKE_DB}}` | H2 / SQLite — o que proibir |
| `{{INTEGRATION_TEST_EXAMPLE}}` | Configuração mínima de Testcontainers |
| `{{COVERAGE_TOOL}}` | JaCoCo / c8 / coverage.py |
| `{{COVERAGE_THRESHOLD}}` | Decisão 5.2 com valores exatos |
| `{{COVERAGE_CONFIG}}` | Snippet de configuração do threshold |
| `{{E2E}}` | `true` se E2E ativado |
| `{{E2E_TOOL}}` | Decisão 5.3: Playwright / Cypress |
| `{{E2E_LOCATION}}` | Caminho dos testes E2E |
| `{{E2E_SCOPE}}` | Descrição do escopo: `UI + API` / `apenas UI` / `apenas API` — decisão 5.3 |
| `{{E2E_UI}}` | `true` se escopo inclui UI |
| `{{E2E_API}}` | `true` se escopo inclui testes de API |
| `{{E2E_EXTRA_RULES}}` | Fluxos críticos identificados no product-requirements que os testes E2E devem cobrir |
| `{{LOAD_SLO}}` | Tabela de SLOs por endpoint/cenário derivada dos RNFs de performance |
| `{{LOAD}}` | `true` se carga ativada |
| `{{LOAD_TOOL}}` | Decisão 5.4 |
| `{{LOAD_LOCATION}}` | Caminho dos scripts |

---

### `observability.mdc` ← `./templates/observability.mdc`

| Placeholder | Valor |
|-------------|-------|
| `{{OBSERVABILITY_DESCRIPTION}}` | 1 linha: nível + stack + formato de log |
| `{{TRACES_DESTINATION}}` | Decisão 6.2: Tempo / Datadog / N/A se sem traces |
| `{{METRICS_LIBRARY}}` | Micrometer / prom-client / opentelemetry-sdk |
| `{{METRICS_DESTINATION}}` | Prometheus / vendor / N/A |
| `{{LOG_LIBRARY}}` | Logback / winston / pino / structlog |
| `{{LOGS_DESTINATION}}` | Loki / ELK / vendor |
| `{{SERVICE_NAME_PLACEHOLDER}}` | Ex: `meu-projeto-api` |
| `{{OTLP_ENDPOINT}}` | Ex: `http://otel-collector:4317` ou URL do vendor |
| `{{PROD_LOG_LEVEL}}` | `INFO` padrão |
| `{{LOG_CORRECT_EXAMPLE}}` | JSON com traceId, spanId, campos de negócio sem PII |
| `{{LOG_WRONG_EXAMPLE}}` | Log texto plano ou com PII |
| `{{HEALTH_ENDPOINT}}` | `/actuator/health` / `/health` / `/healthz` |
| `{{CRITICAL_DEPS}}` | Dependências críticas do projeto: PostgreSQL, Redis, RabbitMQ, etc |
| `{{HEALTHCHECK_DOCKERFILE}}` | Snippet HEALTHCHECK real para o framework |
| `{{BUSINESS_METRICS}}` | `true` se decisão 6.4 = sim |
| `{{BUSINESS_METRICS_TABLE}}` | Métricas derivadas dos RNFs/KPIs do produto |
| `{{BUSINESS_METRICS_EXAMPLE}}` | Implementação de métrica customizada |
| `{{PRINT_STATEMENT}}` | `System.out.println` / `console.log` / `print()` |

**Se decisão 6.1 = opção 4 (mínimo) ou 5 (nenhuma):** gerar arquivo simplificado com apenas health check e instrução de log mínimo. Omitir seções de OTEL e métricas.

---

### `auth.mdc` ← `./templates/auth.mdc`

**Omitir se** decisão 7.1 = opção 7 (sem autenticação)

| Placeholder | Valor |
|-------------|-------|
| `{{AUTH_DESCRIPTION}}` | 1 linha: mecanismo + modelo authz + proteções ativas |
| `{{AUTH_MECHANISM}}` | Decisão 7.1 |
| `{{AUTH_TOKEN_HEADER}}` | `Authorization: Bearer` / `Cookie: session` / `X-API-Key` |
| `{{AUTH_VALIDATION_LOCATION}}` | Nome real do filter/middleware no projeto |
| `{{AUTH_FILTER_NAME}}` | Nome real |
| `{{AUTH_MECHANISM_RULES}}` | Regras específicas do mecanismo (ex: OIDC → JWKS endpoint, resource server config) |
| `{{AUTHZ_MODEL}}` | Decisão 7.2 |
| `{{ROLES_TABLE}}` | Roles reais dos requirements com permissões |
| `{{AUTHZ_ENFORCEMENT_LAYER}}` | Onde verificar: controller / middleware |
| `{{HARDCODED_ROLE_CHECK_EXAMPLE}}` | Ex: `if (role.equals("ADMIN"))` em use cases |
| `{{RATE_LIMITING}}` | `true` se decisão 7.4 inclui rate limiting |
| `{{RATE_LIMIT_TOOL}}` | Bucket4j + Redis / express-rate-limit / slowapi |
| `{{RATE_LIMIT_TABLE}}` | Endpoints \| limite \| janela |
| `{{RATE_LIMIT_EXAMPLE}}` | Snippet de configuração real |
| `{{IDEMPOTENCY}}` | `true` se decisão 7.4 inclui idempotência |
| `{{IDEMPOTENCY_ENDPOINTS}}` | Endpoints que exigem `Idempotency-Key` — derivados das operações irreversíveis |
| `{{IDEMPOTENCY_TTL}}` | TTL no Redis: ex. `24h` |
| `{{IDEMPOTENCY_EXAMPLE}}` | Implementação do filtro de idempotência |
| `{{AUDIT}}` | `true` se decisão 7.3 = opção 1 ou 2 |
| `{{AUDIT_TABLE}}` | Operações \| entidade \| action — das entidades com PII em requirements |
| `{{AUDIT_EXAMPLE}}` | Chamada ao AuditPort no use case após commit |
| `{{CORS_CONFIG}}` | Origens reais por ambiente |

---

### `deploy-and-build.mdc` ← `./templates/deploy-and-build.mdc`

| Placeholder | Valor |
|-------------|-------|
| `{{DEPLOY_DESCRIPTION}}` | 1 linha: linguagem + containerização + branching + ambientes |
| `{{DOCKERFILE_CONTENT}}` | Dockerfile multi-stage completo: builder real (ex: `gradle:8-jdk21`) + runtime mínimo (ex: `eclipse-temurin:21-jre`) + usuário não-root + HEALTHCHECK |
| `{{DOCKER_COMPOSE_CONTENT}}` | docker-compose com os serviços reais, depends_on, env_file, rede |
| `{{DOCKER_NETWORK}}` | Decisão 8.4: nome da rede compartilhada ou `[projeto]-network` |
| `{{ENV_EXAMPLE_CONTENT}}` | Todas as variáveis necessárias com comentários: DB, OTEL, integrações, secrets |
| `{{ENVIRONMENTS_TABLE}}` | Ambientes \| propósito \| DB host \| integrações (decisão 8.2) |
| `{{PROFILES_CONFIG}}` | Profiles por ambiente: Spring profiles / NODE_ENV |
| `{{PROFILE_ENV_VAR}}` | `SPRING_PROFILES_ACTIVE` / `NODE_ENV` |
| `{{BRANCHING_STRATEGY}}` | Decisão 8.3 |
| `{{BRANCHES_TABLE}}` | Branches \| propósito \| protegida + naming com ID de work item |
| `{{BRANCH_NAMING_EXAMPLE}}` | Ex: `feature/PROJ-123-add-processo-endpoint` |
| `{{PIPELINE_STAGES}}` | Sequência de stages recomendada para o CI do cliente |
| `{{GATE_ENVIRONMENTS}}` | Ambientes com gate manual |
| `{{BUILD_TOOL_IMAGE}}` | Imagem de build: `gradle:8-jdk21` / `node:22` |
| `{{TAG_STRATEGY}}` | Ex: `[branch]-[short-sha]` |
| `{{DEBUG_PORT}}` | `5005` (Java JDWP) / `9229` (Node) |

---

### `frontend.mdc` ← `./templates/frontend.mdc`

**Omitir se** decisão 1.3 = opção 3

| Placeholder | Valor |
|-------------|-------|
| `{{FRONTEND_DESCRIPTION}}` | 1 linha |
| `{{CUSTOM_STACK}}` | `true` se decisão 9.1 = opção 2 |
| `{{CUSTOM_STACK_DESCRIPTION}}` | Stack customizada descrita |
| `{{A11Y_LEVEL}}` | `WCAG 2.2 AA` — lido da rule de frontend (9.2 é informação, não pergunta); com a exceção do cliente, se houver |
| `{{I18N}}` | Decisão 9.3 |
| `{{EXTRA_DECISIONS_TABLE}}` | Outras decisões específicas do projeto |
| `{{CUSTOM_STACK_TABLE}}` | Tabela de stack se customizada |
| `{{CUSTOM_FOLDER_STRUCTURE}}` | Estrutura de pastas se customizada |
| `{{CUSTOM_RULES}}` | Regras específicas da stack customizada |
| `{{CUSTOM_ANTIPATTERNS}}` | Anti-patterns da stack customizada |
| `{{PROJECT_OVERRIDES}}` | Overrides ao padrão empresa: apenas o que difere |

**Se padrão empresa (9.1 = opção 1):** `{{CUSTOM_STACK}}` = false. Preencher só as decisões do projeto — não duplicar conteúdo do padrão. **Materializar também `templates/frontend-default.mdc` (cópia integral, sem placeholder) nas mesmas pastas de destino**: o stub o referencia por nome, e a referência precisa resolver dentro do repositório gerado. No harness Elo essa cópia já existe — é a rule de frontend do harness — e não se materializa de novo (PASSO 4, Decisão 73).

---

### `messaging-and-queue.mdc` ← `./templates/messaging-and-queue.mdc`

**Omitir se** decisão 3.5 não ativada

| Placeholder | Valor |
|-------------|-------|
| `{{MESSAGING_DESCRIPTION}}` | 1 linha: broker + padrões obrigatórios |
| `{{BROKER}}` | Decisão 3.5 |
| `{{EXCHANGE_OR_TOPIC_TYPE}}` | `Exchanges (topic)` para RabbitMQ / `Topics` para Kafka |
| `{{EXCHANGE_NAMING_PATTERN}}` | Padrão: `[modulo].[entidade].[acao]` em kebab-case |
| `{{EXCHANGE_EXAMPLES}}` | Exemplos reais com os domínios do projeto (dos módulos em requirements.md) |
| `{{QUEUE_NAMING_PATTERN}}` | Padrão de nomenclatura de queues |
| `{{QUEUE_EXAMPLES}}` | Exemplos reais |
| `{{DLQ_NAMING_PATTERN}}` | `[queue].dlq` |
| `{{IDEMPOTENCY_KEY_FIELD}}` | Campo de negócio único: ex. `processoId`, `messageId` |
| `{{IDEMPOTENCY_STORAGE}}` | Redis / tabela de banco |
| `{{ACK_MODE}}` | `ackMode = MANUAL` / `enable.auto.commit=false` |
| `{{NACK_TO_DLQ}}` | Snippet de nack/reject para DLQ |
| `{{RETRY_MECHANISM}}` | Resilience4j / Spring Retry / etc |
| `{{MAX_RETRIES}}` | Número de tentativas |
| `{{CONSUMER_EXAMPLE}}` | Consumer completo: idempotência + ack + DLQ |
| `{{TRANSACTIONAL_PUBLISH_MECHANISM}}` | `@TransactionalEventListener(AFTER_COMMIT)` / outbox pattern |
| `{{TRANSACTION_ANNOTATION}}` | `@Transactional` / equivalente |
| `{{PUBLISHER_EXAMPLE}}` | Publisher correto pós-commit |
| `{{DLQ_TTL}}` | TTL das mensagens na DLQ |
| `{{RETRY_BACKOFF_CONFIG}}` | Configuração do backoff exponencial |

---

### `integrations.mdc` ← `./templates/integrations.mdc`

**Omitir se** decisão 10.1 = opção 1

| Placeholder | Valor |
|-------------|-------|
| `{{INTEGRATIONS_DESCRIPTION}}` | 1 linha com os sistemas integrados |
| `{{ADAPTER_LAYER_PATH}}` | Caminho real dos adapters: `infrastructure/client/` |
| `{{INTEGRATIONS_TABLE}}` | Linha por sistema com URL, auth, credencial (env var), adapter responsável |
| `{{ACL_CORRECT_EXAMPLE}}` | Adapter que recebe DTO externo e retorna modelo interno |
| `{{ACL_WRONG_EXAMPLE}}` | HTTP direto no use case |
| `{{CIRCUIT_BREAKER_LIB}}` | Resilience4j / axios-retry + opossum / tenacity |
| `{{RESILIENCE_CONFIG}}` | Circuit breaker + timeout + retry para a linguagem |
| `{{INTEGRATIONS_WITH_PII}}` | `true` se alguma integração retorna PII (decisão 10.1) |
| `{{PII_INTEGRATIONS}}` | Nomes das integrações com PII |
| `{{PII_MASKING_EXAMPLE}}` | Log mascarado na linguagem |
