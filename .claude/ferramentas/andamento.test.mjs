// Harness Elo v2 — andamento.mjs (defeitos D48 e D49 do teste ponta a ponta de 2026-10-21).
//
// D48: a `spec-implement` implementou a TASK-003-001, que depende da TASK-001-001 (ainda PENDING) e
// vem depois da story transversal de segurança (`mustImplementFirst`), sem aviso nenhum; e, terminada
// a task, o `tasks.json` continuou dizendo `status: "PENDING"` — só o `spec_story.md` sabia. Aqui o
// cenário do teste é remontado: o `conferir` tem de mandar perguntar, e o `concluir` tem de gravar o
// status que faz a próxima task passar — e só com o G3 aprovado.
//
// D49: nada mandava criar `outputs/spec/em-andamento.md`, e a `auditoria-de-us` tem FATAL para
// apagá-lo. O `abrir-us` cria o marcador a partir de `.claude/templates/em-andamento.md`, no caminho
// que o `delivery-gate` e o `estado` leem (`MARCADOR_US`), na raiz de artefatos do workspace.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { conferir, concluir, abrirUs, codigoDeSaida, STATUS_CONCLUIDA } from './andamento.mjs';
import { MARCADOR_US } from '../hooks/kit.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(AQUI, 'andamento.mjs');
// Caminho do repositório escrito INTEIRO, numa string só: é a forma que o `gerar-kiro.mjs` e o
// `gerar-cursor.mjs` reescrevem certo (`.claude/rules/harness/deliver.md` vira a rule de fase de cada
// saída); um `join(RAIZ, '.claude', 'rules', ...)` em pedaços viraria um caminho que lá não existe.
const doRepo = (rel) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

/** O recorte do backlog do teste ponta a ponta que expôs o D48. */
function backlog() {
  return {
    metadata: { schemaVersion: 'tasks/v5.3' },
    stories: [
      {
        id: 'STORY-SEC-TRANSVERSAL', mustImplementFirst: true, executionOrder: 1,
        tasks: [
          { id: 'SEC-001', class: 'security', executionOrder: 1 },
          { id: 'SEC-005', class: 'security', executionOrder: 2 },
        ],
      },
      {
        id: 'STORY-001', executionOrder: 2,
        tasks: [{ id: 'TASK-001-001', class: 'functional', status: 'PENDING', executionOrder: 3 }],
      },
      {
        id: 'STORY-003', executionOrder: 3,
        tasks: [
          { id: 'TASK-003-001', class: 'functional', status: 'PENDING', executionOrder: 4, dependencies: ['TASK-001-001'] },
          { id: 'TASK-003-002', class: 'functional', status: 'PENDING', executionOrder: 5, dependencies: ['TASK-003-001'] },
        ],
      },
      {
        id: 'STORY-007', executionOrder: 4, dependencies: ['STORY-001'],
        tasks: [{ id: 'TASK-007-001', class: 'spike', status: 'PENDING', executionOrder: 6 }],
      },
    ],
  };
}

