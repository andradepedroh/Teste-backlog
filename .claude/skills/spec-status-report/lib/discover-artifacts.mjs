// discover-artifacts.mjs — descoberta de artefatos tolerante a VERSÕES ANTERIORES do kit.
//
// O pipeline Eng_Proc mudou de layout e de nomes ao longo das versões. Um relatório que só
// entende o layout atual mente sobre projetos antigos: diz "não há requisitos" quando o
// requirements.md está em `task-generator/outputs/` ou em `outputs/spec/requirements/`.
//
// Esta camada procura cada artefato em TODOS os layouts conhecidos, na ordem do mais novo
// para o mais antigo, e registra a PROVENIÊNCIA (qual layout, qual nome, qual data) para o
// relatório poder dizer ao consultor "isto veio do layout legado, considere rodar o sync".
//
// Nada é adivinhado: se o arquivo não existe em nenhum layout, ele simplesmente não existe.

import { join } from "node:path";
import { dirExists, fileExists, readJson, relPosix, uniq, walkFiles } from "./util.mjs";
import { statSync } from "node:fs";

/**
 * Raízes candidatas, do layout atual ao mais antigo.
 * `label` aparece no painel de proveniência do relatório.
 */
export function candidateRoots(root, outputsDir) {
  const dirs = [
    outputsDir,
    join(root, "outputs", "spec"),
    join(root, "outputs"),
    join(root, "task-generator", "outputs"),
    join(root, "docs", "spec"),
    join(root, ".spec"),
    join(root, "spec"),
  ];
  const seen = new Set();
  const out = [];
  for (const dir of dirs) {
    if (!dir || seen.has(dir) || !dirExists(dir)) continue;
    seen.add(dir);
    // A classificação vem do CAMINHO, não da ordem da lista: quando o usuário aponta
    // `--outputs task-generator/outputs`, esse diretório continua sendo layout legado —
    // rotulá-lo de "atual" só porque foi o primeiro da lista esconderia exatamente o que
    // o painel de proveniência existe para mostrar.
    out.push({ dir, ...classifyLayout(root, dir) });
  }
  return out;
}

function classifyLayout(root, dir) {
  const rel = relPosix(root, dir);
  if (/(^|\/)task-generator\/outputs$/.test(rel)) return { layout: "legado", label: "task-generator/outputs (layout descontinuado)" };
  if (/(^|\/)outputs\/spec$/.test(rel)) return { layout: "atual", label: "outputs/spec (layout atual)" };
  if (/(^|\/)outputs$/.test(rel)) return { layout: "plano", label: "outputs/ (layout plano, versões 1.x)" };
  if (/(^|\/)docs\/spec$/.test(rel)) return { layout: "alternativo", label: "docs/spec" };
  if (/(^|\/)\.spec$/.test(rel)) return { layout: "alternativo", label: ".spec" };
  if (/(^|\/)spec$/.test(rel)) return { layout: "alternativo", label: "spec/" };
  return { layout: "alternativo", label: rel || "raiz" };
}

/**
 * Nomes alternativos por artefato — inclui os usados por versões anteriores das skills.
 * A chave é o nome canônico ATUAL; os aliases são tentados na ordem.
 */
