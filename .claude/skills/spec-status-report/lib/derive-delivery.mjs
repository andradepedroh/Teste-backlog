// derive-delivery.mjs — leitura de ritmo de entrega a partir do que o tracker registra.
//
// ─────────────────────────────────────────────────────────────────────────────
// O PRINCÍPIO DESTE ARQUIVO
//
// Cada leitura sai do dado que a sustenta, ou não sai. Nada é reconstruído, estimado
// ou aproximado para preencher uma seção.
//
//   · fechamento por semana  → precisa de `closedDate` nos itens;
//   · sprint, velocidade     → precisam de ITERAÇÃO COM DATA de início e fim;
//   · projeção, burnup       → precisam de velocidade, logo também de sprint real.
//
// Uma versão anterior deste módulo RECONSTRUÍA sprints em janelas de 14 dias quando o
// projeto não tinha iterações com data, marcava tudo como «simulado» e ainda projetava
// prazo em cima disso. Era conveniente e estava errado: o cliente lê «S8 fechou 66
// itens» e «conclusão em 04/10» como fatos do projeto dele, não como aritmética do
// relatório sobre janelas que ninguém combinou. Um número inventado com etiqueta
// continua sendo um número inventado — e a etiqueta é a primeira coisa que some quando
// alguém copia o gráfico para um slide.
//
// Hoje: sem iteração com data, a seção de sprint não existe. O relatório diz, em
// «Limitações desta geração», que o projeto não tem sprints configurados — que é a
// informação verdadeira e, para quem gerencia, mais acionável do que uma projeção falsa.
//
// A etiqueta de ressalva que acompanhava aquelas seções saiu do tema junto (`.tag--sim`
// em report-theme.css). Não foi arrumação: o CSS vai embutido em cada relatório
// entregue, então o vocabulário da reconstrução vazava para o HTML mesmo quando nenhuma
// seção reconstruída era emitida — e um teste de regressão verifica exatamente isso.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86400000;

export function deriveDelivery(azure) {
  if (!azure || !azure.available || !Array.isArray(azure.items) || !azure.items.length) return null;

  const items = azure.items;
  const leaves = leavesOf(items);
  const closed = leaves.filter((i) => i.category === "done");
  const withDate = closed.filter((i) => Number.isFinite(Date.parse(i.closedDate)));

  // Iterações que são de fato sprints: têm início e fim declarados no tracker.
  const sprints = realSprints(azure.iterations, items, leaves);

  const weeks = withDate.length ? buildWeeks(withDate) : [];
  const openLeaves = leaves.filter((i) => i.category !== "done");

  const velocity = sprints.length ? computeVelocity(sprints) : null;
  const projection = velocity && velocity.median !== null && openLeaves.length
    ? project(sprints, velocity, openLeaves.length)
    : null;

  return {
    // `available` diz apenas que há itens para ler. Cada bloco abaixo tem a sua própria
    // condição de existência, e o renderer verifica uma a uma.
    available: true,
    leafCount: leaves.length,
    closedCount: withDate.length,
    closedWithoutDate: closed.length - withDate.length,
    openLeaves,
    scope: leaves.length,

    // ── fechamento no tempo: existe se houver data de fechamento ──
    hasClosureDates: withDate.length > 0,
    weeks,
    series: withDate.length ? {
      labels: weeks.map((w) => w.label),
      byType: seriesBy(weeks, withDate, items, (i) => i.type || "Sem tipo"),
      byAssignee: seriesBy(weeks, withDate, items, (i) => i.assignedTo || "não atribuído"),
    } : null,

    // ── sprint: existe se houver iteração com data ──
    hasSprints: sprints.length > 0,
    sprintSource: sprints.length ? "iterações declaradas no tracker, com data de início e fim" : null,
    undatedIterations: (azure.iterations || []).filter((it) => !it.startDate || !it.finishDate).length,
    sprints,
    velocity,
    projection,
    burnup: sprints.length ? sprints.map((s) => ({ label: s.name, value: s.cumulative })) : [],
  };
}

/**
 * Folhas = itens sem filho DENTRO do conjunto consultado.
 *
 * A distinção decide o progresso: uma Feature de 13 pontos com duas Stories de 8 e 5
 * somaria 26 pontos e contaria três entregáveis onde há dois. O item-pai não é trabalho
 * a mais, é o agrupamento do mesmo trabalho.
 */
export function leavesOf(items) {
  const parents = new Set(items.map((i) => i.parentId).filter((x) => x !== null && x !== undefined).map(String));
  return items.filter((i) => !parents.has(String(i.id)));
}

