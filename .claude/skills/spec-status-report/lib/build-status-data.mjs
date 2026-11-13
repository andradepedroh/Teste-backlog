// build-status-data.mjs — junta os coletores num único status-data.json.
//
// O JSON é o contrato entre coleta e renderização: o agente pode inspecioná-lo, corrigir
// o executive-summary.md e re-renderizar sem re-executar testes (--render-only).

import { join } from "node:path";
import { asArray, fileExists, pct, readJson, readText, relPosix, truncate, uniq } from "./util.mjs";
import { findArtifact } from "./detect-phase.mjs";
import { normalizeTasksJson, idFamily } from "./discover-artifacts.mjs";
import { businessCoverage, testPlanCoverage, coverageLevel } from "./coverage.mjs";
import { KINDS } from "./test-runners.mjs";
import { collectExtras, EXTRA_WARNING_CODES } from "./collect-extras.mjs";
import { deriveDelivery } from "./derive-delivery.mjs";
import { buildTestGaps } from "./lacunas-teste.mjs";
import { analyzeBugs, applyBugSignal } from "./bug-modules.mjs";
import { DEFAULT_BUG_TYPES } from "./collect-azure.mjs";

export function buildStatusData(ctx) {
  const {
    root, outputsDir, writeDir, phase, docs, code, tests, azure, options, scope,
  } = ctx;

  // Artefatos de extensão + camada editorial. Todos opcionais: o que não existir
  // volta `null` e o renderer suprime a seção correspondente.
  const extras = collectExtras({ root, outputsDir, writeDir });

  // Ritmo de entrega derivado das datas de fechamento do tracker. `null` quando não
  // há backlog coletado — nunca uma velocidade inventada.
  const delivery = deriveDelivery(azure);

  const tasks = loadTasks(outputsDir);
  const traceMatrix = buildTraceMatrix({ docs, code, tests, tasks, azure });
  const generatedAt = new Date().toISOString();

  // «O que falta testar» e «Bugs por módulo»: derivados do que já foi coletado mais os
  // artefatos de extensão. Ficam em funções próprias porque o --render-only os recalcula
  // depois de reler os extras — ver `refreshExtras`.
  const testGaps = buildTestGaps({
    traceMatrix, tests, code, curated: extras.testGaps, findings: extras.testFindings,
    collectedAt: generatedAt, business: docs.business, tasks,
  });
  const bugTypes = (options.bugTypes && options.bugTypes.length) ? options.bugTypes : DEFAULT_BUG_TYPES;
  const bugs = analyzeBugs({
    azure, tasks, business: docs.business, bugTypes,
    moduleMap: extras.bugModuleMap, findings: extras.testFindings, traceRows: traceMatrix.rows,
  });

  const health = applyBugSignal(computeHealth({ phase, docs, code, tests, azure, tasks, traceMatrix, mode: options.mode }), bugs);
  const kpis = buildKpis({ phase, docs, code, tests, azure, tasks, traceMatrix });
  const curated = loadCurated(root, writeDir || outputsDir, outputsDir);
  const risks = buildRisks({ docs, tests, azure, code, traceMatrix });

  // Três coberturas distintas — ver coverage.mjs. Nenhuma substitui a outra.
  const testing = {
    code: tests?.coverage || null,
    codeLevel: coverageLevel(tests?.coverage?.lines ?? null),
    business: businessCoverage(traceMatrix.rows),
    plan: testPlanCoverage(docs.business.testPlanCases, buildIdToCasesIndex(tests, code)),
    kinds: Object.entries(tests?.byKind || {})
      .map(([k, v]) => ({ kind: k, ...v, order: KINDS[k]?.order ?? 99 }))
      .sort((a, b) => a.order - b.order),
  };

  // `domains` continua no contrato como INVENTÁRIO do que a coleta encontrou — é lido
  // por quem inspeciona o status-data.json. A decisão final de quais abas existem é do
  // renderer, que só publica a aba cujo HTML saiu não-vazio; manter as duas listas em
  // sincronia manualmente foi o que gerava aba em branco no menu.
  const domains = [];
  const push = (id, label, present) => { if (present) domains.push({ id, label }); };
  push("visao", "Sumário", true);
  push("negocio", "Negócio", Boolean(
    extras.operations || extras.flows
    || docs.business.chapters.length || docs.business.rules.length || docs.business.requirements.functional.length,
  ));
  push("tecnico", "Técnico", Boolean(
    extras.apiCatalog
    || docs.technical.rules.length || docs.technical.dataModel || docs.technical.apiContracts || docs.technical.chapters.length,
  ));
  push("codigo", "Código", Boolean(code && code.inventory.codeFileCount));
  push("testes", "Testes", Boolean(tests && (tests.cases.length || tests.suites.length || tests.detection.runners.length)));
  push("lacunas-teste", "O que falta testar", Boolean(testGaps && testGaps.available));
  push("gestao", "Execução e backlog", Boolean(azure && (azure.items?.length || azure.mode !== "disabled")));
  push("riscos", "Riscos e decisões", Boolean(
    risks.items.length || docs.business.gaps.length || curated.sections?.nextSteps || docs.syncLog
    || (extras.content.decisions || []).length,
  ));
  push("anexos", "Anexos", Boolean(
    extras.annexes || extras.glossary || (extras.content.revisions || []).length
    || (phase.discovery && (phase.discovery.provenance || []).length),
  ));

  return {
    schema: "spec-status-report/status-data@2.0",
    generatedAt,
    generator: { skill: "spec-status-report", version: "2.2" },
    report: {
      mode: options.mode,                            // status | conclusao
      title: options.title || defaultTitle(options.mode, docs.business.projectName),
      projectName: options.projectName || docs.business.projectName || "Projeto sem nome definido",
      client: options.client || null,
      author: options.author || null,
      period: options.period || null,
      confidential: options.confidential !== false,
    },
    phase: {
      stage: phase.stage,
      detected: phase.detected,
      overridden: phase.overridden,
      label: phase.label,
      description: phase.description,
      signals: phase.signals,
      hasAudit: phase.hasAudit,
    },
    health,
    kpis,
    curated,
    domains,
    business: docs.business,
    technical: docs.technical,
    syncLog: docs.syncLog,
    tasks,
    code,
    tests,
    azure,
    traceMatrix,
    testing,
    extras,
    testGaps,
    bugs,
    delivery,
    // Escopo da coleta: quais pastas foram varridas, ou a declaração de que foi
    // presumido. Sem isto, dois relatórios do mesmo repositório com números diferentes
    // não têm como ser explicados.
    scope: scope ? {
      declared: scope.declared,
      docs: scope.docs.map(scopeEntry),
      code: scope.code.map(scopeEntry),
      tests: scope.tests.map(scopeEntry),
      extra: scope.extra.map(scopeEntry),
    } : null,
    provenance: phase.discovery || null,
    risks,
    warnings: uniqWarnings([
      ...(curated.stub ? [{ code: "EXEC_SUMMARY_STUB", message: `${curated.path} existe mas não foi preenchido (${curated.stubReason}) — usando o panorama automático.` }] : []),
      ...(docs.warnings || []),
      ...((tests && tests.warnings) || []),
      ...((azure && azure.warnings) || []),
      ...(extras.warnings || []),
      ...((testGaps && testGaps.warnings) || []),
      ...((bugs && bugs.warnings) || []),
      // Declarar POR QUE a leitura por sprint não existe. Vale para as duas rotas
      // (REST e snapshot MCP): sem esta linha, o leitor conclui que a skill esqueceu
      // a seção, quando o que houve foi ausência de sprint configurado no tracker.
      ...(delivery && !delivery.hasSprints && delivery.undatedIterations
        ? [{
          code: "AZURE_ITERATIONS_UNDATED",
          message: `${delivery.undatedIterations} iteração(ões) do projeto não têm data de início e fim — são caminhos de escopo, não sprints. Ritmo por sprint, velocidade, projeção e carga por pessoa não foram montados; o fechamento por semana continua, por vir das datas reais de fechamento.`,
        }]
        : []),
      // Em relatório de conclusão, entregar o panorama derivado em vez da leitura do
      // consultor é entrega pobre — o aviso cobra o arquivo em vez de deixar passar.
      ...(options.mode === "conclusao" && !extras.content.present && !curated.present ? [REPORT_CONTENT_ABSENT] : []),
      ...(ctx.warnings || []),
    ]),
    paths: {
      root: ".",
      outputs: relPosix(root, writeDir || outputsDir),
      artifactsReadFrom: relPosix(root, outputsDir),
      legacyRead: Boolean(writeDir && writeDir !== outputsDir),
    },
  };
}

