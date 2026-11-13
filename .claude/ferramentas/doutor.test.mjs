import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ITENS, sondar, avaliarSondagens, formatarTexto, ehPythonReal, IO_REAL, RUNTIME_PADRAO, lerRuntime } from './doutor.mjs';

/** Um `io` de memória: respostas fixas por comando. */
function ioFalso({ comandos = {}, node = 'v22.17.1', ambiente = {} } = {}) {
  return {
    rodar: (cmd, args) => {
      const chave = [cmd, ...(args || [])].join(' ');
      if (Object.prototype.hasOwnProperty.call(comandos, chave)) return comandos[chave];
      if (Object.prototype.hasOwnProperty.call(comandos, cmd)) return comandos[cmd];
      return { ok: false, saida: '', erro: 'ENOENT' };
    },
    versaoDoNode: () => node,
    ambiente: (n) => Boolean(ambiente[n]),
  };
}

test('os sete itens da §11.2 estão todos na tabela, e quatro são obrigatórios', () => {
  assert.equal(ITENS.length, 7);
  const obrigatorios = ITENS.filter((i) => i.obrigatorio).map((i) => i.chave);
  assert.deepEqual(obrigatorios.sort(), ['git', 'node', 'python', 'runtime']);
});

test('máquina completa: nada faltando', () => {
  const io = ioFalso({
    comandos: {
      'claude --version': { ok: true, saida: '1.2.3' },
      'git --version': { ok: true, saida: 'git version 2.45.0' },
      'python3 -c import sys; print(sys.executable)': { ok: true, saida: 'C:\\Python313\\python.exe' },
      'npm --version': { ok: true, saida: '10.9.0' },
    },
    ambiente: { AZURE_DEVOPS_PAT: 1, AZURE_DEVOPS_ORG: 1, AZURE_DEVOPS_PROJECT: 1 },
  });
  const r = avaliarSondagens(sondar(io));
  assert.deepEqual(r.faltandoObrigatorio, []);
});

test('o runtime sondado é parâmetro, e o padrão é o Claude Code', () => {
  assert.deepEqual(RUNTIME_PADRAO.cli, 'claude');
  const kiro = { rotulo: 'Kiro (IDE ou CLI)', cli: 'kiro-cli', semCli: 'Se você usa só a IDE, isto é esperado.' };
  const io = ioFalso({ comandos: { 'kiro-cli --version': { ok: true, saida: '3.0.1' } } });
  const r = avaliarSondagens(sondar(io, kiro), kiro);
  const runtime = r.itens.find((i) => i.chave === 'runtime');
  assert.equal(runtime.ok, true);
  assert.equal(runtime.rotulo, 'Kiro (IDE ou CLI)');
  assert.match(runtime.detalhe, /kiro-cli/);
  // A OUTRA PONTA: com o runtime Kiro, `claude` presente não conta.
  const io2 = ioFalso({ comandos: { 'claude --version': { ok: true, saida: '1.2.3' } } });
  const r2 = avaliarSondagens(sondar(io2, kiro), kiro);
  assert.equal(r2.itens.find((i) => i.chave === 'runtime').ok, false);
  assert.match(r2.itens.find((i) => i.chave === 'runtime').detalhe, /só a IDE/);
});

test('lerRuntime: lê o campo do harness.json, e cai no padrão quando ele não existe', () => {
  const comCampo = () => JSON.stringify({ runtime: { rotulo: 'X', cli: 'x', semCli: 'y' } });
  assert.deepEqual(lerRuntime('.', comCampo), { rotulo: 'X', cli: 'x', semCli: 'y' });
  assert.deepEqual(lerRuntime('.', () => JSON.stringify({ versao: '2.0.0' })), RUNTIME_PADRAO);
  const ausente = () => { const e = new Error('x'); e.code = 'ENOENT'; throw e; };
  assert.deepEqual(lerRuntime('.', ausente), RUNTIME_PADRAO);
  // Ilegível NÃO é ausente (Restrição Global 1 do harness): relança.
  const ilegivel = () => { const e = new Error('x'); e.code = 'EACCES'; throw e; };
  assert.throws(() => lerRuntime('.', ilegivel), /x/);
});

test('Node abaixo de 18 é falta, e a mensagem diz a versão encontrada', () => {
  const r = avaliarSondagens(sondar(ioFalso({ node: 'v16.20.2' })));
  assert.ok(r.faltandoObrigatorio.includes('node'));
  assert.match(formatarTexto(r), /v16\.20\.2/);
});

// ————————————————— o item 4: a armadilha do Windows, e é o motivo do módulo —————————————————

test('ehPythonReal: caminho de executável passa', () => {
  assert.equal(ehPythonReal({ ok: true, saida: 'C:\\Python313\\python.exe' }), true);
  assert.equal(ehPythonReal({ ok: true, saida: '/usr/bin/python3' }), true);
});

