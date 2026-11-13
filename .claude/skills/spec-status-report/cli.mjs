#!/usr/bin/env node
// cli.mjs — spec-status-report (Fase 13): relatório de status/conclusão para o cliente.
//
// Coleta (fase → negócio → técnico → código → TESTES EXECUTADOS + COBERTURA → backlog),
// grava outputs/spec/status/status-data.json e renderiza um HTML autocontido.
//
// Exit codes:
//   0  sucesso — relatório gerado (testes falhando NÃO alteram este código)
//   1  erro fatal — sem outputs/spec, input ilegível, saída não gravável, renderer abortou
//   2  degradação — relatório gerado, mas um ou mais coletores ficaram indisponíveis
//   3  --check falhou (modo verificação, nada é gerado)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildStatusData, refreshCurated, refreshExtras } from "./lib/build-status-data.mjs";
import { collectAzure, DEFAULT_BUG_TYPES } from "./lib/collect-azure.mjs";
import { exportTarget, renderTestGapsMarkdown } from "./lib/lacunas-teste-md.mjs";
import { collectCode } from "./lib/collect-code.mjs";
import { collectDocs } from "./lib/collect-docs.mjs";
import { detectPhase, STAGES } from "./lib/detect-phase.mjs";
import { describeScope, resolveScope } from "./lib/resolve-scope.mjs";
import { loadDotenv } from "./lib/load-dotenv.mjs";
import { renderStatusHtml, RENDERER_VERSION } from "./lib/render-status-html.mjs";
import { attributeCasesToFiles, runTests } from "./lib/run-tests.mjs";
import { dirExists, readJson, relPosix, writeJson } from "./lib/util.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = {
    root: null, outputs: null, phase: "auto", mode: "status",
    output: null, input: null,
    collectOnly: false, renderOnly: false, check: false,
    noTests: false, skipE2E: false, coverage: true, testTimeoutS: null, onlyRunners: null, onlyKinds: null,
    noAzure: false, azureSnapshot: null, azureArea: null, azureIteration: null,
    azureWiql: null, azureProject: null, azureMax: null, bugTypes: null,
    exportTestGapsMd: false,
    noCode: false, sinceRef: null,
    // Escopo declarado — cada um aceita várias pastas (repetir a flag ou separar por vírgula).
    docsDirs: [], codeDirs: [], testDirs: [], extraDirs: [],
    projectName: null, client: null, author: null, period: null, title: null,
    noConfidential: false, json: false, help: false, quiet: false,
  };
  const next = (i) => argv[i + 1];
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    switch (t) {
      case "--root": a.root = next(i); i++; break;
      case "--outputs": a.outputs = next(i); i++; break;
      case "--phase": a.phase = next(i); i++; break;
      case "--mode": a.mode = next(i); i++; break;
      case "--output": case "-o": a.output = next(i); i++; break;
      case "--input": case "-i": a.input = next(i); i++; break;
      case "--collect-only": a.collectOnly = true; break;
      case "--render-only": a.renderOnly = true; break;
      case "--check": a.check = true; break;
      case "--no-tests": a.noTests = true; break;
      case "--skip-e2e": a.skipE2E = true; break;
      case "--coverage": a.coverage = true; break;
      case "--no-coverage": a.coverage = false; break;
      case "--only-kinds": a.onlyKinds = String(next(i) || "").split(",").map((x) => x.trim()).filter(Boolean); i++; break;
      case "--tests-timeout": a.testTimeoutS = Number(next(i)); i++; break;
      case "--only-runners": a.onlyRunners = String(next(i) || "").split(",").map((s) => s.trim()).filter(Boolean); i++; break;
      case "--no-azure": a.noAzure = true; break;
      case "--azure-snapshot": a.azureSnapshot = next(i); i++; break;
      case "--azure-area": a.azureArea = next(i); i++; break;
      case "--azure-iteration": a.azureIteration = next(i); i++; break;
      case "--azure-wiql": a.azureWiql = next(i); i++; break;
      case "--azure-project": case "--project": case "-p": a.azureProject = next(i); i++; break;
      case "--azure-max": a.azureMax = Number(next(i)); i++; break;
      case "--bug-types": a.bugTypes = String(next(i) || "").split(",").map((s) => s.trim()).filter(Boolean); i++; break;
      case "--export-test-gaps-md": a.exportTestGapsMd = true; break;
      case "--docs": case "--doc": a.docsDirs.push(next(i)); i++; break;
      case "--code": case "--src": a.codeDirs.push(next(i)); i++; break;
      case "--tests": case "--test": a.testDirs.push(next(i)); i++; break;
      case "--extra": case "--other": a.extraDirs.push(next(i)); i++; break;
      case "--no-code": a.noCode = true; break;
      case "--since-ref": a.sinceRef = next(i); i++; break;
      case "--project-name": a.projectName = next(i); i++; break;
      case "--client": a.client = next(i); i++; break;
      case "--author": a.author = next(i); i++; break;
      case "--period": a.period = next(i); i++; break;
      case "--title": a.title = next(i); i++; break;
      case "--no-confidential": a.noConfidential = true; break;
      case "--json": a.json = true; break;
      case "--quiet": case "-q": a.quiet = true; break;
      case "--help": case "-h": a.help = true; break;
      default:
        if (t.startsWith("-")) {
          process.stderr.write(`AVISO: flag desconhecida ignorada: ${t}\n`);
        }
    }
  }
  return a;
}

