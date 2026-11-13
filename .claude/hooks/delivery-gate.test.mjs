import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitTarget, parseStatusBlock, parseOverride, parseExemption } from './delivery-gate.mjs';

test('parseGitTarget: push direto na main é isento', () => {
  const r = parseGitTarget('git push origin main', 'main');
  assert.equal(r.kind, 'push');
  assert.equal(r.isFeaturePush, false);
});

test('parseGitTarget: push de branch de feature é fiscalizado', () => {
  const r = parseGitTarget('git push -u origin feat-x', 'feat-x');
  assert.equal(r.kind, 'push');
  assert.equal(r.isFeaturePush, true);
});

test('parseGitTarget: push com refspec HEAD:main é isento', () => {
  const r = parseGitTarget('git push origin HEAD:main', 'feat-x');
  assert.equal(r.isFeaturePush, false);
});

test('parseGitTarget: gh pr create sem --base assume main', () => {
  const r = parseGitTarget('gh pr create --fill', 'feat-x');
  assert.equal(r.kind, 'pr');
  assert.equal(r.isPrToMain, true);
});

test('parseGitTarget: gh pr create --base develop não é PR p/ main', () => {
  const r = parseGitTarget('gh pr create --base develop', 'feat-x');
  assert.equal(r.isPrToMain, false);
});

test('parseGitTarget: comando irrelevante', () => {
  assert.equal(parseGitTarget('ls -la', 'feat-x').kind, 'other');
});

test('parseStatusBlock: extrai veredito, commit e achados', () => {
  const txt = `blah\n<!-- gate:status -->\nveredito: BLOQUEADA\ncommit-auditado: abc1234\nachados-bloqueantes: SEC-001, BUG-003\n<!-- /gate:status -->\nmais`;
  const s = parseStatusBlock(txt);
  assert.equal(s.verdict, 'BLOQUEADA');
  assert.equal(s.auditedCommit, 'abc1234');
  assert.deepEqual(s.blockingFindings, ['SEC-001', 'BUG-003']);
});

test('parseStatusBlock: achados "nenhum" vira lista vazia', () => {
  const txt = `<!-- gate:status -->\nveredito: APROVADA\ncommit-auditado: def5678\nachados-bloqueantes: nenhum\n<!-- /gate:status -->`;
  assert.deepEqual(parseStatusBlock(txt).blockingFindings, []);
});

test('parseStatusBlock: sem bloco → null', () => {
  assert.equal(parseStatusBlock('sem bloco aqui'), null);
});

test('parseOverride: extrai us, commit e ids', () => {
  const txt = `<!-- gate:override -->\nus: US-042\ncommit-auditado: abc1234\nachados-falso-positivo:\n  - id: SEC-001\n    justificativa: sanitizado a montante\n  - id: BUG-003\n    justificativa: caminho morto\n<!-- /gate:override -->`;
  const o = parseOverride(txt);
  assert.equal(o.us, 'US-042');
  assert.equal(o.auditedCommit, 'abc1234');
  assert.deepEqual(o.falsePositiveIds, ['SEC-001', 'BUG-003']);
});

test('parseExemption: extrai branch e motivo', () => {
  const txt = `<!-- gate:isencao -->\nbranch: claude/tooling-x\nautor: Murilo\ndata: 2026-07-23\nmotivo: tooling do harness, sem US\n<!-- /gate:isencao -->`;
  const e = parseExemption(txt);
  assert.equal(e.branch, 'claude/tooling-x');
  assert.equal(e.motivo, 'tooling do harness, sem US');
});

import { decide } from './delivery-gate.mjs';

const featurePush = { kind: 'push', isFeaturePush: true, isPrToMain: false };
const base = { target: featurePush, outgoingCommits: ['abc1234'], reports: [], overrides: [], exemption: null, determinable: true };

test('decide: push direto na main → ignore', () => {
  const r = decide({ ...base, target: { kind: 'push', isFeaturePush: false, isPrToMain: false } });
  assert.equal(r.action, 'ignore');
});

test('decide: comando irrelevante → ignore', () => {
  assert.equal(decide({ ...base, target: { kind: 'other' } }).action, 'ignore');
});

test('decide: feature sem relatório → deny', () => {
  assert.equal(decide(base).action, 'deny');
});

test('decide: relatório APROVADA fresco → pass', () => {
  const r = decide({ ...base, reports: [{ us: 'US-042', verdict: 'APROVADA', auditedCommit: 'abc1234', blockingFindings: [] }] });
  assert.equal(r.action, 'pass');
});

test('decide: relatório APROVADA COM RESSALVAS fresco → pass', () => {
  const r = decide({ ...base, reports: [{ us: 'US-042', verdict: 'APROVADA COM RESSALVAS', auditedCommit: 'abc1234', blockingFindings: [] }] });
  assert.equal(r.action, 'pass');
});

test('decide: relatório de commit fora do push (stale) → deny', () => {
  const r = decide({ ...base, reports: [{ us: 'US-042', verdict: 'APROVADA', auditedCommit: 'zzz9999', blockingFindings: [] }] });
  assert.equal(r.action, 'deny');
});

test('decide: BLOQUEADA sem override → deny', () => {
  const r = decide({ ...base, reports: [{ us: 'US-042', verdict: 'BLOQUEADA', auditedCommit: 'abc1234', blockingFindings: ['SEC-001'] }] });
  assert.equal(r.action, 'deny');
});

// As seis asserções `r.ledger.tipo` desta suíte viraram asserções sobre `r.reason`: o campo
// `ledger` saiu do retorno do `decide()` junto com o `appendLedger` (decisão do usuário, no
// estado.md). O que elas mediam — QUAL ramo de `pass` respondeu — continua medido, porque os dois
// ramos têm `reason` distintos. Nenhuma outra asserção da suíte herdada foi tocada.
test('decide: BLOQUEADA + override cobrindo tudo → pass pelo ramo do override', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'BLOQUEADA', auditedCommit: 'abc1234', blockingFindings: ['SEC-001', 'BUG-003'] }],
    overrides: [{ us: 'US-042', auditedCommit: 'abc1234', falsePositiveIds: ['SEC-001', 'BUG-003'] }],
  });
  assert.equal(r.action, 'pass');
  assert.match(r.reason, /neutralizada por override/);
});

test('decide: override parcial → deny', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'BLOQUEADA', auditedCommit: 'abc1234', blockingFindings: ['SEC-001', 'BUG-003'] }],
    overrides: [{ us: 'US-042', auditedCommit: 'abc1234', falsePositiveIds: ['SEC-001'] }],
  });
  assert.equal(r.action, 'deny');
});

