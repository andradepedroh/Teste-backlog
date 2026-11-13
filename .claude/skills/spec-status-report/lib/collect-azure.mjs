// collect-azure.mjs — inventário de work items do Azure DevOps.
//
// Duas rotas, nesta ordem (decisão de projeto: REST com fallback MCP):
//
//   1. REST (preferida, determinística, roda headless/CI): PAT + org + project do .env
//      → WIQL para descobrir IDs → /wit/workitemsbatch para os campos → hierarquia.
//   2. SNAPSHOT (fallback MCP): se não há credencial (ou a chamada falha), o CLI devolve
//      `mode: "unavailable"` com um `requestSpec` — o AGENTE então busca os work items
//      pelo MCP do Azure DevOps, grava outputs/spec/status/azure-snapshot.json no formato
//      documentado em templates/azure-snapshot.example.json e re-roda com --azure-snapshot.
//      O CLI aceita o snapshot como fonte igual à REST; o relatório marca a origem.
//
// Escopo da consulta, em ordem de precedência:
//   a. --azure-wiql <arquivo>            consulta WIQL própria
//   b. id-map.json (spec-tasks-azure)    exatamente os itens publicados por este projeto
//   c. tags logical-id                   itens marcados pelo pipeline
//   d. área/iteração/projeto             varredura ampla com filtro

import { join } from "node:path";
import { asArray, readJson, readText, relPosix, truncate, uniq } from "./util.mjs";

// Severidade, prioridade, tags, pai e as três datas entram por causa da leitura de bugs por
// módulo (lib/bug-modules.mjs): a tag e o pai decidem o módulo, as datas dão a idade e a
// evolução semanal, a severidade abre os abertos por gravidade.
const DEFAULT_FIELDS = [
  "System.Id", "System.Title", "System.WorkItemType", "System.State", "System.Reason",
  "System.AssignedTo", "System.AreaPath", "System.IterationPath", "System.Tags",
  "System.CreatedDate", "System.ChangedDate", "System.Parent",
  "Microsoft.VSTS.Common.ClosedDate", "Microsoft.VSTS.Common.ResolvedDate",
  "Microsoft.VSTS.Common.Priority", "Microsoft.VSTS.Common.Severity",
  "Microsoft.VSTS.Scheduling.StoryPoints", "Microsoft.VSTS.Scheduling.Effort",
  "Microsoft.VSTS.Scheduling.RemainingWork", "Microsoft.VSTS.Scheduling.CompletedWork",
];

/**
 * Campos que nem todo processo tem. Num processo customizado sem eles, o ADO recusa o lote
 * inteiro (`TF51535: Cannot find field …`) e o backlog todo caía no fallback. Nesse caso o
 * lote é refeito sem estes campos, e a ausência vira aviso — a severidade some da leitura de
 * bugs (BUG_SEVERITY_ABSENT diz isso no relatório), o resto do backlog fica.
 */
const OPTIONAL_FIELDS = ["Microsoft.VSTS.Common.Severity", "Microsoft.VSTS.Common.ResolvedDate"];
const FIELD_NOT_FOUND = /TF51535|cannot find field/i;

/** Tipos de item tratados como bug quando `--bug-types` não é informado. */
export const DEFAULT_BUG_TYPES = ["Bug"];

/** Categorias de estado — normalizadas para o semáforo do relatório. */
export function stateCategory(state, type) {
  const s = String(state || "").toLowerCase();
  if (["closed", "done", "resolved", "completed", "fechado", "concluído", "concluido", "resolvido"].includes(s)) return "done";
  if (["removed", "cut", "removido", "cancelado", "canceled", "cancelled"].includes(s)) return "removed";
  if (["active", "committed", "in progress", "em andamento", "doing", "development", "desenvolvimento", "code review", "testing", "em teste"].includes(s)) return "inProgress";
  if (["new", "proposed", "to do", "todo", "open", "novo", "aberto", "backlog", "approved"].includes(s)) return "todo";
  return type ? "other" : "other";
}

