// languages.mjs — registry poliglota.
//
// A skill precisa rodar em repositório de QUALQUER linguagem. Este arquivo é a única
// fonte de verdade sobre:
//   • que extensão é código (e de qual linguagem);
//   • como comentário é escrito naquela linguagem (senão a contagem de LOC mente);
//   • que caminho/arquivo é teste naquela cultura (`test_x.py`, `XTest.java`, `x_spec.rb`…);
//   • que manifesto denuncia cada ecossistema (para detectar a stack e as dependências).
//
// Regra: linguagem desconhecida NÃO quebra nada — cai no perfil `default` (comentário
// `//` + `/* */`) e aparece no relatório pela extensão, nunca é descartada em silêncio.

/**
 * Perfis de comentário. `line` = prefixos de linha; `block` = pares [abre, fecha];
 * `docstring` = pares que também servem de string literal multi-linha (Python, Elixir).
 */
const C_LIKE = { line: ["//"], block: [["/*", "*/"]] };
const HASH = { line: ["#"], block: [] };
const HASH_PY = { line: ["#"], block: [], docstring: [['"""', '"""'], ["'''", "'''"]] };
const SQL_LIKE = { line: ["--"], block: [["/*", "*/"]] };
const XML_LIKE = { line: [], block: [["<!--", "-->"]] };
const PASCAL = { line: ["//"], block: [["{", "}"], ["(*", "*)"]] };
const LISP = { line: [";"], block: [] };
const ERLANG = { line: ["%"], block: [] };
const LUA = { line: ["--"], block: [["--[[", "]]"]] };
const VB = { line: ["'", "REM "], block: [] };
const FORTRAN = { line: ["!"], block: [] };
const COBOL = { line: ["*>"], block: [], colFixed: 7 };  // coluna 7 = indicador de comentário
const HASKELL = { line: ["--"], block: [["{-", "-}"]] };
const MATLAB = { line: ["%"], block: [["%{", "%}"]] };
const BATCH = { line: ["REM ", "::"], block: [] };
const CLOJURE = { line: [";"], block: [] };

/**
 * Registry: extensão → { language, comments, category, ecosystem }
 * category: code | markup | style | data | config | doc | script | query
 */