test('decide: override com commit divergente → deny', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'BLOQUEADA', auditedCommit: 'abc1234', blockingFindings: ['SEC-001'] }],
    overrides: [{ us: 'US-042', auditedCommit: 'OUTRO', falsePositiveIds: ['SEC-001'] }],
  });
  assert.equal(r.action, 'deny');
});

test('decide: isenção válida → pass pelo ramo da isenção', () => {
  const r = decide({ ...base, exemption: { branch: 'claude/tooling', motivo: 'tooling', autor: 'M' } });
  assert.equal(r.action, 'pass');
  assert.match(r.reason, /isenção não-US honrada/);
});

test('decide: alvo indeterminável → deny (fail-safe)', () => {
  assert.equal(decide({ ...base, determinable: false }).action, 'deny');
});

test('decide: multi-relatório com uma BLOQUEADA sem override → deny (fail-safe)', () => {
  const r = decide({
    ...base, outgoingCommits: ['c1c1c1c'],
    reports: [
      { us: 'US-1', verdict: 'APROVADA', auditedCommit: 'c1c1c1c', blockingFindings: [] },
      { us: 'US-2', verdict: 'BLOQUEADA', auditedCommit: 'c1c1c1c', blockingFindings: ['SEC-009'] },
    ],
  });
  assert.equal(r.action, 'deny');
});

test('decide: multi-relatório todos APROVADA → pass', () => {
  const r = decide({
    ...base, outgoingCommits: ['c1c1c1c'],
    reports: [
      { us: 'US-1', verdict: 'APROVADA', auditedCommit: 'c1c1c1c', blockingFindings: [] },
      { us: 'US-2', verdict: 'APROVADA COM RESSALVAS', auditedCommit: 'c1c1c1c', blockingFindings: [] },
    ],
  });
  assert.equal(r.action, 'pass');
});

test('decide: multi-relatório ambas BLOQUEADA e ambas com override → pass', () => {
  const r = decide({
    ...base, outgoingCommits: ['c1c1c1c'],
    reports: [
      { us: 'US-1', verdict: 'BLOQUEADA', auditedCommit: 'c1c1c1c', blockingFindings: ['SEC-001'] },
      { us: 'US-2', verdict: 'BLOQUEADA', auditedCommit: 'c1c1c1c', blockingFindings: ['BUG-002'] },
    ],
    overrides: [
      { us: 'US-1', auditedCommit: 'c1c1c1c', falsePositiveIds: ['SEC-001'] },
      { us: 'US-2', auditedCommit: 'c1c1c1c', falsePositiveIds: ['BUG-002'] },
    ],
  });
  assert.equal(r.action, 'pass');
  assert.match(r.reason, /neutralizada por override/);
});

// O caso escolhido pelo teste herdado NÃO TINHA override, e por isso ele passava pela razão
// errada: com o ramo do veredito desconhecido desligado, o fall-through negava pelo OUTRO motivo
// (`BLOQUEADA sem override`) e a asserção sobre `action` continuava verde. Desligar o ramo é
// fail-open de verdade — um relatório com veredito não reconhecido MAIS um override daquela US
// passava de `deny` para `pass`. É o mesmo defeito do `campo` na Task 8: proteção medida por um
// teste que não a exercita.
//
// O par abaixo fecha isso: a asserção passa a ser sobre a MENSAGEM (quem separa os dois denies), e
// o segundo caso TEM override — que é a única montagem em que os dois ramos discordam.
test('decide: veredito desconhecido → deny (fail-safe), e pela mensagem do veredito', () => {
  const r = decide({ ...base, reports: [{ us: 'US-9', verdict: 'PENDENTE', auditedCommit: 'abc1234', blockingFindings: [] }] });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /veredito desconhecido/);
});

test('decide: veredito desconhecido COM override daquela US continua deny (o fail-open fechado)', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-9', verdict: 'PENDENTE', auditedCommit: 'abc1234', blockingFindings: ['SEC-001'] }],
    overrides: [{ us: 'US-9', auditedCommit: 'abc1234', falsePositiveIds: ['SEC-001'] }],
  });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /veredito desconhecido/);
  assert.doesNotMatch(r.reason, /neutralizada por override/);
});

test('decide: PR para main sem relatório → deny', () => {
  const r = decide({ ...base, target: { kind: 'pr', isFeaturePush: false, isPrToMain: true }, reports: [] });
  assert.equal(r.action, 'deny');
});

test('decide: PR para main com relatório APROVADA fresco → pass', () => {
  const r = decide({ ...base, target: { kind: 'pr', isFeaturePush: false, isPrToMain: true },
    reports: [{ us: 'US-1', verdict: 'APROVADA', auditedCommit: 'abc1234', blockingFindings: [] }] });
  assert.equal(r.action, 'pass');
});

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./delivery-gate.mjs', import.meta.url));

function runHook(payload, cwd) {
  try {
    const out = execFileSync('node', [HOOK], { input: JSON.stringify(payload), cwd, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '').toString() };
  }
}

test('smoke: comando irrelevante → silêncio, exit 0', () => {
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'ls -la' } }, process.cwd());
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), '');
});

test('smoke: feature push em dir não-git → deny (fail-safe)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-'));
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git push origin feat-x' } }, dir);
  assert.equal(r.code, 0);
  const j = JSON.parse(r.out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
});

test('parseGitTarget: comando não-git que menciona "git push" → other', () => {
  assert.equal(parseGitTarget('echo "lembrar de git push depois"', 'feat-x').kind, 'other');
  assert.equal(parseGitTarget('grep "git push" notas.md', 'feat-x').kind, 'other');
});

test('parseGitTarget: push encadeado main && feature → feature (enforce)', () => {
  const r = parseGitTarget('git push origin main && git push origin feat-x', 'feat-x');
  assert.equal(r.isFeaturePush, true);
});

test('parseGitTarget: prefixo de env var antes do git push', () => {
  const r = parseGitTarget('GIT_TRACE=1 git push origin feat-x', 'feat-x');
  assert.equal(r.isFeaturePush, true);
});

test('decide: match de commit por prefixo (relatório com SHA curto)', () => {
  const r = decide({
    target: { kind: 'push', isFeaturePush: true, isPrToMain: false },
    outgoingCommits: ['abc1234def0'], determinable: true, reports: [{ us: 'US-1', verdict: 'APROVADA', auditedCommit: 'abc1234', blockingFindings: [] }], overrides: [], exemption: null,
  });
  assert.equal(r.action, 'pass');
});

test('decide: marcador na árvore com auditoria APROVADA → deny (US fechando com marcador órfão)', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'APROVADA', auditedCommit: 'abc1234', blockingFindings: [] }],
    markerInTree: true,
  });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /em-andamento\.md/);
});

test('decide: marcador ausente com auditoria APROVADA → pass', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'APROVADA', auditedCommit: 'abc1234', blockingFindings: [] }],
    markerInTree: false,
  });
  assert.equal(r.action, 'pass');
});