export async function collectAzure(root, outputsDir, opts = {}) {
  const {
    disabled = false, snapshotPath = null, areaPath = null, iterationPath = null,
    wiqlFile = null, project: projectOverride = null, timeoutMs = 120_000, maxItems = 2000,
    writeDir = null, bugTypes = DEFAULT_BUG_TYPES,
  } = opts;

  if (disabled) {
    return { mode: "disabled", available: false, items: [], warnings: [{ code: "AZURE_DISABLED", message: "Coleta do Azure DevOps desativada por --no-azure." }] };
  }

  // 1. Snapshot explícito ou descoberto.
  // Snapshot pedido explicitamente e ausente é erro do operador, não motivo para cair
  // silenciosamente na REST — o relatório sairia de outra fonte que a pedida.
  if (snapshotPath && readJson(snapshotPath) === null) {
    return {
      mode: "unavailable", available: false, items: [],
      warnings: [{ code: "AZURE_SNAPSHOT_INVALID", message: `--azure-snapshot aponta para um arquivo inexistente: ${relPosix(root, snapshotPath)}` }],
      requestSpec: requestSpec(root, outputsDir, opts),
    };
  }
  const snapCandidates = uniq([
    snapshotPath,
    ...(writeDir ? [join(writeDir, "status", "azure-snapshot.json"), join(writeDir, "azure-snapshot.json")] : []),
    join(outputsDir, "status", "azure-snapshot.json"),
    join(outputsDir, "azure-snapshot.json"),
  ].filter(Boolean));
  for (const p of snapCandidates) {
    const snap = readJson(p);
    if (snap === null) continue;
    if (snap === undefined) {
      return { mode: "unavailable", available: false, items: [], warnings: [{ code: "AZURE_SNAPSHOT_INVALID", message: `azure-snapshot.json ilegível em ${relPosix(root, p)}` }], requestSpec: requestSpec(root, outputsDir, opts) };
    }
    const normalized = normalizeSnapshot(snap);
    if (snapshotPath || normalized.items.length) {
      return {
        mode: "snapshot",
        available: true,
        source: relPosix(root, p),
        collectedAt: snap.collectedAt || null,
        organization: snap.organization || null,
        project: snap.project || null,
        // A rota MCP também pode trazer as iterações; sem elas, a leitura por sprint
        // simplesmente não é montada — igual à rota REST.
        iterations: normalizeIterations(snap.iterations || snap.iteracoes),
        ...normalized,
        // Pais fora do escopo da consulta (até a Epic), trazidos só para decidir o módulo
        // dos bugs. Ficam fora de `items` para não entrar no progresso do backlog.
        ancestors: normalizeAncestors(snap.ancestors || snap.parents || snap.ancestrais, normalized.items),
        warnings: normalized.warnings,
      };
    }
  }

  // 2. REST
  const pat = process.env.AZURE_DEVOPS_PAT;
  const org = process.env.AZURE_DEVOPS_ORG;
  const project = projectOverride || process.env.AZURE_DEVOPS_PROJECT;
  if (!pat || !org || !project) {
    const missing = [!pat && "AZURE_DEVOPS_PAT", !org && "AZURE_DEVOPS_ORG", !project && "AZURE_DEVOPS_PROJECT"].filter(Boolean);
    return {
      mode: "unavailable",
      available: false,
      items: [],
      warnings: [{
        code: "AZURE_CREDENTIALS_ABSENT",
        message: `Credenciais ausentes (${missing.join(", ")}). Rota REST indisponível — use o fallback MCP: busque os work items pelo MCP do Azure DevOps e grave outputs/spec/status/azure-snapshot.json (ver templates/azure-snapshot.example.json), depois re-rode com --azure-snapshot.`,
      }],
      requestSpec: requestSpec(root, outputsDir, opts),
    };
  }

  const apiVersion = process.env.AZURE_DEVOPS_API_VERSION || "7.1";
  const base = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis`;
  const auth = `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
  const warnings = [];

  try {
    const idMap = readJson(join(outputsDir, "id-map.json"));
    const explicitIds = idMap && typeof idMap === "object" && idMap !== undefined
      ? uniq(Object.values(idMap).map(Number).filter((n) => Number.isFinite(n) && n > 0))
      : [];

    let ids = [];
    let scope = null;

    const customWiql = wiqlFile ? readText(wiqlFile) : null;
    if (customWiql) {
      ids = await wiql(base, auth, apiVersion, customWiql, timeoutMs);
      scope = `WIQL de ${relPosix(root, wiqlFile)}`;
    } else if (explicitIds.length) {
      ids = explicitIds;
      scope = `id-map.json (${explicitIds.length} itens publicados pelo pipeline)`;
    } else {
      const clauses = [`[System.TeamProject] = @project`];
      if (areaPath || process.env.AZURE_DEVOPS_AREA_PATH) clauses.push(`[System.AreaPath] UNDER '${sanitize(areaPath || process.env.AZURE_DEVOPS_AREA_PATH)}'`);
      if (iterationPath || process.env.AZURE_DEVOPS_ITERATION_PATH) clauses.push(`[System.IterationPath] UNDER '${sanitize(iterationPath || process.env.AZURE_DEVOPS_ITERATION_PATH)}'`);
      const q = `SELECT [System.Id] FROM WorkItems WHERE ${clauses.join(" AND ")} ORDER BY [System.Id] ASC`;
      ids = await wiql(base, auth, apiVersion, q, timeoutMs);
      scope = `projeto ${project}${areaPath ? ` · área ${areaPath}` : ""}${iterationPath ? ` · iteração ${iterationPath}` : ""}`;
    }

    if (ids.length > maxItems) {
      warnings.push({ code: "AZURE_TRUNCATED", message: `${ids.length} itens de trabalho encontrados; relatório limitado aos primeiros ${maxItems} (ajuste com --azure-max).` });
      ids = ids.slice(0, maxItems);
    }

    // Estado compartilhado pelos lotes desta coleta: um campo recusado no primeiro lote
    // não é pedido de novo nos seguintes, nem na busca dos pais.
    const batch = { fields: DEFAULT_FIELDS, warnings };
    const raw = await fetchBatch(base, auth, apiVersion, ids, timeoutMs, batch);
    const normalized = normalizeItems(raw);

    // Pais dos bugs que ficaram fora do escopo da consulta, subindo até a Epic: o módulo de
    // um bug quase sempre está na história ou na épica dele, não no próprio card. Falhar
    // aqui não derruba o backlog — só tira essa pista da atribuição, e o aviso diz isso.
    let ancestors = [];
    try {
      ancestors = await fetchAncestors(base, auth, apiVersion, normalized.items, bugTypes, timeoutMs, { batch });
    } catch (e) {
      warnings.push({ code: "AZURE_ANCESTORS_UNAVAILABLE", message: `Não foi possível ler os itens-pai dos bugs fora do escopo (${e && e.message}) — o módulo desses bugs só sai das pistas do próprio card.` });
    }

    // Iterações COM DATA — é o que separa um sprint de uma pasta de escopo.
    // Sem elas não há período, sem período não há velocidade e sem velocidade não há
    // projeção: o relatório simplesmente não monta essas seções. Falhar aqui não é
    // motivo para perder o backlog inteiro, então o erro vira aviso.
    let iterations = [];
    try {
      iterations = await fetchIterations(base, auth, apiVersion, timeoutMs);
    } catch (e) {
      warnings.push({ code: "AZURE_ITERATIONS_UNAVAILABLE", message: `Não foi possível ler as iterações do projeto (${e && e.message}) — a leitura por sprint não será montada.` });
    }
    const dated = iterations.filter((it) => it.startDate && it.finishDate);
    if (iterations.length && !dated.length) {
      warnings.push({
        code: "AZURE_ITERATIONS_UNDATED",
        message: `As ${iterations.length} iteração(ões) declaradas no projeto não têm data de início e fim — são caminhos de escopo, não sprints. A leitura por sprint, a velocidade e a projeção não foram montadas.`,
      });
    }

    return {
      mode: "rest",
      available: true,
      organization: org,
      project,
      scope,
      collectedAt: new Date().toISOString(),
      url: `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}`,
      iterations,
      ...normalized,
      ancestors,
      warnings: warnings.concat(normalized.warnings),
    };
  } catch (e) {
    return {
      mode: "unavailable",
      available: false,
      items: [],
      warnings: [{ code: "AZURE_REQUEST_FAILED", message: `Falha ao consultar o Azure DevOps: ${truncate(String(e && e.message), 400)}. Fallback: colete via MCP e grave azure-snapshot.json.` }],
      requestSpec: requestSpec(root, outputsDir, opts),
    };
  }
}

