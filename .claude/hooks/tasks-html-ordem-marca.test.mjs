// Harness Elo v2 — spec-tasks-html mostra a ordem lógica e a marca de regra de negócio (plano de
// melhoria das skills, Onda 6). O relatório lista na ordem de `executionOrder` (mesmo com o array
// fora de ordem), mostra o número, põe o selo «Regra de negócio» no item marcado e oferece o filtro
// — que nunca esconde um item marcado (o pai de um item marcado continua visível). Backlog sem a
// marca sai sem filtro, como antes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const render = () => import(pathToFileURL(join(RAIZ, '.claude', 'skills', 'spec-tasks-html', 'lib', 'render-html.mjs')).href);

const t = (id, storyId, over = {}) => ({ id, storyId, title: `Tarefa ${id}`, type: 'backend', durationEstimatedDays: 1, ...over });

function doc({ comMarca = true } = {}) {
  const m = (v) => (comMarca ? { businessRuleHeavy: v } : {});
  return {
    metadata: { schemaVersion: 'tasks/v5.3', projectName: 'Pedidos' },
    features: [
      { id: 'FEAT-TELA', name: 'Tela', executionOrder: 2, ...m(false) },
      { id: 'FEAT-BASE', name: 'Base', executionOrder: 1, ...m(false) },
    ],
    stories: [
      { id: 'STORY-TELA', featureId: 'FEAT-TELA', name: 'Tela de pedidos', executionOrder: 2, ...m(false),
        tasks: [t('TASK-TELA', 'STORY-TELA', { executionOrder: 3, ...m(false) })] },
      { id: 'STORY-BASE', featureId: 'FEAT-BASE', name: 'Base de pedidos', executionOrder: 1, ...m(false),
        tasks: [t('TASK-API', 'STORY-BASE', { executionOrder: 2, ...m(true) }), t('TASK-TAB', 'STORY-BASE', { executionOrder: 1, ...m(false) })] },
    ],
  };
}

test('6.2 — o relatório lista na ordem de executionOrder e mostra o número', async () => {
  const { renderTasksHtml } = await render();
  const html = renderTasksHtml(doc());
  const pos = (s) => html.indexOf(`id="${s}"`);
  assert.ok(pos('feature-feat-base') < pos('feature-feat-tela'), 'feature fora da ordem');
  assert.ok(html.indexOf('TASK-TAB') < html.indexOf('TASK-API'), 'task fora da ordem dentro da story');
  assert.match(html, /class="pill pill--ordem"[^>]*>#1</);
});

test('6.4 — selo no item marcado, e o filtro não esconde o pai de um item marcado', async () => {
  const { renderTasksHtml } = await render();
  const html = renderTasksHtml(doc());
  assert.match(html, /id="filtro-regra"/);
  assert.match(html, /1 item marcado/);
  // A task marcada tem o selo e data-regra="sim"; a story e a feature dela também ficam visíveis.
  assert.match(html, /<details class="task-details" id="[^"]*task-api[^"]*" data-regra="sim">/i);
  assert.match(html, /class="story-card" data-regra="sim">/);
  assert.match(html, /id="feature-feat-base" data-regra="sim"/);
  assert.match(html, /id="feature-feat-tela" data-regra="nao"/);
  assert.equal((html.match(/class="pill pill--regra"/g) ?? []).length, 1);
  assert.match(html, /\.so-regra \[data-regra="nao"\]\{display:none\}/);
});

test('6b — depois da spec-security-review, a task SEC abre a story no relatório (antes ia para o fim, sem número)', async () => {
  const { renderTasksHtml } = await render();
  const { injetar } = await import(pathToFileURL(join(RAIZ, '.claude', 'skills', 'spec-security-review', 'scripts', 'inject-sec.mjs')).href);
  const sec = JSON.parse(readFileSync(join(RAIZ, '.claude', 'skills', 'spec-tasks', 'templates', 'tasks.sec-task-example.json'), 'utf8'));
  const r = injetar(doc(), [{ ...sec, storyId: 'STORY-BASE' }], { versaoSkill: '9.9' });
  assert.deepEqual(r.achados, []);
  const html = renderTasksHtml(r.doc);
  assert.ok(html.indexOf('SEC-001') > 0 && html.indexOf('SEC-001') < html.indexOf('TASK-TAB'), 'a task SEC não abre a story');
  assert.ok(html.indexOf('TASK-TAB') < html.indexOf('TASK-API'), 'as outras perderam a ordem');
});

test('6.4 — backlog sem a marca: sem filtro e sem selo (compatível com o que havia)', async () => {
  const { renderTasksHtml } = await render();
  const html = renderTasksHtml(doc({ comMarca: false }));
  assert.ok(!html.includes('id="filtro-regra"'));
  assert.ok(!html.includes('class="pill pill--regra"'));
});
