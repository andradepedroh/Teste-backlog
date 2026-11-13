import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { parsearDiff, arquivoNovo, renderizar, linhasAcrescentadas, linhasMudadas, desaspar } from './validacao/diff.mjs';
import { localizarTask, perguntasDeNegocio, mensagensDeErro } from './validacao/task.mjs';
import { classificar, escolherDimensoes, DIMENSOES } from './validacao/roteador.mjs';
import { fragmentos, checarMensagens, rodarComando } from './validacao/deterministico.mjs';
import { conferirEvidencia, validarResultado, semMoldura, mascarar, trechoSignificativo } from './validacao/conferencia.mjs';
import { consolidar, agruparParaCorrecao, chaveDe } from './validacao/consolidar.mjs';
import { violacoes, mudadosEntre } from './validacao/guarda.mjs';
import { decidir, juntarLotes, resolvidasEntre } from './validacao/ciclo.mjs';
import { montarLotes, textoParaValidador, textoParaCorretor } from './validacao/entrada.mjs';
import { secoes, trechosDeRules, LIMITE_TRECHOS, regrasFrontendNextEmVigor } from './validacao/rules.mjs';
import { varrer, lerSemgrep, lerGitleaks, soNasLinhasNovas } from './validacao/varredura.mjs';
import { iniciar, avancar, lerOpcoes, leitorDoRepo, procurarNoPath, rodarExternas, fotografia } from './validar.mjs';
import { ZONA_IMUTAVEL } from '../hooks/kit.mjs';
// Item 13 (revisão do G3, 2026-10-21): os nomes novos entram pelo namespace — a função que ainda não
// existe falha só o teste dela, em vez de derrubar o arquivo inteiro no import.
import * as V from './validar.mjs';
import * as DET from './validacao/deterministico.mjs';
import * as GUARDA from './validacao/guarda.mjs';

const VALIDAR_MJS = fileURLToPath(new URL('./validar.mjs', import.meta.url));
// O exemplo oficial da `spec-tasks`: as perguntas têm que sair do formato que o kit grava de verdade.
const EXEMPLO_KIT = fileURLToPath(new URL('../../.claude/skills/spec-tasks/templates/tasks.example-completo.json', import.meta.url));

// ————————————————————————————— diff —————————————————————————————

const DIFF = [
  'diff --git a/src/a.js b/src/a.js',
  'index 1..2 100644',
  '--- a/src/a.js',
  '+++ b/src/a.js',
  '@@ -1,3 +1,3 @@',
  ' const x = 1;',
  '--- removida com cara de cabeçalho',
  '+const y = 2;',
  ' fim();',
  '',
].join('\n');

test('parsearDiff numera pelo arquivo novo e não lê "---" de dentro do trecho como cabeçalho', () => {
  const [a] = parsearDiff(DIFF);
  assert.equal(a.arquivo, 'src/a.js');
  assert.deepEqual(a.trechos[0].linhas.map((l) => [l.tipo, l.numero]), [[' ', 1], ['-', null], ['+', 2], [' ', 3]]);
  assert.equal(a.trechos[0].linhas[1].texto, '-- removida com cara de cabeçalho');
  assert.equal(linhasAcrescentadas(a), 'const y = 2;');
});

