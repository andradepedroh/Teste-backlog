// Harness Elo v2 — Achados que se acham sem modelo. Núcleo puro, sem I/O.
//
// Antes de qualquer validador gastar token, as linhas ACRESCENTADAS pela entrega passam por regras
// fixas: segredo no código, dado pessoal em log, HTML cru, token no storage, injeção, erro engolido,
// I/O dentro de laço, `fetch` e formatação na tela. O que sai daqui é achado com evidência copiada do
// próprio arquivo — conferido no disco como qualquer outro —, e o validador de modelo recebe a lista
// para não repetir: ele fica com o que regra fixa não pega (acesso ao registro de outro usuário,
// permissão, regra de negócio).
//
// SÓ CRÍTICO E ALTO, porque MÉDIO e BAIXO são ignorados no ciclo (ver `consolidar.mjs`). Toda regra
// daqui bloqueia, então cada uma é ESTREITA de propósito: falso positivo vira rodada de correção
// gasta à toa. Na dúvida, a regra não dispara e o validador de modelo decide.
//
// Revisão de 2026-10-21 (item 13 da revisão do G3). Cada falso positivo corrigido virou caso legítimo
// preso no `validacao.test.mjs`, e cada falso negativo, caso de detecção:
// - falsos positivos (13.6): HTML sanitizado na linha de cima, `innerHTML = ''`, JSON-LD do Next;
//   `catch` de uma linha que trata, flag de estado e comentário que explica; SQL parametrizado quebrado
//   em linhas, duas constantes, tabela em CAIXA_ALTA; palavra pessoal dentro de nome maior
//   (`emailVerificado`, `cardId`); chave de storage que não é token (`sessionFilters`); nome de header
//   e rótulo de i18n no lugar de segredo; paginação por cursor, retry e `for` sem chaves no laço;
//   `fetch` e formatação fora de `.tsx/.jsx`;
// - falsos negativos (13.8): senha sem aspas em `.properties`/`.yml`, em string de conexão e no
//   `appsettings.json`; SQL por f-string e `executeQuery("…" + nome)`; e-mail no log em Python e C#;
//   `except: pass`.
// - falsos positivos do teste ponta a ponta (D55): `CHANGE_ME` (só `changeme` era placeholder) no
//   `.env.example` que a rule `deploy-and-build` manda versionar; em arquivo de exemplo
//   (`*.example`/`*.sample`/`*.template`), valor que não tem cara de segredo gerado; laço de script de
//   migração/seed e leitura de arquivo por item no `io-no-laco`.
//
// As ferramentas externas (Semgrep, gitleaks), quando instaladas, entram pela casca do `validar.mjs`;
// os leitores da saída delas moram aqui, puros, para serem testados sem a ferramenta.

import { classificar } from './roteador.mjs';
import { evidenciaMascarada } from './conferencia.mjs';

// `logger.x(`, `_logger.LogInformation(` (C#), `log.info(` (SLF4J), `logging.info(` (Python).
const LOG = /(?:\bconsole\.(?:log|info|warn|error|debug)|(?<![\w$])_?(?:[Ll]ogger|LOGGER)\.\w+|(?<![\w$])_?(?:log|LOG)\.(?:trace|debug|info|warn|warning|error|fatal|critical|exception)|\blogging\.(?:debug|info|warning|warn|error|exception|critical))\s*\(/;
const PII = new Set(['cpf', 'cnpj', 'email', 'mail', 'senha', 'password', 'passwd', 'telefone', 'phone', 'celular', 'cartao', 'card', 'cardnumber', 'rg']);
// Valor que é exemplo, não segredo: variável de ambiente, marcador, ou o texto de quem preenche depois.
// `change[_-]?me` pega `changeme`, `CHANGE_ME` e `change-me` (D55: só o primeiro era placeholder).
const PLACEHOLDER = /process\.env|import\.meta\.env|<[^>]+>|\$\{|xxx|change[_-]?me|example|exemplo|placeholder|dummy|\byour[_-]|YOUR_|\bsua[_-]|\*{3,}/i;

/**
 * Arquivo de exemplo: `.env.example`, `.env.sample`, `appsettings.Example.json`,
 * `config.template.yml`. Ele É versionado de propósito (a rule `deploy-and-build` manda), e o valor
 * dele é o que alguém troca depois — por isso o critério é outro (ver `pareceSegredoGerado`).
 */
export const ehArquivoDeExemplo = (arquivo) => /(^|[._-])(example|sample|template)([._-][^/]*)?$/i.test(String(arquivo).replace(/\\/g, '/').split('/').pop());

/**
 * O valor tem cara de segredo GERADO, e não de senha de desenvolvimento escrita à mão: 16+
 * caracteres sem espaço com maiúscula, minúscula e dígito (base64, token), ou 32+ hexadecimais
 * (chave, hash). `senha_local_dev` e `postgres-local-123` não; `q8F3kLm2Zx9Pw7Rt4Yb6` sim. Os formatos
 * de provedor conhecidos (`AKIA…`, `ghp_…`) já são CRÍTICO em qualquer arquivo (`segredo-token-conhecido`).
 */
export function pareceSegredoGerado(valor) {
  const v = String(valor ?? '');
  if (/^[0-9a-f]{32,}$/i.test(v)) return true;
  return !/\s/.test(v) && v.length >= 16 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);
}

/** Em arquivo de exemplo, só o valor com cara de segredo gerado continua sendo achado (D55). */
const segredoDeVerdade = (valor, arquivo) => !ehArquivoDeExemplo(arquivo) || pareceSegredoGerado(valor);

// Teste e documento descrevem o ataque; não são o código que vai para produção.
const CODIGO_DE_VERDADE = (a) => !['teste', 'doc'].includes(classificar(a));

/**
 * As palavras de um identificador ou de um texto: `authToken` → `auth token`, `SESSION_ID` →
 * `session id`, `e-mail` → `email`. É o que separa `author` (uma palavra) de `authToken` (duas).
 */
export function palavras(texto) {
  return String(texto)
    .replace(/e-mail/gi, 'email').replace(/cart[aã]o/gi, 'cartao')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean);
}

