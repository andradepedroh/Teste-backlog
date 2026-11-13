// Harness Elo v2 — ordem lógica do backlog e marca de regra de negócio (plano de melhoria das skills,
// Onda 6). Os testes de aceite de 6.2 e 6.4, como o plano os descreve:
//
//   ordem — fixture com dependência cruzada entre features, entre stories e entre tasks, mais um
//           ciclo proposital: o script ordena o primeiro e acusa o segundo; rodar duas vezes dá o
//           mesmo resultado; no modo _change os arrays ficam onde estavam.
//   marca — uma task claramente de regra (cálculo de desconto com cenários de RN), uma de estrutura
//           (migração) e uma de tela; story com 70% do esforço em tasks marcadas (marcada) e outra
//           com 30% (não marcada); propagação até a epic; a marca manual com e sem justificativa.
// O lado do Azure (ordem, StackRank, links e tag no dry-run) está em tasks-azure-dry-run.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'scripts');
const ORDEM = join(SCRIPTS, 'order-backlog.mjs');
const MARCA = join(SCRIPTS, 'mark-business-rules.mjs');
const ordem = () => import(pathToFileURL(ORDEM).href);
const marca = () => import(pathToFileURL(MARCA).href);

const task = (id, storyId, over = {}) => ({ id, storyId, title: id, type: 'backend', ...over });

/** Backlog de propósito fora de ordem: o array diz F2 antes de F1, S3 antes de S1 etc. */
function backlogCruzado() {
  return {
    metadata: { schemaVersion: 'tasks/v5.3' },
    epics: [{ id: 'EPIC-2', name: 'Relatórios', dependencies: [] }, { id: 'EPIC-1', name: 'Pedidos' }],
    features: [
      { id: 'FEAT-2', epicId: 'EPIC-1', name: 'Tela de pedidos' },
      { id: 'FEAT-1', epicId: 'EPIC-1', name: 'Cadastro de pedidos' },
      { id: 'FEAT-3', epicId: 'EPIC-2', name: 'Painel' },
    ],
    stories: [
      { id: 'STORY-3', featureId: 'FEAT-2', name: 'Listar pedidos', priority: 'HIGH', tasks: [
        task('T-3B', 'STORY-3', { type: 'frontend', uiContext: { etapa: 'ETP-002 (ordem 2)' } }),
        task('T-3A', 'STORY-3', { apiContracts: [{ method: 'GET', path: '/pedidos' }], dependencies: ['T-1A'] }),
      ] },
      { id: 'STORY-1', featureId: 'FEAT-1', name: 'Criar pedido', tasks: [
        task('T-1B', 'STORY-1', { apiContracts: [{ method: 'POST', path: '/pedidos' }] }),
        task('T-1A', 'STORY-1', { type: 'database', persistenceModel: { entities: [{ table: 'TB_PEDIDO' }] } }),
      ] },
      { id: 'STORY-2', featureId: 'FEAT-1', name: 'Editar pedido', dependencies: ['STORY-1'], tasks: [task('T-2A', 'STORY-2')] },
      { id: 'STORY-4', featureId: 'FEAT-3', name: 'Painel de pedidos', tasks: [task('T-4A', 'STORY-4', { dependencies: ['T-3A'] })] },
    ],
  };
}