test('arquivo novo vira tudo "+", numerado de 1, e renderizar põe número e marca', () => {
  const n = arquivoNovo('src/b.js', 'um\ndois\n');
  assert.ok(n.novo);
  const t = renderizar(n);
  assert.match(t, /### src\/b\.js \(novo\)/);
  assert.match(t, /\n {4}1 \+\| um\n {4}2 \+\| dois$/);
});

// ————————————————————————————— task —————————————————————————————

test('as perguntas saem do formato real da spec-tasks: regra, cenário, contrato, critério', () => {
  const exemplo = JSON.parse(readFileSync(EXEMPLO_KIT, 'utf8'));
  const par = localizarTask(exemplo, exemplo.id);
  assert.ok(par, 'task solta na raiz é localizada');
  const ids = perguntasDeNegocio(par).map((p) => p.id);
  assert.ok(ids.includes('RN-ESTOQUE-001'), ids.join(','));
  assert.ok(ids.some((i) => i.startsWith('AS-')), 'cenários de aceite');
  assert.ok(ids.some((i) => i.startsWith('API-')), 'contratos');
  assert.ok(ids.some((i) => i.startsWith('CN-')), 'critérios de negócio');
  assert.deepEqual(mensagensDeErro(par).map((m) => m.chave), ['ESTOQUE_INSUFICIENTE']);
});

test('localizarTask acha a task dentro de stories[].tasks[] e devolve a story', () => {
  const tasks = { stories: [{ id: 'US-1', businessRules: ['RN-9 vale para todos'], tasks: [{ id: 'TASK-1' }] }] };
  const par = localizarTask(tasks, 'TASK-1');
  assert.equal(par.story.id, 'US-1');
  assert.equal(localizarTask(tasks, 'TASK-2'), null);
  assert.deepEqual(perguntasDeNegocio(par).map((p) => p.id), ['RN-9'], 'regra da story em texto solto ganha o id do começo');
});

// ————————————————————————————— roteador —————————————————————————————

test('classificar põe teste antes de código', () => {
  assert.equal(classificar('src/PedidoTest.java'), 'teste');
  assert.equal(classificar('src/__tests__/a.ts'), 'teste');
  assert.equal(classificar('src/a.spec.tsx'), 'teste');
  assert.equal(classificar('src/a.ts'), 'codigo');
  assert.equal(classificar('src/a.css'), 'estilo');
  assert.equal(classificar('README.md'), 'doc');
});

test('mudança só de estilo roda só rules técnicas, e toda dimensão dispensada tem motivo', () => {
  const { rodar, dispensadas } = escolherDimensoes({ temRegras: false, arquivos: [{ arquivo: 'src/a.css', classe: 'estilo', acrescentadas: 'a{}' }] });
  assert.deepEqual(rodar.map((r) => r.dimensao), ['rules-tecnicas']);
  assert.equal(rodar.length + dispensadas.length, DIMENSOES.length);
  for (const d of dispensadas) assert.ok(d.motivo.length > 10, d.dimensao);
});

test('código com consulta e rota liga performance e observabilidade', () => {
  const { rodar } = escolherDimensoes({
    temRegras: true,
    arquivos: [{ arquivo: 'src/pedido.repository.ts', classe: 'codigo', acrescentadas: 'router.post("/x", h); db.query("select 1")' }],
  });
  assert.deepEqual(rodar.map((r) => r.dimensao).sort(), [...DIMENSOES].sort());
});

// ————————————————————————————— determinístico —————————————————————————————

test('fragmentos tira os marcadores e descarta pedaço curto', () => {
  assert.deepEqual(fragmentos('Estoque insuficiente para {produto}. Disponível: {qtd}'), ['Estoque insuficiente para', 'Disponível']);
  assert.deepEqual(fragmentos('{a} {b}'), []);
});

test('mensagem no código e no teste: duas verificações CUMPRE, com evidência', () => {
  const buscar = () => [{ arquivo: 'src/a.js', linha: 3, texto: 'throw Error("Estoque insuficiente para x")' },
    { arquivo: 'test/a.test.js', linha: 9, texto: 'expect(m).toMatch("Estoque insuficiente para")' }];
  const v = checarMensagens([{ chave: 'ESTOQUE', texto: 'Estoque insuficiente para {p}', regra: 'RN-1' }], buscar);
  assert.deepEqual(v.map((x) => [x.id, x.veredito, x.dimensao]), [['MSG-ESTOQUE', 'CUMPRE', 'regras-negocio'], ['MSG-ESTOQUE-TESTE', 'CUMPRE', 'testes']]);
  assert.equal(v[0].evidencia.arquivo, 'src/a.js');
});

test('mensagem ausente vira NAO_CUMPRE; só a chave no código vira INCERTO', () => {
  const msg = [{ chave: 'ESTOQUE', texto: 'Estoque insuficiente para {p}', regra: 'RN-1' }];
  const nada = checarMensagens(msg, () => []);
  assert.deepEqual(nada.map((x) => x.veredito), ['NAO_CUMPRE', 'NAO_CUMPRE']);
  const soChave = checarMensagens(msg, (t) => (t === 'ESTOQUE' ? [{ arquivo: 'src/a.js', linha: 1, texto: 'ESTOQUE' }] : []));
  assert.equal(soChave[0].veredito, 'INCERTO');
});

test('rodarComando: sem comando não roda; falha guarda a cauda da saída', () => {
  assert.equal(rodarComando('lint', '', () => ({})), null);
  const ok = rodarComando('testes', 'x', () => ({ status: 0, stdout: 'tudo certo' }));
  assert.equal(ok.ok, true);
  assert.equal(ok.saida, '');
  const falhou = rodarComando('testes', 'x', () => ({ status: 1, stdout: 'linha 1\nFALHOU: a regra' }));
  assert.equal(falhou.ok, false);
  assert.match(falhou.saida, /FALHOU/);
});

// ————————————————————————————— conferência —————————————————————————————

const ARQ = ['a', 'b', 'const total = soma(itens);', 'c', 'd', 'e', 'f', 'g', 'h'];
const ler = (arquivo) => (arquivo === 'src/a.js' ? ARQ : null);

test('evidência confere na linha, a ±3 linhas, e com a moldura do recorte copiada junto', () => {
  assert.ok(conferirEvidencia({ arquivo: 'src/a.js', linha: 3, trecho: 'const total = soma(itens);' }, ler).ok);
  assert.ok(conferirEvidencia({ arquivo: 'src/a.js', linha: 5, trecho: 'const   total = soma(itens);' }, ler).ok);
  assert.ok(conferirEvidencia({ arquivo: 'src/a.js', linha: 3, trecho: '    3 +| const total = soma(itens);' }, ler).ok);
  assert.equal(semMoldura('   42  | x'), 'x');
});

test('evidência longe da linha, em arquivo inexistente ou incompleta não confere', () => {
  assert.equal(conferirEvidencia({ arquivo: 'src/a.js', linha: 9, trecho: 'const total' }, ler).ok, false);
  assert.match(conferirEvidencia({ arquivo: 'src/x.js', linha: 1, trecho: 'a' }, ler).motivo, /não encontrado/);
  assert.equal(conferirEvidencia({ arquivo: 'src/a.js', trecho: 'a' }, ler).ok, false);
});

test('validarResultado: CUMPRE sem evidência, dimensão trocada e trecho longo são erros', () => {
  const ok = { dimensao: 'testes', verificacoes: [], achados: [] };
  assert.deepEqual(validarResultado(ok, 'testes'), []);
  assert.ok(validarResultado(ok, 'seguranca').some((e) => /dimensao/.test(e)));
  const semEv = { ...ok, verificacoes: [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok' }] };
  assert.ok(validarResultado(semEv, 'testes').some((e) => /evidencia/.test(e)));
  const longo = { ...ok, achados: [{ titulo: 't', severidade: 'ALTO', motivo: 'm', correcao: 'c', evidencia: { arquivo: 'a', linha: 1, trecho: 'x'.repeat(301) } }] };
  assert.ok(validarResultado(longo, 'testes').some((e) => /300/.test(e)));
  assert.deepEqual(validarResultado('texto', 'testes'), ['o resultado não é um objeto JSON']);
});

// ————————————————————————————— consolidação —————————————————————————————

const EV = (linha, trecho = 'const total = soma(itens);') => ({ arquivo: 'src/a.js', linha, trecho });
const conferir = (ev) => conferirEvidencia(ev, ler);
const achado = (sev, linha = 3, extra = {}) => ({ titulo: `problema ${sev}`, severidade: sev, motivo: 'm', correcao: 'c', evidencia: EV(linha), ...extra });

test('consolidar: NAO_CUMPRE e achado ALTO bloqueiam; MÉDIO é ignorado; limpo é APROVADO', () => {
  const limpo = consolidar({ resultados: { testes: { verificacoes: [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok', evidencia: EV(3) }], achados: [] } }, conferir });
  assert.equal(limpo.veredito, 'APROVADO');
  const c = consolidar({
    comandos: [{ id: 'CMD-testes', dimensao: 'testes', comando: 'npm test', ok: false, codigo: 1, saida: 'x' }],
    resultados: {
      'regras-negocio': { verificacoes: [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'não valida' }], achados: [] },
      seguranca: { verificacoes: [], achados: [achado('ALTO'), achado('MEDIO', 3, { titulo: 'outro' })] },
    },
    conferir,
  });
  assert.equal(c.veredito, 'PENDENTE');
  assert.deepEqual(c.bloqueantes.map((b) => b.tipo).sort(), ['achado', 'comando', 'verificacao']);
  assert.equal(c.ignorados, 1);
  assert.ok(!('avisos' in c), 'MÉDIO e BAIXO não viram lista nenhuma');
});

test('consolidar: CUMPRE com evidência falsa vira INCERTO; achado falso é descartado; >30% derruba a dimensão', () => {
  const c = consolidar({
    resultados: { seguranca: { verificacoes: [{ id: 'X', veredito: 'CUMPRE', motivo: 'ok', evidencia: EV(3, 'não existe') }], achados: [achado('ALTO', 3, { evidencia: EV(3, 'inventado') })] } },
    conferir,
  });
  assert.equal(c.incertos.length, 1);
  assert.equal(c.descartados.length, 1);
  assert.equal(c.bloqueantes.length, 0);
  assert.deepEqual(c.dimensoesIncertas, ['seguranca']);
  assert.equal(c.veredito, 'PENDENTE');
});

test('consolidar: validador que não responde uma pergunta esperada não aprova — silêncio não é CUMPRE', () => {
  const c = consolidar({ resultados: { testes: { verificacoes: [], achados: [] } }, esperadas: { testes: ['RN-1'] }, conferir });
  assert.equal(c.veredito, 'PENDENTE');
  assert.deepEqual(c.incertos.map((i) => [i.dimensao, i.id]), [['testes', 'RN-1']]);
});

test('consolidar junta o mesmo defeito visto por duas dimensões na MESMA linha, com a maior severidade', () => {
  const c = consolidar({
    resultados: {
      seguranca: { verificacoes: [], achados: [achado('MEDIO', 3)] },
      performance: { verificacoes: [], achados: [achado('ALTO', 3, { titulo: 'lento' })] },
    },
    conferir,
  });
  assert.equal(c.bloqueantes.length, 1);
  assert.deepEqual(c.bloqueantes[0].dimensoes.sort(), ['performance', 'seguranca']);
  assert.equal(c.ignorados, 0);
  assert.match(c.bloqueantes[0].chave, /src\/a\.js:3\|/, 'a chave do achado é arquivo e linha: o título reescrito pelo modelo não a muda');
});

// O caso medido na calibração de 2026-10-16: CPF no log (linha 4) e consulta por item (linha 6) eram
// dois defeitos; a fusão por "até 2 linhas" engoliu o primeiro e custou uma rodada.
test('consolidar NÃO junta linhas vizinhas nem dois achados do mesmo validador na mesma linha', () => {
  const vizinhas = consolidar({
    resultados: {
      seguranca: { verificacoes: [], achados: [achado('ALTO', 3, { titulo: 'dado pessoal no log' })] },
      performance: { verificacoes: [], achados: [achado('ALTO', 5, { titulo: 'consulta por item' })] },
    },
    conferir,
  });
  assert.deepEqual(vizinhas.bloqueantes.map((b) => b.titulo).sort(), ['consulta por item', 'dado pessoal no log']);
  const mesmoValidador = consolidar({
    resultados: { 'rules-tecnicas': { verificacoes: [], achados: [achado('ALTO', 3, { titulo: 'fetch no componente' }), achado('ALTO', 3, { titulo: 'moeda no JSX' })] } },
    conferir,
  });
  assert.equal(mesmoValidador.bloqueantes.length, 2);
});

test('agruparParaCorrecao: mesmo arquivo no mesmo grupo; o que não cita arquivo vai num grupo à parte', () => {
  const g = agruparParaCorrecao([
    { chave: 'a', evidencia: { arquivo: 'src/a.js' } }, { chave: 'b', evidencia: { arquivo: 'src/a.js' } },
    { chave: 'c', evidencia: { arquivo: 'src/b.js' } }, { chave: 'd' },
  ]);
  assert.deepEqual(g.map((x) => x.itens.map((i) => i.chave)), [['a', 'b'], ['c'], ['d']]);
});

// ————————————————————————————— guarda e ciclo —————————————————————————————

test('guarda: na validação nada muda fora da pasta de trabalho; na correção a régua é intocável', () => {
  assert.deepEqual(violacoes({ mudados: ['outputs/spec/validacao/T/r.json'], fase: 'validar', pastaTrabalho: 'outputs/spec/validacao/T' }), []);
  assert.equal(violacoes({ mudados: ['src/a.js'], fase: 'validar' }).length, 1);
  const corr = violacoes({ mudados: ['src/a.js', 'outputs/spec/tasks.json', '.claude/agents/corretor.md', 'outputs/spec/auditorias/x.md'], fase: 'corrigir' });
  assert.deepEqual(corr.map((v) => v.arquivo), ['outputs/spec/tasks.json', '.claude/agents/corretor.md', 'outputs/spec/auditorias/x.md']);
  assert.deepEqual(mudadosEntre({ a: '1', b: '2' }, { a: '1', b: '3', c: '4' }), ['b', 'c']);
});

const pendente = (bloqueantes, extra = {}) => ({ veredito: 'PENDENTE', bloqueantes, incertos: [], ignorados: 0, descartados: [], dimensoesIncertas: [], ...extra });

test('decidir: aprovado termina; item que persiste é corrigido de novo; item que voltou para por oscilação', () => {
  assert.equal(decidir({ consolidado: { veredito: 'APROVADO' }, rodada: 1 }).acao, 'fim');
  const b = [{ chave: 'testes|RN-1', evidencia: { arquivo: 'a' } }];
  assert.equal(decidir({ consolidado: pendente(b), rodada: 2, resolvidas: [] }).acao, 'corrigir');
  const osc = decidir({ consolidado: pendente(b), rodada: 2, resolvidas: ['testes|RN-1'] });
  assert.equal(osc.acao, 'parar');
  assert.match(osc.motivo, /oscilação/);
  assert.deepEqual(resolvidasEntre(['a', 'b'], ['b']), ['a']);
});

test('decidir: limite de rodadas para; incerteza revalida uma vez e depois para', () => {
  const b = [{ chave: 'x', evidencia: { arquivo: 'a' } }];
  assert.equal(decidir({ consolidado: pendente(b), rodada: 3, rodadasMax: 3 }).acao, 'parar');
  const so = pendente([], { incertos: [{ dimensao: 'seguranca', origem: undefined }] });
  assert.deepEqual(decidir({ consolidado: so, rodada: 1 }), { acao: 'revalidar', dimensoes: ['seguranca'] });
  assert.equal(decidir({ consolidado: so, rodada: 1, jaRevalidouIncertos: true }).acao, 'parar');
  const soDet = pendente([], { incertos: [{ dimensao: 'regras-negocio', origem: 'determinístico' }] });
  assert.equal(decidir({ consolidado: soDet, rodada: 1 }).acao, 'parar', 'incerteza do determinístico não melhora rodando de novo');
});

test('juntarLotes: CUMPRE de um lote vence o INCERTO do lote que não viu o código', () => {
  const j = juntarLotes('testes', [
    { verificacoes: [{ id: 'RN-1', veredito: 'INCERTO', motivo: 'fora deste lote' }], achados: [] },
    { verificacoes: [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok' }], achados: [{ titulo: 't' }] },
  ]);
  assert.equal(j.verificacoes[0].veredito, 'CUMPRE');
  assert.equal(j.achados.length, 1);
});

test('montarLotes respeita o limite e parte bloco grande por linhas', () => {
  const lotes = montarLotes(['### a\n' + 'x\n'.repeat(50), '### b\ny'], 40);
  assert.ok(lotes.length > 2);
  for (const l of lotes) assert.ok(l.length <= 60, l.length);
  assert.match(lotes[1], /continuação/);
});

test('os textos de entrada levam o que o agente precisa e a proibição de tocar na régua', () => {
  const v = textoParaValidador({ dimensao: 'testes', task: { id: 'T-1', title: 't', description: 'd' }, perguntas: [{ id: 'RN-1', origem: 'regra', texto: 'r' }], recorte: '    1 +| x', rodada: 1, caminhoResultado: '/tmp/r.json' });
  assert.match(v, /`RN-1`/);
  assert.match(v, /\/tmp\/r\.json/);
  assert.match(v, /"dimensao": "testes"/);
  const c = textoParaCorretor({ task: { id: 'T-1' }, grupo: { itens: [{ chave: 'testes|RN-1', id: 'RN-1', dimensao: 'testes', motivo: 'm' }] }, numero: 1, total: 1, rodada: 1, caminhoRegistro: '/tmp/c.json', comandos: { testes: 'npm test', lint: '' }, repo: '/repo' });
  assert.match(c, /testes\|RN-1/);
  assert.match(c, /Não altere/);
  assert.match(c, /testes: `npm test`/);
  assert.ok(!/lint:/.test(c), 'comando vazio não aparece');
  assert.match(c, /`\/repo`/);
  const semCmd = textoParaCorretor({ task: { id: 'T-1' }, grupo: { itens: [] }, numero: 1, total: 1, rodada: 1, caminhoRegistro: '/tmp/c.json' });
  assert.match(semCmd, /nenhum foi informado/);
});

// ————————————————————————————— o ciclo inteiro, num repositório de verdade —————————————————————————————

function git(dir, ...args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

const TASK = {
  id: 'TASK-1', title: 'Recusar pedido sem estoque', description: 'Pedido só é criado com estoque.',
  businessRules: [{ id: 'RN-1', title: 'Estoque', description: 'Recusar pedido sem estoque.',
    implementation: { errorMessages: { SEM_ESTOQUE: 'Estoque insuficiente para {produto}' } } }],
};

/** Repositório com um commit e uma entrega pendente: código com a mensagem e teste que a confere. */
function projeto() {
  const dir = mkdtempSync(join(tmpdir(), 'val-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'test'));
  mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  writeFileSync(join(dir, 'src', 'pedido.js'), 'export function criar() {}\n');
  writeFileSync(join(dir, 'outputs', 'spec', 'tasks.json'), JSON.stringify({ stories: [{ id: 'US-1', tasks: [TASK] }] }));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'src', 'pedido.js'), [
    'export function criar(itens) {',
    '  if (!itens.length) throw new Error("Estoque insuficiente para item");',
    '  return { ok: true };',
    '}', '',
  ].join('\n'));
  writeFileSync(join(dir, 'test', 'pedido.test.js'), 'expect(() => criar([])).toThrow("Estoque insuficiente para");\n');
  return dir;
}

const resultado = (dimensao, verificacoes = [], achados = []) => ({ dimensao, verificacoes, achados });
function responder(acao, porDimensao = {}) {
  for (const a of acao.agentes) {
    const dimensao = a.tipo.replace(/^validador-/, '');
    const destino = a.entrada.replace(/([^/]+)\.md$/, 'resultado-$1.json');
    writeFileSync(destino, JSON.stringify(porDimensao[dimensao] || resultado(dimensao)));
  }
}

test('ciclo completo: acha a regra descumprida, manda corrigir, revalida e aprova', () => {
  const dir = projeto();
  const op = { task: 'TASK-1', repo: dir, 'cmd-testes': 'node --version' };
  const a1 = iniciar(op, dir);
  assert.equal(a1.acao, 'validar');
  const tipos = a1.agentes.map((a) => a.tipo);
  assert.ok(tipos.includes('validador-regras-negocio') && tipos.includes('validador-testes'), tipos.join(','));
  assert.ok(!tipos.includes('validador-performance'), 'nada de consulta: performance dispensada');
  assert.match(readFileSync(a1.agentes[0].entrada, 'utf8'), /RN-1/);

  responder(a1, { 'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'aceita lista com item sem estoque', evidencia: { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (!itens.length)' } }]) });
  const a2 = avancar({ task: 'TASK-1' }, dir);
  assert.equal(a2.acao, 'corrigir');
  assert.match(readFileSync(a2.entrada, 'utf8'), /regras-negocio\|RN-1/);
  assert.match(readFileSync(a2.entrada, 'utf8'), /Rules que valem aqui/, 'o corretor recebe as rules do que vai escrever');

  writeFileSync(join(dir, 'src', 'pedido.js'), [
    'export function criar(itens, estoque) {',
    '  if (itens.some((i) => !estoque[i])) throw new Error("Estoque insuficiente para item");',
    '  return { ok: true };',
    '}', '',
  ].join('\n'));
  const a3 = avancar({ task: 'TASK-1', tokens: 'corretor=1000' }, dir);
  assert.equal(a3.acao, 'validar');
  assert.ok(a3.agentes.some((a) => a.tipo === 'validador-regras-negocio'), 'a dimensão que tinha item aberto revalida');

  responder(a3, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'recusa item sem estoque', evidencia: { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (itens.some((i) => !estoque[i]))' } }]),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'o teste força a recusa e confere a mensagem', evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }]),
  });
  const a4 = avancar({ task: 'TASK-1' }, dir);
  assert.equal(a4.acao, 'fim', JSON.stringify(a4));
  const rel = JSON.parse(readFileSync(a4.relatorio, 'utf8'));
  assert.equal(rel.veredito, 'APROVADO');
  assert.equal(rel.tokens.corretor, 1000);
  assert.ok(rel.historico.length >= 2);
});

test('guarda no ciclo: validador que altera código para o ciclo; corretor que toca o tasks.json também', () => {
  const dir = projeto();
  const a1 = iniciar({ task: 'TASK-1', repo: dir }, dir);
  writeFileSync(join(dir, 'src', 'pedido.js'), 'mexeu\n');
  responder(a1);
  const p = avancar({ task: 'TASK-1' }, dir);
  assert.equal(p.acao, 'parar');
  assert.deepEqual(p.violacoes.map((v) => v.arquivo), ['src/pedido.js']);

  const dir2 = projeto();
  const b1 = iniciar({ task: 'TASK-1', repo: dir2 }, dir2);
  responder(b1, { testes: resultado('testes', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'sem teste do caminho negativo' }]) });
  assert.equal(avancar({ task: 'TASK-1' }, dir2).acao, 'corrigir');
  writeFileSync(join(dir2, 'outputs', 'spec', 'tasks.json'), '{}');
  const q = avancar({ task: 'TASK-1' }, dir2);
  assert.equal(q.acao, 'parar');
  assert.deepEqual(q.violacoes.map((v) => v.arquivo), ['outputs/spec/tasks.json']);
});

test('resultado fora do formato ganha um reenvio e, se insistir, vira INCERTO', () => {
  const dir = projeto();
  const a1 = iniciar({ task: 'TASK-1', repo: dir }, dir);
  responder(a1);
  const alvo = a1.agentes.find((a) => a.tipo === 'validador-testes');
  writeFileSync(alvo.entrada.replace(/([^/]+)\.md$/, 'resultado-$1.json'), '{"dimensao":"outra"}');
  const r = avancar({ task: 'TASK-1' }, dir);
  assert.equal(r.reenvio, true);
  assert.deepEqual(r.agentes.map((a) => a.tipo), ['validador-testes']);
  assert.match(r.agentes[0].problema, /dimensao/);
  const fim = avancar({ task: 'TASK-1' }, dir);
  assert.notEqual(fim.acao, 'fim', 'sem resultado válido não há APROVADO');
  const rel = JSON.parse(readFileSync(join(dir, 'outputs', 'spec', 'auditorias', 'TASK-1.validacao.json'), 'utf8'));
  assert.ok(rel.incertos.some((i) => i.id === 'VALIDADOR-testes'));
});

test('main: imprime uma linha JSON; comando desconhecido e erro saem com 2', () => {
  const dir = projeto();
  const ok = spawnSync(process.execPath, [VALIDAR_MJS, 'iniciar', '--task', 'TASK-1'], { cwd: dir, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).acao, 'validar');
  assert.equal(ok.stdout.trim().split('\n').length, 1);
  assert.equal(spawnSync(process.execPath, [VALIDAR_MJS, 'xpto'], { cwd: dir, encoding: 'utf8' }).status, 2);
  const semTask = spawnSync(process.execPath, [VALIDAR_MJS, 'iniciar', '--task', 'NAO-EXISTE'], { cwd: dir, encoding: 'utf8' });
  assert.equal(semTask.status, 2);
  assert.match(semTask.stderr, /NAO-EXISTE/);
  assert.ok(!existsSync(join(dir, 'outputs', 'spec', 'validacao', 'NAO-EXISTE', 'estado.json')));
});

test('avancar recusa estado.json reescrito por um agente — senão um validador ganharia execução de comando', () => {
  const dir = projeto();
  iniciar({ task: 'TASK-1', repo: dir }, dir);
  const caminho = join(dir, 'outputs', 'spec', 'validacao', 'TASK-1', 'estado.json');
  const estado = JSON.parse(readFileSync(caminho, 'utf8'));
  estado.cmds = { ...(estado.cmds || {}), testes: 'echo invadido > invadido.txt' };
  writeFileSync(caminho, `${JSON.stringify(estado, null, 2)}\n`);
  assert.throws(() => avancar({ task: 'TASK-1' }, dir), /alterado fora do validar\.mjs/);
  assert.ok(!existsSync(join(dir, 'invadido.txt')), 'o comando forjado não pode ter rodado');
});

// ————————————————————————————— os agentes e a fixture —————————————————————————————

const DIR_AGENTES = fileURLToPath(new URL('../agents/', import.meta.url));
// A versão Kiro exclui `.claude/agents/` (formato de agente do Claude Code, sem equivalente lá).
const SEM_AGENTES = existsSync(join(DIR_AGENTES, 'corretor.md')) ? false : 'esta cópia não traz os agentes (a versão Kiro os exclui)';

test('todo agente que o validar.mjs dispara tem definição: enxuta, sem CLAUDE.md, só com as ferramentas dele', { skip: SEM_AGENTES }, () => {
  for (const nome of [...DIMENSOES.map((d) => `validador-${d}`), 'corretor']) {
    const texto = readFileSync(join(DIR_AGENTES, `${nome}.md`), 'utf8');
    const fm = (/^---\r?\n([\s\S]*?)\r?\n---/.exec(texto) || [])[1] || '';
    const campo = (k) => (new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm) || [])[1] || '';
    assert.equal(campo('name'), nome);
    // `omitClaudeMd` é campo do Claude Code a partir da 2.1.295; versão anterior, Cursor e Kiro o
    // ignoram. O teste confere só que o campo está lá — o efeito depende da versão de quem roda.
    assert.equal(campo('omitClaudeMd'), 'true', `${nome}: falta omitClaudeMd: true no frontmatter`);
    assert.ok(campo('description').length > 20 && campo('description').length <= 200, `${nome}: a descrição entra em toda sessão`);
    assert.ok(Number(campo('maxTurns')) > 0, `${nome}: sem maxTurns um agente perdido não para`);
    // O harness roda em Claude Code, Cursor e Kiro, com modelos de qualquer fabricante: nenhum agente
    // fixa modelo. O custo cai pela varredura determinística, pelo turno único e pela revalidação
    // incremental, que valem para qualquer modelo.
    assert.equal(campo('model'), 'inherit', `${nome}: modelo fixo prende o harness a um fabricante`);
    const tools = campo('tools').split(',').map((t) => t.trim()).sort();
    if (nome === 'corretor') assert.deepEqual(tools, ['Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Write']);
    else assert.deepEqual(tools, ['Glob', 'Grep', 'Read', 'Write'], `${nome}: validador lê e grava o próprio resultado, nada mais`);
  }
});

test('.claude/agents/ é zona imutável: o corretor não reescreve o validador', () => {
  assert.ok(ZONA_IMUTAVEL.includes('.claude/agents/'));
});

const FIXTURE = fileURLToPath(new URL('./validacao/fixture/', import.meta.url));

test('fixture: as seis dimensões rodam e o determinístico acha exatamente o que o esperado.json diz', () => {
  const esperado = JSON.parse(readFileSync(join(FIXTURE, 'esperado.json'), 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'fix-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  cpSync(join(FIXTURE, 'base'), dir, { recursive: true });
  mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
  cpSync(join(FIXTURE, 'tasks.json'), join(dir, 'outputs', 'spec', 'tasks.json'));
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  cpSync(join(FIXTURE, 'entrega'), dir, { recursive: true });

  const acao = iniciar({ task: esperado.task, repo: dir }, dir);
  assert.deepEqual(acao.agentes.map((a) => a.tipo.replace(/^validador-/, '')).sort(), [...esperado.dimensoes].sort());
  const estado = JSON.parse(readFileSync(join(dir, 'outputs', 'spec', 'validacao', esperado.task, 'estado.json'), 'utf8'));
  const veredito = Object.fromEntries(estado.deterministico.map((v) => [v.id, v.veredito]));
  for (const id of esperado.deterministico.NAO_CUMPRE) assert.equal(veredito[id], 'NAO_CUMPRE', id);
  for (const id of esperado.deterministico.CUMPRE) assert.equal(veredito[id], 'CUMPRE', id);
  // O código da entrega não pode carregar nota que entregue o defeito ao validador.
  for (const v of acao.agentes) assert.ok(!/defeito|plantad|N\+1|propósito/i.test(readFileSync(v.entrada, 'utf8')), v.tipo);
});

// A `spec-implement` é skill do kit, e a próxima entrega dele chega por merge de três pontas. Sem este
// teste, um merge descuidado apaga o G3 em silêncio e a skill volta a mover a task sem validação.
test('a spec-implement chama o validar.mjs no passo G3, antes do H, com os três códigos', () => {
  const skill = readFileSync(fileURLToPath(new URL('../../.claude/skills/spec-implement/SKILL.md', import.meta.url)), 'utf8');
  const g3 = skill.indexOf('## G3 — Validação independente');
  const h = skill.indexOf('## H — Update Azure DevOps');
  assert.ok(g3 > 0 && g3 < h, 'a seção G3 existe e vem antes do H');
  assert.match(skill, /node \.claude\/ferramentas\/validar\.mjs iniciar/);
  assert.match(skill, /node \.claude\/ferramentas\/validar\.mjs avancar/);
  assert.match(skill, /`--cmd-testes` é o comando \*\*completo\*\* de testes do projeto/, 'teste novo do corretor fora do comando escapa da checagem');
  for (const codigo of ['VALIDACAO_INDEPENDENTE_APROVADA', 'VALIDACAO_PARADA', 'VALIDACAO_INDISPONIVEL']) {
    assert.ok(skill.includes(`| \`${codigo}\` |`), `${codigo} no quadro de validadores`);
  }
});

// ————————————————————————————— ajustes da calibração (2026-10-16) —————————————————————————————

const MD = [
  '---', 'description: x', '---', '# Título', 'intro',
  '## Camada A — Auth', 'linha a', '### sub de A', 'linha sub',
  '## Camada D — Cripto', 'linha d',
  '## Camada B — Acesso', '```', '## dentro de bloco de código não é título', '```', 'linha b',
].join('\n');

test('secoes pega a seção com as subseções, para no próximo título de mesmo nível e ignora # em bloco de código', () => {
  const t = secoes(MD, /^Camada A/);
  assert.match(t, /linha a/);
  assert.match(t, /sub de A/);
  assert.ok(!/Camada D|description/.test(t), t);
  assert.equal(secoes(MD, /^Inexistente/), '');
  assert.match(secoes(MD, /^Camada B/), /linha b/, 'o ## dentro do bloco de código não fecha a seção');
});

const discoFalso = (arquivos) => ({
  ler: (rel) => arquivos[rel] || '',
  listar: (pasta) => Object.keys(arquivos).filter((k) => k.startsWith(`${pasta}/`) && !k.slice(pasta.length + 1).includes('/')).map((k) => k.slice(pasta.length + 1)),
});

test('trechosDeRules: rule do maquinário (`harness-*`) na pasta de rules do projeto não é rule do projeto', () => {
  // No Kiro, as rules do harness e as do projeto dividem `.kiro/steering/`: sem este filtro, a rule
  // de frontend do harness entrava como "rule do projeto" mesmo sem arquivo de tela, e a de segurança
  // entrava inteira para o validador de rules técnicas.
  const disco = discoFalso({
    '.claude/rules/harness-frontend.md': '## MUST NOT (lista compacta)\nfetch na UI',
    '.claude/rules/harness-security.md': '## Proibido\nsegredo no código',
    '.claude/rules/arquitetura.md': '## Anti-patterns\nGod service',
  });
  const back = trechosDeRules({ dimensoes: ['rules-tecnicas'], arquivos: ['src/Pedido.java'], ...disco });
  assert.match(back, /God service/);
  assert.ok(!/fetch na UI|segredo no código/.test(back), back);
  // A rule do harness pelo caminho por extenso, que cada saída reescreve para o seu (no Kiro ele
  // coincide com o `harness-frontend.md` acima, e o conteúdo dele passa a ser este).
  const comHarness = discoFalso({
    '.claude/rules/harness-frontend.md': '## MUST NOT (lista compacta)\nfetch na UI',
    '.claude/rules/harness/frontend.md': '# F\nNext.js',
  });
  assert.equal(regrasFrontendNextEmVigor(comHarness), true,
    'a rule de frontend do harness não conta como rule de frontend do projeto');
});

test('trechosDeRules: segurança leva os vetores e as camadas A-C, E-G; rules técnicas leva frontend só com arquivo de tela', () => {
  const disco = discoFalso({
    '.claude/references/seguranca/vetores.md': '# Vetores\nIDOR e afins',
    '.claude/rules/harness/security.md': '## Camada B — Acesso\nfiltra pelo dono\n## Camada D — Cripto\nAES',
    '.claude/rules/harness/frontend.md': '## MUST NOT (lista compacta)\nfetch na UI\n## Stack\nNext',
    '.claude/rules/arquitetura.md': '## Visão\nx\n## Anti-patterns\nGod service',
  });
  const seg = trechosDeRules({ dimensoes: ['seguranca'], arquivos: ['src/a.js'], ...disco });
  assert.match(seg, /IDOR/);
  assert.match(seg, /filtra pelo dono/);
  assert.ok(!/AES/.test(seg), 'a camada de criptografia não entra');
  const front = trechosDeRules({ dimensoes: ['rules-tecnicas'], arquivos: ['src/Tela.tsx'], ...disco });
  assert.match(front, /fetch na UI/);
  assert.match(front, /God service/, 'as rules do projeto na raiz de .claude/rules/ entram');
  assert.ok(!/Next/.test(front));
  const back = trechosDeRules({ dimensoes: ['rules-tecnicas'], arquivos: ['src/Pedido.java'], ...disco });
  assert.ok(!/fetch na UI/.test(back), 'sem arquivo de tela, a rule de frontend não entra');
  assert.equal(trechosDeRules({ dimensoes: ['performance'], arquivos: ['src/a.js'], ...disco }), '');
  const cortado = trechosDeRules({ dimensoes: ['seguranca'], arquivos: [], ...disco, limite: 20 });
  assert.match(cortado, /cortado no limite/);
});

const RAIZ_HARNESS = fileURLToPath(new URL('../../', import.meta.url));
const DISCO_REAL = {
  ler: (rel) => { try { return readFileSync(join(RAIZ_HARNESS, rel), 'utf8'); } catch { return ''; } },
  listar: () => [],
};

test('trechosDeRules contra as rules reais do harness: os títulos que o recorte procura existem', () => {
  const seg = trechosDeRules({ dimensoes: ['seguranca'], arquivos: [], ...DISCO_REAL });
  for (const c of ['A', 'B', 'C', 'E', 'F', 'G']) assert.match(seg, new RegExp(`Camada ${c} —`), c);
  assert.ok(!/Camada D —|Camada H —/.test(seg));
  const front = trechosDeRules({ dimensoes: ['rules-tecnicas'], arquivos: ['src/a.tsx'], ...DISCO_REAL });
  assert.match(front, /MUST NOT \(lista compacta\)/);
  assert.match(front, /AppError/);
  assert.ok(seg.length <= LIMITE_TRECHOS + 200 && front.length <= LIMITE_TRECHOS + 200);
});

test('a entrada do validador diz a pasta do código e cerca os trechos de rule com til', () => {
  const v = textoParaValidador({ dimensao: 'seguranca', task: { id: 'T-1' }, recorte: 'x', rodada: 1, caminhoResultado: '/r.json', repo: '/codigo', rules: '## Camada B\n```js\ncodigo\n```' });
  assert.match(v, /Pasta do código:\*\* `\/codigo`/);
  assert.match(v, /~~~~markdown\n## Camada B\n```js\ncodigo\n```\n~~~~/);
  const semRules = textoParaValidador({ dimensao: 'performance', task: { id: 'T-1' }, recorte: 'x', rodada: 1, caminhoResultado: '/r.json' });
  assert.ok(!/Rules que valem aqui|Pasta do código/.test(semRules));
  const c = textoParaCorretor({ task: { id: 'T-1' }, grupo: { itens: [] }, numero: 1, total: 1, rodada: 1, caminhoRegistro: '/c.json', rules: 'fetch na UI' });
  assert.match(c, /todo arquivo novo que criar/);
});

test('fixture: segurança e rules técnicas recebem os trechos de rule e a pasta do código', () => {
  const esperado = JSON.parse(readFileSync(join(FIXTURE, 'esperado.json'), 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'fix6-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  cpSync(join(FIXTURE, 'base'), dir, { recursive: true });
  mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
  cpSync(join(FIXTURE, 'tasks.json'), join(dir, 'outputs', 'spec', 'tasks.json'));
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  cpSync(join(FIXTURE, 'entrega'), dir, { recursive: true });
  const acao = iniciar({ task: esperado.task, repo: dir }, dir);
  const texto = (tipo) => readFileSync(acao.agentes.find((a) => a.tipo === tipo).entrada, 'utf8');
  assert.match(texto('validador-seguranca'), /Camada B —/);
  assert.match(texto('validador-rules-tecnicas'), /MUST NOT \(lista compacta\)/);
  for (const a of acao.agentes) assert.match(readFileSync(a.entrada, 'utf8'), /\*\*Pasta do código:\*\*/, a.tipo);
  assert.ok(!/Rules que valem aqui/.test(texto('validador-performance')), 'quem não precisa de rule não paga por ela');
});

// Fase 1 (2026-10-16): as rules e o recorte com número de linha vêm na entrada, então o validador
// responde em um turno. Cada volta a mais reenviava o contexto inteiro — era o grosso dos 545 mil
// tokens dos validadores na recalibração. Quatro voltas: ler a entrada, uma leitura de exceção,
// gravar, responder.
test('os validadores respondem em um turno, só com CRITICO e ALTO, e ficam na pasta do código', { skip: SEM_AGENTES }, () => {
  for (const d of DIMENSOES) {
    const fm = readFileSync(join(DIR_AGENTES, `validador-${d}.md`), 'utf8');
    assert.ok(Number((/^maxTurns:\s*(\d+)/m.exec(fm) || [])[1]) <= 4, `validador-${d}: mais de 4 voltas`);
    assert.match(fm, /## Como trabalhar — em um turno/, d);
    assert.match(fm, /Só CRITICO e ALTO/, d);
    assert.match(fm, /Só a pasta do código/, d);
    assert.ok(!/Severidade MEDIO|: MEDIO\.|: BAIXO\.|\*\*BAIXO\*\*/.test(fm), `validador-${d}: ainda manda reportar MEDIO ou BAIXO`);
  }
});

// ————————————————————————————— ajustes da recalibração (2026-10-16) —————————————————————————————

const COM_PERGUNTAS = ['regras-negocio', 'testes'];

test('dimensão sem perguntas: verificação negativa é ignorada, positiva some, duplicata de achado é descartada', () => {
  const c = consolidar({
    resultados: {
      seguranca: {
        verificacoes: [
          { id: 'idor-get-pedido', veredito: 'INCERTO', motivo: 'a rota do servidor não está na entrega' },
          { id: 'sem-pii-no-log', veredito: 'NAO_CUMPRE', motivo: 'CPF no log', evidencia: EV(3) },
          { id: 'tudo-certo', veredito: 'CUMPRE', motivo: 'ok', evidencia: EV(3) },
        ],
        achados: [achado('ALTO', 3, { titulo: 'CPF no log' })],
      },
      'regras-negocio': { verificacoes: [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'não valida' }], achados: [] },
    },
    dimensoesComPerguntas: COM_PERGUNTAS,
    conferir,
  });
  assert.deepEqual(c.bloqueantes.map((b) => b.id || b.titulo).sort(), ['CPF no log', 'RN-1'], 'quem bloqueia é o achado e a regra de negócio');
  assert.equal(c.ignorados, 1, 'só a verificação que não repete o achado conta como ignorada');
  assert.equal(c.incertos.length, 0, 'incerteza de dimensão sem perguntas não trava o ciclo');
});

// O caso exato que parou a recalibração na rodada 3.
test('o "fetch sem tempo limite" mandado como verificação de performance não trava mais o ciclo', () => {
  const c = consolidar({
    resultados: { performance: { verificacoes: [{ id: 'chamada-externa-com-timeout', veredito: 'NAO_CUMPRE', motivo: 'fetch sem timeout' }], achados: [] } },
    dimensoesComPerguntas: COM_PERGUNTAS,
    conferir,
  });
  assert.equal(c.veredito, 'APROVADO');
  assert.equal(c.ignorados, 1);
});

test('verificação de dimensão sem perguntas com evidência falsa é descartada, não conta como ignorada', () => {
  const c = consolidar({
    resultados: { performance: { verificacoes: [{ id: 'x', veredito: 'NAO_CUMPRE', motivo: 'm', evidencia: EV(3, 'não existe') }], achados: [] } },
    dimensoesComPerguntas: COM_PERGUNTAS,
    conferir,
  });
  assert.equal(c.ignorados, 0);
  assert.equal(c.descartados.length, 1);
});

test('sem a lista de dimensões com perguntas, o comportamento antigo continua', () => {
  const c = consolidar({ resultados: { seguranca: { verificacoes: [{ id: 'x', veredito: 'NAO_CUMPRE', motivo: 'm' }], achados: [] } }, conferir });
  assert.equal(c.bloqueantes.length, 1);
});

test('o formato de quem não tem perguntas pede verificacoes vazia; o de quem tem traz o modelo', () => {
  const sem = textoParaValidador({ dimensao: 'performance', task: { id: 'T-1' }, recorte: 'x', rodada: 1, caminhoResultado: '/r.json' });
  assert.match(sem, /"verificacoes": \[\],/);
  assert.match(sem, /Deixe `verificacoes` vazia/);
  assert.ok(!/"id": "<id do item>"/.test(sem));
  const com = textoParaValidador({ dimensao: 'testes', task: { id: 'T-1' }, perguntas: [{ id: 'RN-1', origem: 'regra', texto: 'r' }], recorte: 'x', rodada: 1, caminhoResultado: '/r.json' });
  assert.match(com, /"id": "<id do item>"/);
  assert.match(com, /CUMPRE exige evidência/);
});

test('ciclo: verificação negativa de segurança é ignorada e o ciclo termina APROVADO', () => {
  const dir = projeto();
  const a1 = iniciar({ task: 'TASK-1', repo: dir }, dir);
  responder(a1, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'recusa lista vazia', evidencia: { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (!itens.length)' } }]),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'o teste força a recusa', evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }]),
    seguranca: resultado('seguranca', [{ id: 'rate-limit', veredito: 'NAO_CUMPRE', motivo: 'sem limite de requisições' }]),
  });
  const fim = avancar({ task: 'TASK-1' }, dir);
  assert.equal(fim.acao, 'fim', JSON.stringify(fim));
  const rel = JSON.parse(readFileSync(join(dir, 'outputs', 'spec', 'auditorias', 'TASK-1.validacao.json'), 'utf8'));
  assert.equal(rel.medioEBaixo.descartadosSemLista, 1);
});

// ————————————————————————————— varredura determinística (Fase 1, 2026-10-16) —————————————————————————————

const novo = (arquivo, texto) => arquivoNovo(arquivo, texto);
const regrasDe = (achados) => achados.map((a) => `${a.regra}@${a.evidencia.arquivo}:${a.evidencia.linha}`).sort();

test('varredura: acha na fixture, sem modelo, os seis problemas que não são de regra de negócio', () => {
  const ler = (rel) => readFileSync(join(FIXTURE, 'entrega', rel), 'utf8');
  const achados = varrer(['src/pedidos/pedido.service.js', 'src/components/ResumoPedido.jsx', 'test/pedido.service.test.js']
    .map((rel) => novo(rel, ler(rel))));
  assert.deepEqual(regrasDe(achados), [
    'erro-engolido@src/pedidos/pedido.service.js:13',
    'fetch-na-tela@src/components/ResumoPedido.jsx:6',
    'formato-no-jsx@src/components/ResumoPedido.jsx:9',
    'io-no-laco@src/pedidos/pedido.service.js:6',
    'pii-no-log@src/pedidos/pedido.service.js:4',
  ]);
  assert.deepEqual(achados.find((a) => a.regra === 'pii-no-log').dimensoes, ['seguranca', 'observabilidade']);
  assert.ok(achados.every((a) => ['CRITICO', 'ALTO'].includes(a.severidade)), 'a varredura só produz o que bloqueia');
});

test('varredura: as regras são estreitas — caso legítimo não dispara', () => {
  const limpo = varrer([
    novo('src/a.service.js', [
      "const senha = process.env.SENHA_DB;",
      "const apiKey = '<sua-chave-aqui>';",
      "console.log('pedido criado', pedido.id);",
      "const estoques = await Promise.all(itens.map((i) => buscarEstoque(i.id)));",
      'try {',
      '  await gravar();',
      '} catch (e) {',
      "  logger.error('falha ao gravar', { id });",
      '  throw e;',
      '}',
      "el.innerHTML = DOMPurify.sanitize(html);",
      "await db.query('select * from pedido where id = $1', [id]);",
    ].join('\n')),
    novo('src/pedidos/pedido.service.js', "export const buscar = (id) => fetch(paths.detalhe(id));"),
    novo('test/a.test.js', "console.log(cliente.cpf); const password = 'senha-de-teste-123';"),
  ]);
  assert.deepEqual(regrasDe(limpo), []);
});

test('varredura: segredo, HTML cru, token no storage, SQL e shell montados', () => {
  const achados = varrer([novo('src/x.js', [
    "const cfg = { password: 'Sup3rS3cretaDeVerdade' };",
    'const k = "AKIAABCDEFGHIJKLMNOP";',
    'div.innerHTML = comentario.texto;',
    "localStorage.setItem('authToken', token);",
    'await db.query(`select * from pedido where id = ${id}`);',
    'exec(`convert ${arquivo} saida.png`);',
    'NEXT_PUBLIC_STRIPE_SECRET_KEY=sk',
  ].join('\n'))]);
  assert.deepEqual(achados.map((a) => a.regra), [
    'segredo-atribuido', 'segredo-token-conhecido', 'html-cru', 'token-no-storage', 'sql-montado', 'shell-montado', 'segredo-publico',
  ]);
  assert.equal(achados.find((a) => a.regra === 'segredo-token-conhecido').severidade, 'CRITICO');
});

test('varredura: só a linha acrescentada conta — código antigo é dívida, não desta task', () => {
  const [item] = parsearDiff([
    'diff --git a/src/a.js b/src/a.js', '--- a/src/a.js', '+++ b/src/a.js', '@@ -1,2 +1,3 @@',
    " console.log('velho', cliente.cpf);", '+const x = 1;', ' fim();', '',
  ].join('\n'));
  assert.deepEqual(varrer([item]), []);
});

test('ferramentas externas: Semgrep (só ERROR) e gitleaks viram achado com o texto do disco, só nas linhas novas', () => {
  const linhas = () => ['a', 'eval(x)', 'token = "abc"'];
  const sg = lerSemgrep({ results: [
    { check_id: 'js.lang.eval', path: 'src\\a.js', start: { line: 2 }, extra: { severity: 'ERROR', message: 'eval perigoso' } },
    { check_id: 'js.lang.medio', path: 'src/a.js', start: { line: 1 }, extra: { severity: 'WARNING', message: 'm' } },
  ] }, linhas);
  assert.deepEqual(sg.map((a) => [a.evidencia.arquivo, a.evidencia.linha, a.evidencia.trecho, a.severidade]), [['src/a.js', 2, 'eval(x)', 'ALTO']]);
  const gl = lerGitleaks([{ RuleID: 'generic-api-key', File: 'src/a.js', StartLine: 3, Secret: 'abc' }], linhas);
  assert.equal(gl[0].severidade, 'CRITICO');
  assert.ok(!JSON.stringify(gl).includes('"abc"') || gl[0].evidencia.trecho.includes('abc'), 'o segredo só aparece na linha citada');
  const mudancas = [{ arquivo: 'src/a.js', trechos: [{ linhas: [{ tipo: '+', numero: 2, texto: 'eval(x)' }] }] }];
  assert.deepEqual(soNasLinhasNovas([...sg, ...gl], mudancas).map((a) => a.evidencia.linha), [2]);
});

test('consolidar: o validador que repete o achado da varredura na mesma linha não vira segundo bloqueante', () => {
  const det = { origem: 'determinístico', regra: 'pii-no-log', dimensoes: ['seguranca', 'observabilidade'], severidade: 'ALTO',
    titulo: 'dado pessoal no log', motivo: 'm', correcao: 'c', evidencia: EV(3) };
  const c = consolidar({
    achadosDeterministicos: [det],
    resultados: { seguranca: { verificacoes: [], achados: [achado('ALTO', 3, { titulo: 'CPF no log' })] } },
    conferir,
  });
  assert.equal(c.bloqueantes.length, 1);
  assert.equal(c.bloqueantes[0].regra, 'pii-no-log');
  assert.deepEqual(c.bloqueantes[0].dimensoes, ['seguranca', 'observabilidade']);
  const falso = consolidar({ achadosDeterministicos: [{ ...det, evidencia: EV(3, 'não existe') }], resultados: {}, conferir });
  assert.equal(falso.bloqueantes.length, 0, 'achado da varredura também passa pela conferência no disco');
  assert.equal(falso.descartados.length, 1);
});

test('fixture: o iniciar roda a varredura e conta para cada validador o que já foi achado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fix-var-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  cpSync(join(FIXTURE, 'base'), dir, { recursive: true });
  mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
  cpSync(join(FIXTURE, 'tasks.json'), join(dir, 'outputs', 'spec', 'tasks.json'));
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  cpSync(join(FIXTURE, 'entrega'), dir, { recursive: true });
  const acao = iniciar({ task: 'TASK-FIX-001', repo: dir, 'sem-externas': 'true' }, dir);
  const estado = JSON.parse(readFileSync(join(dir, 'outputs', 'spec', 'validacao', 'TASK-FIX-001', 'estado.json'), 'utf8'));
  assert.equal(estado.achadosDeterministicos.length, 5);
  const seguranca = readFileSync(acao.agentes.find((a) => a.tipo === 'validador-seguranca').entrada, 'utf8');
  assert.match(seguranca, /## Já achado por código \(não repita\)/);
  assert.match(seguranca, /src\/pedidos\/pedido\.service\.js:4/);
  assert.match(seguranca, /Só CRITICO e ALTO/);
});

// ————————————————————————————— revalidação incremental (Fase 1, 2026-10-16) —————————————————————————————

test('linhasMudadas: só as linhas que a correção trocou ou acrescentou; sem a cópia de antes, tudo', () => {
  assert.deepEqual(linhasMudadas('a\nb\nc', 'a\nX\nc\nd'), [2, 4]);
  assert.deepEqual(linhasMudadas('a\nb', 'a\nb'), []);
  assert.deepEqual(linhasMudadas(null, 'a\nb'), [1, 2]);
});

test('revalidação incremental: só o arquivo que a correção tocou, linhas marcadas, pergunta resolvida aproveitada', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'outro.js'), 'export function outro(x) {\n  if (!x) throw new Error("x");\n  return x;\n}\n');
  const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  const ehDe = (acao, d) => acao.agentes.find((a) => a.tipo === `validador-${d}`);
  assert.ok(ehDe(a1, 'seguranca') && ehDe(a1, 'testes') && ehDe(a1, 'regras-negocio'));
  responder(a1, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'aceita item sem estoque' }]),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'o teste confere a mensagem', evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }]),
    seguranca: resultado('seguranca', [], [{ titulo: 'pedido sem dono', severidade: 'ALTO', motivo: 'um cliente cria pedido em nome de outro', correcao: 'conferir o dono',
      evidencia: { arquivo: 'src/pedido.js', linha: 1, trecho: 'export function criar(itens' } }]),
  });
  const a2 = avancar({ task: 'TASK-1' }, dir);
  assert.equal(a2.acao, 'corrigir');
  const antes = join(dir, 'outputs', 'spec', 'validacao', 'TASK-1', 'rodada-1', 'antes');
  assert.ok(JSON.parse(readFileSync(join(antes, 'indice.json'), 'utf8'))['src/pedido.js'], 'a cópia de antes da correção');
  assert.ok(!existsSync(join(antes, 'test')), 'nomes neutros: o test runner não acha a cópia');

  writeFileSync(join(dir, 'src', 'pedido.js'), [
    'export function criar(itens, estoque) {',
    '  if (itens.some((i) => !estoque[i])) throw new Error("Estoque insuficiente para item");',
    '  return { ok: true };',
    '}', '',
  ].join('\n'));
  let a3 = avancar({ task: 'TASK-1' }, dir);
  while (a3.acao === 'corrigir') a3 = avancar({ task: 'TASK-1' }, dir); // o grupo sem arquivo (RN-1 sem evidência)
  assert.equal(a3.acao, 'validar');
  const regras = readFileSync(ehDe(a3, 'regras-negocio').entrada, 'utf8');
  assert.match(regras, /## Esta é uma revalidação/);
  assert.match(regras, /\s2 \*\| +if \(itens\.some/, 'a linha que a correção mudou vem marcada com *');
  assert.match(regras, /`RN-1`/, 'a pergunta em aberto é feita de novo');
  assert.ok(!/src\/outro\.js/.test(regras), 'arquivo que a correção não tocou fica fora do recorte');
  const testes = readFileSync(ehDe(a3, 'testes').entrada, 'utf8');
  assert.match(testes, /Já resolvidas antes, em código que a correção não tocou \(não responda\): `RN-1`/);
  assert.ok(!/## O que verificar/.test(testes), 'nada a perguntar de novo para testes');
  const seguranca = readFileSync(ehDe(a3, 'seguranca').entrada, 'utf8');
  assert.match(seguranca, /### Em aberto da rodada anterior[\s\S]*pedido sem dono/);

  responder(a3, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'recusa item sem estoque', evidencia: { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (itens.some((i) => !estoque[i]))' } }]),
  });
  const a4 = avancar({ task: 'TASK-1' }, dir);
  assert.equal(a4.acao, 'fim', JSON.stringify(a4));
  const estado = JSON.parse(readFileSync(join(dir, 'outputs', 'spec', 'validacao', 'TASK-1', 'estado.json'), 'utf8'));
  assert.equal(estado.resultados.testes.verificacoes.find((v) => v.id === 'RN-1').veredito, 'CUMPRE', 'o CUMPRE de testes da rodada 1 continua valendo');
});

test('revalidação incremental: dimensão sem nada a rever não é chamada', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'estilo.css'), '.a { color: red; }\n');
  const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  responder(a1, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'aceita item sem estoque' }]),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok', evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }]),
  });
  avancar({ task: 'TASK-1' }, dir);
  writeFileSync(join(dir, 'test', 'pedido.test.js'), 'expect(() => criar([])).toThrow("Estoque insuficiente para");\nexpect(1).toBe(1);\n');
  const a3 = avancar({ task: 'TASK-1' }, dir);
  // A correção tocou só um teste: rules técnicas (código e estilo) não tem o que rever e não é chamada.
  assert.ok(!a3.agentes || !a3.agentes.some((a) => a.tipo === 'validador-rules-tecnicas'), JSON.stringify(a3));
});

