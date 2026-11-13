// Harness Elo v2 — `--dry-run` da spec-tasks-azure (plano de melhoria das skills, Onda 1, item 1.1).
//
// Publicar no Azure DevOps cria work items que não se apagam com um comando, e a Camada J da
// security.md pede confirmação humana antes de escrita irreversível. O CLI publicava direto, sem
// mostrar antes o que ia fazer. Três provas aqui:
//   1. o `--dry-run` roda sem PAT, sem carregar o azureDevopsService.js e sem chamar `fetch`
//      (antes desta mudança a flag era ignorada e o CLI tentava publicar: exit 1 sem PAT);
//   2. PARIDADE: os itens «criar» do plano saem na mesma ordem, com o mesmo WIT, título, pai e
//      tags que o createFullStructure de verdade manda para a API (com `fetch` falso);
//   3. o SKILL.md manda simular, mostrar e pedir confirmação antes de publicar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-tasks-azure');
const CLI = join(SKILL, 'cli.mjs');
const EXEMPLO = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'templates', 'tasks.hierarchy-example.json');

const plano = () => import(pathToFileURL(join(SKILL, 'lib', 'publish-plan.mjs')).href);
const servico = () => import(pathToFileURL(join(SKILL, 'azureDevopsService.js')).href);

/** Ambiente sem nenhuma credencial do ADO — o dry-run não pode precisar delas. */
function envSemAdo() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('AZURE_DEVOPS_')) delete env[k];
  return env;
}

/**
 * Pré-carga que registra (a) todo módulo do serviço que for resolvido e (b) toda chamada a
 * `fetch`, num arquivo-marca. O dry-run correto deixa o arquivo vazio.
 */
function montarEspiao(dir) {
  const marca = join(dir, 'marca.txt');
  const pre = join(dir, 'espiao.mjs');
  writeFileSync(pre, [
    "import { registerHooks } from 'node:module';",
    "import { appendFileSync } from 'node:fs';",
    `const MARCA = ${JSON.stringify(marca)};`,
    'registerHooks({ resolve(spec, ctx, next) {',
    '  const r = next(spec, ctx);',
    "  if (/azureDevopsService\\.js$|azure-upsert\\.mjs$/.test(r.url)) appendFileSync(MARCA, 'modulo ' + r.url + '\\n');",
    '  return r;',
    '} });',
    "globalThis.fetch = async (url) => { appendFileSync(MARCA, 'fetch ' + url + '\\n'); throw new Error('fetch proibido no dry-run'); };",
  ].join('\n'));
  return { marca, pre };
}

