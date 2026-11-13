// Harness Elo v2 — Manifesto e verificação da zona imutável (Decisão 67). Núcleo puro + casca de I/O.
//
// POR QUE EXISTE. A zona imutável (Decisão 18) só não conflita na atualização se ninguém a editou
// no projeto. A trava do agente (`zonas.mjs`) protege contra o agente, mas o terminal e a IDE passam
// por fora dela — e desde a Decisão 67 ela abre no template. A garantia de verdade dos clones é esta:
// cada pacote publicado leva um MANIFESTO com o hash de cada arquivo da zona, e o PR do projeto
// confere a zona contra ele.
//
// DOIS LADOS, UM MÓDULO:
//   - quem PUBLICA (empacotar.mjs, gerar-cursor.mjs, gerar-kiro.mjs) monta o manifesto sobre a árvore
//     que vai no zip, com `montarManifesto`. O manifesto nunca é versionado no template;
//   - quem RECEBE roda `node .claude/ferramentas/verificar-zona.mjs` no projeto — à mão ou no
//     pipeline de PR (`.claude/templates/pipeline-verificar-zona.yml`).
//
// A LISTA DA ZONA VEM DO MANIFESTO, não do `harness.json` do projeto. O `harness.json` não é zona
// imutável; se a verificação confiasse nele, encolher a lista bastaria para esconder uma edição.
//
// O QUE ISTO NÃO IMPEDE, e está escrito para ninguém achar que impede: quem edita a zona E
// regenera o manifesto E sobe a versão passa nesta verificação. Com `--base`, o PR mostra que o
// manifesto mudou e exige que a versão tenha mudado junto — a edição deliberada fica explícita no
// diff, para o revisor humano. Esconder a edição é o que deixa de ser possível.
//
// CLI (o pipeline depende dele — não mude sem mudar o YAML junto):
//   node .claude/ferramentas/verificar-zona.mjs [--raiz <dir>] [--base <ref git>] [--json]
// Sai 0 se a zona confere (ou se é o template, que não tem manifesto); 1 se diverge; 2 se não há
// manifesto num projeto.

import { createHash } from 'node:crypto';

/** Nome do manifesto, na raiz do pacote. Fora de `.claude/` de propósito: os geradores reescrevem
 * `.claude` em todo texto, e o nome tem que ser o mesmo nas três saídas. */
export const MANIFESTO = 'harness-zona.lock.json';

/** Marcador do template — o mesmo do `zonas.mjs` (Decisão 40), repetido como literal porque este
 * arquivo é ferramenta e não importa de hook nenhum que a saída Kiro reescreva de lugar. */
export const MARCADOR_TEMPLATE = '.harness-template';

export const FORMATO = 1;

/**
 * As pastas da zona onde o PROJETO pode estender o harness — as mesmas do `zonas.mjs`, repetidas
 * como literal pela razão do `MARCADOR_TEMPLATE` (um teste cruza as cópias). Literais inteiros: os
 * geradores reescrevem `.claude` por regex, e estes nomes viram os das saídas Cursor e Kiro.
 */
export const PASTA_DE_AGENTES = '.claude/agents/';
export const PASTA_DE_SKILLS = '.claude/skills/';

/**
 * O arquivo novo (fora do manifesto) é EXTENSÃO DO PROJETO? Agente novo em `agents/`, ou qualquer
 * arquivo de uma skill cujo nome NÃO aparece no manifesto. Arquivo novo dentro de uma skill do pacote
 * não é: seria acréscimo ao maquinário. A pasta só vale se estiver na zona DO MANIFESTO (a saída Kiro
 * tira `.kiro/agents/` de lá). Mesma regra do `ehExtensaoDoProjeto` do hook, que libera a escrita.
 * Sem caixa, como o resto das comparações de caminho do harness.
 */
export function ehExtensao(rel, manifesto) {
  const r = rel.toLowerCase();
  const naZona = (pasta) => manifesto.zona.some((e) => e.toLowerCase() === pasta);
  const agentes = PASTA_DE_AGENTES.toLowerCase();
  if (r.startsWith(agentes) && r.length > agentes.length && naZona(agentes)) return true;
  const skills = PASTA_DE_SKILLS.toLowerCase();
  if (!r.startsWith(skills) || !naZona(skills)) return false;
  const nome = r.slice(skills.length).split('/')[0];
  if (!nome) return false;
  const pasta = `${skills}${nome}/`;
  return !Object.keys(manifesto.arquivos).some((k) => k.toLowerCase().startsWith(pasta));
}

/**
 * O manifesto da base e o do disco são o MESMO manifesto? Compara o JSON parseado, não o texto: com
 * `core.autocrlf` o checkout do Windows grava CRLF e o `git show` da base devolve LF, e a comparação
 * de texto cru dava `manifesto-editado` falso em todo agente Windows. Texto que não parseia cai na
 * comparação textual com fim de linha normalizado.
 */