test('6.2 — ordena os quatro níveis pela regra: dependência herdada, camada, etapa, prioridade, ID', async () => {
  const { ordenarBacklog } = await ordem();
  const r = ordenarBacklog(backlogCruzado());
  assert.deepEqual(r.avisos, []);
  // EPIC-2 depende de EPIC-1 por herança (T-4A da FEAT-3/EPIC-2 depende de T-3A da EPIC-1).
  assert.deepEqual(r.ordem.epics, ['EPIC-1', 'EPIC-2']);
  // FEAT-2 depende de FEAT-1 por herança (T-3A → T-1A); FEAT-3 vem com a EPIC-2.
  assert.deepEqual(r.ordem.features, ['FEAT-1', 'FEAT-2', 'FEAT-3']);
  // STORY-1 antes de STORY-2 (dependência de story) e de STORY-3 (herdada da task); STORY-4 por último.
  assert.deepEqual(r.ordem.stories, ['STORY-1', 'STORY-2', 'STORY-3', 'STORY-4']);
  // Dentro da story: camada (data antes de service; service antes de ui).
  assert.deepEqual(r.ordem.tasks, ['T-1A', 'T-1B', 'T-2A', 'T-3A', 'T-3B', 'T-4A']);
  // Gravação: arrays reescritos, executionOrder no nível inteiro, sequence dentro da story, layer derivada.
  assert.deepEqual(r.doc.stories.map((s) => s.id), r.ordem.stories);
  assert.deepEqual(r.doc.stories[0].tasks.map((t) => [t.id, t.sequence, t.executionOrder, t.layer]), [['T-1A', 1, 1, 'data'], ['T-1B', 2, 2, 'service']]);
  assert.equal(r.doc.stories.find((s) => s.id === 'STORY-3').layer, 'service');
  assert.equal(r.doc.epics.find((e) => e.id === 'EPIC-2').executionOrder, 2);
});

test('6.2 — rodar duas vezes dá o mesmo resultado (idempotente)', async () => {
  const { ordenarBacklog } = await ordem();
  const uma = ordenarBacklog(backlogCruzado()).doc;
  assert.deepEqual(ordenarBacklog(uma).doc, uma);
});

test('6.2 — ciclo proposital e dependência para ID inexistente viram aviso, e a ordem sai assim mesmo', async () => {
  const { ordenarBacklog } = await ordem();
  const b = backlogCruzado();
  b.stories.find((s) => s.id === 'STORY-1').dependencies = ['STORY-2', 'STORY-FANTASMA'];
  const r = ordenarBacklog(b);
  const m = r.avisos.map((a) => `${a.code} ${a.mensagem}`);
  assert.ok(m.some((x) => x.startsWith('BACKLOG_ORDER_ACYCLIC') && x.includes('STORY-1') && x.includes('STORY-2')), m.join('\n'));
  assert.ok(m.some((x) => x.startsWith('BACKLOG_DEPENDENCY_EXISTS') && x.includes('STORY-FANTASMA')));
  assert.equal(r.ordem.stories.length, 4, 'nenhuma story some da ordem');
});

test('6.2 — modo _change: arrays e sequence ficam onde estavam; só executionOrder muda', async () => {
  const { ordenarBacklog } = await ordem();
  const b = backlogCruzado();
  b.metadata.changeMode = true;
  b.stories[0].tasks[0].sequence = 7;
  const r = ordenarBacklog(b, { change: true });
  assert.deepEqual(r.doc.stories.map((s) => s.id), b.stories.map((s) => s.id));
  assert.equal(r.doc.stories[0].tasks[0].sequence, 7);
  assert.equal(r.doc.stories.find((s) => s.id === 'STORY-1').executionOrder, 1);
});

test('6.2 — camada declarada que contradiz o conteúdo é avisada (BACKLOG_LAYER_CHECK)', async () => {
  const { ordenarBacklog } = await ordem();
  const b = backlogCruzado();
  b.stories[0].tasks[0].layer = 'data'; // T-3B tem uiContext: é tela
  assert.ok(ordenarBacklog(b).avisos.some((a) => a.code === 'BACKLOG_LAYER_CHECK' && a.item === 'T-3B'));
});

// ————————————————————————— marca de regra de negócio —————————————————————————

const regra = (id, storyId, horas) => task(id, storyId, {
  effortHours: { manual: horas },
  businessRules: [{ id: 'RN-010', statement: 'desconto de 5% acima de R$ 1.000' }],
  acceptanceScenarios: [
    { id: 'C1', category: 'HAPPY_PATH', relatedRules: ['RN-010'] },
    { id: 'C2', category: 'BUSINESS_RULE_VIOLATION' },
    { id: 'C3', category: 'INVALID_INPUT' },
  ],
});
const estrutura = (id, storyId, horas) => task(id, storyId, { type: 'database', effortHours: { manual: horas },
  persistenceModel: { entities: [{ table: 'TB_X' }] }, acceptanceScenarios: [{ id: 'C1', category: 'HAPPY_PATH' }] });
