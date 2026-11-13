// charts.mjs — gráficos SVG gerados na compilação.
//
// Por que SVG no servidor e não uma lib no browser: o relatório é entregue como UM
// arquivo que precisa abrir sem rede, dentro de e-mail, de pendrive e do visualizador
// de PDF do cliente. Qualquer CDN quebraria isso; qualquer canvas sairia borrado na
// impressão. SVG gerado aqui é texto, escala no papel e é auditável no diff.
//
// Contrato de todos os builders:
//   · recebem dados já normalizados e devolvem string HTML (`<figure class="chart">…`);
//   · devolvem "" quando não há dado suficiente — quem chama decide o que dizer no lugar.
//     Nenhum builder inventa eixo, escala ou categoria para preencher espaço;
//   · todo gráfico carrega `role="img"` + `aria-label` com os MESMOS números do desenho,
//     porque metade dos leitores recebe este arquivo em PDF e usa leitor de tela;
//   · toda série tem `<title>` para o valor exato no hover — o rótulo no desenho é
//     arredondado, o title não.
//
// A paleta vem dos tokens do tema (var(--s1)…), mas os valores entram LITERAIS no SVG:
// `fill="var(--s1)"` não sobrevive à conversão para PDF de alguns navegadores.

import { attr, esc } from "./escape.mjs";

/** Série categórica do tema, na mesma ordem dos tokens --s1..--s6. */
export const SERIES = ["#1f4e79", "#2f8f6e", "#b07d2b", "#7a4b8f", "#a0464b", "#3d7a99"];
export const SEMANTIC = {
  ok: "#17663f", warn: "#8a5300", crit: "#a02121",
  info: "#1f4e79", neutral: "#5b6675", soft: "#eceef2", line: "#b8c0cc", grid: "#e6e9ee",
  text: "#16202e", text2: "#4a5666", text3: "#6b7787", axis: "#8d97a4",
};

const nf = (n) => Number(n || 0).toLocaleString("pt-BR");
const r1 = (n) => Number(n).toFixed(1);

/** Envelope comum: figure + svg responsivo. `extraClass` liga variantes do tema. */
function figure(inner, { viewBox, label, extraClass = "" }) {
  return `<figure class="chart ${extraClass}"><svg viewBox="${attr(viewBox)}" role="img" aria-label="${attr(label)}" preserveAspectRatio="xMinYMin meet">${inner}</svg></figure>`;
}

/**
 * Contraste do rótulo dentro da barra. Abaixo de ~34px a legenda não cabe e o
 * número precisa sair para fora — sem isto, barras pequenas viravam borrão.
 */
function fitsInside(width, chars = 2) { return width >= 14 + chars * 7; }

/* ═══════════════════════════ barras horizontais empilhadas ═══════════════════════════
   Usada em "entrega por frente" e "complexidade por frente": cada linha é uma
   categoria, cada segmento uma classe. O comprimento total da linha é proporcional
   ao total da categoria — é isso que faz uma frente de 16 operações parecer maior
   que uma de 3, em vez de todas normalizarem para 100%. */

export function hbarStack(rows, {
  width = 980, labelW = 260, rowH = 20, gap = 12, legend = [], trailing = null,
  label = "", extraClass = "",
} = {}) {
  const data = (rows || []).filter((r) => r && (r.segments || []).some((s) => s.value > 0) || (r && r.total));
  if (!data.length) return "";

  const hasLegend = legend.length > 0;
  const legendH = hasLegend ? 26 : 0;
  const subLine = data.some((r) => r.sub);
  const step = rowH + gap;
  const height = legendH + data.length * step;
  const plotX = labelW + 10;
  const plotW = width - plotX - (trailing ? 66 : 6);
  const maxTotal = Math.max(...data.map((r) => (r.segments || []).reduce((a, s) => a + (s.value || 0), 0)), 1);

  let out = "";
  if (hasLegend) {
    let lx = plotX;
    for (const l of legend) {
      out += `<rect x="${r1(lx)}" y="10" width="11" height="11" rx="2" fill="${l.color}"/>`
        + `<text x="${r1(lx + 17)}" y="19" font-size="12" fill="${SEMANTIC.text2}">${esc(l.label)}</text>`;
      lx += 28 + String(l.label).length * 6.4;
    }
  }

  data.forEach((row, i) => {
    const y = legendH + i * step;
    const mid = y + rowH / 2 + 4.5;
    const total = (row.segments || []).reduce((a, s) => a + (s.value || 0), 0);
    const trackW = (total / maxTotal) * plotW;

    out += `<text x="${labelW}" y="${subLine ? y + 14 : mid}" text-anchor="end" font-size="12.5" font-weight="550" fill="${SEMANTIC.text}">${esc(row.label)}</text>`;
    if (row.sub) out += `<text x="${labelW}" y="${y + 26}" text-anchor="end" font-size="10.5" fill="${SEMANTIC.text3}">${esc(row.sub)}</text>`;
    out += `<rect x="${plotX}" y="${y}" width="${r1(Math.max(trackW, 2))}" height="${rowH}" rx="3" fill="${SEMANTIC.soft}"/>`;

    let x = plotX;
    for (const s of (row.segments || [])) {
      if (!s.value) continue;
      const w = (s.value / maxTotal) * plotW;
      out += `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${rowH}" fill="${s.color}">`
        + `<title>${esc(`${row.label} — ${s.label}: ${nf(s.value)}`)}</title></rect>`;
      if (fitsInside(w, String(s.value).length)) {
        out += `<text x="${r1(x + w / 2)}" y="${r1(mid)}" text-anchor="middle" font-size="11.5" font-weight="650" fill="#ffffff">${nf(s.value)}</text>`;
      }
      x += w;
    }
    if (trailing) {
      const t = trailing(row);
      if (t) out += `<text x="${width - 6}" y="${r1(mid)}" text-anchor="end" font-size="12" font-weight="650" fill="${SEMANTIC.text2}">${esc(t)}</text>`;
    }
  });

  return figure(out, { viewBox: `0 0 ${width} ${height}`, label: label || describeStack(data), extraClass });
}

