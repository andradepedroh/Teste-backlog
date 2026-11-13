// Harness Elo v2 — Delivery Gate (PreToolUse). Núcleo puro + casca de I/O.
// Bloqueia integrar uma US (push de feature / PR p/ main) sem auditoria fresca aprovada.
//
// Os três caminhos de artefato vêm do `kit.mjs`, que é o dono deles no v2 — no v1 eram três
// literais neste arquivo (`docs/deliver/…`). São constantes de string puras, e por isso ficam
// ACIMA do separador de casca: o núcleo continua sem tocar o disco.
//
// ATENÇÃO, e o erro custa caro: os três são caminhos relativos à RAIZ do projeto, não sufixos.
// `join(dirAuditorias, DIR_ISENCOES)` duplica o caminho, o diretório de isenções não é
// encontrado, e o gate NEGA trabalho que tinha autorização humana explícita — o pior modo de
// falha possível para a única válvula de escape deste gate. Derive sempre da raiz de artefatos.
import { MARCADOR_US, DIR_AUDITORIAS, DIR_ISENCOES } from './kit.mjs';

const MAIN = 'main';

function stripQuotes(s) { return s ? s.replace(/^['"]|['"]$/g, '') : s; }

function fieldLine(body, key) {
  const m = body.match(new RegExp('^\\s*' + key + '\\s*:\\s*(.+?)\\s*$', 'mi'));
  return m ? m[1].trim() : null;
}

/**
 * Segmentos shell do comando: `&&`, `||`, `;`, `|` e a quebra de linha — RESPEITANDO ASPAS.
 *
 * A versão anterior era um `split` por regex, e por isso dividia dentro de aspas. O `;` de uma
 * mensagem de commit virava separador, o resto do texto parecia um push, e o gate NEGAVA trabalho
 * legítimo: `git commit -m "corrige a; git push origin feat/x quebra"` era medido como `deny` pelo
 * despachante inteiro. Sob o modelo de ameaça deste projeto — acidente e deriva, não adversário —
 * o falso positivo é a pior categoria, e ele é especialmente provável AQUI, num projeto que
 * escreve documentação sobre `git push` o tempo todo.
 *
 * ELE É COMPARTILHADO entre `parseGitTarget` e `podeSerRelevante`, e é essa partilha que faz o
 * superconjunto da pré-passagem ser ESTRUTURAL. Mexer aqui mexe nos dois lados ao mesmo tempo — e
 * é isso que se quer: dar um divisor diferente para cada lado é a divergência silenciosa que este
 * desenho existe para impedir. Quem mexer aqui mede as DUAS pontas: o texto entre aspas deixa de
 * ser comando, e o push composto real (`cd repo && git push …`) continua sendo visto.
 *
 * Aspas não fechadas NÃO lançam: o resto vira um segmento só. O gate é bloqueante e exceção dele
 * vira negação, então texto estranho tem que degradar para texto, nunca para erro.
 *
 * O que continua fora, e é declarado: `bash -c`, `env` e parênteses. A spec põe "shell de verdade
 * — `$VAR`, `$(...)`, `eval`, concatenação, heredoc" fora de cobertura, e são a mesma família.
 */
function segmentosShell(command) {
  const texto = String(command || '');
  const segmentos = [];
  let atual = '';
  let aspas = null; // null | "'" | '"'
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      atual += c;
      // Dentro de aspas simples nada escapa — é a regra do shell, e vale a pena ser fiel a ela.
      if (c === '\\' && aspas === '"' && i + 1 < texto.length) atual += texto[++i];
      else if (c === aspas) aspas = null;
      continue;
    }
    if (c === "'" || c === '"') { aspas = c; atual += c; continue; }
    if (c === '\\' && i + 1 < texto.length) { atual += c + texto[++i]; continue; }
    if (c === ';' || c === '\n') { segmentos.push(atual); atual = ''; continue; }
    if (c === '&' && texto[i + 1] === '&') { segmentos.push(atual); atual = ''; i++; continue; }
    if (c === '|') { if (texto[i + 1] === '|') i++; segmentos.push(atual); atual = ''; continue; }
    atual += c;
  }
  segmentos.push(atual);
  return segmentos.map(s => s.trim()).filter(Boolean);
}

/** Tokens do segmento, já sem o prefixo de ambiente (`GIT_TRACE=1 git push`). */
function tokensDoSegmento(seg) {
  let tokens = seg.replace(/\s+/g, ' ').trim().split(' ');
  while (tokens.length && /^\w+=/.test(tokens[0])) tokens = tokens.slice(1);
  return tokens;
}

/**
 * Índice do subcomando do git, pulando as flags globais (`-C <dir>`, `-c k=v`, `--git-dir=...`) —
 * em multi-repo o push chega como `git -C <repo> push ...`, e sem isso o subcomando nunca aparece
 * em `tokens[1]`, caindo em `other` (ignorado) mesmo sendo um push de feature real.
 */
function indiceSubcomandoGit(tokens) {
  let i = 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if ((t === '-C' || t === '-c') && tokens[i + 1] != null) { i += 2; continue; }
    if (/^--(git-dir|work-tree)(=|$)/.test(t)) { i += (t.includes('=') ? 1 : 2); continue; }
    if (t.startsWith('-')) { i += 1; continue; }
    break;
  }
  return i;
}

