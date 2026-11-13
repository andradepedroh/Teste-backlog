// render-status-html.mjs — monta o HTML autocontido do relatório.
//
// Um arquivo, CSS embutido, SVG gerado na compilação, zero rede.
//
// ─────────────────────────────────────────────────────────────────────────────
// A REGRA QUE GOVERNA ESTE ARQUIVO INTEIRO
//
//   Ler tudo que o projeto tem — documentos, código, testes, tracker — e exibir
//   exatamente isso. Cada seção nasce do dado que a sustenta. Se esse dado não
//   existe, a seção NÃO EXISTE: nada é reconstruído, estimado ou aproximado para
//   ocupar o lugar dela.
//
// Não há fluxo de telas nos documentos? Não há seção de fluxos — e nenhuma outra
// coisa é montada no lugar. Não há sprint configurado no tracker? Não há gráfico de
// sprint, nem velocidade, nem projeção. Não há triagem das falhas? Não há leitura por
// causa-raiz, e a distribuição por tipo de teste continua onde sempre esteve, com o
// nome do que ela é.
//
// Quando a seção some, some junto o link dela na navegação lateral e no menu — nunca
// fica âncora morta. E o que faltou é declarado em «Limitações desta geração» e na
// tabela de artefatos em Anexos, para o leitor saber que foi ausência de fonte, e não
// ausência de trabalho.
//
// O que se perde com isso é vistosidade. O que se ganha é que todo número na tela
// resiste à pergunta «de onde saiu isso?» — que é a única coisa que sustenta um
// relatório usado para aceitar entrega e pagar fatura.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { attr, esc, inline, mdToHtml } from "./escape.mjs";
import { SEMANTIC, funnel, hbarStack, miniBar, resetChartIds, stackBand, timeline } from "./charts.mjs";
import {
  acts, asks, callout, cover, docActions, dims, filterOptions, fold, grid, kpiGrid,
  layers, note, panel, pill, printChrome, semIcon, state, table, verdict,
} from "./components.mjs";
import { annotate } from "./glossary.mjs";
import { repoLinkScript, seriesChartScript, shellScript } from "./client-script.mjs";
import {
  bandKind, fmtDate, fmtDateTime, fmtDuration, fmtPct, frontAnchor, h2, nf, opAnchor, pct,
} from "./render-shared.mjs";
import {
  renderAnexos, renderCodigo, renderGestao, renderNegocio, renderRiscos, renderTecnico, renderTestes,
} from "./render-domains.mjs";
import { renderLacunas } from "./render-lacunas-teste.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const RENDERER_VERSION = "2.2";

/* ═════════════════════════════ entrada ═════════════════════════════ */

export function renderStatusHtml(data, { themePath = null } = {}) {
  resetChartIds();
  const css = loadCss(themePath);
  const ctx = buildContext(data);

  // Cada domínio é montado ANTES de decidir a navegação: um domínio que devolve
  // conteúdo vazio não entra no menu. Decidir a navegação por lista fixa era o que
  // produzia link para aba em branco em projeto de discovery.
  const built = DOMAIN_ORDER
    .map((d) => ({ ...d, html: safeRender(d, ctx) }))
    .filter((d) => d.html && d.html.trim());

  if (!built.length) throw new Error("nenhum domínio a renderizar — status-data.json vazio?");

  const body = built.map((d, i) => {
    const inner = ctx.glossary ? annotate(d.html, ctx.glossary.terms) : d.html;
    return `<section class="domain${i === 0 ? " is-active" : ""}" id="dom-${d.id}" data-domain="${attr(d.id)}" aria-labelledby="h-${attr(d.id)}">\n${inner}\n</section>`;
  }).join("\n");

  // A sidebar é derivada do HTML pronto: só entra o que tem âncora de verdade no
  // documento. É a rede contra o descompasso entre "o que eu achei que rendeu" e "o
  // que rendeu" — historicamente a origem dos links quebrados.
  const sidebars = built.map((d) => renderSideNav(d, ctx)).join("\n");
  const topnav = built.map((d) => `    <a href="#${attr(d.id)}" data-domain-link="${attr(d.id)}">${esc(d.label)}</a>`).join("\n");
  const glossLink = ctx.glossary && built.some((d) => d.id === "anexos")
    ? `\n    <a href="#anexos/anexos-glossario" class="tb-gloss" title="Glossário de siglas e termos">Glossário</a>` : "";

  const scripts = [
    ctx.repoScript,
    ctx.shellScript,
    ctx.hasSeriesChart ? ctx.seriesScript : "",
  ].filter(Boolean).map((s) => `<script>\n${s}\n</script>`).join("\n");

  return `<!doctype html>
<html lang="pt-BR" data-report-version="${RENDERER_VERSION}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ctx.title)}</title>
<meta name="generator" content="spec-status-report ${RENDERER_VERSION}">
<meta name="description" content="${attr(ctx.description)}">
<style>
${css}
</style>
${renderBuildComment(ctx)}
</head>
<body>
${printChrome({
    headLeft: ctx.title,
    headRight: ctx.client || "",
    footParts: [ctx.subtitle, ctx.confidentialLabel, `Emitido em ${ctx.dateLabel}`],
  })}
<header class="topbar">
  <div class="brand" title="${attr(ctx.title)}">
    <strong>${esc(ctx.projectName)}</strong>
    ${ctx.client ? `<span>${esc(ctx.client)}</span>` : ""}
  </div>
  <nav class="topnav" aria-label="Domínios do relatório">
${topnav}${glossLink}
  </nav>
  <button type="button" class="tb-print" onclick="window.print()" title="Gera o PDF pelo diálogo de impressão. Sai o que está aberto na tela — para o dossiê completo, use «Preparar dossiê».">Imprimir / PDF</button>
</header>
<div class="shell">
<aside class="sidebar" aria-label="Seções">
${sidebars}
</aside>
<main>
<div class="crumb" data-crumb aria-live="polite"></div>
${docActions()}
${body}
<footer class="kit-footer">
  <span>${esc(ctx.title)}${ctx.docVersion ? ` · ${esc(ctx.docVersion)}` : ""} · emitido em ${esc(ctx.dateLabel)}.</span>
  <span>Gerado por <strong>spec-status-report</strong> v${RENDERER_VERSION} · fase detectada: ${esc(data.phase.label)}${data.phase.overridden ? " (sobreposta manualmente)" : ""}.</span>
  ${ctx.confidentialLabel ? `<span><strong>${esc(ctx.confidentialLabel)}</strong></span>` : ""}
</footer>
</main>
</div>
${scripts}
</body>
</html>
`;
}

