#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-legacy-business.py — Validador estrutural do business-map.json (spec-legacy, Passos 0.5.4 e 9).

Confere a espinha de rastreabilidade de negócio produzida pelo spec-legacy:
- JSON válido e objeto raiz único;
- IDs únicos por prefixo (MOD/BM/DOM/RN/PROC/OPP/KPI/BRC/US);
- Cobertura: todo BM in-scope coberto por algum DOM (source_business_module_ids);
  todo MOD in-scope coberto (source_module_ids);
- Completude mínima por item (BM com entidades+clusters+MOD; processo com falha+dor;
  domínio com 3-5 user stories; ai_agent com ai_agent_spec);
- Diversidade de evidência: <= 3 regras compartilhando o mesmo implementation.location.

Com --graph <graph.json> (Modo Digital/Híbrido), ativa as checagens de grafo:
- GRAPH_COMPLETED (FATAL): graph.json existe e é não-trivial (nós>0 E arestas>0);
- GRAPH_FINDINGS_POPULATED (FATAL): bloco graph_findings preenchido (god_classes,
  migration_seams, dependency_cycles, orphan_files investigados) + comunidades mapeadas a BM
  quando o grafo não foi nomeado por LLM;
- GRAPH_EVIDENCE_CITED: achados citam o grafo (coupling_level + evidence/notes) —
  erro em legado substancial (>=8 BM) com zero referência; senão aviso forte;
- GRAPH_COVERAGE_CLEAN: todo source_file de negócio do grafo cai sob algum MOD
  (files_without_domain vazio ou justificado).

Com --graph-only <graph.json>: roda SÓ o gate GRAPH_COMPLETED (Passo 0.5.4) e sai.

Metas de escala (BM>=8, RN>=50, PROC>=25, OPP>=40, ai_agent>=8) são AVISOS
(proporcionais ao tamanho do legado), não bloqueiam.

Exit codes: 0 = ok (avisos permitidos) · 1 = erro fatal ou arquivo ausente/inválido.
Uso (caminho relativo ao SKILL.md que invoca — ver references/paths.md):
  python3 ../tools/check-legacy-business.py [business-map.json] [--graph graph.json]
  python3 ../tools/check-legacy-business.py --graph-only graph.json
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

DEFAULT_PATH = "outputs/spec/business-map.json"

# Palavras que sinalizam que uma evidência/nota consultou o grafo (Passo 0.6).
GRAPH_KEYWORDS = re.compile(
    r"\b(graf|graph|graphify|degree|grau|betweenness|intermedia|"
    r"communit|comunidad|cluster|hub|query|path|explain|call[- ]?flow|seam|"
    r"orf|orfa|orphan|ciclo|cycle)\w*", re.IGNORECASE)

