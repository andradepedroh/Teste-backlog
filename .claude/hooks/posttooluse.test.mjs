import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  REGISTRO, IO_REAL, criarRegistro, casaGatilho, despachar, interpretarEntrada, emitirAviso,
} from './posttooluse.mjs';
import { CABECALHO_SECAO_A, montarLinhaSecaoA } from './kit.mjs';

test('REGISTRO do PostToolUse declara os mesmos campos', () => {
  for (const v of REGISTRO) {
    assert.equal(typeof v.nome, 'string');
    assert.ok(Array.isArray(v.gatilhos) && v.gatilhos.length > 0, v.nome);
    assert.equal(typeof v.executar, 'function', v.nome);
  }
});

test('nenhum verificador de PostToolUse bloqueia — o evento é tarde demais para negar', () => {
  for (const v of REGISTRO) assert.equal(v.bloqueia, false, v.nome);
});

test('despachar do PostToolUse nunca devolve deny, nem com verificador quebrado', () => {
  const lanca = { nome: 'x', gatilhos: ['Write'], bloqueia: false, executar: () => { throw new Error('boom'); } };
  const r = despachar({ tool_name: 'Write' }, [lanca]);
  assert.equal(r.acao, 'allow');
  assert.equal(r.falhas.length, 1);
});

test('casaGatilho funciona igual ao do PreToolUse', () => {
  assert.equal(casaGatilho({ gatilhos: ['Write'] }, 'Write'), true);
  assert.equal(casaGatilho({ gatilhos: ['Write'] }, 'Bash'), false);
});

// ————— DEFEITO 1: main()/interpretarEntrada não pode confundir ausência com corrupção —————

test('interpretarEntrada libera quando o conteúdo é vazio', () => {
  const r = interpretarEntrada('');
  assert.equal(r.acao, 'allow');
  assert.equal(r.payload, null);
});

test('interpretarEntrada libera quando o conteúdo é só espaço em branco', () => {
  const r = interpretarEntrada('   \n\t  ');
  assert.equal(r.acao, 'allow');
});

test('interpretarEntrada avisa (não trava) quando o conteúdo não é vazio e é JSON malformado', () => {
  const r = interpretarEntrada('{ isto nao eh json valido');
  assert.equal(r.acao, 'aviso');
  assert.match(r.aviso, /não rodou|nao rodou/i);
});

test('interpretarEntrada segue com o payload parseado quando o JSON é válido', () => {
  const r = interpretarEntrada('{"tool_name":"Write"}');
  assert.equal(r.acao, 'prosseguir');
  assert.deepEqual(r.payload, { tool_name: 'Write' });
});

// ————————————— MJ-1: o CAMINHO DE SAÍDA, que é a única ponta que o consultor vê —————————————
//
// Quatro mutações de UMA PALAVRA deixavam a camada muda com a suíte inteira verde (rodada I):
// trocar o `hookEventName`, renomear `additionalContext`, remover o `hookSpecificOutput`, e o
// `main()` deixar de escrever no stdout. O código estava certo — era teste que faltava.
//
// Isto importa mais aqui do que parece: com o `hookEventName` errado o Claude Code simplesmente
// IGNORA o bloco. Trava declarada, gatilho verde, efeito zero — a forma exata dos cinco bypasses
// da Task 2. O irmão prende o mesmo em `pretooluse.test.mjs` (`emitirDeny devolve o JSON que o
// Claude Code espera`); o espelho foi feito na tabela e não na saída.

test('emitirAviso devolve o JSON que o Claude Code espera', () => {
  const j = JSON.parse(emitirAviso('corrija o cabeçalho'));
  assert.deepEqual(Object.keys(j), ['hookSpecificOutput']);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.equal(j.hookSpecificOutput.additionalContext, 'corrija o cabeçalho');
});