export const LANGUAGES = {
  // ── JS/TS e web ──
  ".ts": { language: "TypeScript", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".tsx": { language: "TypeScript (TSX)", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".mts": { language: "TypeScript", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".cts": { language: "TypeScript", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".js": { language: "JavaScript", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".jsx": { language: "JavaScript (JSX)", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".mjs": { language: "JavaScript", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".cjs": { language: "JavaScript", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".vue": { language: "Vue", comments: { line: ["//"], block: [["/*", "*/"], ["<!--", "-->"]] }, category: "code", ecosystem: "node" },
  ".svelte": { language: "Svelte", comments: { line: ["//"], block: [["/*", "*/"], ["<!--", "-->"]] }, category: "code", ecosystem: "node" },
  ".astro": { language: "Astro", comments: C_LIKE, category: "code", ecosystem: "node" },

  // ── Python e cientistas ──
  ".py": { language: "Python", comments: HASH_PY, category: "code", ecosystem: "python" },
  ".pyi": { language: "Python (stub)", comments: HASH_PY, category: "code", ecosystem: "python" },
  ".ipynb": { language: "Jupyter Notebook", comments: HASH_PY, category: "code", ecosystem: "python" },
  ".r": { language: "R", comments: HASH, category: "code", ecosystem: "r" },
  ".jl": { language: "Julia", comments: { line: ["#"], block: [["#=", "=#"]] }, category: "code", ecosystem: "julia" },
  ".m": { language: "MATLAB/Objective-C", comments: MATLAB, category: "code", ecosystem: null },
  ".mm": { language: "Objective-C++", comments: C_LIKE, category: "code", ecosystem: "apple" },

  // ── JVM ──
  ".java": { language: "Java", comments: C_LIKE, category: "code", ecosystem: "jvm" },
  ".kt": { language: "Kotlin", comments: C_LIKE, category: "code", ecosystem: "jvm" },
  ".kts": { language: "Kotlin Script", comments: C_LIKE, category: "code", ecosystem: "jvm" },
  ".scala": { language: "Scala", comments: C_LIKE, category: "code", ecosystem: "jvm" },
  ".groovy": { language: "Groovy", comments: C_LIKE, category: "code", ecosystem: "jvm" },
  ".clj": { language: "Clojure", comments: CLOJURE, category: "code", ecosystem: "jvm" },
  ".cljs": { language: "ClojureScript", comments: CLOJURE, category: "code", ecosystem: "jvm" },

  // ── .NET ──
  ".cs": { language: "C#", comments: C_LIKE, category: "code", ecosystem: "dotnet" },
  ".vb": { language: "Visual Basic .NET", comments: VB, category: "code", ecosystem: "dotnet" },
  ".fs": { language: "F#", comments: { line: ["//"], block: [["(*", "*)"]] }, category: "code", ecosystem: "dotnet" },
  ".fsx": { language: "F# Script", comments: { line: ["//"], block: [["(*", "*)"]] }, category: "code", ecosystem: "dotnet" },
  ".razor": { language: "Razor", comments: { line: [], block: [["@*", "*@"], ["<!--", "-->"]] }, category: "code", ecosystem: "dotnet" },
  ".cshtml": { language: "Razor View", comments: { line: [], block: [["@*", "*@"], ["<!--", "-->"]] }, category: "code", ecosystem: "dotnet" },

  // ── C / sistemas ──
  ".c": { language: "C", comments: C_LIKE, category: "code", ecosystem: "c" },
  ".h": { language: "C/C++ Header", comments: C_LIKE, category: "code", ecosystem: "c" },
  ".cpp": { language: "C++", comments: C_LIKE, category: "code", ecosystem: "c" },
  ".cc": { language: "C++", comments: C_LIKE, category: "code", ecosystem: "c" },
  ".cxx": { language: "C++", comments: C_LIKE, category: "code", ecosystem: "c" },
  ".hpp": { language: "C++ Header", comments: C_LIKE, category: "code", ecosystem: "c" },
  ".rs": { language: "Rust", comments: C_LIKE, category: "code", ecosystem: "rust" },
  ".go": { language: "Go", comments: C_LIKE, category: "code", ecosystem: "go" },
  ".zig": { language: "Zig", comments: C_LIKE, category: "code", ecosystem: "zig" },
  ".nim": { language: "Nim", comments: HASH, category: "code", ecosystem: "nim" },
  ".d": { language: "D", comments: C_LIKE, category: "code", ecosystem: null },

  // ── dinâmicas de servidor ──
  ".rb": { language: "Ruby", comments: { line: ["#"], block: [["=begin", "=end"]] }, category: "code", ecosystem: "ruby" },
  ".rake": { language: "Ruby (Rake)", comments: HASH, category: "code", ecosystem: "ruby" },
  ".erb": { language: "ERB", comments: { line: [], block: [["<%#", "%>"]] }, category: "code", ecosystem: "ruby" },
  ".php": { language: "PHP", comments: { line: ["//", "#"], block: [["/*", "*/"]] }, category: "code", ecosystem: "php" },
  ".pl": { language: "Perl", comments: HASH, category: "code", ecosystem: "perl" },
  ".pm": { language: "Perl (módulo)", comments: HASH, category: "code", ecosystem: "perl" },
  ".ex": { language: "Elixir", comments: { line: ["#"], block: [], docstring: [['"""', '"""']] }, category: "code", ecosystem: "elixir" },
  ".exs": { language: "Elixir Script", comments: { line: ["#"], block: [], docstring: [['"""', '"""']] }, category: "code", ecosystem: "elixir" },
  ".erl": { language: "Erlang", comments: ERLANG, category: "code", ecosystem: "erlang" },
  ".hrl": { language: "Erlang Header", comments: ERLANG, category: "code", ecosystem: "erlang" },
  ".lua": { language: "Lua", comments: LUA, category: "code", ecosystem: "lua" },
  ".hs": { language: "Haskell", comments: HASKELL, category: "code", ecosystem: "haskell" },
  ".dart": { language: "Dart", comments: C_LIKE, category: "code", ecosystem: "dart" },
  ".swift": { language: "Swift", comments: C_LIKE, category: "code", ecosystem: "apple" },
  ".gd": { language: "GDScript", comments: HASH, category: "code", ecosystem: "godot" },

  // ── legado corporativo ──
  ".pas": { language: "Delphi/Pascal", comments: PASCAL, category: "code", ecosystem: "delphi" },
  ".dpr": { language: "Delphi (projeto)", comments: PASCAL, category: "code", ecosystem: "delphi" },
  ".dfm": { language: "Delphi (form)", comments: PASCAL, category: "config", ecosystem: "delphi" },
  ".cbl": { language: "COBOL", comments: COBOL, category: "code", ecosystem: "cobol" },
  ".cob": { language: "COBOL", comments: COBOL, category: "code", ecosystem: "cobol" },
  ".cpy": { language: "COBOL (copybook)", comments: COBOL, category: "code", ecosystem: "cobol" },
  ".abap": { language: "ABAP", comments: { line: ["*", '"'], block: [] }, category: "code", ecosystem: "sap" },
  ".f90": { language: "Fortran", comments: FORTRAN, category: "code", ecosystem: "fortran" },
  ".f": { language: "Fortran", comments: FORTRAN, category: "code", ecosystem: "fortran" },
  ".bas": { language: "Visual Basic", comments: VB, category: "code", ecosystem: null },
  ".cls": { language: "VB/Apex Class", comments: VB, category: "code", ecosystem: null },
  ".trigger": { language: "Apex Trigger", comments: C_LIKE, category: "code", ecosystem: "salesforce" },

  // ── banco de dados ──
  ".sql": { language: "SQL", comments: SQL_LIKE, category: "query", ecosystem: null },
  ".pks": { language: "PL/SQL (spec)", comments: SQL_LIKE, category: "query", ecosystem: "oracle" },
  ".pkb": { language: "PL/SQL (body)", comments: SQL_LIKE, category: "query", ecosystem: "oracle" },
  ".plsql": { language: "PL/SQL", comments: SQL_LIKE, category: "query", ecosystem: "oracle" },
  ".prisma": { language: "Prisma Schema", comments: C_LIKE, category: "code", ecosystem: "node" },
  ".cypher": { language: "Cypher", comments: SQL_LIKE, category: "query", ecosystem: null },

  // ── contratos e schemas ──
  ".graphql": { language: "GraphQL", comments: HASH, category: "code", ecosystem: null },
  ".gql": { language: "GraphQL", comments: HASH, category: "code", ecosystem: null },
  ".proto": { language: "Protocol Buffers", comments: C_LIKE, category: "code", ecosystem: null },
  ".thrift": { language: "Thrift", comments: C_LIKE, category: "code", ecosystem: null },
  ".avsc": { language: "Avro Schema", comments: { line: [], block: [] }, category: "data", ecosystem: null },
  ".sol": { language: "Solidity", comments: C_LIKE, category: "code", ecosystem: "solidity" },

  // ── markup e estilo ──
  ".html": { language: "HTML", comments: XML_LIKE, category: "markup", ecosystem: null },
  ".htm": { language: "HTML", comments: XML_LIKE, category: "markup", ecosystem: null },
  ".xml": { language: "XML", comments: XML_LIKE, category: "config", ecosystem: null },
  ".xsl": { language: "XSLT", comments: XML_LIKE, category: "code", ecosystem: null },
  ".xaml": { language: "XAML", comments: XML_LIKE, category: "markup", ecosystem: "dotnet" },
  ".jsp": { language: "JSP", comments: { line: [], block: [["<%--", "--%>"], ["<!--", "-->"]] }, category: "code", ecosystem: "jvm" },
  ".hbs": { language: "Handlebars", comments: { line: [], block: [["{{!", "}}"]] }, category: "markup", ecosystem: "node" },
  ".ejs": { language: "EJS", comments: { line: [], block: [["<%#", "%>"]] }, category: "markup", ecosystem: "node" },
  ".twig": { language: "Twig", comments: { line: [], block: [["{#", "#}"]] }, category: "markup", ecosystem: "php" },
  ".blade.php": { language: "Blade", comments: { line: [], block: [["{{--", "--}}"]] }, category: "markup", ecosystem: "php" },
  ".css": { language: "CSS", comments: { line: [], block: [["/*", "*/"]] }, category: "style", ecosystem: null },
  ".scss": { language: "SCSS", comments: C_LIKE, category: "style", ecosystem: null },
  ".sass": { language: "Sass", comments: C_LIKE, category: "style", ecosystem: null },
  ".less": { language: "Less", comments: C_LIKE, category: "style", ecosystem: null },
  ".styl": { language: "Stylus", comments: C_LIKE, category: "style", ecosystem: null },

  // ── infra e scripts ──
  ".sh": { language: "Shell", comments: HASH, category: "script", ecosystem: null },
  ".bash": { language: "Bash", comments: HASH, category: "script", ecosystem: null },
  ".zsh": { language: "Zsh", comments: HASH, category: "script", ecosystem: null },
  ".ps1": { language: "PowerShell", comments: { line: ["#"], block: [["<#", "#>"]] }, category: "script", ecosystem: null },
  ".psm1": { language: "PowerShell (módulo)", comments: { line: ["#"], block: [["<#", "#>"]] }, category: "script", ecosystem: null },
  ".bat": { language: "Batch", comments: BATCH, category: "script", ecosystem: null },
  ".cmd": { language: "Batch", comments: BATCH, category: "script", ecosystem: null },
  ".tf": { language: "Terraform", comments: { line: ["#", "//"], block: [["/*", "*/"]] }, category: "config", ecosystem: "terraform" },
  ".tfvars": { language: "Terraform (vars)", comments: HASH, category: "config", ecosystem: "terraform" },
  ".bicep": { language: "Bicep", comments: C_LIKE, category: "config", ecosystem: "azure" },
  ".nix": { language: "Nix", comments: HASH, category: "config", ecosystem: null },

  // ── dados e config ──
  ".json": { language: "JSON", comments: { line: [], block: [] }, category: "data", ecosystem: null },
  ".jsonc": { language: "JSON com comentários", comments: C_LIKE, category: "config", ecosystem: null },
  ".yml": { language: "YAML", comments: HASH, category: "config", ecosystem: null },
  ".yaml": { language: "YAML", comments: HASH, category: "config", ecosystem: null },
  ".toml": { language: "TOML", comments: HASH, category: "config", ecosystem: null },
  ".ini": { language: "INI", comments: { line: [";", "#"], block: [] }, category: "config", ecosystem: null },
  ".env": { language: "Dotenv", comments: HASH, category: "config", ecosystem: null },
  ".properties": { language: "Properties", comments: HASH, category: "config", ecosystem: "jvm" },
  ".csv": { language: "CSV", comments: { line: [], block: [] }, category: "data", ecosystem: null },

  // ── documentação ──
  ".md": { language: "Markdown", comments: XML_LIKE, category: "doc", ecosystem: null },
  ".mdx": { language: "MDX", comments: XML_LIKE, category: "doc", ecosystem: "node" },
  ".mdc": { language: "Markdown (rule)", comments: XML_LIKE, category: "doc", ecosystem: null },
  ".rst": { language: "reStructuredText", comments: { line: [".."], block: [] }, category: "doc", ecosystem: "python" },
  ".adoc": { language: "AsciiDoc", comments: { line: ["//"], block: [] }, category: "doc", ecosystem: null },
  ".txt": { language: "Texto", comments: { line: [], block: [] }, category: "doc", ecosystem: null },

  // ── BDD ──
  ".feature": { language: "Gherkin", comments: HASH, category: "code", ecosystem: null },
  ".robot": { language: "Robot Framework", comments: HASH, category: "code", ecosystem: "python" },
};

/** Arquivos sem extensão que ainda assim são código/config reconhecível. */
export const FILENAME_LANGUAGES = {
  dockerfile: { language: "Dockerfile", comments: HASH, category: "config", ecosystem: "docker" },
  makefile: { language: "Makefile", comments: HASH, category: "script", ecosystem: null },
  rakefile: { language: "Ruby (Rake)", comments: HASH, category: "code", ecosystem: "ruby" },
  gemfile: { language: "Ruby (Gemfile)", comments: HASH, category: "config", ecosystem: "ruby" },
  procfile: { language: "Procfile", comments: HASH, category: "config", ecosystem: null },
  jenkinsfile: { language: "Jenkinsfile (Groovy)", comments: C_LIKE, category: "config", ecosystem: "jvm" },
  vagrantfile: { language: "Vagrantfile (Ruby)", comments: HASH, category: "config", ecosystem: "ruby" },
  "cmakelists.txt": { language: "CMake", comments: HASH, category: "config", ecosystem: "c" },
};

// Extensão desconhecida NÃO é contada como código. Antes, `.coverage` (banco do
// coverage.py) e `go.mod` viravam as "linguagens" COVERAGE e MOD na tabela entregue ao
// cliente. O que não se reconhece entra em `unknownExtensions`, não no inventário.
const DEFAULT_PROFILE = { language: null, comments: C_LIKE, category: "unknown", ecosystem: null };

/** Artefatos de build/cobertura/lock que nunca contam como código-fonte. */
const NON_SOURCE_NAMES = [
  /^\.coverage$/i, /^coverage\.(xml|json|info|out)$/i, /^lcov\.info$/i,
  /-lock\.(json|yaml)$/i, /^(package-lock|yarn|pnpm-lock|composer|Gemfile|poetry|Cargo|pubspec)\.lock$/i,
  /\.(log|tmp|bak|orig|rej|swp|min\.js|min\.css|map)$/i,
  /^go\.(mod|sum)$/i, /^\.ds_store$/i, /\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|gz|tar|jar|war|exe|dll|so|dylib|class|pyc|o|a)$/i,
];

export function isNonSource(pathOrName) {
  const name = String(pathOrName).replace(/\\/g, "/").split("/").pop();
  return NON_SOURCE_NAMES.some((re) => re.test(name));
}

/** Resolve o perfil de um arquivo pelo nome (aceita caminho completo). */
export function profileOf(pathOrName) {
  const name = String(pathOrName).replace(/\\/g, "/").split("/").pop().toLowerCase();
  if (FILENAME_LANGUAGES[name]) return FILENAME_LANGUAGES[name];
  // extensão composta primeiro (.blade.php antes de .php)
  const parts = name.split(".");
  for (let i = 1; i < parts.length; i++) {
    const ext = `.${parts.slice(i).join(".")}`;
    if (LANGUAGES[ext]) return LANGUAGES[ext];
  }
  if (/^dockerfile/.test(name)) return FILENAME_LANGUAGES.dockerfile;
  if (/^makefile/.test(name)) return FILENAME_LANGUAGES.makefile;
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  if (LANGUAGES[ext]) return LANGUAGES[ext];
  return { ...DEFAULT_PROFILE, language: null, extension: ext || null };
}

export function languageOf(pathOrName) {
  const p = profileOf(pathOrName);
  return p.language || "Outros";
}

/** Extensão não reconhecida (para o relatório declarar o que ficou de fora). */
export function unknownExtensionOf(pathOrName) {
  const p = profileOf(pathOrName);
  return p.language ? null : (p.extension || null);
}

export function categoryOf(pathOrName) {
  return profileOf(pathOrName).category;
}

/** Extensões consideradas "código" para o inventário (exclui doc e dados puros). */
export function isCountedAsCode(pathOrName) {
  if (isNonSource(pathOrName)) return false;
  const c = categoryOf(pathOrName);
  return ["code", "query", "markup", "style", "script"].includes(c);
}

/** Extensões que valem varrer atrás de IDs de negócio (inclui config e doc técnico). */
export function isTraceable(pathOrName) {
  if (isNonSource(pathOrName)) return false;
  const c = categoryOf(pathOrName);
  return ["code", "query", "markup", "style", "script", "config", "doc"].includes(c);
}

/**
 * Padrões de arquivo de teste por cultura de linguagem.
 * Cada cultura nomeia teste de um jeito; o inventário precisa de todos, senão o
 * relatório diz que um projeto Java com `FooTest.java` não tem nenhum teste.
 */
const TEST_FILE_PATTERNS = [
  /(^|\/)(tests?|__tests__|spec|specs|e2e|integration|it|cypress|playwright|features|testes)(\/|$)/i,
  /\.(test|spec|steps|e2e|int|integration|it)\.[a-z0-9]+$/i,            // x.test.ts, x.spec.js, x.e2e.ts
  /(^|\/)test_[^/]*\.(py|rb|lua)$/i,                                     // test_foo.py
  /[_.]test\.(go|py|rb|dart|exs?)$/i,                                    // foo_test.go, foo_test.exs
  /(^|\/)[A-Z][A-Za-z0-9]*(Test|Tests|Spec|IT|ITCase|TestCase)\.(java|kt|scala|cs|groovy)$/, // FooTest.java
  /(^|\/)(Test|Tests)[A-Z][A-Za-z0-9]*\.(cs|java|kt)$/,                  // TestFoo.cs
  /_spec\.(rb|lua|js|ts)$/i,                                             // foo_spec.rb
  /Test\.php$/i, /^Test[A-Z].*\.php$/,                                   // FooTest.php
  /\.t$/i,                                                               // Perl .t
  /\.feature$/i,                                                         // Gherkin
  /\.robot$/i,                                                           // Robot Framework
  /(^|\/)tests?\.rs$/i, /(^|\/)tests\//i,                                // Rust
];

export function isTestPath(relPath) {
  const p = String(relPath).replace(/\\/g, "/");
  return TEST_FILE_PATTERNS.some((re) => re.test(p));
}

/**
 * Manifestos que denunciam um ecossistema. Usados para (a) detectar a stack e
 * (b) contar dependências de terceiros.
 */
export const ECOSYSTEM_MANIFESTS = [
  { ecosystem: "node", label: "Node.js / npm", files: ["package.json"], depKeys: ["dependencies", "devDependencies", "peerDependencies"] },
  { ecosystem: "python", label: "Python", files: ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "Pipfile", "environment.yml"] },
  { ecosystem: "jvm", label: "Java / Kotlin (Maven)", files: ["pom.xml"] },
  { ecosystem: "jvm", label: "Java / Kotlin (Gradle)", files: ["build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"] },
  { ecosystem: "dotnet", label: ".NET", files: ["*.csproj", "*.fsproj", "*.vbproj", "*.sln", "Directory.Build.props"] },
  { ecosystem: "go", label: "Go", files: ["go.mod"] },
  { ecosystem: "rust", label: "Rust", files: ["Cargo.toml"] },
  { ecosystem: "ruby", label: "Ruby", files: ["Gemfile", "*.gemspec"] },
  { ecosystem: "php", label: "PHP / Composer", files: ["composer.json"], depKeys: ["require", "require-dev"] },
  { ecosystem: "elixir", label: "Elixir", files: ["mix.exs"] },
  { ecosystem: "erlang", label: "Erlang", files: ["rebar.config"] },
  { ecosystem: "dart", label: "Dart / Flutter", files: ["pubspec.yaml"] },
  { ecosystem: "apple", label: "Swift / iOS", files: ["Package.swift", "Podfile", "*.xcodeproj"] },
  { ecosystem: "perl", label: "Perl", files: ["cpanfile", "Makefile.PL"] },
  { ecosystem: "haskell", label: "Haskell", files: ["stack.yaml", "*.cabal"] },
  { ecosystem: "lua", label: "Lua", files: ["*.rockspec"] },
  { ecosystem: "r", label: "R", files: ["DESCRIPTION", "renv.lock"] },
  { ecosystem: "delphi", label: "Delphi", files: ["*.dproj", "*.dpr"] },
  { ecosystem: "cobol", label: "COBOL", files: ["*.cbl", "*.cob"] },
  { ecosystem: "terraform", label: "Terraform", files: ["*.tf"] },
  { ecosystem: "docker", label: "Docker", files: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yaml"] },
  { ecosystem: "solidity", label: "Solidity", files: ["hardhat.config.js", "hardhat.config.ts", "truffle-config.js", "foundry.toml"] },
];

/** Arquivos de CI — dizem como o projeto valida a si mesmo. */
export const CI_MARKERS = [
  { name: "GitHub Actions", patterns: [".github/workflows/*.yml", ".github/workflows/*.yaml"] },
  { name: "Azure Pipelines", patterns: ["azure-pipelines.yml", "azure-pipelines.yaml", ".azuredevops/*.yml"] },
  { name: "GitLab CI", patterns: [".gitlab-ci.yml"] },
  { name: "Jenkins", patterns: ["Jenkinsfile"] },
  { name: "CircleCI", patterns: [".circleci/config.yml"] },
  { name: "Travis CI", patterns: [".travis.yml"] },
  { name: "Bitbucket Pipelines", patterns: ["bitbucket-pipelines.yml"] },
  { name: "TeamCity", patterns: [".teamcity/*"] },
];
