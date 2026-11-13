#!/usr/bin/env node
/**
 * render-data-model-md.mjs — o data-model.md legível por humano, a partir do data-model.json
 *
 * O JSON é a autoridade; ESTE ARQUIVO É DERIVADO. Não o edite à mão: a próxima execução da
 * spec-data-model o reescreve. Editar o modelo significa editar o data-model.json e rodar de novo.
 *
 * Irmão do render-er.mjs, e não substituto dele: aquele gera .d2 e SVG, que o spec-report EMBUTE.
 * Mermaid não renderiza sem JS no consumidor, então os dois convivem — dois produtores, dois
 * propósitos.
 *
 * Uso:
 *   node render-data-model-md.mjs [data-model.json] [saida.md]
 *   node render-data-model-md.mjs [data-model.json] --out <saida.md>
 *
 * Defaults: data-model em outputs/spec/data-model.json → outputs/data-model.json;
 *           saída ao lado do JSON, com extensão .md.
 *
 * Zero dependências. Mesma guarda de saída do render-er.mjs (exit 3 dentro de skills/).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const CARDINALIDADE_MERMAID = {
  ONE_TO_ONE: '||--||',
  ONE_TO_MANY: '||--o{',
  MANY_TO_ONE: '}o--||',
  MANY_TO_MANY: '}o--o{',
};

const MODO_OWNERSHIP = {
  OWNED: 'Criada e escrita por nós',
  EXTERNAL_LOADED: 'Carregada no nosso schema por terceiro — somente leitura',
  EXTERNAL_PROJECTION: 'Projeção de API externa',
  HYBRID: 'Híbrida — parte externa, parte nossa',
};

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log(`render-data-model-md.mjs — gera o data-model.md (legível por humano) do data-model.json

Uso:
  node render-data-model-md.mjs [data-model.json] [saida.md]
  node render-data-model-md.mjs [data-model.json] --out <saida.md>

Defaults:
  data-model : outputs/spec/data-model.json, depois outputs/data-model.json
  saída      : mesmo diretório/nome do JSON, extensão .md

A saída pertence a outputs/spec/ (tools/references/paths.md). Se o diretório de saída cair
dentro de uma pasta de skills (skills/, .cursor/skills/, .claude/skills/, plugin/skills/), o
script RECUSA com exit 3 — passe --out apontando para outputs/spec/.

O JSON é a autoridade; o .md gerado é derivado e não deve ser editado à mão. Irmão do
render-er.mjs (gera .d2/.svg) — dois produtores, dois propósitos.`);
  process.exit(0);
}

// --out/-o <caminho> tem precedência sobre o 2º posicional
let outFlag;
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '--out' || a === '-o') {
    outFlag = args[i + 1];
    if (!outFlag || outFlag.startsWith('-')) {
      console.error('ERRO: --out exige um caminho de arquivo .md como argumento.');
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
const outPath = outFlag || positional[1] || dataPath.replace(/\.json$/i, '') + '.md';

// GUARD: a saída pertence a outputs/spec/ — nunca dentro do repositório do kit de skills.
// Sem isto, rodar o script contra um exemplo de `templates/` grava o .md ao lado do input e
// polui o kit (foi o que aconteceu com templates/data-model.greenfield.example.d2, para o
// render-er.mjs). Basta um segmento chamado `skills` no caminho absoluto de saída: cobre
// skills/, .cursor/skills/, .claude/skills/, plugin/skills/ e ~/.claude/skills/.
const outDirSegments = path
  .resolve(path.dirname(outPath))
  .split(/[\\/]+/)
  .filter(Boolean);
if (outDirSegments.some((seg) => seg.toLowerCase() === 'skills')) {
  console.error(
    `ERRO: diretório de saída dentro de uma pasta de skills — recusado.\n` +
      `  saída pretendida : ${path.resolve(outPath)}\n` +
      `  A saída do render-data-model-md pertence a outputs/spec/ (ver tools/references/paths.md);\n` +
      `  skills/ (e os espelhos .cursor/skills, .claude/skills, plugin/skills) guarda o kit,\n` +
      `  não artefatos gerados. Rodar contra um exemplo de templates/ polui o repositório.\n` +
      `  Solução: node render-data-model-md.mjs "${dataPath}" --out outputs/spec/data-model.md`
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

/** Célula de tabela: nunca vazia (regra do molde do kit). Pipe escapado para não quebrar a tabela. */
const cel = (v) => {
  const s = (v === undefined || v === null || String(v).trim() === '') ? '—' : String(v);
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
};

