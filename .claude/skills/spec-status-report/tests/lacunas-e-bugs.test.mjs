// Regressão da v2.2: a aba «O que falta testar» (#lacunas-teste), a seção «Bugs por
// módulo» e o --render-only relendo todos os artefatos de extensão.
//
// Rodar:  node --test tests/*.test.mjs        (a partir da pasta desta skill)
//         node --test tests/lacunas-e-bugs.test.mjs
//
// Cada teste trava uma promessa da especificação desta versão. As fixtures são
// sintéticas: o caso «escala» reproduz as CONTAGENS de um projeto de médio porte
// (144 bugs; 13 pela tag, 11 pelo título, 90 pelo item-pai, 30 sem pista), não os dados.

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(SKILL, "cli.mjs");
const load = (rel) => import(pathToFileURL(join(SKILL, rel)).href);

const { analyzeBugs, applyBugSignal, bugSignal, weeklyEvolution } = await load("lib/bug-modules.mjs");
const { buildTestGaps } = await load("lib/lacunas-teste.mjs");
const { collectExtras } = await load("lib/collect-extras.mjs");
const { collectAzure, fetchAncestors, normalizeItems } = await load("lib/collect-azure.mjs");
const { normalizeTasksJson } = await load("lib/discover-artifacts.mjs");
const { renderStatusHtml } = await load("lib/render-status-html.mjs");
const { fmtDate } = await load("lib/render-shared.mjs");
const { inline } = await load("lib/escape.mjs");
const { collectProjectRules } = await load("lib/collect-docs.mjs");

// As pastas temporárias são apagadas no fim da suíte — antes ficavam no %TEMP% para sempre.
const TEMP_DIRS = [];
after(() => { for (const d of TEMP_DIRS) rmSync(d, { recursive: true, force: true }); });
function tmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `ssr-v22-${prefix}-`));
  TEMP_DIRS.push(d);
  return d;
}
function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2), "utf8");
}
const readData = (root) => JSON.parse(readFileSync(join(root, "outputs/spec/status/status-data.json"), "utf8"));
const readHtml = (root) => readFileSync(join(root, "outputs/spec/status/status-report.html"), "utf8");
const run = (root, args) => spawnSync("node", [CLI, ...args], { cwd: root, encoding: "utf8" });

/** Toda âncora citada na navegação existe como id no documento. */
function assertNoOrphanAnchors(html) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const orphans = [...html.matchAll(/data-anchor="([^"]+)"/g)].map((m) => m[1]).filter((a) => !ids.has(a));
  assert.deepEqual(orphans, [], `links da navegação sem destino: ${orphans.join(", ")}`);
}
function assertNoBlanks(html) {
  const conteudo = html.replace(/<script>[\s\S]*?<\/script>/g, "");
  for (const bad of ["undefined", "NaN", "[object Object]", ">null<"]) {
    assert.ok(!conteudo.includes(bad), `«${bad}» apareceu no HTML entregue ao cliente`);
  }
  assert.ok(!/<td><\/td>/.test(conteudo), "célula de tabela vazia");
  assert.ok(!/<tbody>\s*<\/tbody>/.test(conteudo), "tabela sem nenhuma linha");
}
/** Recorte de uma seção do HTML: do id até o próximo h2 do mesmo domínio. */
function section(html, id) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return "";
  const next = html.indexOf("<h2 id=", start + 1);
  return html.slice(start, next < 0 ? html.length : next);
}

/**
 * Projeto com código, testes executáveis e quatro regras:
 *   RN-001 — tem teste que passa         (fora da lista)
 *   RN-002 — implementada, sem teste      (camada automática)
 *   RN-003 — tem teste que FALHA          (anexo, com a causa da triagem)
 *   RN-004 — nem código nem teste         (camada automática, «sem vínculo»)
 */
function projectWithTests(root) {
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Projeto Lacunas\n\nTexto.\n");
  write(join(root, "outputs/spec/business-rules.md"), [
    "# Regras", "",
    "### RN-001 — Regra com teste", "Módulo MOD-PED. Enunciado um.", "",
    "### RN-002 — Regra implementada sem teste", "Módulo MOD-PED. Enunciado dois.", "",
    "### RN-003 — Regra com teste que falha", "Módulo MOD-CAD. Enunciado três.", "",
    "### RN-004 — Regra sem nada", "Módulo MOD-CAD. Enunciado quatro.", "",
  ].join("\n"));
  write(join(root, "src/a.js"), "// RN-001 RN-003\nexport const a = 1;\n");
  write(join(root, "src/b.js"), "// RN-002 — implementa a regra dois\nexport const b = 2;\n");
  write(join(root, "src/c.js"), "export const c = 3;\n");
  write(join(root, "package.json"), { name: "lac", private: true, type: "module", scripts: { test: "node --test" } });
  write(join(root, "tests/a.test.js"), [
    'import { test } from "node:test";',
    'import assert from "node:assert/strict";',
    'test("RN-001 — passa", () => assert.ok(true));',
    'test("RN-003 — falha", () => assert.equal(1, 2));',
  ].join("\n"));
}

const CURATED = (over = {}) => ({
  generatedAt: "2099-12-31",
  basis: "fixture",
  traceTotal: 4,
  items: [
    {
      id: "RN-002", rule: "A regra dois diz isto por extenso.",
      implementation: { state: "implemented", where: [{ file: "src/b.js", role: "aplica a regra dois" }] },
      existingTest: null,
      testsToCreate: [{ layer: "unitario", repo: "app", file: "tests/b.test.js", scenarios: ["quando o valor é zero, o sistema recusa"] }],
      priority: "alta", priorityReason: "regra implementada e sem teste",
      poQuestions: ["O zero vale como valor válido?"],
    },
    {
      id: "RN-004", rule: "A regra quatro.",
      implementation: { state: "absent" },
      testsToCreate: [{ layer: "e2e-tela", repo: "e2e", scenarios: ["quando a tela abre, o sistema mostra o total"] }],
      priority: "baixa", doneWithoutCode: ["resolvido por configuração no WI 61"],
    },
  ],
  poQuestions: [{ area: "MOD-PED", text: "O zero vale como valor válido?" }],
  contradictingTests: [{ test: "A::b", rule: "RN-001", text: "o teste afirma o contrário da regra" }],
  ...over,
});
const FINDINGS = { causes: [{ id: "C1", label: "Defeito de produto — cálculo errado", count: 1, dependsOn: "Equipe executora", cases: ["a.test.js :: RN-003 — falha"] }] };

/* ═════════════════════════ «O que falta testar» ═════════════════════════ */

