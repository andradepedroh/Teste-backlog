// render-estimate-html.mjs — renderiza o relatório HTML premium da spec-estimate (Fase 8.5)
// a partir de um objeto de dados (estimate-data.json). O agente NÃO escreve HTML manualmente:
// popula o JSON e este módulo produz sempre o mesmo layout aprovado (resumo curto + conteúdo
// completo + explicação de cada cálculo, com gráficos Chart.js e grafo Mermaid).
//
// Design data-driven: gráficos e tabelas leem window.__ED__ (injetado); os blocos narrativos
// são renderizados no servidor a partir de strings do JSON. Campos ausentes degradam com "—".

import { esc, escAttr, num, bandPill, bandColor, bandEmoji } from "./escape.mjs";

const g = (obj, path, dflt) => {
  const v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  return v === undefined || v === null ? dflt : v;
};
const arr = (v) => (Array.isArray(v) ? v : []);

// ---------------------------------------------------------------- CSS (tema Enterprise)
const CSS = `
  :root{
    --ink:#0e2036; --ink-2:#334a63; --muted:#6b7f95; --line:#e4eaf1; --line-2:#d3dde8;
    --bg:#eef2f7; --card:#ffffff; --card-2:#f7fafd;
    --blue:#1f6feb; --blue-dk:#0b4bc0; --blue-bg:#e9f1fe;
    --green:#12885a; --green-bg:#e2f5ec; --amber:#c07d0a; --amber-bg:#fcf2dc;
    --orange:#d1590f; --orange-bg:#fdeadd; --red:#c62b32; --red-bg:#fbe4e4;
    --shadow:0 1px 2px rgba(16,40,64,.04),0 6px 22px rgba(16,40,64,.06);
    --serif:"Iowan Old Style","Palatino Linotype",Georgia,serif;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
    font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
  a{color:var(--blue-dk);text-decoration:none}
  .layout{display:flex;max-width:1280px;margin:0 auto;gap:0}
  nav.side{position:sticky;top:0;align-self:flex-start;height:100vh;width:258px;flex:0 0 258px;
    padding:26px 18px;overflow-y:auto;background:#0e2036;color:#c9d6e5}
  nav.side .brand{font-weight:600;font-size:15px;color:#fff;letter-spacing:.2px;margin-bottom:2px}
  nav.side .sub{font-size:12px;color:#7f97b0;margin-bottom:22px}
  nav.side a{display:block;color:#aebfd2;font-size:13.5px;padding:7px 11px;border-radius:7px;margin:1px 0;
    border-left:2px solid transparent}
  nav.side a:hover{background:rgba(255,255,255,.06);color:#fff}
  nav.side a.grp{margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:#6f89a4;
    pointer-events:none;padding-bottom:2px}
  main{flex:1 1 auto;min-width:0;padding:0 clamp(20px,4vw,60px) 90px}
  header.hero{padding:56px 0 34px;border-bottom:1px solid var(--line)}
  .eyebrow{font-size:12.5px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--blue-dk)}
  header.hero h1{font-family:var(--serif);font-weight:600;font-size:40px;line-height:1.12;margin:.35em 0 .2em}
  header.hero .lead{font-size:18px;color:var(--ink-2);max-width:62ch;margin:0}
  .meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
  .chip{font-size:12.5px;padding:5px 12px;border-radius:999px;background:var(--card);border:1px solid var(--line-2);
    color:var(--ink-2);box-shadow:var(--shadow)}
  .chip b{color:var(--ink);font-weight:600}
  section{padding:40px 0;border-bottom:1px solid var(--line)}
  h2{font-family:var(--serif);font-size:27px;font-weight:600;margin:0 0 6px;scroll-margin-top:20px}
  h2 .num{color:var(--blue);font-size:16px;font-weight:600;font-family:var(--sans);
    vertical-align:middle;margin-right:10px;background:var(--blue-bg);padding:3px 10px;border-radius:7px}
  h3{font-size:18px;font-weight:600;margin:30px 0 10px;color:var(--ink)}
  .section-intro{font-size:16.5px;color:var(--ink-2);max-width:74ch}
  p{margin:.6em 0}
  .grid{display:grid;gap:16px}
  .g4{grid-template-columns:repeat(4,1fr)}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g2{grid-template-columns:repeat(2,1fr)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;box-shadow:var(--shadow)}
  .kpi .lab{font-size:12.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .kpi .val{font-family:var(--serif);font-size:30px;font-weight:600;line-height:1.1;margin:8px 0 3px}
  .kpi .note{font-size:13.5px;color:var(--ink-2)}
  .badges{display:flex;flex-wrap:wrap;gap:14px;margin:24px 0 4px}
  .badge{flex:1 1 260px;border-radius:14px;padding:18px 20px;border:1px solid;box-shadow:var(--shadow)}
  .badge .t{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;opacity:.9}
  .badge .n{font-family:var(--serif);font-size:34px;font-weight:600;line-height:1;margin:6px 0}
  .badge .d{font-size:13.5px;line-height:1.5}
  .b-orange{background:var(--orange-bg);border-color:#f2c7a6;color:#8a3d0a}
  .b-red{background:var(--red-bg);border-color:#f0bcbc;color:#8f1f24}
  .b-blue{background:var(--blue-bg);border-color:#bcd6fb;color:var(--blue-dk)}
  .b-green{background:var(--green-bg);border-color:#b4e3cb;color:#0b6a45}
  .calc{background:linear-gradient(180deg,#f3f8ff,#eef4fe);border:1px solid #cfe0fb;border-left:4px solid var(--blue);
    border-radius:12px;padding:16px 20px;margin:20px 0}
  .calc .h{font-weight:600;font-size:14px;color:var(--blue-dk);display:flex;align-items:center;gap:8px;margin-bottom:4px}
  .calc code, code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;
    background:#eef2f7;padding:1px 6px;border-radius:5px;color:#243b53}
  .calc pre{background:#0e2036;color:#dbe7f5;border-radius:9px;padding:14px 16px;overflow-x:auto;
    font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;margin:10px 0 2px;white-space:pre-wrap}
  .note-box{background:var(--card-2);border:1px solid var(--line);border-left:4px solid var(--amber);
    border-radius:10px;padding:14px 18px;margin:18px 0;font-size:14.5px;color:var(--ink-2)}
  .tw{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
  table{border-collapse:collapse;width:100%;font-size:14px;background:var(--card)}
  th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
  th{background:#f2f6fb;font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-2)}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:hover{background:#f8fbff}
  td.c,th.c{text-align:center}
  .pill{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;white-space:nowrap}
  .p-green{background:var(--green-bg);color:#0b6a45}
  .p-amber{background:var(--amber-bg);color:#8a5d06}
  .p-orange{background:var(--orange-bg);color:#8a3d0a}
  .p-red{background:var(--red-bg);color:#8f1f24}
  .mono{font-family:ui-monospace,Menlo,monospace;font-size:13px}
  .chart-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px 12px;
    box-shadow:var(--shadow);margin:16px 0}
  .chart-card h4{margin:0 0 12px;font-size:15px;font-weight:600;color:var(--ink)}
  .chart-box{position:relative;height:300px}
  .mermaid{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;
    box-shadow:var(--shadow);margin:16px 0;text-align:center}
  ol.action{counter-reset:a;list-style:none;padding:0;margin:14px 0}
  ol.action li{position:relative;padding:14px 16px 14px 54px;background:var(--card);border:1px solid var(--line);
    border-radius:12px;margin-bottom:10px;box-shadow:var(--shadow)}
  ol.action li::before{counter-increment:a;content:counter(a);position:absolute;left:16px;top:14px;
    width:26px;height:26px;border-radius:50%;background:var(--blue);color:#fff;font-weight:600;font-size:13px;
    display:flex;align-items:center;justify-content:center}
  ol.action b{color:var(--ink)}
  .foot{padding:30px 0 0;color:var(--muted);font-size:13px}
  .rec{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0;box-shadow:var(--shadow)}
  .rec .rh{font-weight:600;color:var(--ink);margin-bottom:4px}
  .rec .rt{font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}
  .rec .rt span b{color:var(--ink-2)}
  .tag{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--blue-bg);color:var(--blue-dk)}
  @media(max-width:960px){nav.side{display:none}main{padding:0 20px 70px}header.hero h1{font-size:31px}
    .g4,.g3,.g2{grid-template-columns:1fr 1fr}}
  @media(max-width:560px){.g4,.g3,.g2{grid-template-columns:1fr}}
  @media print{nav.side{display:none}body{background:#fff}.chart-box{height:260px}}
`;

