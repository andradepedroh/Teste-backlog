#!/usr/bin/env node
import "./lib/load-dotenv.mjs";
import { accessSync, constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadTasksDocument } from "./lib/load-tasks.mjs";
import { buildPublishPlan, formatPublishPlan, isChangeModeDoc, readIdMap } from "./lib/publish-plan.mjs";
import { caminhoDoRegistro, lerRegistro, NOME_REGISTRO } from "./lib/marcas-regra.mjs";
// O azureDevopsService.js é carregado só na publicação de verdade (import dinâmico lá embaixo):
// o --dry-run não pode carregar o código que fala com a API.

/** Fallback chain para localizar o tasks.json: outputs/spec/ → outputs/ → PIPELINE_OUTPUTS_DIR. */
function defaultInputPaths() {
  const cwd = process.cwd();
  const envDir = process.env.PIPELINE_OUTPUTS_DIR;
  return {
    fromCwdOutputsSpec: resolve(cwd, "outputs", "spec", "tasks.json"),
    fromCwdOutputs: resolve(cwd, "outputs", "tasks.json"),
    fromEnvDir: envDir ? join(envDir, "tasks.json") : null,
  };
}

function parseArgs(argv) {
  let input = null;
  let project = null;
  let idMap = null;
  let change = false;
  let dryRun = false;
  let reordenar = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") input = argv[++i];
    else if (a === "--project" || a === "-p") project = argv[++i];
    else if (a === "--id-map") idMap = argv[++i];
    else if (a === "--change") change = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--reordenar") reordenar = true;
    else if (a === "--help" || a === "-h") return { help: true, input, project, idMap, change, dryRun, reordenar };
    else if (!a.startsWith("-") && input === null) input = a;
  }
  return { input, project, idMap, change, dryRun, reordenar, help: false };
}

