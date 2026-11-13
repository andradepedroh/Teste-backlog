// render-lacunas-teste.mjs — a aba «O que falta testar» (#lacunas-teste).
//
// A aba existe quando há matriz de rastreabilidade medida (código inventariado e testes
// executados). Com a análise curada (`test-gaps.json`), responde item a item o que fazer;
// sem ela, sai em forma reduzida e diz por que está reduzida — nunca com texto que pareça
// análise. Os dados vêm prontos de lib/lacunas-teste.mjs: aqui só há composição.

import { esc, inline, slug } from "./escape.mjs";
import {
  asks, callout, dl2, filterOptions, filterOptionsMulti, fold, grid, kpiGrid, multiValue, note, pill, srcLink, table,
} from "./components.mjs";
import {
  ACTIONS, ACTION_ORDER, IMPL_LABEL, LAYER_LABEL, PRIORITY_LABEL, PRIORITY_ORDER, SITUATION_LABEL,
} from "./lacunas-teste.mjs";
import { clip, fmtDate, fmtPct, h2, nf } from "./render-shared.mjs";

const PRIORITY_KIND = { alta: "crit", media: "warn", baixa: "neutral", none: "neutral", pending: "neutral" };
const ACTION_KIND = { "mark-id": "ok", create: "warn", "with-impl": "info", none: "neutral", pending: "neutral" };

export function renderLacunas(ctx) {
  const g = ctx.d.testGaps;
  if (!g || !g.available) return "";
  const cur = g.curated;
  const rich = Boolean(cur && cur.analyzed);

  const p = [`<h1 id="h-lacunas-teste">O que falta testar</h1>`];
  p.push(`<p class="lede">${ctx.section("lacunas.lede") ? inline(ctx.section("lacunas.lede")) : openingSentence(g)}</p>`);

  if (cur) {
    p.push(note(`Análise item a item de <strong>${esc(cur.generatedAt ? fmtDate(cur.generatedAt) : "data não declarada")}</strong>${cur.basis ? ` · base: ${esc(cur.basis)}` : ""} · ${nf(cur.analyzed)} de ${nf(g.totals.withoutTest)} itens sem teste analisados · fonte: <code>${esc(cur.path)}</code>.`));
    if (cur.stale) {
      p.push(callout("A análise pode estar desatualizada", `<p>${esc(cur.staleReasons.join("; "))}. O código e os testes podem ter mudado depois que ela foi feita: confira antes de entregar a lista ao time, ou refaça a análise sobre esta coleta.</p>`, "warn"));
    }
  } else {
    p.push(callout(
      "Leitura reduzida: falta a análise item a item",
      `<p>Esta aba saiu só com o que a matriz de rastreabilidade mede: quais itens não têm nenhum teste citando o código deles e quais têm teste que falha. A análise de cada item — onde a regra está no código, se já existe teste que a exercita sem citar o código, quais testes criar e com que prioridade — vem de <code>status/test-gaps.json</code>, que não foi encontrado. O passo opcional «Analisar o que falta testar» do fluxo da skill produz esse arquivo.</p>`,
      "info",
    ));
  }
  if (g.suitesNotRun.length) {
    p.push(callout("Parte das suítes não rodou nesta geração", `<p>${g.suitesNotRun.map(esc).join(", ")} não ${g.suitesNotRun.length === 1 ? "foi executada" : "foram executadas"}. Um item testado só por ${g.suitesNotRun.length === 1 ? "ela" : "elas"} aparece abaixo como sem teste.</p>`, "warn"));
  }

  p.push(renderActions(ctx, g, rich));
  p.push(renderPriorityAndArea(g, rich));
  p.push(renderCountingRule(g));
  p.push(renderFindingsBeyond(g));
  p.push(renderPoQuestions(g));
  p.push(renderItems(g, rich, codeRepo(ctx)));
  p.push(renderFailing(g));
  return p.filter(Boolean).join("\n");
}

function openingSentence(g) {
  return `A cobertura de regras e requisitos está em <strong>${fmtPct(g.coverage.current)}%</strong>: ${nf(g.totals.withTest)} de ${nf(g.totals.matrix)} itens de negócio têm teste automatizado. Esta aba diz o que fazer com os outros <strong>${nf(g.totals.withoutTest)}</strong>. Atenção à leitura do número: a matriz de rastreabilidade conta um item como testado quando o código dele aparece no nome de um teste (ou num comentário do arquivo de teste). Ela não lê o que o teste faz. Por isso um item pode estar aqui mesmo já tendo um teste que confere o comportamento — nesse caso, falta só marcar o código no teste.`;
}

