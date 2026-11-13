"""
check-hld.py — valida a gramática estrita de outputs/spec/hld.md (High-Level Design TO-BE).

O hld.md é SOMENTE Markdown (não existe hld.json persistido). Este script parseia o .md;
outros consumidores (ex.: spec-estimate-report) obtêm a estrutura via `--json` (stdout apenas)
e NUNCA reparseiam o .md por conta própria.

Gramática (fonte canônica: spec-hld/templates/hld.md):
  - Cabeçalho com duas linhas lidas pelo validador (ausentes = default):
      `Modo: completo|compacto`        (default completo)
      `Contexto: greenfield|brownfield` (default greenfield)
  - Seções obrigatórias em QUALQUER modo, cada uma com UMA tabela de colunas fixas:
      ## Contexto e containers          | ID | Nome | Responsabilidade | Tecnologia |
      ## Decomposição por módulo        | Módulo | Container | Papel no módulo |
      ## Integrações externas           | ID | Sistema externo | Container | Direção | Estilo | Protocolo | Falha |
      ## Táticas por RNF                | RNF | Métrica | Tática ou risco aceito | Containers | Justificativa |
      ## Decisões de arquitetura (ADR)  | ID | Decisão | Contexto | Alternativas rejeitadas | Consequências | Origem |
  - Obrigatórias só no modo completo:
      ## Fluxos arquiteturais           | ID | Fluxo | Caminho | Nota |
      ## Topologia de implantação       | Ambiente | Topologia | Observação |
      ## Segurança de alto nível        | ID | Fronteira | Containers | Controles | Ameaça AS-IS |
      ## Riscos técnicos e spikes       | ID | Risco | Impacto | Spike sugerido | Alvo |
  - Opcional na gramática (cobrada por AVISO no brownfield):
      ## Delta AS-IS → TO-BE            | Componente AS-IS | Destino TO-BE | Tipo | Nota |
  - IDs: CON-\\d{2}, INT-\\d{2}, FLA-\\d{2}, TRB-\\d{2}, ADR-\\d{2}, RSK-\\d{2}. Células nunca
    vazias: usar `—`. Prosa, diagramas Mermaid e seções extras (ex.: ## Cobertura) são ignorados.
  - AS TABELAS SÃO A FONTE DE VERDADE; o Mermaid é ilustração. Ainda assim, todo `CON-NN` citado
    em qualquer ponto do arquivo (diagrama incluído) tem de existir no inventário.

Gates:
  MODULES_MAPPED (FATAL)             todo MOD-XXX de modules.md na decomposição (ou N/A justificado)
  EXTERNAL_SYSTEMS_ADDRESSED (FATAL) todo sistema externo do context-map coberto por um INT-NN
  NFR_TACTICS_MAPPED (FATAL)         todo RNF com métrica em requirements.md → tática ou risco aceito
  CONTAINERS_CONSISTENT (FATAL)      todo CON-NN citado existe no inventário
  ADR_PER_DECISION (WARNING)         decisões macro das tech-rules sem ADR são listadas
  ASIS_DELTA_PRESENT (WARNING)       brownfield sem ## Delta AS-IS → TO-BE preenchido
  COMPACT_MODE_DECLARED (WARNING)    modo compacto exige degradação declarada no sync-log

Fontes cruzadas são descobertas ao lado do hld.md (modules.md, context-map.md,
requirements/requirements.md, tech-rules/, architecture.md) e podem ser sobrescritas por flag.
Fonte ausente → o gate correspondente vira `N/A (fonte ausente)` + AVISO, nunca erro.

Uso (caminho relativo ao SKILL.md que invoca — vale nos 3 espelhos: skills/,
 .cursor/skills/, plugin/skills/; ver tools/references/paths.md):
  python3 ../tools/check-hld.py [caminho/hld.md]
  Flags: --json (estrutura+métricas+gates em JSON no stdout, não grava arquivo)
         --modules <modules.md> · --context-map <context-map.md>
         --requirements <requirements.md> · --tech-rules <dir> · --architecture <architecture.md>
         --no-cross (desliga TODAS as fontes cruzadas — só gramática)
         --strict (avisos viram erros)

Exit codes: 0 ok · 1 erro de gramática/integridade/gate FATAL · 2 arquivo não encontrado.
"""

import argparse
import codecs
import json
import os
import re
import sys
import unicodedata

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

DASH = "—"
NA = "N/A"

CONTAINERS = "Contexto e containers"
DECOMPOSICAO = "Decomposição por módulo"
INTEGRACOES = "Integrações externas"
FLUXOS = "Fluxos arquiteturais"
DEPLOYMENT = "Topologia de implantação"
TATICAS = "Táticas por RNF"
SEGURANCA = "Segurança de alto nível"
ADRS = "Decisões de arquitetura (ADR)"
RISCOS = "Riscos técnicos e spikes"
DELTA = "Delta AS-IS → TO-BE"

