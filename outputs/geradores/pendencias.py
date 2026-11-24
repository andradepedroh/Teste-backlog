"""Gera a página HTML de pendências (uma decisão por cartão, um botão por opção).

Uso: python3 -I pendencias.py <decisoes.json> <saida.html>

Formato do JSON:
{
  "projeto": "Nome do projeto",
  "rodada": "1 — Fecho do Explore",
  "decisoes": [
    {
      "id": "GAP-028",
      "pergunta": "De onde vem o consentimento por canal?",
      "contexto": "Até 3 linhas: o que está em jogo e o que acontece se ninguém decidir.",
      "bloqueia": "spec-tasks (réguas de ICMS)",
      "opcoes": [
        {"valor": "A", "rotulo": "Marcar como bloqueado", "efeito": "Histórias ficam marcadas; a cadeia segue.", "recomendada": true},
        {"valor": "B", "rotulo": "Usar só e-mail", "efeito": "Régua de ICMS sai só por e-mail."}
      ]
    }
  ]
}

A página não depende de internet. Clicar num botão escolhe a opção; o quadro no fim monta a linha
de respostas («GAP-028=A; GAP-015=B») e o botão «Copiar respostas» copia para colar no chat.
Cada decisão aceita também texto livre («Outra resposta»).
"""
import html
import json
import sys
from pathlib import Path

d = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
e = html.escape
cards = []
for x in d["decisoes"]:
    botoes = "".join(
        f'<button type="button" class="op{" rec" if o.get("recomendada") else ""}" data-id="{e(x["id"])}" data-valor="{e(o["valor"])}">'
        f'<b>{e(o["valor"])}) {e(o["rotulo"])}</b>{" <span class=selo>recomendada</span>" if o.get("recomendada") else ""}'
        f'<span class="ef">{e(o.get("efeito", ""))}</span></button>'
        for o in x["opcoes"])
    cards.append(f"""
  <article class="card" data-card="{e(x["id"])}">
    <div class="topo"><span class="id">{e(x["id"])}</span>{f'<span class="bl">Segura: {e(x["bloqueia"])}</span>' if x.get("bloqueia") else ""}</div>
    <h2>{e(x["pergunta"])}</h2>
    <p class="ctx">{e(x.get("contexto", ""))}</p>
    <div class="ops">{botoes}</div>
    <label class="livre">Outra resposta <input type="text" data-livre="{e(x["id"])}" placeholder="escreva aqui se nenhuma opção serve"></label>
  </article>""")

