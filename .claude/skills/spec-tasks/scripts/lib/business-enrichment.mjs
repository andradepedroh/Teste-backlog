/**
 * business-enrichment.mjs — preenchimento de NEGÓCIO dos níveis Epic / Feature / Story
 * (cartões de Kanban) a partir de (a) documentos de origem do pipeline SDD e (b) síntese das
 * tasks filhas, nesta ordem de precedência.
 *
 * =============================================================================================
 * TRÊS DEFEITOS CORRIGIDOS NA v3 — ler antes de editar
 * =============================================================================================
 *
 * (1) BOILERPLATE DE OUTRO DOMÍNIO (era: fallbacks hardcoded)
 *     A v2 tinha strings de fallback de um projeto de licenciamento ambiental
 *     ("autoatendimento orientado com transparência e respaldo legal", "portal de entrada com
 *     serviços ambientais digitais", ator default "Usuário / Requerente"…). Rodando em outro
 *     domínio, TODAS as stories recebiam pitch idêntico e factualmente falso, sem nenhum sinal.
 *     A SKILL.md declara a skill agnóstica de projeto; a lib violava isso.
 *     → Agora: sem insumo real, o campo NÃO é preenchido e a lacuna é registrada em
 *       `metadata.enrichmentGaps[]`. As strings removidas ficam em
 *       NARRATIVE_BOILERPLATE_DENYLIST para o validador NARRATIVE_NOT_BOILERPLATE conseguir
 *       reprovar qualquer reintrodução.
 *
 * (2) SOBRESCRITA DESTRUTIVA (era: atribuição direta)
 *     `story.acceptanceCriteria = buildStoryAcceptanceCriteria(...)` trocava 4 critérios
 *     específicos e corretos por 1 genérico. Idem `narrative` e `businessRules`.
 *     → Agora o enriquecimento é ADITIVO: só preenche campo ausente/vazio e faz UNIÃO em
 *       arrays (entradas existentes sobrevivem verbatim). Substituir exige `--overwrite`, que
 *       imprime no stdout o diff do que será perdido, item por item. O validador
 *       ENRICHMENT_NO_CONTENT_LOSS compara antes/depois.
 *     → Consequência desejada: rodar duas vezes é idempotente (byte-idêntico).
 *
 * (3) NÍVEIS SEM ANCORAGEM (era: só síntese das tasks)
 *     Os documentos de origem (requirements.md, business-rules.md, modules.md,
 *     product-vision.md) não eram lidos em nenhum ponto. O passo B' da SKILL ("esboço de
 *     negócio por nível ANTES das tasks") era prosa não executável.
 *     → Agora, quando os documentos estão disponíveis, cada bloco de negócio é EXTRAÍDO deles
 *       e carrega `sourceRefs[]` = [{document, section, itemId}]. Sem documentos, NÃO há
 *       síntese de prosa: a lacuna é registrada e o validador LEVEL_GROUNDED_IN_SOURCE falha.
 *       Síntese a partir das tasks continua válida apenas para `mainFlow` e `deliveryScope`,
 *       que são genuinamente derivados das tasks.
 *
 * Concordância: o template do pitch NÃO assume gênero nem artigo ("Para <ator>, <capacidade> —
 * <oferta>"). A v2 montava "o ${capability}" e gerava "o capacidade do sistema".
 */
import { loadSourceDocs, isEmptySourceIndex, extractIds, leadParagraph, stripMd } from './source-docs.mjs';

const TECH_FLOW_PATTERN =
  /JWT|@Transactional|Repository|Bean Validation|RestAssured|OpenTelemetry|Micrometer|ProblemDetail|RFC\s*7807|X-Correlation|Correlation-Id|Idempotency-Key|Oracle|TB_[A-Z_]+|\/api\/|endpoint|GET \/|POST \/|React|Angular|OAuth|OIDC|JWT|homologa[cç][aã]o|validad[ao] em conjunto|stories filhas.*entregues|task[s]? vinculad/i;

const TECH_SCENARIO_PATTERN =
  /SCEN-\d+|consultarProcessoPublico|GET \/|POST \/|PUT \/|PATCH \/|DELETE \/|expectedDatabaseState|testData|statusCode|problem\+json/i;

const EXECUTION_CRITERION_PATTERN =
  /stories filhas|entregues e validadas|validad[ao] em homologa|task[s]? (conclu|entreg)|épico em execução|capacidade macro:/i;

const IMPLEMENTATION_VERB_PATTERN =
  /\b(implementar|desenvolver|configurar|endpoint|API REST|componente|módulo técnico)\b/i;

/** Versão do motor, gravada em `metadata.businessEnrichment.version`. */
export const ENRICHMENT_VERSION = '3.0-grounded-additive';

/**
 * Strings de fallback de domínio REMOVIDAS na v3, mais os rótulos genéricos que ocupavam o
 * lugar de conteúdo real. Exportado para que NARRATIVE_NOT_BOILERPLATE (validador FATAL) possa
 * reprovar qualquer reintrodução — por edição desta lib ou por texto colado no tasks.json.
 *
 * REGRA: nada entra nesta lista como "texto aceitável". Toda entrada aqui é proibida em
 * narrativa emitida. Ao remover um novo fallback, ACRESCENTE-O aqui.
 */
export const NARRATIVE_BOILERPLATE_DENYLIST = [
  'autoatendimento orientado com transparência e respaldo legal',
  'portal de entrada com serviços ambientais digitais',
  'ponto de entrada com serviços digitais',
  'o usuário não sabe qual serviço usar e recorre ao suporte por telefone',
  'o usuário depende de suporte manual para entender qual serviço utilizar',
  'escolher o serviço correto com clareza, sem depender de suporte telefônico',
  'sem depender de suporte telefônico',
  'autoatendimento orientado, transparência e redução de sobrecarga no atendimento',
  'diferente do cenário atual de atendimento manual e baixa autonomia',
  'diferente do cenário atual, em que o usuário depende de suporte manual',
  'redução de atendimento manual e aumento de autoserviço',
  'problema de negócio a ser endereçado por esta entrega',
  'valor entregue ao usuário/requerente ou à operação do negócio',
  'o usuário consegue realizar a jornada de negócio desta história sem depender de suporte manual',
  'entrega de valor de negócio alinhada à história',
  'uma capacidade de negócio da aplicação',
  'capacidade do sistema',
  'usuários do sistema',
  'usuário / requerente',
  'equipe de operação'
];

// ---------------------------------------------------------------------------
// Utilitários de texto (sem conteúdo de domínio)
// ---------------------------------------------------------------------------

