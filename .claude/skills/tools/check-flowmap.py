"""
check-flowmap.py — valida a gramática estrita de outputs/spec/flow-map.md.

O flow-map é SOMENTE Markdown (não existe flow-map.json persistido). Este script
parseia o .md; outros scripts obtêm a estrutura via `--json` (stdout apenas).

Gramática (fonte canônica: spec-product/templates/flow-map.md):
  - Título nível 1 livre; depois exatamente 4 seções obrigatórias, cada uma com
    UMA tabela Markdown de colunas fixas (prosa entre seções é ignorada):
      ## Fluxos      | ID | Nome | Tipo | Ator principal | Origem (AS-IS) | Objetivo |
      ## Etapas      | ID | Fluxo | Ordem | Nome | Ator | Tela | Entrada | Saída |
      ## Telas       | ID | Nome | Rota | Módulo | Estados UI | RF/PR | Screenshot |
      ## Transições  | ID | De | Para | Gatilho | Regras | Estado da entidade |
  - 5ª seção OPCIONAL `## Amarração Técnica` (preenchida pelas Fases 6a/6b):
      | Tela | Entidades | Endpoints |
    Tela = TEL-xxx existente em ## Telas, única por linha; Entidades = nomes de
    entidade separados por vírgula ou `—`; Endpoints = `METHOD /path`
    (METHOD ∈ GET|POST|PUT|PATCH|DELETE) separados por vírgula ou `—`.
    Seção ausente → comportamento idêntico ao anterior (nenhum erro/aviso novo).
  - IDs: FLX-\\d{3}, ETP-\\d{3}, TEL-\\d{3}, TRS-\\d{3}. Células nunca vazias: usar `—`.
  - Seções extras (ex.: ## Cobertura) são ignoradas pelo parser.

ERROS (exit 1): seção ausente; coluna faltando/extra; ID fora do formato; ID
duplicado; referência quebrada; Ordem duplicada no fluxo; célula vazia; na
amarração: tela inexistente/duplicada, endpoint malformado.
AVISOS + MÉTRICAS (exit 0, sempre impressos): % etapas com tela; % transições
com RN; telas órfãs; fluxos sem etapas; matriz estado×tela (estados sem tela).
Com ## Amarração Técnica: % telas com amarração; com --data-model: entidade
desconhecida (AVISO) + entidades do data-model sem tela; com --contracts:
endpoint desconhecido (AVISO) + endpoints órfãos do contrato.

Uso (caminho relativo ao SKILL.md que invoca — vale nos 3 espelhos: skills/,
 .cursor/skills/, plugin/skills/; ver tools/references/paths.md):
  python3 ../tools/check-flowmap.py [caminho/flow-map.md]
  Flags: --json (estrutura+métricas em JSON no stdout, não grava arquivo)
         --manifest <screens-manifest.json> (cross-check telas — só AVISO)
         --data-model <data-model.json> (cross-check Entidades da amarração
             contra boundedContexts[].entities[].name — só AVISO + métrica)
         --contracts <api-contracts.yaml> (cross-check Endpoints da amarração
             contra paths do OpenAPI, extração por regex — só AVISO + métrica)
         --strict (avisos viram erros)
  --data-model/--contracts só têm efeito quando ## Amarração Técnica existe.

Exit codes: 0 ok · 1 erro de gramática/integridade · 2 arquivo não encontrado.
"""

import argparse
import codecs
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

DASH = "—"

SECTIONS = {
    "Fluxos": ["ID", "Nome", "Tipo", "Ator principal", "Origem (AS-IS)", "Objetivo"],
    "Etapas": ["ID", "Fluxo", "Ordem", "Nome", "Ator", "Tela", "Entrada", "Saída"],
    "Telas": ["ID", "Nome", "Rota", "Módulo", "Estados UI", "RF/PR", "Screenshot"],
    "Transições": ["ID", "De", "Para", "Gatilho", "Regras", "Estado da entidade"],
}

ID_PATTERNS = {
    "Fluxos": re.compile(r"^FLX-\d{3}$"),
    "Etapas": re.compile(r"^ETP-\d{3}$"),
    "Telas": re.compile(r"^TEL-\d{3}$"),
    "Transições": re.compile(r"^TRS-\d{3}$"),
}

