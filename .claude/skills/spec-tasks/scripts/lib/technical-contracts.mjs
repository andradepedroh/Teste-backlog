/**
 * technical-contracts.mjs — cobertura de `apiContracts[]` e `persistenceModel.entities[]`
 * no passe de enriquecimento.
 *
 * POR QUE EXISTE
 * `enrich-tasks.mjs` enriquecia o NEGÓCIO (Epic/Feature/Story) e não mencionava `apiContracts`
 * nem `persistenceModel` em lugar nenhum. Resultado medido em backlog real: 18 tasks citavam uma
 * rota literal sem contrato de API, 27 citavam uma tabela física sem modelo de dados, e o passe
 * de enriquecimento passava por cima delas sem uma palavra. O gate
 * (`TASK_MISSING_API_CONTRACT` / `TASK_MISSING_PERSISTENCE_MODEL` em
 * validate-tasks-selfsufficiency.mjs) reprova; este módulo é o lado construtivo do mesmo defeito.
 *
 * DUAS REGRAS QUE NÃO SE NEGOCEIAM
 *  1. **Nunca inventar contrato.** Só se escreve o que existe em `api-contracts.yaml` /
 *     `data-model.json`. Sem fonte, ou com fonte incompleta, registra-se LACUNA em
 *     `metadata.enrichmentGaps[]` — nunca um bloco plausível.
 *  2. **Completo ou lacuna, nunca parcial.** Um contrato pela metade é pior que nenhum: o
 *     implementador não tem como saber que falta metade, e o gate de QUALIDADE
 *     (`TASK_HAS_COMPLETE_API_SCHEMAS`, que exige auth, request e responses com 2xx + 4xx) passaria
 *     a reprovar um bloco que este passe escreveu. Se a extração não produz um contrato que
 *     satisfaça o gate de qualidade, não se escreve nada e a lacuna diz exatamente o que faltou na
 *     fonte. (5xx não é exigido: a spec-api-contracts não manda declarar 5xx por operação, e o gate
 *     o trata como aviso — D30 do teste ponta a ponta.)
 *
 * ADITIVO: bloco já presente na task nunca é tocado (nem com `--overwrite` — a prosa escrita pelo
 * agente é mais rica que qualquer conversão mecânica; sobrescrever seria regressão).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Gatilhos de NECESSIDADE — espelham `API_ROUTE_CITATION` / `PHYSICAL_TABLE_CITATION` de
 * `validate-tasks-selfsufficiency.mjs`. A igualdade é verificada mecanicamente por
 * `templates/validate-examples.mjs` (§ "gatilhos em sincronia"), para que gate e enriquecimento
 * não possam divergir em silêncio.
 */
export const API_ROUTE_CITATION = /\/v\d+\/[a-z0-9\-\/{}]+/i;
export const PHYSICAL_TABLE_CITATION = /\b(tb_|dm_|ft_|obt_)[a-z0-9_]+/i;

/** Todas as ocorrências (o gate só precisa da primeira; o enriquecimento precisa de todas). */
const API_ROUTE_CITATION_ALL = new RegExp(API_ROUTE_CITATION.source, 'gi');
const PHYSICAL_TABLE_CITATION_ALL = new RegExp(PHYSICAL_TABLE_CITATION.source, 'gi');

// <gatilhos-do-projeto>
// Bloco IDÊNTICO em validate-tasks-selfsufficiency.mjs e em lib/technical-contracts.mjs (lá com
// `export`): templates/validate-examples.mjs confere a igualdade, como confere os dois regexes acima.
/**
 * Gatilhos DERIVADOS DO PROJETO — complementam API_ROUTE_CITATION / PHYSICAL_TABLE_CITATION, que só
 * reconhecem o naming fixo (`/v1/…`, `tb_…`). Projeto com a versão em `servers[].url` e tabela sem
 * prefixo (`/pedidos`, `clientes`) deixava os dois gates de presença mudos (D29 do teste ponta a
 * ponta: nenhum FATAL, e o enriquecimento com `filledApi: 0`). Aqui a rota e a tabela são as que
 * EXISTEM no api-contracts.yaml e no data-model.json do projeto, e a citação só conta em contexto
 * inequívoco — nome de domínio em prosa («o vendedor lista os pedidos») e rota de TELA
 * (`uiContext.rota: "/pedidos/novo"`) não viram FATAL:
 *   rota   — precedida de verbo HTTP (`POST /pedidos/{id}/envio`), valor de `"path"` (testData,
 *            contrato) ou com prefixo de versão/base do servidor (`/v1/pedidos`); o parâmetro de
 *            path casa `{x}`, `:x`, `[x]` ou um valor concreto (`/pedidos/0b0b…/envio`);
 *   tabela — `tabela <nome>` / `table <nome>`, SQL (`FROM|JOIN|INTO|UPDATE <nome>`), coluna
 *            qualificada que existe no modelo (`pedidos.situacao`) ou, para nome com `_`/`.`
 *            (`itens_pedido`), o próprio nome.
 */
const PROJECT_ROUTE_VERBS = 'GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS';
const escapeProjectRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isProjectParamSegment = (s) => /^\{[^}]+\}$|^:[A-Za-z_]\w*$|^\[[^\]]+\]$/.test(String(s));

function projectRouteRegex(path, basePaths) {
  const segs = String(path ?? '').split('/').filter(Boolean);
  if (!segs.length) return null;
  const body = segs
    .map((s) => (isProjectParamSegment(s)
      ? String.raw`/(?:\{[^}/\s"]+\}|:[A-Za-z_]\w*|\[[^\]/\s"]+\]|[^/\s"'\x60?#{}[\]\\]+)`
      : `/${escapeProjectRe(s)}`))
    .join('');
  const bases = [String.raw`(?:/api)?/v\d+`, '/api', ...basePaths.filter((b) => b && b !== '/').map(escapeProjectRe)];
  const base = `(?:${bases.join('|')})`;
  const lead = String.raw`(?:\b(?:${PROJECT_ROUTE_VERBS})\s+${base}?|"path"\s*:\s*"${base}?|(?:(?<![\w.~/\\-])|(?<=\\[nrt]))${base})`;
  return new RegExp(lead + body + String.raw`(?![\w-]|\.\w|/[\w{:[])`, 'gi');
}