test('corretor: a entrada diz o escopo — os arquivos do grupo, os testes e no máximo NOVOS_POR_GRUPO arquivos novos', () => {
  const t = textoParaCorretor({ task: { id: 'T-1' }, grupo: { arquivos: ['src/a.js'], itens: [{ chave: 'k', dimensao: 'seguranca', motivo: 'm' }] },
    numero: 1, total: 1, rodada: 1, caminhoRegistro: '/r.json' });
  assert.match(t, /## Escopo/);
  assert.match(t, /`src\/a\.js`/);
  assert.match(t, new RegExp(`no máximo ${GUARDA.NOVOS_POR_GRUPO} arquivos novos`));
  assert.match(t, /não corrigido: exige refatoração/);
});

test('guarda: o corretor fica no escopo do grupo — arquivos dos itens, testes e até NOVOS_POR_GRUPO arquivos novos', () => {
  const escopo = { arquivos: ['src/a.js'] };
  assert.deepEqual(violacoes({ mudados: ['src/a.js', 'test/a.test.js'], fase: 'corrigir', escopo }), []);
  assert.deepEqual(violacoes({ mudados: ['src/b.js'], fase: 'corrigir', escopo }).map((v) => v.arquivo), ['src/b.js'], 'arquivo que já existia, fora do grupo');
  const limite = Array.from({ length: GUARDA.NOVOS_POR_GRUPO }, (_, i) => `src/n${i + 1}.js`);
  assert.deepEqual(violacoes({ mudados: limite, fase: 'corrigir', escopo, novos: limite }), []);
  const umAMais = [...limite, 'src/extra.js'];
  assert.equal(violacoes({ mudados: umAMais, fase: 'corrigir', escopo, novos: umAMais }).length, 1, 'um arquivo novo além do limite é refatoração');
});

test('revalidação incremental: regras de negócio sem pergunta reaberta não é chamada, mesmo com arquivo tocado', () => {
  const dir = projeto();
  const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  responder(a1, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'recusa lista vazia', evidencia: { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (!itens.length)' } }]),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'o teste não força a recusa' }]),
  });
  assert.equal(avancar({ task: 'TASK-1' }, dir).acao, 'corrigir');
  writeFileSync(join(dir, 'test', 'pedido.test.js'), 'expect(() => criar([])).toThrow("Estoque insuficiente para item");\n');
  const a3 = avancar({ task: 'TASK-1' }, dir);
  assert.equal(a3.acao, 'validar', JSON.stringify(a3));
  const tipos = a3.agentes.map((a) => a.tipo);
  assert.ok(tipos.includes('validador-testes'), 'testes tem a pergunta reaberta');
  assert.ok(!tipos.includes('validador-regras-negocio'), 'regras de negócio já estava CUMPRE em código que a correção não tocou');
});

// ————————————————————————————— revisão do G3 (2026-10-19) —————————————————————————————

const caminhoTrabalho = (dir, task = 'TASK-1') => join(dir, 'outputs', 'spec', 'validacao', task);
const lerEstadoJson = (dir, task = 'TASK-1') => JSON.parse(readFileSync(join(caminhoTrabalho(dir, task), 'estado.json'), 'utf8'));
const destinoDe = (a) => a.entrada.replace(/([^/]+)\.md$/, 'resultado-$1.json');
const lerRelatorio = (dir, task = 'TASK-1') => JSON.parse(readFileSync(join(dir, 'outputs', 'spec', 'auditorias', `${task}.validacao.json`), 'utf8'));

// 1 — nome com acento ou espaço
test('desaspar: desfaz as aspas C do git, com octal em UTF-8 e escapes', () => {
  assert.equal(desaspar('"src/a\\303\\247\\303\\243o com espa\\303\\247o.js"'), 'src/ação com espaço.js');
  assert.equal(desaspar('"src/x\\"y.js"'), 'src/x"y.js');
  assert.equal(desaspar('src/simples.js'), 'src/simples.js');
});

test('parsearDiff: nome entre aspas, nome com espaço (o git põe TAB no fim do +++) e arquivo removido', () => {
  const diff = [
    'diff --git "a/src/a\\303\\247\\303\\243o.js" "b/src/a\\303\\247\\303\\243o.js"',
    '--- "a/src/a\\303\\247\\303\\243o.js"', '+++ "b/src/a\\303\\247\\303\\243o.js"', '@@ -1 +1 @@', '-a', '+b',
    'diff --git a/src/com espaço b/x.js b/src/com espaço b/x.js',
    '--- a/src/com espaço b/x.js\t', '+++ b/src/com espaço b/x.js\t', '@@ -1 +1 @@', '-a', '+b',
    'diff --git a/src/sai.js b/src/sai.js', 'deleted file mode 100644', '--- a/src/sai.js', '+++ /dev/null', '@@ -1 +0,0 @@', '-a', '',
  ].join('\n');
  assert.deepEqual(parsearDiff(diff).map((i) => i.arquivo), ['src/ação.js', 'src/com espaço b/x.js', 'src/sai.js']);
});

test('ciclo: arquivo com acento e espaço no nome entra no recorte e o achado dele não some', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'ação com espaço.js'), "export const f = (cliente) => console.log('x', cliente.cpf);\n");
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'acento');
  writeFileSync(join(dir, 'src', 'ação com espaço.js'), "export const f = (cliente) => console.log('y', cliente.cpf);\n");
  iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  const estado = lerEstadoJson(dir);
  assert.ok(estado.achadosDeterministicos.some((a) => a.regra === 'pii-no-log' && a.evidencia.arquivo === 'src/ação com espaço.js'),
    JSON.stringify(estado.achadosDeterministicos.map((a) => a.evidencia.arquivo)));
});

