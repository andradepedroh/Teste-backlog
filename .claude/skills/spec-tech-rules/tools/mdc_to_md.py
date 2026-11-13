#!/usr/bin/env python3
"""Converte uma rule .mdc (formato Cursor) para .md (Claude Code, .claude/rules) ou para o
steering do Kiro (.kiro/steering).

Fonte unica: o .mdc com frontmatter do Cursor (`globs` / `alwaysApply` / `description`).
O .md e SEMPRE derivado deste arquivo -- nunca edite os dois a mao.

Claude Code (`convert`):
  - alwaysApply: true  OU  sem `globs`  -> rule "sempre": frontmatter SEM `paths`
        (no Claude, rule sem `paths` carrega sempre, equivalente ao alwaysApply do Cursor).
  - globs: "a,b"  (com alwaysApply: false) -> rule contextual (lazy):
        alwaysApply: false
        paths: a, b
    Medido no Claude Code 2.1.295 (2026-10-19): CSV sem aspas, CSV com aspas, glob com chaves e
    lista YAML carregam todos. Mantemos o CSV sem aspas em uma linha, que e o formato que este
    script sempre gerou. Virgula DENTRO de chave (`*.{ts,tsx}`) e do glob, nao separa.

Kiro (`convert_kiro`), conforme kiro.dev/docs/steering:
  - alwaysApply: true, ou sem frontmatter          -> inclusion: always
  - globs + alwaysApply: false                     -> inclusion: fileMatch
        fileMatchPattern: ["a", "b"]  (LISTA, com as chaves expandidas: a documentacao do Kiro
        mostra string ou lista e nao cita expansao de `{a,b}`; chave nao expandida = rule que
        nunca carrega)
  - sem globs, alwaysApply: false, com description -> inclusion: auto + name + description
        (o "Agent Requested" do Cursor: carrega quando o pedido casa com a description;
        `auto` exige `name` e `description`)
  - o resto                                        -> inclusion: always
  O frontmatter e sempre a primeira coisa do arquivo (exigencia do Kiro). Na CLI do Kiro, V3
  honra os quatro modos; V1/V2 so carregam `always` sozinhas.

Orcamento: rule que carrega e reenviada a cada volta do modelo. Acima de LIMITE_CARACTERES o
script AVISA (nao trunca: cortar norma em silencio e pior que o custo) -- divida a rule por tema.

Saida sempre em LF, em qualquer sistema.

Harness Elo (`--dir`): se a pasta de destino ja tem a rule do harness equivalente
(harness/security.md e harness/frontend.md no Claude; harness-security.md e harness-frontend.md
no Kiro), security.mdc e frontend-default.mdc nao sao convertidas -- o harness ja as carrega,
com o mesmo corpo. O script nao apaga nada: copia antiga que sobrou vira aviso.

Uso (script embutido na skill; caminho relativo ao SKILL.md do spec-tech-rules,
conforme ../../tools/references/paths.md):
  python3 tools/mdc_to_md.py entrada.mdc [saida.md]        # converte um arquivo
  python3 tools/mdc_to_md.py --dir <pasta_mdc> <pasta_md>  # converte todos os .mdc -> .md
  python3 tools/mdc_to_md.py --kiro --dir <pasta_mdc> <pasta_md>  # idem, formato steering do Kiro
"""
import os
import re
import sys