export function mesmoManifesto(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');
  }
}

/**
 * Pastas e sufixos que nunca contam como arquivo da zona: lixo de execução, não maquinário — e o
 * `.kiro.hook`, que é o hook NATIVO do Kiro. Na saída Kiro o código dos hooks do harness mora em
 * `.kiro/hooks/`, a mesma pasta onde o Kiro grava os hooks do projeto; sem esta exceção, criar um
 * hook do projeto reprovaria o PR como edição da zona imutável.
 */
export const SEGMENTOS_IGNORADOS = ['node_modules', '__pycache__', '.git'];
export const SUFIXOS_IGNORADOS = ['.pyc', '.kiro.hook'];

export function ignorado(rel) {
  const partes = rel.split('/');
  return partes.some((p) => SEGMENTOS_IGNORADOS.includes(p)) || SUFIXOS_IGNORADOS.some((s) => rel.endsWith(s));
}

/**
 * O hash do conteúdo, com fim de linha normalizado em texto. O projeto pode ter `core.autocrlf` ou
 * ter extraído o zip por uma ferramenta que converte; CRLF contra LF não é edição. Binário (tem
 * byte NUL) é hasheado cru.
 */
export function hashConteudo(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf), 'utf8');
  const conteudo = b.includes(0) ? b : Buffer.from(b.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  return createHash('sha256').update(conteudo).digest('hex');
}

/** O caminho cai na zona? Entrada terminada em `/` é diretório (conteúdo inteiro); sem barra, arquivo exato. */
export function naZona(rel, zona) {
  return zona.some((e) => (e.endsWith('/') ? rel.startsWith(e) : rel === e));
}

/**
 * O manifesto, puro. `arquivos` é `[[rel, buf], ...]` — só os da zona entram, e a ordem de saída é
 * sempre a alfabética, para o mesmo pacote dar o mesmo manifesto byte a byte.
 */
export function montarManifesto({ versao, zona, arquivos }) {
  const hashes = {};
  for (const [rel, buf] of [...arquivos].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    // O manifesto está na zona (para o agente do clone não reescrevê-lo), mas não se descreve.
    if (rel === MANIFESTO || !naZona(rel, zona) || ignorado(rel)) continue;
    hashes[rel] = hashConteudo(buf);
  }
  return { formato: FORMATO, versao, zona: [...zona], arquivos: hashes };
}

export function serializar(manifesto) {
  return `${JSON.stringify(manifesto, null, 2)}\n`;
}

/**
 * O manifesto de uma árvore GERADA (Cursor, Kiro): versão e zona saem do `harness.json` da própria
 * árvore, que o gerador já reescreveu para os caminhos daquele runtime. Lança se ele faltar — uma
 * saída sem zona declarada não tem o que proteger, e isso é defeito do gerador, não do projeto.
 */
export function manifestoDeArvore(arquivos, { foraDaVerificacao = [] } = {}) {
  const h = arquivos.find(([rel]) => rel === 'harness.json');
  if (!h) throw new Error('a árvore gerada não tem `harness.json` — não há zona para o manifesto');
  const { versao, zonaImutavel } = JSON.parse(Buffer.isBuffer(h[1]) ? h[1].toString('utf8') : String(h[1]));
  if (!Array.isArray(zonaImutavel) || !zonaImutavel.length) {
    throw new Error('o `harness.json` gerado não declara `zonaImutavel`');
  }
  // Entradas da zona que a saída não leva e que são o lugar nativo do projeto naquele runtime
  // (`.kiro/agents/` no Kiro): o manifesto não as verifica, senão o arquivo do projeto reprovaria.
  const zona = zonaImutavel.filter((e) => !foraDaVerificacao.some((p) => e.startsWith(p)));
  return serializar(montarManifesto({ versao, zona, arquivos }));
}

/** Manifesto lido de texto; lança com mensagem legível se a forma não for a esperada. */
export function lerManifesto(texto) {
  const m = JSON.parse(texto);
  if (!m || m.formato !== FORMATO || !Array.isArray(m.zona) || !m.arquivos || typeof m.arquivos !== 'object') {
    throw new Error(`\`${MANIFESTO}\` não tem a forma esperada (formato ${FORMATO}, zona, arquivos).`);
  }
  return m;
}

