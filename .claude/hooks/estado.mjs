// Harness Elo v2 — Estado da sessão. Núcleo puro + casca de I/O.
//
// Fusão do phase-reminder.js e do estado-deliver.mjs do harness-elo, com uma diferença que
// muda o método: a fase é DETECTADA, não perguntada. O phase-reminder abria toda sessão
// pedindo ao usuário para declarar a fase; o detectarFase do kit.mjs responde sozinho — é a
// razão de ele existir. A sessão passa a começar com o estado na mesa.
//
// Verificador INFORMATIVO, e o único do SessionStart. Se ele quebrar, a sessão começa sem
// contexto injetado — ruim, não fatal.
//
// A RULE DA FASE ENTRA POR AQUI, e só por aqui. As três rules de fase têm `paths:` no frontmatter
// que só casa com o próprio arquivo, então o Claude Code deixou de carregá-las sozinho — antes as
// três entravam juntas em toda sessão e em todo subagente comum (~6,5 mil tokens), embora só uma
// valesse. Agora este hook lê a da fase detectada e a injeta inteira QUANDO CABE no orçamento do
// `additionalContext` (`ORCAMENTO_CONTEXTO`); quando não cabe — Explore e Plan, hoje —, injeta no
// topo a ordem de ler o arquivo dela antes de qualquer outra ação. Custo conhecido e aceito:
// subagente NÃO recebe o `additionalContext` do SessionStart (medido em 2026-10-14), então
// subagente deixa de ver a rule de fase; quem precisar dela cita o arquivo no prompt do subagente.

export const ROTULO_FASE = {
  explore: '🔍 Explore — pré-projeto',
  plan: '📐 Plan — discovery aprofundado e cadeia técnica',
  deliver: '🚀 Deliver — construção por work item',
};

export const PROXIMO_PASSO = {
  explore: 'Complete os documentos de `outputs/explore/` e o protótipo de alta fidelidade. ' +
    'O fecho da fase é verificado quando você invocar uma skill de Plan.',
  plan: 'Siga a cadeia declarada em `.claude/rules/harness/plan.md`. A `spec-test-plan` vem ' +
    'ANTES da `spec-tasks` — a dependência do kit está numerada ao contrário.',
  deliver: 'Um branch é uma user story. O push exige auditoria fresca ancorada no commit ' +
    'daquele repositório.',
};

/**
 * Onde mora a rule de cada fase. Caminhos por extenso, e não montados com `join`, de propósito: a
 * tabela `REESCRITAS` do `gerar-kiro.mjs` só reconhece o caminho inteiro, e é ela que os troca por
 * `.kiro/fases/harness-<fase>.md` na versão Kiro.
 */
export const RULE_DA_FASE = {
  explore: '.claude/rules/harness/explore.md',
  plan: '.claude/rules/harness/plan.md',
  deliver: '.claude/rules/harness/deliver.md',
};

/**
 * Teto do texto injetado, em caracteres. O Claude Code corta o `additionalContext` do SessionStart
 * em ~10.000 caracteres: acima disso grava o texto num arquivo e entrega à sessão só uma prévia de
 * ~2 KB (visto em 2026-10-19: a sessão abriu com "Output too large (10.6KB)" — 10.858 caracteres
 * / 1024 dá exatamente 10,6). Com a rule no fim, a prévia levava o estado e NADA da rule. 9.000
 * deixa folga para acento e emoji, caso o corte do runtime seja medido em bytes.
 */
export const ORCAMENTO_CONTEXTO = 9000;

/** Campo vindo do marcador de US é texto livre: um valor gigante não pode comer o orçamento. */
const MAX_CAMPO = 120;