/**
 * Um domínio que estoura não pode derrubar o relatório inteiro: o erro vira um bloco
 * declarado dentro da própria aba. Entregar sete abas e um aviso é melhor do que
 * entregar exit 1 na véspera da reunião — e o erro fica visível, não engolido.
 */
function safeRender(domain, ctx) {
  try {
    return domain.render(ctx) || "";
  } catch (err) {
    ctx.renderErrors.push({ domain: domain.id, message: String(err && err.message || err) });
    return `<h1 id="h-${attr(domain.id)}">${esc(domain.heading)}</h1>
${callout("Esta seção não pôde ser montada", `<p>O relatório seguiu sem ela para não perder as demais. Detalhe técnico: <code>${esc(String(err && err.message || err))}</code>.</p>`, "crit")}`;
  }
}

function loadCss(themePath) {
  for (const f of [themePath, join(HERE, "report-theme.css")].filter(Boolean)) {
    try { return readFileSync(f, "utf8"); } catch { /* próximo */ }
  }
  throw new Error("report-theme.css não encontrado ao lado do renderer");
}

/* ═════════════════════════════ contexto ═════════════════════════════ */

function buildContext(data) {
  const x = data.extras || {};
  const content = x.content || { present: false, asks: {}, callouts: {}, notes: {}, labels: {}, sections: {} };

  const ctx = {
    d: data,
    x,
    content,
    ops: x.operations || null,
    flows: x.flows || null,
    api: x.apiCatalog || null,
    findings: x.testFindings || null,
    annexes: x.annexes || null,
    glossary: x.glossary && x.glossary.terms.length ? x.glossary : null,
    delivery: data.delivery || null,
    renderErrors: [],
    hasSeriesChart: false,

    projectName: data.report.projectName,
    client: data.report.client,
    title: data.report.title,
    subtitle: data.report.mode === "conclusao" ? "Relatório de conclusão de escopo" : "Relatório de status",
    docVersion: content.docVersion || null,
    confidentialLabel: data.report.confidential ? (content.confidentialLabel || "Confidencial — uso restrito às partes") : null,
    dateLabel: fmtDate(data.generatedAt),
    description: `${data.report.projectName}${data.report.client ? ` — ${data.report.client}` : ""} — ${data.report.mode === "conclusao" ? "relatório de conclusão" : "relatório de status"} emitido em ${fmtDate(data.generatedAt)}`,
  };

  // Texto editorial por âncora. Sem conteúdo curado devolvem "" e o bloco some.
  ctx.ask = (key) => {
    const a = content.asks[key];
    return a && a.answer ? asks(a.question || "O que esta seção responde", inline(a.answer)) : "";
  };
  ctx.callouts = (key) => (content.callouts[key] || []).map((c) => callout(c.title, mdToHtml(c.body, { headingOffset: 5 }), c.kind)).join("");
  ctx.note = (key, fallback = null) => {
    const t = content.notes[key] || fallback;
    return t ? note(inline(t)) : "";
  };
  ctx.section = (key) => content.sections[key] || null;

  ctx.repoScript = repoLinkScript(content.repo);
  ctx.shellScript = shellScript();
  ctx.seriesScript = seriesChartScript();
  return ctx;
}

function renderBuildComment(ctx) {
  const missing = (ctx.x.inventory && ctx.x.inventory.missing) || [];
  const found = (ctx.x.inventory && ctx.x.inventory.found) || [];
  const lines = [
    `${ctx.projectName}${ctx.docVersion ? ` — ${ctx.docVersion}` : ""}`,
    `Emitido em ${ctx.dateLabel}${ctx.confidentialLabel ? ` · ${ctx.confidentialLabel}` : ""}`,
    "",
    "Composição desta geração:",
    `· Gráficos e diagramas em SVG gerado na compilação: o arquivo abre sem rede.`,
    `· A impressão reproduz o estado da tela; «Preparar dossiê completo para PDF»`,
    `  expande as seções e liga a quebra de página por seção.`,
    found.length ? `· Artefatos de extensão lidos: ${found.map((f) => f.name).join(", ")}.` : "· Nenhum artefato de extensão presente — seções ricas suprimidas.",
    missing.length ? `· Ausentes (as seções que dependiam deles não foram renderizadas): ${missing.join(", ")}.` : null,
    ctx.content.present ? `· Conteúdo editorial lido de ${ctx.content.path}.` : "· Sem conteúdo editorial: veredito derivado do semáforo calculado.",
    ctx.content.repo ? "· Links de arquivo:linha configuráveis em window.REPORT_REPO, no fim deste arquivo." : null,
  ].filter((l) => l !== null);
  return `<!--\n  ${lines.join("\n  ")}\n-->`;
}

/* ═════════════════════════════ navegação lateral ═════════════════════════════
   Derivada do HTML já montado: varre h2[id]/h3[id] da seção. Um h3 vira subitem.
   `data-nav-count` no título vira o contador à direita do link. */

