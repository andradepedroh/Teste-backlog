// Harness Elo v2 — Medidor do orçamento de latência (Task 12, Decisão 14).
//
// NÃO É VERIFICADOR. Não entra no `settings.json`, não é registrado em despachante nenhum, e
// nada em produção o importa. É instrumento: roda à mão, imprime números, e sai.
//
// ————————————————————————————————————————————————————————————————————————————————————————————
// POR QUE ELE MORA EM `.claude/ferramentas/`
// ————————————————————————————————————————————————————————————————————————————————————————————
//
// A Task 12 pedia `.claude/hooks/bench.mjs`. Medido: ali ele DERRUBA o teste de órfãos do
// `wiring.test.mjs` — *"nenhum módulo de hook ficou órfão — sem importador e sem entrada no
// settings.json"*.
//
// O teste está CERTO e o pedido estava errado. Em `.claude/hooks/`, o uso real de um módulo é
// wiring, e um instrumento rodado à mão não satisfaz nenhuma das duas formas POR DESENHO — ele
// não é maquinário ligado, é ferramenta sobre o maquinário. O conserto foi tirar o instrumento da
// pasta onde essa regra vale, e NÃO abrir exceção na regra: um `.claude/hooks/` com allowlist de
// órfãos aceitos é um `.claude/hooks/` onde o próximo módulo morto entra pela mesma porta.
//
// ELE FICOU EM `.claude/` POR RECUO, E ISSO FOI CORRIGIDO (Decisão 20). Aquele endereço deixava o
// instrumento FORA da zona imutável, e a versão anterior deste comentário afirmava que era o
// certo, "porque o instrumento não é maquinário do template". Era afirmação errada: ele é
// maquinário — o consultor não o edita, e atualizar o template o sobrescreve. `.claude/ferramentas/`
// é o endereço da categoria, está na `ZONA_IMUTAVEL`, e as invariantes dela moram em
// `ferramentas.test.mjs`.
//
// ————————————————————————————————————————————————————————————————————————————————————————————
// TRÊS GRANDEZAS, MEDIDAS SEPARADAMENTE E NUNCA SOMADAS NUMA SÓ
// ————————————————————————————————————————————————————————————————————————————————————————————
//
//   | grandeza                                    | quem controla | como tratar          |
//   |---------------------------------------------|---------------|----------------------|
//   | trabalho do harness, do `main()` ao `stdout`| nós           | ORÇAMENTO: <= 50 ms  |
//   | partida do interpretador + entrega do payload| a plataforma | fato observado       |
//   | ponta a ponta                               | os dois       | fato observado       |
//
// A SEGUNDA E A PRIMEIRA NÃO SE MEDEM DO MESMO JEITO, e a diferença é o ponto inteiro desta
// tarefa. O trabalho do harness é medido EM PROCESSO — `import` do `despachar` e do `REGISTRO`,
// cronômetro só em volta da chamada. Um medidor que só cronometra `spawn` devolve sempre ~500 ms
// e NÃO DISTINGUE HARNESS RÁPIDO DE HARNESS LENTO: o piso da plataforma domina o total e esconde
// exatamente a informação que o orçamento de 50 ms governa.
//
// ————————————————————————————————————————————————————————————————————————————————————————————
// SETE PAYLOADS, E DOIS DELES NÃO ESTAVAM NA LISTA DO PLANO
// ————————————————————————————————————————————————————————————————————————————————————————————
//
// A lista do plano tem cinco: escrita em `outputs/explore/`, escrita em `outputs/spec/` fora da
// whitelist, escrita na zona imutável, invocação de skill, comando `Bash` não-git. Ela foi
// escrita ANTES da Task 9 e não menciona `push` nem `delivery` uma única vez.
//
// Os cinco cabem folgadamente no orçamento. O único payload que o estoura — em ordem de grandeza —
// é o `git push`, que não está na lista. Uma medição que rodasse só o prescrito reportaria "tudo
// dentro do orçamento": cada número verdadeiro, e a conclusão falsa. Por isso `bash-git-push`
// está aqui.
//
// E por isso `bash-git-status` está aqui junto: ele custa ~0 ms porque a PRÉ-PASSAGEM do
// `delivery-gate` (`podeSerRelevante`) o dispensa antes de qualquer `spawn` de `git`. Sem esse
// par, quem lê o número do push conclui que todo comando `Bash` é caro. O que custa não é o
// gatilho `Bash`; é o push.
//
// ————————————————————————————————————————————————————————————————————————————————————————————
// CUIDADOS QUE MUDAM O NÚMERO
// ————————————————————————————————————————————————————————————————————————————————————————————
//
//   - AQUECIMENTO. A primeira chamada carrega módulo, resolve caminho e aquece cache de
//     diretório; sem descartá-la, ela domina a mediana de um payload barato. `AQUECIMENTO`
//     amostras são jogadas fora antes de o cronômetro valer.
//   - MEDIANA **E** p95. O push mede subprocesso de `git`, e a variância é enorme — amplitude de
//     centenas de milissegundos para o mesmo comando nesta máquina. Reportar só a mediana esconde
//     o fato; a amplitude É o fato. Nenhuma leitura isolada conclui coisa alguma aqui.
//   - PELO DESPACHANTE, não pelos predicados soltos. `despachar(payload, REGISTRO)` é a unidade
//     que o orçamento governa, e é a que cresce quando se acrescenta verificador.
//
// Uso:
//   cd harness-elo-v2 && node .claude/ferramentas/bench.mjs
//   node .claude/ferramentas/bench.mjs --repeticoes 20 --curva 200,2000,8000

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir, hostname, cpus, totalmem } from 'node:os';

