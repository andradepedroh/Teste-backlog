// run-tests.mjs — detecta e EXECUTA as suítes de teste do projeto, em qualquer linguagem.
//
// Regras de ouro:
//   • Teste que falha NÃO é erro da skill: o relatório de um projeto com falhas é um
//     relatório válido (e é justamente o que o cliente precisa ver). Exit code da skill
//     só muda quando o runner não pôde ser executado.
//   • Todo runner escreve um relatório machine-readable em outputs/spec/status/tests-raw/.
//     Nada é lido do stdout "bonito" — parsing de texto humano é frágil e só entra como
//     fallback declarado.
//   • Cobertura é MEDIDA por padrão. Quando a ferramenta de cobertura não está instalada,
//     a suíte roda de novo sem cobertura e o relatório declara por que não mediu.
//   • Nada é inventado: runner não detectado = ausente do relatório, com a lista de
//     detecções tentadas registrada como aviso.
//
// Quem adiciona linguagem mexe em `test-runners.mjs`, não aqui.

import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  commandAvailable, fileExists, findByPatterns, readJson, readText, redactSecrets,
  relPosix, run, truncate, uniq,
} from "./util.mjs";
import { isTestPath } from "./languages.mjs";
import { classifyCase, KINDS, RUNNERS } from "./test-runners.mjs";
import { mergeCoverage, parseCoverageFile } from "./coverage.mjs";
import {
  parseCargoJson, parseDartJson, parseExUnitText, parseGoTestJson, parseJestJson,
  parseJUnitXml, parseK6Json, parseMinitestText, parseMochaJson, parsePlaywrightJson,
  parseTap, parseTrx, parseUnittestText, totalsOf,
} from "./parse-test-reports.mjs";

/** Diretórios normalmente podados que PRECISAM ser varridos atrás de relatório/cobertura. */
const REPORT_DIRS = ["build", "target", "test-results", "coverage", "out", "dist", "bin", "obj", "TestResults", "reports", ".nyc_output"];

function findReports(root, patterns, { maxDepth = 8, maxFiles = 12_000, allowDirs = [] } = {}) {
  return findByPatterns(root, patterns, { maxFiles, maxDepth, allowDirs: uniq([...REPORT_DIRS, ...allowDirs]) });
}

/** Resolve o wrapper do projeto (gradlew/mvnw) considerando as extensões do Windows. */
function resolveWrapper(root, base) {
  const names = process.platform === "win32" ? [`${base}.bat`, `${base}.cmd`, base] : [base, `${base}.sh`];
  for (const n of names) {
    const p = join(root, n);
    if (fileExists(p)) return p;
  }
  return null;
}

/** Detecta os runners presentes no repositório, usando o registry poliglota. */
export function detectRunners(root) {
  const pkg = readJson(join(root, "package.json")) || null;
  const deps = pkg && typeof pkg === "object"
    ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    : {};
  const scripts = (pkg && pkg.scripts) || {};

  const globCache = new Map();
  const glob = (patterns) => {
    const key = patterns.join("|");
    if (!globCache.has(key)) globCache.set(key, findByPatterns(root, patterns, { maxFiles: 10_000, maxDepth: 5 }));
    return globCache.get(key);
  };

  let testFileCache = null;
  const testFiles = () => {
    if (testFileCache) return testFileCache;
    testFileCache = findByPatterns(root, ["**/*.js", "**/*.mjs", "**/*.ts", "**/*.cjs"], { maxFiles: 6000, maxDepth: 6 })
      .filter((f) => isTestPath(relPosix(root, f)));
    return testFileCache;
  };

  const detectedIds = new Set();
  const ctx = {
    root,
    pkg,
    scripts,
    dep: (n) => Object.prototype.hasOwnProperty.call(deps, n),
    cfg: (patterns) => glob(patterns).length > 0,
    matchedFor: (patterns) => glob(patterns),
    file: (rel) => fileExists(join(root, rel)),
    anyFile: (rels, re) => rels.some((r) => { const t = readText(join(root, r)); return t !== null && re.test(t); }),
    has: (cmd) => commandAvailable(cmd),
    wrapper: (base) => resolveWrapper(root, base),
    testFileMatches: (re) => testFiles().some((f) => re.test(readText(f) || "")),
    detected: (id) => detectedIds.has(id),
  };

  const runners = [];
  const attempted = [];
  for (const r of RUNNERS) {
    let ok = false;
    try { ok = Boolean(r.detect(ctx)); } catch { ok = false; }
    attempted.push({ id: r.id, label: r.label, ecosystem: r.ecosystem, kind: r.kind, detected: ok });
    if (ok) {
      detectedIds.add(r.id);
      runners.push({ id: r.id, label: r.label, kind: r.kind, ecosystem: r.ecosystem, spec: r, ctx });
    }
  }
  return { runners, attempted, scripts, pkgPresent: Boolean(pkg), ecosystems: uniq(runners.map((r) => r.ecosystem).filter(Boolean)) };
}