/** Identificador seguro para Mermaid: erDiagram aceita alfanumérico e underscore. */
const idMermaid = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');

/** Toda entidade de todos os bounded contexts, com o contexto de origem preso a cada uma. */
function entidades(model) {
  const out = [];
  for (const bc of model.boundedContexts ?? []) {
    for (const e of bc.entities ?? []) out.push({ ...e, __contexto: bc.name ?? bc.id ?? '—' });
  }
  return out;
}

/**
 * A regra 4 do bloco «Linguagem clara» do kit: "código de regra nunca substitui o conteúdo dela".
 * `RN-012` sozinho não informa nada a quem não tem o documento aberto. O campo traceability[].excerpt
 * já existe no schema exatamente para isso — escrevemos a regra por extenso, com o código no fim.
 */
function rastreio(e) {
  const itens = e.traceability ?? [];
  if (!itens.length) return '—';
  return itens
    .map((t) => (t.excerpt ? `${t.excerpt} (${t.itemId ?? '—'})` : (t.itemId ?? '—')))
    .join('; ');
}

function secaoChangelog(model) {
  const l = ['## Changelog', ''];
  const cl = model.changelog ?? [];
  if (!cl.length) {
    l.push('Sem changelog declarado no `data-model.json`.', '');
    return l;
  }
  l.push('| Versão | Data | Estrutural? | Mudança |', '|---|---|---|---|');
  for (const c of cl) {
    l.push(`| ${cel(c.version)} | ${cel(c.date)} | ${c.structural ? 'sim' : 'não'} | ${cel(c.summary)} |`);
  }
  l.push('');
  return l;
}

function secaoEntidades(model) {
  const l = ['## Entidades', ''];
  const ents = entidades(model);
  if (!ents.length) { l.push('Nenhuma entidade declarada.', ''); return l; }
  l.push('| Entidade | Contexto | Papel | Operação | Colunas | De onde vem (rastreio) |');
  l.push('|---|---|---|---|---|---|');
  for (const e of ents) {
    const ehAlter = String(e.operationType ?? '').startsWith('ALTER');
    const cols = (e.columns ?? []).map((c) => c.name).join(', ');
    // Numa entidade ALTER, `columns` só traz as colunas desta operação (novas ou modificadas) —
    // não a tabela inteira. Sem este rótulo o leitor lê a lista como se fosse completa; a coluna
    // "Estado atual (antes)" da seção Delta do modelo, abaixo, é onde ficam as colunas que já
    // existiam antes desta mudança.
    const colsTexto = (ehAlter && cols) ? `${cols} — só as desta operação; ver Delta do modelo` : cols;
    l.push(
      `| \`${cel(e.name)}\` | ${cel(e.__contexto)} | ${cel(e.purpose)} | ${cel(e.operationType)} | ` +
        `${cel(colsTexto)} | ${cel(rastreio(e))} |`
    );
  }
  l.push('');
  return l;
}

function secaoOwnership(model) {
  const l = ['## Origem e propriedade', ''];
  const ents = entidades(model);
  if (!ents.length) { l.push('Nenhuma entidade declarada.', ''); return l; }
  l.push('*Quem é dono do dado em tempo de execução — quem escreve nele. Não é o mesmo que a operação de migration.*', '');
  l.push('| Entidade | Modo | O que isso significa | Fonte | Observações |', '|---|---|---|---|---|');
  for (const e of ents) {
    const o = e.dataOwnership ?? {};
    l.push(
      `| \`${cel(e.name)}\` | ${cel(o.mode)} | ${cel(MODO_OWNERSHIP[o.mode])} | ${cel(o.source)} | ${cel(o.notes)} |`
    );
  }
  l.push('');
  return l;
}

