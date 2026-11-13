// coverage.mjs — medição de cobertura, agnóstica de linguagem.
//
// Três coberturas diferentes entram no relatório, e elas NÃO se substituem:
//
//   1. Cobertura de CÓDIGO   — % de linhas/ramos exercitados pelos testes. Vem do próprio
//                              runner (istanbul, jacoco, cobertura, lcov, coverprofile…).
//   2. Cobertura de NEGÓCIO  — % das RN/RF que têm ao menos um teste automatizado
//                              referenciando o ID. É a que o cliente entende.
//   3. Cobertura do PLANO    — % dos casos de `test-plan.md` (CT-xxx) com teste automatizado.
//
// Um projeto pode ter 90% de cobertura de código e 20% de cobertura de negócio: são
// perguntas distintas, e o relatório mostra as três lado a lado em vez de fingir que
// "cobertura" é um número só.

import { basename, dirname } from "node:path";
import { pct, readText, relPosix, uniq } from "./util.mjs";

/** Formatos reconhecidos, na ordem em que valem mais (mais detalhe primeiro). */
const DETECTORS = [
  { format: "istanbul-summary", test: (p, t) => /coverage-summary\.json$/i.test(p) && t.includes('"total"') },
  { format: "istanbul-final", test: (p) => /coverage-final\.json$/i.test(p) },
  { format: "jacoco-xml", test: (p, t) => /\.xml$/i.test(p) && /<report[\s>]/.test(t) && /counter[^>]*type="LINE"/i.test(t) },
  { format: "cobertura-xml", test: (p, t) => /\.xml$/i.test(p) && /<coverage[\s>]/.test(t) && /line-rate=/.test(t) },
  { format: "clover-xml", test: (p, t) => /\.xml$/i.test(p) && /<coverage[\s>]/.test(t) && /<metrics[^>]*statements=/.test(t) },
  { format: "lcov", test: (p, t) => /lcov\.info$/i.test(p) || (/\.info$/i.test(p) && /^SF:/m.test(t)) },
  { format: "go-profile", test: (p, t) => /\.out$/i.test(p) && /^mode:\s/m.test(t) },
  { format: "simplecov", test: (p) => /\.last_run\.json$/i.test(p) },
  { format: "coveragepy-json", test: (p, t) => /\.json$/i.test(p) && /"totals"\s*:/.test(t) && /"percent_covered"/.test(t) },
];

export function detectFormat(path, text) {
  for (const d of DETECTORS) {
    try { if (d.test(path, text)) return d.format; } catch { /* próximo */ }
  }
  return null;
}

/**
 * Lê um arquivo de cobertura e devolve
 * { format, totals: {lines, branches, functions, statements, coveredLines, totalLines}, files: [{path, pct, covered, total}] }
 */
export function parseCoverageFile(path) {
  const text = readText(path);
  if (text === null) return null;
  const format = detectFormat(path, text);
  if (!format) return null;
  try {
    switch (format) {
      case "istanbul-summary": return parseIstanbulSummary(text, path);
      case "istanbul-final": return parseIstanbulFinal(text, path);
      case "jacoco-xml": return parseJacoco(text, path);
      case "cobertura-xml": return parseCobertura(text, path);
      case "clover-xml": return parseClover(text, path);
      case "lcov": return parseLcov(text, path);
      case "go-profile": return parseGoProfile(text, path);
      case "simplecov": return parseSimplecov(text, path);
      case "coveragepy-json": return parseCoveragePyJson(text, path);
      default: return null;
    }
  } catch (e) {
    return { format, source: path, parseError: String(e && e.message) };
  }
}

function empty(format, source) {
  return { format, source, totals: { lines: null, branches: null, functions: null, statements: null, coveredLines: null, totalLines: null }, files: [] };
}