/**
 * Executa os runners detectados.
 * Devolve { suites, cases, totals, byKind, coverage, warnings, executed }.
 */
/**
 * Executa as suítes de teste.
 *
 * `roots` é a lista de pastas de TESTE declaradas pelo usuário (ver resolve-scope.mjs).
 * Sem ela, procura na raiz — comportamento histórico. Com várias, a detecção e a
 * execução acontecem UMA VEZ POR PASTA, com o `cwd` do processo filho na pasta certa:
 * num escopo multi-repo cada uma tem o seu package.json, o seu gradlew e a sua suíte,
 * e rodar tudo a partir da raiz não encontraria nenhuma delas.
 */
export function runTests(root, outputsDir, opts = {}) {
  const {
    skipAll = false, skipE2E = false, timeoutMs = 900_000, coverage: wantCoverage = true,
    onlyRunners = null, installIfMissing = false, onlyKinds = null, roots = null,
  } = opts;

  const testRoots = (roots && roots.length) ? roots : [{ dir: root, label: "", rel: ".", kind: "root" }];
  const multi = testRoots.length > 1;

  const rawDir = join(outputsDir, "status", "tests-raw");
  const warnings = [];
  // A detecção agregada alimenta o quadro «frameworks procurados»; a execução usa a
  // detecção de cada pasta, para o runner rodar onde o projeto dele está.
  const perRoot = testRoots.map((r) => ({ root: r, detection: detectRunners(r.dir) }));
  const detection = mergeDetection(perRoot, multi);

  if (skipAll) {
    return {
      executed: false, skipped: "--no-tests",
      suites: [], cases: [], totals: totalsOf([]), byKind: {},
      detection,
      warnings: [{ code: "TESTS_SKIPPED", message: "Execução de testes desativada por --no-tests; nenhum resultado coletado nesta geração." }],
      coverage: preexistingCoverage(root),
    };
  }

  try { rmSync(rawDir, { recursive: true, force: true }); } catch { /* segue */ }
  mkdirSync(rawDir, { recursive: true });

  const npxAvailable = commandAvailable("npx");
  const suites = [];
  const coverageReports = [];
  let cases = [];

  for (const { root: testRoot, detection: local } of perRoot) {
  for (const runner of local.runners) {
    if (onlyRunners && !onlyRunners.includes(runner.id)) continue;
    if (onlyKinds && !onlyKinds.includes(runner.kind)) continue;
    if (skipE2E && ["funcional", "performance"].includes(runner.kind)) {
      warnings.push({ code: "E2E_SKIPPED", message: `${runner.label} (${KINDS[runner.kind]?.label}) detectado mas não executado (--skip-e2e).` });
      suites.push({ ...suiteBase(runner), executed: false, reason: "--skip-e2e" });
      continue;
    }
    if (runner.spec.build.length >= 0 && needsNpx(runner.id) && !npxAvailable) {
      warnings.push({ code: "RUNNER_UNAVAILABLE", message: `${runner.label} detectado mas npx não está no PATH — suíte não executada.` });
      suites.push({ ...suiteBase(runner), executed: false, reason: "npx ausente no PATH" });
      continue;
    }

    // Relatórios brutos em subpasta por escopo: dois repositórios com Vitest gravariam
    // no mesmo `vitest.json` e o segundo apagaria o primeiro.
    const scopedRaw = multi ? join(rawDir, slugScope(testRoot.label)) : rawDir;
    if (multi) mkdirSync(scopedRaw, { recursive: true });
    const result = executeRunner(runner, { root: testRoot.dir, rawDir: scopedRaw, timeoutMs, wantCoverage, installIfMissing });
    if (multi) {
      result.suite.scope = testRoot.label;
      result.suite.label = `${result.suite.label} · ${testRoot.label}`;
    }
    suites.push(result.suite);
    cases = cases.concat(result.cases);
    if (result.coverage) coverageReports.push(...result.coverage);

    if (result.suite.parseError) warnings.push({ code: "REPORT_UNPARSED", message: `${runner.label}: ${result.suite.parseError}` });
    if (!result.suite.executed) {
      warnings.push({ code: "RUNNER_FAILED", message: `${runner.label} não pôde ser executado: ${truncate(result.suite.reason || "motivo desconhecido", 300)}` });
    } else if (!result.cases.length) {
      warnings.push({ code: "NO_CASES_FOUND", message: `${runner.label} executou (exit ${result.suite.exitCode}) mas nenhum caso foi reportado — verifique se há testes na suíte.` });
    }
    if (result.suite.coverageSkippedReason && result.suite.executed) {
      warnings.push({ code: "COVERAGE_UNAVAILABLE", message: `${runner.label}: cobertura não medida — ${result.suite.coverageSkippedReason}` });
    }
  }
  }

  if (!detection.runners.length) {
    warnings.push({
      code: "NO_RUNNER_DETECTED",
      message: `Nenhum framework de teste detectado entre os ${detection.attempted.length} suportados. Verificados: ${detection.attempted.map((a) => a.id).join(", ")}.`,
    });
  }

  // classificação final por caso (caminho e nome refinam a natureza do runner)
  cases = cases.map((c) => ({ ...c, kind: classifyCase({ file: c.file, suite: c.suite, name: c.name, runnerKind: c.runnerKind || c.kind }) }));

  const byKind = {};
  for (const k of Object.keys(KINDS)) {
    const subset = cases.filter((c) => c.kind === k);
    if (subset.length) byKind[k] = { ...totalsOf(subset), label: KINDS[k].label, help: KINDS[k].help };
  }

  // cobertura: a produzida agora + a que já existia no repositório
  const measured = mergeCoverage(coverageReports, root);
  const coverage = measured || preexistingCoverage(root);

  return {
    executed: true,
    suites,
    cases,
    totals: totalsOf(cases),
    byKind,
    coverage,
    coverageRequested: wantCoverage,
    detection,
    warnings,
    rawDir: relPosix(root, rawDir),
  };
}

