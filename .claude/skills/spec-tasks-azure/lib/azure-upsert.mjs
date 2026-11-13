/**
 * Modo _change (scope-change) — upsert de work items no Azure DevOps.
 *
 * Em modo normal a skill é create-only. Em modo _change ela passa a fazer UPSERT:
 * atualiza work items que já existem no ADO (PATCH) e cria apenas os que ainda não existem.
 *
 * Correlação ID lógico (TASK-XXX-XXX / STORY-XXX) → ID numérico do work item do ADO, nesta ordem:
 *   1. id-map.json fornecido pelo usuário  ({"TASK-XXX-XXX": 12345})
 *   2. Tag marcadora `logical-id:<ID>` gravada por esta skill em toda criação (WIQL CONTAINS)
 *   3. Título do work item (`<ID>: ...`) via WIQL CONTAINS — fallback para itens legados criados
 *      pela versão create-only (sem tag) ou cujo id-map não os contém.
 *   4. Se nada correlacionar → aviso acionável + cria como novo (não perde a alteração).
 *
 * Tudo o que toca a API do ADO usa o mesmo PAT/org/projeto e a mesma API_VERSION do
 * azureDevopsService.js. Nenhum nome de projeto/domínio real é embutido aqui — apenas placeholders.
 *
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AzureDevOpsApiError, LOGICAL_ID_TAG_PREFIX } from '../azureDevopsService.js';
import { textToHtml } from './ado-narrative-html.mjs';

const API_VERSION = process.env.AZURE_DEVOPS_API_VERSION || '7.1';

/** @param {string} pat */
function authorizationHeader(pat) {
  return `Basic ${Buffer.from(`:${pat}`, 'utf8').toString('base64')}`;
}

/** @param {string} s */
function escapeWiqlLiteral(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * Carrega um arquivo de mapeamento id-map.json: { "TASK-XXX-XXX": 12345, "STORY-XXX": 678 }.
 * Usado como fonte primária de correlação e indispensável na PRIMEIRA execução sobre itens
 * legados (criados pela versão create-only, sem a tag `logical-id:`).
 *
 * @param {string | null | undefined} filePath
 * @returns {Map<string, number>}
 */
export function loadIdMap(filePath) {
  /** @type {Map<string, number>} */
  const map = new Map();
  if (!filePath) return map;
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    throw new Error(`id-map não encontrado: ${abs}. Formato esperado: {"TASK-XXX-XXX": 12345}.`);
  }
  const raw = JSON.parse(readFileSync(abs, 'utf8'));
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('id-map inválido: esperado objeto { "<ID lógico>": <id numérico do ADO> }.');
  }
  for (const [k, v] of Object.entries(raw)) {
    const id = typeof k === 'string' ? k.trim() : '';
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    if (id && Number.isFinite(n) && n > 0) map.set(id, n);
  }
  return map;
}

/**
 * Consulta WIQL (POST) e devolve os IDs numéricos de work items que casam com a cláusula WHERE.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {string} whereClause  cláusula WHERE crua (sem a palavra WHERE; pode terminar em ORDER BY)
 * @param {{ top?: number }} [opts]  `top` limita quantos IDs voltam
 * @returns {Promise<number[]>}
 */
export async function queryWorkItemIds(config, whereClause, opts = {}) {
  const top = Number.isInteger(opts.top) && opts.top > 0 ? `&$top=${opts.top}` : '';
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/wiql?api-version=${API_VERSION}${top}`;
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${whereClause}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorizationHeader(config.pat) },
    body: JSON.stringify({ query: wiql }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const msg = (data && typeof data.message === 'string' ? data.message : res.statusText) || 'WIQL error';
    throw new AzureDevOpsApiError(`${msg} (${res.status})`, res.status, text, url);
  }
  const items = Array.isArray(data?.workItems) ? data.workItems : [];
  return items.map((w) => (typeof w?.id === 'number' ? w.id : Number(w?.id))).filter((n) => Number.isFinite(n));
}

/**
 * StackRank atual de vários work items, numa leitura em lote (`GET _apis/wit/workitems?ids=…`, 200
 * por vez; item apagado volta como ausente, sem derrubar o lote). Item sem o campo → `null`.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number[]} ids
 * @returns {Promise<Map<number, number | null>>}
 */
export async function lerStackRanks(config, ids) {
  /** @type {Map<number, number | null>} */
  const out = new Map();
  const unicos = [...new Set(ids)];
  for (let i = 0; i < unicos.length; i += 200) {
    const lote = unicos.slice(i, i + 200);
    const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/workitems?ids=${lote.join(',')}&fields=${STACK_RANK_FIELD}&errorPolicy=omit&api-version=${API_VERSION}`;
    const res = await fetch(url, { headers: { Authorization: authorizationHeader(config.pat) } });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) {
      const msg = (data && typeof data.message === 'string' ? data.message : res.statusText) || 'erro na leitura em lote';
      throw new AzureDevOpsApiError(`${msg} (${res.status})`, res.status, text, url);
    }
    for (const id of lote) out.set(id, null);
    for (const w of Array.isArray(data?.value) ? data.value : []) {
      const v = w?.fields?.[STACK_RANK_FIELD];
      if (typeof w?.id === 'number') out.set(w.id, typeof v === 'number' && Number.isFinite(v) ? v : null);
    }
  }
  return out;
}