function help() {
  process.stdout.write(`spec-status-report — relatório de status/conclusão para o cliente (Eng_Proc, Fase 13)

Uso:
  node cli.mjs [opções]

Escopo da coleta — QUAIS PASTAS medir (cada flag aceita VÁRIAS pastas)
  --docs <p[,p2]>         pastas de documentação (além de --outputs)
  --code <p[,p2]>         pastas de código de produção
  --tests <p[,p2]>        pastas com as suítes de teste
  --extra <p[,p2]>        outras pastas a incluir na varredura
      Repetir a flag ou separar por vírgula. Aceita rótulo: --code api=../repo-api
      As pastas podem estar FORA de --root (entrega multi-repositório).
      Sem nenhuma delas, varre a raiz inteira e o relatório declara o escopo presumido.

Escopo e fase
  --root <dir>            raiz do repositório do projeto (default: cwd)
  --outputs <dir>         pasta de artefatos (default: outputs/spec, ou $PIPELINE_OUTPUTS_DIR/spec)
  --phase <fase>          força a fase: ${STAGES.join(" | ")} (default: auto — detecta pelos artefatos)
  --mode <status|conclusao>  tom/título do relatório (default: status)

Identificação (aparecem na capa)
  --project-name <nome>   nome do projeto (default: extraído de product-vision.md)
  --client <nome>         nome do cliente
  --author <nome>         responsável pela entrega
  --period <texto>        período coberto (ex.: "Sprint 12 · 01–14/08/2026")
  --title <texto>         título completo do relatório (sobrepõe o default)
  --no-confidential       remove o aviso de confidencialidade do rodapé

Testes (executados de verdade)
  --no-tests              não executa nada; usa apenas relatórios de cobertura existentes
  --skip-e2e              executa unitários/integração e pula funcionais/E2E
  --only-runners <lista>  executa apenas estes frameworks (ex.: vitest,playwright,pytest)
  --only-kinds <lista>    executa só estas naturezas (unitario,integracao,funcional,contrato,performance)
  --no-coverage           não mede cobertura (por padrão a cobertura É medida)
  --tests-timeout <seg>   timeout por framework (default 900)

Gestão do projeto (backlog)
  --project <nome>        projeto no tracker (sobrepõe AZURE_DEVOPS_PROJECT)
  --azure-area <path>     filtra por Area Path
  --azure-iteration <p>   filtra por Iteration Path
  --azure-wiql <arquivo>  usa uma consulta WIQL própria
  --azure-snapshot <p>    usa um snapshot JSON (rota MCP) em vez da consulta direta
  --azure-max <n>         limite de itens de trabalho (default 2000)
  --bug-types <lista>     tipos de item tratados como bug (default: ${DEFAULT_BUG_TYPES.join(",")}; ex.: "Bug,Defeito")
  --no-azure              não consulta o tracker

Código
  --no-code               pula o inventário de código
  --since-ref <ref>       métricas de git a partir desta ref (ex.: v1.0, main~50)

Execução
  --collect-only          grava status-data.json e sai (não renderiza)
  --render-only           renderiza a partir de status-data.json existente, relendo do disco
                          todos os artefatos de extensão (sem re-executar testes) e
                          regravando a releitura no status-data.json padrão do projeto
  --input <arquivo>       status-data.json de entrada (implica --render-only); este arquivo
                          é só lido — a releitura dos extras vai para o HTML, não para ele
  --export-test-gaps-md   grava também testes-a-criar-<data>.md (a aba «O que falta testar»
                          em Markdown) na pasta do HTML
  --output, -o <arquivo>  HTML de saída (default: <outputs>/status/status-report.html)
  --check                 verifica pré-requisitos e sai (exit 3 se algo faltar)
  --json                  imprime resumo JSON no stdout
  -q, --quiet             menos ruído no stdout

Exit codes: 0 ok · 1 fatal · 2 relatório gerado com coletores indisponíveis · 3 --check falhou
`);
}