function suiteBase(runner) {
  return { id: runner.id, label: runner.label, kind: runner.kind, ecosystem: runner.ecosystem };
}

function needsNpx(id) {
  return ["vitest", "jest", "mocha", "playwright", "cypress", "wdio", "cucumber-js", "newman", "pact", "jasmine-karma"].includes(id);
}

function executeRunner(runner, { root, rawDir, timeoutMs, wantCoverage, installIfMissing }) {
  const started = new Date().toISOString();
  const buildCtx = {
    root, rawDir, wantCoverage, installIfMissing,
    execPath: process.execPath,
    has: runner.ctx.has,
    file: runner.ctx.file,
    wrapper: runner.ctx.wrapper,
    matched: runner.spec.detect && runner.ctx.matchedFor ? matchedFilesFor(runner) : [],
  };

  let plan;
  try { plan = runner.spec.build(buildCtx); } catch (e) {
    return { suite: { ...suiteBase(runner), executed: false, reason: `falha ao montar o comando: ${e && e.message}` }, cases: [] };
  }

  let exec = run(plan.cmd, plan.args, { cwd: root, timeoutMs, env: plan.env });
  let coverageSkippedReason = null;

  // Cobertura pedida mas a ferramenta não existe (c8, pytest-cov, jacoco…): repete sem
  // cobertura para não perder os RESULTADOS por causa de um extra opcional.
  //
  // A decisão de repetir tem DOIS gatilhos, e o segundo é o que importa:
  //
  //   1. a mensagem é reconhecidamente de ferramenta ausente; ou
  //   2. o comando instrumentado falhou **sem produzir relatório nenhum**.
  //
  // O gatilho estrutural existe porque casar mensagem é um jogo perdido: o texto muda
  // por versão do npx, por gerenciador e — o caso que passou despercebido — por IDIOMA
  // DO SISTEMA. Num Windows em português o `cmd` responde «'c8' não é reconhecido como
  // um comando interno», que nenhuma regex em inglês pega; o resultado era um projeto de
  // suíte verde sair no relatório com «0 casos». Se o wrapper de cobertura não devolveu
  // nem relatório nem saída, repetir sem ele é sempre a decisão certa.
  if (wantCoverage && plan.coverage && exec && !exec.ok && !exec.timedOut) {
    const missing = looksLikeMissingCoverageTool(exec);
    const empty = producedNoReport(plan, exec);
    if (missing || empty) {
      // Sem identificação da causa, o aviso NÃO repete a última linha do stderr: em
      // console traduzido ela chega com acentuação corrompida e entrega ao cliente um
      // texto ilegível. O exit code é curto, exato e não depende de codificação.
      coverageSkippedReason = missing
        ? coverageToolHint(runner.id, exec)
        : `o comando instrumentado terminou com exit ${exec.code} sem produzir relatório — testes reexecutados sem cobertura`;
      let plainPlan;
      try { plainPlan = runner.spec.build({ ...buildCtx, wantCoverage: false }); } catch { plainPlan = null; }
      if (plainPlan) {
        plan = plainPlan;
        exec = run(plan.cmd, plan.args, { cwd: root, timeoutMs, env: plan.env });
      }
    }
  }

  const parsed = readReport(plan, exec, { root, runner });
  const cases = (parsed?.cases || []).map((c) => ({ ...c, runnerId: runner.id, runnerKind: runner.kind, ecosystem: runner.ecosystem }));

  const coverage = wantCoverage && plan.coverage && !coverageSkippedReason
    ? collectCoverageFiles(plan.coverage, root)
    : [];
  if (wantCoverage && plan.coverage && !coverageSkippedReason && !coverage.length) {
    coverageSkippedReason = "o runner executou mas não produziu arquivo de cobertura legível";
  }

  const couldNotRun = Boolean(exec && (exec.spawnError || exec.timedOut)) || (!parsed && !cases.length);
  // Runner que nem conseguiu nascer não gera aviso de cobertura: o problema é o runner,
  // e dois avisos para a mesma causa confundem quem lê.
  if (couldNotRunEarly(exec, parsed, cases)) coverageSkippedReason = null;

  const suite = {
    ...suiteBase(runner),
    executed: !couldNotRun,
    exitCode: exec ? exec.code : null,
    durationMs: exec ? exec.durationMs : null,
    startedAt: started,
    command: `${plan.cmd} ${(plan.args || []).map(shortArg).join(" ")}`.trim(),
    reportPath: reportPathOf(plan, root),
    reportFormat: parsed?.usedFormat || plan.report?.format || null,
    totals: parsed?.totals || totalsOf(cases),
    parseError: parsed?.parseError || null,
    timedOut: Boolean(exec && exec.timedOut),
    coverageSkippedReason,
    reason: couldNotRun
      ? (exec && exec.timedOut
        ? `timeout de ${Math.round(timeoutMs / 1000)}s excedido`
        : redactSecrets(truncate(lastLines(exec ? (exec.stderr || exec.stdout) : "", 6), 700)) || "nenhum relatório produzido")
      : null,
    stderrTail: exec ? redactSecrets(truncate(lastLines(exec.stderr, 8), 900)) : null,
  };
  return { suite, cases, coverage };
}

