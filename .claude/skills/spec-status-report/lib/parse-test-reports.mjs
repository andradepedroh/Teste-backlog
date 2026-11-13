// parse-test-reports.mjs — normalizadores dos formatos de saída dos runners.
//
// Formato normalizado (um "case" por teste, é o que o cliente lê no relatório):
//   { runner, kind: 'unit'|'e2e', suite, name, status: 'passed'|'failed'|'skipped',
//     durationMs, file, message, retries }
//
// Sem dependências externas: o parser de JUnit/TRX é regex-based, tolerante a
// atributos em qualquer ordem e a XML sem indentação.

import { readText, truncate } from "./util.mjs";

export function normalizeStatus(raw) {
  const s = String(raw || "").toLowerCase();
  if (["passed", "pass", "ok", "success", "successful", "expected"].includes(s)) return "passed";
  if (["failed", "fail", "failure", "error", "errored", "broken", "unexpected", "timedout", "timedOut"].includes(s)) return "failed";
  if (["skipped", "skip", "pending", "todo", "disabled", "ignored", "notexecuted", "inconclusive", "interrupted"].includes(s)) return "skipped";
  return s ? "failed" : "skipped";
}

/** Jest e Vitest (`--reporter=json`) compartilham o mesmo envelope. */
export function parseJestJson(path, { runner, kind }) {
  const raw = readText(path);
  if (raw === null) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return { parseError: `JSON inválido em ${path}` }; }
  const cases = [];
  for (const file of data.testResults || []) {
    const filePath = file.name || file.testFilePath || null;
    const assertions = file.assertionResults || file.testResults || [];
    if (!assertions.length && file.status) {
      cases.push({
        runner, kind, suite: shortPath(filePath), name: shortPath(filePath) || "(arquivo)",
        status: normalizeStatus(file.status), durationMs: file.endTime && file.startTime ? file.endTime - file.startTime : null,
        file: shortPath(filePath), message: truncate(stripAnsi(file.message || ""), 1200),
      });
      continue;
    }
    for (const a of assertions) {
      cases.push({
        runner,
        kind,
        suite: (a.ancestorTitles || []).join(" › ") || shortPath(filePath),
        name: a.title || a.fullName || "(sem nome)",
        status: normalizeStatus(a.status),
        durationMs: typeof a.duration === "number" ? Math.round(a.duration) : null,
        file: shortPath(filePath),
        message: truncate(stripAnsi((a.failureMessages || []).join("\n")), 1200),
      });
    }
  }
  return {
    cases,
    totals: {
      total: data.numTotalTests ?? cases.length,
      passed: data.numPassedTests ?? cases.filter((c) => c.status === "passed").length,
      failed: data.numFailedTests ?? cases.filter((c) => c.status === "failed").length,
      skipped: (data.numPendingTests || 0) + (data.numTodoTests || 0),
      suites: data.numTotalTestSuites ?? null,
      durationMs: data.startTime && data.endTime ? data.endTime - data.startTime : null,
    },
    success: data.success ?? null,
  };
}

/** Playwright `--reporter=json`. */
export function parsePlaywrightJson(path, { runner = "playwright", kind = "e2e" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return { parseError: `JSON inválido em ${path}` }; }
  const cases = [];
  const walk = (suite, trail) => {
    const title = suite.title ? [...trail, suite.title] : trail;
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const last = results[results.length - 1] || {};
        cases.push({
          runner,
          kind,
          suite: title.join(" › ") || shortPath(suite.file),
          name: spec.title || "(sem nome)",
          status: normalizeStatus(last.status || (spec.ok ? "passed" : "failed")),
          durationMs: typeof last.duration === "number" ? Math.round(last.duration) : null,
          file: shortPath(spec.file || suite.file),
          project: (test.projectName || test.projectId || null),
          retries: Math.max(0, results.length - 1),
          message: truncate(stripAnsi(last.error?.message || (last.errors || []).map((e) => e.message).join("\n") || ""), 1200),
        });
      }
    }
    for (const child of suite.suites || []) walk(child, title);
  };
  for (const s of data.suites || []) walk(s, []);
  const st = data.stats || {};
  return {
    cases,
    totals: {
      total: cases.length,
      passed: st.expected ?? cases.filter((c) => c.status === "passed").length,
      failed: (st.unexpected ?? 0) + (st.flaky ?? 0) || cases.filter((c) => c.status === "failed").length,
      skipped: st.skipped ?? cases.filter((c) => c.status === "skipped").length,
      flaky: st.flaky ?? null,
      durationMs: st.duration ? Math.round(st.duration) : null,
    },
  };
}

