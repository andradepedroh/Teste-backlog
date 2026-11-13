// components.mjs — blocos de HTML reutilizados pelos domínios do relatório.
//
// A regra que rege este arquivo: TODO componente devolve "" quando não tem dado.
// Nunca um rótulo vazio, nunca "—" solto, nunca um card com zero dentro. Quem chama
// decide se o vazio vira uma frase explicativa (`absent()`) ou se a seção some.
// Um relatório de entrega perde credibilidade mais rápido por um campo em branco do
// que por uma seção ausente e declarada.

import { attr, esc, mdToHtml } from "./escape.mjs";
import { SEMANTIC } from "./charts.mjs";

/* ═══════════════════════════ ausência declarada ═══════════════════════════ */

/**
 * O que aparece no lugar de um bloco que não pôde ser montado.
 * Diz O QUE falta e COMO passar a ter — sem isso o leitor conclui que o dado é zero.
 */
export function absent(what, { source = null, hint = null } = {}) {
  return `<p class="absent"><b>${esc(what)}</b>${source ? ` — depende de <code>${esc(source)}</code>, que não foi encontrado nesta geração.` : " — sem dado nesta geração."}${hint ? ` ${esc(hint)}` : ""}</p>`;
}

/* ═══════════════════════════ pergunta que a seção responde ═══════════════════════════
   O bloco `.asks` é o contrato de leitura: cada seção declara a pergunta do cliente
   que ela responde e dá a resposta em uma frase. Quando o conteúdo editorial não
   existe, o bloco simplesmente não sai — inventar a pergunta seria pior. */

export function asks(question, answerHtml) {
  if (!question || !answerHtml) return "";
  return `<div class="asks"><span class="asks-q">${esc(question)}</span><span class="asks-a">${answerHtml}</span></div>`;
}

/* ═══════════════════════════ semáforo acessível ═══════════════════════════
   Ícone + rótulo + cor. Só cor reprovaria em impressão P&B e para daltonismo —
   e este documento é lido em papel em reunião de fechamento. */

const ICONS = {
  ok: '<circle cx="8" cy="8" r="6.9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.2 8.4l3.1 3.1 6.5-6.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  warn: '<path d="M8 1.4l6.4 12.2H1.6z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 3.4v6.2M8 12.1v.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  crit: '<circle cx="8" cy="8" r="6.9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.8 4.8l6.4 6.4M11.2 4.8l-6.4 6.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  info: '<circle cx="8" cy="8" r="6.9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v5M8 4.4v.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
};

const LEVEL_COLOR = { ok: SEMANTIC.ok, warn: SEMANTIC.warn, crit: SEMANTIC.crit, info: SEMANTIC.info };

/** Normaliza os vários vocabulários de nível que chegam dos coletores. */
export function levelKey(level) {
  const l = String(level || "").toLowerCase();
  if (["ok", "verde", "green", "aprovado", "saudável", "saudavel"].includes(l)) return "ok";
  if (["warn", "warning", "atenção", "atencao", "amarelo", "média", "media"].includes(l)) return "warn";
  if (["crit", "critical", "crítico", "critico", "vermelho", "alta", "bloqueado"].includes(l)) return "crit";
  return "info";
}

export function semIcon(level, size = 16) {
  const k = levelKey(level);
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false" style="color:${LEVEL_COLOR[k]}">${ICONS[k]}</svg>`;
}

/* ═══════════════════════════ veredito e dimensões ═══════════════════════════ */

/** Faixa de veredito no topo do sumário: nível, título e parágrafos de justificativa. */
export function verdict({ level, title, paragraphsHtml = [] }) {
  if (!title) return "";
  const k = levelKey(level);
  const body = paragraphsHtml.filter(Boolean).map((p) => (/^\s*<(p|ul|ol|div)/i.test(p) ? p : `<p>${p}</p>`)).join("");
  return `<div class="verdict is-${k}">
  <div class="dim-icon">${semIcon(k, 30)}</div>
  <div>
    <h3>${esc(title)}</h3>
    ${body}
  </div>
</div>`;
}

/**
 * Semáforo por dimensão. Cinco sinais separados em vez de um agregado, porque
 * escopo, qualidade, segurança, ambiente e contrato têm DONOS diferentes — um
 * sinal único esconde de quem depende cada providência.
 * Renderiza quantas dimensões existirem: 2, 5 ou 8; o grid se acomoda.
 */
