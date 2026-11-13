#!/usr/bin/env node
/**
 * validate-tasks-business.mjs — implementação executável dos validators de NEGÓCIO e de
 * HIERARQUIA especificados em spec-tasks/SKILL.md § "Validadores de negócio" e
 * § "Validators de hierarquia". Atua nos níveis Epic / Feature / Story (o nível Task é do
 * validate-tasks-selfsufficiency.mjs).
 *
 * Valida: narrativa elevator-pitch, critérios textuais, regras executivas, cenários agregados
 * (WARNING), integridade referencial da hierarquia e coerência com `metadata.backlogHierarchy.chosen`.
 *
 * Uso:
 *   node validate-tasks-business.mjs [outputs/spec/tasks.json] [--flow-map <caminho>] [--write] [--allow-uat]
 *
 * Exit codes — idênticos ao validate-tasks-selfsufficiency.mjs:
 *   0 → nenhum FATAL (warnings nunca bloqueiam)
 *   1 → ≥1 FATAL de negócio/hierarquia (corrigir e rodar de novo)
 *   2 → ENTRADA NÃO APLICÁVEL: arquivo inexistente, JSON ilegível, ou documento sem nenhum
 *       item de backlog (`epics[]`, `features[]` e `stories[]` vazios) — p.ex. um JSON Schema,
 *       um fragmento de Task ou um artefato de outra fase.
 *
 * Por que o exit 2 existe (defeito histórico corrigido): este script iterava `doc.stories ?? []`
 * e `doc.epics ?? []` sem nenhum guard. Apontado para tasks.schema-atual.json (JSON Schema) ou
 * para um fragmento de task, imprimia `ok: true` e saía 0 — FALSO VERDE, pior que um falso FATAL,
 * porque quem lê o relatório conclui que o backlog foi verificado. E `JSON.parse` sem try/catch
 * fazia JSON corrompido sair com exit 1 + stack trace, disfarçando arquivo ilegível de
 * "reprovado nos gates de negócio" (exit 1 é consumido por gate de publicação).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  TECH_FLOW_PATTERN,
  EXECUTION_CRITERION_PATTERN,
  NARRATIVE_BOILERPLATE_DENYLIST,
  normalizeDocumentLabels
} from './lib/business-enrichment.mjs';

const IMPLEMENTATION_PATTERN =
  /\b(implementar|desenvolver|\/api\/|JWT|Repository|@Transactional|React|Angular)\b/i;
const NARRATIVE_TECH_PATTERN = /\b(endpoint|\/api\/)\b/i;
// Heurística de cenário "negativo" (usada só quando category está ausente): termos de negativa
// em título/given/when/then. Cobre variantes com e sem acento (arquivos podem vir degradados).
const NEGATIVE_SCENARIO_PATTERN =
  /inv[áa]lid|erro|negad|sem permiss|n[ãa]o deve|falha|expirad|duplicad/i;
// Quando o campo estruturado category existe, ele prevalece sobre a heurística.
const NEGATIVE_CATEGORY_PATTERN =
  /INVALID_INPUT|BUSINESS_RULE_VIOLATION|EXTERNAL_SERVICE_FAILURE|AUTHORIZATION|EDGE_CASE/i;

// Classes intrinsecamente técnicas / de homologação: isentas dos validators de
// LINGUAGEM DE NEGÓCIO (termos técnicos, escopo de entrega). Ver SKILL.md
// § "Classes de task e validators aplicáveis". Os validators ESTRUTURAIS
// (narrativa presente, critérios/regras válidos) continuam a ser aplicados.
// enabler/spike/technicaldebt/bug entram pelo mesmo motivo: sua Descrição (EloCore § 4) é
// intrinsecamente técnica ("o que deve ser implementado/configurado", "limitação técnica",
// "comportamento incorreto observado") — ver SKILL.md § "Tipos de Demanda Operacional (EloCore)".
const TECH_EXEMPT_CLASSES = new Set(['security', 'uat', 'enabler', 'spike', 'technicaldebt', 'bug']);

// workItemType (Story/Feature) → pseudo-classe usada só para as isenções de linguagem acima.
// Não confundir com `task.class` (functional/uat/security), que governa o shape da Task.
const WORK_ITEM_TYPE_TO_CLASS = {
  ENABLER: 'enabler',
  SPIKE: 'spike',
  TECHNICAL_DEBT: 'technicaldebt',
  BUG: 'bug'
};

/** Resolve a classe efetiva de uma story/epic a partir de sinais disponíveis. */
function resolveClass(item) {
  const wit = String(item?.workItemType ?? '').toUpperCase();
  if (WORK_ITEM_TYPE_TO_CLASS[wit]) return WORK_ITEM_TYPE_TO_CLASS[wit];
  const explicit = String(item?.class ?? '').toLowerCase();
  if (explicit) return explicit;
  if (item?.generatedBy === 'spec-security-review') return 'security';
  if (item?.generatedBy === 'spec-test-plan') return 'uat';
  const taskClasses = (item?.tasks ?? []).map((t) => String(t?.class ?? (isObj(t?.spike) ? 'spike' : '')).toLowerCase());
  if (taskClasses.length && taskClasses.every((c) => c === 'security')) return 'security';
  if (taskClasses.length && taskClasses.every((c) => c === 'uat')) return 'uat';
  // Story sem `workItemType` cujas tasks são TODAS `class=spike` é um SPIKE (D34 do teste ponta a
  // ponta): só investiga, não entrega capacidade ao usuário. Sem esta inferência ela era tratada
  // como USER_STORY e tomava FATAL de procedência, de consumidor, de user story e de escopo de
  // entrega — gates que references/tipos-operacionais.md isenta para SPIKE. Os estruturais
  // (narrativa ≥120/≥200, ≥1 regra, ≥1 critério) continuam, como lá está escrito.
  // Só quando o tipo não foi declarado: `workItemType: "USER_STORY"` explícito é decisão do autor.
  if (!wit && taskClasses.length && taskClasses.every((c) => c === 'spike')) return 'spike';
  return 'functional';
}

// Args: [tasks.json] [--flow-map <caminho>] [--write] — flow-map também via env FLOW_MAP_PATH.
const argv = process.argv.slice(2);
let flowMapArg = null;
let writeMode = false;
// --allow-uat: só para VALIDAR um tasks.json legado que ainda carrega stories/tasks de homologação
// (class=uat / testType=UAT). Nunca usar na geração — ver NO_UAT_BACKLOG abaixo.
let allowUat = false;
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--flow-map') flowMapArg = argv[++i] ?? null;
  else if (a.startsWith('--flow-map=')) flowMapArg = a.slice('--flow-map='.length);
  else if (a === '--write') writeMode = true;
  else if (a === '--allow-uat') allowUat = true;
  else positional.push(a);
}
const inputPath = resolve(positional[0] ?? 'outputs/spec/tasks.json');