test("43 — item sem teste aparece na camada automática; item com teste falhando vai para o anexo com a causa", () => {
  const root = tmp("lac-auto");
  projectWithTests(root);
  write(join(root, "outputs/spec/test-findings.json"), FINDINGS);
  run(root, ["--no-azure", "--no-coverage", "-q"]);
  const data = readData(root);
  const html = readHtml(root);

  const g = data.testGaps;
  assert.equal(g.available, true, `a aba deveria existir: ${g.reason || ""}`);
  assert.deepEqual(g.items.map((i) => i.id).sort(), ["RN-002", "RN-004"], "só os dois itens sem nenhum teste");
  const rn2 = g.items.find((i) => i.id === "RN-002");
  assert.equal(rn2.situation, "implemented", "o código cita RN-002");
  assert.ok(rn2.codeRefs.some((r) => r.file.endsWith("src/b.js") && r.line === 1), "arquivo:linha da referência no código");
  assert.ok(!rn2.codeRefs.some((r) => /\.md$/.test(r.file)), "documento .md não conta como código");
  assert.equal(g.items.find((i) => i.id === "RN-004").situation, "unmapped");
  assert.ok(!g.items.some((i) => i.id === "RN-001" || i.id === "RN-003"), "item com teste não entra na lista");

  assert.equal(g.failing.length, 1);
  assert.equal(g.failing[0].id, "RN-003");
  assert.equal(g.failing[0].causes[0].label, "Defeito de produto — cálculo errado", "causa casada pelo código no nome do caso");

  assert.ok(html.includes('data-domain="lacunas-teste"'), "a aba existe");
  assert.ok(html.includes('data-domain-link="lacunas-teste"'), "e está no menu");
  assert.ok(/Leitura reduzida/.test(section(html, "h-lacunas-teste") || html), "sem análise curada, a aba diz por que está reduzida");
  assert.ok(section(html, "lacunas-falhando").includes("Defeito de produto — cálculo errado"), "a causa aparece no anexo");
  assert.ok(/análise detalhada pendente/.test(section(html, "lacunas-itens")), "item sem análise leva o selo");
  assert.ok(!/id="lacunas-po"/.test(html), "sem análise não há pontos para o Dono do Produto");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("44 — test-gaps.json com id desconhecido gera TEST_GAPS_UNKNOWN_ID e o item não entra na aba", () => {
  const traceMatrix = matrix(4, 2);
  const g = buildTestGaps({
    traceMatrix, tests: TESTS_OK, code: CODE_OK, collectedAt: "2026-10-14T12:00:00Z",
    curated: curatedOf([{ id: "RN-904" }, { id: "RN-404" }], { generatedAt: "2026-10-14", traceTotal: 4 }),
  });
  const w = g.warnings.find((x) => x.code === "TEST_GAPS_UNKNOWN_ID");
  assert.ok(w, "aviso de id desconhecido");
  assert.match(w.message, /RN-404/);
  assert.ok(!g.items.some((i) => i.id === "RN-404"), "id desconhecido não entra");
  assert.ok(g.items.find((i) => i.id === "RN-904").curated, "o conhecido entra com a análise");
  assert.equal(g.items.find((i) => i.id === "RN-903").curated, false, "o não analisado entra sem análise");
  assert.ok(!g.warnings.some((x) => x.code === "TEST_GAPS_STALE"), "mesmo dia e mesmo total não é desatualização");
});

test("45 — análise mais antiga que a coleta, ou feita contra outro total da matriz, gera TEST_GAPS_STALE", () => {
  const base = { traceMatrix: matrix(4, 2), tests: TESTS_OK, code: CODE_OK, collectedAt: "2026-10-14T12:00:00Z" };
  const antiga = buildTestGaps({ ...base, curated: curatedOf([{ id: "RN-904" }], { generatedAt: "2026-10-13", traceTotal: 4 }) });
  assert.ok(antiga.warnings.some((x) => x.code === "TEST_GAPS_STALE"), "data anterior à coleta");
  assert.equal(antiga.curated.stale, true);
  const outroTotal = buildTestGaps({ ...base, curated: curatedOf([{ id: "RN-904" }], { generatedAt: "2026-10-15", traceTotal: 160 }) });
  const w = outroTotal.warnings.find((x) => x.code === "TEST_GAPS_STALE");
  assert.ok(w, "total diferente");
  assert.match(w.message, /160/);
});

test("46 — a projeção de cobertura sai da contagem dos itens, e não existe sem a camada curada", () => {
  // 10 itens, 4 com teste; análise: 3 marcar, 2 criar do zero, 1 com a implementação.
  const traceMatrix = matrix(10, 4);
  const items = [
    { id: "RN-905", existingTest: { file: "x", test: "t", action: "mark-id" }, implementation: { state: "implemented", where: [] } },
    { id: "RN-906", existingTest: { file: "x", test: "t", action: "mark-id" }, implementation: { state: "implemented", where: [] } },
    { id: "RN-907", existingTest: { file: "x", test: "t", action: "mark-id" }, implementation: { state: "implemented", where: [] } },
    { id: "RN-908", implementation: { state: "implemented", where: [] }, testsToCreate: [{ layer: "unitario", scenarios: ["quando x, o sistema y"] }] },
    { id: "RN-909", implementation: { state: "partial", where: [] }, testsToCreate: [{ layer: "integracao", scenarios: ["quando x, o sistema y"] }] },
    { id: "RN-910", implementation: { state: "absent", where: [] }, testsToCreate: [{ layer: "e2e-tela", scenarios: ["quando x, o sistema y"] }] },
  ];
  const g = buildTestGaps({ traceMatrix, tests: TESTS_OK, code: CODE_OK, collectedAt: "2026-10-14T00:00:00Z", curated: curatedOf(items, { traceTotal: 10, generatedAt: "2026-10-14" }) });
  assert.deepEqual([g.actions["mark-id"], g.actions.create, g.actions["with-impl"]], [3, 2, 1]);
  assert.equal(g.projection.current, 40);
  assert.equal(g.projection.projectedCount, 9, "(4 com teste + 3 marcar + 2 criar)");
  assert.equal(g.projection.projected, 90);

  const sem = buildTestGaps({ traceMatrix, tests: TESTS_OK, code: CODE_OK, collectedAt: "2026-10-14T00:00:00Z" });
  assert.equal(sem.projection, null, "sem análise curada não há projeção");
  assert.equal(sem.actions.pending, 6, "todos os itens sem teste ficam com a análise pendente");
});

test("47 — com a camada curada, a aba traz ações, projeção, regra de contagem, achados, pontos do PO e cartões", () => {
  const root = tmp("lac-curada");
  projectWithTests(root);
  write(join(root, "outputs/spec/test-findings.json"), FINDINGS);
  write(join(root, "outputs/spec/status/test-gaps.json"), CURATED());
  run(root, ["--no-azure", "--no-coverage", "-q", "--export-test-gaps-md"]);
  const html = readHtml(root);
  const data = readData(root);

  for (const id of ["lacunas-acoes", "lacunas-prioridade", "lacunas-regra", "lacunas-achados", "lacunas-po", "lacunas-itens", "lacunas-falhando"]) {
    assert.ok(html.includes(`id="${id}"`), `seção ${id}`);
  }
  // Ordem pedida: abertura → ações → prioridade/área → regra → achados → PO → itens → anexo.
  const pos = ["lacunas-acoes", "lacunas-prioridade", "lacunas-regra", "lacunas-achados", "lacunas-po", "lacunas-itens", "lacunas-falhando"].map((id) => html.indexOf(`id="${id}"`));
  assert.deepEqual(pos, [...pos].sort((a, b) => a - b), "as seções saem na ordem da especificação");
  assert.match(section(html, "lacunas-acoes"), /sobe de <strong>50%<\/strong> para <strong>75%<\/strong>/, "projeção (2 com teste + 1 criar do zero) de 4");
  assert.ok(/@DisplayName/.test(section(html, "lacunas-regra")), "exemplo de JUnit");
  assert.ok(section(html, "lacunas-po").includes("O zero vale como valor válido?"), "ponto para o PO");
  assert.equal((section(html, "lacunas-po").match(/O zero vale como valor válido\?/g) || []).length, 1, "sem repetição");
  assert.ok(section(html, "lacunas-achados").includes("resolvido por configuração no WI 61"), "feito sem código");
  assert.ok(section(html, "lacunas-achados").includes("o teste afirma o contrário da regra"), "teste contraditório");
  assert.ok(section(html, "lacunas-itens").includes("quando o valor é zero, o sistema recusa"), "cenário do teste a criar");
  // Contagem de prioridade e de ação vem dos itens.
  assert.equal(data.testGaps.priorities.alta, 1);
  assert.equal(data.testGaps.priorities.baixa, 1);
  assert.ok(!/Leitura reduzida/.test(html), "com a análise, a aba não é reduzida");

  // Filtros por prioridade, ação, camada e repositório — e cada um tem o atributo na linha.
  const grid = html.slice(html.indexOf('id="grid-lacunas"'));
  for (const f of ["prioridade", "acao", "camada", "repositorio"]) {
    assert.ok(new RegExp(`data-grid-filter="${f}"`).test(grid), `filtro ${f}`);
    assert.ok(new RegExp(`data-${f}="`).test(grid), `atributo data-${f} na linha`);
  }
  assert.ok(/data-camada="\|Unitário\|"/.test(grid), "camada como valor múltiplo");

  // O .md sai do mesmo dado.
  const mdName = readdirSync(join(root, "outputs/spec/status")).find((n) => /^testes-a-criar-\d{4}-\d{2}-\d{2}\.md$/.test(n));
  assert.ok(mdName, "testes-a-criar-<data>.md gravado");
  const md = readFileSync(join(root, "outputs/spec/status", mdName), "utf8");
  assert.ok(md.includes("quando o valor é zero, o sistema recusa") && md.includes("de **50%** para **75%**"), "o .md tem o conteúdo da aba");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);
});

test("48 — sem matriz de rastreabilidade, a aba não existe e não sobra link no menu", () => {
  const root = tmp("lac-sem-matriz");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Sem Matriz\n\nTexto.\n");
  write(join(root, "src/a.js"), "export const a = 1;\n");
  write(join(root, "package.json"), { name: "sm", private: true, type: "module", scripts: { test: "node --test" } });
  write(join(root, "tests/a.test.js"), 'import { test } from "node:test";\ntest("passa", () => {});\n');
  run(root, ["--no-azure", "--no-coverage", "-q"]);
  const html = readHtml(root);
  const data = readData(root);
  assert.equal(data.testGaps, null, "sem RN/RF não há matriz");
  assert.ok(!html.includes('data-domain="lacunas-teste"'), "sem aba");
  assert.ok(!html.includes('data-domain-link="lacunas-teste"'), "sem link no menu");
  assert.ok(!data.domains.some((d) => d.id === "lacunas-teste"), "nem no inventário de domínios");
  assertNoOrphanAnchors(html);
});

test("48b — com matriz mas sem testes executados, a aba não existe (sem teste ≠ não executado)", () => {
  const root = tmp("lac-no-tests");
  projectWithTests(root);
  write(join(root, "outputs/spec/status/test-gaps.json"), CURATED());
  run(root, ["--no-azure", "--no-tests", "-q"]);
  const html = readHtml(root);
  const data = readData(root);
  assert.equal(data.testGaps.available, false);
  assert.ok(!html.includes('data-domain="lacunas-teste"'), "não lista como sem teste o que só não foi executado");
  assert.ok(data.warnings.some((w) => w.code === "TEST_GAPS_NOT_MEASURED"), "a análise presente e não usada é declarada");
});

/* ═════════════════════════ --render-only ═════════════════════════ */

test("49 — o --render-only relê test-findings.json e test-gaps.json alterados depois da coleta", () => {
  const root = tmp("lac-render-only");
  projectWithTests(root);
  run(root, ["--no-azure", "--no-coverage", "-q"]);
  const antes = readData(root);
  assert.equal(antes.extras.testFindings, null);
  assert.equal(antes.testGaps.curated, null);

  // Depois da coleta: a triagem e a análise são escritas, e o render-only tem de vê-las.
  write(join(root, "outputs/spec/test-findings.json"), FINDINGS);
  write(join(root, "outputs/spec/status/test-gaps.json"), CURATED({ items: [...CURATED().items, { id: "RN-777" }] }));
  const res = run(root, ["--render-only", "--no-azure"]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /relidos do disco: .*test-findings\.json.*test-gaps\.json/, "o log diz o que foi relido");
  const depois = readData(root);
  assert.ok(depois.extras.testFindings, "triagem recarregada");
  assert.equal(depois.testGaps.curated.analyzed, 2, "análise recarregada");
  assert.ok(depois.warnings.some((w) => w.code === "TEST_GAPS_UNKNOWN_ID"), "aviso da nova leitura");
  const html = readHtml(root);
  assert.ok(html.includes("A regra dois diz isto por extenso."), "conteúdo curado no HTML");
  assert.ok(section(html, "lacunas-falhando").includes("Defeito de produto — cálculo errado"), "causa no anexo");

  // Corrigido o arquivo, o aviso some — os avisos dos extras são trocados, não acumulados.
  write(join(root, "outputs/spec/status/test-gaps.json"), CURATED());
  run(root, ["--render-only", "-q"]);
  assert.ok(!readData(root).warnings.some((w) => w.code === "TEST_GAPS_UNKNOWN_ID"), "aviso antigo não sobrevive");
});

/* ═════════════════════════ bugs por módulo ═════════════════════════ */

const KNOWN = {
  modules: [
    { id: "MOD-ESTOQUE", name: "Estoque" }, { id: "MOD-PAINEL", name: "Painel do Gestor" },
    { id: "MOD-HOME", name: "Página inicial" }, { id: "MOD-CAT", name: "Catálogo" },
    { id: "MOD-ORCAMENTO", name: "Orçamento" },
  ],
  rules: [], requirements: { functional: [], nonFunctional: [] }, productRequirements: [],
};
const bugItem = (o) => ({ type: "Bug", state: "Active", category: "inProgress", tags: [], createdDate: "2026-09-01T00:00:00Z", areaPath: "PROJ", ...o });
const azureOf = (items, ancestors = []) => ({ available: true, collectedAt: "2026-10-13T00:00:00Z", items, ancestors });

test("50 — a atribuição de módulo segue a ordem 1→6 e cada bug guarda a regra que decidiu", () => {
  const items = [
    // 1 vence a tag: decisão humana registrada.
    bugItem({ id: 1, title: "[Estoque] com mapa", tags: ["MOD-HOME"] }),
    // 2 vence o título.
    bugItem({ id: 2, title: "MOD-CAT no título", tags: ["MOD-HOME"] }),
    // 3: código no título, e prefixo resolvido pela sigla e pelo nome.
    bugItem({ id: 3, title: "MOD-PAINEL quebra o painel" }),
    bugItem({ id: 4, title: "[Estoque] grupos e RT" }),
    bugItem({ id: 5, title: "[Página inicial] busca" }),
    // 4: pai com RF-MOD-…-NNN no título; e épica com epic-json → tasks.json.
    bugItem({ id: 6, title: "Ajustes", parentId: 900 }),
    bugItem({ id: 7, title: "Ajustes", parentId: 901 }),
    // 5: subnível da área.
    bugItem({ id: 8, title: "Ajustes", areaPath: "PROJ\\Estoque" }),
    // 6: nenhuma pista.
    bugItem({ id: 9, title: "Ajustes gerais" }),
    { id: 900, type: "User Story", title: "STORY-002: RF-MOD-HOME-002 — Busca", tags: [], parentId: 902 },
    { id: 901, type: "User Story", title: "STORY-003 sem pista", tags: [], parentId: 902 },
    { id: 902, type: "Epic", title: "EPIC-001: Catálogo", tags: ["epic-json:EPIC-001"], parentId: null },
  ];
  const tasks = normalizeTasksJson({ epics: [{ id: "EPIC-001", modulesAffected: ["MOD-ORCAMENTO", "TODOS"] }], stories: [] });
  assert.deepEqual(tasks.epics[0].modules, ["MOD-ORCAMENTO"], "o tasks.json dá o módulo da épica; «TODOS» não é módulo");
  const b = analyzeBugs({ azure: azureOf(items), tasks, business: KNOWN, moduleMap: { map: { 1: ["MOD-ESTOQUE"] } } });
  const by = Object.fromEntries(b.items.map((x) => [x.id, x]));
  assert.deepEqual([by[1].rule, by[1].modules], ["mapa", ["MOD-ESTOQUE"]]);
  assert.deepEqual([by[2].rule, by[2].modules], ["tag", ["MOD-HOME"]]);
  assert.deepEqual([by[3].rule, by[3].modules], ["titulo", ["MOD-PAINEL"]]);
  assert.deepEqual([by[4].rule, by[4].modules], ["titulo", ["MOD-ESTOQUE"]], "prefixo pela sigla");
  assert.deepEqual([by[5].rule, by[5].modules], ["titulo", ["MOD-HOME"]], "prefixo pelo nome do modules.md");
  assert.deepEqual([by[6].rule, by[6].modules], ["ancestral", ["MOD-HOME"]], "RF-MOD-HOME-002 no pai → MOD-HOME");
  assert.match(by[6].evidence, /#900/);
  assert.deepEqual([by[7].rule, by[7].modules], ["ancestral", ["MOD-ORCAMENTO"]], "épica com epic-json → tasks.json");
  assert.deepEqual([by[8].rule, by[8].modules], ["area", ["MOD-ESTOQUE"]]);
  assert.deepEqual([by[9].rule, by[9].modules], ["nenhuma", []]);
  assert.equal(b.modules[b.modules.length - 1].label, "Sem módulo identificado", "a barra sem módulo fica por último");
});

test("51 — duas tags de módulo: o bug conta em cada uma e a seção avisa a dupla contagem", () => {
  const b = analyzeBugs({ azure: azureOf([bugItem({ id: 1, title: "x", tags: ["MOD-CAT", "MOD-ESTOQUE", "revisao"] }), bugItem({ id: 2, title: "y", tags: ["MOD-CAT"] })]), business: KNOWN });
  assert.deepEqual(b.items[0].modules.sort(), ["MOD-CAT", "MOD-ESTOQUE"]);
  assert.equal(b.multiModule.bugs, 1);
  assert.equal(b.multiModule.extraCounts, 1);
  assert.equal(b.modules.reduce((a, m) => a + m.total, 0), 3, "a soma das linhas passa do total de 2");
  assert.equal(b.total, 2, "o total distinto não muda");
});

test("52 — nenhuma atribuição sai da semelhança de palavras do título", () => {
  const items = [
    bugItem({ id: 1, title: "Ajustes no formulário da Estoque" }),         // a palavra não é pista
    bugItem({ id: 2, title: "Estoque: erro ao salvar" }),                  // sem colchetes não é prefixo
    bugItem({ id: 3, title: "[Busca avançada] filtros divergem", tags: ["mod-home"] }), // minúscula não é o formato; prefixo sem módulo igual
    bugItem({ id: 4, title: "[Bug] servico.CAT.api lança erro" }),           // «Bug» não é módulo; «CAT» fora do colchete não conta
    bugItem({ id: 5, title: "[PED] simulação", tags: [] }),              // «PED» bate com mais de um? não: só com sigla exata
  ];
  const b = analyzeBugs({ azure: azureOf(items), business: { ...KNOWN, modules: [...KNOWN.modules, { id: "MOD-CONTRATO", name: "Contrato" }] } });
  for (const it of b.items) assert.equal(it.rule, "nenhuma", `bug ${it.id} («${it.title}») não pode ganhar módulo por palavra`);
  assert.equal(b.modules.length, 1);
  assert.equal(b.modules[0].label, "Sem módulo identificado");
});

test("53 — fixture de escala: 144 bugs, 13 pela tag, 11 pelo título, 90 pelo item-pai, 30 sem pista", () => {
  const { items, ancestors, tasks } = escalaFixture();
  const b = analyzeBugs({ azure: azureOf(items, ancestors), tasks, business: ESCALA_DOCS });
  assert.equal(b.total, 144);
  assert.equal(b.attribution.tag, 13);
  assert.equal(b.attribution.titulo, 11);
  assert.equal(b.attribution.ancestral, 90);
  assert.equal(b.attribution.nenhuma, 30);
  assert.equal(b.attribution.area + b.attribution.mapa, 0, "o AreaPath é o do projeto em todos");
  assert.equal(b.multiModule.bugs, 1, "o bug de revisão com cinco tags");
  assert.equal(b.multiModule.extraCounts, 4);
  const none = b.modules.find((m) => m.none);
  assert.equal(none.total, 30);
  assert.equal(b.modules[b.modules.length - 1], none, "«Sem módulo identificado» por último");
  // Ordenação: abertos e depois total.
  const real = b.modules.filter((m) => !m.none);
  for (let i = 1; i < real.length; i++) {
    const [p, c] = [real[i - 1], real[i]];
    assert.ok(p.open > c.open || (p.open === c.open && p.total >= c.total), `ordem: ${p.label} antes de ${c.label}`);
  }
});

test("54 — a evolução semanal só existe com 4 semanas ou mais de dado", () => {
  const tres = [0, 7, 14].map((d, i) => bugItem({ id: i + 1, title: "x", tags: ["MOD-CAT"], createdDate: new Date(Date.UTC(2026, 8, 7 + d)).toISOString() }));
  const b3 = analyzeBugs({ azure: azureOf(tres), business: KNOWN });
  assert.equal(b3.weeksWithData, 3);
  assert.equal(b3.weekly, null, "com 3 semanas não há gráfico semanal");

  const quatro = [...tres, bugItem({ id: 9, title: "y", tags: ["MOD-CAT"], state: "Closed", category: "done", createdDate: "2026-09-07T00:00:00Z", closedDate: "2026-10-01T00:00:00Z" })];
  const b4 = analyzeBugs({ azure: azureOf(quatro), business: KNOWN });
  assert.equal(b4.weeksWithData, 4, "a semana do fechamento conta como semana com dado");
  assert.ok(b4.weekly && b4.weekly.weeks.length >= 4);
  assert.equal(b4.weekly.weeks.reduce((a, w) => a + w.opened, 0), 4);
  assert.equal(b4.weekly.weeks.reduce((a, w) => a + w.closed, 0), 1);
  assert.equal(weeklyEvolution([]).weeksWithData, 0);
});

test("55 — semáforo: «Bugs abertos» é informativo e vira atenção por concentração (≥ 40%) ou por falta de módulo (> 25%)", () => {
  const mk = (mods) => analyzeBugs({ azure: azureOf(mods.map((t, i) => bugItem({ id: i + 1, title: "x", tags: t ? [t] : [] }))), business: KNOWN });
  const equilibrado = bugSignal(mk(["MOD-CAT", "MOD-CAT", "MOD-ESTOQUE", "MOD-ESTOQUE", "MOD-HOME", "MOD-HOME"]));
  assert.equal(equilibrado.level, "info", "33% por módulo, todos com módulo");
  const concentrado = bugSignal(mk(["MOD-CAT", "MOD-CAT", "MOD-CAT", "MOD-ESTOQUE", "MOD-HOME"]));
  assert.equal(concentrado.level, "warn");
  assert.match(concentrado.message, /concentra 3 dos 5/);
  const semModulo = bugSignal(mk(["MOD-CAT", "MOD-ESTOQUE", "MOD-HOME", null, null]));
  assert.equal(semModulo.level, "warn");
  assert.match(semModulo.message, /marque a tag MOD-XXX nos cards/);
});

test("56 — na aba de execução: gráfico com title/desc, tabela de apoio, severidade só com o campo, e sem bugs não há seção", () => {
  const root = tmp("bugs-html");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Bugs\n\nTexto.\n");
  write(join(root, "outputs/spec/modules.md"), "# Módulos\n\n| Código | Nome | Propósito |\n|---|---|---|\n| MOD-CAT | Catálogo | declara |\n| MOD-ESTOQUE | Estoque | manejo |\n");
  const items = [
    { id: 1, title: "A", type: "Bug", state: "Active", tags: ["MOD-CAT"], severity: "2 - High", createdDate: "2026-09-01T00:00:00Z" },
    { id: 2, title: "B", type: "Bug", state: "Closed", tags: ["MOD-CAT"], createdDate: "2026-09-02T00:00:00Z", closedDate: "2026-09-20T00:00:00Z" },
    { id: 3, title: "[Estoque] C", type: "Bug", state: "New", tags: [], severity: "3 - Medium", createdDate: "2026-09-03T00:00:00Z" },
    { id: 4, title: "Sem pista", type: "Bug", state: "Active", tags: [], createdDate: "2026-09-04T00:00:00Z" },
    { id: 5, title: "Tarefa", type: "Task", state: "Active", tags: [] },
  ];
  write(join(root, "outputs/spec/status/azure-snapshot.json"), { project: "P", collectedAt: "2026-10-01T00:00:00Z", items });
  run(root, ["--no-tests", "--no-code", "-q"]);
  const html = readHtml(root);
  const sec = section(html, "gestao-bugs");
  assert.ok(sec, "a seção existe");
  assert.match(sec, /<svg[^>]*role="img"[^>]*aria-labelledby="([^"\s]+)-t \1-d"/, "svg ligado ao title e ao desc");
  assert.match(sec, /<title id="[^"]+-t">Bugs por módulo, abertos e fechados<\/title><desc id/, "title e desc");
  assert.ok(/class="bugc-open"/.test(sec) && /class="bugc-closed"/.test(sec), "cores por classe do tema");
  assert.ok(/class="bugc-none-open"/.test(sec), "linha sem módulo em cor neutra");
  // lastIndexOf: o mesmo texto aparece antes, na legenda do gráfico.
  assert.ok(sec.indexOf("Estoque (MOD-ESTOQUE)</text>") > 0, "rótulo do módulo com o nome do modules.md");
  assert.ok(sec.lastIndexOf("Sem módulo identificado</text>") > sec.indexOf("Estoque (MOD-ESTOQUE)</text>"), "sem módulo depois dos módulos no gráfico");
  assert.ok(/Abertos por severidade/.test(sec), "com o campo, a coluna de severidade existe");
  assert.ok(/2 - High: 1/.test(sec));
  assert.ok(html.includes('id="grid-bugs"'), "lista bug a bug com a pista");
  assert.ok(/data-grid-filter="modulo" data-grid-multi/.test(html), "filtro de módulo aceita bug em dois módulos");
  assert.ok(!/BUG_SEVERITY_ABSENT/.test(html), "com severidade, nada a declarar");
  assert.ok(readData(root).health.signals.some((s) => s.area === "Bugs abertos"), "sinal no semáforo");
  assertNoOrphanAnchors(html);
  assertNoBlanks(html);

  // Sem o campo de severidade: a coluna sai e a ausência é declarada.
  write(join(root, "outputs/spec/status/azure-snapshot.json"), { project: "P", collectedAt: "2026-10-01T00:00:00Z", items: items.map(({ severity, ...x }) => x) });
  run(root, ["--no-tests", "--no-code", "-q"]);
  const semSev = readHtml(root);
  assert.ok(!/Abertos por severidade/.test(section(semSev, "gestao-bugs")), "sem campo, sem coluna");
  assert.ok(section(semSev, "visao-limitacoes").includes("BUG_SEVERITY_ABSENT"), "declarado em Limitações desta geração");

  // Sem bug no escopo: a seção não existe.
  write(join(root, "outputs/spec/status/azure-snapshot.json"), { project: "P", items: [items[4]] });
  run(root, ["--no-tests", "--no-code", "-q"]);
  const semBug = readHtml(root);
  assert.ok(!semBug.includes('id="gestao-bugs"'), "sem bugs, sem seção");
  assert.ok(!readData(root).health.signals.some((s) => s.area === "Bugs abertos"), "nem sinal no semáforo");
  assertNoOrphanAnchors(semBug);
});

test("57 — --bug-types aceita os nomes de um processo customizado", () => {
  const root = tmp("bug-types");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Tipos\n\nTexto.\n");
  write(join(root, "outputs/spec/status/azure-snapshot.json"), { project: "P", items: [
    { id: 1, title: "x", type: "Defeito", state: "Ativo", tags: ["MOD-A"] },
    { id: 2, title: "y", type: "Bug", state: "Ativo", tags: ["MOD-A"] },
  ] });
  run(root, ["--no-tests", "--no-code", "-q"]);
  assert.equal(readData(root).bugs.total, 1, "sem a flag, só «Bug»");
  run(root, ["--no-tests", "--no-code", "-q", "--bug-types", "Bug,Defeito"]);
  assert.equal(readData(root).bugs.total, 2);
});

test("58 — o cruzamento com a triagem de testes só usa causa classificada como defeito de produto, com módulo declarado", () => {
  const findings = {
    causes: [
      { id: "C1", label: "Defeito de produto — X", count: 2, cases: ["a.spec :: RN-SD-001 quebra"] },
      { id: "C2", label: "Provável defeito — a investigar", count: 1, cases: ["b.spec :: RN-SD-002"] },
      { id: "C3", label: "Defeito de produto — Y", count: 1, module: "MOD-ESTOQUE", cases: [] },
      { id: "C4", label: "Defeito de produto — Z sem pista", count: 1, cases: ["c.spec :: algo"] },
    ],
  };
  const extras = normFindings(findings);
  const b = analyzeBugs({
    azure: azureOf([bugItem({ id: 1, title: "x", tags: ["MOD-CAT"] })]), business: KNOWN, findings: extras,
    traceRows: [{ id: "RN-SD-001", module: "MOD-CAT" }, { id: "RN-SD-002", module: "MOD-CAT" }],
  });
  assert.equal(b.testDefects.total, 3, "«Provável defeito» não é defeito classificado");
  assert.equal(b.testDefects.byModule["MOD-CAT"], 1, "pelo código do item no nome do caso");
  assert.equal(b.testDefects.byModule["MOD-ESTOQUE"], 1, "pelo módulo declarado na causa");
  assert.equal(b.testDefects.unattributed, 1, "sem pista, sem módulo — nada de assunto do texto");
  assert.ok(b.modules.some((m) => m.code === "MOD-ESTOQUE" && m.total === 0 && m.testDefects === 1), "módulo só com defeito de teste entra na tabela");
});

test("59 — REST: os pais dos bugs fora do escopo são buscados até a Epic e não entram no backlog", async () => {
  const pais = {
    50: { id: 50, fields: { "System.WorkItemType": "User Story", "System.Title": "STORY-1: RF-MOD-CAT-001 — x", "System.Parent": 60 } },
    60: { id: 60, fields: { "System.WorkItemType": "Epic", "System.Title": "EPIC-1", "System.Parent": 70 } },
    70: { id: 70, fields: { "System.WorkItemType": "Bug", "System.Title": "ciclo de vínculo" } },
  };
  const pedidos = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const ids = JSON.parse(init.body).ids;
    pedidos.push(ids);
    return { ok: true, status: 200, text: async () => JSON.stringify({ value: ids.map((i) => pais[i]).filter(Boolean) }) };
  };
  try {
    const items = normalizeItems([
      { id: 1, fields: { "System.WorkItemType": "Bug", "System.Title": "bug", "System.Parent": 50 } },
      { id: 2, fields: { "System.WorkItemType": "Task", "System.Title": "task", "System.Parent": 99 } },
    ]).items;
    const anc = await fetchAncestors("https://x", "Basic y", "7.1", items, ["Bug"], 1000);
    assert.deepEqual(anc.map((a) => a.id).sort(), [50, 60], "sobe do bug até a Epic e para — a Task não puxa o pai dela");
    assert.ok(anc.every((a) => a.outOfScope), "marcados como fora do escopo");
    assert.deepEqual(pedidos, [[50], [60]], "um pedido por nível, só com o que falta");
    const b = analyzeBugs({ azure: { available: true, items, ancestors: anc }, business: { modules: [{ id: "MOD-CAT", name: "SD" }] } });
    assert.deepEqual(b.items[0].modules, ["MOD-CAT"], "o pai buscado decide o módulo");
  } finally {
    globalThis.fetch = original;
  }
});

