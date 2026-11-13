// Harness Elo v2 — check-traceability.mjs da spec-data-model (plano de melhoria das skills, Onda 3,
// item 3.3).
//
// TRACEABILITY_PRESENT, ALTER_HAS_CURRENT_STATE e HYBRID_HAS_NOTES são FATAL na skill e o schema não
// os alcança. O script os confere; aqui: os três exemplos do kit passam (sem falso positivo), cada
// código acusa o caso ruim, EXISTING_REF fica de fora do rastreio, «—» não conta como nota, exit 2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-data-model');
const SCRIPT = join(SKILL, 'scripts', 'check-traceability.mjs');
const mod = () => import(pathToFileURL(SCRIPT).href);

test('3.3 — os exemplos do kit passam sem achado (nada de falso positivo)', async () => {
  const { conferirModelo } = await mod();
  const exemplos = readdirSync(join(SKILL, 'templates')).filter((f) => /^data-model\..*\.json$/.test(f) && !f.includes('schema'));
  assert.ok(exemplos.length >= 3);
  for (const f of exemplos) {
    const r = conferirModelo(JSON.parse(readFileSync(join(SKILL, 'templates', f), 'utf8')));
    assert.ok(r.entidades > 0, f);
    assert.deepEqual(r.achados, [], f);
  }
});

const entidade = (over = {}) => ({
  name: 'Pedido', operationType: 'NEW',
  traceability: [{ section: 'requirements', itemId: 'RF-MOD-PED-001', excerpt: 'cadastrar pedido' }],
  columns: [{ name: 'id', type: 'UUID', operationType: 'NEW' }],
  ...over,
});
const modelo = (...entities) => ({ boundedContexts: [{ name: 'Vendas', entities }] });

test('3.3 — cada código acusa o seu caso ruim', async () => {
  const { conferirModelo } = await mod();
  const r = conferirModelo(modelo(
    entidade({ name: 'SemRastreio', traceability: [{ section: 'x', itemId: 'TEL-001' }] }),
    entidade({ name: 'Alterada', operationType: 'ALTER', columns: [
      { name: 'status', operationType: 'ALTER_MODIFY', notes: '—' },
      { name: 'antigo', operationType: 'ALTER_DROP' },
    ] }),
    entidade({ name: 'Mista', dataOwnership: { mode: 'HYBRID', notes: '' } }),
  ));
  assert.deepEqual(r.achados.map((a) => `${a.code} ${a.entidade}`), [
    'TRACEABILITY_PRESENT Vendas.SemRastreio',
    'ALTER_HAS_CURRENT_STATE Vendas.Alterada',
    'ALTER_HAS_CURRENT_STATE Vendas.Alterada',
    'ALTER_HAS_CURRENT_STATE Vendas.Alterada',
    'HYBRID_HAS_NOTES Vendas.Mista',
  ]);
});

test('3.3 — RF/RN no excerpt vale; EXISTING_REF não precisa de rastreio; ALTER completo passa', async () => {
  const { conferirModelo } = await mod();
  const r = conferirModelo(modelo(
    entidade({ traceability: [{ section: 'business-rules', excerpt: 'conforme RN-NOVO-004' }] }),
    entidade({ name: 'Cliente', operationType: 'EXISTING_REF', traceability: [] }),
    entidade({ name: 'Pedido2', operationType: 'ALTER', currentStateIfAlter: { colunas: ['id'] },
      columns: [{ name: 'status', operationType: 'ALTER_MODIFY', notes: 'ANTES: VARCHAR(20) — DEPOIS: VARCHAR(30)' }] }),
    entidade({ name: 'Mista', dataOwnership: { mode: 'HYBRID', notes: 'cadastro é do CRM; o histórico é nosso' } }),
  ));
  assert.deepEqual(r.achados, []);
});

test('3.3 — CLI: exit 1 com achado, 0 limpo, 2 sem entrada aplicável', () => {
  const dir = mkdtempSync(join(tmpdir(), 'check-trace-'));
  try {
    const p = join(dir, 'data-model.json');
    writeFileSync(p, JSON.stringify(modelo(entidade({ traceability: [] }))));
    assert.equal(spawnSync(process.execPath, [SCRIPT, p], { encoding: 'utf8' }).status, 1);
    writeFileSync(p, JSON.stringify(modelo(entidade())));
    assert.equal(spawnSync(process.execPath, [SCRIPT, p], { encoding: 'utf8' }).status, 0);
    writeFileSync(p, JSON.stringify({ boundedContexts: [] }));
    assert.equal(spawnSync(process.execPath, [SCRIPT, p], { encoding: 'utf8' }).status, 2);
    writeFileSync(p, '{ quebrado');
    assert.equal(spawnSync(process.execPath, [SCRIPT, p], { encoding: 'utf8' }).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('3.3 — a spec-data-model chama o script no Passo L, como WARNING, e os FATAL continuam', () => {
  const t = readFileSync(join(SKILL, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(t, /node <dir-desta-skill>\/scripts\/check-traceability\.mjs outputs\/spec\/data-model\.json/);
  const warning = t.slice(t.indexOf('### WARNING'), t.indexOf('\n## ', t.indexOf('### WARNING')));
  assert.match(warning, /^\| `TRACEABILITY_SCRIPT_CHECK` \|/m);
  const fatal = t.slice(t.indexOf('### FATAL'), t.indexOf('### WARNING'));
  for (const c of ['TRACEABILITY_PRESENT', 'ALTER_HAS_CURRENT_STATE', 'HYBRID_HAS_NOTES']) {
    assert.match(fatal, new RegExp(`\\| \`${c}\` \\|`), `${c} saiu do bloco FATAL`);
  }
});
