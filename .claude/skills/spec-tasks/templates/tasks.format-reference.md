# Guia de Formatos — tasks.json v5.3 (compact-prose)

> **Documento de referência técnica.** Explica os formatos compact-prose usados em `apiContracts` e `persistenceModel`.

## Visão Geral

O formato **compact-prose** usa **strings ricas estruturadas** (separadas por delimitadores como `|` e `;`) em vez de objetos profundamente aninhados. Isso reduz o tamanho do arquivo mantendo todas as informações necessárias.

**Campos afetados:**
- `apiContracts[].auth`
- `apiContracts[].request`
- `apiContracts[].responses`
- `apiContracts[].policies`
- `persistenceModel.entities[].columns`
- `persistenceModel.entities[].relationships`
- `persistenceModel.entities[].indexes`
- `persistenceModel.entities[].uniqueConstraints`
- `persistenceModel.entities[].checkConstraints`

**Campos que mantêm estrutura de objeto:**
- `agentExecutionContext`
- `businessRules[]`
- `acceptanceScenarios[]`
- `implementationGuidance`

---

## Formato: apiContracts[].auth (string rica)

### Estrutura
```
"tipo — roles: R1, R2. Claims: c1 (descr), c2"
```
ou
```
"Público — endpoint sem autenticação obrigatória"
```

### Componentes
- **Tipo de autenticação**: Bearer JWT, API Key, OAuth2, Público
- **Roles**: lista separada por vírgula
- **Claims**: claims JWT com descrição entre parênteses

### Exemplo completo
```
"Bearer JWT — roles: CLIENTE, ADMIN. Claims: sub (clienteId), nome, email"
```

---

## Formato: apiContracts[].request (string rica pipe-separated)

### Estrutura
```
"Path: param (type required/optional — descr) | Query: param (type default=X — descr) | Body: field (type constraints — descr); field2... | Headers: name (required/optional — descr); exemplo"
```

### Componentes (separados por `|`)
1. **Path**: parâmetros de path
2. **Query**: query parameters
3. **Body**: campos do body JSON
4. **Headers**: headers HTTP

Cada componente lista seus elementos separados por `;` (para campos) ou `,` (para lista de valores).

### Exemplo completo
```
"Body: enderecoEntregaId (integer required — ID do endereço de entrega cadastrado); itens (array required minItems=1 — Lista de itens do pedido, items: {produtoId: integer, quantidade: integer minimum=1}); cupomDescontoId (integer optional — ID do cupom de desconto) | Headers: Authorization (required — Bearer JWT emitido pelo exemplo.com); Idempotency-Key (required — UUID v4 para evitar duplicação); X-Correlation-Id (optional — Correlation id, gerado se ausente)"
```

---

## Formato: apiContracts[].responses (string rica pipe-separated por status)

### Estrutura
```
"STATUS content-type — descrição. schema: { field: type example=X enum=[A,B] format=F optional; field2... } headers: H1 (descr); H2 | STATUS2 ..."
```

### Componentes (cada status separado por `|`)
- **STATUS**: código HTTP (200, 201, 400, 404, 422, 500, etc.)
- **content-type**: media type da resposta
- **descrição**: texto explicando o status
- **schema**: estrutura do body (campos inline)
- **headers**: headers de resposta (separados por `;`)

### Exemplo completo
```
"201 application/json — Pedido criado com sucesso. schema: { id: integer example=789; status: string enum=[PENDENTE_PAGAMENTO] example=PENDENTE_PAGAMENTO; valorTotal: number example=159.90; dataExpiracao: string format=date-time example=2026-05-14T21:05:00Z; linkPagamento: string format=uri example=/pedidos/789/pagamento } headers: Location (URI do pedido criado, e.g. /pedidos/789); X-Correlation-Id | 400 application/problem+json — Requisição malformada — payload inválido segundo Bean Validation (RFC 7807). schema: { type: string example=https://api.example.com/errors/validation-error; title: string example=Requisição malformada; status: integer example=400; detail: string example=Campo itens é obrigatório; instance: string; errors: array<{field: string, message: string}> } | 422 application/problem+json — Estoque insuficiente. schema: { type: string; title: string; status: integer; detail: string; itensIndisponiveis: array<{produtoId: integer, quantidadeSolicitada: integer, quantidadeDisponivel: integer}> } | 500 application/problem+json — Erro interno — falha não tratada (logada com correlationId)"
```