export function dims(list) {
  const data = (list || []).filter((d) => d && d.name && d.verdict);
  if (!data.length) return "";
  return `<div class="dims">${data.map((d) => {
    const k = levelKey(d.level);
    return `<div class="dim dim--${k}">
    <div class="dim-head">
      <span class="dim-top">${semIcon(k)}<span class="dim-name">${esc(d.name)}</span></span>
      <span class="dim-verdict">${esc(d.verdict)}</span>
    </div>
    ${d.why ? `<p class="dim-why">${d.whyHtml || esc(d.why)}</p>` : ""}
    ${d.owner || d.evidence ? `<p class="dim-ev">${d.owner ? `${esc(d.ownerLabel || "Responsável")}: <strong>${esc(d.owner)}</strong>` : ""}${d.owner && d.evidence ? "<br>" : ""}${d.evidence ? link(d.evidenceHref, d.evidence) : ""}</p>` : ""}
  </div>`;
  }).join("")}</div>`;
}

function link(href, label) {
  if (!href) return esc(label);
  return `<a href="${attr(href)}">${esc(label)}</a>`;
}

/* ═══════════════════════════ camadas de leitura ═══════════════════════════
   "Quanto tempo você tem": três caminhos autocontidos. Existe porque o mesmo
   arquivo é lido pelo patrocinador em 5 minutos e pelo time técnico por uma hora. */

export function layers(list) {
  const data = (list || []).filter((l) => l && l.title);
  if (!data.length) return "";
  return `<div class="layers">${data.map((l) => `  <div class="layer">
    ${l.time ? `<span class="layer-time">${esc(l.time)}</span>` : ""}
    <h4>${esc(l.title)}</h4>
    ${l.body ? `<p>${l.bodyHtml || esc(l.body)}</p>` : ""}
    ${(l.links || []).length ? `<span class="layer-go">${l.links.map((x) => link(x.href, x.label)).join(" → ")}</span>` : ""}
  </div>`).join("\n")}</div>`;
}

/* ═══════════════════════════ callout ═══════════════════════════ */

export function callout(title, bodyHtml, kind = "read") {
  if (!bodyHtml) return "";
  const k = ["read", "warn", "crit", "ok", "info"].includes(kind) ? kind : "read";
  return `<aside class="callout callout-${k}">${title ? `<strong>${esc(title)}</strong>` : ""}<div>${bodyHtml}</div></aside>`;
}

/** Nota de rodapé de seção: contexto metodológico, não conteúdo. */
export function note(html) {
  return html ? `<p class="note">${html}</p>` : "";
}

/* ═══════════════════════════ KPI ═══════════════════════════ */

/**
 * Cartão de indicador. `value` pode trazer um denominador (`{ value: 34, of: 46 }`),
 * que sai em corpo menor: "34/46" numa fonte só vira um número de quatro dígitos.
 */
export function kpi({ label, value, of = null, hint = null, level = "neutral" }) {
  if (value === null || value === undefined || value === "") return "";
  const k = ["ok", "warn", "crit", "neutral"].includes(level) ? level : "neutral";
  return `<div class="kpi kpi--${k}">
  <div class="k-label">${esc(label)}</div>
  <div class="k-value">${esc(value)}${of !== null && of !== undefined ? `<small> / ${esc(of)}</small>` : ""}</div>
  ${hint ? `<div class="k-hint">${esc(hint)}</div>` : ""}
</div>`;
}

/**
 * Grade de KPIs. Preenche em linhas de 4 (ou `cols`) e descarta cartões vazios
 * ANTES de decidir o número de colunas — senão um cartão suprimido deixava buraco.
 */
export function kpiGrid(cards, { cols = 4, style = null } = {}) {
  const html = (cards || []).map((c) => (typeof c === "string" ? c : kpi(c))).filter(Boolean);
  if (!html.length) return "";
  const n = Math.min(cols, html.length);
  return `<div class="grid cols-${cols} grid--fix${n}"${style ? ` style="${attr(style)}"` : ""}>\n${html.join("\n")}\n</div>`;
}

/* ═══════════════════════════ painel de gráfico ═══════════════════════════ */

export function panel({ title, sub, body, footer }) {
  if (!body) return "";
  return `<div class="panel">
  ${title ? `<p class="panel-title">${esc(title)}</p>` : ""}
  ${sub ? `<p class="panel-sub">${sub}</p>` : ""}
  ${body}
  ${footer || ""}
</div>`;
}

