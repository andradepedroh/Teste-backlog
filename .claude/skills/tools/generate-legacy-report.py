#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-legacy-report.py — Kit HTML do AS-IS (spec-legacy).

Compila business-map.json + os .md do AS-IS (legacy, architecture, legacy-analysis,
threat-model) no layout do diagnóstico de consultoria: sidebar colapsável à esquerda,
capa (Visão geral), NEGÓCIO agrupado por DOMÍNIO (cada domínio = um módulo, agregando
KPIs, regras, processos, dores, acoplamento e histórias), views de negócio transversais e
TECNOLOGIA — os .md acima, «Achados do Grafo» (de `graph_findings`) e «Grafo do Legado».
Itens sem dado no `business-map.json` são omitidos, sem link órfão.

ARQUIVOS GRAVADOS (o kit **não** é um arquivo único autocontido) — todos em
`<base-dir>/report/`:
  - `legacy-as-is-kit.html`   — o kit (`--out` muda o caminho);
  - `legacy-graph-full.html`  — CÓPIA de `graphify-out/graph.html`, quando existir;
  - `graph.min.json`          — grafo reduzido, quando houver `graphify-out/graph.json`;
  - `legacy-as-is-kit.html.gz` e `graph.min.json.gz`, só com `--gzip` (as cópias legíveis
    permanecem; o `legacy-graph-full.html`, que é cópia, NÃO é comprimido).
Além disso o kit carrega o Mermaid de CDN (`cdnjs.cloudflare.com`, mermaid 10.9.1 — mesmo
pin do `report-shell.html` do gêmeo) — sem rede, os diagramas
não renderizam; o resto do kit, sim.

A aba do Grafo NÃO embute o `graph.html` via `iframe srcdoc`: o grafo método-level chega
a dezenas de MB e travava o navegador. O que o script faz (`build_graph_panel`, e é o que
`spec-legacy/SKILL.md` «Aba Grafo do Legado» descreve): embute um viewer reduzido
file/classe-level derivado do `graph.json` (agregado por `source_file`, `--max-graph-nodes`,
canvas + JS inline, sem CDN) e **copia** o `graph.html` para `report/legacy-graph-full.html`,
oferecendo apenas um `<a href="legacy-graph-full.html">`. Sem `graph.json`/`graph.html` a
aba mostra a instrução de geração — o kit não trava. Ao final, `smoke_check()` confere a
sanidade estrutural do HTML (avisa em stderr, não aborta) e o script avisa quando o kit
passa de RECOMMENDED_MAX_MB.

Uso (forma canônica, relativa ao SKILL.md — ver references/paths.md):
    python3 ../tools/generate-legacy-report.py

Templates (tema `report-embedded.css`):
  - Sem `--templates-dir` o espelho ativo é DESCOBERTO reaproveitando as funções do
    `generate-report.py` (mesmo diretório, carregado por `importlib` porque o nome tem
    hífen): `discover_templates_dir(require_shell=False)` + `inspect_templates_dir()`.
    A lógica NÃO é duplicada aqui e o gêmeo não importa este script — sem ciclo.
    Nada de `.cursor/…` hardcodado: quebrava em projeto só-Claude (`.claude/`) e no
    `plugin/skills/`.
  - `require_shell=False` porque este gerador monta o próprio shell; só o
    `report-embedded.css` (versão + seletores `section.domain` etc.) é exigido.
  - O tema é OBRIGATÓRIO: sem ele o kit saía sem `report-embedded`/`section.domain`
    e com exit 0 — a mesma degradação silenciosa («HTML vazio com exit 0») já
    corrigida no gêmeo. Hoje o guard aborta com **exit 1** e nada é gravado.

Exit codes: `0` sucesso · `1` em **quatro** caminhos — (a) dependência `markdown`
ausente [`MARKDOWN_AVAILABLE`]; (b) `generate-report.py` (o gêmeo que resolve os
templates) ausente no mesmo diretório [`REPORT_TWIN_PRESENT`]; (c) nenhum espelho de
templates compatível [`TEMPLATES_MIRROR_FOUND`]; (d) `--templates-dir` explícito
incompatível [`TEMPLATE_VERSION_MATCH`]. Os códigos entre colchetes são os da tabela
FATAL do `spec-report/SKILL.md`; (c) e (d) abortam dentro do gêmeo (`discover_templates_dir`
/ `abort_incompatible_templates`), (a) e (b) são os dois `sys.exit(1)` deste arquivo.
Em nenhum deles algo é gravado.

