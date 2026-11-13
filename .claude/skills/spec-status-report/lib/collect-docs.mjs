// collect-docs.mjs — extrai a documentação de negócio e a documentação técnica dos
// artefatos de outputs/spec/ e das rules do projeto.
//
// Princípio: NADA é inventado aqui. O coletor lê os .md/.json/.yaml existentes, estrutura
// (módulos, RN, RF/RNF, PR, GAPs, entidades, endpoints) e devolve dados. Toda narrativa
// curada é responsabilidade do agente, via executive-summary.md (opcional).

import { join, basename } from "node:path";
import {
  asArray, dirExists, fileExists, readJson, readText, relPosix, truncate, uniq, walkFiles,
} from "./util.mjs";
import { findArtifact as findArtifactIn } from "./detect-phase.mjs";
import { findArtifactAny } from "./discover-artifacts.mjs";

/**
 * Lê a documentação de negócio e técnica.
 *
 * `docRoots` são as pastas de documentação DECLARADAS pelo usuário. A busca continua
 * começando pela pasta de outputs (onde o pipeline grava), e só então percorre as
 * pastas declaradas — assim um projeto que mantém a documentação fora de
 * `outputs/spec` (um `docs/` do repositório, um diretório do cliente) é lido sem
 * precisar mover arquivo nenhum.
 */
export function collectDocs(root, outputsDir, { docRoots = [] } = {}) {
  const findArtifact = (dir, name) => findDoc(dir, name, docRoots);

  const business = {
    projectName: null,
    vision: null,
    modules: [],
    rules: [],
    requirements: { functional: [], nonFunctional: [] },
    productRequirements: [],
    flows: [],
    gaps: [],
    testPlanCases: [],
    chapters: [],
  };
  const technical = {
    rules: [],
    dataModel: null,
    apiContracts: null,
    threatModel: null,
    architecture: null,
    securityReview: null,
    codeAudit: null,
    estimate: null,
    chapters: [],
  };
  const warnings = [];

  // ——— Documentos de negócio ———
  const visionPath = findArtifact(outputsDir, "product-vision.md");
  if (visionPath) {
    const txt = readText(visionPath);
    business.vision = { path: relPosix(root, visionPath), markdown: txt };
    business.projectName = extractProjectName(txt);
  }

  const modulesPath = findArtifact(outputsDir, "modules.md");
  if (modulesPath) business.modules = parseModules(readText(modulesPath));

  const rulesPath = findArtifact(outputsDir, "business-rules.md");
  if (rulesPath) {
    business.rules = parseBusinessRules(readText(rulesPath));
    if (!business.rules.length) warnings.push({ code: "RULES_UNPARSED", message: `business-rules.md encontrado mas nenhuma RN reconhecida em ${relPosix(root, rulesPath)}` });
  }

  const reqPath = findArtifact(outputsDir, "requirements.md");
  if (reqPath) {
    const parsed = parseRequirements(readText(reqPath));
    business.requirements = parsed;
  }

  const prPath = findArtifact(outputsDir, "product-requirements.md");
  if (prPath) business.productRequirements = parseIdBlocks(readText(prPath), /\b(PR-[A-Z0-9-]+)\b/);

  const flowPath = findArtifact(outputsDir, "flow-map.md");
  if (flowPath) business.flows = parseFlowMap(readText(flowPath));

  const gapsPath = findArtifact(outputsDir, "gaps.md");
  if (gapsPath) business.gaps = parseGaps(readText(gapsPath));

  const testPlanPath = findArtifact(outputsDir, "test-plan.md");
  if (testPlanPath) business.testPlanCases = parseTestPlan(readText(testPlanPath));

  // Capítulos de negócio renderizados na íntegra (ordem = ordem de leitura do cliente)
  business.chapters = collectChapters(root, outputsDir, docRoots, [
    ["chap-vision", "Visão de Produto", "product-vision.md"],
    ["chap-modules", "Módulos do Produto", "modules.md"],
    ["chap-rules", "Regras de Negócio", "business-rules.md"],
    ["chap-requirements", "Requisitos (RF/RNF)", "requirements.md"],
    ["chap-ux", "Requisitos de Produto/UX", "product-requirements.md"],
    ["chap-flows", "Fluxos e Telas", "flow-map.md"],
    ["chap-discovery", "Descoberta", "discovery-document.md"],
    ["chap-context", "Mapa de Contexto", "context-map.md"],
    ["chap-benchmark", "Benchmark de Mercado", "benchmark.md"],
  ]);

  // ——— Documentação técnica ———
  technical.rules = collectProjectRules(root, outputsDir);

  const dmPath = findArtifact(outputsDir, "data-model.json");
  if (dmPath) {
    const dm = readJson(dmPath);
    if (dm === undefined) warnings.push({ code: "DATA_MODEL_INVALID", message: `data-model.json ilegível em ${relPosix(root, dmPath)}` });
    else technical.dataModel = summarizeDataModel(dm, relPosix(root, dmPath));
  }

  const apiPath = findArtifact(outputsDir, "api-contracts.yaml");
  if (apiPath) technical.apiContracts = summarizeApiContracts(readText(apiPath), relPosix(root, apiPath), readJson(findArtifact(outputsDir, "api-contracts-supplement.json") || ""));

  for (const [key, name, title] of [
    ["threatModel", "threat-model.md", "Modelo de Ameaças (STRIDE)"],
    ["architecture", "architecture.md", "Arquitetura AS-IS"],
    ["securityReview", "security-review.md", "Revisão de Segurança do Backlog"],
    ["codeAudit", "code-audit.md", "Auditoria de Código (Fase 12)"],
    ["estimate", "estimate-report.md", "Estimativa e Delivery"],
  ]) {
    const p = findArtifact(outputsDir, name);
    if (p) technical[key] = { title, path: relPosix(root, p), markdown: readText(p) };
  }

  technical.chapters = collectChapters(root, outputsDir, docRoots, [
    ["chap-architecture", "Arquitetura AS-IS", "architecture.md"],
    ["chap-threat", "Modelo de Ameaças", "threat-model.md"],
    ["chap-security", "Revisão de Segurança", "security-review.md"],
    ["chap-audit", "Auditoria de Código", "code-audit.md"],
    ["chap-legacy", "Legado AS-IS", "legacy.md"],
    ["chap-legacy-analysis", "Análise de Legado", "legacy-analysis.md"],
  ]);

  const syncLog = findArtifact(outputsDir, "sync-log.md");

  return {
    business,
    technical,
    syncLog: syncLog ? { path: relPosix(root, syncLog), markdown: readText(syncLog) } : null,
    warnings,
  };
}