/** Compara a zona de agora com o manifesto. `atuais` é `{ rel: hash }` de tudo que está sob a zona. */
export function comparar(manifesto, atuais) {
  const alterados = [];
  const ausentes = [];
  for (const [rel, hash] of Object.entries(manifesto.arquivos)) {
    if (!(rel in atuais)) ausentes.push(rel);
    else if (atuais[rel] !== hash) alterados.push(rel);
  }
  const extras = Object.keys(atuais).filter((rel) => !(rel in manifesto.arquivos)).sort();
  return { alterados: alterados.sort(), ausentes: ausentes.sort(), extras };
}

/**
 * O veredito, puro. Ordem: é o template? há manifesto? a versão do manifesto bate com a do
 * `harness.json`? a zona confere? e, com base, o manifesto mudou sem a versão mudar?
 */
export function decidir(f) {
  // O MARCADOR VERSIONADO REPROVA SEMPRE, com base ou sem. No template de verdade ele é ignorado pelo
  // git (`.gitignore`), então nunca aparece no `git ls-files`; versionado, ele viajaria em todo clone
  // e inverteria a detecção. Sem `--base` esta era a porta: apagar o manifesto e dar
  // `git add -f .harness-template` fazia a verificação responder "template, nada a verificar".
  if (f.marcadorVersionado) {
    return {
      codigo: 'marcador-versionado', status: 1,
      motivo: `\`${MARCADOR_TEMPLATE}\` está versionado neste repositório. Ele marca só a cópia de trabalho do template, onde é ignorado pelo git. Num projeto, tire-o do índice (\`git rm --cached ${MARCADOR_TEMPLATE}\`) e restaure o \`${MANIFESTO}\` do pacote.`,
    };
  }
  // A base tinha manifesto e o PR o tirou: isto é um projeto, por mais que o marcador do template
  // apareça junto. Sem esta checagem, apagar o manifesto e versionar `.harness-template` (git add -f)
  // faria o PR passar como "template" com a zona editada.
  if (!f.manifesto && f.manifestoBase && f.manifestoBase.texto !== null) {
    return {
      codigo: 'manifesto-removido', status: 1,
      motivo: `O \`${MANIFESTO}\` existe na base e foi removido neste PR. Um projeto não deixa de ter manifesto.`,
    };
  }
  if (f.ehTemplate && !f.manifesto) {
    return { codigo: 'template', status: 0, motivo: 'Este é o template (sem manifesto): nada a verificar. O manifesto nasce na publicação.' };
  }
  if (!f.manifesto) {
    return {
      codigo: 'sem-manifesto', status: 2,
      motivo: `Não há \`${MANIFESTO}\` na raiz. Ele vem no pacote do harness — extraia de novo a versão em uso, sem apagar este arquivo.`,
    };
  }
  const m = f.manifesto;
  if (f.versaoHarness && m.versao !== f.versaoHarness) {
    return {
      codigo: 'versao-divergente', status: 1,
      motivo: `O manifesto é da versão ${m.versao}, e o \`harness.json\` diz ${f.versaoHarness}. Uma atualização do harness traz os dois juntos.`,
    };
  }
  const d = comparar(m, f.atuais);
  // Extra que é agente ou skill do PROJETO não diverge: vira aviso. O resto continua reprovando.
  const extensoes = d.extras.filter((rel) => ehExtensao(rel, m));
  d.extras = d.extras.filter((rel) => !extensoes.includes(rel));
  if (d.alterados.length || d.ausentes.length || d.extras.length) {
    return { codigo: 'zona-divergente', status: 1, divergencias: d, extensoes, motivo: 'A zona imutável diverge do manifesto do pacote.' };
  }
  if (f.manifestoBase && !mesmoManifesto(f.manifestoBase.texto, f.manifestoTexto) && f.manifestoBase.versao === m.versao) {
    return {
      codigo: 'manifesto-editado', status: 1,
      motivo: `O \`${MANIFESTO}\` mudou em relação à base sem a versão mudar (${m.versao}). Manifesto só muda numa atualização do harness.`,
    };
  }
  const atualizacao = f.manifestoBase && f.manifestoBase.versao !== m.versao
    ? ` Atualização do harness neste PR: ${f.manifestoBase.versao ?? '(sem manifesto)'} → ${m.versao}. Confira que veio do pacote publicado.`
    : '';
  return { codigo: 'ok', status: 0, extensoes, motivo:`A zona imutável confere com o manifesto da versão ${m.versao} (${Object.keys(m.arquivos).length} arquivos).${atualizacao}` };
}

