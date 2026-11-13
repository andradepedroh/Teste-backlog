// Harness Elo v2 — O que se verifica sem modelo. Núcleo puro; o I/O chega injetado.
//
// Antes de qualquer validador gastar token: os comandos de teste, cobertura e lint do projeto
// rodam, e cada mensagem de erro documentada nas regras é procurada no código e nos testes. A
// `spec-implement` diz que uma regra com condição negativa "não está implementada enquanto não
// houver teste provando que a violação é rejeitada com aquela mensagem exata" — isso é busca de
// texto, e busca de texto é trabalho de código, não de modelo.

import { classificar } from './roteador.mjs';

/** Linhas finais da saída de um comando — o bastante para o corretor entender a falha. */
export function cauda(texto, n = 30) {
  return String(texto || '').split(/\r?\n/).filter(Boolean).slice(-n).join('\n');
}

// ————————————————————————————— linha de base dos comandos (item 13.1, 2026-10-21) —————————————————————————————
//
// O problema: o G3 só aceitava `status === 0`. Um teste vermelho que já existia antes da task, ou o
// lint/cobertura do repositório inteiro abaixo do limite, bloqueava TODA task até PARADO — e o corretor
// gastava rodadas tentando consertar o que não era dele. A linha de base é a saída dos mesmos comandos
// rodados ANTES de escrever código (`validar.mjs linha-de-base`); o G3 compara a falha de agora com ela.
//
// A comparação é por LINHA DE FALHA normalizada, não pelo código de saída só: "o lint já falhava" não
// pode esconder o erro novo que a task trouxe. A falha é pré-existente quando o comando é o mesmo, a
// saída é a mesma, e TODA linha de falha de agora já estava na linha de base. Qualquer linha nova — um
// teste novo vermelho, um erro de lint num arquivo novo — bloqueia como antes, e só essas linhas vão
// para o corretor. Na dúvida (nenhuma linha reconhecível, saída diferente), bloqueia.

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

/**
 * Linha que denuncia falha. Larga de propósito: linha de falha a mais só torna a comparação mais
 * exigente (a linha nova bloqueia), e a linha de sucesso (`✓ passa`) fica de fora — senão todo teste
 * novo que PASSA viraria "linha nova" e a linha de base não serviria para nada.
 */
const MARCA_DE_FALHA = /\b(fail(s|ed|ure|ures|ing)?|errors?|erros?|falh(a|as|ou|aram)|exception|panic|fatal|not ok|assert\w*|broken|violat\w*|warn(ing|ings)?)\b|[✗✖×❌✘]/i;

