#!/usr/bin/env node
/**
 * validate-data-model.mjs — Gate DATAMODEL_VALID (spec-data-model, Fase 7a)
 *
 * Valida um data-model.json contra templates/data-model.schema.json (JSON Schema draft-07).
 *
 * A validação de schema tem TRÊS rotas, tentadas nesta ordem (política de
 * ../../tools/references/tool-bootstrap.md — verificar → rota efêmera → degradar):
 *
 *   1. ajv VENDORIZADO/LOCAL  → validação COMPLETA (exit 0/1)
 *      procura ajv em: spec-tasks/templates/node_modules (vendor do kit, reproduzível
 *      com `npm ci` naquele diretório — ver spec-tasks/templates/package.json),
 *      depois no node_modules do projeto (cwd) e no node_modules desta skill.
 *   2. ROTA EFÊMERA npx       → validação COMPLETA (exit 0/1)
 *      `npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate …`
 *      não instala nada no ambiente (cache do npm); pulável com --no-npx / SPEC_KIT_NO_NPX=1.
 *   3. VALIDADOR REDUZIDO embutido (zero dependência) → validação REDUZIDA (exit 2/1)
 *      subconjunto do draft-07 em JS puro: type, required, properties, items (forma de
 *      schema único E forma de TUPLA — `items: [A, B]` valida posição a posição), enum,
 *      const, format (date-time/date/time/email/uri/uuid), additionalProperties,
 *      min/maxLength, pattern, minimum/maximum, min/maxItems, uniqueItems. Keywords não
 *      suportadas (oneOf/allOf/$ref/`additionalItems`/…) são REPORTADAS como não
 *      verificadas — nenhuma keyword desta lista é ignorada em silêncio. O mesmo vale
 *      para um `format` FORA dos seis acima (ipv4/hostname/duration/…): entra na nota
 *      como `format:"<nome>"`, porque `format` estar em SUPPORTED_KEYWORDS não significa
 *      que todo valor dele seja verificado.
 *      `date`/`date-time`/`time` seguem o algoritmo do ajv-formats modo "full" (o default
 *      do `addFormats` da rota 1), não `Date.parse` — ver `isDate`/`isTime`/`isDateTime`.
 *
 * As 2 checagens semânticas próprias rodam SEMPRE, em qualquer rota:
 *   (i)  todo relacionamento (`relationships[].targetEntity`) referencia uma entidade
 *        existente no modelo (entidades legadas devem entrar como EXISTING_REF);
 *   (ii) nomes de entidade são únicos em todo o modelo (cross bounded contexts).
 *
 * Uso:
 *   node validate-data-model.mjs [caminho/do/data-model.json] [caminho/do/schema.json]
 *
 * Defaults (na ordem):
 *   data-model : outputs/spec/data-model.json → outputs/data-model.json (relativo ao cwd)
 *   schema     : ../templates/data-model.schema.json (relativo a este script)
 *
 * Exit codes:
 *   0 = VÁLIDO em validação completa (ajv) — gate DATAMODEL_VALID cumprido
 *   1 = INVÁLIDO (erros de schema/semântica, em qualquer rota) ou erro de uso
 *       (arquivo inexistente, JSON malformado). NUNCA por ferramenta ausente.
 *   2 = VÁLIDO em validação REDUZIDA (ajv indisponível) — gate rebaixado a WARNING,
 *       registrar `TOOL_UNAVAILABLE:ajv (validação reduzida)` no sync-log. NÃO aborta a fase.
 */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// ajv vendorizado na skill irmã spec-tasks (ajv v8 — valida draft-07 por padrão).