export function formatarTexto(r) {
  const linhas = [`${r.status === 0 ? 'OK' : 'FALHOU'} — ${r.motivo}`];
  const d = r.divergencias;
  if (r.extensoes && r.extensoes.length) {
    linhas.push('', `Extensões do projeto — aviso, não divergência (${r.extensoes.length}):`,
      ...r.extensoes.map((x) => `  · ${x}`),
      'Agente ou skill próprios do projeto dentro da zona. A atualização do harness não os toca;',
      'confira que são mesmo do projeto, e não cópia editada de algo do pacote.');
  }
  if (d) {
    const bloco = (titulo, lista) => (lista.length ? ['', `${titulo} (${lista.length}):`, ...lista.map((x) => `  · ${x}`)] : []);
    linhas.push(
      ...bloco('Alterados', d.alterados),
      ...bloco('Ausentes', d.ausentes),
      ...bloco('Novos dentro da zona', d.extras),
      '',
      'A zona imutável é maquinário do harness: a próxima atualização sobrescreve estes caminhos. Se a',
      'mudança é do projeto, ela vai para a zona mutável; se é do harness, ela muda no template.',
      'Para voltar ao estado do pacote, extraia de novo a versão em uso por cima destes caminhos.',
    );
  }
  return linhas.join('\n');
}

// ————————————————————————————— casca de I/O —————————————————————————————
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Todos os arquivos sob `dir`, relativos a `raiz`, com `/`, sem o que `ignorado` descarta. */
function listarRec(raiz, dir, out) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    const rel = relative(raiz, abs).replace(/\\/g, '/');
    if (ignorado(rel)) continue;
    if (e.isDirectory()) listarRec(raiz, abs, out);
    else out.push(rel);
  }
  return out;
}

/** `{ rel: hash }` de tudo que está na zona, lendo do disco. */
export function hashesDaZona(raiz, zona) {
  const atuais = {};
  for (const entrada of zona) {
    if (entrada === MANIFESTO) continue;
    const abs = join(raiz, entrada);
    if (!entrada.endsWith('/')) {
      if (existsSync(abs)) atuais[entrada] = hashConteudo(readFileSync(abs));
      continue;
    }
    for (const rel of listarRec(raiz, abs, [])) atuais[rel] = hashConteudo(readFileSync(join(raiz, rel)));
  }
  return atuais;
}

function lerJsonOuNull(abs) {
  try { return readFileSync(abs, 'utf8'); } catch { return null; }
}

/** O manifesto na ref base, ou `null` (ref sem o arquivo — é a primeira instalação do harness). */
function manifestoNaBase(raiz, base) {
  const r = spawnSync('git', ['show', `${base}:${MANIFESTO}`], { cwd: raiz, encoding: 'utf8' });
  if (r.status !== 0) {
    const semRef = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { cwd: raiz, encoding: 'utf8' });
    if (semRef.status !== 0) throw new Error(`A ref base \`${base}\` não existe neste checkout (no pipeline, use fetchDepth: 0).`);
    return { texto: null, versao: null };
  }
  let versao = null;
  try { versao = JSON.parse(r.stdout).versao ?? null; } catch { /* manifesto ilegível na base conta como versão desconhecida */ }
  return { texto: r.stdout, versao };
}

/**
 * O marcador do template está no índice do git? `git ls-files` vazio, ou git que falha (sem
 * repositório), é `false`: o que se procura é a afirmação positiva de que ele foi versionado.
 */
function marcadorVersionadoEm(raiz) {
  const r = spawnSync('git', ['ls-files', '--', MARCADOR_TEMPLATE], { cwd: raiz, encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() !== '';
}

export function colherFatos(raiz, { base } = {}) {
  const ehTemplate = existsSync(join(raiz, MARCADOR_TEMPLATE));
  const marcadorVersionado = marcadorVersionadoEm(raiz);
  const manifestoTexto = lerJsonOuNull(join(raiz, MANIFESTO));
  const harness = lerJsonOuNull(join(raiz, 'harness.json'));
  let versaoHarness = null;
  try { versaoHarness = harness ? JSON.parse(harness).versao ?? null : null; } catch { versaoHarness = null; }
  if (manifestoTexto === null) {
    return { ehTemplate, marcadorVersionado, manifesto: null, versaoHarness, manifestoBase: base ? manifestoNaBase(raiz, base) : null };
  }
  const manifesto = lerManifesto(manifestoTexto);
  return {
    ehTemplate, marcadorVersionado, manifesto, manifestoTexto, versaoHarness,
    atuais: hashesDaZona(raiz, manifesto.zona),
    manifestoBase: base ? manifestoNaBase(raiz, base) : null,
  };
}

function valorDe(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

function main(argv) {
  const raiz = resolve(valorDe(argv, '--raiz') || process.cwd());
  let r;
  try {
    r = decidir(colherFatos(raiz, { base: valorDe(argv, '--base') }));
  } catch (erro) {
    r = { codigo: 'erro', status: 1, motivo: (erro && erro.message) || String(erro) };
  }
  process.stdout.write((argv.includes('--json') ? JSON.stringify(r, null, 2) : formatarTexto(r)) + '\n');
  return r.status;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