/* ───────────────────────── quadro de ações e projeção ───────────────────────── */

function renderActions(ctx, g, rich) {
  const p = [h2("lacunas-acoes", rich ? "O que fazer com os itens sem teste" : "Os itens sem teste, pela situação no código", g.totals.withoutTest)];
  if (rich) {
    p.push(kpiGrid(ACTION_ORDER.filter((k) => g.actions[k] || ["mark-id", "create", "with-impl"].includes(k)).map((k) => ({
      label: ACTIONS[k].label, value: nf(g.actions[k] || 0),
      hint: { "mark-id": "o teste existe; falta o código no nome e os cenários que faltam", create: "o item está implementado e nenhum teste o exercita", "with-impl": "o item não está implementado; o teste nasce no mesmo card", none: "requisito que não vira teste automatizado, segundo a análise", pending: "itens sem teste que a análise não cobriu" }[k],
      level: k === "pending" ? "warn" : "neutral",
    })), { cols: 3 }));
    if (g.projection) {
      const pj = g.projection;
      p.push(asks(
        "Quanto a cobertura sobe com isso",
        `Com as ${nf(pj.markId)} marcações e os ${nf(pj.create)} testes novos, a cobertura de regras e requisitos sobe de <strong>${fmtPct(pj.current)}%</strong> para <strong>${fmtPct(pj.projected)}%</strong> (${nf(pj.projectedCount)} de ${nf(pj.total)} itens). A conta é (itens que já têm teste + marcar o código + criar do zero) ÷ total da matriz; os itens que dependem de implementação ficam fora dela.`,
      ));
    }
  } else {
    p.push(kpiGrid([
      { label: "Implementados, sem teste", value: nf(g.situations.implemented || 0), hint: "o código cita o item, nenhum teste cita", level: "neutral" },
      { label: "Só no backlog", value: nf(g.situations.planned || 0), hint: "uma tarefa declara o item, nenhum código cita", level: "neutral" },
      { label: "Sem vínculo", value: nf(g.situations.unmapped || 0), hint: "nem código nem tarefa citam o código do item", level: "neutral" },
      { label: "Com teste que falha", value: nf(g.totals.failing), hint: "ver o anexo no fim da aba", level: g.totals.failing ? "warn" : "neutral" },
    ]));
    p.push(note("«Sem vínculo» mede a marcação, não a implementação: o comportamento pode existir no código sem que nenhum arquivo cite o código do item. A projeção de cobertura só sai com a análise item a item, porque é ela que diz quantos itens já têm teste esperando a marcação."));
  }
  return p.filter(Boolean).join("\n");
}

/* ───────────────────────── prioridade e área ───────────────────────── */

function renderPriorityAndArea(g, rich) {
  const p = [h2("lacunas-prioridade", rich ? "Por prioridade e por área" : "Por área")];
  if (rich) {
    const prios = PRIORITY_ORDER.filter((k) => g.priorities[k]);
    p.push(table(
      ["Prioridade", { label: "Itens", num: true }],
      prios.map((k) => [pill(PRIORITY_LABEL[k], PRIORITY_KIND[k]), { html: nf(g.priorities[k]), num: true }]),
      { compact: true, variant: "evidence" },
    ));
    const cols = PRIORITY_ORDER.filter((k) => g.areas.some((a) => a[k]));
    p.push(table(
      ["Área", { label: "Itens", num: true }, ...cols.map((k) => ({ label: PRIORITY_LABEL[k], num: true }))],
      g.areas.map((a) => [`<strong>${esc(a.name)}</strong>`, { html: nf(a.total), num: true }, ...cols.map((k) => ({ html: nf(a[k] || 0), num: true }))]),
      { compact: true, variant: "evidence", foot: ["<strong>Total</strong>", { html: `<strong>${nf(g.totals.withoutTest)}</strong>`, num: true }, ...cols.map((k) => ({ html: `<strong>${nf(g.priorities[k] || 0)}</strong>`, num: true }))] },
    ));
  } else {
    p.push(table(
      ["Área", { label: "Itens", num: true }, { label: "Implementados", num: true }, { label: "Só no backlog", num: true }, { label: "Sem vínculo", num: true }],
      g.areas.map((a) => [`<strong>${esc(a.name)}</strong>`, { html: nf(a.total), num: true }, { html: nf(a.implemented || 0), num: true }, { html: nf(a.planned || 0), num: true }, { html: nf(a.unmapped || 0), num: true }]),
      { compact: true, variant: "evidence" },
    ));
  }
  p.push(note("Área é o módulo do item, ou o agrupamento de módulos que a análise declarou. As contagens saem dos itens listados abaixo, um a um."));
  return p.join("\n");
}

