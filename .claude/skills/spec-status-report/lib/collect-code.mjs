// collect-code.mjs — resumo do código implementado, em qualquer linguagem.
//
// Responde a quatro perguntas do relatório:
//   1. Quanto foi escrito?          → inventário poliglota (arquivos, LOC por linguagem,
//                                      produção vs teste vs config vs doc) + dependências
//   2. Como foi construído ao longo → HISTÓRICO: commits, ritmo semanal, autores, dias
//      do tempo?                      ativos, merges, releases, hotspots de alteração
//   3. Onde cada coisa de negócio   → rastreabilidade por ID (vocabulário completo, inclui
//      foi implementada?               os prefixos de versões anteriores do kit)
//   4. Que decisões foram tomadas?  → ADRs, spec_story.md, rules aplicadas, dívida declarada
//
// Não interpreta semântica: reporta ocorrências com arquivo:linha e deixa a leitura para
// quem lê. Nenhuma inferência silenciosa.

import { basename, join } from "node:path";
import {
  commandAvailable, dirExists, fileExists, findByPatterns, pct, readJson, readText,
  relPosix, run, truncate, uniq, walkFiles,
} from "./util.mjs";
import {
  CI_MARKERS, ECOSYSTEM_MANIFESTS, categoryOf, isCountedAsCode, isNonSource, isTestPath,
  isTraceable, languageOf, profileOf, unknownExtensionOf,
} from "./languages.mjs";
import { buildIdRegex, idFamily } from "./discover-artifacts.mjs";
import { pathPrefixer } from "./resolve-scope.mjs";

const SKIP_TOP = new Set([
  "outputs", "inputs", "skills", ".cursor", ".claude", ".claude-plugin", "plugin",
  "deprecated", ".husky",
]);

/**
 * Inventário, rastreabilidade e dívida do código.
 *
 * `roots` é a lista de pastas DECLARADAS pelo usuário (ver resolve-scope.mjs). Sem ela,
 * varre a raiz — comportamento histórico. Com mais de uma, o caminho de cada arquivo é
 * prefixado pelo rótulo da pasta: dois `src/main/java/Service.java` de repositórios
 * diferentes colidiriam no inventário, nos hotspots e nos maiores arquivos, e o
 * relatório somaria dois arquivos distintos como se fossem um.
 *
 * O orçamento de `maxFiles` é REPARTIDO entre as pastas, não aplicado a cada uma: com
 * quatro repositórios, o limite por pasta multiplicaria por quatro o custo da varredura
 * e o «inventário truncado» deixaria de significar o que diz.
 */
