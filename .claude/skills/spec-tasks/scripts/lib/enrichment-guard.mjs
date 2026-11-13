/**
 * enrichment-guard.mjs — implementação do validador ENRICHMENT_NO_CONTENT_LOSS.
 *
 * POR QUE EXISTE
 * A v2 do enriquecimento fazia `story.acceptanceCriteria = buildStoryAcceptanceCriteria(...)`.
 * Uma story com 4 critérios específicos e corretos saía com 1 critério genérico — sem aviso,
 * sem diff, sem forma de recuperar. O mesmo padrão atingia `narrative` e `businessRules`.
 *
 * Este módulo compara o documento ANTES e DEPOIS do enriquecimento e reprova quando:
 *   (a) um array de `acceptanceCriteria`/`businessRules`/`deliveryScope` ENCOLHEU;
 *   (b) um `statement` de critério ou um `id` de regra que existia DESAPARECEU;
 *   (c) um campo de narrativa que estava preenchido ficou vazio ou foi alterado.
 *
 * Não é heurística: opera sobre o par (snapshot antes, snapshot depois) do mesmo arquivo.
 */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);

/** Campos de narrativa cujo conteúdo é redação humana — perder é regressão, não normalização. */
const NARRATIVE_FIELDS = [
  'elevatorPitch',
  'context',
  'problem',
  'deliveredValue',
  'operationalImpact',
  'regulatoryContext',
  'userStoryStatement'
];

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const criterionText = (c) => norm(typeof c === 'string' ? c : c?.statement);
const ruleId = (r) => norm(typeof r === 'string' ? r : r?.id);
const ruleText = (r) => norm(typeof r === 'string' ? r : r?.description);

/** @param {Record<string, any>} item */
function snapshotItem(item) {
  const n = isObj(item?.narrative) ? item.narrative : {};
  return {
    name: norm(item?.name ?? item?.title),
    acceptanceCriteria: arr(item?.acceptanceCriteria).map(criterionText).filter(Boolean),
    businessRules: arr(item?.businessRules).map((r) => ({ id: ruleId(r), description: ruleText(r) })).filter((r) => r.id || r.description),
    deliveryScope: arr(item?.deliveryScope).map((d) => norm(d?.taskId)).filter(Boolean),
    narrative: Object.fromEntries(NARRATIVE_FIELDS.map((f) => [f, norm(n[f])]).filter(([, v]) => v)),
    actors: arr(n.actors).map(norm).filter(Boolean),
    mainFlow: arr(n.mainFlow).map(norm).filter(Boolean)
  };
}

/**
 * Snapshot do conteúdo de negócio de todos os níveis, indexado por `<nível>:<id>`.
 * @param {Record<string, any>} doc
 */
export function collectContentSnapshot(doc) {
  /** @type {Record<string, ReturnType<typeof snapshotItem>>} */
  const out = {};
  for (const [level, key] of [['epic', 'epics'], ['feature', 'features'], ['story', 'stories']]) {
    for (const item of arr(doc?.[key])) {
      const id = norm(item?.id) || norm(item?.name) || `${level}#${Object.keys(out).length}`;
      out[`${level}:${id}`] = snapshotItem(item);
    }
  }
  return out;
}

/**
 * Achados de perda de conteúdo entre dois snapshots.
 * @param {ReturnType<typeof collectContentSnapshot>} before
 * @param {ReturnType<typeof collectContentSnapshot>} after
 * @returns {{code:string, scope:string, field:string, message:string, suggestedFix:string}[]}
 */
