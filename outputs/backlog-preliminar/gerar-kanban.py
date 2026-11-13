"""Gera kanban.html a partir de backlog.json (mesma pasta). Uso: python3 gerar-kanban.py"""
import html
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
d = json.loads((AQUI / "backlog.json").read_text(encoding="utf-8"))
e = html.escape


def horas(h):
    return "—" if h is None else f"{h} h"


colunas = []
total_tarefas = 0
total_horas = 0
for f in d["funcionalidades"]:
    hs = sum(t["horas"] or 0 for t in f["tarefas"])
    total_tarefas += len(f["tarefas"])
    total_horas += hs
    cards = []
    for t in f["tarefas"]:
        regras = "".join(f'<span class="tag regra">{e(r)}</span>' for r in t["regras"])
        busca = e(" ".join([t["id"], t["titulo"], t["descricao"], t["objeto"], " ".join(t["regras"])]).lower())
        cards.append(f"""
      <article class="card" data-busca="{busca}">
        <div class="card-top"><span class="id">{e(t["id"])}</span><span class="h">{horas(t["horas"])}</span></div>
        <h3>{e(t["titulo"])}</h3>
        <p>{e(t["descricao"])}</p>
        <div class="tags"><span class="tag obj">{e(t["objeto"])}</span>{regras}</div>
        <div class="fonte">Fonte: {e(t["fonte"])}</div>
      </article>""")
    status_cls = "parcial" if f["status_v1"].lower().startswith("parcial") else "v1"
    colunas.append(f"""
    <section class="col" data-col>
      <header class="col-h">
        <div class="col-top"><span class="fid">{e(f["id"])}</span><span class="status {status_cls}">{e(f["status_v1"])}</span></div>
        <h2>{e(f["nome"])}</h2>
        <p class="resumo">{e(f["resumo"])}</p>
        <p class="meta">{e(f["perfis"])}</p>
        <p class="meta"><strong><span data-count>{len(f["tarefas"])}</span> tarefas</strong> · {hs} h</p>
      </header>
      <div class="cards">{"".join(cards)}
      </div>
    </section>""")

fora = "".join(
    f'<li><strong>{e(x["etapa"])}</strong> — {x["horas"]} h <span class="muted">({e(x["obs"])})</span></li>'
    for x in d["esforco_fora_das_tarefas"]
)
atencao = "".join(
    f'<li><strong>{e(p["titulo"])}.</strong> {e(p["texto"])} <span class="muted">Fonte: {e(p["fonte"])}</span></li>'
    for p in d["pontos_de_atencao"]
)
fontes = " · ".join(f"<code>{e(k)}</code> {e(v)}" for k, v in d["fontes"].items())
total_geral = total_horas + 54 + 31