test('emitirAviso NÃO é o do irmão: `PostToolUse`, e sem os campos de permissão do PreToolUse', () => {
  // O evento é o que decide se o Claude Code lê o bloco, e os dois despachantes emitem formas
  // DIFERENTES. Copiar o do irmão (`PreToolUse` + `permissionDecision`) é a mutação de uma palavra
  // que deixa a camada muda sem nenhum vermelho.
  const j = JSON.parse(emitirAviso('x'));
  assert.notEqual(j.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(j.hookSpecificOutput.permissionDecision, undefined);
  assert.equal(j.hookSpecificOutput.permissionDecisionReason, undefined);
});

// ————————————— WIRING: o registro montado sobre `criarRegistro(io)` —————————————
//
// Os testes acima iteram o `REGISTRO` e continuavam VERDES com ele vazio — `for (const v of [])`
// não afirma nada. Os de baixo dirigem a tabela de verdade: com dublê, para medir cada ramo do
// despacho; e com o `IO_REAL`, para que o objeto que o `main()` usa não fique ligado por esperança.

/** Documento do Explore com quatro defeitos: sem versão, sem changelog, ID mal formado, `F-xxx`. */
const RUIM = [
  '# HLD Funcional',
  '',
  '## 1. Visão geral',
  '',
  'Ancorado em F-001 e na RF-7.',
].join('\n');

const RAIZ_FALSA = '/proj';

/**
 * `io` de mentira: recorta por prefixo e devolve o texto combinado, sem tocar o disco.
 *
 * `statear` entrou com o `sync-log`, que é o segundo verificador deste evento: a regra de recência
 * dele compara a coluna `Data/Hora` da Seção A com o `mtime` do artefato escrito. É a QUARTA
 * operação da casca, e o `IO_REAL` tem que oferecê-la — o teste do `IO_REAL` mede as quatro.
 */
function ioFalso({ texto = RUIM, erro = null, mtime = 0 } = {}) {
  return {
    cwd: () => RAIZ_FALSA,
    relativizar: (r, bruto) => {
      const b = String(bruto || '').replace(/\\/g, '/');
      const rr = String(r || '').replace(/\\/g, '/').replace(/\/+$/, '');
      return b.startsWith(rr + '/') ? b.slice(rr.length + 1) : null;
    },
    lerArquivo: () => {
      if (erro) throw erro;
      return texto;
    },
    statear: () => ({ mtimeMs: mtime }),
  };
}

test('WIRING — Write num documento do Explore mal formado devolve aviso da `gramatica`', () => {
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/hld-funcional.md', content: RUIM } },
    criarRegistro(ioFalso()),
  );
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
  assert.equal(r.avisos.length, 1, JSON.stringify(r.avisos));
  assert.equal(r.avisos[0].nome, 'gramatica');
  assert.match(r.avisos[0].aviso, /hld-funcional\.md/);
  assert.match(r.avisos[0].aviso, /RF-7/);
});

test('WIRING — NotebookEdit também dispara, e o caminho vem de `notebook_path`', () => {
  // Não basta declarar o gatilho: a Task 2 declarou `NotebookEdit` e lia `file_path`, e a
  // fiscalização de notebook ficou inexistente em silêncio, com o teste verde.
  const r = despachar(
    { tool_name: 'NotebookEdit', tool_input: { notebook_path: '/proj/outputs/explore/gaps.md', new_source: RUIM } },
    criarRegistro(ioFalso()),
  );
  assert.equal(r.avisos.length, 1, JSON.stringify(r.avisos));
  assert.match(r.avisos[0].aviso, /gaps\.md/);
});

test('WIRING — Edit também dispara: os três gatilhos de escrita, não dois', () => {
  const r = despachar(
    { tool_name: 'Edit', tool_input: { file_path: '/proj/outputs/explore/especificacao-funcional.md', new_string: RUIM } },
    criarRegistro(ioFalso()),
  );
  assert.equal(r.avisos.length, 1, JSON.stringify(r.avisos));
});

test('WIRING — escrita fora de outputs/explore não produz aviso da `gramatica`', () => {
  // `benchmark.md` é artefato terminal da `spec-benchmark`, então QUEM fala aqui é o `sync-log`.
  // A `gramatica` cala, e é isso que este teste sempre mediu: ela só valida o Explore.
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/spec/benchmark.md', content: RUIM } },
    criarRegistro(ioFalso()),
  );
  assert.deepEqual(r.falhas, []);
  assert.deepEqual(r.avisos.map((a) => a.nome), ['sync-log']);
});

