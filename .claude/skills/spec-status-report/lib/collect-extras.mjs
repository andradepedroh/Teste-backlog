// collect-extras.mjs — artefatos de EXTENSÃO, todos opcionais.
//
// Por que uma camada separada: o relatório rico (operações da EAP, catálogo de API com
// ficha por endpoint, classificação de falhas por causa-raiz, índice de anexos,
// glossário) depende de artefatos que NEM TODO projeto do kit produz — projetos
// especificados por versões anteriores das skills simplesmente não os têm.
//
// A regra desta camada é uma só: **ausência não é erro e não vira campo em branco.**
// Cada leitura devolve `null` quando o artefato não existe, e o renderer decide entre
// (a) cair no bloco clássico equivalente, montado a partir dos artefatos que existem,
// ou (b) suprimir a seção — junto com o link dela na navegação, para não deixar âncora
// órfã. O que nunca acontece é sair um gráfico vazio ou um "—" onde deveria haver dado.
//
// Os normalizadores aceitam mais de um formato de propriedade (pt/en, singular/plural,
// objeto/array) porque a mesma informação foi nomeada de jeitos diferentes ao longo das
// versões — e ninguém vai reescrever o artefato de um projeto entregue para gerar um
// relatório.

import { statSync } from "node:fs";
import { join } from "node:path";
import { asArray, fileExists, readJson, readText, relPosix } from "./util.mjs";
import { findArtifact } from "./detect-phase.mjs";
import { normalizeGlossary } from "./glossary.mjs";

/** Artefatos de extensão e o que cada um habilita no relatório. */
export const EXTRA_ARTIFACTS = {
  "business-operations.json": "operações da EAP, matriz de aceite e escopo por frente",
  "business-flows.json": "fluxos de processo com etapas e telas",
  "api-catalog.json": "superfície de API com ficha por endpoint",
  "test-findings.json": "classificação das falhas de teste por causa-raiz",
  "test-gaps.json": "análise item a item do que falta testar (aba «O que falta testar»)",
  "anexos-index.json": "índice dos documentos anexos",
  "glossary.json": "glossário de siglas e marcação no texto",
};

/**
 * Extensões que CORRIGEM uma leitura em vez de habilitar uma seção. A ausência delas é o
 * caso normal, então não entram na lista de ausentes de «Limitações desta geração» — lá a
 * frase é «as seções que dependeriam deles não foram renderizadas», e nenhuma seção depende
 * de um mapa manual. Quando presentes, aparecem na tabela de artefatos como as outras.
 */
export const OVERRIDE_ARTIFACTS = {
  "bug-module-map.json": "atribuição manual de módulo aos bugs (vence as outras pistas)",
};

/**
 * Extensões que nascem de um passo OPCIONAL do fluxo da skill. A ausência delas é o caso
 * normal de quem não fez o passo, e não pode virar linha «ausente» nem entrada em
 * «Limitações desta geração» em todo projeto: a própria seção já diz por que saiu reduzida.
 * Presentes e inválidas ou velhas, avisam como as outras (EXTRA_ARTIFACT_INVALID,
 * TEST_GAPS_STALE).
 */
export const OPTIONAL_STEP_ARTIFACTS = new Set(["test-gaps.json"]);

/**
 * Códigos de aviso que nascem dos artefatos de extensão. O `--render-only` relê esses
 * artefatos do disco, então troca estes avisos pelos da nova leitura — e só estes: os
 * avisos dos coletores caros (testes, tracker, código) continuam os da coleta.
 */
export const EXTRA_WARNING_CODES = new Set([
  "EXTRA_ARTIFACT_INVALID", "REPORT_CONTENT_INVALID", "REPORT_CONTENT_ABSENT",
  "TEST_GAPS_UNKNOWN_ID", "TEST_GAPS_STALE", "TEST_GAPS_DUPLICATE_ID", "TEST_GAPS_NOT_MEASURED",
  "BUG_MODULE_MAP_UNKNOWN_ID", "BUG_SEVERITY_ABSENT",
]);