pagina = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backlog Cobrança 2.6</title>
<style>
:root {{
  --bg:#f5f4f8; --surface:#ffffff; --surface-2:#f0eef6; --text:#1d1a2b; --muted:#5f5a73;
  --border:#dcd8e8; --accent:#4b2a8f; --accent-soft:#ece6fa; --ok:#1e6b3a; --ok-soft:#e3f3e8;
  --warn:#8a5a00; --warn-soft:#fbf0d9; --rule:#0f5d73; --rule-soft:#e0f1f5;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --bg:#15131d; --surface:#1f1c2a; --surface-2:#282436; --text:#ece9f5; --muted:#a9a3bd;
    --border:#38334a; --accent:#b9a3ff; --accent-soft:#2e2650; --ok:#7fd49c; --ok-soft:#1d3326;
    --warn:#f0c46a; --warn-soft:#3a2f17; --rule:#7fd0e4; --rule-soft:#173039;
  }}
}}
:root[data-theme="dark"] {{
  --bg:#15131d; --surface:#1f1c2a; --surface-2:#282436; --text:#ece9f5; --muted:#a9a3bd;
  --border:#38334a; --accent:#b9a3ff; --accent-soft:#2e2650; --ok:#7fd49c; --ok-soft:#1d3326;
  --warn:#f0c46a; --warn-soft:#3a2f17; --rule:#7fd0e4; --rule-soft:#173039;
}}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }}
.top {{ padding:20px 16px 8px; max-width:1400px; margin:0 auto; }}
h1 {{ margin:0 0 4px; font-size:22px; }}
.sub {{ margin:0 0 14px; color:var(--muted); }}
.stats {{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }}
.stat {{ background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 14px; min-width:120px; }}
.stat b {{ display:block; font-size:20px; }}
.stat span {{ color:var(--muted); font-size:12px; }}
details {{ background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 14px; margin-bottom:10px; }}
summary {{ cursor:pointer; font-weight:600; }}
details ul {{ margin:8px 0 2px; padding-left:18px; }}
details li {{ margin:4px 0; }}
.muted {{ color:var(--muted); }}
.bar {{ display:flex; gap:10px; align-items:center; margin:12px 0 4px; flex-wrap:wrap; }}
.bar input {{ flex:1; min-width:200px; padding:9px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font:inherit; }}
.bar button {{ padding:9px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font:inherit; cursor:pointer; }}
.board {{ display:flex; gap:12px; overflow-x:auto; padding:8px 16px 24px; align-items:flex-start; }}
.col {{ flex:0 0 310px; background:var(--surface-2); border:1px solid var(--border); border-radius:12px; display:flex; flex-direction:column; max-height:calc(100vh - 40px); }}
.col-h {{ padding:12px 12px 10px; border-bottom:1px solid var(--border); }}
.col-top {{ display:flex; justify-content:space-between; align-items:center; }}
.fid {{ font-weight:700; color:var(--accent); background:var(--accent-soft); border-radius:6px; padding:1px 8px; }}
.status {{ font-size:11px; font-weight:600; border-radius:999px; padding:2px 8px; }}
.status.v1 {{ color:var(--ok); background:var(--ok-soft); }}
.status.parcial {{ color:var(--warn); background:var(--warn-soft); }}
.col-h h2 {{ font-size:15px; margin:8px 0 4px; }}
.resumo {{ margin:0 0 6px; font-size:12.5px; }}
.meta {{ margin:2px 0; font-size:12px; color:var(--muted); }}
.cards {{ padding:10px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; }}
.card {{ background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 11px; }}
.card-top {{ display:flex; justify-content:space-between; font-size:11.5px; color:var(--muted); }}
.id {{ font-family:ui-monospace,Menlo,Consolas,monospace; }}
.h {{ font-weight:600; color:var(--text); }}
.card h3 {{ font-size:13.5px; margin:4px 0; }}
.card p {{ margin:0 0 8px; font-size:12.5px; }}
.tags {{ display:flex; flex-wrap:wrap; gap:4px; }}
.tag {{ font-size:11px; border-radius:6px; padding:1px 7px; }}
.tag.obj {{ background:var(--accent-soft); color:var(--accent); }}
.tag.regra {{ background:var(--rule-soft); color:var(--rule); font-family:ui-monospace,Menlo,Consolas,monospace; }}
.fonte {{ margin-top:6px; font-size:11px; color:var(--muted); }}
.hidden {{ display:none; }}
footer {{ max-width:1400px; margin:0 auto; padding:0 16px 24px; color:var(--muted); font-size:12px; }}
code {{ font-size:11.5px; }}
@media (max-width:700px) {{
  .board {{ flex-direction:column; overflow-x:visible; }}
  .col {{ flex:1 1 auto; width:100%; max-height:none; }}
}}
</style>
</head>
<body>
<div class="top">
  <h1>Backlog preliminar — Cobrança Inteligente (2.6)</h1>
  <p class="sub">{e(d["projeto"])} · versão {e(d["versao"])} · {e(d["data"])} · {e(d["status"])}</p>
  <div class="stats">
    <div class="stat"><b>{len(d["funcionalidades"]) - 1} + 1</b><span>funcionalidades + transversal</span></div>
    <div class="stat"><b>{total_tarefas}</b><span>tarefas</span></div>
    <div class="stat"><b>{total_horas} h</b><span>horas nas tarefas</span></div>
    <div class="stat"><b>{total_geral} h</b><span>total com modelagem e contingência (ETF: 408 h)</span></div>
  </div>
  <details>
    <summary>Pontos de atenção ({len(d["pontos_de_atencao"])})</summary>
    <ul>{atencao}</ul>
  </details>
  <details>
    <summary>Esforço que não está nas horas dos cartões</summary>
    <ul>{fora}</ul>
  </details>
  <div class="bar">
    <input id="q" type="search" placeholder="Filtrar tarefas (ex.: régua, CPF, RN-09, Flow Designer)" aria-label="Filtrar tarefas">
    <button id="tema" type="button">Alternar tema</button>
  </div>
</div>
<main class="board">{"".join(colunas)}
</main>
<footer>Fontes: {fontes}. Gerado a partir de <code>backlog.json</code> por <code>gerar-kanban.py</code>.</footer>
<script>
const q = document.getElementById('q');
q.addEventListener('input', () => {{
  const termo = q.value.trim().toLowerCase();
  document.querySelectorAll('[data-col]').forEach(col => {{
    let n = 0;
    col.querySelectorAll('.card').forEach(c => {{
      const ok = !termo || c.dataset.busca.includes(termo);
      c.classList.toggle('hidden', !ok);
      if (ok) n++;
    }});
    col.querySelector('[data-count]').textContent = n;
  }});
}});
document.getElementById('tema').addEventListener('click', () => {{
  const r = document.documentElement;
  const escuro = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = escuro ? 'light' : 'dark';
}});
</script>
</body>
</html>
"""
(AQUI / "kanban.html").write_text(pagina, encoding="utf-8")
print(f"kanban.html gerado: {total_tarefas} tarefas, {total_horas} h nas tarefas, {total_geral} h no total")