function uniqueById(items, idKey = 'id') {
  const map = new Map();
  for (const item of items) {
    if (!item) continue;
    const key = typeof item === 'string' ? item : item[idKey] ?? item.title ?? JSON.stringify(item).slice(0, 80);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function sanitizeBusinessText(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/\(RF-[A-Z0-9-]+\)/g, '')
    .trim();
}

/**
 * Remove jargão técnico da narrativa executiva.
 * APLICAR SÓ EM TEXTO SINTETIZADO por esta lib. Texto copiado verbatim de documento de origem
 * (com `sourceRef`) NÃO passa por aqui: reescrever silenciosamente a palavra do autor — inclusive
 * texto de fonte regulatória — é pior do que deixar o validador apontar o termo técnico.
 */
function deTechNarrative(text = '') {
  return sanitizeBusinessText(text)
    .replace(/\bendpoints?\b/gi, 'serviços digitais')
    .replace(/\bOAuth\s*2\.?\d*/gi, 'login federado')
    .replace(/\bJWT\b/gi, 'credencial de acesso')
    .replace(/\bAPI\s+REST\b/gi, 'integração entre sistemas')
    .replace(/\bWCAG\s*2\.?\d*/gi, 'padrões de acessibilidade digital')
    .replace(/\bReact\b|\bAngular\b/gi, 'interface da aplicação')
    .replace(/\b(implementar|desenvolver|configurar)\b/gi, 'disponibilizar');
}

function isTechnicalText(text = '') {
  return TECH_FLOW_PATTERN.test(text) || IMPLEMENTATION_VERB_PATTERN.test(text);
}

function firstSentence(text = '', max = 220) {
  const clean = sanitizeBusinessText(text);
  if (!clean) return '';
  const m = clean.match(/^[^.!?]+[.!?]/);
  const s = m ? m[0].trim() : clean;
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
}

/** Minúscula na primeira letra — para encaixar uma frase própria dentro de outra. */
function lower1(s = '') {
  const t = String(s).trim().replace(/[.;]+$/, '');
  if (!t) return '';
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Remove um token de ID à esquerda ("US-ACESSO-01: ", "RF-MOD-X-001 — ") e devolve o rótulo humano. */
function humanLabel(name = '') {
  const t = sanitizeBusinessText(name);
  if (!t) return '';
  const stripped = t
    .replace(/^\s*[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\s*[:—–-]\s*/, '')
    .replace(/^\s*\[[^\]]+\]\s*/, '')
    .trim();
  const candidate = stripped || t;
  // Sobrou só um identificador? Então não há rótulo humano nenhum.
  if (/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(candidate.replace(/\s+/g, ''))) return '';
  return candidate;
}

function humanizeTaskTitle(title = '') {
  let t = deTechNarrative(String(title)).replace(/�/g, '').trim();
  const dashParts = t.split(/\s*—\s*/);
  if (dashParts.length > 1) {
    const business = dashParts.slice(1).join(' — ').trim();
    if (business.length > 10 && !isTechnicalText(business)) return business;
  }
  const afterBrace = t.match(/\}\s+(.+)$/);
  if (afterBrace?.[1] && afterBrace[1].length > 10 && !isTechnicalText(afterBrace[1])) {
    return afterBrace[1].trim();
  }
  t = t
    .replace(/^(Endpoint|Componente|Testes?)\s+/i, '')
    .replace(/\b(GET|POST|PUT|PATCH|DELETE)\b\s+/gi, '')
    .replace(/\/api\/\S+/gi, '')
    .replace(/\/v\d+\/\S+/gi, '')
    .replace(/\{[^}]+\}/g, '')
    .replace(/^[\s—–\-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > 10 ? t : deTechNarrative(title).replace(/�/g, '').trim();
}

function isTechnicalFlowStep(step) {
  const s = String(step).trim();
  if (!s || TECH_FLOW_PATTERN.test(s)) return true;
  if (/^\/|^\/?api\/|^\/?v\d+\//i.test(s)) return true;
  return false;
}

function isTechnicalScenario(sc) {
  const blob = [sc.id, sc.title, sc.given, sc.when, sc.then].filter(Boolean).join(' ');
  if (sc.testData && Object.keys(sc.testData).length > 0) return true;
  return TECH_SCENARIO_PATTERN.test(blob);
}

// ---------------------------------------------------------------------------
// Semântica ADITIVA: vazio, igualdade, atribuição e união
// ---------------------------------------------------------------------------

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Vazio = ausente, string em branco, array sem itens, objeto sem chave com valor não-vazio. */
function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (isObj(v)) return Object.values(v).every(isEmptyValue);
  return false;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && deepEqual(a[k], b[k]));
  }
  return false;
}

/** Contexto de execução do enriquecimento (aditivo por padrão). */
function makeCtx(options = {}) {
  return {
    overwrite: options.overwrite === true,
    sources: options.sources ?? null,
    /** @type {{scope:string, field:string, reason:string}[]} */
    gaps: [],
    /** @type {{scope:string, field:string, kind:string, before:unknown, after:unknown}[]} */
    losses: [],
    /** @type {{scope:string, field:string, action:string}[]} */
    changes: []
  };
}

/**
 * Atribuição ADITIVA. Só escreve em campo vazio; com `overwrite`, escreve e registra a perda.
 * @returns {boolean} true se escreveu
 */
function setField(ctx, target, key, value, scope, fieldPath) {
  if (isEmptyValue(value)) return false;
  const current = target[key];
  if (!isEmptyValue(current)) {
    if (!ctx.overwrite) return false;
    if (deepEqual(current, value)) return false;
    ctx.losses.push({ scope, field: fieldPath, kind: 'overwrite', before: current, after: value });
    target[key] = value;
    ctx.changes.push({ scope, field: fieldPath, action: 'overwritten' });
    return true;
  }
  target[key] = value;
  ctx.changes.push({ scope, field: fieldPath, action: 'filled' });
  return true;
}

/**
 * UNIÃO de arrays: entradas existentes sobrevivem VERBATIM e na ordem original; entradas novas
 * são anexadas quando a chave ainda não existe. Nunca encolhe — é o que
 * ENRICHMENT_NO_CONTENT_LOSS verifica.
 */
function unionArray(ctx, target, key, incoming, keyFn, scope, fieldPath) {
  const existing = Array.isArray(target[key]) ? target[key] : [];
  const add = Array.isArray(incoming) ? incoming : [];
  if (!add.length) {
    if (existing.length && !Array.isArray(target[key])) target[key] = existing;
    return existing;
  }
  const seen = new Set(existing.map(keyFn).filter(Boolean));
  const appended = [];
  for (const item of add) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    appended.push(item);
  }
  const out = [...existing, ...appended];
  target[key] = out;
  if (appended.length) {
    ctx.changes.push({ scope, field: fieldPath, action: `appended:${appended.length}` });
  }
  return out;
}

function gap(ctx, scope, field, reason) {
  ctx.gaps.push({ scope, field, reason });
}

/** Chave de deduplicação de critério: id quando houver, senão o statement normalizado. */
const criterionKey = (c) =>
  typeof c === 'string' ? c.trim().toLowerCase() : (c?.id ?? c?.statement ?? '').toString().trim().toLowerCase();
const ruleKey = (r) => (typeof r === 'string' ? r.trim().toLowerCase() : (r?.id ?? '').toString().trim().toLowerCase());
const refKey = (r) => `${r?.document ?? ''}#${r?.section ?? ''}#${r?.itemId ?? ''}`.toLowerCase();

// ---------------------------------------------------------------------------
// FIX 2b — normalização defensiva de rótulo humano
// ---------------------------------------------------------------------------

/**
 * `name` é a chave CANÔNICA de rótulo humano em Epic/Feature/Story (required no schema);
 * `title` é alias opcional. Consumidores que leem só `name` produziam "US-X: US-X" no ADO e o
 * corpo da story sem título no HTML. Normalizar na ENTRADA resolve para todos de uma vez.
 * @param {Record<string, any>} item
 */
export function normalizeItemLabel(item) {
  if (!isObj(item)) return item;
  if (isEmptyValue(item.name)) {
    const fallback = !isEmptyValue(item.title) ? item.title : item.id;
    if (!isEmptyValue(fallback)) item.name = fallback;
  }
  return item;
}

/** Aplica normalizeItemLabel em epics[], features[] e stories[]. */
export function normalizeDocumentLabels(doc) {
  if (!isObj(doc)) return doc;
  for (const key of ['epics', 'features', 'stories']) {
    for (const item of Array.isArray(doc[key]) ? doc[key] : []) normalizeItemLabel(item);
  }
  return doc;
}

// ---------------------------------------------------------------------------
// Resolução de origem (FIX 12) — de onde vem o negócio de cada nível
// ---------------------------------------------------------------------------

