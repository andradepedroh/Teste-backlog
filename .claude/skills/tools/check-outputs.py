#!/usr/bin/env python3
"""
check-outputs.py — Verificador de artefatos do fluxo spec (discovery + pipeline técnico)

Uso (caminho relativo ao SKILL.md que invoca — ver references/paths.md):
  python3 ../tools/check-outputs.py [caminho_outputs]
  python3 ../tools/check-outputs.py              (usa ./outputs/spec por padrão)
  python3 ../tools/check-outputs.py --pipeline   (verifica também cadeia técnica)
  python3 ../tools/check-outputs.py . --pipeline (pasta explícita + pipeline)

Flags:
  --pipeline   Verificar adicionalmente os artefatos da cadeia técnica
               (spec-hld, spec-data-model, spec-api-contracts, spec-tasks, spec-tasks-html).
               Ativado também por SPEC_CHECK_PIPELINE=1.
               Não falha o script em projetos só de discovery — é informativo.

Obrigatoriedade condicional (campo estruturado, nunca substring da nota):
  - `legacy.md`, `architecture.md`, `legacy-analysis.md`, `threat-model.md` só são
    obrigatórios quando o kickoff declarou legado — linha `kickoff: legado=Sim|Parcial`
    na Seção A do `sync-log.md`. Com `legado=Não` (ou o marcador `LEGACY_SKIPPED`) os
    quatro ficam «não se aplica» (⬜) e um greenfield completo sai com exit 0.
    Sem a linha de kickoff a condição fica indeterminada: avisa, não conta como falta.
  - `flow-map.md` só é obrigatório com UI — `FLOWMAP_SKIPPED` no sync-log libera,
    e `FLOWMAP_VALID` (produto COM UI) tem precedência sobre ele.

DOCUMENTAÇÃO NÃO É DECLARAÇÃO (`declaration_scope()`) — antes de qualquer casamento o
texto do sync-log é saneado, porque o template canônico DOCUMENTA os dois marcadores e
`spec/SKILL.md` manda criar o sync-log do projeto A PARTIR DELE: sem saneamento todo
projeto nascia com `LEGACY_SKIPPED` e `FLOWMAP_SKIPPED` «declarados» e o gate `COND_UI`
desligado incondicionalmente. Três camadas, cada uma bastaria para os casos conhecidos —
juntas fecham a CLASSE «documentar o marcador liga o marcador»:
  1. blocos de código são removidos (cercados ``` / ~~~ **e** indentados por 4 espaços);
  2. linhas ainda com placeholder de data do template (`YYYY-MM-DD`, `HH:MM`) são
     descartadas — a linha de exemplo da Seção A não é registro de execução;
  3. o marcador só vale com **`motivo=` preenchido de verdade**: `motivo=<…>` e
     `motivo=<API pura|batch|worker>` são placeholders (mesma regra do
     `KICKOFF_LEGACY_RE`), e em célula de tabela a coluna tem de ser a canônica
     «Modo / contexto» — nunca uma coluna de documentação/anti-padrão («Marcador»,
     «Não fazer», «Exemplo»…).

Precedência das declarações no `sync-log.md` (`legacy_declared()` / `flowmap_skipped()`):
  1. `kickoff: legado=<Sim|Parcial|Não>` — declaração ESTRUTURADA, vence tudo;
     no eixo da UI o análogo é `FLOWMAP_VALID:` (só a `spec-product` escreve, e só
     quando o produto TEM UI), que vence o `FLOWMAP_SKIPPED`;
  2. `kickoff: … sem legado …` — variante em prosa do template;
  3. `LEGACY_SKIPPED` / `FLOWMAP_SKIPPED` — só em **posição canônica**: linha própria
     OU célula da coluna «Modo / contexto» de tabela (a Seção A do `sync-log.md` é uma
     tabela Markdown, e é ali que o kit realmente escreve o marcador). Em ambas as
     formas o marcador ABRE a posição, opcionalmente em bullet/`código`/**negrito**,
     seguido de `:`/`=`/travessão + `motivo=<preenchido>`. Substring em prosa NUNCA
     vale: um sync-log com `kickoff: legado=Sim` e a frase «o marcador LEGACY_SKIPPED
     não se aplica aqui» sai com exit 1, dentro ou fora de célula. O kit escreve esses
     códigos em prosa (`spec-product/SKILL.md`, `spec-iterate/SKILL.md`) e em tabela de
     documentação (`spec-iterate/templates/sync-log.md`), então o copiar/colar — e o
     próprio template — eram vetor real.

Modular (opcional): definir SPEC_CHECK_MODULAR=1 ou incluir no topo de requirements.md
o comentário HTML <!-- spec-check-modular: on --> para avisar se faltar índice modular
ou secções ## Módulo: (avisos apenas; não altera exit code).
"""