function renderSideNav(domain, ctx) {
  const re = /<h([23])\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/h\1>/g;
  const links = [];
  let m;
  while ((m = re.exec(domain.html))) {
    const [, lvl, id, rest, inner] = m;
    if (/data-nav-skip/.test(rest)) continue;
    const countMatch = /data-nav-count="([^"]*)"/.exec(rest);
    links.push({
      id,
      sub: lvl === "3",
      label: stripTags(inner).replace(/\s+/g, " ").trim(),
      count: countMatch ? countMatch[1] : null,
    });
  }
  // O container sai mesmo sem links: o breadcrumb lê o título do domínio daqui, e uma
  // aba curta (um domínio que só declara a lacuna, por exemplo) ficaria sem migalha.
  return `  <div class="side-nav" data-for="${attr(domain.id)}"${domain.first ? "" : " hidden"}>
    <h2>${esc(domain.navTitle || domain.label)}</h2>
${links.length
    ? links.map((l) => `    <a href="#${attr(domain.id)}/${attr(l.id)}" class="${l.sub ? "sub" : ""}" data-anchor="${attr(l.id)}">${esc(clipLabel(l.label))}${l.count ? `<span class="cnt">${esc(l.count)}</span>` : ""}</a>`).join("\n")
    : `    <p class="small muted" style="padding:.35rem .55rem">Seção única — sem subdivisões.</p>`}
  </div>`;
}

function stripTags(s) { return String(s).replace(/<[^>]*>/g, ""); }
function clipLabel(s) { return s.length > 38 ? `${s.slice(0, 37)}…` : s; }


/* ═════════════════════════════ domínios ═════════════════════════════ */

const DOMAIN_ORDER = [
  { id: "visao", label: "Sumário", navTitle: "Sumário executivo", heading: "Sumário executivo", first: true, render: renderVisao },
  { id: "negocio", label: "Negócio", navTitle: "Negócio entregue", heading: "Negócio entregue", render: renderNegocio },
  { id: "tecnico", label: "Técnico", navTitle: "Solução técnica", heading: "Solução técnica", render: renderTecnico },
  { id: "codigo", label: "Código", navTitle: "Código implementado", heading: "Código implementado", render: renderCodigo },
  { id: "testes", label: "Testes", navTitle: "Testes e qualidade", heading: "Testes e qualidade", render: renderTestes },
  { id: "lacunas-teste", label: "O que falta testar", navTitle: "O que falta testar", heading: "O que falta testar", render: renderLacunas },
  { id: "gestao", label: "Execução", navTitle: "Execução e backlog", heading: "Execução e backlog", render: renderGestao },
  { id: "riscos", label: "Riscos e decisões", navTitle: "Riscos e decisões", heading: "Riscos e decisões", render: renderRiscos },
  { id: "anexos", label: "Anexos", navTitle: "Anexos e glossário", heading: "Anexos, glossário e controle", render: renderAnexos },
];

/* ───────────────────────────── Sumário ───────────────────────────── */

function renderVisao(ctx) {
  const { d, content } = ctx;
  const p = [];

  p.push(renderCover(ctx));

  // ─── como ler ───
  if (content.layers.length) {
    p.push(h2("visao-leitura-guia", "Como ler este documento"));
    p.push(ctx.ask("leitura"));
    p.push(layers(content.layers));
  }

  // ─── veredito e dimensões ───
  // Com dimensões declaradas, o título é «Situação por dimensão»; sem elas, o que sai é
  // o estado calculado com os sinais que o sustentam — e o título diz isso.
  const vd = buildVerdict(ctx);
  const dm = buildDimensions(ctx);
  if (vd || dm) {
    p.push(h2("visao-veredito", dm ? "Situação por dimensão" : "Situação geral"));
    p.push(vd);
    p.push(dm);
    if (dm) {
      p.push(ctx.note("veredito", "Dimensões em vez de um sinal único: escopo, qualidade, segurança, ambiente e fechamento têm causas e responsáveis distintos, e um sinal agregado esconderia de quem depende cada providência."));
    } else {
      p.push(renderSignals(ctx));
    }
  }

  // ─── linha do tempo ───
  const ms = buildMilestones(ctx);
  if (ms.length >= 2) {
    p.push(h2("visao-linha", "Linha do tempo"));
    p.push(ctx.ask("linha"));
    p.push(panel({
      title: "Marcos do projeto",
      sub: "Marcos declarados para este relatório, com a data de cada um.",
      body: timeline(ms) + table(
        [{ label: "Data", width: "7rem" }, "Marco", "O que representa"],
        ms.map((m) => [
          `<strong>${esc(fmtDate(m.date))}</strong>`,
          `${semIcon(m.level)} ${esc(m.label)}`,
          esc(m.meaning || ""),
        ]),
        { compact: true, variant: "evidence" },
      ),
    }));
  }

  // ─── KPIs ───
  const kpis = buildHeadlineKpis(ctx);
  if (kpis.length) {
    p.push(h2("visao-kpis", "Os números da entrega"));
    p.push(ctx.ask("kpis"));
    p.push(kpiGrid(kpis.slice(0, 8)));
    if (kpis.length > 8) p.push(kpiGrid(kpis.slice(8, 16), { style: "margin-top:1rem" }));
    p.push(ctx.callouts("kpis"));
    p.push(ctx.note("kpis", "Todo número desta página é rastreável a um artefato ou à execução registrada nesta geração. Onde a fonte não existe, o campo aparece como ausente."));
  }

  // ─── falhas por natureza da providência ───
  p.push(renderFailureBreakdown(ctx, "visao"));

  // ─── funil e frentes (dependem das operações) ───
  if (ctx.ops) {
    p.push(renderFunnel(ctx));
    p.push(renderFronts(ctx));
    p.push(renderAttention(ctx));
  }

  // ─── pauta ───
  if (content.decisions.length) {
    p.push(h2("visao-pauta", "Pauta de decisões do cliente", content.decisions.length));
    p.push(ctx.ask("pauta"));
    p.push(table(
      [{ label: "#", width: "3rem", num: true }, { label: "Providência ou decisão", width: "34%" }, "O que destrava", { label: "Depende de", width: "13rem" }],
      content.decisions.map((x, i) => [
        { html: String(i + 1), num: true },
        `<strong>${inline(x.title)}</strong>`,
        x.unlocks ? `<span class="small">${inline(x.unlocks)}</span>` : "",
        x.owner ? `<span class="small">${esc(x.owner)}</span>` : `<span class="muted">—</span>`,
      ]),
      { variant: "decision" },
    ));
    p.push(ctx.note("pauta", "A tabela completa, com opções e recomendação para cada decisão, está em [Riscos e decisões](#riscos/riscos-pauta)."));
  }

  // ─── leitura do consultor ───
  p.push(renderConsultant(ctx));

  // ─── ponto do processo ───
  p.push(h2("visao-processo", "Ponto do processo"));
  p.push(ctx.ask("processo") || asks(
    "Em que etapa o projeto está, e com que evidência",
    `Etapa <strong>${esc(d.phase.label)}</strong>, inferida dos artefatos presentes${d.phase.overridden ? ` (sobreposta manualmente; a detecção automática indicava <strong>${esc(d.phase.detected)}</strong>)` : ""}. Cada etapa abaixo lista o artefato que a comprova.`,
  ));
  p.push(renderPhaseTable(ctx));

  // ─── limitações ───
  p.push(renderLimitations(ctx));

  return p.filter(Boolean).join("\n");
}