// ---------------------------------------------------------------- helpers de bloco
function chips(cal) {
  const items = [
    ["Modo", g(cal, "mode", "—")],
    ["Base", g(cal, "throughput", "—")],
    ["Custo eng.", g(cal, "engMonthlyCost", "—")],
    ["Apetite", g(cal, "riskAppetite", "—")],
    ["HDF", g(cal, "hdf", "—")],
    ["Início assumido", g(cal, "startDate", "—")],
    ["Monte Carlo", (g(cal, "mcIterations", "10.000")) + " iterações"],
  ];
  return items.map(([k, v]) => `<span class="chip"><b>${esc(k)}:</b> ${esc(v)}</span>`).join("");
}

function kpi(lab, val, note, color) {
  const c = color ? ` style="color:${color}"` : "";
  return `<div class="card kpi"><div class="lab">${esc(lab)}</div><div class="val"${c}>${esc(val)}</div><div class="note">${note || ""}</div></div>`;
}

function calcBox(title, body) {
  return `<div class="calc"><div class="h">🧮 ${esc(title)}</div>${body}</div>`;
}

function taskRows(tasks) {
  return arr(tasks).map((t) => {
    const band = t.band || "";
    return `<tr><td class="mono">${esc(t.id)}</td><td>${esc(t.module)}</td><td>${esc(t.type || "")}</td>`
      + `<td class="c mono">${num(t.cu)}</td><td class="c"><span class="pill ${bandPill(band)}">${esc(band)}</span></td>`
      + `<td class="c">${num(t.durH)} d</td><td class="c">${num(t.durIA)} d</td></tr>`;
  }).join("");
}