function describeStack(rows) {
  return `Barras horizontais: ${rows.slice(0, 6).map((r) => `${r.label} ${(r.segments || []).map((s) => `${s.label} ${s.value}`).join(", ")}`).join("; ")}. A tabela ao lado traz os mesmos valores.`;
}

/* ═══════════════════════════ barra empilhada única, rotulada ═══════════════════════════
   "As falhas por natureza": uma faixa só, dividida, com número e percentual dentro e
   o rótulo por baixo. Os padrões (hachura, pontos) são redundância à cor: em P&B duas
   faixas de tom parecido viravam uma só. */

export function stackBand(segments, { width = 940, label = "", note = true } = {}) {
  const segs = (segments || []).filter((s) => s.value > 0);
  const total = segs.reduce((a, s) => a + s.value, 0);
  if (!total) return "";

  const barH = 58;
  const height = barH + (note ? 46 : 10);
  const PATTERNS = ["hx-diag", "hx-dot", null, "hx-grid", null, null];

  let out = `<defs>
<pattern id="hx-diag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="6" height="6" fill="none"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,.55)" stroke-width="2.4"/>
</pattern>
<pattern id="hx-dot" width="6" height="6" patternUnits="userSpaceOnUse">
  <circle cx="1.6" cy="1.6" r="1.3" fill="rgba(255,255,255,.6)"/>
</pattern>
<pattern id="hx-grid" width="5" height="5" patternUnits="userSpaceOnUse">
  <path d="M0 0 H5 M0 0 V5" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
</pattern>
</defs>`;

  // Faixa mínima: uma fatia de 1 em 400 desaparece se for estritamente proporcional.
  const MIN = 92;
  const raw = segs.map((s) => (s.value / total) * width);
  const deficit = raw.reduce((a, w) => a + Math.max(0, MIN - w), 0);
  const surplus = raw.reduce((a, w) => a + Math.max(0, w - MIN), 0);
  const widths = raw.map((w) => (w < MIN ? MIN : w - (surplus ? (deficit * (w - MIN)) / surplus : 0)));

  let x = 0;
  segs.forEach((s, i) => {
    const w = widths[i];
    const p = Math.round((s.value / total) * 100);
    const pat = PATTERNS[i % PATTERNS.length];
    out += `<rect x="${r1(x)}" y="4" width="${r1(w)}" height="${barH}" fill="${s.color}"><title>${esc(`${s.label}: ${nf(s.value)} (${p}%)`)}</title></rect>`;
    if (pat) out += `<rect x="${r1(x)}" y="4" width="${r1(w)}" height="${barH}" fill="url(#${pat})" pointer-events="none"/>`;
    out += `<rect x="${r1(x)}" y="4" width="${r1(w)}" height="${barH}" fill="none" stroke="#fff" stroke-width="2"/>`;
    const cx = r1(x + w / 2);
    out += `<text x="${cx}" y="31" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">${nf(s.value)}</text>`
      + `<text x="${cx}" y="48" text-anchor="middle" font-size="11.5" font-weight="600" fill="rgba(255,255,255,.85)">${p}%</text>`;
    if (note) {
      out += `<text x="${cx}" y="80" text-anchor="middle" font-size="11.5" font-weight="650" fill="${SEMANTIC.text}">${esc(s.label)}</text>`;
      if (s.sub) out += `<text x="${cx}" y="94" text-anchor="middle" font-size="10.5" fill="${SEMANTIC.text3}">${esc(s.sub)}</text>`;
    }
    x += w;
  });

  const aria = label || `Barra empilhada: ${segs.map((s) => `${s.value} de ${s.label.toLowerCase()}`).join(", ")}.`;
  return figure(out, { viewBox: `0 0 ${width} ${height}`, label: aria, extraClass: "chart--stack" });
}

/* ═══════════════════════════ funil ═══════════════════════════
   Cada etapa é subconjunto da anterior, com critério mais exigente. A queda entre
   etapas sai em vermelho à direita: é o número que interessa na reunião, e ele
   desaparecia quando o leitor tinha de subtrair de cabeça. */