SECTIONS = {
    CONTAINERS:   ["ID", "Nome", "Responsabilidade", "Tecnologia"],
    DECOMPOSICAO: ["Módulo", "Container", "Papel no módulo"],
    INTEGRACOES:  ["ID", "Sistema externo", "Container", "Direção", "Estilo", "Protocolo", "Falha"],
    FLUXOS:       ["ID", "Fluxo", "Caminho", "Nota"],
    DEPLOYMENT:   ["Ambiente", "Topologia", "Observação"],
    TATICAS:      ["RNF", "Métrica", "Tática ou risco aceito", "Containers", "Justificativa"],
    SEGURANCA:    ["ID", "Fronteira", "Containers", "Controles", "Ameaça AS-IS"],
    ADRS:         ["ID", "Decisão", "Contexto", "Alternativas rejeitadas", "Consequências", "Origem"],
    RISCOS:       ["ID", "Risco", "Impacto", "Spike sugerido", "Alvo"],
    DELTA:        ["Componente AS-IS", "Destino TO-BE", "Tipo", "Nota"],
}

# Sempre obrigatórias — são a fonte dos 4 gates FATAL.
CORE_SECTIONS = [CONTAINERS, DECOMPOSICAO, INTEGRACOES, TATICAS, ADRS]
# Obrigatórias só no modo completo.
FULL_SECTIONS = [FLUXOS, DEPLOYMENT, SEGURANCA, RISCOS]

ID_PATTERNS = {
    CONTAINERS:  re.compile(r"^CON-\d{2}$"),
    INTEGRACOES: re.compile(r"^INT-\d{2}$"),
    FLUXOS:      re.compile(r"^FLA-\d{2}$"),
    SEGURANCA:   re.compile(r"^TRB-\d{2}$"),
    ADRS:        re.compile(r"^ADR-\d{2}$"),
    RISCOS:      re.compile(r"^RSK-\d{2}$"),
}

RE_CON = re.compile(r"CON-\d{2}")
RE_CON_FULL = re.compile(r"^CON-\d{2}$")
RE_INT_FULL = re.compile(r"^INT-\d{2}$")
RE_MOD = re.compile(r"^MOD-[A-Za-z0-9_.\-]+$")
RE_RNF = re.compile(r"^RNF-[A-Za-z0-9_.\-]+$")
RE_FLX = re.compile(r"^FLX-\d{3}$")
RE_THR = re.compile(r"^THR-[A-Za-z0-9_.\-]+$")
RE_RULE_FILE = re.compile(r"^[A-Za-z0-9_.\-]+\.(mdc|md)$")

DIRECOES = ("entrada", "saída", "bidirecional")
ESTILOS = ("síncrono", "assíncrono")
TIPOS_DELTA = ("mantém", "substitui", "absorve", "aposenta", "novo")

# Rules que NÃO são decisão de projeto: security é padrão fixo da empresa e
# frontend-default é o padrão empresa materializado por referência.
RULES_SEM_ADR = {"security", "frontend-default", "tech-rules-summary"}


# --- utilidades -------------------------------------------------------------

def split_row(line):
    """Divide uma linha `| a | b |` em células (strip)."""
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]


def blank_noise(text):
    """Devolve o texto com blocos cercados (``` / ~~~) e comentários HTML trocados por
    linhas vazias. Preserva a contagem de linhas — mensagens de erro continuam apontando
    para a linha certa — e impede que um `##` ou um `|` dentro de diagrama/comentário seja
    lido como seção ou linha de tabela."""
    out, in_fence, fence = [], False, ""
    for line in text.splitlines():
        stripped = line.lstrip()
        if in_fence:
            out.append("")
            if stripped.startswith(fence):
                in_fence = False
            continue
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence, fence = True, stripped[:3]
            out.append("")
            continue
        out.append(line)
    joined = "\n".join(out)

    def _blank(m):
        return "\n" * m.group(0).count("\n")

    return re.sub(r"<!--.*?-->", _blank, joined, flags=re.S)


def norm(value):
    """Normaliza um nome livre para comparação: sem acento, sem marcação, minúsculo."""
    v = re.sub(r"[`*_\[\]]", " ", str(value or ""))
    v = unicodedata.normalize("NFKD", v)
    v = "".join(c for c in v if not unicodedata.combining(c))
    v = re.sub(r"[^0-9a-zA-Z]+", " ", v)
    return " ".join(v.split()).lower()


def is_placeholder(value):
    """Linha de exemplo/gabarito que não deve entrar na conta."""
    v = str(value or "").strip()
    if not v or v == DASH:
        return True
    if v.startswith("(") or v.startswith("*("):
        return True
    if v.startswith("[") and v.endswith("]"):
        return True
    return "preencher" in v.lower() or "a definir" in v.lower()


def split_list(value):
    """`a, b` → ['a','b']; `—` → []."""
    if value == DASH:
        return []
    return [x.strip() for x in value.split(",") if x.strip()]


def read(path):
    with codecs.open(path, "r", "utf-8") as f:
        return f.read()


# --- parsing ----------------------------------------------------------------

