/**
 * Azure DevOps — cria Features, User Stories e Tasks sob um Epic já existente (id em metadata.azureDevOps.epicWorkItemId).
 * Autenticação: PAT em AZURE_DEVOPS_PAT; org/projeto em AZURE_DEVOPS_ORG / AZURE_DEVOPS_PROJECT.
 * Suporta hierarquia variável de backlog (Epic, Feature, Story, Task) via metadata.backlogHierarchy.chosen.
 *
 * Criação de work items: POST + Content-Type application/json-patch+json
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStoryNarrativeHtml,
  buildTaskNarrativeHtml,
  buildEpicNarrativeHtml,
  buildFeatureNarrativeHtml,
  textToHtml
} from './lib/ado-narrative-html.mjs';
import {
  loadIdMap,
  findExistingWorkItem,
  updateWorkItem,
  updateWorkItemMergingTags,
  addRelatedLink,
  getRelatedIds,
  extractRelatedLogicalIds,
  addDependencyLink,
  getLinkedIds,
  extractDependencyLogicalIds,
  DEPENDENCY_LINK,
  desligarStackRank,
  recusouStackRank,
  maiorStackRank,
  lerStackRanks,
} from './lib/azure-upsert.mjs';
import {
  caminhoDoRegistro,
  chaveDoProjeto,
  lerRegistro,
  gravarRegistro,
  marcaDaFerramenta,
  registrarMarca,
  esquecerMarca,
  mesmaTag,
  NOME_REGISTRO,
} from './lib/marcas-regra.mjs';

export { isChangeMode } from './lib/azure-upsert.mjs';

const API_VERSION = process.env.AZURE_DEVOPS_API_VERSION || '7.1';

export class AzureDevOpsApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string} [body]
   * @param {string} [url]
   */
  constructor(message, status, body = '', url = '') {
    super(message);
    this.name = 'AzureDevOpsApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/**
 * @returns {{ pat: string, org: string, project: string, witEpic: string, witFeature: string, witUserStory: string, witTask: string, witEnabler?: string, witSpike?: string, witTechnicalDebt?: string, witBug?: string }}
 */
export function getAzureDevOpsConfigFromEnv() {
  const pat = process.env.AZURE_DEVOPS_PAT;
  const org = process.env.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT;
  if (!pat || !org || !project) {
    throw new Error(
      'Defina AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG e AZURE_DEVOPS_PROJECT no ambiente (ou arquivo .env carregado antes da importação).'
    );
  }
  return {
    pat,
    org,
    project,
    witEpic: process.env.AZURE_DEVOPS_WIT_EPIC || 'Epic',
    witFeature: process.env.AZURE_DEVOPS_WIT_FEATURE || 'Feature',
    witUserStory: process.env.AZURE_DEVOPS_WIT_USER_STORY || 'User Story',
    witTask: process.env.AZURE_DEVOPS_WIT_TASK || 'Task',
    witEnabler: process.env.AZURE_DEVOPS_WIT_ENABLER || undefined,
    witSpike: process.env.AZURE_DEVOPS_WIT_SPIKE || undefined,
    witTechnicalDebt: process.env.AZURE_DEVOPS_WIT_TECHNICAL_DEBT || undefined,
    witBug: process.env.AZURE_DEVOPS_WIT_BUG || undefined,
  };
}

/**
 * @param {string} pat
 */
function authorizationHeader(pat) {
  return `Basic ${Buffer.from(`:${pat}`, 'utf8').toString('base64')}`;
}

/**
 * Resolve o WIT correto baseado no workItemType (para tipos operacionais).
 * @param {string|undefined} workItemType
 * @param {string} defaultWit
 * @param {Record<string, unknown>} config
 * @returns {string}
 */
function resolveWorkItemType(workItemType, defaultWit, config) {
  if (!workItemType || workItemType === 'USER_STORY') return defaultWit;
  switch (workItemType) {
    case 'ENABLER':
      return config.witEnabler || 'User Story';
    case 'SPIKE':
      return config.witSpike || 'User Story';
    case 'TECHNICAL_DEBT':
      return config.witTechnicalDebt || 'User Story';
    case 'BUG':
      return config.witBug || 'Bug';
    default:
      return defaultWit;
  }
}

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>[]}
 */
function asObjectArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== null && typeof x === 'object' && !Array.isArray(x)).map((x) => /** @type {Record<string, unknown>} */ (x));
}

/**
 * Tudo que não são `stories`, `features` ou `epics` — anexado às User Stories para não perder contexto do tasks.json.
 * @param {Record<string, unknown>} doc
 */
export function extractGlobalDocumentParts(doc) {
  const skip = new Set(['stories', 'features', 'epics']);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (!skip.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Id numérico do Epic já criado no Azure DevOps.
 * Ordem: variável de ambiente AZURE_DEVOPS_EPIC_WORK_ITEM_ID (opcional, útil em CI), senão metadata.azureDevOps.epicWorkItemId.
 *
 * @param {Record<string, unknown>} doc
 * @returns {number}
 */
export function resolveParentEpicWorkItemId(doc) {
  const envRaw = process.env.AZURE_DEVOPS_EPIC_WORK_ITEM_ID;
  if (envRaw != null && String(envRaw).trim() !== '') {
    const n = Number.parseInt(String(envRaw).trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
    throw new Error(`AZURE_DEVOPS_EPIC_WORK_ITEM_ID inválido: "${envRaw}" (esperado inteiro > 0).`);
  }

  const metadata = asObject(doc.metadata);
  const ado = asObject(metadata.azureDevOps);
  const raw = ado.epicWorkItemId ?? ado.workItemId;
  const n =
    typeof raw === 'number' && Number.isFinite(raw)
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw.trim(), 10)
        : NaN;

  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      'Epic pai não definido. Cadastre o Epic no Azure DevOps e informe em metadata.azureDevOps.epicWorkItemId (número), ex.: "azureDevOps": { "epicWorkItemId": 12345 }. Opcionalmente use AZURE_DEVOPS_EPIC_WORK_ITEM_ID no ambiente.'
    );
  }
  return n;
}

const TASKS_TO_AZURE_SCHEMA = 'tasks-to-azure/v3';

/**
 * Prefixo da tag marcadora que correlaciona o ID lógico (TASK-XXX-XXX, STORY-XXX, ...)
 * ao work item do Azure DevOps. Gravado em TODA criação (modo normal e _change) para
 * habilitar o upsert futuro via WIQL ([System.Tags] CONTAINS 'logical-id:<ID>').
 * Não depende de campo customizado — funciona em qualquer process template.
 */
export const LOGICAL_ID_TAG_PREFIX = 'logical-id:';

/**
 * Monta a tag marcadora de ID lógico. Retorna undefined se o jsonId for vazio/inválido.
 * @param {unknown} jsonId
 * @returns {string | undefined}
 */
export function logicalIdTag(jsonId) {
  if (typeof jsonId !== 'string') return undefined;
  const id = jsonId.trim();
  if (!id) return undefined;
  return `${LOGICAL_ID_TAG_PREFIX}${id}`;
}

/**
 * Tags extras comuns aos work items (além de epic | user-story | task).
 * metadata.azureDevOps.workItemTags ou pipelineTags: string[] ou string separada por ; ou ,.
 * @param {Record<string, unknown>} doc
 * @returns {string[]}
 */