Mermaid via CDN, `securityLevel:'strict'` — igual ao `report-shell.html`. Em `'loose'`
o mermaid reinjeta o label por `innerHTML` sem passar pelo DOMPurify, e um `.md` de
spec envenenado (`<img src=x onerror=…>` num label) executaria. Em `'strict'` os
diagramas do kit continuam renderizando (nenhum usa `click`/callback).
"""
import argparse
import codecs
import glob as _glob
import gzip
import html as html_lib
import json
import math
import os
import re
import shutil
import sys
from datetime import date

# Dependência `markdown-py` — sem rota efêmera (references/tool-bootstrap.md:98-100).
# A instalação é decisão do USUÁRIO: venv do projeto → `pip install --user` com aprovação
# explícita. Nunca `--break-system-packages` (PEP 668).
MARKDOWN_BOOTSTRAP_HINT = (
    "ERRO: pacote 'markdown' não instalado (dependência deste gerador).\n"
    "  Não instale por conta própria: `markdown-py` não tem rota efêmera "
    "(uvx/pipx/container) — ver references/tool-bootstrap.md «Nota sobre pip».\n"
    "  Ordem de preferência, com aprovação explícita do usuário: venv do projeto "
    "(`python3 -m venv .venv && .venv/bin/pip install markdown`) → "
    "`pip install --user markdown`. Nunca `--break-system-packages`.\n"
    "  Sem aprovação: registrar `TOOL_UNAVAILABLE:markdown-py (sem rota efêmera)` no "
    "sync-log.md e seguir no modo degradado da skill (kit AS-IS não gerado)."
)

try:
    import markdown
except ImportError:
    print(MARKDOWN_BOOTSTRAP_HINT, file=sys.stderr)
    sys.exit(1)


# --- Descoberta/validação de templates: COMPARTILHADA com o gêmeo ------------
# `generate-report.py` mora no mesmo diretório e já resolve o espelho ativo
# (`.cursor/skills` → `.claude/skills` → `plugin/skills` → `skills` → irmão do script)
# elegendo o primeiro COMPATÍVEL. Duplicar essa lógica aqui foi exatamente o que deixou
# este script com `.cursor/…` hardcodado. O nome do arquivo tem hífen, então o import
# passa por importlib. Sem ciclo: o gêmeo não importa este módulo.
_REPORT_MODULE_FILENAME = "generate-report.py"


def _load_report_module():
    """Gate `REPORT_TWIN_PRESENT` (FATAL): sem o gêmeo não há descoberta de templates.

    Espelho incompleto (`tools/` com só um dos dois geradores) → **exit 1** com a
    instrução de re-sincronizar, e nada é gravado. Sem este guard o script morreria
    num traceback de `importlib` sem ação acionável.
    """
    import importlib.util

    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), _REPORT_MODULE_FILENAME)
    if not os.path.exists(path):
        print(f"ERRO: '{_REPORT_MODULE_FILENAME}' não encontrado ao lado deste script "
              f"({path}). Os dois geradores compartilham a descoberta de templates e são "
              "distribuídos juntos em `<espelho>/tools/` — re-rode "
              "a atualização do pacote de skills.", file=sys.stderr)
        sys.exit(1)
    spec = importlib.util.spec_from_file_location("spec_generate_report", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["spec_generate_report"] = module
    spec.loader.exec_module(module)
    return module


_report = _load_report_module()


def read_file(path):
    with codecs.open(path, "r", "utf-8") as f:
        return f.read()


_MERMAID_RE = re.compile(r'<pre><code class="language-mermaid">(.*?)</code></pre>', re.DOTALL | re.IGNORECASE)
_TABLE_RE = re.compile(r"<table\b[^>]*>.*?</table>", re.DOTALL | re.IGNORECASE)


def md_to_html(md_text):
    chunk = markdown.markdown(md_text, extensions=["tables", "fenced_code"])
    chunk = _MERMAID_RE.sub(lambda m: f'<pre class="mermaid">{html_lib.unescape(m.group(1))}</pre>', chunk)
    chunk = _TABLE_RE.sub(lambda m: f'<div class="md-table-scroll">{m.group(0)}</div>', chunk)
    return chunk


def extract_project_name(base_dir, bmap):
    pn = (bmap.get("metadata") or {}).get("project_name")
    if pn and "<" not in pn:
        return pn
    for rel in ("legacy.md", "capa.md", os.path.join("product-vision", "product-vision.md")):
        p = os.path.join(base_dir, rel)
        if os.path.exists(p):
            m = re.search(r"^#\s+(.+?)\s*$", read_file(p), re.MULTILINE)
            if m:
                name = re.sub(r"\s*[—-]\s*(AS-IS|Legado).*$", "", m.group(1).strip(), flags=re.IGNORECASE)
                if name and "[" not in name:
                    return name
    return "Legado AS-IS"


def _e(v):
    return html_lib.escape("" if v is None else str(v))


def _table(headers, rows):
    if not rows:
        return ""
    head = "".join(f"<th>{_e(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="md-table-scroll"><table class="table-simple"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def _tags(items, warning=False):
    cls = "tag warning" if warning else "tag"
    return "".join(f'<span class="{cls}">{_e(i)}</span>' for i in (items or []))


def _card(title, inner, kicker=None):
    k = f'<p class="card-kicker">{_e(kicker)}</p>' if kicker else ""
    ttl = f'<h3 class="card-title">{_e(title)}</h3>' if title else ""
    return f'<div class="card">{k}{ttl}{inner}</div>'


def find_graph_dir(preferred, base_dir):
    """Descobre a pasta com graph.json/graph.html mesmo se o Graphify gravou em outro lugar."""
    cands = [preferred, os.path.join(base_dir, "graphify-out"), "graphify-out",
             "outputs/spec/graphify-out", os.path.join(base_dir, "..", "graphify-out")]
    for c in cands:
        if c and (os.path.exists(os.path.join(c, "graph.json"))
                  or os.path.exists(os.path.join(c, "graph.html"))):
            return c
    for name in ("graph.json", "graph.html"):
        hits = _glob.glob(os.path.join(base_dir, "**", name), recursive=True)
        if hits:
            return os.path.dirname(hits[0])
    return preferred


# ---------------------------------------------------------------------------
# Grafo reduzido (file/classe-level) — derivado do graph.json, embutido no kit.
# O grafo completo NAO e embutido via srcdoc (dezenas de MB): e copiado a parte
# e apenas linkado. Aqui agregamos os nos por source_file para caber < max_nodes.
# ---------------------------------------------------------------------------

_GRAPH_PALETTE = ["#123c7a", "#2f7d3a", "#a3521b", "#7a1f5a", "#0e6b74", "#8a5a00",
                  "#3a3f8a", "#7a2222", "#155e3a", "#5a3a8a", "#1f6f9a", "#6b6b1f"]


def _norm_src(p):
    p = (p or "").replace("\\", "/").lstrip("./")
    for pref in ("outputs/spec/.graph-src/", ".graph-src/", "inputs/"):
        if p.startswith(pref):
            p = p[len(pref):]
    return p


def _load_graph_json(path):
    try:
        return json.loads(read_file(path))
    except (ValueError, OSError):
        return None


def _graph_nodes_edges(g):
    nodes = g.get("nodes") or []
    edges = g.get("links") or g.get("edges") or []
    return nodes, edges


def build_reduced_graph(graph_json_path, max_nodes=1500):
    """Agrega o graph.json por source_file, calcula grau e um layout deterministico.

    Retorna dict compacto {nodes, edges, groups, truncated, total_files} ou None.
    """
    g = _load_graph_json(graph_json_path)
    if not isinstance(g, dict):
        return None
    nodes, edges = _graph_nodes_edges(g)
    if not nodes:
        return None

    id2file = {}
    for n in nodes:
        if not isinstance(n, dict):
            continue
        nid = n.get("id")
        if nid is None:
            continue
        sf = n.get("source_file") or n.get("file") or n.get("path") or nid
        id2file[nid] = _norm_src(str(sf))

    all_files = set(id2file.values())
    deg = dict.fromkeys(all_files, 0)
    fedges = {}
    for e in edges:
        if isinstance(e, dict):
            s, t = e.get("source"), e.get("target")
        elif isinstance(e, (list, tuple)) and len(e) >= 2:
            s, t = e[0], e[1]
        else:
            continue
        fs, ft = id2file.get(s), id2file.get(t)
        if fs is None or ft is None or fs == ft:
            continue
        key = (fs, ft) if fs < ft else (ft, fs)
        fedges[key] = fedges.get(key, 0) + 1
        deg[fs] += 1
        deg[ft] += 1

    file_list = sorted(all_files, key=lambda f: (-deg.get(f, 0), f))
    truncated = len(file_list) > max_nodes
    if truncated:
        file_list = file_list[:max_nodes]
    keep = set(file_list)

    def grp(f):
        parts = f.split("/")
        return parts[0] if len(parts) > 1 else "(raiz)"

    def label(f):
        parts = f.split("/")
        return "/".join(parts[-2:]) if len(parts) > 1 else f

    groups = {}
    for f in file_list:
        groups.setdefault(grp(f), []).append(f)
    gnames = sorted(groups)
    gidx = {gn: i for i, gn in enumerate(gnames)}

    pos = {}
    G = max(1, len(gnames))
    for gi, gn in enumerate(gnames):
        ang = 2 * math.pi * gi / G
        gx, gy = math.cos(ang) * 1000.0, math.sin(ang) * 1000.0
        members = sorted(groups[gn], key=lambda x: -deg.get(x, 0))
        M = max(1, len(members))
        base_r = 70.0 + 24.0 * math.sqrt(M)
        for mi, f in enumerate(members):
            a2 = 2 * math.pi * mi / M * 3.0
            rr = base_r * (0.30 + 0.70 * (mi + 1) / M)
            pos[f] = (round(gx + math.cos(a2) * rr, 1), round(gy + math.sin(a2) * rr, 1))

    idx = {f: i for i, f in enumerate(file_list)}
    out_nodes = [{"l": label(f), "x": pos[f][0], "y": pos[f][1],
                  "d": deg.get(f, 0), "g": gidx[grp(f)]} for f in file_list]
    out_edges = [[idx[a], idx[b], w] for (a, b), w in fedges.items()
                 if a in keep and b in keep]
    return {"nodes": out_nodes, "edges": out_edges, "groups": gnames,
            "truncated": truncated, "total_files": len(all_files)}


GRAPH_VIEWER_JS = """
(function(){
  var G = window.__GRAPH__; if(!G || !G.nodes || !G.nodes.length) return;
  var cv = document.getElementById('graph-canvas'); if(!cv) return;
  var ctx = cv.getContext('2d');
  var PAL = %PALETTE%;
  var nodes = G.nodes, edges = G.edges;
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  nodes.forEach(function(n){ if(n.x<minX)minX=n.x; if(n.x>maxX)maxX=n.x; if(n.y<minY)minY=n.y; if(n.y>maxY)maxY=n.y; });
  var maxD=1; nodes.forEach(function(n){ if(n.d>maxD)maxD=n.d; });
  var view={s:1,ox:0,oy:0}, hover=-1;
  function resize(){ cv.width=cv.clientWidth*devicePixelRatio; cv.height=cv.clientHeight*devicePixelRatio; fit(); draw(); }
  function fit(){ var w=cv.width,h=cv.height; var gw=(maxX-minX)||1, gh=(maxY-minY)||1;
    var s=Math.min(w/gw,h/gh)*0.86; view.s=s; view.ox=w/2-((minX+maxX)/2)*s; view.oy=h/2-((minY+maxY)/2)*s; }
  function tx(x){ return x*view.s+view.ox; } function ty(y){ return y*view.s+view.oy; }
  function rad(n){ return (2+Math.sqrt(n.d/maxD)*7)*devicePixelRatio; }
  function draw(){ ctx.clearRect(0,0,cv.width,cv.height);
    ctx.lineWidth=Math.max(0.4,0.5*devicePixelRatio); ctx.strokeStyle='rgba(90,110,140,0.20)';
    ctx.beginPath();
    for(var i=0;i<edges.length;i++){ var a=nodes[edges[i][0]],b=nodes[edges[i][1]]; if(!a||!b)continue;
      ctx.moveTo(tx(a.x),ty(a.y)); ctx.lineTo(tx(b.x),ty(b.y)); }
    ctx.stroke();
    for(var j=0;j<nodes.length;j++){ var n=nodes[j];
      ctx.beginPath(); ctx.fillStyle=PAL[n.g%PAL.length];
      ctx.globalAlpha=(hover<0||hover===j)?1:0.35;
      ctx.arc(tx(n.x),ty(n.y),rad(n),0,6.2832); ctx.fill(); }
    ctx.globalAlpha=1;
    if(hover>=0){ var hn=nodes[hover];
      ctx.font=(12*devicePixelRatio)+'px sans-serif'; ctx.fillStyle='#111';
      var tX=tx(hn.x)+8*devicePixelRatio, tY=ty(hn.y)-8*devicePixelRatio;
      var txt=hn.l+'  ('+hn.d+')'; var tw=ctx.measureText(txt).width;
      ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillRect(tX-3,tY-13*devicePixelRatio,tw+6,17*devicePixelRatio);
      ctx.fillStyle='#111'; ctx.fillText(txt,tX,tY); }
  }
  function nearest(mx,my){ var best=-1,bd=14*14*devicePixelRatio*devicePixelRatio;
    for(var i=0;i<nodes.length;i++){ var dx=tx(nodes[i].x)-mx, dy=ty(nodes[i].y)-my; var d=dx*dx+dy*dy;
      if(d<bd){ bd=d; best=i; } } return best; }
  var drag=null;
  cv.addEventListener('mousedown',function(e){ drag={x:e.clientX,y:e.clientY,ox:view.ox,oy:view.oy}; });
  window.addEventListener('mouseup',function(){ drag=null; });
  cv.addEventListener('mousemove',function(e){ var r=cv.getBoundingClientRect();
    var mx=(e.clientX-r.left)*devicePixelRatio, my=(e.clientY-r.top)*devicePixelRatio;
    if(drag){ view.ox=drag.ox+(e.clientX-drag.x)*devicePixelRatio; view.oy=drag.oy+(e.clientY-drag.y)*devicePixelRatio; }
    else { var h=nearest(mx,my); if(h!==hover){ hover=h; cv.style.cursor=h>=0?'pointer':'default'; } }
    draw(); });
  cv.addEventListener('wheel',function(e){ e.preventDefault(); var r=cv.getBoundingClientRect();
    var mx=(e.clientX-r.left)*devicePixelRatio, my=(e.clientY-r.top)*devicePixelRatio;
    var f=e.deltaY<0?1.12:0.89; var wx=(mx-view.ox)/view.s, wy=(my-view.oy)/view.s;
    view.s*=f; view.ox=mx-wx*view.s; view.oy=my-wy*view.s; draw(); },{passive:false});
  var ro=window.ResizeObserver?new ResizeObserver(resize):null; if(ro) ro.observe(cv);
  window.addEventListener('resize',resize);
  var tries=0; (function ensure(){ if(cv.clientWidth>0){ resize(); } else if(tries++<40){ setTimeout(ensure,150); } })();
  document.querySelectorAll('[data-view="tech-graph"]').forEach(function(b){ b.addEventListener('click',function(){ setTimeout(resize,60); }); });
})();
"""


def build_graph_panel(graphify_dir, report_dir, max_nodes=1500, gzip_out=False):
    """Painel do grafo: viewer reduzido embutido + link para o grafo completo.

    Copia graph.html -> report/legacy-graph-full.html (linkado, nao embutido) e
    grava report/graph.min.json (grafo reduzido compacto, para audit/uso externo).
    """
    gh = os.path.join(graphify_dir, "graph.html")
    gj = os.path.join(graphify_dir, "graph.json")
    reduced = build_reduced_graph(gj, max_nodes=max_nodes) if os.path.exists(gj) else None

    full_link = ""
    if os.path.exists(gh):
        dst = os.path.join(report_dir, "legacy-graph-full.html")
        try:
            shutil.copyfile(gh, dst)
            size_mb = os.path.getsize(dst) / (1024 * 1024)
            full_link = ('<p class="graph-note">Grafo completo (método-level): '
                         '<a href="legacy-graph-full.html" target="_blank" rel="noopener">'
                         f'abrir legacy-graph-full.html</a> — {size_mb:.1f} MB.</p>')
        except OSError:
            full_link = ""

    if reduced:
        try:
            with codecs.open(os.path.join(report_dir, "graph.min.json"), "w", "utf-8") as f:
                json.dump(reduced, f, ensure_ascii=False, separators=(",", ":"))
            if gzip_out:
                with open(os.path.join(report_dir, "graph.min.json"), "rb") as fi, \
                        gzip.open(os.path.join(report_dir, "graph.min.json.gz"), "wb") as fo:
                    shutil.copyfileobj(fi, fo)
        except OSError:
            pass
        trunc = ""
        if reduced.get("truncated"):
            trunc = (f' <span class="tag warning">exibindo os {len(reduced["nodes"])} arquivos de '
                     f'maior grau de {reduced["total_files"]}</span>')
        legend = "".join(
            f'<span class="tag" style="border-left:5px solid {_GRAPH_PALETTE[i % len(_GRAPH_PALETTE)]}">{_e(g)}</span>'
            for i, g in enumerate(reduced.get("groups", [])[:24]))
        data_js = json.dumps(reduced, ensure_ascii=False, separators=(",", ":"))
        viewer = GRAPH_VIEWER_JS.replace("%PALETTE%", json.dumps(_GRAPH_PALETTE))
        note = ('<p class="graph-note">Visão <strong>arquivo/classe-level</strong> reduzida '
                f'({len(reduced["nodes"])} nós · {len(reduced["edges"])} ligações){trunc}. '
                "Arraste para mover, role para zoom, passe o mouse para ver o arquivo. "
                "Fonte: <code>graphify-out/graph.json</code> — consultável com "
                "<code>graphify query/path/explain</code>.</p>")
        return (f'<div class="graph-wrap">{note}{full_link}'
                f'<div class="graph-legend">{legend}</div>'
                '<canvas id="graph-canvas" class="graph-frame"></canvas>'
                f'<script>window.__GRAPH__={data_js};</script>'
                f'<script>{viewer}</script></div>')

    return (
        '<div class="graph-empty"><h3>Grafo ainda não gerado</h3>'
        "<p>Este kit embute uma visão reduzida do grafo de conhecimento do legado "
        "(<strong>Graphify</strong>). "
        f"Nenhum <code>graph.json</code> em <code>{_e(graphify_dir)}</code>.</p>"
        '<pre class="graph-cmd">uv tool install graphifyy\ngraphify install\n'
        "cd outputs/spec && GRAPHIFY_MAX_OUTPUT_TOKENS=32768 graphify .graph-src --mode deep --update</pre>"
        f"{full_link}"
        "<p>O AST é processado localmente — nenhum código sai para terceiros (Camada H).</p></div>")


# ---------------------------------------------------------------------------
# Achados do grafo (graph_findings) — Passo 0.6
# ---------------------------------------------------------------------------

def render_graph_findings(bmap):
    gf = bmap.get("graph_findings") or {}
    gc = bmap.get("graph_coverage") or {}
    if not gf and not gc:
        return None
    inner = ""
    gods = gf.get("god_classes") or []
    if gods:
        rows = [[_e(x.get("node")), _e(x.get("file")), _e(x.get("degree")), _e(x.get("why"))] for x in gods]
        inner += _card("God classes / God-DAOs (maior grau)",
                       _table(["Nó", "Arquivo", "Grau", "Por quê"], rows))
    seams = gf.get("migration_seams") or []
    if seams:
        rows = [[_e(x.get("node")), _e(x.get("file")), _e(x.get("seam_rationale"))] for x in seams]
        inner += _card("Seams de migração (Strangler Fig)",
                       _table(["No", "Arquivo", "Racional da costura"], rows))
    cycles = gf.get("dependency_cycles") or []
    if cycles:
        rows = [[_tags(x.get("members")), _e(x.get("impact"))] for x in cycles]
        inner += _card("Ciclos de dependência", _table(["Membros", "Impacto"], rows))
    orphans = gf.get("orphan_files") or []
    if orphans:
        rows = [[_e(x.get("file")), _e(x.get("evidence"))] for x in orphans]
        inner += _card("Código morto candidato a Retire (órfãos)",
                       _table(["Arquivo", "Evidência"], rows))
    chains = gf.get("capability_chains") or []
    if chains:
        inner += "".join(
            f'<p class="pain"><strong>{_e(c.get("capability"))}</strong>: '
            f'{" -> ".join(_e(s) for s in (c.get("path") or []))}</p>' for c in chains)
    comms = gf.get("communities") or []
    if comms:
        rows = [[_e(c.get("community_id")), _tags(c.get("hub_nodes")),
                 _e(c.get("suggested_name")), _e(c.get("mapped_bm_id") or c.get("mapped_dom_id"))]
                for c in comms]
        inner += _card("Comunidades → BM (nomeação por hub)",
                       _table(["Comunidade", "Hubs", "Nome sugerido", "Mapeado a"], rows))
    if gc:
        fwd = gc.get("files_without_domain") or []
        body = (f'<p>{_e(gc.get("total_files"))} arquivo(s) no grafo · '
                f'{_e(gc.get("files_with_domain"))} com domínio.</p>')
        if fwd:
            body += '<p class="card-sub">Arquivos sem domínio (pontos cegos)</p>' + _tags(fwd, warning=True)
        inner += _card("Cobertura de arquivos", body)
    return inner or None


# ---------------------------------------------------------------------------
# Capa / Visão geral
# ---------------------------------------------------------------------------

def render_overview(bmap, project_name, today):
    md = bmap.get("metadata") or {}
    doms = bmap.get("domains") or []
    bms = bmap.get("business_modules") or []
    rules = bmap.get("business_rules") or []
    procs = bmap.get("processes") or []
    opps = bmap.get("opportunities") or []
    cx = bmap.get("complexity") or {}
    vc = (bmap.get("value_chain") or {}).get("cycles") or []
    db = bmap.get("database_analysis") or {}
    ch = (bmap.get("cross_cutting_views") or {}).get("domain_hypothesis_notes") or ""

    # hero: propósito do sistema
    purpose = ch or (bms[0].get("capability_summary") if bms else "") or "Documentação do AS-IS do sistema legado."
    meta = [f"Modo: {_e(md.get('mode','—'))}", f"{len(bms)} módulos de negócio", f"{len(doms)} domínios"]
    if cx.get("classification"):
        meta.append(f"Complexidade: {_e(cx.get('classification'))} ({_e(cx.get('score'))}/100)")
    meta_html = "".join(f'<span class="tag">{m}</span>' for m in meta)
    hero = _card("O sistema",
                 f'<div class="overview-body-text">{_e(purpose)}</div>'
                 f'<div class="overview-meta-row">{meta_html}</div>',
                 kicker=f"{_e(project_name)} · gerado em {today}")

    # cadeia de valor
    vc_html = ""
    if vc:
        items = ""
        for c in vc:
            items += (f'<li><strong>{_e(c.get("name"))}</strong> '
                      f'<span class="muted">{_e(c.get("description"))}</span><br>{_tags(c.get("stakeholders"))}</li>')
        vc_html = _card("Cadeia de valor do negócio", f'<ul class="clean">{items}</ul>')

    # módulos de alto risco
    hr = [d for d in doms if (d.get("complexity") in ("high", "critical"))]
    hr_html = ""
    if hr:
        rows = [[f'<strong>{_e(d.get("name"))}</strong>', _e(d.get("complexity")),
                 _e((d.get("business_impact_narrative") or "")[:160])] for d in hr]
        hr_html = _card("Domínios de alto risco", _table(["Domínio", "Complexidade", "Impacto no negócio"], rows))

    # drivers de complexidade
    drv = cx.get("top_complexity_drivers") or []
    drv_html = ""
    if drv:
        rows = [[_e(x.get("driver")), _e(x.get("business_consequence"))] for x in drv]
        drv_html = _card("Principais drivers de complexidade", _table(["Driver", "Consequência de negócio"], rows))

    # aside snapshot
    snap = [("Módulos de negócio", len(bms)), ("Domínios", len(doms)), ("Regras", len(rules)),
            ("Processos", len(procs)), ("Oportunidades", len(opps)), ("Tabelas (BD)", db.get("total_tables", "—"))]
    snap_rows = "".join(f'<div class="snap"><span class="snap-v">{_e(v)}</span>'
                        f'<span class="snap-l">{_e(l)}</span></div>' for l, v in snap)
    aside = f'<div class="card overview-aside"><div class="snap-grid">{snap_rows}</div></div>'

    main = hero + vc_html + drv_html + hr_html
    return f'<div class="overview-layout"><div class="overview-main">{main}</div><div class="overview-side">{aside}</div></div>'


# ---------------------------------------------------------------------------
# Domínio (cada domínio = um módulo de negócio)
# ---------------------------------------------------------------------------

def render_domain(d, rules_by_dom, procs_by_dom):
    did = d.get("id", "DOM")
    tags = "".join(f'<span class="tag">{_e(x)}</span>' for x in
                   [f"Tamanho: {d.get('size','—')}", f"Complexidade: {d.get('complexity','—')}"] if x)
    cov = _tags(d.get("source_business_module_ids")) + _tags(d.get("source_module_ids"))
    head = _card(d.get("name", did),
                 f'<div class="overview-meta-row">{tags}</div>'
                 f'<p>{_e(d.get("description"))}</p>'
                 f'<p class="card-sub">Cobre (BM / MOD)</p>{cov}',
                 kicker=did)

    body = head

    if d.get("business_impact_narrative"):
        body += _card("Impacto no negócio", f'<p>{_e(d.get("business_impact_narrative"))}</p>')

    kpis = d.get("kpis_domain") or []
    if kpis:
        rows = [[_e(k.get("name")), _e(k.get("description")), _e(k.get("stakeholder"))] for k in kpis]
        body += _card("Indicadores-chave", _table(["Indicador", "Como se mede", "Responsável"], rows))

    us = d.get("user_stories") or []
    if us:
        inner = "".join(f'<div class="story">{_e(s.get("story"))}'
                        f'<br><span class="muted">→ {_e(s.get("business_outcome"))}</span></div>' for s in us)
        body += _card("Histórias de usuário", inner)

    drules = rules_by_dom.get(did, [])
    if drules:
        rows = [[_e(r.get("id")), _e(r.get("name")), _e(r.get("category")),
                 _e(r.get("business_impact_if_violated")), _e(r.get("example_scenario")),
                 _e((r.get("implementation") or {}).get("location"))] for r in drules]
        body += _card("Regras de negócio",
                      _table(["ID", "Regra", "Categoria", "Impacto se violada", "Cenário", "Local"], rows))

    dprocs = procs_by_dom.get(did, [])
    if dprocs:
        inner = ""
        for p in dprocs:
            inner += f'<p class="card-sub">{_e(p.get("name"))}</p><p class="muted">{_e(p.get("description"))}</p>'
            srows = [[_e(s.get("order")), _e(s.get("name")), _e(s.get("actor")), _e(s.get("action")), _e(s.get("outcome"))]
                     for s in (p.get("steps") or [])]
            if srows:
                inner += _table(["#", "Passo", "Ator", "Ação", "Resultado"], srows)
            for f in (p.get("failure_scenarios") or []):
                inner += (f'<p class="pain"><strong>Falha:</strong> {_e(f.get("scenario"))} '
                          f'<span class="tag warning">{_e(f.get("business_impact"))}</span><br>'
                          f'<span class="muted">Recuperação atual: {_e(f.get("current_recovery"))}</span></p>')
            for pp in (p.get("pain_points") or []):
                inner += f'<p class="pain"><strong>Dor:</strong> {_e(pp.get("pain"))} — <span class="muted">{_e(pp.get("business_cost"))}</span></p>'
        body += _card("Processos", inner)

    pains = d.get("pain_points") or []
    if pains:
        inner = ""
        for pp in pains:
            inner += (f'<p class="pain"><strong>{_e(pp.get("title"))}</strong> '
                      f'<span class="tag warning">{_e(pp.get("business_impact"))}</span><br>'
                      f'{_e(pp.get("description"))}<br>'
                      f'<span class="muted">Custo estimado: {_e(pp.get("estimated_cost"))} · {_e(pp.get("evidence"))}</span></p>')
        body += _card("Pontos de dor", inner)

    rels = d.get("relationships") or []
    if rels:
        inner = "".join(f'<p class="pain"><strong>Acoplamento ({_e(r.get("coupling_level"))}) → {_e(r.get("target_domain"))}</strong>'
                        f'<br><span class="muted">{_e(r.get("description"))}</span></p>' for r in rels)
        body += _card("Acoplamento", inner)

    return body


# ---------------------------------------------------------------------------
# Views de negócio transversais
# ---------------------------------------------------------------------------

def render_inventory(bmap):
    bms = bmap.get("business_modules") or []
    if not bms:
        return None
    html = ""
    for bm in bms:
        ent = [[_e(e.get("name")), _e(e.get("business_description")), _tags(e.get("evidence"))]
               for e in (bm.get("primary_entities") or [])]
        brc = [[_e(c.get("id")), _e(c.get("summary")), _e(c.get("trigger_or_condition")), _tags(c.get("affected_entities"))]
               for c in (bm.get("business_rule_clusters") or [])]
        inner = (f'<p>{_e(bm.get("capability_summary"))}</p>'
                 f'<p class="card-sub">Entidades primárias</p>' + _table(["Entidade", "Descrição", "Evidência"], ent) +
                 f'<p class="card-sub">Clusters de regras</p>' + _table(["ID", "Resumo", "Gatilho/condição", "Entidades"], brc) +
                 f'<p class="card-sub">Módulos de código</p>' + _tags(bm.get("maps_to_code_module_ids")))
        html += _card(f'{bm.get("id","BM")} · {bm.get("name","")}', inner)
    return html


def render_crosswalk(bmap):
    cc = bmap.get("cross_cutting_views") or {}
    xw = cc.get("entity_rule_crosswalk") or []
    if not xw and not cc.get("domain_hypothesis_notes"):
        return None
    rows = [[_e(x.get("entity")), _tags(x.get("business_module_ids")), _tags(x.get("rule_cluster_ids")), _e(x.get("notes"))] for x in xw]
    inner = _table(["Entidade", "Módulos de negócio", "Clusters de regra", "Notas"], rows)
    if cc.get("domain_hypothesis_notes"):
        inner += f'<p class="card-sub">Fronteiras / acoplamento</p><p>{_e(cc.get("domain_hypothesis_notes"))}</p>'
    return _card("Crosswalk entidade × regra × módulo", inner)


def render_rules_catalog(bmap):
    rules = bmap.get("business_rules") or []
    if not rules:
        return None
    rows = [[_e(r.get("id")), _e(r.get("name")), _e(r.get("category")), _e(r.get("business_rationale")),
             _e(r.get("business_impact_if_violated")), _e(r.get("example_scenario")),
             _e((r.get("implementation") or {}).get("location"))] for r in rules]
    return _card("Regras de negócio (catálogo)",
                 _table(["ID", "Nome", "Categoria", "Racional", "Impacto se violada", "Cenário", "Local"], rows))


def render_process_catalog(bmap):
    procs = bmap.get("processes") or []
    if not procs:
        return None
    html = ""
    for p in procs:
        inner = f'<p class="muted">{_e(p.get("description"))}</p>'
        srows = [[_e(s.get("order")), _e(s.get("name")), _e(s.get("actor")), _e(s.get("action")), _e(s.get("outcome"))]
                 for s in (p.get("steps") or [])]
        if srows:
            inner += _table(["#", "Passo", "Ator", "Ação", "Resultado"], srows)
        html += _card(f'{p.get("id","PROC")} · {p.get("name","")}', inner)
    return html


def render_opportunities(bmap):
    opps = bmap.get("opportunities") or []
    if not opps:
        return None
    rows = []
    for o in opps:
        spec = o.get("ai_agent_spec") or {}
        st = (f"in: {_e(spec.get('input'))} · out: {_e(spec.get('output'))} · valor: {_e(spec.get('financial_value'))}"
              if spec else "")
        rows.append([_e(o.get("id")), _e(o.get("title")), _e(o.get("category")),
                     _e(o.get("business_value")), _e(o.get("business_problem_solved")), st])
    return _card("Oportunidades",
                 _table(["ID", "Título", "Categoria", "Valor", "Problema resolvido", "Spec (ai_agent)"], rows))


def render_value_chain(bmap):
    vc = (bmap.get("value_chain") or {}).get("cycles") or []
    db = bmap.get("database_analysis") or {}
    cx = bmap.get("complexity") or {}
    if not vc and not db and not cx:
        return None
    inner = ""
    if vc:
        rows = [[_e(c.get("name")), _e(c.get("description")), _tags(c.get("stakeholders")), _tags(c.get("kpis"))] for c in vc]
        inner += _card("Ciclos de valor", _table(["Ciclo", "Descrição", "Stakeholders", "KPIs"], rows))
    if cx:
        inner += _card("Complexidade de migração",
                       f'<p>Score <strong>{_e(cx.get("score"))}/100</strong> — {_e(cx.get("classification"))} '
                       f'(tecnologia {_e(cx.get("technology_subtotal"))} · negócio {_e(cx.get("business_subtotal"))})</p>')
    if db:
        dinner = f'<p>{_e(db.get("total_tables"))} tabela(s). Complexidade: {_e((db.get("complexity") or {}).get("score"))}.</p>'
        for label, key in [("Smells", "complexity_smells"), ("Lógica no BD", "business_logic_in_db"), ("Vendor lock-in", "vendor_lock_in")]:
            if db.get(key):
                dinner += f'<p class="card-sub">{label}</p>' + _tags(db.get(key))
        inner += _card("Análise de banco", dinner)
    return inner


DOC_TABS = [
    ("Legado AS-IS", "legacy.md", "tech-legacy"),
    ("Arquitetura", "architecture.md", "tech-arch"),
    ("Análise de Legado", "legacy-analysis.md", "tech-analysis"),
    ("Modelo de Ameaças", "threat-model.md", "tech-threats"),
]

DEFAULT_BASE_DIR = "outputs/spec"
# Sem default hardcodado: `--templates-dir` omitido → descoberta do espelho compatível
# (`_report.discover_templates_dir`). Ver a nota no topo do arquivo.
DEFAULT_GRAPHIFY_DIR = "outputs/spec/graphify-out"
DEFAULT_BUSINESS_MAP = "outputs/spec/business-map.json"


RECOMMENDED_MAX_MB = 3.0  # teto recomendado para o kit abrir fluido no navegador


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Kit HTML do AS-IS (spec-legacy) — layout sidebar/consultoria.")
    p.add_argument("--base-dir", default=DEFAULT_BASE_DIR)
    p.add_argument(
        "--templates-dir",
        default=None,
        help=("Pasta com report-embedded.css. Default: descoberta do primeiro espelho "
              "COMPATÍVEL (versão + seletores do CSS) — `spec-report/templates` em "
              + ", ".join(_report.TEMPLATES_MIRROR_ROOTS)
              + " (nessa ordem), ou o diretório irmão do próprio script."),
    )
    p.add_argument("--graphify-dir", default=DEFAULT_GRAPHIFY_DIR)
    p.add_argument("--business-map", default=DEFAULT_BUSINESS_MAP)
    p.add_argument("--out", default=None)
    p.add_argument("--no-minify", action="store_true", help="nao minificar (debug)")
    p.add_argument("--gzip", action="store_true", help="gerar tambem .html.gz / .json.gz (mantem as copias legiveis)")
    p.add_argument("--max-graph-nodes", type=int, default=1500,
                   help="max. de nos na visualizacao embutida do grafo (padrao 1500; alvo < 5000)")
    return p.parse_args(argv)


# ---------------------------------------------------------------------------
# Minificacao deterministica (protege <pre>/<script>/<style>/<textarea>)
# ---------------------------------------------------------------------------

def minify_css(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{}:;,>])\s*", r"\1", css)
    css = css.replace(";}", "}")
    return css.strip()


def minify_js(js):
    """Conservador: remove linhas em branco e a indentacao inicial, PRESERVANDO
    as quebras de linha (evita quebrar ASI). Nao toca no conteudo das linhas."""
    out = []
    for line in js.split("\n"):
        s = line.strip()
        if not s:
            continue
        if s.startswith("//"):
            continue
        out.append(s)
    return "\n".join(out)


_PROTECT_RE = re.compile(
    r"(<(pre|script|style|textarea)\b[^>]*>.*?</\2>)", re.DOTALL | re.IGNORECASE)


def minify_html(doc):
    """Colapsa espaco entre tags fora de regioes protegidas. Deterministico."""
    blocks = []

    def stash(m):
        blocks.append(m.group(1))
        return f"\x00{len(blocks) - 1}\x00"

    tmp = _PROTECT_RE.sub(stash, doc)
    tmp = re.sub(r"<!--(?!\[if).*?-->", "", tmp, flags=re.DOTALL)
    tmp = re.sub(r">\s+<", "><", tmp)
    tmp = re.sub(r"[ \t]{2,}", " ", tmp)
    tmp = re.sub(r"\n\s*\n", "\n", tmp)

    def restore(m):
        return blocks[int(m.group(1))]

    return re.sub(r"\x00(\d+)\x00", restore, tmp)


def smoke_check(html_text):
    """Valida que o HTML gerado ainda e estruturalmente sao. Retorna lista de problemas."""
    problems = []
    low = html_text.lower()
    if "<!doctype html" not in low:
        problems.append("sem <!DOCTYPE html>")
    for tag in ("<html", "</html>", "<body", "</body>"):
        if tag not in low:
            problems.append(f"sem {tag}")
    if low.count("<script") != low.count("</script>"):
        problems.append("tags <script> desbalanceadas")
    if low.count("<style") != low.count("</style>"):
        problems.append("tags <style> desbalanceadas")
    if "window.__graph__=" in low and "</script>" not in low:
        problems.append("bloco de dados do grafo truncado")
    try:
        from html.parser import HTMLParser

        class _P(HTMLParser):
            pass
        _P().feed(html_text)
    except Exception as e:  # noqa: BLE001
        problems.append(f"parser HTML falhou: {e}")
    return problems


BASE_CSS = """
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap");
:root{
  --bg:#f5f7fa; --bg-surface:#ffffff; --bg-elevated:#ffffff; --bg-soft:#eef2f7; --bg-hover:#e5ebf3;
  --text:#202632; --text-primary:#202632; --text-secondary:#414b59; --text-muted:#697485; --text-faint:#97a1b0;
  --accent:#123c7a; --accent-hover:#0d2f61; --accent-strong:#0a244b; --accent-soft:rgba(18,60,122,.09); --accent-fg:#ffffff;
  --border:#dbe1ea; --border-strong:#c2cbd8;
  --radius-sm:10px; --radius-xs:6px;
  --shadow-sm:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.10);
  --font-display:'Outfit',system-ui,sans-serif; --font-body:'Source Sans 3',system-ui,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
