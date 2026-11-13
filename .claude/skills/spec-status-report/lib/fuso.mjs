// fuso.mjs — o dia do calendário no fuso do relatório.
//
// O relatório é lido no Brasil e todas as datas dele saem em America/Sao_Paulo (ver
// fmtDate em render-shared.mjs). Quem AGRUPA por dia ou por semana tem de usar o mesmo
// fuso: um bug aberto às 22h de domingo em Brasília já é segunda-feira em UTC, e o
// agrupamento em UTC o punha na semana seguinte — enquanto a tabela, formatada em
// Brasília, mostrava a segunda-feira como o domingo anterior.

export const REPORT_TZ = "America/Sao_Paulo";

const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Instante (ISO, número ou Date) → `AAAA-MM-DD` do dia no fuso do relatório.
 * Data sem hora (`2026-04-08`) já é um dia e volta como está. Inválido → null.
 */
export function localDay(value) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = value instanceof Date ? value : new Date(typeof value === "number" ? value : raw);
  if (Number.isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(DAY_FMT.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