export function getPipelineWorkItemTags(doc) {
  const metadata = asObject(doc.metadata);
  const ado = asObject(metadata.azureDevOps);
  const raw = ado.workItemTags ?? ado.pipelineTags;
  if (Array.isArray(raw)) {
    return raw.filter((t) => typeof t === 'string').map((x) => x.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw
      .split(/[;,]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return ['task-pipeline'];
}

/**
 * Tag da marca de regra de negócio que a spec-tasks grava em `businessRuleHeavy`
 * (metadata.azureDevOps.businessRuleTag; padrão `regra-de-negocio`).
 * @param {Record<string, unknown>} doc
 */
export function getBusinessRuleTag(doc) {
  const raw = asObject(asObject(doc.metadata).azureDevOps).businessRuleTag;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'regra-de-negocio';
}

/**
 * Ordem de criação: `executionOrder` quando o order-backlog da spec-tasks o gravou; item sem ele
 * mantém a posição relativa do array, depois dos ordenados.
 * @param {Record<string, unknown>[]} lista
 */
export function porOrdemDeExecucao(lista) {
  return lista
    .map((x, i) => ({ x, i, o: typeof x.executionOrder === 'number' && Number.isFinite(x.executionOrder) ? x.executionOrder : Infinity }))
    .sort((a, b) => a.o - b.o || a.i - b.i)
    .map(({ x }) => x);
}

const STACK_RANK_FIELD = 'Microsoft.VSTS.Common.StackRank';

/** Op de StackRank (a ordem do backlog no processo Agile) — só com número e enquanto o campo existir no processo. */
function stackRankPatch(stackRank, config) {
  if (typeof stackRank !== 'number' || !Number.isFinite(stackRank) || config.semStackRank) return [];
  return [{ op: 'add', path: `/fields/${STACK_RANK_FIELD}`, value: stackRank }];
}

const temOrdemExec = (x) => typeof x?.executionOrder === 'number' && Number.isFinite(x.executionOrder);

/**
 * Base do StackRank dos itens que a publicação cria: o maior StackRank já existente no projeto,
 * lido UMA vez, antes de criar. Item criado = base + `executionOrder` — entra depois do backlog que
 * o time já tem, na ordem calculada. (Antes era só `executionOrder`, 1…N: num projeto com backlog
 * tudo ia para o topo, e no `_change` os novos se intercalavam com os antigos.)
 *
 * `null` = não gravar StackRank na criação: backlog sem `executionOrder`, processo sem o campo
 * (aviso STACKRANK_UNSUPPORTED) ou a leitura falhou — aí o item sai sem StackRank e o ADO o põe no
 * fim, que é o comportamento padrão, nunca no topo.
 * @param {Record<string, unknown>} cfg
 * @param {Record<string, unknown>[]} itens
 * @returns {Promise<number | null>}
 */
async function baseDoStackRank(cfg, itens) {
  if (cfg.semStackRank || !itens.some(temOrdemExec)) return null;
  try {
    return await maiorStackRank(cfg);
  } catch (e) {
    if (recusouStackRank(e)) { desligarStackRank(cfg); return null; }
    (cfg.avisos ??= []).push(`Não consegui ler o maior StackRank do projeto (STACKRANK_BASE_UNREADABLE: ${e instanceof Error ? e.message : String(e)}): os work items novos foram criados sem StackRank — o ADO os põe no fim do backlog, na ordem em que foram criados. Para gravar a ordem, publique de novo com --change --reordenar.`);
    return null;
  }
}

/**
 * Registro das tags de regra de negócio que esta ferramenta pôs (lib/marcas-regra.mjs), ao lado do
 * tasks.json. Ilegível → aviso, nada sai e nada é regravado.
 * @param {Record<string, unknown>} cfg
 * @param {string | undefined} baseDir
 */
function abrirRegistro(cfg, baseDir) {
  const caminho = caminhoDoRegistro(baseDir);
  const registro = lerRegistro(caminho);
  if (registro.ilegivel) {
    (cfg.avisos ??= []).push(`${NOME_REGISTRO} ilegível (${registro.erro}): nenhuma tag de regra de negócio foi tirada nesta publicação, e o registro não foi regravado — conserte o arquivo.`);
  }
  return { caminho, registro, projeto: chaveDoProjeto(cfg) };
}


function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function payloadToHtmlSection(payload) {
  const json = JSON.stringify(payload, null, 2);
  // ADO: hr separa "leitura humana" do bloco técnico; pre+code ≈ bloco de código monoespaçado.
  const preAttrs =
    ' style="white-space:pre-wrap;word-break:break-word;font-family:Consolas,Courier New,monospace;font-size:12px;line-height:1.35;"';
  return (
    `<hr />` +
    `<h2><strong>Payload completo (JSON)</strong></h2>` +
    `<p>Fonte <code>tasks.json</code> — integral para rastreabilidade e para agentes (copiar/colar se precisar).</p>` +
    `<pre${preAttrs}><code>${escapeHtml(json)}</code></pre>`
  );
}

/**
 * Corpo da descrição no Azure DevOps: título (eco) + HTML legível; JSON completo só se `appendFullJson`.
 *
 * @param {string} title
 * @param {{
 *   summaryText?: string,
 *   preJsonHtml?: string,
 *   fullPayload?: unknown,
 *   appendFullJson?: boolean,
 * }} [options]
 */
function buildDescriptionHtml(title, options = {}) {
  const { summaryText, preJsonHtml, fullPayload, appendFullJson = false } = options;
  let body = '';
  if (typeof preJsonHtml === 'string' && preJsonHtml.trim() !== '') {
    body = preJsonHtml;
  } else if (summaryText && String(summaryText).trim()) {
    // summaryText é texto plano do tasks.json — converter \n em parágrafos/listas (campo renderiza HTML).
    body = textToHtml(summaryText);
  }
  const titleLine = `<p><strong>${escapeHtml(title)}</strong></p>`;
  let html = `<div>${titleLine}${body}`;
  if (appendFullJson && fullPayload !== undefined) {
    html += payloadToHtmlSection(fullPayload);
  }
  html += '</div>';
  return html;
}

function mapPriority(priority) {
  if (!priority || typeof priority !== 'string') return undefined;
  const p = priority.toUpperCase();
  if (p === 'HIGH' || p === 'HIGHEST' || p === 'CRITICAL') return 1;
  if (p === 'MEDIUM' || p === 'NORMAL') return 2;
  if (p === 'LOW') return 4;
  return 3;
}

/**
 * Story sem o array `tasks` (evita repetir irmãos no bloco parentStory; a tarefa atual vem em `task`).
 * @param {Record<string, unknown>} story
 * @returns {Record<string, unknown>}
 */
function storyWithoutTasks(story) {
  const { tasks: _tasks, ...rest } = story;
  return rest;
}

/**
 * Índice global task id → objeto da tarefa (todas as stories), para resolver dependencies entre stories.
 * @param {Record<string, unknown>[]} storiesIn
 * @returns {Map<string, Record<string, unknown>>}
 */
function buildAllTasksById(storiesIn) {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const st of storiesIn) {
    for (const t of asObjectArray(st.tasks)) {
      const tid = typeof t.id === 'string' ? t.id : '';
      if (tid) map.set(tid, t);
    }
  }
  return map;
}

/**
 * Payload completo para Work Item Task — tudo o que um agente LLM precisa sem abrir o repositório.
 *
 * @param {Record<string, unknown>} task
 * @param {Record<string, unknown>} story
 * @param {Record<string, unknown>} documentLevel
 * @param {number} parentEpicWorkItemId
 * @param {Map<string, Record<string, unknown>>} allTasksById
 */
export function buildTaskFullPayload(task, story, documentLevel, parentEpicWorkItemId, allTasksById) {
  const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
  const dependencyTasksDetail = deps.map((depId) => {
    const id = String(depId);
    const found = allTasksById.get(id);
    return found
      ? { id, task: found }
      : {
          id,
          note: 'Dependência não encontrada em tasks.json (outro épico, typo ou tarefa externa ao arquivo).',
        };
  });

  const tasksInSameStory = asObjectArray(story.tasks);
  const siblingTasksSummary = tasksInSameStory.map((t) => ({
    id: typeof t.id === 'string' ? t.id : '',
    title: typeof t.title === 'string' ? t.title : '',
    sequence: typeof t.sequence === 'number' ? t.sequence : undefined,
    durationEstimatedDays: typeof t.durationEstimatedDays === 'number' ? t.durationEstimatedDays : undefined,
  }));

  return {
    schema: TASKS_TO_AZURE_SCHEMA,
    azureDevOpsContext: {
      parentEpicWorkItemId,
      parentStoryJsonId: typeof story.id === 'string' ? story.id : undefined,
    },
    documentLevel,
    parentStory: storyWithoutTasks(story),
    siblingTasksSummary,
    dependencyTasksDetail,
    task,
  };
}

/**
 * Texto para o campo `Microsoft.VSTS.Common.AcceptanceCriteria` da User Story.
 *
 * TRÊS FORMAS ACEITAS, nesta ordem de precedência — todas observadas em artefatos reais:
 *   1. `story.acceptanceCriteria[]` de OBJETOS {id, statement}  → carrier canônico do schema
 *      v5.3 (o `id` entra como prefixo quando presente);
 *   2. `story.acceptanceCriteria[]` de STRINGS                  → forma abreviada;
 *   3. `story.businessSummary.storyAcceptanceCriteria[]`        → legado v5.0, mantido.
 *
 * DEFEITO CORRIGIDO: a versão original lia EXCLUSIVAMENTE a forma (3). Com o schema atual
 * emitindo (1), o campo AcceptanceCriteria saía VAZIO em 100% das stories — mesmo com 4
 * critérios bem escritos no JSON. Nada falhava na publicação: o work item era criado com o
 * campo em branco, e a única forma de notar era abrir o item no ADO.
 *
 * Retorna `undefined` apenas quando as TRÊS formas estão vazias (aí o campo não é enviado, em
 * vez de ser enviado em branco).
 * @param {Record<string, unknown>} story
 * @returns {string | undefined}
 */
function userStoryAcceptanceCriteriaText(story) {
  /** @param {unknown[]} list */
  const fromCanonical = (list) =>
    list
      .map((c) => {
        if (typeof c === 'string') return c.trim();
        if (!c || typeof c !== 'object' || Array.isArray(c)) return '';
        const entry = /** @type {Record<string, unknown>} */ (c);
        const st = typeof entry.statement === 'string' ? entry.statement.trim() : '';
        if (!st) return '';
        const cid = typeof entry.id === 'string' && entry.id.trim() ? `${entry.id.trim()} — ` : '';
        return `${cid}${st}`;
      })
      .filter(Boolean);

  let lines = Array.isArray(story.acceptanceCriteria) ? fromCanonical(story.acceptanceCriteria) : [];

  if (lines.length === 0) {
    const bs = asObject(story.businessSummary);
    const legacy = bs.storyAcceptanceCriteria;
    lines = Array.isArray(legacy) ? fromCanonical(legacy) : [];
  }

  if (lines.length === 0) return undefined;
  return lines.map((l) => `- ${l}`).join('\n');
}

/**
 * @param {{ pat: string, org: string, project: string }} config
 * @param {string} workItemType
 * @param {Array<Record<string, unknown>>} patchDocument
 */
export async function createWorkItem(config, workItemType, patchDocument) {
  try {
    return await createWorkItemOnce(config, workItemType, patchDocument);
  } catch (e) {
    // Processo sem StackRank (Scrum usa BacklogPriority; processo customizado pode não ter): avisa
    // uma vez, desliga o campo para o resto da publicação e cria o item sem ele. O PATCH do upsert
    // (`updateWorkItem`) faz o mesmo, com o mesmo aviso.
    const temStackRank = patchDocument.some((op) => op.path === `/fields/${STACK_RANK_FIELD}`);
    if (temStackRank && recusouStackRank(e)) {
      desligarStackRank(config);
      return createWorkItemOnce(config, workItemType, patchDocument.filter((op) => op.path !== `/fields/${STACK_RANK_FIELD}`));
    }
    throw e;
  }
}

async function createWorkItemOnce(config, workItemType, patchDocument) {
  const typeSegment = encodeURIComponent(`$${workItemType}`);
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/workitems/${typeSegment}?api-version=${API_VERSION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json-patch+json',
      Authorization: authorizationHeader(config.pat),
    },
    body: JSON.stringify(patchDocument),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { parseError: true, raw: text };
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : res.statusText) || 'Azure DevOps API error';
    throw new AzureDevOpsApiError(`${msg} (${res.status})`, res.status, text, url);
  }

  const id = data && typeof data.id === 'number' ? data.id : Number(data?.id);
  const itemUrl = typeof data?.url === 'string' ? data.url : '';
  if (!Number.isFinite(id)) {
    throw new AzureDevOpsApiError('Resposta sem id numérico de work item', res.status, text, url);
  }

  return { id, url: itemUrl, raw: data && typeof data === 'object' ? data : {} };
}

function parentRelationPatch(parentId, config) {
  const parentUrl = `https://dev.azure.com/${encodeURIComponent(config.org)}/_apis/wit/workitems/${parentId}`;
  return {
    op: 'add',
    path: '/relations/-',
    value: {
      rel: 'System.LinkTypes.Hierarchy-Reverse',
      url: parentUrl,
    },
  };
}

function logCreated(created, label) {
  console.error(`[Azure DevOps] ${label} criado: id=${created.id} url=${created.url || '(sem url)'}`);
}

// ---------------------------------------------------------------------------
// uiContext — attachment do screenshot (POST _apis/wit/attachments) + <img> na
// description. Modo degradado: arquivo ausente, rejeitado pela validação ou falha
// de upload → work item publicado/atualizado SEM imagem, com aviso no stderr
// (nunca bloqueia, nunca lança para o chamador).
// ---------------------------------------------------------------------------

/**
 * Diretório-base para resolver caminhos relativos de `uiContext.screenshot` — o diretório do
 * tasks.json, propagado pelo cli.mjs (paridade com o gêmeo spec-tasks-html/lib/render-html.mjs).
 * Antes disso o caminho era resolvido contra o cwd; como `npm run push` roda com cwd na pasta da
 * skill, um `outputs/spec/screens/TEL-001.png` nunca existia e o screenshot nunca era encontrado.
 */
let screenshotBaseDir = '';

/**
 * Define o diretório-base do screenshot (diretório do tasks.json).
 * @param {string | null | undefined} dir
 */
export function setScreenshotBaseDir(dir) {
  screenshotBaseDir = typeof dir === 'string' ? dir : '';
}

/** Extensões de imagem aceitas em uiContext.screenshot (mesmo mapa MIME do gêmeo render-html.mjs). */
const UI_SCREENSHOT_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/** Teto de tamanho do screenshot enviado ao ADO. */
const UI_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Cache de uploads já feitos nesta execução: chave `org/project|caminho absoluto` → attachment.
 * Evita re-upload do MESMO arquivo quando várias stories/tasks apontam para o mesmo screenshot.
 * @type {Map<string, { attachmentUrl: string, fileName: string }>}
 */
const uploadedAttachmentCache = new Map();

/**
 * Cache do GET `?$expand=relations` por work item: id → Map(fileName → url) ou null (falha de API).
 * Evita um GET por work item a cada `--change`.
 * @type {Map<string, Map<string, string> | null>}
 */
const attachedFileUrlsCache = new Map();

/** @param {{ org: string, project: string }} config @param {string} suffix */
function scopeKey(config, suffix) {
  return `${config.org}/${config.project}|${suffix}`;
}

/**
 * `abs` está contido em `root` (não escapa por `..`/symlink textual)?
 * @param {string} abs
 * @param {string} root
 */
