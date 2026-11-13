// Harness Elo v2 — check-contracts.mjs (plano de melhoria das skills, Onda 3, item 3.1).
//
// SUPPLEMENT_MATCHES_YAML e EVERY_OPERATION_TRACED são FATAL na spec-api-contracts e eram
// conferidos só pela IA que escreveu os dois arquivos. O script cruza contrato × suplemento sem
// dependência; aqui: caso bom, caso ruim (cada furo nomeado), bordas do extrator de YAML
// (`operationId` de `links:`, operação REMOVED do modo _change, path com aspas, comentário) e o
// exit 2 de entrada não aplicável. E o SKILL.md chama o script como WARNING (P4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(RAIZ, '.claude', 'skills', 'tools', 'check-contracts.mjs');
const mod = () => import(pathToFileURL(SCRIPT).href);

const YAML = `openapi: 3.1.0
info:
  title: Pedidos
paths:
  # comentário no meio do bloco
  /pedidos:
    parameters:
      - name: tenant
        in: header
    get:
      operationId: listarPedidos
      responses:
        '200':
          description: ok
          links:
            detalhe:
              operationId: obterPedido   # referência — não é operação nova
    post:
      operationId: "criarPedido"
      requestBody:
        content:
          application/json:
            schema:
              properties:
                get:
                  type: string
  "/pedidos/{id}":
    get:
      operationId: obterPedido
    delete:
      x-operation-type: REMOVED
      operationId: cancelarPedido
components:
  schemas:
    Pedido:
      type: object
`;

const sup = (ops) => JSON.stringify({ schemaVersion: 'api-contracts/v1', operations: ops });
const op = (operationId, linkedRequirements = ['RF-MOD-PED-001']) => ({ operationId, linkedRequirements });

test('3.1 — o extrator de YAML acha as operações certas e ignora o operationId de links', async () => {
  const { operacoesDoYaml } = await mod();
  assert.deepEqual(operacoesDoYaml(YAML).map((o) => `${o.metodo} ${o.path} ${o.operationId}${o.removida ? ' REMOVED' : ''}`), [
    'GET /pedidos listarPedidos',
    'POST /pedidos criarPedido',
    'GET /pedidos/{id} obterPedido',
    'DELETE /pedidos/{id} cancelarPedido REMOVED',
  ]);
});