export function collectExtras({ root, outputsDir, writeDir }) {
  const warnings = [];
  const found = [];
  const missing = [];

  const load = (name, { override = false } = {}) => {
    const quiet = override || OPTIONAL_STEP_ARTIFACTS.has(name);
    const p = findArtifact(outputsDir, name) || firstExisting([
      join(outputsDir, name),
      join(writeDir || outputsDir, name),
      join(writeDir || outputsDir, "status", name),
    ]);
    if (!p) { if (!quiet) missing.push(name); return { path: null, data: null, mtime: null }; }
    const data = readJson(p);
    if (data === null || data === undefined) {
      warnings.push({ code: "EXTRA_ARTIFACT_INVALID", message: `${relPosix(root, p)} existe mas não é JSON válido — a seção que depende dele não será renderizada.` });
      if (!quiet) missing.push(name);
      return { path: null, data: null, mtime: null };
    }
    found.push({ name, rel: relPosix(root, p), enables: EXTRA_ARTIFACTS[name] || OVERRIDE_ARTIFACTS[name] || null });
    return { path: relPosix(root, p), data, mtime: mtimeOf(p) };
  };

  const ops = load("business-operations.json");
  const flows = load("business-flows.json");
  const api = load("api-catalog.json");
  const findings = load("test-findings.json");
  const gaps = load("test-gaps.json");
  const anexos = load("anexos-index.json");
  const gloss = load("glossary.json");
  const bugMap = load("bug-module-map.json", { override: true });

  return {
    operations: normalizeOperations(ops),
    flows: normalizeFlows(flows),
    apiCatalog: normalizeApiCatalog(api),
    testFindings: normalizeTestFindings(findings),
    testGaps: normalizeTestGaps(gaps),
    annexes: normalizeAnnexes(anexos),
    glossary: gloss.data ? { path: gloss.path, terms: normalizeGlossary(gloss.data) } : null,
    bugModuleMap: normalizeBugModuleMap(bugMap),
    content: loadContent({ root, outputsDir, writeDir, warnings }),
    inventory: { found, missing },
    warnings,
  };
}

function mtimeOf(p) {
  try { return statSync(p).mtime.toISOString(); } catch { return null; }
}

function firstExisting(paths) {
  for (const p of paths) if (p && fileExists(p)) return p;
  return null;
}

/* ═════════════════════════ operações de negócio (EAP) ═════════════════════════
   O escopo contratual visto pelo cliente: cada operação tem código, frente, o que faz,
   onde acontece, banda de complexidade, as regras que a governam e o estado da
   evidência de código e de teste. É o eixo do domínio Negócio quando existe.

   Campos ausentes derrubam apenas a COLUNA correspondente, não a operação: um projeto
   que não declara banda de complexidade continua com a matriz de aceite, sem a coluna
   "Compl.". Quem decide isso é `features`, calculado aqui e lido pelo renderer. */

function normalizeOperations({ path, data }) {
  if (!data) return null;
  const raw = asArray(data.operations || data.operacoes || data.items || (Array.isArray(data) ? data : []));
  const items = raw.map((o, i) => {
    const code = str(o.code || o.codigo || o.id || `OP-${i + 1}`);
    return {
      code,
      title: str(o.title || o.titulo || o.name || o.descricao || o.description || code),
      front: str(o.front || o.frente || o.group || o.grupo || o.epic) || null,
      purpose: str(o.purpose || o.oQueFaz || o.what || o.summary) || null,
      band: str(o.band || o.banda || o.complexity || o.complexidade) || null,
      where: asArray(o.where || o.onde || o.touchpoints).map(str).filter(Boolean),
      codeState: evidenceState(o.codeState ?? o.code_state ?? o.evidenciaCodigo ?? o.codigo),
      testState: evidenceState(o.testState ?? o.test_state ?? o.evidenciaTeste ?? o.teste),
      e2e: bool(o.e2e ?? o.endToEnd ?? o.pontaAPonta),
      note: str(o.note || o.observacao || o.observation || o.why) || null,
      rules: asArray(o.rules || o.regras || o.businessRules).map((r, j) => ({
        id: str(r.id || r.code || `${code}-R${j + 1}`),
        text: str(r.text || r.statement || r.regra || r.description || r),
        origin: str(r.origin || r.origem || r.source) || null,
        repo: str(r.repo || r.repositorio) || null,
        file: str(r.file || r.path || r.arquivo) || null,
        line: num(r.line ?? r.linha),
      })).filter((r) => r.text),
      files: asArray(o.files || o.arquivos || o.codeRefs).map((f) => ({
        repo: str(f.repo || f.repositorio) || null,
        path: str(f.path || f.file || f.arquivo || f),
        line: num(f.line ?? f.linha),
        note: str(f.note || f.nota) || null,
      })).filter((f) => f.path),
      tests: asArray(o.tests || o.testes || o.testCases).map((t) => ({
        name: str(t.name || t.nome || t.title || t),
        status: normTestStatus(t.status || t.situacao),
        suite: str(t.suite || t.suíte || t.file) || null,
      })).filter((t) => t.name),
      docs: num(o.docs ?? o.documentos ?? (Array.isArray(o.documents) ? o.documents.length : null)),
      workItems: asArray(o.workItems || o.itens).map((w) => str(w.id || w)).filter(Boolean),
    };
  }).filter((o) => o.code);

  if (!items.length) return null;

  // Presença por campo: o renderer usa isto para decidir COLUNA a COLUNA, em vez de
  // renderizar cabeçalho de uma coluna que estaria inteira vazia.
  const has = (f) => items.some(f);
  const features = {
    front: has((o) => o.front),
    band: has((o) => o.band),
    where: has((o) => o.where.length),
    rules: has((o) => o.rules.length),
    files: has((o) => o.files.length),
    tests: has((o) => o.tests.length),
    docs: has((o) => o.docs !== null),
    codeState: has((o) => o.codeState),
    testState: has((o) => o.testState),
    e2e: has((o) => o.e2e !== null),
    note: has((o) => o.note),
  };

  const fronts = groupFronts(items, features);
  const totals = {
    total: items.length,
    codeConfirmed: items.filter((o) => o.codeState === "confirmado").length,
    codePartial: items.filter((o) => o.codeState === "parcial").length,
    codeAbsent: items.filter((o) => o.codeState === "ausente").length,
    testConfirmed: items.filter((o) => o.testState === "confirmado").length,
    testPartial: items.filter((o) => o.testState === "parcial").length,
    testAbsent: items.filter((o) => o.testState === "ausente").length,
    bothAbsent: items.filter((o) => o.codeState === "ausente" && o.testState === "ausente").length,
    e2e: items.filter((o) => o.e2e === true).length,
    rules: items.reduce((a, o) => a + o.rules.length, 0),
    highBand: items.filter((o) => /alta|high/i.test(o.band || "")).length,
    docs: items.reduce((a, o) => a + (o.docs || 0), 0),
  };
  totals.anyEvidence = items.filter((o) => o.codeState !== "ausente" || o.testState !== "ausente").length;

  return { path, items, fronts, totals, features, label: str(data.label || data.rotulo) || "operações" };
}

