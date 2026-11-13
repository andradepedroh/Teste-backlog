#!/usr/bin/env node
/**
 * forecast.mjs — a parte calculável da spec-estimate, por código: Complexity Unit e banda por task
 * (Layer 1), HDF derivado do backlog, DAG + Kahn + CPM + paralelização (Layer 2) e o Monte Carlo de
 * 10.000 iterações com Tuckman (Layer 4), nos cenários humano e IA-assistida.
 *
 * Por que existe: o método da skill estava só em prosa e a IA escrevia o `estimate-report.md` e o
 * `estimate-data.json` «com os mesmos números» à mão — os FATAL `MONTE_CARLO_ITERATIONS`,
 * `ALL_TASKS_SCORED`, `CYCLIC_DEPENDENCIES` e `EVIDENCE_TRACEABILITY` não eram verificáveis. Agora
 * os números saem daqui, com a evidência de cada um, e os dois documentos os copiam.
 *
 * O cross-check bottom-up × top-down também sai daqui (`crossCheck` no JSON e aviso
 * `HEADCOUNT_SANITY` fora de 0,5×–2×; ver `crossCheck`): o forecast de 70 dias com 2 frentes para
 * 90 h de backlog passava com `avisos: []` (D37, teste ponta a ponta de 2026-10-21).
 *
 * O que fica com a IA (julgamento, não conta): os Effort Multipliers (entram pela calibração), DCI,
 * SRI, registro de riscos, Brooks/squads, recomendações e custo — a skill traz duas fórmulas de custo
 * que não concordam («Fórmula final de esforço e custo»), então o script não escolhe uma.
 *
 * Uso:
 *   node <dir-desta-skill>/forecast.mjs [outputs/spec/tasks.json] [--calibracao <calib.json>]
 *        [--saida outputs/spec/estimate/estimate-calc.json] [--preencher <estimate-data.json>]
 *
 *   --calibracao  as 5 decisões do kickoff e os parâmetros (todos opcionais — ver CALIBRACAO_PADRAO):
 *                 { "hdf": "auto" | 2.5, "startDate": "2026-08-03", "nStreams": 4, "seed": 42,
 *                   "em": { "legacy": 1, "arch": 1, "team": 1.2, "tooling": 1, "compliance": 1, "gap": 1 },
 *                   "ia": { "enabled": true, "nStreams": 3, … } }
 *   --preencher   copia os números calculados para os campos correspondentes de um
 *                 `estimate-data.json` existente (o texto narrativo dele fica como está).
 *
 * Exit codes: 0 calculado · 1 FATAL (ciclo no DAG, task sem duração estimável) — nada gravado ·
 *             2 entrada não aplicável (sem tasks.json, JSON ilegível, backlog sem task).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

// ——————————————————————————————— parâmetros (os defaults da SKILL.md) ———————————————————————————————

export const CALIBRACAO_PADRAO = Object.freeze({
  hdf: 'auto',
  startDate: null,
  iterations: 10_000,
  seed: 20261020,
  nStreams: null,                   // null → pico de paralelismo do CPM
  sprintDays: 10,
  sigmaScope: 0.25,
  sigmaTp: 0.30,
  blockProb: 0.05,
  blockSprints: 1.5,
  tuckman: [0.35, 0.35, 0.55, 0.55, 0.75, 0.75, 0.85, 0.85],
  perf: 0.90,
  em: { legacy: 1.0, arch: 1.0, team: 1.2, tooling: 1.0, compliance: 1.0, gap: 1.0 },
  cuWeights: [1.2, 1.5, 1.4, 2.0, 1.8, 1.1, 1.3],
  ia: {
    enabled: true,
    nStreams: null,
    retry: 1.35,
    review: 0.15,
    reviewHigh: 0.30,
    blockProb: 0.08,
    tuckman: [0.20, 0.40, 0.60, 0.75, 0.75],
    perf: 0.82,
    speed: { backend: 2.0, test: 2.5, frontend: 1.8, integration: 1.2, infra: 1.2 },
  },
});

const DIAS_POR_ESFORCO = { XS: 0.25, S: 0.5, M: 1, L: 2 };
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const arr = (v) => (Array.isArray(v) ? v : []);
const r2 = (x) => Math.round(x * 100) / 100;

function mesclar(base, extra) {
  if (!extra || typeof extra !== 'object') return structuredClone(base);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])
      ? mesclar(base[k], v) : v;
  }
  return out;
}

// ——————————————————————————————— Layer 1 — CU, banda, durações ———————————————————————————————

/** Todas as tasks, com a story de cada uma. */
export function tasksDo(doc) {
  const out = [];
  for (const s of arr(doc?.stories)) for (const t of arr(s?.tasks)) out.push({ t, s });
  for (const t of arr(doc?.tasks)) out.push({ t, s: null });
  return out;
}

