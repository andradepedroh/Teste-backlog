/**
 * Plano de publicação (`--dry-run`) — o que o cli.mjs criaria ou atualizaria no Azure DevOps,
 * calculado só a partir do tasks.json.
 *
 * Por que existe: publicar cria work items que não se apagam com um comando, e a Camada J da
 * `security.md` exige confirmação humana antes de escrita irreversível. Confirmação só vale se a
 * pessoa viu o que vai acontecer — este módulo monta essa visão SEM rede: não importa o
 * azureDevopsService.js nem o azure-upsert.mjs, não lê o PAT e não chama `fetch`.
 *
 * ESPELHA (não importa) a lógica do azureDevopsService.js: resolveWorkItemType, título com corte
 * em 256, tags de criação, resolução do pai e a ordem de criação (epics → features → cada story
 * seguida das suas tasks). Mudou lá, muda aqui — o teste de paridade em
 * `.claude/hooks/tasks-azure-dry-run.test.mjs` roda o createFullStructure com `fetch` falso e fica
 * vermelho se a lista de "criar" divergir em ordem, WIT, título ou tags.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { marcaDaFerramenta, NOME_REGISTRO } from './marcas-regra.mjs';

const LOGICAL_ID_TAG_PREFIX = 'logical-id:';
const TITLE_MAX = 256;

/** @param {unknown} v @returns {Record<string, unknown>} */
function asObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/** @param {unknown} v @returns {Record<string, unknown>[]} */
function asObjectArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== null && typeof x === 'object' && !Array.isArray(x)).map((x) => /** @type {Record<string, unknown>} */ (x));
}

/** @param {string} t */
function clampTitle(t) {
  return t.length > TITLE_MAX ? `${t.slice(0, 253)}...` : t;
}

/**
 * Mesmo critério do `isChangeMode` de lib/azure-upsert.mjs (que não pode ser importado aqui: ele
 * carrega o azureDevopsService.js). O teste de paridade compara as duas.
 * @param {Record<string, unknown>} doc
 * @param {boolean} [cliChangeFlag]
 */
export function isChangeModeDoc(doc, cliChangeFlag = false) {
  if (cliChangeFlag) return true;
  const metadata = doc && typeof doc === 'object' ? doc.metadata : null;
  return !!(metadata && typeof metadata === 'object' && /** @type {Record<string, unknown>} */ (metadata).changeMode === true);
}

/**
 * Lê o id-map.json sem carregar o azure-upsert.mjs. Mesmo formato e mesma tolerância do
 * `loadIdMap` de lá: chaves vazias e valores não numéricos são ignorados.
 * @param {string | null | undefined} filePath
 * @returns {Map<string, number>}
 */