/**
 * Pasta de LEITURA dos artefatos — pode ser um layout de versão anterior.
 */
function resolveReadDir(root, explicit) {
  if (explicit) return isAbsolute(explicit) ? explicit : resolve(root, explicit);
  const env = process.env.PIPELINE_OUTPUTS_DIR;
  if (env) return isAbsolute(env) ? join(env, "spec") : resolve(root, env, "spec");
  const primary = resolve(root, "outputs", "spec");
  if (dirExists(primary)) return primary;
  const legacy = resolve(root, "task-generator", "outputs");
  if (dirExists(legacy)) return legacy;
  const flat = resolve(root, "outputs");
  if (dirExists(flat)) return flat;
  return primary;
}

/**
 * Pasta de ESCRITA — sempre o layout atual.
 *
 * Ler de um layout antigo é compatibilidade; ESCREVER nele seria perpetuá-lo. A regra do
 * kit (references/paths.md) é explícita: consumidores aceitam o layout legado, produtores
 * sempre gravam em `outputs/spec/`. Sem esta separação, o relatório caía dentro de
 * `task-generator/outputs/`, a pasta que o próprio kit declara descontinuada.
 */
function resolveWriteDir(root, explicit) {
  if (explicit) return isAbsolute(explicit) ? explicit : resolve(root, explicit);
  const env = process.env.PIPELINE_OUTPUTS_DIR;
  if (env) return isAbsolute(env) ? join(env, "spec") : resolve(root, env, "spec");
  return resolve(root, "outputs", "spec");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { help(); return 0; }

  const root = resolve(args.root || process.cwd());
  const outputsDir = resolveReadDir(root, args.outputs);      // leitura (aceita layout antigo)
  const writeDir = resolveWriteDir(root, args.outputs);        // escrita (sempre layout atual)
  if (outputsDir !== writeDir) {
    process.stderr.write(`⚠️ LEGACY_LAYOUT: artefatos lidos de ${relPosix(root, outputsDir)}; saídas gravadas em ${relPosix(root, writeDir)} (layout atual).\n`);
  }
  const log = (msg) => { if (!args.quiet) process.stdout.write(`${msg}\n`); };
  const warn = (msg) => process.stderr.write(`${msg}\n`);
  const collectorWarnings = [];

  loadDotenv(root);

  const outPath = args.output
    ? (isAbsolute(args.output) ? args.output : resolve(root, args.output))
    : join(writeDir, "status", "status-report.html");
  const dataPath = join(writeDir, "status", "status-data.json");

  // ——— modo --check ———
  if (args.check) {
    const problems = [];
    if (!dirExists(outputsDir)) problems.push(`pasta de artefatos não encontrada: ${relPosix(root, outputsDir)}`);
    const phase = dirExists(outputsDir) ? detectPhase(root, outputsDir, { override: "auto" }) : null;
    if (phase && !phase.signals.length) problems.push("nenhum artefato do pipeline encontrado — nada a relatar");
    process.stdout.write(`${JSON.stringify({
      ok: problems.length === 0,
      root, outputs: relPosix(root, outputsDir),
      phase: phase ? { stage: phase.stage, label: phase.label, signals: phase.signals.length } : null,
      output: relPosix(root, outPath),
      readDir: relPosix(root, outputsDir),
      writeDir: relPosix(root, writeDir),
      problems,
    }, null, 2)}\n`);
    return problems.length ? 3 : 0;
  }

  // ——— render-only ———
  if (args.renderOnly || args.input) {
    const inputPath = args.input
      ? (isAbsolute(args.input) ? args.input : resolve(root, args.input))
      : dataPath;
    const data = readJson(inputPath);
    if (data === null) { warn(`ERRO: status-data.json não encontrado em ${relPosix(root, inputPath)}. Rode a coleta primeiro (sem --render-only).`); return 1; }
    if (data === undefined) { warn(`ERRO: status-data.json ilegível em ${relPosix(root, inputPath)}.`); return 1; }

    // Tudo o que é escrito DEPOIS da coleta é relido do disco: a narrativa curada e todos
    // os artefatos de extensão (camada editorial, triagem das falhas, análise do que falta
    // testar, mapa de módulo dos bugs…). Ler meia dúzia de JSON custa milissegundos; os
    // coletores caros — testes, tracker, código — não são re-executados.
    const refreshed = refreshCurated(root, writeDir, data, outputsDir);
    if (refreshed.changed) {
      log(refreshed.curated.present
        ? `Leitura executiva curada carregada de ${refreshed.curated.path}`
        : "Leitura executiva curada ausente/stub — usando o panorama automático");
    }
    const extras = refreshExtras(root, writeDir, data, outputsDir, { bugTypes: args.bugTypes });
    log(extras.found.length
      ? `Artefatos de extensão relidos do disco: ${extras.found.map((f) => `${f.name} (${f.rel})`).join(", ")}`
      : "Artefatos de extensão relidos do disco: nenhum presente");
    if (extras.missing.length) log(`Artefatos de extensão ausentes: ${extras.missing.join(", ")}`);
    for (const n of extras.notes) log(`Compatibilidade: ${n}`);
    for (const w of (data.warnings || []).filter((x) => /^(TEST_GAPS|BUG_|EXTRA_ARTIFACT|REPORT_CONTENT)/.test(x.code))) warn(`⚠️ ${w.code}: ${w.message}`);
    // A releitura só é gravada de volta no status-data.json PADRÃO do projeto. Um --input
    // explícito pode ser o arquivo de outra pessoa, de outra geração ou de um anexo — o
    // render-only o lê e não o altera; o HTML sai com a releitura do mesmo jeito.
    if (inputPath === dataPath) writeJson(inputPath, data);

    const html = safeRender(data, warn);
    if (!html) return 1;
    writeOut(outPath, html);
    log(`OK: relatório gerado em ${relPosix(root, outPath)} (render-only, dados de ${relPosix(root, inputPath)})`);
    if (args.exportTestGapsMd) exportTestGapsMd(data, outPath, root, log, warn);
    if (args.json) process.stdout.write(`${JSON.stringify(summaryOf(data, outPath, root), null, 2)}\n`);
    return 0;
  }

  // ——— coleta ———
  if (!dirExists(outputsDir)) {
    warn(`ERRO: pasta de artefatos não encontrada: ${relPosix(root, outputsDir)}\n`
      + "Este relatório compila o que o pipeline spec-* produziu. Rode ao menos o discovery (skill spec) antes,\n"
      + "ou aponte a pasta correta com --outputs.");
    return 1;
  }

  let phase;
  try {
    phase = detectPhase(root, outputsDir, { override: args.phase });
  } catch (e) {
    warn(`ERRO: ${e.message}`);
    return 1;
  }
  log(`Fase: ${phase.label}${phase.overridden ? ` (forçada; detecção automática: ${phase.detected})` : ""} — ${phase.signals.length} sinal(is)`);

  // Escopo declarado pelo usuário. Sem declaração, a raiz inteira — e o relatório diz
  // que o escopo foi presumido, para ninguém ler "varri tudo que existe" onde houve
  // "varri o que estava por perto".
  const scope = resolveScope(root, {
    docs: args.docsDirs, code: args.codeDirs, tests: args.testDirs, extra: args.extraDirs,
  });
  collectorWarnings.push(...scope.warnings);
  log(`Escopo: ${describeScope(scope)}`);
  if (!scope.declared) {
    collectorWarnings.push({
      code: "SCOPE_PRESUMED",
      message: "Nenhuma pasta declarada (--docs/--code/--tests/--extra): a varredura usou a raiz inteira. Em entrega multi-repositório ou monorepo, declare as pastas para o relatório medir só o que é deste projeto.",
    });
  }

  log("Coletando documentação de negócio e técnica…");
  const docs = collectDocs(root, outputsDir, { docRoots: scope.docRoots });

  let code = null;
  if (args.noCode) {
    collectorWarnings.push({ code: "CODE_SKIPPED", message: "Inventário de código desativado por --no-code." });
  } else {
    log("Inventariando código e rastreabilidade…");
    code = collectCode(root, { docs, sinceRef: args.sinceRef, roots: scope.codeRoots, maxFiles: Number(process.env.STATUS_REPORT_MAX_CODE_FILES) || 20_000 });
  }

  log(args.noTests ? "Testes: execução desativada (--no-tests)" : "Executando as suítes de teste (isto pode levar alguns minutos)…");
  const tests = runTests(root, writeDir, {
    roots: scope.testRoots,
    skipAll: args.noTests,
    skipE2E: args.skipE2E,
    coverage: args.coverage,
    onlyRunners: args.onlyRunners,
    onlyKinds: args.onlyKinds,
    timeoutMs: (args.testTimeoutS || Number(process.env.STATUS_REPORT_TEST_TIMEOUT_S) || 900) * 1000,
  });
  if (tests.totals?.total) {
    log(`Testes: ${tests.totals.total} casos — ${tests.totals.passed} ok, ${tests.totals.failed} falhas, ${tests.totals.skipped} ignorados`);
  }
  for (const w of tests.warnings || []) warn(`⚠️ ${w.code}: ${w.message}`);

  // Reatribui o arquivo de origem aos casos cujo runner não o reportou — depende dos dois
  // coletores, por isso acontece aqui e não dentro de runTests.
  const testsResolved = attributeCasesToFiles(tests, code);
  if (testsResolved.reattributedCases) {
    log(`Testes: ${testsResolved.reattributedCases} caso(s) tiveram o arquivo de origem recuperado pelo nome`);
  }

  log("Consultando a ferramenta de gestão do projeto…");
  const azure = await collectAzure(root, outputsDir, {
    writeDir,
    disabled: args.noAzure,
    snapshotPath: args.azureSnapshot ? (isAbsolute(args.azureSnapshot) ? args.azureSnapshot : resolve(root, args.azureSnapshot)) : null,
    areaPath: args.azureArea,
    iterationPath: args.azureIteration,
    wiqlFile: args.azureWiql ? (isAbsolute(args.azureWiql) ? args.azureWiql : resolve(root, args.azureWiql)) : null,
    project: args.azureProject,
    maxItems: args.azureMax || 2000,
    bugTypes: args.bugTypes || DEFAULT_BUG_TYPES,
  });
  if (azure.available) log(`Gestão do projeto: ${azure.items.length} itens de trabalho (${azure.mode})`);
  for (const w of azure.warnings || []) warn(`⚠️ ${w.code}: ${w.message}`);
  if (azure.requestSpec && !args.quiet) {
    process.stdout.write(`\nFallback MCP — para completar o domínio Azure DevOps:\n`
      + `  1. Buscar os work items via MCP do Azure DevOps${azure.requestSpec.project ? ` (projeto ${azure.requestSpec.project})` : ""}.\n`
      + `  2. Gravar em ${azure.requestSpec.snapshotTarget} no formato de ${azure.requestSpec.format}.\n`
      + `  3. Re-rodar: node cli.mjs --render-only  (ou a coleta completa; o snapshot é detectado automaticamente)\n\n`);
  }

  const data = buildStatusData({
    root, outputsDir, writeDir, phase, docs, code: code || emptyCode(), tests: testsResolved, azure, scope,
    warnings: collectorWarnings,
    options: {
      mode: args.mode === "conclusao" ? "conclusao" : "status",
      title: args.title, projectName: args.projectName, client: args.client,
      author: args.author, period: args.period, confidential: !args.noConfidential,
      bugTypes: args.bugTypes,
    },
  });
  if (data.bugs) log(`Bugs: ${data.bugs.total} (${data.bugs.open} abertos) em ${data.bugs.modules.filter((m) => !m.none && m.total).length} módulo(s); ${data.bugs.attribution.nenhuma} sem módulo identificado`);
  if (data.testGaps && data.testGaps.available) log(`O que falta testar: ${data.testGaps.totals.withoutTest} item(ns) sem teste${data.testGaps.curated ? `, ${data.testGaps.curated.analyzed} com análise curada` : " (sem análise curada)"}`);
  for (const w of [...((data.testGaps && data.testGaps.warnings) || []), ...((data.bugs && data.bugs.warnings) || [])]) warn(`⚠️ ${w.code}: ${w.message}`);

  for (const w of stubWarnings(data)) {
    data.warnings.push(w);
    warn(`⚠️ ${w.code}: ${w.message}`);
  }

  writeJson(dataPath, data);
  log(`Dados: ${relPosix(root, dataPath)}`);

  if (args.collectOnly) {
    log("--collect-only: renderização não executada.");
    if (args.json) process.stdout.write(`${JSON.stringify(summaryOf(data, outPath, root), null, 2)}\n`);
    return degradationCode(data);
  }

  const html = safeRender(data, warn);
  if (!html) return 1;
  writeOut(outPath, html);
  log(`OK: relatório gerado em ${relPosix(root, outPath)} (${(html.length / 1024).toFixed(0)} KB, v${RENDERER_VERSION})`);
  if (args.exportTestGapsMd) exportTestGapsMd(data, outPath, root, log, warn);

  if (args.json) process.stdout.write(`${JSON.stringify(summaryOf(data, outPath, root), null, 2)}\n`);
  return degradationCode(data);
}