function parseIstanbulSummary(text, source) {
  const j = JSON.parse(text);
  const t = j.total || {};
  const files = Object.entries(j)
    .filter(([k]) => k !== "total")
    .map(([k, v]) => ({
      path: k,
      pct: v.lines?.pct ?? null,
      covered: v.lines?.covered ?? null,
      total: v.lines?.total ?? null,
    }));
  return {
    format: "istanbul-summary", source,
    totals: {
      lines: t.lines?.pct ?? null, branches: t.branches?.pct ?? null,
      functions: t.functions?.pct ?? null, statements: t.statements?.pct ?? null,
      coveredLines: t.lines?.covered ?? null, totalLines: t.lines?.total ?? null,
    },
    files,
  };
}

function parseIstanbulFinal(text, source) {
  const j = JSON.parse(text);
  let cov = 0; let tot = 0;
  const files = [];
  for (const [path, entry] of Object.entries(j)) {
    const counts = Object.values(entry.s || {});
    const c = counts.filter((n) => n > 0).length;
    const n = counts.length;
    cov += c; tot += n;
    files.push({ path, pct: pct(c, n), covered: c, total: n });
  }
  return {
    format: "istanbul-final", source,
    totals: { lines: pct(cov, tot), branches: null, functions: null, statements: pct(cov, tot), coveredLines: cov, totalLines: tot },
    files,
  };
}

function parseJacoco(text, source) {
  // <counter type="LINE" missed="10" covered="90"/> no nível do <report> e por <sourcefile>
  const files = [];
  const fileRe = /<sourcefile\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/sourcefile>/g;
  let m;
  while ((m = fileRe.exec(text))) {
    const c = counterOf(m[2], "LINE");
    if (c) files.push({ path: m[1], pct: pct(c.covered, c.covered + c.missed), covered: c.covered, total: c.covered + c.missed });
  }
  // total: último counter LINE fora de sourcefile (o do <report>) — soma os arquivos é mais seguro
  const sum = files.reduce((a, f) => ({ covered: a.covered + (f.covered || 0), total: a.total + (f.total || 0) }), { covered: 0, total: 0 });
  const branch = counterOf(text.replace(/<sourcefile[\s\S]*?<\/sourcefile>/g, ""), "BRANCH");
  const method = counterOf(text.replace(/<sourcefile[\s\S]*?<\/sourcefile>/g, ""), "METHOD");
  return {
    format: "jacoco-xml", source,
    totals: {
      lines: pct(sum.covered, sum.total),
      branches: branch ? pct(branch.covered, branch.covered + branch.missed) : null,
      functions: method ? pct(method.covered, method.covered + method.missed) : null,
      statements: null,
      coveredLines: sum.covered, totalLines: sum.total,
    },
    files,
  };
}

function counterOf(xml, type) {
  const re = new RegExp(`<counter[^>]*type="${type}"[^>]*>`, "gi");
  let m; let missed = 0; let covered = 0; let found = false;
  while ((m = re.exec(xml))) {
    const mm = /missed="(\d+)"/.exec(m[0]);
    const cc = /covered="(\d+)"/.exec(m[0]);
    if (mm && cc) { missed += Number(mm[1]); covered += Number(cc[1]); found = true; }
  }
  return found ? { missed, covered } : null;
}

