// lacunas-teste.mjs — «O que falta testar»: a matriz de rastreabilidade junto com a análise
// curada do agente.
//
// ─────────────────────────────────────────────────────────────────────────────
// DUAS CAMADAS, DUAS AUTORIDADES
//
//   · AUTOMÁTICA — o CLI calcula, sempre que há matriz medida: quais itens de negócio
//     não têm nenhum caso de teste citando o código deles, e quais têm teste que falha.
//     É fato da coleta, e é tudo que o relatório pode afirmar sozinho.
//   · CURADA — `status/test-gaps.json`, escrito pelo agente depois da coleta: o que a
//     regra diz, onde está no código, se já existe teste que a exercita sem citar o
//     código, quais testes criar e com que prioridade.
//
// A junção é por id. Item curado que a matriz não conhece vira aviso e não entra na aba;
// item da matriz sem análise curada entra só com os campos automáticos e o selo «análise
// detalhada pendente» — nunca com texto que dê a entender que foi analisado. Toda
// contagem (ação, prioridade, área, projeção) sai dos itens, nunca de texto livre.
// ─────────────────────────────────────────────────────────────────────────────

import { pct } from "./util.mjs";
import { localDay } from "./fuso.mjs";
import { canonicalModule, knownModules, moduleLabel as labelOf } from "./module-codes.mjs";

export const ACTIONS = {
  "mark-id": { label: "Marcar o código num teste que já existe", short: "marcar o código" },
  create: { label: "Criar o teste do zero", short: "criar do zero" },
  "with-impl": { label: "Criar o teste junto com a implementação", short: "criar com a implementação" },
  none: { label: "Sem teste proposto na análise", short: "sem teste proposto" },
  pending: { label: "Análise detalhada pendente", short: "análise pendente" },
};
export const ACTION_ORDER = ["mark-id", "create", "with-impl", "none", "pending"];

export const PRIORITY_LABEL = { alta: "Alta", media: "Média", baixa: "Baixa", none: "Sem prioridade declarada", pending: "Sem análise" };
export const PRIORITY_ORDER = ["alta", "media", "baixa", "none", "pending"];

export const LAYER_LABEL = {
  unitario: "Unitário", integracao: "Integração", contrato: "Contrato",
  "e2e-api": "E2E de API", "e2e-tela": "E2E de tela",
};
export const SITUATION_LABEL = { implemented: "implementado", planned: "só no backlog", unmapped: "sem vínculo" };
export const IMPL_LABEL = {
  implemented: "implementado", partial: "implementado em parte", absent: "não implementado", "backlog-only": "só no backlog",
};

const NO_AREA = "Sem módulo declarado";

/**
 * Monta o bloco `testGaps` do status-data.json.
 *
 * Devolve `null` quando não há matriz (a aba não existe e nada é dito). Devolve
 * `{ available: false }` quando há matriz mas ela não mede teste — testes não executados,
 * ou nenhum código inventariado: aí «sem teste» seria afirmação falsa sobre todos os itens.
 */
