import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHtml, deriveHeader, PLACEHOLDERS } from "../lib/build-html.mjs";
import { loadReportData, PANES } from "../lib/load-data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "..");
const TEMPLATE = readFileSync(join(SKILL, "templates", "report-shell.html"), "utf8");
const EXAMPLE = join(SKILL, "templates", "report-data.example.json");
// HTML não truncado: o shell inteiro (menos os marcadores) mais o payload inteiro. Independe do
// tamanho do exemplo — o antigo `> 500000` só valia para o payload de 1,4 MB.
const tamanhoMinimo = (data) => TEMPLATE.length - PLACEHOLDERS.join("").length + JSON.stringify(data).length;

test("template congelado tem todos os marcadores", () => {
  for (const p of PLACEHOLDERS) assert.ok(TEMPLATE.includes(p), `faltou ${p}`);
  assert.ok(TEMPLATE.includes('id="payload"'));
});

test("exemplo carrega, valida e tem as 7 abas", () => {
  const { data, warnings } = loadReportData(EXAMPLE);
  assert.ok(data.meta);
  for (const p of PANES) assert.ok(data[p], `aba ${p} ausente no exemplo`);
  assert.equal(warnings.length, 0, "exemplo não deveria gerar avisos: " + warnings.join("; "));
});

test("buildHtml injeta payload e não deixa marcador", () => {
  const { data } = loadReportData(EXAMPLE);
  const html = buildHtml(TEMPLATE, data);
  for (const p of PLACEHOLDERS) assert.ok(!html.includes(p), `marcador vazou: ${p}`);
  assert.ok(html.length >= tamanhoMinimo(data), "HTML menor que shell + payload: truncado");
  // o payload embutido volta a parsear (o navegador faz o mesmo) — e volta inteiro
  const m = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, "bloco de payload não encontrado");
  const round = JSON.parse(m[1]);
  assert.deepEqual(round, data);
  // título/marca injetados
  assert.ok(html.includes(`<title>${data.meta.tituloHtml}</title>`));
});

test("deriveHeader cai em fallback genérico sem meta.projeto", () => {
  const h = deriveHeader({});
  assert.equal(h.marcaSub, "Especificação");
  assert.ok(h.titulo.includes("Especificação"));
  // fallback nunca vaza nome de outro projeto — o do exemplo é lido do próprio exemplo
  const nomeDoExemplo = JSON.parse(readFileSync(EXAMPLE, "utf8")).meta.projeto.split(" ")[0];
  assert.ok(nomeDoExemplo.length > 2);
  assert.ok(!h.titulo.includes(nomeDoExemplo));
  assert.ok(!h.marca.includes(nomeDoExemplo));
});

test("payload malicioso com </script> é neutralizado", () => {
  const data = { meta: { projeto: "X" }, negocio: {}, tecnica: {}, testes: {}, seguranca: {}, gaps: {}, backlog: {}, estimativa: {}, hack: "</script><script>alert(1)</script>" };
  const html = buildHtml(TEMPLATE, data);
  // não pode existir um </script> proveniente do dado dentro do bloco de payload
  const m = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, "bloco de payload não encontrado");
  assert.ok(m[1].includes("\\u003c/script>"), "o </script> do dado deveria ter virado \\u003c/script>");
  assert.ok(JSON.parse(m[1]).hack.includes("</script>"), "o valor original volta intacto no parse");
});

test("aba ausente gera aviso, não erro", () => {
  const bad = join(HERE, "..", "templates", "report-data.example.json");
  const { data } = loadReportData(bad);
  delete data.estimativa;
  // revalida manualmente o contrato de avisos
  const missing = PANES.filter((p) => !data[p]);
  assert.deepEqual(missing, ["estimativa"]);
  const html = buildHtml(TEMPLATE, data); // ainda monta
  assert.ok(html.length >= tamanhoMinimo(data), "HTML menor que shell + payload: truncado");
});

