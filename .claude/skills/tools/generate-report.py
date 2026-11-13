"""
generate-report.py — compila os artefatos de outputs/spec/ num único HTML navegável.

Versão: 3.0 — casada com report-shell.html (data-shell-version="3.0"),
report-embedded.css (`report-embedded v3.0`) e spec-report/SKILL.md (nota de layout 3.0 — o
`version` do frontmatter é outro contrato, ver spec-report/MAINTENANCE.md).
Templates fora dessa versão (ou sem os placeholders exigidos) ABORTAM o build com
exit 1 — nunca mais um HTML vazio com exit 0.

Layout por DOMÍNIOS (menu superior fixo + sidebar contextual), montados por
presença de artefato — domínio sem conteúdo não aparece:

  visao       — capa/sumário executivo (capa.md) + painel de cobertura do flow-map
  documentos  — capítulos clássicos (modo compatibilidade)
  fluxos      — Fluxos & Telas (dados via check-flowmap.py --json; requer flow-map válido)
  tecnico     — data-model.json (tabelas de entidades) + SVG de ER + referência a api-contracts.yaml
                + amarração técnica (chips de telas por entidade, índice reverso endpoint→telas,
                endpoints órfãos e entidades sem tela) quando ## Amarração Técnica existe no flow-map
                + tech-rules/tech-rules-summary.md como capítulo «Regras técnicas»
  revisao     — revisao.json do harness (revisão adversarial do pré-projeto), por presença
  qualidade   — gaps.md + sync-log.md (quando presente, gaps/sync NÃO se repetem em documentos)

Quando data-model.json/api-contracts.yaml existem, o subprocess do check-flowmap.py
recebe --data-model/--contracts (cross-checks viram avisos + métricas). Sem a seção
## Amarração Técnica no flow-map, o relatório é idêntico ao comportamento anterior.

Roteamento por hash (JS vanilla embutido): `#dominio` ou `#dominio/ancora`
(ex.: `#fluxos/FLX-001/TEL-003`). Deep-link funciona ao abrir o arquivo direto.

Degradação (cenários verificados — ver SKILL.md «Cenários de degradação a verificar»):
  - sem flow-map          → domínio "fluxos" ausente; default continua "visao" (capa
                            e resumo executivo permanecem o topo do documento);
  - flow-map inválido     → alerta VERMELHO com os erros no topo de "Visão Geral";
  - validador indisponível (script ausente / timeout / saída não-JSON) → AVISO
                            AMARELO próprio (não é erro do flow-map.md);
  - sem revisao.json      → domínio "revisao" ausente;
  - revisao.json ilegível/de forma inválida → AVISO em stderr, domínio omitido, build segue;
  - template desatualizado → exit 1 com instrução de atualizar o pacote de skills.

Screenshots: embutidos em base64 até 1,5 MB por imagem (override por
--screenshot-max-kb ou SPEC_REPORT_SCREENSHOT_MAX_KB) e 24 MB agregados
(--screenshot-total-max-mb / SPEC_REPORT_SCREENSHOT_TOTAL_MAX_MB); acima do cap a
captura é apenas referenciada por link + aviso no relatório e em stderr.

Saída: outputs/spec/report/product-discovery-kit.html (autocontido; Mermaid via CDN).
"""

import argparse
import base64
import codecs
import glob as glob_mod
import html as html_lib
import json
import os
import re
import subprocess
import sys
from datetime import date

# Dependência `markdown-py` — sem rota efêmera (references/tool-bootstrap.md:98-100).
# A ordem de instalação é do USUÁRIO, não do agente: venv do projeto → `pip install --user`
# com aprovação explícita. Nunca `--break-system-packages` (PEP 668).
MARKDOWN_BOOTSTRAP_HINT = (
    "ERRO: pacote 'markdown' não instalado (dependência deste gerador).\n"
    "  Não instale por conta própria: `markdown-py` não tem rota efêmera "
    "(uvx/pipx/container) — ver references/tool-bootstrap.md «Nota sobre pip».\n"
    "  Ordem de preferência, com aprovação explícita do usuário: venv do projeto "
    "(`python3 -m venv .venv && .venv/bin/pip install markdown`) → "
    "`pip install --user markdown`. Nunca `--break-system-packages`.\n"
    "  Sem aprovação: registrar `TOOL_UNAVAILABLE:markdown-py (sem rota efêmera)` no "
    "sync-log.md e seguir no modo degradado da skill (kit HTML não gerado)."
)

try:
    import markdown
except ImportError:
    print(MARKDOWN_BOOTSTRAP_HINT, file=sys.stderr)
    sys.exit(1)

DASH = "—"
esc = html_lib.escape


def _ou_dash(v):
    """.get(chave, DASH) não cobre valor `null` explícito: a chave está presente, o default do
    .get() nunca dispara, e `str(None)` vira o texto "None" no HTML. Usar depois de um .get()
    simples (sem default), nunca como substituto dele."""
    return DASH if v is None else str(v)


# Versão única do trio gerador + shell + CSS (ver docstring e spec-report/SKILL.md).
REPORT_VERSION = "3.0"


def read_file(path):
    with codecs.open(path, 'r', 'utf-8') as f:
        return f.read()


# Capítulos com muitas tabelas de rastreabilidade / factos — dobrar por defeito para leitura.
_CHAPTERS_TABLE_HEAVY = frozenset({
    "chapter-requirements",
    "chapter-rules",
    "chapter-ux",
    "chapter-context",
    "chapter-discovery",
    "chapter-gaps",
    "chapter-sync",
    "chapter-modules",
})

_TABLE_RE = re.compile(r"<table\b[^>]*>.*?</table>", re.DOTALL | re.IGNORECASE)
_MERMAID_RE = re.compile(r'<pre><code class="language-mermaid">(.*?)</code></pre>', re.DOTALL | re.IGNORECASE)


def _table_th_count_first_row(table_html: str) -> int:
    m = re.search(r"<tr\b[^>]*>(.*?)</tr>", table_html, re.DOTALL | re.IGNORECASE)
    if not m:
        return 0
    return len(re.findall(r"<th\b", m.group(1), re.IGNORECASE))


def _table_tr_count(table_html: str) -> int:
    return len(re.findall(r"<tr\b", table_html, re.IGNORECASE))


def _table_should_stay_open(table_html: str) -> bool:
    """Tabelas-resumo que o leitor costuma querer ver sempre abertas."""
    head = table_html[:3500].lower()
    if "objetivo de negócio" in head and ("planejado" in head or "planeado" in head or "nº rf" in head):
        return True
    if "objetivo negócio (resumo)" in head:
        return True
    if "estado as-is" in head and "to-be" in head.replace("‑", "-").replace("–", "-"):
        return True
    if "matriz rf" in head and "rnf" in head and _table_tr_count(table_html) <= 14:
        return True
    return False


def _table_looks_like_traceability(table_html: str) -> bool:
    snip = table_html[:4000].lower()
    keys = (
        "rastreabilidade",
        "facto",
        "fato",
        "âncora",
        "ancora",
        "gap-",
        "id</th>",
        "matriz de cobertura",
        "referência insumo",
        "referencia insumo",
        "insumo →",
        "fonte srs",
        "tabela mestre",
        "matriz urgência",
        "matriz rn",
        "sync-log",
        "artefatos revisados",
    )
    if any(k in snip for k in keys):
        return True
    if re.search(r"\bf-\d{2,}\b", snip):
        return True
    return False


def enhance_chapter_html(fragment: str, chapter_anchor: str) -> str:
    """
    Melhora legibilidade: tabelas largas ou de rastreabilidade ficam em <details> fechados.
    Texto e listas permanecem sempre visíveis.
    """
    out = []
    pos = 0
    heavy = chapter_anchor in _CHAPTERS_TABLE_HEAVY

    for m in _TABLE_RE.finditer(fragment):
        out.append(fragment[pos:m.start()])
        tbl = m.group(0)
        cols = _table_th_count_first_row(tbl)
        rows = _table_tr_count(tbl)

        force_open = _table_should_stay_open(tbl)
        trace_like = _table_looks_like_traceability(tbl)

        fold = False
        summary = "Ver tabela"

        if not force_open:
            if heavy and (trace_like or cols >= 5 or rows >= 10):
                fold = True
                if trace_like:
                    summary = "Rastreabilidade / referências (expandir)"
                elif cols >= 5:
                    summary = "Tabela larga — expandir para ver colunas"
                else:
                    summary = "Tabela longa — expandir"
            elif not heavy and (cols >= 7 or rows >= 25):
                fold = True
                summary = "Tabela detalhada (expandir)"

        if fold:
            safe = esc(summary)
            out.append(
                f'<details class="md-fold md-fold--table"><summary class="md-fold-summary">{safe}</summary>'
                f'<div class="md-fold-body">{tbl}</div></details>'
            )
        else:
            out.append(f'<div class="md-table-scroll">{tbl}</div>')
        pos = m.end()

    out.append(fragment[pos:])
    return "".join(out)


def _mermaid_pre(source: str) -> str:
    """
    Envelopa o FONTE de um diagrama em <pre class="mermaid"> mantendo-o ESCAPADO.
    Nunca desescapar: o mermaid.run() lê `textContent`, então `A["Serviço<br/>de
    Pedidos"]` desescapado viraria elemento real (label perde a quebra) e um bloco
    com `</pre>` ou `<script>` quebraria/injetaria no documento. O shell configura o
    mermaid com securityLevel "strict" (label passa por DOMPurify) — as duas camadas
    são complementares, não redundantes. Mesmo tratamento de build_flow_domain.
    """
    return f'<pre class="mermaid">{esc(source)}</pre>'


def _md_to_html(md_text: str, anchor: str = "chapter-modules") -> str:
    chunk = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])
    # Blocos ```mermaid viram <pre class="mermaid"> (renderizados via CDN, padrão do kit).
    # O markdown já escapou o conteúdo do <code>; reescapar depois de desescapar
    # mantém o fonte íntegro e o textContent correto.
    chunk = _MERMAID_RE.sub(lambda m: _mermaid_pre(html_lib.unescape(m.group(1))), chunk)
    return enhance_chapter_html(chunk, anchor)


# ---------------------------------------------------------------------------
# Módulo pivot — extração e montagem
# ---------------------------------------------------------------------------

def extract_module_sections(md_text: str) -> dict:
    """
    Divide um documento markdown em seções por '## Módulo:'.
    Retorna {code: {'name': str, 'content': str}}.
    """
    modules = {}
    parts = re.split(r'(?=^## Módulo:)', md_text, flags=re.MULTILINE)
    for part in parts:
        first_line = part.split('\n')[0]
        # Captura código MOD-XXX entre parênteses com ou sem backticks
        mc = re.search(r'\(`?(MOD-[A-Z0-9\-]+)`?\)', first_line)
        if not mc:
            continue
        code = mc.group(1)
        # Captura nome (texto entre "## Módulo:" e o parêntese do código)
        nm = re.match(r'^## Módulo:\s*(.+?)\s*\(', first_line)
        name = nm.group(1).strip().strip('`') if nm else code
        modules[code] = {'name': name, 'content': part}
    return modules


def extract_rn_by_module(md_text: str) -> dict:
    """
    Extrai blocos de regras de negócio agrupados por código de módulo.
    Retorna {code: [block_str, ...]}.
    """
    module_rules: dict = {}
    blocks = re.split(r'(?=^#{3,4} RN-)', md_text, flags=re.MULTILINE)
    for block in blocks:
        if not re.match(r'^#{3,4} RN-', block, re.MULTILINE):
            continue
        m = re.search(r'\|\s*\*\*Módulo\*\*\s*\|\s*([^\|\n]+)', block)
        if not m:
            continue
        mc = re.search(r'(MOD-[A-Z0-9\-]+)', m.group(1))
        if not mc:
            continue
        code = mc.group(1)
        module_rules.setdefault(code, []).append(block.strip())
    return module_rules


def extract_gaps_by_module(md_text: str) -> dict:
    """
    Extrai blocos GAP agrupados por código de módulo encontrado em qualquer campo.
    Retorna {code: [block_str, ...]}.
    """
    module_gaps: dict = {}
    blocks = re.split(r'(?=^### GAP-)', md_text, flags=re.MULTILINE)
    for block in blocks:
        if not re.match(r'^### GAP-', block, re.MULTILINE):
            continue
        codes = set(re.findall(r'(MOD-[A-Z0-9\-]+)', block))
        for code in codes:
            module_gaps.setdefault(code, []).append(block.strip())
    return module_gaps