/* ───────────────────────── regra para o teste contar ───────────────────────── */

function renderCountingRule(g) {
  const id = g.exampleId;
  return [
    h2("lacunas-regra", "Regra para o teste contar"),
    `<p>O nome do teste precisa <strong>começar pelo código do item</strong>. Sem o código, a matriz não liga o teste à regra, por melhor que o teste seja.</p>`,
    `<p class="small"><strong>Java (JUnit 5):</strong> no <code>@DisplayName</code>.</p>`,
    `<div class="gap-example">${esc(`@Test\n@DisplayName("${id} — quando o pedido está completo, o sistema aceita")\nvoid aceitaPedidoCompleto() { … }`)}</div>`,
    `<p class="small"><strong>JavaScript e TypeScript (Vitest, Jest, Playwright):</strong> no título do <code>it</code> ou do <code>test</code>.</p>`,
    `<div class="gap-example">${esc(`it("${id} — quando falta um campo obrigatório, o sistema recusa", () => { … });`)}</div>`,
    note("Um teste que confere mais de um item pode citar mais de um código no título. O código citado só num comentário do arquivo de teste também liga o item, mas a todos os testes daquele arquivo de uma vez — o nome do teste é a forma precisa."),
  ].join("\n");
}

/* ───────────────────────── achados além dos testes ───────────────────────── */

function renderFindingsBeyond(g) {
  if (!g.doneWithoutCode.length && !g.contradictingTests.length) return "";
  const p = [h2("lacunas-achados", "Achados que vão além dos testes", g.doneWithoutCode.length + g.contradictingTests.length)];
  if (g.doneWithoutCode.length) {
    p.push(`<p>Itens que a análise encontrou <strong>resolvidos sem código</strong> — por configuração, por dado ou por outro card. Não há teste a criar; vale registrar como o item foi atendido.</p>`);
    p.push(table(["Item", "O que a análise encontrou"], g.doneWithoutCode.map((d) => [
      `${pill(d.id, "neutral", { mono: true })} <span class="small">${esc(clip(d.title, 90))}</span>`,
      `<span class="small">${d.notes.map(esc).join("<br>")}</span>`,
    ]), { compact: true, variant: "evidence" }));
  }
  if (g.contradictingTests.length) {
    p.push(`<p>Testes que <strong>afirmam o contrário da regra</strong>. Passar nesses testes não prova que a regra está atendida — eles precisam ser corrigidos ou a regra, revista.</p>`);
    p.push(table(["Teste", "Regra", "O que diverge"], g.contradictingTests.map((c) => [
      `<code>${esc(c.test)}</code>`, c.rule ? pill(c.rule, "warn", { mono: true }) : `<span class="muted">—</span>`, `<span class="small">${esc(c.text || "")}</span>`,
    ]), { compact: true, variant: "evidence" }));
  }
  return p.join("\n");
}

/* ───────────────────────── pontos para o Dono do Produto ───────────────────────── */

function renderPoQuestions(g) {
  const total = g.poQuestions.reduce((a, x) => a + x.items.length, 0);
  if (!total) return "";
  const p = [h2("lacunas-po", "Pontos a confirmar com o Dono do Produto", total)];
  p.push(`<p>Divergências entre a especificação e o código que a análise não pôde decidir sozinha. Cada uma aparece uma vez, agrupada por área.</p>`);
  for (const a of g.poQuestions) {
    p.push(`<p class="small"><strong>${esc(a.area)}</strong></p>`);
    p.push(`<ul class="tight">${a.items.map((q) => `<li>${inline(q.text)}${q.ids.length ? ` <span class="muted small">(${q.ids.map(esc).join(", ")})</span>` : ""}</li>`).join("")}</ul>`);
  }
  return p.join("\n");
}

/* ───────────────────────── item a item ───────────────────────── */