RE_PROC = re.compile(r"^PROC-[A-Za-z0-9_.\-]+$")
RE_MOD = re.compile(r"^MOD-[A-Za-z0-9_.\-]+$")
RE_RFPR = re.compile(r"^(RF|PR)-[A-Za-z0-9_.\-]+$")
RE_RN = re.compile(r"^RN-[A-Za-z0-9_.\-]+$")
RE_TEL = re.compile(r"^TEL-\d{3}$")
RE_SCREENSHOT = re.compile(r"^screens/TEL-\d{3}\.png$")
RE_ESTADO = re.compile(r"^[\wÀ-ÿ][\w À-ÿ\-]*\.[\wÀ-ÿ][\w À-ÿ\-]*$")
RE_ENDPOINT = re.compile(r"^(GET|POST|PUT|PATCH|DELETE) /\S*$")

AMARRACAO = "Amarração Técnica"
AMARRACAO_COLUMNS = ["Tela", "Entidades", "Endpoints"]


def split_row(line):
    """Divide uma linha `| a | b |` em células (strip)."""
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def parse_document(text, errors):
    """Extrai as 4 seções obrigatórias (+ ## Amarração Técnica opcional).
    Retorna (data, parsed_ok, amarracao) — amarracao é None quando a seção não existe."""
    heading = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
    known = set(SECTIONS) | {AMARRACAO}
    found = {}
    matches = list(heading.finditer(text))
    for i, m in enumerate(matches):
        name = m.group(1).strip()
        if name not in known:
            continue
        if name in found:
            errors.append(f"seção duplicada: ## {name}")
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        found[name] = text[m.end():end]

    data, parsed_ok = {}, {}
    for name, columns in SECTIONS.items():
        if name not in found:
            errors.append(f"seção obrigatória ausente: ## {name}")
            data[name], parsed_ok[name] = [], False
            continue
        before = len(errors)
        data[name] = parse_table(name, columns, found[name], errors)
        # tabela ausente/colunas divergentes ⇒ referências a esta seção não são checáveis
        parsed_ok[name] = not (len(errors) > before and not data[name])

    amarracao = None
    if AMARRACAO in found:
        amarracao = parse_table(AMARRACAO, AMARRACAO_COLUMNS, found[AMARRACAO], errors)
    return data, parsed_ok, amarracao


def parse_table(section, columns, body, errors):
    """Parseia a primeira tabela Markdown do corpo da seção."""
    lines = [l for l in body.splitlines()]
    table = []
    in_table = False
    for l in lines:
        if l.strip().startswith("|"):
            in_table = True
            table.append(l)
        elif in_table:
            break  # tabela terminou; prosa posterior é ignorada
    if len(table) < 2:
        errors.append(f"## {section}: tabela ausente ou incompleta (cabeçalho + separador obrigatórios)")
        return []

    header = split_row(table[0])
    if header != columns:
        missing = [c for c in columns if c not in header]
        extra = [c for c in header if c not in columns]
        detail = []
        if missing:
            detail.append(f"faltando {missing}")
        if extra:
            detail.append(f"extra {extra}")
        if not detail:
            detail.append(f"ordem esperada {columns}")
        errors.append(f"## {section}: colunas divergentes — {'; '.join(detail)}")
        return []

    rows = []
    for l in table[2:]:  # pula separador
        cells = split_row(l)
        if all(re.fullmatch(r":?-{2,}:?", c or "-") for c in cells):
            continue  # separador extra
        if len(cells) != len(columns):
            errors.append(f"## {section}: linha com {len(cells)} células (esperado {len(columns)}): {l.strip()[:80]}")
            continue
        row = dict(zip(columns, cells))
        for col, val in row.items():
            if val == "":
                rid = row.get("ID") or row.get("Tela") or "?"
                errors.append(f"## {section} {rid}: célula vazia na coluna «{col}» — usar {DASH}")
        rows.append(row)
    return rows


def check_ids(data, errors):
    for section, rows in data.items():
        pat = ID_PATTERNS[section]
        seen = set()
        for row in rows:
            rid = row.get("ID", "")
            if not pat.match(rid):
                errors.append(f"## {section}: ID fora do formato ({pat.pattern}): «{rid}»")
            if rid in seen:
                errors.append(f"## {section}: ID duplicado: {rid}")
            seen.add(rid)