function projectTableRegexes(name, columns) {
  const n = escapeProjectRe(name);
  const out = [new RegExp(String.raw`\b(?:tabelas?|tables?|from|join|into|update)\s+\\?["'\x60«]?(?:\w+\.)?${n}(?![\w])`, 'gi')];
  const cols = columns.filter((c) => typeof c === 'string' && c.trim()).map((c) => escapeProjectRe(c.trim()));
  if (cols.length) out.push(new RegExp(String.raw`(?<![\w.])${n}\.(?:${cols.join('|')})(?![\w])`, 'gi'));
  if (/[_.]/.test(name)) out.push(new RegExp(String.raw`(?<![\w.])${n}(?![\w])`, 'gi'));
  return out;
}

/**
 * @param {{paths?:string[], basePaths?:string[], tables?:{name:string, columns?:string[]}[]}} fontes
 * @returns {{routes:{key:string, hint:string, re:RegExp}[], tables:{key:string, hint:string, re:RegExp}[]}}
 */
export function buildProjectCitations({ paths = [], basePaths = [], tables = [] } = {}) {
  const routes = [];
  for (const p of paths) {
    const re = projectRouteRegex(p, basePaths);
    const literal = String(p).split('/').find((s) => s && !isProjectParamSegment(s));
    if (re) routes.push({ key: p, hint: literal ? `/${literal.toLowerCase()}` : '/', re });
  }
  const tbls = [];
  for (const t of tables) {
    if (typeof t?.name !== 'string' || !t.name.trim()) continue;
    const key = t.name.trim().toLowerCase();
    for (const name of new Set([key, key.split('.').pop()])) {
      for (const re of projectTableRegexes(name, Array.isArray(t.columns) ? t.columns : [])) tbls.push({ key, hint: name, re });
    }
  }
  return { routes, tables: tbls };
}