/** O corpo da rule, sem o frontmatter — o `paths:` e a `description` não são para a sessão. */
export function corpoDaRule(texto) {
  // O BOM sai ANTES de procurar o frontmatter: um editor do Windows que grava UTF-8 com BOM deixava
  // o `^---` sem casar, e o frontmatter inteiro entrava na sessão como se fosse corpo.
  return String(texto || '').replace(/^﻿/, '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

function encurtar(valor) {
  const t = String(valor);
  return t.length > MAX_CAMPO ? `${t.slice(0, MAX_CAMPO - 1)}…` : t;
}

function temRuleLida(f, caminhoRule) {
  return !!caminhoRule && typeof f.ruleDaFase === 'string' && !!f.ruleDaFase.trim();
}

/**
 * Texto injetado no início da sessão. Puro: recebe fatos, devolve string — e a string NUNCA passa
 * de `ORCAMENTO_CONTEXTO`.
 *
 * Três modos, tentados em ordem até um caber:
 *   1. estado + rule inline (hoje só o Deliver cabe — a rule dele tem ~2,5 KB);
 *   2. estado + instrução de leitura NO TOPO, com o caminho exato da rule (Explore e Plan: as rules
 *      deles passam de 10 KB sozinhas). A instrução vem logo abaixo do cabeçalho porque, se um dia o
 *      texto passar do corte mesmo assim, a prévia de 2 KB que o runtime entrega ainda a carrega;
 *   3. o modo 2 com a lista de documentos faltantes enxugada à metade até zero, e por fim um corte
 *      duro que preserva o topo.
 * O caminho vem de `RULE_DA_FASE`, escrito por extenso: as saídas Kiro e Cursor o reescrevem para o
 * endereço delas, e a instrução cita o arquivo que existe lá.
 */
export function montarContexto(fatos) {
  const f = fatos || {};
  const total = (f.faltando || []).length;
  if (temRuleLida(f, RULE_DA_FASE[f.fase || 'explore'])) {
    const inline = montarTexto(f, { ruleInline: true, faltandoMax: total });
    if (inline.length <= ORCAMENTO_CONTEXTO) return inline;
  }
  for (let max = total; ; max = Math.floor(max / 2)) {
    const t = montarTexto(f, { ruleInline: false, faltandoMax: max });
    if (t.length <= ORCAMENTO_CONTEXTO || max === 0) return cortar(t);
  }
}

/** Último recurso: nem enxuto o texto coube. O topo — cabeçalho e instrução — sobrevive. */
function cortar(texto) {
  if (texto.length <= ORCAMENTO_CONTEXTO) return texto;
  const aviso = '\n\n[… contexto cortado no orçamento do harness]';
  return texto.slice(0, ORCAMENTO_CONTEXTO - aviso.length) + aviso;
}

function montarTexto(f, { ruleInline, faltandoMax }) {
  const fase = f.fase || 'explore';
  // A versão é a LOCAL, lida do `harness.json` do próprio clone, e o cabeçalho é o único leitor
  // dela. Ela não é comparada com nada: não existe canal que diga qual é a versão disponível.
  // Serve para o consultor saber em que versão do maquinário ele está quando reportar um problema.
  const versao = f.versaoLocal ? ` · template \`${f.versaoLocal}\`` : '';
  const caminhoRule = RULE_DA_FASE[fase];
  const temRule = temRuleLida(f, caminhoRule);
  const lerArquivo = temRule && !ruleInline;
  const linhas = [`HARNESS ELO v2${versao} — fase detectada: **${ROTULO_FASE[fase] || fase}**`];

  if (lerArquivo) {
    linhas.push(
      '',
      `⚠️ **ANTES DE QUALQUER OUTRA AÇÃO:** Leia AGORA, inteiro, o arquivo \`${caminhoRule}\` — é a ` +
      'rule desta fase, vale a partir de agora e não coube nesta mensagem. Não responda, não planeje ' +
      'e não rode nada antes de lê-la. Ao lançar um subagente que precise dela, ponha esse caminho no ' +
      'prompt dele: subagente não recebe esta mensagem.',
    );
  }

  linhas.push(
    '',
    lerArquivo
      ? 'A fase foi detectada pelos artefatos presentes, não perguntada. As rules das outras fases ' +
        'não estão carregadas; se precisar de uma, leia o arquivo dela.'
      : 'A fase foi detectada pelos artefatos presentes, não perguntada. A rule correspondente vem no ' +
        'fim desta mensagem e vale a partir de agora.',
    '',
    `**Próximo passo:** ${PROXIMO_PASSO[fase] || ''}`,
  );

  if (f.manifestoValido === false) {
    linhas.push(
      '',
      '⚠️ **O `workspace.md` da raiz ainda não é um manifesto válido.** Ele é o primeiro ' +
      'artefato do Explore e o que o gate de push usa para saber qual repositório fiscalizar. ' +
      'Rode `node .claude/hooks/workspace.mjs --validar`.',
    );
  }

  // REPOSITÓRIO ANINHADO NO DE DOCS (D53). O texto tem UM dono, o `workspace.mjs` — o `--validar`
  // imprime o mesmo. Aqui, logo depois do manifesto, porque é a mesma conversa: qual repositório o
  // gate fiscaliza. Fato ausente não afirma nada.
  const aviso = avisoDeAninhamento(f.reposAninhados);
  if (aviso) linhas.push('', aviso);

  const faltando = f.faltando || [];
  if (fase === 'explore' && faltando.length) {
    // A contagem do título é sempre a TOTAL; só a lista encolhe, e diz quanto ficou de fora.
    const mostrados = faltando.slice(0, faltandoMax);
    linhas.push(
      '',
      `**Documentos do Explore ainda ausentes (${faltando.length}):**`,
      ...mostrados.map((d) => `  · \`${encurtar(d.caminho)}\` — ${encurtar(d.rotulo)}`),
    );
    if (mostrados.length < faltando.length) {
      linhas.push(`  · … e mais ${faltando.length - mostrados.length} (a lista não coube no contexto da sessão)`);
    }
  }

  if (f.gapsAbertos) {
    linhas.push('', `**${f.gapsAbertos} GAP(s) em aberto.** GAP aberto não bloqueia fase — é combustível do Plan.`);
  }

  if (f.apontamentos) {
    linhas.push('', `**${f.apontamentos} apontamento(s)** no relatório de revisão. Rode \`node .claude/hooks/revisao.mjs\` para ver.`);
  }

  const us = f.usAberta;
  if (fase === 'deliver' && us) {
    linhas.push(
      '',
      `**User story aberta:** ${encurtar(us.id)}`,
      `  · branch \`${encurtar(us.branch)}\` · HEAD \`${encurtar(us.head)}\``,
    );
    // Contagem que não é número não vira `0`: `0` afirma "árvore limpa" e é a afirmação em que o
    // consultor se apoiaria para decidir que pode empurrar. A linha some — não afirmar nada é o
    // pior que se pode fazer aqui sem mentir. Ausência do campo no marcador continua sendo 0.
    if (Number.isFinite(us.naoCommitados)) {
      linhas.push(`  · arquivos não commitados: ${us.naoCommitados}`);
    }
    linhas.push(`  · auditoria: ${us.veredito ? encurtar(us.veredito) : 'ainda não emitida'}`);
  }

  // Por último, porque é o bloco longo: o estado da sessão fica legível no topo. Mesma convenção
  // do `manifestoValido`: fato AUSENTE não afirma nada; só a string vazia explícita — arquivo que
  // devia existir e não existe — vira aviso.
  if (caminhoRule && typeof f.ruleDaFase === 'string') {
    if (!temRule) {
      linhas.push(
        '',
        `⚠️ **A rule da fase não foi encontrada** em \`${caminhoRule}\`. A sessão segue sem ela. ` +
        'O arquivo faz parte da zona imutável: a instalação do harness está incompleta.',
      );
    } else if (ruleInline) {
      linhas.push(
        '',
        '---',
        '',
        `**Rule da fase**, lida de \`${caminhoRule}\`. As rules das outras fases não estão ` +
        'carregadas; se precisar de uma, leia o arquivo dela.',
        '',
        f.ruleDaFase.trim(),
      );
    }
  }

  return linhas.join('\n');
}

export function emitir(texto) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: texto },
  });
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  detectarFase, inventariar, faltantesExplore, lerVersaoTemplate,
  MARCADOR_US, RAIZ_SPEC, RAIZ_EXPLORE,
} from './kit.mjs';
import {
  descobrirWorkspace, lerManifesto, temRepoComPapel, reposAninhados, avisoDeAninhamento, MANIFESTO_REL,
} from './workspace.mjs';
import { analisar, carregarDocs } from './revisao.mjs';