---

## Formato: apiContracts[].policies (string rica semicolon-separated)

### Estrutura
```
"Rate: algoritmo limit/entidade: X req/periodo. Caching: cacheable=Bool (detalhes). Idempotency: required/optional (mecanismo)."
```

### Componentes (separados por `.`)
- **Rate**: rate limiting (algoritmo, limite, entidade)
- **Caching**: política de cache
- **Idempotency**: requisito e mecanismo de idempotência

### Exemplo completo
```
"Rate: TOKEN_BUCKET limit/CPF: 100 req/min limit/IP: 300 req/min. Caching: cacheable=False (operação de escrita). Idempotency: required (Idempotency-Key header UUID v4 + TB_IDEMPOTENCY_KEYS com TTL 24h)."
```

---

## Formato: persistenceModel.entities[].columns (string rica pipe-separated)

### Estrutura
```
"nome TIPO constraints [operationType] (rule=XX) — descrição. Detalhes adicionais. | nome2 ..."
```

### Componentes (cada coluna separada por `|`)
- **nome**: nome da coluna
- **TIPO**: tipo SQL completo (ex: `BIGINT`, `VARCHAR(30)`, `TIMESTAMP`, `TEXT`)
- **constraints**: `PK`, `NOT NULL`, `NULL`, `UNIQUE`, `default=valor`
- **[operationType]**: `[NEW]`, `[ALTER]`, `[DROP]` (para migração)
- **(rule=XX)**: referência a requisito funcional ou regra de negócio (opcional)
- **—**: separador antes da descrição
- **descrição**: texto completo explicando propósito, formato, valores válidos, notas adicionais

### Exemplo completo
```
"id BIGINT PK NOT NULL [NEW] — Chave primária gerada por sequence. | status VARCHAR(40) NOT NULL [NEW] default=PENDENTE (rule=RF-PED-001) — Status do pedido. Valores: PENDENTE, PAGO, CANCELADO. Status inicial sempre PENDENTE. | data_criacao TIMESTAMP NOT NULL [NEW] default=CURRENT_TIMESTAMP — Data/hora de criação do registro. | observacoes TEXT NULL [NEW] — Observações adicionais do requerente."
```

---

## Formato: persistenceModel.entities[].relationships (string rica pipe-separated)

### Estrutura
```
"TYPE → targetTable (foreignKey → targetPK) onDelete=ACTION onUpdate=ACTION — descrição | TYPE2 ..."
```

### Componentes (cada relacionamento separado por `|`)
- **TYPE**: `MANY_TO_ONE`, `ONE_TO_MANY`, `ONE_TO_ONE`, `MANY_TO_MANY`
- **targetTable**: tabela de destino
- **foreignKey → targetPK**: FK local → PK remota
- **onDelete/onUpdate**: `CASCADE`, `RESTRICT`, `SET NULL`, `NO ACTION`
- **descrição**: explicação do relacionamento

### Exemplo completo
```
"MANY_TO_ONE → TB_CLIENTE (cliente_id → id) onDelete=RESTRICT onUpdate=CASCADE — Cada pedido pertence a um único cliente | ONE_TO_MANY → TB_ITEM_PEDIDO (pedido_id → id) onDelete=CASCADE — Pedido possui múltiplos itens"
```

---

## Formato: persistenceModel.entities[].indexes (string rica pipe-separated)

### Estrutura
```
"nome [UNIQUE] TYPE(col1, col2, ...) — purpose. Performance notes. | nome2 ..."
```

### Componentes (cada índice separado por `|`)
- **nome**: nome do índice
- **[UNIQUE]**: opcional, se o índice é único
- **TYPE**: `BTREE`, `HASH`, `GIN`, `GIST`
- **(colunas)**: lista de colunas (com ASC/DESC se aplicável)
- **purpose**: propósito e notas de performance

