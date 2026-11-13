// Regression test — valida os exemplos do spec-tasks contra o schema canônico tasks/v5.3.
// Uso:
//   npm i ajv ajv-formats --no-save
//   node validate-examples.mjs
//
// Valida:
//   - tasks.hierarchy-example.json      → documento completo (root schema)
//   - tasks.example-completo.json       → objeto Task (#/definitions/Task)
//   - tasks.sec-task-example.json       → Task class=security (#/definitions/Task)  [se existir]
//   - tasks.uat-task-example.json       → Task class=uat      (#/definitions/Task)  [se existir]
//   - tasks.transversal-story-example.json → Story (#/definitions/Story)            [se existir]
//
// E TAMBÉM (regressão de CONTEÚDO, não só de forma):
//   - #/definitions/UiContext e #/definitions/UiField sobre o uiContext real dos exemplos;
//   - presença efetiva de uiContext.fields[] / options[] / grid / filterBehavior e de
//     acceptanceScenarios[] com testData nos exemplos canônicos. Um exemplo pode ser
//     estruturalmente válido e ainda assim não demonstrar o contrato que a SKILL exige —
//     foi o que aconteceu: nenhum exemplo mostrava fields[]/options[], embora o schema os
//     declarasse insubstituíveis e um validator FATAL os cobrasse.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));

let Ajv, addFormats;
try {
  Ajv = (await import('ajv')).default;
  addFormats = (await import('ajv-formats')).default;
} catch {
  console.error('ajv/ajv-formats indisponíveis — instale com `npm i ajv ajv-formats --no-save`.');
  process.exit(2);
}

const schema = read('tasks.schema-atual.json');
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'tasks');

const cases = [
  { file: 'tasks.hierarchy-example.json', ref: 'tasks', label: 'documento completo (root)' },
  { file: 'tasks.example-completo.json', ref: 'tasks#/definitions/Task', label: 'Task functional' },
  { file: 'tasks.sec-task-example.json', ref: 'tasks#/definitions/Task', label: 'Task class=security', optional: true },
  { file: 'tasks.uat-task-example.json', ref: 'tasks#/definitions/Task', label: 'Task class=uat', optional: true },
  { file: 'tasks.transversal-story-example.json', ref: 'tasks#/definitions/Story', label: 'Story transversal', optional: true },
  { file: 'tasks.spike-task-example.json', ref: 'tasks#/definitions/Task', label: 'Task class=spike', optional: true },
  // `tasks.fixture-compat.json` NÃO entra aqui de propósito: ele existe para exercitar as formas
  // LEGADAS (story só com businessSummary, critério em string, traceability em array), que são
  // por definição não-conformes ao schema atual — é isso que faz dele um teste de
  // retrocompatibilidade. Asserção sobre ele é a de CONSUMIDOR, em test-consumer-compat.mjs:
  // toda forma produz saída legível nos três consumidores, nenhuma cai em branco.
  // `tasks.fixture-validators.json` também não entra: é fixture NEGATIVO, deve reprovar.
];

let failures = 0;
let checked = 0;

for (const c of cases) {
  const abs = path.join(__dirname, c.file);
  if (!fs.existsSync(abs)) {
    if (c.optional) continue;
    console.error(`FALHA: arquivo obrigatório ausente — ${c.file}`);
    failures++;
    continue;
  }
  const validate = ajv.getSchema(c.ref);
  if (!validate) {
    console.error(`FALHA: ref não resolvida — ${c.ref}`);
    failures++;
    continue;
  }
  const data = read(c.file);
  const ok = validate(data);
  checked++;
  if (ok) {
    console.log(`OK   ${c.file}  [${c.label}]`);
  } else {
    failures++;
    console.error(`FALHA ${c.file}  [${c.label}]`);
    for (const e of validate.errors) {
      console.error(`   ${e.instancePath || '/'} ${e.message} ${e.params ? JSON.stringify(e.params) : ''}`);
    }
  }
}

