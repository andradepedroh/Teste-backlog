// Harness Elo v2 — Validação independente de uma task, com correção e revalidação. Casca de I/O.
//
// O passo G3 da `spec-implement`. Este script é uma máquina de estados e é ELE que decide: roda o
// que é determinístico, escolhe os validadores, confere as evidências, calcula o veredito e diz a
// próxima ação. O agente que orquestra só executa a ação impressa e chama `avancar` de novo — ele
// não interpreta achado nenhum, e os recortes de código nunca passam pelo contexto dele.
//
//   node .claude/ferramentas/validar.mjs linha-de-base --task TASK-014 [--repo <pasta do código>]
//        [--cmd-testes "<cmd>"] [--cmd-cobertura "<cmd>"] [--cmd-lint "<cmd>"] [--cmd-build "<cmd>"]
//        [--shell auto|bash|cmd|powershell] [--saida <arquivo>]
//   node .claude/ferramentas/validar.mjs iniciar --task TASK-014 [--tasks outputs/spec/tasks.json]
//        [--repo <pasta do código>] [--base HEAD] [--linha-de-base <arquivo>] [--cmd-testes "<cmd>"]
//        [--cmd-cobertura "<cmd>"] [--cmd-lint "<cmd>"] [--cmd-build "<cmd>"] [--rodadas 3]
//        [--shell auto|bash|cmd|powershell] [--sem-externas] [--sem-agentes]
//        [--regras-frontend auto|sim|nao]
//   node .claude/ferramentas/validar.mjs avancar --task TASK-014 [--tokens agente=N,agente=N]
//
// Cada chamada imprime UMA linha JSON: `linha-de-base`, `validar`, `corrigir`, `fim` ou `parar`.
// Estado em `outputs/spec/validacao/<TASK>/` (efêmero, limpo a cada `iniciar`); linha de base em
// `outputs/spec/validacao/<TASK>.linha-de-base.json`; relatório em
// `outputs/spec/auditorias/<TASK>.validacao.json`.
//
// `linha-de-base` (item 13.1, 2026-10-21) roda os comandos do projeto ANTES de a task escrever código
// e guarda como saíram. O `iniciar --linha-de-base` compara com ela: a falha que já existia não
// bloqueia (vai para `preExistentes` no relatório); a falha nova bloqueia, como sempre.
//
// `--sem-agentes` (Kiro, ou ferramenta sem subagente): só a parte determinística — comandos, varredura
// e mensagens — decide; nenhuma ação dispara agente, e o `corrigir` é para o próprio agente da sessão.
//
// `--shell` (item 13.3): no Windows os comandos rodam no Git Bash quando ele existe — o mesmo shell em
// que o agente rodou o G2 —, e não no `cmd.exe`, onde `./mvnw test` e `CI=true npm test` falham sempre.
// Fora do Windows, `auto` é o `/bin/sh` de sempre. O relatório registra o shell usado.
//
// Os comandos do projeto (testes, cobertura, lint, build) e as ferramentas externas podem levar
// minutos. O `estado.json` é gravado ANTES deles: se o processo cair (timeout da ferramenta de shell),
// rodar `avancar` de novo retoma do ponto em que parou.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, posix, relative, resolve, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parsearDiff, arquivoNovo, linhasAcrescentadas, renderizar, linhasMudadas } from './validacao/diff.mjs';
import { localizarTask, perguntasDeNegocio, mensagensDeErro, temRegraDeNegocio } from './validacao/task.mjs';
import { classificar, escolherDimensoes } from './validacao/roteador.mjs';
import { rodarComando, checarMensagens, registroDeBase } from './validacao/deterministico.mjs';
import { conferirEvidencia, validarResultado, MINIMO_TRECHO } from './validacao/conferencia.mjs';
import { consolidar } from './validacao/consolidar.mjs';
import { violacoes, mudadosEntre } from './validacao/guarda.mjs';
import { decidir, juntarLotes, resolvidasEntre, RODADAS_MAXIMAS } from './validacao/ciclo.mjs';
import { montarLotes, textoParaValidador, textoParaCorretor } from './validacao/entrada.mjs';
import { trechosDeRules, regrasFrontendNextEmVigor } from './validacao/rules.mjs';
import { varrer, lerSemgrep, lerGitleaks, soNasLinhasNovas } from './validacao/varredura.mjs';

/**
 * As rules moram no HARNESS, não no repositório validado — o código pode estar em outro repositório,
 * sem `.claude/`. A raiz é a deste arquivo (`.claude/ferramentas/validar.mjs` → dois níveis acima).
 */
const RAIZ_DO_HARNESS = fileURLToPath(new URL('../../', import.meta.url));
const DISCO_DO_HARNESS = {
  ler: (rel) => { try { return readFileSync(join(RAIZ_DO_HARNESS, rel), 'utf8'); } catch { return ''; } },
  listar: (rel) => {
    try { return readdirSync(join(RAIZ_DO_HARNESS, rel), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name); } catch { return []; }
  },
};

export const LIMITE_LOTE = 40_000;

/** O que cada validador lê. Recorte que não interessa à dimensão é token gasto à toa. */
export const CLASSES_POR_DIMENSAO = {
  'regras-negocio': ['codigo', 'teste'],
  testes: ['teste', 'codigo'],
  seguranca: ['codigo', 'config'],
  performance: ['codigo'],
  observabilidade: ['codigo'],
  'rules-tecnicas': ['codigo', 'estilo'],
};

/** As dimensões que respondem uma verificação por pergunta da task. */
const DIMENSOES_COM_PERGUNTAS = ['regras-negocio', 'testes'];

/**
 * A dimensão cuja saída é SÓ verificação (não reporta achado). Na revalidação, sem pergunta reaberta
 * nem item aberto ela não tem o que dizer, e não é chamada — medido na calibração da Fase 1: a
 * chamada da rodada 3 custou ~13 mil tokens para responder "nada a verificar".
 */
const SO_PERGUNTAS = ['regras-negocio'];

// Especificação e maquinário não são código da entrega: ficam fora do recorte e da busca.
const FORA_DO_CODIGO = (p) => /^(outputs|\.claude)\//.test(p);
const barra = (p) => String(p).replace(/\\/g, '/');

// ————————————————————————————— git, disco, comandos —————————————————————————————

/**
 * `core.quotePath=false` em TODA chamada: sem ele, o git devolve `"src/a\303\247\303\243o.js"` para
 * nome com acento, e o caminho com aspas não casa com nada — o achado daquele arquivo sumia. Nome com
 * `"` ou `\` ainda vem entre aspas; o `parsearDiff` desfaz (`desaspar`), e o resto usa `-z`.
 */
