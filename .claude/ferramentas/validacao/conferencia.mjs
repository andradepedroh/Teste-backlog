// Harness Elo v2 — Conferência do que o validador devolve. Núcleo puro, sem I/O.
//
// O antídoto barato contra alucinação: todo veredito CUMPRE e todo achado citam `arquivo:linha` e o
// trecho literal, e este módulo confere se o trecho está mesmo lá. Evidência que não existe no
// disco derruba o item — sem gastar um token. O formato também é conferido aqui, por código, porque
// a ferramenta Agent não valida schema: resultado fora do formato não entra na consolidação.

export const VEREDITOS = ['CUMPRE', 'NAO_CUMPRE', 'INCERTO'];
export const SEVERIDADES = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO'];
export const LIMITE_TRECHO = 300;

export const normalizar = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * O validador às vezes copia o trecho JUNTO com a moldura do recorte (`   42 +| código`). A moldura
 * é nossa, não do arquivo: sai antes da comparação.
 */
export function semMoldura(trecho) {
  return String(trecho ?? '').split(/\r?\n/).map((l) => l.replace(/^\s*\d*\s[+\-* ]\|\s?/, '')).join('\n');
}

// ————————————————————————————— segredo na evidência —————————————————————————————

const TOKEN_CONHECIDO = /\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{35})\b/g;
const so4 = (v) => `${v.slice(0, 4)}****`;

/**
 * A linha com os valores que parecem segredo trocados pelo prefixo de 4 caracteres + `****`: token
 * de provedor, texto entre aspas e o valor depois de `=` ou `:`. Larga de propósito — mascarar a
 * mais num achado de segredo não custa nada; vazar o segredo no relatório e na entrada do corretor
 * custa. Idempotente: mascarar o já mascarado devolve o mesmo texto.
 */
