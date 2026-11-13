// Harness Elo v2 — inject-sec.mjs da spec-security-review (plano de melhoria das skills, Onda 3,
// item 3.5).
//
// O Passo E era a IA reescrevendo à mão o tasks.json inteiro para acrescentar tasks SEC. O script faz
// a junção: aqui, com o exemplo de hierarquia e a task SEC de exemplo do próprio kit — injeção no
// início da story, metadata.securityReview, backup e validador; cada recusa (forma, story
// inexistente, ID repetido, reinjeção silenciosa, FATAL do validador na task SEC); --reprocessar
// substitui; --simular não escreve; story transversal; e o SKILL.md chamando o script.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-security-review');
const SCRIPT = join(SKILL, 'scripts', 'inject-sec.mjs');
const TPL = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'templates');
const BACKLOG = join(TPL, 'tasks.hierarchy-example.json');
const SEC = JSON.parse(readFileSync(join(TPL, 'tasks.sec-task-example.json'), 'utf8'));
const STORY = JSON.parse(readFileSync(BACKLOG, 'utf8')).stories[0].id;
const mod = () => import(pathToFileURL(SCRIPT).href);

const sec = (over = {}) => ({ ...structuredClone(SEC), storyId: STORY, ...over });

function cenario(tasksSec, args = [], antes = null) {
  const dir = mkdtempSync(join(tmpdir(), 'inject-sec-'));
  try {
    const t = join(dir, 'tasks.json');
    copyFileSync(BACKLOG, t);
    if (antes) writeFileSync(t, JSON.stringify(antes(JSON.parse(readFileSync(t, 'utf8')))));
    const original = readFileSync(t, 'utf8');
    writeFileSync(join(dir, 'sec.json'), JSON.stringify(tasksSec));
    const r = spawnSync(process.execPath, [SCRIPT, t, join(dir, 'sec.json'), ...args, '--json'], { encoding: 'utf8' });
    return {
      status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr,
      doc: JSON.parse(readFileSync(t, 'utf8')), original, bak: existsSync(`${t}.bak`), tmp: existsSync(`${t}.tmp`),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('3.5 — injeta no início da story, grava metadata.securityReview e guarda backup', () => {
  const r = cenario([sec()]);
  assert.equal(r.status, 0, r.err || JSON.stringify(r.out));
  const story = r.doc.stories.find((s) => s.id === STORY);
  assert.equal(story.tasks[0].id, 'SEC-001', 'a task SEC entra antes das funcionais (E.2)');
  assert.equal(story.tasks[0]._comment, undefined, 'o comentário do exemplo não vai para o backlog');
  const meta = r.doc.metadata.securityReview;
  assert.equal(meta.tasksInjected, 1);
  assert.equal(meta.findingsHigh, 1);
  assert.match(meta.skillVersion, /^\d+\.\d+$/, 'a versão vem do frontmatter da skill');
  assert.ok(r.bak, 'sem tasks.json.bak');
  assert.ok(!r.tmp, 'o .tmp tem que sumir depois da troca');
  assert.equal(r.out.validador, 'ok');
});

test('3.5 — recusas: forma (SEC_TASK_SHAPE_COMPLETE), story inexistente e ID repetido — nada é escrito', () => {
  const ruim = sec({ id: 'SEC-002', type: 'task', class: 'functional', effortEstimate: 'M', durationEstimatedDays: 3,
    acceptanceCriteria: [{ id: 'AC', statement: 'só um' }], tddTests: { red: 'x' } });
  ruim.agentExecutionContext = { ...ruim.agentExecutionContext, selfContainedSummary: 'curto' };
  ruim.security = { ...ruim.security, mustCompleteBeforeStoryClose: false };
  const r = cenario([ruim, sec({ id: 'SEC-003', storyId: 'STORY-QUE-NAO-EXISTE' }), sec(), sec()]);
  assert.equal(r.status, 1);
  assert.equal(r.doc.stories.find((s) => s.id === STORY).tasks[0].id === 'SEC-001', false);
  assert.equal(JSON.stringify(r.doc), JSON.stringify(JSON.parse(r.original)), 'o tasks.json mudou numa recusa');
  assert.ok(!r.bak);
  const m = r.out.achados.map((a) => a.mensagem).join('\n');
  for (const trecho of ['`type` tem que ser o tipo real', '`class` não é "security"', 'selfContainedSummary` com 5 caracteres',
    '1 `acceptanceCriteria`', '`tddTests.red` e `tddTests.green`', 'mustCompleteBeforeStoryClose` tem que ser true',
    'não bate com o esforço M (= 1 dia)', 'story `STORY-QUE-NAO-EXISTE` não existe', 'SEC-001: repetida na entrada']) {
    assert.ok(m.includes(trecho), `faltou: ${trecho}\n${m}`);
  }
});

test('3.5 — backlog já revisado: recusa sem --reprocessar; com ele, substitui sem duplicar', () => {
  const jaRevisado = (d) => {
    d.stories.find((s) => s.id === STORY).tasks.unshift({ ...sec(), title: 'versão antiga' });
    d.metadata = { ...d.metadata, securityReview: { reviewedAt: '2026-01-01T00:00:00Z', tasksInjected: 1 } };
    return d;
  };
  const recusa = cenario([sec()], [], jaRevisado);
  assert.equal(recusa.status, 1);
  assert.equal(recusa.out.achados[0].code, 'NO_SILENT_REINJECTION');
  const ok = cenario([sec()], ['--reprocessar'], jaRevisado);
  assert.equal(ok.status, 0, ok.err || JSON.stringify(ok.out));
  const tasks = ok.doc.stories.find((s) => s.id === STORY).tasks;
  assert.equal(tasks.filter((t) => t.id === 'SEC-001').length, 1, 'duplicou a task SEC');
  assert.notEqual(tasks[0].title, 'versão antiga');
  assert.equal(ok.out.injetadas[0].substituiu, true);
});

test('3.5 — --simular confere e não escreve', () => {
  const r = cenario([sec()], ['--simular']);
  assert.equal(r.status, 0);
  assert.match(r.out.resumo, /simulação — nada escrito/);
  assert.equal(JSON.stringify(r.doc), JSON.stringify(JSON.parse(r.original)));
  assert.ok(!r.bak && !r.tmp);
});

test('3.5 — FATAL do validador de auto-suficiência na task SEC recusa a escrita', () => {
  // Forma ok para o E.1, mas o sumário cita um documento externo — o validador da spec-tasks recusa.
  const t = sec();
  t.agentExecutionContext.selfContainedSummary += ' Ver detalhes em requirements.md e no api-contracts.yaml antes de implementar.';
  const r = cenario([t]);
  assert.equal(r.status, 1, JSON.stringify(r.out));
  assert.match(r.out.resumo, /validador de auto-suficiência/);
  assert.ok(r.out.achados.every((a) => a.task === 'SEC-001'));
  assert.ok(!r.bak && !r.tmp);
});

test('3.5 — story transversal entra em stories[] e recebe as tasks SEC dela', async () => {
  const { injetar } = await mod();
  const doc = JSON.parse(readFileSync(BACKLOG, 'utf8'));
  const transversal = { id: 'STORY-SEC-TRANSVERSAL', name: 'Controles transversais', tasks: [] };
  const r = injetar(doc, [sec({ id: 'SEC-010', storyId: 'STORY-SEC-TRANSVERSAL' })], { transversal, versaoSkill: '9.9' });
  assert.deepEqual(r.achados, []);
  const s = r.doc.stories.find((x) => x.id === 'STORY-SEC-TRANSVERSAL');
  assert.deepEqual(s.tasks.map((t) => t.id), ['SEC-010']);
  assert.equal(doc.stories.some((x) => x.id === 'STORY-SEC-TRANSVERSAL'), false, 'injetar() não pode mutar a entrada');
});

test('3.5 — entrada não aplicável é exit 2', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'nao-existe.json', 'nem.json'], { encoding: 'utf8' }).status, 2);
  const r = cenario([]);
  assert.equal(r.status, 2);
});