function printHelp() {
  console.log(`spec-tasks-azure — publica tasks.json (spec-tasks v5+) no Azure DevOps como work items.

Suporta hierarquia variável de backlog (Epic, Feature, Story, Task) e qualquer process template
ADO (Agile, Scrum, CMMI, Custom). O Epic pai deve ser pré-criado manualmente no ADO.

Dois modos:
  • normal (padrão)  — create-only: cria Epic/Feature/Story/Task. Comportamento preservado.
  • _change          — upsert: atualiza (PATCH) work items já existentes e cria só os novos.
                       Ativado por metadata.changeMode === true no JSON ou pela flag --change.

Credenciais: .env com AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT
Epic pai: metadata.azureDevOps.epicWorkItemId ou AZURE_DEVOPS_EPIC_WORK_ITEM_ID no .env
Mapeamento WIT: exclusivamente via .env — AZURE_DEVOPS_WIT_EPIC, AZURE_DEVOPS_WIT_FEATURE, AZURE_DEVOPS_WIT_USER_STORY, AZURE_DEVOPS_WIT_TASK
(metadata.azureDevOps.workItemTypes.<nível>.wit é só referência; não é lido pelo código — só .publish é lido, no nível feature)

Correlação ID lógico → work item (modo _change): id-map.json > tag 'logical-id:<ID>' (gravada em
toda criação) > título legado '<ID>: ...'. Itens legados sem marcador exigem id-map.json inicial.

Uso:
  node cli.mjs [opções] [entrada.json]

Opções:
  -i, --input <arquivo>   JSON de tarefas (padrão: outputs/spec/tasks.json, senão outputs/tasks.json)
  -p, --project <nome>    Projeto ADO (override de AZURE_DEVOPS_PROJECT; case-sensitive)
      --change            Força o modo _change (upsert) mesmo sem metadata.changeMode
      --id-map <arquivo>  id-map.json {"TASK-XXX-XXX": 12345} para correlação inicial de itens legados
      --dry-run           Simula: lista o que seria criado/atualizado, na ordem, sem chamar a API
                          do ADO e sem precisar do PAT. Rode SEMPRE antes de publicar e mostre o
                          resultado a quem vai confirmar a publicação.
      --reordenar         Modo _change: regrava o StackRank (a ordem do backlog) também dos work
                          items que já existem — eles trocam de StackRank entre si (permuta entre os
                          slots atuais de cada nível), sem colidir com itens de fora do arquivo; item
                          sem StackRank vai para depois do maior. Sem a flag, só item novo recebe a
                          ordem — o time pode ter reordenado o board à mão.
  -h, --help              esta ajuda

Ordem e marca (spec-tasks ≥ 1.7): os work items são criados na ordem de executionOrder, com o
StackRank = (maior StackRank já existente no projeto) + executionOrder — os novos entram depois do
backlog que já existe; se essa leitura falhar, saem sem StackRank, no fim (aviso). Processo sem o
campo → aviso, e segue sem ele (na criação e na atualização). dependencies[] vira link de dependência
(Predecessora/Sucessora). Item com businessRuleHeavy ganha a tag regra-de-negocio
(metadata.azureDevOps.businessRuleTag muda o nome); no _change, a tag sai do item desmarcado só se
foi esta ferramenta que a pôs — o registro fica em ado-marcas-regra.json, ao lado do tasks.json
(versione junto). Tag posta à mão pelo time fica; a comparação de tags ignora maiúsculas.

Variáveis de ambiente:
  AZURE_DEVOPS_PAT                          Personal Access Token (obrigatório)
  AZURE_DEVOPS_ORG                          Organização ADO (obrigatório)
  AZURE_DEVOPS_PROJECT                      Projeto ADO (obrigatório)
  AZURE_DEVOPS_EPIC_WORK_ITEM_ID            ID do Epic pai (override de metadata)
  AZURE_DEVOPS_WIT_FEATURE                  Nome do WIT Feature (default: Feature)
  AZURE_DEVOPS_WIT_USER_STORY               Nome do WIT Story (default: User Story)
  AZURE_DEVOPS_WIT_TASK                     Nome do WIT Task (default: Task)
  PIPELINE_OUTPUTS_DIR                      Override do diretório de outputs
  AZURE_DEVOPS_APPEND_FULL_JSON_PAYLOAD=1   Anexar JSON completo à descrição
  AZURE_DEVOPS_SKIP_STORY_ACCEPTANCE_CRITERIA=1  Omitir critérios de aceitação
  AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE=1  Desativa o GATE DE AUTO-SUFICIÊNCIA que roda antes de
                                            publicar (spec-tasks/scripts/validate-tasks-selfsufficiency.mjs).
                                            Só para emergência: fica registrado no stderr e deve ser
                                            justificado no sync-log.

Gate de auto-suficiência: antes de qualquer escrita no ADO, o CLI roda o validator de
auto-suficiência sobre o tasks.json. Havendo FATAL, a publicação é ABORTADA com exit 3.
Validator ausente ou que não conseguiu analisar o arquivo → aviso e publicação sem o gate.

Exit codes:
  0  sucesso (no --dry-run: simulação feita, nada enviado)
  1  erro fatal (input ilegível, credenciais ausentes, exceção não tratada)
  2  falha parcial (erros/avisos por item; no modo _change inclui correlação não resolvida)
  3  publicação abortada pelo gate de auto-suficiência (tasks.json com FATAL)

Consulte templates/azure-validation-checklist.md para validação manual do projeto ADO.
Consulte templates/workitemtypes.example.json para mapeamento WIT por process template.

Exemplos:
  node cli.mjs -i outputs/spec/tasks.json --project SEU_PROJETO --dry-run
  npm run push
  node --env-file=.env cli.mjs -i outputs\\spec\\tasks.json
  node cli.mjs --input outputs/spec/tasks-complementary_change-XXX.json --project SEU_PROJETO --change
  node cli.mjs --input outputs/spec/tasks-complementary_change-XXX.json --project SEU_PROJETO --change --id-map outputs/spec/id-map.json
`);
}

function resolveInputPathSync(specified) {
  if (specified) return resolve(specified);
  const { fromCwdOutputsSpec, fromCwdOutputs, fromEnvDir } = defaultInputPaths();
  const fallbacks = [fromCwdOutputsSpec, fromCwdOutputs, fromEnvDir].filter(Boolean);
  for (const p of fallbacks) {
    try {
      accessSync(p, constants.R_OK);
      return p;
    } catch {
      /* try next */
    }
  }
  return fromCwdOutputsSpec;
}

const args = parseArgs(process.argv);
if (args.help) {
  printHelp();
  process.exit(0);
}

// --project tem precedência sobre AZURE_DEVOPS_PROJECT (env/.env), lido depois pela config.
if (args.project && String(args.project).trim()) {
  process.env.AZURE_DEVOPS_PROJECT = String(args.project).trim();
}

const inputPath = resolveInputPathSync(args.input);
let doc;
try {
  doc = loadTasksDocument(inputPath);
} catch (e) {
  process.stderr.write(`spec-tasks-azure: não foi possível ler ${inputPath}: ${e?.message || e}\n`);
  process.exit(1);
}
const changeMode = isChangeModeDoc(doc, args.change);