/** Citações de `kind` (`routes` | `tables`) no texto, na ordem dos gatilhos: `[{key, text}]`. */
export function findProjectCitations(text, citations, kind) {
  const found = [];
  const lower = String(text ?? '').toLowerCase();
  for (const { key, hint, re } of citations?.[kind] ?? []) {
    if (!lower.includes(hint)) continue;
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      found.push({ key, text: m[0].replace(/^"path"\s*:\s*"/i, '') });
      if (!m[0]) re.lastIndex++;
    }
  }
  return found;
}

/** Segmentos da rota sem query, sem prefixo de versão/base (`/v1`, `/api`, o caminho do servidor). */
export function projectRouteSegments(path, basePaths = []) {
  let segs = String(path ?? '').split(/[?#]/)[0].split('/').filter(Boolean);
  const bases = basePaths.map((b) => String(b).split('/').filter(Boolean)).filter((b) => b.length).sort((a, b) => b.length - a.length);
  const base = bases.find((b) => b.every((s, i) => String(segs[i] ?? '').toLowerCase() === s.toLowerCase()));
  if (base) segs = segs.slice(base.length);
  while (segs.length > 1 && /^(api|v\d+)$/i.test(segs[0])) segs = segs.slice(1);
  return segs;
}

/** Rota do contrato que corresponde a `path` (concreto ou template), a mais literal; `null` se nenhuma. */
export function projectRouteFor(path, templates, basePaths = []) {
  const alvo = projectRouteSegments(path, basePaths);
  let best = null;
  let bestScore = -1;
  for (const tpl of templates) {
    const segs = projectRouteSegments(tpl, basePaths);
    if (segs.length !== alvo.length) continue;
    let score = 0;
    const ok = segs.every((s, i) => {
      if (s.toLowerCase() === alvo[i].toLowerCase()) { score++; return true; }
      return isProjectParamSegment(s) || isProjectParamSegment(alvo[i]);
    });
    if (ok && score > bestScore) { best = tpl; bestScore = score; }
  }
  return best;
}
// </gatilhos-do-projeto>

// ---------------------------------------------------------------------------
// Serialização parcial (mesma semântica do validador)
// ---------------------------------------------------------------------------

/** Serializa `node` omitindo `omitKeys` em qualquer profundidade. */
export function serializeExcept(node, omitKeys) {
  const omit = new Set(omitKeys);
  const seen = new WeakSet();
  try {
    return (
      JSON.stringify(node, (key, value) => {
        if (omit.has(key)) return undefined;
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return undefined;
          seen.add(value);
        }
        return value;
      }) ?? ''
    );
  } catch {
    return '';
  }
}

/**
 * Rotas citadas pela task, como CHAVE do contrato quando há contrato (`/pedidos/{pedidoId}/envio`
 * para «POST /v1/pedidos/0b0b…/envio»), para que a busca em `tech.operations` ache a operação.
 * @returns {Map<string, Set<string>|null>} rota → verbos citados (`null` = citada sem verbo: todas
 *   as operações da rota), para não embutir o GET numa task que só cita o POST.
 */
function citedRoutes(task, tech) {
  const body = serializeExcept(task, ['apiContracts', 'apiContract']);
  const keys = tech?.operations ? [...tech.operations.keys()] : [];
  const out = new Map();
  const add = (route, verb) => {
    if (verb && out.get(route) !== null) out.set(route, new Set([...(out.get(route) ?? []), verb.toUpperCase()]));
    else out.set(route, null);
  };
  for (const raw of body.match(API_ROUTE_CITATION_ALL) ?? []) {
    const r = raw.replace(/[.,;)\\"']+$/, '');
    add(projectRouteFor(r, keys, tech?.basePaths ?? []) ?? r, null);
  }
  for (const hit of findProjectCitations(body, tech?.citations, 'routes')) {
    add(hit.key, new RegExp(`^(${PROJECT_ROUTE_VERBS})\\s`, 'i').exec(hit.text)?.[1] ?? null);
  }
  return out;
}

function citedTables(task, tech) {
  const body = serializeExcept(task, ['persistenceModel']);
  const out = new Set((body.match(PHYSICAL_TABLE_CITATION_ALL) ?? []).map((t) => t.toLowerCase()));
  for (const hit of findProjectCitations(body, tech?.citations, 'tables')) out.add(hit.key);
  return [...out];
}

// ---------------------------------------------------------------------------
// Leitor de YAML para o api-contracts.yaml
//
// O subconjunto que a spec-api-contracts escreve: mapa e lista em bloco, coleção em linha
// (`schema: { $ref: "…" }`, `- { name: pagina, in: query }`, `tags: [A, B]`), escalar com e sem
// aspas, escalar de bloco (`|`, `>`), comentário. Não é YAML completo — sem âncora, alias, tag nem
// chave complexa — e não pretende ser: o que ele não entende vira EXCEÇÃO, e exceção vira ausência
// de dado, isto é, LACUNA, nunca contrato adivinhado.
//
// Por que um leitor de verdade (D30 do teste ponta a ponta): a versão anterior lia a seção `paths:`
// linha a linha e só via `properties` escritas na própria operação. Contrato com `$ref` (o padrão
// da spec-api-contracts, inclusive no stub dela), response por `$ref` e parâmetro em linha não
// convertia nunca — nem o stub da própria skill.
// ---------------------------------------------------------------------------

/** Remove o comentário `# …` da linha (fora de aspas; `#` só abre comentário depois de espaço). */
function stripYamlComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (quote === '"' && c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if ((c === '"' || c === "'") && (i === 0 || /[\s:[{,-]/.test(line[i - 1]))) { quote = c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/** Índice do fim da string entre aspas que começa em `start` (aspa de fechamento), ou -1. */
function closingQuote(s, start) {
  const q = s[start];
  for (let j = start + 1; j < s.length; j++) {
    if (q === '"' && s[j] === '\\') { j++; continue; }
    if (s[j] === q) {
      if (q === "'" && s[j + 1] === "'") { j++; continue; }
      return j;
    }
  }
  return -1;
}

function yamlScalar(raw) {
  const s = String(raw ?? '').trim();
  if (s === '' || s === '~' || /^null$/i.test(s)) return null;
  if (s.startsWith('"')) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.startsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/** Coleção em linha: `{ a: b, c: [d, e] }` / `[a, "b, c"]`. */
function parseYamlFlow(src) {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const quoted = () => {
    const end = closingQuote(src, i);
    if (end < 0) throw new Error('aspas sem fechamento em coleção em linha');
    const raw = src.slice(i, end + 1);
    i = end + 1;
    return yamlScalar(raw);
  };
  const plain = (stops) => {
    const start = i;
    while (i < src.length && !stops.includes(src[i])) i++;
    return yamlScalar(src.slice(start, i));
  };
  const key = () => {
    ws();
    if (src[i] === '"' || src[i] === "'") return String(quoted());
    const start = i;
    while (i < src.length && src[i] !== ',' && src[i] !== '}' && !(src[i] === ':' && /[\s,}\]]/.test(src[i + 1] ?? ' '))) i++;
    return src.slice(start, i).trim();
  };
  const value = (stops) => {
    ws();
    if (src[i] === '{') return map();
    if (src[i] === '[') return seq();
    if (src[i] === '"' || src[i] === "'") return quoted();
    return plain(stops);
  };
  function map() {
    i++;
    const obj = {};
    for (;;) {
      ws();
      if (src[i] === '}') { i++; return obj; }
      const k = key();
      ws();
      let v = null;
      if (src[i] === ':') { i++; v = value(',}'); }
      obj[k] = v;
      ws();
      if (src[i] === ',') { i++; continue; }
      if (src[i] === '}') { i++; return obj; }
      throw new Error('mapa em linha malformado');
    }
  }
  function seq() {
    i++;
    const out = [];
    for (;;) {
      ws();
      if (src[i] === ']') { i++; return out; }
      out.push(value(',]'));
      ws();
      if (src[i] === ',') { i++; continue; }
      if (src[i] === ']') { i++; return out; }
      throw new Error('lista em linha malformada');
    }
  }
  const v = value('');
  ws();
  if (i < src.length) throw new Error('texto depois da coleção em linha');
  return v;
}

/** Colchetes/chaves equilibrados (fora de aspas) — para juntar coleção em linha de várias linhas. */
function flowBalanced(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' || s[i] === "'") {
      const end = closingQuote(s, i);
      if (end < 0) return false;
      i = end;
      continue;
    }
    if (s[i] === '{' || s[i] === '[') depth++;
    else if (s[i] === '}' || s[i] === ']') depth--;
  }
  return depth <= 0;
}

/** Posição do `:` que separa chave e valor (`chave: valor` / `chave:`), ou -1. */
function yamlKeyColon(text) {
  if (text.startsWith('"') || text.startsWith("'")) {
    const end = closingQuote(text, 0);
    if (end < 0) return -1;
    return /^\s*:(\s|$)/.test(text.slice(end + 1)) ? text.indexOf(':', end + 1) : -1;
  }
  if (text.startsWith('{') || text.startsWith('[')) return -1;
  for (let j = 0; j < text.length; j++) {
    if (text[j] === ':' && (j + 1 === text.length || /\s/.test(text[j + 1]))) return j;
  }
  return -1;
}

/** Documento YAML → objeto JS. Lança erro no que não entende (o chamador trata como fonte ausente). */
export function parseYamlDocument(text) {
  const L = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n').map((raw) => {
    const t = stripYamlComment(raw).replace(/\s+$/, '');
    return { raw, blank: t.trim() === '' || t.trim() === '---', indent: t.length - t.trimStart().length, text: t.trim() };
  });
  let i = 0;
  const skip = () => { while (i < L.length && L[i].blank) i++; };
  const isSeq = (ln) => ln.text === '-' || ln.text.startsWith('- ');
  const isBlockHeader = (s) => /^[|>][+-]?\d*$/.test(s);

  function node(minIndent) {
    skip();
    if (i >= L.length || L[i].indent < minIndent) return null;
    return isSeq(L[i]) ? seqAt(L[i].indent) : mapAt(L[i].indent);
  }
  function mapAt(ind) {
    const obj = {};
    for (;;) {
      skip();
      if (i >= L.length || L[i].indent < ind) return obj;
      if (L[i].indent > ind) throw new Error(`indentação inesperada na linha ${i + 1}`);
      if (isSeq(L[i])) return obj;
      const colon = yamlKeyColon(L[i].text);
      if (colon < 0) throw new Error(`linha ${i + 1} sem «chave:»`);
      const rawKey = L[i].text.slice(0, colon).trim();
      const key = rawKey.startsWith('"') || rawKey.startsWith("'") ? String(yamlScalar(rawKey)) : rawKey;
      const rest = L[i].text.slice(colon + 1).trim();
      i++;
      obj[key] = valueAfterKey(rest, ind);
    }
  }
  function valueAfterKey(rest, ind) {
    if (rest === '') {
      skip();
      if (i < L.length && L[i].indent > ind) return node(L[i].indent);
      if (i < L.length && L[i].indent === ind && isSeq(L[i])) return seqAt(ind);
      return null;
    }
    if (isBlockHeader(rest)) return blockScalar(rest, ind);
    return inlineValue(rest, ind);
  }
  function inlineValue(rest, ind) {
    if (rest.startsWith('{') || rest.startsWith('[')) {
      let src = rest;
      while (!flowBalanced(src) && i < L.length) { src += ` ${L[i].text}`; i++; }
      return parseYamlFlow(src);
    }
    if ((rest.startsWith('"') || rest.startsWith("'")) && closingQuote(rest, 0) < 0) {
      let src = rest;
      while (closingQuote(src, 0) < 0 && i < L.length) { src += ` ${L[i].raw.trim()}`; i++; }
      return yamlScalar(src);
    }
    // Escalar simples em várias linhas: as linhas seguintes, mais indentadas, continuam o valor.
    let s = rest;
    while (i < L.length && !L[i].blank && L[i].indent > ind && yamlKeyColon(L[i].text) < 0 && !isSeq(L[i])) { s += ` ${L[i].text}`; i++; }
    return yamlScalar(s);
  }
  function blockScalar(header, ind) {
    const lines = [];
    let blockIndent = -1;
    while (i < L.length) {
      const raw = L[i].raw;
      if (raw.trim() === '') { lines.push(''); i++; continue; }
      const rawIndent = raw.length - raw.trimStart().length;
      if (rawIndent <= ind || (blockIndent >= 0 && rawIndent < blockIndent)) break;
      if (blockIndent < 0) blockIndent = rawIndent;
      lines.push(raw.slice(blockIndent));
      i++;
    }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    const body = lines.join('\n');
    return header.startsWith('>') ? body.replace(/([^\n])\n(?=[^\n])/g, '$1 ') : body;
  }
  function seqAt(ind) {
    const out = [];
    for (;;) {
      skip();
      if (i >= L.length || L[i].indent !== ind || !isSeq(L[i])) return out;
      const ln = L[i];
      const after = ln.text === '-' ? '' : ln.text.slice(1).trimStart();
      if (after === '') { i++; out.push(node(ind + 1)); continue; }
      if (yamlKeyColon(after) >= 0) {
        // «- chave: valor» — um mapa cuja primeira chave fica na coluna de «chave».
        L[i] = { ...ln, indent: ln.indent + (ln.text.length - after.length), text: after };
        out.push(mapAt(L[i].indent));
        continue;
      }
      i++;
      out.push(isBlockHeader(after) ? blockScalar(after, ind) : inlineValue(after, ind));
    }
  }

  skip();
  if (i >= L.length) return {};
  const docNode = node(0);
  skip();
  if (i < L.length) throw new Error(`conteúdo não lido a partir da linha ${i + 1}`);
  return docNode;
}

// ---------------------------------------------------------------------------
// OpenAPI → operações e compact-prose
// ---------------------------------------------------------------------------

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

/** Alvo de um `$ref` local (`#/components/schemas/X`). Referência externa → `undefined`. */
function refTarget(doc, ref) {
  const m = /^#\/(.*)$/.exec(String(ref ?? ''));
  if (!m) return undefined;
  return m[1].split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~')).reduce((o, k) => (isObj(o) ? o[k] : undefined), doc);
}

/** Segue `$ref` locais (até 8 saltos, para não girar em ciclo). */
function deref(doc, node) {
  let n = node;
  for (let k = 0; isObj(n) && typeof n.$ref === 'string' && k < 8; k++) n = refTarget(doc, n.$ref);
  return n;
}

const refName = (node) => (isObj(node) && typeof node.$ref === 'string' ? node.$ref.split('/').pop() : null);
const oneLine = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');

/** Caminhos de `servers[].url` (`http://host/v1` → `/v1`) — prefixo que a rota citada pode trazer. */
function serverBasePaths(doc) {
  const out = [];
  for (const s of arr(doc?.servers)) {
    const url = String(s?.url ?? '');
    const p = (/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/[^?#]*)?/i.exec(url)?.[1] ?? (url.startsWith('/') ? url : '')).replace(/\/+$/, '');
    if (p) out.push(p);
  }
  return [...new Set(out)];
}

/** Tipo de um schema em prosa curta: `string uuid`, `array<ItemPedidoRequest>`, `enum=[A, B]`. */
function describeSchema(doc, raw) {
  const ref = refName(raw);
  const s = deref(doc, raw);
  const sch = isObj(s) ? s : {};
  let type = sch.type ?? (ref || (isObj(sch.properties) || sch.allOf ? 'object' : null));
  if (type === 'array') {
    const it = sch.items;
    const itS = deref(doc, it);
    type = `array<${refName(it) ?? (isObj(itS) ? itS.type : null) ?? 'object'}>`;
  } else if (ref && sch.type === 'object') {
    type = ref;
  }
  const bits = [type ?? 'object', sch.format, sch.nullable === true ? 'nullable' : null, Array.isArray(sch.enum) ? `enum=[${sch.enum.join(', ')}]` : null]
    .filter(Boolean);
  return { bits, description: oneLine(sch.description) };
}

/** Propriedades de um schema de corpo, resolvendo `$ref` e `allOf`. */
function schemaProperties(doc, schemaNode, seen = new Set()) {
  const name = refName(schemaNode);
  if (name && seen.has(name)) return [];
  const visto = name ? new Set([...seen, name]) : seen;
  const s = deref(doc, schemaNode);
  if (!isObj(s)) return [];
  const out = [];
  for (const part of arr(s.allOf)) out.push(...schemaProperties(doc, part, visto));
  const required = new Set(arr(s.required).map(String));
  if (isObj(s.properties)) {
    for (const [prop, raw] of Object.entries(s.properties)) out.push({ name: prop, required: required.has(prop), ...describeSchema(doc, raw) });
  }
  const unicas = new Map();
  for (const p of out) unicas.set(p.name, p);
  return [...unicas.values()];
}

const proseItem = (p) => `${p.name} (${[...p.bits, p.required ? 'required' : null].filter(Boolean).join(' ')}${p.description ? ` — ${p.description}` : ''})`;

/** Esquemas de segurança em prosa: `SessionCookie (apiKey em cookie «session»)`. */
function describeSecurity(doc, requirements) {
  const schemes = isObj(doc?.components?.securitySchemes) ? doc.components.securitySchemes : {};
  const alternativas = arr(requirements).filter(isObj).map((req) => Object.entries(req).map(([nome, escopos]) => {
    const sc = deref(doc, schemes[nome]);
    const det = isObj(sc)
      ? [sc.type, sc.scheme, sc.bearerFormat, sc.in ? `em ${sc.in}${sc.name ? ` «${sc.name}»` : ''}` : null].filter(Boolean).join(' ')
      : '';
    const esc = arr(escopos).length ? `; escopos: ${arr(escopos).join(', ')}` : '';
    return `${nome}${det || esc ? ` (${det}${esc})` : ''}`;
  }).join(' + ')).filter(Boolean);
  return alternativas.join(' ou ');
}

/** Operações de um documento OpenAPI já lido, indexadas por path. */
function operationsFromDocument(doc) {
  /** @type {Map<string, {path:string, method:string, operation:object, pathItem:object, doc:object}[]>} */
  const byPath = new Map();
  if (!isObj(doc?.paths)) return byPath;
  for (const [path, rawItem] of Object.entries(doc.paths)) {
    const item = deref(doc, rawItem);
    if (!String(path).startsWith('/') || !isObj(item)) continue;
    const ops = [];
    for (const [m, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(m.toLowerCase()) || !isObj(operation)) continue;
      ops.push({ path, method: m.toUpperCase(), operation, pathItem: item, doc });
    }
    if (ops.length) byPath.set(path, ops);
  }
  return byPath;
}

/**
 * Extrai as operações de um OpenAPI YAML. YAML que o leitor não entende → mapa vazio (lacuna).
 * @returns {Map<string, {path:string, method:string, operation:object, pathItem:object, doc:object}[]>} indexado por path
 */
export function extractOpenApiOperations(yamlText) {
  try {
    return operationsFromDocument(parseYamlDocument(yamlText));
  } catch {
    return new Map();
  }
}

/**
 * Converte uma operação OpenAPI em contrato compact-prose v5.3.
 * Resolve `$ref` locais (schema, response, parameter, requestBody, securityScheme) e lê o `security`
 * da operação ou, sem ele, o global do documento — o documento viaja com a operação, então a
 * chamada direta, sem `opts`, já basta.
 * @returns {{contract:object|null, missing:string[]}} `missing` explica por que não deu.
 */
export function operationToCompactProse(op, opts = {}) {
  const { path, method } = op;
  const doc = isObj(op?.doc) ? op.doc : {};
  const operation = isObj(op?.operation) ? op.operation : {};
  const missing = [];

  const operationId = isNonEmptyString(operation.operationId) ? operation.operationId : null;
  const summary = oneLine(operation.summary);
  const description = oneLine(operation.description);
  const tags = arr(operation.tags).map(String).filter(Boolean);
  const permission = operation['x-permissao'] ?? operation['x-permission'];

  // auth — o gate de qualidade exige string não vazia. `security: []` na operação = pública.
  const authParts = [];
  if (Array.isArray(operation.security)) {
    authParts.push(operation.security.length
      ? `Esquema de segurança da operação: ${describeSecurity(doc, operation.security)}`
      : 'Público — a operação declara security: [] (sem autenticação)');
  } else if (Array.isArray(doc.security) && doc.security.length) {
    authParts.push(`Esquema de segurança do documento: ${describeSecurity(doc, doc.security)}`);
  } else if (isNonEmptyString(opts.globalSecurity)) {
    authParts.push(opts.globalSecurity);
  }
  if (isNonEmptyString(permission)) authParts.push(`Autorização declarativa pela permissão ${permission}`);
  const auth = authParts.join('. ');
  if (!isNonEmptyString(auth)) missing.push('auth (nem x-permissao na operação nem security na operação ou no documento)');

  // request — Body do requestBody; Path/Query/Headers dos parameters (do path e da operação).
  const requestParts = [];
  const rb = deref(doc, operation.requestBody);
  if (isObj(rb) && isObj(rb.content)) {
    const media = Object.keys(rb.content).find((k) => /json/i.test(k)) ?? Object.keys(rb.content)[0];
    const props = schemaProperties(doc, rb.content[media]?.schema);
    if (props.length) requestParts.push(`Body: ${props.map(proseItem).join('; ')}`);
    else if (media) {
      const { bits } = describeSchema(doc, rb.content[media]?.schema);
      requestParts.push(`Body: ${media} (${bits.join(' ')})`);
    }
  }
  const params = new Map();
  for (const raw of [...arr(op?.pathItem?.parameters), ...arr(operation.parameters)]) {
    const p = deref(doc, raw);
    if (isObj(p) && isNonEmptyString(p.name) && isNonEmptyString(p.in)) {
      params.set(`${p.in}:${p.name}`, { name: p.name, in: p.in, required: p.required === true, ...describeSchema(doc, p.schema), description: oneLine(p.description) });
    }
  }
  const byIn = (where) => [...params.values()].filter((p) => p.in === where);
  const pathParams = [...String(path).matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  const pathItems = [...pathParams.map((n) => params.get(`path:${n}`) ?? { name: n, bits: [], required: true, description: '' })];
  for (const p of byIn('path')) if (!pathParams.includes(p.name)) pathItems.push(p);
  const fmt = (p) => (p.bits.length || p.description ? proseItem({ ...p, required: p.in === 'path' ? false : p.required }) : p.name);
  if (pathItems.length) requestParts.push(`Path: ${pathItems.map(fmt).join('; ')}`);
  if (byIn('query').length) requestParts.push(`Query: ${byIn('query').map(fmt).join('; ')}`);
  const headers = [...byIn('header').map(fmt), ...byIn('cookie').map((p) => `Cookie ${fmt(p)}`)];
  if (headers.length) requestParts.push(`Headers: ${headers.join('; ')}`);
  const request = requestParts.join(' | ');
  if (!/\b(Body|Path|Query|Headers)\s*:/i.test(request)) {
    missing.push('request (nenhum Body:/Path:/Query:/Headers: extraível da operação)');
  }

  // responses — o gate exige ao menos um 2xx e um 4xx; 5xx é aviso no gate (D30).
  const respMap = isObj(operation.responses) ? operation.responses : {};
  const codes = Object.keys(respMap).filter((c) => /^\d{3}$/.test(c));
  const responses = codes
    .map((c) => {
      const r = deref(doc, respMap[c]);
      const content = isObj(r?.content) ? r.content : {};
      const media = Object.keys(content)[0];
      const schemaName = media ? refName(content[media]?.schema) : null;
      const d = oneLine(r?.description);
      return `${c}${media ? ` ${media}` : ''}${d ? ` — ${d}` : ''}${schemaName ? ` (schema ${schemaName})` : ''}`.replace(/\s*\|\s*/g, ' / ');
    })
    .join(' | ');
  for (const [cls, re] of [['2xx', /^2/], ['4xx', /^4/]]) {
    if (!codes.some((c) => re.test(c))) missing.push(`responses: nenhum ${cls} declarado na operação`);
  }

  if (missing.length) return { contract: null, missing };

  return {
    contract: {
      operationId: operationId ?? `${method.toLowerCase()}${path.replace(/[^a-z0-9]+/gi, '-')}`,
      method,
      path,
      signature: `${method} ${path}`,
      ...(isNonEmptyString(summary) ? { summary } : {}),
      ...(isNonEmptyString(description || summary) ? { description: description || summary } : {}),
      auth,
      request,
      responses,
      ...(isNonEmptyString(opts.policies) ? { policies: opts.policies } : {}),
      openApiRef: `${opts.apiDocName ?? 'api-contracts.yaml'}#/paths/${path.replace(/~/g, '~0').replace(/\//g, '~1')}/${method.toLowerCase()}`,
      ...(tags.length ? { tags } : {})
    },
    missing: []
  };
}

// ---------------------------------------------------------------------------
// data-model.json → persistenceModel.entities[] (compact-prose)
// ---------------------------------------------------------------------------

/** Índice tableName → {entity, bc}. Registra também a chave sem prefixo de schema. */
export function indexDataModelEntities(dataModel) {
  const out = new Map();
  const register = (key, value) => {
    if (!isNonEmptyString(key)) return;
    const k = key.toLowerCase().trim();
    if (!out.has(k)) out.set(k, value);
  };
  const contexts = arr(dataModel?.boundedContexts);
  const flat = contexts.length ? contexts : [{ id: null, name: null, entities: arr(dataModel?.entities) }];
  for (const bc of flat) {
    for (const e of arr(bc?.entities)) {
      const table = e?.tableName ?? e?.table ?? e?.name;
      const value = { entity: e, bcId: bc?.id ?? null, bcName: bc?.name ?? null };
      register(table, value);
      if (isNonEmptyString(table) && table.includes('.')) register(table.split('.').pop(), value);
    }
  }
  return out;
}

/** Uma coluna do data-model em segmento compact-prose. */
function columnToSegment(col, primaryKey) {
  const name = col?.name ?? '?';
  const type = col?.type ?? '';
  const pk = arr(primaryKey).map((p) => String(p).toLowerCase()).includes(String(name).toLowerCase());
  const bits = [
    name,
    type,
    pk ? 'PK' : null,
    col?.nullable === false ? 'NOT NULL' : col?.nullable === true ? 'NULL' : null,
    col?.unique === true && !pk ? 'UNIQUE' : null,
    col?.operationType ? `[${col.operationType}]` : null
  ].filter(Boolean).join(' ');
  const desc = col?.notes ?? col?.description ?? col?.comment ?? '';
  return desc ? `${bits} — ${desc}` : bits;
}

const joinProse = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : [v?.name, v?.columns && `(${arr(v.columns).join(', ')})`, v?.purpose ?? v?.notes ?? v?.description].filter(Boolean).join(' ')))
      .filter(Boolean)
      .join(' | ');
  }
  return isNonEmptyString(value) ? value : '';
};

/**
 * Converte uma entidade do data-model em entrada de `persistenceModel.entities[]`.
 * @returns {{entity:object|null, missing:string[]}}
 */
export function entityToCompactProse(found, opts = {}) {
  const e = found?.entity;
  const missing = [];
  if (!isObj(e)) return { entity: null, missing: ['entidade não encontrada no data-model'] };

  const table = e.tableName ?? e.table ?? e.name;
  if (!isNonEmptyString(table)) missing.push('tableName ausente na entidade do data-model');

  const columns = arr(e.columns);
  if (!columns.length) missing.push('columns[] vazio na entidade do data-model');
  const colProse = columns.map((c) => columnToSegment(c, e.primaryKey)).join(' | ');
  // Gate de qualidade: ao menos um segmento com TIPO e descrição. Sem isso, escrever o bloco só
  // trocaria um FATAL de presença por um FATAL de qualidade.
  if (columns.length && !columns.some((c) => isNonEmptyString(c?.type) && isNonEmptyString(c?.notes ?? c?.description ?? c?.comment))) {
    missing.push('nenhuma coluna do data-model tem type + notes (o gate de qualidade exige tipo e descrição)');
  }
  if (missing.length) return { entity: null, missing };

  const uniqueCols = columns.filter((c) => c?.unique === true && !arr(e.primaryKey).includes(c?.name)).map((c) => c.name);

  const out = {
    table,
    ...(isNonEmptyString(e.purpose) ? { purpose: e.purpose } : {}),
    ...(found.bcName ? { boundedContext: found.bcName } : {}),
    ...(e.operationType ? { operationType: e.operationType } : {}),
    ...(e.identifierStrategy ? { identifierStrategy: e.identifierStrategy } : {}),
    ...(arr(e.primaryKey).length ? { primaryKey: arr(e.primaryKey).join(', ') } : {}),
    columns: colProse,
    ...(joinProse(e.relationships) ? { relationships: joinProse(e.relationships) } : {}),
    ...(joinProse(e.indexes) ? { indexes: joinProse(e.indexes) } : {}),
    ...(uniqueCols.length ? { uniqueConstraints: uniqueCols.map((c) => `UNIQUE (${c})`).join(' | ') } : {}),
    ...(joinProse(e.checkConstraints) ? { checkConstraints: joinProse(e.checkConstraints) } : {}),
    ...(isNonEmptyString(e.migrationNotes) ? { migrationNotes: e.migrationNotes } : {}),
    dataModelRef: `${opts.dataModelName ?? 'data-model.json'}#/boundedContexts/${found.bcId ?? '?'}/entities/${table}`
  };
  return { entity: out, missing: [] };
}

// ---------------------------------------------------------------------------
// Carga das fontes técnicas
// ---------------------------------------------------------------------------

const API_DOC_NAMES = ['api-contracts.yaml', 'api-contracts.yml', 'api-contracts_change.yaml', 'api-contracts_change.yml'];
const DATA_MODEL_NAMES = ['data-model.json', 'data-model_change.json'];

/**
 * Localiza e carrega `api-contracts.yaml` e `data-model.json` no diretório de outputs, e monta os
 * gatilhos de citação do projeto (rotas do contrato, tabelas e colunas do modelo).
 * @returns {null|{apiDocName:string|null, operations:Map, dataModelName:string|null, entities:Map, globalSecurity:string|null, basePaths:string[], citations:object}}
 */
export function loadTechnicalSources(dir) {
  if (!isNonEmptyString(dir) || !existsSync(dir)) return null;

  let apiDocName = null;
  let operations = new Map();
  let globalSecurity = null;
  let basePaths = [];
  for (const name of API_DOC_NAMES) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    apiDocName = name;
    try {
      const doc = parseYamlDocument(readFileSync(p, 'utf8'));
      operations = operationsFromDocument(doc);
      basePaths = serverBasePaths(doc);
      // `security` de nível 0 → esquema global aplicável a toda operação (a operação também o lê
      // do documento; aqui fica para o resumo e para quem chama operationToCompactProse com opts).
      if (Array.isArray(doc?.security) && doc.security.length) {
        globalSecurity = `Esquema de segurança do documento: ${describeSecurity(doc, doc.security)}`;
      }
    } catch { /* fonte ilegível é ausência de fonte, não erro fatal: as citações viram lacuna */ }
    break;
  }

  let dataModelName = null;
  let entities = new Map();
  for (const name of DATA_MODEL_NAMES) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    try {
      entities = indexDataModelEntities(JSON.parse(readFileSync(p, 'utf8')));
      dataModelName = name;
    } catch { /* idem */ }
    break;
  }

  if (!apiDocName && !dataModelName) return null;
  const tables = [...new Set(entities.values())].map((v) => v.entity).filter(isObj)
    .filter((e, i, all) => all.indexOf(e) === i)
    .map((e) => ({ name: e.tableName ?? e.table ?? e.name, columns: arr(e.columns).map((c) => c?.name).filter(isNonEmptyString) }));
  const citations = buildProjectCitations({ paths: [...operations.keys()], basePaths, tables });
  return { apiDocName, operations, dataModelName, entities, globalSecurity, basePaths, citations };
}