def build_module_pivot(base_dir: str):
    """
    Constrói o capítulo HTML de especificação por módulo e a lista de nav links.
    Retorna (html_str, [(anchor, label), ...]).
    """
    req_path = os.path.join(base_dir, "requirements/requirements.md")
    pr_path = os.path.join(base_dir, "product-requirements/product-requirements.md")
    br_path = os.path.join(base_dir, "business-rules.md")
    gaps_path = os.path.join(base_dir, "gaps.md")

    req_modules: dict = {}
    pr_modules: dict = {}
    rn_by_mod: dict = {}
    gaps_by_mod: dict = {}

    if os.path.exists(req_path):
        req_modules = extract_module_sections(read_file(req_path))

    if os.path.exists(pr_path):
        pr_modules = extract_module_sections(read_file(pr_path))

    if os.path.exists(br_path):
        rn_by_mod = extract_rn_by_module(read_file(br_path))

    if os.path.exists(gaps_path):
        gaps_by_mod = extract_gaps_by_module(read_file(gaps_path))

    # Catálogo de módulos — requirements é fonte de verdade; PR pode ter módulos extras
    all_codes = list(req_modules.keys())
    for code in pr_modules:
        if code not in all_codes:
            all_codes.append(code)

    if not all_codes:
        return "", []

    nav_links = []
    sections_html = ""

    for code in all_codes:
        req_data = req_modules.get(code)
        pr_data = pr_modules.get(code)
        rules = rn_by_mod.get(code, [])
        gaps = gaps_by_mod.get(code, [])

        name = (req_data or pr_data or {}).get('name', code)
        anchor = f"module-{code.lower().replace('-', '_')}"
        nav_links.append((anchor, f"{code}"))

        sections_html += f'<section class="module-section" id="{anchor}">\n'
        sections_html += (
            f'<div class="module-section-header">'
            f'<span class="module-code-badge">{esc(code)}</span>'
            f'<h3 class="module-name">{esc(name)}</h3>'
            f'</div>\n'
        )

        if req_data:
            body = _md_to_html(req_data['content'])
            sections_html += (
                f'<div class="module-block">'
                f'<h4 class="module-block-label">Requisitos Funcionais</h4>'
                f'<div class="md-content">{body}</div>'
                f'</div>\n'
            )

        if pr_data:
            body = _md_to_html(pr_data['content'])
            sections_html += (
                f'<div class="module-block module-block--ux">'
                f'<h4 class="module-block-label">Requisitos de UX</h4>'
                f'<div class="md-content">{body}</div>'
                f'</div>\n'
            )

        if rules:
            body = _md_to_html('\n\n---\n\n'.join(rules))
            sections_html += (
                f'<div class="module-block module-block--rules">'
                f'<h4 class="module-block-label">Regras de Negócio</h4>'
                f'<div class="md-content">{body}</div>'
                f'</div>\n'
            )

        if gaps:
            body = _md_to_html('\n\n---\n\n'.join(gaps))
            sections_html += (
                f'<div class="module-block module-block--gaps">'
                f'<h4 class="module-block-label">GAPs</h4>'
                f'<div class="md-content">{body}</div>'
                f'</div>\n'
            )

        sections_html += '</section>\n'

    return sections_html, nav_links


# Fallback do nome do projeto. NUNCA pode ser igual ao token do template
# (`[Nome do Projeto]`): esse token é exigido em REQUIRED_SHELL_TOKENS *antes* da
# substituição e verificado como resíduo *depois* dela — devolvê-lo como valor
# tornaria o .replace() um no-op e mataria todo projeto sem capa.md preenchida.
PROJECT_NAME_FALLBACK = "Projeto sem nome definido"
_PROJECT_NAME_STUBS = ("[Nome do Projeto]", "[Definir nome em outputs/spec/capa.md]",
                       "Definir nome")


def _has_stub_marker(text: str) -> bool:
    return any(marker in text for marker in _PROJECT_NAME_STUBS)


def extract_project_name(base_dir: str) -> str:
    """Tenta extrair nome do projeto de capa.md ou product-vision.md.

    Sem fonte utilizável devolve PROJECT_NAME_FALLBACK — texto real, não placeholder:
    nome ausente é degradação (aviso), nunca abort (ver SKILL.md, CAPA_EXISTS_AND_FILLED).
    """
    candidates = [
        os.path.join(base_dir, "capa.md"),
        os.path.join(base_dir, "product-vision", "product-vision.md"),
    ]
    for path in candidates:
        if not os.path.exists(path):
            continue
        text = read_file(path)
        m = re.search(r'^#\s+(?:Capa\s*[—-]\s*)?(.+?)\s*$', text, re.MULTILINE)
        if m:
            name = m.group(1).strip()
            name = re.sub(r'\s*[—-]\s*Product Discovery Kit\s*$', '', name, flags=re.IGNORECASE)
            name = re.sub(r'\s*[—-]\s*Documento de Vis[ãa]o.*$', '', name, flags=re.IGNORECASE)
            # `not in` não bastava: título de template («… — [Nome do Projeto]») passava
            # e reinjetava o token no HTML final, disparando assert_no_placeholder_left.
            if name and not _has_stub_marker(name):
                return name
        m = re.search(r'^\s*\*?\*?Projeto:?\*?\*?\s*(.+?)\s*$', text, re.MULTILINE)
        if m:
            name = m.group(1).strip().strip('*').strip()
            # `not in` não bastava: título de template («… — [Nome do Projeto]») passava
            # e reinjetava o token no HTML final, disparando assert_no_placeholder_left.
            if name and not _has_stub_marker(name):
                return name
    return PROJECT_NAME_FALLBACK


def _count_unique(pattern, text):
    return len(set(re.findall(pattern, text, re.IGNORECASE)))


def build_auto_summary(base_dir, project_name, module_count, files_present, files_total):
    """Gera um bloco .exec-summary a partir dos artefatos (sem depender do agente)."""
    def rd(rel):
        fp = os.path.join(base_dir, rel)
        return read_file(fp) if os.path.exists(fp) else ""

    req_txt = rd("requirements/requirements.md")
    rules_txt = rd("business-rules.md")
    gaps_txt = rd("gaps.md")

    n_rf = _count_unique(r"RF-[A-Z0-9-]+", req_txt)
    n_rnf = _count_unique(r"RNF-[A-Z0-9-]+", req_txt)
    n_rn = _count_unique(r"RN-[A-Z0-9-]+", rules_txt)
    gap_ids = []
    for m in re.finditer(r"GAP-[A-Z0-9-]+", gaps_txt, re.IGNORECASE):
        g = m.group(0).upper()
        if g not in gap_ids:
            gap_ids.append(g)
    n_gap = len(gap_ids)

    partes = []
    if module_count:
        partes.append(f"{module_count} módulo(s)")
    if n_rf:
        partes.append(f"{n_rf} requisito(s) funcional(is)")
    if n_rn:
        partes.append(f"{n_rn} regra(s) de negócio")
    resumo_itens = ", ".join(partes) if partes else "os artefatos de discovery disponíveis"
    lead = (
        f"Este kit reúne a documentação de discovery do produto <strong>{esc(project_name)}</strong>: "
        f"{resumo_itens}. Use o menu superior para trocar de domínio e o índice à esquerda para navegar "
        f"dentro do domínio ativo; o detalhe de rastreabilidade fica recolhido para facilitar a leitura."
    )

    cards = []

    def card(label, value, flag=False):
        cls = "exec-card exec-card--flag" if flag else "exec-card"
        return (f'<div class="{cls}"><p class="exec-card__label">{esc(label)}</p>'
                f'<p class="exec-card__value">{esc(str(value))}</p></div>')
    if module_count:
        cards.append(card("Módulos", module_count))
    cards.append(card("Requisitos (RF)", n_rf if n_rf else "—"))
    if n_rnf:
        cards.append(card("Req. não funcionais", n_rnf))
    cards.append(card("Regras de negócio", n_rn if n_rn else "—"))
    cards.append(card("Artefatos incluídos", f"{files_present} de {files_total}"))
    if n_gap:
        cards.append(card("Pontos de atenção", f"{n_gap} lacuna(s)", flag=True))

    return (
        '<section class="exec-summary" aria-label="Resumo executivo">'
        '<h2 class="exec-summary__title">Resumo executivo</h2>'
        f'<p class="exec-summary__lead">{lead}</p>'
        f'<div class="exec-summary__cards">{"".join(cards)}</div>'
        '</section>'
    )


# ---------------------------------------------------------------------------
# Flow-map — consumo do check-flowmap.py (NUNCA reimplementar o parser aqui)
# ---------------------------------------------------------------------------

FLOWMAP_CHECK_TIMEOUT = 120


def run_flowmap_check(base_dir):
    """
    Roda check-flowmap.py --json via subprocess e devolve o dicionário parseado.

    Três resultados distintos (nunca confundir ferramenta com conteúdo):
      - None                                    → flow-map.md não existe;
      - {'ok': False, 'erros': [...]}           → flow-map.md tem erro REAL de
        gramática/integridade (exit 1 do check) → alerta vermelho no relatório;
      - {'ok': False, 'tool_error': CÓDIGO, 'tool_detail': str} → problema da
        FERRAMENTA (TOOL_MISSING / TOOL_TIMEOUT / TOOL_ERROR / TOOL_OUTPUT_INVALID)
        → aviso amarelo, severidade menor: o flow-map pode estar perfeito.
    """
    fm_path = os.path.join(base_dir, "flow-map.md")
    if not os.path.exists(fm_path):
        return None
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-flowmap.py")
    if not os.path.exists(script):
        return {
            "ok": False,
            "tool_error": "TOOL_MISSING",
            "tool_detail": (f"check-flowmap.py não encontrado em {script} — validador ausente "
                            "do diretório do gerador (atualize o pacote de skills)."),
        }
    cmd = [sys.executable, script, fm_path, "--json"]
    manifest = os.path.join(base_dir, "screens-manifest.json")
    if os.path.exists(manifest):
        cmd += ["--manifest", manifest]
    dm_path = os.path.join(base_dir, "data-model.json")
    if os.path.exists(dm_path):
        cmd += ["--data-model", dm_path]
    contracts_path = os.path.join(base_dir, "api-contracts.yaml")
    if os.path.exists(contracts_path):
        cmd += ["--contracts", contracts_path]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                              timeout=FLOWMAP_CHECK_TIMEOUT)
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "tool_error": "TOOL_TIMEOUT",
            "tool_detail": (f"check-flowmap.py excedeu {FLOWMAP_CHECK_TIMEOUT}s e foi abortado — "
                            "flow-map.md não foi validado."),
        }
    except Exception as exc:  # noqa: BLE001 — degradação limpa, nunca quebrar o build
        return {
            "ok": False,
            "tool_error": "TOOL_ERROR",
            "tool_detail": f"falha ao executar check-flowmap.py: {exc}",
        }
    try:
        return json.loads(proc.stdout)
    except ValueError:
        detail = (proc.stderr or proc.stdout or "").strip()
        return {
            "ok": False,
            "tool_error": "TOOL_OUTPUT_INVALID",
            "tool_detail": (f"check-flowmap.py não retornou JSON (exit {proc.returncode}): "
                            f"{detail[:400]}"),
        }


def _mm(value, limit=None):
    """Sanitiza texto para label Mermaid (entre aspas duplas)."""
    s = str(value).replace('"', "'").replace("<", "‹").replace(">", "›").replace("|", "/")
    s = re.sub(r"\s+", " ", s).strip()
    if limit and len(s) > limit:
        s = s[:limit - 1] + "…"
    return s