function renderCover(ctx) {
  const { d, content } = ctx;
  const c = content.cover || {};
  const meta = [
    { label: "Cliente", value: d.report.client },
    { label: "Período", value: d.report.period },
    { label: "Responsável", value: d.report.author },
    { label: "Emitido em", value: fmtDate(d.generatedAt) },
  ];
  // Datas de apuração: só entram quando diferem da emissão — repetir a mesma data em
  // três linhas da capa é ruído, mas a diferença entre elas é informação de auditoria.
  const codeAt = d.code?.git?.lastCommit;
  if (codeAt && fmtDate(codeAt) !== fmtDate(d.generatedAt)) meta.push({ label: "Código apurado em", value: fmtDate(codeAt) });
  const azAt = d.azure?.collectedAt;
  if (azAt && fmtDate(azAt) !== fmtDate(d.generatedAt)) meta.push({ label: "Backlog apurado em", value: fmtDate(azAt) });

  return cover({
    id: "visao-capa",
    eyebrow: c.eyebrow || ctx.subtitle,
    title: d.report.title,
    sub: c.sub || c.subtitle || d.phase.description,
    logos: (c.logos || []).map((l) => ({ name: l.name || l.nome, role: l.role || l.papel })).filter((l) => l.name),
    version: content.docVersion,
    confidential: ctx.confidentialLabel ? (ctx.confidentialLabel.split("—")[0].trim() || "Confidencial") : null,
    meta,
  });
}

/** Veredito curado quando existe; derivado do semáforo calculado quando não. */
function buildVerdict(ctx) {
  const v = ctx.content.verdict;
  if (v && (v.title || v.titulo)) {
    const paras = (Array.isArray(v.paragraphs || v.paragrafos) ? (v.paragraphs || v.paragrafos) : [v.body || v.texto])
      .filter(Boolean).map((t) => inline(String(t)));
    return verdict({ level: v.level || v.nivel || ctx.d.health.level, title: v.title || v.titulo, paragraphsHtml: paras });
  }
  const h = ctx.d.health;
  if (!h || !h.signals?.length) return "";
  const crit = h.signals.filter((s) => s.level === "critical");
  const warn = h.signals.filter((s) => s.level === "warn");
  const paras = [];
  if (crit.length) paras.push(`<strong>${crit.length} ponto(s) crítico(s):</strong> ${crit.map((s) => `${esc(s.area)} — ${esc(s.message)}`).join(" ")}`);
  if (warn.length) paras.push(`<strong>${warn.length} em atenção:</strong> ${warn.map((s) => `${esc(s.area)} — ${esc(s.message)}`).join(" ")}`);
  if (!paras.length) paras.push("Nenhum ponto crítico ou de atenção nas frentes medidas nesta geração.");
  return verdict({ level: h.level === "critical" ? "crit" : h.level, title: h.label, paragraphsHtml: paras });
}

/**
 * Semáforo por dimensão — SÓ com as dimensões declaradas no conteúdo editorial.
 *
 * A versão anterior fabricava dimensões a partir das áreas de sinal do semáforo
 * (Testes, Cobertura, Backlog…). O resultado parecia a leitura por dimensão de negócio
 * — escopo, qualidade, segurança, ambiente, contrato, cada uma com dono e evidência —
 * mas era só o cálculo interno reembalado, sem responsável e sem link de prova. Quem
 * define dimensão de entrega é quem conduz o projeto, não o coletor.
 *
 * Sem elas, o Sumário mostra o veredito calculado como faixa de estado, com os sinais
 * listados: menos vistoso, e verdadeiro.
 */
function buildDimensions(ctx) {
  if (!ctx.content.dimensions.length) return "";
  return dims(ctx.content.dimensions.map((x) => ({ ...x, whyHtml: x.why ? inline(x.why) : null })));
}

/**
 * Os sinais medidos, listados como sinais.
 *
 * Substitui as dimensões fabricadas: em vez de apresentar «Testes» e «Cobertura» como
 * se fossem dimensões de entrega com dono e evidência, mostra o que são de fato — o
 * resultado das medições desta geração, cada uma com o seu nível e a sua frase.
 */
