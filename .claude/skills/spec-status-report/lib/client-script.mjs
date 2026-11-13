// client-script.mjs — o JavaScript embutido no relatório.
//
// Três blocos independentes, na ordem em que precisam existir:
//   1. repoLinks    — reescreve os links de arquivo:linha a partir de UM objeto de
//                     configuração, para repontar o relatório inteiro sem reeditar HTML;
//   2. shell        — roteamento por hash, realce da seção corrente, breadcrumb, dobras,
//                     grids genéricos e o preparo do dossiê para PDF;
//   3. seriesChart  — o único gráfico interativo (séries ligáveis com eixo que reescala).
//
// Tudo em ES5 e sem dependência externa: o arquivo é aberto de pendrive, de anexo de
// e-mail e de visualizadores corporativos antigos. Uma arrow function a mais aqui
// significa uma tela em branco na máquina do cliente.

/**
 * Bloco 1 — links para o repositório.
 * Sem configuração de repositório o bloco inteiro é omitido, e os `a.src` do documento
 * permanecem inertes (o renderer já os emite como `<span class="src-plain">` nesse caso).
 */
export function repoLinkScript(repo) {
  if (!repo || !repo.org || !repo.project) return "";
  const cfg = JSON.stringify({
    org: repo.org,
    project: repo.project,
    branch: repo.branch || "main",
    base: repo.base || "https://dev.azure.com",
    provider: repo.provider || "azure",
  });
  return `/* ─── ÚNICO PONTO DE CONFIGURAÇÃO DOS LINKS DE CÓDIGO ───
   Edite este objeto para repontar todos os links de arquivo:linha do relatório
   (outra organização, outro projeto, outro branch). O script abaixo reescreve
   os hrefs de todos os elementos com data-repo/data-path. */
window.REPORT_REPO = ${cfg};
(function () {
  var c = window.REPORT_REPO;
  if (!c) return;
  function url(repo, path, line) {
    if (c.provider === "github") {
      return c.base + "/" + c.org + "/" + repo + "/blob/" + c.branch + path + (line ? "#L" + line : "");
    }
    if (c.provider === "gitlab") {
      return c.base + "/" + c.org + "/" + repo + "/-/blob/" + c.branch + path + (line ? "#L" + line : "");
    }
    var qs = "?path=" + encodeURIComponent(path) + "&version=GB" + c.branch;
    if (line) qs += "&line=" + line + "&lineEnd=" + (Number(line) + 1) + "&lineStartColumn=1&lineEndColumn=1&lineStyle=plain&_a=contents";
    return c.base + "/" + c.org + "/" + c.project + "/_git/" + repo + qs;
  }
  Array.prototype.forEach.call(document.querySelectorAll("a.src[data-repo][data-path]"), function (a) {
    a.setAttribute("href", url(a.getAttribute("data-repo"), a.getAttribute("data-path"), a.getAttribute("data-line")));
  });
})();`;
}