// Leitura defensiva — arquivo inexistente e JSON inválido são ENTRADA NÃO APLICÁVEL (exit 2),
// nunca reprovação de negócio (exit 1). Mesmo contrato de validate-tasks-selfsufficiency.mjs.
let doc;
try {
  doc = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (e) {
  console.error(
    `ERRO: não foi possível ler/parsear ${inputPath}: ${e instanceof Error ? e.message : String(e)}`
  );
  process.exit(2);
}

const arr = (v) => (Array.isArray(v) ? v : []);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// `name` é a chave canônica de rótulo humano; `title` é alias. Normalizar na ENTRADA impede que
// um artefato que só traz `title` seja reprovado por "sem name" quando o rótulo existe.
normalizeDocumentLabels(doc);

const epics = arr(doc?.epics);
const features = arr(doc?.features);
const stories = arr(doc?.stories);

// Guard de entrada não aplicável — alinhado à mensagem do gêmeo ("nenhuma task encontrada em …").
if (epics.length + features.length + stories.length === 0) {
  console.error(
    `ERRO: nenhum item de backlog encontrado em ${inputPath} (epics[], features[] e stories[] vazios).\n` +
      'Este validador atua no nível Epic/Feature/Story de um tasks.json (schemaVersion tasks/v5.x). ' +
      'JSON Schema, fragmentos de Task e artefatos de outras fases NÃO são entrada aplicável — ' +
      'para o nível Task use validate-tasks-selfsufficiency.mjs.'
  );
  process.exit(2);
}

/**
 * SHAPE UNIFICADO com validate-tasks-selfsufficiency.mjs: `{code, scope, field, message,
 * suggestedFix}`. Antes este script emitia `{code, scope, message}` e o outro emitia 5 campos —
 * o mesmo defeito ("story sem cenários" vs. "task sem acceptanceScenarios") saía com shape de
 * JSON diferente, impossibilitando consolidar as duas saídas no sync-log sem código ad-hoc.
 * Ver SKILL.md § "Execução obrigatória" (ordem de execução + consolidação no sync-log).
 * @type {{code:string, scope:string, field:string, message:string, suggestedFix:string}[]}
 */
const errors = [];
/** @type {{code:string, scope:string, field:string, message:string, suggestedFix:string}[]} */
const warnings = [];

function fail(code, scope, field, message, suggestedFix) {
  errors.push({ code, scope, field, message, suggestedFix });
}

function warn(code, scope, field, message, suggestedFix) {
  warnings.push({ code, scope, field, message, suggestedFix });
}

function checkMainFlowTechnical(scope, mainFlow, techExempt) {
  if (techExempt) return;
  if (!Array.isArray(mainFlow)) return;
  mainFlow.forEach((step, i) => {
    if (TECH_FLOW_PATTERN.test(String(step))) {
      fail('MAINFLOW_TECHNICAL_TERM', scope, `narrative.mainFlow[${i}]`,
        `mainFlow contém termo técnico: ${String(step).slice(0, 80)}`,
        'Reescrever o passo em linguagem de negócio (o que o usuário faz e obtém), sem endpoint, verbo HTTP, framework ou nome de classe.');
    }
  });
}

function checkNarrative(scope, narrative, techExempt) {
  if (!narrative?.elevatorPitch || narrative.elevatorPitch.length < 120) {
    fail('NARRATIVE_ELEVATOR_PITCH', scope, 'narrative.elevatorPitch',
      'narrative.elevatorPitch ausente ou < 120 caracteres',
      'Escrever o pitch no formato "Como <ator>, quero <capacidade>, para <resultado de negócio>", com ≥120 caracteres.');
  }
  if (!narrative?.context || narrative.context.length < 200) {
    fail('NARRATIVE_CONTEXT', scope, 'narrative.context',
      'narrative.context ausente ou < 200 caracteres',
      'Descrever o contexto de negócio completo (situação atual, motivação, escopo) com ≥200 caracteres.');
  }
  if (techExempt) return;
  const blob = [narrative?.context, narrative?.elevatorPitch, narrative?.problem].filter(Boolean).join(' ');
  if (IMPLEMENTATION_PATTERN.test(blob) || NARRATIVE_TECH_PATTERN.test(blob)) {
    fail('NARRATIVE_TECHNICAL_TERM', scope, 'narrative',
      'narrativa contém termo ou verbo de implementação',
      'Remover "implementar/desenvolver", endpoints (/api/…), JWT, Repository, @Transactional, React, Angular. A narrativa é lida por negócio; o técnico vive nas tasks.');
  }
}

/**
 * Critérios nas DUAS formas emitidas — objetos `{id, statement}` e STRINGS soltas. Normalizar aqui
 * é obrigatório para o validador não contradizer a si mesmo: `CONSUMER_CONTRACT` aceita a forma
 * string (os dois consumidores a renderizam), e `checkBusinessCriteria` reprovava-a com
 * "critério undefined sem statement válido".
 * @param {unknown} criteria
 * @returns {{normalized:{id:string, statement:string, category?:string, relatedRuleIds?:unknown[], sourceStoryIds?:unknown[], sourceTaskIds?:unknown[], given?:unknown, when?:unknown, then?:unknown}[], allStrings:boolean}}
 */
function normalizeCriteria(criteria) {
  const list = arr(criteria);
  let objectCount = 0;
  const normalized = list
    .map((c) => {
      if (typeof c === 'string') {
        const text = c.trim();
        if (!text) return null;
        const m = /^([A-Z][A-Z0-9-]{2,})\s*[—–-]\s*([\s\S]+)$/.exec(text);
        return m ? { id: m[1], statement: m[2].trim() } : { id: '', statement: text };
      }
      if (!isObj(c)) return null;
      objectCount++;
      return c;
    })
    .filter(Boolean);
  return { normalized, allStrings: normalized.length > 0 && objectCount === 0 };
}

function checkBusinessCriteria(scope, rawCriteria, techExempt) {
  const { normalized: criteria } = normalizeCriteria(rawCriteria);
  if (!criteria.length) {
    fail('HAS_ACCEPTANCE_CRITERIA', scope, 'acceptanceCriteria',
      'acceptanceCriteria[] vazio',
      'Adicionar ≥1 critério com `statement` textual de resultado de negócio (sem Given/When/Then).');
    return;
  }
  criteria.forEach((ac, i) => {
    const field = `acceptanceCriteria[${i}]`;
    if (ac.given || ac.when || ac.then) {
      fail('CRITERION_BDD_FORBIDDEN', scope, field,
        `critério ${ac.id} usa given/when/then (use statement)`,
        'Given/When/Then vive em task.acceptanceScenarios[]. No nível Epic/Feature/Story usar apenas `statement`.');
    }
    if (!ac.statement || ac.statement.length < 20) {
      fail('CRITERION_STATEMENT', scope, `${field}.statement`,
        `critério ${ac.id} sem statement válido`,
        'Escrever o resultado de negócio verificável em ≥20 caracteres.');
    }
    if (techExempt) return;
    if (EXECUTION_CRITERION_PATTERN.test(ac.statement ?? '')) {
      fail('CRITERION_EXECUTION', scope, `${field}.statement`,
        `critério ${ac.id} descreve conclusão de execução, não outcome`,
        'Trocar "task concluída"/"código implementado" pelo resultado observável pelo negócio.');
    }
    if (IMPLEMENTATION_PATTERN.test(ac.statement ?? '')) {
      fail('CRITERION_TECHNICAL', scope, `${field}.statement`,
        `critério ${ac.id} contém linguagem técnica`,
        'Remover termos de implementação; descrever o efeito para o usuário.');
    }
  });
}

function checkRules(scope, rules, techExempt) {
  if (!rules?.length) {
    fail('HAS_BUSINESS_RULES', scope, 'businessRules',
      'businessRules[] vazio',
      'Adicionar ≥1 regra como objeto executivo {id, title, description ≥40 chars}.');
    return;
  }
  rules.forEach((rule, i) => {
    const field = `businessRules[${i}]`;
    if (typeof rule === 'string') {
      fail('RULE_NOT_OBJECT', scope, field,
        'regra em formato string (esperado objeto executivo)',
        'Expandir para {id, title, description} — no nível de task, também implementation{} e testScenarios[].');
      return;
    }
    if ((rule.description?.length ?? 0) < 40) {
      fail('RULE_DESCRIPTION', scope, `${field}.description`,
        `regra ${rule.id} com descrição < 40 caracteres`,
        'Transcrever a obrigação completa (condição, exceções, efeito) com ≥40 caracteres.');
    }
    if (!techExempt && IMPLEMENTATION_PATTERN.test(`${rule.title ?? ''} ${rule.description ?? ''}`)) {
      fail('RULE_TECHNICAL', scope, field,
        `regra ${rule.id} contém linguagem de implementação`,
        'Descrever a regra em termos de negócio; o algoritmo vive em task.businessRules[].implementation.');
    }
  });
}

// ---------------------------------------------------------------------------
// Cenários de aceite (WARNING — nunca bloqueia): story sem cenário, story com
// poucos cenários e conjunto aparentando só caminho feliz. Cenários vivem em
// task.acceptanceScenarios[] (v5.3) ou, em arquivos legados, na própria story.
// Stories uat/security são isentas (a fonte de UAT é o test-plan.md).
// ---------------------------------------------------------------------------
function collectStoryScenarios(story) {
  const own = Array.isArray(story?.acceptanceScenarios) ? story.acceptanceScenarios : [];
  const fromTasks = (story?.tasks ?? []).flatMap((t) =>
    Array.isArray(t?.acceptanceScenarios) ? t.acceptanceScenarios : []
  );
  return [...own, ...fromTasks];
}

function scenarioText(s) {
  const thenParts = Array.isArray(s?.then) ? s.then : [s?.then];
  return [s?.id, s?.title, s?.description, s?.given, s?.when, ...thenParts]
    .filter((x) => typeof x === 'string')
    .join(' ');
}

function scenarioIsNegative(s) {
  const cat = typeof s?.category === 'string' ? s.category.trim() : '';
  if (cat) return NEGATIVE_CATEGORY_PATTERN.test(cat);
  return NEGATIVE_SCENARIO_PATTERN.test(scenarioText(s));
}

function checkScenarios(scope, story, techExempt) {
  if (techExempt) return; // uat/security: cenários vivem no test-plan.md / shape SEC
  const scenarios = collectStoryScenarios(story);
  if (!scenarios.length) {
    // Nível STORY, sempre WARNING. O gate BLOQUEANTE do mesmo defeito é por TASK, em
    // validate-tasks-selfsufficiency.mjs → TASK_HAS_CONCRETE_TEST_DATA (FATAL para
    // class=functional). A divisão é deliberada: aqui é cobertura agregada da story; lá é o
    // contrato de cada task. Não há conflito de severidade — ver SKILL.md § "Execução
    // obrigatória" (consolidação das duas saídas no sync-log).
    warn(
      'STORY_NO_SCENARIOS',
      scope,
      'acceptanceScenarios',
      'story sem nenhum acceptanceScenario (nem na story, nem nas tasks) — derivar do test-plan.md ou da matriz mínima RF+RN (SKILL § "acceptanceScenarios[]")',
      'Cada task functional da story precisa de ≥1 HAPPY_PATH + ≥1 INVALID_INPUT + ≥1 BUSINESS_RULE_VIOLATION com testData concreto. Este mesmo defeito é FATAL por task em TASK_HAS_CONCRETE_TEST_DATA.'
    );
    return;
  }
  if (scenarios.length < 3) {
    warn(
      'STORY_FEW_SCENARIOS',
      scope,
      'acceptanceScenarios',
      `story com apenas ${scenarios.length} cenário(s) — mínimo esperado: 3 (HAPPY_PATH + INVALID_INPUT + BUSINESS_RULE_VIOLATION)`,
      'Completar a matriz mínima: caminho feliz, entrada inválida e violação de regra de negócio.'
    );
  }
  const allCategorized = scenarios.every(
    (s) => typeof s?.category === 'string' && s.category.trim() !== ''
  );
  if (!scenarios.some(scenarioIsNegative)) {
    warn(
      'STORY_HAPPY_PATH_ONLY',
      scope,
      'acceptanceScenarios',
      allCategorized
        ? 'todos os cenários têm category=HAPPY_PATH — falta ≥1 cenário negativo (INVALID_INPUT / BUSINESS_RULE_VIOLATION / AUTHORIZATION / EDGE_CASE)'
        : 'HEURÍSTICA (category ausente em ≥1 cenário): nenhum cenário contém termo de negativa ("inválid", "erro", "negad", "sem permiss", "não deve", "falha", "expirad", "duplicad") — conjunto aparenta cobrir só caminho feliz',
      'Adicionar ≥1 cenário negativo com testData concreto e a mensagem de erro exibida ao usuário.'
    );
  }
}

// ---------------------------------------------------------------------------
// Níveis ativos — os validators de HIERARQUIA são condicionais a
// `metadata.backlogHierarchy.chosen` (SKILL.md § "Validators de hierarquia", coluna
// "Ativo quando"). Quando o `chosen` não está declarado, os níveis são INFERIDOS dos arrays
// presentes no documento: um backlog só-story não é reprovado por não ter Epic.
// ---------------------------------------------------------------------------
const declaredChosen = arr(doc?.metadata?.backlogHierarchy?.chosen)
  .filter(isNonEmptyString)
  .map((l) => l.trim().toLowerCase());
const rootTasks = arr(doc?.tasks); // modo legado (tasks[] na raiz)
const hasAnyTask = stories.some((s) => arr(s?.tasks).length > 0) || rootTasks.length > 0;
const inferredChosen = [
  ...(epics.length ? ['epic'] : []),
  ...(features.length ? ['feature'] : []),
  ...(stories.length ? ['story'] : []),
  ...(hasAnyTask ? ['task'] : [])
];
const levelSource = declaredChosen.length
  ? 'metadata.backlogHierarchy.chosen'
  : 'inferido dos arrays presentes no documento';
const chosen = new Set(declaredChosen.length ? declaredChosen : inferredChosen);
const active = (level) => chosen.has(level);

// ---------------------------------------------------------------------------
// levelDetail — modo de detalhe POR NÍVEL, declarado e suportado
//
// PROBLEMA QUE ISTO RESOLVE (caso real): um artefato registrava, em prosa livre num campo
// `metadata["x-desvios-do-schema-default"]`, a decisão de que Epic e Feature carregariam SÓ
// título, e declarava que isso "sobrepõe os validadores NARRATIVE_*/HAS_BUSINESS_RULES/
// HAS_ACCEPTANCE_CRITERIA". A decisão de processo é legítima; o problema é que a skill não
// oferecia forma SUPORTADA de expressá-la, então virou suspensão silenciosa de gates FATAL.
// Sem modo declarado não há como distinguir decisão deliberada de esquecimento.
//
// Contrato: `metadata.backlogHierarchy.levelDetail = {epic|feature|story: "title-only"|"full"}`.
//  - "full" (DEFAULT, inclusive quando o campo é ausente): validadores de negócio FATAL. É o
//    comportamento anterior — retrocompatível.
//  - "title-only": os validadores de CONTEÚDO DE NEGÓCIO ficam INATIVOS para aquele nível (não
//    suprimidos: inativos por contrato) e a escolha é registrada no relatório. Os validadores
//    ESTRUTURAIS (hierarquia, integridade referencial) e o rótulo humano (`name`) continuam.
//
// O modo é POR NÍVEL de propósito: no caso real a nota isentava Epic e Feature, mas 44/45
// stories também saíram sem narrative/businessRules/name/priority — desvio que ninguém
// declarou. Um modo por nível torna esse vazamento visível.
// ---------------------------------------------------------------------------

const LEVEL_DETAIL_VALUES = new Set(['title-only', 'full']);
const rawLevelDetail = isObj(doc?.metadata?.backlogHierarchy?.levelDetail)
  ? doc.metadata.backlogHierarchy.levelDetail
  : {};
/** @type {Record<string, 'title-only'|'full'>} */
const levelDetail = {};
for (const level of ['epic', 'feature', 'story']) {
  const declared = String(rawLevelDetail[level] ?? '').trim().toLowerCase();
  if (declared && !LEVEL_DETAIL_VALUES.has(declared)) {
    fail('LEVEL_DETAIL_INVALID', 'metadata.backlogHierarchy', `levelDetail.${level}`,
      `levelDetail.${level} = «${rawLevelDetail[level]}» não é um valor suportado`,
      'Valores aceitos: "full" (validadores de negócio FATAL) ou "title-only" (nível carrega apenas rótulo humano; validadores de conteúdo de negócio inativos para esse nível).');
  }
  levelDetail[level] = LEVEL_DETAIL_VALUES.has(declared) ? declared : 'full';
}
/** true quando o nível declara conteúdo de negócio completo (default). */
const businessActive = (level) => active(level) && levelDetail[level] === 'full';
const titleOnlyLevels = ['epic', 'feature', 'story'].filter((l) => active(l) && levelDetail[l] === 'title-only');

/**
 * Aviso não-bloqueante sobre a consequência assumida do modo title-only. Fica no relatório para
 * que a escolha apareça em auditoria — quem escolhe assume o cartão sem contexto de negócio.
 */
for (const level of titleOnlyLevels) {
  warn('LEVEL_DETAIL_TITLE_ONLY', 'metadata.backlogHierarchy', `levelDetail.${level}`,
    `nível "${level}" declarado como title-only — NARRATIVE_*, HAS_BUSINESS_RULES e HAS_ACCEPTANCE_CRITERIA estão INATIVOS para esse nível por contrato`,
    `Consequência assumida: os cartões de "${level}" no Kanban ficam sem contexto de negócio (só rótulo). Para reativar os gates, declarar levelDetail.${level} = "full" e preencher narrative/businessRules/acceptanceCriteria.`);
}

// Campo x- de desvio em prosa livre: agora existe forma suportada, então o campo não deve ser
// usado para suspender validadores.
const legacyDeviationKey = Object.keys(doc?.metadata ?? {}).find((k) =>
  /^x-.*(desvio|deviation|override)/i.test(k)
);
if (legacyDeviationKey) {
  const blob = JSON.stringify(doc.metadata[legacyDeviationKey] ?? '');
  if (/NARRATIVE|HAS_BUSINESS_RULES|HAS_ACCEPTANCE_CRITERIA|validator/i.test(blob)) {
    fail('LEVEL_DETAIL_UNDECLARED', 'metadata', legacyDeviationKey,
      `metadata.${legacyDeviationKey} declara suspensão de validadores em prosa livre — não é um contrato verificável`,
      'Substituir por metadata.backlogHierarchy.levelDetail = {"epic":"title-only", …}. O campo x- pode continuar como registro do racional, mas a suspensão precisa vir do campo suportado, senão não há como distinguir decisão de esquecimento.');
  }
}

/**
 * Modo _change (`tasks-complementary_change-*.json`): o arquivo contém **apenas o delta**, e os
 * pais (Epic/Feature) costumam viver no `tasks.json` base, que este validador não carrega.
 * Nesse modo a RESOLUÇÃO de ponteiro é WARNING, nunca FATAL — reprovar aqui seria exigir que o
 * delta duplicasse a hierarquia inteira. A EXIGÊNCIA do ponteiro (story declara `featureId`
 * quando o nível está ativo) continua FATAL: o campo tem de existir, resolva onde resolver.
 */
const deltaMode =
  doc?.metadata?.changeMode === true || arr(doc?.metadata?.basedOnTasks).length > 0;
const refFail = deltaMode ? warn : fail;
const DELTA_NOTE = deltaMode
  ? ' — modo _change: o pai pode estar no tasks.json base, que este validador não carrega (por isso WARNING)'
  : '';

const epicIds = new Set(epics.filter((e) => isNonEmptyString(e?.id)).map((e) => e.id));
const featureIds = new Set(features.filter((f) => isNonEmptyString(f?.id)).map((f) => f.id));
const storyIds = new Set(stories.filter((s) => isNonEmptyString(s?.id)).map((s) => s.id));

/** EPIC_HAS_OUTCOME — Epic sem resultado de negócio mensurável não tem como ser aceito. */
function checkEpicOutcome(scope, epic) {
  if (!active('epic')) return;
  // Aceita as três formas em uso: string solta, `{name, target, baseline}` (o que o renderer do
  // ADO efetivamente lê — buildEpicNarrativeHtml → asObjArray(epic.successMetrics) com m.name/
  // m.target) e `{metric, ...}`. Ler só `metric` produzia EPIC_HAS_OUTCOME FALSO em Epic
  // conforme o schema e corretamente renderizado — o tipo de divergência que CONSUMER_CONTRACT
  // existe para impedir, aqui dentro do próprio validador.
  const metrics = arr(epic?.successMetrics).filter(
    (m) => isNonEmptyString(m) || isNonEmptyString(m?.name) || isNonEmptyString(m?.metric)
  );
  if (!metrics.length) {
    fail('EPIC_HAS_OUTCOME', scope, 'successMetrics',
      'successMetrics[] vazio — Epic sem resultado de negócio mensurável',
      'Declarar ≥1 métrica de sucesso com número e prazo (ex.: "90% dos pedidos criados em autoatendimento em 60 dias").');
  }
}

/**
 * EPIC_HAS_CHILDREN — integridade referencial descendente: Epic órfão (nenhuma Feature/Story
 * aponta para ele e ele não lista `containedStoryIds`) é escopo que nunca será entregue.
 */
function checkEpicChildren(scope, epic) {
  if (!active('epic')) return;
  const ownFeatureIds = new Set(features.filter((f) => f?.epicId === epic?.id).map((f) => f?.id));
  const childCount =
    ownFeatureIds.size +
    stories.filter((s) => s?.epicId === epic?.id || ownFeatureIds.has(s?.featureId)).length +
    arr(epic?.containedStoryIds).filter(isNonEmptyString).length;
  if (childCount === 0) {
    fail('EPIC_HAS_CHILDREN', scope, 'containedStoryIds',
      'Epic sem nenhum filho: nenhuma Feature/Story declara este id em epicId/featureId e containedStoryIds[] está vazio',
      'Apontar as Features/Stories deste Epic (campo epicId no filho) ou listar os ids em containedStoryIds[]. Epic sem filho deve sair do backlog.');
  }
}

/** FEATURE_HAS_TOUCHPOINTS — superfícies tocadas pela Feature (telas, apps, integrações). */
function checkFeatureTouchpoints(scope, feature) {
  if (!active('feature')) return;
  if (!arr(feature?.touchpoints).filter(isNonEmptyString).length) {
    fail('FEATURE_HAS_TOUCHPOINTS', scope, 'touchpoints',
      'touchpoints[] vazio — Feature sem nenhuma superfície declarada',
      'Listar ≥1 superfície tocada em linguagem de negócio (ex.: "Checkout web", "App mobile", "Portal do parceiro").');
  }
}

/**
 * STORY_HAS_USER_STORY — o "Como/Quero/Para" da story (formato INVEST).
 * Isento quando workItemType é ENABLER/SPIKE/TECHNICAL_DEBT/BUG: a Descrição desses tipos
 * (EloCore § 4) não segue o formato de persona "Como <ator>, quero <capacidade>, para
 * <resultado>" — é técnica (o que implementar, qual dúvida investigar, qual limitação existe,
 * qual comportamento incorreto foi observado). Ver SKILL.md § "Tipos de Demanda Operacional".
 */
function checkUserStory(scope, story) {
  if (!active('story')) return;
  const wit = String(story?.workItemType ?? 'USER_STORY').toUpperCase();
  if (wit !== 'USER_STORY') return;
  // SPIKE inferido das tasks (story sem workItemType, só tasks class=spike) — mesma isenção.
  if (resolveClass(story) === 'spike') return;
  const us = story?.userStory;
  const missing = ['asA', 'iWant', 'soThat'].filter((k) => !isNonEmptyString(us?.[k]));
  if (missing.length) {
    fail('STORY_HAS_USER_STORY', scope, 'userStory',
      `userStory ${us ? `incompleta (falta ${missing.join(', ')})` : 'ausente'}`,
      'Preencher userStory {asA, iWant, soThat} — "Como <ator>, quero <capacidade>, para <resultado>".');
  }
}

/**
 * NO_DANGLING_PARENT / LEVEL_USAGE_COHERENT — ponteiro para pai.
 * Partição deliberada, sem duplo report do mesmo defeito:
 *  - o nível existe no documento e o id não é encontrado → NO_DANGLING_PARENT;
 *  - o nível NÃO existe no documento (array vazio)       → LEVEL_USAGE_COHERENT.
 * `strictLevel=false` (nível Task) suprime o segundo caso: task pode carregar `featureId` herdado
 * de template ADO em backlog sem nível Feature — isso não é defeito de hierarquia de negócio.
 */
function checkParentRef(scope, field, value, ids, levelName, levelCount, strictLevel = true) {
  if (!isNonEmptyString(value)) return;
  if (levelCount === 0) {
    if (!strictLevel) return;
    refFail('LEVEL_USAGE_COHERENT', scope, field,
      `${field} = «${value}» aponta para o nível ${levelName}, mas o documento não tem nenhum ${levelName} (${levelName}s[] vazio)${DELTA_NOTE}`,
      `Incluir o ${levelName} «${value}» em ${levelName}s[] (e em metadata.backlogHierarchy.chosen) ou remover o ponteiro ${field}.`);
    return;
  }
  if (!ids.has(value)) {
    refFail('NO_DANGLING_PARENT', scope, field,
      `${field} = «${value}» não corresponde a nenhum id de ${levelName}s[]${DELTA_NOTE}`,
      `Corrigir o id do pai ou criar o ${levelName} correspondente. Ids existentes: ${[...ids].slice(0, 8).join(', ') || '(nenhum)'}.`);
  }
}

// ---------------------------------------------------------------------------
// NARRATIVE_NOT_BOILERPLATE (FATAL) — narrativa genérica ocupando o lugar de conteúdo real
//
// Dois defeitos distintos, ambos observados em produção:
//  (a) FALLBACK DE DOMÍNIO — o motor de síntese tinha strings hardcoded de um projeto de
//      licenciamento ambiental. Rodando em outro domínio, TODAS as stories recebiam pitch
//      idêntico e factualmente falso, sem nenhum sinal. As strings removidas vivem em
//      NARRATIVE_BOILERPLATE_DENYLIST (business-enrichment.mjs) e são reprovadas aqui.
//  (b) NARRATIVA CLONADA — dois itens do MESMO nível com a mesma narrativa não descrevem dois
//      recortes de negócio distintos; um deles (no mínimo) é template preenchido.
// ---------------------------------------------------------------------------

const NARRATIVE_SIGNATURE_FIELDS = ['elevatorPitch', 'context', 'problem', 'deliveredValue'];

/** Normalização para comparação: sem acento, sem pontuação, minúsculo, espaços colapsados. */
function normText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[.,;:!?"'`()[\]{}—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DENY_NORMALIZED = NARRATIVE_BOILERPLATE_DENYLIST.map((d) => ({ raw: d, norm: normText(d) })).filter(
  (d) => d.norm.length >= 12
);

/** Texto de negócio de um item — onde boilerplate pode aparecer. */
function businessTextBlobs(item) {
  const n = isObj(item?.narrative) ? item.narrative : {};
  return [
    ...NARRATIVE_SIGNATURE_FIELDS.map((f) => [`narrative.${f}`, n[f]]),
    ...arr(n.actors).map((a, i) => [`narrative.actors[${i}]`, a]),
    [`narrative.operationalImpact`, n.operationalImpact],
    ...arr(item?.acceptanceCriteria).map((c, i) => [`acceptanceCriteria[${i}].statement`, c?.statement ?? c]),
    ...arr(item?.businessRules).map((r, i) => [`businessRules[${i}].description`, r?.description ?? r]),
    ...arr(item?.deliveryScope).map((d, i) => [`deliveryScope[${i}].businessOutcome`, d?.businessOutcome])
  ].filter(([, v]) => isNonEmptyString(v));
}

function checkBoilerplateStrings(scope, item) {
  for (const [field, value] of businessTextBlobs(item)) {
    const nv = normText(value);
    for (const d of DENY_NORMALIZED) {
      if (!nv.includes(d.norm)) continue;
      fail('NARRATIVE_NOT_BOILERPLATE', scope, field,
        `texto de fallback genérico detectado: «${d.raw}»`,
        'Esta string é boilerplate — vinha de fallback hardcoded do motor de síntese (removido na v3) ou foi colada no artefato. Substituir por conteúdo ancorado no RF/RN de origem, ou deixar o campo VAZIO e registrar a lacuna em metadata.enrichmentGaps[]. Campo em branco é honesto; prosa genérica não.');
      break;
    }
  }
}

/** Narrativa idêntica entre dois itens do mesmo nível. */
function checkNarrativeClones(level, items) {
  if (!businessActive(level)) return;
  /** @type {Map<string, string[]>} */
  const bySignature = new Map();
  /** @type {Map<string, string[]>} */
  const byPitch = new Map();
  for (const item of items) {
    const scope = item?.id ?? item?.name ?? `${level}?`;
    if (TECH_EXEMPT_CLASSES.has(resolveClass(item))) continue;
    const n = isObj(item?.narrative) ? item.narrative : {};
    const sig = normText(NARRATIVE_SIGNATURE_FIELDS.map((f) => n[f] ?? '').join(' | '));
    if (sig.length >= 40) bySignature.set(sig, [...(bySignature.get(sig) ?? []), scope]);
    const pitch = normText(n.elevatorPitch);
    if (pitch.length >= 40) byPitch.set(pitch, [...(byPitch.get(pitch) ?? []), scope]);
  }
  for (const [, scopes] of bySignature) {
    if (scopes.length < 2) continue;
    for (const scope of scopes) {
      fail('NARRATIVE_NOT_BOILERPLATE', scope, 'narrative',
        `narrativa IDÊNTICA a outro(s) ${level}(s) do mesmo nível: ${scopes.filter((s) => s !== scope).join(', ')}`,
        `Dois ${level}s distintos com a mesma narrativa não descrevem dois recortes de negócio distintos — pelo menos um é template preenchido. Reescrever ancorado no RF/módulo de cada um (ver sourceRefs[]).`);
    }
  }
  for (const [, scopes] of byPitch) {
    if (scopes.length < 2) continue;
    // Assinatura completa já reportada acima? Então não duplicar o achado.
    const alreadyReported = new Set(
      errors.filter((e) => e.code === 'NARRATIVE_NOT_BOILERPLATE' && e.field === 'narrative').map((e) => e.scope)
    );
    for (const scope of scopes) {
      if (alreadyReported.has(scope)) continue;
      fail('NARRATIVE_NOT_BOILERPLATE', scope, 'narrative.elevatorPitch',
        `elevatorPitch IDÊNTICO a ${scopes.filter((s) => s !== scope).join(', ')}`,
        'O pitch é o que o negócio lê primeiro no cartão. Idêntico entre itens = template. Derivar de ator + capacidade + valor do RF/módulo específico daquele item.');
    }
  }
}

// ---------------------------------------------------------------------------
// LEVEL_GROUNDED_IN_SOURCE (FATAL) — narrativa sem sourceRef é narrativa inventada
//
// Cada Epic/Feature/Story com levelDetail="full" precisa de ≥1 `sourceRefs[]` resolvível
// ({document, section, itemId}) e de regras com procedência. É o gate que impede o nível de
// Kanban voltar a ser preenchido por síntese genérica em vez de extração do requirements.md /
// business-rules.md / modules.md / product-vision.md.
//
// Mínimos para "full" (SKILL.md § tabela de validadores):
//   narrative.context ≥200 chars (NARRATIVE_CONTEXT) · ≥1 businessRule com id de RN e
//   description ≥120 · ≥1 acceptanceCriterion com rastreio · priority preenchida (story).
// ---------------------------------------------------------------------------

const MIN_GROUNDED_RULE_DESCRIPTION = 120;
const RN_ID_PATTERN = /^RN(-NOVO)?-/i;
const REQ_ID_IN_TEXT = /\bRN?F(-NOVO)?-[A-Z0-9][A-Z0-9-]*/i;

function checkGroundedInSource(level, scope, item) {
  if (!businessActive(level)) return;
  if (TECH_EXEMPT_CLASSES.has(resolveClass(item))) return;

  const refs = arr(item?.sourceRefs).filter((r) => isObj(r) && isNonEmptyString(r.document) && isNonEmptyString(r.itemId));
  if (!refs.length) {
    fail('LEVEL_GROUNDED_IN_SOURCE', scope, 'sourceRefs',
      'sourceRefs[] ausente ou sem entrada resolvível ({document, section, itemId}) — sem isto não há como distinguir conteúdo ancorado de conteúdo inventado',
      'Rodar `enrich-tasks.mjs --sources <dir dos outputs>` para extrair e ancorar, ou preencher sourceRefs[] à mão apontando o RF/RN/módulo/seção de origem. Se este nível deve carregar só rótulo, declarar metadata.backlogHierarchy.levelDetail.' + level + ' = "title-only".');
  }

  const rules = arr(item?.businessRules).filter(isObj);
  const grounded = rules.filter(
    (r) =>
      isNonEmptyString(r.id) &&
      (RN_ID_PATTERN.test(r.id) || arr(r.sourceRefs).length > 0 || arr(r.sourceTaskIds).length > 0)
  );
  if (rules.length && !grounded.length) {
    fail('LEVEL_GROUNDED_IN_SOURCE', scope, 'businessRules',
      `nenhuma das ${rules.length} regra(s) tem procedência: falta id de RN (RN-… / RN-NOVO-…), sourceRefs[] ou sourceTaskIds[]`,
      'Toda regra promovida ao nível precisa do id da RN de origem do business-rules.md. Regra sem procedência não é auditável e não pode ser revalidada quando a RN mudar.');
  }
  const deep = grounded.find((r) => (r.description?.length ?? 0) >= MIN_GROUNDED_RULE_DESCRIPTION);
  if (rules.length && !deep) {
    fail('LEVEL_GROUNDED_IN_SOURCE', scope, 'businessRules[].description',
      `nenhuma regra com id de origem tem description ≥${MIN_GROUNDED_RULE_DESCRIPTION} caracteres (maior: ${Math.max(0, ...rules.map((r) => r.description?.length ?? 0))})`,
      `Transcrever o ENUNCIADO da RN do business-rules.md, com exceções e justificativa — não o título. ≥${MIN_GROUNDED_RULE_DESCRIPTION} caracteres em ao menos uma regra do nível.`);
  }

  const { normalized: criteria, allStrings } = normalizeCriteria(item?.acceptanceCriteria);
  const traceable = criteria.filter(
    (c) =>
      arr(c.relatedRuleIds).length > 0 ||
      arr(c.sourceStoryIds).length > 0 ||
      arr(c.sourceTaskIds).length > 0 ||
      REQ_ID_IN_TEXT.test(String(c.id ?? ''))
  );
  if (criteria.length && !traceable.length) {
    const msg = `nenhum dos ${criteria.length} critério(s) declara rastreio (relatedRuleIds[], sourceStoryIds[], sourceTaskIds[] ou id contendo o RF de origem)`;
    const fix =
      'Ao menos um critério do nível deve ser derivado de um cenário BDD do RF (ou de uma RN), com o rastreio declarado. Critério sem origem não é verificável contra a especificação.';
    // Critério em forma de STRING não tem CAMPO onde declarar rastreio. FATAL aqui exigiria uma
    // migração de forma, não uma correção de conteúdo — e a ancoragem do item já foi verificada
    // acima por sourceRefs[] e pelas regras com id de RN. WARNING, com a saída indicada.
    if (allStrings) {
      warn('LEVEL_GROUNDED_IN_SOURCE', scope, 'acceptanceCriteria',
        `${msg} — os critérios estão em forma de string, que não tem campo para rastreio`,
        `${fix} Para declarar rastreio, migrar para a forma objeto: {id, statement, relatedRuleIds[]}.`);
    } else {
      fail('LEVEL_GROUNDED_IN_SOURCE', scope, 'acceptanceCriteria', msg, fix);
    }
  }
}

// ---------------------------------------------------------------------------
// CONSUMER_CONTRACT (FATAL) — as chaves que os consumidores realmente leem
//
// POR QUE EXISTE: quatro defeitos de contrato chegaram a produção porque nenhum gate
// comparava o que o GERADOR emite com o que os CONSUMIDORES leem:
//   · `name` required no schema, gerador emitindo `title` → story publicava "US-X: US-X" no ADO
//     e o corpo no HTML mostrava só o id;
//   · `acceptanceCriteria[{id,statement}]` emitido, publicador lendo só
//     `businessSummary.storyAcceptanceCriteria` → campo AcceptanceCriteria vazio em 100% das
//     stories, com 4 critérios bem escritos no JSON;
//   · `traceability` emitido como OBJETO, renderer chamando asObjArray() → rastreabilidade
//     descartada em silêncio;
//   · `narrative` emitido, builder lendo só `businessSummary` → Description sem uma linha de
//     negócio.
// Este validador é o teste que teria pegado os quatro na origem.
// ---------------------------------------------------------------------------

/**
 * Chaves lidas por spec-tasks-azure (azureDevopsService.js + lib/ado-narrative-html.mjs) e
 * spec-tasks-html (lib/render-html.mjs). `always` = exigida mesmo em title-only.
 */
const CONSUMER_CONTRACT = {
  epic: [
    { key: 'id', always: true },
    { key: 'name', always: true, label: 'rótulo humano (title do work item no ADO / cabeçalho no HTML)' },
    { key: 'narrative', label: 'Description do Epic no ADO e bloco de negócio no HTML' },
    { key: 'businessRules', label: 'seção "Regras de negócio (épico)"' },
    { key: 'acceptanceCriteria', label: 'seção "Critérios de aceite (épico)"' }
  ],
  feature: [
    { key: 'id', always: true },
    { key: 'name', always: true, label: 'rótulo humano (title do work item no ADO / cabeçalho no HTML)' },
    { key: 'narrative', label: 'Description da Feature no ADO' },
    { key: 'businessRules', label: 'seção "Regras de negócio (feature)"' },
    { key: 'acceptanceCriteria', label: 'seção "Critérios de aceite (feature)"' }
  ],
  story: [
    { key: 'id', always: true },
    { key: 'name', always: true, label: 'rótulo humano — sem ele o ADO publica "<id>: <id>"' },
    { key: 'narrative', label: 'Description da User Story no ADO' },
    { key: 'businessRules', label: 'seção "Regras de negócio (história)"' },
    { key: 'acceptanceCriteria', label: 'campo Microsoft.VSTS.Common.AcceptanceCriteria no ADO' },
    { key: 'priority', label: 'Microsoft.VSTS.Common.Priority / ordenação no board' }
  ]
};

/**
 * Fallback LEGADO que os consumidores realmente implementam para uma chave. Este validador só tem
 * valor se for exato sobre o que eles leem: acusar perda onde o consumidor tem fallback transforma
 * o gate em ruído — e ruído faz o gate ser ignorado.
 *
 * Estado verificado nos dois consumidores (2026-08):
 *  - `narrative`            → fallback `businessSummary` (ADO: buildStoryNarrativeHtml; HTML:
 *                             renderBusinessSummaryInner)
 *  - `acceptanceCriteria`   → fallback `businessSummary.storyAcceptanceCriteria[]` (ADO:
 *                             userStoryAcceptanceCriteriaText; HTML: renderStoryBizPanels)
 *  - `businessRules`        → SEM fallback nos consumidores → ausência é perda real
 *  - `name` / `priority`    → `name` já normalizado de `title`/`id` na entrada; `priority` não tem
 *                             fallback (Microsoft.VSTS.Common.Priority sai vazio)
 * @returns {boolean} true se um carrier alternativo cobre a chave
 */
function hasLegacyCarrier(level, item, key) {
  if (level !== 'story') return false;
  const bs = isObj(item?.businessSummary) ? item.businessSummary : null;
  if (!bs) return false;
  if (key === 'narrative') {
    return ['problem', 'deliveredValue', 'actors', 'businessFlowSummary'].some((k) => !isEmptyish(bs[k]));
  }
  if (key === 'acceptanceCriteria') {
    return arr(bs.storyAcceptanceCriteria).some((c) => isNonEmptyString(c));
  }
  return false;
}

function isEmptyish(v) {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0) ||
    (isObj(v) && Object.keys(v).length === 0)
  );
}

