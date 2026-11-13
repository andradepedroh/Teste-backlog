// render-shared.mjs — utilidades comuns aos renderizadores de domínio.
//
// Existe para quebrar o ciclo: a casca (render-status-html) importa os domínios
// (render-domains) e ambos precisam dos mesmos formatadores e âncoras. Com os
// helpers aqui, o grafo de import fica acíclico e cada arquivo pode ser lido sozinho.

import { attr, esc, slug } from "./escape.mjs";

/* ─────────── títulos com metadados de navegação ───────────
   `data-nav-count` vira o contador à direita do link na sidebar; `data-nav-skip`
   deixa o título fora da navegação (usado em subtítulos repetitivos, como a ficha
   de cada endpoint, que estouraria a lista lateral com 40 entradas). */

export function h2(id, label, count = null) {
  return `<h2 id="${attr(id)}"${count !== null && count !== undefined ? ` data-nav-count="${attr(count)}"` : ""}>${label}</h2>`;
}

export function h3(id, label, count = null) {
  return `<h3 id="${attr(id)}"${count !== null && count !== undefined ? ` data-nav-count="${attr(count)}"` : ""}>${label}</h3>`;
}

export function h4(id, label) {
  return `<h4 id="${attr(id)}" data-nav-skip>${label}</h4>`;
}

/** h3 fora da navegação: título de leitura, não de índice. */
export function h3plain(label) { return `<h3 class="tight">${label}</h3>`; }

/* ─────────── formatação ─────────── */

export function nf(n) { return Number(n || 0).toLocaleString("pt-BR"); }

export function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

/** Percentual com uma casa e vírgula decimal — o relatório é lido em pt-BR. */
export function fmtPct(n) {
  if (n === null || n === undefined) return "—";
  return String(Math.round(Number(n) * 10) / 10).replace(".", ",");
}

export function fmtDate(iso) {
  if (!iso) return "—";
  // Data sem hora («2026-04-08») é um DIA, não um instante: `new Date()` a lê como meia-noite
  // UTC e o fuso de Brasília a devolvia como o dia anterior — o marco de 08/04 saía 07/04.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (day) return `${day[3]}/${day[2]}/${day[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

export function fmtDuration(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} min ${s} s`;
}

export function fmtBytes(kb) {
  if (!Number.isFinite(kb)) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/* ─────────── vocabulário ─────────── */

export function kindLabel(kind) {
  return {
    unitario: "Unitário", integracao: "Integração", funcional: "Funcional / E2E",
    contrato: "Contrato", performance: "Performance", acessibilidade: "Acessibilidade",
  }[kind] || kind || "—";
}

export function bandKind(band) {
  const b = String(band || "").toLowerCase();
  if (/alta|high/.test(b)) return "crit";
  if (/m[ée]dia|medium/.test(b)) return "warn";
  return "neutral";
}

export function testStatusPill(status) {
  return {
    passed: `<span class="pill pill-ok">aprovado</span>`,
    failed: `<span class="pill pill-crit">falhou</span>`,
    skipped: `<span class="pill pill-neutral">ignorado</span>`,
  }[status] || `<span class="pill pill-neutral">${esc(status)}</span>`;
}

export function traceStatusPill(status) {
  return {
    verified: `<span class="pill pill-ok">verificado por teste</span>`,
    implemented: `<span class="pill pill-warn">implementado</span>`,
    failing: `<span class="pill pill-crit">teste falhando</span>`,
    planned: `<span class="pill pill-neutral">só no backlog</span>`,
    unmapped: `<span class="pill pill-neutral">sem vínculo</span>`,
  }[status] || `<span class="pill pill-neutral">${esc(status)}</span>`;
}

export function categoryPill(category, state) {
  const cls = { done: "pill-ok", inProgress: "pill-warn", todo: "pill-neutral", removed: "pill-neutral", other: "pill-info" }[category] || "pill-neutral";
  return `<span class="pill ${cls}">${esc(state || category)}</span>`;
}

export function severityPill(sev, labelOverride) {
  const label = labelOverride || sev;
  const cls = sev === "alta" ? "pill-crit" : sev === "média" ? "pill-warn" : "pill-neutral";
  return `<span class="pill ${cls}">${esc(label)}</span>`;
}

/* ─────────── âncoras ─────────── */

export function frontAnchor(name) { return `frente-${slug(name)}`; }
export function opAnchor(o) { return `op-${slug(`${o.code}-${o.title}`)}`; }
export function flowAnchor(f) { return `fluxo-${slug(f.id || f.name)}`; }
export function svcAnchor(s) { return `surf-${slug(s.name || s.id)}`; }
export function ctxAnchor(name) { return `ctx-${slug(name)}`; }

/**
 * Caminho de iteração encurtado. Um `Projeto\Área\Onda 1\Sprint 3` inteiro ocupa
 * meia coluna e a parte que identifica está sempre no fim.
 */
export function shortIteration(p) {
  if (!p) return "—";
  const parts = String(p).split("\\");
  return parts.length > 2 ? `…\\${parts.slice(-2).join("\\")}` : p;
}

/** Nome curto de framework para a coluna; o completo fica no title. */
export function shortRunner(r) {
  return String(r || "").replace(/\s*\(.*\)\s*$/, "").trim() || String(r || "");
}

export function uniqStrings(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}