// ---------------------------------------------------------------- seções
function heroSection(d) {
  return `<header class="hero">
  <div class="eyebrow">${esc(g(d, "eyebrow", "Estimativa preditiva & engenharia de delivery"))}</div>
  <h1>${esc(g(d, "title", "Quanto tempo, quanto custa e qual a confiança de entrega"))}</h1>
  <p class="lead">${esc(g(d, "lead", ""))}</p>
  <div class="meta-row">${chips(g(d, "calibration", {}))}</div>
</header>`;
}

function resumoSection(d) {
  const v = g(d, "verdict", {});
  const h = g(v, "human", {}), ia = g(v, "ia", {});
  const es = g(d, "executiveSummary", {});
  const risks = arr(es.risks).map((r) =>
    `<div class="card"><b>${esc(r.title)}</b><p style="font-size:14.5px;color:var(--ink-2);margin:.4em 0 0">${esc(r.text)}</p></div>`).join("");
  const actions = arr(es.actions).map((a) =>
    `<li>${a.tag ? `${esc(a.text)} <span class="tag">${esc(a.tag)}</span>` : esc(a.text || a)}</li>`).join("");
  return `<section id="resumo">
  <h2><span class="num">Resumo</span>O essencial em 2 minutos</h2>
  <p class="section-intro">${esc(g(es, "intro", ""))}</p>
  <div class="badges">
    <div class="badge b-blue"><div class="t">Prazo — time humano (P85)</div><div class="n">${esc(g(h, "p85Date", "—"))}</div>
      <div class="d">${esc(g(h, "note", ""))}</div></div>
    <div class="badge b-green"><div class="t">Prazo — IA-assistida (P85)</div><div class="n">${esc(g(ia, "p85Date", "—"))}</div>
      <div class="d">${esc(g(ia, "note", ""))}</div></div>
  </div>
  <div class="grid g4" style="margin-top:16px">
    ${kpi("Custo humano (P50–P85)", g(h, "costRange", "—"), "≈ " + g(h, "effort", "") + " de esforço")}
    ${kpi("Custo IA (P50–P85)", g(ia, "costRange", "—"), esc(g(ia, "costNote", "")))}
    ${kpi("Confiança — humano", "DCI " + g(h, "dci", "—"), `<span class="pill ${bandPill(g(h,"dciBand"))}">${esc(g(h,"dciLabel",""))}</span>`, bandColor(g(h, "dciBand")))}
    ${kpi("Confiança — IA", "DCI " + g(ia, "dci", "—"), `<span class="pill ${bandPill(g(ia,"dciBand"))}">${esc(g(ia,"dciLabel",""))}</span>`, bandColor(g(ia, "dciBand")))}
  </div>
  <h3>Os três maiores riscos, em linguagem de negócio</h3>
  <div class="grid g3">${risks}</div>
  ${es.recommendationNote ? `<div class="note-box">${es.recommendationNote}</div>` : ""}
  <h3>O que fazer esta semana</h3>
  <ol class="action">${actions}</ol>
</section>`;
}