// O node_modules é gitignored; o manifesto versionado que o reproduz é
// spec-tasks/templates/package.json + package-lock.json (`npm ci` naquele diretório).
const VENDOR_ANCHOR = path.join(SCRIPT_DIR, '..', '..', 'spec-tasks', 'templates', 'noop.js');
const VENDOR_DIR = path.dirname(VENDOR_ANCHOR);
const DEFAULT_SCHEMA = path.join(SCRIPT_DIR, '..', 'templates', 'data-model.schema.json');
const DEFAULT_DATA_CANDIDATES = [
  path.join('outputs', 'spec', 'data-model.json'),
  path.join('outputs', 'data-model.json'),
];
const NPX_TIMEOUT_DEFAULT_S = 120;

function printHelp() {
  console.log(`validate-data-model.mjs — valida data-model.json (gate DATAMODEL_VALID)

Uso:
  node validate-data-model.mjs [data-model.json] [schema.json]

Argumentos (posicionais, ambos opcionais):
  1º  caminho do data-model.json
      default: outputs/spec/data-model.json, depois outputs/data-model.json
  2º  caminho do JSON Schema
      default: <skill>/templates/data-model.schema.json

Opções:
  --no-npx             não tentar a rota efêmera (npx ajv-cli) quando o ajv faltar;
                       cair direto no validador reduzido embutido. Equivale a
                       SPEC_KIT_NO_NPX=1 no ambiente (use em máquina offline).
  --npx-timeout=<seg>  timeout da rota efêmera (default ${NPX_TIMEOUT_DEFAULT_S}s)
  -h, --help           mostra esta ajuda

Rotas de validação (nesta ordem): ajv vendorizado/local → npx ajv-cli (efêmero) →
validador estrutural reduzido embutido (zero dependência).

Para restaurar a validação COMPLETA offline, reproduza o vendor:
  npm ci --prefix <kit>/skills/spec-tasks/templates

Exit codes:
  0  válido (validação completa via ajv)
  1  inválido (erros de schema/semântica) ou erro de uso (arquivo/JSON)
  2  válido em validação REDUZIDA (ajv ausente) — gate rebaixado a WARNING;
     registrar TOOL_UNAVAILABLE:ajv (validação reduzida) no sync-log`);
}

function fail(msg) {
  // exit 1 aqui é sempre erro de USO (arquivo/JSON), nunca ferramenta ausente:
  // ausência de dependência degrada para a rota reduzida e jamais aborta a fase.
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (e) {
    fail(`não foi possível ler ${label} em "${filePath}": ${e.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${label} ("${filePath}") não é JSON válido: ${e.message}`);
  }
}

// ---------- resolução de argumentos ----------
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}
const positional = args.filter((a) => !a.startsWith('-'));
const noNpx = args.includes('--no-npx') || process.env.SPEC_KIT_NO_NPX === '1';
const npxTimeoutArg = args.find((a) => a.startsWith('--npx-timeout='));
const npxTimeoutS = npxTimeoutArg
  ? Number(npxTimeoutArg.split('=')[1]) || NPX_TIMEOUT_DEFAULT_S
  : NPX_TIMEOUT_DEFAULT_S;

let dataPath = positional[0];
if (!dataPath) {
  dataPath = DEFAULT_DATA_CANDIDATES.find((p) => existsSync(p));
  if (!dataPath) {
    fail(
      `nenhum data-model.json encontrado nos defaults (${DEFAULT_DATA_CANDIDATES.join(
        ' → '
      )}). Informe o caminho como 1º argumento. Use --help para ajuda.`
    );
  }
}
const schemaPath = positional[1] || DEFAULT_SCHEMA;

