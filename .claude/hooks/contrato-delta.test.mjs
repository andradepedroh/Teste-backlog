// Harness Elo v2 — contrato resultante do modo _change da spec-api-contracts (plano de melhoria
// das skills, Onda 1, item 1.6).
//
// O D_change mandava rodar `oasdiff breaking` entre o contrato vigente e "o contrato resultante",
// mas a saída do modo é só o delta e nenhum passo montava o resultante: comparado com o delta, todo
// endpoint que não mudou apareceria como REMOVIDO. O `tools/merge-contract-delta.py` monta o
// resultante; aqui ele roda de verdade (subprocesso), com fixtures em JSON — que não precisam do
// PyYAML — e o caminho YAML é provado nos dois sentidos: com PyYAML funciona, sem ele degrada com
// `TOOL_UNAVAILABLE:pyyaml` (exit 3), como manda o `tool-bootstrap.md` do kit.
//
// Revisão do item 8 (casos «8 —»): três formas de o resultante esconder do oasdiff o que o delta
// diz — path inteiro REMOVED que ficava no resultante (com a marca dentro), `operationType` sem o
// `x-` (o nome que a SKILL.md usava) virando operação nova, e schema ALTER parcial que apagava
// propriedades e `required` do vigente sem aviso.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(RAIZ, '.claude', 'skills', 'tools', 'merge-contract-delta.py');
const PY = process.env.PYTHON_REPORT || 'python';

const VIGENTE = {
  openapi: '3.1.0',
  info: { title: 'Pedidos', version: '1.0.0' },
  paths: {
    '/pedidos': {
      get: { summary: 'Lista pedidos', responses: { 200: { description: 'ok' } } },
      post: {
        summary: 'Cria pedido',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/NovoPedido' } } } },
        responses: { 201: { description: 'criado' } },
      },
    },
    '/pedidos/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Detalhe', responses: { 200: { description: 'ok' } } },
      delete: { summary: 'Cancela', responses: { 204: { description: 'cancelado' } } },
    },
    '/legado/exportar': { get: { summary: 'Exportação antiga', responses: { 200: { description: 'ok' } } } },
  },
  components: {
    schemas: {
      NovoPedido: { type: 'object', required: ['cliente', 'cupom'], properties: { cliente: { type: 'string' }, cupom: { type: 'string' } } },
      Antigo: { type: 'object' },
    },
  },
};

const DELTA = {
  openapi: '3.1.0',
  info: { title: 'Pedidos', version: '1.1.0', 'x-change-metadata': { changeMode: true, basedOn: 'api-contracts.yaml', changeId: 'CUPOM' } },
  paths: {
    '/pedidos': {
      // ALTER completo: o campo `cupom` sai do schema (via components) e a resposta ganha 422.
      post: {
        'x-operation-type': 'ALTER',
        summary: 'Cria pedido',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/NovoPedido' } } } },
        responses: { 201: { description: 'criado' }, 422: { description: 'regra violada' } },
      },
    },
    '/pedidos/{id}/itens': {
      get: { 'x-operation-type': 'NEW', summary: 'Itens do pedido', responses: { 200: { description: 'ok' } } },
    },
    '/legado/exportar': { get: { 'x-operation-type': 'REMOVED' } },
  },
  components: {
    schemas: {
      NovoPedido: { 'x-operation-type': 'ALTER', type: 'object', required: ['cliente'], properties: { cliente: { type: 'string' } } },
      Antigo: { 'x-operation-type': 'REMOVED' },
    },
  },
};

function rodar(args, opts = {}) {
  return spawnSync(PY, [SCRIPT, ...args], { encoding: 'utf8', ...opts });
}