function complexitySection(d) {
  const c = g(d, "complexity", {});
  const sc = g(c, "scores", {});
  const scoreCard = (lab, o) => kpi(lab, `${g(o, "value", "—")}/100`, `<span class="pill ${bandPill(g(o,"band"))}">${esc(g(o,"label",""))}</span> ${esc(g(o,"note",""))}`, bandColor(g(o, "band")));
  const topRows = arr(c.topTasks).map((t) =>
    `<tr><td>${esc(t.id)} · ${esc(t.title)}</td><td>${esc(t.module)}</td><td class="c mono">${num(t.cu)}</td>`
    + `<td class="c"><span class="pill ${bandPill(t.band)}">${esc(t.band)}</span></td><td class="c">${num(t.durH)} d</td><td class="c">${num(t.durIA)} d</td></tr>`).join("");
  return `<section id="complexidade">
  <h2><span class="num">1</span>Análise de complexidade</h2>
  <p class="section-intro">${esc(g(c, "intro", ""))}</p>
  <div class="grid g3" style="margin:18px 0">
    ${scoreCard("Complexidade geral", g(sc, "complexity", {}))}
    ${scoreCard("Amplitude arquitetural", g(sc, "arch", {}))}
    ${scoreCard("Risco técnico", g(sc, "techRisk", {}))}
  </div>
  <div class="grid g2">
    <div class="chart-card"><h4>Onde está a complexidade (CU por módulo)</h4><div class="chart-box"><canvas id="chModule"></canvas></div></div>
    <div class="chart-card"><h4>Bandas das tarefas funcionais</h4><div class="chart-box"><canvas id="chBands"></canvas></div></div>
  </div>
  ${calcBox("Como calculamos a complexidade", g(c, "howComplexity", "") )}
  <h3>Como o esforço e o custo humano foram derivados</h3>
  ${calcBox("Do backlog ao custo, em duas camadas de realismo", g(c, "howEffort", ""))}
  <h3>As tarefas mais complexas</h3>
  <div class="tw"><table>
    <thead><tr><th>Tarefa</th><th>Módulo</th><th class="c">CU</th><th class="c">Banda</th><th class="c">Dur. humana</th><th class="c">Dur. IA</th></tr></thead>
    <tbody>${topRows}</tbody>
  </table></div>
</section>`;
}

function dependencySection(d) {
  const dep = g(d, "dependency", {});
  const m = g(dep, "metrics", {});
  const bnRows = arr(dep.bottlenecks).map((b) =>
    `<tr><td><b>${esc(b.id)}</b><br>${esc(b.title)}</td><td class="c"><span class="pill ${bandPill(b.band)}">${num(b.score)}</span></td>`
    + `<td>${esc(b.why)}</td><td>${esc(b.action)}</td></tr>`).join("");
  const cp = g(dep, "coupling", {});
  const cpRows = arr(cp.pairs).map((p) =>
    `<tr><td>${esc(p.pair)}</td><td class="c"><span class="pill ${bandPill(p.band)}">${num(p.value)}</span></td><td>${p.nature || ""}</td></tr>`).join("");
  return `<section id="dependencias">
  <h2><span class="num">2</span>Dependências e paralelização</h2>
  <p class="section-intro">${esc(g(dep, "intro", ""))}</p>
  <div class="grid g4" style="margin:18px 0">
    ${kpi("Caminho crítico (humano)", g(m, "criticalPathH", "—"), "IA: " + g(m, "criticalPathIA", "—"))}
    ${kpi("Índice de paralelização", g(m, "pi", "—"), `<span class="pill ${bandPill(g(m,"piBand"))}">${esc(g(m,"piLabel",""))}</span>`, bandColor(g(m, "piBand")))}
    ${kpi("Ganho máx. (Amdahl)", g(m, "amdahl", "—"), "limite teórico")}
    ${kpi("Streams paralelas", g(m, "streams", "—"), "uma por módulo")}
  </div>
  <h3>Grafo de dependências (visão macro)</h3>
  <div class="mermaid">${g(dep, "mermaid", "")}</div>
  ${calcBox("Como achamos o caminho crítico e os gargalos", g(dep, "howCritical", ""))}
  <h3>Gargalos (top-5)</h3>
  <div class="tw"><table>
    <thead><tr><th>Tarefa</th><th class="c">Score</th><th>Por que é gargalo</th><th>Ação sugerida</th></tr></thead>
    <tbody>${bnRows}</tbody>
  </table></div>
  <h3>Acoplamento entre módulos — ${esc(g(cp, "summary", ""))}</h3>
  <div class="tw"><table>
    <thead><tr><th>Par de módulos</th><th class="c">Acoplamento</th><th>Natureza</th></tr></thead>
    <tbody>${cpRows}</tbody>
  </table></div>
</section>`;
}