/**
 * Conteúdo do arquivo, ou `''` quando ele está AUSENTE. Qualquer outro erro é relançado — é a
 * Restrição Global 1: "não havia nada" e "havia algo e eu não consegui olhar" são situações
 * opostas, e um verificador que as trata igual decide sobre o que não leu.
 *
 * POR QUE A METADE `ENOTDIR` NÃO TEM TESTE, e isto é decisão registrada, não esquecimento.
 *
 * **Ela é inalcançável por este `readFileSync`.** Medido nesta plataforma (win32, Node v22.17.1):
 * componente-ARQUIVO no meio do caminho — `<arquivo>/x.md` e `<arquivo>/sub/x.md` — levanta
 * `ENOENT`, não `ENOTDIR`. O código `ENOTDIR` existe no Windows, mas sai do `readdirSync`
 * (`scandir`), não do `readFileSync` (`open`). Sem leitor injetável não há entrada que o exercite.
 *
 * **E isso não deixa a Restrição Global 1 aberta.** Ela exige teste dos dois LADOS — ausência e
 * ilegibilidade — e os dois estão fechados para esta função, nominalmente, em `estado.test.mjs`:
 * `coletar RELANÇA com o marcador de US sendo diretório` (o `EISDIR` sobe, não vira `''`) e
 * `e a ponta oposta: fonte AUSENTE não lança`. `ENOTDIR` é sub-ramo de DENTRO do lado da ausência:
 * é sobre QUAIS códigos contam como ausente, não sobre confundir ausente com ilegível.
 *
 * **O ramo está correto, só é inalcançável aqui** — o oposto do código decorativo que este projeto
 * caçou por cinco rodadas, que estava errado ou inútil. O que ele afirma é a doutrina escrita do
 * harness, em `CODIGOS_DE_AUSENCIA_DE_DOCUMENTO` no `kit.mjs`: `ENOTDIR` significa que um
 * componente do meio do caminho é arquivo, logo o alvo não existe — ausência. Apagá-lo por ser
 * inalcançável NESTA plataforma é a decisão que precisaria de medição, e ela não foi feita.
 *
 * **A versão canônica é a do `kit.mjs`, e lá o ramo É medido:** `lerVersaoTemplate(raiz, lerArquivo
 * = readFileSync)` e `inventariar(raiz, lerDiretorio = readdirSync)` têm ponto de injeção só para
 * teste, e o JSDoc de lá dá esta mesma razão. Esta cópia local é recuo, não fonte.
 *
 * **Injetar leitor só nesta seria arbitrário.** O mesmo corte aparece em ONZE lugares de SEIS
 * módulos — `estado.mjs` (aqui), `fecho-explore.mjs` (4), `kit.mjs` (3, dois deles já injetáveis),
 * `revisao.mjs`, `workspace.mjs`, `zonas.mjs`. Esta só esteve na mesa porque foi o módulo que a
 * revisão calhou de examinar. Consertar os onze é rodada de refatoração em código já fechado e
 * revisado — e é a rodada que ninguém abriu.
 */
