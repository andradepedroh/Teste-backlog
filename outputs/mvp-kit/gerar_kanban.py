"""Kanban de MVP: épicos em colunas, histórias em cartões (só descrição).

Uso: python3 gerar_kanban.py <pasta-do-mvp>
Lê <pasta>/backlog.json e grava <pasta>/kanban.html.

backlog.json:
{
  "projeto": "Nome", "versao": "0.1", "data": "AAAA-MM-DD",
  "epicos": [
    {"id": "EP-01", "nome": "...", "objetivo": "uma frase",
     "historias": [
       {"id": "HU-01", "titulo": "...", "descricao": "Como X, quero Y, para Z.",
        "prioridade": "Alta|Média|Baixa", "status": "pronta|depende-decisao|bloqueada|fora-do-mvp",
        "decisoes": ["PEND-01"], "fonte": "arquivo de input, seção"}
     ]}
  ]
}
"""
import html
import json
import sys
from pathlib import Path

PASTA = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
d = json.loads((PASTA / "backlog.json").read_text(encoding="utf-8"))
e = html.escape
ROTULO = {"pronta": "Pronta", "depende-decisao": "Depende de decisão", "bloqueada": "Bloqueada", "fora-do-mvp": "Fora do MVP"}

colunas, total, por_status = [], 0, {}
for ep in d["epicos"]:
    cards = []
    for h in ep["historias"]:
        total += 1
        st = h.get("status", "pronta")
        por_status[st] = por_status.get(st, 0) + 1
        decs = "".join(f'<span class="tag dec">{e(x)}</span>' for x in h.get("decisoes", []))
        busca = e(" ".join([h["id"], h["titulo"], h["descricao"], st, " ".join(h.get("decisoes", []))]).lower())
        cards.append(f"""
      <article class="card st-{e(st)}" data-busca="{busca}" data-st="{e(st)}">
        <div class="card-top"><span class="id">{e(h["id"])}</span><span class="tag prio">{e(h.get("prioridade", "—"))}</span></div>
        <h3>{e(h["titulo"])}</h3>
        <p>{e(h["descricao"])}</p>
        <div class="tags"><span class="tag s-{e(st)}">{e(ROTULO.get(st, st))}</span>{decs}</div>
        {f'<div class="fonte">Fonte: {e(h["fonte"])}</div>' if h.get("fonte") else ""}
      </article>""")
    colunas.append(f"""
    <section class="col" data-col>
      <header class="col-h">
        <span class="fid">{e(ep["id"])}</span>
        <h2>{e(ep["nome"])}</h2>
        <p class="resumo">{e(ep.get("objetivo", ""))}</p>
        <p class="meta"><strong><span data-count>{len(cards)}</span> histórias</strong></p>
      </header>
      <div class="cards">{"".join(cards)}</div>
    </section>""")