def check_fields_and_refs(data, parsed_ok, errors):
    """Valida campos e referências. Referências a uma seção cuja tabela não
    parseou (coluna faltando etc.) são puladas para evitar falso positivo."""
    flx = {r["ID"] for r in data["Fluxos"]}
    tel = {r["ID"] for r in data["Telas"]}
    etp = {r["ID"] for r in data["Etapas"]}

    for r in data["Fluxos"]:
        if r["Tipo"] not in ("AS-IS", "TO-BE"):
            errors.append(f"FLX {r['ID']}: Tipo deve ser AS-IS ou TO-BE: «{r['Tipo']}»")
        if r["Origem (AS-IS)"] != DASH and not RE_PROC.match(r["Origem (AS-IS)"]):
            errors.append(f"FLX {r['ID']}: Origem deve ser PROC-... ou {DASH}: «{r['Origem (AS-IS)']}»")

    ordem_por_fluxo = {}
    for r in data["Etapas"]:
        if parsed_ok["Fluxos"] and r["Fluxo"] not in flx:
            errors.append(f"ETP {r['ID']}: referência quebrada — fluxo «{r['Fluxo']}» não existe em ## Fluxos")
        try:
            ordem = int(r["Ordem"])
            if ordem < 1:
                raise ValueError
        except ValueError:
            errors.append(f"ETP {r['ID']}: Ordem deve ser inteiro ≥ 1: «{r['Ordem']}»")
            ordem = None
        if ordem is not None:
            key = (r["Fluxo"], ordem)
            if key in ordem_por_fluxo:
                errors.append(f"ETP {r['ID']}: Ordem {ordem} duplicada no fluxo {r['Fluxo']} (conflito com {ordem_por_fluxo[key]})")
            ordem_por_fluxo[key] = r["ID"]
        if r["Tela"] != DASH:
            if not RE_TEL.match(r["Tela"]):
                errors.append(f"ETP {r['ID']}: Tela deve ser TEL-\\d{{3}} ou {DASH}: «{r['Tela']}»")
            elif parsed_ok["Telas"] and r["Tela"] not in tel:
                errors.append(f"ETP {r['ID']}: referência quebrada — tela «{r['Tela']}» não existe em ## Telas")

    for r in data["Telas"]:
        if not r["Rota"].startswith("/"):
            errors.append(f"TEL {r['ID']}: Rota deve começar com «/»: «{r['Rota']}»")
        if r["Módulo"] != DASH and not RE_MOD.match(r["Módulo"]):
            errors.append(f"TEL {r['ID']}: Módulo deve ser MOD-... ou {DASH}: «{r['Módulo']}»")
        if r["RF/PR"] != DASH:
            for item in [x.strip() for x in r["RF/PR"].split(",")]:
                if not RE_RFPR.match(item):
                    errors.append(f"TEL {r['ID']}: RF/PR inválido (esperado RF-.../PR-...): «{item}»")
        if r["Screenshot"] != DASH and not RE_SCREENSHOT.match(r["Screenshot"]):
            errors.append(f"TEL {r['ID']}: Screenshot deve ser screens/TEL-xxx.png ou {DASH}: «{r['Screenshot']}»")

    for r in data["Transições"]:
        if parsed_ok["Etapas"] and r["De"] not in etp:
            errors.append(f"TRS {r['ID']}: referência quebrada — De «{r['De']}» não existe em ## Etapas")
        if parsed_ok["Etapas"] and r["Para"] != DASH and r["Para"] not in etp:
            errors.append(f"TRS {r['ID']}: referência quebrada — Para «{r['Para']}» não existe em ## Etapas")
        if r["Regras"] != DASH:
            for item in [x.strip() for x in r["Regras"].split(",")]:
                if not RE_RN.match(item):
                    errors.append(f"TRS {r['ID']}: Regra inválida (esperado RN-...): «{item}»")
        if r["Estado da entidade"] != DASH and not RE_ESTADO.match(r["Estado da entidade"]):
            errors.append(f"TRS {r['ID']}: Estado da entidade deve ser «Entidade.estado» ou {DASH}: «{r['Estado da entidade']}»")


