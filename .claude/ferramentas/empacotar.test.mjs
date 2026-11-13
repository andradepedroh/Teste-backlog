// Harness Elo v2 — Plano 7. O empacotar.mjs: o zip certo, ou nenhum.
//
// DOIS NÍVEIS. O núcleo (`decidir`) é puro e cada recusa tem o seu teste, com a FRASE presa: é o
// que quem mantém lê quando a ferramenta para. A casca roda num repositório git de verdade, em
// `mkdtemp`, porque `git status`, `git ls-tree` e `git archive` não têm substituto de memória que
// prove a composição dos argumentos — mesma razão da seção "a casca de verdade" do promocao.test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, openSync, readSync, closeSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { decidir, nomeDoArquivo, dentroDe, manter, PROIBIDOS, EXIGIDOS, EXCLUSOES, RE_VERSAO } from './empacotar.mjs';

const ESTE_DIR = dirname(fileURLToPath(import.meta.url));

/** Fatos de um template limpo, prontos para empacotar; cada teste sobrescreve um. */
function fatos(over = {}) {
  return {
    ehTemplate: true,
    nome: 'harness-elo-v2',
    versao: '2.1.0',
    arvoreSuja: 0,
    headSha: 'a'.repeat(40),
    tagSha: null,
    entradas: [...EXIGIDOS, 'README.md', '.claude/hooks/kit.mjs'],
    zipJaExiste: false,
    caminhoDoZip: 'C:/saida/harness-elo-v2-2.1.0.zip',
    ...over,
  };
}

// ————————————————————————— núcleo puro —————————————————————————

test('nomeDoArquivo: nome do harness.json mais a versão (Decisão 61)', () => {
  assert.equal(nomeDoArquivo('harness-elo-v2', '2.1.0'), 'harness-elo-v2-2.1.0.zip');
});

test('RE_VERSAO aceita X.Y.Z e recusa o resto', () => {
  for (const ok of ['2.1.0', '0.0.1', '10.20.30']) assert.ok(RE_VERSAO.test(ok), ok);
  for (const nao of ['2.1', 'v2.1.0', '2.1.0-rc1', '', '2.1.0 ']) assert.ok(!RE_VERSAO.test(nao), JSON.stringify(nao));
});

test('caminho feliz: template limpo, versão válida, árvore limpa → empacotar, com o nome', () => {
  const d = decidir(fatos());
  assert.equal(d.acao, 'empacotar');
  assert.equal(d.codigo, null);
  assert.equal(d.motivo, null);
  assert.equal(d.nomeDoArquivo, 'harness-elo-v2-2.1.0.zip');
});

test('recusa 1: fora do template', () => {
  const d = decidir(fatos({ ehTemplate: false }));
  assert.equal(d.acao, 'recusar');
  assert.equal(d.codigo, 'fora-do-template');
  assert.equal(d.motivo, 'Isto não é o template (sem `.harness-template` na raiz). O zip é gerado por quem mantém o harness, na cópia do template.');
});

test('recusa 2: harness.json sem nome ou sem versão válida', () => {
  const semVersao = decidir(fatos({ versao: null }));
  assert.equal(semVersao.codigo, 'harness-json-invalido');
  assert.equal(semVersao.motivo, 'harness.json sem `versao` válida (X.Y.Z) — encontrado: null.');
  const versaoRuim = decidir(fatos({ versao: '2.1' }));
  assert.equal(versaoRuim.codigo, 'harness-json-invalido');
  assert.equal(versaoRuim.motivo, 'harness.json sem `versao` válida (X.Y.Z) — encontrado: "2.1".');
  const semNome = decidir(fatos({ nome: null }));
  assert.equal(semNome.codigo, 'harness-json-invalido');
  assert.equal(semNome.motivo, 'harness.json sem `nome` — é ele que dá o nome do zip.');
});

test('recusa 3: árvore suja, com a contagem', () => {
  const d = decidir(fatos({ arvoreSuja: 2 }));
  assert.equal(d.codigo, 'arvore-suja');
  assert.equal(d.motivo, 'Árvore suja: 2 arquivo(s) fora do HEAD. Commite ou descarte antes de empacotar — o zip tem que ser reproduzível a partir da tag.');
});

test('recusa 4: a tag da versão aponta para outro commit; tag no HEAD passa', () => {
  const outro = decidir(fatos({ tagSha: 'b'.repeat(40) }));
  assert.equal(outro.codigo, 'tag-em-outro-commit');
  assert.equal(outro.motivo, `A versão 2.1.0 já foi publicada em ${'b'.repeat(7)} e este HEAD é ${'a'.repeat(7)}. Suba a versão (Decisão 56).`);
  assert.equal(decidir(fatos({ tagSha: 'a'.repeat(40) })).acao, 'empacotar');
});

