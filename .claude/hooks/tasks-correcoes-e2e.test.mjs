// Harness Elo v2 — correções da spec-tasks e da spec-security-review achadas pelo teste ponta a ponta
// (relatório e2e, seção 2). Cada bloco reproduz o defeito como o teste ponta a ponta o viu e prende a
// correção:
//
//   D33 — a frase que a skill manda gravar em `coverageNote` passa no NO_EXTERNAL_REFS_IN_TASKS (e citar
//         o nome do arquivo continua FATAL: o gate não foi afrouxado);
//   D29 — os gates de presença reconhecem a rota e a tabela que EXISTEM no contrato e no modelo do
//         projeto, sem prefixo `/vN` nem `tb_`; nome de domínio em prosa e rota de tela não disparam;
//   D30 — o conversor de contrato converte o stub da spec-api-contracts e o contrato com `$ref` e estilo
//         flow; `security` global vale como auth; 5xx ausente é aviso, não FATAL;
//   D31 — o body do cenário só é exigido quando a operação tem requestBody;
//   D34 — story só de spikes é SPIKE (isenções de linguagem, procedência e consumidor); os gates
//         estruturais de references/tipos-operacionais.md continuam;
//   D39 — `mustImplementFirst` é o critério 0 do order-backlog, a task SEC abre a story, e rodar o
//         order-backlog depois do inject-sec não desfaz a ordem dele;
//   D52 — o critério de aceite derivado do BDD do template da spec-product não sai com «ao o vendedor».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS = join(RAIZ, '.claude', 'skills');
const TASKS = join(SKILLS, 'spec-tasks');
const SCRIPTS = join(TASKS, 'scripts');
const TPL = join(TASKS, 'templates');
const AUTO = join(SCRIPTS, 'validate-tasks-selfsufficiency.mjs');
const NEGOCIO = join(SCRIPTS, 'validate-tasks-business.mjs');
const modulo = (...p) => import(pathToFileURL(join(...p)).href);
const lib = (nome) => modulo(SCRIPTS, 'lib', nome);
const texto = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const exemplo = (arq) => JSON.parse(readFileSync(join(TPL, arq), 'utf8'));

/** Pasta temporária com os arquivos dados; o chamador apaga. */
function pasta(arquivos = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'tasks-e2e-'));
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    writeFileSync(join(dir, nome), typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 2));
  }
  return dir;
}

/** Roda um validador da spec-tasks sobre `<dir>/tasks.json` e devolve a saída JSON. */
function validar(script, dir) {
  const r = spawnSync(process.execPath, [script, join(dir, 'tasks.json'), '--max', '2000'], { encoding: 'utf8' });
  let out = null;
  try { out = JSON.parse(r.stdout); } catch { /* exit 2 não emite JSON */ }
  return { status: r.status, out, err: r.stderr };
}
const erros = (out, code, scope) => (out?.errors ?? []).filter((e) => e.code === code && (!scope || e.scope === scope));
const avisos = (out, code, scope) => (out?.warnings ?? []).filter((e) => e.code === code && (!scope || e.scope === scope));
const todos = (out, scope) => (out?.errors ?? []).filter((e) => e.scope === scope).map((e) => `${e.code} ${e.field}`);

// ————————————————————————— contrato e modelo de um projeto sem prefixo —————————————————————————
//
// Como o projeto do teste ponta a ponta: versão em `servers[].url`, rotas `/pedidos…`, tabelas
// `clientes`/`pedidos`, e o estilo que a spec-api-contracts escreve — `$ref` para schema e para
// response, parâmetro em linha (`- { name: …, in: … }`), parâmetro no nível do path, `security` global.