function renderSignals(ctx) {
  const signals = ctx.d.health?.signals || [];
  if (!signals.length) return "";
  const rank = { critical: 0, warn: 1, info: 2, ok: 3 };
  const rows = signals.slice().sort((a, b) => rank[a.level] - rank[b.level]).map((s) => [
    `${semIcon(s.level === "critical" ? "crit" : s.level)} <strong>${esc(s.area)}</strong>`,
    esc(s.message),
  ]);
  return table(["Frente medida", "O que foi observado nesta geração"], rows, { compact: true, variant: "evidence" })
    + note("Estes são os sinais que o relatório <strong>mede</strong>. A leitura por dimensão de entrega — escopo, qualidade, segurança, ambiente e fechamento, cada uma com responsável e link de evidência — depende de <code>dimensions</code> no conteúdo editorial, porque quem define dimensão de entrega é quem conduz o projeto.");
}

/**
 * Marcos da linha do tempo — só os declarados.
 *
 * Antes eu sintetizava marcos do que havia sido medido: primeiro commit, coleta do
 * backlog, «emissão deste relatório». Uma linha do tempo em que metade dos pontos é a
 * própria geração do documento não conta a história do projeto — conta a história da
 * execução do script. Marco é decisão de quem conduz: abertura do épico, alteração de
 * escopo, auditoria, homologação. Sem isso declarado, não há linha do tempo.
 */
function buildMilestones(ctx) {
  return ctx.content.milestones;
}

/** KPIs de manchete: operações e regras quando há EAP, senão os do contrato base. */
function buildHeadlineKpis(ctx) {
  const { d, ops } = ctx;
  const out = [];
  const goal = (key) => (ctx.content.goals.find((g) => g.key === key) || {}).target || null;

  if (ops) {
    out.push({ label: "Operações de negócio", value: ops.totals.total, level: "neutral", hint: [ops.fronts.length ? `${ops.fronts.length} frentes` : null, ops.totals.highBand ? `${ops.totals.highBand} de complexidade alta` : null].filter(Boolean).join(" · ") || null });
    if (ops.features.codeState) {
      out.push({
        label: "Com código confirmado", value: ops.totals.codeConfirmed, of: ops.totals.total,
        level: ops.totals.codeAbsent ? "warn" : "ok",
        hint: `${pct(ops.totals.codeConfirmed, ops.totals.total)}% do escopo${ops.totals.codePartial ? ` · ${ops.totals.codePartial} parciais` : ""}${ops.totals.codeAbsent ? ` · ${ops.totals.codeAbsent} sem artefato localizado` : ""}`,
      });
    }
    if (ops.features.e2e) {
      out.push({ label: "Com código e teste E2E", value: ops.totals.e2e, of: ops.totals.total, level: "neutral", hint: `${pct(ops.totals.e2e, ops.totals.total)}% exercitadas no ambiente` });
    }
    if (ops.totals.rules) out.push({ label: "Regras de negócio", value: ops.totals.rules, level: "neutral", hint: "cada uma com a origem no código ou no caso de teste" });
  } else {
    if (d.business.modules.length) out.push({ label: "Módulos", value: d.business.modules.length, level: "neutral" });
    if (d.business.rules.length) out.push({ label: "Regras de negócio", value: d.business.rules.length, level: "neutral", hint: "RN especificadas" });
    if (d.business.requirements.functional.length) out.push({ label: "Requisitos funcionais", value: d.business.requirements.functional.length, level: "neutral" });
    if (d.business.requirements.nonFunctional.length) out.push({ label: "Requisitos não funcionais", value: d.business.requirements.nonFunctional.length, level: "neutral" });
  }

  const t = d.tests?.totals;
  if (t?.total) {
    out.push({ label: "Casos de teste", value: nf(t.total), level: t.failed ? "warn" : "ok", hint: `${t.passed} aprovados · ${t.failed} falhando · ${t.skipped} ignorados` });
    const rate = pct(t.passed, t.total);
    out.push({ label: "Taxa de aprovação", value: `${fmtPct(rate)}%`, level: rate >= 99 ? "ok" : rate >= 90 ? "warn" : "crit", hint: goal("aprovacao") ? `meta ${goal("aprovacao")}` : null });
  }
  const cov = d.tests?.coverage;
  if (cov?.measured && cov.lines != null) {
    out.push({
      label: "Cobertura de linhas", value: `${fmtPct(cov.lines)}%`,
      level: cov.lines >= 80 ? "ok" : cov.lines >= 60 ? "warn" : "crit",
      hint: [goal("cobertura") ? `meta ${goal("cobertura")}` : null, cov.coveredLines != null ? `${nf(cov.coveredLines)} de ${nf(cov.totalLines)} linhas medidas` : null].filter(Boolean).join(" · ") || null,
    });
  }
  const s = d.azure?.summary;
  if (s && s.progressPct !== null) {
    out.push({ label: "Backlog concluído", value: `${s.progressPct}%`, level: s.progressPct >= 95 ? "ok" : s.progressPct >= 80 ? "warn" : "crit", hint: `${s.done} de ${s.considered} itens${s.scope === "folhas" ? " folha" : ""}${d.delivery?.openLeaves?.length ? ` · ${d.delivery.openLeaves.length} em aberto` : ""}` });
  }
  const inv = d.code?.inventory;
  if (inv?.codeLines) out.push({ label: "Linhas de código", value: nf(inv.codeLines), level: "neutral", hint: `${nf(inv.totalLines)} totais em ${nf(inv.codeFileCount)} arquivos` });
  if (ctx.api) out.push({ label: "Endpoints de API", value: ctx.api.total, level: "neutral", hint: ctx.api.tested ? `${ctx.api.tested} com execução de teste comprovada` : null });
  else if (d.technical.apiContracts) out.push({ label: "Operações de API", value: d.technical.apiContracts.endpointCount, level: "neutral", hint: "declaradas no contrato OpenAPI" });
  if (ctx.annexes) out.push({ label: "Documentos anexos", value: ctx.annexes.total, level: "neutral", hint: "documentação completa acompanha este arquivo" });

  return out;
}