function comFixtures(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'contrato-delta-'));
  try {
    const vig = join(dir, 'api-contracts.json');
    const del = join(dir, 'api-contracts_change.json');
    writeFileSync(vig, JSON.stringify(VIGENTE));
    writeFileSync(del, JSON.stringify(DELTA));
    return fn({ dir, vig, del });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('1.6 — o resultante mantém o que o delta não tocou (o defeito: viraria remoção no oasdiff)', () => {
  comFixtures(({ dir, vig, del }) => {
    const out = join(dir, 'resultante.json');
    const r = rodar([vig, del, '--out', out]);
    assert.equal(r.status, 0, r.stderr);
    const res = JSON.parse(readFileSync(out, 'utf8'));
    // Inalterados continuam lá — é exatamente o que o delta sozinho não tem.
    assert.ok(res.paths['/pedidos'].get, 'GET /pedidos sumiu');
    assert.ok(res.paths['/pedidos/{id}'].get && res.paths['/pedidos/{id}'].delete);
    assert.deepEqual(res.paths['/pedidos/{id}'].parameters, VIGENTE.paths['/pedidos/{id}'].parameters);
    // O vigente em si não mudou.
    assert.deepEqual(JSON.parse(readFileSync(vig, 'utf8')), VIGENTE);
  });
});

test('1.6 — NEW entra, ALTER substitui por inteiro, REMOVED sai, e a marca não vai para o resultante', () => {
  comFixtures(({ dir, vig, del }) => {
    const out = join(dir, 'resultante.json');
    assert.equal(rodar([vig, del, '--out', out]).status, 0);
    const res = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(res.paths['/pedidos/{id}/itens'].get.summary, 'Itens do pedido');
    assert.ok(res.paths['/pedidos'].post.responses['422'], 'o ALTER não substituiu a operação');
    assert.equal(res.paths['/legado/exportar'], undefined, 'path sem método restante tem que sair');
    // Campo removido = campo ausente no resultante (é o que o oasdiff enxerga como breaking).
    assert.deepEqual(res.components.schemas.NovoPedido.required, ['cliente']);
    assert.equal(res.components.schemas.NovoPedido.properties.cupom, undefined);
    assert.equal(res.components.schemas.Antigo, undefined);
    assert.ok(!JSON.stringify(res).includes('x-operation-type'));
    assert.equal(res.info.version, '1.0.0', 'fora de paths/components o resultante é o vigente');
  });
});

test('1.6 — delta incoerente com o vigente vira AVISO no stderr, não silêncio', () => {
  comFixtures(({ dir, vig }) => {
    const del = join(dir, 'incoerente.json');
    writeFileSync(del, JSON.stringify({
      paths: {
        '/pedidos': { get: { summary: 'sem marca' } },
        '/fantasma': { delete: { 'x-operation-type': 'REMOVED' }, post: { 'x-operation-type': 'ALTER', summary: 'x' } },
      },
    }));
    const r = rodar([vig, del]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /AVISO: GET \/pedidos: sem x-operation-type; tratado como ALTER/);
    assert.match(r.stderr, /AVISO: DELETE \/fantasma: REMOVED, mas não existe no vigente/);
    assert.match(r.stderr, /AVISO: POST \/fantasma: ALTER, mas não existe no vigente/);
    assert.ok(JSON.parse(r.stdout).paths['/fantasma'].post, 'sem --out, o resultante sai em JSON no stdout');
  });
});

/** Roda o script com um delta próprio sobre o VIGENTE (ou outro) e devolve { r, res }. */
function juntarCom(delta, vigente = VIGENTE) {
  return comFixtures(({ dir }) => {
    const vig = join(dir, 'vigente.json');
    const del = join(dir, 'delta.json');
    writeFileSync(vig, JSON.stringify(vigente));
    writeFileSync(del, JSON.stringify(delta));
    const r = rodar([vig, del]);
    assert.equal(r.status, 0, r.stderr);
    return { r, res: JSON.parse(r.stdout) };
  });
}

test('8 — REMOVED no nível do path tira o path inteiro, e a marca não fica no resultante em nível nenhum', () => {
  const { r, res } = juntarCom({
    paths: {
      '/legado/exportar': { 'x-operation-type': 'REMOVED' },
      '/pedidos/{id}': { 'x-operation-type': 'ALTER', delete: { 'x-operation-type': 'REMOVED' } },
      '/sumido': { 'x-operation-type': 'REMOVED' },
    },
  });
  assert.equal(res.paths['/legado/exportar'], undefined, 'o path REMOVED continuou no resultante — o oasdiff não vê a remoção');
  assert.ok(res.paths['/pedidos/{id}'].get, 'a marca de path ALTER não pode apagar o que o delta não tocou');
  assert.equal(res.paths['/pedidos/{id}'].delete, undefined);
  assert.equal(res.paths['/sumido'], undefined);
  assert.ok(!JSON.stringify(res).includes('x-operation-type'), 'a marca vazou para o resultante');
  assert.match(r.stderr, /AVISO: \/sumido: REMOVED, mas não existe no vigente/);
});

test('8 — path REMOVED que ainda traz operação não-REMOVED no delta: o path sai, e o resto vira AVISO', () => {
  const { r, res } = juntarCom({
    paths: { '/legado/exportar': { 'x-operation-type': 'REMOVED', post: { 'x-operation-type': 'NEW', summary: 'x' } } },
  });
  assert.equal(res.paths['/legado/exportar'], undefined);
  assert.match(r.stderr, /AVISO: \/legado\/exportar: REMOVED no nível do path — o path inteiro sai do resultante; post do delta ignorado/);
});

test('8 — `operationType` (sem o x-) é lido como a marca, com AVISO, e não perde a remoção', () => {
  const { r, res } = juntarCom({
    paths: {
      '/pedidos/{id}': { delete: { operationType: 'REMOVED' } },
      '/legado/exportar': { operationType: 'REMOVED' },
      '/pedidos/{id}/itens': { get: { operationType: 'NEW', summary: 'Itens', responses: { 200: { description: 'ok' } } } },
    },
  });
  assert.equal(res.paths['/pedidos/{id}'].delete, undefined, 'o REMOVED escrito como `operationType` virou operação nova');
  assert.ok(res.paths['/pedidos/{id}'].get);
  assert.equal(res.paths['/legado/exportar'], undefined);
  assert.equal(res.paths['/pedidos/{id}/itens'].get.summary, 'Itens');
  assert.ok(!JSON.stringify(res.paths).includes('operationType'), '`operationType` não é campo OpenAPI e não vai para o resultante');
  assert.match(r.stderr, /AVISO: DELETE \/pedidos\/\{id\}: marcado com `operationType`; a marca do delta é `x-operation-type`/);
  assert.match(r.stderr, /AVISO: \/legado\/exportar: marcado com `operationType`/);
  assert.doesNotMatch(r.stderr, /sem x-operation-type/, 'com o sinônimo a operação não está sem marca');
});

const VIGENTE_COM_PEDIDO = {
  ...VIGENTE,
  components: {
    schemas: {
      ...VIGENTE.components.schemas,
      Pedido: {
        type: 'object', required: ['cliente', 'valor'],
        properties: { cliente: { type: 'string' }, valor: { type: 'number' }, obs: { type: 'string' } },
      },
    },
  },
};

test('8 — schema ALTER parcial: o resultante é o schema do delta (ALTER é completo), e o que sumiu do vigente vira AVISO', () => {
  const parcial = { type: 'object', required: ['valor'], properties: { valor: { type: 'integer' } } };
  const { r, res } = juntarCom({
    components: { schemas: { Pedido: { 'x-operation-type': 'ALTER', ...parcial } } },
  }, VIGENTE_COM_PEDIDO);
  // A semântica da SKILL (C_change e regra 3): ALTER é o item completo — o ausente sai.
  assert.deepEqual(res.components.schemas.Pedido, parcial);
  const aviso = r.stderr.split('\n').find((l) => l.startsWith('AVISO: components.schemas.Pedido:'));
  assert.ok(aviso, `sem AVISO para o schema parcial:\n${r.stderr}`);
  assert.match(aviso, /propriedade\(s\) `cliente`, `obs`/);
  assert.match(aviso, /required `cliente`/);
  assert.doesNotMatch(aviso, /`valor`/, 'o que o delta manteve não é aviso');
  assert.match(aviso, /se não foi remoção intencional, o delta tem de trazer o schema completo/);
});

test('8 — schema ALTER completo (só acrescenta) não gera AVISO de remoção', () => {
  const completo = {
    'x-operation-type': 'ALTER', type: 'object', required: ['cliente', 'valor'],
    properties: { cliente: { type: 'string' }, valor: { type: 'number' }, obs: { type: 'string' }, cupom: { type: 'string' } },
  };
  const { r, res } = juntarCom({ components: { schemas: { Pedido: completo } } }, VIGENTE_COM_PEDIDO);
  assert.ok(res.components.schemas.Pedido.properties.cupom);
  assert.doesNotMatch(r.stderr, /components\.schemas\.Pedido/);
});

test('1.6 — YAML: com PyYAML funciona; sem ele, TOOL_UNAVAILABLE:pyyaml com exit 3', () => {
  comFixtures(({ dir }) => {
    const temYaml = spawnSync(PY, ['-c', 'import yaml'], { encoding: 'utf8' }).status === 0;
    const vig = join(dir, 'api-contracts.yaml');
    const del = join(dir, 'api-contracts_change.yaml');
    // JSON é YAML válido: as fixtures servem como estão.
    writeFileSync(vig, JSON.stringify(VIGENTE));
    writeFileSync(del, JSON.stringify(DELTA));
    if (temYaml) {
      const out = join(dir, 'resultante.yaml');
      const r = rodar([vig, del, '--out', out]);
      assert.equal(r.status, 0, r.stderr);
      assert.match(readFileSync(out, 'utf8'), /\/pedidos\/\{id\}\/itens:/);
    }
    // Sem PyYAML: um `yaml.py` que falha no import, à frente no PYTHONPATH, simula a ausência.
    const falso = join(dir, 'sem-yaml');
    spawnSync(PY, ['-c', `import os; os.makedirs(r'''${falso}''', exist_ok=True); open(os.path.join(r'''${falso}''', 'yaml.py'), 'w').write("raise ImportError('PyYAML ausente (simulado)')")`]);
    const r = rodar([vig, del], { env: { ...process.env, PYTHONPATH: falso } });
    assert.equal(r.status, 3);
    assert.match(r.stderr, /TOOL_UNAVAILABLE:pyyaml/);
  });
});

test('1.6 — o D_change da SKILL.md monta o resultante ANTES do oasdiff e compara vigente × resultante', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/spec-api-contracts/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const ini = t.indexOf('D_change →');
  const fim = t.indexOf('E_change →', ini);
  assert.ok(ini > 0 && fim > ini, 'os passos D_change/E_change sumiram');
  const d = t.slice(ini, fim);
  const iMerge = d.indexOf('merge-contract-delta.py');
  const iOasdiff = d.indexOf('oasdiff breaking');
  assert.ok(iMerge > 0, 'o D_change não chama o merge-contract-delta.py');
  assert.ok(iMerge < iOasdiff, 'o resultante tem que ser montado antes do oasdiff');
  assert.match(d, /oasdiff breaking api-contracts\.yaml <resultante>/);
  assert.match(t, /`x-operation-type: NEW \| ALTER \| REMOVED`/, 'a marca NEW/ALTER/REMOVED não está documentada');
});

test('8 — a SKILL.md escreve a marca sempre como `x-operation-type` e explica os AVISOs de remoção', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/spec-api-contracts/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const sem = t.match(/\boperationType:\s*(NEW|ALTER|REMOVED)\b/g);
  assert.equal(sem, null, `a SKILL.md ensina a marca sem o x-: ${sem}`);
  const c = t.slice(t.indexOf('C_change →'), t.indexOf('D_change →'));
  assert.match(c, /REMOÇÃO de endpoint → `x-operation-type: REMOVED`/);
  assert.match(c, /nível do path/, 'o C_change não diz como remover o path inteiro');
  const d = t.slice(t.indexOf('D_change →'), t.indexOf('E_change →'));
  assert.match(d, /`required`/, 'o D_change não explica o AVISO de propriedade\/required que sumiu do schema');
});