const statusDe = (responses) => (Array.isArray(responses) ? responses.length
  : responses && typeof responses === 'object' ? Object.keys(responses).length : 0);
const papeisDe = (auth) => arr(auth?.roles ?? auth?.scopes).length;
const regrasDe = (t) => {
  if (Array.isArray(t.businessRules) && t.businessRules.length) return t.businessRules.length;
  return new Set(arr(t.acceptanceScenarios).flatMap((c) => arr(c?.relatedRules))).size;
};

/** CU(task) e os sete componentes, cada um com a evidência (o campo e a contagem). Fórmula da § Layer 1. */
export function complexidade(t, pesos = CALIBRACAO_PADRAO.cuWeights) {
  const cenarios = arr(t.acceptanceScenarios).length;
  const regras = regrasDe(t);
  const entidades = arr(t.persistenceModel?.entities);
  const rels = entidades.reduce((n, e) => n + arr(e?.relationships).length, 0);
  const ops = arr(t.apiContracts);
  const status = ops.reduce((n, o) => n + statusDe(o?.responses), 0);
  const papeis = ops.reduce((n, o) => n + papeisDe(o?.auth), 0);
  const integracoes = t.type === 'integration' ? Math.max(ops.length, 1) : 0;
  const eventos = arr(t.events?.published).length + arr(t.events?.consumed).length + 2 * arr(t.events?.sagas).length;
  const estados = arr(t.uiContext?.estadosUI).length;
  const alternativos = arr(t.uiContext?.fluxosAlternativos).length;
  const passos = arr(t.businessRules).reduce((n, r) => n + arr(r?.implementation?.algorithm).length, 0);
  const c = {
    rf: cenarios + 0.3 * regras,
    data: entidades.length + 0.5 * rels,
    api: ops.length + 0.4 * status + 0.3 * papeis,
    integration: integracoes * 1.5,
    async: eventos,
    ui: estados + 0.5 * alternativos,
    rule: passos / 3,
  };
  const cu = r2([c.rf, c.data, c.api, c.integration, c.async, c.ui, c.rule].reduce((s, v, i) => s + v * pesos[i], 0));
  const evidencia = {
    'acceptanceScenarios[]': cenarios, 'regras de negócio': regras, 'persistenceModel.entities[]': entidades.length,
    'relationships[]': rels, 'apiContracts[]': ops.length, 'status codes': status, 'papéis de auth': papeis,
    'integrações (type=integration)': integracoes, 'eventos': eventos, 'uiContext.estadosUI[]': estados,
    'passos de algorithm[]': passos,
  };
  return { cu, componentes: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, r2(v)])), evidencia };
}

export const banda = (cu) => (cu <= 4 ? 'S' : cu <= 10 ? 'M' : cu <= 20 ? 'L' : 'XL');

/** Duração do backlog (dias-ideais): `durationEstimatedDays`, senão `effortHours.manual`/8, senão o esforço XS–L. */
export function duracaoBacklog(t) {
  const d = num(t.durationEstimatedDays);
  if (d !== null && d > 0) return { dias: d, fonte: 'durationEstimatedDays' };
  const h = num(t.effortHours?.manual);
  if (h !== null && h > 0) return { dias: r2(h / 8), fonte: 'effortHours.manual / 8' };
  if (t.effortEstimate in DIAS_POR_ESFORCO) return { dias: DIAS_POR_ESFORCO[t.effortEstimate], fonte: `effortEstimate ${t.effortEstimate}` };
  return null;
}

/** HDF derivado do backlog — a soma ponderada da § «Fator de realismo de duração», com teto 2,0–6,0. */
export function hdfDerivado(itens) {
  const n = itens.length || 1;
  const apiOps = itens.reduce((s, { t }) => s + arr(t.apiContracts).length, 0) / n;
  const regras = itens.reduce((s, { t }) => s + regrasDe(t), 0) / n;
  const ext = itens.reduce((s, { t }) => s + (t.type === 'integration' ? Math.max(arr(t.apiContracts).length, 1) : 0), 0) / n;
  const bruto = 1 + 0.15 * apiOps + 0.10 * regras + 0.30 * ext;
  return { hdf: r2(Math.min(6, Math.max(2, bruto))), bruto: r2(bruto), avgApiOps: r2(apiOps), avgBizRules: r2(regras), avgExtInt: r2(ext) };
}