// 2 — a guarda fotografa também a régua do harness, quando o harness não é o repositório do código
function harnessSeparado() {
  const raiz = mkdtempSync(join(tmpdir(), 'harn-'));
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  // Caminho por extenso: o gerador reescreve '.claude/rules' inteiro (no Kiro, '.kiro/steering'), não
  // os pedaços de um join.
  mkdirSync(join(raiz, '.claude/rules'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec', 'tasks.json'), JSON.stringify({ stories: [{ id: 'US-1', tasks: [TASK] }] }));
  writeFileSync(join(raiz, '.claude/rules/arquitetura.md'), '## MUST NOT\nnada\n');
  return raiz;
}

test('guarda: com o harness fora do repositório, o corretor que mexe no tasks.json, em outputs/spec/ ou em .claude/ do harness para o ciclo', () => {
  for (const alvo of [['outputs', 'spec', 'tasks.json'], ['.claude/rules/arquitetura.md'], ['outputs', 'spec', 'outro.md']]) {
    const raiz = harnessSeparado();
    const dir = projeto();
    const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, raiz);
    responder(a1, { testes: resultado('testes', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'sem teste do caminho negativo' }]) });
    assert.equal(avancar({ task: 'TASK-1' }, raiz).acao, 'corrigir');
    writeFileSync(join(raiz, ...alvo), 'mexido');
    const r = avancar({ task: 'TASK-1' }, raiz);
    assert.equal(r.acao, 'parar', alvo.join('/'));
    assert.ok(r.violacoes.some((v) => v.arquivo.endsWith(alvo.join('/'))), JSON.stringify(r.violacoes));
  }
});

test('fotografia: inclui o hash de outputs/spec/ e .claude/ do harness, menos a pasta de trabalho e o settings.local', () => {
  const raiz = harnessSeparado();
  const dir = projeto();
  const trabalho = join(raiz, 'outputs', 'spec', 'validacao', 'TASK-1');
  mkdirSync(trabalho, { recursive: true });
  writeFileSync(join(trabalho, 'x.json'), '{}');
  writeFileSync(join(raiz, '.claude', 'settings.local.json'), '{}');
  const f = fotografia(dir, { raiz, trabalho, tasks: join(raiz, 'outputs', 'spec', 'tasks.json') });
  const chaves = Object.keys(f);
  assert.ok(chaves.some((k) => k.endsWith('outputs/spec/tasks.json')), chaves.join(','));
  assert.ok(chaves.some((k) => k.endsWith('.claude/rules/arquitetura.md')));
  assert.ok(!chaves.some((k) => k.includes('validacao/TASK-1')), 'a pasta de trabalho é dos agentes');
  assert.ok(!chaves.some((k) => k.endsWith('settings.local.json')), 'aprovar permissão na sessão não recusa a rodada');
});

// 3 — reenvio não apaga o lote válido
test('reenvio: o INCERTO entra só no lugar do lote que falhou; o lote válido da mesma dimensão continua', () => {
  const dir = projeto();
  // Um teste grande o bastante para a dimensão "testes" sair em dois lotes.
  writeFileSync(join(dir, 'test', 'grande.test.js'), Array.from({ length: 900 }, (_, i) => `test('caso ${i} com um nome comprido o bastante para ocupar espaço', () => {});`).join('\n'));
  const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  const lotes = a1.agentes.filter((a) => a.tipo === 'validador-testes');
  assert.ok(lotes.length >= 2, `a dimensão testes devia sair em lotes (${lotes.length})`);
  responder(a1);
  writeFileSync(destinoDe(lotes[0]), JSON.stringify(resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'o teste força a recusa',
    evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }])));
  writeFileSync(destinoDe(lotes[1]), '{"dimensao":"outra"}');
  const r = avancar({ task: 'TASK-1' }, dir);
  assert.equal(r.reenvio, true);
  assert.ok(!existsSync(destinoDe(lotes[1])), 'o resultado velho do alvo do reenvio é apagado antes de redisparar');
  writeFileSync(destinoDe(lotes[1]), '{"dimensao":"outra"}');
  avancar({ task: 'TASK-1' }, dir);
  const ids = lerEstadoJson(dir).resultados.testes.verificacoes.map((v) => `${v.id}:${v.veredito}`);
  assert.ok(ids.includes('RN-1:CUMPRE'), ids.join(','));
  assert.ok(ids.includes('VALIDADOR-testes:INCERTO'), ids.join(','));
});