stats = "".join(f'<div class="stat"><b>{n}</b><span>{e(ROTULO.get(k, k))}</span></div>' for k, n in por_status.items())
botoes = "".join(f'<button type="button" data-f="{k}">{e(v)}</button>' for k, v in ROTULO.items() if k in por_status)
pagina = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kanban do MVP</title>
<style>
:root{--bg:#f5f4f8;--sf:#fff;--sf2:#f0eef6;--tx:#1d1a2b;--mu:#5f5a73;--bd:#dcd8e8;--ac:#4b2a8f;--acs:#ece6fa;--ok:#1e6b3a;--oks:#e3f3e8;--wa:#8a5a00;--was:#fbf0d9;--ba:#9b1c1c;--bas:#fbe4e4}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15131d;--sf:#1f1c2a;--sf2:#282436;--tx:#ece9f5;--mu:#a9a3bd;--bd:#38334a;--ac:#b9a3ff;--acs:#2e2650;--ok:#7fd49c;--oks:#1d3326;--wa:#f0c46a;--was:#3a2f17;--ba:#ff9a9a;--bas:#3d1c1c}}
:root[data-theme="dark"]{--bg:#15131d;--sf:#1f1c2a;--sf2:#282436;--tx:#ece9f5;--mu:#a9a3bd;--bd:#38334a;--ac:#b9a3ff;--acs:#2e2650;--ok:#7fd49c;--oks:#1d3326;--wa:#f0c46a;--was:#3a2f17;--ba:#ff9a9a;--bas:#3d1c1c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.top{padding:20px 16px 8px;max-width:1400px;margin:0 auto}h1{margin:0 0 4px;font-size:22px}.sub{margin:0 0 14px;color:var(--mu)}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}.stat{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:10px 14px;min-width:110px}.stat b{display:block;font-size:20px}.stat span{color:var(--mu);font-size:12px}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.bar input{flex:1;min-width:200px;padding:9px 12px;border-radius:8px;border:1px solid var(--bd);background:var(--sf);color:var(--tx);font:inherit}
.bar button{padding:8px 12px;border-radius:8px;border:1px solid var(--bd);background:var(--sf);color:var(--tx);font:inherit;cursor:pointer}.bar button.on{background:var(--acs);color:var(--ac);border-color:var(--ac)}
.board{display:flex;gap:12px;overflow-x:auto;padding:8px 16px 24px;align-items:flex-start}
.col{flex:0 0 300px;background:var(--sf2);border:1px solid var(--bd);border-radius:12px;display:flex;flex-direction:column;max-height:calc(100vh - 40px)}
.col-h{padding:12px;border-bottom:1px solid var(--bd)}.fid{font-weight:700;color:var(--ac);background:var(--acs);border-radius:6px;padding:1px 8px}
.col-h h2{font-size:15px;margin:8px 0 4px}.resumo{margin:0 0 6px;font-size:12.5px}.meta{margin:2px 0;font-size:12px;color:var(--mu)}
.cards{padding:10px;display:flex;flex-direction:column;gap:8px;overflow-y:auto}
.card{background:var(--sf);border:1px solid var(--bd);border-left:4px solid var(--ok);border-radius:10px;padding:10px 11px}
.card.st-depende-decisao{border-left-color:var(--wa)}.card.st-bloqueada{border-left-color:var(--ba)}.card.st-fora-do-mvp{opacity:.6;border-left-color:var(--mu)}
.card-top{display:flex;justify-content:space-between;font-size:11.5px;color:var(--mu)}.id{font-family:ui-monospace,Menlo,Consolas,monospace}
.card h3{font-size:13.5px;margin:4px 0}.card p{margin:0 0 8px;font-size:12.5px}
.tags{display:flex;flex-wrap:wrap;gap:4px}.tag{font-size:11px;border-radius:6px;padding:1px 7px}.prio{background:var(--acs);color:var(--ac)}
.s-pronta{background:var(--oks);color:var(--ok)}.s-depende-decisao,.dec{background:var(--was);color:var(--wa)}.s-bloqueada{background:var(--bas);color:var(--ba)}.s-fora-do-mvp{background:var(--sf2);color:var(--mu)}
.fonte{margin-top:6px;font-size:11px;color:var(--mu)}.hidden{display:none}
@media (max-width:700px){.board{flex-direction:column}.col{flex:1 1 auto;width:100%;max-height:none}}
</style></head><body>
<div class="top">
  <h1>__PROJ__ — Kanban do MVP</h1>
  <p class="sub">versão __VER__ · __DATA__ · __EP__ épicos · __TOT__ histórias · só descrição (sem critérios e tarefas)</p>
  <div class="stats">__STATS__</div>
  <div class="bar"><input id="q" type="search" placeholder="Filtrar histórias" aria-label="Filtrar histórias">__BOTOES__<button id="tema" type="button">Tema</button></div>
</div>
<main class="board">__COLS__</main>
<script>
let filtroSt=null;const q=document.getElementById('q');
function aplica(){const t=q.value.trim().toLowerCase();document.querySelectorAll('[data-col]').forEach(c=>{let n=0;c.querySelectorAll('.card').forEach(k=>{const ok=(!t||k.dataset.busca.includes(t))&&(!filtroSt||k.dataset.st===filtroSt);k.classList.toggle('hidden',!ok);if(ok)n++});c.querySelector('[data-count]').textContent=n})}
q.addEventListener('input',aplica);
document.querySelectorAll('[data-f]').forEach(b=>b.addEventListener('click',()=>{filtroSt=filtroSt===b.dataset.f?null:b.dataset.f;document.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('on',x.dataset.f===filtroSt));aplica()}));
document.getElementById('tema').addEventListener('click',()=>{const r=document.documentElement;const esc=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=esc?'light':'dark'});
</script></body></html>
"""
for k, v in {"__PROJ__": e(d["projeto"]), "__VER__": e(str(d.get("versao", ""))), "__DATA__": e(d.get("data", "")), "__EP__": len(d["epicos"]),
             "__TOT__": total, "__STATS__": stats, "__BOTOES__": botoes, "__COLS__": "".join(colunas)}.items():
    pagina = pagina.replace(k, str(v))
(PASTA / "kanban.html").write_text(pagina, encoding="utf-8")
print(f"kanban.html: {len(d['epicos'])} épicos, {total} histórias {por_status}")