function secaoDiagrama(model) {
  const l = ['## Diagrama de entidades', '', '*Ilustração. A autoridade é o `data-model.json`; as tabelas acima são a leitura dele.*', '', '```mermaid', 'erDiagram'];
  const nomes = new Set(entidades(model).map((e) => e.name));
  for (const e of entidades(model)) {
    for (const r of e.relationships ?? []) {
      // Relacionamento para entidade fora do modelo é ruído no diagrama, e o validador do kit já
      // reprova targetEntity inexistente (checagem semântica 1). Aqui apenas não desenhamos.
      if (!nomes.has(r.targetEntity)) continue;
      const seta = CARDINALIDADE_MERMAID[r.type] ?? '||--o{';
      const rotulo = r.foreignKey ? String(r.foreignKey) : 'referencia';
      l.push(`    ${idMermaid(e.name)} ${seta} ${idMermaid(r.targetEntity)} : "${rotulo}"`);
    }
  }
  for (const e of entidades(model)) {
    const cols = e.columns ?? [];
    if (!cols.length) continue;
    l.push(`    ${idMermaid(e.name)} {`);
    for (const c of cols) {
      const pk = (e.primaryKey ?? []).includes(c.name) ? ' PK' : '';
      l.push(`      ${idMermaid(c.type ?? 'texto')} ${idMermaid(c.name)}${pk}`);
    }
    l.push('    }');
  }
  l.push('```', '');
  return l;
}

function secaoEnumeracoes(model) {
  const l = ['## Enumerações', ''];
  const todas = (model.boundedContexts ?? []).flatMap((bc) => bc.enumerations ?? []);
  if (!todas.length) { l.push('Nenhuma enumeração declarada.', ''); return l; }
  l.push('| Enumeração | Valores | Usada em |', '|---|---|---|');
  for (const en of todas) {
    const vals = (en.values ?? []).map((v) => `${v.value}${v.label ? ` (${v.label})` : ''}`).join(', ');
    l.push(`| \`${cel(en.name)}\` | ${cel(vals)} | ${cel((en.usedIn ?? []).join(', '))} |`);
  }
  l.push('');
  return l;
}

function secaoCanais(model) {
  const l = ['## Canais assíncronos', ''];
  const todos = (model.boundedContexts ?? []).flatMap((bc) => bc.asyncChannels ?? []);
  if (!todos.length) { l.push('Nenhum canal assíncrono declarado.', ''); return l; }
  l.push('| Canal | Tipo | Direção | Conteúdo | Reenvio e idempotência |', '|---|---|---|---|---|');
  for (const c of todos) {
    l.push(`| \`${cel(c.name)}\` | ${cel(c.kind)} | ${cel(c.direction)} | ${cel(c.payloadSummary)} | ${cel(c.retryAndIdempotency)} |`);
  }
  l.push('');
  return l;
}

/**
 * `currentStateIfAlter` é objeto livre no schema (sem propriedades fixas) — por isso o formato
 * prosa reconhece os três campos que o kit usa na prática (`description`, `existingColumns`,
 * `existingIndexes`) e cai para "chave: valor" em qualquer outro campo, sem nunca despejar
 * `JSON.stringify` de um objeto inteiro numa célula de tabela.
 */
function formatarEstadoAtual(estado) {
  if (!estado || typeof estado !== 'object') return '—';
  const partes = [];
  if (estado.description) partes.push(String(estado.description));
  if (Array.isArray(estado.existingColumns) && estado.existingColumns.length) {
    partes.push(`Colunas existentes: ${estado.existingColumns.join(', ')}`);
  }
  if (Array.isArray(estado.existingIndexes) && estado.existingIndexes.length) {
    partes.push(`Índices existentes: ${estado.existingIndexes.join(', ')}`);
  }
  const CONHECIDOS = new Set(['description', 'existingColumns', 'existingIndexes']);
  for (const chave of Object.keys(estado)) {
    if (CONHECIDOS.has(chave)) continue;
    const v = estado[chave];
    const texto = Array.isArray(v) ? v.join(', ') : (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));
    partes.push(`${chave}: ${texto}`);
  }
  return partes.join('. ') || '—';
}

