// bug-modules.mjs — bugs por módulo, a partir do que o tracker registra.
//
// ─────────────────────────────────────────────────────────────────────────────
// A PERGUNTA QUE ESTE ARQUIVO RESPONDE
//
// «Em que parte do sistema estão os bugs, e quantos seguem abertos?» O tracker quase
// nunca diz o módulo do bug no próprio card: ele está na tag de um card, no prefixo do
// título de outro, na história-pai de um terceiro. A atribuição segue uma ordem FIXA de
// pistas, a primeira que achar vence, e cada bug guarda qual regra decidiu — é isso que
// deixa a contagem auditável na tabela de apoio:
//
//   1. mapa manual (`status/bug-module-map.json`) — decisão humana registrada;
//   2. tag `MOD-XXX` no card (mais de uma tag → o bug conta em cada módulo);
//   3. código `MOD-XXX` no título, ou prefixo entre colchetes (`[CAD - Clientes]`)
//      resolvido contra a lista de módulos, pelo nome ou pela sigla;
//   4. a cadeia de pais até a Epic, aplicando 2 e 3 em cada nível — e, na Epic com
//      `epic-json:EPIC-XXX`, o módulo que o `tasks.json` dá para ela;
//   5. subnível do `System.AreaPath` que corresponda a um módulo;
//   6. nenhuma pista: «Sem módulo identificado», que vira barra própria.
//
// O QUE NUNCA ACONTECE: atribuir módulo por semelhança de palavras do título. «Ajustes
// no formulário de produtos» não diz de que módulo é, e adivinhar pela palavra
// «formulário» produziria um gráfico que parece medido e não é. Prefixo entre colchetes só
// vale quando bate EXATAMENTE com a sigla ou o nome de um módulo; empate entre dois módulos
// também não decide nada.
// ─────────────────────────────────────────────────────────────────────────────

import { isProductDefect } from "./collect-extras.mjs";
import { DEFAULT_BUG_TYPES } from "./collect-azure.mjs";
import { pct } from "./util.mjs";
import { localDay } from "./fuso.mjs";
import { canonical, knownModules, moduleLabel, modulesInText, resolveName, stripRequirementSuffix } from "./module-codes.mjs";

export { knownModules };

const DAY = 86400000;

export const NO_MODULE = "__sem-modulo__";
export const NO_MODULE_LABEL = "Sem módulo identificado";

/** As seis regras, na ordem em que são tentadas. `key` é o que cada bug guarda. */
export const BUG_RULES = [
  { n: 1, key: "mapa", label: "mapa manual" },
  { n: 2, key: "tag", label: "tag MOD-XXX" },
  { n: 3, key: "titulo", label: "título" },
  { n: 4, key: "ancestral", label: "item-pai" },
  { n: 5, key: "area", label: "área" },
  { n: 6, key: "nenhuma", label: "sem pista" },
];

/** Tag de módulo: exatamente `MOD-XXX`, em maiúsculas — `mod-home` não é o formato. */
const MOD_TAG = /^MOD-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const EPIC_JSON = /^epic-json:(EPIC-[A-Z0-9-]+)$/i;
const BUSINESS_ID = /\b(?:RNF|RN-NOVO|RN|RF|PR)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;

