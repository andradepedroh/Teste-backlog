// Harness Elo v2 — Do que os validadores devolveram a um veredito. Núcleo puro, sem I/O.
//
// O veredito é CÓDIGO, não opinião de modelo: a mesma entrada dá sempre a mesma saída. O agente
// que orquestra não interpreta achado nenhum — ele só lê a ação que sai daqui.
//
// "100%" (decisão do plano) = zero bloqueantes e zero incertos. Bloqueia: comando que falhou,
// verificação NAO_CUMPRE, achado CRÍTICO ou ALTO com evidência que confere. INCERTO não bloqueia como
// defeito — ninguém sabe se é defeito —, mas impede o APROVADO: vai para mais uma validação ou para o
// humano.
//
// MÉDIO e BAIXO SÃO IGNORADOS (decisão de 2026-10-16). Eram "avisos": não bloqueavam, mas o
// validador gastava atenção e saída com eles, e a recalibração mostrou um aviso médio virando
// bloqueante por outro caminho. Agora só se conta quantos vieram (`ignorados`), sem lista — e o
// relatório não mostra esse número como se fosse "achados médios": diz que MÉDIO e BAIXO não são
// avaliados no G3 e quem os cobre (`medioEBaixo` no `validar.mjs`, item 13.10 de 2026-10-21).

import { normalizar } from './conferencia.mjs';

const PESO = { CRITICO: 4, ALTO: 3, MEDIO: 2, BAIXO: 1 };
export const TAXA_MAXIMA_DE_DESCARTE = 0.3;

/**
 * Chave de um item entre rodadas — é com ela que se detecta oscilação (o mesmo defeito voltar depois
 * de corrigido). Achado: dimensão, `arquivo:linha` e a regra (determinístico) ou a dimensão (modelo).
 *
 * Era o título normalizado, sem a linha, e oscilava em falso: o modelo reescreve o título entre
 * rodadas, e dois defeitos diferentes com o mesmo título genérico ("erro engolido") no mesmo arquivo
 * viravam um só — corrigido um, o outro "voltava". Com a linha, a correção que desloca o código muda
 * a chave: o item conta como resolvido e o novo como aberto. O custo é perder a detecção de oscilação
 * de um defeito que se move de linha — e o limite de rodadas segura esse caso.
 */
export function chaveDe(item) {
  if (item.tipo === 'achado') {
    const ev = item.evidencia || {};
    const onde = Number.isInteger(ev.linha) ? `${ev.arquivo}:${ev.linha}` : `${ev.arquivo}|${normalizar(item.titulo).toLowerCase()}`;
    return `${item.dimensao}|${onde}|${item.regra || item.dimensao}`;
  }
  return `${item.dimensao}|${item.id}`;
}

/**
 * O mesmo defeito visto por dois validadores vira um item só: mesmo arquivo, MESMA linha, dimensões
 * diferentes. Junta as dimensões e fica a maior severidade.
 *
 * Era "até 2 linhas de distância", e a calibração de 2026-10-16 mostrou o custo: o CPF no log (linha 4)
 * foi engolido pela consulta por item (linha 6), sumiu da lista do corretor e custou uma rodada inteira.
 * Defeito repetido que escapar daqui chega ao corretor duas vezes — barato; defeito engolido não chega.
 * Dois achados do MESMO validador na mesma linha são dois defeitos, e ficam separados.
 */
