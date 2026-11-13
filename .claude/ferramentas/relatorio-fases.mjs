#!/usr/bin/env node
// Harness Elo v2 — relatório de numeração de fases das skills (plano de melhoria das skills, Onda 2).
//
// O kit de 29/09 renumerou as fases só em parte dos arquivos: a mesma skill aparece com dois ou
// três números entre arquivos, e às vezes dentro do mesmo. A tabela canônica é a §1 de
// `.claude/skills/tools/references/task-pipeline.md`. Corrigir tudo à mão seria a maior superfície
// de bifurcação possível (quase 29 SKILL.md) — então este script só MOSTRA a divergência, para o
// time Eng_Proc corrigir na origem. Ele NUNCA falha por divergência (modo relatório, exit 0);
// exit 2 só quando não consegue ler a tabela canônica.
//
// Uso:
//   node .claude/ferramentas/relatorio-fases.mjs [--json] [--raiz <dir>]
//
// O que conta como citação de fase de uma skill, na mesma linha:
//   · «`spec-x` (Fase N…)», «spec-x — Fase N», «Fase N (`spec-x`)»: o nome mais próximo do número;
//   · linha de tabela «| `spec-x` | N | …» (as tabelas «Skills irmãs»);
//   · o `description` do frontmatter «spec-x (Fase N — …)», que é o gatilho da skill.
// Citação sem nome de skill por perto («Fase 7 em diante») fica de fora — não dá para atribuir.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROTULO = String.raw`\d+(?:\.\d+)?(?:[a-c])?(?:-C)?`;

/** skill → rótulo canônico, lido da §1 do task-pipeline.md. */
export function lerCanonico(texto) {
  const t = texto.replace(/\r\n/g, '\n');
  const ini = t.indexOf('## 1. Tabela canônica de fases');
  if (ini < 0) return null;
  const fim = t.indexOf('\n## ', ini + 1);
  const secao = t.slice(ini, fim < 0 ? undefined : fim);
  const mapa = new Map();
  for (const m of secao.matchAll(/^\|\s*([^|]+?)\s*\|\s*([a-z][a-z0-9-]*)\s*\|/gm)) {
    if (m[1] === 'Fase') continue;
    mapa.set(m[2], m[1]);
  }
  return mapa.size ? mapa : null;
}

const norm = (r) => String(r).trim().toLowerCase();