/** Estado de evidência com vocabulário tolerante — cada versão do kit escreveu de um jeito. */
function evidenceState(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v === true) return "confirmado";
  if (v === false) return "ausente";
  const s = String(v.state || v.estado || v).toLowerCase();
  if (/confirm|ok|presente|sim|full|complet/.test(s)) return "confirmado";
  if (/parcial|partial|incompleto/.test(s)) return "parcial";
  if (/ausente|absent|sem|missing|nao|não|none/.test(s)) return "ausente";
  return null;
}

function groupFronts(items, features) {
  if (!features.front) return [];
  const map = new Map();
  for (const o of items) {
    const k = o.front || "Sem frente declarada";
    if (!map.has(k)) map.set(k, { name: k, items: [], confirmed: 0, partial: 0, absent: 0, e2e: 0, rules: 0, high: 0, docs: 0 });
    const g = map.get(k);
    g.items.push(o);
    if (o.codeState === "confirmado") g.confirmed++;
    else if (o.codeState === "parcial") g.partial++;
    else if (o.codeState === "ausente") g.absent++;
    if (o.e2e === true) g.e2e++;
    g.rules += o.rules.length;
    if (/alta|high/i.test(o.band || "")) g.high++;
    g.docs += o.docs || 0;
  }
  return [...map.values()].map((g) => ({ ...g, total: g.items.length }));
}

/* ═════════════════════════ fluxos de processo ═════════════════════════ */

function normalizeFlows({ path, data }) {
  if (!data) return null;
  const raw = asArray(data.flows || data.fluxos || (Array.isArray(data) ? data : []));
  const items = raw.map((f, i) => ({
    id: str(f.id || f.code || `FLX-${i + 1}`),
    name: str(f.name || f.nome || f.title || f.id || `Fluxo ${i + 1}`),
    objective: str(f.objective || f.objetivo || f.purpose) || null,
    actor: str(f.actor || f.ator) || null,
    type: str(f.type || f.tipo) || null,
    trigger: str(f.trigger || f.gatilho) || null,
    outcome: str(f.outcome || f.resultado) || null,
    steps: asArray(f.steps || f.etapas).map((s, j) => ({
      order: num(s.order ?? s.ordem) ?? j + 1,
      actor: str(s.actor || s.ator) || null,
      action: str(s.action || s.acao || s.descricao || s.text || s),
      system: str(s.system || s.sistema) || null,
      rules: asArray(s.rules || s.regras).map(str).filter(Boolean),
    })).filter((s) => s.action),
    screens: asArray(f.screens || f.telas).map((s) => ({
      id: str(s.id || s.code || s),
      name: str(s.name || s.nome || s.title) || null,
    })).filter((s) => s.id),
    subflows: asArray(f.subflows || f.subfluxos).map((s, j) => ({
      id: str(s.id || `${f.id || i}-${j + 1}`),
      name: str(s.name || s.nome || s.title || `Subfluxo ${j + 1}`),
      steps: asArray(s.steps || s.etapas).map((x) => str(x.action || x.acao || x)).filter(Boolean),
    })),
  })).filter((f) => f.name);
  return items.length ? { path, items } : null;
}