function checkConsumerContract(level, scope, item) {
  if (!active(level)) return;
  const full = businessActive(level);
  const techExempt = TECH_EXEMPT_CLASSES.has(resolveClass(item));

  for (const spec of CONSUMER_CONTRACT[level] ?? []) {
    if (!spec.always && (!full || techExempt)) continue;
    if (!isEmptyish(item?.[spec.key])) continue;

    // Chave vazia MAS coberta por carrier legado: o consumidor renderiza. Não é perda de conteúdo
    // — é formato antigo. WARNING de migração, nunca FATAL.
    if (hasLegacyCarrier(level, item, spec.key)) {
      warn('CONSUMER_CONTRACT', scope, spec.key,
        `${spec.key} ausente, coberto pelo fallback legado \`businessSummary\` — os consumidores renderizam, mas o carrier canônico v5.3 é \`${spec.key}\``,
        `Migrar para ${spec.key} (v5.3). O fallback legado permanece suportado e nada é perdido hoje; a migração é o que permite os validadores de conteúdo (narrativa ≥200 chars, critério com rastreio) atuarem.`);
      continue;
    }

    fail('CONSUMER_CONTRACT', scope, spec.key,
      `${spec.key} ausente/vazio — chave lida por spec-tasks-azure e spec-tasks-html${spec.label ? `: ${spec.label}` : ''}`,
      `Preencher ${spec.key}. O consumidor não tem fallback para esta chave: o campo sai VAZIO no work item e no relatório, sem erro visível na publicação.`);
  }

  // `name` == `id`: o rótulo existe mas não carrega informação humana (sintoma "US-X: US-X").
  if (isNonEmptyString(item?.name) && isNonEmptyString(item?.id) && item.name.trim() === item.id.trim()) {
    warn('CONSUMER_CONTRACT', scope, 'name',
      'name é igual ao id — o cartão no ADO publica "<id>: <id>" e não diz o que o item entrega',
      'Preencher `name` com o rótulo humano (ex.: "Escolher o vínculo na entrada"). `title` é aceito como alias e é normalizado para `name` na entrada dos consumidores.');
  }

  // Forma de acceptanceCriteria: o publicador precisa de `statement` (objeto) ou de string.
  arr(item?.acceptanceCriteria).forEach((c, i) => {
    const ok = isNonEmptyString(c) || (isObj(c) && isNonEmptyString(c.statement));
    if (!ok) {
      fail('CONSUMER_CONTRACT', scope, `acceptanceCriteria[${i}]`,
        'critério sem `statement` textual nem forma de string — o campo AcceptanceCriteria do ADO sai vazio para este item',
        'Cada critério: {id, statement} com statement textual, ou uma string. Given/When/Then não é lido neste nível (vive em task.acceptanceScenarios[]).');
    }
  });

  // Forma de traceability: objeto OU array. String solta não é renderizada por nenhum consumidor.
  const tr = item?.traceability;
  if (tr !== undefined && tr !== null && !isObj(tr) && !Array.isArray(tr)) {
    fail('CONSUMER_CONTRACT', scope, 'traceability',
      `traceability é ${typeof tr} — os renderers aceitam objeto (pares chave/valor) ou array de {section,itemId,excerpt}; um escalar é descartado`,
      'Usar objeto ({rf, productRequirement, requirementIds[]…}) ou array de refs. Escalar não chega ao work item nem ao relatório.');
  }
}