export function buildTestGaps({ traceMatrix, tests, code, curated = null, findings = null, collectedAt = null, business = null, tasks = null } = {}) {
  if (!traceMatrix || !traceMatrix.total) return null;
  const warnings = [];

  const runners = tests?.detection?.runners || [];
  const testsMeasured = Boolean(tests && tests.executed === true && ((tests.cases || []).length || !runners.length));
  const codeMeasured = Boolean(code?.inventory?.codeFileCount);
  if (!testsMeasured || !codeMeasured) {
    const reason = !codeMeasured
      ? "o código não foi inventariado nesta geração, então a matriz não sabe o que está implementado"
      : "os testes não foram executados nesta geração, então a matriz não sabe o que está testado";
    if (curated) {
      warnings.push({ code: "TEST_GAPS_NOT_MEASURED", message: `test-gaps.json presente, mas a aba «O que falta testar» não foi montada: ${reason}. Rode a coleta com código e testes.` });
    }
    return { available: false, reason, warnings };
  }

  const rows = traceMatrix.rows || [];
  const byId = new Map(rows.map((r) => [String(r.id).toUpperCase(), r]));
  const noTest = rows.filter((r) => !r.testTotals?.total);
  const failingRows = rows.filter((r) => r.testTotals?.failed > 0);
  const withTest = rows.length - noTest.length;
  // O módulo do item passa pela mesma forma canônica da atribuição dos bugs: o leitor de
  // documentos devolve `MOD-HOME-002` quando o item é `RF-MOD-HOME-002`, e sem isto cada
  // requisito virava uma «área» própria.
  const known = knownModules({ business, tasks });

  // ——— camada curada: índice, ids desconhecidos, duplicados ———
  const curatedById = new Map();
  const unknown = [];
  const duplicated = [];
  const alreadyTested = [];
  for (const it of curated?.items || []) {
    if (curatedById.has(it.id)) { duplicated.push(it.id); continue; }
    const row = byId.get(it.id);
    if (!row) { unknown.push(it.id); continue; }
    if (row.testTotals?.total) { alreadyTested.push(it.id); continue; }
    curatedById.set(it.id, it);
  }
  if (unknown.length) {
    warnings.push({ code: "TEST_GAPS_UNKNOWN_ID", message: `test-gaps.json analisa ${unknown.length} item(ns) que a matriz de rastreabilidade não conhece (${unknown.slice(0, 12).join(", ")}${unknown.length > 12 ? "…" : ""}) — ficaram fora da aba «O que falta testar». Confira o código ou se o item saiu da especificação.` });
  }
  if (duplicated.length) {
    warnings.push({ code: "TEST_GAPS_DUPLICATE_ID", message: `test-gaps.json traz ${duplicated.length} item(ns) repetido(s) (${[...new Set(duplicated)].slice(0, 12).join(", ")}) — valeu a primeira ocorrência de cada um.` });
  }

  // ——— desatualização ———
  const stale = curated ? staleness(curated, { collectedAt, total: traceMatrix.total }) : null;
  if (stale && stale.reasons.length) {
    warnings.push({ code: "TEST_GAPS_STALE", message: `A análise de test-gaps.json pode estar desatualizada: ${stale.reasons.join("; ")}. Refaça a análise sobre esta coleta antes de entregar a aba ao time.` });
  }

  // ——— itens sem teste, com a análise quando houver ———
  const areaOfModule = new Map();
  for (const a of curated?.areas || []) for (const m of a.modules) areaOfModule.set(String(m).toUpperCase(), a.name);
  const moduleLabel = (m) => labelOf(m, known);

  const items = noTest.map((r) => {
    const c = curatedById.get(String(r.id).toUpperCase()) || null;
    const module = canonicalModule(r.module, known);
    const area = (c && c.area) || (module && areaOfModule.get(module.toUpperCase())) || moduleLabel(module) || NO_AREA;
    const action = c ? actionOf(c) : "pending";
    return {
      id: r.id,
      kind: r.kind,
      kindLabel: r.kindLabel,
      title: r.title,
      statement: r.statement || null,
      module,
      moduleLabel: moduleLabel(module) || NO_AREA,
      area,
      situation: r.status,
      situationLabel: SITUATION_LABEL[r.status] || r.status,
      codeRefs: (r.codeRefs || []).filter((ref) => ref && ref.file && !/\.md$/i.test(ref.file)).map((ref) => ({ file: ref.file, line: ref.line ?? null })),
      tasks: r.tasks || [],
      workItems: r.workItems || [],
      curated: Boolean(c),
      action,
      priority: c ? (c.priority || null) : "pending",
      priorityReason: c?.priorityReason || null,
      rule: c?.rule || null,
      implementation: c?.implementation || null,
      existingTest: c?.existingTest || null,
      testsToCreate: c?.testsToCreate || [],
      poQuestions: c?.poQuestions || [],
      doneWithoutCode: c?.doneWithoutCode || [],
      layers: [...new Set((c?.testsToCreate || []).map((t) => t.layer || t.rawLayer).filter(Boolean))],
      repos: [...new Set((c?.testsToCreate || []).map((t) => t.repo).filter(Boolean))],
    };
  }).sort((a, b) => a.area.localeCompare(b.area, "pt-BR") || a.moduleLabel.localeCompare(b.moduleLabel, "pt-BR") || a.id.localeCompare(b.id, "en", { numeric: true }));

  // ——— contagens: sempre a partir dos itens ———
  const countBy = (f) => { const m = {}; for (const it of items) { const k = f(it); m[k] = (m[k] || 0) + 1; } return m; };
  const actions = Object.fromEntries(ACTION_ORDER.map((k) => [k, 0]));
  Object.assign(actions, countBy((it) => it.action));
  const priorities = Object.fromEntries(PRIORITY_ORDER.map((k) => [k, 0]));
  for (const it of items) priorities[it.priority || "none"] = (priorities[it.priority || "none"] || 0) + 1;

  const areaMap = new Map();
  for (const it of items) {
    const a = areaMap.get(it.area) || { name: it.area, total: 0, alta: 0, media: 0, baixa: 0, pending: 0, none: 0, implemented: 0, planned: 0, unmapped: 0, modules: new Set() };
    a.total++;
    a[it.priority || "none"]++;
    a[it.situation] = (a[it.situation] || 0) + 1;
    if (it.module) a.modules.add(it.module);
    areaMap.set(it.area, a);
  }
  const areas = [...areaMap.values()].map((a) => ({ ...a, modules: [...a.modules].sort() }));

  const situations = countBy((it) => it.situation);

  // Projeção: (itens com teste + marcar o código + criar do zero) / total. Só existe com a
  // camada curada — sem ela não há como saber quantos itens têm teste esperando marcação.
  const projectedCount = withTest + actions["mark-id"] + actions.create;
  const projection = curated && curatedById.size ? {
    current: pct(withTest, traceMatrix.total),
    projected: pct(projectedCount, traceMatrix.total),
    projectedCount,
    total: traceMatrix.total,
    markId: actions["mark-id"],
    create: actions.create,
  } : null;

  return {
    available: true,
    curated: curated ? {
      present: true,
      path: curated.path,
      generatedAt: curated.generatedAt,
      basis: curated.basis,
      traceTotal: curated.traceTotal,
      analyzed: curatedById.size,
      stale: Boolean(stale && stale.reasons.length),
      staleReasons: stale ? stale.reasons : [],
      unknownIds: unknown,
      alreadyTested,
    } : null,
    totals: { matrix: traceMatrix.total, withTest, withoutTest: noTest.length, failing: failingRows.length },
    coverage: { current: pct(withTest, traceMatrix.total) },
    projection,
    actions,
    priorities,
    situations,
    areas,
    items,
    failing: failingRows.map((r) => failingEntry(r, findings)),
    findingsPresent: Boolean(findings),
    poQuestions: groupPoQuestions(curated, items),
    contradictingTests: curated?.contradictingTests || [],
    doneWithoutCode: items.filter((it) => it.doneWithoutCode.length).map((it) => ({ id: it.id, title: it.title, notes: it.doneWithoutCode })),
    suitesNotRun: (tests?.suites || []).filter((s) => !s.executed).map((s) => s.label),
    exampleId: (items[0] && items[0].id) || (rows[0] && rows[0].id) || "RN-XXX-001",
    warnings,
  };
}