function secaoDelta(model) {
  const l = [
    '## Delta do modelo', '',
    '*Estas entidades já existem hoje e este modelo as altera — a coluna "Estado atual (antes)"',
    'descreve o que existe agora, e "Notas de migração" descreve a mudança em prosa; não há uma',
    'segunda estrutura de "estado alvo" no `data-model.json` para desenhar uma seta honesta entre',
    'os dois, então este documento não finge uma.*', '',
  ];
  const alteradas = entidades(model).filter((e) => String(e.operationType ?? '').startsWith('ALTER'));
  if (!alteradas.length) { l.push('Nenhuma entidade alterada — modelo sem delta sobre estrutura existente.', ''); return l; }
  l.push('| Entidade | Operação | Estado atual (antes) | Notas de migração |', '|---|---|---|---|');
  for (const e of alteradas) {
    const atual = formatarEstadoAtual(e.currentStateIfAlter);
    l.push(`| \`${cel(e.name)}\` | ${cel(e.operationType)} | ${cel(atual)} | ${cel(e.migrationNotes)} |`);
  }
  l.push('');
  return l;
}

function secaoMigrations(model) {
  const l = ['## Estado declarado das migrations', ''];
  const ms = model.migrationsState ?? [];
  if (!ms.length) { l.push('Nenhuma migration declarada.', ''); return l; }
  l.push(
    '*Lista declarada à mão. A coluna **Afirmado em** existe porque a verdade mora na pasta de',
    'migrations e esta lista envelhece — leia a data antes de confiar na linha.*',
    ''
  );
  l.push('| Migration | Conteúdo | Ambiente | Afirmado em |', '|---|---|---|---|');
  for (const m of ms) {
    l.push(`| \`${cel(m.id)}\` | ${cel(m.content)} | ${cel(m.appliedIn)} | ${cel(m.declaredAt)} |`);
  }
  l.push('');
  return l;
}

function secaoQuestoes(model) {
  const l = ['## Questões em aberto', ''];
  const qs = model.openQuestions ?? [];
  if (!qs.length) { l.push('Nenhuma questão em aberto.', ''); return l; }
  l.push('| Questão | Entidade afetada | O que falta saber |', '|---|---|---|');
  for (const q of qs) {
    l.push(`| ${cel(q.description)} | ${cel(q.affectedEntity)} | ${cel(q.requiredInformation)} |`);
  }
  l.push('');
  return l;
}

function render(model, origem) {
  const l = [
    `# Modelo de Dados — ${model.projectName ?? '—'}`,
    '',
    `> **Arquivo derivado de \`${origem}\` — não edite à mão.** A próxima execução da`,
    '> `spec-data-model` o reescreve. Para mudar o modelo, mude o JSON e gere de novo:',
    `> \`node render-data-model-md.mjs ${origem}\`.`,
    '>',
    `> Gerado por \`render-data-model-md.mjs\` · schema \`${model.schemaVersion ?? '—'}\` ·`,
    `> skill \`${model.skillVersion ?? '—'}\` · modelo emitido em \`${model.generatedAt ?? '—'}\``,
    '',
    '---',
    '',
  ];
  return l
    .concat(secaoChangelog(model))
    .concat(secaoEntidades(model))
    .concat(secaoOwnership(model))
    .concat(secaoDiagrama(model))
    .concat(secaoEnumeracoes(model))
    .concat(secaoCanais(model))
    .concat(secaoDelta(model))
    .concat(secaoMigrations(model))
    .concat(secaoQuestoes(model))
    .join('\n');
}

writeFileSync(outPath, render(model, dataPath) + '\n', 'utf8');
console.log(`data-model.md gerado: ${outPath}`);