function renderItems(g, rich, repo) {
  if (!g.items.length) {
    return [h2("lacunas-itens", "Item a item"), callout("Todos os itens têm teste", `<p>Os ${nf(g.totals.matrix)} itens da matriz têm pelo menos um teste citando o código deles.</p>`, "ok")].join("\n");
  }
  const rows = g.items.map((it) => {
    const prio = it.priority || "none";
    const layers = it.layers.map((l) => LAYER_LABEL[l] || l);
    return {
      cls: prio === "alta" ? "row-crit" : null,
      search: `${it.id} ${it.title} ${it.rule || ""} ${it.statement || ""} ${it.moduleLabel} ${it.area} ${(it.implementation?.where || []).map((w) => w.file).join(" ")}`,
      data: {
        area: it.area,
        prioridade: PRIORITY_LABEL[prio],
        acao: ACTIONS[it.action].short,
        camada: multiValue(layers),
        repositorio: multiValue(it.repos),
        situacao: SITUATION_LABEL[it.situation] || it.situation,
      },
      sort: { id: it.id, area: `${it.area} ${it.moduleLabel} ${it.id}` },
      cells: [
        `<span class="small"><strong>${esc(it.area)}</strong>${it.area !== it.moduleLabel ? `<br>${esc(it.moduleLabel)}` : ""}</span>`,
        itemCard(it, repo),
      ],
    };
  });
  const filters = [
    { key: "area", label: "Área", options: filterOptions(rows, (r) => r.data.area) },
    ...(rich ? [
      { key: "prioridade", label: "Prioridade", options: filterOptions(rows, (r) => r.data.prioridade) },
      { key: "acao", label: "Ação", options: filterOptions(rows, (r) => r.data.acao) },
      { key: "camada", label: "Camada", multi: true, options: filterOptionsMulti(rows, (r) => r.data.camada.split("|").filter(Boolean)) },
      { key: "repositorio", label: "Repositório", multi: true, options: filterOptionsMulti(rows, (r) => r.data.repositorio.split("|").filter(Boolean)) },
    ] : []),
    { key: "situacao", label: "Situação no código", options: filterOptions(rows, (r) => r.data.situacao) },
  ];
  return [
    h2("lacunas-itens", "Item a item, por área e módulo", g.items.length),
    note(rich
      ? "Cada linha abre o cartão do item: o que a regra diz, onde está no código, o teste que já existe e os testes a criar, com as situações que cada um precisa conferir. Os filtros combinam entre si."
      : "Cada linha abre o cartão do item com o que a matriz sabe dele: o texto da especificação, onde o código cita o item e as tarefas ligadas."),
    grid({
      id: "grid-lacunas", noun: "item(ns)", searchPlaceholder: "código, regra, arquivo…",
      columns: [{ label: "Área › módulo", sort: "area", width: "15rem" }, { label: "Item", sort: "id" }],
      rows, filters, variant: "evidence", pageSize: 25, fixed: false,
    }),
  ].join("\n");
}

/**
 * Repositório dos links de `arquivo:linha` da matriz: `repo.repository` da camada editorial
 * e, sem ele, o nome do projeto — que é o nome do repositório padrão no Azure DevOps. Sem
 * `repo` configurado, nada: o caminho sai como texto, nunca como âncora morta.
 */
function codeRepo(ctx) {
  const r = ctx.content && ctx.content.repo;
  if (!r || !r.org || !r.project) return null;
  return r.repository || r.repositorio || r.name || r.project;
}

