// escape.mjs — escaping para HTML. Nada de conteúdo de artefato entra cru no documento.

export function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function attr(s) {
  return esc(s).replace(/\n/g, " ");
}

/** id seguro para âncora/hash. */
export function slug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

/**
 * Markdown → HTML mínimo e seguro (headings, listas, tabelas, código, ênfase, links).
 * Escapa tudo primeiro; nenhum HTML do artefato original sobrevive.
 */
export function mdToHtml(md, { headingOffset = 2 } = {}) {
  const src = String(md || "").replace(/\r\n?/g, "\n");
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  let inFence = false;
  let fenceLang = "";
  let fenceBuf = [];

  const flushFence = () => {
    const cls = fenceLang ? ` class="lang-${slug(fenceLang)}"` : "";
    out.push(`<pre${cls}><code>${esc(fenceBuf.join("\n"))}</code></pre>`);
    fenceBuf = [];
    fenceLang = "";
  };

  while (i < lines.length) {
    const line = lines[i];

    // fences
    const fence = /^\s*```+\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      if (inFence) { flushFence(); inFence = false; } else { inFence = true; fenceLang = fence[1] || ""; }
      i++; continue;
    }
    if (inFence) { fenceBuf.push(line); i++; continue; }

    if (!line.trim()) { i++; continue; }

    // heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = Math.min(6, h[1].length + headingOffset - 1);
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }

    // hr
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { out.push("<hr />"); i++; continue; }

    // table
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const rows = [];
      const header = splitRow(line);
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      out.push(renderTable(header, rows));
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push(`<blockquote>${mdToHtml(buf.join("\n"), { headingOffset })}</blockquote>`);
      continue;
    }

    // listas
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (!m) {
          // continuação de item
          if (items.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i])) {
            items[items.length - 1] += ` ${lines[i].trim()}`;
            i++; continue;
          }
          break;
        }
        items.push(m[3]);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }

    // parágrafo
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|\||>|[-*+]\s|\d+[.)]\s|```)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  if (inFence) flushFence();
  return out.join("\n");
}

function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cur = "";
  let escaped = false;
  for (const ch of trimmed) {
    if (escaped) { cur += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === "|") { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function renderTable(header, rows) {
  const th = header.map((c) => `<th>${inline(c)}</th>`).join("");
  const tb = rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
}

/** Formatação inline: código, negrito, itálico, links. Entrada é escapada antes de tudo. */
export function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_m, label, href) => {
    // `//host` e `/\host` são protocolo-relativos: o navegador os abre como outro domínio,
    // não como caminho do documento. Só vale `/` seguido de algo que não seja outra barra.
    const safe = /^(https?:|mailto:|#|\.{0,2}\/(?![/\\]))/i.test(href) ? href : "#";
    const external = /^https?:/i.test(safe);
    return `<a href="${safe}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s;
}