export function funnel(steps, { width = 940, label = "" } = {}) {
  const data = (steps || []).filter((s) => Number.isFinite(s.value));
  if (data.length < 2) return "";

  const stepH = 52, gapH = 12;
  const height = data.length * (stepH + gapH);
  const maxV = Math.max(...data.map((s) => s.value), 1);
  const barMax = 550, cx = 575, labelX = 286;

  let out = "";
  data.forEach((s, i) => {
    const y = 4 + i * (stepH + gapH);
    const w = Math.max((s.value / maxV) * barMax, 40);
    const x = cx - w / 2;
    const color = SERIES[i % SERIES.length];
    out += `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${stepH}" rx="4" fill="${color}"><title>${esc(`${s.label}: ${nf(s.value)}`)}</title></rect>`
      + `<text x="${cx}" y="${y + 33}" text-anchor="middle" font-size="21" font-weight="700" fill="#fff">${nf(s.value)}</text>`
      + `<text x="${labelX}" y="${y + 25}" text-anchor="end" font-size="12.5" font-weight="650" fill="${SEMANTIC.text}">${esc(s.label)}</text>`;
    if (s.sub) out += `<text x="${labelX}" y="${y + 40}" text-anchor="end" font-size="10.5" fill="${SEMANTIC.text3}">${esc(s.sub)}</text>`;

    const next = data[i + 1];
    if (next) {
      const drop = s.value - next.value;
      out += `<path d="M${cx} ${y + stepH} l-7 0 l7 10 l7 -10 z" fill="#c3cbd6"/>`;
      if (drop > 0) {
        out += `<text x="${cx + barMax / 2 + 6}" y="${y + stepH + 10}" text-anchor="start" font-size="11" font-weight="650" fill="${SEMANTIC.crit}">−${nf(drop)}</text>`;
      }
    }
  });

  const aria = label || `Funil: ${data.map((s) => `${s.label} ${s.value}`).join(", ")}.`;
  return figure(out, { viewBox: `0 0 ${width} ${height}`, label: aria, extraClass: "chart--funnel" });
}

/* ═══════════════════════════ colunas ═══════════════════════════ */

export function columns(items, {
  width = 620, height = 200, label = "", colors = null, valueFmt = nf, extraClass = "",
} = {}) {
  const data = (items || []).filter((d) => Number.isFinite(d.value));
  if (!data.length) return "";

  const padL = 46, padR = 12, padT = 14, padB = 62;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const slot = plotW / data.length;
  const barW = Math.min(54, slot * 0.62);
  const baseY = padT + plotH;

  let out = "";
  for (let t = 0; t <= 4; t++) {
    const v = (max / 4) * t;
    const y = baseY - (v / max) * plotH;
    out += `<line x1="${padL}" y1="${r1(y)}" x2="${width - padR}" y2="${r1(y)}" stroke="${t === 0 ? SEMANTIC.line : SEMANTIC.grid}" stroke-width="1"/>`
      + `<text x="${padL - 8}" y="${r1(y + 4)}" text-anchor="end" font-size="11" fill="${SEMANTIC.text3}">${nf(Math.round(v))}</text>`;
  }

  data.forEach((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0);
    const y = baseY - h;
    const color = d.color || (colors ? colors[i % colors.length] : SERIES[i % SERIES.length]);
    out += `<rect x="${r1(cx - barW / 2)}" y="${r1(y)}" width="${r1(barW)}" height="${r1(h)}" rx="2" fill="${color}"><title>${esc(`${d.label}: ${valueFmt(d.value)}`)}</title></rect>`;
    // Rótulo dentro quando a coluna é alta; fora quando é baixa demais para caber.
    const inside = h > 22;
    out += `<text x="${r1(cx)}" y="${r1(inside ? y + 14 : y - 4)}" text-anchor="middle" font-size="10.5" font-weight="650" fill="${inside ? "#ffffff" : SEMANTIC.text2}">${esc(valueFmt(d.value))}</text>`;
    out += `<g transform="translate(${r1(cx)},${baseY + 14}) rotate(-28)"><text x="0" y="0" text-anchor="end" font-size="10.5" fill="${SEMANTIC.text3}">${esc(clip(d.label, 14))}</text></g>`;
  });

  const aria = label || `Colunas: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}.`;
  return figure(out, { viewBox: `0 0 ${width} ${height}`, label: aria, extraClass });
}