/** Bloco 2 — casca do documento. */
export function shellScript() {
  return `(function () {
  "use strict";
  var domains = Array.prototype.slice.call(document.querySelectorAll("[data-domain]"));
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-domain-link]"));
  var sideNavs = Array.prototype.slice.call(document.querySelectorAll(".side-nav"));
  var ids = domains.map(function (d) { return d.getAttribute("data-domain"); });

  // Hash em duas partes: #dominio/ancora. Deep-link precisa funcionar abrindo o
  // arquivo direto do disco, sem servidor — por isso roteamento por hash, não history.
  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return { domain: ids[0], anchor: null };
    var parts = raw.split("/");
    var domain = ids.indexOf(parts[0]) >= 0 ? parts[0] : null;
    if (domain) return { domain: domain, anchor: parts.slice(1).join("/") || null };
    return { domain: ids[0], anchor: raw };
  }

  function activate(domain, anchor) {
    domains.forEach(function (d) { d.classList.toggle("is-active", d.getAttribute("data-domain") === domain); });
    links.forEach(function (l) {
      if (l.getAttribute("data-domain-link") === domain) l.setAttribute("aria-current", "true");
      else l.removeAttribute("aria-current");
    });
    sideNavs.forEach(function (n) { n.hidden = n.getAttribute("data-for") !== domain; });
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) {
        // A âncora pode estar DENTRO de uma dobra fechada: abre a dela e as ancestrais,
        // senão o link levaria a um ponto invisível da página.
        if (el.tagName === "DETAILS") el.open = true;
        var p = el.parentElement;
        while (p) { if (p.tagName === "DETAILS") p.open = true; p = p.parentElement; }
        window.requestAnimationFrame(function () { el.scrollIntoView({ block: "start", behavior: "smooth" }); });
      }
      sideNavs.forEach(function (n) {
        Array.prototype.forEach.call(n.querySelectorAll("a"), function (a) {
          a.classList.toggle("active", a.getAttribute("data-anchor") === anchor);
        });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
      sideNavs.forEach(function (n) {
        Array.prototype.forEach.call(n.querySelectorAll("a"), function (a) { a.classList.remove("active"); });
      });
    }
    spy();
  }

  function route() { var h = parseHash(); activate(h.domain, h.anchor); }
  window.addEventListener("hashchange", route);

  // Realce da seção corrente conforme a rolagem, dentro do domínio ativo.
  var spyTargets = [];
  function collectSpy() {
    var active = document.querySelector(".domain.is-active");
    spyTargets = active ? Array.prototype.slice.call(active.querySelectorAll("h2[id], h3[id]")) : [];
  }
  var spyRaf = null;
  function spy() {
    if (spyRaf) return;
    spyRaf = window.requestAnimationFrame(function () {
      spyRaf = null;
      collectSpy();
      if (!spyTargets.length) return;
      var y = window.scrollY + 120;
      var cur = spyTargets[0];
      for (var i = 0; i < spyTargets.length; i++) {
        if (spyTargets[i].offsetTop <= y) cur = spyTargets[i];
      }
      var nav = document.querySelector(".side-nav:not([hidden])");
      if (!nav || !cur) return;
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
        a.classList.toggle("active", a.getAttribute("data-anchor") === cur.id);
      });
    });
  }
  window.addEventListener("scroll", spy, { passive: true });

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest ? ev.target.closest("[data-fold]") : null;
    if (btn) {
      var scope = btn.closest(".domain") || document;
      var open = btn.getAttribute("data-fold") === "open";
      Array.prototype.forEach.call(scope.querySelectorAll("details"), function (dd) { dd.open = open; });
    }
  });

  // ────── grid genérico: filtro + ordenação + paginação, uma instância por [data-grid-root] ──────
  function initGrid(root) {
    var table = root.querySelector("[data-grid-table]");
    if (!table) return;
    var tbody = table.querySelector("tbody");
    var allRows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
    var search = root.querySelector("[data-grid-search]");
    var sizeSel = root.querySelector("[data-grid-size]");
    var countEl = root.querySelector("[data-grid-count]");
    var pageInfo = root.querySelector("[data-grid-pageinfo]");
    var pager = root.querySelector("[data-grid-pager]");
    var resetBtn = root.querySelector("[data-grid-reset]");
    var noun = root.getAttribute("data-grid-noun") || "item(ns)";

    // Filtro "multi": a linha guarda vários valores como "|a|b|" e o filtro casa por
    // pertinência — um item com duas camadas de teste aparece no filtro de cada uma.
    var filters = Array.prototype.slice.call(root.querySelectorAll("[data-grid-filter]"))
      .map(function (el) { return { el: el, attr: el.getAttribute("data-grid-filter"), multi: el.hasAttribute("data-grid-multi") }; });

    var state = { page: 1, size: 50, sort: null, dir: 1 };
    var filtered = allRows.slice();
    var debounce = null;

    var colIndex = {};
    Array.prototype.forEach.call(table.querySelectorAll("th"), function (th, i) {
      var c = th.getAttribute("data-sort");
      if (c) colIndex[c] = i;
    });

    // Ordenação: número declarado > chave de texto declarada > texto da célula.
    // A última é o pior caso e ordena "10" antes de "9" — por isso toda coluna
    // numérica declara data-num-<col> no HTML.
    function value(row, col) {
      var n = row.getAttribute("data-num-" + col);
      if (n !== null) return Number(n);
      var s = row.getAttribute("data-sort-" + col);
      if (s !== null) return s;
      var idx = colIndex[col];
      if (idx != null && row.children[idx]) return row.children[idx].textContent.trim();
      return "";
    }

    function applyFilters() {
      var q = (search && search.value ? search.value : "").trim().toLowerCase();
      filtered = allRows.filter(function (r) {
        for (var i = 0; i < filters.length; i++) {
          var f = filters[i];
          if (f.el.value === "all") continue;
          var v = r.getAttribute("data-" + f.attr) || "";
          if (f.multi ? v.indexOf("|" + f.el.value + "|") < 0 : v !== f.el.value) return false;
        }
        if (q && (r.getAttribute("data-search") || "").indexOf(q) < 0) return false;
        return true;
      });
      if (state.sort) {
        var col = state.sort; var dir = state.dir;
        filtered.sort(function (a, b) {
          var va = value(a, col); var vb = value(b, col);
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va).localeCompare(String(vb), "pt-BR") * dir;
        });
      } else {
        filtered.sort(function (a, b) {
          return Number(a.getAttribute("data-index")) - Number(b.getAttribute("data-index"));
        });
      }
      state.page = 1;
      render();
    }

    function render() {
      var size = state.size;
      var total = filtered.length;
      var pages = size ? Math.max(1, Math.ceil(total / size)) : 1;
      if (state.page > pages) state.page = pages;
      var from = size ? (state.page - 1) * size : 0;
      var to = size ? from + size : total;

      // As linhas fora da página continuam no DOM (busca do navegador, leitor de tela,
      // "Todos" instantâneo), apenas escondidas por classe.
      allRows.forEach(function (r) { r.classList.add("is-hidden"); r.classList.remove("is-paged-out"); });
      var frag = document.createDocumentFragment();
      var inSet = new Set(filtered);
      filtered.forEach(function (r, i) {
        if (i >= from && i < to) r.classList.remove("is-hidden");
        else r.classList.add("is-paged-out");
        frag.appendChild(r);
      });
      allRows.forEach(function (r) { if (!inSet.has(r)) frag.appendChild(r); });
      tbody.appendChild(frag);

      if (countEl) {
        countEl.textContent = total === allRows.length
          ? total + " " + noun
          : total + " de " + allRows.length + " " + noun + " após os filtros";
      }
      if (pageInfo) {
        pageInfo.textContent = size
          ? "Página " + state.page + " de " + pages + " · " + (total ? (from + 1) : 0) + "–" + Math.min(to, total)
          : "Todos os " + total;
      }
      if (pager) {
        var atFirst = state.page <= 1;
        var atLast = state.page >= pages;
        Array.prototype.forEach.call(pager.querySelectorAll("[data-grid-page]"), function (b) {
          var w = b.getAttribute("data-grid-page");
          b.disabled = (!size) || ((w === "first" || w === "prev") ? atFirst : atLast);
        });
      }
    }

    if (search) {
      search.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(applyFilters, 120);
      });
    }
    filters.forEach(function (f) { f.el.addEventListener("change", applyFilters); });
    if (sizeSel) {
      sizeSel.addEventListener("change", function () {
        state.size = Number(sizeSel.value) || 0;
        state.page = 1;
        render();
      });
      state.size = Number(sizeSel.value) || 0;
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (search) search.value = "";
        filters.forEach(function (f) { f.el.value = "all"; });
        state.sort = null; state.dir = 1;
        Array.prototype.forEach.call(table.querySelectorAll("th.sortable"), function (th) { th.setAttribute("aria-sort", "none"); });
        applyFilters();
      });
    }
    if (pager) {
      pager.addEventListener("click", function (ev) {
        var b = ev.target.closest ? ev.target.closest("[data-grid-page]") : null;
        if (!b || b.disabled) return;
        var size = state.size;
        var pages = size ? Math.max(1, Math.ceil(filtered.length / size)) : 1;
        var w = b.getAttribute("data-grid-page");
        if (w === "first") state.page = 1;
        else if (w === "prev") state.page = Math.max(1, state.page - 1);
        else if (w === "next") state.page = Math.min(pages, state.page + 1);
        else if (w === "last") state.page = pages;
        render();
        table.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
    Array.prototype.forEach.call(table.querySelectorAll("th.sortable"), function (th) {
      th.addEventListener("click", function () {
        var col = th.getAttribute("data-sort");
        if (state.sort === col) state.dir = -state.dir;
        else { state.sort = col; state.dir = 1; }
        Array.prototype.forEach.call(table.querySelectorAll("th.sortable"), function (o) {
          o.setAttribute("aria-sort", o === th ? (state.dir === 1 ? "ascending" : "descending") : "none");
        });
        applyFilters();
      });
    });

    applyFilters();
  }

  Array.prototype.slice.call(document.querySelectorAll("[data-grid-root]")).forEach(initGrid);

  // ────── dossiê completo para PDF ──────
  // Abre todas as dobras, põe os grids em "Todos" e liga a quebra de página por seção.
  // Sem isto o PDF sai com o que está na tela — que é o padrão desejado no dia a dia,
  // mas não serve como anexo contratual.
  var dossierBtn = document.querySelector("[data-dossier]");
  if (dossierBtn) {
    dossierBtn.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll("details"), function (d) { d.open = true; });
      Array.prototype.forEach.call(document.querySelectorAll("[data-grid-size]"), function (sel) {
        sel.value = "0";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-grid-reset]"), function (b) {
        var root = b.closest("[data-grid-root]");
        var search = root && root.querySelector("[data-grid-search]");
        if (search && search.value) { search.value = ""; search.dispatchEvent(new Event("input", { bubbles: true })); }
      });
      document.body.classList.add("dossier");
      var st = document.querySelector("[data-dossier-status]");
      if (st) { st.hidden = false; st.textContent = "Dossiê preparado — use Imprimir / PDF."; }
      dossierBtn.disabled = true;
      dossierBtn.textContent = "Dossiê preparado";
      window.setTimeout(function () { window.print(); }, 350);
    });
  }

  // ────── breadcrumb da seção corrente ──────
  var crumb = document.querySelector("[data-crumb]");
  var domainTitles = {};
  Array.prototype.forEach.call(document.querySelectorAll(".side-nav"), function (n) {
    var h = n.querySelector("h2");
    domainTitles[n.getAttribute("data-for")] = h ? h.textContent : "";
  });
  function setCrumb(h2, h3) {
    if (!crumb) return;
    var dom = document.querySelector(".domain.is-active");
    if (!dom) { crumb.innerHTML = ""; return; }
    var parts = ["<b>" + (domainTitles[dom.getAttribute("data-domain")] || "") + "</b>"];
    if (h2) parts.push('<a href="#' + dom.getAttribute("data-domain") + "/" + h2.id + '">' + h2.textContent.replace(/\\s+/g, " ").trim() + "</a>");
    if (h3) parts.push("<span>" + h3.textContent.replace(/\\s+/g, " ").trim() + "</span>");
    crumb.innerHTML = parts.join(' <span class="sep">›</span> ');
  }
  var io = null;
  function observeHeadings() {
    if (io) io.disconnect();
    var dom = document.querySelector(".domain.is-active");
    if (!dom || !("IntersectionObserver" in window)) { if (crumb) crumb.innerHTML = ""; return; }
    var heads = Array.prototype.slice.call(dom.querySelectorAll("h2[id], h3[id]"));
    if (!heads.length) { if (crumb) crumb.innerHTML = ""; return; }
    io = new IntersectionObserver(function () {
      // A seção corrente é o último título ACIMA da dobra — o observer só serve de
      // gatilho barato; a decisão é sempre por posição, senão duas seções visíveis ao
      // mesmo tempo faziam o breadcrumb piscar entre elas.
      var y = window.scrollY + 140;
      var curH2 = null; var curH3 = null;
      heads.forEach(function (el) {
        if (el.getBoundingClientRect().top + window.scrollY > y) return;
        if (el.tagName === "H2") { curH2 = el; curH3 = null; } else curH3 = el;
      });
      setCrumb(curH2 || heads[0], curH3);
    }, { rootMargin: "-130px 0px -70% 0px", threshold: [0, 1] });
    heads.forEach(function (h) { io.observe(h); });
    setCrumb(heads[0], null);
  }
  window.addEventListener("hashchange", function () { window.setTimeout(observeHeadings, 60); });

  route();
  observeHeadings();
  // Deep link: garante a aba certa e as dobras ancestrais abertas depois do load.
  window.addEventListener("load", function () { route(); observeHeadings(); });
})();`;
}