function teamSection(d) {
  const t = g(d, "team", {});
  const squads = arr(t.squads).map((s) =>
    `<div class="rec"><div class="rh">${esc(s.name)} <span class="tag">${esc(s.type)} · ${esc(s.size)}</span></div>`
    + `<div style="font-size:14px;color:var(--ink-2)">${esc(s.modules)}</div>`
    + `<div class="rt"><span>Carga cognitiva: <span class="pill ${bandPill(s.clBand)}">${num(s.cl)} ${bandEmoji(s.clBand)}</span></span></div></div>`).join("");
  const gapRows = arr(t.specGaps).map((gp) =>
    `<tr><td>${esc(gp.skill)}</td><td class="c"><span class="pill ${bandPill(gp.coverageBand)}">${esc(gp.coverage)}</span></td><td>${esc(gp.impact)}</td><td>${esc(gp.rec)}</td></tr>`).join("");
  return `<section id="equipe">
  <h2><span class="num">3</span>Otimização de equipe</h2>
  <p class="section-intro">${esc(g(t, "intro", ""))}</p>
  <div class="grid g2">
    <div class="chart-card"><h4>Curva de Brooks — prazo × tamanho do time</h4><div class="chart-box"><canvas id="chBrooks"></canvas></div></div>
    <div>
      <h3 style="margin-top:6px">Topologia recomendada</h3>
      ${squads}
      ${t.note ? `<div class="note-box" style="margin-top:12px">${t.note}</div>` : ""}
    </div>
  </div>
  ${calcBox("Como achamos o tamanho ótimo", g(t, "howTeam", ""))}
  <h3>Lacunas de especialização</h3>
  <div class="tw"><table>
    <thead><tr><th>Competência</th><th class="c">Cobertura</th><th>Impacto</th><th>Recomendação</th></tr></thead>
    <tbody>${gapRows}</tbody>
  </table></div>
</section>`;
}

function forecastSection(d) {
  const f = g(d, "forecast", {});
  const scRows = arr(f.scenarios).map((s) => {
    const hl = s.highlight ? ` style="background:${s.highlight === "p85" ? "#eaf3ff" : "#f0f6ff"}"` : "";
    const b = s.highlight ? "b" : "span";
    return `<tr${hl}><td>${s.highlight ? `<b>${esc(s.pct)}</b>` : esc(s.pct)}</td><td class="c"><${b}>${esc(s.humanDays)}</${b}></td><td class="c"><${b}>${esc(s.humanDate)}</${b}></td>`
      + `<td class="c"><${b}>${esc(s.iaDays)}</${b}></td><td class="c"><${b}>${esc(s.iaDate)}</${b}></td></tr>`;
  }).join("");
  const dciRows = arr(f.dciComponents).map((c) =>
    `<tr><td>${esc(c.name)}</td><td class="c">${num(c.weight)}</td><td class="c mono">${num(c.value)}</td></tr>`).join("");
  return `<section id="forecast">
  <h2><span class="num">4</span>Forecast &amp; confiança de entrega</h2>
  <p class="section-intro">${esc(g(f, "intro", ""))}</p>
  <div class="grid g2">
    <div class="chart-card"><h4>Faixa de prazo (dias úteis) — humano × IA</h4><div class="chart-box"><canvas id="chForecast"></canvas></div></div>
    <div class="chart-card"><h4>Humano × IA — prazo e custo (P85)</h4><div class="chart-box"><canvas id="chCompare"></canvas></div></div>
  </div>
  <h3>Cenários de prazo</h3>
  <div class="tw"><table>
    <thead><tr><th>Percentil</th><th class="c">Humano</th><th class="c">Data humana</th><th class="c">IA</th><th class="c">Data IA</th></tr></thead>
    <tbody>${scRows}</tbody>
  </table></div>
  ${f.hybridNote ? `<div class="note-box">${f.hybridNote}</div>` : ""}
  ${calcBox("Como o custo IA foi calculado", g(f, "howIaCost", ""))}
  <h3>De onde vem a confiança (DCI) — cenário humano</h3>
  <div class="grid g2">
    <div class="chart-card"><h4>Componentes do DCI (contribuição)</h4><div class="chart-box"><canvas id="chDci"></canvas></div></div>
    <div>
      <div class="tw" style="margin-top:6px"><table>
        <thead><tr><th>Componente</th><th class="c">Peso</th><th class="c">Valor</th></tr></thead>
        <tbody>${dciRows}</tbody>
      </table></div>
      ${f.dciNote ? `<div class="note-box" style="margin-top:12px">${f.dciNote}</div>` : ""}
    </div>
  </div>
</section>`;
}