import os
import re
import sys
import unicodedata
from pathlib import Path
from datetime import datetime

# O relatório usa ⚠ ✅ ❌ ⬜ 📂 e travessão. No Windows o stdout nasce em cp1252 e
# qualquer um desses caracteres aborta o script com UnicodeEncodeError — justamente
# no gate que `spec/SKILL.md` manda executar. Mesmo guard do `check-flowmap.py`.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

# Opt-in modular depth check for requirements.md (warning only).
MODULAR_FLAG_COMMENT = re.compile(r"spec-check-modular:\s*on", re.IGNORECASE)
MODULAR_INDEX_HEADING = re.compile(r"^##\s+Índice de módulos", re.MULTILINE)
MODULAR_SECTION_HEADING = re.compile(r"^##\s+Módulo:", re.MULTILINE)

# --- Configuração -----------------------------------------------------------

OUTPUTS_DEFAULT = Path("outputs/spec")
PIPELINE_OUTPUTS_DEFAULT = Path("outputs/spec")

# --- Níveis de obrigatoriedade (CAMPO ESTRUTURADO) --------------------------
# Nunca inferir obrigatoriedade por substring da nota: `"obrigatório" in note` casava
# com "obrigatório se há legado" e fazia todo projeto greenfield sair com exit 1.
REQUIRED = "required"          # obrigatório sempre
OPTIONAL = "optional"          # nunca conta como falta
COND_LEGACY = "cond:legacy"    # obrigatório só quando o kickoff declara legado
COND_UI = "cond:ui"            # obrigatório só quando o produto tem UI

# Cada item: (caminho relativo, nível estruturado, nota exibida)
ARTIFACTS = {
    "spec-frame (opcional)": [
        ("frame.md",              OPTIONAL, "opcional — Fase 1; enquadramento antes da ingestão"),
    ],
    "spec-ingest": [
        ("context-map.md",        REQUIRED, "obrigatório"),
        ("discovery-document.md", REQUIRED, "obrigatório"),
    ],
    "spec-legacy (quando há legado)": [
        ("legacy.md",             COND_LEGACY, "obrigatório se há legado"),
        ("architecture.md",       COND_LEGACY, "obrigatório se há legado"),
        ("legacy-analysis.md",    COND_LEGACY, "obrigatório se há legado"),
        ("threat-model.md",       COND_LEGACY, "obrigatório se há legado"),
    ],
    "spec-benchmark": [
        ("benchmark.md",          REQUIRED, "obrigatório"),
    ],
    "spec-product": [
        ("product-vision/product-vision.md",             REQUIRED, "obrigatório"),
        ("business-rules.md",                            REQUIRED, "obrigatório"),
        ("requirements/requirements.md",                 REQUIRED, "obrigatório"),
        ("product-requirements/product-requirements.md", REQUIRED, "obrigatório"),
        ("modules.md",                                   OPTIONAL, "opcional — registro canônico de módulos"),
        ("flow-map.md",                                  COND_UI,  "obrigatório quando o produto tem UI (gate FLOWMAP_VALID) — ausente só com FLOWMAP_SKIPPED no sync-log"),
    ],
    "spec-prototype (opcional)": [
        ("prototype.md",          OPTIONAL, "opcional"),
        ("frontend-decisions.md", OPTIONAL, "opcional — só se frontend.mdc ausente"),
        ("design-system.md",      OPTIONAL, "opcional — só quando não há design system prévio"),
        ("screens-manifest.json", OPTIONAL, "opcional — contrato de colheita (gate WARNING SCREENS_MANIFEST_EMITTED)"),
    ],
    "spec-iterate": [
        ("gaps.md",               REQUIRED, "obrigatório"),
        ("gaps-answers.md",       OPTIONAL, "gerado pelo consultor após Relatório de Revisão"),
        ("sync-log.md",           REQUIRED, "obrigatório"),
    ],
    "spec-test-plan (opcional)": [
        ("test-plan.md",          OPTIONAL, "opcional — Fase 8a"),
    ],
    "spec-security-review (opcional)": [
        ("security-review.md",    OPTIONAL, "opcional — Fase 8b"),
    ],
    "spec-estimate (opcional)": [
        ("estimate/estimate-report.md", OPTIONAL, "opcional — Fase 8.5"),
    ],
    "spec-report (opcional)": [
        ("capa.md",                           OPTIONAL, "opcional"),
        ("report/product-discovery-kit.html", OPTIONAL, "opcional"),
    ],
    "spec-code-audit (opcional)": [
        ("code-audit.md", OPTIONAL, "opcional — Fase 12"),
    ],
}