async function wiql(base, auth, apiVersion, query, timeoutMs) {
  const res = await request(`${base}/wit/wiql?api-version=${apiVersion}`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }, timeoutMs);
  const ids = (res.workItems || []).map((w) => w.id);
  const relIds = (res.workItemRelations || []).flatMap((r) => [r.target?.id, r.source?.id]).filter(Boolean);
  return uniq([...ids, ...relIds]);
}

/**
 * Iterações vindas de um snapshot MCP. Aceita a resposta crua da API (com
 * `attributes`) ou a forma simplificada; datas ausentes permanecem nulas — nunca
 * são preenchidas por dedução.
 */
export function normalizeIterations(raw) {
  return asArray(raw).map((it) => {
    if (!it || typeof it !== "object") return null;
    const a = it.attributes || {};
    const name = it.name || it.nome || null;
    return {
      name,
      path: it.path || it.caminho || name || null,
      startDate: it.startDate || it.inicio || a.startDate || null,
      finishDate: it.finishDate || it.fim || a.finishDate || null,
    };
  }).filter((it) => it && it.path);
}

/**
 * Árvore de iterações do projeto, com as datas quando existirem.
 *
 * Usa `classificationnodes` em vez de `teamsettings/iterations` de propósito: o segundo
 * exige saber o time, e um projeto tem vários; o primeiro devolve a árvore inteira do
 * projeto sem essa dependência. As datas vivem em `attributes.startDate/finishDate` e
 * **só existem quando alguém as configurou** — é exatamente essa a distinção que o
 * relatório precisa fazer entre um sprint e uma pasta de organização de escopo.
 */
