// Harness Elo v2 — Workspace multi-repo (peça compartilhada). Núcleo puro + casca de I/O.
//
// Autoridade única de "qual repo é qual" e "onde os artefatos moram". NÃO decide política:
// devolve fato + `motivo`, e cada consumidor aplica a sua postura de falha — o delivery-gate
// é fail-safe (motivo → deny), o estado é soft (motivo → silêncio). Ser neutro é o que
// permite dois consumidores com posturas opostas lendo a mesma verdade.
//
// O helper readBlock é duplicado dos outros hooks de propósito: 5 linhas de regex primitiva
// custam menos que acoplar três hooks independentes.

export const PAPEIS = ['docs', 'codigo', 'prototipo'];
export const BRANCH_INTEGRACAO_DEFAULT = 'main';

function readBlock(text, name) {
  const re = new RegExp('<!--\\s*' + name + '\\s*-->([\\s\\S]*?)<!--\\s*\\/' + name + '\\s*-->');
  const m = String(text || '').match(re);
  return m ? m[1] : null;
}

/** Nome canônico do repositório: último segmento da URL, sem `.git`, minúsculo. */
export function nomeDoRepo(url) {
  const s = String(url == null ? '' : url).trim();
  if (!s) return null;
  const semQuery = s.split(/[?#]/)[0].replace(/[/\\]+$/, '');
  const ultimo = semQuery.split(/[/\\:]/).filter(Boolean).pop();
  if (!ultimo) return null;
  return ultimo.replace(/\.git$/i, '').toLowerCase();
}

/**
 * Erro de manifesto. O código de erro pode ser:
 * - `manifesto-invalido` — manifesto bem-formado mas semanticamente inválido (papel fora do vocabulário, etc.)
 * - `template-nao-preenchido` — clone recém-feito do template: todas as entradas são placeholder (`<...>`)
 *   A casca de I/O trata ambos como erro (exit ≠ 0).
 */
function invalido(detalhe, erro = 'manifesto-invalido') {
  return { entradas: [], erro, detalhe };
}

/**
 * Campo que ainda é placeholder de template, no formato `<algo>`.
 *
 * EXPORTADA na rodada K, e a mudança é aditiva: nada aqui dentro mudou, só a visibilidade. O
 * `fecho-explore.mjs` precisa da MESMA resposta para os quatro campos do bloco `gate:isencao` — a
 * mensagem de negação dele imprime um bloco com `<url do repositório de docs>`, `<quem decidiu>`,
 * `<AAAA-MM-DD>` e `<por que o pré-projeto foi reduzido>`, e colá-lo sem editar abria a única
 * saída de emergência do único bloqueante da camada. "Este campo não foi preenchido de verdade" é
 * uma política só, e este arquivo é o dono dela desde o manifesto do template. Uma segunda escrita
 * divergiria, e este projeto já pagou por isso três vezes.
 */
export function ehPlaceholder(repositorio) {
  return /<[^<>]+>/.test(String(repositorio || ''));
}

/** Entradas do bloco `harness:workspace`, já validadas. */
export function parseManifesto(text) {
  const body = readBlock(text, 'harness:workspace');
  if (body == null) {
    return { entradas: [], erro: 'sem-manifesto', detalhe: 'bloco harness:workspace ausente' };
  }

  const brutas = [];
  for (const linha of String(body).split(/\r?\n/)) {
    const inicio = linha.match(/^\s*-\s*papel\s*:\s*(\S+)\s*$/i);
    if (inicio) {
      brutas.push({
        papel: inicio[1].toLowerCase(),
        repositorio: null,
        nome: null,
        branchIntegracao: BRANCH_INTEGRACAO_DEFAULT,
      });
      continue;
    }
    const campo = linha.match(/^\s+([a-z-]+)\s*:\s*(.+?)\s*$/i);
    if (!campo || brutas.length === 0) continue;
    const atual = brutas[brutas.length - 1];
    const chave = campo[1].toLowerCase();
    if (chave === 'repositorio') {
      atual.repositorio = campo[2];
      atual.nome = nomeDoRepo(campo[2]);
    } else if (chave === 'branch-de-integracao') {
      atual.branchIntegracao = campo[2];
    } else {
      // Chave desconhecida (ex.: typo `branch-integracao` por `branch-de-integracao`) não é
      // ignorada em silêncio: a prosa do workspace.md avisa que branch errada faz o gate
      // bloquear, então um typo aqui tem que virar manifesto inválido, não default silencioso.
      return invalido(`chave desconhecida "${chave}" na entrada de papel ${atual.papel}`);
    }
  }

  // Entrada cujo repositorio ainda carrega token de preenchimento (`<repo-codigo>` etc.) não foi
  // declarada de fato — é o placeholder que o template embarca comentado. Ignora como se a
  // entrada não existisse.
  const entradas = brutas.filter((e) => !ehPlaceholder(e.repositorio));

  // Diferencia os dois casos: bloco genuinamente vazio vs. bloco com entradas mas TODAS placeholder.
  // Erro diferente para cada: ajuda o consultor a entender o que viu na tela.
  if (entradas.length === 0) {
    if (brutas.length === 0) {
      // Bloco vazio de fato: nenhuma linha `- papel:`
      return invalido('nenhuma entrada `- papel:` no bloco');
    }
    // Bloco com entradas, mas TODAS ainda são placeholder. Extrai os tokens para a mensagem.
    const tokens = new Set();
    for (const e of brutas) {
      const m = String(e.repositorio || '').match(/<([^<>]+)>/g);
      if (m) m.forEach((t) => tokens.add(t));
    }
    const tokensStr = Array.from(tokens).join(', ');
    const detalhe = `manifesto ainda não foi preenchido — todos os repositórios têm placeholders: ${tokensStr}. Edite o bloco harness:workspace em workspace.md com os URLs reais`;
    return invalido(detalhe, 'template-nao-preenchido');
  }

  for (const e of entradas) {
    if (!PAPEIS.includes(e.papel)) {
      return invalido(`papel fora do vocabulário: ${e.papel} (aceitos: ${PAPEIS.join(', ')})`);
    }
    if (!e.nome) return invalido(`entrada com papel ${e.papel} sem campo repositorio`);
  }

  const docs = entradas.filter((e) => e.papel === 'docs');
  if (docs.length !== 1) {
    return invalido(`o manifesto precisa de exatamente um papel docs (encontrados: ${docs.length})`);
  }

  const vistos = new Set();
  for (const e of entradas) {
    if (vistos.has(e.nome)) return invalido(`nome de repositório duplicado: ${e.nome}`);
    vistos.add(e.nome);
  }

  return { entradas, erro: null, detalhe: null };
}

import { resolve } from 'node:path';

function stripQuotes(s) { return s ? s.replace(/^['"]|['"]$/g, '') : s; }

/**
 * Inspeciona um `git …`: pula opções globais (`-C dir`, `-c k=v`, `--git-dir`, `--work-tree`,
 * outras flags) e devolve o subcomando, se houve `--git-dir`/`--work-tree`, e o argumento de `-C`.
 * É assim que `git commit -C <commit>` (subcomando `commit`) não é confundido com `git -C <dir>`.
 *
 * EXPORTADA na Task 2B: `escrita-bash.mjs` precisa da mesma resposta — qual é o subcomando (para
 * saber se ele só lê) e qual é o diretório de `-C` (para saber que arquivo ele toca). Achar o
 * subcomando de um `git` é leitura de shell, e a regra do plano é que ela mora no módulo dono. Uma
 * segunda cópia divergiria, e a que divergisse por último seria a trava.
 */
export function analisarGit(tokens) {
  let i = 1, sub = null, cDir = null, gd = false;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === '-C' && tokens[i + 1] != null) { cDir = tokens[i + 1]; i += 2; continue; }
    if (t === '-c' && tokens[i + 1] != null) { i += 2; continue; }
    if (/^--(git-dir|work-tree)(=|$)/.test(t)) { gd = true; i += (t.includes('=') ? 1 : 2); continue; }
    if (t.startsWith('-')) { i += 1; continue; }
    sub = t; break;
  }
  return { sub, gd, cDir };
}

/**
 * Palavras que o shell reserva. Nenhuma delas é o COMANDO do segmento, e ler `for`, `if` ou `[`
 * como se fosse produziu falso positivo em série na trava do `Bash` — a mensagem chegava a dizer
 * "`done` toca outputs/explore/gaps.md", nomeando como comando algo que não existe.
 *
 * Elas são puladas só no INÍCIO do segmento, e só até aparecer a primeira palavra que não é
 * reservada: é assim que `time rm -rf .claude/hooks` continua sendo lido como `rm`. Pular no meio
 * seria mudar o que o segmento executa; pular no início é achar o que ele executa.
 */
const PALAVRAS_DE_SHELL = new Set(['for', 'while', 'until', 'if', 'then', 'else', 'elif', 'fi',
  'do', 'done', 'case', 'esac', 'in', 'select', 'function', 'time', '[', '[[', 'test']);

/**
 * Pula o CORPO de um heredoc. Recebe o índice do primeiro `<` e devolve o índice de onde o laço
 * do tokenizador deve continuar; empilha o delimitador como token.
 *
 * O corpo de um heredoc é DADO, nunca comando: `cat > nota.md <<'EOF' … EOF` escreve em
 * `nota.md`, e o que está entre os dois `EOF` é o texto do documento. Lê-lo como tokens gerava as
 * duas piores falhas de uma vez — negar a escrita de um documento porque a PROSA dele cita um
 * caminho protegido, e pagar tokenização por linha (medido: 581 ms num heredoc de 300 linhas).
 */
function pularHeredoc(s, i, tokens) {
  let j = i + 2;
  const guiao = s[j] === '-'; // `<<-` permite terminador indentado por tabulação
  if (guiao) j += 1;
  while (s[j] === ' ' || s[j] === '\t') j += 1;

  let delim = '';
  const aspa = (s[j] === "'" || s[j] === '"') ? s[j] : null;
  if (aspa) {
    j += 1;
    while (j < s.length && s[j] !== aspa) { delim += s[j]; j += 1; }
    j += 1;
  } else {
    while (j < s.length && !/[\s;&|<>]/.test(s[j])) { delim += s[j]; j += 1; }
  }
  tokens.push(delim);

  const nl = s.indexOf('\n', j);
  if (delim === '' || nl === -1) return s.length; // sem corpo: nada a pular
  let pos = nl + 1;
  for (;;) {
    const fim = s.indexOf('\n', pos);
    const linha = fim === -1 ? s.slice(pos) : s.slice(pos, fim);
    // Terminador de `<<` fica na coluna zero; o de `<<-` pode vir indentado. `trimEnd` nos dois
    // por causa do `\r` de fim de linha do Windows.
    if ((guiao ? linha.trim() : linha.trimEnd()) === delim) return fim === -1 ? s.length : fim - 1;
    if (fim === -1) return s.length; // heredoc sem terminador: o resto é corpo
    pos = fim + 1;
  }
}

/**
 * Parte o comando em segmentos executáveis, respeitando aspas. Devolve, para cada segmento, a
 * lista de tokens já sem aspas, e se a leitura terminou DENTRO de aspas.
 *
 * NÃO INTERPRETA SHELL, e as omissões abaixo são deliberadas:
 *   - `\` NÃO é escape. Num harness que roda no Windows, `\` é separador de caminho: tratá-lo
 *     como escape transformaria `.claude\hooks\kit.mjs` em `.claudehookskit.mjs`, que não casa a
 *     zona imutável — a trava sumiria exatamente onde ela roda;
 *   - `$VAR`, `$(...)` e `eval` passam intactos. Interpretar isso é reimplementar o bash;
 *   - `&` sozinho (background) NÃO parte segmento, só `&&`. Era assim antes da extração.
 *
 * A CONSEQUÊNCIA DE `\` NÃO SER ESCAPE, que precisa estar escrita: `echo "a\"b"` fecha as aspas
 * onde o bash não fecharia, o parser dessincroniza, e o resto da linha vira um token inerte — em
 * `echo "a\"b" && rm -rf .claude/hooks` o `rm` some da leitura. Por isso `aspasAbertas` existe e
 * é devolvida: quem consome decide o que fazer com uma leitura que se sabe quebrada. O
 * `resolverDiretorioDoComando` a trata como irresolvível (um push pode estar escondido ali); a
 * trava do `Bash` não nega por ela, porque `cd "C:\dir\" && npm test` e `echo it's ok` cairiam
 * junto — e sob aquele modelo de ameaça o falso positivo é o pior dos dois erros.
 *
 * `>`, `>>` e `<` viram TOKEN PRÓPRIO mesmo colados (`x>>f`): quem lê o comando depois precisa
 * saber qual token é ALVO DE REDIREÇÃO, e essa é a única diferença entre `cat a > b` (escreve em
 * `b`) e `cat a b` (não escreve em lugar nenhum).
 */
function partirEmSegmentos(command) {
  const s = String(command == null ? '' : command);
  const segmentos = [];
  let tokens = [];
  let atual = '';
  let temToken = false; // distingue token vazio de ausência de token: `""` é um token
  let aspas = null;

  const fecharToken = () => { if (temToken) { tokens.push(atual); atual = ''; temToken = false; } };
  const fecharSegmento = () => { fecharToken(); segmentos.push(tokens); tokens = []; };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (aspas) {
      if (c === aspas) { aspas = null; continue; }
      atual += c; temToken = true; continue;
    }
    if (c === '"' || c === "'") { aspas = c; temToken = true; continue; }
    // `#` só abre comentário no INÍCIO de uma palavra — é a regra do próprio shell, e é o que
    // mantém `rm -rf a#b` e `--define:X=#` literais.
    if (c === '#' && !temToken) { while (i < s.length && s[i] !== '\n') i += 1; i -= 1; continue; }
    if (c === '<' && s[i + 1] === '<' && s[i + 2] !== '<') {
      fecharToken();
      tokens.push('<<');
      i = pularHeredoc(s, i, tokens);
      continue;
    }
    if (c === '>' || c === '<') {
      fecharToken();
      if (c === '>' && s[i + 1] === '>') { tokens.push('>>'); i += 1; } else { tokens.push(c); }
      continue;
    }
    if (c === '&' && s[i + 1] === '&') { fecharSegmento(); i += 1; continue; }
    if (c === '|' && s[i + 1] === '|') { fecharSegmento(); i += 1; continue; }
    if (c === '|' || c === ';' || c === '\n') { fecharSegmento(); continue; }
    if (/\s/.test(c)) { fecharToken(); continue; }
    atual += c; temToken = true;
  }
  fecharSegmento();
  return { segmentos, aspasAbertas: aspas !== null };
}

/**
 * Parte o comando em segmentos executáveis e devolve, para cada um, os tokens e o diretório em
 * vigor — `cd` já resolvido. Segmento que é só `cd` não entra na lista: ele muda o estado, não
 * escreve nada.
 *
 * Existe extraída porque dois consumidores precisam da MESMA leitura de comando:
 * `resolverDiretorioDoComando` (qual diretório o `git push` atinge) e `escrita-bash.mjs` (qual
 * caminho o comando toca). Duas leituras de shell no mesmo repositório divergem, e a que
 * divergisse por último seria a trava.
 *
 * `houveCd` aparece DUAS vezes, e não é redundância:
 *   - no topo, é "houve algum `cd` no comando inteiro";
 *   - em cada segmento, é "houve `cd` ANTES deste segmento". É esse que
 *     `resolverDiretorioDoComando` usa para decidir push pelado em multi-repo. Com o valor final,
 *     `git push … && cd app` passaria a resolver um push que era irresolvível — a extração teria
 *     afrouxado o gate em silêncio.
 *
 * `cd` SEM ARGUMENTO não é troca de diretório: continua sendo um segmento comum, como era antes
 * da extração. E só a forma literal é seguida — `cd $DIR` e `cd $(...)` não são resolvidos, e o
 * segmento seguinte fica com o diretório anterior.
 */
export function segmentarComando(command, cwd) {
  const segmentos = [];
  let dir = cwd;
  let houveCd = false;
  const { segmentos: brutos, aspasAbertas } = partirEmSegmentos(command);

  for (const bruto of brutos) {
    let tokens = bruto;
    // Prefixo de variável de ambiente e palavra reservada: nenhum dos dois é o comando, e os dois
    // vêm antes dele. `while` porque `time FOO=1 rm x` tem os dois.
    while (tokens.length && (/^\w+=/.test(tokens[0]) || PALAVRAS_DE_SHELL.has(tokens[0]))) {
      tokens = tokens.slice(1);
    }
    if (tokens.length === 0) continue;

    if (tokens[0] === 'cd' && tokens[1]) {
      dir = resolve(dir, stripQuotes(tokens[1]));
      houveCd = true;
      continue;
    }
    segmentos.push({ tokens, dir, houveCd });
  }

  return { segmentos, houveCd, aspasAbertas };
}

/**
 * Diretório efetivo do comando de push/PR. Reconhece pouco de propósito: cada forma
 * aceita é uma chance de resolver errado e liberar um push que devia parar.
 * `irresolvivel` não é erro do usuário — é o gate pedindo a forma canônica `git -C <repo>`.
 *
 * Só um comando de push/PR é ponto de decisão. Comandos git intermediários (fetch, status,
 * commit) são ignorados — mas um `cd` anterior já ajustou o diretório.
 *
 * O gate roda UMA vez por comando Bash e avalia UM repositório. Push/PR para mais de um
 * diretório DISTINTO na mesma cadeia não é fiscalizável → em multi-repo, `multiplos-push`
 * (deny, "um push por comando"). N push/PR ao MESMO repo (retry, push+PR com cd) são ok.
 */
export function resolverDiretorioDoComando(command, cwd, opts = {}) {
  const multiRepo = !!opts.multiRepo;
  // A leitura do comando — partir, tirar aspas, tirar env var, rastrear `cd` — mora em
  // `segmentarComando`. Aqui fica só o que é sobre push/PR.
  const { segmentos, aspasAbertas } = segmentarComando(command, cwd);

  // Leitura quebrada não vira "não há push aqui". Medido: `echo "a\"b" && git push` engole o push
  // inteiro (ver `partirEmSegmentos`), e o gate passaria a responder `{cwd, resolvível}` sobre um
  // comando que empurra. Esta é a postura fail-safe que o gate já aplica a `--git-dir`: não é erro
  // do usuário, é o gate pedindo a forma canônica `git -C <repo>`.
  if (aspasAbertas) return { diretorio: null, irresolvivel: true, motivo: 'aspas-nao-fechadas' };

  const dirsDePush = []; // dir efetivo de cada push/PR; null = irresolvível (git-dir; ou push pelado em multi-repo)

  for (const { tokens, dir, houveCd } of segmentos) {
    if (tokens[0] === 'git') {
      const { sub, gd, cDir } = analisarGit(tokens);
      if (sub !== 'push') continue; // git não-push → ignora (o cd anterior já contou)
      if (gd) { dirsDePush.push(null); continue; } // --git-dir/--work-tree → irresolvível
      if (cDir) { dirsDePush.push(resolve(dir, stripQuotes(cDir))); continue; }
      dirsDePush.push(houveCd || !multiRepo ? dir : null); // sem -C: usa o cd; em multi-repo sem cd é irresolvível
      continue;
    }
    if (tokens[0] === 'gh' && tokens[1] === 'pr' && tokens[2] === 'create') { dirsDePush.push(dir); continue; }
    if (tokens[0] === 'az' && tokens[1] === 'repos' && tokens[2] === 'pr' && tokens[3] === 'create') { dirsDePush.push(dir); continue; }
    // qualquer outro comando → ignora
  }

  if (dirsDePush.length === 0) return { diretorio: cwd, irresolvivel: false };

  const distintos = new Set(dirsDePush.filter((d) => d != null));
  if (multiRepo && distintos.size > 1) {
    return { diretorio: null, irresolvivel: true, motivo: 'multiplos-push' };
  }
  if (dirsDePush.some((d) => d == null)) {
    return { diretorio: null, irresolvivel: true }; // push irresolvível (git-dir, ou pelado em multi-repo)
  }
  return { diretorio: [...distintos][0], irresolvivel: false };
}

/** Papel do repositório cujo `origin` é `remoteUrl`, segundo o manifesto. */
export function classificarRepo(manifesto, remoteUrl) {
  const nome = nomeDoRepo(remoteUrl);
  if (!nome) {
    return { papel: 'desconhecido', nome: null, branchIntegracao: BRANCH_INTEGRACAO_DEFAULT, motivo: 'sem-remote' };
  }
  const e = ((manifesto && manifesto.entradas) || []).find((x) => x.nome === nome);
  if (!e) {
    return { papel: 'desconhecido', nome, branchIntegracao: BRANCH_INTEGRACAO_DEFAULT, motivo: 'repo-nao-declarado' };
  }
  return { papel: e.papel, nome, branchIntegracao: e.branchIntegracao, motivo: null };
}

/**
 * O manifesto declara algum repositório com este papel?
 * Consumido pelo detectarFase do kit.mjs: repositório com papel `codigo` significa Deliver.
 * Manifesto inválido ou ausente devolve false — quem aplica política de falha é o consumidor.
 */
export function temRepoComPapel(manifesto, papel) {
  const entradas = (manifesto && manifesto.entradas) || [];
  return entradas.some((e) => e.papel === String(papel || '').toLowerCase());
}

// ————— o layout dos repositórios no disco (D53 do teste ponta a ponta da 2.6.0) —————
//
// O LAYOUT SUPORTADO É UM SÓ, e até aqui nenhum documento o dizia: em multi-repo a sessão abre na
// PASTA-PAI, com os repositórios lado a lado como subpastas dela (`descobrirWorkspace`). Com um
// repositório ANINHADO dentro do de docs — `codigo/` no repo de docs, o layout que o teste ponta a
// ponta montou —, a `cwd` é o próprio repo de docs, não há subpasta candidata, o harness cai em
// mono-repo, e o `delivery-gate` trata TODO push como código (é o comportamento legado do
// mono-repo: papel ausente vale `codigo`). O push do repo de docs passou a exigir auditoria de US e
// foi negado, embora o manifesto dissesse que `docs` é livre.
//
// AQUI SÓ SE DETECTA E SE AVISA, e não se suporta o aninhado, por decisão: suportá-lo é mudar
// quem o `delivery-gate` (bloqueante) considera código num projeto mono-repo, e o mono-repo de
// verdade — código e docs no MESMO repositório — depende exatamente do comportamento que mudaria.
// A detecção lê a coluna «Pasta local» da tabela «Repositórios» do `workspace.md`, que era só
// descritiva: a política continua no bloco `harness:workspace`, e a pasta serve para avisar.

/** Pasta local normalizada: barra normal, sem `./` na frente nem barra no fim; vazia vira `.`. */
function normalizarPasta(p) {
  let s = String(p || '').replace(/[`]/g, '').trim().replace(/\\/g, '/');
  while (s.startsWith('./')) s = s.slice(2);
  s = s.replace(/\/+$/, '');
  return s === '' ? '.' : s;
}

/**
 * As linhas da tabela «Repositórios» do `workspace.md` que declaram uma pasta local de verdade:
 * `[{ papel, repositorio, pasta }]`, com a pasta normalizada (`codigo/` → `codigo`). A tabela é
 * achada pelo cabeçalho — colunas `Papel` e `Pasta local` —, papel fora do vocabulário é ignorado,
 * e pasta com token de preenchimento (`<pasta>`, o do template) não é declaração.
 */
export function pastasLocais(texto) {
  const saida = [];
  let colunas = null;
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha.startsWith('|')) { colunas = null; continue; }
    const cs = linha.split('|').slice(1, -1).map((c) => c.trim());
    if (!colunas) {
      const baixas = cs.map((c) => c.toLowerCase());
      if (baixas.includes('papel') && baixas.some((c) => c.startsWith('pasta local'))) colunas = baixas;
      continue;
    }
    if (cs.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    const papel = String(cs[colunas.indexOf('papel')] || '').replace(/[`]/g, '').trim().toLowerCase();
    const iRepo = colunas.findIndex((c) => c.startsWith('reposit'));
    const repositorio = iRepo < 0 ? '' : String(cs[iRepo] || '').replace(/[`]/g, '').trim();
    const pastaBruta = cs[colunas.findIndex((c) => c.startsWith('pasta local'))];
    if (!PAPEIS.includes(papel) || !String(pastaBruta || '').trim() || ehPlaceholder(pastaBruta)) continue;
    saida.push({ papel, repositorio, pasta: normalizarPasta(pastaBruta) });
  }
  return saida;
}

/**
 * Os repositórios que o manifesto declara DENTRO da pasta do repo de docs — o layout que o
 * `delivery-gate` não reconhece. `[{ papel, repositorio, pasta, pastaDocs }]`.
 *
 * Aninhado é: a pasta do outro repo começa com a do de docs (`portal-docs/api` dentro de
 * `portal-docs`), ou a do de docs é `.` e a do outro é relativa sem subir (`codigo` dentro de `.`).
 * Pasta que sobe (`../x`) é irmã; pasta absoluta só se compara com a do de docs também absoluta;
 * pasta igual à do de docs não é aninhamento (é o mesmo lugar, e não há o que avisar aqui).
 * Sem linha de docs com pasta declarada não há referência, e a resposta é vazia.
 */
export function reposAninhados(texto) {
  const pastas = pastasLocais(texto);
  const docs = pastas.find((p) => p.papel === 'docs');
  if (!docs) return [];
  const absoluta = (p) => /^(?:[a-zA-Z]:)?\//.test(p);
  const dentro = (p) => {
    if (p === docs.pasta || p === '..' || p.startsWith('../')) return false;
    if (docs.pasta === '.') return !absoluta(p);
    return p.toLowerCase().startsWith(docs.pasta.toLowerCase() + '/');
  };
  return pastas
    .filter((p) => p.papel !== 'docs' && dentro(p.pasta))
    .map((p) => ({ ...p, pastaDocs: docs.pasta }));
}

/**
 * O aviso — UM texto, consumido pelo `estado` (SessionStart) e pelo `--validar`. `null` sem nada a
 * avisar. Diz o que acontece (o gate trata o repo de docs como código) e o que fazer (o layout
 * suportado), porque quem lê está prestes a dar push e não vai abrir este arquivo.
 */
export function avisoDeAninhamento(aninhados) {
  if (!aninhados || !aninhados.length) return null;
  const lista = aninhados
    .map((a) => `\`${a.pasta}/\` (\`${a.repositorio || '?'}\`, papel \`${a.papel}\`)`)
    .join(', ');
  return '⚠️ **Repositório aninhado no repo de docs:** ' + lista + '. O `delivery-gate` só ' +
    'reconhece o workspace multi-repo com a sessão aberta na **pasta-pai**, com os repositórios lado ' +
    'a lado; com um repositório dentro do de docs ele cai em modo mono-repo e trata todo push como ' +
    'código — o push de branch do próprio repo de docs passa a exigir auditoria de US e é negado. ' +
    'Tire o repositório de dentro do de docs (irmão dele, na mesma pasta-pai) e abra a sessão na ' +
    'pasta-pai. O layout está descrito em `.claude/templates/workspace.md`.';
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
// "Esta pasta tem documento de verdade, ou só o `.gitkeep` do esqueleto?" tem UM dono neste
// repositório, e é o `inventariar`. Ver o JSDoc de `temArtefatos`.
import { inventariar } from './kit.mjs';

// O manifesto vive na RAIZ do repo de docs, não sob docs/: no V2 a árvore de artefatos é
// outputs/, e o manifesto não é artefato de fase — é a fonte de "qual repo é qual".
export const MANIFESTO_REL = 'workspace.md';
const IGNORAR = new Set(['.claude', '.git', 'node_modules']);

function git(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/**
 * A `cwd` é ela mesma uma raiz de artefatos? QUEM TEM CONTEÚDO GANHA — ver `descobrirWorkspace`.
 *
 * O CRITÉRIO É CONTEÚDO NO `outputs/explore/`, e não a existência das pastas. O template ENTREGA o
 * esqueleto: `inputs/.gitkeep`, `outputs/explore/.gitkeep` e `outputs/spec/.gitkeep` estão
 * RASTREADOS no git. Então a `cwd` de todo clone tem as duas pastas, e perguntar por existência
 * respondia "sim" **sempre** — inclusive em todo workspace multi-repo, onde a resposta certa é "não".
 *
 * SÓ O `outputs/explore/`, e a segunda pasta não entra. Um Explore recém-começado tem UM documento
 * em `outputs/explore/` e nada em `outputs/spec/` — o `outputs/spec/` só se enche no Plan —, e ele é
 * projeto de verdade: exigir conteúdo nas DUAS deixaria a raiz dele de fora até o primeiro artefato
 * de Plan. É a regra mais simples que resolve os dois casos, e o que ela deliberadamente NÃO resolve
 * está escrito no JSDoc do `descobrirWorkspace`.
 *
 * QUEM ANDA O DIRETÓRIO É O `inventariar` (kit.mjs), e a reutilização é o ponto: ele já anda
 * recursivamente, já ignora `.gitkeep` (esqueleto não é documento), já lê `ENOENT`/`ENOTDIR` como
 * "nada existe" e já RELANÇA qualquer outro erro. Uma segunda noção de "pasta vazia" neste
 * repositório divergiria da dele, e divergência entre duas noções da mesma coisa é a família de
 * defeito que esta série vem fechando.
 *
 * RELANÇA erro de I/O que não seja ausência, e quem chama converte em `motivo` — o `existsSync` que
 * estava aqui devolvia `false` para QUALQUER erro e não passava pelo `io`: pasta que não pudesse ser
 * verificada fazia o ramo não disparar, e o veredito voltava a ser `allow` silencioso num bloqueante.
 *
 * M3 MORREU DE GRAÇA: `outputs/explore` como ARQUIVO (não diretório) na `cwd` fazia a `cwd` ganhar,
 * porque `existsSync` não distingue os dois. Aqui um arquivo no lugar do diretório levanta
 * `ENOTDIR`/`ENOENT`, que o `inventariar` lê como ausência — conjunto vazio, a `cwd` não ganha.
 */
function temArtefatos(dir, lerDiretorio) {
  return inventariar(join(dir, 'outputs', 'explore'), lerDiretorio).size > 0;
}

/**
 * Descobre se o cwd é raiz de workspace multi-repo e qual subpasta é o repo de docs.
 * Candidata = subpasta de primeiro nível com `outputs/explore` E `outputs/spec`.
 * Zero candidatas = mono-repo legado (o próprio cwd é a raiz dos artefatos).
 *
 * A `cwd` GANHA DA CANDIDATA QUANDO O `outputs/explore/` DELA TEM CONTEÚDO — documento de verdade,
 * não o `.gitkeep` do esqueleto. Uma regra, e ela resolve os dois casos opostos:
 *
 *   - MONO-REPO COM BACKUP: a raiz tem conteúdo ⇒ a raiz ganha ⇒ as travas continuam negando. Sem
 *     este ramo, UMA subpasta de primeiro nível com `outputs/explore` E `outputs/spec` bastava para
 *     esta função responder `multiRepo: true` com a raiz na SUBPASTA — a `cwd` nunca era consultada
 *     como raiz de artefatos, nem quando era obviamente ela. As duas travas bloqueantes que resolvem
 *     a raiz por aqui (`congelamento`, em pretooluse.mjs, e `escrita-bash`) relativizavam
 *     `outputs/explore/gaps.md` DA RAIZ contra a subpasta, recebiam `null`, e LIBERAVAM escrita num
 *     Explore congelado sem mensagem nenhuma. Gatilho: congelar em mono-repo e depois copiar
 *     `outputs/` para `backup-antes-do-congelamento/`, ou vendorizar um pré-projeto de exemplo;
 *   - MULTI-REPO DE VERDADE: a raiz tem só o esqueleto ⇒ a subpasta ganha ⇒ o repo de docs volta a
 *     ser governado. A versão por EXISTÊNCIA deste ramo desligava multi-repo em TODO clone do
 *     template, porque o template entrega `outputs/explore/.gitkeep` e `outputs/spec/.gitkeep`
 *     rastreados no git: a `cwd` tinha as duas pastas sempre, e ganhava sempre. Medido por execução
 *     num clone real com o Explore congelado no repo de docs: `Write`, `sed -i` e `rm -rf` no
 *     Explore congelado devolviam os três `allow`. Não era caso de borda — era o padrão.
 *
 * O ramo mora AQUI, e não nos consumidores, porque a raiz dos artefatos tem UM dono neste
 * repositório e é esta função — quatro verificadores a consomem, três deles bloqueantes, e um
 * segundo lugar que decidisse "quem é a raiz" divergiria deste.
 *
 * SÓ O `outputs/explore/` É CONSULTADO. Ver o JSDoc de `temArtefatos` para o porquê (Explore
 * recém-começado tem documento no Explore e nada no `outputs/spec/`) e para a reutilização do
 * `inventariar`, que é quem sabe ignorar `.gitkeep`.
 *
 * FALHA FECHADO, e este ramo não falhava: `inventariar` RELANÇA erro de I/O que não seja ausência,
 * e o `catch` abaixo o converte em `motivo: 'cwd-ilegivel'`. Antes eram dois `existsSync`, que
 * devolvem `false` para qualquer erro e não passam pelo `io` — pasta que não pudesse ser verificada
 * fazia o ramo não disparar, e o veredito voltava a ser o do defeito. Não há resposta segura por
 * omissão aqui: supor "sem conteúdo" entrega a raiz à candidata (o Explore da raiz fica sem trava) e
 * supor "com conteúdo" entrega a raiz à `cwd` (o Explore da candidata fica sem trava). Quem não sabe
 * onde está a raiz não libera — nomeia o fato, e os três bloqueantes negam por
 * `avaliarRaizIndeterminada` (zonas.mjs).
 *
 * O QUE A REGRA DELIBERADAMENTE NÃO RESOLVE, e é preciso estar escrito: um workspace multi-repo em
 * que alguém põe documento no `outputs/explore/` DA RAIZ. Aí a raiz ganha, e a candidata deixa de
 * ser governada — o Explore DELA cai fora da raiz dos artefatos e fica escrivível. É o mesmo lado da
 * troca que o layout `cwd` + backup faz de propósito: quem carrega o Explore do projeto é o
 * `outputs/explore/` que tem documento, e negar escrita numa cópia de backup seria falso positivo em
 * trabalho legítimo (apagar o próprio backup depois de conferi-lo). Sob o modelo de ameaça —
 * acidente e deriva, não adversário — esta é a resposta defensável, e o preço é que "documento no
 * Explore da raiz" e "raiz de artefatos" são a mesma coisa para esta função. Distinguir os dois
 * exigiria política nova (ler o manifesto para saber que o projeto é multi-repo), e ela teria o
 * problema do ovo e da galinha: o manifesto mora no repo de docs, que é o que se está procurando.
 *
 * CUSTO: uma varredura de `outputs/explore/` da `cwd` por descoberta, e só quando existe candidata —
 * com zero candidatas o veredito já era "mono-repo, raiz = cwd", então perguntar não mudaria
 * resposta nenhuma e o caminho comum (mono-repo sem subpasta candidata) não paga nada. Em multi-repo
 * a varredura para no primeiro `readdir`, que dá `ENOENT`/conjunto vazio. Medido no relatório da
 * Task 4d.
 *
 * `lerDiretorio` é ponto de injeção só para teste (simular erro de I/O que não seja ausência) —
 * chamadores de produção usam o default. Ele atende AS DUAS leituras: a listagem do próprio `cwd` e
 * a varredura de `<cwd>/outputs/explore` do ramo acima, que passa por ele via `inventariar`. Só
 * ENOENT/ENOTDIR significam "nada existe" — do `cwd`, "mono-repo"; do `outputs/explore`, "sem
 * conteúdo". Qualquer outro erro (permissão, I/O) devolve `motivo: 'cwd-ilegivel'` e `detalhe` com o
 * código, para o consumidor fail-safe (delivery-gate) poder negar em vez de receber `motivo: null` —
 * "está tudo bem" — sobre um cwd que não pôde ser lido. O `detalhe` diz QUAL das duas leituras
 * falhou (a do `outputs/explore` acrescenta ` em outputs/explore`). Mesmo raciocínio do
 * `inventariar` em kit.mjs.
 */
export function descobrirWorkspace(cwd, lerDiretorio = readdirSync) {
  let candidatas = [];
  let erroIO = null;
  try {
    candidatas = lerDiretorio(cwd, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !IGNORAR.has(d.name) && !d.name.startsWith('.'))
      .map((d) => d.name)
      .filter((nome) => existsSync(join(cwd, nome, 'outputs', 'explore')) && existsSync(join(cwd, nome, 'outputs', 'spec')));
  } catch (erro) {
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) {
      candidatas = []; // cwd ausente → nada existe, trata como mono-repo
    } else {
      erroIO = erro;
    }
  }

  if (erroIO) {
    return {
      multiRepo: false, docsDir: cwd, raizArtefatos: cwd,
      motivo: 'cwd-ilegivel', detalhe: erroIO.code || String(erroIO.message || erroIO),
    };
  }
  // QUEM TEM CONTEÚDO GANHA: a `cwd` só vence a candidata quando o `outputs/explore/` DELA tem
  // documento de verdade. Vale para uma candidata (o `allow` silencioso do backup) e para várias (a
  // ambiguidade deixa de existir). Erro de leitura NÃO degrada para "sem conteúdo" — ver o JSDoc.
  if (candidatas.length > 0) {
    let cwdTemConteudo = false;
    try {
      cwdTemConteudo = temArtefatos(cwd, lerDiretorio);
    } catch (erro) {
      return {
        multiRepo: false, docsDir: cwd, raizArtefatos: cwd,
        motivo: 'cwd-ilegivel',
        detalhe: `${erro && erro.code ? erro.code : String((erro && erro.message) || erro)} em outputs/explore`,
      };
    }
    if (cwdTemConteudo) {
      return { multiRepo: false, docsDir: cwd, raizArtefatos: cwd, motivo: null, detalhe: null };
    }
  }
  if (candidatas.length === 1) {
    const docsDir = join(cwd, candidatas[0]);
    return { multiRepo: true, docsDir, raizArtefatos: docsDir, motivo: null, detalhe: null };
  }
  if (candidatas.length === 0) {
    return { multiRepo: false, docsDir: cwd, raizArtefatos: cwd, motivo: null, detalhe: null };
  }
  return {
    multiRepo: true, docsDir: null, raizArtefatos: null,
    motivo: 'ambiguo', detalhe: `pastas candidatas a repo de docs: ${candidatas.join(', ')}`,
  };
}

/**
 * Um resolvedor de "este caminho, relativo à raiz dos ARTEFATOS" para o workspace de `cwd`.
 *
 * POR QUE ELE EXISTE, e não é economia de linha. Duas travas bloqueantes fazem a MESMA pergunta
 * antes de julgar congelamento — a `congelamento` (`pretooluse.mjs`, nos gatilhos de escrita) e a
 * `escrita-bash` (gatilho `Bash`) —, porque o marcador mora em `<repo de docs>/outputs/spec/` e o
 * `ehDoExplore` é ancorado em prefixo: num workspace multi-repo o alvo chega como
 * `portal-docs/outputs/explore/gaps.md`, e sem esta conversão a trava LIBERA escrita num Explore
 * congelado. O conserto nasceu inline na primeira delas; escrito duas vezes ele divergiria, e a que
 * divergisse seria a trava. A raiz dos artefatos tem UM dono neste repositório — o
 * `descobrirWorkspace` —, e isto é o adaptador dele para caminho relativo à `cwd`.
 *
 * `io` precisa de duas operações, as mesmas que as duas travas já injetam: `lerDiretorio` (para o
 * `descobrirWorkspace`, e PASSÁ-LO importa — o default `readdirSync` leria o disco de verdade sobre
 * uma raiz que o teste dublou, e responderia "mono-repo" sobre uma raiz ilegível) e `relativizar`.
 *
 * A DESCOBERTA É MEMOIZADA, e é por isso que isto é uma fábrica em vez de uma função solta: o
 * `escrita-bash` pergunta uma vez por ALVO do comando — e uma vez por caminho contido, e uma por
 * fragmento quando a aspa não fecha —, e o layout do workspace não muda entre dois alvos do mesmo
 * comando. O estado mutável é do escopo de UMA tool call e morre com ela; não é cache entre
 * entradas da tabela, que é o que o `criarRegistro` do `pretooluse.mjs` recusa no JSDoc.
 *
 * Devolve `{rel, raiz, motivo, detalhe}`:
 *   - `motivo` preenchido (`ambiguo`, `cwd-ilegivel`) ⇒ NÃO HÁ raiz, e `rel`/`raiz` vêm `null`. Os
 *     dois consumidores são bloqueantes e negam nesse caso, com a mensagem única desse fato — ver
 *     `avaliarRaizIndeterminada` (zonas.mjs);
 *   - mono-repo ⇒ `rel` volta INTACTO, porque a raiz dos artefatos é a própria `cwd`. Relativizar
 *     de novo custaria a resolução por identidade para devolver o mesmo valor, e num projeto que
 *     não é multi-repo o veredito não pode nem por acidente mudar de caminho;
 *   - multi-repo ⇒ `rel` é reescrito contra o repo de docs, e vem `null` quando o caminho está
 *     FORA dele — o irmão de código, por exemplo. O PRÓPRIO repo de docs vira `''` ou `null`
 *     conforme o resolvedor injetado (os dois discordam sobre a raiz; ver `relativoOuNulo`, em
 *     `escrita-bash.mjs`), e os dois consumidores leem os dois casos como "não é do Explore", que é
 *     a resposta certa — quem decide isso é o `ehDoExplore`, não esta função. Os dois casos NÃO se
 *     leem por falsidade de string: quem os discrimina é o `ehCaminhoSobRaizDeArtefatos`, logo
 *     abaixo, e o porquê está no JSDoc dele.
 *
 * O `join(cwd, rel)` NÃO É DECORATIVO: `io.relativizar` trata caminho não absoluto como já relativo
 * à raiz que recebeu (ver `relativizar`, no kit), e `rel` é relativo à `cwd` — passá-lo cru diria
 * "isto é relativo ao repo de docs", que é outro arquivo.
 */
export function criarResolvedorDeArtefatos(cwd, io) {
  let ws = null; // memo: uma descoberta por tool call, não uma por alvo
  return (rel) => {
    if (ws === null) ws = descobrirWorkspace(cwd, io.lerDiretorio);
    if (ws.motivo) return { rel: null, raiz: null, motivo: ws.motivo, detalhe: ws.detalhe };
    if (!ws.multiRepo) return { rel, raiz: ws.raizArtefatos, motivo: null, detalhe: null };
    const alvo = io.relativizar(ws.raizArtefatos, join(cwd, rel));
    return { rel: alvo == null ? null : alvo, raiz: ws.raizArtefatos, motivo: null, detalhe: null };
  };
}

/**
 * O resultado do resolvedor NOMEIA um caminho sob a raiz dos artefatos?
 *
 * OS DOIS CASOS NEGATIVOS SÃO DIFERENTES, e é por isso que a pergunta tem função própria em vez de
 * um `!artefatos.rel` em cada consumidor: `null` é "FORA do repo de docs" (o irmão de código, em
 * multi-repo) e `''` é "É o próprio repo de docs" — a raiz não nomeia arquivo nenhum. Os dois levam
 * ao mesmo lugar ("não há caminho para o `ehDoExplore` julgar"), mas escrevê-los como falsidade de
 * string num caminho de decisão de trava BLOQUEANTE é o tipo de teste que quebra em silêncio: no dia
 * em que o contrato de `rel` mudar, `!rel` continua compilando e o veredito vira `allow` sem que
 * nada fique vermelho. Aqui a distinção está escrita, num lugar só, e prendida por teste.
 *
 * `motivo` preenchido NÃO passa por aqui — ali não há raiz, os dois consumidores negam por falha
 * fechada (`avaliarRaizIndeterminada`, zonas.mjs) e a pergunta "que caminho é este?" não se faz.
 */
export function ehCaminhoSobRaizDeArtefatos(artefatos) {
  const rel = artefatos && artefatos.rel;
  return rel != null && rel !== '';
}

/** Manifesto do repo de docs. Arquivo ausente/ilegível degrada para `sem-manifesto`. */
export function lerManifesto(docsDir) {
  const path = join(docsDir || '.', MANIFESTO_REL);
  let texto = '';
  try {
    if (!existsSync(path)) {
      return { entradas: [], erro: 'sem-manifesto', detalhe: `${MANIFESTO_REL} não encontrado` };
    }
    texto = readFileSync(path, 'utf8');
  } catch {
    return { entradas: [], erro: 'sem-manifesto', detalhe: `${MANIFESTO_REL} ilegível` };
  }
  return parseManifesto(texto);
}

/** Papel do repositório que contém `dir`, resolvido pelo `origin` dele. */
export function papelDoDiretorio(dir, manifesto) {
  let toplevel = null;
  let url = null;
  try { toplevel = git(dir, ['rev-parse', '--show-toplevel']); } catch { /* fora de repo */ }
  // `git --show-toplevel` sempre devolve barras `/`, mesmo no Windows — normaliza para o
  // separador nativo, senão o toplevel não bate com caminhos construídos via node:path.
  if (toplevel && sep !== '/') toplevel = toplevel.split('/').join(sep);
  if (toplevel) {
    try { url = git(toplevel, ['remote', 'get-url', 'origin']); } catch { /* sem origin */ }
  }
  return { ...classificarRepo(manifesto, url), toplevel };
}

function main(argv) {
  const cwd = process.cwd();
  const ws = descobrirWorkspace(cwd);
  const [flag, valor] = argv;

  if (flag === '--docs') {
    if (!ws.docsDir) { process.stderr.write(`${ws.motivo || 'sem repo de docs'}\n`); return 1; }
    process.stdout.write(ws.docsDir + '\n');
    return 0;
  }
  if (flag === '--validar') {
    if (ws.motivo) { process.stderr.write(`${ws.motivo}: ${ws.detalhe}\n`); return 1; }
    const m = lerManifesto(ws.docsDir);
    if (m.erro) { process.stderr.write(`${m.erro}: ${m.detalhe}\n`); return 1; }
    const resumo = m.entradas.map((e) => `${e.papel}=${e.nome}`).join(' ');
    process.stdout.write(`ok — ${m.entradas.length} entrada(s): ${resumo}\n`);
    // O AVISO DE LAYOUT (D53) NÃO MUDA O CÓDIGO DE SAÍDA: o manifesto É válido, e é isso que este
    // comando responde. Só vale em mono-repo — com a sessão na pasta-pai o gate resolve cada push
    // pelo `origin` do repositório, e um repo aninhado no de docs é reconhecido. A leitura do texto
    // é a segunda (o `lerManifesto` já o leu e validou); ilegível agora é corrida rara e só cala o aviso.
    if (!ws.multiRepo) {
      let texto = '';
      try { texto = readFileSync(join(ws.docsDir, MANIFESTO_REL), 'utf8'); } catch { /* sem aviso */ }
      const aviso = avisoDeAninhamento(reposAninhados(texto));
      if (aviso) process.stdout.write(`\n${aviso}\n`);
    }
    return 0;
  }
  if (flag === '--repo-de' && valor) {
    const r = papelDoDiretorio(valor, ws.motivo ? { entradas: [] } : lerManifesto(ws.docsDir));
    process.stdout.write(`${r.papel} ${r.nome || ''}${r.motivo ? ' (' + r.motivo + ')' : ''}\n`.replace(/\s+\n$/, '\n'));
    return r.papel === 'desconhecido' ? 1 : 0;
  }
  process.stderr.write('uso: workspace.mjs --docs | --validar | --repo-de <dir>\n');
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