function clip(s, n) {
  const t = String(s || "");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function niceMax(v) {
  if (v <= 4) return 4;
  const raw = v / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((c) => c >= raw) || 10 * mag;
  return step * 4;
}

/* ═══════════════════════════ donut ═══════════════════════════
   Só para composição de um todo pequeno (3 a 5 fatias). Acima disso, barra: o olho
   não compara ângulos. O total vai no centro porque é a pergunta que o leitor faz
   antes de olhar as fatias. */

export function donut(slices, { size = 190, centerValue = null, centerLabel = null, label = "" } = {}) {
  const data = (slices || []).filter((s) => s.value > 0);
  const total = data.reduce((a, s) => a + s.value, 0);
  if (!total) return "";

  const R = size / 2, r = R * 0.62, cx = R, cy = R;
  let angle = -Math.PI / 2;
  let out = "";

  for (const s of data) {
    const sweep = (s.value / total) * Math.PI * 2;
    const end = angle + sweep;
    // Fatia única = círculo completo: o arco de 360° degenera num ponto em SVG.
    if (data.length === 1) {
      out += `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${s.color}" stroke-width="${R - r}"><title>${esc(`${s.label}: ${nf(s.value)} (100%)`)}</title></circle>`;
      break;
    }
    const large = sweep > Math.PI ? 1 : 0;
    const p = (rad, ang) => `${r1(cx + rad * Math.cos(ang))} ${r1(cy + rad * Math.sin(ang))}`;
    out += `<path d="M${p(R, angle)} A${R} ${R} 0 ${large} 1 ${p(R, end)} L${p(r, end)} A${r} ${r} 0 ${large} 0 ${p(r, angle)} Z" fill="${s.color}" stroke="#fff" stroke-width="1.5">`
      + `<title>${esc(`${s.label}: ${nf(s.value)} (${Math.round((s.value / total) * 100)}%)`)}</title></path>`;
    angle = end;
  }

  if (centerValue !== null) {
    out += `<text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="26" font-weight="700" fill="${SEMANTIC.text}">${esc(centerValue)}</text>`;
    if (centerLabel) out += `<text x="${cx}" y="${cy + 19}" text-anchor="middle" font-size="10.5" fill="${SEMANTIC.text3}">${esc(centerLabel)}</text>`;
  }

  const aria = label || `Rosca: ${data.map((s) => `${s.label} ${s.value}`).join(", ")}; total ${total}.`;
  return figure(out, { viewBox: `0 0 ${size} ${size}`, label: aria, extraClass: "chart--donut" });
}

/** Legenda em lista, ao lado do donut. Sai como <ul>, não como texto no SVG:
 *  no SVG ela não quebra linha e estourava a caixa em nomes longos. */
export function chartLegend(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return "";
  return `<ul class="chart-legend">${list.map((i) => `<li><i style="background:${attr(i.color)}"></i><span>${esc(i.label)}</span>${i.value !== undefined ? ` <b>${esc(nf(i.value))}</b>` : ""}${i.hint ? ` <em>${esc(i.hint)}</em>` : ""}</li>`).join("")}</ul>`;
}

/* ═══════════════════════════ linha do tempo ═══════════════════════════
   Marcos datados sobre um eixo contínuo. Os rótulos alternam acima e abaixo e são
   empurrados quando colidem: numa entrega real dois marcos caem no mesmo dia
   (abertura do épico e primeiro commit) e os textos ficavam um sobre o outro. */

export function timeline(milestones, { width = 940, label = "" } = {}) {
  const data = (milestones || [])
    .map((m) => ({ ...m, t: Date.parse(m.date) }))
    .filter((m) => Number.isFinite(m.t))
    .sort((a, b) => a.t - b.t);
  if (data.length < 2) return "";

  const height = 190, axisY = 92, x0 = 46, x1 = 894;
  const t0 = data[0].t, t1 = data[data.length - 1].t;
  const span = Math.max(t1 - t0, 1);
  const X = (t) => x0 + ((t - t0) / span) * (x1 - x0);

  let out = `<line x1="32" y1="${axisY}" x2="908" y2="${axisY}" stroke="${SEMANTIC.line}" stroke-width="2"/>`;

  // Marcas de mês: dão escala sem poluir. Só aparecem se o intervalo tiver mais de um.
  for (const tick of monthTicks(t0, t1)) {
    const x = X(tick.t);
    if (x < x0 - 4 || x > x1 + 4) continue;
    out += `<line x1="${r1(x)}" y1="${axisY - 5}" x2="${r1(x)}" y2="${axisY + 5}" stroke="#c3cbd6"/>`
      + `<text x="${r1(x)}" y="${axisY + 19}" text-anchor="middle" font-size="10.5" fill="${SEMANTIC.axis}">${esc(tick.label)}</text>`;
  }

  // Alterna acima/abaixo e escalona em degraus quando os rótulos colidem.
  const lanesUp = [], lanesDown = [];
  data.forEach((m, i) => {
    const x = X(m.t);
    const up = i % 2 === 0;
    const lanes = up ? lanesUp : lanesDown;
    const textW = Math.max(90, String(m.label).length * 5.6);
    let lane = 0;
    while (lanes[lane] !== undefined && x - textW / 2 < lanes[lane]) lane++;
    lanes[lane] = x + textW / 2 + 10;

    const color = m.color || SEMANTIC.info;
    const stemLen = 50 + lane * 32;
    const ty = up ? axisY - stemLen : axisY + stemLen;
    // O rótulo é recuado quando encostaria na borda do viewBox.
    const tx = Math.min(Math.max(x, textW / 2 + 4), width - textW / 2 - 4);

    out += `<line x1="${r1(x)}" y1="${up ? axisY - 8 : axisY + 8}" x2="${r1(x)}" y2="${r1(up ? ty + 16 : ty - 14)}" stroke="${color}" stroke-width="1.3" stroke-dasharray="3 2"/>`
      + `<circle cx="${r1(x)}" cy="${axisY}" r="5.4" fill="#fff" stroke="${color}" stroke-width="2.6"/>`
      + `<text x="${r1(tx)}" y="${r1(up ? ty : ty)}" text-anchor="middle" font-size="11" font-weight="650" fill="${SEMANTIC.text}">${esc(m.label)}</text>`
      + `<text x="${r1(tx)}" y="${r1(up ? ty + 13 : ty + 13)}" text-anchor="middle" font-size="10" fill="${color}">${esc(shortDate(m.date))}</text>`
      + `<title>${esc(`${m.label} — ${shortDate(m.date)}`)}</title>`;
  });

  const aria = label || `Linha do tempo com ${data.length} marcos, de ${shortDate(data[0].date)} a ${shortDate(data[data.length - 1].date)}. A tabela abaixo traz as mesmas datas.`;
  return figure(out, { viewBox: `0 0 ${width} ${height}`, label: aria, extraClass: "chart--timeline" });
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthTicks(t0, t1) {
  const out = [];
  const d = new Date(t0);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= t1 && out.length < 24) {
    out.push({ t: d.getTime(), label: MONTHS[d.getUTCMonth()] });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ═══════════════════════════ burnup ═══════════════════════════
   Escopo total (linha tracejada) contra fechado acumulado, com projeção pontilhada.
   A projeção sai VAZADA de propósito: é a diferença visual entre o que aconteceu e
   o que é conta. */

export function burnup(points, { scope, projection = [], width = 940, label = "" } = {}) {
  const data = (points || []).filter((p) => Number.isFinite(p.value));
  if (data.length < 2 || !Number.isFinite(scope)) return "";

  const height = 280, padL = 52, padR = 96, padT = 18, padB = 46;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const all = [...data.map((p) => p.value), scope, ...projection.map((p) => p.value)];
  const max = niceMax(Math.max(...all, 1));
  const n = data.length + projection.length;
  const stepX = n > 1 ? plotW / (n - 1) : plotW;
  const X = (i) => padL + i * stepX;
  const Y = (v) => padT + plotH - (v / max) * plotH;

  let out = "";
  for (let t = 0; t <= 4; t++) {
    const v = (max / 4) * t, y = Y(v);
    out += `<line x1="${padL}" y1="${r1(y)}" x2="${width - padR}" y2="${r1(y)}" stroke="${t === 0 ? SEMANTIC.line : SEMANTIC.grid}"/>`
      + `<text x="${padL - 8}" y="${r1(y + 4)}" text-anchor="end" font-size="11" fill="${SEMANTIC.text3}">${nf(Math.round(v))}</text>`;
  }

  const scopeY = Y(scope);
  out += `<line x1="${padL}" y1="${r1(scopeY)}" x2="${width - padR}" y2="${r1(scopeY)}" stroke="${SEMANTIC.crit}" stroke-width="1.4" stroke-dasharray="6 4"/>`
    + `<text x="${width - padR + 6}" y="${r1(scopeY + 4)}" font-size="11" font-weight="650" fill="${SEMANTIC.crit}">${nf(scope)} escopo</text>`;

  const path = data.map((p, i) => `${i ? "L" : "M"}${r1(X(i))} ${r1(Y(p.value))}`).join(" ");
  out += `<path d="${path}" fill="none" stroke="${SEMANTIC.info}" stroke-width="2.6" stroke-linejoin="round"/>`;
  data.forEach((p, i) => {
    out += `<circle cx="${r1(X(i))}" cy="${r1(Y(p.value))}" r="3.6" fill="${SEMANTIC.info}"><title>${esc(`${p.label}: ${nf(p.value)}`)}</title></circle>`
      + `<g transform="translate(${r1(X(i))},${padT + plotH + 16}) rotate(-26)"><text text-anchor="end" font-size="10.5" fill="${SEMANTIC.text3}">${esc(p.label)}</text></g>`;
  });

  if (projection.length) {
    const start = data.length - 1;
    const pj = [{ value: data[data.length - 1].value }, ...projection];
    const pPath = pj.map((p, i) => `${i ? "L" : "M"}${r1(X(start + i))} ${r1(Y(p.value))}`).join(" ");
    out += `<path d="${pPath}" fill="none" stroke="${SEMANTIC.neutral}" stroke-width="2" stroke-dasharray="5 4"/>`;
    projection.forEach((p, i) => {
      const x = X(start + 1 + i);
      out += `<circle cx="${r1(x)}" cy="${r1(Y(p.value))}" r="3.6" fill="#fff" stroke="${SEMANTIC.neutral}" stroke-width="2"><title>${esc(`${p.label}: ${nf(p.value)} (projetado)`)}</title></circle>`
        + `<g transform="translate(${r1(x)},${padT + plotH + 16}) rotate(-26)"><text text-anchor="end" font-size="10.5" fill="${SEMANTIC.axis}">${esc(p.label)}</text></g>`;
    });
  }

  const aria = label || `Burnup: ${data.map((p) => `${p.label} ${p.value}`).join(", ")}; escopo ${scope}.`;
  return figure(out, { viewBox: `0 0 ${width} ${height}`, label: aria, extraClass: "chart--burnup" });
}

/* ═══════════════════════════ diagrama de arquitetura ═══════════════════════════
   Caixas em faixas verticais, ligadas por arestas. Não é um gerador de grafo
   genérico: recebe posições declaradas, porque layout automático de 8 nós produz
   cruzamentos que confundem mais do que a ausência do diagrama. */

export function archDiagram(spec, { width = 940, label = "" } = {}) {
  const nodes = (spec && spec.nodes) || [];
  const edges = (spec && spec.edges) || [];
  if (nodes.length < 2) return "";

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const height = (spec.height || 392);
  const NW = spec.nodeWidth || 158, NH = spec.nodeHeight || 56;

  let out = "";
  // Arestas primeiro: passam por baixo das caixas.
  for (const e of edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) continue;
    const color = e.color || (e.kind === "async" ? SEMANTIC.warn : e.kind === "state" ? "#7a4b8f" : SEMANTIC.info);
    const dash = e.kind === "sync" ? "" : ` stroke-dasharray="${e.kind === "state" ? "3 3" : "6 4"}"`;
    const [x1, y1, x2, y2] = [a.x + NW / 2, a.y + NH / 2, b.x + NW / 2, b.y + NH / 2];
    const mx = (x1 + x2) / 2;
    out += `<path d="M${r1(x1)} ${r1(y1)} C${r1(mx)} ${r1(y1)} ${r1(mx)} ${r1(y2)} ${r1(x2)} ${r1(y2)}" stroke="${color}" stroke-width="1.6" fill="none"${dash}/>`;
    if (e.label) {
      out += `<text x="${r1(mx)}" y="${r1((y1 + y2) / 2 - 5)}" text-anchor="middle" font-size="10" fill="${SEMANTIC.text3}">${esc(e.label)}</text>`;
    }
  }
  for (const n of nodes) {
    const fill = n.fill || "#ffffff";
    const stroke = n.color || SEMANTIC.line;
    out += `<rect x="${n.x}" y="${n.y}" width="${NW}" height="${NH}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`
      + `<text x="${n.x + NW / 2}" y="${n.y + (n.sub ? 24 : 33)}" text-anchor="middle" font-size="12" font-weight="650" fill="${SEMANTIC.text}">${esc(clip(n.label, 22))}</text>`;
    if (n.sub) out += `<text x="${n.x + NW / 2}" y="${n.y + 40}" text-anchor="middle" font-size="10" fill="${SEMANTIC.text3}">${esc(clip(n.sub, 26))}</text>`;
  }

  const aria = label || `Diagrama de arquitetura com ${nodes.length} componentes: ${nodes.map((n) => n.label).join(", ")}.`;
  return `<div class="swim-scroll">${figure(out, { viewBox: `0 0 ${width} ${height}`, label: aria, extraClass: "chart--arch" })}</div>`;
}

/* ═══════════════════════════ barrinha inline ═══════════════════════════
   Dentro de célula de tabela. Não é gráfico, é ordem de grandeza ao lado do número. */

export function miniBar(segments, { title = null } = {}) {
  const segs = (segments || []).filter((s) => s.pct > 0);
  if (!segs.length) return "";
  return `<span class="mini-bar"${title ? ` title="${attr(title)}"` : ""}>`
    + segs.map((s) => `<i style="width:${r1(Math.min(100, s.pct))}%;background:${attr(s.color)}"></i>`).join("")
    + "</span>";
}

/* ═══════════════════════════ dados do gráfico de séries ligáveis ═══════════════════════════
   Este NÃO desenha: serializa o payload que o script do cliente desenha, porque as
   séries são ligadas e desligadas em tempo de leitura e o eixo reescala a cada
   clique. É o único gráfico interativo do relatório. */

export function seriesChartData({ labels, dims }) {
  const dimensions = (dims || []).filter((d) => (d.series || []).length && (labels || []).length);
  if (!dimensions.length || !(labels || []).length) return null;
  return {
    labels,
    dims: dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      note: d.note || null,
      series: d.series.map((s, i) => ({
        key: s.key,
        label: s.label,
        color: s.color || SERIES[i % SERIES.length],
        per: s.per,
        cum: s.cum || cumulative(s.per),
        available: s.available ?? null,
      })),
    })),
  };
}