test('recusa 5: entrada proibida na árvore — arquivo, diretório na raiz, diretório aninhado', () => {
  for (const [entrada, esperado] of [
    ['.harness-template', '.harness-template'],
    ['node_modules/x/index.js', 'node_modules/x/index.js'],
    ['pacote/node_modules/y.js', 'pacote/node_modules/y.js'],
    ['.git/config', '.git/config'],
    ['sub/.harness-template/x.txt', 'sub/.harness-template/x.txt'],
    ['.harness-template/x.txt', '.harness-template/x.txt'],
  ]) {
    const d = decidir(fatos({ entradas: [...EXIGIDOS, entrada] }));
    assert.equal(d.codigo, 'entrada-proibida', entrada);
    assert.equal(d.motivo, `A árvore do HEAD contém \`${esperado}\`, que não pode viajar no zip.`);
  }
  // parecido não é igual: estes passam
  assert.equal(decidir(fatos({ entradas: [...EXIGIDOS, 'docs/harness-template.md', 'src/node_modules_lista.txt', 'node_modules', '.git'] })).acao, 'empacotar');
});

test('recusa 6: arquivo exigido ausente — o primeiro que faltar, na ordem de EXIGIDOS', () => {
  const d = decidir(fatos({ entradas: ['CLAUDE.md', '.claude/settings.json'] }));
  assert.equal(d.codigo, 'exigido-ausente');
  assert.equal(d.motivo, 'A árvore do HEAD não tem `harness.json` — o pacote estaria incompleto.');
});

test('recusa 7: o zip já existe no destino', () => {
  const d = decidir(fatos({ zipJaExiste: true }));
  assert.equal(d.codigo, 'zip-ja-existe');
  assert.equal(d.motivo, '`C:/saida/harness-elo-v2-2.1.0.zip` já existe. Não se sobrescreve zip gerado; apague-o à mão se for refazer.');
});

test('a ordem das recusas é a da spec: identidade antes de estado — fora do template vence árvore suja', () => {
  assert.equal(decidir(fatos({ ehTemplate: false, arvoreSuja: 3, versao: null })).codigo, 'fora-do-template');
  assert.equal(decidir(fatos({ versao: null, arvoreSuja: 3 })).codigo, 'harness-json-invalido');
  assert.equal(decidir(fatos({ arvoreSuja: 3, tagSha: 'b'.repeat(40) })).codigo, 'arvore-suja');
  assert.equal(decidir(fatos({ tagSha: 'b'.repeat(40), entradas: ['x'] })).codigo, 'tag-em-outro-commit');
  assert.equal(decidir(fatos({ tagSha: 'b'.repeat(40), entradas: ['.harness-template'] })).codigo, 'tag-em-outro-commit');
  assert.equal(decidir(fatos({ entradas: ['.harness-template'] })).codigo, 'entrada-proibida');
  assert.equal(decidir(fatos({ entradas: ['harness.json'], zipJaExiste: true })).codigo, 'exigido-ausente');
});

test('PROIBIDOS e EXIGIDOS são os da spec §3', () => {
  assert.deepEqual(PROIBIDOS, ['.git/', '.harness-template', 'node_modules/']);
  assert.deepEqual(EXIGIDOS, ['harness.json', 'CLAUDE.md', '.claude/settings.json']);
});


test('EXCLUSOES é o registro e a governança que não viajam — irmã da EXCLUSOES do gerar-kiro', () => {
  assert.deepEqual(EXCLUSOES, ['docs/', '.superpowers/', '.azuredevops/']);
});

test('EXCLUSOES só tem entrada de topo: aninhada exigiria expandir o pathspec do irmão, e hoje não há caso', () => {
  for (const e of EXCLUSOES) assert.ok(!e.replace(/\/$/, '').includes('/'), `${e} não é entrada de topo`);
});

test('manter: tira as excluídas do topo, preserva a ordem do git, e exclusão ausente não deixa caminho morto', () => {
  const topo = ['.claude', '.gitignore', 'CLAUDE.md', '.superpowers', 'docs', 'harness.json', 'inputs', 'outputs', 'README.md'];
  assert.deepEqual(manter(topo), ['.claude', '.gitignore', 'CLAUDE.md', 'harness.json', 'inputs', 'outputs', 'README.md']);
  assert.deepEqual(manter(['CLAUDE.md', 'harness.json']), ['CLAUDE.md', 'harness.json']);
});