const REPORT_CONTENT_ABSENT = {
  code: "REPORT_CONTENT_ABSENT",
  message: "Relatório de conclusão sem conteúdo editorial: o veredito saiu derivado do semáforo e a leitura do consultor, do panorama automático. Preencha status/status-report-content.json ou status/executive-summary.md.",
};

function defaultTitle(mode, projectName) {
  const p = projectName ? ` — ${projectName}` : "";
  return mode === "conclusao" ? `Relatório de Conclusão${p}` : `Relatório de Status${p}`;
}

function loadTasks(outputsDir) {
  const p = findArtifact(outputsDir, "tasks.json");
  if (!p) return null;
  const data = readJson(p);
  if (!data || typeof data !== "object") return { path: p, invalid: true };
  // Adaptador multi-versão: v1/v2 (lista plana), v3 (feature/story), v4/v5 (epic/story).
  const norm = normalizeTasksJson(data);
  if (!norm) return { path: p, invalid: true };
  return { path: p, ...norm };
}

function idOf(x) {
  if (!x) return null;
  if (typeof x === "string") return (x.match(/\b(?:RNF|RN-NOVO|RN|RF|PR)-[A-Z0-9-]+\b/) || [x])[0];
  return x.id || x.code || null;
}

/**
 * Matriz de rastreabilidade: cada regra/requisito de negócio × onde está no código ×
 * quais testes a exercitam × qual work item do ADO a carrega.
 * É a resposta literal a "onde cada coisa de negócio foi implementada".
 */
