#!/usr/bin/env python3
"""
hotspots.py — hotspots de código por churn de git (opcionalmente cruzado com scc).

Agrega `git log --numstat` por arquivo: nº de commits que tocaram o arquivo,
linhas adicionadas/removidas, nº de autores distintos e data do último toque.
Se um JSON do scc (`scc --format json`) for passado via --scc, cruza churn ×
complexidade e ordena por score churn*complexity (hotspot real).

Uso (caminho relativo ao SKILL.md que invoca — vale nos 3 espelhos: skills/,
 .cursor/skills/, plugin/skills/; ver tools/references/paths.md):
  python3 ../tools/hotspots.py <repo> [--since "24 months"] [--top 30] [--json]
                                      [--scc scc.json] [--timeout 300]

Saída: tabela legível (default) ou JSON (--json).
Exit codes: 0 ok · 2 diretório não é repositório git (ou git indisponível),
            git log excedeu o timeout, ou JSON do scc ilegível.
"""

import argparse
import json
import os
import re
import subprocess
import sys

RENAME_RE = re.compile(r'\{([^{}]*) => ([^{}]*)\}')


def normalize_path(path):
    """Normaliza renames do numstat: 'a/{old => new}/f.py' -> 'a/new/f.py'."""
    path = RENAME_RE.sub(lambda m: m.group(2), path.strip())
    if ' => ' in path:  # rename sem chaves: 'old.py => new.py'
        path = path.split(' => ')[-1]
    return path.replace('//', '/')


DEFAULT_TIMEOUT = 300  # s — repo legado grande nunca deve travar o agente indefinidamente


def git_numstat(repo, since, timeout=DEFAULT_TIMEOUT):
    try:
        check = subprocess.run(['git', '-C', repo, 'rev-parse', '--is-inside-work-tree'],
                               capture_output=True, text=True, timeout=min(timeout, 60))
    except subprocess.TimeoutExpired:
        sys.stderr.write(f"ERRO: `git rev-parse` em '{repo}' excedeu {min(timeout, 60)}s.\n")
        sys.exit(2)
    except OSError as exc:
        sys.stderr.write(f"ERRO ao invocar o git: {exc}\n")
        sys.exit(2)
    if check.returncode != 0 or check.stdout.strip() != 'true':
        sys.stderr.write(
            f"ERRO: '{repo}' não é um repositório git (ou o git não está instalado).\n"
            "Sem histórico git não há churn — rode contra a raiz clonada do legado.\n")
        sys.exit(2)
    cmd = ['git', '-C', repo, 'log', f'--since={since}', '--numstat',
           '--format=@@@%H\t%an\t%ad', '--date=short', '--no-merges']
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8',
                             errors='replace', timeout=timeout)
    except subprocess.TimeoutExpired:
        sys.stderr.write(
            f"ERRO: `git log` excedeu o timeout de {timeout}s em '{repo}' e foi abortado.\n"
            "Repositório grande: reduza a janela (--since \"6 months\") ou aumente --timeout.\n")
        sys.exit(2)
    except OSError as exc:
        sys.stderr.write(f"ERRO ao rodar git log: {exc}\n")
        sys.exit(2)
    if out.returncode != 0:
        sys.stderr.write(f"ERRO ao rodar git log: {out.stderr.strip()}\n")
        sys.exit(2)
    return out.stdout


def aggregate(log_text):
    files, author, date = {}, None, None
    for line in log_text.splitlines():
        if line.startswith('@@@'):
            parts = line[3:].split('\t')
            author = parts[1] if len(parts) > 1 else '?'
            date = parts[2] if len(parts) > 2 else ''
            continue
        cols = line.split('\t')
        if len(cols) != 3 or not line.strip():
            continue
        added, deleted, path = cols
        path = normalize_path(path)
        entry = files.setdefault(path, {'file': path, 'commits': 0, 'lines_added': 0,
                                        'lines_deleted': 0, 'authors': set(), 'last_touch': ''})
        entry['commits'] += 1
        entry['lines_added'] += int(added) if added.isdigit() else 0
        entry['lines_deleted'] += int(deleted) if deleted.isdigit() else 0
        entry['authors'].add(author)
        entry['last_touch'] = max(entry['last_touch'], date or '')
    return files


