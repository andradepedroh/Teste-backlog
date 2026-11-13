// GÊMEO: mantém paridade com ../../spec-tasks-azure/lib/ado-narrative-html.mjs (incl. bloco "Contexto de UI"/uiContext).
// Diferença deliberada no screenshot: o ADO anexa como attachment; aqui a imagem é EMBUTIDA em base64
// (com cache por caminho e cap de tamanho por imagem — ver uiScreenshotDataUri).
// Ao editar o schema v5.3, atualizar ambos.
//
// Paridade do inventário de campos (v5.3): uiContext.fields[] (tabela), uiContext.grid e
// uiContext.filterBehavior são renderizados aqui (renderUiFieldsTable/renderUiGrid/
// renderUiFilterBehavior) e no gêmeo do ADO (uiFieldsTableHtml/uiGridHtml/uiFilterBehaviorHtml).
// O schema declara esse conteúdo insubstituível: o screenshot não o substitui.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from './escape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Diretório-base para resolver caminhos relativos do uiContext.screenshot
// (diretório do tasks.json, definido via renderTasksHtml(doc, { baseDir })).
let screenshotBaseDir = '';

let cachedThemeCss = '';
let cachedTokensCss = null; // null = ainda não verificado

/**
 * Concatena o tema base (report-theme.css) com o override opcional
 * (templates/report-theme.tokens.css, se existir) — carregado automaticamente
 * a partir da pasta templates/ irmã de lib/, dentro desta mesma skill.
 * As variáveis do ficheiro de override são aplicadas por último no CSS,
 * portanto sobrepõem os valores padrão via cascata (mesmo seletor :root).
 */
function getCss() {
  if (!cachedThemeCss) {
    cachedThemeCss = readFileSync(join(__dirname, 'report-theme.css'), 'utf8');
  }
  if (cachedTokensCss === null) {
    try {
      cachedTokensCss = readFileSync(join(__dirname, '..', 'templates', 'report-theme.tokens.css'), 'utf8');
    } catch {
      cachedTokensCss = '';
    }
  }
  return cachedTokensCss ? `${cachedThemeCss}\n${cachedTokensCss}` : cachedThemeCss;
}

/** @param {unknown} v @returns {v is Record<string, unknown>} */
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** @param {unknown} v @returns {string[]} */
function asStrArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string');
}

/** @param {unknown} v @returns {Record<string, unknown>[]} */
function asObjArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(isObj);
}

/** @param {unknown} v @returns {unknown[]} */
function asArray(v) {
  return Array.isArray(v) ? v : [];
}

// ——— Ordem lógica e marca de regra de negócio (spec-tasks ≥ 1.7: order-backlog / mark-business-rules) ———

/** Ordem de `executionOrder`; item sem o campo mantém a posição do array, depois dos ordenados. */
function porOrdemDeExecucao(lista) {
  return lista
    .map((x, i) => ({ x, i, o: typeof x.executionOrder === 'number' && Number.isFinite(x.executionOrder) ? x.executionOrder : Infinity }))
    .sort((a, b) => a.o - b.o || a.i - b.i)
    .map(({ x }) => x);
}

/** O item é regra de negócio, ou tem algum filho que é — é o que o filtro mantém visível. */
function temRegra(item, filhos = []) {
  return item?.businessRuleHeavy === true
    || asObjArray(item?.tasks).some((t) => t.businessRuleHeavy === true)
    || filhos.some((f) => temRegra(f));
}
const attrRegra = (sim) => ` data-regra="${sim ? 'sim' : 'nao'}"`;
const seloOrdem = (item) => (typeof item?.executionOrder === 'number'
  ? `<span class="pill pill--ordem" title="Posição na ordem lógica de execução">#${escapeHtml(String(item.executionOrder))}</span>` : '');
const seloRegra = (item) => (item?.businessRuleHeavy === true
  ? '<span class="pill pill--regra" title="A maior parte deste item é regra de negócio">Regra de negócio</span>' : '');

/** Selos de ordem e de regra para cabeçalho — nada (nem espaço) quando o item não tem nenhum. */
const selosDe = (item) => { const s = [seloOrdem(item), seloRegra(item)].filter(Boolean).join(' '); return s ? ` ${s}` : ''; };

const CSS_ORDEM_REGRA = `
.pill--ordem{background:#eef2ff;color:#3730a3;font-variant-numeric:tabular-nums}
.pill--regra{background:#fef3c7;color:#92400e;font-weight:600}
.filtro-regra{display:flex;gap:.5rem;align-items:center;margin:.25rem 0 1rem;font-size:14px}
.so-regra [data-regra="nao"]{display:none}
`;

/** O filtro só aparece quando o backlog traz a marca (sem ela não há o que filtrar). */
function filtroDeRegra(doc) {
  const todos = [...asObjArray(doc.epics), ...asObjArray(doc.features), ...asObjArray(doc.stories),
    ...asObjArray(doc.stories).flatMap((s) => asObjArray(s.tasks))];
  if (!todos.some((x) => typeof x.businessRuleHeavy === 'boolean')) return '';
  const n = todos.filter((x) => x.businessRuleHeavy === true).length;
  return `<label class="filtro-regra"><input type="checkbox" id="filtro-regra" /> Mostrar só o que é regra de negócio (${n} ${n === 1 ? 'item marcado' : 'itens marcados'})</label>`;
}