/* ═══════════════════════════ tabelas ═══════════════════════════
   Três variantes com significado, não com estética:
   · `is-decision` — o leitor precisa DECIDIR a partir dela (borda forte, fonte maior);
   · `is-evidence` — comprova uma afirmação feita acima (compacta, tom secundário);
   · padrão        — informação corrente.
   `headers` aceita string ou { label, width, num }. */

export function table(headers, rows, { compact = false, variant = null, fixed = false, foot = null, empty = null } = {}) {
  if (!rows || !rows.length) return empty === null ? "" : `<div class="empty">${esc(empty)}</div>`;
  const cls = [compact ? "t-compact" : "", variant ? `is-${variant}` : "", fixed ? "t-fixed" : ""].filter(Boolean).join(" ");
  const wrapCls = ["table-wrap", variant ? `is-${variant}` : ""].filter(Boolean).join(" ");
  return `<div class="${wrapCls}">
<table${cls ? ` class="${cls}"` : ""}>
<thead><tr>${headers.map(th).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr${r.cls ? ` class="${attr(r.cls)}"` : ""}>${(r.cells || r).map((c) => `<td${cellAttrs(c)}>${cellHtml(c)}</td>`).join("")}</tr>`).join("\n")}</tbody>
${foot ? `<tfoot><tr>${foot.map((c) => `<td${cellAttrs(c)}>${cellHtml(c)}</td>`).join("")}</tr></tfoot>` : ""}
</table></div>`;
}

function th(h) {
  if (typeof h === "string") return `<th>${esc(h)}</th>`;
  const cls = h.num ? ' class="num"' : "";
  const w = h.width ? ` style="width:${attr(h.width)}"` : "";
  return `<th${cls}${w}>${esc(h.label)}</th>`;
}

function cellHtml(c) { return typeof c === "object" && c !== null ? (c.html ?? "") : (c ?? ""); }
function cellAttrs(c) { return typeof c === "object" && c !== null && c.num ? ' class="num"' : ""; }

/* ═══════════════════════════ grid genérico ═══════════════════════════
   Filtro + busca + ordenação + paginação, uma instância por [data-grid-root].
   Existe porque o relatório tem oito listagens de 40 a 900 linhas; sem paginação
   e filtro elas viram rolagem infinita e o leitor desiste antes de achar a linha.

   O contrato com o script do cliente:
   · a linha carrega `data-search` (texto minúsculo já concatenado) e um
     `data-<campo>` por filtro declarado;
   · a ordenação lê `data-num-<col>` (numérica) ou `data-sort-<col>` (texto);
     sem nenhum dos dois, cai para o texto da célula — o que ordena "10" antes de "9".
     Por isso toda coluna numérica DEVE declarar `num`.
   · na impressão as linhas fora da página somem; "Preparar dossiê" põe tudo em "Todos". */

let gridSeq = 0;

export function grid({
  id = null, noun = "item(ns)", filters = [], columns, rows,
  searchPlaceholder = "buscar…", pageSize = 25, variant = null, fixed = true, compact = true,
  toolbarExtra = "",
}) {
  if (!rows || !rows.length) return "";
  const gid = id || `grid-${++gridSeq}`;
  const usable = (filters || []).filter((f) => (f.options || []).length > 1);

  const head = columns.map((c) => {
    const cls = [c.num ? "num" : "", c.sort ? "sortable" : ""].filter(Boolean).join(" ");
    const w = c.width ? ` style="width:${attr(c.width)}"` : "";
    return `<th${cls ? ` class="${cls}"` : ""}${c.sort ? ` data-sort="${attr(c.sort)}" aria-sort="none"` : ""}${w}>${esc(c.label)}</th>`;
  }).join("");

  const body = rows.map((row, i) => {
    const data = Object.entries(row.data || {}).map(([k, v]) => ` data-${attr(k)}="${attr(v)}"`).join("");
    const sortKeys = Object.entries(row.sort || {}).map(([k, v]) => (
      typeof v === "number" ? ` data-num-${attr(k)}="${attr(v)}"` : ` data-sort-${attr(k)}="${attr(v)}"`
    )).join("");
    return `<tr${row.cls ? ` class="${attr(row.cls)}"` : ""} data-index="${i}" data-search="${attr(String(row.search || "").toLowerCase())}"${data}${sortKeys}>`
      + row.cells.map((c) => `<td${cellAttrs(c)}>${cellHtml(c)}</td>`).join("")
      + "</tr>";
  }).join("\n");

  const tableCls = ["grid-table", compact ? "t-compact" : "", variant ? `is-${variant}` : "", fixed ? "t-fixed" : ""].filter(Boolean).join(" ");

  return `<div class="grid-wrap" data-grid-root data-grid-noun="${attr(noun)}" id="${attr(gid)}">