// ——————————————————————————————— Layer 2 — DAG, Kahn, CPM ———————————————————————————————

/** Arestas do DAG com o tipo e a evidência (§ «Construção do DAG»). */
export function arestas(itens) {
  const out = [];
  const chave = new Set();
  const add = (de, para, tipo, evidencia) => {
    if (de === para) return;
    const k = `${de}>${para}`;
    if (chave.has(k)) return;
    chave.add(k);
    out.push({ de, para, tipo, evidencia });
  };
  const ids = new Set(itens.map(({ t }) => t.id));
  const porStory = new Map();
  for (const { t, s } of itens) if (s?.id) { if (!porStory.has(s.id)) porStory.set(s.id, []); porStory.get(s.id).push(t.id); }
  // explicit — task.dependsOn[] / task.dependencies[]
  for (const { t } of itens) {
    for (const d of [...arr(t.dependsOn), ...arr(t.dependencies)]) {
      if (ids.has(d)) add(d, t.id, 'explicit', `${t.id}.dependsOn/dependencies cita ${d}`);
    }
  }
  // story → story: toda task da dependente espera as tasks da story de que ela depende
  for (const { t, s } of itens) {
    for (const ds of arr(s?.dependencies)) {
      for (const d of porStory.get(ds) ?? []) add(d, t.id, 'explicit', `${s.id}.dependencies cita ${ds}`);
    }
  }
  // data-coupled — duas tasks escrevem na mesma tabela: a que vem antes no backlog vai antes
  const porTabela = new Map();
  for (const { t } of itens) {
    for (const e of arr(t.persistenceModel?.entities)) {
      if (!e?.table) continue;
      if (porTabela.has(e.table)) add(porTabela.get(e.table), t.id, 'data-coupled', `as duas escrevem em ${e.table}`);
      porTabela.set(e.table, t.id);
    }
  }
  // api-coupled — a tela consome a operação que outra task implementa
  const impl = new Map();
  for (const { t } of itens) {
    for (const o of arr(t.apiContracts)) {
      if (o?.operationId) impl.set(String(o.operationId), t.id);
      if (o?.method && o?.path) impl.set(`${String(o.method).toUpperCase()} ${o.path}`, t.id);
    }
  }
  for (const { t } of itens) {
    for (const ep of arr(t.uiContext?.endpoints)) {
      const k = typeof ep === 'string' ? ep.trim().replace(/^(\w+)\s+/, (m, v) => `${v.toUpperCase()} `) : String(ep?.operationId ?? `${String(ep?.method ?? '').toUpperCase()} ${ep?.path ?? ''}`);
      const de = impl.get(k);
      if (de) add(de, t.id, 'api-coupled', `${t.id} consome ${k}, implementada por ${de}`);
    }
  }
  return out;
}

/** Kahn: ordem topológica, ou o resto (os nós em ciclo). */
export function kahn(ids, as) {
  const grau = new Map(ids.map((i) => [i, 0]));
  const suc = new Map(ids.map((i) => [i, []]));
  for (const a of as) { grau.set(a.para, grau.get(a.para) + 1); suc.get(a.de).push(a.para); }
  const fila = ids.filter((i) => grau.get(i) === 0);
  const ordem = [];
  while (fila.length) {
    const n = fila.shift();
    ordem.push(n);
    for (const m of suc.get(n)) { grau.set(m, grau.get(m) - 1); if (grau.get(m) === 0) fila.push(m); }
  }
  return { ordem, ciclo: ids.filter((i) => !ordem.includes(i)) };
}