/** @param {unknown} v */
function slugify(v) {
  return String(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Âncora estável no documento principal (alinhar com sidebar). */
function anchorEpic(eid) {
  return `epic-${slugify(eid)}`;
}
function anchorFeature(fid) {
  return `feature-${slugify(fid)}`;
}
function anchorStory(sid) {
  return slugify(sid);
}
function anchorTask(tid) {
  return `task-${slugify(tid)}`;
}

/** Rótulo do id declarado no filho, com os aliases históricos. */
function declaredParentId(child, keys) {
  for (const k of keys) {
    const v = child?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * Monta a árvore Epic → Feature → Story a partir do documento.
 *
 * PRECEDÊNCIA (a mesma que o render já usava para `epicId`): o **id declarado no FILHO** vence o
 * `containedXIds[]` do PAI. Quando os dois discordam, o filho é a fonte — é ele que o gerador
 * escreve por último e é ele que o ADO usa para ligar o work item.
 *
 * COLOCAÇÃO de uma story, em cascata:
 *   1. `featureId` (ou a feature que a contém) → story entra sob a Feature;
 *   2. senão `epicId` (ou o epic que a contém) → story entra DIRETO sob o Epic (Epic sem Feature,
 *      e também story com `featureId` que não existe — o vínculo com o épico continua válido);
 *   3. senão → órfã de verdade ("Stories sem Epic").
 * O passo 2 é o que impede o falso órfão: cair na seção de órfãs tem de significar AUSÊNCIA REAL
 * de vínculo, nunca "o featureId não resolveu".
 *
 * @param {Record<string, unknown>[]} epics
 * @param {Record<string, unknown>[]} features
 * @param {Record<string, unknown>[]} stories  stories CRUAS (normalizadas ponto a ponto)
 */
function buildBacklogTree(epics, features, stories) {
  const epicById = new Map(epics.map((e) => [typeof e.id === 'string' ? e.id : '', e]).filter(([k]) => k));
  const featureById = new Map(features.map((f) => [typeof f.id === 'string' ? f.id : '', f]).filter(([k]) => k));

  // Índices reversos a partir dos containedXIds[] do pai — usados só como fallback.
  const featureIdByContainedStory = new Map();
  for (const f of features) {
    const fid = typeof f.id === 'string' ? f.id : '';
    for (const sid of asStrArray(f.containedStoryIds)) if (!featureIdByContainedStory.has(sid)) featureIdByContainedStory.set(sid, fid);
  }
  const epicIdByContainedStory = new Map();
  const epicIdByContainedFeature = new Map();
  for (const e of epics) {
    const eid = typeof e.id === 'string' ? e.id : '';
    for (const sid of asStrArray(e.containedStoryIds)) if (!epicIdByContainedStory.has(sid)) epicIdByContainedStory.set(sid, eid);
    for (const fid of asStrArray(e.containedFeatureIds)) if (!epicIdByContainedFeature.has(fid)) epicIdByContainedFeature.set(fid, eid);
  }

  /** Feature → Epic: `feature.epicId` vence `epic.containedFeatureIds[]`. */
  const epicIdOfFeature = (feature) => {
    const fid = typeof feature.id === 'string' ? feature.id : '';
    const declared = declaredParentId(feature, ['epicId', 'epic']);
    if (declared && epicById.has(declared)) return declared;
    const viaContained = epicIdByContainedFeature.get(fid) ?? '';
    if (viaContained && epicById.has(viaContained)) return viaContained;
    // `epicId` declarado que não corresponde a nenhum Epic do documento = Feature sem Epic:
    // vai para o bloco próprio, com as stories dela. Nada se perde por vínculo quebrado.
    return '';
  };

  const featureNodes = new Map(); // fid → {feature, epicId, stories: []}
  for (const f of features) {
    const fid = typeof f.id === 'string' ? f.id : '';
    featureNodes.set(fid, { feature: f, epicId: epicIdOfFeature(f), stories: [] });
  }

  const storiesDirectlyOnEpic = new Map(); // eid → [rawStory]
  const orphanStories = [];

  for (const rawStory of stories) {
    const s = normStorySchema(rawStory);
    const sid = typeof s.id === 'string' ? s.id : '';

    // 1) Feature
    const declaredFeature = declaredParentId(s, ['featureId', 'feature']);
    let fid = declaredFeature && featureById.has(declaredFeature) ? declaredFeature : '';
    if (!fid) {
      const viaContained = featureIdByContainedStory.get(sid) ?? '';
      if (viaContained && featureNodes.has(viaContained)) fid = viaContained;
    }
    if (fid) {
      featureNodes.get(fid).stories.push(rawStory);
      continue;
    }

    // 2) Epic (Epic sem Feature, ou featureId que não resolve)
    const declaredEpic = declaredParentId(s, ['epicId', 'epic']);
    let eid = declaredEpic && epicById.has(declaredEpic) ? declaredEpic : '';
    if (!eid) {
      const viaContained = epicIdByContainedStory.get(sid) ?? '';
      if (viaContained && epicById.has(viaContained)) eid = viaContained;
    }
    if (eid) {
      if (!storiesDirectlyOnEpic.has(eid)) storiesDirectlyOnEpic.set(eid, []);
      storiesDirectlyOnEpic.get(eid).push(rawStory);
      continue;
    }

    // 3) Órfã de verdade
    orphanStories.push(rawStory);
  }

  const epicNodes = epics.map((epic) => {
    const eid = typeof epic.id === 'string' ? epic.id : '';
    return {
      epic,
      features: [...featureNodes.values()].filter((n) => n.epicId === eid),
      directStories: storiesDirectlyOnEpic.get(eid) ?? []
    };
  });

  // Feature sem Epic — bloco próprio; as stories dela NÃO podem desaparecer.
  const orphanFeatures = [...featureNodes.values()].filter((n) => !n.epicId || !epicById.has(n.epicId));

  return { epicNodes, orphanFeatures, orphanStories };
}

/**
 * Rótulo da cadeia na barra lateral, a partir de `metadata.backlogHierarchy.chosen` — não de uma
 * string fixa. Antes era `hasEpic ? 'Epic → Story → Task' : 'Story → Task'`, o que tornava
 * impossível anunciar a Feature mesmo quando ela estava no documento.
 * `chosen` é filtrado por PRESENÇA REAL: nível escolhido e ausente do JSON não entra no rótulo.
 */
function hierarchyChainLabel(chosen, presence) {
  const LABELS = { epic: 'Epic', feature: 'Feature', story: 'Story', task: 'Task' };
  const order = ['epic', 'feature', 'story', 'task'];
  const chosenSet = new Set(asStrArray(chosen));
  const levels = order.filter((lvl) => {
    if (lvl === 'epic') return !!presence.hasEpic;
    if (lvl === 'feature') return !!presence.hasFeature;
    if (lvl === 'story') return true;
    return presence.hasTask || chosenSet.has('task') || chosenSet.size === 0;
  });
  return levels.map((l) => LABELS[l]).join(' → ');
}

/**
 * Quebra texto compact-prose do selfContainedSummary em blocos legíveis.
 * @param {string} text
 * @returns {{ heading: string; body: string }[]}
 */
function parseSelfContainedSummarySections(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  // Separadores típicos gerados pela spec-tasks (MAIÚSCULAS + dois-pontos)
  const re =
    /\s+(?=(?:OBJETIVO DA TASK|CONTEXTO DE NEG[ÓO]CIO|ATORES PRINCIPAIS|APIs ENVOLVIDAS|PERSIST[EÊ]NCIA|REGRAS DE NEG[ÓO]CIO APLIC[AÁ]VEIS|FLUXO PRINCIPAL|PR[EÉ]-CONDI[ÇC][ÕO]ES|P[ÓO]S-CONDI[ÇC][ÕO]ES|DECIS[ÕO]ES ARQUITETURAIS|ENTREG[AÁ]VEIS|RISCOS|DEPEND[EÊ]NCIAS)\s*:)/i;
  const rawParts = t.split(re).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const part of rawParts) {
    const idx = part.indexOf(':');
    if (idx === -1) {
      out.push({ heading: 'Resumo', body: part });
      continue;
    }
    const heading = part.slice(0, idx).trim();
    const body = part.slice(idx + 1).trim();
    out.push({ heading, body });
  }
  return out.length ? out : [{ heading: 'Resumo', body: t }];
}

/**
 * Segmentos separados por pipe (campos API, colunas, etc.).
 * @param {string} s
 */
function splitPipeSegments(s) {
  const str = String(s || '').trim();
  if (!str) return [];
  return str
    .split(/\s*\|\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Respostas HTTP em string compacta: "200 app — ... | 404 ..."
 * @param {string} s
 */
function splitHttpResponseSegments(s) {
  const str = String(s || '').trim();
  if (!str) return [];
  const parts = str.split(/\s\|\s(?=\d{3}\s)/g).map((x) => x.trim()).filter(Boolean);
  return parts.length > 1 ? parts : splitPipeSegments(str);
}

/**
 * @param {Record<string, unknown>} doc
 * @param {{ baseDir?: string }} [options]  baseDir = diretório do tasks.json (resolve uiContext.screenshot)
 * @returns {string}
 */
export function renderTasksHtml(doc, options = {}) {
  screenshotBaseDir = typeof options.baseDir === 'string' ? options.baseDir : '';
  // Estado por execução: o cache de imagens e a lista de imagens acima do cap não podem
  // vazar entre renders (o mesmo processo pode gerar mais de um relatório).
  uiScreenshotCache.clear();
  uiScreenshotOversize.clear();
  unrenderedKeys.length = 0;
  const metadata = isObj(doc.metadata) ? doc.metadata : {};
  const completenessCheck = isObj(doc.completenessCheck) ? doc.completenessCheck : {};
  // Ordem lógica (executionOrder) nos quatro níveis; sem o campo, a ordem do array.
  const stories = porOrdemDeExecucao(asObjArray(doc.stories))
    .map((s) => (Array.isArray(s.tasks) ? { ...s, tasks: porOrdemDeExecucao(asObjArray(s.tasks)) } : s));
  const globalDependencies = isObj(doc.globalDependencies) ? doc.globalDependencies : {};
  const glossary = asObjArray(doc.glossary);
  const externalReferences = asObjArray(doc.externalReferences);

  const title = typeof metadata.projectName === 'string' ? metadata.projectName : 'Tasks report';
  const generatedAt = typeof metadata.generatedAt === 'string' ? metadata.generatedAt : '';

  // Extrair hierarquia de backlog (v3) ou modo legado
  const backlogHierarchy = isObj(metadata.backlogHierarchy) ? metadata.backlogHierarchy : {};
  const chosen = Array.isArray(backlogHierarchy.chosen) ? backlogHierarchy.chosen : [];
  const epics = porOrdemDeExecucao(Array.isArray(doc.epics) ? doc.epics.filter(isObj) : []);
  // Feature é nível de PRIMEIRA CLASSE desde a v6.1. Extraído do mesmo jeito que epics: o JSON é
  // a fonte de verdade, `chosen` é hint. Até a v6.0 `doc.features[]` era ignorado — num backlog
  // com 1 Epic + 9 Features o relatório saía com as 36 stories achatadas num único cartão e sem
  // os 9 blocos de negócio de módulo (130 regras e 96 critérios de aceite perdidos).
  const features = porOrdemDeExecucao(Array.isArray(doc.features) ? doc.features.filter(isObj) : []);
  // Detectar presença real — o JSON é a fonte de verdade (chosen é hint)
  const hasEpic = chosen.includes('epic') || epics.length > 0;
  const hasFeature = features.length > 0;
  const hasStory = chosen.includes('story') || chosen.length === 0;
  const hasTask = chosen.includes('task') || chosen.length === 0;

  // Construir secções dinâmicas por nível - HIERÁRQUICO
  const hierarchySections = [];
  const filtro = filtroDeRegra(doc);
  if (hasEpic && epics.length > 0 && hasFeature) {
    // Epic → Feature → Story → Task (cadeia completa)
    hierarchySections.push(sectionWrap('epics', '3. Backlog — Estrutura hierárquica', filtro + renderEpicsWithFeatures(epics, features, stories)));
  } else if (hasFeature) {
    // Feature → Story → Task (documento com features e sem epic)
    hierarchySections.push(sectionWrap('features', '3. Backlog — Estrutura hierárquica', filtro + renderFeaturesWithStories(features, stories)));
  } else if (hasEpic && epics.length > 0) {
    // Renderizar Epics com Stories e Tasks aninhados
    hierarchySections.push(sectionWrap('epics', '3. Backlog — Estrutura hierárquica', filtro + renderEpicsWithStories(epics, stories)));
  } else {
    // Modo flat: apenas Stories e Tasks
    hierarchySections.push(sectionWrap('stories', '3. Histórias e tarefas', filtro + renderStories(stories)));
  }

  const mainContent = [
    renderHero(metadata),
    renderExecutiveSummary(metadata, epics, stories, completenessCheck, features),
    renderStatsStrip(metadata),
    renderReadingGuide(hasEpic, hasFeature),
    sectionWrap('metadata', '1. Metadados', renderMetadataBlock(metadata)),
    sectionWrap('completeness', '2. Completude e rastreabilidade', renderCompleteness(completenessCheck)),
    ...hierarchySections,
    sectionWrap('dependencies', '4. Dependências globais', renderGlobalDeps(globalDependencies)),
    sectionWrap('glossary', '5. Glossário', renderGlossary(glossary)),
    sectionWrap('refs', '6. Referências externas', renderExternalRefs(externalReferences)),
    renderOversizeImagesNote(),
    `<footer class="site-footer"><p>Documento gerado a partir de <code>tasks.json</code> · ${escapeHtml(generatedAt || '—')}</p></footer>`,
  ].join('\n');

  // Aviso também no stderr: quem roda o cli.mjs precisa saber que o relatório saiu sem imagem.
  if (uiScreenshotOversize.size) {
    for (const [p, bytes] of uiScreenshotOversize) {
      console.warn(`[spec-tasks-html] AVISO: screenshot "${p}" (${kb(bytes)}) excede o limite de ${kb(UI_SCREENSHOT_MAX_BYTES)} — não embutido no relatório.`);
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Relatório de tarefas</title>
  <style>${getCss()}${CSS_ORDEM_REGRA}</style>
</head>
<body>
  <div class="doc-layout">
    ${renderSidebarNav(stories, epics, chosen, features)}
    <div class="doc-content">
      <main class="doc-main" id="document-root">
        ${mainContent}
      </main>
    </div>
  </div>
  <script>
    document.getElementById('filtro-regra')?.addEventListener('change', (ev) => {
      document.body.classList.toggle('so-regra', ev.target.checked);
    });
    document.querySelectorAll('.biz-narrative__expand').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-expand-target');
        const full = targetId ? document.getElementById(targetId) : null;
        const short = btn.closest('.biz-narrative__context')?.querySelector('.biz-narrative__context-short');
        if (!full || !short) return;
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          full.hidden = true;
          short.hidden = false;
          btn.setAttribute('aria-expanded', 'false');
          btn.textContent = 'Expandir contexto';
        } else {
          short.hidden = true;
          full.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
          btn.textContent = 'Recolher contexto';
        }
      });
    });
  </script>
</body>
</html>`;
}


/** Conta tarefas somando as tasks de todas as stories (fallback ao metadata). */
function countTasks(stories, metadata) {
  if (typeof metadata.totalTasks === 'number') return metadata.totalTasks;
  return stories.reduce((acc, s) => acc + asObjArray(normStorySchema(s).tasks).length, 0);
}

/** Resumo executivo em linguagem de negócio: 1 frase + cartões com números-chave e alertas. */
function renderExecutiveSummary(metadata, epics, stories, completeness, features = []) {
  const nEpics = epics.length;
  const nFeatures = Array.isArray(features) ? features.length : 0;
  const nStories = typeof metadata.totalStories === 'number' ? metadata.totalStories : stories.length;
  const nTasks = countTasks(stories, metadata);
  const nDays = typeof metadata.estimatedDaysOfWork === 'number' ? metadata.estimatedDaysOfWork : null;
  const blocked = asObjArray(completeness.itemsBlockedByGap).length;
  const gaps = typeof metadata.totalGaps === 'number' ? metadata.totalGaps : blocked;

  const partes = [];
  if (nEpics) partes.push(`${nEpics} ${nEpics === 1 ? 'tema (epic)' : 'temas (epics)'}`);
  // Feature entra no resumo apenas quando existe: documento sem features[] mantém a frase de antes.
  if (nFeatures) partes.push(`${nFeatures} ${nFeatures === 1 ? 'módulo (feature)' : 'módulos (features)'}`);
  partes.push(`${nStories} ${nStories === 1 ? 'história' : 'histórias'} de usuário`);
  partes.push(`${nTasks} ${nTasks === 1 ? 'tarefa' : 'tarefas'} de trabalho`);
  const lead = `Este relatório organiza o que será construído em ${partes.join(', ')}` +
    (nDays != null ? `, com esforço estimado de ${nDays} dia(s) de trabalho` : '') +
    `. Cada item detalha o valor para o cliente, as regras de negócio e como será validado.`;

  const cards = [
    ['Temas (Epics)', nEpics || '—'],
    ...(nFeatures ? [['Módulos (Features)', nFeatures]] : []),
    ['Histórias', nStories],
    ['Tarefas', nTasks],
    nDays != null ? ['Esforço estimado', `${nDays} dias`] : null,
  ].filter(Boolean).map(([l, v]) =>
    `<div class="exec-card"><p class="exec-card__label">${escapeHtml(l)}</p><p class="exec-card__value">${escapeHtml(String(v))}</p></div>`
  ).join('');

  const flag = (gaps > 0 || blocked > 0)
    ? `<div class="exec-card exec-card--flag"><p class="exec-card__label">Pontos de atenção</p><p class="exec-card__value">${escapeHtml(String(gaps))} lacuna(s)${blocked ? ` · ${blocked} item(ns) bloqueado(s)` : ''}</p></div>`
    : '';

  return `<section class="exec-summary" aria-label="Resumo executivo">
    <h2 class="exec-summary__title">Resumo executivo</h2>
    <p class="exec-summary__lead">${escapeHtml(lead)}</p>
    <div class="exec-summary__cards">${cards}${flag}</div>
  </section>`;
}

/** Guia "como ler" + legenda das siglas — para leitores não técnicos. */
function renderReadingGuide(hasEpic, hasFeature = false) {
  const hier = hasEpic && hasFeature
    ? 'Os itens estão organizados em quatro níveis: <strong>Tema (Epic)</strong> agrupa <strong>Módulos (Features)</strong>, cada módulo agrupa <strong>Histórias</strong>, que se dividem em <strong>Tarefas</strong>.'
    : hasFeature
      ? 'Os itens estão organizados em três níveis: <strong>Módulo (Feature)</strong> agrupa <strong>Histórias</strong>, que se dividem em <strong>Tarefas</strong>.'
      : hasEpic
        ? 'Os itens estão organizados em três níveis: <strong>Tema (Epic)</strong> agrupa <strong>Histórias</strong>, que se dividem em <strong>Tarefas</strong>.'
        : 'Os itens estão organizados em dois níveis: <strong>Histórias</strong> de usuário, que se dividem em <strong>Tarefas</strong>.';
  const legend = [
    ['EPIC', 'Tema — grande objetivo de negócio', ''],
    ...(hasFeature ? [['FEATURE', 'Módulo — capacidade homologável pelo negócio', 'rf']] : []),
    ['STORY', 'História — necessidade de um usuário', 'story'],
    ['TASK', 'Tarefa — unidade de trabalho técnico', 'task'],
    ['RF', 'Requisito funcional — o que o sistema faz', 'rf'],
    ['RN', 'Regra de negócio — política ou restrição', 'rn'],
    ['GAP', 'Lacuna — decisão pendente do negócio', 'gap'],
    ['BDD', 'Cenário de aceite — como validar', 'sec'],
  ].map(([b, t, mod]) =>
    `<li class="legend__item"><span class="legend__badge${mod ? ` legend__badge--${mod}` : ''}">${escapeHtml(b)}</span>${escapeHtml(t)}</li>`
  ).join('');
  return `<div class="reading-guide" aria-label="Como ler este documento">
    <p class="reading-guide__title">Como ler este documento</p>
    <p>${hier} Clique em qualquer <strong>Tarefa</strong> ou painel para abrir o detalhe técnico — por padrão eles ficam recolhidos para facilitar a leitura.</p>
    <ul class="legend">${legend}</ul>
  </div>`;
}

/** @param {Record<string, unknown>} m */
function renderHero(m) {
  const name = typeof m.projectName === 'string' ? m.projectName : 'Projeto';
  const ver = typeof m.projectVersion === 'string' ? m.projectVersion : '';
  const skill = typeof m.skillVersion === 'string' ? m.skillVersion : '';
  return `<header class="doc-header" id="top">
    <p class="doc-header__kicker">Relatório de planejamento · Tarefas e rastreabilidade</p>
    <h1 class="doc-header__title">${escapeHtml(name)}</h1>
    <dl class="doc-header__meta">
      ${ver ? `<div class="doc-header__meta-row"><dt>Versão / baseline</dt><dd>${escapeHtml(ver)}</dd></div>` : ''}
      ${
        skill
          ? `<div class="doc-header__meta-row"><dt>Versão do gerador</dt><dd><code>${escapeHtml(skill)}</code></dd></div>`
          : ''
      }
    </dl>
  </header>`;
}

/**
 * @param {Record<string, unknown>[]} stories
 * @param {Record<string, unknown>[]} epics
 * @param {string[]} chosen
 * @param {Record<string, unknown>[]} features
 */
function renderSidebarNav(stories, epics = [], chosen = [], features = []) {
  // Detectar presença real
  const hasEpic = chosen.includes('epic') || epics.length > 0;
  const hasFeature = Array.isArray(features) && features.length > 0;

  const docLinks = [
    ['#top', 'Topo'],
    ['#metadata', 'Metadados'],
    ['#completeness', 'Completude'],
    ['#dependencies', 'Dependências'],
    ['#glossary', 'Glossário'],
    ['#refs', 'Referências'],
  ]
    .map(
      ([href, label]) =>
        `<li><a class="nav-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`
    )
    .join('');

  // Criar árvore hierárquica Epic → Story → Task
  let hierarchyHtml = '';
  
  // Guard: se não houver stories, retornar estrutura vazia mas válida
  if (!stories || stories.length === 0) {
    hierarchyHtml = '<li class="tree-empty">Nenhuma história definida</li>';
  } else if (hasFeature) {
    // MODO: Epic → Feature → Story → Task (ramo próprio; o caminho sem features fica intocado)
    hierarchyHtml = renderSidebarTreeWithFeatures(epics, features, stories);
  } else if (hasEpic && epics.length > 0) {
    // MODO: Epic → Story → Task
    // Mapear stories por epic - verificar múltiplos campos possíveis
    const storiesByEpic = new Map();
    stories.forEach(rawStory => {
      const s = normStorySchema(rawStory);
      // Tentar múltiplos campos para encontrar o epic
      let epicId = typeof s.epicId === 'string' ? s.epicId : '';
      if (!epicId && typeof s.epic === 'string') epicId = s.epic;
      if (!epicId) {
        // Procurar qual epic contém esta story
        for (const epic of epics) {
          const containedIds = Array.isArray(epic.containedStoryIds) ? epic.containedStoryIds : [];
          if (containedIds.includes(s.id)) {
            epicId = typeof epic.id === 'string' ? epic.id : '';
            break;
          }
        }
      }
      // Se ainda não tem epicId, usar chave especial para órfãs
      const key = epicId || '__orphan__';
      if (!storiesByEpic.has(key)) storiesByEpic.set(key, []);
      storiesByEpic.get(key).push(s);
    });

    // Renderizar epics com suas stories
    const epicBlocks = epics.map(e => {
      const eid = typeof e.id === 'string' ? e.id : '';
      const ename = typeof e.name === 'string' ? e.name : (typeof e.title === 'string' ? e.title : eid);
      const epicStories = storiesByEpic.get(eid) || [];
      
      const storiesHtml = epicStories.map(s => {
        const sid = typeof s.id === 'string' ? s.id : '';
        const sname = typeof s.name === 'string' ? s.name : sid;
        const tasks = asObjArray(s.tasks);
        
        const tasksHtml = tasks.map(t => {
          const tid = typeof t.id === 'string' ? t.id : '';
          const anchor = anchorTask(tid);
          return `<li class="tree-task"><a class="nav-link tree-nav-link" href="#${escapeHtml(anchor)}" onclick="event.stopPropagation()"><span class="tree-task-id">${escapeHtml(tid)}</span></a></li>`;
        }).join('');
        
        return `<li class="tree-story">
          <details class="tree-details">
            <summary class="tree-summary tree-summary--story"><span class="tree-chevron" aria-hidden="true">▸</span><a class="nav-link tree-nav-link tree-nav-link--story" href="#${escapeHtml(anchorStory(sid))}" onclick="event.stopPropagation()"><span class="tree-story-id">${escapeHtml(sid)}</span><span class="tree-name-small">${escapeHtml(sname)}</span></a></summary>
            <ul class="tree-list tree-list--tasks">${tasksHtml || '<li class="tree-empty">Sem tasks</li>'}</ul>
          </details>
        </li>`;
      }).join('');
      
      return `<li class="tree-epic">
        <details class="tree-details tree-details--epic">
          <summary class="tree-summary tree-summary--epic"><span class="tree-chevron" aria-hidden="true">▾</span><a class="nav-link tree-nav-link tree-nav-link--epic" href="#${escapeHtml(anchorEpic(eid))}" onclick="event.stopPropagation()"><span class="tree-epic-id">${escapeHtml(eid)}</span><span class="tree-name">${escapeHtml(ename)}</span></a></summary>
          <ul class="tree-list tree-list--stories">${storiesHtml || '<li class="tree-empty">Sem stories neste epic</li>'}</ul>
        </details>
      </li>`;
    }).join('');

    // Adicionar stories órfãs (sem epic) no final, se existirem
    const orphanStories = storiesByEpic.get('__orphan__') || [];
    let orphanBlock = '';
    if (orphanStories.length > 0) {
      const orphanHtml = orphanStories.map(s => {
        const sid = typeof s.id === 'string' ? s.id : '';
        const sname = typeof s.name === 'string' ? s.name : sid;
        const tasks = asObjArray(s.tasks);
        
        const tasksHtml = tasks.map(t => {
          const tid = typeof t.id === 'string' ? t.id : '';
          const anchor = anchorTask(tid);
          return `<li class="tree-task"><a class="nav-link tree-nav-link" href="#${escapeHtml(anchor)}" onclick="event.stopPropagation()"><span class="tree-task-id">${escapeHtml(tid)}</span></a></li>`;
        }).join('');
        
        return `<li class="tree-story">
          <details class="tree-details">
            <summary class="tree-summary tree-summary--story"><span class="tree-chevron" aria-hidden="true">▸</span><a class="nav-link tree-nav-link tree-nav-link--story" href="#${escapeHtml(anchorStory(sid))}" onclick="event.stopPropagation()"><span class="tree-story-id">${escapeHtml(sid)}</span><span class="tree-name-small">${escapeHtml(sname)}</span></a></summary>
            <ul class="tree-list tree-list--tasks">${tasksHtml || '<li class="tree-empty">Sem tasks</li>'}</ul>
          </details>
        </li>`;
      }).join('');
      
      orphanBlock = `<li class="tree-epic">
        <details class="tree-details tree-details--epic">
          <summary class="tree-summary tree-summary--epic tree-summary--orphan"><span class="tree-chevron" aria-hidden="true">▾</span><a class="nav-link tree-nav-link tree-nav-link--epic" href="#stories-sem-epic" onclick="event.stopPropagation()"><span class="tree-epic-id">OUTRAS</span><span class="tree-name">Stories sem Epic</span></a></summary>
          <ul class="tree-list tree-list--stories">${orphanHtml}</ul>
        </details>
      </li>`;
    }

    hierarchyHtml = epicBlocks + orphanBlock;
  } else {
    // MODO: Story → Task (sem Epics)
    hierarchyHtml = stories.map(rawStory => {
      const s = normStorySchema(rawStory);
      const sid = typeof s.id === 'string' ? s.id : '';
      const sname = typeof s.name === 'string' ? s.name : sid;
      const tasks = asObjArray(s.tasks);
      
      const tasksHtml = tasks.map(t => {
        const tid = typeof t.id === 'string' ? t.id : '';
        const anchor = anchorTask(tid);
        return `<li class="tree-task"><a class="nav-link tree-nav-link" href="#${escapeHtml(anchor)}" onclick="event.stopPropagation()"><span class="tree-task-id">${escapeHtml(tid)}</span></a></li>`;
      }).join('');
      
      return `<li class="tree-story">
        <details class="tree-details">
          <summary class="tree-summary tree-summary--story"><span class="tree-chevron" aria-hidden="true">▸</span><a class="nav-link tree-nav-link tree-nav-link--story" href="#${escapeHtml(anchorStory(sid))}" onclick="event.stopPropagation()"><span class="tree-story-id">${escapeHtml(sid)}</span><span class="tree-name-small">${escapeHtml(sname)}</span></a></summary>
          <ul class="tree-list tree-list--tasks">${tasksHtml || '<li class="tree-empty">Sem tasks</li>'}</ul>
        </details>
      </li>`;
    }).join('');
  }

  return `<aside class="sidebar" aria-label="Navegação">
    <div class="sidebar-brand">
      <div class="sidebar-logo" aria-hidden="true">▣</div>
      <div class="sidebar-title">Backlog</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">Documento</div>
        <ul class="nav-list">${docLinks}</ul>
      </div>
      <div class="nav-section">
        <div class="nav-section-title">${escapeHtml(
          hierarchyChainLabel(chosen, {
            hasEpic,
            hasFeature,
            hasTask: asObjArray(stories).some((s) => asObjArray(normStorySchema(s).tasks).length > 0)
          })
        )}</div>
        <ul class="tree">${hierarchyHtml}</ul>
      </div>
    </nav>
  </aside>`;
}

/** Item de task na árvore da barra lateral — mesmo markup nos três modos. */
function sidebarTaskItems(story) {
  return asObjArray(story.tasks).map((t) => {
    const tid = typeof t.id === 'string' ? t.id : '';
    return `<li class="tree-task"><a class="nav-link tree-nav-link" href="#${escapeHtml(anchorTask(tid))}" onclick="event.stopPropagation()"><span class="tree-task-id">${escapeHtml(tid)}</span></a></li>`;
  }).join('');
}

/** Item de story na árvore da barra lateral, com as tasks aninhadas. */
function sidebarStoryItem(rawStory) {
  const s = normStorySchema(rawStory);
  const sid = typeof s.id === 'string' ? s.id : '';
  const sname = typeof s.name === 'string' ? s.name : sid;
  const tasksHtml = sidebarTaskItems(s);
  return `<li class="tree-story">
          <details class="tree-details">
            <summary class="tree-summary tree-summary--story"><span class="tree-chevron" aria-hidden="true">▸</span><a class="nav-link tree-nav-link tree-nav-link--story" href="#${escapeHtml(anchorStory(sid))}" onclick="event.stopPropagation()"><span class="tree-story-id">${escapeHtml(sid)}</span><span class="tree-name-small">${escapeHtml(sname)}</span></a></summary>
            <ul class="tree-list tree-list--tasks">${tasksHtml || '<li class="tree-empty">Sem tasks</li>'}</ul>
          </details>
        </li>`;
}

/** Item de feature na árvore da barra lateral, com as stories aninhadas. */
function sidebarFeatureItem(node) {
  const f = node.feature;
  const fid = typeof f.id === 'string' ? f.id : '';
  const fname =
    typeof f.name === 'string' && f.name.trim()
      ? f.name
      : typeof f.title === 'string' && f.title.trim()
        ? f.title
        : fid;
  const storiesHtml = (node.stories ?? []).map(sidebarStoryItem).join('');
  return `<li class="tree-feature">
        <details class="tree-details tree-details--feature">
          <summary class="tree-summary tree-summary--feature"><span class="tree-chevron" aria-hidden="true">▸</span><a class="nav-link tree-nav-link tree-nav-link--feature" href="#${escapeHtml(anchorFeature(fid))}" onclick="event.stopPropagation()"><span class="tree-feature-id">${escapeHtml(fid)}</span><span class="tree-name-small">${escapeHtml(fname)}</span></a></summary>
          <ul class="tree-list tree-list--stories">${storiesHtml || '<li class="tree-empty">Sem stories nesta feature</li>'}</ul>
        </details>
      </li>`;
}

/**
 * Árvore Epic → Feature → Story → Task da barra lateral. Usa o MESMO `buildBacklogTree` do corpo
 * do relatório: se a barra lateral e o corpo agrupassem por caminhos diferentes, um item podia
 * aparecer sob a Feature no corpo e como órfão na navegação — divergência silenciosa e difícil de
 * notar, do tipo que já ocorreu neste arquivo com `name` vs `title`.
 */
function renderSidebarTreeWithFeatures(epics, features, stories) {
  const { epicNodes, orphanFeatures, orphanStories } = buildBacklogTree(epics, features, stories);

  const epicBlocks = epicNodes.map((node) => {
    const e = node.epic;
    const eid = typeof e.id === 'string' ? e.id : '';
    const ename = typeof e.name === 'string' ? e.name : (typeof e.title === 'string' ? e.title : eid);
    const inner = [
      ...node.features.map(sidebarFeatureItem),
      ...node.directStories.map(sidebarStoryItem)
    ].join('');
    return `<li class="tree-epic">
        <details class="tree-details tree-details--epic" open>
          <summary class="tree-summary tree-summary--epic"><span class="tree-chevron" aria-hidden="true">▾</span><a class="nav-link tree-nav-link tree-nav-link--epic" href="#${escapeHtml(anchorEpic(eid))}" onclick="event.stopPropagation()"><span class="tree-epic-id">${escapeHtml(eid)}</span><span class="tree-name">${escapeHtml(ename)}</span></a></summary>
          <ul class="tree-list tree-list--features">${inner || '<li class="tree-empty">Sem features neste epic</li>'}</ul>
        </details>
      </li>`;
  }).join('');

  // Feature sem Epic: ou o documento não tem epics, ou o vínculo não resolveu. Nos dois casos a
  // feature aparece no primeiro nível da árvore — nunca sumida.
  const orphanFeatureBlocks = orphanFeatures.length
    ? (epics.length
        ? `<li class="tree-epic">
        <details class="tree-details tree-details--epic">
          <summary class="tree-summary tree-summary--epic tree-summary--orphan"><span class="tree-chevron" aria-hidden="true">▾</span><a class="nav-link tree-nav-link tree-nav-link--epic" href="#features-sem-epic" onclick="event.stopPropagation()"><span class="tree-epic-id">OUTRAS</span><span class="tree-name">Features sem Epic</span></a></summary>
          <ul class="tree-list tree-list--features">${orphanFeatures.map(sidebarFeatureItem).join('')}</ul>
        </details>
      </li>`
        : orphanFeatures.map(sidebarFeatureItem).join(''))
    : '';

  const orphanStoryBlock = orphanStories.length
    ? `<li class="tree-epic">
        <details class="tree-details tree-details--epic">
          <summary class="tree-summary tree-summary--epic tree-summary--orphan"><span class="tree-chevron" aria-hidden="true">▾</span><a class="nav-link tree-nav-link tree-nav-link--epic" href="#${escapeHtml(epics.length ? 'stories-sem-epic' : 'stories-sem-feature')}" onclick="event.stopPropagation()"><span class="tree-epic-id">OUTRAS</span><span class="tree-name">${escapeHtml(epics.length ? 'Stories sem Epic' : 'Stories sem Feature')}</span></a></summary>
          <ul class="tree-list tree-list--stories">${orphanStories.map(sidebarStoryItem).join('')}</ul>
        </details>
      </li>`
    : '';

  return epicBlocks + orphanFeatureBlocks + orphanStoryBlock;
}

/** @param {Record<string, unknown>} m */
function renderStatsStrip(m) {
  const items = [
    ['Histórias', m.totalStories],
    ['Tarefas', m.totalTasks],
    ['Subtarefas', m.totalSubtasks],
    ['Dias (est.)', m.estimatedDaysOfWork],
    ['Lacunas', m.totalGaps],
  ];
  const cells = items
    .map(([label, val]) => {
      const n = typeof val === 'number' ? val : '—';
      return `<div class="stat"><span class="stat__value">${escapeHtml(String(n))}</span><span class="stat__label">${escapeHtml(
        label
      )}</span></div>`;
    })
    .join('');
  return `<div class="stats-strip">${cells}</div>`;
}

/** @param {string} id @param {string} title @param {string} inner */
function sectionWrap(id, title, inner) {
  const headingId = `heading-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  return `<section id="${escapeHtml(id)}" class="section" aria-labelledby="${escapeHtml(headingId)}">
    <h2 class="section__title" id="${escapeHtml(headingId)}">${escapeHtml(title)}</h2>
    <div class="section__body">${inner}</div>
  </section>`;
}

/** @param {Record<string, unknown>} m */
function renderMetadataBlock(m) {
  const rows = [
    ['projectVersion', m.projectVersion],
    ['visionDocumentFile', m.visionDocumentFile],
    ['gapsDocumentFile', m.gapsDocumentFile],
    ['generatedAt', m.generatedAt],
    ['skillVersion', m.skillVersion],
    ['codebaseRoots', Array.isArray(m.codebaseRoots) ? m.codebaseRoots.join(', ') : ''],
  ];
  const listRows = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(
      ([k, v]) =>
        `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(typeof v === 'string' ? v : JSON.stringify(v))}</td></tr>`
    )
    .join('');

  const rules = asStrArray(m.rulesApplied)
    .map((r) => `<li><span class="pill pill--rule">${escapeHtml(r)}</span></li>`)
    .join('');
  const docs = asStrArray(
    /** @type {unknown} */ (m.complementaryDocuments)
  )
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('');

  // changeLog (v1.2+)
  const changes = asObjArray(m.changeLog);
  const changeLogHtml = changes.length
    ? `<h3 class="card__h">Histórico de alterações</h3><ul class="simple-list">${changes
        .map((c) => {
          const ver = typeof c.version === 'string' ? c.version : '';
          const date = typeof c.date === 'string' ? c.date : '';
          const sum = typeof c.summary === 'string' ? c.summary : '';
          return `<li><strong>${escapeHtml(ver)}</strong>${date ? ` <em>(${escapeHtml(date)})</em>` : ''}${sum ? ` — ${escapeHtml(sum)}` : ''}</li>`;
        })
        .join('')}</ul>`
    : '';

  // sourceDocuments (objeto com paths) — antes não exibido
  const srcDocs = isObj(m.sourceDocuments) ? m.sourceDocuments : null;
  const srcDocsHtml = srcDocs
    ? `<h3 class="card__h">Documentos-fonte</h3><ul class="simple-list">${Object.entries(srcDocs)
        .filter(([, v]) => v != null && String(v).length > 0)
        .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> <code>${escapeHtml(String(v))}</code></li>`)
        .join('')}</ul>`
    : '';

  return `<div class="card card--glass">
    <table class="meta-table"><tbody>${listRows}</tbody></table>
    ${changeLogHtml}
    ${srcDocsHtml}
    ${
      rules
        ? `<h3 class="card__h">Regras aplicadas</h3><ul class="tag-list">${rules}</ul>`
        : ''
    }
    ${
      docs
        ? `<h3 class="card__h">Documentos complementares</h3><ul class="simple-list">${docs}</ul>`
        : ''
    }
  </div>`;
}

/** @param {Record<string, unknown>} c */
function renderCompleteness(c) {
  const req = asObjArray(c.requirementsCovered);
  const crossOk = asObjArray(c.crossCuttingCovered);
  const crossNo = asObjArray(c.crossCuttingDismissed);
  const blocked = asObjArray(c.itemsBlockedByGap);
  const outScope = asObjArray(c.itemsExplicitlyOutOfScope);
  const noTask = asStrArray(c.itemsWithoutTask);
  const notes = asStrArray(c.auditNotes);

  const reqRows = req
    .map((r) => {
      const id = typeof r.id === 'string' ? r.id : '';
      const sids = asStrArray(r.storyIds).join(', ');
      const tids = asStrArray(r.taskIds).join(', ');
      return `<tr><td><code>${escapeHtml(id)}</code></td><td>${escapeHtml(sids)}</td><td>${escapeHtml(tids)}</td></tr>`;
    })
    .join('');

  const crossRows = crossOk
    .map((r) => {
      const concern = typeof r.concern === 'string' ? r.concern : '';
      const tids = asStrArray(r.taskIds).join(', ');
      return `<tr><td>${escapeHtml(concern)}</td><td>${escapeHtml(tids)}</td></tr>`;
    })
    .join('');

  const dismissRows = crossNo
    .map((r) => {
      const concern = typeof r.concern === 'string' ? r.concern : '';
      const reason = typeof r.reason === 'string' ? r.reason : '';
      return `<tr><td>${escapeHtml(concern)}</td><td>${escapeHtml(reason)}</td></tr>`;
    })
    .join('');

  const blockedRows = blocked
    .map((r) => {
      const item = typeof r.requirementOrItemId === 'string' ? r.requirementOrItemId : '';
      const sec = typeof r.section === 'string' ? r.section : '';
      const gap = typeof r.gapId === 'string' ? r.gapId : '';
      return `<tr><td>${escapeHtml(item)}</td><td>${escapeHtml(sec)}</td><td><span class="pill pill--gap">${escapeHtml(
        gap
      )}</span></td></tr>`;
    })
    .join('');

  const outRows = outScope
    .map((r) => {
      const d = typeof r.description === 'string' ? r.description : '';
      const sec = typeof r.section === 'string' ? r.section : '';
      return `<tr><td>${escapeHtml(d)}</td><td>${escapeHtml(sec)}</td></tr>`;
    })
    .join('');

  return `
    <div class="grid-2">
      <div class="card">
        <h3 class="card__h">Requisitos cobertos</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Stories</th><th>Tasks</th></tr></thead>
            <tbody>${reqRows || '<tr><td colspan="3">—</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <h3 class="card__h">Cross-cutting cobertos</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Preocupação</th><th>Tasks</th></tr></thead>
            <tbody>${crossRows || '<tr><td colspan="2">—</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="card mt">
      <h3 class="card__h">Cross-cutting dispensados</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Preocupação</th><th>Motivo</th></tr></thead>
          <tbody>${dismissRows || '<tr><td colspan="2">—</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="card mt">
      <h3 class="card__h">Itens bloqueados por lacuna</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Item</th><th>Seção</th><th>Gap</th></tr></thead>
          <tbody>${blockedRows || '<tr><td colspan="3">—</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="card mt">
      <h3 class="card__h">Explicitamente fora do escopo</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Descrição</th><th>Seção</th></tr></thead>
          <tbody>${outRows || '<tr><td colspan="2">—</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    ${
      noTask.length
        ? `<div class="card mt"><h3 class="card__h">Sem tarefa</h3><ul class="simple-list">${noTask
            .map((x) => `<li>${escapeHtml(x)}</li>`)
            .join('')}</ul></div>`
        : ''
    }
    ${
      notes.length
        ? `<div class="card mt card--notes"><h3 class="card__h">Notas de auditoria</h3><ul class="simple-list">${notes
            .map((x) => `<li>${escapeHtml(x)}</li>`)
            .join('')}</ul></div>`
        : ''
    }
  `;
}

/** Normaliza campos v3↔v4 ao nível da task (alias e fallbacks).
 * @param {Record<string, unknown>} task
 */
function normTaskSchema(task) {
  if (!isObj(task)) return task;
  const out = { ...task };
  if (out.durationEstimatedDays == null && typeof out.estimatedDays === 'number') {
    out.durationEstimatedDays = out.estimatedDays;
  }
  // technicalRules ← technicalConstraints (lista de strings v3 → objetos {id,description})
  if ((!Array.isArray(out.technicalRules) || out.technicalRules.length === 0) && Array.isArray(out.technicalConstraints)) {
    out.technicalRules = out.technicalConstraints.map((c, i) => {
      if (isObj(c)) return c;
      return { id: `TC-${i + 1}`, description: String(c), exactConstraint: '' };
    });
  }
  // implementationSteps ← implementationNotes
  if ((!Array.isArray(out.implementationSteps) || out.implementationSteps.length === 0) && Array.isArray(out.implementationNotes)) {
    out.implementationSteps = out.implementationNotes.map(String);
  }
  // validation ← testScenarios v3 (split em unit/functional/e2e/load)
  const hasV4Validation = isObj(out.validation) && Object.keys(out.validation).length > 0;
  const ts = isObj(out.testScenarios) ? out.testScenarios : null;
  if (!hasV4Validation && ts) {
    out.validation = {
      unitTestScenarios: normScenariosV3toV4(ts.unit),
      functionalTestScenarios: normScenariosV3toV4(ts.functional),
      e2eTestScenarios: normScenariosV3toV4(ts.e2e),
      loadTestScenarios: normScenariosV3toV4(ts.load),
    };
  }
  if (Array.isArray(out.validations)) {
    const validation = isObj(out.validation) ? { ...out.validation } : {};
    if (!Array.isArray(validation.fieldValidations) || validation.fieldValidations.length === 0) {
      validation.fieldValidations = out.validations;
    }
    out.validation = validation;
  }
  return out;
}

/** Normaliza array de cenários v3 ({scenario, expectedResult, type}) para v4 ({description, category, given/when/then}).
 * Aceita tanto strings quanto objetos; preserva fields desconhecidos.
 * @param {unknown} arr
 */
function normScenariosV3toV4(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => {
    if (typeof s === 'string') return { description: s, category: '' };
    if (!isObj(s)) return s;
    const out = { ...s };
    if (out.description == null && typeof out.scenario === 'string') out.description = out.scenario;
    if (out.category == null && typeof out.type === 'string') out.category = String(out.type).toUpperCase();
    if (out.then == null && typeof out.expectedResult === 'string') out.then = out.expectedResult;
    return out;
  });
}

