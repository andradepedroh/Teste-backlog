// escape.mjs — utilitários de escape/format para o gerador de HTML da spec-estimate.

/** Escapa texto para inserção segura em conteúdo HTML. */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa para inserção dentro de atributo HTML. */
export function escAttr(value) {
  return esc(value);
}

/** Número com vírgula decimal (pt-BR), sem forçar casas. */
export function num(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(".", ",");
}

/** Classe de pill a partir da banda S/M/L/XL ou verde/amarelo/laranja/vermelho. */
export function bandPill(band) {
  const b = String(band || "").toLowerCase();
  if (["s", "green", "verde", "🟢"].includes(b)) return "p-green";
  if (["m", "amber", "amarelo", "🟡"].includes(b)) return "p-amber";
  if (["l", "orange", "laranja", "🟠"].includes(b)) return "p-orange";
  if (["xl", "red", "vermelho", "🔴"].includes(b)) return "p-red";
  return "p-amber";
}

/** Cor CSS a partir da banda (para valores/KPIs). */
export function bandColor(band) {
  const b = String(band || "").toLowerCase();
  if (["s", "green", "verde", "🟢"].includes(b)) return "var(--green)";
  if (["m", "amber", "amarelo", "🟡"].includes(b)) return "var(--amber)";
  if (["l", "orange", "laranja", "🟠"].includes(b)) return "var(--orange)";
  if (["xl", "red", "vermelho", "🔴"].includes(b)) return "var(--red)";
  return "var(--ink)";
}

/** Emoji da banda. */
export function bandEmoji(band) {
  const b = String(band || "").toLowerCase();
  if (["s", "green", "verde", "🟢"].includes(b)) return "🟢";
  if (["m", "amber", "amarelo", "🟡"].includes(b)) return "🟡";
  if (["l", "orange", "laranja", "🟠"].includes(b)) return "🟠";
  if (["xl", "red", "vermelho", "🔴"].includes(b)) return "🔴";
  return "";
}