function recommendationsSection(d) {
  const recs = arr(g(d, "recommendations", [])).map((r) =>
    `<div class="rec"><div class="rh">${esc(r.title)} <span class="tag">Esforço ${esc(r.effort)}</span></div>${esc(r.what)}`
    + `<div class="rt"><span><b>Por quê:</b> ${esc(r.why)}</span><span><b>Quem:</b> ${esc(r.who)}</span><span><b>Quando:</b> ${esc(r.when)}</span></div></div>`).join("");
  return `<section id="recomendacoes">
  <h2><span class="num">5</span>Plano de ação priorizado</h2>
  <p class="section-intro">Cada recomendação com o que fazer, por que importa, quem faz e o esforço (S &lt; 1 dia · M 2–5 dias · L &gt; 1 semana).</p>
  ${recs}
</section>`;
}

function risksSection(d) {
  const r = g(d, "risks", {});
  const rows = arr(r.register).map((x) =>
    `<tr><td><span class="pill ${bandPill(x.catBand)}">${esc(x.cat)}</span> ${esc(x.desc)}</td><td class="c">${num(x.prob)}</td><td class="c">${esc(x.impact)}</td><td class="c"><b>${esc(x.expected)}</b></td></tr>`).join("");
  return `<section id="riscos">
  <h2><span class="num">6</span>Riscos e avisos</h2>
  <p class="section-intro">${esc(g(r, "intro", ""))}</p>
  <div class="tw"><table>
    <thead><tr><th>Risco</th><th class="c">Prob.</th><th class="c">Impacto</th><th class="c">Esperado</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  ${r.note ? `<div class="note-box">${r.note}</div>` : ""}
</section>`;
}

function methodSection(d) {
  const m = g(d, "method", {});
  const traceRows = arr(m.traceability).map((t) =>
    `<tr><td>${esc(t.metric)}</td><td>${t.source || ""}</td></tr>`).join("");
  return `<section id="metodo">
  <h2><span class="num">7</span>Como calculamos — visão geral do método</h2>
  <p class="section-intro">Toda métrica deriva de evidências rastreáveis dos artefatos de especificação — nenhum número foi arbitrado. O motor tem quatro camadas encadeadas:</p>
  <div class="grid g2">
    <div class="card"><b>Layer 1 · Complexidade &amp; Esforço</b><p style="font-size:14px;color:var(--ink-2);margin:.4em 0 0">COCOMO II adaptado com Complexity Units derivadas de cenários, entidades, APIs, integrações, eventos e regras. Seis multiplicadores de esforço ajustam para as condições reais.</p></div>
    <div class="card"><b>Layer 2 · Dependências &amp; Paralelização</b><p style="font-size:14px;color:var(--ink-2);margin:.4em 0 0">Grafo dirigido acíclico + Critical Path Method + lei de Amdahl para o limite de paralelização e detecção de gargalos e acoplamento.</p></div>
    <div class="card"><b>Layer 3 · Otimização de Equipe</b><p style="font-size:14px;color:var(--ink-2);margin:.4em 0 0">Lei de Brooks (tamanho ótimo), Team Topologies (composição de squads), Carga Cognitiva e Conway (alinhamento org × arquitetura).</p></div>
    <div class="card"><b>Layer 4 · Forecast &amp; Confiança</b><p style="font-size:14px;color:var(--ink-2);margin:.4em 0 0">Monte Carlo (10.000 iterações) com curva de Tuckman, registro de riscos, Schedule Risk Index e o Índice de Confiança de Entrega (DCI).</p></div>
  </div>
  <h3>Fórmulas-chave</h3>
  <div class="calc"><pre>${esc(g(m, "formulas", ""))}</pre></div>
  <h3>Rastreabilidade</h3>
  <div class="tw"><table>
    <thead><tr><th>Métrica</th><th>Fonte primária</th></tr></thead>
    <tbody>${traceRows}</tbody>
  </table></div>
</section>`;
}

