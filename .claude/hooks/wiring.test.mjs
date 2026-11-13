// Harness Elo v2 — Task 10. O teste de WIRING: coerência entre o `settings.json` e o disco.
//
// O QUE ELE MEDE, E O QUE NÃO MEDE. Ele prova que o JSON declara os três eventos, que cada
// comando declarado aponta para um arquivo que existe, que o módulo ligado a cada evento emite o
// `hookEventName` daquele evento, e que nenhum módulo de verificador ficou sem registro nem uso.
// **Ele não prova que o Claude Code executa coisa alguma** — isso é a verificação manual do
// Step 3, registrada em `docs/execucao/verificacao/verificacoes-primeiro-dia.md` (repositório de documentos). Um teste verde aqui com a camada
// inerte lá é o pior resultado possível do plano, e é justamente por isso que os dois existem.
//
// TODO CAMINHO É DERIVADO de `import.meta.url`. Caminho do Windows escrito à mão dentro de string
// perde as contrabarras em silêncio e o resultado sai plausível — o `estado.test.mjs` registra a
// mesma regra pela mesma razão.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR_HOOKS = fileURLToPath(new URL('./', import.meta.url));
/** `…/.claude/hooks` → `…/.claude` → raiz do projeto. */
const RAIZ = resolve(DIR_HOOKS, '..', '..');
const SETTINGS = join(RAIZ, '.claude', 'settings.json');

/**
 * Os três eventos que esta camada registra, e o exportador que cada despachante usa para falar
 * com o Claude Code. O nome do evento é a CHAVE do `settings.json` **e** o valor de
 * `hookEventName` na saída — se os dois divergirem, o Claude Code descarta a resposta em silêncio,
 * que é o modo de falha que o `posttooluse.test.mjs` já registra para o seu próprio emissor.
 */
const EMISSOR_POR_EVENTO = {
  SessionStart: 'emitir',
  PreToolUse: 'emitirDeny',
  PostToolUse: 'emitirAviso',
};

/**
 * As três formas DOCUMENTADAS de "casa tudo" (`code.claude.com/docs/en/hooks.md`): `"*"`, `""` e
 * omitir o campo. São equivalentes — se uma não funcionar, a outra também não. `".*"` funciona por
 * acidente de parsing e NÃO é forma documentada; esta lista existe para que ele fique vermelho.
 */
const MATCHERS_CURINGA = ['*', '', undefined];

/**
 * Verificador → módulo que o implementa. **Não é 1:1 por nome**, e é por isso que a tabela está
 * escrita: `zonas.mjs` implementa DOIS verificadores (`zona-imutavel` e `congelamento`). Derivar o
 * arquivo do nome do verificador daria falso alarme nos dois.
 */
const MODULO_DO_VERIFICADOR = {
  'pretooluse.mjs': {
    'zona-imutavel': 'zonas.mjs',
    congelamento: 'zonas.mjs',
    cadeia: 'cadeia.mjs',
    'fecho-explore': 'fecho-explore.mjs',
    'escrita-bash': 'escrita-bash.mjs',
    'escrita-powershell': 'escrita-bash.mjs',
    'delivery-gate': 'delivery-gate.mjs',
  },
  'posttooluse.mjs': {
    gramatica: 'gramatica.mjs',
    'sync-log': 'sync-log.mjs',
  },
};

function lerSettings() {
  return JSON.parse(readFileSync(SETTINGS, 'utf8'));
}

/** Achata o `hooks` do settings numa lista de entradas, com o evento e o matcher do grupo junto. */
function entradasDeHook(cfg) {
  const out = [];
  const hooks = (cfg && cfg.hooks) || {};
  for (const evento of Object.keys(hooks)) {
    for (const grupo of hooks[evento] || []) {
      for (const h of (grupo && grupo.hooks) || []) {
        out.push({
          evento,
          matcher: grupo ? grupo.matcher : undefined,
          tipo: h && h.type,
          command: h && h.command,
        });
      }
    }
  }
  return out;
}

/**
 * O caminho do `.mjs` citado num `command`. Por tokens, não por regex: o comando é
 * `node <caminho>`, e um `split` em espaço com "o token que termina em `.mjs`" não tem como
 * casar contrabarra nenhuma por engano.
 */