# Artefatos da cadeia técnica (spec-hld → spec-tasks-azure)
PIPELINE_ARTIFACTS = {
    "spec-hld": [
        ("hld.md",                        OPTIONAL, "opcional — Fase 6.6; gate HLD_VALID via check-hld.py"),
    ],
    "spec-data-model": [
        ("data-model.json",               OPTIONAL, "opcional — Fase 7a"),
    ],
    "spec-api-contracts": [
        ("api-contracts.yaml",            OPTIONAL, "opcional — Fase 7b"),
        ("api-contracts-supplement.json", OPTIONAL, "opcional — Fase 7b"),
    ],
    "spec-tasks": [
        ("tasks.json",                    REQUIRED, "obrigatório na cadeia técnica"),
        ("gaps-document.md",              OPTIONAL, "opcional"),
    ],
    "spec-tasks-html": [
        ("report/tasks.html",             OPTIONAL, "opcional"),
    ],
}

# Dimensões mínimas esperadas em artefatos grandes (linhas)
MIN_LINES = {
    "context-map.md":           30,
    "discovery-document.md":    40,
    "legacy.md":                80,
    "benchmark.md":             50,
    "business-rules.md":        20,
    "requirements/requirements.md": 40,
    "flow-map.md":              20,
    "gaps.md":                  10,
}

MIN_PIPELINE_LINES = {
    "tasks.json":               50,
    "data-model.json":          20,
    "hld.md":                   25,
}

# ---------------------------------------------------------------------------