function couldNotRunEarly(exec, parsed, cases) {
  return Boolean(exec && exec.spawnError) || (!parsed && !cases.length);
}

function matchedFilesFor(runner) {
  // runners que precisam do arquivo encontrado (newman, k6) declaram o padrão na detecção
  const patterns = {
    newman: ["**/*postman_collection.json", "**/collections/*.json"],
    k6: ["**/k6/*.js", "**/*.k6.js", "load-test*.js"],
  }[runner.id];
  if (!patterns) return [];
  try { return runner.ctx.matchedFor(patterns); } catch { return []; }
}

function shortArg(a) {
  const s = String(a);
  return s.length > 60 ? `${s.slice(0, 30)}…${s.slice(-20)}` : s;
}

function reportPathOf(plan, root) {
  const r = plan.report || {};
  if (r.path) return relPosix(root, r.path);
  if (r.stdoutTo) return relPosix(root, r.stdoutTo);
  if (r.baseDir) return relPosix(root, r.baseDir);
  return null;
}

/** Lê o relatório do runner conforme o formato declarado, com fallback declarado. */
function readReport(plan, exec, { root, runner }) {
  const r = plan.report;
  if (!r) return null;

  // stdout → arquivo, quando o formato é um stream
  if (r.stdoutTo && exec) writeRaw(r.stdoutTo, exec.stdout || "");
  if (r.stdoutFallback && r.path && !fileExists(r.path) && exec && /^\s*[[{]/.test(exec.stdout || "")) {
    writeRaw(r.path, exec.stdout);
  }

  const primary = parseByFormat(r.format, resolveReportPaths(r, root), { runner });
  if (primary && (primary.cases || []).length) return { ...primary, usedFormat: r.format };

  if (r.fallback) {
    const fb = r.fallback;
    if (fb.stdoutTo && exec) writeRaw(fb.stdoutTo, exec.stdout || "");
    const alt = parseByFormat(fb.format, fb.stdoutTo ? [fb.stdoutTo] : resolveReportPaths(r, root), { runner });
    if (alt && (alt.cases || []).length) return { ...alt, usedFormat: fb.format, usedFallback: true };
  }
  return primary || null;
}

function resolveReportPaths(r, root) {
  if (r.path && fileExists(r.path)) return [r.path];
  if (r.glob) {
    const base = r.baseDir || root;
    const found = findReports(base, r.glob, { allowDirs: r.allowDirs || [] });
    if (found.length) return found;
  }
  if (r.stdoutTo) return [r.stdoutTo];
  if (r.path) return [r.path];
  return [];
}

function parseByFormat(format, paths, { runner }) {
  if (!paths.length) return null;
  const o = { runner: runner.label, kind: runner.kind };
  switch (format) {
    case "jest-json": return parseJestJson(paths[0], o);
    case "playwright-json": return parsePlaywrightJson(paths[0], o);
    case "junit": return parseJUnitXml(paths, o);
    case "trx": return parseTrx(paths[0], o);
    case "go-json": return parseGoTestJson(paths[0], o);
    case "mocha-json": return parseMochaJson(paths[0], o);
    case "tap": return parseTap(paths[0], o);
    case "cargo-json": return parseCargoJson(paths[0], o);
    case "dart-json": return parseDartJson(paths[0], o);
    case "exunit-text": return parseExUnitText(paths[0], o);
    case "unittest-text": return parseUnittestText(paths[0], o);
    case "minitest-text": return parseMinitestText(paths[0], o);
    case "k6-json": return parseK6Json(paths[0], o);
    default: return null;
  }
}

function collectCoverageFiles(covSpec, root) {
  const out = [];
  const candidates = [];
  if (covSpec.path) candidates.push(covSpec.path);
  if (covSpec.dir) {
    candidates.push(...findReports(covSpec.dir, ["**/coverage-summary.json", "**/lcov.info", "**/coverage-final.json", "**/cobertura-coverage.xml"], { allowDirs: ["coverage"] }));
  }
  if (covSpec.glob) {
    candidates.push(...findReports(root, covSpec.glob, { allowDirs: covSpec.allowDirs || [] }));
  }
  for (const p of uniq(candidates)) {
    const parsed = parseCoverageFile(p);
    if (parsed && !parsed.parseError) out.push(parsed);
  }
  return out;
}

/** Cobertura que já existia no repositório (execução anterior ou pipeline de CI). */
function preexistingCoverage(root) {
  const found = findReports(root, [
    "coverage/coverage-summary.json", "coverage/coverage-final.json", "coverage/lcov.info",
    "coverage/cobertura-coverage.xml", "coverage/clover.xml", "coverage.xml", "coverage/coverage.xml",
    "coverage/.last_run.json", "coverage.json",
    "**/coverage/coverage-summary.json", "**/coverage/lcov.info", "**/coverage.xml",
    "**/target/site/jacoco/jacoco.xml", "**/build/reports/jacoco/**/*.xml",
    "**/coverage.cobertura.xml",
  ], { allowDirs: ["coverage", "target", "build", "reports", "site", "jacoco", "TestResults"] });

  const parsed = found.map((p) => parseCoverageFile(p)).filter(Boolean);
  const merged = mergeCoverage(parsed, root);
  if (!merged) return { measured: false, reason: "nenhum relatório de cobertura encontrado no repositório" };
  return { ...merged, measured: true, preexisting: true };
}

/**
 * Heurística: o runner falhou porque a FERRAMENTA DE COBERTURA não existe?
 *
 * Inclui o caso em que o próprio wrapper de cobertura não pôde ser lançado (`c8` via npx
 * num ambiente sem npx): aí o spawn falha com ENOENT antes de qualquer saída, e perder os
 * RESULTADOS DOS TESTES por causa de um extra opcional seria o pior desfecho possível.
 */
/**
 * A ferramenta de cobertura não existe neste ambiente?
 *
 * Importa acertar: um falso NEGATIVO aqui faz o relatório perder TODOS os resultados de
 * teste por causa de um extra opcional — a suíte roda sob `npx c8`, o npx aborta, e o
 * que sai é «0 casos» num projeto de suíte verde.
 *
 * As duas famílias de sinal:
 *   (a) o processo nem nasceu (spawnError / ENOENT);
 *   (b) o gerenciador recusou baixar o pacote. O `npx --no-install` moderno diz
 *       «npx canceled due to missing packages and no YES option: ["c8@12.0.0"]` — texto
 *       que não casava com nenhum padrão antigo, e era exatamente o caso mais comum.
 *
 * O segundo teste (nome de ferramenta de cobertura no texto) evita confundir com uma
 * falha legítima da suíte do cliente que por acaso mencione «unknown option».
 */
function looksLikeMissingCoverageTool(exec) {
  if (!exec || exec.ok) return false;
  if (exec.spawnError) return true;
  const t = `${exec.stderr || ""}\n${exec.stdout || ""}`.toLowerCase();
  if (/enoent|spawnsync/.test(t)) return true;

  // «not recognized» aparece traduzido conforme o idioma do Windows. O casamento é pela
  // PALAVRA distintiva, não pela frase: o `cmd` emite em cp850 e o buffer chega decodado
  // como UTF-8, então «não é reconhecido» vira «n?o ? reconhecido» — a frase inteira não
  // casa, mas «reconhecido» sobrevive intacto. A recuperação não depende desta lista
  // (ver o gatilho estrutural em executeRunner); ela existe para o AVISO sair legível.
  const notRecognized = /not recognized|reconhecido|reconoce|reconnu|erkannt/.test(t);
  const toolAbsent = notRecognized
    || /unrecognized option|unknown option|no such file or directory: c8|command not found|could not find|unknown argument|--cov|coverage is not|plugin.*cov.*not|jacoco|no such task|cannot find module 'c8'|error: unexpected argument/.test(t);
  // Recusa do npx/npm em instalar sob demanda — a skill nunca instala por conta própria.
  const npxRefused = /npx canceled|missing packages|could not determine executable to run|install for \[.*\] failed|npm error .*e404/.test(t);

  return (toolAbsent || npxRefused) && /cov|c8|nyc|jacoco|istanbul|pytest-cov/.test(t);
}

/**
 * O comando não deixou relatório algum?
 *
 * É o sinal independente de idioma e de versão que sustenta a reexecução sem cobertura.
 * Um runner que rodou de verdade sempre deixa rastro: TAP/JSON no stdout, ou o arquivo
 * de relatório no disco. Nenhum dos dois significa que o wrapper morreu antes de chamar
 * o runner — e aí os resultados não existem, não foram "perdidos na leitura".
 */
function producedNoReport(plan, exec) {
  if ((exec.stdout || "").trim()) return false;
  const r = plan.report || {};
  for (const p of [r.path, r.stdoutTo, r.fallback?.path]) {
    try { if (p && statSync(p).size > 0) return false; } catch { /* não existe */ }
  }
  return true;
}

function coverageToolHint(runnerId, exec) {
  const hint = {
    "node-test": "`c8` não está instalado (npm i -D c8) — testes reexecutados sem cobertura",
    pytest: "plugin `pytest-cov` ausente (pip install pytest-cov) — testes reexecutados sem cobertura",
    maven: "plugin JaCoCo não configurado no pom.xml — testes reexecutados sem cobertura",
    gradle: "tarefa `jacocoTestReport` não existe no build — testes reexecutados sem cobertura",
    dotnet: "coletor `XPlat Code Coverage` indisponível (coverlet.collector) — testes reexecutados sem cobertura",
    phpunit: "extensão de cobertura do PHP (Xdebug/PCOV) ausente — testes reexecutados sem cobertura",
    flutter: "cobertura indisponível nesta configuração — testes reexecutados sem cobertura",
  }[runnerId];
  return hint || `ferramenta de cobertura indisponível (${truncate(lastLines(exec?.stderr, 2), 160)}) — testes reexecutados sem cobertura`;
}

function writeRaw(path, content) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  } catch { /* o parser trata a ausência */ }
}