/**
 * A ação de teste de um item analisado. A ordem é a da providência mais barata:
 *   1. já existe teste que exercita o comportamento → marcar o código nele;
 *   2. o item não está implementado → o teste nasce junto com a implementação;
 *   3. está implementado e há testes propostos → criar do zero;
 *   4. nada proposto → «sem teste proposto» (ex.: requisito de processo).
 */
export function actionOf(c) {
  if (c.existingTest && c.existingTest.action === "mark-id") return "mark-id";
  const st = c.implementation && c.implementation.state;
  if (st === "absent" || st === "backlog-only") return "with-impl";
  if ((c.testsToCreate || []).length) return "create";
  return "none";
}

/**
 * Análise mais antiga que a coleta, ou feita contra outro total da matriz.
 * Data sem hora compara por DIA: a análise escrita no mesmo dia da coleta, depois dela,
 * é o fluxo normal da skill e não pode acusar desatualização. O dia da coleta é o do fuso
 * do relatório (lib/fuso.mjs): coleta às 22h em Brasília já é o dia seguinte em UTC, e a
 * comparação em UTC acusava de velha a análise escrita na mesma noite.
 */
function staleness(curated, { collectedAt, total }) {
  const reasons = [];
  const raw = curated.generatedAt || curated.fileMtime || null;
  const coll = collectedAt ? new Date(collectedAt) : null;
  if (raw && coll && !Number.isNaN(coll.getTime())) {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim());
    const analysis = new Date(raw);
    if (!Number.isNaN(analysis.getTime())) {
      const collDay = localDay(coll);
      const older = dateOnly
        ? String(raw).trim() < collDay
        : analysis.getTime() < coll.getTime();
      if (older) reasons.push(`a análise é de ${dateOnly ? String(raw).trim() : localDay(analysis)} e a coleta, de ${collDay}`);
    }
  }
  if (curated.traceTotal !== null && curated.traceTotal !== undefined && curated.traceTotal !== total) {
    reasons.push(`a análise foi feita sobre uma matriz de ${curated.traceTotal} itens e a desta coleta tem ${total}`);
  }
  return { reasons };
}