export function cumulative(per) {
  let acc = 0;
  return (per || []).map((v) => (acc += (v || 0)));
}

/* ═══════════════════════════ bugs: tema e acessibilidade ═══════════════════════════
   Os dois gráficos de bugs pintam por CLASSE (`bugc-*`, `chart-ink*`), e as classes leem
   tokens do report-theme.css — é o que deixa o desenho acompanhar o tema claro e o escuro.
   O `fill` literal continua no elemento como reserva: alguns conversores de PDF ignoram a
   folha de estilo dentro do SVG, e aí vale o atributo (a mesma razão dos outros gráficos
   deste arquivo usarem cor literal).

   Cada SVG leva `<title>` e `<desc>` ligados por `aria-labelledby`, e quem chama sempre
   publica a tabela equivalente ao lado. */

const BUG_FILL = {
  open: SEMANTIC.crit, closed: SEMANTIC.ok,
  noneOpen: SEMANTIC.neutral, noneClosed: SEMANTIC.line,
};

/* Os ids de title/desc são sequenciais POR RENDERIZAÇÃO: o renderer chama
   resetChartIds() no início de cada documento. Um contador global do módulo fazia o mesmo
   dado sair com ids diferentes a cada render no mesmo processo (testes, --render-only em
   lote), e o HTML deixava de ser reprodutível. */