test("60 — os grids novos honram o contrato do script do cliente e o HTML continua bem formado", async () => {
  const vm = await import("node:vm");
  const root = tmp("lac-contrato");
  projectWithTests(root);
  write(join(root, "outputs/spec/status/test-gaps.json"), CURATED());
  write(join(root, "outputs/spec/status/azure-snapshot.json"), { project: "P", items: [
    { id: 1, title: "x", type: "Bug", state: "Active", tags: ["MOD-PED", "MOD-CAD"] },
    { id: 2, title: "y", type: "Bug", state: "Closed", tags: [] },
  ] });
  run(root, ["--no-coverage", "-q"]);
  const raw = readHtml(root);
  for (const s of [...raw.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])) assert.doesNotThrow(() => new vm.Script(s));
  const html = raw.replace(/<script>[\s\S]*?<\/script>/g, "");
  for (const id of ["grid-lacunas", "grid-bugs"]) {
    const g = html.slice(html.indexOf(`id="${id}"`)).split("data-grid-root")[0];
    assert.ok(/<tr[^>]*data-index=/.test(g), `${id}: linhas`);
    for (const f of [...g.matchAll(/data-grid-filter="([^"]+)"/g)].map((m) => m[1])) {
      assert.ok(new RegExp(`data-${f}="`).test(g), `${id}: filtro «${f}» sem atributo na linha`);
    }
    for (const c of [...g.matchAll(/<th class="num sortable" data-sort="([^"]+)"/g)].map((m) => m[1])) {
      assert.ok(new RegExp(`data-num-${c}="`).test(g), `${id}: coluna numérica «${c}» sem chave`);
    }
  }
  // Tags balanceadas, incluindo title/desc dentro do SVG.
  const VOID = new Set(["meta", "link", "br", "hr", "img", "input", "circle", "rect", "path", "line", "text", "use", "stop", "col", "source"]);
  const stack = [];
  let skip = null;
  for (const m of raw.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const [, close, name, attrs] = m;
    const n = name.toLowerCase();
    if (skip) { if (close && n === skip) skip = null; continue; }
    if (!close && (n === "script" || n === "style")) { skip = n; continue; }
    if (VOID.has(n) || attrs.trim().endsWith("/")) continue;
    if (close) assert.equal(stack.pop(), n, `fecha </${n}> fora de ordem`);
    else stack.push(n);
  }
  assert.deepEqual(stack, []);
  assertNoOrphanAnchors(raw);
  assertNoBlanks(raw);
});