def build_flow_mermaid(fluxo, etapas_all, transicoes_all):
    """Gera flowchart LR do fluxo: nós = etapas (nome+ator; tela anotada); arestas = transições."""
    fid = fluxo["ID"]
    steps = [e for e in etapas_all if e["Fluxo"] == fid]

    def _ord(e):
        try:
            return int(e["Ordem"])
        except (ValueError, TypeError):
            return 999
    steps.sort(key=_ord)
    local_ids = {e["ID"] for e in steps}
    etp_by_id = {e["ID"]: e for e in etapas_all}

    def nid(x):
        return x.replace("-", "_")

    lines = [
        "flowchart LR",
        "  classDef comTela fill:#e8f0f8,stroke:#2f72b0,color:#0a244b;",
        "  classDef semTela fill:#eef2f7,stroke:#97a1b0,color:#414b59;",
        "  classDef fim fill:#e9f6ee,stroke:#15803d,color:#15803d;",
        "  classDef ext fill:#fdf3e3,stroke:#b45309,color:#b45309;",
    ]
    for e in steps:
        label = f"{_mm(e['Ordem'])}. {_mm(e['Nome'], 42)}<br/><i>{_mm(e['Ator'], 30)}</i>"
        if e["Tela"] != DASH:
            label += f"<br/>{_mm(e['Tela'])}"
            lines.append(f'  {nid(e["ID"])}["{label}"]:::comTela')
        else:
            lines.append(f'  {nid(e["ID"])}["{label}"]:::semTela')

    fim_n = 0
    for t in transicoes_all:
        if t["De"] not in local_ids:
            continue
        gat = _mm(t["Gatilho"], 48)
        edge = f'-- "{gat}" -->' if t["Gatilho"] != DASH else "-->"
        if t["Para"] == DASH:
            fim_n += 1
            fim = f"FIM_{nid(fid)}_{fim_n}"
            lines.append(f'  {fim}(("fim")):::fim')
            lines.append(f'  {nid(t["De"])} {edge} {fim}')
        elif t["Para"] in local_ids:
            lines.append(f'  {nid(t["De"])} {edge} {nid(t["Para"])}')
        else:
            alvo = etp_by_id.get(t["Para"], {})
            ext = f'EXT_{nid(t["Para"])}'
            lines.append(f'  {ext}["{_mm(t["Para"])}<br/>{_mm(alvo.get("Fluxo", "outro fluxo"))}"]:::ext')
            lines.append(f'  {nid(t["De"])} {edge} {ext}')
    return "\n".join(lines)


def _pills(csv_value, cls="pill"):
    if not csv_value or csv_value == DASH:
        return f'<span class="muted">{DASH}</span>'
    items = [x.strip() for x in str(csv_value).split(",") if x.strip()]
    return " ".join(f'<span class="{cls}">{esc(i)}</span>' for i in items)


def _pills_list(items, cls="pill"):
    """Como _pills, mas recebe lista (itens da amarração vêm prontos do --json)."""
    if not items:
        return f'<span class="muted">{DASH}</span>'
    return " ".join(f'<span class="{cls}">{esc(str(i))}</span>' for i in items)


# ---------------------------------------------------------------------------
# Screenshots — base64 com CAP por imagem e agregado
# ---------------------------------------------------------------------------
# 20 telas × 400 KB ≈ 11 MB num único HTML: sem cap o kit fica inabrível. Acima do
# cap a captura é REFERENCIADA por link relativo (report/ é irmão de screens/) e o
# relatório + stderr avisam explicitamente o que ficou de fora.
SCREENSHOT_MAX_KB_DEFAULT = 1536            # 1,5 MB por imagem
SCREENSHOT_TOTAL_MAX_MB_DEFAULT = 24        # cap agregado do documento

SCREENSHOT_BUDGET = {
    "max_bytes": SCREENSHOT_MAX_KB_DEFAULT * 1024,
    "total_max_bytes": SCREENSHOT_TOTAL_MAX_MB_DEFAULT * 1024 * 1024,
    "used_bytes": 0,
    "embedded": 0,
    "skipped": [],  # [(tid, bytes, motivo)]
}


def _fmt_bytes(n):
    if n >= 1024 * 1024:
        return f"{n / (1024 * 1024):.1f} MB"
    return f"{n / 1024:.0f} KB"


def configure_screenshot_budget(max_kb=None, total_max_mb=None):
    """Aplica flags de CLI com fallback para env vars e depois para os defaults."""
    def _num(value, env_name, default):
        if value is not None:
            return value
        raw = os.environ.get(env_name)
        if raw:
            try:
                return float(raw)
            except ValueError:
                print(f"AVISO: {env_name}={raw!r} não é numérico — usando {default}.",
                      file=sys.stderr)
        return default

    kb = _num(max_kb, "SPEC_REPORT_SCREENSHOT_MAX_KB", SCREENSHOT_MAX_KB_DEFAULT)
    mb = _num(total_max_mb, "SPEC_REPORT_SCREENSHOT_TOTAL_MAX_MB", SCREENSHOT_TOTAL_MAX_MB_DEFAULT)
    SCREENSHOT_BUDGET["max_bytes"] = max(0, int(kb * 1024))
    SCREENSHOT_BUDGET["total_max_bytes"] = max(0, int(mb * 1024 * 1024))
    SCREENSHOT_BUDGET["used_bytes"] = 0
    SCREENSHOT_BUDGET["embedded"] = 0
    SCREENSHOT_BUDGET["skipped"] = []


def _screenshot_reference(tid, size, motivo):
    """Captura fora do cap: link relativo para o PNG + aviso visível no card."""
    return (
        f'<figure class="tela-shot tela-shot--linked">'
        f'<p class="warn-inline">Captura <strong>não embutida</strong> ({motivo}, '
        f'{_fmt_bytes(size)}) para manter o HTML abrível.</p>'
        f'<figcaption><a href="../screens/{esc(tid)}.png">abrir '
        f'<code>screens/{esc(tid)}.png</code></a></figcaption>'
        f'</figure>'
    )


def build_screenshot_html(base_dir, tid):
    """Screenshot embutido em base64 (screens/<TEL-ID>.png), referenciado por link
    quando excede o cap por imagem ou o cap agregado, ou placeholder discreto."""
    p = os.path.join(base_dir, "screens", f"{tid}.png")
    if not os.path.exists(p):
        return '<p class="tela-shot--empty">sem captura</p>'
    try:
        size = os.path.getsize(p)
    except OSError:
        size = 0
    budget = SCREENSHOT_BUDGET
    if budget["max_bytes"] and size > budget["max_bytes"]:
        motivo = f"acima do cap de {_fmt_bytes(budget['max_bytes'])} por imagem"
        budget["skipped"].append((tid, size, motivo))
        return _screenshot_reference(tid, size, motivo)
    if budget["total_max_bytes"] and budget["used_bytes"] + size > budget["total_max_bytes"]:
        motivo = f"cap agregado de {_fmt_bytes(budget['total_max_bytes'])} atingido"
        budget["skipped"].append((tid, size, motivo))
        return _screenshot_reference(tid, size, motivo)
    try:
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
    except OSError as exc:
        motivo = f"erro de leitura ({exc.strerror or exc})"
        budget["skipped"].append((tid, size, motivo))
        return _screenshot_reference(tid, size, motivo)
    budget["used_bytes"] += size
    budget["embedded"] += 1
    return (
        f'<figure class="tela-shot">'
        f'<img src="data:image/png;base64,{b64}" alt="Captura de {esc(tid)}" loading="lazy" />'
        f'<figcaption>screens/{esc(tid)}.png — clique para ampliar</figcaption>'
        f'</figure>'
    )


def build_screenshot_warning():
    """Aviso amarelo (não alerta) listando as capturas que ficaram fora do HTML."""
    skipped = SCREENSHOT_BUDGET["skipped"]
    if not skipped:
        return ""
    items = "".join(
        f'<li><code>{esc(tid)}.png</code> — {esc(motivo)} ({_fmt_bytes(size)})</li>'
        for tid, size, motivo in skipped
    )
    return (
        '<section class="warn-banner warn-banner--tool" role="status">'
        f'<h2 class="warn-banner__title">{len(skipped)} captura(s) não embutida(s) no HTML</h2>'
        '<p>Para o arquivo continuar abrível, capturas acima do cap ficam apenas '
        '<strong>referenciadas por link relativo</strong> — mantenha a pasta '
        '<code>outputs/spec/screens/</code> ao lado do relatório. Ajuste os limites com '
        '<code>--screenshot-max-kb</code> / <code>--screenshot-total-max-mb</code> '
        '(ou <code>SPEC_REPORT_SCREENSHOT_MAX_KB</code> / '
        '<code>SPEC_REPORT_SCREENSHOT_TOTAL_MAX_MB</code>).</p>'
        f'<ul>{items}</ul></section>'
    )


def build_coverage_panel(metricas, avisos, heading="Cobertura de fluxos &amp; telas"):
    """Painel de cobertura com métricas do check-flowmap."""
    met = metricas or {}

    def stat(value, label, flag=False):
        cls = "stat stat--flag" if flag else "stat"
        return (f'<div class="{cls}"><span class="stat__value">{esc(str(value))}</span>'
                f'<span class="stat__label">{esc(label)}</span></div>')

    orfas = met.get("telas_orfas", [])
    sem_etapas = met.get("fluxos_sem_etapas", [])
    estados_sem_tela = met.get("estados_sem_tela", [])
    cards = [
        stat(met.get("total_fluxos", 0), "Fluxos"),
        stat(met.get("total_etapas", 0), "Etapas"),
        stat(met.get("total_telas", 0), "Telas"),
        stat(met.get("total_transicoes", 0), "Transições"),
        stat(f"{met.get('pct_etapas_com_tela', 0)}%", "Etapas com tela"),
        stat(f"{met.get('pct_transicoes_com_rn', 0)}%", "Transições com RN"),
        stat(len(orfas), "Telas órfãs", flag=bool(orfas)),
        stat(len(sem_etapas), "Fluxos sem etapas", flag=bool(sem_etapas)),
    ]
    if "pct_telas_com_amarracao" in met:
        cards.insert(6, stat(f"{met['pct_telas_com_amarracao']}%", "Telas com amarração"))
    detail = ""
    notes = []
    if orfas:
        notes.append(f"<li><strong>Telas órfãs</strong> (nenhuma etapa as referencia): {esc(', '.join(orfas))}</li>")
    if sem_etapas:
        notes.append(f"<li><strong>Fluxos sem etapas</strong>: {esc(', '.join(sem_etapas))}</li>")
    if estados_sem_tela:
        notes.append(f"<li><strong>Estados sem tela</strong> (matriz estado×tela): {esc(', '.join(estados_sem_tela))}</li>")
    for a in (avisos or []):
        notes.append(f"<li>{esc(a)}</li>")
    if notes:
        detail = f'<ul class="coverage-notes">{"".join(notes)}</ul>'
    return (
        f'<section class="coverage-panel" aria-label="Painel de cobertura">'
        f'<h2 class="exec-summary__title">{heading}</h2>'
        f'<div class="stats-strip">{"".join(cards)}</div>'
        f'{detail}'
        f'</section>'
    )


def build_state_matrix(fm):
    """Tabela estados de entidade (das transições) × telas; estados sem tela em destaque."""
    met = fm.get("metricas", {})
    matriz = met.get("matriz_estado_tela", {})
    if not matriz:
        return ""
    telas_ids = sorted({t["ID"] for t in fm.get("telas", [])})
    estados_sem_tela = set(met.get("estados_sem_tela", []))
    head = "".join(f'<th>{esc(t)}</th>' for t in telas_ids)
    rows = []
    for estado, cobertas in matriz.items():
        sem = estado in estados_sem_tela
        cls = ' class="matrix-row--uncovered"' if sem else ""
        cells = "".join(
            f'<td class="matrix-hit">●</td>' if t in cobertas else '<td class="matrix-miss">·</td>'
            for t in telas_ids
        )
        badge = ' <span class="pill pill--gap">sem tela</span>' if sem else ""
        rows.append(f'<tr{cls}><th scope="row">{esc(estado)}{badge}</th>{cells}</tr>')
    return (
        '<article class="chapter" id="matriz-estado-tela">'
        '<header class="chapter-header"><h2>Matriz estado × tela</h2>'
        '<span class="chapter-lead">estados de entidade produzidos pelas transições × telas onde aparecem</span></header>'
        '<div class="md-content"><div class="md-table-scroll"><table class="matrix-table">'
        f'<thead><tr><th>Estado da entidade</th>{head}</tr></thead>'
        f'<tbody>{"".join(rows)}</tbody></table></div>'
        '<p class="muted">● = alguma etapa com essa tela participa da transição que produz o estado. '
        'Estados destacados não têm nenhuma tela associada — verificar cobertura de UI.</p></div>'
        '</article>'
    )


