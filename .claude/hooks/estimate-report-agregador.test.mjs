// Harness Elo v2 — agregador determinístico da spec-estimate-report (Decisão 70, plano de melhoria
// das skills, Onda 5). O backlog, o HLD e os números da estimativa entram por código; aqui: o formato
// de cada nó é o mesmo do exemplo do kit (campo por campo, mesmo tipo), os totais batem com o
// tasks.json, o texto da IA sobrevive ao --montar, o HTML sai sem marcador, e META_TOTAIS_MATCH avisa.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-estimate-report');
const CLI = join(SKILL, 'cli.mjs');
const EXEMPLO = join(SKILL, 'templates', 'report-data.example.json');
const BACKLOG = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'templates', 'tasks.hierarchy-example.json');
const mod = () => import(pathToFileURL(join(SKILL, 'lib', 'aggregate.mjs')).href);

const tipo = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
/** Para cada chave do nó do exemplo: o nó montado tem a chave, com o mesmo tipo (null aceita string).
 *  Nos arrays com item dos dois lados, o item também tem o mesmo tipo — e, se for objeto, as mesmas chaves
 *  (pega a regra de negócio que saía como string e o shell lia como {id, texto}). */
function mesmoFormato(montado, exemplo, nome) {
  for (const [k, v] of Object.entries(exemplo)) {
    if (k === 'bloqueadoRazao' || k === 'enabler') continue; // só existem em story de tipo específico
    assert.ok(k in montado, `${nome}.${k} ausente`);
    const esperado = tipo(v);
    const obtido = tipo(montado[k]);
    assert.ok(obtido === esperado || (esperado === 'null' && obtido === 'string') || (esperado === 'string' && obtido === 'null'),
      `${nome}.${k}: ${obtido} em vez de ${esperado}`);
    if (esperado === 'array' && v.length && montado[k].length && !['features', 'stories', 'tasks'].includes(k)) {
      assert.equal(tipo(montado[k][0]), tipo(v[0]), `${nome}.${k}[]: item ${tipo(montado[k][0])} em vez de ${tipo(v[0])}`);
      if (tipo(v[0]) === 'object') assert.deepEqual(Object.keys(montado[k][0]).sort(), Object.keys(v[0]).sort(), `${nome}.${k}[]: chaves do item`);
    }
  }
}

test('Decisão 70 — o backlog montado do tasks.json tem o formato do exemplo, nó por nó', async () => {
  const { montarBacklog } = await mod();
  const ex = JSON.parse(readFileSync(EXEMPLO, 'utf8')).backlog;
  const b = montarBacklog(JSON.parse(readFileSync(BACKLOG, 'utf8')));
  const e = b.epics[0]; const f = e.features[0]; const s = f.stories[0]; const t = s.tasks[0];
  const exE = ex.epics[0]; const exF = exE.features[0]; const exS = exF.stories[0]; const exT = exS.tasks[0];
  mesmoFormato(e, exE, 'epic'); mesmoFormato(f, exF, 'feature'); mesmoFormato(s, exS, 'story'); mesmoFormato(t, exT, 'task');
  for (const k of Object.keys(ex.totais)) assert.equal(typeof b.totais[k], 'number', `totais.${k}`);
  assert.deepEqual([b.totais.epics, b.totais.features, b.totais.stories, b.totais.tasks], [1, 1, 1, 2]);
  assert.equal(b.totais.esforcoDiasTasks, 3.5);
});