export function buildTraceMatrix({ docs, code, tests, tasks, azure }) {
  const rows = [];
  const traceById = new Map((code?.traceability?.byId || []).map((t) => [t.id, t]));
  const caseIndex = buildIdToCasesIndex(tests, code);
  const taskIndex = indexTasksById(tasks);
  const adoByLogical = new Map((azure?.items || []).filter((i) => i.logicalId).map((i) => [i.logicalId, i]));

  const source = [
    ...(docs.business.rules || []).map((r) => ({ ...r, kind: "RN", label: "Regra de negócio" })),
    ...(docs.business.requirements.functional || []).map((r) => ({ ...r, kind: "RF", label: "Requisito funcional" })),
    ...(docs.business.requirements.nonFunctional || []).map((r) => ({ ...r, kind: "RNF", label: "Requisito não funcional" })),
    ...(docs.business.productRequirements || []).map((r) => ({ ...r, kind: "PR", label: "Requisito de produto/UX" })),
  ];

  for (const item of source) {
    const trace = traceById.get(item.id);
    const testCases = caseIndex.get(item.id) || [];
    const relatedTasks = taskIndex.get(item.id) || [];
    const ado = relatedTasks.map((t) => adoByLogical.get(t.id)).filter(Boolean);
    const codeRefs = (trace?.refs || []).filter((r) => !r.isTest);
    const status = codeRefs.length
      ? (testCases.some((c) => c.status === "failed") ? "failing" : (testCases.length ? "verified" : "implemented"))
      : (relatedTasks.length ? "planned" : "unmapped");
    rows.push({
      id: item.id,
      kind: item.kind,
      kindLabel: item.label,
      title: item.title,
      module: item.module || null,
      statement: truncate(item.statement || "", 320),
      status,
      codeFiles: trace?.prodFiles || [],
      codeRefs: codeRefs.slice(0, 8),
      testCases: testCases.slice(0, 12).map((c) => ({ name: c.name, suite: c.suite, status: c.status, kind: c.kind, runner: c.runner })),
      testKinds: uniq(testCases.map((c) => c.kind).filter(Boolean)),
      testTotals: {
        total: testCases.length,
        passed: testCases.filter((c) => c.status === "passed").length,
        failed: testCases.filter((c) => c.status === "failed").length,
        skipped: testCases.filter((c) => c.status === "skipped").length,
      },
      tasks: relatedTasks.map((t) => ({ id: t.id, title: t.title })),
      workItems: ado.map((w) => ({ id: w.id, title: w.title, state: w.state, category: w.category, url: w.url })),
    });
  }

  const counts = { verified: 0, implemented: 0, failing: 0, planned: 0, unmapped: 0 };
  for (const r of rows) counts[r.status]++;
  return {
    rows: rows.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })),
    counts,
    total: rows.length,
    implementedPct: rows.length ? pct(counts.verified + counts.implemented + counts.failing, rows.length) : null,
    verifiedPct: rows.length ? pct(counts.verified, rows.length) : null,
  };
}