for (const story of stories) {
  const scope = story.id;
  const techExempt = TECH_EXEMPT_CLASSES.has(resolveClass(story));
  const full = businessActive('story');
  if (full) {
    checkNarrative(scope, story.narrative, techExempt);
    checkRules(scope, story.businessRules, techExempt);
    checkBusinessCriteria(scope, story.acceptanceCriteria, techExempt);
    checkUserStory(scope, story);
    if (!techExempt && !story.deliveryScope?.length) {
      fail('STORY_HAS_DELIVERY_SCOPE', scope, 'deliveryScope',
        'deliveryScope[] vazio',
        'Uma entrada por task da story: {taskId, title, businessOutcome} — o que o negócio passa a conseguir fazer.');
    }
    checkMainFlowTechnical(scope, story.narrative?.mainFlow, techExempt);
    checkScenarios(scope, story, techExempt);
  }
  checkBoilerplateStrings(scope, story);
  checkGroundedInSource('story', scope, story);
  checkConsumerContract('story', scope, story);
}

for (const feature of features) {
  const scope = feature.id;
  const techExempt = TECH_EXEMPT_CLASSES.has(resolveClass(feature));
  if (businessActive('feature')) {
    checkNarrative(scope, feature.narrative, techExempt);
    checkRules(scope, feature.businessRules, techExempt);
    checkBusinessCriteria(scope, feature.acceptanceCriteria, techExempt);
    checkFeatureTouchpoints(scope, feature);
    checkMainFlowTechnical(scope, feature.narrative?.mainFlow, techExempt);
  }
  checkBoilerplateStrings(scope, feature);
  checkGroundedInSource('feature', scope, feature);
  checkConsumerContract('feature', scope, feature);
}

