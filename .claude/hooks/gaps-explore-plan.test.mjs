// Harness Elo v2 — a ponte dos GAPs do Explore para o Plan (D16 do teste ponta a ponta de
// 2026-10-21).
//
// Existem dois `gaps.md`: `outputs/explore/gaps.md` (dono das questões abertas do pré-projeto,
// congelado na promoção) e `outputs/spec/gaps.md` (vivo, da `spec-iterate`). Nada dizia como um
// passa para o outro: a `spec-iterate` não citava o Explore e o `extract-gaps.py` só varria
// `outputs/spec/` — a numeração e a migração dos nove GAPs do teste ficaram por conta de quem
// executava. Este arquivo prende os dois lados da ponte:
//
//   - o `extract-gaps.py` lê também o `gaps.md` do Explore, conta cada GAP UMA vez (o importado
//     aparece nos dois arquivos com o mesmo número) e diz quais GAPs abertos do Explore ainda não
//     chegaram ao Plan;
//   - a `spec-iterate` documenta a importação na primeira rodada do Plan: só os abertos, mesmo
//     número, `Origem:` no campo Fonte, e a numeração nova continuando do maior dos dois arquivos.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(RAIZ, '.claude', 'skills', 'tools', 'extract-gaps.py');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-iterate', 'SKILL.md');
const PY = process.env.PYTHON_REPORT || 'python';

/** O `gaps.md` do Explore no formato do template do harness: aberto, respondido, parcial. */
const EXPLORE = [
  '# GAPs e Questões Abertas — Pedidos',
  '',
  '## Questões abertas',
  '',
  '| ID | Descrição | Status | Impacto | Responsável |',
  '|---|---|---|---|---|',
  '| GAP-001 | O desconto vale sobre o pedido inteiro? | ⏳ Aguardando | alto | Gerente |',
  '| GAP-002 | O crédito é conferido ao aprovar? | ✅ Respondido | alto | Gerente |',
  '| GAP-003 | Como o pedido passa a pago? | 🟡 Parcialmente | alto | Financeiro |',
  '',
].join('\n');

/** O `gaps.md` do Plan depois de importar SÓ o GAP-001, e com um GAP novo da auditoria. */
const SPEC = [
  '# Gaps — Pedidos',
  '',
  '### GAP-001',
  '| **Fonte** | Origem: outputs/explore/gaps.md#GAP-001 |',
  '',
  '### GAP-004',
  '| **Fonte** | Origem: P-001 |',
  '',
].join('\n');

function projeto({ explore = EXPLORE, spec = SPEC } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'gaps-ponte-'));
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec', 'gaps.md'), spec);
  if (explore != null) {
    mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
    writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), explore);
  }
  return raiz;
}