function caminhoDoComando(command) {
  const alvo = String(command || '')
    .trim()
    .split(/\s+/)
    .find((t) => t.endsWith('.mjs'));
  return alvo ? resolve(RAIZ, alvo) : null;
}

/** Todos os módulos de hook, sem os testes. */
function modulos() {
  return readdirSync(DIR_HOOKS).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'));
}

/** Os `./x.mjs` que um módulo importa. Só os irmãos; `node:fs` e afins não interessam aqui. */
function importados(arquivo) {
  const texto = readFileSync(join(DIR_HOOKS, arquivo), 'utf8');
  const achados = texto.match(/from '\.\/[A-Za-z0-9_.-]+\.mjs'/g) || [];
  return new Set(achados.map((m) => m.slice("from './".length, -1)));
}

// ————————————————————————— 1. o JSON declara os três eventos —————————————————————————

test('o settings.json registra os três eventos da camada, com pelo menos um comando cada', () => {
  const cfg = lerSettings();
  const hooks = (cfg && cfg.hooks) || {};

  // Esta é a asserção que a camada dormente (`{"hooks": {}}`) reprova. Ela existe porque as duas
  // checagens seguintes — comando existe em disco, verificador tem módulo — passam VAZIAS com o
  // JSON vazio: um teste que só percorre o que está declarado nada diz quando nada está declarado.
  assert.deepEqual(
    Object.keys(hooks).sort(),
    ['PostToolUse', 'PreToolUse', 'SessionStart'],
    'o settings.json tem que declarar exatamente os três eventos desta camada',
  );

  for (const evento of Object.keys(EMISSOR_POR_EVENTO)) {
    const doEvento = entradasDeHook(cfg).filter((e) => e.evento === evento);
    assert.ok(doEvento.length >= 1, `${evento} sem nenhum hook declarado`);
    for (const e of doEvento) {
      assert.equal(e.tipo, 'command', `${evento}: hook que não é do tipo command`);
    }
  }
});

test('são TRÊS comandos, não seis — o roteamento por tool vive na tabela de registro', () => {
  // Decisão 14 da spec. Seis comandos no JSON fariam a latência crescer com o número de
  // verificações; com três, acrescentar trava custa zero de spawn.
  assert.equal(entradasDeHook(lerSettings()).length, 3);
});

// ————————————————————— 2. todo comando citado existe em disco —————————————————————

test('todo comando do settings.json aponta para um arquivo que existe', () => {
  const entradas = entradasDeHook(lerSettings());
  assert.ok(entradas.length > 0, 'nenhum comando declarado — nada foi medido');

  for (const e of entradas) {
    const abs = caminhoDoComando(e.command);
    assert.ok(abs, `${e.evento}: o comando "${e.command}" não cita nenhum .mjs`);
    // O erro mais provável desta camada inteira: renomear um hook e esquecer o JSON.
    assert.ok(existsSync(abs), `${e.evento}: o comando aponta para arquivo inexistente — ${abs}`);
  }
});

test('todo comando roda o Node contra o .mjs, sem shell no meio', () => {
  for (const e of entradasDeHook(lerSettings())) {
    const tokens = String(e.command).trim().split(/\s+/);
    assert.equal(tokens[0], 'node', `${e.evento}: o comando não começa em \`node\``);
    assert.equal(tokens.length, 2, `${e.evento}: o comando tem argumento a mais — "${e.command}"`);
  }
});

test('os matchers de Pre/PostToolUse são forma documentada de "casa tudo"', () => {
  for (const e of entradasDeHook(lerSettings())) {
    if (e.evento === 'SessionStart') continue; // ali o matcher compara a RAZÃO de início
    assert.ok(
      MATCHERS_CURINGA.includes(e.matcher),
      `${e.evento}: matcher ${JSON.stringify(e.matcher)} não é forma documentada de curinga`,
    );
  }
});

// ————————— 3. o módulo ligado a cada evento emite o hookEventName daquele evento —————————

