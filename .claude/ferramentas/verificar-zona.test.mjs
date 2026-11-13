import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  MANIFESTO, MARCADOR_TEMPLATE, hashConteudo, naZona, ignorado, montarManifesto, serializar,
  lerManifesto, comparar, decidir, colherFatos, hashesDaZona, manifestoDeArvore, formatarTexto,
  PASTA_DE_AGENTES, PASTA_DE_SKILLS,
} from './verificar-zona.mjs';
import {
  MARCADOR_TEMPLATE as MARCADOR_DO_HOOK, MANIFESTO_DA_ZONA,
  PASTA_DE_AGENTES as PASTA_DO_HOOK_AGENTES, PASTA_DE_SKILLS as PASTA_DO_HOOK_SKILLS,
} from '../hooks/zonas.mjs';

const CLI = join(dirname(fileURLToPath(import.meta.url)), 'verificar-zona.mjs');
const ZONA = ['CLAUDE.md', MANIFESTO, '.claude/hooks/', '.claude/settings.json'];

/** Um projeto mínimo em disco, com a zona e o manifesto montado sobre ela — como sai do pacote. */
function projeto({ versao = '2.6.0', comManifesto = true } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'verificar-zona-'));
  const arquivos = {
    'CLAUDE.md': '# regras\n',
    '.claude/hooks/kit.mjs': 'export const a = 1;\n',
    '.claude/hooks/sub/b.mjs': 'export const b = 2;\n',
    '.claude/settings.json': '{}\n',
    '.claude/rules/projeto.md': 'zona mutável\n',
    'outputs/x.md': 'do projeto\n',
    'harness.json': JSON.stringify({ versao }),
  };
  for (const [rel, txt] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true });
    writeFileSync(join(raiz, rel), txt);
  }
  if (comManifesto) {
    const m = montarManifesto({ versao, zona: ZONA, arquivos: Object.entries(arquivos).map(([r, t]) => [r, Buffer.from(t)]) });
    writeFileSync(join(raiz, MANIFESTO), serializar(m));
  }
  return raiz;
}

const git = (raiz, ...args) => {
  const r = spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'core.autocrlf=false', ...args], { cwd: raiz, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
};

const rodar = (raiz, ...args) => spawnSync('node', [CLI, '--raiz', raiz, ...args], { encoding: 'utf8' });

// ————————————————————————————— núcleo —————————————————————————————

test('o marcador é o mesmo do hook — dois literais, um conceito', () => {
  assert.equal(MARCADOR_TEMPLATE, MARCADOR_DO_HOOK);
});

test('hashConteudo: CRLF e LF são o mesmo texto; binário é hasheado cru', () => {
  assert.equal(hashConteudo(Buffer.from('a\r\nb\r\n')), hashConteudo(Buffer.from('a\nb\n')));
  assert.notEqual(hashConteudo(Buffer.from('a\nb\n')), hashConteudo(Buffer.from('a\nc\n')));
  const bin = Buffer.from([0, 13, 10, 1]);
  assert.notEqual(hashConteudo(bin), hashConteudo(Buffer.from([0, 10, 1])), 'binário não normaliza');
});

test('naZona: diretório pega o conteúdo, arquivo é exato', () => {
  assert.ok(naZona('.claude/hooks/kit.mjs', ZONA));
  assert.ok(naZona('CLAUDE.md', ZONA));
  assert.ok(!naZona('CLAUDE.md.bak', ZONA));
  assert.ok(!naZona('.claude/rules/projeto.md', ZONA));
  assert.ok(!naZona('.claude/hooksx/a.mjs', ZONA));
});

test('ignorado: lixo de execução não é maquinário', () => {
  for (const rel of ['.claude/skills/x/node_modules/a.js', '.claude/skills/x/__pycache__/a.pyc', '.claude/a.pyc']) {
    assert.ok(ignorado(rel), rel);
  }
  assert.ok(!ignorado('.claude/skills/x/SKILL.md'));
});

test('ignorado: o hook nativo do Kiro em .kiro/hooks/ é do projeto, não do harness', () => {
  assert.ok(ignorado('.kiro/hooks/meu.kiro.hook'));
  assert.ok(!ignorado('.kiro/hooks/zonas.mjs'), 'o código dos hooks do harness continua na zona');
});