def parse_meta(text):
    """Lê `Modo:` e `Contexto:` do cabeçalho. Ausentes → completo / greenfield."""
    modo, contexto = "completo", "greenfield"
    m = re.search(r"^Modo:\s*(\w+)", text, re.MULTILINE | re.IGNORECASE)
    if m and m.group(1).lower() in ("completo", "compacto"):
        modo = m.group(1).lower()
    m = re.search(r"^Contexto:\s*(\w+)", text, re.MULTILINE | re.IGNORECASE)
    if m and m.group(1).lower() in ("greenfield", "brownfield"):
        contexto = m.group(1).lower()
    return modo, contexto


def parse_document(text, modo, errors):
    """Extrai as seções conhecidas. Retorna (data, parsed_ok, presentes)."""
    heading = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
    known = set(SECTIONS)
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

    obrigatorias = list(CORE_SECTIONS) + (list(FULL_SECTIONS) if modo == "completo" else [])
    data, parsed_ok = {}, {}
    for name, columns in SECTIONS.items():
        if name not in found:
            if name in obrigatorias:
                errors.append(f"seção obrigatória ausente: ## {name}")
            data[name], parsed_ok[name] = [], False
            continue
        before = len(errors)
        data[name] = parse_table(name, columns, found[name], errors)
        parsed_ok[name] = not (len(errors) > before and not data[name])
    return data, parsed_ok, set(found)


def parse_table(section, columns, body, errors):
    """Parseia a primeira tabela Markdown do corpo da seção."""
    table, in_table = [], False
    for line in body.splitlines():
        if line.strip().startswith("|"):
            in_table = True
            table.append(line)
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
    for line in table[2:]:  # pula separador
        cells = split_row(line)
        if all(re.fullmatch(r":?-{2,}:?", c or "-") for c in cells):
            continue  # separador extra
        if len(cells) != len(columns):
            errors.append(f"## {section}: linha com {len(cells)} células (esperado {len(columns)}): {line.strip()[:80]}")
            continue
        row = dict(zip(columns, cells))
        rid = row.get("ID") or row.get("Módulo") or row.get("RNF") or row.get("Ambiente") or "?"
        for col, val in row.items():
            if val == "":
                errors.append(f"## {section} {rid}: célula vazia na coluna «{col}» — usar {DASH}")
        rows.append(row)
    return rows


# --- checagens de gramática -------------------------------------------------

def check_ids(data, errors):
    for section, pat in ID_PATTERNS.items():
        seen = set()
        for row in data.get(section, []):
            rid = row.get("ID", "")
            if not pat.match(rid):
                errors.append(f"## {section}: ID fora do formato ({pat.pattern}): «{rid}»")
            if rid in seen:
                errors.append(f"## {section}: ID duplicado: {rid}")
            seen.add(rid)


def check_containers_refs(text_all, inventario, errors):
    """Gate CONTAINERS_CONSISTENT — todo CON-NN citado no arquivo existe no inventário."""
    desconhecidos = {}
    for i, line in enumerate(text_all.splitlines(), start=1):
        for tok in RE_CON.findall(line):
            if tok not in inventario:
                desconhecidos.setdefault(tok, i)
    for tok, line in sorted(desconhecidos.items()):
        errors.append(f"linha {line}: container «{tok}» citado mas ausente do inventário de "
                      f"## {CONTAINERS}")
    return not desconhecidos


