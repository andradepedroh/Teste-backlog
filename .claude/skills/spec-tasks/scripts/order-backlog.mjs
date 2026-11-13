#!/usr/bin/env node
/**
 * order-backlog.mjs — ordem lógica de execução do backlog, nos quatro níveis (epic, feature, story,
 * task), para que ele seja lido e executado do primeiro ao último item.
 *
 * Antes deste script ninguém ordenava: a ordem dos arrays era a ordem em que a IA escreveu, e o
 * Azure DevOps recebia os work items nessa ordem — que não seguia as dependências.
 *
 * A regra (mesma nos quatro níveis), critérios em ordem de precedência — um só desempata o anterior:
 *   0. Precedência declarada — story com `mustImplementFirst: true` (a transversal de segurança do
 *      Passo F da spec-security-review) vem antes de todas, inclusive das de outra epic; e, dentro da
 *      story, a task SEC (`class: security`, Passo E.2) vem antes das funcionais. Sem violar
 *      dependência explícita: o que o item prioritário exige (antecessores, direta ou indiretamente)
 *      sobe junto com ele, e só isso. Antes disto o campo não era lido — a transversal saía em 3º,
 *      depois de stories que não dependiam dela, e rodar este script depois do inject-sec desfazia a
 *      ordem que ele grava (D39 do teste ponta a ponta).
 *   1. Dependência — nada vem antes daquilo de que depende (Kahn). Dependência entre filhos SOBE para
 *      os pais: se uma story da feature B depende de uma story da feature A, a feature B vem depois.
 *   2. Camada — data → service → ui → integration → quality (fundação antes de quem usa).
 *   3. Etapa do flow-map — a `ordem N` do campo `etapa` (`ETP-xxx (ordem N)`); desempate, nunca bloqueio.
 *   4. Prioridade — CRITICAL → HIGH → MEDIUM → LOW (sem prioridade conta como MEDIUM).
 *   5. `sequence` da task (a ordem que o autor deu dentro da story) e, por fim, o ID — a ordem é estável.
 * Os pais herdam, como critério de desempate, a posição do próprio pai (features agrupadas por epic,
 * stories por feature).
 *
 * Camada: a task usa `layer` quando declarado; senão o script infere — `uiContext` ou type frontend
 * → ui; type integration → integration; type test → quality; type database/infra, ou persistência
 * sem contrato de API → data; o resto → service. Story, feature e epic recebem a camada mais
 * fundacional entre as das suas tasks.
 *
 * Gravação: `executionOrder` (posição no nível inteiro do backlog, 1 = primeiro) em todo item e a
 * `layer` derivada. Na geração completa, também reescreve `epics[]`, `features[]`, `stories[]` e o
 * `tasks[]` de cada story nessa ordem e renumera o `sequence` das tasks. No modo `_change`
 * (`metadata.changeMode` ou `--change`) NÃO reordena array nem toca em `sequence`: conteúdo existente
 * fica na ordem original e o diff fica pequeno. Idempotente.
 *
 * Avisos (WARNING — princípio P4 do plano de melhoria das skills; viram FATAL depois de rodar em
 * backlog real): BACKLOG_ORDER_ACYCLIC (ciclo — os itens do ciclo ficam na ordem de desempate),
 * BACKLOG_DEPENDENCY_EXISTS (dependência para ID que não existe), BACKLOG_LAYER_CHECK (camada
 * declarada que contradiz uma inferência forte).
 *
 * Uso:
 *   node order-backlog.mjs --input <tasks.json> [--output <path>] [--change] [--dry-run] [--json]
 *
 * Exit codes: 0 ordenado (com ou sem aviso) · 2 entrada não aplicável (arquivo ausente, JSON
 * ilegível, backlog sem story). O 1 fica reservado para quando os avisos virarem FATAL.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CAMADAS = ['data', 'service', 'ui', 'integration', 'quality'];
const PRIORIDADE = { CRITICAL: 0, HIGHEST: 0, HIGH: 1, MEDIUM: 2, NORMAL: 2, LOW: 3 };
const arr = (v) => (Array.isArray(v) ? v : []);
const ids = (v) => arr(v).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
const cmpId = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true });

/** Camada inferida da task, e se a inferência é forte (base para o BACKLOG_LAYER_CHECK). */
export function inferirCamada(t) {
  const tipo = String(t?.type ?? '').toLowerCase();
  const temApi = arr(t?.apiContracts).length > 0;
  const temDados = arr(t?.persistenceModel?.entities).length > 0;
  if (t?.uiContext || tipo === 'frontend') return { layer: 'ui', forte: true };
  if (tipo === 'integration') return { layer: 'integration', forte: true };
  if (tipo === 'test') return { layer: 'quality', forte: true };
  if (tipo === 'database' || tipo === 'infra' || (temDados && !temApi)) return { layer: 'data', forte: temDados && !temApi };
  return { layer: 'service', forte: temApi };
}