test('manter: o baseline do ADO (.azuredevops/) não viaja no zip — Plano 10, Decisão 65', () => {
  const topo = ['.azuredevops', '.claude', '.gitignore', 'CLAUDE.md', 'harness.json', 'README.md'];
  assert.deepEqual(manter(topo), ['.claude', '.gitignore', 'CLAUDE.md', 'harness.json', 'README.md']);
});

test('manter: a exclusão casa a entrada de topo inteira — não casa prefixo nem homônimo aninhado', () => {
  assert.deepEqual(manter(['docs-do-projeto', 'documentos', 'docs']), ['docs-do-projeto', 'documentos']);
});
// ————————————————————— a casca de verdade, num repositório de verdade —————————————————————

const gitEm = (dir, args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();

/** Um template mínimo: os três exigidos, o .gitignore com o marcador, o marcador, um commit. */
function templateFixture({ nome = 'fixture-empacotar', versao = '0.0.1', comMarcador = true, extras = {} } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'empacotar-'));
  mkdirSync(join(raiz, '.claude'), { recursive: true });
  writeFileSync(join(raiz, 'harness.json'), JSON.stringify({ nome, versao }, null, 2) + '\n');
  writeFileSync(join(raiz, 'CLAUDE.md'), '# regras\n');
  writeFileSync(join(raiz, '.claude', 'settings.json'), '{}\n');
  writeFileSync(join(raiz, '.gitignore'), '.harness-template\n');
  for (const [rel, conteudo] of Object.entries(extras)) {
    mkdirSync(join(raiz, dirname(rel)), { recursive: true });
    writeFileSync(join(raiz, rel), conteudo);
  }
  gitEm(raiz, ['init', '-q', '-b', 'main']);
  gitEm(raiz, ['config', 'user.email', 't@t']);
  gitEm(raiz, ['config', 'user.name', 'T']);
  gitEm(raiz, ['add', '.']);
  gitEm(raiz, ['commit', '-q', '-m', 'inicial']);
  if (comMarcador) writeFileSync(join(raiz, '.harness-template'), '');
  return raiz;
}

/** Roda a ferramenta como comando; devolve { codigo, stdout } sem lançar. */
function rodarNa(raiz, args) {
  try {
    const stdout = execFileSync(process.execPath, [join(ESTE_DIR, 'empacotar.mjs'), ...args], { cwd: raiz, encoding: 'utf8' });
    return { codigo: 0, stdout };
  } catch (e) {
    return { codigo: e.status, stdout: String(e.stdout || '') };
  }
}

const primeirosBytes = (p, n) => {
  const fd = openSync(p, 'r');
  const b = Buffer.alloc(n);
  const lidos = readSync(fd, b, 0, n, 0);
  closeSync(fd);
  return b.subarray(0, lidos).toString('latin1');
};

test('casca: --saida gera <nome>-<versao>.zip com assinatura PK, sai com 0 e imprime EMPACOTADO', () => {
  const raiz = templateFixture();
  const saida = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r.codigo, 0, r.stdout);
  const zip = join(saida, 'fixture-empacotar-0.0.1.zip');
  assert.ok(existsSync(zip), 'o zip não foi escrito');
  assert.equal(primeirosBytes(zip, 2), 'PK');
  assert.match(r.stdout, /^EMPACOTADO — fixture-empacotar-0\.0\.1\.zip/m);
  assert.match(r.stdout, /versão 0\.0\.1 · HEAD [0-9a-f]{7} · 4 entradas · /);
  assert.match(r.stdout, /Próximo passo: copie para a pasta compartilhada/);
  assert.ok(r.stdout.includes("faria (README.md, Instalação)."));
  // segunda execução no mesmo destino: recusa 7, e o zip original fica intacto
  const r2 = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r2.codigo, 1);
  assert.match(r2.stdout, /^RECUSADO — `.*fixture-empacotar-0\.0\.1\.zip` já existe\./m);
  assert.ok(existsSync(zip));
});

test('casca: sem --saida é relatório — nada escrito, exit 0, diz o que faria', () => {
  const raiz = templateFixture();
  const r = rodarNa(raiz, []);
  assert.equal(r.codigo, 0, r.stdout);
  assert.match(r.stdout, /^RELATÓRIO — nada foi escrito/m);
  assert.match(r.stdout, /fixture-empacotar-0\.0\.1\.zip · versão 0\.0\.1 · HEAD [0-9a-f]{7} · 4 entradas · árvore limpa · template: sim/);
  assert.deepEqual(readdirSync(raiz).filter((f) => f.endsWith('.zip')), []);
});

