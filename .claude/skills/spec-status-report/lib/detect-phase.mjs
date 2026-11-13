// detect-phase.mjs — descobre em que momento do pipeline o projeto está.
//
// Estágios (crescentes):
//   discovery      — artefatos de negócio existem, ainda não há backlog nem contratos técnicos
//   specification  — backlog/contratos técnicos existem, ainda não há código de implementação
//   implementation — existe código de implementação (e possivelmente testes)
//   delivery       — implementação + testes executáveis + backlog majoritariamente concluído
//
// A detecção é por SINAIS observáveis, nunca por pergunta ao usuário. Cada sinal é
// registrado com o artefato que o produziu, para o relatório poder mostrar "por que
// achamos que estamos nesta fase" — auditável em vez de mágico.

import { join } from "node:path";
import { dirExists, readJson, relPosix, walkFiles } from "./util.mjs";
import { isCountedAsCode, isTestPath } from "./languages.mjs";
import { discoverArtifacts, findArtifactAny } from "./discover-artifacts.mjs";
import { statSync } from "node:fs";

export const STAGES = ["discovery", "specification", "implementation", "delivery"];

const DISCOVERY_ARTIFACTS = [
  "discovery-document.md", "context-map.md", "product-vision.md", "business-rules.md",
  "requirements.md", "product-requirements.md", "modules.md", "benchmark.md",
  "legacy.md", "flow-map.md", "threat-model.md",
];

const SPEC_ARTIFACTS = [
  "data-model.json", "api-contracts.yaml", "tasks.json", "test-plan.md",
  "security-review.md", "estimate-report.md", "id-map.json",
];

/**
 * Resolve o caminho de um artefato do pipeline.
 *
 * Delega para `discover-artifacts`, que conhece os layouts de TODAS as versões do kit
 * (outputs/spec, outputs/ plano, task-generator/outputs) e os nomes antigos de cada
 * artefato. `rootHint` permite procurar fora de outputsDir; sem ele, usa o pai de
 * outputsDir como raiz provável.
 */
export function findArtifact(outputsDir, name, rootHint = null) {
  const root = rootHint || join(outputsDir, "..", "..");
  const hit = findArtifactAny(root, outputsDir, name);
  if (hit) return hit.path;
  // artefatos desta própria skill (status/) e da spec-estimate (estimate/)
  for (const sub of ["status", "estimate", "report", "signals"]) {
    const p = join(outputsDir, sub, name);
    try { if (statSync(p).isFile()) return p; } catch { /* próximo */ }
  }
  return null;
}