export function collectCode(root, { maxFiles = 20_000, docs = null, sinceRef = null, roots = null } = {}) {
  const scopeRoots = (roots && roots.length)
    ? roots
    : [{ dir: root, label: "", rel: ".", kind: "root" }];
  const prefixOf = pathPrefixer(scopeRoots);

  const perRoot = Math.max(500, Math.floor(maxFiles / scopeRoots.length));
  const scanned = [];
  let truncated = false;
  for (const r of scopeRoots) {
    const w = walkFiles(r.dir, { maxFiles: perRoot });
    truncated = truncated || w.truncated;
    for (const abs of w.files) scanned.push({ abs, owner: r });
  }
  const files = scanned;
  const inventory = {
    fileCount: 0,
    codeFileCount: 0,
    testFileCount: 0,
    totalLines: 0,
    codeLines: 0,
    commentLines: 0,
    blankLines: 0,
    testLines: 0,
    prodLines: 0,
    byLanguage: [],
    byCategory: [],
    byTopDir: [],
    largestFiles: [],
    truncated,
  };
  const langMap = new Map();
  const catMap = new Map();
  const dirMap = new Map();
  const traces = new Map();
  const todos = [];
  const codeFiles = [];
  const unknownExts = new Map();
  const testNameIndex = new Map();
  const ID_RE = buildIdRegex();

  for (const { abs, owner } of files) {
    const rel = prefixOf(owner, abs);
    // Com escopo declarado, o "diretório de topo" é a própria pasta declarada — é o
    // agrupamento que o leitor reconhece (gateway, módulo, monólito), não a primeira
    // pasta de dentro de cada repositório.
    const top = scopeRoots.length > 1
      ? owner.label
      : (rel.includes("/") ? rel.split("/")[0] : "(raiz)");
    if (scopeRoots.length === 1 && SKIP_TOP.has(top)) continue;
    inventory.fileCount++;

    const traceable = isTraceable(rel);
    const counted = isCountedAsCode(rel);
    if (!traceable && !counted) {
      const ext = isNonSource(rel) ? null : unknownExtensionOf(rel);
      if (ext) unknownExts.set(ext, (unknownExts.get(ext) || 0) + 1);
      continue;
    }

    const text = readText(abs);
    if (text === null) continue;
    const lines = text.split(/\r?\n/);
    const isTest = isTestPath(rel);
    const profile = profileOf(rel);
    const category = categoryOf(rel);

    if (counted) {
      const stats = lineStats(lines, profile.comments);
      inventory.codeFileCount++;
      inventory.totalLines += lines.length;
      inventory.codeLines += stats.code;
      inventory.commentLines += stats.comment;
      inventory.blankLines += stats.blank;
      if (isTest) { inventory.testFileCount++; inventory.testLines += lines.length; }
      else inventory.prodLines += lines.length;

      const lang = languageOf(rel);
      const l = langMap.get(lang) || { language: lang, files: 0, lines: 0, codeLines: 0, testFiles: 0, ecosystem: profile.ecosystem };
      l.files++; l.lines += lines.length; l.codeLines += stats.code; if (isTest) l.testFiles++;
      langMap.set(lang, l);

      const c = catMap.get(category) || { category, files: 0, lines: 0 };
      c.files++; c.lines += lines.length;
      catMap.set(category, c);

      const d = dirMap.get(top) || { dir: top, files: 0, lines: 0, testFiles: 0 };
      d.files++; d.lines += lines.length; if (isTest) d.testFiles++;
      dirMap.set(top, d);

      codeFiles.push({ rel, lines: lines.length, isTest, lang, category });
    }

    // Índice nome-do-teste → arquivo. Vários runners (node:test, ExUnit, Minitest) não
    // dizem de qual arquivo veio cada caso; sem isso, um teste em `tests/e2e/` não pode
    // ser classificado como funcional. O nome declarado no fonte é a ponte.
    if (isTest && counted) {
      for (const nm of extractTestNames(text)) {
        if (!testNameIndex.has(nm)) testNameIndex.set(nm, rel);
      }
    }

    // rastreabilidade + dívida (também em config/doc técnico)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 2000) continue;
      ID_RE.lastIndex = 0;
      const ids = line.match(ID_RE);
      if (ids) {
        for (const id of uniq(ids)) {
          const list = traces.get(id) || [];
          if (list.length < 40) list.push({ file: rel, line: i + 1, snippet: truncate(line.trim(), 200), isTest });
          traces.set(id, list);
        }
      }
      if (counted && todos.length < 400) {
        const todo = /\b(TODO|FIXME|HACK|XXX|D[IÍ]VIDA|WORKAROUND|GAMBIARRA)\b[:\s-]*(.*)/i.exec(line);
        if (todo) todos.push({ file: rel, line: i + 1, kind: todo[1].toUpperCase(), text: truncate(todo[2] || "", 180) });
      }
    }
  }

  inventory.byLanguage = [...langMap.values()].sort((a, b) => b.lines - a.lines);
  inventory.byCategory = [...catMap.values()].sort((a, b) => b.lines - a.lines);
  inventory.byTopDir = [...dirMap.values()].sort((a, b) => b.lines - a.lines);
  inventory.largestFiles = codeFiles.slice().sort((a, b) => b.lines - a.lines).slice(0, 15);
  inventory.testRatio = inventory.codeFileCount ? pct(inventory.testFileCount, inventory.codeFileCount) : null;
  inventory.commentRatio = inventory.totalLines ? pct(inventory.commentLines, inventory.totalLines) : null;
  inventory.testLineRatio = inventory.totalLines ? pct(inventory.testLines, inventory.totalLines) : null;
  inventory.unknownExtensions = [...unknownExts.entries()]
    .map(([ext, files]) => ({ ext, files })).sort((a, b) => b.files - a.files).slice(0, 20);

  const traceability = buildTraceability(traces, docs);
  // git/ADR/stack/CI por pasta declarada: num escopo multi-repo cada pasta é um
  // repositório com o seu próprio histórico. `mergeGit` soma o que é somável e mantém
  // a lista por repositório para o relatório poder mostrar as duas leituras.
  const gitPerRoot = scopeRoots.map((r) => ({ label: r.label, rel: r.rel, git: collectGit(r.dir, sinceRef) }));
  const git = mergeGit(gitPerRoot, scopeRoots.length > 1);
  const decisions = mergeDecisions(scopeRoots.map((r) => collectDecisions(r.dir)));
  const stacks = dedupeBy(scopeRoots.flatMap((r) => detectStacks(r.dir)), (x) => x.label);
  const ci = dedupeBy(scopeRoots.flatMap((r) => detectCi(r.dir)), (x) => x.name);

  return {
    inventory,
    testNameIndex: [...testNameIndex.entries()].map(([name, file]) => ({ name, file })),
    traceability,
    todos: { total: todos.length, byKind: countBy(todos, "kind"), items: todos.slice(0, 120) },
    git,
    decisions,
    stacks,
    ci,
    modulesOnDisk: detectModuleDirs(scopeRoots[0].dir),
    scopeRoots: scopeRoots.map((r) => ({ label: r.label, rel: r.rel, kind: r.kind })),
  };
}