/** CPM (forward/backward), caminho crítico, fração serial, índice de paralelização, pico de paralelismo. */
export function cpm(ordem, as, dur) {
  const pred = new Map(ordem.map((i) => [i, []]));
  const suc = new Map(ordem.map((i) => [i, []]));
  for (const a of as) { pred.get(a.para).push(a.de); suc.get(a.de).push(a.para); }
  const es = new Map(); const ef = new Map(); const ls = new Map(); const lf = new Map();
  for (const n of ordem) {
    es.set(n, Math.max(0, ...pred.get(n).map((p) => ef.get(p))));
    ef.set(n, es.get(n) + dur.get(n));
  }
  const fim = Math.max(0, ...ordem.map((n) => ef.get(n)));
  for (const n of [...ordem].reverse()) {
    lf.set(n, suc.get(n).length ? Math.min(...suc.get(n).map((s) => ls.get(s))) : fim);
    ls.set(n, lf.get(n) - dur.get(n));
  }
  const eps = 1e-9;
  const critico = ordem.filter((n) => Math.abs(ls.get(n) - es.get(n)) < eps).sort((a, b) => es.get(a) - es.get(b) || ef.get(a) - ef.get(b));
  const total = ordem.reduce((s, n) => s + dur.get(n), 0);
  const s = total > 0 ? fim / total : 1;
  // Pico de paralelismo: quantas tasks se sobrepõem no cronograma mais cedo.
  const eventos = ordem.flatMap((n) => (dur.get(n) > 0 ? [[es.get(n), 1], [ef.get(n), -1]] : []))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let atual = 0; let pico = 0;
  for (const [, d] of eventos) { atual += d; pico = Math.max(pico, atual); }
  return {
    porTask: new Map(ordem.map((n) => [n, { es: r2(es.get(n)), ef: r2(ef.get(n)), ls: r2(ls.get(n)), lf: r2(lf.get(n)), tf: r2(ls.get(n) - es.get(n)) }])),
    caminhoCritico: critico, duracaoDias: r2(fim), trabalhoTotalDias: r2(total),
    fracaoSerial: r2(s), indiceParalelizacao: r2(1 - s), amdahl: r2(s > 0 ? 1 / s : 1), picoParalelo: Math.max(pico, 1),
  };
}

// ——————————————————————————————— Layer 4 — Monte Carlo com Tuckman ———————————————————————————————

/** PRNG determinístico (mulberry32): mesma semente, mesmos percentis. */
export function prng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand) {
  let u = 0; let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const percentil = (ordenado, p) => ordenado[Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1))];

/** O procedimento da § «Procedimento Monte Carlo», passo a passo. Devolve dias por iteração. */
export function monteCarlo({ totalDias, em, nStreams, par, tuckman, perf, sprintDays, sigmaScope, sigmaTp, blockProb, blockSprints, iterations, seed }) {
  const rand = prng(seed);
  const sigTp = Math.sqrt(Math.log(1 + sigmaTp ** 2));
  const resultados = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const escopo = clip(Math.exp(sigmaScope * normal(rand)), 0.7, 1.8);
    let restante = totalDias * em * escopo;
    let sprints = 0; let extra = 0;
    while (restante > 0 && sprints < 10_000) {
      const prod = sprints < tuckman.length ? tuckman[sprints] : perf;
      const media = nStreams * sprintDays * prod;
      const tp = clip(Math.exp(Math.log(media) - sigTp ** 2 / 2 + sigTp * normal(rand)), media * 0.2, media * 2.5);
      const efetivo = tp * (par + (1 - par) / nStreams);
      if (rand() < blockProb) extra += blockSprints * sprintDays;
      restante -= efetivo;
      sprints += 1;
    }
    resultados[i] = sprints * sprintDays + extra;
  }
  const ord = Array.from(resultados).sort((a, b) => a - b);
  return { iteracoes: iterations, semente: seed, p15: percentil(ord, 15), p50: percentil(ord, 50), p85: percentil(ord, 85), p95: percentil(ord, 95) };
}

/** Data de calendário a partir de `inicio` (YYYY-MM-DD) somando `dias` úteis (pula sábado e domingo). */
export function somarDiasUteis(inicio, dias) {
  const d = new Date(`${inicio}T12:00:00Z`);
  let falta = Math.ceil(dias);
  while (falta > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) falta--;
  }
  return d.toISOString().slice(0, 10);
}

// ——————————————————————————————— cross-check bottom-up × top-down ———————————————————————————————

export const FORMULA_CROSSCHECK = 'razão = (P50 × nStreams) ÷ (Σ effortHours.manual ÷ horas por dia)';
const FAIXA_CROSSCHECK = [0.5, 2];
const brn = (x) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/**
 * § «Cross-check bottom-up × top-down» da SKILL, com os números que o script tem: o top-down é o que o
 * forecast ocupa de gente — P50 (dias úteis) × nStreams, em dias-pessoa —, e o bottom-up é o esforço
 * que a `spec-tasks` estimou por task (`effortHours.manual ÷ horas por dia`; a task sem `effortHours`
 * entra pela duração do backlog). Fora da faixa 0,5×–2× é `HEADCOUNT_SANITY` (o limite de 2× da
 * SKILL: `headcount_topdown > 2 × team_sanity`), que implica `EFFORT_CROSSCHECK_DIVERGENCE` (>40%).
 * O limite de 40% sozinho não vira aviso: o top-down daqui é calendário (fila, rampa de Tuckman,
 * sprint inteira), sempre acima dele — avisaria em todo backlog (D37, teste ponta a ponta).
 * `chave` é `manual` (cenário humano) ou `aiAssisted` (cenário IA, com o P50 e as frentes da IA).
 */