function lastLines(text, n) {
  return String(text || "").trim().split(/\r?\n/).slice(-n).join("\n");
}

/**
 * Reatribui o ARQUIVO de origem aos casos cujo runner não o reportou e reclassifica a
 * natureza com essa informação.
 *
 * Node 22 achata tanto o TAP quanto o JUnit do `node:test`: todo caso sai sem arquivo e
 * com `classname="test"`. Sem reatribuir, uma suíte inteira em `tests/e2e/` era contada
 * como unitária — exatamente a separação que o relatório precisa mostrar. A ponte é o
 * NOME do teste, extraído do próprio fonte por `collect-code`.
 */
export function attributeCasesToFiles(tests, code) {
  if (!tests || !tests.cases?.length) return tests;
  const index = new Map((code?.testNameIndex || []).map((e) => [e.name, e.file]));
  if (!index.size) return tests;

  let reattributed = 0;
  const cases = tests.cases.map((c) => {
    const unresolved = !c.file || /tests-raw\//.test(String(c.file)) || /\.(tap|xml|jsonl?|trx)$/i.test(String(c.file));
    if (!unresolved) return c;
    const hit = index.get((c.name || "").trim());
    if (!hit) return c;
    reattributed++;
    const file = hit;
    return { ...c, file, fileResolvedBy: "nome do teste no fonte", kind: classifyCase({ file, suite: c.suite, name: c.name, runnerKind: c.runnerKind || c.kind }) };
  });

  const byKind = {};
  for (const k of Object.keys(KINDS)) {
    const subset = cases.filter((x) => x.kind === k);
    if (subset.length) byKind[k] = { ...totalsOf(subset), label: KINDS[k].label, help: KINDS[k].help };
  }
  return { ...tests, cases, byKind, reattributedCases: reattributed };
}

export { preexistingCoverage as readCoverage, findReports };

/**
 * Junta a detecção das várias pastas de teste.
 * `runners` fica sem repetição por id (o quadro do relatório lista frameworks, não
 * execuções) e `attempted` preserva a pasta, para o leitor ver onde cada um foi
 * procurado quando o escopo tem mais de uma.
 */
function mergeDetection(perRoot, multi) {
  const runners = [];
  const attempted = [];
  for (const { root: r, detection } of perRoot) {
    for (const run of detection.runners) if (!runners.some((x) => x.id === run.id)) runners.push(run);
    for (const a of detection.attempted) {
      attempted.push(multi ? { ...a, scope: r.label, ecosystem: `${a.ecosystem} · ${r.label}` } : a);
    }
  }
  return { runners, attempted };
}

function slugScope(label) {
  return String(label || "escopo").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "escopo";
}