function lerOuVazio(caminho) {
  try {
    return readFileSync(caminho, 'utf8');
  } catch (erro) {
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return '';
    throw erro;
  }
}

/**
 * Campo `chave: valor` do marcador de US. Ausência vira `null`.
 *
 * O `fecho-explore.mjs` (Task 5) tem um irmão quase idêntico, `lerCampo`, cuja ausência vira `''`
 * porque lá o valor entra direto em comparação de string no bloco `gate:isencao`. A separação é
 * DELIBERADA e continua valendo: unificar os dois exigiria escolher uma das convenções e ajustar
 * o outro lado — mudança de comportamento disfarçada de refatoração. Se alguém unificar, que seja
 * com teste dos dois lados, não por parecer duplicação.
 *
 * O QUE ESTE COMENTÁRIO NÃO AFIRMA MAIS, porque foi medido e era falso: que a escolha por `null`
 * exista "porque o chamador aplica fallback próprio". Nenhum consumidor de hoje distingue os dois.
 * Trocado `null` por `''` e capturado o texto emitido num marcador com todos os campos opcionais
 * ausentes, os dois casos produzem **674 bytes idênticos** — `branch` e `head` caem no `|| '—'`,
 * `id` no `|| 'US sem identificador'`, `veredito` no `|| 'ainda não emitida'` do `montarContexto`,
 * e `naoCommitados` trata `null` e `''` como ausência, devolvendo `0` nos dois.
 *
 * A convenção é contrato INTERNO deliberado — quem lê `campo` sabe se o marcador trouxe a linha ou
 * não —, e é só isso. O único consumidor que distingue é o teste que a ancora, e ele existe
 * exatamente por isso: sem ele, trocar `null` por `''` não acendia nada.
 */