def check_fields(data, errors, warnings):
    # --- Decomposição
    for r in data[DECOMPOSICAO]:
        mod, con, papel = r["Módulo"], r["Container"], r["Papel no módulo"]
        if not RE_MOD.match(mod):
            errors.append(f"## {DECOMPOSICAO}: Módulo deve ser MOD-...: «{mod}»")
        if con != NA and not RE_CON_FULL.match(con):
            errors.append(f"## {DECOMPOSICAO} {mod}: Container deve ser CON-NN ou {NA}: «{con}»")
        if con == NA and papel == DASH:
            errors.append(f"## {DECOMPOSICAO} {mod}: módulo marcado {NA} sem justificativa em "
                          f"«Papel no módulo» — dizer por que o módulo não vira software nesta entrega")

    # --- Integrações
    for r in data[INTEGRACOES]:
        rid = r["ID"]
        if r["Sistema externo"] == DASH:
            errors.append(f"## {INTEGRACOES} {rid}: «Sistema externo» não pode ser {DASH}")
        for c in split_list(r["Container"]):
            if not RE_CON_FULL.match(c):
                errors.append(f"## {INTEGRACOES} {rid}: Container deve ser CON-NN (lista separada por vírgula) ou {DASH}: «{c}»")
        if r["Direção"] not in DIRECOES:
            errors.append(f"## {INTEGRACOES} {rid}: Direção deve ser {' | '.join(DIRECOES)}: «{r['Direção']}»")
        if r["Estilo"] not in ESTILOS:
            errors.append(f"## {INTEGRACOES} {rid}: Estilo deve ser {' | '.join(ESTILOS)} (declaração obrigatória): «{r['Estilo']}»")

    # --- Fluxos arquiteturais
    for r in data[FLUXOS]:
        rid = r["ID"]
        for f in split_list(r["Fluxo"]):
            if not RE_FLX.match(f):
                errors.append(f"## {FLUXOS} {rid}: Fluxo deve ser FLX-\\d{{3}} do flow-map ou {DASH}: «{f}»")
        if r["Caminho"] == DASH:
            errors.append(f"## {FLUXOS} {rid}: «Caminho» não pode ser {DASH} — descrever a sequência de containers")

    # --- Táticas por RNF
    vistos = set()
    for r in data[TATICAS]:
        rnf = r["RNF"]
        if not RE_RNF.match(rnf):
            errors.append(f"## {TATICAS}: RNF fora do formato (RNF-...): «{rnf}»")
        if rnf in vistos:
            errors.append(f"## {TATICAS}: RNF duplicado: {rnf}")
        vistos.add(rnf)
        if r["Tática ou risco aceito"] == DASH:
            errors.append(f"## {TATICAS} {rnf}: sem tática e sem risco aceito — escrever a tática "
                          f"ou «Risco aceito — <motivo>»")
        if r["Tática ou risco aceito"].lower().startswith("risco aceito") and r["Justificativa"] == DASH:
            errors.append(f"## {TATICAS} {rnf}: risco aceito exige justificativa preenchida")
        for c in split_list(r["Containers"]):
            if not RE_CON_FULL.match(c):
                errors.append(f"## {TATICAS} {rnf}: Containers deve listar CON-NN ou {DASH}: «{c}»")

    # --- Segurança
    for r in data[SEGURANCA]:
        rid = r["ID"]
        for c in split_list(r["Containers"]):
            if not RE_CON_FULL.match(c):
                errors.append(f"## {SEGURANCA} {rid}: Containers deve listar CON-NN ou {DASH}: «{c}»")
        for t in split_list(r["Ameaça AS-IS"]):
            if not RE_THR.match(t):
                errors.append(f"## {SEGURANCA} {rid}: Ameaça AS-IS deve ser THR-... do threat-model ou {DASH}: «{t}»")

    # --- ADRs
    for r in data[ADRS]:
        rid = r["ID"]
        if r["Decisão"] == DASH:
            errors.append(f"## {ADRS} {rid}: «Decisão» não pode ser {DASH}")
        if r["Alternativas rejeitadas"] == DASH:
            warnings.append(f"{rid}: ADR sem alternativa rejeitada — registrar o que foi descartado "
                            f"e por quê, ou a decisão não é rastreável")
        for o in split_list(r["Origem"]):
            if not RE_RULE_FILE.match(o):
                errors.append(f"## {ADRS} {rid}: Origem deve citar o arquivo de rule "
                              f"(ex.: architecture.mdc) ou {DASH}: «{o}»")

    # --- Riscos
    for r in data[RISCOS]:
        rid = r["ID"]
        for a in split_list(r["Alvo"]):
            if not (RE_CON_FULL.match(a) or RE_INT_FULL.match(a) or RE_MOD.match(a)):
                errors.append(f"## {RISCOS} {rid}: Alvo deve ser CON-NN, INT-NN, MOD-XXX ou {DASH}: «{a}»")

    # --- Delta
    for r in data[DELTA]:
        comp = r["Componente AS-IS"]
        if r["Tipo"] not in TIPOS_DELTA:
            errors.append(f"## {DELTA} «{comp}»: Tipo deve ser {' | '.join(TIPOS_DELTA)}: «{r['Tipo']}»")
        for c in split_list(r["Destino TO-BE"]):
            if not RE_CON_FULL.match(c):
                errors.append(f"## {DELTA} «{comp}»: Destino TO-BE deve listar CON-NN ou {DASH}: «{c}»")
        if r["Tipo"] in ("mantém", "substitui", "absorve", "novo") and r["Destino TO-BE"] == DASH:
            warnings.append(f"delta «{comp}»: tipo «{r['Tipo']}» sem container de destino")


# --- fontes cruzadas --------------------------------------------------------

def load_modules(path):
    """Códigos MOD-XXX do modules.md (mesma leitura do check-modules.py), sem descontinuados."""
    text = read(path)
    row = re.compile(
        r"^\|\s*(MOD-[A-Za-z0-9\-]+)\s*\|\s*([^\|]*?)\s*\|\s*([^\|]*?)\s*\|.*?\|.*?\|.*?\|\s*([^\|]*?)\s*\|",
        re.MULTILINE)
    codes = []
    for m in row.finditer(text):
        code, name, status = m.group(1).strip(), m.group(2).strip(), (m.group(4).strip() or "ativo")
        if "exemplo" in code.lower() or is_placeholder(name):
            continue
        if status.lower().startswith("descontinuado"):
            continue
        if code not in codes:
            codes.append(code)
    return codes