test("61 — a área agrupa pelo módulo canônico: RF-MOD-CADASTRO-002 e RF-MOD-CADASTRO-ENDERECO-001 caem em MOD-CADASTRO", () => {
  // O caso: o leitor de documentos devolve o «módulo» de dentro do ID do requisito
  // (MOD-CADASTRO-002), e cada requisito virava uma área própria na aba.
  const traceMatrix = matrix(3, 0);
  traceMatrix.rows[0].module = "MOD-CADASTRO-002";
  traceMatrix.rows[1].module = "MOD-CADASTRO-ENDERECO-001";
  traceMatrix.rows[2].module = "MOD-CADASTRO";
  const g = buildTestGaps({ traceMatrix, tests: TESTS_OK, code: CODE_OK, business: { modules: [{ id: "MOD-CADASTRO", name: "Cadastro" }] } });
  assert.deepEqual(g.areas.map((a) => [a.name, a.total]), [["Cadastro (MOD-CADASTRO)", 3]]);
  assert.ok(g.items.every((i) => i.module === "MOD-CADASTRO"));
});

/* ═════════════════════════ revisão da v2.2 ═════════════════════════ */

test("62 — semáforo: com menos de 5 bugs abertos, concentração e falta de módulo não rebaixam o projeto", () => {
  const mk = (mods) => analyzeBugs({ azure: azureOf(mods.map((t, i) => bugItem({ id: i + 1, title: "x", tags: t ? [t] : [] }))), business: KNOWN });
  assert.equal(bugSignal(mk(["MOD-CAT"])).level, "info", "1 bug aberto num módulo não é «100% concentrado»");
  assert.equal(bugSignal(mk([null])).level, "info", "1 bug aberto sem módulo também não");
  assert.equal(bugSignal(mk(["MOD-CAT", "MOD-CAT", "MOD-CAT", "MOD-CAT"])).level, "info", "4 abertos ainda é amostra pequena");
  const health = applyBugSignal({ level: "ok", label: "Saudável", signals: [] }, mk(["MOD-CAT"]));
  assert.equal(health.level, "ok", "o nível geral continua Saudável");
  assert.equal(bugSignal(mk(["MOD-CAT", "MOD-CAT", "MOD-CAT", "MOD-CAT", "MOD-CAT"])).level, "warn", "a partir de 5 abertos a regra dos 40% vale");
});