def build_flow_domain(fm, base_dir):
    """Monta sidebar + conteúdo do domínio Fluxos & Telas. Retorna (sidebar, content)."""
    fluxos = fm.get("fluxos", [])
    etapas = fm.get("etapas", [])
    telas = fm.get("telas", [])
    transicoes = fm.get("transicoes", [])
    met = fm.get("metricas", {})

    tela_by_id = {t["ID"]: t for t in telas}
    etp_by_id = {e["ID"]: e for e in etapas}
    amarr_by_tela = {a["tela"]: a for a in (fm.get("amarracao") or [])}

    def _ord(e):
        try:
            return int(e["Ordem"])
        except (ValueError, TypeError):
            return 999

    # Fluxo primário de cada tela (primeiro fluxo, em ordem, cuja etapa a referencia)
    primary_flow = {}
    telas_por_fluxo = {}
    for f in fluxos:
        fid = f["ID"]
        steps = sorted([e for e in etapas if e["Fluxo"] == fid], key=_ord)
        seen = []
        for e in steps:
            tid = e["Tela"]
            if tid != DASH and tid in tela_by_id and tid not in seen:
                seen.append(tid)
                primary_flow.setdefault(tid, fid)
        telas_por_fluxo[fid] = seen
    orfas = [t["ID"] for t in telas if t["ID"] not in primary_flow]

    def tela_anchor(tid):
        pf = primary_flow.get(tid)
        return f"{pf}/{tid}" if pf else tid

    # ---------------- Sidebar ----------------
    sb = ['<h2>Cobertura</h2>', '<a href="#fluxos/cobertura-fluxos">Painel de cobertura</a>']
    if met.get("matriz_estado_tela"):
        sb.append('<a href="#fluxos/matriz-estado-tela">Matriz estado × tela</a>')
    sb.append('<h2>Fluxos</h2>')
    for f in fluxos:
        fid = f["ID"]
        sb.append(f'<a href="#fluxos/{fid}"><span class="nav-flx-id">{esc(fid)}</span> {esc(f["Nome"])}</a>')
        for tid in telas_por_fluxo.get(fid, []):
            t = tela_by_id[tid]
            sb.append(
                f'<a class="nav-module-link" href="#fluxos/{esc(tela_anchor(tid))}">'
                f'{esc(tid)} · {esc(t["Nome"])}</a>'
            )
    if orfas:
        sb.append('<h2>Telas sem fluxo</h2>')
        for tid in orfas:
            t = tela_by_id[tid]
            sb.append(f'<a class="nav-module-link" href="#fluxos/{esc(tid)}">{esc(tid)} · {esc(t["Nome"])}</a>')
    sidebar = "\n".join(sb)

    # ---------------- Conteúdo ----------------
    parts = []
    panel = build_coverage_panel(met, fm.get("avisos", []))
    parts.append(f'<div id="cobertura-fluxos">{panel}</div>')

    def tela_card(tid, anchor_id):
        t = tela_by_id[tid]
        usos = []
        for e in sorted(etapas, key=lambda x: (x["Fluxo"], _ord(x))):
            if e["Tela"] == tid:
                usos.append(f'<li><code>{esc(e["ID"])}</code> — {esc(e["Nome"])} '
                            f'(<code>{esc(e["Fluxo"])}</code>, ordem {esc(e["Ordem"])})</li>')
        trs_rows = []
        for tr in transicoes:
            de_t = etp_by_id.get(tr["De"], {}).get("Tela", DASH)
            para_t = etp_by_id.get(tr["Para"], {}).get("Tela", DASH) if tr["Para"] != DASH else DASH
            direcao = None
            if de_t == tid and para_t == tid:
                direcao = "interna"
            elif de_t == tid:
                direcao = "sai"
            elif para_t == tid:
                direcao = "chega"
            if not direcao:
                continue
            de_nome = etp_by_id.get(tr["De"], {}).get("Nome", tr["De"])
            para_nome = etp_by_id.get(tr["Para"], {}).get("Nome", tr["Para"]) if tr["Para"] != DASH else "fim de fluxo"
            trs_rows.append(
                f'<tr><td><code>{esc(tr["ID"])}</code></td>'
                f'<td><span class="pill pill--{"status" if direcao == "chega" else "type"}">{direcao}</span></td>'
                f'<td>{esc(de_nome)} → {esc(para_nome)}</td>'
                f'<td>{esc(tr["Gatilho"])}</td>'
                f'<td>{_pills(tr["Regras"], "pill pill--rule")}</td>'
                f'<td>{esc(tr["Estado da entidade"])}</td></tr>'
            )
        trs_html = ""
        if trs_rows:
            trs_html = (
                '<h5>Transições que saem / chegam</h5>'
                '<div class="md-table-scroll"><table>'
                '<thead><tr><th>ID</th><th>Direção</th><th>De → Para</th><th>Gatilho</th>'
                '<th>Regras (RN)</th><th>Estado</th></tr></thead>'
                f'<tbody>{"".join(trs_rows)}</tbody></table></div>'
            )
        usos_html = f'<h5>Etapas em que aparece</h5><ul>{"".join(usos)}</ul>' if usos else \
            '<h5>Etapas em que aparece</h5><p class="muted">nenhuma — tela órfã</p>'
        # Amarração técnica (## Amarração Técnica do flow-map) — omitida silenciosamente se ausente
        amarr_html = ""
        am = amarr_by_tela.get(tid)
        if am and am.get("entidades"):
            amarr_html += f'<h5>Entidades</h5><p>{_pills_list(am["entidades"], "pill pill--type")}</p>'
        if am and am.get("endpoints"):
            amarr_html += f'<h5>Endpoints</h5><p>{_pills_list(am["endpoints"], "pill pill--method")}</p>'
        return (
            f'<section class="tela-card" id="{esc(anchor_id)}">'
            f'<div class="tela-card__head">'
            f'<span class="module-code-badge">{esc(tid)}</span>'
            f'<h4 class="module-name">{esc(t["Nome"])}</h4>'
            f'</div>'
            f'<div class="tela-card__meta">'
            f'<span class="story-meta__chip"><strong>Rota</strong> <code>{esc(t["Rota"])}</code></span>'
            f'<span class="story-meta__chip"><strong>Módulo</strong> {esc(t["Módulo"])}</span>'
            f'</div>'
            f'<div class="tela-card__grid">'
            f'<div class="tela-card__info">'
            f'<h5>Estados UI</h5><p>{_pills(t["Estados UI"], "pill pill--status")}</p>'
            f'<h5>RF/PR vinculados</h5><p>{_pills(t["RF/PR"], "pill pill--rule")}</p>'
            f'{amarr_html}'
            f'{usos_html}'
            f'</div>'
            f'<div class="tela-card__shot">{build_screenshot_html(base_dir, tid)}</div>'
            f'</div>'
            f'{trs_html}'
            f'</section>'
        )

    for f in fluxos:
        fid = f["ID"]
        steps = sorted([e for e in etapas if e["Fluxo"] == fid], key=_ord)
        tipo_cls = "pill--status" if f["Tipo"] == "TO-BE" else "pill--impact"
        header = (
            f'<header class="chapter-header">'
            f'<h2><span class="module-code-badge">{esc(fid)}</span> {esc(f["Nome"])}</h2>'
            f'<div class="flow-meta">'
            f'<span class="pill {tipo_cls}">{esc(f["Tipo"])}</span>'
            f'<span class="story-meta__chip"><strong>Ator</strong> {esc(f["Ator principal"])}</span>'
            f'<span class="story-meta__chip"><strong>Origem</strong> {esc(f["Origem (AS-IS)"])}</span>'
            f'</div>'
            f'<p class="flow-objetivo">{esc(f["Objetivo"])}</p>'
            f'</header>'
        )
        if steps:
            mermaid = build_flow_mermaid(f, etapas, transicoes)
            diagram = f'<div class="mermaid-wrap">{_mermaid_pre(mermaid)}</div>'
            cards = []
            for e in steps:
                tela_link = ""
                if e["Tela"] != DASH and e["Tela"] in tela_by_id:
                    tela_link = (f'<a class="etapa-card__tela" href="#fluxos/{esc(tela_anchor(e["Tela"]))}">'
                                 f'{esc(e["Tela"])}</a>')
                elif e["Tela"] != DASH:
                    tela_link = f'<span class="etapa-card__tela">{esc(e["Tela"])}</span>'
                cards.append(
                    f'<li class="etapa-card" id="{esc(e["ID"])}">'
                    f'<div class="etapa-card__head"><span class="etapa-card__ordem">{esc(e["Ordem"])}</span>'
                    f'<span class="etapa-card__nome">{esc(e["Nome"])}</span></div>'
                    f'<div class="etapa-card__body">'
                    f'<p><strong>Ator:</strong> {esc(e["Ator"])} {tela_link}</p>'
                    f'<p class="muted"><strong>Entrada:</strong> {esc(e["Entrada"])}<br/>'
                    f'<strong>Saída:</strong> {esc(e["Saída"])}</p>'
                    f'</div></li>'
                )
            steps_html = f'<h3>Sequência de etapas</h3><ol class="etapa-cards">{"".join(cards)}</ol>'
        else:
            diagram = ""
            steps_html = '<p class="warn-inline">Fluxo sem etapas mapeadas — verificar flow-map.md.</p>'

        telas_html = ""
        owned = [tid for tid in telas_por_fluxo.get(fid, []) if primary_flow.get(tid) == fid]
        if owned:
            telas_html = '<h3>Telas do fluxo</h3>' + "".join(
                tela_card(tid, f"{fid}/{tid}") for tid in owned
            )
        reused = [tid for tid in telas_por_fluxo.get(fid, []) if primary_flow.get(tid) != fid]
        if reused:
            links = ", ".join(
                f'<a href="#fluxos/{esc(tela_anchor(tid))}">{esc(tid)}</a>' for tid in reused
            )
            telas_html += f'<p class="muted">Telas reutilizadas de outros fluxos: {links}</p>'

        parts.append(
            f'<article class="chapter flow-section" id="{esc(fid)}">'
            f'{header}<div class="md-content">{diagram}{steps_html}{telas_html}</div></article>'
        )

    if orfas:
        cards = "".join(tela_card(tid, tid) for tid in orfas)
        parts.append(
            '<article class="chapter" id="telas-orfas">'
            '<header class="chapter-header"><h2>Telas não referenciadas por etapas</h2>'
            '<span class="chapter-lead">telas órfãs — presentes em ## Telas, sem uso em ## Etapas</span></header>'
            f'<div class="md-content">{cards}</div></article>'
        )

    matrix = build_state_matrix(fm)
    if matrix:
        parts.append(matrix)

    return sidebar, "\n".join(parts)


# ---------------------------------------------------------------------------
# Domínio Técnico — data-model.json + SVG de ER + referência api-contracts.yaml
# ---------------------------------------------------------------------------

_SVG_ID_RE = re.compile(r'\bid\s*=\s*"([^"]*)"')
# Atributos que referenciam ids por fragmento (#id) dentro do próprio SVG.
_SVG_REF_ATTRS = (
    "href", "xlink:href", "fill", "stroke", "clip-path", "mask", "filter",
    "marker-start", "marker-mid", "marker-end", "aria-labelledby",
    "aria-describedby", "for",
)


def namespace_svg_ids(svg_raw: str, prefix: str) -> str:
    """
    Prefixa todos os `id` do SVG (e as referências internas a eles) para evitar
    colisão com ids da página ou entre dois SVGs embutidos no mesmo documento.
    """
    ids = [i for i in set(_SVG_ID_RE.findall(svg_raw)) if i]
    if not ids:
        return svg_raw
    out = svg_raw
    # ids mais longos primeiro: evita substituição parcial de um id prefixo de outro.
    for old in sorted(ids, key=len, reverse=True):
        new = f"{prefix}{old}"
        old_re = re.escape(old)
        out = re.sub(r'\bid\s*=\s*"' + old_re + r'"', lambda _m, n=new: f'id="{n}"', out)
        out = re.sub(r'url\(\s*#' + old_re + r'\s*\)', lambda _m, n=new: f'url(#{n})', out)
        for attr in _SVG_REF_ATTRS:
            out = re.sub(
                re.escape(attr) + r'\s*=\s*"#' + old_re + r'"',
                lambda _m, a=attr, n=new: f'{a}="#{n}"',
                out,
            )
        # SMIL: begin="idAlvo.click"
        out = re.sub(r'\b(begin|end)\s*=\s*"' + old_re + r'\.',
                     lambda m, n=new: f'{m.group(1)}="{n}.', out)
    return out

