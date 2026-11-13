// Harness Elo v2 — Gera o zip publicável do template (Plano 7, Decisões 55–62).
//
// EXECUTÁVEL DE MÃO (Decisão 20): roda por comando, na cópia do template, quando quem mantém vai
// publicar. Escreve UM arquivo — o zip — e só depois de sete recusas. Não é verificador: não entra
// no settings.json e nenhum despachante o importa.
//
// O QUE ELE FAZ E O QUE NÃO FAZ. Faz o passo do meio do procedimento do MANUTENCAO.md ("Gerar e
// publicar o zip"): o nome sai da `versao` do harness.json, árvore suja e conteúdo proibido são
// recusados por máquina. NÃO roda a suíte (três minutos, e o PYTHON_REPORT é da máquina), NÃO faz
// bump, NÃO cria tag, NÃO copia para a pasta compartilhada — esses são os passos humanos, em ordem,
// no MANUTENCAO.md. Ele viaja no zip por morar na zona imutável; na pasta de um consultor recusa
// (Decisão 59): sem `.harness-template` não há o que empacotar.
//
// A RELEITURA É PELO `git ls-tree` (Decisão 60): o conteúdo de `git archive HEAD` é, por definição,
// `git ls-tree -r --name-only HEAD` — desde que os dois recebam o MESMO pathspec, que é o que a
// `EXCLUSOES` abaixo obriga. Parser de zip seria dependência ou código a mais para provar o que o
// git já afirma. O arquivo gerado é conferido por tamanho > 0 e pelos bytes `PK`.
//
// Núcleo puro (`decidir`) + casca de I/O injetável (`colherFatos`, `empacotar`, `IO_REAL`).

import {
  existsSync, readFileSync, statSync, openSync, readSync, closeSync, unlinkSync, mkdtempSync, writeFileSync, rmSync,
} from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
// Dono do conceito "sou o template" (Decisão 40). Ferramenta importa de hook: direção permitida.
import { MARCADOR_TEMPLATE } from '../hooks/zonas.mjs';
import { ZONA_IMUTAVEL } from '../hooks/kit.mjs';
import { MANIFESTO, montarManifesto, serializar } from './verificar-zona.mjs';

/** Entradas da árvore que não podem viajar. Terminada em `/` é diretório, em qualquer nível. */
export const PROIBIDOS = ['.git/', MARCADOR_TEMPLATE, 'node_modules/'];

/** Sem estes, o pacote está incompleto — a sessão lê o harness.json e o CLAUDE.md. */
export const EXIGIDOS = ['harness.json', 'CLAUDE.md', '.claude/settings.json'];


/**
 * Registro e governança que NÃO viajam no zip. Irmã da `EXCLUSOES` do `gerar-kiro.mjs`: o que quem
 * projeta o harness usa para se governar — o diário das verificações, os relatórios de tarefa do
 * Superpowers — não é o harness, e na pasta de um consultor `docs/` é pior que ruído: é o nome do
 * PAPEL do repo que vira wiki (`workspace.md`), então uma `docs/` nossa no zip colide com a dele.
 * `.azuredevops/` é o baseline do repositório no ADO (template de PR) — governança do repositório, não harness (Plano 10).
 *
 * O FILTRO É POSITIVO, e por obrigação: `git ls-tree` recusa pathspec `:(exclude)` ("pathspec magic
 * not supported by this command"), e a Decisão 60 sustenta que a releitura por `ls-tree` É o
 * conteúdo do `git archive`. Filtrar só o archive faria a releitura descrever um zip que não existe.
 * Então `manter` calcula, do topo real da árvore, a lista do que fica, e os DOIS comandos recebem
 * esse mesmo pathspec — o que mantém a Decisão 60 verdadeira ao pé da letra.
 *
 * Entrada de topo, sempre. Excluir algo aninhado (`.claude/x/`) exigiria expandir o pai em irmãos,
 * e não há caso: `.superpowers/`, `docs/` e `.azuredevops/` estão na raiz. Há teste prendendo a lista a isso.
 */
export const EXCLUSOES = ['docs/', '.superpowers/', '.azuredevops/'];