let a11ySeq = 0;
export function resetChartIds() { a11ySeq = 0; }

function a11yFigure(inner, { viewBox, title, desc, extraClass = "" }) {
  const id = `chart-a11y-${++a11ySeq}`;
  return `<figure class="chart ${extraClass}"><svg viewBox="${attr(viewBox)}" role="img" aria-labelledby="${id}-t ${id}-d" preserveAspectRatio="xMinYMin meet">`
    + `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>${inner}</svg></figure>`;
}

function legendRow(items, x0, y) {
  let x = x0;
  let out = "";
  for (const l of items) {
    out += `<rect x="${r1(x)}" y="${y - 9}" width="11" height="11" rx="2" class="${l.cls}" fill="${l.fill}"/>`
      + `<text x="${r1(x + 17)}" y="${y}" font-size="12" class="chart-ink-2" fill="${SEMANTIC.text2}">${esc(l.label)}</text>`;
    x += 30 + String(l.label).length * 6.6;
  }
  return out;
}

/**
 * Barras horizontais por módulo, empilhadas em abertos e fechados.
 *
 * O comprimento é proporcional ao TOTAL do módulo (não normaliza para 100%): um módulo
 * com 40 bugs precisa parecer maior que um com 4. A linha «Sem módulo identificado» chega
 * por último, com `none: true`, e sai em tons neutros — ela não é um módulo, é a medida do
 * que o tracker deixou de dizer. Todo segmento tem o número dentro quando cabe, e toda
 * linha termina com «N abertos · M fechados», para nenhum valor depender de caber.
 */