/**
 * Nomes de teste declarados no fonte, em qualquer linguagem.
 * Cobre `test("…")`, `it('…')`, `describe`, `Scenario`, `func TestX`, `def test_x`,
 * `void deveX()`, `Scenario:` do Gherkin e `@Test`.
 */
export function extractTestNames(text) {
  const out = new Set();
  const src = String(text || "");
  const quoted = /(?:^|[^\w.])(?:test|it|its|specify|scenario|example|Scenario|Example|Then|When|Given|context)\s*\(\s*(['"`])([^'"`\n]{3,200})\1/g;
  let m;
  while ((m = quoted.exec(src))) out.add(m[2].trim());
  const gherkin = /^\s*(?:Scenario|Cenário|Scenario Outline|Esquema do Cenário)\s*:\s*(.+)$/gim;
  while ((m = gherkin.exec(src))) out.add(m[1].trim());
  const goFunc = /^\s*func\s+(Test[A-Za-z0-9_]+)\s*\(/gm;
  while ((m = goFunc.exec(src))) out.add(m[1]);
  const pyDef = /^\s*(?:async\s+)?def\s+(test_[A-Za-z0-9_]+)\s*\(/gm;
  while ((m = pyDef.exec(src))) out.add(m[1]);
  const jvmMethod = /(?:@Test[\s\S]{0,120}?)\b(?:public|private|internal|fun)\s+[\w<>,\s[\]]*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  while ((m = jvmMethod.exec(src))) out.add(m[1]);
  const csMethod = /(?:\[(?:Fact|Test|TestMethod|Theory)\][\s\S]{0,160}?)\bpublic\s+[\w<>,\s[\]]*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  while ((m = csMethod.exec(src))) out.add(m[1]);
  return [...out];
}

/**
 * Contagem de linhas respeitando a sintaxe de comentário DA LINGUAGEM.
 * Contar `#` como comentário em Java, ou `//` em Python, produz número errado — e número
 * errado num relatório para cliente é pior do que número ausente.
 */
export function lineStats(lines, comments) {
  const lineMarks = comments?.line || [];
  const blocks = comments?.block || [];
  const docstrings = comments?.docstring || [];
  let code = 0; let comment = 0; let blank = 0;
  let openBlock = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { blank++; continue; }

    if (openBlock) {
      comment++;
      if (line.includes(openBlock)) openBlock = null;
      continue;
    }

    // docstring/heredoc que também é comentário de documentação
    const ds = docstrings.find(([open]) => line.startsWith(open));
    if (ds) {
      comment++;
      const rest = line.slice(ds[0].length);
      if (!rest.includes(ds[1])) openBlock = ds[1];
      continue;
    }

    if (lineMarks.some((mk) => line.startsWith(mk))) { comment++; continue; }

    const blk = blocks.find(([open]) => line.startsWith(open));
    if (blk) {
      comment++;
      if (!line.slice(blk[0].length).includes(blk[1])) openBlock = blk[1];
      continue;
    }

    code++;
  }
  return { code, comment, blank };
}

function buildTraceability(traces, docs) {
  const byId = [...traces.entries()].map(([id, refs]) => ({
    id,
    prefix: idFamily(id),
    refCount: refs.length,
    files: uniq(refs.map((r) => r.file)),
    prodFiles: uniq(refs.filter((r) => !r.isTest).map((r) => r.file)),
    testFiles: uniq(refs.filter((r) => r.isTest).map((r) => r.file)),
    refs: refs.slice(0, 12),
  })).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));

  const found = new Set(byId.map((x) => x.id));
  const declared = {
    RN: (docs?.business?.rules || []).map((r) => ({ id: r.id, title: r.title, module: r.module })),
    RF: (docs?.business?.requirements?.functional || []).map((r) => ({ id: r.id, title: r.title, module: r.module })),
    RNF: (docs?.business?.requirements?.nonFunctional || []).map((r) => ({ id: r.id, title: r.title, module: r.module })),
    PR: (docs?.business?.productRequirements || []).map((r) => ({ id: r.id, title: r.title, module: r.module })),
    MOD: (docs?.business?.modules || []).map((m) => ({ id: m.id, title: m.name, module: m.id })),
  };

  const coverage = {};
  for (const [prefix, items] of Object.entries(declared)) {
    if (!items.length) continue;
    const implemented = items.filter((i) => found.has(i.id));
    coverage[prefix] = {
      declared: items.length,
      implemented: implemented.length,
      missing: items.filter((i) => !found.has(i.id)),
      pct: pct(implemented.length, items.length),
    };
  }

  const declaredIds = new Set(Object.values(declared).flat().map((i) => i.id));
  const orphans = byId.filter((x) => ["RN", "RF", "RNF", "PR"].includes(x.prefix) && !declaredIds.has(x.id)).map((x) => x.id);

  const titles = {};
  for (const items of Object.values(declared)) for (const i of items) titles[i.id] = i.title;

  return { byId, coverage, orphans, titles, totalIds: byId.length };
}

/**
 * Histórico de desenvolvimento a partir do git.
 * O cliente quer saber o esforço aplicado: quantos commits, em quanto tempo, por quem,
 * com que ritmo e onde o código mais mexeu.
 */
function collectGit(root, sinceRef) {
  if (!dirExists(join(root, ".git"))) return { available: false, reason: "repositório sem .git — histórico indisponível" };
  if (!commandAvailable("git")) return { available: false, reason: "git não encontrado no PATH" };

  const g = (args, timeoutMs = 90_000) => run("git", args, { cwd: root, timeoutMs });
  const out = { available: true };
  const range = sinceRef ? [`${sinceRef}..HEAD`] : [];

  const count = g(["rev-list", "--count", "HEAD"]);
  out.commits = count.ok ? Number(count.stdout.trim()) || 0 : null;

  if (sinceRef) {
    const rangeCount = g(["rev-list", "--count", `${sinceRef}..HEAD`]);
    out.commitsInRange = rangeCount.ok ? Number(rangeCount.stdout.trim()) || 0 : null;
  }

  const merges = g(["rev-list", "--count", "--merges", "HEAD"]);
  out.merges = merges.ok ? Number(merges.stdout.trim()) || 0 : null;
  if (out.commits !== null && out.merges !== null) out.directCommits = out.commits - out.merges;

  const authors = g(["shortlog", "-sne", "HEAD"]);
  out.authors = authors.ok
    ? authors.stdout.trim().split(/\r?\n/).filter(Boolean).map((l) => {
      const m = /^\s*(\d+)\s+(.+?)\s+<(.*)>$/.exec(l);
      return m ? { commits: Number(m[1]), name: m[2], email: m[3] } : null;
    }).filter(Boolean)
    : [];
  if (out.commits) out.authors = out.authors.map((a) => ({ ...a, pct: pct(a.commits, out.commits) }));

  // datas de todos os commits: ritmo, dias ativos, duração do projeto
  const dates = g(["log", "--format=%aI", "--no-merges"]);
  if (dates.ok) {
    const list = dates.stdout.trim().split(/\r?\n/).filter(Boolean);
    out.firstCommit = list[list.length - 1] || null;
    out.lastCommit = list[0] || null;
    const days = new Set(list.map((d) => d.slice(0, 10)));
    out.activeDays = days.size;
    const weeks = new Map();
    for (const d of list) {
      const wk = isoWeekKey(d);
      weeks.set(wk, (weeks.get(wk) || 0) + 1);
    }
    out.byWeek = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, commits]) => ({ week, commits }));
    if (out.firstCommit && out.lastCommit) {
      const spanDays = Math.max(1, Math.round((new Date(out.lastCommit) - new Date(out.firstCommit)) / 86_400_000) + 1);
      out.spanDays = spanDays;
      out.commitsPerWeek = Math.round((list.length / (spanDays / 7)) * 10) / 10;
      out.commitsPerActiveDay = out.activeDays ? Math.round((list.length / out.activeDays) * 10) / 10 : null;
    }
    // últimos 8 dias com atividade, para leitura de "está em movimento?"
    out.recentActivity = [...days].sort().slice(-8);
  }

  const branch = g(["rev-parse", "--abbrev-ref", "HEAD"]);
  out.branch = branch.ok ? branch.stdout.trim() : null;
  const head = g(["rev-parse", "--short", "HEAD"]);
  out.head = head.ok ? head.stdout.trim() : null;

  const tags = g(["tag", "--sort=-creatordate"]);
  out.tags = tags.ok ? tags.stdout.trim().split(/\r?\n/).filter(Boolean).slice(0, 12) : [];
  out.releaseCount = out.tags.length;

  const branches = g(["branch", "-r"]);
  out.remoteBranches = branches.ok ? branches.stdout.trim().split(/\r?\n/).filter((l) => l.trim() && !/->/.test(l)).length : null;

  // volume + hotspots (arquivos que mais mudaram) numa única passada
  const numstat = g(["log", ...range, "--numstat", "--format=%H", "--no-merges"], 120_000);
  if (numstat.ok) {
    let added = 0; let removed = 0;
    const touched = new Map();
    for (const line of numstat.stdout.split(/\r?\n/)) {
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
      if (!m) continue;
      const a = m[1] === "-" ? 0 : Number(m[1]);
      const r = m[2] === "-" ? 0 : Number(m[2]);
      added += a; removed += r;
      const f = m[3].includes(" => ") ? m[3].replace(/^.*=> /, "").replace(/[{}]/g, "") : m[3];
      const e = touched.get(f) || { file: f, changes: 0, added: 0, removed: 0 };
      e.changes++; e.added += a; e.removed += r;
      touched.set(f, e);
    }
    out.linesAdded = added;
    out.linesRemoved = removed;
    out.netLines = added - removed;
    out.filesTouched = touched.size;
    out.range = sinceRef ? `${sinceRef}..HEAD` : "história completa";
    out.hotspots = [...touched.values()]
      .filter((f) => !/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Gemfile\.lock|poetry\.lock|composer\.lock)$/.test(basename(f.file)))
      .sort((a, b) => b.changes - a.changes).slice(0, 15);
    if (out.commits) out.avgLinesPerCommit = Math.round((added + removed) / Math.max(1, out.commits));
  }

  const recent = g(["log", "-20", "--format=%h|%aI|%an|%s"]);
  out.recentCommits = recent.ok
    ? recent.stdout.trim().split(/\r?\n/).filter(Boolean).map((l) => {
      const [hash, date, author, ...rest] = l.split("|");
      return { hash, date, author, subject: rest.join("|") };
    })
    : [];

  // classificação de commits por convenção (feat/fix/refactor/test/docs/chore)
  const subjects = g(["log", "--format=%s", "--no-merges"]);
  if (subjects.ok) {
    const buckets = new Map();
    for (const s of subjects.stdout.split(/\r?\n/)) {
      if (!s.trim()) continue;
      const m = /^(feat|fix|refactor|test|docs|chore|perf|style|build|ci|revert)\b/i.exec(s.trim());
      const key = m ? m[1].toLowerCase() : "(sem convenção)";
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    out.byCommitType = [...buckets.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
    const conventional = [...buckets.entries()].filter(([k]) => k !== "(sem convenção)").reduce((a, [, v]) => a + v, 0);
    out.conventionalPct = out.commits ? pct(conventional, out.commits) : null;
  }

  const status = g(["status", "--porcelain"]);
  out.dirtyFiles = status.ok ? status.stdout.split(/\r?\n/).filter((l) => l.trim()).length : null;

  return out;
}

function isoWeekKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "?";
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t - yearStart) / 86_400_000) + 1) / 7);
  return `${t.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

/** Stacks/ecossistemas presentes + contagem de dependências de terceiros. */
function detectStacks(root) {
  const found = [];
  for (const m of ECOSYSTEM_MANIFESTS) {
    const hits = [];
    for (const f of m.files) {
      if (f.includes("*")) hits.push(...findByPatterns(root, [f, `**/${f}`], { maxFiles: 4000, maxDepth: 4 }));
      else if (fileExists(join(root, f))) hits.push(join(root, f));
    }
    if (!hits.length) continue;
    const entry = { ecosystem: m.ecosystem, label: m.label, manifests: hits.slice(0, 5).map((h) => relPosix(root, h)) };
    entry.dependencies = countDependencies(m, hits[0]);
    found.push(entry);
  }
  // dedup por label (Maven e Gradle são entradas distintas do mesmo ecosystem)
  const seen = new Set();
  return found.filter((f) => (seen.has(f.label) ? false : seen.add(f.label)));
}

function countDependencies(manifest, file) {
  const text = readText(file);
  if (text === null) return null;
  try {
    if (/package\.json$/.test(file) || /composer\.json$/.test(file)) {
      const j = JSON.parse(text);
      let n = 0;
      for (const k of manifest.depKeys || []) n += Object.keys(j[k] || {}).length;
      return n || null;
    }
    if (/requirements\.txt$/.test(file)) return text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;
    if (/pom\.xml$/.test(file)) return (text.match(/<dependency>/g) || []).length || null;
    if (/build\.gradle/.test(file)) return (text.match(/^\s*(implementation|api|compile|testImplementation|runtimeOnly)\s/gm) || []).length || null;
    if (/go\.mod$/.test(file)) return (text.match(/^\s+[\w.\-/]+\s+v\d/gm) || []).length || null;
    if (/Cargo\.toml$/.test(file)) {
      const sec = /\[dependencies\]([\s\S]*?)(\n\[|$)/.exec(text);
      return sec ? (sec[1].match(/^\s*[\w-]+\s*=/gm) || []).length : null;
    }
    if (/Gemfile$/.test(file)) return (text.match(/^\s*gem\s+["']/gm) || []).length || null;
    if (/pubspec\.yaml$/.test(file)) {
      const sec = /^dependencies:\s*$([\s\S]*?)(^\w|$)/m.exec(text);
      return sec ? (sec[1].match(/^\s{2}\w[\w_]*:/gm) || []).length : null;
    }
    if (/mix\.exs$/.test(file)) return (text.match(/\{:\w+,/g) || []).length || null;
    if (/pyproject\.toml$/.test(file)) {
      const sec = /\[(?:tool\.poetry\.)?dependencies\]([\s\S]*?)(\n\[|$)/.exec(text);
      return sec ? (sec[1].match(/^\s*[\w.-]+\s*=/gm) || []).length : null;
    }
  } catch { /* devolve null */ }
  return null;
}

function detectCi(root) {
  const out = [];
  for (const m of CI_MARKERS) {
    const hits = findByPatterns(root, m.patterns, { maxFiles: 3000, maxDepth: 4, allowDirs: [".github", ".circleci", ".azuredevops", ".teamcity"] });
    if (hits.length) out.push({ name: m.name, files: hits.slice(0, 4).map((h) => relPosix(root, h)) });
  }
  return out;
}

/** ADRs, spec_story.md e memória de implementação. */
function collectDecisions(root) {
  const adrs = [];
  const specStories = [];
  const candidates = ["docs", "doc", "adr", "architecture", "decisions", "src", "apps", "packages", "services", "backend", "frontend", "lib", "internal", "."];
  const seen = new Set();
  const ID_RE = buildIdRegex();
  for (const c of candidates) {
    const dir = join(root, c);
    if (!dirExists(dir)) continue;
    const { files } = walkFiles(dir, { maxFiles: 4000, maxDepth: 6 });
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      const rel = relPosix(root, f);
      if (/^(outputs|inputs|skills|plugin|\.cursor|\.claude)\//.test(rel)) continue;
      if (/spec_story\.md$/i.test(f)) {
        const md = readText(f) || "";
        ID_RE.lastIndex = 0;
        specStories.push({
          path: rel,
          module: rel.split("/").slice(-2)[0],
          markdown: md,
          decisions: extractBullets(md, /(decis|decid|escolh|trade-?off|optamos|adotamos)/i).slice(0, 12),
          ids: uniq(md.match(ID_RE) || []).slice(0, 40),
        });
        continue;
      }
      if (/(^|\/)(adr|adrs|decisions?|decisoes)\/.*\.md$/i.test(rel) || /(^|\/)ADR-?\d+[^/]*\.md$/i.test(rel)) {
        const md = readText(f) || "";
        adrs.push({
          path: rel,
          title: (/^#\s+(.+)$/m.exec(md) || [, rel])[1].trim(),
          status: (/^\s*(?:\*\*)?(?:Status|Situação|Estado)(?:\*\*)?\s*[:|]\s*(.+)$/im.exec(md) || [, null])[1],
          date: (/^\s*(?:\*\*)?(?:Data|Date)(?:\*\*)?\s*[:|]\s*(.+)$/im.exec(md) || [, null])[1],
          excerpt: truncate((md.replace(/^#.*$/m, "").trim().split(/\n\s*\n/)[0] || "").replace(/\n/g, " "), 320),
        });
      }
    }
  }
  return { adrs: adrs.sort((a, b) => a.path.localeCompare(b.path)), specStories };
}

function extractBullets(md, filterRe) {
  const out = [];
  for (const line of String(md || "").split(/\r?\n/)) {
    const m = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (m && (!filterRe || filterRe.test(m[1]))) out.push(truncate(m[1].replace(/[*`]/g, "").trim(), 240));
  }
  return out;
}