html,body{background:var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.55;}
h1,h2,h3,h4{font-family:var(--font-display);color:var(--text);}
a{color:var(--accent);}
.md-content>*:first-child{margin-top:0;}
.md-content h1{font-size:1.5rem;font-weight:700;margin:0 0 1rem;letter-spacing:-.02em;}
.md-content h2{font-size:1.18rem;font-weight:700;margin:1.6rem 0 .6rem;padding-bottom:.3rem;border-bottom:1px solid var(--border);}
.md-content h3{font-size:1.04rem;font-weight:700;margin:1.3rem 0 .45rem;color:var(--text-secondary);}
.md-content h4{font-size:.95rem;font-weight:700;margin:1.1rem 0 .4rem;color:var(--text-secondary);}
.md-content p{margin:.75rem 0;}
.md-content ul,.md-content ol{padding-left:1.35rem;margin:.7rem 0;}
.md-content li{margin:.3rem 0;} .md-content li::marker{color:var(--accent);}
.md-content strong{color:var(--text);} .md-content hr{border:none;height:1px;background:var(--border-strong);margin:1.6rem 0;}
.md-content blockquote{margin:1.1rem 0;padding:.7rem 1rem;border-left:4px solid var(--accent);background:var(--accent-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;color:var(--text-secondary);}
.md-table-scroll{margin:1rem 0;overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface);box-shadow:var(--shadow-sm);}
.md-content table,table.table-simple{width:100%;border-collapse:collapse;margin:0;font-size:.85rem;}
.md-content thead,table.table-simple thead{background:var(--bg-soft);}
.md-content th,table.table-simple th{font-family:var(--font-display);font-weight:600;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-secondary);text-align:left;padding:.55rem .8rem;border-bottom:2px solid var(--border-strong);}
.md-content td,table.table-simple td{padding:.5rem .8rem;border-bottom:1px solid var(--border);vertical-align:top;}
.md-content tbody tr:nth-child(even) td,table.table-simple tbody tr:nth-child(even) td{background:rgba(18,60,122,.03);}
.md-content tbody tr:last-child td,table.table-simple tbody tr:last-child td{border-bottom:none;}
.md-content code{font-family:var(--font-mono);font-size:.88em;background:var(--bg-soft);padding:.12em .4em;border-radius:4px;border:1px solid var(--border);color:var(--accent-strong);}
.md-content pre{margin:1rem 0;padding:1rem 1.1rem;background:#0f1b2a;color:#e6edf5;border-radius:var(--radius-sm);overflow-x:auto;font-family:var(--font-mono);font-size:.82rem;line-height:1.5;}
.md-content pre code{background:none;border:none;padding:0;color:inherit;}
pre.mermaid{background:transparent;color:inherit;border:1px dashed var(--border);padding:1rem;text-align:center;}
"""


SHELL_CSS = """
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body, 'Source Sans 3', sans-serif); }
.app { display: flex; min-height: 100vh; }
.sidebar { width: 288px; flex-shrink: 0; background: var(--bg-surface); border-right: 1px solid var(--border);
  position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; }