test('WIRING — escrita em outputs/spec que não é artefato terminal não produz aviso nenhum', () => {
  // `modules.md` é OPTIONAL no kit: não marca conclusão de skill nenhuma. Nenhum dos dois fala.
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/spec/modules.md', content: RUIM } },
    criarRegistro(ioFalso()),
  );
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.falhas, []);
});

test('WIRING — tool que não escreve arquivo não dispara a gramatica', () => {
  const r = despachar(
    { tool_name: 'Bash', tool_input: { command: 'echo oi' } },
    criarRegistro(ioFalso()),
  );
  assert.deepEqual(r.avisos, []);
});

test('WIRING — arquivo ILEGÍVEL (EACCES) LIBERA e registra em `falhas`', () => {
  // Informativo falha ABERTO: um verificador que quebra não pode derrubar uma escrita legítima.
  // Mas silêncio total também não serve — a falha fica registrada, senão o no-op é invisível.
  const eacces = new Error('EACCES: permission denied');
  eacces.code = 'EACCES';
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
    criarRegistro(ioFalso({ erro: eacces })),
  );
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.avisos, []);
  assert.equal(r.falhas.length, 1);
  assert.equal(r.falhas[0].nome, 'gramatica');
  assert.match(r.falhas[0].erro, /EACCES/);
});

test('WIRING — arquivo AUSENTE (ENOENT) não é falha nem aviso', () => {
  const enoent = new Error('ENOENT: no such file');
  enoent.code = 'ENOENT';
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
    criarRegistro(ioFalso({ erro: enoent })),
  );
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.falhas, []);
});

// ————————————— O `REGISTRO` exportado, contra disco de verdade —————————————

/** Projeto temporário com a árvore que o harness espera. `realpathSync.native` por causa do 8.3. */
function projetoTemporario() {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'post-')));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  return raiz;
}

/** Roda `fn` com `process.cwd()` — que é o `IO_REAL.cwd` — apontando para `raiz`. */
function noDiretorio(raiz, fn) {
  const antes = process.cwd();
  process.chdir(raiz);
  try { return fn(); } finally { process.chdir(antes); }
}

test('REGISTRO exportado declara as travas `gramatica` e `sync-log`, montadas sobre a casca real', () => {
  // Este teste existe porque os que iteram `REGISTRO` continuavam verdes com ele VAZIO.
  // A ORDEM é dado: o `gramatica` fala do arquivo que acabou de ser escrito, e o `sync-log` fala do
  // que ainda falta fazer. Invertê-los põe a pendência antes do defeito.
  assert.deepEqual(REGISTRO.map((v) => v.nome), ['gramatica', 'sync-log']);
  for (const nome of ['gramatica', 'sync-log']) {
    const v = REGISTRO.find((x) => x.nome === nome);
    assert.deepEqual(v.gatilhos, ['Write', 'Edit', 'NotebookEdit'], nome);
    assert.equal(v.bloqueia, false, nome);
  }
  // As QUATRO operações da casca. `statear` entrou com o `sync-log`; sem ela a regra de recência
  // não tem `mtime` para comparar, e o verificador avisaria sempre.
  assert.equal(typeof IO_REAL.cwd, 'function');
  assert.equal(typeof IO_REAL.relativizar, 'function');
  assert.equal(typeof IO_REAL.lerArquivo, 'function');
  assert.equal(typeof IO_REAL.statear, 'function');
});