/** Normaliza campos v3↔v4 ao nível da story.
 * @param {Record<string, unknown>} story
 */
function normStorySchema(story) {
  if (!isObj(story)) return story;
  const out = { ...story };
  if (out.name == null && typeof out.title === 'string') out.name = out.title;
  if (out.description == null && typeof out.context === 'string') out.description = out.context;
  return out;
}

/** Renderiza um valor heterogêneo (string, número, array, objeto) preservando estrutura. */
function renderHeteroValue(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return escapeHtml(String(v));
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return `<ul class="simple-list">${v.map((x) => `<li>${escapeHtml(String(x))}</li>`).join('')}</ul>`;
    }
    try {
      return `<pre class="json-block__pre"><code>${escapeHtml(JSON.stringify(v, null, 2))}</code></pre>`;
    } catch {
      return escapeHtml(String(v));
    }
  }
  if (isObj(v)) {
    try {
      return `<pre class="json-block__pre"><code>${escapeHtml(JSON.stringify(v, null, 2))}</code></pre>`;
    } catch {
      return escapeHtml(String(v));
    }
  }
  return escapeHtml(String(v));
}

/** @param {Record<string, unknown>} b */
function renderBusinessRuleLi(b) {
  const id = typeof b.id === 'string' ? b.id : '';
  const desc = typeof b.description === 'string' ? b.description : '';
  const cond = typeof b.condition === 'string' ? b.condition : '';
  const pri = typeof b.priority === 'string' ? b.priority : '';
  const sv = isObj(b.sourceVd) ? b.sourceVd : null;
  const exc = asStrArray(b.exceptions);
  const conf = asStrArray(b.conflictsWith);
  // alias v3: campo "fonte" (pt-BR) para origem da regra quando sourceVd não está presente
  const fonteStr = !sv && typeof b.fonte === 'string' ? b.fonte : '';
  // exactValue pode ser string, número, array ou objeto — preservar estrutura
  const exactRaw = b.exactValue;
  const hasExact = exactRaw != null && exactRaw !== '';
  const exactIsScalar = typeof exactRaw === 'string' || typeof exactRaw === 'number' || typeof exactRaw === 'boolean';
  const exactInline = hasExact && exactIsScalar
    ? `<span class="br-meta"><strong>Valor:</strong> ${escapeHtml(String(exactRaw))}</span>`
    : '';
  const exactBlock = hasExact && !exactIsScalar
    ? `<div class="br-exact-block"><strong>Valor:</strong> ${renderHeteroValue(exactRaw)}</div>`
    : '';

  const extras = [
    cond ? `<span class="br-meta"><strong>Condição:</strong> ${escapeHtml(cond)}</span>` : '',
    exactInline,
    sv
      ? `<span class="br-meta"><strong>DV:</strong> §${escapeHtml(String(sv.section || ''))} · ${escapeHtml(
          String(sv.itemId || '')
        )} — ${escapeHtml(String(sv.excerpt || ''))}</span>`
      : '',
    fonteStr ? `<span class="br-meta"><strong>Fonte:</strong> ${escapeHtml(fonteStr)}</span>` : '',
    exc.length ? `<span class="br-meta"><strong>Exceções:</strong> ${escapeHtml(exc.join('; '))}</span>` : '',
    conf.length ? `<span class="br-meta"><strong>Conflita com:</strong> ${escapeHtml(conf.join(', '))}</span>` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<li>
    <code>${escapeHtml(id)}</code>${pri ? ` <span class="pill pill--tiny">${escapeHtml(pri)}</span>` : ''} — ${escapeHtml(desc)}
    ${extras ? `<div class="br-extras">${extras}</div>` : ''}
    ${exactBlock}
  </li>`;
}

/** @param {unknown} b */
function renderBusinessRuleItem(b) {
  if (typeof b === 'string') {
    return `<li>${escapeHtml(b)}</li>`;
  }
  if (isObj(b)) {
    return renderBusinessRuleLi(b);
  }
  return '';
}

/** @param {string} title @param {string} bodyHtml @param {{ open?: boolean, count?: number }} [opts] */
function renderBizPanel(title, bodyHtml, opts = {}) {
  const trimmed = (bodyHtml ?? '').trim();
  if (!trimmed) return '';
  const open = opts.open ? ' open' : '';
  const count =
    opts.count != null
      ? `<span class="biz-panel__badge">${escapeHtml(String(opts.count))}</span>`
      : '';
  return `<details class="biz-panel"${open}>
    <summary class="biz-panel__summary"><span class="biz-panel__title">${escapeHtml(title)}</span>${count}</summary>
    <div class="biz-panel__body">${trimmed}</div>
  </details>`;
}
/** @param {Record<string, unknown>|null|undefined} narrative @param {string} heading */
const NARRATIVE_CONTEXT_TRUNCATE = 480;

/** @param {string} text @param {string} anchorId */
function renderTruncatedParagraph(text, anchorId) {
  if (!text) return '';
  if (text.length <= NARRATIVE_CONTEXT_TRUNCATE) {
    return `<p class="biz-narrative__context">${escapeHtml(text)}</p>`;
  }
  const short = text.slice(0, NARRATIVE_CONTEXT_TRUNCATE).trimEnd() + '…';
  const fullId = `narrative-full-${anchorId}`;
  return `<p class="biz-narrative__context">
    <span class="biz-narrative__context-short">${escapeHtml(short)}</span>
    <span id="${escapeHtml(fullId)}" class="biz-narrative__context-full" hidden>${escapeHtml(text)}</span>
    <button type="button" class="biz-narrative__expand" data-expand-target="${escapeHtml(fullId)}" aria-expanded="false">Expandir contexto</button>
  </p>`;
}

/** @param {Record<string, unknown>|null|undefined} narrative @param {string} anchorId */
function renderNarrativeInner(narrative, anchorId = '') {
  if (!isObj(narrative)) return '';
  const elevator = typeof narrative.elevatorPitch === 'string' ? narrative.elevatorPitch : '';
  const ctx = typeof narrative.context === 'string' ? narrative.context : '';
  const problem = typeof narrative.problem === 'string' ? narrative.problem : '';
  const value = typeof narrative.deliveredValue === 'string' ? narrative.deliveredValue : '';
  const actors = asStrArray(narrative.actors);
  const mainFlow = asStrArray(narrative.mainFlow);
  const impact = typeof narrative.operationalImpact === 'string' ? narrative.operationalImpact : '';
  const regulatory = typeof narrative.regulatoryContext === 'string' ? narrative.regulatoryContext : '';
  const us = typeof narrative.userStoryStatement === 'string' ? narrative.userStoryStatement : '';
  if (!ctx && !problem && !value && !us && !elevator) return '';
  const complement =
    elevator && ctx && ctx.length > elevator.length + 20 ? ctx.replace(elevator, '').trim() : '';
  const metaCards = [
    problem ? `<div class="biz-meta-card biz-meta-card--problem"><span class="biz-meta-card__label">Problema</span><p>${escapeHtml(problem)}</p></div>` : '',
    value ? `<div class="biz-meta-card biz-meta-card--value"><span class="biz-meta-card__label">Valor entregue</span><p>${escapeHtml(value)}</p></div>` : '',
    actors.length ? `<div class="biz-meta-card biz-meta-card--actors"><span class="biz-meta-card__label">Atores</span><p>${actors.map((a) => escapeHtml(a)).join(', ')}</p></div>` : ''
  ].filter(Boolean).join('');
  const footnotes = impact || regulatory
    ? `<div class="biz-narrative__footnotes">${impact ? `<p><strong>Impacto:</strong> ${escapeHtml(impact)}</p>` : ''}${regulatory ? `<p><strong>Regulatório:</strong> ${escapeHtml(regulatory)}</p>` : ''}</div>`
    : '';
  return `<div class="biz-narrative">
    ${us ? `<blockquote class="biz-narrative__us">${escapeHtml(us)}</blockquote>` : ''}
    ${elevator ? `<div class="biz-elevator"><span class="biz-elevator__label">Elevator pitch</span><p class="biz-elevator__text">${escapeHtml(elevator)}</p></div>` : ''}
    ${complement ? `<div class="biz-complement"><span class="biz-complement__label">Complemento</span>${renderTruncatedParagraph(complement, `${anchorId || 'ctx'}-comp`)}</div>` : !elevator && ctx ? renderTruncatedParagraph(ctx, anchorId || 'ctx') : ''}
    ${metaCards ? `<div class="biz-narrative__grid">${metaCards}</div>` : ''}
    ${mainFlow.length ? `<div class="biz-flow"><span class="biz-flow__label">Fluxo principal</span><ol class="biz-flow-list">${mainFlow.map((step, i) => `<li><span class="biz-flow-list__n">${i + 1}</span>${escapeHtml(step)}</li>`).join('')}</ol></div>` : ''}
    ${footnotes}
  </div>`;
}

function renderNarrativeBlock(narrative, _heading = 'Narrativa de negócio', anchorId = '') {
  return renderNarrativeInner(narrative, anchorId);
}

/** @param {unknown[]} deliveryScope */
function renderDeliveryScopeInner(deliveryScope) {
  const list = asObjArray(deliveryScope);
  if (!list.length) return '';
  return `<ul class="delivery-scope-grid">${list
    .map((d) => {
      const tid = typeof d.taskId === 'string' ? d.taskId : '';
      const title = typeof d.title === 'string' ? d.title : '';
      const outcome = typeof d.businessOutcome === 'string' ? d.businessOutcome : '';
      return `<li class="delivery-scope-card">
        <span class="delivery-scope-card__id">${escapeHtml(tid)}</span>
        <h5 class="delivery-scope-card__title">${escapeHtml(title)}</h5>
        <p class="delivery-scope-card__outcome">${escapeHtml(outcome)}</p>
      </li>`;
    })
    .join('')}</ul>`;
}

/** @param {unknown[]} criteria */
function renderAcceptanceCriteriaInner(criteria, idPrefix = '') {
  // `asObjArray` sozinho DESCARTAVA critérios em forma de STRING — forma abreviada aceita pelo
  // schema e emitida em artefatos reais. O painel "Critérios de aceite" aparecia vazio sem
  // nenhum aviso. Normalizar string → {statement} mantém o resto do render intocado.
  const list = normalizeCriteriaList(criteria, idPrefix);
  if (!list.length) return '';
  return `<ul class="biz-criteria-list">${list
      .map((ac) => {
        const id = typeof ac.id === 'string' ? ac.id : '';
        const cat = typeof ac.category === 'string' ? ac.category : '';
        const statement = typeof ac.statement === 'string' ? ac.statement : '';
        const given = typeof ac.given === 'string' ? ac.given : '';
        const when = typeof ac.when === 'string' ? ac.when : '';
        const then = Array.isArray(ac.then) ? ac.then.join('; ') : typeof ac.then === 'string' ? ac.then : '';
        const rules = asStrArray(ac.relatedRuleIds);
        if (statement) {
          return `<li class="biz-criterion">
            ${id ? `<span class="biz-criterion__id"><code>${escapeHtml(id)}</code>${cat ? ` <span class="pill pill--tiny">${escapeHtml(cat)}</span>` : ''}</span>` : ''}
            <p class="biz-criterion__statement">${escapeHtml(statement)}</p>
            ${rules.length ? `<p class="biz-criterion__rules"><strong>Regras:</strong> ${rules.map((r) => `<code>${escapeHtml(r)}</code>`).join(' ')}</p>` : ''}
          </li>`;
        }
        return `<li class="bdd-item">
          ${id ? `<span class="bdd-id"><code>${escapeHtml(id)}</code>${cat ? ` <span class="pill pill--tiny">${escapeHtml(cat)}</span>` : ''}</span>` : ''}
          <div class="bdd-gwt">
            <div><span class="bdd-label">Dado</span> ${escapeHtml(given)}</div>
            <div><span class="bdd-label">Quando</span> ${escapeHtml(when)}</div>
            <div><span class="bdd-label">Então</span> ${escapeHtml(then)}</div>
          </div>
          ${rules.length ? `<p class="bdd-rules"><strong>Regras:</strong> ${rules.map((r) => `<code>${escapeHtml(r)}</code>`).join(' ')}</p>` : ''}
        </li>`;
      })
      .join('')}</ul>`;
}

/** @param {unknown[]} criteria @param {string} heading */
function renderAcceptanceCriteriaSection(criteria, heading = 'Critérios de aceite') {
  const inner = renderAcceptanceCriteriaInner(criteria);
  if (!inner) return '';
  return `<section class="biz-acceptance"><h4 class="story-subh">${escapeHtml(heading)}</h4>${inner}</section>`;
}

/** @param {unknown[]} rules */
function renderBusinessRulesInner(rules) {
  const list = asArray(rules);
  if (!list.length) return '';
  return `<ul class="br-story-list">${list.map((b) => renderBusinessRuleItem(b)).join('')}</ul>`;
}

/** @param {unknown[]} rules @param {string} heading */
function renderBusinessRulesSection(rules, heading = 'Regras de negócio') {
  const inner = renderBusinessRulesInner(rules);
  if (!inner) return '';
  return `<section class="biz-rules"><h4 class="story-subh">${escapeHtml(heading)}</h4>${inner}</section>`;
}

/**
 * Critérios de aceite nas TRÊS formas em uso — objeto {id, statement}, string solta e o legado
 * `businessSummary.storyAcceptanceCriteria[]`. Normaliza tudo para objeto com `statement`.
 * @param {unknown} criteria
 * @param {string} [idPrefix] usado para dar id aos critérios que vêm sem id (forma string)
 */
function normalizeCriteriaList(criteria, idPrefix = '') {
  if (!Array.isArray(criteria)) return [];
  return criteria
    .map((c, i) => {
      if (typeof c === 'string') {
        const text = c.trim();
        if (!text) return null;
        // "AC-X-01 — texto" → separa id do enunciado quando a string já traz o id embutido.
        const m = /^([A-Z][A-Z0-9-]{2,})\s*[—–-]\s*(.+)$/s.exec(text);
        return m ? { id: m[1], statement: m[2].trim() } : { id: idPrefix ? `${idPrefix}-${i + 1}` : '', statement: text };
      }
      if (!isObj(c)) return null;
      return c;
    })
    .filter(Boolean);
}

/**
 * Rótulos legíveis das chaves conhecidas de `traceability`, quando ele vem como OBJETO.
 * GÊMEO de ../../spec-tasks-azure/lib/ado-narrative-html.mjs → traceabilityHtml().
 */
const TRACE_LABELS = {
  rf: 'Requisito funcional (RF)',
  rnf: 'Requisito não funcional (RNF)',
  productRequirement: 'Requisito de produto (PR)',
  requirementIds: 'Requisitos',
  ruleIds: 'Regras de negócio (RN)',
  relatedRuleIds: 'Regras de negócio (RN)',
  sourceStoryIds: 'Histórias de origem',
  sourceTaskIds: 'Tarefas de origem',
  legalBasis: 'Base legal',
  section: 'Seção',
  itemId: 'Item',
  excerpt: 'Trecho',
  document: 'Documento'
};

/**
 * `traceability` nas DUAS formas emitidas pelo pipeline.
 *
 * DEFEITO CORRIGIDO: `asObjArray(story.traceability)` devolve `[]` para qualquer valor que não
 * seja array — e o schema emite `traceability` como OBJETO (`{rf, productRequirement}` na story,
 * `{sourceStoryIds, sourceTaskIds}` após o enriquecimento). O painel simplesmente não aparecia,
 * sem nenhum aviso. Idem no bloco da task.
 * @param {unknown} trace
 * @returns {{html:string, count:number}}
 */
function renderTraceabilityInner(trace) {
  if (Array.isArray(trace)) {
    const items = asObjArray(trace);
    if (!items.length) return { html: '', count: 0 };
    const lis = items
      .map((tr) => {
        const head = [
          tr.section || tr.document ? escapeHtml(String(tr.section || tr.document)) : '',
          tr.itemId ? `<code>${escapeHtml(String(tr.itemId))}</code>` : ''
        ]
          .filter(Boolean)
          .join(' · ');
        const body = tr.excerpt ? ` — ${escapeHtml(String(tr.excerpt))}` : '';
        const line = `${head}${body}`.trim();
        return line ? `<li>${line}</li>` : '';
      })
      .filter(Boolean);
    return { html: lis.length ? `<ul class="compact-list">${lis.join('')}</ul>` : '', count: lis.length };
  }
  if (!isObj(trace)) return { html: '', count: 0 };
  const lis = Object.entries(trace)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === '') return '';
      const label = TRACE_LABELS[key] ?? key;
      let rendered;
      if (Array.isArray(value)) {
        const flat = value.map((v) => (isObj(v) ? JSON.stringify(v) : String(v))).map((v) => v.trim()).filter(Boolean);
        if (!flat.length) return '';
        rendered = flat.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ');
      } else if (isObj(value)) {
        rendered = `<code>${escapeHtml(JSON.stringify(value))}</code>`;
      } else {
        rendered = escapeHtml(String(value));
      }
      return `<li><strong>${escapeHtml(String(label))}:</strong> ${rendered}</li>`;
    })
    .filter(Boolean);
  return { html: lis.length ? `<ul class="compact-list">${lis.join('')}</ul>` : '', count: lis.length };
}

/** `sourceRefs[]` — de onde veio o negócio deste nível ({document, section, itemId}). */
function renderSourceRefsInner(refs) {
  const items = asObjArray(refs).filter((r) => r.document || r.itemId);
  if (!items.length) return { html: '', count: 0 };
  const lis = items.map((r) => {
    const parts = [
      r.itemId ? `<code>${escapeHtml(String(r.itemId))}</code>` : '',
      r.document ? escapeHtml(String(r.document)) : '',
      r.section ? `§ ${escapeHtml(String(r.section))}` : ''
    ].filter(Boolean);
    return parts.length ? `<li>${parts.join(' · ')}</li>` : '';
  }).filter(Boolean);
  return { html: lis.length ? `<ul class="compact-list">${lis.join('')}</ul>` : '', count: lis.length };
}

/**
 * Bloco de negócio da story a partir do LEGADO `businessSummary` (schema v5.0), usado quando a
 * story não tem `narrative`/`acceptanceCriteria`.
 *
 * DEFEITO CORRIGIDO: este renderer lia apenas as chaves v5.3. Num documento v5.0 — que só tem
 * `businessSummary` — o relatório saía com TODOS os painéis de negócio vazios: sem problema, sem
 * valor entregue, sem atores, sem fluxo e sem critérios. O gêmeo do ADO já tinha esse fallback
 * (buildStoryNarrativeHtml lê `businessSummary`), então o mesmo documento publicava com negócio
 * no ADO e sem negócio no HTML.
 * @param {unknown} bs
 */
function renderBusinessSummaryInner(bs) {
  if (!isObj(bs)) return '';
  const flow = asStrArray(bs.businessFlowSummary);
  const rows = [
    ['Problema', typeof bs.problem === 'string' ? bs.problem : ''],
    ['Valor entregue', typeof bs.deliveredValue === 'string' ? bs.deliveredValue : ''],
    ['Atores', asStrArray(bs.actors).join(', ')],
    ['Fluxo (resumo)', flow.join(' → ')]
  ]
    .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
    .map(([k, v]) => `<p><strong>${escapeHtml(String(k))}:</strong> ${escapeHtml(String(v))}</p>`)
    .join('');
  return rows;
}

// ─── Painéis por tipo operacional (EloCore) ──────────────────────────────────
// Spike, Dívida Técnica e Defeito: `story.workItemType` decide qual painel aparece. Chamados em
// renderStoryBizPanels; sem estas definições o módulo quebra com ReferenceError.

/** @param {Record<string, unknown>} spikeDetails */
function renderSpikeDetailsInner(spikeDetails) {
  if (!isObj(spikeDetails)) return '';
  const question = typeof spikeDetails.question === 'string' ? spikeDetails.question : '';
  const timebox = typeof spikeDetails.timebox === 'string' ? spikeDetails.timebox : '';
  const outcome = typeof spikeDetails.expectedOutcome === 'string' ? spikeDetails.expectedOutcome : '';
  const rows = [];
  if (question) rows.push(`<tr><td><strong>Questão:</strong></td><td>${escapeHtml(question)}</td></tr>`);
  if (timebox) rows.push(`<tr><td><strong>Timebox:</strong></td><td>${escapeHtml(timebox)}</td></tr>`);
  if (outcome) rows.push(`<tr><td><strong>Resultado esperado:</strong></td><td>${escapeHtml(outcome)}</td></tr>`);
  if (!rows.length) return '';
  return `<table class="detail-table">${rows.join('')}</table>`;
}

/** @param {Record<string, unknown>} techDebtDetails */
function renderTechnicalDebtDetailsInner(techDebtDetails) {
  if (!isObj(techDebtDetails)) return '';
  const limitation = typeof techDebtDetails.limitation === 'string' ? techDebtDetails.limitation : '';
  const impact = typeof techDebtDetails.currentImpact === 'string' ? techDebtDetails.currentImpact : '';
  const improvement = typeof techDebtDetails.improvementAfterFix === 'string' ? techDebtDetails.improvementAfterFix : '';
  const rows = [];
  if (limitation) rows.push(`<tr><td><strong>Limitação:</strong></td><td>${escapeHtml(limitation)}</td></tr>`);
  if (impact) rows.push(`<tr><td><strong>Impacto atual:</strong></td><td>${escapeHtml(impact)}</td></tr>`);
  if (improvement) rows.push(`<tr><td><strong>Melhoria após correção:</strong></td><td>${escapeHtml(improvement)}</td></tr>`);
  if (!rows.length) return '';
  return `<table class="detail-table">${rows.join('')}</table>`;
}

/** @param {Record<string, unknown>} bugReport */
function renderBugReportInner(bugReport) {
  if (!isObj(bugReport)) return '';
  const observed = typeof bugReport.observedBehavior === 'string' ? bugReport.observedBehavior : '';
  const repro = typeof bugReport.reproductionSteps === 'string' ? bugReport.reproductionSteps : '';
  const current = typeof bugReport.currentResult === 'string' ? bugReport.currentResult : '';
  const expected = typeof bugReport.expectedResult === 'string' ? bugReport.expectedResult : '';
  const rows = [];
  if (observed) rows.push(`<tr><td><strong>Comportamento observado:</strong></td><td>${escapeHtml(observed)}</td></tr>`);
  if (repro) rows.push(`<tr><td><strong>Passos para reproduzir:</strong></td><td>${escapeHtml(repro)}</td></tr>`);
  if (current) rows.push(`<tr><td><strong>Resultado atual:</strong></td><td>${escapeHtml(current)}</td></tr>`);
  if (expected) rows.push(`<tr><td><strong>Resultado esperado:</strong></td><td>${escapeHtml(expected)}</td></tr>`);
  if (!rows.length) return '';
  return `<table class="detail-table">${rows.join('')}</table>`;
}

/** @param {Record<string, unknown>} story */
function renderStoryBizPanels(story) {
  const id = typeof story.id === 'string' ? story.id : 'story';
  const narrative = isObj(story.narrative) ? story.narrative : null;
  const legacySummary = isObj(story.businessSummary) ? story.businessSummary : null;
  const deliveryScope = asObjArray(story.deliveryScope);
  // Critérios: v5.3 (`acceptanceCriteria`, objeto ou string) com fallback para o legado v5.0
  // (`businessSummary.storyAcceptanceCriteria[]`, sempre strings).
  const criteriaSource = Array.isArray(story.acceptanceCriteria) && story.acceptanceCriteria.length
    ? story.acceptanceCriteria
    : (legacySummary && Array.isArray(legacySummary.storyAcceptanceCriteria)
        ? legacySummary.storyAcceptanceCriteria
        : []);
  const ac = normalizeCriteriaList(criteriaSource, `AC-${id}`);
  const rules = asArray(story.businessRules);
  const strace = renderTraceabilityInner(story.traceability);
  const srefs = renderSourceRefsInner(story.sourceRefs);
  const risks = Array.isArray(story.risks) ? story.risks : [];

  // Narrativa v5.3 quando existe; senão o resumo legado v5.0 — nunca painel vazio quando há dado.
  const narrativeInner = renderNarrativeInner(narrative, slugify(id)) || renderBusinessSummaryInner(legacySummary);

  const panels = [
    renderBizPanel('Narrativa de negócio', narrativeInner),
    renderBizPanel('Escopo de entrega', renderDeliveryScopeInner(deliveryScope), {
      count: deliveryScope.length || undefined
    }),
    renderBizPanel('Critérios de aceite', renderAcceptanceCriteriaInner(criteriaSource, `AC-${id}`), {
      count: ac.length || undefined
    }),
    renderBizPanel('Regras de negócio', renderBusinessRulesInner(story.businessRules), {
      count: rules.length || undefined
    }),
    renderBizPanel('Contexto de UI', renderUiContextInner(story.uiContext)),
    strace.html ? renderBizPanel('Rastreabilidade', strace.html, { count: strace.count }) : '',
    srefs.html ? renderBizPanel('Origem na especificação', srefs.html, { count: srefs.count }) : '',
    risks.length
      ? renderBizPanel(
          'Riscos',
          `<ul class="simple-list">${risks
            .map((r) => {
              if (typeof r === 'string') return `<li>${escapeHtml(r)}</li>`;
              if (!isObj(r)) return '';
              const d = typeof r.description === 'string' ? r.description : '';
              const m = typeof r.mitigation === 'string' ? r.mitigation : '';
              return `<li><strong>${escapeHtml(d)}</strong>${m ? ` — <em>Mitigação:</em> ${escapeHtml(m)}` : ''}</li>`;
            })
            .filter(Boolean)
            .join('')}</ul>`,
          { count: risks.length }
        )
      : '',
    story.workItemType === 'SPIKE'
      ? renderBizPanel('Detalhes do Spike', renderSpikeDetailsInner(story.spikeDetails))
      : '',
    story.workItemType === 'TECHNICAL_DEBT'
      ? renderBizPanel('Detalhes da Dívida Técnica', renderTechnicalDebtDetailsInner(story.technicalDebtDetails))
      : '',
    story.workItemType === 'BUG'
      ? renderBizPanel('Relatório de Defeito', renderBugReportInner(story.bugReport))
      : ''
  ].filter(Boolean);

  if (!panels.length) return '';
  return `<div class="biz-panels biz-panels--story">${panels.join('')}</div>`;
}

/**
 * Painéis de negócio de Epic **e de Feature** — o mesmo conjunto para os dois níveis.
 *
 * O rótulo da narrativa é SENSÍVEL AO NÍVEL: era a string fixa "Narrativa do épico", o que faria
 * o cartão de módulo anunciar-se como épico. `level` decide o rótulo e nada mais; o default
 * `'epic'` mantém as chamadas antigas inalteradas.
 *
 * @param {Record<string, unknown>} epic  Epic ou Feature
 * @param {Record<string, unknown>[]} childStories
 * @param {'epic'|'feature'} [level]
 */
function renderEpicBizPanels(epic, childStories, level = 'epic') {
  const isFeature = level === 'feature';
  const narrativeLabel = isFeature ? 'Narrativa da feature' : 'Narrativa do épico';
  const eid = typeof epic.id === 'string' ? epic.id : 'epic';
  const outcomes = Array.isArray(epic.businessOutcomes) ? epic.businessOutcomes : [];
  const metrics = Array.isArray(epic.successMetrics) ? epic.successMetrics : [];
  const ac = asObjArray(epic.acceptanceCriteria);
  const rules = asArray(epic.businessRules);

  const outcomesInner =
    outcomes.length || metrics.length
      ? `<div class="epic-outcomes-grid">
          ${
            outcomes.length
              ? `<div class="epic-outcomes-col"><h5>Resultados</h5><ul>${outcomes.map((o) => `<li>${escapeHtml(String(o))}</li>`).join('')}</ul></div>`
              : ''
          }
          ${
            metrics.length
              ? `<div class="epic-outcomes-col"><h5>Métricas</h5><ul>${metrics
                  .map(
                    (m) =>
                      `<li><strong>${escapeHtml(typeof m.name === 'string' ? m.name : '')}</strong>: ${escapeHtml(typeof m.target === 'string' ? m.target : '')}</li>`
                  )
                  .join('')}</ul></div>`
              : ''
          }
        </div>`
      : '';

  // Painéis adicionais — SÓ no nível Feature, deliberadamente.
  //
  // `renderEpicBizPanels` também serve o caminho antigo (Epic → Story), e a regra de
  // retrocompatibilidade desta skill é dura: documento SEM `features[]` renderiza byte a byte
  // como antes. Acrescentar painel ao Epic mudaria a saída de todo relatório já existente que
  // tenha `epic.traceability`/`epic.sourceRefs`. A Feature é nível NOVO — nela não há saída
  // anterior para preservar. Estender ao Epic é decisão de uma próxima versão, não efeito
  // colateral desta.
  const trace = isFeature ? renderTraceabilityInner(epic.traceability) : { html: '', count: 0 };
  const refs = isFeature ? renderSourceRefsInner(epic.sourceRefs) : { html: '', count: 0 };
  const touchpoints = isFeature ? asArray(epic.touchpoints) : [];
  const dependencies = isFeature ? asArray(epic.dependencies) : [];

  /** Lista simples tolerante a string e a objeto ({name/title/description}). */
  const simpleListInner = (items) => {
    const lis = items
      .map((it) => {
        if (typeof it === 'string') return it.trim() ? `<li>${escapeHtml(it)}</li>` : '';
        if (!isObj(it)) return '';
        const head = [it.id, it.name ?? it.title ?? it.tela ?? it.channel]
          .filter((v) => typeof v === 'string' && v.trim())
          .join(' — ');
        const body = [it.description, it.purpose, it.reason, it.type, it.kind]
          .filter((v) => typeof v === 'string' && v.trim())
          .join(' · ');
        if (!head && !body) return '';
        return `<li>${head ? `<strong>${escapeHtml(head)}</strong>` : ''}${head && body ? ' — ' : ''}${body ? escapeHtml(body) : ''}</li>`;
      })
      .filter(Boolean)
      .join('');
    return lis ? `<ul class="simple-list">${lis}</ul>` : '';
  };

  const touchpointsInner = simpleListInner(touchpoints);
  const dependenciesInner = simpleListInner(dependencies);

  const panels = [
    renderBizPanel(narrativeLabel, renderNarrativeInner(isObj(epic.narrative) ? epic.narrative : null, slugify(eid))),
    outcomesInner ? renderBizPanel('Resultados e métricas', outcomesInner) : '',
    renderBizPanel('Critérios de aceite', renderAcceptanceCriteriaInner(epic.acceptanceCriteria), {
      count: ac.length || undefined
    }),
    renderBizPanel('Regras de negócio', renderBusinessRulesInner(epic.businessRules), {
      count: rules.length || undefined
    }),
    touchpointsInner ? renderBizPanel('Pontos de contato', touchpointsInner, { count: touchpoints.length }) : '',
    dependenciesInner ? renderBizPanel('Dependências', dependenciesInner, { count: dependencies.length }) : '',
    trace.html ? renderBizPanel('Rastreabilidade', trace.html, { count: trace.count }) : '',
    refs.html ? renderBizPanel('Origem na especificação', refs.html, { count: refs.count }) : ''
  ].filter(Boolean);

  if (!panels.length) return '';
  return `<div class="biz-panels biz-panels--${isFeature ? 'feature' : 'epic'}">${panels.join('')}</div>`;
}

/** @param {unknown[]} risks */
function renderStoryRisks(risks) {
  if (!risks.length) return '';
  const items = risks
    .map((r) => {
      if (typeof r === 'string') return `<li>${escapeHtml(r)}</li>`;
      if (!isObj(r)) return '';
      const d = typeof r.description === 'string' ? r.description : '';
      const m = typeof r.mitigation === 'string' ? r.mitigation : '';
      return `<li><strong>${escapeHtml(d)}</strong>${m ? ` — <em>Mitigação:</em> ${escapeHtml(m)}` : ''}</li>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `<div class="story-risks"><h4 class="story-subh">Riscos</h4><ul class="simple-list">${items}</ul></div>`;
}

/** @param {string} title @param {string[]} lines */
function renderBullets(title, lines) {
  const clean = lines.map((s) => String(s).trim()).filter(Boolean);
  if (!clean.length) return '';
  return `<div class="task-section"><h5>${escapeHtml(title)}</h5><ul class="simple-list">${clean
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join('')}</ul></div>`;
}

/** @param {Record<string, unknown>} ctx */
function renderAgentExecutionContext(ctx) {
  if (!isObj(ctx)) return '';
  const summary = typeof ctx.selfContainedSummary === 'string' ? ctx.selfContainedSummary : '';
  const warn = asStrArray(ctx.criticalWarnings);
  const dont = asStrArray(ctx.doNotDo);
  const verify = asStrArray(ctx.verificationBeforeStart);
  const minOut = asStrArray(ctx.minimumOutputToDeliver);
  // Campos v3 antes silenciados:
  const codebaseEntry = typeof ctx.codebaseEntry === 'string' ? ctx.codebaseEntry : '';
  const suggested = typeof ctx.suggestedApproach === 'string' ? ctx.suggestedApproach : '';
  const pitfalls = asStrArray(ctx.knownPitfalls);
  const rulesAndPatterns = asStrArray(ctx.rulesAndPatterns);
  const refPaths = asStrArray(ctx.referencePaths);

  const summarySections = summary ? parseSelfContainedSummarySections(summary) : [];
  const summaryBlock = summarySections.length
    ? `<div class="task-callout task-callout--summary task-callout--structured"><h5>Resumo (contexto de execução)</h5><div class="summary-sections">${summarySections
        .map(
          (sec) =>
            `<section class="summary-section"><h6 class="summary-section__title">${escapeHtml(sec.heading)}</h6><div class="summary-section__body"><p>${escapeHtml(sec.body)}</p></div></section>`
        )
        .join('')}</div></div>`
    : '';

  const warnBlock =
    warn.length > 0
      ? `<div class="task-callout task-callout--warn"><h5>Avisos críticos</h5><ul>${warn
          .map((w) => `<li>${escapeHtml(w)}</li>`)
          .join('')}</ul></div>`
      : '';

  const dontBlock =
    dont.length > 0
      ? `<div class="task-callout task-callout--forbid"><h5>Não fazer</h5><ul>${dont.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>`
      : '';

  const codebaseBlock = codebaseEntry
    ? `<p class="task-meta-line"><strong>Entrada no codebase:</strong> <code>${escapeHtml(codebaseEntry)}</code></p>`
    : '';
  const suggestedBlock = suggested
    ? `<div class="task-callout task-callout--summary"><h5>Abordagem sugerida</h5><p>${escapeHtml(suggested)}</p></div>`
    : '';
  const pitfallsBlock = pitfalls.length
    ? `<div class="task-callout task-callout--warn"><h5>Armadilhas conhecidas</h5><ul>${pitfalls.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>`
    : '';
  const rulesPatternsBlock = rulesAndPatterns.length
    ? `<div class="task-section"><h5>Regras e padrões aplicáveis</h5><ul class="simple-list">${rulesAndPatterns.map((r) => `<li><code>${escapeHtml(r)}</code></li>`).join('')}</ul></div>`
    : '';
  const refPathsBlock = refPaths.length
    ? `<div class="task-section"><h5>Caminhos de referência</h5><ul class="simple-list">${refPaths.map((r) => `<li><code>${escapeHtml(r)}</code></li>`).join('')}</ul></div>`
    : '';

  return [
    summaryBlock,
    codebaseBlock,
    warnBlock,
    pitfallsBlock,
    dontBlock,
    suggestedBlock,
    renderBullets('Verificar antes de começar', verify),
    renderBullets('Entregáveis mínimos', minOut),
    rulesPatternsBlock,
    refPathsBlock,
  ].join('');
}

/** @param {Record<string, unknown>} d */
function renderExistingCodeDiagnosis(d) {
  if (!isObj(d)) return '';
  const impact = typeof d.impactType === 'string' ? d.impactType : '';
  const strategy = typeof d.discoveryStrategy === 'string' ? d.discoveryStrategy : '';
  const parts = [
    impact ? `<p><strong>Impacto:</strong> <span class="pill pill--impact">${escapeHtml(impact)}</span></p>` : '',
    strategy ? `<p><strong>Estratégia de descoberta:</strong> ${escapeHtml(strategy)}</p>` : '',
    renderDiagList('Já existe e funciona', asStrArray(d.alreadyBuiltAndWorking)),
    renderDiagList('Existe mas precisa refatorar', asStrArray(d.existsButNeedsRefactoring)),
    renderDiagList('Criar do zero', asStrArray(d.mustBeCreatedFromScratch)),
    renderDiagList('Bloqueadores técnicos', asStrArray(d.technicalBlockers), 'pill--gap'),
    renderDiagList('Antipadrões', asStrArray(d.antiPatterns)),
    renderDiagList('Ordem de refatoração', asStrArray(d.refactoringOrder)),
    renderDiagList('Arquivos hipótese', asStrArray(d.hypothesisFiles)),
    renderDiagList('Riscos de regressão', asStrArray(d.regressionRisks)),
  ].filter(Boolean);
  if (!parts.length) return '';
  return `<div class="task-section task-section--diagnosis"><h5>Diagnóstico de código existente</h5>${parts.join('')}</div>`;
}

/** @param {string} label @param {string[]} items @param {string} [pillClass] */
function renderDiagList(label, items, pillClass) {
  if (!items.length) return '';
  const inner = items
    .map((x) =>
      pillClass
        ? `<li><span class="pill ${pillClass}">${escapeHtml(x)}</span></li>`
        : `<li>${escapeHtml(x)}</li>`
    )
    .join('');
  return `<div class="diag-block"><strong>${escapeHtml(label)}</strong><ul class="simple-list">${inner}</ul></div>`;
}

/** @param {Record<string, unknown>} tc */
function renderTechnicalContext(tc) {
  if (!isObj(tc)) return '';
  const obs = typeof tc.observations === 'string' ? tc.observations.trim() : '';
  const patterns = asStrArray(tc.patternsFromRules);
  if (!obs && !patterns.length) return '';
  const patBlock = patterns.length
    ? `<div class="val-sub"><h6>Padrões das regras</h6><ul class="simple-list">${patterns
        .map((p) => `<li>${escapeHtml(p)}</li>`)
        .join('')}</ul></div>`
    : '';
  return `<div class="task-section"><h5>Contexto técnico</h5>
    ${obs ? `<p>${escapeHtml(obs)}</p>` : ''}
    ${patBlock}
  </div>`;
}

/** @param {unknown[]} steps */
function renderImplementationSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  const lis = steps.map((s) => `<li>${escapeHtml(String(s))}</li>`).join('');
  return `<div class="task-section"><h5>Passos de implementação</h5><ol class="impl-steps">${lis}</ol></div>`;
}