export function crossCheck(itens, tasks, mc, nStreams, { horasPorDia = 8, chave = 'manual' } = {}) {
  const formula = FORMULA_CROSSCHECK.replace('manual', chave);
  const porId = new Map(tasks.map((x) => [x.id, x]));
  let comHoras = 0; let semHoras = 0; let dias = 0;
  for (const { t } of itens) {
    const h = num(t.effortHours?.[chave]);
    if (h !== null && h > 0) { comHoras++; dias += h / horasPorDia; continue; }
    const d = chave === 'manual' ? porId.get(t.id)?.durBacklog : porId.get(t.id)?.durIA;
    if (typeof d === 'number') { semHoras++; dias += d; }
  }
  if (!comHoras || !mc) return { disponivel: false, motivo: `nenhuma task com effortHours.${chave}`, formula, sinais: [] };
  const bottomUp = r2(dias);
  const topDown = r2(mc.p50 * nStreams);
  const razao = bottomUp > 0 ? r2(topDown / bottomUp) : null;
  const fora = razao !== null && (razao > FAIXA_CROSSCHECK[1] || razao < FAIXA_CROSSCHECK[0]);
  return {
    disponivel: true, formula, horasPorDia, p50Dias: mc.p50, nStreams,
    bottomUpDiasPessoa: bottomUp, topDownDiasPessoa: topDown, razao,
    divergenciaPct: razao !== null ? Math.round((razao - 1) * 100) : null,
    teamSanity: mc.p50 > 0 ? r2(bottomUp / mc.p50) : null, tasksSemEffortHours: semHoras,
    faixa: FAIXA_CROSSCHECK, sinais: fora ? ['EFFORT_CROSSCHECK_DIVERGENCE', 'HEADCOUNT_SANITY'] : [],
  };
}

function avisoDoCrossCheck(x, cenario, chave) {
  const acima = x.razao > FAIXA_CROSSCHECK[1];
  return `HEADCOUNT_SANITY${cenario} (e EFFORT_CROSSCHECK_DIVERGENCE, divergência ${x.divergenciaPct > 0 ? '+' : ''}${x.divergenciaPct}%): `
    + `o forecast ocupa ${brn(x.topDownDiasPessoa)} dias-pessoa (P50 ${brn(x.p50Dias)} dias × ${x.nStreams} frente(s)), `
    + `${brn(x.razao)}× o esforço do backlog — ${brn(x.bottomUpDiasPessoa)} dias-pessoa (Σ effortHours.${chave} ÷ ${x.horasPorDia} h/dia`
    + `${x.tasksSemEffortHours ? `; ${x.tasksSemEffortHours} task(s) sem effortHours pela duração do backlog` : ''}); `
    + `fora da faixa ${brn(FAIXA_CROSSCHECK[0])}×–${brn(FAIXA_CROSSCHECK[1])}×. Fórmula: ${x.formula}. `
    + `team_sanity = ${brn(x.teamSanity)} pessoa(s) no mesmo prazo. `
    + (acima ? 'Reconcilie antes de comprometer prazo: HDF, Effort Multipliers e a rampa de Tuckman estão inflando o prazo, ou o effortHours está baixo'
      : 'O forecast está abaixo do esforço do backlog: confira a duração das tasks e o número de frentes')
    + ' (SKILL, «Cross-check bottom-up × top-down»).';
}

// ——————————————————————————————— o cálculo inteiro ———————————————————————————————

const emProduto = (em) => Object.values(em).reduce((p, v) => p * v, 1);