// ---------- rota 1: ajv vendorizado / local ----------
function loadAjv() {
  const anchors = [
    { label: 'vendor spec-tasks/templates/node_modules', anchor: VENDOR_ANCHOR },
    { label: 'node_modules do projeto (cwd)', anchor: path.join(process.cwd(), 'noop.js') },
    { label: 'node_modules desta skill', anchor: path.join(SCRIPT_DIR, 'noop.js') },
  ];
  for (const { label, anchor } of anchors) {
    try {
      const req = createRequire(anchor);
      const ajvMod = req('ajv');
      const Ajv = ajvMod.default ?? ajvMod;
      let addFormats = null;
      try {
        const fmtMod = req('ajv-formats');
        addFormats = fmtMod.default ?? fmtMod;
      } catch {
        addFormats = null; // ajv-formats ausente: formatos não são validados
      }
      return { Ajv, addFormats, source: label };
    } catch {
      /* tenta o próximo âncora */
    }
  }
  return null;
}

function validateWithAjv({ Ajv, addFormats }, model, schema) {
  const ajv = new Ajv({
    allErrors: true,
    strict: false, // o schema usa keywords informativas (ex.: "example")
    validateFormats: Boolean(addFormats),
  });
  if (addFormats) addFormats(ajv);

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (e) {
    fail(`falha ao compilar o schema "${schemaPath}": ${e.message}`);
  }

  const errors = [];
  if (!validate(model)) {
    for (const err of validate.errors ?? []) {
      const where = err.instancePath || '(raiz)';
      const extra =
        err.keyword === 'enum' && err.params?.allowedValues
          ? ` — valores permitidos: ${err.params.allowedValues.join(', ')}`
          : '';
      errors.push(`[schema] ${where}: ${err.message}${extra}`);
    }
  }
  return { errors, formatsChecked: Boolean(addFormats) };
}

// ---------- rota 2: efêmera (npx ajv-cli) ----------
function validateWithNpx() {
  const isWin = process.platform === 'win32';
  const bin = isWin ? 'npx.cmd' : 'npx';
  const rawArgs = [
    '--yes',
    '--package=ajv-cli@5',
    '--package=ajv-formats@2',
    '--',
    'ajv',
    'validate',
    '-s',
    schemaPath,
    '-d',
    dataPath,
    '--spec=draft7',
    '--strict=false',
    '-c',
    'ajv-formats',
    '--all-errors',
    '--errors=text',
  ];
  // Em Windows, .cmd exige shell (Node >= 18.20/20.12) → citar argumentos com espaço.
  const quoted = rawArgs.map((a) => (isWin && /[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));

  let r;
  try {
    r = spawnSync(bin, isWin ? quoted : rawArgs, {
      encoding: 'utf8',
      timeout: npxTimeoutS * 1000,
      shell: isWin,
    });
  } catch (e) {
    return { ok: false, reason: `falha ao invocar npx (${e.message})` };
  }
  if (r.error) return { ok: false, reason: `npx indisponível (${r.error.code || r.error.message})` };
  if (r.signal === 'SIGTERM') return { ok: false, reason: `timeout de ${npxTimeoutS}s na rota efêmera` };

  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const lines = out.split(/\r?\n/);
  const base = path.basename(dataPath);
  const invalidIdx = lines.findIndex((l) => /\binvalid\b/.test(l) && l.includes(base));
  const validIdx = lines.findIndex((l) => /\bvalid\b/.test(l) && !/\binvalid\b/.test(l) && l.includes(base));

  if (invalidIdx >= 0) {
    const errs = lines
      .slice(invalidIdx + 1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('npm '))
      // ajv-cli --errors=text junta os erros numa linha só ("… , data/x must …")
      .flatMap((l) => l.split(/,\s+(?=data\b)/))
      .map((l) => `[schema] ${l.trim()}`);
    return {
      ok: true,
      errors: errs.length ? errs : ['[schema] modelo inválido (ajv-cli não detalhou os erros)'],
    };
  }
  if (validIdx >= 0 || r.status === 0) return { ok: true, errors: [] };

  const why = (r.stderr || r.stdout || '').split(/\r?\n/).filter(Boolean).slice(-1)[0] || `exit ${r.status}`;
  return { ok: false, reason: `rota efêmera não concluiu (${why.slice(0, 160)})` };
}

// ---------- rota 3: validador estrutural reduzido (zero dependência) ----------
const ANNOTATION_KEYWORDS = new Set([
  '$schema', '$id', 'id', 'title', 'description', 'default', 'example', 'examples',
  '$comment', 'comment', 'deprecated', 'readOnly', 'writeOnly',
]);
const SUPPORTED_KEYWORDS = new Set([
  'type', 'required', 'properties', 'items', 'enum', 'const', 'format', 'additionalProperties',
  'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
  'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties',
]);
// --- formatos de data/hora: espelho do ajv-formats modo "full" (RFC 3339) ----
// `Date.parse` NÃO serve como validador de calendário e produzia os dois erros:
//   • FALSO VERDE — o V8 faz rollover, então "2026-02-31T09:30:00Z", "2026-04-31T…"
//     e "2025-02-29T…" eram aceitos aqui e reprovados pelo ajv;
//   • FALSO VERMELHO — o ajv aceita espaço como separador (`/t|\s/i`) e offsets
//     `+HH`/`+HHMM`; a regex antiga exigia `T` e `+HH:MM`, reprovando "2026-01-15
//     09:30:00Z" (modelo válido → exit 1 FATAL).
// A validação de calendário é a tabela de dias do mês + regra bissexta da RFC 3339
// (a mesma do ajv): rejeita 31/02, 31/04 e 29/02 em ano não bissexto por construção,
// sem depender de nenhuma normalização do `Date`.
const DATE_RE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const TIME_RE = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
const DATE_TIME_SEPARATOR = /t|\s/i;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isDate(str) {
  const m = DATE_RE.exec(str);
  if (!m) return false;
  const year = +m[1];
  const month = +m[2];
  const day = +m[3];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month])
  );
}