function parseCobertura(text, source) {
  const files = [];
  const classRe = /<class\b[^>]*filename="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g;
  let m;
  while ((m = classRe.exec(text))) {
    const lines = [...m[2].matchAll(/<line\b[^>]*number="(\d+)"[^>]*hits="(\d+)"/g)];
    if (!lines.length) continue;
    const covered = lines.filter((l) => Number(l[2]) > 0).length;
    files.push({ path: m[1], pct: pct(covered, lines.length), covered, total: lines.length });
  }
  const lineRate = /<coverage[^>]*\bline-rate="([\d.]+)"/.exec(text);
  const branchRate = /<coverage[^>]*\bbranch-rate="([\d.]+)"/.exec(text);
  const valid = /lines-valid="(\d+)"/.exec(text);
  const covd = /lines-covered="(\d+)"/.exec(text);
  const sum = files.reduce((a, f) => ({ c: a.c + f.covered, t: a.t + f.total }), { c: 0, t: 0 });
  return {
    format: "cobertura-xml", source,
    totals: {
      lines: lineRate ? Math.round(Number(lineRate[1]) * 1000) / 10 : pct(sum.c, sum.t),
      branches: branchRate ? Math.round(Number(branchRate[1]) * 1000) / 10 : null,
      functions: null, statements: null,
      coveredLines: covd ? Number(covd[1]) : sum.c,
      totalLines: valid ? Number(valid[1]) : sum.t,
    },
    files,
  };
}

function parseClover(text, source) {
  const files = [];
  const fileRe = /<file\b[^>]*(?:name|path)="([^"]+)"[^>]*>([\s\S]*?)<\/file>/g;
  let m;
  while ((m = fileRe.exec(text))) {
    const metrics = /<metrics\b([^>]*)\/>/.exec(m[2]);
    if (!metrics) continue;
    const st = /statements="(\d+)"/.exec(metrics[1]);
    const cs = /coveredstatements="(\d+)"/.exec(metrics[1]);
    if (!st || !cs) continue;
    files.push({ path: m[1], pct: pct(Number(cs[1]), Number(st[1])), covered: Number(cs[1]), total: Number(st[1]) });
  }
  const sum = files.reduce((a, f) => ({ c: a.c + f.covered, t: a.t + f.total }), { c: 0, t: 0 });
  return {
    format: "clover-xml", source,
    totals: { lines: pct(sum.c, sum.t), branches: null, functions: null, statements: pct(sum.c, sum.t), coveredLines: sum.c, totalLines: sum.t },
    files,
  };
}

function parseLcov(text, source) {
  const files = [];
  let cur = null;
  let lf = 0; let lh = 0; let brf = 0; let brh = 0; let fnf = 0; let fnh = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("SF:")) { cur = { path: line.slice(3).trim(), covered: 0, total: 0 }; continue; }
    if (!cur) continue;
    if (line.startsWith("LF:")) { cur.total = Number(line.slice(3)) || 0; lf += cur.total; }
    else if (line.startsWith("LH:")) { cur.covered = Number(line.slice(3)) || 0; lh += cur.covered; }
    else if (line.startsWith("BRF:")) brf += Number(line.slice(4)) || 0;
    else if (line.startsWith("BRH:")) brh += Number(line.slice(4)) || 0;
    else if (line.startsWith("FNF:")) fnf += Number(line.slice(4)) || 0;
    else if (line.startsWith("FNH:")) fnh += Number(line.slice(4)) || 0;
    else if (line.trim() === "end_of_record") {
      cur.pct = pct(cur.covered, cur.total);
      files.push(cur);
      cur = null;
    }
  }
  return {
    format: "lcov", source,
    totals: {
      lines: pct(lh, lf), branches: brf ? pct(brh, brf) : null, functions: fnf ? pct(fnh, fnf) : null,
      statements: null, coveredLines: lh, totalLines: lf,
    },
    files,
  };
}

function parseGoProfile(text, source) {
  // mode: atomic\n<file>:<startLine>.<col>,<endLine>.<col> <numStmts> <count>
  const byFile = new Map();
  let cov = 0; let tot = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = /^(.+?):(\d+)\.\d+,(\d+)\.\d+\s+(\d+)\s+(\d+)$/.exec(line.trim());
    if (!m) continue;
    const stmts = Number(m[4]);
    const hit = Number(m[5]) > 0;
    tot += stmts;
    if (hit) cov += stmts;
    const e = byFile.get(m[1]) || { path: m[1], covered: 0, total: 0 };
    e.total += stmts;
    if (hit) e.covered += stmts;
    byFile.set(m[1], e);
  }
  const files = [...byFile.values()].map((f) => ({ ...f, pct: pct(f.covered, f.total) }));
  return {
    format: "go-profile", source,
    totals: { lines: pct(cov, tot), branches: null, functions: null, statements: pct(cov, tot), coveredLines: cov, totalLines: tot },
    files,
  };
}