/* ═════════════════════════ catálogo de API ═════════════════════════
   Diferente do api-contracts.yaml: o catálogo é a superfície OBSERVADA e agrupada por
   serviço, com a ficha de requisição × resposta que o integrador lê. Quando não existe,
   o renderer volta à leitura de superfície do OpenAPI (método, rota, resumo) — menos
   rica, mas verdadeira. */

function normalizeApiCatalog({ path, data }) {
  if (!data) return null;
  const services = asArray(data.services || data.servicos || data.groups
    || (Array.isArray(data) ? data : (data.endpoints ? [{ name: str(data.name) || "API", endpoints: data.endpoints }] : [])));

  const norm = services.map((sv, i) => ({
    id: str(sv.id || sv.key || sv.name || `svc-${i + 1}`),
    name: str(sv.name || sv.nome || sv.title || `Serviço ${i + 1}`),
    base: str(sv.base || sv.baseUrl || sv.prefix) || null,
    purpose: str(sv.purpose || sv.proposito || sv.description) || null,
    endpoints: asArray(sv.endpoints || sv.rotas).map((e) => normalizeEndpoint(e)).filter(Boolean),
  })).filter((s) => s.endpoints.length);

  if (!norm.length) return null;
  const all = norm.flatMap((s) => s.endpoints);
  return {
    path,
    services: norm,
    total: all.length,
    tested: all.filter((e) => e.tested === true).length,
    conventions: asArray(data.conventions || data.convencoes).map((c) => ({
      label: str(c.label || c.titulo || c.name),
      value: str(c.value || c.valor || c.text || c.description),
    })).filter((c) => c.label && c.value),
    observedPaths: num(data.observedPaths ?? data.caminhosObservados),
  };
}

function normalizeEndpoint(e) {
  const path = str(e.path || e.rota || e.url);
  if (!path) return null;
  return {
    method: str(e.method || e.metodo || "GET").toUpperCase(),
    path,
    operationId: str(e.operationId || e.operacao) || null,
    summary: str(e.summary || e.resumo || e.description) || null,
    auth: str(e.auth || e.autenticacao) || null,
    source: str(e.source || e.origem) || null,
    tested: bool(e.tested ?? e.testado),
    idempotency: str(e.idempotency || e.idempotencia) || null,
    request: e.request || e.requisicao ? normalizeSide(e.request || e.requisicao) : null,
    response: e.response || e.resposta ? normalizeSide(e.response || e.resposta) : null,
    statuses: asArray(e.statuses || e.status || e.responses).map((s) => ({
      code: str(s.code || s.status || s),
      meaning: str(s.meaning || s.significado || s.description) || null,
    })).filter((s) => s.code),
  };
}

function normalizeSide(side) {
  if (!side || typeof side !== "object") return null;
  return {
    contentType: str(side.contentType || side.tipo) || null,
    line: str(side.line || side.exemplo || side.example) || null,
    fields: asArray(side.fields || side.campos).map((f) => ({
      name: str(f.name || f.nome || f),
      type: str(f.type || f.tipo) || null,
      required: bool(f.required ?? f.obrigatorio),
      note: str(f.note || f.nota || f.description) || null,
    })).filter((f) => f.name),
    notes: asArray(side.notes || side.notas).map(str).filter(Boolean),
  };
}

/* ═════════════════════════ causas-raiz das falhas ═════════════════════════
   A pergunta que o cliente faz diante de "40 falhando" é «de quem depende resolver».
   Sem esta classificação o relatório mostra o número e deixa a pergunta no ar; com ela,
   mostra que 34 são ambiente e nenhuma é defeito de produto — ou o contrário, se for o
   caso. O artefato não inventa nada: é escrito por quem triou as falhas. */