def build_tech_domain(base_dir, fm=None):
    """Retorna (sidebar, content) ou None se não houver insumo técnico.
    fm = JSON do check-flowmap (quando flow-map válido) — usado só para a
    amarração técnica (telas por entidade, índice reverso endpoint→telas)."""
    dm_path = os.path.join(base_dir, "data-model.json")
    svgs = sorted(glob_mod.glob(os.path.join(base_dir, "*.svg")))
    api_path = os.path.join(base_dir, "api-contracts.yaml")
    rules_path = os.path.join(base_dir, "tech-rules", "tech-rules-summary.md")
    has_dm = os.path.exists(dm_path)
    has_rules = os.path.exists(rules_path)
    if not has_dm and not svgs and not has_rules:
        return None

    # Amarração técnica (## Amarração Técnica do flow-map, via --json) — opcional
    amarr = (fm or {}).get("amarracao") or []
    met_fm = (fm or {}).get("metricas") or {}
    telas_por_entidade, telas_por_endpoint = {}, {}
    for a in amarr:
        for ent in a.get("entidades", []):
            telas_por_entidade.setdefault(ent, []).append(a["tela"])
        for ep in a.get("endpoints", []):
            telas_por_endpoint.setdefault(ep, []).append(a["tela"])
    fluxos_por_tela, nome_fluxo = {}, {}
    if fm:
        nome_fluxo = {f["ID"]: f["Nome"] for f in fm.get("fluxos", [])}
        for e in fm.get("etapas", []):
            t = e.get("Tela")
            if t and t != DASH and e["Fluxo"] not in fluxos_por_tela.setdefault(t, []):
                fluxos_por_tela[t].append(e["Fluxo"])

    sb, parts = [], []

    if has_dm:
        sb.append('<h2>Modelo de dados</h2>')
        sb.append('<a href="#tecnico/tech-datamodel">Visão geral</a>')
        try:
            dm = json.loads(read_file(dm_path))
        except ValueError as exc:
            parts.append(
                '<article class="chapter" id="tech-datamodel">'
                '<header class="chapter-header"><h2>Modelo de dados</h2>'
                '<span class="chapter-lead">data-model.json</span></header>'
                f'<div class="md-content"><p class="warn-inline">data-model.json ilegível: {esc(str(exc))}</p></div>'
                '</article>'
            )
            dm = None
        if dm is not None:
            meta = (
                f'<p class="muted">Projeto: <strong>{esc(str(dm.get("projectName", DASH)))}</strong> · '
                f'schema <code>{esc(str(dm.get("schemaVersion", DASH)))}</code> · '
                f'gerado em {esc(str(dm.get("generatedAt", DASH)))}</p>'
            )
            body = [meta]
            for bc in dm.get("boundedContexts", []):
                bc_id = str(bc.get("id", ""))
                body.append(f'<h3>{esc(bc_id)} — {esc(str(bc.get("name", "")))}</h3>')
                if bc.get("description"):
                    body.append(f'<p>{esc(str(bc["description"]))}</p>')
                for ent in bc.get("entities", []):
                    name = str(ent.get("name", "?"))
                    anchor = f'tech-ent-{re.sub(r"[^A-Za-z0-9_-]", "_", name)}'
                    sb.append(f'<a class="nav-module-link" href="#tecnico/{anchor}">{esc(name)}</a>')
                    rows = []
                    for col in ent.get("columns", []):
                        rows.append(
                            f'<tr><td><code>{esc(str(col.get("name", "")))}</code></td>'
                            f'<td><code>{esc(str(col.get("type", "")))}</code></td>'
                            f'<td>{"sim" if col.get("nullable") else "não"}</td>'
                            f'<td>{"sim" if col.get("unique") else "não"}</td>'
                            f'<td>{esc(str(col.get("businessRuleRef") or ""))}</td>'
                            f'<td>{esc(str(col.get("notes") or ""))}</td></tr>'
                        )
                    pk = ", ".join(ent.get("primaryKey", []) or []) or DASH
                    tels_ent = telas_por_entidade.get(name, [])
                    telas_html = (
                        f'<p class="entity-telas"><strong>Telas:</strong> '
                        f'{_pills_list(tels_ent, "pill pill--status")}</p>'
                    ) if tels_ent else ""
                    body.append(
                        f'<section class="tela-card" id="{anchor}">'
                        f'<div class="tela-card__head">'
                        f'<span class="module-code-badge">{esc(str(ent.get("operationType", "ENTIDADE")))}</span>'
                        f'<h4 class="module-name">{esc(name)}'
                        f' <code class="entity-card__table">{esc(str(ent.get("tableName", "")))}</code></h4></div>'
                        f'<p class="muted">{esc(str(ent.get("purpose") or ""))} · PK: <code>{esc(pk)}</code></p>'
                        f'{telas_html}'
                        f'<div class="md-table-scroll"><table>'
                        f'<thead><tr><th>Atributo</th><th>Tipo</th><th>Nulo?</th><th>Único?</th>'
                        f'<th>RN</th><th>Notas</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>'
                        f'</section>'
                    )
                enums = bc.get("enumerations", [])
                if enums:
                    body.append('<h4>Enumerações</h4>')
                    for en in enums:
                        vals = ", ".join(
                            f'<code>{esc(str(v.get("value", "")))}</code>' for v in en.get("values", [])
                        )
                        used = ", ".join(en.get("usedIn", []) or [])
                        body.append(
                            f'<p><strong>{esc(str(en.get("name", "")))}</strong>: {vals}'
                            f'{" · usado em <code>" + esc(used) + "</code>" if used else ""}</p>'
                        )
            oq = dm.get("openQuestions", [])
            if oq:
                items = "".join(f'<li>{esc(json.dumps(q, ensure_ascii=False) if isinstance(q, dict) else str(q))}</li>' for q in oq)
                body.append(f'<h4>Questões em aberto</h4><ul>{items}</ul>')
            sem_tela = met_fm.get("entidades_sem_tela") or []
            if sem_tela:
                body.append(
                    f'<p class="muted">Entidades do data-model sem tela amarrada no flow-map: '
                    f'{esc(", ".join(sem_tela))}.</p>'
                )
            parts.append(
                '<article class="chapter" id="tech-datamodel">'
                '<header class="chapter-header"><h2>Modelo de dados</h2>'
                '<span class="chapter-lead">data-model.json</span></header>'
                f'<div class="md-content">{"".join(body)}</div></article>'
            )

    if svgs:
        sb.append('<h2>Diagramas</h2>')
        for i, svg_path in enumerate(svgs):
            fname = os.path.basename(svg_path)
            anchor = f"tech-svg-{i}"
            sb.append(f'<a href="#tecnico/{anchor}">{esc(fname)}</a>')
            try:
                svg_raw = read_file(svg_path)
                # remove prólogo XML/doctype para embutir inline
                svg_raw = re.sub(r"<\?xml[^>]*\?>\s*", "", svg_raw)
                svg_raw = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg_raw)
                # ids internos do SVG podem colidir com ids da página (ou entre SVGs):
                # prefixa tudo com o anchor do diagrama antes de injetar inline.
                svg_raw = namespace_svg_ids(svg_raw, f"{anchor}--")
                inner = f'<div class="svg-embed">{svg_raw}</div>'
            except OSError as exc:
                inner = f'<p class="warn-inline">SVG ilegível: {esc(str(exc))}</p>'
            parts.append(
                f'<article class="chapter" id="{anchor}">'
                f'<header class="chapter-header"><h2>Diagrama — {esc(fname)}</h2>'
                f'<span class="chapter-lead">{esc(fname)}</span></header>'
                f'<div class="md-content">{inner}</div></article>'
            )

    if os.path.exists(api_path):
        sb.append('<h2>Contratos de API</h2>')
        sb.append('<a href="#tecnico/tech-api">api-contracts.yaml</a>')
        version = DASH
        try:
            m = re.search(r"^\s*version:\s*[\"']?([^\"'\n#]+)", read_file(api_path), re.MULTILINE)
            if m:
                version = m.group(1).strip()
        except OSError:
            pass
        parts.append(
            '<article class="chapter" id="tech-api">'
            '<header class="chapter-header"><h2>Contratos de API</h2>'
            '<span class="chapter-lead">referência — não incorporado ao kit</span></header>'
            '<div class="md-content">'
            f'<p>Especificação OpenAPI disponível em <code>outputs/spec/api-contracts.yaml</code> '
            f'(versão <strong>{esc(version)}</strong>). O conteúdo não é renderizado neste kit — '
            'consultar o arquivo fonte ou ferramentas OpenAPI.</p></div></article>'
        )

    # Índice reverso da amarração técnica: endpoint → telas que o consomem → fluxos
    endpoints_orfaos = met_fm.get("endpoints_orfaos") or []
    if telas_por_endpoint or endpoints_orfaos:
        sb.append('<h2>Amarração técnica</h2>')
        sb.append('<a href="#tecnico/tech-endpoint-index">Índice reverso — endpoints</a>')
        rows = []
        for ep in sorted(telas_por_endpoint):
            tels = telas_por_endpoint[ep]
            flxs = []
            for t in tels:
                for fx in fluxos_por_tela.get(t, []):
                    if fx not in flxs:
                        flxs.append(fx)
            flx_html = "; ".join(
                f'<code>{esc(fx)}</code> {esc(nome_fluxo.get(fx, ""))}'.strip() for fx in flxs
            ) or f'<span class="muted">{DASH}</span>'
            rows.append(
                f'<tr><td><code>{esc(ep)}</code></td>'
                f'<td>{_pills_list(tels, "pill pill--status")}</td>'
                f'<td>{flx_html}</td></tr>'
            )
        table_html = ""
        if rows:
            table_html = (
                '<div class="md-table-scroll"><table>'
                '<thead><tr><th>Endpoint</th><th>Telas que o consomem</th><th>Fluxos</th></tr></thead>'
                f'<tbody>{"".join(rows)}</tbody></table></div>'
            )
        else:
            table_html = '<p class="muted">Nenhum endpoint amarrado a telas no flow-map.</p>'
        orfaos_html = ""
        if endpoints_orfaos:
            orfaos_html = (
                '<p class="warn-inline"><strong>Endpoints órfãos</strong> — presentes no contrato, '
                f'sem amarração a nenhuma tela: {esc(", ".join(endpoints_orfaos))}.</p>'
            )
        parts.append(
            '<article class="chapter" id="tech-endpoint-index">'
            '<header class="chapter-header"><h2>Índice reverso — endpoint → telas</h2>'
            '<span class="chapter-lead">## Amarração Técnica do flow-map.md (via check-flowmap.py --json)</span></header>'
            f'<div class="md-content">{table_html}{orfaos_html}</div></article>'
        )

    # Tech rules (spec-tech-rules) — o resumo das decisões técnicas do projeto, como capítulo.
    # Os .mdc não entram: são rules para o agente, não texto para o leitor.
    if has_rules:
        try:
            rules_html = _md_to_html(read_file(rules_path), "tech-rules")
        # UnicodeDecodeError ⊂ ValueError: arquivo com bytes que não são UTF-8 não é erro de I/O e
        # escapava do `except OSError` puro — mesma doutrina do build_review_domain.
        except (OSError, ValueError) as exc:
            print(f"AVISO: tech-rules-summary.md ilegível ({exc}) — capítulo omitido.", file=sys.stderr)
        else:
            sb.append('<h2>Regras técnicas</h2>')
            sb.append('<a href="#tecnico/tech-rules">Regras técnicas</a>')
            parts.append(
                '<article class="chapter" id="tech-rules">'
                '<header class="chapter-header"><h2>Regras técnicas do projeto</h2>'
                '<span class="chapter-lead">tech-rules/tech-rules-summary.md</span></header>'
                f'<div class="md-content">{rules_html}</div></article>'
            )

    return "\n".join(sb), "\n".join(parts)


# ---------------------------------------------------------------------------
# Domínio Revisão (revisao.json do harness Elo v2)
# ---------------------------------------------------------------------------