/**
 * Procura um artefato de documentação.
 *
 * Ordem: a pasta de outputs (onde o pipeline grava) e, não achando, cada pasta de
 * documentação DECLARADA pelo usuário. Os aliases de nome continuam valendo em todas
 * elas — um `regras-negocio.md` num `docs/` do repositório é encontrado igual.
 */
function findDoc(outputsDir, name, docRoots = []) {
  const primary = findArtifactIn(outputsDir, name);
  if (primary) return primary;
  for (const d of docRoots || []) {
    const hit = findArtifactAny(d.dir, d.dir, name);
    if (hit) return hit.path;
  }
  return null;
}

function collectChapters(root, outputsDir, docRoots, spec) {
  const out = [];
  for (const [id, title, file] of spec) {
    const p = findDoc(outputsDir, file, docRoots);
    if (!p) continue;
    const md = readText(p);
    if (!md || !md.trim()) continue;
    out.push({ id, title, source: relPosix(root, p), markdown: md, chars: md.length });
  }
  return out;
}

export function extractProjectName(md) {
  if (!md) return null;
  const patterns = [
    /^#\s*(?:Vis[aã]o de Produto)\s*[—\-–:]\s*(.+)$/im,
    /^#\s+(.+)$/m,
    /^\|\s*\*{0,2}Projeto\*{0,2}\s*\|\s*(.+?)\s*\|/im,
    /^Projeto:\s*(.+)$/im,
  ];
  for (const re of patterns) {
    const m = re.exec(md);
    if (!m) continue;
    const name = m[1].replace(/[*`]/g, "").trim();
    if (!name || /\[nome do projeto\]/i.test(name) || /^vis[aã]o de produto$/i.test(name)) continue;
    return name;
  }
  return null;
}

/** modules.md → [{id, name, purpose}] */
export function parseModules(md) {
  if (!md) return [];
  const out = new Map();
  // Tabela: | MOD-001 | Nome | Propósito |
  const rowRe = /^\|\s*`?(MOD-[A-Z0-9-]+)`?\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/gim;
  let m;
  while ((m = rowRe.exec(md))) out.set(m[1], { id: m[1], name: clean(m[2]), purpose: clean(m[3]) });
  // Headings: ## Módulo: Nome (MOD-001)
  const headRe = /^#{2,4}\s*(?:M[óo]dulo:?\s*)?(.+?)\s*\(`?(MOD-[A-Z0-9-]+)`?\)\s*$/gim;
  while ((m = headRe.exec(md))) {
    const prev = out.get(m[2]) || { id: m[2], purpose: "" };
    out.set(m[2], { ...prev, name: clean(m[1]) || prev.name });
  }
  return [...out.values()];
}

/** business-rules.md → [{id, title, module, statement, markdown}] */
export function parseBusinessRules(md) {
  if (!md) return [];
  const blocks = splitByHeading(md, /^#{2,5}\s*`?(RN-[A-Z0-9-]+)`?\s*[—\-–:]?\s*(.*)$/im);
  return blocks.map((b) => ({
    id: b.id,
    title: clean(b.title) || b.id,
    module: firstMatch(b.body, /\|\s*\*{0,2}M[óo]dulo\*{0,2}\s*\|\s*`?(MOD-[A-Z0-9-]+)`?/i)
      || firstMatch(b.body, /\b(MOD-[A-Z0-9-]+)\b/),
    criticality: firstMatch(b.body, /\|\s*\*{0,2}(?:Criticidade|Severidade)\*{0,2}\s*\|\s*([^|]+)\|/i),
    statement: truncate(firstParagraph(b.body), 600),
    requirements: uniq(matchAll(b.body, /\b(RF-[A-Z0-9-]+)\b/)),
    markdown: b.body,
  }));
}

/** requirements.md → {functional:[{id,title,module,markdown}], nonFunctional:[...]} */
export function parseRequirements(md) {
  if (!md) return { functional: [], nonFunctional: [] };
  const fn = parseIdBlocks(md, /\b(RF-[A-Z0-9-]+)\b/);
  const nfn = parseIdBlocks(md, /\b(RNF-[A-Z0-9-]+)\b/);
  return { functional: fn, nonFunctional: nfn };
}

/**
 * Extrai itens por ID a partir de headings OU de linhas de tabela.
 * Serve para RF/RNF/PR — formatos variam entre projetos, os IDs não.
 */
export function parseIdBlocks(md, idRe) {
  if (!md) return [];
  const out = new Map();
  const source = idRe.source.replace(/\\b/g, "");
  // Índice de headings e de "## Módulo:" numa única passada. A versão anterior fazia
  // md.slice(0, m.index) + split de todo o resto por heading para CADA id: com 1600 RF
  // (2,2 MB) levava 1,5 s, e parseIdBlocks é chamado 3× sobre os mesmos arquivos.
  const anyHeading = [];
  const headingRe = /^#{2,6}\s.*$/gm;
  let h;
  while ((h = headingRe.exec(md))) anyHeading.push(h.index);
  const moduleMarks = [];
  const moduleRe = /^##\s*M[óo]dulo:[^(\n]*\(`?(MOD-[A-Z0-9-]+)`?\)/gim;
  while ((h = moduleRe.exec(md))) moduleMarks.push({ at: h.index, id: h[1] });
  const moduleBefore = (index) => {
    let found = null;
    for (const mk of moduleMarks) { if (mk.at <= index) found = mk.id; else break; }
    return found;
  };
  const nextHeadingAfter = (index) => {
    for (const at of anyHeading) if (at > index) return at;
    return md.length;
  };

  const headRe = new RegExp(`^#{2,6}\\s*\`?${source}\`?\\s*[—\\-–:]?\\s*(.*)$`, "gim");
  let m;
  while ((m = headRe.exec(md))) {
    const id = m[1];
    const bodyStart = m.index + m[0].length;
    const body = md.slice(bodyStart, nextHeadingAfter(bodyStart));
    out.set(id, {
      id,
      title: clean(m[2]) || id,
      module: firstMatch(body, /\b(MOD-[A-Z0-9-]+)\b/) || moduleBefore(m.index),
      statement: truncate(firstParagraph(body), 500),
      markdown: truncate(body, 4000),
    });
  }
  // Linhas de tabela
  const rowRe = new RegExp(`^\\|\\s*\`?${source}\`?\\s*\\|\\s*([^|]*)\\|`, "gim");
  while ((m = rowRe.exec(md))) {
    const id = m[1];
    if (out.has(id)) continue;
    const line = m[0];
    out.set(id, {
      id,
      title: clean(m[2]) || id,
      module: firstMatch(line, /\b(MOD-[A-Z0-9-]+)\b/),
      statement: clean(m[2]),
      markdown: "",
    });
  }
  return [...out.values()];
}

/** flow-map.md → [{id, name, type, actor, steps, screens:[{id,name,route}]}] */
export function parseFlowMap(md) {
  if (!md) return [];
  const flows = [];
  const blocks = splitByHeading(md, /^#{2,3}\s*`?(FLX-[A-Z0-9-]+)`?\s*[—\-–:]?\s*(.*)$/im);
  for (const b of blocks) {
    const screens = [];
    const screenRe = /`?(TEL-[A-Z0-9-]+)`?\s*[—\-–|:]\s*([^\n|]+)/g;
    let s;
    while ((s = screenRe.exec(b.body))) {
      if (!screens.some((x) => x.id === s[1])) screens.push({ id: s[1], name: clean(s[2]) });
    }
    flows.push({
      id: b.id,
      name: clean(b.title) || b.id,
      type: firstMatch(b.body, /\b(AS-IS|TO-BE)\b/i),
      actor: firstMatch(b.body, /\|\s*\*{0,2}Ator\*{0,2}\s*\|\s*([^|]+)\|/i),
      objective: truncate(firstMatch(b.body, /\|\s*\*{0,2}Objetivo\*{0,2}\s*\|\s*([^|]+)\|/i) || firstParagraph(b.body), 300),
      screens,
      stepCount: (b.body.match(/^\|\s*\d+\s*\|/gim) || []).length,
    });
  }
  return flows;
}

/** gaps.md → [{id, theme, severity, status, question}] */
export function parseGaps(md) {
  if (!md) return [];
  const blocks = splitByHeading(md, /^#{2,5}\s*`?(GAP-[A-Z0-9-]+)`?\s*[—\-–:]?\s*(.*)$/im);
  const out = blocks.map((b) => ({
    id: b.id,
    theme: clean(b.title) || b.id,
    severity: (firstMatch(b.body, /\|\s*\*{0,2}(?:Severidade|Criticidade)\*{0,2}\s*\|\s*([^|]+)\|/i) || "").trim() || null,
    status: (firstMatch(b.body, /\|\s*\*{0,2}(?:Status|Situa[çc][ãa]o)\*{0,2}\s*\|\s*([^|]+)\|/i) || "").trim() || null,
    owner: (firstMatch(b.body, /\|\s*\*{0,2}(?:Dono|Owner|Respons[áa]vel)\*{0,2}\s*\|\s*([^|]+)\|/i) || "").trim() || null,
    question: truncate(firstParagraph(b.body), 400),
  }));
  if (out.length) return out;
  // fallback: tabela | GAP-001 | tema | severidade | status |
  const rows = [];
  const rowRe = /^\|\s*`?(GAP-[A-Z0-9-]+)`?\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|/gim;
  let m;
  while ((m = rowRe.exec(md))) rows.push({ id: m[1], theme: clean(m[2]), severity: clean(m[3]), status: clean(m[4]), question: clean(m[2]) });
  return rows;
}

/** test-plan.md → [{id, epic, feature, title, expected}] (casos de negócio / UAT) */
export function parseTestPlan(md) {
  if (!md) return [];
  const out = [];
  let epic = null; let feature = null;
  for (const line of md.split(/\r?\n/)) {
    const e = /^#{2}\s+(?:[ÉE]pica:?\s*)?(.+)$/i.exec(line);
    if (e) { epic = clean(e[1]); continue; }
    // O caso é testado ANTES da funcionalidade: `### CT-001 — ...` também casa com a regra
    // de funcionalidade (`^#{3}`), e a ordem inversa descartava todo caso de nível 3.
    const c = /^#{3,5}\s*`?((?:CT|TC|CASO)-[A-Z0-9-]+)`?\s*[—\-–:]?\s*(.*)$/i.exec(line);
    if (c) { out.push({ id: c[1].toUpperCase(), epic, feature, title: clean(c[2]) }); continue; }
    const f = /^#{3}\s+(?:Funcionalidade:?\s*)?(.+)$/i.exec(line);
    if (f) { feature = clean(f[1]); continue; }
    const r = /^\|\s*`?((?:CT|TC|CASO)-[A-Z0-9-]+)`?\s*\|\s*([^|]*)\|/i.exec(line);
    if (r && !out.some((x) => x.id === r[1].toUpperCase())) out.push({ id: r[1].toUpperCase(), epic, feature, title: clean(r[2]) });
  }
  return out;
}

/**
 * Pastas de rules materializadas pela spec-tech-rules, uma por ferramenta: a do Claude Code,
 * a do Cursor e o steering do Kiro. Lidas as três que existirem, cada uma rotulada pela
 * pasta real.
 *
 * Os nomes são montados POR PARTES de propósito. Os geradores das versões Kiro e Cursor do
 * template reescrevem todo literal da pasta do Claude Code para a pasta da ferramenta de
 * destino — no código e nos rótulos. Escritos por extenso, a entrada do Claude Code virava
 * uma segunda entrada da pasta de destino (o Cursor lia a mesma pasta duas vezes) ou uma
 * pasta que não existe (o Kiro procurava `rules` onde ele grava `steering`, e as rules do
 * projeto nunca eram lidas). Por partes, a reescrita não alcança, e as três continuam três.
 */
const RULE_DIRS = [
  ["." + "claude", "rules"],
  ["." + "cursor", "rules"],
  ["." + "kiro", "steering"],
];

/** Rules do projeto: outputs/spec/tech-rules/*.mdc + as pastas de RULE_DIRS que existirem. */
export function collectProjectRules(root, outputsDir) {
  const dirs = [
    { dir: join(outputsDir, "tech-rules"), origin: "outputs/spec/tech-rules (fonte)" },
    ...RULE_DIRS.map((parts) => ({ dir: join(root, ...parts), origin: parts.join("/") })),
  ];
  const byName = new Map();
  for (const { dir, origin } of dirs) {
    if (!dirExists(dir)) continue;
    const { files } = walkFiles(dir, { maxFiles: 200, maxDepth: 3 });
    for (const f of files) {
      if (!/\.(mdc|md)$/i.test(f)) continue;
      const name = basename(f).replace(/\.(mdc|md)$/i, "");
      const raw = readText(f) || "";
      const fm = parseFrontmatter(raw);
      const prev = byName.get(name);
      const entry = {
        name,
        origins: uniq([...(prev?.origins || []), origin]),
        description: prev?.description || clean(fm.data.description || "") || firstHeading(fm.body) || null,
        alwaysApply: prev?.alwaysApply ?? (fm.data.alwaysApply === "true" || fm.data.alwaysApply === true),
        globs: prev?.globs || fm.data.globs || fm.data.paths || null,
        headings: prev?.headings?.length ? prev.headings : headings(fm.body).slice(0, 24),
        markdown: prev?.markdown || fm.body,
        path: prev?.path || relPosix(root, f),
        bytes: Math.max(prev?.bytes || 0, raw.length),
      };
      byName.set(name, entry);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeDataModel(dm, path) {
  if (!dm || typeof dm !== "object") return null;
  // Artefato JSON válido mas com forma inesperada (atributos como mapa em vez de array,
  // entidade nula na lista) não pode derrubar o relatório inteiro: asArray normaliza.
  const entities = asArray(dm.entities).filter((e) => e && typeof e === "object");
  return {
    path,
    version: dm.version || dm.metadata?.version || null,
    entityCount: entities.length,
    entities: entities.map((e) => ({
      name: e.name || e.entity || e.table || "(sem nome)",
      table: e.table || e.tableName || null,
      operation: e.operation || e.changeType || null,
      purpose: truncate(e.purpose || e.description || "", 240),
      attributeCount: asArray(e.attributes).length || asArray(e.columns).length,
      attributes: (asArray(e.attributes).length ? asArray(e.attributes) : asArray(e.columns))
        .filter((a) => a && typeof a === "object").slice(0, 60).map((a) => ({
          name: a.name || a.column || "",
          type: a.type || a.dataType || "",
          required: a.required ?? a.notNull ?? null,
          description: truncate(a.description || a.purpose || "", 160),
        })),
      relationships: asArray(e.relationships).filter((r) => r && typeof r === "object").slice(0, 30).map((r) => ({
        type: r.type || r.cardinality || "",
        target: r.target || r.to || r.entity || "",
        via: r.via || r.foreignKey || r.fk || "",
      })),
      indexes: asArray(e.indexes).length,
      modules: uniq([...asArray(e.modules), ...(e.module ? [e.module] : [])]),
    })),
    enums: asArray(dm.enumerations).length || asArray(dm.enums).length,
    openQuestions: asArray(dm.openQuestions).length,
  };
}

/**
 * api-contracts.yaml — extração por regex de superfície (paths + métodos + summary).
 * NÃO é um parser de YAML: o kit não instala dependências. Extrai o suficiente para
 * o cliente ver a superfície de API; o arquivo fonte continua sendo a verdade.
 */
export function summarizeApiContracts(yaml, path, supplement) {
  if (!yaml) return null;
  const endpoints = [];
  const lines = yaml.replace(/\r\n?/g, "\n").split("\n");
  let inPaths = false; let currentPath = null; let pathIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /^\S/.test(line) && !/^paths:/.test(line)) { inPaths = false; }
    if (!inPaths) continue;
    const p = /^(\s+)(\/[^\s:]*):\s*$/.exec(line);
    if (p) { currentPath = p[2]; pathIndent = p[1].length; continue; }
    const op = /^(\s+)(get|post|put|patch|delete|head|options):\s*$/i.exec(line);
    if (op && currentPath && op[1].length > pathIndent) {
      let summary = null; let opId = null;
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const s = /^\s+summary:\s*(.+)$/.exec(lines[j]);
        if (s) { summary = clean(s[1].replace(/^["']|["']$/g, "")); }
        const o = /^\s+operationId:\s*(.+)$/.exec(lines[j]);
        if (o) opId = clean(o[1]);
        if (/^\s+(get|post|put|patch|delete):\s*$/i.test(lines[j]) || /^(\s+)(\/[^\s:]*):\s*$/.test(lines[j])) break;
      }
      endpoints.push({ method: op[2].toUpperCase(), path: currentPath, summary, operationId: opId });
    }
  }
  const info = {
    title: firstMatch(yaml, /^\s*title:\s*(.+)$/m),
    version: firstMatch(yaml, /^\s*version:\s*(.+)$/m),
  };
  return {
    path,
    title: info.title ? clean(info.title.replace(/^["']|["']$/g, "")) : null,
    version: info.version ? clean(info.version.replace(/^["']|["']$/g, "")) : null,
    endpointCount: endpoints.length,
    endpoints,
    schemaCount: (yaml.match(/^\s{4}[A-Z][A-Za-z0-9_]*:\s*$/gm) || []).length,
    supplement: supplement && typeof supplement === "object"
      ? { keys: Object.keys(supplement).slice(0, 20) }
      : null,
  };
}

// ——— utilitários de parsing ———

export function parseFrontmatter(raw) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(raw || "");
  if (!m) return { data: {}, body: raw || "" };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: (raw || "").slice(m[0].length) };
}

function splitByHeading(md, headRe) {
  const re = new RegExp(headRe.source, "gim");
  const out = [];
  const matches = [];
  let m;
  while ((m = re.exec(md))) matches.push({ id: m[1], title: m[2] || "", start: m.index, end: m.index + m[0].length });
  for (let i = 0; i < matches.length; i++) {
    const next = matches[i + 1];
    out.push({ ...matches[i], body: md.slice(matches[i].end, next ? next.start : md.length) });
  }
  return out;
}

function firstParagraph(body) {
  for (const chunk of String(body || "").split(/\n\s*\n/)) {
    const t = chunk.trim();
    if (!t || t.startsWith("|") || t.startsWith("#") || t.startsWith("```")) continue;
    return clean(t.replace(/\n/g, " "));
  }
  // se só há tabela, devolve a primeira célula útil
  const cell = /\|\s*\*{0,2}(?:Regra|Descri[çc][ãa]o|Enunciado|Statement)\*{0,2}\s*\|\s*([^|]+)\|/i.exec(body || "");
  return cell ? clean(cell[1]) : "";
}

function firstHeading(body) {
  const m = /^#{1,3}\s+(.+)$/m.exec(body || "");
  return m ? clean(m[1]) : null;
}

function headings(body) {
  return (String(body || "").match(/^#{2,3}\s+.+$/gm) || []).map((h) => clean(h.replace(/^#+\s*/, "")));
}

function firstMatch(text, re) {
  const m = re.exec(String(text || ""));
  return m ? clean(m[1]) : null;
}

function matchAll(text, re) {
  const g = new RegExp(re.source, "g");
  const out = [];
  let m;
  while ((m = g.exec(String(text || "")))) out.push(m[1]);
  return out;
}

function clean(s) {
  return String(s || "").replace(/[*`]/g, "").replace(/\s+/g, " ").trim();
}