test('WIRING — o `sync-log` é chamado PELO REGISTRO, e cala quando a linha está lá', () => {
  // As duas pontas do registro: sem esta, mutar a entrada da tabela para no-op deixa a suíte
  // inteira verde — foi assim duas vezes neste projeto. Só o `posttooluse.test.mjs` mede isto.
  const artefato = { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/spec/benchmark.md' } };
  const mtime = new Date(2026, 7, 25, 14, 32, 40).getTime();

  const semLinha = despachar(artefato, criarRegistro(ioFalso({ texto: '# Log\n', mtime })));
  assert.equal(semLinha.avisos.length, 1, JSON.stringify(semLinha.avisos));
  assert.equal(semLinha.avisos[0].nome, 'sync-log');
  assert.match(semLinha.avisos[0].aviso, /spec-benchmark/);
  assert.match(semLinha.avisos[0].aviso, /benchmark\.md/);

  const registrada = [
    CABECALHO_SECAO_A,
    montarLinhaSecaoA({
      numero: 1, data: '2026-08-25', hora: '14:32', skill: 'spec-benchmark', modo: '',
      inputs: '', outputs: '', decisoes: '', decisor: 'consultor', proximo: '',
    }),
  ].join('\n');
  const comLinha = despachar(artefato, criarRegistro(ioFalso({ texto: registrada, mtime })));
  assert.deepEqual(comLinha.avisos, [], JSON.stringify(comLinha.avisos));
});

test('REGISTRO exportado avisa de verdade, pela casca REAL, lendo o arquivo do disco', () => {
  const raiz = projetoTemporario();
  writeFileSync(join(raiz, 'outputs', 'explore', 'hld-funcional.md'), RUIM, 'utf8');
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(raiz, 'outputs', 'explore', 'hld-funcional.md'), content: RUIM } },
      REGISTRO,
    );
    assert.equal(r.acao, 'allow');
    assert.deepEqual(r.falhas, []);
    assert.equal(r.avisos.length, 1, JSON.stringify(r.avisos) + JSON.stringify(r.falhas));
    assert.match(r.avisos[0].aviso, /hld-funcional\.md/);
    assert.match(r.avisos[0].aviso, /RF-7/);
    assert.match(r.avisos[0].aviso, /F-001/);
  });
});

test('REGISTRO exportado — o `sync-log` pela casca REAL: `statear` de verdade, mtime de verdade', () => {
  // Sem este, `IO_REAL.statear` podia estar ligado por esperança: o dublê responderia o que
  // quiséssemos e o `statSync` real nunca seria exercitado. Aqui o `mtime` sai do disco.
  const raiz = projetoTemporario();
  const artefato = join(raiz, 'outputs', 'spec', 'benchmark.md');
  writeFileSync(artefato, '# Benchmark\n', 'utf8');
  const payload = { tool_name: 'Write', tool_input: { file_path: artefato } };

  noDiretorio(raiz, () => {
    const semLog = despachar(payload, REGISTRO);
    assert.deepEqual(semLog.falhas, []);
    assert.deepEqual(semLog.avisos.map((a) => a.nome), ['sync-log'], JSON.stringify(semLog.avisos));
    assert.match(semLog.avisos[0].aviso, /spec-benchmark/);

    // Agora a linha, com o minuto do `mtime` REAL do artefato — e o verificador cala.
    const m = new Date(statSync(artefato).mtimeMs);
    const dois = (n) => String(n).padStart(2, '0');
    writeFileSync(join(raiz, 'outputs', 'spec', 'sync-log.md'), [
      '# Log de sincronização', '', CABECALHO_SECAO_A,
      montarLinhaSecaoA({
        numero: 1,
        data: `${m.getFullYear()}-${dois(m.getMonth() + 1)}-${dois(m.getDate())}`,
        hora: `${dois(m.getHours())}:${dois(m.getMinutes())}`,
        skill: 'spec-benchmark', modo: '', inputs: '', outputs: '',
        decisoes: 'nenhuma', decisor: 'consultor', proximo: 'spec-product',
      }),
      '',
    ].join('\n'), 'utf8');

    const comLog = despachar(payload, REGISTRO);
    assert.deepEqual(comLog.falhas, []);
    assert.deepEqual(comLog.avisos, [], JSON.stringify(comLog.avisos));
  });
});

test('REGISTRO exportado cala num documento do Explore BEM formado, pela casca REAL', () => {
  const raiz = projetoTemporario();
  const bom = [
    '# HLD Funcional — Portal',
    '',
    '> **Fase:** Explore · **Versão:** 0.1',
    '',
    '## Changelog',
    '| Versão | Data | Mudança |',
    '|---|---|---|',
    '| 0.1 | 2026-08-25 | inicial |',
    '',
    '## 1. Visão geral',
    '',
    'O portal centraliza pagamentos no MOD-PAGAMENTOS.',
    '',
  ].join('\n');
  writeFileSync(join(raiz, 'outputs', 'explore', 'hld-funcional.md'), bom, 'utf8');
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(raiz, 'outputs', 'explore', 'hld-funcional.md'), content: bom } },
      REGISTRO,
    );
    assert.deepEqual(r.avisos, [], JSON.stringify(r.avisos));
    assert.deepEqual(r.falhas, []);
  });
});