export function analyzeBugs({
  azure, tasks = null, business = null, bugTypes = DEFAULT_BUG_TYPES,
  moduleMap = null, findings = null, traceRows = [],
} = {}) {
  if (!azure || !azure.available || !Array.isArray(azure.items)) return null;
  const declared = typeList(bugTypes);
  const types = new Set(declared.map((t) => t.toLowerCase()));
  const bugs = azure.items.filter((i) => types.has(String(i.type || "").trim().toLowerCase()));
  if (!bugs.length) return null;

  const known = knownModules({ business, tasks });
  const epicMods = new Map((tasks?.epics || []).map((e) => [String(e.id || "").toUpperCase(), e.modules || []]));
  const byId = new Map([...(azure.ancestors || []), ...azure.items].map((i) => [String(i.id), i]));
  const manual = (moduleMap && moduleMap.map) || {};
  const refTime = Date.parse(azure.collectedAt) || Date.now();
  const warnings = [];

  const records = bugs.map((b) => {
    const a = attribute(b, { known, epicMods, byId, manual });
    const open = b.category !== "done" && b.category !== "removed";
    return {
      id: b.id,
      title: b.title,
      type: b.type,
      state: b.state,
      category: b.category,
      open,
      removed: b.category === "removed",
      createdDate: b.createdDate || null,
      closedDate: b.closedDate || null,
      severity: b.severity || null,
      priority: b.priority ?? null,
      url: b.url || null,
      modules: a.modules,
      rule: a.rule,
      evidence: a.evidence,
      ageDays: open && Number.isFinite(Date.parse(b.createdDate)) ? Math.max(0, Math.floor((refTime - Date.parse(b.createdDate)) / DAY)) : null,
    };
  });

  const unknownMapIds = Object.keys(manual).filter((id) => !bugs.some((b) => String(b.id) === id));
  if (unknownMapIds.length) {
    warnings.push({ code: "BUG_MODULE_MAP_UNKNOWN_ID", message: `bug-module-map.json cita ${unknownMapIds.length} item(ns) que não estão entre os bugs coletados (${unknownMapIds.slice(0, 12).join(", ")}${unknownMapIds.length > 12 ? "…" : ""}) — essas linhas foram ignoradas.` });
  }

  const severityAvailable = records.some((r) => r.severity);
  if (!severityAvailable) {
    warnings.push({ code: "BUG_SEVERITY_ABSENT", message: "Os bugs coletados não têm o campo de severidade (Microsoft.VSTS.Common.Severity) preenchido — a coluna de abertos por severidade não foi montada." });
  }

  const testDefects = crossTestDefects(findings, known, traceRows);
  const modules = aggregateModules(records, known, testDefects);

  const attribution = Object.fromEntries(BUG_RULES.map((r) => [r.key, 0]));
  for (const r of records) attribution[r.rule]++;
  const multi = records.filter((r) => r.modules.length > 1);

  const weekly = weeklyEvolution(records);

  return {
    types: [...types].map((t) => declared.find((x) => x.toLowerCase() === t) || t),
    total: records.length,
    open: records.filter((r) => r.open).length,
    closed: records.filter((r) => !r.open).length,
    removed: records.filter((r) => r.removed).length,
    closedWithoutDate: records.filter((r) => !r.open && !r.removed && !Number.isFinite(Date.parse(r.closedDate))).length,
    severityAvailable,
    rules: BUG_RULES,
    attribution,
    multiModule: { bugs: multi.length, extraCounts: multi.reduce((a, r) => a + r.modules.length - 1, 0), ids: multi.map((r) => r.id) },
    modules,
    weekly: weekly.weeksWithData >= 4 ? weekly : null,
    weeksWithData: weekly.weeksWithData,
    testDefects,
    knownModules: known.size,
    collectedAt: azure.collectedAt || null,
    items: records,
    warnings,
  };
}

/** Tipos de bug como foram declarados: lista ou texto separado por vírgula («Bug, Defeito»). */
function typeList(list) {
  const arr = (Array.isArray(list) ? list : String(list || "").split(","))
    .map((t) => String(t).trim()).filter(Boolean);
  return arr.length ? arr : [...DEFAULT_BUG_TYPES];
}

/* A lista de módulos conhecidos, a forma canônica de um código e a resolução de nome ou
   sigla moram em module-codes.mjs — a aba «O que falta testar» agrupa pela mesma regra. */

/* ───────────────────────── as pistas de um card ───────────────────────── */

function tagClue(node, known) {
  const mods = [...new Set((node.tags || []).map((t) => String(t).trim()).filter((t) => MOD_TAG.test(t)).map((t) => canonical(t, known)))];
  return mods.length ? { mods, evidence: `tag ${mods.join(", ")}` } : null;
}