// ---------------------------------------------------------------------------
// tasks.operational-types-example.json — Enabler (nível 2 em features[], nível 3 em
// stories[]), Spike, Technical Debt e Bug. Cada item de features[] valida contra
// #/definitions/Feature; cada item de stories[] contra #/definitions/Story.
// ---------------------------------------------------------------------------
{
  const opFile = 'tasks.operational-types-example.json';
  const opAbs = path.join(__dirname, opFile);
  if (fs.existsSync(opAbs)) {
    const doc = read(opFile);
    const validateFeature = ajv.getSchema('tasks#/definitions/Feature');
    const validateStory = ajv.getSchema('tasks#/definitions/Story');
    for (const feature of doc.features ?? []) {
      checked++;
      if (validateFeature(feature)) {
        console.log(`OK   ${opFile}#features/${feature.id}  [Feature workItemType=${feature.workItemType}]`);
      } else {
        failures++;
        console.error(`FALHA ${opFile}#features/${feature.id}  [Feature]`);
        for (const e of validateFeature.errors) console.error(`   ${e.instancePath || '/'} ${e.message}`);
      }
    }
    for (const story of doc.stories ?? []) {
      checked++;
      if (validateStory(story)) {
        console.log(`OK   ${opFile}#stories/${story.id}  [Story workItemType=${story.workItemType}]`);
      } else {
        failures++;
        console.error(`FALHA ${opFile}#stories/${story.id}  [Story]`);
        for (const e of validateStory.errors) console.error(`   ${e.instancePath || '/'} ${e.message}`);
      }
    }
  } else {
    console.error(`FALHA: arquivo obrigatório ausente — ${opFile}`);
    failures++;
  }
}

// ---------------------------------------------------------------------------
// Cobertura dos defs de UI (UiContext / UiField) sobre os uiContext reais dos exemplos
// ---------------------------------------------------------------------------

/** Coleta todos os uiContext do documento, com o escopo de origem. */
function collectUiContexts(doc) {
  const out = [];
  for (const story of doc.stories ?? []) {
    if (story?.uiContext) out.push({ scope: `${story.id}.uiContext`, ui: story.uiContext });
    for (const task of story?.tasks ?? []) {
      if (task?.uiContext) out.push({ scope: `${task.id}.uiContext`, ui: task.uiContext });
    }
  }
  if (doc?.uiContext) out.push({ scope: 'raiz.uiContext', ui: doc.uiContext });
  return out;
}