function extrair(raiz, args = []) {
  const r = spawnSync(PY, [SCRIPT, ...args], {
    cwd: raiz, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  assert.equal(r.error, undefined, `não consegui rodar ${PY}: ${r.error}`);
  return r;
}

/** Os cabeçalhos `GAP-nnn:` da listagem, na ordem em que saem. */
const cabecalhos = (saida) => [...saida.matchAll(/^(GAP-\d+):$/gm)].map((m) => m[1]);

/** Quantas linhas de ocorrência citam o arquivo do Explore (`explore` + separador + `gaps.md`). */
const ocorrenciasDoExplore = (saida) => saida.split(/\r?\n/).filter((l) => /explore[\\/]gaps\.md \(linha/.test(l)).length;

test('D16 — extract-gaps.py lê o gaps.md do Explore junto com outputs/spec/', () => {
  const raiz = projeto();
  try {
    const r = extrair(raiz);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(cabecalhos(r.stdout), ['GAP-001', 'GAP-002', 'GAP-003', 'GAP-004']);
    assert.match(r.stdout, /Foram encontrados 4 GAPs distintos/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D16 — o GAP importado com o mesmo número é UM GAP, com as ocorrências dos dois arquivos', () => {
  const raiz = projeto();
  try {
    const r = extrair(raiz);
    const bloco = r.stdout.slice(r.stdout.indexOf('GAP-001:'), r.stdout.indexOf('GAP-002:'));
    assert.equal(cabecalhos(r.stdout).filter((g) => g === 'GAP-001').length, 1);
    assert.match(bloco, /explore[\\/]gaps\.md \(linha 7\)/, 'a ocorrência do Explore sumiu');
    assert.match(bloco, /^ {2}- gaps\.md \(linha 3\)/m, 'a ocorrência do Plan sumiu');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D16 — lista os GAPs abertos do Explore que ainda não chegaram ao Plan (o respondido não entra)', () => {
  const raiz = projeto();
  try {
    const r = extrair(raiz);
    const linha = r.stdout.split(/\r?\n/).find((l) => /ainda não importados/.test(l)) ?? '';
    assert.match(linha, /GAP-003/);
    assert.doesNotMatch(linha, /GAP-001/, 'GAP-001 já está no Plan');
    assert.doesNotMatch(linha, /GAP-002/, 'GAP-002 está respondido no Explore — não se importa');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D16 — com tudo importado, a saída diz que a ponte está completa', () => {
  const raiz = projeto({ spec: `${SPEC}\n### GAP-003\n| **Fonte** | Origem: outputs/explore/gaps.md#GAP-003 |\n` });
  try {
    const r = extrair(raiz);
    assert.match(r.stdout, /Todos os GAPs abertos do Explore já estão em /);
    assert.doesNotMatch(r.stdout, /ainda não importados/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D16 — varrer outputs/ inteiro, com o Explore apontado, não lê o gaps.md dele duas vezes', () => {
  // `outputs/` já contém `explore/gaps.md`; apontá-lo de novo em `--explore-gaps` não pode
  // dobrar as ocorrências nem tirar os GAPs abertos da conta dos «não importados».
  const raiz = projeto();
  try {
    const r = extrair(raiz, ['outputs', '--explore-gaps', join('outputs', 'explore', 'gaps.md')]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(ocorrenciasDoExplore(r.stdout), 3, r.stdout);
    assert.match(r.stdout.split(/\r?\n/).find((l) => /ainda não importados/.test(l)) ?? '', /GAP-003/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D16 — sem outputs/explore/gaps.md, a saída é a de sempre', () => {
  const raiz = projeto({ explore: null });
  try {
    const r = extrair(raiz);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(cabecalhos(r.stdout), ['GAP-001', 'GAP-004']);
    assert.doesNotMatch(r.stdout, /Explore/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('D16 — a spec-iterate documenta a ponte do Explore (primeira rodada do Plan)', () => {
  const t = readFileSync(SKILL, 'utf8');
  const ini = t.indexOf('### Projeto vindo do Explore');
  assert.ok(ini > 0, 'a spec-iterate não tem a seção «Projeto vindo do Explore»');
  const secao = t.slice(ini, t.indexOf('\n### ', ini + 5));
  assert.match(secao, /`outputs\/explore\/gaps\.md`/);
  assert.match(secao, /primeira rodada/i);
  assert.match(secao, /⏳ Aguardando/, 'não diz quais GAPs do Explore são importados');
  assert.match(secao, /🟡 Parcialmente/, 'não diz quais GAPs do Explore são importados');
  assert.match(secao, /mesmo número/i, 'não diz que a numeração do Explore é mantida');
  assert.match(secao, /Origem: outputs\/explore\/gaps\.md#GAP-/, 'não diz o que vai no campo Fonte');
  assert.match(secao, /maior `GAP-XXX` dos dois arquivos/, 'não diz de onde continua a numeração');
  assert.match(secao, /congelad/i, 'não diz que o gaps.md do Explore não se edita');
  assert.match(secao, /extract-gaps\.py/, 'não liga a ponte ao script que a confere');
});

test('D16 — a Etapa A diz que o extract-gaps.py lê também o gaps.md do Explore', () => {
  const t = readFileSync(SKILL, 'utf8');
  const etapaA = t.slice(t.indexOf('### O que o agente faz nesta fase'), t.indexOf('### Roteiro de varredura'));
  assert.match(etapaA, /extract-gaps\.py/);
  assert.match(etapaA, /`outputs\/explore\/gaps\.md`/);
});

test('D16 — a spec-iterate subiu para 1.4 (nosso), em 2026-10-21', () => {
  const t = readFileSync(SKILL, 'utf8');
  assert.match(t, /^version: "1\.4"\r?$/m);
  assert.match(t, /^updated: "2026-10-21"\r?$/m);
});