/** @param {string} h6 @param {string[]} items */
function renderValList(h6, items) {
  if (!items.length) return '';
  return `<div class="val-sub"><h6>${escapeHtml(h6)}</h6><ul class="simple-list">${items
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join('')}</ul></div>`;
}

/** @param {string} title @param {Record<string, unknown>[]} scenarios */
function testScenariosGroup(title, scenarios) {
  if (!scenarios.length) return '';
  const lis = scenarios.map(s => {
    const id = s.id ? `<code>${escapeHtml(String(s.id))}</code> ` : '';
    const cat = s.category ? escapeHtml(String(s.category)) : '';
    const desc = s.description ? escapeHtml(String(s.description)) : '';
    return `<li>${id}<strong>${cat}</strong>: ${desc}</li>`;
  }).join('');
  return `<div class="val-sub"><h6>${escapeHtml(title)}</h6><ul class="simple-list">${lis}</ul></div>`;
}

/** @param {Record<string, unknown>} v */
function renderValidationBlock(v) {
  if (!isObj(v)) return '';
  const biz = asStrArray(v.businessCriteria);
  const tech = asStrArray(v.technicalCriteria);
  const cmds = asStrArray(v.exactTestCommands);
  const checklist = asStrArray(v.validationChecklist);
  const matrix = asObjArray(v.mandatoryTestMatrix);
  const fieldValidations = asObjArray(v.fieldValidations);
  
  const un = asObjArray(v.unitTestScenarios);
  const fn = asObjArray(v.functionalTestScenarios);
  const e2e = asObjArray(v.e2eTestScenarios);
  const ld = asObjArray(v.loadTestScenarios);
  const cs = isObj(v.testCoverageSummary) ? v.testCoverageSummary : null;

  const hasAny = biz.length || tech.length || cmds.length || checklist.length || matrix.length || fieldValidations.length || un.length || fn.length || e2e.length || ld.length || cs;
  if (!hasAny) return '';

  const matrixRows = matrix
    .map((row) => {
      const cat = typeof row.category === 'string' ? row.category : '';
      const scope = typeof row.scope === 'string' ? row.scope : '';
      const hint = row.toolOrCommandHint != null ? String(row.toolOrCommandHint) : '';
      return `<tr><td><span class="pill pill--tiny">${escapeHtml(cat)}</span></td><td>${escapeHtml(scope)}</td><td>${escapeHtml(
        hint
      )}</td></tr>`;
    })
    .join('');

  const fieldRows = fieldValidations
    .map((row) => {
      const field = row.field != null ? String(row.field) : '';
      const rule = row.rule != null ? String(row.rule) : '';
      return `<tr><td><code>${escapeHtml(field)}</code></td><td>${escapeHtml(rule)}</td></tr>`;
    })
    .join('');

  let scenariosHtml = '';
  if (un.length) scenariosHtml += testScenariosGroup('Testes Unitários', un);
  if (fn.length) scenariosHtml += testScenariosGroup('Testes Funcionais', fn);
  if (e2e.length) scenariosHtml += testScenariosGroup('Testes E2E', e2e);
  if (ld.length) scenariosHtml += testScenariosGroup('Testes de Carga', ld);

  let covHtml = '';
  if (cs) {
    const catsStr = asStrArray(cs.categoriesCovered).join(', ');
    const gapsStr = asStrArray(cs.gapsInTesting).join('; ');
    covHtml = `<div class="task-section task-section--diagnosis"><h6>Cobertura Estimada</h6>
               <p><strong>Eixos:</strong> Unit (${cs.unitTotal || 0}), Func (${cs.functionalTotal || 0}), E2E (${cs.e2eTotal || 0}), Load (${cs.loadTotal || 0})</p>` +
              (catsStr ? `<p><strong>Categorias:</strong> ${escapeHtml(catsStr)}</p>` : '') +
              (gapsStr ? `<p><strong>Gaps:</strong> ${escapeHtml(gapsStr)}</p>` : '') + `</div>`;
  }

  return `<div class="task-section"><h5>Validação & testes</h5>
    ${renderValList('Critérios de negócio', biz)}
    ${renderValList('Critérios técnicos', tech)}
    ${renderValList('Comandos de teste', cmds)}
    ${renderValList('Checklist', checklist)}
    ${
      matrixRows
        ? `<div class="table-wrap val-matrix"><table class="data-table">
            <thead><tr><th>Categoria</th><th>Escopo</th><th>Ferramenta / comando</th></tr></thead>
            <tbody>${matrixRows}</tbody>
          </table></div>`
        : ''
    }
    ${
      fieldRows
        ? `<div class="val-sub"><h6>Validações de campos</h6><div class="table-wrap val-matrix"><table class="data-table data-table--compact">
            <thead><tr><th>Campo</th><th>Regra</th></tr></thead>
            <tbody>${fieldRows}</tbody>
          </table></div></div>`
        : ''
    }
    ${covHtml}
    ${scenariosHtml}
  </div>`;
}

