#!/usr/bin/env node
/**
 * verify-frontend-md-compliance.mjs — gate mecânico da skill spec-convert-prototype.
 *
 * Copiar este arquivo para `scripts/verify-frontend-md-compliance.mjs` na raiz da app
 * migrada (caminho referenciado nos scripts `verify:frontend-md` do `package.json`).
 *
 * O que faz:
 *   1. Extrai os títulos `## …` da rule de frontend — a lista de títulos da rule é a
 *      fonte de verdade: o artefato tem de ter exatamente os mesmos.
 *   2. Lê o artefato de verificação (outputs/spec/convert-prototype/frontend-md-verification.md):
 *      - proíbe a palavra "Parcial" (estado ambíguo que permite fechar com lacunas);
 *      - cada linha de tabela: coluna 1 = título (coincide com um `## …` da rule),
 *        coluna 2 = estado — Cumprido | N/A | Desvio no modo incremental.
 *   3. Compara os conjuntos de títulos: falta ou excesso → exit != 0 (um título extra
 *      no artefato pode esconder uma seção da rule que não foi avaliada).
 *   4. --strict-closure: exit != 0 se alguma seção não estiver Cumprido (proíbe N/A e
 *      Desvio) — usado via `verify:frontend-md:closure` no encerramento.
 *   5. Sucesso: mensagem explícita com contagem de seções conferidas.
 *   6. Auditoria opcional de src/: percorre .ts/.tsx e reporta `document.write(`,
 *      `fetch(` em .tsx e `style={{` em .tsx.
 *      --audit-src <dir>: lista sem falhar. --audit-src-fail <dir>: exit != 0.
 *
 * Uso:
 *   node scripts/verify-frontend-md-compliance.mjs \
 *     --frontend-mdc <path da rule> --verification <path do artefato> \
 *     [--audit-src <dir> | --audit-src-fail <dir>] [--strict-closure]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

function parseArgs(argv) {
  const args = { strictClosure: false, auditFail: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--frontend-mdc') args.frontendMdc = argv[++i];
    else if (a === '--verification') args.verification = argv[++i];
    else if (a === '--audit-src') args.auditSrc = argv[++i];
    else if (a === '--audit-src-fail') { args.auditSrc = argv[++i]; args.auditFail = true; }
    else if (a === '--strict-closure') args.strictClosure = true;
    else { console.error(`Parâmetro desconhecido: ${a}`); process.exit(2); }
  }
  if (!args.frontendMdc || !args.verification) {
    console.error('Uso: --frontend-mdc <path> --verification <path> [--audit-src <dir>] [--audit-src-fail <dir>] [--strict-closure]');
    process.exit(2);
  }
  return args;
}

const args = parseArgs(process.argv);
let failures = 0;
const fail = (msg) => { console.error(`FALHA: ${msg}`); failures += 1; };
// Normaliza título para comparação: ignora backticks/negrito, preserva o texto.
const norm = (s) => s.replace(/[`*]/g, '').trim();

// 1) Títulos ## da rule — fonte de verdade.
const ruleText = readFileSync(args.frontendMdc, 'utf8');
const ruleTitles = [...ruleText.matchAll(/^## (.+)$/gm)].map((m) => norm(m[1]));
if (ruleTitles.length === 0) fail(`Nenhum título "## …" encontrado em ${args.frontendMdc}`);

// 2) Artefato de verificação.
const verifText = readFileSync(args.verification, 'utf8');
if (/\bParcial\b/i.test(verifText)) {
  fail('Estado "Parcial" é proibido no artefato — resolver cada linha para Cumprido, N/A ou Desvio.');
}

const rows = new Map(); // título normalizado → estado
for (const line of verifText.split('\n')) {
  const m = line.match(/^\s*\|([^|]+)\|([^|]+)\|/);
  if (!m) continue;
  const title = norm(m[1]);
  const state = norm(m[2]);
  if (!title || /^[-: ]+$/.test(title)) continue; // linha separadora da tabela
  if (/^(Seç[aã]o|T[íi]tulo)$/i.test(title) || /^Estado$/i.test(state)) continue; // cabeçalho
  rows.set(title, state);
}

// 3) Conjuntos de títulos: falta ou excesso → falha.
for (const t of ruleTitles) {
  if (!rows.has(t)) fail(`Seção da rule sem linha no artefato: "${t}"`);
}
for (const t of rows.keys()) {
  if (!ruleTitles.includes(t)) fail(`Linha no artefato sem seção correspondente na rule: "${t}"`);
}

// 4) Estados permitidos (incremental vs --strict-closure).
const allowed = args.strictClosure ? ['Cumprido'] : ['Cumprido', 'N/A', 'Desvio'];
for (const [title, state] of rows) {
  if (!allowed.some((s) => state.startsWith(s))) {
    fail(`Seção "${title}" com estado "${state}" — permitido: ${allowed.join(' | ')}.`);
  }
}

// 5) Auditoria opcional de src/ (.ts/.tsx).
if (args.auditSrc) {
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.next' || name.startsWith('.git')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      const ext = extname(p);
      if (ext !== '.ts' && ext !== '.tsx') continue;
      const src = readFileSync(p, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (line.includes('document.write(')) hits.push(`${p}:${i + 1} — document.write(`);
        if (ext === '.tsx' && /\bfetch\(/.test(line)) hits.push(`${p}:${i + 1} — fetch( em .tsx`);
        if (ext === '.tsx' && line.includes('style={{')) hits.push(`${p}:${i + 1} — style={{ em .tsx`);
      });
    }
  };
  walk(args.auditSrc);
  if (hits.length > 0) {
    console.log(`Auditoria de src: ${hits.length} ocorrência(s):`);
    for (const h of hits) console.log(`  ${h}`);
    if (args.auditFail) fail(`Auditoria de src reprovou com ${hits.length} ocorrência(s) (--audit-src-fail).`);
  } else {
    console.log('Auditoria de src: nenhuma ocorrência.');
  }
}

if (failures > 0) {
  console.error(`\nverify-frontend-md-compliance: ${failures} falha(s).`);
  process.exit(1);
}
console.log(
  `verify-frontend-md-compliance OK — ${ruleTitles.length} seções conferidas` +
  `${args.strictClosure ? ' (encerramento estrito: só Cumprido)' : ''}.`,
);