import { despachar, REGISTRO, criarRegistro, IO_REAL } from '../hooks/pretooluse.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));   // …/.claude/ferramentas
const RAIZ = resolve(AQUI, '..', '..');                 // raiz do projeto
const DESPACHANTE = join(AQUI, '..', 'hooks', 'pretooluse.mjs');
const ORCAMENTO_MS = 50;

// ————————————————————————————— estatística —————————————————————————————

/**
 * Percentil por interpolação linear sobre a amostra ordenada. `p` em [0,1].
 * Amostra vazia devolve `NaN` — um medidor que devolve 0 para "não medi" mente na direção boa,
 * que é a pior direção para um medidor mentir.
 */
function percentil(amostras, p) {
  if (!amostras.length) return NaN;
  const ord = [...amostras].sort((a, b) => a - b);
  if (ord.length === 1) return ord[0];
  const i = p * (ord.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return ord[lo];
  return ord[lo] + (ord[hi] - ord[lo]) * (i - lo);
}

function resumir(amostras) {
  return {
    n: amostras.length,
    min: Math.min(...amostras),
    mediana: percentil(amostras, 0.5),
    p95: percentil(amostras, 0.95),
    max: Math.max(...amostras),
  };
}

const ms = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—');

/**
 * Cronometra `fn` `n` vezes, descartando as primeiras `aquecimento`.
 * `hrtime.bigint()` e não `Date.now()`: os payloads baratos medem abaixo de 1 ms, e a resolução
 * de milissegundo inteiro devolveria uma coluna de zeros indistinguíveis.
 */
function cronometrar(fn, n, aquecimento) {
  return cronometrarIntercalado([fn], n, aquecimento)[0];
}

/**
 * Cronometra VÁRIAS funções INTERCALADAS: rodada 1 mede todas uma vez, rodada 2 mede todas de
 * novo, e assim por diante. Devolve um vetor de amostras por função.
 *
 * A INTERCALAÇÃO NÃO É ENFEITE, e foi acrescentada depois de medir sem ela. Medindo cada payload
 * em bloco — as 20 amostras de um, depois as 20 do seguinte —, tudo que a máquina fizer durante o
 * bloco entra na conta daquele payload: escalonamento de frequência, antivírus, o cliente de
 * sincronização acordando. Observado nesta máquina, com blocos: o piso da plataforma variou de
 * 378 ms para 316 ms entre duas execuções da MESMA medição, e um payload de `spawn` chegou a
 * medir 163 ms — abaixo do piso do mesmo processo, que é impossível e denuncia o método, não o
 * harness. Intercalando, a deriva se espalha por todos os payloads em vez de se concentrar em
 * quem teve o azar de estar rodando na hora.
 *
 * O aquecimento continua por função e vem todo antes: ele existe para pagar carga de módulo e
 * cache de diretório, que não se repetem.
 */
function cronometrarIntercalado(fns, n, aquecimento) {
  for (const fn of fns) for (let i = 0; i < aquecimento; i++) fn();
  const amostras = fns.map(() => []);
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < fns.length; k++) {
      const t0 = process.hrtime.bigint();
      fns[k]();
      const t1 = process.hrtime.bigint();
      amostras[k].push(Number(t1 - t0) / 1e6);
    }
  }
  return amostras;
}