.sidebar-body { padding: 1.1rem .9rem; flex: 1; }
.sidebar-brand { padding: .4rem .5rem 1rem; border-bottom: 1px solid var(--border); margin-bottom: .8rem; }
.project-name { display: block; font-family: var(--font-display); font-weight: 700; font-size: 1.15rem; color: var(--accent); }
.brand-sub { display: block; color: var(--text-muted); font-size: .74rem; margin-top: .25rem; }
.brand-tag { display: block; color: var(--text-faint); font-size: .72rem; margin-top: .35rem; letter-spacing: .04em; }
.nav-item { display: block; width: 100%; text-align: left; appearance: none; border: none; background: none;
  cursor: pointer; font: inherit; font-size: .86rem; color: var(--text-secondary); padding: .45rem .6rem;
  border-radius: 7px; margin: .1rem 0; }
.nav-item:hover { background: var(--bg-soft); color: var(--accent); }
.nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.nav-item.sub { padding-left: 1.2rem; font-size: .82rem; }
.nav-section { margin-top: .5rem; }
.nav-section-toggle, .nav-sub-toggle { display: flex; align-items: center; gap: .4rem; width: 100%;
  appearance: none; border: none; background: none; cursor: pointer; font: inherit; padding: .4rem .5rem;
  color: var(--text-muted); font-family: var(--font-display); font-weight: 700; font-size: .74rem;
  text-transform: uppercase; letter-spacing: .06em; }
