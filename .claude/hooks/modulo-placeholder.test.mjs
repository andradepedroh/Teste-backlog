// Harness Elo v2 — o literal de exemplo `MOD-XXX` não é código de módulo (D10 do teste ponta a
// ponta de 2026-10-21).
//
// O template do protótipo trazia o cabeçalho «Domínio (MOD-XXX)» — e quem segue o template à risca
// mantém o cabeçalho. Os dois verificadores liam aquele literal como módulo citado:
//
//   - `check-modules.py` → `unknown_module: ['MOD-XXX']`, exit 1, e o gate FATAL
//     `MODULES_CATALOG_OK` da `spec-product` ficava vermelho;
//   - `revisao.mjs` → «MOD-XXX — citado no prototype.md, ausente do hld-funcional.md».
//
// A correção tem dois lados, e este arquivo prende os dois: o template diz «código do módulo» em vez
// do literal, e os verificadores ignoram a notação de exemplo (`MOD-XXX`, `MOD-YYY`, `MOD-EXEMPLO`,
// `MOD-EXEMPLO-A`, `MOD-CODIGO`) quando ela aparece em texto livre — projeto que nasceu do template
// antigo continua com o cabeçalho velho, e não pode ficar vermelho por isso. Código real que ninguém
// registrou continua acusado: o filtro é a notação, não a checagem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { analisar } from './revisao.mjs';
import { extrairIds } from './kit.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(RAIZ, '.claude', 'skills', 'tools', 'check-modules.py');
const TEMPLATE = join(RAIZ, '.claude', 'skills', 'spec-prototype', 'templates', 'prototype.md');
const PY = process.env.PYTHON_REPORT || 'python';

/** As formas de exemplo que os templates do kit usam para «um código de módulo qualquer». */
const NOTACOES = ['MOD-XXX', 'MOD-YYY', 'MOD-EXEMPLO', 'MOD-EXEMPLO-A', 'MOD-CODIGO'];

/** Cabeçalhos do template ANTERIOR à correção — o que um projeto já iniciado tem no disco. */
const CABECALHO_ANTIGO = [
  '| ID | Rota | Nome | Tipo | Origem | Módulo (MOD-XXX) | Status |',
  '|----|------|------|------|--------|--------|--------|',
  '| TEL-001 | /pedidos | Pedidos | lista | RF-001 | MOD-PEDIDOS | gerada |',
  '',
  '| UI (rota / componente) | Domínio (MOD-XXX) | HU (ou PD-xxx) | RN (ou PD-xxx) | KPI | Ref. | Estados |',
  '|---|---|---|---|---|---|---|',
  '| /pedidos | MOD-PEDIDOS | RF-001 | RN-001 | — | F-001 | erro/vazio/carga |',
].join('\n');

/**
 * Projeto mínimo e VERDE para o `check-modules.py`: um módulo ativo no catálogo, citado no
 * `requirements.md` — sem isso o `orphan_active` derrubaria o exit code e o teste deixaria de
 * medir só o que ele mede.
 */
function projeto(prototipo) {
  const raiz = mkdtempSync(join(tmpdir(), 'mod-placeholder-'));
  const spec = join(raiz, 'outputs', 'spec');
  mkdirSync(join(spec, 'requirements'), { recursive: true });
  writeFileSync(join(spec, 'modules.md'), [
    '# Catálogo de módulos',
    '',
    '| Código | Nome | Aliases | Atores | Objetivo | Limites | Status |',
    '|---|---|---|---|---|---|---|',
    '| MOD-PEDIDOS | Pedidos | pedido | Vendedor | Registrar pedido | — | ativo |',
    '',
  ].join('\n'));
  writeFileSync(join(spec, 'requirements', 'requirements.md'), '## Módulo: Pedidos (`MOD-PEDIDOS`)\n');
  writeFileSync(join(spec, 'prototype.md'), prototipo);
  return raiz;
}