pagina = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pendências do projeto</title>
<style>
:root{--bg:#f5f4f8;--sf:#fff;--tx:#1d1a2b;--mu:#5f5a73;--bd:#dcd8e8;--ac:#4b2a8f;--acs:#ece6fa;--ok:#1e6b3a;--oks:#e3f3e8;--wa:#8a5a00;--was:#fbf0d9}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15131d;--sf:#1f1c2a;--tx:#ece9f5;--mu:#a9a3bd;--bd:#38334a;--ac:#b9a3ff;--acs:#2e2650;--ok:#7fd49c;--oks:#1d3326;--wa:#f0c46a;--was:#3a2f17}}
:root[data-theme="dark"]{--bg:#15131d;--sf:#1f1c2a;--tx:#ece9f5;--mu:#a9a3bd;--bd:#38334a;--ac:#b9a3ff;--acs:#2e2650;--ok:#7fd49c;--oks:#1d3326;--wa:#f0c46a;--was:#3a2f17}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 16px 160px}h1{font-size:21px;margin:0 0 4px}.sub{color:var(--mu);margin:0 0 16px}
.card{background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:12px}
.card.feito{border-color:var(--ok)}.topo{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.id{font-weight:700;color:var(--ac);background:var(--acs);border-radius:6px;padding:1px 8px;font-size:12px}
.bl{font-size:11.5px;color:var(--wa);background:var(--was);border-radius:999px;padding:1px 8px}
h2{font-size:15.5px;margin:8px 0 4px}.ctx{margin:0 0 10px;color:var(--mu)}
.ops{display:grid;gap:8px}.op{text-align:left;font:inherit;color:var(--tx);background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;cursor:pointer}
.op:hover{border-color:var(--ac)}.op.sel{border-color:var(--ok);background:var(--oks)}.op b{display:inline}.ef{display:block;color:var(--mu);font-size:12.5px;margin-top:2px}
.selo{font-size:11px;color:var(--ok);background:var(--oks);border-radius:999px;padding:1px 7px;margin-left:6px}
.livre{display:block;margin-top:8px;font-size:12.5px;color:var(--mu)}.livre input{width:100%;margin-top:4px;padding:8px 10px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);font:inherit}
.rodape{position:fixed;left:0;right:0;bottom:0;background:var(--sf);border-top:1px solid var(--bd);padding:10px 16px}
.rodape div{max-width:860px;margin:0 auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#resp{flex:1;min-width:220px;font:12.5px ui-monospace,Menlo,Consolas,monospace;padding:8px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);resize:none;height:44px}
.acao{font:inherit;padding:9px 14px;border-radius:8px;border:1px solid var(--ac);background:var(--ac);color:var(--sf);cursor:pointer}
.sec{background:var(--sf);color:var(--tx);border-color:var(--bd)}#cont{color:var(--mu);font-size:12px}
</style></head><body><main>
<h1>Pendências — __PROJ__</h1>
<p class="sub">Rodada __ROD__ · __N__ decisões · clique numa opção por cartão, depois em «Copiar respostas» e cole no chat.</p>
__CARDS__
</main>
<div class="rodape"><div>
<textarea id="resp" readonly aria-label="Respostas para colar no chat"></textarea>
<span id="cont"></span>
<button class="acao sec" id="rec" type="button">Aceitar todas as recomendadas</button>
<button class="acao" id="cop" type="button">Copiar respostas</button>
<button class="acao sec" id="tema" type="button">Tema</button>
</div></div>
<script>
const esc={},livre={},N=__N__;
function monta(){
  const p=[];document.querySelectorAll('[data-card]').forEach(c=>{const id=c.dataset.card;const v=livre[id]?('«'+livre[id]+'»'):esc[id];
    c.classList.toggle('feito',!!v);if(v)p.push(id+'='+v);});
  document.getElementById('resp').value=p.join('; ');document.getElementById('cont').textContent=p.length+' de '+N+' respondidas';}
document.querySelectorAll('.op').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id;esc[id]=b.dataset.valor;
  document.querySelectorAll('.op[data-id="'+CSS.escape(id)+'"]').forEach(o=>o.classList.toggle('sel',o===b));monta();}));
document.querySelectorAll('[data-livre]').forEach(i=>i.addEventListener('input',()=>{livre[i.dataset.livre]=i.value.trim();monta();}));
document.getElementById('rec').addEventListener('click',()=>{document.querySelectorAll('.op.rec').forEach(b=>{if(!esc[b.dataset.id])b.click();});});
document.getElementById('cop').addEventListener('click',async()=>{const t=document.getElementById('resp');const b=document.getElementById('cop');
  try{await navigator.clipboard.writeText(t.value);b.textContent='Copiado';}catch(_){t.select();document.execCommand('copy');b.textContent='Selecionado — Ctrl+C';}
  setTimeout(()=>b.textContent='Copiar respostas',1800);});
document.getElementById('tema').addEventListener('click',()=>{const r=document.documentElement;const esc2=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=esc2?'light':'dark';});
monta();
</script></body></html>
"""
for k, v in {"__PROJ__": e(d["projeto"]), "__ROD__": e(d["rodada"]), "__N__": str(len(d["decisoes"])), "__CARDS__": "".join(cards)}.items():
    pagina = pagina.replace(k, v)
Path(sys.argv[2]).write_text(pagina, encoding="utf-8")
print(f"{sys.argv[2]}: {len(d['decisoes'])} decisões")