/** Citações de fase atribuíveis a uma skill, numa linha. */
export function citacoesDaLinha(linha, skills) {
  const out = [];
  // Tabela «| `spec-x` | N | …» — a coluna logo depois do nome é a fase.
  const tab = linha.match(new RegExp(String.raw`^\|\s*\x60?([a-z][a-z0-9-]*)\x60?\s*\|\s*(${ROTULO})\s*\|`));
  if (tab && skills.has(tab[1])) {
    out.push({ skill: tab[1], achado: tab[2], forma: 'tabela' });
    return out;
  }
  const nomes = [...linha.matchAll(/\b(spec(?:-[a-z]+)*|auditoria-de-us|revisao-de-seguranca)\b/g)]
    .filter((m) => skills.has(m[1]))
    .map((m) => ({ skill: m[1], ini: m.index, fim: m.index + m[1].length }));
  if (!nomes.length) return out;
  for (const f of linha.matchAll(new RegExp(String.raw`\bFases? (${ROTULO})`, 'g'))) {
    const fimF = f.index + f[0].length;
    // Intervalo («Fases 10-11») e «apoio à Fase N» não citam a fase de UMA skill.
    if (/^[-–]\d/.test(linha.slice(fimF)) || /apoio [àa] $/i.test(linha.slice(0, f.index))) continue;
    // DEPOIS só quando colado por conector curto: «Fase N (`spec-x`)», «Fase N — spec-x», «Fase N» é `spec-x`.
    const depois = nomes.find((n) => n.ini >= fimF && /^[»"]?\s*(?:\(|—|-|:|é)?\s*`?$/.test(linha.slice(fimF, n.ini)));
    // ANTES: o nome mais próximo, até 40 caracteres, sem outro «Fase» no meio.
    const antes = nomes.filter((n) => n.fim <= f.index && f.index - n.fim <= 40
      && !/Fases? \d/.test(linha.slice(n.fim, f.index))).at(-1);
    const alvo = depois ?? antes;
    if (alvo) out.push({ skill: alvo.skill, achado: f[1], forma: 'texto' });
  }
  return out;
}

export function relatorio(raiz = RAIZ_PADRAO) {
  const tp = join(raiz, '.claude', 'skills', 'tools', 'references', 'task-pipeline.md');
  const canonico = existsSync(tp) ? lerCanonico(readFileSync(tp, 'utf8')) : null;
  if (!canonico) return null;
  const pasta = join(raiz, '.claude', 'skills');
  const skills = new Set(canonico.keys());
  for (const d of readdirSync(pasta, { withFileTypes: true })) if (d.isDirectory()) skills.add(d.name);
  const divergencias = [];
  const descricoes = [];
  let citacoes = 0;
  for (const d of readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    const arq = join(pasta, d, 'SKILL.md');
    if (!existsSync(arq)) continue;
    const linhas = readFileSync(arq, 'utf8').replace(/\r\n/g, '\n').split('\n');
    // O description do frontmatter: «<nome> (Fase N — …)» — é o que dispara a skill.
    const desc = linhas.slice(0, 40).join('\n').match(new RegExp(String.raw`^description:[\s>|-]*\n?\s*${d} \(Fase (${ROTULO})`, 'm'));
    if (desc && canonico.has(d)) {
      descricoes.push({ skill: d, achado: desc[1], canonico: canonico.get(d), ok: norm(desc[1]) === norm(canonico.get(d)) });
    }
    linhas.forEach((l, i) => {
      for (const c of citacoesDaLinha(l, skills)) {
        if (!canonico.has(c.skill)) continue;
        citacoes++;
        const can = canonico.get(c.skill);
        if (norm(c.achado) !== norm(can)) {
          divergencias.push({ arquivo: `${d}/SKILL.md`, linha: i + 1, skill: c.skill, achado: c.achado, canonico: can, forma: c.forma });
        }
      }
    });
  }
  return { canonico: Object.fromEntries(canonico), citacoes, divergencias, descricoes };
}

function emMarkdown(r) {
  const l = [];
  l.push('# Numeração de fases nas skills — divergências contra o `task-pipeline.md` §1', '');
  l.push(`Citações atribuíveis a uma skill: **${r.citacoes}** · divergentes: **${r.divergencias.length}**.`, '');
  const descErradas = r.descricoes.filter((x) => !x.ok);
  l.push('## `description` do frontmatter (o gatilho da skill)', '');
  if (!descErradas.length) l.push('Todas batem com a tabela canônica.', '');
  else {
    l.push('| Skill | Diz | Canônico |', '|---|---|---|');
    for (const x of descErradas) l.push(`| \`${x.skill}\` | ${x.achado} | ${x.canonico} |`);
    l.push('');
  }
  l.push('## Todas as divergências', '', '| Arquivo | Linha | Skill citada | Achado | Canônico | Forma |', '|---|---|---|---|---|---|');
  for (const d of r.divergencias) {
    l.push(`| \`${d.arquivo}\` | ${d.linha} | \`${d.skill}\` | ${d.achado} | ${d.canonico} | ${d.forma} |`);
  }
  return `${l.join('\n')}\n`;
}

function main(argv) {
  const i = argv.indexOf('--raiz');
  const r = relatorio(i >= 0 ? argv[i + 1] : RAIZ_PADRAO);
  if (!r) {
    process.stderr.write('relatorio-fases: não achei a tabela canônica em .claude/skills/tools/references/task-pipeline.md §1\n');
    return 2;
  }
  process.stdout.write(argv.includes('--json') ? `${JSON.stringify(r, null, 2)}\n` : emMarkdown(r));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