/**
 * Classificação PURAMENTE TEXTUAL do segmento: `'pr'`, `'push'` ou `null`. Não olha branch nenhum
 * — dizer se um push é *de feature* exige o `currentBranch`; dizer se ele *é um push* não exige.
 *
 * É a ÚNICA fonte dessa classificação: o `parseGitTarget` e a `podeSerRelevante` despacham os dois
 * por aqui. Isso é de propósito — a pré-passagem tem que ser superconjunto do `parseGitTarget`, e
 * duas cópias da mesma regra divergem em silêncio, na direção que deixa um push sem fiscalização.
 */
function candidatoDoSegmento(tokens) {
  if (tokens[0] === 'gh' && tokens[1] === 'pr' && tokens[2] === 'create') return 'pr';
  if (tokens[0] === 'az' && tokens[1] === 'repos' && tokens[2] === 'pr' && tokens[3] === 'create') return 'pr';
  if (tokens[0] === 'git' && tokens[indiceSubcomandoGit(tokens)] === 'push') return 'push';
  return null;
}

/** Base do PR declarada no segmento, ou `alvoBase` quando omitida — o default das duas CLIs. */
function baseDoPr(tokens, norm, alvoBase) {
  if (tokens[0] === 'gh') {
    const m = norm.match(/--base(?:=|\s+)(\S+)/) || norm.match(/\s-B\s+(\S+)/);
    return m ? stripQuotes(m[1]) : alvoBase;
  }
  const m = norm.match(/--target-branch(?:=|\s+)(\S+)/);
  return m ? stripQuotes(m[1]).replace(/^refs\/heads\//, '') : alvoBase;
}

/**
 * A PRÉ-PASSAGEM: *"vale a pena perguntar ao git?"*. Pura, sem I/O, e sem ver branch nenhum.
 *
 * O `gatherContext` disparava `git rev-parse` INCONDICIONALMENTE, antes de o `parseGitTarget` dizer
 * se o comando era sequer um push — a saída antecipada vinha depois do spawn. Custo medido: +220 a
 * +790 ms em TODA tool call de `Bash` (`echo ola`, `ls -la`, `git status` inclusive), contra um
 * orçamento de 50 ms por despachante. Esta é a pergunta barata que vem antes da caro.
 *
 * ELA É SUPERCONJUNTO do que o `parseGitTarget` considera relevante, e a assimetria é o ponto
 * inteiro: responder "pode ser" a um comando irrelevante custa um spawn desnecessário; responder
 * "não" a um push de verdade deixa esse push passar SEM FISCALIZAÇÃO, e num gate bloqueante é a
 * direção que não se pode errar. Na dúvida ela responde sim — `git push origin main` e
 * `gh pr create --base outra` passam por aqui e são descartados depois pelo `parseGitTarget`, que
 * nesse ponto já tem o branch de integração do repo certo em mãos.
 *
 * O superconjunto é ESTRUTURAL, não uma promessa de comentário: ela e o `parseGitTarget`
 * classificam pelo mesmo `candidatoDoSegmento`. E há um teste de propriedade que mede a relação
 * contra o corpus de comandos do arquivo de teste, para o caso de alguém separar os dois caminhos.
 */
export function podeSerRelevante(command) {
  for (const seg of segmentosShell(command)) {
    if (candidatoDoSegmento(tokensDoSegmento(seg))) return true;
  }
  return false;
}

/**
 * Classifica o comando quanto à relevância para o gate, inspecionando cada segmento shell.
 * `integrationBranch` é o branch de integração do repo alvo (default `main`) — em ADO um repo
 * pode integrar em `master`/`develop`, e comparar contra `main` fixo classificaria errado.
 */
export function parseGitTarget(command, currentBranch, integrationBranch = MAIN) {
  const alvoBase = integrationBranch || MAIN;
  let exemptPush = null;
  for (const seg of segmentosShell(command)) {
    const tokens = tokensDoSegmento(seg);
    const candidato = candidatoDoSegmento(tokens);
    if (!candidato) continue;
    const norm = seg.replace(/\s+/g, ' ');

    if (candidato === 'pr') {
      if (baseDoPr(tokens, norm, alvoBase) === alvoBase) {
        return { kind: 'pr', isFeaturePush: false, isPrToMain: true, branch: currentBranch };
      }
      continue; // PR para outra base → irrelevante
    }

    const argsBrutos = tokens.slice(indiceSubcomandoGit(tokens) + 1);

    // `--dry-run` (`-n`): o git imprime o que faria e NÃO transfere nada. Negar um dry-run é
    // bloquear justamente a conferência que o consultor faz antes de errar o push — falso
    // positivo puro, medido como `deny` pelo despachante inteiro antes desta linha.
    //
    // Mora AQUI e não no `candidatoDoSegmento`, de propósito: o `candidatoDoSegmento` é o que a
    // pré-passagem usa, e tirar o dry-run de lá estreitaria o superconjunto. A assimetria manda
    // errar para "pode ser" — o custo desse lado é um spawn; o do outro é um push sem fiscalização.
    if (argsBrutos.some(t => t === '--dry-run' || t === '-n')) continue;

    const args = argsBrutos.filter(t => t && !t.startsWith('-'));
    let target = args.length >= 2 ? args[1] : currentBranch;
    if (target && target.includes(':')) target = target.split(':').pop();
    if (target === 'HEAD') target = currentBranch;
    target = stripQuotes(target);
    if (target !== alvoBase) return { kind: 'push', isFeaturePush: true, isPrToMain: false, branch: currentBranch };
    exemptPush = { kind: 'push', isFeaturePush: false, isPrToMain: false, branch: currentBranch };
  }
  return exemptPush || { kind: 'other', isFeaturePush: false, isPrToMain: false, branch: currentBranch };
}

function readBlock(text, name) {
  const re = new RegExp('<!--\\s*' + name + '\\s*-->([\\s\\S]*?)<!--\\s*\\/' + name + '\\s*-->');
  const m = (text || '').match(re);
  return m ? m[1] : null;
}

/**
 * Commits auditados, um por repositório: `commits-auditados: App@abc1234, Web@def5678`.
 * A forma escalar `commit-auditado:` continua aceita como entrada sem repo (workspace mono-repo
 * e relatórios já escritos) — entrada sem repo casa em qualquer repositório.
 */
export function parseCommitsAuditados(body) {
  const raw = fieldLine(body, 'commits-auditados');
  if (!raw) {
    const legado = fieldLine(body, 'commit-auditado');
    return legado ? [{ repo: null, commit: legado }] : [];
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(par => {
    const i = par.lastIndexOf('@');
    if (i === -1) return { repo: null, commit: par };
    return { repo: par.slice(0, i).trim().toLowerCase(), commit: par.slice(i + 1).trim() };
  });
}

export function parseStatusBlock(text) {
  const body = readBlock(text, 'gate:status');
  if (body == null) return null;
  const raw = fieldLine(body, 'achados-bloqueantes') || '';
  const blockingFindings = /nenhum/i.test(raw) ? []
    : raw.split(',').map(s => s.trim()).filter(Boolean);
  const auditedCommits = parseCommitsAuditados(body);
  return {
    verdict: fieldLine(body, 'veredito'),
    // Escalar mantido: o `estado-deliver` e os relatórios legados falam nele.
    auditedCommit: fieldLine(body, 'commit-auditado') || (auditedCommits[0] || {}).commit || null,
    auditedCommits,
    blockingFindings,
  };
}

export function parseOverride(text) {
  const body = readBlock(text, 'gate:override');
  if (body == null) return null;
  const ids = [...body.matchAll(/^\s*-\s*id:\s*(\S+)/gmi)].map(m => m[1].trim());
  return {
    us: fieldLine(body, 'us'),
    auditedCommit: fieldLine(body, 'commit-auditado'),
    falsePositiveIds: ids,
  };
}

export function parseExemption(text) {
  const body = readBlock(text, 'gate:isencao');
  if (body == null) return null;
  return {
    repositorio: fieldLine(body, 'repositorio'),
    branch: fieldLine(body, 'branch'),
    motivo: fieldLine(body, 'motivo'),
    autor: fieldLine(body, 'autor'),
    data: fieldLine(body, 'data'),
  };
}

const OK_VERDICTS = ['APROVADA', 'APROVADA COM RESSALVAS'];

/**
 * Piso da âncora de commit, em caracteres.
 *
 * O casamento por prefixo é BIDIRECIONAL de propósito: o relatório grava um SHA curto e o
 * `git rev-list --abbrev-commit` pode devolver outro comprimento. Sem piso, porém, ele degenera —
 * `commit-auditado: "a"` casa com ~1 em 16 de TODOS os commits, e o único gate de push do projeto
 * aprova o push. Fail-open pela via mais banal possível: uma âncora truncada por acidente.
 *
 * 7 não é regra nova. O template da `auditoria-de-us` já prescreve `<sha-curto>`, 7 é o padrão do
 * `git rev-parse --short`, e abaixo disso o próprio git considera a referência ambígua. O piso
 * cobra o que o template já pede.
 */
const MIN_ANCORA = 7;

function ancoraCurta(commit) { return !!commit && String(commit).length < MIN_ANCORA; }

function commitInSet(commit, outgoing) {
  if (!commit || ancoraCurta(commit)) return false;
  return (outgoing || []).some(c => c === commit || c.startsWith(commit) || commit.startsWith(c));
}

/**
 * Entradas de commit auditado aplicáveis ao repo do push. Entrada sem repo (forma legada) e
 * contexto sem repo (mono-repo) casam com qualquer coisa: o SHA é a âncora real — um SHA do repo
 * errado não aparece nos commits do push e é reprovado por `commitInSet` de qualquer forma.
 */
function ancorasAplicaveis(r, repo) {
  const alvos = (r.auditedCommits && r.auditedCommits.length)
    ? r.auditedCommits
    : (r.auditedCommit ? [{ repo: null, commit: r.auditedCommit }] : []);
  return alvos.filter(a => a.repo == null || repo == null || a.repo === repo);
}

function commitDoRelatorio(r, repo) {
  const a = ancorasAplicaveis(r, repo)[0];
  return a ? a.commit : null;
}

const MENSAGENS = {
  irresolvivel: 'Delivery gate: não foi possível determinar em qual repositório este push acontece. Em workspace multi-repo, use a forma canônica `git -C <repo> push …`.',
  'multiplos-push': 'Delivery gate: mais de um push/PR no mesmo comando — o gate avalia um repositório por vez e não consegue fiscalizar todos. Rode um push por comando, na forma canônica `git -C <repo> push …`.',
  'sem-manifesto': 'Delivery gate: manifesto do workspace ausente. Crie `workspace.md` na raiz do repositório de docs a partir de `.claude/templates/workspace.md`, declarando o papel de cada repositório.',
  'manifesto-invalido': 'Delivery gate: manifesto do workspace inválido',
  ambiguo: 'Delivery gate: mais de uma pasta candidata a repositório de docs — deixe apenas uma com `outputs/explore` e `outputs/spec`',
  'sem-remote': 'Delivery gate: o repositório deste push não tem `origin` configurado — sem remote não há como saber o papel dele.',
  // `workspace.md` na RAIZ do repositório de docs — é o `MANIFESTO_REL` do `workspace.mjs`, e é o
  // mesmo caminho que a mensagem irmã de `sem-manifesto` logo acima já dizia. Este literal veio do
  // v1 dizendo `docs/workspace.md`, e mandava o consultor bloqueado procurar arquivo inexistente.
  'repo-nao-declarado': 'Delivery gate: repositório não declarado no manifesto `workspace.md` (na raiz do repositório de docs) — acrescente uma entrada com o `papel` dele',
  commits: 'Delivery gate: não foi possível determinar os commits do push',
  marcador: `Delivery gate: não foi possível inspecionar a árvore do repositório de docs para checar o marcador \`${MARCADOR_US}\`.`,
};

function mensagemDeMotivo(motivo, ctx) {
  const base = MENSAGENS[motivo] || 'Delivery gate: bloqueado por segurança (motivo não classificado).';
  const partes = [base];
  if (motivo === 'commits') partes.push(`(branch de integração: ${ctx.branchIntegracao || MAIN}).`);
  if (ctx.detalhe) partes.push(`Detalhe: ${ctx.detalhe}.`);
  if (motivo === 'commits' || motivo === 'marcador') {
    partes.push('Bloqueado por segurança — corrija e tente de novo, ou registre isenção/override.');
  }
  return partes.join(' ');
}

/** Núcleo puro de decisão do gate. */
export function decide(ctx) {
  const t = ctx.target;
  if (!t || t.kind === 'other') return { action: 'ignore' };
  const relevant = (t.kind === 'push' && t.isFeaturePush) || (t.kind === 'pr' && t.isPrToMain);
  if (!relevant) return { action: 'ignore' };

  // Papel ausente = mono-repo legado: comporta-se como repositório de código, como antes.
  const papel = ctx.papel || 'codigo';
  if (papel === 'docs' || papel === 'prototipo') return { action: 'ignore' };
  if (papel === 'desconhecido') {
    return { action: 'deny', reason: mensagemDeMotivo(ctx.motivo || 'repo-nao-declarado', ctx) };
  }

  // A isenção vem ANTES da indeterminação: é autorização humana explícita para trabalho não-US,
  // e deve vencer a incapacidade do hook de calcular commits — ela é a válvula justamente para
  // o que o hook não entende. (Na ordem anterior, `determinable` matava a válvula.)
  //
  // O campo `ledger` SAIU deste retorno, junto do `appendLedger` que o consumia — decisão do
  // usuário, registrada no estado.md. O registro da isenção é o próprio arquivo de isenção,
  // versionado no git; o gate volta a ser só decisor, sem escrever arquivo de dentro de um
  // PreToolUse. O `pass` continua idêntico, e quem distingue os dois ramos de `pass` é o `reason`.
  if (ctx.exemption && ctx.exemption.motivo) {
    return {
      action: 'pass',
      reason: `Delivery gate: isenção não-US honrada (${ctx.exemption.motivo}).`,
    };
  }

  const motivo = ctx.motivo || (ctx.determinable === false ? 'commits' : null);
  if (motivo) return { action: 'deny', reason: mensagemDeMotivo(motivo, ctx) };

  const anchored = (ctx.reports || []).filter(r =>
    ancorasAplicaveis(r, ctx.repo).some(a => commitInSet(a.commit, ctx.outgoingCommits)));
  if (anchored.length === 0) {
    // O piso muda na direção RESTRITIVA, e por isso a mensagem tem que dizer O QUE está errado.
    // "Nenhuma auditoria cobre" mandaria o consultor rodar a auditoria de novo — e o problema não
    // é auditoria ausente, é o FORMATO da âncora que ele já escreveu.
    const curtas = (ctx.reports || [])
      .flatMap(r => ancorasAplicaveis(r, ctx.repo))
      .map(a => a.commit)
      .filter(ancoraCurta);
    if (curtas.length > 0) {
      return { action: 'deny', reason: `Delivery gate: âncora de auditoria curta demais para ser confiável (${curtas.join(', ')}). O campo \`commit-auditado\`/\`commits-auditados\` do relatório tem que trazer o SHA curto do commit — pelo menos ${MIN_ANCORA} caracteres, como sai de \`git rev-parse --short HEAD\`. Abaixo disso a âncora casa por prefixo com commits que ninguém auditou, e o gate não a aceita.` };
    }
    return { action: 'deny', reason: `Delivery gate: nenhuma auditoria cobre os commits deste push (${(ctx.outgoingCommits || []).join(', ') || '?'}). Rode a skill auditoria-de-us para a US antes de integrar.` };
  }

  // Fail-safe: TODO relatório ancorado precisa ser aceitável ou totalmente coberto por override.
  const overridden = [];
  for (const r of anchored) {
    const verdict = (r.verdict || '').toUpperCase();
    if (OK_VERDICTS.includes(verdict)) continue;
    if (verdict !== 'BLOQUEADA') {
      return { action: 'deny', reason: `Delivery gate: veredito desconhecido em ${r.us} ("${r.verdict}"). Bloqueado por segurança.` };
    }
    const alvo = commitDoRelatorio(r, ctx.repo);
    const ov = (ctx.overrides || []).find(o => o.us === r.us && o.auditedCommit === alvo);
    if (!ov) {
      return { action: 'deny', reason: `Delivery gate: auditoria de ${r.us} está BLOQUEADA (${(r.blockingFindings || []).join(', ') || 'sem detalhe'}). Corrija, ou registre override de falso-positivo (${r.us}.override.md) com justificativa.` };
    }
    const covered = new Set(ov.falsePositiveIds || []);
    const missing = (r.blockingFindings || []).filter(id => !covered.has(id));
    if (missing.length > 0) {
      return { action: 'deny', reason: `Delivery gate: override de ${r.us} não cobre os achados bloqueantes: ${missing.join(', ')}.` };
    }
    overridden.push(r);
  }

  // Qualquer caminho que passaria exige o marcador ausente: a US está fechando.
  // (A isenção não-US já retornou acima e não é afetada.)
  if (ctx.markerInTree) {
    return { action: 'deny', reason: `Delivery gate: ${MARCADOR_US} ainda está na árvore do repositório de docs. A US está fechando — apague o marcador e commite.` };
  }

  if (overridden.length > 0) {
    return {
      action: 'pass',
      reason: `Delivery gate: BLOQUEADA neutralizada por override (falso-positivo) em ${overridden.map(r => r.us).join(', ')}.`,
    };
  }
  return { action: 'pass', reason: 'Delivery gate: auditoria(s) ancorada(s) aprovada(s) cobrindo o push.' };
}

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { descobrirWorkspace, lerManifesto, papelDoDiretorio, resolverDiretorioDoComando, nomeDoRepo } from './workspace.mjs';

function git(args) { return execFileSync('git', args, { encoding: 'utf8' }).trim(); }
function gitEm(dir, args) { return git(['-C', dir, ...args]); }

/** Diretório das auditorias, resolvido no repo de docs (ou no cwd, em mono-repo). */
function auditDir(raizArtefatos) { return join(raizArtefatos || '.', DIR_AUDITORIAS); }

/**
 * Diretório das isenções, resolvido da mesma RAIZ que o das auditorias — não do diretório de
 * auditorias. No v1 ele era `join(dirAuditorias, '_isencoes')`, com `'_isencoes'` literal; aqui
 * `DIR_ISENCOES` já traz o caminho inteiro a partir da raiz, e derivá-lo de `dirAuditorias`
 * produziria `outputs/spec/auditorias/outputs/spec/auditorias/_isencoes`. O diretório não
 * existiria, nenhuma isenção seria encontrada, e o gate negaria trabalho autorizado por humano —
 * em silêncio, porque "isenção ausente" e "isenção procurada no lugar errado" são a mesma coisa
 * vista de fora. É por isso que o teste mede as DUAS pontas: achar a isenção que existe e não
 * achar a que não existe.
 */
function isencoesDir(raizArtefatos) { return join(raizArtefatos || '.', DIR_ISENCOES); }

/**
 * `raiz` é a raiz do projeto. Ela virou parâmetro (era `process.cwd()` embutido) porque o
 * despachante do v2 injeta `io.cwd()`, e sem esse ponto de injeção o wiring só seria testável
 * com `process.chdir` — que é a razão registrada de o wiring das Tasks 5 e 6 ter ficado sem
 * medição. O default preserva o `main()` avulso, que continua chamando sem argumento.
 */
function gatherContext(payload, raiz = process.cwd(), lerDiretorio = readdirSync) {
  const toolName = payload && payload.tool_name;
  const command = payload && payload.tool_input && payload.tool_input.command;
  if (toolName !== 'Bash') return { target: { kind: 'other' } };

  // A PRÉ-PASSAGEM, e ela vem antes de TUDO que toca o disco ou sobe processo.
  //
  // Abaixo desta linha há três `git` (`rev-parse`, `rev-list`, `ls-tree`) mais os que o
  // `descobrirWorkspace`/`resolverDiretorioDoComando` sobem por conta própria. Antes daqui, o
  // `rev-parse` era incondicional: `echo ola` pagava o spawn para o `parseGitTarget` responder,
  // três linhas depois, que o comando era irrelevante. Um `if` textual de custo zero corta o
  // caminho inteiro, e o `{ kind: 'other' }` que sai daqui é o mesmo veredito que o `decide`
  // já dava a esses comandos (`action: 'ignore'`) — a mudança é de custo, não de comportamento.
  //
  // A pré-passagem é SUPERCONJUNTO do relevante: ela erra para "pode ser", nunca para "não é".
  if (!podeSerRelevante(command)) return { target: { kind: 'other' } };

  const cwd = raiz;
  // A PRIMEIRA leitura de disco do gate, e é por ela que a posição da linha acima é medível.
  // `lerDiretorio` vem do `io` do despachante (`IO_REAL.lerDiretorio`), pelo mesmo ponto de
  // injeção que o `cwd` usa — sem ele, a mutação que MOVE a pré-passagem para depois desta linha
  // é indistinguível pelo valor de retorno: os dois caminhos devolvem o mesmo `{ kind: 'other' }`.
  const ws = descobrirWorkspace(cwd, lerDiretorio);

  const resolvido = resolverDiretorioDoComando(command || '', cwd, { multiRepo: ws.multiRepo });

  // Papel e branch de integração antes de classificar o comando: em ADO um repo pode integrar
  // em `master`, e comparar o alvo do push contra `main` fixo classificaria errado.
  let papel = 'codigo';
  let repo = null;
  let branchIntegracao = MAIN;
  let motivo = null;
  let detalhe = null;

  if (ws.multiRepo) {
    if (ws.motivo) { papel = 'desconhecido'; motivo = ws.motivo; detalhe = ws.detalhe; }
    else if (resolvido.irresolvivel) { papel = 'desconhecido'; motivo = resolvido.motivo || 'irresolvivel'; }
    else {
      const m = lerManifesto(ws.docsDir);
      if (m.erro) { papel = 'desconhecido'; motivo = m.erro; detalhe = m.detalhe; }
      else {
        const p = papelDoDiretorio(resolvido.diretorio, m);
        papel = p.papel; repo = p.nome; branchIntegracao = p.branchIntegracao;
        if (p.motivo) { motivo = p.motivo; detalhe = p.nome; }
      }
    }
  } else if (resolvido.irresolvivel) {
    papel = 'desconhecido'; motivo = 'irresolvivel';
  }

  const dir = resolvido.diretorio;
  let currentBranch = null;
  if (dir) {
    try { currentBranch = gitEm(dir, ['rev-parse', '--abbrev-ref', 'HEAD']); } catch { /* fora de repo */ }
  }

  const target = parseGitTarget(command || '', currentBranch, branchIntegracao);
  const relevant = (target.kind === 'push' && target.isFeaturePush) || (target.kind === 'pr' && target.isPrToMain);
  if (!relevant) return { target };

  // Papel livre de fiscalização: nem lê auditoria, nem toca o repo de docs.
  if (papel === 'docs' || papel === 'prototipo') return { target, papel };
  if (papel === 'desconhecido') return { target, papel, motivo, detalhe, repo };

  let outgoingCommits = [];
  try {
    const out = gitEm(dir, ['rev-list', '--abbrev-commit', `${branchIntegracao}..HEAD`]);
    outgoingCommits = out ? out.split('\n').map(s => s.trim()).filter(Boolean) : [];
  } catch { motivo = motivo || 'commits'; }

  let markerInTree = false;
  const docsRaiz = ws.raizArtefatos;
  try {
    // O pathspec já restringe a consulta ao MARCADOR_US; saída não-vazia significa "presente".
    // Consultado na árvore do HEAD do repo de DOCS — é lá que o marcador mora em multi-repo, e
    // continua sendo a árvore (não o worktree) para que apagar sem commitar não passe.
    const out = gitEm(docsRaiz, ['ls-tree', '-r', '--name-only', 'HEAD', '--', MARCADOR_US]);
    markerInTree = out.trim().length > 0;
  } catch { motivo = motivo || 'marcador'; }

  const reports = [];
  const overrides = [];
  let exemption = null;
  try {
    const dirAuditorias = auditDir(docsRaiz);
    if (existsSync(dirAuditorias)) {
      for (const f of readdirSync(dirAuditorias)) {
        const full = join(dirAuditorias, f);
        if (/^US-.*\.override\.md$/i.test(f)) {
          const ov = parseOverride(readFileSync(full, 'utf8'));
          if (ov) overrides.push(ov);
        } else if (/^US-.*\.md$/i.test(f)) {
          const st = parseStatusBlock(readFileSync(full, 'utf8'));
          if (st) reports.push({ us: f.replace(/\.md$/i, ''), ...st });
        }
      }
    }
    const isenDir = isencoesDir(docsRaiz);
    if (currentBranch && existsSync(isenDir)) {
      for (const f of readdirSync(isenDir)) {
        if (!/\.md$/i.test(f)) continue;
        const ex = parseExemption(readFileSync(join(isenDir, f), 'utf8'));
        if (!ex || ex.branch !== currentBranch) continue;
        // Em multi-repo a chave é composta: `feat/x` em dois repos são coisas diferentes.
        // Isenção sem `repositorio` não casa — isenção morta é melhor que isenção no repo errado.
        if (ws.multiRepo && nomeDoRepo(ex.repositorio) !== repo) continue;
        exemption = ex;
        break;
      }
    }
  } catch { /* leitura best-effort */ }

  return { target, papel, repo, branchIntegracao, motivo, detalhe, outgoingCommits, reports, overrides, exemption, markerInTree };
}

// O `appendLedger` do v1 morava aqui: `mkdirSync` + `appendFileSync` em `_gate-ledger.md`, de
// dentro do gate. Saiu na migração, por decisão do usuário registrada no estado.md — escrever
// arquivo de dentro de um PreToolUse é efeito colateral num verificador cujo trabalho é decidir.
// O `LEDGER_GATE` do kit.mjs continua declarado e continua sem consumidor, também por decisão.

/**
 * O ponto de entrada do despachante do `pretooluse.mjs`. É AQUI que o veredito muda de idioma.
 *
 * O núcleo `decide()` fala a língua do v1 — `{ action: 'deny', reason }`. O despachante do v2 lê
 * `{ acao: 'deny', motivo }` (`pretooluse.mjs`, `if (r && r.acao === 'deny')`). Devolver a forma
 * do v1 direto NÃO quebra nada: o despachante não reconhece o campo, devolve `allow` com
 * `falhas: []`, e o único gate de push do projeto libera tudo em silêncio, com a suíte verde.
 * Por isso a tradução é explícita, e por isso ela está medida por um teste que chama `despachar`
 * — medir `avaliar` sozinho provaria o lado errado da fronteira.
 *
 * `pass` e `ignore` devolvem `null`: quem não nega, libera calado.
 *
 * NÃO tem try/catch, e isso é escolha. A postura assimétrica do despachante já trata exceção de
 * bloqueante como negação — engolir o erro aqui trocaria "não consegui decidir, logo nego" por
 * "não consegui decidir, logo libero", que é o fail-open que este gate existe para não ter.
 */
export function avaliar(payload, io) {
  const raiz = io && typeof io.cwd === 'function' ? io.cwd() : process.cwd();
  const lerDiretorio = io && typeof io.lerDiretorio === 'function' ? io.lerDiretorio : readdirSync;
  const r = decide(gatherContext(payload, raiz, lerDiretorio));
  if (r && r.action === 'deny') {
    return { acao: 'deny', motivo: r.reason || 'Delivery gate: bloqueado.' };
  }
  return null;
}

/** Emite o deny e devolve o exit code que o processo deve assumir. */
function emitDeny(reason) {
  const payload = JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  });
  try { process.stdout.write(payload); return 0; }
  catch {
    try { process.stderr.write(reason + '\n'); } catch { /* noop */ }
    return 2; // stdout indisponível → bloqueia pelo exit code (canal alternativo do PreToolUse)
  }
}

function main() {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { /* sem stdin */ }
  let payload = {};
  try { payload = JSON.parse(raw || '{}'); } catch { /* payload inválido */ }

  let result;
  try { result = decide(gatherContext(payload)); }
  catch (e) { result = { action: 'deny', reason: 'Delivery gate: erro interno (' + String((e && e.message) || e) + '); bloqueado por segurança.' }; }

  // `process.exitCode` em vez de `process.exit()`: escrita em pipe é assíncrona no macOS,
  // e `process.exit()` logo após o write pode truncar o payload. Um deny truncado não parseia
  // e o push passaria — fail-open dentro de um gate fail-safe. Aqui o loop drena e então sai.
  if (result.action === 'deny') { process.exitCode = emitDeny(result.reason || 'Delivery gate: bloqueado.'); return; }
  process.exitCode = 0; // pass/ignore → silêncio
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) { main(); }
