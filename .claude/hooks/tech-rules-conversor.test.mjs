// Harness Elo v2 — Comportamento do conversor `.mdc → .md` da spec-tech-rules (tools/mdc_to_md.py),
// rodando o Python de verdade. Os testes de prosa (`skills-prosa.test.mjs`) só conferem o texto do
// script; estes conferem o que ele ESCREVE, porque é isso que o Claude Code e o Kiro vão ler.
//
// Fatos de onde saem as regras (2026-10-19):
//   - Claude Code 2.1.295: `paths:` em CSV sem aspas, CSV com aspas, glob com chaves e lista YAML
//     carregam (medido, MANUTENCAO.md, "Contexto fixo").
//   - Kiro (kiro.dev/docs/steering): `inclusion` always | fileMatch | manual | auto; `fileMatchPattern`
//     aceita string ou lista e a documentação NÃO cita expansão de chaves; `auto` exige `name` e
//     `description`; o frontmatter tem que ser a primeira coisa do arquivo.
//
// Usa `PYTHON_REPORT` quando definido (o mesmo Python da suíte), senão `python`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TOOLS = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'spec-tech-rules', 'tools');
const PY = process.env.PYTHON_REPORT || 'python';

function rodar(funcao, entrada) {
  const codigo = `import sys; sys.path.insert(0, sys.argv[1]); import mdc_to_md as m; `
    + `sys.stdout.reconfigure(encoding='utf-8'); sys.stdout.write(m.${funcao}(sys.stdin.read()))`;
  const r = spawnSync(PY, ['-c', codigo, TOOLS], { input: entrada, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert.equal(r.status, 0, `python falhou (${PY}): ${r.stderr}`);
  return r.stdout.replace(/\r\n/g, '\n'); // stdout do Python no Windows é modo texto (\n → \r\n)
}

const frontmatter = (texto) => /^---\n([\s\S]*?)\n---\n/.exec(texto)?.[1] ?? '';

test('Kiro: glob com chaves vira lista expandida — o Kiro não garante expansão de `{a,b}`', () => {
  const out = rodar('convert_kiro', '---\ndescription: tela\nglobs: "src/**/*.{ts,tsx}, **/*.css"\nalwaysApply: false\n---\n# Tela\n');
  const fm = frontmatter(out);
  assert.match(fm, /^inclusion: fileMatch$/m);
  const lista = /^fileMatchPattern: (\[.*\])$/m.exec(fm);
  assert.ok(lista, fm);
  assert.deepEqual(JSON.parse(lista[1]), ['src/**/*.ts', 'src/**/*.tsx', '**/*.css']);
});

test('Kiro: só `description`, sem globs e sem alwaysApply → `inclusion: auto` com `name` (o "Agent Requested" do Cursor)', () => {
  const out = rodar('convert_kiro', '---\ndescription: Padrões de mensageria. Use ao criar consumidor ou produtor de fila.\nalwaysApply: false\n---\n# Mensageria\n');
  const fm = frontmatter(out);
  assert.match(fm, /^inclusion: auto$/m);
  assert.match(fm, /^name: /m, 'auto sem `name` é inválido no Kiro');
  assert.match(fm, /^description: Padrões de mensageria/m);
  assert.ok(!/alwaysApply|globs/.test(fm));
});

test('Kiro: `alwaysApply: true` e rule sem frontmatter continuam `always`; o frontmatter abre o arquivo', () => {
  for (const entrada of ['---\ndescription: seg\nalwaysApply: true\n---\n# Seg\n', '# Sem frontmatter\n']) {
    const out = rodar('convert_kiro', entrada);
    assert.ok(out.startsWith('---\n'), 'o Kiro exige o frontmatter como primeira coisa do arquivo');
    assert.match(frontmatter(out), /^inclusion: always$/m);
  }
});

test('Kiro: o `name` do modo auto vem do argumento quando dado (o nome do arquivo)', () => {
  const codigo = `import sys; sys.path.insert(0, sys.argv[1]); import mdc_to_md as m; `
    + `sys.stdout.write(m.convert_kiro('---\\ndescription: d\\nalwaysApply: false\\n---\\n# X\\n', nome='mensageria'))`;
  const r = spawnSync(PY, ['-c', codigo, TOOLS], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(frontmatter(r.stdout.replace(/\r\n/g, '\n')), /^name: mensageria$/m);
});

test('Claude: vírgula dentro de chave não separa glob', () => {
  const out = rodar('convert', '---\ndescription: tela\nglobs: "src/**/*.{ts,tsx}, **/*.css"\nalwaysApply: false\n---\n# Tela\n');
  assert.match(frontmatter(out), /^paths: src\/\*\*\/\*\.\{ts,tsx\}, \*\*\/\*\.css$/m);
});

test('orçamento: rule acima do limite gera aviso, abaixo não', () => {
  const codigo = `import sys; sys.path.insert(0, sys.argv[1]); import mdc_to_md as m; `
    + `print(m.LIMITE_CARACTERES); print(len(m.avisos_de_tamanho({'grande.mdc': 'x' * (m.LIMITE_CARACTERES + 1), 'pequena.mdc': 'y'})))`;
  const r = spawnSync(PY, ['-c', codigo, TOOLS], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const [limite, avisos] = r.stdout.trim().split(/\r?\n/).map(Number);
  assert.ok(limite >= 8000 && limite <= 16000, `limite fora da faixa razoável: ${limite}`);
  assert.equal(avisos, 1);
});

// ————— Decisão 73: o que o harness já carrega não é materializado de novo na mesma pasta —————
// O `security.mdc` e o `frontend-default.mdc` do template têm o corpo idêntico ao da
// `harness/security.md` e da `harness/frontend.md`. Convertidos para a mesma pasta, a security (sem
// `paths`) carregaria duas vezes em toda volta, e o frontend duas vezes em todo arquivo de tela.

function pastaMdc(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'security.mdc'), '---\ndescription: seg\nalwaysApply: true\n---\n# Seg\n');
  writeFileSync(join(dir, 'frontend-default.mdc'), '---\ndescription: fe\nglobs: "**/*.tsx"\nalwaysApply: false\n---\n# FE padrão\n');
  writeFileSync(join(dir, 'frontend.mdc'), '---\ndescription: fe do projeto\nglobs: "**/*.tsx"\nalwaysApply: false\n---\n# FE do projeto\n');
  writeFileSync(join(dir, 'architecture.mdc'), '---\ndescription: arq\nalwaysApply: true\n---\n# Arq\n');
}
const converterDir = (args) => spawnSync(PY, [join(TOOLS, 'mdc_to_md.py'), ...args], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });

test('Decisão 73 — Claude: com a rule do harness na pasta, security e frontend-default não são materializadas', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'mdc-harness-'));
  try {
    pastaMdc(join(raiz, 'mdc'));
    const dst = join(raiz, 'rules');
    mkdirSync(join(dst, 'harness'), { recursive: true });
    writeFileSync(join(dst, 'harness', 'security.md'), '# Seg do harness\n');
    writeFileSync(join(dst, 'harness', 'frontend.md'), '# FE do harness\n');
    const r = converterDir(['--dir', join(raiz, 'mdc'), dst]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(readdirSync(dst).filter((f) => f.endsWith('.md')).sort(), ['architecture.md', 'frontend.md']);
    assert.match(r.stdout, /PULADA - security\.mdc/);
    assert.match(r.stdout, /PULADA - frontend-default\.mdc/);
    assert.equal(readFileSync(join(dst, 'harness', 'security.md'), 'utf8'), '# Seg do harness\n', 'a rule do harness não é tocada');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('Decisão 73 — sem harness na pasta, tudo é materializado como antes', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'mdc-sem-harness-'));
  try {
    pastaMdc(join(raiz, 'mdc'));
    const r = converterDir(['--dir', join(raiz, 'mdc'), join(raiz, 'rules')]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(readdirSync(join(raiz, 'rules')).sort(), ['architecture.md', 'frontend-default.md', 'frontend.md', 'security.md']);
    assert.ok(!/PULADA/.test(r.stdout));
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('Decisão 73 — Kiro: a rule do harness é `harness-security.md` no steering', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'mdc-kiro-'));
  try {
    pastaMdc(join(raiz, 'mdc'));
    const dst = join(raiz, 'steering');
    mkdirSync(dst, { recursive: true });
    writeFileSync(join(dst, 'harness-security.md'), '---\ninclusion: always\n---\n# Seg\n');
    writeFileSync(join(dst, 'harness-frontend.md'), '---\ninclusion: fileMatch\n---\n# FE\n');
    const r = converterDir(['--kiro', '--dir', join(raiz, 'mdc'), dst]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(join(dst, 'security.md')) && !existsSync(join(dst, 'frontend-default.md')));
    assert.ok(existsSync(join(dst, 'frontend.md')) && existsSync(join(dst, 'architecture.md')));
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('Decisão 73 — cópia antiga na pasta: avisa e não apaga', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'mdc-antiga-'));
  try {
    pastaMdc(join(raiz, 'mdc'));
    const dst = join(raiz, 'rules');
    mkdirSync(join(dst, 'harness'), { recursive: true });
    writeFileSync(join(dst, 'harness', 'security.md'), '# Seg do harness\n');
    writeFileSync(join(dst, 'security.md'), '# cópia de uma execução anterior\n');
    const r = converterDir(['--dir', join(raiz, 'mdc'), dst]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dst, 'security.md')), 'o script não apaga nada');
    assert.match(r.stdout, /AVISO - .*security\.md.* duplica .*harness/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