test('decide: BLOQUEADA com override total mas marcador na árvore → deny', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'BLOQUEADA', auditedCommit: 'abc1234', blockingFindings: ['SEC-001'] }],
    overrides: [{ us: 'US-042', auditedCommit: 'abc1234', falsePositiveIds: ['SEC-001'] }],
    markerInTree: true,
  });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /em-andamento\.md/);
});

test('decide: isenção não-US não é afetada pelo marcador', () => {
  const r = decide({
    ...base,
    exemption: { branch: 'claude/tooling', motivo: 'tooling', autor: 'M' },
    markerInTree: true,
  });
  assert.equal(r.action, 'pass');
  assert.match(r.reason, /isenção não-US honrada/);
});

test('decide: sem auditoria ancorada e marcador presente → deny da auditoria (mensagem mais acionável)', () => {
  const r = decide({ ...base, reports: [], markerInTree: true });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /nenhuma auditoria cobre/);
});

test('decide: BLOQUEADA sem override e marcador presente → deny com a mensagem de BLOQUEADA, não a do marcador', () => {
  const r = decide({
    ...base,
    reports: [{ us: 'US-042', verdict: 'BLOQUEADA', auditedCommit: 'abc1234', blockingFindings: ['SEC-001'] }],
    markerInTree: true,
  });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /BLOQUEADA/);
});

test('parseGitTarget: az repos pr create sem --target-branch assume main', () => {
  const r = parseGitTarget('az repos pr create --title x', 'feat-x');
  assert.equal(r.kind, 'pr');
  assert.equal(r.isPrToMain, true);
});

test('parseGitTarget: az repos pr create --target-branch main', () => {
  const r = parseGitTarget('az repos pr create --target-branch main --title x', 'feat-x');
  assert.equal(r.isPrToMain, true);
});

test('parseGitTarget: az repos pr create para outra base nao e PR p/ main', () => {
  const r = parseGitTarget('az repos pr create --target-branch develop', 'feat-x');
  assert.equal(r.isPrToMain, false);
});

test('parseGitTarget: branch de integracao custom torna push p/ master isento', () => {
  const r = parseGitTarget('git push origin master', 'master', 'master');
  assert.equal(r.isFeaturePush, false);
});

test('parseGitTarget: com branch de integracao master, push p/ main e fiscalizado', () => {
  const r = parseGitTarget('git push origin main', 'main', 'master');
  assert.equal(r.isFeaturePush, true);
});

test('parseGitTarget: az repos pr create --target-branch master com integracao master', () => {
  const r = parseGitTarget('az repos pr create --target-branch master', 'feat-x', 'master');
  assert.equal(r.isPrToMain, true);
});

import { parseCommitsAuditados } from './delivery-gate.mjs';

test('parseCommitsAuditados: forma multi-repo', () => {
  const r = parseCommitsAuditados('commits-auditados: Projeto.Api@3d3a682, Projeto.Web@6abeb08');
  assert.deepEqual(r, [
    { repo: 'projeto.api', commit: '3d3a682' },
    { repo: 'projeto.web', commit: '6abeb08' },
  ]);
});

test('parseCommitsAuditados: forma legada escalar', () => {
  assert.deepEqual(parseCommitsAuditados('commit-auditado: abc1234'), [{ repo: null, commit: 'abc1234' }]);
});

test('parseCommitsAuditados: commits-auditados vence a forma legada', () => {
  const r = parseCommitsAuditados('commit-auditado: velho\ncommits-auditados: App@novo');
  assert.deepEqual(r, [{ repo: 'app', commit: 'novo' }]);
});

test('parseCommitsAuditados: entrada sem @ casa em qualquer repo', () => {
  assert.deepEqual(parseCommitsAuditados('commits-auditados: abc1234'), [{ repo: null, commit: 'abc1234' }]);
});

test('parseCommitsAuditados: nenhum campo → lista vazia', () => {
  assert.deepEqual(parseCommitsAuditados('veredito: APROVADA'), []);
});

test('parseStatusBlock: expõe auditedCommits e mantém auditedCommit legado', () => {
  const txt = '<!-- gate:status -->\nveredito: APROVADA\ncommits-auditados: App@abc1234, Web@def5678\nachados-bloqueantes: nenhum\n<!-- /gate:status -->';
  const s = parseStatusBlock(txt);
  assert.deepEqual(s.auditedCommits, [
    { repo: 'app', commit: 'abc1234' },
    { repo: 'web', commit: 'def5678' },
  ]);
  assert.equal(s.auditedCommit, 'abc1234');
});

test('parseExemption: extrai repositorio quando declarado', () => {
  const txt = '<!-- gate:isencao -->\nrepositorio: https://dev.azure.com/org/P/_git/App\nbranch: claude/tooling-x\nautor: Murilo\ndata: 2026-08-11\nmotivo: tooling do harness, sem US\n<!-- /gate:isencao -->';
  const e = parseExemption(txt);
  assert.equal(e.repositorio, 'https://dev.azure.com/org/P/_git/App');
  assert.equal(e.branch, 'claude/tooling-x');
});

test('parseExemption: sem repositorio → null (forma legada mono-repo)', () => {
  const txt = '<!-- gate:isencao -->\nbranch: claude/tooling-x\nmotivo: tooling\n<!-- /gate:isencao -->';
  assert.equal(parseExemption(txt).repositorio, null);
});

test('decide: papel docs → ignore (push de wiki nao e integracao de US)', () => {
  const r = decide({ ...base, papel: 'docs', reports: [] });
  assert.equal(r.action, 'ignore');
});

test('decide: papel prototipo → ignore', () => {
  assert.equal(decide({ ...base, papel: 'prototipo', reports: [] }).action, 'ignore');
});

// A mensagem de `repo-nao-declarado` era o ÚNICO literal do v1 que sobreviveu à migração, e
// mandava editar `docs/workspace.md`. O manifesto é `workspace.md` na RAIZ do repo de docs
// (`MANIFESTO_REL`), e a mensagem irmã — a de `sem-manifesto` — já dizia certo: duas mensagens do
// mesmo dicionário se contradiziam, e a errada é a que o consultor lê ENQUANTO está bloqueado,
// procurando um arquivo que não existe.
//
// A asserção é contra o `MANIFESTO_REL` importado, e não contra um literal escrito aqui: um teste
// que repete o caminho à mão erra junto com a mensagem no dia em que o caminho mudar.
import { MANIFESTO_REL } from './workspace.mjs';