def load_external_systems(path):
    """Coluna «Nome» da seção «Sistemas, integrações, contratos mencionados» do context-map."""
    text = blank_noise(read(path))
    m = re.search(r"^##\s+Sistemas,\s*integra[çc][õo]es[^\n]*$", text, re.MULTILINE | re.IGNORECASE)
    if not m:
        return None
    end = re.search(r"^##\s+", text[m.end():], re.MULTILINE)
    body = text[m.end():m.end() + end.start()] if end else text[m.end():]
    names, header_seen = [], False
    for line in body.splitlines():
        if not line.strip().startswith("|"):
            if header_seen:
                break
            continue
        cells = split_row(line)
        if not header_seen:
            header_seen = True
            continue  # cabeçalho
        if all(re.fullmatch(r":?-{2,}:?", c or "-") for c in cells):
            continue
        nome = cells[0] if cells else ""
        if is_placeholder(nome):
            continue
        if nome not in names:
            names.append(nome)
    return names


def load_rnfs_com_metrica(path):
    """RNFs de requirements.md que trazem medida numérica (RNF_HAS_MEASURE da spec-product)."""
    text = blank_noise(read(path))
    heads = list(re.finditer(r"^#{2,4}\s+(RNF-[A-Za-z0-9_.\-]+)\s*:", text, re.MULTILINE))
    out = []
    for i, h in enumerate(heads):
        rnf = h.group(1)
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        block = text[h.end():end]
        com_metrica = False
        for marker in ("Medida da resposta", "Valor alvo", "Métrica mensurável", "Indicador"):
            for mm in re.finditer(re.escape(marker), block):
                trecho = block[mm.end():mm.end() + 220]
                trecho = trecho.split("\n\n")[0]
                if re.search(r"\d", trecho):
                    com_metrica = True
                    break
            if com_metrica:
                break
        if com_metrica and rnf not in out:
            out.append(rnf)
    return out


def load_tech_decisions(tech_dir):
    """Decisões macro = uma por arquivo de rule do projeto (fora as rules-padrão fixas)."""
    if not os.path.isdir(tech_dir):
        return None
    out = []
    for fn in sorted(os.listdir(tech_dir)):
        if not fn.endswith((".mdc", ".md")):
            continue
        stem = os.path.splitext(fn)[0]
        if stem in RULES_SEM_ADR:
            continue
        out.append(fn)
    return out


def gate_modules(data, codes, errors):
    mapeados = {r["Módulo"] for r in data[DECOMPOSICAO]}
    faltando = [c for c in codes if c not in mapeados]
    for c in faltando:
        errors.append(f"MODULES_MAPPED: módulo «{c}» do modules.md não aparece em ## {DECOMPOSICAO} "
                      f"(mapear para um CON-NN ou declarar {NA} com justificativa)")
    return faltando


def gate_external(data, sistemas, errors):
    citados = [r["Sistema externo"] for r in data[INTEGRACOES]]
    citados_n = [norm(c) for c in citados if c != DASH]
    faltando = []
    for s in sistemas:
        n = norm(s)
        if not n:
            continue
        if any(n == c or (len(n) > 3 and n in c) or (len(c) > 3 and c in n) for c in citados_n):
            continue
        faltando.append(s)
    for s in faltando:
        errors.append(f"EXTERNAL_SYSTEMS_ADDRESSED: sistema externo «{s}» do context-map não tem "
                      f"linha INT-NN em ## {INTEGRACOES}")
    return faltando


def gate_nfr(data, rnfs, errors):
    cobertos = {r["RNF"] for r in data[TATICAS]}
    faltando = [r for r in rnfs if r not in cobertos]
    for r in faltando:
        errors.append(f"NFR_TACTICS_MAPPED: {r} tem métrica em requirements.md mas não aparece em "
                      f"## {TATICAS} (registrar a tática ou «Risco aceito — <motivo>»)")
    return faltando


def gate_adr(data, rules, warnings):
    texto = " ".join(" ".join(r.values()) for r in data[ADRS]).lower()
    faltando = []
    for fn in rules:
        stem = os.path.splitext(fn)[0].lower()
        if fn.lower() in texto or stem in texto:
            continue
        faltando.append(fn)
    if faltando:
        warnings.append("ADR_PER_DECISION: decisões macro das tech-rules sem ADR correspondente: "
                        + ", ".join(faltando))
    return faltando


# --- métricas ---------------------------------------------------------------

