// Harness Elo v2 — varrer-entrega.mjs (plano de melhoria das skills, Onda 3, item 3.6).
//
// A casca que expõe o motor determinístico do G3 para a `auditoria-de-us`, com escopo = o que a
// entrega mudou. Aqui, num repositório git de verdade montado em mkdtemp: só a linha acrescentada
// entra (o que já estava na base não), arquivo novo entra, `outputs/` e `.claude/` ficam fora,
// `--desde-o-ramo` usa o merge-base, exit 0/1/2, e a skill chama o comando.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { varrerEntrega, lerArgs } from './varrer-entrega.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(AQUI, 'varrer-entrega.mjs');
const RAIZ = join(AQUI, '..', '..');

const git = (repo, ...args) => {
  const r = spawnSync('git', ['-C', repo, '-c', 'user.name=Teste', '-c', 'user.email=teste@exemplo.com', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

function repo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'varrer-entrega-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    mkdirSync(join(dir, 'src'));
    // Dívida que JÁ estava na base: não é da entrega e não pode aparecer.
    writeFileSync(join(dir, 'src', 'antigo.js'), 'export function f(cpf) {\n  console.log(cpf);\n}\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'base');
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('3.6 — só o que a entrega acrescentou entra; arquivo novo entra; outputs/ e .claude/ não', () => {
  repo((dir) => {
    git(dir, 'checkout', '-q', '-b', 'us-042');
    writeFileSync(join(dir, 'src', 'antigo.js'), 'export function f(cpf) {\n  console.log(cpf);\n}\nexport function g(senha) {\n  logger.info(senha);\n}\n');
    writeFileSync(join(dir, 'src', 'novo.js'), 'const password = "s3nh4-forte-de-verdade";\nexport default password;\n');
    mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
    writeFileSync(join(dir, 'outputs', 'spec', 'nota.js'), 'console.log(cpf);\n');
    const r = varrerEntrega({ ...lerArgs(['--desde-o-ramo', 'main', '--repo', dir, '--sem-externas', '--regras-frontend', 'nao']) });
    const m = r.achados.map((a) => `${a.regra} ${a.evidencia.arquivo}:${a.evidencia.linha}`).sort();
    assert.deepEqual(m, ['pii-no-log src/antigo.js:5', 'segredo-atribuido src/novo.js:1']);
    assert.ok(!JSON.stringify(r.achados).includes('s3nh4-forte-de-verdade'), 'o segredo tem que sair mascarado');
    assert.equal(r.externas.externas, 'desligadas (--sem-externas)');
  });
});

test('3.6 — CLI: exit 1 com achado, 0 sem achado, 2 sem repositório ou sem base', () => {
  repo((dir) => {
    const rodar = (...a) => spawnSync(process.execPath, [SCRIPT, '--repo', dir, '--sem-externas', '--regras-frontend', 'nao', ...a], { encoding: 'utf8' });
    assert.equal(rodar('--base', 'HEAD').status, 0, 'nada mudou desde HEAD');
    writeFileSync(join(dir, 'src', 'tela.js'), 'el.innerHTML = entrada;\n');
    const r = rodar('--base', 'HEAD', '--json');
    assert.equal(r.status, 1);
    assert.equal(JSON.parse(r.stdout).achados[0].regra, 'html-cru');
    assert.equal(rodar('--base', 'nao-existe').status, 2);
    assert.equal(rodar().status, 2, 'sem --base nem --desde-o-ramo');
  });
  const fora = mkdtempSync(join(tmpdir(), 'sem-git-'));
  try {
    assert.equal(spawnSync(process.execPath, [SCRIPT, '--repo', fora, '--base', 'HEAD', '--sem-externas'], { encoding: 'utf8' }).status, 2);
  } finally {
    rmSync(fora, { recursive: true, force: true });
  }
});

test('3.6 — as externas entram pela mesma função do validar.mjs (injetável)', () => {
  repo((dir) => {
    writeFileSync(join(dir, 'src', 'x.js'), 'export const ok = 1;\n');
    const r = varrerEntrega(lerArgs(['--base', 'HEAD', '--repo', dir, '--regras-frontend', 'nao']), {
      externas: (estado, mudancas) => ({ achados: [{ regra: 'semgrep-x', severidade: 'ALTO', evidencia: { arquivo: 'src/x.js', linha: 1 } }], situacao: { semgrep: 'rodou', arquivos: mudancas.length, trabalho: !!estado.trabalho } }),
    });
    assert.equal(r.achados.length, 1);
    assert.deepEqual(r.externas, { semgrep: 'rodou', arquivos: 1, trabalho: true });
  });
});

test('3.6 — o Passo A da auditoria-de-us chama a varredura com o escopo da US', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/auditoria-de-us/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(t, /node \.claude\/ferramentas\/varrer-entrega\.mjs --desde-o-ramo/);
  assert.ok(!/Não executa DAST\/SAST automatizado/.test(t), 'a skill ainda diz que não roda SAST');
});

test('13.11 — --repo numa subpasta: os caminhos dos achados são relativos a ela, e o resto do repositório fica fora', () => {
  repo((dir) => {
    mkdirSync(join(dir, 'apps', 'api', 'src'), { recursive: true });
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true });
    writeFileSync(join(dir, 'apps', 'api', 'src', 'a.js'), 'export const a = 1;\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'mono');
    writeFileSync(join(dir, 'apps', 'api', 'src', 'a.js'), "export const a = (c) => console.log('x', c.cpf);\n");
    writeFileSync(join(dir, 'apps', 'api', 'src', 'b.js'), 'el.innerHTML = entrada;\n');
    writeFileSync(join(dir, 'apps', 'web', 'w.js'), 'el.innerHTML = outra;\n');
    const r = varrerEntrega(lerArgs(['--base', 'HEAD', '--repo', join(dir, 'apps', 'api'), '--sem-externas', '--regras-frontend', 'nao']));
    assert.deepEqual(r.achados.map((a) => `${a.regra} ${a.evidencia.arquivo}:${a.evidencia.linha}`).sort(), ['html-cru src/b.js:1', 'pii-no-log src/a.js:1']);
  });
});

test('Decisão 69 — --tudo: o repositório inteiro, inclusive a dívida que já estava na base', () => {
  repo((dir) => {
    const r = varrerEntrega(lerArgs(['--tudo', '--repo', dir, '--sem-externas', '--regras-frontend', 'nao']));
    assert.deepEqual(r.achados.map((a) => `${a.regra} ${a.evidencia.arquivo}:${a.evidencia.linha}`), ['pii-no-log src/antigo.js:2']);
    const cli = spawnSync(process.execPath, [SCRIPT, '--tudo', '--repo', dir, '--sem-externas', '--regras-frontend', 'nao'], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
  });
});

// D54 (teste ponta a ponta de 2026-10-21): sem `--repo`, o `--tudo` da spec-code-audit varreu o
// repositório de docs (13 arquivos, 0 achados) num workspace com o código em `codigo/` — falso alívio.
test('D54 — --tudo numa pasta sem código-fonte (só docs) é exit 2 com o motivo, não «0 achados»', () => {
  const dir = mkdtempSync(join(tmpdir(), 'varrer-docs-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    for (const [rel, texto] of [
      ['README.md', '# Docs\n'], ['workspace.md', '| codigo | `api` | `codigo/` |\n'], ['harness.json', '{}\n'],
      ['inputs/ata.txt', 'ata\n'], ['outputs/spec/app.js', 'console.log(cpf);\n'], ['.claude/rules/a.md', '# a\n'],
      // O frame HTML do insumo (como no projeto do teste ponta a ponta) não faz da pasta um repositório de código.
      ['inputs/frame-pre-prototype/lista-de-pedidos.html', '<table><tr><td>Pedido</td></tr></table>\n'],
    ]) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), texto);
    }
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'docs');
    const cli = spawnSync(process.execPath, [SCRIPT, '--tudo', '--repo', dir, '--sem-externas', '--regras-frontend', 'nao', '--json'], { encoding: 'utf8' });
    assert.equal(cli.status, 2, cli.stdout);
    assert.equal(cli.stdout, '', 'nada no stdout: o harness.json não pode sair como varredura limpa');
    assert.match(cli.stderr, /nenhum arquivo de código-fonte/);
    assert.match(cli.stderr, /--repo <pasta do código>/);
    assert.throws(() => varrerEntrega(lerArgs(['--tudo', '--repo', dir, '--sem-externas', '--regras-frontend', 'nao'])), /código-fonte/);
    // O escopo da US e o da task continuam aceitando entrega só de documento.
    writeFileSync(join(dir, 'README.md'), '# Docs\n\nmais\n');
    assert.equal(varrerEntrega(lerArgs(['--base', 'HEAD', '--repo', dir, '--sem-externas', '--regras-frontend', 'nao'])).achados.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('D54 — o Passo 0 da spec-code-audit passa --repo com a pasta do código ao --tudo', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/spec-code-audit/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const linha = t.split('\n').find((l) => /varrer-entrega\.mjs --tudo/.test(l));
  assert.ok(linha, 'o Passo 0 não chama mais o varrer-entrega --tudo');
  assert.match(linha, /--tudo --repo <pasta do código>/);
  assert.match(t, /papel `codigo`[^\n]*`workspace\.md`|`workspace\.md`[^\n]*papel `codigo`/);
});