function projeto(fn, { doc = backlog(), texto = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'andamento-'));
  try {
    mkdirSync(join(dir, 'outputs', 'spec', 'auditorias'), { recursive: true });
    writeFileSync(join(dir, 'outputs', 'spec', 'tasks.json'), texto ?? `${JSON.stringify(doc, null, 2)}\n`);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const tasksJson = (dir) => join(dir, 'outputs', 'spec', 'tasks.json');
const lerTasks = (dir) => JSON.parse(readFileSync(tasksJson(dir), 'utf8'));
const statusDe = (doc, id) => doc.stories.flatMap((s) => s.tasks).find((t) => t.id === id).status;

/** O relatório que o `validar.mjs` grava no fim do G3. */
function relatorioG3(dir, task, veredito = 'APROVADO', extra = {}) {
  writeFileSync(
    join(dir, 'outputs', 'spec', 'auditorias', `${task}.validacao.json`),
    JSON.stringify({ task, veredito, modo: 'sem-agentes', ...extra }),
  );
}

// ————————————————————————————— D48 (a) — conferir antes de começar —————————————————————————————

test('D48 — a TASK-003-001 do teste ponta a ponta manda perguntar: dependência PENDING e story mustImplementFirst aberta', () => {
  projeto((dir) => {
    const r = conferir({ task: 'TASK-003-001' }, dir);
    assert.equal(r.acao, 'perguntar');
    assert.equal(codigoDeSaida(r), 1);
    assert.equal(r.story, 'STORY-003');
    const dep = r.pendentes.find((p) => p.tipo === 'dependencia');
    assert.deepEqual(dep, { id: 'TASK-001-001', tipo: 'dependencia', status: 'PENDING' });
    const primeiro = r.pendentes.find((p) => p.tipo === 'mustImplementFirst');
    assert.deepEqual(primeiro, { id: 'STORY-SEC-TRANSVERSAL', tipo: 'mustImplementFirst', naoConcluidas: ['SEC-001', 'SEC-005'] });
    assert.match(r.mensagem, /TASK-001-001/);
    assert.match(r.mensagem, /STORY-SEC-TRANSVERSAL/);
  });
});

test('D48 — com tudo concluído antes dela, a task segue (exit 0) e status ausente conta como aberto', () => {
  const doc = backlog();
  for (const s of doc.stories.slice(0, 2)) for (const t of s.tasks) t.status = STATUS_CONCLUIDA;
  projeto((dir) => {
    const r = conferir({ task: 'TASK-003-001' }, dir);
    assert.equal(r.acao, 'seguir');
    assert.equal(codigoDeSaida(r), 0);
    assert.deepEqual(r.pendentes, []);
    assert.equal(r.antesNaOrdem, null);
  }, { doc });
  // A outra ponta: a SEC sem `status` (como o `inject-sec.mjs` as grava) não está concluída.
  delete doc.stories[0].tasks[1].status;
  projeto((dir) => {
    const r = conferir({ task: 'TASK-003-001' }, dir);
    assert.equal(r.acao, 'perguntar');
    assert.deepEqual(r.pendentes, [{ id: 'STORY-SEC-TRANSVERSAL', tipo: 'mustImplementFirst', naoConcluidas: ['SEC-005'] }]);
  }, { doc });
});

test('D48 — a task de dentro da story mustImplementFirst não é barrada pela própria story', () => {
  projeto((dir) => {
    const r = conferir({ task: 'SEC-005' }, dir);
    assert.equal(r.acao, 'seguir');
    assert.deepEqual(r.antesNaOrdem, { total: 1, ids: ['SEC-001'] }, 'a anterior na ordem vira aviso, não pergunta');
  });
});

test('D48 — dependência que não existe no backlog e dependência da story também mandam perguntar', () => {
  const doc = backlog();
  doc.stories[2].tasks[0].dependencies = ['TASK-999'];
  for (const t of doc.stories[0].tasks) t.status = 'DONE';
  projeto((dir) => {
    const r = conferir({ task: 'TASK-003-001' }, dir);
    assert.deepEqual(r.pendentes, [{ id: 'TASK-999', tipo: 'dependencia', status: null, situacao: 'não encontrada no tasks.json' }]);
    const s = conferir({ task: 'TASK-007-001' }, dir);
    assert.deepEqual(s.pendentes, [{ id: 'STORY-001', tipo: 'dependencia', nivel: 'story', naoConcluidas: ['TASK-001-001'] }]);
  }, { doc });
});

test('D48 — dependência declarada na feature ou no epic acima da task, e o apelido dependsOn, também prendem', () => {
  // A mesma ligação do `order-backlog.mjs`: story → feature (`featureId`) → epic (`epicId`).
  const doc = {
    epics: [{ id: 'EPIC-1' }, { id: 'EPIC-2', dependsOn: ['EPIC-1'] }],
    features: [{ id: 'FEAT-1', epicId: 'EPIC-1' }, { id: 'FEAT-2', epicId: 'EPIC-2', dependencies: ['FEAT-1'] }],
    stories: [
      { id: 'STORY-A', featureId: 'FEAT-1', tasks: [{ id: 'TASK-A', status: 'PENDING' }] },
      { id: 'STORY-B', featureId: 'FEAT-2', tasks: [{ id: 'TASK-B', status: 'PENDING' }] },
    ],
  };
  projeto((dir) => {
    const r = conferir({ task: 'TASK-B' }, dir);
    assert.deepEqual(r.pendentes, [
      { id: 'FEAT-1', tipo: 'dependencia', nivel: 'feature', naoConcluidas: ['TASK-A'] },
      { id: 'EPIC-1', tipo: 'dependencia', nivel: 'epic', naoConcluidas: ['TASK-A'] },
    ]);
    assert.equal(conferir({ task: 'TASK-A' }, dir).acao, 'seguir');
  }, { doc });
  doc.stories[0].tasks[0].status = 'DONE';
  projeto((dir) => assert.equal(conferir({ task: 'TASK-B' }, dir).acao, 'seguir'), { doc });
});

test('D48 — task já concluída manda perguntar antes de refazer', () => {
  const doc = backlog();
  for (const s of doc.stories.slice(0, 2)) for (const t of s.tasks) t.status = 'DONE';
  doc.stories[2].tasks[0].status = 'DONE';
  projeto((dir) => {
    const r = conferir({ task: 'TASK-003-001' }, dir);
    assert.equal(r.acao, 'perguntar');
    assert.deepEqual(r.pendentes, [{ id: 'TASK-003-001', tipo: 'ja-concluida', status: 'DONE' }]);
  }, { doc });
});

test('D48 — task que não está no tasks.json é erro de uso (exit 2), não "seguir"', () => {
  projeto((dir) => {
    assert.throws(() => conferir({ task: 'TASK-404' }, dir), /TASK-404/);
    const cli = spawnSync(process.execPath, [SCRIPT, 'conferir', '--task', 'TASK-404'], { cwd: dir, encoding: 'utf8' });
    assert.equal(cli.status, 2);
    assert.match(cli.stderr, /TASK-404/);
  });
});

// ————————————————————————————— D48 (b) — concluir depois do G3 —————————————————————————————

test('D48 — concluir grava DONE com o G3 aprovado, e a próxima task passa a seguir', () => {
  const doc = backlog();
  for (const s of doc.stories.slice(0, 2)) for (const t of s.tasks) t.status = 'DONE';
  projeto((dir) => {
    // RED do defeito: antes de concluir, a dependente manda perguntar.
    assert.equal(conferir({ task: 'TASK-003-002' }, dir).acao, 'perguntar');
    relatorioG3(dir, 'TASK-003-001');
    const r = concluir({ task: 'TASK-003-001' }, dir);
    assert.equal(r.acao, 'concluida');
    assert.equal(codigoDeSaida(r), 0);
    assert.equal(r.anterior, 'PENDING');
    assert.equal(r.status, 'DONE');
    assert.deepEqual(r.g3, { veredito: 'APROVADO', modo: 'sem-agentes' });
    assert.equal(statusDe(lerTasks(dir), 'TASK-003-001'), 'DONE');
    // GREEN: a dependente agora segue.
    assert.equal(conferir({ task: 'TASK-003-002' }, dir).acao, 'seguir');
    // Rodar de novo não regrava nada.
    const antes = readFileSync(tasksJson(dir), 'utf8');
    assert.equal(concluir({ task: 'TASK-003-001' }, dir).acao, 'ja-concluida');
    assert.equal(readFileSync(tasksJson(dir), 'utf8'), antes);
  }, { doc });
});

test('D48 — concluir recusa sem G3 aprovado e não toca no arquivo (exit 1)', () => {
  projeto((dir) => {
    const antes = readFileSync(tasksJson(dir), 'utf8');
    const semRelatorio = concluir({ task: 'TASK-003-001' }, dir);
    assert.equal(semRelatorio.acao, 'recusar');
    assert.equal(codigoDeSaida(semRelatorio), 1);
    assert.match(semRelatorio.motivo, /validar\.mjs/);

    relatorioG3(dir, 'TASK-003-001', 'PARADO');
    assert.equal(concluir({ task: 'TASK-003-001' }, dir).acao, 'recusar');

    relatorioG3(dir, 'TASK-003-001', 'EM_ANDAMENTO');
    assert.equal(concluir({ task: 'TASK-003-001' }, dir).acao, 'recusar');

    // O relatório de outra task, copiado com o nome desta, não serve.
    relatorioG3(dir, 'TASK-003-001', 'APROVADO', { task: 'TASK-001-001' });
    assert.match(concluir({ task: 'TASK-003-001' }, dir).motivo, /TASK-001-001/);

    assert.equal(readFileSync(tasksJson(dir), 'utf8'), antes, 'recusa não grava nada');
    const cli = spawnSync(process.execPath, [SCRIPT, 'concluir', '--task', 'TASK-003-001'], { cwd: dir, encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.equal(JSON.parse(cli.stdout).acao, 'recusar');
  });
});

test('D48 — spike conclui sem G3: a entrega dela é uma decisão, não código', () => {
  projeto((dir) => {
    const r = concluir({ task: 'TASK-007-001' }, dir);
    assert.equal(r.acao, 'concluida');
    assert.deepEqual(r.g3, { dispensado: 'spike' });
    assert.equal(statusDe(lerTasks(dir), 'TASK-007-001'), 'DONE');
  });
});

test('D48 — concluir só muda o status: indentação, fim de linha e o resto do arquivo ficam', () => {
  const doc = backlog();
  const texto = `${JSON.stringify(doc, null, 4).replace(/\n/g, '\r\n')}\r\n`;
  projeto((dir) => {
    relatorioG3(dir, 'TASK-003-001');
    concluir({ task: 'TASK-003-001' }, dir);
    const depois = readFileSync(tasksJson(dir), 'utf8');
    const esperado = JSON.parse(texto);
    esperado.stories[2].tasks[0].status = 'DONE';
    assert.equal(depois, `${JSON.stringify(esperado, null, 4).replace(/\n/g, '\r\n')}\r\n`);
  }, { texto });
});

test('D48 — --tasks e --relatorio apontam para fora do padrão', () => {
  projeto((dir) => {
    mkdirSync(join(dir, 'outro'));
    writeFileSync(join(dir, 'outro', 'backlog.json'), JSON.stringify(backlog(), null, 2));
    writeFileSync(join(dir, 'outro', 'g3.json'), JSON.stringify({ task: 'TASK-003-001', veredito: 'APROVADO', modo: 'com-agentes' }));
    const r = concluir({ task: 'TASK-003-001', tasks: 'outro/backlog.json', relatorio: 'outro/g3.json' }, dir);
    assert.equal(r.acao, 'concluida');
    assert.equal(statusDe(JSON.parse(readFileSync(join(dir, 'outro', 'backlog.json'), 'utf8')), 'TASK-003-001'), 'DONE');
    assert.equal(statusDe(lerTasks(dir), 'TASK-003-001'), 'PENDING', 'o padrão não foi tocado');
  });
});

// ————————————————————————————— D49 — abrir a US cria o marcador —————————————————————————————

/** O mesmo leitor de campo do `estado.mjs` (`campo`), para provar que o marcador criado é legível. */
const campo = (texto, chave) => {
  const m = String(texto).match(new RegExp(`^\\s*${chave}\\s*:\\s*(.+?)\\s*$`, 'im'));
  return m ? m[1] : null;
};

test('D49 — abrir-us cria o marcador no MARCADOR_US, a partir do template, sem placeholder sobrando', () => {
  projeto((dir) => {
    const r = abrirUs({ us: 'STORY-003', repositorios: 'portal-pedidos-api, portal-pedidos-web', task: 'TASK-003-001' }, dir);
    assert.equal(r.acao, 'criado');
    assert.equal(codigoDeSaida(r), 0);
    assert.equal(r.marcador, MARCADOR_US);
    const texto = readFileSync(join(dir, MARCADOR_US), 'utf8');
    assert.equal(campo(texto, 'us'), 'STORY-003');
    assert.equal(campo(texto, 'repositorios'), 'portal-pedidos-api, portal-pedidos-web');
    assert.equal(campo(texto, 'proximo-passo'), 'implementar TASK-003-001');
    assert.equal(campo(texto, 'bloqueios'), 'nenhum');
    const semComentarios = texto.replace(/<!--[\s\S]*?-->/g, '');
    assert.deepEqual(semComentarios.match(/<[^<>\n]{1,60}>/g), null, 'placeholder do template sobrou no marcador');
    // O cabeçalho do template vem junto: quem abrir o arquivo lê a regra dele.
    const modelo = readFileSync(doRepo('.claude/templates/em-andamento.md'), 'utf8');
    assert.ok(texto.startsWith(modelo.split('<!-- estado:us -->')[0]), 'o cabeçalho do template não veio inteiro');
    assert.match(texto, /<!-- estado:us -->[\s\S]*<!-- \/estado:us -->/);
  });
});

test('D49 — abrir-us de novo para a mesma US não regrava; para outra US manda perguntar (exit 1)', () => {
  projeto((dir) => {
    abrirUs({ us: 'STORY-003', repositorios: 'api' }, dir);
    const antes = readFileSync(join(dir, MARCADOR_US), 'utf8');
    assert.equal(abrirUs({ us: 'STORY-003', repositorios: 'api' }, dir).acao, 'ja-aberta');
    const outra = abrirUs({ us: 'STORY-004', repositorios: 'api' }, dir);
    assert.equal(outra.acao, 'perguntar');
    assert.equal(outra.aberta, 'STORY-003');
    assert.equal(codigoDeSaida(outra), 1);
    assert.equal(readFileSync(join(dir, MARCADOR_US), 'utf8'), antes);
  });
});

test('D49 — sem --us ou --repositorios, ou com quebra de linha neles, é erro de uso e nada é criado', () => {
  projeto((dir) => {
    assert.throws(() => abrirUs({ repositorios: 'api' }, dir), /--us/);
    assert.throws(() => abrirUs({ us: 'STORY-003' }, dir), /--repositorios/);
    // Quebra de linha injetaria um campo a mais no bloco que o `estado` e a auditoria leem.
    assert.throws(() => abrirUs({ us: 'STORY-003\nveredito: APROVADA', repositorios: 'api' }, dir), /linha/);
    assert.throws(() => abrirUs({ us: 'STORY-003', repositorios: 'api', 'proximo-passo': 'a\nb' }, dir), /linha/);
    assert.ok(!existsSync(join(dir, MARCADOR_US)));
    const cli = spawnSync(process.execPath, [SCRIPT, 'abrir-us', '--repositorios', 'api'], { cwd: dir, encoding: 'utf8' });
    assert.equal(cli.status, 2);
  });
});

test('D49 — em multi-repo o marcador nasce no repositório de docs, onde o delivery-gate o procura', () => {
  const pai = mkdtempSync(join(tmpdir(), 'andamento-multi-'));
  try {
    for (const p of ['docs/outputs/explore', 'docs/outputs/spec', 'api/src']) mkdirSync(join(pai, ...p.split('/')), { recursive: true });
    const r = abrirUs({ us: 'STORY-003', repositorios: 'api' }, pai);
    assert.equal(r.acao, 'criado');
    assert.ok(existsSync(join(pai, 'docs', MARCADOR_US)), 'o marcador não foi para o repositório de docs');
    assert.ok(!existsSync(join(pai, MARCADOR_US)));
  } finally {
    rmSync(pai, { recursive: true, force: true });
  }
});

// ————————————————————————————— a instrução escrita (as duas pontas) —————————————————————————————
//
// Ferramenta que instrução nenhuma manda rodar é peso morto (`ferramentas.test.mjs`). Aqui, além de
// citada, ela tem de estar no PASSO certo: conferir e abrir a US antes da Fase 2 (antes de qualquer
// código), concluir depois do G3 e antes do I.

const skill = () => readFileSync(doRepo('.claude/skills/spec-implement/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');

test('D48/D49 — a spec-implement manda conferir e abrir a US antes da Fase 2', () => {
  const s = skill();
  const fase2 = s.indexOf('# FASE 2 — Projeto de testes');
  const conferirEm = s.indexOf('node .claude/ferramentas/andamento.mjs conferir');
  const abrirEm = s.indexOf('node .claude/ferramentas/andamento.mjs abrir-us');
  assert.ok(conferirEm > 0 && conferirEm < fase2, 'o conferir tem de vir antes da Fase 2');
  assert.ok(abrirEm > 0 && abrirEm < fase2, 'o abrir-us tem de vir antes da Fase 2');
  assert.match(s, /\.claude\/templates\/em-andamento\.md/);
  for (const codigo of ['DEPENDENCIES_CHECKED', 'US_MARKER_OPEN', 'TASK_STATUS_RECORDED', 'DEPENDENCY_PENDING']) {
    assert.ok(s.includes(`| \`${codigo}\` |`), `${codigo} no quadro de validadores`);
  }
});

test('D48 — a spec-implement manda concluir depois do G3 e antes do I', () => {
  const s = skill();
  const g3 = s.indexOf('## G3 — Validação independente');
  const i = s.indexOf('## I — Update spec_story.md');
  const concluirEm = s.indexOf('node .claude/ferramentas/andamento.mjs concluir', g3);
  assert.ok(g3 > 0 && concluirEm > g3 && concluirEm < i, 'o concluir tem de vir depois do G3 e antes do I');
});

test('D49 — a rule do Deliver e o template dizem quem cria o marcador', () => {
  const deliver = readFileSync(doRepo('.claude/rules/harness/deliver.md'), 'utf8');
  assert.match(deliver, /andamento\.mjs abrir-us/);
  assert.match(deliver, /andamento\.mjs concluir/);
  const modelo = readFileSync(doRepo('.claude/templates/em-andamento.md'), 'utf8');
  assert.match(modelo, /spec-implement/, 'o template não diz quem o cria');
  assert.match(modelo, /andamento\.mjs abrir-us/);
});