export const ARTIFACT_ALIASES = {
  "product-vision.md": ["product-vision.md", "product-vision/product-vision.md", "visao-produto.md", "vision.md", "01-product-vision.md"],
  "business-rules.md": ["business-rules.md", "business-rules/business-rules.md", "regras-negocio.md", "regras-de-negocio.md", "business_rules.md"],
  "requirements.md": ["requirements.md", "requirements/requirements.md", "requisitos.md", "srs.md", "functional-requirements.md"],
  "product-requirements.md": ["product-requirements.md", "product-requirements/product-requirements.md", "prd.md", "ux-requirements.md"],
  "modules.md": ["modules.md", "modules/modules.md", "modulos.md", "catalogo-modular.md"],
  "flow-map.md": ["flow-map.md", "flow-map/flow-map.md", "flows.md", "mapa-fluxos.md"],
  "discovery-document.md": ["discovery-document.md", "discovery/discovery-document.md", "discovery.md", "descoberta.md"],
  "context-map.md": ["context-map.md", "context-map/context-map.md", "contexto.md", "mapa-contexto.md"],
  "benchmark.md": ["benchmark.md", "benchmark/benchmark.md", "mercado.md"],
  "legacy.md": ["legacy.md", "legacy/legacy.md", "legado.md", "as-is.md"],
  "architecture.md": ["architecture.md", "legacy/architecture.md", "arquitetura.md", "architecture-as-is.md"],
  "legacy-analysis.md": ["legacy-analysis.md", "legacy/legacy-analysis.md", "analise-legado.md"],
  "threat-model.md": ["threat-model.md", "legacy/threat-model.md", "modelo-ameacas.md", "stride.md"],
  "gaps.md": ["gaps.md", "gaps/gaps.md", "lacunas.md", "gaps-document.md"],
  "gaps-document.md": ["gaps-document.md", "gaps/gaps-document.md"],
  "sync-log.md": ["sync-log.md", "sync-log/sync-log.md", "log-sincronizacao.md", "synclog.md"],
  "test-plan.md": ["test-plan.md", "test-plan/test-plan.md", "plano-testes.md", "plano-de-testes.md", "uat.md"],
  "security-review.md": ["security-review.md", "security/security-review.md", "revisao-seguranca.md"],
  "code-audit.md": ["code-audit.md", "audit/code-audit.md", "auditoria-codigo.md"],
  "estimate-report.md": ["estimate-report.md", "estimate/estimate-report.md", "estimativa.md"],
  "data-model.json": ["data-model.json", "data-model/data-model.json", "modelo-dados.json", "datamodel.json"],
  "api-contracts.yaml": ["api-contracts.yaml", "api-contracts.yml", "api-contracts/api-contracts.yaml", "openapi.yaml", "openapi.yml", "swagger.yaml"],
  "api-contracts-supplement.json": ["api-contracts-supplement.json", "api-contracts/api-contracts-supplement.json"],
  "tasks.json": ["tasks.json", "tasks/tasks.json", "backlog.json", "work-items.json"],
  "id-map.json": ["id-map.json", "tasks/id-map.json", "idmap.json", "azure-id-map.json"],
  "screens-manifest.json": ["screens-manifest.json", "screens/screens-manifest.json"],
  "prototype.md": ["prototype.md", "prototype/prototype.md", "prototipo.md"],
  "capa.md": ["capa.md", "report/capa.md", "cover.md"],

  // ── Artefatos de EXTENSÃO do relatório (todos opcionais) ──
  // Não são produzidos por toda versão do kit; projetos antigos simplesmente não os
  // têm, e o relatório se adapta. Entram aqui para herdar a busca multi-layout e a
  // declaração de proveniência — um `business-operations.json` num projeto de layout
  // plano é lido do mesmo jeito, e o painel de proveniência diz de onde veio.
  "business-operations.json": ["business-operations.json", "operations.json", "eap.json", "operacoes.json"],
  "business-flows.json": ["business-flows.json", "flows.json", "fluxos.json"],
  "api-catalog.json": ["api-catalog.json", "api/api-catalog.json", "catalogo-api.json"],
  "test-findings.json": ["test-findings.json", "status/test-findings.json", "achados-testes.json"],
  "anexos-index.json": ["anexos-index.json", "annexes-index.json", "indice-anexos.json"],
  "glossary.json": ["glossary.json", "glossario.json", "status/glossary.json"],
};

/**
 * Procura um artefato em todos os layouts e devolve
 * { path, layout, label, alias, canonical, mtimeMs } ou null.
 */
export function findArtifactAny(root, outputsDir, canonical) {
  const aliases = ARTIFACT_ALIASES[canonical] || [canonical];
  for (const cand of candidateRoots(root, outputsDir)) {
    for (const alias of aliases) {
      const p = join(cand.dir, alias);
      if (fileExists(p)) {
        let mtimeMs = null;
        try { mtimeMs = statSync(p).mtimeMs; } catch { /* ignora */ }
        return {
          path: p, canonical, alias, layout: cand.layout, label: cand.label,
          rel: relPosix(root, p), mtimeMs,
          renamed: alias !== canonical,
        };
      }
    }
  }
  return null;
}