<div class="grid-toolbar">
  <div class="grid-filters">
    <label class="grid-field"><span>Busca</span><input type="search" data-grid-search placeholder="${attr(searchPlaceholder)}"></label>
${usable.map((f) => `    <label class="grid-field"><span>${esc(f.label)}</span><select data-grid-filter="${attr(f.key)}"${f.multi ? " data-grid-multi" : ""}>
      <option value="all">Todos</option>
      ${f.options.map((o) => `<option value="${attr(o.value)}">${esc(o.label)}${o.count !== undefined ? ` (${o.count})` : ""}</option>`).join("")}
    </select></label>`).join("\n")}
    <label class="grid-field"><span>Por página</span><select data-grid-size>
      ${[25, 50, 100].map((n) => `<option value="${n}"${n === pageSize ? " selected" : ""}>${n}</option>`).join("")}
      <option value="0">Todos</option>
    </select></label>
    <button type="button" class="btn" data-grid-reset>Limpar</button>
  </div>
  <div class="grid-status"><span data-grid-count></span></div>
  ${toolbarExtra}
</div>
<div class="grid-pager">
  <span class="pager-info" data-grid-pageinfo></span>
  <span class="pager-right" data-grid-pager>
    <button type="button" class="btn" data-grid-page="first" title="Primeira página">«</button>
    <button type="button" class="btn" data-grid-page="prev" title="Página anterior">‹</button>
    <button type="button" class="btn" data-grid-page="next" title="Próxima página">›</button>
    <button type="button" class="btn" data-grid-page="last" title="Última página">»</button>
  </span>
</div>
<div class="table-wrap">
<table class="${tableCls}" data-grid-table>
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody></table></div>
</div>`;
}

/**
 * Filtro de VÁRIOS valores por linha (um item com duas camadas de teste, um bug em dois
 * módulos). A linha carrega `data-<campo>="|a|b|"` e o select leva `data-grid-multi`; o
 * script do cliente filtra por pertinência em vez de igualdade. `filterOptionsMulti` conta
 * cada valor uma vez por linha.
 */
export function multiValue(list) {
  const vals = [...new Set((list || []).filter(Boolean).map(String))];
  return vals.length ? `|${vals.join("|")}|` : "";
}

export function filterOptionsMulti(rows, pick) {
  const counts = new Map();
  for (const r of rows) for (const v of new Set(pick(r) || [])) {
    if (v === null || v === undefined || v === "") continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "pt-BR"))
    .map(([value, count]) => ({ value, label: value, count }));
}

/** Conta as ocorrências de um campo para montar as opções de um filtro com contagem. */
export function filterOptions(rows, pick) {
  const counts = new Map();
  for (const r of rows) {
    const v = pick(r);
    if (v === null || v === undefined || v === "") continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "pt-BR"))
    .map(([value, count]) => ({ value, label: value, count }));
}

/* ═══════════════════════════ pílulas e estados ═══════════════════════════ */

export function pill(label, kind = "neutral", { mono = false, title = null } = {}) {
  if (label === null || label === undefined || label === "") return "";
  return `<span class="pill${mono ? " pill-mono" : ""} pill-${kind}"${title ? ` title="${attr(title)}"` : ""}>${esc(label)}</span>`;
}

/**
 * Estado de evidência: confirmado / parcial / ausente. O CSS acrescenta um símbolo
 * (● ◆ ○) pelo ::after, para o estado sobreviver ao papel em preto e branco.
 */
export function state(kind, label) {
  const k = { confirmado: "confirmado", parcial: "parcial", ausente: "ausente" }[String(kind || "").toLowerCase()] || "ausente";
  const text = label || { confirmado: "Confirmado", parcial: "Parcial", ausente: "Sem artefato" }[k];
  return `<span class="state state-${k}">${esc(text)}</span>`;
}

export function methodPill(method) {
  const m = String(method || "GET").toUpperCase();
  return `<span class="ep-method m-${attr(m)}">${esc(m)}</span>`;
}

export function statusCode(code) {
  const n = Number(code);
  const k = n >= 500 ? "crit" : n >= 400 ? "warn" : n >= 200 && n < 300 ? "ok" : "neutral";
  return `<span class="st st--${k}">${esc(code)}</span>`;
}

/* ═══════════════════════════ dobras ═══════════════════════════ */

export function fold(summaryHtml, innerHtml, { open = false, id = null } = {}) {
  if (!innerHtml) return "";
  return `<details${open ? " open" : ""}${id ? ` id="${attr(id)}"` : ""}>