/** As formas do caminho do repositório que uma ferramenta pode imprimir (Windows, Git Bash, POSIX). */
function formasDoCaminho(repo) {
  const r = String(repo || '').replace(/[\\/]+$/, '');
  if (!r) return [];
  const barra = r.replace(/\\/g, '/');
  const formas = new Set([r, barra]);
  const drive = /^([A-Za-z]):\/(.*)$/.exec(barra);
  if (drive) formas.add(`/${drive[1].toLowerCase()}/${drive[2]}`); // como o Git Bash mostra `C:\x`
  return [...formas].sort((a, b) => b.length - a.length);
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Uma linha de saída comparável entre duas execuções: sem cor, sem o caminho do repositório (o resto
 * do caminho fica — `src/velho.js` não pode virar o mesmo que `src/novo.js`), outro caminho absoluto
 * reduzido a `<abs>/<nome do arquivo>`, data, tempo, hash e número trocados por marcadores.
 */
export function normalizarLinha(linha, repo = '') {
  let t = String(linha ?? '').replace(ANSI, '').replace(/\r/g, '');
  for (const f of formasDoCaminho(repo)) t = t.replace(new RegExp(`${escapar(f)}[\\\\/]?`, 'gi'), '');
  t = t.replace(/\\/g, '/')
    .replace(/(^|[\s('"`=:,])(?:[A-Za-z]:\/|\/)(?:[^\s/:'"`()]+\/)+([^\s/:'"`()]+)/g, '$1<abs>/$2')
    .replace(/\b\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+Z?)?/g, '<data>')
    .replace(/\b\d+(?:[.,]\d+)?\s?(?:ms|s|sec|secs|seconds?|m|min|mins|minutes?)\b/gi, '<tempo>')
    .replace(/\b[0-9a-f]{7,}\b/gi, (h) => (/\d/.test(h) && /[a-f]/i.test(h) ? '<hash>' : h))
    .replace(/\d+/g, '0');
  return t.replace(/\s+/g, ' ').trim();
}

/** Linha que é só um caminho de arquivo: o cabeçalho que o ESLint (stylish) põe antes dos erros. */
const SO_CAMINHO = /^[^\s]+\.[A-Za-z0-9]{1,8}$/;
export const LIMITE_LINHAS_DE_FALHA = 2000;

/**
 * As linhas de falha de uma saída, normalizadas e sem repetição. A linha INDENTADA que vem depois de
 * uma linha que é só um caminho leva o caminho junto (`src/velho.js › 0:0 error …`): no formato do
 * ESLint o arquivo está no cabeçalho, e sem ele o mesmo erro num arquivo novo pareceria o antigo.
 */
export function linhasDeFalha(texto, repo = '') {
  const saida = new Set();
  let contexto = '';
  for (const bruta of String(texto ?? '').split(/\r?\n/)) {
    const limpa = bruta.replace(ANSI, '');
    if (!limpa.trim()) { contexto = ''; continue; }
    const linha = normalizarLinha(limpa, repo);
    const indentada = /^\s/.test(limpa);
    if (!indentada && SO_CAMINHO.test(linha)) { contexto = linha; continue; }
    if (!indentada) contexto = '';
    if (!MARCA_DE_FALHA.test(linha)) continue;
    saida.add(indentada && contexto ? `${contexto} › ${linha}` : linha);
    if (saida.size >= LIMITE_LINHAS_DE_FALHA) break;
  }
  return [...saida];
}

/** O registro de um comando na linha de base: o que rodou, como saiu e as linhas de falha. */
export function registroDeBase(comando, r, repo = '') {
  const codigo = r && r.status !== undefined ? r.status : null;
  return {
    comando, codigo, ok: codigo === 0,
    falhas: codigo === 0 ? [] : linhasDeFalha(`${(r && r.stdout) || ''}\n${(r && r.stderr) || ''}`, repo),
  };
}

/**
 * A falha de agora já existia na linha de base? `atual` = `{comando, codigo, falhas}`; `base` = o
 * registro do mesmo rótulo na linha de base (ou `null`). Devolve `{preExistente, motivo, novas?}` —
 * `novas` são as linhas de falha que a linha de base não tinha (o que a task trouxe).
 */
export function compararComBase(atual, base) {
  if (!base) return { preExistente: false, motivo: 'sem linha de base para este comando' };
  if (base.comando !== atual.comando) return { preExistente: false, motivo: 'a linha de base rodou outro comando' };
  if (base.ok) return { preExistente: false, motivo: 'o comando passava antes da task' };
  if (base.codigo !== atual.codigo) return { preExistente: false, motivo: `saída ${atual.codigo}; na linha de base era ${base.codigo}` };
  if (!(atual.falhas || []).length) return { preExistente: false, motivo: 'a falha não tem linha reconhecível para comparar com a linha de base' };
  const conhecidas = new Set(base.falhas || []);
  const novas = atual.falhas.filter((l) => !conhecidas.has(l));
  return novas.length
    ? { preExistente: false, novas, motivo: `${novas.length} linha(s) de falha que não estavam antes da task` }
    : { preExistente: true, motivo: 'a mesma falha já acontecia antes da task (linha de base)' };
}

/**
 * Roda um comando do projeto. `executar(comando)` devolve `{status, stdout, stderr}` (o `spawnSync`
 * da casca, no shell escolhido). Comando ausente não é falha: não houve o que rodar.
 *
 * `base` — o registro deste rótulo na linha de base (ver `compararComBase`). Falha pré-existente sai
 * com `preExistente: true` e não bloqueia; falha nova leva `novas` (as linhas que a linha de base não
 * tinha) para o corretor. `repo` normaliza os caminhos da saída.
 */
export function rodarComando(rotulo, comando, executar, { base = null, repo = '' } = {}) {
  if (!comando) return null;
  const r = executar(comando) || {};
  const ok = r.status === 0;
  const item = {
    id: `CMD-${rotulo}`,
    dimensao: rotulo === 'testes' || rotulo === 'cobertura' ? 'testes' : 'rules-tecnicas',
    comando,
    ok,
    codigo: r.status ?? null,
    saida: ok ? '' : cauda(`${r.stdout || ''}\n${r.stderr || ''}${r.error ? `\n${r.error.message}` : ''}`),
  };
  if (ok || !base) return item;
  const falhas = linhasDeFalha(`${r.stdout || ''}\n${r.stderr || ''}`, repo);
  const c = compararComBase({ comando, codigo: item.codigo, falhas }, base);
  return { ...item, preExistente: c.preExistente, comparacao: c.motivo, ...(c.novas ? { novas: c.novas.slice(0, 40) } : {}) };
}

/**
 * Pedaços literais de uma mensagem com marcadores: `Estoque insuficiente para {produto}` →
 * `['Estoque insuficiente para']`. Pedaço curto demais acharia qualquer coisa; fica de fora.
 */
export function fragmentos(mensagem, minimo = 6) {
  return String(mensagem || '').split(/\{[^}]*\}/)
    .map((p) => p.replace(/^[\s:.,;]+|[\s:.,;]+$/g, ''))
    .filter((p) => p.length >= minimo)
    .sort((a, b) => b.length - a.length);
}

/**
 * Cada mensagem de erro documentada vira duas verificações: está no código (`MSG-<CHAVE>`, regras
 * de negócio) e algum teste a confere (`MSG-<CHAVE>-TESTE`, testes). `buscar(texto)` devolve
 * `[{arquivo, linha, texto}]` no repositório inteiro — `git grep -n -F` na casca.
 */
export function checarMensagens(mensagens, buscar) {
  const saida = [];
  for (const m of mensagens) {
    const [maior] = fragmentos(m.texto);
    const base = { regra: m.regra, origem: 'determinístico' };
    if (!maior) {
      saida.push({ ...base, id: `MSG-${m.chave}`, dimensao: 'regras-negocio', veredito: 'INCERTO',
        motivo: `A mensagem de ${m.chave} só tem marcadores; não há texto fixo para procurar.` });
      continue;
    }
    const achados = buscar(maior);
    const noCodigo = achados.filter((a) => classificar(a.arquivo) !== 'teste');
    const noTeste = achados.filter((a) => classificar(a.arquivo) === 'teste');
    const ev = (a) => ({ arquivo: a.arquivo, linha: a.linha, trecho: a.texto.trim().slice(0, 300) });

    if (noCodigo.length) {
      saida.push({ ...base, id: `MSG-${m.chave}`, dimensao: 'regras-negocio', veredito: 'CUMPRE',
        evidencia: ev(noCodigo[0]), motivo: `A mensagem documentada de ${m.chave} está no código.` });
    } else {
      const porChave = buscar(m.chave).filter((a) => classificar(a.arquivo) !== 'teste');
      saida.push(porChave.length
        ? { ...base, id: `MSG-${m.chave}`, dimensao: 'regras-negocio', veredito: 'INCERTO', evidencia: ev(porChave[0]),
          motivo: `O código usa a chave ${m.chave}, mas o texto "${maior}" não aparece — confira se a mensagem mostrada é a documentada.` }
        : { ...base, id: `MSG-${m.chave}`, dimensao: 'regras-negocio', veredito: 'NAO_CUMPRE',
          motivo: `A mensagem documentada de ${m.chave} não aparece no código: "${m.texto}".` });
    }
    saida.push(noTeste.length
      ? { ...base, id: `MSG-${m.chave}-TESTE`, dimensao: 'testes', veredito: 'CUMPRE', evidencia: ev(noTeste[0]),
        motivo: `Um teste confere a mensagem de ${m.chave}.` }
      : { ...base, id: `MSG-${m.chave}-TESTE`, dimensao: 'testes', veredito: 'NAO_CUMPRE',
        motivo: `Nenhum teste confere a mensagem de ${m.chave} ("${maior}"). A regra ${m.regra} só está provada quando um teste força a violação e confere essa mensagem.` });
  }
  return saida;
}