export const ordemDaEtapa = (etapa) => {
  const m = String(etapa ?? '').match(/ordem\s*(\d+)/i);
  return m ? Number(m[1]) : Infinity;
};
const etapaDe = (x) => x?.uiContext?.etapa ?? x?.etapa ?? null;
const prioridadeDe = (x) => PRIORIDADE[String(x?.priority ?? '').toUpperCase()] ?? PRIORIDADE.MEDIUM;
const rankCamada = (l) => { const i = CAMADAS.indexOf(l); return i < 0 ? 1 : i; };

/** Kahn com desempate por chave. Devolve a ordem e os nós que sobraram em ciclo (anexados no fim). */
export function ordenar(nos, arestas, chave) {
  const dentro = new Set(nos);
  const grau = new Map(nos.map((n) => [n, 0]));
  const suc = new Map(nos.map((n) => [n, []]));
  for (const [de, para] of arestas) {
    if (!dentro.has(de) || !dentro.has(para) || de === para) continue;
    suc.get(de).push(para);
    grau.set(para, grau.get(para) + 1);
  }
  const cmp = (a, b) => {
    const ka = chave(a); const kb = chave(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] === kb[i]) continue;
      if (typeof ka[i] === 'string' || typeof kb[i] === 'string') return cmpId(ka[i], kb[i]);
      return ka[i] - kb[i];
    }
    return 0;
  };
  const prontos = nos.filter((n) => grau.get(n) === 0);
  const ordem = [];
  while (prontos.length) {
    prontos.sort(cmp);
    const n = prontos.shift();
    ordem.push(n);
    for (const m of suc.get(n)) { grau.set(m, grau.get(m) - 1); if (grau.get(m) === 0) prontos.push(m); }
  }
  const ciclo = nos.filter((n) => !ordem.includes(n)).sort(cmp);
  return { ordem: [...ordem, ...ciclo], ciclo };
}