test('casca: árvore suja de verdade → recusa 3, exit 1, nenhum zip', () => {
  const raiz = templateFixture();
  writeFileSync(join(raiz, 'rascunho.md'), 'não commitado\n');
  const saida = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — Árvore suja: 1 arquivo\(s\) fora do HEAD\./m);
  assert.deepEqual(readdirSync(saida), []);
});

test('casca: sem .harness-template → recusa 1, mesmo com tudo o mais em ordem', () => {
  const raiz = templateFixture({ comMarcador: false });
  const saida = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — Isto não é o template/m);
  assert.deepEqual(readdirSync(saida), []);
});

test('casca: pasta que não é repositório git nem template → recusa 1, sem stack trace (Decisão 59)', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'nao-repo-'));
  writeFileSync(join(raiz, 'harness.json'), JSON.stringify({ nome: 'x', versao: '1.0.0' }) + '\n');
  const saida = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — Isto não é o template/m);
  assert.deepEqual(readdirSync(saida), []);
});

test('casca: tag v<versao> no HEAD passa; tag em outro commit → recusa 4', () => {
  const raiz = templateFixture();
  gitEm(raiz, ['tag', '-a', 'v0.0.1', '-m', 'v0.0.1']);
  const saida1 = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  assert.equal(rodarNa(raiz, ['--saida', saida1]).codigo, 0);
  // um commit a mais move o HEAD; a tag fica atrás
  writeFileSync(join(raiz, 'CLAUDE.md'), '# regras\n\nmudou\n');
  gitEm(raiz, ['add', 'CLAUDE.md']);
  gitEm(raiz, ['commit', '-q', '-m', 'muda sem subir a versão']);
  const saida2 = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida2]);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — A versão 0\.0\.1 já foi publicada em [0-9a-f]{7} e este HEAD é [0-9a-f]{7}\. Suba a versão/m);
  assert.deepEqual(readdirSync(saida2), []);
});

test('casca: --saida apontando para pasta inexistente → recusa antes do git archive, nada criado', () => {
  const raiz = templateFixture();
  const inexistente = join(mkdtempSync(join(tmpdir(), 'empacotar-saida-')), 'nao-existe');
  const r = rodarNa(raiz, ['--saida', inexistente]);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — A pasta de saída `.*nao-existe` não existe\./m);
  assert.ok(!existsSync(inexistente));
});

test('casca: --saida dentro do repositório → recusa saida-dentro-do-repo, nada escrito', () => {
  const raiz = templateFixture();
  const r = rodarNa(raiz, ['--saida', raiz]);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — A pasta de saída `.*` está dentro do repositório\./m);
  assert.deepEqual(readdirSync(raiz).filter((f) => f.endsWith('.zip')), []);
});

test('casca: --saida dentro do repo com outra caixa de letra → ainda recusa (Windows não diferencia caixa)', { skip: process.platform !== 'win32' ? 'só faz sentido no Windows' : false }, () => {
  const raiz = templateFixture();
  // troca a caixa da letra do drive e de um segmento do caminho — mesmo diretório no NTFS
  const variante = raiz.replace(/^([A-Za-z]):/, (m, d) => (d === d.toUpperCase() ? d.toLowerCase() : d.toUpperCase()) + ':')
    .replace(/empacotar-/, 'EMPACOTAR-');
  const alvo = join(variante, 'saida-interna');
  mkdirSync(join(raiz, 'saida-interna'));
  const r = rodarNa(raiz, ['--saida', alvo]);
  assert.equal(r.codigo, 1, r.stdout);
  assert.match(r.stdout, /^RECUSADO — A pasta de saída `.*` está dentro do repositório\./m);
});

test('dentroDe: mesmo caminho, subpasta, pai e irmão', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'dentrode-'));
  assert.equal(dentroDe(raiz, raiz), true);
  assert.equal(dentroDe(raiz, join(raiz, 'sub')), true);
  assert.equal(dentroDe(join(raiz, 'sub'), raiz), false);
  assert.equal(dentroDe(raiz, join(dirname(raiz), 'irmao-qualquer')), false);
});

test('dentroDe: no Windows, variante de caixa da letra do drive ainda é dentro', { skip: process.platform !== 'win32' ? 'só faz sentido no Windows' : false }, () => {
  const raiz = mkdtempSync(join(tmpdir(), 'dentrode-'));
  const variante = raiz.replace(/^([A-Za-z]):/, (m, d) => (d === d.toUpperCase() ? d.toLowerCase() : d.toUpperCase()) + ':');
  assert.equal(dentroDe(raiz, variante), true);
});