export function diffContentLoss(before, after) {
  const findings = [];
  const fail = (scope, field, message) =>
    findings.push({
      code: 'ENRICHMENT_NO_CONTENT_LOSS',
      scope,
      field,
      message,
      suggestedFix:
        'O enriquecimento é ADITIVO: só preenche campo vazio e faz união em arrays. Rodar sem --overwrite. Se a substituição é intencional, rodar com --overwrite e revisar o diff impresso item por item antes de aceitar.'
    });

  for (const [key, b] of Object.entries(before)) {
    const a = after[key];
    const scope = key.split(':').slice(1).join(':') || key;
    if (!a) {
      fail(scope, '(item)', `${key} existia antes do enriquecimento e desapareceu do documento`);
      continue;
    }

    for (const [field, label] of [
      ['acceptanceCriteria', 'critério de aceite'],
      ['deliveryScope', 'item de deliveryScope']
    ]) {
      if (a[field].length < b[field].length) {
        fail(scope, field, `${field} encolheu de ${b[field].length} para ${a[field].length} ${label}(s)`);
      }
      const lost = b[field].filter((x) => !a[field].includes(x));
      if (lost.length) {
        fail(scope, field, `${lost.length} ${label}(s) existente(s) desapareceu/desapareceram: ${lost.map((x) => `"${x.slice(0, 90)}"`).join(' · ')}`);
      }
    }

    if (a.businessRules.length < b.businessRules.length) {
      fail(scope, 'businessRules', `businessRules encolheu de ${b.businessRules.length} para ${a.businessRules.length} regra(s)`);
    }
    const afterIds = new Set(a.businessRules.map((r) => r.id).filter(Boolean));
    const afterDescs = new Set(a.businessRules.map((r) => r.description).filter(Boolean));
    for (const r of b.businessRules) {
      if (r.id && !afterIds.has(r.id)) {
        fail(scope, 'businessRules', `regra «${r.id}» existia antes e não está no resultado`);
      } else if (!r.id && r.description && !afterDescs.has(r.description)) {
        fail(scope, 'businessRules', `regra sem id ("${r.description.slice(0, 80)}") existia antes e não está no resultado`);
      }
    }

    for (const [field, value] of Object.entries(b.narrative)) {
      const now = a.narrative[field];
      if (!now) fail(scope, `narrative.${field}`, `narrative.${field} estava preenchido (${value.length} chars) e ficou vazio`);
      else if (now !== value) {
        fail(scope, `narrative.${field}`, `narrative.${field} foi reescrito — antes: "${value.slice(0, 90)}…" · depois: "${now.slice(0, 90)}…"`);
      }
    }

    for (const field of ['actors', 'mainFlow']) {
      const lost = b.narrative && b[field].filter((x) => !a[field].includes(x));
      if (lost?.length) {
        fail(scope, `narrative.${field}`, `${lost.length} entrada(s) de narrative.${field} desapareceu/desapareceram: ${lost.slice(0, 5).join(' · ')}`);
      }
    }
  }
  return findings;
}

/**
 * Diff legível das perdas registradas pelo enriquecimento em modo --overwrite.
 * Impresso no stdout ANTES de gravar, para que a substituição seja uma decisão informada.
 * @param {{scope:string, field:string, before:unknown, after:unknown}[]} losses
 */
export function formatLossDiff(losses) {
  if (!losses?.length) return '';
  const lines = ['', '=== --overwrite: conteúdo que será SUBSTITUÍDO ==='];
  for (const l of losses) {
    const fmt = (v) => {
      if (Array.isArray(v)) return `[${v.length} item(ns)]\n${v.map((x) => `      - ${norm(typeof x === 'string' ? x : x?.statement ?? x?.id ?? JSON.stringify(x)).slice(0, 120)}`).join('\n')}`;
      if (isObj(v)) return JSON.stringify(v).slice(0, 200);
      return `"${norm(v).slice(0, 160)}"`;
    };
    lines.push(`  ${l.scope} · ${l.field}`);
    lines.push(`    ANTES : ${fmt(l.before)}`);
    lines.push(`    DEPOIS: ${fmt(l.after)}`);
  }
  lines.push(`=== total: ${losses.length} campo(s) substituído(s) ===`, '');
  return lines.join('\n');
}
