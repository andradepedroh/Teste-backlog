#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
clean-legacy.py — Limpa as saídas geradas pelo spec-legacy (par do generate-legacy-report.py).

Fluxo de uso: gerar (`generate-legacy-report.py`) -> usar/enviar -> limpar (este).

Remove SOMENTE dentro de --base-dir (default: outputs/spec). Nunca toca em skills/, inputs/
nem em qualquer coisa fora do base-dir.

Padrão (saídas de build / volumosas, sempre regeneráveis):
  outputs/spec/report/                (kit HTML final)
  outputs/spec/graphify-out/          (grafo do Graphify — pode ser grande)
  outputs/spec/business-map.parts/    (fragmentos dos subagentes por janela/domínio)

Com --all, remove TAMBÉM os artefatos de análise:
  business-map.json · legacy.md · architecture.md · legacy-analysis.md ·
  threat-model.md · legacy-research-log.md · domains/

Flags:
  --base-dir DIR   pasta base (default outputs/spec)
  --all            inclui os artefatos de análise (reset completo do AS-IS)
  --dry-run        só lista o que seria removido, não apaga
  --yes / -y       não pedir confirmação

Exit: 0 sempre que executa sem erro (mesmo sem nada para limpar).
Uso: python3 ../tools/clean-legacy.py [--all] [--dry-run] [-y] [--base-dir outputs/spec]
     (caminho relativo ao SKILL.md que invoca — ver references/paths.md)
"""
import argparse
import os
import shutil
import sys

BUILD_OUTPUTS = ["report", "graphify-out", "business-map.parts"]
ANALYSIS_ARTIFACTS = [
    "business-map.json", "legacy.md", "architecture.md", "legacy-analysis.md",
    "threat-model.md", "legacy-research-log.md", "domains",
]


def size_of(path):
    if os.path.isfile(path):
        try:
            return os.path.getsize(path)
        except OSError:
            return 0
    total = 0
    for root, _dirs, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


def human(n):
    n = float(n)
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}"
        n /= 1024
    return f"{n:.0f}TB"


def main():
    ap = argparse.ArgumentParser(
        description="Limpa as saídas geradas pelo spec-legacy (par do generate-legacy-report.py)."
    )
    ap.add_argument("--base-dir", default="outputs/spec")
    ap.add_argument("--all", action="store_true",
                    help="também remove os artefatos de análise (.md, business-map.json, research log, domains/)")
    ap.add_argument("--dry-run", action="store_true", help="só lista o que seria removido")
    ap.add_argument("--yes", "-y", action="store_true", help="não pedir confirmação")
    args = ap.parse_args()

    base = args.base_dir
    names = BUILD_OUTPUTS + (ANALYSIS_ARTIFACTS if args.all else [])
    existing = [os.path.join(base, n) for n in names if os.path.exists(os.path.join(base, n))]

    nivel = "TUDO (build + artefatos)" if args.all else "build (HTML + grafo + fragmentos)"
    if not existing:
        print(f"clean-legacy: nada a limpar em {base} (nível: {nivel}).")
        return 0

    total = sum(size_of(t) for t in existing)
    print(f"clean-legacy: {len(existing)} item(ns), ~{human(total)} em {base} — nível: {nivel}")
    for t in existing:
        marca = "/" if os.path.isdir(t) else ""
        print(f"  - {os.path.relpath(t, base)}{marca}  [{human(size_of(t))}]")

    if args.dry_run:
        print("clean-legacy: --dry-run — nada foi removido.")
        return 0

    if not args.yes:
        try:
            resp = input("Remover os itens acima? [y/N] ").strip().lower()
        except EOFError:
            resp = "n"
        if resp not in ("y", "s", "yes", "sim"):
            print("clean-legacy: cancelado (nada removido).")
            return 0

    removed = 0
    for t in existing:
        try:
            if os.path.isdir(t):
                shutil.rmtree(t)
            else:
                os.remove(t)
            removed += 1
        except OSError as e:
            print(f"  ! falha ao remover {t}: {e}", file=sys.stderr)
    print(f"clean-legacy: {removed}/{len(existing)} item(ns) removido(s) — ~{human(total)} liberado(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
