// Harness Elo v2 — forecast.mjs da spec-estimate (plano de melhoria das skills, Onda 3, item 3.7).
//
// O método da skill (CU, HDF, DAG/Kahn/CPM, Monte Carlo 10k com Tuckman) estava só em prosa e os
// números do .md e do .json eram escritos à mão. Aqui cada peça do cálculo é conferida contra um
// valor feito à mão a partir da fórmula escrita na SKILL.md, e a casca contra as recusas:
// ciclo no DAG (CYCLIC_DEPENDENCIES), task sem duração (ALL_TASKS_SCORED), e o --preencher, que
// copia só os números para o estimate-data.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-estimate');
const SCRIPT = join(SKILL, 'forecast.mjs');
const mod = () => import(pathToFileURL(SCRIPT).href);

const task = (id, over = {}) => ({ id, type: 'backend', durationEstimatedDays: 1, ...over });
const docDe = (stories) => ({ metadata: { schemaVersion: 'tasks/v5.3' }, stories });

test('3.7 — CU: a fórmula da Layer 1 com os pesos default, componente por componente', async () => {
  const { complexidade, banda } = await mod();
  const t = task('T', {
    acceptanceScenarios: [{ relatedRules: ['RN-1'] }, { relatedRules: ['RN-2'] }, {}],          // rf = 3 + 0,3×2 = 3,6
    persistenceModel: { entities: [{ table: 'A', relationships: [{}, {}] }, { table: 'B' }] }, // data = 2 + 0,5×2 = 3
    apiContracts: [{ responses: { 200: {}, 404: {} }, auth: { roles: ['adm'] } }],             // api = 1 + 0,4×2 + 0,3×1 = 2,1
    uiContext: { estadosUI: ['vazio', 'erro'] },                                                // ui = 2
    businessRules: [{ implementation: { algorithm: [1, 2, 3, 4, 5, 6] } }],                    // regras=1 → rf = 3 + 0,3 = 3,3; rule = 2
  });
  const r = complexidade(t);
  assert.deepEqual(r.componentes, { rf: 3.3, data: 3, api: 2.1, integration: 0, async: 0, ui: 2, rule: 2 });
  // 1,2×3,3 + 1,5×3 + 1,4×2,1 + 1,1×2 + 1,3×2 = 3,96 + 4,5 + 2,94 + 2,2 + 2,6 = 16,2
  assert.equal(r.cu, 16.2);
  assert.equal(banda(r.cu), 'L');
  assert.deepEqual([4, 4.01, 10, 10.5, 20, 20.01].map(banda), ['S', 'M', 'M', 'L', 'L', 'XL']);
});

test('3.7 — HDF derivado: 1 + 0,15×ops + 0,10×regras + 0,30×integrações, com teto 2,0–6,0', async () => {
  const { hdfDerivado } = await mod();
  const itens = (ts) => ts.map((t) => ({ t, s: null }));
  // ops médias 6, regras 10, integrações 2 → 1 + 0,9 + 1,0 + 0,6 = 3,5
  const meio = hdfDerivado(itens([
    task('A', { apiContracts: Array(6).fill({}), businessRules: Array(10).fill({}) }),
    task('B', { type: 'integration', apiContracts: Array(6).fill({}), businessRules: Array(10).fill({}) }),
  ]));
  assert.equal(meio.avgApiOps, 6);
  assert.equal(meio.avgExtInt, 3);
  assert.equal(meio.hdf, 3.5 + 0.3); // as 6 ops da task de integração contam como 6 integrações: média 3 → +0,9
  assert.equal(hdfDerivado(itens([task('A')])).hdf, 2, 'piso 2,0');
  assert.equal(hdfDerivado(itens([task('A', { type: 'integration', apiContracts: Array(30).fill({}) })])).hdf, 6, 'teto 6,0');
});

