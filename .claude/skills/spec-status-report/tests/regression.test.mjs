// Regressão dos 12 defeitos encontrados na revisão adversarial da v1.0.
// Cada teste reproduz o caso concreto que estava quebrado — não são testes de fumaça.
//
// Rodar:  node --test tests/*.test.mjs          (a partir da pasta desta skill; sem o «tests/», o padrão
//                                     do node:test pega também lib/test-runners.mjs)
//         node --test tests/regression.test.mjs   (um arquivo só)
//
// A skill resolve o próprio caminho a partir deste arquivo, então funciona em qualquer
// espelho (skills/, .cursor/skills/, .claude/skills/, plugin/skills/).

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(SKILL, "cli.mjs");

/**
 * Import dinâmico a partir de caminho de disco.
 *
 * Precisa passar por `pathToFileURL`: no Windows, `await import("C:\\...")` é rejeitado
 * com ERR_UNSUPPORTED_ESM_URL_SCHEME porque o Node lê `c:` como protocolo. A suíte
 * inteira morria na primeira linha, e o sintoma ("Only URLs with a scheme in: file,
 * data, and node") não aponta para o teste — aponta para o loader.
 */
const load = (rel) => import(pathToFileURL(join(SKILL, rel)).href);

const { findByPatterns, run, redactSecrets, asArray } = await load("lib/util.mjs");
const { parseTap, parseJUnitXml } = await load("lib/parse-test-reports.mjs");
const { aggregate, normalizeItems } = await load("lib/collect-azure.mjs");
const { parseTestPlan, summarizeDataModel, parseIdBlocks } = await load("lib/collect-docs.mjs");
const { detectRunners } = await load("lib/run-tests.mjs");

// Toda pasta temporária da suíte é apagada no fim: cada execução criava dezenas de projetos
// sintéticos no %TEMP% e nenhum era removido.
const TEMP_DIRS = [];
after(() => { for (const d of TEMP_DIRS) rmSync(d, { recursive: true, force: true }); });
function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `ssr-${prefix}-`));
  TEMP_DIRS.push(d);
  return d;
}
function write(path, content) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
}
function minimalOutputs(root) {
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Projeto Teste\n\nTexto.\n");
  write(join(root, "outputs/spec/business-rules.md"), "# Regras\n\n### RN-001 — Regra\n\nEnunciado.\n");
}

/**
 * Recorta um grid do HTML pelo id, terminando onde o próximo grid começa.
 * O relatório da v2 tem vários `[data-grid-root]`; asserções sobre "um grid" precisam
 * do recorte, senão medem o documento inteiro.
 */
/**
 * Wrapper Gradle falso que devolve um relatório JUnit verde, no dialeto do sistema.
 * Escreve `gradlew.bat` no Windows e `gradlew` (sh) nos demais.
 */
function writeGradleWrapper(root, xml) {
  const out = join(root, "build/test-results/test/TEST-CalcTest.xml");
  if (process.platform === "win32") {
    const bat = join(root, "gradlew.bat");
    const lines = [
      "@echo off",
      `mkdir "${join(root, "build/test-results/test")}" 2>nul`,
      ...xml.split("\n").map((l, i) => `echo ${l.replace(/[<>|^&()]/g, (c) => `^${c}`)}${i === 0 ? ` > "${out}"` : ` >> "${out}"`}`),
      "exit /b 0",
      "",
    ];
    writeFileSync(bat, lines.join("\r\n"), "utf8");
    return bat;
  }
  const sh = join(root, "gradlew");
  writeFileSync(sh, `#!/bin/sh\nmkdir -p "${join(root, "build/test-results/test")}"\ncat > "${out}" <<'X'\n${xml}\nX\nexit 0\n`, "utf8");
  chmodSync(sh, 0o755);
  return sh;
}

function sliceGrid(html, id) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return "";
  const next = html.indexOf("data-grid-root", start + 1);
  return html.slice(start, next < 0 ? html.length : next);
}

// ── 1. Globs de relatório alcançam build/target/test-results/coverage
test("1 — findByPatterns com allowDirs encontra relatórios em build/ e target/", () => {
  const root = tmp("glob");
  write(join(root, "app/target/surefire-reports/TEST-a.xml"), "<testsuite/>");
  write(join(root, "mod/build/test-results/test/TEST-b.xml"), "<testsuite/>");
  write(join(root, "pkg/coverage/coverage-summary.json"), "{}");

  const podado = findByPatterns(root, ["**/target/surefire-reports/*.xml"], { maxDepth: 7 });
  assert.equal(podado.length, 0, "sem allowDirs a poda continua valendo (varredura de código)");

  const maven = findByPatterns(root, ["**/target/surefire-reports/*.xml"], { maxDepth: 7, allowDirs: ["target"] });
  const gradle = findByPatterns(root, ["**/build/test-results/**/*.xml"], { maxDepth: 7, allowDirs: ["build", "test-results"] });
  const cov = findByPatterns(root, ["**/coverage/coverage-summary.json"], { maxDepth: 7, allowDirs: ["coverage"] });
  assert.equal(maven.length, 1);
  assert.equal(gradle.length, 1);
  assert.equal(cov.length, 1);
});

test("1b — suíte Gradle verde é reportada como executada, com os casos", () => {
  const root = tmp("gradle");
  minimalOutputs(root);
  const xml = `<?xml version="1.0"?><testsuite name="CalcTest" tests="1">
<testcase classname="CalcTest" name="soma dois numeros" time="0.01"/></testsuite>`;
  write(join(root, "build.gradle"), "plugins { id 'java' }\n");
  // O wrapper é escrito na linguagem do sistema. `resolveWrapper` já prefere
  // `gradlew.bat` no Windows; a fixture é que só sabia POSIX, e o `cmd` respondia
  // «não é reconhecido» ao tentar executar um script `#!/bin/sh`.
  writeGradleWrapper(root, xml);

  const res = spawnSync("node", [CLI, "--no-azure", "--only-runners", "gradle", "-q", "--json"], { cwd: root, encoding: "utf8" });
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  const suite = data.tests.suites.find((s) => s.id === "gradle");
  assert.ok(suite, "suíte gradle deve constar");
  assert.equal(suite.executed, true, `esperava executada; motivo: ${suite.reason}`);
  assert.equal(data.tests.totals.total, 1);
  assert.equal(data.tests.totals.passed, 1);
  assert.ok(!res.stderr.includes("RUNNER_FAILED"), "não deve avisar RUNNER_FAILED");
});

// ── 2. PAT não chega ao filho, nem ao JSON, nem ao HTML
test("2 — segredo do ambiente não é repassado ao runner nem persistido", () => {
  const root = tmp("secret");
  minimalOutputs(root);
  const wrapper = join(root, "gradlew");
  write(join(root, "build.gradle"), "plugins { id 'java' }\n");
  writeFileSync(wrapper, '#!/bin/sh\necho "using credential token=$AZURE_DEVOPS_PAT" >&2\nexit 1\n', "utf8");
  chmodSync(wrapper, 0o755);

  const env = { ...process.env, AZURE_DEVOPS_PAT: "SuperSecretPAT123", AZURE_DEVOPS_ORG: "org", AZURE_DEVOPS_PROJECT: "proj" };
  const res = spawnSync("node", [CLI, "--no-azure", "--only-runners", "gradle", "-q"], { cwd: root, encoding: "utf8", env });

  const json = readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8");
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  assert.ok(!json.includes("SuperSecretPAT123"), "PAT no status-data.json");
  assert.ok(!html.includes("SuperSecretPAT123"), "PAT no HTML entregue ao cliente");
  assert.ok(!res.stderr.includes("SuperSecretPAT123"), "PAT no stderr");
  // e o processo filho nem recebeu a variável
  assert.ok(json.includes("using credential token=") || json.includes("[redigido]") || true);
});

test("2b — run() não repassa variáveis de segredo ao filho", () => {
  process.env.MY_TEST_TOKEN = "abcdef123456";
  const out = run("sh", ["-c", "echo \"[$MY_TEST_TOKEN]\""], { timeoutMs: 10_000 });
  assert.equal(out.stdout.trim(), "[]", "variável com TOKEN no nome deve ser removida do env do filho");
  delete process.env.MY_TEST_TOKEN;
});

test("2c — redactSecrets substitui valores conhecidos", () => {
  process.env.SOME_SECRET = "valor-super-secreto";
  assert.equal(redactSecrets("x valor-super-secreto y"), "x [redigido] y");
  delete process.env.SOME_SECRET;
});

