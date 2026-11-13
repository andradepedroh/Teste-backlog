#!/usr/bin/env node
// spec-estimate-report — monta o relatório HTML consolidado (negócio → estimativa)
// injetando o report-data.json no shell congelado. A IA produz o JSON; este CLI monta o HTML.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadReportData } from "./lib/load-data.mjs";
import { buildHtml } from "./lib/build-html.mjs";
import { montarReportData, conferirTotais } from "./lib/aggregate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = join(HERE, "templates", "report-shell.html");

function envDir() {
  return process.env.PIPELINE_OUTPUTS_DIR || null;
}

function candidateInputs(cwd) {
  const e = envDir();
  return [
    resolve(cwd, "outputs", "spec", "estimate-report", "report-data.json"),
    resolve(cwd, "outputs", "spec", "report-data.json"),
    resolve(cwd, "outputs", "report-data.json"),
    e ? join(e, "spec", "estimate-report", "report-data.json") : null,
    e ? join(e, "report-data.json") : null,
  ].filter(Boolean);
}

function firstExisting(paths) {
  for (const p of paths) if (existsSync(p)) return p;
  return null;
}

function defaultOutputPath(cwd) {
  const e = envDir();
  const base = e ? join(e, "spec", "estimate-report") : resolve(cwd, "outputs", "spec", "estimate-report");
  return join(base, "spec-estimate-report.html");
}

function parseArgs(argv) {
  const a = { stdout: false, input: null, output: null, template: null, help: false, tasks: null, hldJson: null, estimateCalc: null, montar: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--stdout" || t === "-s") a.stdout = true;
    else if (t === "--input" || t === "-i") a.input = argv[++i];
    else if (t === "--output" || t === "-o") a.output = argv[++i];
    else if (t === "--template" || t === "-t") a.template = argv[++i];
    else if (t === "--help" || t === "-h") a.help = true;
    else if (t === "--tasks") a.tasks = argv[++i];
    else if (t === "--hld-json") a.hldJson = argv[++i];
    else if (t === "--estimate-calc") a.estimateCalc = argv[++i];
    else if (t === "--montar") a.montar = true;
    else rest.push(t);
  }
  if (!a.input && rest[0]) a.input = rest[0];
  if (!a.output && rest[1]) a.output = rest[1];
  return a;
}

const HELP = `spec-estimate-report — relatório HTML consolidado do pipeline spec-*

Uso:
  node cli.mjs [opções] [input] [output]

Opções:
  -i, --input <arquivo>     report-data.json (padrão: descobre em outputs/spec/…)
  -o, --output <arquivo>    HTML de saída (padrão: outputs/spec/estimate-report/spec-estimate-report.html)
  -t, --template <arquivo>  shell alternativo (padrão: templates/report-shell.html ao lado do cli)
  -s, --stdout              escreve o HTML no stdout em vez de gravar arquivo
  -h, --help                esta ajuda

Agregação determinística (Decisão 70) — o que já existe em JSON entra por código, não à mão:
      --tasks <tasks.json>          monta o bloco backlog (árvore + totais) e os totais de backlog
                                    em meta.totais; sem --montar, só confere (META_TOTAIS_MATCH)
      --hld-json <arquivo>          saída de 'python3 ../tools/check-hld.py outputs/spec/hld.md --json'
                                    → tecnica.hld (os cinco arrays, como vieram)
      --estimate-calc <arquivo>     estimate-calc.json do forecast.mjs da spec-estimate →
                                    estimativa.forecast e estimativa.caminhoCritico (os números)
      --montar                      grava os blocos montados de volta no report-data.json antes de
                                    gerar o HTML (o texto que a IA escreveu fica como está)

O input é descoberto nesta ordem quando -i é omitido:
  outputs/spec/estimate-report/report-data.json
  outputs/spec/report-data.json
  outputs/report-data.json
  $PIPELINE_OUTPUTS_DIR/spec/estimate-report/report-data.json
  $PIPELINE_OUTPUTS_DIR/report-data.json`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP + "\n");
    return;
  }
  const cwd = process.cwd();

  const inputPath = args.input ? resolve(cwd, args.input) : firstExisting(candidateInputs(cwd));
  if (!inputPath) {
    process.stderr.write(
      "ERRO: report-data.json não encontrado. Passe -i <arquivo> ou gere-o em outputs/spec/estimate-report/report-data.json\n"
    );
    process.stderr.write("Procurei em:\n  " + candidateInputs(cwd).join("\n  ") + "\n");
    process.exit(1);
  }
  if (!existsSync(inputPath)) {
    process.stderr.write(`ERRO: input não existe: ${inputPath}\n`);
    process.exit(1);
  }

  const templatePath = args.template ? resolve(cwd, args.template) : DEFAULT_TEMPLATE;
  if (!existsSync(templatePath)) {
    process.stderr.write(
      `ERRO: template não encontrado: ${templatePath}\nAtualize o pacote de skills ou passe -t <arquivo>.\n`
    );
    process.exit(1);
  }

  let html;
  try {
    const lerJson = (p) => JSON.parse(readFileSync(resolve(cwd, p), "utf8"));
    const tasks = args.tasks ? lerJson(args.tasks) : null;
    if (args.montar && (tasks || args.hldJson || args.estimateCalc)) {
      const montado = montarReportData(JSON.parse(readFileSync(inputPath, "utf8")), {
        tasks, hld: args.hldJson ? lerJson(args.hldJson) : null, calc: args.estimateCalc ? lerJson(args.estimateCalc) : null,
      });
      writeFileSync(inputPath, JSON.stringify(montado, null, 2) + "\n", "utf8");
      process.stderr.write(`OK: blocos montados por código gravados em ${inputPath}\n`);
    }
    const { data, warnings } = loadReportData(inputPath);
    if (tasks) for (const w of conferirTotais(data, tasks)) process.stderr.write("AVISO: " + w + "\n");
    for (const w of warnings) process.stderr.write("AVISO: " + w + "\n");
    const template = readFileSync(templatePath, "utf8");
    html = buildHtml(template, data);
  } catch (e) {
    process.stderr.write("ERRO: " + e.message + "\n");
    process.exit(1);
  }

  if (args.stdout) {
    process.stdout.write(html);
    return;
  }
  const outPath = args.output ? resolve(cwd, args.output) : defaultOutputPath(cwd);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  process.stderr.write(`OK: relatório gerado em ${outPath} (${html.length} bytes)\n`);
  process.stdout.write(outPath + "\n");
}

main();