export function detectPhase(root, outputsDir, { override = "auto" } = {}) {
  const signals = [];
  const artifacts = {};
  const discovery = discoverArtifacts(root, outputsDir);

  const note = (hit) => `${hit.rel}${hit.layout !== "atual" ? ` · layout ${hit.layout}` : ""}${hit.renamed ? ` · nome legado "${hit.alias}"` : ""}`;
  for (const name of DISCOVERY_ARTIFACTS) {
    const hit = discovery.found[name];
    if (hit) { artifacts[name] = hit.path; signals.push({ stage: "discovery", signal: `artefato ${name}`, evidence: note(hit) }); }
  }
  for (const name of SPEC_ARTIFACTS) {
    const hit = discovery.found[name];
    if (hit) { artifacts[name] = hit.path; signals.push({ stage: "specification", signal: `artefato ${name}`, evidence: note(hit) }); }
  }

  // Código de implementação: arquivos de código fora de outputs/, inputs/, skills/ e .cursor/.claude
  const code = probeCode(root);
  if (code.prodFiles > 0) {
    signals.push({ stage: "implementation", signal: `${code.prodFiles} arquivo(s) de código de produção`, evidence: code.sampleDirs.join(", ") || "raiz do repo" });
  }
  if (code.testFiles > 0) {
    signals.push({ stage: "implementation", signal: `${code.testFiles} arquivo(s) de teste`, evidence: code.testSampleDirs.join(", ") });
  }
  const specStories = probeSpecStories(root);
  if (specStories.length) {
    signals.push({ stage: "implementation", signal: `${specStories.length} spec_story.md (memória do spec-implement)`, evidence: specStories.slice(0, 3).map((p) => relPosix(root, p)).join(", ") });
  }
  const audit = discovery.found["code-audit.md"]?.path || null;
  if (audit) signals.push({ stage: "delivery", signal: "code-audit.md (Fase 12 executada)", evidence: relPosix(root, audit) });

  // Conclusão do backlog: se tasks.json existe e há id-map, o coletor Azure decide o resto.
  const tasks = artifacts["tasks.json"] ? readJson(artifacts["tasks.json"]) : null;
  if (discovery.usesLegacyLayout) {
    signals.push({
      stage: "compatibilidade",
      signal: `artefatos em layout de versão anterior (${discovery.legacyLayouts.join(", ")})`,
      evidence: discovery.roots.filter((r) => r.layout !== "atual").map((r) => r.rel).join(", "),
    });
  }

  let stage = "discovery";
  if (Object.keys(artifacts).some((k) => SPEC_ARTIFACTS.includes(k))) stage = "specification";
  if (code.prodFiles >= 3 || specStories.length > 0) stage = "implementation";
  if (stage === "implementation" && audit && code.testFiles > 0) stage = "delivery";

  const detected = stage;
  if (override && override !== "auto") {
    if (!STAGES.includes(override)) throw new Error(`fase inválida: ${override} (use ${STAGES.join("|")})`);
    stage = override;
  }

  return {
    stage,
    detected,
    overridden: stage !== detected,
    signals,
    artifacts,
    code,
    specStories,
    hasAudit: Boolean(audit),
    tasksMeta: tasks && typeof tasks === "object" ? (tasks.metadata || null) : null,
    label: stageLabel(stage),
    description: stageDescription(stage),
    discovery,
  };
}

export function stageLabel(stage) {
  return {
    discovery: "Discovery concluído",
    specification: "Especificação técnica",
    implementation: "Implementação em curso",
    delivery: "Entrega / conclusão",
  }[stage] || stage;
}

export function stageDescription(stage) {
  return {
    discovery: "Levantamento de negócio, regras e requisitos concluído. Backlog técnico e contratos ainda não fechados.",
    specification: "Modelo de dados, contratos de API e backlog técnico especificados. Implementação ainda não iniciada (ou nos primeiros commits).",
    implementation: "Código sendo escrito contra o backlog especificado; testes e rastreabilidade negócio→código já mensuráveis.",
    delivery: "Implementação, testes e auditoria de código concluídos — pacote em condição de entrega ao cliente.",
  }[stage] || "";
}

const CODE_SKIP_TOP = new Set([
  "outputs", "inputs", "skills", ".cursor", ".claude", ".claude-plugin", "plugin",
  "docs", "deprecated", "scripts",
]);

function probeCode(root) {
  const { files, truncated } = walkFiles(root, { maxFiles: 25_000 });
  let prodFiles = 0; let testFiles = 0;
  const dirs = new Set(); const testDirs = new Set();
  for (const f of files) {
    const rel = relPosix(root, f);
    const top = rel.split("/")[0];
    if (CODE_SKIP_TOP.has(top)) continue;
    if (!isCountedAsCode(rel)) continue;
    if (isTestPath(rel)) { testFiles++; if (testDirs.size < 4) testDirs.add(rel.split("/").slice(0, 2).join("/")); continue; }
    prodFiles++;
    if (dirs.size < 6) dirs.add(rel.includes("/") ? rel.split("/").slice(0, 2).join("/") : "(raiz)");
  }
  return { prodFiles, testFiles, sampleDirs: [...dirs], testSampleDirs: [...testDirs], truncated };
}

function probeSpecStories(root) {
  const roots = ["src", "apps", "packages", "services", "modules", "backend", "frontend", "."]
    .map((d) => join(root, d)).filter((d) => dirExists(d));
  const found = new Set();
  for (const r of roots) {
    const { files } = walkFiles(r, { maxFiles: 6000, maxDepth: 6 });
    for (const f of files) if (/spec_story\.md$/i.test(f)) found.add(f);
  }
  return [...found];
}