# Padroes de arquivo/infra que NAO contam como codigo de negocio na cobertura.
NON_BUSINESS_FILE = re.compile(
    r"(^|/)(node_modules|dist|build|target|bin|obj|out|vendor|coverage|"
    r"__pycache__|\.git)(/|$)|\.(min\.js|map|lock|png|jpg|jpeg|gif|svg|ico|"
    r"woff2?|ttf|eot|class|jar|dll|so|dylib)$", re.IGNORECASE)

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load_json(path, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"check-legacy-business: {label} nao encontrado em {path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"check-legacy-business: {label} — JSON invalido — {e}", file=sys.stderr)
        sys.exit(1)


def graph_edges(g):
    """Suporta node_link ('links'), ('edges') e variacoes."""
    if not isinstance(g, dict):
        return []
    return g.get("links") or g.get("edges") or []


def graph_nodes(g):
    if not isinstance(g, dict):
        return []
    return g.get("nodes") or []


def graph_completed_check(graph_path, fatal=True):
    """Gate GRAPH_COMPLETED (Passo 0.5.4). Retorna (ok, n_nodes, n_edges)."""
    if not os.path.exists(graph_path):
        msg = f"GRAPH_COMPLETED: graph.json ausente em {graph_path} — grafo nao gerado (Passo 0.5)"
        (err if fatal else warn)(msg)
        return False, 0, 0
    g = load_json(graph_path, "graph.json")
    nn, ne = len(graph_nodes(g)), len(graph_edges(g))
    if nn <= 0 or ne <= 0:
        msg = (f"GRAPH_COMPLETED: grafo trivial/truncado (nos={nn}, arestas={ne}) — "
               "regenerar (aumentar GRAPHIFY_MAX_OUTPUT_TOKENS / repetir loop --update)")
        (err if fatal else warn)(msg)
        return False, nn, ne
    return True, nn, ne


def _norm_path(p):
    p = (p or "").replace("\\", "/").lstrip("./")
    for pref in ("outputs/spec/.graph-src/", ".graph-src/", "inputs/"):
        if p.startswith(pref):
            p = p[len(pref):]
    return p


def check_unique_ids(items, prefix, label):
    ids = [it.get("id", "") for it in items if isinstance(it, dict)]
    dups = [i for i, c in Counter(ids).items() if c > 1 and i]
    if dups:
        err(f"{label}: IDs duplicados: {', '.join(sorted(dups))}")
    for i in ids:
        if i and not re.match(rf"^{prefix}-", i):
            warn(f"{label}: ID fora do padrao '{prefix}-': {i}")


def check_graph_findings(data, business_modules):
    """GRAPH_FINDINGS_POPULATED + comunidades mapeadas a BM."""
    gf = data.get("graph_findings")
    if not gf or not isinstance(gf, dict):
        err("GRAPH_FINDINGS_POPULATED: bloco 'graph_findings' ausente — "
            "Passo 0.6 (Mineracao do grafo) nao executado")
        return
    required = ["god_classes", "migration_seams", "dependency_cycles", "orphan_files"]
    missing = [k for k in required if k not in gf]
    if missing:
        err("GRAPH_FINDINGS_POPULATED: graph_findings sem as chaves investigadas: "
            f"{', '.join(missing)} (listas vazias [] sao aceitas se nada foi encontrado, "
            "mas a chave deve existir)")
    named = bool(gf.get("named_by_llm"))
    comms = gf.get("communities") or []
    if not named and comms:
        unmapped = [c.get("community_id", "?") for c in comms
                    if not (c.get("mapped_bm_id") or c.get("mapped_dom_id"))]
        if unmapped:
            err("GRAPH_FINDINGS_POPULATED: grafo nao nomeado por LLM e comunidades sem "
                f"mapeamento a BM/DOM: {', '.join(map(str, unmapped[:8]))} "
                "(nomear por hub e mapear comunidade -> BM — Passo 0.6)")
    if not named and not comms and business_modules:
        warn("graph_findings.communities vazio — sem nomeacao por hub das comunidades "
             "(esperado quando o grafo nao e nomeado por LLM)")


def check_graph_evidence(data, business_modules):
    """GRAPH_EVIDENCE_CITED: achados devem citar o grafo, nao so DDL+grep."""
    blobs = []
    for bm in business_modules:
        for e in bm.get("primary_entities") or []:
            blobs.extend(e.get("evidence") or [])
        for c in bm.get("business_rule_clusters") or []:
            blobs.extend(c.get("evidence") or [])
    cc = data.get("cross_cutting_views") or {}
    blobs.append(cc.get("domain_hypothesis_notes") or "")
    for x in cc.get("entity_rule_crosswalk") or []:
        blobs.append(x.get("notes") or "")
    hits = sum(1 for b in blobs if b and GRAPH_KEYWORDS.search(str(b)))

    doms = data.get("domains") or []
    rels = [r for d in doms for r in (d.get("relationships") or [])]
    rels_wo_coupling = [r for r in rels if not (r.get("coupling_level"))]

    substantial = len(business_modules) >= 8
    if hits == 0:
        msg = ("GRAPH_EVIDENCE_CITED: nenhuma evidencia/nota cita o grafo "
               "(grau/path/query/explain/comunidade) — provavel analise DDL+grep sem minerar o grafo")
        (err if substantial else warn)(msg)
    if rels and rels_wo_coupling:
        warn(f"GRAPH_EVIDENCE_CITED: {len(rels_wo_coupling)}/{len(rels)} relacao(oes) de dominio "
             "sem coupling_level (derivar do grafo — grau/path)")


def check_graph_coverage(data, code_modules, graph_path):
    """GRAPH_COVERAGE_CLEAN: todo source_file de negocio cai sob algum MOD."""
    g = load_json(graph_path, "graph.json")
    files = set()
    for n in graph_nodes(g):
        if not isinstance(n, dict):
            continue
        sf = n.get("source_file") or n.get("file") or n.get("path")
        if sf:
            files.add(_norm_path(sf))
    biz_files = {f for f in files if f and not NON_BUSINESS_FILE.search(f)}
    if not biz_files:
        return

    roots = []
    for m in code_modules:
        if m.get("out_of_business_scope"):
            continue
        for rp in m.get("root_paths") or []:
            roots.append(_norm_path(rp).rstrip("/"))
    if not roots:
        warn("GRAPH_COVERAGE_CLEAN: nenhum root_path in-scope em code_modules — "
             "impossivel checar cobertura de arquivos do grafo")
        return

    def covered(f):
        return any(f == r or f.startswith(r + "/") or (r and r in f) for r in roots if r)

    uncovered = sorted(f for f in biz_files if not covered(f))

    gc = data.get("graph_coverage") or {}
    declared = set(_norm_path(x) for x in (gc.get("files_without_domain") or []))
    real_blind = [f for f in uncovered if f not in declared]

    if not gc:
        warn("GRAPH_COVERAGE_CLEAN: bloco 'graph_coverage' ausente — "
             f"{len(uncovered)}/{len(biz_files)} arquivo(s) de negocio do grafo sem MOD "
             "(preencher graph_coverage no Passo 0.6)")
    if real_blind:
        sample = ", ".join(real_blind[:8])
        warn(f"GRAPH_COVERAGE_CLEAN: {len(real_blind)} arquivo(s) de negocio sem dominio E nao "
             f"declarados em files_without_domain (pontos cegos): {sample}")
    elif uncovered and gc:
        warn(f"GRAPH_COVERAGE_CLEAN: {len(uncovered)} arquivo(s) sem dominio, todos declarados "
             "em files_without_domain (pontos cegos assumidos)")


def main():
    ap = argparse.ArgumentParser(add_help=True, description="Validador do business-map.json (spec-legacy).")
    ap.add_argument("business_map", nargs="?", default=DEFAULT_PATH,
                    help="caminho para business-map.json (padrao: %(default)s)")
    ap.add_argument("--graph", default=None,
                    help="caminho para graphify-out/graph.json — ativa checagens de grafo/cobertura")
    ap.add_argument("--graph-only", default=None,
                    help="roda SO o gate GRAPH_COMPLETED (Passo 0.5.4) neste graph.json e sai")
    args = ap.parse_args()

    if args.graph_only:
        ok, nn, ne = graph_completed_check(args.graph_only, fatal=True)
        if ok:
            print(f"GRAPH_COMPLETED OK (nos={nn}, arestas={ne}) — Fase A liberada")
            sys.exit(0)
        for e in errors:
            print(f"  [ERRO] {e}")
        print("GRAPH_COMPLETED FALHOU — repetir Passo 0.5.3 (loop graphify --update)")
        sys.exit(1)

    path = args.business_map
    data = load_json(path, "business-map.json")
    if not isinstance(data, dict):
        print("check-legacy-business: raiz do JSON deve ser um objeto unico.", file=sys.stderr)
        sys.exit(1)

    code_modules = data.get("code_modules", []) or []
    business_modules = data.get("business_modules", []) or []
    domains = data.get("domains", []) or []
    business_rules = data.get("business_rules", []) or []
    processes = data.get("processes", []) or []
    opportunities = data.get("opportunities", []) or []

    check_unique_ids(code_modules, "MOD", "code_modules")
    check_unique_ids(business_modules, "BM", "business_modules")
    check_unique_ids(domains, "DOM", "domains")
    check_unique_ids(business_rules, "RN", "business_rules")
    check_unique_ids(processes, "PROC", "processes")
    check_unique_ids(opportunities, "OPP", "opportunities")

    for bm in business_modules:
        bid = bm.get("id", "?")
        if not bm.get("primary_entities"):
            err(f"{bid}: sem primary_entities")
        if not bm.get("business_rule_clusters"):
            err(f"{bid}: sem business_rule_clusters")
        if not bm.get("maps_to_code_module_ids"):
            err(f"{bid}: sem maps_to_code_module_ids (ponte para MOD)")

    covered_bms = set()
    covered_mods = set()
    for d in domains:
        for b in d.get("source_business_module_ids", []) or []:
            covered_bms.add(b)
        for m in d.get("source_module_ids", []) or []:
            covered_mods.add(m)
    all_bms = {bm.get("id") for bm in business_modules if bm.get("id")}
    missing_bms = sorted(all_bms - covered_bms)
    if missing_bms:
        err(f"Cobertura BM->DOM: BM sem dominio: {', '.join(missing_bms)} "
            "(cobrir em source_business_module_ids ou justificar fusao/exclusao)")

    inscope_mods = {m.get("id") for m in code_modules
                    if m.get("id") and not m.get("out_of_business_scope")}
    missing_mods = sorted(inscope_mods - covered_mods)
    if missing_mods:
        err(f"Cobertura MOD->DOM: MOD in-scope sem dominio: {', '.join(missing_mods)} "
            "(cobrir em source_module_ids ou marcar out_of_business_scope)")

    narratives = []
    for d in domains:
        did = d.get("id", "?")
        us = d.get("user_stories", []) or []
        if not (3 <= len(us) <= 5):
            warn(f"{did}: {len(us)} user stories (esperado 3-5)")
        n = (d.get("business_impact_narrative") or "").strip()
        if n:
            narratives.append(n)
    dup_narr = [t for t, c in Counter(narratives).items() if c > 1]
    if dup_narr:
        err("business_impact_narrative duplicada entre dominios (deve diferir por dominio)")

    loc_counter = Counter()
    scenarios = []
    for r in business_rules:
        loc = ((r.get("implementation") or {}).get("location") or "").strip()
        if loc:
            loc_counter[loc] += 1
        sc = (r.get("example_scenario") or "").strip()
        if sc:
            scenarios.append(sc)
    over = [f"{loc} ({c})" for loc, c in loc_counter.items() if c > 3]
    if over:
        err("Diversidade de evidencia: > 3 regras no mesmo local: " + "; ".join(over))
    dup_sc = [s for s, c in Counter(scenarios).items() if c > 1]
    if dup_sc:
        err(f"example_scenario duplicado entre regras ({len(dup_sc)} caso(s)) — texto deve ser distinto")

    for p in processes:
        pid = p.get("id", "?")
        if not p.get("failure_scenarios"):
            err(f"{pid}: sem failure_scenarios (>= 1 obrigatorio)")
        if not p.get("pain_points"):
            err(f"{pid}: sem pain_points (>= 1 obrigatorio)")

    ai_agents = [o for o in opportunities if o.get("category") == "ai_agent"]
    for o in ai_agents:
        if not o.get("ai_agent_spec"):
            err(f"{o.get('id','?')}: oportunidade ai_agent sem ai_agent_spec")

    if args.graph:
        ok, nn, ne = graph_completed_check(args.graph, fatal=True)
        if ok:
            check_graph_findings(data, business_modules)
            check_graph_evidence(data, business_modules)
            check_graph_coverage(data, code_modules, args.graph)

    rules_by_dom, procs_by_dom = {}, {}
    for r in business_rules:
        for dm in r.get("affected_domains") or []:
            rules_by_dom.setdefault(dm, []).append(r)
    for pr in processes:
        for dm in pr.get("primary_domain_ids") or []:
            procs_by_dom.setdefault(dm, []).append(pr)
    thin = []
    for d in domains:
        did = d.get("id", "?")
        nr = len(rules_by_dom.get(did, []))
        npr = len(procs_by_dom.get(did, []))
        narr = len((d.get("business_impact_narrative") or "").strip())
        if nr == 0:
            warn(f"{did}: nenhuma regra de negocio vinculada (business_rules com affected_domains={did})")
        if npr == 0:
            warn(f"{did}: nenhum processo vinculado (processes com primary_domain_ids={did})")
        if narr < 120:
            warn(f"{did}: business_impact_narrative rasa (<120 chars)")
        if not d.get("kpis_domain"):
            warn(f"{did}: sem KPIs")
        if nr == 0 and npr == 0:
            thin.append(did)
    if domains and thin:
        warn(f"profundidade: {len(thin)}/{len(domains)} dominio(s) sem regra E sem processo — provavel analise rasa: {', '.join(thin[:8])}")
    if domains:
        avg_rules = round(len(business_rules) / len(domains), 1)
        if avg_rules < 3:
            warn(f"profundidade: media de {avg_rules} regra(s) por dominio (esperado >= 3 em legados substanciais)")

    if len(business_modules) < 8:
        warn(f"business_modules = {len(business_modules)} (meta >= 8; ok se legado pequeno + escopo declarado)")
    if len(business_rules) < 50:
        warn(f"business_rules = {len(business_rules)} (meta >= 50)")
    if len(processes) < 25:
        warn(f"processes = {len(processes)} (meta >= 25)")
    if len(opportunities) < 40:
        warn(f"opportunities = {len(opportunities)} (meta >= 40)")
    if len(ai_agents) < 8:
        warn(f"oportunidades ai_agent = {len(ai_agents)} (meta >= 8)")

    print(f"check-legacy-business: {path}")
    print(f"  BM={len(business_modules)} MOD={len(code_modules)} DOM={len(domains)} "
          f"RN={len(business_rules)} PROC={len(processes)} OPP={len(opportunities)} (ai_agent={len(ai_agents)})")
    if args.graph:
        print(f"  grafo: {args.graph}")
    for w in warnings:
        print(f"  [aviso] {w}")
    for e in errors:
        print(f"  [ERRO] {e}")

    if errors:
        print("check-legacy-business: FALHOU")
        sys.exit(1)
    print("check-legacy-business: OK" + (f" ({len(warnings)} aviso(s))" if warnings else ""))
    sys.exit(0)


if __name__ == "__main__":
    main()