export function calcular(doc, calibracaoEntrada = {}) {
  const cal = mesclar(CALIBRACAO_PADRAO, calibracaoEntrada);
  const itens = tasksDo(doc);
  const erros = [];
  const avisos = [];
  if (!calibracaoEntrada?.em) avisos.push('Effort Multipliers não informados na calibração — usados 1,0, exceto team_experience = 1,2 (cold-start). Decida-os no kickoff (K2).');

  const hdfAuto = hdfDerivado(itens);
  const hdf = cal.hdf === 'auto' || cal.hdf == null ? hdfAuto.hdf : cal.hdf;
  const tiposSemVelocidade = new Set();

  const tasks = itens.map(({ t, s }) => {
    const { cu, componentes, evidencia } = complexidade(t, cal.cuWeights);
    const d = duracaoBacklog(t);
    if (!d) erros.push({ code: 'ALL_TASKS_SCORED', task: t.id, mensagem: `${t.id}: sem durationEstimatedDays, effortHours.manual nem effortEstimate — não dá para estimar` });
    const reg = { id: t.id, storyId: s?.id ?? t.storyId ?? null, modulo: t.featureId ?? s?.featureId ?? s?.epicId ?? null, type: t.type ?? null,
      durBacklog: d?.dias ?? null, fonteDuracao: d?.fonte ?? null, cu, banda: banda(cu), componentes, evidencia };
    if (d) reg.durH = r2(d.dias * hdf);
    if (d && cal.ia.enabled) {
      const v = cal.ia.speed[t.type];
      if (!v) tiposSemVelocidade.add(t.type ?? '(sem type)');
      const alto = componentes.integration >= 2 || regrasDe(t) >= 8 || t.highRiskSilentFailure === true;
      reg.durIA = r2((d.dias / (v ?? 1)) * cal.ia.retry + d.dias * (alto ? cal.ia.reviewHigh : cal.ia.review));
      reg.revisaoElevada = alto;
    }
    return reg;
  });
  if (tiposSemVelocidade.size) {
    avisos.push(`Tipo(s) sem multiplicador de velocidade IA na tabela da skill: ${[...tiposSemVelocidade].join(', ')} — usado 1,0× (sem aceleração), por não haver base para outro valor.`);
  }

  const ids = itens.map(({ t }) => t.id);
  const as = arestas(itens);
  const { ordem, ciclo } = kahn(ids, as);
  if (ciclo.length) erros.push({ code: 'CYCLIC_DEPENDENCIES', mensagem: `ciclo no DAG entre: ${ciclo.join(', ')}` });
  if (erros.length) return { erros, avisos, tasks, dag: { arestas: as, ciclo } };

  const porId = new Map(tasks.map((x) => [x.id, x]));
  const cH = cpm(ordem, as, new Map(ordem.map((n) => [n, porId.get(n).durH])));
  const cI = cal.ia.enabled ? cpm(ordem, as, new Map(ordem.map((n) => [n, porId.get(n).durIA]))) : null;

  // Gargalos (§ «Detecção de gargalos»): fan-in/out, duração, folga zero e a parte da centralidade
  // que dá para medir no tasks.json (entidade compartilhada, contrato com muitos consumidores).
  const fanIn = new Map(ids.map((i) => [i, 0])); const fanOut = new Map(ids.map((i) => [i, 0]));
  for (const a of as) { fanIn.set(a.para, fanIn.get(a.para) + 1); fanOut.set(a.de, fanOut.get(a.de) + 1); }
  const maxDur = Math.max(...tasks.map((x) => x.durH));
  const usoTabela = new Map();
  for (const { t } of itens) for (const e of arr(t.persistenceModel?.entities)) if (e?.table) usoTabela.set(e.table, (usoTabela.get(e.table) ?? 0) + 1);
  const consumidores = new Map();
  for (const a of as.filter((x) => x.tipo === 'api-coupled')) consumidores.set(a.de, (consumidores.get(a.de) ?? 0) + 1);
  for (const x of tasks) {
    const t = itens.find((i) => i.t.id === x.id).t;
    const tabelaCentral = arr(t.persistenceModel?.entities).some((e) => (usoTabela.get(e?.table) ?? 0) > 0.3 * tasks.length);
    const centralidade = (tabelaCentral ? 0.3 : 0) + ((consumidores.get(x.id) ?? 0) > 3 ? 0.4 : 0);
    const p = cH.porTask.get(x.id);
    Object.assign(x, p, { critica: cH.caminhoCritico.includes(x.id), fanIn: fanIn.get(x.id), fanOut: fanOut.get(x.id) });
    x.bottleneckScore = Math.round(Math.min(100, (fanIn.get(x.id) + fanOut.get(x.id)) * 5 + (maxDur > 0 ? (x.durH / maxDur) * 30 : 0)
      + (p.tf === 0 ? 40 : 0) + centralidade * 25));
  }
  const gargalos = [...tasks].sort((a, b) => b.bottleneckScore - a.bottleneckScore).slice(0, 5)
    .map(({ id, bottleneckScore, fanIn: fi, fanOut: fo, tf, durH }) => ({ id, bottleneckScore, fanIn: fi, fanOut: fo, folga: tf, durH }));

  const nStreams = cal.nStreams ?? cH.picoParalelo;
  const emH = emProduto(cal.em);
  const mcH = monteCarlo({ totalDias: cH.trabalhoTotalDias, em: emH, nStreams, par: cH.indiceParalelizacao, tuckman: cal.tuckman, perf: cal.perf,
    sprintDays: cal.sprintDays, sigmaScope: cal.sigmaScope, sigmaTp: cal.sigmaTp, blockProb: cal.blockProb, blockSprints: cal.blockSprints,
    iterations: cal.iterations, seed: cal.seed });
  let mcI = null;
  if (cI) {
    const emI = cal.em.legacy * cal.em.arch * 0.90 * 0.80 * cal.em.compliance * cal.em.gap;
    mcI = monteCarlo({ totalDias: cI.trabalhoTotalDias, em: emI, nStreams: cal.ia.nStreams ?? nStreams, par: cI.indiceParalelizacao,
      tuckman: cal.ia.tuckman, perf: cal.ia.perf, sprintDays: cal.sprintDays, sigmaScope: cal.sigmaScope, sigmaTp: cal.sigmaTp,
      blockProb: cal.ia.blockProb, blockSprints: cal.blockSprints, iterations: cal.iterations, seed: cal.seed + 1 });
  }
  if (cal.iterations < 10_000) avisos.push(`Monte Carlo com ${cal.iterations} iterações — a skill exige ≥ 10.000 (MONTE_CARLO_ITERATIONS).`);
  const horasPorDia = num(doc?.metadata?.effortSummary?.hoursPerDay) || 8;
  const xH = crossCheck(itens, tasks, mcH, nStreams, { horasPorDia });
  const xI = mcI ? crossCheck(itens, tasks, mcI, cal.ia.nStreams ?? nStreams, { horasPorDia, chave: 'aiAssisted' }) : null;
  if (!xH.disponivel) avisos.push('NO_EFFORT_BASELINE: nenhuma task traz effortHours.manual — sem base bottom-up para o cross-check com o forecast (rodar a spec-tasks v1.4+).');
  if (xH.sinais.length) avisos.push(avisoDoCrossCheck(xH, '', 'manual'));
  if (xI?.disponivel && xI.sinais.length) avisos.push(avisoDoCrossCheck(xI, ' (cenário IA)', 'aiAssisted'));
  const datas = (mc) => (cal.startDate && mc
    ? Object.fromEntries(['p15', 'p50', 'p85', 'p95'].map((k) => [k, somarDiasUteis(cal.startDate, mc[k])])) : null);

  const bandas = { S: 0, M: 0, L: 0, XL: 0 };
  for (const x of tasks) bandas[x.banda]++;
  return {
    _schema: 'spec-estimate/forecast v1',
    calibracao: { hdf, hdfOrigem: cal.hdf === 'auto' || cal.hdf == null ? 'derivado do backlog' : 'calibração', hdfDerivacao: hdfAuto,
      emProdutoHumano: r2(emH), nStreams, nStreamsOrigem: cal.nStreams == null ? 'pico de paralelismo do CPM' : 'calibração',
      startDate: cal.startDate, iterations: cal.iterations, seed: cal.seed, sprintDays: cal.sprintDays },
    erros, avisos,
    somaCU: r2(tasks.reduce((s, x) => s + x.cu, 0)), bandas,
    tasks,
    dag: { arestas: as, ordemTopologica: ordem, ciclo: [] },
    cpm: { humano: { ...cH, porTask: undefined }, ia: cI ? { ...cI, porTask: undefined } : null },
    gargalos,
    monteCarlo: { humano: { ...mcH, datas: datas(mcH) }, ia: mcI ? { ...mcI, datas: datas(mcI) } : null },
    crossCheck: { ...xH, ia: xI },
  };
}

