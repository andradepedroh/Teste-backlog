/**
 * source-docs.mjs — leitor dos DOCUMENTOS DE ORIGEM do pipeline SDD, para ancorar o negócio
 * de Epic / Feature / Story (SKILL.md § "Esboço de negócio por nível — ancorado na origem").
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * Até a v1.2 o único caminho de preenchimento de Epic/Feature/Story era SÍNTESE a partir das
 * tasks filhas (business-enrichment.mjs). Os documentos de origem — requirements.md,
 * business-rules.md, modules.md, product-vision.md — não eram lidos em nenhum ponto, embora
 * carreguem exatamente o insumo que falta: por RF há descrição, enunciado EARS, atores,
 * prioridade MoSCoW, pré-condições e cenários BDD; por RN há enunciado, exceções, conflitos,
 * fonte regulatória e justificativa. O resultado observado era narrativa genérica (ou
 * boilerplate de outro domínio) em cartões de Kanban que deveriam explicar o negócio.
 *
 * CONTRATO DESTE MÓDULO
 *  - Só EXTRAI o que está escrito. Nunca sintetiza, completa ou infere conteúdo ausente.
 *  - Todo item extraído carrega `document` + `section` + `itemId`, que viram `sourceRefs[]` no
 *    artefato. Sem sourceRef não há como distinguir conteúdo ancorado de conteúdo inventado.
 *  - Tolerante a formato: os documentos são escritos por LLM e variam entre projetos. Um
 *    documento que não casa com nenhum padrão conhecido produz índice VAZIO — o que faz o
 *    validador LEVEL_GROUNDED_IN_SOURCE falhar — e nunca conteúdo aproximado.
 *  - Agnóstico de projeto: nenhum nome de domínio, módulo, ator ou produto aparece aqui.
 *
 * FORMATOS RECONHECIDOS (os emitidos por spec-product / spec-iterate)
 *  - requirements.md    → `### RF-<ID>: <título>` + campos `**Rótulo:**` + bloco ```gherkin
 *  - business-rules.md  → `#### RN-<ID>: <título>` + tabela `| **Campo** | conteúdo |`
 *                         (aceita também campos `**Rótulo:**` em prosa)
 *  - modules.md         → tabela de catálogo com linhas `| MOD-XXX | nome | … |`
 *  - product-vision.md  → seções `## <n>. <título>` classificadas por palavra-chave
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/** Nomes canônicos dos documentos de origem, na ordem em que são procurados. */
export const SOURCE_DOC_NAMES = {
  requirements: ['requirements.md', 'requirements_change.md'],
  businessRules: ['business-rules.md', 'business-rules_change.md'],
  modules: ['modules.md', 'modules_change.md'],
  productVision: ['product-vision.md', 'product-vision_change.md'],
  productRequirements: ['product-requirements.md', 'product-requirements_change.md']
};