test('1.1 — o --dry-run roda sem PAT, sem carregar o serviço do ADO e sem chamar fetch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'azure-dry-'));
  try {
    const tasks = join(dir, 'tasks.json');
    copyFileSync(EXEMPLO, tasks);
    const { marca, pre } = montarEspiao(dir);
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(pre).href, CLI, '-i', tasks, '--dry-run'], {
      cwd: dir, env: envSemAdo(), encoding: 'utf8',
    });
    assert.equal(r.status, 0, `exit ${r.status}\n${r.stderr}`);
    assert.equal(existsSync(marca) ? readFileSync(marca, 'utf8') : '', '', 'o dry-run tocou no serviço ou na rede');
    const out = JSON.parse(r.stdout);
    assert.equal(out.mode, 'dry-run');
    assert.equal(out.modo, 'normal');
    // O exemplo tem 1 epic, 1 feature, 1 story e 2 tasks — todos novos.
    assert.deepEqual(out.resumo, { criar: { epic: 1, feature: 1, story: 1, task: 2 } });
    assert.deepEqual(out.itens.map((i) => i.nivel), ['epic', 'feature', 'story', 'task', 'task']);
    assert.match(r.stderr, /SIMULAÇÃO \(--dry-run\) — nada foi enviado ao Azure DevOps/);
    assert.match(r.stderr, /Ordem de publicação:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('1.1 — sem a flag, o CLI segue tentando publicar (o padrão não mudou)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'azure-dry-'));
  try {
    const tasks = join(dir, 'tasks.json');
    copyFileSync(EXEMPLO, tasks);
    const { marca, pre } = montarEspiao(dir);
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(pre).href, CLI, '-i', tasks], {
      cwd: dir, env: envSemAdo(), encoding: 'utf8',
    });
    // Sem credencial, a publicação de verdade falha como sempre falhou — e o serviço foi carregado.
    assert.equal(r.status, 1);
    assert.match(r.stderr, /AZURE_DEVOPS_PAT/);
    assert.match(readFileSync(marca, 'utf8'), /modulo .*azureDevopsService\.js/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('1.1 — dry-run sem Epic pai possível acusa o mesmo erro que a publicação daria (exit 1)', async () => {
  const { buildPublishPlan } = await plano();
  const doc = { metadata: { schemaVersion: 'tasks/v5.3' }, stories: [{ id: 'ST-1', name: 'x', tasks: [] }] };
  const p = buildPublishPlan(doc, { env: {} });
  assert.equal(p.epicPai, null);
  assert.match(p.erros[0], /Nenhum epic pai definido/);
});

// ————————————————————————— paridade com a publicação de verdade —————————————————————————

const CFG = {
  pat: 'pat-falso', org: 'org-exemplo', project: 'projeto-exemplo',
  witEpic: 'Epic', witFeature: 'Feature', witUserStory: 'User Story', witTask: 'Task', witSpike: 'Spike',
};
const ENV_PLANO = { AZURE_DEVOPS_WIT_SPIKE: 'Spike' };

/** O maior StackRank que o projeto falso já tem (o backlog que o time já tinha antes da publicação). */
const MAIOR_EXISTENTE = 5000;

/**
 * Roda o createFullStructure com fetch falso e devolve o que ele mandou criar (em ordem) e os links
 * de dependência que ele gravou depois. O projeto falso já tem backlog: o maior StackRank é
 * `maior` (a consulta WIQL + a leitura em lote que a publicação faz antes de criar).
 */
async function publicarDeMentira(doc, cfgExtra = {}, { maior = MAIOR_EXISTENTE, opts = {} } = {}) {
  const { createFullStructure } = await servico();
  const criados = [];
  const ligacoes = [];
  const consultas = [];
  let proximo = 1000;
  const fetchOriginal = globalThis.fetch;
  const errOriginal = console.error;
  const epicEnv = process.env.AZURE_DEVOPS_EPIC_WORK_ITEM_ID;
  delete process.env.AZURE_DEVOPS_EPIC_WORK_ITEM_ID;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes('/_apis/wit/wiql')) {
      consultas.push(JSON.parse(init.body).query);
      return new Response(JSON.stringify({ workItems: maior == null ? [] : [{ id: 999 }] }), { status: 200 });
    }
    if (/\/_apis\/wit\/workitems\?ids=999\b/.test(String(url))) {
      return new Response(JSON.stringify({ count: 1, value: [{ id: 999, fields: { 'Microsoft.VSTS.Common.StackRank': maior } }] }), { status: 200 });
    }
    const patch = JSON.parse(init.body);
    const atualizacao = String(url).match(/\/_apis\/wit\/workitems\/(\d+)\?/);
    if (atualizacao && init.method === 'PATCH') {
      for (const op of patch) {
        assert.equal(op.value?.rel, 'System.LinkTypes.Dependency-Reverse', `PATCH inesperado: ${JSON.stringify(op)}`);
        ligacoes.push({ de: Number(atualizacao[1]), para: Number(op.value.url.match(/\/workitems\/(\d+)$/)[1]) });
      }
      return new Response(JSON.stringify({ id: Number(atualizacao[1]), url: '' }), { status: 200 });
    }
    const m = String(url).match(/\/_apis\/wit\/workitems\/%24([^?]+)\?/);
    assert.ok(m && init.method === 'POST', `chamada inesperada: ${init.method} ${url}`);
    const campo = (p) => patch.find((op) => op.path === p)?.value;
    const rel = patch.find((op) => op.path === '/relations/-')?.value?.url ?? null;
    const id = proximo++;
    criados.push({
      id,
      wit: decodeURIComponent(m[1]),
      titulo: campo('/fields/System.Title'),
      tags: campo('/fields/System.Tags').split('; '),
      pai: rel ? Number(rel.match(/\/workitems\/(\d+)$/)[1]) : null,
      stackRank: campo('/fields/Microsoft.VSTS.Common.StackRank') ?? null,
    });
    return new Response(JSON.stringify({ id, url: '' }), { status: 200 });
  };
  console.error = () => {};
  let r;
  try {
    r = await createFullStructure(structuredClone(doc), { ...CFG, ...cfgExtra }, opts);
    assert.deepEqual(r.errors, []);
  } finally {
    globalThis.fetch = fetchOriginal;
    console.error = errOriginal;
    if (epicEnv !== undefined) process.env.AZURE_DEVOPS_EPIC_WORK_ITEM_ID = epicEnv;
  }
  return { criados, ligacoes, consultas, resultado: r };
}

/**
 * Troca `<novo:ID>` pelo id que o fetch falso deu ao item ao criá-lo, e o StackRank relativo do plano
 * («maior existente + N») pelo número que a publicação grava com o maior do projeto falso.
 */
function resolverNovos(itensCriar, criados, maior = MAIOR_EXISTENTE) {
  const idDe = new Map(itensCriar.map((it, i) => [it.id, criados[i]?.id]));
  const troca = (v) => String(v).replace(/<novo:([^>]+)>/g, (_, id) => String(idDe.get(id)));
  return itensCriar.map((it) => ({
    wit: it.wit,
    titulo: it.titulo,
    tags: it.tags.map(troca),
    pai: it.pai == null ? null : Number(troca(it.pai)),
    stackRank: it.stackRankSoma == null ? null : maior + it.stackRankSoma,
  }));
}