function isInsideDir(abs, root) {
  const rel = relative(root, abs);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * Valida um arquivo antes de qualquer leitura de bytes. `uiContext.screenshot` é valor GERADO
 * POR LLM e o schema só exige `type: string` — sem estas checagens, um `"../../.env"` ou um
 * caminho absoluto subiria o arquivo para o Azure DevOps com a URL embutida na description.
 * Lança Error (o chamador degrada com aviso).
 * @param {string} absPath
 */
function assertSafeAttachmentFile(absPath) {
  const ext = extname(absPath).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(UI_SCREENSHOT_MIME, ext)) {
    throw new Error(
      `extensão "${ext || '(nenhuma)'}" não permitida para attachment (aceitas: ${Object.keys(UI_SCREENSHOT_MIME).join(', ')})`
    );
  }
  const st = statSync(absPath);
  if (!st.isFile()) throw new Error('caminho não é um arquivo comum');
  if (st.size > UI_SCREENSHOT_MAX_BYTES) {
    throw new Error(
      `arquivo com ${st.size} bytes excede o limite de ${UI_SCREENSHOT_MAX_BYTES} bytes (5 MB)`
    );
  }
}

/**
 * Resolve e VALIDA o caminho de `uiContext.screenshot`. Regras, nesta ordem:
 *   (a) allowlist de extensão (.png/.jpg/.jpeg/.gif/.webp);
 *   (b) caminho absoluto é rejeitado;
 *   (c) o caminho resolvido tem de estar CONTIDO no diretório-base (tasks.json, com fallback
 *       para o cwd) — bloqueia travessia por `..`;
 *   (d) cap de tamanho de 5 MB via statSync (em assertSafeAttachmentFile, antes do read).
 * Qualquer rejeição → aviso no stderr e `null` (modo degradado), nunca exceção.
 *
 * @param {unknown} shot  valor cru de uiContext.screenshot
 * @param {string} label  para o log (ex.: 'story:STORY-001')
 * @param {string} verbo  'publicado' | 'atualizado' (texto do aviso)
 * @returns {{ abs: string, fileName: string } | null}
 */
function resolveUiScreenshotFile(shot, label, verbo) {
  const raw = typeof shot === 'string' ? shot.trim() : '';
  if (!raw) return null;

  const ext = extname(raw).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(UI_SCREENSHOT_MIME, ext)) {
    console.error(
      `[Azure DevOps] aviso (${label}): uiContext.screenshot "${raw}" tem extensão não permitida ` +
      `(aceitas: ${Object.keys(UI_SCREENSHOT_MIME).join(', ')}) — ${verbo} sem imagem.`
    );
    return null;
  }

  // Caminho absoluto (POSIX ou Windows) nunca é aceito: só caminhos relativos ao tasks.json.
  if (isAbsolute(raw) || /^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('\\\\')) {
    console.error(
      `[Azure DevOps] aviso (${label}): uiContext.screenshot "${raw}" é caminho absoluto — só são ` +
      `aceitos caminhos relativos ao diretório do tasks.json — ${verbo} sem imagem.`
    );
    return null;
  }

  const roots = [...new Set(
    [screenshotBaseDir ? resolve(screenshotBaseDir) : '', resolve(process.cwd())].filter(Boolean)
  )];

  let escaped = false;
  for (const root of roots) {
    const abs = resolve(root, raw);
    if (!isInsideDir(abs, root)) { escaped = true; continue; }
    if (!existsSync(abs)) continue;
    return { abs, fileName: basename(abs) };
  }

  if (escaped) {
    console.error(
      `[Azure DevOps] aviso (${label}): uiContext.screenshot "${raw}" escapa do diretório do ` +
      `tasks.json (${roots.join(', ')}) — recusado por segurança — ${verbo} sem imagem.`
    );
  } else {
    console.error(
      `[Azure DevOps] aviso (${label}): screenshot do uiContext não encontrado ("${raw}"; ` +
      `procurado em: ${roots.join(', ')}) — ${verbo} sem imagem.`
    );
  }
  return null;
}

/**
 * Upload binário de um attachment do projeto. Valida o arquivo (extensão, tipo, tamanho)
 * ANTES de ler os bytes.
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/attachments/create
 * @param {{ pat: string, org: string, project: string }} config
 * @param {string} absPath  caminho absoluto do arquivo (já validado quanto a containment)
 * @param {string} fileName nome do arquivo no ADO (idempotência por fileName)
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function uploadAttachment(config, absPath, fileName) {
  assertSafeAttachmentFile(absPath);
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', Authorization: authorizationHeader(config.pat) },
    body: readFileSync(absPath),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok || typeof data?.url !== 'string') {
    const msg = (data && typeof data.message === 'string' ? data.message : res.statusText) || 'Attachment upload error';
    throw new AzureDevOpsApiError(`${msg} (${res.status})`, res.status, text, url);
  }
  return { id: typeof data.id === 'string' ? data.id : '', url: data.url };
}

/**
 * Attachments existentes de um work item (relations rel='AttachedFile'): Map fileName → url.
 * Usado para idempotência no modo _change (não re-anexar o mesmo fileName).
 *
 * IMPORTANTE — `null` significa FALHA DE API (401/429/500, resposta ilegível), NÃO "sem anexos":
 * antes, um Map vazio era devolvido nos dois casos e o chamador concluía "não há anexo" e
 * re-adicionava a relação AttachedFile, duplicando o anexo a cada `--change`. Com `null` o
 * chamador sabe que não pode decidir e não re-anexa.
 *
 * O resultado é cacheado por work item (um GET `?$expand=relations` por item por execução).
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} workItemId
 * @param {string} [label] rótulo para o aviso de stderr
 * @returns {Promise<Map<string, string> | null>} null = falha de API (indeterminado)
 */
export async function getAttachedFileUrls(config, workItemId, label = '') {
  const cacheKey = scopeKey(config, String(workItemId));
  if (attachedFileUrlsCache.has(cacheKey)) {
    return /** @type {Map<string, string> | null} */ (attachedFileUrlsCache.get(cacheKey));
  }
  const ctx = label ? ` (${label})` : '';
  const url = `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}/_apis/wit/workitems/${workItemId}?$expand=relations&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers: { Authorization: authorizationHeader(config.pat) } });
  const text = await res.text();
  if (!res.ok) {
    console.error(
      `[Azure DevOps] aviso${ctx}: não foi possível listar os anexos do work item #${workItemId} ` +
      `(HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}).`
    );
    attachedFileUrlsCache.set(cacheKey, null);
    return null;
  }
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error(`[Azure DevOps] aviso${ctx}: resposta ilegível ao listar anexos do work item #${workItemId}.`);
    attachedFileUrlsCache.set(cacheKey, null);
    return null;
  }
  /** @type {Map<string, string>} */
  const out = new Map();
  for (const r of Array.isArray(data?.relations) ? data.relations : []) {
    if (r?.rel === 'AttachedFile' && typeof r?.url === 'string') {
      const name = r?.attributes && typeof r.attributes.name === 'string' ? r.attributes.name : '';
      if (name && !out.has(name)) out.set(name, r.url);
    }
  }
  attachedFileUrlsCache.set(cacheKey, out);
  return out;
}

/** Op json-patch que vincula um attachment já enviado ao work item (relação AttachedFile). */
function attachedFilePatch(attachmentUrl, fileName) {
  return {
    op: 'add',
    path: '/relations/-',
    value: {
      rel: 'AttachedFile',
      url: attachmentUrl,
      attributes: { name: fileName, comment: 'uiContext: screenshot da tela' },
    },
  };
}

/**
 * Fragmento HTML do screenshot para a description (após upload do attachment).
 * @param {{ attachmentUrl: string, fileName: string } | null | undefined} shot
 */
function uiScreenshotImgHtml(shot) {
  if (!shot || typeof shot.attachmentUrl !== 'string' || !shot.attachmentUrl) return '';
  return `<h3><strong>Screenshot da tela</strong></h3><p><img src="${escapeHtml(shot.attachmentUrl)}" alt="${escapeHtml(shot.fileName || 'screenshot')}" /></p>`;
}

/**
 * Faz (ou reaproveita do cache) o upload de um screenshot já resolvido e validado.
 * @param {{ pat: string, org: string, project: string }} config
 * @param {{ abs: string, fileName: string }} file
 * @returns {Promise<{ attachmentUrl: string, fileName: string }>}
 */
async function uploadUiScreenshotCached(config, file) {
  const key = scopeKey(config, file.abs);
  const cached = uploadedAttachmentCache.get(key);
  if (cached) return cached;
  const up = await uploadAttachment(config, file.abs, file.fileName);
  const result = { attachmentUrl: up.url, fileName: file.fileName };
  uploadedAttachmentCache.set(key, result);
  return result;
}

/**
 * Resolve e envia o screenshot do uiContext ANTES da criação do work item.
 * O caminho (uiContext.screenshot, ex.: outputs/spec/screens/TEL-001.png) é resolvido contra o
 * diretório do tasks.json (setScreenshotBaseDir), com fallback para o cwd, e validado
 * (extensão, caminho relativo, containment, tamanho). Modo degradado: retorna null com aviso.
 * @param {{ pat: string, org: string, project: string }} config
 * @param {Record<string, unknown>} item  story/task com uiContext opcional
 * @param {string} label  para o log (ex.: 'story:STORY-001')
 * @returns {Promise<{ attachmentUrl: string, fileName: string } | null>}
 */
export async function prepareUiScreenshotAttachment(config, item, label) {
  const ui = asObject(item.uiContext);
  const file = resolveUiScreenshotFile(ui.screenshot, label, 'publicado');
  if (!file) return null;
  try {
    return await uploadUiScreenshotCached(config, file);
  } catch (e) {
    console.error(`[Azure DevOps] aviso (${label}): upload do screenshot falhou: ${e instanceof Error ? e.message : String(e)} — publicado sem imagem.`);
    return null;
  }
}

/**
 * Versão idempotente para UPDATE (modo _change): se o work item já tem attachment com o
 * mesmo fileName (relations AttachedFile), reutiliza a URL — NÃO re-anexa. Senão, faz o
 * upload e o PATCH da relação. Modo degradado idêntico ao prepareUiScreenshotAttachment.
 *
 * Se a listagem de anexos falhar (API indisponível/401/429/500), NÃO re-anexa — só avisa:
 * re-anexar "no escuro" duplicava o anexo a cada `--change`.
 *
 * @param {{ pat: string, org: string, project: string }} config
 * @param {number} workItemId
 * @param {Record<string, unknown>} item
 * @param {string} label
 * @returns {Promise<{ attachmentUrl: string, fileName: string } | null>}
 */