/**
 * `testes-a-criar-<data>.md` ao lado do HTML. Sem a aba (sem matriz medida) não há o que
 * exportar, e o CLI diz isso em vez de gravar um documento vazio. Arquivo com o mesmo nome
 * escrito à mão não é sobrescrito: o export vai para `-cli.md` ao lado.
 */
function exportTestGapsMd(data, outPath, root, log, warn) {
  const md = renderTestGapsMarkdown(data.testGaps, { projectName: data.report && data.report.projectName, generatedAt: data.generatedAt });
  if (!md) {
    warn(`⚠️ TEST_GAPS_EXPORT_SKIPPED: --export-test-gaps-md pedido, mas não há a aba «O que falta testar» nesta geração${data.testGaps && data.testGaps.reason ? ` (${data.testGaps.reason})` : " (sem matriz de rastreabilidade)"} — nada foi gravado.`);
    return;
  }
  const target = exportTarget(dirname(outPath));
  writeOut(target.path, md);
  if (target.diverted) warn(`⚠️ ${relPosix(root, target.kept)} já existe e não foi gerado pelo CLI — mantido; o export foi gravado em ${relPosix(root, target.path)}.`);
  log(`Testes a criar: ${relPosix(root, target.path)}${target.replaced ? " (substituído)" : ""}`);
}

