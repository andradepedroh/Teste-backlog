#!/usr/bin/env python3
"""check-residues — CI leve do repositório Eng_Proc (§2.15 / §2.16 da auditoria).

Falha (exit 1) se encontrar, dentro de skills/:
  - resíduos de projetos reais em skills que devem ser agnósticas;
  - paths descontinuados (task-generator/);
  - definição de GAP fora de gaps.md / gaps-document.md (fora de blocos de código).

Exclusões conhecidas (não são resíduo real, são falso-positivo estrutural):
  - o próprio script (contém os termos proibidos no corpo do regex);
  - a LINHA que DOCUMENTA o path descontinuado — «descontinuado», «layout antigo/legado»,
    «compatibilidade», «não é mais criada» etc. A isenção é por CONTEXTO DE LINHA, não por
    arquivo: isentar `tools/README.md` inteiro deixava passar «Rodar o gerador em
    `task-generator/`» no mesmo arquivo, com exit 0 — reintrodução silenciosa do path que
    a checagem existe para impedir. A isenção vale só para FORBIDDEN_PATH, nunca para os
    resíduos de projeto;
  - exemplos didáticos de GAP-XXX dentro de blocos de código (cercados ``` / ~~~ ou
    indentados por 4 espaços).

Uso:
  python3 ../tools/check-residues.py [base_dir]
  (caminho relativo ao SKILL.md que invoca — ver references/paths.md)
  (base_dir default = a pasta skills/ que contém este script)
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(HERE)  # skills/
SELF_PATH = os.path.abspath(__file__)

# Resíduos de projeto que NÃO devem aparecer em skills agnósticas.
# `\belo[\s._-]*guard\b`: o `\b` inicial é obrigatório — sem ele o termo casava DENTRO de
# palavras portuguesas comuns ("p·elo guard`load_templates()`" em
# `tools/generate-report.py` virava resíduo). Nome de projeto é token inteiro, nunca
# sufixo de outra palavra. O separador é `[\s._-]*` e não `\s*` porque o mesmo nome
# aparece como `Elo-Guard`, `Elo_Guard` e `Elo.Guard` em código/paths/slugs; os dois `\b`
# continuam a proteger os falsos positivos que motivaram a regra original
# (`pelo guard`, `modelo guard`, `EloGuardian` seguem passando).
# `contribuinte(s)`: vocabulário do domínio fiscal do projeto original — reincidiu em
# `validate-tasks-selfsufficiency.mjs` e em `tasks.schema-atual.json` depois da
# generalização. Exemplos usam o domínio fictício do `spec-estimate` (ORBITA/SEGURADO).
# Exige contexto fiscal na vizinhança porque «fatores/causas contribuintes» é PT-BR corrente
# e apareceria de forma legítima nas skills de causa-raiz (spec-debug-fix, spec-code-audit).
RESIDUE = re.compile(
    r"sicar|gov\.br|embargos|\belo[\s._-]*guard\b|\bcidadao\b|\bcidadão\b|"
    r"\bcontribuintes?\b(?=[^\n]{0,80}(?:fiscal|tribut|CPF|CNPJ|inscri[çc][ãa]o|cadastr))|"
    r"Spec-Driven Outputs|app-prototype|portal de serviços ambientais|\bPerna\b",
    re.IGNORECASE,
)
FORBIDDEN_PATH = re.compile(r"task-generator/")
# Isenção do path descontinuado por CONTEXTO DA LINHA — nunca por arquivo. Só a linha que
# DOCUMENTA a descontinuação (regra de compatibilidade, aviso de layout antigo, descrição
# desta própria checagem) é isenta; a linha ao lado, no mesmo arquivo, que mande «rodar o
# gerador em task-generator/» continua sendo erro. A isenção por arquivo
# (`FORBIDDEN_PATH_ALLOWED`) fazia o oposto: liberava o arquivo inteiro.
FORBIDDEN_PATH_CONTEXT = re.compile(
    r"descontinuad|obsolet|deprecat|layout antigo|layout legado|legado|compatibilidade|"
    r"n[ãa]o (?:é|e) mais|n[ãa]o usar|nunca|proibid",
    re.IGNORECASE,
)
# Definição de GAP: linha de tabela começando por "| GAP-" ou heading "### GAP-".
GAP_DEF = re.compile(r"^\s*(\|\s*GAP-\d+|#{1,6}\s*GAP-\d+)", re.MULTILINE)
GAP_ALLOWED = {"gaps.md", "gaps-document.md"}

SKIP_DIRS = {".git", "node_modules", "__pycache__", "dist", "docs"}
TEXT_EXT = {".md", ".mdc", ".json", ".mjs", ".js", ".py", ".yaml", ".yml", ".html"}


def iter_files(base):
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if os.path.splitext(f)[1].lower() in TEXT_EXT:
                yield os.path.join(root, f)


# --- Blocos de código não contam como definição ------------------------------
# GÊMEO de `check-outputs.py:strip_code_blocks` — as duas cópias são idênticas de
# propósito (cada script tem de rodar sozinho em qualquer espelho, sem importar o irmão).
# Divergir foi o que deixou o irmão casar marcadores dentro de ``` do template do
# sync-log; a versão antiga daqui (```...``` por regex DOTALL) também ignorava ~~~ e
# blocos indentados por 4 espaços.
_FENCE_OPEN_RE = re.compile(r"^[ \t]{0,3}(`{3,}|~{3,})")
_INDENTED_CODE_RE = re.compile(r"^(?: {4}|\t)")


def strip_code_blocks(text):
    """Neutraliza blocos de código preservando a contagem de linhas.

    Cobre as DUAS formas do Markdown:
      - CERCADO — ``` … ``` ou ~~~ … ~~~ (com info string, indentado até 3 espaços);
      - INDENTADO — 4 espaços / TAB depois de linha em branco.
    Idempotente: aplicar duas vezes dá o mesmo resultado.
    """
    out = []
    fence = None          # marcador de fechamento pendente
    in_indented = False
    prev_blank = True
    for line in text.split("\n"):
        if fence is not None:
            out.append("")
            stripped = line.strip()
            if stripped.startswith(fence) and set(stripped) <= set(fence[0] + " \t"):
                fence = None
            continue
        opened = _FENCE_OPEN_RE.match(line)
        if opened:
            fence = opened.group(1)
            out.append("")
            prev_blank = False
            in_indented = False
            continue
        blank = not line.strip()
        if in_indented:
            if blank or _INDENTED_CODE_RE.match(line):
                out.append("")
                continue
            in_indented = False
        elif prev_blank and _INDENTED_CODE_RE.match(line):
            in_indented = True
            out.append("")
            prev_blank = False
            continue
        out.append(line)
        prev_blank = blank
    return "\n".join(out)


def main():
    problems = []
    for path in iter_files(BASE):
        if os.path.abspath(path) == SELF_PATH:
            continue  # o próprio checker contém os termos proibidos no corpo do regex
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError as exc:  # nunca silenciar (rule de segurança do repo)
            print(f"AVISO: não consegui ler {path}: {exc}", file=sys.stderr)
            continue
        rel = os.path.relpath(path, BASE)
        for m in RESIDUE.finditer(text):
            lineno = text.count("\n", 0, m.start()) + 1
            problems.append(f"[residuo] {rel}:{lineno}: '{m.group(0)}'")
        for lineno, line in enumerate(text.split("\n"), 1):
            if FORBIDDEN_PATH.search(line) and not FORBIDDEN_PATH_CONTEXT.search(line):
                problems.append(
                    f"[path-descontinuado] {rel}:{lineno}: 'task-generator/' fora de "
                    "contexto de documentação (a linha não descreve a descontinuação)"
                )
        gap_scan_text = strip_code_blocks(text)
        gap_hit = GAP_DEF.search(gap_scan_text) if os.path.basename(path) not in GAP_ALLOWED else None
        if gap_hit:
            lineno = gap_scan_text.count("\n", 0, gap_hit.start()) + 1
            problems.append(
                f"[gap-fora-do-dono] {rel}:{lineno}: definição GAP-XXX só é permitida "
                "em gaps.md/gaps-document.md"
            )

    if problems:
        print("check-residues: FALHOU\n" + "\n".join(sorted(set(problems))), file=sys.stderr)
        return 1
    print("check-residues: OK (nenhum resíduo, path proibido ou GAP fora do dono)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