test('decide: papel desconhecido por repo nao declarado → deny acionavel', () => {
  const r = decide({ ...base, papel: 'desconhecido', motivo: 'repo-nao-declarado', detalhe: 'outro' });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /workspace\.md/);
  assert.match(r.reason, /outro/);
  assert.ok(r.reason.includes('`' + MANIFESTO_REL + '`'),
    `a mensagem tem que citar o manifesto como \`${MANIFESTO_REL}\`; veio: ${r.reason}`);
  assert.doesNotMatch(r.reason, /docs\/workspace\.md/,
    'o manifesto não mora sob `docs/` — mandar editar um arquivo que não existe é pior que não dizer nada');
});

test('decide: irresolvivel → deny ensinando git -C', () => {
  const r = decide({ ...base, papel: 'desconhecido', motivo: 'irresolvivel' });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /git -C/);
});

test('decide: sem-manifesto → deny citando o template', () => {
  const r = decide({ ...base, papel: 'desconhecido', motivo: 'sem-manifesto' });
  assert.match(r.reason, /templates\/workspace\.md/);
});

test('decide: ambiguo → deny citando as pastas', () => {
  const r = decide({ ...base, papel: 'desconhecido', motivo: 'ambiguo', detalhe: 'a, b' });
  assert.match(r.reason, /a, b/);
});

test('decide: isencao vence commits indeterminados (valvula viva)', () => {
  const r = decide({
    ...base, motivo: 'commits',
    exemption: { branch: 'claude/tooling', repositorio: 'App', motivo: 'tooling', autor: 'M' },
  });
  assert.equal(r.action, 'pass');
  assert.match(r.reason, /isenção não-US honrada/);
});

test('decide: motivo commits sem isencao → deny citando o branch de integracao', () => {
  const r = decide({ ...base, motivo: 'commits', branchIntegracao: 'master' });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /master/);
});

test('decide: motivo marcador → deny', () => {
  const r = decide({ ...base, motivo: 'marcador' });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /em-andamento\.md/);
});

test('decide: motivo multiplos-push → deny pedindo um push por comando', () => {
  const r = decide({ ...base, papel: 'desconhecido', motivo: 'multiplos-push' });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /um push por comando/);
});

test('decide: ancora no commit do repo do push', () => {
  const r = decide({
    ...base, repo: 'projeto.api', outgoingCommits: ['3d3a682'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', blockingFindings: [], auditedCommits: [
      { repo: 'projeto.api', commit: '3d3a682' }, { repo: 'projeto.web', commit: '6abeb08' },
    ] }],
  });
  assert.equal(r.action, 'pass');
});

test('decide: commit do outro repo nao ancora (deny)', () => {
  const r = decide({
    ...base, repo: 'projeto.web', outgoingCommits: ['9999999'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', blockingFindings: [], auditedCommits: [
      { repo: 'projeto.api', commit: '3d3a682' }, { repo: 'projeto.web', commit: '6abeb08' },
    ] }],
  });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /nenhuma auditoria cobre/);
});

test('decide: relatorio multi-repo ancora nos dois repos, um push cada', () => {
  const relatorio = { us: 'US-1', verdict: 'APROVADA', blockingFindings: [], auditedCommits: [
    { repo: 'projeto.api', commit: 'aaa1111' }, { repo: 'projeto.web', commit: 'bbb2222' },
  ] };
  const api = decide({ ...base, repo: 'projeto.api', outgoingCommits: ['aaa1111'], reports: [relatorio] });
  const web = decide({ ...base, repo: 'projeto.web', outgoingCommits: ['bbb2222'], reports: [relatorio] });
  assert.equal(api.action, 'pass');
  assert.equal(web.action, 'pass');
});

test('decide: override casa com o commit do repo do push', () => {
  const r = decide({
    ...base, repo: 'projeto.api', outgoingCommits: ['aaa1111'],
    reports: [{ us: 'US-7', verdict: 'BLOQUEADA', blockingFindings: ['SEC-001'], auditedCommits: [
      { repo: 'projeto.api', commit: 'aaa1111' },
    ] }],
    overrides: [{ us: 'US-7', auditedCommit: 'aaa1111', falsePositiveIds: ['SEC-001'] }],
  });
  assert.equal(r.action, 'pass');
  assert.match(r.reason, /neutralizada por override/);
});

import { mkdirSync, writeFileSync } from 'node:fs';

function gitEm(dir, args) {
  execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'ignore', 'ignore'] });
}

function repoComRemote(raiz, nome, url) {
  const dir = join(raiz, nome);
  mkdirSync(dir, { recursive: true });
  gitEm(dir, ['init', '-q', '-b', 'main']);
  gitEm(dir, ['config', 'user.email', 't@t']);
  gitEm(dir, ['config', 'user.name', 'T']);
  gitEm(dir, ['remote', 'add', 'origin', url]);
  writeFileSync(join(dir, 'README.md'), '# ' + nome + '\n');
  gitEm(dir, ['add', '.']);
  gitEm(dir, ['commit', '-q', '-m', 'inicial']);
  return dir;
}

/** Workspace multi-repo: raiz sem git, repo de docs com manifesto, repo de codigo com feature. */
function workspaceGate() {
  const raiz = mkdtempSync(join(tmpdir(), 'gate-ws-'));
  const docs = repoComRemote(raiz, 'docs-repo', 'https://dev.azure.com/org/P/_git/wikiMaster');
  // v2: a candidata a repo de docs é a subpasta com `outputs/explore` E `outputs/spec`
  // (`descobrirWorkspace`, workspace.mjs), e o manifesto mora na RAIZ do repo de docs, não sob
  // `docs/` — ver `MANIFESTO_REL`. Só a estrutura em disco muda; nenhuma asserção foi tocada.
  mkdirSync(join(docs, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(docs, 'outputs', 'spec', 'auditorias'), { recursive: true });
  writeFileSync(join(docs, 'workspace.md'), [
    '<!-- harness:workspace -->',
    '- papel: docs',
    '  repositorio: https://dev.azure.com/org/P/_git/wikiMaster',
    '- papel: codigo',
    '  repositorio: https://dev.azure.com/org/P/_git/App',
    '<!-- /harness:workspace -->', '',
  ].join('\n'));
  gitEm(docs, ['add', '.']);
  gitEm(docs, ['commit', '-q', '-m', 'manifesto']);

  const app = repoComRemote(raiz, 'app', 'https://dev.azure.com/org/P/_git/App');
  gitEm(app, ['checkout', '-q', '-b', 'feat-x']);
  writeFileSync(join(app, 'novo.txt'), 'x\n');
  gitEm(app, ['add', '.']);
  gitEm(app, ['commit', '-q', '-m', 'feature']);
  return { raiz, docs, app };
}

test('smoke multi-repo: push no repo de docs → silencio', () => {
  // Prova que o comando É um push reconhecido (nao 'other'): o silencio abaixo vem de papel=docs, nao de misclassificacao.
  assert.equal(parseGitTarget('git -C docs-repo push origin wikiMaster', 'wikiMaster').isFeaturePush, true);
  const { raiz } = workspaceGate();
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git -C docs-repo push origin wikiMaster' } }, raiz);
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), '');
});