export async function ensureUiScreenshotAttachment(config, workItemId, item, label) {
  const ui = asObject(item.uiContext);
  const file = resolveUiScreenshotFile(ui.screenshot, label, 'atualizado');
  if (!file) return null;
  try {
    const existing = await getAttachedFileUrls(config, workItemId, label);
    if (existing === null) {
      console.error(
        `[Azure DevOps] aviso (${label}): anexos do work item #${workItemId} não puderam ser ` +
        `listados — o screenshot NÃO foi re-enviado (evita anexo duplicado) — atualizado sem imagem.`
      );
      return null;
    }
    if (existing.has(file.fileName)) {
      return { attachmentUrl: /** @type {string} */ (existing.get(file.fileName)), fileName: file.fileName };
    }
    const up = await uploadUiScreenshotCached(config, file);
    await updateWorkItem(config, workItemId, [attachedFilePatch(up.attachmentUrl, up.fileName)]);
    // Mantém o cache de relações coerente: o próximo item que consultar este work item já sabe.
    existing.set(up.fileName, up.attachmentUrl);
    return up;
  } catch (e) {
    console.error(`[Azure DevOps] aviso (${label}): attachment do screenshot falhou: ${e instanceof Error ? e.message : String(e)} — atualizado sem imagem.`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Description de Epic/Feature — composição ÚNICA usada por CREATE e UPDATE.
//
// `buildUpdatePatch` emite `op:'add'` em `/fields/System.Description`, o que SUBSTITUI o campo
// inteiro. Enquanto o update montava a description por conta própria (só summary/valueProposition),
// rodar `--change` num backlog já publicado APAGAVA a narrativa de Epic e Feature. As duas funções
// abaixo são o único lugar onde essa description é montada — create e update produzem o MESMO HTML.
// ---------------------------------------------------------------------------

/**
 * Description completa do Epic: narrativa v5.3 (buildEpicNarrativeHtml) + sumário executivo
 * (fallback quando não há narrativa) + payload JSON opcional.
 * @param {{ epic: Record<string, unknown>, title: string, summary?: string, fullPayload?: unknown }} args
 * @returns {string}
 */
export function buildEpicDescriptionHtml({ epic, title, summary, fullPayload }) {
  return buildDescriptionHtml(title, {
    // v5.3: narrativa de negócio do épico (narrative + outcomes + métricas + critérios).
    // Antes daqui só ia `summaryText`, alimentado por `epic.summary` — propriedade
    // inexistente no schema v5.3 — e o épico chegava ao ADO sem descrição.
    preJsonHtml: buildEpicNarrativeHtml(asObject(epic)),
    summaryText: summary,
    fullPayload,
    appendFullJson: true,
  });
}

/**
 * Description completa da Feature: narrativa v5.3 (buildFeatureNarrativeHtml) +
 * valueProposition/summary (legado v5.0, mantidos como fallback) + payload JSON opcional.
 * @param {{ feature: Record<string, unknown>, title: string, summary?: string, valueProposition?: string, fullPayload?: unknown, appendFullJson?: boolean }} args
 * @returns {string}
 */
export function buildFeatureDescriptionHtml({ feature, title, summary, valueProposition, fullPayload, appendFullJson }) {
  // Texto plano do tasks.json → HTML com parágrafos/quebras/listas (nunca injetar \n cru em campo HTML).
  const valuePropositionPara =
    typeof valueProposition === 'string' && valueProposition.trim()
      ? `<div style="font-style:italic;">${textToHtml(valueProposition)}</div>`
      : '';
  const summaryPara = textToHtml(summary);
  return buildDescriptionHtml(title, {
    // v5.3: narrativa da feature primeiro; valueProposition/summary são legado v5.0
    // (propriedades inexistentes no schema atual) e ficam como fallback.
    preJsonHtml: `${buildFeatureNarrativeHtml(asObject(feature))}${valuePropositionPara}${summaryPara}`,
    fullPayload,
    appendFullJson: appendFullJson === true,
  });
}

/**
 * Cria um Epic (uso manual; o fluxo tasks.json usa Epic pré-cadastrado).
 * `params.descriptionHtml` (vindo de buildEpicDescriptionHtml) tem precedência — é assim que
 * create e update compartilham exatamente a mesma composição.
 */
export async function createEpic(params) {
  const config = params.config ?? getAzureDevOpsConfigFromEnv();
  const pt = Array.isArray(params.pipelineTags) && params.pipelineTags.length > 0 ? params.pipelineTags : ['task-pipeline'];
  const tags = new Set([...(params.extraTags || []), ...pt, 'epic']);
  if (params.jsonId) tags.add(params.jsonId);
  { const lt = logicalIdTag(params.jsonId); if (lt) tags.add(lt); }

  const descriptionHtml =
    typeof params.descriptionHtml === 'string' && params.descriptionHtml.trim()
      ? params.descriptionHtml
      : buildDescriptionHtml(params.title, {
          preJsonHtml: typeof params.narrativeHtml === 'string' ? params.narrativeHtml : '',
          summaryText: params.summary,
          fullPayload: params.fullPayload,
          appendFullJson: true,
        });

  const patch = [
    { op: 'add', path: '/fields/System.Title', value: params.title },
    { op: 'add', path: '/fields/System.Description', value: descriptionHtml },
    { op: 'add', path: '/fields/System.Tags', value: [...tags].join('; ') },
    ...stackRankPatch(params.stackRank, config),
  ];

  const created = await createWorkItem(config, config.witEpic || 'Epic', patch);
  logCreated(created, 'Epic');
  return created;
}

export async function createFeature(params) {
  const config = params.config ?? getAzureDevOpsConfigFromEnv();
  const pt = Array.isArray(params.pipelineTags) && params.pipelineTags.length > 0 ? params.pipelineTags : ['task-pipeline'];
  const tags = new Set([...(params.extraTags || []), ...pt, 'feature']);
  if (params.jsonId) tags.add(params.jsonId);
  { const lt = logicalIdTag(params.jsonId); if (lt) tags.add(lt); }

  // Texto plano do tasks.json → HTML com parágrafos/quebras/listas (nunca injetar \n cru em campo HTML).
  const summaryPara = textToHtml(params.summary);
  const valuePropositionPara =
    typeof params.valueProposition === 'string' && params.valueProposition.trim()
      ? `<div style="font-style:italic;">${textToHtml(params.valueProposition)}</div>`
      : '';

  // params.descriptionHtml (buildFeatureDescriptionHtml) tem precedência — create e update
  // compartilham a mesma composição; o ramo abaixo é o fallback do uso manual desta função.
  const descriptionHtml =
    typeof params.descriptionHtml === 'string' && params.descriptionHtml.trim()
      ? params.descriptionHtml
      : buildDescriptionHtml(params.title, {
          preJsonHtml: `${typeof params.narrativeHtml === 'string' ? params.narrativeHtml : ''}${valuePropositionPara}${summaryPara}`,
          fullPayload: params.fullPayload,
          appendFullJson: params.appendFullJson === true,
        });

  const patch = [
    { op: 'add', path: '/fields/System.Title', value: params.title },
    { op: 'add', path: '/fields/System.Description', value: descriptionHtml },
    { op: 'add', path: '/fields/System.Tags', value: [...tags].join('; ') },
    ...stackRankPatch(params.stackRank, config),
  ];

  const pr = mapPriority(params.priority);
  if (pr !== undefined) {
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: pr });
  }

  patch.push(parentRelationPatch(params.parentEpicId, config));

  const wit = resolveWorkItemType(params.workItemType, config.witFeature || 'Feature', config);
  const witLabel = params.workItemType === 'ENABLER' ? 'Enabler' : 'Feature';
  const created = await createWorkItem(config, wit, patch);
  logCreated(created, witLabel);
  return created;
}

export async function createUserStory(params) {
  const config = params.config ?? getAzureDevOpsConfigFromEnv();
  const pt = Array.isArray(params.pipelineTags) && params.pipelineTags.length > 0 ? params.pipelineTags : ['task-pipeline'];
  const tags = new Set([...(params.extraTags || []), ...pt, 'user-story']);
  if (params.jsonId) tags.add(params.jsonId);
  { const lt = logicalIdTag(params.jsonId); if (lt) tags.add(lt); }

  // Texto plano do tasks.json → HTML com parágrafos/quebras/listas (nunca injetar \n cru em campo HTML).
  const summaryPara = textToHtml(params.summary);
  const storyNarrative =
    typeof params.storyNarrativeHtml === 'string' && params.storyNarrativeHtml.trim() !== ''
      ? params.storyNarrativeHtml
      : '';
  const preJson = `${summaryPara}${storyNarrative}${uiScreenshotImgHtml(params.uiScreenshot)}`;
  const appendFullJson = params.appendFullJson === true;

  const patch = [
    { op: 'add', path: '/fields/System.Title', value: params.title },
    {
      op: 'add',
      path: '/fields/System.Description',
      value: buildDescriptionHtml(params.title, {
        preJsonHtml: preJson,
        fullPayload: params.fullPayload,
        appendFullJson,
      }),
    },
    { op: 'add', path: '/fields/System.Tags', value: [...tags].join('; ') },
    ...stackRankPatch(params.stackRank, config),
  ];

  if (params.uiScreenshot && typeof params.uiScreenshot.attachmentUrl === 'string') {
    patch.push(attachedFilePatch(params.uiScreenshot.attachmentUrl, params.uiScreenshot.fileName));
  }

  const pr = mapPriority(params.priority);
  if (pr !== undefined) {
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: pr });
  }

  if (
    process.env.AZURE_DEVOPS_SKIP_STORY_ACCEPTANCE_CRITERIA !== '1' &&
    typeof params.acceptanceCriteriaText === 'string' &&
    params.acceptanceCriteriaText.trim() !== ''
  ) {
    patch.push({
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
      // O campo renderiza HTML: texto plano "- item\n- item" colapsaria em uma linha só.
      // textToHtml converte as linhas "- " em <ul><li> preservando as quebras.
      value: textToHtml(params.acceptanceCriteriaText),
    });
  }

  patch.push(parentRelationPatch(params.parentEpicId, config));

  const wit = resolveWorkItemType(params.workItemType, config.witUserStory || 'User Story', config);
  const witLabel = params.workItemType === 'ENABLER' ? 'Enabler' : params.workItemType === 'SPIKE' ? 'Spike' : params.workItemType === 'TECHNICAL_DEBT' ? 'Technical Debt' : params.workItemType === 'BUG' ? 'Bug' : 'User Story';
  const created = await createWorkItem(config, wit, patch);
  logCreated(created, witLabel);
  return created;
}

export async function createTask(params) {
  const config = params.config ?? getAzureDevOpsConfigFromEnv();
  const pt = Array.isArray(params.pipelineTags) && params.pipelineTags.length > 0 ? params.pipelineTags : ['task-pipeline'];
  const tags = new Set([...(params.extraTags || []), ...pt, 'task']);
  if (params.jsonId) tags.add(params.jsonId);
  { const lt = logicalIdTag(params.jsonId); if (lt) tags.add(lt); }

  const sid = typeof params.parentStoryJsonId === 'string' ? params.parentStoryJsonId : 'STORY';
  const narrative =
    params.taskRecord !== null && typeof params.taskRecord === 'object' && !Array.isArray(params.taskRecord)
      ? buildTaskNarrativeHtml(/** @type {Record<string, unknown>} */ (params.taskRecord), sid)
      : typeof params.summary === 'string' && params.summary.trim()
        ? textToHtml(params.summary) // texto plano → HTML (parágrafos/quebras/listas)
        : '';
  const appendFullJson = params.appendFullJson === true;
  const descriptionValue = buildDescriptionHtml(params.title, {
    preJsonHtml: `${narrative}${uiScreenshotImgHtml(params.uiScreenshot)}`,
    fullPayload: params.fullPayload,
    appendFullJson,
  });

  const patch = [
    { op: 'add', path: '/fields/System.Title', value: params.title },
    { op: 'add', path: '/fields/System.Description', value: descriptionValue },
    { op: 'add', path: '/fields/System.Tags', value: [...tags].join('; ') },
    ...stackRankPatch(params.stackRank, config),
  ];

  if (params.uiScreenshot && typeof params.uiScreenshot.attachmentUrl === 'string') {
    patch.push(attachedFilePatch(params.uiScreenshot.attachmentUrl, params.uiScreenshot.fileName));
  }

  const pr = mapPriority(params.priority);
  if (pr !== undefined) {
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: pr });
  }

  if (typeof params.durationEstimatedDays === 'number' && Number.isFinite(params.durationEstimatedDays)) {
    patch.push({
      op: 'add',
      path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate',
      value: params.durationEstimatedDays * 8,
    });
  }

  patch.push(parentRelationPatch(params.parentStoryId, config));

  const created = await createWorkItem(config, config.witTask || 'Task', patch);
  logCreated(created, 'Task');
  return created;
}