for (const epic of epics) {
  const scope = epic.id;
  const techExempt = TECH_EXEMPT_CLASSES.has(resolveClass(epic));
  if (businessActive('epic')) {
    checkNarrative(scope, epic.narrative, techExempt);
    checkRules(scope, epic.businessRules, techExempt);
    checkBusinessCriteria(scope, epic.acceptanceCriteria, techExempt);
    checkEpicOutcome(scope, epic);
    checkMainFlowTechnical(scope, epic.narrative?.mainFlow, techExempt);
  }
  // Integridade referencial NÃO depende de levelDetail: Epic órfão é escopo perdido em qualquer modo.
  checkEpicChildren(scope, epic);
  checkBoilerplateStrings(scope, epic);
  checkGroundedInSource('epic', scope, epic);
  checkConsumerContract('epic', scope, epic);
}

checkNarrativeClones('story', stories);
checkNarrativeClones('feature', features);
checkNarrativeClones('epic', epics);

// ---------------------------------------------------------------------------
// NO_UAT_BACKLOG (FATAL — sempre ativo, salvo --allow-uat)
//
// O backlog gerado pela spec-tasks é de DESENVOLVIMENTO. Homologação com o cliente (UAT) não é
// work item de implementação: não tem código, não é acelerável por IA e, quando entrava como
// story/task, inflava prazo e custo do forecast (spec-estimate) sem entregar software. O
// test-plan.md continua a existir — como FONTE dos acceptanceScenarios[] das tasks funcionais
// (SCENARIOS_FROM: test-plan, rastreio TC-NNN em coverageNote), não como origem de tasks.
// Ver SKILL.md § "Entrada opcional — Plano de Testes de Negócio (testPlan)".
// ---------------------------------------------------------------------------
function isUatStory(story) {
  if (String(story?.testType ?? '').toUpperCase() === 'UAT') return true;
  if (String(story?.class ?? '').toLowerCase() === 'uat') return true;
  if (story?.generatedBy === 'spec-test-plan') return true;
  const cls = arr(story?.tasks).map((t) => String(t?.class ?? '').toLowerCase());
  return cls.length > 0 && cls.every((c) => c === 'uat');
}
if (!allowUat) {
  const uatFix =
    'Remover a story/task de homologação do tasks.json. Homologação com o cliente não é work item de ' +
    'desenvolvimento e não é acelerável por IA — fica fora do backlog. Usar o test-plan.md apenas como ' +
    'fonte dos acceptanceScenarios[] das tasks funcionais (coverageNote "Cobre TC-NNN do plano de testes": ' +
    'o ID do caso, nunca o nome do arquivo, que NO_EXTERNAL_REFS_IN_TASKS reprova). ' +
    'Para apenas validar um tasks.json legado que ainda as contém, rodar com --allow-uat.';
  for (const story of stories) {
    const scope = story.id ?? 'STORY?';
    if (isUatStory(story)) {
      fail('NO_UAT_BACKLOG', scope, 'testType/class',
        'story de homologação (UAT) no backlog de desenvolvimento — este tipo de item não deve ser gerado',
        uatFix);
      continue;
    }
    for (const task of arr(story?.tasks)) {
      if (String(task?.class ?? '').toLowerCase() === 'uat' || task?.generatedBy === 'spec-test-plan') {
        fail('NO_UAT_BACKLOG', isNonEmptyString(task?.id) ? task.id : `${scope}/task-sem-id`, 'class',
          'task class=uat (execução manual de homologação) no backlog de desenvolvimento — este tipo de task não deve ser gerada',
          uatFix);
      }
    }
  }
  for (const t of rootTasks) {
    if (String(t?.class ?? '').toLowerCase() === 'uat') {
      fail('NO_UAT_BACKLOG', isNonEmptyString(t?.id) ? t.id : 'task-sem-id', 'class',
        'task class=uat (execução manual de homologação) no backlog de desenvolvimento — este tipo de task não deve ser gerada',
        uatFix);
    }
  }
}