test('smoke multi-repo: push de feature no repo de codigo sem auditoria → deny', () => {
  const { raiz } = workspaceGate();
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git -C app push origin feat-x' } }, raiz);
  const j = JSON.parse(r.out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /nenhuma auditoria cobre/);
});

test('smoke multi-repo: push pelado → deny ensinando git -C', () => {
  const { raiz } = workspaceGate();
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git push origin feat-x' } }, raiz);
  const j = JSON.parse(r.out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /git -C/);
});

test('smoke multi-repo: repo nao declarado no manifesto → deny', () => {
  const { raiz } = workspaceGate();
  repoComRemote(raiz, 'infra', 'https://dev.azure.com/org/P/_git/Infra');
  gitEm(join(raiz, 'infra'), ['checkout', '-q', '-b', 'feat-y']);
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git -C infra push origin feat-y' } }, raiz);
  const j = JSON.parse(r.out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /workspace\.md/);
});

test('smoke multi-repo: auditoria ancorada no repo do push → pass silencioso', () => {
  // Prova que o comando É um push de feature reconhecido; combinado com o smoke "sem auditoria -> deny",
  // o silencio aqui so pode ser pass real (auditoria ancorada), nao misclassificacao.
  assert.equal(parseGitTarget('git -C app push origin feat-x', 'feat-x').isFeaturePush, true);
  const { raiz, docs, app } = workspaceGate();
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: app, encoding: 'utf8' }).trim();
  writeFileSync(join(docs, 'outputs', 'spec', 'auditorias', 'US-001.md'), [
    '<!-- gate:status -->',
    'veredito: APROVADA',
    `commits-auditados: App@${sha}`,
    'achados-bloqueantes: nenhum',
    '<!-- /gate:status -->', '',
  ].join('\n'));
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git -C app push origin feat-x' } }, raiz);
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), '');
});

test('smoke multi-repo: dois pushes na mesma linha (wiki + codigo) → deny (fail-open fechado)', () => {
  const { raiz } = workspaceGate();
  const r = runHook({ tool_name: 'Bash', tool_input: { command: 'git -C docs-repo push origin wikiMaster && git -C app push origin feat-x' } }, raiz);
  const j = JSON.parse(r.out);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /um push por comando/);
});

// ————————————————————————————— o wiring, medido pelo despachante —————————————————————————————
//
// TUDO ACIMA MEDE O MÓDULO SOZINHO: `decide()` direto, e o `main()` por subprocesso (`runHook`).
// Nenhum desses 75 testes passa pelo despachante — e é exatamente por isso que eles NÃO pegam a
// armadilha que esta migração carrega.
//
// `decide()` fala inglês (`{action, reason}`); o despachante do v2 testa `r.acao === 'deny'`, em
// português. Migrar verbatim não quebra: LIBERA, com `falhas: []` — nenhum erro registrado, e o
// despachante sem meio de saber que o verificador quis negar. O único gate de push do projeto
// passaria a liberar tudo, em silêncio, com a suíte verde.
//
// Por isso estes testes chamam `despachar`, e não `avaliar`: o caminho que vale em produção é
// `avaliar(payload)` → `despachar`, e é ele que precisa estar na suíte. Restrição global 5.
//
// O `io` com `cwd` trocado é o mesmo ponto de injeção que as outras entradas da tabela usam —
// sem ele, medir o wiring exigiria `process.chdir`, e foi por não haver ponto de injeção que as
// Tasks 5 e 6 entregaram wiring não medido.
import { despachar, criarRegistro, IO_REAL, REGISTRO } from './pretooluse.mjs';
import { avaliar } from './delivery-gate.mjs';

const registroEm = (raiz) => criarRegistro({ ...IO_REAL, cwd: () => raiz });
const push = (raiz, comando) =>
  despachar({ tool_name: 'Bash', tool_input: { command: comando } }, registroEm(raiz));

test('registro: o delivery-gate está na tabela, bloqueante, no gatilho Bash', () => {
  const entrada = (REGISTRO || []).find((v) => v.nome === 'delivery-gate');
  assert.ok(entrada, 'entrada `delivery-gate` ausente da tabela de registro do pretooluse.mjs');
  assert.equal(entrada.bloqueia, true);
  assert.ok(entrada.gatilhos.includes('Bash'), 'o gatilho `Bash` é o único que alcança `git push`');
});

test('despachante: push de feature sem auditoria → deny, com o motivo do GATE', () => {
  const { raiz } = workspaceGate();
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'deny');
  // O motivo do gate, não o do fail-safe: prova que o deny veio de uma DECISÃO traduzida, e não
  // de o verificador ter lançado e o despachante ter negado por segurança.
  assert.match(r.motivo, /nenhuma auditoria cobre/);
  assert.doesNotMatch(r.motivo, /não conseguiu decidir/);
});

test('despachante: push de feature COM auditoria ancorada → allow (o outro extremo)', () => {
  const { raiz, docs, app } = workspaceGate();
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: app, encoding: 'utf8' }).trim();
  writeFileSync(join(docs, 'outputs', 'spec', 'auditorias', 'US-001.md'), [
    '<!-- gate:status -->', 'veredito: APROVADA', `commits-auditados: App@${sha}`,
    'achados-bloqueantes: nenhum', '<!-- /gate:status -->', '',
  ].join('\n'));
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('despachante: comando irrelevante no gatilho Bash → allow, sem falha registrada', () => {
  const { raiz } = workspaceGate();
  const r = push(raiz, 'ls -la');
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

// ——— A ISENÇÃO, MEDIDA ÀS DUAS PONTAS ———
//
// `DIR_ISENCOES` é caminho da RAIZ, não sufixo: derivá-lo do diretório de auditorias duplica o
// caminho, o diretório não existe, nenhuma isenção é encontrada e o gate NEGA trabalho com
// autorização humana explícita. Um teste que só prova ausência passa também quando o caminho está
// errado — por isso o par: a isenção que EXISTE é encontrada, e a que não existe não é inventada.

/** Escreve uma isenção válida para `feat-x` do repo App, no caminho que o v2 usa. */
function comIsencao(docs) {
  const dir = join(docs, 'outputs', 'spec', 'auditorias', '_isencoes');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tooling.md'), [
    '<!-- gate:isencao -->',
    'repositorio: https://dev.azure.com/org/P/_git/App',
    'branch: feat-x',
    'autor: Murilo',
    'data: 2026-09-02',
    'motivo: tooling do harness, sem US',
    '<!-- /gate:isencao -->', '',
  ].join('\n'));
  return dir;
}