/**
 * Cria Features (se hierarquia ativa), User Stories e Tasks sob o Epic já existente.
 *
 * @param {Record<string, unknown>} json
 * @param {ReturnType<typeof getAzureDevOpsConfigFromEnv>} [config]
 * @param {{ baseDir?: string }} [opts]  baseDir = diretório do tasks.json (resolve uiContext.screenshot e é
 *   onde fica o registro das tags de regra de negócio que esta ferramenta põe, `ado-marcas-regra.json`)
 * @returns {Promise<{ parentEpicWorkItemId: number, features: Array<{ jsonId: string, adoId: number | null, title: string, stories: FullStructureStoryNode[] }>, stories: FullStructureStoryNode[], errors: Array<{ phase: string, message: string, cause?: unknown }> }>}
 */
export async function createFullStructure(json, config, opts = {}) {
  const cfg = config ?? getAzureDevOpsConfigFromEnv();
  if (typeof opts.baseDir === 'string' && opts.baseDir) setScreenshotBaseDir(opts.baseDir);

  // Epic global (fallback): pode ser null se criarmos epics dinâmicos
  let globalParentEpicId = null;
  try { globalParentEpicId = resolveParentEpicWorkItemId(json); } catch { /* sem epic global — ok */ }

  const pipelineTags = getPipelineWorkItemTags(json);
  // Ordem lógica de execução (order-backlog da spec-tasks): cria do primeiro ao último.
  const storiesIn = porOrdemDeExecucao(asObjectArray(json.stories));
  const featuresIn = porOrdemDeExecucao(asObjectArray(json.features));
  const epicsIn = porOrdemDeExecucao(asObjectArray(json.epics));
  const tagRegra = getBusinessRuleTag(json);
  /** A tag de regra de negócio do item, quando a spec-tasks o marcou. */
  const marca = (item) => (item.businessRuleHeavy === true ? [tagRegra] : []);
  const allTasksById = buildAllTasksById(storiesIn);
  const appendFullJson = process.env.AZURE_DEVOPS_APPEND_FULL_JSON_PAYLOAD === '1';
  const { caminho: registroPath, registro, projeto } = abrirRegistro(cfg, opts.baseDir);
  /** Item criado com a tag de regra de negócio: fica no registro (só desses ela sai depois). */
  const registrarSeMarcado = (item, adoId) => {
    if (item.businessRuleHeavy === true && typeof item.id === 'string') registrarMarca(registro, projeto, item.id, adoId, tagRegra);
  };
  // Base do StackRank: o maior já existente no projeto, lido antes de criar qualquer item.
  const base = await baseDoStackRank(cfg, [...epicsIn, ...featuresIn, ...storiesIn, ...storiesIn.flatMap((s) => asObjectArray(s.tasks))]);
  const rankDe = (item) => (base != null && temOrdemExec(item) ? base + item.executionOrder : undefined);

  const metadata = asObject(json.metadata);
  const backlogHierarchy = asObject(metadata.backlogHierarchy);
  const chosen = Array.isArray(backlogHierarchy.chosen) ? backlogHierarchy.chosen : [];
  // Detectar presença real — o JSON é a fonte de verdade
  const hasEpic = chosen.includes('epic') || epicsIn.length > 0;
  const hasFeature = chosen.includes('feature') || featuresIn.length > 0;

  const adoMeta = asObject(asObject(metadata.azureDevOps));
  const witTypes = asObject(asObject(adoMeta.workItemTypes));
  const publishFeature = asObject(witTypes.feature).publish !== false;

  /** @type {FullStructureStoryNode[]} */
  const stories = [];
  /** @type {Array<{ jsonId: string, adoId: number | null, title: string, stories: FullStructureStoryNode[] }>} */
  const features = [];
  /** @type {Array<{ jsonId: string, adoId: number | null, title: string }>} */
  const epics = [];
  /** @type {Array<{ phase: string, message: string, cause?: unknown }>} */
  const errors = [];
  const documentLevel = extractGlobalDocumentParts(json);

  // Map epic jsonId → ADO id criado/existente
  /** @type {Map<string, number | null>} */
  const epicAdoIdMap = new Map();
  /** Epics pré-existentes (azureDevOps.existingWorkItemId): podem ser predecessora, não ganham link. */
  /** @type {Map<string, number>} */
  const existentes = new Map();

  // --- Criar ou registrar Epics ---
  if (hasEpic && epicsIn.length > 0) {
    for (const epic of epicsIn) {
      const eid = typeof epic.id === 'string' ? epic.id : 'EPIC';
      const ename = typeof epic.name === 'string' ? epic.name : eid;
      const etitle = typeof epic.title === 'string' ? epic.title : `${eid}: ${ename}`;
      const esummary = typeof epic.executiveSummary === 'string' ? epic.executiveSummary
        : (typeof epic.summary === 'string' ? epic.summary : undefined);
      const epicAdoM = asObject(epic.azureDevOps);
      const existingRaw = epicAdoM.existingWorkItemId ?? epicAdoM.epicWorkItemId;
      const existingNum = typeof existingRaw === 'number' ? existingRaw
        : (typeof existingRaw === 'string' && existingRaw.trim() ? Number.parseInt(existingRaw, 10) : NaN);

      if (Number.isFinite(existingNum) && existingNum > 0) {
        // Epic já existe no ADO — usar como parent
        epicAdoIdMap.set(eid, existingNum);
        existentes.set(eid, existingNum);
        epics.push({ jsonId: eid, adoId: existingNum, title: etitle });
        continue;
      }

      const epicNode = { jsonId: eid, adoId: null, title: etitle };
      if (epicAdoM.publish !== false) {
        try {
          const etitleClamped = etitle.length > 256 ? `${etitle.slice(0, 253)}...` : etitle;
          const epicAdo = await createEpic({
            config: cfg, pipelineTags,
            title: etitleClamped,
            summary: esummary,
            descriptionHtml: buildEpicDescriptionHtml({
              epic, title: etitleClamped, summary: esummary,
              fullPayload: appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, epic } : undefined,
            }),
            fullPayload: appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, epic } : undefined,
            jsonId: eid,
            stackRank: rankDe(epic),
            extraTags: [`epic-json:${eid}`, ...marca(epic)],
          });
          epicNode.adoId = epicAdo.id;
          registrarSeMarcado(epic, epicAdo.id);
        } catch (ee) {
          errors.push({ phase: `epic:${eid}`, message: ee instanceof Error ? ee.message : String(ee), cause: ee });
        }
      }
      epicAdoIdMap.set(eid, epicNode.adoId);
      epics.push(epicNode);
    }
  } else if (globalParentEpicId) {
    epicAdoIdMap.set('__default__', globalParentEpicId);
  }

  // Resolver o epic pai padrão (fallback quando story não tem epicId)
  const defaultEpicAdoId = globalParentEpicId
    ?? [...epicAdoIdMap.values()].find(v => v != null)
    ?? (() => { throw new Error('Nenhum epic pai definido. Configure metadata.azureDevOps.epicWorkItemId ou AZURE_DEVOPS_EPIC_WORK_ITEM_ID.'); })();

  /** @type {Map<string, number | null>} */
  const featureAdoIdMap = new Map();

  // --- Criar Features (se hierarquia ativa e features presentes) ---
  if (hasFeature && featuresIn.length > 0 && publishFeature) {
    for (const feat of featuresIn) {
      const fid = typeof feat.id === 'string' ? feat.id : 'FEAT';
      const fname = typeof feat.name === 'string' ? feat.name : fid;
      const ftitle = typeof feat.title === 'string' ? feat.title : `${fid}: ${fname}`;
      const fsummary = typeof feat.summary === 'string' ? feat.summary : undefined;
      const fvalue = typeof feat.valueProposition === 'string' ? feat.valueProposition : undefined;
      const fpriority = typeof feat.priority === 'string' ? feat.priority : undefined;
      const featEpicId = typeof feat.epicId === 'string' ? feat.epicId : null;
      const featParentAdoId = (featEpicId && epicAdoIdMap.has(featEpicId) && epicAdoIdMap.get(featEpicId) != null)
        ? /** @type {number} */ (epicAdoIdMap.get(featEpicId))
        : defaultEpicAdoId;

      const featNode = { jsonId: fid, adoId: null, title: ftitle, stories: [] };
      const featAdoMeta = asObject(feat.azureDevOps);
      if (featAdoMeta.publish !== false) {
        try {
          const ftitleClamped = ftitle.length > 256 ? `${ftitle.slice(0, 253)}...` : ftitle;
          const featAdo = await createFeature({
            config: cfg, pipelineTags,
            parentEpicId: featParentAdoId,
            title: ftitleClamped,
            summary: fsummary, valueProposition: fvalue, appendFullJson,
            descriptionHtml: buildFeatureDescriptionHtml({
              feature: feat, title: ftitleClamped, summary: fsummary, valueProposition: fvalue,
              fullPayload: appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, feature: feat } : undefined,
              appendFullJson,
            }),
            fullPayload: appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, feature: feat } : undefined,
            priority: fpriority, jsonId: fid,
            workItemType: feat.workItemType,
            stackRank: rankDe(feat),
            extraTags: [`feature-json:${fid}`, `parent-epic:${featParentAdoId}`, ...marca(feat)],
          });
          featNode.adoId = featAdo.id;
          registrarSeMarcado(feat, featAdo.id);
        } catch (fe) {
          errors.push({ phase: `feature:${fid}`, message: fe instanceof Error ? fe.message : String(fe), cause: fe });
        }
      }
      featureAdoIdMap.set(fid, featNode.adoId);
      features.push(featNode);
    }
  }

  // --- Criar Stories e Tasks ---
  for (const story of storiesIn) {
    const sid = typeof story.id === 'string' ? story.id : 'STORY';
    const storyTitleBase = typeof story.name === 'string' ? story.name : sid;
    const storyTitle = `${sid}: ${storyTitleBase}`;
    const storySummary = typeof story.description === 'string' ? story.description : undefined;
    const priority = typeof story.priority === 'string' ? story.priority : undefined;

    // Resolver parent da story: Feature > Epic (por epicId da story) > default
    const storyFeatureId = typeof story.featureId === 'string' ? story.featureId : null;
    const storyEpicId = typeof story.epicId === 'string' ? story.epicId : null;
    let parentAdoId = defaultEpicAdoId;
    if (hasFeature && storyFeatureId && featureAdoIdMap.has(storyFeatureId)) {
      const fAdoId = featureAdoIdMap.get(storyFeatureId);
      if (fAdoId != null) parentAdoId = fAdoId;
    } else if (hasEpic && storyEpicId && epicAdoIdMap.has(storyEpicId)) {
      const eAdoId = epicAdoIdMap.get(storyEpicId);
      if (eAdoId != null) parentAdoId = eAdoId;
    }

    const storyNode = { jsonId: sid, adoId: null, title: storyTitle, tasks: [] };

    try {
      const storyShot = await prepareUiScreenshotAttachment(cfg, story, `story:${sid}`);
      const storyAdo = await createUserStory({
        config: cfg,
        pipelineTags,
        parentEpicId: parentAdoId,
        title: storyTitle.length > 256 ? `${storyTitle.slice(0, 253)}...` : storyTitle,
        summary: storySummary,
        storyNarrativeHtml: buildStoryNarrativeHtml(story),
        uiScreenshot: storyShot,
        appendFullJson,
        fullPayload: appendFullJson
          ? {
              schema: TASKS_TO_AZURE_SCHEMA,
              azureDevOpsContext: { defaultEpicAdoId, parentAdoId },
              documentLevel,
              story,
            }
          : undefined,
        acceptanceCriteriaText: userStoryAcceptanceCriteriaText(story),
        priority,
        jsonId: sid,
        workItemType: story.workItemType,
        stackRank: rankDe(story),
        extraTags: [
          `story-json:${sid}`,
          `parent-epic:${defaultEpicAdoId}`,
          ...(storyFeatureId ? [`parent-feature-json:${storyFeatureId}`] : []),
          ...(storyEpicId ? [`parent-epic-json:${storyEpicId}`] : []),
          ...marca(story),
        ],
      });
      storyNode.adoId = storyAdo.id;
      registrarSeMarcado(story, storyAdo.id);

      const tasks = porOrdemDeExecucao(asObjectArray(story.tasks));
      for (const task of tasks) {
        const tid = typeof task.id === 'string' ? task.id : 'TASK';
        const taskTitleBase = typeof task.title === 'string' ? task.title : tid;
        const taskTitle = `${tid}: ${taskTitleBase}`;
        const taskSummary = typeof task.description === 'string' ? task.description : undefined;
        const duration = typeof task.durationEstimatedDays === 'number' ? task.durationEstimatedDays : undefined;

        const taskNode = { jsonId: tid, adoId: null, title: taskTitle };

        try {
          const taskShot = await prepareUiScreenshotAttachment(cfg, task, `task:${tid}`);
          const taskAdo = await createTask({
            config: cfg,
            pipelineTags,
            parentStoryId: storyNode.adoId,
            parentStoryJsonId: sid,
            title: taskTitle.length > 256 ? `${taskTitle.slice(0, 253)}...` : taskTitle,
            summary: taskSummary,
            taskRecord: task,
            uiScreenshot: taskShot,
            appendFullJson,
            fullPayload: appendFullJson
              ? buildTaskFullPayload(task, story, documentLevel, defaultEpicAdoId, allTasksById)
              : undefined,
            priority: typeof task.priority === 'string' ? task.priority : priority,
            durationEstimatedDays: duration,
            jsonId: tid,
            stackRank: rankDe(task),
            extraTags: [
              `task-json:${tid}`,
              `story-json:${sid}`,
              `parent-epic:${defaultEpicAdoId}`,
              ...(storyFeatureId ? [`parent-feature-json:${storyFeatureId}`] : []),
              ...marca(task),
            ],
          });
          taskNode.adoId = taskAdo.id;
          registrarSeMarcado(task, taskAdo.id);
        } catch (te) {
          errors.push({ phase: `task:${tid}`, message: te instanceof Error ? te.message : String(te), cause: te });
        }
        storyNode.tasks.push(taskNode);
      }
    } catch (se) {
      errors.push({ phase: `story:${sid}`, message: se instanceof Error ? se.message : String(se), cause: se });
    }

    stories.push(storyNode);
  }

  // --- Links de dependência (Predecessora/Sucessora), depois que todos os itens têm ID no ADO ---
  /** @type {Map<string, number>} */
  const criados = new Map();
  for (const n of [...epics.filter((e) => !existentes.has(e.jsonId)), ...features, ...stories, ...stories.flatMap((s) => s.tasks)]) {
    if (n.adoId != null) criados.set(n.jsonId, n.adoId);
  }
  const conhecidos = new Map([...existentes, ...criados]);
  const fontes = [...epicsIn, ...featuresIn, ...storiesIn, ...storiesIn.flatMap((s) => asObjectArray(s.tasks))];
  const { dependencyLinks, warnings } = await ligarDependencias(cfg, fontes, criados, conhecidos, errors);
  gravarRegistro(registroPath, registro);

  return { defaultEpicAdoId, epics, features, stories, errors, dependencyLinks, warnings: [...warnings, ...(cfg.avisos ?? [])] };
}