/** Lê texto tolerando BOM e arquivos gravados em latin-1 por engano. */
function readText(path) {
  const buf = readFileSync(path);
  let text = buf.toString('utf8');
  // U+FFFD só aparece quando o buffer não era UTF-8 válido; nesse caso latin-1 preserva bytes.
  if (text.includes('�')) text = buf.toString('latin1');
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** Normaliza rótulo para comparação: sem acento, minúsculo, sem pontuação de borda. */
function normLabel(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\*+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[:*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(s) {
  return String(s ?? '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Remove marcação inline de markdown, preservando o texto legível. */
export function stripMd(s) {
  return clean(
    String(s ?? '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/\*([^*]*)\*/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/^\s*[-*+]\s+/gm, '')
  );
}

/**
 * Divide o documento em blocos por heading ATX. Cada bloco vai até o próximo heading de nível
 * igual ou superior, para que um `#### RN-x` não engula o `### Categoria` seguinte.
 * @param {string} text
 * @returns {{level:number, heading:string, body:string, line:number}[]}
 */
function headingBlocks(text) {
  const lines = text.split('\n');
  /** @type {{level:number, heading:string, start:number}[]} */
  const heads = [];
  lines.forEach((l, i) => {
    const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(l);
    if (m) heads.push({ level: m[1].length, heading: m[2], start: i });
  });
  return heads.map((h, i) => {
    let end = lines.length;
    for (let k = i + 1; k < heads.length; k++) {
      if (heads[k].level <= h.level) {
        end = heads[k].start;
        break;
      }
    }
    return { level: h.level, heading: h.heading, body: lines.slice(h.start + 1, end).join('\n'), line: h.start + 1 };
  });
}

/**
 * Campos rotulados em prosa: `**Rótulo:** valor` (o valor segue até o próximo rótulo em negrito
 * no início de linha, ou até o fim do bloco). Formato emitido pelo spec-product em requirements.md.
 * @param {string} body
 * @returns {Record<string, string>}
 */
function labelledFields(body) {
  /** @type {Record<string, string>} */
  const out = {};
  // `(?:[^*\n]|\*(?!\*))+?` tolera itálico DENTRO do rótulo em negrito — formato real do
  // requirements.md: `**Enunciado EARS *(Orientado a evento)*:**`. Sem isto o rótulo não era
  // reconhecido e o valor era absorvido pelo campo anterior.
  const re = /^\*\*((?:[^*\n]|\*(?!\*))+?)\*\*\s*(?:\*\([^)\n]*\)\*)?\s*:?\s*/gm;
  /** @type {{label:string, from:number, to:number}[]} */
  const marks = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    marks.push({ label: normLabel(m[1]), from: m.index + m[0].length, to: body.length });
    if (marks.length > 1) marks[marks.length - 2].to = m.index;
  }
  for (const mk of marks) {
    const value = clean(body.slice(mk.from, mk.to));
    if (value && !out[mk.label]) out[mk.label] = value;
  }
  return out;
}

/**
 * Campos em TABELA de duas colunas: `| **Campo** | Conteúdo |`. Formato emitido pelo
 * spec-product em business-rules.md.
 * @param {string} body
 * @returns {Record<string, string>}
 */
function tableFields(body) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of body.split('\n')) {
    const cells = line.trim();
    if (!cells.startsWith('|')) continue;
    const parts = cells.split('|').slice(1, -1).map((c) => c.trim());
    if (parts.length !== 2) continue;
    const label = normLabel(parts[0]);
    if (!label || /^-+$/.test(parts[1])) continue;
    if (label === 'campo' || /^-+$/.test(label)) continue;
    const value = stripMd(parts[1]);
    if (value && !out[label]) out[label] = value;
  }
  return out;
}

/** Primeiro rótulo presente entre os aliases. */
function pick(fields, aliases) {
  for (const a of aliases) {
    const k = normLabel(a);
    if (fields[k]) return fields[k];
  }
  // busca por prefixo — cobre "prioridade moscow" vs "prioridade"
  for (const a of aliases) {
    const k = normLabel(a);
    const hit = Object.keys(fields).find((f) => f.startsWith(k));
    if (hit) return fields[hit];
  }
  return '';
}

/** Lista a partir de um valor de campo separado por vírgula / ponto-e-vírgula / bullet. */
function toList(value) {
  if (!value) return [];
  return String(value)
    .split(/\n|;|,(?![^(]*\))/)
    .map((x) => stripMd(x).replace(/^[-*•]\s*/, '').trim())
    .filter((x) => x.length > 1 && !/^—$|^-$|^n\/?a$|^nenhum[ae]?$/i.test(x));
}

/** IDs do tipo RF-…, RN-…, RNF-…, PR-…, MOD-… presentes num texto. */
export function extractIds(text, prefixes = ['RF', 'RNF', 'RN', 'RN-NOVO', 'PR', 'MOD']) {
  const alt = prefixes.map((p) => p.replace(/[-]/g, '\\-')).join('|');
  const re = new RegExp(String.raw`\b(?:${alt})-[A-Z0-9][A-Z0-9-]*\b`, 'gi');
  const found = String(text ?? '').match(re) ?? [];
  return [...new Set(found.map((x) => x.toUpperCase()))];
}

/** Cenários Gherkin de um bloco ```gherkin (ou de prosa Dado/Quando/Então). */
function parseGherkin(body) {
  const fences = [...body.matchAll(/```(?:gherkin|cucumber)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const source = fences.length ? fences.join('\n') : body;
  const chunks = source
    .split(/^\s*(?:Cen[áa]rio|Scenario|Exemplo|Example)\b[^\n]*\n/im)
    .slice(fences.length || /Cen[áa]rio|Scenario/i.test(source) ? 1 : 0);
  const titles = [...source.matchAll(/^\s*(?:Cen[áa]rio|Scenario|Exemplo|Example)\b\s*\d*\s*[:.-]?\s*([^\n]*)$/gim)].map(
    (m) => stripMd(m[1])
  );
  /** @type {{title:string, given:string, when:string, then:string, givenKeyword?:string}[]} */
  const out = [];
  chunks.forEach((chunk, i) => {
    const grab = (kw) => {
      const re = new RegExp(String.raw`^\s*(${kw})\s+([^\n]*(?:\n\s{2,}(?:E|And)\s+[^\n]*)*)`, 'im');
      const m = re.exec(chunk);
      return m ? { keyword: m[1], text: stripMd(m[2].replace(/\n\s*(?:E|And)\s+/gi, ' e ')) } : { keyword: '', text: '' };
    };
    const given = grab('Dado que|Dado|Given');
    const when = grab('Quando|When').text;
    const then = grab('Ent[ãa]o|Then').text;
    // `givenKeyword` guarda o conector que o autor escreveu («Dado que» + oração, como no template
    // da spec-product, ou «Dado» + nome): quem remonta o cenário em frase usa o mesmo, sem trocar
    // a regência (D52 do teste ponta a ponta).
    if (given.text || when || then) {
      out.push({ title: titles[i] ?? '', given: given.text, when, then, ...(given.keyword ? { givenKeyword: given.keyword } : {}) });
    }
  });
  return out;
}

/**
 * Primeiro PARÁGRAFO substantivo de um bloco — o que serve de `narrative.problem`/`context`.
 * O corpo inteiro de uma seção de visão passa de 10 000 caracteres; colar isso num cartão de
 * Kanban não é ancoragem, é dump. Tabelas, blockquotes, listas e headings ficam de fora.
 * @param {string} body
 */
export function leadParagraph(body, max = 900) {
  const paras = String(body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const p of paras) {
    if (/^[|>#]/.test(p)) continue;
    if (/^!?\[/.test(p)) continue;
    if (/^(```|<!--)/.test(p)) continue;
    const t = stripMd(p).replace(/\n+/g, ' ').trim();
    if (t.length < 80) continue;
    return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
  }
  return '';
}

/** @param {string} dir @param {string[]} names */
function findDoc(dir, names) {
  for (const n of names) {
    const p = join(dir, n);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  // um nível abaixo (outputs/spec/requirements/requirements.md é layout válido do pipeline)
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    for (const n of names) {
      const p = join(dir, e.name, n);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Requisitos funcionais indexados por ID.
 * @param {string} path
 */
function parseRequirements(path) {
  const text = readText(path);
  const doc = basename(path);
  /** @type {Map<string, any>} */
  const map = new Map();
  for (const blk of headingBlocks(text)) {
    const m = /^\s*(RN?F(?:-NOVO)?-[A-Z0-9][A-Z0-9-]*)\s*[:—–-]\s*(.+)$/i.exec(blk.heading);
    if (!m) continue;
    const id = m[1].toUpperCase();
    const title = stripMd(m[2]);
    const fields = { ...labelledFields(blk.body), ...tableFields(blk.body) };
    const description = stripMd(
      pick(fields, ['descricao (user story)', 'descricao', 'description', 'enunciado', 'user story'])
    );
    const ears = stripMd(pick(fields, ['enunciado ears', 'ears', 'enunciado']));
    const priorityRaw = pick(fields, ['prioridade moscow', 'prioridade', 'moscow', 'priority']);
    map.set(id, {
      id,
      title,
      document: doc,
      section: blk.heading,
      description,
      ears,
      priorityRaw: stripMd(priorityRaw),
      priority: moscowToPriority(priorityRaw),
      actors: toList(pick(fields, ['atores', 'ator', 'actors', 'personas'])),
      preconditions: toList(pick(fields, ['pre-condicoes', 'precondicoes', 'pre condicoes', 'preconditions'])),
      complexity: stripMd(pick(fields, ['complexidade', 'complexity'])),
      moduleCodes: extractIds(`${blk.heading} ${pick(fields, ['modulo', 'module'])}`, ['MOD']),
      relatedRuleIds: extractIds(
        pick(fields, ['regras de negocio aplicaveis', 'regras de negocio', 'regras aplicaveis', 'rn']),
        ['RN', 'RN-NOVO']
      ),
      dependencies: toList(pick(fields, ['dependencias', 'dependencies'])),
      traceability: stripMd(pick(fields, ['rastreabilidade', 'traceability'])),
      scenarios: parseGherkin(blk.body)
    });
  }
  return map;
}

/** MoSCoW → priority do schema (HIGH/MEDIUM/LOW), sem inventar quando ausente. */
export function moscowToPriority(raw) {
  const s = normLabel(raw ?? '');
  if (!s) return '';
  if (/\bmust\b|\bobrigat/.test(s)) return 'HIGH';
  if (/\bshould\b|\bdeveria\b/.test(s)) return 'MEDIUM';
  if (/\bcould\b|\bwont\b|\bwon t\b|\bpoderia\b|\bnao ter[áa]\b/.test(s)) return 'LOW';
  if (/\bhigh\b|\balta\b|\bcr[íi]tic/.test(s)) return 'HIGH';
  if (/\bmedium\b|\bmedia\b/.test(s)) return 'MEDIUM';
  if (/\blow\b|\bbaixa\b/.test(s)) return 'LOW';
  return '';
}

/**
 * Regras de negócio indexadas por ID.
 * @param {string} path
 */
function parseBusinessRules(path) {
  const text = readText(path);
  const doc = basename(path);
  /** @type {Map<string, any>} */
  const map = new Map();
  for (const blk of headingBlocks(text)) {
    const m = /^\s*(RN(?:-NOVO)?-[A-Z0-9][A-Z0-9-]*)\s*[:—–-]\s*(.+)$/i.exec(blk.heading);
    if (!m) continue;
    const id = m[1].toUpperCase();
    const fields = { ...tableFields(blk.body), ...labelledFields(blk.body) };
    const statement = stripMd(pick(fields, ['enunciado', 'regra', 'statement', 'descricao', 'conteudo']));
    map.set(id, {
      id,
      title: stripMd(m[2]),
      document: doc,
      section: blk.heading,
      statement,
      exceptions: toList(pick(fields, ['excecoes', 'exceptions'])),
      conflictsWith: toList(pick(fields, ['conflitos', 'conflitos com', 'conflicts'])),
      legalBasis: stripMd(pick(fields, ['fonte regulatoria', 'base legal', 'fonte', 'legal basis'])),
      rationale: stripMd(pick(fields, ['justificativa', 'racional', 'rationale', 'motivo', 'origem'])),
      domain: stripMd(pick(fields, ['dominio', 'domain'])),
      status: stripMd(pick(fields, ['status no novo produto', 'status'])),
      moduleCodes: extractIds(pick(fields, ['modulo', 'module']), ['MOD']),
      linkedRequirementIds: extractIds(pick(fields, ['vinculada a', 'vinculado a', 'rf', 'requisitos']), [
        'RF',
        'RNF'
      ])
    });
  }
  return map;
}

/**
 * Catálogo de módulos. Aceita tabela de catálogo (formato canônico) e headings `## MOD-XXX`.
 * @param {string} path
 */
function parseModules(path) {
  const text = readText(path);
  const doc = basename(path);
  /** @type {Map<string, any>} */
  const map = new Map();

  // (a) tabela de catálogo: cabeçalho identifica as colunas por palavra-chave.
  const lines = text.split('\n');
  /** @type {string[]|null} */
  let header = null;
  let headerLine = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) {
      if (!/^\s*$/.test(t)) header = header && /^\|/.test(t) ? header : header;
      continue;
    }
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    const looksHeader = cells.some((c) => /^(c[óo]digo|m[óo]dulo|code)$/i.test(normLabel(c)));
    if (looksHeader) {
      header = cells.map(normLabel);
      headerLine = t;
      continue;
    }
    if (!header) continue;
    const code = extractIds(cells[0] ?? '', ['MOD'])[0];
    if (!code) continue;
    const col = (aliases) => {
      for (const a of aliases) {
        const i = header.findIndex((h) => h.startsWith(normLabel(a)));
        if (i >= 0 && cells[i]) return stripMd(cells[i]);
      }
      return '';
    };
    map.set(code, {
      code,
      document: doc,
      section: headerLine ? 'Catálogo' : '',
      name: col(['nome canonico', 'nome', 'name']) || code,
      aliases: toList(col(['aliases'])),
      actors: toList(col(['atores primarios', 'atores', 'actors'])),
      objective: col(['objetivo de negocio', 'objetivo', 'objective']),
      boundaries: col(['limites', 'fronteiras', 'o que nao faz', 'boundaries']),
      status: col(['status'])
    });
  }

  // (b) headings dedicados — complementam/sobrescrevem só campos ainda vazios.
  for (const blk of headingBlocks(text)) {
    const code = extractIds(blk.heading, ['MOD'])[0];
    if (!code) continue;
    const fields = { ...tableFields(blk.body), ...labelledFields(blk.body) };
    const prev = map.get(code) ?? { code, document: doc, name: code, aliases: [], actors: [], status: '' };
    map.set(code, {
      ...prev,
      section: blk.heading,
      name: prev.name && prev.name !== code ? prev.name : stripMd(blk.heading.replace(/^.*?MOD-[A-Z0-9-]+\s*[:—-]?\s*/i, '')) || code,
      objective: prev.objective || stripMd(pick(fields, ['objetivo de negocio', 'objetivo', 'objective'])),
      boundaries: prev.boundaries || stripMd(pick(fields, ['limites', 'fronteiras', 'o que nao faz', 'boundaries'])),
      actors: prev.actors?.length ? prev.actors : toList(pick(fields, ['atores primarios', 'atores', 'actors']))
    });
  }
  return map;
}

/** Classificação das seções de product-vision.md por palavra-chave do título. */
const VISION_SECTION_MATCHERS = [
  ['summary', /sumario executivo|resumo executivo|executive summary|declaracao de visao|vision statement/],
  ['problem', /contexto e oportunidade|situacao atual|as-?is|problema|oportunidade|why now|por que agora/],
  ['outcomes', /objetivos e metricas|objetivos|resultados de negocio|okr|outcomes|north star/],
  ['outOfScope', /escopo|nao e|fora de escopo|out of scope/],
  ['personas', /personas|jobs to be done|stakeholders/]
];

/**
 * Visão de produto: problema, resultado de negócio, métricas e fora de escopo.
 * @param {string} path
 */
function parseProductVision(path) {
  const text = readText(path);
  const doc = basename(path);
  /** @type {Record<string, {section:string, text:string, lead:string, raw:string}[]>} */
  const buckets = { summary: [], problem: [], outcomes: [], outOfScope: [], personas: [] };
  for (const blk of headingBlocks(text)) {
    const h = normLabel(blk.heading.replace(/^\s*\d+(\.\d+)*\.?\s*/, ''));
    const body = stripMd(blk.body);
    if (!body || body.length < 40) continue;
    for (const [key, re] of VISION_SECTION_MATCHERS) {
      if (re.test(h)) {
        buckets[key].push({ section: blk.heading, text: body, lead: leadParagraph(blk.body), raw: blk.body });
        break;
      }
    }
  }
  /**
   * Métricas: apenas LINHAS DE TABELA das seções de objetivos, com número/prazo. Bullets de
   * prosa e blockquotes (`>` — notas de baseline, avisos de revalidação) ficam fora: entravam
   * como "métrica de sucesso" e poluíam a narrativa do Epic com parágrafos de aviso.
   */
  const metrics = [];
  for (const b of buckets.outcomes) {
    for (const rawLine of b.raw.split('\n')) {
      const l = rawLine.trim();
      if (!l.startsWith('|') || l.startsWith('>')) continue;
      const cells = l.split('|').slice(1, -1).map((c) => stripMd(c).trim());
      if (!cells.length || cells.every((c) => /^:?-{2,}:?$/.test(c) || !c)) continue;
      const joined = cells.filter(Boolean).join(' — ');
      if (joined.length < 12 || joined.length > 320) continue;
      if (!/\d/.test(joined)) continue;
      if (!/%|dias?|meses|m[êe]s|horas?|\bmin\b|p\d\d|\bmeta\b|\bbaseline\b|≥|≤|<|>/i.test(joined)) continue;
      metrics.push(joined);
    }
  }
  const first = (list) => (list.length ? list[0] : null);
  return {
    document: doc,
    summary: first(buckets.summary),
    problem: first(buckets.problem),
    outcomes: first(buckets.outcomes),
    outOfScope: first(buckets.outOfScope),
    successMetrics: [...new Set(metrics)].slice(0, 12),
    sections: buckets
  };
}

/**
 * Índice completo dos documentos de origem presentes num diretório de outputs.
 * Ausência de documento NÃO é erro: o índice fica vazio e quem consome registra a lacuna.
 * @param {string} dir
 */
export function loadSourceDocs(dir) {
  const base = resolve(dir);
  /** @type {Record<string, string|null>} */
  const files = {};
  for (const [key, names] of Object.entries(SOURCE_DOC_NAMES)) files[key] = existsSync(base) ? findDoc(base, names) : null;

  const index = {
    dir: base,
    files,
    requirements: files.requirements ? parseRequirements(files.requirements) : new Map(),
    rules: files.businessRules ? parseBusinessRules(files.businessRules) : new Map(),
    modules: files.modules ? parseModules(files.modules) : new Map(),
    vision: files.productVision ? parseProductVision(files.productVision) : null
  };
  return index;
}

/** @param {ReturnType<typeof loadSourceDocs>|null} idx */
export function isEmptySourceIndex(idx) {
  if (!idx) return true;
  return idx.requirements.size === 0 && idx.rules.size === 0 && idx.modules.size === 0 && !idx.vision;
}

/** Resumo legível para o stdout do enriquecimento / sync-log. */
export function summarizeSourceIndex(idx) {
  if (!idx) return { available: false };
  return {
    available: !isEmptySourceIndex(idx),
    dir: idx.dir,
    files: Object.fromEntries(Object.entries(idx.files).map(([k, v]) => [k, v ? basename(v) : null])),
    requirements: idx.requirements.size,
    businessRules: idx.rules.size,
    modules: idx.modules.size,
    vision: Boolean(idx.vision)
  };
}