function isTime(str, strictTimeZone) {
  const m = TIME_RE.exec(str);
  if (!m) return false;
  const hr = +m[1];
  const min = +m[2];
  const sec = +m[3];
  const tz = m[4];
  const tzSign = m[5] === '-' ? -1 : 1;
  const tzH = +(m[6] || 0);
  const tzM = +(m[7] || 0);
  if (tzH > 23 || tzM > 59 || (strictTimeZone && !tz)) return false;
  if (hr <= 23 && min <= 59 && sec < 60) return true;
  // segundo bissexto (23:59:60 no fuso UTC correspondente) — mesma regra do ajv.
  const utcMin = min - tzM * tzSign;
  const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
  return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
}

function isDateTime(str) {
  const parts = str.split(DATE_TIME_SEPARATOR);
  return parts.length === 2 && isDate(parts[0]) && isTime(parts[1], true);
}

const FORMAT_CHECKS = {
  'date-time': isDateTime,
  date: isDate,
  time: (v) => isTime(v, true),
  email: (v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v),
  uri: (v) => /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/.test(v),
  uuid: (v) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v),
};

function jsonTypeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v; // string | boolean | object
}

function typeMatches(expected, actual) {
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return expected === actual;
}

function validateReduced(schema, data, ptr, errors, unsupported) {
  if (schema === true || schema === undefined) return;
  if (schema === false) {
    errors.push(`[schema-reduzido] ${ptr || '(raiz)'}: nenhum valor é permitido aqui`);
    return;
  }
  if (typeof schema !== 'object') return;

  for (const kw of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(kw) && !ANNOTATION_KEYWORDS.has(kw)) unsupported.add(kw);
  }
  // `format` está em SUPPORTED_KEYWORDS, mas só os 6 formatos de FORMAT_CHECKS são de
  // facto verificados. Sem esta linha, `format: "ipv4"` com "999.999.999.999" saía com
  // exit 2 e ZERO avisos — ajv reprova (exit 1), o reduzido aprova em silêncio. É a
  // mesma classe do `items` em tupla: aqui não se verifica, então REPORTA-SE.
  // Reportar (e não implementar às pressas ipv4/hostname/duration/…) é a opção segura:
  // regex de formato mal calibrada trocaria falso verde por falso vermelho FATAL.
  if (typeof schema.format === 'string' && !FORMAT_CHECKS[schema.format]) {
    unsupported.add(`format:"${schema.format}"`);
  }

  const where = ptr || '(raiz)';
  const base = ptr; // prefixo para filhos ('' na raiz)
  const actual = jsonTypeOf(data);

  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => typeMatches(t, actual))) {
      errors.push(`[schema-reduzido] ${where}: must be ${expected.join(' | ')} (recebido: ${actual})`);
      return; // tipo errado: checagens dependentes não fazem sentido
    }
  }

  if (schema.enum !== undefined) {
    const ok = schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(data));
    if (!ok) {
      errors.push(
        `[schema-reduzido] ${where}: must be equal to one of the allowed values — valores permitidos: ${schema.enum
          .map((v) => String(v))
          .join(', ')}`
      );
    }
  }
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(data)) {
    errors.push(`[schema-reduzido] ${where}: must be equal to constant ${JSON.stringify(schema.const)}`);
  }

  if (actual === 'string') {
    // Formato fora de FORMAT_CHECKS não cai aqui: já foi REPORTADO como não verificado
    // no laço de keywords acima (nunca ignorado em silêncio).
    if (schema.format && FORMAT_CHECKS[schema.format] && !FORMAT_CHECKS[schema.format](data)) {
      errors.push(`[schema-reduzido] ${where}: must match format "${schema.format}"`);
    }
    if (typeof schema.minLength === 'number' && data.length < schema.minLength) {
      errors.push(`[schema-reduzido] ${where}: must NOT have fewer than ${schema.minLength} characters`);
    }
    if (typeof schema.maxLength === 'number' && data.length > schema.maxLength) {
      errors.push(`[schema-reduzido] ${where}: must NOT have more than ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`[schema-reduzido] ${where}: must match pattern "${schema.pattern}"`);
    }
  }

  if (actual === 'number' || actual === 'integer') {
    if (typeof schema.minimum === 'number' && data < schema.minimum) {
      errors.push(`[schema-reduzido] ${where}: must be >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && data > schema.maximum) {
      errors.push(`[schema-reduzido] ${where}: must be <= ${schema.maximum}`);
    }
    if (typeof schema.exclusiveMinimum === 'number' && data <= schema.exclusiveMinimum) {
      errors.push(`[schema-reduzido] ${where}: must be > ${schema.exclusiveMinimum}`);
    }
    if (typeof schema.exclusiveMaximum === 'number' && data >= schema.exclusiveMaximum) {
      errors.push(`[schema-reduzido] ${where}: must be < ${schema.exclusiveMaximum}`);
    }
  }

  if (actual === 'array') {
    if (typeof schema.minItems === 'number' && data.length < schema.minItems) {
      errors.push(`[schema-reduzido] ${where}: must NOT have fewer than ${schema.minItems} items`);
    }
    if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) {
      errors.push(`[schema-reduzido] ${where}: must NOT have more than ${schema.maxItems} items`);
    }
    if (schema.uniqueItems === true) {
      const seen = new Set();
      data.forEach((it, i) => {
        const k = JSON.stringify(it);
        if (seen.has(k)) errors.push(`[schema-reduzido] ${base}/${i}: must NOT have duplicate items`);
        seen.add(k);
      });
    }
    if (Array.isArray(schema.items)) {
      // Forma de TUPLA do draft-07 (`items: [A, B]`): cada posição tem seu schema.
      // Antes o `!Array.isArray(...)` descartava esse caso em SILÊNCIO e, como `items`
      // está em SUPPORTED_KEYWORDS, ele também não entrava na nota de keywords não
      // verificadas — falso verde exatamente contra o que a docstring promete.
      // O excedente (`data.length > items.length`) é governado por `additionalItems`,
      // que NÃO está em SUPPORTED_KEYWORDS e por isso é REPORTADO como não verificado.
      schema.items.forEach((sub, i) => {
        if (i < data.length) validateReduced(sub, data[i], `${base}/${i}`, errors, unsupported);
      });
    } else if (schema.items !== undefined) {
      data.forEach((it, i) => validateReduced(schema.items, it, `${base}/${i}`, errors, unsupported));
    }
  }

  if (actual === 'object') {
    for (const req of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(data, req)) {
        errors.push(`[schema-reduzido] ${where}: must have required property '${req}'`);
      }
    }
    const props = schema.properties ?? {};
    for (const [k, v] of Object.entries(data)) {
      if (Object.prototype.hasOwnProperty.call(props, k)) {
        validateReduced(props[k], v, `${base}/${k}`, errors, unsupported);
      } else if (schema.additionalProperties === false) {
        errors.push(`[schema-reduzido] ${where}: must NOT have additional properties ('${k}')`);
      } else if (typeof schema.additionalProperties === 'object') {
        validateReduced(schema.additionalProperties, v, `${base}/${k}`, errors, unsupported);
      }
    }
    const nProps = Object.keys(data).length;
    if (typeof schema.minProperties === 'number' && nProps < schema.minProperties) {
      errors.push(`[schema-reduzido] ${where}: must NOT have fewer than ${schema.minProperties} properties`);
    }
    if (typeof schema.maxProperties === 'number' && nProps > schema.maxProperties) {
      errors.push(`[schema-reduzido] ${where}: must NOT have more than ${schema.maxProperties} properties`);
    }
  }
}