export function bugModuleBars(rows, { width = 940, labelW = 250, rowH = 22, gap = 10 } = {}) {
  const data = (rows || []).filter((r) => r && (r.open + r.closed) > 0);
  if (!data.length) return "";
  const legendH = 28;
  const trailW = 170;
  const plotX = labelW + 12;
  const plotW = width - plotX - trailW;
  const step = rowH + gap;
  const height = legendH + data.length * step;
  const maxTotal = Math.max(...data.map((r) => r.open + r.closed), 1);

  let out = legendRow([
    { label: "Abertos", cls: "bugc-open", fill: BUG_FILL.open },
    { label: "Fechados", cls: "bugc-closed", fill: BUG_FILL.closed },
    ...(data.some((r) => r.none) ? [{ label: "Sem módulo identificado", cls: "bugc-none-open", fill: BUG_FILL.noneOpen }] : []),
  ], plotX, 16);

  data.forEach((r, i) => {
    const y = legendH + i * step;
    const mid = y + rowH / 2 + 4.5;
    out += `<text x="${labelW}" y="${r1(mid)}" text-anchor="end" font-size="12.5" font-weight="550" class="${r.none ? "chart-ink-3" : "chart-ink"}" fill="${r.none ? SEMANTIC.text3 : SEMANTIC.text}">${esc(clip(r.label, 38))}</text>`;
    let x = plotX;
    for (const [kind, value] of [["open", r.open], ["closed", r.closed]]) {
      if (!value) continue;
      const w = (value / maxTotal) * plotW;
      const cls = r.none ? (kind === "open" ? "bugc-none-open" : "bugc-none-closed") : `bugc-${kind}`;
      const fill = r.none ? (kind === "open" ? BUG_FILL.noneOpen : BUG_FILL.noneClosed) : BUG_FILL[kind];
      out += `<rect x="${r1(x)}" y="${y}" width="${r1(Math.max(w, 1.5))}" height="${rowH}" class="${cls}" fill="${fill}"><title>${esc(`${r.label} — ${kind === "open" ? "abertos" : "fechados"}: ${nf(value)}`)}</title></rect>`;
      if (fitsInside(w, String(value).length)) {
        const onLight = r.none && kind === "closed";
        out += `<text x="${r1(x + w / 2)}" y="${r1(mid)}" text-anchor="middle" font-size="11.5" font-weight="650" class="${onLight ? "chart-ink" : "chart-on-fill"}" fill="${onLight ? SEMANTIC.text : "#ffffff"}">${nf(value)}</text>`;
      }
      x += w;
    }
    out += `<text x="${width - 4}" y="${r1(mid)}" text-anchor="end" font-size="11.5" font-weight="600" class="chart-ink-2" fill="${SEMANTIC.text2}">${esc(`${nf(r.open)} ${r.open === 1 ? "aberto" : "abertos"} · ${nf(r.closed)} ${r.closed === 1 ? "fechado" : "fechados"}`)}</text>`;
  });

  return a11yFigure(out, {
    viewBox: `0 0 ${width} ${height}`,
    title: "Bugs por módulo, abertos e fechados",
    desc: `${data.length} linha(s): ${data.map((r) => `${r.label}, ${r.open} abertos e ${r.closed} fechados`).join("; ")}. A tabela abaixo traz os mesmos números.`,
    extraClass: "chart--bugs",
  });
}

