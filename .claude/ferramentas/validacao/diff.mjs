// Harness Elo v2 — Leitura de diff unificado para o validador. Núcleo puro, sem I/O.
//
// O validador cita evidência como `arquivo:linha`, e a linha que vale é a do arquivo NOVO: é ela
// que o `conferencia.mjs` confere no disco. Por isso toda linha do recorte carrega o número dela no
// arquivo novo, e a linha removida aparece marcada, sem número — ela não existe mais para ser citada.

/**
 * Desfaz as aspas que o git põe num caminho com caractere especial (`"src/a\303\247.js"`): escapes
 * de C e octal, que são BYTES de UTF-8. Caminho sem aspas volta como veio. A casca passa
 * `-c core.quotePath=false` para o acento não vir em octal, mas aspas ainda aparecem quando o nome
 * tem `"`, `\` ou caractere de controle — sem isto, o caminho ficaria com as aspas e o achado sumiria.
 */
export function desaspar(nome) {
  const s = String(nome ?? '');
  if (!(s.length >= 2 && s.startsWith('"') && s.endsWith('"'))) return s;
  const SIMPLES = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };
  const corpo = s.slice(1, -1);
  const bytes = [];
  for (let i = 0; i < corpo.length; i += 1) {
    const c = corpo[i];
    if (c !== '\\') { bytes.push(...Buffer.from(c, 'utf8')); continue; }
    const octal = /^[0-7]{3}/.exec(corpo.slice(i + 1, i + 4));
    if (octal) { bytes.push(parseInt(octal[0], 8)); i += 3; } else if (corpo[i + 1] in SIMPLES) { bytes.push(SIMPLES[corpo[i + 1]]); i += 1; } else bytes.push(92);
  }
  return Buffer.from(bytes).toString('utf8');
}

/** O caminho de uma linha `---`/`+++` sem o `a/`/`b/`, sem aspas e sem o TAB que o git põe depois de nome com espaço. */
function caminhoDoCabecalho(resto, lado) {
  const nome = desaspar(resto.replace(/\t$/, ''));
  return nome.startsWith(`${lado}/`) ? nome.slice(2) : null;
}

/**
 * O nome na linha `diff --git a/X b/X`. Com aspas, cada lado vem entre aspas. Sem aspas o nome pode ter
 * espaço e até ` b/` no meio — mas os dois lados são iguais (`--no-renames`), e o meio exato da linha
 * os separa. É só o palpite inicial: a linha `+++` (ou a `---`, se o arquivo foi removido) confirma.
 */