function titleClue(node, known) {
  const title = String(node.title || "");
  const found = modulesInText(title, known);
  if (found.length) {
    const mods = [...new Set(found.map((f) => f.code))];
    return { mods, evidence: `título cita ${[...new Set(found.map((f) => f.cited))].join(", ")}` };
  }
  const br = /^\s*\[([^\]]+)\]/.exec(title);
  if (br) {
    const code = resolveName(br[1], known);
    if (code) return { mods: [code], evidence: `prefixo «[${br[1].trim()}]» do título` };
  }
  return null;
}

function epicJsonClue(node, epicMods) {
  for (const t of node.tags || []) {
    const m = EPIC_JSON.exec(String(t).trim());
    if (!m) continue;
    const mods = epicMods.get(m[1].toUpperCase()) || [];
    if (mods.length) return { mods, evidence: `épica ${m[1].toUpperCase()} no tasks.json` };
  }
  return null;
}

function describe(node) {
  return `#${node.id}${node.type ? ` (${node.type})` : ""}`;
}

/** A primeira regra que achar vence. Devolve os módulos, a regra e a pista que decidiu. */
export function attribute(bug, { known, epicMods = new Map(), byId = new Map(), manual = {} }) {
  const mapped = manual[String(bug.id)];
  if (mapped && mapped.length) {
    return { modules: [...new Set(mapped.map((m) => (MOD_TAG.test(String(m).toUpperCase()) ? canonical(m, known) : String(m))))], rule: "mapa", evidence: "bug-module-map.json" };
  }

  const tag = tagClue(bug, known);
  if (tag) return { modules: tag.mods, rule: "tag", evidence: tag.evidence };

  const title = titleClue(bug, known);
  if (title) return { modules: title.mods, rule: "titulo", evidence: title.evidence };

  // 4 — a cadeia de pais, até a Epic. Ciclo de vínculo existe em campo (épica filha de um
  // bug), por isso o conjunto de visitados e o limite de profundidade.
  const seen = new Set([String(bug.id)]);
  let pid = bug.parentId;
  for (let depth = 0; pid !== null && pid !== undefined && depth < 10; depth++) {
    const node = byId.get(String(pid));
    if (!node || seen.has(String(node.id))) break;
    seen.add(String(node.id));
    const clue = tagClue(node, known) || titleClue(node, known) || epicJsonClue(node, epicMods);
    if (clue) return { modules: clue.mods, rule: "ancestral", evidence: `${describe(node)}: ${clue.evidence}` };
    if (/^epic$/i.test(node.type || "")) break;
    pid = node.parentId;
  }

  // 5 — subnível da área, do mais fundo para o mais raso. O primeiro nível é o projeto.
  const levels = String(bug.areaPath || "").split(/[\\/]+/).map((s) => s.trim()).filter(Boolean);
  for (let i = levels.length - 1; i >= 1; i--) {
    const lv = levels[i];
    const code = MOD_TAG.test(lv.toUpperCase()) ? canonical(lv, known) : resolveName(lv, known);
    if (code) return { modules: [code], rule: "area", evidence: `área «${levels.slice(0, i + 1).join("\\")}»` };
  }

  return { modules: [], rule: "nenhuma", evidence: null };
}

/* ───────────────────────── agregação ───────────────────────── */


function aggregateModules(records, known, testDefects) {
  const map = new Map();
  const slot = (key) => {
    if (!map.has(key)) {
      map.set(key, {
        key,
        code: key === NO_MODULE ? null : key,
        label: key === NO_MODULE ? NO_MODULE_LABEL : moduleLabel(key, known),
        none: key === NO_MODULE,
        open: 0, closed: 0, total: 0,
        severity: new Map(), ageSum: 0, ageN: 0,
        rules: Object.fromEntries(BUG_RULES.map((r) => [r.key, 0])),
      });
    }
    return map.get(key);
  };
  for (const r of records) {
    for (const key of r.modules.length ? r.modules : [NO_MODULE]) {
      const s = slot(key);
      s.total++;
      s.rules[r.rule]++;
      if (r.open) {
        s.open++;
        if (r.severity) s.severity.set(r.severity, (s.severity.get(r.severity) || 0) + 1);
        if (r.ageDays !== null) { s.ageSum += r.ageDays; s.ageN++; }
      } else {
        s.closed++;
      }
    }
  }
  // Módulo com defeito achado pelos testes e nenhum bug no tracker continua na tabela: é
  // justamente o cruzamento que o leitor quer ver. No gráfico de barras ele não entra.
  if (testDefects) for (const code of Object.keys(testDefects.byModule)) slot(code);

  return [...map.values()]
    .map((s) => ({
      key: s.key, code: s.code, label: s.label, none: s.none,
      open: s.open, closed: s.closed, total: s.total,
      bySeverity: [...s.severity.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => severityRank(a.label) - severityRank(b.label) || b.count - a.count),
      avgOpenAgeDays: s.ageN ? Math.round(s.ageSum / s.ageN) : null,
      rules: s.rules,
      testDefects: testDefects ? (testDefects.byModule[s.key] || 0) : null,
    }))
    .sort((a, b) => (a.none - b.none) || (b.open - a.open) || (b.total - a.total) || a.label.localeCompare(b.label, "pt-BR"));
}