/**
 * O pathspec positivo: as entradas de topo que ficam. Casa a entrada INTEIRA (`docs` não casa
 * `docs-do-projeto`), e exclusão ausente da árvore simplesmente não aparece — pathspec com caminho
 * morto faria o git recusar o empacotamento no dia em que a pasta deixasse de existir.
 */
export function manter(topo, exclusoes = EXCLUSOES) {
  const excluidas = new Set(exclusoes.map((e) => e.replace(/\/+$/, '')));
  return topo.filter((e) => !excluidas.has(e));
}

export const RE_VERSAO = /^\d+\.\d+\.\d+$/;

export function nomeDoArquivo(nome, versao) {
  return `${nome}-${versao}.zip`;
}

const curto = (sha) => String(sha || '').slice(0, 7);

/**
 * Entrada casa um proibido? Diretório (`x/`) casa quando a entrada está DENTRO dele, na raiz ou
 * aninhado — `git ls-tree -r` só lista blobs, então um `x` sem barra é um arquivo chamado `x`, não
 * o diretório, e não casa. Arquivo (`x`) casa exato, em subpasta, ou como diretório homônimo com
 * conteúdo dentro.
 */
function casaProibido(entrada, proibido) {
  if (proibido.endsWith('/')) {
    return entrada.startsWith(proibido) || entrada.includes('/' + proibido);
  }
  return entrada === proibido
    || entrada.endsWith('/' + proibido)
    || entrada.startsWith(proibido + '/')
    || entrada.includes('/' + proibido + '/');
}

const recusa = (codigo, motivo) => ({ acao: 'recusar', codigo, motivo, nomeDoArquivo: null });

/**
 * A decisão, pura. As sete recusas na ORDEM DA SPEC (§3): identidade (é o template?) antes de
 * estado (a árvore está limpa?), e o destino por último — só faz sentido perguntar "o zip já
 * existe?" depois de saber que haveria zip.
 */
export function decidir(f) {
  if (!f.ehTemplate) {
    return recusa('fora-do-template',
      `Isto não é o template (sem \`${MARCADOR_TEMPLATE}\` na raiz). O zip é gerado por quem mantém o harness, na cópia do template.`);
  }
  if (typeof f.nome !== 'string' || !f.nome) {
    return recusa('harness-json-invalido', 'harness.json sem `nome` — é ele que dá o nome do zip.');
  }
  if (typeof f.versao !== 'string' || !RE_VERSAO.test(f.versao)) {
    return recusa('harness-json-invalido',
      `harness.json sem \`versao\` válida (X.Y.Z) — encontrado: ${JSON.stringify(f.versao ?? null)}.`);
  }
  if (f.arvoreSuja > 0) {
    return recusa('arvore-suja',
      `Árvore suja: ${f.arvoreSuja} arquivo(s) fora do HEAD. Commite ou descarte antes de empacotar — o zip tem que ser reproduzível a partir da tag.`);
  }
  if (f.tagSha && f.tagSha !== f.headSha) {
    return recusa('tag-em-outro-commit',
      `A versão ${f.versao} já foi publicada em ${curto(f.tagSha)} e este HEAD é ${curto(f.headSha)}. Suba a versão (Decisão 56).`);
  }
  const entradas = f.entradas || [];
  const proibida = entradas.find((e) => PROIBIDOS.some((p) => casaProibido(e, p)));
  if (proibida) {
    return recusa('entrada-proibida', `A árvore do HEAD contém \`${proibida}\`, que não pode viajar no zip.`);
  }
  const ausente = EXIGIDOS.find((e) => !entradas.includes(e));
  if (ausente) {
    return recusa('exigido-ausente', `A árvore do HEAD não tem \`${ausente}\` — o pacote estaria incompleto.`);
  }
  if (f.zipJaExiste) {
    return recusa('zip-ja-existe',
      `\`${f.caminhoDoZip}\` já existe. Não se sobrescreve zip gerado; apague-o à mão se for refazer.`);
  }
  return { acao: 'empacotar', codigo: null, motivo: null, nomeDoArquivo: nomeDoArquivo(f.nome, f.versao) };
}

// ————————————————————————————— casca de I/O —————————————————————————————