const tela = (id, storyId, horas) => task(id, storyId, { type: 'frontend', effortHours: { manual: horas },
  acceptanceScenarios: [{ id: 'C1', category: 'HAPPY_PATH' }, { id: 'C2', category: 'INVALID_INPUT' }] });

function backlogMarca() {
  return {
    metadata: { schemaVersion: 'tasks/v5.3' },
    epics: [{ id: 'EPIC-1' }],
    features: [{ id: 'FEAT-1', epicId: 'EPIC-1' }],
    stories: [
      { id: 'S-70', featureId: 'FEAT-1', tasks: [regra('T-DESC', 'S-70', 7), estrutura('T-MIG', 'S-70', 3)] },
      { id: 'S-30', featureId: 'FEAT-1', tasks: [regra('T-DESC2', 'S-30', 3), tela('T-TELA', 'S-30', 7)] },
    ],
  };
}

test('6.4 — a task de cálculo é marcada; a de migração e a de tela não', async () => {
  const { marcar } = await marca();
  const r = marcar(backlogMarca());
  const t = Object.fromEntries(r.doc.stories.flatMap((s) => s.tasks).map((x) => [x.id, [x.businessRuleHeavy, x.businessRuleShare]]));
  assert.deepEqual(t, { 'T-DESC': [true, 0.67], 'T-MIG': [false, 0], 'T-DESC2': [true, 0.67], 'T-TELA': [false, 0] });
});

test('6.4 — story com 70% do esforço em tasks marcadas é marcada; com 30%, não; e a marca sobe até a epic', async () => {
  const { marcar } = await marca();
  const r = marcar(backlogMarca());
  const s = Object.fromEntries(r.doc.stories.map((x) => [x.id, [x.businessRuleHeavy, x.businessRuleShare]]));
  assert.deepEqual(s, { 'S-70': [true, 0.7], 'S-30': [false, 0.3] });
  // Feature e epic: 10 de 20 horas em tasks marcadas = 50% — não passa do limite.
  assert.deepEqual([r.doc.features[0].businessRuleHeavy, r.doc.features[0].businessRuleShare], [false, 0.5]);
  assert.deepEqual([r.doc.epics[0].businessRuleHeavy, r.doc.epics[0].businessRuleShare], [false, 0.5]);
  // Com a task de tela menor, a feature e a epic passam a ser majoritariamente regra.
  const b = backlogMarca();
  b.stories[1].tasks[1].effortHours.manual = 2;
  const r2 = marcar(b);
  assert.equal(r2.doc.features[0].businessRuleHeavy, true);
  assert.equal(r2.doc.epics[0].businessRuleHeavy, true);
  assert.deepEqual(r2.marcados, { task: 2, story: 2, feature: 1, epic: 1 });
});

test('6.4 — marca manual: com justificativa vale e avisa a divergência; sem justificativa, o cálculo prevalece', async () => {
  const { marcar } = await marca();
  const b = backlogMarca();
  b.stories[1].businessRuleOverride = { marked: true, justification: 'a tela aplica a regra de desconto na hora de exibir o total' };
  b.stories[0].tasks[1].businessRuleOverride = { marked: true, justification: 'curta' };
  const r = marcar(b);
  assert.equal(r.doc.stories[1].businessRuleHeavy, true);
  assert.equal(r.doc.stories[0].tasks[1].businessRuleHeavy, false);
  const m = r.avisos.map((a) => `${a.code} ${a.item}`);
  assert.deepEqual(m.sort(), ['BUSINESS_RULE_MARK_CONSISTENT S-30', 'BUSINESS_RULE_MARK_CONSISTENT T-MIG']);
  assert.deepEqual(marcar(r.doc).doc, r.doc, 'idempotente');
});