def check_file(base: Path, rel: str, note: str, min_lines_map: dict | None = None,
               required: bool = False) -> dict:
    if min_lines_map is None:
        min_lines_map = MIN_LINES
    full = base / rel
    exists = full.exists()
    lines = 0
    size = 0
    mtime = None
    if exists:
        size = full.stat().st_size
        try:
            lines = sum(1 for _ in full.open("r", encoding="utf-8", errors="ignore"))
        except Exception:
            lines = 0
        mtime = datetime.fromtimestamp(full.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
    min_l = min_lines_map.get(rel, 0)
    thin = exists and min_l > 0 and lines < min_l
    return {
        "rel": rel,
        "note": note,
        "required": required,
        "exists": exists,
        "lines": lines,
        "size": size,
        "mtime": mtime,
        "thin": thin,
        "min_lines": min_l,
    }


def status_icon(info: dict) -> str:
    if not info["exists"]:
        return "❌" if info["required"] else "⬜"
    if info["thin"]:
        return "⚠️ "
    return "✅"


# --- Resolução das condicionais ---------------------------------------------
# Mesma mecânica do escape hatch já existente do flow-map (`FLOWMAP_SKIPPED` no
# sync-log): a condição é lida de um marcador estruturado, nunca adivinhada.

# Linha canônica do kickoff do orquestrador (spec/SKILL.md, gate KICKOFF_PERSISTED):
#   kickoff: legado=<Sim|Parcial|Não> · ramo=… · ambiente=… · inputs=…
KICKOFF_LEGACY_RE = re.compile(r"kickoff:[^\n]*?legado\s*=\s*([^\s·|,;]+)", re.IGNORECASE)
# Variante em prosa usada pelo template do sync-log ("kickoff: sem legado · 3 transcrições…").
KICKOFF_NO_LEGACY_PROSE_RE = re.compile(r"kickoff:[^\n]*?sem legado", re.IGNORECASE)
# O `kickoff:` também só declara em POSIÇÃO CANÔNICA — mesma classe de defeito dos
# marcadores de skip: o template do sync-log e o `spec-legacy/SKILL.md` DOCUMENTAM a
# regra em prosa («e `kickoff: legado=Sim|Parcial` tem precedência sobre `LEGACY_SKIPPED`»)
# e o `KICKOFF_LEGACY_RE` solto no arquivo inteiro lia essa frase como declaração,
# tornando os 4 artefatos do AS-IS obrigatórios em todo projeto criado a partir do
# template. Ver `_kickoff_fragments()`.
KICKOFF_OPEN_RE = re.compile(
    r"^[ \t]*(?:[>*\-+][ \t]*)*[`*_]{0,3}kickoff[`*_]{0,3}[ \t]*:", re.IGNORECASE
)


def _strip_accents(value: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn"
    )


# --- Camada 1: blocos de código não são declaração --------------------------
# GÊMEO de `check-residues.py:strip_code_blocks` — as duas cópias são idênticas de
# propósito (cada script tem de rodar sozinho em qualquer espelho, sem importar o irmão);
# divergir foi o que deixou este arquivo casar o exemplo dentro de ``` do template.
_FENCE_OPEN_RE = re.compile(r"^[ \t]{0,3}(`{3,}|~{3,})")
_INDENTED_CODE_RE = re.compile(r"^(?: {4}|\t)")


def strip_code_blocks(text: str) -> str:
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


# --- Camada 2: linha ainda no placeholder do template não é registro --------
# `| 1 | YYYY-MM-DD HH:MM | spec-ingest | kickoff: sem legado · … |` é a linha de EXEMPLO
# da Seção A do template. Copiada para o projeto sem edição, ela declarava «sem legado»
# (e, com o marcador na célula, desligava gates) sem ninguém ter decidido nada.
TEMPLATE_DATE_PLACEHOLDER_RE = re.compile(r"\bYYYY[-/]MM[-/]DD\b|\bAAAA[-/]MM[-/]DD\b|\bHH:MM\b",
                                          re.IGNORECASE)


def _is_template_row(line: str) -> bool:
    """A linha é um registro-exemplo do template (placeholder na coluna Data/Hora)?

    O placeholder só desqualifica a linha quando está na **coluna de data/hora** — em
    linha de tabela, a 2ª célula. Casar em qualquer ponto da linha apagava registros
    legítimos: um produto batch com `FLOWMAP_SKIPPED` e «execução diária HH:MM» noutra
    célula da mesma linha perdia o marcador e reprovava por engano.
    """
    if "|" in line:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        target = cells[1] if len(cells) > 1 else ""
        return bool(TEMPLATE_DATE_PLACEHOLDER_RE.search(target))
    return bool(TEMPLATE_DATE_PLACEHOLDER_RE.search(line))


def blank_template_lines(text: str) -> str:
    """Descarta linhas que ainda trazem o placeholder de data/hora do template."""
    return "\n".join(
        "" if _is_template_row(line) else line
        for line in text.split("\n")
    )


def declaration_scope(text: str) -> str:
    """Texto do sync-log reduzido ao que pode ser lido como DECLARAÇÃO. Idempotente."""
    return blank_template_lines(strip_code_blocks(text))


# --- Tabelas Markdown: célula + cabeçalho da SUA coluna ----------------------
_TABLE_ROW_RE = re.compile(r"^[ \t]{0,3}\|")
_CELL_SPLIT_RE = re.compile(r"(?<!\\)\|")
_DELIM_CELL_RE = re.compile(r"^:?-{2,}:?$")


def _split_row(line: str) -> list:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    return [c.strip() for c in _CELL_SPLIT_RE.split(s)]


def _is_delimiter_row(line: str) -> bool:
    cells = _split_row(line)
    return bool(cells) and all(_DELIM_CELL_RE.match(c) for c in cells)


def iter_table_data_cells(text: str):
    """Gera `(cabeçalho_da_coluna, célula)` de cada linha de DADOS de tabela Markdown.

    Sem o cabeçalho não dá para distinguir a coluna «Modo / contexto» da Seção A (onde o
    marcador declara) da coluna «Marcador» da tabela que DOCUMENTA os marcadores no
    próprio template — as duas são «uma célula aberta pelo marcador».
    """
    lines = text.split("\n")
    i = 0
    n = len(lines)
    while i < n:
        if (_TABLE_ROW_RE.match(lines[i]) and i + 1 < n
                and _is_delimiter_row(lines[i + 1])):
            headers = _split_row(lines[i])
            j = i + 2
            while j < n and _TABLE_ROW_RE.match(lines[j]) and not _is_delimiter_row(lines[j]):
                for idx, cell in enumerate(_split_row(lines[j])):
                    yield (headers[idx] if idx < len(headers) else ""), cell
                j += 1
            i = j
        else:
            i += 1


# Coluna onde o marcador DECLARA (Seção A do sync-log) …
CANONICAL_MARKER_COLUMN_RE = re.compile(r"\bmodo\b|\bcontexto\b", re.IGNORECASE)
# … e colunas que só DOCUMENTAM/CONTRAEXEMPLIFICAM o marcador (vencem a lista acima).
DOC_MARKER_COLUMN_RE = re.compile(
    r"marcador|anti-?padr|nao[ -]fazer|nao[ -]faca|nunca|errado|evitar|incorret|"
    r"proibid|contraexemplo|exemplo|formato|sintaxe|quem escreve|efeito|quando",
    re.IGNORECASE,
)


def _column_declares(header: str) -> bool:
    norm = _strip_accents(header).strip().strip("`*_ ").lower()
    if not norm or DOC_MARKER_COLUMN_RE.search(norm):
        return False
    return bool(CANONICAL_MARKER_COLUMN_RE.search(norm))


# --- Camada 3: o marcador só vale com valor REAL ----------------------------
MARKER_KEYVAL_RE = re.compile(r"([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*([^\s·|,;]+)")


def _payload_declares(payload: str, required_key: str | None) -> bool:
    """O payload do marcador traz `chave=valor` PREENCHIDO (nunca placeholder)?

    Mesma regra do `KICKOFF_LEGACY_RE` em `legacy_declared()`: valor que abre com `<`
    ou traz `|` (alternação `<API pura|batch|worker>`) é placeholder do template e não
    declara nada. É esta camada que impede a tabela «Marcadores de skip» do template
    canônico — `motivo=<…>` / `motivo=<API pura\\|batch\\|worker>` — de desligar gates.
    """
    if not payload:
        return False
    for key, raw in MARKER_KEYVAL_RE.findall(payload):
        if required_key and _strip_accents(key).lower() != required_key:
            continue
        value = raw.strip().strip("`*_")
        if value and not value.startswith("<") and "|" not in value:
            return True
    return False


def _marker_matcher(marker: str, required_key: str | None = "motivo"):
    """Marcador aceito só como DECLARAÇÃO — nunca como prosa, exemplo ou documentação.

    O marcador desliga (ou liga) gates; casá-lo em qualquer posição do arquivo
    transforma texto narrativo em decisão silenciosa. Prosa com esses códigos existe no
    próprio kit (`spec-product/SKILL.md`, `spec-iterate/SKILL.md`) e — pior — o template
    de onde todo `sync-log.md` nasce (`spec-iterate/templates/sync-log.md`) tem uma
    TABELA que os documenta e um exemplo dentro de ```.

    DUAS posições canônicas — em ambas o marcador **abre** a posição e vem seguido de
    `:`/`=`/travessão + `motivo=` PREENCHIDO:

    (a) LINHA PRÓPRIA
        FLOWMAP_SKIPPED: motivo=API pura · justificativa=sem qualquer tela
        - `LEGACY_SKIPPED: motivo=greenfield`     (bullet / código / negrito / citação)
        **LEGACY_SKIPPED** — motivo=greenfield

    (b) CÉLULA DA COLUNA «Modo / contexto» — a Seção A do `sync-log.md` é uma tabela
        Markdown e é ali que o kit escreve o marcador. Aceitar só a forma (a) fazia o
        gate reprovar (exit 1) um projeto legitimamente sem legado/sem UI que registrou
        o marcador onde o próprio template manda escrever.
            | 3 | 2026-07-30 10:00 | spec-legacy | LEGACY_SKIPPED: motivo=greenfield | … |
        A coluna é conferida pelo CABEÇALHO: célula da coluna «Marcador» (a tabela de
        documentação) ou de uma coluna «anti-padrão / não fazer» NÃO declara.

    Recusado: «o marcador LEGACY_SKIPPED não se aplica aqui» (meio da frase), o mesmo
    dentro de célula, dentro de ``` ou de bloco indentado, e qualquer forma com
    `motivo=<…>`.

    Devolve um predicado `(texto) -> bool`.
    """
    lead = r"(?:[>*\-+][ \t]*)*"                              # bullet / citação
    core = r"[`*_]{0,3}" + re.escape(marker) + r"[`*_]{0,3}"  # `código` / **negrito**
    payload_re = re.compile(
        r"^[ \t]*" + lead + core + r"[ \t]*(?:[:=]|[—–-][ \t]+)(?P<payload>.*)$",
        re.IGNORECASE,
    )

    def _declares(fragment: str) -> bool:
        m = payload_re.match(fragment)
        return bool(m) and _payload_declares(m.group("payload"), required_key)

    def matches(text: str) -> bool:
        scope = declaration_scope(text)
        for line in scope.split("\n"):
            if _TABLE_ROW_RE.match(line):
                continue          # linha de tabela: só vale pela célula + cabeçalho
            if _declares(line):
                return True
        for header, cell in iter_table_data_cells(scope):
            if _column_declares(header) and _declares(cell):
                return True
        return False

    matches.payload_re = payload_re      # exposto para teste/depuração
    matches.declares_fragment = _declares
    return matches


legacy_skipped_declared = _marker_matcher("LEGACY_SKIPPED")
flowmap_skipped_declared = _marker_matcher("FLOWMAP_SKIPPED")
# Sinal de que o produto TEM UI: só a `spec-product` escreve `FLOWMAP_VALID:` (Passo 4.7,
# gate homônimo) e só quando gerou o `flow-map.md`. Aqui ele é o análogo do
# `kickoff: legado=…` no eixo da UI — a declaração estruturada que vence o marcador de
# skip. `required_key=None`: as chaves variam (`etapas_com_tela=…` / `modo=…`), o que
# importa é haver pelo menos uma preenchida (não-placeholder).
flowmap_valid_declared = _marker_matcher("FLOWMAP_VALID", required_key=None)


def _kickoff_fragments(text: str):
    """Fragmentos do sync-log que valem como declaração de kickoff.

    Duas posições, simétricas às dos marcadores de skip:
      - LINHA PRÓPRIA que **abre** com `kickoff:` (bullet/`código`/**negrito** aceitos);
      - CÉLULA da coluna «Modo / contexto» que mencione `kickoff:` em qualquer ponto —
        a coluna já é posição canônica, e é onde o template escreve
        `kickoff: sem legado · 3 transcrições…`.
    Fora disso é prosa: a frase «`kickoff: legado=Sim|Parcial` tem precedência sobre
    `LEGACY_SKIPPED`» existe no template do sync-log e no `spec-legacy/SKILL.md`, e era
    lida como se o projeto tivesse declarado legado.
    """
    scope = declaration_scope(text)
    for line in scope.split("\n"):
        if _TABLE_ROW_RE.match(line):
            continue
        if KICKOFF_OPEN_RE.match(line):
            yield line
    for header, cell in iter_table_data_cells(scope):
        if _column_declares(header) and "kickoff" in cell.lower():
            yield cell


_SYNC_CACHE: dict[str, str] = {}
_SYNC_SCOPE_CACHE: dict[str, str] = {}


def sync_log_text(base: Path) -> str:
    """Conteúdo CRU do `sync-log.md` (para inspeção); as decisões usam o saneado."""
    key = str(base)
    if key not in _SYNC_CACHE:
        sync = base / "sync-log.md"
        text = ""
        if sync.exists():
            try:
                text = sync.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                text = ""
        _SYNC_CACHE[key] = text
    return _SYNC_CACHE[key]


def sync_log_declarations(base: Path) -> str:
    """`sync-log.md` reduzido ao que conta como declaração (ver `declaration_scope`)."""
    key = str(base)
    if key not in _SYNC_SCOPE_CACHE:
        _SYNC_SCOPE_CACHE[key] = declaration_scope(sync_log_text(base))
    return _SYNC_SCOPE_CACHE[key]


def legacy_declared(base: Path):
    """O projeto declarou legado?

    True  → kickoff `legado=Sim|Parcial` (os 4 artefatos do AS-IS são obrigatórios);
    False → kickoff `legado=Não`/«sem legado» ou `LEGACY_SKIPPED` em posição canônica;
    None  → indeterminado (sem sync-log, sem declaração, ou ainda no placeholder
            `<Sim|Parcial|Não>` do template) → não conta como falta, só avisa.

    PRECEDÊNCIA (explícita e nesta ordem — o inverso desligava os 4 gates de legado
    de um projeto que declarou `legado=Sim`, bastando a string `LEGACY_SKIPPED`
    aparecer em qualquer prosa do arquivo):
      1. `kickoff: legado=<valor>` — declaração ESTRUTURADA do orquestrador, vence
         tudo. Só cede quando o valor ainda é o placeholder do template.
      2. `kickoff: … sem legado …` — variante em prosa do próprio template.
      3. `LEGACY_SKIPPED` em **posição canônica** (ver `_marker_matcher`): linha própria
         ou célula da coluna «Modo / contexto», sempre com `motivo=` preenchido — escape
         hatch de último recurso, nunca substring no meio de uma frase nem exemplo de
         template/documentação.

    Os três níveis leem o MESMO escopo saneado (`declaration_scope`) e só em posição
    canônica (`_kickoff_fragments` / `_marker_matcher`): documentação sobre a regra não
    é a regra.
    """
    text = sync_log_declarations(base)
    if not text.strip():
        return None

    fragments = list(_kickoff_fragments(text))

    # 1 — declaração estruturada do kickoff tem precedência sobre o marcador de skip.
    for fragment in fragments:
        m = KICKOFF_LEGACY_RE.search(fragment)
        if not m:
            continue
        raw = m.group(1).strip().strip("`*")
        if raw.startswith("<") or "|" in raw:  # placeholder do template → segue
            continue
        value = _strip_accents(raw).lower()
        if value.startswith(("sim", "parcial")):
            return True
        if value.startswith(("nao", "no", "n/a", "-")):
            return False

    # 2 — variante em prosa do template do sync-log.
    if any(KICKOFF_NO_LEGACY_PROSE_RE.search(f) for f in fragments):
        return False

    # 3 — marcador de skip, só como declaração (linha própria ou célula de tabela).
    if legacy_skipped_declared(text):
        return False

    return None


def flowmap_skipped(base: Path) -> bool:
    """Produto sem UI (API pura, batch, worker) registra `FLOWMAP_SKIPPED` no sync-log.

    Forma canônica (spec-product/SKILL.md, Passo 4.7), com `motivo=` PREENCHIDO:
    `FLOWMAP_SKIPPED: motivo=API pura · justificativa=<1 frase>` em linha própria OU
    abrindo a célula «Modo / contexto» da Seção A do sync-log. Prosa, exemplo em bloco
    de código e a tabela que DOCUMENTA o marcador não desligam — ver `_marker_matcher`.

    PRECEDÊNCIA (o eixo da UI ganhou o análogo do `kickoff: legado=…`): `FLOWMAP_VALID:`
    no sync-log é escrito só pela `spec-product` e só quando o `flow-map.md` foi gerado
    e validado — logo, o produto TEM UI e nenhum `FLOWMAP_SKIPPED` pode desligar o gate.
    Sem esse contrapeso o marcador era a única palavra sobre o assunto: qualquer texto
    que o casasse (inclusive o template) desligava o `COND_UI` de todo projeto.
    """
    scope = sync_log_declarations(base)
    if flowmap_valid_declared(scope):
        return False
    return flowmap_skipped_declared(scope)


def resolve_requirement(base: Path, level: str, note: str) -> tuple[bool, str, bool]:
    """(obrigatório_aqui, nota_efetiva, indeterminado) a partir do nível ESTRUTURADO."""
    if level == REQUIRED:
        return True, note, False
    if level == OPTIONAL:
        return False, note, False
    if level == COND_UI:
        if flowmap_valid_declared(sync_log_declarations(base)):
            return True, ("obrigatório — FLOWMAP_VALID no sync-log (produto tem UI; "
                          "vence FLOWMAP_SKIPPED)"), False
        if flowmap_skipped(base):
            return False, "não se aplica — FLOWMAP_SKIPPED no sync-log (produto sem UI)", False
        return True, note, False
    if level == COND_LEGACY:
        decl = legacy_declared(base)
        if decl is True:
            return True, "obrigatório — kickoff declarou legado (legado=Sim/Parcial)", False
        if decl is False:
            return False, "não se aplica — kickoff sem legado (legado=Não / «sem legado» / LEGACY_SKIPPED no sync-log)", False
        return (
            False,
            "condicional a legado — indeterminado: sem linha `kickoff: legado=…` no sync-log",
            True,
        )
    return True, note, False


def modular_requirements_warning(base: Path) -> None:
    """If opt-in: warn when requirements.md lacks modular index / ## Módulo sections."""
    req = base / "requirements" / "requirements.md"
    if not req.exists():
        return
    text = req.read_text(encoding="utf-8", errors="ignore")
    env_on = os.environ.get("SPEC_CHECK_MODULAR", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    comment_on = bool(MODULAR_FLAG_COMMENT.search(text[:6000]))
    if not env_on and not comment_on:
        return
    has_index = bool(MODULAR_INDEX_HEADING.search(text))
    has_module = bool(MODULAR_SECTION_HEADING.search(text))
    print("  ── Verificação modular (requirements.md) — opt-in")
    if has_index and has_module:
        print("     ✅ Índice de módulos + secção «## Módulo:» encontrados.")
    else:
        print("     ⚠️  Aviso: estrutura modular esperada incompleta (não falha o script).")
        if not has_index:
            print(
                "        · Falta cabeçalho «## Índice de módulos e cobertura» "
                "(ver template requirements-functional.md)."
            )
        if not has_module:
            print(
                "        · Falta pelo menos uma secção «## Módulo: …». "
                "Desative com SPEC_CHECK_MODULAR=0 ou remova <!-- spec-check-modular: on -->."
            )
    print()


def print_report(base: Path):
    print(f"\n{'='*60}")
    print(f"  check-outputs — fluxo spec")
    print(f"  Pasta: {base.resolve()}")
    print(f"  Data:  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}\n")

    total_ok = 0
    total_missing_mandatory = 0
    total_thin = 0
    indeterminate = []

    for skill, files in ARTIFACTS.items():
        print(f"  ── {skill}")
        for rel, level, note in files:
            required, note, undetermined = resolve_requirement(base, level, note)
            info = check_file(base, rel, note, required=required)
            icon = status_icon(info)
            if info["exists"]:
                detail = f"{info['lines']} linhas · {info['size']} bytes · {info['mtime']}"
                if info["thin"]:
                    detail += f"  ⚠ esperado ≥{info['min_lines']} linhas"
                    total_thin += 1
                else:
                    total_ok += 1
            else:
                detail = f"({note})"
                if required:
                    total_missing_mandatory += 1
                elif undetermined:
                    indeterminate.append(rel)
            print(f"     {icon} {rel}")
            print(f"        {detail}")
        print()

    # Resumo
    print(f"{'='*60}")
    print(f"  RESUMO")
    print(f"  ✅ Gerados e completos:    {total_ok}")
    print(f"  ⚠️  Gerados mas rasos:      {total_thin}")
    print(f"  ❌ Faltando (obrigatório): {total_missing_mandatory}")
    print(f"{'='*60}\n")

    if total_missing_mandatory > 0:
        print("  → Há artefatos obrigatórios ausentes. Verifique qual skill ainda não foi executada.\n")
    if indeterminate:
        print("  → Condicionais de legado não avaliadas (não contam como falta): "
              + ", ".join(indeterminate))
        print("    Registre a linha `kickoff: legado=<Sim|Parcial|Não>` na Seção A do "
              "sync-log.md (gate KICKOFF_PERSISTED) — ou `LEGACY_SKIPPED` — para o "
              "check decidir.\n")
    if total_thin > 0:
        print("  → Artefatos rasos podem indicar geração incompleta (esqueleto sem conteúdo).\n")
    if total_missing_mandatory == 0 and total_thin == 0:
        print("  → Todos os artefatos gerados parecem completos. Pronto para spec-report ou entrega.\n")

    modular_requirements_warning(base)

    # Checar domains/
    domains_dir = base / "domains"
    if domains_dir.exists():
        domain_files = list(domains_dir.glob("*.md"))
        print(f"  📂 domains/ encontrado: {len(domain_files)} arquivo(s)")
        for f in domain_files:
            lines = sum(1 for _ in f.open("r", encoding="utf-8", errors="ignore"))
            print(f"     · {f.name} ({lines} linhas)")
        print()

    return total_missing_mandatory


def print_pipeline_report(pipeline_base: Path):
    """Verificação da cadeia técnica (spec-data-model → spec-tasks). Informativo apenas."""
    print(f"\n{'='*60}")
    print(f"  check-outputs — cadeia técnica (pipeline)")
    print(f"  Pasta: {pipeline_base.resolve()}")
    print(f"  Data:  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}\n")

    if not pipeline_base.exists():
        print(f"  ⬜ Pasta {pipeline_base} não encontrada.")
        print(f"     A cadeia técnica ainda não foi iniciada ou o path é diferente.")
        print(f"     Override: PIPELINE_OUTPUTS_DIR=<caminho> python3 ../tools/check-outputs.py --pipeline\n")
        return

    total_ok = 0
    total_missing_mandatory = 0
    total_thin = 0

    for skill, files in PIPELINE_ARTIFACTS.items():
        print(f"  ── {skill}")
        for rel, level, note in files:
            required, note, _undetermined = resolve_requirement(pipeline_base, level, note)
            info = check_file(pipeline_base, rel, note, MIN_PIPELINE_LINES, required=required)
            icon = status_icon(info)
            if info["exists"]:
                detail = f"{info['lines']} linhas · {info['size']} bytes · {info['mtime']}"
                if info["thin"]:
                    detail += f"  ⚠ esperado ≥{info['min_lines']} linhas"
                    total_thin += 1
                else:
                    total_ok += 1
            else:
                detail = f"({note})"
                if required:
                    total_missing_mandatory += 1
            print(f"     {icon} {rel}")
            print(f"        {detail}")
        print()

    print(f"{'='*60}")
    print(f"  RESUMO — cadeia técnica")
    print(f"  ✅ Gerados e completos:    {total_ok}")
    print(f"  ⚠️  Gerados mas rasos:      {total_thin}")
    print(f"  ❌ Faltando (obrigatório): {total_missing_mandatory}")
    print(f"{'='*60}\n")

    if total_missing_mandatory > 0:
        print("  → Artefatos obrigatórios da cadeia técnica ausentes.")
        print("    Verifique se spec-data-model e spec-tasks foram executados.\n")
    if total_missing_mandatory == 0 and total_thin == 0:
        print("  → Cadeia técnica completa. Pronto para spec-tasks-html e spec-tasks-azure.\n")

    # tasks.json: verificar schemaVersion
    tasks_json = pipeline_base / "tasks.json"
    if tasks_json.exists():
        try:
            import json
            data = json.loads(tasks_json.read_text(encoding="utf-8", errors="ignore"))
            schema_v = data.get("metadata", {}).get("schemaVersion", "ausente (modo legado)")
            hierarchy = data.get("metadata", {}).get("backlogHierarchy", {}).get("chosen", [])
            print(f"  ── tasks.json — metadata")
            print(f"     schemaVersion: {schema_v}")
            if hierarchy:
                print(f"     backlogHierarchy.chosen: {hierarchy}")
            else:
                print(f"     backlogHierarchy: ausente (modo legado — só stories + tasks)")
            print()
        except Exception as e:
            print(f"  ⚠️  tasks.json — erro ao ler JSON: {e}\n")


def main():
    args = sys.argv[1:]
    check_pipeline = (
        "--pipeline" in args
        or os.environ.get("SPEC_CHECK_PIPELINE", "").strip().lower() in ("1", "true", "yes", "on")
    )
    # Remove flag from args list
    base_args = [a for a in args if a != "--pipeline"]

    if base_args:
        base = Path(base_args[0])
    else:
        base = OUTPUTS_DEFAULT

    if not base.exists():
        print(f"\n  ⚠  Pasta não encontrada: {base.resolve()}")
        print(f"     Certifique-se de executar a partir da raiz do projeto.\n")
        sys.exit(1)

    missing = print_report(base)

    if check_pipeline:
        pipeline_env = os.environ.get("PIPELINE_OUTPUTS_DIR", "").strip()
        if pipeline_env:
            pipeline_base = Path(pipeline_env)
        else:
            pipeline_base = PIPELINE_OUTPUTS_DEFAULT
        print_pipeline_report(pipeline_base)

    if missing > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