// 4 — iniciar limpa a pasta de trabalho
test('iniciar de novo limpa a pasta de trabalho: resultado da tentativa anterior não é aceito', () => {
  const dir = projeto();
  const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  responder(a1);
  const a2 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  for (const a of a2.agentes) assert.ok(!existsSync(destinoDe(a)), a.tipo);
  const r = avancar({ task: 'TASK-1' }, dir);
  assert.equal(r.reenvio, true, 'sem resultado novo, todos ganham o reenvio');
});

// 5 — rodada sem dimensão a rever fecha com os resultados mesclados
test('rodada sem dimensão a rever fecha com os resultados já mesclados, não com o lote parcial da revalidação', () => {
  const dir = mkdtempSync(join(tmpdir(), 'val5-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'test'));
  mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  const task = { ...TASK, businessRules: [...TASK.businessRules, { id: 'RN-2', title: 'Outra', description: 'Outra regra.' }] };
  writeFileSync(join(dir, 'outputs', 'spec', 'tasks.json'), JSON.stringify({ stories: [{ id: 'US-1', tasks: [task] }] }));
  writeFileSync(join(dir, 'src', 'pedido.js'), 'export function criar(itens) {\n  if (!itens.length) throw new Error("Estoque insuficiente para item");\n}\n');
  writeFileSync(join(dir, 'test', 'pedido.test.js'), '// vazio\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'test', 'pedido.test.js'), 'expect(() => criar([])).toThrow("Estoque insuficiente para");\n');
  const op = { task: 'TASK-1', repo: dir, 'sem-externas': 'true', rodadas: '5', 'cmd-lint': 'node -e "process.exit(1)"' };
  const a1 = iniciar(op, dir);
  assert.deepEqual(a1.agentes.map((a) => a.tipo).sort(), ['validador-regras-negocio', 'validador-testes']);
  const evCodigo = { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (!itens.length) throw new Error' };
  responder(a1, {
    'regras-negocio': resultado('regras-negocio', ['RN-1', 'RN-2'].map((id) => ({ id, veredito: 'CUMPRE', motivo: 'ok', evidencia: evCodigo }))),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'falta teste' }, { id: 'RN-2', veredito: 'CUMPRE', motivo: 'ok', evidencia: evCodigo }]),
  });
  assert.equal(avancar({ task: 'TASK-1' }, dir).acao, 'corrigir');
  writeFileSync(join(dir, 'test', 'pedido.test.js'), 'expect(() => criar([])).toThrow("Estoque insuficiente para item");\n');
  const a3 = avancar({ task: 'TASK-1' }, dir);
  assert.deepEqual(a3.agentes.map((a) => a.tipo), ['validador-testes']);
  responder(a3, { testes: resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok', evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }]) });
  assert.equal(avancar({ task: 'TASK-1' }, dir).acao, 'corrigir', 'o lint continua falhando');
  const r = avancar({ task: 'TASK-1' }, dir); // o corretor não mudou nada: nenhuma dimensão a rever
  assert.equal(r.acao, 'corrigir', JSON.stringify(r));
  const rel = lerRelatorio(dir);
  assert.deepEqual(rel.incertos.map((i) => i.id), [], 'RN-2 continua respondida');
  assert.deepEqual(rel.bloqueantes.map((b) => b.id), ['CMD-lint']);
});

// 6 — Semgrep e gitleaks com saídas separadas; gitleaks só nos arquivos da entrega
test('externas: cada ferramenta tem a própria saída, e o gitleaks não varre o repositório inteiro', () => {
  const dir = projeto();
  mkdirSync(join(dir, 'node_modules', 'pacote'), { recursive: true });
  writeFileSync(join(dir, 'node_modules', 'pacote', 'i.js'), 'x');
  const mudancas = [arquivoNovo('src/pedido.js', readFileSync(join(dir, 'src', 'pedido.js'), 'utf8'))];
  let alvoGitleaks = null;
  const executar = (nome, args) => {
    if (nome === 'semgrep') writeFileSync(args[args.indexOf('--output') + 1], JSON.stringify({ results: [] }));
    else alvoGitleaks = args[args.indexOf('dir') + 1]; // o gitleaks cai sem gravar o relatório
    return { status: 0 };
  };
  const r = rodarExternas({ repo: dir, trabalho: caminhoTrabalho(dir) }, mudancas, { localizar: (n) => ({ comando: n, shell: false }), executar });
  assert.equal(r.situacao.semgrep, 'rodou');
  assert.match(r.situacao.gitleaks, /falhou/, 'o gitleaks não pode ler a saída do Semgrep como se fosse a dele');
  assert.ok(alvoGitleaks && alvoGitleaks !== '.' && !alvoGitleaks.startsWith(dir), `o gitleaks não varre o repositório (${alvoGitleaks})`);
});

test('externas: o achado do gitleaks na cópia volta para o caminho do repositório, mascarado', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'cfg.js'), 'const a = 1;\nconst chave = "ghp_abcdefghijklmnopqrstuvwxyz0123456789AB";\n');
  const mudancas = [arquivoNovo('src/cfg.js', readFileSync(join(dir, 'src', 'cfg.js'), 'utf8'))];
  const executar = (nome, args) => {
    if (nome === 'gitleaks') {
      const alvo = args[args.indexOf('dir') + 1];
      assert.ok(existsSync(join(alvo, 'src', 'cfg.js')), 'a cópia tem o arquivo da entrega');
      assert.ok(!existsSync(join(alvo, 'node_modules')));
      writeFileSync(args[args.indexOf('--report-path') + 1], JSON.stringify([{ RuleID: 'github-pat', File: join(alvo, 'src', 'cfg.js'), StartLine: 2, Secret: 'REDACTED' }]));
    }
    return { status: 0 };
  };
  const r = rodarExternas({ repo: dir, trabalho: caminhoTrabalho(dir) }, mudancas, { localizar: (n) => (n === 'gitleaks' ? { comando: n, shell: false } : null), executar });
  assert.deepEqual(r.achados.map((a) => `${a.regra}@${a.evidencia.arquivo}:${a.evidencia.linha}`), ['gitleaks:github-pat@src/cfg.js:2']);
  assert.ok(!r.achados[0].evidencia.trecho.includes('abcdefghijklmnop'), 'o segredo não vai para a evidência');
});

// 7 — segredo mascarado na evidência, e a conferência continua funcionando
test('segredo: a evidência guarda só o prefixo, e a conferência no disco continua confirmando', () => {
  const linhas = [
    "const cfg = { password: 'Sup3rS3cretaDeVerdade' };",
    'const k = "AKIAABCDEFGHIJKLMNOP";',
    'NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_abcdefghijklmnop',
  ];
  const achados = varrer([novo('src/x.js', linhas.join('\n'))]);
  assert.deepEqual(achados.map((a) => a.regra), ['segredo-atribuido', 'segredo-token-conhecido', 'segredo-token-conhecido', 'segredo-publico']);
  const texto = JSON.stringify(achados);
  for (const s of ['Sup3rS3cretaDeVerdade', 'AKIAABCDEFGHIJKLMNOP', 'sk_live_abcdefghijklmnop']) assert.ok(!texto.includes(s), s);
  assert.match(achados.find((a) => a.regra === 'segredo-atribuido').evidencia.trecho, /Sup3\*\*\*\*/);
  for (const a of achados) assert.ok(conferirEvidencia(a.evidencia, () => linhas, 3, { minimo: 0 }).ok, a.regra);
  const trocado = [...linhas];
  trocado[0] = 'const cfg = { password: process.env.SENHA };';
  assert.equal(conferirEvidencia(achados.find((a) => a.regra === 'segredo-atribuido').evidencia, () => trocado, 3, { minimo: 0 }).ok, false,
    'o segredo tirado do código derruba a evidência mascarada');
  const c = textoParaCorretor({ task: { id: 'T' }, grupo: { arquivos: ['src/x.js'], itens: achados.map((a) => ({ ...a, chave: a.regra })) }, numero: 1, total: 1, rodada: 1, caminhoRegistro: '/r' });
  assert.ok(!c.includes('Sup3rS3cretaDeVerdade'));
  assert.equal(mascarar(mascarar("x = 'abcdefghij'")), mascarar("x = 'abcdefghij'"), 'mascarar é idempotente');
});

test('segredo: gitleaks também mascara, e o estado e o relatório do ciclo não carregam o valor', () => {
  const linha = ['apiKey: zz9AbCdEfGhIjKlMnOp'];
  const gl = lerGitleaks([{ RuleID: 'generic-api-key', File: 'src/a.js', StartLine: 1 }], () => linha);
  assert.ok(!gl[0].evidencia.trecho.includes('AbCdEfGhIjKlMnOp'), gl[0].evidencia.trecho);
  assert.ok(conferirEvidencia(gl[0].evidencia, () => linha, 3, { minimo: 0 }).ok);
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'cfg.js'), "export const cfg = { password: 'Sup3rS3cretaDeVerdade' };\n");
  iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true', 'sem-agentes': 'true' }, dir);
  assert.ok(!readFileSync(join(caminhoTrabalho(dir), 'estado.json'), 'utf8').includes('Sup3rS3cretaDeVerdade'));
  const rel = readFileSync(join(dir, 'outputs', 'spec', 'auditorias', 'TASK-1.validacao.json'), 'utf8');
  assert.match(rel, /segredo-atribuido/);
  assert.ok(!rel.includes('Sup3rS3cretaDeVerdade'));
});

// 8 — trecho mínimo e leitor confinado ao repositório
test('conferência: trecho curto, só pontuação ou só palavra-chave não confirma nada', () => {
  const linhas = ['  } catch (e) {', '  return { ok: true };', 'const total = soma(itens);'];
  const l = () => linhas;
  assert.equal(conferirEvidencia({ arquivo: 'a', linha: 1, trecho: '}' }, l).ok, false);
  assert.match(conferirEvidencia({ arquivo: 'a', linha: 1, trecho: '} catch (e) {' }, l).motivo, /curto/);
  assert.equal(conferirEvidencia({ arquivo: 'a', linha: 2, trecho: 'return { ok: true };' }, l).ok, false);
  assert.ok(conferirEvidencia({ arquivo: 'a', linha: 3, trecho: 'const total = soma(itens);' }, l).ok);
  assert.equal(trechoSignificativo('if (!itens.length)'), true);
  assert.equal(trechoSignificativo('} catch (e) {'), false);
});

test('leitor: só lê dentro do repositório do código — nada de absoluto fora dele, de ../ nem da régua do harness', () => {
  const raiz = harnessSeparado();
  const dir = projeto();
  const ler = leitorDoRepo(dir, raiz);
  assert.ok(ler('src/pedido.js'));
  assert.ok(ler(join(dir, 'src', 'pedido.js')), 'absoluto dentro do repositório vale');
  assert.equal(ler(join(raiz, 'outputs', 'spec', 'tasks.json')), null);
  assert.equal(ler('outputs/spec/tasks.json'), null, 'a especificação não é código da entrega');
  assert.equal(ler('../x.js'), null);
  assert.equal(ler(join(raiz, '.claude/rules/arquitetura.md')), null);
});

// 9 — NAO_CUMPRE com evidência conferida vence o CUMPRE de outro lote
test('juntarLotes: NAO_CUMPRE com evidência que confere vence o CUMPRE de outro lote; sem evidência, não', () => {
  const ok = () => ({ ok: true });
  const nao = { id: 'RN-1', veredito: 'NAO_CUMPRE', motivo: 'aceita sem estoque', evidencia: EV(3) };
  const sim = { id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok', evidencia: EV(3) };
  assert.equal(juntarLotes('t', [{ verificacoes: [sim] }, { verificacoes: [nao] }], ok).verificacoes[0].veredito, 'NAO_CUMPRE');
  assert.equal(juntarLotes('t', [{ verificacoes: [nao] }, { verificacoes: [sim] }], ok).verificacoes[0].veredito, 'NAO_CUMPRE');
  const semEv = { ...nao, evidencia: undefined };
  assert.equal(juntarLotes('t', [{ verificacoes: [sim] }, { verificacoes: [semEv] }], ok).verificacoes[0].veredito, 'CUMPRE');
  assert.equal(juntarLotes('t', [{ verificacoes: [sim] }, { verificacoes: [nao] }], () => ({ ok: false })).verificacoes[0].veredito, 'CUMPRE');
});

// 10 — checkpoint antes dos comandos longos; avancar retoma
test('checkpoint: o estado.json já existe quando os comandos do iniciar rodam', () => {
  const dir = projeto();
  const estadoJson = join(caminhoTrabalho(dir), 'estado.json').replace(/\\/g, '/');
  iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true', 'cmd-testes': `node -e "process.exit(require('fs').existsSync('${estadoJson}') ? 0 : 1)"` }, dir);
  assert.equal(lerEstadoJson(dir).comandos[0].ok, true);
});

test('checkpoint: o iniciar que cai no meio do comando longo é retomado pelo avancar', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'trava'), '');
  const cmd = 'node -e "if (require(\'fs\').existsSync(\'trava\')) setTimeout(() => {}, 20000)"';
  const r = spawnSync(process.execPath, [VALIDAR_MJS, 'iniciar', '--task', 'TASK-1', '--repo', dir, '--sem-externas', '--cmd-testes', cmd], { cwd: dir, encoding: 'utf8', timeout: 8000 });
  assert.ok(r.error || r.signal, 'o processo devia ter caído no timeout');
  rmSync(join(dir, 'trava'));
  const retomado = avancar({ task: 'TASK-1' }, dir);
  assert.equal(retomado.acao, 'validar', JSON.stringify(retomado));
});

// 11 — menores
test('chave de achado: arquivo + linha + regra (ou dimensão) — dois defeitos com o mesmo título não se confundem', () => {
  const a = { tipo: 'achado', dimensao: 'seguranca', titulo: 'erro engolido', evidencia: { arquivo: 'src/a.js', linha: 4 } };
  assert.notEqual(chaveDe(a), chaveDe({ ...a, evidencia: { arquivo: 'src/a.js', linha: 20 } }));
  assert.equal(chaveDe(a), chaveDe({ ...a, titulo: 'Erro  engolido no catch' }), 'título reescrito pelo modelo não muda a chave');
  assert.match(chaveDe({ ...a, regra: 'erro-engolido' }), /src\/a\.js:4\|erro-engolido/);
});

test('decidir: a mensagem do limite diz quantas rodadas de correção houve de verdade', () => {
  const b = [{ chave: 'x', evidencia: { arquivo: 'a' } }];
  assert.match(decidir({ consolidado: pendente(b), rodada: 3, rodadasMax: 3 }).motivo, /2 rodadas de correção/);
});

test('avancar depois de fim ou parar só reporta o estado final', () => {
  const dir = projeto();
  const a1 = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true' }, dir);
  responder(a1, {
    'regras-negocio': resultado('regras-negocio', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'recusa lista vazia', evidencia: { arquivo: 'src/pedido.js', linha: 2, trecho: 'if (!itens.length)' } }]),
    testes: resultado('testes', [{ id: 'RN-1', veredito: 'CUMPRE', motivo: 'ok', evidencia: { arquivo: 'test/pedido.test.js', linha: 1, trecho: 'expect(() => criar([])).toThrow' } }]),
  });
  assert.equal(avancar({ task: 'TASK-1' }, dir).acao, 'fim');
  const historico = lerEstadoJson(dir).historico.length;
  writeFileSync(join(dir, 'src', 'pedido.js'), 'mudou depois\n');
  assert.equal(avancar({ task: 'TASK-1' }, dir).acao, 'fim');
  assert.equal(lerEstadoJson(dir).historico.length, historico, 'nada roda de novo');

  const dir2 = projeto();
  iniciar({ task: 'TASK-1', repo: dir2, 'sem-externas': 'true' }, dir2);
  writeFileSync(join(dir2, 'src', 'pedido.js'), 'validador mexeu\n');
  assert.equal(avancar({ task: 'TASK-1' }, dir2).acao, 'parar');
  const p = avancar({ task: 'TASK-1' }, dir2);
  assert.equal(p.acao, 'parar');
  assert.match(p.motivo, /alterou o que não podia/);
});

test('lerOpcoes: --cmd-testes "" fica vazio (não vira "true") e o relatório diz "não informado"', () => {
  assert.equal(lerOpcoes(['--cmd-testes', '', '--task', 'T'])['cmd-testes'], '');
  assert.equal(lerOpcoes(['--sem-externas', '--task', 'T'])['sem-externas'], 'true');
  const dir = projeto();
  iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true', 'sem-agentes': 'true', 'cmd-testes': 'true' }, dir);
  const rel = lerRelatorio(dir);
  assert.equal(rel.comandos.length, 0, 'flag sem valor não roda o comando "true"');
  assert.deepEqual(rel.naoInformados, ['testes', 'cobertura', 'lint', 'build']);
});

test('consolidar: achado de modelo que se junta a um determinístico continua aberto para a revalidação do modelo', () => {
  const det = { origem: 'determinístico', regra: 'pii-no-log', dimensoes: ['seguranca'], severidade: 'ALTO', titulo: 'dado pessoal no log', motivo: 'm', correcao: 'c', evidencia: EV(3) };
  const c = consolidar({
    achadosDeterministicos: [det],
    resultados: { performance: { verificacoes: [], achados: [achado('ALTO', 3, { titulo: 'consulta por item' })] } },
    conferir,
  });
  assert.equal(c.bloqueantes.length, 1);
  assert.deepEqual(c.bloqueantes[0].dimensoesDoModelo, ['performance']);
});