### Exemplo completo
```
"IDX_PEDIDO_CLIENTE BTREE(cliente_id, status) — Listar pedidos por cliente e status. Performance: query < 10ms. | IDX_PEDIDO_DATA_CRIACAO BTREE(data_criacao DESC) — Ordenação por data mais recente."
```

---

## Formato: persistenceModel.entities[].uniqueConstraints (string rica pipe-separated)

### Estrutura
```
"nome (col1, col2, ...) [WHERE condition] — descrição. Notas técnicas. | nome2 ..."
```

### Componentes (cada constraint separada por `|`)
- **nome**: nome da constraint
- **(colunas)**: lista de colunas
- **[WHERE condition]**: condição parcial (suporte depende do RDBMS do projeto)
- **descrição**: propósito e notas de implementação

### Exemplo completo
```
"UK_PEDIDO_IDEMPOTENCY (idempotency_key) WHERE status != 'CANCELADO' — Garante idempotência apenas para pedidos ativos. Constraint parcial."
```

---

## Formato: persistenceModel.entities[].checkConstraints (string rica pipe-separated)

### Estrutura
```
"nome: expressão | nome2: expressão2"
```

### Componentes (cada constraint separada por `|`)
- **nome**: nome da constraint
- **expressão**: condição SQL

### Exemplo completo
```
"CK_PEDIDO_STATUS: status IN ('PENDENTE', 'PAGO', 'CANCELADO') | CK_PEDIDO_VALOR: valor_total > 0 | CK_PEDIDO_EXPIRACAO: data_expiracao > data_criacao"
```

---

## Quando usar compact-prose vs objetos

### Use compact-prose para:
- Schemas de API (request/response)
- Modelo de dados (colunas, índices, relacionamentos)
- Qualquer estrutura onde o **formato é previsível** e a redução de tokens é importante

### Use objetos para:
- `agentExecutionContext` (contexto complexo e narrativo)
- `businessRules[]` (algoritmos e mensagens de erro variam muito)
- `acceptanceScenarios[]` (testData pode ter estruturas arbitrárias)
- `implementationGuidance` (orientações técnicas narrativas)

---

## Conversão de api-contracts.yaml → compact-prose

### Entrada (YAML)
```yaml
/pedidos:
  post:
    operationId: criarPedido
    security:
      - bearerAuth: [CLIENTE, ADMIN]
    requestBody:
      content:
        application/json:
          schema:
            properties:
              enderecoEntregaId:
                type: integer
                description: ID do endereço
    responses:
      201:
        description: Criado
        content:
          application/json:
            schema:
              properties:
                id: { type: integer }
```

### Saída (compact-prose)
```json
{
  "operationId": "criarPedido",
  "method": "POST",
  "path": "/pedidos",
  "auth": "Bearer JWT — roles: CLIENTE, ADMIN",
  "request": "Body: enderecoEntregaId (integer required — ID do endereço)",
  "responses": "201 application/json — Criado. schema: { id: integer }",
  "policies": "Rate: TOKEN_BUCKET limit/CPF: 100 req/min. Idempotency: required."
}
```

---

## Conversão de data-model.json → compact-prose

### Entrada (JSON)
```json
{
  "tableName": "TB_PEDIDO",
  "columns": [
    {
      "name": "id",
      "type": "BIGINT",
      "constraints": ["PK", "NOT NULL"],
      "operationType": "NEW",
      "description": "Chave primária gerada por sequence"
    }
  ]
}
```

### Saída (compact-prose)
```json
{
  "table": "TB_PEDIDO",
  "columns": "id BIGINT PK NOT NULL [NEW] — Chave primária gerada por sequence."
}
```

---

## Exemplos completos

Ver arquivos:
- `tasks.example-completo.json` — task completa no formato v5.3 compact-prose
- `tasks.schema-atual.json` — schema JSON Schema completo

---

**Regra de ouro:** O formato compact-prose NÃO perde informação — é apenas uma **serialização diferente**. Um parser pode reconstruir o objeto completo a partir da string rica.
