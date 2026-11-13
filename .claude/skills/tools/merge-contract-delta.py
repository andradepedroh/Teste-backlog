#!/usr/bin/env python3
"""merge-contract-delta.py — monta o contrato RESULTANTE do modo _change da spec-api-contracts.

Por que existe: no modo _change o `oasdiff breaking` precisa comparar o contrato vigente com o
contrato que vai existir DEPOIS da alteração. A saída do modo, porém, é só o delta
(`api-contracts_change.yaml` — "NÃO replicar endpoints sem alteração"). Comparar o vigente com o
delta faz o oasdiff acusar como REMOVIDO todo endpoint que o delta não repete. Este script junta
os dois num terceiro arquivo — o vigente nunca é sobrescrito (regra 1 do modo _change).

Uso:
    python3 ../tools/merge-contract-delta.py <api-contracts.yaml> <api-contracts_change.yaml> --out <resultante>

Formato: `.json` é lido e escrito sem dependência; `.yaml`/`.yml` exige o PyYAML. Sem ele o script
sai com exit 3 e `TOOL_UNAVAILABLE:pyyaml` (política do `references/tool-bootstrap.md`: registrar
no sync-log e cair no modo degradado da skill — montar o resultante à mão pelas mesmas regras).

Regras da junção (as mesmas que a SKILL.md da spec-api-contracts descreve no D_change):
  * Só `paths` e `components` são juntados; o resto do documento vem do vigente.
  * Cada operação do delta carrega `x-operation-type`:
      NEW     — operação nova; entra no resultante.
      ALTER   — a operação do delta é a versão COMPLETA (não um remendo) e substitui a vigente.
                Campo removido é campo AUSENTE no delta — é isso que o oasdiff enxerga como
                remoção. O `deprecated`/`removedInChange` do suplemento é rastreio, não contrato.
      REMOVED — a operação sai do resultante.
    Sem a marca, o script deduz (existe no vigente → ALTER; não existe → NEW) e avisa. O valor é
    lido sem distinguir maiúsculas. `operationType` (sem o `x-`, o nome que a SKILL.md usava) é
    aceito como sinônimo, com aviso para renomear — ignorá-lo faria um REMOVED virar operação nova.
  * `x-operation-type: REMOVED` no nível do PATH tira o path inteiro do resultante (o que mais o
    delta trouxer naquele path é ignorado, com aviso).
  * Chaves de nível de path que não são método (`parameters`, `summary`, …) presentes no delta
    substituem as do vigente. Path que fica sem nenhum método sai do resultante.
  * `components.<seção>.<nome>` do delta substitui ou acrescenta; com `x-operation-type: REMOVED`,
    sai do resultante. Schema ALTER também é o item COMPLETO: propriedade ou `required` do vigente
    que não vem no delta sai do resultante — e cada uma é listada num aviso, porque um schema
    parcial por engano apagaria campos sem ninguém pedir.
  * A marca (`x-operation-type`, ou o sinônimo) não vai para o resultante em nível nenhum.

Exit codes: 0 resultante gravado (avisos no stderr) · 2 argumentos ou entrada ilegível ·
            3 TOOL_UNAVAILABLE:pyyaml.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

METODOS = ("get", "put", "post", "delete", "options", "head", "patch", "trace")
MARCA = "x-operation-type"
SINONIMO = "operationType"
MARCAS = (MARCA, SINONIMO)
TIPOS = ("NEW", "ALTER", "REMOVED")

# Windows: stdout/stderr nascem em cp1252 e o texto tem acento.
for _fluxo in (sys.stdout, sys.stderr):
    try:
        _fluxo.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass


class SemPyYaml(Exception):
    pass


def _eh_yaml(caminho: Path) -> bool:
    return caminho.suffix.lower() in (".yaml", ".yml")


def _yaml():
    try:
        import yaml  # noqa: PLC0415 — dependência opcional, só para .yaml
    except ImportError as e:
        raise SemPyYaml(str(e)) from e
    return yaml


def ler(caminho: Path) -> dict:
    texto = caminho.read_text(encoding="utf-8")
    doc = _yaml().safe_load(texto) if _eh_yaml(caminho) else json.loads(texto)
    if not isinstance(doc, dict):
        raise ValueError(f"{caminho}: não é um documento OpenAPI (objeto na raiz)")
    return doc


def gravar(doc: dict, caminho: Path | None) -> None:
    if caminho is not None and _eh_yaml(caminho):
        texto = _yaml().safe_dump(doc, allow_unicode=True, sort_keys=False)
    else:
        texto = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
    if caminho is None:
        sys.stdout.write(texto)
    else:
        caminho.parent.mkdir(parents=True, exist_ok=True)
        caminho.write_text(texto, encoding="utf-8", newline="\n")


def _sem_marca(valor):
    if isinstance(valor, dict):
        return {k: _sem_marca(v) for k, v in valor.items() if k != MARCA}
    if isinstance(valor, list):
        return [_sem_marca(v) for v in valor]
    return valor


def _limpo(valor):
    """O item do delta como vai para o resultante: sem a marca em nível nenhum e sem o sinônimo
    no topo (onde ele é marca; mais fundo, `operationType` pode ser propriedade de schema)."""
    limpo = _sem_marca(valor)
    if isinstance(limpo, dict):
        limpo.pop(SINONIMO, None)
    return limpo


def _bruto(valor):
    """O valor da marca de um item do delta (a oficial vence o sinônimo), ou None."""
    if not isinstance(valor, dict):
        return None
    return valor.get(MARCA, valor.get(SINONIMO))


def _marca(valor, ref: str, avisos: list[str]) -> str | None:
    """Tipo declarado num item do delta (path, operação ou componente); None quando não há marca."""
    bruto = _bruto(valor)
    if bruto is None:
        return None
    if MARCA not in valor:
        avisos.append(f"{ref}: marcado com `{SINONIMO}`; a marca do delta é `{MARCA}` — lido como "
                      f"{bruto!r}, renomeie no delta")
    tipo = str(bruto).strip().upper()
    if tipo not in TIPOS:
        avisos.append(f"{ref}: {MARCA}={bruto!r} desconhecido; tratado como ALTER")
        return "ALTER"
    return tipo


def _sumiu_do_schema(vigente, novo) -> tuple[list[str], list[str]]:
    """(propriedades, required) do schema vigente que o schema do delta não traz."""
    def props(s):
        p = s.get("properties") if isinstance(s, dict) else None
        return p if isinstance(p, dict) else {}

    def req(s):
        r = s.get("required") if isinstance(s, dict) else None
        return r if isinstance(r, list) else []

    return ([p for p in props(vigente) if p not in props(novo)],
            [r for r in req(vigente) if r not in req(novo)])


def juntar(vigente: dict, delta: dict) -> tuple[dict, list[str]]:
    """Devolve (resultante, avisos). Função pura — não lê nem grava arquivo."""
    resultado = copy.deepcopy(vigente)
    avisos: list[str] = []
    paths = resultado.setdefault("paths", {})

    for rota, item_delta in (delta.get("paths") or {}).items():
        if not isinstance(item_delta, dict):
            continue
        if _marca(item_delta, rota, avisos) == "REMOVED":
            # Remover o path inteiro: sem isto a marca ia parar no resultante e o path ficava —
            # o oasdiff não via a remoção.
            if rota not in paths:
                avisos.append(f"{rota}: REMOVED, mas não existe no vigente")
            resto = [c for c, v in item_delta.items()
                     if c not in MARCAS
                     and not (c in METODOS and str(_bruto(v)).strip().upper() == "REMOVED")]
            if resto:
                avisos.append(f"{rota}: REMOVED no nível do path — o path inteiro sai do resultante; "
                              f"{', '.join(resto)} do delta ignorado(s)")
            paths.pop(rota, None)
            continue
        item = paths.setdefault(rota, {})
        for chave, valor in item_delta.items():
            if chave in MARCAS:
                continue
            if chave not in METODOS:
                item[chave] = _limpo(valor)
                continue
            op = f"{chave.upper()} {rota}"
            existe = chave in item
            tipo = _marca(valor, op, avisos)
            if tipo is None:
                tipo = "ALTER" if existe else "NEW"
                avisos.append(f"{op}: sem {MARCA}; tratado como {tipo}")
            if tipo == "REMOVED":
                if not existe:
                    avisos.append(f"{op}: REMOVED, mas não existe no vigente")
                item.pop(chave, None)
                continue
            if tipo == "NEW" and existe:
                avisos.append(f"{op}: NEW, mas já existe no vigente — substituído como ALTER")
            if tipo == "ALTER" and not existe:
                avisos.append(f"{op}: ALTER, mas não existe no vigente — incluído como NEW")
            item[chave] = _limpo(valor)
        if not any(m in item for m in METODOS):
            paths.pop(rota, None)

    comp_delta = delta.get("components") or {}
    if isinstance(comp_delta, dict) and comp_delta:
        comp = resultado.setdefault("components", {})
        for secao, itens in comp_delta.items():
            if not isinstance(itens, dict):
                continue
            destino = comp.setdefault(secao, {})
            for nome, valor in itens.items():
                if nome in MARCAS:
                    continue
                ref = f"components.{secao}.{nome}"
                if _marca(valor, ref, avisos) == "REMOVED":
                    if nome not in destino:
                        avisos.append(f"{ref}: REMOVED, mas não existe no vigente")
                    destino.pop(nome, None)
                    continue
                novo = _limpo(valor)
                if secao == "schemas" and nome in destino:
                    props, req = _sumiu_do_schema(destino[nome], novo)
                    if props or req:
                        partes = []
                        if props:
                            partes.append("propriedade(s) " + ", ".join(f"`{p}`" for p in props))
                        if req:
                            partes.append("required " + ", ".join(f"`{r}`" for r in req))
                        avisos.append(
                            f"{ref}: o delta não traz {'; '.join(partes)} do vigente — ALTER é o "
                            "schema completo, então isso sai do resultante (e o oasdiff acusa como "
                            "remoção); se não foi remoção intencional, o delta tem de trazer o "
                            "schema completo")
                destino[nome] = novo

    return resultado, avisos


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Monta o contrato resultante (vigente + delta) do modo _change da spec-api-contracts.")
    ap.add_argument("vigente", type=Path, help="api-contracts.yaml vigente (não é alterado)")
    ap.add_argument("delta", type=Path, help="api-contracts_change.yaml (só o delta)")
    ap.add_argument("--out", type=Path, default=None,
                    help="arquivo do resultante (.yaml ou .json); sem ele, JSON no stdout")
    args = ap.parse_args(argv)

    try:
        vigente = ler(args.vigente)
        delta = ler(args.delta)
    except SemPyYaml:
        print("TOOL_UNAVAILABLE:pyyaml — ler/gravar YAML exige o pacote PyYAML. Registre no "
              "sync-log e monte o resultante à mão pelas regras do D_change.", file=sys.stderr)
        return 3
    except (OSError, ValueError) as e:
        print(f"merge-contract-delta: entrada ilegível — {e}", file=sys.stderr)
        return 2

    if ((delta.get("info") or {}).get("x-change-metadata") or {}).get("noContractChanges") is True:
        print("merge-contract-delta: noContractChanges=true — o resultante é o vigente.", file=sys.stderr)

    resultado, avisos = juntar(vigente, delta)
    for a in avisos:
        print(f"AVISO: {a}", file=sys.stderr)
    try:
        gravar(resultado, args.out)
    except SemPyYaml:
        print("TOOL_UNAVAILABLE:pyyaml — gravar YAML exige o pacote PyYAML; use --out com .json "
              "(o oasdiff lê JSON).", file=sys.stderr)
        return 3
    if args.out is not None:
        print(f"merge-contract-delta: resultante gravado em {args.out} ({len(avisos)} aviso(s)).",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
