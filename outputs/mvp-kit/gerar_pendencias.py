"""Página de pendências: uma pergunta por cartão, um botão por opção.

Uso: python3 gerar_pendencias.py <pasta-do-mvp>
Lê <pasta>/pendencias.json e grava <pasta>/pendencias.html.

pendencias.json:
{
  "projeto": "Nome", "rodada": 1,
  "pendencias": [
    {"id": "PEND-01", "pergunta": "...?", "contexto": "por que importa, 1-2 frases",
     "afeta": ["HU-03", "EP-02"],
     "opcoes": [{"rotulo": "Opção curta", "efeito": "o que muda no backlog"}],
     "recomendada": 0}
  ]
}

Cada clique marca a escolha. O botão «Copiar respostas» copia um bloco
«PEND-01=2; PEND-02=1; ...» (número da opção, a partir de 1) para colar no chat.
Pendência sem escolha sai como «PEND-xx=?». Escolhas ficam salvas no navegador.
"""
import html
import json
import sys
from pathlib import Path

PASTA = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
d = json.loads((PASTA / "pendencias.json").read_text(encoding="utf-8"))
e = html.escape
cards = []
for p in d["pendencias"]:
    rec = p.get("recomendada")
    bts = "".join(
        f'<button type="button" class="op" data-p="{e(p["id"])}" data-n="{i}"><b>{i}. {e(o["rotulo"])}</b>'
        f'{" <span class=rec>recomendada</span>" if rec == i - 1 else ""}<small>{e(o.get("efeito", ""))}</small></button>'
        for i, o in enumerate(p["opcoes"], 1))
    afeta = " · ".join(e(x) for x in p.get("afeta", []))
    cards.append(f"""
  <article class="card" data-id="{e(p["id"])}">
    <div class="top"><span class="id">{e(p["id"])}</span><span class="st" data-st>pendente</span></div>
    <h2>{e(p["pergunta"])}</h2>
    <p>{e(p.get("contexto", ""))}</p>
    {f'<p class="afeta">Afeta: {afeta}</p>' if afeta else ""}
    <div class="ops">{bts}</div>
    <input class="obs" data-obs="{e(p["id"])}" placeholder="Observação (opcional)" aria-label="Observação de {e(p["id"])}">
  </article>""")

pagina = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pendências do MVP</title>
<style>
:root{--bg:#f5f4f8;--sf:#fff;--tx:#1d1a2b;--mu:#5f5a73;--bd:#dcd8e8;--ac:#4b2a8f;--acs:#ece6fa;--ok:#1e6b3a;--oks:#e3f3e8;--wa:#8a5a00;--was:#fbf0d9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15131d;--sf:#1f1c2a;--tx:#ece9f5;--mu:#a9a3bd;--bd:#38334a;--ac:#b9a3ff;--acs:#2e2650;--ok:#7fd49c;--oks:#1d3326;--wa:#f0c46a;--was:#3a2f17}}
:root[data-theme="dark"]{--bg:#15131d;--sf:#1f1c2a;--tx:#ece9f5;--mu:#a9a3bd;--bd:#38334a;--ac:#b9a3ff;--acs:#2e2650;--ok:#7fd49c;--oks:#1d3326;--wa:#f0c46a;--was:#3a2f17}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 16px 120px}h1{margin:0 0 4px;font-size:22px}.sub{color:var(--mu);margin:0 0 16px}
.card{background:var(--sf);border:1px solid var(--bd);border-left:4px solid var(--wa);border-radius:12px;padding:14px;margin-bottom:12px}.card.feito{border-left-color:var(--ok)}
.top{display:flex;justify-content:space-between;font-size:12px;color:var(--mu)}.id{font-family:ui-monospace,Menlo,Consolas,monospace}
.st{border-radius:999px;padding:1px 8px;background:var(--was);color:var(--wa)}.feito .st{background:var(--oks);color:var(--ok)}
h2{font-size:15.5px;margin:6px 0}.card p{margin:0 0 8px}.afeta{font-size:12px;color:var(--mu)}
.ops{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.op{text-align:left;padding:10px 12px;border-radius:10px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);font:inherit;cursor:pointer}
.op small{display:block;color:var(--mu);margin-top:3px}.op.on{border-color:var(--ac);background:var(--acs)}.rec{font-size:11px;color:var(--ok);font-weight:600}
.obs{width:100%;margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);font:inherit}
.rod{position:fixed;left:0;right:0;bottom:0;background:var(--sf);border-top:1px solid var(--bd);padding:10px 16px}
.rod div{max-width:860px;margin:0 auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rod button{padding:10px 16px;border-radius:8px;border:0;background:var(--ac);color:var(--sf);font:inherit;font-weight:600;cursor:pointer}
.rod output{color:var(--mu);font-size:12.5px}
</style></head><body>
<main>
  <h1>Pendências — __PROJ__</h1>
  <p class="sub">Rodada __ROD__ · __N__ decisões. Clique numa opção em cada cartão e depois em «Copiar respostas» para colar no chat.</p>
  __CARDS__
</main>
<div class="rod"><div><button id="cp" type="button">Copiar respostas</button><output id="msg" aria-live="polite"></output></div></div>
<script>
const CH='pend-__PROJKEY__-__ROD__';let esc={};try{esc=JSON.parse(localStorage.getItem(CH)||'{}')}catch(x){}
function salva(){try{localStorage.setItem(CH,JSON.stringify(esc))}catch(x){}}
function pinta(){let n=0;document.querySelectorAll('.card').forEach(c=>{const id=c.dataset.id;const v=esc[id];c.querySelectorAll('.op').forEach(b=>b.classList.toggle('on',v&&b.dataset.n===String(v.n)));c.classList.toggle('feito',!!(v&&v.n));c.querySelector('[data-st]').textContent=v&&v.n?'decidida':'pendente';if(v&&v.n)n++;const o=c.querySelector('.obs');if(v&&v.obs&&!o.value)o.value=v.obs});document.getElementById('msg').textContent=n+' de __N__ decididas'}
document.querySelectorAll('.op').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.p;esc[id]=Object.assign(esc[id]||{},{n:+b.dataset.n});salva();pinta()}));
document.querySelectorAll('.obs').forEach(i=>i.addEventListener('input',()=>{const id=i.dataset.obs;esc[id]=Object.assign(esc[id]||{},{obs:i.value});salva()}));
document.getElementById('cp').addEventListener('click',async()=>{const linhas=[...document.querySelectorAll('.card')].map(c=>{const v=esc[c.dataset.id]||{};return c.dataset.id+'='+(v.n||'?')+(v.obs?' ('+v.obs.replace(/[;\\n]/g,' ')+')':'')});const txt='Respostas rodada __ROD__: '+linhas.join('; ');try{await navigator.clipboard.writeText(txt);document.getElementById('msg').textContent='Copiado. Cole no chat.'}catch(x){prompt('Copie o texto abaixo:',txt)}});
pinta();
</script></body></html>
"""
chave = "".join(ch for ch in d["projeto"].lower() if ch.isalnum())[:30]
for k, v in {"__PROJKEY__": chave, "__PROJ__": e(d["projeto"]), "__ROD__": str(d.get("rodada", 1)), "__N__": str(len(d["pendencias"])),
             "__CARDS__": "".join(cards)}.items():
    pagina = pagina.replace(k, v)
(PASTA / "pendencias.html").write_text(pagina, encoding="utf-8")
print(f"pendencias.html: {len(d['pendencias'])} decisões (rodada {d.get('rodada', 1)})")