.nav-sub-toggle { text-transform: none; letter-spacing: 0; font-size: .8rem; color: var(--text-secondary); padding-left: .9rem; }
.nav-chevron { transition: transform .18s ease; font-size: .7rem; }
.is-collapsed > .nav-section-body, .is-collapsed > .nav-sub-body { display: none; }
.is-collapsed .nav-chevron { transform: rotate(-90deg); }
.nav-section-inner, .nav-sub-body { padding-left: .2rem; }
.sidebar-footer { padding: .8rem 1rem; border-top: 1px solid var(--border); color: var(--text-faint); font-size: .74rem; }
.main { flex: 1; min-width: 0; padding: 2rem 2.5rem 4rem; }
.main-inner { max-width: 1040px; margin: 0 auto; }
.view-panel { display: none; animation: fadeIn .25s ease; }
.view-panel.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-sm, 10px);
  padding: 1.1rem 1.3rem; margin: 0 0 1.1rem; box-shadow: var(--shadow-sm); }
.card-kicker { font-family: var(--font-display); font-size: .72rem; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--accent); margin: 0 0 .3rem; }
.card-title { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; margin: 0 0 .6rem; color: var(--text); }
.card-sub { font-family: var(--font-display); font-weight: 700; font-size: .72rem; text-transform: uppercase;
  letter-spacing: .05em; color: var(--text-muted); margin: .9rem 0 .3rem; }
