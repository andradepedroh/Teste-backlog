// test-runners.mjs — registry de frameworks de teste, agnóstico de linguagem.
//
// Cada entrada declara:
//   id          identificador estável (aparece em --only-runners)
//   label       nome legível no relatório
//   kind        natureza DEFAULT da suíte (pode ser refinada por caminho — ver classifyCase)
//   ecosystem   stack a que pertence (para agrupar no relatório)
//   detect(ctx) → boolean
//   build(ctx)  → { cmd, args, env?, report: {format, path|paths|glob}, coverage?: {...} }
//
// `kind` usa o vocabulário do relatório (não o do framework):
//   unitario · integracao · funcional · contrato · performance · acessibilidade
//
// Princípio: adicionar linguagem = adicionar entrada aqui. Nenhum outro arquivo muda.

import { join } from "node:path";

export const KINDS = {
  unitario: { label: "Unitários", order: 1, help: "Verificam uma unidade de código isolada (função, classe, componente)." },
  integracao: { label: "Integração", order: 2, help: "Verificam a colaboração entre componentes, banco de dados ou serviços." },
  funcional: { label: "Funcionais / E2E", order: 3, help: "Exercitam o sistema pela interface ou pela API, do ponto de vista do usuário." },
  contrato: { label: "Contrato / API", order: 4, help: "Verificam o contrato exposto a consumidores (schema, status, campos)." },
  performance: { label: "Performance / carga", order: 5, help: "Medem tempo de resposta e comportamento sob carga." },
  acessibilidade: { label: "Acessibilidade", order: 6, help: "Verificam conformidade com critérios de acessibilidade." },
};

export function kindLabel(kind) {
  return KINDS[kind]?.label || kind;
}

export function kindOrder(kind) {
  return KINDS[kind]?.order ?? 99;
}

const NPX = (installIfMissing) => (installIfMissing ? [] : ["--no-install"]);

/**
 * Registry. A ordem importa só para a leitura do relatório (unitário antes de E2E).
 */