test('3.7 — DAG: explicit, dependência de story, data-coupled e api-coupled, com evidência', async () => {
  const { arestas, tasksDo } = await mod();
  const doc = docDe([
    { id: 'S1', tasks: [
      task('T1', { persistenceModel: { entities: [{ table: 'TB_PEDIDO' }] }, apiContracts: [{ method: 'get', path: '/pedidos', operationId: 'listar' }] }),
      task('T2', { persistenceModel: { entities: [{ table: 'TB_PEDIDO' }] } }),
    ] },
    { id: 'S2', dependencies: ['S1'], tasks: [task('T3', { type: 'frontend', uiContext: { endpoints: ['GET /pedidos'] }, dependsOn: ['T2'] })] },
  ]);
  const m = arestas(tasksDo(doc)).map((a) => `${a.de}>${a.para} ${a.tipo}`);
  assert.deepEqual(m.sort(), ['T1>T2 data-coupled', 'T1>T3 explicit', 'T2>T3 explicit'].sort(),
    'T1>T3 vem da dependência de story (a aresta api-coupled igual não duplica)');
});

test('3.7 — CPM: caminho crítico, folga, fração serial e pico de paralelismo de um grafo feito à mão', async () => {
  const { cpm, kahn } = await mod();
  const ids = ['A', 'B', 'C', 'D'];
  const as = [{ de: 'A', para: 'C' }, { de: 'B', para: 'C' }];
  const { ordem, ciclo } = kahn(ids, as);
  assert.deepEqual(ciclo, []);
  const r = cpm(ordem, as, new Map([['A', 2], ['B', 4], ['C', 3], ['D', 1]]));
  assert.deepEqual(r.caminhoCritico, ['B', 'C']);
  assert.equal(r.duracaoDias, 7);
  assert.equal(r.trabalhoTotalDias, 10);
  assert.equal(r.fracaoSerial, 0.7);
  assert.equal(r.indiceParalelizacao, 0.3);
  assert.equal(r.picoParalelo, 3, 'A, B e D começam juntos');
  assert.deepEqual(r.porTask.get('A'), { es: 0, ef: 2, ls: 2, lf: 4, tf: 2 });
  assert.deepEqual(kahn(['X', 'Y'], [{ de: 'X', para: 'Y' }, { de: 'Y', para: 'X' }]).ciclo, ['X', 'Y']);
});

test('3.7 — Monte Carlo: 10.000 iterações, reprodutível pela semente, percentis em ordem, mais streams encurtam', async () => {
  const { monteCarlo, CALIBRACAO_PADRAO: c } = await mod();
  const base = { totalDias: 120, em: 1.2, nStreams: 2, par: 0.6, tuckman: c.tuckman, perf: c.perf, sprintDays: 10,
    sigmaScope: c.sigmaScope, sigmaTp: c.sigmaTp, blockProb: c.blockProb, blockSprints: c.blockSprints, iterations: c.iterations, seed: 7 };
  const a = monteCarlo(base);
  assert.equal(a.iteracoes, 10_000);
  assert.deepEqual(monteCarlo(base), a, 'mesma semente, mesmo resultado');
  assert.ok(a.p15 <= a.p50 && a.p50 <= a.p85 && a.p85 <= a.p95, JSON.stringify(a));
  assert.ok(monteCarlo({ ...base, nStreams: 6 }).p50 < a.p50);
});

test('3.7 — dias úteis: sexta + 1 é segunda', async () => {
  const { somarDiasUteis } = await mod();
  assert.equal(somarDiasUteis('2026-10-23', 1), '2026-10-26');
  assert.equal(somarDiasUteis('2026-10-19', 10), '2026-11-02');
});