test('Decisão 70 — HLD copiado como veio do check-hld --json; forecast dos números do forecast.mjs', async () => {
  const { montarHld, montarForecast } = await mod();
  const hld = montarHld({ containers: [{ id: 'C1' }], integracoes: [], decomposicao: [], taticas: [], adrs: [{ id: 'ADR-1' }], fluxos: [{}], modo: 'completo' });
  assert.deepEqual(Object.keys(hld).sort(), ['adrs', 'containers', 'decomposicao', 'integracoes', 'modo', 'taticas']);
  const f = montarForecast({
    calibracao: { startDate: '2026-11-02' },
    cpm: { humano: { duracaoDias: 7, caminhoCritico: ['A', 'B'] }, ia: { duracaoDias: 3 } },
    monteCarlo: { humano: { iteracoes: 10000, p15: 20, p50: 30, p85: 40, p95: 45, datas: { p15: '2026-11-30', p50: '2026-12-14', p85: '2026-12-28', p95: '2027-01-04' } }, ia: null },
  });
  assert.equal(f.forecast.iteracoesMonteCarlo, 10000);
  assert.deepEqual(f.forecast.p50, { dias: 30, data: '14/12/2026', semanas: 6 });
  assert.deepEqual(f.caminhoCritico, { dias: 7, diasIA: 3, tarefas: 2, sequencia: ['A', 'B'] });
});

test('Decisão 70 — --montar casa cada nó pelo ID e preserva o que o tasks.json não traz (DoD, papéis, onda, enabler…)', async () => {
  // Antes, o --montar trocava a árvore inteira: no exemplo antigo, 248 de 259 histórias perdiam a
  // Definição de pronto. O tasks.json continua dono da estrutura, dos títulos, do esforço e dos totais.
  const { montarReportData, montarBacklog } = await mod();
  const tasks = JSON.parse(readFileSync(BACKLOG, 'utf8'));
  const enabler = { capacidade: 'Reserva de estoque no checkout', porQue: 'Sem ela o pedido não confirma', desbloqueia: ['STORY-002'], risco: 'Vender sem estoque' };
  const seguranca = { severidade: 'ALTO', cvss: 7.5, owasp: 'A01', cwe: 'CWE-639', stride: 'E', camada: 'backend', bloqueiaFechamento: true };
  const antes = {
    meta: { projeto: 'Teste', totais: { epics: 9 } },
    backlog: {
      totais: { epics: 9, stories: 99 },
      dependenciasGlobais: { plataforma: 'texto da IA' },
      epics: [{
        id: 'EPIC-001', titulo: 'Título antigo do épico', esforcoDias: 99, rolloutWave: 'Onda 1', sistemasLegados: ['ERP atual'],
        features: [{
          id: 'FEAT-001', esforcoDias: 99, fluxos: ['FLX-002'],
          stories: [
            {
              id: 'STORY-001', titulo: 'Título antigo da história', esforcoDias: 99, rolloutWave: 'Onda 1',
              definitionOfDone: ['Revisado por par', 'Testes verdes', 'Publicado em homologação'], nDefinitionOfDone: 5,
              papeis: ['CLIENTE'], casosDeTesteDeNegocio: ['TC-001'], enabler,
              tasks: [{ id: 'TASK-001-001', esforcoDias: 99, testeRed: 'Pedido sem estoque é recusado', tamanho: 'M', seguranca }],
            },
            { id: 'STORY-999', titulo: 'História que saiu do tasks.json', tasks: [] },
          ],
        }],
      }],
    },
  };
  const depois = montarReportData(antes, { tasks });
  const b = montarBacklog(tasks);
  const e = depois.backlog.epics[0]; const f = e.features[0]; const s = f.stories[0];
  const t = s.tasks.find((x) => x.id === 'TASK-001-001');
  // o que só a IA escreve sobrevive, casado pelo ID
  assert.deepEqual(s.definitionOfDone, ['Revisado por par', 'Testes verdes', 'Publicado em homologação']);
  assert.equal(s.nDefinitionOfDone, 5, 'o contador acompanha o array preservado');
  assert.deepEqual(s.papeis, ['CLIENTE']);
  assert.equal(s.rolloutWave, 'Onda 1');
  assert.deepEqual(s.casosDeTesteDeNegocio, ['TC-001']);
  assert.deepEqual(s.enabler, enabler);
  assert.deepEqual(f.fluxos, ['FLX-002']);
  assert.equal(e.rolloutWave, 'Onda 1');
  assert.deepEqual(e.sistemasLegados, ['ERP atual']);
  assert.equal(t.testeRed, 'Pedido sem estoque é recusado');
  assert.equal(t.tamanho, 'M');
  assert.equal(t.seguranca.severidade, 'ALTO');
  assert.equal(t.seguranca.cvss, 7.5);
  // o que vem do tasks.json vence: estrutura, títulos, esforço e totais
  assert.deepEqual(f.stories.map((x) => x.id), ['STORY-001'], 'história fora do tasks.json some');
  assert.equal(e.titulo, b.epics[0].titulo);
  assert.equal(s.titulo, b.epics[0].features[0].stories[0].titulo);
  assert.deepEqual(s.narrativa, b.epics[0].features[0].stories[0].narrativa);
  assert.deepEqual([e.esforcoDias, f.esforcoDias, s.esforcoDias, t.esforcoDias], [3.5, 3.5, 3.5, 1.5]);
  assert.equal(t.seguranca.camada, 'backend');
  assert.deepEqual(depois.backlog.totais, b.totais);
  assert.equal(depois.meta.totais.epics, 1);
  assert.deepEqual(depois.backlog.dependenciasGlobais, { plataforma: 'texto da IA' });
  assert.equal(antes.backlog.epics[0].features[0].stories.length, 2, 'a entrada não é alterada');
});