def compute_metrics(data, warnings):
    etapas, transicoes, telas, fluxos = data["Etapas"], data["Transições"], data["Telas"], data["Fluxos"]
    tela_por_etapa = {r["ID"]: r["Tela"] for r in etapas}

    com_tela = [r for r in etapas if r["Tela"] != DASH]
    pct_tela = round(100.0 * len(com_tela) / len(etapas), 1) if etapas else 0.0
    com_rn = [r for r in transicoes if r["Regras"] != DASH]
    pct_rn = round(100.0 * len(com_rn) / len(transicoes), 1) if transicoes else 0.0

    usadas = {r["Tela"] for r in etapas if r["Tela"] != DASH}
    orfas = sorted({r["ID"] for r in telas} - usadas)
    if orfas:
        warnings.append(f"telas órfãs (nenhuma etapa as referencia): {', '.join(orfas)}")

    com_etapa = {r["Fluxo"] for r in etapas}
    sem_etapas = sorted({r["ID"] for r in fluxos} - com_etapa)
    if sem_etapas:
        warnings.append(f"fluxos sem etapas: {', '.join(sem_etapas)}")

    matriz = {}
    for r in transicoes:
        estado = r["Estado da entidade"]
        if estado == DASH:
            continue
        envolvidas = matriz.setdefault(estado, set())
        for ref in (r["De"], r["Para"]):
            t = tela_por_etapa.get(ref, DASH)
            if t != DASH:
                envolvidas.add(t)
    matriz = {k: sorted(v) for k, v in sorted(matriz.items())}
    estados_sem_tela = [k for k, v in matriz.items() if not v]
    for e in estados_sem_tela:
        warnings.append(f"estado sem tela associada (matriz estado×tela): {e}")

    return {
        "total_fluxos": len(fluxos), "total_etapas": len(etapas),
        "total_telas": len(telas), "total_transicoes": len(transicoes),
        "pct_etapas_com_tela": pct_tela,
        "pct_transicoes_com_rn": pct_rn,
        "telas_orfas": orfas,
        "fluxos_sem_etapas": sem_etapas,
        "matriz_estado_tela": matriz,
        "estados_sem_tela": estados_sem_tela,
    }


def check_amarracao(rows, data, parsed_ok, errors):
    """Valida a seção opcional ## Amarração Técnica (só chamada quando ela existe)."""
    tel = {r["ID"] for r in data["Telas"]}
    seen = set()
    for r in rows:
        tela = r["Tela"]
        if not RE_TEL.match(tela):
            errors.append(f"## {AMARRACAO}: Tela deve ser TEL-\\d{{3}}: «{tela}»")
        elif parsed_ok["Telas"] and tela not in tel:
            errors.append(f"## {AMARRACAO}: referência quebrada — tela «{tela}» não existe em ## Telas")
        if tela in seen:
            errors.append(f"## {AMARRACAO}: tela duplicada: {tela}")
        seen.add(tela)
        if r["Endpoints"] != DASH:
            for ep in [x.strip() for x in r["Endpoints"].split(",")]:
                if not RE_ENDPOINT.match(ep):
                    errors.append(
                        f"## {AMARRACAO} {tela}: endpoint inválido (esperado «METHOD /path», "
                        f"METHOD ∈ GET|POST|PUT|PATCH|DELETE, ou {DASH}): «{ep}»")


def amarracao_struct(rows):
    """Converte as linhas da amarração em [{tela, entidades[], endpoints[]}]."""
    def split(val):
        return [] if val == DASH else [x.strip() for x in val.split(",") if x.strip()]
    return [{"tela": r["Tela"], "entidades": split(r["Entidades"]),
             "endpoints": split(r["Endpoints"])} for r in rows]


def load_data_model_entities(path):
    """Nomes de entidade do data-model.json: boundedContexts[].entities[].name."""
    with codecs.open(path, "r", "utf-8") as f:
        raw = json.load(f)
    entities = []
    for bc in raw.get("boundedContexts") or []:
        for e in bc.get("entities") or []:
            name = str(e.get("name") or "").strip()
            if name:
                entities.append(name)
    return entities


def load_contract_endpoints(path):
    """Extrai «METHOD /path» do api-contracts.yaml por regex (sem PyYAML):
    paths sob `paths:`; métodos = linhas get:/post:/... indentadas sob cada path."""
    with codecs.open(path, "r", "utf-8") as f:
        lines = f.read().splitlines()
    re_path = re.compile(r"^(\s+)(/[^\s:]*):\s*(#.*)?$")
    re_method = re.compile(r"^(\s+)(get|post|put|patch|delete):\s*(#.*)?$", re.IGNORECASE)
    endpoints, in_paths = [], False
    base_indent, current_path, current_indent = None, None, None
    for line in lines:
        if re.match(r"^paths:\s*(#.*)?$", line):
            in_paths, base_indent, current_path = True, None, None
            continue
        if not in_paths:
            continue
        if line.strip() and not line[0].isspace():
            in_paths = False  # nova chave de topo (components:, info:, …) encerra o bloco
            continue
        m = re_path.match(line)
        if m and (base_indent is None or len(m.group(1)) == base_indent):
            base_indent = len(m.group(1)) if base_indent is None else base_indent
            current_path, current_indent = m.group(2), len(m.group(1))
            continue
        m = re_method.match(line)
        if m and current_path and len(m.group(1)) > current_indent:
            endpoints.append(f"{m.group(2).upper()} {current_path}")
    return endpoints


