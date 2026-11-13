#!/usr/bin/env node
/**
 * mark-business-rules.mjs — marca de regra de negócio nos quatro níveis do backlog: o item cuja maior
 * parte é regra de negócio recebe `businessRuleHeavy: true`, e a marca vai para o Azure DevOps como
 * tag (a spec-tasks-azure lê o campo).
 *
 * «A maior parte» precisa dar o mesmo resultado sempre, senão a marca vira opinião. O critério:
 *   · Task — as três condições juntas (plano de melhoria das skills, §6.3):
 *       1. a natureza do trabalho é regra de negócio, não estrutura, tela ou integração: a camada da
 *          task (`layer`, ou a que o order-backlog infere) não é `data`, `ui` nem `integration`, e a
 *          story não é operacional de estrutura, refatoração ou investigação (`ENABLER`,
 *          `TECHNICAL_DEBT`, `SPIKE`; task `class: spike` idem);
 *       2. a task traz a regra: `businessRules[]` da própria task não vazio. RN só citada em
 *          `relatedRules[]` não basta — a spec-tasks põe `relatedRules` em todo cenário, inclusive no
 *          HAPPY_PATH, e toda story tem RN;
 *       3. pelo menos a fração limite dos `acceptanceScenarios[]` existe PARA PROVAR uma RN, e quem
 *          diz para que o cenário existe é a categoria: `BUSINESS_RULE_VIOLATION` sempre prova;
 *          `HAPPY_PATH` e `EDGE_CASE` provam quando o `relatedRules[]` cita uma RN do
 *          `businessRules[]` da própria task (o valor calculado, o prazo, o limite); `INVALID_INPUT`,
 *          `AUTHORIZATION` e `EXTERNAL_SERVICE_FAILURE` nunca — são entrada, permissão e falha
 *          externa. `businessRuleShare` = essa fração (calculada também na task que a condição 1
 *          ou a 2 deixam de fora).
 *   · Story, feature e epic — o esforço das tasks marcadas que estão debaixo dele passa da fração
 *     limite do esforço total (`effortHours.manual`; sem ele, `durationEstimatedDays`; sem os dois,
 *     cada task conta 1). Medido nas tasks em todos os níveis, «a maior parte» quer dizer o mesmo
 *     nos quatro.
 *   · Limite: `metadata.businessRuleMark.threshold`, 0,5 por padrão (≥ na task, > nos demais).
 *
 * Julgamento: quem discordar do cálculo grava `businessRuleOverride: { marked, justification }` no
 * item. O script respeita a marca manual e avisa a divergência (WARNING BUSINESS_RULE_MARK_CONSISTENT).
 * Marca manual sem justificativa (ou com menos de 20 caracteres) não vale: o cálculo prevalece e o
 * aviso sai. Nunca silenciosa.
 *
 * Uso:
 *   node mark-business-rules.mjs --input <tasks.json> [--output <path>] [--dry-run] [--json]
 *
 * Idempotente. Exit codes: 0 marcado (com ou sem aviso) · 2 entrada não aplicável.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CAMADAS, inferirCamada } from './order-backlog.mjs';

const arr = (v) => (Array.isArray(v) ? v : []);
const r2 = (x) => Math.round(x * 100) / 100;

/** Camadas cujo trabalho principal é estrutura (data), tela (ui) ou integração — não regra. */
const CAMADAS_FORA = new Set(['data', 'ui', 'integration']);
/** Stories operacionais que não são trabalho de regra: estrutura, refatoração, investigação. */
const STORIES_FORA = new Set(['ENABLER', 'TECHNICAL_DEBT', 'SPIKE']);
/** Categorias de cenário que nunca provam RN: entrada inválida, permissão, falha externa. */
const CATEGORIAS_FORA = new Set(['INVALID_INPUT', 'AUTHORIZATION', 'EXTERNAL_SERVICE_FAILURE']);

const idDaRegra = (r) => (typeof r === 'string' ? r : r?.id);

/**
 * Por que a natureza da task não é regra de negócio — ou `null` quando é. A camada é a declarada
 * (`layer`, gravada pelo order-backlog, que roda antes) ou a mesma inferência dele.
 */
export function foraPorNatureza(t, story = null) {
  const camada = CAMADAS.includes(t?.layer) ? t.layer : inferirCamada(t).layer;
  if (CAMADAS_FORA.has(camada)) return `camada ${camada}`;
  const wit = String(story?.workItemType ?? '').toUpperCase();
  if (STORIES_FORA.has(wit)) return `story ${wit}`;
  if (String(t?.class ?? '').toLowerCase() === 'spike') return 'task de spike';
  return null;
}

/** Fração dos cenários da task que existem para provar regra de negócio, e se ela traz a regra. */
export function fracaoDaTask(t) {
  const cenarios = arr(t?.acceptanceScenarios);
  const rnsDaTask = new Set(arr(t?.businessRules).map(idDaRegra).filter(Boolean));
  const prova = (c) => {
    const cat = String(c?.category ?? '').toUpperCase();
    if (cat === 'BUSINESS_RULE_VIOLATION') return true;
    if (CATEGORIAS_FORA.has(cat)) return false;
    return arr(c?.relatedRules).some((rn) => rnsDaTask.has(rn));
  };
  const provam = cenarios.filter(prova);
  return { temRegra: arr(t?.businessRules).length > 0, cenarios: cenarios.length, provam: provam.length, share: cenarios.length ? provam.length / cenarios.length : 0 };
}