def compute_metrics(data, warnings, inventario, codes, sistemas, rnfs):
    citados = set()
    for r in data[DECOMPOSICAO]:
        citados.update(RE_CON.findall(r["Container"]))
    for section, col in ((INTEGRACOES, "Container"), (TATICAS, "Containers"),
                         (SEGURANCA, "Containers"), (FLUXOS, "Caminho"),
                         (DELTA, "Destino TO-BE"), (RISCOS, "Alvo")):
        for r in data[section]:
            citados.update(RE_CON.findall(r[col]))
    orfaos = sorted(inventario - citados)
    for c in orfaos:
        warnings.append(f"container órfão (no inventário, sem módulo, integração ou tática): {c}")

    risco_aceito = [r["RNF"] for r in data[TATICAS]
                    if r["Tática ou risco aceito"].lower().startswith("risco aceito")]
    sem_alternativa = [r["ID"] for r in data[ADRS] if r["Alternativas rejeitadas"] == DASH]
    assincronas = [r["ID"] for r in data[INTEGRACOES] if r["Estilo"] == "assíncrono"]

    m = {
        "total_containers": len(data[CONTAINERS]),
        "total_integracoes": len(data[INTEGRACOES]),
        "total_adrs": len(data[ADRS]),
        "total_riscos": len(data[RISCOS]),
        "total_taticas": len(data[TATICAS]),
        "containers_orfaos": orfaos,
        "rnf_com_risco_aceito": risco_aceito,
        "adrs_sem_alternativa": sem_alternativa,
        "integracoes_assincronas": assincronas,
        "spikes_sugeridos": len([r for r in data[RISCOS] if r["Spike sugerido"] != DASH]),
    }
    if codes is not None:
        mapeados = {r["Módulo"] for r in data[DECOMPOSICAO]}
        cobertos = [c for c in codes if c in mapeados]
        m["pct_modulos_mapeados"] = round(100.0 * len(cobertos) / len(codes), 1) if codes else 100.0
        m["modulos_na"] = sorted({r["Módulo"] for r in data[DECOMPOSICAO] if r["Container"] == NA})
    if sistemas is not None:
        total = len([s for s in sistemas if norm(s)])
        m["total_sistemas_externos"] = total
    if rnfs is not None:
        cobertos = [r for r in rnfs if r in {t["RNF"] for t in data[TATICAS]}]
        m["pct_rnf_com_tatica"] = round(100.0 * len(cobertos) / len(rnfs), 1) if rnfs else 100.0
    return m


# --- estruturas para --json -------------------------------------------------

def to_struct(data):
    return {
        "containers": [{"id": r["ID"], "nome": r["Nome"],
                        "responsabilidade": r["Responsabilidade"], "tecnologia": r["Tecnologia"]}
                       for r in data[CONTAINERS]],
        "decomposicao": [{"modulo": r["Módulo"], "container": r["Container"],
                          "papel": r["Papel no módulo"]}
                         for r in data[DECOMPOSICAO]],
        "integracoes": [{"id": r["ID"], "sistema": r["Sistema externo"],
                         "containers": split_list(r["Container"]), "direcao": r["Direção"],
                         "estilo": r["Estilo"], "protocolo": r["Protocolo"], "falha": r["Falha"]}
                        for r in data[INTEGRACOES]],
        "fluxos": [{"id": r["ID"], "flx": split_list(r["Fluxo"]), "caminho": r["Caminho"],
                    "nota": r["Nota"]} for r in data[FLUXOS]],
        "deployment": [{"ambiente": r["Ambiente"], "topologia": r["Topologia"],
                        "observacao": r["Observação"]} for r in data[DEPLOYMENT]],
        "taticas": [{"rnf": r["RNF"], "metrica": r["Métrica"], "tatica": r["Tática ou risco aceito"],
                     "containers": split_list(r["Containers"]), "justificativa": r["Justificativa"],
                     "riscoAceito": r["Tática ou risco aceito"].lower().startswith("risco aceito")}
                    for r in data[TATICAS]],
        "seguranca": [{"id": r["ID"], "fronteira": r["Fronteira"],
                       "containers": split_list(r["Containers"]), "controles": r["Controles"],
                       "ameacas": split_list(r["Ameaça AS-IS"])} for r in data[SEGURANCA]],
        "adrs": [{"id": r["ID"], "decisao": r["Decisão"], "contexto": r["Contexto"],
                  "alternativas": r["Alternativas rejeitadas"], "consequencias": r["Consequências"],
                  "origem": split_list(r["Origem"])} for r in data[ADRS]],
        "riscos": [{"id": r["ID"], "risco": r["Risco"], "impacto": r["Impacto"],
                    "spike": r["Spike sugerido"], "alvo": split_list(r["Alvo"])}
                   for r in data[RISCOS]],
        "delta": [{"asIs": r["Componente AS-IS"], "toBe": split_list(r["Destino TO-BE"]),
                   "tipo": r["Tipo"], "nota": r["Nota"]} for r in data[DELTA]],
    }


# --- main -------------------------------------------------------------------

def resolve_source(explicit, base, *candidates):
    """(caminho, obrigatório) — explícito vence; senão o primeiro candidato existente."""
    if explicit:
        return explicit, True
    for c in candidates:
        p = os.path.join(base, c)
        if os.path.exists(p):
            return p, False
    return None, False


