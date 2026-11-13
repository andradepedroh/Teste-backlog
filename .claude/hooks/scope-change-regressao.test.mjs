// Harness Elo v2 — a auditoria de regressão da spec-scope-change olha o que já foi entregue (D65 do
// teste ponta a ponta de 2026-10-21).
//
// A seção «Regressões potenciais» auditava só o `tasks.json` e os complementos: o `spec_story.md`
// (memória de cada módulo, mantida pela `spec-implement`) e o código entregue não apareciam —
// `grep -c spec_story` dava 0. No teste, a mudança de uma constante já implementada
// (`DISCOUNT_BANDS.LOW_UP_TO_CENTS`) e os testes de borda que a prendiam só entraram na análise
// porque quem executava os conhecia. Este arquivo prende a forma escrita da correção: o passo B lê
// o `spec_story.md` e o estado das tasks, a seção de regressão lista o código entregue que a
// mudança toca, o gate cobra isso e o template tem onde registrar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(RAIZ, '.claude', 'skills', 'spec-scope-change');
const skill = () => readFileSync(join(DIR, 'SKILL.md'), 'utf8');
const template = () => readFileSync(join(DIR, 'templates', 'scope-change-analysis.md'), 'utf8');

/** Trecho entre `de` e a próxima ocorrência de `ate` depois dele. */
function trecho(t, de, ate) {
  const i = t.indexOf(de);
  assert.ok(i >= 0, `não achei «${de}»`);
  const j = t.indexOf(ate, i + de.length);
  return t.slice(i, j < 0 ? undefined : j);
}

test('D65 — o kickoff K2 mostra o spec_story.md e de onde vem o estado das tasks', () => {
  const k2 = trecho(skill(), '### Passo K2', '### Passo K3');
  assert.match(k2, /spec_story\.md/);
  assert.match(k2, /estado das tasks/i);
});

test('D65 — o passo B da ordem de execução lê o spec_story.md e o estado das tasks', () => {
  const ordem = trecho(skill(), '## Ordem de execução', '## Classificação do delta');
  const passoB = trecho(ordem, 'B  →', 'C  →');
  assert.match(passoB, /spec_story\.md/);
  assert.match(passoB, /System\.State/, 'o estado das tasks não diz de onde vem (ADO)');
  const passoE = trecho(ordem, 'E  →', 'F  →');
  assert.match(passoE, /código já entregue/i);
});

test('D65 — «Regressões potenciais» parte do que já foi entregue, não só do tasks.json', () => {
  const secao = trecho(skill(), '## Regressões potenciais', '## Avaliação de risco');
  assert.match(secao, /spec_story\.md/, 'a seção não lê a memória do módulo');
  assert.match(secao, /spec-implement/, 'não diz quem mantém o spec_story.md');
  assert.match(secao, /System\.State/, 'não lê o estado da task no ADO');
  assert.match(secao, /\*\*State:\*\*/, 'não lê o estado registrado no spec_story.md');
  assert.match(secao, /«Implementado»/, 'não usa a lista de arquivos que a spec-implement registrou');
  assert.match(secao, /Código já entregue que a mudança toca/, 'não lista o código entregue');
  assert.match(secao, /constante/i, 'o caso do D65 (constante já implementada) não está coberto');
  assert.match(secao, /teste/i);
  // A pergunta de auditoria nova, na tabela de risco.
  assert.match(secao, /\| Esta task já entregue fixou em código ou em teste/);
});

test('D65 — o gate REGRESSION_AUDIT_COMPLETE cobra o spec_story.md e o código entregue', () => {
  const linha = skill().split(/\r?\n/).find((l) => l.startsWith('| `REGRESSION_AUDIT_COMPLETE`')) ?? '';
  assert.match(linha, /spec_story\.md/);
  assert.match(linha, /Código já entregue que a mudança toca/);
});

test('D65 — WARNING para desenvolvimento iniciado sem spec_story.md', () => {
  const linha = skill().split(/\r?\n/).find((l) => l.startsWith('| `SPEC_STORY_ABSENT`')) ?? '';
  assert.match(linha, /K3/);
  assert.match(linha, /spec_story\.md/);
});

test('D65 — o template da análise tem a tabela do código já entregue', () => {
  const regressao = trecho(template(), '## Análise de regressão', '## O que pode avançar');
  const sub = trecho(regressao, '### Código já entregue que a mudança toca', '\n### ');
  assert.match(sub, /\| Task ID \| Estado \| Arquivo e símbolo \| Teste que prende o comportamento atual \| O que muda \|/);
  assert.match(sub, /spec_story\.md/);
  assert.match(sub, /SPEC_STORY_ABSENT/);
});

test('D65 — a spec-scope-change subiu para 1.3 (nosso), em 2026-10-21', () => {
  const t = skill();
  assert.match(t, /^version: "1\.3"\r?$/m);
  assert.match(t, /^updated: "2026-10-21"\r?$/m);
});