async function conferirParidade(doc) {
  const { buildPublishPlan } = await plano();
  const { normalizeLabels } = await import(pathToFileURL(join(SKILL, 'lib', 'load-tasks.mjs')).href);
  normalizeLabels(doc);
  const plan = buildPublishPlan(structuredClone(doc), { env: ENV_PLANO });
  assert.deepEqual(plan.erros, []);
  const criar = plan.itens.filter((i) => i.acao === 'criar');
  const { criados, ligacoes } = await publicarDeMentira(doc);
  assert.equal(criar.length, criados.length, 'a simulação e a publicação não criam o mesmo número de itens');
  assert.deepEqual(resolverNovos(criar, criados), criados.map(({ id, ...resto }) => resto));
  // Links de dependência: os que o plano promete entre itens deste arquivo são os que a publicação grava.
  const idDe = new Map(criar.map((it, i) => [it.id, criados[i].id]));
  const prometidos = criar.flatMap((it) => (it.dependencias ?? []).filter((d) => !d.nota && idDe.has(d.para))
    .map((d) => ({ de: idDe.get(it.id), para: idDe.get(d.para) })));
  const ord = (l) => l.map((x) => `${x.de}>${x.para}`).sort();
  assert.deepEqual(ord(ligacoes), ord(prometidos), 'links de dependência divergem entre simulação e publicação');
  return { plan, criados, ligacoes };
}

const LONGO = 'Cadastro de cliente com validação de documento e endereço '.repeat(6);

test('1.1 — paridade: epics novo/existente/não publicado, feature não publicada, tipo operacional e título longo', async () => {
  const doc = {
    metadata: {
      schemaVersion: 'tasks/v5.3',
      backlogHierarchy: { chosen: ['epic', 'feature', 'story', 'task'] },
      azureDevOps: { workItemTags: ['task-pipeline', 'projeto-x'] },
    },
    epics: [
      { id: 'EPIC-A', name: 'Atendimento' },
      { id: 'EPIC-B', name: 'Cobrança', azureDevOps: { existingWorkItemId: 500 } },
      { id: 'EPIC-C', name: 'Relatórios', azureDevOps: { publish: false } },
    ],
    features: [
      { id: 'FEAT-1', name: 'Cadastro', epicId: 'EPIC-A', priority: 'HIGH' },
      { id: 'FEAT-2', name: 'Boletos', epicId: 'EPIC-B', workItemType: 'ENABLER' },
      { id: 'FEAT-3', name: 'Exportação', epicId: 'EPIC-A', azureDevOps: { publish: false } },
    ],
    stories: [
      { id: 'ST-1', name: 'Cadastrar cliente', featureId: 'FEAT-1', epicId: 'EPIC-A',
        tasks: [{ id: 'T-1', title: 'Tabela de clientes' }, { id: 'T-2', title: 'Tela de cadastro' }] },
      { id: 'ST-2', name: 'Exportar CSV', featureId: 'FEAT-3', epicId: 'EPIC-A', tasks: [] },
      { id: 'ST-3', name: 'Investigar banco', epicId: 'EPIC-B', workItemType: 'SPIKE',
        tasks: [{ id: 'T-3', title: 'Prova de conceito' }] },
      { id: 'ST-4', name: LONGO, epicId: 'EPIC-C', tasks: [] },
    ],
  };
  const { plan } = await conferirParidade(doc);
  const porId = new Map(plan.itens.map((i) => [i.id, i]));
  assert.equal(porId.get('EPIC-B').acao, 'usar-existente');
  assert.equal(porId.get('EPIC-C').acao, 'nao-publicar');
  assert.equal(porId.get('FEAT-3').acao, 'nao-publicar');
  assert.equal(porId.get('ST-2').pai, '<novo:EPIC-A>', 'story de feature não publicada fica no Epic padrão');
  assert.equal(porId.get('ST-3').wit, 'Spike');
  assert.equal(porId.get('ST-4').titulo.length, 256);
});

test('1.1 — paridade: Epic pai global no metadata e lista de tags vazia', async () => {
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', azureDevOps: { epicWorkItemId: 42, workItemTags: [] } },
    features: [{ id: 'F-1', name: 'Agenda' }],
    stories: [{ id: 'S-1', name: 'Marcar horário', featureId: 'F-1', tasks: [{ id: 'T-1', title: 'API de horários' }] }],
  };
  const { plan } = await conferirParidade(doc);
  assert.deepEqual(plan.epicPai, { id: 42, origem: 'metadata.azureDevOps.epicWorkItemId' });
});

test('1.1 — paridade com o exemplo de hierarquia do kit', async () => {
  await conferirParidade(JSON.parse(readFileSync(EXEMPLO, 'utf8')));
});

test('1.1 — modo _change: id-map vira «atualizar», o resto «criar ou atualizar», regressão vira link Related', async () => {
  const { buildPublishPlan, isChangeModeDoc } = await plano();
  const { isChangeMode } = await import(pathToFileURL(join(SKILL, 'lib', 'azure-upsert.mjs')).href);
  for (const [doc, flag] of [
    [{ metadata: { changeMode: true } }, false], [{ metadata: { changeMode: 'true' } }, false],
    [{ metadata: {} }, true], [{}, false], [{ metadata: null }, false],
  ]) {
    assert.equal(isChangeModeDoc(doc, flag), isChangeMode(doc, flag), JSON.stringify(doc));
  }
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', changeMode: true, azureDevOps: { epicWorkItemId: 7 } },
    stories: [{ id: 'ST-9', name: 'Ajuste', tasks: [
      { id: 'T-90', title: 'Corrige cálculo', regressionOf: 'T-10' },
      { id: 'T-91', title: 'Novo campo' },
    ] }],
  };
  const p = buildPublishPlan(doc, { changeMode: true, idMap: new Map([['ST-9', 300]]), env: {} });
  assert.equal(p.modo, 'change');
  const porId = new Map(p.itens.map((i) => [i.id, i]));
  assert.equal(porId.get('ST-9').acao, 'atualizar');
  assert.equal(porId.get('T-90').acao, 'criar-ou-atualizar');
  assert.equal(porId.get('T-90').pai, 300, 'task de story já mapeada aponta para o work item existente');
  assert.deepEqual(porId.get('T-90').links, [{ tipo: 'Related', para: 'T-10' }]);
  assert.ok(porId.get('T-91').tagsNaAtualizacao.includes('logical-id:T-91'));
});