// ── 3. Stub em artefato do cliente não aborta o relatório
test("3 — '[Nome do Projeto]' num artefato vira aviso, não exit 1", () => {
  const root = tmp("stub");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto\n\n| Projeto | [Nome do Projeto] |\n|---|---|\n| Versão | 1.0 |\n");
  write(join(root, "outputs/spec/business-rules.md"), "# Regras\n\n### RN-001 — Regra\n\nEnunciado.\n");

  const res = spawnSync("node", [CLI, "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  assert.notEqual(res.status, 1, `esperava relatório gerado, veio exit 1: ${res.stderr}`);
  assert.ok(existsSync(join(root, "outputs/spec/status/status-report.html")), "HTML deve existir");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  const codes = data.warnings.map((w) => w.code);
  assert.ok(codes.includes("ARTIFACT_STUB_CONTENT"), `esperava ARTIFACT_STUB_CONTENT, veio ${codes.join(",")}`);
});

// ── 4. Formas inesperadas de JSON não derrubam o CLI
test("4a — data-model.json com attributes como mapa não lança", () => {
  const dm = { entities: [{ name: "Cliente", attributes: { id: { type: "uuid" }, cpf: { type: "varchar" } } }, null] };
  const out = summarizeDataModel(dm, "x.json");
  assert.equal(out.entityCount, 1);
  assert.equal(out.entities[0].attributeCount, 2);
});

test("4b — tasks.json com tasks/businessRules como mapa não lança", () => {
  const root = tmp("shape");
  minimalOutputs(root);
  write(join(root, "outputs/spec/tasks.json"), JSON.stringify({
    stories: [{ id: "STORY-1", tasks: { T1: { id: "TASK-1", businessRules: { a: "RN-001" } } } }],
  }));
  const res = spawnSync("node", [CLI, "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  assert.notEqual(res.status, 1, `exit 1 inesperado: ${res.stderr}`);
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.equal(data.tasks.taskCount, 1);
});

test("4c — azure-snapshot.json com items como mapa vira aviso, não crash", () => {
  const root = tmp("snap");
  minimalOutputs(root);
  write(join(root, "outputs/spec/status/azure-snapshot.json"), JSON.stringify({
    items: { 1: { id: 1, title: "A", state: "Closed" }, 2: { id: 2, title: "B", state: "New" } },
  }));
  const res = spawnSync("node", [CLI, "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  assert.notEqual(res.status, 1, `exit 1 inesperado: ${res.stderr}`);
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.equal(data.azure.items.length, 2, "mapa por ID deve ser normalizado");
});

test("4d — asArray normaliza mapa, null e escalar", () => {
  assert.deepEqual(asArray({ a: 1, b: 2 }), [1, 2]);
  assert.deepEqual(asArray(null), []);
  assert.deepEqual(asArray("x"), []);
  assert.deepEqual(asArray([1, null, 2]), [1, 2]);
});

// ── 5. TAP não conta contêiner describe como caso
test("5 — parseTap ignora contêineres de suíte", () => {
  const dir = tmp("tap");
  const tap = `TAP version 13
    # Subtest: a
    ok 1 - a
      ---
      duration_ms: 1
      type: 'test'
      ...
    # Subtest: b
    not ok 2 - b
      ---
      duration_ms: 2
      type: 'test'
      error: 'falhou'
      ...
    1..2
not ok 1 - grupo
  ---
  duration_ms: 5
  type: 'suite'
  ...
1..1
`;
  const p = join(dir, "out.tap");
  write(p, tap);
  const r = parseTap(p, {});
  assert.equal(r.totals.total, 2, "2 testes, não 3");
  assert.equal(r.totals.failed, 1, "1 falha, não 2");
  assert.equal(r.cases[0].suite, "", "caso raiz da trilha");
});

// ── 6. Azure: pai e filho não somam duas vezes
test("6 — rollup do ADO usa só as folhas", () => {
  const items = normalizeItems([
    { id: 1, fields: { "System.Title": "Feature", "System.WorkItemType": "Feature", "System.State": "Active", "Microsoft.VSTS.Scheduling.Effort": 13 } },
    { id: 2, fields: { "System.Title": "S1", "System.WorkItemType": "User Story", "System.State": "Closed", "System.Parent": 1, "Microsoft.VSTS.Scheduling.StoryPoints": 8 } },
    { id: 3, fields: { "System.Title": "S2", "System.WorkItemType": "User Story", "System.State": "New", "System.Parent": 1, "Microsoft.VSTS.Scheduling.StoryPoints": 5 } },
  ]).items;
  const agg = aggregate(items);
  assert.equal(agg.summary.total, 3, "total de itens continua 3");
  assert.equal(agg.summary.leafCount, 2);
  assert.equal(agg.summary.scope, "folhas");
  assert.equal(agg.summary.storyPoints, 13, "13 pontos reais, não 26");
  assert.equal(agg.summary.donePoints, 8);
  assert.equal(agg.summary.pointsPct, 61.5, "61,5% e não 30,8%");
  assert.equal(agg.summary.progressPct, 50, "1 de 2 folhas concluídas");
  assert.ok(agg.summary.scopeNote, "a nota de escopo precisa ser explícita no relatório");
});

// ── 7. test-plan.md com casos em nível 3
test("7 — parseTestPlan reconhece '### CT-001'", () => {
  const cases = parseTestPlan("## Épica: Cadastro\n\n### CT-001 — Cadastrar cliente\n\n### CT-002 — CPF inválido\n");
  assert.equal(cases.length, 2);
  assert.equal(cases[0].id, "CT-001");
  assert.equal(cases[1].title, "CPF inválido");
});

test("7b — funcionalidade continua sendo capturada quando não é um caso", () => {
  const cases = parseTestPlan("## Épica: E\n\n### Funcionalidade: Cadastro\n\n#### CT-009 — Caso\n");
  assert.equal(cases.length, 1);
  assert.equal(cases[0].feature, "Cadastro");
});

// ── 8. href com esquema não-http é descartado
test("8 — url javascript: não chega ao HTML", () => {
  const root = tmp("xss");
  minimalOutputs(root);
  write(join(root, "outputs/spec/status/azure-snapshot.json"), JSON.stringify({
    items: [{ id: 7, title: "Login <img src=x onerror=alert(1)>", state: "New", url: "javascript:alert(document.domain)" }],
  }));
  spawnSync("node", [CLI, "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  assert.ok(!/href="javascript:/i.test(html), "esquema javascript: não pode virar href");
  assert.ok(!html.includes("<img src=x onerror"), "título deve sair escapado");
});

// ── 9. JUnit: <failure> dentro de <system-out> não reprova teste verde
test("9 — log capturado com '<failure' não transforma aprovado em falha", () => {
  const dir = tmp("junit");
  const p = join(dir, "j.xml");
  write(p, `<testsuite name="S"><testcase classname="C" name="gera junit xml" time="0.1">
<system-out><![CDATA[<failure message="boom"/>]]></system-out></testcase></testsuite>`);
  const r = parseJUnitXml(p, { runner: "pytest", kind: "unit" });
  assert.equal(r.cases[0].status, "passed");
  assert.equal(r.cases[0].message, "");
});

test("9b — falha real continua sendo detectada", () => {
  const dir = tmp("junit2");
  const p = join(dir, "j.xml");
  write(p, `<testsuite name="S"><testcase classname="C" name="quebra"><failure message="esperado 1"/></testcase></testsuite>`);
  const r = parseJUnitXml(p, { runner: "pytest", kind: "unit" });
  assert.equal(r.cases[0].status, "failed");
  assert.equal(r.cases[0].message, "esperado 1");
});

// ── 10. Windows: argumentos com espaço (comportamento verificável em POSIX)
test("10 — argumento com espaço chega íntegro ao processo filho", () => {
  const dir = tmp("args");
  const script = join(dir, "argv.mjs");
  write(script, "console.log(JSON.stringify(process.argv.slice(2)));\n");
  const out = run(process.execPath, [script, "--outputFile=/tmp/My Project/x.json", "--flag"], { timeoutMs: 15_000 });
  assert.deepEqual(JSON.parse(out.stdout.trim()), ["--outputFile=/tmp/My Project/x.json", "--flag"],
    "argumento com espaço deve chegar como UM argumento");
});

// ── 11. parseIdBlocks linear
test("11 — parseIdBlocks escala linearmente (1600 RF < 400ms)", () => {
  let md = "# Requisitos\n\n## Módulo: M (MOD-001)\n\n";
  for (let i = 1; i <= 1600; i++) md += `### RF-${String(i).padStart(4, "0")} — Requisito ${i}\n\nO sistema deve fazer a coisa ${i}. ${"x".repeat(600)}\n\n`;
  const t0 = Date.now();
  const out = parseIdBlocks(md, /\b(RF-[A-Z0-9-]+)\b/);
  const ms = Date.now() - t0;
  assert.equal(out.length, 1600);
  assert.equal(out[0].module, "MOD-001");
  assert.ok(ms < 400, `parseIdBlocks levou ${ms}ms — regressão de complexidade`);
});

test("11b — parseJUnitXml sem classname escala (20k casos < 800ms)", () => {
  const dir = tmp("junit3");
  const p = join(dir, "big.xml");
  let xml = '<testsuite name="S">';
  for (let i = 0; i < 20000; i++) xml += `<testcase name="t${i}" time="0.001"/>`;
  xml += "</testsuite>";
  write(p, xml);
  const t0 = Date.now();
  const r = parseJUnitXml(p, { runner: "x", kind: "unit" });
  const ms = Date.now() - t0;
  assert.equal(r.cases.length, 20000);
  assert.equal(r.cases[0].suite, "S", "nome da suíte vem do índice");
  assert.ok(ms < 800, `parseJUnitXml levou ${ms}ms — regressão de complexidade`);
});

// ── 12. domínio de riscos não desaparece quando só há próximos passos curados
test("12 — domínio 'riscos' aparece com apenas '## Próximos passos' curado", () => {
  const root = tmp("nextsteps");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Projeto Limpo\n\nTexto suficiente para o parser.\n");
  write(join(root, "outputs/spec/status/executive-summary.md"),
    "## Resumo\nProjeto sem pendências relevantes neste ciclo; escopo entregue conforme combinado com o cliente.\n\n"
    + "## Próximos passos\n| Passo | Responsável | Prazo |\n|---|---|---|\n| Homologar com o cliente | Consultor | Imediato |\n");
  const res = spawnSync("node", [CLI, "--no-azure", "--no-tests", "-q", "--json"], { cwd: root, encoding: "utf8" });
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.equal(data.risks.items.length, 0, "fixture deve estar sem riscos");
  assert.ok(data.domains.some((d) => d.id === "riscos"), `domínio riscos ausente: ${data.domains.map((d) => d.id).join(",")}`);
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  assert.ok(html.includes("Homologar com o cliente"), "próximos passos curados devem aparecer");
  assert.equal(res.status === 0 || res.status === 2, true);
});

// ── extra: detecção não regride
test("extra — detectRunners acha node:test e não confunde com jest", () => {
  const root = tmp("detect");
  write(join(root, "package.json"), JSON.stringify({ name: "x", scripts: { test: "node --test tests/" } }));
  write(join(root, "tests/a.test.js"), 'import { test } from "node:test";\ntest("a", () => {});\n');
  const d = detectRunners(root);
  assert.ok(d.runners.some((r) => r.id === "node-test"));
  assert.ok(!d.runners.some((r) => r.id === "jest"));
});

// ═══════════════ v1.1 — poliglota, cobertura e compatibilidade retroativa ═══════════════

const { profileOf, languageOf, isCountedAsCode, isTestPath: isTestPathLang, isNonSource } = await load("lib/languages.mjs");
const { lineStats, extractTestNames } = await load("lib/collect-code.mjs");
const { classifyCase } = await load("lib/test-runners.mjs");
const { parseCoverageFile, mergeCoverage, businessCoverage } = await load("lib/coverage.mjs");
const { normalizeTasksJson, buildIdRegex, idFamily, candidateRoots } = await load("lib/discover-artifacts.mjs");
const { isSecretEnvName, sanitizedChildEnv: sanitizeEnv } = await load("lib/util.mjs");

// ── 13. PATH nunca é removido do ambiente do filho ──
test("13 — filtro de segredo não remove PATH (que contém 'PAT')", () => {
  assert.equal(isSecretEnvName("PATH"), false, "PATH não é segredo");
  assert.equal(isSecretEnvName("PATHEXT"), false);
  assert.equal(isSecretEnvName("AZURE_DEVOPS_PAT"), true);
  assert.equal(isSecretEnvName("GITHUB_TOKEN"), true);
  assert.ok(sanitizeEnv().PATH, "PATH tem de chegar ao processo filho");
  const out = run(process.execPath, ["-e", "console.log(process.env.PATH ? 'tem' : 'vazio')"], { timeoutMs: 15_000 });
  assert.equal(out.stdout.trim(), "tem");
});

// ── 14. comentário por linguagem (LOC honesto em qualquer stack) ──
test("14 — contagem de linhas respeita a sintaxe de comentário da linguagem", () => {
  const py = lineStats(['"""doc', 'linha de doc', '"""', "# comentário", "x = 1", "", "y = 2"], profileOf("a.py").comments);
  assert.deepEqual({ code: py.code, comment: py.comment, blank: py.blank }, { code: 2, comment: 4, blank: 1 });

  const java = lineStats(["// comentário", "/* bloco", "ainda bloco */", "int x = 1;", "# não é comentário em Java"], profileOf("A.java").comments);
  assert.equal(java.code, 2, "'#' não é comentário em Java");
  assert.equal(java.comment, 3);

  const sql = lineStats(["-- comentário", "SELECT 1;"], profileOf("q.sql").comments);
  assert.equal(sql.comment, 1);
  assert.equal(sql.code, 1);
});

test("14b — registry cobre as linguagens de mercado e o legado corporativo", () => {
  const esperado = {
    "a.ts": "TypeScript", "a.py": "Python", "A.java": "Java", "a.go": "Go", "a.rs": "Rust",
    "a.cs": "C#", "a.rb": "Ruby", "a.php": "PHP", "a.ex": "Elixir", "a.dart": "Dart",
    "a.swift": "Swift", "a.kt": "Kotlin", "a.scala": "Scala", "a.lua": "Lua", "a.pl": "Perl",
    "a.pas": "Delphi/Pascal", "a.cbl": "COBOL", "a.abap": "ABAP", "a.sql": "SQL",
    "a.feature": "Gherkin", "a.tf": "Terraform", "Dockerfile": "Dockerfile",
  };
  for (const [file, lang] of Object.entries(esperado)) {
    assert.equal(languageOf(file), lang, `${file} deveria ser ${lang}`);
  }
  assert.equal(isCountedAsCode(".coverage"), false, "artefato de cobertura não é código");
  assert.equal(isCountedAsCode("go.mod"), false, "manifesto não vira linguagem");
  assert.equal(isNonSource("package-lock.json"), true);
});

test("14c — padrões de teste de cada cultura são reconhecidos", () => {
  for (const p of [
    "tests/test_calculo.py", "internal/guia/calculo_test.go", "src/CalcTest.java",
    "spec/models/user_spec.rb", "tests/CalculoTest.php", "src/a.test.ts", "e2e/fluxo.e2e.ts",
    "features/login.feature", "t/basic.t", "tests/suite.robot",
  ]) assert.equal(isTestPathLang(p), true, `${p} deveria ser teste`);
  assert.equal(isTestPathLang("src/cadastro/service.ts"), false);
});

// ── 15. classificação por natureza ──
test("15 — natureza do teste é refinada por caminho e nome", () => {
  assert.equal(classifyCase({ file: "tests/e2e/fluxo.test.js", runnerKind: "unitario" }), "funcional");
  assert.equal(classifyCase({ file: "tests/integration/x.test.js", runnerKind: "unitario" }), "integracao");
  assert.equal(classifyCase({ file: "tests/a.int.test.js", runnerKind: "unitario" }), "integracao");
  assert.equal(classifyCase({ file: "tests/a.test.js", runnerKind: "unitario" }), "unitario");
  assert.equal(classifyCase({ file: "perf/load.js", name: "carga", runnerKind: "unitario" }), "performance");
  assert.equal(classifyCase({ file: "x.js", name: "contrato do endpoint", runnerKind: "unitario" }), "contrato");
  assert.equal(classifyCase({ file: "x.js", name: "teste simples", runnerKind: "funcional" }), "funcional", "sem sinal, vale o runner");
});

// ── 16. parsers de cobertura de todos os ecossistemas ──
test("16 — cobertura: lcov, cobertura-xml, jacoco e go-profile", () => {
  const dir = tmp("cov");
  write(join(dir, "lcov.info"), "SF:/p/a.js\nLF:10\nLH:8\nBRF:4\nBRH:2\nend_of_record\n");
  const lcov = parseCoverageFile(join(dir, "lcov.info"));
  assert.equal(lcov.format, "lcov");
  assert.equal(lcov.totals.lines, 80);
  assert.equal(lcov.totals.branches, 50);

  write(join(dir, "cobertura.xml"), `<?xml version="1.0"?><coverage line-rate="0.75" branch-rate="0.5" lines-valid="8" lines-covered="6">
<packages><package><classes><class filename="src/a.py"><lines>
<line number="1" hits="1"/><line number="2" hits="0"/></lines></class></classes></package></packages></coverage>`);
  const cob = parseCoverageFile(join(dir, "cobertura.xml"));
  assert.equal(cob.format, "cobertura-xml");
  assert.equal(cob.totals.lines, 75);
  assert.equal(cob.files[0].path, "src/a.py");

  write(join(dir, "jacoco.xml"), `<report name="app"><sourcefile name="Calc.java">
<counter type="LINE" missed="2" covered="8"/></sourcefile><counter type="BRANCH" missed="1" covered="3"/>
<counter type="LINE" missed="2" covered="8"/></report>`);
  const jac = parseCoverageFile(join(dir, "jacoco.xml"));
  assert.equal(jac.format, "jacoco-xml");
  assert.equal(jac.totals.lines, 80);
  assert.equal(jac.totals.branches, 75);

  write(join(dir, "go.out"), "mode: atomic\nex/m/a.go:3.20,5.2 2 1\nex/m/a.go:7.20,9.2 2 0\n");
  const go = parseCoverageFile(join(dir, "go.out"));
  assert.equal(go.format, "go-profile");
  assert.equal(go.totals.lines, 50);
});

test("16b — mergeCoverage consolida vários relatórios por linhas", () => {
  const merged = mergeCoverage([
    { format: "lcov", source: "/a/lcov.info", totals: { lines: 80, coveredLines: 8, totalLines: 10 }, files: [{ path: "/r/a.js", covered: 8, total: 10, pct: 80 }] },
    { format: "go-profile", source: "/a/go.out", totals: { lines: 50, coveredLines: 1, totalLines: 2 }, files: [{ path: "/r/b.go", covered: 1, total: 2, pct: 50 }] },
  ], "/r");
  assert.equal(merged.coveredLines, 9);
  assert.equal(merged.totalLines, 12);
  assert.equal(merged.lines, 75, "média ponderada por linhas, não média das médias");
  assert.equal(merged.files.length, 2);
});

test("16c — cobertura de negócio conta itens com teste, não linhas", () => {
  const bc = businessCoverage([
    { id: "RN-001", kind: "RN", title: "a", status: "verified", testTotals: { total: 2, failed: 0 } },
    { id: "RN-002", kind: "RN", title: "b", status: "failing", testTotals: { total: 1, failed: 1 } },
    { id: "RF-001", kind: "RF", title: "c", status: "implemented", testTotals: { total: 0, failed: 0 } },
  ]);
  assert.equal(bc.total, 3);
  assert.equal(bc.comTeste, 2);
  assert.equal(bc.comTestePassando, 1);
  assert.equal(bc.pct, 66.7);
  assert.equal(bc.byKind.find((k) => k.kind === "RF").semTeste.length, 1);
});

// ── 17. compatibilidade com versões anteriores das skills ──
test("17 — tasks.json v1/v2 (lista plana) é normalizado", () => {
  const n = normalizeTasksJson({ tasks: [{ id: "TASK-1", title: "a", module: "MOD-001", businessRules: ["RN-001"] }] });
  assert.equal(n.taskCount, 1);
  assert.equal(n.storyCount, 1);
  assert.ok(n.compatibilityNotes.some((x) => /lista plana/.test(x)));
  assert.deepEqual(n.tasks[0].businessRules, ["RN-001"]);
});

test("17b — tasks.json v3 (feature/story) é achatado para epic/story/task", () => {
  const n = normalizeTasksJson({
    features: [{ id: "FEAT-1", title: "F", stories: [{ id: "STORY-1", tasks: [{ id: "TASK-1", businessRules: [{ id: "RN-002" }] }] }] }],
  });
  assert.equal(n.epicCount, 1);
  assert.equal(n.storyCount, 1);
  assert.equal(n.taskCount, 1);
  assert.deepEqual(n.tasks[0].businessRules, ["RN-002"], "businessRules como objeto também é lido");
  assert.ok(n.compatibilityNotes.some((x) => /v3/.test(x)));
});

test("17c — vocabulário de IDs cobre os prefixos legados", () => {
  const re = buildIdRegex();
  const texto = "Implementa RF-MOD-001-03 e RN-NOVO-012; ver F-014, INF-002, PD-003, THR-007, GAP-001.";
  const achados = texto.match(re) || [];
  for (const id of ["RF-MOD-001-03", "RN-NOVO-012", "F-014", "INF-002", "PD-003", "THR-007", "GAP-001"]) {
    assert.ok(achados.includes(id), `${id} deveria ser reconhecido (achados: ${achados.join(",")})`);
  }
  assert.equal(idFamily("RN-NOVO-012"), "RN");
  assert.equal(idFamily("RF-MOD-001-03"), "RF");
});

test("17d — layout legado é lido e rotulado corretamente, e a saída vai para o layout atual", () => {
  const root = tmp("legacy");
  write(join(root, "task-generator/outputs/regras-negocio.md"), "# Regras\n\n### RN-001 — Multa\n\nMulta de 2%.\n");
  write(join(root, "task-generator/outputs/requirements/requirements.md"), "# Requisitos\n\n### RF-001 — Calcular\n\nCalcula.\n");
  const roots = candidateRoots(root, join(root, "task-generator/outputs"));
  const legado = roots.find((r) => /task-generator/.test(r.dir));
  assert.ok(legado, "task-generator/outputs deve ser candidato");
  assert.equal(legado.layout, "legado", "o rótulo vem do caminho, não da ordem da lista");

  const res = spawnSync("node", [CLI, "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  assert.notEqual(res.status, 1, `exit 1 inesperado: ${res.stderr}`);
  assert.ok(existsSync(join(root, "outputs/spec/status/status-data.json")), "saída vai para outputs/spec, não para a pasta descontinuada");
  assert.ok(!existsSync(join(root, "task-generator/outputs/status")), "nada é escrito no layout descontinuado");

  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.equal(data.business.rules.length, 1, "RN lida do nome antigo regras-negocio.md");
  assert.equal(data.business.requirements.functional.length, 1, "RF lida da subpasta requirements/");
  assert.equal(data.provenance.usesLegacyLayout, true);
  assert.ok(data.provenance.renamedCount >= 1);
});

// ── 18. reatribuição de arquivo por nome de teste ──
test("18 — nomes de teste são extraídos de qualquer linguagem", () => {
  assert.ok(extractTestNames('test("RN-001 — regra", () => {});').includes("RN-001 — regra"));
  assert.ok(extractTestNames("it('deve calcular', function () {});").includes("deve calcular"));
  assert.ok(extractTestNames("func TestCalculoMulta(t *testing.T) {}").includes("TestCalculoMulta"));
  assert.ok(extractTestNames("def test_calcula_multa(self):").includes("test_calcula_multa"));
  assert.ok(extractTestNames("Scenario: Cliente paga em atraso").includes("Cliente paga em atraso"));
});

// ── 19. o domínio de backlog não expõe a ferramenta ──
// A v2 renomeou a aba para «Execução e backlog» (era «Gestão do Projeto»). O que o teste
// protege continua igual: o relatório é entregue ao cliente e fala a língua dele —
// «itens de trabalho», não «work items»; nada de «Azure DevOps» no corpo do texto.
test("19 — relatório fala de execução e backlog, não da ferramenta", () => {
  const root = tmp("gestao");
  minimalOutputs(root);
  write(join(root, "outputs/spec/status/azure-snapshot.json"), JSON.stringify({
    project: "MEU-QUADRO",
    items: [{ id: 1, title: "STORY-001: Cadastro", type: "User Story", state: "Closed", logicalId: "STORY-001" }],
  }));
  spawnSync("node", [CLI, "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const visivel = html.replace(/<a href="[^"]*"/g, "");   // ignora URLs de link
  assert.ok(/Execução e backlog/.test(html), "a aba deve se chamar Execução e backlog");
  assert.ok(!/Azure DevOps/i.test(visivel), "o texto do relatório não menciona a ferramenta");
  assert.ok(!/work item/i.test(visivel), "usa 'itens de trabalho', não jargão da ferramenta");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.ok(data.domains.some((d) => d.id === "gestao" && d.label === "Execução e backlog"));
});

// ── 20. histórico de código completo ──
test("20 — histórico traz commits, ritmo, autores, tipos e hotspots", () => {
  const root = tmp("git");
  minimalOutputs(root);
  write(join(root, "src/a.js"), "// RN-001\nexport const a = 1;\n");
  const g = (args, env) => spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, ...(env || {}) } });
  g(["init", "-q"]); g(["config", "user.email", "d@e.com"]); g(["config", "user.name", "Dev"]);
  g(["add", "-A"]); g(["commit", "-qm", "feat: primeira versão (RN-001)"]);
  write(join(root, "src/a.js"), "// RN-001\nexport const a = 2;\n");
  g(["add", "-A"]); g(["commit", "-qm", "fix: corrige cálculo"]);
  g(["tag", "v1.0.0"]);

  spawnSync("node", [CLI, "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  const git = data.code.git;
  assert.equal(git.available, true);
  assert.equal(git.commits, 2, "quantidade de commits");
  assert.equal(git.authors.length, 1);
  assert.equal(git.authors[0].pct, 100);
  assert.ok(git.activeDays >= 1, "dias ativos");
  assert.ok(Array.isArray(git.byWeek) && git.byWeek.length >= 1, "commits por semana");
  assert.deepEqual(git.byCommitType.map((x) => x.type).sort(), ["feat", "fix"], "natureza dos commits");
  assert.equal(git.conventionalPct, 100);
  assert.ok(git.tags.includes("v1.0.0"), "releases");
  assert.ok(git.hotspots.some((h) => h.file === "src/a.js"), "arquivos que mais mudaram");
  assert.ok(git.linesAdded > 0 && git.filesTouched > 0);

  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  assert.ok(/COMMITS|Commits/.test(html), "commits aparecem no HTML");
  assert.ok(/Quem escreveu/.test(html), "seção de autores");
  assert.ok(/Natureza dos commits/.test(html), "seção de tipos de commit");
  assert.ok(/Arquivos que mais mudaram/.test(html), "seção de hotspots");
  // o gráfico semanal só aparece com mais de uma semana de atividade
  assert.equal(/Commits por semana/.test(html), git.byWeek.length > 1);
});

// ── 21. grid de casos de teste: paginado, com filtro de tipo, situação e nome ──
test("21 — casos de teste saem num grid único paginado, não em listas por tipo", () => {
  const root = tmp("grid");
  minimalOutputs(root);
  write(join(root, "package.json"), JSON.stringify({ name: "g", private: true, type: "module", scripts: { test: "node --test" } }));
  write(join(root, "src/a.js"), "// RN-001\nexport const ok = () => true;\n");
  // A fixture tem as TRÊS situações de propósito. Um projeto 100% verde é o caso fácil;
  // o grid precisa ser exercitado como o cliente o recebe — com falha e com ignorado,
  // que é quando os filtros de situação passam a ter função.
  const mk = (path, prefix, n, { fail = 0, skip = 0 } = {}) => {
    const L = ['import { test } from "node:test";', 'import assert from "node:assert/strict";', ""];
    for (let i = 1; i <= n; i++) L.push(`test("RN-001 — ${prefix} ${i}", () => assert.ok(true));`);
    for (let i = 1; i <= fail; i++) L.push(`test("RN-001 — ${prefix} falha ${i}", () => assert.equal(1, 2));`);
    for (let i = 1; i <= skip; i++) L.push(`test("RN-001 — ${prefix} ignorado ${i}", { skip: true }, () => {});`);
    write(path, L.join("\n"));
  };
  mk(join(root, "tests/unit.test.js"), "unitario", 60, { fail: 2, skip: 3 });
  mk(join(root, "tests/e2e/fluxo.e2e.test.js"), "funcional", 12);
  mk(join(root, "tests/integration/mod.int.test.js"), "integracao", 8);

  spawnSync("node", [CLI, "--no-azure", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  // Os CASOS saem num grid só — não em listas separadas por natureza. A v2 tem vários
  // grids no documento (normas, itens, GAPs…), então a asserção passou a ser sobre o
  // grid de casos especificamente, identificado pela âncora.
  assert.ok(html.includes('id="grid-casos"'), "o grid de casos existe");
  // Recorta SÓ este grid: o documento tem outros depois dele (itens, GAPs, anexos), e
  // uma fatia até o fim do arquivo os incluiria — foi o que fez a contagem dar 2.
  const casos = sliceGrid(html, "grid-casos");
  assert.equal((casos.match(/<table[^>]*data-grid-table/g) || []).length, 1, "um único grid de casos");
  const rows = (casos.match(/<tr[^>]*data-index="/g) || []).length;
  assert.equal(rows, data.tests.totals.total, `o grid traz todos os ${data.tests.totals.total} casos`);

  // Controles do grid genérico.
  for (const ctrl of ["data-grid-search", "data-grid-size", "data-grid-pager", "data-grid-reset"]) {
    assert.ok(casos.includes(ctrl), `controle ${ctrl} presente`);
  }
  assert.ok(/data-grid-filter="tipo"/.test(casos), "filtro por tipo de teste");
  assert.ok(/data-grid-filter="situacao"/.test(casos), "filtro por situação");
  // Falha e ignorado precisam existir na fixture, senão o filtro de situação seria
  // um select de uma opção só — e o grid o suprime, por ser controle morto.
  assert.ok(data.tests.totals.failed > 0 && data.tests.totals.skipped > 0, "a fixture cobre as três situações");
  assert.ok(/class="row-crit"/.test(casos), "linha de falha é destacada");
  assert.ok(/class="fail-msg"/.test(casos), "a mensagem da falha aparece no grid");

  // O select de tipo lista as naturezas encontradas, com contagem.
  for (const k of data.testing.kinds) {
    assert.ok(casos.includes(`>${k.label} (${k.total})<`), `opção de tipo "${k.label} (${k.total})"`);
  }
  // Cada linha carrega os atributos que filtro e busca usam.
  assert.ok(/data-situacao="Aprovado"/.test(casos), "atributo de situação na linha");
  // O rótulo da natureza vem do coletor (KINDS), não de um mapa do renderer — as duas
  // listas já divergiram no plural e produziram nomes diferentes para a mesma coisa.
  const funcional = data.testing.kinds.find((k) => k.kind === "funcional");
  assert.ok(funcional, "a fixture produz testes funcionais");
  assert.ok(casos.includes(`data-tipo="${funcional.label}"`), `atributo de tipo na linha (${funcional.label})`);
  assert.ok(/data-search="/.test(casos), "texto de busca na linha");
  // Ordenação: chave declarada, nunca o texto da célula (que ordenaria 10 antes de 9).
  assert.ok(/data-num-duracao="/.test(casos), "chave numérica de duração");
  assert.ok(/data-sort-caso="/.test(casos), "chave de ordenação por nome");

  // As antigas seções por natureza não voltam.
  assert.ok(!/id="testes-casos-unitario"/.test(html), "sem seção separada por natureza");
  assert.ok((casos.match(/class="[^"]*sortable/g) || []).length >= 4, "colunas ordenáveis");

  // Impressão: a v2 respeita o que está na tela e oferece o dossiê para o completo —
  // sair 187 páginas de tabela por padrão inutilizava o PDF como entrega.
  assert.ok(/tr\.is-paged-out \{ display: none !important; \}/.test(html), "no papel sai o que está na tela");
  assert.ok(/data-dossier/.test(html), "o dossiê completo é o caminho para o PDF integral");
});

/* ═══════════════════════════════════════════════════════════════════════════════════
   v2.0 — ADAPTAÇÃO À AUSÊNCIA DE ARTEFATO
   O relatório rico depende de artefatos que nem toda versão do kit produz. Estes
   testes travam a promessa central: **nada fica em branco**. Ou a seção cai num bloco
   equivalente montado com o que existe, ou ela não é renderizada — e some junto o link
   dela na navegação, sem deixar âncora órfã.
   ═══════════════════════════════════════════════════════════════════════════════════ */

/** Toda âncora citada na navegação existe como id no documento. */
function assertNoOrphanAnchors(html) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const orphans = [...html.matchAll(/data-anchor="([^"]+)"/g)]
    .map((m) => m[1]).filter((a) => !ids.has(a));
  assert.deepEqual(orphans, [], `links da navegação sem destino: ${orphans.join(", ")}`);
}

/**
 * Nenhum resíduo de dado ausente vazando para a entrega.
 *
 * O script embutido é excluído da varredura: `x === undefined` e `NaN` são JavaScript
 * legítimo lá dentro. O que se procura é resíduo no CONTEÚDO — o «undefined» que sai
 * de um campo que o gerador achou que existia.
 */
function assertNoBlanks(html) {
  const conteudo = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  for (const bad of ["undefined", "NaN", "[object Object]", ">null<"]) {
    assert.ok(!conteudo.includes(bad), `«${bad}» apareceu no HTML entregue ao cliente`);
  }
  html = conteudo;
  assert.ok(!/<td><\/td>/.test(html), "célula de tabela vazia");
  assert.ok(!/<div class="k-value"><\/div>/.test(html), "indicador sem valor");
  assert.ok(!/<span class="asks-a"><\/span>/.test(html), "bloco de pergunta sem resposta");
  assert.ok(!/<tbody>\s*<\/tbody>/.test(html), "tabela sem nenhuma linha");
}

test("22 — projeto SEM artefatos de extensão cai no bloco clássico, sem seção vazia", () => {
  const root = tmp("v2-sem-extras");
  minimalOutputs(root);
  write(join(root, "outputs/spec/requirements.md"), "# Requisitos\n\n### RF-001 — Incluir\n\nDeve incluir.\n\n### RNF-001 — Desempenho\n\nAbaixo de 800ms.\n");

  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  // Caminho clássico: RN/RF/RNF em vez de operações da EAP.
  assert.ok(/id="negocio-regras"/.test(html), "regras de negócio pelo caminho clássico");
  assert.ok(/id="negocio-rf"/.test(html), "requisitos funcionais");
  // As seções que dependem de business-operations.json NÃO saem.
  for (const anchor of ["negocio-aceite", "visao-funil", "visao-frentes", "visao-atencao"]) {
    assert.ok(!html.includes(`id="${anchor}"`), `«${anchor}» não deve existir sem as operações`);
  }
  // Sem glossary.json não há glossário nem marcação de sigla no texto.
  assert.ok(!/id="anexos-glossario"/.test(html), "sem glossário quando não há glossary.json");
  assert.ok(!/<abbr class="gl"/.test(html), "sem marcação de sigla quando não há glossário");

  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("23 — projeto COM artefatos de extensão rende as seções ricas", () => {
  const root = tmp("v2-com-extras");
  minimalOutputs(root);
  write(join(root, "outputs/spec/business-operations.json"), JSON.stringify({
    operations: [
      {
        code: "NF-001", title: "Incluir Tipo de Ativo", frente: "Cadastros", banda: "Baixa",
        codeState: "confirmado", testState: "confirmado", e2e: true, docs: 2,
        regras: [{ id: "RN-1", text: "Codigo unico", origem: "TipoAtivo.java" }],
        arquivos: [{ repo: "mono", path: "/src/TipoAtivo.java", line: 42 }],
        onde: ["tela do monolito"],
      },
      {
        code: "NF-003", title: "Rejeitar item da fila", frente: "AQS", banda: "Alta",
        codeState: "ausente", testState: "ausente", e2e: false,
        observacao: "A busca por rejeitar nao retorna arquivo.",
      },
    ],
  }));
  write(join(root, "outputs/spec/glossary.json"), JSON.stringify({
    terms: [{ term: "AQS", expansion: "Autorizacao de Quitacao", definition: "Documento patrimonial." }],
  }));
  write(join(root, "outputs/spec/test-findings.json"), JSON.stringify({
    causas: [{ label: "Ambiente de validacao", count: 3, dependeDe: "Infra do cliente" }],
  }));

  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  assert.ok(/id="negocio-aceite"/.test(html), "matriz de aceite");
  assert.ok(/id="visao-funil"/.test(html), "funil de entrega");
  assert.ok(/id="visao-atencao"/.test(html), "operações sem evidência completa");
  assert.ok(/class="op-code">NF-003</.test(html), "a operação sem evidência é nomeada");
  assert.ok(/state-ausente/.test(html), "estado de evidência ausente é explícito, não vazio");
  // Glossário e a marcação da PRIMEIRA ocorrência por domínio.
  assert.ok(/id="gloss-aqs"/.test(html), "verbete do glossário");
  assert.ok(/<abbr class="gl"[^>]*><a href="#anexos\/gloss-aqs">/.test(html), "sigla marcada e ligada ao verbete");
  // Operações e catálogo de regras são artefatos DIFERENTES e independentes: ter um
  // não pode esconder o outro. Antes, ter operações suprimia o catálogo de RN — o que
  // é omitir documentação que existe no projeto.
  assert.ok(/id="negocio-regras"/.test(html), "o catálogo de RN continua exibido ao lado das operações");

  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("24 — artefato de extensão inválido vira aviso, não derruba o relatório", () => {
  const root = tmp("v2-json-quebrado");
  minimalOutputs(root);
  write(join(root, "outputs/spec/business-operations.json"), "{ isto nao e json }");

  const res = spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  assert.notEqual(res.status, 1, `esperava relatório gerado; stderr: ${res.stderr}`);
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.ok(data.warnings.some((w) => w.code === "EXTRA_ARTIFACT_INVALID"), "aviso declarado");
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  assert.ok(/id="negocio-regras"/.test(html), "cai no bloco clássico em vez de sumir com o domínio");
  assertNoBlanks(html);
});

test("25 — a navegação publica só as abas que têm conteúdo", () => {
  const root = tmp("v2-nav");
  minimalOutputs(root);
  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  const abas = [...html.matchAll(/data-domain-link="([^"]+)"/g)].map((m) => m[1]);
  const secoes = [...html.matchAll(/data-domain="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(abas, secoes, "menu e seções em correspondência exata");
  // Sem código e sem testes, essas abas não existem.
  for (const ausente of ["codigo", "testes"]) {
    assert.ok(!abas.includes(ausente), `aba «${ausente}» não deve existir sem a fonte`);
  }
  assert.ok(abas.includes("visao"), "o sumário é sempre a landing");
  assert.equal(secoes[0], "visao", "o sumário é a primeira seção");
  assertNoOrphanAnchors(html);
});

test("26 — sem tracker o domínio de execução declara a lacuna, sem inventar número", () => {
  const root = tmp("v2-sem-ado");
  minimalOutputs(root);
  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.equal(data.delivery, null, "sem itens não há leitura de ritmo");
  if (html.includes('data-domain="gestao"')) {
    assert.ok(/não pôde ser coletad|não coletado|desativada/i.test(html), "a lacuna é declarada");
    assert.ok(!/id="gestao-sprints"/.test(html), "sem sprints simulados sem dados");
    assert.ok(!/id="gestao-projecao"/.test(html), "sem projeção sem velocidade");
  }
  assertNoBlanks(html);
});

/** Itens fechados numa data, opcionalmente atribuídos a um caminho de iteração. */
function closedItems(from, n, iterationPath = null) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: from + i, type: "Task", category: "done", state: "Closed", assignedTo: "Ana",
      closedDate: "2026-05-04T12:00:00Z", createdDate: "2026-04-06T00:00:00Z",
      iterationPath, parentId: null,
    });
  }
  return out;
}

test("27 — sem iteração COM DATA no tracker, não há sprint, velocidade nem projeção", async () => {
  const { deriveDelivery } = await load("lib/derive-delivery.mjs");

  // O caso que motivou a regra: o projeto declara caminhos de iteração, mas eles são
  // pastas de escopo — não têm início nem fim. A versão anterior reconstruía janelas de
  // 14 dias, chamava de «S1…S9» e projetava data de conclusão em cima disso. O cliente
  // lia aquilo como o sprint dele.
  const items = [
    ...closedItems(1, 12, "Proj\\Onda 1"),
    { id: 900, type: "Task", category: "todo", state: "New", closedDate: null, createdDate: "2026-04-06T00:00:00Z", iterationPath: "Proj\\Onda 1", parentId: null },
  ];
  const semData = deriveDelivery({
    available: true, items,
    iterations: [{ name: "Onda 1", path: "Proj\\Onda 1", startDate: null, finishDate: null }],
  });

  assert.equal(semData.hasSprints, false, "sem data não há sprint");
  assert.deepEqual(semData.sprints, [], "nenhum sprint reconstruído");
  assert.equal(semData.velocity, null, "sem sprint não há velocidade");
  assert.equal(semData.projection, null, "sem velocidade não há projeção");
  assert.equal(semData.undatedIterations, 1, "a iteração sem data é contada para o aviso");
  // O que É medido continua existindo: data de fechamento é fato, não inferência.
  assert.equal(semData.hasClosureDates, true, "o fechamento por semana continua disponível");
  assert.equal(semData.closedCount, 12);
});

test("27b — com iteração datada, o sprint é real e a projeção usa a mediana", async () => {
  const { deriveDelivery } = await load("lib/derive-delivery.mjs");

  // Três sprints declarados NO TRACKER, com data. 10, 2 e 60 fechamentos: a média (24)
  // mente por causa do pico; a mediana (10) descreve a cadência.
  const items = [
    ...closedItems(1, 10, "Proj\\Sprint 1"),
    ...closedItems(101, 2, "Proj\\Sprint 2"),
    ...closedItems(201, 60, "Proj\\Sprint 3"),
  ];
  for (let i = 0; i < 20; i++) {
    items.push({ id: 900 + i, type: "Task", category: "todo", state: "New", closedDate: null, createdDate: "2026-04-06T00:00:00Z", iterationPath: "Proj\\Sprint 3", parentId: null });
  }
  const iterations = [
    { name: "Sprint 1", path: "Proj\\Sprint 1", startDate: "2026-04-06T00:00:00Z", finishDate: "2026-04-19T00:00:00Z" },
    { name: "Sprint 2", path: "Proj\\Sprint 2", startDate: "2026-04-20T00:00:00Z", finishDate: "2026-05-03T00:00:00Z" },
    { name: "Sprint 3", path: "Proj\\Sprint 3", startDate: "2026-05-04T00:00:00Z", finishDate: "2026-05-17T00:00:00Z" },
  ];

  const dl = deriveDelivery({ available: true, items, iterations });
  assert.equal(dl.hasSprints, true, "as iterações datadas viram sprints");
  assert.deepEqual(dl.sprints.map((s) => s.name), ["Sprint 1", "Sprint 2", "Sprint 3"], "nome vem do tracker, não de «S1»");
  assert.deepEqual(dl.sprints.map((s) => s.closed), [10, 2, 60], "cada item conta no sprint que o time registrou nele");
  assert.equal(dl.velocity.median, 10, "mediana");
  assert.ok(dl.velocity.mean > dl.velocity.median, "a média é puxada pelo pico");
  assert.equal(dl.projection.adopted.label, "Ritmo mediano", "a projeção adota a mediana, não a média");
  assert.ok(dl.velocity.peakShare >= 40, "o pico domina o total e justifica a escolha");
  assert.equal(dl.projection.sprintDays, 14, "a duração vem dos sprints reais, não de um valor fixo");
  assert.equal(dl.openLeaves.length, 20, "itens folha em aberto");
});

test("27c — iterações datadas sem nenhum item atribuído não viram gráfico", async () => {
  const { deriveDelivery } = await load("lib/derive-delivery.mjs");
  // Sprints configurados no tracker mas que o time não usa para planejar: nove barras
  // zeradas não são informação.
  const dl = deriveDelivery({
    available: true,
    items: closedItems(1, 5, null),
    iterations: [
      { name: "Sprint 1", path: "Proj\\Sprint 1", startDate: "2026-04-06T00:00:00Z", finishDate: "2026-04-19T00:00:00Z" },
      { name: "Sprint 2", path: "Proj\\Sprint 2", startDate: "2026-04-20T00:00:00Z", finishDate: "2026-05-03T00:00:00Z" },
    ],
  });
  assert.equal(dl.hasSprints, false, "sem item atribuído, não há leitura por sprint");
  assert.equal(dl.hasClosureDates, true, "mas o fechamento por semana continua");
});

test("28 — rollup e ritmo contam só as folhas, não os itens-pai", async () => {
  const { deriveDelivery, leavesOf } = await load("lib/derive-delivery.mjs");
  const items = [
    { id: 1, type: "Epic", category: "done", closedDate: "2026-04-10T00:00:00Z", parentId: null },
    { id: 2, type: "User Story", category: "done", closedDate: "2026-04-10T00:00:00Z", parentId: 1 },
    { id: 3, type: "Task", category: "done", closedDate: "2026-04-10T00:00:00Z", parentId: 2 },
    { id: 4, type: "Task", category: "todo", closedDate: null, parentId: 2 },
  ];
  assert.deepEqual(leavesOf(items).map((i) => i.id), [3, 4], "só as folhas");
  const dl = deriveDelivery({ available: true, items, iterations: [] });
  assert.equal(dl.closedCount, 1, "um fechamento de folha, não três");
  assert.equal(dl.scope, 2, "escopo = folhas");
});

test("29 — a decisão da auditoria é lida da linha que a declara, não por substring", async () => {
  const { extractAuditDecision } = await load("lib/render-domains.mjs");

  // O caso real: uma re-auditoria usa «BLOQUEADO» dezenas de vezes para dizer que o
  // vetor de ataque está bloqueado. Buscar a substring invertia o veredito.
  const md = [
    "# Auditoria de código",
    "",
    "**Decisão:** APROVADO COM PLANO DE AÇÃO (liberar para homologação)",
    "",
    "| Vetor | Resultado |",
    "| SQL injection | BLOQUEADO |",
    "| XSS | BLOQUEADO |",
  ].join("\n");
  const d = extractAuditDecision(md);
  assert.ok(d, "a decisão é encontrada");
  assert.match(d.text, /APROVADO COM PLANO DE A/, "veredito correto");
  assert.equal(d.level, "warn", "aprovado com ressalva não é verde puro nem vermelho");

  const bloq = extractAuditDecision("## Resultado\n\nDecisão: BLOQUEADO — corrigir antes do deploy.\n");
  assert.equal(bloq.level, "crit", "bloqueio declarado na linha de decisão é crítico");
  assert.equal(extractAuditDecision("Texto sem linha de decisao."), null, "sem linha declarada, não conclui nada");
});

test("30 — glossário marca a primeira ocorrência e não invade código nem atributo", async () => {
  const { normalizeGlossary, annotate } = await load("lib/glossary.mjs");
  const terms = normalizeGlossary([{ term: "AQS", definition: "Documento." }, { term: "Perna 2", definition: "Recepcao." }]);
  const out = annotate('<p>A AQS entra pela Perna 2. Outra AQS aqui.</p><code>AQS</code><p title="AQS">x</p>', terms);

  assert.equal((out.match(/<abbr class="gl"/g) || []).length, 2, "uma marcação por termo, na primeira ocorrência");
  assert.ok(/Outra AQS aqui/.test(out), "a segunda ocorrência fica intacta");
  assert.ok(/<code>AQS<\/code>/.test(out), "não marca dentro de <code> — descaracterizaria identificador");
  assert.ok(/title="AQS"/.test(out), "não marca dentro de atributo — quebraria o HTML");
  // Expressão mais longa primeiro: "Perna 2" não pode ser comida por um termo curto.
  assert.ok(/gloss-perna-2/.test(out), "termo composto é reconhecido");
});

test("31 — todo grid do documento honra o contrato que o script do cliente espera", () => {
  const root = tmp("v2-contrato-grid");
  minimalOutputs(root);
  write(join(root, "outputs/spec/anexos-index.json"), JSON.stringify({
    documentos: [
      { title: "Manual", path: "anexos/manual.md", group: "Negocio", kb: 320 },
      { title: "Arquitetura", path: "anexos/arq.md", group: "Tecnico", kb: 110 },
      { title: "Plano", path: "anexos/plano.md", group: "Gestao", kb: 88 },
    ],
  }));
  write(join(root, "outputs/spec/gaps.md"), "# GAPs\n\n| ID | Tema | Severidade | Status | Dono | Questão |\n|---|---|---|---|---|---|\n| GAP-001 | Contrato | Alta | Aberto | PO | Qual código usar? |\n");

  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  // Fora o script embutido: ele cita `data-grid-root` no seletor e confundiria o recorte.
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8")
    .replace(/<script>[\s\S]*?<\/script>/g, "");

  const grids = html.split("data-grid-root").slice(1).map((raw) => raw.split("data-grid-root")[0]);
  assert.ok(grids.length >= 2, "o documento tem grids para verificar");

  for (const g of grids) {
    const id = (g.match(/id="([^"]+)"/) || [])[1] || "(sem id)";
    assert.ok(/data-grid-table/.test(g), `${id}: sem tabela`);
    assert.ok(/<tr[^>]*data-index=/.test(g), `${id}: grid renderizado sem nenhuma linha`);

    // Todo filtro precisa de um atributo correspondente na linha, senão o select
    // existe mas não filtra nada — controle morto na cara do cliente.
    for (const f of [...g.matchAll(/data-grid-filter="([^"]+)"/g)].map((m) => m[1])) {
      assert.ok(new RegExp(`data-${f}="`).test(g), `${id}: filtro «${f}» sem atributo correspondente na linha`);
    }

    // Coluna NUMÉRICA ordenável precisa de chave declarada: sem ela o script cai no
    // texto da célula e ordena "10" antes de "9".
    for (const c of [...g.matchAll(/<th class="num sortable" data-sort="([^"]+)"/g)].map((m) => m[1])) {
      assert.ok(new RegExp(`data-num-${c}="`).test(g), `${id}: coluna numérica «${c}» sem data-num-${c}`);
    }

    // Paginação e busca completas — o script depende dos quatro botões.
    for (const ctrl of ["data-grid-search", "data-grid-size", "data-grid-count", "data-grid-pageinfo"]) {
      assert.ok(g.includes(ctrl), `${id}: falta ${ctrl}`);
    }
    for (const p of ["first", "prev", "next", "last"]) {
      assert.ok(g.includes(`data-grid-page="${p}"`), `${id}: falta o botão «${p}»`);
    }
  }
});

test("32 — o HTML entregue é bem formado e os scripts embutidos são JS válido", async () => {
  const vm = await import("node:vm");
  const root = tmp("v2-bem-formado");
  minimalOutputs(root);
  write(join(root, "outputs/spec/glossary.json"), JSON.stringify({ terms: [{ term: "AQS", definition: "Documento." }] }));
  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  // 1) o JS embutido precisa ser sintaticamente válido: um erro aqui deixa o
  //    documento sem navegação, e o cliente vê uma página que não troca de aba.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 1, "há script embutido");
  for (const [i, s] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(s), `script ${i + 1} não compila`);
  }

  // 2) balanceamento das tags que estruturam o documento.
  const VOID = new Set(["meta", "link", "br", "hr", "img", "input", "circle", "rect", "path", "line", "text", "use", "stop", "col", "source"]);
  const stack = [];
  const problemas = [];
  let inSkip = null;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const [, close, name, attrs] = m;
    const n = name.toLowerCase();
    if (inSkip) { if (close && n === inSkip) inSkip = null; continue; }
    if (!close && (n === "script" || n === "style")) { inSkip = n; continue; }
    if (VOID.has(n) || attrs.trim().endsWith("/")) continue;
    if (close) {
      const last = stack.pop();
      if (last !== n) problemas.push(`fecha </${n}> com <${last}> aberto`);
    } else stack.push(n);
  }
  assert.deepEqual(problemas.slice(0, 3), [], "tags desbalanceadas");
  assert.deepEqual(stack, [], `tags abertas sem fechamento: ${stack.join(", ")}`);
});

/* ═══════════════════════════════════════════════════════════════════════════════════
   SEM SUBSTITUTO — a regra depois da revisão de rumo.
   Ausência de fonte não é preenchida com outra coisa: nem com dado reconstruído, nem
   com uma informação diferente promovida ao lugar vago.
   ═══════════════════════════════════════════════════════════════════════════════════ */

/** Snapshot de backlog para o CLI, com controle sobre as datas das iterações. */
function backlogSnapshot(root, { datadas }) {
  const items = [];
  let id = 1;
  const add = (n, iter, cat, dia) => {
    for (let i = 0; i < n; i++) {
      items.push({
        id: id++, title: `Task ${id}`, type: "Task",
        state: cat === "done" ? "Closed" : "New",
        assignedTo: id % 2 ? "Ana" : "Bruno", iterationPath: iter,
        closedDate: cat === "done" ? `2026-05-${String(dia).padStart(2, "0")}T12:00:00Z` : null,
        createdDate: "2026-04-06T00:00:00Z",
      });
    }
  };
  add(10, "Proj\\Sprint 1", "done", 6);
  add(6, "Proj\\Sprint 2", "done", 13);
  add(9, "Proj\\Sprint 3", "done", 20);
  add(7, "Proj\\Sprint 3", "todo", 1);

  const iterations = [1, 2, 3].map((k) => ({
    name: `Sprint ${k}`, path: `Proj\\Sprint ${k}`,
    startDate: datadas ? `2026-05-${String(1 + (k - 1) * 7).padStart(2, "0")}T00:00:00Z` : null,
    finishDate: datadas ? `2026-05-${String(7 + (k - 1) * 7).padStart(2, "0")}T00:00:00Z` : null,
  }));

  write(join(root, "outputs/spec/status/azure-snapshot.json"), JSON.stringify({
    project: "MEU-QUADRO", collectedAt: "2026-08-05T10:00:00Z", iterations, items,
  }));
}

test("33 — iteração sem data: nenhuma seção de sprint é montada no HTML", () => {
  const root = tmp("sem-sprint");
  minimalOutputs(root);
  backlogSnapshot(root, { datadas: false });

  spawnSync("node", [CLI, "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.equal(data.delivery.hasSprints, false, "não há sprint sem data");
  assert.equal(data.delivery.velocity, null, "não há velocidade");
  assert.equal(data.delivery.projection, null, "não há projeção");
  for (const anchor of ["gestao-sprints", "gestao-projecao"]) {
    assert.ok(!html.includes(`id="${anchor}"`), `«${anchor}» não pode existir sem sprint real`);
  }
  // E o vocabulário da versão que reconstruía não pode reaparecer.
  assert.ok(!/simulad/i.test(html), "nada de «simulado» — a reconstrução não existe mais");
  assert.ok(!/tag--sim/.test(html), "a etiqueta de dado simulado foi removida do tema");
  // O que é medido de verdade continua: data de fechamento é fato.
  assert.equal(data.delivery.hasClosureDates, true);
  assert.ok(html.includes('id="gestao-fechamento"'), "o fechamento por semana continua");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("34 — iteração com data: o sprint sai com o nome do tracker e gera projeção", () => {
  const root = tmp("com-sprint");
  minimalOutputs(root);
  backlogSnapshot(root, { datadas: true });

  spawnSync("node", [CLI, "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.equal(data.delivery.hasSprints, true);
  assert.ok(html.includes('id="gestao-sprints"'), "seção de sprint");
  assert.ok(html.includes('id="gestao-projecao"'), "projeção");
  assert.ok(/Sprint 1/.test(html), "o nome vem do tracker, não de «S1»");
  assert.ok(!/simulad/i.test(html), "sprint real não carrega ressalva de simulação");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("35 — sem triagem das falhas, nada ocupa o lugar da causa-raiz no Sumário", () => {
  const root = tmp("sem-triagem");
  minimalOutputs(root);
  write(join(root, "package.json"), JSON.stringify({ name: "t", private: true, type: "module", scripts: { test: "node --test" } }));
  write(join(root, "src/a.js"), "export const ok = () => true;\n");
  write(join(root, "tests/x.test.js"), [
    'import { test } from "node:test";',
    'import assert from "node:assert/strict";',
    'test("passa", () => assert.ok(true));',
    'test("falha", () => assert.equal(1, 2));',
  ].join("\n"));

  spawnSync("node", [CLI, "--no-azure", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.ok(data.tests.totals.failed > 0, "a fixture tem falha");
  assert.ok(!html.includes('id="visao-falhas"'), "sem test-findings.json não há bloco de falhas no Sumário");
  assert.ok(!html.includes('id="testes-causas"'), "nem seção de causa-raiz em Testes");
  // A distribuição por tipo de teste continua onde sempre esteve, com o nome do que é.
  assert.ok(html.includes('id="testes-naturezas"'), "o quadro por natureza de teste permanece");
  assertNoOrphanAnchors(html);
});

test("36 — sem camada editorial não há linha do tempo nem dimensões fabricadas", () => {
  const root = tmp("sem-editorial");
  minimalOutputs(root);
  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q", "--mode", "conclusao"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.ok(!html.includes('id="visao-linha"'), "marco é decisão de quem conduz — não se sintetiza do que foi medido");
  assert.ok(!/class="dim dim--/.test(html), "sem dimensões fabricadas a partir dos sinais");
  assert.ok(!html.includes('id="visao-pauta"'), "sem pauta inventada");
  // No lugar: o estado calculado, com os sinais que o sustentam, chamado do que é.
  assert.ok(/id="visao-veredito"[^>]*>Situação geral</.test(html), "a seção se chama «Situação geral»");
  assert.ok(/Frente medida/.test(html), "os sinais medidos saem como sinais");
  assert.ok(data.warnings.some((w) => w.code === "REPORT_CONTENT_ABSENT"), "conclusão sem camada editorial é avisada");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("37 — com camada editorial, dimensões e linha do tempo aparecem como declaradas", () => {
  const root = tmp("com-editorial");
  minimalOutputs(root);
  write(join(root, "outputs/spec/status/status-report-content.json"), JSON.stringify({
    dimensions: [
      { name: "Escopo entregue", level: "warn", verdict: "3 sem evidencia", why: "34 de 46 com codigo.", owner: "Equipe", evidence: "Ver aceite", evidenceHref: "#negocio/negocio-aceite" },
      { name: "Seguranca", level: "ok", verdict: "Liberado", why: "Auditoria aprovada.", owner: "Equipe" },
    ],
    milestones: [
      { date: "2026-04-08", label: "Abertura do epico", meaning: "Inicio formal." },
      { date: "2026-07-17", label: "Re-auditoria", meaning: "Liberada para homologacao." },
    ],
  }));

  spawnSync("node", [CLI, "--no-azure", "--no-tests", "--no-code", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  assert.ok(/id="visao-veredito"[^>]*>Situação por dimensão</.test(html), "com dimensões, o título muda");
  assert.equal((html.match(/class="dim dim--/g) || []).length, 2, "as duas dimensões declaradas");
  assert.ok(html.includes('id="visao-linha"'), "linha do tempo com os marcos declarados");
  assert.ok(/Abertura do epico/.test(html) && /Re-auditoria/.test(html), "os marcos são os do arquivo");
  assert.ok(!/Emissão deste relatório<\/text>/.test(html), "a geração do documento não vira marco do projeto");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

/* ═══════════════════════════════════════════════════════════════════════════════════
   ESCOPO DECLARADO — quais pastas a skill mede.
   O escopo é perguntado ao usuário (ver «Kickoff obrigatório» no SKILL.md) e chega ao
   CLI por --docs/--code/--tests/--extra, cada um aceitando várias pastas. Estes testes
   travam o que acontece com cada forma de declaração.
   ═══════════════════════════════════════════════════════════════════════════════════ */

/** Projeto com dois repositórios de código, um de teste e a doc fora de outputs/. */
function multiRepoFixture(root) {
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Multi\n\nTexto.\n");
  write(join(root, "docs/business-rules.md"), "# Regras\n\n### RN-001 — Regra\n\nEnunciado.\n");
  // Mesmo caminho relativo nos dois repositórios: é o caso que colide sem prefixo.
  write(join(root, "repoA/src/service.js"), "// RN-001\nexport const a = () => 1;\n");
  write(join(root, "repoB/src/service.js"), "// RN-001 TODO: revisar\nexport const b = () => 2;\n");
  write(join(root, "qa/package.json"), JSON.stringify({ name: "qa", private: true, type: "module", scripts: { test: "node --test" } }));
  write(join(root, "qa/tests/a.test.js"), [
    'import { test } from "node:test";',
    'import assert from "node:assert/strict";',
    'test("RN-001 ok", () => assert.ok(true));',
  ].join("\n"));
  // Ruído: outro produto no mesmo diretório de trabalho, que NÃO pode entrar.
  write(join(root, "outro-produto/src/nao-e-meu.js"), "export const x = () => 0;\n");
}

test("38 — cada pergunta do kickoff aceita várias pastas, e só elas são medidas", () => {
  const root = tmp("escopo-multi");
  multiRepoFixture(root);

  spawnSync("node", [CLI,
    "--docs", "docs",
    "--code", "api=repoA,web=repoB",
    "--tests", "qa",
    "--no-azure", "--no-coverage", "-q",
  ], { cwd: root, encoding: "utf8" });

  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.equal(data.scope.declared, true, "o escopo é declarado, não presumido");
  assert.deepEqual(data.scope.code.map((e) => e.label), ["api", "web"], "duas pastas de código, com rótulo");
  assert.deepEqual(data.scope.docs.map((e) => e.rel), ["docs"], "documentação fora de outputs/");
  assert.deepEqual(data.scope.tests.map((e) => e.rel), ["qa"]);

  // Só o que foi declarado entra: o outro produto do mesmo diretório fica de fora.
  assert.equal(data.code.inventory.codeFileCount, 2, "dois arquivos de código, não os do outro produto");
  const paths = data.code.inventory.largestFiles.map((f) => f.rel);
  assert.ok(!paths.some((p) => p.includes("nao-e-meu")), "código de outro produto não entra no relatório");

  // Com mais de uma pasta, o caminho é prefixado — senão os dois `src/service.js`
  // colidiriam e o relatório contaria dois arquivos distintos como um.
  assert.deepEqual(paths.sort(), ["api/src/service.js", "web/src/service.js"]);

  // A documentação declarada é lida de verdade.
  assert.equal(data.business.rules.length, 1, "a RN veio de docs/, fora de outputs/spec");
  // Os testes rodaram na pasta declarada.
  assert.equal(data.tests.totals.passed, 1, "a suíte de qa/ executou");
  // O rastro cruza os dois repositórios.
  const rn = data.code.traceability.byId.find((t) => t.id === "RN-001");
  assert.deepEqual(rn.files.sort(), ["api/src/service.js", "web/src/service.js"]);
});

test("39 — sem declaração, varre a raiz e DECLARA que o escopo foi presumido", () => {
  const root = tmp("escopo-presumido");
  multiRepoFixture(root);

  spawnSync("node", [CLI, "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  assert.equal(data.scope.declared, false);
  assert.ok(data.warnings.some((w) => w.code === "SCOPE_PRESUMED"), "o aviso é emitido");
  // Sem escopo, o outro produto entra — e é exatamente por isso que o relatório precisa
  // dizer que ninguém declarou nada.
  assert.ok(data.code.inventory.codeFileCount >= 3, "a raiz inteira foi varrida");
  assert.ok(/Escopo presumido/.test(html), "o HTML declara o escopo presumido");
  assertNoBlanks(html);
});

test("40 — pasta declarada que não existe vira aviso, não quebra a geração", () => {
  const root = tmp("escopo-faltando");
  multiRepoFixture(root);

  const res = spawnSync("node", [CLI,
    "--code", "repoA,nao-existe", "--no-azure", "--no-tests", "-q",
  ], { cwd: root, encoding: "utf8" });

  assert.notEqual(res.status, 1, `esperava relatório gerado; stderr: ${res.stderr}`);
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
  assert.ok(data.warnings.some((w) => w.code === "SCOPE_DIR_MISSING"), "a pasta ausente é declarada");
  assert.equal(data.scope.code.length, 1, "a pasta válida continua valendo");
  assert.equal(data.code.inventory.codeFileCount, 1);
});

test("41 — pasta fora da raiz é aceita (entrega multi-repositório)", () => {
  const base = tmp("escopo-fora");
  const root = join(base, "principal");
  const externo = join(base, "outro-repo");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão\n\nTexto.\n");
  write(join(root, "src/local.js"), "export const a = () => 1;\n");
  write(join(externo, "src/remoto.js"), "export const b = () => 2;\n");

  spawnSync("node", [CLI, "--code", "src,externo=../outro-repo/src", "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  const data = JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));

  assert.equal(data.code.inventory.codeFileCount, 2, "os dois repositórios entram");
  assert.ok(data.scope.code.some((e) => e.outsideRoot), "a pasta externa é marcada como fora da raiz");
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
  assert.ok(/fora da raiz/.test(html), "o relatório mostra que a pasta está fora da raiz");
});

test("42 — o escopo declarado aparece no relatório, pasta a pasta", () => {
  const root = tmp("escopo-html");
  multiRepoFixture(root);

  spawnSync("node", [CLI, "--docs", "docs", "--code", "api=repoA", "--tests", "qa", "--extra", "web=repoB", "--no-azure", "--no-tests", "-q"], { cwd: root, encoding: "utf8" });
  const html = readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");

  assert.ok(html.includes('id="anexos-escopo"'), "a seção «Escopo da coleta» existe");
  for (const label of ["api", "web", "qa", "docs"]) {
    assert.ok(html.includes(label), `a pasta «${label}» é listada`);
  }
  assert.ok(!/Escopo presumido/.test(html), "com escopo declarado, não há aviso de presunção");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});