/**
 * As falhas pela natureza da PROVIDÊNCIA — de quem depende resolver cada uma.
 *
 * Existe apenas com `test-findings.json`, que é a triagem feita por gente. Não há
 * substituto: a distribuição por tipo de teste, que o coletor sempre tem, responde
 * «onde a falha aparece», e antes ela ocupava este lugar no Sumário com outro título.
 * Duas perguntas diferentes no mesmo espaço da página se leem como a mesma — e o
 * executivo saía achando que a triagem tinha sido feita. Quem quer a distribuição por
 * tipo de teste a encontra no quadro por natureza, no domínio Testes, onde ela é o que
 * diz ser.
 */
function renderFailureBreakdown(ctx, domain) {
  const failed = ctx.d.tests?.totals?.failed || 0;
  if (!failed || !ctx.findings) return "";

  const f = ctx.findings;
  const colors = [SEMANTIC.info, SEMANTIC.warn, SEMANTIC.crit, "#7a4b8f", "#3d7a99", SEMANTIC.neutral];
  const segs = f.causes.filter((c) => c.count > 0).map((c, i) => ({
    label: c.label, sub: c.sub, value: c.count,
    color: /defeito|bug|produto/i.test(c.label) ? SEMANTIC.crit : colors[i % colors.length],
  }));
  return [
    h2(`${domain}-falhas`, "As falhas de teste, por natureza", f.total),
    ctx.ask("falhas"),
    panel({
      title: `Distribuição das ${f.total} falhas pela natureza da providência`,
      sub: "Cada faixa indica de que depende a resolução, não a gravidade do defeito.",
      body: stackBand(segs) + table(
        ["Natureza", { label: "Casos", width: "5.5rem", num: true }, { label: "Peso", width: "9rem" }, "De que depende a resolução"],
        f.causes.map((c) => [
          `<strong>${esc(c.label)}</strong>`,
          { html: String(c.count), num: true },
          c.count ? miniBar([{ pct: (c.count / f.total) * 100, color: /defeito|bug|produto/i.test(c.label) ? SEMANTIC.crit : SEMANTIC.info }]) + ` <span class="small muted">${Math.round((c.count / f.total) * 100)}%</span>` : "",
          c.dependsOn ? esc(c.dependsOn) : (c.count ? "" : "Nenhuma falha classificada nesta natureza."),
        ]),
        { compact: true, variant: "evidence" },
      ),
    }),
  ].filter(Boolean).join("\n");
}

function renderFunnel(ctx) {
  const t = ctx.ops.totals;
  if (!ctx.ops.features.codeState) return "";
  const steps = [
    { label: `Operações no escopo`, value: t.total, sub: "escopo contratado" },
    { label: "Com alguma evidência", value: t.anyEvidence, sub: "código ou teste localizado" },
    { label: "Com código confirmado", value: t.codeConfirmed, sub: "arquivo de implementação apontado" },
  ];
  if (ctx.ops.features.e2e) steps.push({ label: "Com código e teste de ponta a ponta", value: t.e2e, sub: "exercitadas no ambiente completo" });
  const svg = funnel(steps);
  if (!svg) return "";
  const last = steps[steps.length - 1];
  return [
    h2("visao-funil", "Funil de entrega"),
    ctx.ask("funil"),
    panel({
      title: "Do escopo à validação em ambiente",
      sub: "Cada etapa é um subconjunto da anterior, com critério mais exigente. O número em vermelho é quantas operações não atendem ao critério seguinte.",
      body: svg + `<div class="agenda-sum" style="margin-bottom:0">
    <div><div class="v">${last.value}</div><div class="l">Atendem ao critério mais exigente</div></div>
    <div><div class="v">${t.total - last.value}</div><div class="l">Dependem de evidência complementar ou de decisão de aplicabilidade</div></div>
  </div>`,
      footer: ctx.note("funil") || note(`A matriz operação por operação está em <a href="#negocio/negocio-aceite">Critérios de aceite × situação</a>.`),
    }),
  ].filter(Boolean).join("\n");
}

function renderFronts(ctx) {
  const fronts = ctx.ops.fronts;
  if (fronts.length < 2) return "";
  const legend = [
    { label: "Código confirmado", color: SEMANTIC.ok },
    { label: "Parcial", color: SEMANTIC.warn },
    { label: "Sem artefato localizado", color: SEMANTIC.crit },
  ];
  const chart = hbarStack(
    fronts.map((f) => ({
      label: f.name,
      sub: `${f.total} ${f.total === 1 ? "operação" : "operações"}`,
      segments: [
        { label: "código confirmado", value: f.confirmed, color: SEMANTIC.ok },
        { label: "parcial", value: f.partial, color: SEMANTIC.warn },
        { label: "sem artefato localizado", value: f.absent, color: SEMANTIC.crit },
      ],
    })),
    { legend, trailing: (r) => `${pct(fronts.find((f) => f.name === r.label).confirmed, fronts.find((f) => f.name === r.label).total)}%` },
  );

  const cols = ["Frente", { label: "Operações", num: true }, "Código", { label: "Confirmado", num: true }];
  if (ctx.ops.features.e2e) cols.push({ label: "Com E2E", num: true });
  if (ctx.ops.totals.rules) cols.push({ label: "Regras", num: true });
  if (ctx.ops.features.band) cols.push({ label: "Compl. alta", num: true });
  if (ctx.ops.features.docs) cols.push({ label: "Docs", num: true });

  const rows = fronts.map((f) => {
    const cells = [
      `<a href="#negocio/${attr(frontAnchor(f.name))}"><strong>${esc(f.name)}</strong></a>`,
      { html: String(f.total), num: true },
      miniBar([
        { pct: (f.confirmed / f.total) * 100, color: SEMANTIC.ok },
        { pct: (f.partial / f.total) * 100, color: SEMANTIC.warn },
        { pct: (f.absent / f.total) * 100, color: SEMANTIC.crit },
      ], { title: `${f.confirmed} confirmadas, ${f.partial} parciais, ${f.absent} sem artefato` }),
      { html: `${f.confirmed} <span class="muted small">(${pct(f.confirmed, f.total)}%)</span>`, num: true },
    ];
    if (ctx.ops.features.e2e) cells.push({ html: `${f.e2e} <span class="muted small">(${pct(f.e2e, f.total)}%)</span>`, num: true });
    if (ctx.ops.totals.rules) cells.push({ html: String(f.rules), num: true });
    if (ctx.ops.features.band) cells.push({ html: f.high ? String(f.high) : `<span class="muted">—</span>`, num: true });
    if (ctx.ops.features.docs) cells.push({ html: f.docs ? String(f.docs) : `<span class="muted">—</span>`, num: true });
    return cells;
  });

  return [
    h2("visao-frentes", "Entrega por frente de negócio"),
    ctx.ask("frentes"),
    chart ? panel({
      title: "Operações com código confirmado, parcial e sem artefato localizado",
      sub: "O comprimento da barra é o número de operações da frente.",
      body: chart,
    }) : "",
    table(cols, rows),
  ].filter(Boolean).join("\n");
}