/** Todos os artefatos conhecidos, com proveniência. */
export function discoverArtifacts(root, outputsDir) {
  const found = {};
  const provenance = [];
  for (const canonical of Object.keys(ARTIFACT_ALIASES)) {
    const hit = findArtifactAny(root, outputsDir, canonical);
    if (!hit) continue;
    found[canonical] = hit;
    provenance.push(hit);
  }

  // Extras que não têm alias fixo mas importam para o relatório
  const extras = [];
  for (const cand of candidateRoots(root, outputsDir)) {
    // artefatos de alteração de escopo e complementares (nomes variáveis)
    const { files } = walkFiles(cand.dir, { maxFiles: 3000, maxDepth: 3 });
    for (const f of files) {
      const name = f.replace(/\\/g, "/").split("/").pop();
      if (/^tasks-complementary.*\.json$/i.test(name) || /^scope-change-.*\.md$/i.test(name)
        || /^tasks[-_].*\.json$/i.test(name) || /^legacy[-_].*\.md$/i.test(name)) {
        extras.push({ rel: relPosix(root, f), layout: cand.layout, label: cand.label, canonical: null, alias: name });
      }
    }
  }

  const layouts = uniq(provenance.map((p) => p.layout));
  const legacyLayouts = layouts.filter((l) => l !== "atual");
  const renamed = provenance.filter((p) => p.renamed);

  return {
    found,
    provenance: provenance.sort((a, b) => a.canonical.localeCompare(b.canonical)),
    extras: extras.slice(0, 60),
    layouts,
    usesLegacyLayout: legacyLayouts.length > 0,
    legacyLayouts,
    renamedCount: renamed.length,
    roots: candidateRoots(root, outputsDir).map((c) => ({ rel: relPosix(root, c.dir), layout: c.layout, label: c.label })),
  };
}

// ─────────────────── tasks.json: adaptador multi-versão ───────────────────

/**
 * Normaliza `tasks.json` de QUALQUER versão do spec-tasks para uma forma única.
 *
 * Formatos vistos em campo:
 *   v1/v2  { tasks: [ {id, title, ...} ] }                            — lista plana
 *   v3     { features: [ { stories: [ { tasks: [] } ] } ] }           — feature no topo
 *   v4     { epics: [], stories: [ { tasks: [] } ] }                  — epic/story/task
 *   v5+    idem v4 + metadata.backlogHierarchy + campos de negócio ricos
 *
 * Também aceita `businessRules` como string, array de strings ou array de objetos.
 */
export function normalizeTasksJson(data) {
  if (!data || typeof data !== "object") return null;
  const notes = [];
  const asArr = (v) => (Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []));

  let epics = asArr(data.epics).filter((e) => e && typeof e === "object");
  let stories = asArr(data.stories).filter((s) => s && typeof s === "object");
  let features = asArr(data.features).filter((f) => f && typeof f === "object");

  // v3: stories aninhadas dentro de features
  if (!stories.length && features.length) {
    notes.push("formato com stories aninhadas em features (spec-tasks v3) — achatado para epic/story/task");
    for (const f of features) {
      for (const s of asArr(f.stories)) {
        if (s && typeof s === "object") stories.push({ ...s, epicId: s.epicId || f.id });
      }
    }
    if (!epics.length) epics = features.map((f) => ({ id: f.id, title: f.title || f.name, containedStoryIds: asArr(f.stories).map((s) => s && s.id).filter(Boolean) }));
  }

  // v1/v2: lista plana de tasks, sem story
  let flatTasks = asArr(data.tasks).filter((t) => t && typeof t === "object");
  if (!stories.length && flatTasks.length) {
    notes.push("formato de lista plana de tasks (spec-tasks v1/v2) — agrupado numa story sintética por módulo");
    const byModule = new Map();
    for (const t of flatTasks) {
      const key = t.module || t.moduleId || t.epic || "GERAL";
      const arr = byModule.get(key) || [];
      arr.push(t);
      byModule.set(key, arr);
    }
    stories = [...byModule.entries()].map(([key, tasks]) => ({
      id: `STORY-${String(key).replace(/[^A-Za-z0-9-]/g, "").toUpperCase() || "GERAL"}`,
      title: `Itens de ${key}`,
      synthetic: true,
      tasks,
    }));
  }

  const idsOf = (v) => {
    const out = [];
    for (const item of asArr(v)) {
      if (typeof item === "string") {
        const m = item.match(/\b(?:RN|RF|RNF|PR)(?:-NOVO)?-[A-Z0-9-]+\b/);
        out.push(m ? m[0] : item);
      } else if (item && typeof item === "object") {
        out.push(item.id || item.code || item.ruleId || item.requirementId || null);
      }
    }
    return out.filter(Boolean);
  };

  const tasks = [];
  for (const s of stories) {
    for (const t of asArr(s.tasks).filter((t) => t && typeof t === "object")) {
      tasks.push({
        id: t.id || t.taskId || null,
        title: t.title || t.name || t.summary || "",
        storyId: s.id,
        epicId: s.epicId || s.epic || null,
        type: t.type || t.category || null,
        estimate: t.estimate ?? t.storyPoints ?? t.effort ?? null,
        businessRules: uniq([...idsOf(t.businessRules), ...idsOf(s.businessRules), ...idsOf(t.rules)]),
        requirements: uniq([...idsOf(t.requirements), ...idsOf(s.requirements), ...idsOf(t.relatedRequirements)]),
      });
    }
  }

  return {
    schemaVersion: data.metadata?.schemaVersion || data.schemaVersion || data.version || inferSchemaVersion(data),
    metadata: data.metadata || null,
    hierarchy: data.metadata?.backlogHierarchy?.chosen || null,
    changeMode: Boolean(data.metadata?.changeMode),
    epicCount: epics.length,
    storyCount: stories.length,
    taskCount: tasks.length,
    // `modules`: o módulo que o próprio tasks.json dá para a épica. É a pista que liga um
    // bug ao módulo quando a épica dele no tracker só tem a tag `epic-json:EPIC-XXX`.
    // Só código `MOD-…` declarado em campo entra — «TODOS» e texto livre não são módulo.
    epics: epics.map((e) => ({ id: e.id, title: e.title || e.name || "", storyIds: asArr(e.containedStoryIds), modules: epicModules(e, asArr) })),
    stories: stories.map((s) => ({
      id: s.id, title: s.title || s.name || "", epicId: s.epicId || s.epic || null,
      synthetic: Boolean(s.synthetic),
      taskIds: asArr(s.tasks).map((t) => t && (t.id || t.taskId)).filter(Boolean),
      estimate: s.estimate ?? s.storyPoints ?? null,
    })),
    tasks: tasks.filter((t) => t.id),
    compatibilityNotes: notes,
  };
}