function checkModules(prototipo) {
  const raiz = projeto(prototipo);
  try {
    const r = spawnSync(PY, [SCRIPT], {
      cwd: raiz, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    assert.equal(r.error, undefined, `não consegui rodar ${PY}: ${r.error}`);
    let rel;
    try { rel = JSON.parse(r.stdout); } catch { assert.fail(`saída não é JSON:\n${r.stdout}\n${r.stderr}`); }
    return { status: r.status, rel };
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

const fantasmas = (proto) => analisar(new Map(Object.entries({
  'hld-funcional.md': '## 2. Módulos\n| MOD-PEDIDOS | Pedidos |\n',
  'prototype.md': proto,
}))).listas.find((l) => l.chave === 'modulo-fantasma').itens;

test('D10 — o template do protótipo não traz código de módulo nenhum, nem de exemplo', () => {
  const t = readFileSync(TEMPLATE, 'utf8');
  assert.deepEqual(extrairIds('MOD', t), [], 'o template cita um MOD-* que os verificadores leriam como módulo');
  assert.match(t, /\| Domínio \(código do módulo\) \|/, 'a tabela UI → negócio perdeu a coluna «Domínio (código do módulo)»');
  assert.match(t, /\| Módulo \(código do módulo\) \|/, 'o Inventário de telas perdeu a coluna «Módulo (código do módulo)»');
});

test('D10 — check-modules.py: o template copiado à risca, com uma linha preenchida, passa (exit 0)', () => {
  const proto = readFileSync(TEMPLATE, 'utf8') + '\n| /pedidos | MOD-PEDIDOS | RF-001 | RN-001 | — | F-001 | ok |\n';
  const { status, rel } = checkModules(proto);
  assert.deepEqual(rel.by_source.prototype.unknown_codes, []);
  assert.equal(status, 0, JSON.stringify(rel.issues));
});

test('D10 — check-modules.py: o cabeçalho do template antigo (MOD-XXX) não reprova o gate', () => {
  const { status, rel } = checkModules(CABECALHO_ANTIGO);
  assert.deepEqual(rel.by_source.prototype.unknown_codes, []);
  assert.deepEqual(rel.by_source.prototype.found, ['MOD-PEDIDOS']);
  assert.equal(status, 0, JSON.stringify(rel.issues));
});

test('D10 — check-modules.py: a notação de exemplo sai, o código não registrado continua acusado', () => {
  const proto = `${CABECALHO_ANTIGO}\n\nVer ${NOTACOES.join(', ')} e MOD-FANTASMA.\n`;
  const { status, rel } = checkModules(proto);
  assert.deepEqual(rel.by_source.prototype.unknown_codes, ['MOD-FANTASMA']);
  assert.equal(status, 1);
});

test('D10 — check-modules.py: campo estruturado com MOD-XXX é campo não preenchido, e continua acusado', () => {
  // A notação só é ignorada em texto livre (protótipo, gaps). No heading `## Módulo:` do
  // requirements.md ela é o template não preenchido — o sinal certo é o vermelho.
  const raiz = projeto(CABECALHO_ANTIGO);
  try {
    writeFileSync(join(raiz, 'outputs', 'spec', 'requirements', 'requirements.md'),
      '## Módulo: Pedidos (`MOD-PEDIDOS`)\n\n## Módulo: [Nome em linguagem do cliente] (`MOD-XXX`)\n');
    const r = spawnSync(PY, [SCRIPT], { cwd: raiz, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    const rel = JSON.parse(r.stdout);
    assert.deepEqual(rel.by_source.requirements.unknown_codes, ['MOD-XXX']);
    assert.equal(r.status, 1);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D10 — revisao.mjs: o template copiado à risca não cria módulo fantasma', () => {
  assert.deepEqual(fantasmas(readFileSync(TEMPLATE, 'utf8')), []);
});

test('D10 — revisao.mjs: o cabeçalho antigo não cria fantasma; o código não registrado continua na lista', () => {
  assert.deepEqual(fantasmas(CABECALHO_ANTIGO), []);
  const lista = fantasmas(`${CABECALHO_ANTIGO}\n\nVer ${NOTACOES.join(', ')} e MOD-FANTASMA.\n`);
  assert.deepEqual(lista, ['MOD-FANTASMA — citado no prototype.md, ausente do hld-funcional.md']);
});
