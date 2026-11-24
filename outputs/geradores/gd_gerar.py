"""Gera outputs/spec/gaps-document.md a partir de gaps.md + tasks.json. Uso: python3 -I gd_gerar.py <raiz>"""
import json
import re
import sys
from datetime import date
from pathlib import Path

SPEC = Path(sys.argv[1]) / "outputs" / "spec"
G = (SPEC / "gaps.md").read_text(encoding="utf-8")
T = json.loads((SPEC / "tasks.json").read_text(encoding="utf-8"))
rf_story = {}
rf_tasks = {}
for s in T["stories"]:
    for r in s.get("traceability", {}).get("requirementIds", []):
        rf_story[r] = s["id"]
        rf_tasks[r] = [t["id"] for t in s["tasks"]]
gap_spike = {}
for s in T["stories"]:
    for g in s.get("traceability", {}).get("gapIds", []):
        gap_spike.setdefault(g, []).append(s["tasks"][0]["id"])
decisao = {}
for linha in G.split("Tratamento decidido por Pedro", 1)[-1].split("\n### ", 1)[0].splitlines():
    c = [x.strip() for x in linha.strip().strip("|").split("|")]
    if len(c) == 2 and "GAP-" in c[0]:
        for g in re.findall(r"GAP-\d{3}", c[0]):
            decisao[g] = c[1]
out = [f"# Documento de Gaps — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)\n",
       "**Gerado por:** spec-tasks v5.3", f"**Data:** {date.today().isoformat()}", "**Projeto:** Cobrança Inteligente — aplicação escopada x_cbi_ no ServiceNow\n",
       "> **Instruções:** cada lacuna abaixo mantém o mesmo número da lista de lacunas do Plan. A seção «Respostas» traz o que já foi decidido; quando uma lacuna for respondida, o agente propaga a resposta para o backlog e para o registro cronológico.\n",
       "> Nenhuma lacuna nova foi aberta na montagem do backlog: as dúvidas encontradas já estavam numeradas.\n", "---\n", "## Gaps Identificados\n"]
blocos = re.split(r"\n(?=### GAP-\d{3})", G)
resp = []
for b in blocos:
    m = re.match(r"### (GAP-\d{3}) — (.+)", b)
    if not m:
        continue
    gid, tit = m.groups()
    campo = lambda f: (re.search(r"\*\*" + f + r"\*\* \| (.*?) \|\n", b) or [None, "—"])[1]  # noqa: E731
    rfs = re.findall(r"RF-MOD-[A-Z]+-\d+", campo("Afeta") + " " + campo("Features bloqueadas"))
    tasks = sorted({t for r in rfs for t in rf_tasks.get(r, [])} | set(gap_spike.get(gid, [])))
    sev = campo("Severidade")
    impacto = {"CRÍTICA": "Alta", "ALTA": "Alta", "MÉDIA": "Média", "BAIXA": "Baixa"}.get(sev.upper(), "Média")
    tipo = "INTEGRAÇÃO" if re.search(r"API|fonte|provedor|integra", tit + campo("Descrição"), re.I) else "REGULATÓRIO" if re.search(r"jur[ií]d|LGPD|reten", tit + campo("Descrição"), re.I) else "NEGÓCIO"
    out += [f"### {gid} — {tit}\n", f"**Área:** {', '.join(sorted({r.split('-')[2] for r in rfs})) or 'transversal'}",
            f"**Impacto:** {impacto}", f"**Tipo:** {tipo}", f"**Situação:** {campo('Status')}",
            f"**Histórias afetadas:** {', '.join(sorted({rf_story[r] for r in rfs if r in rf_story})) or '—'}",
            f"**Tasks afetadas:** {', '.join(tasks) or '—'}\n",
            "**Descrição:**", campo("Descrição") + "\n", "**Contexto:**", f"Impacto se não resolvido: {campo('Impacto se não resolvido')}\n",
            "**Opções identificadas:**", f"1. {campo('Sugestão de tratamento')}", f"2. Perguntas ao negócio: {campo('Perguntas para o negócio')}\n", "---\n"]
    resp += [f"### {gid}", f"**Decisão:** {decisao.get(gid, campo('Status'))}", "**Decidido por:** " + ("Pedro" if gid in decisao or "respondido" in campo("Status").lower() else "A preencher pelo responsável de negócio"),
             f"**Data:** {'2026-11-13' if gid in decisao else '—'}",
             f"**Impacto na task:** {('histórias marcadas ⚠️ BLOQUEADO: ' + ', '.join(sorted({rf_story[r] for r in rfs if r in rf_story}))) if gid == 'GAP-028' else ('sem mudança no backlog enquanto em aberto' if tasks else '—')}\n"]
out += ["## Respostas\n"] + resp + ["---\n", "*Após preencher as respostas pendentes, informar ao agente para propagar para tasks.json e sync-log.md.*"]
(SPEC / "gaps-document.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("ok", sum(1 for x in out if x.startswith("### GAP")))