/** «1 - Critical» antes de «3 - Medium»; sem número, ao fim, na ordem alfabética. */
function severityRank(label) {
  const m = /^\s*(\d+)/.exec(String(label || ""));
  return m ? Number(m[1]) : 99;
}

/* ───────────────────────── evolução semanal ─────────────────────────
   Abertos (pela data de criação) e fechados (pela data de fechamento) por semana do
   calendário. Só é devolvida com 4 semanas ou mais que tenham algum dado: com três pontos
   não há tendência para ler, e um gráfico de três barras convida a uma leitura que o dado
   não sustenta.

   A semana é a do calendário NO FUSO DO RELATÓRIO (lib/fuso.mjs): cada instante vira
   primeiro o dia local, e só então a segunda-feira dele. `start` sai como `AAAA-MM-DD` —
   um dia, não um instante —, para que o fmtDate não o reconverta de fuso. */

/** Instante → dia local como número (meia-noite UTC daquele dia do calendário), ou NaN. */
function localDayNum(value) {
  const day = localDay(value);
  if (!day) return NaN;
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function mondayOf(dayNum) {
  const dow = (new Date(dayNum).getUTCDay() + 6) % 7;
  return dayNum - dow * DAY;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function weekLabel(dayNum, withYear) {
  const d = new Date(dayNum);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ""}`;
}

export function weeklyEvolution(records, { maxWeeks = 52 } = {}) {
  const opened = records.map((r) => localDayNum(r.createdDate)).filter(Number.isFinite);
  const closed = records.filter((r) => !r.open).map((r) => localDayNum(r.closedDate)).filter(Number.isFinite);
  const all = [...opened, ...closed];
  const withData = new Set(all.map(mondayOf));
  if (!all.length) return { weeksWithData: 0, weeks: [] };

  const last = mondayOf(Math.max(...all));
  const first = Math.max(mondayOf(Math.min(...all)), last - (maxWeeks - 1) * 7 * DAY);
  // «22 dez» seguido de «05 jan» não diz que o ano virou: quando a janela cruza anos, todo
  // rótulo leva o ano.
  const withYear = new Date(first).getUTCFullYear() !== new Date(last).getUTCFullYear();
  const weeks = [];
  for (let t = first; t <= last; t += 7 * DAY) weeks.push({ start: t, label: weekLabel(t, withYear), opened: 0, closed: 0 });
  const idx = (t) => Math.round((mondayOf(t) - first) / (7 * DAY));
  for (const t of opened) { const i = idx(t); if (weeks[i]) weeks[i].opened++; }
  for (const t of closed) { const i = idx(t); if (weeks[i]) weeks[i].closed++; }
  return {
    weeksWithData: withData.size,
    truncated: mondayOf(Math.min(...all)) < first,
    weeks: weeks.map((w) => ({ ...w, start: new Date(w.start).toISOString().slice(0, 10) })),
  };
}

/* ───────────────────────── cruzamento com a triagem dos testes ─────────────────────────
   Fontes diferentes: os bugs são cards do tracker; os defeitos são causas de falha de
   teste que quem triou classificou como defeito de produto. O módulo de uma causa vem do
   campo declarado nela, de um código MOD-XXX no texto dela, ou do módulo dos itens de
   negócio cujo código aparece no nome dos casos — nunca do assunto do texto. */

function crossTestDefects(findings, known, traceRows) {
  const causes = (findings?.causes || []).filter(isProductDefect);
  if (!causes.length) return null;
  const rowModule = new Map((traceRows || []).filter((r) => r.module).map((r) => [r.id, canonical(stripRequirementSuffix(r.module), known)]));
  const byModule = {};
  let unattributed = 0;
  for (const c of causes) {
    const mods = new Set((c.modules || []).map((m) => canonical(stripRequirementSuffix(m), known)));
    for (const text of [c.label, c.sub, c.dependsOn]) {
      for (const f of modulesInText(text, known)) mods.add(f.code);
    }
    for (const name of c.cases || []) {
      for (const id of String(name).toUpperCase().match(BUSINESS_ID) || []) {
        if (rowModule.has(id)) mods.add(rowModule.get(id));
      }
    }
    if (!mods.size) { unattributed++; continue; }
    for (const m of mods) byModule[m] = (byModule[m] || 0) + 1;
  }
  return { total: causes.length, byModule, unattributed };
}

/* ───────────────────────── semáforo ───────────────────────── */

export const BUG_SIGNAL_AREA = "Bugs abertos";

/**
 * Abaixo deste número de bugs abertos, percentual não é leitura: 1 bug aberto num módulo
 * dava «100% concentrado» e rebaixava o projeto inteiro para «Atenção». As duas regras de
 * percentual (concentração e falta de módulo) só valem a partir daqui.
 */
export const BUG_SIGNAL_MIN_OPEN = 5;

/**
 * Sinal informativo dos bugs abertos. Com `BUG_SIGNAL_MIN_OPEN` abertos ou mais, vira
 * «atenção» quando um único módulo concentra 40% ou mais dos abertos, ou quando mais de 25%
 * dos abertos estão sem módulo identificado — e aí o motivo diz o que fazer: marcar a tag
 * MOD-XXX nos cards. O sinal entra no semáforo e, como «atenção», muda o nível geral.
 */
export function bugSignal(bugs) {
  if (!bugs) return null;
  const open = bugs.open;
  if (!open) return { level: "info", area: BUG_SIGNAL_AREA, message: `Nenhum bug aberto entre os ${bugs.total} registrados.` };
  const fmt = (n) => String(pct(n, open)).replace(".", ",");
  const top = bugs.modules.filter((m) => !m.none && m.open).sort((a, b) => b.open - a.open)[0] || null;
  const none = bugs.modules.find((m) => m.none) || null;
  const reasons = [];
  const enough = open >= BUG_SIGNAL_MIN_OPEN;
  if (enough && top && top.open / open >= 0.4) reasons.push(`${top.label} concentra ${top.open} dos ${open} abertos (${fmt(top.open)}%).`);
  if (enough && none && none.open / open > 0.25) reasons.push(`${none.open} dos abertos (${fmt(none.open)}%) estão sem módulo identificado — marque a tag MOD-XXX nos cards para que eles entrem na conta do módulo certo.`);
  return {
    level: reasons.length ? "warn" : "info",
    area: BUG_SIGNAL_AREA,
    message: `${open} ${open === 1 ? "bug aberto" : "bugs abertos"} de ${bugs.total} registrados.${reasons.length ? ` ${reasons.join(" ")}` : ""}`,
  };
}

/** Troca o sinal de bugs do semáforo e recalcula o nível — usado na coleta e no --render-only. */
export function applyBugSignal(health, bugs) {
  if (!health) return health;
  health.signals = (health.signals || []).filter((s) => s.area !== BUG_SIGNAL_AREA);
  const sig = bugSignal(bugs);
  if (sig) health.signals.push(sig);
  const level = health.signals.some((s) => s.level === "critical") ? "critical"
    : health.signals.some((s) => s.level === "warn") ? "warn" : "ok";
  health.level = level;
  health.label = { ok: "Saudável", warn: "Atenção", critical: "Ação necessária" }[level];
  return health;
}
