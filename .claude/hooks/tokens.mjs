// Harness Elo v2 — Tokens de preenchimento dos templates. Núcleo puro, sem I/O.
//
// Materializa a Decisão 17 da spec: VAZIO bloqueia, RASO relata. Vazio é fato mecânico —
// token de template que ninguém trocou, seção que ninguém escreveu. Raso é julgamento humano
// e continua aceito.
//
// A tabela lista os tokens LITERALMENTE, em vez de procurar por `<...>` com regex, porque
// heurística tropeçaria em `List<String>` e em `latência <10 ms`. O preço é manter a tabela
// junto com os templates; o teste `nenhum token esquecido` cobra isso automaticamente.

/**
 * Tokens que todo template embarca, independente de qual seja.
 *
 * `<data>`, e NÃO `AAAA-MM-DD`, que é o que morava aqui. Duas razões, e a segunda é a que decide.
 *
 * 1. Convenção. Todo outro placeholder do repositório é `<...>` — `<produto>`, `<nnn>`,
 *    `<artefato>`. `AAAA-MM-DD` era o único fora dela.
 * 2. `AAAA-MM-DD` é ALÉM DE placeholder o jeito certo de documentar formato de data, e um
 *    `modelo-de-dados.md` bem preenchido escreve `| vencimento | data | AAAA-MM-DD |` de propósito.
 *    Medido na rodada I: o documento correto era acusado, e a mensagem mandava *"escreva por que
 *    não se aplica"* sobre texto perfeitamente preenchido. Falso positivo que sobrevive ao
 *    preenchimento não tem correção do lado do consultor — só apaziguamento —, e um informativo
 *    com essa taxa é desligado antes de proteger qualquer coisa.
 *
 * A captura do que importa não se perde: a linha de changelog não preenchida
 * (`| 0.1 | <data> | versão inicial |`) continua sendo pescada, porque o template agora traz
 * `<data>` ali. Ver `.claude/templates/*.md`.
 *
 * Este literal e os dos templates são UM PAR: trocar um sem o outro deixa o token universal sem
 * nenhum template que o embarque. O teste `nenhum token esquecido` cobra o lado do template.
 */
export const TOKENS_UNIVERSAIS = ['<data>'];

/** arquivo do template (sem diretório) → tokens literais que ele embarca. */
export const TOKENS_POR_TEMPLATE = new Map([
  ['workspace.md', [
    '<repo-docs>', '<repo-codigo>', '<repo-prototipo>', '<pasta>', '<org>', '<projeto>',
  ]],
  ['hld-funcional.md', [
    '<produto>', '<visão geral do produto>', '<CODIGO>', '<nome do módulo>',
    '<o que o módulo faz>', '<funcionalidade principal do módulo>',
  ]],
  ['especificacao-funcional.md', [
    '<produto>', '<persona>', '<perfil>', '<o que essa pessoa faz>', '<ação>',
    '<tela>', '<rota>', '<o que aparece na tela>', '<CODIGO>', '<nome do módulo>',
    '<nnn>', '<nome da funcionalidade>', '<o que ela faz>', '<enunciado da regra>',
  ]],
  ['especificacao-tecnica.md', [
    '<produto>', '<camada>', '<componente>', '<tecnologia>', '<para que serve>',
    '<sistema externo>', '<entrada ou saída>', '<que dados>', '<como se observa>',
    '<premissa>', '<o que se está assumindo>', '<nnn>',
  ]],
  ['modelo-de-dados.md', [
    '<produto>', '<entidade>', '<o que representa>', '<atributos>', '<nnn>',
    '<ENTIDADE_A>', '<ENTIDADE_B>', '<relação>',
  ]],
  ['gaps.md', [
    '<produto>', '<nnn>', '<questão em aberto>', '<alto, médio ou baixo>', '<quem responde>',
    '<artefato>', '<por que não se aplica>', '<quem>',
  ]],
]);

