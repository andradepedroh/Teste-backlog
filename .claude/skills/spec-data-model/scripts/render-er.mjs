#!/usr/bin/env node
/**
 * render-er.mjs — Diagrama ER a partir do data-model.json (spec-data-model, passo opcional)
 *
 * Lê um data-model.json e gera um arquivo .d2 usando a sintaxe `sql_table` do D2
 * (https://github.com/terrastruct/d2 — binário único, sem browser):
 *   - cada entidade vira um sql_table com colunas, tipos e constraints (PK/FK/unique);
 *   - bounded contexts viram containers;
 *   - relacionamentos viram arestas com a cardinalidade no label (1:1, 1:N, N:1, N:M).
 *
 * Se o binário `d2` estiver no PATH, renderiza também o SVG (`d2 arquivo.d2 arquivo.svg`).
 * Senão, apenas gera o .d2 e instrui a instalação. Zero dependências externas.
 *
 * Uso:
 *   node render-er.mjs [data-model.json] [saida.d2]
 *
 * Defaults: data-model em outputs/spec/data-model.json → outputs/data-model.json;
 *           saída ao lado do JSON, com extensão .d2.
 *
 * GUARD: a saída pertence a outputs/spec/ (ver tools/references/paths.md). Gravar dentro de
 * uma pasta `skills/` (ou espelho `.cursor/skills/`, `.claude/skills/`, `plugin/skills/`) é
 * recusado com exit 3 — é o caso de rodar o script contra um exemplo de `templates/`, que
 * poluiria o repositório do kit.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CARDINALITY = {
  ONE_TO_ONE: '1:1',
  ONE_TO_MANY: '1:N',
  MANY_TO_ONE: 'N:1',
  MANY_TO_MANY: 'N:M',
};

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log(`render-er.mjs — gera diagrama ER (.d2 e, se possível, .svg) do data-model.json

Uso:
  node render-er.mjs [data-model.json] [saida.d2]
  node render-er.mjs [data-model.json] --out <saida.d2>

Defaults:
  data-model : outputs/spec/data-model.json, depois outputs/data-model.json
  saída      : mesmo diretório/nome do JSON, extensão .d2

A saída pertence a outputs/spec/ (tools/references/paths.md). Se o diretório de saída cair
dentro de uma pasta de skills (skills/, .cursor/skills/, .claude/skills/, plugin/skills/), o
script RECUSA com exit 3 — passe --out apontando para outputs/spec/.

Se o binário d2 estiver no PATH, o SVG é gerado automaticamente.
Instalação do D2: https://github.com/terrastruct/d2 (binário único, sem browser).`);
  process.exit(0);
}

// --out/-o <caminho> tem precedência sobre o 2º posicional
let outFlag;
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '--out' || a === '-o') {
    outFlag = args[i + 1];
    if (!outFlag || outFlag.startsWith('-')) {
      console.error('ERRO: --out exige um caminho de arquivo .d2 como argumento.');
      process.exit(1);
    }
    args.splice(i, 2);
    i -= 1;
  } else if (a.startsWith('--out=')) {
    outFlag = a.slice('--out='.length);
    args.splice(i, 1);
    i -= 1;
  }
}
const positional = args.filter((a) => !a.startsWith('-'));

let dataPath = positional[0];
if (!dataPath) {
  dataPath = [path.join('outputs', 'spec', 'data-model.json'), path.join('outputs', 'data-model.json')].find(
    (p) => existsSync(p)
  );
  if (!dataPath) {
    console.error('ERRO: nenhum data-model.json encontrado nos defaults. Informe o caminho como 1º argumento.');
    process.exit(1);
  }
}
const outPath = outFlag || positional[1] || dataPath.replace(/\.json$/i, '') + '.d2';

// GUARD: a saída pertence a outputs/spec/ — nunca dentro do repositório do kit de skills.
// Sem isto, rodar o script contra um exemplo de `templates/` grava o .d2 ao lado do input e
// polui o kit (foi o que aconteceu com templates/data-model.greenfield.example.d2).
// Basta um segmento chamado `skills` no caminho absoluto de saída: cobre skills/,
// .cursor/skills/, .claude/skills/, plugin/skills/ e ~/.claude/skills/.
const outDirSegments = path
  .resolve(path.dirname(outPath))
  .split(/[\\/]+/)
  .filter(Boolean);
if (outDirSegments.some((seg) => seg.toLowerCase() === 'skills')) {
  console.error(
    `ERRO: diretório de saída dentro de uma pasta de skills — recusado.\n` +
      `  saída pretendida : ${path.resolve(outPath)}\n` +
      `  A saída do render-er pertence a outputs/spec/ (ver tools/references/paths.md);\n` +
      `  skills/ (e os espelhos .cursor/skills, .claude/skills, plugin/skills) guarda o kit,\n` +
      `  não artefatos gerados. Rodar contra um exemplo de templates/ polui o repositório.\n` +
      `  Solução: node render-er.mjs "${dataPath}" --out outputs/spec/data-model.d2`
  );
  process.exit(3);
}

let model;
try {
  model = JSON.parse(readFileSync(dataPath, 'utf8'));
} catch (e) {
  console.error(`ERRO: não foi possível ler/parsear "${dataPath}": ${e.message}`);
  process.exit(1);
}

// chaves D2 seguras (sem pontos/aspas); labels preservam o texto original
const safeKey = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
const quote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

const contexts = Array.isArray(model.boundedContexts) ? model.boundedContexts : [];
const entityHome = new Map(); // nome da entidade → caminho D2 completo (container.tabela)
const lines = [];

lines.push(`# Diagrama ER — ${model.projectName ?? 'data-model'} (gerado por render-er.mjs)`);
lines.push('direction: right');
lines.push('');

// 1ª passada: containers (bounded contexts) e tabelas
for (const bc of contexts) {
  const bcKey = safeKey(bc.id ?? bc.name ?? 'BC');
  lines.push(`${bcKey}: ${quote(bc.name ?? bc.id ?? 'Bounded Context')} {`);
  for (const entity of bc.entities ?? []) {
    const entKey = safeKey(entity.name ?? 'Entidade');
    entityHome.set(entity.name, `${bcKey}.${entKey}`);
    const pk = new Set(entity.primaryKey ?? []);
    const fkCols = new Set((entity.relationships ?? []).map((r) => r.foreignKey).filter(Boolean));
    const label = entity.tableName && entity.tableName !== entity.name
      ? `${entity.name} (${entity.tableName})`
      : entity.name;
    lines.push(`  ${entKey}: ${quote(label)} {`);
    lines.push('    shape: sql_table');
    for (const col of entity.columns ?? []) {
      const constraints = [];
      if (pk.has(col.name)) constraints.push('primary_key');
      if (fkCols.has(col.name)) constraints.push('foreign_key');
      if (col.unique && !pk.has(col.name)) constraints.push('unique');
      const type = String(col.type ?? '').trim() || 'N/D';
      const suffix = constraints.length ? ` {constraint: [${constraints.join('; ')}]}` : '';
      lines.push(`    ${quote(col.name)}: ${quote(type)}${suffix}`);
    }
    lines.push('  }');
  }
  lines.push('}');
  lines.push('');
}

// 2ª passada: relacionamentos como arestas com cardinalidade no label
for (const bc of contexts) {
  for (const entity of bc.entities ?? []) {
    const source = entityHome.get(entity.name);
    for (const rel of entity.relationships ?? []) {
      const target = entityHome.get(rel.targetEntity);
      if (!source || !target) {
        lines.push(`# AVISO: relacionamento ${entity.name} -> ${rel.targetEntity ?? '?'} ignorado (entidade fora do modelo)`);
        continue;
      }
      const card = CARDINALITY[rel.type] ?? rel.type ?? '';
      const fk = rel.foreignKey ? ` via ${rel.foreignKey}` : '';
      lines.push(`${source} -> ${target}: ${quote(`${card}${fk}`.trim())}`);
    }
  }
}

writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log(`d2 gerado  : ${outPath}`);

// renderização opcional via binário d2
const svgPath = outPath.replace(/\.d2$/i, '') + '.svg';
const probe = spawnSync('d2', ['--version'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) {
  console.log('binário d2 não encontrado no PATH — apenas o .d2 foi gerado.');
  console.log('Para renderizar o SVG: instale o D2 (https://github.com/terrastruct/d2, binário único)');
  console.log(`e rode: d2 ${outPath} ${svgPath}`);
  process.exit(0);
}
const render = spawnSync('d2', [outPath, svgPath], { encoding: 'utf8' });
if (render.status === 0) {
  console.log(`svg gerado : ${svgPath} (pode ser embutido em relatórios)`);
} else {
  console.error(`falha ao renderizar SVG com d2: ${render.stderr || render.stdout || 'erro desconhecido'}`);
  console.error(`o arquivo .d2 permanece válido em: ${outPath}`);
  process.exit(1);
}