export async function fetchIterations(base, auth, apiVersion, timeoutMs) {
  const res = await request(`${base}/wit/classificationnodes/iterations?$depth=6&api-version=${apiVersion}`, {
    method: "GET",
    headers: { Authorization: auth },
  }, timeoutMs);

  const out = [];
  const walk = (node, trail) => {
    if (!node || typeof node !== "object") return;
    const path = [...trail, node.name].filter(Boolean);
    const a = node.attributes || {};
    // O nó raiz é o próprio projeto: entra na trilha, não na lista.
    if (trail.length) {
      out.push({
        name: node.name,
        path: path.join("\\"),
        startDate: a.startDate || null,
        finishDate: a.finishDate || null,
      });
    }
    for (const child of node.children || []) walk(child, path);
  };
  walk(res, []);
  return out.sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")) || a.path.localeCompare(b.path, "pt-BR"));
}

async function fetchBatch(base, auth, apiVersion, ids, timeoutMs, batch = { fields: DEFAULT_FIELDS, warnings: null }) {
  const out = [];
  const post = (chunk) => request(`${base}/wit/workitemsbatch?api-version=${apiVersion}`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ ids: chunk, fields: batch.fields }),
  }, timeoutMs);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    if (!chunk.length) continue;
    let res;
    try {
      res = await post(chunk);
    } catch (e) {
      const optional = batch.fields.filter((f) => OPTIONAL_FIELDS.includes(f));
      if (!optional.length || !FIELD_NOT_FOUND.test(String(e && e.message))) throw e;
      batch.fields = batch.fields.filter((f) => !OPTIONAL_FIELDS.includes(f));
      if (batch.warnings) {
        batch.warnings.push({ code: "AZURE_OPTIONAL_FIELDS_ABSENT", message: `O processo do projeto recusou um campo opcional (${truncate(String(e && e.message), 200)}). Os itens foram lidos de novo sem ${optional.join(", ")} — severidade e data de resolução ficam fora desta geração.` });
      }
      res = await post(chunk);
    }
    out.push(...(res.value || []));
  }
  return out;
}