/** Item com teste que falha, com a causa da triagem casada pelo código do item no nome do caso. */
function failingEntry(r, findings) {
  const failedCases = (r.testCases || []).filter((c) => c.status === "failed").map((c) => c.name);
  const re = idPattern(r.id);
  const causes = (findings?.causes || []).filter((c) => (c.cases || []).some((name) => re.test(String(name).toUpperCase())))
    .map((c) => ({ id: c.id, label: c.label, dependsOn: c.dependsOn || null, severity: c.severity || null }));
  return {
    id: r.id, kind: r.kind, title: r.title, module: r.module || null,
    failed: r.testTotals.failed, total: r.testTotals.total,
    failedCases: failedCases.slice(0, 6),
    causes,
  };
}

/** O código como palavra: `RN-TIPOS-001` não casa dentro de `RN-TIPOS-0011`. */
function idPattern(id) {
  const esc = String(id).toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Z0-9-])${esc}([^A-Z0-9-]|$)`);
}

/** Pontos para o Dono do Produto, sem repetição, agrupados por área. */
function groupPoQuestions(curated, items) {
  if (!curated) return [];
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").replace(/^[\s.;:,–—-]+|[\s.;:,–—-]+$/g, "").trim();
  const seen = new Map();
  const push = (area, text, id = null) => {
    const k = norm(text);
    if (!k) return;
    if (seen.has(k)) { if (id) seen.get(k).ids.add(id); return; }
    seen.set(k, { area: area || NO_AREA, text: String(text).trim(), ids: new Set(id ? [id] : []) });
  };
  for (const q of curated.poQuestions || []) push(q.area, q.text);
  for (const it of items) for (const q of it.poQuestions) push(it.area, q, it.id);
  const byArea = new Map();
  for (const q of seen.values()) {
    if (!byArea.has(q.area)) byArea.set(q.area, []);
    byArea.get(q.area).push({ text: q.text, ids: [...q.ids] });
  }
  return [...byArea.entries()].map(([area, list]) => ({ area, items: list }))
    .sort((a, b) => a.area.localeCompare(b.area, "pt-BR"));
}