/** IDs de RF que uma story/feature/epic declara realizar. Só dado presente no artefato. */
function resolveRequirementIds(item) {
  const tr = isObj(item?.traceability) ? item.traceability : {};
  const declared = [
    ...(Array.isArray(tr.requirementIds) ? tr.requirementIds : []),
    ...(typeof tr.rf === 'string' ? [tr.rf] : Array.isArray(tr.rf) ? tr.rf : []),
    ...(typeof tr.productRequirement === 'string' ? [tr.productRequirement] : []),
    ...(Array.isArray(item?.sourceRefs) ? item.sourceRefs.map((r) => r?.itemId) : [])
  ].filter((x) => typeof x === 'string');
  const fromText = extractIds([item?.id, item?.name, item?.title].filter(Boolean).join(' '), ['RF', 'RNF']);
  const fromTasks = (Array.isArray(item?.tasks) ? item.tasks : []).flatMap((t) => {
    const ttr = isObj(t?.traceability) ? t.traceability : {};
    return [
      ...(Array.isArray(ttr.requirementIds) ? ttr.requirementIds : []),
      ...extractIds([t?.title, ttr.rf].filter(Boolean).join(' '), ['RF', 'RNF'])
    ].filter((x) => typeof x === 'string');
  });
  return [...new Set([...declared, ...fromText, ...fromTasks].map((s) => s.toUpperCase()))].filter((s) =>
    /^RN?F(-NOVO)?-/.test(s)
  );
}

/** IDs de RN aplicáveis a uma story. Só dado presente no artefato + o vínculo declarado no RF. */
function resolveRuleIds(item, requirements) {
  const declared = [
    ...(Array.isArray(item?.businessRulesApplicable) ? item.businessRulesApplicable : []),
    ...(Array.isArray(item?.businessRules) ? item.businessRules.map((r) => (typeof r === 'string' ? r : r?.id)) : []),
    ...(Array.isArray(item?.tasks)
      ? item.tasks.flatMap((t) =>
          (Array.isArray(t?.businessRules) ? t.businessRules : []).map((r) => (typeof r === 'string' ? r : r?.id))
        )
      : [])
  ].filter((x) => typeof x === 'string');
  const fromRequirements = requirements.flatMap((rf) => rf?.relatedRuleIds ?? []);
  return [...new Set([...declared, ...fromRequirements].map((s) => s.toUpperCase()))]
    .flatMap((s) => extractIds(s, ['RN', 'RN-NOVO']))
    .filter(Boolean);
}

/** Código de módulo de uma Feature/Epic — declarado, não inferido de prosa. */
function resolveModuleCodes(item, requirements) {
  const declared = [
    ...(typeof item?.moduleCode === 'string' ? [item.moduleCode] : []),
    ...(Array.isArray(item?.moduleScope) ? item.moduleScope : []),
    ...(Array.isArray(item?.modules) ? item.modules : [])
  ].filter((x) => typeof x === 'string');
  const fromIds = extractIds([item?.id, item?.name, item?.title].filter(Boolean).join(' '), ['MOD']);
  const fromRequirements = requirements.flatMap((rf) => rf?.moduleCodes ?? []);
  return [...new Set([...declared, ...fromIds, ...fromRequirements].flatMap((s) => extractIds(s, ['MOD'])))];
}

function lookupRequirements(ctx, ids) {
  if (!ctx.sources) return [];
  return ids.map((id) => ctx.sources.requirements.get(id)).filter(Boolean);
}
function lookupRules(ctx, ids) {
  if (!ctx.sources) return [];
  return ids.map((id) => ctx.sources.rules.get(id)).filter(Boolean);
}
/**
 * Resolve códigos de módulo contra o catálogo de modules.md.
 *
 * Necessário porque o código chega como SUFIXO de um id de RF: `RF-MOD-AUTH-003` produz o token
 * `MOD-AUTH-003`, que não existe no catálogo — o catálogo tem `MOD-AUTH`. Sem esta resolução,
 * TODA Feature ficava sem sourceRef ("nenhuma entrada de modules.md resolvível") mesmo com o
 * modules.md presente e correto.
 *
 * A resolução é por PREFIXO decrescente (`MOD-AUTH-003` → `MOD-AUTH` → `MOD`) e só aceita
 * entrada que exista no catálogo — não inventa módulo.
 */
function lookupModules(ctx, codes) {
  if (!ctx.sources) return [];
  const catalog = ctx.sources.modules;
  const out = new Map();
  for (const code of codes) {
    let key = String(code ?? '').toUpperCase();
    while (key.includes('-')) {
      if (catalog.has(key)) {
        out.set(key, catalog.get(key));
        break;
      }
      key = key.slice(0, key.lastIndexOf('-'));
    }
  }
  return [...out.values()];
}

/** sourceRef de um item de documento de origem. */
const toSourceRef = (item) => ({ document: item.document, section: item.section, itemId: item.id ?? item.code });

/**
 * Classe efetiva do item — mesma resolução dos validadores (SKILL.md § "Classes de task").
 * Story de UAT NÃO tem RF de origem: a fonte dela é o `test-plan.md`. Exigir sourceRef de RF
 * nesse caso produziria lacuna falsa em toda story de homologação.
 */
function resolveItemClass(item) {
  const explicit = String(item?.class ?? '').toLowerCase();
  if (explicit) return explicit;
  if (item?.generatedBy === 'spec-security-review') return 'security';
  if (item?.generatedBy === 'spec-test-plan') return 'uat';
  if (String(item?.testType ?? '').toUpperCase() === 'UAT') return 'uat';
  const taskClasses = (Array.isArray(item?.tasks) ? item.tasks : []).map((t) => String(t?.class ?? '').toLowerCase());
  if (taskClasses.length && taskClasses.every((c) => c === 'uat')) return 'uat';
  if (taskClasses.length && taskClasses.every((c) => c === 'security')) return 'security';
  return 'functional';
}

/**
 * sourceRefs de uma story de UAT / segurança, a partir do documento que a originou
 * (`sourceDocument` + `testCaseIds` das tasks, ou o threat-model no caso de segurança).
 * @returns {{document:string, section:string, itemId:string}[]}
 */