/**
 * Para cada item com `dependencies[]`/`dependsOn[]`, o link de dependência no ADO: o dependente ganha
 * a predecessora. Só em item que esta publicação criou ou atualizou (`origem`) — item pré-existente
 * que a publicação não toca continua intocado. `jaLigados` evita link duplicado no upsert.
 *
 * @param {ReturnType<typeof getAzureDevOpsConfigFromEnv>} cfg
 * @param {Record<string, unknown>[]} fontes
 * @param {Map<string, number>} origem       itens que esta publicação criou/atualizou (podem ganhar link)
 * @param {Map<string, number>} conhecidos   todo ID lógico com work item conhecido (podem ser predecessora)
 * @param {Array<{ phase: string, message: string }>} errors
 * @param {(adoId: number) => Promise<Set<number>>} [jaLigados]
 */
async function ligarDependencias(cfg, fontes, origem, conhecidos, errors, jaLigados = null) {
  /** @type {Array<{ from: string, to: string, fromAdoId: number | null, toAdoId: number | null, linked: boolean }>} */
  const dependencyLinks = [];
  /** @type {string[]} */
  const warnings = [];
  for (const item of fontes) {
    const id = typeof item.id === 'string' ? item.id : null;
    if (!id || !origem.has(id)) continue;
    const deps = extractDependencyLogicalIds(item);
    if (!deps.length) continue;
    const fromAdoId = /** @type {number} */ (origem.get(id));
    const existentesNoItem = jaLigados ? await jaLigados(fromAdoId) : new Set();
    for (const dep of deps) {
      const toAdoId = conhecidos.get(dep) ?? null;
      if (toAdoId == null) {
        warnings.push(`${id} depende de ${dep}, que não tem work item conhecido nesta publicação — o link de dependência não foi criado.`);
        dependencyLinks.push({ from: id, to: dep, fromAdoId, toAdoId: null, linked: false });
        continue;
      }
      if (existentesNoItem.has(toAdoId)) { dependencyLinks.push({ from: id, to: dep, fromAdoId, toAdoId, linked: true }); continue; }
      try {
        await addDependencyLink(cfg, fromAdoId, toAdoId, `${id} depende de ${dep}`);
        dependencyLinks.push({ from: id, to: dep, fromAdoId, toAdoId, linked: true });
      } catch (le) {
        errors.push({ phase: `dependency:${id}->${dep}`, message: le instanceof Error ? le.message : String(le), cause: le });
        dependencyLinks.push({ from: id, to: dep, fromAdoId, toAdoId, linked: false });
      }
    }
  }
  return { dependencyLinks, warnings };
}

/**
 * MODO _change — UPSERT de work items.
 *
 * Para cada Epic/Feature/Story/Task do tasks.json (tipicamente um
 * `tasks-complementary_change-*.json` com metadata.changeMode === true):
 *   - se já existe no ADO (correlacionado por id-map → tag `logical-id:` → título legado) → PATCH
 *     (título, descrição, critérios, prioridade), preservando histórico e vínculos hierárquicos;
 *   - se não existe → cria (reutilizando o caminho create-only, que já grava a tag `logical-id:`).
 * Tasks de alteração/regressão (campos `regressionOf` / `relatedTasks`) recebem link `Related`
 * para o(s) work item(s) original(is) referenciado(s).
 *
 * Itens legados sem marcador e ausentes do id-map: a skill tenta o fallback por título; se ainda
 * assim não correlacionar, emite aviso acionável (preencher id-map.json) e cria como novo.
 *
 * O comportamento do modo normal NÃO passa por aqui — permanece em createFullStructure.
 *
 * @param {Record<string, unknown>} json
 * @param {{ config?: ReturnType<typeof getAzureDevOpsConfigFromEnv>, idMapPath?: string | null, baseDir?: string, reordenar?: boolean }} [opts]
 *   baseDir = diretório do tasks.json (resolve uiContext.screenshot e guarda o registro
 *   `ado-marcas-regra.json`); reordenar = --reordenar (permuta o StackRank dos itens que já existem)
 */
