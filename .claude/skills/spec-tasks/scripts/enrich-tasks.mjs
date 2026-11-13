#!/usr/bin/env node
/**
 * Preenche o NEGÓCIO dos níveis Epic / Feature / Story de um tasks.json existente.
 *
 * Duas garantias que a versão anterior não dava:
 *  1. ADITIVO por padrão — só preenche campo ausente/vazio; arrays são união. Rodar duas vezes
 *     é idempotente. Substituir conteúdo exige `--overwrite`, que imprime o diff do que será
 *     perdido ANTES de gravar. Antes disto, uma story com 4 critérios corretos saía com 1
 *     genérico, silenciosamente.
 *  2. ANCORADO na origem — com `--sources <dir>` (ou por descoberta automática ao lado do
 *     tasks.json), lê requirements.md / business-rules.md / modules.md / product-vision.md e
 *     grava `sourceRefs[]` em cada nível. Sem documentos de origem, NÃO sintetiza prosa de
 *     negócio: registra a lacuna em `metadata.enrichmentGaps[]`.
 *
 * Uso:
 *   node enrich-tasks.mjs --input <tasks.json> [--output <path>] [--sources <dir>]
 *                         [--azure-template <blueprint.json>] [--overwrite] [--dry-run]
 *
 * Exit codes:
 *   0 → enriquecido (com ou sem lacunas registradas)
 *   1 → PERDA DE CONTEÚDO detectada (ENRICHMENT_NO_CONTENT_LOSS) — nada é gravado
 *   2 → entrada não aplicável (arquivo inexistente / JSON ilegível)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { enrichDocument } from './lib/business-enrichment.mjs';
import { applyAzureTemplateToMetadata } from './lib/azure-template.mjs';
import { fixEncodingArtifacts } from './fix-encoding-artifacts.mjs';
import { collectContentSnapshot, diffContentLoss, formatLossDiff } from './lib/enrichment-guard.mjs';
import { loadSourceDocs, isEmptySourceIndex, summarizeSourceIndex } from './lib/source-docs.mjs';
import {
  loadTechnicalSources,
  summarizeTechnicalSources,
  enrichTaskContracts
} from './lib/technical-contracts.mjs';

function parseArgs(argv) {
  const args = { input: null, output: null, azureTemplate: null, sources: null, overwrite: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') args.input = argv[++i];
    else if (a === '--output' || a === '-o') args.output = argv[++i];
    else if (a === '--azure-template' || a === '-a') args.azureTemplate = argv[++i];
    else if (a === '--sources' || a === '-s') args.sources = argv[++i];
    else if (a.startsWith('--sources=')) args.sources = a.slice('--sources='.length);
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (!a.startsWith('-') && !args.input) args.input = a;
  }
  return args;
}

const args = parseArgs(process.argv);
const dir = process.env.PIPELINE_OUTPUTS_DIR;
const inputPath = resolve(args.input ?? (dir ? join(dir, 'tasks.json') : 'outputs/spec/tasks.json'));
const outputPath = resolve(args.output ?? inputPath);

let doc;
try {
  doc = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (e) {
  console.error(`ERRO: não foi possível ler/parsear ${inputPath}: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}

if (args.azureTemplate) {
  const template = JSON.parse(readFileSync(resolve(args.azureTemplate), 'utf8'));
  doc = applyAzureTemplateToMetadata(doc, template, resolve(args.azureTemplate));
}

/**
 * Documentos de origem: `--sources` explícito, senão o diretório do tasks.json e o pai
 * (`outputs/spec/tasks.json` → `outputs/spec/`). Descoberta automática nunca é FATAL: sem
 * documentos, o enriquecimento registra a lacuna em vez de sintetizar prosa.
 */
function sourceCandidates() {
  return [args.sources, process.env.PIPELINE_OUTPUTS_DIR, dirname(inputPath), dirname(dirname(inputPath))]
    .filter(Boolean)
    .map((p) => resolve(p));
}

function resolveSources() {
  for (const c of sourceCandidates()) {
    if (!existsSync(c)) continue;
    const idx = loadSourceDocs(c);
    if (!isEmptySourceIndex(idx)) return idx;
  }
  return null;
}