/**
 * Operações reais. Injetável: o teste de integração usa esta mesma casca contra um repositório em
 * `mkdtemp`, e é isso que prova a composição dos argumentos do git — um `io` de memória não erra
 * `--porcelain` nem `^{commit}`.
 */
export const IO_REAL = {
  cwd: () => process.cwd(),
  existe: (p) => existsSync(p),
  lerArquivo: (p) => readFileSync(p, 'utf8'),
  git: (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim(),
  /** `null` quando o git falha — é assim que "a tag não existe" se distingue de um SHA. */
  gitOuNull: (args, cwd) => {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return null;
    }
  },
  tamanho: (p) => statSync(p).size,
  primeirosBytes: (p, n) => {
    const fd = openSync(p, 'r');
    const b = Buffer.alloc(n);
    const lidos = readSync(fd, b, 0, n, 0);
    closeSync(fd);
    return b.subarray(0, lidos).toString('latin1');
  },
  apagar: (p) => unlinkSync(p),
  lerBuffer: (p) => readFileSync(p),
  /** Grava `texto` como `<dir temporário>/<nome>` e devolve o caminho; `limpar` apaga o diretório. */
  escreverTemporario: (nome, texto) => {
    const dir = mkdtempSync(join(tmpdir(), 'empacotar-'));
    const caminho = join(dir, nome);
    writeFileSync(caminho, texto);
    return { caminho, limpar: () => rmSync(dir, { recursive: true, force: true }) };
  },
};

/**
 * O manifesto da zona imutável que vai DENTRO do zip (Decisão 67). Montado sobre as entradas do
 * HEAD — as mesmas que o `git archive` leva —, lidas da árvore de trabalho: a recusa por árvore
 * suja já garantiu que as duas são iguais, e o hash normaliza fim de linha.
 */
export function manifestoDoPacote(raiz, fatos, io) {
  const arquivos = fatos.entradas.map((rel) => [rel, io.lerBuffer(join(raiz, rel))]);
  return serializar(montarManifesto({ versao: fatos.versao, zona: ZONA_IMUTAVEL, arquivos }));
}

/** Lê nome e versão do harness.json; JSON ausente ou ilegível vira `null` — e `decidir` recusa. */
function lerHarnessJson(raiz, io) {
  try {
    const h = JSON.parse(io.lerArquivo(join(raiz, 'harness.json')));
    return { nome: h && typeof h.nome === 'string' ? h.nome : null, versao: h && typeof h.versao === 'string' ? h.versao : null };
  } catch {
    return { nome: null, versao: null };
  }
}

/**
 * Colhe os fatos que `decidir` julga. SHAs completos, para comparar; `curto` só na mensagem.
 *
 * Fora do template não se pergunta nada ao git: a pasta de um consultor não é repositório, e a
 * recusa 1 tem de sair antes de qualquer coisa que possa falhar.
 */
export function colherFatos(raiz, saida, io) {
  const { nome, versao } = lerHarnessJson(raiz, io);
  const ehTemplate = io.existe(join(raiz, MARCADOR_TEMPLATE));
  if (!ehTemplate) {
    return {
      ehTemplate: false, nome, versao, arvoreSuja: 0, headSha: null, tagSha: null,
      entradas: [], mantidas: [], zipJaExiste: false, caminhoDoZip: null,
    };
  }
  const porcelain = io.git(['status', '--porcelain'], raiz);
  const arvoreSuja = porcelain ? porcelain.split('\n').filter(Boolean).length : 0;
  const headSha = io.git(['rev-parse', 'HEAD'], raiz);
  const tagSha = versao && RE_VERSAO.test(versao) ? io.gitOuNull(['rev-parse', `v${versao}^{commit}`], raiz) : null;
  // O topo primeiro, para calcular o pathspec; o recursivo depois, JÁ filtrado. Lista vazia não
  // vira `ls-tree --` sem caminho: pathspec vazio não filtra nada, listaria a árvore inteira.
  const topo = io.git(['ls-tree', '--name-only', 'HEAD'], raiz).split('\n').filter(Boolean);
  const mantidas = manter(topo);
  const entradas = mantidas.length
    ? io.git(['ls-tree', '-r', '--name-only', 'HEAD', '--', ...mantidas], raiz).split('\n').filter(Boolean)
    : [];
  const nomeArq = nome && versao ? nomeDoArquivo(nome, versao) : null;
  const caminhoDoZip = saida && nomeArq ? resolve(saida, nomeArq) : null;
  return {
    ehTemplate, nome, versao, arvoreSuja, headSha, tagSha, entradas, mantidas,
    zipJaExiste: caminhoDoZip ? io.existe(caminhoDoZip) : false,
    caminhoDoZip,
  };
}

