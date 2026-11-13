#!/usr/bin/env node
import { accessSync, constants, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadTasksDocument } from "./lib/load-tasks.mjs";
import { renderTasksHtml, getUnrenderedKeyWarnings } from "./lib/render-html.mjs";

function defaultReportHtmlPath() {
  const envDir = process.env.PIPELINE_OUTPUTS_DIR;
  if (envDir) return join(envDir, "spec", "report", "tasks.html");
  return resolve(process.cwd(), "outputs", "spec", "report", "tasks.html");
}

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
  let output = null;
  let stdout = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdout" || a === "-s") stdout = true;
    else if (a === "--input" || a === "-i") input = argv[++i];
    else if (a === "--output" || a === "-o") output = argv[++i];
    else if (a === "--help" || a === "-h") return { help: true, input, output, stdout };
    else if (!a.startsWith("-") && input === null) input = a;
    else if (!a.startsWith("-") && output === null && !stdout) output = a;
  }
  return { input, output, stdout, help: false };
}

function printHelp() {
  console.log(`spec-tasks-html — gera relatório HTML a partir do tasks.json (spec-tasks v5+).

Suporta a cadeia completa Epic → Feature → Story → Task via metadata.backlogHierarchy, e também
Epic → Story → Task, Feature → Story → Task e o modo flat Story → Task.
Compatível com tasks.json legado (sem backlogHierarchy definido).

Uso:
  node cli.mjs [opções] [entrada.json] [saída.html]

Opções:
  -i, --input <arquivo>   JSON de tarefas (padrão: outputs/spec/tasks.json, senão outputs/tasks.json)
  -o, --output <arquivo>  HTML (padrão: outputs/spec/report/tasks.html)
  -s, --stdout            escreve HTML no stdout (ignora -o)
  -h, --help              esta ajuda

Variáveis de ambiente:
  PIPELINE_OUTPUTS_DIR    override do diretório de outputs (padrão: outputs/ relativo ao cwd)

Para publicar no Azure DevOps use spec-tasks-azure (npm run push).

Exemplos:
  npm run report
  node cli.mjs --input outputs/spec/tasks.json -o relatorio.html
  node cli.mjs --stdout > relatorio.html
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

const inputPath = resolveInputPathSync(args.input);
const outputPath = args.stdout
  ? null
  : args.output
    ? resolve(args.output)
    : defaultReportHtmlPath();

let doc;
let html;
try {
  doc = loadTasksDocument(inputPath);
  // baseDir: diretório do tasks.json — usado para resolver uiContext.screenshot (embutido em base64)
  html = renderTasksHtml(doc, { baseDir: dirname(inputPath) });
} catch (e) {
  process.stderr.write(`spec-tasks-html: não foi possível ler ${inputPath}: ${e?.message || e}\n`);
  process.exit(1);
}

/**
 * Chave presente no tasks.json e NÃO renderizada — aviso, nunca bloqueio.
 *
 * O defeito que motivou isto era silencioso: `migrationNotes` (16/16 entidades),
 * `checkConstraints` (5/16), `uniqueConstraints` (1/16) e `tags` (24/24 operações) existiam no
 * JSON e não apareciam em lugar nenhum do relatório. Nada avisava — nem quem gerou, nem quem leu.
 * O silêncio total foi o que fez o defeito passar despercebido.
 */
const unrendered = getUnrenderedKeyWarnings();
if (unrendered.length) {
  for (const w of unrendered) {
    process.stderr.write(
      `spec-tasks-html [aviso]: ${w.scope}.${w.path}.${w.key} presente no tasks.json e não renderizada\n`
    );
  }
  process.stderr.write(
    `spec-tasks-html [aviso]: ${unrendered.length} chave(s) não renderizada(s). ` +
    `Ou o renderer precisa cobri-las, ou o campo não deveria estar no tasks.json.\n`
  );
}

if (args.stdout) {
  process.stdout.write(html);
  if (process.stdout.isTTY) process.stderr.write("\n");
} else {
  try { mkdirSync(dirname(outputPath), { recursive: true }); } catch {}
  writeFileSync(outputPath, html, "utf8");
  process.stderr.write(`spec-tasks-html: relatório gerado → ${outputPath}\n`);
}