const validateUiContext = ajv.getSchema('tasks#/definitions/UiContext');
const validateUiField = ajv.getSchema('tasks#/definitions/UiField');
if (!validateUiContext || !validateUiField) {
  console.error('FALHA: defs UiContext/UiField não resolvidas no schema.');
  failures++;
} else {
  const hierarchy = read('tasks.hierarchy-example.json');
  const uis = collectUiContexts(hierarchy);
  if (!uis.length) {
    console.error('FALHA: nenhum uiContext nos exemplos — o contrato de tela (fields[]/options[]/grid/filterBehavior) tem de estar demonstrado em ≥1 story e ≥1 task.');
    failures++;
  }
  for (const { scope, ui } of uis) {
    checked++;
    if (validateUiContext(ui)) {
      console.log(`OK   ${scope}  [UiContext]`);
    } else {
      failures++;
      console.error(`FALHA ${scope}  [UiContext]`);
      for (const e of validateUiContext.errors) console.error(`   ${e.instancePath || '/'} ${e.message}`);
    }
    (ui.fields ?? []).forEach((f, i) => {
      if (!validateUiField(f)) {
        failures++;
        console.error(`FALHA ${scope}.fields[${i}]  [UiField]`);
        for (const e of validateUiField.errors) console.error(`   ${e.instancePath || '/'} ${e.message}`);
      }
    });
  }

  // Regressão de CONTEÚDO: o exemplo canônico precisa DEMONSTRAR o contrato, não só ser válido.
  const OPTION_TYPES = new Set(['select', 'multiselect', 'dropdown', 'combo', 'combobox', 'radio', 'radiogroup', 'checkboxgroup', 'autocomplete', 'lookup']);
  const contentChecks = [
    ['≥1 story com uiContext', uis.some((u) => /^STORY-/.test(u.scope))],
    ['≥1 task com uiContext', uis.some((u) => /^TASK-/.test(u.scope))],
    ['uiContext.fields[] não vazio', uis.some((u) => (u.ui.fields ?? []).length > 0)],
    ['≥1 campo de opções com options[] transcrito', uis.some((u) => (u.ui.fields ?? []).some((f) => OPTION_TYPES.has(String(f.type)) && (f.options ?? []).length > 0))],
    ['≥1 campo com optionsSource declarado', uis.some((u) => (u.ui.fields ?? []).some((f) => f.optionsSource && f.optionsSource.kind))],
    ['uiContext.grid.columns[] presente', uis.some((u) => (u.ui.grid?.columns ?? []).length > 0)],
    ['uiContext.filterBehavior.applyOn presente', uis.some((u) => !!u.ui.filterBehavior?.applyOn)],
  ];
  const tasks = (hierarchy.stories ?? []).flatMap((s) => s.tasks ?? []);
  const functional = tasks.filter((t) => (t.class ?? 'functional') === 'functional');
  contentChecks.push([
    'toda task functional tem acceptanceScenarios[] com testData',
    functional.length > 0 && functional.every((t) => (t.acceptanceScenarios ?? []).length > 0 && t.acceptanceScenarios.every((s) => !!s.testData))
  ]);
  contentChecks.push([
    '≥1 cenário negativo (INVALID_INPUT / BUSINESS_RULE_VIOLATION)',
    functional.every((t) => (t.acceptanceScenarios ?? []).some((s) => ['INVALID_INPUT', 'BUSINESS_RULE_VIOLATION', 'AUTHORIZATION', 'EDGE_CASE', 'EXTERNAL_SERVICE_FAILURE'].includes(s.category)))
  ]);
  for (const [label, ok] of contentChecks) {
    checked++;
    if (ok) console.log(`OK   conteúdo: ${label}`);
    else {
      failures++;
      console.error(`FALHA conteúdo: ${label}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Fixture NEGATIVO — os gates de presença de contrato precisam DISPARAR nele
//
// Por que isto está aqui: os dois gates novos (TASK_MISSING_API_CONTRACT /
// TASK_MISSING_PERSISTENCE_MODEL) nasceram de um defeito em que o validador saía com exit 0
// diante de 18 tasks sem contrato de API e 27 sem modelo de dados. Um gate cuja regressão só
// aparece em produção não é gate. O par abaixo é assimétrico de propósito:
//   TASK-FRONT-SEM-CONTRATO  → tem de REPROVAR (cita rota e tabela, não embute nada)
//   TASK-SEM-SUPERFICIE      → tem de PASSAR   (componente puro, sem API e sem dados)
// Só o par prova o gate: o primeiro sozinho é satisfeito por um validador que reprova tudo.
// ---------------------------------------------------------------------------

const NEG_FIXTURE = 'tasks.fixture-validators.json';
const negAbs = path.join(__dirname, NEG_FIXTURE);
if (!fs.existsSync(negAbs)) {
  console.error(`FALHA: fixture negativo ausente — ${NEG_FIXTURE}`);
  failures++;
} else {
  const { spawnSync } = await import('node:child_process');
  const validator = path.join(__dirname, '..', 'scripts', 'validate-tasks-selfsufficiency.mjs');
  const run = spawnSync(process.execPath, [validator, negAbs, '--max', '500'], { encoding: 'utf8' });
  let result = null;
  try {
    result = JSON.parse(run.stdout);
  } catch {
    console.error(`FALHA: saída do validador de auto-suficiência não é JSON (exit ${run.status}).`);
    failures++;
  }

  if (result) {
    const findings = [...(result.errors ?? []), ...(result.warnings ?? [])];
    const fatalOf = (scope, code) => (result.errors ?? []).some((e) => e.scope === scope && e.code === code);
    const anyOf = (scope, code) => findings.some((e) => e.scope === scope && e.code === code);

    const negChecks = [
      ['fixture negativo reprova (exit 1)', run.status === 1],
      ['TASK-FRONT-SEM-CONTRATO → TASK_MISSING_API_CONTRACT (FATAL)', fatalOf('TASK-FRONT-SEM-CONTRATO', 'TASK_MISSING_API_CONTRACT')],
      ['TASK-FRONT-SEM-CONTRATO → TASK_MISSING_PERSISTENCE_MODEL (FATAL)', fatalOf('TASK-FRONT-SEM-CONTRATO', 'TASK_MISSING_PERSISTENCE_MODEL')],
      ['CONTROLE TASK-SEM-SUPERFICIE → nenhum TASK_MISSING_API_CONTRACT', !anyOf('TASK-SEM-SUPERFICIE', 'TASK_MISSING_API_CONTRACT')],
      ['CONTROLE TASK-SEM-SUPERFICIE → nenhum TASK_MISSING_PERSISTENCE_MODEL', !anyOf('TASK-SEM-SUPERFICIE', 'TASK_MISSING_PERSISTENCE_MODEL')],
      ['TASK-UAT-SEM-SUMMARY → UAT_TASK_HAS_SUMMARY (isenção não é ausência de gate)', fatalOf('TASK-UAT-SEM-SUMMARY', 'UAT_TASK_HAS_SUMMARY')],
      ['TASK-SPIKE-RASO → SPIKE_TASK_COMPLETE', fatalOf('TASK-SPIKE-RASO', 'SPIKE_TASK_COMPLETE')],
      ['class=uat/spike isentas dos gates de contrato', !anyOf('TASK-UAT-SEM-SUMMARY', 'TASK_MISSING_API_CONTRACT') && !anyOf('TASK-SPIKE-RASO', 'TASK_MISSING_PERSISTENCE_MODEL')]
    ];
    for (const [label, ok] of negChecks) {
      checked++;
      if (ok) console.log(`OK   fixture negativo: ${label}`);
      else {
        failures++;
        console.error(`FALHA fixture negativo: ${label}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gatilhos em sincronia — o gate e o enriquecimento não podem divergir
//
// `validate-tasks-selfsufficiency.mjs` (que REPROVA) e `lib/technical-contracts.mjs` (que
// PREENCHE) declaram cada um os dois regexes de citação. A duplicação é deliberada: o validador
// é autocontido de propósito, para que um erro na lib nunca derrube o gate. O preço é a chance
// de drift silencioso — que esta verificação elimina.
// ---------------------------------------------------------------------------

{
  const validatorSrc = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'validate-tasks-selfsufficiency.mjs'), 'utf8');
  const libPath = path.join(__dirname, '..', 'scripts', 'lib', 'technical-contracts.mjs');
  const libSrc = fs.existsSync(libPath) ? fs.readFileSync(libPath, 'utf8') : '';
  const grab = (src, name) => new RegExp(String.raw`(?:export\s+)?const\s+${name}\s*=\s*(/.*/[a-z]*)\s*;`).exec(src)?.[1] ?? null;
  for (const name of ['API_ROUTE_CITATION', 'PHYSICAL_TABLE_CITATION']) {
    const a = grab(validatorSrc, name);
    const b = grab(libSrc, name);
    checked++;
    if (a && b && a === b) console.log(`OK   gatilho em sincronia: ${name} ${a}`);
    else {
      failures++;
      console.error(`FALHA gatilho fora de sincronia: ${name} — validator=${a ?? '(não encontrado)'} lib=${b ?? '(não encontrado)'}`);
    }
  }

  // Os gatilhos DERIVADOS DO PROJETO (rota do api-contracts.yaml, tabela do data-model.json — D29 do
  // teste ponta a ponta) vivem nos dois arquivos com o MESMO texto, entre os marcadores
  // `// <gatilhos-do-projeto>` e `// </gatilhos-do-projeto>` (na lib, com `export`). Mesma razão dos
  // dois regexes acima: o gate que reprova e o passe que preenche não podem divergir em silêncio.
  const bloco = (src) => {
    const m = /\/\/ <gatilhos-do-projeto>\n([\s\S]*?)\/\/ <\/gatilhos-do-projeto>/.exec(src.replace(/\r\n/g, '\n'));
    return m ? m[1].replace(/^export /gm, '') : null;
  };
  const blocoValidador = bloco(validatorSrc);
  const blocoLib = bloco(libSrc);
  checked++;
  if (blocoValidador && blocoLib && blocoValidador === blocoLib) {
    console.log(`OK   gatilhos do projeto em sincronia (${blocoValidador.split('\n').length} linhas)`);
  } else {
    failures++;
    const linha = blocoValidador && blocoLib
      ? blocoValidador.split('\n').findIndex((l, i) => l !== blocoLib.split('\n')[i]) + 1
      : 0;
    console.error(`FALHA gatilhos do projeto fora de sincronia — ${!blocoValidador || !blocoLib ? 'marcador ausente' : `primeira diferença na linha ${linha} do bloco`}`);
  }
}

// ---------------------------------------------------------------------------
// Gates FATAL sobre os próprios exemplos — contrato de exit code por fixture
//
// Até aqui este arquivo validava SCHEMA e CONTEÚDO, mas nunca rodava os dois validadores que
// reprovam de verdade. O resultado foi que dois exemplos canônicos passaram a viajar no pacote
// reprovando os próprios gates (hierarchy-example: LEVEL_GROUNDED_IN_SOURCE ×3 +
// TASK_MISSING_PERSISTENCE_MODEL; operational-types: 5 FATAL de negócio + 11 de auto-suficiência).
// Um exemplo que reprova ensina o gerador a produzir backlog que reprova.
//
// A tabela abaixo declara, por fixture, o exit code esperado de cada validador — e, quando o
// fixture legitimamente reprova, EXATAMENTE quais códigos podem aparecer. Qualquer código novo
// é regressão, mesmo que o exit code não mude.
//   0 = limpo · 1 = tem FATAL · 2 = entrada não aplicável (fragmento; o validador não analisou)
// ---------------------------------------------------------------------------

{
  const EXPECTATIONS = [
    { file: 'tasks.hierarchy-example.json', business: 0, selfsufficiency: 0,
      why: 'documento completo e canônico — é o exemplo que o gerador imita; tem de sair limpo nos dois' },
    { file: 'tasks.operational-types-example.json', business: 1, selfsufficiency: 0,
      businessCodes: ['NO_DANGLING_PARENT', 'LEVEL_USAGE_COHERENT'],
      why: 'FRAGMENTO por design: EPIC-001 e FEAT-PEDIDO-CRIACAO são pais que vivem no tasks.json real. Só as falhas de PONTEIRO são esperadas — conteúdo de task tem de estar completo' },
    { file: 'tasks.example-completo.json', business: 2, selfsufficiency: 2,
      why: 'fragmento de UMA task (#/definitions/Task) — não há nível de negócio nem array de tasks a analisar' },
    { file: 'tasks.sec-task-example.json', business: 2, selfsufficiency: 2, why: 'fragmento de uma task class=security' },
    { file: 'tasks.spike-task-example.json', business: 2, selfsufficiency: 2, why: 'fragmento de uma task class=spike' },
    { file: 'tasks.uat-task-example.json', business: 2, selfsufficiency: 2, why: 'fragmento de uma task class=uat' },
    { file: 'tasks.transversal-story-example.json', business: 2, selfsufficiency: 0,
      why: 'fragmento de Story transversal: sem nível de negócio para o business; a task embutida sai limpa' },
    { file: 'tasks.fixture-validators.json', business: 1, selfsufficiency: 1, negative: true,
      why: 'fixture NEGATIVO — existe para reprovar; se sair 0 o gate parou de pegar o defeito' },
    { file: 'tasks.fixture-compat.json', business: 1, selfsufficiency: 1, negative: true,
      why: 'fixture NEGATIVO de compatibilidade de consumidor' }
  ];

  const runValidator = (script, file) => {
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', script), path.join(__dirname, file)], { encoding: 'utf8' });
    let codes = [];
    try { codes = Object.keys(JSON.parse(r.stdout || '{}').errorsByCode ?? {}); } catch { /* exit 2 não emite JSON */ }
    return { code: r.status, codes };
  };

  for (const exp of EXPECTATIONS) {
    if (!fs.existsSync(path.join(__dirname, exp.file))) continue;
    for (const kind of ['business', 'selfsufficiency']) {
      const script = kind === 'business' ? 'validate-tasks-business.mjs' : 'validate-tasks-selfsufficiency.mjs';
      const { code, codes } = runValidator(script, exp.file);
      checked++;
      if (code !== exp[kind]) {
        failures++;
        console.error(`FALHA gate ${kind}: ${exp.file} saiu exit ${code}, esperado ${exp[kind]} (${exp.why})`);
        if (codes.length) console.error(`      códigos: ${codes.join(', ')}`);
        continue;
      }
      const allowed = exp[`${kind}Codes`];
      const unexpected = allowed ? codes.filter((c) => !allowed.includes(c)) : (exp.negative ? [] : codes);
      if (unexpected.length) {
        failures++;
        console.error(`FALHA gate ${kind}: ${exp.file} exit ${code} correto, mas com código NÃO previsto: ${unexpected.join(', ')}`);
        console.error(`      previstos: ${(allowed ?? []).join(', ') || '(nenhum)'} — ${exp.why}`);
      } else {
        console.log(`OK   gate ${kind}: ${exp.file} exit ${code}${allowed ? ` (só ${allowed.join('/')}, esperado)` : ''}`);
      }
    }
  }
}

console.log(`\n${checked} verificação(ões), ${failures} falha(s).`);
process.exit(failures ? 1 : 0);