/** @param {Record<string, unknown>[]} errors */
function renderResponseErrorsTable(errors) {
  if (!errors.length) return '';
  const rows = errors
    .map((e) => {
      const st = e.httpStatus != null ? String(e.httpStatus) : '';
      const cond = typeof e.condition === 'string' ? e.condition : '';
      let body = '';
      if (e.bodyExample !== undefined) {
        try {
          body = JSON.stringify(e.bodyExample, null, 2);
        } catch {
          body = String(e.bodyExample);
        }
      }
      return `<tr><td><code>${escapeHtml(st)}</code></td><td>${escapeHtml(cond)}</td><td class="err-body"><pre class="json-block__pre json-block__pre--inline"><code>${escapeHtml(
        body
      )}</code></pre></td></tr>`;
    })
    .join('');
  return `<div class="task-section"><h5>Respostas de erro (API)</h5>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>HTTP</th><th>Condição</th><th>Corpo (exemplo)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/** @param {Record<string, unknown>[]} semantics */
function renderHttpSemantics(semantics) {
  if (!semantics.length) return '';
  const rows = semantics
    .map((h) => {
      const st = h.status != null ? String(h.status) : '';
      const m = typeof h.meaning === 'string' ? h.meaning : '';
      return `<tr><td><code>${escapeHtml(st)}</code></td><td>${escapeHtml(m)}</td></tr>`;
    })
    .join('');
  return `<div class="task-section"><h5>Semântica HTTP</h5>
    <div class="table-wrap"><table class="data-table data-table--compact">
      <thead><tr><th>Status</th><th>Significado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/** @param {Record<string, unknown>} pm */
function renderPersistenceModel(pm) {
  if (!isObj(pm)) return '';
  const src = pm.source ? `<p class="api-line"><strong>Fonte:</strong> ${escapeHtml(String(pm.source))}</p>` : '';
  const artifacts = asObjArray(pm.artifacts).map(a => {
    const name =
      typeof a.name === 'string' && a.name
        ? a.name
        : typeof a.table === 'string'
          ? a.table
          : '';
    const op = typeof a.operationType === 'string' ? a.operationType : '';
    const cols = asObjArray(a.columnsOrFields).map(c => `<li><code>${escapeHtml(String(c.name))}</code> <span class="pill pill--tiny">${escapeHtml(String(c.operationType))}</span> <small>${escapeHtml(String(c.type))}</small></li>`).join('');
    return `<li><div class="tr-head"><code>${escapeHtml(name)}</code> <span class="pill pill--method">${escapeHtml(op)}</span></div><ul class="compact-list">${cols}</ul></li>`;
  }).join('');
  return `<div class="task-section"><h5>Modelo de Persistência</h5>${src}<ul class="tr-detail-list">${artifacts}</ul></div>`;
}

/** @param {Record<string, unknown>[]} ai */
function renderAsyncInterfaces(ai) {
  if (!ai.length) return '';
  const items = ai.map(a => {
    return `<li><div class="tr-head"><code>${escapeHtml(String(a.name))}</code> <span class="pill">${escapeHtml(String(a.kind))}</span> <span class="pill pill--tiny">${escapeHtml(String(a.operationType))}</span></div>
            <p class="tr-meta">Direção: ${escapeHtml(String(a.direction))}</p>
            <p class="tr-desc">Payload: ${escapeHtml(String(a.payloadSummary))}</p></li>`;
  }).join('');
  return `<div class="task-section"><h5>Interfaces Assíncronas</h5><ul class="tr-detail-list">${items}</ul></div>`;
}

// ─── Rede contra campo silenciosamente descartado (v6.1) ─────────────────────
//
// POR QUE EXISTE
// `renderPersistenceModelV52` e `renderApiContractV52` liam uma lista FECHADA de chaves e
// descartavam o resto sem uma palavra. Medido num backlog real: `migrationNotes` presente em
// 16/16 entidades, `checkConstraints` em 5/16, `uniqueConstraints` em 1/16 e `tags` em 24/24
// operações — nada disso saía no HTML. O defeito passou meses sem ser notado exatamente porque
// era SILENCIOSO: quem lê o relatório não tem como saber que o JSON tinha mais.
//
// A partir daqui, chave presente com valor não vazio e não consumida pelo renderer gera aviso
// em stderr (impresso pelo cli.mjs). Não bloqueia: o relatório continua saindo.

/** @type {{scope:string, path:string, key:string}[]} */
const unrenderedKeys = [];
/** Chaves de controle/anotação — nunca são conteúdo a renderizar. */
const IGNORED_KEYS = new Set(['_comment', '_esperado', '_note', '$schema']);

const hasContent = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true; // number/boolean são conteúdo
};

/**
 * Registra as chaves de `obj` que o renderer NÃO consumiu.
 * @param {Record<string, unknown>} obj
 * @param {Iterable<string>} consumed  chaves efetivamente lidas pelo renderer
 * @param {string} scope  id da task (ou o escopo mais preciso disponível)
 * @param {string} path   caminho do objeto dentro da task, ex.: `persistenceModel.entities[0]`
 */
function noteUnrenderedKeys(obj, consumed, scope, path) {
  if (!isObj(obj)) return;
  const seen = new Set(consumed);
  for (const key of Object.keys(obj)) {
    if (seen.has(key) || IGNORED_KEYS.has(key)) continue;
    if (!hasContent(obj[key])) continue;
    unrenderedKeys.push({ scope: scope || '(task sem id)', path, key });
  }
}

/**
 * Avisos acumulados no último render, para o cli.mjs imprimir em stderr.
 * @returns {{scope:string, path:string, key:string}[]}
 */
export function getUnrenderedKeyWarnings() {
  return unrenderedKeys.slice();
}

// ─── Renderers v5.2 compact-prose ────────────────────────────────────────────

/**
 * Detecta se um objeto apiContract é formato v5.2 compact-prose.
 * v5.2: campos 'auth', 'request', 'responses', 'policies' são strings ricas.
 * @param {Record<string, unknown>} api
 */
function isApiContractV52(api) {
  return typeof api.request === 'string' || typeof api.responses === 'string' ||
    typeof api.auth === 'string' || typeof api.policies === 'string';
}

/**
 * Renderiza contrato API no formato compact-prose v5.2.
 * Os campos são strings ricas separadas por | e exibidas como blocos de texto formatado.
 * @param {Record<string, unknown>} api
 * @param {{scope?:string, path?:string}} [ctx]  para o aviso de chave não renderizada
 */
