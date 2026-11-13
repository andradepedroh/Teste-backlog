// render-domains.mjs — os domínios que não são o sumário.
//
// Vale aqui a mesma regra da casca: **seção sem fonte não é renderizada**, e quando
// existe um bloco equivalente montável com o que o projeto tem, a seção cai nele.
// Os dois caminhos mais importantes:
//
//   Negócio  — por OPERAÇÕES da EAP quando há `business-operations.json`;
//              por RN / RF / RNF / módulos quando não há.
//   Técnico  — superfície de API por FICHA quando há `api-catalog.json`;
//              por tabela de método/rota/resumo quando só há o `api-contracts.yaml`.
//
// Nenhum dos dois é "modo degradado" no sentido de saída pobre: são leituras
// diferentes do mesmo projeto, e cada uma diz de onde veio.

import { attr, esc, inline, mdToHtml, slug } from "./escape.mjs";
import {
  SEMANTIC, SERIES, archDiagram, burnup, chartLegend, columns, donut, hbarStack,
  heatCell, seriesChartData,
} from "./charts.mjs";
import {
  absent, asks, callout, chapter, coverageBar, dl2, filterOptions, fold, foldActions,
  grid, kpi, kpiGrid, methodPill, note, panel, pill, progressCell, requestResponse,
  safeUrl, signatures, srcLink, state, statusCode, table,
} from "./components.mjs";
import { renderGlossary } from "./glossary.mjs";
import { loadMatrix, projectionPoints } from "./derive-delivery.mjs";
import { renderBugs } from "./render-bugs.mjs";
import { EXTRA_ARTIFACTS, OVERRIDE_ARTIFACTS } from "./collect-extras.mjs";
import {
  bandKind, categoryPill, clip, ctxAnchor, flowAnchor, fmtBytes, fmtDate, fmtDateTime,
  fmtDuration, fmtPct, frontAnchor, h2, h3, h3plain, h4, kindLabel, nf, opAnchor, pct,
  severityPill, shortIteration, shortRunner, svcAnchor, testStatusPill, traceStatusPill,
  uniqStrings,
} from "./render-shared.mjs";

/* ═══════════════════════════════════════════════════════════════════════════
   NEGÓCIO
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderNegocio(ctx) {
  const { d } = ctx;
  const hasOps = Boolean(ctx.ops);
  const hasClassic = Boolean(
    d.business.modules.length || d.business.rules.length
    || d.business.requirements.functional.length || d.business.requirements.nonFunctional.length
    || d.business.chapters.length,
  );
  if (!hasOps && !hasClassic && !ctx.flows) return "";

  const p = [`<h1 id="h-negocio">Negócio entregue</h1>`];
  p.push(`<p class="lede">${ctx.section("negocio.lede") ? inline(ctx.section("negocio.lede")) : defaultBizLede(ctx)}</p>`);

  // Os dois blocos são INDEPENDENTES, cada um preso ao seu artefato: operações vêm de
  // `business-operations.json` (escopo contratado) e o catálogo vem de
  // `business-rules.md` / `requirements.md` (as regras e requisitos especificados).
  // São coisas diferentes e um projeto pode ter as duas — antes, ter operações
  // escondia o catálogo, o que é omitir documentação que existe.
  if (hasOps) {
    p.push(renderOpsMap(ctx));
    p.push(renderAcceptanceMatrix(ctx));
    p.push(renderOpsByFront(ctx));
  }
  if (hasClassic) p.push(renderClassicBusiness(ctx));

  p.push(renderFlows(ctx));

  // Documentos de negócio na íntegra, sempre por último e sempre dobrados.
  if (d.business.chapters.length) {
    p.push(h2("negocio-documentos", "Documentos de negócio", d.business.chapters.length));
    p.push(ctx.ask("negocio.documentos") || asks("O que a especificação diz, na íntegra", "Os artefatos de negócio como o pipeline os gerou. O relatório traz a síntese; o documento manda."));
    p.push(foldActions());
    for (const c of d.business.chapters) p.push(chapter(c.id, c.title, c.source, c.markdown));
  }

  return p.filter(Boolean).join("\n");
}

function defaultBizLede(ctx) {
  if (ctx.ops) {
    const t = ctx.ops.totals;
    return `O escopo é descrito por <strong>${t.total} ${t.total === 1 ? "operação" : "operações"}</strong>${ctx.ops.fronts.length > 1 ? `, agrupadas em ${ctx.ops.fronts.length} frentes` : ""}. Cada operação declara o que faz, as regras que a governam e o estado da evidência de código e de teste.`;
  }
  const b = ctx.d.business;
  const bits = [];
  if (b.modules.length) bits.push(`${b.modules.length} módulo(s)`);
  if (b.rules.length) bits.push(`${b.rules.length} regra(s) de negócio`);
  if (b.requirements.functional.length) bits.push(`${b.requirements.functional.length} requisito(s) funcional(is)`);
  return `O que o produto faz, para quem e sob quais regras${bits.length ? ` — ${bits.join(", ")}` : ""}. Esta é a especificação de negócio consolidada, a mesma que a equipe usou para construir.`;
}

/** Mapa da entrega: quatro leituras do mesmo escopo, cada uma só se tiver o campo. */
function renderOpsMap(ctx) {
  const ops = ctx.ops;
  const panels = [];

  if (ops.features.band && ops.fronts.length) {
    const bands = ["Alta", "Média", "Baixa"];
    const colors = { Alta: SEMANTIC.crit, Média: SEMANTIC.warn, Baixa: SEMANTIC.info };
    const chart = hbarStack(
      ops.fronts.map((f) => ({
        label: clip(f.name, 26),
        segments: bands.map((b) => ({
          label: `complexidade ${b.toLowerCase()}`,
          value: f.items.filter((o) => normBand(o.band) === b).length,
          color: colors[b],
        })),
      })),
      { width: 620, labelW: 180, rowH: 18, gap: 10, legend: bands.map((b) => ({ label: b, color: colors[b] })), trailing: (r) => String(r.segments.reduce((a, s) => a + s.value, 0)) },
    );
    if (chart) panels.push(panel({ title: "Complexidade das operações por frente", sub: "A banda de complexidade é a declarada no escopo. Ela explica por que poucas operações concentram o esforço.", body: chart }));
  }

  if (ops.totals.rules && ops.fronts.length) {
    const chart = columns(ops.fronts.map((f, i) => ({ label: clip(f.name, 14), value: f.rules, color: SERIES[i % SERIES.length] })), { width: 620, height: 200 });
    if (chart) panels.push(panel({ title: "Regras de negócio documentadas por frente", sub: `Total de ${nf(ops.totals.rules)} regras, cada uma com a origem declarada.`, body: chart }));
  }

  if (ops.features.where) {
    const counts = new Map();
    for (const o of ops.items) for (const w of o.where) counts.set(w, (counts.get(w) || 0) + 1);
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
      label: clip(label, 26), segments: [{ label, value, color: SERIES[i % SERIES.length] }],
    }));
    const chart = hbarStack(rows, { width: 620, labelW: 180, rowH: 18, gap: 10, trailing: (r) => `${pct(r.segments[0].value, ops.totals.total)}%` });
    if (chart) panels.push(panel({ title: "Onde a operação acontece", sub: "Uma operação pode tocar mais de um ponto do ecossistema — por isso a soma passa do total.", body: chart }));
  }

  if (ops.features.codeState || ops.features.testState) {
    const rows = [];
    if (ops.features.codeState) rows.push(evidenceRow("Código", ops.totals.codeConfirmed, ops.totals.codePartial, ops.totals.codeAbsent));
    if (ops.features.testState) rows.push(evidenceRow("Teste", ops.totals.testConfirmed, ops.totals.testPartial, ops.totals.testAbsent));
    const chart = hbarStack(rows, {
      width: 620, labelW: 80, rowH: 26, gap: 14,
      legend: [{ label: "Confirmado", color: SEMANTIC.ok }, { label: "Parcial", color: SEMANTIC.warn }, { label: "Sem evidência", color: SEMANTIC.crit }],
      trailing: (r) => `${pct(r.segments[0].value, ops.totals.total)}%`,
    });
    if (chart) {
      panels.push(panel({
        title: "Evidência de código e de teste",
        sub: "Confirmado = a varredura apontou arquivo. Parcial = parte da implementação localizada. Sem evidência = nada encontrado com o vocabulário buscado.",
        body: chart,
        footer: ops.totals.bothAbsent
          ? note(`${ops.totals.bothAbsent} ${ops.totals.bothAbsent === 1 ? "operação" : "operações"} sem código <em>e</em> sem teste: ${ops.items.filter((o) => o.codeState === "ausente" && o.testState === "ausente").map((o) => `<strong>${esc(o.code)}</strong>`).join(", ")} — ${"detalhadas em"} <a href="#visao/visao-atencao">Operações sem evidência completa</a>.`)
          : "",
      }));
    }
  }

  if (!panels.length) return "";
  return [
    h2("negocio-mapa", "Mapa da entrega"),
    ctx.ask("negocio.mapa"),
    pairPanels(panels),
    ctx.callouts("negocio.mapa"),
  ].filter(Boolean).join("\n");
}

function evidenceRow(label, ok, partial, absentN) {
  return {
    label,
    segments: [
      { label: "confirmado", value: ok, color: SEMANTIC.ok },
      { label: "parcial", value: partial, color: SEMANTIC.warn },
      { label: "sem evidência", value: absentN, color: SEMANTIC.crit },
    ],
  };
}

/** Painéis em pares; ímpar sobra sozinho em linha inteira, sem meia-caixa vazia. */
function pairPanels(panels) {
  const out = [];
  for (let i = 0; i < panels.length; i += 2) {
    const pair = panels.slice(i, i + 2);
    out.push(pair.length === 2 ? `<div class="grid cols-2">${pair.join("")}</div>` : pair[0]);
  }
  return out.join("\n");
}

function normBand(b) {
  const s = String(b || "").toLowerCase();
  if (/alta|high/.test(s)) return "Alta";
  if (/m[ée]dia|medium/.test(s)) return "Média";
  if (/baixa|low/.test(s)) return "Baixa";
  return "Baixa";
}

/** Matriz operação × critério de evidência. É a tabela que o cliente usa na homologação. */
function renderAcceptanceMatrix(ctx) {
  const ops = ctx.ops;
  if (!ops.features.codeState && !ops.features.testState) return "";

  const criteria = [
    ops.features.codeState ? { key: "codeState", label: "Código", get: (o) => o.codeState } : null,
    ops.features.testState ? { key: "testState", label: "Teste", get: (o) => o.testState } : null,
    ops.features.e2e ? { key: "e2e", label: "Teste E2E", get: (o) => (o.e2e === true ? "confirmado" : o.e2e === false ? "ausente" : null) } : null,
    ops.features.docs ? { key: "docs", label: "Documento", get: (o) => (o.docs ? "confirmado" : "ausente") } : null,
  ].filter(Boolean);

  const rows = ops.items.map((o) => {
    const full = criteria.every((c) => c.get(o) === "confirmado");
    const none = criteria.every((c) => c.get(o) === "ausente");
    return {
      cls: none ? "row-crit" : (full ? null : "row-warn"),
      search: `${o.code} ${o.title} ${o.front || ""}`,
      data: {
        frente: o.front || "",
        aceite: full ? "Pronta para aceite" : none ? "Sem evidência" : "Evidência parcial",
        ...(ops.features.band ? { banda: normBand(o.band) } : {}),
      },
      sort: { code: o.code, criterios: criteria.filter((c) => c.get(o) === "confirmado").length },
      cells: [
        `<a href="#negocio/${attr(opAnchor(o))}"><span class="op-code">${esc(o.code)}</span></a>`,
        `${esc(o.title)}${o.front ? `<br><span class="muted small">${esc(o.front)}</span>` : ""}`,
        ...criteria.map((c) => (c.get(o) ? state(c.get(o)) : `<span class="muted">—</span>`)),
        ...(ops.features.band ? [pill(normBand(o.band), bandKind(o.band))] : []),
      ],
    };
  });

  const ready = rows.filter((r) => r.data.aceite === "Pronta para aceite").length;

  return [
    h2("negocio-aceite", "Critérios de aceite × situação", ops.totals.total),
    ctx.ask("negocio.aceite") || asks(
      "Cada operação tem o que é preciso para ser homologada",
      `<strong>${ready} de ${ops.totals.total}</strong> ${ready === 1 ? "operação reúne" : "operações reúnem"} todos os critérios de evidência medidos. As demais precisam de evidência complementar da equipe ou de decisão de que o critério não se aplica.`,
    ),
    ctx.callouts("negocio.aceite"),
    grid({
      id: "grid-aceite", noun: "operação(ões)", searchPlaceholder: "código, descrição…",
      columns: [
        { label: "Operação", sort: "code", width: "6.5rem" },
        { label: "O que faz", sort: "desc" },
        ...criteria.map((c) => ({ label: c.label, sort: c.key, width: "7.5rem" })),
        ...(ops.features.band ? [{ label: "Compl.", sort: "band", width: "5.5rem" }] : []),
      ],
      rows,
      filters: [
        ...(ops.features.front ? [{ key: "frente", label: "Frente", options: filterOptions(rows, (r) => r.data.frente) }] : []),
        { key: "aceite", label: "Situação", options: filterOptions(rows, (r) => r.data.aceite) },
        ...(ops.features.band ? [{ key: "banda", label: "Complexidade", options: filterOptions(rows, (r) => r.data.banda) }] : []),
      ],
      variant: "evidence", pageSize: 50,
    }),
    ctx.note("negocio.aceite", "Cada célula traz símbolo e texto além da cor, para permanecer legível em impressão em preto e branco."),
  ].filter(Boolean).join("\n");
}

/** Detalhe por frente: cada operação com as suas regras, arquivos e testes. */
function renderOpsByFront(ctx) {
  const ops = ctx.ops;
  const groups = ops.fronts.length ? ops.fronts : [{ name: "Escopo", items: ops.items, total: ops.items.length }];
  const p = [h2("negocio-frentes", "Escopo detalhado", ops.totals.total)];
  p.push(ctx.ask("negocio.frentes"));
  p.push(foldActions());

  for (const f of groups) {
    p.push(h3(frontAnchor(f.name), esc(f.name), f.total));
    for (const o of f.items) p.push(renderOperation(ctx, o));
  }
  return p.filter(Boolean).join("\n");
}