def load_scc(scc_path):
    """Retorna {path_normalizado: complexity} a partir do JSON do scc."""
    try:
        with open(scc_path, encoding='utf-8') as f:
            data = json.load(f)
    except OSError as exc:
        sys.stderr.write(f"ERRO ao ler o JSON do scc '{scc_path}': {exc}\n")
        sys.exit(2)
    except ValueError as exc:
        sys.stderr.write(f"ERRO: '{scc_path}' não é JSON válido do scc ({exc}).\n")
        sys.exit(2)
    cx = {}
    for lang in data:
        for fobj in lang.get('Files', []):
            loc = fobj.get('Location', '').replace('\\', '/')
            cx[loc] = fobj.get('Complexity', 0)
    return cx


def build_cx_index(cx_map):
    """
    Índice basename → [(location, complexity)].

    O casamento por sufixo (`loc.endswith('/'+path)` ou vice-versa) implica sempre
    basename igual, então o índice é um filtro exato e correto — evita o O(arquivos ×
    entradas scc) da varredura linear do dicionário inteiro para cada arquivo.
    """
    index = {}
    for loc, val in cx_map.items():
        index.setdefault(loc.rsplit('/', 1)[-1], []).append((loc, val))
    return index


def match_complexity(path, cx_map, cx_index=None):
    if path in cx_map:
        return cx_map[path]
    if cx_index is None:
        cx_index = build_cx_index(cx_map)
    for loc, val in cx_index.get(path.rsplit('/', 1)[-1], ()):
        if loc.endswith('/' + path) or path.endswith('/' + loc):
            return val
    return None


def sort_key_with_scc(row):
    """
    Ordena por score, sem confundir score 0 com score ausente.
    `row.get('hotspot_score') or -1` tratava 0 como −1 (arquivo de complexidade 0
    caía junto dos sem match). Aqui, presença é a 1ª chave: qualquer score real
    (inclusive 0) vem antes dos ausentes.
    """
    score = row.get('hotspot_score')
    return (0 if score is None else 1, score if score is not None else 0, row['commits'])


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('repo', help='diretório do repositório git a analisar')
    ap.add_argument('--since', default='24 months', help='janela do git log (default: "24 months")')
    ap.add_argument('--top', type=int, default=30, help='nº de arquivos no ranking (default: 30)')
    ap.add_argument('--json', action='store_true', help='saída em JSON em vez de tabela')
    ap.add_argument('--scc', metavar='ARQ', help='JSON do scc (scc --format json) p/ cruzar churn × complexity')
    ap.add_argument('--timeout', type=int, default=DEFAULT_TIMEOUT,
                    help=f'timeout do git log em segundos (default: {DEFAULT_TIMEOUT})')
    args = ap.parse_args()

    files = aggregate(git_numstat(args.repo, args.since, args.timeout))
    cx_map = load_scc(args.scc) if args.scc else None
    cx_index = build_cx_index(cx_map) if cx_map is not None else None
    rows = []
    for e in files.values():
        e['authors'] = len(e['authors'])
        if cx_map is not None:
            cx = match_complexity(e['file'], cx_map, cx_index)
            e['complexity'] = cx
            e['hotspot_score'] = e['commits'] * cx if cx is not None else None
        rows.append(e)
    key = sort_key_with_scc if cx_map is not None else (lambda r: r['commits'])
    rows.sort(key=key, reverse=True)
    rows = rows[:args.top]

    if args.json:
        print(json.dumps({'repo': os.path.abspath(args.repo), 'since': args.since,
                          'total_files_touched': len(files), 'hotspots': rows},
                         ensure_ascii=False, indent=2))
        return
    hdr = ['commits', '+linhas', '-linhas', 'autores', 'último toque']
    if cx_map is not None:
        hdr += ['complexity', 'score']
    print(f"Hotspots por churn — repo={args.repo} since={args.since} (top {args.top} de {len(files)})")
    print(' | '.join(['arquivo'.ljust(60)] + hdr))
    for r in rows:
        cells = [r['file'][:60].ljust(60), str(r['commits']).rjust(7), str(r['lines_added']).rjust(7),
                 str(r['lines_deleted']).rjust(7), str(r['authors']).rjust(7), r['last_touch'].rjust(12)]
        if cx_map is not None:
            cells += [str(r.get('complexity')).rjust(10), str(r.get('hotspot_score')).rjust(6)]
        print(' | '.join(cells))


if __name__ == '__main__':
    main()