def compute_amarracao_metrics(amarr, data, warnings, entidades_dm=None, endpoints_ct=None):
    """Métricas da amarração; cross-checks com data-model/contrato viram AVISO."""
    telas_ids = {r["ID"] for r in data["Telas"]}
    amarradas = {a["tela"] for a in amarr if a["tela"] in telas_ids}
    m = {"pct_telas_com_amarracao":
         round(100.0 * len(amarradas) / len(telas_ids), 1) if telas_ids else 0.0}
    if entidades_dm is not None:
        known, citadas = set(entidades_dm), set()
        for a in amarr:
            for e in a["entidades"]:
                citadas.add(e)
                if e not in known:
                    warnings.append(f"amarração {a['tela']}: entidade «{e}» não existe no data-model")
        m["entidades_sem_tela"] = sorted(known - citadas)
    if endpoints_ct is not None:
        known, citados = set(endpoints_ct), set()
        for a in amarr:
            for ep in a["endpoints"]:
                citados.add(ep)
                if ep not in known:
                    warnings.append(f"amarração {a['tela']}: endpoint «{ep}» não existe no contrato")
        m["endpoints_orfaos"] = sorted(known - citados)
    return m


def cross_check_manifest(path, data, warnings):
    with codecs.open(path, "r", "utf-8") as f:
        raw = json.load(f)
    screens = raw if isinstance(raw, list) else (raw.get("screens") or raw.get("telas") or [])
    def sid(s):
        return str(s.get("id") or s.get("tela") or "").strip()
    def srota(s):
        return str(s.get("rota") or s.get("route") or s.get("path") or "").strip()

    telas_id = {r["ID"]: r for r in data["Telas"]}
    telas_rota = {r["Rota"]: r for r in data["Telas"]}

    matched_flowmap = set()
    for s in screens:
        i, rt = sid(s), srota(s)
        hit = telas_id.get(i) or telas_rota.get(rt)
        if hit is None:
            warnings.append(f"manifesto: tela «{i or rt}» ausente do flow-map (nem id nem rota batem)")
            continue
        matched_flowmap.add(hit["ID"])
        if i and i in telas_id and rt and telas_id[i]["Rota"] != DASH and telas_id[i]["Rota"] != rt:
            warnings.append(f"manifesto: rota divergente para {i} — flow-map «{telas_id[i]['Rota']}» × manifesto «{rt}»")
    for tid in sorted(set(telas_id) - matched_flowmap):
        warnings.append(f"flow-map: tela {tid} ausente do manifesto")