function renderOperation(ctx, o) {
  const body = [];

  const meta = [
    o.front ? { label: "Frente", value: o.front } : null,
    o.band ? { label: "Complexidade", value: normBand(o.band) } : null,
    o.where.length ? { label: "Onde acontece", value: o.where.join(" · ") } : null,
    o.codeState ? { label: "Evidência de código", value: "", html: state(o.codeState) } : null,
    o.testState ? { label: "Evidência de teste", value: "", html: state(o.testState) } : null,
    o.docs ? { label: "Documentos", value: `${o.docs}` } : null,
  ].filter(Boolean);
  // dl2 descarta pares sem valor; os que trazem `html` precisam de `value` não vazio.
  const metaHtml = dl2(meta.map((m) => ({ ...m, value: m.html ? "·" : m.value })));
  if (metaHtml) body.push(metaHtml);

  if (o.purpose) body.push(`<p>${inline(o.purpose)}</p>`);
  if (o.note) body.push(callout("Observação da varredura", `<p>${inline(o.note)}</p>`, o.codeState === "ausente" ? "warn" : "read"));

  if (o.rules.length) {
    body.push(`<h4 data-nav-skip>Regras de negócio (${o.rules.length})</h4>`);
    body.push(`<ul class="rule-list">${o.rules.map((r) => `<li><span class="rule-id">${esc(r.id)}</span><span>${inline(r.text)}${r.origin || r.file ? `<span class="rule-origin">${r.file ? srcLink({ repo: r.repo, path: r.file, line: r.line, label: r.origin || undefined }) : `<code>${esc(r.origin)}</code>`}</span>` : ""}</span></li>`).join("")}</ul>`);
  }

  if (o.files.length) {
    body.push(`<h4 data-nav-skip>Onde está no código (${o.files.length})</h4>`);
    body.push(`<ul class="ev-list">${o.files.map((f) => `<li>${srcLink({ repo: f.repo, path: f.path, line: f.line })}${f.note ? ` <span class="muted small">${esc(f.note)}</span>` : ""}</li>`).join("")}</ul>`);
  }

  if (o.tests.length) {
    body.push(`<h4 data-nav-skip>Casos de teste (${o.tests.length})</h4>`);
    body.push(`<ul class="ev-list">${o.tests.map((t) => `<li>${testStatusPill(t.status)} ${esc(t.name)}${t.suite ? `<span class="case-suite">${esc(t.suite)}</span>` : ""}</li>`).join("")}</ul>`);
  }

  if (!body.length) body.push(`<p class="muted small">Sem detalhe declarado para esta operação além do código e do título.</p>`);

  const head = `<span class="op-head"><span class="op-code">${esc(o.code)}</span> <strong>${esc(o.title)}</strong>`
    + `${o.codeState ? ` ${state(o.codeState, o.codeState === "confirmado" ? "código" : `código ${o.codeState}`)}` : ""}`
    + `${o.rules.length ? ` <span class="muted small">${o.rules.length} regra(s)</span>` : ""}</span>`;

  return fold(head, body.join("\n"), { id: opAnchor(o) });
}

/** Caminho clássico: módulos, RN, RF, RNF, PR e casos de homologação. */
function renderClassicBusiness(ctx) {
  const b = ctx.d.business;
  const p = [];

  if (b.modules.length) {
    p.push(h2("negocio-modulos", "Módulos do produto", b.modules.length));
    p.push(table(["Código", "Módulo", "Propósito"], b.modules.map((m) => [
      pill(m.id, "neutral", { mono: true }), esc(m.name || ""), esc(m.purpose || ""),
    ])));
  }

  if (b.rules.length) {
    p.push(h2("negocio-regras", "Regras de negócio", b.rules.length));
    const rows = b.rules.map((r) => ({
      search: `${r.id} ${r.title} ${r.statement || ""} ${r.module || ""}`,
      data: { modulo: r.module || "", criticidade: r.criticality || "" },
      sort: { id: r.id },
      cells: [
        `<a href="#negocio/rn-${attr(slug(r.id))}">${pill(r.id, "info", { mono: true })}</a>`,
        `<span class="case-name">${esc(r.title)}</span>${r.statement ? `<span class="case-suite">${esc(clip(r.statement, 220))}</span>` : ""}`,
        r.module ? pill(r.module, "neutral", { mono: true }) : `<span class="muted">—</span>`,
        r.criticality ? esc(r.criticality) : `<span class="muted">—</span>`,
      ],
    }));
    p.push(grid({
      id: "grid-rn", noun: "regra(s)", searchPlaceholder: "ID, regra, módulo…",
      columns: [
        { label: "ID", sort: "id", width: "8rem" }, { label: "Regra", sort: "desc" },
        { label: "Módulo", sort: "modulo", width: "9rem" }, { label: "Criticidade", sort: "criticidade", width: "8rem" },
      ],
      rows,
      filters: [
        { key: "modulo", label: "Módulo", options: filterOptions(rows, (r) => r.data.modulo) },
        { key: "criticidade", label: "Criticidade", options: filterOptions(rows, (r) => r.data.criticidade) },
      ],
      pageSize: 50,
    }));
    p.push(h3("negocio-regras-detalhe", "Detalhamento das regras"));
    p.push(foldActions());
    for (const r of b.rules) {
      p.push(fold(`${esc(r.id)} — ${esc(r.title)}`, mdToHtml(r.markdown || r.statement || "", { headingOffset: 4 }), { id: `rn-${slug(r.id)}` }));
    }
  }

  for (const [key, label, list, kind] of [
    ["negocio-rf", "Requisitos funcionais", b.requirements.functional, "info"],
    ["negocio-rnf", "Requisitos não funcionais", b.requirements.nonFunctional, "neutral"],
    ["negocio-pr", "Requisitos de produto e UX", b.productRequirements, "neutral"],
  ]) {
    if (!list.length) continue;
    p.push(h2(key, label, list.length));
    p.push(table(["ID", "Requisito", "Módulo"], list.map((r) => [
      pill(r.id, kind, { mono: true }),
      `<span class="case-name">${esc(r.title)}</span>${r.statement && r.statement !== r.title ? `<span class="case-suite">${esc(clip(r.statement, 240))}</span>` : ""}`,
      r.module ? pill(r.module, "neutral", { mono: true }) : `<span class="muted">—</span>`,
    ]), { compact: true }));
  }

  if (b.testPlanCases.length) {
    p.push(h2("negocio-uat", "Plano de testes de negócio", b.testPlanCases.length));
    p.push(note(`Casos de homologação definidos em <code>test-plan.md</code>. O status de execução automatizada, quando existir, está em <a href="#testes/testes-cobertura">Testes</a>.`));
    p.push(table(["Caso", "Épica", "Funcionalidade", "Descrição"], b.testPlanCases.map((c) => [
      pill(c.id, "neutral", { mono: true }), esc(c.epic || "—"), esc(c.feature || "—"), esc(c.title || ""),
    ]), { compact: true }));
  }

  return p.filter(Boolean).join("\n");
}

/** Fluxos: do artefato de extensão quando existe; do flow-map do discovery quando não. */
/**
 * Fluxos de processo. Sem fluxo declarado em nenhum dos dois artefatos, **a seção não
 * existe** — não há nada no relatório que seja montado "no lugar" de um fluxo.
 *
 * Este é o único ponto em que dois artefatos descrevem a MESMA seção: o
 * `business-flows.json` (etapas, atores, telas, subfluxos) e o `flow-map.md` do
 * discovery (a tabela resumida). Quando os dois existem, o mais detalhado é o exibido —
 * duas seções «Fluxos de processo» produziriam título e âncora duplicados para o mesmo
 * conteúdo. Não é substituição: é a mesma informação, na melhor forma disponível.
 */