<summary>${summaryHtml}</summary>
<div class="details-body">${innerHtml}</div></details>`;
}

export function foldActions() {
  return `<div class="fold-actions"><button class="btn" data-fold="open">Abrir todas as seções</button><button class="btn" data-fold="close">Recolher todas</button></div>`;
}

/* ═══════════════════════════ cartões de ação ═══════════════════════════ */

export function acts(items) {
  const data = (items || []).filter((a) => a && a.title);
  if (!data.length) return "";
  return `<div class="acts">${data.map((a, i) => {
    const k = levelKey(a.level);
    return `<div class="act${k === "crit" ? " is-crit" : k === "warn" ? " is-warn" : ""}">
  <span class="n">${i + 1}</span>
  <h4>${esc(a.title)}</h4>
  ${a.detail ? `<p>${a.detailHtml || esc(a.detail)}</p>` : ""}
  ${(a.meta || []).length ? `<div class="meta">${a.meta.map((m) => `<span>${esc(m.label)}: <b>${esc(m.value)}</b></span>`).join("")}</div>` : ""}
</div>`;
  }).join("\n")}</div>`;
}

/* ═══════════════════════════ lista de definição em duas colunas ═══════════════════════════ */

export function dl2(pairs) {
  const data = (pairs || []).filter((p) => p && p.label && p.value !== null && p.value !== undefined && p.value !== "");
  if (!data.length) return "";
  return `<dl class="dl2">${data.map((p) => `<div><dt>${esc(p.label)}</dt><dd>${p.html || esc(p.value)}</dd></div>`).join("")}</dl>`;
}

/* ═══════════════════════════ capa ═══════════════════════════ */

export function cover({
  eyebrow, title, sub, logos = [], version = null, confidential = null, meta = [], id = "capa",
}) {
  const top = (logos.length || version || confidential) ? `  <div class="cover-top">
    ${logos.length ? `<div class="cover-logos">${logos.map((l) => `<span class="logo-slot"><b>${esc(l.name)}</b>${l.role ? `<span>${esc(l.role)}</span>` : ""}</span>`).join("")}</div>` : "<div></div>"}
    ${version || confidential ? `<div class="cover-tags">
      ${version ? `<span class="cover-tag cover-tag--ver">${esc(version)}</span>` : ""}
      ${confidential ? `<span class="cover-tag cover-tag--conf">${esc(confidential)}</span>` : ""}
    </div>` : ""}
  </div>` : "";

  return `<div class="cover" id="${attr(id)}">
${top}
  ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ""}
  <h1>${esc(title)}</h1>
  ${sub ? `<p class="sub">${esc(sub)}</p>` : ""}
  ${meta.length ? `<dl class="cover-meta">${meta.filter((m) => m.value).map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join("")}</dl>` : ""}
</div>`;
}

/* ═══════════════════════════ cabeçalho e rodapé de impressão ═══════════════════════════
   position:fixed repetido em cada página do PDF pelo Chromium. Não é possível numerar
   aqui (counter(page) só resolve nas margin boxes de @page, não implementadas) — a
   numeração vem da opção "Cabeçalhos e rodapés" do diálogo de impressão. */

export function printChrome({ headLeft, headRight, footParts = [] }) {
  const head = headLeft || headRight
    ? `<div class="print-head" aria-hidden="true"><div class="row">
  <span>${esc(headLeft || "")}</span>
  <span>${esc(headRight || "")}</span>