test('despachante: isenção presente em outputs/spec/auditorias/_isencoes → allow (ponta A)', () => {
  const { raiz, docs } = workspaceGate();
  comIsencao(docs);
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('despachante: sem isenção, o mesmo push → deny (ponta B, o controle)', () => {
  const { raiz } = workspaceGate();
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /nenhuma auditoria cobre/);
});

test('isenção de OUTRO branch não vale para este push → deny', () => {
  const { raiz, docs } = workspaceGate();
  const dir = comIsencao(docs);
  writeFileSync(join(dir, 'tooling.md'), [
    '<!-- gate:isencao -->',
    'repositorio: https://dev.azure.com/org/P/_git/App',
    'branch: feat-outro',
    'motivo: tooling do harness, sem US',
    '<!-- /gate:isencao -->', '',
  ].join('\n'));
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'deny');
});

// ——— O MARCADOR, MEDIDO NO CAMINHO DO v2 (e não só na mensagem) ———
//
// A mutação que troca `MARCADOR_US` pelo caminho do v1 (`docs/deliver/em-andamento.md`)
// SOBREVIVEU aos 75 testes herdados, e o motivo é instrutivo: nenhuma fixture cria o marcador,
// então `markerInTree` dava `false` nos DOIS caminhos, e as asserções herdadas sobre a mensagem
// (`/em-andamento\.md/`) casam com o caminho velho tão bem quanto com o novo. Teste que mede a
// MENSAGEM não mede o CAMINHO. Este par mede o caminho, às duas pontas: o marcador commitado no
// lugar do v2 é visto, e a mesma montagem sem ele passa.

/** Commita `outputs/spec/em-andamento.md` na árvore do repo de docs. */
function comMarcador(docs) {
  writeFileSync(join(docs, 'outputs', 'spec', 'em-andamento.md'), '# US-001 em andamento\n');
  gitEm(docs, ['add', '.']);
  gitEm(docs, ['commit', '-q', '-m', 'marcador']);
}

/** Auditoria APROVADA ancorada no HEAD do repo de código. */
function comAuditoriaAprovada(docs, app) {
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: app, encoding: 'utf8' }).trim();
  writeFileSync(join(docs, 'outputs', 'spec', 'auditorias', 'US-001.md'), [
    '<!-- gate:status -->', 'veredito: APROVADA', `commits-auditados: App@${sha}`,
    'achados-bloqueantes: nenhum', '<!-- /gate:status -->', '',
  ].join('\n'));
}

test('despachante: marcador em outputs/spec na árvore de docs → deny (a US está fechando)', () => {
  const { raiz, docs, app } = workspaceGate();
  comAuditoriaAprovada(docs, app);
  comMarcador(docs);
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /em-andamento\.md/);
});