test('casca: --saida sem valor (ou seguido de outra flag) → recusa de uso, exit 1', () => {
  const raiz = templateFixture();
  const semValor = rodarNa(raiz, ['--saida']);
  assert.equal(semValor.codigo, 1);
  assert.match(semValor.stdout, /^RECUSADO — Uso: node \.claude\/ferramentas\/empacotar\.mjs \[--saida <dir>\]\. --saida exige o diretório de destino\.$/m);
  const seguidoDeFlag = rodarNa(raiz, ['--saida', '--outra-flag']);
  assert.equal(seguidoDeFlag.codigo, 1);
  assert.match(seguidoDeFlag.stdout, /^RECUSADO — Uso: node \.claude\/ferramentas\/empacotar\.mjs \[--saida <dir>\]/m);
});

test('casca: relatório numa árvore suja → RECUSADO e exit 1, nada escrito', () => {
  const raiz = templateFixture();
  writeFileSync(join(raiz, 'rascunho.md'), 'não commitado\n');
  const r = rodarNa(raiz, []);
  assert.equal(r.codigo, 1);
  assert.match(r.stdout, /^RECUSADO — Árvore suja: 1 arquivo\(s\) fora do HEAD\./m);
  assert.deepEqual(readdirSync(raiz).filter((f) => f.endsWith('.zip')), []);
});

test('empacotar: git archive que falha depois de abrir o arquivo → apaga o resto e recusa com archive-falhou', async () => {
  const { empacotar } = await import('./empacotar.mjs');
  const apagados = [];
  let zipCriado = false;
  const io = {
    existe: (p) => (p.endsWith('.harness-template') ? true : p.endsWith('.zip') ? zipCriado : true),
    lerArquivo: () => JSON.stringify({ nome: 'fx', versao: '1.0.0' }),
    git: (args) => {
      if (args[0] === '--version') return 'git version 2.45.1.windows.1';
      if (args[0] === 'status') return '';
      if (args[0] === 'rev-parse') return 'c'.repeat(40);
      if (args[0] === 'ls-tree') return ['harness.json', 'CLAUDE.md', '.claude/settings.json'].join('\n');
      if (args[0] === 'archive') { zipCriado = true; throw new Error('fatal: not a valid object name'); }
      throw new Error('inesperado: ' + args.join(' '));
    },
    gitOuNull: () => null,
    lerBuffer: () => Buffer.from(""),
    escreverTemporario: (nome) => ({ caminho: `/tmp/${nome}`, limpar: () => {} }),
    tamanho: () => 0,
    primeirosBytes: () => '',
    apagar: (p) => { apagados.push(p); zipCriado = false; },
  };
  const r = empacotar('/raiz', '/saida', io);
  assert.equal(r.acao, 'recusar');
  assert.equal(r.codigo, 'archive-falhou');
  assert.match(r.motivo, /^`git archive` falhou \(fatal: not a valid object name\)\. Nada foi deixado em `.*fx-1\.0\.0\.zip`\.$/);
  assert.equal(apagados.length, 1, 'o arquivo parcial tem que ser apagado');
  assert.equal(r.escrito, false);
});

