// resolve-scope.mjs — onde a skill deve olhar.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE ESTE ARQUIVO EXISTE
//
// A skill varria a raiz do repositório e torcia para acertar. Isso quebra em dois
// casos que são a norma, não a exceção:
//
//   1. **Entrega multi-repositório.** O produto vive em quatro repositórios — gateway,
//      módulo, monólito e a suíte de testes, cada um com o seu clone. Varrer "a raiz"
//      pega um deles e ignora os outros, ou pega uma pasta de trabalho que contém
//      TAMBÉM outros subprojetos e mistura entrega alheia no relatório.
//   2. **Monorepo com vários produtos.** A raiz tem dez aplicações; o relatório é de
//      uma. Contar as dez infla a entrega e o cliente recebe um número que não é dele.
//
// Por isso o escopo é DECLARADO, não adivinhado: documentação, código, testes e
// "outras pastas", cada um aceitando VÁRIAS pastas. Quando o usuário não declara, a
// skill cai no comportamento antigo (a raiz inteira) e **diz no relatório** que o
// escopo foi presumido — para ninguém confundir "varri tudo que existe" com "varri o
// que você me disse".
//
// As pastas podem estar FORA da raiz: é exatamente o caso multi-repo. O caminho no
// relatório passa a ser prefixado pelo rótulo da pasta quando há mais de uma, senão
// dois `src/main/java/...` de repositórios diferentes apareceriam como o mesmo arquivo.
// ─────────────────────────────────────────────────────────────────────────────

import { isAbsolute, join, resolve, basename } from "node:path";
import { dirExists, relPosix, uniq } from "./util.mjs";

/**
 * Divide o valor de uma flag em pastas.
 *
 * Aceita repetição (`--code a --code b`), vírgula (`--code a,b`) e ponto-e-vírgula —
 * este último porque em Windows um caminho pode conter vírgula, mas raramente `;`.
 * Também aceita `rótulo=caminho`, que é como uma pasta ganha nome próprio no relatório
 * (`--code gateway=../portal-gateway`).
 */
export function splitDirs(values) {
  const raw = [];
  for (const v of [].concat(values || [])) {
    if (!v) continue;
    for (const part of String(v).split(/[;,]/)) {
      const t = part.trim();
      if (t) raw.push(t);
    }
  }
  return raw;
}

function entryOf(root, spec, fallbackKind) {
  const eq = spec.indexOf("=");
  // Um `=` só é separador de rótulo se o que vem antes não parecer caminho —
  // `C:\x=y` e `./a=b` são caminhos legítimos com `=` no nome.
  const hasLabel = eq > 0 && !/[\\/]/.test(spec.slice(0, eq));
  const label = hasLabel ? spec.slice(0, eq).trim() : null;
  const p = (hasLabel ? spec.slice(eq + 1) : spec).trim();
  const dir = isAbsolute(p) ? resolve(p) : resolve(join(root, p));
  return {
    dir,
    label: label || basename(dir) || fallbackKind,
    rel: relPosix(root, dir),
    // Fora da raiz é normal em multi-repo; o relatório mostra o caminho como veio.
    outsideRoot: relPosix(root, dir).startsWith(".."),
  };
}

/**
 * Resolve o escopo declarado. Nada aqui inventa pasta: o que não existe no disco vira
 * aviso e sai da lista, para a varredura não falhar no meio e para o relatório poder
 * dizer que aquela pasta foi pedida e não estava lá.
 */
export function resolveScope(root, { docs = [], code = [], tests = [], extra = [] } = {}) {
  const warnings = [];
  const build = (values, kind) => {
    const out = [];
    for (const spec of splitDirs(values)) {
      const e = entryOf(root, spec, kind);
      if (!dirExists(e.dir)) {
        warnings.push({ code: "SCOPE_DIR_MISSING", message: `Pasta declarada em --${kind} não encontrada: ${spec} (resolvida para ${e.rel || e.dir}). Ignorada nesta geração.` });
        continue;
      }
      if (out.some((x) => x.dir === e.dir)) continue;
      out.push({ ...e, kind });
    }
    return out;
  };

  const docsDirs = build(docs, "docs");
  const codeDirs = build(code, "code");
  const testDirs = build(tests, "tests");
  const extraDirs = build(extra, "extra");

  const declared = Boolean(docsDirs.length || codeDirs.length || testDirs.length || extraDirs.length);

  // Sem declaração, a raiz é o escopo — comportamento histórico, agora explícito.
  const rootEntry = { dir: resolve(root), label: basename(resolve(root)) || "raiz", rel: ".", outsideRoot: false, kind: "root" };

  return {
    declared,
    root: resolve(root),
    docs: docsDirs,
    code: codeDirs.length ? codeDirs : [],
    tests: testDirs,
    extra: extraDirs,
    warnings,

    /** Pastas a varrer em busca de CÓDIGO (código + outras). */
    codeRoots: codeDirs.length || extraDirs.length ? [...codeDirs, ...extraDirs] : [rootEntry],
    /** Pastas onde procurar e executar TESTES. */
    testRoots: testDirs.length ? testDirs : (codeDirs.length ? [...codeDirs, ...extraDirs] : [rootEntry]),
    /** Pastas onde procurar ARTEFATOS de documentação, além da pasta de outputs. */
    docRoots: docsDirs,

    /** Uma linha por pasta, para a seção «Escopo da coleta» do relatório. */
    entries: [...docsDirs, ...codeDirs, ...testDirs, ...extraDirs],
  };
}

/**
 * Prefixo do caminho no relatório.
 *
 * Com uma pasta só, o caminho sai como sempre saiu (relativo à raiz). Com mais de uma,
 * ganha o rótulo na frente — sem isso, `src/main/java/Service.java` do gateway e do
 * módulo colidem no inventário, nos hotspots e na lista de maiores arquivos, e o
 * relatório passa a somar dois arquivos diferentes como se fossem um.
 */
export function pathPrefixer(roots) {
  const multi = roots.length > 1;
  return (rootEntry, absPath) => {
    const rel = relPosix(rootEntry.dir, absPath);
    return multi ? `${rootEntry.label}/${rel}` : (rootEntry.kind === "root" ? rel : `${rootEntry.rel === "." ? "" : `${rootEntry.rel}/`}${rel}`);
  };
}

/** Resumo textual do escopo, para o `--check` e o log do CLI. */
export function describeScope(scope) {
  if (!scope.declared) return "escopo presumido: a raiz inteira do repositório";
  const parts = [];
  const say = (list, name) => { if (list.length) parts.push(`${name}: ${list.map((e) => e.rel || e.dir).join(", ")}`); };
  say(scope.docs, "documentação");
  say(scope.code, "código");
  say(scope.tests, "testes");
  say(scope.extra, "outras");
  return parts.join(" · ");
}

/** Todas as pastas declaradas, sem repetição — usado pelo painel de proveniência. */
export function allScopeDirs(scope) {
  return uniq(scope.entries.map((e) => e.dir));
}