export async function createOrUpdateFullStructure(json, opts = {}) {
  const cfg = opts.config ?? getAzureDevOpsConfigFromEnv();
  if (typeof opts.baseDir === 'string' && opts.baseDir) setScreenshotBaseDir(opts.baseDir);
  const idMap = loadIdMap(opts.idMapPath ?? null);

  let globalParentEpicId = null;
  try { globalParentEpicId = resolveParentEpicWorkItemId(json); } catch { /* epic dinâmico/ausente — ok */ }

  const pipelineTags = getPipelineWorkItemTags(json);
  // Ordem lógica de execução (order-backlog da spec-tasks): cria do primeiro ao último.
  const storiesIn = porOrdemDeExecucao(asObjectArray(json.stories));
  const featuresIn = porOrdemDeExecucao(asObjectArray(json.features));
  const epicsIn = porOrdemDeExecucao(asObjectArray(json.epics));
  const tagRegra = getBusinessRuleTag(json);
  /** A tag de regra de negócio do item, quando a spec-tasks o marcou. */
  const marca = (item) => (item.businessRuleHeavy === true ? [tagRegra] : []);
  const allTasksById = buildAllTasksById(storiesIn);
  const appendFullJson = process.env.AZURE_DEVOPS_APPEND_FULL_JSON_PAYLOAD === '1';
  const documentLevel = extractGlobalDocumentParts(json);

  const metadata = asObject(json.metadata);
  const backlogHierarchy = asObject(metadata.backlogHierarchy);
  const chosen = Array.isArray(backlogHierarchy.chosen) ? backlogHierarchy.chosen : [];
  const hasEpic = chosen.includes('epic') || epicsIn.length > 0;
  const hasFeature = chosen.includes('feature') || featuresIn.length > 0;
  const adoMeta = asObject(asObject(metadata.azureDevOps));
  const witTypes = asObject(asObject(adoMeta.workItemTypes));
  const publishFeature = asObject(witTypes.feature).publish !== false;

  /** @type {Array<{ kind: string, jsonId: string, adoId: number | null, title: string, action: 'created' | 'updated', via?: string }>} */
  const created = [];
  /** @type {Array<{ kind: string, jsonId: string, adoId: number, title: string, via: string }>} */
  const updated = [];
  /** @type {Array<{ kind: string, jsonId: string, reason: string }>} */
  const skipped = [];
  /** @type {Array<{ phase: string, message: string, cause?: unknown }>} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {Array<{ from: string, to: string, fromAdoId: number | null, toAdoId: number | null, linked: boolean }>} */
  const relatedLinks = [];

  const reordenar = opts.reordenar === true;
  const { caminho: registroPath, registro, projeto } = abrirRegistro(cfg, opts.baseDir);
  const todosOsItens = [...epicsIn, ...featuresIn, ...storiesIn, ...storiesIn.flatMap((s) => asObjectArray(s.tasks))];
  // Base do StackRank: o maior já existente no projeto, lido antes de criar qualquer item.
  const base = await baseDoStackRank(cfg, todosOsItens);
  const rankDe = (item) => (base != null && temOrdemExec(item) ? base + item.executionOrder : undefined);
  /** StackRank novo dos itens que já existem — só com --reordenar (permuta, abaixo). */
  /** @type {Map<string, number>} */
  const novoRank = new Map();

  /**
   * UPDATE de um item que já existe, com as tags e a ordem:
   *   · a tag de regra de negócio entra quando o item é marcado; sai — só ela, sem diferenciar caixa —
   *     quando a spec-tasks o desmarcou E foi esta ferramenta que a pôs (registro em
   *     `ado-marcas-regra.json`). Tag posta à mão pelo time, com o mesmo nome, fica;
   *   · o StackRank só muda com --reordenar (o time pode ter reordenado o board à mão).
   * Depois do PATCH, o registro acompanha: esquece o que tirou; guarda o que a ferramenta pôs (a tag
   * não estava lá antes).
   */
  const atualizarItem = async (item, adoId, campos, ensure) => {
    const lid = typeof item.id === 'string' ? item.id : null;
    const daFerramenta = lid ? marcaDaFerramenta(registro, projeto, lid, adoId) : null;
    const remover = item.businessRuleHeavy === false && daFerramenta ? [daFerramenta.tag] : [];
    const r = await updateWorkItemMergingTags(cfg, adoId, {
      ...campos,
      ensureTags: [...new Set([...ensure, ...marca(item)])],
      ...(remover.length ? { removeTags: remover } : {}),
      ...(reordenar && lid && novoRank.has(lid) ? { stackRank: novoRank.get(lid) } : {}),
    });
    if (remover.length) esquecerMarca(registro, projeto, lid);
    else if (item.businessRuleHeavy === true && lid && !r.tagsAntes.some((t) => mesmaTag(t, tagRegra))) {
      registrarMarca(registro, projeto, lid, adoId, tagRegra);
    }
    return r;
  };

  // Marca um ID lógico → ADO id à medida que upsertamos (alimenta links Related deste mesmo arquivo).
  /** @type {Map<string, number>} */
  const resolvedAdoIds = new Map();

  /** Correlação ID lógico → work item, uma vez por item (a permuta do --reordenar a usa antes). */
  const correlacoes = new Map();
  const correlacionar = async (logicalId) => {
    if (!correlacoes.has(logicalId)) correlacoes.set(logicalId, await findExistingWorkItem(cfg, logicalId, idMap));
    return correlacoes.get(logicalId);
  };

  /**
   * Resolve um item: devolve { adoId, action }. action='updated' se PATCH, 'created' se POST.
   * Item criado com a tag de regra de negócio vai para o registro.
   * @param {string} kind  'epic' | 'feature' | 'story' | 'task'
   * @param {string} logicalId
   * @param {() => Promise<{ id: number }>} createFn
   * @param {(adoId: number) => Promise<void>} updateFn
   * @param {Record<string, unknown>} [item]
   */
  async function upsertItem(kind, logicalId, createFn, updateFn, item = null) {
    const existing = await correlacionar(logicalId);
    if (existing) {
      await updateFn(existing.adoId);
      resolvedAdoIds.set(logicalId, existing.adoId);
      return { adoId: existing.adoId, action: /** @type {const} */ ('updated'), via: existing.via };
    }
    const c = await createFn();
    resolvedAdoIds.set(logicalId, c.id);
    if (item?.businessRuleHeavy === true) registrarMarca(registro, projeto, logicalId, c.id, tagRegra);
    return { adoId: c.id, action: /** @type {const} */ ('created'), via: 'new' };
  }

  /**
   * --reordenar: os itens deste arquivo que já existem no ADO trocam de StackRank ENTRE SI — por
   * nível, os StackRank atuais deles (os «slots») são ordenados e redistribuídos na ordem calculada.
   * O conjunto de posições ocupadas não muda: nada colide com item de fora do arquivo, nada pula
   * para o topo ou para o fundo. Item sem StackRank atual vai para depois do maior (base +
   * executionOrder, como o item criado). Antes, `--reordenar` regravava 1…k e colidia com o resto.
   */
  if (reordenar && !cfg.semStackRank) {
    const epicPreExistente = (e) => {
      const m = asObject(e.azureDevOps);
      const raw = m.existingWorkItemId ?? m.epicWorkItemId;
      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() ? Number.parseInt(raw, 10) : NaN);
      return Number.isFinite(n) && n > 0;
    };
    const niveis = [
      hasEpic ? epicsIn.filter((e) => !epicPreExistente(e) && asObject(e.azureDevOps).publish !== false) : [],
      hasFeature && publishFeature ? featuresIn.filter((f) => asObject(f.azureDevOps).publish !== false) : [],
      storiesIn,
      storiesIn.flatMap((s) => asObjectArray(s.tasks)),
    ];
    /** @type {Array<{ nivel: number, item: Record<string, unknown>, adoId: number }>} */
    const jaExistem = [];
    for (const [nivel, lista] of niveis.entries()) {
      for (const item of lista) {
        if (!temOrdemExec(item) || typeof item.id !== 'string') continue;
        try {
          const e = await correlacionar(item.id);
          if (e) jaExistem.push({ nivel, item, adoId: e.adoId });
        } catch { /* a falha de correlação reaparece, como erro do item, no passo principal */ }
      }
    }
    let atuais = null;
    if (jaExistem.length) {
      try {
        atuais = await lerStackRanks(cfg, jaExistem.map((x) => x.adoId));
      } catch (e) {
        if (recusouStackRank(e)) desligarStackRank(cfg);
        else warnings.push(`--reordenar: não consegui ler o StackRank atual dos itens que já existem (${e instanceof Error ? e.message : String(e)}) — a ordem deles não foi regravada.`);
      }
    }
    if (atuais) {
      for (const nivel of niveis.keys()) {
        const doNivel = jaExistem.filter((x) => x.nivel === nivel).sort((a, b) => a.item.executionOrder - b.item.executionOrder);
        const comRank = doNivel.filter((x) => typeof atuais.get(x.adoId) === 'number');
        const slots = comRank.map((x) => atuais.get(x.adoId)).sort((a, b) => a - b);
        comRank.forEach((x, i) => novoRank.set(x.item.id, slots[i]));
        for (const x of doNivel) {
          if (typeof atuais.get(x.adoId) !== 'number' && base != null) novoRank.set(x.item.id, base + x.item.executionOrder);
        }
      }
    }
  }

  // --- Epics ---
  /** @type {Map<string, number | null>} */
  const epicAdoIdMap = new Map();
  if (hasEpic && epicsIn.length > 0) {
    for (const epic of epicsIn) {
      const eid = typeof epic.id === 'string' ? epic.id : 'EPIC';
      const ename = typeof epic.name === 'string' ? epic.name : eid;
      const etitle = typeof epic.title === 'string' ? epic.title : `${eid}: ${ename}`;
      const esummary = typeof epic.executiveSummary === 'string' ? epic.executiveSummary
        : (typeof epic.summary === 'string' ? epic.summary : undefined);
      const epicAdoM = asObject(epic.azureDevOps);
      const existingRaw = epicAdoM.existingWorkItemId ?? epicAdoM.epicWorkItemId;
      const existingNum = typeof existingRaw === 'number' ? existingRaw
        : (typeof existingRaw === 'string' && existingRaw.trim() ? Number.parseInt(existingRaw, 10) : NaN);
      if (Number.isFinite(existingNum) && existingNum > 0) {
        epicAdoIdMap.set(eid, existingNum);
        resolvedAdoIds.set(eid, existingNum);
        skipped.push({ kind: 'epic', jsonId: eid, reason: `Epic pré-existente (azureDevOps.existingWorkItemId=${existingNum}) — usado como parent, não modificado.` });
        continue;
      }
      if (epicAdoM.publish === false) { epicAdoIdMap.set(eid, null); continue; }
      const titleClamped = etitle.length > 256 ? `${etitle.slice(0, 253)}...` : etitle;
      const epicFullPayload = appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, epic } : undefined;
      // MESMA description em create e update (op:'add' em System.Description substitui o campo
      // inteiro — montar menos coisa no update apagava a narrativa do épico já publicado).
      const epicDescriptionHtml = buildEpicDescriptionHtml({
        epic, title: titleClamped, summary: esummary, fullPayload: epicFullPayload,
      });
      try {
        const r = await upsertItem('epic', eid,
          () => createEpic({ config: cfg, pipelineTags, title: titleClamped, summary: esummary,
            descriptionHtml: epicDescriptionHtml, fullPayload: epicFullPayload,
            jsonId: eid, stackRank: rankDe(epic), extraTags: [`epic-json:${eid}`, ...marca(epic)] }),
          (adoId) => atualizarItem(epic, adoId, {
            title: titleClamped,
            descriptionHtml: epicDescriptionHtml,
          }, [...pipelineTags, 'epic', `epic-json:${eid}`, `${LOGICAL_ID_TAG_PREFIX}${eid}`]).then(() => undefined),
          epic);
        epicAdoIdMap.set(eid, r.adoId);
        (r.action === 'updated' ? updated : created).push({ kind: 'epic', jsonId: eid, adoId: r.adoId, title: etitle, action: r.action, via: r.via });
      } catch (ee) {
        epicAdoIdMap.set(eid, null);
        errors.push({ phase: `epic:${eid}`, message: ee instanceof Error ? ee.message : String(ee), cause: ee });
      }
    }
  } else if (globalParentEpicId) {
    epicAdoIdMap.set('__default__', globalParentEpicId);
  }

  const defaultEpicAdoId = globalParentEpicId
    ?? [...epicAdoIdMap.values()].find(v => v != null)
    ?? (() => { throw new Error('Nenhum epic pai definido. Configure metadata.azureDevOps.epicWorkItemId ou AZURE_DEVOPS_EPIC_WORK_ITEM_ID.'); })();

  // --- Features ---
  /** @type {Map<string, number | null>} */
  const featureAdoIdMap = new Map();
  if (hasFeature && featuresIn.length > 0 && publishFeature) {
    for (const feat of featuresIn) {
      const fid = typeof feat.id === 'string' ? feat.id : 'FEAT';
      const fname = typeof feat.name === 'string' ? feat.name : fid;
      const ftitle = typeof feat.title === 'string' ? feat.title : `${fid}: ${fname}`;
      const fsummary = typeof feat.summary === 'string' ? feat.summary : undefined;
      const fvalue = typeof feat.valueProposition === 'string' ? feat.valueProposition : undefined;
      const fpriority = typeof feat.priority === 'string' ? feat.priority : undefined;
      const featEpicId = typeof feat.epicId === 'string' ? feat.epicId : null;
      const featParentAdoId = (featEpicId && epicAdoIdMap.get(featEpicId) != null)
        ? /** @type {number} */ (epicAdoIdMap.get(featEpicId)) : defaultEpicAdoId;
      const featAdoMeta = asObject(feat.azureDevOps);
      if (featAdoMeta.publish === false) { featureAdoIdMap.set(fid, null); continue; }
      const titleClamped = ftitle.length > 256 ? `${ftitle.slice(0, 253)}...` : ftitle;
      const featFullPayload = appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, feature: feat } : undefined;
      // MESMA description em create e update (o update montava só valueProposition+summary e,
      // como o PATCH substitui System.Description inteiro, apagava a narrativa da feature).
      const featDescriptionHtml = buildFeatureDescriptionHtml({
        feature: feat, title: titleClamped, summary: fsummary, valueProposition: fvalue,
        fullPayload: featFullPayload, appendFullJson,
      });
      try {
        const r = await upsertItem('feature', fid,
          () => createFeature({ config: cfg, pipelineTags, parentEpicId: featParentAdoId, title: titleClamped,
            summary: fsummary, valueProposition: fvalue, appendFullJson,
            descriptionHtml: featDescriptionHtml, fullPayload: featFullPayload,
            priority: fpriority, jsonId: fid, workItemType: feat.workItemType, stackRank: rankDe(feat),
            extraTags: [`feature-json:${fid}`, `parent-epic:${featParentAdoId}`, ...marca(feat)] }),
          (adoId) => atualizarItem(feat, adoId, {
            title: titleClamped,
            descriptionHtml: featDescriptionHtml,
            priority: mapPriority(fpriority),
          }, [...pipelineTags, 'feature', `feature-json:${fid}`, `${LOGICAL_ID_TAG_PREFIX}${fid}`]).then(() => undefined),
          feat);
        featureAdoIdMap.set(fid, r.adoId);
        (r.action === 'updated' ? updated : created).push({ kind: 'feature', jsonId: fid, adoId: r.adoId, title: ftitle, action: r.action, via: r.via });
      } catch (fe) {
        featureAdoIdMap.set(fid, null);
        errors.push({ phase: `feature:${fid}`, message: fe instanceof Error ? fe.message : String(fe), cause: fe });
      }
    }
  }

  // --- Stories + Tasks ---
  for (const story of storiesIn) {
    const sid = typeof story.id === 'string' ? story.id : 'STORY';
    const storyTitleBase = typeof story.name === 'string' ? story.name : sid;
    const storyTitle = `${sid}: ${storyTitleBase}`;
    const storyTitleClamped = storyTitle.length > 256 ? `${storyTitle.slice(0, 253)}...` : storyTitle;
    const storySummary = typeof story.description === 'string' ? story.description : undefined;
    const priority = typeof story.priority === 'string' ? story.priority : undefined;
    const storyFeatureId = typeof story.featureId === 'string' ? story.featureId : null;
    const storyEpicId = typeof story.epicId === 'string' ? story.epicId : null;
    let parentAdoId = defaultEpicAdoId;
    if (hasFeature && storyFeatureId && featureAdoIdMap.get(storyFeatureId) != null) parentAdoId = /** @type {number} */ (featureAdoIdMap.get(storyFeatureId));
    else if (hasEpic && storyEpicId && epicAdoIdMap.get(storyEpicId) != null) parentAdoId = /** @type {number} */ (epicAdoIdMap.get(storyEpicId));

    // Texto plano do tasks.json → HTML com parágrafos/quebras/listas (paridade com createUserStory).
    const summaryPara = textToHtml(storySummary);
    const storyExtraTags = [`story-json:${sid}`, `parent-epic:${defaultEpicAdoId}`,
      ...(storyFeatureId ? [`parent-feature-json:${storyFeatureId}`] : []),
      ...(storyEpicId ? [`parent-epic-json:${storyEpicId}`] : [])];

    let storyAdoId = null;
    try {
      const r = await upsertItem('story', sid,
        async () => {
          const storyShot = await prepareUiScreenshotAttachment(cfg, story, `story:${sid}`);
          return createUserStory({ config: cfg, pipelineTags, parentEpicId: parentAdoId, title: storyTitleClamped,
            summary: storySummary, storyNarrativeHtml: buildStoryNarrativeHtml(story), uiScreenshot: storyShot, appendFullJson,
            fullPayload: appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, azureDevOpsContext: { defaultEpicAdoId, parentAdoId }, documentLevel, story } : undefined,
            acceptanceCriteriaText: userStoryAcceptanceCriteriaText(story), priority, jsonId: sid, workItemType: story.workItemType,
            stackRank: rankDe(story), extraTags: [...storyExtraTags, ...marca(story)] });
        },
        async (adoId) => {
          const storyShot = await ensureUiScreenshotAttachment(cfg, adoId, story, `story:${sid}`);
          await atualizarItem(story, adoId, {
            title: storyTitleClamped,
            descriptionHtml: buildDescriptionHtml(storyTitleClamped, { preJsonHtml: `${summaryPara}${buildStoryNarrativeHtml(story)}${uiScreenshotImgHtml(storyShot)}`,
              fullPayload: appendFullJson ? { schema: TASKS_TO_AZURE_SCHEMA, azureDevOpsContext: { defaultEpicAdoId, parentAdoId }, documentLevel, story } : undefined, appendFullJson }),
            acceptanceCriteriaText: userStoryAcceptanceCriteriaText(story),
            priority: mapPriority(priority),
          }, [...pipelineTags, 'user-story', ...storyExtraTags, `${LOGICAL_ID_TAG_PREFIX}${sid}`]);
        },
        story);
      storyAdoId = r.adoId;
      (r.action === 'updated' ? updated : created).push({ kind: 'story', jsonId: sid, adoId: r.adoId, title: storyTitle, action: r.action, via: r.via });

      for (const task of porOrdemDeExecucao(asObjectArray(story.tasks))) {
        const tid = typeof task.id === 'string' ? task.id : 'TASK';
        const taskTitleBase = typeof task.title === 'string' ? task.title : tid;
        const taskTitle = `${tid}: ${taskTitleBase}`;
        const taskTitleClamped = taskTitle.length > 256 ? `${taskTitle.slice(0, 253)}...` : taskTitle;
        const taskSummary = typeof task.description === 'string' ? task.description : undefined;
        const duration = typeof task.durationEstimatedDays === 'number' ? task.durationEstimatedDays : undefined;
        const taskPriority = typeof task.priority === 'string' ? task.priority : priority;
        const taskExtraTags = [`task-json:${tid}`, `story-json:${sid}`, `parent-epic:${defaultEpicAdoId}`,
          ...(storyFeatureId ? [`parent-feature-json:${storyFeatureId}`] : [])];
        const taskNarrative = buildTaskNarrativeHtml(task, sid);

        try {
          const tr = await upsertItem('task', tid,
            async () => {
              const taskShot = await prepareUiScreenshotAttachment(cfg, task, `task:${tid}`);
              return createTask({ config: cfg, pipelineTags, parentStoryId: storyAdoId, parentStoryJsonId: sid,
                title: taskTitleClamped, summary: taskSummary, taskRecord: task, uiScreenshot: taskShot, appendFullJson,
                fullPayload: appendFullJson ? buildTaskFullPayload(task, story, documentLevel, defaultEpicAdoId, allTasksById) : undefined,
                priority: taskPriority, durationEstimatedDays: duration, jsonId: tid,
                stackRank: rankDe(task), extraTags: [...taskExtraTags, ...marca(task)] });
            },
            async (adoId) => {
              const taskShot = await ensureUiScreenshotAttachment(cfg, adoId, task, `task:${tid}`);
              await atualizarItem(task, adoId, {
                title: taskTitleClamped,
                descriptionHtml: buildDescriptionHtml(taskTitleClamped, { preJsonHtml: `${taskNarrative}${uiScreenshotImgHtml(taskShot)}`,
                  fullPayload: appendFullJson ? buildTaskFullPayload(task, story, documentLevel, defaultEpicAdoId, allTasksById) : undefined, appendFullJson }),
                priority: mapPriority(taskPriority),
              }, [...pipelineTags, 'task', ...taskExtraTags, `${LOGICAL_ID_TAG_PREFIX}${tid}`]);
            },
            task);
          (tr.action === 'updated' ? updated : created).push({ kind: 'task', jsonId: tid, adoId: tr.adoId, title: taskTitle, action: tr.action, via: tr.via });

          // Link Related para tasks de alteração/regressão
          const relatedLogicalIds = extractRelatedLogicalIds(task);
          if (relatedLogicalIds.length > 0) {
            let alreadyLinked = null;
            for (const relId of relatedLogicalIds) {
              let targetAdoId = resolvedAdoIds.get(relId) ?? null;
              if (targetAdoId == null) {
                const found = await findExistingWorkItem(cfg, relId, idMap);
                targetAdoId = found ? found.adoId : null;
              }
              if (targetAdoId == null) {
                warnings.push(`Task ${tid}: não foi possível correlacionar a task original "${relId}" (regressionOf/relatedTasks) a um work item do ADO. Adicione "${relId}": <id> ao id-map.json e rode novamente para criar o link Related. O work item de ${tid} foi ${tr.action === 'updated' ? 'atualizado' : 'criado'} sem o link.`);
                relatedLinks.push({ from: tid, to: relId, fromAdoId: tr.adoId, toAdoId: null, linked: false });
                continue;
              }
              try {
                if (alreadyLinked == null) alreadyLinked = await getRelatedIds(cfg, tr.adoId);
                if (alreadyLinked.has(targetAdoId)) {
                  relatedLinks.push({ from: tid, to: relId, fromAdoId: tr.adoId, toAdoId: targetAdoId, linked: true });
                } else {
                  await addRelatedLink(cfg, tr.adoId, targetAdoId, `scope-change: ${tid} relacionado a ${relId}`);
                  alreadyLinked.add(targetAdoId);
                  relatedLinks.push({ from: tid, to: relId, fromAdoId: tr.adoId, toAdoId: targetAdoId, linked: true });
                }
              } catch (le) {
                errors.push({ phase: `related:${tid}->${relId}`, message: le instanceof Error ? le.message : String(le), cause: le });
                relatedLinks.push({ from: tid, to: relId, fromAdoId: tr.adoId, toAdoId: targetAdoId, linked: false });
              }
            }
          }
        } catch (te) {
          errors.push({ phase: `task:${tid}`, message: te instanceof Error ? te.message : String(te), cause: te });
        }
      }
    } catch (se) {
      errors.push({ phase: `story:${sid}`, message: se instanceof Error ? se.message : String(se), cause: se });
    }
  }

  // --- Links de dependência: só em item que esta publicação criou ou atualizou; predecessora
  // conhecida neste arquivo ou correlacionável no ADO (id-map → tag → título) ---
  const preExistentes = new Set(skipped.filter((s) => s.kind === 'epic').map((s) => s.jsonId));
  const origem = new Map([...resolvedAdoIds].filter(([id]) => !preExistentes.has(id)));
  const fontes = [...epicsIn, ...featuresIn, ...storiesIn, ...storiesIn.flatMap((s) => asObjectArray(s.tasks))];
  const conhecidos = new Map(resolvedAdoIds);
  for (const dep of new Set(fontes.filter((f) => origem.has(f.id)).flatMap((f) => extractDependencyLogicalIds(f)))) {
    if (conhecidos.has(dep)) continue;
    try {
      const found = await findExistingWorkItem(cfg, dep, idMap);
      if (found) conhecidos.set(dep, found.adoId);
    } catch { /* sem correlação: o aviso sai em ligarDependencias */ }
  }
  const ligacoes = await ligarDependencias(cfg, fontes, origem, conhecidos, errors, (adoId) => getLinkedIds(cfg, adoId, DEPENDENCY_LINK));
  warnings.push(...ligacoes.warnings, ...(cfg.avisos ?? []));
  gravarRegistro(registroPath, registro);

  return { mode: 'change', defaultEpicAdoId, created, updated, skipped, relatedLinks, dependencyLinks: ligacoes.dependencyLinks, warnings, errors };
}

