// As invariantes da zona dos executáveis de mão (Decisão 20).
//
// POR QUE ESTE ARQUIVO NÃO É UMA CÓPIA DO TESTE DE ÓRFÃOS DO `wiring.test.mjs`, e a diferença é
// de pergunta, não de rigor:
//
//   - em `.claude/hooks/`, o uso real de um módulo é WIRING — um despachante o importa, ou o
//     `settings.json` o registra. Módulo sem uma das duas formas é maquinário morto, e o teste de
//     lá reprova com razão. "Citado numa rule" NÃO serve ali: um hook citado em prosa e desligado
//     no JSON não roda, e ninguém saberia;
//   - em `.claude/ferramentas/`, o uso real é INVOCAÇÃO DOCUMENTADA. Uma ferramenta não tem
//     importador por desenho, e o único consumidor dela é um humano — ou um agente — seguindo uma
//     instrução escrita. Ferramenta que instrução nenhuma manda rodar é peso morto, e é isso que
//     a invariante de documentação pega.
//
// A mesma palavra ("uso") mede coisas diferentes nas duas pastas, e por isso são dois testes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ZONA_IMUTAVEL } from '../hooks/kit.mjs';

const DIR_FERRAMENTAS = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(DIR_FERRAMENTAS, '..', '..');
const DIR_HOOKS = join(RAIZ, '.claude', 'hooks');
const DIR_RULES = join(RAIZ, '.claude', 'rules', 'harness');

/** As ferramentas, sem os testes. */
function ferramentas() {
  return readdirSync(DIR_FERRAMENTAS)
    .filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))
    .sort();
}

/** Todo texto em que uma instrução de invocação pode morar. */
function textoDocumentado() {
  const partes = [
    readFileSync(join(RAIZ, 'CLAUDE.md'), 'utf8'),
    readFileSync(join(RAIZ, 'README.md'), 'utf8'),
    // Manutenção também é instrução de invocação: o gerar-kiro.mjs é de quem mantém o template,
    // e o README é de quem o usa — citá-lo lá seria mandar o consultor gerar o que ele clona.
    readFileSync(join(RAIZ, 'MANUTENCAO.md'), 'utf8'),
  ];
  for (const f of readdirSync(DIR_RULES)) {
    if (f.endsWith('.md')) partes.push(readFileSync(join(DIR_RULES, f), 'utf8'));
  }
  return partes.join('\n');
}

/**
 * Este texto de módulo importa algo de `.claude/ferramentas/`?
 *
 * TRÊS FORMAS, e a primeira versão desta invariante só pegava uma. `from '../ferramentas/` é o
 * import com nome; `import '../ferramentas/` é o de efeito colateral, que "só roda o lado" e é
 * exatamente o que alguém escreveria para chamar uma ferramenta de dentro de um hook; e
 * `import('../ferramentas/` é o dinâmico. Exigir `from` deixava as duas últimas passarem.
 *
 * É PREDICADO SOBRE TEXTO, de propósito: ele decide sem carregar módulo nenhum. Ver a nota do
 * teste da invariante para o motivo de isso ser a única forma verificável aqui.
 *
 * FALSO POSITIVO CONHECIDO E ACEITO: um comentário que CITE a sintaxe proibida entre aspas — por
 * exemplo `// nunca escreva: import '../ferramentas/bench.mjs';` — casa o padrão, porque este
 * predicado lê texto e não distingue comentário de código. Distinguir exigiria um parser, que é
 * dependência, e o harness não tem nenhuma. A troca é aceitável porque a invariante mora num
 * TESTE: um falso positivo aqui é uma suíte vermelha, visível e consertável em um minuto — não uma
 * escrita negada ao consultor. Se algum dia esta decisão migrar para uma trava bloqueante, este
 * parágrafo é a razão de não migrar como está.
 */