/** Menor Git com `git archive --add-file` (Git 2.35, jan/2022). */
export const GIT_MINIMO = [2, 35];

/** `git version 2.45.1.windows.1` → `[2, 45, 1]`; o que não for saída do git vira `null`. */
export function versaoDoGit(texto) {
  const m = /git version (\d+)\.(\d+)(?:\.(\d+))?/.exec(String(texto || ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] || 0)] : null;
}

/** Versão desconhecida não passa: sem ela não há como afirmar que o `--add-file` existe. */
export function gitSuportaAddFile(versao) {
  if (!versao) return false;
  const [maior, menor] = versao;
  return maior > GIT_MINIMO[0] || (maior === GIT_MINIMO[0] && menor >= GIT_MINIMO[1]);
}

/**
 * `saida` está na raiz do repositório ou dentro dela? Por `relative`, não por comparação de string:
 * no Windows o mesmo diretório pode chegar com a letra do drive ou um segmento em outra caixa, e
 * `path.win32.relative` compara sem diferenciar caixa. Dentro = relativo vazio, ou relativo que não
 * começa com `..` e não é absoluto (outro drive).
 */
export function dentroDe(raiz, saida) {
  const rel = relative(resolve(raiz), resolve(saida));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Decide e, com `--saida`, age. OU o zip completo existe e passou na releitura, OU não existe.
 * Os jeitos de parar depois de decidir empacotar: pasta de saída ausente ou dentro do repositório
 * (recusa antes de tocar o git), Git sem `--add-file` (`git-antigo`, antes de escrever), manifesto
 * que não monta (`manifesto-falhou`, antes do archive), `git archive` que falha (apaga o que `-o`
 * já tiver criado), releitura que falha (apaga).
 */
export function empacotar(raiz, saida, io) {
  const fatos = colherFatos(raiz, saida, io);
  const d = decidir(fatos);
  if (d.acao === 'recusar' || !saida) return { ...d, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip };
  if (!io.existe(saida)) {
    return {
      acao: 'recusar', codigo: 'saida-inexistente',
      motivo: `A pasta de saída \`${saida}\` não existe. Crie-a antes de empacotar — a ferramenta não cria diretório.`,
      nomeDoArquivo: null, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip,
    };
  }
  if (dentroDe(raiz, saida)) {
    return {
      acao: 'recusar', codigo: 'saida-dentro-do-repo',
      motivo: `A pasta de saída \`${saida}\` está dentro do repositório. O zip na árvore sujaria o próximo empacotamento — use uma pasta fora dele.`,
      nomeDoArquivo: null, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip,
    };
  }
  // `--add-file` é do Git 2.35 em diante. Num Git mais velho o archive morre com "unknown option", e
  // a mensagem não diria que o problema é a versão — por isso a checagem vem antes de escrever nada.
  let saidaVersao = '';
  try { saidaVersao = io.git(['--version'], raiz); } catch { /* sem versão legível: recusa abaixo */ }
  if (!gitSuportaAddFile(versaoDoGit(saidaVersao))) {
    return {
      acao: 'recusar', codigo: 'git-antigo',
      motivo: `O empacotador exige Git ${GIT_MINIMO.join('.')} ou mais novo (\`git archive --add-file\`), e o desta máquina ` +
        `respondeu \`${saidaVersao || 'nada'}\`. Atualize o Git e rode de novo.`,
      nomeDoArquivo: null, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip,
    };
  }
  let temporario = null;
  try {
    // O manifesto não é versionado: entra no zip por `--add-file`, na raiz (Decisão 67). É a única
    // entrada do zip que não vem do HEAD, e por isso a releitura por `ls-tree` não a lista.
    temporario = io.escreverTemporario(MANIFESTO, manifestoDoPacote(raiz, fatos, io));
  } catch (erro) {
    // Falha de LER a árvore ou de GRAVAR o temporário — o git ainda nem rodou. Código próprio: com
    // `archive-falhou`, quem mantém ia investigar o git por um arquivo ilegível ou um disco cheio.
    return {
      acao: 'recusar', codigo: 'manifesto-falhou',
      motivo: `O manifesto da zona (\`${MANIFESTO}\`) não pôde ser montado (${String(erro && erro.message ? erro.message : erro).split('\n')[0]}). ` +
        'Nada foi escrito.',
      nomeDoArquivo: null, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip,
    };
  }
  try {
    // O MESMO pathspec da releitura (Decisão 60). Vazio não chega aqui: sem entradas, `decidir`
    // já recusou por `exigido-ausente` — e `archive ... HEAD --` sem caminho levaria tudo.
    io.git(['archive', '--format=zip', '-o', fatos.caminhoDoZip, `--add-file=${temporario.caminho}`,
      'HEAD', '--', ...fatos.mantidas], raiz);
  } catch (erro) {
    temporario.limpar();
    if (io.existe(fatos.caminhoDoZip)) io.apagar(fatos.caminhoDoZip);
    return {
      acao: 'recusar', codigo: 'archive-falhou',
      motivo: `\`git archive\` falhou (${String(erro && erro.message ? erro.message : erro).split('\n')[0]}). Nada foi deixado em \`${fatos.caminhoDoZip}\`.`,
      nomeDoArquivo: null, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip,
    };
  }
  temporario.limpar();
  const existe = io.existe(fatos.caminhoDoZip);
  const ok = existe && io.tamanho(fatos.caminhoDoZip) > 0 && io.primeirosBytes(fatos.caminhoDoZip, 2) === 'PK';
  if (!ok) {
    if (existe) io.apagar(fatos.caminhoDoZip);
    return {
      acao: 'recusar', codigo: 'releitura-falhou',
      motivo: `O zip gerado em \`${fatos.caminhoDoZip}\` não passou na releitura (vazio ou sem assinatura PK) e foi apagado.`,
      nomeDoArquivo: null, fatos, escrito: false, caminhoDoZip: fatos.caminhoDoZip,
    };
  }
  return { ...d, fatos, escrito: true, caminhoDoZip: fatos.caminhoDoZip };
}

export function formatarTexto(r) {
  const f = r.fatos || {};
  if (r.acao === 'recusar') return `RECUSADO — ${r.motivo}`;
  const resumo = `versão ${f.versao} · HEAD ${curto(f.headSha)} · ${(f.entradas || []).length} entradas`;
  if (!r.escrito) {
    const arvore = f.arvoreSuja === 0 ? 'árvore limpa' : `árvore suja (${f.arvoreSuja})`;
    const template = f.ehTemplate ? 'sim' : 'não';
    return [
      'RELATÓRIO — nada foi escrito (passe `--saida <dir>` para gerar o zip).',
      `${r.nomeDoArquivo} · ${resumo} · ${arvore} · template: ${template}`,
    ].join('\n');
  }
  return [
    `EMPACOTADO — ${r.nomeDoArquivo}`,
    `${resumo} · ${r.caminhoDoZip}`,
    'Próximo passo: copie para a pasta compartilhada e extraia uma vez numa pasta vazia, como o consultor',
    'faria (README.md, Instalação).',
  ].join('\n');
}

const USO_SAIDA = 'RECUSADO — Uso: node .claude/ferramentas/empacotar.mjs [--saida <dir>]. --saida exige o diretório de destino.';

function main(argv) {
  const i = argv.indexOf('--saida');
  let saida = null;
  if (i >= 0) {
    const valor = argv[i + 1];
    if (!valor || valor.startsWith('--')) {
      process.stdout.write(USO_SAIDA + '\n');
      return 1;
    }
    saida = valor;
  }
  const r = empacotar(IO_REAL.cwd(), saida, IO_REAL);
  process.stdout.write(formatarTexto(r) + '\n');
  return r.acao === 'recusar' ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