// ---------- execução ----------
const model = readJson(dataPath, 'data-model');
const schema = readJson(schemaPath, 'schema');

let mode = null; // 'completa (…)' | 'REDUZIDA (…)'
let schemaErrors = [];
const notes = []; // linhas informativas do relatório
let syncLogLine = null; // linha sugerida para o sync-log
const reducedUnsupported = new Set();

const ajvLoaded = loadAjv();
if (ajvLoaded) {
  const res = validateWithAjv(ajvLoaded, model, schema);
  schemaErrors = res.errors;
  mode = `completa (ajv — ${ajvLoaded.source})`;
  if (!res.formatsChecked) notes.push('ajv-formats indisponível — keywords "format" não foram validadas');
} else {
  const npxResult = noNpx
    ? { ok: false, reason: 'rota efêmera desabilitada (--no-npx / SPEC_KIT_NO_NPX=1)' }
    : validateWithNpx();
  if (npxResult.ok) {
    schemaErrors = npxResult.errors;
    mode = 'completa (npx ajv-cli — rota efêmera)';
    syncLogLine = 'TOOL_EPHEMERAL:ajv (npx ajv-cli)';
    notes.push('ajv vendorizado ausente — validação feita pela rota efêmera npx (nada instalado no ambiente)');
  } else {
    validateReduced(schema, model, '', schemaErrors, reducedUnsupported);
    mode = 'REDUZIDA (validador embutido — sem ajv)';
    syncLogLine = 'TOOL_UNAVAILABLE:ajv (validação reduzida)';
    notes.push(`ajv indisponível: ${npxResult.reason}`);
    notes.push(
      'validação REDUZIDA: subconjunto do draft-07 (type, required, properties, items, enum, const, ' +
        'format, additionalProperties, tamanhos/limites). `format` cobre apenas ' +
        `${Object.keys(FORMAT_CHECKS).join(', ')} — os demais são listados abaixo. ` +
        'Para restaurar a validação completa: `npm ci --prefix <kit>/skills/spec-tasks/templates`'
    );
    if (reducedUnsupported.size > 0) {
      notes.push(`keywords do schema NÃO verificadas nesta rota: ${[...reducedUnsupported].sort().join(', ')}`);
    }
  }
}