</div></div>`
    : "";
  const parts = footParts.filter(Boolean);
  const foot = parts.length
    ? `<div class="print-foot" aria-hidden="true"><div class="row">${parts.map((p) => `\n  <span>${esc(p)}</span>`).join("")}\n</div></div>`
    : "";
  return `${head}\n${foot}`;
}

/* ═══════════════════════════ barra de ações do documento ═══════════════════════════ */

export function docActions() {
  return `<div class="doc-actions">
  <button type="button" class="btn-primary" data-dossier>Preparar dossiê completo para PDF</button>
  <button type="button" class="btn" onclick="window.print()">Imprimir / PDF</button>
  <span class="hint">O PDF sai como a tela. «Preparar dossiê» abre todas as seções dobráveis, exibe os grids na íntegra e liga a quebra de página por seção. Para numerar as páginas, marque «Cabeçalhos e rodapés» no diálogo de impressão.</span>
  <span data-dossier-status hidden>Dossiê preparado.</span>
</div>`;
}

/* ═══════════════════════════ bloco de aceite formal ═══════════════════════════ */

export function signatures(list, { title = "Aceite" } = {}) {
  const data = (list || []).filter((s) => s && (s.who || s.role));
  if (!data.length) return "";
  return `<div class="accept">
<h3>${esc(title)}</h3>
<div class="sign-grid">${data.map((s) => `<div class="sign">
  <div class="who">${esc(s.who || "—")}</div>
  <div class="role">${esc(s.role || "")}</div>
  <div class="line">Assinatura</div>
  <div class="line">Data</div>
</div>`).join("")}</div>
</div>`;
}

/* ═══════════════════════════ ficha requisição × resposta ═══════════════════════════
   Duas colunas lado a lado para um endpoint. O leitor de contrato compara o que
   entra com o que sai; empilhado em uma coluna essa comparação se perde. */

export function requestResponse({ requestHtml, responseHtml }) {
  if (!requestHtml && !responseHtml) return "";
  return `<div class="rr">
  <div class="rr-col"><p class="rr-h">Requisição</p>${requestHtml || '<p class="muted small">Sem corpo declarado.</p>'}</div>
  <div class="rr-col"><p class="rr-h">Resposta</p>${responseHtml || '<p class="muted small">Sem resposta declarada no contrato.</p>'}</div>
</div>`;
}

/* ═══════════════════════════ link para o repositório ═══════════════════════════
   O href é reescrito no cliente a partir de window.REPORT_REPO — é isso que permite
   repontar o relatório inteiro para outra org/branch editando um objeto no fim do
   arquivo. Sem configuração, o link vira texto: `<code>` sem âncora morta. */

export function srcLink({ repo, path, line = null, label = null }) {
  const text = label || `${String(path || "").split("/").pop()}${line ? `:${line}` : ""}`;
  if (!repo || !path) return `<span class="src-plain">${esc(text)}</span>`;
  return `<a class="src" href="#" data-repo="${attr(repo)}" data-path="${attr(path)}"${line ? ` data-line="${attr(line)}"` : ""} target="_blank" rel="noopener" title="${attr(`Abrir ${repo}${path} no repositório`)}"><code>${esc(text)}</code></a>`;
}

/** URL de dado externo: só http(s) passa. `attr()` impede quebra de atributo, mas
 *  não bloqueia `javascript:` — e work item vem de API, não de fonte confiável. */
export function safeUrl(url) {
  const raw = String(url || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : null;
}

/* ═══════════════════════════ markdown incorporado ═══════════════════════════ */

export function chapter(id, title, source, markdown, { open = false } = {}) {
  if (!markdown) return "";
  return fold(
    `${esc(title)}${source ? ` <span class="muted small">· ${esc(source)}</span>` : ""}`,
    mdToHtml(markdown, { headingOffset: 4 }),
    { open, id },
  );
}

/* ═══════════════════════════ barra de progresso em célula ═══════════════════════════ */

export function progressCell(done, total) {
  if (!total) return `<span class="muted">—</span>`;
  const p = Math.round((done / total) * 100);
  const color = p >= 95 ? "var(--c-ok)" : p >= 60 ? "var(--c-warn)" : "var(--c-neutral)";
  return `<span class="mini-bar"><i style="width:${p}%;background:${color}"></i></span> <span class="small">${p}%</span>`;
}

export function coverageBar(p) {
  if (p === null || p === undefined) return `<span class="mini-bar"><i style="width:100%;background:var(--c-border-strong)"></i></span>`;
  const color = p >= 80 ? SEMANTIC.ok : p >= 60 ? SEMANTIC.info : p >= 30 ? SEMANTIC.warn : SEMANTIC.crit;
  return `<span class="mini-bar" title="${attr(`${p}% coberto`)}"><i style="width:${Math.max(0, Math.min(100, p))}%;background:${color}"></i></span>`;
}