function campo(texto, chave) {
  const m = String(texto || '').match(new RegExp('^\\s*' + chave + '\\s*:\\s*(.+?)\\s*$', 'im'));
  return m ? m[1] : null;
}

/**
 * Quantos arquivos não commitados o marcador declara.
 *
 * A distinção da Restrição Global 1 aplicada dentro de um campo. Campo AUSENTE é "não havia nada":
 * o produtor não escreveu a linha, e `0` é a leitura certa. Campo PRESENTE e não numérico
 * (`nao-commitados: 3 arquivos`, deriva plausível no produtor) é o caso oposto — havia algo e não
 * deu para entender. Devolver `0` ali seria afirmar "árvore limpa", que é falso; devolver `NaN`,
 * que é o que a versão anterior fazia, punha `NaN` no texto que o consultor lê. Devolve `null`, e
 * o `montarContexto` omite a linha.
 */
function naoCommitados(bruto) {
  if (bruto === null) return 0;
  const n = Number(bruto);
  return Number.isFinite(n) ? n : null;
}

/** Fatos do projeto para o `montarContexto`. Nunca lança por ausência; relança o resto. */
export function coletar(cwd) {
  const raiz = cwd || process.cwd();
  // O `inventariar` devolve o caminho relativo ao DIRETÓRIO inventariado (`sync-log.md`), e o
  // `detectarFase` só aceita caminho relativo à RAIZ DO PROJETO, com o prefixo `outputs/spec/` —
  // está no JSDoc dele, e a tolerância ao nome nu foi removida de lá. Sem prefixar,
  // `ehWhitelistExplore` responde `false` para todo caminho e a WHITELIST_EXPLORE fica inerte:
  // um `outputs/spec/sync-log.md` num projeto de Explore seria anunciado como Plan.
  const presentesSpec = new Set(
    [...inventariar(join(raiz, RAIZ_SPEC))].map((rel) => `${RAIZ_SPEC}/${rel}`),
  );
  const presentesExplore = inventariar(join(raiz, RAIZ_EXPLORE));

  const ws = descobrirWorkspace(raiz);
  const manifesto = ws.docsDir ? lerManifesto(ws.docsDir) : { erro: 'sem-manifesto', entradas: [] };

  const marcador = lerOuVazio(join(raiz, MARCADOR_US));
  const fase = detectarFase({
    spec: presentesSpec,
    temMarcadorUS: !!marcador,
    temRepoCodigo: temRepoComPapel(manifesto, 'codigo'),
  });

  const analise = analisar(carregarDocs(raiz));
  const versao = lerVersaoTemplate(raiz);
  // Ausente vira `''` (o `montarContexto` avisa); ilegível relança, como toda fonte deste módulo.
  const caminhoRule = RULE_DA_FASE[fase];

  return {
    fase,
    ruleDaFase: caminhoRule ? corpoDaRule(lerOuVazio(join(raiz, caminhoRule))) : null,
    faltando: faltantesExplore(presentesExplore),
    gapsAbertos: analise.resumo.gapsAbertos,
    apontamentos: analise.resumo.totalApontamentos,
    manifestoValido: !manifesto.erro,
    // Repositório declarado DENTRO do de docs (D53) — o layout que o `delivery-gate` não reconhece.
    // Só em mono-repo: com a sessão na pasta-pai o gate resolve cada push pelo `origin` do
    // repositório, e o aninhado é reconhecido. O texto do manifesto só é lido quando ele já se
    // mostrou válido — o `lerManifesto` degrada ilegível para `sem-manifesto`, e aí não há o que ler;
    // presente e ilegível DEPOIS disso relança, como toda fonte deste módulo.
    reposAninhados: !manifesto.erro && !ws.multiRepo
      ? reposAninhados(lerOuVazio(join(ws.docsDir, MANIFESTO_REL)))
      : [],
    // Versão LOCAL, e o cabeçalho do `montarContexto` é o único leitor. Não há aviso de
    // "template desatualizado" porque não há com que comparar: nenhum plano especifica um canal
    // que diga qual é a versão disponível. Um ramo de aviso chegou a existir aqui e foi removido
    // — ele só era exercitável por fato sintético, e o comentário que prometia seu produtor
    // nomeava um plano que não tem essa tarefa. Quando o canal for planejado, o aviso volta com ele.
    versaoLocal: versao ? versao.versao : null,
    usAberta: marcador
      ? {
        id: campo(marcador, 'us') || 'US sem identificador',
        branch: campo(marcador, 'branch') || '—',
        head: campo(marcador, 'head') || '—',
        naoCommitados: naoCommitados(campo(marcador, 'nao-commitados')),
        veredito: campo(marcador, 'veredito'),
      }
      : null,
  };
}