.tag { display: inline-block; font-size: .72rem; font-family: var(--font-mono); color: var(--text-secondary);
  background: var(--bg-soft); border: 1px solid var(--border); border-radius: 9999px; padding: .1rem .5rem; margin: .12rem .25rem .12rem 0; }
.tag.warning { background: #fff4e5; border-color: #f0c088; color: #8a5a00; }
.muted { color: var(--text-muted); }
.overview-layout { display: grid; grid-template-columns: minmax(0,1fr) 260px; gap: 1.2rem; align-items: start; }
.overview-side { position: sticky; top: 1rem; }
.overview-meta-row { margin: .6rem 0; }
.overview-body-text { font-size: 1.02rem; line-height: 1.6; color: var(--text-secondary); }
.snap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
.snap { text-align: center; padding: .5rem; background: var(--bg-soft); border-radius: 8px; }
.snap-v { display: block; font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--accent); }
.snap-l { display: block; font-size: .68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
ul.clean { list-style: none; padding: 0; margin: 0; }
ul.clean li { padding: .5rem 0; border-bottom: 1px solid var(--border); }
ul.clean li:last-child { border-bottom: none; }
.story { margin: .4rem 0; padding: .55rem .85rem; border-left: 3px solid var(--accent); background: var(--accent-soft);
  border-radius: 0 8px 8px 0; font-style: italic; color: var(--text-secondary); }
.pain { margin: .5rem 0; padding: .5rem .75rem; background: var(--bg-soft); border-radius: 8px; }
.graph-wrap { display: flex; flex-direction: column; gap: .6rem; }
.graph-note { color: var(--text-muted); font-size: .82rem; margin: 0; }
.graph-frame { width: 100%; height: 78vh; min-height: 520px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-surface); display: block; }
canvas.graph-frame { cursor: default; touch-action: none; }
.graph-legend { display: flex; flex-wrap: wrap; gap: .25rem; margin: .2rem 0 .4rem; }
.graph-empty { border: 1px dashed var(--border-strong); border-radius: 10px; padding: 2rem; background: var(--bg-soft); }
.graph-cmd { background: #0f1b2a; color: #e6edf5; padding: 1rem 1.15rem; border-radius: 8px; font-family: var(--font-mono); font-size: .82rem; overflow-x: auto; }
.tab-missing { color: var(--text-muted); font-style: italic; padding: 2rem 0; }
@media (max-width: 860px) { .app { flex-direction: column; } .sidebar { width: 100%; height: auto; position: static; }
  .overview-layout { grid-template-columns: 1fr; } .main { padding: 1.2rem; } }
@media print { .sidebar { display: none; } .view-panel { display: block !important; } .graph-frame { height: 60vh; } }
"""

NAV_JS = """
(function () {
  function panels(){ return document.querySelectorAll('[data-view-panel]'); }
  function activate(id){
    document.querySelectorAll('[data-view]').forEach(function(b){ b.classList.toggle('active', b.dataset.view===id); });
    panels().forEach(function(p){ p.classList.toggle('active', p.dataset.viewPanel===id); });
    var btn=document.querySelector('[data-view="'+id+'"]');
    if(btn){ var sec=btn.closest('.nav-section, .nav-sub-block'); while(sec){ sec.classList.remove('is-collapsed'); sec=sec.parentElement&&sec.parentElement.closest('.nav-section, .nav-sub-block'); } }
    var panel=document.querySelector('[data-view-panel="'+id+'"]');
    if(panel&&window.mermaid){ try{ window.mermaid.run({nodes: panel.querySelectorAll('.mermaid')}); }catch(e){} }
    try{ history.replaceState(null,'','#'+id); }catch(e){}
    var main=document.querySelector('.main'); if(main) main.scrollTop=0; window.scrollTo(0,0);
  }
  document.querySelectorAll('[data-view]').forEach(function(b){ b.addEventListener('click', function(){ activate(b.dataset.view); }); });
  document.querySelectorAll('.nav-section-toggle, .nav-sub-toggle').forEach(function(t){
    t.addEventListener('click', function(){ t.closest('.nav-section, .nav-sub-block').classList.toggle('is-collapsed'); }); });
  var initial=(location.hash||'').replace('#',''); 
  activate(document.querySelector('[data-view="'+initial+'"]') ? initial : 'overview');
})();
"""


def _nav_item(view, label, sub=False):
    cls = "nav-item sub" if sub else "nav-item"
    return f'<button class="{cls}" data-view="{_e(view)}">{_e(label)}</button>'


def _panel(view, inner, active=False):
    cls = "view-panel active" if active else "view-panel"
    return f'<div class="{cls}" data-view-panel="{_e(view)}" id="view-{_e(view)}"><div class="main-inner">{inner}</div></div>'


def main():
    args = parse_args()
    base_dir = args.base_dir

    # Templates ANTES de criar qualquer diretório de saída: sem o tema o kit sairia sem
    # `report-embedded`/`section.domain` e com exit 0. Guard idêntico ao do gêmeo —
    # aborta com exit 1 e não grava nada.
    templates_dir = _report.discover_templates_dir(args.templates_dir, require_shell=False)
    _, css_content, problems = _report.inspect_templates_dir(templates_dir, require_shell=False)
    if problems:
        _report.abort_incompatible_templates(templates_dir, problems)

    out_path = args.out or os.path.join(base_dir, "report", "legacy-as-is-kit.html")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    bmap = {}
    if os.path.exists(args.business_map):
        try:
            bmap = json.loads(read_file(args.business_map))
        except ValueError as e:
            print(f"AVISO: business-map.json inválido ({e}) — seções de negócio omitidas.", file=sys.stderr)

    project_name = extract_project_name(base_dir, bmap)
    today = date.today().isoformat()

    # índices por domínio
    rules_by_dom, procs_by_dom = {}, {}
    for r in bmap.get("business_rules") or []:
        for dm in r.get("affected_domains") or []:
            rules_by_dom.setdefault(dm, []).append(r)
    for p in bmap.get("processes") or []:
        for dm in p.get("primary_domain_ids") or []:
            procs_by_dom.setdefault(dm, []).append(p)

    nav = []
    panels = []

    # Visão geral (capa)
    nav.append(_nav_item("overview", "Visão geral"))
    panels.append(_panel("overview", render_overview(bmap, project_name, today), active=True))

    # ---- NEGÓCIO ----
    doms = bmap.get("domains") or []
    biz_inner = ""
    dom_items = ""
    for d in doms:
        vid = "dom-" + str(d.get("id", "")).lower()
        dom_items += _nav_item(vid, d.get("name", d.get("id", "Domínio")), sub=True)
        panels.append(_panel(vid, render_domain(d, rules_by_dom, procs_by_dom)))
    cross = [("bus-inv", "Inventário de Negócio", render_inventory(bmap)),
             ("bus-xwalk", "Crosswalk", render_crosswalk(bmap)),
             ("bus-rules", "Regras de Negócio", render_rules_catalog(bmap)),
             ("bus-proc", "Processos", render_process_catalog(bmap)),
             ("bus-opp", "Oportunidades", render_opportunities(bmap)),
             ("bus-vc", "Cadeia de Valor", render_value_chain(bmap))]
    cross_items = ""
    for vid, label, html in cross:
        if html:
            cross_items += _nav_item(vid, label, sub=True)
            panels.append(_panel(vid, html))
    if doms or cross_items:
        dom_group = ""
        if doms:
            dom_group = ('<div class="nav-sub-block"><button class="nav-sub-toggle">'
                         '<span class="nav-chevron">▾</span><span>Domínios</span></button>'
                         f'<div class="nav-sub-body">{dom_items}</div></div>')
        nav.append('<div class="nav-section"><button class="nav-section-toggle">'
                   '<span class="nav-chevron">▾</span><span class="nav-section-title">Negócio</span></button>'
                   f'<div class="nav-section-body"><div class="nav-section-inner">{dom_group}{cross_items}</div></div></div>')

    # ---- TECNOLOGIA ----
    tech_items = ""
    for label, rel, vid in DOC_TABS:
        fp = os.path.join(base_dir, rel)
        if os.path.exists(fp):
            inner = f'<div class="md-content">{md_to_html(read_file(fp))}</div>'
        elif vid == "tech-legacy":
            inner = f'<p class="tab-missing">Artefato <code>{_e(rel)}</code> não gerado neste ciclo.</p>'
        else:
            continue
        tech_items += _nav_item(vid, label, sub=True)
        panels.append(_panel(vid, inner))
    # achados do grafo (graph_findings — Passo 0.6)
    gf_html = render_graph_findings(bmap)
    if gf_html:
        tech_items += _nav_item("tech-graph-findings", "Achados do Grafo", sub=True)
        panels.append(_panel("tech-graph-findings", gf_html))
    # grafo (viewer reduzido embutido + link para o completo)
    tech_items += _nav_item("tech-graph", "Grafo do Legado", sub=True)
    graph_dir = find_graph_dir(args.graphify_dir, base_dir)
    report_dir = os.path.dirname(out_path)
    panels.append(_panel("tech-graph", build_graph_panel(
        graph_dir, report_dir, max_nodes=args.max_graph_nodes, gzip_out=args.gzip)))
    nav.append('<div class="nav-section"><button class="nav-section-toggle">'
               '<span class="nav-chevron">▾</span><span class="nav-section-title">Tecnologia</span></button>'
               f'<div class="nav-section-body"><div class="nav-section-inner">{tech_items}</div></div></div>')

    css_all = "\n".join([BASE_CSS, css_content, SHELL_CSS])
    nav_js = NAV_JS
    if not args.no_minify:
        css_all = minify_css(css_all)
        nav_js = minify_js(NAV_JS)

    doc = f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_e(project_name)} — Kit AS-IS</title>
<style>{css_all}</style></head>
<body>
<div class="app">
  <aside class="sidebar"><div class="sidebar-body">
    <div class="sidebar-brand">
      <span class="project-name">{_e(project_name)}</span>
      <span class="brand-sub">Diagnóstico do Legado (AS-IS) · {today}</span>
      <span class="brand-tag">Explorar · Validar · Perguntar</span>
    </div>
    <nav>{''.join(nav)}</nav>
  </div><footer class="sidebar-footer">spec-legacy · gerado automaticamente</footer></aside>
  <main class="main">{''.join(panels)}</main>
</div>
<!-- securityLevel 'strict' (mesmo do report-shell.html): o label volta por innerHTML,
     mas passa por DOMPurify. Em 'loose' um `<img src=x onerror=…>` num label vindo de
     um .md de spec envenenado executaria. Nenhum diagrama do kit usa click/callback. -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"></script>
<script>if(window.mermaid){{window.mermaid.initialize({{startOnLoad:false,theme:'neutral',securityLevel:'strict'}});}}</script>
<script>{nav_js}</script>
</body></html>
"""
    if not args.no_minify:
        doc = minify_html(doc)

    problems = smoke_check(doc)
    if problems:
        print("AVISO(smoke): " + "; ".join(problems), file=sys.stderr)

    with codecs.open(out_path, "w", "utf-8") as f:
        f.write(doc)
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    if args.gzip:
        with open(out_path, "rb") as fi, gzip.open(out_path + ".gz", "wb") as fo:
            shutil.copyfileobj(fi, fo)

    print(f"Kit AS-IS gerado em {out_path} ({size_mb:.2f} MB)")
    if size_mb > RECOMMENDED_MAX_MB:
        print(f"AVISO: kit acima do teto recomendado ({RECOMMENDED_MAX_MB:.0f} MB) — "
              "o grafo completo ja esta so linkado (legacy-graph-full.html); "
              "reduza --max-graph-nodes se necessario.", file=sys.stderr)
    if not problems:
        print("smoke check: OK")


if __name__ == "__main__":
    main()