function rodar(contrato, suplemento, ext = 'yaml') {
  const dir = mkdtempSync(join(tmpdir(), 'check-contracts-'));
  try {
    const c = join(dir, `api-contracts.${ext}`);
    const s = join(dir, 'api-contracts-supplement.json');
    writeFileSync(c, contrato);
    writeFileSync(s, suplemento);
    const r = spawnSync(process.execPath, [SCRIPT, c, s, '--json'], { encoding: 'utf8' });
    return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('3.1 — caso bom: contrato e suplemento batem (a operação REMOVED dispensa entrada)', () => {
  const r = rodar(YAML, sup([op('listarPedidos'), op('criarPedido'), op('obterPedido')]));
  assert.equal(r.status, 0, JSON.stringify(r.out));
  assert.deepEqual(r.out.achados, []);
});

test('3.1 — caso ruim: cada furo vira um achado com o código do validator', () => {
  const r = rodar(YAML, sup([
    op('listarPedidos'), op('listarPedidos'),          // duplicado
    op('criarPedido', []),                              // sem rastreio
    op('fantasma'),                                     // só no suplemento
    { linkedRequirements: ['RF-X'] },                   // sem operationId
    op('obterPedido', ['RN-PED-002']),                  // RN no lugar de RF
  ]));
  assert.equal(r.status, 1);
  const m = r.out.achados.map((a) => `${a.code}: ${a.mensagem}`);
  assert.ok(m.includes('SUPPLEMENT_MATCHES_YAML: `listarPedidos` aparece mais de uma vez no suplemento'));
  assert.ok(m.includes('SUPPLEMENT_MATCHES_YAML: `fantasma` está no suplemento e não no contrato'));
  assert.ok(m.includes('SUPPLEMENT_MATCHES_YAML: entrada do suplemento sem `operationId`'));
  assert.ok(m.includes('EVERY_OPERATION_TRACED: `criarPedido` sem `linkedRequirements`'));
  assert.ok(m.includes('EVERY_OPERATION_TRACED: `obterPedido`: `linkedRequirements` com valor que não é RF (`RN-PED-002`)'));
});

test('3.1 — operação do contrato fora do suplemento, e operação sem operationId', () => {
  const yaml = YAML.replace('      operationId: obterPedido\n', '      summary: sem id\n');
  const r = rodar(yaml, sup([op('listarPedidos')]));
  assert.equal(r.status, 1);
  const m = r.out.achados.map((a) => a.mensagem);
  assert.ok(m.includes('`criarPedido` (POST /pedidos) está no contrato e não no suplemento'));
  assert.ok(m.includes('GET /pedidos/{id} sem `operationId` no contrato — não dá para cruzar com o suplemento'));
});

// Revisão do item 8: a SKILL manda a operação REMOVED ficar no delta «só com a marca» — sem
// `operationId`. O script a cobrava como operação viva (falso positivo, exit 1).
const YAML_CHANGE = `openapi: 3.1.0
paths:
  /pedidos:
    post:
      x-operation-type: NEW
      operationId: criarPedido
  /itens/{id}:
    delete:
      x-operation-type: REMOVED
  /legado:
    get:
      summary: exportação antiga
    x-operation-type: REMOVED
  /velho:
    delete:
      operationType: REMOVED
  /arquivados/{id}:
    get:
      x-operation-type: REMOVED
      operationId: obterArquivado
`;

test('8 — operação ou path REMOVED não é cobrado por operationId, rastreio nem suplemento', () => {
  const r = rodar(YAML_CHANGE, sup([op('criarPedido')]));
  assert.equal(r.status, 0, JSON.stringify(r.out));
  assert.deepEqual(r.out.achados, []);
});

test('8 — o extrator marca REMOVED por operação, por path (mesmo com a marca depois do método) e pelo sinônimo', async () => {
  const { operacoesDoYaml } = await mod();
  assert.deepEqual(operacoesDoYaml(YAML_CHANGE).map((o) => `${o.metodo} ${o.path}${o.removida ? ' REMOVED' : ''}`), [
    'POST /pedidos',
    'DELETE /itens/{id} REMOVED',
    'GET /legado REMOVED',
    'DELETE /velho REMOVED',
    'GET /arquivados/{id} REMOVED',
  ]);
});

test('8 — entrada do suplemento que só registra a remoção (sem linkedRequirements) não é furo', () => {
  const r = rodar(YAML_CHANGE, sup([op('criarPedido'), { operationId: 'obterArquivado', deprecated: true, removedInChange: ['CUPOM'] }]));
  assert.equal(r.status, 0, JSON.stringify(r.out));
});

test('8 — contrato em JSON: REMOVED por operação, por path e pelo sinônimo', () => {
  const json = JSON.stringify({ paths: {
    '/a': { get: { operationId: 'a' }, delete: { 'x-operation-type': 'REMOVED' } },
    '/b': { 'x-operation-type': 'REMOVED', get: { summary: 'antiga' } },
    '/c': { put: { operationType: 'REMOVED' } },
  } });
  const r = rodar(json, sup([op('a')]), 'json');
  assert.equal(r.status, 0, JSON.stringify(r.out));
});

test('3.1 — contrato em JSON é lido exato', () => {
  const json = JSON.stringify({ paths: { '/a': { get: { operationId: 'a' }, put: { operationId: 'b' } } } });
  assert.equal(rodar(json, sup([op('a'), op('b')]), 'json').status, 0);
  assert.equal(rodar(json, sup([op('a')]), 'json').status, 1);
});

test('3.1 — entrada não aplicável é exit 2, não falso verde', () => {
  assert.equal(rodar('openapi: 3.1.0\ninfo:\n  title: x\n', sup([])).status, 2, 'sem paths');
  assert.equal(rodar(YAML, '{ isto não é json').status, 2, 'suplemento ilegível');
  const r = spawnSync(process.execPath, [SCRIPT, 'nao-existe.yaml', 'nem.json'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('3.1 — a spec-api-contracts chama o script, como WARNING', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/spec-api-contracts/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(t, /node \.\.\/tools\/check-contracts\.mjs/);
  const warning = t.slice(t.indexOf('### WARNING'), t.indexOf('\n## ', t.indexOf('### WARNING')));
  assert.match(warning, /^\| `CONTRACTS_CROSSCHECK_SCRIPT` \|/m, 'o validator do script não está na tabela WARNING');
  // Os dois FATAL continuam FATAL — o script é evidência, não substituto.
  for (const c of ['SUPPLEMENT_MATCHES_YAML', 'EVERY_OPERATION_TRACED']) {
    const sec = t.slice(t.indexOf('### FATAL'), t.indexOf('### WARNING'));
    assert.match(sec, new RegExp(`\\| \`${c}\` \\|`), `${c} saiu do bloco FATAL`);
  }
});