/**
 * Índice ID de negócio → casos de teste que o exercitam.
 *
 * Dois caminhos, porque cada cultura de teste cita o ID num lugar diferente:
 *   (a) por CASO   — o ID aparece no nome do teste, na suíte ou no caminho
 *                    (`test("RN-002 — desconto", …)`, comum em JS/Java);
 *   (b) por ARQUIVO — o ID aparece DENTRO do arquivo de teste, em docstring ou comentário
 *                    (`"""CT-002 — RN-001: atraso gera multa."""`, comum em Python/Go/Ruby).
 *                    Nesse caso, os casos daquele arquivo contam para o ID.
 *
 * Sem (b), um projeto Python inteiro aparecia com 0% de regras verificadas só porque o
 * pytest reporta o nome da função, não a docstring. Cada vínculo registra COMO foi feito
 * (`matchedBy`), para o relatório não passar por precisão que não tem.
 */
export function buildIdToCasesIndex(tests, code) {
  const map = new Map();
  const idRe = /\b(?:RNF|RN-NOVO|RN|RF|PR|TASK|STORY|EPIC|FEAT|CT|TC)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;
  const add = (id, c, matchedBy) => {
    const arr = map.get(id) || [];
    if (!arr.some((x) => x.name === c.name && x.suite === c.suite && x.file === c.file)) {
      arr.push({ ...c, matchedBy });
    }
    map.set(id, arr);
  };

  const cases = tests?.cases || [];

  // (a) ID no nome/suíte/caminho do caso
  for (const c of cases) {
    const hay = `${c.suite || ""} ${c.name || ""} ${c.file || ""}`.toUpperCase();
    idRe.lastIndex = 0;
    for (const id of uniq(hay.match(idRe) || [])) add(id, c, "nome do teste");
  }

  // (b) ID dentro do arquivo de teste → casos daquele arquivo.
  //
  // O vínculo é pelo STEM do arquivo (nome sem extensão), não pelo caminho: cada runner
  // identifica o teste de um jeito — pytest reporta `tests.test_calculo` em `classname` e
  // aponta `file` para o próprio XML; Java reporta `com.acme.CalcTest`; Go reporta o
  // pacote. O stem (`test_calculo`, `CalcTest`) é o denominador comum.
  const byStem = new Map();
  const addStem = (stem, c) => {
    if (!stem || stem.length < 3) return;
    const k = stem.toLowerCase();
    const arr = byStem.get(k) || [];
    if (!arr.includes(c)) arr.push(c);
    byStem.set(k, arr);
  };
  for (const c of cases) {
    for (const token of `${c.suite || ""} ${c.file || ""}`.split(/[\s./:\\]+/)) addStem(token, c);
  }
  // (c) ID no arquivo de teste, mas o runner não expõe arquivo nem classe — só o PACOTE
  // (é o caso do `go test`, que reporta `modulo/internal/guia`). O vínculo cai para o
  // diretório do arquivo de teste: mais grosso, e por isso rotulado como tal.
  const byDir = new Map();
  for (const c of cases) {
    for (const token of `${c.suite || ""}`.split(/[\s/\\]+/)) {
      if (!token || token.length < 3) continue;
      const arr = byDir.get(token.toLowerCase()) || [];
      if (!arr.includes(c)) arr.push(c);
      byDir.set(token.toLowerCase(), arr);
    }
  }

  for (const entry of (code?.traceability?.byId || [])) {
    let linked = false;
    for (const tf of entry.testFiles || []) {
      const parts = String(tf).replace(/\\/g, "/").split("/");
      const base = parts.pop();
      const stem = base.replace(/\.[^.]+$/, "");
      const hits = byStem.get(stem.toLowerCase()) || [];
      for (const c of hits) { add(entry.id, c, `arquivo de teste ${base}`); linked = true; }
    }
    if (linked) continue;
    for (const tf of entry.testFiles || []) {
      const parts = String(tf).replace(/\\/g, "/").split("/");
      parts.pop();
      const dir = parts[parts.length - 1];
      if (!dir) continue;
      for (const c of byDir.get(dir.toLowerCase()) || []) add(entry.id, c, `pacote de teste ${dir}`);
    }
  }
  return map;
}

function indexTasksById(tasks) {
  const map = new Map();
  for (const t of (tasks?.tasks || [])) {
    for (const id of uniq([...(t.businessRules || []), ...(t.requirements || [])])) {
      const arr = map.get(id) || [];
      arr.push(t);
      map.set(id, arr);
    }
  }
  return map;
}