// ---------- checagens semânticas (sempre, em qualquer rota) ----------
const semanticErrors = [];
const contexts = Array.isArray(model.boundedContexts) ? model.boundedContexts : [];
const entityIndex = new Map(); // nome → instancePath da 1ª ocorrência

contexts.forEach((bc, i) => {
  const entities = Array.isArray(bc?.entities) ? bc.entities : [];
  entities.forEach((entity, j) => {
    const p = `/boundedContexts/${i}/entities/${j}`;
    const name = entity?.name;
    if (typeof name !== 'string' || name.length === 0) return; // schema já reporta
    if (entityIndex.has(name)) {
      semanticErrors.push(
        `[semântica] ${p}: nome de entidade duplicado "${name}" (primeira ocorrência em ${entityIndex.get(name)}) — nomes de entidade devem ser únicos no modelo`
      );
    } else {
      entityIndex.set(name, p);
    }
  });
});

contexts.forEach((bc, i) => {
  const entities = Array.isArray(bc?.entities) ? bc.entities : [];
  entities.forEach((entity, j) => {
    const rels = Array.isArray(entity?.relationships) ? entity.relationships : [];
    rels.forEach((rel, k) => {
      const p = `/boundedContexts/${i}/entities/${j}/relationships/${k}`;
      const target = rel?.targetEntity;
      if (typeof target !== 'string' || target.length === 0) {
        semanticErrors.push(`[semântica] ${p}: relacionamento sem targetEntity definido`);
        return;
      }
      if (!entityIndex.has(target)) {
        semanticErrors.push(
          `[semântica] ${p}: targetEntity "${target}" não corresponde a nenhuma entidade do modelo — ` +
            `se for entidade legada, declare-a com operationType EXISTING_REF`
        );
      }
    });
  });
});