test("exemplo é sintético, pequeno e coerente: totais batem com a árvore e as referências existem", () => {
  // O exemplo era o payload de um cliente real (1,4 MB). Ele é a fonte de verdade do formato: um
  // número que não bate ou um ID que não existe aqui vira modelo errado para a IA.
  assert.ok(statSync(EXAMPLE).size < 400000, "o exemplo voltou a ser grande — o SKILL manda consultá-lo por trecho");
  const { data } = loadReportData(EXAMPLE);
  const B = data.backlog, t = B.totais, mt = data.meta.totais;
  const features = B.epics.flatMap((e) => e.features), stories = features.flatMap((f) => f.stories), tasks = stories.flatMap((s) => s.tasks);
  assert.deepEqual([t.epics, t.features, t.stories, t.tasks], [B.epics.length, features.length, stories.length, tasks.length]);
  assert.deepEqual([mt.epics, mt.features, mt.stories, mt.tasks, mt.enablers], [t.epics, t.features, t.stories, t.tasks, t.enablers]);
  assert.equal(t.enablers, stories.filter((s) => s.tipo === "enabler").length);
  assert.equal(t.storiesUat, stories.filter((s) => s.tipo === "uat").length);
  assert.equal(t.tasksSeguranca, tasks.filter((x) => x.isSec).length);
  const r1 = (x) => Math.round(x * 10) / 10;
  assert.equal(t.esforcoDiasTasks, r1(tasks.reduce((n, x) => n + x.esforcoDias, 0)));
  for (const e of B.epics) assert.equal(e.esforcoDias, r1(e.features.reduce((n, f) => n + f.esforcoDias, 0)), `esforço de ${e.id}`);
  for (const s of stories) {
    assert.ok(s.regrasNegocio.every((r) => r && typeof r.id === "string" && r.texto), `${s.id}: regra fora da forma {id, texto}`);
  }
  // referências cruzadas entre abas
  const idsStory = new Set(stories.map((s) => s.id)), idsTask = new Set(tasks.map((x) => x.id)), idsEpic = new Set(B.epics.map((e) => e.id));
  for (const f of data.seguranca.findings.filter((x) => x.injetado)) {
    const s = stories.find((x) => x.id === f.storyAfetada);
    assert.ok(s && s.tasks.some((x) => x.id === f.id && x.isSec), `${f.id}: a história afetada não tem a task de segurança`);
  }
  for (const id of data.estimativa.caminhoCritico.sequencia) assert.ok(idsTask.has(id), `caminho crítico cita ${id}, que não existe`);
  for (const e of data.estimativa.porEpic) assert.equal(e.esforcoDias, B.epics.find((x) => x.id === e.epic).esforcoDias, `porEpic ${e.epic}`);
  for (const e of data.testes.porEpica) assert.ok(idsEpic.has(e.epica), `testes.porEpica cita ${e.epica}`);
  for (const g of data.estimativa.caminhoCritico.gargalos) assert.ok(idsStory.has(g.id) || idsTask.has(g.id), `gargalo ${g.id}`);
  const idsGap = new Set(data.gaps.itens.map((g) => g.id));
  for (const g of data.negocio.gaps.lista) assert.ok(idsGap.has(g.id), `negocio.gaps.lista cita ${g.id}`);
  assert.equal(data.negocio.gaps.lista.length, mt.gaps);
  assert.equal(data.seguranca.findings.length, mt.findingsSeguranca);
  assert.equal(data.tecnica.rules.length, mt.rules);
  assert.equal(data.tecnica.dataModel.entidades.length, mt.entidades);
});

/* ---------------------------------------------------------------------------
   tecnica.hld — seção «Arquitetura (HLD)» (opcional, vinda do hld.md / Fase 6.6)

   A engine roda no navegador, então aqui testamos o que dá para testar sem DOM:
   (1) o shell carrega o código da seção e do diagrama; (2) o payload atravessa a
   injeção intacto; (3) sem `tecnica.hld` nada da seção aparece no HTML final.
   O render em si foi conferido em navegador (ver HISTORY 1.2).
--------------------------------------------------------------------------- */