function tabela(titulo, linhas, colunas) {
  console.log('');
  console.log(titulo);
  const larguras = colunas.map((c, i) =>
    Math.max(c.length, ...linhas.map((l) => String(l[i]).length)));
  const linha = (celulas) =>
    '  ' + celulas.map((c, i) => String(c).padEnd(larguras[i])).join('  ');
  console.log(linha(colunas));
  console.log('  ' + larguras.map((w) => '-'.repeat(w)).join('  '));
  for (const l of linhas) console.log(linha(l));
}

// ————————————————————————————— os sete payloads —————————————————————————————

/**
 * `file_path` ABSOLUTO em todos os payloads de escrita, porque é a forma que o Claude Code manda
 * de verdade — e porque `relativizarComRecuo` faz trabalho diferente (e mensurável) sobre caminho
 * absoluto e relativo. Medir com caminho relativo mediria um payload que a plataforma não emite.
 */
function payloads(raiz) {
  return [
    {
      nome: 'write-explore',
      rotulo: 'escrita em `outputs/explore/`',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: join(raiz, 'outputs', 'explore', 'hld-funcional.md'), content: '# hld' },
      },
    },
    {
      nome: 'write-spec-fora-whitelist',
      rotulo: 'escrita em `outputs/spec/` fora da whitelist',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: join(raiz, 'outputs', 'spec', 'requirements', 'requirements.md'), content: '# rf' },
      },
    },
    {
      nome: 'write-zona-imutavel',
      rotulo: 'escrita na zona imutável',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: join(raiz, '.claude', 'hooks', 'kit.mjs'), content: '// nope' },
      },
    },
    {
      nome: 'skill',
      rotulo: 'invocação de skill (`spec-data-model`)',
      payload: { tool_name: 'Skill', tool_input: { skill: 'spec-data-model' } },
    },
    {
      nome: 'bash-nao-git',
      rotulo: 'comando `Bash` não-git (`ls -la`)',
      payload: { tool_name: 'Bash', tool_input: { command: 'ls -la' } },
    },
    // ——— OS DOIS QUE A LISTA DO PLANO NÃO TEM ———
    {
      nome: 'bash-git-status',
      rotulo: '`Bash` `git status` (dispensado pela pré-passagem)',
      payload: { tool_name: 'Bash', tool_input: { command: 'git status' } },
    },
    {
      nome: 'bash-git-push',
      rotulo: '`Bash` `git push origin feat/us-1`',
      payload: { tool_name: 'Bash', tool_input: { command: 'git push origin feat/us-1' } },
    },
  ];
}

// ————————————————————————————— grandeza 1: piso da plataforma —————————————————————————————

/**
 * Piso da plataforma: `spawnSync` de um `.mjs` que só sai. Nenhuma otimização do harness desce
 * daqui, e é o número que tornou o orçamento antigo de 200 ms agregados impossível de cumprir.
 *
 * MEDIDO NOS DOIS LUGARES, porque "a pasta sincronizada custa X" é afirmação testável e este
 * projeto já a carregou sem teste. Resultado, 5 varreduras: a diferença entre dentro e fora do
 * OneDrive ficou em −54,4 a +18,1 ms e TROCOU DE SINAL — indistinguível do ruído nesta máquina,
 * contra os ~114 ms que o registro anterior afirmava. A sonda fica no medidor justamente para que
 * a próxima pessoa possa refutá-la de novo em vez de herdá-la.
 *
 * Devolve as SONDAS, não as amostras: quem cronometra é a varredura única do `main`, porque o
 * piso só é subtraível do ponta a ponta se os dois forem medidos sob a mesma máquina. Ver
 * `SONDAS INTERCALADAS`, no `main`.
 */
