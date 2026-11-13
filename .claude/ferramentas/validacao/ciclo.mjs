// Harness Elo v2 — A próxima ação do ciclo validar → corrigir → revalidar. Núcleo puro, sem I/O.
//
// Quem decide é este módulo, não o agente que orquestra: o agente só executa a ação que sai daqui.
// Assim o laço tem fim garantido — três rodadas, oscilação ou incerteza que não se resolve param o
// ciclo e entregam a lista aberta ao humano, em vez de deixar um modelo insistir até "passar".

import { agruparParaCorrecao } from './consolidar.mjs';

export const RODADAS_MAXIMAS = 3;
const ORDEM = { CUMPRE: 3, NAO_CUMPRE: 2, INCERTO: 1 };

/**
 * Resultados de vários lotes da MESMA dimensão → um só. Quando o código não cabe num recorte, cada
 * lote vê só uma parte; o lote que não viu o código responde INCERTO, e o que viu decide. Por id:
 *
 * 1. NAO_CUMPRE com evidência que CONFERE no disco vence tudo: um lote viu a violação, e o CUMPRE de
 *    outro lote só prova que a regra é cumprida em OUTRO lugar — deixá-lo vencer esconderia o defeito;
 * 2. depois CUMPRE (a evidência dele ainda é conferida na consolidação);
 * 3. depois NAO_CUMPRE sem evidência (ou com evidência que não confere) — o lote pode só não ter
 *    visto o código que cumpre;
 * 4. por último INCERTO.
 *
 * `conferir(evidencia)` é o mesmo da consolidação; sem ele, NAO_CUMPRE nunca sobe para o nível 1.
 */
export function juntarLotes(dimensao, lotes, conferir = null) {
  const porId = new Map();
  const achados = [];
  const peso = (v) => (v.veredito === 'NAO_CUMPRE' && v.evidencia && conferir && conferir(v.evidencia).ok ? 4 : ORDEM[v.veredito] || 0);
  for (const r of lotes) {
    for (const v of r.verificacoes || []) {
      const atual = porId.get(v.id);
      if (!atual || peso(v) > peso(atual)) porId.set(v.id, v);
    }
    achados.push(...(r.achados || []));
  }
  return { dimensao, verificacoes: [...porId.values()], achados };
}

/**
 * Chaves que eram bloqueantes na validação anterior e sumiram nesta. É contra ELAS que se mede
 * oscilação: item que continua aberto depois de uma correção é correção que não funcionou — merece
 * nova tentativa, até o limite de rodadas; item que sumiu e VOLTOU é o corretor desfazendo o próprio
 * trabalho, e insistir não converge.
 */
export function resolvidasEntre(anteriores, atuais) {
  const agora = new Set(atuais);
  return anteriores.filter((c) => !agora.has(c));
}

/**
 * @param {{consolidado: object, rodada: number, rodadasMax?: number, resolvidas?: string[],
 *          jaRevalidouIncertos?: boolean}} entrada
 * @returns {{acao: 'fim'} | {acao: 'parar', motivo: string} | {acao: 'revalidar', dimensoes: string[]}
 *          | {acao: 'corrigir', grupos: object[]}}
 */
export function decidir({ consolidado, rodada, rodadasMax = RODADAS_MAXIMAS, resolvidas = [], jaRevalidouIncertos = false }) {
  if (consolidado.veredito === 'APROVADO') return { acao: 'fim' };

  const voltaram = consolidado.bloqueantes.filter((b) => resolvidas.includes(b.chave));
  if (voltaram.length) {
    return { acao: 'parar', motivo: `oscilação: ${voltaram.map((b) => b.chave).join(', ')} voltou depois de corrigido` };
  }

  if (consolidado.bloqueantes.length === 0) {
    // Só incerteza. O determinístico não melhora rodando de novo; a dimensão de modelo, uma vez.
    const dimensoes = [...new Set([
      ...consolidado.dimensoesIncertas,
      ...consolidado.incertos.filter((i) => i.origem !== 'determinístico').map((i) => i.dimensao),
    ])];
    if (jaRevalidouIncertos || dimensoes.length === 0) {
      return { acao: 'parar', motivo: 'sobraram itens incertos que só uma pessoa pode decidir' };
    }
    return { acao: 'revalidar', dimensoes };
  }

  // A rodada 1 é só validação; cada rodada seguinte veio depois de uma correção.
  if (rodada >= rodadasMax) {
    const correcoes = rodada - 1;
    return {
      acao: 'parar',
      motivo: `limite de ${rodadasMax} rodadas de validação atingido: ${correcoes} ${correcoes === 1 ? 'rodada' : 'rodadas'} de correção e ainda ${consolidado.bloqueantes.length} bloqueante(s)`,
    };
  }
  return { acao: 'corrigir', grupos: agruparParaCorrecao(consolidado.bloqueantes) };
}
