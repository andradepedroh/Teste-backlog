"""
check-modules.py — valida consistência do catálogo de módulos.

Lê outputs/spec/modules.md (fonte de verdade) e compara com:
  - outputs/spec/requirements/requirements.md (seções `## Módulo: ... (MOD-XXX)`)
  - outputs/spec/product-requirements/product-requirements.md
  - outputs/spec/business-rules.md (campo `**Módulo**` em cada RN)
  - outputs/spec/gaps.md (referências MOD-XXX em qualquer campo)
  - outputs/spec/prototype.md (tabela UI→negócio, coluna Domínio)

Reporta:
  - Módulos no registro mas ausentes em algum documento
  - Códigos MOD-XXX usados em documentos mas não registrados
  - Divergências de capitalização ou nomes

Uso: python3 ../tools/check-modules.py
     (caminho relativo ao SKILL.md que invoca — ver references/paths.md)
Saída: JSON em stdout + exit code 0 (ok) / 1 (divergências).
"""

import json
import os
import re
import sys
import codecs


def read(path):
    if not os.path.exists(path):
        return None
    with codecs.open(path, 'r', 'utf-8') as f:
        return f.read()


def load_registry(base_dir):
    """Lê modules.md e retorna {code: {name, aliases, status}}."""
    text = read(os.path.join(base_dir, "modules.md"))
    if text is None:
        return None
    registry = {}
    # Linhas de tabela: | MOD-XXX | nome | aliases | atores | objetivo | limites | status |
    table_row = re.compile(
        r'^\|\s*(MOD-[A-Z0-9\-]+)\s*\|\s*([^\|]+?)\s*\|\s*([^\|]*?)\s*\|.*?\|.*?\|.*?\|\s*([^\|]*?)\s*\|',
        re.MULTILINE,
    )
    for m in table_row.finditer(text):
        code = m.group(1).strip()
        name = m.group(2).strip().strip('*').strip()
        aliases_raw = m.group(3).strip()
        status = m.group(4).strip() or "ativo"
        if name.startswith('(') or 'preencher' in name.lower() or 'exemplo' in code.lower():
            continue
        aliases = [a.strip() for a in re.split(r'[,/;]', aliases_raw) if a.strip() and not a.strip().startswith('(')]
        registry[code] = {"name": name, "aliases": aliases, "status": status}
    return registry


# Notação de exemplo dos templates do kit — «um código de módulo qualquer», não um módulo:
# `MOD-XXX`, `MOD-YYY`, `MOD-EXEMPLO`, `MOD-EXEMPLO-A`, `MOD-CODIGO`. O cabeçalho
# «Domínio (MOD-XXX)» do template antigo do protótipo fica no documento de quem seguiu o
# template à risca, e era lido como módulo não registrado: exit 1 e o gate FATAL
# `MODULES_CATALOG_OK` vermelho (D10, teste ponta a ponta de 2026-10-21). O mesmo padrão
# está em `.claude/hooks/revisao.mjs` (`ehNotacaoDeExemplo`); `modulo-placeholder.test.mjs`
# prova que os dois concordam.
PLACEHOLDER_MODULE = re.compile(r'^MOD-(?:X+|Y+|Z+|EXEMPLO(?:-[A-Z0-9]+)*|CODIGO)$')


def extract_module_codes(text):
    """Retorna set de todos os códigos MOD-XXX mencionados num texto.

    O `\\b` sozinho não serve aqui. Num identificador de requisito como
    `RF-MOD-ACESSO-02` existe fronteira de palavra entre o hífen e o `M`, então
    `\\bMOD-` casa no meio do identificador e o validador passa a acusar um módulo
    `MOD-ACESSO-02` que ninguém escreveu — falso positivo que já derrubou um gate
    FATAL com 18 ocorrências e zero referências reais.

    A vista-atrás recusa letra, dígito e hífen imediatamente antes do `MOD-`, de
    modo que só casa referência que começa de verdade: início de linha, espaço,
    barra de tabela, crase, parêntese.

    A notação de exemplo (`PLACEHOLDER_MODULE`) sai só AQUI, no texto livre
    (protótipo, gaps). Os extratores estruturados abaixo não a filtram de
    propósito: `MOD-XXX` num heading `## Módulo:` ou no campo `**Módulo**` de uma
    RN é campo do template que ninguém preencheu, e o vermelho é o sinal certo.
    """
    if not text:
        return set()
    codes = re.findall(r'(?<![A-Za-z0-9-])(MOD-[A-Z0-9\-]+)\b', text)
    return {c for c in codes if not PLACEHOLDER_MODULE.match(c)}


def extract_module_section_codes(text):
    """Códigos usados em headings `## Módulo: ... (MOD-XXX)`."""
    if not text:
        return set()
    pattern = re.compile(r'^## Módulo:[^\n]*?\(`?(MOD-[A-Z0-9\-]+)`?\)', re.MULTILINE)
    return set(pattern.findall(text))


def extract_business_rule_module_codes(text):
    """Códigos no campo `| **Módulo** | MOD-XXX |` de cada RN."""
    if not text:
        return set()
    pattern = re.compile(r'\|\s*\*\*Módulo\*\*\s*\|\s*[^\|\n]*?(MOD-[A-Z0-9\-]+)')
    return set(pattern.findall(text))


def main():
    base_dir = "outputs/spec"
    registry = load_registry(base_dir)

    if registry is None:
        print(json.dumps({
            "ok": False,
            "error": "outputs/spec/modules.md não encontrado",
            "hint": "Gerar a partir do template em ../spec-product/templates/modules.md (relativo ao SKILL.md) durante o Passo 3.0 de spec-product",
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

    registered = set(registry.keys())

    sources = {
        "requirements": extract_module_section_codes(read(os.path.join(base_dir, "requirements/requirements.md"))),
        "product-requirements": extract_module_section_codes(read(os.path.join(base_dir, "product-requirements/product-requirements.md"))),
        "business-rules": extract_business_rule_module_codes(read(os.path.join(base_dir, "business-rules.md"))),
        "gaps": extract_module_codes(read(os.path.join(base_dir, "gaps.md"))),
        "prototype": extract_module_codes(read(os.path.join(base_dir, "prototype.md"))),
    }

    report = {
        "ok": True,
        "registry_size": len(registered),
        "modules_active": sorted([c for c, v in registry.items() if v["status"] == "ativo"]),
        "by_source": {},
        "issues": [],
    }

    for src, found in sources.items():
        unknown = sorted(found - registered)
        missing = sorted(registered - found) if found else []
        report["by_source"][src] = {
            "found": sorted(found),
            "unknown_codes": unknown,
            "registered_but_absent": missing if found else "documento não existe ou sem códigos",
        }
        if unknown:
            report["ok"] = False
            report["issues"].append({
                "severity": "error",
                "source": src,
                "kind": "unknown_module",
                "detail": f"códigos não registrados em modules.md: {unknown}",
            })

    # Módulos ativos que não aparecem em nenhum dos 3 docs principais
    main_docs = {"requirements", "product-requirements", "business-rules"}
    active = {c for c, v in registry.items() if v["status"] == "ativo"}
    used_anywhere = set().union(*(sources[s] for s in main_docs if s in sources))
    orphan_active = sorted(active - used_anywhere)
    if orphan_active:
        report["ok"] = False
        report["issues"].append({
            "severity": "warning",
            "source": "modules.md",
            "kind": "orphan_active",
            "detail": f"módulos ativos sem nenhum RF/PR/RN nos 3 documentos: {orphan_active}",
        })

    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(0 if report["ok"] else 1)


if __name__ == "__main__":
    main()
