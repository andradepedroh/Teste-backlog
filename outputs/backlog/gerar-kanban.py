"""Gera kanban.html (esta pasta) a partir de outputs/spec/tasks.json — só descrições, sem horas.

Uso (da raiz do repositório): python3 outputs/backlog/gerar-kanban.py
"""
import html
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
T = json.loads((AQUI.parent / "spec" / "tasks.json").read_text(encoding="utf-8"))
e = html.escape
PRIOR = {"CRITICAL": "Crítica", "HIGH": "Alta", "MEDIUM": "Média", "LOW": "Baixa"}
TIPO = {"backend": "Servidor", "frontend": "Tela", "integration": "Integração", "documentation": "Investigação", "infrastructure": "Plataforma"}


def ordem(x):
    return (x.get("executionOrder") or 10**6, x["id"])


stories = sorted(T["stories"], key=ordem)
colunas, n_hist, n_tar = [], 0, 0
for ep in sorted(T["epics"], key=lambda x: x["id"]):
    cards = []
    for s in [s for s in stories if s.get("epicId") == ep["id"]]:
        n_hist += 1
        n_tar += len(s["tasks"])
        us = s.get("userStory") or {}
        descricao = f"Como {us.get('asA', '')}, quero {us.get('iWant', '')}, para {us.get('soThat', '')}." if us else s["narrative"]["elevatorPitch"]
        descricao = descricao.replace("?,", ",")
        selos = [f'<span class="tag prio">{PRIOR.get(s.get("priority"), "—")}</span>']
        if s.get("workItemType") and s["workItemType"] != "USER_STORY":
            selos.append(f'<span class="tag tipo">{ {"SPIKE": "Investigação", "ENABLER": "Base técnica"}.get(s["workItemType"], s["workItemType"]) }</span>')
        if "BLOQUEADO" in s["name"]:
            selos.append('<span class="tag bloq">Bloqueada — GAP-028</span>')
        if any(t.get("class") == "security" for t in s["tasks"]):
            selos.append('<span class="tag sec">Segurança</span>')
        if s.get("mustImplementFirst"):
            selos.append('<span class="tag bloq">Fazer primeiro</span>')
        acs = s.get("acceptanceCriteria", [])
        proprios = [a for a in acs if "-RF-MOD-" not in a.get("id", "")]
        acs = proprios or acs  # o enriquecimento repete os cenários do requisito com outro id
        criterios = "".join(f"<li>{e(a['statement'])}</li>" for a in acs)
        tarefas = "".join(
            f'<li><span class="id">{e(t["id"])}</span> <span class="tag obj">{e(TIPO.get(t.get("type"), t.get("type", "")))}</span> <strong>{e(t["title"])}</strong><br><span class="muted">{e(t.get("description", ""))}</span></li>'
            for t in s["tasks"])
        deps = ", ".join(s.get("dependencies", [])) or "nenhuma"
        busca = e(" ".join([s["id"], s["name"], descricao, criterios, tarefas]).lower())
        nome = s["name"].replace(" ⚠️ BLOQUEADO (GAP-028)", "")
        cards.append(f"""
      <article class="card" data-busca="{busca}">
        <div class="card-top"><span class="id">{e(s["id"])}</span><span class="h">#{s.get("executionOrder", "—")}</span></div>
        <h3>{e(nome)}</h3>
        <p>{e(descricao)}</p>
        <div class="tags">{"".join(selos)}</div>
        <details><summary>Critérios de aceite ({len(acs)})</summary><ul>{criterios}</ul></details>
        <details><summary>Tarefas ({len(s["tasks"])})</summary><ul class="tarefas">{tarefas}</ul></details>
        <div class="fonte">Depende de: {e(deps)}</div>
      </article>""")
    nome_ep = ep["name"].split(" — ", 1)[-1]
    colunas.append(f"""
    <section class="col" data-col>
      <header class="col-h">
        <div class="col-top"><span class="fid">{e(ep["id"])}</span><span class="status v1">{e(ep["name"].split(" — ")[0])}</span></div>
        <h2>{e(nome_ep)}</h2>
        <p class="resumo">{e(ep["narrative"]["deliveredValue"])}</p>
        <p class="meta"><strong><span data-count>{len(cards)}</span> histórias</strong></p>
      </header>
      <div class="cards">{"".join(cards)}
      </div>
    </section>""")