/**
 * O maior StackRank já gravado no projeto (0 se nenhum item tem StackRank). É a base do StackRank
 * dos itens que a publicação cria: base + `executionOrder` põe os novos DEPOIS do backlog que já
 * existe, na ordem calculada. Sem base, StackRank = `executionOrder` (1…N) jogava tudo para o topo.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @returns {Promise<number>}
 */
export async function maiorStackRank(config) {
  const ids = await queryWorkItemIds(config,
    `[System.TeamProject] = @project AND [${STACK_RANK_FIELD}] > 0 ORDER BY [${STACK_RANK_FIELD}] DESC`, { top: 1 });
  if (ids.length === 0) return 0;
  const v = (await lerStackRanks(config, [ids[0]])).get(ids[0]);
  if (typeof v !== 'number') throw new Error(`o work item #${ids[0]}, o de maior StackRank na consulta, voltou sem o campo`);
  return v;
}

/**
 * Localiza o work item do ADO correspondente a um ID lógico, na ordem de prioridade documentada.
 * Não cria nada. Devolve o id numérico + a estratégia que resolveu (para o relatório/avisos).
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {string} logicalId  ex.: 'TASK-XXX-XXX'
 * @param {Map<string, number>} idMap
 * @returns {Promise<{ adoId: number, via: 'id-map' | 'tag' | 'title' } | null>}
 */
export async function findExistingWorkItem(config, logicalId, idMap) {
  const id = String(logicalId).trim();
  if (!id) return null;

  // 1. id-map.json (fonte explícita do usuário)
  if (idMap.has(id)) return { adoId: /** @type {number} */ (idMap.get(id)), via: 'id-map' };

  // 2. Tag marcadora gravada por esta skill em criações anteriores
  const tagLit = escapeWiqlLiteral(`${LOGICAL_ID_TAG_PREFIX}${id}`);
  const byTag = await queryWorkItemIds(config, `[System.TeamProject] = @project AND [System.Tags] CONTAINS '${tagLit}'`);
  if (byTag.length > 0) return { adoId: byTag[0], via: 'tag' };

  // 3. Fallback por título legado: títulos são gravados como "<ID lógico>: <nome>"
  const titleLit = escapeWiqlLiteral(`${id}:`);
  const byTitle = await queryWorkItemIds(config, `[System.TeamProject] = @project AND [System.Title] CONTAINS '${titleLit}'`);
  if (byTitle.length > 0) return { adoId: byTitle[0], via: 'title' };

  return null;
}

/** O campo que ordena o backlog no processo Agile. */
export const STACK_RANK_FIELD = 'Microsoft.VSTS.Common.StackRank';
const ehOpStackRank = (op) => op?.path === `/fields/${STACK_RANK_FIELD}`;

/**
 * Processo sem StackRank (Scrum usa BacklogPriority; processo herdado pode não ter): desliga o campo
 * para o resto da publicação e avisa UMA vez — vale para criação, atualização e leitura do campo.
 * @param {{ semStackRank?: boolean, avisos?: string[] }} config
 */
export function desligarStackRank(config) {
  if (config.semStackRank) return;
  config.semStackRank = true;
  (config.avisos ??= []).push(`O processo do projeto não aceita ${STACK_RANK_FIELD} (STACKRANK_UNSUPPORTED): os work items seguem na ordem lógica, mas sem a ordem gravada no backlog.`);
}