function detectModuleDirs(root) {
  const roots = [
    "src/modules", "src/domains", "src/features", "src/main/java", "app/Modules",
    "apps", "packages", "services", "internal", "cmd", "lib", "src", "modules", "app",
  ];
  for (const r of roots) {
    const dir = join(root, r);
    if (!dirExists(dir)) continue;
    const { files } = walkFiles(dir, { maxFiles: 5000, maxDepth: 2 });
    const tops = new Map();
    const depth = r.split("/").length;
    for (const f of files) {
      const rel = relPosix(root, f);
      const parts = rel.split("/");
      if (parts.length <= depth) continue;
      const key = parts.slice(0, depth + 1).join("/");
      const e = tops.get(key) || { dir: key, files: 0, lines: 0 };
      e.files++;
      tops.set(key, e);
    }
    if (tops.size >= 2) return { base: r, entries: [...tops.values()].sort((a, b) => b.files - a.files).slice(0, 40) };
  }
  return { base: null, entries: [] };
}

function countBy(items, key) {
  const m = new Map();
  for (const i of items) m.set(i[key], (m.get(i[key]) || 0) + 1);
  return [...m.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count);
}

export { buildIdRegex as ID_REGEX_BUILDER };


/* ═══════════════════ agregação entre pastas declaradas ═══════════════════
   Um escopo multi-repo tem um histórico git por pasta. O relatório precisa das duas
   leituras: o total da entrega (para a capa e os KPIs) e a quebra por repositório
   (para quem vai olhar o código). Somar é fácil; o cuidado está no que NÃO se soma. */