def build_review_domain(base_dir):
    """revisao.json (revisão adversarial do Explore, emitida pelo harness) → (sidebar, content) ou None.

    Contrato do JSON — `revisao.mjs`, `formatarJson`: `{versao, resumo{documentos,
    totalApontamentos, gapsAbertos}, listas[{chave, titulo, itens[]}]}`, as OITO listas sempre
    presentes. Lista vazia não vira seção: o leitor é stakeholder, e seção que diz "nada aqui"
    é ruído. JSON ilegível → domínio omitido com AVISO, nunca abort (mesma doutrina do flow-map).
    """
    fp = os.path.join(base_dir, "revisao.json")
    if not os.path.exists(fp):
        return None
    try:
        with codecs.open(fp, "r", "utf-8") as f:
            rev = json.load(f)
        # JSON sintaticamente válido mas de topo não-objeto (`[]`, `null`, string) não é erro de
        # parse — só falha adiante, em .get(). Tratar aqui como o mesmo AVISO degradado.
        if not isinstance(rev, dict):
            raise ValueError("revisao.json não é um objeto JSON")
        listas = [l for l in (rev.get("listas") or []) if isinstance(l, dict)]
        resumo = rev.get("resumo") or {}
        # resumo não-dict é insumo ruim, não motivo para abortar: o cabeçalho sai com "—" nos três números.
        if not isinstance(resumo, dict):
            resumo = {}
    except (ValueError, OSError, AttributeError, TypeError) as exc:
        print(f"AVISO: revisao.json ilegível ({exc}) — domínio Revisão omitido.", file=sys.stderr)
        return None

    sb = ['<h2>Revisão</h2>', '<a href="#revisao/rev-resumo">Resumo</a>']
    parts = [
        '<article class="chapter" id="rev-resumo">'
        '<header class="chapter-header"><h2>Revisão do pré-projeto</h2>'
        '<span class="chapter-lead">revisao.json</span></header>'
        '<div class="md-content"><p>O que a revisão automática do harness encontrou ao cruzar os '
        'documentos do pré-projeto entre si. Nenhum item bloqueia a entrega: são os pontos que '
        'alguém precisa olhar antes de mandar ao cliente.</p>'
        f'<p><strong>{esc(_ou_dash(resumo.get("documentos")))}</strong> documento(s) lido(s) · '
        f'<strong>{esc(_ou_dash(resumo.get("totalApontamentos")))}</strong> apontamento(s) · '
        f'<strong>{esc(_ou_dash(resumo.get("gapsAbertos")))}</strong> GAP(s) em aberto</p></div></article>'
    ]
    for lista in listas:
        # itens escalar é insumo ruim, não motivo para abortar: `or []` deixa passar `5` (truthy)
        # e o len() adiante estoura TypeError, derrubando o build por causa de UMA lista torta.
        itens = lista.get("itens")
        if not isinstance(itens, list) or not itens:
            continue
        chave = str(lista.get("chave") or "lista")
        anchor = "rev-" + re.sub(r"[^a-z0-9]+", "-", chave.lower()).strip("-")
        titulo = str(lista.get("titulo") or lista.get("chave") or DASH)
        sb.append(f'<a href="#revisao/{anchor}">{esc(titulo)} ({len(itens)})</a>')
        lis = "".join(f"<li>{esc(str(i))}</li>" for i in itens)
        parts.append(
            f'<article class="chapter" id="{anchor}">'
            f'<header class="chapter-header"><h2>{esc(titulo)}</h2>'
            f'<span class="chapter-lead">{len(itens)} apontamento(s)</span></header>'
            f'<div class="md-content"><ul>{lis}</ul></div></article>'
        )
    return "\n".join(sb), "\n".join(parts)


# ---------------------------------------------------------------------------
# Domínio Qualidade & GAPs
# ---------------------------------------------------------------------------

def build_quality_domain(base_dir):
    """gaps.md + sync-log.md renderizados. Retorna (sidebar, content) ou None."""
    items = [
        ("Gaps e Respostas", "gaps.md", "q-gaps", "chapter-gaps"),
        ("Log de Sincronização", "sync-log.md", "q-sync", "chapter-sync"),
    ]
    sb, parts = ['<h2>Qualidade &amp; GAPs</h2>'], []
    found = False
    for title, rel, anchor, heavy_key in items:
        fp = os.path.join(base_dir, rel)
        if not os.path.exists(fp):
            continue
        found = True
        sb.append(f'<a href="#qualidade/{anchor}">{esc(title)}</a>')
        body = _md_to_html(read_file(fp), heavy_key)
        parts.append(
            f'<article class="chapter" id="{anchor}">'
            f'<header class="chapter-header"><h2>{esc(title)}</h2>'
            f'<span class="chapter-lead">{esc(rel)}</span></header>'
            f'<div class="md-content">{body}</div></article>'
        )
    if not found:
        return None
    return "\n".join(sb), "\n".join(parts)


# ---------------------------------------------------------------------------
# Shell / montagem
# ---------------------------------------------------------------------------

DEFAULT_BASE_DIR = "outputs/spec"

# --- Descoberta do espelho ativo de templates -------------------------------
# NUNCA hardcodar `.cursor/skills/...`: em projeto só-Claude (`.claude/`), rodando via
# `plugin/skills/` ou direto na fonte (`skills/`) o caminho não existe. Procura-se
# `spec-report/templates/` nos espelhos conhecidos, na ordem, e o próprio diretório
# irmão do script (`<espelho>/tools/../spec-report/templates`) como última rota.
# `--templates-dir` continua sendo o override explícito (vence a descoberta).
TEMPLATES_REL = os.path.join("spec-report", "templates")
TEMPLATES_MIRROR_ROOTS = (
    os.path.join(".cursor", "skills"),
    os.path.join(".claude", "skills"),
    os.path.join("plugin", "skills"),
    "skills",
)


def templates_dir_candidates():
    """Candidatos na ordem de descoberta (cwd primeiro, irmão do script no fim)."""
    cands = [os.path.join(root, TEMPLATES_REL) for root in TEMPLATES_MIRROR_ROOTS]
    sibling = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", TEMPLATES_REL)
    )
    cands.append(sibling)
    return cands


def discover_templates_dir(explicit=None, require_shell=True, announce=True):
    """Resolve o diretório de templates: override explícito > espelho COMPATÍVEL.

    A descoberta não elege pela mera existência de `report-shell.html`: cada candidato
    é inspecionado (versão do shell + placeholders + versão/seletores do CSS) e o
    PRIMEIRO COMPATÍVEL vence. Config «ambos» (`spec-init`) com `.cursor` desatualizado
    e `.claude` atual passa a eleger o `.claude` em vez de abortar.
    `require_shell=False` → só o `report-embedded.css` importa (kit AS-IS não monta shell).
    Nenhum candidato serve → exit 1 listando cada caminho e o motivo da rejeição.
    A linha informativa vai para stderr (mesmo stream do bloco `ERRO:`), senão o
    buffering do stdout inverte a ordem quando a saída é canalizada.
    """
    if explicit:
        return explicit
    rejected = []
    for cand in templates_dir_candidates():
        _, _, problems = inspect_templates_dir(cand, require_shell=require_shell)
        if not problems:
            if announce:
                print(f"Templates: {cand} (espelho descoberto)", file=sys.stderr)
                sys.stderr.flush()
            return cand
        rejected.append((cand, problems))
    print("ERRO: nenhum espelho conhecido tem `spec-report/templates/` compatível com "
          f"a v{REPORT_VERSION}.", file=sys.stderr)
    for cand, problems in rejected:
        print(f"  - {cand}: " + "; ".join(problems), file=sys.stderr)
    print(f"  {TEMPLATE_FIX_HINT}", file=sys.stderr)
    sys.stderr.flush()
    sys.exit(1)


# --- Guard de compatibilidade do template -----------------------------------
# Os templates são materializados POR PROJETO junto da skill (bundle/plugin).
# Rodando este script contra um report-shell.html antigo, todos os .replace() falhariam
# em silêncio e o kit sairia com "EXEC-SUMMARY-PLACEHOLDER" literal, zero data-domain e
# exit 0. Por isso: versão explícita + placeholders exigidos, validados ANTES de gravar.
REQUIRED_SHELL_TOKENS = (
    "<!-- <style> … report-embedded.css … </style> -->",
    "<!-- TOPNAV-PLACEHOLDER -->",
    "<!-- SIDEBARS-PLACEHOLDER -->",
    "<!-- DOMAINS-PLACEHOLDER -->",
    "<!-- MERMAID-PLACEHOLDER -->",
    "__DEFAULT_DOMAIN__",
    'data-default-domain="__DEFAULT_DOMAIN__"',
    "[Nome do Projeto]",
    "YYYY-MM-DD",
)
# Seletores que o HTML gerado depende para os domínios funcionarem.
REQUIRED_CSS_TOKENS = (
    "section.domain",
    ".sidebar-panel",
    ".topnav-link",
    ".warn-banner",
    ".warn-banner--tool",
)
SHELL_VERSION_RE = re.compile(r'data-shell-version\s*=\s*"([^"]+)"')
CSS_VERSION_RE = re.compile(r"report-embedded v([0-9]+(?:\.[0-9]+)?)")

TEMPLATE_FIX_HINT = (
    "Estes templates são materializados por projeto — re-rode "
    "a atualização do pacote de skills (ou aponte --templates-dir para "
    "`spec-report/templates` do espelho ativo)."
)


def inspect_templates_dir(templates_dir, require_shell=True):
    """Lê e INSPECIONA um candidato a espelho de templates — sem abortar.

    Devolve `(shell_html, css_content, problems)`. `problems` vazio = espelho
    compatível com a v{REPORT_VERSION}. É a função única usada tanto pela descoberta
    (para eleger o espelho compatível) quanto pelo guard `load_templates()` e pelo
    `generate-legacy-report.py` — a validação não é duplicada em lugar nenhum.

    `require_shell=False` valida apenas o `report-embedded.css` (o kit AS-IS reaproveita
    o tema mas monta o próprio shell).
    """
    shell_path = os.path.join(templates_dir, "report-shell.html")
    css_path = os.path.join(templates_dir, "report-embedded.css")
    needed = ([shell_path] if require_shell else []) + [css_path]

    missing_files = [p for p in needed if not os.path.exists(p)]
    if len(missing_files) == len(needed):
        return None, None, [f"espelho ausente/incompleto (nenhum de {', '.join(os.path.basename(p) for p in needed)})"]
    if missing_files:
        return None, None, [f"arquivo ausente: {p}" for p in missing_files]

    try:
        shell_html = read_file(shell_path) if require_shell else ""
        css_content = read_file(css_path)
    except (OSError, UnicodeDecodeError) as exc:
        return None, None, [f"falha ao ler template: {exc}"]

    problems = []

    if require_shell:
        m = SHELL_VERSION_RE.search(shell_html)
        if not m:
            problems.append(
                f'report-shell.html sem marcador de versão data-shell-version="{REPORT_VERSION}" '
                "(template anterior à v3.0 — domínios)"
            )
        elif m.group(1).strip() != REPORT_VERSION:
            problems.append(
                f"report-shell.html declara data-shell-version=\"{m.group(1).strip()}\", "
                f"o gerador exige \"{REPORT_VERSION}\""
            )

        absent = [t for t in REQUIRED_SHELL_TOKENS if t not in shell_html]
        if absent:
            problems.append("placeholders ausentes em report-shell.html: " + ", ".join(absent))

    mc = CSS_VERSION_RE.search(css_content)
    if not mc:
        problems.append(
            f"report-embedded.css sem marcador `report-embedded v{REPORT_VERSION}`"
        )
    elif mc.group(1).strip() != REPORT_VERSION:
        problems.append(
            f"report-embedded.css na versão {mc.group(1).strip()}, "
            f"o gerador exige {REPORT_VERSION}"
        )

    css_absent = [t for t in REQUIRED_CSS_TOKENS if t not in css_content]
    if css_absent:
        problems.append("seletores ausentes em report-embedded.css: " + ", ".join(css_absent))

    return shell_html, css_content, problems


def abort_incompatible_templates(templates_dir, problems):
    """Bloco `ERRO:` canônico do gate TEMPLATE_VERSION_MATCH (exit 1, nada gravado)."""
    print(f"ERRO: template do spec-report desatualizado/incompatível em '{templates_dir}'.",
          file=sys.stderr)
    for p in problems:
        print(f"  - {p}", file=sys.stderr)
    print(f"  {TEMPLATE_FIX_HINT}", file=sys.stderr)
    sys.stderr.flush()
    sys.exit(1)


def load_templates(templates_dir):
    """
    Lê e VALIDA report-shell.html + report-embedded.css.
    Aborta com exit 1 e mensagem acionável se faltar arquivo, versão ou placeholder —
    nunca gerar um HTML vazio com exit 0.
    """
    shell_html, css_content, problems = inspect_templates_dir(templates_dir)
    if problems:
        abort_incompatible_templates(templates_dir, problems)
    return shell_html, css_content