export function summarizeTechnicalSources(tech) {
  if (!tech) return null;
  return {
    apiContracts: tech.apiDocName,
    operations: tech.operations?.size ?? 0,
    dataModel: tech.dataModelName,
    entities: tech.entities?.size ?? 0
  };
}

// ---------------------------------------------------------------------------
// Passe de cobertura de contrato por task
// ---------------------------------------------------------------------------

/** Classes isentas do contrato técnico — idêntico ao validador. */
const CLASS_EXEMPT_TECHNICAL = new Set(['uat', 'spike']);

function resolveTaskClass(task) {
  const explicit = String(task?.class ?? '').toLowerCase();
  if (explicit) return explicit;
  if (task?.generatedBy === 'spec-security-review') return 'security';
  if (task?.generatedBy === 'spec-test-plan') return 'uat';
  if (String(task?.testType ?? '').toUpperCase() === 'UAT') return 'uat';
  if (isObj(task?.spike)) return 'spike';
  if (/\bspike\b/i.test(String(task?.type ?? '')) || /\bspike\b/i.test(String(task?.adoWorkItemType ?? ''))) return 'spike';
  if (/^\s*(\[?spike\]?\b|spike\s*[:—-])/i.test(String(task?.title ?? ''))) return 'spike';
  if (/^SPIKE[-_]/i.test(String(task?.id ?? ''))) return 'spike';
  return 'functional';
}