test("63 — semana dos bugs no fuso do relatório: início AAAA-MM-DD, dia certo na tabela e ano quando a janela cruza anos", () => {
  // 07/09/2026 01:00 UTC é domingo, 06/09, 22h em Brasília: a semana é a que começa em 31/08.
  // 07/09/2026 03:30 UTC já é segunda, 00:30 em Brasília: semana de 07/09.
  const w = weeklyEvolution([{ createdDate: "2026-09-07T01:00:00Z", open: true }, { createdDate: "2026-09-07T03:30:00Z", open: true }]);
  assert.deepEqual(w.weeks.map((x) => [x.start, x.label, x.opened]), [["2026-08-31", "31 ago", 1], ["2026-09-07", "07 set", 1]]);
  assert.equal(fmtDate(w.weeks[0].start), "31/08/2026", "a tabela mostra a segunda-feira da semana, não o dia anterior");
  const virada = weeklyEvolution([{ createdDate: "2025-12-24T15:00:00Z", open: true }, { createdDate: "2026-01-14T15:00:00Z", open: true }]);
  assert.equal(virada.weeks[0].label, "22 dez 2025");
  assert.equal(virada.weeks[virada.weeks.length - 1].label, "12 jan 2026");
});

test("64 — análise do mesmo dia local da coleta não é desatualização, mesmo com a coleta já no dia seguinte em UTC", () => {
  // Coleta às 22h de 13/10 em Brasília = 01h de 14/10 em UTC.
  const g = buildTestGaps({
    traceMatrix: matrix(4, 2), tests: TESTS_OK, code: CODE_OK, collectedAt: "2026-10-14T01:00:00Z",
    curated: curatedOf([{ id: "RN-904" }], { generatedAt: "2026-10-13", traceTotal: 4 }),
  });
  assert.ok(!g.warnings.some((x) => x.code === "TEST_GAPS_STALE"), "mesmo dia em Brasília");
  const velha = buildTestGaps({
    traceMatrix: matrix(4, 2), tests: TESTS_OK, code: CODE_OK, collectedAt: "2026-10-14T01:00:00Z",
    curated: curatedOf([{ id: "RN-904" }], { generatedAt: "2026-10-12", traceTotal: 4 }),
  });
  const w = velha.warnings.find((x) => x.code === "TEST_GAPS_STALE");
  assert.ok(w, "dia anterior continua velho");
  assert.match(w.message, /coleta, de 2026-10-13/, "o dia da coleta citado é o do fuso do relatório");
});