function git(repo, args, permitir = [0]) {
  const r = spawnSync('git', ['-c', 'core.quotePath=false', '-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (!permitir.includes(r.status)) throw new Error(`git ${args[0]} falhou: ${(r.stderr || '').trim()}`);
  return r.stdout;
}

/** `abs` está dentro de `pai` (ou é ele)? */
function dentroDe(pai, abs) {
  const r = relative(resolve(pai), resolve(abs));
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
}

/**
 * `--repo` pode ser uma SUBPASTA do repositório git (monorepo). Todo caminho que o script usa é
 * relativo a ela — o leitor, a conferência, o corretor e o relatório resolvem a partir do `--repo`.
 * O git não concorda sozinho: `git diff` e `git status` devolvem caminhos relativos à RAIZ do
 * repositório, e `ls-files --others` relativos à pasta atual. Até 2026-10-21 (item 13.11) isso anulava
 * a varredura em silêncio: o achado em `apps/api/src/x.js` era procurado em `apps/api/apps/api/...`,
 * caía como "arquivo não encontrado", e a task saía APROVADA.
 *
 * `prefixoDoRepo` é o caminho da subpasta a partir da raiz (`apps/api/`, ou `''` na raiz), e
 * `doTopoParaRepo` traz um caminho da raiz para o `--repo` — com `../` quando ele está fora dela.
 */
function prefixoDoRepo(repo) {
  try { return git(repo, ['rev-parse', '--show-prefix']).trim(); } catch { return ''; }
}
const doTopoParaRepo = (prefixo, p) => (prefixo ? posix.relative(prefixo.replace(/\/$/, ''), barra(p)) : barra(p));
/** A raiz do repositório git, na MESMA forma do `--repo` (o `--show-toplevel` devolve o nome longo, e o `--repo` pode vir no curto do Windows). */
const topoDoRepo = (repo, prefixo) => resolve(repo, ...prefixo.split('/').filter(Boolean).map(() => '..'));

/**
 * O que mudou em relação à `base`: rastreados pelo `git diff` (árvore de trabalho incluída) e os novos.
 * `--relative`: caminhos relativos ao `--repo` e só o que está dentro dele (ver `prefixoDoRepo`).
 */
export function coletarMudancas(repo, base) {
  const diff = git(repo, ['diff', '--relative', '-U15', '--no-color', '--no-ext-diff', '--no-renames', base, '--']);
  const itens = parsearDiff(diff).filter((i) => !FORA_DO_CODIGO(i.arquivo));
  const novos = git(repo, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  for (const p of novos.filter((n) => !FORA_DO_CODIGO(barra(n)))) {
    const buf = readFileSync(join(repo, p));
    itens.push(buf.includes(0)
      ? { arquivo: barra(p), novo: true, removido: false, binario: true, trechos: [] }
      : arquivoNovo(barra(p), buf.toString('utf8')));
  }
  return itens;
}

const hashDe = (abs) => {
  try { return existsSync(abs) ? createHash('sha256').update(readFileSync(abs)).digest('hex') : 'removido'; } catch { return 'ilegivel'; }
};

// O que a sessão escreve sozinha em `.claude/` sem ser régua: aprovar uma permissão grava o
// `settings.local.json`; o Claude Code cria `worktrees/` para agente isolado.
const FORA_DA_FOTO = new Set(['node_modules', '.git', 'worktrees', 'settings.local.json']);

/** Os arquivos de `pasta`, relativos a ela, menos o que `pular(abs)` recusa. */
function arquivosDe(pasta, pular) {
  const saida = [];
  const andar = (dir, rel) => {
    let entradas = [];
    try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (FORA_DA_FOTO.has(e.name)) continue;
      const abs = join(dir, e.name);
      if (pular(abs)) continue;
      if (e.isDirectory()) andar(abs, `${rel}${e.name}/`);
      else if (e.isFile()) saida.push(`${rel}${e.name}`);
    }
  };
  andar(pasta, '');
  return saida;
}

/**
 * `{caminho: hash}` do que pode mudar durante uma rodada — é contra ela que a guarda sabe o que um
 * agente mexeu:
 *
 * - no repositório do código, o que o git vê como alterado ou novo (o resto é igual ao commit);
 * - com `raiz` (a do harness), TODO arquivo de `outputs/spec/` e de `.claude/` dela, com o prefixo
 *   `harness:`. O harness e o código podem ser repositórios diferentes (`--repo`): o `git status` do
 *   código não vê o `tasks.json` nem as rules, e o corretor tem Bash. Fica de fora a pasta de
 *   trabalho (`trabalho`), onde os agentes gravam por desenho;
 * - `tasks`, o `tasks.json` da task, onde quer que esteja (`--tasks` pode apontar para fora).
 *
 * LIMITE: arquivo IGNORADO pelo git no repositório do código (`.env`, `dist/`) não entra — o `git
 * status` não o lista, e varrer o repositório inteiro a cada `avancar` custaria mais do que protege.
 * Um agente que mexa só ali passa pela guarda; o comando de testes e a revisão do PR seguem valendo.
 *
 * Com o `--repo` numa subpasta, o `git status` olha o repositório INTEIRO e os caminhos vêm relativos
 * ao `--repo` (`../web/x.js` para o vizinho): o corretor que mexe fora da subpasta continua visível.
 * O que está em `outputs/spec/` e `.claude/` do harness vem só pela parte `harness:`, que tem as
 * exclusões certas (pasta de trabalho, `settings.local.json`) — pelo `git status` chegaria de novo,
 * sem elas, quando harness e código dividem o repositório.
 */
export function fotografia(repo, { raiz = null, trabalho = null, tasks = null } = {}) {
  const mapa = {};
  const prefixo = prefixoDoRepo(repo);
  const daRegua = (abs) => !!raiz && (dentroDe(join(raiz, 'outputs', 'spec'), abs) || dentroDe(join(raiz, '.claude'), abs));
  for (const e of git(repo, ['status', '--porcelain=v1', '-uall', '-z', '--no-renames', '--', ':/']).split('\0').filter(Boolean)) {
    const p = doTopoParaRepo(prefixo, e.slice(3));
    const abs = join(repo, p);
    if (daRegua(abs)) continue;
    mapa[p] = hashDe(abs);
  }
  if (raiz) {
    const pular = (abs) => !!trabalho && dentroDe(trabalho, abs);
    for (const pasta of ['outputs/spec', '.claude']) {
      for (const rel of arquivosDe(join(raiz, pasta), pular)) mapa[`harness:${pasta}/${rel}`] = hashDe(join(raiz, pasta, rel));
    }
  }
  if (tasks) mapa[raiz && dentroDe(raiz, tasks) ? `harness:${barra(relative(raiz, tasks))}` : `tasks:${barra(resolve(tasks))}`] = hashDe(tasks);
  return mapa;
}

const fotografar = (estado) => fotografia(estado.repo, { raiz: estado.raiz, trabalho: estado.trabalho, tasks: estado.tasks });

/** `git grep` com `-z`: `arquivo\0linha\0texto` — o nome com `:` ou acento não quebra o parser. */
const buscador = (repo) => (texto) =>
  git(repo, ['grep', '-z', '-n', '-I', '-F', '--untracked', '-e', texto, '--', '.', ':(exclude)outputs', ':(exclude).claude'], [0, 1])
    .split(/\r?\n/).filter(Boolean)
    .map((l) => l.split('\0')).filter((p) => p.length >= 3 && /^\d+$/.test(p[1]))
    .map(([arquivo, linha, ...resto]) => ({ arquivo: barra(arquivo), linha: Number(linha), texto: resto.join('\0') }));

// ————————————————————————————— o shell dos comandos do projeto (item 13.3) —————————————————————————————

/**
 * O bash do WSL (`System32\bash.exe`, o atalho em `WindowsApps`) NÃO é o Git Bash: ele roda o comando
 * dentro da distribuição Linux, sem o `node`, o `npm` e o JDK do Windows, e com o caminho traduzido.
 */
const BASH_DO_WSL = /[\\/]windows[\\/](system32|sysnative|syswow64)[\\/]|[\\/]windowsapps[\\/]/i;

/** `git --exec-path` (`C:/Program Files/Git/mingw64/libexec/git-core`), ou `null`. */
function gitExecPath() {
  try {
    const r = spawnSync('git', ['--exec-path'], { encoding: 'utf8', windowsHide: true });
    return r.status === 0 ? r.stdout.trim() : null;
  } catch { return null; }
}

/**
 * O Git Bash desta máquina, ou `null`. Na ordem: `EXEPATH` (o Git Bash o define, apontando para a
 * pasta do `bash.exe` ou para a raiz do Git), as pastas acima do `git --exec-path`, as instalações
 * padrão e o PATH. Do PATH, `usr\bin\bash.exe` cede lugar ao `bin\bash.exe` irmão quando ele existe: o
 * de `bin` é o lançador que monta o PATH do MSYS (`sed`, `grep` dos scripts). Os caminhos são montados
 * com `win32`: a função só serve ao Windows, e o teste dela roda em qualquer sistema.
 */
export function acharGitBash({ env = process.env, existe, execPathDoGit = gitExecPath } = {}) {
  const ok = (p) => !!p && !BASH_DO_WSL.test(p) && existe(p);
  // Gerador: o `git --exec-path` (um processo) só roda se o EXEPATH não respondeu.
  function* candidatos() {
    if (env.EXEPATH) {
      yield [win32.join(env.EXEPATH, 'bash.exe'), 'EXEPATH'];
      yield [win32.join(env.EXEPATH, 'bin', 'bash.exe'), 'EXEPATH'];
    }
    let d = execPathDoGit();
    for (let i = 0; d && i < 4; i += 1) { d = win32.dirname(d); yield [win32.join(d, 'bin', 'bash.exe'), 'git --exec-path']; }
    for (const v of ['ProgramW6432', 'ProgramFiles', 'ProgramFiles(x86)']) if (env[v]) yield [win32.join(env[v], 'Git', 'bin', 'bash.exe'), 'instalação padrão'];
    if (env.LOCALAPPDATA) yield [win32.join(env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'), 'instalação padrão'];
    for (const pasta of String(env.PATH ?? env.Path ?? '').split(';').filter(Boolean)) {
      if (/[\\/]usr[\\/]bin$/i.test(pasta.replace(/[\\/]+$/, ''))) yield [win32.join(pasta, '..', '..', 'bin', 'bash.exe'), 'PATH'];
      yield [win32.join(pasta, 'bash.exe'), 'PATH'];
    }
  }
  for (const [caminho, como] of candidatos()) if (ok(caminho)) return { caminho, como };
  return null;
}

const existeArquivo = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
export const SHELLS = ['auto', 'bash', 'cmd', 'powershell'];

/**
 * O shell dos comandos do projeto: `{nome, comando, motivo}`. `comando: null` é o `shell: true` do Node
 * (o `/bin/sh`, ou o `cmd.exe` no Windows). `opcao` é o `--shell`.
 */
export function escolherShell(opcao = 'auto', { plataforma = process.platform, env = process.env, existe = existeArquivo, execPathDoGit = gitExecPath } = {}) {
  const o = String(opcao || 'auto').toLowerCase();
  if (!SHELLS.includes(o)) throw new Error(`--shell ${opcao}: use ${SHELLS.join(', ')}`);
  if (plataforma !== 'win32') {
    if (o === 'auto') return { nome: 'sh', comando: null, motivo: 'padrão do sistema (/bin/sh)' };
    if (o === 'cmd') throw new Error('--shell cmd: o cmd.exe só existe no Windows');
    return o === 'bash' ? { nome: 'bash', comando: 'bash', motivo: '--shell bash' } : { nome: 'powershell', comando: 'pwsh', motivo: '--shell powershell' };
  }
  if (o === 'cmd') return { nome: 'cmd', comando: null, motivo: '--shell cmd' };
  if (o === 'powershell') return { nome: 'powershell', comando: 'powershell.exe', motivo: '--shell powershell' };
  const bash = acharGitBash({ env, existe, execPathDoGit });
  if (bash) return { nome: 'bash', comando: bash.caminho, motivo: `${o === 'bash' ? '--shell bash' : 'auto'}: Git Bash (achado por ${bash.como})` };
  if (o === 'bash') throw new Error('--shell bash: o Git Bash não foi encontrado (o bash.exe do WSL não serve) — instale o Git for Windows ou use --shell cmd');
  return { nome: 'cmd', comando: null, motivo: 'auto: o Git Bash não foi encontrado — cmd.exe' };
}

/**
 * Roda um comando do projeto no shell escolhido. O bash recebe `-c` sem `-l`: o login do MSYS faz
 * `cd $HOME` e o comando sairia da pasta do código. Estado antigo, sem `shell`, cai no `shell: true`.
 */
const executor = (repo, shell = null) => (comando) => {
  const opcoes = { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000, windowsHide: true };
  if (!shell || !shell.comando) return spawnSync(comando, { ...opcoes, shell: true });
  const args = shell.nome === 'powershell' ? ['-NoProfile', '-NonInteractive', '-Command', comando] : ['-c', comando];
  return spawnSync(shell.comando, args, opcoes);
};

/**
 * O leitor da conferência de evidência: SÓ arquivo do repositório do código. Caminho absoluto fora
 * dele, `../`, a especificação (`outputs/`, `.claude/`) e a raiz do harness devolvem `null` — a
 * evidência "não encontrada" cai. Antes, o leitor tentava a raiz do harness como segunda opção, e um
 * validador podia "provar" um CUMPRE citando a rule ou o `tasks.json`.
 */
export const leitorDoRepo = (repo, raiz = null) => (arquivo) => {
  if (typeof arquivo !== 'string' || !arquivo) return null;
  const abs = resolve(repo, arquivo);
  if (!dentroDe(repo, abs)) return null;
  if (FORA_DO_CODIGO(barra(relative(repo, abs)))) return null;
  if (raiz && resolve(raiz) !== resolve(repo) && dentroDe(raiz, abs) && !dentroDe(raiz, repo)) return null;
  if (raiz && (dentroDe(join(raiz, 'outputs'), abs) || dentroDe(join(raiz, '.claude'), abs))) return null;
  try { return statSync(abs).isFile() ? readFileSync(abs, 'utf8').split(/\r?\n/) : null; } catch { return null; }
};

const lerJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const gravarJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };
const caminhoEstado = (trabalho) => join(trabalho, 'estado.json');

// O estado mora na pasta de trabalho, que os agentes podem gravar, e ele guarda os comandos que o
// `avancar` executa com `shell:true`. Um validador (sem Bash, mas com Write) que reescrevesse o
// `estado.json` ganharia execução de comando e poderia forjar fase, rodada e veredito. O selo é o
// SHA-256 do texto gravado, num arquivo ao lado: quem não roda código não recalcula o hash. Contra o
// corretor, que tem Bash, o selo não protege — e ele já executa comando de qualquer forma.
const caminhoSelo = (trabalho) => join(trabalho, 'estado.sha256');
const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');
function gravarEstado(trabalho, estado) {
  gravarJson(caminhoEstado(trabalho), estado);
  writeFileSync(caminhoSelo(trabalho), `${sha256(readFileSync(caminhoEstado(trabalho), 'utf8'))}\n`);
}
function lerEstado(trabalho) {
  const texto = readFileSync(caminhoEstado(trabalho), 'utf8');
  const selo = existsSync(caminhoSelo(trabalho)) ? readFileSync(caminhoSelo(trabalho), 'utf8').trim() : '';
  if (selo !== sha256(texto)) {
    throw new Error(`o estado.json de ${trabalho} foi alterado fora do validar.mjs — o ciclo não continua; rode iniciar de novo`);
  }
  return JSON.parse(texto);
}

// ————————————————————————————— etapas —————————————————————————————

/** Task, perguntas e o que mudou — relido a cada rodada, porque a correção muda o código. */
function levantar(estado) {
  const par = localizarTask(lerJson(estado.tasks), estado.task);
  if (!par) throw new Error(`a task ${estado.task} não está em ${estado.tasks}`);
  return { par, perguntas: perguntasDeNegocio(par), mudancas: coletarMudancas(estado.repo, estado.base) };
}

/**
 * O executável de `nome` no PATH, ou `null`. No Windows, o `npm`/`pip`/`scoop` instalam a ferramenta
 * como shim `.cmd` ou `.bat`, que o `spawnSync` sem shell não executa (EINVAL desde o Node 18.20):
 * procurar só pelo nome dava "não instalado" com a ferramenta instalada. `shell: true` diz que o
 * executável precisa do `cmd.exe`.
 */
export function procurarNoPath(nome, env = process.env, plataforma = process.platform) {
  const windows = plataforma === 'win32';
  const pastas = String(env.PATH ?? env.Path ?? '').split(windows ? ';' : ':').filter(Boolean);
  const extensoes = windows ? String(env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map((e) => e.toLowerCase()) : [''];
  for (const pasta of pastas) {
    for (const ext of extensoes) {
      const comando = join(pasta, `${nome}${ext}`);
      try { if (statSync(comando).isFile()) return { comando, shell: windows && /^\.(cmd|bat)$/.test(ext) }; } catch { /* não está nesta pasta */ }
    }
  }
  return null;
}

// Para o `cmd.exe`: cada argumento entre aspas, com a aspa interna dobrada.
const aspasCmd = (a) => `"${String(a).replace(/"/g, '""')}"`;

/** Roda a ferramenta achada por `procurarNoPath`, com shell só quando o shim exige. */
function executarFerramenta(_nome, args, { ferramenta, cwd, timeout }) {
  const opcoes = { cwd, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 };
  return ferramenta.shell
    ? spawnSync([ferramenta.comando, ...args].map(aspasCmd).join(' '), { ...opcoes, shell: true })
    : spawnSync(ferramenta.comando, args, opcoes);
}

/** A ferramenta está instalada e responde a `--version`? Ausente não é falha: a varredura própria continua valendo. */
function localizarFerramenta(nome) {
  const ferramenta = procurarNoPath(nome);
  if (!ferramenta) return null;
  const r = executarFerramenta(nome, ['--version'], { ferramenta, cwd: process.cwd(), timeout: 30_000 });
  return !r.error && r.status === 0 ? ferramenta : null;
}

const MINUTOS_EXTERNAS = 10 * 60 * 1000;

/**
 * Semgrep e gitleaks, quando instalados, sobre os arquivos que a entrega mudou. O que acharem fora das
 * linhas acrescentadas é dívida anterior e fica de fora. A saída vai por arquivo na pasta de trabalho,
 * não por stdout, para não depender do tamanho do buffer — UM arquivo por ferramenta, apagado antes:
 * com a saída compartilhada, o gitleaks que caía sem gravar lia o relatório do Semgrep e dizia "rodou".
 *
 * O `gitleaks dir` aceita UM caminho só, e apontado para o repositório ele varria tudo, `node_modules`
 * incluído. Ele roda numa CÓPIA temporária só com os arquivos da entrega (fora do repositório, para o
 * test runner não achá-la; apagada no fim), e o caminho do relatório volta para o do repositório.
 *
 * `localizar` e `executar` são injetáveis para o teste não depender da ferramenta instalada.
 */
export function rodarExternas(estado, mudancas, { localizar = localizarFerramenta, executar = executarFerramenta } = {}) {
  const arquivos = mudancas.filter((m) => !m.removido && !m.binario).map((m) => m.arquivo);
  const linhas = (rel) => { try { return readFileSync(join(estado.repo, rel), 'utf8').split(/\r?\n/); } catch { return null; } };
  const achados = [];
  const situacao = {};
  mkdirSync(estado.trabalho, { recursive: true });
  if (!arquivos.length) return { achados, situacao };
  const saidaSemgrep = join(estado.trabalho, 'semgrep.json');
  const saidaGitleaks = join(estado.trabalho, 'gitleaks.json');
  for (const s of [saidaSemgrep, saidaGitleaks, join(estado.trabalho, 'externa.json')]) rmSync(s, { force: true });

  const semgrep = localizar('semgrep');
  if (semgrep) {
    const r = executar('semgrep', ['scan', '--config', 'p/owasp-top-ten', '--config', 'p/secrets', '--json', '--quiet', '--output', saidaSemgrep, ...arquivos],
      { ferramenta: semgrep, cwd: estado.repo, timeout: MINUTOS_EXTERNAS }) || {};
    try { achados.push(...lerSemgrep(lerJson(saidaSemgrep), linhas)); situacao.semgrep = 'rodou'; } catch { situacao.semgrep = `falhou (saída ${r.status})`; }
  } else situacao.semgrep = 'não instalado';

  const gitleaks = localizar('gitleaks');
  if (gitleaks) {
    const copia = mkdtempSync(join(tmpdir(), 'validar-gitleaks-'));
    try {
      for (const a of arquivos) {
        try { mkdirSync(dirname(join(copia, a)), { recursive: true }); copyFileSync(join(estado.repo, a), join(copia, a)); } catch { /* sumiu entre o diff e a cópia */ }
      }
      const r = executar('gitleaks', ['dir', copia, '--no-banner', '--redact', '--report-format', 'json', '--report-path', saidaGitleaks, '--exit-code', '0'],
        { ferramenta: gitleaks, cwd: estado.repo, timeout: MINUTOS_EXTERNAS }) || {};
      // O relatório traz o caminho na cópia (absoluto, ou relativo a ela ou ao cwd): volta para o do repositório.
      const deVolta = (f) => {
        const candidatos = isAbsolute(f) ? [f] : [resolve(estado.repo, f), join(copia, f)];
        const naCopia = candidatos.find((c) => dentroDe(copia, c));
        return naCopia ? relative(copia, naCopia) : f;
      };
      try { achados.push(...lerGitleaks(lerJson(saidaGitleaks), linhas, deVolta)); situacao.gitleaks = 'rodou (só nos arquivos da entrega)'; } catch { situacao.gitleaks = `falhou (saída ${r.status})`; }
    } finally {
      rmSync(copia, { recursive: true, force: true });
    }
  } else situacao.gitleaks = 'não instalado';
  return { achados: soNasLinhasNovas(achados, mudancas), situacao };
}

function rodarDeterministico(estado, { par, mudancas }) {
  const exec = executor(estado.repo, estado.shell);
  const base = (rotulo) => (estado.linhaDeBase && estado.linhaDeBase.usada ? (estado.linhaDeBase.comandos || {})[rotulo] || null : null);
  estado.comandos = Object.entries(estado.cmds)
    .map(([rotulo, cmd]) => rodarComando(rotulo, cmd, exec, { base: base(rotulo), repo: estado.repo })).filter(Boolean);
  estado.deterministico = checarMensagens(mensagensDeErro(par), buscador(estado.repo));
  const externas = estado.semExternas ? { achados: [], situacao: { externas: 'desligadas (--sem-externas)' } } : rodarExternas(estado, mudancas);
  estado.achadosDeterministicos = [...varrer(mudancas, { frontendNext: estado.frontendNext !== false }), ...externas.achados];
  estado.ferramentas = { varredura: 'rodou', regrasFrontend: estado.regrasFrontend, ...externas.situacao };
}

/**
 * A revalidação depois de uma correção (`incremental`) não refaz a dimensão inteira. Ela recebe só os
 * arquivos que a correção tocou e os que têm item em aberto, com as linhas mudadas marcadas, e as
 * perguntas que já estavam CUMPRE em arquivo que ninguém mexeu ficam resolvidas. O resultado novo se
 * junta ao anterior em `fecharValidacao`. Sem nada a rever, a dimensão nem é chamada.
 */
function prepararValidacao(estado, dimensoes, { par, perguntas, mudancas }, { incremental = false } = {}) {
  const pasta = join(estado.trabalho, `rodada-${estado.rodada}`);
  mkdirSync(pasta, { recursive: true });
  const agentes = [];
  const correcao = incremental ? estado.correcao || {} : null;
  estado.incremental = {};
  for (const dimensao of dimensoes) {
    const classes = CLASSES_POR_DIMENSAO[dimensao];
    let relevantes = mudancas.filter((m) => !m.removido && classes.includes(classificar(m.arquivo)));
    let perguntasDaDimensao = DIMENSOES_COM_PERGUNTAS.includes(dimensao) ? perguntas : [];
    let revalidacao = null;
    if (correcao) {
      const abertos = (estado.ultimoItens || []).filter((i) => i.dimensoes.includes(dimensao));
      const arquivos = new Set([...Object.keys(correcao), ...abertos.map((a) => a.arquivo).filter(Boolean)]);
      relevantes = relevantes.filter((m) => arquivos.has(m.arquivo));
      const anterior = new Map(((estado.resultados[dimensao] || {}).verificacoes || []).map((v) => [v.id, v]));
      const resolvida = (pg) => {
        const v = anterior.get(pg.id);
        return !!(v && v.veredito === 'CUMPRE' && v.evidencia && !(v.evidencia.arquivo in correcao));
      };
      const resolvidas = perguntasDaDimensao.filter(resolvida).map((pg) => pg.id);
      perguntasDaDimensao = perguntasDaDimensao.filter((pg) => !resolvida(pg));
      if (!perguntasDaDimensao.length && !abertos.length && (!relevantes.length || SO_PERGUNTAS.includes(dimensao))) continue;
      revalidacao = { abertos, resolvidas };
      estado.incremental[dimensao] = { reabertas: perguntasDaDimensao.map((pg) => pg.id), arquivos: [...arquivos] };
    }
    const blocos = relevantes.map((m) => renderizar(m, correcao && correcao[m.arquivo] ? new Set(correcao[m.arquivo]) : null));
    const lotes = blocos.length ? montarLotes(blocos, LIMITE_LOTE) : [''];
    const rules = trechosDeRules({ dimensoes: [dimensao], arquivos: relevantes.map((m) => m.arquivo), ...DISCO_DO_HARNESS });
    lotes.forEach((recorte, i) => {
      const sufixo = lotes.length > 1 ? `-${i + 1}` : '';
      const entrada = barra(join(pasta, `${dimensao}${sufixo}.md`));
      const resultado = barra(join(pasta, `resultado-${dimensao}${sufixo}.json`));
      // A revalidação de incertos reusa a pasta da rodada: o resultado velho ficaria lá, e um validador
      // que não gravasse nada seria lido com a resposta da vez anterior.
      rmSync(resultado, { force: true });
      writeFileSync(entrada, textoParaValidador({
        dimensao,
        task: par.task,
        perguntas: perguntasDaDimensao,
        revalidacao,
        jaVerificado: estado.deterministico.filter((v) => v.dimensao === dimensao),
        jaAchado: (estado.achadosDeterministicos || []).filter((a) => a.dimensoes.includes(dimensao)),
        recorte, lote: i + 1, totalLotes: lotes.length, rodada: estado.rodada, caminhoResultado: resultado,
        repo: barra(estado.repo), rules,
      }));
      agentes.push({ tipo: `validador-${dimensao}`, dimensao, entrada, resultado });
    });
  }
  Object.assign(estado, { fase: 'validar', esperados: agentes, lidos: {}, reenviou: false, perguntas: perguntas.map((p) => p.id) });
  // Nada a rever em dimensão nenhuma: o veredito sai do determinístico e do que já estava resolvido.
  if (!agentes.length) return fecharValidacao(estado);
  estado.chamadas += agentes.length;
  estado.fotografia = fotografar(estado);
  return {
    acao: 'validar',
    rodada: estado.rodada,
    agentes: agentes.map(({ tipo, entrada }) => ({ tipo, entrada })),
    instrucao: 'Dispare todos em paralelo, cada um com o prompt "Leia <entrada> e siga.". Depois rode avancar.',
  };
}

function prepararCorrecao(estado) {
  const grupo = estado.grupos[estado.grupoAtual];
  const pasta = join(estado.trabalho, `rodada-${estado.rodada}`);
  mkdirSync(pasta, { recursive: true });
  const n = estado.grupoAtual + 1;
  const entrada = barra(join(pasta, `corrigir-${n}.md`));
  const registro = barra(join(pasta, `corrigido-${n}.json`));
  const { par, mudancas } = levantar(estado);
  if (estado.grupoAtual === 0) guardarAntes(estado, mudancas);
  // Grupo sem arquivo (comando que falhou, NAO_CUMPRE sem evidência): o escopo é a ENTREGA — os
  // arquivos que a task já mudou —, não o repositório inteiro (item 13.2). Fica no grupo, dentro do
  // estado selado: é contra ele que a guarda confere a rodada.
  grupo.escopo = grupo.arquivos.length ? grupo.arquivos : mudancas.map((m) => m.arquivo);
  grupo.registro = registro;
  // O corretor escreve código: as rules técnicas valem sempre, e as de segurança quando há item dela.
  const dimensoesDoGrupo = new Set(grupo.itens.flatMap((it) => it.dimensoes || [it.dimensao]));
  const rules = trechosDeRules({
    dimensoes: ['rules-tecnicas', ...(dimensoesDoGrupo.has('seguranca') ? ['seguranca'] : [])],
    arquivos: grupo.escopo,
    ...DISCO_DO_HARNESS,
  });
  rmSync(registro, { force: true });
  writeFileSync(entrada, textoParaCorretor({
    task: par.task, grupo, numero: n, total: estado.grupos.length, rodada: estado.rodada, caminhoRegistro: registro,
    comandos: estado.cmds, repo: barra(estado.repo), rules, escopo: grupo.escopo,
  }));
  estado.fase = 'corrigir';
  estado.fotografia = fotografar(estado);
  // Sem subagente, quem corrige é o próprio agente da sessão — sob a mesma guarda de escopo.
  if (estado.semAgentes) {
    return {
      acao: 'corrigir', rodada: estado.rodada, grupo: n, de: estado.grupos.length, executor: 'sessao', entrada,
      instrucao: 'Sem subagente: leia <entrada> e corrija você mesmo, do jeito que ela pede (teste que falha antes, correção, teste que passa), só nos arquivos do escopo. Depois rode avancar.',
    };
  }
  estado.chamadas += 1;
  return {
    acao: 'corrigir', rodada: estado.rodada, grupo: n, de: estado.grupos.length, agente: 'corretor', entrada,
    instrucao: 'Dispare o corretor com o prompt "Leia <entrada> e siga.". Depois rode avancar.',
  };
}

/**
 * Uma cópia do código da entrega antes do primeiro grupo de correção da rodada. É contra ela que se
 * sabe quais linhas o corretor mudou — e é só nelas que a revalidação procura problema novo.
 *
 * NOMES NEUTROS (`1.antes`, `2.antes`…) com um `indice.json`, nunca a árvore com os nomes originais.
 * Medido na calibração da Fase 1: a pasta de trabalho mora dentro do repositório, e uma cópia
 * `antes/test/pedido.service.test.js` foi achada e executada pelo `node --test`, que falhou por não
 * achar os imports dela — e o comando de testes virou bloqueante falso.
 */
function guardarAntes(estado, mudancas) {
  const pasta = join(estado.trabalho, `rodada-${estado.rodada}`, 'antes');
  mkdirSync(pasta, { recursive: true });
  const indice = {};
  let n = 0;
  for (const m of mudancas) {
    if (m.removido || m.binario) continue;
    try {
      const nome = `${(n += 1)}.antes`;
      writeFileSync(join(pasta, nome), readFileSync(join(estado.repo, m.arquivo)));
      indice[m.arquivo] = nome;
    } catch { /* arquivo que sumiu entre o diff e a cópia: a revalidação o trata como novo */ }
  }
  gravarJson(join(pasta, 'indice.json'), indice);
  estado.antes = barra(pasta);
}

/** O conteúdo de `arquivo` na cópia de antes, ou `null` se ele não existia. */
function lerAntes(estado, arquivo) {
  if (!estado.antes) return null;
  try {
    const nome = lerJson(join(estado.antes, 'indice.json'))[arquivo];
    return nome ? readFileSync(join(estado.antes, nome), 'utf8') : null;
  } catch { return null; }
}

/** `{arquivo: [linhas mudadas]}` do que a correção da rodada tocou, contra a cópia de antes. */
function linhasDaCorrecao(estado, mudancas, mudados) {
  const tocados = new Set(mudados.map(barra).filter((p) => !FORA_DO_CODIGO(p)));
  const correcao = {};
  for (const m of mudancas) {
    if (m.removido || m.binario || !tocados.has(m.arquivo)) continue;
    const ler = (abs) => { try { return readFileSync(abs, 'utf8'); } catch { return null; } };
    const antes = lerAntes(estado, m.arquivo);
    const depois = ler(join(estado.repo, m.arquivo));
    if (depois === null) continue;
    const linhas = linhasMudadas(antes, depois);
    if (linhas.length) correcao[m.arquivo] = linhas;
  }
  return correcao;
}

/**
 * MÉDIO e BAIXO não são avaliados no G3 (decisão da Fase 1 de custo): os validadores são instruídos a
 * não reportá-los, e o pouco que vem é descartado sem lista. Até 2026-10-21 o relatório mostrava só um
 * contador (`ignorados`), perto de zero — e "0" lia-se como "nenhum achado médio", uma falsa segurança
 * (item 13.10). A `security.md` exige task SEC para MÉDIO; quem os procura é a `auditoria-de-us`.
 */
const MEDIO_E_BAIXO = {
  avaliadosNoG3: false,
  quemCobre: 'auditoria-de-us (Passo I: veredito APROVADA COM RESSALVAS, débito em gaps-document.md)',
  nota: 'MÉDIO e BAIXO não são avaliados no G3: os validadores não os reportam, e o que vier é descartado sem lista. Ausência de achado médio aqui não diz nada sobre o código.',
};
const MEDIO_E_BAIXO_CURTO = 'MÉDIO e BAIXO não são avaliados no G3 — quem os cobre é a auditoria-de-us';

/** O que vai para o relatório da linha de base: sem as listas de falha, que são longas. */
function resumoDaLinhaDeBase(lb) {
  if (!lb) return { usada: false, motivo: 'não informada (--linha-de-base): toda falha de comando bloqueia' };
  const { comandos = {}, ...resto } = lb;
  return { ...resto, comandos: Object.fromEntries(Object.entries(comandos).map(([r, c]) => [r, { comando: c.comando, codigo: c.codigo, linhasDeFalha: (c.falhas || []).length }])) };
}

/** Campos que todo relatório traz, do começo ao `parar` por violação. */
function camposDoCiclo(estado) {
  return {
    shell: estado.shell || null,
    linhaDeBase: resumoDaLinhaDeBase(estado.linhaDeBase),
    naoCorrigidos: estado.naoCorrigidos || [],
    editadosPeloCorretor: estado.editadosPeloCorretor || [],
    medioEBaixo: { ...MEDIO_E_BAIXO, descartadosSemLista: estado.medioEBaixoDescartados || 0 },
  };
}

function gravarRelatorio(estado, consolidado, decisao) {
  const veredito = decisao.acao === 'fim' ? 'APROVADO' : decisao.acao === 'parar' ? 'PARADO' : 'EM_ANDAMENTO';
  estado.medioEBaixoDescartados = consolidado.ignorados;
  estado.historico.push({
    rodada: estado.rodada, veredito, acao: decisao.acao, motivo: decisao.motivo || null,
    bloqueantes: consolidado.bloqueantes.length, incertos: consolidado.incertos.length,
    preExistentes: consolidado.preExistentes.length, descartados: consolidado.descartados.length, chamadas: estado.chamadas,
  });
  const caminho = join(estado.raiz, 'outputs', 'spec', 'auditorias', `${estado.task}.validacao.json`);
  gravarJson(caminho, {
    task: estado.task, veredito, motivo: decisao.motivo || null, rodada: estado.rodada,
    // `sem-agentes`: só a parte determinística decidiu; as dimensões de modelo não rodaram.
    modo: estado.semAgentes ? 'sem-agentes' : 'com-agentes',
    dimensoes: estado.dimensoes, dispensadas: estado.dispensadas,
    ...(estado.semAgentes ? { dimensoesSemValidador: estado.dimensoes } : {}),
    bloqueantes: consolidado.bloqueantes, incertos: consolidado.incertos,
    // Comando que falhou igual antes da task (linha de base): não bloqueia, mas não some.
    preExistentes: consolidado.preExistentes,
    descartados: consolidado.descartados, dimensoesIncertas: consolidado.dimensoesIncertas,
    comandos: estado.comandos, naoInformados: Object.entries(estado.cmds).filter(([, c]) => !c).map(([r]) => r),
    ...camposDoCiclo(estado),
    ferramentas: estado.ferramentas, chamadas: estado.chamadas, tokens: estado.tokens, historico: estado.historico,
  });
  return barra(caminho);
}

/** A conferência de evidência contra o repositório do código. A da varredura não tem trecho mínimo. */
function conferidor(estado) {
  const ler = leitorDoRepo(estado.repo, estado.raiz);
  return (ev, { deterministico = false } = {}) => conferirEvidencia(ev, ler, 3, { minimo: deterministico ? 0 : MINIMO_TRECHO });
}

/**
 * O que fazer quando o ciclo para (item 13.4). Antes, a ação `parar` só dizia o motivo: o FATAL do H
 * proibia mudar o estado, a devolutiva em caso de falha morava numa referência lida "ao chegar no J",
 * e o código que o corretor editou ficava sem commit — herdado pela próxima task do lote, porque
 * `coletarMudancas` pega tudo que não foi commitado.
 */
const INSTRUCAO_PARAR = 'Ciclo parado; o estado do work item NÃO muda. (1) Comente no work item os bloqueantes e o motivo deste relatório, com o estado inalterado (Mode B: no relatório da task). (2) Faça a devolutiva do passo J em modo falha. (3) Se `editadosPeloCorretor` não está vazio, mostre ao usuário o diff desses arquivos (git diff; arquivo novo, o conteúdo) e pergunte se mantém ou descarta — nunca descarte sozinho. (4) Em lote, não comece a próxima task antes dessa decisão.';

/** A ação que encerra o ciclo fica no estado: `avancar` depois dela só a repete, sem rodar nada. */
function encerrar(estado, acao) {
  const final = acao.acao === 'parar'
    ? { ...acao, editadosPeloCorretor: estado.editadosPeloCorretor || [], instrucao: INSTRUCAO_PARAR }
    : acao;
  Object.assign(estado, { fase: acao.acao === 'fim' ? 'fim' : 'parado', final });
  return final;
}

/** Resultados da rodada → consolidado → próxima ação. */
function fecharValidacao(estado) {
  const conferir = conferidor(estado);
  for (const [dimensao, lotes] of Object.entries(estado.lidos)) {
    const novo = juntarLotes(dimensao, lotes, conferir);
    const inc = estado.incremental && estado.incremental[dimensao];
    const anterior = estado.resultados[dimensao];
    if (!inc || !anterior) { estado.resultados[dimensao] = novo; continue; }
    // Revalidação: o que não foi revisto continua valendo como estava.
    const respondidas = new Set(novo.verificacoes.map((v) => v.id));
    estado.resultados[dimensao] = {
      dimensao,
      verificacoes: [...anterior.verificacoes.filter((v) => !respondidas.has(v.id) && !inc.reabertas.includes(v.id)), ...novo.verificacoes],
      achados: [...anterior.achados.filter((a) => !inc.arquivos.includes(a.evidencia && a.evidencia.arquivo)), ...novo.achados],
    };
  }
  const ids = estado.perguntas || [];
  const consolidado = consolidar({
    comandos: estado.comandos,
    deterministico: estado.deterministico,
    achadosDeterministicos: estado.achadosDeterministicos || [],
    resultados: estado.resultados,
    esperadas: Object.fromEntries(DIMENSOES_COM_PERGUNTAS.filter((d) => estado.resultados[d]).map((d) => [d, ids])),
    dimensoesComPerguntas: DIMENSOES_COM_PERGUNTAS,
    conferir,
  });
  const atuais = consolidado.bloqueantes.map((b) => b.chave);
  estado.resolvidas = [...new Set([...estado.resolvidas, ...resolvidasEntre(estado.ultimo ? estado.ultimo.bloqueantes : [], atuais)])];
  const decisao = decidir({
    consolidado, rodada: estado.rodada, rodadasMax: estado.rodadasMax,
    resolvidas: estado.resolvidas, jaRevalidouIncertos: estado.jaRevalidouIncertos,
  });
  const relatorio = gravarRelatorio(estado, consolidado, decisao);
  estado.ultimo = { bloqueantes: atuais, incertos: consolidado.incertos.length };
  // Os achados de modelo em aberto vão para a revalidação; os da varredura se refazem sozinhos. O de
  // modelo que se fundiu num da varredura (mesma linha) volta para a dimensão do modelo.
  estado.ultimoItens = consolidado.bloqueantes
    .filter((b) => b.tipo === 'achado' && (b.origem !== 'determinístico' || (b.dimensoesDoModelo || []).length))
    .map((b) => ({
      chave: b.chave, dimensoes: b.origem === 'determinístico' ? b.dimensoesDoModelo : (b.dimensoes || [b.dimensao]),
      arquivo: b.evidencia && b.evidencia.arquivo,
      onde: b.evidencia ? `${b.evidencia.arquivo}:${b.evidencia.linha}` : '', rotulo: b.titulo || b.id, motivo: b.motivo,
    }));

  const extra = {
    ...(estado.semAgentes ? { semAgentes: true } : {}),
    ...(consolidado.preExistentes.length ? { preExistentes: consolidado.preExistentes.map((p) => p.id) } : {}),
  };
  if (decisao.acao === 'fim') return encerrar(estado, { acao: 'fim', veredito: 'APROVADO', medioEBaixo: MEDIO_E_BAIXO_CURTO, ...extra, relatorio });
  if (decisao.acao === 'parar') {
    return encerrar(estado, { acao: 'parar', motivo: decisao.motivo, bloqueantes: consolidado.bloqueantes.length, incertos: consolidado.incertos.length, ...extra, relatorio });
  }
  if (decisao.acao === 'revalidar') {
    estado.jaRevalidouIncertos = true;
    return prepararValidacao(estado, decisao.dimensoes, levantar(estado));
  }
  Object.assign(estado, { grupos: decisao.grupos, grupoAtual: 0, mudadosNaRodada: [] });
  return prepararCorrecao(estado);
}

function parar(estado, motivo, extra = {}) {
  estado.historico.push({ rodada: estado.rodada, veredito: 'PARADO', acao: 'parar', motivo });
  const caminho = join(estado.raiz, 'outputs', 'spec', 'auditorias', `${estado.task}.validacao.json`);
  const anterior = existsSync(caminho) ? lerJson(caminho) : { task: estado.task };
  gravarJson(caminho, { ...anterior, veredito: 'PARADO', motivo, ...extra, ...camposDoCiclo(estado), historico: estado.historico });
  return encerrar(estado, { acao: 'parar', motivo, ...extra, relatorio: barra(caminho) });
}

// ————————————————————————————— comandos —————————————————————————————

const pastaDeTrabalho = (op, raiz) => resolve(raiz, op.trabalho || join('outputs', 'spec', 'validacao', op.task));

// `--cmd-testes ""` é "não informado", não o comando `true`; e a flag sem valor (`--cmd-testes` sozinho)
// também — `lerOpcoes` a lê como 'true', e rodar `true` aprovaria os testes sem rodar nenhum.
const comandoDe = (v) => (typeof v === 'string' && v.trim() && v.trim() !== 'true' ? v.trim() : '');

/**
 * Os comandos do projeto, na ordem em que rodam. `build` entrou em 2026-10-21 (item 13.9): depois do
 * corretor ninguém rodava o build de novo, e uma correção que quebrava a compilação passava se os
 * testes não a pegassem. É o mesmo build que o G2 usou, e roda a cada rodada, como os outros.
 */
const comandosDe = (op) => ({
  testes: comandoDe(op['cmd-testes']), cobertura: comandoDe(op['cmd-cobertura']),
  lint: comandoDe(op['cmd-lint']), build: comandoDe(op['cmd-build']),
});

/** Onde a `linha-de-base` grava por padrão: AO LADO da pasta de trabalho, que o `iniciar` apaga. */
const caminhoDaLinhaDeBase = (op, raiz) => resolve(raiz, op.saida || join('outputs', 'spec', 'validacao', `${op.task}.linha-de-base.json`));

/** O que a árvore de trabalho já tinha de alterado no código (fora da especificação e do maquinário). */
function alteradosNoCodigo(repo) {
  const prefixo = prefixoDoRepo(repo);
  return git(repo, ['status', '--porcelain=v1', '-uall', '-z', '--no-renames', '--', '.']).split('\0').filter(Boolean)
    .map((e) => doTopoParaRepo(prefixo, e.slice(3))).filter((p) => !FORA_DO_CODIGO(p)).sort();
}

/**
 * `linha-de-base` — roda os comandos do projeto ANTES de a task escrever código (E1 da `spec-implement`)
 * e grava status e linhas de falha. É o script que roda, com o mesmo shell e a mesma normalização do
 * G3: um JSON escrito à mão pelo agente não teria a mesma régua.
 *
 * O que ela NÃO garante: que foi tirada antes do código. Por isso grava o commit (`head`) e os arquivos
 * que a árvore já tinha alterados; o `iniciar` confere o commit, e o relatório mostra os arquivos da
 * entrega que já estavam alterados quando ela foi tirada — numa task só, isso é sinal de que a linha de
 * base veio tarde; num lote sem commit entre as tasks, é o código das anteriores.
 */
export function linhaDeBase(op, raiz) {
  if (!op.task && !op.saida) throw new Error('falta --task (ou --saida)');
  const repo = resolve(raiz, op.repo || '.');
  const shell = escolherShell(op.shell);
  const cmds = comandosDe(op);
  if (!Object.values(cmds).some(Boolean)) throw new Error('nenhum comando informado (--cmd-testes, --cmd-cobertura, --cmd-lint, --cmd-build)');
  const head = git(repo, ['rev-parse', 'HEAD']).trim();
  const exec = executor(repo, shell);
  const comandos = {};
  for (const [rotulo, cmd] of Object.entries(cmds)) if (cmd) comandos[rotulo] = registroDeBase(cmd, exec(cmd), repo);
  const arquivo = caminhoDaLinhaDeBase(op, raiz);
  gravarJson(arquivo, {
    versao: 1, criadaEm: new Date().toISOString(), task: op.task || null, repo, head,
    arquivosJaAlterados: alteradosNoCodigo(repo), shell, comandos,
  });
  return {
    acao: 'linha-de-base', arquivo: barra(arquivo), shell: shell.nome,
    comandos: Object.fromEntries(Object.entries(comandos).map(([r, c]) => [r, c.ok ? 'passou' : `falhou (saída ${c.codigo}, ${c.falhas.length} linha(s) de falha)`])),
    instrucao: 'Guarde o caminho: passe --linha-de-base <arquivo> no iniciar do G3, com os MESMOS comandos.',
  };
}

// `realpath`: no Windows o mesmo diretório chega no nome curto (`EDUARD~1`) ou no longo.
const real = (p) => { try { return realpathSync.native(p); } catch { return resolve(p); } };
const mesmoCaminho = (a, b) => (process.platform === 'win32' ? real(a).toLowerCase() === real(b).toLowerCase() : real(a) === real(b));

/**
 * Lê e confere a linha de base do `--linha-de-base`. Arquivo que não existe é erro (o agente apontou
 * errado); linha de base de outro repositório ou de um commit fora do histórico atual é DESCARTADA,
 * com o motivo no relatório — compará-la seria aceitar como "pré-existente" a falha de outro código.
 */
function carregarLinhaDeBase(caminho, estado, mudancas) {
  let lb;
  try { lb = lerJson(caminho); } catch { throw new Error(`a linha de base ${caminho} não existe ou não é JSON — rode \`validar.mjs linha-de-base\` antes de escrever código, ou tire a opção --linha-de-base`); }
  const resumo = { arquivo: barra(caminho), criadaEm: lb.criadaEm || null, head: lb.head || null };
  const descartar = (motivo) => ({ ...resumo, usada: false, motivo });
  if (lb.versao !== 1 || !lb.comandos || typeof lb.comandos !== 'object') return descartar('formato desconhecido');
  if (!lb.repo || !mesmoCaminho(lb.repo, estado.repo)) return descartar(`tirada em outro repositório (${lb.repo})`);
  const r = spawnSync('git', ['-C', estado.repo, 'merge-base', '--is-ancestor', String(lb.head || ''), 'HEAD'], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) return descartar(`o commit da linha de base (${String(lb.head).slice(0, 12)}) não está no histórico do HEAD atual`);
  const daEntrega = new Set(mudancas.map((m) => m.arquivo));
  const jaAlterados = (lb.arquivosJaAlterados || []).filter((p) => daEntrega.has(p));
  const avisos = [
    ...(jaAlterados.length ? [`${jaAlterados.length} arquivo(s) desta entrega já estavam alterados quando a linha de base foi tirada: se o código é desta task, ela veio tarde e a falha dele pode ter passado como pré-existente`] : []),
    // Outro shell muda a saída (caminho, mensagem): a comparação fica mais exigente, nunca mais frouxa.
    ...(lb.shell && estado.shell && lb.shell.nome !== estado.shell.nome ? [`a linha de base rodou no ${lb.shell.nome}, e o G3 no ${estado.shell.nome}: falha que já existia pode aparecer como nova`] : []),
  ];
  return {
    ...resumo, usada: true, motivo: 'falha de comando igual à da linha de base não bloqueia',
    arquivosDaEntregaJaAlterados: jaAlterados,
    ...(avisos.length ? { avisos } : {}),
    comandos: lb.comandos,
  };
}

/**
 * A pasta de trabalho de uma tentativa anterior sai antes da nova: com ela, um `resultado-*.json`
 * velho seria lido como resposta de um validador que nem rodou. Só apaga a pasta padrão
 * (`outputs/spec/validacao/<TASK>/`) ou uma que já foi de trabalho (tem `estado.json`), e nunca o
 * repositório, a raiz ou um ancestral deles — `--trabalho` mal apontado não leva nada junto.
 */
function limparTrabalho(trabalho, estado) {
  if (!existsSync(trabalho)) return;
  if ([estado.repo, estado.raiz].some((p) => dentroDe(trabalho, p))) return;
  const padrao = join(estado.raiz, 'outputs', 'spec', 'validacao');
  if (dentroDe(padrao, trabalho) || existsSync(caminhoEstado(trabalho))) rmSync(trabalho, { recursive: true, force: true });
}

/** A rule de frontend Next.js vale? `--regras-frontend sim|nao` decide; `auto` (padrão) lê as rules. */
function decidirRegrasFrontend(opcao) {
  const o = String(opcao || 'auto').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (o === 'sim' || o === 'nao') return { frontendNext: o === 'sim', regrasFrontend: `${o === 'sim' ? 'em vigor' : 'desligadas'} (--regras-frontend ${o})` };
  const emVigor = regrasFrontendNextEmVigor(DISCO_DO_HARNESS);
  return { frontendNext: emVigor, regrasFrontend: `${emVigor ? 'em vigor' : 'desligadas'} (auto: ${emVigor ? 'rule de frontend Next.js do harness, sem rule do projeto que a contradiga' : 'sem a rule de frontend Next.js, ou com rule de frontend do projeto que não é Next.js'})` };
}

export function iniciar(op, raiz) {
  if (!op.task) throw new Error('falta --task');
  const trabalho = pastaDeTrabalho(op, raiz);
  const repo = resolve(raiz, op.repo || '.');
  const shell = escolherShell(op.shell);
  // A pasta de trabalho, relativa ao `--repo`, quando mora no mesmo repositório git — com `../` se o
  // `--repo` é uma subpasta (ver `fotografia`). Fora do repositório, o `git status` não a vê.
  const trabalhoNoRepo = (() => {
    if (!dentroDe(topoDoRepo(repo, prefixoDoRepo(repo)), trabalho)) return '';
    const r = barra(relative(repo, trabalho));
    return isAbsolute(r) ? '' : r;
  })();
  const estado = {
    task: op.task,
    tasks: resolve(raiz, op.tasks || join('outputs', 'spec', 'tasks.json')),
    repo, raiz: resolve(raiz), base: op.base || 'HEAD', trabalho, trabalhoNoRepo, shell,
    cmds: comandosDe(op),
    rodada: 1, rodadasMax: Number(op.rodadas) || RODADAS_MAXIMAS, semExternas: op['sem-externas'] === 'true',
    semAgentes: op['sem-agentes'] === 'true', ...decidirRegrasFrontend(op['regras-frontend']),
    resultados: {}, resolvidas: [], ultimo: null, jaRevalidouIncertos: false, chamadas: 0, tokens: {}, historico: [],
    naoCorrigidos: [], editadosPeloCorretor: [],
    fase: 'iniciando',
  };
  const ctx = levantar(estado);
  if (!ctx.mudancas.length) throw new Error(`nada mudou em ${repo} em relação a ${estado.base}`);
  // A linha de base é lida AQUI e copiada para o estado selado: ninguém a troca no meio do ciclo.
  estado.linhaDeBase = comandoDe(op['linha-de-base']) ? carregarLinhaDeBase(resolve(raiz, op['linha-de-base']), estado, ctx.mudancas) : null;
  limparTrabalho(trabalho, estado);
  // Checkpoint: os comandos do projeto e as ferramentas externas podem levar minutos. Se o processo
  // cair no meio (timeout da ferramenta de shell), `avancar` acha a fase `iniciando` e retoma daqui.
  gravarEstado(trabalho, estado);
  const acao = continuarInicio(estado, ctx);
  gravarEstado(trabalho, estado);
  return acao;
}

/** O resto do `iniciar`, depois do checkpoint: determinístico, dimensões e a primeira ação. */
function continuarInicio(estado, ctx = levantar(estado)) {
  rodarDeterministico(estado, ctx);
  const { rodar, dispensadas } = escolherDimensoes({
    temRegras: temRegraDeNegocio(ctx.par),
    arquivos: ctx.mudancas.map((m) => ({ arquivo: m.arquivo, classe: classificar(m.arquivo), acrescentadas: linhasAcrescentadas(m) })),
  });
  Object.assign(estado, { dimensoes: rodar.map((r) => r.dimensao), dispensadas });
  // Sem dimensão aplicável (só documento, por exemplo) ou sem subagente (`--sem-agentes`), o veredito
  // sai do determinístico, sem agente.
  if (estado.semAgentes || !estado.dimensoes.length) {
    Object.assign(estado, { fase: 'validar', lidos: {} });
    return fecharValidacao(estado);
  }
  return prepararValidacao(estado, estado.dimensoes, ctx);
}

export function avancar(op, raiz) {
  if (!op.task) throw new Error('falta --task');
  const trabalho = pastaDeTrabalho(op, raiz);
  if (!existsSync(caminhoEstado(trabalho))) throw new Error(`não há ciclo iniciado para ${op.task} — rode iniciar`);
  const estado = lerEstado(trabalho);
  for (const par of String(op.tokens || '').split(',').filter(Boolean)) {
    const [agente, n] = par.split('=');
    if (agente && Number.isFinite(Number(n))) estado.tokens[agente] = (estado.tokens[agente] || 0) + Number(n);
  }
  // Ciclo encerrado: `avancar` só repete a ação final — nada roda, nada muda no relatório.
  const acao = estado.final ? estado.final : passo(estado);
  gravarEstado(trabalho, estado);
  return acao;
}

/**
 * Caminhos que não existiam antes do grupo: nem na fotografia (alterados e novos) nem no git. O
 * `ls-files` olha o repositório inteiro (`:/`), com os caminhos trazidos para o `--repo`: rastreado
 * fora da subpasta não pode passar por "arquivo novo" e entrar na cota de novos.
 */
function novosDesde(estado, mudados) {
  const prefixo = prefixoDoRepo(estado.repo);
  const rastreados = new Set(git(estado.repo, ['ls-files', '-z', '--full-name', '--', ':/']).split('\0').filter(Boolean).map((p) => doTopoParaRepo(prefixo, p)));
  return mudados.filter((p) => !(p in estado.fotografia) && !rastreados.has(p));
}

/** Dos caminhos que mudaram, os de código: sem a régua do harness (`harness:`, `tasks:`) e sem a pasta de trabalho. */
function codigoMudado(estado, mudados) {
  const t = estado.trabalhoNoRepo;
  return mudados.filter((p) => !/^(harness|tasks):/.test(p) && !(t && (p === t || p.startsWith(`${t}/`))));
}

/** "não corrigido: …" — o corretor (ou o agente da sessão) recusou o item, com o motivo. */
const NAO_CORRIGIDO = /^\s*n[aã]o\s+corrigid/i;

/**
 * O registro que o corretor grava (`corrigido-N.json`). Até 2026-10-21 ninguém o lia (item 13.5): o
 * "não corrigido: exige refatoração" não encerrava o ciclo — gastava corretor e revalidação até o
 * limite de rodadas —, e o motivo não chegava ao relatório. Registro ausente ou fora do formato vale
 * como "não disse nada": a revalidação decide, como antes.
 */
function lerRegistro(grupo) {
  let r;
  try { r = lerJson(grupo.registro); } catch { return null; }
  const itens = r && Array.isArray(r.itens) ? r.itens.filter((i) => i && typeof i.chave === 'string') : null;
  return itens && itens.length ? itens : null;
}

function passo(estado) {
  // Retomadas: o processo caiu depois do checkpoint, durante os comandos longos.
  if (estado.fase === 'iniciando') return continuarInicio(estado);
  if (estado.fase === 'revalidando') return revalidarRodada(estado);

  const mudados = mudadosEntre(estado.fotografia, fotografar(estado));
  const grupo = estado.fase === 'corrigir' ? estado.grupos[estado.grupoAtual] : null;
  if (grupo) estado.editadosPeloCorretor = [...new Set([...(estado.editadosPeloCorretor || []), ...codigoMudado(estado, mudados)])].sort();
  const viol = violacoes({
    mudados, fase: estado.fase, pastaTrabalho: estado.trabalhoNoRepo,
    // `escopo` é o do grupo, gravado no estado selado: os arquivos dos itens, ou a entrega (13.2).
    escopo: grupo ? { arquivos: grupo.escopo || grupo.arquivos } : null,
    novos: grupo ? novosDesde(estado, mudados) : [],
  });
  if (viol.length) return parar(estado, `a rodada de ${estado.fase === 'validar' ? 'validação' : 'correção'} alterou o que não podia`, { violacoes: viol });

  if (estado.fase === 'validar') {
    const falhas = [];
    for (const e of estado.esperados) {
      let r;
      try { r = lerJson(e.resultado); } catch (erro) { falhas.push({ ...e, motivo: existsSync(e.resultado) ? 'não é JSON válido' : 'o arquivo de resultado não existe' }); continue; }
      const erros = validarResultado(r, e.dimensao);
      if (erros.length) { falhas.push({ ...e, motivo: erros.slice(0, 5).join('; ') }); continue; }
      (estado.lidos[e.dimensao] = estado.lidos[e.dimensao] || []).push(r);
    }
    if (falhas.length && !estado.reenviou) {
      // Uma segunda chance só para quem falhou, com o motivo — formato errado costuma ser descuido. O
      // resultado inválido sai antes: o reenviado que não gravar nada não é lido com o de antes.
      for (const f of falhas) rmSync(f.resultado, { force: true });
      Object.assign(estado, { reenviou: true, esperados: falhas });
      estado.chamadas += falhas.length;
      estado.fotografia = fotografar(estado);
      return {
        acao: 'validar', rodada: estado.rodada, reenvio: true,
        agentes: falhas.map((f) => ({ tipo: f.tipo, entrada: f.entrada, problema: f.motivo })),
        instrucao: 'Dispare de novo só estes, com o prompt "Leia <entrada> e siga. Da última vez: <problema>.". Depois rode avancar.',
      };
    }
    // O INCERTO entra NO LUGAR do lote que falhou, ao lado dos lotes válidos da mesma dimensão —
    // sobrescrever a lista jogava fora o que os outros lotes responderam.
    for (const f of falhas) {
      (estado.lidos[f.dimensao] = estado.lidos[f.dimensao] || []).push({ dimensao: f.dimensao, achados: [], verificacoes: [{
        id: `VALIDADOR-${f.dimensao}`, veredito: 'INCERTO', motivo: `o validador não entregou resultado válido: ${f.motivo}`,
      }] });
    }
    return fecharValidacao(estado);
  }

  // Fim de um grupo de correção. Quem diz se corrigiu é a próxima validação, não o corretor — mas o
  // que ele RECUSOU ("não corrigido: …") vai para o relatório, com o motivo.
  estado.mudadosNaRodada = [...new Set([...(estado.mudadosNaRodada || []), ...mudados])];
  const registro = lerRegistro(grupo);
  const chaves = new Set(grupo.itens.map((it) => it.chave));
  const recusados = (registro || []).filter((i) => chaves.has(i.chave) && NAO_CORRIGIDO.test(String(i.feito || '')));
  estado.naoCorrigidos = [...(estado.naoCorrigidos || []),
    ...recusados.map((i) => ({ rodada: estado.rodada, grupo: estado.grupoAtual + 1, chave: i.chave, motivo: String(i.feito).trim().slice(0, 500) }))];
  grupo.todosRecusados = !!registro && grupo.itens.every((it) => recusados.some((i) => i.chave === it.chave));
  estado.grupoAtual += 1;
  if (estado.grupoAtual < estado.grupos.length) return prepararCorrecao(estado);

  // A rodada inteira não mudou código e o corretor recusou TODOS os itens: revalidar daria o mesmo
  // resultado, e corrigir de novo, a mesma recusa. Para na hora, com o motivo dele.
  if (!codigoMudado(estado, estado.mudadosNaRodada).length && estado.grupos.every((g) => g.todosRecusados)) {
    const desta = estado.naoCorrigidos.filter((i) => i.rodada === estado.rodada);
    return parar(estado, `o corretor não corrigiu nenhum item e não mudou nenhum arquivo: ${desta.map((i) => `${i.chave} — ${i.motivo}`).join('; ')}`);
  }

  // Todos os grupos corrigidos: nova rodada. O que a correção mudou é medido agora, e o estado é
  // gravado ANTES dos comandos longos — se o processo cair, `avancar` retoma em `revalidando`.
  estado.rodada += 1;
  const ctx = levantar(estado);
  estado.correcao = linhasDaCorrecao(estado, ctx.mudancas, estado.mudadosNaRodada);
  estado.fase = 'revalidando';
  gravarEstado(estado.trabalho, estado);
  return revalidarRodada(estado, ctx);
}

/** Revalida a dimensão cujo recorte mudou e a que tinha item aberto. */
function revalidarRodada(estado, ctx = levantar(estado)) {
  rodarDeterministico(estado, ctx);
  // Nenhum validador a chamar: o veredito sai do determinístico e dos resultados JÁ MESCLADOS. `lidos`
  // vazio é o que impede o lote parcial da revalidação anterior de sobrescrever o resultado inteiro.
  const semValidador = () => { Object.assign(estado, { fase: 'validar', lidos: {}, incremental: {} }); return fecharValidacao(estado); };
  if (estado.semAgentes) return semValidador();
  const abertas = new Set([
    ...(estado.ultimo.bloqueantes || []).map((c) => c.split('|')[0]),
    ...(estado.ultimoItens || []).flatMap((i) => i.dimensoes || []),
  ]);
  const dimensoes = estado.dimensoes.filter((d) => abertas.has(d)
    || estado.mudadosNaRodada.some((p) => CLASSES_POR_DIMENSAO[d].includes(classificar(p))));
  if (!dimensoes.length) return semValidador();
  return prepararValidacao(estado, dimensoes, ctx, { incremental: true });
}

// ————————————————————————————— CLI —————————————————————————————

/** `--chave valor` → `{chave: valor}`; flag sem valor vira 'true'. Valor vazio (`--cmd-testes ""`) fica vazio. */
export function lerOpcoes(args) {
  const op = {};
  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith('--')) continue;
    const chave = args[i].slice(2);
    const prox = args[i + 1];
    const valor = prox !== undefined && !prox.startsWith('--') ? args[++i] : 'true';
    op[chave] = valor;
  }
  return op;
}

function main(argv) {
  const [comando, ...resto] = argv;
  const fn = { 'linha-de-base': linhaDeBase, iniciar, avancar }[comando];
  if (!fn) {
    process.stderr.write('Uso: node .claude/ferramentas/validar.mjs linha-de-base|iniciar|avancar --task <TASK> [opções] — ver o cabeçalho do arquivo.\n');
    return 2;
  }
  try {
    process.stdout.write(`${JSON.stringify(fn(lerOpcoes(resto), process.cwd()))}\n`);
    return 0;
  } catch (erro) {
    process.stderr.write(`validar.mjs ${comando}: ${erro.message}\n`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