function renderFlows(ctx) {
  const rich = ctx.flows;
  const plain = ctx.d.business.flows || [];
  if (!rich && !plain.length) return "";

  const p = [h2("negocio-fluxos", "Fluxos de processo", (rich ? rich.items.length : plain.length))];
  p.push(ctx.ask("negocio.fluxos"));

  if (rich) {
    for (const f of rich.items) {
      p.push(h3(flowAnchor(f), `${esc(f.id)} — ${esc(f.name)}`, f.steps.length || null));
      const meta = dl2([
        f.actor ? { label: "Ator", value: f.actor } : null,
        f.type ? { label: "Tipo", value: f.type } : null,
        f.trigger ? { label: "Gatilho", value: f.trigger } : null,
        f.outcome ? { label: "Resultado", value: f.outcome } : null,
      ].filter(Boolean));
      if (meta) p.push(meta);
      if (f.objective) p.push(`<p>${inline(f.objective)}</p>`);
      if (f.steps.length) {
        p.push(table(
          [{ label: "#", width: "3rem", num: true }, { label: "Ator", width: "11rem" }, "Ação", ...(f.steps.some((s) => s.rules.length) ? ["Regras"] : [])],
          f.steps.map((s) => [
            { html: String(s.order), num: true },
            esc(s.actor || "—"),
            `${inline(s.action)}${s.system ? `<span class="case-suite">${esc(s.system)}</span>` : ""}`,
            ...(f.steps.some((x) => x.rules.length) ? [s.rules.map((r) => pill(r, "neutral", { mono: true })).join(" ") || `<span class="muted">—</span>`] : []),
          ]),
          { compact: true, variant: "evidence" },
        ));
      }
      if (f.screens.length) p.push(`<p class="small"><strong>Telas:</strong> ${f.screens.map((s) => pill(s.id, "neutral", { mono: true, title: s.name || undefined })).join(" ")}</p>`);
      for (const sf of f.subflows) {
        p.push(h4(`sub-${slug(sf.id)}`, esc(sf.name)));
        if (sf.steps.length) p.push(`<ul class="tight">${sf.steps.map((s) => `<li>${inline(s)}</li>`).join("")}</ul>`);
      }
    }
    return p.filter(Boolean).join("\n");
  }

  p.push(table(["Fluxo", "Tipo", "Ator", "Etapas", "Telas"], plain.map((f) => [
    `<span class="case-name">${esc(f.id)} — ${esc(f.name)}</span>${f.objective ? `<span class="case-suite">${esc(f.objective)}</span>` : ""}`,
    f.type ? pill(f.type, "neutral") : `<span class="muted">—</span>`,
    esc(f.actor || "—"),
    { html: String(f.stepCount || 0), num: true },
    f.screens.length ? f.screens.map((s) => pill(s.id, "neutral", { mono: true })).join(" ") : `<span class="muted">—</span>`,
  ])));
  return p.filter(Boolean).join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   TÉCNICO
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderTecnico(ctx) {
  const t = ctx.d.technical;
  const has = Boolean(t.rules.length || t.dataModel || t.apiContracts || t.chapters.length || ctx.api);
  if (!has) return "";

  const p = [`<h1 id="h-tecnico">Solução técnica</h1>`];
  p.push(`<p class="lede">${ctx.section("tecnico.lede") ? inline(ctx.section("tecnico.lede")) : defaultTechLede(ctx)}</p>`);

  p.push(renderArchitecture(ctx));
  p.push(renderDataModel(ctx));
  p.push(renderApi(ctx));
  p.push(renderSecurity(ctx));
  p.push(renderRules(ctx));

  if (t.chapters.length) {
    p.push(h2("tecnico-docs", "Documentos técnicos", t.chapters.length));
    p.push(foldActions());
    for (const c of t.chapters) p.push(chapter(c.id, c.title, c.source, c.markdown));
  }

  return p.filter(Boolean).join("\n");
}

function defaultTechLede(ctx) {
  const t = ctx.d.technical;
  const bits = [];
  if (t.dataModel) bits.push(`<strong>${t.dataModel.entityCount} entidades</strong> no modelo de dados`);
  if (ctx.api) bits.push(`<strong>${ctx.api.total} endpoints</strong> na superfície exposta`);
  else if (t.apiContracts) bits.push(`<strong>${t.apiContracts.endpointCount} operações</strong> declaradas no contrato`);
  if (t.rules.length) bits.push(`<strong>${t.rules.length} normas</strong> de implementação`);
  return `As decisões de engenharia que governam o código${bits.length ? `: ${bits.join(", ")}` : ""}.`;
}

/**
 * Diagrama de arquitetura: só sai com um `architecture` declarado no conteúdo
 * editorial (nós e arestas posicionados). Derivar layout de um markdown produziria
 * um grafo cruzado que confunde mais do que ajuda — por isso, sem spec, a seção cai
 * para o capítulo `architecture.md`, se houver, ou some.
 */
function renderArchitecture(ctx) {
  const arch = ctx.content.architecture || null;
  const channels = (ctx.d.technical.dataModel && ctx.d.technical.dataModel.channels) || [];
  const chap = (ctx.d.technical.chapters || []).find((c) => /arquitet|architecture/i.test(c.title));

  if (!arch && !channels.length && !chap) return "";
  const p = [h2("tecnico-arquitetura", "Arquitetura da solução")];
  p.push(ctx.ask("tecnico.arquitetura"));

  if (arch && (arch.nodes || []).length >= 2) {
    p.push(panel({
      title: arch.title || "Ecossistema e caminhos de chamada",
      sub: arch.sub || null,
      body: chartLegend(arch.legend || []) + archDiagram(arch),
    }));
  } else if (chap) {
    p.push(chapter(`${chap.id}-inline`, chap.title, chap.source, chap.markdown, { open: true }));
  }
  p.push(ctx.callouts("tecnico.arquitetura"));

  if (channels.length) {
    p.push(h3("tecnico-assincrono", "Canais assíncronos", channels.length));
    p.push(ctx.ask("tecnico.assincrono"));
    p.push(table(
      [{ label: "Canal", width: "22%" }, { label: "Tipo", width: "9rem" }, { label: "Sentido", width: "8rem" }, "O que trafega", "Garantia de idempotência"],
      channels.map((c) => [
        `<code>${esc(c.name || c.channel || "")}</code>${c.operation ? ` ${pill(c.operation, "ok")}` : ""}`,
        pill(c.type || "Canal", "info"),
        `<span class="small">${esc(c.direction || "—")}</span>`,
        `<span class="small">${esc(c.payload || c.description || "")}</span>`,
        `<span class="small">${esc(c.idempotency || "—")}</span>`,
      ]),
      { variant: "evidence" },
    ));
    p.push(ctx.note("tecnico.assincrono"));
  }
  return p.filter(Boolean).join("\n");
}


function renderDataModel(ctx) {
  const dm = ctx.d.technical.dataModel;
  if (!dm) return "";
  const p = [h2("tecnico-dados", "Modelo de dados", dm.entityCount)];
  p.push(ctx.ask("tecnico.dados"));

  // Natureza da intervenção: só sai quando o modelo declara operação por entidade.
  const byOp = countBy(dm.entities, (e) => e.operation || null);
  if (byOp.length > 1) {
    const colors = { CREATE: SEMANTIC.ok, ALTER: SEMANTIC.warn, READ: SEMANTIC.info, REFERENCE: SEMANTIC.neutral };
    const slices = byOp.map(([k, v], i) => ({ label: k, value: v, color: colors[String(k).toUpperCase()] || SERIES[i % SERIES.length] }));
    p.push(panel({
      title: "Natureza da intervenção no banco",
      sub: "Só as estruturas alteradas exigem janela de carga e plano de rollback.",
      body: `<div class="chart-row">${donut(slices, { centerValue: dm.entityCount, centerLabel: "entidades" })}${chartLegend(slices.map((s) => ({ ...s, value: s.value })))}</div>`,
    }));
  }

  const byContext = groupBy(dm.entities, (e) => e.context || e.boundedContext || null);
  const grouped = byContext.size > 1;

  const rows = dm.entities.map((e) => ({
    search: `${e.name} ${e.table || ""} ${e.purpose || ""}`,
    data: { operacao: e.operation || "", contexto: e.context || e.boundedContext || "" },
    sort: { nome: e.name, atributos: e.attributeCount },
    cells: [
      `<a href="#tecnico/ent-${attr(slug(e.name))}"><strong>${esc(e.name)}</strong></a>`,
      e.table ? `<code>${esc(e.table)}</code>` : `<span class="muted">—</span>`,
      e.operation ? pill(e.operation, e.operation === "CREATE" ? "ok" : "warn") : `<span class="muted">—</span>`,
      { html: String(e.attributeCount), num: true },
      { html: String(e.relationships.length), num: true },
      `<span class="small">${esc(clip(e.purpose || "", 160))}</span>`,
    ],
  }));

  p.push(grid({
    id: "grid-entidades", noun: "entidade(s)", searchPlaceholder: "entidade, tabela…",
    columns: [
      { label: "Entidade", sort: "nome", width: "16%" }, { label: "Tabela", sort: "tabela", width: "16%" },
      { label: "Operação", sort: "operacao", width: "7rem" }, { label: "Atributos", sort: "atributos", num: true, width: "6rem" },
      { label: "Relações", sort: "relacoes", num: true, width: "6rem" }, { label: "Propósito", sort: "proposito" },
    ],
    rows,
    filters: [
      ...(grouped ? [{ key: "contexto", label: "Contexto", options: filterOptions(rows, (r) => r.data.contexto) }] : []),
      { key: "operacao", label: "Operação", options: filterOptions(rows, (r) => r.data.operacao) },
    ],
    pageSize: 50,
  }));

  p.push(h3("tecnico-tabelas", "Ficha das entidades", dm.entityCount));
  p.push(foldActions());
  const order = grouped ? [...byContext.entries()] : [[null, dm.entities]];
  for (const [ctxName, list] of order) {
    if (ctxName) p.push(h4(ctxAnchor(ctxName), `${esc(ctxName)} <span class="muted small">· ${list.length} entidade(s)</span>`));
    for (const e of list) p.push(renderEntity(e));
  }
  p.push(ctx.note("tecnico.dados", `Fonte: <code>${esc(dm.path)}</code>${dm.version ? ` · versão ${esc(dm.version)}` : ""}${dm.enums ? ` · ${dm.enums} enumeração(ões)` : ""}.`));
  return p.filter(Boolean).join("\n");
}

function renderEntity(e) {
  const body = [];
  if (e.table || e.operation) {
    body.push(`<p class="meta-strip">${e.table ? `<code>${esc(e.table)}</code>` : ""}${e.operation ? ` · ${esc(e.operation)}` : ""}${e.owner ? ` · responsável: ${esc(e.owner)}` : ""}</p>`);
  }
  if (e.purpose) body.push(`<p>${inline(e.purpose)}</p>`);
  if (e.attributes.length) {
    body.push(table(
      ["Atributo", "Tipo", { label: "Obrig.", width: "5rem" }, "Descrição"],
      e.attributes.map((a) => [
        `<code>${esc(a.name)}</code>${a.pk ? ` <span class="key">PK</span>` : ""}${a.fk ? ` <span class="key key--fk">FK</span>` : ""}${a.indexed ? ` <span class="key key--ix">IX</span>` : ""}`,
        esc(a.type || ""),
        a.required === true ? pill("sim", "ok") : a.required === false ? `<span class="muted">não</span>` : `<span class="muted">—</span>`,
        `<span class="small">${esc(a.description || "")}</span>`,
      ]),
      { compact: true, variant: "evidence" },
    ));
  }
  if (e.relationships.length) {
    body.push(table(["Tipo", "Alvo", "Via"], e.relationships.map((r) => [
      esc(r.type), esc(r.target), r.via ? `<code>${esc(r.via)}</code>` : "—",
    ]), { compact: true, variant: "evidence" }));
  }
  if (!body.length) body.push(`<p class="muted small">Sem atributos nem relacionamentos declarados.</p>`);
  return fold(`<strong>${esc(e.name)}</strong>${e.table ? ` <span class="muted small">· ${esc(e.table)}</span>` : ""}`, body.join("\n"), { id: `ent-${slug(e.name)}` });
}

/** Superfície de API: catálogo com ficha quando existe; leitura do OpenAPI quando não. */
function renderApi(ctx) {
  if (ctx.api) return renderApiCatalog(ctx);
  const a = ctx.d.technical.apiContracts;
  if (!a) return "";
  const p = [h2("tecnico-api", "Superfície de API", a.endpointCount)];
  p.push(ctx.ask("tecnico.api"));
  p.push(note(`Fonte: <code>${esc(a.path)}</code>${a.title ? ` · ${esc(a.title)}` : ""}${a.version ? ` v${esc(a.version)}` : ""}. Esta é a <strong>leitura de superfície</strong> do contrato OpenAPI — método, rota e resumo. A ficha por endpoint, com requisição, resposta e códigos de status, depende de <code>api-catalog.json</code>.`));
  if (!a.endpoints.length) return "";
  const rows = a.endpoints.map((e) => ({
    search: `${e.method} ${e.path} ${e.summary || ""} ${e.operationId || ""}`,
    data: { metodo: e.method },
    sort: { rota: e.path, metodo: e.method },
    cells: [
      methodPill(e.method), `<span class="ep-path">${esc(e.path)}</span>`,
      e.operationId ? `<code>${esc(e.operationId)}</code>` : `<span class="muted">—</span>`,
      `<span class="small">${esc(e.summary || "")}</span>`,
    ],
  }));
  p.push(grid({
    id: "grid-api", noun: "operação(ões)", searchPlaceholder: "rota, operação…",
    columns: [{ label: "Método", sort: "metodo", width: "6rem" }, { label: "Rota", sort: "rota", width: "34%" }, { label: "Operação", sort: "op", width: "16%" }, { label: "Resumo", sort: "resumo" }],
    rows,
    filters: [{ key: "metodo", label: "Método", options: filterOptions(rows, (r) => r.data.metodo) }],
    pageSize: 50,
  }));
  return p.filter(Boolean).join("\n");
}

function renderApiCatalog(ctx) {
  const api = ctx.api;
  const p = [h2("tecnico-api", "Superfície de API", api.total)];
  p.push(ctx.ask("tecnico.api"));

  if (api.conventions.length) {
    p.push(h3("tecnico-api-convencoes", "Convenções da superfície"));
    p.push(dl2(api.conventions.map((c) => ({ label: c.label, value: c.value }))));
  }

  const all = api.services.flatMap((s) => s.endpoints.map((e) => ({ ...e, service: s.name })));
  const rows = all.map((e) => ({
    search: `${e.method} ${e.path} ${e.summary || ""} ${e.service}`,
    data: { metodo: e.method, servico: e.service, ...(all.some((x) => x.tested !== null) ? { testado: e.tested === true ? "Com teste" : "Sem teste" } : {}) },
    sort: { rota: e.path, metodo: e.method, servico: e.service },
    cells: [
      methodPill(e.method),
      `<span class="ep-path">${esc(e.path)}</span>${e.summary ? `<br><span class="muted small">${esc(clip(e.summary, 90))}</span>` : ""}`,
      `<span class="small">${esc(e.service)}</span>`,
      ...(all.some((x) => x.tested !== null) ? [e.tested === true ? state("confirmado", "com teste") : e.tested === false ? state("ausente", "sem teste") : `<span class="muted">—</span>`] : []),
      ...(all.some((x) => x.auth) ? [`<span class="small">${esc(e.auth || "—")}</span>`] : []),
    ],
  }));

  p.push(h3("tecnico-api-indice", "Índice de endpoints", api.total));
  p.push(grid({
    id: "grid-endpoints", noun: "endpoint(s)", searchPlaceholder: "rota, serviço…",
    columns: [
      { label: "Método", sort: "metodo", width: "6rem" }, { label: "Rota", sort: "rota", width: "40%" },
      { label: "Serviço", sort: "servico", width: "16%" },
      ...(all.some((x) => x.tested !== null) ? [{ label: "Teste", sort: "teste", width: "8rem" }] : []),
      ...(all.some((x) => x.auth) ? [{ label: "Autenticação", sort: "auth" }] : []),
    ],
    rows,
    filters: [
      { key: "servico", label: "Serviço", options: filterOptions(rows, (r) => r.data.servico) },
      { key: "metodo", label: "Método", options: filterOptions(rows, (r) => r.data.metodo) },
      ...(all.some((x) => x.tested !== null) ? [{ key: "testado", label: "Teste", options: filterOptions(rows, (r) => r.data.testado) }] : []),
    ],
    pageSize: 50,
  }));

  // Fichas: só quando há detalhe além de método e rota — senão a dobra abre vazia.
  const detailed = all.filter((e) => e.request || e.response || e.statuses.length);
  if (detailed.length) {
    p.push(h3("tecnico-api-fichas", "Ficha por endpoint", detailed.length));
    p.push(foldActions());
    for (const s of api.services) {
      const list = s.endpoints.filter((e) => e.request || e.response || e.statuses.length);
      if (!list.length) continue;
      p.push(h4(svcAnchor(s), `${esc(s.name)}${s.base ? ` <span class="muted small">· <code>${esc(s.base)}</code></span>` : ""}`));
      if (s.purpose) p.push(`<p class="small muted">${inline(s.purpose)}</p>`);
      for (const e of list) p.push(renderEndpointCard(e));
    }
  }
  p.push(ctx.note("tecnico.api"));
  return p.filter(Boolean).join("\n");
}

function renderEndpointCard(e) {
  const side = (s) => {
    if (!s) return "";
    const bits = [];
    if (s.line) bits.push(`<p class="rr-line">${esc(s.line)}</p>`);
    if (s.contentType) bits.push(`<p class="rr-sub">${esc(s.contentType)}</p>`);
    if (s.fields.length) {
      bits.push(`<ul class="tight">${s.fields.map((f) => `<li><code>${esc(f.name)}</code>${f.type ? ` <span class="muted">${esc(f.type)}</span>` : ""}${f.required ? ` ${pill("obrigatório", "warn")}` : ""}${f.note ? ` — ${esc(f.note)}` : ""}</li>`).join("")}</ul>`);
    }
    for (const n of s.notes) bits.push(`<p class="small muted">${inline(n)}</p>`);
    return bits.join("");
  };
  const body = [
    requestResponse({ requestHtml: side(e.request), responseHtml: side(e.response) }),
    e.statuses.length ? `<p class="rr-sub">Códigos de resposta</p><ul class="rr-status">${e.statuses.map((s) => `<li>${statusCode(s.code)} <span class="small">${esc(s.meaning || "")}</span></li>`).join("")}</ul>` : "",
    e.idempotency ? note(`<strong>Idempotência:</strong> ${inline(e.idempotency)}`) : "",
    e.source ? `<p class="small muted">Origem do que se sabe deste endpoint: ${esc(e.source)}.</p>` : "",
  ].filter(Boolean).join("\n");
  return fold(`${methodPill(e.method)} <span class="ep-path">${esc(e.path)}</span>${e.summary ? ` <span class="muted small">— ${esc(clip(e.summary, 70))}</span>` : ""}`, body);
}

function renderSecurity(ctx) {
  const audit = ctx.d.technical.codeAudit;
  const threat = (ctx.d.technical.chapters || []).find((c) => /amea|threat|stride/i.test(c.title));
  const review = (ctx.d.technical.chapters || []).find((c) => /seguran|security/i.test(c.title));
  if (!audit && !threat && !review) return "";

  const p = [h2("tecnico-seguranca", "Segurança e auditoria de código")];
  p.push(ctx.ask("tecnico.seguranca"));
  p.push(ctx.callouts("tecnico.seguranca"));

  if (audit) {
    // A DECISÃO vem da linha que a declara, não de busca por substring no documento
    // inteiro: um relatório de re-auditoria usa "BLOQUEADO" dezenas de vezes para dizer
    // que o vetor de ataque está bloqueado — o oposto de um impedimento.
    const decision = extractAuditDecision(audit.markdown || "");
    if (decision) {
      p.push(callout(
        "Decisão da auditoria (Fase 12)",
        `<p><strong>${esc(decision.text)}</strong></p>${decision.line ? `<p class="small muted">Lida da linha «${esc(clip(decision.line, 120))}» de <code>${esc(audit.source || audit.path || "code-audit.md")}</code>.</p>` : ""}`,
        decision.level,
      ));
    }
    p.push(chapter("tecnico-audit-doc", audit.title || "Auditoria de código", audit.source, audit.markdown));
  }
  if (review) p.push(chapter("tecnico-review-doc", review.title, review.source, review.markdown));
  if (threat) p.push(chapter("tecnico-threat-doc", threat.title, threat.source, threat.markdown));
  return p.filter(Boolean).join("\n");
}

/**
 * Extrai a decisão da auditoria da linha que a declara.
 * Procura, nesta ordem: uma linha «Decisão: …», um cabeçalho de decisão, e só então
 * desiste. Nunca conclui a partir da presença isolada da palavra no corpo do texto.
 */
export function extractAuditDecision(md) {
  const lines = String(md || "").split(/\r?\n/);
  const re = /^\s*(?:[#>*\-\s]*)(?:\*\*)?\s*(decis[ãa]o|veredito|resultado|deploy)\s*(?:final)?\s*(?:\*\*)?\s*[:—-]\s*(.+)$/i;
  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "").trim();
    if (!text) continue;
    const up = text.toUpperCase();
    const level = /\bBLOQUEAD/.test(up) ? "crit" : /\bAPROVAD/.test(up) ? (/PLANO DE A[ÇC][ÃA]O|RESSALVA|COM PLANO/.test(up) ? "warn" : "ok") : "info";
    return { text: clip(text, 200), line: line.trim(), level };
  }
  return null;
}

function renderRules(ctx) {
  const rules = ctx.d.technical.rules;
  if (!rules.length) return "";
  const p = [h2("tecnico-rules", "Normas de implementação", rules.length)];
  p.push(ctx.ask("tecnico.rules"));
  p.push(ctx.callouts("tecnico.rules"));

  const rows = rules.map((r) => ({
    search: `${r.name} ${r.description || ""} ${(r.headings || []).join(" ")}`,
    data: { escopo: r.alwaysApply ? "Sempre ativa" : "Por tipo de arquivo" },
    sort: { norma: r.name },
    cells: [
      `<a href="#tecnico/rule-${attr(slug(r.name))}">${pill(r.name, "info", { mono: true })}</a>`,
      r.alwaysApply ? pill("sempre", "ok") : pill("por arquivo", "neutral"),
      r.globs ? `<span class="path">${esc(r.globs)}</span>` : `<span class="muted">—</span>`,
      `<span class="small">${esc(clip(r.description || (r.headings || []).slice(0, 3).join(" · ") || "", 200))}</span>`,
    ],
  }));

  p.push(grid({
    id: "grid-normas", noun: "norma(s)", searchPlaceholder: "norma, assunto…",
    columns: [{ label: "Norma", sort: "norma", width: "14rem" }, { label: "Aplicação", sort: "escopo", width: "8rem" }, { label: "Escopo", sort: "globs", width: "20%" }, { label: "O que governa", sort: "governa" }],
    rows,
    filters: [{ key: "escopo", label: "Escopo", options: filterOptions(rows, (r) => r.data.escopo) }],
    pageSize: 25,
  }));

  p.push(foldActions());
  for (const r of rules) {
    p.push(chapter(`rule-${slug(r.name)}`, r.name, r.path, r.markdown || ""));
  }
  return p.filter(Boolean).join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   CÓDIGO
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderCodigo(ctx) {
  const c = ctx.d.code;
  if (!c || !c.inventory || !c.inventory.codeFileCount) return "";
  const i = c.inventory;

  const p = [`<h1 id="h-codigo">Código implementado</h1>`];
  p.push(`<p class="lede">${ctx.section("codigo.lede") ? inline(ctx.section("codigo.lede")) : `Quanto foi escrito, em que linguagens e com que decisões. Os números vêm de varredura do repositório, não de estimativa.`}</p>`);

  // ─── volume ───
  p.push(h2("codigo-volume", "Volume e recorte"));
  p.push(ctx.ask("codigo.volume"));
  p.push(kpiGrid([
    { label: "Arquivos de código", value: nf(i.codeFileCount), hint: `${nf(i.testFileCount)} de teste (${i.testRatio ?? 0}%)`, level: "neutral" },
    { label: "Linhas de código", value: nf(i.codeLines), hint: "sem comentários nem linhas vazias", level: "neutral" },
    { label: "Linhas totais", value: nf(i.totalLines), hint: `${nf(i.commentLines)} comentários · ${nf(i.blankLines)} vazias`, level: "neutral" },
    { label: "Linhas de teste", value: nf(i.testLines), hint: "arquivos sob pastas e padrões de teste", level: "neutral" },
  ]));
  if ((i.byCategory || []).length) {
    p.push(note(`<strong>Composição:</strong> ${i.byCategory.map((x) => `${esc(categoryLabel(x.category))} ${nf(x.files)} arq. (${nf(x.lines)} linhas)`).join(" · ")}${i.commentRatio != null ? ` · ${i.commentRatio}% de comentários` : ""}`));
  }
  if (i.truncated) {
    p.push(callout("Inventário truncado", "<p>O limite de arquivos varridos foi atingido; os números abaixo são um <strong>piso</strong>, não o total.</p>", "warn"));
  }

  // ─── tecnologias ───
  if ((c.stacks || []).length || i.byLanguage.length) {
    p.push(h2("codigo-tecnologias", "Tecnologias e linguagens"));
    if (i.byLanguage.length) {
      const top = i.byLanguage.slice(0, 12);
      const chart = hbarStack(
        top.map((l, k) => ({ label: l.language, sub: `${nf(l.files)} arq.`, segments: [{ label: l.language, value: l.lines, color: SERIES[k % SERIES.length] }] })),
        { width: 940, labelW: 200, trailing: (r) => nf(r.segments[0].value) },
      );
      if (chart) p.push(panel({ title: "Linhas por linguagem", sub: `As ${top.length} linguagens com mais código no recorte varrido.`, body: chart }));
    }
    if ((c.stacks || []).length) {
      p.push(table(["Stack", "Manifesto", { label: "Dependências de terceiros", num: true }], c.stacks.map((st) => [
        `<strong>${esc(st.label)}</strong>`,
        st.manifests.map((m) => `<code>${esc(m)}</code>`).join(" "),
        { html: st.dependencies != null ? nf(st.dependencies) : `<span class="muted">—</span>`, num: true },
      ]), { compact: true, variant: "evidence" }));
    }
    p.push(note((c.ci || []).length
      ? `<strong>Integração contínua:</strong> ${c.ci.map((x) => `${esc(x.name)} (<code>${esc(x.files[0])}</code>)`).join(" · ")}`
      : "Nenhuma configuração de integração contínua foi detectada no repositório."));
  }

  if (i.byTopDir.length) {
    p.push(h3("codigo-estrutura", "Estrutura do repositório"));
    p.push(table(["Diretório", { label: "Arquivos", num: true }, { label: "De teste", num: true }, { label: "Linhas", num: true }],
      i.byTopDir.slice(0, 20).map((t) => [
        `<code>${esc(t.dir)}</code>`, { html: nf(t.files), num: true }, { html: nf(t.testFiles), num: true }, { html: nf(t.lines), num: true },
      ]), { compact: true, variant: "evidence" }));
  }

  if (i.largestFiles.length) {
    p.push(h3("codigo-maiores", "Maiores arquivos", i.largestFiles.length));
    p.push(table(["Arquivo", "Linguagem", { label: "Linhas", num: true }, "Tipo"], i.largestFiles.slice(0, 30).map((f) => [
      `<span class="path">${esc(f.rel)}</span>`, esc(f.lang), { html: nf(f.lines), num: true },
      f.isTest ? pill("teste", "neutral") : pill("produção", "info"),
    ]), { compact: true, variant: "evidence" }));
  }

  // ─── histórico ───
  p.push(renderGit(ctx));

  // ─── rastro do pipeline ───
  p.push(renderTraceability(ctx));

  // ─── decisões ───
  const dec = c.decisions || {};
  if ((dec.adrs || []).length || (dec.specStories || []).length) {
    p.push(h2("codigo-decisoes", "Decisões de implementação", (dec.adrs || []).length + (dec.specStories || []).length));
    p.push(ctx.ask("codigo.decisoes"));
    if ((dec.adrs || []).length) {
      p.push(table(["Decisão", "Status", "Resumo"], dec.adrs.map((a) => [
        `<span class="case-name">${esc(a.title)}</span><span class="case-suite path">${esc(a.path)}</span>`,
        a.status ? pill(a.status, "neutral") : `<span class="muted">—</span>`,
        `<span class="small">${esc(clip(a.excerpt || "", 220))}</span>`,
      ])));
    }
    if ((dec.specStories || []).length) {
      p.push(h3plain(`Memória de implementação por módulo (${dec.specStories.length})`));
      p.push(note("Arquivos mantidos pela skill <code>spec-implement</code> durante a codificação: registram o que foi feito e por quê, módulo a módulo."));
      p.push(foldActions());
      for (const s of dec.specStories) {
        p.push(fold(`${esc(s.module)} <span class="muted small">· ${esc(s.path)}</span>${s.ids.length ? ` ${pill(`${s.ids.length} IDs`, "neutral")}` : ""}`, mdToHtml(s.markdown || "", { headingOffset: 4 }), { id: `story-${slug(s.path)}` }));
      }
    }
  }

  // ─── dívida ───
  if (c.todos?.total) {
    p.push(h2("codigo-divida", "Dívida declarada no código", c.todos.total));
    p.push(note(c.todos.byKind.map((k) => `${esc(k.key)}: ${nf(k.count)}`).join(" · ")));
    const rows = c.todos.items.map((t) => ({
      search: `${t.kind} ${t.file} ${t.text}`,
      data: { tipo: t.kind },
      sort: { arquivo: t.file, linha: t.line },
      cells: [pill(t.kind, "warn"), `<span class="path">${esc(t.file)}:${t.line}</span>`, `<span class="small">${esc(clip(t.text, 200))}</span>`],
    }));
    p.push(grid({
      id: "grid-divida", noun: "marcação(ões)", searchPlaceholder: "arquivo, anotação…",
      columns: [{ label: "Tipo", sort: "tipo", width: "6rem" }, { label: "Local", sort: "arquivo", width: "34%" }, { label: "Anotação", sort: "texto" }],
      rows,
      filters: [{ key: "tipo", label: "Tipo", options: filterOptions(rows, (r) => r.data.tipo) }],
      variant: "evidence", pageSize: 25,
    }));
  }

  return p.filter(Boolean).join("\n");
}

function renderGit(ctx) {
  const g = ctx.d.code.git;
  if (!g) return "";
  if (!g.available) {
    return [h2("codigo-historico", "Histórico de desenvolvimento"), absent("Métricas de histórico do repositório", { hint: esc(g.reason || "o diretório não é um repositório git ou o comando não pôde ser executado.") })].join("\n");
  }

  const p = [h2("codigo-historico", "Histórico de desenvolvimento")];
  p.push(ctx.ask("codigo.historico"));
  p.push(kpiGrid([
    { label: "Commits", value: nf(g.commits ?? 0), hint: g.merges ? `${nf(g.directCommits)} diretos · ${nf(g.merges)} merges` : (g.range || null), level: "neutral" },
    g.authors?.length ? { label: "Autores", value: g.authors.length, hint: `${esc(g.authors[0].name)} lidera com ${g.authors[0].pct ?? 0}%`, level: "neutral" } : null,
    g.spanDays ? { label: "Duração", value: g.spanDays === 1 ? "1 dia" : `${nf(g.spanDays)} dias`, hint: `${nf(g.activeDays)} dia(s) com commits`, level: "neutral" } : null,
    g.commitsPerWeek ? { label: "Ritmo", value: `${g.commitsPerWeek}/sem`, hint: g.commitsPerActiveDay ? `${g.commitsPerActiveDay} por dia ativo` : null, level: "neutral" } : null,
    { label: "Linhas adicionadas", value: nf(g.linesAdded ?? 0), hint: `${nf(g.linesRemoved ?? 0)} removidas · saldo ${nf(g.netLines ?? 0)}`, level: "neutral" },
    g.filesTouched ? { label: "Arquivos tocados", value: nf(g.filesTouched), hint: g.avgLinesPerCommit ? `média de ${g.avgLinesPerCommit} linhas por commit` : null, level: "neutral" } : null,
    g.releaseCount ? { label: "Releases", value: g.releaseCount, hint: g.tags?.length ? `mais recente: ${esc(g.tags[0])}` : null, level: "neutral" } : null,
  ].filter(Boolean)));
  p.push(note(`Branch <code>${esc(g.branch || "?")}</code>${g.head ? ` no commit <code>${esc(g.head)}</code>` : ""}${g.remoteBranches != null ? ` · ${g.remoteBranches} branch(es) remota(s)` : ""}${g.firstCommit ? ` · primeiro commit em ${esc(fmtDate(g.firstCommit))}, último em ${esc(fmtDate(g.lastCommit))}` : ""}.`));

  if ((g.byWeek || []).length > 1) {
    const weeks = g.byWeek.slice(-30);
    const chart = columns(weeks.map((w) => ({ label: w.week, value: w.commits })), { width: 940, height: 210 });
    if (chart) p.push(panel({ title: "Commits por semana", sub: `Últimas ${weeks.length} semanas com atividade.`, body: chart }));
  }

  if ((g.authors || []).length) {
    p.push(h3plain("Quem escreveu"));
    p.push(table(["Autor", { label: "Commits", num: true }, "Participação"], g.authors.slice(0, 20).map((a) => [
      `${esc(a.name)} <span class="muted small">${esc(a.email)}</span>`,
      { html: nf(a.commits), num: true },
      `${coverageBar(a.pct)} <span class="small">${a.pct ?? 0}%</span>`,
    ]), { compact: true, variant: "evidence" }));
  }

  if ((g.byCommitType || []).length > 1) {
    const chart = hbarStack(g.byCommitType.slice(0, 10).map((x, k) => ({ label: x.type, segments: [{ label: x.type, value: x.count, color: SERIES[k % SERIES.length] }] })), { width: 620, labelW: 150, rowH: 18, gap: 8 });
    if (chart) p.push(panel({ title: "Natureza dos commits", sub: g.conventionalPct != null ? `${g.conventionalPct}% seguem convenção de mensagem.` : null, body: chart }));
  }

  if ((g.hotspots || []).length) {
    p.push(h3plain("Arquivos que mais mudaram"));
    p.push(note("Concentração de alterações costuma indicar o núcleo do sistema — ou o ponto que mais precisou de correção."));
    p.push(table(["Arquivo", { label: "Alterações", num: true }, { label: "Linhas +/−", num: true }], g.hotspots.slice(0, 20).map((f) => [
      `<span class="path">${esc(f.file)}</span>`, { html: nf(f.changes), num: true }, { html: `+${nf(f.added)} / −${nf(f.removed)}`, num: true },
    ]), { compact: true, variant: "evidence" }));
  }

  if ((g.recentCommits || []).length) {
    p.push(fold(`Commits mais recentes (${g.recentCommits.length})`, table(["Hash", "Data", "Autor", "Assunto"], g.recentCommits.map((k) => [
      `<code>${esc(k.hash)}</code>`, esc(fmtDate(k.date)), esc(k.author), `<span class="commit-subject">${esc(k.subject)}</span>`,
    ]), { compact: true, variant: "evidence" })));
  }
  if (g.dirtyFiles) p.push(note(`${g.dirtyFiles} arquivo(s) com alteração não commitada no momento da geração.`));
  return p.filter(Boolean).join("\n");
}

/** Rastro do vocabulário do pipeline no código — arquivo:linha com o trecho. */
function renderTraceability(ctx) {
  const tr = ctx.d.code.traceability;
  const refs = (tr?.byId || []).filter((t) => (t.refs || []).length);
  if (!refs.length) return "";

  const rows = refs.flatMap((t) => (t.refs || []).slice(0, 4).map((r) => ({
    search: `${t.id} ${r.file} ${r.snippet || ""}`,
    data: { familia: idFamilyOf(t.id), tipo: r.isTest ? "Teste" : "Produção" },
    sort: { id: t.id, arquivo: r.file },
    cells: [
      pill(t.id, r.isTest ? "neutral" : "info", { mono: true }),
      `<span class="path">${esc(r.file)}:${r.line}</span>${r.snippet ? `<div class="snippet">${esc(clip(r.snippet, 180))}</div>` : ""}`,
      r.isTest ? pill("teste", "neutral") : pill("produção", "info"),
    ],
  })));

  return [
    h2("codigo-rastro", "Rastro do pipeline no código", refs.length),
    ctx.ask("codigo.rastro") || asks(
      "Onde o vocabulário do processo aparece no código",
      `<strong>${refs.length}</strong> identificador(es) do pipeline citados em comentário, nome de teste ou caminho, com arquivo e linha. É o que torna a rastreabilidade verificável em vez de declarada.`,
    ),
    grid({
      id: "grid-rastro", noun: "referência(s)", searchPlaceholder: "ID, arquivo, trecho…",
      columns: [{ label: "ID", sort: "id", width: "10rem" }, { label: "Onde está", sort: "arquivo" }, { label: "Natureza", sort: "tipo", width: "7rem" }],
      rows,
      filters: [
        { key: "familia", label: "Família", options: filterOptions(rows, (r) => r.data.familia) },
        { key: "tipo", label: "Natureza", options: filterOptions(rows, (r) => r.data.tipo) },
      ],
      variant: "evidence", pageSize: 25,
    }),
    (tr.orphans || []).length ? note(`<strong>IDs citados no código sem artefato correspondente (${tr.orphans.length}):</strong> ${tr.orphans.slice(0, 40).map((o) => pill(o, "warn", { mono: true })).join(" ")}. Sinal de documento desatualizado ou de ID digitado errado.`) : "",
  ].filter(Boolean).join("\n");
}

function idFamilyOf(id) { return String(id).split("-")[0].toUpperCase(); }

function categoryLabel(c) {
  return { code: "Código", markup: "Marcação", style: "Estilo", query: "Consultas/SQL", script: "Scripts", config: "Configuração", data: "Dados", doc: "Documentação" }[c] || c;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTES
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderTestes(ctx) {
  const t = ctx.d.tests;
  const cov = ctx.d.testing || {};
  if (!t || (!t.cases?.length && !t.suites?.length && !t.detection?.runners?.length)) return "";

  const p = [`<h1 id="h-testes">Testes e qualidade</h1>`];
  p.push(`<p class="lede">${ctx.section("testes.lede") ? inline(ctx.section("testes.lede")) : "Resultado da execução real das suítes nesta geração, caso a caso, e as três medidas de cobertura: do código, das regras de negócio e do plano de homologação."}</p>`);

  if (!t.executed) {
    p.push(callout("Testes não executados nesta geração", `<p>Motivo: ${esc(t.skipped || "não informado")}. Os números abaixo, quando existirem, vêm de relatórios anteriores encontrados no repositório — e estão marcados como tal.</p>`, "warn"));
  }

  const tot = t.totals || { total: 0, passed: 0, failed: 0, skipped: 0 };
  if (tot.total) {
    p.push(h2("testes-resumo", "Resultado da execução", tot.total));
    p.push(ctx.ask("testes.resumo"));
    p.push(kpiGrid([
      { label: "Casos executados", value: nf(tot.total), hint: t.rawDir ? `relatórios brutos em ${t.rawDir}` : null, level: "neutral" },
      { label: "Aprovados", value: nf(tot.passed), hint: `${fmtPct(pct(tot.passed, tot.total))}% do total`, level: "ok" },
      { label: "Falhando", value: nf(tot.failed), hint: tot.failed ? "detalhe abaixo" : "nenhuma falha", level: tot.failed ? "crit" : "ok" },
      { label: "Ignorados", value: nf(tot.skipped), hint: "skipped / pending / todo", level: tot.skipped ? "warn" : "neutral" },
    ]));
  }

  // A classificação por causa-raiz vive no domínio de testes também: é aqui que o
  // técnico procura. A do sumário é a mesma leitura, para o leitor executivo.
  if (ctx.findings) {
    p.push(h2("testes-causas", "As falhas por causa-raiz", ctx.findings.total));
    p.push(ctx.ask("testes.causas"));
    const rows = ctx.findings.causes.flatMap((c) => (c.cases.length ? c.cases : [null]).map((name) => ({
      search: `${c.label} ${name || ""} ${c.dependsOn || ""}`,
      data: { causa: c.label },
      sort: { causa: c.label },
      cells: [
        `<strong>${esc(c.label)}</strong>${c.sub ? `<br><span class="muted small">${esc(c.sub)}</span>` : ""}`,
        name ? `<span class="small">${esc(name)}</span>` : `<span class="muted small">${c.count ? `${c.count} caso(s) sem nome declarado` : "nenhum caso nesta natureza"}</span>`,
        c.dependsOn ? `<span class="small">${esc(c.dependsOn)}</span>` : `<span class="muted">—</span>`,
      ],
    })));
    p.push(grid({
      id: "grid-causas", noun: "caso(s)", searchPlaceholder: "caso, causa…",
      columns: [{ label: "Causa-raiz", sort: "causa", width: "18rem" }, { label: "Caso de teste", sort: "caso" }, { label: "Depende de", sort: "dep", width: "16rem" }],
      rows,
      filters: [{ key: "causa", label: "Causa", options: filterOptions(rows, (r) => r.data.causa) }],
      variant: "evidence", pageSize: 50,
    }));
  }

  const kinds = (cov.kinds || []).filter((k) => k.total);
  if (kinds.length) {
    p.push(h2("testes-naturezas", "Por natureza de teste", kinds.length));
    p.push(note("A natureza é derivada do framework e refinada pelo caminho do arquivo e pelo nome do caso — um teste em <code>/e2e/</code> conta como funcional mesmo rodando no mesmo runner dos unitários."));
    p.push(table(
      ["Natureza", "O que verifica", { label: "Casos", num: true }, { label: "Aprovados", num: true }, { label: "Falhando", num: true }, { label: "Ignorados", num: true }, { label: "Duração", num: true }],
      kinds.map((k) => [
        `<strong>${esc(k.label || kindLabel(k.kind))}</strong>`, `<span class="small">${esc(k.help || "")}</span>`,
        { html: nf(k.total), num: true }, { html: nf(k.passed), num: true },
        { html: k.failed ? `<strong>${nf(k.failed)}</strong>` : "0", num: true }, { html: nf(k.skipped), num: true },
        { html: esc(fmtDuration(k.durationMs)), num: true },
      ]),
      { compact: true, variant: "evidence" },
    ));
  }

  p.push(renderCoverage(ctx));
  p.push(renderSuites(ctx));
  p.push(renderCaseGrid(ctx));
  return p.filter(Boolean).join("\n");
}

function renderCoverage(ctx) {
  const cov = ctx.d.testing || {};
  const cc = cov.code;
  const bc = cov.business;
  const pc = cov.plan;
  if (!cc && !bc?.total && !pc?.total) return "";

  const p = [h2("testes-cobertura", "Cobertura")];
  p.push(ctx.ask("testes.cobertura") || asks(
    "O que “coberto” quer dizer aqui",
    "Três perguntas diferentes, três respostas. Um projeto pode ter 90% de cobertura de código e 20% das regras de negócio verificadas — por isso as três aparecem lado a lado.",
  ));

  p.push(kpiGrid([
    { label: "Cobertura de código", value: cc && cc.measured ? `${fmtPct(cc.lines ?? 0)}%` : "não medida", level: !cc?.measured ? "neutral" : cc.lines >= 80 ? "ok" : cc.lines >= 60 ? "warn" : "crit", hint: cc && cc.measured ? (cc.coveredLines != null ? `${nf(cc.coveredLines)} de ${nf(cc.totalLines)} linhas` : "linhas exercitadas pelos testes") : (cc?.reason || "nenhum relatório de cobertura disponível") },
    bc?.total ? { label: "Regras e requisitos verificados", value: `${fmtPct(bc.pct ?? 0)}%`, level: bc.pct >= 80 ? "ok" : bc.pct >= 40 ? "warn" : "crit", hint: `${bc.comTeste} de ${bc.total} itens com teste automatizado` } : null,
    pc?.total ? { label: "Plano de homologação automatizado", value: `${fmtPct(pc.pct ?? 0)}%`, level: pc.pct >= 80 ? "ok" : pc.pct >= 40 ? "warn" : "crit", hint: `${pc.automated} de ${pc.total} casos com teste${pc.falhando ? ` · ${pc.falhando} falhando` : ""}` } : null,
  ].filter(Boolean), { cols: 3 }));

  if (cc && cc.measured) {
    p.push(kpiGrid([
      cc.lines != null ? { label: "Linhas", value: `${fmtPct(cc.lines)}%`, level: "neutral" } : null,
      cc.branches != null ? { label: "Ramos", value: `${fmtPct(cc.branches)}%`, level: "neutral" } : null,
      cc.functions != null ? { label: "Funções", value: `${fmtPct(cc.functions)}%`, level: "neutral" } : null,
      cc.fileCount ? { label: "Arquivos medidos", value: nf(cc.fileCount), level: "neutral" } : null,
    ].filter(Boolean)));
    p.push(note(`Formato${(cc.formats || []).length > 1 ? "s" : ""}: ${esc((cc.formats || []).join(", ") || "—")} · fonte: ${esc((cc.sources || []).join(", ") || "—")}`));
    if ((cc.byDirectory || []).length) {
      p.push(table(["Diretório", "Cobertura", { label: "Linhas cobertas", num: true }, { label: "Arquivos", num: true }],
        cc.byDirectory.slice(0, 25).map((dir) => [
          `<code>${esc(dir.dir)}</code>`,
          `${coverageBar(dir.pct)} <span class="small">${fmtPct(dir.pct ?? 0)}%</span>`,
          { html: `${nf(dir.covered || 0)} / ${nf(dir.total || 0)}`, num: true },
          { html: nf(dir.files), num: true },
        ]), { compact: true, variant: "evidence" }));
    }
    if ((cc.worst || []).length) {
      p.push(fold(`Arquivos com cobertura abaixo de 60% (${cc.worst.length})`, table(["Arquivo", "Cobertura", { label: "Linhas", num: true }],
        cc.worst.map((f) => [
          `<span class="path">${esc(f.path)}</span>`,
          `${coverageBar(f.pct)} <span class="small">${fmtPct(f.pct ?? 0)}%</span>`,
          { html: `${nf(f.covered || 0)} / ${nf(f.total || 0)}`, num: true },
        ]), { compact: true, variant: "evidence" })));
    }
  } else {
    p.push(callout("Cobertura de código não medida", `<p>${esc(cc?.reason || "nenhum relatório de cobertura foi produzido nem encontrado")}. As medidas de negócio e de plano de testes acima continuam válidas — elas não dependem de instrumentação.</p>`, "warn"));
  }

  if (bc?.total && (bc.byKind || []).length) {
    p.push(h3("testes-cobertura-negocio", "Regras e requisitos verificados por teste"));
    p.push(table(["Tipo", { label: "Especificados", num: true }, { label: "Com teste", num: true }, { label: "Passando", num: true }, "Cobertura"],
      bc.byKind.map((k) => [
        pill(k.kind, "neutral", { mono: true }),
        { html: nf(k.total), num: true }, { html: nf(k.comTeste), num: true }, { html: nf(k.comTestePassando), num: true },
        `${coverageBar(k.pct)} <span class="small">${fmtPct(k.pct ?? 0)}%</span>`,
      ]), { compact: true, variant: "evidence" }));
    const sem = (bc.byKind || []).flatMap((k) => k.semTeste.map((x) => ({ ...x, kind: k.kind })));
    if (sem.length) {
      p.push(fold(`Itens de negócio sem nenhum teste automatizado (${sem.length})`, table(["ID", "Item", "Situação no código"],
        sem.map((x) => [pill(x.id, "warn", { mono: true }), esc(x.title || ""), traceStatusPill(x.status)]), { compact: true, variant: "evidence" })));
    }
  }

  if (pc?.total) {
    p.push(h3("testes-cobertura-plano", "Plano de homologação", pc.total));
    p.push(table(["Caso", "Épica / funcionalidade", "Situação", "Testes automatizados"], pc.rows.map((r) => [
      `${pill(r.id, "neutral", { mono: true })} ${esc(r.title || "")}`,
      `<span class="small">${esc([r.epic, r.feature].filter(Boolean).join(" › ") || "—")}</span>`,
      r.status === "automatizado" ? pill("automatizado", "ok") : r.status === "falhando" ? pill("automatizado, falhando", "crit") : pill("manual", "neutral"),
      r.cases.length ? r.cases.map((c) => `${testStatusPill(c.status)} <span class="small">${esc(c.name)}</span>`).join("<br>") : `<span class="muted">—</span>`,
    ]), { compact: true, variant: "evidence" }));
  }

  return p.filter(Boolean).join("\n");
}

function renderSuites(ctx) {
  const t = ctx.d.tests;
  if (!(t.suites || []).length) return "";
  const p = [h2("testes-suites", "Suítes executadas", t.suites.length)];
  p.push(table(
    ["Suíte", "Natureza", "Stack", "Execução", "Comando", { label: "Exit", num: true }, { label: "Casos", num: true }, { label: "Duração", num: true }],
    t.suites.map((s) => [
      `<span class="case-name">${esc(s.label)}</span>${s.reportPath ? `<span class="case-suite path">${esc(s.reportPath)}</span>` : ""}`,
      pill(kindLabel(s.kind), s.kind === "funcional" ? "info" : "neutral"),
      esc(s.ecosystem || "—"),
      s.executed ? pill("executada", "ok") : pill("não executada", "warn"),
      `<code>${esc(clip(s.command || "", 90))}</code>`,
      { html: s.exitCode === null || s.exitCode === undefined ? `<span class="muted">—</span>` : String(s.exitCode), num: true },
      { html: nf(s.totals?.total ?? 0), num: true },
      { html: esc(fmtDuration(s.durationMs)), num: true },
    ]),
    { compact: true },
  ));
  for (const s of t.suites.filter((x) => !x.executed)) {
    p.push(callout(`${s.label} não pôde ser executada`, `<p>${esc(s.reason || "motivo não informado pelo runner.")}</p>`, "warn"));
  }
  if ((t.detection?.attempted || []).length) {
    const byEco = groupBy(t.detection.attempted, (a) => a.ecosystem || "outros");
    p.push(fold(`Frameworks procurados neste repositório (${t.detection.attempted.length})`,
      table(["Stack", "Frameworks verificados"], [...byEco.entries()].map(([eco, list]) => [
        `<strong>${esc(eco)}</strong>`,
        list.map((a) => pill(a.id, a.detected ? "ok" : "neutral")).join(" "),
      ]), { compact: true, variant: "evidence" })));
  }
  return p.filter(Boolean).join("\n");
}

/**
 * Rótulo da natureza do teste vindo do COLETOR, não de um mapa próprio do renderer.
 *
 * Havia duas listas do mesmo vocabulário — `KINDS` em test-runners e a tabela local em
 * render-shared — e elas divergiam no plural («Unitários» × «Unitário»). O select de
 * filtro saía com um rótulo e o quadro por natureza com outro, para a mesma coisa.
 * O coletor manda; o mapa local só cobre naturezas que não apareceram na execução.
 */
function kindNamer(ctx) {
  const fromData = new Map(((ctx.d.testing || {}).kinds || []).map((k) => [k.kind, k.label]));
  return (kind) => fromData.get(kind) || kindLabel(kind);
}

function renderCaseGrid(ctx) {
  const t = ctx.d.tests;
  if (!(t.cases || []).length) return "";
  const runners = uniqStrings(t.cases.map((c) => c.runner));
  const nameOf = kindNamer(ctx);

  const rows = t.cases.map((c) => ({
    cls: c.status === "failed" ? "row-crit" : null,
    search: `${c.name} ${c.suite || ""} ${c.file || ""} ${c.runner || ""}`,
    data: {
      situacao: { passed: "Aprovado", failed: "Falhando", skipped: "Ignorado" }[c.status] || c.status,
      tipo: nameOf(c.kind),
      ...(runners.length > 1 ? { framework: shortRunner(c.runner) } : {}),
    },
    sort: { caso: (c.name || "").toLowerCase(), duracao: c.durationMs ?? -1, situacao: { failed: 0, skipped: 1, passed: 2 }[c.status] ?? 9 },
    cells: [
      testStatusPill(c.status),
      pill(nameOf(c.kind), "neutral"),
      `<span class="case-name">${esc(c.name)}</span>${c.retries ? ` ${pill(`${c.retries} retry`, "warn")}` : ""}${c.message && c.status === "failed" ? `<div class="fail-msg">${esc(clip(c.message, 600))}</div>` : ""}`,
      `${c.suite ? `<span class="case-suite">${esc(c.suite)}</span>` : ""}${c.file ? `<span class="path">${esc(c.file)}</span>` : ""}${!c.suite && !c.file ? `<span class="muted">—</span>` : ""}`,
      ...(runners.length > 1 ? [pill(shortRunner(c.runner), "neutral", { title: c.runner })] : []),
      { html: esc(fmtDuration(c.durationMs)), num: true },
    ],
  }));

  return [
    h2("testes-casos", "Todos os casos", t.cases.length),
    note(`${nf(t.cases.length)} caso(s) executado(s) nesta geração. Os filtros combinam por E: tipo + situação + busca devolve exatamente a interseção. Na impressão sai o que estiver na tela — escolha «Todos» em «Por página» para o grid completo.`),
    grid({
      id: "grid-casos", noun: "caso(s)", searchPlaceholder: "nome, suíte ou arquivo…",
      columns: [
        { label: "Situação", sort: "situacao", width: "7rem" },
        { label: "Tipo", sort: "tipo", width: "8rem" },
        { label: "Caso de teste", sort: "caso" },
        { label: "Suíte / arquivo", sort: "suite", width: "22%" },
        ...(runners.length > 1 ? [{ label: "Framework", sort: "framework", width: "9rem" }] : []),
        { label: "Duração", sort: "duracao", num: true, width: "6rem" },
      ],
      rows,
      filters: [
        { key: "tipo", label: "Tipo de teste", options: filterOptions(rows, (r) => r.data.tipo) },
        { key: "situacao", label: "Situação", options: filterOptions(rows, (r) => r.data.situacao) },
        ...(runners.length > 1 ? [{ key: "framework", label: "Framework", options: filterOptions(rows, (r) => r.data.framework) }] : []),
      ],
      variant: "evidence", pageSize: 50, fixed: false,
    }),
  ].join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXECUÇÃO E BACKLOG
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderGestao(ctx) {
  const a = ctx.d.azure;
  const dl = ctx.d.delivery;
  if (!a) return "";

  const p = [`<h1 id="h-gestao">Execução e backlog</h1>`];

  if (!a.available) {
    p.push(`<p class="lede">A situação do backlog não pôde ser coletada nesta geração.</p>`);
    p.push(callout(
      "Backlog não coletado",
      `<p>${a.mode === "disabled" ? "A coleta foi desativada nesta execução." : "A consulta à ferramenta de gestão não pôde ser concluída."} <strong>Nenhum número de backlog foi estimado no lugar.</strong></p>`
      + ((a.warnings || []).length ? `<ul>${a.warnings.map((w) => `<li>${esc(w.message)}</li>`).join("")}</ul>` : ""),
      "warn",
    ));
    return p.join("\n");
  }

  const s = a.summary;
  p.push(`<p class="lede">${ctx.section("gestao.lede") ? inline(ctx.section("gestao.lede")) : `Situação do backlog no momento desta geração: ${nf(a.items.length)} itens no escopo consultado, com estado, responsável e iteração como registrados na ferramenta de gestão.`}</p>`);

  p.push(h2("gestao-progresso", "Progresso do backlog"));
  p.push(ctx.ask("gestao.progresso"));
  p.push(kpiGrid([
    { label: "Itens de trabalho", value: nf(s.total), hint: s.leafCount && s.scope === "folhas" ? `${nf(s.leafCount)} itens executáveis medidos` : (s.removed ? `${s.removed} removido(s)` : "no escopo consultado"), level: "neutral" },
    { label: "Concluídos", value: nf(s.done), hint: s.progressPct !== null ? `${s.progressPct}% de ${nf(s.considered)}` : null, level: s.progressPct >= 95 ? "ok" : s.progressPct >= 80 ? "warn" : "crit" },
    { label: "Em andamento", value: nf(s.inProgress), level: "neutral" },
    { label: "A fazer", value: nf(s.todo), level: s.todo ? "warn" : "ok" },
    s.storyPoints ? { label: "Story points", value: `${nf(s.donePoints)} / ${nf(s.storyPoints)}`, hint: `${s.pointsPct}% dos pontos concluídos`, level: "neutral" } : null,
  ].filter(Boolean)));
  if (s.scopeNote) p.push(note(esc(s.scopeNote)));
  p.push(note(`Origem: ${esc(a.mode === "rest" ? "consulta direta à ferramenta de gestão" : "extração via snapshot")}${a.project ? ` · quadro <code>${esc(a.project)}</code>` : ""}${a.scope ? ` · escopo: ${esc(a.scope)}` : ""} · coletado em ${esc(fmtDateTime(a.collectedAt))}.`));

  if ((a.byType || []).length) {
    p.push(table(["Tipo", { label: "Total", num: true }, { label: "Concluídos", num: true }, { label: "Em andamento", num: true }, { label: "A fazer", num: true }, "Progresso"],
      a.byType.map((t) => [
        esc(t.key), { html: nf(t.count), num: true }, { html: nf(t.done), num: true },
        { html: nf(t.inProgress), num: true }, { html: nf(t.todo), num: true }, progressCell(t.done, t.count),
      ]), { compact: true, variant: "evidence" }));
  }

  p.push(renderBugs(ctx));
  p.push(renderClosureChart(ctx));
  p.push(renderSprints(ctx));
  p.push(renderOpenItems(ctx));
  p.push(renderTeam(ctx));

  // Grid completo de itens.
  const rows = a.items.map((i) => ({
    search: `${i.id} ${i.title} ${i.type || ""} ${i.assignedTo || ""} ${(i.tags || []).join(" ")}`,
    data: { tipo: i.type || "—", estado: i.state || "—", responsavel: i.assignedTo || "não atribuído" },
    sort: { id: Number(i.id) || 0, titulo: i.title, pontos: i.storyPoints ?? -1 },
    cells: [
      safeUrl(i.url) ? `<a href="${attr(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">${pill(`#${i.id}`, "neutral", { mono: true })}</a>` : pill(`#${i.id}`, "neutral", { mono: true }),
      esc(i.type || "—"),
      `<span class="case-name">${esc(i.title)}</span>${i.parentId ? `<span class="case-suite">vinculado a #${esc(i.parentId)}</span>` : ""}${(i.tags || []).length ? `<span class="case-suite">${i.tags.map(esc).join(" · ")}</span>` : ""}`,
      categoryPill(i.category, i.state),
      esc(i.assignedTo || "—"),
      `<span class="path">${esc(shortIteration(i.iterationPath))}</span>`,
      { html: i.storyPoints != null ? String(i.storyPoints) : `<span class="muted">—</span>`, num: true },
    ],
  }));

  p.push(h2("gestao-itens", "Todos os itens", a.items.length));
  p.push(grid({
    id: "grid-itens", noun: "item(ns)", searchPlaceholder: "número, título, responsável…",
    columns: [
      { label: "Item", sort: "id", width: "6rem" }, { label: "Tipo", sort: "tipo", width: "8rem" },
      { label: "Título", sort: "titulo" }, { label: "Estado", sort: "estado", width: "9rem" },
      { label: "Responsável", sort: "responsavel", width: "12rem" }, { label: "Iteração", sort: "iteracao", width: "12rem" },
      { label: "Pts", sort: "pontos", num: true, width: "4rem" },
    ],
    rows,
    filters: [
      { key: "tipo", label: "Tipo", options: filterOptions(rows, (r) => r.data.tipo) },
      { key: "estado", label: "Estado", options: filterOptions(rows, (r) => r.data.estado) },
      { key: "responsavel", label: "Responsável", options: filterOptions(rows, (r) => r.data.responsavel) },
    ],
    pageSize: 50, fixed: false,
  }));

  if (ctx.d.tasks && !ctx.d.tasks.invalid && ctx.d.tasks.taskCount) {
    p.push(h3("gestao-especificado", "Backlog especificado"));
    p.push(note(`Estrutura planejada na especificação${ctx.d.tasks.schemaVersion ? ` (formato ${esc(ctx.d.tasks.schemaVersion)})` : ""}: ${nf(ctx.d.tasks.epicCount)} épico(s), ${nf(ctx.d.tasks.storyCount)} história(s), ${nf(ctx.d.tasks.taskCount)} tarefa(s).${(ctx.d.tasks.compatibilityNotes || []).length ? ` ${esc(ctx.d.tasks.compatibilityNotes.join(" "))}` : ""}`));
  }

  return p.filter(Boolean).join("\n");
}

/** Gráfico de fechamento com séries ligáveis. Só sai com duas ou mais janelas. */
function renderClosureChart(ctx) {
  const dl = ctx.d.delivery;
  // Exige data de fechamento real nos itens; a curva não é inferida de outra coisa.
  if (!dl || !dl.hasClosureDates || !dl.series || dl.weeks.length < 2) return "";

  const payload = seriesChartData({
    labels: dl.series.labels,
    dims: [
      { key: "tipo", label: "Por tipo de item", note: "Tasks são a unidade de trabalho; histórias e épicos fecham quando as filhas fecham.", series: dl.series.byType },
      { key: "pessoa", label: "Por responsável", note: "Atribuição registrada no item no momento do fechamento.", series: dl.series.byAssignee },
    ].filter((d) => d.series.length),
  });
  if (!payload) return "";
  ctx.hasSeriesChart = true;

  const first = payload.dims[0];
  return [
    h2("gestao-fechamento", "Fechamento no tempo", dl.closedCount),
    ctx.ask("gestao.fechamento") || asks(
      "Em que semanas o trabalho foi fechado — e por quem",
      `<strong>${nf(dl.closedCount)} itens fechados</strong> em ${dl.weeks.length} semanas. Ligue e desligue séries — o eixo se ajusta ao que estiver selecionado, para que uma série pequena não fique achatada contra a base.`,
    ),
    panel({
      title: "Itens fechados por semana",
      sub: "Escolha o corte e o modo: «Acumulado» mostra o total corrido, «Por período» mostra quantos fecharam em cada semana. A data é a de fechamento registrada no tracker.",
      body: `<div class="tl-chart" data-tl-chart data-tl="${attr(JSON.stringify(payload))}">
  <div class="tl-controls">
    <div class="seg" role="group" aria-label="Corte do gráfico">
      ${payload.dims.map((d, i) => `<button type="button" data-tl-dim="${attr(d.key)}" aria-pressed="${i === 0}">${esc(d.label)}</button>`).join("\n      ")}
    </div>
    <div class="seg" role="group" aria-label="Modo de exibição">
      <button type="button" data-tl-mode="cum" aria-pressed="true">Acumulado</button>
      <button type="button" data-tl-mode="per" aria-pressed="false">Por período</button>
    </div>
    <button type="button" class="btn" data-tl-all>Todos</button>
  </div>
  <div class="tl-series" role="group" aria-label="Séries exibidas" data-tl-toggles>
${first.series.map((s) => `    <label class="tl-toggle" style="--tl-c:${attr(s.color)}"><input type="checkbox" data-tl-series="${attr(s.key)}" checked><span class="tl-sw"></span><span>${esc(s.label)}</span><b>${nf(s.cum[s.cum.length - 1] || 0)}${s.available ? `<span class="tl-of">/${nf(s.available)}</span>` : ""}</b></label>`).join("\n")}
  </div>
  <figure class="chart chart--tl"><svg viewBox="0 0 940 300" role="img" data-tl-svg aria-label="Itens fechados por semana, com séries selecionáveis."></svg></figure>
  <p class="chart-note" data-tl-note></p>
</div>`,
    }),
    dl.closedWithoutDate ? note(`${dl.closedWithoutDate} item(ns) concluído(s) não têm data de fechamento registrada e ficam fora deste gráfico — aparecem no progresso, não na curva.`) : "",
  ].filter(Boolean).join("\n");
}

function renderSprints(ctx) {
  const dl = ctx.d.delivery;
  // Sem sprint REAL (iteração com data no tracker) não há seção. Nada é reconstruído:
  // ver o cabeçalho de derive-delivery.mjs.
  if (!dl || !dl.hasSprints || dl.sprints.length < 2) return "";
  const v = dl.velocity;

  const p = [h2("gestao-sprints", "Ritmo por sprint", dl.sprints.length)];
  p.push(ctx.ask("gestao.sprints"));
  p.push(note(`Sprints lidos das <strong>${dl.sprints.length} iterações declaradas no tracker</strong>, com data de início e fim. Cada item é atribuído ao sprint que o time registrou nele, não à data em que fechou.`));

  p.push(kpiGrid([
    v.median !== null ? { label: "Velocidade mediana", value: `${fmtPct(v.median)}`, hint: `mediana de ${v.closedSprints} sprint(s) encerrado(s)`, level: "neutral" } : null,
    v.mean !== null ? { label: "Média por sprint", value: fmtPct(v.mean), hint: v.peakShare >= 40 ? `distorcida por ${v.peakSprint} (${v.peak} itens)` : null, level: "neutral" } : null,
    v.last3 !== null ? { label: "Últimos 3 sprints", value: fmtPct(v.last3), hint: "média das três janelas encerradas", level: "neutral" } : null,
    { label: "Em aberto", value: nf(dl.openLeaves.length), hint: "itens folha ainda não fechados", level: dl.openLeaves.length ? "warn" : "ok" },
  ].filter(Boolean)));

  const chart = columns(dl.sprints.map((s) => ({ label: s.name, value: s.closed, color: s.ongoing ? "#c3cbd6" : SEMANTIC.info })), { width: 980, height: 210 });
  if (chart) {
    p.push(panel({
      title: "Itens fechados em cada sprint",
      sub: v.peakShare >= 40 ? `${v.peakSprint} concentrou ${v.peak} fechamentos (${v.peakShare}% de tudo).` : null,
      body: chart,
      footer: chartLegend([{ label: "Sprint encerrado", color: SEMANTIC.info }, { label: "Sprint em curso", color: "#c3cbd6" }]),
    }));
  }

  p.push(table(
    ["Sprint", "Período", { label: "Fechados", num: true }, { label: "Criados", num: true }, { label: "Acumulado", num: true }, "Composição"],
    dl.sprints.map((s) => [
      `<strong>${esc(s.name)}</strong>${s.ongoing ? ` ${pill("em curso", "info")}` : ""}`,
      `<span class="small">${esc(fmtDate(s.start))} – ${esc(fmtDate(s.end))}</span>`,
      { html: nf(s.closed), num: true }, { html: nf(s.created), num: true }, { html: nf(s.cumulative), num: true },
      s.byType.length ? `<span class="small">${s.byType.map((t) => `${esc(t.key)} ${t.count}`).join(" · ")}</span>` : `<span class="muted">—</span>`,
    ]),
    { compact: true, variant: "evidence" },
  ));

  // Projeção
  if (dl.projection && dl.projection.scenarios.length) {
    p.push(h3("gestao-projecao", `Projeção de conclusão <span class="tag-draft tag-est">estimativa</span>`));
    p.push(ctx.ask("gestao.projecao") || asks(
      "Quando os itens em aberto devem fechar",
      `Ao ritmo ${esc(dl.projection.adopted.label.toLowerCase())} de <strong>${fmtPct(dl.projection.adopted.rate)} itens por sprint</strong>, os <strong>${dl.projection.remaining} itens em aberto</strong> fecham em <strong>${dl.projection.adopted.sprints} sprint(s)</strong> de ${dl.projection.sprintDays} dias — por volta de <strong>${fmtDate(dl.projection.adopted.date)}</strong>. É projeção linear, não compromisso de prazo.`,
    ));
    const pts = projectionPoints(dl);
    const bu = burnup(dl.burnup, { scope: dl.scope, projection: pts });
    if (bu) p.push(panel({ title: "Escopo total × fechado acumulado", sub: "Linha tracejada = escopo de itens folha. Pontos vazados à direita = projeção ao ritmo adotado.", body: bu }));
    p.push(table(
      ["Cenário", { label: "Itens por sprint", num: true }, { label: "Sprints", num: true }, "Conclusão projetada", "Quando este cenário se sustenta"],
      dl.projection.scenarios.map((sc, i) => ({
        cls: i === 0 ? "row-ok" : null,
        cells: [
          `<strong>${esc(sc.label)}</strong>${i === 0 ? ` ${pill("adotado", "ok")}` : ""}`,
          { html: fmtPct(sc.rate), num: true }, { html: String(sc.sprints), num: true },
          `<strong>${esc(fmtDate(sc.date))}</strong>`,
          `<span class="small">${esc(sc.when)}</span>`,
        ],
      })),
      { compact: true, variant: "decision" },
    ));
    p.push(note(v.peakShare >= 40
      ? `A projeção adotada usa a <strong>mediana</strong> porque um único sprint (${esc(v.peakSprint)}, ${v.peak} itens) responde por ${v.peakShare}% de todo o fechamento: a média herda esse pico e antecipa prazo indevidamente. Todos os cenários assumem escopo congelado.`
      : "Todos os cenários assumem escopo congelado — nenhum item novo entrando."));
  }

  return p.filter(Boolean).join("\n");
}

function renderOpenItems(ctx) {
  const dl = ctx.d.delivery;
  const a = ctx.d.azure;
  const open = (a.items || []).filter((i) => i.category !== "done" && i.category !== "removed");
  if (!open.length) return "";
  const leaves = dl && dl.available ? dl.openLeaves.length : null;

  const rows = open.map((i) => ({
    search: `${i.id} ${i.title} ${i.type || ""} ${i.assignedTo || ""}`,
    data: { tipo: i.type || "—", estado: i.state || "—", responsavel: i.assignedTo || "não atribuído" },
    sort: { id: Number(i.id) || 0, titulo: i.title },
    cells: [
      safeUrl(i.url) ? `<a href="${attr(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">${pill(`#${i.id}`, "neutral", { mono: true })}</a>` : pill(`#${i.id}`, "neutral", { mono: true }),
      esc(i.type || "—"),
      `<span class="case-name">${esc(i.title)}</span>`,
      categoryPill(i.category, i.state),
      esc(i.assignedTo || "—"),
    ],
  }));

  return [
    h2("gestao-abertos", "O que falta fechar", open.length),
    ctx.ask("gestao.abertos") || asks(
      "O que exatamente está em aberto",
      leaves !== null
        ? `<strong>${leaves} ${leaves === 1 ? "item folha" : "itens folha"}</strong> — é o trabalho residual real. Os demais ${open.length - leaves} registros abertos são itens-pai, que só fecham quando as filhas fecham: não são trabalho a mais, são o agrupamento do mesmo trabalho, e por isso não entram na conta do progresso.`
        : `<strong>${open.length}</strong> item(ns) em aberto no escopo consultado.`,
    ),
    grid({
      id: "grid-abertos", noun: "item(ns)", searchPlaceholder: "número, título…",
      columns: [
        { label: "Item", sort: "id", width: "6rem" }, { label: "Tipo", sort: "tipo", width: "8rem" },
        { label: "Título", sort: "titulo" }, { label: "Estado", sort: "estado", width: "9rem" },
        { label: "Responsável", sort: "responsavel", width: "12rem" },
      ],
      rows,
      filters: [
        { key: "tipo", label: "Tipo", options: filterOptions(rows, (r) => r.data.tipo) },
        { key: "responsavel", label: "Responsável", options: filterOptions(rows, (r) => r.data.responsavel) },
      ],
      variant: "evidence", pageSize: 25, fixed: false,
    }),
  ].join("\n");
}

/** Time e carga: matriz sprint × pessoa. Só com duas ou mais pessoas. */
function renderTeam(ctx) {
  const dl = ctx.d.delivery;
  const a = ctx.d.azure;
  if (!(a.byAssignee || []).length) return "";

  const p = [h2("gestao-time", "Time e carga", a.byAssignee.length)];
  p.push(ctx.ask("gestao.time"));
  p.push(table(["Responsável", { label: "Total", num: true }, { label: "Concluídos", num: true }, { label: "Em andamento", num: true }, "Progresso"],
    a.byAssignee.map((t) => [
      esc(t.key), { html: nf(t.count), num: true }, { html: nf(t.done), num: true }, { html: nf(t.inProgress), num: true }, progressCell(t.done, t.count),
    ]), { compact: true, variant: "evidence" }));

  const m = loadMatrix(dl);   // null sem sprint real — a matriz é por sprint
  if (m && m.people.length >= 2 && m.sprints.length >= 2) {
    p.push(panel({
      title: "Fechamentos por sprint e por pessoa",
      sub: "A intensidade da célula é proporcional ao maior valor da matriz.",
      body: table(
        ["Responsável", ...m.sprints.map((s) => ({ label: s, num: true })), { label: "Total", num: true }],
        m.people.map((person) => [
          esc(person.name),
          ...m.sprints.map((s) => ({ html: heatCell(m.cell(person.name, s), m.max), num: true })),
          { html: `<strong>${nf(person.total)}</strong>`, num: true },
        ]),
        { compact: true, variant: "evidence" },
      ),
    }));
  }
  return p.filter(Boolean).join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   RISCOS E DECISÕES
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderRiscos(ctx) {
  const d = ctx.d;
  const decisions = ctx.content.decisions || [];
  const gaps = d.business.gaps || [];
  const risks = d.risks.items || [];
  if (!decisions.length && !gaps.length && !risks.length && !d.syncLog && !d.curated?.sections?.nextSteps) return "";

  const p = [`<h1 id="h-riscos">Riscos e decisões</h1>`];
  p.push(`<p class="lede">${ctx.section("riscos.lede") ? inline(ctx.section("riscos.lede")) : "O que ainda depende de decisão, o que está pendente e o que a equipe recomenda como próximo passo."}</p>`);

  // Pauta com opções e recomendação — a versão completa da tabela do sumário.
  if (decisions.length) {
    p.push(h2("riscos-pauta", "Pauta da reunião de fechamento", decisions.length));
    p.push(ctx.ask("riscos.pauta"));
    p.push(table(
      [{ label: "#", width: "3rem", num: true }, { label: "Item", width: "26%" }, "Opções e recomendação", { label: "Depende de", width: "13rem" }],
      decisions.map((x, i) => ({
        cls: x.level === "crit" ? "row-crit" : x.level === "warn" ? "row-warn" : null,
        cells: [
          { html: String(i + 1), num: true },
          `<strong>${inline(x.title)}</strong>${x.unlocks ? `<br><span class="small">${inline(x.unlocks)}</span>` : ""}`,
          (x.options.length
            ? x.options.map((o) => `<span class="dec-opt small">${o.recommended ? "<b>" : ""}${inline(o.label)}${o.recommended ? "</b>" : ""}</span>`).join("")
            : "")
          + (x.recommendation ? `<div class="dec-rec small">${inline(x.recommendation)}</div>` : "")
          || `<span class="muted">—</span>`,
          x.owner ? `<span class="small">${esc(x.owner)}</span>` : `<span class="muted">—</span>`,
        ],
      })),
      { variant: "decision" },
    ));
  }

  if (risks.length) {
    p.push(h2("riscos-atencao", "Pontos de atenção", risks.length));
    p.push(ctx.ask("riscos.atencao"));
    p.push(table(["Severidade", "Frente", "Ponto", "Detalhe", "Evidência"], risks.map((r) => ({
      cls: r.severity === "alta" ? "row-crit" : r.severity === "média" ? "row-warn" : null,
      cells: [
        severityPill(r.severity), esc(r.area), `<span class="case-name">${esc(r.title)}</span>`,
        `<span class="small">${esc(clip(r.detail || "", 400))}</span>`,
        r.evidence ? `<span class="small muted">${esc(r.evidence)}</span>` : `<span class="muted">—</span>`,
      ],
    }))));
  } else {
    p.push(h2("riscos-atencao", "Pontos de atenção"));
    p.push(callout("Nenhum ponto de atenção detectado", "<p>Sem GAPs abertos, testes falhando, suítes não executadas ou itens bloqueados no momento desta geração.</p>", "ok"));
  }

  if (gaps.length) {
    p.push(h2("riscos-gaps", "GAPs registrados", gaps.length));
    const rows = gaps.map((g) => {
      const open = !/(fechad|resolvid|closed|respondid)/i.test(g.status || "");
      return {
        cls: open && /(crít|critic|alta|high)/i.test(g.severity || "") ? "row-crit" : null,
        search: `${g.id} ${g.theme || ""} ${g.question || ""} ${g.owner || ""}`,
        data: { situacao: open ? "Aberto" : "Fechado", severidade: g.severity || "—" },
        sort: { id: g.id },
        cells: [
          pill(g.id, "neutral", { mono: true }),
          esc(g.theme || ""),
          g.severity ? severityPill(/(crít|critic|alta|high)/i.test(g.severity) ? "alta" : "média", g.severity) : `<span class="muted">—</span>`,
          open ? pill("aberto", "warn") : pill(g.status || "fechado", "ok"),
          esc(g.owner || "—"),
          `<span class="small">${esc(clip(g.question || "", 300))}</span>`,
        ],
      };
    });
    p.push(grid({
      id: "grid-gaps", noun: "GAP(s)", searchPlaceholder: "ID, tema, questão…",
      columns: [
        { label: "ID", sort: "id", width: "7rem" }, { label: "Tema", sort: "tema", width: "16%" },
        { label: "Severidade", sort: "severidade", width: "8rem" }, { label: "Situação", sort: "situacao", width: "8rem" },
        { label: "Dono", sort: "dono", width: "10rem" }, { label: "Questão", sort: "questao" },
      ],
      rows,
      filters: [
        { key: "situacao", label: "Situação", options: filterOptions(rows, (r) => r.data.situacao) },
        { key: "severidade", label: "Severidade", options: filterOptions(rows, (r) => r.data.severidade) },
      ],
      variant: "evidence", pageSize: 25,
    }));
  }

  p.push(h2("riscos-proximos", "Próximos passos"));
  const next = ctx.d.curated?.sections?.nextSteps;
  if (next) p.push(`<div class="card">${mdToHtml(next.markdown, { headingOffset: 4 })}</div>`);
  else {
    p.push(`<div class="card">${autoNextSteps(ctx)}</div>`);
  }

  if (d.syncLog) {
    p.push(h3("riscos-historico", "Histórico de decisões do projeto"));
    p.push(note("Log de sincronização mantido pelo pipeline: cada skill executada registrou aqui o resultado, as questões abertas e o próximo passo."));
    p.push(fold(`Log de sincronização <span class="muted small">· ${esc(d.syncLog.path)}</span>`, mdToHtml(d.syncLog.markdown, { headingOffset: 4 })));
  }

  return p.filter(Boolean).join("\n");
}

function autoNextSteps(ctx) {
  const d = ctx.d;
  const steps = [];
  const failing = (d.tests?.cases || []).filter((c) => c.status === "failed").length;
  if (failing) steps.push([`Tratar os ${failing} teste(s) falhando`, "Equipe de engenharia", "Imediato"]);
  const notRun = (d.tests?.suites || []).filter((s) => !s.executed);
  if (notRun.length) steps.push([`Viabilizar a execução de ${notRun.length} suíte(s) não executada(s)`, "Equipe de engenharia", "Imediato"]);
  const openGaps = (d.business.gaps || []).filter((g) => !/(fechad|resolvid|closed|respondid)/i.test(g.status || ""));
  if (openGaps.length) steps.push([`Fechar ${openGaps.length} GAP(s) em aberto`, "Consultor + Cliente", "Imediato"]);
  if (d.delivery?.available && d.delivery.openLeaves.length) {
    steps.push([`Concluir os ${d.delivery.openLeaves.length} itens folha em aberto`, "Time de delivery", "Próxima iteração"]);
  }
  if (!d.phase.hasAudit && ["implementation", "delivery"].includes(d.phase.stage)) {
    steps.push(["Executar a auditoria de código (spec-code-audit, Fase 12) antes do deploy", "Tech Lead", "Antes da entrega"]);
  }
  if (d.tests?.coverage?.lines != null && d.tests.coverage.lines < 60) {
    steps.push([`Elevar a cobertura de testes (hoje ${fmtPct(d.tests.coverage.lines)}%)`, "Equipe de engenharia", "Próxima iteração"]);
  }
  if (!steps.length) steps.push(["Nenhuma pendência bloqueante identificada — validar o pacote com o cliente", "Consultor", "Imediato"]);
  return table(["Passo", "Responsável sugerido", "Prazo"], steps.map((s) => s.map(esc)), { compact: true })
    + note(`Passos <strong>derivados</strong> do estado coletado. Para uma lista curada, preencha a seção «Próximos passos» em <code>${esc(d.paths.outputs)}/status/executive-summary.md</code>.`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANEXOS, GLOSSÁRIO E CONTROLE
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderAnexos(ctx) {
  const hasAnnexes = Boolean(ctx.annexes);
  const hasGloss = Boolean(ctx.glossary);
  const prov = ctx.d.provenance;
  const hasProv = Boolean(prov && (prov.provenance || []).length);
  const revisions = ctx.content.revisions || [];
  const signs = ctx.content.signatures || [];
  if (!hasAnnexes && !hasGloss && !hasProv && !revisions.length && !signs.length) return "";

  const p = [`<h1 id="h-anexos">Anexos, glossário e controle</h1>`];
  if (hasAnnexes) {
    p.push(`<p class="lede"><strong>${ctx.annexes.total} documentos</strong>${ctx.annexes.totalKb ? ` (${fmtBytes(ctx.annexes.totalKb)})` : ""} acompanham este HTML${ctx.annexes.baseDir ? ` na pasta <code>${esc(ctx.annexes.baseDir)}</code>` : ""}. O relatório traz a síntese; o documento manda.</p>`);
  }

  if (hasAnnexes) {
    const an = ctx.annexes;
    p.push(h2("anexos-indice", "Índice geral", an.total));
    p.push(ctx.ask("anexos.indice"));
    if (an.groups.length > 1) {
      const chart = hbarStack(
        an.groups.map((g, i) => ({ label: g.name, sub: g.kb ? fmtBytes(g.kb) : null, segments: [{ label: g.name, value: g.count, color: SERIES[i % SERIES.length] }] })),
        { width: 980, labelW: 290, trailing: (r) => `${r.segments[0].value} doc.` },
      );
      if (chart) p.push(panel({ title: "Volume de documentação por grupo", sub: "Quantidade de documentos e tamanho total.", body: chart }));
    }
    const rows = an.docs.map((doc) => ({
      search: `${doc.title} ${doc.path} ${doc.group}`,
      data: { grupo: doc.group },
      sort: { titulo: doc.title, caminho: doc.path, kb: doc.kb ?? 0 },
      cells: [
        `<a href="${attr(doc.path)}"><strong>${esc(doc.title)}</strong></a>${doc.note ? `<br><span class="muted small">${esc(doc.note)}</span>` : ""}`,
        `<span class="small">${esc(doc.group)}</span>`,
        `<span class="path">${esc(doc.path)}</span>`,
        { html: doc.kb ? fmtBytes(doc.kb) : `<span class="muted">—</span>`, num: true },
      ],
    }));
    p.push(h3("anexo-lista", `Todos os ${an.total} documentos`, an.total));
    p.push(grid({
      id: "grid-anexos", noun: "documento(s)", searchPlaceholder: "título, caminho…",
      columns: [{ label: "Documento", sort: "titulo", width: "34%" }, { label: "Grupo", sort: "grupo", width: "18%" }, { label: "Caminho", sort: "caminho" }, { label: "Tamanho", sort: "kb", num: true, width: "6rem" }],
      rows,
      filters: [{ key: "grupo", label: "Grupo", options: filterOptions(rows, (r) => r.data.grupo) }],
      pageSize: 50,
    }));
    const notes = an.groups.filter((g) => g.note);
    if (notes.length) p.push(note(notes.map((g) => `<strong>${esc(g.name)}</strong> — ${esc(g.note)}`).join("<br>")));
  }

  if (hasGloss) {
    p.push(h2("anexos-glossario", "Glossário", ctx.glossary.terms.length));
    p.push(ctx.ask("anexos.glossario") || asks(
      "O que significa cada sigla deste documento",
      `<strong>${ctx.glossary.terms.length} termos</strong>. Ao longo do relatório, a primeira ocorrência de cada sigla em cada aba aparece sublinhada e leva até aqui.`,
    ));
    p.push(renderGlossary(ctx.glossary.terms));
  }

  p.push(h2("anexos-controle", "Controle do documento"));
  p.push(ctx.ask("anexos.controle"));
  if (revisions.length) {
    p.push(table([{ label: "Versão", width: "6rem" }, { label: "Data", width: "8rem" }, { label: "Responsável", width: "12rem" }, "Alteração"],
      revisions.map((r) => [`<strong>${esc(r.version)}</strong>`, esc(r.date), esc(r.author || "—"), esc(r.change || "")]), { compact: true }));
  } else {
    p.push(dl2([
      { label: "Documento", value: ctx.title },
      ctx.docVersion ? { label: "Versão", value: ctx.docVersion } : null,
      { label: "Emitido em", value: fmtDate(ctx.d.generatedAt) },
      ctx.d.report.author ? { label: "Responsável", value: ctx.d.report.author } : null,
      ctx.confidentialLabel ? { label: "Classificação", value: ctx.confidentialLabel } : null,
      { label: "Gerado por", value: `spec-status-report (Eng_Proc)` },
    ].filter(Boolean)));
    p.push(note("O histórico de revisões aparece aqui quando o conteúdo editorial declara <code>revisions</code>."));
  }
  if (signs.length) p.push(signatures(signs, { title: "Aceite das partes" }));

  if (hasProv) {
    p.push(h2("anexos-proveniencia", "De onde cada número veio", prov.provenance.length));
    p.push(ctx.ask("anexos.proveniencia") || asks(
      "Qual artefato alimentou cada parte deste relatório",
      `<strong>${prov.provenance.length} artefatos</strong> lidos. É a lista que permite auditar o relatório contra as fontes.`,
    ));
    const rows = prov.provenance.map((a) => ({
      search: `${a.canonical} ${a.rel} ${a.label}`,
      data: { layout: a.layout === "atual" ? "Layout atual" : "Layout de versão anterior" },
      sort: { artefato: a.canonical, caminho: a.rel },
      cells: [
        `<code>${esc(a.canonical)}</code>${a.renamed ? `<br><span class="muted small">nome no disco: ${esc(a.alias)}</span>` : ""}`,
        `<span class="path">${esc(a.rel)}</span>`,
        a.layout === "atual" ? pill(a.label, "ok") : pill(a.label, "warn"),
      ],
    }));
    p.push(grid({
      id: "grid-proveniencia", noun: "artefato(s)", searchPlaceholder: "artefato, caminho…",
      columns: [{ label: "Artefato", sort: "artefato", width: "26%" }, { label: "Lido de", sort: "caminho", width: "40%" }, { label: "Layout", sort: "layout" }],
      rows,
      filters: [{ key: "layout", label: "Layout", options: filterOptions(rows, (r) => r.data.layout) }],
      pageSize: 50,
    }));
    if (prov.usesLegacyLayout) {
      p.push(callout("Parte dos artefatos veio de uma versão anterior do processo",
        "<p>Foram lidos normalmente — o relatório reconhece os layouts e nomes antigos. As saídas desta geração, porém, foram gravadas no layout atual.</p>", "info"));
    }
  }

  // Escopo da coleta: o que foi varrido. Vem antes dos artefatos de extensão porque
  // responde a pergunta anterior — «este relatório mediu o quê?». Dois relatórios do
  // mesmo repositório com números diferentes se explicam aqui.
  const sc = ctx.d.scope;
  if (sc) {
    p.push(h3("anexos-escopo", "Escopo da coleta"));
    if (!sc.declared) {
      p.push(callout(
        "Escopo presumido",
        "<p>Nenhuma pasta foi declarada nesta geração: a varredura usou <strong>a raiz inteira</strong> do repositório. Em entrega multi-repositório ou em monorepo com vários produtos, isso mistura código e testes de outras entregas nos números. Declare as pastas (<code>--docs</code>, <code>--code</code>, <code>--tests</code>, <code>--extra</code>) para o relatório medir só o que é deste projeto.</p>",
        "warn",
      ));
    } else {
      const linhas = [
        ...sc.docs.map((e) => ["Documentação", e]),
        ...sc.code.map((e) => ["Código", e]),
        ...sc.tests.map((e) => ["Testes", e]),
        ...sc.extra.map((e) => ["Outras", e]),
      ];
      p.push(table(
        [{ label: "Natureza", width: "12rem" }, { label: "Pasta", width: "12rem" }, "Caminho"],
        linhas.map(([kind, e]) => [
          esc(kind),
          `<strong>${esc(e.label)}</strong>`,
          `<span class="path">${esc(e.rel)}</span>${e.outsideRoot ? ` ${pill("fora da raiz", "info")}` : ""}`,
        ]),
        { compact: true, variant: "evidence" },
      ));
      p.push(note("Só estas pastas foram varridas. Volume de código, execução de testes e rastro no código referem-se exclusivamente a elas."));
    }
  }

  const extras = ctx.x.inventory;
  if (extras && (extras.found.length || extras.missing.length)) {
    p.push(h3("anexos-extensoes", "Artefatos de extensão"));
    p.push(note("Estes artefatos são <strong>opcionais</strong>. Cada um habilita uma leitura adicional do relatório; a ausência de qualquer um deles suprime a seção correspondente, sem afetar as demais."));
    p.push(table(["Artefato", "Situação", "O que habilita"], [
      ...extras.found.map((f) => [`<code>${esc(f.name)}</code>`, pill("presente", "ok"), `<span class="small">${esc(f.enables || "—")}</span>`]),
      ...extras.missing.map((n) => [`<code>${esc(n)}</code>`, pill("ausente", "neutral"), `<span class="small muted">${esc(extraPurpose(n))}</span>`]),
    ], { compact: true, variant: "evidence" }));
  }

  return p.filter(Boolean).join("\n");
}

// A lista do que cada artefato habilita mora no coletor (EXTRA_ARTIFACTS). Havia uma
// segunda cópia aqui, e artefato novo entrava numa e não na outra.
function extraPurpose(name) {
  return EXTRA_ARTIFACTS[name] || OVERRIDE_ARTIFACTS[name] || "—";
}

/* ═════════════════════════════ utilitários ═════════════════════════════ */

function groupBy(list, keyOf) {
  const m = new Map();
  for (const x of list || []) {
    const k = keyOf(x);
    if (k === null || k === undefined) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

function countBy(list, keyOf) {
  const m = new Map();
  for (const x of list || []) {
    const k = keyOf(x);
    if (k === null || k === undefined) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