/**
 * Falha do próprio verificador, na única saída que sobra quando o stdout é o canal do protocolo.
 * Segue a convenção do `pretooluse.mjs` (stderr como recuo, e a mensagem diz de quem é a falha) e
 * a do `workspace.mjs` (`process.stderr.write` para erro de CLI).
 */
function relatar(erro) {
  const msg = (erro && (erro.message || erro.code)) || String(erro);
  try {
    process.stderr.write(
      'Harness Elo v2 — o contexto da sessão não pôde ser entregue; a sessão começa sem ele.\n' +
      `Erro: ${msg}\n` +
      'Confira se o `harness.json` e os documentos de `outputs/` estão legíveis. Isto é falha do ' +
      'harness ou do ambiente, não do seu trabalho — reporte com esta mensagem.\n',
    );
  } catch { /* sem stderr não há mais para onde relatar */ }
}

function main() {
  let texto;
  try {
    texto = montarContexto(coletar(process.cwd()));
  } catch (erro) {
    // Informativo: sessão sem contexto injetado é ruim, não fatal — o exit code continua 0 e a
    // sessão segue. Mas a falha PARA de ser silenciosa, e isso não é gosto: o `lerVersaoTemplate`
    // do `kit.mjs` lança DE PROPÓSITO em `harness.json` malformado (tem comentário na linha e
    // teste dedicado), e este módulo é o único chamador dele no repositório. O `catch` cego que
    // estava aqui engolia exatamente a exceção que o kit projetou para ser barulhenta: o
    // consultor começava sem contexto nenhum e sem nada na tela dizendo por quê. Restrição
    // Global 1 — fonte presente e ilegível não é a mesma coisa que fonte ausente.
    relatar(erro);
    return 0;
  }
  try {
    process.stdout.write(emitir(texto));
  } catch (erro) {
    relatar(erro);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main();
}