test('Decisão 70 — regra de negócio da história sai como {id, texto}, a forma que o schema e o shell leem', async () => {
  // O shell lê r.id e r.texto; uma string virava bullet vazio na aba Backlog.
  const { montarBacklog } = await mod();
  const s = montarBacklog(JSON.parse(readFileSync(BACKLOG, 'utf8'))).epics[0].features[0].stories[0];
  assert.deepEqual(s.regrasNegocio, [{ id: 'RN-ESTOQUE-001', texto: 'Nao permitir pedido sem estoque' }]);
  assert.equal(s.nRegras, 1);
  const legado = montarBacklog({ stories: [{ id: 'S1', name: 'S1', businessRules: ['Pedido só com estoque'], tasks: [] }] });
  assert.deepEqual(legado.epics[0].features[0].stories[0].regrasNegocio, [{ id: '', texto: 'Pedido só com estoque' }]);
});

test('Decisão 70 — storiesNegocio conta só USER_STORY: SPIKE, débito técnico e BUG não são história de negócio', async () => {
  const { montarBacklog } = await mod();
  const st = (id, extra) => ({ id, name: id, featureId: 'F1', tasks: [], ...extra });
  const b = montarBacklog({
    features: [{ id: 'F1', name: 'F1' }],
    stories: [st('S1'), st('S2', { workItemType: 'USER_STORY' }), st('S3', { workItemType: 'ENABLER' }),
      st('S4', { workItemType: 'SPIKE' }), st('S5', { workItemType: 'TECHNICAL_DEBT' }), st('S6', { workItemType: 'BUG' }),
      st('S7', { class: 'uat' })],
  });
  assert.equal(b.totais.stories, 7);
  assert.equal(b.totais.storiesNegocio, 2);
  assert.equal(b.totais.enablers, 1);
  assert.equal(b.totais.storiesUat, 1);
});