/** JUnit XML (pytest, cypress/mocha junit reporter, gradle, phpunit, vitest junit…). */
export function parseJUnitXml(paths, { runner, kind }) {
  const list = Array.isArray(paths) ? paths : [paths];
  const cases = [];
  let parseError = null;
  for (const p of list) {
    const raw = readText(p);
    if (raw === null) continue;
    const suiteIndex = buildSuiteIndex(raw);
    const caseRe = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
    let m;
    let matched = 0;
    while ((m = caseRe.exec(raw))) {
      matched++;
      const attrs = parseAttrs(m[1]);
      // <system-out>/<system-err> capturam o stdout do teste. Um teste que IMPRIME XML
      // (pytest com junit_logging=all, por exemplo) traria "<failure" no log e um teste
      // verde seria classificado como falho, com mensagem fabricada.
      const body = stripOutputSections(m[3] || "");
      let status = "passed";
      let message = "";
      const fail = /<(failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/.exec(body);
      const skip = /<skipped\b([^>]*?)(?:\/>|>([\s\S]*?)<\/skipped>)/.exec(body);
      if (fail) {
        status = "failed";
        const fattrs = parseAttrs(fail[2] || "");
        message = decodeXml(fattrs.message || "") || decodeXml(stripCdata(fail[3] || ""));
      } else if (skip) {
        status = "skipped";
        const sattrs = parseAttrs(skip[1] || "");
        message = decodeXml(sattrs.message || "");
      }
      cases.push({
        runner,
        kind,
        suite: attrs.classname || suiteAt(suiteIndex, m.index) || shortPath(p),
        name: attrs.name || "(sem nome)",
        status,
        durationMs: attrs.time ? Math.round(Number(attrs.time) * 1000) : null,
        file: attrs.file ? shortPath(attrs.file) : shortPath(p),
        message: truncate(stripAnsi(message), 1200),
      });
    }
    if (!matched && /<testsuite/.test(raw) === false) parseError = `XML sem <testcase> em ${p}`;
  }
  if (!cases.length && parseError) return { parseError };
  return { cases, totals: totalsOf(cases) };
}

/** `go test ./... -json` (stream de eventos JSON, um por linha). */
export function parseGoTestJson(path, { runner = "go test", kind = "unit" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const byKey = new Map();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (!ev.Test) continue;
    const key = `${ev.Package}::${ev.Test}`;
    const cur = byKey.get(key) || { runner, kind, suite: ev.Package, name: ev.Test, status: "skipped", durationMs: null, message: "" };
    if (ev.Action === "output" && cur.status === "failed") cur.message = truncate(`${cur.message}${ev.Output || ""}`, 1200);
    if (["pass", "fail", "skip"].includes(ev.Action)) {
      cur.status = normalizeStatus(ev.Action === "skip" ? "skipped" : ev.Action === "pass" ? "passed" : "failed");
      if (typeof ev.Elapsed === "number") cur.durationMs = Math.round(ev.Elapsed * 1000);
    }
    byKey.set(key, cur);
  }
  const cases = [...byKey.values()];
  return { cases, totals: totalsOf(cases) };
}

/** TRX do `dotnet test`. */
export function parseTrx(path, { runner = "dotnet test", kind = "unit" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const cases = [];
  const re = /<UnitTestResult\b([^>]*?)(\/>|>([\s\S]*?)<\/UnitTestResult>)/g;
  let m;
  while ((m = re.exec(raw))) {
    const a = parseAttrs(m[1]);
    const body = m[3] || "";
    const msg = /<Message>([\s\S]*?)<\/Message>/.exec(body);
    cases.push({
      runner,
      kind,
      suite: a.testListId ? "" : (a.computerName || ""),
      name: a.testName || "(sem nome)",
      status: normalizeStatus(a.outcome),
      durationMs: a.duration ? durationToMs(a.duration) : null,
      file: shortPath(path),
      message: truncate(decodeXml(stripCdata(msg ? msg[1] : "")), 1200),
    });
  }
  return { cases, totals: totalsOf(cases) };
}

/**
 * TAP 13 — saída padrão de `node --test` sem reporter explícito (e de qualquer runner TAP).
 * Fallback para quando o reporter junit não está disponível na versão do Node.
 */
export function parseTap(path, { runner = "node --test", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const cases = [];
  // Pilha de `# Subtest:` por indentação. No TAP do node:test o nível externo é o ARQUIVO
  // e o interno é o teste — e o reporter junit perde essa informação (classname vira
  // "test" para tudo). Sem o arquivo não dá para classificar um teste em /e2e/ como
  // funcional, que é justamente o que o relatório precisa separar.
  let subtests = [];

  for (let i = 0; i < lines.length; i++) {
    const sub = /^(\s*)#\s*Subtest:\s*(.+)$/.exec(lines[i]);
    if (sub) {
      const indent = sub[1].length;
      subtests = subtests.filter((t) => t.indent < indent);
      subtests.push({ indent, name: sub[2].trim() });
      continue;
    }

    const m = /^(\s*)(not ok|ok)\s+(\d+)\s*-?\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    let name = m[4].trim();
    let status = m[2] === "ok" ? "passed" : "failed";
    const directive = /#\s*(SKIP|TODO)\b(.*)$/i.exec(name);
    if (directive) {
      status = "skipped";
      name = name.slice(0, directive.index).trim();
    }

    let durationMs = null;
    let message = "";
    let isSuite = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*(not ok|ok)\s+\d+/.test(lines[j]) || /^\s*#\s*Subtest:/.test(lines[j])) break;
      const dur = /^\s*duration_ms:\s*([\d.]+)/.exec(lines[j]);
      if (dur) durationMs = Math.round(Number(dur[1]));
      if (/^\s*type:\s*['"]?suite['"]?\s*$/.test(lines[j])) isSuite = true;
      const err = /^\s*(?:error|failureType|stack):\s*(.*)$/.exec(lines[j]);
      if (err && status === "failed" && message.length < 800) message += `${err[1].replace(/^['"]|['"]$/g, "")}\n`;
      if (/^\s*\.\.\.\s*$/.test(lines[j]) && message) break;
    }

    // Contêiner de suíte (`describe`, ou o próprio arquivo) tem `type: 'suite'` no bloco
    // YAML. Contá-lo como caso inflava total E falhas.
    if (isSuite) { subtests = subtests.filter((t) => t.indent < indent); continue; }

    const ancestors = subtests.filter((t) => t.indent < indent);
    const fileAncestor = [...ancestors].reverse().find((t) => /[\\/]|\.[a-z]{2,4}$/i.test(t.name));
    const suiteNames = ancestors.filter((t) => t !== fileAncestor).map((t) => t.name);

    cases.push({
      runner, kind,
      suite: suiteNames.join(" › ") || (fileAncestor ? shortPath(fileAncestor.name) : ""),
      name: name || "(sem nome)",
      status, durationMs,
      file: fileAncestor ? shortPath(fileAncestor.name) : shortPath(path),
      message: truncate(stripAnsi(message.trim()), 1200),
    });
    subtests = subtests.filter((t) => t.indent < indent);
  }

  if (!cases.length) return { parseError: `saída TAP sem casos reconhecidos em ${path}` };
  return { cases, totals: totalsOf(cases) };
}

/** mocha `--reporter json`. */
export function parseMochaJson(path, { runner = "mocha", kind = "unit" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return { parseError: `JSON inválido em ${path}` }; }
  const map = (arr, status) => (arr || []).map((t) => ({
    runner, kind,
    suite: (t.fullTitle || "").replace(new RegExp(`\\s*${escapeRe(t.title || "")}$`), "").trim(),
    name: t.title || "(sem nome)",
    status,
    durationMs: typeof t.duration === "number" ? t.duration : null,
    file: shortPath(t.file),
    message: truncate(stripAnsi(t.err?.message || t.err?.stack || ""), 1200),
  }));
  const cases = [...map(data.passes, "passed"), ...map(data.failures, "failed"), ...map(data.pending, "skipped")];
  return { cases, totals: totalsOf(cases) };
}

// ——— cobertura ———

export function parseCoverage(candidates) {
  for (const p of candidates) {
    const raw = readText(p);
    if (raw === null) continue;
    if (/coverage-summary\.json$/i.test(p) || /coverage-final\.json$/i.test(p)) {
      try {
        const j = JSON.parse(raw);
        const t = j.total;
        if (t) {
          return {
            source: p, format: "istanbul",
            lines: t.lines?.pct ?? null, statements: t.statements?.pct ?? null,
            functions: t.functions?.pct ?? null, branches: t.branches?.pct ?? null,
            coveredLines: t.lines?.covered ?? null, totalLines: t.lines?.total ?? null,
          };
        }
      } catch { /* próximo candidato */ }
    }
    if (/\.xml$/i.test(p) && /<coverage\b/.test(raw)) {
      const lineRate = /line-rate="([\d.]+)"/.exec(raw);
      const branchRate = /branch-rate="([\d.]+)"/.exec(raw);
      const linesValid = /lines-valid="(\d+)"/.exec(raw);
      const linesCovered = /lines-covered="(\d+)"/.exec(raw);
      if (lineRate) {
        return {
          source: p, format: "cobertura",
          lines: Math.round(Number(lineRate[1]) * 1000) / 10,
          branches: branchRate ? Math.round(Number(branchRate[1]) * 1000) / 10 : null,
          statements: null, functions: null,
          totalLines: linesValid ? Number(linesValid[1]) : null,
          coveredLines: linesCovered ? Number(linesCovered[1]) : null,
        };
      }
    }
    if (/lcov\.info$/i.test(p)) {
      let lf = 0; let lh = 0;
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith("LF:")) lf += Number(line.slice(3)) || 0;
        if (line.startsWith("LH:")) lh += Number(line.slice(3)) || 0;
      }
      if (lf) {
        return { source: p, format: "lcov", lines: Math.round((lh / lf) * 1000) / 10, totalLines: lf, coveredLines: lh, branches: null, statements: null, functions: null };
      }
    }
  }
  return null;
}

// ——— helpers ———

export function totalsOf(cases) {
  return {
    total: cases.length,
    passed: cases.filter((c) => c.status === "passed").length,
    failed: cases.filter((c) => c.status === "failed").length,
    skipped: cases.filter((c) => c.status === "skipped").length,
    durationMs: cases.reduce((a, c) => a + (c.durationMs || 0), 0) || null,
  };
}

function parseAttrs(s) {
  const out = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(s || ""))) out[m[1] || m[3]] = m[2] !== undefined ? m[2] : m[4];
  return out;
}