// --- Integridade referencial da hierarquia (NO_DANGLING_PARENT — sempre ativo) --------------
for (const feature of features) {
  checkParentRef(feature.id ?? 'FEATURE?', 'epicId', feature?.epicId, epicIds, 'epic', epics.length);
}
for (const story of stories) {
  const scope = story.id ?? 'STORY?';
  checkParentRef(scope, 'featureId', story?.featureId, featureIds, 'feature', features.length);
  checkParentRef(scope, 'epicId', story?.epicId, epicIds, 'epic', epics.length);
  for (const task of arr(story?.tasks)) {
    const taskScope = isNonEmptyString(task?.id) ? task.id : `${scope}/task-sem-id`;
    if (isNonEmptyString(task?.storyId) && task.storyId !== story.id) {
      fail('NO_DANGLING_PARENT', taskScope, 'storyId',
        `task declara storyId «${task.storyId}» mas está aninhada na story «${story.id}»`,
        'Corrigir task.storyId para o id da story que a contém (ou mover a task para a story correta).');
    }
    checkParentRef(taskScope, 'featureId', task?.featureId, featureIds, 'feature', features.length, false);
    checkParentRef(taskScope, 'epicId', task?.epicId, epicIds, 'epic', epics.length, false);
  }
}
for (const t of rootTasks) {
  const taskScope = isNonEmptyString(t?.id) ? t.id : 'task-sem-id';
  checkParentRef(taskScope, 'storyId', t?.storyId, storyIds, 'story', stories.length, false);
}
for (const container of [...epics, ...features]) {
  arr(container?.containedStoryIds).forEach((sid, i) => {
    if (isNonEmptyString(sid) && stories.length && !storyIds.has(sid)) {
      refFail('NO_DANGLING_PARENT', container.id ?? 'CONTAINER?', `containedStoryIds[${i}]`,
        `containedStoryIds aponta para «${sid}», que não existe em stories[]${DELTA_NOTE}`,
        'Corrigir o id ou remover a entrada — containedStoryIds[] só pode citar stories presentes no documento.');
    }
  });
}