function safeRender(data, warn) {
  try {
    const html = renderStatusHtml(data, { themePath: join(HERE, "lib", "report-theme.css") });
    assertNoPlaceholder(html);
    return html;
  } catch (e) {
    warn(`ERRO ao renderizar o HTML: ${e && e.message}`);
    return null;
  }
}

/**
 * Rede de segurança: HTML sem domínios ou com marcador residual é bug, não entrega.
 *
 * A lista de marcadores é EXPLÍCITA de propósito. Um padrão genérico como `__[A-Z_]+__`
 * casaria com código legítimo do cliente citado na matriz de rastreabilidade (um snippet
 * com `__CONFIG__`, por exemplo) e mataria o build por conteúdo válido.
 */
const PLACEHOLDER_TOKENS = [
  "<!-- DOMAINS-PLACEHOLDER -->", "<!-- EXEC-SUMMARY-PLACEHOLDER -->",
  "__DEFAULT_DOMAIN__", "__PROJECT_NAME__", "__GENERATED_AT__", "__REPORT_TITLE__",
];

/** Tokens de stub que são de ARTEFATO, não do renderer: viram aviso, nunca fatal. */
const ARTIFACT_STUB_TOKENS = ["[Nome do Projeto]", "[Definir nome em"];

function assertNoPlaceholder(html) {
  if (!/data-domain=/.test(html)) throw new Error("HTML gerado sem nenhum domínio (data-domain ausente)");
  const marker = PLACEHOLDER_TOKENS.find((t) => html.includes(t));
  if (marker) throw new Error(`placeholder não substituído no HTML: ${marker}`);
  if (html.length < 4000) throw new Error(`HTML suspeito de estar vazio (${html.length} bytes)`);
}