test('empacotar: zip escrito mas não passa na releitura (vazio, ou sem assinatura PK) → apaga e recusa com releitura-falhou', async () => {
  const { empacotar } = await import('./empacotar.mjs');
  const fatosBase = () => ({
    lerArquivo: () => JSON.stringify({ nome: 'fx', versao: '1.0.0' }),
    git: (args) => {
      if (args[0] === '--version') return 'git version 2.45.1.windows.1';
      if (args[0] === 'status') return '';
      if (args[0] === 'rev-parse') return 'c'.repeat(40);
      if (args[0] === 'ls-tree') return ['harness.json', 'CLAUDE.md', '.claude/settings.json'].join('\n');
      if (args[0] === 'archive') return '';
      throw new Error('inesperado: ' + args.join(' '));
    },
    gitOuNull: () => null,
    lerBuffer: () => Buffer.from(""),
    escreverTemporario: (nome) => ({ caminho: `/tmp/${nome}`, limpar: () => {} }),
  });

  // caso 1: o arquivo saiu vazio (tamanho 0)
  {
    const apagados = [];
    let zipCriado = false;
    const io = {
      ...fatosBase(),
      existe: (p) => (p.endsWith('.harness-template') ? true : p.endsWith('.zip') ? zipCriado : true),
      git: (args) => {
        if (args[0] === 'archive') { zipCriado = true; return ''; }
        return fatosBase().git(args);
      },
      tamanho: () => 0,
      primeirosBytes: () => '',
      apagar: (p) => { apagados.push(p); zipCriado = false; },
    };
    const r = empacotar('/raiz', '/saida', io);
    assert.equal(r.codigo, 'releitura-falhou');
    assert.match(r.motivo, /não passou na releitura \(vazio ou sem assinatura PK\) e foi apagado\./);
    assert.equal(apagados.length, 1);
    assert.equal(r.escrito, false);
  }

  // caso 2: o arquivo saiu com tamanho, mas sem a assinatura PK
  {
    const apagados = [];
    let zipCriado = false;
    const io = {
      ...fatosBase(),
      existe: (p) => (p.endsWith('.harness-template') ? true : p.endsWith('.zip') ? zipCriado : true),
      git: (args) => {
        if (args[0] === 'archive') { zipCriado = true; return ''; }
        return fatosBase().git(args);
      },
      tamanho: () => 10,
      primeirosBytes: () => 'XX',
      apagar: (p) => { apagados.push(p); zipCriado = false; },
    };
    const r = empacotar('/raiz', '/saida', io);
    assert.equal(r.codigo, 'releitura-falhou');
    assert.equal(apagados.length, 1);
  }
});

test('casca: docs/ e .superpowers/ versionados ficam fora do zip — a árvore tem 6, o pacote leva 4', () => {
  const raiz = templateFixture({ extras: {
    'docs/verificacoes-primeiro-dia.md': '# registro de quem mantem\n',
    '.superpowers/sdd/task-1-report.md': '# relatorio de tarefa\n',
  } });
  const naArvore = gitEm(raiz, ['ls-tree', '-r', '--name-only', 'HEAD']).split('\n').filter(Boolean);
  assert.equal(naArvore.length, 6, 'a fixture tem os dois arquivos de registro versionados');
  const saida = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r.codigo, 0, r.stdout);
  assert.match(r.stdout, /versão 0\.0\.1 · HEAD [0-9a-f]{7} · 4 entradas · /);
  assert.ok(existsSync(join(saida, 'fixture-empacotar-0.0.1.zip')));
});

test('empacotar: `git archive` e a releitura por `ls-tree` recebem o MESMO pathspec (Decisão 60)', async () => {
  const { empacotar } = await import('./empacotar.mjs');
  const TOPO = ['.claude', '.gitignore', '.superpowers', 'CLAUDE.md', 'docs', 'harness.json'];
  const chamadas = [];
  let zipCriado = false;
  const io = {
    existe: (p) => (String(p).endsWith('.zip') ? zipCriado : true),
    lerArquivo: () => JSON.stringify({ nome: 'fx', versao: '1.0.0' }),
    git: (args) => {
      chamadas.push(args);
      if (args[0] === '--version') return 'git version 2.45.1.windows.1';
      if (args[0] === 'status') return '';
      if (args[0] === 'rev-parse') return 'c'.repeat(40);
      if (args[0] === 'ls-tree') {
        return args.includes('-r')
          ? ['harness.json', 'CLAUDE.md', '.claude/settings.json'].join('\n')
          : TOPO.join('\n');
      }
      if (args[0] === 'archive') { zipCriado = true; return ''; }
      throw new Error('inesperado: ' + args.join(' '));
    },
    gitOuNull: () => null,
    lerBuffer: () => Buffer.from(""),
    escreverTemporario: (nome) => ({ caminho: `/tmp/${nome}`, limpar: () => {} }),
    tamanho: () => 10,
    primeirosBytes: () => 'PK',
    apagar: () => {},
  };
  const r = empacotar('/raiz', '/saida', io);
  assert.equal(r.acao, 'empacotar', r.motivo);
  const pathspec = (args) => { const i = args.indexOf('--'); assert.ok(i > 0, `sem separador --: ${args.join(' ')}`); return args.slice(i + 1); };
  const doLs = pathspec(chamadas.find((a) => a[0] === 'ls-tree' && a.includes('-r')));
  const doArchive = pathspec(chamadas.find((a) => a[0] === 'archive'));
  assert.deepEqual(doLs, manter(TOPO));
  assert.deepEqual(doArchive, doLs, 'pathspec diferente faria a releitura descrever outro zip');
  assert.ok(!doArchive.includes('docs') && !doArchive.includes('.superpowers'));
  // Decisão 67: o manifesto entra por --add-file, ANTES do tree-ish (depois dele seria pathspec)
  const archive = chamadas.find((a) => a[0] === 'archive');
  const iAdd = archive.findIndex((a) => a.startsWith('--add-file=') && a.endsWith('harness-zona.lock.json'));
  assert.ok(iAdd > 0 && iAdd < archive.indexOf('HEAD'), `sem --add-file do manifesto antes do HEAD: ${archive.join(' ')}`);
});