// --- Coerência entre níveis declarados e níveis usados (LEVEL_USAGE_COHERENT — sempre) ------
for (const feature of features) {
  if (active('epic') && epics.length && !isNonEmptyString(feature?.epicId)) {
    fail('LEVEL_USAGE_COHERENT', feature.id ?? 'FEATURE?', 'epicId',
      'nível "epic" ativo mas a Feature não declara epicId',
      'Apontar a Feature para o Epic que a contém (campo epicId) — sem isso o item fica solto no board do ADO.');
  }
}
for (const story of stories) {
  const scope = story.id ?? 'STORY?';
  const featureOfStory = features.find((f) => f?.id === story?.featureId);
  if (active('feature') && features.length && !isNonEmptyString(story?.featureId)) {
    fail('LEVEL_USAGE_COHERENT', scope, 'featureId',
      'nível "feature" ativo mas a Story não declara featureId',
      'Apontar a Story para a Feature que a contém (campo featureId).');
  }
  if (
    active('epic') && epics.length &&
    !isNonEmptyString(story?.epicId) &&
    !isNonEmptyString(featureOfStory?.epicId)
  ) {
    fail('LEVEL_USAGE_COHERENT', scope, 'epicId',
      'nível "epic" ativo mas a Story não chega a nenhum Epic (sem epicId próprio e sem Feature pai com epicId)',
      'Declarar story.epicId, ou garantir que a Feature apontada em featureId tenha epicId.');
  }
}
if (declaredChosen.length) {
  const presence = {
    epic: epics.length > 0,
    feature: features.length > 0,
    story: stories.length > 0,
    task: hasAnyTask
  };
  for (const level of ['epic', 'feature', 'story', 'task']) {
    if (chosen.has(level) && !presence[level]) {
      // Delta (_change) legitimamente traz só parte dos níveis → WARNING.
      refFail('LEVEL_USAGE_COHERENT', 'metadata.backlogHierarchy', `chosen[${level}]`,
        `nível "${level}" declarado em chosen mas o documento não tem nenhum item desse nível${DELTA_NOTE}`,
        `Gerar os itens de "${level}" ou remover o nível de metadata.backlogHierarchy.chosen (com o racional no sync-log).`);
    }
    if (!chosen.has(level) && presence[level]) {
      fail('LEVEL_USAGE_COHERENT', 'metadata.backlogHierarchy', `chosen[${level}]`,
        `documento contém itens de "${level}" mas o nível não está em chosen`,
        `Acrescentar "${level}" a metadata.backlogHierarchy.chosen ou remover os itens desse nível.`);
    }
  }
}