export function mascarar(texto) {
  return String(texto ?? '')
    .replace(TOKEN_CONHECIDO, so4)
    .replace(/(["'`])([^"'`\s]{5,})\1/g, (_, q, v) => `${q}${so4(v)}${q}`)
    .replace(/([=:]\s*)([^\s"'`;,(){}[\]]{5,})/g, (_, sep, v) => (/^(process|import)\.|^\d+$/.test(v) ? `${sep}${v}` : `${sep}${so4(v)}`));
}

/**
 * Evidência de segredo: o trecho mascarado e o modo, para a conferência refazer a máscara no disco.
 * Linha em que nada parece valor: com `soPrefixo` (o gitleaks achou um segredo onde a máscara não
 * alcança) sobra só o prefixo da linha; sem ele, a linha não mostra valor nenhum (`process.env.X`,
 * o cabeçalho `-----BEGIN … PRIVATE KEY-----`) e vai como está.
 */
export function evidenciaMascarada(arquivo, linha, texto, { soPrefixo = false } = {}) {
  const t = String(texto).trim();
  const m = mascarar(t);
  if (m !== t) return { arquivo, linha, trecho: m.slice(0, 300), mascara: 'segredo' };
  return soPrefixo ? { arquivo, linha, trecho: so4(t), mascara: 'linha' } : { arquivo, linha, trecho: t.slice(0, 300) };
}

const MASCARAS = { segredo: (l) => mascarar(l.trim()), linha: (l) => so4(l.trim()) };

// ————————————————————————————— trecho que prova alguma coisa —————————————————————————————

export const MINIMO_TRECHO = 12;
const PALAVRAS_CHAVE = /\b(return|const|let|var|if|else|try|catch|finally|throw|new|function|async|await|export|import|from|default|true|false|null|undefined|this|for|while|do|switch|case|break|continue|class|extends|public|private|protected|static|void|def|end|in|of|typeof|instanceof|e|err|error|erro)\b/g;

/**
 * O trecho identifica um lugar do código? `}` ou `} catch (e) {` existem em qualquer arquivo, perto de
 * qualquer linha: confere sempre e não prova nada. Exige `minimo` caracteres não-brancos e, tirando
 * palavras-chave e pontuação, pelo menos 4 letras ou dígitos de nome de verdade.
 */
export function trechoSignificativo(trecho, minimo = MINIMO_TRECHO) {
  const t = normalizar(semMoldura(trecho));
  if (t.replace(/\s/g, '').length < minimo) return false;
  return t.replace(PALAVRAS_CHAVE, ' ').replace(/[^\p{L}\p{N}_$]/gu, '').length >= 4;
}

/**
 * A evidência confere? `lerLinhas(arquivo)` devolve as linhas do arquivo, ou `null` se ele não existe
 * (ou se o caminho está fora do repositório do código — ver o leitor do `validar.mjs`).
 * Tolerância de ±`tolerancia` linhas: o validador conta linha à mão, e um erro de um ou dois não é
 * alucinação; o trecho em outro lugar do arquivo é.
 *
 * `minimo` — caracteres não-brancos que o trecho precisa ter (ver `trechoSignificativo`); `0`
 * desliga, para a evidência que o próprio código produziu (a varredura cita a linha inteira, e
 * `} catch (e) {` é exatamente a linha do erro engolido).
 * Evidência com `mascara` (segredo): o trecho guardado está mascarado; a máscara é refeita sobre as
 * linhas do disco antes de comparar — o segredo que saiu do código derruba a evidência.
 */
export function conferirEvidencia(ev, lerLinhas, tolerancia = 3, { minimo = MINIMO_TRECHO } = {}) {
  if (!ev || typeof ev !== 'object') return { ok: false, motivo: 'sem evidência' };
  const trecho = normalizar(semMoldura(ev.trecho));
  if (!ev.arquivo || !Number.isInteger(ev.linha) || ev.linha < 1 || !trecho) {
    return { ok: false, motivo: 'evidência incompleta: precisa de arquivo, linha e trecho' };
  }
  const linhas = lerLinhas(ev.arquivo);
  if (!linhas) return { ok: false, motivo: `arquivo não encontrado: ${ev.arquivo}` };
  if (minimo && !trechoSignificativo(ev.trecho, minimo)) {
    return { ok: false, motivo: `trecho curto ou genérico demais para provar algo (mínimo ${minimo} caracteres, além de palavra-chave e pontuação)` };
  }
  const altura = String(ev.trecho).split(/\r?\n/).length;
  const ini = Math.max(0, ev.linha - 1 - tolerancia);
  const fim = Math.min(linhas.length, ev.linha - 1 + altura + tolerancia);
  const mascara = MASCARAS[ev.mascara];
  const janela = linhas.slice(ini, fim);
  const alvo = mascara ? janela.map(mascara) : janela;
  return normalizar(alvo.join('\n')).includes(trecho)
    ? { ok: true }
    : { ok: false, motivo: `o trecho citado não está perto da linha ${ev.linha} de ${ev.arquivo}` };
}

/** Erros de formato do resultado de um validador. Lista vazia = formato certo. */
export function validarResultado(r, dimensao) {
  const erros = [];
  if (!r || typeof r !== 'object' || Array.isArray(r)) return ['o resultado não é um objeto JSON'];
  if (r.dimensao !== dimensao) erros.push(`"dimensao" devia ser "${dimensao}"`);
  if (!Array.isArray(r.verificacoes)) erros.push('"verificacoes" devia ser uma lista');
  if (!Array.isArray(r.achados)) erros.push('"achados" devia ser uma lista');
  const evidenciaOk = (ev, onde) => {
    if (!ev || typeof ev !== 'object') { erros.push(`${onde}: falta "evidencia"`); return; }
    if (typeof ev.arquivo !== 'string' || !Number.isInteger(ev.linha) || typeof ev.trecho !== 'string') {
      erros.push(`${onde}: "evidencia" precisa de arquivo (texto), linha (inteiro) e trecho (texto)`);
    } else if (ev.trecho.length > LIMITE_TRECHO) {
      erros.push(`${onde}: o trecho passa de ${LIMITE_TRECHO} caracteres`);
    }
  };
  (Array.isArray(r.verificacoes) ? r.verificacoes : []).forEach((v, i) => {
    const onde = `verificacoes[${i}]`;
    if (!v || typeof v.id !== 'string') erros.push(`${onde}: falta "id"`);
    if (!VEREDITOS.includes(v && v.veredito)) erros.push(`${onde}: "veredito" devia ser ${VEREDITOS.join(', ')}`);
    if (!v || !normalizar(v.motivo)) erros.push(`${onde}: falta "motivo"`);
    if (v && v.veredito === 'CUMPRE') evidenciaOk(v.evidencia, onde);
  });
  (Array.isArray(r.achados) ? r.achados : []).forEach((a, i) => {
    const onde = `achados[${i}]`;
    if (!a || !normalizar(a.titulo)) erros.push(`${onde}: falta "titulo"`);
    if (!SEVERIDADES.includes(a && a.severidade)) erros.push(`${onde}: "severidade" devia ser ${SEVERIDADES.join(', ')}`);
    if (!a || !normalizar(a.motivo)) erros.push(`${onde}: falta "motivo"`);
    if (!a || !normalizar(a.correcao)) erros.push(`${onde}: falta "correcao"`);
    evidenciaOk(a && a.evidencia, onde);
  });
  return erros;
}