/**
 * Bugs abertos e fechados por semana — duas colunas por semana, com o eixo começando no
 * zero. Quem chama só o pede com 4 semanas ou mais de dado.
 */
export function bugWeeklyColumns(weeks, { width = 940, height = 250 } = {}) {
  const data = (weeks || []).filter((w) => w && Number.isFinite(w.opened) && Number.isFinite(w.closed));
  if (data.length < 2) return "";
  const padL = 46, padR = 12, padT = 34, padB = 52;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const max = niceMax(Math.max(...data.map((w) => Math.max(w.opened, w.closed)), 1));
  const slot = plotW / data.length;
  const barW = Math.max(2, Math.min(16, slot * 0.36));
  const baseY = padT + plotH;

  let out = legendRow([
    { label: "Abertos na semana", cls: "bugc-open", fill: BUG_FILL.open },
    { label: "Fechados na semana", cls: "bugc-closed", fill: BUG_FILL.closed },
  ], padL, 16);
  for (let t = 0; t <= 4; t++) {
    const v = (max / 4) * t;
    const y = baseY - (v / max) * plotH;
    out += `<line x1="${padL}" y1="${r1(y)}" x2="${width - padR}" y2="${r1(y)}" class="${t === 0 ? "chart-axis" : "chart-grid"}" stroke="${t === 0 ? SEMANTIC.line : SEMANTIC.grid}" stroke-width="1"/>`
      + `<text x="${padL - 8}" y="${r1(y + 4)}" text-anchor="end" font-size="11" class="chart-ink-3" fill="${SEMANTIC.text3}">${nf(Math.round(v))}</text>`;
  }
  const every = data.length > 16 ? Math.ceil(data.length / 14) : 1;
  data.forEach((w, i) => {
    const cx = padL + slot * i + slot / 2;
    for (const [kind, value, dx] of [["open", w.opened, -barW / 2 - 1], ["closed", w.closed, barW / 2 + 1]]) {
      const h = value ? Math.max((value / max) * plotH, 2) : 0;
      const x = cx + dx - barW / 2;
      if (h) {
        out += `<rect x="${r1(x)}" y="${r1(baseY - h)}" width="${r1(barW)}" height="${r1(h)}" class="bugc-${kind}" fill="${BUG_FILL[kind]}"><title>${esc(`Semana de ${w.label} — ${kind === "open" ? "abertos" : "fechados"}: ${nf(value)}`)}</title></rect>`;
        if (barW >= 9) out += `<text x="${r1(x + barW / 2)}" y="${r1(baseY - h - 3)}" text-anchor="middle" font-size="9.5" font-weight="650" class="chart-ink-2" fill="${SEMANTIC.text2}">${nf(value)}</text>`;
      }
    }
    if (i % every === 0 || i === data.length - 1) {
      out += `<g transform="translate(${r1(cx)},${baseY + 14}) rotate(-28)"><text x="0" y="0" text-anchor="end" font-size="10.5" class="chart-ink-3" fill="${SEMANTIC.text3}">${esc(w.label)}</text></g>`;
    }
  });

  const tot = (k) => data.reduce((a, w) => a + w[k], 0);
  return a11yFigure(out, {
    viewBox: `0 0 ${width} ${height}`,
    title: "Bugs abertos e fechados por semana",
    desc: `${data.length} semanas, de ${data[0].label} a ${data[data.length - 1].label}: ${tot("opened")} bugs abertos e ${tot("closed")} fechados no período. A tabela equivalente acompanha o gráfico.`,
    extraClass: "chart--bugs-week",
  });
}

/* ═══════════════════════════ célula de intensidade ═══════════════════════════ */

export function heatCell(value, max, { fmt = nf } = {}) {
  if (!Number.isFinite(value)) return `<span class="muted">—</span>`;
  if (!value) return `<span class="muted">·</span>`;
  const h = max ? Math.min(1, value / max) : 0;
  return `<span class="heat${h > 0.62 ? " heat--dark" : ""}" style="--h:${h.toFixed(3)}">${esc(fmt(value))}</span>`;
}