test('Decisão 70 — CLI: --montar troca os blocos e preserva o texto; sem --montar, META_TOTAIS_MATCH avisa', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agregador-'));
  try {
    const data = join(dir, 'report-data.json');
    copyFileSync(EXEMPLO, data);
    const antes = JSON.parse(readFileSync(data, 'utf8'));
    // Só conferir: os totais do exemplo não batem com o backlog de hierarquia (1 epic) — avisa.
    const conf = spawnSync(process.execPath, [CLI, '-i', data, '-o', join(dir, 'a.html'), '--tasks', BACKLOG], { encoding: 'utf8' });
    assert.equal(conf.status, 0, conf.stderr);
    assert.match(conf.stderr, /META_TOTAIS_MATCH: meta\.totais\.epics = \d+, mas o tasks\.json tem 1/);
    // Montar: o backlog vira o do tasks.json; o texto da IA (negócio, notas) fica.
    const m = spawnSync(process.execPath, [CLI, '-i', data, '-o', join(dir, 'b.html'), '--tasks', BACKLOG, '--montar'], { encoding: 'utf8' });
    assert.equal(m.status, 0, m.stderr);
    assert.ok(!/META_TOTAIS_MATCH/.test(m.stderr), 'depois de montar, os totais batem');
    const depois = JSON.parse(readFileSync(data, 'utf8'));
    assert.deepEqual(depois.backlog.epics.map((e) => e.id), ['EPIC-001']);
    assert.deepEqual(depois.negocio, antes.negocio);
    assert.equal(depois.meta.tituloHtml, antes.meta.tituloHtml);
    assert.deepEqual(depois.backlog.dependenciasGlobais, antes.backlog.dependenciasGlobais);
    // O exemplo usa os mesmos IDs do tasks.json de hierarquia do kit (EPIC-001 › FEAT-001 › STORY-001):
    // o que a IA escreveu na história e o tasks.json não tem atravessa o --montar do CLI.
    const sAntes = antes.backlog.epics[0].features[0].stories.find((s) => s.id === 'STORY-001');
    const sDepois = depois.backlog.epics[0].features[0].stories[0];
    assert.equal(sDepois.id, 'STORY-001');
    assert.ok(sAntes.definitionOfDone.length > 0);
    assert.deepEqual(sDepois.definitionOfDone, sAntes.definitionOfDone, 'Definição de pronto perdida no --montar');
    assert.deepEqual(sDepois.casosDeTesteDeNegocio, sAntes.casosDeTesteDeNegocio);
    assert.equal(sDepois.rolloutWave, sAntes.rolloutWave);
    const html = readFileSync(join(dir, 'b.html'), 'utf8');
    assert.ok(!/__[A-Z_]+__/.test(html), 'marcador do shell vazou');
    assert.ok(html.includes('EPIC-001'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Decisão 70 — a spec-estimate-report manda montar por código o que já existe em JSON', () => {
  const t = readFileSync(join(SKILL, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(t, /--tasks outputs\/spec\/tasks\.json/);
  assert.match(t, /--montar/);
  assert.match(t, /META_TOTAIS_MATCH/);
});

// D59 (teste ponta a ponta de 2026-10-21): o --montar montava `caminhoCritico` sem `gargalos`, o
// shell congelado lê `E.caminhoCritico.gargalos.length`, e a aba Estimativa quebrava ao abrir
// (TypeError) com o CLI em exit 0 e nenhum AVISO.
const CALC = {
  calibracao: { startDate: '2026-11-02' },
  cpm: { humano: { duracaoDias: 20, caminhoCritico: ['T1', 'T2'] }, ia: { duracaoDias: 9 } },
  monteCarlo: { humano: { iteracoes: 10000, p15: 50, p50: 70, p85: 85, p95: 95, datas: null }, ia: null },
  gargalos: [
    { id: 'T1', bottleneckScore: 87, fanIn: 0, fanOut: 3, folga: 0, durH: 4 },
    { id: 'T2', bottleneckScore: 55, fanIn: 1, fanOut: 0, folga: 2, durH: 2 },
  ],
};

test('D59 — montarForecast monta caminhoCritico.gargalos do estimate-calc.json; o --montar preserva o texto da IA pelo ID', async () => {
  const { montarForecast, montarReportData } = await mod();
  const f = montarForecast(CALC);
  assert.deepEqual(f.caminhoCritico.gargalos, [
    { id: 'T1', nome: '', score: 87, porque: '', acao: '' },
    { id: 'T2', nome: '', score: 55, porque: '', acao: '' },
  ], 'a forma do schema: {id, nome, score, porque, acao}');
  const tasks = { stories: [{ id: 'S1', name: 'S1', tasks: [{ id: 'T1', title: 'Cadastrar cliente' }, { id: 'T2', title: 'Enviar pedido' }] }] };
  const antes = { meta: { projeto: 'X' }, estimativa: { caminhoCritico: { resumo: 'texto da IA',
    gargalos: [{ id: 'T1', nome: 'Nome antigo', score: 1, porque: 'Tudo depende dela', acao: 'Começar no dia 1' }, { id: 'T9', porque: 'saiu do forecast' }] } } };
  const g = montarReportData(antes, { calc: CALC, tasks }).estimativa.caminhoCritico;
  assert.equal(g.resumo, 'texto da IA');
  assert.deepEqual(g.gargalos.map((x) => x.id), ['T1', 'T2'], 'a lista é a do forecast');
  assert.equal(g.gargalos[0].score, 87, 'o número vem do forecast');
  assert.equal(g.gargalos[0].nome, 'Cadastrar cliente', 'o nome vem do tasks.json');
  assert.equal(g.gargalos[0].porque, 'Tudo depende dela');
  assert.equal(g.gargalos[0].acao, 'Começar no dia 1');
  assert.equal(g.gargalos[1].nome, 'Enviar pedido');
  // estimate-calc.json sem `gargalos` (anterior ao forecast.mjs): fica o que a IA escreveu.
  const semGargalos = montarReportData(antes, { calc: { ...CALC, gargalos: undefined } }).estimativa.caminhoCritico.gargalos;
  assert.deepEqual(semGargalos.map((x) => x.id), ['T1', 'T9']);
});

test('D59 — CLI: campo que a aba Estimativa lê sem guarda e falta vira AVISO e entra vazio no HTML; com --montar, vem do forecast', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agregador-d59-'));
  try {
    const data = join(dir, 'report-data.json');
    const ex = JSON.parse(readFileSync(EXEMPLO, 'utf8'));
    delete ex.estimativa.caminhoCritico.gargalos;
    delete ex.estimativa.porEpic;
    writeFileSync(data, JSON.stringify(ex));
    const payloadDe = (html) => JSON.parse(readFileSync(html, 'utf8').match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    const r = spawnSync(process.execPath, [CLI, '-i', data, '-o', join(dir, 'a.html')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /AVISO: CAMPO_OBRIGATORIO: estimativa\.caminhoCritico\.gargalos ausente/);
    assert.match(r.stderr, /AVISO: CAMPO_OBRIGATORIO: estimativa\.porEpic ausente/);
    const p = payloadDe(join(dir, 'a.html'));
    assert.deepEqual(p.estimativa.caminhoCritico.gargalos, [], 'sem o array, a aba lança TypeError ao abrir');
    assert.deepEqual(p.estimativa.porEpic, []);
    assert.ok(!('gargalos' in JSON.parse(readFileSync(data, 'utf8')).estimativa.caminhoCritico), 'sem --montar, o report-data.json não é reescrito');
    // Com --montar e o estimate-calc.json do forecast.mjs: os gargalos vêm dele, e o aviso some.
    writeFileSync(join(dir, 'calc.json'), JSON.stringify(CALC));
    const m = spawnSync(process.execPath, [CLI, '-i', data, '-o', join(dir, 'b.html'), '--estimate-calc', join(dir, 'calc.json'), '--montar'], { encoding: 'utf8' });
    assert.equal(m.status, 0, m.stderr);
    assert.ok(!/caminhoCritico\.gargalos/.test(m.stderr), m.stderr);
    assert.deepEqual(payloadDe(join(dir, 'b.html')).estimativa.caminhoCritico.gargalos.map((g) => g.id), ['T1', 'T2']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