function rodar(doc, args = [], estimateData = null) {
  const dir = mkdtempSync(join(tmpdir(), 'forecast-'));
  try {
    const t = join(dir, 'tasks.json');
    writeFileSync(t, JSON.stringify(doc));
    const saida = join(dir, 'estimate', 'estimate-calc.json');
    const extra = [];
    if (estimateData) { copyFileSync(estimateData, join(dir, 'ed.json')); extra.push('--preencher', join(dir, 'ed.json')); }
    writeFileSync(join(dir, 'cal.json'), JSON.stringify({ startDate: '2026-11-02', em: { team: 1.2 } }));
    const r = spawnSync(process.execPath, [SCRIPT, t, '--calibracao', join(dir, 'cal.json'), '--saida', saida, ...extra, ...args], { encoding: 'utf8' });
    return {
      status: r.status, out: r.stdout, err: r.stderr,
      calc: existsSync(saida) ? JSON.parse(readFileSync(saida, 'utf8')) : null,
      ed: estimateData ? JSON.parse(readFileSync(join(dir, 'ed.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('3.7 — recusas: ciclo no DAG (CYCLIC_DEPENDENCIES) e task sem duração (ALL_TASKS_SCORED) — nada gravado', () => {
  const ciclo = rodar(docDe([{ id: 'S', tasks: [task('A', { dependsOn: ['B'] }), task('B', { dependsOn: ['A'] })] }]));
  assert.equal(ciclo.status, 1);
  assert.match(ciclo.err, /\[CYCLIC_DEPENDENCIES\] ciclo no DAG entre: A, B/);
  assert.equal(ciclo.calc, null);
  const semDur = rodar(docDe([{ id: 'S', tasks: [task('A'), { id: 'B', type: 'backend' }] }]));
  assert.equal(semDur.status, 1);
  assert.match(semDur.err, /\[ALL_TASKS_SCORED\] B:/);
  assert.equal(rodar(docDe([])).status, 2);
});

test('3.7 — --preencher copia só os números para o estimate-data.json e deixa o texto', () => {
  const exemplo = join(SKILL, 'templates', 'estimate-data.example.json');
  const original = JSON.parse(readFileSync(exemplo, 'utf8'));
  const doc = JSON.parse(readFileSync(join(RAIZ, '.claude/skills/spec-tasks/templates/tasks.hierarchy-example.json'), 'utf8'));
  const r = rodar(doc, [], exemplo);
  assert.equal(r.status, 0, r.err);
  assert.equal(r.calc.monteCarlo.humano.iteracoes, 10_000);
  assert.equal(r.ed.calibration.mcIterations, '10.000');
  assert.deepEqual(r.ed.allTasks.map((t) => t.id), ['TASK-001-001', 'TASK-001-002']);
  assert.deepEqual(r.ed.forecast.scenarios.map((s) => s.pct), ['P15', 'P50', 'P85', 'P95']);
  assert.equal(r.ed.forecast.scenarios[1].humanDays, String(Math.round(r.calc.monteCarlo.humano.p50)));
  // O texto não é do script: fica como estava.
  assert.equal(r.ed.project, original.project);
  assert.equal(r.ed.forecast.intro, original.forecast.intro);
  assert.equal(r.ed.calibration.engMonthlyCost, original.calibration.engMonthlyCost);
  assert.deepEqual(r.ed.dependency.bottlenecks, original.dependency.bottlenecks);
});

test('3.7 — a spec-estimate manda calcular pelo script e copiar os números dele', () => {
  const t = readFileSync(join(SKILL, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(t, /node <dir-desta-skill>\/forecast\.mjs outputs\/spec\/tasks\.json/);
  assert.match(t, /--preencher outputs\/spec\/estimate\/estimate-data\.json/);
  const warning = t.slice(t.indexOf('### WARNING — não bloqueia'), t.indexOf('\n## ', t.indexOf('### WARNING — não bloqueia')));
  assert.match(warning, /^\| `FORECAST_SCRIPT_USED` \|/m);
  const fatal = t.slice(t.indexOf('### FATAL — bloqueia emissão'), t.indexOf('### WARNING — não bloqueia'));
  for (const c of ['MONTE_CARLO_ITERATIONS', 'ALL_TASKS_SCORED', 'CYCLIC_DEPENDENCIES']) assert.match(fatal, new RegExp(`\\| \`${c}\` \\|`));
});

// D37 (teste ponta a ponta de 2026-10-21): backlog com 90 h manuais (≈ 11 dias-pessoa) deu P50 70
// dias com 2 frentes (≈ 140 dias-pessoa, 12×) e `avisos: []`. A SKILL pede o «Cross-check bottom-up
// × top-down»; agora o script calcula a razão e avisa fora da faixa 0,5×–2×.
const comEsforco = (n, horas, over = {}) => Array.from({ length: n }, (_, i) => task(`T${i + 1}`, {
  durationEstimatedDays: 1, effortHours: { manual: horas, aiAssisted: horas * 0.8 }, ...over }));

test('D37 — cross-check: razão = (P50 humano × nStreams) ÷ (Σ effortHours.manual ÷ horas/dia); acima de 2× é HEADCOUNT_SANITY', async () => {
  const { calcular } = await mod();
  const doc = { ...docDe([{ id: 'S1', tasks: comEsforco(16, 90 / 16) }]), metadata: { effortSummary: { hoursPerDay: 8 } } };
  const r = calcular(doc, { nStreams: 2, em: { team: 1.2, gap: 1.1 }, startDate: '2026-11-02', seed: 42 });
  const x = r.crossCheck;
  assert.equal(x.horasPorDia, 8);
  assert.equal(x.bottomUpDiasPessoa, 11.25, '90 h ÷ 8 h/dia');
  assert.equal(x.topDownDiasPessoa, r.monteCarlo.humano.p50 * 2, 'P50 × 2 frentes');
  assert.equal(x.razao, Math.round((x.topDownDiasPessoa / 11.25) * 100) / 100);
  assert.ok(x.razao > 2, JSON.stringify(x));
  assert.match(x.formula, /P50.*nStreams.*effortHours\.manual.*horas/);
  assert.deepEqual(x.sinais, ['EFFORT_CROSSCHECK_DIVERGENCE', 'HEADCOUNT_SANITY']);
  const aviso = r.avisos.find((a) => a.startsWith('HEADCOUNT_SANITY'));
  assert.ok(aviso, JSON.stringify(r.avisos));
  assert.match(aviso, /11,25 dias-pessoa/);
  assert.match(aviso, /× 2 frente/);
  assert.match(aviso, /razão = \(P50 × nStreams\) ÷ \(Σ effortHours\.manual ÷ horas por dia\)/);
});

test('D37 — cross-check dentro de 0,5×–2× não avisa; sem effortHours é NO_EFFORT_BASELINE; task sem effortHours entra pela duração do backlog', async () => {
  const { calcular } = await mod();
  // Calibração «sem inflação» (HDF 1, EMs 1, Tuckman 1, uma frente): o forecast fica perto do esforço.
  const plana = { hdf: 1, nStreams: 1, em: { legacy: 1, arch: 1, team: 1, tooling: 1, compliance: 1, gap: 1 }, tuckman: [1], perf: 1,
    sigmaScope: 0.01, sigmaTp: 0.01, blockProb: 0, sprintDays: 1, ia: { enabled: false } };
  const ok = calcular(docDe([{ id: 'S1', tasks: comEsforco(4, 8) }]), plana);
  assert.ok(ok.crossCheck.razao >= 0.5 && ok.crossCheck.razao <= 2, JSON.stringify(ok.crossCheck));
  assert.deepEqual(ok.crossCheck.sinais, []);
  assert.ok(!ok.avisos.some((a) => /HEADCOUNT_SANITY|EFFORT_CROSSCHECK/.test(a)), JSON.stringify(ok.avisos));
  const sem = calcular(docDe([{ id: 'S1', tasks: [task('A'), task('B')] }]), plana);
  assert.equal(sem.crossCheck.disponivel, false);
  assert.ok(sem.avisos.some((a) => a.startsWith('NO_EFFORT_BASELINE')), JSON.stringify(sem.avisos));
  const parcial = calcular(docDe([{ id: 'S1', tasks: [...comEsforco(2, 8), task('C', { durationEstimatedDays: 3 })] }]), plana);
  assert.equal(parcial.crossCheck.tasksSemEffortHours, 1);
  assert.equal(parcial.crossCheck.bottomUpDiasPessoa, 5, '2 × 8 h ÷ 8 + 3 dias da task sem effortHours');
});