test('procurarNoPath: acha o shim .cmd do Windows e diz que ele precisa de shell', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'path-'));
  writeFileSync(join(pasta, 'semgrep.cmd'), '@echo off');
  const r = procurarNoPath('semgrep', { PATH: pasta, PATHEXT: '.COM;.EXE;.BAT;.CMD' }, 'win32');
  assert.equal(r.comando, join(pasta, 'semgrep.cmd'));
  assert.equal(r.shell, true);
  assert.equal(procurarNoPath('gitleaks', { PATH: pasta, PATHEXT: '.EXE;.CMD' }, 'win32'), null);
  writeFileSync(join(pasta, 'gitleaks'), '');
  assert.equal(procurarNoPath('gitleaks', { PATH: pasta }, 'linux').shell, false);
});

// 12 — falsos positivos da varredura: o caso legítimo não dispara, o defeito continua pegando
const regrasEm = (arquivo, texto) => varrer([novo(arquivo, texto)]).map((a) => a.regra);

test('varredura, token-no-storage: "author" e "possession" não são token; authToken e sessionId continuam', () => {
  assert.deepEqual(regrasEm('src/a.js', "localStorage.setItem('authorName', nome);"), []);
  assert.deepEqual(regrasEm('src/a.js', "localStorage.setItem('possessions', lista);"), []);
  assert.deepEqual(regrasEm('src/a.js', "localStorage.setItem('authToken', t);"), ['token-no-storage']);
  assert.deepEqual(regrasEm('src/a.js', "sessionStorage.setItem('sessionId', id);"), ['token-no-storage']);
  assert.deepEqual(regrasEm('src/a.js', "localStorage.setItem('x', jwt);"), ['token-no-storage']);
});

test('varredura, pii-no-log: palavra dentro de texto literal não é dado pessoal; o valor logado é', () => {
  assert.deepEqual(regrasEm('src/a.js', "logger.info('Senha alterada', { id: usuario.id });"), []);
  assert.deepEqual(regrasEm('src/a.js', 'logger.info(`E-mail de confirmação enviado para o usuário ${usuario.id}`);'), []);
  assert.deepEqual(regrasEm('src/a.js', "console.log('cliente', cliente.cpf);").sort(), ['pii-no-log']);
  assert.deepEqual(regrasEm('src/a.js', 'logger.info(`enviado para ${usuario.email}`);'), ['pii-no-log']);
  assert.deepEqual(regrasEm('src/a.js', "logger.info('login', { emailCliente });"), ['pii-no-log']);
});

test('varredura: html-cru, eval, chave privada e token conhecido não disparam em teste nem em .md', () => {
  const linhas = ['div.innerHTML = x;', 'eval(codigo);', '-----BEGIN RSA PRIVATE KEY-----', 'const k = "AKIAABCDEFGHIJKLMNOP";'].join('\n');
  assert.deepEqual(regrasEm('test/a.test.js', linhas), []);
  assert.deepEqual(regrasEm('docs/guia.md', linhas), []);
  assert.deepEqual(regrasEm('src/a.js', linhas), ['html-cru', 'eval', 'segredo-chave-privada', 'segredo-token-conhecido']);
});

test('varredura, eval: obj.eval() é método, não o eval global', () => {
  assert.deepEqual(regrasEm('src/a.js', 'const r = await pagina.eval(script);'), []);
  assert.deepEqual(regrasEm('src/a.js', 'const r = redis.eval(lua, 0);'), []);
  assert.deepEqual(regrasEm('src/a.js', 'const r = eval(texto);'), ['eval']);
  assert.deepEqual(regrasEm('src/a.js', 'const f = new Function(texto);'), ['eval']);
});

test('varredura, segredo-atribuido: placeholder não é segredo', () => {
  for (const v of ['YOUR_API_KEY_HERE', 'your-secret-here', 'xxxxxxxxxx', 'changeme123', '<coloque-aqui>', 'placeholder-value']) {
    assert.deepEqual(regrasEm('src/a.js', `const apiKey = '${v}';`), [], v);
  }
  assert.deepEqual(regrasEm('src/a.js', "const apiKey = 'q8F3kLm2Zx9Pw';"), ['segredo-atribuido']);
});

test('varredura, segredo-publico: só quando o nome sugere segredo — token público de serviço passa', () => {
  assert.deepEqual(regrasEm('src/a.js', 'const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;'), []);
  assert.deepEqual(regrasEm('src/a.js', 'const t = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;'), []);
  for (const nome of ['NEXT_PUBLIC_STRIPE_SECRET', 'VITE_DB_PASSWORD', 'REACT_APP_PRIVATE_KEY', 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY']) {
    assert.deepEqual(regrasEm('src/a.js', `const t = process.env.${nome};`), ['segredo-publico'], nome);
  }
});

test('varredura, erro-engolido: catch que repassa o erro (atribui ou chama com a variável) não é engolido; só log, é', () => {
  const bloco = (corpo) => ['try {', '  await gravar();', '} catch (erro) {', ...corpo, '}'].join('\n');
  assert.deepEqual(regrasEm('src/a.js', bloco(['  setErro(erro);'])), []);
  assert.deepEqual(regrasEm('src/a.js', bloco(['  this.ultimoErro = erro;'])), []);
  assert.deepEqual(regrasEm('src/a.js', bloco(['  callback(erro, null);'])), []);
  assert.deepEqual(regrasEm('src/a.js', bloco(['  console.log(erro);'])), ['erro-engolido']);
  assert.deepEqual(regrasEm('src/a.js', bloco(['  // nada'])), ['erro-engolido']);
});

test('varredura, io-no-laco: ler o stream pedaço a pedaço não é consulta por item', () => {
  const laco = (linha) => ['while (true) {', linha, '  if (done) break;', '}'].join('\n');
  assert.deepEqual(regrasEm('src/a.js', laco('  const { done, value } = await reader.read();')), []);
  assert.deepEqual(regrasEm('src/a.js', laco('  const { done, value } = await stream.read();')), []);
  assert.deepEqual(regrasEm('src/a.js', ['for (const id of ids) {', '  const p = await buscarPedido(id);', '}'].join('\n')), ['io-no-laco']);
});

test('varredura: fetch-na-tela e formato-no-jsx desligam quando a rule de frontend Next não está em vigor', () => {
  const tela = ['export function T() {', "  fetch('/api/x');", '  return <p>{v.toFixed(2)}</p>;', '}'].join('\n');
  assert.deepEqual(varrer([novo('src/components/T.jsx', tela)]).map((a) => a.regra), ['fetch-na-tela', 'formato-no-jsx']);
  assert.deepEqual(varrer([novo('src/components/T.jsx', tela)], { frontendNext: false }).map((a) => a.regra), []);
});

test('regrasFrontendNextEmVigor: em vigor com a rule do harness; desliga com rule de frontend do projeto que não é Next', () => {
  const harness = { '.claude/rules/harness/frontend.md': '# Frontend — Next.js App Router' };
  assert.equal(regrasFrontendNextEmVigor(discoFalso(harness)), true);
  assert.equal(regrasFrontendNextEmVigor(discoFalso({})), false, 'sem a rule, nada a impor');
  assert.equal(regrasFrontendNextEmVigor(discoFalso({ ...harness, '.claude/rules/frontend.md': '# Frontend\nAngular 18 com NgRx' })), false);
  assert.equal(regrasFrontendNextEmVigor(discoFalso({ ...harness, '.claude/rules/frontend.mdc': '# Frontend\nNext.js 15, App Router' })), true);
});

test('ciclo: --regras-frontend nao desliga as duas regras de tela na fixture', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fix-fe-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  cpSync(join(FIXTURE, 'base'), dir, { recursive: true });
  mkdirSync(join(dir, 'outputs', 'spec'), { recursive: true });
  cpSync(join(FIXTURE, 'tasks.json'), join(dir, 'outputs', 'spec', 'tasks.json'));
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  cpSync(join(FIXTURE, 'entrega'), dir, { recursive: true });
  iniciar({ task: 'TASK-FIX-001', repo: dir, 'sem-externas': 'true', 'regras-frontend': 'nao' }, dir);
  const estado = lerEstadoJson(dir, 'TASK-FIX-001');
  assert.deepEqual(estado.achadosDeterministicos.map((a) => a.regra).sort(), ['erro-engolido', 'io-no-laco', 'pii-no-log']);
  assert.match(estado.ferramentas.regrasFrontend, /desligad/);
});

// 13 — modo sem agentes (Kiro, ferramenta sem subagente)
test('--sem-agentes: só o determinístico decide, e nenhuma ação dispara agente', () => {
  const dir = projeto();
  const limpo = iniciar({ task: 'TASK-1', repo: dir, 'sem-externas': 'true', 'sem-agentes': 'true' }, dir);
  assert.equal(limpo.acao, 'fim', JSON.stringify(limpo));
  assert.equal(limpo.semAgentes, true);
  assert.ok(!('agentes' in limpo) && !('agente' in limpo));
  assert.equal(lerRelatorio(dir).modo, 'sem-agentes');

  const dir2 = projeto();
  writeFileSync(join(dir2, 'src', 'log.js'), "export const f = (c) => console.log('novo', c.cpf);\n");
  const c1 = iniciar({ task: 'TASK-1', repo: dir2, 'sem-externas': 'true', 'sem-agentes': 'true' }, dir2);
  assert.equal(c1.acao, 'corrigir', JSON.stringify(c1));
  assert.ok(!('agente' in c1), 'quem corrige é o próprio agente da sessão');
  assert.match(c1.instrucao, /você mesmo/);
  assert.match(c1.instrucao, /avancar/);
  assert.match(readFileSync(c1.entrada, 'utf8'), /pii-no-log|dado pessoal no log/);
  writeFileSync(join(dir2, 'src', 'log.js'), "export const f = (c) => console.log('novo', c.id);\n");
  const c2 = avancar({ task: 'TASK-1' }, dir2);
  assert.equal(c2.acao, 'fim', JSON.stringify(c2));
});

// ————————————————————————————— item 13 — revisão do G3 (2026-10-21) —————————————————————————————

const SEM = { 'sem-externas': 'true', 'sem-agentes': 'true' };

/**
 * Um "lint" no formato do ESLint (stylish): o caminho absoluto do arquivo numa linha, o erro indentado
 * embaixo. Acusa `src/velho.js` e, quando existe, `src/novo.js` — com a MESMA mensagem, para provar que
 * a comparação com a linha de base leva o arquivo junto. Fica fora do repositório: senão viraria parte
 * da entrega.
 */
function scriptLint() {
  const pasta = mkdtempSync(join(tmpdir(), 'lint-'));
  const arquivo = join(pasta, 'lint.cjs');
  writeFileSync(arquivo, [
    "const fs = require('fs'); const path = require('path');",
    'const saida = [];',
    "for (const f of ['src/velho.js', 'src/novo.js']) if (fs.existsSync(f)) saida.push(path.resolve(f), \"  3:7  error  'x' is assigned a value but never used  no-unused-vars\", '');",
    'const n = saida.length / 3;',
    'saida.push(`✖ ${n} problems (${n} errors, 0 warnings)`);',
    "console.log(saida.join('\\n'));",
    'process.exit(1);',
  ].join('\n'));
  return `node "${arquivo.replace(/\\/g, '/')}"`;
}

// 13.1 — linha de base dos comandos
test('13.1 — linhasDeFalha: sem cor, número, tempo e caminho do repositório; o erro do ESLint leva o arquivo junto', () => {
  const saida = [
    '\x1b[31mFAIL\x1b[39m src/a.test.js (1.2 s)',
    '/repo/src/velho.js',
    "  3:7  error  'x' is unused  no-unused-vars",
    '',
    'C:\\outro\\lugar\\cache\\b.js: error ENOENT',
    '  ✓ passa (3 ms)',
  ].join('\n');
  const f = DET.linhasDeFalha(saida, '/repo');
  assert.ok(f.includes('FAIL src/a.test.js (<tempo>)'), f.join(' | '));
  assert.ok(f.includes("src/velho.js › 0:0 error 'x' is unused no-unused-vars"), f.join(' | '));
  assert.ok(f.some((l) => l.startsWith('<abs>/b.js')), 'caminho fora do repositório fica só com o nome');
  assert.ok(!f.some((l) => /passa/.test(l)), 'linha de sucesso não é falha');
});

test('13.1 — compararComBase: a mesma falha da linha de base é pré-existente; linha nova, outra saída ou outro comando bloqueiam', () => {
  const falhas = (t) => DET.linhasDeFalha(t, '/repo');
  const base = { comando: 'npm test', codigo: 1, ok: false, falhas: falhas('not ok 1 - soma antiga (12ms)\n# fail 1\n') };
  const igual = DET.compararComBase({ comando: 'npm test', codigo: 1, falhas: falhas('not ok 3 - soma antiga (40ms)\n# fail 1\n') }, base);
  assert.equal(igual.preExistente, true, JSON.stringify(igual));
  const nova = DET.compararComBase({ comando: 'npm test', codigo: 1, falhas: falhas('not ok 1 - soma antiga (7ms)\nnot ok 2 - desconto novo\n# fail 2\n') }, base);
  assert.equal(nova.preExistente, false);
  assert.deepEqual(nova.novas, ['not ok 0 - desconto novo']);
  assert.equal(DET.compararComBase({ comando: 'npm test', codigo: 2, falhas: base.falhas }, base).preExistente, false, 'saída diferente');
  assert.equal(DET.compararComBase({ comando: 'npm test', codigo: 1, falhas: base.falhas }, { ...base, ok: true, codigo: 0 }).preExistente, false, 'passava antes');
  assert.equal(DET.compararComBase({ comando: 'npm test', codigo: 1, falhas: [] }, base).preExistente, false, 'sem linha que dê para comparar');
  assert.equal(DET.compararComBase({ comando: 'npm run test:tudo', codigo: 1, falhas: base.falhas }, base).preExistente, false, 'outro comando');
  assert.equal(DET.compararComBase({ comando: 'npm test', codigo: 1, falhas: base.falhas }, null).preExistente, false, 'sem linha de base');
});

test('13.1 — ciclo: lint que já falhava antes da task não bloqueia e vai para o relatório; erro novo bloqueia e chega ao corretor só com as linhas novas', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'velho.js'), 'const x = 1;\n');
  git(dir, 'add', 'src/velho.js');
  git(dir, 'commit', '-qm', 'velho');
  const lint = scriptLint();
  const base = V.linhaDeBase({ task: 'TASK-1', repo: dir, 'cmd-lint': lint }, dir);
  assert.equal(base.acao, 'linha-de-base', JSON.stringify(base));
  assert.ok(existsSync(base.arquivo));
  assert.match(base.comandos.lint, /falhou/);

  const sem = iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': lint }, dir);
  assert.equal(sem.acao, 'corrigir', 'sem a linha de base, a falha antiga bloqueia como antes');

  const com = iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': lint, 'linha-de-base': base.arquivo }, dir);
  assert.equal(com.acao, 'fim', JSON.stringify(com));
  const rel = lerRelatorio(dir);
  assert.deepEqual(rel.preExistentes.map((p) => p.id), ['CMD-lint']);
  assert.equal(rel.linhaDeBase.usada, true, JSON.stringify(rel.linhaDeBase));
  assert.deepEqual(rel.bloqueantes, []);

  writeFileSync(join(dir, 'src', 'novo.js'), 'const x = 2;\n');
  const novo = iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': lint, 'linha-de-base': base.arquivo }, dir);
  assert.equal(novo.acao, 'corrigir', JSON.stringify(novo));
  const entrada = readFileSync(novo.entrada, 'utf8');
  assert.match(entrada, /não estavam antes da task/);
  assert.match(entrada, /src\/novo\.js › 0:0 error 'x' is assigned/);
  assert.ok(!/src\/velho\.js › /.test(entrada), 'a falha antiga não vai para o corretor como nova');
});

test('13.1 — linha de base de outro commit, de outro repositório ou de outro comando não vale, e o relatório diz por quê', () => {
  const dir = projeto();
  const lint = scriptLint();
  writeFileSync(join(dir, 'src', 'velho.js'), 'const x = 1;\n');
  const base = V.linhaDeBase({ task: 'TASK-1', repo: dir, 'cmd-lint': lint }, dir);
  const conteudo = JSON.parse(readFileSync(base.arquivo, 'utf8'));
  writeFileSync(base.arquivo, JSON.stringify({ ...conteudo, head: 'f'.repeat(40) }));
  assert.equal(iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': lint, 'linha-de-base': base.arquivo }, dir).acao, 'corrigir');
  assert.equal(lerRelatorio(dir).linhaDeBase.usada, false);
  assert.match(lerRelatorio(dir).linhaDeBase.motivo, /commit/);

  writeFileSync(base.arquivo, JSON.stringify({ ...conteudo, repo: join(tmpdir(), 'outro-repo') }));
  iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': lint, 'linha-de-base': base.arquivo }, dir);
  assert.match(lerRelatorio(dir).linhaDeBase.motivo, /repositório/);

  writeFileSync(base.arquivo, JSON.stringify(conteudo));
  iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': `${lint} --outro`, 'linha-de-base': base.arquivo }, dir);
  const rel = lerRelatorio(dir);
  assert.equal(rel.linhaDeBase.usada, true);
  assert.deepEqual(rel.preExistentes, [], 'comando diferente não compara com a linha de base');
  assert.deepEqual(rel.bloqueantes.map((b) => b.id), ['CMD-lint']);
  assert.throws(() => iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'linha-de-base': join(dir, 'nao-existe.json') }, dir), /linha de base/);
});