/**
 * Pais dos bugs que não vieram na consulta, nível a nível até a Epic.
 *
 * Sobe só a partir dos BUGS (os tipos de `--bug-types`): é para eles que a cadeia importa,
 * e subir a partir de todo item multiplicaria as chamadas por nada. Para na Epic, no item
 * sem pai e num limite de profundidade — um ciclo de vínculos no tracker (épica filha de um
 * bug existe em campo) não pode virar laço infinito.
 */
export async function fetchAncestors(base, auth, apiVersion, items, bugTypes, timeoutMs, { maxDepth = 8, batch } = {}) {
  const types = new Set((bugTypes || DEFAULT_BUG_TYPES).map((t) => String(t).trim().toLowerCase()));
  const known = new Map(items.map((i) => [String(i.id), i]));
  const out = [];
  let frontier = items.filter((i) => types.has(String(i.type || "").toLowerCase()));
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next = [];
    const missing = [];
    for (const i of frontier) {
      if (!i.parentId || /^epic$/i.test(i.type || "")) continue;
      const p = known.get(String(i.parentId));
      if (p) next.push(p);
      else missing.push(i.parentId);
    }
    const ids = uniq(missing.map(Number).filter((n) => Number.isFinite(n) && n > 0));
    if (ids.length) {
      const raw = await fetchBatch(base, auth, apiVersion, ids, timeoutMs, batch);
      for (const a of normalizeItems(raw).items) {
        const rec = { ...a, outOfScope: true };
        known.set(String(rec.id), rec);
        out.push(rec);
        next.push(rec);
      }
    }
    frontier = uniq(next);
  }
  return out;
}

/** Pais declarados num snapshot MCP: mesma normalização dos itens, sem duplicar os do escopo. */
function normalizeAncestors(raw, items) {
  const list = asArray(raw).filter((i) => i && typeof i === "object");
  if (!list.length) return [];
  const inScope = new Set((items || []).map((i) => String(i.id)));
  const norm = list.some((i) => i.fields) ? normalizeItems(list).items : normalizeSnapshot({ items: list }).items;
  return norm.filter((i) => !inScope.has(String(i.id))).map((i) => ({ ...i, outOfScope: true }));
}

async function request(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 203
        ? " (PAT inválido/expirado ou sem escopo Work Items:Read)"
        : res.status === 404 ? " (organização/projeto não encontrado)" : "";
      throw new Error(`HTTP ${res.status}${hint} em ${url.split("?")[0]}: ${truncate(text, 300)}`);
    }
    try { return JSON.parse(text); } catch { throw new Error(`resposta não-JSON de ${url.split("?")[0]}`); }
  } finally {
    clearTimeout(timer);
  }
}