/** A API recusou por causa do StackRank (TF51535 «Cannot find field …StackRank» e parecidos)? */
export function recusouStackRank(e) {
  return e instanceof AzureDevOpsApiError && /StackRank/i.test(`${e.message} ${e.body}`);
}

/**
 * PATCH de um work item existente. Atualiza apenas os campos informados; preserva histórico,
 * vínculos hierárquicos e quaisquer campos não tocados.
 *
 * Processo sem StackRank: o mesmo tratamento da criação — a recusa por causa do campo desliga o
 * StackRank (aviso uma vez) e o PATCH sai de novo sem ele. Antes, o `--reordenar` num processo
 * Scrum perdia a story inteira (título, descrição, tags) e as tasks dela nem eram tentadas.
 *
 * @param {{ pat: string, org: string, project: string, semStackRank?: boolean }} config
 * @param {number} workItemId
 * @param {Array<Record<string, unknown>>} patchDocument  json-patch ops já montadas
 * @returns {Promise<{ id: number, url: string, raw: Record<string, unknown> }>}
 */
export async function updateWorkItem(config, workItemId, patchDocument) {
  const doc = config.semStackRank ? patchDocument.filter((op) => !ehOpStackRank(op)) : patchDocument;
  if (doc.length === 0) return { id: workItemId, url: '', raw: {} };
  try {
    return await updateWorkItemOnce(config, workItemId, doc);
  } catch (e) {
    const semCampo = doc.filter((op) => !ehOpStackRank(op));
    if (semCampo.length === doc.length || !recusouStackRank(e)) throw e;
    desligarStackRank(config);
    return semCampo.length ? updateWorkItemOnce(config, workItemId, semCampo) : { id: workItemId, url: '', raw: {} };
  }
}

async function updateWorkItemOnce(config, workItemId, patchDocument) {
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/workitems/${workItemId}?api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json-patch+json', Authorization: authorizationHeader(config.pat) },
    body: JSON.stringify(patchDocument),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { parseError: true, raw: text }; }
  if (!res.ok) {
    const msg = (data && typeof data.message === 'string' ? data.message : res.statusText) || 'Azure DevOps API error';
    throw new AzureDevOpsApiError(`${msg} (${res.status})`, res.status, text, url);
  }
  const id = data && typeof data.id === 'number' ? data.id : Number(data?.id);
  const itemUrl = typeof data?.url === 'string' ? data.url : '';
  if (!Number.isFinite(id)) {
    throw new AzureDevOpsApiError('Resposta de PATCH sem id numérico', res.status, text, url);
  }
  return { id, url: itemUrl, raw: data && typeof data === 'object' ? data : {} };
}

/**
 * Monta as ops de PATCH para atualizar título/descrição/critérios/tags de um work item.
 * Campos undefined são omitidos (não sobrescreve com vazio). A tag marcadora `logical-id:`
 * é (re)garantida para que itens legados passem a ter o marcador após o primeiro upsert.
 *
 * ATENÇÃO: `op:'add'` em `/fields/System.Description` SUBSTITUI o campo inteiro — não faz merge.
 * Quem chama tem de passar a description COMPLETA (mesma composição usada na criação), senão o
 * `--change` apaga o que não foi remontado. Para Epic/Feature use
 * `buildEpicDescriptionHtml`/`buildFeatureDescriptionHtml` (azureDevopsService.js), a composição
 * única compartilhada por create e update.
 *
 * @param {{
 *   title?: string,
 *   descriptionHtml?: string,
 *   acceptanceCriteriaText?: string,
 *   priority?: number,
 *   ensureTags?: string[],
 * }} fields
 */