test('6.4 — limite configurável em metadata.businessRuleMark.threshold', async () => {
  const { marcar } = await marca();
  const b = backlogMarca();
  b.metadata.businessRuleMark = { threshold: 0.8 };
  const r = marcar(b);
  assert.equal(r.doc.stories[0].tasks[0].businessRuleHeavy, false, '0,67 < 0,8');
});

// ————————————————————————— 6d — o critério tem que discriminar —————————————————————————
//
// A spec-tasks põe `relatedRules[]` em TODO cenário (inclusive o HAPPY_PATH) e toda story tem
// `businessRules[]` (minItems 1). Contar «cenário com relatedRules» como prova de RN marcava quase
// tudo: nos exemplos do kit, enabler, bug, techdebt e tela saíam marcados (fração 0,67 a 1).

const TPL = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'templates');
const exemplo = (arq) => JSON.parse(readFileSync(join(TPL, arq), 'utf8'));
const marcasDe = (doc) => Object.fromEntries(doc.stories.flatMap((s) => s.tasks).map((t) => [t.id, t.businessRuleHeavy]));

test('6d — exemplos reais do kit: enabler, bug, techdebt, spike e tela NÃO são marcados só por terem relatedRules', async () => {
  const { marcar } = await marca();
  assert.deepEqual(marcasDe(marcar(exemplo('tasks.operational-types-example.json')).doc), {
    'TASK-ENABLER-003-01': false, 'TASK-SPIKE-001-01': false, 'TASK-TECHDEBT-001-01': false, 'TASK-BUG-001-01': false,
  });
  assert.deepEqual(marcasDe(marcar(exemplo('tasks.hierarchy-example.json')).doc), { 'TASK-001-001': false, 'TASK-001-002': false });
  const tela = exemplo('tasks.frontend-example.json');
  assert.ok(tela.stories.flatMap((s) => s.tasks).every((t) => t.type === 'frontend'), 'premissa: o exemplo é de tela');
  assert.ok(Object.values(marcasDe(marcar(tela).doc)).every((v) => v === false));
});

test('6d — com a RN expandida na própria task (task auto-suficiente), estrutura, story operacional e tela continuam fora', async () => {
  const { marcar } = await marca();
  const doc = exemplo('tasks.operational-types-example.json');
  for (const s of doc.stories) for (const t of s.tasks) t.businessRules = structuredClone(s.businessRules);
  const tela = exemplo('tasks.frontend-example.json');
  for (const s of tela.stories) for (const t of s.tasks) t.businessRules = structuredClone(s.businessRules);
  const m = marcasDe(marcar(doc).doc);
  assert.equal(m['TASK-ENABLER-003-01'], false, 'migração (camada data) não é regra de negócio');
  assert.equal(m['TASK-TECHDEBT-001-01'], false, 'dívida técnica não é regra de negócio');
  assert.equal(m['TASK-SPIKE-001-01'], false);
  assert.ok(Object.values(marcasDe(marcar(tela).doc)).every((v) => v === false), 'tela não é regra de negócio');
});

test('6d — o exemplo completo do kit (criar pedido validando estoque, com a RN na task) é marcado', async () => {
  const { marcar } = await marca();
  const t = exemplo('tasks.example-completo.json');
  const r = marcar({ metadata: {}, stories: [{ id: t.storyId, tasks: [t] }] });
  assert.deepEqual([r.doc.stories[0].tasks[0].businessRuleHeavy, r.doc.stories[0].tasks[0].businessRuleShare], [true, 0.67]);
});