// ---------------------------------------------------------------------------
// GATE DE AUTO-SUFICIÊNCIA (pré-publicação)
//
// Por que aqui e não só na SKILL.md: os validators de auto-suficiência existiram
// durante meses apenas como PROSA, com a instrução "o agente deve rodar e bloquear
// se houver FATAL". O agente não rodava, e backlogs com tasks que apontavam para
// `requirements.md` em vez de embutir o conteúdo foram publicados no ADO. Instrução
// não é gate. Este é o último ponto do pipeline que é código puro — logo, o único
// lugar onde a verificação é garantida independentemente do modelo.
//
// Override: AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE=1 (registrado no stderr).
// ---------------------------------------------------------------------------
function runSelfSufficiencyGate(tasksPath) {
  if (process.env.AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE === '1') {
    process.stderr.write(
      'spec-tasks-azure [AVISO]: gate de auto-suficiência DESATIVADO por ' +
      'AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE=1. Publicando sem verificar se as tasks são ' +
      'auto-suficientes. Registre o motivo no sync-log.\n'
    );
    return;
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const validator = resolve(here, '..', 'spec-tasks', 'scripts', 'validate-tasks-selfsufficiency.mjs');

  try {
    accessSync(validator, constants.R_OK);
  } catch {
    process.stderr.write(
      `spec-tasks-azure [aviso]: validator de auto-suficiência não encontrado em ${validator} — ` +
      'publicando sem o gate. Confirme que a spec-tasks está instalada na mesma árvore de skills.\n'
    );
    return;
  }

  const r = spawnSync(process.execPath, [validator, tasksPath], { encoding: 'utf8' });

  if (r.status === 0) {
    process.stderr.write('spec-tasks-azure: gate de auto-suficiência OK (0 FATAL).\n');
    return;
  }

  if (r.status === 2 || r.error) {
    process.stderr.write(
      `spec-tasks-azure [aviso]: validator não pôde analisar ${tasksPath} ` +
      `(${r.error?.message ?? 'exit 2'}) — publicando sem o gate.\n` +
      (r.stderr ? `--- stderr do validator ---\n${r.stderr}\n` : '')
    );
    return;
  }

  // Só é FATAL quando o validator produziu relatório JSON no stdout. Sem isso (tipicamente
  // uma exceção no validator: exit 1 com stdout vazio) o caminho FATAL falhava no JSON.parse e
  // o operador via "PUBLICAÇÃO ABORTADA" sem um único erro listado — bloqueio silencioso.
  // Crash do validator é DEGRADAÇÃO com aviso explícito, não bloqueio.
  let out = null;
  try {
    out = r.stdout && r.stdout.trim() ? JSON.parse(r.stdout) : null;
  } catch {
    out = null;
  }

  if (out === null || typeof out !== 'object') {
    process.stderr.write(
      `spec-tasks-azure [AVISO]: o validator de auto-suficiência terminou com exit ${r.status} SEM ` +
      `relatório JSON no stdout — provavelmente uma exceção dentro do validator, não FATAL nas tasks. ` +
      `Publicando SEM o gate; conserte o validator e rode de novo para ter a verificação de verdade.\n` +
      (r.stderr ? `--- stderr do validator ---\n${r.stderr}\n` : '') +
      (r.stdout && r.stdout.trim() ? `--- stdout (não-JSON) ---\n${r.stdout.slice(0, 2000)}\n` : '')
    );
    return;
  }

  // exit 1 com relatório JSON → há FATAL. Abortar antes de escrever qualquer coisa no ADO.
  const byCode = Object.entries(out.errorsByCode ?? {})
    .map(([c, n]) => `  ${String(n).padStart(4)}  ${c}`)
    .join('\n');
  const summary =
    `\n  Tasks: ${out.taskCount} | com FATAL: ${out.tasksWithFatal}\n` +
    `  FATAL por código:\n${byCode}\n` +
    (out.errors ?? []).slice(0, 5)
      .map((e) => `  · [${e.code}] ${e.scope} · ${e.field}\n      ${e.message}`)
      .join('\n');

  process.stderr.write(
    `\nspec-tasks-azure: PUBLICAÇÃO ABORTADA — o tasks.json não passa no gate de auto-suficiência.` +
    `${summary}\n\n` +
    `Publicar assim entrega ao ADO work items que o agente implementador não consegue executar ` +
    `sem abrir outros documentos — foi exatamente o defeito que este gate existe para impedir.\n\n` +
    `Para ver o relatório completo:\n` +
    `  node ${validator} ${tasksPath} --report\n\n` +
    `Corrija as tasks e publique de novo. Em emergência, ` +
    `AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE=1 ignora o gate (e fica registrado).\n`
  );
  process.exit(3);
}

runSelfSufficiencyGate(inputPath);

// ---------------------------------------------------------------------------
// --dry-run: mostra o que a publicação faria, sem rede. O gate acima roda também aqui — se ele
// abortaria a publicação, a simulação diz isso do mesmo jeito (exit 3).
// ---------------------------------------------------------------------------
if (args.dryRun) {
  let idMap = new Map();
  try {
    idMap = readIdMap(args.idMap);
  } catch (e) {
    process.stderr.write(`spec-tasks-azure: ${e?.message || e}\n`);
    process.exit(1);
  }
  // O registro das tags de regra de negócio que a ferramenta pôs fica ao lado do tasks.json (é lá que
  // a publicação o grava): a simulação lê o mesmo arquivo para dizer de quais itens a tag sai.
  const marcas = lerRegistro(caminhoDoRegistro(dirname(inputPath)));
  if (marcas.ilegivel) process.stderr.write(`spec-tasks-azure [aviso]: ${NOME_REGISTRO} ilegível (${marcas.erro}) — nenhuma tag de regra de negócio sairia.\n`);
  const org = process.env.AZURE_DEVOPS_ORG;
  const projetoAdo = process.env.AZURE_DEVOPS_PROJECT;
  const plan = buildPublishPlan(doc, { changeMode, idMap, reordenar: args.reordenar, marcas, projeto: org && projetoAdo ? `${org}/${projetoAdo}` : null });
  process.stdout.write(`${JSON.stringify({ mode: "dry-run", ...plan }, null, 2)}\n`);
  process.stderr.write(formatPublishPlan(plan, {
    projeto: process.env.AZURE_DEVOPS_PROJECT,
    org: process.env.AZURE_DEVOPS_ORG,
  }));
  process.exit(plan.erros.length > 0 ? 1 : 0);
}

const { createFullStructure, createOrUpdateFullStructure } = await import("./azureDevopsService.js");

// baseDir = diretório do tasks.json — resolve uiContext.screenshot (paridade com spec-tasks-html).
// `npm run push` roda com cwd na pasta da skill: resolver contra o cwd nunca encontrava
// `outputs/spec/screens/*.png`. Também é a raiz do containment do upload de attachment.
const baseDir = dirname(inputPath);

try {
  if (changeMode) {
    const result = await createOrUpdateFullStructure(doc, { idMapPath: args.idMap, baseDir, reordenar: args.reordenar });
    const printable = {
      mode: "change",
      defaultEpicAdoId: result.defaultEpicAdoId,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      relatedLinks: result.relatedLinks,
      dependencyLinks: result.dependencyLinks,
      warnings: result.warnings,
      errors: result.errors.map(({ phase, message }) => ({ phase, message })),
    };
    process.stdout.write(`${JSON.stringify(printable, null, 2)}\n`);
    for (const w of result.warnings) process.stderr.write(`spec-tasks-azure [aviso]: ${w}\n`);
    process.stderr.write(
      `spec-tasks-azure (modo _change): ${result.created.length} criado(s), ` +
      `${result.updated.length} atualizado(s), ${result.skipped.length} pulado(s), ` +
      `${result.relatedLinks.filter((l) => l.linked).length} link(s) Related; ` +
      `${result.warnings.length} aviso(s), ${result.errors.length} erro(s).\n`
    );
    // Falha parcial → exit 2 (erros OU avisos de correlação não resolvida).
    if (result.errors.length > 0 || result.warnings.length > 0) process.exit(2);
  } else {
    const result = await createFullStructure(doc, undefined, { baseDir });
    const printable = {
      mode: "normal",
      defaultEpicAdoId: result.defaultEpicAdoId,
      epics: result.epics,
      features: result.features,
      stories: result.stories,
      dependencyLinks: result.dependencyLinks,
      warnings: result.warnings,
      errors: result.errors.map(({ phase, message }) => ({ phase, message })),
    };
    process.stdout.write(`${JSON.stringify(printable, null, 2)}\n`);
    for (const w of result.warnings ?? []) process.stderr.write(`spec-tasks-azure [aviso]: ${w}\n`);
    if (result.errors.length > 0) {
      process.stderr.write(`spec-tasks-azure: ${result.errors.length} erro(s) parcial(is).\n`);
      process.exit(2);
    }
    process.stderr.write(
      `spec-tasks-azure: Epic pai #${result.defaultEpicAdoId}; ` +
      `${result.epics.length} epic(s), ${result.features.length} feature(s), ${result.stories.length} historia(s) e tarefas criadas.\n`
    );
  }
} catch (e) {
  console.error(e);
  process.exit(1);
}