/** Remove comentários HTML — instrução de template pode citar token legitimamente. */
function semComentarios(texto) {
  return String(texto || '').replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Nome do arquivo, sem diretório, com barra do Windows normalizada, EM CAIXA BAIXA.
 *
 * A caixa baixa é a correção de uma divergência medida contra o `kit.mjs`: para
 * `outputs/explore/Gaps.md`, o `validadorPara` do kit responde `check-explore` (ele compara por
 * `chave()`, que normaliza e baixa a caixa), e este módulo respondia `[]` porque comparava o nome
 * cru. O resultado era falso NEGATIVO silencioso — a `gramatica` entrava no arquivo, conferia
 * cabeçalho, IDs e vocabulário, e simplesmente não olhava os tokens de preenchimento. Dois módulos
 * da Fundação discordando sobre "que documento é este" é a patologia que o Step 0 existiu para
 * eliminar; ela não pode voltar entre `kit.mjs` e `tokens.mjs`.
 *
 * `toLowerCase` e não `toLocaleLowerCase`: a segunda depende do locale do processo (o `I` turco), e
 * a resposta a "que template é este arquivo" não pode mudar de máquina para máquina. É a mesma
 * escolha, pelo mesmo motivo, do `chave()` do kit.
 *
 * As chaves de `TOKENS_POR_TEMPLATE` são todas minúsculas — `chaveDoTemplate` abaixo baixa os dois
 * lados de qualquer forma, para que acrescentar uma entrada com maiúscula não reabra o buraco.
 */
function nomeDoArquivo(relPath) {
  const ultimo = String(relPath || '').replace(/\\/g, '/').split('/').filter(Boolean).pop();
  return (ultimo || '').toLowerCase();
}

/** `TOKENS_POR_TEMPLATE` indexado por nome em caixa baixa — ver `nomeDoArquivo`. */
const TOKENS_POR_CHAVE = new Map(
  [...TOKENS_POR_TEMPLATE].map(([arquivo, tokens]) => [String(arquivo).toLowerCase(), tokens]),
);

/**
 * Tokens do template correspondente que sobreviveram no texto.
 * Ordem da tabela, sem duplicatas. Arquivo sem template conhecido devolve lista vazia —
 * isto não é lista de permissão, é verificação de preenchimento.
 *
 * Tratamento de bloco de código — DELIBERADAMENTE OPOSTO ao de `secoesVazias` abaixo: aqui a
 * busca de token entra dentro do bloco (placeholder num diagrama Mermaid ainda é placeholder
 * não preenchido). Em `secoesVazias`, o título dentro do bloco é ignorado como estrutura (é
 * exemplo, não abre seção), mas as linhas do bloco contam como conteúdo da seção corrente. Duas
 * perguntas diferentes sobre o mesmo bloco — "tem token esquecido" vs. "a seção tem corpo" — cada
 * uma exige o oposto da outra. Um mantenedor de boa-fé que "uniformizar" as duas introduz bug.
 */
export function tokensSobreviventes(relPath, texto) {
  const especificos = TOKENS_POR_CHAVE.get(nomeDoArquivo(relPath));
  if (!especificos) return [];
  const corpo = semComentarios(texto);
  const achados = [];
  for (const t of [...especificos, ...TOKENS_UNIVERSAIS]) {
    if (corpo.includes(t) && !achados.includes(t)) achados.push(t);
  }
  return achados;
}

/**
 * Marcador de defeito devolvido por `secoesVazias` quando o documento termina com uma cerca de
 * código (```) aberta e nunca fechada. Não é título de seção real — é identificável por
 * construção (nenhum título de markdown começa com este texto) para o chamador distinguir
 * "seção vazia" de "documento não pôde ser avaliado com confiança". Ver `secoesVazias`.
 */
export const CERCA_NAO_FECHADA = '[defeito] cerca de código (```) aberta e não fechada até o fim do documento';

/**
 * Delimitador de cerca: três ou mais crases, ou três ou mais tis. `m[1]` é o delimitador (para
 * saber caractere e comprimento) e `m[2]` é o rótulo que vem depois dele.
 *
 * A indentação aceita é QUALQUER uma (`^\s*`), e não as até-três-colunas do CommonMark. Cerca
 * dentro de item de lista vem indentada de quatro espaços e é cerca de verdade; exigir três faria
 * o conteúdo dela voltar a contar como texto do documento. A escolha é a conservadora para a
 * pergunta que mais custa errar — ver `mapearCercas`.
 */
const RE_DELIMITADOR = /^\s*(`{3,}|~{3,})(.*)$/;

/**
 * Para cada linha do texto, ela está dentro de bloco de código cercado?
 *
 * ESTA É A ÚNICA NOÇÃO DE CERCA DO REPOSITÓRIO. Ela mora aqui porque `secoesVazias` foi quem
 * primeiro precisou dela, mas o `lerCarimbo` do `zonas.mjs` faz a MESMA pergunta por outro motivo
 * — não confundir um carimbo de congelamento com a CITAÇÃO de um — e duas noções de cerca divergem
 * na primeira vez que alguém corrige só uma. O que é compartilhado é a varredura; a decisão que
 * cada chamador toma em cima dela continua sendo dele (ver o comentário de `tokensSobreviventes`
 * sobre as respostas deliberadamente OPOSTAS que os dois lados dão sobre o mesmo bloco).
 *
 * Desde que o congelamento virou marcador, NENHUMA trava depende desta função — mas um verificador
 * INFORMATIVO já depende. Desde `4111622`, o `conferirPreenchimento` do `gramatica.mjs` chama
 * `secoesVazias` em toda escrita de documento do Explore, então errar aqui não custa mais só
 * "relatório para humano": custa mensagem falsa ao consultor, na hora, sobre um documento que ele
 * acabou de escrever. (O comentário anterior dizia que `secoesVazias` "não tem consumidor NENHUM
 * em produção" e que `gramatica` e `fecho-explore` "ainda não existem". Valia até `4111622`; o
 * `gramatica` existe e chama. O `fecho-explore` é que ainda não existe.) O outro chamador de fora
 * continua sendo o `lerCarimbo` do `zonas.mjs`, que é leitura para humano e para o `promocao.mjs`
 * (Plano 3).
 *
 * Devolve `{ linhas, dentro, naoFechada }`, com `dentro[i]` alinhado a `linhas[i]`. Os próprios
 * DELIMITADORES contam como "dentro": para `secoesVazias` eles são corpo da seção, e para o
 * carimbo eles nunca poderiam ser um carimbo de qualquer forma.
 *
 * O COMPRIMENTO DO DELIMITADOR IMPORTA, e é a parte que um toggle ingênuo (qualquer linha com
 * ``` inverte o estado) erra exatamente onde mais dói: documentar o procedimento do harness exige
 * uma cerca de QUATRO crases embrulhando uma de três, e num toggle a ``` interna fecharia a cerca
 * externa — o resto do documento voltaria a contar como texto, que é onde o carimbo citado mora.
 * Segue-se o CommonMark: só fecha um delimitador do mesmo caractere, comprimento maior ou igual ao
 * de abertura, e sem rótulo depois dele.
 *
 * Crase no rótulo NÃO abre bloco (``` `x` ``` é código em linha, não abertura), senão uma linha de
 * prosa com código em linha marcaria todo o resto do documento como cerca.
 */
export function mapearCercas(texto) {
  const linhas = String(texto == null ? '' : texto).split(/\r?\n/);
  const dentro = new Array(linhas.length).fill(false);
  let aberta = null; // { caractere, tamanho } da cerca corrente

  for (let i = 0; i < linhas.length; i++) {
    const m = RE_DELIMITADOR.exec(linhas[i]);
    if (aberta) {
      dentro[i] = true;
      const fecha = m && m[1][0] === aberta.caractere && m[1].length >= aberta.tamanho && m[2].trim() === '';
      if (fecha) aberta = null;
      continue;
    }
    // Abertura por crase exige rótulo sem crase; por til, qualquer rótulo serve (CommonMark).
    if (m && !(m[1][0] === '`' && m[2].includes('`'))) {
      aberta = { caractere: m[1][0], tamanho: m[1].length };
      dentro[i] = true;
    }
  }

  return { linhas, dentro, naoFechada: aberta !== null };
}

/**
 * Títulos cujo corpo está vazio depois de remover comentários HTML e espaço em branco.
 * Tabela, lista e diagrama contam como conteúdo.
 *
 * O RECORTE DA SEÇÃO É POR NÍVEL, e isto é o coração da função: um título abre uma seção que vai
 * até o próximo título de nível MENOR OU IGUAL, não até o próximo título qualquer. O conteúdo das
 * subseções conta como conteúdo do pai; o título da subseção, em si, não conta (senão qualquer pai
 * com um filho vazio ficaria "preenchido" pelo texto do próprio filho).
 *
 * Era "até o próximo título qualquer", e isso produzia a pior das quatro famílias de falso positivo
 * medidas na rodada I:
 *
 *     ## 2. Visão por módulo
 *     ### MOD-COBRANCA — Cobrança
 *     Emite boletos.
 *
 * → acusava `2. Visão por módulo` de estar vazia. O documento está certo, é a estrutura que os
 * próprios templates do harness distribuem (três seções assim em `hld-funcional.md` e
 * `especificacao-funcional.md`), e **o aviso sobrevive ao preenchimento**: não há nada que o
 * consultor escreva na subseção que o cale. A única saída era apaziguar a ferramenta com uma frase
 * de enchimento sob o título do pai. Verificador que exige isso é desligado na primeira semana.
 *
 * O recorte por nível é o MESMO que o `trechoDaSecao` do `revisao.mjs` já fazia (`m[1].length <=
 * nivel` para parar). Duas leituras de seção no mesmo repositório têm que concordar sobre onde uma
 * seção acaba — divergir aqui é a categoria de bug que este projeto já pagou várias vezes.
 *
 * O que NÃO afrouxou, e é o par que prende a decisão: seção de fato vazia continua acusada, e
 * subseção de fato vazia é acusada como SUBSEÇÃO, não como o pai.
 *
 * O rastreio de cerca é do `mapearCercas` acima — não um booleano local, que era o que morava
 * aqui: título DENTRO de um bloco de código é exemplo, não estrutura do documento, e não abre
 * seção. Mas as linhas do bloco CONTAM como conteúdo — seção cujo único corpo é um diagrama
 * Mermaid está preenchida, não vazia. Remover os blocos antes de contar inverteria essa resposta.
 * (Tratamento deliberadamente OPOSTO ao de `tokensSobreviventes` acima — ver o comentário lá.)
 *
 * Cerca aberta e nunca fechada é defeito em si, não seção vazia: sem o par de fechamento, o
 * estado "dentro de bloco" vazaria até o fim do documento, os títulos seguintes virariam corpo
 * da seção corrente, e a função devolveria `[]` — aprovando em silêncio um documento que não pôde
 * ser avaliado. Em vez disso, quando `mapearCercas` devolve `naoFechada`, a lista devolvida SEMPRE
 * inclui `CERCA_NAO_FECHADA`, além de qualquer seção vazia real encontrada antes da cerca — a
 * assinatura (array de strings) não muda; um gate que bloqueia em array não-vazio continua
 * funcionando sem precisar saber deste caso especial. (`dentroDeFence` era o booleano local que
 * `mapearCercas` substituiu; o nome não existe mais desde `571b0a7`.)
 */
export function secoesVazias(texto) {
  const { linhas, dentro, naoFechada } = mapearCercas(semComentarios(texto));

  const cabecalhos = [];
  for (let i = 0; i < linhas.length; i++) {
    if (dentro[i]) continue;
    const m = linhas[i].match(/^(#{2,6})\s+(.+?)\s*$/);
    if (m) cabecalhos.push({ i, nivel: m[1].length, titulo: m[2] });
  }
  const secoes = cabecalhos.map((c, k) => {
    let fim = linhas.length;
    for (let j = k + 1; j < cabecalhos.length; j++) {
      if (cabecalhos[j].nivel <= c.nivel) { fim = cabecalhos[j].i; break; }
    }
    const corpo = [];
    for (let i = c.i + 1; i < fim; i++) {
      if (!dentro[i] && /^#{2,6}\s+/.test(linhas[i])) continue; // título de subseção não é conteúdo
      corpo.push(linhas[i]);
    }
    return { titulo: c.titulo, corpo };
  });

  const vazias = secoes.filter((s) => s.corpo.join('').trim() === '').map((s) => s.titulo);
  if (naoFechada) vazias.push(CERCA_NAO_FECHADA);
  return vazias;
}
