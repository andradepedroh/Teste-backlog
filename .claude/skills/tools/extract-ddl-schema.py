#!/usr/bin/env python3
"""Extrai o schema declarado a partir de arquivos DDL, sem precisar de banco de pé.

Para que serve
--------------
O Passo 0.7 da `spec-legacy` coleta sinais determinísticos. O sinal de banco (`tbls`)
exige conexão viva — e legado antigo costuma chegar como pasta de arquivos DDL, sem
banco nenhum para conectar. Este script cobre esse caso: lê os arquivos e devolve o
que o schema **declara**, com contagem confiável.

Por que "confiável" é o ponto
-----------------------------
Extrator de DDL escrito às pressas erra sempre do mesmo jeito: casa a cláusula
`references` por conta própria e conta duas vezes o mesmo comando

    alter table FILHA add constraint X foreign key (COL) references PAI (COL);

uma vez pelo `foreign key`, outra pelo `references`. O número sai inflado, e ninguém
percebe porque continua "parecendo" um número de chave estrangeira.

Aqui a leitura é **por comando**, não por linha: o texto é dividido em comandos
completos e cada comando produz no máximo uma chave. No fim ainda há deduplicação por
(tabela filha, colunas da filha, tabela pai, colunas do pai).

O que ele entende
-----------------
- `create table T ( ... )` — colunas, tipo, `not null`, e restrições declaradas
  dentro do parêntese (chave primária, única, e chave estrangeira em nível de coluna
  ou de tabela).
- `alter table T add constraint N primary key (cols)`
- `alter table T add constraint N foreign key (cols) references P (cols)`
- `alter table T add constraint N unique (cols)`
- `create [unique] index N on T (cols)`

Sintaxe de Oracle, PostgreSQL, MySQL e SQL Server coincidem nessas formas. Dialeto
exótico cai fora em silêncio — por desenho: é melhor não contar do que contar errado.

Uso
---
    python3 extract-ddl-schema.py <pasta-ou-arquivo> [...] \\
        --out outputs/spec/signals/ddl-schema.json \\
        --csv outputs/spec/signals/ddl-fks.csv

Sem `--out`, imprime o resumo legível no terminal e nada grava.

Códigos de saída: 0 sucesso · 1 erro de uso · 2 nenhum arquivo DDL encontrado.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

DEFAULT_EXTS = (".sql", ".tab", ".ddl", ".tbl")

# ---------------------------------------------------------------- normalização

_LINE_COMMENT = re.compile(r"--[^\n]*")
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
_STRING_LIT = re.compile(r"'(?:[^']|'')*'", re.S)


def strip_noise(text: str) -> str:
    """Remove comentários e literais de texto.

    Os literais viram `''` porque um `;` ou um parêntese dentro de uma string
    quebraria a divisão em comandos. O conteúdo deles não interessa para schema.
    """
    text = _BLOCK_COMMENT.sub(" ", text)
    text = _LINE_COMMENT.sub(" ", text)
    text = _STRING_LIT.sub("''", text)
    return text


def split_statements(text: str):
    """Divide em comandos pelo `;` de nível superior.

    Um `;` dentro de parênteses não encerra comando — acontece em corpo de rotina
    e em default composto.
    """
    depth, start = 0, 0
    for i, ch in enumerate(text):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        elif ch == ";" and depth == 0:
            stmt = text[start:i].strip()
            if stmt:
                yield stmt
            start = i + 1
    tail = text[start:].strip()
    if tail:
        yield tail


def ident(raw: str) -> str:
    """Normaliza um identificador: tira aspas, colchetes, crase e o dono do objeto."""
    raw = raw.strip().strip(";").strip()
    raw = raw.strip('"').strip("`").strip("[").strip("]")
    if "." in raw:  # SCHEMA.TABELA -> TABELA
        raw = raw.rsplit(".", 1)[-1]
    return raw.strip('"').strip("`").upper()


def split_cols(raw: str):
    """Divide a lista de colunas de um parêntese, ignorando direção de índice."""
    out = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        part = re.sub(r"\s+(ASC|DESC)$", "", part, flags=re.I)
        part = part.split()[0] if part.split() else part
        out.append(ident(part))
    return [c for c in out if c]


def balanced(text: str, open_at: int):
    """Devolve (conteúdo, índice-após-o-fecha) do parêntese que abre em `open_at`."""
    depth = 0
    for i in range(open_at, len(text)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[open_at + 1 : i], i + 1
    return None, len(text)


# ------------------------------------------------------------------- parsing

RE_CREATE_TABLE = re.compile(
    r"^\s*CREATE\s+(?:GLOBAL\s+TEMPORARY\s+|TEMP(?:ORARY)?\s+)?TABLE\s+"
    r"(?:IF\s+NOT\s+EXISTS\s+)?([\w\.\"\[\]`]+)",
    re.I,
)
RE_ALTER_TABLE = re.compile(r"^\s*ALTER\s+TABLE\s+(?:ONLY\s+)?([\w\.\"\[\]`]+)", re.I)
RE_CREATE_INDEX = re.compile(
    r"^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+([\w\.\"\[\]`]+)\s+ON\s+([\w\.\"\[\]`]+)", re.I
)

RE_FK_CLAUSE = re.compile(
    r"FOREIGN\s+KEY\s*\(", re.I
)  # a lista de colunas vem do casamento de parênteses
RE_REFERENCES = re.compile(r"REFERENCES\s+([\w\.\"\[\]`]+)\s*(\()?", re.I)
RE_PK_CLAUSE = re.compile(r"PRIMARY\s+KEY\s*\(", re.I)
RE_UQ_CLAUSE = re.compile(r"\bUNIQUE\s*\(", re.I)
RE_CONSTRAINT_NAME = re.compile(r"CONSTRAINT\s+([\w\.\"\[\]`]+)", re.I)

# Palavras que abrem uma restrição em nível de tabela dentro do create table.
RE_TABLE_LEVEL = re.compile(
    r"^\s*(CONSTRAINT\b|PRIMARY\s+KEY\b|FOREIGN\s+KEY\b|UNIQUE\b|CHECK\b)", re.I
)


def parse_fk(stmt: str, child: str, source: str):
    """Extrai UMA chave estrangeira do comando, ou None.

    Aceita as duas ordens possíveis e nunca conta a cláusula `references` como um
    segundo achado: o `references` é lido a partir do ponto onde o `foreign key`
    terminou.
    """
    m = RE_FK_CLAUSE.search(stmt)
    if not m:
        return None
    inner, after = balanced(stmt, m.end() - 1)
    if inner is None:
        return None
    child_cols = split_cols(inner)

    ref = RE_REFERENCES.search(stmt, after)
    if not ref:
        return None
    parent = ident(ref.group(1))
    parent_cols = []
    if ref.group(2):
        inner2, _ = balanced(stmt, ref.end() - 1)
        if inner2 is not None:
            parent_cols = split_cols(inner2)

    cname = RE_CONSTRAINT_NAME.search(stmt)
    return {
        "child_table": child,
        "child_columns": child_cols,
        "parent_table": parent,
        "parent_columns": parent_cols,
        "constraint": ident(cname.group(1)) if cname else None,
        "composite": len(child_cols) > 1,
        "form": "table-level",
        "source_file": source,
    }


def parse_create_table(stmt: str, source: str, schema: dict):
    m = RE_CREATE_TABLE.match(stmt)
    if not m:
        return
    table = ident(m.group(1))
    open_at = stmt.find("(", m.end())
    if open_at == -1:
        return
    body, _ = balanced(stmt, open_at)
    if body is None:
        return

    entry = schema["tables"].setdefault(
        table,
        {"columns": [], "primary_key": [], "unique": [], "source_file": source},
    )

    # Divide o corpo em itens de nível superior (coluna ou restrição).
    items, depth, start = [], 0, 0
    for i, ch in enumerate(body):
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            items.append(body[start:i])
            start = i + 1
    items.append(body[start:])

    for item in items:
        item = item.strip()
        if not item:
            continue

        if RE_TABLE_LEVEL.match(item):
            pk = RE_PK_CLAUSE.search(item)
            if pk:
                inner, _ = balanced(item, pk.end() - 1)
                if inner:
                    entry["primary_key"] = split_cols(inner)
                continue
            fk = parse_fk(item, table, source)
            if fk:
                schema["_fks"].append(fk)
                continue
            uq = RE_UQ_CLAUSE.search(item)
            if uq:
                inner, _ = balanced(item, uq.end() - 1)
                if inner:
                    entry["unique"].append(split_cols(inner))
            continue

        # Definição de coluna.
        parts = item.split()
        if not parts:
            continue
        col = ident(parts[0])
        entry["columns"].append(
            {
                "name": col,
                "type": " ".join(parts[1:2]) if len(parts) > 1 else None,
                "not_null": bool(re.search(r"\bNOT\s+NULL\b", item, re.I)),
            }
        )
        if re.search(r"\bPRIMARY\s+KEY\b", item, re.I):
            entry["primary_key"] = [col]
        ref = RE_REFERENCES.search(item)
        if ref and not RE_FK_CLAUSE.search(item):
            # Chave estrangeira declarada na própria coluna.
            parent_cols = []
            if ref.group(2):
                inner2, _ = balanced(item, ref.end() - 1)
                if inner2:
                    parent_cols = split_cols(inner2)
            schema["_fks"].append(
                {
                    "child_table": table,
                    "child_columns": [col],
                    "parent_table": ident(ref.group(1)),
                    "parent_columns": parent_cols,
                    "constraint": None,
                    "composite": False,
                    "form": "column-level",
                    "source_file": source,
                }
            )


def parse_alter_table(stmt: str, source: str, schema: dict):
    m = RE_ALTER_TABLE.match(stmt)
    if not m:
        return
    table = ident(m.group(1))
    entry = schema["tables"].setdefault(
        table,
        {"columns": [], "primary_key": [], "unique": [], "source_file": source},
    )

    fk = parse_fk(stmt, table, source)
    if fk:
        fk["form"] = "alter-table"
        schema["_fks"].append(fk)
        return

    pk = RE_PK_CLAUSE.search(stmt)
    if pk:
        inner, _ = balanced(stmt, pk.end() - 1)
        if inner:
            entry["primary_key"] = split_cols(inner)
        return

    uq = RE_UQ_CLAUSE.search(stmt)
    if uq:
        inner, _ = balanced(stmt, uq.end() - 1)
        if inner:
            entry["unique"].append(split_cols(inner))


def parse_create_index(stmt: str, source: str, schema: dict):
    m = RE_CREATE_INDEX.match(stmt)
    if not m:
        return
    open_at = stmt.find("(", m.end())
    cols = []
    if open_at != -1:
        inner, _ = balanced(stmt, open_at)
        if inner:
            cols = split_cols(inner)
    schema["indexes"].append(
        {
            "name": ident(m.group(2)),
            "table": ident(m.group(3)),
            "columns": cols,
            "unique": bool(m.group(1)),
            "source_file": source,
        }
    )


# ---------------------------------------------------------------------- main


def read_text(path: str) -> str:
    """DDL antigo raramente é UTF-8. Tenta as codificações usuais, em ordem."""
    with open(path, "rb") as fh:
        raw = fh.read()
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", errors="replace")


def collect_files(paths, exts):
    found = []
    for p in paths:
        if os.path.isfile(p):
            found.append(p)
        elif os.path.isdir(p):
            for root, _dirs, files in os.walk(p):
                for f in files:
                    if f.lower().endswith(exts):
                        found.append(os.path.join(root, f))
    return sorted(set(found))


def build(paths, exts):
    schema = {"tables": {}, "indexes": [], "_fks": []}
    files = collect_files(paths, exts)
    for path in files:
        source = os.path.basename(path)
        try:
            text = strip_noise(read_text(path))
        except OSError:
            continue
        for stmt in split_statements(text):
            head = stmt.lstrip()[:16].upper()
            if head.startswith("CREATE"):
                if RE_CREATE_TABLE.match(stmt):
                    parse_create_table(stmt, source, schema)
                elif RE_CREATE_INDEX.match(stmt):
                    parse_create_index(stmt, source, schema)
            elif head.startswith("ALTER"):
                parse_alter_table(stmt, source, schema)
    return schema, files


def dedupe_fks(fks):
    """Remove repetição por (filha, colunas da filha, pai, colunas do pai)."""
    seen, out = set(), []
    for fk in fks:
        key = (
            fk["child_table"],
            tuple(fk["child_columns"]),
            fk["parent_table"],
            tuple(fk["parent_columns"]),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(fk)
    return out


def summarize(schema, files, raw_fk_count):
    tables = schema["tables"]
    fks = schema["_fks"]
    no_pk = sorted(t for t, v in tables.items() if not v["primary_key"])
    known = set(tables)
    orphan = sorted({f["parent_table"] for f in fks if f["parent_table"] not in known})
    parents = Counter(f["parent_table"] for f in fks)
    children = Counter(f["child_table"] for f in fks)
    pairs = {(f["child_table"], f["parent_table"]) for f in fks}
    by_form = Counter(f["form"] for f in fks)

    return {
        "files_scanned": len(files),
        "tables": len(tables),
        "tables_without_primary_key": len(no_pk),
        "tables_without_primary_key_list": no_pk,
        "foreign_keys": len(fks),
        "foreign_keys_before_dedupe": raw_fk_count,
        "duplicates_removed": raw_fk_count - len(fks),
        "composite_foreign_keys": sum(1 for f in fks if f["composite"]),
        "distinct_table_pairs": len(pairs),
        "child_tables": len(children),
        "parent_tables": len(parents),
        "by_form": dict(by_form),
        "parent_tables_not_declared_here": orphan,
        "indexes": len(schema["indexes"]),
        "top_parents": parents.most_common(20),
        "top_children": children.most_common(20),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Extrai o schema declarado (tabelas, chaves primárias e "
        "estrangeiras, índices) de arquivos DDL, sem precisar de banco de pé."
    )
    ap.add_argument("paths", nargs="+", help="arquivos ou pastas com DDL")
    ap.add_argument("--out", help="grava o JSON completo neste caminho")
    ap.add_argument("--csv", help="grava as chaves estrangeiras neste CSV")
    ap.add_argument(
        "--ext",
        default=",".join(DEFAULT_EXTS),
        help="extensões consideradas, separadas por vírgula (padrão: %(default)s)",
    )
    args = ap.parse_args(argv)

    exts = tuple(
        e if e.startswith(".") else "." + e
        for e in (x.strip().lower() for x in args.ext.split(","))
        if e
    )

    schema, files = build(args.paths, exts)
    if not files:
        print("Nenhum arquivo DDL encontrado nos caminhos informados.", file=sys.stderr)
        return 2

    raw = len(schema["_fks"])
    schema["_fks"] = dedupe_fks(schema["_fks"])
    summary = summarize(schema, files, raw)

    payload = {
        "summary": summary,
        "foreign_keys": schema["_fks"],
        "tables": schema["tables"],
        "indexes": schema["indexes"],
    }

    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)

    if args.csv:
        os.makedirs(os.path.dirname(os.path.abspath(args.csv)), exist_ok=True)
        with open(args.csv, "w", encoding="utf-8", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(
                [
                    "child_table",
                    "child_columns",
                    "parent_table",
                    "parent_columns",
                    "constraint",
                    "composite",
                    "form",
                    "source_file",
                ]
            )
            for f in schema["_fks"]:
                w.writerow(
                    [
                        f["child_table"],
                        "|".join(f["child_columns"]),
                        f["parent_table"],
                        "|".join(f["parent_columns"]),
                        f["constraint"] or "",
                        "sim" if f["composite"] else "nao",
                        f["form"],
                        f["source_file"],
                    ]
                )

    s = summary
    print(f"Arquivos lidos:            {s['files_scanned']}")
    print(f"Tabelas declaradas:        {s['tables']}")
    print(f"  sem chave primária:      {s['tables_without_primary_key']}")
    print(f"Chaves estrangeiras:       {s['foreign_keys']}")
    print(
        f"  antes da deduplicação:   {s['foreign_keys_before_dedupe']}"
        f"  (repetidas removidas: {s['duplicates_removed']})"
    )
    print(f"  compostas:               {s['composite_foreign_keys']}")
    print(f"  por forma:               {s['by_form']}")
    print(f"Pares distintos filha-pai: {s['distinct_table_pairs']}")
    print(f"Tabelas filhas / pai:      {s['child_tables']} / {s['parent_tables']}")
    print(f"Índices declarados:        {s['indexes']}")
    if s["parent_tables_not_declared_here"]:
        print(
            f"Tabelas pai citadas mas não declaradas aqui: "
            f"{len(s['parent_tables_not_declared_here'])}"
        )
    if args.out:
        print(f"\nJSON gravado em {args.out}")
    if args.csv:
        print(f"CSV  gravado em {args.csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