test('casca: o zip leva o manifesto da zona, e o pacote extraído confere (Decisão 67)', () => {
  const raiz = templateFixture({ extras: { '.claude/hooks/kit.mjs': 'export const a = 1;\r\n', 'outputs/x.md': 'projeto\n' } });
  const saida = mkdtempSync(join(tmpdir(), 'empacotar-saida-'));
  const r = rodarNa(raiz, ['--saida', saida]);
  assert.equal(r.codigo, 0, r.stdout);
  const zip = join(saida, 'fixture-empacotar-0.0.1.zip');
  // Extrai com o bsdtar, que lê zip: no Windows ele é o `System32\tar.exe` — o `tar` do PATH pode ser
  // o GNU do Git, que não lê. Sem extrator, sobra conferir que o nome está no diretório do zip.
  const bsdtar = process.platform === 'win32' ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar';
  const destino = mkdtempSync(join(tmpdir(), 'empacotar-extraido-'));
  let extraiu = true;
  try { execFileSync(bsdtar, ['-xf', zip, '-C', destino], { stdio: 'ignore' }); } catch { extraiu = false; }
  if (!extraiu) {
    assert.notEqual(process.platform, 'win32', 'no Windows o System32\\tar.exe existe e tem que extrair');
    assert.ok(readFileSync(zip).includes('harness-zona.lock.json'), 'o manifesto não está no zip');
    return;
  }
  assert.ok(existsSync(join(destino, 'harness-zona.lock.json')), 'o manifesto não está na raiz do zip');
  assert.ok(!existsSync(join(raiz, 'harness-zona.lock.json')), 'o manifesto não pode sujar o template');
  const verificar = (dir) => {
    try {
      return { codigo: 0, stdout: execFileSync(process.execPath, [join(ESTE_DIR, 'verificar-zona.mjs'), '--raiz', dir], { encoding: 'utf8' }) };
    } catch (e) { return { codigo: e.status, stdout: String(e.stdout || '') }; }
  };
  const ok = verificar(destino);
  assert.equal(ok.codigo, 0, ok.stdout);
  assert.match(ok.stdout, /versão 0\.0\.1/);
  writeFileSync(join(destino, 'CLAUDE.md'), 'editado no projeto\n');
  const ruim = verificar(destino);
  assert.equal(ruim.codigo, 1, ruim.stdout);
  assert.match(ruim.stdout, /CLAUDE\.md/);
});

test('colherFatos: topo inteiro excluído → nenhuma entrada, e nenhum `ls-tree` sem pathspec (que listaria tudo)', async () => {
  const { colherFatos } = await import('./empacotar.mjs');
  const chamadas = [];
  const io = {
    existe: () => true,
    lerArquivo: () => JSON.stringify({ nome: 'fx', versao: '1.0.0' }),
    git: (args) => {
      chamadas.push(args);
      if (args[0] === 'status') return '';
      if (args[0] === 'rev-parse') return 'c'.repeat(40);
      if (args[0] === 'ls-tree') return ['docs', '.superpowers'].join('\n');
      throw new Error('inesperado: ' + args.join(' '));
    },
    gitOuNull: () => null,
    lerBuffer: () => Buffer.from(""),
    escreverTemporario: (nome) => ({ caminho: `/tmp/${nome}`, limpar: () => {} }),
  };
  const f = colherFatos('/raiz', '/saida', io);
  assert.deepEqual(f.entradas, []);
  assert.equal(chamadas.filter((a) => a[0] === 'ls-tree').length, 1, 'só o listamento do topo; o recursivo sem pathspec listaria a árvore inteira');
  assert.equal(decidir(f).codigo, 'exigido-ausente');
});

// ——————————————— as duas falhas que não são do `git archive` ———————————————
//
// O `catch` em volta do archive pegava também o manifesto (`manifestoDoPacote`, `escreverTemporario`)
// e devolvia `archive-falhou` — quem mantém ia investigar o git por um arquivo ilegível. E o
// `--add-file` só existe no Git 2.35+: num Git mais velho o archive morria com "unknown option",
// sem dizer que o problema era a versão.