function classSourceRefs(item, klass) {
  const doc = typeof item?.sourceDocument === 'string' ? item.sourceDocument.split(/[\\/]/).pop() : '';
  if (klass === 'uat') {
    const tcs = [
      ...(Array.isArray(item?.testCaseIds) ? item.testCaseIds : []),
      ...(Array.isArray(item?.tasks) ? item.tasks.flatMap((t) => (Array.isArray(t?.testCaseIds) ? t.testCaseIds : [])) : [])
    ].filter((x) => typeof x === 'string');
    const document = doc || 'test-plan.md';
    if (!tcs.length) return [{ document, section: 'Roteiro de homologação', itemId: item?.id ?? 'UAT' }];
    return [...new Set(tcs)].slice(0, 20).map((tc) => ({ document, section: 'Roteiro de homologação', itemId: tc }));
  }
  if (klass === 'security') {
    const document = doc || 'threat-model.md';
    const ids = [
      ...(Array.isArray(item?.tasks) ? item.tasks.map((t) => t?.security?.threatId ?? t?.id) : []),
      item?.id
    ].filter((x) => typeof x === 'string');
    return [...new Set(ids)].slice(0, 20).map((id) => ({ document, section: 'Vetores e controles', itemId: id }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Elevator pitch — retorna null quando não há insumo real
// ---------------------------------------------------------------------------

/**
 * Template SEM artigo e SEM gênero assumido: "Para <ator>, <capacidade> — <oferta>."
 * A v2 montava "o ${capability} é ${productOffer}" e produzia "o capacidade do sistema é …".
 * @returns {string|null}
 */
function buildElevatorPitch({ actor, capability, productOffer, currentPain, impact }) {
  if (!actor || !capability) return null;
  if (!productOffer && !impact) return null;
  let text = `Para ${actor}, ${capability}`;
  if (productOffer) text += ` — ${lower1(productOffer)}`;
  text += '.';
  if (currentPain) text += ` Diferente do cenário atual, em que ${lower1(currentPain)},`;
  if (impact) {
    text += currentPain ? ` esta entrega permite ${lower1(impact)}.` : ` Esta entrega permite ${lower1(impact)}.`;
  }
  return deTechNarrative(text).slice(0, 1200);
}

/**
 * Ator: só de dado real (documento de origem, `narrative.actors`, `businessSummary.actors`,
 * `userStory.asA`). A v2 caía em 'Usuário / Requerente' / 'usuários do sistema'.
 * @returns {string|null}
 */
function deriveActor(item, fromSummary, requirements, modules) {
  const candidates = [
    ...(Array.isArray(fromSummary?.actors) ? fromSummary.actors : []),
    ...(Array.isArray(item?.narrative?.actors) ? item.narrative.actors : []),
    ...(typeof item?.userStory?.asA === 'string' ? [item.userStory.asA] : []),
    ...requirements.flatMap((rf) => rf.actors ?? []),
    ...modules.flatMap((m) => m.actors ?? [])
  ]
    .map((a) => sanitizeBusinessText(a))
    .filter((a) => a.length > 2 && !isDenied(a));
  return candidates[0] ?? null;
}

/**
 * Capacidade: SUBSTANTIVO NOMEADO (nome do módulo, rótulo humano do item, ou título do RF).
 * Nunca o código sozinho — "Para o fiscal, MOD-AUTH — …" não é narrativa de negócio.
 * @returns {string|null}
 */
function deriveCapability(item, requirements, modules) {
  const fromModule = modules.map((m) => sanitizeBusinessText(m.name)).find((n) => n && !/^MOD-/i.test(n));
  if (fromModule) return fromModule;
  const own = humanLabel(item?.name) || humanLabel(item?.title);
  if (own) return own;
  const fromRf = requirements.map((rf) => sanitizeBusinessText(rf.title)).find(Boolean);
  return fromRf || null;
}

/** Uma das strings proibidas (comparação normalizada, sem acento e sem pontuação). */
function isDenied(text) {
  const norm = String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[.,;:!?"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!norm) return false;
  return NARRATIVE_BOILERPLATE_DENYLIST.some((d) => {
    const dn = d
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .replace(/[.,;:!?"'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return norm === dn || norm.includes(dn);
  });
}

// ---------------------------------------------------------------------------
// Síntese legítima a partir das tasks (mainFlow e deliveryScope)
// ---------------------------------------------------------------------------

function buildBusinessMainFlow(tasks) {
  const steps = [];
  const sorted = [...tasks].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  for (const task of sorted) {
    if (/^Testes?\s/i.test(task.title ?? '')) continue;
    const bizSteps = task.business?.businessFlowSteps;
    if (Array.isArray(bizSteps) && bizSteps.length) {
      for (const s of bizSteps) {
        const t = String(s).replace(/^\d+\.\s*/, '').trim();
        if (t.length > 10 && !isTechnicalFlowStep(t)) steps.push(t);
      }
    } else if (task.title) {
      const label = humanizeTaskTitle(task.title);
      if (label.length > 10 && !isTechnicalFlowStep(label)) steps.push(label);
    }
  }
  const unique = uniqueById(steps.map((s) => ({ id: s, title: s })), 'id').map((x) => x.title);
  return unique.slice(0, 7);
}

function sanitizeEpicMainFlow(capabilities, childStories) {
  const fromCapabilities = (capabilities ?? [])
    .map((c) => String(c).trim())
    .filter((c) => c.length > 3 && !TECH_FLOW_PATTERN.test(c));
  if (fromCapabilities.length) return fromCapabilities.slice(0, 10);
  return uniqueById(
    childStories.flatMap((s) => s.narrative?.mainFlow ?? []).map((x) => ({ id: x, title: x })),
    'id'
  )
    .map((x) => x.title)
    .filter((s) => !isTechnicalFlowStep(s))
    .slice(0, 10);
}

/**
 * `deliveryScope[]` — derivado das tasks, portanto legítimo mesmo sem documento de origem.
 * Sem `objective`/`description` na task, o item entra SEM `businessOutcome` (a v2 preenchia com
 * "Entrega de valor de negócio alinhada à história", que não diz nada).
 */
function buildDeliveryScope(tasks) {
  return [...tasks]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((task) => {
      const outcome =
        firstSentence(task.business?.objective, 200) ||
        firstSentence(task.description, 200) ||
        humanizeTaskTitle(task.title ?? '');
      const item = {
        taskId: task.id,
        title: humanizeTaskTitle(task.title ?? '') || task.title || task.id
      };
      if (outcome) item.businessOutcome = outcome;
      return item;
    });
}

// ---------------------------------------------------------------------------
// Critérios de aceite e regras — ancorados, sem fallback genérico
// ---------------------------------------------------------------------------

function toBusinessCriterion(id, statement, category, extra = {}) {
  const st = sanitizeBusinessText(statement);
  if (!st || st.length < 20 || isTechnicalText(st) || EXECUTION_CRITERION_PATTERN.test(st) || isDenied(st)) {
    return null;
  }
  return { id, category: category ?? 'OUTCOME', statement: st, ...extra };
}

/** Conector do «dado» como o autor escreveu — «Dado que» + oração (template da spec-product) ou «Dado» + nome. */
const GIVEN_LEAD = /^(dado que|dado|given that|given)\s+/i;

/**
 * Cenário BDD → critério de aceite em UMA frase, mantendo a regência do autor. O template da
 * spec-product escreve «Dado que <oração> / Quando <oração> / Então <oração>», e a frase sai
 * «Dado que <oração>, quando <oração>, <oração>.».
 *
 * A versão anterior montava «Quando <dado>, ao <quando>, <então>» com «ao» fixo — e «ao» só rege
 * infinitivo («ao salvar»). Sobre o «Quando» do template, que é oração com sujeito, saía «ao o
 * vendedor lança…» (D52 do teste ponta a ponta: 32 critérios no tasks.json, que seguiam para o ADO,
 * o Kit HTML e a auditoria). Aqui o «quando» é tratado como oração, e o «dado» mantém o conector
 * que o autor usou (`givenKeyword`, do leitor de requirements.md; ou o prefixo do próprio texto).
 */
function scenarioToStatement(sc) {
  const tidy = (s, lead) => sanitizeBusinessText(s).replace(lead, '').replace(/[\s.;,]+$/, '').trim();
  const rawGiven = sanitizeBusinessText(sc.given);
  const lead = GIVEN_LEAD.exec(rawGiven)?.[1] ?? sc.givenKeyword ?? '';
  const given = tidy(rawGiven, GIVEN_LEAD);
  const when = tidy(sc.when, /^(quando|when)\s+/i);
  const then = tidy(Array.isArray(sc.then) ? sc.then.join('; ') : sc.then, /^(ent[ãa]o|then)\s+/i);
  const conector = /^(dado|given)$/i.test(lead.trim()) ? 'Dado' : 'Dado que';
  if (given && when && then) return `${conector} ${given}, quando ${when}, ${then}.`;
  if (when && then) return `Quando ${when}, ${then}.`;
  return then || when || given || '';
}

/**
 * Critérios CANDIDATOS da story. Ordem de precedência das fontes:
 *  1. cenários BDD do RF em requirements.md (FIX 12: o insumo mais rico, com sourceRef)
 *  2. `businessSummary.storyAcceptanceCriteria[]` (legado v5.0)
 *  3. `acceptanceScenarios[]` da própria story (legado v5.0)
 *  4. um HAPPY_PATH representativo por task
 * SEM fallback genérico: story sem nenhuma dessas fontes fica com array vazio e o validador
 * HAS_ACCEPTANCE_CRITERIA reprova — que é o comportamento correto.
 */
function buildStoryAcceptanceCriteria(story, tasks, fromSummary, requirements) {
  const criteria = [];
  const seen = new Set();
  const add = (c) => {
    if (!c) return;
    const key = c.statement.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    criteria.push(c);
  };

  requirements.forEach((rf) => {
    (rf.scenarios ?? []).forEach((sc, i) => {
      if (isTechnicalScenario(sc)) return;
      const stmt = scenarioToStatement(sc);
      add(
        toBusinessCriterion(`AC-${story.id}-${rf.id}-${String(i + 1).padStart(2, '0')}`, stmt, 'HAPPY_PATH', {
          sourceStoryIds: [story.id],
          relatedRuleIds: rf.relatedRuleIds ?? []
        })
      );
    });
  });

  for (const [i, line] of (fromSummary.storyAcceptanceCriteria ?? []).entries()) {
    add(
      toBusinessCriterion(`AC-${story.id}-OUT-${i + 1}`, String(line), 'OUTCOME', { sourceStoryIds: [story.id] })
    );
  }

  for (const sc of story.acceptanceScenarios ?? []) {
    if (isTechnicalScenario(sc)) continue;
    add(
      toBusinessCriterion(sc.id ?? `AC-${story.id}-SC-${criteria.length + 1}`, scenarioToStatement(sc), sc.category ?? 'HAPPY_PATH', {
        sourceStoryIds: [story.id],
        relatedRuleIds: sc.relatedRules ?? sc.relatedRuleIds ?? []
      })
    );
  }

  for (const task of tasks) {
    const happy = (task.acceptanceScenarios ?? []).find((sc) => sc.category === 'HAPPY_PATH' && !isTechnicalScenario(sc));
    if (!happy) continue;
    add(
      toBusinessCriterion(`AC-${story.id}-OUT-${task.id}`, scenarioToStatement(happy), 'OUTCOME', {
        sourceTaskIds: [task.id],
        sourceStoryIds: [story.id]
      })
    );
  }

  return criteria.slice(0, 12);
}

function buildEpicAcceptanceCriteria(epic, childStories) {
  const criteria = [];
  const seen = new Set();
  const add = (c) => {
    if (!c) return;
    const key = c.statement.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    criteria.push(c);
  };

  for (const [i, line] of (epic.epicAcceptanceCriteria ?? []).entries()) {
    const stmt = sanitizeBusinessText(line);
    if (EXECUTION_CRITERION_PATTERN.test(stmt) || isTechnicalText(stmt)) continue;
    add(toBusinessCriterion(`AC-${epic.id}-OUT-${i + 1}`, stmt, 'OUTCOME', { sourceStoryIds: childStories.map((s) => s.id) }));
  }

  // Um outcome representativo por story filha — só quando a story TEM critério próprio.
  // A v2, quando a story não tinha, fabricava "O usuário obtém o benefício previsto em …",
  // que é rótulo, não critério.
  for (const s of childStories) {
    const rep = (s.acceptanceCriteria ?? []).find((ac) => ac?.statement && ac.category !== 'EXECUTION');
    if (!rep?.statement) continue;
    add(toBusinessCriterion(`AC-${epic.id}-REP-${s.id}`, rep.statement, rep.category ?? 'OUTCOME', { sourceStoryIds: [s.id] }));
  }

  for (const [i, o] of (epic.businessOutcomes ?? []).entries()) {
    add(toBusinessCriterion(`AC-${epic.id}-BO-${i + 1}`, String(o), 'OUTCOME', { sourceStoryIds: childStories.map((s) => s.id) }));
  }

  return criteria.slice(0, 15);
}

function executiveRuleText(rule) {
  const title = sanitizeBusinessText(rule.title ?? rule.id ?? '');
  let desc = firstSentence(rule.description ?? '', 180);
  if (isTechnicalText(desc)) desc = '';
  if (title && desc && desc.length > 30) return `${title}: ${desc}`;
  if (title.length >= 40) return title;
  if (desc.length >= 40) return desc;
  return title || desc || rule.id;
}

/**
 * Regras promovidas do business-rules.md — enunciado, exceções, justificativa e fonte
 * regulatória VERBATIM, com `sourceRefs`. É a forma mais rica: o enunciado de uma RN real tem
 * a obrigação completa, que nenhuma síntese de task reproduz.
 */
function rulesFromSource(sourceRules) {
  return sourceRules
    .map((rn) => {
      const description = [rn.statement, rn.exceptions?.length ? `Exceções: ${rn.exceptions.join(' ')}` : '', rn.rationale ? `Justificativa: ${rn.rationale}` : '']
        .filter(Boolean)
        .join(' ')
        .trim();
      if (!description) return null;
      const out = {
        id: rn.id,
        title: rn.title || rn.id,
        description,
        sourceRefs: [toSourceRef(rn)]
      };
      if (rn.legalBasis) out.legalBasis = rn.legalBasis;
      if (rn.exceptions?.length) out.exceptions = rn.exceptions;
      if (rn.conflictsWith?.length) out.conflictsWith = rn.conflictsWith;
      return out;
    })
    .filter(Boolean);
}

/** Regras promovidas das tasks (fallback quando não há business-rules.md). */
function collectTaskRules(tasks) {
  const rules = [];
  for (const task of tasks) {
    for (const rule of task.businessRules ?? []) {
      if (typeof rule === 'string') {
        const id = rule.split('—')[0]?.trim() ?? rule.slice(0, 40);
        const text = executiveRuleText({ id, title: rule, description: rule });
        rules.push({ id, title: text, description: text, sourceTaskIds: [task.id] });
      } else if (rule?.id) {
        const exec = executiveRuleText(rule);
        rules.push({
          id: rule.id,
          title: exec,
          description: rule.description && rule.description.length > exec.length ? rule.description : exec,
          legalBasis: rule.traceability?.legalBasis ?? rule.source?.fonteRegulatoria ?? '',
          exceptions: rule.exceptions ?? [],
          sourceTaskIds: [task.id]
        });
      }
    }
  }
  return uniqueById(rules, 'id');
}

function attachScopeNotes(rules, tasks) {
  const taskIds = tasks.map((t) => t.id).filter(Boolean);
  return rules.map((r) => ({
    ...r,
    ...(taskIds.length ? { scopeNote: `Aplicável às tasks: ${taskIds.join(', ')}` } : {}),
    sourceTaskIds: [...new Set([...(r.sourceTaskIds ?? []), ...taskIds])]
  }));
}

// ---------------------------------------------------------------------------
// Narrativa por nível — cada campo com fonte declarada
// ---------------------------------------------------------------------------

function buildUserStoryStatement(story) {
  const us = story.userStory ?? {};
  if (us.asA && us.iWant && us.soThat) return `Como ${us.asA}, quero ${us.iWant}, para ${us.soThat}.`;
  return undefined;
}

function buildStoryComplement(story, tasks, fromSummary, requirements) {
  const lines = [];
  const flow = buildBusinessMainFlow(tasks);
  if (flow.length) lines.push(`Capacidades entregues nesta história: ${flow.join('; ')}.`);
  const pre = requirements.flatMap((rf) => rf.preconditions ?? []).filter(Boolean);
  if (pre.length) lines.push(`Pré-condições: ${pre.slice(0, 4).join(' ')}`);
  const outcomes = (fromSummary.storyAcceptanceCriteria ?? [])
    .slice(0, 2)
    .map((c) => sanitizeBusinessText(String(c)))
    .filter((c) => c.length > 15 && !isTechnicalText(c));
  if (outcomes.length) lines.push(`Resultados esperados: ${outcomes.join('; ')}.`);
  return lines.join(' ').slice(0, 900);
}

function buildHybridContext(elevatorPitch, complement) {
  const parts = [elevatorPitch, complement?.trim()].filter(Boolean);
  if (!parts.length) return '';
  return parts.join('\n\n').slice(0, 4000);
}

/**
 * Narrativa da Story. Cada campo vem de dado real; o que não tem insumo fica FORA do objeto
 * (nunca com texto genérico) e gera entrada em `enrichmentGaps[]`.
 */
function buildStoryNarrative(ctx, story, tasks, fromSummary, requirements) {
  const scope = story.id ?? story.name ?? 'STORY?';
  const modules = lookupModules(ctx, resolveModuleCodes(story, requirements));
  const actor = deriveActor(story, fromSummary, requirements, modules);
  const capability = deriveCapability(story, requirements, modules);

  // problem / deliveredValue: VERBATIM da origem quando houver (não passam por deTechNarrative).
  const problem =
    sanitizeBusinessText(fromSummary.problem) ||
    sanitizeBusinessText(story.narrative?.problem) ||
    requirements.map((rf) => sanitizeBusinessText(rf.description)).find(Boolean) ||
    '';
  const deliveredValue =
    sanitizeBusinessText(fromSummary.deliveredValue) ||
    sanitizeBusinessText(story.narrative?.deliveredValue) ||
    requirements.map((rf) => sanitizeBusinessText(rf.ears)).find(Boolean) ||
    '';

  const pitch = buildElevatorPitch({
    actor,
    capability,
    productOffer: firstSentence(deliveredValue, 180),
    currentPain: firstSentence(problem, 180),
    impact: firstSentence(deliveredValue, 180)
  });

  if (!pitch) {
    const missing = [!actor && 'ator', !capability && 'capacidade', !deliveredValue && !problem && 'valor/problema']
      .filter(Boolean)
      .join(', ');
    gap(ctx, scope, 'narrative.elevatorPitch', `sem insumo real para ${missing} — nenhum ator/capacidade/valor derivável de documento de origem, narrative, businessSummary ou userStory`);
  }

  const complement = buildStoryComplement(story, tasks, fromSummary, requirements);
  const context = buildHybridContext(pitch, complement);
  const actors = [
    ...new Set(
      [
        ...(fromSummary.actors ?? []),
        ...(story.narrative?.actors ?? []),
        ...requirements.flatMap((rf) => rf.actors ?? [])
      ]
        .map((a) => sanitizeBusinessText(a))
        .filter((a) => a && !isDenied(a))
    )
  ];

  /** @type {Record<string, unknown>} */
  const narrative = {};
  if (pitch) narrative.elevatorPitch = pitch;
  if (context) narrative.context = context;
  if (problem) narrative.problem = problem;
  if (deliveredValue) narrative.deliveredValue = deliveredValue;
  if (actors.length) narrative.actors = actors;
  const mainFlow = buildBusinessMainFlow(tasks);
  if (mainFlow.length) narrative.mainFlow = mainFlow;
  const opImpact = (story.successMetricsContribution ?? []).filter(Boolean).join('; ');
  if (opImpact) narrative.operationalImpact = opImpact;
  const stmt = buildUserStoryStatement(story);
  if (stmt) narrative.userStoryStatement = stmt;

  for (const [field, label] of [['problem', 'problema de negócio'], ['deliveredValue', 'valor entregue'], ['actors', 'atores']]) {
    if (isEmptyValue(narrative[field])) {
      gap(ctx, scope, `narrative.${field}`, `sem ${label} em documento de origem, narrative ou businessSummary — campo deixado em branco em vez de preenchido com texto genérico`);
    }
  }
  return narrative;
}

/** Narrativa de Epic/Feature. `vision` só é usada no Epic. */
function buildContainerNarrative(ctx, container, childStories, { level, requirements, modules, vision }) {
  const scope = container.id ?? container.name ?? level.toUpperCase();
  const actor =
    deriveActor(container, {}, requirements, modules) ??
    childStories.map((s) => (s.narrative?.actors ?? [])[0]).find(Boolean) ??
    null;
  const capability = deriveCapability(container, requirements, modules);

  const problem =
    sanitizeBusinessText(container.problemStatement) ||
    sanitizeBusinessText(container.narrative?.problem) ||
    modules.map((m) => sanitizeBusinessText(m.objective)).find(Boolean) ||
    (vision?.problem ? vision.problem.lead || leadParagraph(vision.problem.raw) : '') ||
    '';
  const outcomes = [
    ...(Array.isArray(container.businessOutcomes) ? container.businessOutcomes : []),
    ...(vision?.successMetrics ?? [])
  ]
    .map((o) => sanitizeBusinessText(o))
    .filter(Boolean);
  const deliveredValue =
    outcomes.slice(0, 3).join('; ') ||
    sanitizeBusinessText(container.executiveSummary) ||
    modules.map((m) => sanitizeBusinessText(m.objective)).find(Boolean) ||
    '';

  const pitch = buildElevatorPitch({
    actor,
    capability,
    productOffer: firstSentence(deliveredValue, 180),
    currentPain: firstSentence(problem, 180),
    impact: firstSentence(deliveredValue, 180)
  });
  if (!pitch) {
    gap(ctx, scope, 'narrative.elevatorPitch', `sem insumo real para ${level} — ator, capacidade ou valor não derivável de modules.md/product-vision.md nem dos campos declarados`);
  }

  const complementLines = [];
  const caps = (container.inScopeCapabilities ?? []).filter((c) => !TECH_FLOW_PATTERN.test(String(c)));
  if (caps.length) complementLines.push(`Capacidades no escopo: ${caps.slice(0, 6).join('; ')}.`);
  const boundaries = modules.map((m) => m.boundaries).filter(Boolean);
  if (boundaries.length) complementLines.push(`Fronteiras do módulo: ${boundaries[0]}`);
  if (childStories.length) {
    const brief = childStories
      .map((s) => {
        const val = s.narrative?.deliveredValue ?? s.businessSummary?.deliveredValue ?? humanLabel(s.name);
        const label = firstSentence(val, 100);
        return label ? `${s.id}: ${label}` : s.id;
      })
      .slice(0, 5);
    complementLines.push(`Histórias incluídas: ${brief.join(' | ')}.`);
  }
  const context = buildHybridContext(pitch, complementLines.join(' ').slice(0, 1200));

  const actors = [
    ...new Set(
      [...(container.narrative?.actors ?? []), ...childStories.flatMap((s) => s.narrative?.actors ?? []), ...modules.flatMap((m) => m.actors ?? [])]
        .map((a) => sanitizeBusinessText(a))
        .filter((a) => a && !isDenied(a))
    )
  ];

  /** @type {Record<string, unknown>} */
  const narrative = {};
  if (pitch) narrative.elevatorPitch = pitch;
  if (context) narrative.context = context;
  if (problem) narrative.problem = problem;
  if (deliveredValue) narrative.deliveredValue = deliveredValue;
  if (actors.length) narrative.actors = actors;
  const mainFlow = sanitizeEpicMainFlow(container.inScopeCapabilities, childStories);
  if (mainFlow.length) narrative.mainFlow = mainFlow;
  const opImpact = (container.successMetrics ?? [])
    .map((m) => (typeof m === 'string' ? m : [m?.name, m?.target && `meta ${m.target}`].filter(Boolean).join(': ')))
    .filter(Boolean)
    .join('; ');
  if (opImpact) narrative.operationalImpact = opImpact;
  return narrative;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Enriquece uma Story de forma ADITIVA.
 * @param {object} story
 * @param {ReturnType<typeof makeCtx>} [ctxIn] contexto interno (criado sob demanda)
 */
export function enrichStory(story, ctxIn) {
  const ctx = ctxIn ?? makeCtx();
  normalizeItemLabel(story);
  const scope = story.id ?? story.name ?? 'STORY?';
  const tasks = story.tasks ?? [];
  const fromSummary = story.businessSummary ?? {};

  const rfIds = resolveRequirementIds(story);
  const requirements = lookupRequirements(ctx, rfIds);
  const rnIds = resolveRuleIds(story, requirements);
  const sourceRules = lookupRules(ctx, rnIds);

  // sourceRefs — FIX 12b: de ONDE veio o negócio deste nível.
  const klass = resolveItemClass(story);
  const refs = [...requirements.map(toSourceRef), ...sourceRules.map(toSourceRef), ...classSourceRefs(story, klass)];
  unionArray(ctx, story, 'sourceRefs', refs, refKey, scope, 'sourceRefs');
  if (!refs.length) {
    gap(ctx, scope, 'sourceRefs', ctx.sources
      ? `nenhum RF/RN resolvível — ids declarados: ${rfIds.concat(rnIds).join(', ') || '(nenhum)'} não constam nos documentos de origem`
      : 'documentos de origem não disponíveis nesta execução (--sources não informado ou diretório sem requirements.md/business-rules.md)');
  }

  // Narrativa (aditiva por campo: um elevatorPitch já escrito à mão sobrevive).
  const narrative = buildStoryNarrative(ctx, story, tasks, fromSummary, requirements);
  if (!isObj(story.narrative)) story.narrative = {};
  for (const [k, v] of Object.entries(narrative)) setField(ctx, story.narrative, k, v, scope, `narrative.${k}`);

  // Regras: origem primeiro (enunciado completo), depois promoção das tasks. União, nunca troca.
  const promoted = sourceRules.length ? rulesFromSource(sourceRules) : [];
  const fromTasks = collectTaskRules(tasks);
  const candidateRules = attachScopeNotes(
    uniqueById([...promoted, ...fromTasks.filter((r) => !promoted.some((p) => p.id === r.id))], 'id'),
    tasks
  ).filter((r) => (r.description?.length ?? 0) >= 40);
  unionArray(ctx, story, 'businessRules', candidateRules, ruleKey, scope, 'businessRules');
  if (!(story.businessRules ?? []).length) {
    gap(ctx, scope, 'businessRules', 'nenhuma regra de negócio ancorada: business-rules.md indisponível ou sem RN vinculada, e as tasks não declaram businessRules[] com descrição ≥40 chars');
  }

  const regulatory = (story.businessRules ?? [])
    .map((r) => r?.legalBasis)
    .filter(Boolean)
    .slice(0, 3)
    .join('; ');
  if (regulatory) setField(ctx, story.narrative, 'regulatoryContext', regulatory, scope, 'narrative.regulatoryContext');

  // Critérios de aceite: união (a v2 SUBSTITUÍA 4 critérios reais por 1 genérico).
  const candidateCriteria = buildStoryAcceptanceCriteria(story, tasks, fromSummary, requirements);
  unionArray(ctx, story, 'acceptanceCriteria', candidateCriteria, criterionKey, scope, 'acceptanceCriteria');
  if (!(story.acceptanceCriteria ?? []).length) {
    gap(ctx, scope, 'acceptanceCriteria', 'nenhum critério ancorado: sem cenário BDD no RF de origem, sem businessSummary.storyAcceptanceCriteria e sem HAPPY_PATH nas tasks');
  }

  // priority ← MoSCoW do RF (FIX 12a). Só quando ausente.
  const priority = requirements.map((rf) => rf.priority).find(Boolean);
  if (priority) setField(ctx, story, 'priority', priority, scope, 'priority');
  else if (isEmptyValue(story.priority)) {
    gap(ctx, scope, 'priority', 'MoSCoW não resolvível a partir do RF de origem — priority deixada em branco');
  }

  const scopeItems = buildDeliveryScope(tasks);
  unionArray(ctx, story, 'deliveryScope', scopeItems, (x) => x?.taskId, scope, 'deliveryScope');

  // traceability: MERGE — a v2 substituía o objeto e descartava `rf`/`productRequirement`.
  const tr = isObj(story.traceability) ? story.traceability : {};
  story.traceability = {
    ...tr,
    requirementIds: [...new Set([...(Array.isArray(tr.requirementIds) ? tr.requirementIds : []), ...rfIds])],
    sourceTaskIds: [...new Set([...(Array.isArray(tr.sourceTaskIds) ? tr.sourceTaskIds : []), ...tasks.map((t) => t.id).filter(Boolean)])]
  };
  if (rnIds.length) {
    story.traceability.ruleIds = [...new Set([...(Array.isArray(tr.ruleIds) ? tr.ruleIds : []), ...rnIds])];
  }

  return story;
}

/**
 * @param {object} epic
 * @param {object[]} stories
 * @param {ReturnType<typeof makeCtx>} [ctxIn]
 */
export function enrichEpic(epic, stories, ctxIn) {
  const ctx = ctxIn ?? makeCtx();
  normalizeItemLabel(epic);
  const scope = epic.id ?? epic.name ?? 'EPIC?';
  const childStories = stories.filter((s) => s.epicId === epic.id || s.epic === epic.id);
  for (const s of childStories) enrichStory(s, ctx);

  const rfIds = [...new Set([...resolveRequirementIds(epic), ...childStories.flatMap(resolveRequirementIds)])];
  const requirements = lookupRequirements(ctx, rfIds);
  const modules = lookupModules(ctx, resolveModuleCodes(epic, requirements));
  const vision = ctx.sources?.vision ?? null;

  const refs = [
    ...modules.map(toSourceRef),
    ...(vision?.problem ? [{ document: vision.document, section: vision.problem.section, itemId: 'problema' }] : []),
    ...(vision?.outcomes ? [{ document: vision.document, section: vision.outcomes.section, itemId: 'objetivos' }] : []),
    ...(vision?.outOfScope ? [{ document: vision.document, section: vision.outOfScope.section, itemId: 'escopo' }] : [])
  ];
  unionArray(ctx, epic, 'sourceRefs', refs, refKey, scope, 'sourceRefs');
  if (!refs.length) {
    gap(ctx, scope, 'sourceRefs', ctx.sources
      ? 'nem product-vision.md nem modules.md forneceram seção resolvível para este Epic'
      : 'documentos de origem não disponíveis nesta execução');
  }

  const narrative = buildContainerNarrative(ctx, epic, childStories, { level: 'epic', requirements, modules, vision });
  if (!isObj(epic.narrative)) epic.narrative = {};
  for (const [k, v] of Object.entries(narrative)) setField(ctx, epic.narrative, k, v, scope, `narrative.${k}`);

  const childRules = uniqueById(childStories.flatMap((s) => s.businessRules ?? []).filter((r) => isObj(r) && r.id), 'id').map(
    (r) => ({
      ...r,
      sourceStoryIds: [...new Set(childStories.filter((st) => (st.businessRules ?? []).some((br) => br?.id === r.id)).map((st) => st.id))]
    })
  );
  unionArray(ctx, epic, 'businessRules', childRules.filter((r) => (r.description?.length ?? 0) >= 40), ruleKey, scope, 'businessRules');
  if (!(epic.businessRules ?? []).length) {
    gap(ctx, scope, 'businessRules', 'nenhuma regra promovida das stories filhas com descrição ≥40 chars');
  }

  const regulatory = (epic.businessRules ?? []).map((r) => r?.legalBasis).filter(Boolean).slice(0, 5).join('; ');
  if (regulatory) setField(ctx, epic.narrative, 'regulatoryContext', regulatory, scope, 'narrative.regulatoryContext');

  unionArray(ctx, epic, 'acceptanceCriteria', buildEpicAcceptanceCriteria(epic, childStories), criterionKey, scope, 'acceptanceCriteria');
  if (!(epic.acceptanceCriteria ?? []).length) {
    gap(ctx, scope, 'acceptanceCriteria', 'nenhum critério macro ancorado: sem epicAcceptanceCriteria, sem businessOutcomes e nenhuma story filha com critério próprio');
  }

  // successMetrics ← product-vision.md, quando o Epic não declara.
  if (isEmptyValue(epic.successMetrics) && vision?.successMetrics?.length) {
    setField(ctx, epic, 'successMetrics', vision.successMetrics.slice(0, 8), scope, 'successMetrics');
  }
  if (isEmptyValue(epic.outOfScope) && vision?.outOfScope) {
    const oos = leadParagraph(vision.outOfScope.raw) || stripMd(vision.outOfScope.text).slice(0, 600);
    if (oos) setField(ctx, epic, 'outOfScope', [oos], scope, 'outOfScope');
  }

  const bounds = isObj(epic.scopeBoundaries) ? epic.scopeBoundaries : {};
  epic.scopeBoundaries = {
    ...bounds,
    inScope: [...new Set([...(Array.isArray(bounds.inScope) ? bounds.inScope : []), ...(epic.inScopeCapabilities ?? [])])],
    outOfScope: [...new Set([...(Array.isArray(bounds.outOfScope) ? bounds.outOfScope : []), ...(epic.outOfScope ?? [])])]
  };

  const tr = isObj(epic.traceability) ? epic.traceability : {};
  epic.traceability = {
    ...tr,
    sourceStoryIds: [...new Set([...(Array.isArray(tr.sourceStoryIds) ? tr.sourceStoryIds : []), ...childStories.map((s) => s.id)])],
    sourceTaskIds: [
      ...new Set([
        ...(Array.isArray(tr.sourceTaskIds) ? tr.sourceTaskIds : []),
        ...childStories.flatMap((s) => s.traceability?.sourceTaskIds ?? [])
      ])
    ]
  };

  return epic;
}

/**
 * @param {object} feature
 * @param {object[]} stories
 * @param {ReturnType<typeof makeCtx>} [ctxIn]
 */
export function enrichFeature(feature, stories, ctxIn) {
  const ctx = ctxIn ?? makeCtx();
  normalizeItemLabel(feature);
  const scope = feature.id ?? feature.name ?? 'FEATURE?';
  const childStories = stories.filter((s) => s.featureId === feature.id);
  for (const s of childStories) enrichStory(s, ctx);

  const rfIds = [...new Set([...resolveRequirementIds(feature), ...childStories.flatMap(resolveRequirementIds)])];
  const requirements = lookupRequirements(ctx, rfIds);
  const modules = lookupModules(ctx, resolveModuleCodes(feature, requirements));

  const refs = modules.map(toSourceRef);
  unionArray(ctx, feature, 'sourceRefs', refs, refKey, scope, 'sourceRefs');
  if (!refs.length) {
    gap(ctx, scope, 'sourceRefs', ctx.sources
      ? `nenhuma entrada de modules.md resolvível — códigos tentados: ${resolveModuleCodes(feature, requirements).join(', ') || '(nenhum)'}`
      : 'documentos de origem não disponíveis nesta execução');
  }

  const narrative = buildContainerNarrative(ctx, feature, childStories, { level: 'feature', requirements, modules, vision: null });
  if (!isObj(feature.narrative)) feature.narrative = {};
  for (const [k, v] of Object.entries(narrative)) setField(ctx, feature.narrative, k, v, scope, `narrative.${k}`);

  const childRules = uniqueById(childStories.flatMap((s) => s.businessRules ?? []).filter((r) => isObj(r) && r.id), 'id');
  unionArray(ctx, feature, 'businessRules', childRules.filter((r) => (r.description?.length ?? 0) >= 40), ruleKey, scope, 'businessRules');
  unionArray(
    ctx,
    feature,
    'acceptanceCriteria',
    buildEpicAcceptanceCriteria({ id: feature.id, epicAcceptanceCriteria: feature.featureAcceptanceCriteria ?? [] }, childStories),
    criterionKey,
    scope,
    'acceptanceCriteria'
  );
  unionArray(ctx, feature, 'containedStoryIds', childStories.map((s) => s.id).filter(Boolean), (x) => x, scope, 'containedStoryIds');

  // touchpoints ← superfícies declaradas nos uiContext das stories/tasks filhas (dado real).
  const touchpoints = [
    ...new Set(
      childStories
        .flatMap((s) => [s.uiContext, ...(s.tasks ?? []).map((t) => t.uiContext)])
        .filter(isObj)
        .map((ui) => sanitizeBusinessText(ui.telaNome || ui.tela || ui.rota))
        .filter(Boolean)
    )
  ];
  if (touchpoints.length) unionArray(ctx, feature, 'touchpoints', touchpoints, (x) => String(x).toLowerCase(), scope, 'touchpoints');
  else if (isEmptyValue(feature.touchpoints)) {
    gap(ctx, scope, 'touchpoints', 'nenhuma superfície derivável: nem a Feature nem as stories/tasks filhas declaram uiContext com tela/rota');
  }

  const tr = isObj(feature.traceability) ? feature.traceability : {};
  feature.traceability = {
    ...tr,
    sourceStoryIds: [...new Set([...(Array.isArray(tr.sourceStoryIds) ? tr.sourceStoryIds : []), ...childStories.map((s) => s.id)])]
  };

  return feature;
}

/**
 * Enriquecimento do documento inteiro.
 *
 * @param {object} doc
 * @param {{overwrite?:boolean, sources?:object|null, sourcesDir?:string|null, report?:object}} [options]
 *   - `overwrite`  substitui conteúdo existente (default false = aditivo). As perdas ficam em
 *                  `report.losses` para o chamador imprimir o diff.
 *   - `sources`    índice já carregado (loadSourceDocs) — precedência sobre `sourcesDir`.
 *   - `sourcesDir` diretório de outputs de onde ler requirements/business-rules/modules/vision.
 *   - `report`     objeto preenchido com {gaps, losses, changes, sources}.
 * @returns {object} o próprio doc (compatível com a assinatura anterior)
 */
export function enrichDocument(doc, options = {}) {
  // FIX 2b — normalizar rótulo humano ANTES de qualquer leitura de `name`.
  normalizeDocumentLabels(doc);

  let sources = options.sources ?? null;
  if (!sources && options.sourcesDir) {
    const loaded = loadSourceDocs(options.sourcesDir);
    sources = isEmptySourceIndex(loaded) ? null : loaded;
  }
  const ctx = makeCtx({ overwrite: options.overwrite, sources });

  const stories = doc.stories ?? [];
  for (const story of stories) enrichStory(story, ctx);
  for (const epic of doc.epics ?? []) enrichEpic(epic, stories, ctx);
  for (const feature of doc.features ?? []) enrichFeature(feature, stories, ctx);

  doc.metadata = doc.metadata ?? {};
  doc.metadata.schemaVersion = doc.metadata.schemaVersion ?? 'tasks/v5.3';

  // Lacunas são parte do artefato: sem elas, "campo ausente" é indistinguível de "esquecimento".
  if (ctx.gaps.length) doc.metadata.enrichmentGaps = ctx.gaps;
  else delete doc.metadata.enrichmentGaps;

  const changed = ctx.changes.length > 0 || ctx.losses.length > 0;
  const prev = isObj(doc.metadata.businessEnrichment) ? doc.metadata.businessEnrichment : {};
  // IDEMPOTÊNCIA: execução que não alterou nada preserva o bloco anterior INTEIRO — inclusive
  // `enrichedAt` e os contadores. Reescrever `filledCount: 318 → 0` na segunda passada deixava
  // o arquivo byte-diferente sem nenhuma mudança de conteúdo, o que faz um `git diff` de
  // verificação parecer alteração real. Os números desta execução vão para o stdout, que é onde
  // o chamador (e o sync-log) os lê.
  if (changed || prev.version !== ENRICHMENT_VERSION) {
    doc.metadata.businessEnrichment = {
      version: ENRICHMENT_VERSION,
      enrichedAt: new Date().toISOString(),
      mode: ctx.overwrite ? 'overwrite' : 'additive',
      sourcesUsed: sources
        ? Object.fromEntries(Object.entries(sources.files).filter(([, v]) => v).map(([k, v]) => [k, v.split(/[\\/]/).pop()]))
        : {},
      levels: ['story', ...(doc.epics?.length ? ['epic'] : []), ...(doc.features?.length ? ['feature'] : [])],
      gapCount: ctx.gaps.length,
      filledCount: ctx.changes.length
    };
  }

  if (options.report && typeof options.report === 'object') {
    options.report.gaps = ctx.gaps;
    options.report.losses = ctx.losses;
    options.report.changes = ctx.changes;
    options.report.sources = sources;
  }
  return doc;
}

export {
  TECH_FLOW_PATTERN,
  TECH_SCENARIO_PATTERN,
  EXECUTION_CRITERION_PATTERN,
  IMPLEMENTATION_VERB_PATTERN
};