def assert_no_placeholder_left(html_text):
    """Rede de segurança pós-substituição: nada de placeholder literal no arquivo final."""
    leftovers = [t for t in REQUIRED_SHELL_TOKENS if t in html_text]
    leftovers += [t for t in ("EXEC-SUMMARY-PLACEHOLDER", "MODULES-NAV-PLACEHOLDER",
                              "CHAPTERS-PLACEHOLDER") if t in html_text]
    if leftovers:
        print("ERRO: placeholders não substituídos no HTML gerado: "
              + ", ".join(sorted(set(leftovers))), file=sys.stderr)
        print(f"  {TEMPLATE_FIX_HINT}", file=sys.stderr)
        sys.exit(1)
    if 'data-domain="' not in html_text:
        print("ERRO: HTML gerado sem nenhum data-domain — montagem de domínios falhou.",
              file=sys.stderr)
        print(f"  {TEMPLATE_FIX_HINT}", file=sys.stderr)
        sys.exit(1)


# --- Gate EXCLUSIONS_RESPECTED (FATAL, asserção explícita) -------------------
# A SKILL exclui estes artefatos do kit («Exclusões explícitas»). Hoje a lista `files`
# simplesmente não os inclui — a asserção abaixo é a rede que impede um futuro
# `files.append(...)` de furar a exclusão em silêncio.
EXCLUDED_BASENAMES = ("prototype.md", "frontend-decisions.md", "gaps-answers.md")


def assert_exclusions_respected(files):
    """Aborta (exit 1) se um artefato excluído entrar na lista de capítulos."""
    offending = []
    for entry in files:
        rel = entry[1].replace("\\", "/")
        if (os.path.basename(rel) in EXCLUDED_BASENAMES
                or rel.startswith("src/") or "/src/" in rel):
            offending.append(entry[1])
    if offending:
        print("ERRO: artefato excluído pela spec-report entrou na lista de capítulos: "
              + ", ".join(sorted(set(offending))), file=sys.stderr)
        print("  Exclusões: " + ", ".join(EXCLUDED_BASENAMES)
              + ", qualquer caminho sob src/ (ver SKILL.md «Exclusões explícitas»).",
              file=sys.stderr)
        sys.exit(1)


# --- Gate CAPA_HAS_CONCLUSIONS (WARNING) ------------------------------------
# capa.md é OPCIONAL (gate CAPA_EXISTS_AND_FILLED) — logo a completude dela não pode
# ser FATAL: seria contradição interna. Quando a capa existe e está preenchida mas sem
# o fecho narrativo do Passo 3, o script avisa e segue.
CAPA_CONCLUSIONS_RE = re.compile(
    r"^##\s+Conclus[õo]es\s+e\s+Pr[óo]ximos\s+Passos", re.MULTILINE | re.IGNORECASE
)
CAPA_CONCLUSIONS_SUBSECTIONS = (
    ("O que foi descoberto", re.compile(r"^###\s+O que foi descoberto", re.MULTILINE | re.IGNORECASE)),
    ("O que o produto vai ser", re.compile(r"^###\s+O que o produto vai ser", re.MULTILINE | re.IGNORECASE)),
    ("Premissas aceitas", re.compile(r"^###\s+Premissas aceitas", re.MULTILINE | re.IGNORECASE)),
    ("Riscos identificados", re.compile(r"^###\s+Riscos identificados", re.MULTILINE | re.IGNORECASE)),
    ("Próximos passos (tabela)", re.compile(r"^###\s+Pr[óo]ximos passos", re.MULTILINE | re.IGNORECASE)),
)


def warn_capa_conclusions(capa_text):
    """Avisa (nunca aborta) quando falta o `## Conclusões e Próximos Passos` da capa."""
    m = CAPA_CONCLUSIONS_RE.search(capa_text)
    if not m:
        print("AVISO: capa.md sem a seção `## Conclusões e Próximos Passos` "
              "(Passo 3 da spec-report) — o kit sai sem o fecho narrativo.")
        return
    bloco = capa_text[m.start():]
    faltando = [label for label, rx in CAPA_CONCLUSIONS_SUBSECTIONS if not rx.search(bloco)]
    if not faltando and not re.search(r"^\s*\|", bloco, re.MULTILINE):
        faltando.append("tabela de próximos passos")
    if faltando:
        print("AVISO: `## Conclusões e Próximos Passos` da capa.md incompleta — faltam: "
              + ", ".join(faltando) + ".")


# Capítulos que o domínio «Qualidade & GAPs» já renderiza (q-gaps / q-sync).
# Quando esse domínio existe, sair de Documentos evita renderizar o MESMO
# gaps.md/sync-log.md duas vezes no mesmo arquivo.
QUALITY_DUP_ANCHORS = {
    "chapter-gaps": ("q-gaps", "Gaps e respostas"),
    "chapter-sync": ("q-sync", "Log de sincronização"),
}
DOC_ANCHOR_FILES = {
    "chapter-gaps": "gaps.md",
    "chapter-sync": "sync-log.md",
}

# Grupos da sidebar clássica do domínio Documentos (modo compatibilidade)
DOC_GROUPS = [
    ("Documentos completos", ["chapter-vision", "chapter-rules", "chapter-requirements", "chapter-ux"]),
    ("Mercado", ["chapter-benchmark"]),
    ("Legado AS-IS", ["chapter-legacy", "chapter-architecture", "chapter-analysis", "chapter-threats"]),
    ("Governança", ["chapter-gaps", "chapter-sync"]),
    ("Contexto bruto", ["chapter-discovery", "chapter-context"]),
]

NAV_LABELS = {
    "chapter-vision": "Visão de produto",
    "chapter-rules": "Regras de negócio",
    "chapter-requirements": "Requisitos do sistema",
    "chapter-ux": "Requisitos de UX",
    "chapter-benchmark": "Benchmark",
    "chapter-legacy": "Legado AS-IS",
    "chapter-architecture": "Arquitetura AS-IS",
    "chapter-analysis": "Análise de legado",
    "chapter-threats": "Modelo de ameaças",
    "chapter-gaps": "Gaps e respostas",
    "chapter-sync": "Log de sincronização",
    "chapter-discovery": "Descoberta",
    "chapter-context": "Mapa de contexto",
}


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Compila os artefatos de outputs/spec/ num HTML único por domínios (spec-report)."
    )
    parser.add_argument(
        "--base-dir",
        default=DEFAULT_BASE_DIR,
        help=f"Pasta com os artefatos .md (default: {DEFAULT_BASE_DIR})",
    )
    parser.add_argument(
        "--templates-dir",
        default=None,
        help=("Pasta com report-shell.html e report-embedded.css. Default: descoberta do "
              "primeiro espelho COMPATÍVEL (versão + placeholders + CSS) — "
              "`spec-report/templates` em "
              + ", ".join(TEMPLATES_MIRROR_ROOTS)
              + " (nessa ordem), ou o diretório irmão do próprio script."),
    )
    parser.add_argument(
        "--screenshot-max-kb",
        type=float,
        default=None,
        metavar="KB",
        help=("Cap por screenshot embutido em base64 (default: "
              f"{SCREENSHOT_MAX_KB_DEFAULT} KB; env SPEC_REPORT_SCREENSHOT_MAX_KB). "
              "Acima do cap a captura é referenciada por link, com aviso."),
    )
    parser.add_argument(
        "--screenshot-total-max-mb",
        type=float,
        default=None,
        metavar="MB",
        help=("Cap agregado de screenshots embutidos (default: "
              f"{SCREENSHOT_TOTAL_MAX_MB_DEFAULT} MB; env "
              "SPEC_REPORT_SCREENSHOT_TOTAL_MAX_MB)."),
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"generate-report.py {REPORT_VERSION} (shell/CSS v{REPORT_VERSION})",
    )
    return parser.parse_args(argv)