function mergeGit(perRoot, multi) {
  const ok = perRoot.filter((x) => x.git && x.git.available);
  if (!ok.length) {
    const first = perRoot[0] && perRoot[0].git;
    return first || { available: false, reason: "nenhuma pasta declarada é um repositório git" };
  }
  if (!multi && ok.length === 1) return ok[0].git;

  const g = ok.map((x) => x.git);
  const sum = (f) => g.reduce((a, x) => a + (Number(x[f]) || 0), 0);

  // Autores: a mesma pessoa aparece nos vários repositórios e não pode ser contada
  // duas vezes. A identidade é a parte local do e-mail — variação de grafia do nome e
  // de domínio do mesmo autor somam numa linha só.
  const byPerson = new Map();
  for (const x of g) {
    for (const a of x.authors || []) {
      const key = String(a.email || a.name || "").toLowerCase().split("@")[0] || a.name;
      const cur = byPerson.get(key) || { name: a.name, email: a.email, commits: 0 };
      cur.commits += a.commits || 0;
      byPerson.set(key, cur);
    }
  }
  const totalCommits = sum("commits") || 1;
  const authors = [...byPerson.values()]
    .sort((a, b) => b.commits - a.commits)
    .map((a) => ({ ...a, pct: Math.round((a.commits / totalCommits) * 1000) / 10 }));

  // Semanas: alinhadas pelo rótulo, que já é a segunda-feira da semana.
  const weekMap = new Map();
  for (const x of g) for (const w of x.byWeek || []) weekMap.set(w.week, (weekMap.get(w.week) || 0) + w.commits);
  const byWeek = [...weekMap.entries()].map(([week, commits]) => ({ week, commits })).sort((a, b) => a.week.localeCompare(b.week));

  const typeMap = new Map();
  for (const x of g) for (const t of x.byCommitType || []) typeMap.set(t.type, (typeMap.get(t.type) || 0) + t.count);

  const dates = g.map((x) => x.firstCommit).filter(Boolean).sort();
  const lastDates = g.map((x) => x.lastCommit).filter(Boolean).sort();

  return {
    available: true,
    multiRepo: true,
    repos: ok.map((x) => ({ label: x.label, rel: x.rel, commits: x.git.commits, branch: x.git.branch, head: x.git.head, authors: (x.git.authors || []).length })),
    commits: sum("commits"),
    directCommits: sum("directCommits"),
    merges: sum("merges"),
    linesAdded: sum("linesAdded"),
    linesRemoved: sum("linesRemoved"),
    netLines: sum("linesAdded") - sum("linesRemoved"),
    filesTouched: sum("filesTouched"),
    authors,
    byWeek,
    byCommitType: [...typeMap.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    // Hotspots já vêm com caminho do próprio repositório; prefixa com o rótulo para
    // não misturar arquivos homônimos de repositórios diferentes.
    hotspots: ok.flatMap((x) => (x.git.hotspots || []).map((h) => ({ ...h, file: `${x.label}/${h.file}` })))
      .sort((a, b) => b.changes - a.changes).slice(0, 20),
    recentCommits: ok.flatMap((x) => (x.git.recentCommits || []).map((c) => ({ ...c, repo: x.label })))
      .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20),
    tags: ok.flatMap((x) => x.git.tags || []).slice(0, 20),
    releaseCount: sum("releaseCount"),
    firstCommit: dates[0] || null,
    lastCommit: lastDates[lastDates.length - 1] || null,
    // Ritmo e duração NÃO são somados: fariam sentido só se os repositórios fossem
    // sequenciais, e eles são paralelos. Ficam derivados do intervalo total.
    spanDays: dates.length && lastDates.length
      ? Math.max(1, Math.round((Date.parse(lastDates[lastDates.length - 1]) - Date.parse(dates[0])) / 86400000))
      : null,
    activeDays: null,
    branch: null,
    dirtyFiles: sum("dirtyFiles"),
  };
}

function mergeDecisions(list) {
  const adrs = [];
  const specStories = [];
  for (const d of list) {
    for (const a of (d && d.adrs) || []) if (!adrs.some((x) => x.path === a.path)) adrs.push(a);
    for (const s of (d && d.specStories) || []) if (!specStories.some((x) => x.path === s.path)) specStories.push(s);
  }
  return { adrs, specStories };
}

function dedupeBy(list, keyOf) {
  const seen = new Set();
  const out = [];
  for (const x of list || []) {
    const k = keyOf(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