/**
 * Índice de <testsuite> numa única passada. A versão anterior fazia `xml.slice(0, index)`
 * por <testcase> — num XML de 0,7 MB com 20 mil casos sem `classname`, 4,7 s contra 72 ms.
 */
function buildSuiteIndex(xml) {
  const marks = [];
  const re = /<testsuite\b([^>]*)>/g;
  let m;
  while ((m = re.exec(xml))) marks.push({ at: m.index, name: parseAttrs(m[1]).name || null });
  return marks;
}

function suiteAt(marks, index) {
  let lo = 0; let hi = marks.length - 1; let found = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (marks[mid].at <= index) { found = marks[mid]; lo = mid + 1; } else { hi = mid - 1; }
  }
  return found ? found.name : null;
}

/** Remove blocos de log capturado antes de procurar marcadores de falha. */
function stripOutputSections(body) {
  return String(body || "")
    .replace(/<system-out\b[\s\S]*?<\/system-out>/gi, "")
    .replace(/<system-err\b[\s\S]*?<\/system-err>/gi, "")
    .replace(/<system-out\b[^>]*\/>/gi, "")
    .replace(/<system-err\b[^>]*\/>/gi, "");
}

function decodeXml(s) {
  return String(s || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

function stripCdata(s) {
  return String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

export function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s || "").replace(/\u001b\[[0-9;]*m/g, "").replace(/\u001b/g, "");
}

function shortPath(p) {
  if (!p) return null;
  const norm = String(p).replace(/\\/g, "/");
  const idx = norm.search(/(src|tests?|e2e|cypress|spec|app|apps|packages)\//);
  return idx > 0 ? norm.slice(idx) : norm.split("/").slice(-3).join("/");
}

function durationToMs(d) {
  const m = /^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(String(d));
  if (!m) return null;
  return Math.round(((Number(m[1]) * 3600) + (Number(m[2]) * 60) + Number(m[3])) * 1000);
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────── parsers adicionais (poliglota) ───────────────────────

/** `cargo test -- --format json` (stream JSON por linha, Rust). */
export function parseCargoJson(path, { runner = "cargo test", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const cases = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type !== "test" || !ev.name) continue;
    if (!["ok", "failed", "ignored", "timeout"].includes(ev.event)) continue;
    const parts = String(ev.name).split("::");
    cases.push({
      runner, kind,
      suite: parts.slice(0, -1).join("::"),
      name: parts[parts.length - 1] || ev.name,
      status: normalizeStatus(ev.event === "ok" ? "passed" : ev.event === "ignored" ? "skipped" : "failed"),
      durationMs: typeof ev.exec_time === "number" ? Math.round(ev.exec_time * 1000) : null,
      file: shortPath(path),
      message: truncate(stripAnsi(ev.stdout || ""), 1200),
    });
  }
  if (!cases.length) return { parseError: `saída do cargo sem casos em formato JSON em ${path}` };
  return { cases, totals: totalsOf(cases) };
}

/** Fallback texto do cargo: linhas `test foo::bar ... ok`. */
export function parseCargoText(path, { runner = "cargo test", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const cases = [];
  const re = /^test\s+(\S+)\s+\.\.\.\s+(ok|FAILED|ignored)/gim;
  let m;
  while ((m = re.exec(raw))) {
    const parts = m[1].split("::");
    cases.push({
      runner, kind, suite: parts.slice(0, -1).join("::"), name: parts[parts.length - 1],
      status: m[2] === "ok" ? "passed" : m[2] === "ignored" ? "skipped" : "failed",
      durationMs: null, file: shortPath(path), message: "",
    });
  }
  if (!cases.length) return { parseError: `saída do cargo sem casos reconhecidos em ${path}` };
  return { cases, totals: totalsOf(cases) };
}

/** `dart test --reporter=json` / `flutter test --reporter=json` (stream por linha). */
export function parseDartJson(path, { runner = "dart test", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const tests = new Map();
  const suites = new Map();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === "suite" && ev.suite) suites.set(ev.suite.id, ev.suite.path || "");
    if (ev.type === "testStart" && ev.test) {
      if (/^loading /.test(ev.test.name || "")) continue;
      tests.set(ev.test.id, {
        runner, kind,
        suite: suites.get(ev.test.suiteID) || "",
        name: ev.test.name || "(sem nome)",
        status: "skipped", durationMs: null,
        file: shortPath(suites.get(ev.test.suiteID) || path),
        message: "",
        _start: ev.time,
      });
    }
    if (ev.type === "testDone" && tests.has(ev.testID)) {
      const t = tests.get(ev.testID);
      t.status = ev.skipped ? "skipped" : normalizeStatus(ev.result === "success" ? "passed" : "failed");
      if (typeof ev.time === "number" && typeof t._start === "number") t.durationMs = ev.time - t._start;
    }
    if (ev.type === "error" && tests.has(ev.testID)) {
      const t = tests.get(ev.testID);
      t.status = "failed";
      t.message = truncate(stripAnsi(`${ev.error || ""}\n${ev.stackTrace || ""}`), 1200);
    }
  }
  const cases = [...tests.values()].map(({ _start, ...c }) => c);
  if (!cases.length) return { parseError: `saída do dart/flutter test sem casos em ${path}` };
  return { cases, totals: totalsOf(cases) };
}

/** Saída textual do ExUnit (Elixir): "N doctests, M tests, K failures". */
export function parseExUnitText(path, { runner = "ExUnit", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const cases = [];
  // Blocos de falha: "  1) test nome (Modulo)"
  const failRe = /^\s*\d+\)\s+(test|doctest)\s+(.+?)\s+\(([^)]+)\)\s*$/gm;
  let m;
  const failed = new Set();
  while ((m = failRe.exec(raw))) {
    const rest = raw.slice(m.index + m[0].length).split(/\n\s*\d+\)\s/)[0];
    const key = `${m[3]}::${m[2]}`;
    failed.add(key);
    cases.push({
      runner, kind, suite: m[3], name: m[2], status: "failed",
      durationMs: null, file: shortPath(path), message: truncate(stripAnsi(rest.trim()), 1200),
    });
  }
  const summary = /(\d+)\s+doctests?,\s*(\d+)\s+tests?,\s*(\d+)\s+failures?(?:,\s*(\d+)\s+(?:excluded|skipped))?/i.exec(raw)
    || /(\d+)\s+tests?,\s*(\d+)\s+failures?/i.exec(raw);
  let total = null; let failures = cases.length; let skipped = 0;
  if (summary && summary.length >= 4) {
    total = Number(summary[1]) + Number(summary[2]);
    failures = Number(summary[3]);
    skipped = Number(summary[4] || 0);
  } else if (summary) {
    total = Number(summary[1]);
    failures = Number(summary[2]);
  }
  // Casos aprovados não são nomeados na saída padrão: representados agregadamente.
  if (total !== null && total > cases.length) {
    const passed = Math.max(0, total - failures - skipped);
    for (let i = 0; i < passed; i++) {
      cases.push({ runner, kind, suite: "(aprovados)", name: `teste aprovado #${i + 1}`, status: "passed", durationMs: null, file: null, message: "", aggregated: true });
    }
    for (let i = 0; i < skipped; i++) {
      cases.push({ runner, kind, suite: "(ignorados)", name: `teste ignorado #${i + 1}`, status: "skipped", durationMs: null, file: null, message: "", aggregated: true });
    }
  }
  if (!cases.length) return { parseError: `saída do ExUnit sem resumo reconhecível em ${path}` };
  return { cases, totals: totalsOf(cases), aggregated: true };
}

/** `python -m unittest -v`: linhas "nome (modulo.Classe) ... ok|FAIL|ERROR|skipped". */
export function parseUnittestText(path, { runner = "unittest", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const cases = [];
  const re = /^(\S+)\s+\(([^)]+)\)(?:\s+\.\.\.)?\s*(ok|FAIL|ERROR|skipped[^\n]*|expected failure|unexpected success)\s*$/gim;
  let m;
  while ((m = re.exec(raw))) {
    const st = m[3].toLowerCase();
    cases.push({
      runner, kind, suite: m[2], name: m[1],
      status: st.startsWith("ok") || st.startsWith("expected") ? "passed" : st.startsWith("skipped") ? "skipped" : "failed",
      durationMs: null, file: shortPath(path), message: "",
    });
  }
  if (!cases.length) return { parseError: `saída do unittest sem casos reconhecidos em ${path}` };
  return { cases, totals: totalsOf(cases) };
}

/** `rake test` (Minitest): resumo "N runs, M assertions, K failures, L errors, S skips". */
export function parseMinitestText(path, { runner = "Minitest", kind = "unitario" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  const sum = /(\d+)\s+runs?,\s*\d+\s+assertions?,\s*(\d+)\s+failures?,\s*(\d+)\s+errors?,\s*(\d+)\s+skips?/i.exec(raw);
  if (!sum) return { parseError: `saída do Minitest sem resumo em ${path}` };
  const total = Number(sum[1]); const fail = Number(sum[2]) + Number(sum[3]); const skip = Number(sum[4]);
  const cases = [];
  const failRe = /^\s*\d+\)\s+(Failure|Error):\s*\n\s*(.+?)\s*\[([^\]]+)\]/gm;
  let m;
  while ((m = failRe.exec(raw))) {
    cases.push({ runner, kind, suite: m[3], name: m[2], status: "failed", durationMs: null, file: shortPath(m[3]), message: "" });
  }
  const passed = Math.max(0, total - fail - skip);
  for (let i = 0; i < passed; i++) cases.push({ runner, kind, suite: "(aprovados)", name: `teste aprovado #${i + 1}`, status: "passed", durationMs: null, file: null, message: "", aggregated: true });
  for (let i = 0; i < skip; i++) cases.push({ runner, kind, suite: "(ignorados)", name: `teste ignorado #${i + 1}`, status: "skipped", durationMs: null, file: null, message: "", aggregated: true });
  return { cases, totals: totalsOf(cases), aggregated: true };
}

/** `k6 run --summary-export`: thresholds viram casos de performance. */
export function parseK6Json(path, { runner = "k6", kind = "performance" } = {}) {
  const raw = readText(path);
  if (raw === null) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return { parseError: `JSON inválido em ${path}` }; }
  const cases = [];
  for (const [metric, entry] of Object.entries(data.metrics || {})) {
    const th = entry.thresholds;
    if (!th) continue;
    for (const [expr, res] of Object.entries(th)) {
      const okFlag = typeof res === "boolean" ? res : res && res.ok !== false;
      cases.push({
        runner, kind, suite: metric, name: `threshold ${expr}`,
        status: okFlag ? "passed" : "failed",
        durationMs: null, file: shortPath(path),
        message: okFlag ? "" : `métrica ${metric}: ${JSON.stringify(entry.values || {}).slice(0, 300)}`,
      });
    }
  }
  if (!cases.length) return { parseError: `k6 sem thresholds declarados em ${path} (sem thresholds não há critério de aprovação)` };
  return { cases, totals: totalsOf(cases) };
}