test('montarManifesto: só a zona entra, em ordem, e o mesmo pacote dá o mesmo manifesto', () => {
  const arquivos = [['outputs/x.md', 'a'], ['.claude/hooks/b.mjs', 'b'], ['CLAUDE.md', 'c'], ['.claude/hooks/a.mjs', 'd']];
  const m = montarManifesto({ versao: '1.0.0', zona: ZONA, arquivos });
  assert.deepEqual(Object.keys(m.arquivos), ['.claude/hooks/a.mjs', '.claude/hooks/b.mjs', 'CLAUDE.md']);
  assert.equal(serializar(m), serializar(montarManifesto({ versao: '1.0.0', zona: ZONA, arquivos: [...arquivos].reverse() })));
  assert.deepEqual(lerManifesto(serializar(m)), m);
});

test('o manifesto está na zona mas não se descreve', () => {
  const m = montarManifesto({ versao: '1.0.0', zona: ZONA, arquivos: [[MANIFESTO, '{}'], ['CLAUDE.md', 'c']] });
  assert.deepEqual(Object.keys(m.arquivos), ['CLAUDE.md']);
});

test('o manifesto é zona imutável do template — o agente do clone não o reescreve', async () => {
  const { ZONA_IMUTAVEL } = await import('../hooks/kit.mjs');
  assert.ok(ZONA_IMUTAVEL.includes(MANIFESTO));
});

test('lerManifesto recusa forma inesperada', () => {
  assert.throws(() => lerManifesto('{"formato":99}'), /forma esperada/);
});

test('comparar separa alterado, ausente e novo', () => {
  const m = { arquivos: { a: '1', b: '2', c: '3' } };
  assert.deepEqual(comparar(m, { a: '1', b: 'X', d: '4' }), { alterados: ['b'], ausentes: ['c'], extras: ['d'] });
});

test('decidir: template sem manifesto passa; projeto sem manifesto é status 2', () => {
  assert.equal(decidir({ ehTemplate: true, manifesto: null }).status, 0);
  const r = decidir({ ehTemplate: false, manifesto: null });
  assert.equal(r.status, 2);
  assert.equal(r.codigo, 'sem-manifesto');
});

test('decidir: PR que apaga o manifesto e versiona o marcador não passa como template', () => {
  const r = decidir({ ehTemplate: true, manifesto: null, manifestoBase: { texto: '{}', versao: '2.5.0' } });
  assert.equal(r.status, 1);
  assert.equal(r.codigo, 'manifesto-removido');
  assert.equal(decidir({ ehTemplate: true, manifesto: null, manifestoBase: { texto: null, versao: null } }).codigo, 'template',
    'base sem manifesto (primeira instalação ou o próprio template) continua sendo template');
});

test('decidir: versão do manifesto tem que bater com a do harness.json', () => {
  const r = decidir({ manifesto: { versao: '1.0.0', arquivos: {} }, versaoHarness: '1.1.0', atuais: {} });
  assert.equal(r.codigo, 'versao-divergente');
});

test('decidir: manifesto editado sem mudar de versão falha; com versão nova é atualização', () => {
  const manifesto = { versao: '2.0.0', arquivos: {} };
  const igual = { manifesto, manifestoTexto: 'B', versaoHarness: '2.0.0', atuais: {} };
  assert.equal(decidir({ ...igual, manifestoBase: { texto: 'A', versao: '2.0.0' } }).codigo, 'manifesto-editado');
  const upd = decidir({ ...igual, manifestoBase: { texto: 'A', versao: '1.9.0' } });
  assert.equal(upd.codigo, 'ok');
  assert.match(upd.motivo, /1\.9\.0 → 2\.0\.0/);
  assert.equal(decidir({ ...igual, manifestoTexto: 'A', manifestoBase: { texto: 'A', versao: '2.0.0' } }).codigo, 'ok');
});

// ————————————————————————————— disco —————————————————————————————

