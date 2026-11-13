#!/usr/bin/env node
// Harness Elo v2 — «mover não é apagar» (princípio P5 do plano de melhoria das skills, Onda 4).
//
// Quando um trecho sai do SKILL.md para `references/` (ou para o MAINTENANCE.md), nenhuma regra
// pode sumir no caminho. Este script tira uma BASE do SKILL.md antes da mudança e confere depois
// que cada átomo da base continua existindo em ALGUM arquivo da pasta da skill:
//
//   · código de validador — `NOME_EM_CAIXA_ALTA` com sublinhado (`SECURITY_UNMODIFIED`);
//   · ID — `SEC-001`, `RF-MOD-AUTH-01`, `TASK-014`, `RN-NOVO-003`;
//   · linha normativa — toda linha com FATAL, MUST ou NUNCA, comparada sem marcador de lista e com
//     os espaços normalizados (guardada como hash: a base fica pequena e não copia o texto do kit).
//
// E confere que todo arquivo de `references/` da skill é citado no SKILL.md numa linha que diz
// QUANDO lê-lo — reference que ninguém manda ler é regra que sumiu de outro jeito.
//
// Uso:
//   node .claude/ferramentas/preservacao.mjs --base <base.json> <skill>[+<pasta extra>] ...
//   node .claude/ferramentas/preservacao.mjs --conferir <base.json> [--json]
//   (pasta extra, relativa à raiz: `spec-product+.claude/skills/tools/vale-styles`)
//
// Exit codes: 0 tudo preservado · 1 átomo perdido ou reference sem citação · 2 base ilegível.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXTENSOES = ['.md', '.mdc', '.json', '.mjs', '.js', '.py', '.yaml', '.yml', '.html', '.txt'];
const RE_CODIGO = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
const RE_ID = /\b[A-Z][A-Z]{0,7}(?:-[A-Z0-9]{1,8})*-\d{2,4}\b/g;
const RE_NORMA = /\b(?:FATAL|MUST|NUNCA)\b/;
const RE_CONDICAO = /\b(?:quando|se|só|apenas|antes|ao|durante|depois)\b/i;

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
/** Linha normativa comparável: sem marcador de lista/citação/tabela nas pontas, espaços colapsados. */
export const normalizar = (linha) => linha.replace(/\s+/g, ' ').trim()
  .replace(/^(?:(?:[>*+-]|\d+\.)\s+)+/, '').replace(/^\|\s*|\s*\|$/g, '').trim();

/** Os três conjuntos de átomos de um texto. */
export function atomos(texto) {
  const t = texto.replace(/\r\n/g, '\n');
  const normas = new Set();
  for (const l of t.split('\n')) if (RE_NORMA.test(l)) normas.add(hash(normalizar(l)));
  return { codigos: new Set(t.match(RE_CODIGO) ?? []), ids: new Set(t.match(RE_ID) ?? []), normas };
}

function arquivosTexto(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...arquivosTexto(p));
    else if (EXTENSOES.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** União dos átomos de todos os arquivos de texto das pastas. */
export function atomosDasPastas(raiz, pastas) {
  const u = { codigos: new Set(), ids: new Set(), normas: new Set() };
  for (const p of pastas) {
    for (const arq of arquivosTexto(join(raiz, p))) {
      const a = atomos(readFileSync(arq, 'utf8'));
      for (const k of Object.keys(u)) for (const v of a[k]) u[k].add(v);
    }
  }
  return u;
}

/** Base de uma skill: os átomos do SKILL.md dela, e as pastas onde eles podem continuar. */
export function tirarBase(raiz, especificacoes) {
  const skills = {};
  for (const esp of especificacoes) {
    const [skill, ...extras] = esp.split('+');
    const a = atomos(readFileSync(join(raiz, '.claude', 'skills', skill, 'SKILL.md'), 'utf8'));
    skills[skill] = {
      pastas: [`.claude/skills/${skill}`, ...extras],
      codigos: [...a.codigos].sort(), ids: [...a.ids].sort(), normas: [...a.normas].sort(),
    };
  }
  return { skills };
}

/** O parágrafo (entre linhas em branco) que contém a linha `i` — a condição pode vir na linha de cima. */
function paragrafo(linhas, i) {
  let a = i; let b = i;
  while (a > 0 && linhas[a - 1].trim() !== '') a -= 1;
  while (b < linhas.length - 1 && linhas[b + 1].trim() !== '') b += 1;
  return linhas.slice(a, b + 1).join(' ');
}

/** Achados: átomo da base que sumiu da pasta, e reference que o SKILL.md não manda ler. */
export function conferir(raiz, base) {
  const achados = [];
  for (const [skill, b] of Object.entries(base.skills)) {
    const u = atomosDasPastas(raiz, b.pastas);
    for (const [k, rotulo] of [['codigos', 'código'], ['ids', 'ID'], ['normas', 'linha normativa']]) {
      for (const v of b[k]) if (!u[k].has(v)) achados.push({ skill, tipo: k, valor: v, mensagem: `${skill}: ${rotulo} ${v} sumiu da pasta da skill` });
    }
    const dirRef = join(raiz, '.claude', 'skills', skill, 'references');
    if (!existsSync(dirRef) || !statSync(dirRef).isDirectory()) continue;
    const linhas = readFileSync(join(raiz, '.claude', 'skills', skill, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n').split('\n');
    for (const arq of arquivosTexto(dirRef)) {
      const rel = relative(join(raiz, '.claude', 'skills', skill), arq).replace(/\\/g, '/');
      const citacoes = linhas.flatMap((l, i) => (l.includes(rel) ? [i] : []));
      if (!citacoes.length) achados.push({ skill, tipo: 'citacao', valor: rel, mensagem: `${skill}: ${rel} não é citado no SKILL.md` });
      else if (!citacoes.some((i) => RE_CONDICAO.test(paragrafo(linhas, i)))) achados.push({ skill, tipo: 'condicao', valor: rel, mensagem: `${skill}: nenhuma citação de ${rel} diz quando lê-lo` });
    }
  }
  return achados;
}

function main(argv) {
  const iRaiz = argv.indexOf('--raiz');
  const raiz = iRaiz >= 0 ? argv[iRaiz + 1] : RAIZ_PADRAO;
  const iBase = argv.indexOf('--base');
  if (iBase >= 0) {
    const saida = argv[iBase + 1];
    const especs = argv.filter((a, i) => !a.startsWith('--') && i !== iBase + 1 && i !== iRaiz + 1);
    const b = tirarBase(raiz, especs);
    writeFileSync(saida, `${JSON.stringify(b, null, 2)}\n`, 'utf8');
    process.stdout.write(`preservacao: base de ${especs.length} skill(s) gravada em ${saida}\n`);
    return 0;
  }
  const iConf = argv.indexOf('--conferir');
  let base;
  try {
    base = JSON.parse(readFileSync(argv[iConf + 1], 'utf8'));
    if (iConf < 0 || !base.skills) throw new Error('base sem "skills"');
  } catch (e) {
    process.stderr.write(`preservacao: base ilegível (${e.message})\nUso: node .claude/ferramentas/preservacao.mjs --conferir <base.json> [--json]\n`);
    return 2;
  }
  const achados = conferir(raiz, base);
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify({ achados }, null, 2)}\n`);
  else {
    process.stdout.write(`preservacao: ${Object.keys(base.skills).length} skill(s), ${achados.length} achado(s).\n`);
    for (const a of achados) process.stdout.write(`  ${a.mensagem}\n`);
  }
  return achados.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