/**
 * Sprints REAIS: uma linha por iteração com início e fim declarados.
 *
 * A atribuição do item ao sprint é pelo `iterationPath` que o próprio item carrega —
 * o campo que o time preencheu — e não pela data em que fechou. São coisas diferentes:
 * um item pode fechar depois do fim do sprint em que estava planejado, e forçar a
 * data por cima do campo reescreveria o histórico do time.
 */
function realSprints(iterations, allItems, leaves) {
  const dated = (iterations || [])
    .filter((it) => it && it.path && it.startDate && it.finishDate)
    .filter((it) => Number.isFinite(Date.parse(it.startDate)) && Number.isFinite(Date.parse(it.finishDate)))
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
  if (!dated.length) return [];

  const now = Date.now();
  let cumulative = 0;
  const out = [];

  for (const it of dated) {
    const inSprint = leaves.filter((i) => samePath(i.iterationPath, it.path));
    const done = inSprint.filter((i) => i.category === "done");
    // Sprint declarado mas sem nenhum item atribuído é ruído de configuração, não
    // entrega: entra como zero apenas se algum outro sprint tiver movimento.
    cumulative += done.length;
    out.push({
      name: it.name || it.path,
      path: it.path,
      start: it.startDate,
      end: it.finishDate,
      planned: inSprint.length,
      closed: done.length,
      created: allItems.filter((i) => samePath(i.iterationPath, it.path)).length,
      cumulative,
      ongoing: Date.parse(it.finishDate) > now && Date.parse(it.startDate) <= now,
      future: Date.parse(it.startDate) > now,
      byType: countBy(done, (i) => i.type || "Sem tipo"),
      byAssignee: countBy(done, (i) => i.assignedTo || "não atribuído"),
    });
  }

  // Nenhum item em nenhum sprint = as iterações existem mas ninguém as usa para
  // planejar. Exibir nove barras zeradas não informa nada.
  if (!out.some((s) => s.planned > 0)) return [];
  return out;
}