export function buildUpdatePatch(fields) {
  /** @type {Array<Record<string, unknown>>} */
  const patch = [];
  if (typeof fields.title === 'string' && fields.title.trim()) {
    patch.push({ op: 'add', path: '/fields/System.Title', value: fields.title });
  }
  if (typeof fields.descriptionHtml === 'string' && fields.descriptionHtml.trim()) {
    patch.push({ op: 'add', path: '/fields/System.Description', value: fields.descriptionHtml });
  }
  if (typeof fields.acceptanceCriteriaText === 'string' && fields.acceptanceCriteriaText.trim()) {
    // acceptanceCriteriaText é texto plano ("- item\n- item"); o campo do ADO renderiza HTML,
    // então convertemos aqui (uma única vez) para <ul><li> — senão as quebras colapsam.
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria', value: textToHtml(fields.acceptanceCriteriaText) });
  }
  if (typeof fields.priority === 'number' && Number.isFinite(fields.priority)) {
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: fields.priority });
  }
  if (typeof fields.stackRank === 'number' && Number.isFinite(fields.stackRank)) {
    // Só chega aqui com --reordenar: no upsert, a ordem que o time deu no board é preservada.
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.StackRank', value: fields.stackRank });
  }
  if (Array.isArray(fields.ensureTags) && fields.ensureTags.length === 0 && Array.isArray(fields.removeTags) && fields.removeTags.length > 0) {
    // Remoção deixou o conjunto vazio: o campo tem que ir vazio, senão a tag removida ficaria.
    patch.push({ op: 'add', path: '/fields/System.Tags', value: '' });
  }
  if (Array.isArray(fields.ensureTags) && fields.ensureTags.length > 0) {
    // System.Tags é "; "-separado; PATCH em /fields/System.Tags substitui o conjunto inteiro.
    // Esta função é pura (sem I/O) e não lê tags existentes — para PATCH que preserva tags
    // manuais do ADO, usar updateWorkItemMergingTags (faz GET + merge antes de chamar esta
    // função com o conjunto já mesclado).
    patch.push({ op: 'add', path: '/fields/System.Tags', value: fields.ensureTags.join('; ') });
  }
  return patch;
}

/**
 * Lê as tags atuais (System.Tags) de um work item existente no ADO.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} workItemId
 * @returns {Promise<string[]>}
 */
export async function getWorkItemTags(config, workItemId) {
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/workitems/${workItemId}?fields=System.Tags&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers: { Authorization: authorizationHeader(config.pat) } });
  const text = await res.text();
  if (!res.ok) return [];
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { return []; }
  const raw = data && typeof data === 'object' && data.fields && typeof data.fields === 'object'
    ? data.fields['System.Tags']
    : undefined;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw.split(';').map((t) => t.trim()).filter(Boolean);
}

/**
 * PATCH de um work item existente MESCLANDO as tags atuais (lidas via GET) com as tags
 * desejadas (`fields.ensureTags`), em vez de substituir `System.Tags` por completo.
 *
 * `buildUpdatePatch` sozinho substitui o conjunto inteiro de tags — em modo `_change`
 * isso apagaria tags manuais adicionadas no ADO por um humano após a criação do item.
 * Esta função faz GET → merge (`Set` de existentes + desejadas) → PATCH, preservando
 * qualquer tag manual.
 *
 * Tags do ADO não diferenciam maiúsculas, e o ADO reaproveita a grafia da primeira tag criada no
 * projeto: somar e tirar comparam sem caixa, e a grafia que já está no item é a que fica (somar
 * `regra-de-negocio` a um item com `Regra-De-Negocio` não duplica).
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} workItemId
 * @param {Parameters<typeof buildUpdatePatch>[0]} fields
 * @returns {Promise<{ id: number, url: string, raw: Record<string, unknown>, tagsAntes: string[] }>}
 */
export async function updateWorkItemMergingTags(config, workItemId, fields) {
  let mergedFields = fields;
  let tagsAntes = [];
  const remover = Array.isArray(fields.removeTags) ? fields.removeTags.map((t) => String(t).trim().toLowerCase()) : [];
  if ((Array.isArray(fields.ensureTags) && fields.ensureTags.length > 0) || remover.length > 0) {
    tagsAntes = await getWorkItemTags(config, workItemId);
    // `removeTags` tira SÓ as tags nomeadas (ex.: a marca de regra de negócio que a própria
    // ferramenta pôs num item que deixou de ser regra) — toda tag manual do time continua lá.
    /** @type {Map<string, string>} */
    const porChave = new Map();
    for (const t of [...tagsAntes, ...(fields.ensureTags ?? [])]) {
      const k = String(t).trim().toLowerCase();
      if (k && !porChave.has(k)) porChave.set(k, String(t).trim());
    }
    const merged = [...porChave].filter(([k]) => !remover.includes(k)).map(([, t]) => t);
    mergedFields = { ...fields, ensureTags: merged };
  }
  const r = await updateWorkItem(config, workItemId, buildUpdatePatch(mergedFields));
  return { ...r, tagsAntes };
}

/**
 * Adiciona um link `Related` (System.LinkTypes.Related) de um work item para outro.
 * Usado para garantir que tasks de alteração/regressão apontem para o work item original.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} fromId
 * @param {number} toId
 * @param {string} [comment]
 * @returns {Promise<void>}
 */
