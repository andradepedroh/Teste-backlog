#!/usr/bin/env node
// cli.mjs — wrapper Node do gerador de HTML da spec-estimate (Fase 8.5).
// A IA NÃO escreve HTML manualmente: grava outputs/spec/estimate/estimate-data.json e roda este CLI.
//
// Uso:
//   node cli.mjs                         # lê estimate-data.json e grava estimate-report.html (default)
//   node cli.mjs -i <data.json> -o <out.html>
//   node cli.mjs --stdout                # imprime o HTML no stdout
//
// Fallback de input: outputs/spec/estimate/estimate-data.json → outputs/spec/estimate-data.json
//                     → outputs/estimate-data.json → $PIPELINE_OUTPUTS_DIR/spec/estimate/estimate-data.json

import { accessSync, constants, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { renderEstimateHtml } from "./lib/render-estimate-html.mjs";

function defaultOutputPath() {
  const envDir = process.env.PIPELINE_OUTPUTS_DIR;
  if (envDir) return join(envDir, "spec", "estimate", "estimate-report.html");
  return resolve(process.cwd(), "outputs", "spec", "estimate", "estimate-report.html");
}

function candidateInputs() {
  const cwd = process.cwd();
  const envDir = process.env.PIPELINE_OUTPUTS_DIR;
  return [
    resolve(cwd, "outputs", "spec", "estimate", "estimate-data.json"),
    resolve(cwd, "outputs", "spec", "estimate-data.json"),
    resolve(cwd, "outputs", "estimate-data.json"),
    envDir ? join(envDir, "spec", "estimate", "estimate-data.json") : null,
    envDir ? join(envDir, "estimate-data.json") : null,
  ].filter(Boolean);
}

function firstExisting(paths) {
  for (const p of paths) {
    try { accessSync(p, constants.R_OK); return p; } catch { /* next */ }
  }
  return null;
}

function parseArgs(argv) {
  let input = null, output = null, stdout = false, help = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdout" || a === "-s") stdout = true;
    else if (a === "--input" || a === "-i") input = argv[++i];
    else if (a === "--output" || a === "-o") output = argv[++i];
    else if (a === "--help" || a === "-h") help = true;
    else if (!a.startsWith("-") && input === null) input = a;
    else if (!a.startsWith("-") && output === null && !stdout) output = a;
  }
  return { input, output, stdout, help };
}

function printHelp() {
  process.stdout.write(`spec-estimate — gerador de estimate-report.html\n\n` +
    `Uso: node cli.mjs [-i estimate-data.json] [-o estimate-report.html] [--stdout]\n` +
    `Sem argumentos: procura estimate-data.json em outputs/spec/estimate/ e grava estimate-report.html ao lado.\n`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return; }

  const inputPath = args.input ? resolve(args.input) : firstExisting(candidateInputs());
  if (!inputPath) {
    process.stderr.write("ERRO: estimate-data.json não encontrado. Gere-o em outputs/spec/estimate/ antes de rodar o CLI.\n");
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (e) {
    process.stderr.write(`ERRO ao ler/parsear ${inputPath}: ${e.message}\n`);
    process.exit(1);
  }

  const html = renderEstimateHtml(data);

  if (args.stdout) { process.stdout.write(html); return; }

  const outPath = args.output ? resolve(args.output) : defaultOutputPath();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  process.stdout.write(`OK: estimate-report.html gerado em ${outPath}\n`);
}

main();