test('projeto recém-extraído confere', () => {
  const raiz = projeto();
  try {
    const r = decidir(colherFatos(raiz));
    assert.equal(r.codigo, 'ok', r.motivo);
    assert.match(r.motivo, /4 arquivos/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('RED→GREEN: editar, apagar ou criar na zona é pego; mexer na zona mutável não', () => {
  const raiz = projeto();
  try {
    writeFileSync(join(raiz, '.claude/rules/projeto.md'), 'mudou\n');
    writeFileSync(join(raiz, 'outputs/x.md'), 'mudou\n');
    assert.equal(decidir(colherFatos(raiz)).codigo, 'ok', 'zona mutável é livre');

    writeFileSync(join(raiz, '.claude/hooks/kit.mjs'), 'export const a = 2;\n');
    unlinkSync(join(raiz, '.claude/hooks/sub/b.mjs'));
    writeFileSync(join(raiz, '.claude/hooks/novo.mjs'), 'x\n');
    const r = decidir(colherFatos(raiz));
    assert.equal(r.codigo, 'zona-divergente');
    assert.equal(r.status, 1);
    assert.deepEqual(r.divergencias, {
      alterados: ['.claude/hooks/kit.mjs'], ausentes: ['.claude/hooks/sub/b.mjs'], extras: ['.claude/hooks/novo.mjs'],
    });
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('encolher a zona do harness.json não esconde nada — a lista vem do manifesto', () => {
  const raiz = projeto();
  try {
    writeFileSync(join(raiz, 'harness.json'), JSON.stringify({ versao: '2.6.0', zonaImutavel: [] }));
    writeFileSync(join(raiz, '.claude/hooks/kit.mjs'), 'adulterado\n');
    assert.equal(decidir(colherFatos(raiz)).codigo, 'zona-divergente');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('CRLF na zona não é divergência', () => {
  const raiz = projeto();
  try {
    writeFileSync(join(raiz, 'CLAUDE.md'), '# regras\r\n');
    assert.equal(decidir(colherFatos(raiz)).codigo, 'ok');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('node_modules dentro da zona não conta', () => {
  const raiz = projeto();
  try {
    mkdirSync(join(raiz, '.claude/hooks/node_modules/x'), { recursive: true });
    writeFileSync(join(raiz, '.claude/hooks/node_modules/x/i.js'), 'x');
    // A ordem esperada também é ORDENADA, não escrita à mão: nas saídas geradas os caminhos são
    // reescritos (`.claude/settings.json` vira `.cursor/hooks.json`) e a ordem alfabética muda.
    assert.deepEqual(
      Object.keys(hashesDaZona(raiz, ZONA)).sort(),
      ['.claude/hooks/kit.mjs', '.claude/hooks/sub/b.mjs', '.claude/settings.json', 'CLAUDE.md'].sort(),
    );
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

// ————————————————————————————— CLI e --base —————————————————————————————

test('CLI: 0 quando confere, 1 quando diverge, 2 sem manifesto', () => {
  const raiz = projeto();
  const sem = projeto({ comManifesto: false });
  try {
    assert.equal(rodar(raiz).status, 0);
    writeFileSync(join(raiz, 'CLAUDE.md'), 'mudou\n');
    const r = rodar(raiz);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FALHOU/);
    assert.match(r.stdout, /CLAUDE\.md/);
    assert.equal(rodar(sem).status, 2);
    writeFileSync(join(sem, MARCADOR_TEMPLATE), '');
    assert.equal(rodar(sem).status, 0, 'o template não tem manifesto e passa');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
    rmSync(sem, { recursive: true, force: true });
  }
});

test('CLI --base: manifesto adulterado junto com a zona, sem subir versão, falha no PR', () => {
  const raiz = projeto();
  try {
    git(raiz, 'init', '-q', '-b', 'main');
    git(raiz, 'add', '-A');
    git(raiz, 'commit', '-q', '-m', 'base');
    // O ataque honesto: edita a zona e regenera o manifesto para "bater".
    writeFileSync(join(raiz, 'CLAUDE.md'), 'adulterado\n');
    const arquivos = [['CLAUDE.md', 'adulterado\n'], ['.claude/hooks/kit.mjs', 'export const a = 1;\n'],
      ['.claude/hooks/sub/b.mjs', 'export const b = 2;\n'], ['.claude/settings.json', '{}\n']];
    writeFileSync(join(raiz, MANIFESTO), serializar(montarManifesto({ versao: '2.6.0', zona: ZONA, arquivos })));
    assert.equal(rodar(raiz).status, 0, 'sem base, o manifesto regenerado engana — por isso o PR usa --base');
    const r = rodar(raiz, '--base', 'main');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /mudou em relação à base sem a versão mudar/);
    const ref = rodar(raiz, '--base', 'nao-existe');
    assert.equal(ref.status, 1);
    assert.match(ref.stdout, /não existe neste checkout/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('CLI --base: primeira instalação do harness (base sem manifesto) é atualização', () => {
  const raiz = projeto();
  try {
    git(raiz, 'init', '-q', '-b', 'main');
    git(raiz, 'commit', '-q', '--allow-empty', '-m', 'vazio');
    const r = rodar(raiz, '--base', 'main');
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /\(sem manifesto\) → 2\.6\.0/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('o manifesto tem o mesmo nome no hook e na ferramenta — o hook usa a ausência dele para reconhecer o template', () => {
  assert.equal(MANIFESTO_DA_ZONA, MANIFESTO);
});

test('manifestoDeArvore: foraDaVerificacao tira da zona do manifesto o lugar nativo do projeto', () => {
  const arvore = [['harness.json', Buffer.from(JSON.stringify({ versao: '1.0.0', zonaImutavel: ['AGENTS.md', '.kiro/agents/harness-elo.json'] }))], ['AGENTS.md', Buffer.from('x')]];
  const m = JSON.parse(manifestoDeArvore(arvore, { foraDaVerificacao: ['.kiro/agents/'] }));
  assert.deepEqual(m.zona, ['AGENTS.md']);
});

// ————————————————————— CRLF, marcador versionado, extensões do projeto —————————————————————

test('decidir: manifesto da base em LF e do disco em CRLF (autocrlf no Windows) NÃO é edição', () => {
  const m = { formato: 1, versao: '2.0.0', zona: ['CLAUDE.md'], arquivos: { 'CLAUDE.md': 'h' } };
  const lf = serializar(m);
  const crlf = lf.replace(/\n/g, '\r\n');
  const fatos = { manifesto: m, manifestoTexto: crlf, versaoHarness: '2.0.0', atuais: { 'CLAUDE.md': 'h' } };
  assert.equal(decidir({ ...fatos, manifestoBase: { texto: lf, versao: '2.0.0' } }).codigo, 'ok');
  // e conteúdo de verdade diferente continua sendo edição
  const outro = serializar({ ...m, arquivos: { 'CLAUDE.md': 'x' } });
  assert.equal(decidir({ ...fatos, manifestoBase: { texto: outro, versao: '2.0.0' } }).codigo, 'manifesto-editado');
});

test('decidir: .harness-template VERSIONADO reprova sempre — no template de verdade ele é ignorado pelo git', () => {
  const r = decidir({ ehTemplate: true, marcadorVersionado: true, manifesto: null });
  assert.equal(r.status, 1);
  assert.equal(r.codigo, 'marcador-versionado');
  const m = { versao: '1.0.0', zona: [], arquivos: {} };
  assert.equal(decidir({ marcadorVersionado: true, manifesto: m, manifestoTexto: '', atuais: {} }).codigo, 'marcador-versionado');
});

test('CLI sem --base: marcador versionado + manifesto apagado não passa como template', () => {
  const raiz = projeto();
  try {
    git(raiz, 'init', '-q', '-b', 'main');
    git(raiz, 'add', '-A');
    git(raiz, 'commit', '-q', '-m', 'base');
    unlinkSync(join(raiz, MANIFESTO));
    writeFileSync(join(raiz, MARCADOR_TEMPLATE), '');
    git(raiz, 'add', '-f', MARCADOR_TEMPLATE);
    const r = rodar(raiz);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /versionado/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('extensão do projeto: agente novo e skill nova passam com aviso; arquivo novo em skill do pacote não', () => {
  const zona = ['CLAUDE.md', PASTA_DE_AGENTES, PASTA_DE_SKILLS];
  const arquivos = [['CLAUDE.md', 'c'], [`${PASTA_DE_AGENTES}corretor.md`, 'a'], [`${PASTA_DE_SKILLS}spec-x/SKILL.md`, 's']];
  const m = montarManifesto({ versao: '1.0.0', zona, arquivos });
  const base = Object.fromEntries(arquivos.map(([r, t]) => [r, hashConteudo(Buffer.from(t))]));
  const fatos = (extra) => ({ manifesto: m, manifestoTexto: '', versaoHarness: '1.0.0', atuais: { ...base, ...extra } });

  const ok = decidir(fatos({ [`${PASTA_DE_AGENTES}meu.md`]: 'h', [`${PASTA_DE_SKILLS}minha/SKILL.md`]: 'h' }));
  assert.equal(ok.codigo, 'ok', ok.motivo);
  assert.deepEqual(ok.extensoes, [`${PASTA_DE_AGENTES}meu.md`, `${PASTA_DE_SKILLS}minha/SKILL.md`]);
  assert.match(formatarTexto(ok), /Extensões do projeto/);

  const ruim = decidir(fatos({ [`${PASTA_DE_SKILLS}spec-x/novo.md`]: 'h' }));
  assert.equal(ruim.codigo, 'zona-divergente');
  assert.deepEqual(ruim.divergencias.extras, [`${PASTA_DE_SKILLS}spec-x/novo.md`]);
  // editar ou apagar o que está no manifesto continua reprovando
  assert.equal(decidir(fatos({ [`${PASTA_DE_AGENTES}corretor.md`]: 'mudou' })).codigo, 'zona-divergente');
});

test('as pastas de extensão são as mesmas no hook e na ferramenta', () => {
  assert.equal(PASTA_DE_AGENTES, PASTA_DO_HOOK_AGENTES);
  assert.equal(PASTA_DE_SKILLS, PASTA_DO_HOOK_SKILLS);
});