// ---------- avisos de placeholder (stub não preenchido) — não bloqueiam ----------
const warnings = [];
const STUB_PROJECT_NAME = 'NOME-DO-PROJETO';
const STUB_GENERATED_AT = '2026-01-15T09:30:00Z'; // valor de exemplo em templates/data-model.stub.json
if (model.projectName === STUB_PROJECT_NAME) {
  warnings.push(
    '/projectName ainda contém o placeholder do stub ("NOME-DO-PROJETO") — substitua pelo nome real do projeto'
  );
}
if (model.generatedAt === STUB_GENERATED_AT) {
  warnings.push(
    '/generatedAt ainda contém a data de exemplo do stub — substitua pelo timestamp ISO-8601 UTC real da geração'
  );
}

// ---------- relatório ----------
const errors = [...schemaErrors, ...semanticErrors];

console.log(`data-model : ${dataPath}`);
console.log(`schema     : ${schemaPath}`);
console.log(`validação  : ${mode}`);
for (const n of notes) console.log(`aviso      : ${n}`);
for (const w of warnings) console.log(`atenção    : ${w}`);
if (syncLogLine) console.log(`sync-log   : registrar \`${syncLogLine}\``);

if (errors.length > 0) {
  console.error(`\nDATAMODEL_VALID: FALHOU — ${errors.length} erro(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (mode.startsWith('REDUZIDA')) {
  console.log(
    '\nDATAMODEL_VALID: OK (VALIDAÇÃO REDUZIDA) — nenhum erro no subconjunto verificado, ' +
      'relacionamentos íntegros e nomes de entidade únicos.'
  );
  console.log(
    'Gate rebaixado de FATAL para WARNING (ajv ausente): registrar ' +
      '`TOOL_UNAVAILABLE:ajv (validação reduzida)` no sync-log e marcar o artefato como validado ' +
      'parcialmente. A fase NÃO é abortada.'
  );
  process.exit(2);
}

console.log('\nDATAMODEL_VALID: OK — schema válido, relacionamentos íntegros, nomes de entidade únicos.');
process.exit(0);