/**
 * O texto sem o conteúdo dos literais de texto. De template literal (JS), f-string (Python) e string
 * interpolada (C#, `$"…"`) ficam só as expressões interpoladas: `f"login de {user.email}"` é o e-mail
 * logado, e `"Login de {Email}"` (sem `$`) é só o modelo da mensagem do logger estruturado.
 */
function semLiterais(texto) {
  const interpolacoes = (s, re) => (s.replace(/\{\{|\}\}/g, '').match(re) || []).join(' ');
  return String(texto)
    .replace(/`(?:[^`\\]|\\.)*`/g, (t) => interpolacoes(t, /\$\{[^}]*\}/g))
    .replace(/(?:\b(?:[fF][rR]?|[rR][fF])|\$@?|@\$)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (_, s) => interpolacoes(s, /\{[^{}]*\}/g))
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
}

/** Os argumentos de uma chamada a partir do `(` que casou em `inicio` — até o parêntese que fecha. */
function argumentos(texto, inicio) {
  let nivel = 0;
  for (let i = inicio; i < texto.length; i += 1) {
    if (texto[i] === '(') nivel += 1;
    else if (texto[i] === ')' && (nivel -= 1) === 0) return texto.slice(inicio + 1, i);
  }
  return texto.slice(inicio + 1);
}

const identificadores = (texto) => String(texto).match(/[A-Za-z_$][\w$]*/g) || [];

/**
 * O que acompanha a palavra pessoal num nome que AINDA É o dado: de quem é (`emailCliente`,
 * `userEmail`), o acessor (`getCpf`) e o formato (`cardNumber`). Com qualquer outra palavra o nome é
 * outra coisa — `emailVerificado` é um booleano, `cardId` um id, `mailQueue` uma fila, `cpfValido` o
 * resultado de uma validação (13.6).
 */
const DONO_DO_DADO = new Set([
  'cliente', 'client', 'customer', 'usuario', 'user', 'pessoa', 'person', 'contato', 'contact', 'titular',
  'paciente', 'patient', 'aluno', 'student', 'funcionario', 'employee', 'comprador', 'buyer', 'vendedor',
  'seller', 'destinatario', 'recipient', 'remetente', 'sender', 'novo', 'new', 'atual', 'current', 'antigo',
  'old', 'principal', 'primary', 'alternativo', 'secondary', 'do', 'da', 'de', 'number', 'numero', 'num',
  'completo', 'full', 'raw', 'original', 'informado', 'digitado', 'input', 'get', 'obter', 'value', 'valor',
]);
function nomeDeDadoPessoal(nome) {
  const ps = palavras(nome);
  return ps.some((p) => PII.has(p)) && ps.every((p) => PII.has(p) || DONO_DO_DADO.has(p));
}

/**
 * Token de sessão pelo nome. `token`, `jwt` e `bearer` são token em qualquer composição
 * (`refreshToken`). `auth` e `session` só com o que acompanha um token (`sessionId`, `authData`) —
 * `sessionFilters` e `authRedirectPath` guardam filtro e rota, não credencial (13.6).
 */
const TOKEN_FORTE = new Set(['token', 'tokens', 'jwt', 'bearer', 'credential', 'credentials', 'credencial', 'credenciais']);
const TOKEN_FRACO = new Set(['auth', 'session', 'sess', 'sid']);
const ACOMPANHA_TOKEN = new Set(['id', 'key', 'data', 'dados', 'info', 'user', 'usuario', 'cookie', 'value', 'valor', 'atual', 'current', 'raw', 'header', 'storage']);
function nomeDeToken(nome) {
  const ps = palavras(nome);
  if (ps.some((p) => TOKEN_FORTE.has(p))) return true;
  return ps.some((p) => TOKEN_FRACO.has(p)) && ps.every((p) => TOKEN_FRACO.has(p) || ACOMPANHA_TOKEN.has(p));
}

const SEGREDO_ATRIBUIDO = /\b(password|senha|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b["']?\s*[:=]\s*["']([^"'\s]{8,})["']/i;
// O grupo 1 dos dois é o valor, para o critério de arquivo de exemplo (`segredoDeVerdade`).
const SEGREDO_EM_CONFIGURACAO = /^\s*(?:export\s+)?[\w.-]*?(?:password|passwd|pwd|senha|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*(?![$%{<@"'])([^\s"'#]{8,})\s*(?:#.*)?$/i;
const SEGREDO_NA_CONEXAO = /\b(?:server|data source|host|database|initial catalog|user id|uid)\s*=[^;"']*;[^"'\n]*?\b(?:password|pwd)\s*=\s*(?![$%{<@])([^;"'\s]{4,})/i;

/**
 * O "valor" é um NOME, não um segredo: nome de header HTTP (`API_KEY = 'x-api-key'`) ou o próprio nome
 * da chave (`"password": "Password"`, o rótulo de um arquivo de tradução).
 */
function valorEhNome(linha) {
  const m = SEGREDO_ATRIBUIDO.exec(linha);
  if (!m) return false;
  if (/^x-[a-z]+(?:-[a-z]+)*$/i.test(m[2])) return true;
  const doNome = new Set(palavras(m[1]));
  const doValor = palavras(m[2]);
  return doValor.length > 0 && doValor.every((p) => doNome.has(p));
}

/** Literal de texto sem nada interpolado: `''`, `"<hr>"`, `` `fixo` ``. */
const literalPuro = (s) => /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\$]|\\.|\$(?!\{))*`)$/.test(String(s).trim());

/**
 * HTML que não vem do usuário: atribuição de literal puro (`container.innerHTML = ''`), JSON-LD do Next
 * (`__html: JSON.stringify(jsonLd)`), ou variável sanitizada nas linhas de cima
 * (`const limpo = DOMPurify.sanitize(html)` e depois `__html: limpo`). Na linha da sanitização, o
 * `exceto` da regra já resolve.
 */