function parseSimplecov(text, source) {
  const j = JSON.parse(text);
  const line = j.result?.line ?? j.result?.covered_percent ?? null;
  return {
    format: "simplecov", source,
    totals: { lines: typeof line === "number" ? Math.round(line * 10) / 10 : null, branches: null, functions: null, statements: null, coveredLines: null, totalLines: null },
    files: [],
  };
}

function parseCoveragePyJson(text, source) {
  const j = JSON.parse(text);
  const t = j.totals || {};
  const files = Object.entries(j.files || {}).map(([path, v]) => ({
    path,
    pct: v.summary?.percent_covered != null ? Math.round(v.summary.percent_covered * 10) / 10 : null,
    covered: v.summary?.covered_lines ?? null,
    total: v.summary?.num_statements ?? null,
  }));
  return {
    format: "coveragepy-json", source,
    totals: {
      lines: t.percent_covered != null ? Math.round(t.percent_covered * 10) / 10 : null,
      branches: t.percent_covered_branches != null ? Math.round(t.percent_covered_branches * 10) / 10 : null,
      functions: null, statements: null,
      coveredLines: t.covered_lines ?? null, totalLines: t.num_statements ?? null,
    },
    files,
  };
}

/**
 * Consolida vários arquivos de cobertura (monorepo, múltiplos runners) num único
 * resultado, somando por linhas quando os detalhes existem.
 */
export function mergeCoverage(reports, root) {
  const valid = reports.filter((r) => r && !r.parseError && r.totals);
  if (!valid.length) return null;

  const allFiles = [];
  for (const r of valid) {
    for (const f of r.files || []) {
      allFiles.push({ ...f, path: normalizeCoveragePath(f.path, root), format: r.format });
    }
  }
  // dedup por caminho, mantendo a maior contagem de linhas (relatório mais completo vence)
  const byPath = new Map();
  for (const f of allFiles) {
    const prev = byPath.get(f.path);
    if (!prev || (f.total || 0) > (prev.total || 0)) byPath.set(f.path, f);
  }
  const files = [...byPath.values()];

  const sum = files.reduce((a, f) => ({ c: a.c + (f.covered || 0), t: a.t + (f.total || 0) }), { c: 0, t: 0 });
  const weighted = sum.t ? pct(sum.c, sum.t) : null;

  // Quando nenhum relatório traz detalhe por arquivo, usa a média dos totais declarados.
  const declared = valid.map((r) => r.totals.lines).filter((n) => typeof n === "number");
  const lines = weighted !== null ? weighted : (declared.length ? Math.round((declared.reduce((a, b) => a + b, 0) / declared.length) * 10) / 10 : null);

  const pickMax = (key) => {
    const vals = valid.map((r) => r.totals[key]).filter((n) => typeof n === "number");
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  return {
    measured: true,
    formats: uniq(valid.map((r) => r.format)),
    sources: valid.map((r) => (root ? relPosix(root, r.source) : r.source)),
    lines,
    branches: pickMax("branches"),
    functions: pickMax("functions"),
    statements: pickMax("statements"),
    coveredLines: sum.t ? sum.c : valid.map((r) => r.totals.coveredLines).find((n) => typeof n === "number") ?? null,
    totalLines: sum.t || (valid.map((r) => r.totals.totalLines).find((n) => typeof n === "number") ?? null),
    fileCount: files.length,
    files: files.sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101)),
    byDirectory: aggregateByDirectory(files),
    uncovered: files.filter((f) => (f.pct ?? 100) === 0).slice(0, 40),
    worst: files.filter((f) => f.pct !== null && f.pct < 60).slice(0, 30),
  };
}

