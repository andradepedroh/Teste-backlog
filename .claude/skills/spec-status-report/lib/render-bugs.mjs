// render-bugs.mjs — seção «Bugs por módulo», dentro de «Execução e backlog».
//
// Sem bug no escopo, a seção não existe. Com bug, ela mostra três leituras do mesmo
// conjunto — por módulo (gráfico + tabela de apoio), por semana (só com 4 semanas ou
// mais de dado) e bug a bug com a pista que decidiu o módulo — e nenhuma delas tem número
// que não volte a um card do tracker. Ver lib/bug-modules.mjs para a atribuição.

import { attr, esc } from "./escape.mjs";
import { bugModuleBars, bugWeeklyColumns } from "./charts.mjs";
import {
  asks, callout, filterOptions, filterOptionsMulti, fold, grid, multiValue, note, panel, pill, safeUrl, table,
} from "./components.mjs";
import { BUG_RULES } from "./bug-modules.mjs";
import { categoryPill, clip, fmtDate, h2, h3, nf } from "./render-shared.mjs";

const RULE_LABEL = Object.fromEntries(BUG_RULES.map((r) => [r.key, r.label]));

export function renderBugs(ctx) {
  const b = ctx.d.bugs;
  if (!b || !b.total) return "";

  const types = b.types.length ? b.types.join(" / ") : "Bug";
  const p = [h2("gestao-bugs", "Bugs por módulo", b.total)];
  p.push(ctx.ask("gestao.bugs") || asks(
    "Onde estão os bugs, e quantos seguem abertos",
    `<strong>${nf(b.open)} ${b.open === 1 ? "aberto" : "abertos"}</strong> e ${nf(b.closed)} ${b.closed === 1 ? "fechado" : "fechados"} entre os ${nf(b.total)} itens registrados como <strong>${esc(types)}</strong>. Cada bug foi ligado a um módulo pela primeira pista encontrada no tracker, numa ordem fixa — a tabela mostra qual pista decidiu cada contagem.`,
  ));
  p.push(ctx.callouts("gestao.bugs"));

  if (b.multiModule.bugs) {
    p.push(callout(
      "Há dupla contagem",
      `<p>${nf(b.multiModule.bugs)} ${b.multiModule.bugs === 1 ? "bug cita" : "bugs citam"} mais de um módulo e ${b.multiModule.bugs === 1 ? "conta" : "contam"} em cada um deles. Por isso a soma das linhas passa do total em ${nf(b.multiModule.extraCounts)}. ${b.multiModule.bugs === 1 ? "O bug é" : "Os bugs são"}: ${b.multiModule.ids.slice(0, 20).map((id) => `#${esc(id)}`).join(", ")}${b.multiModule.ids.length > 20 ? "…" : ""}.</p>`,
      "warn",
    ));
  }

  const chart = bugModuleBars(b.modules.filter((m) => m.open + m.closed > 0));
  if (chart) {
    p.push(panel({
      title: "Bugs abertos e fechados, por módulo",
      sub: "Ordenado pelos abertos e depois pelo total. O comprimento da barra é o total do módulo. «Sem módulo identificado» fica por último: são os bugs em que o tracker não deu nenhuma pista.",
      body: chart,
    }));
  }

  p.push(renderSupportTable(b));
  p.push(note(`Ordem das pistas, a primeira que achar vence: ${BUG_RULES.map((r) => `(${r.n}) ${esc(r.label)}`).join(" → ")}. O título só vale quando cita um código <code>MOD-XXX</code> ou começa por um prefixo entre colchetes igual ao nome ou à sigla de um módulo — <strong>nenhum módulo é atribuído por semelhança de palavras</strong>. Fechados incluem ${b.removed ? `os ${nf(b.removed)} removidos` : "os removidos, quando houver"}. Para corrigir um caso, grave o módulo em <code>status/bug-module-map.json</code> (por exemplo, <code>{ "1001": "MOD-ESTOQUE" }</code>) ou marque a tag <code>MOD-XXX</code> no card.`));

  p.push(renderWeekly(b));
  p.push(renderBugList(b));
  return p.filter(Boolean).join("\n");
}

function renderSupportTable(b) {
  const sev = b.severityAvailable;
  const td = b.testDefects;
  const cols = [
    "Módulo",
    { label: "Abertos", num: true }, { label: "Fechados", num: true }, { label: "Total", num: true },
    ...(sev ? ["Abertos por severidade"] : []),
    { label: "Idade média dos abertos", num: true },
    "Como o módulo foi atribuído",
    ...(td ? [{ label: "Defeitos achados pelos testes", num: true }] : []),
  ];
  const rows = b.modules.map((m) => ({
    cls: m.none ? "row-warn" : null,
    cells: [
      m.none ? `<em>${esc(m.label)}</em>` : `<strong${m.label === m.code ? ' class="nowrap"' : ""}>${esc(m.label)}</strong>`,
      { html: nf(m.open), num: true },
      { html: nf(m.closed), num: true },
      { html: nf(m.total), num: true },
      ...(sev ? [m.bySeverity.length ? `<span class="small">${m.bySeverity.map((s) => `${esc(s.label)}: ${nf(s.count)}`).join(" · ")}</span>` : `<span class="muted">—</span>`] : []),
      { html: m.avgOpenAgeDays === null ? `<span class="muted">—</span>` : `${nf(m.avgOpenAgeDays)} ${m.avgOpenAgeDays === 1 ? "dia" : "dias"}`, num: true },
      `<span class="small">${ruleSummary(m.rules) || `<span class="muted">—</span>`}</span>`,
      ...(td ? [{ html: m.testDefects ? nf(m.testDefects) : "0", num: true }] : []),
    ],
  }));
  const foot = [
    "<strong>Bugs distintos</strong>",
    { html: `<strong>${nf(b.open)}</strong>`, num: true },
    { html: `<strong>${nf(b.closed)}</strong>`, num: true },
    { html: `<strong>${nf(b.total)}</strong>`, num: true },
    ...(sev ? [`<span class="muted small">—</span>`] : []),
    { html: `<span class="muted small">—</span>`, num: true },
    `<span class="small">${ruleSummary(b.attribution)}</span>`,
    ...(td ? [{ html: `<strong>${nf(td.total)}</strong>`, num: true }] : []),
  ];
  return [
    table(cols, rows, { compact: true, variant: "evidence", foot }),
    td ? note(`<strong>Defeitos achados pelos testes</strong> é outra fonte: causas de falha de teste que a triagem (<code>test-findings.json</code>) classificou como defeito de produto, contadas uma vez por causa. Os bugs são cards do tracker; os defeitos vêm da execução dos testes desta geração — um não confirma nem desconta o outro.${td.unattributed ? ` ${nf(td.unattributed)} ${td.unattributed === 1 ? "defeito ficou" : "defeitos ficaram"} sem módulo: a causa não declara módulo e nenhum caso cita um item de negócio com módulo.` : ""}`) : "",
  ].filter(Boolean).join("\n");
}