/** Normaliza a resposta REST do ADO. */
export function normalizeItems(rawItems) {
  const warnings = [];
  const items = asArray(rawItems).filter((w) => w && typeof w === "object").map((w) => {
    const f = w.fields || {};
    const state = f["System.State"] || null;
    const type = f["System.WorkItemType"] || null;
    return {
      id: w.id ?? f["System.Id"] ?? null,
      title: f["System.Title"] || "(sem título)",
      type,
      state,
      category: stateCategory(state, type),
      reason: f["System.Reason"] || null,
      assignedTo: f["System.AssignedTo"]?.displayName || f["System.AssignedTo"] || null,
      areaPath: f["System.AreaPath"] || null,
      iterationPath: f["System.IterationPath"] || null,
      tags: (f["System.Tags"] || "").split(";").map((t) => t.trim()).filter(Boolean),
      createdDate: f["System.CreatedDate"] || null,
      changedDate: f["System.ChangedDate"] || null,
      closedDate: f["Microsoft.VSTS.Common.ClosedDate"] || null,
      resolvedDate: f["Microsoft.VSTS.Common.ResolvedDate"] || null,
      priority: f["Microsoft.VSTS.Common.Priority"] ?? null,
      severity: f["Microsoft.VSTS.Common.Severity"] || null,
      storyPoints: f["Microsoft.VSTS.Scheduling.StoryPoints"] ?? f["Microsoft.VSTS.Scheduling.Effort"] ?? null,
      remainingWork: f["Microsoft.VSTS.Scheduling.RemainingWork"] ?? null,
      completedWork: f["Microsoft.VSTS.Scheduling.CompletedWork"] ?? null,
      parentId: f["System.Parent"] ?? null,
      url: w._links?.html?.href || (w.url ? w.url.replace("/_apis/wit/workItems/", "/_workitems/edit/") : null),
      logicalId: (f["System.Tags"] || "").match(/logical-id:([A-Z0-9-]+)/i)?.[1]
        || (f["System.Title"] || "").match(/^((?:TASK|STORY|EPIC|FEAT|SEC)-[A-Z0-9-]+):/i)?.[1] || null,
    };
  }).filter((i) => i.id !== null);

  if (!items.length) warnings.push({ code: "AZURE_EMPTY", message: "A consulta não devolveu itens de trabalho no escopo pedido." });
  return { items, ...aggregate(items), warnings };
}

function normalizeSnapshot(snap) {
  // `items` como mapa por ID é exatamente o que um agente escreve a partir do MCP;
  // asArray normaliza para que o aviso AZURE_SNAPSHOT_* seja alcançável em vez de crash.
  const list = asArray(Array.isArray(snap) ? snap : (snap.items || snap.workItems || snap.value))
    .filter((i) => i && typeof i === "object");
  // Aceita tanto o formato REST cru (fields{}) quanto o formato simplificado do template.
  const looksRest = list.some((i) => i && i.fields);
  if (looksRest) return normalizeItems(list);
  const items = list.map((i) => ({
    id: i.id ?? null,
    title: i.title || "(sem título)",
    type: i.type || i.workItemType || null,
    state: i.state || null,
    category: stateCategory(i.state, i.type),
    reason: i.reason || null,
    assignedTo: i.assignedTo || null,
    areaPath: i.areaPath || null,
    iterationPath: i.iterationPath || i.iteration || null,
    tags: Array.isArray(i.tags) ? i.tags : String(i.tags || "").split(";").map((t) => t.trim()).filter(Boolean),
    createdDate: i.createdDate || null,
    changedDate: i.changedDate || null,
    closedDate: i.closedDate || null,
    resolvedDate: i.resolvedDate || null,
    priority: i.priority ?? null,
    severity: i.severity || null,
    storyPoints: i.storyPoints ?? i.effort ?? null,
    remainingWork: i.remainingWork ?? null,
    completedWork: i.completedWork ?? null,
    parentId: i.parentId ?? i.parent ?? null,
    url: i.url || null,
    logicalId: i.logicalId || null,
  })).filter((i) => i.id !== null);
  const warnings = items.length ? [] : [{ code: "AZURE_SNAPSHOT_EMPTY", message: "Snapshot da ferramenta de gestão encontrado, mas sem itens de trabalho." }];
  return { items, ...aggregate(items), warnings };
}

