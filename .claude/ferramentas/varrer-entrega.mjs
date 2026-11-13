// Harness Elo v2 — Varredura determinística do que uma entrega mudou, sem modelo. Casca de I/O.
//
// O mesmo motor do passo G3 da `spec-implement` (`validacao/varredura.mjs`, e Semgrep/gitleaks quando
// instalados), exposto como comando para quem audita uma ENTREGA inteira — a `auditoria-de-us`, com o
// escopo do diff da US. Antes, o Passo A dela fazia o inventário de segredo, dado pessoal em log, HTML
// cru, injeção e erro engolido lendo código com o modelo, e declarava "não executa SAST" com o motor
// já no harness (plano de melhoria das skills, Onda 3, item 3.6).
//
//   node .claude/ferramentas/varrer-entrega.mjs --base <ref> [--repo <pasta do código>]
//        [--sem-externas] [--regras-frontend auto|sim|nao] [--json]
//   node .claude/ferramentas/varrer-entrega.mjs --desde-o-ramo <branch> ...   (base = merge-base)
//   node .claude/ferramentas/varrer-entrega.mjs --tudo ...                       (o repositório inteiro)
//
// Os três escopos do mesmo motor (Decisão 69): task = o G3 do `validar.mjs`; US = `--desde-o-ramo`
// (a `auditoria-de-us`); repositório = `--tudo` (o Passo 0 da `spec-code-audit`), que compara com a
// árvore vazia do git — todo arquivo rastreado conta como linha acrescentada.
//
// Só linhas ACRESCENTADAS desde a base (árvore de trabalho e arquivos novos incluídos), fora de
// `outputs/` e `.claude/`. Só CRÍTICO e ALTO — as regras são estreitas de propósito (ver o cabeçalho
// do `varredura.mjs`). Achado não é veredito: a auditoria confere cada um no disco e decide.
//
// `--repo` pode ser uma subpasta de um monorepo: os caminhos saem relativos a ela, e o que mudou fora
// dela não entra (`coletarMudancas` usa `git diff --relative` — item 13.11 da revisão do G3).
//
// `--tudo` numa pasta sem nenhum arquivo de código-fonte é exit 2, não «0 achados»: no workspace do
// harness o repositório de docs e o de código são pastas diferentes, e sem `--repo` a auditoria do
// repositório varria o de docs e devolvia um falso alívio (D54, teste ponta a ponta de 2026-10-21).
//
// Exit: 0 nada achado · 1 há achado · 2 não deu para varrer (sem repositório git, base inválida,
// `--tudo` sem código-fonte).

import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { coletarMudancas, rodarExternas } from './validar.mjs';
import { varrer } from './validacao/varredura.mjs';
import { regrasFrontendNextEmVigor } from './validacao/rules.mjs';
import { classificar } from './validacao/roteador.mjs';

const RAIZ_DO_HARNESS = fileURLToPath(new URL('../../', import.meta.url));
const DISCO_DO_HARNESS = {
  ler: (rel) => { try { return readFileSync(join(RAIZ_DO_HARNESS, rel), 'utf8'); } catch { return ''; } },
  listar: (rel) => {
    try { return readdirSync(join(RAIZ_DO_HARNESS, rel), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name); } catch { return []; }
  },
};

/** Os argumentos, com os mesmos nomes do `validar.mjs`. */
export function lerArgs(argv) {
  const o = { repo: process.cwd(), base: null, ramo: null, tudo: false, semExternas: false, regrasFrontend: 'auto', json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo') o.repo = argv[++i];
    else if (a === '--base') o.base = argv[++i];
    else if (a === '--desde-o-ramo') o.ramo = argv[++i];
    else if (a === '--tudo') o.tudo = true;
    else if (a === '--sem-externas') o.semExternas = true;
    else if (a === '--regras-frontend') o.regrasFrontend = argv[++i];
    else if (a === '--json') o.json = true;
  }
  return o;
}

function git(repo, args, entrada = undefined) {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', input: entrada });
  if (r.error || r.status !== 0) throw new Error(`git ${args[0]} falhou: ${(r.stderr || r.error?.message || '').trim()}`);
  return r.stdout.trim();
}

/** A varredura. `externas` é injetável para o teste não depender de Semgrep/gitleaks instalados. */
export function varrerEntrega(o, { externas = rodarExternas } = {}) {
  const repo = resolve(o.repo);
  // A árvore vazia do git (o mesmo hash em todo repositório): diff contra ela = o repositório inteiro.
  const base = o.tudo ? git(repo, ['hash-object', '-t', 'tree', '--stdin'], '')
    : o.ramo ? git(repo, ['merge-base', 'HEAD', o.ramo]) : (o.base ?? 'HEAD');
  git(repo, ['rev-parse', '--verify', o.tudo ? `${base}^{tree}` : `${base}^{commit}`]);
  const frontendNext = o.regrasFrontend === 'sim' ? true
    : o.regrasFrontend === 'nao' ? false
      : regrasFrontendNextEmVigor(DISCO_DO_HARNESS);
  const mudancas = coletarMudancas(repo, base);
  const presentes = mudancas.filter((m) => !m.removido);
  // `inputs/` é insumo do repositório de docs (o frame HTML, o código legado a analisar), não a
  // solução: no teste ponta a ponta, um `.html` de frame ali fazia o repositório de docs passar por código.
  const deCodigo = presentes.filter((m) => ['codigo', 'teste'].includes(classificar(m.arquivo)) && !/^inputs\//i.test(m.arquivo));
  if (o.tudo && !deCodigo.length) {
    throw new Error(`--tudo em ${repo}: nenhum arquivo de código-fonte entre os ${presentes.length} varridos `
      + '(fora de outputs/, .claude/ e inputs/) — esta não é a pasta do código, e «0 achados» aqui não quer dizer nada. '
      + 'Passe --repo <pasta do código> (no harness, a pasta do repositório de papel `codigo` do workspace.md).');
  }
  const achados = varrer(mudancas, { frontendNext });
  let situacao = { externas: 'desligadas (--sem-externas)' };
  if (!o.semExternas) {
    const trabalho = mkdtempSync(join(tmpdir(), 'varrer-entrega-'));
    try {
      const r = externas({ repo, trabalho }, mudancas);
      achados.push(...r.achados);
      situacao = r.situacao;
    } finally {
      rmSync(trabalho, { recursive: true, force: true });
    }
  }
  return {
    repo, base, arquivos: presentes.length,
    regrasFrontendNext: frontendNext, externas: situacao, achados,
  };
}

function main(argv) {
  const o = lerArgs(argv);
  if (!o.base && !o.ramo && !o.tudo) {
    process.stderr.write('Uso: node .claude/ferramentas/varrer-entrega.mjs --base <ref> | --desde-o-ramo <branch> | --tudo [--repo <pasta>] [--sem-externas] [--regras-frontend auto|sim|nao] [--json]\n');
    return 2;
  }
  let r;
  try { r = varrerEntrega(o); } catch (e) {
    process.stderr.write(`varrer-entrega: ${e?.message || e}\n`);
    return 2;
  }
  if (o.json) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
  else {
    process.stdout.write(`varrer-entrega: ${r.arquivos} arquivo(s) mudado(s) desde ${r.base.slice(0, 12)} — ${r.achados.length} achado(s).\n`);
    for (const a of r.achados) {
      process.stdout.write(`  [${a.severidade}] ${a.regra} — ${a.evidencia?.arquivo}:${a.evidencia?.linha} — ${a.titulo}\n`);
    }
  }
  return r.achados.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