function importaDeFerramenta(src) {
  return /(?:^|[^\w])(?:from|import)\s*\(?\s*['"\`]\.\.\/ferramentas\//.test(String(src || ''));
}

test('há pelo menos uma ferramenta — a pasta não nasceu vazia', () => {
  assert.ok(ferramentas().length > 0, '.claude/ferramentas/ não tem nenhum .mjs');
});

test('toda ferramenta roda por comando digitado — tem o guard do main()', () => {
  for (const f of ferramentas()) {
    const src = readFileSync(join(DIR_FERRAMENTAS, f), 'utf8');
    assert.match(
      src,
      /import\.meta\.url === pathToFileURL\(process\.argv\[1\] \|\| ''\)\.href/,
      `${f} não tem o guard de main() — ferramenta que não roda por comando não é ferramenta`,
    );
  }
});

test('toda ferramenta é citada por nome em CLAUDE.md, README.md ou numa rule', () => {
  const texto = textoDocumentado();
  for (const f of ferramentas()) {
    assert.ok(
      texto.includes(f),
      `${f} não é citada em documento nenhum — o único consumidor de uma ferramenta é ` +
      'quem segue a instrução escrita, e sem instrução ela é peso morto',
    );
  }
});

test('o README documenta o comando de suíte que cobre as DUAS pastas de teste', () => {
  // A TAREFA 1 CRIOU ESTA DIVERGÊNCIA: até ela, `.claude/hooks/` era a única pasta de teste e o
  // comando de uma pasta estava correto. Sem esta asserção, a próxima pasta de teste que nascer
  // repete o defeito — e o modo de falha é silencioso: a suíte parece passar porque o arquivo que
  // falharia nunca foi varrido.
  //
  // A DUAS PONTAS de propósito: exigir que a forma quebrada esteja ausente, sozinho, passaria
  // também com um README que não documentasse comando nenhum.
  const readme = readFileSync(join(RAIZ, 'README.md'), 'utf8');
  assert.match(readme, /node --test \.claude\/hooks\/\*\.test\.mjs \.claude\/ferramentas\/\*\.test\.mjs/);
});

test('nenhum módulo de .claude/hooks/ importa de .claude/ferramentas/', () => {
  // A DEPENDÊNCIA É DE MÃO ÚNICA, e a direção proibida é a perigosa: uma ferramenta tem direito
  // de ESCREVER ARQUIVO, e um verificador não. Importar ferramenta dentro de um bloqueante põe
  // esse direito no caminho de uma decisão — que é exatamente o que a saída do `appendLedger`
  // do `delivery-gate` fechou.
  for (const f of readdirSync(DIR_HOOKS)) {
    if (!f.endsWith('.mjs')) continue;
    const src = readFileSync(join(DIR_HOOKS, f), 'utf8');
    assert.ok(
      !importaDeFerramenta(src),
      `${f} importa de .claude/ferramentas/ — a dependência é de mão única`,
    );
  }
});

test('importaDeFerramenta pega as três formas de import', () => {
  // ESTES CASOS SÃO A PROVA DA INVARIANTE, e não a varredura de arquivos. A varredura NÃO é
  // mutável: qualquer import real de uma ferramenta dentro de `.claude/hooks/` fecha um ciclo
  // (`bench.mjs` → `pretooluse.mjs` → `fecho-explore.mjs` → `kit.mjs`) e derruba o carregamento do
  // arquivo de teste antes de qualquer asserção rodar. Medido nas duas formas. O ciclo é, ele
  // mesmo, uma segunda linha de defesa — mas quem prova que ESTA invariante discrimina é o
  // predicado, exercitado sobre texto.
  assert.equal(importaDeFerramenta("import { medir } from '../ferramentas/bench.mjs';"), true);
  assert.equal(importaDeFerramenta("import '../ferramentas/bench.mjs';"), true);
  assert.equal(importaDeFerramenta("const m = await import('../ferramentas/bench.mjs');"), true);
  assert.equal(importaDeFerramenta('import { x } from "../ferramentas/bench.mjs";'), true);
  assert.equal(importaDeFerramenta('const m = await import(`../ferramentas/bench.mjs`);'), true);
  assert.equal(importaDeFerramenta('import `../ferramentas/bench.mjs`;'), true);
});

test('importaDeFerramenta não acusa import legítimo nem menção em comentário', () => {
  // A OUTRA PONTA. Um predicado que respondesse `true` sempre passaria no teste acima sozinho.
  assert.equal(importaDeFerramenta("import { chave } from './kit.mjs';"), false);
  assert.equal(importaDeFerramenta("import { readFileSync } from 'node:fs';"), false);
  assert.equal(importaDeFerramenta('// o medidor mora em ../ferramentas/bench.mjs'), false);
  assert.equal(importaDeFerramenta("import { x } from '../hooks/kit.mjs';"), false);
  assert.equal(importaDeFerramenta(''), false);
});

test('nenhuma ferramenta está registrada no settings.json', () => {
  // Se estivesse, ela seria verificador: passaria a rodar por evento, com uma tool call parada
  // esperando, e o orçamento de ≤50 ms da Decisão 14 passaria a valer sobre ela. Nenhuma foi
  // escrita para isso.
  const bruto = readFileSync(join(RAIZ, '.claude', 'settings.json'), 'utf8');
  for (const f of ferramentas()) {
    assert.ok(!bruto.includes(f), `${f} aparece no settings.json — ferramenta não é verificador`);
  }
});

test('.claude/ferramentas/ está na ZONA_IMUTAVEL', () => {
  assert.ok(
    ZONA_IMUTAVEL.includes('.claude/ferramentas/'),
    'ferramenta é maquinário do template: atualizada por sobrescrita, nunca editada pelo projeto',
  );
});

test('o bench.mjs saiu da raiz de .claude/ — as duas pontas', () => {
  // A DUAS PONTAS de propósito: a asserção de ausência sozinha passaria também se alguém tivesse
  // apagado o instrumento, e a de presença sozinha passaria com duas cópias divergentes.
  assert.ok(!existsSync(join(RAIZ, '.claude', 'bench.mjs')), '.claude/bench.mjs ainda existe');
  assert.ok(existsSync(join(DIR_FERRAMENTAS, 'bench.mjs')), 'falta .claude/ferramentas/bench.mjs');
});