function juntarAchados(achados) {
  const grupos = [];
  const mesmaLinha = (g, a) => g.evidencia.arquivo === a.evidencia.arquivo && g.evidencia.linha === a.evidencia.linha;
  for (const a of achados) {
    // O validador que repete o que a varredura já achou na mesma linha não cria um segundo defeito.
    if (grupos.some((g) => g.origem === 'determinístico' && mesmaLinha(g, a) && g.dimensoes.includes(a.dimensao))) continue;
    const igual = grupos.find((g) => mesmaLinha(g, a) && !g.dimensoes.includes(a.dimensao));
    if (!igual) { grupos.push({ ...a, dimensoes: a.dimensoes || [a.dimensao] }); continue; }
    igual.dimensoes.push(a.dimensao);
    // Achado de modelo fundido num da varredura: a varredura refaz só o dela na próxima rodada; o do
    // modelo precisa voltar à dimensão dele como item aberto, senão some sem ninguém conferir.
    if (igual.origem === 'determinístico' && a.origem !== 'determinístico') igual.dimensoesDoModelo = [...(igual.dimensoesDoModelo || []), a.dimensao];
    if (PESO[a.severidade] > PESO[igual.severidade]) {
      Object.assign(igual, { ...a, dimensoes: igual.dimensoes, ...(igual.origem ? { origem: igual.origem } : {}) });
    }
  }
  return grupos;
}

/**
 * @param {{comandos: object[], deterministico: object[], resultados: Record<string, object>,
 *          esperadas?: Record<string, string[]>, dimensoesComPerguntas?: string[] | null,
 *          conferir: (evidencia: object) => {ok: boolean, motivo?: string}}} entrada
 *   `esperadas` — por dimensão, os ids que o validador TINHA que responder. Sem isso, um validador que
 *   devolvesse a lista vazia aprovaria tudo: silêncio não é CUMPRE.
 *   `dimensoesComPerguntas` — as dimensões que respondem verificação por pergunta da task. Nas outras,
 *   a saída do validador são os ACHADOS, que carregam severidade; uma verificação ali vira aviso. Medido
 *   na recalibração de 2026-10-16: tratada como bloqueante, ela duplicou 4 achados na rodada 1 e fez um
 *   "fetch sem tempo limite" — aviso MÉDIO na rodada 2 — travar o ciclo na rodada 3, sem severidade
 *   nenhuma. `null` (o padrão) trata toda dimensão como tendo perguntas.
 *   `achadosDeterministicos` — os da `varredura.mjs` e das ferramentas externas. Entram ANTES dos
 *   achados de modelo, para a repetição do validador na mesma linha ser reconhecida e descartada.
 */