test('ehPythonReal: App Execution Alias do Windows NÃO passa', () => {
  // O ALIAS É O CASO QUE ESTE MÓDULO EXISTE PARA PEGAR. Ele "roda" com exit 0, não imprime
  // caminho de executável, e abre a Microsoft Store. Um teste que só olhasse `ok` diria que a
  // máquina está pronta — e a `spec-data-model` falharia depois com exit code enganoso.
  assert.equal(ehPythonReal({ ok: true, saida: '' }), false);
  assert.equal(ehPythonReal({ ok: true, saida: '   ' }), false);
  assert.equal(ehPythonReal({ ok: false, saida: '', erro: 'ENOENT' }), false);
  // Saída não vazia mas SEM caminho — por exemplo se algo respondesse com a saída de
  // `--version` em vez de `sys.executable`. Sem barra, não é caminho de executável.
  assert.equal(ehPythonReal({ ok: true, saida: 'Python 3.13.14' }), false);
});

test('python3 alias mas python real: acha o Python e diz qual comando usar', () => {
  const io = ioFalso({
    comandos: {
      'python3 -c import sys; print(sys.executable)': { ok: true, saida: '' },
      'python -c import sys; print(sys.executable)': { ok: true, saida: 'C:\\Python313\\python.exe' },
    },
  });
  const r = avaliarSondagens(sondar(io));
  assert.ok(!r.faltandoObrigatorio.includes('python'), 'Python existe, só não como python3');
  const t = formatarTexto(r);
  assert.match(t, /python/);
  assert.match(t, /App Execution Alias|alias/i);
});

test('nenhum dos dois: Python é falta obrigatória', () => {
  const r = avaliarSondagens(sondar(ioFalso({})));
  assert.ok(r.faltandoObrigatorio.includes('python'));
});

// ————————————————— o que ele declara em vez de sondar —————————————————

test('o registry npm é declarado NÃO SONDADO, com a razão', () => {
  const io = ioFalso({ comandos: { 'npm --version': { ok: true, saida: '10.9.0' } } });
  const t = formatarTexto(avaliarSondagens(sondar(io)));
  assert.match(t, /não sondado/i);
  assert.match(t, /rede/i, 'a razão de não sondar tem que estar escrita — não é omissão');
});

test('o PAT é conferido por PRESENÇA e o valor NUNCA é impresso', () => {
  // Segredo ecoado no terminal também vai para o log da sessão.
  const io = ioFalso({ ambiente: { AZURE_DEVOPS_PAT: 1, AZURE_DEVOPS_ORG: 1, AZURE_DEVOPS_PROJECT: 1 } });
  const sondagens = sondar(io);
  const serializado = JSON.stringify(sondagens) + formatarTexto(avaliarSondagens(sondagens));
  assert.ok(!serializado.includes('AZURE_DEVOPS_PAT='), 'vazou a forma nome=valor');
  assert.match(serializado, /AZURE_DEVOPS_PAT/, 'o nome da variável tem que aparecer');
});

test('io.ambiente devolve boolean, e é o que impede o valor de circular', () => {
  // A ASSERÇÃO É SOBRE A FORMA DO io, e é ela que fecha o vazamento na origem: um
  // `ambiente(n) => process.env[n]` faria o valor entrar no objeto de sondagem, e daí para o
  // `--json` de quem pipar a saída.
  const io = ioFalso({ ambiente: { AZURE_DEVOPS_PAT: 1 } });
  assert.equal(io.ambiente('AZURE_DEVOPS_PAT'), true);
  assert.equal(typeof io.ambiente('AZURE_DEVOPS_PAT'), 'boolean');
});

test('IO_REAL.ambiente devolve boolean de verdade — não só o io.ambiente falso do teste', () => {
  // `ioFalso` (acima) é o dublê usado em todos os outros testes deste arquivo, e o corpo dele já
  // devolve boolean por construção — testar só ele nunca pegaria um `IO_REAL.ambiente` real que
  // devolvesse `process.env[nome]` puro (string | undefined). É o objeto que fala com a máquina
  // de verdade que precisa fechar o vazamento, então é ele que este teste exercita.
  const nomeInexistente = 'DOUTOR_TESTE_VARIAVEL_QUE_NAO_EXISTE_XYZ';
  assert.equal(delete process.env[nomeInexistente], true);
  assert.equal(IO_REAL.ambiente(nomeInexistente), false);
  assert.equal(typeof IO_REAL.ambiente(nomeInexistente), 'boolean');

  process.env.DOUTOR_TESTE_VARIAVEL_PRESENTE = 'valor-que-nao-pode-vazar';
  try {
    assert.equal(IO_REAL.ambiente('DOUTOR_TESTE_VARIAVEL_PRESENTE'), true);
    assert.equal(typeof IO_REAL.ambiente('DOUTOR_TESTE_VARIAVEL_PRESENTE'), 'boolean');
  } finally {
    delete process.env.DOUTOR_TESTE_VARIAVEL_PRESENTE;
  }
});

test('item opcional ausente não entra em faltandoObrigatorio', () => {
  const r = avaliarSondagens(sondar(ioFalso({})));
  assert.ok(!r.faltandoObrigatorio.includes('opcionais'));
  assert.ok(!r.faltandoObrigatorio.includes('pat'));
  assert.ok(!r.faltandoObrigatorio.includes('npm'));
});