/**
 * Fontes TÉCNICAS (api-contracts.yaml / data-model.json) — separadas das de negócio porque
 * moram no mesmo diretório mas alimentam o nível TASK, não Epic/Feature/Story.
 */
function resolveTechnicalSources() {
  for (const c of sourceCandidates()) {
    if (!existsSync(c)) continue;
    const tech = loadTechnicalSources(c);
    if (tech) return tech;
  }
  return null;
}

const sources = resolveSources();
const technicalSources = resolveTechnicalSources();

// A normalização de encoding roda ANTES do snapshot-base: ela reescreve prosa legitimamente
// ("visivel" → "visível") e, comparada contra o texto não normalizado, aparecia como
// "narrative.context foi reescrito" em todo Epic/Feature — 38 falsos ENRICHMENT_NO_CONTENT_LOSS
// num artefato correto. O guard tem de comparar textos igualmente normalizados. É idempotente,
// por isso roda de novo no fim (limpa o que veio dos documentos de origem).
doc = fixEncodingArtifacts(doc);
const before = collectContentSnapshot(doc);

/** @type {{gaps?:any[], losses?:any[], changes?:any[]}} */
const report = {};
doc = enrichDocument(doc, { overwrite: args.overwrite, sources, report });

/**
 * Cobertura de CONTRATO TÉCNICO no nível task (apiContracts / persistenceModel).
 *
 * Roda DEPOIS de enrichDocument porque este grava `metadata.enrichmentGaps` a partir do próprio
 * contexto: as lacunas de contrato são anexadas ao mesmo array, para que "campo ausente" nunca
 * fique indistinguível de "esquecimento". Aditivo e nunca inventa contrato — ver
 * lib/technical-contracts.mjs.
 */
const contractGaps = [];
const contractChanges = [];
const contractCoverage = enrichTaskContracts(doc, {
  tech: technicalSources,
  gaps: contractGaps,
  changes: contractChanges
});
if (contractGaps.length) {
  doc.metadata = doc.metadata ?? {};
  doc.metadata.enrichmentGaps = [...(Array.isArray(doc.metadata.enrichmentGaps) ? doc.metadata.enrichmentGaps : []), ...contractGaps];
}
report.changes = [...(report.changes ?? []), ...contractChanges];
report.gaps = [...(report.gaps ?? []), ...contractGaps];

doc = fixEncodingArtifacts(doc);

// --overwrite: o diff do que será perdido vai para o stdout ANTES da gravação.
if (args.overwrite && report.losses?.length) {
  console.log(formatLossDiff(report.losses));
}

// Guard bloqueante: em modo aditivo nenhuma perda é aceitável.
const after = collectContentSnapshot(doc);
const losses = diffContentLoss(before, after);
const blocking = args.overwrite ? [] : losses;

if (blocking.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        validator: 'enrichment-guard',
        input: inputPath,
        written: false,
        errorCount: blocking.length,
        errors: blocking.slice(0, 40)
      },
      null,
      2
    )
  );
  process.exit(1);
}

if (!args.dryRun) writeFileSync(outputPath, JSON.stringify(doc, null, 2), 'utf8');

const gapsByScope = {};
for (const g of report.gaps ?? []) gapsByScope[g.field] = (gapsByScope[g.field] ?? 0) + 1;

console.log(
  JSON.stringify(
    {
      ok: true,
      input: inputPath,
      output: args.dryRun ? null : outputPath,
      dryRun: args.dryRun,
      mode: args.overwrite ? 'overwrite' : 'additive',
      schema: doc.metadata?.schemaVersion,
      epicsEnriched: doc.epics?.length ?? 0,
      featuresEnriched: doc.features?.length ?? 0,
      storiesEnriched: doc.stories?.length ?? 0,
      sources: summarizeSourceIndex(sources),
      technicalSources: summarizeTechnicalSources(technicalSources),
      contractCoverage,
      fieldsFilled: report.changes?.length ?? 0,
      fieldsOverwritten: report.losses?.length ?? 0,
      enrichmentGaps: report.gaps?.length ?? 0,
      gapsByField: Object.fromEntries(Object.entries(gapsByScope).sort((a, b) => b[1] - a[1])),
      gapsSample: (report.gaps ?? []).slice(0, 10)
    },
    null,
    2
  )
);