export async function addRelatedLink(config, fromId, toId, comment = 'scope-change: relacionado à task original') {
  const targetUrl = `https://dev.azure.com/${encodeURIComponent(config.org)}/_apis/wit/workitems/${toId}`;
  const patch = [
    {
      op: 'add',
      path: '/relations/-',
      value: { rel: 'System.LinkTypes.Related', url: targetUrl, attributes: { comment } },
    },
  ];
  // Reaproveita updateWorkItem; ADO ignora silenciosamente se o link já existir? Não — pode
  // duplicar. O chamador deve checar antes via getRelatedIds quando quiser idempotência total.
  await updateWorkItem(config, fromId, patch);
}

/**
 * Lê os IDs já vinculados como Related a um work item (para evitar links duplicados).
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} workItemId
 * @returns {Promise<Set<number>>}
 */
export async function getRelatedIds(config, workItemId) {
  return getLinkedIds(config, workItemId, 'System.LinkTypes.Related');
}

/**
 * IDs ligados a um work item por um tipo de link (`System.LinkTypes.Related`,
 * `System.LinkTypes.Dependency-Reverse`, …) — para não duplicar link no upsert.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} workItemId
 * @param {string} rel
 * @returns {Promise<Set<number>>}
 */
export async function getLinkedIds(config, workItemId, rel) {
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/workitems/${workItemId}?$expand=relations&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers: { Authorization: authorizationHeader(config.pat) } });
  const text = await res.text();
  if (!res.ok) return new Set();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { return new Set(); }
  const rels = Array.isArray(data?.relations) ? data.relations : [];
  /** @type {Set<number>} */
  const out = new Set();
  for (const r of rels) {
    if (r?.rel === rel && typeof r?.url === 'string') {
      const m = r.url.match(/\/workitems\/(\d+)\b/i);
      if (m) out.add(Number.parseInt(m[1], 10));
    }
  }
  return out;
}

/** Tipo de link do ADO para "este item depende daquele": o outro é a Predecessora. */
export const DEPENDENCY_LINK = 'System.LinkTypes.Dependency-Reverse';

/**
 * Link de dependência: `fromId` (o dependente) ganha `toId` como Predecessora — a mesma relação
 * aparece do outro lado como Sucessora. Vem do `dependencies[]` do tasks.json.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} fromId
 * @param {number} toId
 * @param {string} [comment]
 */
export async function addDependencyLink(config, fromId, toId, comment = 'dependência do tasks.json') {
  const targetUrl = `https://dev.azure.com/${encodeURIComponent(config.org)}/_apis/wit/workitems/${toId}`;
  await updateWorkItem(config, fromId, [
    { op: 'add', path: '/relations/-', value: { rel: DEPENDENCY_LINK, url: targetUrl, attributes: { comment } } },
  ]);
}

/** IDs lógicos de que um item depende: `dependencies[]` e `dependsOn[]`. */
export function extractDependencyLogicalIds(item) {
  /** @type {string[]} */
  const ids = [];
  for (const k of ['dependencies', 'dependsOn']) {
    const v = item?.[k];
    if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && x.trim()) ids.push(x.trim());
  }
  return [...new Set(ids)];
}

/**
 * Extrai os IDs lógicos referenciados por uma task de alteração/regressão.
 * Aceita os campos `regressionOf` e `relatedTasks` (string ou string[]).
 *
 * @param {Record<string, unknown>} task
 * @returns {string[]}
 */
export function extractRelatedLogicalIds(task) {
  /** @type {string[]} */
  const ids = [];
  const push = (v) => {
    if (typeof v === 'string' && v.trim()) ids.push(v.trim());
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && x.trim()) ids.push(x.trim());
  };
  push(task.regressionOf);
  push(task.relatedTasks);
  return [...new Set(ids)];
}

/**
 * Detecta se o documento deve rodar em modo _change.
 * @param {Record<string, unknown>} doc
 * @param {boolean} [cliChangeFlag]
 * @returns {boolean}
 */
export function isChangeMode(doc, cliChangeFlag = false) {
  if (cliChangeFlag) return true;
  const metadata = doc && typeof doc === 'object' ? doc.metadata : null;
  return !!(metadata && typeof metadata === 'object' && metadata.changeMode === true);
}