def main():
    args = parse_args()
    base_dir = args.base_dir
    templates_dir = discover_templates_dir(args.templates_dir)
    configure_screenshot_budget(args.screenshot_max_kb, args.screenshot_total_max_mb)

    # Guard PRIMEIRO: template incompatível aborta antes de qualquer trabalho/escrita.
    shell_html, css_content = load_templates(templates_dir)

    report_dir = os.path.join(base_dir, "report")
    os.makedirs(report_dir, exist_ok=True)

    # Ordem do kit HTML (stakeholder-first): visão e requisitos cedo; descoberta bruta no final.
    # Capítulos omitidos se o arquivo não existir (ex.: legado skipped só com legacy.md curto).
    files = [
        ("Capa & Sumário", "capa.md", "chapter-cover"),
        ("Visão de Produto", "product-vision/product-vision.md", "chapter-vision"),
        ("Regras de Negócio", "business-rules.md", "chapter-rules"),
        ("Requisitos do Sistema (RF/RNF por módulo)", "requirements/requirements.md", "chapter-requirements"),
        ("Requisitos de UX (PR por módulo)", "product-requirements/product-requirements.md", "chapter-ux"),
        ("Benchmark", "benchmark.md", "chapter-benchmark"),
        ("Legado AS-IS", "legacy.md", "chapter-legacy"),
        ("Arquitetura AS-IS", "architecture.md", "chapter-architecture"),
        ("Análise de Legado", "legacy-analysis.md", "chapter-analysis"),
        ("Modelo de Ameaças", "threat-model.md", "chapter-threats"),
        ("Gaps e Respostas", "gaps.md", "chapter-gaps"),
        ("Log de Sincronização", "sync-log.md", "chapter-sync"),
        ("Descoberta", "discovery-document.md", "chapter-discovery"),
        ("Mapa de Contexto", "context-map.md", "chapter-context"),
    ]

    # Gate FATAL EXCLUSIONS_RESPECTED — asserção explícita sobre a lista acima.
    assert_exclusions_respected(files)

    # capa.md é OPCIONAL. Se existir e estiver preenchida (não-stub, ≥ 200 chars),
    # vira o capítulo "Capa & Sumário" no domínio Visão Geral.
    capa_path = os.path.join(base_dir, "capa.md")
    has_capa = False
    if os.path.exists(capa_path):
        capa_text = read_file(capa_path)
        if (not any(m in capa_text for m in _PROJECT_NAME_STUBS)
                and len(capa_text.strip()) >= 200):
            has_capa = True
            warn_capa_conclusions(capa_text)  # gate CAPA_HAS_CONCLUSIONS (WARNING)
    if not has_capa:
        print("AVISO: capa.md ausente/stub — resumo executivo será gerado automaticamente.")
    files = [f for f in files if f[1] != "capa.md"]  # capa renderizada no domínio Visão Geral

    # ------------------------------------------------------------------
    # Flow-map (via check-flowmap.py --json — parser não é reimplementado)
    # ------------------------------------------------------------------
    fm = run_flowmap_check(base_dir)
    fm_valid = bool(fm and fm.get("ok"))
    fm_tool_error = (fm or {}).get("tool_error")
    fm_tool_detail = (fm or {}).get("tool_detail", "")
    # Erros de gramática só existem quando a FERRAMENTA rodou.
    fm_errors = list(fm.get("erros", [])) if (fm and not fm_tool_error) else []
    if fm_tool_error:
        print(f"AVISO: {fm_tool_error} — {fm_tool_detail} "
              "Domínio Fluxos & Telas omitido; isto NÃO indica erro no flow-map.md.",
              file=sys.stderr)
    elif fm is not None and not fm_valid:
        print(f"AVISO: flow-map.md inválido ({len(fm_errors)} erro(s)) — domínio Fluxos & Telas omitido.")

    # ------------------------------------------------------------------
    # Demais domínios — construídos ANTES de Documentos/Visão Geral porque:
    #  · Documentos precisa saber se «Qualidade & GAPs» existe (dedup gaps/sync);
    #  · Visão Geral precisa do saldo de screenshots (aviso de cap) do domínio Fluxos.
    # ------------------------------------------------------------------
    flow_domain = build_flow_domain(fm, base_dir) if fm_valid else None
    tech_domain = build_tech_domain(base_dir, fm if fm_valid else None)
    quality_domain = build_quality_domain(base_dir)
    review_domain = build_review_domain(base_dir)

    # gaps.md / sync-log.md são renderizados por «Qualidade & GAPs» (q-gaps/q-sync):
    # quando esse domínio existe, sair de Documentos evita o MESMO arquivo duas vezes.
    dedup_anchors = set(QUALITY_DUP_ANCHORS) if quality_domain else set()
    dedup_present = 0
    if dedup_anchors:
        kept = []
        for entry in files:
            if entry[2] in dedup_anchors:
                if os.path.exists(os.path.join(base_dir, entry[1])):
                    dedup_present += 1  # continua no kit, só em «Qualidade & GAPs»
                continue
            kept.append(entry)
        files = kept

    # ------------------------------------------------------------------
    # Domínio Documentos (modo compatibilidade)
    # ------------------------------------------------------------------
    modules_sections_html, module_nav_links = build_module_pivot(base_dir)

    modules_article = ""
    if modules_sections_html:
        modules_article = f'''
        <article class="chapter" id="chapter-modules" data-chapter="chapter-modules">
            <header class="chapter-header">
                <h2>Especificação por Módulo</h2>
                <span class="chapter-lead">requirements · business-rules · product-requirements · gaps</span>
            </header>
            <div class="md-content modules-pivot">
                {modules_sections_html}
            </div>
        </article>
        '''

    docs_articles = modules_article
    present_anchors = {}
    for title, rel_path, anchor in files:
        filepath = os.path.join(base_dir, rel_path)
        if not os.path.exists(filepath):
            continue
        present_anchors[anchor] = title
        html_chunk = _md_to_html(read_file(filepath), anchor)
        docs_articles += f'''
            <article class="chapter" id="{anchor}" data-chapter="{anchor}">
                <header class="chapter-header">
                    <h2>{title}</h2>
                    <span class="chapter-lead">{esc(os.path.basename(filepath))}</span>
                </header>
                <div class="md-content">
                    {html_chunk}
                </div>
            </article>
            '''

    # Sidebar clássica de Documentos
    docs_sb = []
    if has_capa:
        docs_sb.append('<h2>Abertura</h2>')
        docs_sb.append('<a href="#visao/chapter-cover">Capa &amp; Sumário</a>')
    if module_nav_links:
        docs_sb.append('<h2>Especificação por módulo</h2>')
        docs_sb.append('<a href="#documentos/chapter-modules">Visão geral</a>')
        for anchor, label in module_nav_links:
            docs_sb.append(f'<a href="#documentos/{anchor}" class="nav-module-link">{esc(label)}</a>')
    for group, anchors in DOC_GROUPS:
        present = [a for a in anchors if a in present_anchors]
        # Capítulos movidos para «Qualidade & GAPs»: em vez de link órfão (ou grupo
        # vazio), a sidebar de Documentos aponta para a âncora do outro domínio.
        moved = [a for a in anchors if a in dedup_anchors
                 and os.path.exists(os.path.join(base_dir, DOC_ANCHOR_FILES[a]))]
        if not present and not moved:
            continue
        docs_sb.append(f'<h2>{esc(group)}</h2>')
        for a in present:
            docs_sb.append(f'<a href="#documentos/{a}">{esc(NAV_LABELS.get(a, present_anchors[a]))}</a>')
        for a in moved:
            q_anchor, q_label = QUALITY_DUP_ANCHORS[a]
            docs_sb.append(f'<a href="#qualidade/{q_anchor}">{esc(q_label)} ↗</a>')
    docs_sidebar = "\n".join(docs_sb)

    # ------------------------------------------------------------------
    # Domínio Visão Geral
    # ------------------------------------------------------------------
    project_name = extract_project_name(base_dir)
    if project_name == PROJECT_NAME_FALLBACK:
        print(f"AVISO: nome do projeto não encontrado em capa.md nem em "
              f"product-vision/product-vision.md — usando \"{PROJECT_NAME_FALLBACK}\".")
    # gaps/sync deduplicados continuam no kit (domínio Qualidade) — contam no total.
    files_total = len(files) + 1 + len(dedup_anchors)  # + capa
    files_present = len(present_anchors) + (1 if has_capa else 0) + dedup_present
    module_count = len(module_nav_links)
    exec_summary_html = build_auto_summary(base_dir, project_name, module_count, files_present, files_total)

    visao_parts = []
    if fm_tool_error:
        # FERRAMENTA indisponível ≠ flow-map inválido: aviso AMARELO (role="status"),
        # sem acusar erro de gramática que ninguém verificou.
        visao_parts.append(
            '<section class="warn-banner warn-banner--tool" role="status">'
            '<h2 class="warn-banner__title">Validador de flow-map indisponível — '
            'domínio «Fluxos &amp; Telas» omitido</h2>'
            '<p>O <code>flow-map.md</code> existe, mas <strong>não pôde ser validado</strong> '
            f'(<code>{esc(fm_tool_error)}</code>) — o conteúdo do flow-map pode estar '
            'perfeitamente correto. Restabeleça a ferramenta e gere o kit novamente para '
            'recuperar o domínio Fluxos &amp; Telas.</p>'
            f'<ul><li>{esc(fm_tool_detail)}</li></ul></section>'
        )
    elif fm is not None and not fm_valid:
        err_items = "".join(f"<li>{esc(e)}</li>" for e in fm_errors[:30])
        more = f"<li>… e mais {len(fm_errors) - 30} erro(s)</li>" if len(fm_errors) > 30 else ""
        visao_parts.append(
            '<section class="warn-banner" role="alert">'
            '<h2 class="warn-banner__title">flow-map.md inválido — domínio «Fluxos &amp; Telas» omitido</h2>'
            '<p>O validador <code>check-flowmap.py</code> encontrou erros de gramática/integridade. '
            'Corrija <code>outputs/spec/flow-map.md</code> e gere o kit novamente.</p>'
            f'<ul>{err_items}{more}</ul></section>'
        )
    shots_warning = build_screenshot_warning()
    if shots_warning:
        visao_parts.append(shots_warning)
    visao_parts.append(exec_summary_html)
    visao_parts.append(
        '<section class="reading-guide" aria-label="Como ler este documento">'
        '<p class="reading-guide__title">Como ler este documento</p>'
        '<p>Este kit reúne toda a documentação de discovery do produto, organizada em domínios no '
        'menu superior — <em>Visão Geral</em>, <em>Documentos</em>'
        + (', <em>Fluxos &amp; Telas</em>' if fm_valid else '') +
        ' e demais quando houver conteúdo. O índice à esquerda muda conforme o domínio ativo. '
        'As tabelas de rastreabilidade mais densas ficam recolhidas por padrão — clique em '
        '<em>“Expandir todas”</em> no topo de cada capítulo quando precisar do detalhe.</p>'
        '<p class="reading-guide__legend-title">Siglas usadas ao longo do documento</p>'
        '<ul class="legend">'
        '<li class="legend__item"><span class="legend__badge">F-000</span> Fato observado no discovery (com evidência)</li>'
        '<li class="legend__item"><span class="legend__badge legend__badge--rf">RF / RNF</span> Requisito funcional / não funcional</li>'
        '<li class="legend__item"><span class="legend__badge legend__badge--rn">RN</span> Regra de negócio (política ou restrição)</li>'
        '<li class="legend__item"><span class="legend__badge legend__badge--mod">MOD</span> Módulo do produto</li>'
        '<li class="legend__item"><span class="legend__badge legend__badge--gap">GAP</span> Lacuna — decisão pendente do negócio</li>'
        '<li class="legend__item"><span class="legend__badge legend__badge--asis">AS-IS</span> Situação atual do legado</li>'
        '<li class="legend__item"><span class="legend__badge">FLX/ETP/TEL/TRS</span> Fluxo / Etapa / Tela / Transição (flow-map)</li>'
        '</ul></section>'
    )
    if has_capa:
        capa_html = _md_to_html(read_file(capa_path), "chapter-cover")
        visao_parts.append(
            '<article class="chapter" id="chapter-cover" data-chapter="chapter-cover">'
            '<header class="chapter-header"><h2>Capa &amp; Sumário</h2>'
            '<span class="chapter-lead">capa.md</span></header>'
            f'<div class="md-content">{capa_html}</div></article>'
        )
    if fm_valid:
        visao_parts.append(
            f'<div id="cobertura-visao">{build_coverage_panel(fm.get("metricas", {}), fm.get("avisos", []))}</div>'
            '<p class="muted">Detalhe completo no domínio <a href="#fluxos">Fluxos &amp; Telas</a>.</p>'
        )

    visao_sb = ['<h2>Visão geral</h2>', '<a href="#visao">Resumo executivo</a>']
    if has_capa:
        visao_sb.append('<a href="#visao/chapter-cover">Capa &amp; Sumário</a>')
    if fm_valid:
        visao_sb.append('<a href="#visao/cobertura-visao">Cobertura de fluxos</a>')
    visao_sidebar = "\n".join(visao_sb)

    # ------------------------------------------------------------------
    # Montagem dos domínios (flow/tech/revisão/quality já construídos acima)
    # ------------------------------------------------------------------
    domains = [("visao", "Visão Geral", visao_sidebar, "\n".join(visao_parts))]
    if docs_articles.strip():
        domains.append(("documentos", "Documentos", docs_sidebar, docs_articles))
    if flow_domain:
        domains.append(("fluxos", "Fluxos & Telas", flow_domain[0], flow_domain[1]))
    if tech_domain:
        domains.append(("tecnico", "Técnico", tech_domain[0], tech_domain[1]))
    if review_domain:
        domains.append(("revisao", "Revisão", review_domain[0], review_domain[1]))
    if quality_domain:
        domains.append(("qualidade", "Qualidade & GAPs", quality_domain[0], quality_domain[1]))

    # Landing: «Visão Geral» SEMPRE que o domínio existir (capa + resumo executivo são
    # o topo do documento, como sempre foram). O flow-map não decide a landing —
    # abrir em Documentos escondia a capa atrás de uma aba em todo projeto sem flow-map.
    domain_ids = [d[0] for d in domains]
    default_domain = "visao" if "visao" in domain_ids else domain_ids[0]

    topnav_html = "\n".join(
        f'      <a class="topnav-link" data-domain="{did}" href="#{did}">{esc(label)}</a>'
        for did, label, _sb, _ct in domains
    )
    sidebars_html = "\n".join(
        f'      <div class="sidebar-panel" data-domain="{did}">\n{sb}\n      </div>'
        for did, _label, sb, _ct in domains
    )
    domains_html = "\n".join(
        f'        <section class="domain" data-domain="{did}" aria-label="{esc(label)}">\n{ct}\n        </section>'
        for did, label, _sb, ct in domains
    )

    # ------------------------------------------------------------------
    # Shell + CSS (já lidos e validados por load_templates() no início de main())
    # ------------------------------------------------------------------
    shell_html = shell_html.replace(
        '<!-- <style> … report-embedded.css … </style> -->',
        f"<style>\n{css_content}\n</style>",
    )

    all_content = topnav_html + sidebars_html + domains_html
    needs_mermaid = '<pre class="mermaid">' in all_content
    mermaid_tag = (
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"></script>'
        if needs_mermaid else ''
    )

    shell_html = shell_html.replace('<!-- TOPNAV-PLACEHOLDER -->', topnav_html)
    shell_html = shell_html.replace('<!-- SIDEBARS-PLACEHOLDER -->', sidebars_html)
    shell_html = shell_html.replace('<!-- DOMAINS-PLACEHOLDER -->', domains_html)
    shell_html = shell_html.replace('<!-- MERMAID-PLACEHOLDER -->', mermaid_tag)
    shell_html = shell_html.replace('__DEFAULT_DOMAIN__', default_domain)
    shell_html = shell_html.replace('[Nome do Projeto]', project_name)
    shell_html = shell_html.replace('YYYY-MM-DD', date.today().isoformat())

    # Rede de segurança: nada de HTML com placeholder literal / sem domínios.
    assert_no_placeholder_left(shell_html)

    output_path = os.path.join(report_dir, "product-discovery-kit.html")
    with codecs.open(output_path, 'w', 'utf-8') as f:
        f.write(shell_html)
    dom_list = ", ".join(d[0] for d in domains)
    print(f"Relatório gerado em {output_path} (spec-report v{REPORT_VERSION})")
    print(f"Domínios: {dom_list} · default: {default_domain}")
    budget = SCREENSHOT_BUDGET
    if budget["embedded"] or budget["skipped"]:
        print(f"Screenshots: {budget['embedded']} embutida(s) "
              f"({_fmt_bytes(budget['used_bytes'])}) · {len(budget['skipped'])} referenciada(s) por link")
    for tid, size, motivo in budget["skipped"]:
        print(f"AVISO: screens/{tid}.png não embutido — {motivo} ({_fmt_bytes(size)}); "
              "o HTML referencia o arquivo por link relativo.", file=sys.stderr)


if __name__ == "__main__":
    main()