const HLD_FIXTURE = {
  modo: "completo",
  resumo: "Cinco peças que rodam separadas; tudo que vem de fora entra pela API.",
  containers: [
    { id: "CON-01", nome: "Portal do usuário", responsabilidade: "Entrega as telas", tecnologia: "Next.js" },
    { id: "CON-02", nome: "API de negócio", responsabilidade: "Regras e controle de acesso", tecnologia: "Java 21" },
    { id: "CON-03", nome: "Banco relacional", responsabilidade: "Guarda os dados", tecnologia: "PostgreSQL 16" },
  ],
  decomposicao: [
    { modulo: "MOD-CADASTRO", container: "CON-02", papel: "Regras de cadastro" },
    { modulo: "MOD-COMISSAO", container: "N/A", papel: "Fora desta entrega — segue em planilha na onda 1" },
  ],
  integracoes: [
    { id: "INT-01", sistema: "Receita Federal", containers: ["CON-02"], direcao: "saída", estilo: "síncrono", protocolo: "REST/JSON", falha: "Tenta mais 2 vezes" },
    { id: "INT-02", sistema: "ERP do cliente", containers: ["CON-02"], direcao: "entrada", estilo: "assíncrono", protocolo: "Arquivo diário", falha: "Alerta é aberto" },
  ],
  taticas: [
    { rnf: "RNF-DESEMPENHO-001", metrica: "2 s no percentil 95", tatica: "Cache de leitura", containers: ["CON-02"], justificativa: "Consulta de maior volume", riscoAceito: false },
    { rnf: "RNF-DISPONIBILIDADE-001", metrica: "99,5%", tatica: "Risco aceito — instância única na onda 1", containers: ["CON-02"], justificativa: "Não se paga no volume da onda 1", riscoAceito: true },
  ],
  adrs: [
    { id: "ADR-01", decisao: "Monólito modular", contexto: "Time de 4 pessoas", alternativas: "Microsserviços", consequencias: "Deploy único", origem: ["architecture.mdc"] },
  ],
};

function minimalData(extraTecnica) {
  return {
    meta: { projeto: "Projeto Teste", totais: {} },
    negocio: {}, tecnica: Object.assign({}, extraTecnica), testes: {},
    seguranca: {}, gaps: {}, backlog: {}, estimativa: {},
  };
}

test("shell traz o código da seção Arquitetura (HLD) e do diagrama SVG", () => {
  assert.ok(TEMPLATE.includes("function hldSection("), "hldSection ausente do shell");
  assert.ok(TEMPLATE.includes("function hldDiagram("), "hldDiagram ausente do shell");
  assert.ok(TEMPLATE.includes("${hldSection(T.hld)}"), "a aba Técnica não chama hldSection");
  assert.ok(TEMPLATE.includes('id="chart-hld"'), "host do diagrama ausente");
  // o diagrama é desenhado no cliente: nada de CDN nem de Mermaid entrou no shell
  assert.ok(!/https?:\/\/[^"']*(cdn|unpkg|jsdelivr|mermaid)/i.test(TEMPLATE), "o shell não pode carregar recurso externo");
});

test("com tecnica.hld: o bloco atravessa a injeção intacto", () => {
  const data = minimalData({ hld: HLD_FIXTURE });
  const html = buildHtml(TEMPLATE, data);
  const m = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, "bloco de payload não encontrado");
  const round = JSON.parse(m[1]).tecnica.hld;
  assert.equal(round.containers.length, 3);
  assert.equal(round.integracoes[1].estilo, "assíncrono");
  assert.equal(round.decomposicao[1].container, "N/A");
  assert.equal(round.taticas[1].riscoAceito, true);
  assert.equal(round.adrs[0].origem[0], "architecture.mdc");
});

test("sem tecnica.hld: nenhum título nem host órfão no HTML final", () => {
  const html = buildHtml(TEMPLATE, minimalData({ stack: [] }));
  const m = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
  assert.equal(JSON.parse(m[1]).tecnica.hld, undefined, "payload não deveria trazer tecnica.hld");
  // a engine só monta a seção quando há containers — guard explícito no shell
  assert.ok(TEMPLATE.includes("if(!H||!(H.containers&&H.containers.length)) return '';"),
    "hldSection precisa degradar para string vazia sem containers");
  assert.ok(TEMPLATE.includes("if($('#chart-hld')){"),
    "o mount do diagrama precisa ser condicional ao host existir");
});

test("exemplo continua válido sem tecnica.hld (projeto anterior à Fase 6.6)", () => {
  // Desde 1.3 o exemplo é sintético e cobre tecnica.hld; o projeto sem hld.md é simulado tirando o bloco.
  const { data, warnings } = loadReportData(EXAMPLE);
  assert.equal(warnings.length, 0);
  assert.ok(data.tecnica.hld && data.tecnica.hld.containers.length > 0, "o exemplo cobre tecnica.hld");
  delete data.tecnica.hld;
  const html = buildHtml(TEMPLATE, data);
  assert.ok(html.length >= tamanhoMinimo(data), "HTML menor que shell + payload: truncado");
  const m = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
  assert.equal(JSON.parse(m[1]).tecnica.hld, undefined, "payload não deveria trazer tecnica.hld");
});