function prepararPiso() {
  const tmp = mkdtempSync(join(tmpdir(), 'bench-piso-'));
  const fora = join(tmp, 'vazio.mjs');
  const dentro = join(RAIZ, '.bench-piso-vazio.mjs');
  writeFileSync(fora, 'process.exit(0)\n');
  writeFileSync(dentro, 'process.exit(0)\n');
  return {
    sondaFora: () => spawnSync(process.execPath, [fora], { cwd: tmp }),
    sondaDentro: () => spawnSync(process.execPath, [dentro], { cwd: RAIZ }),
    limpar() {
      try { rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ }
      try { rmSync(dentro, { force: true }); } catch { /* noop */ }
    },
  };
}

// ————————————————————————————— grandeza 3: ponta a ponta —————————————————————————————

function pontaAPonta(payload) {
  return spawnSync(process.execPath, [DESPACHANTE], {
    cwd: RAIZ,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

// ————————————————————————————— Step 2: a curva do `inventariar` —————————————————————————————

/**
 * Projeto maduro sintético: `N` arquivos sob `outputs/spec/`, no formato de árvore que a
 * `spec-prototype` de fato produz (`prototype/node_modules/pkg-k/arquivo-j.js`).
 *
 * MEDE A CURVA, NÃO UM PONTO. O interessante não é "200 arquivos custam X"; é a partir de quantos
 * arquivos o orçamento estoura — e isso só uma curva responde. As cargas são construídas
 * INCREMENTALMENTE sobre o mesmo diretório: criar 8.000 arquivos três vezes custaria mais do que
 * a medição inteira.
 *
 * ONDE A ÁRVORE MORA É VARIÁVEL DA MEDIÇÃO, não detalhe (`--curva-raiz`, default `os.tmpdir()`).
 * O default fica FORA do OneDrive porque criar 8.000 arquivos numa pasta sincronizada mede o
 * sincronizador junto — mas é justamente por isso que a comparação importa: o projeto do consultor
 * mora numa pasta sincronizada, e um número medido só em disco local descreve uma máquina que
 * ninguém usa. Rode as duas e reporte as duas.
 *
 * A FORMA DA ÁRVORE TAMBÉM É VARIÁVEL, e por isso está sob flag (`--por-diretorio`, default 200).
 * O `inventariar` recursa por DIRETÓRIO: a mesma contagem de arquivos espalhada em muitas pastas
 * rasas paga um `readdirSync` a mais por pasta, e um `node_modules` real tem milhares delas. Sem
 * essa flag, a curva descreveria uma árvore que nenhum projeto tem, e a diferença iria para a
 * prosa como ressalva não medida — que é a forma que este projeto não aceita.
 *
 * O REGISTRO É MONTADO SOBRE UM `io` COM `cwd` TROCADO, e não com `process.chdir`. `criarRegistro`
 * existe exatamente para isso; `chdir` num medidor que também mede o repo real trocaria o chão
 * debaixo das outras medições.
 */
function medirCurva(cargas, n, aquecimento, onde = tmpdir(), porDiretorio = 200) {
  const raizTmp = mkdtempSync(join(onde, 'bench-maduro-'));
  const alvo = join(raizTmp, 'outputs', 'spec', 'prototype', 'node_modules');
  mkdirSync(alvo, { recursive: true });
  mkdirSync(join(raizTmp, 'outputs', 'explore'), { recursive: true });

  const registro = criarRegistro({ ...IO_REAL, cwd: () => raizTmp });
  const alvoPayload = { tool_name: 'Skill', tool_input: { skill: 'spec-data-model' } };

  const resultados = [];
  let criados = 0;
  try {
    // Carga 0 primeiro: o `outputs/spec/` recém-criado, sem arquivo nenhum. É a referência da
    // curva — sem ela não se sabe quanto do custo é o passeio e quanto é o volume.
    for (const carga of [0, ...cargas]) {
      while (criados < carga) {
        const pacote = join(alvo, `pkg-${Math.floor(criados / porDiretorio)}`);
        if (criados % porDiretorio === 0) mkdirSync(pacote, { recursive: true });
        writeFileSync(join(pacote, `arquivo-${criados % porDiretorio}.js`), 'module.exports = {}\n');
        criados++;
      }
      const amostras = cronometrar(() => despachar(alvoPayload, registro), n, aquecimento);
      resultados.push({ carga, ...resumir(amostras) });
    }
  } finally {
    try { rmSync(raizTmp, { recursive: true, force: true }); } catch { /* noop */ }
  }
  return resultados;
}

// ————————————————————————————— main —————————————————————————————

function argNumero(argv, flag, padrao) {
  const i = argv.indexOf(flag);
  if (i === -1 || !argv[i + 1]) return padrao;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : padrao;
}

function argTexto(argv, flag, padrao) {
  const i = argv.indexOf(flag);
  return i === -1 || !argv[i + 1] ? padrao : argv[i + 1];
}

function argLista(argv, flag, padrao) {
  const i = argv.indexOf(flag);
  if (i === -1 || !argv[i + 1]) return padrao;
  const v = argv[i + 1].split(',').map(Number).filter((x) => Number.isFinite(x) && x > 0);
  return v.length ? v : padrao;
}

function main(argv) {
  const n = argNumero(argv, '--repeticoes', 20);
  const aquecimento = argNumero(argv, '--aquecimento', 3);
  const cargas = argLista(argv, '--curva', [200, 2000, 8000]);
  const curvaRaiz = argTexto(argv, '--curva-raiz', tmpdir());
  const porDiretorio = argNumero(argv, '--por-diretorio', 200);

  // A MÁQUINA FAZ PARTE DO NÚMERO, e o plano manda registrá-la porque o número não é transferível
  // sem ela.
  //
  // A LINHA `sincronizada` É REGISTRO, NÃO EXPLICAÇÃO — e isto foi medido, não suposto. Cinco
  // varreduras nesta máquina puseram a diferença entre o piso dentro e fora do OneDrive em
  // −54,4 a +18,1 ms, TROCANDO DE SINAL: o custo da pasta sincronizada não é distinguível do
  // ruído aqui. O registro anterior deste projeto falava em ~114 ms; não reproduz. Registre a
  // linha assim mesmo — ela é condição do experimento —, mas não a use para explicar diferença
  // nenhuma sem medir de novo.
  const sincronizada = /OneDrive|Dropbox|Google Drive|iCloud/i.test(RAIZ);
  console.log('# bench.mjs — orçamento de latência (Decisão 14)');
  console.log('');
  console.log(`  máquina         ${hostname()} — ${cpus().length} núcleos lógicos, ` +
    `${Math.round(totalmem() / 1024 / 1024 / 1024)} GB RAM`);
  console.log(`  plataforma      ${process.platform} ${process.arch}, Node ${process.version}`);
  console.log(`  raiz            ${RAIZ}`);
  console.log(`  sincronizada    ${sincronizada ? 'SIM (OneDrive)' : 'não'}`);
  console.log(`  amostras        ${n} por payload (${aquecimento} de aquecimento, descartadas)`);
  console.log(`  orçamento       ${ORCAMENTO_MS} ms de trabalho do harness por despachante`);

  if (!existsSync(join(RAIZ, '.claude', 'hooks', 'kit.mjs'))) {
    console.log('');
    console.log('  AVISO: a raiz deduzida não parece a do harness. Os números abaixo não valem.');
  }

  // ————————————————————————— SONDAS INTERCALADAS —————————————————————————
  //
  // AS TRÊS GRANDEZAS SÃO MEDIDAS NA MESMA VARREDURA, e isto foi aprendido errando. Medidas em
  // blocos — as N amostras da grandeza 2, depois as da 1, depois as da 3 — cada bloco herda a
  // condição da máquina no minuto em que rodou, e o resultado foram DUAS impossibilidades
  // físicas na saída do próprio medidor:
  //
  //   - o piso da plataforma (639,7 ms) medindo MAIS que o despachante inteiro ponta a ponta
  //     (396,3 ms), sendo que o segundo faz tudo que o primeiro faz e mais um pouco;
  //   - o push medindo 2209 ms em processo e 1199 ms ponta a ponta, na mesma execução.
  //
  // Nenhuma das duas é sobre o harness; as duas são sobre o método. Com uma varredura só, o piso
  // e o ponta a ponta veem a mesma máquina, e a subtração `ponta a ponta − piso` passa a
  // significar alguma coisa. É o ÚNICO jeito de a coluna "menos o piso" não ser ficção.
  const casos = payloads(RAIZ);
  const piso = prepararPiso();
  const sondas = [
    ...casos.map((c) => () => despachar(c.payload, REGISTRO)),  // grandeza 2
    piso.sondaDentro, piso.sondaFora,                            // grandeza 1
    ...casos.map((c) => () => pontaAPonta(c.payload)),           // grandeza 3
  ];

  let amostras;
  try { amostras = cronometrarIntercalado(sondas, n, aquecimento); }
  finally { piso.limpar(); }

  const k = casos.length;
  const harness = casos.map((c, i) => ({ caso: c, ...resumir(amostras[i]) }));
  const pisoDentro = resumir(amostras[k]);
  const pisoFora = resumir(amostras[k + 1]);
  const e2e = casos.map((c, i) => ({ caso: c, ...resumir(amostras[k + 2 + i]) }));

  tabela(
    `## Grandeza 2 — trabalho do harness (em processo, \`despachar\`). ORÇAMENTO: ${ORCAMENTO_MS} ms`,
    harness.map((r) => [
      r.caso.rotulo,
      ms(r.mediana),
      ms(r.p95),
      `${ms(r.min)}–${ms(r.max)}`,
      r.mediana <= ORCAMENTO_MS ? 'dentro' : 'ESTOURA',
    ]),
    ['payload', 'mediana', 'p95', 'faixa', 'veredito'],
  );

  // ——— Grandeza 1: piso da plataforma. Fato observado, sem meta. ———
  tabela(
    '## Grandeza 1 — piso da plataforma (`spawnSync` de script vazio). Fato observado, sem meta',
    [
      ['dentro da pasta sincronizada (o repo)', ms(pisoDentro.mediana), ms(pisoDentro.p95), `${ms(pisoDentro.min)}–${ms(pisoDentro.max)}`],
      ['fora de pasta sincronizada (`os.tmpdir()`)', ms(pisoFora.mediana), ms(pisoFora.p95), `${ms(pisoFora.min)}–${ms(pisoFora.max)}`],
    ],
    ['onde', 'mediana', 'p95', 'faixa'],
  );
  console.log(`  custo da pasta sincronizada: ${ms(pisoDentro.mediana - pisoFora.mediana)} ms de mediana`);

  // ——— Grandeza 3: ponta a ponta. Fato observado; subtraia o piso para ver o que é nosso. ———
  tabela(
    '## Grandeza 3 — ponta a ponta (`spawnSync` do despachante, payload no stdin). Fato observado',
    e2e.map((r) => [
      r.caso.rotulo,
      ms(r.mediana),
      ms(r.p95),
      `${ms(r.min)}–${ms(r.max)}`,
      ms(r.mediana - pisoDentro.mediana),
    ]),
    ['payload', 'mediana', 'p95', 'faixa', 'menos o piso'],
  );

  // ——— Step 2: a curva do `inventariar` num projeto maduro. ———
  const curva = medirCurva(cargas, n, aquecimento, curvaRaiz, porDiretorio);
  tabela(
    `## Curva do \`inventariar\` — projeto maduro sintético, payload \`Skill\` (\`cadeia\`)\n` +
    `   árvore em: ${curvaRaiz}` +
    (/OneDrive|Dropbox|Google Drive|iCloud/i.test(curvaRaiz) ? '  (SINCRONIZADA)' : '  (disco local)') +
    `, ${porDiretorio} arquivos por diretório`,
    curva.map((r) => [
      String(r.carga),
      ms(r.mediana),
      ms(r.p95),
      `${ms(r.min)}–${ms(r.max)}`,
      r.mediana <= ORCAMENTO_MS ? 'dentro' : 'ESTOURA',
    ]),
    ['arquivos sob `outputs/spec/`', 'mediana', 'p95', 'faixa', 'veredito'],
  );

  const estouram = harness.filter((r) => r.mediana > ORCAMENTO_MS);
  console.log('');
  if (estouram.length) {
    console.log(`## Estouram o orçamento: ${estouram.map((r) => r.caso.nome).join(', ')}`);
    console.log('   Isto é ACHADO, não tarefa. A escada de degradação está no plano, e subir');
    console.log('   degrau é decisão do usuário — dois dela já foram subidos.');
  } else {
    console.log('## Nenhum payload desta lista estoura o orçamento.');
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main(process.argv.slice(2));
}