def main():
    ap = argparse.ArgumentParser(
        description="Valida a gramática estrita do flow-map.md (fluxos/etapas/telas/transições).",
        epilog="Exit codes: 0 ok · 1 erro de gramática/integridade · 2 arquivo não encontrado.")
    ap.add_argument("path", nargs="?", default="outputs/spec/flow-map.md",
                    help="caminho do flow-map.md (default: outputs/spec/flow-map.md)")
    ap.add_argument("--json", action="store_true", dest="as_json",
                    help="imprime estrutura parseada + métricas em JSON no stdout (não grava arquivo)")
    ap.add_argument("--manifest", metavar="SCREENS_MANIFEST_JSON",
                    help="cross-check com screens-manifest.json (divergências viram AVISO)")
    ap.add_argument("--data-model", dest="data_model", metavar="DATA_MODEL_JSON",
                    help="cross-check das Entidades da ## Amarração Técnica com o data-model.json "
                         "(entidade desconhecida vira AVISO; imprime entidades sem tela)")
    ap.add_argument("--contracts", metavar="API_CONTRACTS_YAML",
                    help="cross-check dos Endpoints da ## Amarração Técnica com o api-contracts.yaml "
                         "(endpoint desconhecido vira AVISO; imprime endpoints órfãos)")
    ap.add_argument("--strict", action="store_true", help="avisos viram erros (exit 1)")
    args = ap.parse_args()

    if not os.path.exists(args.path):
        print(f"ERRO: arquivo não encontrado: {args.path}", file=sys.stderr)
        sys.exit(2)
    if args.manifest and not os.path.exists(args.manifest):
        print(f"ERRO: manifesto não encontrado: {args.manifest}", file=sys.stderr)
        sys.exit(2)
    if args.data_model and not os.path.exists(args.data_model):
        print(f"ERRO: data-model não encontrado: {args.data_model}", file=sys.stderr)
        sys.exit(2)
    if args.contracts and not os.path.exists(args.contracts):
        print(f"ERRO: contrato não encontrado: {args.contracts}", file=sys.stderr)
        sys.exit(2)

    with codecs.open(args.path, "r", "utf-8") as f:
        text = f.read()

    errors, warnings = [], []
    data, parsed_ok, amarracao = parse_document(text, errors)
    check_ids(data, errors)
    check_fields_and_refs(data, parsed_ok, errors)
    metrics = compute_metrics(data, warnings)
    if args.manifest:
        try:
            cross_check_manifest(args.manifest, data, warnings)
        except (ValueError, KeyError) as exc:
            warnings.append(f"manifesto ilegível ({exc}) — cross-check ignorado")

    amarr = None
    if amarracao is not None:
        check_amarracao(amarracao, data, parsed_ok, errors)
        amarr = amarracao_struct(amarracao)
        entidades_dm = endpoints_ct = None
        if args.data_model:
            try:
                entidades_dm = load_data_model_entities(args.data_model)
            except (ValueError, KeyError, TypeError, AttributeError) as exc:
                warnings.append(f"data-model ilegível ({exc}) — cross-check ignorado")
        if args.contracts:
            try:
                endpoints_ct = load_contract_endpoints(args.contracts)
            except (ValueError, OSError) as exc:
                warnings.append(f"contrato ilegível ({exc}) — cross-check ignorado")
        metrics.update(compute_amarracao_metrics(amarr, data, warnings, entidades_dm, endpoints_ct))

    if args.strict and warnings:
        errors.extend(f"[strict] {w}" for w in warnings)
        warnings = []

    ok = not errors
    if args.as_json:
        print(json.dumps({
            "ok": ok, "file": args.path,
            "fluxos": data["Fluxos"], "etapas": data["Etapas"],
            "telas": data["Telas"], "transicoes": data["Transições"],
            "amarracao": amarr,
            "metricas": metrics, "erros": errors, "avisos": warnings,
        }, ensure_ascii=False, indent=2))
        sys.exit(0 if ok else 1)

    for e in errors:
        print(f"ERRO: {e}")
    for w in warnings:
        print(f"AVISO: {w}")
    print("MÉTRICAS:")
    print(f"  fluxos={metrics['total_fluxos']} etapas={metrics['total_etapas']} "
          f"telas={metrics['total_telas']} transições={metrics['total_transicoes']}")
    print(f"  % etapas com tela: {metrics['pct_etapas_com_tela']}%")
    print(f"  % transições com regra RN: {metrics['pct_transicoes_com_rn']}%")
    print(f"  telas órfãs: {', '.join(metrics['telas_orfas']) or 'nenhuma'}")
    print(f"  fluxos sem etapas: {', '.join(metrics['fluxos_sem_etapas']) or 'nenhum'}")
    if metrics["matriz_estado_tela"]:
        print("  matriz estado×tela:")
        for estado, ts in metrics["matriz_estado_tela"].items():
            print(f"    {estado} → {', '.join(ts) or f'SEM TELA {DASH} verificar'}")
    if "pct_telas_com_amarracao" in metrics:
        print(f"  % telas com amarração técnica: {metrics['pct_telas_com_amarracao']}%")
        if "entidades_sem_tela" in metrics:
            print(f"  entidades do data-model sem tela: {', '.join(metrics['entidades_sem_tela']) or 'nenhuma'}")
        if "endpoints_orfaos" in metrics:
            print(f"  endpoints órfãos (no contrato, sem amarração): {', '.join(metrics['endpoints_orfaos']) or 'nenhum'}")
    print(f"RESULTADO: {'OK' if ok else 'FALHOU'} ({len(errors)} erro(s), {len(warnings)} aviso(s))")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