/** Compara caminhos de iteração tolerando barra invertida, barra normal e espaços. */
function samePath(a, b) {
  const norm = (s) => String(s || "").replace(/[\\/]+/g, "\\").replace(/\s+/g, " ").trim().toLowerCase();
  return norm(a) === norm(b) && norm(a) !== "";
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function mondayOf(t) {
  const d = new Date(t);
  const dow = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
}

function weekLabel(t) {
  const d = new Date(t);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
}

/**
 * Fechamento por semana. Isto NÃO é sprint: é a contagem de datas reais de fechamento
 * agrupadas por semana do calendário — uma medida, não uma cadência inferida. Por isso
 * continua existindo em projeto sem sprint configurado.
 */
function buildWeeks(closed) {
  const times = closed.map((i) => Date.parse(i.closedDate));
  const start = mondayOf(Math.min(...times));
  const end = Math.max(...times);
  const out = [];
  for (let t = start; t <= end && out.length < 260; t += 7 * DAY) {
    out.push({ start: t, end: t + 7 * DAY - 1, label: weekLabel(t), count: 0 });
  }
  if (!out.length) out.push({ start, end: start + 7 * DAY - 1, label: weekLabel(start), count: 0 });
  for (const t of times) {
    const idx = Math.floor((t - start) / (7 * DAY));
    if (out[idx]) out[idx].count++;
  }
  return out;
}

function seriesBy(weeks, closed, allItems, keyOf) {
  const keys = new Map();
  for (const i of closed) {
    const k = keyOf(i);
    if (!keys.has(k)) keys.set(k, new Array(weeks.length).fill(0));
    const idx = Math.floor((Date.parse(i.closedDate) - weeks[0].start) / (7 * DAY));
    if (idx >= 0 && idx < weeks.length) keys.get(k)[idx]++;
  }
  // `available` = quantos existem no escopo daquela chave, fechados ou não. É o que
  // permite ler "7/22" no rótulo: fechou 7 das 22 histórias, não 7 no absoluto.
  const universe = new Map();
  for (const i of allItems) universe.set(keyOf(i), (universe.get(keyOf(i)) || 0) + 1);
  return [...keys.entries()]
    .map(([key, per]) => ({ key, label: key, per, available: universe.get(key) || null }))
    .sort((a, b) => sum(b.per) - sum(a.per));
}

function sum(a) { return a.reduce((x, y) => x + y, 0); }

function countBy(items, keyOf) {
  const m = new Map();
  for (const i of items) m.set(keyOf(i), (m.get(keyOf(i)) || 0) + 1);
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

/**
 * Velocidade sobre os sprints ENCERRADOS. Sprint em curso não entra: contar uma janela
 * pela metade puxa a média para baixo e faz o time parecer mais lento do que é.
 */
function computeVelocity(sprints) {
  const done = sprints.filter((s) => !s.ongoing && !s.future);
  if (!done.length) return { median: null, mean: null, last3: null, closedSprints: 0 };
  const vals = done.map((s) => s.closed).slice().sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  const median = vals.length % 2 ? vals[mid] : Math.round(((vals[mid - 1] + vals[mid]) / 2) * 10) / 10;
  const mean = Math.round((sum(done.map((s) => s.closed)) / done.length) * 10) / 10;
  const last = done.slice(-3);
  const last3 = Math.round((sum(last.map((s) => s.closed)) / last.length) * 10) / 10;
  const total = sum(done.map((s) => s.closed));
  const peak = Math.max(...done.map((s) => s.closed));
  return {
    median, mean, last3, closedSprints: done.length, peak,
    // O maior sprint dominar mais da metade do total é o sinal de que a média mente —
    // o relatório usa isto para justificar a escolha da mediana em vez de só afirmá-la.
    peakShare: total ? Math.round((peak / total) * 100) : null,
    peakSprint: (done.find((s) => s.closed === peak) || {}).name || null,
  };
}

/** Projeção linear a partir da cadência observada. Só existe com sprint real medido. */
function project(sprints, velocity, remaining) {
  const closedSprints = sprints.filter((s) => !s.ongoing && !s.future);
  if (!closedSprints.length) return null;
  const last = closedSprints[closedSprints.length - 1];
  const lastEnd = Date.parse(last.end);
  // Duração média real dos sprints do projeto — não um valor fixo de 14 dias.
  // O `+ 1` é porque `finishDate` no tracker é o ÚLTIMO DIA do sprint, não o dia
  // seguinte: de 06 a 19 de abril são 14 dias, não 13. Sem ele, cada sprint projetado
  // encurtava um dia e a data de conclusão vinha adiantada.
  const lengths = closedSprints.map((s) => Math.max(1, Math.round((Date.parse(s.end) - Date.parse(s.start)) / DAY) + 1));
  const sprintDays = Math.round(sum(lengths) / lengths.length);

  const scenario = (label, rate, when) => {
    if (!rate || rate <= 0) return null;
    const n = Math.ceil(remaining / rate);
    return { label, rate, sprints: n, date: new Date(lastEnd + n * sprintDays * DAY).toISOString(), when };
  };
  const scenarios = [
    scenario("Ritmo mediano", velocity.median, "Cadência típica, sem o efeito de um pico pontual. É o cenário de referência."),
    scenario("Média de todos os sprints", velocity.mean, "Só se repetir uma nova onda de fechamento em bloco."),
    scenario("Média dos 3 últimos sprints", velocity.last3, "Se o ritmo recente se mantiver."),
  ].filter(Boolean);
  if (!scenarios.length) return null;
  return { remaining, sprintDays, scenarios, adopted: scenarios[0] };
}

/** Pontos da projeção no burnup. Saem VAZADOS no gráfico: são conta, não histórico. */
export function projectionPoints(delivery) {
  if (!delivery || !delivery.hasSprints || !delivery.projection) return [];
  const rate = delivery.projection.adopted.rate;
  const scope = delivery.scope;
  let cur = delivery.sprints.length ? delivery.sprints[delivery.sprints.length - 1].cumulative : 0;
  const out = [];
  let k = delivery.sprints.length;
  while (cur < scope && out.length < 12) {
    cur = Math.min(scope, cur + rate);
    k++;
    out.push({ label: `+${k - delivery.sprints.length}`, value: Math.round(cur) });
  }
  return out;
}

/** Matriz sprint × pessoa. Só existe com sprint real e mais de uma pessoa. */
export function loadMatrix(delivery) {
  if (!delivery || !delivery.hasSprints) return null;
  const people = new Map();
  for (const s of delivery.sprints) {
    for (const a of s.byAssignee) people.set(a.key, (people.get(a.key) || 0) + a.count);
  }
  if (people.size < 2) return null;
  const order = [...people.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...delivery.sprints.flatMap((s) => s.byAssignee.map((a) => a.count)), 1);
  return {
    people: order.map(([name, total]) => ({ name, total })),
    sprints: delivery.sprints.map((s) => s.name),
    max,
    cell: (person, sprintName) => {
      const s = delivery.sprints.find((x) => x.name === sprintName);
      if (!s) return 0;
      const hit = s.byAssignee.find((a) => a.key === person);
      return hit ? hit.count : 0;
    },
  };
}