test('1.1 — o SKILL.md manda simular, mostrar e pedir confirmação antes de publicar', () => {
  const t = readFileSync(join(SKILL, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const como = t.slice(t.indexOf('## Como usar'), t.indexOf('### Parâmetros'));
  assert.match(como, /--dry-run/);
  assert.match(como, /confirma/i);
  assert.ok(como.indexOf('--dry-run') < como.search(/confirma/i), 'a simulação vem antes da confirmação');
  assert.match(t, /\| `--dry-run` \|/, 'a flag não está na tabela de parâmetros');
  assert.match(t, /\| `PUBLISH_CONFIRMED` \|/, 'o gate de confirmação não está nos validators');
  assert.match(readFileSync(CLI, 'utf8'), /--dry-run/, 'o --help do CLI não cita a flag');
});

// ————————————————————————— Onda 6: ordem, StackRank, links de dependência e tag de regra —————————————————————————

const SCRIPTS_TASKS = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'scripts');
const ordemTasks = () => import(pathToFileURL(join(SCRIPTS_TASKS, 'order-backlog.mjs')).href);
const marcaTasks = () => import(pathToFileURL(join(SCRIPTS_TASKS, 'mark-business-rules.mjs')).href);

/** Backlog com os arrays fora de ordem, dependência cruzada e uma task de regra. */
function backlogOnda6() {
  const t = (id, storyId, over = {}) => ({ id, storyId, title: id, type: 'backend', durationEstimatedDays: 1, ...over });
  return {
    metadata: { schemaVersion: 'tasks/v5.3', azureDevOps: { epicWorkItemId: 77 } },
    features: [{ id: 'F-TELA', name: 'Tela' }, { id: 'F-BASE', name: 'Base' }],
    stories: [
      { id: 'S-TELA', featureId: 'F-TELA', name: 'Tela de pedidos', tasks: [
        t('T-TELA', 'S-TELA', { type: 'frontend', uiContext: { etapa: 'ETP-001 (ordem 1)' }, dependencies: ['T-API'] }),
      ] },
      { id: 'S-BASE', featureId: 'F-BASE', name: 'Base de pedidos', tasks: [
        t('T-API', 'S-BASE', {
          apiContracts: [{ method: 'POST', path: '/pedidos' }],
          businessRules: [{ id: 'RN-1' }],
          acceptanceScenarios: [{ category: 'BUSINESS_RULE_VIOLATION' }, { relatedRules: ['RN-1'] }],
        }),
        t('T-TAB', 'S-BASE', { type: 'database', persistenceModel: { entities: [{ table: 'TB_PEDIDO' }] } }),
      ] },
    ],
  };
}

test('6.2/6.4 — a publicação segue executionOrder (mesmo com o array fora de ordem), grava StackRank, links e a tag — igual à simulação', async () => {
  const { ordenarBacklog } = await ordemTasks();
  const { marcar } = await marcaTasks();
  // change:true = arrays continuam fora de ordem; só o executionOrder diz a ordem.
  const doc = marcar(ordenarBacklog(backlogOnda6(), { change: true }).doc).doc;
  assert.deepEqual(doc.stories.map((s) => s.id), ['S-TELA', 'S-BASE'], 'pré-condição: array fora de ordem');
  const { plan, criados, ligacoes } = await conferirParidade(doc);
  // Ordem: base antes da tela, em todos os níveis; dentro da story, a tabela antes da API.
  assert.deepEqual(criados.map((c) => c.titulo.split(':')[0]), ['F-BASE', 'F-TELA', 'S-BASE', 'T-TAB', 'T-API', 'S-TELA', 'T-TELA']);
  // StackRank = maior já existente no projeto + a posição: os novos entram DEPOIS do backlog que havia.
  assert.deepEqual(criados.map((c) => c.stackRank), [5001, 5002, 5001, 5001, 5002, 5002, 5003]);
  // Tag só no item marcado.
  const comTag = criados.filter((c) => c.tags.includes('regra-de-negocio')).map((c) => c.titulo.split(':')[0]);
  assert.deepEqual(comTag, ['T-API']);
  // T-TELA depende de T-API: um link, do dependente para a predecessora.
  assert.equal(ligacoes.length, 1);
  assert.ok(plan.itens.find((i) => i.id === 'T-TELA').dependencias.some((d) => d.para === 'T-API'));
});

test('6.2 — processo sem StackRank: avisa uma vez, cria sem o campo e segue', async () => {
  const { ordenarBacklog } = await ordemTasks();
  const doc = ordenarBacklog(backlogOnda6()).doc;
  const { createFullStructure } = await servico();
  const fetchOriginal = globalThis.fetch;
  const errOriginal = console.error;
  let proximo = 500;
  let recusas = 0;
  let criados = 0;
  globalThis.fetch = async (url, init = {}) => {
    // O campo existe na organização (a consulta passa e não acha nada), mas não no tipo de work item.
    if (String(url).includes('/_apis/wit/wiql')) return new Response('{"workItems":[]}', { status: 200 });
    const patch = JSON.parse(init.body);
    if (init.method === 'PATCH') return new Response('{"id":1}', { status: 200 });
    if (patch.some((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank')) {
      recusas++;
      return new Response(JSON.stringify({ message: 'TF51535: Cannot find field Microsoft.VSTS.Common.StackRank.' }), { status: 400 });
    }
    criados++;
    return new Response(JSON.stringify({ id: proximo++ }), { status: 200 });
  };
  console.error = () => {};
  try {
    const r = await createFullStructure(doc, { ...CFG });
    assert.deepEqual(r.errors, []);
    assert.equal(recusas, 1, 'depois da primeira recusa o campo não é mais enviado');
    assert.equal(criados, 7);
    assert.equal(r.warnings.filter((w) => /StackRank/.test(w)).length, 1);
  } finally {
    globalThis.fetch = fetchOriginal;
    console.error = errOriginal;
  }
});

test('6a — projeto que já tem backlog: o que é criado entra DEPOIS do maior StackRank existente, na ordem calculada (antes ia para o topo)', async () => {
  const { ordenarBacklog } = await ordemTasks();
  const doc = ordenarBacklog(backlogOnda6()).doc;
  const { criados, consultas } = await publicarDeMentira(doc, {}, { maior: 1999998207.5 });
  // A consulta pega o maior StackRank do projeto — a base fica fixa durante a publicação.
  assert.equal(consultas.length, 1, 'o maior existente é lido uma vez, antes de criar');
  assert.match(consultas[0], /\[System\.TeamProject\] = @project/);
  assert.match(consultas[0], /ORDER BY \[Microsoft\.VSTS\.Common\.StackRank\] DESC/);
  const rank = Object.fromEntries(criados.map((c) => [c.titulo.split(':')[0], c.stackRank]));
  assert.ok(Object.values(rank).every((v) => v > 1999998207.5), 'algum item novo ficou antes do backlog que já existia');
  assert.ok(rank['F-BASE'] < rank['F-TELA'] && rank['S-BASE'] < rank['S-TELA'] && rank['T-TAB'] < rank['T-API'] && rank['T-API'] < rank['T-TELA']);
  // Projeto vazio: a base é zero e o StackRank é a própria posição.
  const vazio = await publicarDeMentira(doc, {}, { maior: null });
  assert.deepEqual(vazio.criados.map((c) => c.stackRank), [1, 2, 1, 1, 2, 2, 3]);
});

test('6a — a leitura do maior StackRank falhou: cria SEM StackRank (o ADO põe no fim), com aviso — nunca no topo', async () => {
  const { ordenarBacklog } = await ordemTasks();
  const doc = ordenarBacklog(backlogOnda6()).doc;
  const { createFullStructure } = await servico();
  const fetchOriginal = globalThis.fetch;
  const errOriginal = console.error;
  for (const [status, mensagem, semCampo] of [
    [503, 'Serviço indisponível', false],
    [400, 'TF51005: The query references a field that does not exist. The error is caused by «Microsoft.VSTS.Common.StackRank».', true],
  ]) {
    let comStackRank = 0;
    let criados = 0;
    globalThis.fetch = async (url, init = {}) => {
      if (String(url).includes('/_apis/wit/wiql')) return new Response(JSON.stringify({ message: mensagem }), { status });
      const patch = JSON.parse(init.body);
      if (init.method === 'PATCH') return new Response('{"id":1}', { status: 200 });
      if (patch.some((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank')) comStackRank++;
      return new Response(JSON.stringify({ id: 600 + criados++ }), { status: 200 });
    };
    console.error = () => {};
    try {
      const r = await createFullStructure(structuredClone(doc), { ...CFG });
      assert.deepEqual(r.errors, []);
      assert.equal(criados, 7);
      assert.equal(comStackRank, 0, `status ${status}: item criado com StackRank sem saber o maior existente`);
      const avisos = r.warnings.filter((w) => /StackRank/.test(w));
      assert.equal(avisos.length, 1);
      assert.match(avisos[0], semCampo ? /STACKRANK_UNSUPPORTED/ : /sem StackRank/);
    } finally {
      globalThis.fetch = fetchOriginal;
      console.error = errOriginal;
    }
  }
});

test('6a — no _change, item novo entra depois do maior existente; o que já existe só muda com --reordenar', async () => {
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', changeMode: true, azureDevOps: { epicWorkItemId: 9 } },
    stories: [{ id: 'S-1', name: 'Pedido', executionOrder: 1, tasks: [
      { id: 'T-1', storyId: 'S-1', title: 'Tabela', type: 'database', executionOrder: 1 },
      { id: 'T-NOVA', storyId: 'S-1', title: 'API nova', type: 'backend', executionOrder: 2 },
    ] }],
  };
  const ado = adoFalso({ maior: 800, ranks: { 300: 40, 301: 41 } });
  const { r } = await upsertDeMentira(doc, { 'S-1': 300, 'T-1': 301 }, ado);
  assert.deepEqual(r.errors, []);
  const [nova] = r.created;
  assert.equal(nova.jsonId, 'T-NOVA');
  const rank = (p) => p.find((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank')?.value;
  assert.equal(rank(ado.chamadas.patches.get(nova.adoId)), 802, 'item novo: maior existente + posição');
  assert.equal(rank(ado.chamadas.patches.get(300)), undefined, 'sem --reordenar o StackRank de quem já existe fica');
  assert.equal(rank(ado.chamadas.patches.get(301)), undefined);
});

test('6a — --reordenar PERMUTA os slots atuais de cada nível: sem colidir com itens de fora; sem StackRank vai depois do maior', async () => {
  // O backlog do time: outras stories em 50, 200, 900 (fora deste arquivo). As deste arquivo estão em
  // 300 (S-A) e 100 (S-B); a S-C nunca teve StackRank. A ordem calculada é S-A, S-B, S-C.
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', changeMode: true, azureDevOps: { epicWorkItemId: 9 } },
    stories: [
      { id: 'S-A', name: 'A', executionOrder: 1, tasks: [
        { id: 'T-1', storyId: 'S-A', title: 'um', type: 'backend', executionOrder: 1 },
        { id: 'T-2', storyId: 'S-A', title: 'dois', type: 'backend', executionOrder: 2 },
      ] },
      { id: 'S-B', name: 'B', executionOrder: 2, tasks: [] },
      { id: 'S-C', name: 'C', executionOrder: 3, tasks: [] },
    ],
  };
  const ado = adoFalso({ maior: 900, ranks: { 300: 300, 301: 70, 302: 60, 310: 100 } });
  const { r } = await upsertDeMentira(doc, { 'S-A': 300, 'S-B': 310, 'S-C': 320, 'T-1': 301, 'T-2': 302 }, ado, { extra: { reordenar: true } });
  assert.deepEqual(r.errors, []);
  const rank = (id) => ado.chamadas.patches.get(id).find((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank')?.value;
  // Stories: os slots 100 e 300 trocam de dono; a S-C (sem StackRank) vai para depois do maior (900 + 3).
  assert.deepEqual([rank(300), rank(310), rank(320)], [100, 300, 903]);
  // Tasks: slots 60 e 70, na ordem calculada.
  assert.deepEqual([rank(301), rank(302)], [60, 70]);
  assert.equal(ado.chamadas.lotes >= 1, true, 'o StackRank atual dos itens reordenados é lido antes de permutar');
});

/**
 * `fetch` falso de um projeto do ADO para o modo _change: WIQL, leitura em lote, GET de tags e PATCH.
 * `rejeitaStackRank` = processo sem o campo (Scrum/herdado): o PATCH com ele volta TF51535 (400).
 */
function adoFalso({ rejeitaStackRank = false, ranks = {}, maior = null, tags = '' } = {}) {
  const chamadas = { patches: new Map(), recusas: 0, wiql: 0, lotes: 0 };
  const fetchFalso = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/_apis/wit/wiql')) {
      chamadas.wiql++;
      // Só a consulta do maior StackRank acha algo; a correlação por tag/título não acha (o id-map resolve).
      const doMaior = /ORDER BY \[Microsoft\.VSTS\.Common\.StackRank\] DESC/.test(JSON.parse(init.body).query);
      return new Response(JSON.stringify({ workItems: doMaior && maior != null ? [{ id: 9999 }] : [] }), { status: 200 });
    }
    const lote = u.match(/\/_apis\/wit\/workitems\?ids=([\d,]+)/);
    if (lote) {
      chamadas.lotes++;
      const todos = { ...ranks, ...(maior == null ? {} : { 9999: maior }) };
      const value = lote[1].split(',').map(Number).map((id) => ({ id, fields: id in todos ? { 'Microsoft.VSTS.Common.StackRank': todos[id] } : {} }));
      return new Response(JSON.stringify({ count: value.length, value }), { status: 200 });
    }
    const id = Number(u.match(/workitems\/(\d+)/)?.[1]);
    if (!init.method || init.method === 'GET') return new Response(JSON.stringify({ id, fields: { 'System.Tags': tags } }), { status: 200 });
    const patch = JSON.parse(init.body);
    if (rejeitaStackRank && patch.some((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank')) {
      chamadas.recusas++;
      return new Response(JSON.stringify({ message: 'TF51535: Cannot find field Microsoft.VSTS.Common.StackRank.' }), { status: 400 });
    }
    if (init.method === 'POST') {
      const novo = 7000 + chamadas.patches.size;
      chamadas.patches.set(novo, patch);
      return new Response(JSON.stringify({ id: novo }), { status: 200 });
    }
    chamadas.patches.set(id, patch);
    return new Response(JSON.stringify({ id }), { status: 200 });
  };
  return { chamadas, fetchFalso };
}

/** Roda o upsert (_change) com o ADO falso, o id-map dado e, opcionalmente, --reordenar. */
async function upsertDeMentira(doc, idMapa, ado, opts = {}) {
  const { createOrUpdateFullStructure } = await servico();
  const dir = mkdtempSync(join(tmpdir(), 'azure-upsert-'));
  const fetchOriginal = globalThis.fetch;
  const errOriginal = console.error;
  try {
    const idMap = join(dir, 'id-map.json');
    writeFileSync(idMap, JSON.stringify(idMapa));
    for (const [arq, conteudo] of Object.entries(opts.arquivos ?? {})) writeFileSync(join(dir, arq), JSON.stringify(conteudo));
    globalThis.fetch = ado.fetchFalso;
    console.error = () => {};
    const r = await createOrUpdateFullStructure(structuredClone(doc), { config: { ...CFG }, idMapPath: idMap, baseDir: dir, ...opts.extra });
    const lidos = Object.fromEntries(Object.keys(opts.ler ?? {}).map((arq) => [arq, existsSync(join(dir, arq)) ? JSON.parse(readFileSync(join(dir, arq), 'utf8')) : null]));
    return { r, lidos };
  } finally {
    globalThis.fetch = fetchOriginal;
    console.error = errOriginal;
    rmSync(dir, { recursive: true, force: true });
  }
}

test('6c — --reordenar num processo sem StackRank: o PATCH sai de novo sem o campo, avisa uma vez e a story e as tasks são atualizadas', async () => {
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', changeMode: true, azureDevOps: { epicWorkItemId: 9 } },
    stories: [{ id: 'S-1', name: 'Pedido', executionOrder: 1, tasks: [
      { id: 'T-1', storyId: 'S-1', title: 'Tabela', type: 'database', executionOrder: 1 },
      { id: 'T-2', storyId: 'S-1', title: 'API', type: 'backend', executionOrder: 2 },
    ] }],
  };
  const ado = adoFalso({ rejeitaStackRank: true });
  const { r } = await upsertDeMentira(doc, { 'S-1': 300, 'T-1': 301, 'T-2': 302 }, ado, { extra: { reordenar: true } });
  assert.deepEqual(r.errors.map((e) => e.phase), [], 'a story (ou uma task) deixou de ser atualizada');
  assert.deepEqual(r.updated.map((u) => u.jsonId), ['S-1', 'T-1', 'T-2']);
  assert.equal(ado.chamadas.recusas, 1, 'depois da primeira recusa o campo não vai mais');
  for (const id of [300, 301, 302]) {
    const patch = ado.chamadas.patches.get(id);
    assert.ok(patch.some((op) => op.path === '/fields/System.Title'), `o PATCH de ${id} não atualizou o conteúdo`);
    assert.ok(!patch.some((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank'));
  }
  assert.equal(r.warnings.filter((w) => /StackRank/.test(w)).length, 1);
});

const REGISTRO = 'ado-marcas-regra.json';
const PROJETO = `${CFG.org}/${CFG.project}`;

test('6.4/6e — upsert: a tag regra-de-negocio sai SÓ de item que a própria ferramenta marcou; tag manual fica; a caixa não importa', async () => {
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', changeMode: true, azureDevOps: { epicWorkItemId: 9 } },
    stories: [{ id: 'S-1', name: 'Pedido', executionOrder: 4, businessRuleHeavy: true, tasks: [
      { id: 'T-1', storyId: 'S-1', title: 'Cálculo', type: 'backend', executionOrder: 8, businessRuleHeavy: false },
      { id: 'T-2', storyId: 'S-1', title: 'Cupom', type: 'backend', executionOrder: 9, businessRuleHeavy: false },
    ] }],
  };
  // A ferramenta pôs a tag no T-1 numa publicação anterior; no T-2 quem pôs foi o time, à mão. O ADO
  // reaproveita a grafia da primeira tag criada no projeto — aqui, com maiúsculas.
  const registro = { versao: 1, projetos: { [PROJETO]: { 'T-1': { adoId: 301, tag: 'regra-de-negocio' } } } };
  const ado = adoFalso({ tags: 'manual-do-time; Regra-De-Negocio; logical-id:X' });
  const { r, lidos } = await upsertDeMentira(doc, { 'S-1': 300, 'T-1': 301, 'T-2': 302 }, ado,
    { arquivos: { [REGISTRO]: registro }, ler: { [REGISTRO]: true } });
  assert.deepEqual(r.errors, []);
  const tags = (id) => ado.chamadas.patches.get(id).find((op) => op.path === '/fields/System.Tags').value.split('; ');
  const regra = (id) => tags(id).filter((t) => t.toLowerCase() === 'regra-de-negocio');
  assert.deepEqual(regra(301), [], 'a tag que a ferramenta pôs ficou no item desmarcado');
  assert.ok(tags(301).includes('manual-do-time'), 'a tag manual do time sumiu');
  assert.deepEqual(regra(302), ['Regra-De-Negocio'], 'a tag manual do time saiu de um item que a ferramenta nunca marcou');
  assert.deepEqual(regra(300), ['Regra-De-Negocio'], 'a story marcada ganhou a mesma tag de novo, em outra caixa');
  assert.ok(!ado.chamadas.patches.get(300).some((op) => op.path === '/fields/Microsoft.VSTS.Common.StackRank'), 'StackRank mexido sem --reordenar');
  // O registro esquece o T-1; a S-1 não entra — a tag já estava lá, posta pelo time.
  assert.deepEqual(lidos[REGISTRO].projetos[PROJETO], {});
});

test('6e — a ferramenta registra o que ela mesma marcou: na criação e na atualização que pôs a tag', async () => {
  const { ordenarBacklog } = await ordemTasks();
  const { marcar } = await marcaTasks();
  const dir = mkdtempSync(join(tmpdir(), 'azure-marcas-'));
  try {
    // Publicação normal: T-API é a única marcada.
    const doc = marcar(ordenarBacklog(backlogOnda6()).doc).doc;
    const { criados } = await publicarDeMentira(doc, {}, { opts: { baseDir: dir } });
    const tApi = criados.find((c) => c.titulo.startsWith('T-API:'));
    assert.deepEqual(JSON.parse(readFileSync(join(dir, REGISTRO), 'utf8')).projetos[PROJETO], { 'T-API': { adoId: tApi.id, tag: 'regra-de-negocio' } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // _change: S-1 já existe sem a tag e agora é marcada; T-NOVA nasce marcada.
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', changeMode: true, azureDevOps: { epicWorkItemId: 9 } },
    stories: [{ id: 'S-1', name: 'Pedido', executionOrder: 1, businessRuleHeavy: true, tasks: [
      { id: 'T-NOVA', storyId: 'S-1', title: 'Desconto', type: 'backend', executionOrder: 1, businessRuleHeavy: true },
    ] }],
  };
  const ado = adoFalso({ tags: 'manual-do-time' });
  const { r, lidos } = await upsertDeMentira(doc, { 'S-1': 300 }, ado, { ler: { [REGISTRO]: true } });
  assert.deepEqual(r.errors, []);
  const nova = r.created.find((c) => c.jsonId === 'T-NOVA');
  assert.deepEqual(lidos[REGISTRO].projetos[PROJETO], {
    'S-1': { adoId: 300, tag: 'regra-de-negocio' }, 'T-NOVA': { adoId: nova.adoId, tag: 'regra-de-negocio' },
  });
});

test('6.4/6a/6e — o dry-run do _change: a tag só sai do que a ferramenta marcou; StackRank «maior existente + N» e, com --reordenar, permuta', async () => {
  const { buildPublishPlan, formatPublishPlan } = await plano();
  const doc = { metadata: { changeMode: true, azureDevOps: { epicWorkItemId: 9 } },
    stories: [
      { id: 'S-1', name: 'Pedido', executionOrder: 2, businessRuleHeavy: false, dependencies: ['S-0'], tasks: [] },
      { id: 'S-2', name: 'Tela', executionOrder: 3, businessRuleHeavy: false, tasks: [] },
    ] };
  const marcas = { versao: 1, projetos: { 'org/proj': { 'S-1': { adoId: 300, tag: 'regra-de-negocio' } } } };
  const p = buildPublishPlan(doc, { changeMode: true, reordenar: true, env: {}, marcas, projeto: 'org/proj' });
  const [s1, s2] = ['S-1', 'S-2'].map((id) => p.itens.find((i) => i.id === id));
  assert.deepEqual(s1.tagsRemovidasNaAtualizacao, ['regra-de-negocio']);
  assert.equal(s2.tagsRemovidasNaAtualizacao, undefined, 'tag que a ferramenta não pôs não sai');
  assert.equal(s1.stackRankSoma, 2);
  assert.deepEqual(s1.stackRankNaAtualizacao, { regra: 'permuta', posicao: 2 });
  assert.deepEqual(s1.dependencias, [{ tipo: 'Predecessora', para: 'S-0', nota: 'fora deste arquivo' }]);
  const txt = formatPublishPlan(p);
  assert.match(txt, /maior StackRank já existente no projeto/);
  assert.match(txt, /só sai de item em que a própria ferramenta a pôs/);
  assert.match(txt, /depois de S-0 · sai a tag regra-de-negocio · StackRank: maior existente \+ 2 se for criado; se já existir, permuta entre os slots atuais/);
  // Sem --reordenar não há permuta; no modo normal, só «maior existente + N».
  assert.equal(buildPublishPlan(doc, { changeMode: true, env: {} }).itens[0].stackRankNaAtualizacao, undefined);
  const normal = buildPublishPlan({ ...doc, metadata: { azureDevOps: { epicWorkItemId: 9 } } }, { env: {} });
  assert.match(formatPublishPlan(normal), /S-1: Pedido · pai 9 · depois de S-0 · StackRank maior existente \+ 2\n/);
  // Pela CLI: o registro é lido ao lado do tasks.json.
  const dir = mkdtempSync(join(tmpdir(), 'azure-dry-'));
  try {
    writeFileSync(join(dir, 'tasks.json'), JSON.stringify({ ...doc, metadata: { ...doc.metadata, schemaVersion: 'tasks/v5.3' } }));
    writeFileSync(join(dir, REGISTRO), JSON.stringify(marcas));
    const env = { ...envSemAdo(), AZURE_DEVOPS_ORG: 'org', AZURE_DEVOPS_PROJECT: 'proj', AZURE_DEVOPS_SKIP_SELFSUFFICIENCY_GATE: '1' };
    const r = spawnSync(process.execPath, [CLI, '-i', join(dir, 'tasks.json'), '--dry-run', '--change'], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(out.itens.find((i) => i.id === 'S-1').tagsRemovidasNaAtualizacao, ['regra-de-negocio']);
    assert.equal(out.itens.find((i) => i.id === 'S-2').tagsRemovidasNaAtualizacao, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