function normalizeCoveragePath(p, root) {
  let s = String(p || "").replace(/\\/g, "/");
  if (root) {
    const r = String(root).replace(/\\/g, "/").replace(/\/$/, "");
    if (s.startsWith(`${r}/`)) s = s.slice(r.length + 1);
  }
  return s.replace(/^\.\//, "");
}

function aggregateByDirectory(files) {
  const m = new Map();
  for (const f of files) {
    const dir = dirname(f.path) === "." ? "(raiz)" : dirname(f.path).split("/").slice(0, 3).join("/");
    const e = m.get(dir) || { dir, covered: 0, total: 0, files: 0 };
    e.covered += f.covered || 0;
    e.total += f.total || 0;
    e.files++;
    m.set(dir, e);
  }
  return [...m.values()]
    .map((e) => ({ ...e, pct: pct(e.covered, e.total) }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

/**
 * Cobertura de NEGÓCIO: quantos itens de negócio (RN/RF/RNF/PR) têm teste automatizado.
 * Derivada da matriz de rastreabilidade, não de arquivo de cobertura.
 */
export function businessCoverage(traceRows) {
  const rows = traceRows || [];
  const byKind = {};
  for (const r of rows) {
    const k = r.kind || "OUTRO";
    const e = byKind[k] || { kind: k, total: 0, comTeste: 0, comTestePassando: 0, semTeste: [], semImplementacao: [] };
    e.total++;
    if (r.testTotals?.total) {
      e.comTeste++;
      if (!r.testTotals.failed) e.comTestePassando++;
    } else {
      e.semTeste.push({ id: r.id, title: r.title, status: r.status });
    }
    if (r.status === "unmapped" || r.status === "planned") e.semImplementacao.push({ id: r.id, title: r.title });
    byKind[k] = e;
  }
  const list = Object.values(byKind).map((e) => ({ ...e, pct: pct(e.comTeste, e.total) }));
  const total = rows.length;
  const comTeste = rows.filter((r) => r.testTotals?.total).length;
  const comTestePassando = rows.filter((r) => r.testTotals?.total && !r.testTotals.failed).length;
  return {
    total,
    comTeste,
    comTestePassando,
    pct: pct(comTeste, total),
    pctPassando: pct(comTestePassando, total),
    byKind: list.sort((a, b) => a.kind.localeCompare(b.kind)),
  };
}

/**
 * Cobertura do PLANO DE TESTES: casos CT-xxx do test-plan.md que têm teste automatizado
 * citando o ID. Responde “o roteiro de homologação está automatizado?”.
 */
export function testPlanCoverage(planCases, idToCases) {
  const plan = planCases || [];
  if (!plan.length) return null;
  const index = idToCases instanceof Map ? idToCases : new Map();
  const rows = plan.map((p) => {
    const cases = index.get(String(p.id).toUpperCase()) || [];
    const failed = cases.filter((c) => c.status === "failed").length;
    return {
      ...p,
      automated: cases.length > 0,
      matchedBy: cases[0]?.matchedBy || null,
      cases: cases.slice(0, 6).map((c) => ({ name: c.name, status: c.status, runner: c.runner, kind: c.kind })),
      status: cases.length ? (failed ? "falhando" : "automatizado") : "manual",
    };
  });
  const automated = rows.filter((r) => r.automated).length;
  return {
    total: rows.length,
    automated,
    pct: pct(automated, rows.length),
    falhando: rows.filter((r) => r.status === "falhando").length,
    rows,
  };
}

/** Rótulo de risco para uma porcentagem de cobertura. */
export function coverageLevel(p) {
  if (p === null || p === undefined) return "desconhecida";
  if (p >= 80) return "boa";
  if (p >= 60) return "aceitável";
  if (p >= 30) return "baixa";
  return "crítica";
}

export { basename };