test('despachante: a mesma montagem SEM o marcador → allow (o controle do caminho)', () => {
  const { raiz, docs, app } = workspaceGate();
  comAuditoriaAprovada(docs, app);
  const r = push(raiz, 'git -C app push origin feat-x');
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

// ——— A PRÉ-PASSAGEM, E A PROPRIEDADE DO SUPERCONJUNTO ———
//
// O `gatherContext` disparava `git rev-parse` INCONDICIONALMENTE, antes de alguém perguntar se o
// comando era sequer um push: custo medido em TODA tool call de `Bash`, contra 50 ms de orçamento
// por despachante. A `podeSerRelevante` é a pergunta puramente textual que vem ANTES do primeiro
// spawn — ela não vê o `currentBranch` e não decide se o push é de feature, só se vale a pena
// perguntar ao git.
//
// A RESTRIÇÃO É ASSIMÉTRICA: a pré-passagem tem que ser SUPERCONJUNTO do que o `parseGitTarget`
// considera relevante. Errar para "pode ser um push" custa um spawn desnecessário; errar para o
// outro lado deixa um push passar sem fiscalização — num gate bloqueante, é a direção que não se
// pode errar. Na dúvida, ela responde sim.
//
// Por isso o teste principal é uma PROPRIEDADE medida contra o corpus que este arquivo já tem, e
// não uma lista escrita à mão: a lista depende de eu lembrar de cada forma, e a forma esquecida é
// exatamente a que passaria sem fiscalização. O corpus é colhido do próprio fonte deste arquivo,
// então todo comando acrescentado aqui no futuro entra na propriedade sem ninguém lembrar dela.

import { readFileSync as lerFonte } from 'node:fs';
import { podeSerRelevante } from './delivery-gate.mjs';

/** Todo literal de string simples deste próprio arquivo — o corpus da propriedade. */
function corpusDoFonte() {
  const fonte = lerFonte(fileURLToPath(import.meta.url), 'utf8');
  const achados = new Set();
  for (const m of fonte.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    achados.add(m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
  return [...achados];
}

test('pré-passagem: PROPRIEDADE — todo comando que o parseGitTarget classifica como push ou pr passa pela pré-passagem', () => {
  // Três combinações de branch, porque `currentBranch`/`integrationBranch` mudam a CLASSIFICAÇÃO
  // do `parseGitTarget` — o mesmo comando é push de feature num repo que integra em `main` e
  // isento num que integra em `master`. A pré-passagem, que não vê nenhum dos dois, cobre as três.
  const branches = [['main', 'main'], ['feat-x', 'main'], ['master', 'master']];
  const relevantes = new Set();
  for (const cmd of corpusDoFonte()) {
    for (const [atual, integracao] of branches) {
      const t = parseGitTarget(cmd, atual, integracao);
      if (t.kind !== 'push' && t.kind !== 'pr') continue;
      relevantes.add(cmd);
      assert.equal(podeSerRelevante(cmd), true,
        `FALSO NEGATIVO: parseGitTarget classificou como '${t.kind}' e a pré-passagem disse não -> ${JSON.stringify(cmd)}`);
    }
  }
  // Sem este piso a propriedade passa VAZIA: um corpus colhido por regex que deixe de casar
  // transforma o teste numa tautologia verde. O piso fica bem abaixo do que é colhido hoje.
  assert.ok(relevantes.size >= 12,
    `corpus degenerado: só ${relevantes.size} comandos classificados como push/pr — a propriedade não mede nada`);
});

test('pré-passagem: as formas que uma pré-passagem ingênua perderia', () => {
  for (const cmd of [
    'git push',
    'git push origin feat/x',
    'git -C repo-app push origin feat/x',
    'git -c user.name=x push origin feat/x',
    'git --git-dir=/r/.git push origin feat/x',
    'git --work-tree /r push origin feat/x',
    'VAR=1 git push',
    'GIT_TRACE=1 FOO=bar git push origin feat/x',
    'gh pr create --base main',
    'gh pr create --fill',
    'az repos pr create --target-branch main',
    'echo ola && git push origin feat/x',
    'echo ola ; git push origin feat/x',
    'echo ola | git push origin feat/x',
    'echo ola || git push origin feat/x',
    'echo ola\ngit push origin feat/x',
    '   git    push   origin   feat/x  ',
  ]) {
    assert.equal(podeSerRelevante(cmd), true, `deveria ser candidato: ${JSON.stringify(cmd)}`);
  }
});

test('pré-passagem: o ganho — o comando trivial não vira pergunta ao git', () => {
  for (const cmd of ['echo ola', 'ls -la', 'git status', 'git commit -m x', 'git log --oneline',
    'git -C repo-app status', 'npm test', 'gh pr list', 'az repos pr list', '', null, undefined]) {
    assert.equal(podeSerRelevante(cmd), false, `não deveria ser candidato: ${JSON.stringify(cmd)}`);
  }
});

test('pré-passagem: push citado dentro de string não é candidato (o mesmo que o parseGitTarget já faz)', () => {
  assert.equal(podeSerRelevante('echo "lembrar de git push depois"'), false);
  assert.equal(podeSerRelevante('grep "git push" notas.md'), false);
});

// ————————————————— O DIVISOR DE SEGMENTOS CONHECE ASPAS —————————————————
//
// `segmentosShell` dividia em `&&`, `||`, `;`, `|` e `\n` SEM olhar aspas. O `;` dentro de uma
// mensagem de commit virava separador, o resto do texto parecia um push, e o gate NEGAVA trabalho
// legítimo. Medido pelo despachante inteiro, no repositório real:
//
//   DENY | git commit -m "corrige a; git push origin feat/x quebra"
//   DENY | git commit -m 'passo 1; git push origin feat/us-9'
//
// Sob o modelo de ameaça deste projeto — acidente e deriva, não adversário — o falso positivo é a
// PIOR categoria, pior que bypass exótico. E é especialmente provável aqui: este projeto escreve
// documentação sobre `git push` o tempo todo.
//
// O divisor é COMPARTILHADO entre `parseGitTarget` e `podeSerRelevante`, e é essa partilha que faz
// o superconjunto ser estrutural. Mexer nele mexe nos DOIS lados ao mesmo tempo — por isso cada
// caso abaixo é medido nos dois, e por isso a ponta de baixo (o push composto real continua sendo
// visto) é obrigatória: um divisor que pare de dividir onde deve transforma push composto em
// ruído, e aí o gate não vê push nenhum.
//
// O QUE CONTINUA FORA, e é declarado: `bash -c "git push …"`, `env git push …` e `(git push …)`
// passam. A spec põe "shell de verdade — `$VAR`, `$(...)`, `eval`, concatenação, heredoc" fora de
// cobertura, e são a mesma família; fechá-los é defesa contra adversário. Pela MESMA razão o
// heredoc (`cat <<EOF … git push … EOF`) continua sendo lido como comando: ignorar o corpo dele
// exigiria parser de shell de verdade, e errar a detecção do terminador produz falso NEGATIVO —
// a única direção que este gate não pode errar.

test('divisor: `git push` citado em mensagem de commit entre aspas duplas não é push', () => {
  const cmd = 'git commit -m "corrige a; git push origin feat/x quebra"';
  assert.equal(parseGitTarget(cmd, 'feat/x').kind, 'other');
  assert.equal(podeSerRelevante(cmd), false);
});

test('divisor: idem entre aspas simples', () => {
  const cmd = "git commit -m 'passo 1; git push origin feat/us-9'";
  assert.equal(parseGitTarget(cmd, 'feat/us-9').kind, 'other');
  assert.equal(podeSerRelevante(cmd), false);
});

test('divisor: as aspas cobrem TODOS os separadores, não só o `;`', () => {
  for (const cmd of [
    'git commit -m "a && git push origin feat/x"',
    'git commit -m "a || git push origin feat/x"',
    'git commit -m "a | git push origin feat/x"',
    'git commit -m "linha 1\ngit push origin feat/x"',
  ]) {
    assert.equal(parseGitTarget(cmd, 'feat/x').kind, 'other', cmd);
    assert.equal(podeSerRelevante(cmd), false, cmd);
  }
});

test('divisor: A OUTRA PONTA — o push composto real continua sendo visto', () => {
  for (const cmd of [
    'cd repo && git push origin feat/x',
    'echo ola && git push origin feat/x',
    'git -C docs push origin feat/x && git -C app push origin feat/x',
    'echo ola ; git push origin feat/x',
    'echo ola || git push origin feat/x',
    'echo ola | git push origin feat/x',
    'echo ola\ngit push origin feat/x',
    'echo "ola mundo" && git push origin feat/x',
    "echo 'ola mundo' ; git push origin feat/x",
    'git commit -m "mensagem; com ponto e virgula" && git push origin feat/x',
  ]) {
    assert.equal(parseGitTarget(cmd, 'feat/x').isFeaturePush, true, cmd);
    assert.equal(podeSerRelevante(cmd), true, cmd);
  }
});

test('divisor: aspas NÃO FECHADAS e aninhamento estranho não lançam — exceção de bloqueante vira negação', () => {
  for (const cmd of [
    'echo "aberta && git push origin feat/x',
    'echo \'aberta ; git push origin feat/x',
    'git commit -m "aspas " aninhadas " estranhas',
    'git push origin feat/x "',
    '"',
    '\'',
    'echo a\\',
  ]) {
    assert.doesNotThrow(() => parseGitTarget(cmd, 'feat/x'), cmd);
    assert.doesNotThrow(() => podeSerRelevante(cmd), cmd);
  }
});

// ————————————————— O `--dry-run` NÃO TRANSFERE NADA —————————————————
//
// `git push --dry-run origin feat/x` era medido como `deny` pelo despachante inteiro. Isso não é
// aspas: é o parser tratando um push que o git NÃO executa como se fosse integração de US. O
// consultor que roda um dry-run está justamente conferindo o que sairia ANTES de errar o push, e
// o gate bloqueava a conferência. Falso positivo puro, e da mesma família dos dois de cima.
//
// A exclusão fica só no `parseGitTarget`, e NÃO no `candidatoDoSegmento`: tirar o dry-run da
// pré-passagem estreitaria o superconjunto, e a assimetria manda errar para "pode ser". O custo
// de errar para lá é um spawn; o do outro lado é um push sem fiscalização.

test('dry-run: `git push --dry-run` não é push de feature', () => {
  for (const cmd of [
    'git push --dry-run origin feat/x',
    'git push -n origin feat/x',
    'git -C app push --dry-run origin feat/x',
    'git push origin feat/x --dry-run',
  ]) {
    assert.equal(parseGitTarget(cmd, 'feat/x').kind, 'other', cmd);
  }
});

test('dry-run: a pré-passagem CONTINUA dizendo "pode ser" (o superconjunto não estreita)', () => {
  assert.equal(podeSerRelevante('git push --dry-run origin feat/x'), true);
  assert.equal(podeSerRelevante('git push -n origin feat/x'), true);
});

test('dry-run: A OUTRA PONTA — o push real do mesmo comando composto continua sendo visto', () => {
  const r = parseGitTarget('git push --dry-run origin feat/x && git push origin feat/x', 'feat/x');
  assert.equal(r.isFeaturePush, true);
});

// ————————————————— A ÂNCORA DE COMMIT TEM PISO DE 7 —————————————————
//
// `commitInSet` casa prefixo nos DOIS sentidos, e o bidirecional existe por bom motivo: o
// relatório grava um SHA curto e o `git rev-list --abbrev-commit` pode devolver outro
// comprimento. Sem piso, porém, ele degenera:
//
//   commit-auditado: "abc1234" -> pass
//   commit-auditado: "abc"     -> pass
//   commit-auditado: "a"       -> pass   <- casa com ~1 em 16 de TODOS os commits
//
// Uma âncora truncada por acidente ancorava em commits que ninguém auditou e o gate aprovava o
// push: fail-open no único gate de push, pela via mais banal possível. O bidirecional FICA; o que
// entra é o piso. Não é regra nova — o template da `auditoria-de-us` já prescreve `<sha-curto>`, e
// 7 é o padrão do `git rev-parse --short`.
//
// O piso muda na direção RESTRITIVA, que é a que exige cuidado neste projeto. Por isso a mensagem
// é medida junto com a ação: dizer só "não casou" manda o consultor procurar o problema no lugar
// errado — o problema é o formato da âncora, não a ausência de auditoria.

test('âncora: menos de 7 caracteres → deny dizendo que a âncora é curta demais', () => {
  const r = decide({ ...base, outgoingCommits: ['abc1234def0'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', auditedCommit: 'abc', blockingFindings: [] }] });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /curta demais/);
  assert.match(r.reason, /commit-auditado/);
  assert.doesNotMatch(r.reason, /nenhuma auditoria cobre/);
});

test('âncora: um único caractere não ancora em 1 em 16 dos commits', () => {
  const r = decide({ ...base, outgoingCommits: ['abc1234def0'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', auditedCommit: 'a', blockingFindings: [] }] });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /curta demais/);
});

test('âncora: 7 caracteres continua casando com abreviação MAIS LONGA no push', () => {
  const r = decide({ ...base, outgoingCommits: ['abc1234def0'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', auditedCommit: 'abc1234', blockingFindings: [] }] });
  assert.equal(r.action, 'pass');
});

test('âncora: 7 caracteres continua casando com abreviação MAIS CURTA no push (o outro sentido)', () => {
  const r = decide({ ...base, outgoingCommits: ['abc1234'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', auditedCommit: 'abc1234def0', blockingFindings: [] }] });
  assert.equal(r.action, 'pass');
});

test('âncora: âncora curta não é confundida com auditoria ausente (a mensagem separa os dois)', () => {
  const semRelatorio = decide({ ...base, outgoingCommits: ['abc1234def0'], reports: [] });
  assert.match(semRelatorio.reason, /nenhuma auditoria cobre/);
  assert.doesNotMatch(semRelatorio.reason, /curta demais/);
});

// ————————————————— A PRÉ-PASSAGEM ESTÁ LIGADA, E VEM ANTES DE TUDO —————————————————
//
// Apagar do `gatherContext` a linha `if (!podeSerRelevante(command)) return { target: … }` — a
// única linha que é o entregável da rodada R — deixava a suíte INTEIRA verde (1026 pass, 0 fail),
// e o custo de `echo ola` voltava de 0,0 ms para 384,8 ms. Mover a MESMA linha para depois do
// `descobrirWorkspace` também sobrevivia.
//
// A razão: a suíte prendia que a `podeSerRelevante` está CORRETA e que a resposta dela é USADA.
// Não prendia que a chamada EXISTE, nem ONDE. É a restrição global 5 aplicada a uma propriedade
// de CUSTO em vez de segurança.
//
// E nenhuma asserção sobre o VALOR DE RETORNO fecha isso. Os dois `{ kind: 'other' }` do
// `gatherContext` são distinguíveis quando a linha é APAGADA (o tardio sempre traz `branch`), mas
// são o MESMO objeto quando ela só muda de lugar. O que a mutação de posição muda é o EFEITO: com
// a linha no lugar, `echo ola` não toca o disco. Por isso o teste conta leituras — pelo
// `lerDiretorio` que o `io` do despachante já carrega, o mesmo ponto de injeção que o `cwd` usa.
//
// Medido às DUAS pontas, e a segunda não é decoração: sem ela, um `gatherContext` que nunca
// chamasse `descobrirWorkspace` passaria no teste de cima com zero leituras.

function comContadorDeLeituras(raiz) {
  const leituras = { n: 0 };
  const io = {
    ...IO_REAL,
    cwd: () => raiz,
    lerDiretorio: (...args) => { leituras.n++; return IO_REAL.lerDiretorio(...args); },
  };
  return { io, leituras };
}

test('pré-passagem: o comando trivial não lê o disco — a chamada existe, e é a primeira coisa', () => {
  const { raiz } = workspaceGate();
  const { io, leituras } = comContadorDeLeituras(raiz);
  assert.equal(avaliar({ tool_name: 'Bash', tool_input: { command: 'echo ola' } }, io), null);
  assert.equal(leituras.n, 0,
    'a pré-passagem sumiu do `gatherContext`, ou deixou de vir antes do `descobrirWorkspace`');
});

test('pré-passagem: A OUTRA PONTA — o push de verdade LÊ o disco (senão o teste acima é vácuo)', () => {
  const { raiz } = workspaceGate();
  const { io, leituras } = comContadorDeLeituras(raiz);
  const r = avaliar({ tool_name: 'Bash', tool_input: { command: 'git -C app push origin feat-x' } }, io);
  assert.equal(r.acao, 'deny');
  assert.ok(leituras.n > 0,
    'o gate não leu o disco nem para um push de feature — a montagem não mede nada');
});

test('âncora: piso vale também na forma multi-repo `Repo@sha`', () => {
  const r = decide({ ...base, repo: 'projeto.api', outgoingCommits: ['3d3a682aaa'],
    reports: [{ us: 'US-1', verdict: 'APROVADA', blockingFindings: [],
      auditedCommits: [{ repo: 'projeto.api', commit: '3d3' }] }] });
  assert.equal(r.action, 'deny');
  assert.match(r.reason, /curta demais/);
});