/** Semáforo do relatório: verde / atenção / crítico, sempre com o motivo explícito. */
export function computeHealth({ phase, docs, code, tests, azure, traceMatrix, mode = "status" }) {
  const signals = [];
  const add = (level, area, message) => signals.push({ level, area, message });

  const t = tests && tests.totals;
  if (tests && tests.executed && t && t.total) {
    if (t.failed > 0) add("critical", "Testes", `${t.failed} de ${t.total} testes falhando.`);
    else add("ok", "Testes", `${t.passed} de ${t.total} testes passando.`);
    if (t.skipped > 0) add("warn", "Testes", `${t.skipped} teste(s) ignorado(s)/pendente(s).`);
  } else if (tests && !tests.executed && tests.skipped) {
    add("warn", "Testes", `Execução de testes desativada (${tests.skipped}).`);
  } else if (tests && tests.detection && !tests.detection.runners.length && ["implementation", "delivery"].includes(phase.stage)) {
    add("critical", "Testes", "Código implementado sem nenhum framework de teste detectado.");
  }

  const cov = tests && tests.coverage;
  if (cov && cov.measured && typeof cov.lines === "number") {
    if (cov.lines < 40) add("critical", "Cobertura de código", `Cobertura de linhas em ${cov.lines}% — abaixo do mínimo aceitável.`);
    else if (cov.lines < 60) add("warn", "Cobertura de código", `Cobertura de linhas em ${cov.lines}%.`);
    else add("ok", "Cobertura de código", `Cobertura de linhas em ${cov.lines}%.`);
  } else if (tests && tests.executed && tests.totals?.total && (!cov || !cov.measured)) {
    add("warn", "Cobertura de código", `Cobertura não medida nesta geração${cov?.reason ? ` (${cov.reason})` : ""}.`);
  }

  if (azure && azure.available && azure.summary) {
    const s = azure.summary;
    if (s.progressPct !== null) {
      // Backlog aberto só é problema quando se está declarando conclusão (ou na fase de
      // entrega). Num relatório de status de meio de sprint, 40% concluído é andamento
      // normal — pintar isso de vermelho treinaria o cliente a ignorar o semáforo.
      const claimingDone = mode === "conclusao" || phase.stage === "delivery";
      const level = claimingDone
        ? (s.progressPct >= 95 ? "ok" : s.progressPct >= 80 ? "warn" : "critical")
        : (s.progressPct >= 95 ? "ok" : "info");
      add(level, "Backlog", `${s.done} de ${s.considered} itens de trabalho concluídos (${s.progressPct}%).`
        + (claimingDone && s.progressPct < 95 ? " Relatório de conclusão com backlog em aberto." : ""));
    }
  } else if (azure && !azure.available && azure.mode !== "disabled") {
    add("warn", "Backlog", "Situação do backlog não pôde ser coletada — seção incompleta.");
  }

  const openGaps = (docs.business.gaps || []).filter((g) => !/(fechad|resolvid|closed|respondid)/i.test(g.status || ""));
  const criticalGaps = openGaps.filter((g) => /(crít|critic|alta|high|blocker)/i.test(`${g.severity || ""}`));
  if (criticalGaps.length) add("critical", "GAPs", `${criticalGaps.length} GAP(s) crítico(s)/alto(s) em aberto.`);
  else if (openGaps.length) add("warn", "GAPs", `${openGaps.length} GAP(s) em aberto (nenhum crítico).`);

  if (traceMatrix.total && ["implementation", "delivery"].includes(phase.stage)) {
    const unmapped = traceMatrix.counts.unmapped;
    if (unmapped > 0) {
      const p = pct(unmapped, traceMatrix.total);
      add(p > 30 ? "critical" : "warn", "Rastreabilidade", `${unmapped} de ${traceMatrix.total} itens de negócio sem referência no código (${p}%).`);
    } else {
      add("ok", "Rastreabilidade", "Todos os itens de negócio têm referência no código.");
    }
  }

  if (docs.technical.codeAudit) {
    const md = docs.technical.codeAudit.markdown || "";
    if (/\bBLOQUEAD[OA]\b/i.test(md)) add("critical", "Auditoria", "Auditoria de código (Fase 12) com decisão BLOQUEADO.");
    else if (/\bAPROVAD[OA]\b/i.test(md)) add("ok", "Auditoria", "Auditoria de código (Fase 12) com decisão APROVADO.");
  }

  if (code && code.todos && code.todos.total > 0) {
    add(code.todos.total > 50 ? "warn" : "info", "Dívida", `${code.todos.total} marcação(ões) TODO/FIXME/HACK no código.`);
  }

  const level = signals.some((s) => s.level === "critical") ? "critical"
    : signals.some((s) => s.level === "warn") ? "warn" : "ok";
  return {
    level,
    label: { ok: "Saudável", warn: "Atenção", critical: "Ação necessária" }[level],
    signals,
  };
}

