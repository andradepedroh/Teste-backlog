// glossary.mjs — glossário e marcação automática de siglas no texto do relatório.
//
// O problema real: um relatório de integração fiscal usa AQS, NLP, EAP, UO, DDL e SLO na
// primeira página. Quem patrocina o projeto não sabe o que são, e quem escreveu não
// percebe mais que são jargão. Repetir a definição a cada ocorrência polui; deixar sem
// definição exclui o leitor.
//
// A regra adotada: a PRIMEIRA ocorrência de cada termo EM CADA DOMÍNIO vira um
// `<abbr class="gl" title="definição"><a href="#anexos/gloss-termo">TERMO</a></abbr>`.
// Por domínio, e não por documento inteiro, porque as abas são lidas isoladamente —
// quem abre direto em "Testes" nunca passou pela primeira ocorrência no "Sumário".
//
// A marcação é feita sobre o HTML já montado, com duas salvaguardas que não podem cair:
//   1. nada é substituído dentro de tag, de atributo, de <code>, de <pre>, de <script>,
//      de <style>, de <abbr> ou de <svg> — trocar texto dentro de um atributo produziria
//      HTML inválido, e dentro de <code> descaracterizaria um identificador de código;
//   2. o par de marcadores <!--NOGLOSS--> … <!--/NOGLOSS--> desliga a marcação num
//      trecho — usado no próprio glossário, que senão se autorreferenciaria.

import { attr, esc } from "./escape.mjs";

/**
 * Normaliza a lista de termos vinda do artefato.
 * Aceita array de objetos ou mapa { termo: definição }.
 */
export function normalizeGlossary(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.terms) ? raw.terms
    : (raw && typeof raw === "object" ? Object.entries(raw).map(([term, v]) => (
      typeof v === "string" ? { term, definition: v } : { term, ...v }
    )) : []);

  return list
    .map((t) => ({
      term: String(t.term || t.id || t.sigla || "").trim(),
      expansion: t.expansion || t.expansao || t.full || null,
      definition: String(t.definition || t.definicao || t.desc || "").trim(),
      // `match` permite casar variações sem repetir o verbete: "Perna 2" e "AQS".
      match: (t.match || t.aliases || []).map((m) => String(m).trim()).filter(Boolean),
    }))
    .filter((t) => t.term && t.definition)
    .map((t) => ({ ...t, id: `gloss-${slugTerm(t.term)}` }));
}

function slugTerm(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || "termo";
}

/** Texto do `title=` do abbr: expansão + definição, como o leitor lê no hover. */
function tooltip(t) {
  return t.expansion ? `${t.term} — ${t.expansion} — ${t.definition}` : t.definition;
}

/**
 * Marca a primeira ocorrência de cada termo no HTML de um domínio.
 *
 * Retorna o HTML marcado. Se não houver glossário, devolve a entrada intacta —
 * é o caminho normal em projeto que não declarou termos, e não é um erro.
 */
export function annotate(html, terms, { anchorPrefix = "#anexos/" } = {}) {
  if (!html || !terms || !terms.length) return html;

  // Ordem: expressões mais longas primeiro, senão "Perna 2" nunca casaria porque
  // "Perna" já teria sido consumido por um verbete mais curto.
  const entries = [];
  for (const t of terms) {
    for (const needle of [t.term, ...t.match]) {
      if (needle) entries.push({ needle, term: t });
    }
  }
  entries.sort((a, b) => b.needle.length - a.needle.length);

  const used = new Set();
  const segments = splitProtected(html);

  return segments.map((seg) => {
    if (!seg.text) return seg.raw;
    let out = seg.raw;
    for (const { needle, term } of entries) {
      if (used.has(term.id)) continue;
      const re = new RegExp(`(^|[^\\p{L}\\p{N}_-])(${escapeRe(needle)})(?![\\p{L}\\p{N}_-])`, "u");
      const m = re.exec(out);
      if (!m) continue;
      const replacement = `${m[1]}<abbr class="gl" title="${attr(tooltip(term))}"><a href="${attr(anchorPrefix + term.id)}">${esc(m[2])}</a></abbr>`;
      out = out.slice(0, m.index) + replacement + out.slice(m.index + m[0].length);
      used.add(term.id);
    }
    return out;
  }).join("");
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Fatia o HTML em trechos marcáveis e trechos protegidos.
 *
 * Protegidos: tudo dentro de `< … >` (tags e atributos) e o CONTEÚDO de code, pre,
 * script, style, abbr, svg e dos blocos NOGLOSS. Um `.replace()` ingênuo sobre o
 * HTML inteiro trocaria `AQS` dentro de `title="… AQS …"` e quebraria o atributo.
 */
function splitProtected(html) {
  const out = [];
  const re = /<!--NOGLOSS-->[\s\S]*?<!--\/NOGLOSS-->|<(code|pre|script|style|abbr|svg)\b[\s\S]*?<\/\1>|<[^>]*>|<!--[\s\S]*?-->/gi;
  let last = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m.index > last) out.push({ raw: html.slice(last, m.index), text: true });
    out.push({ raw: m[0], text: false });
    last = m.index + m[0].length;
  }
  if (last < html.length) out.push({ raw: html.slice(last), text: true });
  return out;
}

/**
 * O verbete do glossário em si — sai envolto em NOGLOSS para não se automarcar.
 * Agrupa por letra inicial, com índice alfabético só das letras que existem.
 */
export function renderGlossary(terms) {
  const data = (terms || []).slice().sort((a, b) => a.term.localeCompare(b.term, "pt-BR", { sensitivity: "base" }));
  if (!data.length) return "";

  const groups = new Map();
  for (const t of data) {
    const letter = firstLetter(t.term);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(t);
  }

  const letters = [...groups.keys()];
  const index = `<p class="gloss-index">${letters.map((l) => `<a href="#anexos/gloss-letra-${l.toLowerCase()}">${esc(l)}</a>`).join(" · ")}</p>`;

  const body = letters.map((l) => {
    const head = `<dt class="gloss-letter" id="gloss-letra-${l.toLowerCase()}">${esc(l)}</dt>`;
    const items = groups.get(l).map((t) => `  <dt id="${attr(t.id)}"><strong>${esc(t.term)}</strong>${t.expansion ? ` <span class="muted">— ${esc(t.expansion)}</span>` : ""}</dt>
  <dd>${esc(t.definition)}</dd>`).join("\n\n");
    return `${head}\n${items}`;
  }).join("\n");

  return `<!--NOGLOSS-->\n${index}\n<dl class="gloss">\n${body}\n</dl>\n<!--/NOGLOSS-->`;
}

function firstLetter(s) {
  const c = String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().charAt(0);
  return /[A-Z]/.test(c) ? c : "#";
}