/**
 * @typedef {Object} FullStructureTaskNode
 * @property {string} jsonId
 * @property {number | null} adoId
 * @property {string} title
 */

/**
 * @typedef {Object} FullStructureStoryNode
 * @property {string} jsonId
 * @property {number | null} adoId
 * @property {string} title
 * @property {FullStructureTaskNode[]} tasks
 */

/**
 * @typedef {Object} FullStructureFeatureNode
 * @property {string} jsonId
 * @property {number | null} adoId
 * @property {string} title
 * @property {FullStructureStoryNode[]} stories
 */

const entryScript = process.argv[1] ? resolve(process.argv[1]) : '';
const thisFile = fileURLToPath(import.meta.url);
const ranAsMain = entryScript !== '' && entryScript === thisFile;

if (ranAsMain) {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Uso: node azureDevopsService.js <caminho/tasks.json>');
    console.error('Requer: metadata.azureDevOps.epicWorkItemId, AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT.');
    process.exit(1);
  }
  try {
    const raw = readFileSync(jsonPath, 'utf8');
    const doc = JSON.parse(raw);
    // baseDir = diretório do tasks.json (resolve uiContext.screenshot), igual ao cli.mjs.
    const result = await createFullStructure(doc, undefined, { baseDir: dirname(resolve(jsonPath)) });
    const printable = {
      defaultEpicAdoId: result.defaultEpicAdoId,
      epics: result.epics,
      features: result.features,
      stories: result.stories,
      errors: result.errors.map(({ phase, message }) => ({ phase, message })),
    };
    console.log(JSON.stringify(printable, null, 2));
    if (result.errors.length > 0) {
      console.error(`Concluído com ${result.errors.length} erro(s). Ver campo "errors" no JSON acima.`);
      process.exit(2);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