/**
 * Bloco 3 — gráfico de séries ligáveis.
 * Só é emitido quando existe pelo menos um [data-tl-chart] no documento; o payload vem
 * serializado no atributo data-tl, montado por charts.seriesChartData().
 */
export function seriesChartScript() {
  return `(function () {
  "use strict";
  // padR generoso: o rótulo do valor final fica fora da área de plotagem e um
  // total de quatro dígitos não pode ser cortado pela borda do viewBox.
  var W = 940, H = 300, padL = 52, padR = 46, padT = 16, padB = 46;

  function niceMax(v) {
    if (v <= 4) return 4;
    var raw = v / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).find(function (c) { return c >= raw; }) || 10 * mag;
    return step * 4;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmt(n) { return Number(n).toLocaleString("pt-BR"); }

  function dimOf(root, data) {
    var b = root.querySelector("[data-tl-dim][aria-pressed='true']");
    var key = b ? b.getAttribute("data-tl-dim") : data.dims[0].key;
    return data.dims.filter(function (d) { return d.key === key; })[0] || data.dims[0];
  }

  // Estado de marcação por dimensão: trocar o corte e voltar não deve perder o
  // que o leitor havia desligado.
  var MEM = new WeakMap();
  function mem(root) {
    if (!MEM.has(root)) MEM.set(root, {});
    return MEM.get(root);
  }

  function renderToggles(root, data) {
    var dim = dimOf(root, data);
    var box = root.querySelector("[data-tl-toggles]");
    if (!box) return;
    var state = mem(root)[dim.key] || {};
    box.innerHTML = dim.series.map(function (s) {
      var on = state[s.key] === undefined ? true : state[s.key];
      var last = s.cum[s.cum.length - 1] || 0;
      return '<label class="tl-toggle" style="--tl-c:' + s.color + '">' +
        '<input type="checkbox" data-tl-series="' + esc(s.key) + '"' + (on ? " checked" : "") + ">" +
        '<span class="tl-sw"></span><span>' + esc(s.label) + "</span><b>" + fmt(last) +
        (s.available ? '<span class="tl-of">/' + fmt(s.available) + "</span>" : "") + "</b></label>";
    }).join("");
  }

  function draw(root) {
    var data = JSON.parse(root.getAttribute("data-tl"));
    var dim = dimOf(root, data);
    var svg = root.querySelector("[data-tl-svg]");
    var note = root.querySelector("[data-tl-note]");
    var modeBtn = root.querySelector("[data-tl-mode][aria-pressed='true']");
    var mode = modeBtn ? modeBtn.getAttribute("data-tl-mode") : "cum";
    var on = {}, state = mem(root);
    state[dim.key] = state[dim.key] || {};
    Array.prototype.forEach.call(root.querySelectorAll("[data-tl-series]"), function (cb) {
      var k = cb.getAttribute("data-tl-series");
      on[k] = cb.checked;
      state[dim.key][k] = cb.checked;
    });

    var vis = dim.series.filter(function (s) { return on[s.key]; });
    var labels = data.labels;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var peak = 0;
    // O eixo reescala ao que estiver LIGADO: com a série dominante desligada, uma
    // série pequena precisa ocupar o gráfico, não continuar achatada contra a base.
    vis.forEach(function (s) {
      (mode === "cum" ? s.cum : s.per).forEach(function (v) { if (v > peak) peak = v; });
    });
    var max = niceMax(Math.max(peak, 1));
    var stepX = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
    var X = function (i) { return padL + i * stepX; };
    var Y = function (v) { return padT + plotH - (v / max) * plotH; };

    var out = "";
    for (var t = 0; t <= 4; t++) {
      var v = (max / 4) * t, y = Y(v);
      out += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke="' + (t === 0 ? "#b8c0cc" : "#e6e9ee") + '"/>';
      out += '<text x="' + (padL - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#6b7787">' + fmt(Math.round(v)) + "</text>";
    }
    var every = labels.length > 14 ? Math.ceil(labels.length / 12) : 1;
    labels.forEach(function (l, i) {
      if (i % every && i !== labels.length - 1) return;
      out += '<g transform="translate(' + X(i).toFixed(1) + "," + (padT + plotH + 16) + ') rotate(-26)"><text text-anchor="end" font-size="10.5" fill="#6b7787">' + esc(l) + "</text></g>";
    });

    if (!vis.length) {
      out += '<text x="' + (W / 2) + '" y="' + (padT + plotH / 2) + '" text-anchor="middle" font-size="13" fill="#8d97a4">Selecione ao menos uma série.</text>';
    }

    var endLabels = [];
    vis.forEach(function (s) {
      var vals = mode === "cum" ? s.cum : s.per;
      var d = vals.map(function (v, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); }).join(" ");
      out += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
      vals.forEach(function (v, i) {
        if (mode === "per" && !v) return;
        out += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.4" fill="#fff" stroke="' + s.color + '" stroke-width="2"><title>' +
          esc(s.label + " · " + labels[i] + ": " + fmt(v) + (mode === "cum" ? " acumulados" : " no período")) + "</title></circle>";
      });
      if (mode === "cum" && vals.length) {
        endLabels.push({ y: Y(vals[vals.length - 1]) + 4, v: vals[vals.length - 1], color: s.color });
      }
    });

    // Séries que terminam próximas teriam os rótulos sobrepostos: separa em 12px
    // preservando a ordem vertical, e recua o conjunto se estourar embaixo.
    endLabels.sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < endLabels.length; k++) {
      if (endLabels[k].y - endLabels[k - 1].y < 12) endLabels[k].y = endLabels[k - 1].y + 12;
    }
    var over = endLabels.length ? endLabels[endLabels.length - 1].y - (padT + plotH + 4) : 0;
    if (over > 0) endLabels.forEach(function (l) { l.y -= over; });
    endLabels.forEach(function (l) {
      out += '<text x="' + (W - padR + 5) + '" y="' + l.y.toFixed(1) + '" font-size="11" font-weight="650" fill="' + l.color + '">' + fmt(l.v) + "</text>";
    });

    svg.innerHTML = out;
    if (note) {
      var tot = vis.reduce(function (a, s) { return a + (mode === "cum" ? s.cum[s.cum.length - 1] : s.per.reduce(function (x, y) { return x + y; }, 0)); }, 0);
      note.textContent = vis.length
        ? dim.label + " · " + (mode === "cum" ? "acumulado" : "fechamentos por período") + " · " + vis.length + " série(s) · " + fmt(tot) + " itens no total. " + (dim.note || "Passe o cursor sobre um ponto para o valor exato.")
        : "Nenhuma série selecionada.";
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-tl-chart]"), function (root) {
    var data = JSON.parse(root.getAttribute("data-tl"));
    root.addEventListener("change", function (ev) {
      if (ev.target.matches("[data-tl-series]")) draw(root);
    });
    root.addEventListener("click", function (ev) {
      var dm = ev.target.closest("[data-tl-dim]");
      if (dm) {
        Array.prototype.forEach.call(root.querySelectorAll("[data-tl-dim]"), function (b) {
          b.setAttribute("aria-pressed", String(b === dm));
        });
        renderToggles(root, data);
        draw(root);
        return;
      }
      var m = ev.target.closest("[data-tl-mode]");
      if (m) {
        Array.prototype.forEach.call(root.querySelectorAll("[data-tl-mode]"), function (b) {
          b.setAttribute("aria-pressed", String(b === m));
        });
        draw(root);
        return;
      }
      if (ev.target.closest("[data-tl-all]")) {
        Array.prototype.forEach.call(root.querySelectorAll("[data-tl-series]"), function (cb) { cb.checked = true; });
        draw(root);
      }
    });
    draw(root);
  });
})();`;
}