def main():
    ap = argparse.ArgumentParser(
        description="Valida a gramática estrita do hld.md (containers, decomposição, integrações, "
                    "táticas por RNF, ADRs).",
        epilog="Exit codes: 0 ok · 1 erro de gramática/gate FATAL · 2 arquivo não encontrado.")
    ap.add_argument("path", nargs="?", default="outputs/spec/hld.md",
                    help="caminho do hld.md (default: outputs/spec/hld.md)")
    ap.add_argument("--json", action="store_true", dest="as_json",
                    help="imprime estrutura + métricas + gates em JSON no stdout (não grava arquivo)")
    ap.add_argument("--modules", help="modules.md (default: ao lado do hld.md)")
    ap.add_argument("--context-map", dest="context_map", help="context-map.md (default: ao lado do hld.md)")
    ap.add_argument("--requirements", help="requirements.md (default: requirements/requirements.md ao lado)")
    ap.add_argument("--tech-rules", dest="tech_rules", help="diretório das rules (default: tech-rules/ ao lado)")
    ap.add_argument("--architecture", help="architecture.md do AS-IS (default: ao lado do hld.md)")
    ap.add_argument("--no-cross", action="store_true", dest="no_cross",
                    help="desliga todas as fontes cruzadas — valida só a gramática")
    ap.add_argument("--strict", action="store_true", help="avisos viram erros (exit 1)")
    args = ap.parse_args()

    if not os.path.exists(args.path):
        print(f"ERRO: arquivo não encontrado: {args.path}", file=sys.stderr)
        sys.exit(2)

    base = os.path.dirname(os.path.abspath(args.path))
    errors, warnings = [], []
    gates = {}

    raw = read(args.path)
    text = blank_noise(raw)
    modo, contexto = parse_meta(text)

    data, parsed_ok, presentes = parse_document(text, modo, errors)
    check_ids(data, errors)
    inventario = {r["ID"] for r in data[CONTAINERS] if RE_CON_FULL.match(r.get("ID", ""))}
    ok_containers = check_containers_refs(raw, inventario, errors)
    gates["CONTAINERS_CONSISTENT"] = "OK" if ok_containers else "FALHOU"
    check_fields(data, errors, warnings)

    codes = sistemas = rnfs = rules = None
    if not args.no_cross:
        for flag, label in ((args.modules, "modules"), (args.context_map, "context-map"),
                            (args.requirements, "requirements"), (args.architecture, "architecture")):
            if flag and not os.path.exists(flag):
                print(f"ERRO: {label} não encontrado: {flag}", file=sys.stderr)
                sys.exit(2)
        if args.tech_rules and not os.path.isdir(args.tech_rules):
            print(f"ERRO: diretório de rules não encontrado: {args.tech_rules}", file=sys.stderr)
            sys.exit(2)

        p_mod, _ = resolve_source(args.modules, base, "modules.md")
        p_ctx, _ = resolve_source(args.context_map, base, "context-map.md")
        p_req, _ = resolve_source(args.requirements, base,
                                  os.path.join("requirements", "requirements.md"), "requirements.md")
        p_rules = args.tech_rules or (os.path.join(base, "tech-rules")
                                      if os.path.isdir(os.path.join(base, "tech-rules")) else None)

        # MODULES_MAPPED
        if p_mod:
            try:
                codes = load_modules(p_mod)
                if not codes:
                    warnings.append("modules.md sem nenhum MOD-XXX legível (tabela do catálogo fora do "
                                    "formato?) — MODULES_MAPPED passou sem nada para conferir")
                faltando = gate_modules(data, codes, errors)
                gates["MODULES_MAPPED"] = "OK" if not faltando else "FALHOU"
            except (ValueError, OSError) as exc:
                warnings.append(f"modules.md ilegível ({exc}) — MODULES_MAPPED não verificado")
                gates["MODULES_MAPPED"] = "N/A (fonte ilegível)"
        else:
            warnings.append("modules.md não encontrado — MODULES_MAPPED não verificado")
            gates["MODULES_MAPPED"] = "N/A (fonte ausente)"

        # EXTERNAL_SYSTEMS_ADDRESSED
        if p_ctx:
            try:
                sistemas = load_external_systems(p_ctx)
            except (ValueError, OSError) as exc:
                sistemas = None
                warnings.append(f"context-map.md ilegível ({exc}) — EXTERNAL_SYSTEMS_ADDRESSED não verificado")
            if sistemas is None:
                warnings.append("context-map.md sem a seção «Sistemas, integrações, contratos mencionados» "
                                "— EXTERNAL_SYSTEMS_ADDRESSED não verificado")
                gates["EXTERNAL_SYSTEMS_ADDRESSED"] = "N/A (seção ausente)"
            else:
                if not sistemas:
                    warnings.append("context-map.md sem nenhum sistema externo na tabela «Sistemas, "
                                    "integrações, contratos mencionados» — EXTERNAL_SYSTEMS_ADDRESSED "
                                    "passou sem nada para conferir")
                faltando = gate_external(data, sistemas, errors)
                gates["EXTERNAL_SYSTEMS_ADDRESSED"] = "OK" if not faltando else "FALHOU"
        else:
            warnings.append("context-map.md não encontrado — EXTERNAL_SYSTEMS_ADDRESSED não verificado")
            gates["EXTERNAL_SYSTEMS_ADDRESSED"] = "N/A (fonte ausente)"

        # NFR_TACTICS_MAPPED
        if p_req:
            try:
                rnfs = load_rnfs_com_metrica(p_req)
                if not rnfs:
                    warnings.append("requirements.md sem nenhum RNF com medida numérica (cabeçalho "
                                    "«### RNF-...» ausente?) — NFR_TACTICS_MAPPED passou sem nada "
                                    "para conferir")
                faltando = gate_nfr(data, rnfs, errors)
                gates["NFR_TACTICS_MAPPED"] = "OK" if not faltando else "FALHOU"
            except (ValueError, OSError) as exc:
                warnings.append(f"requirements.md ilegível ({exc}) — NFR_TACTICS_MAPPED não verificado")
                gates["NFR_TACTICS_MAPPED"] = "N/A (fonte ilegível)"
        else:
            warnings.append("requirements.md não encontrado — NFR_TACTICS_MAPPED não verificado")
            gates["NFR_TACTICS_MAPPED"] = "N/A (fonte ausente)"

        # ADR_PER_DECISION (WARNING)
        rules = load_tech_decisions(p_rules) if p_rules else None
        if rules is None:
            warnings.append("diretório tech-rules/ não encontrado — ADR_PER_DECISION não verificado")
            gates["ADR_PER_DECISION"] = "N/A (fonte ausente)"
        else:
            faltando = gate_adr(data, rules, warnings)
            gates["ADR_PER_DECISION"] = "OK" if not faltando else "AVISO"
    else:
        for g in ("MODULES_MAPPED", "EXTERNAL_SYSTEMS_ADDRESSED", "NFR_TACTICS_MAPPED", "ADR_PER_DECISION"):
            gates[g] = "N/A (--no-cross)"

    # ASIS_DELTA_PRESENT (WARNING, brownfield)
    if contexto == "brownfield":
        if DELTA in presentes and data[DELTA]:
            gates["ASIS_DELTA_PRESENT"] = "OK"
        else:
            warnings.append(f"ASIS_DELTA_PRESENT: contexto brownfield sem ## {DELTA} preenchido — "
                            f"declarar o destino de cada componente do architecture.md")
            gates["ASIS_DELTA_PRESENT"] = "AVISO"
    else:
        gates["ASIS_DELTA_PRESENT"] = "N/A (greenfield)"

    # COMPACT_MODE_DECLARED (WARNING)
    if modo == "compacto":
        warnings.append("COMPACT_MODE_DECLARED: HLD em modo compacto — registrar a degradação no "
                        "sync-log (`HLD_COMPACT: <motivo>`) e o que ficou de fora")
        gates["COMPACT_MODE_DECLARED"] = "AVISO"
    else:
        gates["COMPACT_MODE_DECLARED"] = "N/A (modo completo)"

    metrics = compute_metrics(data, warnings, inventario, codes, sistemas, rnfs)

    if args.strict and warnings:
        errors.extend(f"[strict] {w}" for w in warnings)
        warnings = []

    ok = not errors
    if args.as_json:
        out = {"ok": ok, "file": args.path, "modo": modo, "contexto": contexto}
        out.update(to_struct(data))
        out.update({"gates": gates, "metricas": metrics, "erros": errors, "avisos": warnings})
        print(json.dumps(out, ensure_ascii=False, indent=2))
        sys.exit(0 if ok else 1)

    for e in errors:
        print(f"ERRO: {e}")
    for w in warnings:
        print(f"AVISO: {w}")
    print("GATES:")
    for g in ("MODULES_MAPPED", "EXTERNAL_SYSTEMS_ADDRESSED", "NFR_TACTICS_MAPPED",
              "CONTAINERS_CONSISTENT", "ADR_PER_DECISION", "ASIS_DELTA_PRESENT",
              "COMPACT_MODE_DECLARED"):
        print(f"  {g}: {gates.get(g, 'N/A')}")
    print("MÉTRICAS:")
    print(f"  modo={modo} contexto={contexto}")
    print(f"  containers={metrics['total_containers']} integrações={metrics['total_integracoes']} "
          f"táticas={metrics['total_taticas']} ADRs={metrics['total_adrs']} riscos={metrics['total_riscos']}")
    if "pct_modulos_mapeados" in metrics:
        print(f"  % módulos mapeados: {metrics['pct_modulos_mapeados']}% "
              f"(N/A justificado: {', '.join(metrics['modulos_na']) or 'nenhum'})")
    if "pct_rnf_com_tatica" in metrics:
        print(f"  % RNF com métrica cobertos: {metrics['pct_rnf_com_tatica']}%")
    print(f"  containers órfãos: {', '.join(metrics['containers_orfaos']) or 'nenhum'}")
    print(f"  RNF com risco aceito: {', '.join(metrics['rnf_com_risco_aceito']) or 'nenhum'}")
    print(f"  integrações assíncronas: {', '.join(metrics['integracoes_assincronas']) or 'nenhuma'}")
    print(f"  spikes sugeridos: {metrics['spikes_sugeridos']}")
    print(f"RESULTADO: {'OK' if ok else 'FALHOU'} ({len(errors)} erro(s), {len(warnings)} aviso(s))")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