test('REGISTRO exportado lê a MESMA raiz em `cwd` e na resolução: outro projeto não é avaliado', () => {
  // Mutação `cwd` devolvendo raiz errada, ou `relativizar` ignorando a raiz: um documento de OUTRO
  // projeto passaria a ser avaliado como se fosse deste.
  const a = projetoTemporario();
  const b = projetoTemporario();
  writeFileSync(join(a, 'outputs', 'explore', 'gaps.md'), RUIM, 'utf8');
  noDiretorio(b, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(a, 'outputs', 'explore', 'gaps.md'), content: RUIM } },
      REGISTRO,
    );
    assert.deepEqual(r.avisos, [], JSON.stringify(r.avisos));
    assert.deepEqual(r.falhas, []);
  });
});

test('REGISTRO exportado libera escrita FORA da raiz do projeto, pela casca REAL', () => {
  const raiz = projetoTemporario();
  const fora = projetoTemporario();
  writeFileSync(join(fora, 'outputs', 'explore', 'gaps.md'), RUIM, 'utf8');
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(fora, 'outputs', 'explore', 'gaps.md'), content: RUIM } },
      REGISTRO,
    );
    assert.equal(r.acao, 'allow');
    assert.deepEqual(r.avisos, []);
  });
});

// ————— O `IO_REAL` usa a resolução por IDENTIDADE, não a textual — e isso é MEDIDO —————
//
// Sem os dois testes abaixo, trocar `relativizarComRecuo` pelo `relativizar` TEXTUAL do kit dentro
// do `IO_REAL` deste arquivo deixava a suíte inteira verde — medido: 639/639, zero vermelhos. A
// mesma troca no `pretooluse.mjs` sai com três vermelhos (os `C4`), porque lá existem testes de
// alias. Dizer no comentário que os dois despachantes chamam a mesma política não é o mesmo que
// prendê-la: enquanto ninguém escreve o alias, o segundo despachante fica ligado por esperança e
// volta a divergir do irmão no primeiro refactor.
//
// A consequência aqui é mais branda que no `pretooluse.mjs` — este verificador é INFORMATIVO, e
// divergir significa deixar de avisar, não deixar passar uma escrita proibida. Mas é a mesma
// divergência, e o custo de prendê-la é este bloco.
const ehWindows = process.platform === 'win32';

test('REGISTRO exportado avisa também pelas formas alternativas do caminho (identidade, não texto)', { skip: !ehWindows && 'aliases de caminho são específicos do Windows' }, () => {
  const raiz = projetoTemporario();
  const rel = join('outputs', 'explore', 'hld-funcional.md');
  writeFileSync(join(raiz, rel), RUIM, 'utf8');
  const w = raiz.replace(/\//g, '\\');
  const relW = rel.replace(/\//g, '\\');
  const aliases = [
    ['canônico', join(raiz, rel)],
    ['\\\\?\\', '\\\\?\\' + w + '\\' + relW],
    ['stream ::$DATA', join(raiz, rel) + '::$DATA'],
  ];
  noDiretorio(raiz, () => {
    for (const [nome, caminho] of aliases) {
      const r = despachar({ tool_name: 'Write', tool_input: { file_path: caminho, content: RUIM } }, REGISTRO);
      assert.deepEqual(r.falhas, [], nome);
      assert.equal(r.avisos.length, 1, `${nome} (${caminho}) devia produzir aviso`);
      assert.match(r.avisos[0].aviso, /RF-7/, nome);
    }
  });
});

test('REGISTRO exportado avisa pelo nome curto 8.3 do Windows', { skip: !ehWindows && 'nome curto 8.3 é específico do Windows' }, () => {
  // `C:\Users\MURILO~1\...` e `C:\Users\MuriloLopes\...` são o MESMO diretório para o SO e strings
  // completamente diferentes — nenhuma canonização por texto junta as duas. O teste afirma antes
  // que as strings de fato divergem, para não passar por trivialidade num volume sem nome curto.
  const curto = mkdtempSync(join(tmpdir(), 'post83-'));
  const longo = realpathSync.native(curto);
  if (curto === longo) return;
  mkdirSync(join(longo, 'outputs', 'explore'), { recursive: true });
  writeFileSync(join(longo, 'outputs', 'explore', 'gaps.md'), RUIM, 'utf8');
  noDiretorio(longo, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(curto, 'outputs', 'explore', 'gaps.md'), content: RUIM } },
      REGISTRO,
    );
    assert.deepEqual(r.falhas, []);
    assert.equal(r.avisos.length, 1, `nome curto ${curto} devia produzir aviso`);
    assert.match(r.avisos[0].aviso, /gaps\.md/);
  });
});