function buildKpis({ phase, docs, code, tests, azure, tasks, traceMatrix }) {
  const k = [];
  const add = (label, value, hint, domain) => {
    if (value === null || value === undefined || value === "") return;
    k.push({ label, value, hint: hint || null, domain: domain || null });
  };

  add("Módulos", docs.business.modules.length || null, "Módulos definidos no produto", "negocio");
  add("Regras de negócio", docs.business.rules.length || null, "RN especificadas", "negocio");
  add("Requisitos funcionais", docs.business.requirements.functional.length || null, "RF especificados", "negocio");
  add("Requisitos não funcionais", docs.business.requirements.nonFunctional.length || null, "RNF especificados", "negocio");
  if (tasks && !tasks.invalid) add("Backlog", `${tasks.taskCount} tarefas / ${tasks.storyCount} histórias`, "Backlog técnico especificado", "gestao");
  if (azure?.summary?.progressPct !== null && azure?.summary) add("Backlog concluído", `${azure.summary.progressPct}%`, `${azure.summary.done} de ${azure.summary.considered} itens de trabalho`, "gestao");
  if (code?.inventory?.codeFileCount) {
    add("Arquivos de código", code.inventory.codeFileCount, `${code.inventory.testFileCount} de teste`, "codigo");
    add("Linhas de código", code.inventory.codeLines.toLocaleString("pt-BR"), `${code.inventory.totalLines.toLocaleString("pt-BR")} linhas totais, comentários e vazias incluídas`, "codigo");
  }
  if (code?.git?.available && code.git.commits) add("Commits", code.git.commits, code.git.range ? `Intervalo: ${code.git.range}` : null, "codigo");
  if (tests?.totals?.total) {
    add("Testes executados", tests.totals.total, `${tests.totals.passed} ok · ${tests.totals.failed} falhas · ${tests.totals.skipped} ignorados`, "testes");
    const rate = pct(tests.totals.passed, tests.totals.total);
    add("Taxa de aprovação", rate === null ? null : `${rate}%`, "Testes aprovados sobre total executado", "testes");
  }
  if (tests?.coverage?.measured && tests?.coverage?.lines !== null && tests?.coverage?.lines !== undefined) {
    add("Cobertura de código", `${tests.coverage.lines}%`, "Linhas exercitadas pelos testes", "testes");
  }
  if (traceMatrix.total) {
    add("Rastreabilidade", `${traceMatrix.implementedPct ?? 0}%`, `${traceMatrix.total} itens de negócio; ${traceMatrix.counts.verified} com teste`, "rastreabilidade");
    const withTest = traceMatrix.rows.filter((r) => r.testTotals?.total).length;
    add("Regras verificadas por teste", `${pct(withTest, traceMatrix.total) ?? 0}%`, `${withTest} de ${traceMatrix.total} itens de negócio`, "testes");
  }
  const openGaps = (docs.business.gaps || []).filter((g) => !/(fechad|resolvid|closed|respondid)/i.test(g.status || ""));
  if (docs.business.gaps.length) add("GAPs em aberto", openGaps.length, `${docs.business.gaps.length} registrados no total`, "riscos");
  return k;
}

function buildRisks({ docs, tests, azure, code, traceMatrix }) {
  const items = [];
  const add = (severity, area, title, detail, evidence) => items.push({ severity, area, title, detail, evidence: evidence || null });

  for (const g of docs.business.gaps || []) {
    const open = !/(fechad|resolvid|closed|respondid)/i.test(g.status || "");
    if (!open) continue;
    const sev = /(crít|critic|blocker)/i.test(g.severity || "") ? "alta" : /(alta|high)/i.test(g.severity || "") ? "alta" : "média";
    add(sev, "GAP", `${g.id} — ${g.theme}`, g.question || "", g.owner ? `Dono: ${g.owner}` : null);
  }

  const failed = (tests?.cases || []).filter((c) => c.status === "failed");
  if (failed.length) {
    add("alta", "Testes", `${failed.length} teste(s) falhando`,
      truncate(failed.slice(0, 5).map((c) => `${c.suite ? `${c.suite} › ` : ""}${c.name}`).join("; "), 400),
      "Domínio Relatório de Testes");
  }
  for (const s of (tests?.suites || [])) {
    if (!s.executed) add("média", "Testes", `Suíte não executada: ${s.label}`, s.reason || "", s.command);
  }

  if (traceMatrix.counts?.unmapped) {
    const unmapped = traceMatrix.rows.filter((r) => r.status === "unmapped").slice(0, 8).map((r) => r.id);
    add(traceMatrix.counts.unmapped > 5 ? "alta" : "média", "Rastreabilidade",
      `${traceMatrix.counts.unmapped} item(ns) de negócio sem implementação localizada`,
      `Sem referência no código: ${unmapped.join(", ")}${traceMatrix.counts.unmapped > unmapped.length ? "…" : ""}`,
      "Domínio Rastreabilidade");
  }

  if (azure && !azure.available && azure.mode !== "disabled") {
    add("média", "Backlog", "Situação do backlog indisponível nesta geração",
      (azure.warnings || []).map((w) => w.message).join(" ") || "", null);
  }

  const blocked = (azure?.items || []).filter((i) => i.tags?.some((t) => /block|impedi/i.test(t)));
  if (blocked.length) {
    add("alta", "Backlog", `${blocked.length} item(ns) de trabalho marcados como bloqueados`,
      blocked.slice(0, 6).map((i) => `#${i.id} ${i.title}`).join("; "), null);
  }

  if (code?.todos?.total > 30) {
    add("baixa", "Dívida técnica", `${code.todos.total} marcações TODO/FIXME/HACK`,
      code.todos.byKind.map((b) => `${b.key}: ${b.count}`).join(", "), null);
  }

  const order = { alta: 0, média: 1, baixa: 2 };
  return { items: items.sort((a, b) => order[a.severity] - order[b.severity]) };
}