const CONTRATO = `openapi: "3.0.3"
info:
  title: "API de pedidos (teste)"
  version: "1.0.0"
servers:
  - url: "http://localhost:3000/v1"
    description: "Desenvolvimento"
security:
  - SessionCookie: []
components:
  securitySchemes:
    SessionCookie:
      type: apiKey
      in: cookie
      name: session
  responses:
    BadRequest:
      description: "Entrada inválida: campo ausente ou fora do limite"
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
    NotFound:
      description: "Pedido não encontrado"
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
  schemas:
    Problem:
      type: object
      properties:
        title: { type: string, description: "Resumo do erro" }
    ItemPedidoRequest:
      type: object
      required: [produto, quantidade]
      properties:
        produto: { type: string, minLength: 1, description: "Nome do produto" }
        quantidade: { type: integer, minimum: 1, description: "Quantidade pedida" }
    PedidoRascunhoRequest:
      type: object
      required: [clienteId, itens]
      properties:
        clienteId: { type: string, format: uuid, description: "Cliente do pedido" }
        itens:
          type: array
          minItems: 1
          items: { $ref: "#/components/schemas/ItemPedidoRequest" }
    PedidoResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        situacao: { type: string, enum: [RASCUNHO, ENVIADO, APROVADO, RECUSADO] }
paths:
  /pedidos:
    post:
      operationId: criarPedido
      summary: "Registrar pedido em rascunho"
      tags: [Pedidos]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/PedidoRascunhoRequest" }
            example: { clienteId: "5b7b7d1e-0c5a-4e3b-a7a6-2f7c0d2a1111", itens: [{ produto: "Papel A4 (resma)", quantidade: 100 }] }
      responses:
        "201":
          description: "Pedido criado como rascunho"
          content:
            application/json:
              schema: { $ref: "#/components/schemas/PedidoResponse" }
        "400": { $ref: "#/components/responses/BadRequest" }
    get:
      operationId: listarPedidos
      summary: "Listar pedidos"
      parameters:
        - { name: "filter[situacao]", in: query, required: false, schema: { type: string } }
        - { name: cursor, in: query, required: false, schema: { type: string } }
      responses:
        "200":
          description: "Página de pedidos"
        "400": { $ref: "#/components/responses/BadRequest" }
  /pedidos/{pedidoId}/envio:
    parameters:
      - { name: pedidoId, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: enviarPedido
      summary: "Enviar rascunho com conferência de crédito"
      description: "Confere o crédito disponível do cliente e muda a situação para enviado."
      responses:
        "200":
          description: "Pedido enviado"
        "404": { $ref: "#/components/responses/NotFound" }
        "409":
          description: "O pedido não é rascunho"
`;

const coluna = (name, type, notes) => ({ name, type, nullable: false, notes });
const MODELO = {
  boundedContexts: [{
    id: 'BC-001', name: 'Pedidos', entities: [
      { name: 'Cliente', tableName: 'clientes', purpose: 'Cliente pessoa jurídica com limite de crédito', primaryKey: ['id'],
        columns: [coluna('id', 'UUID', 'Identificador do cliente'), coluna('limite_credito_centavos', 'BIGINT', 'Limite de crédito em centavos')] },
      { name: 'Pedido', tableName: 'pedidos', purpose: 'Pedido de venda', primaryKey: ['id'],
        columns: [coluna('id', 'UUID', 'Identificador do pedido'), coluna('situacao', 'VARCHAR(20)', 'RASCUNHO, ENVIADO, APROVADO ou RECUSADO')] },
      { name: 'ItemPedido', tableName: 'itens_pedido', purpose: 'Item do pedido', primaryKey: ['id'],
        columns: [coluna('id', 'UUID', 'Identificador do item')] },
    ],
  }],
};

const tarefa = (id, over = {}) => ({ id, storyId: 'STORY-001', title: id, type: 'backend', class: 'functional', ...over });
const backlog = (tasks) => ({ metadata: { schemaVersion: 'tasks/v5.3' }, stories: [{ id: 'STORY-001', name: 'Pedido', tasks }] });

// ————————————————————————————————————————— D33 —————————————————————————————————————————

/**
 * Toda frase de `coverageNote` que as skills ensinam: a spec-tasks (SKILL.md, schema e mensagem do
 * validador de negócio) e a spec-test-plan, que descreve o mesmo campo do lado de quem gera os TC.
 */
function frasesDeCoverageNote() {
  const skill = texto(join(TASKS, 'SKILL.md')) + texto(join(TASKS, '..', 'spec-test-plan', 'SKILL.md'));
  const schema = JSON.parse(readFileSync(join(TPL, 'tasks.schema-atual.json'), 'utf8'));
  const negocio = texto(join(SCRIPTS, 'validate-tasks-business.mjs'));
  const desc = schema.definitions.AcceptanceScenario?.properties?.coverageNote?.description ?? '';
  return [
    ...[...skill.matchAll(/"coverageNote":\s*"([^"]+)"/g)].map((m) => m[1]),
    ...[...desc.matchAll(/'(Cobre [^']+)'/g)].map((m) => m[1]),
    ...[...negocio.matchAll(/coverageNote "([^"\n]+)"/g)].map((m) => m[1]),
  ].map((f) => f.replace(/\s+/g, ' ').trim().replace(/TC-N{3}/, 'TC-001'));
}