const esforco = (t) => {
  const h = t?.effortHours?.manual;
  if (typeof h === 'number' && h > 0) return h;
  const d = t?.durationEstimatedDays;
  if (typeof d === 'number' && d > 0) return d * 8;
  return 1;
};

/** O cálculo inteiro, em memória. */
export function marcar(docOriginal) {
  const doc = structuredClone(docOriginal);
  const limite = typeof doc?.metadata?.businessRuleMark?.threshold === 'number' ? doc.metadata.businessRuleMark.threshold : 0.5;
  const avisos = [];
  const decidir = (item, calculada) => {
    const ov = item.businessRuleOverride;
    const anterior = item.businessRuleHeavy;
    if (ov && typeof ov === 'object') {
      if (typeof ov.marked === 'boolean' && typeof ov.justification === 'string' && ov.justification.trim().length >= 20) {
        if (ov.marked !== calculada) {
          avisos.push({ code: 'BUSINESS_RULE_MARK_CONSISTENT', item: item.id, mensagem: `${item.id}: marca manual ${ov.marked ? 'COM' : 'SEM'} regra de negócio contra o cálculo (${calculada ? 'com' : 'sem'}) — vale a manual, pela justificativa: «${ov.justification.trim()}»` });
        }
        return ov.marked;
      }
      avisos.push({ code: 'BUSINESS_RULE_MARK_CONSISTENT', item: item.id, mensagem: `${item.id}: businessRuleOverride sem justificativa (mínimo 20 caracteres) — vale o cálculo` });
    } else if (typeof anterior === 'boolean' && anterior !== calculada && item.businessRuleShare === undefined) {
      avisos.push({ code: 'BUSINESS_RULE_MARK_CONSISTENT', item: item.id, mensagem: `${item.id}: businessRuleHeavy ${anterior} escrito à mão, sem businessRuleOverride — o cálculo (${calculada}) prevalece` });
    }
    return calculada;
  };

  const marcadasPorId = new Map();
  const tasksDe = new Map(); // id do item (story/feature/epic) → tasks debaixo dele
  const stories = arr(doc.stories);
  const features = arr(doc.features);
  const epics = arr(doc.epics);
  const featureDe = new Map(features.map((f) => [f.id, f]));
  for (const s of stories) {
    for (const t of arr(s.tasks)) {
      const f = fracaoDaTask(t);
      const calc = !foraPorNatureza(t, s) && f.temRegra && f.cenarios > 0 && f.share >= limite;
      t.businessRuleShare = r2(f.share);
      t.businessRuleHeavy = decidir(t, calc);
      marcadasPorId.set(t.id, t.businessRuleHeavy);
    }
    const pais = [s.id];
    const f = s.featureId && featureDe.get(s.featureId);
    if (f) pais.push(f.id);
    const epic = f?.epicId ?? s.epicId;
    if (epic) pais.push(epic);
    for (const p of pais) { if (!tasksDe.has(p)) tasksDe.set(p, []); tasksDe.get(p).push(...arr(s.tasks)); }
  }
  const porNivel = { task: 0, story: 0, feature: 0, epic: 0 };
  for (const v of marcadasPorId.values()) if (v) porNivel.task++;
  for (const [nivel, lista] of [['story', stories], ['feature', features], ['epic', epics]]) {
    for (const x of lista) {
      const ts = tasksDe.get(x.id) ?? [];
      const total = ts.reduce((n, t) => n + esforco(t), 0);
      const marcado = ts.filter((t) => t.businessRuleHeavy).reduce((n, t) => n + esforco(t), 0);
      const share = total > 0 ? marcado / total : 0;
      x.businessRuleShare = r2(share);
      x.businessRuleHeavy = decidir(x, share > limite);
      if (x.businessRuleHeavy) porNivel[nivel]++;
    }
  }
  return { doc, avisos, limite, marcados: porNivel };
}

function main(argv) {
  let input = null; let output = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') input = argv[++i];
    else if (argv[i] === '--output') output = argv[++i];
    else if (!argv[i].startsWith('--') && !input) input = argv[i];
  }
  input ??= 'outputs/spec/tasks.json';
  let doc;
  try {
    if (!existsSync(input)) throw new Error(`arquivo inexistente: ${input}`);
    doc = JSON.parse(readFileSync(input, 'utf8'));
  } catch (e) {
    process.stderr.write(`mark-business-rules: entrada ilegível — ${e?.message || e}\n`);
    return 2;
  }
  if (!Array.isArray(doc?.stories) || doc.stories.length === 0) {
    process.stderr.write('mark-business-rules: o tasks.json não tem stories[] — nada a marcar.\n');
    return 2;
  }
  const r = marcar(doc);
  if (!argv.includes('--dry-run')) writeFileSync(output ?? input, `${JSON.stringify(r.doc, null, 2)}\n`, 'utf8');
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify({ limite: r.limite, marcados: r.marcados, avisos: r.avisos }, null, 2)}\n`);
  else {
    const m = r.marcados;
    process.stdout.write(`mark-business-rules: limite ${r.limite}; marcados — ${m.epic} epic(s), ${m.feature} feature(s), ${m.story} story(ies), ${m.task} task(s)${argv.includes('--dry-run') ? ' (simulação — nada gravado)' : ''}.\n`);
    for (const a of r.avisos) process.stdout.write(`  [${a.code}] ${a.mensagem}\n`);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