// ——————————————————————————————— estimate-data.json: só os números ———————————————————————————————

const br = (x, casas = 1) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const faixaPi = (pi) => (pi > 0.70 ? ['green', 'Bom 🟢'] : pi >= 0.40 ? ['amber', 'Moderado 🟡'] : ['red', 'Baixo 🔴']);

/** Os campos numéricos do `estimate-data.json` que saem do cálculo, no formato que o `cli.mjs` exibe. */
export function camposParaEstimateData(r) {
  const [piBand, piLabel] = faixaPi(r.cpm.humano.indiceParalelizacao);
  const linha = (pct, k) => ({
    pct, humanDays: `${Math.round(r.monteCarlo.humano[k])}`, humanDate: dataBR(r.monteCarlo.humano.datas?.[k]),
    iaDays: r.monteCarlo.ia ? `${Math.round(r.monteCarlo.ia[k])}` : '—', iaDate: dataBR(r.monteCarlo.ia?.datas?.[k]),
  });
  return {
    calibration: { hdf: br(r.calibracao.hdf), mcIterations: r.calibracao.iterations.toLocaleString('pt-BR'), ...(r.calibracao.startDate ? { startDate: dataBR(r.calibracao.startDate) } : {}) },
    complexity: { bands: { ...r.bandas } },
    dependency: { metrics: {
      criticalPathH: `${br(r.cpm.humano.duracaoDias)} dias`, criticalPathIA: r.cpm.ia ? `${br(r.cpm.ia.duracaoDias)} dias` : '—',
      pi: br(r.cpm.humano.indiceParalelizacao, 2), piBand, piLabel, amdahl: `${br(r.cpm.humano.amdahl)}×`, streams: `${r.calibracao.nStreams}`,
    } },
    forecast: { scenarios: [linha('P15', 'p15'), linha('P50', 'p50'), linha('P85', 'p85'), linha('P95', 'p95')] },
    allTasks: r.tasks.map((x) => ({ id: x.id, module: x.modulo ?? '—', type: x.type ?? '—', cu: br(x.cu), band: x.banda, durH: br(x.durH), durIA: x.durIA != null ? br(x.durIA) : '—' })),
  };
}