export function readIdMap(filePath) {
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

/** @param {NodeJS.ProcessEnv} env */
function witConfig(env) {
  return {
    witEpic: env.AZURE_DEVOPS_WIT_EPIC || 'Epic',
    witFeature: env.AZURE_DEVOPS_WIT_FEATURE || 'Feature',
    witUserStory: env.AZURE_DEVOPS_WIT_USER_STORY || 'User Story',
    witTask: env.AZURE_DEVOPS_WIT_TASK || 'Task',
    witEnabler: env.AZURE_DEVOPS_WIT_ENABLER || undefined,
    witSpike: env.AZURE_DEVOPS_WIT_SPIKE || undefined,
    witTechnicalDebt: env.AZURE_DEVOPS_WIT_TECHNICAL_DEBT || undefined,
    witBug: env.AZURE_DEVOPS_WIT_BUG || undefined,
  };
}

/**
 * Espelho de `resolveWorkItemType` (azureDevopsService.js).
 * @param {unknown} workItemType
 * @param {string} defaultWit
 * @param {ReturnType<typeof witConfig>} cfg
 */
function resolveWit(workItemType, defaultWit, cfg) {
  if (!workItemType || workItemType === 'USER_STORY') return defaultWit;
  switch (workItemType) {
    case 'ENABLER': return cfg.witEnabler || 'User Story';
    case 'SPIKE': return cfg.witSpike || 'User Story';
    case 'TECHNICAL_DEBT': return cfg.witTechnicalDebt || 'User Story';
    case 'BUG': return cfg.witBug || 'Bug';
    default: return defaultWit;
  }
}

/** Espelho de `getBusinessRuleTag`. @param {Record<string, unknown>} doc */
function businessRuleTagOf(doc) {
  const raw = asObject(asObject(doc.metadata).azureDevOps).businessRuleTag;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'regra-de-negocio';
}

/** Espelho de `porOrdemDeExecucao`: `executionOrder` primeiro; sem ele, a posição do array. */
function porOrdem(lista) {
  return lista
    .map((x, i) => ({ x, i, o: typeof x.executionOrder === 'number' && Number.isFinite(x.executionOrder) ? x.executionOrder : Infinity }))
    .sort((a, b) => a.o - b.o || a.i - b.i)
    .map(({ x }) => x);
}

/** Espelho de `extractDependencyLogicalIds` (azure-upsert.mjs). */
function dependenciasDe(item) {
  const out = [];
  for (const k of ['dependencies', 'dependsOn']) {
    for (const x of Array.isArray(item?.[k]) ? item[k] : []) if (typeof x === 'string' && x.trim()) out.push(x.trim());
  }
  return [...new Set(out)];
}

/** Espelho de `getPipelineWorkItemTags`. @param {Record<string, unknown>} doc */
function pipelineTagsOf(doc) {
  const ado = asObject(asObject(doc.metadata).azureDevOps);
  const raw = ado.workItemTags ?? ado.pipelineTags;
  if (Array.isArray(raw)) {
    return raw.filter((t) => typeof t === 'string').map((x) => x.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  }
  return ['task-pipeline'];
}

/**
 * Espelho de `resolveParentEpicWorkItemId`, com a mesma tolerância do chamador: lá o erro é
 * engolido (`try { … } catch {}`) e o Epic global vira "ausente".
 * @param {Record<string, unknown>} doc
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ id: number, origem: string } | null}
 */
function globalParentEpic(doc, env) {
  const envRaw = env.AZURE_DEVOPS_EPIC_WORK_ITEM_ID;
  if (envRaw != null && String(envRaw).trim() !== '') {
    const n = Number.parseInt(String(envRaw).trim(), 10);
    return Number.isFinite(n) && n > 0 ? { id: n, origem: 'AZURE_DEVOPS_EPIC_WORK_ITEM_ID' } : null;
  }
  const ado = asObject(asObject(doc.metadata).azureDevOps);
  const raw = ado.epicWorkItemId ?? ado.workItemId;
  const n = typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : typeof raw === 'string' ? Number.parseInt(raw.trim(), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? { id: n, origem: 'metadata.azureDevOps.epicWorkItemId' } : null;
}

/**
 * Referência a um work item no plano: número quando ele já existe no ADO, `<novo:ID>` quando só
 * vai existir depois da publicação.
 * @typedef {number | string} AdoRef
 */

/** @param {string} logicalId @returns {string} */
const novo = (logicalId) => `<novo:${logicalId}>`;

/**
 * @typedef {Object} PlanItem
 * @property {number} ordem            posição na sequência de chamadas da publicação (1, 2, …)
 * @property {'epic'|'feature'|'story'|'task'} nivel
 * @property {string} id               ID lógico do tasks.json
 * @property {string} titulo           título que vai para System.Title
 * @property {string} wit              Work Item Type
 * @property {'criar'|'atualizar'|'criar-ou-atualizar'|'usar-existente'|'nao-publicar'} acao
 * @property {AdoRef | null} pai       work item pai (Hierarchy-Reverse); null para Epic
 * @property {string[]} tags           tags gravadas se o item for CRIADO
 * @property {string[]} [tagsNaAtualizacao]  modo _change: tags garantidas se o item for ATUALIZADO (somadas às que já existem)
 * @property {Array<{ tipo: string, para: string }>} [links]  modo _change: links Related de regressionOf/relatedTasks
 * @property {number} [stackRankSoma]  na criação, Microsoft.VSTS.Common.StackRank = (maior StackRank já existente
 *                                     no projeto, lido só na publicação) + este número (o executionOrder da spec-tasks)
 * @property {{ regra: 'permuta', posicao: number }} [stackRankNaAtualizacao]  modo _change com --reordenar: se o
 *                                     item já existe, ele troca de StackRank com os outros itens do arquivo que já
 *                                     existem, no mesmo nível (permuta entre os slots atuais), na posição dada; sem
 *                                     StackRank atual, vai para depois do maior
 * @property {string[]} [tagsRemovidasNaAtualizacao]  modo _change: a tag de regra de negócio sai do item que foi
 *                                     desmarcado — só se foi esta ferramenta que a pôs (registro ado-marcas-regra.json)
 * @property {Array<{ tipo: string, para: string, nota?: string }>} [dependencias]  links de dependência (o item ganha a predecessora)
 * @property {string} [nota]
 */

/**
 * Monta o plano de publicação. Função pura: não lê arquivo, não fala com a rede.
 *
 * @param {Record<string, unknown>} doc  tasks.json já carregado por loadTasksDocument (com `name` normalizado)
 * @param {{ changeMode?: boolean, reordenar?: boolean, idMap?: Map<string, number>, env?: NodeJS.ProcessEnv,
 *   marcas?: ReturnType<typeof import('./marcas-regra.mjs').lerRegistro>, projeto?: string | null }} [opts]
 *   `marcas` = o registro das tags que a ferramenta pôs (lido pelo chamador); `projeto` = `<org>/<projeto>`
 * @returns {{ modo: 'normal' | 'change', epicPai: { id: AdoRef, origem: string } | null, itens: PlanItem[], resumo: Record<string, Record<string, number>>, erros: string[] }}
 */
export function buildPublishPlan(doc, opts = {}) {
  const changeMode = opts.changeMode === true;
  const reordenar = opts.reordenar === true;
  const idMap = opts.idMap instanceof Map ? opts.idMap : new Map();
  const marcas = opts.marcas ?? null;
  const projeto = opts.projeto ?? null;
  const env = opts.env ?? process.env;
  const cfg = witConfig(env);
  const pipelineTags = pipelineTagsOf(doc);
  const storiesIn = porOrdem(asObjectArray(doc.stories));
  const featuresIn = porOrdem(asObjectArray(doc.features));
  const epicsIn = porOrdem(asObjectArray(doc.epics));
  const tagRegra = businessRuleTagOf(doc);
  const marca = (item) => (item.businessRuleHeavy === true ? [tagRegra] : []);
  const idsDoArquivo = new Set([...epicsIn, ...featuresIn, ...storiesIn, ...storiesIn.flatMap((s) => asObjectArray(s.tasks))].map((x) => x.id));
  /**
   * O que muda além do conteúdo: StackRank (na criação, depois do maior existente; no upsert só com
   * --reordenar, por permuta), a tag de regra de negócio que sai quando o item foi desmarcado — e só
   * se foi a ferramenta que a pôs —, e os links de dependência.
   */
  const extras = (item) => {
    const out = {};
    if (typeof item.executionOrder === 'number' && Number.isFinite(item.executionOrder)) {
      out.stackRankSoma = item.executionOrder;
      if (changeMode && reordenar) out.stackRankNaAtualizacao = { regra: 'permuta', posicao: item.executionOrder };
    }
    if (changeMode && item.businessRuleHeavy === false && typeof item.id === 'string') {
      const m = marcaDaFerramenta(marcas, projeto, item.id, idMap.get(item.id) ?? null);
      if (m) out.tagsRemovidasNaAtualizacao = [m.tag];
    }
    const deps = dependenciasDe(item);
    if (deps.length) {
      out.dependencias = deps.map((d) => ({ tipo: 'Predecessora', para: d, ...(idsDoArquivo.has(d) ? {} : { nota: 'fora deste arquivo' }) }));
    }
    return out;
  };

  const metadata = asObject(doc.metadata);
  const chosen = Array.isArray(asObject(metadata.backlogHierarchy).chosen) ? /** @type {unknown[]} */ (asObject(metadata.backlogHierarchy).chosen) : [];
  const hasEpic = chosen.includes('epic') || epicsIn.length > 0;
  const hasFeature = chosen.includes('feature') || featuresIn.length > 0;
  const publishFeature = asObject(asObject(asObject(metadata.azureDevOps).workItemTypes).feature).publish !== false;

  /** @type {PlanItem[]} */
  const itens = [];
  /** @type {string[]} */
  const erros = [];
  const global = globalParentEpic(doc, env);

  /** Ação de um item que a publicação cria (modo normal) ou faz upsert (modo _change). */
  const acaoDe = (logicalId) => {
    if (!changeMode) return /** @type {const} */ ('criar');
    return idMap.has(logicalId) ? /** @type {const} */ ('atualizar') : /** @type {const} */ ('criar-ou-atualizar');
  };
  /** Referência que o item terá depois desta etapa (para os filhos). */
  const refDe = (logicalId) => (changeMode && idMap.has(logicalId) ? /** @type {number} */ (idMap.get(logicalId)) : novo(logicalId));
  // createEpic/createFeature/… caem para ['task-pipeline'] quando a lista vem vazia; a atualização
  // do modo _change usa a lista como está.
  const ptCreate = pipelineTags.length > 0 ? pipelineTags : ['task-pipeline'];
  const tagSet = (extra, kind, jsonId) => [...new Set([...extra, ...ptCreate, kind, jsonId, `${LOGICAL_ID_TAG_PREFIX}${jsonId}`])];
  const push = (item) => { itens.push({ ordem: itens.length + 1, ...item }); };

  // --- Epics ---
  /** @type {Map<string, AdoRef | null>} */
  const epicRef = new Map();
  if (hasEpic && epicsIn.length > 0) {
    for (const epic of epicsIn) {
      const eid = typeof epic.id === 'string' ? epic.id : 'EPIC';
      const ename = typeof epic.name === 'string' ? epic.name : eid;
      const etitle = clampTitle(typeof epic.title === 'string' ? epic.title : `${eid}: ${ename}`);
      const epicAdoM = asObject(epic.azureDevOps);
      const existingRaw = epicAdoM.existingWorkItemId ?? epicAdoM.epicWorkItemId;
      const existingNum = typeof existingRaw === 'number' ? existingRaw
        : (typeof existingRaw === 'string' && existingRaw.trim() ? Number.parseInt(existingRaw, 10) : NaN);
      const base = { nivel: /** @type {const} */ ('epic'), id: eid, titulo: etitle, wit: cfg.witEpic, pai: null };
      if (Number.isFinite(existingNum) && existingNum > 0) {
        epicRef.set(eid, existingNum);
        push({ ...base, acao: 'usar-existente', tags: [], nota: `Epic #${existingNum} já existe no ADO — vira pai, não é modificado.` });
        continue;
      }
      if (epicAdoM.publish === false) {
        epicRef.set(eid, null);
        push({ ...base, acao: 'nao-publicar', tags: [], nota: 'azureDevOps.publish = false' });
        continue;
      }
      epicRef.set(eid, refDe(eid));
      push({
        ...base, acao: acaoDe(eid), tags: tagSet([`epic-json:${eid}`, ...marca(epic)], 'epic', eid),
        ...(changeMode ? { tagsNaAtualizacao: [...new Set([...pipelineTags, 'epic', `epic-json:${eid}`, `${LOGICAL_ID_TAG_PREFIX}${eid}`, ...marca(epic)])] } : {}),
        ...extras(epic),
      });
    }
  }

  /** @type {AdoRef | null} */
  const defaultEpic = global ? global.id : ([...epicRef.values()].find((v) => v != null) ?? null);
  if (defaultEpic == null) {
    erros.push('Nenhum epic pai definido. Configure metadata.azureDevOps.epicWorkItemId ou AZURE_DEVOPS_EPIC_WORK_ITEM_ID.');
    return { modo: changeMode ? 'change' : 'normal', epicPai: null, itens, resumo: resumir(itens), erros };
  }
  const epicPai = {
    id: defaultEpic,
    origem: global ? global.origem : `primeiro Epic do arquivo (${[...epicRef.entries()].find(([, v]) => v != null)?.[0]})`,
  };

  // --- Features ---
  /** @type {Map<string, AdoRef | null>} */
  const featureRef = new Map();
  if (hasFeature && featuresIn.length > 0 && publishFeature) {
    for (const feat of featuresIn) {
      const fid = typeof feat.id === 'string' ? feat.id : 'FEAT';
      const fname = typeof feat.name === 'string' ? feat.name : fid;
      const ftitle = clampTitle(typeof feat.title === 'string' ? feat.title : `${fid}: ${fname}`);
      const featEpicId = typeof feat.epicId === 'string' ? feat.epicId : null;
      const parent = featEpicId && epicRef.get(featEpicId) != null ? /** @type {AdoRef} */ (epicRef.get(featEpicId)) : defaultEpic;
      const base = { nivel: /** @type {const} */ ('feature'), id: fid, titulo: ftitle, wit: resolveWit(feat.workItemType, cfg.witFeature, cfg), pai: parent };
      if (asObject(feat.azureDevOps).publish === false) {
        featureRef.set(fid, null);
        push({ ...base, acao: 'nao-publicar', tags: [], nota: 'azureDevOps.publish = false' });
        continue;
      }
      featureRef.set(fid, refDe(fid));
      push({
        ...base, acao: acaoDe(fid), tags: tagSet([`feature-json:${fid}`, `parent-epic:${parent}`, ...marca(feat)], 'feature', fid),
        ...(changeMode ? { tagsNaAtualizacao: [...new Set([...pipelineTags, 'feature', `feature-json:${fid}`, `${LOGICAL_ID_TAG_PREFIX}${fid}`, ...marca(feat)])] } : {}),
        ...extras(feat),
      });
    }
  }

  // --- Stories e as tasks de cada uma, na mesma ordem em que a publicação as cria ---
  for (const story of storiesIn) {
    const sid = typeof story.id === 'string' ? story.id : 'STORY';
    const stitle = clampTitle(`${sid}: ${typeof story.name === 'string' ? story.name : sid}`);
    const storyFeatureId = typeof story.featureId === 'string' ? story.featureId : null;
    const storyEpicId = typeof story.epicId === 'string' ? story.epicId : null;
    /** @type {AdoRef} */
    let parent = defaultEpic;
    // Mesma precedência (e a mesma assimetria) do serviço: no modo normal, story com featureId de
    // uma feature registrada fica no Epic padrão quando a feature não foi publicada — não cai para
    // o epicId da story.
    if (!changeMode && hasFeature && storyFeatureId && featureRef.has(storyFeatureId)) {
      if (featureRef.get(storyFeatureId) != null) parent = /** @type {AdoRef} */ (featureRef.get(storyFeatureId));
    } else if (changeMode && hasFeature && storyFeatureId && featureRef.get(storyFeatureId) != null) {
      parent = /** @type {AdoRef} */ (featureRef.get(storyFeatureId));
    } else if (hasEpic && storyEpicId && epicRef.get(storyEpicId) != null) {
      parent = /** @type {AdoRef} */ (epicRef.get(storyEpicId));
    }
    const storyExtra = [`story-json:${sid}`, `parent-epic:${defaultEpic}`,
      ...(storyFeatureId ? [`parent-feature-json:${storyFeatureId}`] : []),
      ...(storyEpicId ? [`parent-epic-json:${storyEpicId}`] : [])];
    push({
      nivel: 'story', id: sid, titulo: stitle,
      wit: resolveWit(story.workItemType, cfg.witUserStory, cfg),
      acao: acaoDe(sid), pai: parent, tags: tagSet([...storyExtra, ...marca(story)], 'user-story', sid),
      ...(changeMode ? { tagsNaAtualizacao: [...new Set([...pipelineTags, 'user-story', ...storyExtra, `${LOGICAL_ID_TAG_PREFIX}${sid}`, ...marca(story)])] } : {}),
      ...extras(story),
    });
    const storyRef = refDe(sid);

    for (const task of porOrdem(asObjectArray(story.tasks))) {
      const tid = typeof task.id === 'string' ? task.id : 'TASK';
      const ttitle = clampTitle(`${tid}: ${typeof task.title === 'string' ? task.title : tid}`);
      const taskExtra = [`task-json:${tid}`, `story-json:${sid}`, `parent-epic:${defaultEpic}`,
        ...(storyFeatureId ? [`parent-feature-json:${storyFeatureId}`] : [])];
      /** @type {Array<{ tipo: string, para: string }>} */
      const links = [];
      if (changeMode) {
        for (const relId of relatedLogicalIds(task)) links.push({ tipo: 'Related', para: relId });
      }
      push({
        nivel: 'task', id: tid, titulo: ttitle, wit: cfg.witTask,
        acao: acaoDe(tid), pai: storyRef, tags: tagSet([...taskExtra, ...marca(task)], 'task', tid),
        ...(changeMode ? { tagsNaAtualizacao: [...new Set([...pipelineTags, 'task', ...taskExtra, `${LOGICAL_ID_TAG_PREFIX}${tid}`, ...marca(task)])] } : {}),
        ...extras(task),
        ...(links.length > 0 ? { links } : {}),
      });
    }
  }

  return { modo: changeMode ? 'change' : 'normal', epicPai, tagRegraDeNegocio: tagRegra, itens, resumo: resumir(itens), erros };
}

/** Espelho de `extractRelatedLogicalIds` (azure-upsert.mjs). @param {Record<string, unknown>} task */
function relatedLogicalIds(task) {
  /** @type {string[]} */
  const ids = [];
  const add = (v) => {
    if (typeof v === 'string' && v.trim()) ids.push(v.trim());
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && x.trim()) ids.push(x.trim());
  };
  add(task.regressionOf);
  add(task.relatedTasks);
  return [...new Set(ids)];
}

/** Contagem nível × ação. @param {PlanItem[]} itens */
function resumir(itens) {
  /** @type {Record<string, Record<string, number>>} */
  const out = {};
  for (const it of itens) {
    out[it.acao] ??= {};
    out[it.acao][it.nivel] = (out[it.acao][it.nivel] ?? 0) + 1;
  }
  return out;
}

/** O StackRank de um item, como a simulação pode dizer sem ler o projeto. @param {PlanItem} it */
function textoDoStackRank(it) {
  if (it.stackRankSoma == null) return '';
  const criar = `maior existente + ${it.stackRankSoma}`;
  const permuta = it.stackRankNaAtualizacao ? 'permuta entre os slots atuais' : null;
  if (it.acao === 'criar') return ` · StackRank ${criar}`;
  if (it.acao === 'criar-ou-atualizar') return ` · StackRank: ${criar} se for criado${permuta ? `; se já existir, ${permuta}` : ''}`;
  if (it.acao === 'atualizar' && permuta) return ` · StackRank: ${permuta} (posição ${it.stackRankNaAtualizacao.posicao})`;
  return '';
}

const ROTULO_ACAO = {
  criar: 'criar',
  atualizar: 'atualizar',
  'criar-ou-atualizar': 'criar ou atualizar',
  'usar-existente': 'já existe',
  'nao-publicar': 'não publicar',
};

/**
 * Texto para quem vai confirmar a publicação. Nada de segredo: o PAT nunca entra aqui.
 * @param {ReturnType<typeof buildPublishPlan>} plan
 * @param {{ projeto?: string, org?: string, limite?: number }} [ctx]
 */
export function formatPublishPlan(plan, ctx = {}) {
  const limite = ctx.limite ?? 300;
  const linhas = [];
  linhas.push('SIMULAÇÃO (--dry-run) — nada foi enviado ao Azure DevOps.');
  linhas.push(`Projeto: ${ctx.projeto || '(não definido — a publicação de verdade vai falhar sem ele)'}${ctx.org ? ` · organização: ${ctx.org}` : ''}`);
  linhas.push(`Modo: ${plan.modo === 'change' ? '_change (atualiza o que já existe, cria o resto)' : 'normal (só cria)'}`);
  linhas.push(`Epic pai padrão: ${plan.epicPai ? `${plan.epicPai.id} (${plan.epicPai.origem})` : '—'}`);
  for (const [acao, porNivel] of Object.entries(plan.resumo)) {
    const partes = Object.entries(porNivel).map(([nivel, n]) => `${n} ${nivel}`);
    linhas.push(`${ROTULO_ACAO[acao] ?? acao}: ${partes.join(', ')}`);
  }
  if (plan.modo === 'change') {
    linhas.push('No modo _change a correlação por tag/título só acontece na publicação: «criar ou atualizar» vira um dos dois lá.');
  }
  // O StackRank depende do que já está no projeto — e a simulação não fala com o ADO: ela diz a regra.
  if (plan.itens.some((i) => i.stackRankSoma != null)) {
    linhas.push('StackRank na criação: o maior StackRank já existente no projeto (lido na publicação) + a posição na ordem lógica — os itens novos entram depois do backlog que já existe, na ordem calculada. Se a leitura falhar, saem sem StackRank, no fim do backlog.');
  }
  if (plan.itens.some((i) => i.stackRankNaAtualizacao)) {
    linhas.push('--reordenar: os itens que já existem trocam de StackRank entre si — permuta entre os slots atuais de cada nível, na ordem calculada; nada colide com item de fora do arquivo, e item sem StackRank vai para depois do maior.');
  }
  if (plan.modo === 'change' && plan.tagRegraDeNegocio) {
    linhas.push(`A tag ${plan.tagRegraDeNegocio} só sai de item em que a própria ferramenta a pôs (registro ${NOME_REGISTRO}, ao lado do tasks.json); a que o time pôs à mão fica.`);
  }
  linhas.push('');
  linhas.push('Ordem de publicação:');
  for (const it of plan.itens.slice(0, limite)) {
    const pai = it.pai == null ? '' : ` · pai ${it.pai}`;
    const links = it.links?.length ? ` · Related → ${it.links.map((l) => l.para).join(', ')}` : '';
    const deps = it.dependencias?.length ? ` · depois de ${it.dependencias.map((d) => d.para).join(', ')}` : '';
    const regra = plan.tagRegraDeNegocio && it.tags?.includes(plan.tagRegraDeNegocio) ? ` · tag ${plan.tagRegraDeNegocio}` : '';
    const sai = it.tagsRemovidasNaAtualizacao?.length ? ` · sai a tag ${it.tagsRemovidasNaAtualizacao.join(', ')}` : '';
    linhas.push(`  ${String(it.ordem).padStart(4)}. [${ROTULO_ACAO[it.acao] ?? it.acao}] ${it.wit} — ${it.titulo}${pai}${deps}${regra}${sai}${textoDoStackRank(it)}${links}`);
  }
  if (plan.itens.length > limite) linhas.push(`  … e mais ${plan.itens.length - limite} item(ns) — lista completa no JSON do stdout.`);
  for (const e of plan.erros) linhas.push(`ERRO: ${e}`);
  return `${linhas.join('\n')}\n`;
}