function htmlSeguro(linha, { anteriores = [] } = {}) {
  const atribuicao = /\.(?:inner|outer)HTML\s*=\s*(.*?)\s*;?\s*$/.exec(linha);
  if (atribuicao) return literalPuro(atribuicao[1]);
  const dsih = /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*([\s\S]*?)\s*\}\}/.exec(linha);
  if (!dsih) return false;
  const v = dsih[1].trim();
  if (literalPuro(v) || /^JSON\.stringify\s*\(/.test(v)) return true;
  if (!/^[A-Za-z_$][\w$]*$/.test(v)) return false;
  const sanitizada = new RegExp(`(^|[^\\w$])${v.replace(/\$/g, '\\$')}\\s*=\\s*[^=;]*\\bsanitize\\w*\\s*\\(`, 'i');
  return anteriores.slice(-20).some((t) => sanitizada.test(t));
}

// ————————————————————————————— SQL montado —————————————————————————————

const CHAMADA_SQL = /(?<![\w$])(\$?(?:query|execute)\w*|raw|prepareStatement|prepareCall|create(?:Native|SQL)?Query|executemany|FromSqlRaw|ExecuteSqlRaw\w*)\s*\(/gi;
const PALAVRA_SQL = /\b(select|insert|update|delete)\b/i;
// `TABELA`, `Tabelas.PEDIDO`, `SQL_BASE`: nome de constante, não valor que chega do usuário.
const CONSTANTE = /^(?:[A-Za-z_$][\w$]*\.)*[A-Z_][A-Z0-9_]*$|^\d+(?:\.\d+)?$/;

/**
 * O primeiro argumento da chamada que abre em `inicio` (o índice do `(`), em `texto` — que pode ter
 * várias linhas. Para no `,` ou no `)` do nível de fora, fora de literal.
 */
function primeiroArgumento(texto, inicio) {
  let nivel = 0;
  let aspa = '';
  for (let i = inicio + 1; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspa) {
      if (c === '\\') { i += 1; continue; }
      if (c === aspa) aspa = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { aspa = c; continue; }
    if (c === '(' || c === '[' || c === '{') nivel += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (nivel === 0) return texto.slice(inicio + 1, i);
      nivel -= 1;
    } else if (c === ',' && nivel === 0) return texto.slice(inicio + 1, i);
  }
  return texto.slice(inicio + 1);
}

/**
 * O primeiro argumento de uma chamada de banco monta SQL com valor de fora? Os literais saem do texto
 * (o que sobra vira `L`), e então:
 * - literal interpolado (template JS, f-string, `$"…"` do C#) com expressão que não é constante → sim;
 * - `L % x` ou `L.format(…)` (Python) → sim;
 * - concatenação com `+` em que algum pedaço não é literal nem constante → sim.
 * `'… $1 ' + 'ORDER BY …'`, `"SELECT * FROM " + TABELA + " WHERE id = ?"` e `${TABELA}` → não (13.6).
 */