function normalizeTestFindings({ path, data }) {
  if (!data) return null;
  const causes = asArray(data.causes || data.causas || (Array.isArray(data) ? data : [])).map((c, i) => ({
    id: str(c.id || c.key || `CAUSA-${i + 1}`),
    label: str(c.label || c.nome || c.name || c.natureza),
    sub: str(c.sub || c.subtitulo || c.short) || null,
    count: num(c.count ?? c.casos ?? c.total) ?? 0,
    severity: str(c.severity || c.severidade || c.kind) || null,
    dependsOn: str(c.dependsOn || c.dependeDe || c.owner || c.resolution) || null,
    cases: asArray(c.cases || c.casos).map(str).filter(Boolean),
    // Classificação explícita, quando quem triou a declarou. É o que o cruzamento com os
    // bugs usa antes do rótulo — ver `isProductDefect`.
    category: str(c.category || c.categoria || c.tipo) || null,
    modules: uniqStr(asArray(c.modules || c.modulos || (c.module || c.modulo ? [c.module || c.modulo] : [])).map(str)),
  })).filter((c) => c.label);

  if (!causes.length) return null;
  return {
    path,
    causes,
    total: causes.reduce((a, c) => a + c.count, 0),
    productDefects: causes.filter((c) => /defeito|bug|produto/i.test(c.label)).reduce((a, c) => a + c.count, 0),
  };
}

/**
 * A causa foi CLASSIFICADA como defeito de produto por quem triou?
 *
 * Mais estrito que o realce de cor do Sumário (que pinta de vermelho qualquer rótulo com
 * «defeito»): aqui o número vai para uma coluna ao lado da contagem de bugs, e «Provável
 * defeito — a investigar» ainda não é defeito. Vale a categoria declarada; sem ela, o
 * rótulo precisa dizer «defeito de produto» com todas as letras.
 */
export function isProductDefect(cause) {
  if (!cause) return false;
  if (cause.category) return /defeito[\s_-]*(de[\s_-]*)?produto|product[\s_-]*defect/i.test(cause.category);
  return /defeito de produto|bug de produto|product defect/i.test(cause.label || "");
}

/* ═════════════════════════ o que falta testar (camada curada) ═════════════════════════
   `test-gaps.json` é escrito pelo AGENTE, depois da coleta: para cada item de negócio sem
   teste, o que a regra diz, onde ela está no código, se já existe teste que a exercita sem
   citar o código e quais testes criar. O CLI só lê e renderiza — nunca escreve este arquivo.

   A junção com a matriz de rastreabilidade (id desconhecido, análise desatualizada) não é
   feita aqui: depende da matriz, que é montada depois. Ver `lib/lacunas-teste.mjs`. */

// Só sinônimos sem ambiguidade. «e2e» sozinho não diz se é de API ou de tela: fica com o
// rótulo cru que veio no arquivo, em vez de ganhar uma camada que ninguém declarou.
const LAYERS = {
  unitario: ["unitario", "unitário", "unit"],
  integracao: ["integracao", "integração", "integration"],
  contrato: ["contrato", "contract"],
  "e2e-api": ["e2e-api", "e2e api"],
  "e2e-tela": ["e2e-tela", "e2e tela", "e2e-ui"],
};
const IMPL_STATES = {
  implemented: ["implemented", "implementado", "implementada", "ok", "presente"],
  partial: ["partial", "parcial", "incompleto"],
  absent: ["absent", "ausente", "nao-implementado", "não implementado", "missing"],
  "backlog-only": ["backlog-only", "backlog", "so-no-backlog", "só no backlog", "planejado", "planned"],
};
const PRIORITIES = {
  alta: ["alta", "high"],
  media: ["media", "média", "medium"],
  baixa: ["baixa", "low"],
};

function pickVocab(raw, table) {
  const s = str(raw).toLowerCase().replace(/_/g, "-").trim();
  if (!s) return null;
  for (const [key, aliases] of Object.entries(table)) if (aliases.includes(s)) return key;
  return null;
}