function epicModules(e, asArr) {
  const raw = [
    e.module, e.moduleId, e.modulo,
    ...asArr(e.modules), ...asArr(e.modulesAffected), ...asArr(e.modulos),
  ];
  return uniq(raw.map((m) => String((m && typeof m === "object" ? m.id || m.code : m) || "").trim().toUpperCase())
    .filter((m) => /^MOD-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(m)));
}

function inferSchemaVersion(data) {
  if (data.epics && data.stories) return "v4/v5 (epic/story/task)";
  if (data.features) return "v3 (feature/story/task)";
  if (Array.isArray(data.tasks)) return "v1/v2 (lista plana)";
  return "desconhecido";
}

/**
 * Vocabulário de IDs COMPLETO, incluindo os prefixos de versões anteriores.
 * Fonte: tools/references/task-pipeline.md §2 (F, INF, NCR, PD, MOD, BC, RF-MOD-XXX-NN,
 * RNF, RN / RN-NOVO, GAP, CHG, SEC, THR) + os do backlog (EPIC/FEAT/STORY/TASK) e do
 * flow-map (FLX/TEL) e do plano de testes (CT/TC).
 */
export const ID_PREFIXES = [
  "RNF", "RN-NOVO", "RN", "RF", "PR", "PD", "MOD", "BC", "GAP", "CHG", "SEC", "THR",
  "INF", "NCR", "EPIC", "FEAT", "STORY", "TASK", "FLX", "TEL", "CT", "TC", "EVID", "ADR", "F",
];

/** Regex única para varrer código e documentos atrás de qualquer ID do vocabulário. */
export function buildIdRegex() {
  // ordem decrescente de tamanho evita que "RN" case antes de "RNF"
  const alt = [...ID_PREFIXES].sort((a, b) => b.length - a.length).join("|");
  return new RegExp(`\\b(?:${alt})-[A-Z0-9]+(?:-[A-Z0-9]+)*\\b`, "g");
}

/** Família do ID (RN, RF, RNF, PR…) — normaliza RN-NOVO-012 → RN e RF-MOD-001-03 → RF. */
export function idFamily(id) {
  const s = String(id || "").toUpperCase();
  for (const p of [...ID_PREFIXES].sort((a, b) => b.length - a.length)) {
    if (s.startsWith(`${p}-`)) return p.replace("-NOVO", "");
  }
  return s.split("-")[0] || "OUTRO";
}

/**
 * id-map.json em qualquer forma: { "TASK-1": 123 } ou { items: [...] } ou
 * { "TASK-1": { id: 123 } }.
 */
export function normalizeIdMap(raw) {
  if (!raw || typeof raw !== "object") return {};
  const src = Array.isArray(raw) ? Object.fromEntries(raw.map((x) => [x.logicalId || x.id, x.workItemId || x.adoId])) : (raw.items || raw.map || raw);
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    if (v === null || v === undefined) continue;
    const n = typeof v === "object" ? Number(v.id ?? v.workItemId ?? v.adoId) : Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export { readJson };