function tableSection(d) {
  return `<section id="tabela">
  <h2><span class="num">8</span>Todas as tarefas funcionais</h2>
  <p class="section-intro">${esc(g(d, "allTasksIntro", "Base completa de complexidade."))}</p>
  <div class="tw"><table>
    <thead><tr><th>Tarefa</th><th>Módulo</th><th>Tipo</th><th class="c">CU</th><th class="c">Banda</th><th class="c">Dur. humana</th><th class="c">Dur. IA</th></tr></thead>
    <tbody>${taskRows(g(d, "allTasks", []))}</tbody>
  </table></div>
  <div class="foot"><p>${g(d, "footer", "")}</p></div>
</section>`;
}

function navSide(d) {
  return `<nav class="side">
  <div class="brand">${esc(g(d, "navBrand", g(d, "project", "Projeto")))}</div>
  <div class="sub">Estimativa de Delivery — Fase 8.5</div>
  <a href="#resumo">Resumo executivo</a>
  <a class="grp">Diagnóstico</a>
  <a href="#complexidade">1 · Complexidade</a>
  <a href="#dependencias">2 · Dependências</a>
  <a href="#equipe">3 · Equipe</a>
  <a href="#forecast">4 · Forecast &amp; confiança</a>
  <a class="grp">Ação</a>
  <a href="#recomendacoes">5 · Plano de ação</a>
  <a href="#riscos">6 · Riscos &amp; avisos</a>
  <a class="grp">Apêndice</a>
  <a href="#metodo">7 · Como calculamos</a>
  <a href="#tabela">8 · Todas as tarefas</a>
</nav>`;
}