_FM = re.compile(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?(.*)$", re.DOTALL)
_CHAVE = re.compile(r"^([A-Za-z0-9_-]+):\s*(.*)$")

# Acima disto, aviso. Faixa escolhida pelo que a medicao do harness mostrou: a rule de frontend do
# harness tem ~16 mil caracteres e e a maior; uma rule de projeto de 12 mil ja pesa em toda volta.
LIMITE_CARACTERES = 12000

# Rules que o harness Elo ja carrega com o corpo identico ao do template desta skill (Decisao 73 do
# harness). Converte-las para a mesma pasta duplicaria ~8,5 mil tokens: a security (sem `paths`) em
# toda volta, o frontend-default em todo arquivo de tela. A fonte em outputs/spec/tech-rules/
# continua com as duas, e o SECURITY_UNMODIFIED confere la. Valor: (Claude, Kiro), relativo a
# pasta de destino.
RULES_DO_HARNESS = {
    "security.mdc": ("harness/security.md", "harness-security.md"),
    "frontend-default.mdc": ("harness/frontend.md", "harness-frontend.md"),
}


def _sem_aspas(raw):
    return raw.strip().strip('"').strip("'")


def _partir(raw):
    """Parte a lista de globs na virgula que esta FORA de chave."""
    partes, atual, nivel = [], "", 0
    for c in _sem_aspas(raw):
        if c == "{":
            nivel += 1
        elif c == "}":
            nivel = max(0, nivel - 1)
        if c == "," and nivel == 0:
            partes.append(atual.strip())
            atual = ""
        else:
            atual += c
    partes.append(atual.strip())
    return [p for p in partes if p]


def _expandir(glob):
    """`a/*.{x,y}` -> `a/*.x`, `a/*.y`. Chaves aninhadas nao aparecem em rules; nao sao tratadas."""
    m = re.search(r"\{([^{}]*)\}", glob)
    if not m:
        return [glob]
    antes, depois = glob[:m.start()], glob[m.end():]
    saida = []
    for op in m.group(1).split(","):
        saida.extend(_expandir(antes + op.strip() + depois))
    return saida


def _ler_frontmatter(fm_block):
    """-> (globs_raw, always, description, linhas)"""
    globs_raw, always, description = "", False, ""
    for line in fm_block.splitlines():
        km = _CHAVE.match(line)
        if not km:
            continue
        key, val = km.group(1), km.group(2)
        if key == "globs":
            globs_raw = val
        elif key == "alwaysApply":
            always = _sem_aspas(val).lower() == "true"
        elif key == "description":
            description = _sem_aspas(val)
    return globs_raw, always, description


def convert(text):
    """Recebe o conteudo de um .mdc e devolve o conteudo do .md equivalente (Claude Code)."""
    m = _FM.match(text)
    if not m:
        # Sem frontmatter: nada a converter, e uma rule "sempre".
        return text
    fm_block, body = m.group(1), m.group(2)
    globs_raw, always, _ = _ler_frontmatter(fm_block)
    contextual = bool(_partir(globs_raw)) and not always

    out_lines = []
    for line in fm_block.splitlines():
        km = _CHAVE.match(line)
        key = km.group(1) if km else None
        if key == "globs":
            continue  # convertido em `paths` abaixo (ou descartado se "sempre")
        if key == "alwaysApply":
            if contextual:
                out_lines.append("alwaysApply: false")
            # rule "sempre": omitimos -- ausencia de `paths` ja a torna sempre-ativa
            continue
        out_lines.append(line)

    if contextual:
        out_lines.append("paths: " + ", ".join(_partir(globs_raw)))

    body = body.lstrip("\r\n")
    if out_lines:
        return "---\n" + "\n".join(out_lines) + "\n---\n\n" + body
    return body


def _nome_kiro(nome, description):
    """`name` do modo auto: o nome do arquivo quando conhecido; senao, derivado da description."""
    base = nome or re.sub(r"[^a-z0-9]+", "-", description.lower())[:40]
    return base.strip("-") or "rule"


def convert_kiro(text, nome=None):
    """Recebe o conteudo de um .mdc e devolve o .md no formato steering do Kiro (ver o topo)."""
    m = _FM.match(text)
    if not m:
        return "---\ninclusion: always\n---\n\n" + text.lstrip("\r\n")
    fm_block, body = m.group(1), m.group(2)
    globs_raw, always, description = _ler_frontmatter(fm_block)
    globs = [g for parte in _partir(globs_raw) for g in _expandir(parte)]
    kept = [line for line in fm_block.splitlines()
            if not (_CHAVE.match(line) and _CHAVE.match(line).group(1) in ("globs", "alwaysApply", "name"))]

    if globs and not always:
        head = ["inclusion: fileMatch",
                "fileMatchPattern: [" + ", ".join('"%s"' % g for g in globs) + "]"]
    elif not globs and not always and description:
        head = ["inclusion: auto", "name: " + _nome_kiro(nome, description)]
    else:
        head = ["inclusion: always"]
    return "---\n" + "\n".join(head + kept) + "\n---\n\n" + body.lstrip("\r\n")


def avisos_de_tamanho(conteudos):
    """{nome: texto} -> lista de avisos para as rules acima de LIMITE_CARACTERES."""
    avisos = []
    for nome, texto in sorted(conteudos.items()):
        if len(texto) > LIMITE_CARACTERES:
            avisos.append(
                f"AVISO - {nome}: {len(texto)} caracteres (limite {LIMITE_CARACTERES}). Rule grande e "
                "reenviada a cada volta do modelo; divida por tema ou restrinja os globs.")
    return avisos


def convert_file(src, dst, kiro=False):
    with open(src, encoding="utf-8") as fh:
        text = fh.read()
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    nome = os.path.splitext(os.path.basename(src))[0]
    out = convert_kiro(text, nome=nome) if kiro else convert(text)
    with open(dst, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(out)
    return text


def rule_do_harness(fn, dst_dir, kiro=False):
    """Caminho da rule do harness que ja cobre `fn` dentro de `dst_dir`, ou None."""
    par = RULES_DO_HARNESS.get(fn)
    if not par:
        return None
    p = os.path.join(dst_dir, *(par[1] if kiro else par[0]).split("/"))
    return p if os.path.isfile(p) else None


def convert_dir(src_dir, dst_dir, kiro=False):
    """-> (convertidas, avisos, puladas). Nao apaga nada: copia antiga que sobrou vira aviso."""
    conteudos, puladas, avisos = {}, [], []
    for fn in sorted(os.listdir(src_dir)):
        if not fn.endswith(".mdc"):
            continue
        dst = os.path.join(dst_dir, fn[:-4] + ".md")
        harness = rule_do_harness(fn, dst_dir, kiro=kiro)
        if harness:
            puladas.append(f"PULADA - {fn}: o harness ja carrega {harness}")
            if os.path.isfile(dst):
                avisos.append(f"AVISO - {dst} existe de uma execucao anterior e duplica {harness}; apague-o.")
            continue
        conteudos[fn] = convert_file(os.path.join(src_dir, fn), dst, kiro=kiro)
    return len(conteudos), avisos + avisos_de_tamanho(conteudos), puladas


def main(argv):
    kiro = "--kiro" in argv
    argv = [a for a in argv if a != "--kiro"]
    if not argv:
        print(__doc__)
        return 1
    if argv[0] == "--dir":
        if len(argv) < 3:
            print("Uso: mdc_to_md.py [--kiro] --dir <pasta_mdc> <pasta_md>", file=sys.stderr)
            return 1
        n, avisos, puladas = convert_dir(argv[1], argv[2], kiro=kiro)
        print(f"OK - {n} rules convertidas -> {argv[2]}")
        for linha in puladas + avisos:
            print(linha)
        return 0
    src = argv[0]
    dst = argv[1] if len(argv) > 1 else (src[:-4] + ".md" if src.endswith(".mdc") else src + ".md")
    texto = convert_file(src, dst, kiro=kiro)
    print(f"OK - {src} -> {dst}")
    for aviso in avisos_de_tamanho({os.path.basename(src): texto}):
        print(aviso)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