/** Agregações que o relatório exibe: por tipo, estado, sprint, responsável + hierarquia. */
export function aggregate(items) {
  const byType = groupCount(items, (i) => i.type || "(sem tipo)");
  const byState = groupCount(items, (i) => i.state || "(sem estado)");
  const byCategory = groupCount(items, (i) => i.category);
  const byIteration = groupCount(items, (i) => i.iterationPath || "(sem iteração)");
  const byAssignee = groupCount(items, (i) => i.assignedTo || "(não atribuído)");

  const byId = new Map(items.map((i) => [i.id, i]));
  const roots = [];
  const childrenOf = new Map();
  for (const i of items) {
    if (i.parentId && byId.has(i.parentId)) {
      const arr = childrenOf.get(i.parentId) || [];
      arr.push(i.id);
      childrenOf.set(i.parentId, arr);
    } else {
      roots.push(i.id);
    }
  }

  // Progresso e pontos são calculados só sobre as FOLHAS do escopo consultado.
  // Somar pai e filho conta o mesmo trabalho duas vezes: uma Feature com Effort 13 e duas
  // Stories de 8 e 5 pontos virava "26 pontos, 30,8% concluído" quando o real é
  // "13 pontos, 61,5%". A Feature também entrava como um terceiro entregável ao lado das
  // próprias filhas, distorcendo progressPct.
  const leaves = items.filter((i) => !childrenOf.has(i.id));
  const scoped = leaves.length ? leaves : items;
  const isLeafScoped = leaves.length > 0 && leaves.length < items.length;

  const done = scoped.filter((i) => i.category === "done").length;
  const removed = scoped.filter((i) => i.category === "removed").length;
  const considered = scoped.length - removed;
  const points = scoped.reduce((a, i) => a + (Number(i.storyPoints) || 0), 0);
  const donePoints = scoped.filter((i) => i.category === "done").reduce((a, i) => a + (Number(i.storyPoints) || 0), 0);

  return {
    summary: {
      total: items.length,
      leafCount: leaves.length,
      scope: isLeafScoped ? "folhas" : "todos",
      scopeNote: isLeafScoped
        ? `Progresso e pontos calculados sobre os ${leaves.length} itens folha (de ${items.length} no escopo); itens-pai não são somados junto com seus filhos.`
        : null,
      considered,
      done,
      removed,
      inProgress: scoped.filter((i) => i.category === "inProgress").length,
      todo: scoped.filter((i) => i.category === "todo").length,
      other: scoped.filter((i) => i.category === "other").length,
      progressPct: considered ? Math.round((done / considered) * 1000) / 10 : null,
      storyPoints: points || null,
      donePoints: points ? donePoints : null,
      pointsPct: points ? Math.round((donePoints / points) * 1000) / 10 : null,
      remainingWork: scoped.reduce((a, i) => a + (Number(i.remainingWork) || 0), 0) || null,
      completedWork: scoped.reduce((a, i) => a + (Number(i.completedWork) || 0), 0) || null,
    },
    byType, byState, byCategory, byIteration, byAssignee,
    hierarchy: { roots, childrenOf: Object.fromEntries([...childrenOf.entries()]) },
  };
}

function groupCount(items, keyFn) {
  const m = new Map();
  for (const i of items) {
    const k = keyFn(i);
    const e = m.get(k) || { key: k, count: 0, done: 0, inProgress: 0, todo: 0 };
    e.count++;
    if (i.category === "done") e.done++;
    else if (i.category === "inProgress") e.inProgress++;
    else if (i.category === "todo") e.todo++;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

function sanitize(s) {
  return String(s || "").replace(/'/g, "''");
}

function requestSpec(root, outputsDir, opts) {
  return {
    snapshotTarget: relPosix(root, join(opts.writeDir || outputsDir, "status", "azure-snapshot.json")),
    format: "templates/azure-snapshot.example.json",
    project: opts.project || process.env.AZURE_DEVOPS_PROJECT || null,
    areaPath: opts.areaPath || process.env.AZURE_DEVOPS_AREA_PATH || null,
    iterationPath: opts.iterationPath || process.env.AZURE_DEVOPS_ITERATION_PATH || null,
    idMapHint: relPosix(root, join(outputsDir, "id-map.json")),
    fields: DEFAULT_FIELDS,
    instruction: "Buscar os work items do escopo (preferir os IDs de id-map.json quando existir) via MCP do Azure DevOps, incluir os itens-pai dos bugs até a Epic mesmo fora do escopo (em `ancestors`), gravar no formato do template e re-rodar o CLI com --azure-snapshot <caminho>.",
  };
}