/**
 * Recarrega apenas a narrativa curada num status-data.json já existente.
 *
 * Existe porque o fluxo documentado é: rodar a coleta → escrever o executive-summary.md →
 * `--render-only`. Sem isto, o --render-only re-renderizaria a narrativa antiga (ou o
 * panorama automático) e o texto recém-escrito pelo consultor não apareceria — o passo 3
 * da skill viraria letra morta.
 */
export function refreshCurated(root, writeDir, data, readDir = null) {
  const curated = loadCurated(root, writeDir, readDir);
  const before = data.curated || {};
  data.curated = curated;
  const others = (data.warnings || []).filter((w) => w.code !== "EXEC_SUMMARY_STUB");
  data.warnings = curated.stub
    ? [{ code: "EXEC_SUMMARY_STUB", message: `${curated.path} existe mas não foi preenchido (${curated.stubReason}) — usando o panorama automático.` }, ...others]
    : others;
  return {
    changed: Boolean(before.present) !== Boolean(curated.present)
      || (before.markdown || null) !== (curated.markdown || null),
    curated,
  };
}

/**
 * Relê do disco TODOS os artefatos de extensão num status-data.json já existente, e refaz
 * o que depende deles: a aba «O que falta testar», a leitura de bugs por módulo (o mapa
 * manual e a triagem dos testes entram nela), o sinal de bugs do semáforo, o inventário de
 * domínios e os avisos.
 *
 * Existe por um defeito de uso: o --render-only relia só o `executive-summary.md`, e quem
 * corrigia o `test-findings.json` ou o `status-report-content.json` depois da coleta
 * precisava de um script externo para chamar `collectExtras` e trocar `data.extras` à mão.
 * Ler meia dúzia de JSON custa milissegundos; os coletores caros (testes, tracker, código)
 * continuam não sendo executados.
 *
 * Devolve o que foi relido, o que faltou e as notas de compatibilidade, para o CLI
 * registrar no log.
 */