function renderApiContractV52(api, ctx = {}) {
  const opId = typeof api.operationId === 'string' ? api.operationId : '';
  const shortSum = typeof api.summary === 'string' ? api.summary : '';
  const longDesc = typeof api.description === 'string' ? api.description : '';
  const method = typeof api.method === 'string' ? api.method : '';
  const path = typeof api.path === 'string' ? api.path : '';
  const sig = typeof api.signature === 'string' ? api.signature : '';
  const auth = typeof api.auth === 'string' ? api.auth : '';
  const request = typeof api.request === 'string' ? api.request : '';
  const responses = typeof api.responses === 'string' ? api.responses : '';
  const policies = typeof api.policies === 'string' ? api.policies : '';
  const openApiRef = typeof api.openApiRef === 'string' ? api.openApiRef : '';
  const title = opId ? `API — ${opId}` : 'Contrato API';
  const methodLine = (method || path)
    ? `<div class="api-contract__signature"><span class="pill pill--method">${escapeHtml(method)}</span> <code class="api-path">${escapeHtml(path)}</code>${sig && sig !== `${method} ${path}` ? `<div class="api-contract__sig-alt"><code>${escapeHtml(sig)}</code></div>` : ''}</div>`
    : '';
  const intro = [shortSum ? `<p class="api-contract__summary">${escapeHtml(shortSum)}</p>` : '', longDesc ? `<p class="api-contract__desc">${escapeHtml(longDesc.trim())}</p>` : '']
    .filter(Boolean)
    .join('');
  const refLine = openApiRef ? `<p class="api-contract__ref"><strong>OpenAPI:</strong> <code>${escapeHtml(openApiRef)}</code></p>` : '';
  const authBlock = auth ? `<div class="api-contract__block"><h6 class="api-contract__h">Autenticação</h6><p class="api-contract__p">${escapeHtml(auth)}</p></div>` : '';
  const reqItems = request ? splitPipeSegments(request) : [];
  const requestBlock = reqItems.length
    ? `<div class="api-contract__block"><h6 class="api-contract__h">Requisição (parâmetros / headers)</h6><ul class="rich-list">${reqItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
    : '';
  const respItems = responses ? splitHttpResponseSegments(responses) : [];
  const responsesBlock = respItems.length
    ? `<div class="api-contract__block"><h6 class="api-contract__h">Respostas HTTP</h6><ul class="rich-list rich-list--responses">${respItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
    : '';
  const polItems = policies ? splitPipeSegments(policies) : [];
  const policiesBlock = polItems.length
    ? `<div class="api-contract__block"><h6 class="api-contract__h">Políticas (rate, cache, idempotência)</h6><ul class="rich-list">${polItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
    : policies
      ? `<div class="api-contract__block"><h6 class="api-contract__h">Políticas (rate, cache, idempotência)</h6><p class="api-contract__p">${escapeHtml(policies)}</p></div>`
      : '';

  // `tags[]` — agrupamento da operação no OpenAPI (área/recurso). Estava presente em 24/24
  // operações de um backlog real e não aparecia em lugar nenhum do relatório. Aceita array e
  // string separada por pipe, como o resto do compact-prose.
  const tagItems = Array.isArray(api.tags)
    ? api.tags.map((t) => String(t).trim()).filter(Boolean)
    : typeof api.tags === 'string'
      ? splitPipeSegments(api.tags)
      : [];
  const tagsLine = tagItems.length
    ? `<p class="api-contract__tags">${tagItems.map((t) => `<span class="pill pill--tiny">${escapeHtml(t)}</span>`).join(' ')}</p>`
    : '';

  noteUnrenderedKeys(
    api,
    ['operationId', 'summary', 'description', 'method', 'path', 'signature', 'auth', 'request', 'responses', 'policies', 'openApiRef', 'tags'],
    ctx.scope ?? '',
    ctx.path ?? 'apiContracts[]'
  );

  return `<div class="api-contract-card task-section"><h5 class="api-contract-card__title">${escapeHtml(title)}</h5>${methodLine}${tagsLine}${intro}${refLine}${authBlock}${requestBlock}${responsesBlock}${policiesBlock}</div>`;
}

/**
 * Detecta se persistenceModel usa formato v5.2 compact-prose (entities[]).
 * @param {Record<string, unknown>} pm
 */
function isPersistenceModelV52(pm) {
  return Array.isArray(pm.entities);
}

/**
 * Renderiza modelo de persistência no formato v5.2 compact-prose.
 * Cada entity tem columns, relationships, indexes como strings ricas.
 * @param {Record<string, unknown>} pm
 * @param {{scope?:string, path?:string}} [ctx]  para o aviso de chave não renderizada
 */
function renderPersistenceModelV52(pm, ctx = {}) {
  const src = pm.source ? `<p class="api-line"><strong>Fonte:</strong> ${escapeHtml(String(pm.source))}</p>` : '';
  const entities = asObjArray(pm.entities).map((e, ei) => {
    const table =
      typeof e.table === 'string' && e.table
        ? e.table
        : typeof e.name === 'string'
          ? e.name
          : '';
    const op = typeof e.operationType === 'string' ? e.operationType : '';
    const purpose = typeof e.purpose === 'string' ? e.purpose : '';
    const bc = typeof e.boundedContext === 'string' ? e.boundedContext : '';
    const pk = typeof e.primaryKey === 'string' ? e.primaryKey : '';
    const idStrat = typeof e.identifierStrategy === 'string' ? e.identifierStrategy : '';
    const dmRef = typeof e.dataModelRef === 'string' ? e.dataModelRef : '';
    const columns = typeof e.columns === 'string' ? e.columns : '';
    const relationships = typeof e.relationships === 'string' ? e.relationships : '';
    const indexes = typeof e.indexes === 'string' ? e.indexes : '';
    const metaBits = [
      bc ? `<span><strong>Contexto:</strong> ${escapeHtml(bc)}</span>` : '',
      pk ? `<span><strong>PK:</strong> <code>${escapeHtml(pk)}</code></span>` : '',
      idStrat ? `<span><strong>ID:</strong> ${escapeHtml(idStrat)}</span>` : '',
      dmRef ? `<span><strong>Ref.:</strong> <code>${escapeHtml(dmRef)}</code></span>` : '',
    ].filter(Boolean);
    const metaRow = metaBits.length ? `<div class="entity-card__meta">${metaBits.join(' · ')}</div>` : '';
    const purposeBlock = purpose ? `<p class="entity-card__purpose">${escapeHtml(purpose)}</p>` : '';
    const colItems = columns ? splitPipeSegments(columns) : [];
    const relItems = relationships ? splitPipeSegments(relationships) : [];
    const idxItems = indexes ? splitPipeSegments(indexes) : [];
    const colBlock = colItems.length
      ? `<div class="entity-card__block"><h6 class="entity-card__h">Colunas / campos</h6><ul class="rich-list rich-list--dense">${colItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
      : '';
    const relBlock = relItems.length
      ? `<div class="entity-card__block"><h6 class="entity-card__h">Relacionamentos</h6><ul class="rich-list">${relItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
      : '';
    const idxBlock = idxItems.length
      ? `<div class="entity-card__block"><h6 class="entity-card__h">Índices</h6><ul class="rich-list">${idxItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
      : '';

    // Três campos que existiam no tasks.json e nunca chegavam ao HTML — medido em backlog real:
    // migrationNotes em 16/16 entidades, checkConstraints em 5/16, uniqueConstraints em 1/16.
    // São exatamente o que decide se o implementador escreve a migração certa: unicidade define
    // conflito, check define domínio válido, e a nota de migração diz se a tabela é para criar,
    // alterar ou apenas ler. Cada bloco só aparece com conteúdo. Aceita string compact-prose e
    // array de strings.
    const proseItems = (v) => {
      if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim())).filter(Boolean);
      return typeof v === 'string' && v.trim() ? splitPipeSegments(v) : [];
    };
    const uniqItems = proseItems(e.uniqueConstraints);
    const checkItems = proseItems(e.checkConstraints);
    const migItems = proseItems(e.migrationNotes);
    const listBlock = (label, items) =>
      items.length
        ? `<div class="entity-card__block"><h6 class="entity-card__h">${escapeHtml(label)}</h6><ul class="rich-list">${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
        : '';
    const uniqBlock = listBlock('Restrições de unicidade', uniqItems);
    const checkBlock = listBlock('Restrições de verificação', checkItems);
    const migBlock = listBlock('Notas de migração', migItems);

    noteUnrenderedKeys(
      e,
      ['table', 'name', 'operationType', 'purpose', 'boundedContext', 'primaryKey', 'identifierStrategy',
        'dataModelRef', 'columns', 'relationships', 'indexes', 'uniqueConstraints', 'checkConstraints', 'migrationNotes'],
      ctx.scope ?? '',
      `${ctx.path ?? 'persistenceModel'}.entities[${ei}]`
    );

    return `<li class="entity-card"><div class="entity-card__head"><code class="entity-card__table">${escapeHtml(table || '—')}</code> ${op ? `<span class="pill pill--method pill--sm">${escapeHtml(op)}</span>` : ''}</div>${purposeBlock}${metaRow}${colBlock}${relBlock}${idxBlock}${uniqBlock}${checkBlock}${migBlock}</li>`;
  }).join('');

  noteUnrenderedKeys(pm, ['entities', 'source'], ctx.scope ?? '', ctx.path ?? 'persistenceModel');

  return `<div class="task-section"><h5>Modelo de persistência</h5>${src}<ul class="entity-stack">${entities}</ul></div>`;
}

/**
 * Renderiza implementationGuidance (v5.2).
 * @param {Record<string, unknown>} ig
 */
function renderImplementationGuidance(ig) {
  if (!isObj(ig)) return '';
  const arch = asStrArray(ig.architecturalDecisions);
  const dataFlow = asStrArray(ig.dataFlow);
  const sec = asStrArray(ig.securityConsiderations);
  const perf = asStrArray(ig.performanceConsiderations);
  const eh = isObj(ig.errorHandling) ? ig.errorHandling : null;
  const obs = isObj(ig.observability) ? ig.observability : null;
  const ts = isObj(ig.testingStrategy) ? ig.testingStrategy : null;
  const parts = [
    arch.length ? `<div class="val-sub"><h6>Decisões arquiteturais</h6><ul class="simple-list">${arch.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul></div>` : '',
    dataFlow.length ? `<div class="val-sub"><h6>Fluxo de dados</h6><ol class="impl-steps">${dataFlow.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol></div>` : '',
    sec.length ? `<div class="val-sub"><h6>Segurança</h6><ul class="simple-list">${sec.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>` : '',
    perf.length ? `<div class="val-sub"><h6>Performance</h6><ul class="simple-list">${perf.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>` : '',
    eh ? `<div class="val-sub"><h6>Tratamento de erros</h6><pre class="json-block__pre json-block__pre--inline"><code>${escapeHtml(JSON.stringify(eh, null, 2))}</code></pre></div>` : '',
    obs ? `<div class="val-sub"><h6>Observabilidade</h6><pre class="json-block__pre json-block__pre--inline"><code>${escapeHtml(JSON.stringify(obs, null, 2))}</code></pre></div>` : '',
    ts ? `<div class="val-sub"><h6>Estratégia de testes</h6><pre class="json-block__pre json-block__pre--inline"><code>${escapeHtml(JSON.stringify(ts, null, 2))}</code></pre></div>` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `<div class="task-section task-section--guidance"><h5>Guia de implementação</h5>${parts.join('')}</div>`;
}

// ──────────────────────────────────────────────────────────────────────────────

/** @param {Record<string, unknown>} ui */
function renderLegacyUiScope(ui) {
  if (!isObj(ui)) return '';
  return `<div class="task-section"><h5>Escopo de UI Legada</h5><p><strong>Framework:</strong> ${escapeHtml(String(ui.frameworkOrLayer))}</p><p><strong>Comportamento esperado:</strong> ${escapeHtml(String(ui.expectedBehavior))}</p></div>`;
}

// ─── Contexto de UI (uiContext v5.3) — paridade com uiContextHtml() do gêmeo ADO ──

const UI_SCREENSHOT_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * Cap de tamanho por imagem embutida. Acima disto a imagem NÃO é embutida: o relatório
 * mostra um aviso com o caminho e o tamanho, em vez de inflar o HTML com megabytes de base64
 * (base64 cresce ~33% sobre o binário). Ajustável via env SPEC_TASKS_HTML_MAX_IMAGE_KB.
 */
const UI_SCREENSHOT_MAX_BYTES = (() => {
  const kb = Number.parseInt(process.env.SPEC_TASKS_HTML_MAX_IMAGE_KB ?? '', 10);
  return Number.isFinite(kb) && kb > 0 ? kb * 1024 : 1536 * 1024; // default 1,5 MB
})();

/**
 * Cache de imagens JÁ resolvidas, por caminho declarado no uiContext.
 * Motivo: o MESMO screenshot é referenciado pelo uiContext da story E pelo de cada task da
 * story. Sem cache, o mesmo PNG era lido do disco e convertido em base64 uma vez por bloco —
 * numa épica com 1 story + 6 tasks apontando para TEL-014.png, sete cópias do binário
 * acabavam dentro do HTML. O cache não muda a saída (o data URI é idêntico), mas o
 * navegador/compressor passa a lidar com uma string repetida em vez de N codificações.
 * @type {Map<string, { dataUri: string, fileName: string, bytes: number } | { oversize: true, fileName: string, bytes: number } | null>}
 */
const uiScreenshotCache = new Map();

/** Caminhos que excederam o cap — reportados uma vez cada no rodapé do relatório. */
/** @type {Map<string, number>} */
const uiScreenshotOversize = new Map();

/**
 * Resolve uiContext.screenshot e devolve data URI base64 (diferença deliberada vs. ADO,
 * que anexa como attachment). Caminho relativo é tentado primeiro contra o diretório do
 * tasks.json (screenshotBaseDir), depois contra o cwd. Ausente/ilegível → null (silencioso).
 * Acima de UI_SCREENSHOT_MAX_BYTES → `{oversize:true}` (aviso no lugar da imagem).
 * Resultado memoizado por caminho declarado (ver uiScreenshotCache).
 * @param {unknown} shot
 * @returns {{ dataUri: string, fileName: string, bytes: number } | { oversize: true, fileName: string, bytes: number } | null}
 */
function uiScreenshotDataUri(shot) {
  const rel = typeof shot === 'string' ? shot.trim() : '';
  if (!rel) return null;
  const cacheKey = `${screenshotBaseDir}|${rel}`;
  if (uiScreenshotCache.has(cacheKey)) return uiScreenshotCache.get(cacheKey);

  const candidates = isAbsolute(rel)
    ? [rel]
    : [screenshotBaseDir ? join(screenshotBaseDir, rel) : '', resolve(rel)].filter(Boolean);
  /** @type {ReturnType<typeof uiScreenshotDataUri>} */
  let result = null;
  for (const abs of candidates) {
    try {
      if (!existsSync(abs)) continue;
      const mime = UI_SCREENSHOT_MIME[extname(abs).toLowerCase()];
      if (!mime) continue;
      const buf = readFileSync(abs);
      if (buf.length > UI_SCREENSHOT_MAX_BYTES) {
        uiScreenshotOversize.set(rel, buf.length);
        result = { oversize: true, fileName: basename(abs), bytes: buf.length };
        break;
      }
      result = { dataUri: `data:${mime};base64,${buf.toString('base64')}`, fileName: basename(abs), bytes: buf.length };
      break;
    } catch {
      /* arquivo ilegível → omitir imagem silenciosamente */
    }
  }
  uiScreenshotCache.set(cacheKey, result);
  return result;
}

/** KB legível para as mensagens de cap. @param {number} bytes */
function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

/** Nota consolidada, no fim do relatório, das imagens que excederam o cap. */
function renderOversizeImagesNote() {
  if (!uiScreenshotOversize.size) return '';
  const lis = [...uiScreenshotOversize.entries()]
    .map(([p, bytes]) => `<li><code>${escapeHtml(p)}</code> — ${escapeHtml(kb(bytes))}</li>`)
    .join('');
  return `<section class="site-note site-note--warn"><h2>⚠️ Imagens não embutidas</h2>
    <p>As imagens abaixo excedem o limite de <strong>${escapeHtml(kb(UI_SCREENSHOT_MAX_BYTES))}</strong> por imagem e foram omitidas do HTML para não inflar o relatório. Otimize os arquivos ou ajuste o limite com a variável de ambiente <code>SPEC_TASKS_HTML_MAX_IMAGE_KB</code>.</p>
    <ul class="simple-list">${lis}</ul>
  </section>`;
}

/** @param {string[]} items @param {boolean} [asCode] */
function uiChips(items, asCode = false) {
  return `<ul class="tag-list tag-list--wrap">${items
    .map((x) => `<li><span class="pill pill--tiny">${asCode ? `<code>${escapeHtml(x)}</code>` : escapeHtml(x)}</span></li>`)
    .join('')}</ul>`;
}

/**
 * Inventário de campos da tela (uiContext.fields[]) como tabela.
 *
 * Este bloco era OMITIDO pelo renderer — precisamente o conteúdo que o schema declara
 * insubstituível (as opções de cada select, as máscaras, as validações e a mensagem de erro
 * de cada campo). O relatório mostrava tela/rota/estados e escondia o contrato de campo, que é
 * o que o implementador e o revisor de negócio precisam ler.
 * @param {unknown[]} fields
 */
function renderUiFieldsTable(fields) {
  const list = asObjArray(fields);
  if (!list.length) return '';
  const rows = list
    .map((f) => {
      const name = typeof f.name === 'string' ? f.name : '';
      const label = typeof f.label === 'string' ? f.label : '';
      const type = typeof f.type === 'string' ? f.type : '';
      const req = f.required === true ? 'Sim' : f.required === false ? 'Não' : '—';

      // Opções TRANSCRITAS + origem declarada. É o dado que se perdia em produção.
      const opts = asObjArray(f.options).map((o) => {
        const v = o.value !== undefined ? String(o.value) : '';
        const l = typeof o.label === 'string' && o.label ? ` — ${o.label}` : '';
        const def = o.default === true ? ' <span class="pill pill--tiny">default</span>' : '';
        const notes = typeof o.notes === 'string' && o.notes ? ` <em>(${escapeHtml(o.notes)})</em>` : '';
        return `<li><code>${escapeHtml(v)}</code>${escapeHtml(l)}${def}${notes}</li>`;
      });
      const src = isObj(f.optionsSource)
        ? `<p class="ui-field__src"><strong>Origem:</strong> <code>${escapeHtml(String(f.optionsSource.kind ?? ''))}</code>${
            f.optionsSource.ref ? ` → <code>${escapeHtml(String(f.optionsSource.ref))}</code>` : ''
          }${f.optionsSource.notes ? ` — ${escapeHtml(String(f.optionsSource.notes))}` : ''}</p>`
        : '';
      const optionsCell = opts.length
        ? `<ul class="simple-list simple-list--tight">${opts.join('')}</ul>${src}`
        : src || '—';

      // Restrições: máscara, formato, limites, default, dependência, rastreio.
      const constraints = [
        f.mask ? `máscara <code>${escapeHtml(String(f.mask))}</code>` : '',
        f.format ? `formato <code>${escapeHtml(String(f.format))}</code>` : '',
        f.selection ? `seleção ${escapeHtml(String(f.selection))}` : '',
        f.min !== undefined ? `min ${escapeHtml(String(f.min))}` : '',
        f.max !== undefined ? `max ${escapeHtml(String(f.max))}` : '',
        f.maxLength !== undefined ? `maxLength ${escapeHtml(String(f.maxLength))}` : '',
        f.default !== undefined && f.default !== null ? `default <code>${escapeHtml(String(f.default))}</code>` : '',
        f.dependsOn ? `depende de <code>${escapeHtml(String(f.dependsOn))}</code>` : '',
        asStrArray(f.searchableBy).length ? `busca por ${escapeHtml(asStrArray(f.searchableBy).join(', '))}` : '',
        f.placeholder ? `placeholder “${escapeHtml(String(f.placeholder))}”` : '',
      ].filter(Boolean);

      const validations = asObjArray(f.validations)
        .map((v) => {
          const rule = typeof v.rule === 'string' ? v.rule : '';
          const msg = typeof v.errorMessage === 'string' ? v.errorMessage : '';
          if (!rule && !msg) return '';
          return `<li>${escapeHtml(rule)}${msg ? ` → <em>${escapeHtml(msg)}</em>` : ''}</li>`;
        })
        .filter(Boolean);

      const detailsCell =
        [
          constraints.length ? `<p class="ui-field__constraints">${constraints.join(' · ')}</p>` : '',
          validations.length ? `<ul class="simple-list simple-list--tight">${validations.join('')}</ul>` : '',
          f.traceability ? `<p class="ui-field__trace"><strong>Rastreio:</strong> <code>${escapeHtml(String(f.traceability))}</code></p>` : '',
        ]
          .filter(Boolean)
          .join('') || '—';

      return `<tr>
        <td><code>${escapeHtml(name)}</code>${label ? `<br /><span class="ui-field__label">${escapeHtml(label)}</span>` : ''}</td>
        <td><span class="pill pill--tiny">${escapeHtml(type)}</span></td>
        <td>${escapeHtml(req)}</td>
        <td>${optionsCell}</td>
        <td>${detailsCell}</td>
      </tr>`;
    })
    .join('');
  return `<div class="val-sub"><h6>Inventário de campos (${list.length})</h6>
    <div class="table-wrap"><table class="data-table data-table--compact ui-fields">
      <thead><tr><th>Campo</th><th>Tipo</th><th>Obrig.</th><th>Opções / origem</th><th>Restrições e validações</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/** Contrato de grid/listagem (uiContext.grid) — também omitido antes. @param {unknown} grid */
function renderUiGrid(grid) {
  if (!isObj(grid)) return '';
  const columns = asStrArray(grid.columns);
  const rowActions = asStrArray(grid.rowActions);
  const lines = [
    grid.defaultSort ? `<p class="ui-context__line"><strong>Ordenação padrão:</strong> <code>${escapeHtml(String(grid.defaultSort))}</code></p>` : '',
    grid.pagination ? `<p class="ui-context__line"><strong>Paginação:</strong> ${escapeHtml(String(grid.pagination))}</p>` : '',
    grid.emptyState ? `<p class="ui-context__line"><strong>Estado vazio:</strong> ${escapeHtml(String(grid.emptyState))}</p>` : '',
  ].filter(Boolean);
  if (!columns.length && !rowActions.length && !lines.length) return '';
  const colRows = columns.map((c, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(c)}</td></tr>`).join('');
  return `<div class="val-sub"><h6>Grid / listagem</h6>
    ${
      colRows
        ? `<div class="table-wrap"><table class="data-table data-table--compact">
            <thead><tr><th>#</th><th>Coluna</th></tr></thead><tbody>${colRows}</tbody>
          </table></div>`
        : ''
    }
    ${lines.join('')}
    ${rowActions.length ? `<p class="ui-context__line"><strong>Ações por linha:</strong></p>${uiChips(rowActions)}` : ''}
  </div>`;
}

/** Comportamento do conjunto de filtros (uiContext.filterBehavior). @param {unknown} fb */
function renderUiFilterBehavior(fb) {
  if (!isObj(fb)) return '';
  const applyOn = fb.applyOn === 'change' ? 'ao alterar o campo (change)' : fb.applyOn === 'submit' ? 'somente ao acionar o botão (submit)' : '';
  const rows = [
    applyOn ? ['Aplicação', applyOn] : null,
    fb.combination ? ['Combinação entre filtros', String(fb.combination)] : null,
    fb.clearAll !== undefined ? ['Limpar todos', fb.clearAll ? 'Sim' : 'Não'] : null,
    fb.persistence ? ['Persistência', String(fb.persistence)] : null,
    fb.notes ? ['Observações', String(fb.notes)] : null,
  ].filter(Boolean);
  if (!rows.length) return '';
  const body = rows.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
  return `<div class="val-sub"><h6>Comportamento dos filtros</h6>
    <div class="table-wrap"><table class="data-table data-table--compact"><tbody>${body}</tbody></table></div>
  </div>`;
}

/**
 * Miolo do bloco "Contexto de UI" — mesmo conteúdo do gêmeo ADO (tela, rota, fluxo/etapa,
 * estados, regras, entidades, endpoints) + inventário de campos (fields[]), contrato de grid
 * e comportamento de filtros + screenshot embutido em base64 (com cache e cap de tamanho).
 * Ausência de uiContext (ou sem tela/rota) → string vazia.
 * @param {unknown} ui
 */
function renderUiContextInner(ui) {
  if (!isObj(ui)) return '';
  const tela = typeof ui.tela === 'string' ? ui.tela : '';
  const telaNome = typeof ui.telaNome === 'string' ? ui.telaNome : '';
  const rota = typeof ui.rota === 'string' ? ui.rota : '';
  const fluxo = typeof ui.fluxo === 'string' ? ui.fluxo : '';
  const etapa = typeof ui.etapa === 'string' ? ui.etapa : '';
  const estados = asStrArray(ui.estadosUI);
  const regras = asStrArray(ui.regras);
  const entidades = asStrArray(ui.entidades);
  const endpoints = asStrArray(ui.endpoints);
  if (!tela && !rota) return '';
  const shotInfo = uiScreenshotDataUri(ui.screenshot);
  const parts = [
    tela
      ? `<p class="ui-context__line"><strong>Tela:</strong> <code>${escapeHtml(tela)}</code>${telaNome ? ` — ${escapeHtml(telaNome)}` : ''}</p>`
      : '',
    rota ? `<p class="ui-context__line"><strong>Rota:</strong> <code>${escapeHtml(rota)}</code></p>` : '',
    fluxo ? `<p class="ui-context__line"><strong>Fluxo:</strong> ${escapeHtml(fluxo)}</p>` : '',
    etapa ? `<p class="ui-context__line"><strong>Etapa:</strong> ${escapeHtml(etapa)}</p>` : '',
    estados.length ? `<div class="val-sub"><h6>Estados UI</h6>${uiChips(estados)}</div>` : '',
    renderValList('Regras', regras),
    renderUiFieldsTable(ui.fields),
    renderUiGrid(ui.grid),
    renderUiFilterBehavior(ui.filterBehavior),
    entidades.length ? `<div class="val-sub"><h6>Entidades</h6>${uiChips(entidades)}</div>` : '',
    endpoints.length ? `<div class="val-sub"><h6>Endpoints</h6>${uiChips(endpoints, true)}</div>` : '',
    shotInfo && 'dataUri' in shotInfo
      ? `<figure class="ui-screenshot"><img src="${escapeHtml(shotInfo.dataUri)}" alt="${escapeHtml(shotInfo.fileName)}" loading="lazy" /><figcaption>${escapeHtml(shotInfo.fileName)} · ${escapeHtml(kb(shotInfo.bytes))}</figcaption></figure>`
      : '',
    shotInfo && 'oversize' in shotInfo
      ? `<p class="ui-screenshot__warn">⚠️ Screenshot <code>${escapeHtml(String(ui.screenshot))}</code> não embutido: ${escapeHtml(kb(shotInfo.bytes))} excede o limite de ${escapeHtml(kb(UI_SCREENSHOT_MAX_BYTES))} por imagem. Otimize a imagem ou aumente o limite com <code>SPEC_TASKS_HTML_MAX_IMAGE_KB</code>.</p>`
      : '',
  ]
    .filter(Boolean)
    .join('');
  return parts;
}

/** Bloco "Contexto de UI" no nível da task (task-section). @param {unknown} ui */
function renderUiContextSection(ui) {
  const inner = renderUiContextInner(ui);
  if (!inner) return '';
  return `<div class="task-section task-section--uicontext"><h5>Contexto de UI</h5>${inner}</div>`;
}

/** @param {Record<string, unknown>} api @param {{scope?:string, path?:string}} [ctx] */
function renderApiContract(api, ctx = {}) {
  if (!isObj(api)) return '';
  // Formato v5.2 compact-prose: detectar por campos string
  if (isApiContractV52(api)) return renderApiContractV52(api, ctx);
  // Shape v3 alternativo: { endpoints: [{method, path, operationId, section}], source: '...' }
  if (Array.isArray(api.endpoints) && api.endpoints.length) {
    const src = api.source ? `<p class="api-line"><strong>Fonte:</strong> ${escapeHtml(String(api.source))}</p>` : '';
    const eps = api.endpoints.map((e) => {
      if (!isObj(e)) return '';
      const m = typeof e.method === 'string' ? e.method : '';
      const p = typeof e.path === 'string' ? e.path : '';
      const op = typeof e.operationId === 'string' ? e.operationId : '';
      const sec = typeof e.section === 'string' ? e.section : '';
      return `<li>
        <span class="pill pill--method">${escapeHtml(m)}</span>
        <code class="api-path">${escapeHtml(p)}</code>
        ${op ? ` <span class="api-opid"><strong>operationId:</strong> <code>${escapeHtml(op)}</code></span>` : ''}
        ${sec ? ` <span class="pill pill--tiny">${escapeHtml(sec)}</span>` : ''}
      </li>`;
    }).join('');
    return `<div class="task-section"><h5>Contratos API</h5>${src}<ul class="api-endpoints">${eps}</ul></div>`;
  }
  // Formato v3/v4 com objetos
  const method = typeof api.method === 'string' ? api.method : '';
  const path = typeof api.path === 'string' ? api.path : '';
  const headers = asStrArray(api.mandatoryHeaders);
  const respErr = asObjArray(api.responseErrors);
  const httpSem = asObjArray(api.httpSemantics);
  return `<div class="task-section"><h5>Contrato API</h5>
    <p class="api-line"><span class="pill pill--method">${escapeHtml(method)}</span> <code class="api-path">${escapeHtml(
      path
    )}</code></p>
    ${
      headers.length
        ? `<ul class="compact-list">${headers.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
        : ''
    }
    ${api.authScheme ? `<p><strong>Auth:</strong> ${escapeHtml(String(api.authScheme))}</p>` : ''}
    ${api.rateLimiting ? `<p><strong>Rate limit:</strong> ${escapeHtml(String(api.rateLimiting))}</p>` : ''}
    ${renderJsonBlock('Exemplo requisição', api.requestExample)}
    ${renderJsonBlock('Sucesso', api.responseSuccess)}
    ${renderJsonBlock('Idempotente', api.responseIdempotent)}
    ${renderResponseErrorsTable(respErr)}
    ${renderHttpSemantics(httpSem)}
  </div>`;
}

/** Renderiza Epics com Stories aninhadas (e suas Tasks)
 * @param {Record<string, unknown>[]} epics
 * @param {Record<string, unknown>[]} stories
 */
function renderEpicsWithStories(epics, stories) {
  if (!epics.length) return '<p class="empty-notice">Nenhum Epic definido.</p>';
  
  // Mapear stories por epic
  const storiesByEpic = new Map();
  const orphanStories = [];
  
  stories.forEach(rawStory => {
    const s = normStorySchema(rawStory);
    let epicId = typeof s.epicId === 'string' ? s.epicId : '';
    if (!epicId && typeof s.epic === 'string') epicId = s.epic;
    
    // Tentar encontrar epic que contém esta story
    if (!epicId) {
      for (const epic of epics) {
        const containedIds = Array.isArray(epic.containedStoryIds) ? epic.containedStoryIds : [];
        if (containedIds.includes(s.id)) {
          epicId = typeof epic.id === 'string' ? epic.id : '';
          break;
        }
      }
    }
    
    if (epicId) {
      if (!storiesByEpic.has(epicId)) storiesByEpic.set(epicId, []);
      storiesByEpic.get(epicId).push(rawStory);
    } else {
      orphanStories.push(rawStory);
    }
  });
  
  // Renderizar cada epic com suas stories
  const epicBlocks = epics.map((epic) => {
    const eid = typeof epic.id === 'string' ? epic.id : '';
    const ename = typeof epic.name === 'string' ? epic.name : (typeof epic.title === 'string' ? epic.title : eid);
    const summary = typeof epic.executiveSummary === 'string' ? epic.executiveSummary : (typeof epic.summary === 'string' ? epic.summary : '');

    const epicStories = storiesByEpic.get(eid) || [];

    const storiesHtml = epicStories.length
      ? `<div class="epic-stories">${epicStories.map(renderStoryCard).join('\n')}</div>`
      : '<p class="empty-notice">Nenhuma história neste epic.</p>';
    
    return `<div class="epic-card" id="epic-${escapeHtml(slugify(eid))}"${attrRegra(temRegra(epic, epicStories))}>
      <h3 class="epic-card__title">${escapeHtml(eid ? `${eid} — ${ename}` : ename)}${selosDe(epic)}</h3>
      ${summary ? `<p class="epic-card__summary">${escapeHtml(summary)}</p>` : ''}
      ${renderEpicBizPanels(epic, epicStories)}
      ${storiesHtml}
    </div>`;
  }).join('\n');
  
  // Adicionar stories órfãs no final
  const orphanBlock = orphanStories.length
    ? `<div class="epic-card epic-card--orphan" id="stories-sem-epic">
        <h3 class="epic-card__title">Stories sem Epic</h3>
        <p class="epic-card__summary">Estas histórias não estão associadas a nenhum Epic.</p>
        <div class="epic-stories">${orphanStories.map(renderStoryCard).join('\n')}</div>
      </div>`
    : '';
  
  return epicBlocks + orphanBlock;
}

/**
 * Cartão de Feature — mesmos painéis de negócio do Epic (narrativa, critérios, regras), mais
 * "Origem na especificação" (`sourceRefs[]`) e rastreabilidade.
 *
 * A Feature representa um MÓDULO homologável pelo negócio: é o cartão que a pessoa de negócio
 * abre para entender o módulo sem descer às stories. Renderizá-la com menos painéis que o Epic
 * reproduziria em menor escala o defeito que este bloco corrige.
 *
 * @param {{feature: Record<string, unknown>, stories: Record<string, unknown>[]}} node
 */
function renderFeatureCard(node) {
  const feature = node.feature;
  const fid = typeof feature.id === 'string' ? feature.id : '';
  const fname =
    typeof feature.name === 'string' && feature.name.trim()
      ? feature.name
      : typeof feature.title === 'string' && feature.title.trim()
        ? feature.title
        : fid;
  const moduleCode = typeof feature.moduleCode === 'string' ? feature.moduleCode : '';
  const summary =
    typeof feature.executiveSummary === 'string'
      ? feature.executiveSummary
      : typeof feature.summary === 'string'
        ? feature.summary
        : '';
  const featureStories = node.stories ?? [];
  const nTasks = featureStories.reduce((acc, s) => acc + asObjArray(normStorySchema(s).tasks).length, 0);

  const meta = [
    moduleCode ? `<span class="pill pill--rule">${escapeHtml(moduleCode)}</span>` : '',
    `<span class="pill">${escapeHtml(`${featureStories.length} ${featureStories.length === 1 ? 'história' : 'histórias'}`)}</span>`,
    nTasks ? `<span class="pill">${escapeHtml(`${nTasks} ${nTasks === 1 ? 'tarefa' : 'tarefas'}`)}</span>` : ''
  ].filter(Boolean).join(' ');

  const storiesHtml = featureStories.length
    ? `<div class="epic-stories">${featureStories.map(renderStoryCard).join('\n')}</div>`
    : '<p class="empty-notice">Nenhuma história nesta feature.</p>';

  return `<div class="epic-card feature-card" id="${escapeHtml(anchorFeature(fid))}"${attrRegra(temRegra(feature, featureStories))}>
      <h4 class="epic-card__title feature-card__title">${escapeHtml(fid ? `${fid} — ${fname}` : fname)}${selosDe(feature)}</h4>
      ${meta ? `<p class="feature-card__meta">${meta}</p>` : ''}
      ${summary ? `<p class="epic-card__summary">${escapeHtml(summary)}</p>` : ''}
      ${renderEpicBizPanels(feature, featureStories, 'feature')}
      ${storiesHtml}
    </div>`;
}

/**
 * Epic → Feature → Story → Task. Não substitui `renderEpicsWithStories`: é uma função SEPARADA,
 * usada só quando o documento tem `features[]`. Documento sem features passa pelo caminho antigo,
 * byte a byte — a skill é global e serve outros projetos.
 * @param {Record<string, unknown>[]} epics
 * @param {Record<string, unknown>[]} features
 * @param {Record<string, unknown>[]} stories
 */
function renderEpicsWithFeatures(epics, features, stories) {
  if (!epics.length) return renderFeaturesWithStories(features, stories);
  const { epicNodes, orphanFeatures, orphanStories } = buildBacklogTree(epics, features, stories);

  const epicBlocks = epicNodes.map((node) => {
    const epic = node.epic;
    const eid = typeof epic.id === 'string' ? epic.id : '';
    const ename = typeof epic.name === 'string' ? epic.name : (typeof epic.title === 'string' ? epic.title : eid);
    const summary = typeof epic.executiveSummary === 'string' ? epic.executiveSummary : (typeof epic.summary === 'string' ? epic.summary : '');

    // Stories do épico, para os painéis que somam filhos: as das features + as penduradas direto.
    const allChildStories = [...node.features.flatMap((f) => f.stories), ...node.directStories];

    const featuresHtml = node.features.length
      ? `<div class="epic-features">${node.features.map(renderFeatureCard).join('\n')}</div>`
      : '';
    // Epic SEM Feature — as stories ficam direto no épico, como antes da v6.1.
    const directHtml = node.directStories.length
      ? `<div class="epic-stories">${node.directStories.map(renderStoryCard).join('\n')}</div>`
      : '';
    const emptyHtml = !featuresHtml && !directHtml ? '<p class="empty-notice">Nenhuma feature ou história neste epic.</p>' : '';

    return `<div class="epic-card" id="${escapeHtml(anchorEpic(eid))}"${attrRegra(temRegra(epic, allChildStories))}>
      <h3 class="epic-card__title">${escapeHtml(eid ? `${eid} — ${ename}` : ename)}${selosDe(epic)}</h3>
      ${summary ? `<p class="epic-card__summary">${escapeHtml(summary)}</p>` : ''}
      ${renderEpicBizPanels(epic, allChildStories, 'epic')}
      ${featuresHtml}
      ${directHtml}
      ${emptyHtml}
    </div>`;
  }).join('\n');

  // Feature sem Epic — bloco próprio. Não é "story sem epic": o vínculo Feature→Story existe.
  const orphanFeatureBlock = orphanFeatures.length
    ? `<div class="epic-card epic-card--orphan" id="features-sem-epic">
        <h3 class="epic-card__title">Features sem Epic</h3>
        <p class="epic-card__summary">Estas features não estão associadas a nenhum Epic do documento. As histórias de cada uma continuam abaixo dela.</p>
        <div class="epic-features">${orphanFeatures.map(renderFeatureCard).join('\n')}</div>
      </div>`
    : '';

  const orphanBlock = orphanStories.length
    ? `<div class="epic-card epic-card--orphan" id="stories-sem-epic">
        <h3 class="epic-card__title">Stories sem Epic</h3>
        <p class="epic-card__summary">Estas histórias não estão associadas a nenhum Epic.</p>
        <div class="epic-stories">${orphanStories.map(renderStoryCard).join('\n')}</div>
      </div>`
    : '';

  return epicBlocks + orphanFeatureBlock + orphanBlock;
}

/** Feature → Story → Task: documento com features[] e sem epics[]. */
function renderFeaturesWithStories(features, stories) {
  if (!features.length) return renderStories(stories);
  const { orphanFeatures, orphanStories } = buildBacklogTree([], features, stories);

  const blocks = orphanFeatures.map(renderFeatureCard).join('\n');
  const orphanBlock = orphanStories.length
    ? `<div class="epic-card epic-card--orphan" id="stories-sem-feature">
        <h3 class="epic-card__title">Stories sem Feature</h3>
        <p class="epic-card__summary">Estas histórias não estão associadas a nenhuma Feature.</p>
        <div class="epic-stories">${orphanStories.map(renderStoryCard).join('\n')}</div>
      </div>`
    : '';
  return blocks + orphanBlock;
}

/** @param {Record<string, unknown>[]} stories */
function renderStories(stories) {
  return stories.map(renderStoryCard).join('\n');
}

/** @param {Record<string, unknown>} rawStory */
function renderStoryCard(rawStory) {
  const story = normStorySchema(rawStory);
  const id = typeof story.id === 'string' ? story.id : 'STORY';
  // O cabeçalho de Epic já caía para `title` antes do id (ver `ename` em renderEpicSection); a
  // story era a ÚNICA exceção, e por isso o CORPO dela mostrava só o ID quando o gerador emitia
  // `title` em vez de `name` — enquanto a sidebar mostrava o título por outro caminho, o que
  // tornava o defeito difícil de notar. Alinhado aqui; `normalizeLabels` em lib/load-tasks.mjs
  // cobre o mesmo caso na entrada, para todos os pontos de render de uma só vez.
  const name =
    typeof story.name === 'string' && story.name.trim()
      ? story.name
      : typeof story.title === 'string' && story.title.trim()
        ? story.title
        : id;
  const desc = typeof story.description === 'string' ? story.description : '';
  const priority = typeof story.priority === 'string' ? story.priority : '';
  const epic = typeof story.epic === 'string' ? story.epic : '';
  const usObj = isObj(story.userStory) ? story.userStory : null;
  const userStory = typeof story.userStory === 'string'
    ? story.userStory
    : usObj && usObj.asA && usObj.iWant && usObj.soThat
      ? `Como ${usObj.asA}, quero ${usObj.iWant}, para ${usObj.soThat}.`
      : '';
  const persona = typeof story.persona === 'string' ? story.persona : '';
  const storyEstDays = typeof story.estimatedDays === 'number' ? story.estimatedDays : null;
  const reqIds = asStrArray(story.requirementIds);
  const gapIds = asStrArray(story.gapIds);
  const tasks = asObjArray(story.tasks);
  const sumDays = tasks.reduce((acc, t) => {
    const d = typeof t.durationEstimatedDays === 'number'
      ? t.durationEstimatedDays
      : (typeof t.estimatedDays === 'number' ? t.estimatedDays : 0);
    return acc + d;
  }, 0);

  const priClass = `pill pill--pri pill--pri-${slugify(priority) || 'default'}`;

  const taskBlocks = tasks.map((t) => renderTaskDetails(t, id)).join('');

  const hasEnrichedNarrative =
    isObj(story.narrative) &&
    Boolean(story.narrative.context || story.narrative.userStoryStatement || story.narrative.problem);

  const storyMetaHtml =
    epic || persona || (!hasEnrichedNarrative && userStory) || reqIds.length || gapIds.length
      ? `<div class="story-meta story-meta--compact">
        ${epic ? `<span class="story-meta__chip"><strong>Épico</strong> ${escapeHtml(epic)}</span>` : ''}
        ${persona ? `<span class="story-meta__chip"><strong>Persona</strong> ${escapeHtml(persona)}</span>` : ''}
        ${!hasEnrichedNarrative && userStory ? `<blockquote class="story-userstory">${escapeHtml(userStory)}</blockquote>` : ''}
        ${reqIds.length ? `<span class="story-meta__chip story-meta__chip--req">${reqIds.map((r) => `<code>${escapeHtml(r)}</code>`).join(' ')}</span>` : ''}
        ${gapIds.length ? `<span class="story-meta__chip">${gapIds.map((g) => `<code class="pill pill--gap">${escapeHtml(g)}</code>`).join(' ')}</span>` : ''}
      </div>`
      : '';

  const bizPanelsHtml = renderStoryBizPanels(story);

  return `<article id="${escapeHtml(anchorStory(id))}" class="story-card"${attrRegra(temRegra(story))}>
    <header class="story-card__head story-card__head--compact">
      <div class="story-card__intro">
        <span class="story-card__id">${escapeHtml(id)}</span>
        <h3 class="story-card__title">${escapeHtml(name)}</h3>
        ${desc ? `<p class="story-card__desc">${escapeHtml(desc)}</p>` : ''}
        ${storyMetaHtml}
      </div>
      <div class="story-card__badges">
        ${seloOrdem(story)}
        ${seloRegra(story)}
        ${priority ? `<span class="${priClass}">${escapeHtml(priority)}</span>` : ''}
        <span class="pill pill--days">${escapeHtml(String(sumDays || storyEstDays || 0))} d est.</span>
        <span class="pill pill--count">${escapeHtml(String(tasks.length))} tarefas</span>
      </div>
    </header>
    ${bizPanelsHtml}
    <div class="story-card__tasks">
      <h4 class="story-card__tasks-title">Tarefas planejadas</h4>
      <div class="task-stack">${taskBlocks}</div>
    </div>
  </article>`;
}

/** @param {Record<string, unknown>} rawTask @param {string} storyId */
function renderTaskDetails(rawTask, storyId) {
  const task = normTaskSchema(rawTask);
  const tid = typeof task.id === 'string' ? task.id : '';
  const title = typeof task.title === 'string' ? task.title : tid;
  const seq = typeof task.sequence === 'number' ? task.sequence : 0;
  const days = typeof task.durationEstimatedDays === 'number' ? task.durationEstimatedDays : null;
  const owner = typeof task.owner === 'string' ? task.owner : '';
  const status = typeof task.status === 'string' ? task.status : '';
  const description = typeof task.description === 'string' ? task.description : '';
  // Campos v3 antes ignorados:
  const taskContext = typeof task.context === 'string' ? task.context : '';
  const priority = typeof task.priority === 'string' ? task.priority : '';
  const taskType = typeof task.type === 'string' ? task.type : '';
  const reqIds = asStrArray(task.requirementIds);
  const gapIds = asStrArray(task.gapIds);
  const fileTargets = asStrArray(task.fileTargets);

  const deps = asStrArray(task.dependencies);
  // Objeto OU array — ver renderTraceabilityInner. Ler só a forma array descartava em silêncio
  // a rastreabilidade das tasks (o schema emite objeto).
  const trace = renderTraceabilityInner(task.traceability);
  const business = isObj(task.business) ? task.business : null;
  const brules = asArray(task.businessRules);
  const trules = asObjArray(task.technicalRules);
  const api = isObj(task.apiContract) ? task.apiContract : null;
  const scenarios = asObjArray(task.acceptanceScenarios);
  const subtasks = asObjArray(task.subtasks);

  const traceHtml = trace.html;

  let businessHtml = '';
  if (business) {
    const lines = [
      ['Objetivo', business.objective],
      ['Contexto', business.usageContext],
      ['Pré-condições', Array.isArray(business.preconditions) ? business.preconditions.join('; ') : ''],
      ['Pós-êxito', Array.isArray(business.successPostconditions) ? business.successPostconditions.join('; ') : ''],
      ['Racional', business.rationale],
    ];
    const actors = Array.isArray(business.actors) ? business.actors.map(String) : [];
    const oos = Array.isArray(business.outOfScopeForThisTask) ? business.outOfScopeForThisTask.map(String) : [];
    businessHtml = `<div class="task-section"><h5>Negócio</h5>
      ${lines
        .filter(([, v]) => v)
        .map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`)
        .join('')}
      ${
        actors.length
          ? `<p><strong>Atores:</strong> ${actors.map((a) => escapeHtml(a)).join(', ')}</p>`
          : ''
      }
      ${
        Array.isArray(business.businessFlowSteps)
          ? `<ol class="flow-steps">${business.businessFlowSteps.map((s) => `<li>${escapeHtml(String(s))}</li>`).join('')}</ol>`
          : ''
      }
      ${
        oos.length
          ? `<div class="task-oos"><strong>Fora do escopo desta tarefa</strong><ul class="simple-list">${oos
              .map((x) => `<li>${escapeHtml(x)}</li>`)
              .join('')}</ul></div>`
          : ''
      }
    </div>`;
  }

  const brHtml = brules.length
    ? `<div class="task-section"><h5>Regras de negócio (tarefa)</h5><ul class="br-detail-list">${brules
        .map((b) => renderBusinessRuleItem(b))
        .filter(Boolean)
        .join('')}</ul></div>`
    : '';

  const trHtml = trules.length
    ? `<div class="task-section"><h5>Regras técnicas</h5><ul class="tr-detail-list">${trules
        .map((t) => {
          const id = typeof t.id === 'string' ? t.id : '';
          const src = typeof t.sourceRule === 'string' ? t.sourceRule : '';
          const desc = typeof t.description === 'string' ? t.description : '';
          const ex = typeof t.exactConstraint === 'string' ? t.exactConstraint : '';
          const app = typeof t.appliesTo === 'string' ? t.appliesTo : '';
          const vc = t.validationCommand != null && t.validationCommand !== '' ? String(t.validationCommand) : '';
          return `<li>
            <div class="tr-head"><code>${escapeHtml(id)}</code> <span class="tr-src">(${escapeHtml(src)})</span></div>
            <p class="tr-desc">${escapeHtml(desc)}</p>
            ${ex ? `<p class="tr-meta"><strong>Restrição exata:</strong> ${escapeHtml(ex)}</p>` : ''}
            ${app ? `<p class="tr-meta"><strong>Aplica-se a:</strong> ${escapeHtml(app)}</p>` : ''}
            ${vc ? `<p class="tr-meta"><strong>Validação:</strong> <code>${escapeHtml(vc)}</code></p>` : ''}
          </li>`;
        })
        .join('')}</ul></div>`
    : '';

  // `scope` no aviso de chave não renderizada = id da task, para que o aviso aponte o item exato.
  const warnScope = typeof task.id === 'string' ? task.id : '';

  let apiHtml = '';
  if (api) {
    apiHtml = renderApiContract(api, { scope: warnScope, path: 'apiContract' });
  }
  const apis = asObjArray(task.apiContracts);
  if (apis.length) {
    apiHtml += apis.map((a, i) => renderApiContract(a, { scope: warnScope, path: `apiContracts[${i}]` })).join('');
  }

  const persistHtml = isObj(task.persistenceModel)
    ? (isPersistenceModelV52(task.persistenceModel)
        ? renderPersistenceModelV52(task.persistenceModel, { scope: warnScope, path: 'persistenceModel' })
        : renderPersistenceModel(task.persistenceModel))
    : '';
  const guidanceHtml = isObj(task.implementationGuidance) ? renderImplementationGuidance(task.implementationGuidance) : '';
  const asyncHtml = asObjArray(task.asyncInterfaces).length ? renderAsyncInterfaces(asObjArray(task.asyncInterfaces)) : '';
  const legacyUiHtml = isObj(task.legacyUiScope) ? renderLegacyUiScope(task.legacyUiScope) : '';
  const uiContextHtml = renderUiContextSection(task.uiContext);

  const scenHtml = scenarios.length
    ? `<div class="task-section"><h5>Cenários de aceite (BDD)</h5>
      <div class="scenario-grid">${scenarios.map(renderScenario).join('')}</div></div>`
    : '';

  const subHtml = subtasks.length
    ? `<div class="task-section"><h5>Subtarefas</h5><ul class="subtask-list">${subtasks
        .map((s) => {
          if (typeof s === 'string') return `<li>${escapeHtml(s)}</li>`;
          if (!isObj(s)) return '';
          const sid = typeof s.id === 'string' ? s.id : '';
          const stitle = typeof s.title === 'string' ? s.title : '';
          const sdesc = typeof s.description === 'string' ? s.description : '';
          const sstatus = typeof s.status === 'string' ? s.status : '';
          return `<li>
            ${sid ? `<code>${escapeHtml(sid)}</code> ` : ''}<strong>${escapeHtml(stitle)}</strong>${sstatus ? ` <span class="pill pill--tiny">${escapeHtml(sstatus)}</span>` : ''}
            ${sdesc ? `<p class="subtask-desc">${escapeHtml(sdesc)}</p>` : ''}
          </li>`;
        })
        .filter(Boolean)
        .join('')}</ul></div>`
    : '';

  // Bloco "Identificação & metadados" (v3 fields antes silenciados)
  const taskMetaHtml = (priority || taskType || reqIds.length || gapIds.length)
    ? `<div class="task-meta-strip">
        ${priority ? `<span class="pill pill--pri pill--pri-${slugify(priority) || 'default'}">${escapeHtml(priority)}</span>` : ''}
        ${taskType ? `<span class="pill pill--type">${escapeHtml(taskType)}</span>` : ''}
        ${reqIds.length ? `<span class="task-reqs"><strong>Requisitos:</strong> ${reqIds.map((r) => `<code>${escapeHtml(r)}</code>`).join(' ')}</span>` : ''}
        ${gapIds.length ? `<span class="task-gaps"><strong>GAPs:</strong> ${gapIds.map((g) => `<code class="pill pill--gap">${escapeHtml(g)}</code>`).join(' ')}</span>` : ''}
      </div>`
    : '';
  const taskContextHtml = taskContext
    ? `<div class="task-section"><h5>Contexto</h5><p>${escapeHtml(taskContext)}</p></div>`
    : '';
  const fileTargetsHtml = fileTargets.length
    ? `<div class="task-section"><h5>Arquivos-alvo</h5><ul class="simple-list file-target-list">${fileTargets
        .map((f) => `<li><code>${escapeHtml(f)}</code></li>`)
        .join('')}</ul></div>`
    : '';

  const agentBlock = isObj(task.agentExecutionContext)
    ? renderAgentExecutionContext(task.agentExecutionContext)
    : '';
  const tacBlock = renderBullets('Critérios de aceite (tarefa)', asStrArray(task.taskAcceptanceCriteria));
  const implBlock = renderImplementationSteps(Array.isArray(task.implementationSteps) ? task.implementationSteps : []);
  const diagBlock = isObj(task.existingCodeDiagnosis) ? renderExistingCodeDiagnosis(task.existingCodeDiagnosis) : '';
  const techCtxBlock = isObj(task.technicalContext) ? renderTechnicalContext(task.technicalContext) : '';
  const valBlock = isObj(task.validation) ? renderValidationBlock(task.validation) : '';

  const summary = `${seq}. ${title}${days !== null ? ` · ${days}d` : ''}${owner ? ` · ${owner}` : ''}`;

  const taskAnchor = tid ? anchorTask(tid) : '';
  const taskIdAttr = taskAnchor ? ` id="${escapeHtml(taskAnchor)}"` : '';
  return `<details class="task-details"${taskIdAttr}${attrRegra(task.businessRuleHeavy === true)}>
    <summary class="task-details__summary">
      <span class="task-details__id">${escapeHtml(tid)}</span>
      <span class="task-details__title">${escapeHtml(summary)}</span>
      ${seloOrdem(task)}
      ${seloRegra(task)}
      ${status ? `<span class="pill pill--status">${escapeHtml(status)}</span>` : ''}
    </summary>
    <div class="task-details__body">
      ${taskMetaHtml}
      <p class="task-desc">${escapeHtml(description)}</p>
      ${taskContextHtml}
      ${agentBlock}
      ${tacBlock}
      ${implBlock}
      ${
        deps.length
          ? `<p class="task-deps"><strong>Dependências:</strong> ${deps.map((d) => `<code>${escapeHtml(d)}</code>`).join(', ')}</p>`
          : ''
      }
      ${traceHtml ? `<div class="task-section"><h5>Rastreabilidade</h5>${traceHtml}</div>` : ''}
      ${businessHtml}
      ${brHtml}
      ${trHtml}
      ${diagBlock}
      ${techCtxBlock}
      ${guidanceHtml}
      ${persistHtml}
      ${asyncHtml}
      ${legacyUiHtml}
      ${uiContextHtml}
      ${apiHtml}
      ${scenHtml}
      ${valBlock}
      ${fileTargetsHtml}
      ${subHtml}
      <p class="task-meta-muted"><small>Story: <code>${escapeHtml(storyId)}</code></small></p>
    </div>
  </details>`;
}

/** @param {Record<string, unknown>} s */
function renderScenario(s) {
  const cat = typeof s.category === 'string' ? s.category : '';
  const catSlug = slugify(cat) || 'default';
  const sid = typeof s.id === 'string' ? s.id : '';
  const title = typeof s.title === 'string' ? s.title : '';
  const cov = s.coverageNote != null && String(s.coverageNote).trim() !== '' ? String(s.coverageNote) : '';
  const testData = isObj(s.testData) ? s.testData : (typeof s.testData === 'string' ? s.testData : null);
  const verSteps = asStrArray(s.verificationSteps);
  const rules =
    Array.isArray(s.relatedRules) && s.relatedRules.length
      ? `<div class="scenario-card__footer">
          <p class="scenario-card__rules"><strong>Regras:</strong> ${s.relatedRules
            .map((r) => `<code>${escapeHtml(String(r))}</code>`)
            .join(' ')}</p>
          ${cov ? `<p class="scenario-card__cov"><em>Cobertura:</em> ${escapeHtml(cov)}</p>` : ''}
        </div>`
      : cov
        ? `<div class="scenario-card__footer"><p class="scenario-card__cov"><em>Cobertura:</em> ${escapeHtml(cov)}</p></div>`
        : '';
  const testDataHtml = testData
    ? `<div class="scenario-card__row"><span class="scenario-card__kw">Dados</span><pre class="json-block__pre json-block__pre--inline"><code>${escapeHtml(typeof testData === 'string' ? testData : JSON.stringify(testData, null, 2))}</code></pre></div>`
    : '';
  const verStepsHtml = verSteps.length
    ? `<div class="scenario-card__row"><span class="scenario-card__kw">Verificação</span><ol class="impl-steps">${verSteps.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ol></div>`
    : '';
  return `<article class="scenario-card scenario-card--${catSlug}">
    <header class="scenario-card__header">
      ${sid ? `<span class="scenario-card__id"><code>${escapeHtml(sid)}</code></span>` : ''}
      <span class="scenario-card__badge">${escapeHtml(cat || 'Cenário')}</span>
      ${title ? `<span class="scenario-card__title">${escapeHtml(title)}</span>` : ''}
    </header>
    <div class="scenario-card__body">
      <div class="scenario-card__row">
        <span class="scenario-card__kw">Dado</span>
        <p class="scenario-card__text">${escapeHtml(String(s.given || ''))}</p>
      </div>
      <div class="scenario-card__row">
        <span class="scenario-card__kw">Quando</span>
        <p class="scenario-card__text">${escapeHtml(String(s.when || ''))}</p>
      </div>
      <div class="scenario-card__row">
        <span class="scenario-card__kw">Então</span>
        <p class="scenario-card__text">${escapeHtml(String(s.then || ''))}</p>
      </div>
      ${testDataHtml}
      ${verStepsHtml}
    </div>
    ${rules}
  </article>`;
}

/** @param {string} label @param {unknown} obj */
function renderJsonBlock(label, obj) {
  if (obj === undefined || obj === null) return '';
  let text;
  try {
    text = JSON.stringify(obj, null, 2);
  } catch {
    text = String(obj);
  }
  return `<div class="json-block"><span class="json-block__label">${escapeHtml(label)}</span><pre class="json-block__pre"><code>${escapeHtml(
    text
  )}</code></pre></div>`;
}

/** @param {Record<string, unknown>} g */
function renderGlobalDeps(g) {
  const between = asObjArray(g.betweenStories);
  const critical = asStrArray(g.criticalPath);
  const bottlenecks = asStrArray(g.bottlenecks);

  const betweenRows = between
    .map((r) => {
      const from = typeof r.from === 'string' ? r.from : '';
      const to = typeof r.to === 'string' ? r.to : '';
      const reason = typeof r.reason === 'string' ? r.reason : '';
      return `<tr><td><code>${escapeHtml(from)}</code></td><td class="arrow-cell">→</td><td><code>${escapeHtml(
        to
      )}</code></td><td>${escapeHtml(reason)}</td></tr>`;
    })
    .join('');

  const pathVisual = critical
    .map((sid, i) => {
      const next = critical[i + 1];
      return `<span class="path-node">${escapeHtml(sid)}</span>${next ? '<span class="path-arrow">→</span>' : ''}`;
    })
    .join('');

  const bottleList = bottlenecks.map((b) => `<li><span class="pill pill--bottle">${escapeHtml(b)}</span></li>`).join('');

  return `<div class="card">
      <h3 class="card__h">Caminho crítico sugerido</h3>
      <div class="critical-path">${pathVisual || '—'}</div>
    </div>
    <div class="card mt">
      <h3 class="card__h">Dependências entre histórias</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>De</th><th></th><th>Para</th><th>Motivo</th></tr></thead>
          <tbody>${betweenRows || '<tr><td colspan="4">—</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    ${
      bottlenecks.length
        ? `<div class="card mt"><h3 class="card__h">Gargalos / riscos citados</h3><ul class="tag-list tag-list--wrap">${bottleList}</ul></div>`
        : ''
    }`;
}

/** @param {Record<string, unknown>[]} glossary */
function renderGlossary(glossary) {
  return `<div class="glossary-grid">${glossary
    .map((e) => {
      const term = typeof e.term === 'string' ? e.term : '';
      const def = typeof e.definition === 'string' ? e.definition : '';
      return `<div class="glossary-item"><strong>${escapeHtml(term)}</strong><p>${escapeHtml(def)}</p></div>`;
    })
    .join('')}</div>`;
}

/** @param {Record<string, unknown>[]} refs */
function renderExternalRefs(refs) {
  const rows = refs
    .map((r) => {
      const name = typeof r.name === 'string' ? r.name : '';
      const url = typeof r.url === 'string' ? r.url : '';
      const desc = typeof r.description === 'string' ? r.description : '';
      const link =
        url && url.startsWith('http')
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>`
          : escapeHtml(name);
      return `<tr><td>${link}</td><td>${escapeHtml(desc)}</td></tr>`;
    })
    .join('');
  return `<div class="table-wrap card card--pad">
    <table class="data-table">
      <thead><tr><th>Nome</th><th>Descrição</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2">—</td></tr>'}</tbody>
    </table>
  </div>`;
}