function itemCard(it, repo = null) {
  const head = `<span class="gap-head"><span class="op-code">${esc(it.id)}</span><span class="gap-title">${esc(clip(it.title, 110))}</span>`
    + (it.curated
      ? `${pill(PRIORITY_LABEL[it.priority || "none"], PRIORITY_KIND[it.priority || "none"])}${pill(ACTIONS[it.action].short, ACTION_KIND[it.action])}`
      : pill("análise detalhada pendente", "neutral"))
    + `</span>`;

  const b = [];
  if (it.rule) b.push(`<h5>O que a regra diz</h5><p>${inline(it.rule)}</p>`);
  else if (it.statement) b.push(`<h5>Texto da especificação</h5><p>${esc(clip(it.statement, 420))}</p>`);

  b.push(dl2([
    { label: "Tipo", value: it.kindLabel || it.kind },
    { label: "Módulo", value: it.moduleLabel },
    { label: "Situação no código", value: it.situationLabel },
    it.implementation && (it.implementation.state || it.implementation.rawState) ? { label: "Implementação (análise)", value: IMPL_LABEL[it.implementation.state] || it.implementation.rawState } : null,
  ].filter(Boolean)));

  if (!it.curated) {
    b.push(`<p class="gap-pending">Análise detalhada pendente. O relatório só sabe que nenhum teste cita o código <code>${esc(it.id)}</code> — não verificou onde a regra está nem se algum teste já exercita o comportamento.</p>`);
  }

  if (it.implementation && it.implementation.where.length) {
    b.push(`<h5>Onde está no código</h5><ul class="ev-list">${it.implementation.where.map((w) => `<li><code>${esc(w.file)}${w.line ? `:${w.line}` : ""}</code>${w.role ? ` — ${esc(w.role)}` : ""}</li>`).join("")}</ul>`);
  }
  if (it.codeRefs.length) {
    b.push(`<h5>Arquivos que citam o código do item</h5><ul class="ev-list">${it.codeRefs.map((r) => `<li>${srcLink({ repo, path: r.file.startsWith("/") ? r.file : `/${r.file}`, line: r.line, label: `${r.file}${r.line ? `:${r.line}` : ""}` })}</li>`).join("")}</ul>`);
  }
  if (it.existingTest) {
    const e = it.existingTest;
    b.push(`<h5>Teste que já existe</h5><p class="small">${e.file ? `<code>${esc(e.file)}</code>` : ""}${e.test ? ` — <code>${esc(e.test)}</code>` : ""}${e.action === "mark-id" ? `<br>Ação: pôr <code>${esc(it.id)}</code> no início do nome deste teste e completar os cenários abaixo.` : ""}</p>`);
  }
  if (it.testsToCreate.length) {
    b.push(`<h5>Testes a criar (${it.testsToCreate.length})</h5>`);
    for (const t of it.testsToCreate) {
      b.push(`<p class="small">${pill(LAYER_LABEL[t.layer] || t.rawLayer || "camada não declarada", "info")}${t.repo ? ` <strong>${esc(t.repo)}</strong>` : ""}${t.file ? ` · <code>${esc(t.file)}</code>` : ""}</p>`);
      if (t.scenarios.length) b.push(`<ul class="scenarios">${t.scenarios.map((s) => `<li>${inline(s)}</li>`).join("")}</ul>`);
    }
  }
  if (it.priorityReason) b.push(`<p class="small"><strong>Por que esta prioridade:</strong> ${inline(it.priorityReason)}</p>`);
  if (it.poQuestions.length) b.push(`<h5>A confirmar com o Dono do Produto</h5><ul class="tight">${it.poQuestions.map((q) => `<li>${inline(q)}</li>`).join("")}</ul>`);
  if (it.doneWithoutCode.length) b.push(`<h5>Resolvido sem código</h5><ul class="tight">${it.doneWithoutCode.map((q) => `<li>${inline(q)}</li>`).join("")}</ul>`);
  if (it.tasks.length || it.workItems.length) {
    b.push(`<h5>No backlog</h5><p class="small">${[
      ...it.tasks.map((t) => `${pill(t.id, "neutral", { mono: true })} ${esc(clip(t.title || "", 70))}`),
      ...it.workItems.map((w) => `${pill(`#${w.id}`, "neutral", { mono: true })} ${esc(w.state || "")}`),
    ].join("<br>")}</p>`);
  }
  return fold(head, b.filter(Boolean).join("\n"), { id: `lac-${slug(it.id)}` }).replace("<details", `<details class="gap-card"`);
}

/* ───────────────────────── anexo: têm teste, mas falha ───────────────────────── */

function renderFailing(g) {
  if (!g.failing.length) return "";
  return [
    h2("lacunas-falhando", "Anexo — têm teste, mas o teste falha", g.failing.length),
    `<p>Estes itens contam como testados na cobertura de regras, mas pelo menos um teste que cita o código deles falhou nesta geração. ${g.findingsPresent ? "A causa vem da triagem das falhas (<code>test-findings.json</code>), casada pelo código do item no nome do caso." : "Não há triagem das falhas (<code>test-findings.json</code>) nesta geração, então a causa de cada falha não está classificada."}</p>`,
    table(
      ["Item", { label: "Falhando", num: true }, "Casos que falharam", "Causa na triagem"],
      g.failing.map((f) => [
        `${pill(f.id, "warn", { mono: true })}<br><span class="small">${esc(clip(f.title, 80))}</span>`,
        { html: `${nf(f.failed)} de ${nf(f.total)}`, num: true },
        f.failedCases.length ? `<span class="small">${f.failedCases.map((n) => esc(clip(n, 110))).join("<br>")}</span>` : `<span class="muted">—</span>`,
        f.causes.length
          ? `<span class="small">${f.causes.map((c) => `<strong>${esc(c.label)}</strong>${c.dependsOn ? `<br><span class="muted">depende de: ${esc(c.dependsOn)}</span>` : ""}`).join("<br>")}</span>`
          : `<span class="muted small">${g.findingsPresent ? "nenhuma causa da triagem cita este código" : "sem triagem"}</span>`,
      ]),
      { compact: true, variant: "evidence" },
    ),
  ].join("\n");
}