test('6d — relatedRules sozinho não basta, e cenário de entrada inválida ou permissão não prova RN', async () => {
  const { marcar } = await marca();
  const semRnPropria = backlogMarca();
  delete semRnPropria.stories[0].tasks[0].businessRules; // T-DESC continua com relatedRules nos cenários
  assert.equal(marcar(semRnPropria).doc.stories[0].tasks[0].businessRuleHeavy, false);
  const naoProvam = task('T-X', 'S-X', {
    businessRules: [{ id: 'RN-020', statement: 'limite de 3 pedidos por dia' }],
    acceptanceScenarios: [
      { id: 'C1', category: 'HAPPY_PATH' },
      { id: 'C2', category: 'INVALID_INPUT', relatedRules: ['RN-020'] },
      { id: 'C3', category: 'AUTHORIZATION', relatedRules: ['RN-020'] },
    ],
  });
  const r = marcar({ metadata: {}, stories: [{ id: 'S-X', tasks: [naoProvam] }] });
  assert.deepEqual([r.doc.stories[0].tasks[0].businessRuleHeavy, r.doc.stories[0].tasks[0].businessRuleShare], [false, 0]);
});

test('6.2/6.4 — CLI: grava no arquivo, --dry-run não grava, sem stories é exit 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ordem-marca-'));
  try {
    const p = join(dir, 'tasks.json');
    writeFileSync(p, JSON.stringify(backlogCruzado()));
    const antes = readFileSync(p, 'utf8');
    assert.equal(spawnSync(process.execPath, [ORDEM, '--input', p, '--dry-run'], { encoding: 'utf8' }).status, 0);
    assert.equal(readFileSync(p, 'utf8'), antes);
    assert.equal(spawnSync(process.execPath, [ORDEM, '--input', p], { encoding: 'utf8' }).status, 0);
    assert.equal(spawnSync(process.execPath, [MARCA, '--input', p], { encoding: 'utf8' }).status, 0);
    const d = JSON.parse(readFileSync(p, 'utf8'));
    assert.deepEqual(d.stories.map((s) => s.id), ['STORY-1', 'STORY-2', 'STORY-3', 'STORY-4']);
    assert.equal(typeof d.stories[0].businessRuleHeavy, 'boolean');
    writeFileSync(p, JSON.stringify({ metadata: {}, stories: [] }));
    assert.equal(spawnSync(process.execPath, [ORDEM, '--input', p], { encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [MARCA, '--input', p], { encoding: 'utf8' }).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('6.2/6.4 — o schema aceita os campos novos, todos opcionais', () => {
  const s = JSON.parse(readFileSync(join(RAIZ, '.claude/skills/spec-tasks/templates/tasks.schema-atual.json'), 'utf8'));
  for (const nivel of ['Epic', 'Feature', 'Story', 'Task']) {
    const d = s.definitions[nivel];
    for (const campo of ['executionOrder', 'layer', 'businessRuleHeavy', 'businessRuleShare', 'businessRuleOverride']) {
      assert.ok(d.properties[campo], `${nivel}.${campo} ausente do schema`);
      assert.ok(!(d.required ?? []).includes(campo), `${nivel}.${campo} não pode ser obrigatório`);
    }
    assert.deepEqual(d.properties.layer.enum, ['data', 'service', 'ui', 'integration', 'quality']);
  }
  assert.ok(s.definitions.Task.properties.dependencies, 'Task.dependencies ausente do schema');
});

test('6.2/6.4 — a spec-tasks roda os dois scripts antes dos validadores', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/spec-tasks/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const iOrdem = t.indexOf('scripts/order-backlog.mjs');
  const iMarca = t.indexOf('scripts/mark-business-rules.mjs');
  assert.ok(iOrdem > 0 && iMarca > 0, 'a skill não chama os scripts');
  // A tabela de validators saiu para references/ na Onda 4 (P5: a regra continua na pasta da skill).
  const tabela = readFileSync(join(RAIZ, '.claude/skills/spec-tasks/references/validators.md'), 'utf8');
  for (const c of ['BACKLOG_ORDER_ACYCLIC', 'BACKLOG_DEPENDENCY_EXISTS', 'BUSINESS_RULE_MARK_CONSISTENT']) {
    assert.match(tabela, new RegExp(`\\| \`${c}\` \\| WARNING \\|`), `${c} não está na tabela de validators como WARNING`);
  }
});