/** Copia os números para um `estimate-data.json` já escrito, sem tocar no texto dele. */
export function preencher(estimateData, campos) {
  const out = structuredClone(estimateData);
  for (const [bloco, valor] of Object.entries(campos)) {
    if (Array.isArray(valor)) { out[bloco] = valor; continue; }
    out[bloco] = out[bloco] && typeof out[bloco] === 'object' ? out[bloco] : {};
    for (const [k, v] of Object.entries(valor)) {
      out[bloco][k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(out[bloco][k] ?? {}), ...v } : v;
    }
  }
  return out;
}

function main(argv) {
  let tasksArq = null; let calArq = null; let saida = null; let alvo = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--calibracao') calArq = argv[++i];
    else if (argv[i] === '--saida') saida = argv[++i];
    else if (argv[i] === '--preencher') alvo = argv[++i];
    else if (!argv[i].startsWith('--') && !tasksArq) tasksArq = argv[i];
  }
  tasksArq ??= 'outputs/spec/tasks.json';
  saida ??= 'outputs/spec/estimate/estimate-calc.json';
  let doc; let cal = {};
  try {
    if (!existsSync(tasksArq)) throw new Error(`não encontrado: ${tasksArq}`);
    doc = JSON.parse(readFileSync(tasksArq, 'utf8'));
    if (calArq) cal = JSON.parse(readFileSync(calArq, 'utf8'));
    if (alvo && !existsSync(alvo)) throw new Error(`não encontrado: ${alvo}`);
  } catch (e) {
    process.stderr.write(`forecast: entrada ilegível — ${e?.message || e}\n`);
    return 2;
  }
  if (tasksDo(doc).length === 0) {
    process.stderr.write(`forecast: nenhuma task em ${tasksArq} — nada a estimar.\n`);
    return 2;
  }
  const r = calcular(doc, cal);
  if (r.erros.length) {
    process.stderr.write(`forecast: RECUSADO — ${r.erros.length} erro(s); nada gravado.\n`);
    for (const e of r.erros) process.stderr.write(`  [${e.code}] ${e.mensagem}\n`);
    return 1;
  }
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, `${JSON.stringify(r, null, 2)}\n`, 'utf8');
  if (alvo) {
    const ed = JSON.parse(readFileSync(alvo, 'utf8'));
    writeFileSync(alvo, `${JSON.stringify(preencher(ed, camposParaEstimateData(r)), null, 2)}\n`, 'utf8');
  }
  const h = r.monteCarlo.humano;
  process.stdout.write(
    `forecast: ${r.tasks.length} task(s), ΣCU ${r.somaCU}, HDF ${r.calibracao.hdf} (${r.calibracao.hdfOrigem}); ` +
    `caminho crítico ${r.cpm.humano.duracaoDias} dias, paralelização ${r.cpm.humano.indiceParalelizacao}, ${r.calibracao.nStreams} stream(s); ` +
    `Monte Carlo ${h.iteracoes} iterações — P50 ${h.p50} · P85 ${h.p85} · P95 ${h.p95} dias` +
    (r.monteCarlo.ia ? ` | IA P50 ${r.monteCarlo.ia.p50} · P85 ${r.monteCarlo.ia.p85}` : '') +
    `.\nGravado: ${saida}${alvo ? ` · números copiados para ${alvo}` : ''}\n`,
  );
  for (const a of r.avisos) process.stdout.write(`  AVISO: ${a}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