function ruleSummary(counts) {
  return BUG_RULES.filter((r) => counts && counts[r.key]).map((r) => `${esc(r.label)} ${nf(counts[r.key])}`).join(" · ");
}

function renderWeekly(b) {
  if (!b.weekly) {
    return b.weeksWithData
      ? note(`A evolução semanal não foi montada: há dado de abertura ou de fechamento em ${nf(b.weeksWithData)} ${b.weeksWithData === 1 ? "semana" : "semanas"}, e a leitura exige pelo menos 4.`)
      : "";
  }
  const w = b.weekly;
  const chart = bugWeeklyColumns(w.weeks);
  if (!chart) return "";
  return [
    h3("gestao-bugs-semana", "Bugs abertos e fechados por semana", w.weeks.length),
    panel({
      title: "Abertos (data de criação) e fechados (data de fechamento), por semana",
      sub: `Semanas do calendário, de segunda a domingo${w.truncated ? "; o gráfico mostra as 52 semanas mais recentes" : ""}.`,
      body: chart,
      footer: b.closedWithoutDate ? note(`${nf(b.closedWithoutDate)} bug(s) fechado(s) sem data de fechamento registrada ficam fora das colunas de fechados.`) : "",
    }),
    fold(`Tabela equivalente ao gráfico (${w.weeks.length} semanas)`, table(
      ["Semana", { label: "Abertos", num: true }, { label: "Fechados", num: true }],
      // `start` é um dia (`AAAA-MM-DD`); o slice cobre o status-data.json antigo, que o gravava
      // como instante UTC e saía no fuso de Brasília como o domingo anterior.
      w.weeks.map((x) => [esc(`${x.label} (${fmtDate(String(x.start).slice(0, 10))})`), { html: nf(x.opened), num: true }, { html: nf(x.closed), num: true }]),
      { compact: true, variant: "evidence" },
    )),
  ].filter(Boolean).join("\n");
}

function renderBugList(b) {
  const rows = b.items.map((it) => {
    const mods = it.modules.length ? it.modules : ["Sem módulo identificado"];
    return {
      cls: it.rule === "nenhuma" ? "row-warn" : null,
      search: `${it.id} ${it.title} ${mods.join(" ")} ${it.evidence || ""}`,
      data: {
        modulo: multiValue(mods),
        regra: RULE_LABEL[it.rule] || it.rule,
        situacao: it.open ? "Aberto" : "Fechado",
      },
      sort: { id: Number(it.id) || 0, titulo: String(it.title || "").toLowerCase() },
      cells: [
        safeUrl(it.url) ? `<a href="${attr(safeUrl(it.url))}" target="_blank" rel="noopener noreferrer">${pill(`#${it.id}`, "neutral", { mono: true })}</a>` : pill(`#${it.id}`, "neutral", { mono: true }),
        `<span class="case-name">${esc(clip(it.title, 140))}</span>`,
        categoryPill(it.category, it.state),
        mods.map((m) => pill(m, it.modules.length ? "info" : "neutral", { mono: Boolean(it.modules.length) })).join(" "),
        `<span class="small">${esc(RULE_LABEL[it.rule] || it.rule)}</span>${it.evidence ? `<span class="case-suite">${esc(it.evidence)}</span>` : ""}`,
      ],
    };
  });
  return [
    h3("gestao-bugs-lista", "Bug a bug: de onde veio o módulo", b.total),
    grid({
      id: "grid-bugs", noun: "bug(s)", searchPlaceholder: "número, título, módulo…",
      columns: [
        { label: "Bug", sort: "id", num: false, width: "6rem" },
        { label: "Título", sort: "titulo" },
        { label: "Estado", sort: "estado", width: "9rem" },
        { label: "Módulo", sort: "modulo", width: "13rem" },
        { label: "Pista que decidiu", sort: "regra", width: "18rem" },
      ],
      rows,
      filters: [
        { key: "modulo", label: "Módulo", multi: true, options: filterOptionsMulti(rows, (r) => r.data.modulo.split("|").filter(Boolean)) },
        { key: "regra", label: "Pista", options: filterOptions(rows, (r) => r.data.regra) },
        { key: "situacao", label: "Situação", options: filterOptions(rows, (r) => r.data.situacao) },
      ],
      variant: "evidence", pageSize: 25, fixed: false,
    }),
  ].join("\n");
}