function renderAttention(ctx) {
  const incomplete = ctx.ops.items.filter((o) => o.codeState !== "confirmado" || o.testState !== "confirmado");
  if (!incomplete.length) return "";
  const none = incomplete.filter((o) => o.codeState === "ausente" && o.testState === "ausente");

  const rows = incomplete.map((o) => ({
    cls: none.includes(o) ? "row-crit" : null,
    search: `${o.code} ${o.title} ${o.front || ""} ${o.note || ""}`,
    data: {
      frente: o.front || "",
      estado: none.includes(o) ? "Sem nenhuma evidência" : "Evidência parcial",
    },
    sort: { code: o.code },
    cells: [
      `<a href="#negocio/${attr(opAnchor(o))}"><span class="op-code">${esc(o.code)}</span></a>`,
      `${esc(o.title)}${o.front ? `<br><span class="muted small">${esc(o.front)}</span>` : ""}`,
      state(o.codeState || "ausente"),
      state(o.testState || "ausente"),
      ...(ctx.ops.features.band ? [pill(o.band || "—", bandKind(o.band))] : []),
      o.note ? `<span class="small">${esc(o.note)}</span>` : `<span class="muted">—</span>`,
    ],
  }));

  const cols = [
    { label: "Operação", sort: "code", width: "6.5rem" },
    { label: "O que faz", sort: "desc", width: "22%" },
    { label: "Código", sort: "codeState", width: "8rem" },
    { label: "Teste", sort: "testState", width: "8rem" },
    ...(ctx.ops.features.band ? [{ label: "Compl.", sort: "band", width: "5.5rem" }] : []),
    { label: "Observação da varredura", sort: "why" },
  ];

  return [
    h2("visao-atencao", "Operações sem evidência completa", incomplete.length),
    ctx.ask("atencao"),
    ctx.callouts("atencao"),
    grid({
      id: "grid-sem-evidencia", noun: "operação(ões)", columns: cols, rows,
      searchPlaceholder: "código, descrição…",
      filters: [
        { key: "frente", label: "Frente", options: filterOptions(rows, (r) => r.data.frente) },
        { key: "estado", label: "Estado", options: filterOptions(rows, (r) => r.data.estado) },
      ],
      variant: "evidence",
    }),
    ctx.note("atencao"),
  ].filter(Boolean).join("\n");
}

/**
 * Leitura do consultor: JSON editorial > executive-summary.md > panorama automático.
 * O panorama nunca é apresentado como análise — o texto diz que foi derivado.
 */
function renderConsultant(ctx) {
  const c = ctx.content.consultant;
  const cur = ctx.d.curated;
  const head = [h2("visao-consultor", "Leitura do consultor"), ctx.ask("consultor")];

  if (c) {
    const paras = (Array.isArray(c.paragraphs || c.paragrafos) ? (c.paragraphs || c.paragrafos) : [c.body || c.texto])
      .filter(Boolean).map((t) => `<p>${inline(String(t))}</p>`).join("");
    const folds = (c.sections || c.secoes || []).map((s, i) => fold(
      `<strong>${esc(s.title || s.titulo)}</strong>${s.hint ? ` <span class="muted small">— ${esc(s.hint)}</span>` : ""}`,
      mdToHtml(s.body || s.texto || "", { headingOffset: 4 }),
      { open: i === 0 },
    )).join("\n");
    return [...head, paras ? `<div class="card">${paras}</div>` : "", folds].filter(Boolean).join("\n");
  }

  if (cur?.present) {
    const order = ["summary", "delivered", "decisions", "risks", "blockers", "recommendations"];
    const keys = [...order.filter((k) => cur.sections[k]), ...Object.keys(cur.sections).filter((k) => !order.includes(k) && k !== "nextSteps")];
    if (keys.length) {
      const first = cur.sections[keys[0]];
      const rest = keys.slice(1).map((k) => fold(`<strong>${esc(cur.sections[k].title)}</strong>`, mdToHtml(cur.sections[k].markdown, { headingOffset: 4 }))).join("\n");
      return [...head, `<div class="card">${mdToHtml(first.markdown, { headingOffset: 4 })}</div>`, rest].filter(Boolean).join("\n");
    }
  }

  return [
    h2("visao-consultor", "Panorama automático"),
    `<div class="card">${autoNarrative(ctx)}</div>`,
    note(`Este panorama é <strong>derivado</strong> dos artefatos e da execução dos testes — não é uma análise redigida. Para a leitura do consultor, preencha <code>consultant</code> em <code>${esc(ctx.d.paths.outputs)}/status/status-report-content.json</code> ou a seção correspondente em <code>executive-summary.md</code>.`),
  ].join("\n");
}