export function refreshExtras(root, writeDir, data, readDir = null, { bugTypes = null } = {}) {
  const outputsDir = readDir || writeDir;
  const extras = collectExtras({ root, outputsDir, writeDir });
  data.extras = extras;
  const notes = [];

  // status-data.json gravado por uma versão anterior desta skill: as épicas não traziam o
  // módulo, que é pista da atribuição dos bugs. Relê só esse campo do tasks.json.
  if (data.tasks && !data.tasks.invalid && (data.tasks.epics || []).some((e) => !Array.isArray(e.modules))) {
    const fresh = loadTasks(outputsDir);
    const byId = new Map(((fresh && !fresh.invalid && fresh.epics) || []).map((e) => [e.id, e.modules || []]));
    for (const e of data.tasks.epics) e.modules = byId.get(e.id) || [];
    if (byId.size) notes.push("módulos das épicas relidos do tasks.json (status-data.json gravado por versão anterior)");
  }

  data.testGaps = buildTestGaps({
    traceMatrix: data.traceMatrix, tests: data.tests, code: data.code,
    curated: extras.testGaps, findings: extras.testFindings,
    collectedAt: data.generatedAt, business: data.business, tasks: data.tasks,
  });
  const types = (bugTypes && bugTypes.length) ? bugTypes : ((data.bugs && data.bugs.types) || DEFAULT_BUG_TYPES);
  data.bugs = analyzeBugs({
    azure: data.azure, tasks: data.tasks, business: data.business, bugTypes: types,
    moduleMap: extras.bugModuleMap, findings: extras.testFindings, traceRows: (data.traceMatrix && data.traceMatrix.rows) || [],
  });
  data.health = applyBugSignal(data.health, data.bugs);

  data.domains = (data.domains || []).filter((d) => d.id !== "lacunas-teste");
  if (data.testGaps && data.testGaps.available) {
    const at = data.domains.findIndex((d) => d.id === "testes");
    data.domains.splice(at >= 0 ? at + 1 : data.domains.length, 0, { id: "lacunas-teste", label: "O que falta testar" });
  }

  const kept = (data.warnings || []).filter((w) => !EXTRA_WARNING_CODES.has(w.code));
  data.warnings = uniqWarnings([
    ...kept,
    ...(extras.warnings || []),
    ...((data.testGaps && data.testGaps.warnings) || []),
    ...((data.bugs && data.bugs.warnings) || []),
    ...(data.report && data.report.mode === "conclusao" && !extras.content.present && !(data.curated && data.curated.present) ? [REPORT_CONTENT_ABSENT] : []),
  ]);
  return { found: extras.inventory.found, missing: extras.inventory.missing, notes };
}

/**
 * Narrativa curada pelo agente (opcional): outputs/spec/status/executive-summary.md.
 * Seções reconhecidas por heading — o que faltar simplesmente não é renderizado.
 */
function loadCurated(root, writeDir, readDir) {
  const candidates = uniq([
    join(writeDir, "status", "executive-summary.md"),
    join(writeDir, "executive-summary.md"),
    ...(readDir ? [join(readDir, "status", "executive-summary.md"), join(readDir, "executive-summary.md")] : []),
  ]);
  const STUB_MARKERS = [
    "[Nome do Projeto]", "Este arquivo é OPCIONAL", "Apague este bloco de instruções",
    "[2 a 4 frases", "[Entrega 1", "[decisão] | [motivo]", "[passo] | [quem]",
  ];
  for (const p of candidates) {
    if (!fileExists(p)) continue;
    const md = readText(p) || "";
    const stubHits = STUB_MARKERS.filter((m) => md.includes(m));
    // Template não preenchido não vira narrativa: entra como aviso e o relatório usa o
    // panorama automático. Renderizar o stub colocaria "[Nome do Projeto]" na entrega.
    if (md.replace(/\s/g, "").length < 120 || stubHits.length >= 2) {
      return {
        present: false, path: relPosix(root, p), stub: true, sections: {},
        stubReason: stubHits.length >= 2
          ? `template ainda com marcadores de preenchimento (${stubHits.length} encontrados)`
          : "conteúdo muito curto (< 120 caracteres)",
      };
    }
    return {
      present: true,
      path: relPosix(root, p),
      stub: false,
      sections: splitSections(md),
      markdown: md,
    };
  }
  return { present: false, path: null, stub: false, sections: {} };
}

function splitSections(md) {
  const out = {};
  const re = /^##\s+(.+)$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(md))) marks.push({ title: m[1].trim(), start: m.index + m[0].length, headStart: m.index });
  for (let i = 0; i < marks.length; i++) {
    const body = md.slice(marks[i].start, i + 1 < marks.length ? marks[i + 1].headStart : md.length).trim();
    out[normalizeKey(marks[i].title)] = { title: marks[i].title, markdown: body };
  }
  return out;
}

function normalizeKey(title) {
  const t = title.toLowerCase();
  if (/entregue|realizado|feito|conclu/.test(t)) return "delivered";
  if (/pr[óo]xim|next|roadmap/.test(t)) return "nextSteps";
  if (/risco|aten|alerta/.test(t)) return "risks";
  if (/decis/.test(t)) return "decisions";
  if (/resumo|sum[áa]rio|panorama|vis[ãa]o/.test(t)) return "summary";
  if (/recomenda/.test(t)) return "recommendations";
  if (/pendênc|pendenc|bloque/.test(t)) return "blockers";
  return normalizeSlugKey(t);
}

function normalizeSlugKey(t) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function uniqWarnings(list) {
  const seen = new Set();
  const out = [];
  for (const w of list) {
    const k = `${w.code}|${w.message}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
}

function scopeEntry(e) {
  return { label: e.label, rel: e.rel, outsideRoot: Boolean(e.outsideRoot) };
}