function caminhoDoDiffGit(linha) {
  const resto = linha.slice('diff --git '.length);
  const aspas = /^("(?:[^"\\]|\\.)*") ("(?:[^"\\]|\\.)*")$/.exec(resto);
  if (aspas) return desaspar(aspas[2]).replace(/^b\//, '');
  const metade = (resto.length - 1) / 2;
  if (Number.isInteger(metade) && resto.startsWith('a/') && resto.slice(metade, metade + 3) === ' b/') return resto.slice(metade + 3);
  const m = / b\/(.+)$/.exec(resto);
  return m ? m[1] : '';
}

/**
 * Diff unificado → um item por arquivo, com os trechos (`@@`) e o número de cada linha no arquivo novo.
 *
 * Cabeçalho (`---`, `+++`, `new file mode`) só é lido ANTES do primeiro `@@` de cada arquivo. Dentro
 * de um trecho, toda linha começa por ` `, `+` ou `-`, e uma linha removida cujo conteúdo começa com
 * `-- ` chega aqui como `--- …` — lê-la como cabeçalho trocaria o nome do arquivo em silêncio.
 */
export function parsearDiff(texto) {
  const arquivos = [];
  let atual = null;
  let trecho = null;
  let linhaNova = 0;
  for (const linha of String(texto || '').split(/\r?\n/)) {
    if (linha.startsWith('diff --git ')) {
      atual = { arquivo: caminhoDoDiffGit(linha), novo: false, removido: false, binario: false, trechos: [] };
      arquivos.push(atual);
      trecho = null;
      continue;
    }
    if (!atual) continue;
    const cab = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(linha);
    if (cab) {
      linhaNova = Number(cab[1]);
      trecho = { linhas: [] };
      atual.trechos.push(trecho);
      continue;
    }
    if (!trecho) {
      if (linha.startsWith('new file mode')) atual.novo = true;
      else if (linha.startsWith('deleted file mode')) atual.removido = true;
      else if (linha.startsWith('Binary files ')) atual.binario = true;
      else if (linha.startsWith('+++ ') || linha.startsWith('--- ')) {
        // O `---` vem antes e serve ao arquivo removido (`+++ /dev/null`); o `+++` confirma os demais.
        const nome = caminhoDoCabecalho(linha.slice(4), linha[0] === '+' ? 'b' : 'a');
        if (nome) atual.arquivo = nome;
      }
      continue;
    }
    const tipo = linha[0];
    if (tipo === '+' || tipo === ' ') trecho.linhas.push({ tipo, texto: linha.slice(1), numero: linhaNova++ });
    else if (tipo === '-') trecho.linhas.push({ tipo, texto: linha.slice(1), numero: null });
    // `\ No newline at end of file` e a sobra vazia do split ficam de fora.
  }
  return arquivos;
}

/** Arquivo que o git ainda não conhece (não aparece no `git diff`) → o mesmo formato, tudo `+`. */
export function arquivoNovo(arquivo, conteudo) {
  const linhas = String(conteudo).replace(/\r?\n$/, '').split(/\r?\n/);
  return {
    arquivo,
    novo: true,
    removido: false,
    binario: false,
    trechos: [{ linhas: linhas.map((texto, i) => ({ tipo: '+', texto, numero: i + 1 })) }],
  };
}

/** As linhas acrescentadas, juntas — o que o roteador inspeciona para decidir as dimensões. */
export function linhasAcrescentadas(item) {
  return item.trechos.flatMap((t) => t.linhas.filter((l) => l.tipo === '+').map((l) => l.texto)).join('\n');
}

/**
 * As linhas de `depois` que não existiam em `antes` (números a partir de 1). É o que a correção de
 * uma rodada mudou, e é onde a revalidação procura defeito novo. Maior subsequência comum por linha;
 * arquivo grande demais para a tabela volta inteiro, que é o lado seguro (revalida mais, não menos).
 */
export function linhasMudadas(antes, depois, limite = 4_000_000) {
  const a = String(antes ?? '').split(/\r?\n/);
  const b = String(depois ?? '').split(/\r?\n/);
  if (antes === null || antes === undefined || a.length * b.length > limite) return b.map((_, i) => i + 1);
  const n = a.length;
  const m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  }
  const mudadas = [];
  let i = 0;
  let j = 0;
  while (j < m) {
    if (i < n && a[i] === b[j]) { i += 1; j += 1; } else if (i < n && t[i + 1][j] >= t[i][j + 1]) i += 1; else { mudadas.push(j + 1); j += 1; }
  }
  return mudadas;
}

/**
 * Um arquivo do diff → texto para o validador ler. Cada linha leva o número no arquivo novo e a
 * marca do diff: `+` acrescentada, ` ` contexto, `-` removida (sem número). Na revalidação,
 * `marcadas` são as linhas que a correção da rodada mudou: elas saem com `*` em vez de `+`.
 */
export function renderizar(item, marcadas = null) {
  const estado = item.removido ? 'removido' : item.novo ? 'novo' : 'alterado';
  const saida = [`### ${item.arquivo} (${estado})`];
  if (item.binario) return `${saida[0]}\n(binário — sem conteúdo para ler)`;
  item.trechos.forEach((t, i) => {
    if (i > 0) saida.push('      …');
    for (const l of t.linhas) {
      const num = l.numero === null ? '' : String(l.numero);
      const tipo = marcadas && l.numero !== null && marcadas.has(l.numero) ? '*' : l.tipo;
      saida.push(`${num.padStart(5)} ${tipo}| ${l.texto}`);
    }
  });
  return saida.join('\n');
}
