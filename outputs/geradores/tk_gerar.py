"""Gera outputs/spec/tasks.json e gaps-document.md (spec-tasks) a partir dos artefatos do Plan.

Uso: python3 -I tk_gerar.py <raiz-do-projeto>
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import yaml

RAIZ = Path(sys.argv[1])
SPEC = RAIZ / "outputs" / "spec"
HOJE = date.today().isoformat()
REQ = (SPEC / "requirements" / "requirements.md").read_text(encoding="utf-8")
BR = (SPEC / "business-rules.md").read_text(encoding="utf-8")
PRD = (SPEC / "product-requirements" / "product-requirements.md").read_text(encoding="utf-8")
TP = (SPEC / "test-plan.md").read_text(encoding="utf-8")
DM = json.loads((SPEC / "data-model.json").read_text(encoding="utf-8"))
API = yaml.safe_load((SPEC / "api-contracts.yaml").read_text(encoding="utf-8"))
SUP = json.loads((SPEC / "api-contracts-supplement.json").read_text(encoding="utf-8"))
FM = json.loads(__import__("subprocess").run(
    ["python3", str(RAIZ / ".claude/skills/tools/check-flowmap.py"), str(SPEC / "flow-map.md"), "--json"],
    capture_output=True, text=True).stdout)
HLD = json.loads(__import__("subprocess").run(
    ["python3", str(RAIZ / ".claude/skills/tools/check-hld.py"), str(SPEC / "hld.md"), "--json"],
    capture_output=True, text=True).stdout)


def limpa(t):
    return re.sub(r"\s+", " ", t or "").strip()


# ------------------------------------------------------------------ requisitos
MODULOS = [(m.group(2), m.group(1)) for m in re.finditer(r"^## Módulo: (.+?) \(`(MOD-[A-Z-]+)`\)", REQ, re.M)]
MOD_INFO = {}
for linha in (SPEC / "modules.md").read_text(encoding="utf-8").splitlines():
    c = [x.strip() for x in linha.strip().strip("|").split("|")]
    if len(c) >= 7 and c[0].startswith("MOD-"):
        MOD_INFO[c[0]] = {"nome": c[1], "atores": c[3], "objetivo": c[4], "limites": c[5]}

RFS = []
for bloco in re.split(r"\n(?=### RF-MOD-)", REQ):
    m = re.match(r"### (RF-MOD-([A-Z]+)-\d+): (.+)", bloco)
    if not m:
        continue
    g = lambda pat: (re.search(pat, bloco, re.S) or [None, ""])[1]  # noqa: E731
    rf = {"id": m.group(1), "mod": "MOD-" + m.group(2), "titulo": m.group(3).strip(),
          "atores": g(r"\*\*Atores:\*\* (.+?)\n").strip(),
          "historia": limpa(g(r"\*\*Descrição \(User Story\):\*\*\n(.+?)\n\n")),
          "ears": limpa(g(r"\*\*Enunciado EARS[^:]*:\*\* (.+?)\n")),
          "moscow": g(r"\*\*Prioridade MoSCoW:\*\* (\w+)"),
          "pre": [limpa(x) for x in re.findall(r"^- (.+)$", g(r"\*\*Pré-condições:\*\*\n(.+?)\n\n"), re.M)],
          "rns": re.findall(r"RN-NOVO-[A-Z]+-\d+", g(r"\*\*Regras de Negócio aplicáveis:\*\* (.+?)\n")),
          "deps": re.findall(r"RF-MOD-[A-Z]+-\d+", g(r"\*\*Dependências:\*\* (.+?)\n")),
          "rastro": g(r"\*\*Rastreabilidade:\*\* (.+?)\n").strip()}
    rf["cenarios"] = [{k: v.strip() for k, v in zip(("nome", "dado", "quando", "entao"), c.groups())}
                      for c in re.finditer(r"Cenário \d+: (.+)\n\s+Dado (.+)\n\s+Quando (.+)\n\s+Então (.+)", bloco)]
    h = re.match(r"Como (.+?), quero (.+?), para (.+?)\.?$", rf["historia"])
    rf["us"] = {"asA": h.group(1), "iWant": h.group(2), "soThat": h.group(3)} if h else None
    RFS.append(rf)
RF = {r["id"]: r for r in RFS}

RNS = {}
for bloco in re.split(r"\n(?=#### RN-)", BR):
    m = re.match(r"#### (RN-[\w-]+): (.+)", bloco)
    if not m:
        continue
    campo = lambda f: limpa((re.search(r"\*\*" + f + r"\*\* \| (.*?) \|\n", bloco) or [None, ""])[1])  # noqa: E731
    RNS[m.group(1)] = {"id": m.group(1), "titulo": m.group(2).strip(), "tipo": campo("Tipo"), "enunciado": campo("Enunciado"),
                       "algoritmo": campo("Algoritmo"), "excecoes": campo("Exceções"), "conflitos": campo("Conflitos"),
                       "justificativa": campo("Justificativa"), "vinc": re.findall(r"RF-MOD-[A-Z]+-\d+", campo("Vinculada a"))}
for rn in RNS.values():
    for r in rn["vinc"]:
        if r in RF and rn["id"] not in RF[r]["rns"]:
            RF[r]["rns"].append(rn["id"])

# ------------------------------------------------------------------ casos de teste
TCS = []
for bloco in re.split(r"\n(?=### \[TC-)", TP):
    m = re.match(r"### \[(TC-\d+)\] (.+?) \[([A-ZÇÃ]+)\]", bloco)
    if not m:
        continue
    rel = re.search(r"\*\*RN/RF relacionado\*\* \| (.+?) \|", bloco).group(1)
    sec = lambda t: [limpa(x) for x in re.findall(r"^(?:- |\d+\. )(.+)$", (re.search(t + r"\n(.+?)\n\n", bloco, re.S) or [None, ""])[1], re.M)]  # noqa: E731
    TCS.append({"id": m.group(1), "titulo": m.group(2), "cat": m.group(3), "rel": rel,
                "rfs": re.findall(r"RF-MOD-[A-Z]+-\d+", rel), "rns": re.findall(r"RN-NOVO-[A-Z]+-\d+", rel),
                "pre": sec(r"\*\*Pré-condições:\*\*"), "passos": sec(r"\*\*Passos:\*\*"),
                "esperado": [x.replace("✅ ", "") for x in sec(r"\*\*Resultado esperado:\*\*")],
                "perfil": re.search(r"\*\*Perfil do testador\*\* \| (.+?) \|", bloco).group(1)})

# ------------------------------------------------------------------ modelo de dados
ENT = {}
for bc in DM["boundedContexts"]:
    for e in bc["entities"]:
        e["_bc"] = bc["name"]
        ENT[e["name"]] = e
RF_ENT = {}
for e in ENT.values():
    for t in e.get("traceability", []):
        if t.get("itemId", "").startswith("RF-"):
            RF_ENT.setdefault(t["itemId"], []).append(e["name"])

TIPO_SQL = {"string": "VARCHAR", "reference": "CHAR(32)", "choice": "VARCHAR(40)", "boolean": "BOOLEAN", "integer": "INTEGER",
            "decimal": "DECIMAL(15,4)", "currency": "DECIMAL(18,2)", "glide_date": "DATE", "glide_date_time": "TIMESTAMP"}
ENUM_DE_COLUNA = {}
for e in ENT.values():
    for c in e["columns"]:
        if c.get("enumRef"):
            ENUM_DE_COLUNA[(e["name"], c["name"])] = c["enumRef"]
ENUMS = {x["name"]: x["values"] for x in DM["enumerations"]}


def tipo_col(t):
    m = re.match(r"(\w+)(\(\d+\))?", t)
    base = TIPO_SQL.get(m.group(1), "VARCHAR(255)")
    return base + (m.group(2) or ("(255)" if base == "VARCHAR" else ""))


def entidade_prosa(nome):
    e = ENT[nome]
    cols = []
    cols.append("sys_id CHAR(32) PK NOT NULL [EXISTING_REF] — Identificador único que a plataforma gera para cada registro.")
    for c in e["columns"]:
        desc = limpa(c.get("notes") or c.get("description") or c["name"].replace("_", " ")) + f" (tipo na plataforma: {c['type']})"
        extra = ""
        en = c.get("enumRef")
        if en and en in ENUMS:
            extra = " Valores: " + ", ".join(f"{v['value']} ({v['label']})" for v in ENUMS[en]) + "."
        rule = f" (rule={c['businessRuleRef']})" if c.get("businessRuleRef") else ""
        default = f" default={c['default']}" if c.get("default") not in (None, "") else ""
        cols.append(f"{c['name']} {tipo_col(c['type'])} {'NULL' if c.get('nullable', True) else 'NOT NULL'}{default} [{c.get('operationType', 'NEW')}]{rule} — {desc}.{extra}")
    rels = []
    for r in e.get("relationships", []):
        alvo = ENT.get(r["targetEntity"], {}).get("tableName", r["targetEntity"])
        rels.append(f"{r['type']} → {alvo} ({r['foreignKey']} → sys_id) onDelete={'RESTRICT' if r.get('cascade', 'NONE') == 'NONE' else r['cascade']} — {e['name']} aponta para {r['targetEntity']}")
    idx = [f"{i['name']} {'UNIQUE ' if i.get('unique') else ''}BTREE({', '.join(i['columns'])}) — {limpa(i.get('purpose', ''))}" for i in e.get("indexes", [])]
    uk = [f"UK_{i['name']} ({', '.join(i['columns'])}) — {limpa(i.get('purpose', ''))}" for i in e.get("indexes", []) if i.get("unique")]
    out = {"table": e["tableName"], "purpose": f"Guarda: {limpa(e['purpose'])}.", "boundedContext": e["_bc"],
           "operationType": e.get("operationType", "NEW"), "identifierStrategy": "MANUAL" if e.get("operationType") == "EXISTING_REF" else "UUID",
           "primaryKey": "sys_id", "columns": " | ".join(cols),
           "dataModelRef": f"data-model.json#/entities/{e['name']}"}
    if rels:
        out["relationships"] = " | ".join(rels)
    if idx:
        out["indexes"] = " | ".join(idx)
    if uk:
        out["uniqueConstraints"] = " | ".join(uk)
    return out


# ------------------------------------------------------------------ contratos de API
OPS = {}
for p, metodos in API["paths"].items():
    for m, op in metodos.items():
        OPS[op["operationId"]] = (m.upper(), p, op)
SUPOP = {o["operationId"]: o for o in SUP["operations"]}
SCHEMAS = API["components"]["schemas"]


def schema_prosa(ref_or_schema, profundidade=0):
    s = ref_or_schema
    if "$ref" in s:
        s = SCHEMAS[s["$ref"].split("/")[-1]]
    req = set(s.get("required", []))
    partes = []
    for nome, p in s.get("properties", {}).items():
        if "$ref" in p:
            partes.append(f"{nome}: object<{schema_prosa(p, profundidade + 1)}>")
            continue
        t = p.get("type", "object")
        if t == "array":
            it = p.get("items", {})
            t = f"array<{schema_prosa(it, profundidade + 1) if '$ref' in it else it.get('type', 'object')}>"
            if p.get("maxItems"):
                t += f" maxItems={p['maxItems']}"
        det = []
        if p.get("enum"):
            det.append("enum=[" + ",".join(map(str, p["enum"])) + "]")
        for k in ("format", "pattern", "minLength", "maxLength", "minimum", "maximum"):
            if k in p:
                det.append(f"{k}={p[k]}")
        if "example" in p and not isinstance(p["example"], (list, dict)) and p["example"] is not None:
            det.append(f"example={p['example']}")
        partes.append(f"{nome}: {t} {' '.join(det)} {'required' if nome in req else 'optional'}".replace("  ", " "))
    return "{ " + "; ".join(partes) + " }"


def contrato(opid):
    m, p, op = OPS[opid]
    sup = SUPOP[opid]
    req = []
    params = [x["$ref"].split("/")[-1] for x in op.get("parameters", [])]
    if params:
        req.append("Path: " + "; ".join(
            f"{API['components']['parameters'][n]['name']} ({API['components']['parameters'][n]['schema']['type']} required — {API['components']['parameters'][n]['description']})" for n in params))
    body = op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema")
    if body:
        bs = SCHEMAS[body["$ref"].split("/")[-1]]
        campos = []
        for nome, pr in bs.get("properties", {}).items():
            t = pr.get("type", "object")
            if t == "array" and "$ref" in pr.get("items", {}):
                t = f"array<{pr['items']['$ref'].split('/')[-1]} {schema_prosa(pr['items'])}> maxItems={pr.get('maxItems')}"
            lim = " ".join(f"{k}={pr[k]}" for k in ("minLength", "maxLength", "pattern", "minimum", "maximum", "format") if k in pr)
            campos.append(f"{nome} ({t} {lim} {'required' if nome in bs.get('required', []) else 'optional'} — {limpa(pr.get('description', ''))})".replace("  ", " "))
        req.append("Body: " + "; ".join(campos))
    req.append("Headers: Authorization (required — Bearer com o token OAuth 2.0 do usuário de integração); Content-Type (required — application/json)")
    resps = []
    for st, r in op["responses"].items():
        ct = list(r.get("content", {"—": {}}).keys())[0]
        sch = r.get("content", {}).get(ct, {}).get("schema")
        txt = f"{st} {ct} — {limpa(r['description'])}"
        if sch:
            txt += f". schema: {schema_prosa(sch)}"
        if r.get("headers"):
            txt += " headers: " + "; ".join(f"{h} ({limpa(v['description'])})" for h, v in r["headers"].items())
        resps.append(txt)
    sec = op.get("security", [{}])[0]
    esquema, escopos = list(sec.items())[0]
    idem = sup["idempotency"]
    return {"operationId": opid, "method": m, "path": p, "signature": f"{m} {p}", "summary": op["summary"],
            "description": re.sub(r"\s*\(ETF §[\d.]+\)", "", limpa(op["description"])),
            "auth": f"OAuth2 client credentials ({esquema}) — escopo: {', '.join(escopos)}. Um usuário de integração por fonte, sem papel de aplicação; a REST API Access Policy libera só este caminho.",
            "request": " | ".join(req), "responses": " | ".join(resps),
            "policies": f"Rate: limite por usuário de integração, configurável no parâmetro de integração (valor a definir), excedente responde 429 com Retry-After. Caching: cacheable=False (operação de escrita). Idempotency: supported (chave natural {idem['naturalKey']} — {limpa(idem['behavior'])}).",
            "openApiRef": f"api-contracts.yaml#/paths/{p.replace('/', '~1')}/{m.lower()}", "tags": op.get("tags", [])}


RF_OPS = {}
for o in SUP["operations"]:
    for r in o["linkedRequirements"]:
        RF_OPS.setdefault(r, []).append(o["operationId"])

# ------------------------------------------------------------------ telas e campos
TELAS = {t["ID"]: t for t in FM["telas"]}
TELA_DO_RF = {}
for t in FM["telas"]:
    for r in re.findall(r"RF-MOD-[A-Z]+-\d+", t["RF/PR"]):
        TELA_DO_RF.setdefault(r, t["ID"])
AMARRA = {a["tela"]: a for a in FM["amarracao"]}
ETAPA_DA_TELA = {}
for e in FM["etapas"]:
    if e["Tela"].startswith("TEL-"):
        ETAPA_DA_TELA.setdefault(e["Tela"], e)
FLUXO = {f["ID"]: f for f in FM["fluxos"]}
REGRAS_TELA = {}
for t in FM["transicoes"]:
    for etp in (t["De"], t["Para"]):
        e = next((x for x in FM["etapas"] if x["ID"] == etp), None)
        if e and e["Tela"].startswith("TEL-"):
            for rn in re.findall(r"RN-NOVO-[A-Z]+-\d+", t["Regras"]):
                REGRAS_TELA.setdefault(e["Tela"], []).append(rn)

CAMPOS = []
for linha in PRD.splitlines():
    c = [x.strip() for x in linha.strip().strip("|").split("|")]
    if len(c) == 12 and c[0] != "Campo" and not c[0].startswith("-") and re.search(r"RF-MOD", c[11]):
        CAMPOS.append(c)


def campo_ui(c):
    nome, rot, tipo, obrig, sel, opcoes, origem, mascara, default, limites, valid, rfs = c
    f = {"name": nome, "label": rot, "type": tipo, "required": obrig == "Sim"}
    if sel in ("única", "múltipla"):
        f["selection"] = "single" if sel == "única" else "multiple"
    ops = re.findall(r"`([A-Z0-9_]+)` — ([^;]+)", opcoes)
    if ops:
        f["options"] = [{"value": v, "label": l.strip()} for v, l in ops]
    if origem not in ("—", ""):
        k, _, ref = origem.partition(":")
        kind = {"enum": "enum", "domainTable": "domainTable", "endpoint": "endpoint"}.get(k, "static")
        f["optionsSource"] = {"kind": kind, "ref": ref.strip() or origem, "notes": limpa(origem)}
        if not ops and kind in ("enum", "domainTable") and ref.strip() in ENUMS:
            f["options"] = [{"value": v["value"], "label": v["label"]} for v in ENUMS[ref.strip()]]
        if not f.get("options") and kind != "endpoint":
            f["optionsSource"]["kind"] = "endpoint"
            f["optionsSource"]["notes"] += " — lista lida da plataforma em tempo de execução (registros ativos)."
    f["mask"] = None if mascara == "—" else mascara
    f["default"] = None if default in ("—", "") else default
    regra = valid if valid != "—" else ("obrigatório" if obrig == "Sim" else "—")
    msg = re.search(r"«(.+?)»", valid)
    f["validations"] = [{"rule": limpa(regra.split("→")[0]) + (f" (limite: {limites})" if limites != "—" else ""),
                         "errorMessage": msg.group(1) if msg else ("Preencha este campo." if obrig == "Sim" else "—")}]
    f["traceability"] = rfs
    return f


def ui_context(rf_id, tela_id):
    t = TELAS[tela_id]
    et = ETAPA_DA_TELA.get(tela_id)
    regras = []
    for rn in dict.fromkeys(REGRAS_TELA.get(tela_id, []) + [r for r in RF[rf_id]["rns"]]):
        if rn in RNS:
            regras.append(f"{rn} — {RNS[rn]['enunciado']}")
    campos = [campo_ui(c) for c in CAMPOS if rf_id in c[11]] or [campo_ui(c) for c in CAMPOS if any(r in c[11] for r in re.findall(r"RF-MOD-[A-Z]+-\d+", t["RF/PR"]))]
    ents = AMARRA.get(tela_id, {}).get("entidades", [])
    u = {"tela": tela_id, "telaNome": t["Nome"], "rota": t["Rota"],
         "estadosUI": [e.strip() for e in t["Estados UI"].split(",")],
         "regras": regras or [f"Sem regra de transição própria; vale o enunciado do requisito: {RF[rf_id]['ears']}"],
         "entidades": [ENT[e]["tableName"] for e in ents if e in ENT], "endpoints": [],
         "fields": campos}
    if et:
        u["fluxo"] = f"{et['Fluxo']} — {FLUXO[et['Fluxo']]['Nome']}"
        u["etapa"] = f"{et['ID']} (ordem {et['Ordem']}) — {et['Nome']}"
    if t["Rota"].endswith("_list.do") or "list" in t["Rota"]:
        cols = [f"{c['label']} — {c['type']}" for c in campos][:8] or ["Número — texto"]
        u["grid"] = {"columns": cols, "defaultSort": "atualizado em DESC", "pagination": "paginação nativa da lista do ServiceNow (20 por página, ajustável pelo usuário)",
                     "rowActions": ["Abrir o registro"], "emptyState": "Nenhum registro encontrado para os filtros aplicados. Limpe os filtros ou ajuste o período."}
        u["filterBehavior"] = {"applyOn": "submit", "combination": "AND", "clearAll": True}
    return u


# ------------------------------------------------------------------ apoio de texto
PERFIL_PAPEL = {"Gestor de Integração": "cbi_gestor_integracao", "Coordenador de Cobrança": "cbi_coordenador", "Coordenador": "cbi_coordenador",
                "Atendente": "cbi_atendente", "Auditor": "cbi_auditor", "Administrador": "cbi_admin", "Admin": "cbi_admin"}
SISTEMA = {"Sistema parceiro", "UFMT (sistema)", "Provedor de mensagens (sistema)"}
CAT = {"PRINCIPAL": "HAPPY_PATH", "VALIDAÇÃO": "INVALID_INPUT", "REGRA": "BUSINESS_RULE_VIOLATION", "ACESSO": "AUTHORIZATION",
       "ESTADO": "EDGE_CASE", "INTEGRAÇÃO": "EXTERNAL_SERVICE_FAILURE", "BORDA": "EDGE_CASE"}
STATUS = {"HAPPY_PATH": 200, "INVALID_INPUT": 400, "BUSINESS_RULE_VIOLATION": 422, "AUTHORIZATION": 403, "EDGE_CASE": 200, "EXTERNAL_SERVICE_FAILURE": 200}
PRIOR = {"Must": "HIGH", "Should": "MEDIUM", "Could": "LOW"}


def papel_de(perfil):
    for k, v in PERFIL_PAPEL.items():
        if perfil.startswith(k):
            return v
    return "cbi_gestor_integracao"


def frase(t):
    t = limpa(t).rstrip(".")
    return (t[0].upper() + t[1:]) if t else t


def regra_negocio_task(rn_id, rf_id):
    rn = RNS[rn_id]
    se, entao = (re.match(r"SE (.+?) ENTÃO (.+)", rn["enunciado"]) or re.match(r"(.+)()", rn["enunciado"])).groups()
    desc = (f"{frase(rn['enunciado'])}. Exceções: {rn['excecoes'] if rn['excecoes'] not in ('—', '') else 'nenhuma'}. "
            f"Por que existe: {rn['justificativa']}. ")
    if rn["conflitos"] not in ("—", ""):
        desc += f"Atenção: {rn['conflitos']}. "
    desc += f"Tipo da regra: {rn['tipo']} ({rn_id})."
    if rn["algoritmo"] not in ("—", "", "— (não é Derivação)"):
        alg = [limpa(x) for x in re.split(r"(?=\b\d\. )", rn["algoritmo"]) if limpa(x)]
    else:
        alg = [f"1. Identificar a situação em que a regra se aplica: {se}.",
               f"2. Aplicar o efeito: {entao or se}.",
               "3. Registrar o resultado no registro afetado e no log estruturado, com o identificador do lote ou do registro.",
               "4. Se a situação não se aplica, seguir o fluxo normal sem efeito colateral."]
    codigo = "VIOLACAO_" + rn_id.replace("RN-NOVO-", "").replace("-", "_")
    return {"id": rn_id, "title": rn["titulo"], "description": desc,
            "rationale": rn["justificativa"],
            "source": {"document": "business-rules.md", "section": f"{rn_id}: {rn['titulo']}", "excerpt": rn["enunciado"]},
            "implementation": {"validationPoint": "Script Include do módulo, chamado pela regra de negócio ou pela rotina agendada que aplica a regra (nunca no Client Script)",
                               "algorithm": alg,
                               "errorMessages": {codigo: f"A operação não respeita a regra «{rn['titulo']}»: {entao or se}."}},
            "testScenarios": [
                {"id": f"TS-{rn_id}-01", "category": "HAPPY_PATH", "description": f"Situação em que a regra se aplica e o efeito acontece", "given": se, "then": entao or se},
                {"id": f"TS-{rn_id}-02", "category": "BUSINESS_RULE_VIOLATION", "description": "Situação fora da regra: nada muda", "given": f"Registro que não atende a: {se}", "then": "O efeito da regra não é aplicado e nada muda no registro"}],
            "traceability": {"requirementId": rf_id, "businessRuleId": rn_id}}


def regra_ears(rf):
    return {"id": f"{rf['id']}-R1", "title": f"Comportamento obrigatório — {rf['titulo']}",
            "description": f"{rf['ears']} Esta obrigação vem do enunciado do requisito {rf['id']} ({rf['titulo']}) e vale para todos os perfis que executam a funcionalidade; a funcionalidade não tem regra de negócio própria no catálogo de regras.",
            "rationale": rf["historia"],
            "source": {"document": "requirements.md", "section": f"{rf['id']}: {rf['titulo']}", "excerpt": rf["ears"]},
            "implementation": {"validationPoint": "Script Include do módulo",
                               "algorithm": ["1. Receber a ação do usuário ou da rotina.", f"2. Cumprir o enunciado: {rf['ears']}",
                                             "3. Gravar o resultado e registrar evento de auditoria quando a ação for relevante.",
                                             "4. Devolver mensagem clara em português em caso de falha."],
                               "errorMessages": {"FALHA_" + rf["id"].replace("-", "_"): f"Não foi possível concluir: {rf['titulo'].lower()}. Tente de novo ou acione o Gestor de Integração."}},
            "testScenarios": [{"id": f"TS-{rf['id']}-R1-01", "category": "HAPPY_PATH", "description": "Comportamento cumprido", "given": rf["cenarios"][0]["dado"], "then": rf["cenarios"][0]["entao"]}],
            "traceability": {"requirementId": rf["id"]}}


# ------------------------------------------------------------------ montagem
epics, stories, todas_tasks = [], [], []
TC_COBERTO = {}
GAP_STORIES = {}
EPID = {mod: f"EPIC-{i + 1:03d}" for i, (mod, _) in enumerate(MODULOS)}
ST_DO_RF = {}
n_story = 0
for mod, _ in MODULOS:
    for rf in [r for r in RFS if r["mod"] == mod]:
        n_story += 1
        ST_DO_RF[rf["id"]] = f"STORY-{n_story:03d}"


def tabelas_do_rf(rf):
    ents = list(dict.fromkeys(RF_ENT.get(rf["id"], [])))
    tela = TELA_DO_RF.get(rf["id"])
    if not ents and tela:
        ents = AMARRA.get(tela, {}).get("entidades", [])[:3]
    if not ents:
        ents = [e for e in ENT if ENT[e]["_bc"] == MOD_INFO[rf["mod"]]["nome"]][:2]
    return [e for e in ents if e in ENT and e != "Usuario"] or ["EventoAuditoria"]


def corpo_registro(ent_nome, tc):
    e = ENT[ent_nome]
    corpo = {}
    for c in e["columns"][:5]:
        t = c["type"]
        en = c.get("enumRef")
        if en and en in ENUMS:
            corpo[c["name"]] = ENUMS[en][0]["value"]
        elif t.startswith("string"):
            corpo[c["name"]] = "TESTE-" + c["name"].upper()[:12]
        elif t in ("integer",):
            corpo[c["name"]] = 3
        elif t in ("decimal", "currency"):
            corpo[c["name"]] = 1500.0
        elif t == "boolean":
            corpo[c["name"]] = True
        elif t == "glide_date":
            corpo[c["name"]] = "2026-11-13"
        elif t == "glide_date_time":
            corpo[c["name"]] = "2026-11-13 08:00:00"
        elif t == "reference":
            corpo[c["name"]] = f"sys_id do registro de teste de {c['name']} (Anexo B da massa)"
        else:
            corpo[c["name"]] = "valor de teste"
    return corpo


def cenario(task, tc, idx, tabelas, op=None):
    cat = CAT[tc["cat"]]
    esperado = tc["esperado"] or ["O sistema cumpre o comportamento descrito."]
    perfil = tc["perfil"]
    if op:
        m, p, o = OPS[op]
        body = {}
        ex = o.get("requestBody", {}).get("content", {}).get("application/json", {}).get("examples", {})
        if ex:
            body = list(ex.values())[0]["value"]
        path = p.replace("{idLoteOrigem}", "LOTE-20261113-01").replace("{sequencia}", "1")
        if cat == "INVALID_INPUT":
            body = {}
        req = {"method": m, "path": path, "headers": {"Authorization": "Bearer token-oauth-do-usuario-de-integracao-da-fonte", "Content-Type": "application/json"}, "body": body}
        st = {"HAPPY_PATH": 201 if m == "POST" and "lotes" in p and not p.endswith("lotes/{idLoteOrigem}") else 200}.get(cat, STATUS[cat])
        if cat == "BUSINESS_RULE_VIOLATION" and "pacotes" in p:
            st = 422
        if cat == "BUSINESS_RULE_VIOLATION" and p.endswith("/lotes"):
            st = 409
        corpo_resp = {"situacao": "OK"} if st < 300 else {"type": "urn:x_cbi:erro:" + {400: "corpo-invalido", 403: "acesso-negado", 409: "lote-ja-fechado", 422: "sequencia-invalida"}.get(st, "corpo-invalido"),
                                                          "title": {400: "Corpo da requisição inválido", 403: "Acesso negado a este endpoint", 409: "Lote já fechado", 422: "Pacote fora de sequência"}.get(st, "Erro"),
                                                          "status": st, "codigo": {400: "CORPO_INVALIDO", 403: "ACESSO_NEGADO", 409: "LOTE_JA_FECHADO", 422: "SEQUENCIA_INVALIDA"}.get(st, "CORPO_INVALIDO")}
    else:
        tab = ENT[tabelas[0]]["tableName"]
        req = {"method": "POST", "path": f"/{tab}.do", "headers": {"Cookie": f"sessão SSO do usuário de teste com papel {papel_de(perfil)}", "Content-Type": "application/x-www-form-urlencoded"},
               "body": {} if cat == "INVALID_INPUT" else dict(corpo_registro(tabelas[0], tc), sysparm_action="sysverb_update")}
        st = STATUS[cat]
        corpo_resp = {"mensagem": esperado[0]} if st < 300 else {"mensagem": esperado[0], "gravado": False}
    db = {}
    for t in tabelas:
        tn = ENT[t]["tableName"]
        db[tn] = ("inalterado — nada é gravado: " + esperado[0]) if st >= 400 else ("; ".join(esperado))
    return {"id": f"AS-{task}-{idx:02d}", "category": cat,
            "title": f"Quando {tc['titulo'].split(': ', 1)[-1][0].lower() + tc['titulo'].split(': ', 1)[-1][1:]}, o sistema: {esperado[0][0].lower() + esperado[0][1:]}",
            "given": "; ".join(tc["pre"]) or "Massa de teste sintética carregada",
            "when": " → ".join(tc["passos"][1:4]) or tc["titulo"],
            "then": esperado,
            "testData": {"request": req, "expectedResponse": {"statusCode": st, "body": corpo_resp}, "expectedDatabaseState": db},
            "verificationSteps": tc["passos"],
            "relatedRules": tc["rns"],
            "coverageNote": f"Cobre {tc['id']} do plano de testes"}


DECISOES = {
    "backend": ["Regra de negócio fica em Script Include do módulo (uma responsabilidade por classe, nome em português em PascalCase); a regra de negócio da tabela só chama o Script Include — nunca contém a lógica",
                "Acesso a dados por GlideRecord/GlideAggregate com consultas filtradas e índices declarados; processamento em lotes para volumes altos, sem laço registro a registro sobre a carteira inteira",
                "Erros com código tipado (lista fechada por módulo); falha de uma fonte ou de um envio não interrompe as demais",
                "Toda ação relevante grava evento em x_cbi_auditoria_evento com usuário, ação, data e registro afetado (auditoria completa)"],
    "frontend": ["Interface nativa do ServiceNow (formulário, lista, UI Policy e Data Policy), sem tela customizada nem portal",
                 "Permissão avaliada em ACL de tabela e de campo — esconder menu não é controle; o atendente fica isolado por Query Business Rule",
                 "Mensagens ao usuário em português, sem detalhe técnico; listas com a paginação nativa",
                 "Os seis estados da tela (carregando, sucesso, erro de validação, erro de sistema, vazio, sem conexão) seguem o comportamento nativo, com mensagens próprias da aplicação"],
    "integration": ["Uma Scripted REST API por fonte sobre a classe comum ApiIngestaoBase (abrir lote, enviar pacote, fechar lote); nenhuma regra de negócio dentro da API",
                    "Autenticação OAuth 2.0 com um usuário de integração por fonte e REST API Access Policy limitando cada fonte ao próprio caminho",
                    "Erro da requisição inteira em RFC 7807 com código tipado; erro de registro dentro da resposta 200 do pacote, com motivo da lista fechada",
                    "Reenvio idempotente pela chave natural (fonte + identificador do lote + sequência; por registro, fonte + identificador de origem)"],
}


def guidance(tipo, rf, tabelas, ops):
    tn = [ENT[t]["tableName"] for t in tabelas]
    if tipo == "integration":
        fluxo = ["1. Scripted REST API recebe a chamada da fonte e confere o token OAuth e a política de acesso da fonte",
                 "2. Valida o corpo contra o contrato (tipos, tamanhos, listas de valores) e recusa campos fora do contrato",
                 f"3. ApiIngestaoBase localiza o lote pela chave fonte + identificador do lote em {ENT['LoteCarga']['tableName']}",
                 "4. Confere a sequência do pacote e se o lote ainda está aberto",
                 "5. Para cada registro, valida o documento (dígito verificador) e os campos obrigatórios",
                 f"6. Grava os registros válidos em {', '.join(tn)} pela chave natural (atualiza, nunca duplica)",
                 f"7. Grava os rejeitados em {ENT['RegistroRejeitado']['tableName']} com motivo e conteúdo original",
                 "8. Atualiza as contagens do lote (lidos, aceitos, rejeitados)",
                 "9. Monta a resposta com o resultado por registro",
                 "10. Registra log estruturado com módulo, operação, lote, fonte, resultado, quantidade e duração",
                 "11. Devolve 200/201 ou o erro RFC 7807 com o código tipado"]
    elif tipo == "frontend":
        fluxo = ["1. O usuário entra pelo SSO da instância e o menu mostra só os módulos do papel dele",
                 f"2. A lista ou o formulário da tabela {tn[0]} abre com as colunas e filtros definidos",
                 "3. A ACL de tabela avalia se o papel pode ler o registro; a Query Business Rule aplica o isolamento quando há",
                 "4. A ACL de campo mascara o CPF de pessoa física para quem não pode vê-lo",
                 "5. A UI Policy torna obrigatórios ou somente leitura os campos conforme o estado do registro",
                 "6. Ao salvar, a Data Policy confere obrigatoriedade e limites no servidor (vale também para importação e API)",
                 "7. A regra de negócio da tabela chama o Script Include do módulo para aplicar a regra",
                 "8. O sistema mostra a mensagem de confirmação ou de erro em português",
                 "9. A ação relevante grava evento de auditoria",
                 "10. A lista recarrega com o registro atualizado e o estado vazio aparece quando o filtro não encontra nada"]
    else:
        fluxo = ["1. A regra de negócio da tabela ou a rotina agendada do módulo dispara o processamento",
                 f"2. O Script Include do módulo lê os registros de {', '.join(tn)} com consulta filtrada e indexada",
                 "3. Lê os parâmetros vigentes do grupo correspondente (limites, janelas, percentuais)",
                 "4. Aplica a regra de negócio registro a registro dentro de lotes de processamento",
                 "5. Valida as condições de entrada e registra a rejeição com código tipado quando falham",
                 f"6. Grava o resultado em {tn[0]}",
                 "7. Atualiza os registros dependentes (posição, carteira, caso ou comunicação, conforme o módulo)",
                 "8. Grava o evento de auditoria quando a ação é relevante",
                 "9. Registra log estruturado com módulo, operação, lote, resultado, quantidade e duração",
                 "10. Em erro, registra o código tipado e segue com os demais registros, sem interromper o lote",
                 "11. Atualiza as métricas de negócio lidas pelos painéis"]
    return {"architecturalDecisions": DECISOES[tipo],
            "dataFlow": fluxo,
            "errorHandling": {
                "DADO_INVALIDO": {"scenario": "Entrada com campo obrigatório ausente, fora da lista de valores ou fora do limite", "action": "Recusar sem gravar e devolver código tipado com mensagem em português", "userImpact": "A pessoa vê qual campo corrigir; nada fica pela metade"},
                "SEM_PERMISSAO": {"scenario": "Papel sem permissão tenta ler ou alterar o registro", "action": "A ACL nega no dado; nada é revelado nem gravado", "userImpact": "A opção não aparece ou a tela informa falta de permissão"},
                "FALHA_INESPERADA": {"scenario": "Erro inesperado no processamento", "action": "Registrar log de erro com o identificador do lote ou do registro e devolver mensagem genérica", "userImpact": "Mensagem genérica em português, sem detalhe técnico; a pessoa pode tentar de novo"}},
            "observability": {"structuredLogging": ["info no início e no fim: {modulo, operacao, idLote, fonte, resultado, qtd, duracaoMs}", "warn em rejeição e reenvio, com o código tipado", "error em falha de fonte ou de envio; nunca CPF, e-mail, telefone ou texto de mensagem em claro"],
                              "metrics": [f"quantidade processada por situação em {tn[0]}", "duração do processamento por execução", "rejeições por motivo"],
                              "tracing": ["correlação pelo identificador do lote (fonte + idLoteOrigem) ou pelo número do registro"]},
            "securityConsiderations": ["Nenhum dado pessoal em log", "Permissão por ACL no dado, inclusive acesso direto pelo endereço do registro", "Usuário de integração sem papel de aplicação"],
            "performanceConsiderations": ["Consultas sempre filtradas e indexadas; nada de varrer a tabela inteira na interface", "Processamento em lotes nas rotinas de volume (1,8 milhão de contribuintes)"],
            "testingStrategy": {"unitTests": [f"ATF de unidade do Script Include do módulo para cada regra da história {rf['id']}"],
                                "integrationTests": ["Kit de payloads simulados por fonte (válidos, inválidos e repetidos)"] if tipo == "integration" else ["ATF de servidor com a massa sintética do plano de testes"],
                                "e2eTests": [f"ATF ponta a ponta com o usuário de teste de cada papel envolvido em {rf['titulo'].lower()}"],
                                "loadTests": ["k6 com o volume de referência quando a história toca a carga diária ou o envio em massa"] }}


def resumo(rf, tipo, tabelas, ops, papel):
    t = TELA_DO_RF.get(rf["id"])
    s = (f"O QUE ESTA TAREFA ENTREGA: {('a parte de servidor' if tipo == 'backend' else 'a tela nativa' if tipo == 'frontend' else 'a interface de recebimento dos sistemas parceiros')} "
         f"da funcionalidade «{rf['titulo']}» do módulo {MOD_INFO[rf['mod']]['nome']}. "
         f"CONTEXTO DE NEGÓCIO: {rf['historia']} O módulo existe para: {MOD_INFO[rf['mod']]['objetivo']}. Limites do módulo: {MOD_INFO[rf['mod']]['limites']}. "
         f"COMPORTAMENTO OBRIGATÓRIO: {rf['ears']} "
         f"ATORES: {rf['atores']} (papel da aplicação: {papel}). "
         f"FLUXO PRINCIPAL: (1) {rf['cenarios'][0]['dado']}; (2) {rf['cenarios'][0]['quando']}; (3) {rf['cenarios'][0]['entao']}. "
         f"Situações que também precisam funcionar: " + "; ".join(f"{c['nome'].lower()} — quando {c['quando'][0].lower() + c['quando'][1:]}, {c['entao'][0].lower() + c['entao'][1:]}" for c in rf["cenarios"][1:]) + ". "
         f"PRÉ-CONDIÇÕES: {' '.join(rf['pre'])} "
         f"PÓS-CONDIÇÕES: o resultado fica gravado em {', '.join(ENT[x]['tableName'] for x in tabelas)} e as ações relevantes ficam na auditoria. "
         f"DECISÕES ARQUITETURAIS: aplicação escopada x_cbi_ no ServiceNow; {DECISOES[tipo][0]}; {DECISOES[tipo][1]}. ")
    if t:
        s += f"TELA: {TELAS[t]['Nome']} ({t}). "
    if ops:
        s += "INTEGRAÇÕES: sistemas parceiros chamam as operações " + ", ".join(f"{OPS[o][0]} {OPS[o][1]}" for o in ops) + " (contratos completos em apiContracts desta task). "
    if any("BLOQUEADO" in RNS[r]["conflitos"] for r in rf["rns"] if r in RNS):
        s += "ATENÇÃO — BLOQUEADO: sem fonte de opt-in para ICMS, ITCD e parcelamentos (GAP-028), nenhuma comunicação desses segmentos sai; só o IPVA opera. "
    return s


nt_global = 0
for mod, nome_mod in MODULOS:
    ep = EPID[mod]
    st_ids = []
    for rf in [r for r in RFS if r["mod"] == mod]:
        sid = ST_DO_RF[rf["id"]]
        st_ids.append(sid)
        tabelas = tabelas_do_rf(rf)
        ops = RF_OPS.get(rf["id"], [])
        tela = TELA_DO_RF.get(rf["id"])
        tipos = []
        if ops:
            tipos.append("integration")
        if rf["atores"] not in SISTEMA or not ops:
            tipos.append("backend")
        if tela:
            tipos.append("frontend")
        tcs = [tc for tc in TCS if rf["id"] in tc["rfs"][:1] or (tc["rfs"] and tc["rfs"][0] == rf["id"])]
        regras_rf = [regra_negocio_task(r, rf["id"]) for r in rf["rns"] if r in RNS] or [regra_ears(rf)]
        papel = papel_de(next((tc["perfil"] for tc in tcs if tc["cat"] == "PRINCIPAL"), "Gestor de Integração"))
        tasks = []
        for i, tipo in enumerate(tipos, 1):
            tid = f"TASK-{sid[6:]}-{i:02d}"
            if tipo == "frontend":
                meus = [tc for tc in tcs if tc["cat"] in ("VALIDAÇÃO", "ESTADO", "ACESSO")]
            elif tipo == "integration":
                meus = [tc for tc in tcs if tc["cat"] not in ("ESTADO",)]
            else:
                meus = [tc for tc in tcs if tc["cat"] not in ("ESTADO",) and not ("integration" in tipos and tc["cat"] in ("PRINCIPAL", "VALIDAÇÃO", "INTEGRAÇÃO", "ACESSO"))]
            if not meus:
                meus = [tc for tc in tcs if tc["cat"] == "PRINCIPAL"][:1] or tcs[:1]
            op_api = ops[0] if tipo == "integration" else None
            cen = []
            for k, tc in enumerate(meus, 1):
                opx = None
                if op_api:
                    opx = next((o for o in ops if "fecharLote" in o), op_api) if tc["cat"] == "PRINCIPAL" else (next((o for o in ops if "enviarPacote" in o), op_api) if tc["cat"] in ("REGRA", "BORDA", "VALIDAÇÃO") else op_api)
                cen.append(cenario(tid, tc, k, tabelas, opx))
                TC_COBERTO.setdefault(tc["id"], []).append(tid)
            titulo = {"backend": f"Regra e processamento de servidor — {rf['titulo']}",
                      "frontend": f"Tela nativa {TELAS[tela]['Nome'] if tela else ''} — {rf['titulo']}",
                      "integration": f"Recebimento dos sistemas parceiros — {rf['titulo']}"}[tipo]
            task = {"id": tid, "storyId": sid, "epicId": ep, "sequence": i, "class": "functional", "title": titulo,
                    "description": {"backend": f"Criar no servidor a lógica de «{rf['titulo'].lower()}»: Script Include do módulo, regra de negócio da tabela e, quando houver, a rotina agendada, cumprindo: {rf['ears']}",
                                    "frontend": f"Montar a tela nativa {TELAS[tela]['Nome'] if tela else ''} para «{rf['titulo'].lower()}»: formulário ou lista, campos, filtros, políticas de interface, ACL de tabela e de campo e mensagens em português.",
                                    "integration": f"Expor aos sistemas parceiros as operações de lote de «{rf['titulo'].lower()}» (abrir lote, enviar pacote, fechar lote) sobre a classe comum de ingestão, com OAuth por fonte e resposta por registro."}[tipo],
                    "type": tipo, "status": "PENDING",
                    "business": {"objective": rf["historia"], "rationale": MOD_INFO[rf["mod"]]["objetivo"],
                                 "businessFlowSteps": [f"{n}. {frase(c['quando'])} → {frase(c['entao'])}" for n, c in enumerate(rf["cenarios"], 1)]},
                    "agentExecutionContext": {
                        "selfContainedSummary": resumo(rf, tipo, tabelas, ops if tipo == "integration" else [], papel),
                        "criticalWarnings": ["Nunca logar CPF, e-mail, telefone ou conteúdo de mensagem em claro",
                                             "Permissão sempre por ACL no dado — esconder menu não é controle",
                                             "Nada fora do escopo x_cbi_: tabela, ACL ou propriedade global só com acordo da TI SEFAZ-MT"],
                        "doNotDo": ["Não colocar regra de negócio em Client Script ou dentro da Scripted REST API", "Não comparar choice pelo rótulo; sempre pelo valor", "Não usar dado pessoal real em teste"],
                        "minimumOutputToDeliver": {"backend": ["Script Include do módulo com a regra", "Regra de negócio da tabela chamando o Script Include", "ATF de unidade cobrindo os cenários desta task"],
                                                   "frontend": ["Formulário e lista configurados com campos e filtros desta task", "UI Policy, Data Policy e ACL de tabela e de campo", "ATF de interface com os estados da tela"],
                                                   "integration": ["Scripted REST API da fonte com os recursos de lote", "Uso da ApiIngestaoBase com resultado por registro", "Kit de payloads simulados válidos, inválidos e repetidos"]}[tipo]},
                    "implementationGuidance": guidance(tipo, rf, tabelas, ops),
                    "persistenceModel": {"entities": [entidade_prosa(t) for t in dict.fromkeys(tabelas + (["LoteCarga", "RegistroRejeitado"] if tipo == "integration" else []) + ["EventoAuditoria"])]},
                    "businessRules": regras_rf,
                    "acceptanceScenarios": cen,
                    "validation": {"businessCriteria": [frase(c["entao"]) for c in rf["cenarios"]], "technicalCriteria": ["ATF verde para todos os cenários desta task", "Nenhum dado pessoal em log"]},
                    "traceability": {"requirementIds": [rf["id"]], "businessRuleIds": rf["rns"], "testCaseIds": [tc["id"] for tc in meus]}}
            if tipo == "integration":
                task["apiContracts"] = [contrato(o) for o in ops]
            if tipo == "frontend":
                task["uiContext"] = ui_context(rf["id"], tela)
            tasks.append(task)
        # história
        us = rf["us"] or {"asA": rf["atores"].lower(), "iWant": rf["titulo"].lower(), "soThat": MOD_INFO[rf["mod"]]["objetivo"][0].lower() + MOD_INFO[rf["mod"]]["objetivo"][1:]}
        pitch = f"Como {us['asA']}, quero {us['iWant']}, para {us['soThat']}. Hoje {MOD_INFO[rf['mod']]['objetivo'][0].lower() + MOD_INFO[rf['mod']]['objetivo'][1:]} depende de trabalho manual ou não acontece."
        bloqueado = any("BLOQUEADO" in RNS[r]["conflitos"] for r in rf["rns"] if r in RNS)
        regras_story = []
        for r in rf["rns"]:
            if r in RNS:
                x = RNS[r]
                regras_story.append({"id": r, "title": x["titulo"],
                                     "description": f"{frase(x['enunciado'])}. Exceções: {x['excecoes'] if x['excecoes'] not in ('—', '') else 'nenhuma'}. Por que existe: {x['justificativa']}." + (f" {x['conflitos']}." if x["conflitos"] not in ("—", "") else ""),
                                     "exceptions": x["excecoes"], "sourceTaskIds": [t["id"] for t in tasks]})
        if not regras_story:
            regras_story = [{"id": f"{rf['id']}-R1", "title": f"Comportamento obrigatório — {rf['titulo']}",
                             "description": f"{rf['ears']} A funcionalidade não tem regra própria no catálogo de regras; vale este enunciado do requisito, que define o que o sistema precisa fazer em todos os casos.",
                             "sourceTaskIds": [t["id"] for t in tasks]}]
        story = {"id": sid, "epicId": ep, "name": f"{rf['id']} — {rf['titulo']}" + (" ⚠️ BLOQUEADO (GAP-028)" if bloqueado else ""),
                 "adoWorkItemType": "User Story", "workItemType": "USER_STORY", "priority": PRIOR.get(rf["moscow"], "MEDIUM"),
                 "userStory": us,
                 "narrative": {"elevatorPitch": pitch,
                               "context": f"{rf['ears']} O módulo {MOD_INFO[rf['mod']]['nome']} existe para {MOD_INFO[rf['mod']]['objetivo'][0].lower() + MOD_INFO[rf['mod']]['objetivo'][1:]}. Limites: {MOD_INFO[rf['mod']]['limites']}. Pré-condição: {' '.join(rf['pre'])}"
                                          + (" Esta história está BLOQUEADA para ICMS, ITCD e parcelamentos até existir fonte de opt-in (GAP-028); só o IPVA opera." if bloqueado else ""),
                               "problem": f"Sem esta funcionalidade, {MOD_INFO[rf['mod']]['objetivo'][0].lower() + MOD_INFO[rf['mod']]['objetivo'][1:]} não acontece de forma automática e auditável.",
                               "deliveredValue": frase(us["soThat"]) + ".",
                               "actors": [rf["atores"]],
                               "mainFlow": [frase(c["quando"]) + " → " + c["entao"][0].lower() + c["entao"][1:] for c in rf["cenarios"]],
                               "userStoryStatement": rf["historia"]},
                 "businessRules": regras_story,
                 "acceptanceCriteria": [{"id": f"AC-{sid}-{k:02d}", "statement": f"{c['nome']}: com {c['dado'][0].lower() + c['dado'][1:]}, quando {c['quando'][0].lower() + c['quando'][1:]}, {c['entao'][0].lower() + c['entao'][1:]}.",
                                         "category": "HAPPY_PATH" if k == 1 else "BUSINESS_RULE" if rf["rns"] else "EDGE_CASE",
                                         "relatedRuleIds": rf["rns"], "sourceTaskIds": [t["id"] for t in tasks], "traceability": f"{rf['id']} — cenário {k}"} for k, c in enumerate(rf["cenarios"], 1)],
                 "deliveryScope": [{"taskId": t["id"], "title": t["title"], "businessOutcome": {"backend": "A regra roda no servidor e o resultado fica gravado e auditável.", "frontend": "A pessoa usa a tela, com os campos, filtros e mensagens certos para o papel dela.", "integration": "Os sistemas parceiros entregam os dados em lotes, com resposta por registro e sem duplicar nada."}[t["type"]]} for t in tasks],
                 "dependencies": [ST_DO_RF[d] for d in rf["deps"] if d in ST_DO_RF],
                 "sourceRefs": [{"document": "requirements.md", "section": f"{rf['id']}: {rf['titulo']}", "itemId": rf["id"]}] + [{"document": "business-rules.md", "section": f"{r}: {RNS[r]['titulo']}", "itemId": r} for r in rf["rns"] if r in RNS],
                 "traceability": {"requirementIds": [rf["id"]], "businessRuleIds": rf["rns"], "sourceTaskIds": [t["id"] for t in tasks], "evidence": rf["rastro"]},
                 "tasks": tasks}
        if tela:
            story["uiContext"] = ui_context(rf["id"], tela)
        if bloqueado:
            GAP_STORIES.setdefault("GAP-028", []).append(sid)
        stories.append(story)
    # épico
    info = MOD_INFO[mod]
    rfs_mod = [r for r in RFS if r["mod"] == mod]
    epics.append({"id": ep, "name": f"{mod} — {info['nome']}", "adoWorkItemType": "Epic",
                  "narrative": {"elevatorPitch": f"Para {info['atores']}: {info['objetivo'][0].lower() + info['objetivo'][1:]}. Este épico reúne as {len(rfs_mod)} funcionalidades do módulo {info['nome']} da Cobrança Inteligente da SEFAZ-MT.",
                                "context": f"O módulo {info['nome']} ({mod}) tem como objetivo de negócio: {info['objetivo']}. Limites — o que ele não faz: {info['limites']}. Funcionalidades: " + "; ".join(r["titulo"] for r in rfs_mod) + ".",
                                "problem": "Hoje a cobrança da SEFAZ-MT é selecionada de forma empírica, distribuída por planilha e medida sem grupo de controle; " + info["objetivo"][0].lower() + info["objetivo"][1:] + " não acontece de forma automática.",
                                "deliveredValue": info["objetivo"],
                                "actors": [a.strip() for a in info["atores"].split(";")],
                                "mainFlow": [r["titulo"] for r in rfs_mod[:7]]},
                  "businessRules": [{"id": r, "title": RNS[r]["titulo"], "description": f"{frase(RNS[r]['enunciado'])}. Por que existe: {RNS[r]['justificativa']}.", "sourceStoryIds": [ST_DO_RF[x] for x in RNS[r]["vinc"] if x in ST_DO_RF]} for r in RNS if RNS[r]["vinc"] and RF.get(RNS[r]["vinc"][0], {}).get("mod") == mod]
                  or [{"id": f"{mod}-OBJ", "title": "Objetivo do módulo", "description": f"{info['objetivo']}. Limites: {info['limites']}.", "sourceStoryIds": st_ids}],
                  "acceptanceCriteria": [{"id": f"AC-{ep}-{k:02d}", "statement": f"{r['titulo']}: {r['cenarios'][0]['entao'][0].upper() + r['cenarios'][0]['entao'][1:]}.", "category": "OUTCOME", "sourceStoryIds": [ST_DO_RF[r['id']]]} for k, r in enumerate(rfs_mod, 1)],
                  "successMetrics": ["Efeito incremental da cobrança (taxa cobrada − taxa do grupo de controle) de pelo menos +5 pontos percentuais em 3 ciclos após o go-live",
                                     "100% dos casos distribuídos automaticamente e 100% das carteiras formadas por versão publicada já no 1º ciclo após o go-live",
                                     "Pelo menos 95% dos ciclos com as seis fontes consolidadas em 3 ciclos após o go-live"],
                  "moduleScope": [mod],
                  "outOfScope": ["Cobrança Ativa por telefone", "Distribuição por vínculo contador ↔ atendente", "Desenvolvimento ou recalibração do modelo de score (é da UFMT)", "Login e SSO (responsabilidade da instância)"],
                  "containedStoryIds": st_ids,
                  "sourceRefs": [{"document": "modules.md", "section": f"Catálogo — {mod}", "itemId": mod}, {"document": "product-vision.md", "section": "4. Objetivos e Métricas de Sucesso (SMART)", "itemId": "pv-objetivos"}]
                  + [{"document": "requirements.md", "section": f"{r['id']}: {r['titulo']}", "itemId": r["id"]} for r in rfs_mod],
                  "traceability": {"sourceStoryIds": st_ids}})

# ------------------------------------------------------------------ spikes do HLD
SPIKE_GAP = {"RSK-01": "GAP-020", "RSK-02": "GAP-004", "RSK-03": "GAP-002", "RSK-04": "GAP-028", "RSK-05": "GAP-001"}
SPIKE_MOD = {"RSK-01": "MOD-INGESTAO", "RSK-02": "MOD-REGUAS", "RSK-03": "MOD-MONITORAMENTO", "RSK-04": "MOD-REGUAS", "RSK-05": "MOD-SCORE"}
for r in HLD["riscos"]:
    n_story += 1
    sid = f"STORY-{n_story:03d}"
    ep = EPID[SPIKE_MOD[r["id"]]]
    tid = f"TASK-{sid[6:]}-01"
    gap = SPIKE_GAP[r["id"]]
    stories.append({"id": sid, "epicId": ep, "name": f"Investigação — {r['risco']}", "adoWorkItemType": "User Story", "workItemType": "SPIKE", "priority": "HIGH",
                    "userStory": {"asA": "time de desenvolvimento", "iWant": f"responder com medição: {r['spike'][0].lower() + r['spike'][1:]}", "soThat": f"evitar o impacto: {r['impacto'].lower()}"},
                    "narrative": {"elevatorPitch": f"Como time de desenvolvimento, quero responder com medição se {r['spike'][0].lower() + r['spike'][1:]}, para evitar este impacto no negócio: {r['impacto'].lower()}.",
                                  "context": f"O desenho técnico registrou o risco {r['id']}: {r['risco']}. Impacto se acontecer: {r['impacto']}. A investigação tem prazo fechado e termina numa decisão registrada; ela não entrega funcionalidade ao usuário, mas evita retrabalho nas histórias do módulo. Lacuna relacionada: {gap}.",
                                  "problem": r["risco"], "deliveredValue": f"Decisão registrada sobre: {r['spike']}", "actors": ["Time de desenvolvimento", "Gestor de Integração"],
                                  "mainFlow": ["Montar a medição com dados sintéticos", "Medir e comparar com o limite esperado", "Registrar a decisão e o que muda nas histórias"]},
                    "spikeDetails": {"question": r["spike"], "timeboxDays": 3, "expectedOutcome": "DECISION"},
                    "businessRules": [{"id": r["id"], "title": f"Risco técnico {r['id']}", "description": f"{r['risco']}. Se o risco se confirmar, o impacto no negócio é: {r['impacto']}. A investigação precisa terminar com uma resposta medida e uma decisão registrada antes de as histórias afetadas começarem.", "sourceTaskIds": [tid]}],
                    "acceptanceCriteria": [{"id": f"AC-{sid}-01", "statement": f"A pergunta «{r['spike']}» tem resposta medida e a decisão está registrada, com o que muda nas histórias afetadas.", "category": "OUTCOME", "sourceTaskIds": [tid]}],
                    "deliveryScope": [{"taskId": tid, "title": f"Investigar: {r['spike']}", "businessOutcome": "Decisão registrada antes de construir as histórias afetadas."}],
                    "sourceRefs": [{"document": "hld.md", "section": f"Riscos e spikes — {r['id']}", "itemId": r["id"]}, {"document": "gaps.md", "section": gap, "itemId": gap}],
                    "traceability": {"riskIds": [r["id"]], "gapIds": [gap], "sourceTaskIds": [tid]},
                    "tasks": [{"id": tid, "storyId": sid, "epicId": ep, "sequence": 1, "class": "spike", "type": "documentation", "title": f"Investigar: {r['spike']}",
                               "description": f"Investigação com prazo fechado para responder: {r['spike']} Risco de origem: {r['risco']}. O resultado é uma decisão registrada, não código de produção.",
                               "status": "PENDING",
                               "agentExecutionContext": {"selfContainedSummary": f"Pergunta: {r['spike']} Risco: {r['risco']}. Impacto: {r['impacto']}. Usar só dados sintéticos e o ambiente de desenvolvimento."},
                               "spike": {"question": r["spike"], "timeboxDays": 3, "exitCriteria": ["Resposta medida (número e condição do teste) registrada", "Decisão e impacto nas histórias registrados no sync-log"], "closesGapId": gap}}]})
    next(e for e in epics if e["id"] == ep)["containedStoryIds"].append(sid)

# ------------------------------------------------------------------ documento
n_tasks = sum(len(s["tasks"]) for s in stories)
tc_ids = [tc["id"] for tc in TCS]
descobertos = [t for t in tc_ids if t not in TC_COBERTO]
doc = {
    "metadata": {
        "schemaVersion": "tasks/v5.3", "outputLanguage": "pt-BR", "projectName": "Cobrança Inteligente — 2.6 Cobrança (SEFAZ-MT)",
        "generatedAt": HOJE, "generatedBy": "spec-tasks",
        "backlogHierarchy": {"levels": ["epic", "feature", "story", "task"], "suggested": ["epic", "feature", "story", "task"],
                             "chosen": ["epic", "story", "task"],
                             "levelDetail": {"epic": "full", "story": "full"},
                             "rationale": "Os 7 módulos já são os épicos (e as épicas do plano de testes); um nível de Feature repetiria o módulo, e o objetivo da simulação é um kanban simples por história.",
                             "decidedAt": HOJE, "decidedBy": "agent"},
        "compactProse": {"enabled": True, "scope": ["apiContracts", "persistenceModel"], "notes": "apiContracts e persistenceModel em strings ricas."},
        "azureDevOps": {"processTemplateName": "Agile", "workItemTypes": {"epic": {"wit": "Epic", "publish": False}, "story": {"wit": "User Story", "publish": False}, "task": {"wit": "Task", "publish": False}},
                        "notes": "Simulação: publicação no Azure DevOps pulada por decisão de Pedro (spec-tasks-azure fora da cadeia)."},
        "effort": {"skipped": True, "reason": "Simulação sem horas por decisão de Pedro: effortHours não preenchido e spec-estimate pulada."},
        "scenariosFrom": "test-plan", "testCasesCovered": len(tc_ids) - len(descobertos), "testCasesTotal": len(tc_ids),
        "counts": {"epics": len(epics), "stories": len(stories), "tasks": n_tasks}},
    "epics": epics,
    "stories": stories,
    "globalDependencies": [{"from": ST_DO_RF[r["id"]], "dependsOn": ST_DO_RF[d], "reason": f"{r['id']} depende de {d}"} for r in RFS for d in r["deps"] if d in ST_DO_RF],
    "glossary": [{"term": "Fonte", "definition": "Sistema da SEFAZ que envia débitos ou score: CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e e UFMT."},
                 {"term": "Lote", "definition": "Remessa diária de uma fonte, enviada em pacotes numerados."},
                 {"term": "Carteira", "definition": "Lista de contribuintes escolhidos para cobrança no ciclo."},
                 {"term": "Grupo de controle", "definition": "Parte da carteira sorteada que não é cobrada, para medir o efeito da cobrança."},
                 {"term": "Régua", "definition": "Sequência de mensagens por e-mail, SMS e WhatsApp em etapas."},
                 {"term": "Caso", "definition": "Contribuinte encaminhado a um atendente para cobrança qualificada."},
                 {"term": "ATF", "definition": "Automated Test Framework — ferramenta de teste automatizado do ServiceNow."}],
    "externalReferences": [{"id": "TEST-PLAN", "type": "testPlan", "path": "outputs/spec/test-plan.md", "description": "Plano de testes de negócio gerado pela spec-test-plan — fonte dos cenários de aceite"}],
}
(SPEC / "tasks.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("epics", len(epics), "stories", len(stories), "tasks", n_tasks, "TC descobertos", descobertos[:10], len(descobertos))