/**
 * Garante cobertura de `apiContracts[]` / `persistenceModel.entities[]` nas tasks do documento.
 *
 * @param {object} doc            tasks.json já carregado (modificado in-place)
 * @param {object} options
 *   - `tech`   índice de fontes técnicas (loadTechnicalSources) — sem ele, só relata
 *   - `gaps`   array onde as lacunas são acumuladas (o chamador grava em metadata)
 *   - `report` objeto para contadores/changes
 * @returns {{filledApi:number, filledEntities:number, gapCount:number, tasksTouched:number}}
 */
export function enrichTaskContracts(doc, options = {}) {
  const tech = options.tech ?? null;
  const gaps = Array.isArray(options.gaps) ? options.gaps : [];
  const changes = Array.isArray(options.changes) ? options.changes : [];

  let filledApi = 0;
  let filledEntities = 0;
  const touched = new Set();

  const tasks = [];
  for (const story of arr(doc?.stories)) for (const t of arr(story?.tasks)) tasks.push(t);
  for (const t of arr(doc?.tasks)) tasks.push(t);

  for (const task of tasks) {
    if (CLASS_EXEMPT_TECHNICAL.has(resolveTaskClass(task))) continue;
    const scope = isNonEmptyString(task?.id) ? task.id : '(task sem id)';

    // --- apiContracts -------------------------------------------------------
    const hasApi = arr(task.apiContracts).length > 0 || isObj(task.apiContract);
    if (!hasApi) {
      const routes = citedRoutes(task, tech);
      for (const [route, verbs] of routes) {
        const all = tech?.operations?.get(route) ?? null;
        // Citada com verbo → só as operações citadas (se o verbo existe no contrato); sem verbo → todas.
        const ops = all && verbs && all.some((o) => verbs.has(o.method)) ? all.filter((o) => verbs.has(o.method)) : all;
        if (!ops?.length) {
          gaps.push({
            scope,
            field: 'apiContracts',
            reason: tech?.apiDocName
              ? `a task cita «${route}» e não tem apiContracts[]; a operação não foi localizada em ${tech.apiDocName} — embutir manualmente o contrato completo (compact-prose v5.3)`
              : `a task cita «${route}» e não tem apiContracts[]; nenhum api-contracts.yaml disponível no diretório de outputs — embutir manualmente o contrato completo`
          });
          continue;
        }
        for (const op of ops) {
          const { contract, missing } = operationToCompactProse(op, {
            apiDocName: tech.apiDocName,
            globalSecurity: tech.globalSecurity
          });
          if (!contract) {
            gaps.push({
              scope,
              field: 'apiContracts',
              reason: `a task cita «${route}» e o contrato não pôde ser embutido a partir de ${tech.apiDocName} sem ficar incompleto: ${missing.join('; ')}. Contrato pela metade é pior que nenhum — embutir manualmente`
            });
            continue;
          }
          task.apiContracts = arr(task.apiContracts);
          if (!task.apiContracts.some((c) => c?.operationId === contract.operationId || c?.signature === contract.signature)) {
            task.apiContracts.push(contract);
            filledApi++;
            touched.add(scope);
            changes.push({ scope, field: 'apiContracts', action: `filled:${contract.signature}` });
          }
        }
      }
    }

    // --- persistenceModel ---------------------------------------------------
    const pm = isObj(task.persistenceModel) ? task.persistenceModel : null;
    const existing = pm ? arr(pm.entities) : [];
    if (!existing.length) {
      const tables = citedTables(task, tech);
      for (const table of tables) {
        const found = tech?.entities?.get(table) ?? null;
        if (!found) {
          gaps.push({
            scope,
            field: 'persistenceModel.entities',
            reason: tech?.dataModelName
              ? `a task cita «${table}» e não tem persistenceModel.entities[]; a entidade não foi localizada em ${tech.dataModelName} — embutir manualmente a entidade completa`
              : `a task cita «${table}» e não tem persistenceModel.entities[]; nenhum data-model.json disponível no diretório de outputs — embutir manualmente a entidade completa`
          });
          continue;
        }
        const { entity, missing } = entityToCompactProse(found, { dataModelName: tech.dataModelName });
        if (!entity) {
          gaps.push({
            scope,
            field: 'persistenceModel.entities',
            reason: `a task cita «${table}» e a entidade não pôde ser embutida a partir de ${tech.dataModelName} sem ficar incompleta: ${missing.join('; ')} — embutir manualmente`
          });
          continue;
        }
        task.persistenceModel = isObj(task.persistenceModel) ? task.persistenceModel : {};
        task.persistenceModel.entities = arr(task.persistenceModel.entities);
        if (!task.persistenceModel.entities.some((x) => String(x?.table ?? '').toLowerCase() === String(entity.table).toLowerCase())) {
          task.persistenceModel.entities.push(entity);
          filledEntities++;
          touched.add(scope);
          changes.push({ scope, field: 'persistenceModel.entities', action: `filled:${entity.table}` });
        }
      }
    }
  }

  return { filledApi, filledEntities, gapCount: gaps.length, tasksTouched: touched.size };
}