function normalizeTestGaps({ path, data, mtime }) {
  if (!data || typeof data !== "object") return null;
  const items = asArray(data.items || data.itens || (Array.isArray(data) ? data : [])).map((it) => {
    const impl = it.implementation || it.implementacao || {};
    const ex = it.existingTest || it.testeExistente || null;
    return {
      id: str(it.id || it.codigo || it.code).toUpperCase(),
      rule: str(it.rule || it.regra || it.oQueDiz || it.statement) || null,
      area: str(it.area || it.área) || null,
      implementation: {
        state: pickVocab(impl.state || impl.estado || impl.situacao, IMPL_STATES),
        rawState: str(impl.state || impl.estado || impl.situacao) || null,
        where: asArray(impl.where || impl.onde).map((w) => (typeof w === "string"
          ? { file: str(w), role: null }
          : { file: str(w.file || w.arquivo || w.path), role: str(w.role || w.papel) || null, line: num(w.line ?? w.linha) }
        )).filter((w) => w.file),
      },
      existingTest: ex && typeof ex === "object" && (ex.file || ex.arquivo || ex.test || ex.teste) ? {
        file: str(ex.file || ex.arquivo) || null,
        test: str(ex.test || ex.teste || ex.name || ex.nome) || null,
        action: /mark|marcar/i.test(str(ex.action || ex.acao)) ? "mark-id" : "none",
      } : null,
      testsToCreate: asArray(it.testsToCreate || it.testesACriar || it.tests).map((t) => ({
        layer: pickVocab(t.layer || t.camada, LAYERS),
        rawLayer: str(t.layer || t.camada) || null,
        repo: str(t.repo || t.repositorio) || null,
        file: str(t.file || t.arquivo) || null,
        scenarios: asArray(t.scenarios || t.cenarios || t.situacoes).map(str).filter(Boolean),
      })).filter((t) => t.layer || t.rawLayer || t.file || t.scenarios.length),
      priority: pickVocab(it.priority || it.prioridade, PRIORITIES),
      priorityReason: str(it.priorityReason || it.motivoPrioridade || it.motivo) || null,
      poQuestions: asArray(it.poQuestions || it.perguntasPO || it.pontosAConfirmar).map((q) => str(typeof q === "object" && q ? q.text || q.texto : q)).filter(Boolean),
      doneWithoutCode: asArray(it.doneWithoutCode || it.feitoSemCodigo).map(str).filter(Boolean),
    };
  }).filter((it) => it.id);

  return {
    path,
    fileMtime: mtime || null,
    generatedAt: str(data.generatedAt || data.geradoEm || data.data) || null,
    basis: str(data.basis || data.base) || null,
    // Total da matriz contra o qual a análise foi feita. É o que permite dizer «esta
    // análise é de outra coleta» quando itens entraram ou saíram da especificação.
    traceTotal: num(data.traceTotal ?? data.matrixTotal ?? data.totalItens ?? data.traceMatrixTotal),
    // Agrupamento de módulos em áreas, quando a análise o declarou (os lotes do agente).
    areas: asArray(data.areas || data.areasModulos).map((a) => ({
      name: str(a.name || a.nome),
      modules: asArray(a.modules || a.modulos).map(str).filter(Boolean),
    })).filter((a) => a.name && a.modules.length),
    items,
    poQuestions: asArray(data.poQuestions || data.perguntasPO || data.pontosAConfirmar).map((q) => (typeof q === "string"
      ? { area: null, text: str(q) }
      : { area: str(q.area || q.área) || null, text: str(q.text || q.texto || q.pergunta) }
    )).filter((q) => q.text),
    contradictingTests: asArray(data.contradictingTests || data.testesContraditorios).map((c) => ({
      test: str(c.test || c.teste),
      rule: str(c.rule || c.regra) || null,
      text: str(c.text || c.texto) || null,
    })).filter((c) => c.test || c.text),
  };
}

/* ═════════════════════════ mapa manual de módulo dos bugs ═════════════════════════
   `{ "1001": "MOD-ESTOQUE" }` ou `{ "1002": ["MOD-PEDIDOS", "MOD-CADASTRO"] }`. É a primeira regra
   da atribuição: decisão humana registrada vence qualquer pista do tracker. */

function normalizeBugModuleMap({ path, data }) {
  if (!data || typeof data !== "object") return null;
  const src = data.map || data.bugs || data;
  const map = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith("_")) continue;
    const mods = uniqStr(asArray(Array.isArray(v) ? v : [v]).map(str));
    if (mods.length) map[String(k).replace(/^#/, "").trim()] = mods;
  }
  return Object.keys(map).length ? { path, map } : null;
}

function uniqStr(list) {
  return [...new Set((list || []).filter(Boolean))];
}

/* ═════════════════════════ índice de anexos ═════════════════════════ */

function normalizeAnnexes({ path, data }) {
  if (!data) return null;
  const docs = asArray(data.documents || data.documentos || data.items || (Array.isArray(data) ? data : [])).map((d) => ({
    title: str(d.title || d.titulo || d.name || d.path),
    path: str(d.path || d.caminho || d.href),
    group: str(d.group || d.grupo || d.category) || "Sem grupo",
    kb: num(d.kb ?? d.sizeKb ?? (d.bytes ? Math.round(d.bytes / 1024) : null)),
    note: str(d.note || d.nota || d.description) || null,
  })).filter((d) => d.title && d.path);

  if (!docs.length) return null;
  const groups = new Map();
  for (const d of docs) {
    if (!groups.has(d.group)) groups.set(d.group, { name: d.group, count: 0, kb: 0, note: null });
    const g = groups.get(d.group);
    g.count++;
    g.kb += d.kb || 0;
  }
  for (const g of asArray(data.groups || data.grupos)) {
    const t = groups.get(str(g.name || g.nome));
    if (t) t.note = str(g.note || g.descricao || g.purpose) || null;
  }
  return {
    path,
    docs,
    groups: [...groups.values()].sort((a, b) => b.count - a.count),
    total: docs.length,
    totalKb: docs.reduce((a, d) => a + (d.kb || 0), 0),
    baseDir: str(data.baseDir || data.base) || null,
  };
}