function autoNarrative(ctx) {
  const d = ctx.d;
  const b = [];
  const biz = d.business;
  const spec = [];
  if (ctx.ops) spec.push(`${ctx.ops.totals.total} operação(ões) de negócio`);
  if (biz.modules.length) spec.push(`${biz.modules.length} módulo(s)`);
  if (biz.rules.length) spec.push(`${biz.rules.length} regra(s) de negócio`);
  if (biz.requirements.functional.length) spec.push(`${biz.requirements.functional.length} requisito(s) funcional(is)`);
  if (spec.length) b.push(`<p><strong>Especificação.</strong> O produto está documentado com ${spec.join(", ")}.</p>`);

  if (d.azure?.available && d.azure.summary?.progressPct !== null) {
    // A frase de ritmo só entra com sprint REAL medido. Antes ela lia
    // `delivery.sprintDays`, campo da era da reconstrução, e saía «por janela de
    // undefined dias» em todo projeto com backlog — o tipo de detalhe que destrói a
    // confiança no resto dos números da página.
    const ritmo = d.delivery?.hasSprints && d.delivery.velocity?.median !== null
      ? ` Ritmo mediano de ${d.delivery.velocity.median} item(ns) por sprint, sobre ${d.delivery.velocity.closedSprints} sprint(s) encerrado(s).`
      : "";
    b.push(`<p><strong>Backlog.</strong> ${d.azure.summary.done} de ${d.azure.summary.considered} itens concluídos (${d.azure.summary.progressPct}%).${ritmo}</p>`);
  }
  if (d.code?.inventory?.codeFileCount) {
    const i = d.code.inventory;
    b.push(`<p><strong>Código.</strong> ${nf(i.codeFileCount)} arquivos (${nf(i.testFileCount)} de teste), ${nf(i.codeLines)} linhas efetivas em ${nf(i.totalLines)} totais. Linguagem predominante: ${esc(i.byLanguage[0]?.language || "n/d")}.${d.code.git?.available && d.code.git.commits ? ` ${nf(d.code.git.commits)} commits de ${d.code.git.authors?.length || 0} autor(es).` : ""}</p>`);
  }
  if (d.tests?.totals?.total) {
    const t = d.tests.totals;
    b.push(`<p><strong>Testes.</strong> ${nf(t.total)} casos executados nesta geração: ${t.passed} aprovados, ${t.failed} falhando, ${t.skipped} ignorados.${d.tests.coverage?.lines != null ? ` Cobertura de linhas: ${fmtPct(d.tests.coverage.lines)}%.` : ""}</p>`);
  } else if (d.tests?.detection && !d.tests.detection.runners.length) {
    b.push(`<p><strong>Testes.</strong> Nenhum framework de teste foi detectado no repositório nesta geração.</p>`);
  }
  if (!b.length) b.push("<p>Ainda não há dado coletado suficiente para um panorama — o projeto está no início do pipeline.</p>");
  return b.join("\n");
}

function renderPhaseTable(ctx) {
  const d = ctx.d;
  const stages = [
    { key: "discovery", label: "Descoberta" },
    { key: "specification", label: "Especificação" },
    { key: "implementation", label: "Implementação" },
    { key: "delivery", label: "Entrega" },
  ];
  const rows = stages.map((s) => {
    const sig = (d.phase.signals || []).filter((x) => x.stage === s.key);
    if (!sig.length && s.key !== d.phase.stage) return null;
    return [
      `<strong>${esc(s.label)}</strong>${s.key === d.phase.stage ? `<br>${pill("etapa atual", "info")}` : ""}`,
      sig.length
        ? sig.map((x) => `${esc(x.signal)} <span class="muted small">— ${esc(x.evidence)}</span>`).join("<br>")
        : `<span class="muted">Nenhum artefato desta etapa foi localizado.</span>`,
      { html: String(sig.length), num: true },
    ];
  }).filter(Boolean);
  return table([{ label: "Etapa", width: "12rem" }, "Artefato encontrado", { label: "Sinais", width: "5rem", num: true }], rows, { compact: true, variant: "evidence" });
}

function renderLimitations(ctx) {
  const w = ctx.d.warnings || [];
  const missing = (ctx.x.inventory?.missing || []);
  const errs = ctx.renderErrors;
  if (!w.length && !missing.length && !errs.length) return "";

  const parts = [h2("visao-limitacoes", "Limitações desta geração", w.length || null)];
  if (w.length) {
    parts.push(`<div class="gen-warn"><b>${w.length} aviso(s) de coleta.</b> O que não pôde ser coletado está listado abaixo — o relatório declara as suas lacunas em vez de omiti-las.</div>`);
    parts.push(table(["Código", "Descrição"], w.map((x) => [`<code>${esc(x.code)}</code>`, esc(x.message)]), { compact: true, variant: "evidence" }));
  }
  if (missing.length) {
    parts.push(`<p class="small muted"><strong>Artefatos de extensão ausentes:</strong> ${missing.map((m) => `<code>${esc(m)}</code>`).join(", ")}. As seções que dependeriam deles não foram renderizadas — nenhum número foi estimado no lugar.</p>`);
  }
  if (errs.length) {
    parts.push(callout("Seções que não puderam ser montadas", `<ul>${errs.map((e) => `<li><code>${esc(e.domain)}</code> — ${esc(e.message)}</li>`).join("")}</ul>`, "crit"));
  }
  return parts.join("\n");
}

/* ═════════════════════════════ re-export ═════════════════════════════
   O cli.mjs e a suíte de regressão importam os formatadores daqui desde a v1;
   manter o re-export evita quebrar quem já chama. */

export { fmtDate, fmtDateTime, fmtDuration } from "./render-shared.mjs";