export const RUNNERS = [
  // ───────────────────────────── Node / JS / TS ─────────────────────────────
  {
    id: "vitest", label: "Vitest", kind: "unitario", ecosystem: "node",
    detect: ({ dep, cfg }) => dep("vitest") || cfg(["vitest.config.*", "vitest.workspace.*", "**/vitest.config.*"]),
    build: ({ rawDir, wantCoverage, installIfMissing }) => ({
      cmd: "npx",
      args: [...NPX(installIfMissing), "vitest", "run", "--reporter=json", `--outputFile=${join(rawDir, "vitest.json")}`,
        ...(wantCoverage ? ["--coverage", "--coverage.reporter=json-summary", "--coverage.reporter=lcov", `--coverage.reportsDirectory=${join(rawDir, "coverage-vitest")}`] : [])],
      env: { CI: "true", FORCE_COLOR: "0" },
      report: { format: "jest-json", path: join(rawDir, "vitest.json") },
      coverage: wantCoverage ? { dir: join(rawDir, "coverage-vitest") } : null,
    }),
  },
  {
    id: "jest", label: "Jest", kind: "unitario", ecosystem: "node",
    detect: ({ dep, cfg, pkg }) => dep("jest") || dep("ts-jest") || dep("@jest/globals") || cfg(["jest.config.*", "**/jest.config.*"]) || Boolean(pkg && pkg.jest),
    build: ({ rawDir, wantCoverage, installIfMissing }) => ({
      cmd: "npx",
      args: [...NPX(installIfMissing), "jest", "--ci", "--json", `--outputFile=${join(rawDir, "jest.json")}`, "--passWithNoTests",
        ...(wantCoverage ? ["--coverage", "--coverageReporters=json-summary", "--coverageReporters=lcov", `--coverageDirectory=${join(rawDir, "coverage-jest")}`] : [])],
      env: { CI: "true", FORCE_COLOR: "0" },
      report: { format: "jest-json", path: join(rawDir, "jest.json") },
      coverage: wantCoverage ? { dir: join(rawDir, "coverage-jest") } : null,
    }),
  },
  {
    id: "node-test", label: "node:test (runner nativo do Node)", kind: "unitario", ecosystem: "node",
    detect: ({ dep, scripts, testFileMatches }) => !dep("vitest") && !dep("jest")
      && (/node\s+--test/.test(String(scripts.test || "")) || testFileMatches(/from\s+["']node:test["']|require\(["']node:test["']\)/)),
    build: ({ rawDir, wantCoverage, installIfMissing, execPath, has }) => (wantCoverage
      ? {
        // `c8` global é usado direto; só caímos no npx quando ele está no node_modules do
        // projeto. `npx --no-install` NÃO enxerga binário global — insistir nele fazia a
        // cobertura falhar em toda máquina que tem c8 instalado globalmente.
        ...(has("c8")
          ? { cmd: "c8", args: [] }
          : { cmd: "npx", args: [...NPX(installIfMissing), "c8"] }),
        args: [
          ...(has("c8") ? [] : [...NPX(installIfMissing), "c8"]),
          "--reporter=json-summary", "--reporter=lcov", `--report-dir=${join(rawDir, "coverage-node")}`,
          execPath, "--test", "--test-reporter=tap",
        ],
        env: { CI: "true", NO_COLOR: "1" },
        // TAP é o primário porque preserva o ARQUIVO de cada teste (o reporter junit do
        // node:test é plano: `classname="test"` para tudo). Sem o arquivo não há como
        // separar unitário de funcional.
        report: {
          format: "tap", stdoutTo: join(rawDir, "node-test.tap"),
          fallback: { format: "junit", path: join(rawDir, "node-test-junit.xml") },
        },
        coverage: { dir: join(rawDir, "coverage-node"), optional: true },
      }
      : {
        cmd: execPath,
        args: ["--test", "--test-reporter=tap"],
        env: { CI: "true", NO_COLOR: "1" },
        report: {
          format: "tap", stdoutTo: join(rawDir, "node-test.tap"),
          fallback: { format: "junit", path: join(rawDir, "node-test-junit.xml") },
        },
      }),
  },
  {
    id: "mocha", label: "Mocha", kind: "unitario", ecosystem: "node",
    detect: ({ dep }) => dep("mocha") && !dep("cypress"),
    build: ({ rawDir, installIfMissing }) => ({
      cmd: "npx", args: [...NPX(installIfMissing), "mocha", "--reporter", "json", "--reporter-option", `output=${join(rawDir, "mocha.json")}`],
      env: { CI: "true" },
      report: { format: "mocha-json", path: join(rawDir, "mocha.json"), stdoutFallback: true },
    }),
  },
  {
    id: "jasmine-karma", label: "Karma + Jasmine (Angular)", kind: "unitario", ecosystem: "node",
    detect: ({ dep, cfg }) => (dep("karma") || cfg(["karma.conf.*"])) && !dep("vitest"),
    build: ({ rawDir, wantCoverage, installIfMissing }) => ({
      cmd: "npx",
      args: [...NPX(installIfMissing), "ng", "test", "--watch=false", "--browsers=ChromeHeadless",
        "--reporters=junit", ...(wantCoverage ? ["--code-coverage"] : [])],
      env: { CI: "true" },
      report: { format: "junit", glob: ["**/junit*.xml", "**/TESTS-*.xml", "**/test-results/**/*.xml"] },
      coverage: wantCoverage ? { glob: ["**/coverage/**/coverage-summary.json", "**/coverage/**/lcov.info"] } : null,
    }),
  },
  {
    id: "bun-test", label: "bun test", kind: "unitario", ecosystem: "node",
    detect: ({ file, has }) => file("bun.lockb") && has("bun"),
    build: ({ rawDir }) => ({
      cmd: "bun", args: ["test", "--reporter=junit", `--reporter-outfile=${join(rawDir, "bun-junit.xml")}`],
      env: { CI: "true" },
      report: { format: "junit", path: join(rawDir, "bun-junit.xml") },
    }),
  },
  {
    id: "deno-test", label: "deno test", kind: "unitario", ecosystem: "deno",
    detect: ({ file, has }) => (file("deno.json") || file("deno.jsonc")) && has("deno"),
    build: ({ rawDir, wantCoverage }) => ({
      cmd: "deno",
      args: ["test", "--allow-all", "--junit-path", join(rawDir, "deno-junit.xml"),
        ...(wantCoverage ? [`--coverage=${join(rawDir, "coverage-deno")}`] : [])],
      report: { format: "junit", path: join(rawDir, "deno-junit.xml") },
    }),
  },

  // ───────────────────────────── Python ─────────────────────────────
  {
    id: "pytest", label: "pytest", kind: "unitario", ecosystem: "python",
    detect: ({ cfg, has, anyFile }) => (cfg(["pytest.ini", "tox.ini", "conftest.py", "**/conftest.py"])
      || anyFile(["pyproject.toml", "setup.cfg"], /\[tool\.pytest|\[pytest\]/)
      || cfg(["tests/test_*.py", "test_*.py", "**/test_*.py", "**/*_test.py"]))
      && (has("pytest") || has("python3") || has("python")),
    build: ({ rawDir, wantCoverage, has }) => {
      // `python3 -m pytest` tem precedência sobre o shim `pytest`: o `-m` garante que o
      // interpretador e o site-packages são os mesmos, então plugins como o pytest-cov
      // são enxergados. O shim do PATH pode ser de outra instalação — foi assim que um
      // projeto com pytest-cov instalado saiu no relatório como "cobertura indisponível".
      const py = has("python3") ? { cmd: "python3", pre: ["-m", "pytest"] }
        : has("python") ? { cmd: "python", pre: ["-m", "pytest"] }
          : { cmd: "pytest", pre: [] };
      return {
        cmd: py.cmd,
        args: [...py.pre, `--junitxml=${join(rawDir, "pytest-junit.xml")}`, "-q",
          ...(wantCoverage ? ["--cov=.", `--cov-report=xml:${join(rawDir, "coverage-pytest.xml")}`, "--cov-report=term:skip-covered"] : [])],
        env: { PYTHONUTF8: "1", PYTHONDONTWRITEBYTECODE: "1" },
        report: { format: "junit", path: join(rawDir, "pytest-junit.xml") },
        coverage: wantCoverage ? { path: join(rawDir, "coverage-pytest.xml"), optional: true } : null,
      };
    },
  },
  {
    id: "unittest", label: "unittest (Python)", kind: "unitario", ecosystem: "python",
    detect: ({ cfg, has, detected }) => !detected("pytest") && cfg(["**/test_*.py", "**/tests/*.py"]) && (has("python3") || has("python")),
    build: ({ rawDir, has }) => ({
      cmd: has("python3") ? "python3" : "python",
      args: ["-m", "unittest", "discover", "-v"],
      env: { PYTHONUTF8: "1" },
      report: { format: "unittest-text", stdoutTo: join(rawDir, "unittest.txt") },
    }),
  },
  {
    id: "behave", label: "behave (BDD Python)", kind: "funcional", ecosystem: "python",
    detect: ({ cfg, has }) => cfg(["features/*.feature", "**/features/*.feature"]) && has("behave"),
    build: ({ rawDir }) => ({
      cmd: "behave", args: ["--junit", `--junit-directory=${join(rawDir, "behave")}`],
      report: { format: "junit", glob: ["*.xml"], baseDir: join(rawDir, "behave") },
    }),
  },

  // ───────────────────────────── JVM ─────────────────────────────
  {
    id: "maven", label: "Maven Surefire/Failsafe", kind: "unitario", ecosystem: "jvm",
    detect: ({ file, wrapper, has }) => file("pom.xml") && (Boolean(wrapper("mvnw")) || has("mvn")),
    build: ({ root, wrapper, wantCoverage }) => ({
      cmd: wrapper("mvnw") || "mvn",
      args: wantCoverage ? ["-B", "test", "jacoco:report"] : ["-B", "test"],
      report: { format: "junit", glob: ["**/target/surefire-reports/*.xml", "**/target/failsafe-reports/*.xml"], allowDirs: ["target"] },
      coverage: wantCoverage ? { glob: ["**/target/site/jacoco/jacoco.xml", "**/target/site/jacoco/jacoco.csv"], allowDirs: ["target"], optional: true } : null,
      root,
    }),
  },
  {
    id: "gradle", label: "Gradle Test", kind: "unitario", ecosystem: "jvm",
    detect: ({ file, wrapper, has }) => (Boolean(wrapper("gradlew")) || file("build.gradle") || file("build.gradle.kts"))
      && (Boolean(wrapper("gradlew")) || has("gradle")),
    build: ({ wrapper, wantCoverage }) => ({
      cmd: wrapper("gradlew") || "gradle",
      args: wantCoverage ? ["test", "jacocoTestReport", "--console=plain"] : ["test", "--console=plain"],
      report: { format: "junit", glob: ["**/build/test-results/**/*.xml"], allowDirs: ["build", "test-results"] },
      coverage: wantCoverage ? { glob: ["**/build/reports/jacoco/**/*.xml"], allowDirs: ["build", "reports"], optional: true } : null,
    }),
  },
  {
    id: "sbt", label: "sbt (Scala)", kind: "unitario", ecosystem: "jvm",
    detect: ({ file, has }) => file("build.sbt") && has("sbt"),
    build: () => ({
      cmd: "sbt", args: ["-batch", "test"],
      report: { format: "junit", glob: ["**/target/test-reports/*.xml"], allowDirs: ["target"] },
    }),
  },

  // ───────────────────────────── .NET ─────────────────────────────
  {
    id: "dotnet", label: "dotnet test (xUnit/NUnit/MSTest)", kind: "unitario", ecosystem: "dotnet",
    detect: ({ cfg, has }) => cfg(["**/*.csproj", "*.csproj", "**/*.sln", "**/*.fsproj", "**/*.vbproj"]) && has("dotnet"),
    build: ({ rawDir, wantCoverage }) => ({
      cmd: "dotnet",
      args: ["test", "--nologo", "--logger", `trx;LogFileName=${join(rawDir, "dotnet-test.trx")}`,
        ...(wantCoverage ? ["--collect:XPlat Code Coverage", "--results-directory", join(rawDir, "dotnet-results")] : [])],
      report: { format: "trx", path: join(rawDir, "dotnet-test.trx"), glob: ["**/TestResults/*.trx"], allowDirs: ["TestResults", "bin", "obj"] },
      coverage: wantCoverage ? { glob: ["**/coverage.cobertura.xml"], allowDirs: ["TestResults", "dotnet-results", "bin", "obj"], optional: true } : null,
    }),
  },

  // ───────────────────────────── Go / Rust / nativos ─────────────────────────────
  {
    id: "go", label: "go test", kind: "unitario", ecosystem: "go",
    detect: ({ file, has }) => file("go.mod") && has("go"),
    build: ({ rawDir, wantCoverage }) => ({
      cmd: "go",
      args: ["test", "./...", "-json", ...(wantCoverage ? [`-coverprofile=${join(rawDir, "go-coverage.out")}`, "-covermode=atomic"] : [])],
      report: { format: "go-json", stdoutTo: join(rawDir, "go-test.jsonl") },
      coverage: wantCoverage ? { path: join(rawDir, "go-coverage.out"), optional: true } : null,
    }),
  },
  {
    id: "cargo", label: "cargo test (Rust)", kind: "unitario", ecosystem: "rust",
    detect: ({ file, has }) => file("Cargo.toml") && has("cargo"),
    build: ({ rawDir }) => ({
      cmd: "cargo", args: ["test", "--", "-Z", "unstable-options", "--format", "json", "--report-time"],
      env: { RUSTC_BOOTSTRAP: "1" },
      report: { format: "cargo-json", stdoutTo: join(rawDir, "cargo-test.jsonl"), fallback: { format: "cargo-text" } },
    }),
  },
  {
    id: "ctest", label: "CTest (C/C++)", kind: "unitario", ecosystem: "c",
    detect: ({ file, has }) => file("CMakeLists.txt") && has("ctest"),
    build: ({ rawDir }) => ({
      cmd: "ctest", args: ["--output-junit", join(rawDir, "ctest-junit.xml"), "--output-on-failure"],
      report: { format: "junit", path: join(rawDir, "ctest-junit.xml"), allowDirs: ["build"] },
    }),
  },

  // ───────────────────────────── Ruby / PHP / Elixir / outras ─────────────────────────────
  {
    id: "rspec", label: "RSpec (Ruby)", kind: "unitario", ecosystem: "ruby",
    detect: ({ cfg, has }) => cfg([".rspec", "spec/**/*_spec.rb"]) && (has("rspec") || has("bundle")),
    build: ({ rawDir, has }) => ({
      cmd: has("bundle") ? "bundle" : "rspec",
      args: has("bundle")
        ? ["exec", "rspec", "--format", "RspecJunitFormatter", "--out", join(rawDir, "rspec-junit.xml")]
        : ["--format", "RspecJunitFormatter", "--out", join(rawDir, "rspec-junit.xml")],
      report: { format: "junit", path: join(rawDir, "rspec-junit.xml") },
      coverage: { glob: ["coverage/.last_run.json", "coverage/.resultset.json"], allowDirs: ["coverage"], optional: true },
    }),
  },
  {
    id: "minitest", label: "Minitest (Rake)", kind: "unitario", ecosystem: "ruby",
    detect: ({ cfg, has, detected }) => !detected("rspec") && cfg(["Rakefile", "test/**/*_test.rb"]) && has("rake"),
    build: ({ rawDir }) => ({
      cmd: "rake", args: ["test"],
      report: { format: "minitest-text", stdoutTo: join(rawDir, "minitest.txt") },
    }),
  },
  {
    id: "phpunit", label: "PHPUnit", kind: "unitario", ecosystem: "php",
    detect: ({ cfg, file }) => cfg(["phpunit.xml", "phpunit.xml.dist", "phpunit.dist.xml"]) || file("vendor/bin/phpunit"),
    build: ({ root, rawDir, wantCoverage, file }) => ({
      cmd: file("vendor/bin/phpunit") ? join(root, "vendor", "bin", "phpunit") : "phpunit",
      args: [`--log-junit=${join(rawDir, "phpunit-junit.xml")}`,
        ...(wantCoverage ? [`--coverage-clover=${join(rawDir, "phpunit-clover.xml")}`] : [])],
      report: { format: "junit", path: join(rawDir, "phpunit-junit.xml") },
      coverage: wantCoverage ? { path: join(rawDir, "phpunit-clover.xml"), optional: true } : null,
    }),
  },
  {
    id: "pest", label: "Pest (PHP)", kind: "unitario", ecosystem: "php",
    detect: ({ file, detected }) => !detected("phpunit") && file("vendor/bin/pest"),
    build: ({ root, rawDir }) => ({
      cmd: join(root, "vendor", "bin", "pest"),
      args: [`--log-junit=${join(rawDir, "pest-junit.xml")}`],
      report: { format: "junit", path: join(rawDir, "pest-junit.xml") },
    }),
  },
  {
    id: "exunit", label: "ExUnit (Elixir)", kind: "unitario", ecosystem: "elixir",
    detect: ({ file, has }) => file("mix.exs") && has("mix"),
    build: ({ rawDir }) => ({
      cmd: "mix", args: ["test"],
      env: { MIX_ENV: "test" },
      report: { format: "exunit-text", stdoutTo: join(rawDir, "exunit.txt") },
    }),
  },
  {
    id: "flutter", label: "Flutter / Dart test", kind: "unitario", ecosystem: "dart",
    detect: ({ file, has }) => file("pubspec.yaml") && (has("flutter") || has("dart")),
    build: ({ rawDir, wantCoverage, has }) => ({
      cmd: has("flutter") ? "flutter" : "dart",
      args: ["test", "--reporter=json", ...(wantCoverage ? ["--coverage"] : [])],
      report: { format: "dart-json", stdoutTo: join(rawDir, "dart-test.jsonl") },
      coverage: wantCoverage ? { glob: ["coverage/lcov.info"], allowDirs: ["coverage"], optional: true } : null,
    }),
  },
  {
    id: "swift", label: "swift test (XCTest)", kind: "unitario", ecosystem: "apple",
    detect: ({ file, has }) => file("Package.swift") && has("swift"),
    build: ({ rawDir }) => ({
      cmd: "swift", args: ["test", "--parallel", "--xunit-output", join(rawDir, "swift-junit.xml")],
      report: { format: "junit", path: join(rawDir, "swift-junit.xml") },
    }),
  },
  {
    id: "perl-prove", label: "prove (Perl)", kind: "unitario", ecosystem: "perl",
    detect: ({ cfg, has }) => cfg(["t/*.t", "**/t/*.t"]) && has("prove"),
    build: ({ rawDir }) => ({
      cmd: "prove", args: ["-r", "--formatter", "TAP::Formatter::JUnit", "t"],
      report: { format: "junit", stdoutTo: join(rawDir, "perl-junit.xml"), fallback: { format: "tap" } },
    }),
  },
  {
    id: "busted", label: "busted (Lua)", kind: "unitario", ecosystem: "lua",
    detect: ({ cfg, has }) => cfg(["**/*_spec.lua", ".busted"]) && has("busted"),
    build: ({ rawDir }) => ({
      cmd: "busted", args: ["--output=junit", "-o", join(rawDir, "busted-junit.xml")],
      report: { format: "junit", path: join(rawDir, "busted-junit.xml"), stdoutFallback: true },
    }),
  },

  // ───────────────────────────── Funcionais / E2E ─────────────────────────────
  {
    id: "playwright", label: "Playwright", kind: "funcional", ecosystem: "node",
    detect: ({ dep, cfg }) => dep("@playwright/test") || dep("playwright") || cfg(["playwright.config.*", "**/playwright.config.*"]),
    build: ({ rawDir, installIfMissing }) => ({
      cmd: "npx", args: [...NPX(installIfMissing), "playwright", "test", "--reporter=json"],
      env: { CI: "true", PLAYWRIGHT_JSON_OUTPUT_NAME: join(rawDir, "playwright.json"), FORCE_COLOR: "0" },
      report: { format: "playwright-json", path: join(rawDir, "playwright.json"), stdoutFallback: true },
    }),
  },
  {
    id: "cypress", label: "Cypress", kind: "funcional", ecosystem: "node",
    detect: ({ dep, cfg }) => dep("cypress") || cfg(["cypress.config.*", "cypress.json"]),
    build: ({ rawDir, installIfMissing }) => ({
      cmd: "npx",
      args: [...NPX(installIfMissing), "cypress", "run", "--reporter", "junit",
        "--reporter-options", `mochaFile=${join(rawDir, "cypress", "cy-[hash].xml")},toConsole=false`],
      env: { CI: "true", FORCE_COLOR: "0" },
      report: { format: "junit", glob: ["*.xml"], baseDir: join(rawDir, "cypress") },
    }),
  },
  {
    id: "wdio", label: "WebdriverIO", kind: "funcional", ecosystem: "node",
    detect: ({ dep, cfg }) => dep("@wdio/cli") || cfg(["wdio.conf.*"]),
    build: ({ rawDir, installIfMissing }) => ({
      cmd: "npx", args: [...NPX(installIfMissing), "wdio", "run", "wdio.conf.js"],
      env: { CI: "true" },
      report: { format: "junit", glob: ["**/*.xml"], baseDir: rawDir, allowDirs: ["results", "reports"] },
    }),
  },
  {
    id: "robot", label: "Robot Framework", kind: "funcional", ecosystem: "python",
    detect: ({ cfg, has }) => cfg(["**/*.robot", "*.robot"]) && has("robot"),
    build: ({ rawDir }) => ({
      cmd: "robot", args: ["--xunit", join(rawDir, "robot-junit.xml"), "--output", join(rawDir, "robot-output.xml"), "."],
      report: { format: "junit", path: join(rawDir, "robot-junit.xml") },
    }),
  },
  {
    id: "cucumber-js", label: "Cucumber (JS)", kind: "funcional", ecosystem: "node",
    detect: ({ dep, cfg }) => dep("@cucumber/cucumber") && cfg(["features/**/*.feature"]),
    build: ({ rawDir, installIfMissing }) => ({
      cmd: "npx", args: [...NPX(installIfMissing), "cucumber-js", "--format", `junit:${join(rawDir, "cucumber-junit.xml")}`],
      env: { CI: "true" },
      report: { format: "junit", path: join(rawDir, "cucumber-junit.xml") },
    }),
  },
  {
    id: "specflow", label: "SpecFlow / Reqnroll (.NET)", kind: "funcional", ecosystem: "dotnet",
    detect: ({ cfg, detected }) => detected("dotnet") && cfg(["**/*.feature"]),
    build: ({ rawDir }) => ({
      cmd: "dotnet", args: ["test", "--nologo", "--filter", "Category=Feature", "--logger", `trx;LogFileName=${join(rawDir, "specflow.trx")}`],
      report: { format: "trx", path: join(rawDir, "specflow.trx"), allowDirs: ["TestResults"] },
    }),
  },

  // ───────────────────────────── Contrato e performance ─────────────────────────────
  {
    id: "newman", label: "Newman (coleção Postman)", kind: "contrato", ecosystem: "node",
    detect: ({ cfg }) => cfg(["**/*postman_collection.json", "**/collections/*.json"]),
    build: ({ rawDir, installIfMissing, matched }) => ({
      cmd: "npx",
      args: [...NPX(installIfMissing), "newman", "run", matched[0], "-r", "junit", "--reporter-junit-export", join(rawDir, "newman-junit.xml")],
      report: { format: "junit", path: join(rawDir, "newman-junit.xml") },
    }),
  },
  {
    id: "pact", label: "Pact (contrato)", kind: "contrato", ecosystem: "node",
    detect: ({ dep, cfg }) => dep("@pact-foundation/pact") || cfg(["pacts/*.json"]),
    build: ({ rawDir, installIfMissing }) => ({
      cmd: "npx", args: [...NPX(installIfMissing), "jest", "--ci", "--json", `--outputFile=${join(rawDir, "pact.json")}`, "--testPathPattern=pact"],
      env: { CI: "true" },
      report: { format: "jest-json", path: join(rawDir, "pact.json") },
    }),
  },
  {
    id: "k6", label: "k6 (carga)", kind: "performance", ecosystem: null,
    detect: ({ cfg, has }) => cfg(["**/k6/*.js", "**/*.k6.js", "load-test*.js"]) && has("k6"),
    build: ({ rawDir, matched }) => ({
      cmd: "k6", args: ["run", "--summary-export", join(rawDir, "k6-summary.json"), matched[0]],
      report: { format: "k6-json", path: join(rawDir, "k6-summary.json") },
    }),
  },
];

/**
 * Refina a natureza de um caso individual pelo caminho e pelo nome.
 * Um projeto com Jest costuma ter unitário E integração na mesma suíte; a pasta e o
 * sufixo do arquivo são o sinal mais confiável para separar o que o cliente lê.
 */
export function classifyCase({ file, suite, name, runnerKind }) {
  const hay = `${file || ""} ${suite || ""} ${name || ""}`.toLowerCase().replace(/\\/g, "/");

  if (/\b(a11y|acessibilidade|accessibility|axe)\b/.test(hay)) return "acessibilidade";
  if (/\b(perf|performance|carga|load|stress|benchmark|k6|jmeter|gatling)\b/.test(hay)) return "performance";
  if (/\b(contract|contrato|pact|schemathesis|openapi|newman|postman)\b/.test(hay)) return "contrato";
  if (/(^|\/)(e2e|end-to-end|ui|browser|cypress|playwright|selenium|features)(\/|$)|\.e2e\.|\be2e\b|@e2e/.test(hay)) return "funcional";
  if (/(^|\/)(it|integration|integracao|integração|api|component)(\/|$)|\.(int|integration|it)\.|\bintegra(c|ç)/.test(hay)) return "integracao";
  if (/(^|\/)(unit|unitario|unitário)(\/|$)|\.unit\./.test(hay)) return "unitario";

  return runnerKind || "unitario";
}

/** Constrói o contexto de detecção para um repositório. */
export function detectionContext({ root, pkg, scripts, deps, helpers }) {
  const detectedIds = new Set();
  return {
    root,
    pkg,
    scripts,
    dep: (name) => Object.prototype.hasOwnProperty.call(deps, name),
    cfg: helpers.cfg,
    file: helpers.file,
    anyFile: helpers.anyFile,
    has: helpers.has,
    wrapper: helpers.wrapper,
    testFileMatches: helpers.testFileMatches,
    detected: (id) => detectedIds.has(id),
    _markDetected: (id) => detectedIds.add(id),
  };
}