test('13.1 e 13.9 — a spec-implement tira a linha de base antes do código e passa build e linha de base ao G3', () => {
  const skill = readFileSync(fileURLToPath(new URL('../../.claude/skills/spec-implement/SKILL.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
  assert.match(skill, /node \.claude\/ferramentas\/validar\.mjs linha-de-base --task <TASK-ID>/);
  assert.ok(skill.indexOf('validar.mjs linha-de-base') < skill.indexOf('# FASE 3 (passo F)'), 'a linha de base vem antes de qualquer código');
  assert.match(skill, /--linha-de-base <arquivo>/);
  assert.match(skill, /--cmd-build "<comando>"/);
  assert.ok(skill.includes('| `VALIDACAO_FALHA_PRE_EXISTENTE` |'));
});

// 13.9 — o build roda de novo depois do corretor
test('13.9 — --cmd-build roda a cada rodada, como os outros comandos, e entra em naoInformados quando falta', () => {
  const dir = projeto();
  const r = iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-build': 'node -e "process.exit(3)"' }, dir);
  assert.equal(r.acao, 'corrigir', JSON.stringify(r));
  assert.deepEqual(lerRelatorio(dir).bloqueantes.map((b) => b.id), ['CMD-build']);
  assert.match(readFileSync(r.entrada, 'utf8'), /build: `node -e "process\.exit\(3\)"`/);
  assert.equal(avancar({ task: 'TASK-1' }, dir).acao, 'corrigir', 'na rodada seguinte o build roda de novo');
  assert.equal(lerEstadoJson(dir).comandos.find((c) => c.id === 'CMD-build').codigo, 3);
  const dir2 = projeto();
  iniciar({ task: 'TASK-1', repo: dir2, ...SEM }, dir2);
  assert.ok(lerRelatorio(dir2).naoInformados.includes('build'));
});

// 13.2 — grupo sem arquivo também tem escopo
test('13.2 — guarda: grupo sem arquivo (comando que falhou) tem como escopo os arquivos da entrega, os testes e os novos', () => {
  assert.equal(violacoes({ mudados: ['src/qualquer.js'], fase: 'corrigir', escopo: { arquivos: [] } }).length, 1, 'escopo vazio não é "qualquer arquivo"');
  const entrega = { arquivos: ['src/pedido.js', 'test/pedido.test.js'] };
  assert.deepEqual(violacoes({ mudados: ['src/pedido.js', 'test/outro.test.js', 'src/novo.js'], fase: 'corrigir', escopo: entrega, novos: ['src/novo.js'] }), []);
  assert.deepEqual(violacoes({ mudados: ['src/velho.js'], fase: 'corrigir', escopo: entrega }).map((v) => v.arquivo), ['src/velho.js']);
});

test('13.2 — ciclo: o corretor de um comando que falhou não pode mexer em arquivo fora da entrega', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'velho.js'), 'export const v = 1;\n');
  git(dir, 'add', 'src/velho.js');
  git(dir, 'commit', '-qm', 'velho');
  const r = iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-lint': 'node -e "process.exit(1)"' }, dir);
  assert.equal(r.acao, 'corrigir');
  const t = readFileSync(r.entrada, 'utf8');
  assert.match(t, /`src\/pedido\.js`/, 'a entrada lista o escopo: os arquivos da entrega');
  writeFileSync(join(dir, 'src', 'velho.js'), 'export const v = 2;\n');
  const p = avancar({ task: 'TASK-1' }, dir);
  assert.equal(p.acao, 'parar', JSON.stringify(p));
  assert.deepEqual(p.violacoes.map((v) => v.arquivo), ['src/velho.js']);
});

// 13.3 — o shell dos comandos no Windows
test('13.3 — escolherShell: no Windows, o Git Bash (nunca o bash do WSL); --shell força; fora do Windows nada muda', () => {
  const existe = (lista) => (p) => lista.includes(String(p).replace(/\\/g, '/'));
  const semGit = () => null;
  const wsl = V.escolherShell('auto', {
    plataforma: 'win32', env: { PATH: 'C:\\Windows\\System32;C:\\Users\\u\\AppData\\Local\\Microsoft\\WindowsApps' },
    existe: existe(['C:/Windows/System32/bash.exe', 'C:/Users/u/AppData/Local/Microsoft/WindowsApps/bash.exe']), execPathDoGit: semGit,
  });
  assert.equal(wsl.nome, 'cmd', 'o bash.exe do WSL não é o Git Bash');
  const exe = V.escolherShell('auto', { plataforma: 'win32', env: { EXEPATH: 'D:\\Git\\bin', PATH: '' }, existe: existe(['D:/Git/bin/bash.exe']), execPathDoGit: semGit });
  assert.equal(exe.nome, 'bash');
  assert.match(exe.comando.replace(/\\/g, '/'), /^D:\/Git\/bin\/bash\.exe$/);
  const porGit = V.escolherShell('auto', { plataforma: 'win32', env: { PATH: '' }, existe: existe(['E:/PortableGit/bin/bash.exe']), execPathDoGit: () => 'E:/PortableGit/mingw64/libexec/git-core' });
  assert.match(porGit.comando.replace(/\\/g, '/'), /^E:\/PortableGit\/bin\/bash\.exe$/);
  const noPath = V.escolherShell('auto', { plataforma: 'win32', env: { PATH: 'C:\\Windows\\System32;F:\\Git\\usr\\bin' }, existe: existe(['C:/Windows/System32/bash.exe', 'F:/Git/usr/bin/bash.exe']), execPathDoGit: semGit });
  assert.match(noPath.comando.replace(/\\/g, '/'), /^F:\/Git\/usr\/bin\/bash\.exe$/);
  const opcoes = { plataforma: 'win32', env: { EXEPATH: 'D:\\Git\\bin' }, existe: existe(['D:/Git/bin/bash.exe']), execPathDoGit: semGit };
  assert.equal(V.escolherShell('cmd', opcoes).nome, 'cmd');
  assert.equal(V.escolherShell('powershell', opcoes).nome, 'powershell');
  assert.throws(() => V.escolherShell('bash', { plataforma: 'win32', env: { PATH: '' }, existe: () => false, execPathDoGit: semGit }), /Git Bash/);
  assert.throws(() => V.escolherShell('zsh', opcoes), /--shell/);
  const linux = V.escolherShell('auto', { plataforma: 'linux', env: {} });
  assert.equal(linux.nome, 'sh');
  assert.equal(linux.comando, null, 'fora do Windows, o mesmo `shell: true` de antes');
});

test('13.3 — no Windows, comando com sintaxe de bash roda no Git Bash, e o relatório diz o shell', (t) => {
  if (process.platform !== 'win32') return t.skip('só no Windows');
  if (V.escolherShell('auto').nome !== 'bash') return t.skip('sem Git Bash nesta máquina');
  const dir = projeto();
  iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-testes': 'CI=true node --version' }, dir);
  let rel = lerRelatorio(dir);
  assert.equal(rel.comandos[0].ok, true, JSON.stringify(rel.comandos));
  assert.equal(rel.shell.nome, 'bash');
  iniciar({ task: 'TASK-1', repo: dir, ...SEM, 'cmd-testes': 'CI=true node --version', shell: 'cmd' }, dir);
  rel = lerRelatorio(dir);
  assert.equal(rel.comandos[0].ok, false, 'no cmd.exe, `CI=true` não é comando');
  assert.equal(rel.shell.nome, 'cmd');
});

// 13.4 — PARADO tem saída
test('13.4 — parar: a ação diz o que fazer e lista os arquivos que o corretor mexeu', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'log.js'), "export const f = (c) => console.log('novo', c.cpf);\n");
  const c1 = iniciar({ task: 'TASK-1', repo: dir, ...SEM, rodadas: '2' }, dir);
  assert.equal(c1.acao, 'corrigir');
  writeFileSync(join(dir, 'src', 'log.js'), "export const f = (c) => console.log('outro', c.cpf);\n");
  const p = avancar({ task: 'TASK-1' }, dir);
  assert.equal(p.acao, 'parar', JSON.stringify(p));
  assert.deepEqual(p.editadosPeloCorretor, ['src/log.js']);
  assert.match(p.instrucao, /work item/);
  assert.match(p.instrucao, /devolutiva/);
  assert.match(p.instrucao, /mantém ou descarta/);
  assert.match(p.instrucao, /próxima task/);
  assert.deepEqual(lerRelatorio(dir).editadosPeloCorretor, ['src/log.js']);
});

test('13.4 — o G3 da spec-implement diz o que fazer em parar: comentário, devolutiva em modo falha, diff do corretor, lote', () => {
  const skill = readFileSync(fileURLToPath(new URL('../../.claude/skills/spec-implement/SKILL.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
  const g3 = skill.slice(skill.indexOf('## G3 — Validação independente'), skill.indexOf('## H — Update Azure DevOps'));
  const linha = g3.split('\n').find((l) => l.trim().startsWith('| `parar` |')) || '';
  assert.match(linha, /comente no work item/i);
  assert.match(linha, /devolutiva do J em modo falha/);
  assert.match(linha, /editadosPeloCorretor/);
  assert.match(linha, /mantém ou descarta/);
  assert.match(linha, /nunca descarte sozinho/);
  assert.match(linha, /próxima task/);
  const fatal = skill.split('\n').find((l) => l.startsWith('| `VALIDACAO_INDEPENDENTE_APROVADA` |')) || '';
  assert.match(fatal, /Testing/);
  assert.match(fatal, /comentário/);
});

// 13.5 — o registro do corretor é lido
function corretorRegistra(acao, feito) {
  const estado = JSON.parse(readFileSync(join(dirname(dirname(acao.entrada)), 'estado.json'), 'utf8'));
  const grupo = estado.grupos[estado.grupoAtual];
  writeFileSync(acao.entrada.replace(/corrigir-(\d+)\.md$/, 'corrigido-$1.json'),
    JSON.stringify({ itens: grupo.itens.map((it) => ({ chave: it.chave, feito, teste: '' })) }));
}

test('13.5 — corretor que não corrige nada e não muda arquivo para o ciclo na hora, com o motivo no relatório', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'log.js'), "export const f = (c) => console.log('novo', c.cpf);\n");
  const c1 = iniciar({ task: 'TASK-1', repo: dir, ...SEM }, dir);
  assert.equal(c1.acao, 'corrigir');
  corretorRegistra(c1, 'não corrigido: exige refatoração — o log é montado num módulo compartilhado');
  const p = avancar({ task: 'TASK-1' }, dir);
  assert.equal(p.acao, 'parar', JSON.stringify(p));
  assert.match(p.motivo, /não corrigiu nenhum item/);
  assert.match(p.motivo, /módulo compartilhado/);
  const rel = lerRelatorio(dir);
  assert.equal(rel.naoCorrigidos.length, 1);
  assert.match(rel.naoCorrigidos[0].motivo, /exige refatoração/);
  assert.equal(lerEstadoJson(dir).rodada, 1, 'nenhuma revalidação foi gasta');
});

test('13.5 — os itens "não corrigido" vão para o relatório mesmo quando a rodada segue', () => {
  const dir = projeto();
  writeFileSync(join(dir, 'src', 'log.js'), "export const f = (c) => console.log('novo', c.cpf);\n");
  const c1 = iniciar({ task: 'TASK-1', repo: dir, ...SEM }, dir);
  corretorRegistra(c1, 'não corrigido: o validador leu mal');
  writeFileSync(join(dir, 'test', 'log.test.js'), "test('x', () => {});\n");
  const r = avancar({ task: 'TASK-1' }, dir);
  assert.notEqual(r.motivo && /não corrigiu nenhum item/.test(r.motivo), true, 'mudou arquivo: a revalidação decide');
  assert.equal(lerRelatorio(dir).naoCorrigidos[0].motivo, 'não corrigido: o validador leu mal');
});

// 13.6 — falsos positivos da varredura
test('13.6 — html-cru: sanitizado na linha de cima, innerHTML vazio e JSON-LD não disparam; HTML do usuário continua', () => {
  assert.deepEqual(regrasEm('src/components/Artigo.tsx', 'const limpo = DOMPurify.sanitize(html);\nreturn <div dangerouslySetInnerHTML={{ __html: limpo }} />;'), []);
  assert.deepEqual(regrasEm('src/components/Lista.ts', "container.innerHTML = '';"), []);
  assert.deepEqual(regrasEm('app/blog/page.tsx', '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />'), []);
  assert.deepEqual(regrasEm('src/components/A.tsx', 'return <div dangerouslySetInnerHTML={{ __html: comentario.texto }} />;'), ['html-cru']);
  assert.deepEqual(regrasEm('src/components/A.tsx', 'const limpo = html;\nreturn <div dangerouslySetInnerHTML={{ __html: limpo }} />;'), ['html-cru']);
  assert.deepEqual(regrasEm('src/a.js', "el.innerHTML = '<b>' + nome + '</b>';"), ['html-cru']);
  assert.deepEqual(regrasEm('src/a.js', 'el.innerHTML = `<b>${nome}</b>`;'), ['html-cru']);
});

test('13.6 — erro-engolido: catch de uma linha que trata, flag de estado e comentário que explica não disparam', () => {
  assert.deepEqual(regrasEm('src/x/a.ts', "try { await salvar(p); } catch (e) { throw new AppError('SALVAR', e); }"), []);
  assert.deepEqual(regrasEm('src/x/b.ts', "} catch (err) { return res.status(500).json({ code: 'ERRO' }); }"), []);
  assert.deepEqual(regrasEm('src/x/c.ts', 'try { JSON.parse(s); } catch (e) { valido = false; }'), []);
  assert.deepEqual(regrasEm('src/x/d.ts', 'try {\n  JSON.parse(s);\n} catch (e) {\n  valido = false;\n}'), []);
  assert.deepEqual(regrasEm('src/x/e.ts', 'try {\n  fs.unlinkSync(tmp);\n} catch {\n  // arquivo pode não existir\n}'), []);
  assert.deepEqual(regrasEm('src/x/f.ts', 'try { fs.unlinkSync(tmp); } catch { /* arquivo pode não existir */ }'), []);
  assert.deepEqual(regrasEm('src/x/g.ts', 'try { await salvar(p); } catch (e) { console.log(e); }'), ['erro-engolido']);
  assert.deepEqual(regrasEm('src/x/h.ts', 'try { await salvar(p); } catch (e) {}'), ['erro-engolido']);
  assert.deepEqual(regrasEm('src/x/i.ts', 'try {\n  salvar();\n} catch {\n  // nada\n}'), ['erro-engolido'], 'comentário que não explica nada continua engolindo');
});

test('13.6 — sql-montado: SQL parametrizado quebrado em linhas, duas constantes e tabela em CAIXA_ALTA não disparam', () => {
  assert.deepEqual(regrasEm('src/repo/pedido.repo.ts', "const r = await db.query('SELECT * FROM pedidos WHERE cliente_id = $1 ' + 'ORDER BY criado_em', [id]);"), []);
  assert.deepEqual(regrasEm('src/main/java/x/PedidoDao.java', 'return jdbcTemplate.query("SELECT * FROM pedido WHERE cliente_id = ? " +\n    "ORDER BY criado_em", mapper, clienteId);'), []);
  assert.deepEqual(regrasEm('src/main/java/x/PedidoDao.java', 'return jdbcTemplate.query("SELECT * FROM pedido WHERE cliente_id = ? " +'), [], 'a continuação fora do trecho: na dúvida, não dispara');
  assert.deepEqual(regrasEm('src/repo/r.ts', 'const rows = await pool.query(`SELECT * FROM ${TABELA} WHERE id = $1`, [id]);'), []);
  assert.deepEqual(regrasEm('src/repo/s.ts', 'const r = await db.query("SELECT * FROM " + TABELA_PEDIDO + " WHERE id = $1", [id]);'), []);
  assert.deepEqual(regrasEm('src/repo/t.ts', 'await db.query("SELECT * FROM pedido WHERE id = " + id);'), ['sql-montado']);
  assert.deepEqual(regrasEm('src/main/java/x/Dao.java', 'return jdbcTemplate.query("SELECT * FROM pedido WHERE nome = \'" +\n    nome + "\'", mapper);'), ['sql-montado']);
  assert.deepEqual(regrasEm('src/repo/u.ts', 'await db.query(`\n  SELECT * FROM u WHERE id = ${id}\n`);'), ['sql-montado']);
});

test('13.6 — pii-no-log: palavra pessoal dentro de nome maior (emailVerificado, cardId, mailQueue, cpfValido) não é dado pessoal', () => {
  assert.deepEqual(regrasEm('src/services/u.service.ts', "logger.info('usuario atualizado', { userId, emailVerificado: true });"), []);
  assert.deepEqual(regrasEm('src/services/k.service.ts', "logger.info('card movido', { cardId, colunaId });"), []);
  assert.deepEqual(regrasEm('src/services/m.service.ts', "console.error('falha no envio', { pedidoId, mailQueue: fila.nome });"), []);
  assert.deepEqual(regrasEm('src/main/java/x/S.java', 'log.debug("cpfValido={}", cpfValido);'), []);
  assert.deepEqual(regrasEm('src/main/java/x/T.java', 'log.info("cpf={}", cliente.getCpf());'), ['pii-no-log']);
  assert.deepEqual(regrasEm('src/a.js', "logger.info('login', { userEmail, cardNumber });"), ['pii-no-log']);
});

test('13.6 — token-no-storage: chave que não é token (sessionFilters, authRedirectPath) não dispara', () => {
  assert.deepEqual(regrasEm('src/hooks/useFiltro.ts', "localStorage.setItem('sessionFilters', JSON.stringify(f));"), []);
  assert.deepEqual(regrasEm('src/lib/auth.ts', "sessionStorage.setItem('authRedirectPath', pathname);"), []);
  assert.deepEqual(regrasEm('src/a.js', "localStorage.setItem('session', dados);"), ['token-no-storage']);
  assert.deepEqual(regrasEm('src/a.js', "localStorage.setItem('refreshToken', r);"), ['token-no-storage']);
});

