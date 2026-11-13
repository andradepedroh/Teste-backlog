"""extract-gaps.py — Lista todos os GAP-XXX referenciados nos artefatos de outputs/spec/.

Lê também o `gaps.md` do Explore quando ele existe — por padrão `explore/gaps.md` ao lado da
pasta varrida, ou seja, `outputs/explore/gaps.md` para a pasta `outputs/spec`. No harness Elo os
GAPs abertos do pré-projeto passam para o Plan mantendo o número (ver `spec-iterate`, seção
«Projeto vindo do Explore»), então um GAP que aparece nos dois arquivos é UM GAP, com as
ocorrências dos dois. Ao final, lista os GAPs abertos do Explore (⏳ Aguardando / 🟡 Parcialmente)
que ainda não aparecem em nenhum artefato da pasta varrida. Sem o arquivo do Explore, a saída é a
de sempre.

Uso (caminho relativo ao SKILL.md que invoca — ver references/paths.md):
  python3 ../tools/extract-gaps.py [base_dir]
  python3 ../tools/extract-gaps.py --base-dir outputs/spec
  python3 ../tools/extract-gaps.py --explore-gaps outputs/explore/gaps.md

Exit codes:
  0 — execução OK (com ou sem GAPs encontrados)
  1 — base_dir não encontrado
  2 — erro de leitura em um ou mais arquivos (parcial: resultado dos demais é impresso)
"""
import argparse
import os
import re
import sys

GAP_PATTERN = re.compile(r'(GAP-\d+)')
GAP_ID = re.compile(r'GAP-\d+')
# Status de GAP aberto no `gaps.md` do Explore — o mesmo critério da lista «GAPs em aberto» do
# `revisao.mjs` do harness. ✅ Respondido não entra: a decisão já está nos documentos do Explore.
EXPLORE_OPEN = re.compile(r'Aguardando|Parcialmente', re.IGNORECASE)


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Extrai referências GAP-XXX de outputs/spec/.")
    parser.add_argument(
        "base_dir",
        nargs="?",
        default="outputs/spec",
        help="Pasta a varrer (default: outputs/spec)",
    )
    parser.add_argument(
        "--base-dir",
        dest="base_dir_flag",
        default=None,
        help="Alternativa por flag ao positional base_dir.",
    )
    parser.add_argument(
        "--explore-gaps",
        dest="explore_gaps",
        default=None,
        help="gaps.md do Explore (default: explore/gaps.md ao lado da pasta varrida).",
    )
    args = parser.parse_args(argv)
    if args.base_dir_flag:
        args.base_dir = args.base_dir_flag
    return args


def same_path(a, b):
    return os.path.normcase(os.path.realpath(a)) == os.path.normcase(os.path.realpath(b))


def inside(path, folder):
    p = os.path.normcase(os.path.realpath(path))
    f = os.path.normcase(os.path.realpath(folder))
    return p.startswith(f.rstrip(os.sep) + os.sep)


def collect(label, lines, gaps_found):
    for i, line in enumerate(lines):
        for gap in GAP_PATTERN.findall(line):
            gaps_found.setdefault(gap, []).append(f"{label} (linha {i+1}): {line.strip()}")


def open_explore_gaps(lines):
    """GAPs em aberto na tabela do Explore: ID na primeira célula, status aberto na coluna Status.

    A coluna Status vem do cabeçalho da tabela; sem cabeçalho reconhecível, a linha inteira é
    lida — o mesmo fallback do `revisao.mjs`.
    """
    abertos = []
    status_col = None
    for line in lines:
        if not line.lstrip().startswith('|'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if 'Status' in cells:
            status_col = cells.index('Status')
            continue
        if not cells or not GAP_ID.fullmatch(cells[0]):
            continue
        status = cells[status_col] if status_col is not None and status_col < len(cells) else line
        if EXPLORE_OPEN.search(status) and cells[0] not in abertos:
            abertos.append(cells[0])
    return abertos


def main(argv=None):
    # Status do Explore e prosa trazem emoji e acento; no Windows, com a saída redirecionada, o
    # Python usaria cp1252 e quebraria no primeiro «⏳».
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args(argv if argv is not None else sys.argv[1:])
    base_dir = args.base_dir

    if not os.path.exists(base_dir):
        print(f"Diretório {base_dir} não encontrado.", file=sys.stderr)
        return 1

    explore_path = args.explore_gaps or os.path.join(
        os.path.dirname(os.path.abspath(base_dir)), 'explore', 'gaps.md')
    explore_exists = os.path.isfile(explore_path)
    explore_lines = None
    spec_refs = set()  # GAPs citados fora do gaps.md do Explore

    gaps_found = {}
    read_errors = 0

    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.md'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                except OSError as exc:
                    read_errors += 1
                    print(f"AVISO: não consegui ler {filepath}: {exc}", file=sys.stderr)
                    continue
                collect(os.path.relpath(filepath, base_dir), lines, gaps_found)
                if explore_exists and same_path(filepath, explore_path):
                    explore_lines = lines
                else:
                    spec_refs.update(GAP_PATTERN.findall(''.join(lines)))

    # O Explore fora da pasta varrida entra uma vez; dentro dela, o walk acima já o leu.
    if explore_exists and not inside(explore_path, base_dir):
        try:
            with open(explore_path, 'r', encoding='utf-8') as f:
                explore_lines = f.readlines()
        except OSError as exc:
            read_errors += 1
            print(f"AVISO: não consegui ler {explore_path}: {exc}", file=sys.stderr)
        else:
            collect(os.path.relpath(explore_path, base_dir), explore_lines, gaps_found)

    if not gaps_found:
        print("Nenhum GAP encontrado nos artefatos.")
    else:
        print(f"Foram encontrados {len(gaps_found)} GAPs distintos:")
        for gap, occurrences in sorted(gaps_found.items()):
            print(f"\n{gap}:")
            for occ in dict.fromkeys(occurrences):  # remove duplicatas exatas, mantém a ordem
                print(f"  - {occ[:120]}..." if len(occ) > 120 else f"  - {occ}")

    if explore_lines is not None:
        pendentes = [g for g in open_explore_gaps(explore_lines) if g not in spec_refs]
        print()
        if pendentes:
            print(f"GAPs abertos do Explore ainda não importados para {base_dir}: {', '.join(pendentes)}"
                  " — importar mantendo o número (spec-iterate, «Projeto vindo do Explore»).")
        else:
            print(f"Todos os GAPs abertos do Explore já estão em {base_dir}.")

    return 2 if read_errors else 0


if __name__ == "__main__":
    sys.exit(main())