/** `io` de memória que chega até o archive; `sobrepor` troca uma operação. */
function ioAteOArchive(sobrepor = {}) {
  const estado = { chamadas: [], apagados: [], zipCriado: false };
  const io = {
    existe: (p) => (String(p).endsWith('.zip') ? estado.zipCriado : true),
    lerArquivo: () => JSON.stringify({ nome: 'fx', versao: '1.0.0' }),
    git: (args) => {
      estado.chamadas.push(args);
      if (args[0] === '--version') return 'git version 2.45.1.windows.1';
      if (args[0] === 'status') return '';
      if (args[0] === 'rev-parse') return 'c'.repeat(40);
      if (args[0] === 'ls-tree') return ['harness.json', 'CLAUDE.md', '.claude/settings.json'].join('\n');
      if (args[0] === 'archive') { estado.zipCriado = true; return ''; }
      throw new Error('inesperado: ' + args.join(' '));
    },
    gitOuNull: () => null,
    lerBuffer: () => Buffer.from(''),
    escreverTemporario: (nome) => ({ caminho: `/tmp/${nome}`, limpar: () => {} }),
    tamanho: () => 10,
    primeirosBytes: () => 'PK',
    apagar: (p) => { estado.apagados.push(p); estado.zipCriado = false; },
    ...sobrepor,
  };
  return { io, estado };
}

test('empacotar: arquivo ilegível no manifesto → manifesto-falhou, e o archive nem roda', async () => {
  const { empacotar } = await import('./empacotar.mjs');
  const { io, estado } = ioAteOArchive({ lerBuffer: () => { throw new Error('EACCES: permission denied'); } });
  const r = empacotar('/raiz', '/saida', io);
  assert.equal(r.acao, 'recusar');
  assert.equal(r.codigo, 'manifesto-falhou');
  assert.match(r.motivo, /manifesto/);
  assert.match(r.motivo, /EACCES/);
  assert.ok(!/git archive/.test(r.motivo), 'a mensagem não pode culpar o git archive');
  assert.ok(!estado.chamadas.some((a) => a[0] === 'archive'), 'o archive não pode rodar sem manifesto');
  assert.equal(r.escrito, false);
});

test('empacotar: temporário que não grava → manifesto-falhou', async () => {
  const { empacotar } = await import('./empacotar.mjs');
  const { io, estado } = ioAteOArchive({ escreverTemporario: () => { throw new Error('ENOSPC: no space left'); } });
  const r = empacotar('/raiz', '/saida', io);
  assert.equal(r.codigo, 'manifesto-falhou');
  assert.match(r.motivo, /ENOSPC/);
  assert.ok(!estado.chamadas.some((a) => a[0] === 'archive'));
});

test('empacotar: Git anterior ao 2.35 → git-antigo, antes de escrever qualquer coisa', async () => {
  const { empacotar } = await import('./empacotar.mjs');
  let temporarios = 0;
  const base = ioAteOArchive();
  const { io, estado } = ioAteOArchive({
    git: (args) => (args[0] === '--version' ? 'git version 2.34.1' : base.io.git(args)),
    escreverTemporario: (nome) => { temporarios++; return { caminho: `/tmp/${nome}`, limpar: () => {} }; },
  });
  const r = empacotar('/raiz', '/saida', io);
  assert.equal(r.acao, 'recusar');
  assert.equal(r.codigo, 'git-antigo');
  assert.match(r.motivo, /2\.34\.1/);
  assert.match(r.motivo, /2\.35/);
  assert.equal(temporarios, 0, 'nenhum temporário escrito');
  assert.ok(!base.estado.chamadas.some((a) => a[0] === 'archive'));
  assert.equal(estado.apagados.length, 0);
});

test('versaoDoGit: lê o `git --version` das plataformas, e devolve null no que não entende', async () => {
  const { versaoDoGit, gitSuportaAddFile } = await import('./empacotar.mjs');
  assert.deepEqual(versaoDoGit('git version 2.45.1.windows.1'), [2, 45, 1]);
  assert.deepEqual(versaoDoGit('git version 2.35.0'), [2, 35, 0]);
  assert.deepEqual(versaoDoGit('git version 2.39.3 (Apple Git-145)'), [2, 39, 3]);
  assert.equal(versaoDoGit('não é git'), null);
  assert.equal(gitSuportaAddFile([2, 35, 0]), true);
  assert.equal(gitSuportaAddFile([2, 34, 9]), false);
  assert.equal(gitSuportaAddFile([2, 9, 0]), false);
  assert.equal(gitSuportaAddFile([3, 0, 0]), true);
  assert.equal(gitSuportaAddFile(null), false);
});