export function sqlMontado(expr) {
  const literais = [];
  let resto = '';
  const s = String(expr);
  for (let i = 0; i < s.length; i += 1) {
    const prefixo = /^(?:[fF][rR]?|[rR][fF]|\$@?|@\$)?(["'`])/.exec(s.slice(i, i + 4));
    const antes = i > 0 ? s[i - 1] : '';
    if (prefixo && !/[\w$]/.test(antes)) {
      const aspa = prefixo[1];
      const inicio = i + prefixo[0].length;
      let j = inicio;
      while (j < s.length && s[j] !== aspa) j += s[j] === '\\' ? 2 : 1;
      const corpo = s.slice(inicio, j);
      const interpolado = aspa === '`' || prefixo[0].length > 1;
      literais.push({ corpo, aspa, interpolado });
      resto += ' L ';
      i = j;
      continue;
    }
    resto += s[i];
  }
  if (!literais.some((l) => PALAVRA_SQL.test(l.corpo))) return false;
  for (const l of literais.filter((x) => x.interpolado)) {
    const exprs = l.aspa === '`'
      ? (l.corpo.match(/\$\{([^}]*)\}/g) || []).map((e) => e.slice(2, -1))
      : (l.corpo.replace(/\{\{|\}\}/g, '').match(/\{([^{}]*)\}/g) || []).map((e) => e.slice(1, -1).split(/[!:]/)[0]);
    if (exprs.some((e) => !CONSTANTE.test(e.trim()))) return true;
  }
  const r = resto.replace(/\s+/g, ' ').trim();
  if (/\bL\s*%/.test(r) || /\bL\s*\.\s*format\s*\(/.test(r)) return true;
  if (!r.includes('+')) return false;
  // Pedaço vazio é o `+` no fim do que se vê (a continuação ficou fora do trecho): na dúvida, não dispara.
  const pedacos = r.split('+').map((p) => p.trim().replace(/^\(+|\)+$/g, '').trim().replace(/\.\w+\(\)$/, '')).filter(Boolean);
  return pedacos.some((p) => p !== 'L' && !CONSTANTE.test(p));
}

/** A linha (e as seguintes, quando o argumento quebra de linha) chama o banco com SQL montado? */
function sqlMontadoNaLinha(linha, { seguintes = [] } = {}) {
  const texto = [linha, ...seguintes.slice(0, 15)].join('\n');
  for (const m of linha.matchAll(CHAMADA_SQL)) {
    if (sqlMontado(primeiroArgumento(texto, m.index + m[0].length - 1))) return true;
  }
  return false;
}

/**
 * As regras de LINHA. `quando(arquivo)` restringe o tipo de arquivo; `padrao` casa na linha
 * acrescentada; `e(linha, contexto)` é uma condição a mais (o contexto traz o `arquivo`, até 20 linhas
 * `anteriores` e 15 `seguintes` do mesmo trecho); `exceto` desarma o caso legítimo conhecido.
 * `segredo: true` mascara o valor na evidência (ver `evidenciaMascarada`); `soFrontendNext: true` só
 * vale quando a rule de frontend Next está em vigor no projeto (ver `regrasFrontendNextEmVigor`).
 */
export const REGRAS = [
  {
    id: 'segredo-chave-privada', dimensoes: ['seguranca'], severidade: 'CRITICO', segredo: true,
    titulo: 'chave privada escrita no código',
    padrao: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    quando: CODIGO_DE_VERDADE,
    motivo: 'quem lê o repositório ou o bundle tem a chave privada.',
    correcao: 'tirar a chave do código e ler de um secret manager ou variável de ambiente do servidor.',
  },
  {
    id: 'segredo-token-conhecido', dimensoes: ['seguranca'], severidade: 'CRITICO', segredo: true,
    titulo: 'credencial de provedor escrita no código',
    padrao: /\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{35})\b/,
    quando: CODIGO_DE_VERDADE,
    motivo: 'quem lê o repositório ou o bundle usa a credencial em nome do projeto.',
    correcao: 'revogar a credencial e ler a nova de um secret manager.',
  },
  {
    id: 'segredo-atribuido', dimensoes: ['seguranca'], severidade: 'ALTO', segredo: true,
    titulo: 'senha ou chave atribuída como texto no código',
    padrao: SEGREDO_ATRIBUIDO,
    e: (linha, { arquivo } = {}) => !valorEhNome(linha) && segredoDeVerdade(SEGREDO_ATRIBUIDO.exec(linha)[2], arquivo),
    exceto: PLACEHOLDER,
    quando: (a) => classificar(a) !== 'teste',
    motivo: 'o segredo vai para o repositório e, no frontend, para o bundle.',
    correcao: 'ler o valor de variável de ambiente do servidor ou de um secret manager.',
  },
  {
    // Num arquivo de configuração o valor vem SEM aspas (`spring.datasource.password=…`, `password: …`
    // no YAML, `DB_PASSWORD=…` no `.env` versionado). Só em `config`: em código, o lado direito sem
    // aspas é uma expressão (`password=novaSenha;`), não um literal (13.8). Valor vazio, `${VAR}` e
    // `<…>` nem casam o padrão; `CHANGE_ME` sai pelo `exceto`; no `.env.example`, só segredo com cara
    // de gerado (D55).
    id: 'segredo-em-configuracao', dimensoes: ['seguranca'], severidade: 'ALTO', segredo: true,
    titulo: 'senha ou chave escrita no arquivo de configuração',
    padrao: SEGREDO_EM_CONFIGURACAO,
    e: (linha, { arquivo } = {}) => segredoDeVerdade(SEGREDO_EM_CONFIGURACAO.exec(linha)[1], arquivo),
    exceto: PLACEHOLDER,
    quando: (a) => classificar(a) === 'config',
    motivo: 'o segredo vai para o repositório junto com a configuração.',
    correcao: 'trocar o valor por uma referência (`${DB_PASSWORD}`) e ler de variável de ambiente ou secret manager.',
  },
  {
    // `Server=…;Database=…;Password=…;` — em código, no `appsettings.json` ou em qualquer configuração.
    id: 'segredo-connection-string', dimensoes: ['seguranca'], severidade: 'ALTO', segredo: true,
    titulo: 'senha dentro de string de conexão',
    padrao: SEGREDO_NA_CONEXAO,
    e: (linha, { arquivo } = {}) => segredoDeVerdade(SEGREDO_NA_CONEXAO.exec(linha)[1], arquivo),
    exceto: PLACEHOLDER,
    quando: (a) => classificar(a) !== 'teste',
    motivo: 'a senha do banco vai para o repositório dentro da string de conexão.',
    correcao: 'montar a string de conexão com a senha lida de variável de ambiente ou secret manager.',
  },
  {
    // Só o nome que diz segredo. `NEXT_PUBLIC_MAPBOX_TOKEN` e a `ANON_KEY` do Supabase são públicos
    // por desenho: o serviço os entrega ao navegador e restringe pelo domínio ou pela RLS.
    id: 'segredo-publico', dimensoes: ['seguranca'], severidade: 'ALTO', segredo: true,
    titulo: 'segredo em variável pública do frontend',
    padrao: /\b(NEXT_PUBLIC|VITE|REACT_APP)_\w*(SECRET|PRIVATE|PASSWORD|SERVICE_ROLE)\w*/,
    motivo: 'variável pública vai para o bundle: qualquer visitante lê o valor.',
    correcao: 'mover o segredo para variável sem prefixo público, lida só no servidor.',
  },
  {
    // Dado pessoal é o VALOR logado: `cliente.cpf`, `{ emailCliente }`, `f"{user.email}"`. A palavra
    // dentro do texto literal (`'Senha alterada'`) é mensagem, não dado; e dentro de um nome maior
    // (`emailVerificado`, `cardId`) é outra coisa (ver `nomeDeDadoPessoal`).
    id: 'pii-no-log', dimensoes: ['seguranca', 'observabilidade'], severidade: 'ALTO',
    titulo: 'dado pessoal no log',
    padrao: LOG,
    e: (linha) => {
      const m = LOG.exec(linha);
      const args = argumentos(linha, m.index + m[0].length - 1);
      return identificadores(semLiterais(args)).some(nomeDeDadoPessoal);
    },
    quando: (a) => classificar(a) !== 'teste',
    motivo: 'o dado pessoal fica legível em todo lugar para onde o log vai (LGPD).',
    correcao: 'tirar o dado pessoal do log, ou mascará-lo, e registrar só o id da entidade.',
  },
  {
    id: 'html-cru', dimensoes: ['seguranca'], severidade: 'ALTO',
    titulo: 'HTML inserido sem sanitização',
    padrao: /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(/,
    e: (linha, contexto) => !htmlSeguro(linha, contexto),
    exceto: /DOMPurify|sanitize/i,
    quando: CODIGO_DE_VERDADE,
    motivo: 'conteúdo vindo do usuário executa script na página de outro usuário (XSS).',
    correcao: 'renderizar como texto, ou sanitizar com DOMPurify antes de inserir.',
  },
  {
    // Pelo nome da chave e do valor: `authToken`, `sessionId` e `jwt` são token; `authorName`,
    // `possessions`, `sessionFilters` e `authRedirectPath` não (ver `nomeDeToken`).
    id: 'token-no-storage', dimensoes: ['seguranca'], severidade: 'ALTO',
    titulo: 'token de autenticação no localStorage',
    padrao: /\b(localStorage|sessionStorage)\.setItem\s*\(/,
    e: (linha) => {
      const m = /\b(localStorage|sessionStorage)\.setItem\s*\(/.exec(linha);
      return argumentos(linha, m.index + m[0].length - 1).split(/[^\w$-]+/).filter(Boolean).some(nomeDeToken);
    },
    motivo: 'qualquer script da página (um XSS) lê o token e assume a sessão.',
    correcao: 'usar cookie httpOnly; Secure; SameSite=Strict, definido pelo backend.',
  },
  {
    // `pagina.eval(script)` e `redis.eval(lua)` são métodos de biblioteca, não o `eval` global.
    id: 'eval', dimensoes: ['seguranca'], severidade: 'ALTO',
    titulo: 'código montado em texto e executado',
    padrao: /(?<![.\w$])eval\s*\(|\bnew Function\s*\(/,
    quando: CODIGO_DE_VERDADE,
    motivo: 'texto que chega do usuário vira código executado no processo.',
    correcao: 'trocar por uma tabela de funções ou um parser; nunca executar texto.',
  },
  {
    // A chamada de banco (JS, Java, Python, C#) cujo primeiro argumento monta o SQL com valor que não é
    // constante — inclusive quando o argumento quebra de linha (ver `sqlMontado`).
    id: 'sql-montado', dimensoes: ['seguranca'], severidade: 'ALTO',
    titulo: 'SQL montado com texto concatenado',
    padrao: CHAMADA_SQL,
    e: sqlMontadoNaLinha,
    motivo: 'um valor vindo do usuário altera a consulta (SQL injection).',
    correcao: 'usar consulta parametrizada ou o ORM, com o valor como parâmetro.',
  },
  {
    id: 'shell-montado', dimensoes: ['seguranca'], severidade: 'ALTO',
    titulo: 'comando de shell montado com texto concatenado',
    padrao: /\b(exec|execSync|spawn|spawnSync)\s*\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/,
    motivo: 'um valor vindo do usuário vira comando executado no servidor.',
    correcao: 'passar os argumentos como lista (`execFile`/`spawn` sem shell) e validar contra uma allowlist.',
  },
  {
    id: 'fetch-na-tela', dimensoes: ['rules-tecnicas'], severidade: 'ALTO', soFrontendNext: true,
    titulo: '`fetch` dentro de componente',
    padrao: /\bfetch\s*\(|\baxios\.(get|post|put|patch|delete)\s*\(/,
    quando: (a) => ehTela(a),
    motivo: 'a rule de frontend proíbe HTTP na UI: o pedido tem que passar por um `*.service.ts` e um data hook (`.claude/rules/harness/frontend.md`, "Serviços e HTTP").',
    correcao: 'mover a chamada para um service com o path em `*.paths.ts` e consumir por um hook do React Query.',
  },
  {
    id: 'formato-no-jsx', dimensoes: ['rules-tecnicas'], severidade: 'ALTO', soFrontendNext: true,
    titulo: 'formatação de valor dentro do JSX',
    padrao: /<[A-Za-z][^>]*>[^<]*\{[^}]*(\.toFixed\s*\(|\.toLocaleString\s*\(|Intl\.(NumberFormat|DateTimeFormat)|\bformat\s*\()/,
    quando: (a) => ehTela(a),
    motivo: 'a rule de frontend proíbe formatação no JSX: o valor tem que chegar pronto no View Model (`.claude/rules/harness/frontend.md`, "View Model e derivação na UI").',
    correcao: 'formatar no mapper (`to<Nome>ViewModel`) e renderizar o campo já formatado.',
  },
];

/**
 * Arquivo de tela: componente ou página React — `.tsx` ou `.jsx` —, fora de service, hook e teste. Era
 * também qualquer `.js`/`.ts` em `app/`, `components/` ou `pages/`, e pegava rota de backend
 * (`src/app/routes/*.js`, `app/Controllers/…`, o `route.ts` do Next) e view model `.ts` (13.6). Vue e
 * Svelte ficam de fora: as duas regras de tela vêm da rule de frontend Next.js.
 */
export function ehTela(arquivo) {
  const p = String(arquivo).replace(/\\/g, '/');
  if (classificar(p) === 'teste') return false;
  if (/\.service(\.server)?\.[cm]?[jt]sx?$|(^|\/)(services?|hooks?|api|lib|mappers?)\//i.test(p)) return false;
  return /\.(jsx|tsx)$/i.test(p);
}

// Achado de segredo leva o valor mascarado: a evidência vai para o estado, o relatório e a entrada
// do corretor, e nenhum deles precisa do segredo — só de onde ele está.
const evidencia = (arquivo, l, segredo = false) => (segredo
  ? evidenciaMascarada(arquivo, l.numero, l.texto)
  : { arquivo, linha: l.numero, trecho: l.texto.trim().slice(0, 300) });

function achado(regra, arquivo, l, extra = {}) {
  return {
    origem: 'determinístico', regra: regra.id, dimensoes: regra.dimensoes, severidade: regra.severidade,
    titulo: regra.titulo, motivo: regra.motivo, correcao: regra.correcao, evidencia: evidencia(arquivo, l, regra.segredo), ...extra,
  };
}

// Ler um stream pedaço a pedaço (`await reader.read()`) é o laço certo, não uma consulta por item.
const LEITURA_DE_STREAM = /\bawait\s+[\w$.]*(reader|stream|leitor)\w*\.read\w*\s*\(|\bawait\s+[\w$.]+\.read\s*\(\s*\)/i;
const CHAMADA_DE_LOG = /^(console|logger|log|print|println)(\.|$)/i;

/**
 * O corpo do `catch` repassa o erro? Atribuir (`this.erro = e`) ou passar a variável a uma chamada
 * que não é log (`setErro(e)`, `callback(e)`, `Sentry.captureException(e)`) entrega a falha a quem
 * trata. Só registrar no log, não: quem chamou continua recebendo sucesso.
 */
function repassa(corpo, variavel) {
  if (!variavel) return false;
  const v = variavel.replace(/\$/g, '\\$');
  if (new RegExp(`(^|[^=!<>])=\\s*${v}\\b`).test(corpo)) return true;
  const chamada = new RegExp(`([\\w$.]+)\\s*\\(([^()]*\\b${v}\\b[^()]*)\\)`, 'g');
  for (const m of corpo.matchAll(chamada)) if (!CHAMADA_DE_LOG.test(m[1])) return true;
  return false;
}

/**
 * O corpo muda estado (`valido = false`, `this.ultimoErro = e`): o erro virou um resultado que o resto
 * do código lê. Declaração (`const msg = e.message`) não conta — ela só prepara o log.
 */
const muda = (corpo) => corpo.split(/[;\n]/).some((s) => /^\s*(?!(?:const|let|var)\b)[\w$]+(?:\.[\w$]+|\[[^\]]*\])*\s*(?:[+\-*/|&?]{0,2})=(?!=)/.test(s));

/** O comentário EXPLICA (três palavras ou mais)? `// nada` não explica; `// arquivo pode não existir` sim. */
const explica = (comentarios) => ((comentarios.join(' ').replace(/\/\/|\/\*|\*\/|#/g, ' ').match(/[\p{L}\d]+/gu) || []).length >= 3);

/** O texto entre a `{` que abre em `linhas[i]` (a partir de `desde`) e a `}` que a fecha, e as linhas que ele ocupa. */
function blocoDeChaves(linhas, i, desde) {
  let texto = '';
  let nivel = 0;
  const ocupadas = [];
  for (let j = i; j < linhas.length; j += 1) {
    if (linhas[j].tipo === '-') continue;
    const t = j === i ? linhas[j].texto.slice(desde) : linhas[j].texto;
    ocupadas.push({ j, texto: t });
    for (const c of t) {
      if (c === '{') { nivel += 1; if (nivel === 1) continue; }
      if (c === '}') { nivel -= 1; if (nivel === 0) return { texto, ocupadas }; }
      if (nivel >= 1) texto += c;
    }
    if (nivel >= 1) texto += '\n';
  }
  return { texto, ocupadas };
}

const ERRO_ENGOLIDO = {
  id: 'erro-engolido', dimensoes: ['observabilidade'], severidade: 'ALTO',
  titulo: 'erro engolido no `catch`',
  motivo: 'a falha some: quem chamou recebe sucesso (ou `undefined`) e o erro não chega a quem trata.',
  correcao: 'registrar o erro com contexto (id da entidade) e relançar, ou devolver um erro de domínio.',
};

/**
 * `catch` cujo corpo não relança, não devolve, não repassa, não muda estado e não traz um comentário
 * que explica: o erro some. O corpo inclui o resto da própria linha — `catch (e) { throw … }` numa
 * linha só era lido como corpo vazio (13.6).
 */
function catchEngolido(linhas, i) {
  const l = linhas[i];
  const m = /\bcatch\s*(\([^)]*\))?\s*\{/.exec(l.texto);
  if (!m) return null;
  const { texto, ocupadas } = blocoDeChaves(linhas, i, m.index + m[0].length - 1);
  const comentarios = texto.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
  const codigo = texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
  const variavel = (/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/.exec(l.texto) || [])[1];
  const trata = /\b(throw|return|reject|next)\b|res\.status|process\.exit/.test(codigo) || repassa(codigo, variavel) || muda(codigo);
  const intencional = !codigo.trim() && explica(comentarios);
  if (trata || intencional) return null;
  return ocupadas.some((o) => linhas[o.j].tipo === '+') ? l : null;
}

/**
 * `except:` ou `except Exception:` (Python) cujo corpo é só `pass` (ou `...`): o erro some. Exceção
 * específica (`except FileNotFoundError: pass`) é decisão de quem escreveu, e fica de fora (13.8).
 */
function exceptEngolido(linhas, i) {
  const l = linhas[i];
  const m = /^(\s*)except\s*(?:\(?\s*(?:Exception|BaseException)\b[^:]*)?:\s*(.*)$/.exec(l.texto);
  if (!m) return null;
  const recuo = m[1].length;
  const corpo = [{ j: i, texto: m[2] }];
  for (let j = i + 1; j < linhas.length; j += 1) {
    if (linhas[j].tipo === '-') continue;
    const t = linhas[j].texto;
    if (!t.trim()) continue;
    if (t.length - t.trimStart().length <= recuo) break;
    corpo.push({ j, texto: t });
  }
  const comentarios = corpo.map((c) => (/#.*$/.exec(c.texto) || [''])[0]).filter(Boolean);
  const instrucoes = corpo.map((c) => c.texto.replace(/#.*$/, '').trim()).filter(Boolean);
  if (!instrucoes.length || !instrucoes.every((s) => s === 'pass' || s === '...')) return null;
  if (explica(comentarios)) return null;
  return corpo.some((c) => linhas[c.j].tipo === '+') ? l : null;
}

// ————————————————————————————— consulta dentro de laço —————————————————————————————

const CONSULTA = /\bawait\s+([\w$.]*?)((?:buscar|consultar|carregar|obter|find|get|query|select|fetch|load|read)\w*)\s*\(/gi;
const nomesDe = (s) => identificadores(s).filter((n) => !['const', 'let', 'var', 'async', 'await', 'of', 'in'].includes(n));
// Ler N arquivos são N leituras por natureza (`readFile`, `readdir`): não existe a «consulta por lista
// de ids» que a correção da regra pede (D55).
const LEITURA_DE_ARQUIVO = /^read(?:File|dir|Json|Text|Lines|link)/i;

/**
 * Script de migração ou de seed (`db/apply-migrations.js`, `db/seeds/dev.js`, `scripts/seed.ts`):
 * roda uma vez, no deploy, e o laço sequencial — um arquivo por vez, cada um na sua transação — é o
 * desenho, não uma consulta por item que cresce com o uso (D55). Na dúvida, a regra não dispara.
 */
export function ehScriptDeMigracaoOuSeed(arquivo) {
  const p = String(arquivo).replace(/\\/g, '/');
  if (/(^|\/)(migrations?|migracoes|migrações|seeds?|seeders?)\//i.test(p)) return true;
  return /(^|[._-])(?:migrat|migra[cç]|seed)/i.test(p.split('/').pop());
}

/** As variáveis que o cabeçalho do laço declara: `for (const x of …)`, `for (let i = 0; …)`, `.forEach(async (x) =>`. */
function variaveisDoCabecalho(texto) {
  const vars = new Set();
  const deOf = /\bfor\s*(?:await\s*)?\(\s*(?:const|let|var)?\s*(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s+(?:of|in)\b/.exec(texto);
  if (deOf) nomesDe(deOf[1]).forEach((n) => vars.add(n));
  const contador = /\bfor\s*\(\s*(?:let|var)?\s*([A-Za-z_$][\w$]*)\s*=/.exec(texto);
  if (contador) vars.add(contador[1]);
  const forEach = /\.forEach\s*\(\s*async\s*(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))/.exec(texto);
  if (forEach) nomesDe(forEach[1] || forEach[2]).forEach((n) => vars.add(n));
  return vars;
}

/** O índice do `)` que fecha o `(` em `inicio`, na mesma linha, ou -1. */
function fechaParentese(texto, inicio) {
  let nivel = 0;
  for (let i = inicio; i < texto.length; i += 1) {
    if (texto[i] === '(') nivel += 1;
    else if (texto[i] === ')' && (nivel -= 1) === 0) return i;
  }
  return -1;
}

/**
 * O corpo do laço que começa em `linhas[i]`: `[{j, texto}]`. Com chaves, até a que fecha. SEM chaves,
 * só a instrução — o resto da linha do cabeçalho ou, se ela termina no `)`, a linha seguinte. Antes, a
 * linha depois de um `for (…) x;` era lida como dentro do laço (13.6).
 */
function corpoDoLaco(linhas, i) {
  const t = linhas[i].texto;
  const seta = /\.forEach\s*\(\s*async[^=]*=>\s*/.exec(t);
  let depois;
  if (seta) depois = seta.index + seta[0].length;
  else {
    const abre = t.indexOf('(', t.search(/\b(for|while)\b/));
    const fecha = fechaParentese(t, abre);
    if (fecha < 0) return blocoDeChaves(linhas, i, Math.max(0, t.indexOf('{', abre))).ocupadas;
    depois = fecha + 1;
  }
  const resto = t.slice(depois);
  if (resto.trim().startsWith('{')) return blocoDeChaves(linhas, i, depois + resto.indexOf('{')).ocupadas;
  if (resto.trim()) return [{ j: i, texto: resto }];
  for (let j = i + 1; j < linhas.length; j += 1) {
    if (linhas[j].tipo === '-' || !linhas[j].texto.trim()) continue;
    return linhas[j].texto.trim().startsWith('{') ? blocoDeChaves(linhas, j, linhas[j].texto.indexOf('{')).ocupadas : [{ j, texto: linhas[j].texto }];
  }
  return [];
}

/**
 * `await` de consulta dentro de laço, POR ITEM: a chamada usa uma variável que o laço declara (no
 * cabeçalho ou no corpo, antes da chamada). Laço que repete a MESMA chamada — retry, polling — e
 * paginação por cursor (o argumento é o cursor que a própria resposta atualiza, declarado fora) não
 * são consulta por item (13.6).
 */
function consultaNoLaco(linhas, i) {
  const t = linhas[i].texto;
  if (!/^\s*(for\s*\(|for\s+await|while\s*\()|\.forEach\s*\(\s*async/.test(t)) return null;
  const doLaco = variaveisDoCabecalho(t);
  for (const { j, texto } of corpoDoLaco(linhas, i)) {
    for (const m of texto.matchAll(CONSULTA)) {
      if (LEITURA_DE_ARQUIVO.test(m[2])) continue;
      const usados = [...nomesDe(m[1]), ...nomesDe(argumentos(texto, m.index + m[0].length - 1))];
      const porItem = usados.some((n) => doLaco.has(n));
      if (porItem && linhas[j].tipo === '+' && !/Promise\.all/.test(texto) && !LEITURA_DE_STREAM.test(texto)) return linhas[j];
    }
    for (const d of texto.matchAll(/\b(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*=/g)) nomesDe(d[1]).forEach((n) => doLaco.add(n));
  }
  return null;
}

const IO_NO_LACO = {
  id: 'io-no-laco', dimensoes: ['performance'], severidade: 'ALTO',
  titulo: 'consulta dentro de laço (uma ida por item)',
  motivo: 'o tempo e a carga crescem com o número de itens: um pedido com 200 itens faz 200 consultas.',
  correcao: 'buscar tudo de uma vez (consulta por lista de ids) antes do laço, ou paralelizar com limite.',
};

/**
 * As regras de BLOCO, que precisam de mais de uma linha: o `catch` (e o `except` do Python) que engole
 * o erro e o I/O dentro de laço. Olham só o trecho do diff, e só disparam se a linha que denuncia foi
 * ACRESCENTADA.
 */
function regrasDeBloco(arquivo, linhas) {
  const saida = [];
  if (classificar(arquivo) !== 'codigo') return saida;
  const python = /\.py$/i.test(arquivo);
  const semIoNoLaco = python || ehScriptDeMigracaoOuSeed(arquivo);
  for (let i = 0; i < linhas.length; i += 1) {
    if (linhas[i].tipo === '-') continue;
    const engolido = python ? exceptEngolido(linhas, i) : catchEngolido(linhas, i);
    if (engolido) saida.push(achado(ERRO_ENGOLIDO, arquivo, engolido));
    const laco = semIoNoLaco ? null : consultaNoLaco(linhas, i);
    if (laco) saida.push(achado(IO_NO_LACO, arquivo, laco));
  }
  return saida;
}

/**
 * Itens do diff (`parsearDiff`/`arquivoNovo`) → achados determinísticos. Arquivo removido ou binário
 * fica de fora: não há linha nova para citar.
 *
 * `frontendNext: false` desliga as regras que só a rule de frontend Next.js sustenta (`fetch-na-tela`,
 * `formato-no-jsx`): num projeto Angular, ou com rule de frontend própria que não é Next, elas seriam
 * falso positivo bloqueante. Quem decide é a casca (`--regras-frontend`, ou `regrasFrontendNextEmVigor`).
 */
export function varrer(mudancas, { frontendNext = true } = {}) {
  const saida = [];
  const regras = REGRAS.filter((r) => frontendNext || !r.soFrontendNext);
  for (const m of mudancas) {
    if (m.removido || m.binario) continue;
    for (const t of m.trechos) {
      const vivas = t.linhas.filter((l) => l.tipo !== '-');
      vivas.forEach((l, k) => {
        if (l.tipo !== '+') return;
        const contexto = {
          arquivo: m.arquivo,
          anteriores: vivas.slice(Math.max(0, k - 20), k).map((x) => x.texto),
          seguintes: vivas.slice(k + 1, k + 16).map((x) => x.texto),
        };
        for (const r of regras) {
          if (r.quando && !r.quando(m.arquivo)) continue;
          r.padrao.lastIndex = 0;
          if (!r.padrao.test(l.texto)) continue;
          r.padrao.lastIndex = 0;
          if (r.e && !r.e(l.texto, contexto)) continue;
          if (r.exceto && r.exceto.test(l.texto)) continue;
          saida.push(achado(r, m.arquivo, l));
        }
      });
      saida.push(...regrasDeBloco(m.arquivo, t.linhas));
    }
  }
  return saida;
}

// ————————————————————————————— ferramentas externas —————————————————————————————

/**
 * Saída JSON do Semgrep (`semgrep scan --json`) → achados. Só `ERROR` bloqueia: o Semgrep chama de
 * `WARNING` o que corresponde a MÉDIO, e MÉDIO é ignorado. `linhas(arquivo)` lê o arquivo, para a
 * evidência ser o texto do disco e não a cópia que a ferramenta devolveu.
 */
export function lerSemgrep(json, linhas) {
  const saida = [];
  for (const r of (json && json.results) || []) {
    if (!r.extra || r.extra.severity !== 'ERROR') continue;
    const arquivo = String(r.path).replace(/\\/g, '/');
    const numero = r.start && r.start.line;
    const texto = (linhas(arquivo) || [])[numero - 1];
    if (!numero || texto === undefined) continue;
    saida.push({
      origem: 'determinístico', regra: `semgrep:${r.check_id}`, dimensoes: ['seguranca'], severidade: 'ALTO',
      titulo: `Semgrep: ${String(r.check_id).split('.').pop()}`,
      motivo: String(r.extra.message || '').split('\n')[0].slice(0, 300) || 'regra do Semgrep',
      correcao: 'corrigir conforme a regra do Semgrep citada no título.',
      evidencia: { arquivo, linha: numero, trecho: texto.trim().slice(0, 300) },
    });
  }
  return saida;
}

/**
 * Saída JSON do gitleaks (`--report-format json`) → achados CRÍTICOS. O segredo não vai para o texto:
 * a evidência é a linha do disco MASCARADA (`evidenciaMascarada`, só prefixo de 4 caracteres).
 * `caminho(File)` traduz o caminho do relatório para o do repositório — o gitleaks varre uma cópia.
 */
export function lerGitleaks(json, linhas, caminho = (f) => f) {
  const saida = [];
  for (const r of Array.isArray(json) ? json : []) {
    const arquivo = String(caminho(String(r.File))).replace(/\\/g, '/');
    const numero = r.StartLine;
    const texto = (linhas(arquivo) || [])[numero - 1];
    if (!numero || texto === undefined) continue;
    saida.push({
      origem: 'determinístico', regra: `gitleaks:${r.RuleID}`, dimensoes: ['seguranca'], severidade: 'CRITICO',
      titulo: `segredo no código (gitleaks: ${r.RuleID})`,
      motivo: 'quem lê o repositório ou o bundle usa o segredo.',
      correcao: 'revogar o segredo e ler o novo de um secret manager.',
      evidencia: evidenciaMascarada(arquivo, numero, texto, { soPrefixo: true }),
    });
  }
  return saida;
}

/** Só o que caiu numa linha ACRESCENTADA pela entrega: o resto é dívida anterior, não desta task. */
export function soNasLinhasNovas(achados, mudancas) {
  const novas = new Set();
  for (const m of mudancas) {
    for (const t of m.trechos) for (const l of t.linhas) if (l.tipo === '+') novas.add(`${m.arquivo}:${l.numero}`);
  }
  return achados.filter((a) => novas.has(`${a.evidencia.arquivo}:${a.evidencia.linha}`));
}