/** O cálculo inteiro, em memória. Não lê nem grava arquivo. */
export function ordenarBacklog(docOriginal, { change = false } = {}) {
  const doc = structuredClone(docOriginal);
  const avisos = [];
  const epics = arr(doc.epics); const features = arr(doc.features); const stories = arr(doc.stories);
  const porId = new Map();
  for (const [nivel, lista] of [['epic', epics], ['feature', features], ['story', stories]]) for (const x of lista) if (x?.id) porId.set(x.id, { nivel, x });
  const tarefas = [];
  for (const s of stories) for (const t of arr(s?.tasks)) if (t?.id) { tarefas.push({ t, s }); porId.set(t.id, { nivel: 'task', x: t, story: s }); }

  // Pai de cada item.
  const featureDaStory = (s) => (s.featureId && porId.get(s.featureId)?.nivel === 'feature' ? s.featureId : null);
  const epicDaFeature = (f) => (f.epicId && porId.get(f.epicId)?.nivel === 'epic' ? f.epicId : null);
  const epicDaStory = (s) => (featureDaStory(s) ? epicDaFeature(porId.get(s.featureId).x) : (s.epicId && porId.get(s.epicId)?.nivel === 'epic' ? s.epicId : null));
  const storyDaTask = new Map(tarefas.map(({ t, s }) => [t.id, s.id]));

  // Camada: a da task (declarada ou inferida) e a mais fundacional entre os filhos nos níveis acima.
  let inferidas = 0;
  for (const { t } of tarefas) {
    const inf = inferirCamada(t);
    if (!CAMADAS.includes(t.layer)) { t.layer = inf.layer; inferidas++; }
    else if (inf.forte && inf.layer !== t.layer) {
      avisos.push({ code: 'BACKLOG_LAYER_CHECK', item: t.id, mensagem: `${t.id}: layer «${t.layer}» declarada, mas o conteúdo indica «${inf.layer}» — confira` });
    }
  }
  const menorCamada = (lista) => lista.reduce((m, l) => (rankCamada(l) < rankCamada(m) ? l : m), 'quality');
  for (const s of stories) if (arr(s.tasks).length) s.layer = menorCamada(arr(s.tasks).map((t) => t.layer));
  for (const f of features) {
    const ls = stories.filter((s) => featureDaStory(s) === f.id && s.layer).map((s) => s.layer);
    if (ls.length) f.layer = menorCamada(ls);
  }
  for (const e of epics) {
    const ls = [...features.filter((f) => epicDaFeature(f) === e.id && f.layer).map((f) => f.layer),
      ...stories.filter((s) => !featureDaStory(s) && epicDaStory(s) === e.id && s.layer).map((s) => s.layer)];
    if (ls.length) e.layer = menorCamada(ls);
  }
  const etapaMin = (lista) => Math.min(Infinity, ...lista.map((x) => ordemDaEtapa(etapaDe(x))));
  const etapaStory = (s) => Math.min(ordemDaEtapa(etapaDe(s)), etapaMin(arr(s.tasks)));
  const etapaFeature = (f) => Math.min(ordemDaEtapa(etapaDe(f)), ...stories.filter((s) => featureDaStory(s) === f.id).map(etapaStory));
  const etapaEpic = (e) => Math.min(ordemDaEtapa(etapaDe(e)), ...features.filter((f) => epicDaFeature(f) === e.id).map(etapaFeature),
    ...stories.filter((s) => !featureDaStory(s) && epicDaStory(s) === e.id).map(etapaStory));

  // Arestas declaradas, por nível, e o que sobe para os pais.
  const declaradas = (x, nivelEsperado) => {
    const out = [];
    for (const d of [...ids(x.dependencies), ...ids(x.dependsOn)]) {
      const alvo = porId.get(d);
      if (!alvo) { avisos.push({ code: 'BACKLOG_DEPENDENCY_EXISTS', item: x.id, mensagem: `${x.id} depende de «${d}», que não existe no backlog` }); continue; }
      out.push({ de: d, nivel: alvo.nivel, esperado: nivelEsperado });
    }
    return out;
  };
  const eT = []; const eS = []; const eF = []; const eE = [];
  const nivelDe = (id) => porId.get(id)?.nivel;
  const subir = (de, para) => {
    // Converte uma dependência (de → para) entre quaisquer dois itens na aresta de cada nível em que eles divergem.
    const cadeia = (id) => {
      const n = nivelDe(id); const x = porId.get(id).x;
      const story = n === 'task' ? storyDaTask.get(id) : n === 'story' ? id : null;
      const s = story ? porId.get(story).x : null;
      const feature = n === 'feature' ? id : s ? featureDaStory(s) : null;
      const epic = n === 'epic' ? id : n === 'feature' ? epicDaFeature(x) : s ? epicDaStory(s) : null;
      return { task: n === 'task' ? id : null, story, feature, epic };
    };
    const a = cadeia(de); const b = cadeia(para);
    if (a.epic && b.epic && a.epic !== b.epic) eE.push([a.epic, b.epic]);
    if (a.feature && b.feature && a.feature !== b.feature) eF.push([a.feature, b.feature]);
    if (a.story && b.story && a.story !== b.story) eS.push([a.story, b.story]);
    if (a.task && b.task && a.story === b.story) eT.push([a.task, b.task]);
  };
  for (const { t } of tarefas) for (const d of declaradas(t, 'task')) subir(d.de, t.id);
  for (const s of stories) for (const d of declaradas(s, 'story')) subir(d.de, s.id);
  for (const f of features) for (const d of declaradas(f, 'feature')) subir(d.de, f.id);
  for (const e of epics) for (const d of declaradas(e, 'epic')) subir(d.de, e.id);

  const ciclo = (nivel, r) => {
    if (r.ciclo.length) avisos.push({ code: 'BACKLOG_ORDER_ACYCLIC', nivel, mensagem: `ciclo de dependência entre ${nivel}s: ${r.ciclo.join(', ')} — ficaram na ordem de desempate; quebre o ciclo no backlog` });
  };

  // Critério 0 — precedência declarada: os itens prioritários e, para não violar dependência, tudo de
  // que eles dependem (fecho transitivo pelos antecessores). Só isso sobe; o resto mantém a regra.
  const comAntecessores = (sementes, arestas) => {
    const antes = new Map();
    for (const [de, para] of arestas) { if (!antes.has(para)) antes.set(para, []); antes.get(para).push(de); }
    const fecho = new Set(sementes);
    const fila = [...sementes];
    while (fila.length) for (const de of antes.get(fila.shift()) ?? []) if (!fecho.has(de)) { fecho.add(de); fila.push(de); }
    return fecho;
  };
  const storyPrioritaria = comAntecessores(stories.filter((s) => s.mustImplementFirst === true).map((s) => s.id), eS);
  const ehTaskSec = (t) => String(t?.class ?? '').toLowerCase() === 'security' || t?.generatedBy === 'spec-security-review';
  const taskPrioritaria = comAntecessores(tarefas.filter(({ t }) => ehTaskSec(t)).map(({ t }) => t.id), eT);

  // 1) epics  2) features (agrupadas pelo epic)  3) stories (agrupadas pela feature/epic)  4) tasks dentro da story.
  const rE = ordenar(epics.map((e) => e.id), eE, (id) => { const e = porId.get(id).x; return [rankCamada(e.layer), etapaEpic(e), prioridadeDe(e), id]; });
  ciclo('epic', rE);
  const posE = new Map(rE.ordem.map((id, i) => [id, i]));
  const rF = ordenar(features.map((f) => f.id), eF, (id) => { const f = porId.get(id).x; return [posE.get(epicDaFeature(f)) ?? Infinity, rankCamada(f.layer), etapaFeature(f), prioridadeDe(f), id]; });
  ciclo('feature', rF);
  const posF = new Map(rF.ordem.map((id, i) => [id, i]));
  const rS = ordenar(stories.map((s) => s.id), eS, (id) => {
    const s = porId.get(id).x;
    return [storyPrioritaria.has(id) ? 0 : 1, posE.get(epicDaStory(s)) ?? Infinity, posF.get(featureDaStory(s)) ?? Infinity, rankCamada(s.layer), etapaStory(s), prioridadeDe(s), id];
  });
  ciclo('story', rS);
  const ordemTasks = [];
  for (const sid of rS.ordem) {
    const s = porId.get(sid).x;
    const r = ordenar(arr(s.tasks).map((t) => t.id), eT, (id) => {
      const t = porId.get(id).x;
      return [taskPrioritaria.has(id) ? 0 : 1, rankCamada(t.layer), ordemDaEtapa(etapaDe(t)), prioridadeDe(t), typeof t.sequence === 'number' ? t.sequence : Infinity, id];
    });
    if (r.ciclo.length) avisos.push({ code: 'BACKLOG_ORDER_ACYCLIC', nivel: 'task', mensagem: `ciclo de dependência entre tasks da story ${sid}: ${r.ciclo.join(', ')}` });
    ordemTasks.push(...r.ordem);
    if (!change) {
      const pos = new Map(r.ordem.map((id, i) => [id, i]));
      s.tasks = [...arr(s.tasks)].sort((a, b) => pos.get(a.id) - pos.get(b.id));
      s.tasks.forEach((t, i) => { t.sequence = i + 1; });
    }
  }
  const gravar = (ordem) => ordem.forEach((id, i) => { porId.get(id).x.executionOrder = i + 1; });
  gravar(rE.ordem); gravar(rF.ordem); gravar(rS.ordem); gravar(ordemTasks);
  if (!change) {
    const reordenar = (lista, ordem) => { const pos = new Map(ordem.map((id, i) => [id, i])); return [...lista].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity)); };
    if (Array.isArray(doc.epics)) doc.epics = reordenar(doc.epics, rE.ordem);
    if (Array.isArray(doc.features)) doc.features = reordenar(doc.features, rF.ordem);
    doc.stories = reordenar(doc.stories, rS.ordem);
  }
  return {
    doc, avisos, camadasInferidas: inferidas,
    ordem: { epics: rE.ordem, features: rF.ordem, stories: rS.ordem, tasks: ordemTasks },
  };
}