/**
 * Stub de artefato do cliente é AVISO, não erro fatal.
 *
 * Os capítulos são renderizados na íntegra, então um `product-vision.md` com
 * `| Projeto | [Nome do Projeto] |` (texto que o próprio template do pipeline produz)
 * colocava esse token no HTML e abortava o relatório inteiro — culpando o renderer por
 * conteúdo que é do artefato. O que precisa ser verificado é o título/capa gerados por nós,
 * não cada linha de documento incorporado.
 */
function stubWarnings(data) {
  const out = [];
  const generated = `${data.report?.title || ""} ${data.report?.projectName || ""}`;
  const inGenerated = ARTIFACT_STUB_TOKENS.find((t) => generated.includes(t));
  if (inGenerated) {
    out.push({ code: "PROJECT_NAME_STUB", message: `Nome do projeto ainda é um marcador de template (${inGenerated}) — passe --project-name ou preencha o título em product-vision.md.` });
  } else if (data.report?.projectName === "Projeto sem nome definido") {
    out.push({ code: "PROJECT_NAME_UNRESOLVED", message: "Nome do projeto não encontrado em product-vision.md — usando “Projeto sem nome definido”. Passe --project-name para a capa." });
  }
  const haystack = [...(data.business?.chapters || []), ...(data.technical?.chapters || [])]
    .map((c) => c.markdown || "").join("\n");
  const inChapters = ARTIFACT_STUB_TOKENS.filter((t) => haystack.includes(t));
  if (inChapters.length) {
    out.push({ code: "ARTIFACT_STUB_CONTENT", message: `Algum artefato de negócio ainda contém marcador de template (${inChapters.join(", ")}) e foi incorporado ao relatório como está — corrija na skill de origem antes de entregar ao cliente.` });
  }
  return out;
}