export function consolidar({ comandos = [], deterministico = [], achadosDeterministicos = [], resultados = {}, esperadas = {}, dimensoesComPerguntas = null, conferir }) {
  const bloqueantes = [];
  const incertos = [];
  let ignorados = 0;
  const descartados = [];
  const dimensoesIncertas = [];
  // Comando que falhou IGUAL na linha de base (ver `compararComBase` no `deterministico.mjs`): a falha
  // é do repositório, não da task. Não bloqueia e não vai para o corretor, mas fica no relatório.
  const preExistentes = [];

  for (const c of comandos.filter(Boolean)) {
    if (c.ok) continue;
    if (c.preExistente) {
      preExistentes.push({ tipo: 'comando', dimensao: c.dimensao, id: c.id, comando: c.comando, codigo: c.codigo, motivo: c.comparacao, saida: c.saida });
      continue;
    }
    bloqueantes.push({
      tipo: 'comando', dimensao: c.dimensao, id: c.id, motivo: `O comando \`${c.comando}\` falhou (saída ${c.codigo}).`, saida: c.saida,
      ...(c.novas ? { novas: c.novas } : {}),
    });
  }
  for (const v of deterministico) {
    const item = { tipo: 'verificacao', ...v };
    if (v.veredito === 'NAO_CUMPRE') bloqueantes.push(item);
    else if (v.veredito === 'INCERTO') incertos.push(item);
  }

  const achados = [];
  for (const a of achadosDeterministicos) {
    // A evidência da varredura é a linha inteira copiada por código: o mínimo de trecho (contra o
    // modelo que cita `}` e "confere") não se aplica a ela.
    const c = conferir(a.evidencia, { deterministico: true });
    const item = { tipo: 'achado', dimensao: a.dimensoes[0], ...a };
    if (!c.ok) { descartados.push({ ...item, descarte: c.motivo }); continue; }
    achados.push(item);
  }
  for (const [dimensao, r] of Object.entries(resultados)) {
    const respondidas = new Set((r.verificacoes || []).map((v) => v.id));
    for (const id of esperadas[dimensao] || []) {
      if (!respondidas.has(id)) incertos.push({ tipo: 'verificacao', dimensao, id, veredito: 'INCERTO', motivo: 'o validador não respondeu este item' });
    }
    let comEvidencia = 0;
    let derrubados = 0;
    // Os achados primeiro: é contra eles que se reconhece a verificação duplicada.
    const achadosDaDimensao = [];
    for (const a of r.achados || []) {
      comEvidencia += 1;
      const c = conferir(a.evidencia);
      if (!c.ok) { derrubados += 1; descartados.push({ tipo: 'achado', dimensao, ...a, descarte: c.motivo }); continue; }
      achadosDaDimensao.push({ tipo: 'achado', dimensao, ...a });
    }
    achados.push(...achadosDaDimensao);
    const comPerguntas = !dimensoesComPerguntas || dimensoesComPerguntas.includes(dimensao);
    for (const v of r.verificacoes || []) {
      const item = { tipo: 'verificacao', dimensao, ...v };
      if (!comPerguntas) {
        if (v.veredito === 'CUMPRE') continue;
        const ev = v.evidencia;
        const duplicada = ev && achadosDaDimensao.some((a) => a.evidencia.arquivo === ev.arquivo && a.evidencia.linha === ev.linha);
        if (duplicada) continue;
        if (ev) {
          comEvidencia += 1;
          const c = conferir(ev);
          if (!c.ok) { derrubados += 1; descartados.push({ ...item, descarte: c.motivo }); continue; }
        }
        // Verificação de dimensão sem perguntas não tem severidade: a gravidade vem dos achados.
        ignorados += 1;
        continue;
      }
      if (v.veredito === 'NAO_CUMPRE') { bloqueantes.push(item); continue; }
      if (v.veredito === 'INCERTO') { incertos.push(item); continue; }
      comEvidencia += 1;
      const c = conferir(v.evidencia);
      if (!c.ok) {
        derrubados += 1;
        incertos.push({ ...item, veredito: 'INCERTO', motivo: `Evidência não confere (${c.motivo}). Motivo original: ${v.motivo}` });
      }
    }
    if (comEvidencia > 0 && derrubados / comEvidencia > TAXA_MAXIMA_DE_DESCARTE) dimensoesIncertas.push(dimensao);
  }

  for (const a of juntarAchados(achados)) {
    if (PESO[a.severidade] >= PESO.ALTO) bloqueantes.push(a);
    else ignorados += 1;
  }

  const aprovado = bloqueantes.length === 0 && incertos.length === 0 && dimensoesIncertas.length === 0;
  return {
    veredito: aprovado ? 'APROVADO' : 'PENDENTE',
    bloqueantes: bloqueantes.map((b) => ({ ...b, chave: chaveDe(b) })),
    incertos: incertos.map((i) => ({ ...i, chave: chaveDe(i) })),
    ignorados,
    descartados,
    dimensoesIncertas,
    preExistentes,
  };
}

/**
 * Bloqueantes → grupos para o corretor. Itens que citam o mesmo arquivo ficam no mesmo grupo (dois
 * corretores no mesmo arquivo se desfariam); o que não cita arquivo — comando que falhou, regra sem
 * evidência — vai num grupo próprio, com a saída do comando para o corretor ler.
 */
export function agruparParaCorrecao(bloqueantes) {
  const comArquivo = new Map();
  const soltos = [];
  for (const b of bloqueantes) {
    const arquivo = b.evidencia && b.evidencia.arquivo;
    if (!arquivo) { soltos.push(b); continue; }
    if (!comArquivo.has(arquivo)) comArquivo.set(arquivo, []);
    comArquivo.get(arquivo).push(b);
  }
  const grupos = [...comArquivo.entries()].map(([arquivo, itens]) => ({ arquivos: [arquivo], itens }));
  if (soltos.length) grupos.push({ arquivos: [], itens: soltos });
  return grupos;
}