function main(argv) {
  let input = null; let output = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') input = argv[++i];
    else if (argv[i] === '--output') output = argv[++i];
    else if (!argv[i].startsWith('--') && !input) input = argv[i];
  }
  input ??= 'outputs/spec/tasks.json';
  let doc;
  try {
    if (!existsSync(input)) throw new Error(`arquivo inexistente: ${input}`);
    doc = JSON.parse(readFileSync(input, 'utf8'));
  } catch (e) {
    process.stderr.write(`order-backlog: entrada ilegível — ${e?.message || e}\n`);
    return 2;
  }
  if (!Array.isArray(doc?.stories) || doc.stories.length === 0) {
    process.stderr.write('order-backlog: o tasks.json não tem stories[] — nada a ordenar.\n');
    return 2;
  }
  const change = argv.includes('--change') || doc?.metadata?.changeMode === true;
  const r = ordenarBacklog(doc, { change });
  if (!argv.includes('--dry-run')) writeFileSync(output ?? input, `${JSON.stringify(r.doc, null, 2)}\n`, 'utf8');
  const rel = { modo: change ? '_change (arrays na ordem original; só executionOrder)' : 'completo (arrays reordenados)',
    ordem: r.ordem, camadasInferidas: r.camadasInferidas, avisos: r.avisos };
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(rel, null, 2)}\n`);
  else {
    process.stdout.write(`order-backlog: ${r.ordem.epics.length} epic(s), ${r.ordem.features.length} feature(s), ${r.ordem.stories.length} story(ies), ${r.ordem.tasks.length} task(s) ordenadas — modo ${rel.modo}; ${r.camadasInferidas} camada(s) inferida(s)${argv.includes('--dry-run') ? ' (simulação — nada gravado)' : ''}.\n`);
    for (const a of r.avisos) process.stdout.write(`  [${a.code}] ${a.mensagem}\n`);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