/* ═════════════════════════ camada editorial ═════════════════════════
   `status-report-content.json` é onde entra o que NENHUM coletor pode produzir: a
   leitura do consultor, o veredito por dimensão, a pauta de decisões do cliente, os
   marcos da linha do tempo, o texto de cada `.asks`. É conteúdo redigido por gente.

   Sem ele o relatório continua saindo — com o veredito derivado do semáforo calculado,
   sem os blocos de pergunta e com o panorama automático no lugar da leitura do
   consultor. É a diferença entre um relatório de status semanal e uma entrega de
   fechamento de escopo, e o SKILL.md cobra o arquivo em `--mode conclusao`.

   O `executive-summary.md` da v1 continua sendo lido (em build-status-data) e alimenta
   a leitura do consultor quando o JSON não traz `consultant`. */

/**
 * Conteúdo editorial vazio, com a MESMA FORMA do carregado.
 *
 * Esta função existe por um defeito concreto: o objeto de "sem conteúdo" tinha menos
 * campos que o de "com conteúdo", e o renderer — que lê `content.decisions.length`
 * sem guarda — estourava exatamente nos projetos sem camada editorial, que são a
 * maioria. Forma única elimina a classe inteira de erro em vez de espalhar `|| []`
 * por cinquenta pontos de chamada.
 */
function emptyContent(path = null) {
  return {
    present: false, path,
    cover: null, docVersion: null, confidentialLabel: null,
    revisions: [], signatures: [], layers: [], verdict: null, dimensions: [],
    milestones: [], decisions: [], consultant: null, goals: [], architecture: null,
    repo: null, asks: {}, callouts: {}, notes: {}, sections: {}, labels: {},
  };
}

function loadContent({ root, outputsDir, writeDir, warnings }) {
  const dirs = [writeDir || outputsDir, outputsDir].filter(Boolean);
  const names = ["status-report-content.json", "report-content.json"];
  const candidates = [];
  for (const d of dirs) for (const n of names) { candidates.push(join(d, "status", n)); candidates.push(join(d, n)); }

  const p = firstExisting(candidates);
  if (!p) return emptyContent();

  const data = readJson(p);
  if (!data || typeof data !== "object") {
    warnings.push({ code: "REPORT_CONTENT_INVALID", message: `${relPosix(root, p)} não é JSON válido — o relatório usa o veredito derivado e o panorama automático.` });
    return emptyContent(relPosix(root, p));
  }

  return {
    ...emptyContent(relPosix(root, p)),
    present: true,
    // Capa e identidade do documento
    cover: data.cover || data.capa || null,
    docVersion: str(data.version || data.versao) || null,
    confidentialLabel: str(data.confidentialLabel || data.sigilo) || null,
    revisions: asArray(data.revisions || data.revisoes).map((r) => ({
      version: str(r.version || r.versao),
      date: str(r.date || r.data),
      author: str(r.author || r.responsavel) || null,
      change: str(r.change || r.alteracao || r.note) || null,
    })).filter((r) => r.version),
    signatures: asArray(data.signatures || data.assinaturas).map((s) => ({
      who: str(s.who || s.nome || s.name),
      role: str(s.role || s.papel || s.cargo) || null,
    })).filter((s) => s.who),
    // Leitura
    layers: asArray(data.layers || data.camadas).map((l) => ({
      time: str(l.time || l.tempo) || null,
      title: str(l.title || l.titulo),
      body: str(l.body || l.texto || l.description) || null,
      links: asArray(l.links).map((x) => ({ href: str(x.href || x.url), label: str(x.label || x.texto || x.title) })).filter((x) => x.href && x.label),
    })).filter((l) => l.title),
    verdict: data.verdict || data.veredito || null,
    dimensions: asArray(data.dimensions || data.dimensoes).map((d) => ({
      name: str(d.name || d.nome),
      level: str(d.level || d.nivel || d.status),
      verdict: str(d.verdict || d.veredito || d.resumo),
      why: str(d.why || d.porque || d.detail) || null,
      owner: str(d.owner || d.responsavel || d.dependeDe) || null,
      ownerLabel: str(d.ownerLabel) || (d.dependeDe ? "Depende de" : null),
      evidence: str(d.evidence || d.evidencia) || null,
      evidenceHref: str(d.evidenceHref || d.href) || null,
    })).filter((d) => d.name && d.verdict),
    milestones: asArray(data.milestones || data.marcos).map((m) => ({
      date: str(m.date || m.data),
      label: str(m.label || m.marco || m.title),
      meaning: str(m.meaning || m.significado || m.description) || null,
      level: str(m.level || m.nivel) || "info",
    })).filter((m) => m.date && m.label),
    decisions: asArray(data.decisions || data.pauta || data.agenda).map((d) => ({
      title: str(d.title || d.titulo || d.providencia),
      unlocks: str(d.unlocks || d.destrava || d.detail) || null,
      owner: str(d.owner || d.dependeDe || d.responsavel) || null,
      options: asArray(d.options || d.opcoes).map((o) => ({
        label: str(o.label || o.opcao || o),
        recommended: bool(o.recommended ?? o.recomendada),
      })).filter((o) => o.label),
      recommendation: str(d.recommendation || d.recomendacao) || null,
      level: str(d.level || d.nivel) || null,
    })).filter((d) => d.title),
    consultant: data.consultant || data.consultor || null,
    // Diagrama de arquitetura: nós e arestas POSICIONADOS. Layout automático de oito
    // caixas produz cruzamentos que atrapalham mais que a ausência do desenho, então o
    // gerador desenha o que foi declarado — ou nada.
    architecture: normalizeArchitecture(data.architecture || data.arquitetura),
    goals: asArray(data.goals || data.metas).map((g) => ({
      key: str(g.key || g.indicador || g.kpi),
      target: str(g.target || g.meta),
      source: str(g.source || g.origem) || null,
    })).filter((g) => g.key && g.target),
    repo: data.repo || data.repositorio || null,
    // Texto por seção: `asks` e `callouts` chaveados pelo id da âncora.
    asks: normalizeAsks(data.asks || data.perguntas),
    callouts: normalizeCallouts(data.callouts || data.avisos),
    notes: plainMap(data.notes || data.notas),
    sections: plainMap(data.sections || data.secoes),
    labels: plainMap(data.labels || data.rotulos),
  };
}