test('D33 — a frase que a skill manda gravar em coverageNote não é reprovada pelo NO_EXTERNAL_REFS_IN_TASKS', () => {
  const frases = frasesDeCoverageNote();
  assert.ok(frases.length >= 4, `premissa: a skill ensina a frase em ≥4 lugares — achei ${frases.length}: ${frases.join(' / ')}`);
  for (const frase of frases) {
    assert.match(frase, /^Cobre TC-\d{3} do [^"]{3,40}$/, `frase mal capturada: «${frase}»`);
    const doc = exemplo('tasks.hierarchy-example.json');
    doc.stories[0].tasks[0].acceptanceScenarios[0].coverageNote = frase;
    const dir = pasta({ 'tasks.json': doc });
    try {
      const r = validar(AUTO, dir);
      assert.deepEqual(erros(r.out, 'NO_EXTERNAL_REFS_IN_TASKS').map((e) => `${e.field}: ${e.message}`), [], `frase «${frase}»`);
      assert.equal(r.status, 0, `frase «${frase}»: ${todos(r.out, 'TASK-001-001').join('; ')}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('D33 — controle: o nome do arquivo em coverageNote continua FATAL (o gate não foi afrouxado)', () => {
  const doc = exemplo('tasks.hierarchy-example.json');
  doc.stories[0].tasks[0].acceptanceScenarios[0].coverageNote = 'Cobre TC-001 do test-plan.md';
  const dir = pasta({ 'tasks.json': doc });
  try {
    const r = validar(AUTO, dir);
    assert.equal(r.status, 1);
    assert.equal(erros(r.out, 'NO_EXTERNAL_REFS_IN_TASKS', 'TASK-001-001').filter((e) => e.field === 'coverageNote').length, 1);
    // A tabela da allowlist e o script continuam sem `coverageNote`.
    assert.doesNotMatch(texto(join(TASKS, 'references', 'validators.md')).match(/\*\*Allowlist[\s\S]*?\n\n/)[0], /coverageNote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————————————————————— D29 —————————————————————————————————————————

const TASK_CITA = () => tarefa('TASK-CITA', {
  description: 'Envia o rascunho: POST /pedidos/{pedidoId}/envio confere o crédito lendo clientes.limite_credito_centavos e grava a nova situação na tabela pedidos.',
});
const TASK_PROSA = () => tarefa('TASK-PROSA', {
  description: 'O vendedor lista os pedidos dos clientes e vê, na tela /pedidos, a situação de cada pedido e o crédito de cada cliente.',
});
const TASK_TELA = () => tarefa('TASK-TELA', {
  type: 'frontend',
  description: 'Tela de novo pedido.',
  uiContext: { tela: 'novo-pedido', rota: '/pedidos/novo', fields: [{ name: 'cliente', type: 'text', label: 'Cliente' }] },
});
const TASK_ITENS = () => tarefa('TASK-ITENS', { description: 'Cada item do rascunho vira uma linha em itens_pedido.' });

test('D29 — rota e tabela do contrato e do modelo do projeto disparam os gates de presença, sem /vN nem tb_', () => {
  const dir = pasta({ 'tasks.json': backlog([TASK_CITA(), TASK_PROSA(), TASK_TELA(), TASK_ITENS()]), 'api-contracts.yaml': CONTRATO, 'data-model.json': MODELO });
  try {
    const r = validar(AUTO, dir);
    assert.ok(r.out, r.err);
    const api = erros(r.out, 'TASK_MISSING_API_CONTRACT', 'TASK-CITA');
    assert.equal(api.length, 1, todos(r.out, 'TASK-CITA').join('\n'));
    assert.match(api[0].message, /\/pedidos\/\{pedidoId\}\/envio/);
    const dados = erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', 'TASK-CITA');
    assert.equal(dados.length, 1, todos(r.out, 'TASK-CITA').join('\n'));
    assert.equal(erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', 'TASK-ITENS').length, 1, 'nome com «_» é citação por si');
    // Controles: nome de domínio em prosa e rota de TELA não são citação de contrato.
    for (const t of ['TASK-PROSA', 'TASK-TELA']) {
      assert.deepEqual([...erros(r.out, 'TASK_MISSING_API_CONTRACT', t), ...erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', t)], [], t);
    }
    assert.equal(erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', 'TASK-PROSA').length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D29 — sem os arquivos do projeto, só o naming fixo vale (o gatilho vem do contrato, não de adivinhação)', () => {
  const dir = pasta({ 'tasks.json': backlog([TASK_CITA()]) });
  try {
    const r = validar(AUTO, dir);
    assert.deepEqual([...erros(r.out, 'TASK_MISSING_API_CONTRACT'), ...erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL')], []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D29 — task SEC que cita rota e tabela do projeto sai com aviso, não FATAL: o inject-sec não embute contrato e recusaria a injeção', () => {
  const secCita = (id, over = {}) => tarefa(id, { class: 'security', generatedBy: 'spec-security-review', ...TASK_CITA(), id, title: id, class: 'security', ...over });
  const dir = pasta({
    'tasks.json': backlog([secCita('SEC-007'), secCita('SEC-008', { description: 'Limitar a taxa de POST /v1/pedidos e auditar a gravação em tb_pedidos.' })]),
    'api-contracts.yaml': CONTRATO,
    'data-model.json': MODELO,
  });
  try {
    const r = validar(AUTO, dir);
    assert.ok(r.out, r.err);
    // Gatilho do projeto numa task SEC: aviso nos dois gates.
    assert.deepEqual([...erros(r.out, 'TASK_MISSING_API_CONTRACT', 'SEC-007'), ...erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', 'SEC-007')], [], todos(r.out, 'SEC-007').join('\n'));
    assert.equal(avisos(r.out, 'TASK_MISSING_API_CONTRACT', 'SEC-007').length, 1);
    assert.equal(avisos(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', 'SEC-007').length, 1);
    // Controle: o naming fixo (`/vN/…`, `tb_…`) continua FATAL também na task SEC, como antes do D29.
    assert.equal(erros(r.out, 'TASK_MISSING_API_CONTRACT', 'SEC-008').length, 1, todos(r.out, 'SEC-008').join('\n'));
    assert.equal(erros(r.out, 'TASK_MISSING_PERSISTENCE_MODEL', 'SEC-008').length, 1, todos(r.out, 'SEC-008').join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D29 — o enriquecimento embute o contrato e as entidades citadas, e a task sai limpa nos gates de contrato', async () => {
  const { loadTechnicalSources, enrichTaskContracts } = await lib('technical-contracts.mjs');
  const dir = pasta({ 'api-contracts.yaml': CONTRATO, 'data-model.json': MODELO });
  try {
    const doc = backlog([TASK_CITA()]);
    const gaps = [];
    const r = enrichTaskContracts(doc, { tech: loadTechnicalSources(dir), gaps });
    const t = doc.stories[0].tasks[0];
    assert.equal(r.filledApi, 1, JSON.stringify(gaps));
    assert.deepEqual(t.apiContracts.map((c) => c.signature), ['POST /pedidos/{pedidoId}/envio']);
    assert.deepEqual(t.persistenceModel.entities.map((e) => e.table).sort(), ['clientes', 'pedidos']);
    assert.deepEqual(gaps, []);
    writeFileSync(join(dir, 'tasks.json'), JSON.stringify(doc));
    const v = validar(AUTO, dir);
    for (const code of ['TASK_MISSING_API_CONTRACT', 'TASK_MISSING_PERSISTENCE_MODEL', 'TASK_HAS_COMPLETE_API_SCHEMAS', 'TASK_HAS_COMPLETE_DATA_MODEL']) {
      assert.deepEqual(erros(v.out, code, 'TASK-CITA'), [], code);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————————————————————— D30 —————————————————————————————————————————

test('D30 — o conversor converte o stub da própria spec-api-contracts: $ref resolvido e security global como auth', async () => {
  const { loadTechnicalSources, operationToCompactProse } = await lib('technical-contracts.mjs');
  const stub = readFileSync(join(SKILLS, 'spec-api-contracts', 'templates', 'openapi.stub.yaml'), 'utf8');
  const dir = pasta({ 'api-contracts.yaml': stub });
  try {
    const ops = loadTechnicalSources(dir).operations;
    const op = (path, method) => ops.get(path).find((o) => o.method === method);
    // Chamado direto, sem opts — como o teste ponta a ponta chamou: o documento basta.
    const criar = operationToCompactProse(op('/recursos-exemplo', 'POST'));
    assert.deepEqual(criar.missing, []);
    assert.match(criar.contract.auth, /BearerAuth/);
    assert.match(criar.contract.request, /Body: nome \(string[^)]*\)/, 'o body vem do $ref RecursoExemploRequest');
    assert.match(criar.contract.request, /Headers: Idempotency-Key/);
    assert.deepEqual(criar.contract.responses.split(' | ').map((s) => s.slice(0, 3)), ['201', '400', '409', '422']);
    const obter = operationToCompactProse(op('/recursos-exemplo/{id}', 'GET'));
    assert.deepEqual(obter.missing, []);
    assert.match(obter.contract.request, /Path: id/);
    // A lista do stub só declara 200: falta 4xx, e isso continua lacuna — mas não falta auth nem 5xx.
    const listar = operationToCompactProse(op('/recursos-exemplo', 'GET'));
    assert.equal(listar.contract, null);
    assert.ok(listar.missing.some((m) => /4xx/.test(m)), listar.missing.join('; '));
    assert.ok(!listar.missing.some((m) => /5xx|auth/.test(m)), listar.missing.join('; '));
    assert.match(operationToCompactProse(op('/recursos-exemplo', 'GET'), { globalSecurity: null }).missing.join(';'), /4xx/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D30 — contrato em estilo flow: response por $ref, parâmetro em linha e no nível do path, items por $ref', async () => {
  const { loadTechnicalSources, operationToCompactProse } = await lib('technical-contracts.mjs');
  const dir = pasta({ 'api-contracts.yaml': CONTRATO });
  try {
    const ops = loadTechnicalSources(dir).operations;
    const criar = operationToCompactProse(ops.get('/pedidos').find((o) => o.method === 'POST'));
    assert.deepEqual(criar.missing, []);
    assert.match(criar.contract.auth, /SessionCookie/);
    assert.match(criar.contract.request, /Body: clienteId \(string[^)]*\)[^|]*; itens \(array/);
    assert.match(criar.contract.responses, /400[^|]*Entrada inválida/, 'a descrição vem de #/components/responses/BadRequest');
    const listar = operationToCompactProse(ops.get('/pedidos').find((o) => o.method === 'GET'));
    assert.match(listar.contract.request, /Query: filter\[situacao\] \(string\); cursor \(string\)/);
    assert.doesNotMatch(listar.contract.request, /Headers:/, 'parâmetro de query não é header');
    const enviar = operationToCompactProse(ops.get('/pedidos/{pedidoId}/envio')[0]);
    assert.deepEqual(enviar.missing, []);
    assert.match(enviar.contract.request, /^Path: pedidoId/);
    assert.doesNotMatch(enviar.contract.request, /Body:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D30 — no gate de qualidade, operação sem 5xx é aviso; sem 4xx continua FATAL', () => {
  const contrato = (responses) => [{ operationId: 'enviarPedido', method: 'POST', path: '/pedidos/{pedidoId}/envio', signature: 'POST /pedidos/{pedidoId}/envio',
    auth: 'Sessão por cookie', request: 'Path: pedidoId (uuid)', responses }];
  const dir = pasta({ 'tasks.json': backlog([
    tarefa('TASK-SEM-5XX', { apiContracts: contrato('200 — Pedido enviado | 409 — O pedido não é rascunho') }),
    tarefa('TASK-SEM-4XX', { apiContracts: contrato('200 — Pedido enviado | 500 — Erro interno') }),
  ]) });
  try {
    const r = validar(AUTO, dir);
    assert.deepEqual(erros(r.out, 'TASK_HAS_COMPLETE_API_SCHEMAS', 'TASK-SEM-5XX'), []);
    assert.equal(avisos(r.out, 'TASK_HAS_COMPLETE_API_SCHEMAS', 'TASK-SEM-5XX').filter((w) => /5xx/.test(w.message)).length, 1);
    assert.equal(erros(r.out, 'TASK_HAS_COMPLETE_API_SCHEMAS', 'TASK-SEM-4XX').filter((e) => /4xx/.test(e.message)).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————————————————————— D31 —————————————————————————————————————————

const UUID = '0b0b6a9e-1f0a-4c1e-9d3c-7a5e0e7c2222';
const cenario = (id, req, over = {}) => ({
  id, category: 'HAPPY_PATH', title: id, given: 'um rascunho com dois itens de um cliente com crédito', when: 'o vendedor envia o rascunho para aprovação',
  then: ['o pedido fica enviado'],
  testData: { request: { headers: { Cookie: 'session=abc' }, ...req }, expectedResponse: { statusCode: 200, body: { situacao: 'ENVIADO' } }, expectedDatabaseState: { pedidos: 'situacao ENVIADO' } },
  ...over,
});
const corpoAusente = (out, scope) => erros(out, 'TASK_HAS_CONCRETE_TEST_DATA', scope).filter((e) => e.field.endsWith('testData.request.body'));

test('D31 — transição de estado sem requestBody não exige body; operação com body continua exigindo', () => {
  const envio = [{ operationId: 'enviarPedido', method: 'POST', path: '/pedidos/{pedidoId}/envio', signature: 'POST /pedidos/{pedidoId}/envio',
    auth: 'Sessão por cookie', request: 'Path: pedidoId (uuid)', responses: '200 — enviado | 409 — não é rascunho' }];
  const criar = [{ operationId: 'criarPedido', method: 'POST', path: '/pedidos', signature: 'POST /pedidos',
    auth: 'Sessão por cookie', request: 'Body: clienteId (uuid); itens (array)', responses: '201 — criado | 400 — inválido' }];
  const dir = pasta({ 'tasks.json': backlog([
    tarefa('TASK-ENVIO', { apiContracts: envio, acceptanceScenarios: [cenario('AS-ENVIO', { method: 'POST', path: `/pedidos/${UUID}/envio` })] }),
    tarefa('TASK-ENVIO-V1', { apiContracts: envio, acceptanceScenarios: [cenario('AS-ENVIO-V1', { method: 'POST', path: `/v1/pedidos/${UUID}/envio` })] }),
    tarefa('TASK-CRIAR', { apiContracts: criar, acceptanceScenarios: [
      cenario('AS-CRIAR-SEM-BODY', { method: 'POST', path: '/pedidos' }),
      cenario('AS-CRIAR-VAZIO', { method: 'POST', path: '/pedidos', body: {} }, { category: 'INVALID_INPUT' }),
      cenario('AS-CRIAR-VAZIO-FELIZ', { method: 'POST', path: '/pedidos', body: {} }),
    ] }),
  ]) });
  try {
    const r = validar(AUTO, dir);
    assert.deepEqual(corpoAusente(r.out, 'TASK-ENVIO'), []);
    assert.deepEqual(corpoAusente(r.out, 'TASK-ENVIO-V1'), [], 'o prefixo de versão no path do cenário não atrapalha');
    assert.deepEqual(corpoAusente(r.out, 'TASK-CRIAR').map((e) => e.field), ['acceptanceScenarios[0].testData.request.body', 'acceptanceScenarios[2].testData.request.body'],
      'body ausente na operação com body é FATAL; corpo vazio DECLARADO só vale no cenário de entrada inválida');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D31 — sem contrato na task, vale o api-contracts.yaml do projeto; sem contrato nenhum, a regra antiga (POST pede body)', () => {
  const t = () => tarefa('TASK-SO-CENARIO', { acceptanceScenarios: [cenario('AS-1', { method: 'POST', path: `/pedidos/${UUID}/envio` })] });
  const comContrato = pasta({ 'tasks.json': backlog([t()]), 'api-contracts.yaml': CONTRATO });
  const semContrato = pasta({ 'tasks.json': backlog([t()]) });
  try {
    assert.deepEqual(corpoAusente(validar(AUTO, comContrato).out, 'TASK-SO-CENARIO'), []);
    assert.equal(corpoAusente(validar(AUTO, semContrato).out, 'TASK-SO-CENARIO').length, 1);
  } finally {
    rmSync(comContrato, { recursive: true, force: true });
    rmSync(semContrato, { recursive: true, force: true });
  }
});

// ————————————————————————————————————————— D34 —————————————————————————————————————————

function storySpike(over = {}) {
  const spike = { ...exemplo('tasks.spike-task-example.json'), storyId: 'STORY-007' };
  delete spike._comment;
  return {
    id: 'STORY-007',
    name: 'Decisões em aberto de crédito e de acesso',
    type: 'SPIKE', // como o teste ponta a ponta gerou: sem workItemType, só tasks class=spike
    narrative: {
      elevatorPitch: 'Fechar com o cliente as duas dúvidas que travam o crédito e o acesso ao portal, para que a regra de crédito e a entrada no sistema sejam construídas sobre decisões.',
      context: 'Duas lacunas seguem abertas: quando o crédito do cliente é conferido e como o pedido aprovado passa a pago, e como o usuário entra no sistema. Sem essas respostas a regra de crédito fica incompleta e o acesso por papel não tem como ser desenhado.',
    },
    businessRules: [{ id: 'RN-NOVO-CREDITO-001', title: 'Crédito disponível', description: 'O crédito disponível é o limite menos os pedidos aprovados e não pagos; a investigação decide quais pedidos entram na soma.' }],
    acceptanceCriteria: [{ id: 'AC-STORY-007-01', statement: 'O cliente decide por escrito quando o crédito é conferido.' }],
    tasks: [spike],
    ...over,
  };
}

test('D34 — story só de spikes é SPIKE: sai sem FATAL de procedência, consumidor, user story nem escopo de entrega', () => {
  const dir = pasta({ 'tasks.json': { metadata: { schemaVersion: 'tasks/v5.3' }, stories: [storySpike()] } });
  try {
    const r = validar(NEGOCIO, dir);
    assert.deepEqual(todos(r.out, 'STORY-007'), []);
    assert.equal(r.status, 0, r.err);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D34 — controle: os gates estruturais de tipos-operacionais.md continuam valendo para o SPIKE', () => {
  const dir = pasta({ 'tasks.json': { metadata: { schemaVersion: 'tasks/v5.3' }, stories: [storySpike({ narrative: {}, businessRules: [], acceptanceCriteria: [] })] } });
  try {
    const r = validar(NEGOCIO, dir);
    assert.deepEqual(todos(r.out, 'STORY-007').map((x) => x.split(' ')[0]).sort(),
      ['HAS_ACCEPTANCE_CRITERIA', 'HAS_BUSINESS_RULES', 'NARRATIVE_CONTEXT', 'NARRATIVE_ELEVATOR_PITCH']);
    assert.match(texto(join(TASKS, 'references', 'tipos-operacionais.md')), /tasks são todas `class=spike`\s+é tratada como `SPIKE`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————————————————————— D39 —————————————————————————————————————————

const ORDEM = join(SCRIPTS, 'order-backlog.mjs');
const INJECT = join(SKILLS, 'spec-security-review', 'scripts', 'inject-sec.mjs');
const SEC = exemplo('tasks.sec-task-example.json');
const sec = (id, storyId, over = {}) => { const t = { ...structuredClone(SEC), id, storyId, ...over }; delete t._comment; return t; };
const ordemDe = (doc) => Object.fromEntries([...doc.stories, ...doc.stories.flatMap((s) => s.tasks)].map((x) => [x.id, x.executionOrder]));

function backlogComTransversal() {
  return {
    metadata: { schemaVersion: 'tasks/v5.3' },
    epics: [{ id: 'EPIC-001', name: 'Clientes' }, { id: 'EPIC-002', name: 'Pedidos' }],
    stories: [
      { id: 'STORY-001', epicId: 'EPIC-001', priority: 'HIGH', tasks: [tarefa('TASK-001-001', { storyId: 'STORY-001' })] },
      { id: 'STORY-002', epicId: 'EPIC-001', tasks: [tarefa('TASK-002-001', { storyId: 'STORY-002', dependencies: ['TASK-001-001'] })] },
      { id: 'STORY-003', epicId: 'EPIC-002', tasks: [tarefa('TASK-003-001', { storyId: 'STORY-003' })] },
      { id: 'STORY-SEC-TRANSVERSAL', epicId: 'EPIC-002', priority: 'CRITICAL', mustImplementFirst: true, tasks: [sec('SEC-001', 'STORY-SEC-TRANSVERSAL')] },
    ],
  };
}

test('D39 — mustImplementFirst é o critério 0: a story transversal sai em 1º, mesmo morando na 2ª épica', async () => {
  const { ordenarBacklog } = await modulo(ORDEM);
  const r = ordenarBacklog(backlogComTransversal());
  assert.deepEqual(r.ordem.stories, ['STORY-SEC-TRANSVERSAL', 'STORY-001', 'STORY-002', 'STORY-003']);
  assert.equal(r.doc.stories.find((s) => s.id === 'STORY-SEC-TRANSVERSAL').executionOrder, 1);
  assert.equal(r.doc.stories[0].tasks[0].executionOrder, 1, 'as tasks dela abrem a numeração global');
  assert.deepEqual(r.ordem.epics, ['EPIC-001', 'EPIC-002'], 'a ordem das épicas não muda');
  assert.deepEqual(ordenarBacklog(r.doc).doc, r.doc, 'idempotente');
});

test('D39 — sem violar dependência explícita: o que a transversal exige vem antes dela, e só isso sobe junto', async () => {
  const { ordenarBacklog } = await modulo(ORDEM);
  const b = backlogComTransversal();
  b.stories.find((s) => s.id === 'STORY-SEC-TRANSVERSAL').dependencies = ['STORY-003'];
  assert.deepEqual(ordenarBacklog(b).ordem.stories, ['STORY-003', 'STORY-SEC-TRANSVERSAL', 'STORY-001', 'STORY-002']);
});

test('D39 — dentro da story, a task SEC vem antes da funcional (E.2), mesmo a funcional sendo de camada data', async () => {
  const { ordenarBacklog } = await modulo(ORDEM);
  const doc = { metadata: {}, stories: [{ id: 'S-1', tasks: [
    tarefa('T-DB', { storyId: 'S-1', type: 'database', persistenceModel: { entities: [{ table: 'pedidos' }] } }),
    sec('SEC-002', 'S-1'),
  ] }] };
  assert.deepEqual(ordenarBacklog(doc).ordem.tasks, ['SEC-002', 'T-DB']);
  // Dependência explícita da SEC sobre a funcional continua valendo.
  doc.stories[0].tasks[1].dependencies = ['T-DB'];
  assert.deepEqual(ordenarBacklog(doc).ordem.tasks, ['T-DB', 'SEC-002']);
});

test('D39 — rodar o order-backlog depois do inject-sec não desfaz a renumeração do inject-sec', async () => {
  const { ordenarBacklog } = await modulo(ORDEM);
  const { injetar } = await modulo(INJECT);
  const antes = ordenarBacklog({
    metadata: { schemaVersion: 'tasks/v5.3' },
    epics: [{ id: 'EPIC-001' }, { id: 'EPIC-002' }],
    stories: [
      { id: 'S-1', epicId: 'EPIC-001', name: 'Pedido', tasks: [
        tarefa('T-1A', { storyId: 'S-1', type: 'database', persistenceModel: { entities: [{ table: 'pedidos' }] } }), tarefa('T-1B', { storyId: 'S-1' })] },
      { id: 'S-2', epicId: 'EPIC-001', name: 'Tela', dependencies: ['S-1'], tasks: [tarefa('T-2A', { storyId: 'S-2', type: 'frontend' })] },
    ],
  }).doc;
  const transversal = { id: 'STORY-SEC-TRANSVERSAL', epicId: 'EPIC-002', name: 'Controles transversais', priority: 'CRITICAL', mustImplementFirst: true, tasks: [] };
  const r = injetar(antes, [sec('SEC-010', 'STORY-SEC-TRANSVERSAL'), sec('SEC-002', 'S-1')], { transversal, versaoSkill: '9.9' });
  assert.deepEqual(r.achados, []);
  assert.deepEqual(ordemDe(r.doc), { 'STORY-SEC-TRANSVERSAL': 1, 'S-1': 2, 'S-2': 3, 'SEC-010': 1, 'SEC-002': 2, 'T-1A': 3, 'T-1B': 4, 'T-2A': 5 }, 'premissa');
  const depois = ordenarBacklog(r.doc).doc;
  assert.deepEqual(ordemDe(depois), ordemDe(r.doc));
  assert.deepEqual(depois.stories.map((s) => s.id), r.doc.stories.map((s) => s.id));
});

test('D39 — o Passo E da spec-security-review termina rodando o order-backlog da spec-tasks', () => {
  const t = texto(join(SKILLS, 'spec-security-review', 'SKILL.md'));
  const passoE = t.slice(t.indexOf('## Passo E'), t.indexOf('### E.0-K'));
  const iInject = passoE.indexOf('scripts/inject-sec.mjs');
  const iOrdem = passoE.indexOf('spec-tasks/scripts/order-backlog.mjs --input outputs/spec/tasks.json');
  assert.ok(iInject > 0 && iOrdem > iInject, 'o order-backlog tem de vir depois do inject-sec, no Passo E');
  assert.match(passoE, /mustImplementFirst/);
});

// ————————————————————————————————————————— D52 —————————————————————————————————————————

/** Um RF no formato do template da spec-product, com o BDD dele preenchido. */
function requisitosNoFormatoDoTemplate() {
  const tpl = texto(join(SKILLS, 'spec-product', 'templates', 'requirements-functional.md'));
  const ini = tpl.indexOf('### RF-MOD-XXX-001');
  const fim = tpl.indexOf('\n---', tpl.indexOf('**Notas:**', ini));
  assert.ok(ini > 0 && fim > ini, 'premissa: o template tem o bloco do RF');
  const bloco = tpl.slice(ini, fim);
  assert.match(bloco, /```gherkin\nCenário 1: [^\n]*\n {2}Dado que\n {2}Quando\n {2}Então\n/, 'premissa: o BDD do template é Dado que / Quando / Então');
  const preenchido = bloco
    .replace('RF-MOD-XXX-001: [Título]', 'RF-MOD-PEDIDOS-001: Registrar pedido em rascunho')
    .replace('**Prioridade MoSCoW:**', '**Prioridade MoSCoW:** Must')
    .replace(/Cenário 1: \[Fluxo principal\]\n {2}Dado que\n {2}Quando\n {2}Então\n/,
      'Cenário 1: Pedido com dois itens\n  Dado que o vendedor abriu um rascunho para um cliente cadastrado\n' +
      '  Quando o vendedor lança 100 resmas de papel A4 a R$ 12,00 e salva o rascunho\n' +
      '  Então o sistema grava o pedido como rascunho com valor dos itens de R$ 1.200,00\n')
    .replace(/Cenário 2: \[Fluxo alternativo\]\n/,
      'Cenário 2: Gerente aprova\n  Dado um pedido enviado dentro do crédito do cliente\n' +
      '  Quando o gerente aprova o pedido\n  Então o sistema marca o pedido como aprovado e reduz o crédito disponível\n');
  return `# Requisitos\n\n## Módulo: Pedidos (\`MOD-PEDIDOS\`)\n\n${preenchido}\n`;
}

test('D52 — o critério de aceite derivado do BDD do template sai como oração: «quando o vendedor…», nunca «ao o vendedor…»', async () => {
  const { loadSourceDocs } = await lib('source-docs.mjs');
  const { enrichDocument } = await lib('business-enrichment.mjs');
  const dir = pasta({ 'requirements.md': requisitosNoFormatoDoTemplate() });
  try {
    const sources = loadSourceDocs(dir);
    assert.equal(sources.requirements.get('RF-MOD-PEDIDOS-001')?.scenarios?.length, 2, 'premissa: o leitor achou os dois cenários');
    const doc = enrichDocument({ metadata: {}, stories: [{ id: 'STORY-001', name: 'Registrar pedido', traceability: { requirementIds: ['RF-MOD-PEDIDOS-001'] }, tasks: [] }] }, { sources, report: {} });
    const frases = doc.stories[0].acceptanceCriteria.map((c) => c.statement);
    assert.equal(frases.length, 2, frases.join('\n'));
    for (const f of frases) assert.doesNotMatch(f, /\bao (o|a|os|as|um|uma)\b/i, f);
    assert.deepEqual(frases, [
      'Dado que o vendedor abriu um rascunho para um cliente cadastrado, quando o vendedor lança 100 resmas de papel A4 a R$ 12,00 e salva o rascunho, o sistema grava o pedido como rascunho com valor dos itens de R$ 1.200,00.',
      'Dado um pedido enviado dentro do crédito do cliente, quando o gerente aprova o pedido, o sistema marca o pedido como aprovado e reduz o crédito disponível.',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