test('o módulo que o JSON liga a cada evento emite o hookEventName daquele evento', async () => {
  for (const e of entradasDeHook(lerSettings())) {
    const abs = caminhoDoComando(e.command);
    const mod = await import(pathToFileURL(abs).href);
    const nome = EMISSOR_POR_EVENTO[e.evento];
    assert.ok(nome, `evento inesperado no settings.json: ${e.evento}`);
    const emissor = mod[nome];
    assert.equal(typeof emissor, 'function', `${abs} não exporta \`${nome}\``);

    const saida = JSON.parse(emissor('texto de teste'));
    assert.equal(
      saida.hookSpecificOutput.hookEventName,
      e.evento,
      `${abs} está ligado em ${e.evento} mas emite ${saida.hookSpecificOutput.hookEventName}`,
    );
  }
});

// ——————— 4. todo verificador do REGISTRO tem módulo importável, e o despachante o importa ———————

for (const [despachante, mapa] of Object.entries(MODULO_DO_VERIFICADOR)) {
  test(`${despachante}: o REGISTRO tem exatamente os verificadores documentados`, async () => {
    const mod = await import(pathToFileURL(join(DIR_HOOKS, despachante)).href);
    const nomes = mod.REGISTRO.map((v) => v.nome);
    assert.deepEqual(
      nomes.slice().sort(),
      Object.keys(mapa).sort(),
      'verificador entrou ou saiu do REGISTRO sem que esta tabela fosse atualizada',
    );
  });

  test(`${despachante}: toda entrada do REGISTRO está bem formada`, async () => {
    const mod = await import(pathToFileURL(join(DIR_HOOKS, despachante)).href);
    for (const v of mod.REGISTRO) {
      assert.equal(typeof v.nome, 'string', 'entrada sem nome');
      assert.ok(Array.isArray(v.gatilhos) && v.gatilhos.length > 0, `${v.nome}: sem gatilhos`);
      for (const g of v.gatilhos) assert.equal(typeof g, 'string', `${v.nome}: gatilho não-string`);
      assert.equal(typeof v.bloqueia, 'boolean', `${v.nome}: \`bloqueia\` não é boolean`);
      assert.equal(typeof v.executar, 'function', `${v.nome}: \`executar\` não é função`);
    }
  });

  test(`${despachante}: cada verificador tem módulo em disco, e o despachante o importa`, () => {
    const importa = importados(despachante);
    for (const [verificador, arquivo] of Object.entries(mapa)) {
      assert.ok(
        existsSync(join(DIR_HOOKS, arquivo)),
        `${verificador}: o módulo ${arquivo} não existe`,
      );
      assert.ok(
        importa.has(arquivo),
        `${verificador}: ${despachante} não importa ${arquivo}`,
      );
    }
  });
}

// ————————————————————————— 5. nenhum módulo ficou órfão —————————————————————————

test('nenhum módulo de hook ficou órfão — sem importador e sem entrada no settings.json', () => {
  // A DEFINIÇÃO É O PONTO DELICADO desta tarefa, e a versão ingênua dá falso alarme.
  //
  // "É importado por algum outro módulo?" acusaria `estado.mjs`, `pretooluse.mjs` e
  // `posttooluse.mjs` — os TRÊS pontos de entrada. Eles não são importados por ninguém porque o
  // uso deles é justamente o `settings.json`. Por isso o `settings.json` conta como uso, e é o que
  // faz este teste ser vermelho enquanto a camada está dormente: com `{"hooks": {}}` não há
  // entrada nenhuma, e os três viram órfãos.
  //
  // Os testes NÃO contam como uso — um módulo cujo único importador é o próprio teste é código que
  // só existe para ser testado. `estado.mjs` estava exatamente nesse estado antes desta tarefa.
  const arquivos = modulos();

  const importadoPorAlguem = new Set();
  for (const f of arquivos) for (const alvo of importados(f)) importadoPorAlguem.add(alvo);

  const pontosDeEntrada = new Set(
    entradasDeHook(lerSettings())
      .map((e) => caminhoDoComando(e.command))
      .filter(Boolean)
      .map((abs) => basename(abs)),
  );

  const orfaos = arquivos.filter((f) => !importadoPorAlguem.has(f) && !pontosDeEntrada.has(f));
  assert.deepEqual(orfaos, [], `módulos sem registro nem uso: ${orfaos.join(', ')}`);
});
