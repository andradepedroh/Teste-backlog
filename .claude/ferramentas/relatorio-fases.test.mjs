// Harness Elo v2 — relatório de numeração de fases (plano de melhoria das skills, Onda 2).
//
// O relatório não falha por divergência (é material para o time Eng_Proc corrigir na origem). O
// que se prende aqui: (1) a leitura da tabela canônica; (2) a atribuição de cada «Fase N» à skill
// certa — inclusive os falsos positivos que a primeira versão cometia; (3) o modo relatório; e (4)
// a única parte que muda comportamento: o `description` do frontmatter, que é o gatilho da skill,
// bate com a tabela canônica em todas as skills.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { lerCanonico, citacoesDaLinha, relatorio } from './relatorio-fases.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(AQUI, 'relatorio-fases.mjs');

const TABELA = [
  '# task-pipeline', '', '## 1. Tabela canônica de fases', '',
  '| Fase | Skill | Papel |', '|---|---|---|',
  '| 2 | spec-ingest | Ingestão |', '| 3 | spec-legacy | Legado |',
  '| 7c | spec-test-plan | Plano de testes |', '| 8 | spec-tasks | Tasks |',
  '| 10 | spec-scaffold | Scaffold |', '| 10-C | spec-convert-prototype | Conversão |', '| 11 | spec-implement | Implementação |',
  '', '## 2. Outra seção', '| X | spec-nada | não é fase |',
].join('\n');

test('lê a tabela canônica e só ela', () => {
  const m = lerCanonico(TABELA);
  assert.equal(m.get('spec-test-plan'), '7c');
  assert.equal(m.get('spec-convert-prototype'), '10-C');
  assert.equal(m.has('spec-nada'), false, 'linha de outra seção entrou na tabela');
  assert.equal(lerCanonico('# sem tabela'), null);
});

const SKILLS = new Set(['spec-ingest', 'spec-legacy', 'spec-test-plan', 'spec-tasks', 'spec-scaffold', 'spec-implement', 'spec-frame', 'spec-convert-prototype']);
const at = (linha) => citacoesDaLinha(linha, SKILLS).map((c) => `${c.skill}=${c.achado}`);

test('atribui «Fase N» à skill certa', () => {
  assert.deepEqual(at('isso é `spec-test-plan` (Fase 8a). A matriz'), ['spec-test-plan=8a']);
  assert.deepEqual(at('| `spec-tasks` | 7 | Produz o tasks.json |'), ['spec-tasks=7']);
  assert.deepEqual(at('Fase 8 (`spec-tasks`) gera o backlog'), ['spec-tasks=8']);
  assert.deepEqual(at('«Fase 2» é `spec-ingest` e «Fase 3» é `spec-legacy`'), ['spec-ingest=2', 'spec-legacy=3']);
});

test('não atribui o que não é fase de uma skill (os falsos positivos da primeira versão)', () => {
  assert.deepEqual(at('(`spec-scaffold` e `spec-implement` fazem isso — Fases 10-11)'), [], 'intervalo');
  assert.deepEqual(at('spec-convert-prototype (Conversão — apoio à Fase 10) — migração'), [], 'apoio à Fase N');
  assert.deepEqual(at('> **Fase 1.** Roda **antes** do `spec-ingest`, e é opcional'), [], 'nome longe, sem conector');
  assert.deepEqual(at('Consome os insumos da Fase 7 e é CONSUMIDO pela spec-tasks (Fase 8)'), ['spec-tasks=8']);
});

test('modo relatório: divergência não falha (exit 0); sem tabela canônica, exit 2', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'fases-'));
  try {
    const ref = join(raiz, '.claude', 'skills', 'tools', 'references');
    mkdirSync(ref, { recursive: true });
    mkdirSync(join(raiz, '.claude', 'skills', 'spec-tasks'), { recursive: true });
    writeFileSync(join(raiz, '.claude', 'skills', 'spec-tasks', 'SKILL.md'),
      '---\nname: spec-tasks\ndescription: >\n  spec-tasks (Fase 7 — Tasks) — gera o backlog\n---\n\n| `spec-implement` | 10 | implementa |\n');
    let r = spawnSync(process.execPath, [SCRIPT, '--raiz', raiz, '--json'], { encoding: 'utf8' });
    assert.equal(r.status, 2, 'sem a tabela canônica o relatório não tem com o que comparar');
    writeFileSync(join(ref, 'task-pipeline.md'), TABELA);
    r = spawnSync(process.execPath, [SCRIPT, '--raiz', raiz, '--json'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(out.descricoes, [{ skill: 'spec-tasks', achado: '7', canonico: '8', ok: false }]);
    assert.deepEqual(out.divergencias.map((d) => `${d.arquivo}:${d.linha} ${d.skill} ${d.achado}->${d.canonico}`),
      ['spec-tasks/SKILL.md:4 spec-tasks 7->8', 'spec-tasks/SKILL.md:7 spec-implement 10->11']);
    const md = spawnSync(process.execPath, [SCRIPT, '--raiz', raiz], { encoding: 'utf8' });
    assert.match(md.stdout, /\| `spec-tasks` \| 7 \| 8 \|/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('no repositório: o description de toda skill (o gatilho) bate com a tabela canônica', () => {
  const r = relatorio();
  assert.ok(r, 'a tabela canônica não foi lida');
  assert.ok(r.descricoes.length >= 20, `só ${r.descricoes.length} descriptions com «(Fase N» foram lidos`);
  assert.deepEqual(r.descricoes.filter((d) => !d.ok), []);
});