// ---------------------------------------------------------------- script de gráficos
function chartsScript(d) {
  const charts = {
    module: g(d, "complexity.byModule", []).map((m) => ({ label: `${m.module} ${m.pct || ""}`, cu: m.cu })),
    bands: g(d, "complexity.bandsChart", null) || (() => {
      const b = g(d, "complexity.bands", {});
      return { S: b.S || 0, M: b.M || 0, L: b.L || 0, XL: b.XL || 0 };
    })(),
    brooks: g(d, "team.brooksCurve", []),
    forecast: g(d, "forecast.scenarios", []),
    compare: g(d, "forecast.compare", {}),
    dci: g(d, "forecast.dciChart", []),
  };
  const json = JSON.stringify(charts).replace(/</g, "\\u003c");
  return `<script>
window.__ED__ = ${json};
(function(){
  if(typeof Chart==="undefined"){return;}
  var D=window.__ED__;
  var INK="#0e2036",MUT="#6b7f95",LINE="#e4eaf1",BLUE="#1f6feb",GREEN="#12885a",AMBER="#c07d0a",ORANGE="#d1590f",RED="#c62b32";
  Chart.defaults.font.family="-apple-system,Segoe UI,Roboto,sans-serif";Chart.defaults.font.size=12.5;Chart.defaults.color=MUT;
  var mono=["#1f6feb","#3f86f4","#63a0f7","#8bbaf9","#b5d3fb","#dbe9fd","#c7dcfb"];
  function el(id){return document.getElementById(id);}
  if(el("chModule")&&D.module&&D.module.length){new Chart(el("chModule"),{type:"doughnut",
    data:{labels:D.module.map(function(m){return m.label;}),datasets:[{data:D.module.map(function(m){return m.cu;}),backgroundColor:mono,borderColor:"#fff",borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"58%",plugins:{legend:{position:"right",labels:{boxWidth:12,padding:10}}}}});}
  if(el("chBands")&&D.bands){new Chart(el("chBands"),{type:"bar",
    data:{labels:["S (trivial)","M (padrão)","L (alta)","XL (crítica)"],datasets:[{data:[D.bands.S,D.bands.M,D.bands.L,D.bands.XL],backgroundColor:[GREEN,AMBER,ORANGE,RED],borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:LINE}},x:{grid:{display:false}}}}});}
  if(el("chBrooks")&&D.brooks&&D.brooks.length){new Chart(el("chBrooks"),{type:"line",
    data:{labels:D.brooks.map(function(x){return String(x.n);}),datasets:[
      {label:"Prazo real (dias)",data:D.brooks.map(function(x){return x.days;}),borderColor:BLUE,backgroundColor:"rgba(31,111,235,.08)",fill:true,tension:.35,yAxisID:"y",pointRadius:4,pointBackgroundColor:BLUE},
      {label:"Overhead comunicação (%)",data:D.brooks.map(function(x){return x.overhead;}),borderColor:ORANGE,tension:.35,yAxisID:"y1",pointRadius:3,borderDash:[5,4]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top",labels:{boxWidth:12}},tooltip:{callbacks:{title:function(i){return i[0].label+" pessoas";}}}},
    scales:{y:{title:{display:true,text:"dias"},grid:{color:LINE}},y1:{position:"right",title:{display:true,text:"%"},grid:{display:false}},x:{title:{display:true,text:"tamanho do time"},grid:{display:false}}}}});}
  if(el("chForecast")&&D.forecast&&D.forecast.length){
    var f=D.forecast; function val(s,k){return typeof s[k]==="number"?s[k]:parseFloat(String(s[k]).replace(",","."));}
    var hd=f.map(function(s){return val(s,"humanDays");}),id=f.map(function(s){return val(s,"iaDays");});
    new Chart(el("chForecast"),{type:"bar",data:{labels:["Humano","IA-assistida"],datasets:[
      {label:"P15→P50",data:[[hd[0],hd[1]],[id[0],id[1]]],backgroundColor:"#bcd6fb",borderRadius:4,stack:"s"},
      {label:"P50→P85",data:[[hd[1],hd[2]],[id[1],id[2]]],backgroundColor:BLUE,borderRadius:4,stack:"s"},
      {label:"P85→P95",data:[[hd[2],hd[3]],[id[2],id[3]]],backgroundColor:"#0b4bc0",borderRadius:4,stack:"s"}]},
      options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top",labels:{boxWidth:12}},
        tooltip:{callbacks:{label:function(c){return c.dataset.label+": "+c.raw[0]+"–"+c.raw[1]+" dias";}}}},
        scales:{x:{title:{display:true,text:"dias úteis"},grid:{color:LINE},min:0},y:{stacked:true,grid:{display:false}}}}});}
  if(el("chCompare")&&D.compare&&D.compare.labels){new Chart(el("chCompare"),{type:"bar",
    data:{labels:D.compare.labels,datasets:[
      {label:"Humano",data:D.compare.human,backgroundColor:BLUE,borderRadius:6},
      {label:"IA-assistida",data:D.compare.ia,backgroundColor:GREEN,borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top",labels:{boxWidth:12}}},scales:{y:{beginAtZero:true,grid:{color:LINE}},x:{grid:{display:false}}}}});}
  if(el("chDci")&&D.dci&&D.dci.length){new Chart(el("chDci"),{type:"bar",
    data:{labels:D.dci.map(function(x){return x.name;}),datasets:[{data:D.dci.map(function(x){return x.contribution;}),
      backgroundColor:["#1f6feb","#c62b32","#12885a","#3f86f4","#d1590f","#c07d0a"],borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return "Contribuição: "+c.raw+" pts (de 100)";}}}},
    scales:{y:{title:{display:true,text:"pontos no DCI"},grid:{color:LINE}},x:{grid:{display:false}}}}});}
})();
if(typeof mermaid!=="undefined"){mermaid.initialize({startOnLoad:true,theme:"base",themeVariables:{fontSize:"13px",fontFamily:"-apple-system,Segoe UI,sans-serif",primaryColor:"#eef4fe",primaryBorderColor:"#bcd6fb",primaryTextColor:"#0e2036",lineColor:"#8aa4c0"}});}
</script>`;
}

// ---------------------------------------------------------------- entrada principal
export function renderEstimateHtml(data) {
  const d = data || {};
  const title = `${g(d, "project", "Projeto")} — Estimativa de Delivery`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"></script>
<style>${CSS}</style>
</head>
<body>
<div class="layout">
${navSide(d)}
<main>
${heroSection(d)}
${resumoSection(d)}
${complexitySection(d)}
${dependencySection(d)}
${teamSection(d)}
${forecastSection(d)}
${recommendationsSection(d)}
${risksSection(d)}
${methodSection(d)}
${tableSection(d)}
</main>
</div>
${chartsScript(d)}
</body>
</html>`;
}

export default renderEstimateHtml;