// ---------------------------------------------------------------------------
// uiContext × flow-map (WARNING — nunca bloqueia): (i) toda TEL do flow-map deve
// aparecer em ≥1 uiContext (tela sem cobertura no backlog); (ii) todo
// uiContext.tela deve ser TEL válida do flow-map. Parse via subprocess do
// check-flowmap.py --json; fallback SILENCIOSO se python/flow-map indisponível.
// ---------------------------------------------------------------------------
function resolveFlowMapPath() {
  const candidates = [
    flowMapArg,
    process.env.FLOW_MAP_PATH,
    join(dirname(inputPath), 'flow-map.md'),
    'outputs/spec/flow-map.md'
  ]
    .filter(Boolean)
    .map((p) => resolve(p));
  return candidates.find((p) => existsSync(p)) ?? null;
}

function parseFlowMapTelas(flowMapPath) {
  const script = resolve(dirname(fileURLToPath(import.meta.url)), '../../tools/check-flowmap.py');
  if (!existsSync(script)) return null;
  // `python3` PRIMEIRO — convenção de skills/tools/references/paths.md § "Convenção de scripts"
  // ("python3, nunca python": em Linux/macOS `python` costuma não existir ou apontar para
  // Python 2). `python` e `py` ficam apenas como fallback de Windows.
  for (const bin of ['python3', 'python', 'py']) {
    try {
      const r = spawnSync(bin, [script, flowMapPath, '--json'], { encoding: 'utf8' });
      if (r.error || typeof r.stdout !== 'string' || !r.stdout.trim()) continue;
      const parsed = JSON.parse(r.stdout); // exit 1 (erro de gramática) ainda imprime JSON
      const telas = Array.isArray(parsed?.telas) ? parsed.telas : [];
      return new Set(telas.map((t) => String(t?.ID ?? '')).filter(Boolean));
    } catch {
      /* tenta o próximo binário */
    }
  }
  return null; // python indisponível / saída ilegível — fallback silencioso
}

function collectUiContexts(document) {
  const found = [];
  for (const story of document.stories ?? []) {
    if (story?.uiContext?.tela) found.push({ scope: story.id, tela: String(story.uiContext.tela) });
    for (const task of story?.tasks ?? []) {
      if (task?.uiContext?.tela) found.push({ scope: task.id, tela: String(task.uiContext.tela) });
    }
  }
  return found;
}

const flowMapPath = resolveFlowMapPath();
if (flowMapPath) {
  const telasFlowMap = parseFlowMapTelas(flowMapPath);
  if (telasFlowMap) {
    const uiContexts = collectUiContexts(doc);
    const telasCobertas = new Set(uiContexts.map((u) => u.tela));
    for (const tela of [...telasFlowMap].sort()) {
      if (!telasCobertas.has(tela)) {
        warn(
          'UI_TELA_SEM_COBERTURA',
          tela,
          'uiContext.tela',
          `tela sem cobertura no backlog: ${tela} não aparece em nenhum uiContext de story/task`,
          'Criar/ajustar a story ou task que entrega esta tela e preencher o uiContext (tela, rota, estadosUI, fields[]).'
        );
      }
    }
    for (const u of uiContexts) {
      if (!telasFlowMap.has(u.tela)) {
        warn('UI_CONTEXT_TELA_INVALIDA', u.scope, 'uiContext.tela',
          `uiContext.tela «${u.tela}» não existe em ## Telas do flow-map`,
          'Usar o TEL-xxx real do flow-map. Em projeto SEM flow-map, o schema aceita também o slug da rota (contrato screens-manifest.json) — neste caso este aviso é esperado e pode ser ignorado.');
      }
    }
  }
}

// Sumário por código — mesmo formato de validate-tasks-selfsufficiency.mjs, para permitir
// consolidação das duas saídas no sync-log sem transformação ad-hoc.
function countByCode(list) {
  const m = {};
  for (const e of list) m[e.code] = (m[e.code] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
}

const fatal = errors;

/**
 * `--write` — grava os FATAL em `metadata.fatalErrors[]` no formato prescrito pela SKILL.md
 * § "Execução obrigatória" ({code, message, scope, affectedField, suggestedFix}).
 *
 * POR QUE: a SKILL declarava "qualquer validator FATAL ativo bloqueia a emissão do tasks.json;
 * emitir fatalErrors[] em metadata" — mas nenhum script escrevia o campo. Em artefato real
 * `metadata.fatalErrors` estava simplesmente ausente, o que é indistinguível de "passou". Agora
 * o campo é ESCRITO quando há FATAL e REMOVIDO quando não há: a ausência passa a significar
 * "validado e limpo", não "nunca validado".
 */
if (writeMode) {
  const payload = errors.map((e) => ({
    code: e.code,
    message: e.message,
    scope: e.scope,
    affectedField: e.field,
    suggestedFix: e.suggestedFix
  }));
  doc.metadata = doc.metadata ?? {};
  const previous = arr(doc.metadata.fatalErrors).filter((e) => isObj(e) && e.code && !e.code.startsWith('TASK_'));
  const kept = arr(doc.metadata.fatalErrors).filter((e) => isObj(e) && typeof e.code === 'string' && e.code.startsWith('TASK_'));
  if (payload.length || kept.length) doc.metadata.fatalErrors = [...payload, ...kept];
  else delete doc.metadata.fatalErrors;
  doc.metadata.validation = {
    ...(isObj(doc.metadata.validation) ? doc.metadata.validation : {}),
    business: {
      ok: fatal.length === 0,
      ranAt: new Date().toISOString(),
      levelDetail,
      errorCount: errors.length,
      warningCount: warnings.length,
      errorsByCode: countByCode(errors)
    }
  };
  try {
    writeFileSync(inputPath, `${JSON.stringify(doc, null, 2)}\n`.replace(/\n$/, '\n'), 'utf8');
  } catch (e) {
    console.error(`AVISO: --write falhou ao gravar ${inputPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
  void previous;
}

console.log(
  JSON.stringify(
    {
      ok: fatal.length === 0,
      validator: 'business',
      input: inputPath,
      written: writeMode,
      epicCount: epics.length,
      featureCount: features.length,
      storyCount: stories.length,
      levelsActive: [...chosen],
      levelsSource: levelSource,
      // Registro da escolha de detalhe por nível — a decisão fica visível no relatório, e não
      // enterrada em prosa livre num campo x-.
      levelDetail,
      levelDetailSource: Object.keys(rawLevelDetail).length
        ? 'metadata.backlogHierarchy.levelDetail'
        : 'default (full em todos os níveis ativos)',
      businessValidatorsInactiveFor: titleOnlyLevels,
      deltaMode,
      errorCount: errors.length,
      errorsByCode: countByCode(errors),
      warningCount: warnings.length,
      warningsByCode: countByCode(warnings),
      errors: errors.slice(0, 80),
      warnings: warnings.slice(0, 80)
    },
    null,
    2
  )
);
process.exit(fatal.length === 0 ? 0 : 1);