test("65 — --input de terceiro não é regravado; o status-data.json padrão continua sendo", () => {
  const root = tmp("input-terceiro");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Entrada\n\nTexto.\n");
  run(root, ["--no-azure", "--no-tests", "--no-code", "-q"]);
  const padrao = join(root, "outputs/spec/status/status-data.json");
  const alheio = join(root, "terceiro/dados.json");
  // Compacto de propósito: qualquer regravação o deixaria diferente, byte a byte.
  write(alheio, JSON.stringify(JSON.parse(readFileSync(padrao, "utf8"))));
  const antes = readFileSync(alheio, "utf8");
  const res = run(root, ["--input", alheio, "-o", join(root, "terceiro/relatorio.html"), "-q"]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(readFileSync(alheio, "utf8"), antes, "o arquivo de entrada fica intacto");
  assert.ok(existsSync(join(root, "terceiro/relatorio.html")), "o HTML sai");

  write(padrao, JSON.stringify(JSON.parse(readFileSync(padrao, "utf8"))));
  const compacto = readFileSync(padrao, "utf8");
  assert.equal(run(root, ["--render-only", "-q"]).status, 0);
  assert.notEqual(readFileSync(padrao, "utf8"), compacto, "sem --input, o arquivo padrão do projeto é regravado com a releitura");
});

test("66 — test-gaps.json ausente não é «ausente» nem limitação; presente e inválido continua avisando", () => {
  const root = tmp("sem-gaps");
  const out = join(root, "outputs/spec");
  write(join(out, "product-vision.md"), "# Visão de Produto — Sem análise\n\nTexto.\n");
  assert.ok(!collectExtras({ root, outputsDir: out, writeDir: out }).inventory.missing.includes("test-gaps.json"), "o passo 4 é opcional");
  run(root, ["--no-azure", "--no-tests", "--no-code", "-q"]);
  assert.ok(!section(readHtml(root), "visao-limitacoes").includes("test-gaps.json"), "nada em «Limitações desta geração»");

  write(join(out, "status/test-gaps.json"), "{ não é json");
  const x = collectExtras({ root, outputsDir: out, writeDir: out });
  assert.ok(x.warnings.some((w) => w.code === "EXTRA_ARTIFACT_INVALID" && /test-gaps\.json/.test(w.message)), "inválido avisa");
});

test("67 — REST: campo opcional que o processo não tem (TF51535) não derruba o lote", async () => {
  const root = tmp("azure-campos");
  const out = join(root, "outputs/spec");
  mkdirSync(out, { recursive: true });
  const env = { pat: process.env.AZURE_DEVOPS_PAT, org: process.env.AZURE_DEVOPS_ORG, project: process.env.AZURE_DEVOPS_PROJECT };
  Object.assign(process.env, { AZURE_DEVOPS_PAT: "x", AZURE_DEVOPS_ORG: "minha-org", AZURE_DEVOPS_PROJECT: "P" });
  const pedidos = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes("/wit/wiql")) return { ok: true, status: 200, text: async () => JSON.stringify({ workItems: [{ id: 1 }] }) };
    if (u.includes("/wit/workitemsbatch")) {
      const body = JSON.parse(init.body);
      pedidos.push(body.fields);
      if (body.fields.includes("Microsoft.VSTS.Common.Severity")) {
        return { ok: false, status: 400, text: async () => JSON.stringify({ message: "TF51535: Cannot find field Microsoft.VSTS.Common.Severity." }) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ value: [{ id: 1, fields: { "System.WorkItemType": "Bug", "System.Title": "x", "System.State": "Active" } }] }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({}) };
  };
  try {
    const az = await collectAzure(root, out, { writeDir: out });
    assert.equal(az.mode, "rest", JSON.stringify(az.warnings));
    assert.equal(az.items.length, 1, "o lote veio na segunda tentativa");
    assert.ok(!pedidos[pedidos.length - 1].includes("Microsoft.VSTS.Common.Severity"), "refeito sem os campos opcionais");
    assert.ok(pedidos[pedidos.length - 1].includes("System.Title"), "os obrigatórios continuam");
    assert.ok(az.warnings.some((w) => w.code === "AZURE_OPTIONAL_FIELDS_ABSENT"), "e a ausência é declarada");
  } finally {
    globalThis.fetch = original;
    for (const [k, v] of [["AZURE_DEVOPS_PAT", env.pat], ["AZURE_DEVOPS_ORG", env.org], ["AZURE_DEVOPS_PROJECT", env.project]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test("68 — bugTypes como texto («Bug, Defeito») não quebra a análise", () => {
  const b = analyzeBugs({ azure: azureOf([bugItem({ id: 1, title: "x", type: "Defeito" }), bugItem({ id: 2, title: "y" })]), business: KNOWN, bugTypes: "Bug, Defeito" });
  assert.equal(b.total, 2);
  assert.deepEqual(b.types, ["Bug", "Defeito"]);
});

test("69 — código de módulo no título: prefixo qualquer perde o número, e a fronteira à direita é respeitada", () => {
  const items = [
    bugItem({ id: 1, title: "STORY-MOD-HOME-002 ajuste na busca" }),
    bugItem({ id: 2, title: "TC-MOD-ESTOQUE-014 falhou" }),
    bugItem({ id: 3, title: "MOD-CAT-Api quebra" }),
    bugItem({ id: 4, title: "US-MOD-PEDIDOS-3 — erro" }),
  ];
  const sem = analyzeBugs({ azure: azureOf(items) });
  assert.deepEqual(sem.items.map((x) => x.modules), [["MOD-HOME"], ["MOD-ESTOQUE"], ["MOD-CAT"], ["MOD-PEDIDOS"]], "sem modules.md");
  const com = analyzeBugs({ azure: azureOf([bugItem({ id: 5, title: "MOD-CAT-API quebra" })]), business: KNOWN });
  assert.deepEqual(com.items[0].modules, ["MOD-CAT"], "com a lista, a forma canônica manda");
});

test("70 — link de markdown protocolo-relativo (//host ou /\\host) não sai como href", () => {
  for (const href of ["//exemplo.invalid/x", "/\\exemplo.invalid/x"]) {
    assert.match(inline(`[x](${href})`), /href="#"/, href);
  }
  for (const href of ["/docs/a.md", "./a.md", "../a.md", "#secao", "https://exemplo.invalid/"]) {
    assert.ok(inline(`[x](${href})`).includes(`href="${href}"`), href);
  }
});

test("71 — «O que falta testar»: arquivo que cita o item vira link quando o repositório está configurado", () => {
  const root = tmp("lac-link");
  projectWithTests(root);
  write(join(root, "outputs/spec/status/status-report-content.json"), { repo: { provider: "azure", org: "minha-org", project: "MeuProjeto", repository: "meu-repo", branch: "main" } });
  run(root, ["--no-azure", "--no-coverage", "-q"]);
  const sec = section(readHtml(root), "lacunas-itens");
  assert.match(sec, /<a class="src"[^>]*data-repo="meu-repo"[^>]*data-path="\/src\/b\.js"/, "link com repositório e caminho");
});

test("72 — o mesmo dado renderizado duas vezes no mesmo processo dá o mesmo HTML (ids dos gráficos estáveis)", () => {
  const root = tmp("ids-estaveis");
  write(join(root, "outputs/spec/product-vision.md"), "# Visão de Produto — Ids\n\nTexto.\n");
  write(join(root, "outputs/spec/status/azure-snapshot.json"), { project: "P", collectedAt: "2026-10-01T00:00:00Z", items: [
    { id: 1, title: "A", type: "Bug", state: "Active", tags: ["MOD-CAT"], createdDate: "2026-09-01T00:00:00Z" },
    { id: 2, title: "B", type: "Bug", state: "Closed", tags: ["MOD-ESTOQUE"], createdDate: "2026-09-02T00:00:00Z", closedDate: "2026-09-20T00:00:00Z" },
  ] });
  run(root, ["--no-tests", "--no-code", "-q"]);
  const data = readData(root);
  const a = renderStatusHtml(data);
  const b = renderStatusHtml(data);
  assert.ok(/chart-a11y-/.test(a), "há gráfico com title/desc");
  assert.equal(a, b);
});

test("73 — rules do projeto: lê as três pastas que existirem e rotula cada uma pela pasta real", () => {
  // Os nomes vão por partes pelo mesmo motivo do coletor: os geradores Kiro/Cursor reescrevem
  // o literal da pasta do Claude Code, e a fixture tem de continuar criando três pastas.
  const root = tmp("rules-tres");
  const pastas = [["." + "claude", "rules"], ["." + "cursor", "rules"], ["." + "kiro", "steering"]];
  pastas.forEach((p, i) => write(join(root, ...p, `regra-${i}.md`), `# Regra ${i}\n\nTexto.\n`));
  const rules = collectProjectRules(root, join(root, "outputs/spec"));
  assert.deepEqual(rules.map((r) => [r.name, r.origins]), pastas.map((p, i) => [`regra-${i}`, [p.join("/")]]));
});

/* ═════════════════════════ fixtures ═════════════════════════ */

const TESTS_OK = { executed: true, cases: [{ name: "x" }], detection: { runners: [{ id: "node-test" }] }, suites: [] };
const CODE_OK = { inventory: { codeFileCount: 3 } };

/** Matriz sintética: `total` itens RN-9xx, os `withTest` primeiros com teste. */
function matrix(total, withTest) {
  const rows = [];
  for (let i = 1; i <= total; i++) {
    const id = `RN-${900 + i}`;
    rows.push({
      id, kind: "RN", kindLabel: "Regra de negócio", title: `Regra ${i}`, module: "MOD-X", statement: `Enunciado ${i}`,
      status: i <= withTest ? "verified" : "implemented",
      codeRefs: [{ file: "src/x.js", line: i }], tasks: [], workItems: [], testCases: [],
      testTotals: { total: i <= withTest ? 1 : 0, passed: i <= withTest ? 1 : 0, failed: 0, skipped: 0 },
    });
  }
  return { rows, total, counts: {} };
}

/** Passa a análise pelo normalizador de verdade, para o teste valer sobre o que o CLI lê. */
function curatedOf(items, over = {}) {
  const root = tmp("curated");
  const out = join(root, "outputs/spec");
  write(join(out, "status/test-gaps.json"), { items, ...over });
  return collectExtras({ root, outputsDir: out, writeDir: out }).testGaps;
}
function normFindings(data) {
  const root = tmp("findings");
  const out = join(root, "outputs/spec");
  write(join(out, "test-findings.json"), data);
  return collectExtras({ root, outputsDir: out, writeDir: out }).testFindings;
}

const ESCALA_DOCS = {
  modules: [],
  rules: ["MOD-HOME", "MOD-ORCAMENTO", "MOD-CONTRATO", "MOD-CAT", "MOD-FRETE", "MOD-DEVOL", "MOD-ESTOQUE", "MOD-RASTREIO", "MOD-CUPOM", "MOD-PAINEL", "MOD-NOTA", "MOD-CORE"]
    .map((m, i) => ({ id: `RN-S-${i}`, module: `${m}-001` })),
  requirements: { functional: [], nonFunctional: [] }, productRequirements: [],
};

/**
 * Reprodução sintética da ESTRUTURA de um projeto de médio porte — os títulos e os
 * números de card são inventados, as formas de pista são as observadas:
 *   · 13 por tag: 1 com cinco tags MOD (revisão), 3 MOD-FRONTEND, 9 MOD-PEDIDOS;
 *   · 11 pelo título: 3 com código MOD no título, 1 «[Painel]», 7 «[Estoque]»;
 *   · 90 pelo item-pai: 60 sob história com RF-MOD-…-NNN no título, 30 sob história sem
 *     pista cuja épica tem epic-json:EPIC-XXX no tasks.json;
 *   · 30 sem pista: sem pai, ou pai sem pista sob épica fora do tasks.json, incluindo os
 *     títulos que só PARECEM dizer o módulo («[Bug] …», «[Busca avançada] …» com tag
 *     minúscula, «Ajustes no formulário da Estoque»).
 */
function escalaFixture() {
  const items = [];
  let id = 1000;
  const bug = (o) => items.push(bugItem({ id: id++, areaPath: "PROJ", ...o }));
  const ancestors = [];
  const node = (o) => { ancestors.push({ tags: [], ...o }); return o.id; };

  bug({ title: "[rev] lista de lojas invisível", tags: ["revisao", "MOD-PEDIDOS", "MOD-CORE", "MOD-ESTOQUE", "MOD-FRETE", "MOD-CAT"] });
  for (let i = 0; i < 3; i++) bug({ title: `Rótulos em inglês ${i}`, tags: ["MOD-FRONTEND"] });
  for (let i = 0; i < 9; i++) bug({ title: `[Cadastro - Documentos] divergência ${i}`, tags: ["ajustes", "MOD-PEDIDOS"], state: i < 4 ? "Active" : "Closed", category: i < 4 ? "inProgress" : "done", closedDate: i < 4 ? null : "2026-10-10T00:00:00Z" });

  bug({ title: "MOD-PAINEL — hardening pós-auditoria" });
  bug({ title: "MOD-DEVOLUCAO não propaga o desconto" });
  bug({ title: "MOD-FATURAMENTO não propaga o desconto" });
  bug({ title: "[Painel] fechamento do caixa" });
  for (let i = 0; i < 7; i++) bug({ title: `[Estoque] correção ${i}` });

  const epicCode = node({ id: 6, type: "Epic", title: "EPIC-001: Catálogo de Serviços", tags: ["epic", "epic-json:EPIC-001"], parentId: null });
  const epicEstoque = node({ id: 7, type: "Epic", title: "EPIC-007: Estoque", tags: ["epic-json:EPIC-007"], parentId: 9001 }); // ciclo: épica filha de um bug
  const storyCodes = ["RF-MOD-HOME-002", "RF-MOD-CAT-001+002+003", "RF-MOD-ORCAMENTO-001+002", "RF-MOD-FRETE-001", "RF-MOD-PAINEL-005"];
  const stories = storyCodes.map((c, i) => node({ id: 20 + i, type: "User Story", title: `STORY-00${i}: ${c} — história`, parentId: epicCode }));
  for (let i = 0; i < 60; i++) bug({ title: `Ajustes ${i}`, parentId: stories[i % stories.length], state: i % 3 ? "Closed" : "Active", category: i % 3 ? "done" : "inProgress", closedDate: i % 3 ? "2026-09-15T00:00:00Z" : null });
  const semPista = node({ id: 40, type: "User Story", title: "EST-S1 — Saldo por depósito", parentId: epicEstoque });
  for (let i = 0; i < 30; i++) bug({ title: `Demais ajustes ${i}`, parentId: semPista, state: "Closed", category: "done", closedDate: "2026-08-20T00:00:00Z" });

  const orfa = node({ id: 50, type: "Feature", title: "EST-F — Blindagem do wizard", tags: ["frontend", "hardening"], parentId: 9002 });
  node({ id: 9002, type: "Epic", title: "EPIC-015: Módulo de Estoque — Inventário", tags: ["epic-json:EPIC-015"], parentId: null });
  bug({ title: "[Bug] servico.CAT.api — valor errado" });
  bug({ title: "[Busca avançada] filtros divergem", tags: ["ajustes", "mod-home"] });
  bug({ title: "Ajustes no formulário da Estoque" });
  for (let i = 0; i < 16; i++) bug({ title: `Ajustes ${i}` });
  for (let i = 0; i < 10; i++) bug({ title: `Remoção de elementos ${i}`, parentId: orfa });

  items.push({ id: 9001, type: "Bug", title: "Ajustes nas conferências de inventário", tags: [], parentId: null, state: "Closed", category: "done", areaPath: "PROJ", createdDate: "2026-06-01T00:00:00Z", closedDate: "2026-06-20T00:00:00Z" });

  const tasks = normalizeTasksJson({
    epics: [
      { id: "EPIC-001", modulesAffected: ["MOD-HOME"] },
      { id: "EPIC-007", modulesAffected: ["MOD-ESTOQUE"] },
      { id: "EPIC-012", modulesAffected: ["TODOS"] },
    ],
    stories: [],
  });
  return { items, ancestors, tasks };
}