test('13.6 — segredo-atribuido: nome de header e rótulo de i18n não são segredo', () => {
  assert.deepEqual(regrasEm('src/x.ts', "const API_KEY = 'x-api-key';"), []);
  assert.deepEqual(regrasEm('locales/en.json', '  "password": "Password",'), []);
  assert.deepEqual(regrasEm('src/x.ts', "const API_KEY = 'x9Kp2mQz7Lw4';"), ['segredo-atribuido']);
});

test('13.6 — io-no-laco: paginação por cursor, retry e laço sem chaves não disparam; consulta por item continua', () => {
  assert.deepEqual(regrasEm('src/x/pag.ts', 'while (cursor) {\n  const res = await client.fetchPage(cursor);\n  cursor = res.next;\n}'), []);
  assert.deepEqual(regrasEm('src/x/retry.ts', 'for (let i = 0; i < 3; i++) {\n  try { return await fetchPedido(id); } catch (e) { ultimo = e; }\n}'), []);
  assert.deepEqual(regrasEm('src/x/loop.ts', 'for (const item of itens) total += item.valor;\nconst cliente = await clientes.findById(id);'), []);
  assert.deepEqual(regrasEm('src/x/a.ts', 'for (const id of ids)\n  await buscarPedido(id);'), ['io-no-laco']);
  assert.deepEqual(regrasEm('src/x/b.ts', 'while (ids.length) {\n  const id = ids.pop();\n  const p = await buscarPedido(id);\n}'), ['io-no-laco']);
  assert.deepEqual(regrasEm('src/x/c.ts', 'for (const pedido of pedidos) {\n  await pedido.load();\n}'), ['io-no-laco']);
  assert.deepEqual(regrasEm('src/x/d.ts', 'for (let i = 0; i < ids.length; i++) {\n  const p = await buscarPedido(ids[i]);\n}'), ['io-no-laco']);
});

test('13.6 — fetch-na-tela e formato-no-jsx: só em .tsx/.jsx; rota, controller e view model ficam de fora', () => {
  assert.deepEqual(regrasEm('app/Controllers/Http/PedidosController.ts', 'const r = await axios.get(urlEstoque);'), []);
  assert.deepEqual(regrasEm('src/app/routes/pedidos.js', 'const r = await fetch(urlEstoque);'), []);
  assert.deepEqual(regrasEm('app/auth/callback/route.ts', "const tok = await fetch(TOKEN_URL, { method: 'POST' });"), []);
  assert.deepEqual(regrasEm('src/components/pedido/pedido.viewmodel.ts', "export const toVm = (p: Pedido): Vm<Pedido> => ({ data: new Intl.DateTimeFormat('pt-BR').format(p.data) });"), []);
  assert.deepEqual(regrasEm('app/pedidos/page.tsx', "const r = await fetch('/api/pedidos');"), ['fetch-na-tela']);
  assert.deepEqual(regrasEm('src/components/Lista.tsx', '  return <td>{item.preco.toFixed(2)}</td>;'), ['formato-no-jsx']);
});

// 13.7 — a correção que a varredura pede cabe na guarda; dependência é decisão humana
test('13.7 — guarda: até cinco arquivos novos por grupo; manifesto e lock de dependência nunca', () => {
  assert.equal(GUARDA.NOVOS_POR_GRUPO, 5);
  const escopo = { arquivos: ['src/components/T.jsx'] };
  const cinco = ['src/a.service.ts', 'src/a.paths.ts', 'src/useA.ts', 'src/query-keys.ts', 'src/a.mapper.ts'];
  assert.deepEqual(violacoes({ mudados: cinco, fase: 'corrigir', escopo, novos: cinco }), []);
  const seis = [...cinco, 'src/b.ts'];
  assert.equal(violacoes({ mudados: seis, fase: 'corrigir', escopo, novos: seis }).length, 1);
  const pkg = violacoes({ mudados: ['package.json'], fase: 'corrigir', escopo: { arquivos: ['package.json', 'src/a.js'] } });
  assert.equal(pkg.length, 1);
  assert.match(pkg[0].motivo, /dependência/);
  assert.equal(violacoes({ mudados: ['pnpm-lock.yaml'], fase: 'corrigir', escopo, novos: ['pnpm-lock.yaml'] }).length, 1, 'lock novo também');
  const t = textoParaCorretor({ task: { id: 'T-1' }, grupo: { arquivos: ['src/a.js'], itens: [{ chave: 'k', dimensao: 'seguranca', motivo: 'm' }] }, numero: 1, total: 1, rodada: 1, caminhoRegistro: '/r.json' });
  assert.match(t, /no máximo 5 arquivos novos/);
  assert.match(t, /não corrigido: exige dependência/);
  // A versão Kiro não traz os agentes (SEM_AGENTES): lá a guarda e a entrada acima bastam.
  if (!SEM_AGENTES) {
    const corretor = readFileSync(join(DIR_AGENTES, 'corretor.md'), 'utf8');
    assert.ok(!/no máximo três arquivos novos/.test(corretor), 'o agente não fixa um número que a entrada já diz');
  }
});

// 13.8 — falsos negativos
test('13.8 — classificar: .tf, .sh, .ps1, .properties, appsettings e application.yml são configuração; lock não vai a validador', () => {
  for (const a of ['infra/main.tf', 'scripts/deploy.sh', 'scripts/deploy.ps1', 'src/main/resources/application.properties', 'appsettings.Development.json', 'config/application-prod.yml']) {
    assert.equal(classificar(a), 'config', a);
  }
  for (const a of ['package-lock.json', 'web/pnpm-lock.yaml', 'yarn.lock']) assert.equal(classificar(a), 'lock', a);
  assert.equal(classificar('package.json'), 'config');
  const { dispensadas } = escolherDimensoes({ temRegras: false, arquivos: [{ arquivo: 'package-lock.json', classe: 'lock', acrescentadas: 'x'.repeat(5000) }] });
  assert.ok(dispensadas.some((d) => d.dimensao === 'seguranca'), 'lock de 5 mil linhas não chama validador de segurança');
});

test('13.8 — varredura: senha em configuração e em connection string; SQL por f-string e concatenação Java; e-mail no log em Python e C#; except: pass', () => {
  assert.deepEqual(regrasEm('src/main/resources/application.properties', 'spring.datasource.password=S3nh4DeVerdade'), ['segredo-em-configuracao']);
  assert.deepEqual(regrasEm('config/application-prod.yml', '  password: S3nh4DeVerdade'), ['segredo-em-configuracao']);
  assert.deepEqual(regrasEm('src/main/resources/application.properties', 'spring.datasource.password=${DB_PASSWORD}'), []);
  assert.deepEqual(regrasEm('src/a.js', 'password=novaSenhaDigitada;'), [], 'em código, valor sem aspas é expressão, não literal');
  assert.deepEqual(regrasEm('appsettings.json', '    "DefaultConnection": "Server=db;Database=app;User Id=sa;Password=S3nh4Forte!;"'), ['segredo-connection-string']);
  assert.deepEqual(regrasEm('src/Data/Ctx.cs', 'var cs = "Server=db;Database=app;User Id=sa;Password=S3nh4Forte!;";'), ['segredo-connection-string']);
  assert.deepEqual(regrasEm('appsettings.json', '    "DefaultConnection": "Server=db;Database=app;User Id=sa;Password={0};"'), []);
  assert.deepEqual(regrasEm('appsettings.Production.json', '  "Password": "S3nh4Forte2024"'), ['segredo-atribuido']);
  assert.deepEqual(regrasEm('app/x.py', 'cursor.execute(f"SELECT * FROM u WHERE id = {uid}")'), ['sql-montado']);
  assert.deepEqual(regrasEm('app/y.py', 'cursor.execute(f"SELECT * FROM {TABELA} WHERE id = %s", (uid,))'), []);
  assert.deepEqual(regrasEm('src/main/java/x/R.java', 'ResultSet rs = stmt.executeQuery("SELECT * FROM u WHERE nome = \'" + nome + "\'");'), ['sql-montado']);
  assert.deepEqual(regrasEm('app/svc.py', 'logger.info(f"login de {user.email}")'), ['pii-no-log']);
  assert.deepEqual(regrasEm('src/x/Svc.cs', '_logger.LogInformation("Login de {Email}", usuario.Email);'), ['pii-no-log']);
  assert.deepEqual(regrasEm('src/x/Svc2.cs', '_logger.LogInformation("Login de {UsuarioId}", usuario.Id);'), []);
  assert.deepEqual(regrasEm('app/a.py', 'try:\n    salvar()\nexcept:\n    pass'), ['erro-engolido']);
  assert.deepEqual(regrasEm('app/b.py', 'try:\n    salvar()\nexcept Exception as e:\n    pass'), ['erro-engolido']);
  assert.deepEqual(regrasEm('app/c.py', 'try:\n    os.remove(tmp)\nexcept FileNotFoundError:\n    pass'), [], 'exceção específica ignorada de propósito');
  assert.deepEqual(regrasEm('app/d.py', 'try:\n    salvar()\nexcept Exception:\n    logger.exception("falha")\n    raise'), []);
});

// 13.10 — MÉDIO e BAIXO
test('13.10 — o relatório e o SKILL dizem que MÉDIO e BAIXO não são avaliados no G3, e quem os cobre', () => {
  const dir = projeto();
  const fim = iniciar({ task: 'TASK-1', repo: dir, ...SEM }, dir);
  assert.equal(fim.acao, 'fim');
  assert.match(fim.medioEBaixo, /não (são )?avaliados no G3/);
  const rel = lerRelatorio(dir);
  assert.equal(rel.medioEBaixo.avaliadosNoG3, false);
  assert.match(rel.medioEBaixo.quemCobre, /auditoria-de-us/);
  assert.ok(!('ignorados' in rel), 'nada de contador que parece "zero achados médios"');
  const skill = readFileSync(fileURLToPath(new URL('../../.claude/skills/spec-implement/SKILL.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
  assert.match(skill, /MÉDIO e BAIXO \*\*não são avaliados no G3\*\*/);
});

// 13.11 — --repo numa subpasta do repositório git
function monorepo() {
  const dir = mkdtempSync(join(tmpdir(), 'mono-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'config', 'core.autocrlf', 'false');
  for (const p of ['apps/api/src', 'apps/web/src', 'outputs/spec']) mkdirSync(join(dir, ...p.split('/')), { recursive: true });
  writeFileSync(join(dir, '.gitignore'), 'outputs/spec/validacao/\n');
  writeFileSync(join(dir, 'outputs', 'spec', 'tasks.json'), JSON.stringify({ stories: [{ id: 'US-1', tasks: [{ id: 'TASK-1', title: 't', description: 'd' }] }] }));
  writeFileSync(join(dir, 'apps', 'api', 'src', 'log.js'), 'export const f = (c) => c.id;\n');
  writeFileSync(join(dir, 'apps', 'web', 'src', 'web.js'), 'export const w = 1;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'apps', 'api', 'src', 'log.js'), "export const f = (c) => console.log('x', c.cpf);\n");
  writeFileSync(join(dir, 'apps', 'api', 'src', 'novo.js'), "export const g = (c) => console.log('y', c.email);\n");
  return dir;
}

test('13.11 — --repo numa subpasta do repositório: os caminhos vêm relativos a ela, e os achados não somem', () => {
  const dir = monorepo();
  const api = join(dir, 'apps', 'api');
  const r = iniciar({ task: 'TASK-1', repo: api, ...SEM }, dir);
  assert.equal(r.acao, 'corrigir', `a varredura não pode ser anulada em silêncio: ${JSON.stringify(r)}`);
  const rel = lerRelatorio(dir);
  assert.deepEqual(rel.bloqueantes.map((b) => b.evidencia.arquivo).sort(), ['src/log.js', 'src/novo.js']);
  assert.deepEqual(rel.descartados, []);
  // A guarda enxerga, relativo à subpasta, o que o corretor mexe fora dela.
  writeFileSync(join(dir, 'apps', 'web', 'src', 'web.js'), 'export const w = 2;\n');
  const p = avancar({ task: 'TASK-1' }, dir);
  assert.equal(p.acao, 'parar', JSON.stringify(p));
  assert.deepEqual(p.violacoes.map((v) => v.arquivo), ['../web/src/web.js']);
});

// D55 (teste ponta a ponta de 2026-10-21) — dois falsos positivos ALTO que travavam o G3, a
// auditoria da US e a do repositório: o placeholder que a rule `deploy-and-build` manda versionar
// no `.env.example`, e o laço sequencial de um script de migração.
test('D55 — segredo-em-configuracao: CHANGE_ME, <…>, ${VAR} e valor vazio não são segredo; em *.example, só o que tem cara de segredo gerado', () => {
  for (const [arquivo, linha] of [
    ['.env.example', 'DB_PASSWORD=CHANGE_ME'],
    ['.env.example', 'SESSION_SECRET=CHANGE_ME_LONG_RANDOM'],
    ['src/main/resources/application.properties', 'spring.datasource.password=CHANGE_ME'],
    ['src/main/resources/application.properties', 'spring.datasource.password=change-me-depois'],
    ['config/application.yml', '  password: <senha-do-banco>'],
    ['.env', 'DB_PASSWORD=${DB_PASSWORD}'],
    ['.env', 'DB_PASSWORD='],
    ['.env.example', 'DB_PASSWORD=senha_local_dev'],
    ['.env.sample', 'API_KEY=minha-chave-de-teste'],
    ['config/app.template.yml', '  password: postgres-local-123'],
  ]) assert.deepEqual(regrasEm(arquivo, linha), [], `${arquivo}: ${linha}`);
  // O defeito continua pegando: valor de verdade em configuração que vai para o deploy, e segredo
  // com cara de gerado (16+ caracteres com maiúscula, minúscula e dígito, ou 32+ hexadecimais) no exemplo.
  assert.deepEqual(regrasEm('.env', 'DB_PASSWORD=senha_local_dev'), ['segredo-em-configuracao']);
  assert.deepEqual(regrasEm('src/main/resources/application.properties', 'spring.datasource.password=S3nh4DeVerdade'), ['segredo-em-configuracao']);
  assert.deepEqual(regrasEm('.env.example', 'API_KEY=q8F3kLm2Zx9Pw7Rt4Yb6'), ['segredo-em-configuracao']);
  assert.deepEqual(regrasEm('.env.example', 'JWT_SECRET=4f9a1c2e7b3d8a6f0e5c9b2a7d4f1e8c'), ['segredo-em-configuracao']);
  // O `.env.example` inteiro do projeto do teste ponta a ponta.
  const envExemplo = [
    'NODE_ENV=development', 'PORT=3000', 'DATABASE_URL=postgres://pedidos:CHANGE_ME@db:5432/pedidos',
    'DB_PASSWORD=CHANGE_ME', 'SESSION_SECRET=CHANGE_ME_LONG_RANDOM', 'WEB_ORIGIN=http://localhost:3001',
  ].join('\n');
  assert.deepEqual(regrasEm('.env.example', envExemplo), []);
});

test('D55 — segredo-atribuido e connection string: o mesmo critério de exemplo e de CHANGE_ME', () => {
  assert.deepEqual(regrasEm('src/a.js', "const apiKey = 'CHANGE_ME_DEPOIS';"), []);
  assert.deepEqual(regrasEm('appsettings.Example.json', '  "Password": "senha-local-dev"'), []);
  assert.deepEqual(regrasEm('appsettings.json', '    "Db": "Server=db;Database=app;User Id=sa;Password=CHANGE_ME;"'), []);
  assert.deepEqual(regrasEm('appsettings.Production.json', '  "Password": "S3nh4Forte2024"'), ['segredo-atribuido']);
  assert.deepEqual(regrasEm('appsettings.Example.json', '  "Password": "q8F3kLm2Zx9Pw7Rt4Yb6"'), ['segredo-atribuido']);
});

test('D55 — io-no-laco: script de migração/seed e leitura de arquivo por item não disparam; consulta por item no serviço continua', () => {
  const migracao = [
    'export async function applyMigrations({ client, directory }) {',
    "  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));",
    '  for (const name of await listMigrations(directory)) {',
    '    if (done.has(name)) continue;',
    "    const sql = await readFile(join(directory, name), 'utf8');",
    "    await client.query('BEGIN');",
    '    await client.query(sql);',
    "    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);",
    '  }',
    '}',
  ].join('\n');
  assert.deepEqual(regrasEm('db/apply-migrations.js', migracao), [], 'o script do teste ponta a ponta');
  assert.deepEqual(regrasEm('src/db/migrate.ts', migracao), []);
  assert.deepEqual(regrasEm('db/migrations/runner.js', migracao), []);
  const seed = 'for (const c of clientes) {\n  await db.query(SQL_INSERIR, [c.id]);\n}';
  assert.deepEqual(regrasEm('db/seeds/dev.js', seed), []);
  assert.deepEqual(regrasEm('scripts/seed.js', seed), []);
  // Ler N arquivos é N leituras por natureza — não há a «consulta por lista de ids» que a correção pede.
  assert.deepEqual(regrasEm('src/x/modelos.js', "for (const nome of nomes) {\n  const t = await readFile(join(dir, nome), 'utf8');\n}"), []);
  assert.deepEqual(regrasEm('src/x/modelos2.js', "for (const nome of nomes) {\n  const t = await fs.promises.readFile(nome, 'utf8');\n}"), []);
  // O mesmo laço fora de migração/seed continua pegando, e a leitura do arquivo não esconde a consulta.
  assert.deepEqual(regrasEm('src/pedidos/importar.js', seed), ['io-no-laco']);
  assert.deepEqual(regrasEm('src/pedidos/importar2.js', "for (const nome of nomes) {\n  const sql = await readFile(nome, 'utf8');\n  await db.query(sql);\n}"), ['io-no-laco']);
});