sr = T["metadata"].get("securityReview", {})
pagina = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backlog Cobrança 2.6</title>
<style>
:root { --bg:#f5f4f8; --surface:#ffffff; --surface-2:#f0eef6; --text:#1d1a2b; --muted:#5f5a73; --border:#dcd8e8; --accent:#4b2a8f; --accent-soft:#ece6fa; --ok:#1e6b3a; --ok-soft:#e3f3e8; --warn:#8a5a00; --warn-soft:#fbf0d9; --rule:#0f5d73; --rule-soft:#e0f1f5; --bad:#9b1c1c; --bad-soft:#fbe4e4; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#15131d; --surface:#1f1c2a; --surface-2:#282436; --text:#ece9f5; --muted:#a9a3bd; --border:#38334a; --accent:#b9a3ff; --accent-soft:#2e2650; --ok:#7fd49c; --ok-soft:#1d3326; --warn:#f0c46a; --warn-soft:#3a2f17; --rule:#7fd0e4; --rule-soft:#173039; --bad:#ff9a9a; --bad-soft:#3d1c1c; } }
:root[data-theme="dark"] { --bg:#15131d; --surface:#1f1c2a; --surface-2:#282436; --text:#ece9f5; --muted:#a9a3bd; --border:#38334a; --accent:#b9a3ff; --accent-soft:#2e2650; --ok:#7fd49c; --ok-soft:#1d3326; --warn:#f0c46a; --warn-soft:#3a2f17; --rule:#7fd0e4; --rule-soft:#173039; --bad:#ff9a9a; --bad-soft:#3d1c1c; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
.top { padding:20px 16px 8px; max-width:1400px; margin:0 auto; }
h1 { margin:0 0 4px; font-size:22px; }
.sub { margin:0 0 14px; color:var(--muted); }
.stats { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
.stat { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 14px; min-width:120px; }
.stat b { display:block; font-size:20px; }
.stat span { color:var(--muted); font-size:12px; }
.muted { color:var(--muted); }
.bar { display:flex; gap:10px; align-items:center; margin:12px 0 4px; flex-wrap:wrap; }
.bar input { flex:1; min-width:200px; padding:9px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font:inherit; }
.bar button { padding:9px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font:inherit; cursor:pointer; }
.board { display:flex; gap:12px; overflow-x:auto; padding:8px 16px 24px; align-items:flex-start; }
.col { flex:0 0 330px; background:var(--surface-2); border:1px solid var(--border); border-radius:12px; display:flex; flex-direction:column; max-height:calc(100vh - 40px); }
.col-h { padding:12px 12px 10px; border-bottom:1px solid var(--border); }
.col-top { display:flex; justify-content:space-between; align-items:center; gap:6px; }
.fid { font-weight:700; color:var(--accent); background:var(--accent-soft); border-radius:6px; padding:1px 8px; }
.status { font-size:11px; font-weight:600; border-radius:999px; padding:2px 8px; color:var(--ok); background:var(--ok-soft); }
.col-h h2 { font-size:15px; margin:8px 0 4px; }
.resumo { margin:0 0 6px; font-size:12.5px; }
.meta { margin:2px 0; font-size:12px; color:var(--muted); }
.cards { padding:10px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 11px; }
.card-top { display:flex; justify-content:space-between; font-size:11.5px; color:var(--muted); }
.id { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:11.5px; }
.h { font-weight:600; color:var(--text); }
.card h3 { font-size:13.5px; margin:4px 0; }
.card p { margin:0 0 8px; font-size:12.5px; }
.card details { margin-top:6px; font-size:12px; }
.card summary { cursor:pointer; font-weight:600; color:var(--accent); }
.card ul { margin:6px 0 2px; padding-left:16px; }
.card li { margin:4px 0; }
.tags { display:flex; flex-wrap:wrap; gap:4px; }
.tag { font-size:11px; border-radius:6px; padding:1px 7px; }
.tag.obj, .tag.prio { background:var(--accent-soft); color:var(--accent); }
.tag.tipo { background:var(--rule-soft); color:var(--rule); }
.tag.sec { background:var(--warn-soft); color:var(--warn); }
.tag.bloq { background:var(--bad-soft); color:var(--bad); font-weight:600; }
.fonte { margin-top:6px; font-size:11px; color:var(--muted); }
.hidden { display:none; }
footer { max-width:1400px; margin:0 auto; padding:0 16px 24px; color:var(--muted); font-size:12px; }
@media (max-width:700px) { .board { flex-direction:column; overflow-x:visible; } .col { flex:1 1 auto; width:100%; max-height:none; } }
</style>
</head>
<body>
<div class="top">
  <h1>Backlog — Cobrança Inteligente (2.6)</h1>
  <p class="sub">Simulação do fluxo do harness · gerado do backlog do Plan (__DATA__) · decisor Pedro · sem horas</p>
  <div class="stats">
    <div class="stat"><b>__EP__</b><span>épicos (módulos)</span></div>
    <div class="stat"><b>__HI__</b><span>histórias</span></div>
    <div class="stat"><b>__TA__</b><span>tarefas</span></div>
    <div class="stat"><b>__SEC__</b><span>tarefas de segurança</span></div>
  </div>
  <div class="bar">
    <input id="q" type="search" placeholder="Filtrar (ex.: régua, CPF, lote, segurança, GAP-028)" aria-label="Filtrar histórias">
    <button id="tema" type="button">Alternar tema</button>
  </div>
</div>
<main class="board">__COLS__
</main>
<footer>Fonte única: <code>outputs/spec/tasks.json</code>. Detalhe técnico completo de cada tarefa em <code>outputs/spec/report/tasks.html</code>. A ordem (#) é a ordem sugerida de execução.</footer>
<script>
const q = document.getElementById('q');
q.addEventListener('input', () => {
  const termo = q.value.trim().toLowerCase();
  document.querySelectorAll('[data-col]').forEach(col => {
    let n = 0;
    col.querySelectorAll('.card').forEach(c => {
      const ok = !termo || c.dataset.busca.includes(termo);
      c.classList.toggle('hidden', !ok);
      if (ok) n++;
    });
    col.querySelector('[data-count]').textContent = n;
  });
});
document.getElementById('tema').addEventListener('click', () => {
  const r = document.documentElement;
  const escuro = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = escuro ? 'light' : 'dark';
});
</script>
</body>
</html>
"""
for k, v in {"__DATA__": T["metadata"].get("generatedAt", ""), "__EP__": len(T["epics"]), "__HI__": n_hist, "__TA__": n_tar,
             "__SEC__": sr.get("tasksInjected", 0), "__COLS__": "".join(colunas)}.items():
    pagina = pagina.replace(k, str(v))
(AQUI / "kanban.html").write_text(pagina, encoding="utf-8")
print(f"kanban.html gerado: {len(T['epics'])} épicos, {n_hist} histórias, {n_tar} tarefas")