function writeOut(path, html) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html, "utf8");
}

function degradationCode(data) {
  const degraded = (data.warnings || []).some((w) => [
    "AZURE_CREDENTIALS_ABSENT", "AZURE_REQUEST_FAILED", "AZURE_SNAPSHOT_INVALID",
    "RUNNER_FAILED", "RUNNER_UNAVAILABLE", "REPORT_UNPARSED", "TESTS_SKIPPED",
    "NO_RUNNER_DETECTED", "CODE_SKIPPED", "E2E_SKIPPED",
  ].includes(w.code));
  return degraded ? 2 : 0;
}

function summaryOf(data, outPath, root) {
  return {
    output: relPosix(root, outPath),
    phase: data.phase.stage,
    health: data.health.level,
    domains: data.domains.map((d) => d.id),
    tests: data.tests?.totals || null,
    azure: data.azure?.summary || null,
    traceability: data.traceMatrix ? { total: data.traceMatrix.total, implementedPct: data.traceMatrix.implementedPct } : null,
    testGaps: data.testGaps && data.testGaps.available ? { withoutTest: data.testGaps.totals.withoutTest, analyzed: data.testGaps.curated ? data.testGaps.curated.analyzed : 0, projectedPct: data.testGaps.projection ? data.testGaps.projection.projected : null } : null,
    bugs: data.bugs ? { total: data.bugs.total, open: data.bugs.open, attribution: data.bugs.attribution } : null,
    warnings: (data.warnings || []).map((w) => w.code),
  };
}

function emptyCode() {
  return {
    inventory: {
      fileCount: 0, codeFileCount: 0, testFileCount: 0, totalLines: 0, codeLines: 0,
      commentLines: 0, blankLines: 0, testLines: 0, byLanguage: [], byTopDir: [],
      largestFiles: [], truncated: false, testRatio: null,
    },
    traceability: { byId: [], coverage: {}, orphans: [], titles: {}, totalIds: 0 },
    todos: { total: 0, byKind: [], items: [] },
    git: null,
    decisions: { adrs: [], specStories: [] },
    modulesOnDisk: { base: null, entries: [] },
  };
}

main().then((code) => process.exit(code)).catch((e) => {
  process.stderr.write(`ERRO inesperado: ${e && e.stack ? e.stack : e}\n`);
  process.exit(1);
});