function normalizeArchitecture(raw) {
  if (!raw || typeof raw !== "object") return null;
  const nodes = asArray(raw.nodes || raw.componentes).map((n) => ({
    id: str(n.id || n.key || n.label),
    label: str(n.label || n.nome || n.name || n.id),
    sub: str(n.sub || n.subtitulo || n.detail) || null,
    x: num(n.x), y: num(n.y),
    color: str(n.color || n.cor) || null,
    fill: str(n.fill) || null,
  })).filter((n) => n.id && Number.isFinite(n.x) && Number.isFinite(n.y));
  if (nodes.length < 2) return null;
  return {
    title: str(raw.title || raw.titulo) || null,
    sub: str(raw.sub || raw.subtitulo) || null,
    width: num(raw.width) || 940,
    height: num(raw.height) || 392,
    nodeWidth: num(raw.nodeWidth) || 158,
    nodeHeight: num(raw.nodeHeight) || 56,
    nodes,
    edges: asArray(raw.edges || raw.ligacoes).map((e) => ({
      from: str(e.from || e.de), to: str(e.to || e.para),
      kind: str(e.kind || e.tipo) || "sync",
      label: str(e.label || e.rotulo) || null,
      color: str(e.color) || null,
    })).filter((e) => e.from && e.to),
    legend: asArray(raw.legend || raw.legenda).map((l) => ({
      label: str(l.label || l.texto), color: str(l.color || l.cor) || "#1f4e79",
    })).filter((l) => l.label),
  };
}

function normalizeAsks(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!v) continue;
    if (typeof v === "string") { out[k] = { question: null, answer: v }; continue; }
    const q = str(v.q || v.question || v.pergunta);
    const a = str(v.a || v.answer || v.resposta);
    if (a) out[k] = { question: q || null, answer: a };
  }
  return out;
}

function normalizeCallouts(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    const list = asArray(v).map((c) => (typeof c === "string"
      ? { title: null, body: c, kind: "read" }
      : { title: str(c.title || c.titulo) || null, body: str(c.body || c.texto || c.text), kind: str(c.kind || c.tipo) || "read" }
    )).filter((c) => c.body);
    if (list.length) out[k] = list;
  }
  return out;
}

function plainMap(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v.trim()) out[k] = v.trim();
  return out;
}

/* ═════════════════════════ utilitários locais ═════════════════════════ */

function str(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (["true", "sim", "yes", "1", "confirmado"].includes(s)) return true;
  if (["false", "nao", "não", "no", "0", "ausente"].includes(s)) return false;
  return null;
}

function normTestStatus(v) {
  const s = String(v || "").toLowerCase();
  if (/pass|aprov|ok|verde/.test(s)) return "passed";
  if (/fail|falh|erro|red/.test(s)) return "failed";
  if (/skip|ignor|pend/.test(s)) return "skipped";
  return "passed";
}