test('3.5 — o Passo E da spec-security-review usa o script, e o manual fica como degradação', () => {
  const t = readFileSync(join(SKILL, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const passoE = t.slice(t.indexOf('## Passo E'), t.indexOf('## Passo F'));
  assert.match(passoE, /node <dir-desta-skill>\/scripts\/inject-sec\.mjs outputs\/spec\/tasks\.json/);
  assert.match(passoE, /TOOL_UNAVAILABLE:inject-sec/);
  assert.match(t, /^\| `INJECT_SCRIPT_USED` \|[^\n]*\| WARNING \|$/m);
});

test('Decisão 68 — --kernel: o SEC do Catálogo que pede task tem de virar task, senão recusa', async () => {
  const { secDoKernel } = await mod();
  const kernel = [
    '# Plano de segurança', '', '## Catálogo SEC', '',
    '### SEC-001 — Filtrar pedido pelo dono', '| Campo | Valor |', '|---|---|', '| Status | ABERTO |', '',
    '### SEC-002 — TLS', '| Campo | Valor |', '|---|---|', '| Status | COBERTO |', '',
    '### SEC-003 — Rate limit no login', '| Status | ADIADO |', '',
    '### SEC-004 — Trava de tentativas', '| Severidade | ALTO |', '| Status | ABERTO |', '',
    '## Mapa de aplicabilidade', '| SEC-009 | MOD-X |',
  ].join('\n');
  // SEC-001 sem severidade lida conta como obrigatória; COBERTO e ADIADO ficam fora; o SEC-009 do
  // mapa não é do catálogo.
  assert.deepEqual(secDoKernel(kernel), ['SEC-001', 'SEC-004']);
  const dir = mkdtempSync(join(tmpdir(), 'inject-kernel-'));
  try {
    writeFileSync(join(dir, 'kernel.md'), kernel);
    const falta = cenario([sec()], ['--kernel', join(dir, 'kernel.md')]);
    assert.equal(falta.status, 1);
    assert.deepEqual(falta.out.achados.map((a) => `${a.code} ${a.task}`), ['KERNEL_CONSUMED SEC-004']);
    assert.ok(!falta.bak, 'recusa não escreve');
    const completo = cenario([sec(), sec({ id: 'SEC-004' })], ['--kernel', join(dir, 'kernel.md')]);
    assert.equal(completo.status, 0, JSON.stringify(completo.out));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————— 7a — leitura do Catálogo SEC do kernel —————————————————————————

const TEMPLATE_KERNEL = join(RAIZ, '.claude', 'skills', 'revisao-de-seguranca', 'templates', 'plano-de-seguranca.template.md');

/** Um SEC no formato do template do kernel: `### SEC-NNN — título` e a tabela Campo | Valor. */
const blocoSec = (id, severidade, status) => [
  `### ${id} — controle ${id}`, '| Campo | Valor |', '|-------|-------|', `| Severidade | ${severidade} |`,
  '| CVSS | 7.5 |', '| Controle esperado | o controle |', `| Status | ${status} |`, '',
].join('\n');

/** O template de verdade da revisao-de-seguranca, com o SEC-001 de exemplo trocado pelos blocos dados. */
function kernelDoTemplate(blocos) {
  const t = readFileSync(TEMPLATE_KERNEL, 'utf8').replace(/\r\n/g, '\n');
  const ini = t.indexOf('### SEC-001');
  const fim = t.indexOf('## Mapa de aplicabilidade');
  assert.ok(ini > 0 && fim > ini, 'premissa: o template tem o SEC-001 de exemplo antes do mapa');
  return `${t.slice(0, ini)}${blocos.join('\n')}\n${t.slice(fim)}`;
}

test('7a — com o template do kernel: só CRÍTICO/ALTO aberto é obrigatório; BAIXO, ADIADO e COBERTO (em qualquer grafia) ficam fora; MÉDIO é condicional', async () => {
  const { lerCatalogoKernel, secDoKernel } = await mod();
  const kernel = kernelDoTemplate([
    blocoSec('SEC-001', 'ALTO', 'ABERTO'),
    blocoSec('SEC-002', 'BAIXO', 'ABERTO'),
    blocoSec('SEC-003', 'CRÍTICO', 'ADIADO'),
    blocoSec('SEC-004', 'ALTO', 'COBERTO').replace('| Status | COBERTO |', '| **Status** | **COBERTO** |'),
    blocoSec('SEC-005', 'CRÍTICO', 'ABERTO'),
    blocoSec('SEC-006', 'MÉDIO', 'ABERTO'),
    blocoSec('SEC-007', 'ALTO', '✅ COBERTO'),
    blocoSec('SEC-008', 'ALTO', 'NÃO COBERTO'),
    blocoSec('SEC-009', 'CRÍTICO / ALTO / MÉDIO / BAIXO', 'ABERTO / COBERTO / ADIADO'),
  ]);
  assert.deepEqual(secDoKernel(kernel), ['SEC-001', 'SEC-005', 'SEC-008', 'SEC-009']);
  const porId = Object.fromEntries(lerCatalogoKernel(kernel).entradas.map((e) => [e.id, e.classe]));
  assert.deepEqual(porId, {
    'SEC-001': 'exigido', 'SEC-002': 'dispensado', 'SEC-003': 'dispensado', 'SEC-004': 'dispensado',
    'SEC-005': 'exigido', 'SEC-006': 'condicional', 'SEC-007': 'dispensado', 'SEC-008': 'exigido',
    // Placeholder do template sem preencher: não dá para saber — conta como obrigatório.
    'SEC-009': 'exigido',
  });
});

test('7a — o catálogo é achado com número no título, sem acento ou em tabela única', async () => {
  const { secDoKernel } = await mod();
  const blocos = [blocoSec('SEC-001', 'ALTO', 'ABERTO'), blocoSec('SEC-002', 'ALTO', 'COBERTO')].join('\n');
  for (const titulo of ['## 4. Catálogo SEC', '## Catalogo SEC', '### Catálogo de SEC']) {
    const k = `# Plano\n\n## 3. Controles\n| SEC-777 | x |\n\n${titulo}\n\n${blocos.replace(/^### /gm, '#### ')}\n## 5. Mapa de aplicabilidade\n| SEC-002 | MOD-X |\n`;
    assert.deepEqual(secDoKernel(k), ['SEC-001'], titulo);
  }
  const tabela = [
    '## Catálogo SEC', '', '| ID | Controle | Severidade | CVSS | Status |', '|----|----------|-----------|------|--------|',
    '| SEC-001 | Filtrar pelo dono | ALTO | 8.1 | ABERTO |', '| **SEC-002** | TLS | CRÍTICO | 9.1 | ✅ COBERTO |',
    '| SEC-003 | Cabeçalhos | BAIXO | 3.1 | ABERTO |', '| SEC-004 | Rate limit | CRÍTICO | 9.0 | ADIADO |',
    '| SEC-005 | Log sem PII | ALTO | 7.0 | PARCIAL |', '', '## Mapa de aplicabilidade', '| SEC-001 | MOD-X |',
  ].join('\n');
  assert.deepEqual(secDoKernel(tabela), ['SEC-001', 'SEC-005']);
});

test('7a — kernel que cita SEC-NNN mas cujo catálogo não foi lido: exit 2, nada escrito', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inject-kernel-'));
  try {
    const ilegivel = join(dir, 'ilegivel.md');
    writeFileSync(ilegivel, '# Plano\n\n## Requisitos de segurança\n- SEC-001: filtrar pelo dono (ALTO)\n- SEC-002: TLS\n');
    const r = cenario([sec()], ['--kernel', ilegivel]);
    assert.equal(r.status, 2, JSON.stringify(r.out));
    assert.match(r.err, /não consegui ler o Catálogo SEC/);
    assert.equal(JSON.stringify(r.doc), JSON.stringify(JSON.parse(r.original)));
    assert.ok(!r.bak);
    // Kernel sem nenhum SEC-NNN (catálogo vazio de verdade) não é erro de leitura.
    const vazio = join(dir, 'vazio.md');
    writeFileSync(vazio, '# Plano\n\n## Catálogo SEC\nNenhum controle em aberto.\n');
    assert.equal(cenario([sec()], ['--kernel', vazio]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('7a — o relatório diz o que o kernel dispensou e o MÉDIO que ficou sem task', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inject-kernel-'));
  try {
    const k = join(dir, 'kernel.md');
    writeFileSync(k, kernelDoTemplate([blocoSec('SEC-001', 'ALTO', 'ABERTO'), blocoSec('SEC-002', 'BAIXO', 'ABERTO'),
      blocoSec('SEC-003', 'ALTO', 'ADIADO'), blocoSec('SEC-004', 'MÉDIO', 'ABERTO')]));
    const r = cenario([sec()], ['--kernel', k]);
    assert.equal(r.status, 0, JSON.stringify(r.out));
    assert.deepEqual(r.out.kernel.exigidos, ['SEC-001']);
    assert.deepEqual(r.out.kernel.condicionaisSemTask.map((x) => x.id), ['SEC-004']);
    assert.deepEqual(r.out.kernel.dispensados.map((x) => x.id), ['SEC-002', 'SEC-003']);
    assert.ok(r.out.kernel.dispensados.every((x) => /Findings não injetados/.test(x.motivo)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————— 6b — ordem de execução depois da injeção —————————————————————————

const ORDEM = join(RAIZ, '.claude', 'skills', 'spec-tasks', 'scripts', 'order-backlog.mjs');
const tarefa = (id, storyId, over = {}) => ({ id, storyId, title: id, type: 'backend', ...over });

/** Backlog que já passou pelo order-backlog da spec-tasks: executionOrder nos dois níveis. */
async function backlogOrdenado({ change = false } = {}) {
  const { ordenarBacklog } = await import(pathToFileURL(ORDEM).href);
  const doc = {
    metadata: { schemaVersion: 'tasks/v5.3', ...(change ? { changeMode: true } : {}) },
    stories: [
      { id: 'S-1', name: 'Pedido', tasks: [tarefa('T-1A', 'S-1', { type: 'database', persistenceModel: { entities: [{ table: 'TB_PEDIDO' }] } }), tarefa('T-1B', 'S-1')] },
      { id: 'S-2', name: 'Tela', dependencies: ['S-1'], tasks: [tarefa('T-2A', 'S-2', { type: 'frontend' })] },
    ],
  };
  return ordenarBacklog(doc, { change }).doc;
}
const ordemDe = (doc) => Object.fromEntries([...doc.stories, ...doc.stories.flatMap((s) => s.tasks)].map((x) => [x.id, x.executionOrder]));

test('6b — num backlog já ordenado, a task SEC ganha o início da story e a numeração segue sem buraco', async () => {
  const { injetar } = await mod();
  const antes = await backlogOrdenado();
  assert.deepEqual(ordemDe(antes), { 'S-1': 1, 'S-2': 2, 'T-1A': 1, 'T-1B': 2, 'T-2A': 3 }, 'premissa');
  const r = injetar(antes, [sec({ id: 'SEC-001', storyId: 'S-2' }), sec({ id: 'SEC-002', storyId: 'S-1' })], { versaoSkill: '9.9' });
  assert.deepEqual(r.achados, []);
  assert.deepEqual(ordemDe(r.doc), { 'S-1': 1, 'S-2': 2, 'SEC-002': 1, 'T-1A': 2, 'T-1B': 3, 'SEC-001': 4, 'T-2A': 5 });
  // Geração completa: o array e o sequence da story acompanham.
  assert.deepEqual(r.doc.stories[0].tasks.map((t) => [t.id, t.sequence]), [['SEC-002', 1], ['T-1A', 2], ['T-1B', 3]]);
  assert.equal(r.ordem.renumerada, true);
  // Idempotente: rodar a renumeração de novo, sem task nova, não muda nada.
  const { renumerarOrdem } = await mod();
  const deNovo = structuredClone(r.doc);
  renumerarOrdem(deNovo);
  assert.deepEqual(deNovo, r.doc);
});

test('6b — a story transversal nova vai para o início do backlog (mustImplementFirst), com as tasks dela', async () => {
  const { injetar } = await mod();
  const transversal = { id: 'STORY-SEC-TRANSVERSAL', name: 'Controles transversais', priority: 'CRITICAL', mustImplementFirst: true, tasks: [] };
  const completo = injetar(await backlogOrdenado(), [sec({ id: 'SEC-010', storyId: 'STORY-SEC-TRANSVERSAL' })], { transversal, versaoSkill: '9.9' });
  assert.deepEqual(ordemDe(completo.doc), { 'STORY-SEC-TRANSVERSAL': 1, 'S-1': 2, 'S-2': 3, 'SEC-010': 1, 'T-1A': 2, 'T-1B': 3, 'T-2A': 4 });
  assert.equal(completo.doc.stories[0].id, 'STORY-SEC-TRANSVERSAL', 'geração completa: o array segue a ordem');
  // No _change os arrays ficam onde estavam (a story vai para o fim do array) — só a numeração diz a ordem.
  const change = injetar(await backlogOrdenado({ change: true }), [sec({ id: 'SEC-010', storyId: 'STORY-SEC-TRANSVERSAL' })], { transversal, versaoSkill: '9.9' });
  assert.equal(change.doc.stories.at(-1).id, 'STORY-SEC-TRANSVERSAL');
  assert.equal(change.doc.stories.at(-1).executionOrder, 1);
  assert.equal(change.doc.stories.at(-1).tasks[0].sequence, undefined, '_change não mexe em sequence');
});

test('6b — --acrescentar num backlog já numerado entra antes das SEC que já estavam; backlog sem ordem fica sem ordem', async () => {
  const { injetar } = await mod();
  const primeira = injetar(await backlogOrdenado(), [sec({ id: 'SEC-001', storyId: 'S-2' })], { versaoSkill: '9.9' }).doc;
  const depois = injetar(primeira, [sec({ id: 'SEC-003', storyId: 'S-2' })], { acrescentar: true, versaoSkill: '9.9' });
  assert.deepEqual(depois.achados, []);
  assert.deepEqual(ordemDe(depois.doc), { 'S-1': 1, 'S-2': 2, 'T-1A': 1, 'T-1B': 2, 'SEC-003': 3, 'SEC-001': 4, 'T-2A': 5 });
  // Backlog que nunca passou pelo order-backlog: nada de executionOrder inventado.
  const cru = JSON.parse(readFileSync(BACKLOG, 'utf8'));
  const r = injetar(cru, [sec()], { versaoSkill: '9.9' });
  assert.equal(r.doc.stories[0].tasks[0].executionOrder, undefined);
  assert.equal(r.ordem.renumerada, false);
});

test('6b — pela CLI: o tasks.json gravado já sai com a ordem nova', () => {
  // O backlog do exemplo do kit, numerado como o order-backlog numera; a task SEC entra na story dele.
  const r = cenario([sec()], [], (d) => {
    d.stories[0].executionOrder = 1;
    d.stories[0].tasks.forEach((t, i) => { t.executionOrder = i + 1; });
    return d;
  });
  assert.equal(r.status, 0, r.err || JSON.stringify(r.out));
  const ordem = r.doc.stories[0].tasks.map((t) => t.executionOrder);
  assert.equal(r.doc.stories[0].tasks[0].id, 'SEC-001');
  assert.deepEqual(ordem, ordem.map((_, i) => i + 1), 'a task SEC é a 1ª e as outras andam uma casa');
  assert.equal(r.out.ordem.renumerada, true);
});

test('Decisão 74 — --acrescentar: task SEC achada na auditoria entra num backlog já revisado, sem refazer a revisão', () => {
  const jaRevisado = (d) => {
    d.stories.find((s) => s.id === STORY).tasks.unshift({ ...sec(), id: 'SEC-001' });
    d.metadata = { ...d.metadata, securityReview: { reviewedAt: '2026-01-01T00:00:00Z', tasksInjected: 1, findingsCritical: 0, findingsHigh: 1 } };
    return d;
  };
  const nova = sec({ id: 'SEC-002', title: 'SEC-002 — controle achado na auditoria da US' });
  const ok = cenario([nova], ['--acrescentar', '--origem', 'auditoria-de-us'], jaRevisado);
  assert.equal(ok.status, 0, ok.err || JSON.stringify(ok.out));
  const tasks = ok.doc.stories.find((s) => s.id === STORY).tasks;
  assert.deepEqual(tasks.filter((t) => /^SEC-/.test(t.id)).map((t) => t.id), ['SEC-002', 'SEC-001']);
  // A revisão original fica como estava; o acréscimo é registrado à parte.
  assert.deepEqual(ok.doc.metadata.securityReview, jaRevisado(JSON.parse(readFileSync(BACKLOG, 'utf8'))).metadata.securityReview);
  const extra = ok.doc.metadata.securityAdditions;
  assert.equal(extra.length, 1);
  assert.deepEqual(extra[0].ids, ['SEC-002']);
  assert.equal(extra[0].source, 'auditoria-de-us');
  // Backlog nunca revisado: acrescentar não inventa um securityReview (travaria a revisão de verdade).
  const virgem = cenario([nova], ['--acrescentar']);
  assert.equal(virgem.status, 0, virgem.err || JSON.stringify(virgem.out));
  assert.equal(virgem.doc.metadata?.securityReview, undefined);
  assert.equal(virgem.doc.metadata.securityAdditions[0].source, 'nao-informada');
  // Acrescentar nunca substitui: ID que já existe é recusado, nada escrito.
  const repetida = cenario([sec({ id: 'SEC-001' })], ['--acrescentar'], jaRevisado);
  assert.equal(repetida.status, 1);
  assert.equal(repetida.out.achados[0].code, 'NO_SILENT_REINJECTION');
  assert.equal(repetida.doc.stories.find((s) => s.id === STORY).tasks.filter((t) => t.id === 'SEC-001').length, 1);
  // As duas flags juntas não fazem sentido: entrada não aplicável.
  assert.equal(cenario([nova], ['--acrescentar', '--reprocessar'], jaRevisado).status, 2);
});
