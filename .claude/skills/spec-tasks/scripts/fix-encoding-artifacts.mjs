#!/usr/bin/env node
/**
 * Corrige mojibake comum (UTF-8 mal decodificado) em tasks.json.
 *
 * SEGURO POR DESIGN:
 * - As correções são aplicadas APENAS a valores de campos de prosa
 *   (description, summary, narrative, title, ...), nunca a identificadores,
 *   paths, URLs ou chaves. Isto evita corromper coisas como
 *   `/consulta-publica` ou IDs.
 * - Não há substituição cega de U+FFFD (o caractere de substituição é apenas
 *   reportado, não "chutado" para um travessão).
 * - Sem léxico específico de projeto — apenas mojibake determinístico e
 *   acentuação genérica de PT-BR.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Substituições determinísticas de mojibake UTF-8 (byte-a-byte, sem ambiguidade).
const MOJIBAKE = [
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
  ['Ã£', 'ã'], ['Ãµ', 'õ'], ['Ã§', 'ç'],
  ['Ã€', 'À'], ['Ã‰', 'É'], ['Ã“', 'Ó'], ['Ãš', 'Ú'],
  ['Ãƒ', 'Ã'], ['Ã•', 'Õ'], ['Ã‡', 'Ç'],
  ['â€™', "'"], ['â€œ', '"'], ['â€', '"'],
  ['Â·', '·'], ['Â ', ' ']
];

// Correções de acentuação genéricas de PT-BR, seguras em prosa.
// NÃO inclui palavras ambíguas com URLs/identificadores (ex.: "publica"/"publico")
// nem léxico específico de projeto.
const WORD_FIXES = [
  [/\bInformacoes\b/g, 'Informações'],
  [/\bIntervencao\b/g, 'Intervenção'],
  [/\bintervencao\b/g, 'intervenção'],
  [/\bautenticacao\b/g, 'autenticação'],
  [/\bAutenticacao\b/g, 'Autenticação'],
  [/\bobrigatoria\b/g, 'obrigatória'],
  [/\bobrigatorio\b/g, 'obrigatório'],
  [/\bautorizacao\b/g, 'autorização'],
  [/\bautorizacoes\b/g, 'autorizações'],
  [/\bvalidacao\b/g, 'validação'],
  [/\bValidacao\b/g, 'Validação'],
  [/\boperacao\b/g, 'operação'],
  [/\bOperacao\b/g, 'Operação'],
  [/\bexclusao\b/g, 'exclusão'],
  [/\bparametros\b/g, 'parâmetros'],
  [/\bpre-condicoes\b/g, 'pré-condições'],
  [/\bdominio\b/g, 'domínio'],
  [/\bdependencias\b/g, 'dependências'],
  [/\bdescricao\b/g, 'descrição'],
  [/\breducao\b/g, 'redução'],
  [/\bligacoes\b/g, 'ligações'],
  [/\bvisivel\b/g, 'visível'],
  [/\bvisiveis\b/g, 'visíveis'],
  [/\bHistorias\b/g, 'Histórias'],
  [/\bhistoria\b/g, 'história'],
  [/\bHistorico\b/g, 'Histórico'],
  [/\btecnico\b/g, 'técnico'],
  [/\bTecnico\b/g, 'Técnico'],
  [/\brelatorio\b/g, 'relatório'],
  [/\bRelatorio\b/g, 'Relatório'],
  [/\bdisponiveis\b/g, 'disponíveis'],
  [/\baplicavel\b/g, 'aplicável']
];

// Chaves cujos valores são prosa legível por humanos e podem receber correção.
const PROSE_KEYS = new Set([
  'description',
  'summary',
  'narrative',
  'title',
  'name',
  'label',
  'rationale',
  'businessValue',
  'goal',
  'outcome',
  'note',
  'notes',
  'acceptanceCriteria',
  'context',
  'objective',
  'reason',
  'justification'
]);

function fixString(text) {
  let t = String(text);
  for (const [bad, good] of MOJIBAKE) {
    t = t.split(bad).join(good);
  }
  for (const [re, rep] of WORD_FIXES) {
    t = t.replace(re, rep);
  }
  return t;
}

/**
 * Percorre o documento e corrige apenas strings sob chaves de prosa.
 * @param {unknown} node
 * @param {boolean} inProse - true quando descendente de uma chave de prosa (ex.: array de critérios).
 */
function fixNode(node, inProse) {
  if (typeof node === 'string') {
    return inProse ? fixString(node) : node;
  }
  if (Array.isArray(node)) {
    return node.map((item) => fixNode(item, inProse));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = fixNode(v, PROSE_KEYS.has(k));
    }
    return out;
  }
  return node;
}

/**
 * Corrige mojibake em campos de prosa de um documento tasks.json já parseado.
 * @param {object} doc
 * @returns {object} novo documento com prosa corrigida
 */
export function fixEncodingArtifacts(doc) {
  return fixNode(doc, false);
}

if (process.argv[1]?.includes('fix-encoding-artifacts')) {
  const jsonPath = resolve(process.argv[2] ?? 'outputs/spec/tasks.json');
  const raw = readFileSync(jsonPath, 'utf8');
  const before = (raw.match(/�/g) || []).length;
  const doc = JSON.parse(raw);
  const fixed = fixEncodingArtifacts(doc);
  const out = JSON.stringify(fixed, null, 2);
  const after = (out.match(/�/g) || []).length;
  writeFileSync(jsonPath, out, 'utf8');
  console.log(
    JSON.stringify(
      { ok: true, path: jsonPath, fffdBefore: before, fffdAfter: after },
      null,
      2
    )
  );
}