// ————— MJ-1, o outro lado: o `main()` de verdade, num processo de verdade —————
//
// `main()` não é exportado, e não deve ser: o que se quer medir é o hook COMO O CLAUDE CODE O
// EXECUTA — payload no stdin, resposta no stdout. Os testes acima param uma camada antes disso, e
// por isso "o `main()` deixa de escrever no stdout" sobrevivia a todos eles.
//
// O `workspace.test.mjs` já roda o CLI dele assim (`execFileSync('node', [cli, '--validar'])`).

const HOOK = fileURLToPath(new URL('./posttooluse.mjs', import.meta.url));

/** Roda o hook como o Claude Code roda: payload no stdin, `cwd` na raiz do projeto. */
function rodarHook(raiz, payload) {
  return execFileSync('node', [HOOK], { cwd: raiz, input: JSON.stringify(payload), encoding: 'utf8' });
}

test('MAIN — o hook escreve no stdout o JSON de aviso, com o documento mal formado no disco', () => {
  const raiz = projetoTemporario();
  const alvo = join(raiz, 'outputs', 'explore', 'hld-funcional.md');
  writeFileSync(alvo, RUIM, 'utf8');
  const saida = rodarHook(raiz, { tool_name: 'Write', tool_input: { file_path: alvo, content: RUIM } });

  assert.notEqual(saida.trim(), '', 'o hook não escreveu NADA — a camada está muda');
  const j = JSON.parse(saida);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(j.hookSpecificOutput.additionalContext, /\[gramatica\]/);
  assert.match(j.hookSpecificOutput.additionalContext, /hld-funcional\.md/);
  assert.match(j.hookSpecificOutput.additionalContext, /RF-7/);
});

test('MAIN — o hook fica MUDO quando o documento está bem formado', () => {
  // O par do teste acima. Sem ele, "sempre escrever alguma coisa" passaria.
  const raiz = projetoTemporario();
  const bom = [
    '# HLD Funcional — Portal',
    '',
    '> **Fase:** Explore · **Versão:** 0.1',
    '',
    '## Changelog',
    '| Versão | Data | Mudança |',
    '|---|---|---|',
    '| 0.1 | 2026-08-25 | inicial |',
    '',
    '## 1. Visão geral',
    '',
    'O portal centraliza pagamentos no MOD-PAGAMENTOS.',
    '',
  ].join('\n');
  const alvo = join(raiz, 'outputs', 'explore', 'hld-funcional.md');
  writeFileSync(alvo, bom, 'utf8');
  assert.equal(rodarHook(raiz, { tool_name: 'Write', tool_input: { file_path: alvo, content: bom } }).trim(), '');
});

test('MAIN — payload corrompido sai como aviso no stdout, não como silêncio', () => {
  const raiz = projetoTemporario();
  const saida = execFileSync('node', [HOOK], { cwd: raiz, input: '{ isto nao eh json', encoding: 'utf8' });
  const j = JSON.parse(saida);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(j.hookSpecificOutput.additionalContext, /não rodou|nao rodou/i);
});

test('REGISTRO exportado não quebra quando o arquivo sumiu entre a escrita e o hook', () => {
  const raiz = projetoTemporario();
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(raiz, 'outputs', 'explore', 'gaps.md'), content: RUIM } },
      REGISTRO,
    );
    assert.equal(r.acao, 'allow');
    assert.deepEqual(r.avisos, []);
    assert.deepEqual(r.falhas, []);
  });
});
