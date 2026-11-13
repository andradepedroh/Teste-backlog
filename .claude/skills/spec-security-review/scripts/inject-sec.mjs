#!/usr/bin/env node
/**
 * inject-sec.mjs — o Passo E da spec-security-review feito por código: injeta as tasks SEC-NNN nas
 * stories do `tasks.json`, grava `metadata.securityReview` e escreve de forma atômica, com backup.
 *
 * Por que existe: o passo E era a IA reescrevendo à mão a única fonte de verdade do backlog — um
 * arquivo de centenas de KB — para acrescentar algumas tasks. A IA continua escrevendo o CONTEÚDO de
 * cada task SEC (isso é julgamento); a junção, as conferências de forma e a escrita são deste script.
 *
 * Uso:
 *   node <dir-desta-skill>/scripts/inject-sec.mjs <tasks.json> <tasks-sec.json>
 *        [--kernel <plano-de-seguranca.md>] [--transversal <story-transversal.json>]
 *        [--reprocessar | --acrescentar [--origem <skill>]] [--simular] [--json]
 *
 *   --kernel          confere o KERNEL_CONSUMED (FATAL, Decisão 68): todo `SEC-###` do Catálogo SEC do
 *                     kernel que pede task — CRÍTICO ou ALTO em aberto, e o de severidade que não se
 *                     leu — tem de existir como task no tasks.json resultante, com o mesmo ID; senão,
 *                     recusa e não escreve. COBERTO, ADIADO e BAIXO não são cobrados; MÉDIO depende do
 *                     esforço (C.4) e só aparece no relatório. Kernel que cita `SEC-NNN` mas de onde o
 *                     catálogo não foi lido é exit 2 — nunca aprovação sem conferir.
 *
 *   <tasks-sec.json>  array de tasks SEC no formato do E.1 (ou `{ "tasks": [...] }`), cada uma com
 *                     `storyId` da story onde entra.
 *   --transversal     story transversal do Passo F (formato do `tasks.transversal-story-example.json`),
 *                     acrescentada a `stories[]` se ainda não existir; tasks SEC com o `storyId` dela
 *                     entram nela.
 *   --reprocessar     o consultor decidiu reprocessar um backlog que já tem `metadata.securityReview`
 *                     (E.4, `NO_SILENT_REINJECTION`): tasks SEC com ID já presente são SUBSTITUÍDAS.
 *                     Sem a flag, backlog já revisado é recusado.
 *   --acrescentar     task SEC achada depois, numa auditoria (`auditoria-de-us`, `spec-code-audit` —
 *                     Decisão 74 do harness): entra mesmo num backlog já revisado, sem refazer a
 *                     revisão. Nunca substitui (ID que já existe é recusado). O `securityReview` fica
 *                     como estava; o acréscimo vai para `metadata.securityAdditions[]`, com a data, os
 *                     IDs e a `--origem`. Não anda junto com --reprocessar.
 *   --simular         confere tudo e mostra o que faria, sem escrever nada.
 *
 * Ordem (E.0 → E.4):
 *   1. confere cada task SEC (`SEC_TASK_SHAPE_COMPLETE`, esforço × dias do mapeamento fixo, storyId
 *      existente, ID `SEC-NNN` sem repetição);
 *   2. injeta no INÍCIO do `tasks[]` da story, na ordem do arquivo de entrada (E.2); a story
 *      transversal nova (F.2) entra em `stories[]`;
 *   2b. se o backlog já tem `executionOrder` (o order-backlog da spec-tasks rodou), renumera para a
 *      posição do E.2 e do F.2: as tasks SEC no início da story, a story transversal nova no início
 *      do backlog (`mustImplementFirst`), o resto na ordem em que estava — sem isso as tasks SEC
 *      ficavam sem número e o Azure DevOps e o relatório HTML as punham no FIM (`renumerarOrdem`);
 *   3. grava `metadata.securityReview` (E.4);
 *   4. escreve `tasks.json.tmp`, roda o `validate-tasks-selfsufficiency.mjs` da spec-tasks nele e só
 *      substitui o original — guardando `tasks.json.bak` — se nenhuma task SEC injetada tiver FATAL.
 *      FATAL de task que já estava no backlog não é deste passo e não bloqueia (vai no relatório).
 *
 * Entra como WARNING (princípio P4 do plano de melhoria das skills): se o script não estiver
 * disponível, o passo E manual continua valendo — com `TOOL_UNAVAILABLE:inject-sec` no sync-log.
 *
 * Exit codes: 0 injetado (ou simulação limpa) · 1 recusado (achado de forma, referência ou
 * validador — nada escrito) · 2 entrada não aplicável (arquivo ausente, JSON ilegível, backlog sem
 * stories).
 */
import { readFileSync, writeFileSync, existsSync, renameSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const AQUI = dirname(fileURLToPath(import.meta.url));
const VALIDADOR = resolve(AQUI, '..', '..', 'spec-tasks', 'scripts', 'validate-tasks-selfsufficiency.mjs');
const ORDEM_BACKLOG = resolve(AQUI, '..', '..', 'spec-tasks', 'scripts', 'order-backlog.mjs');
const SKILL_MD = resolve(AQUI, '..', 'SKILL.md');
export const DIAS_POR_ESFORCO = { XS: 0.25, S: 0.5, M: 1, L: 2 };
const naoVazio = (s) => typeof s === 'string' && s.trim() !== '';

// A ordenação topológica com desempate é a do order-backlog da spec-tasks (a mesma que numerou o
// backlog). Sem ele, a injeção segue e a renumeração fica de fora, com aviso no relatório.
let ordenarGrafo = null;
try {
  ({ ordenar: ordenarGrafo } = await import(pathToFileURL(ORDEM_BACKLOG).href));
} catch {
  ordenarGrafo = null;
}

/** Achados de forma de uma task SEC — os itens do `SEC_TASK_SHAPE_COMPLETE` mais o esforço. */
export function conferirTaskSec(t) {
  const a = [];
  const id = naoVazio(t?.id) ? t.id : '(sem id)';
  const add = (msg) => a.push({ code: 'SEC_TASK_SHAPE_COMPLETE', task: id, mensagem: `${id}: ${msg}` });
  if (!/^SEC-\d+$/.test(String(t?.id ?? ''))) add('`id` não segue `SEC-NNN`');
  if (!naoVazio(t?.storyId)) add('sem `storyId`');
  if (t?.class !== 'security') add('`class` não é "security"');
  if (!naoVazio(t?.type) || t.type === 'task') add('`type` tem que ser o tipo real da task da story (backend, frontend, …), nunca "task"');
  const resumo = t?.agentExecutionContext?.selfContainedSummary;
  if (!naoVazio(resumo) || resumo.trim().length < 800) add(`\`agentExecutionContext.selfContainedSummary\` com ${naoVazio(resumo) ? resumo.trim().length : 0} caracteres (mínimo 800)`);
  const ig = t?.implementationGuidance;
  if (!Array.isArray(ig?.architecturalDecisions) || ig.architecturalDecisions.length === 0) add('`implementationGuidance.architecturalDecisions` vazio');
  if (!ig?.testingStrategy || typeof ig.testingStrategy !== 'object') add('`implementationGuidance.testingStrategy` ausente');
  const ac = Array.isArray(t?.acceptanceCriteria) ? t.acceptanceCriteria : [];
  if (ac.length < 2) add(`${ac.length} \`acceptanceCriteria\` (mínimo 2)`);
  if (!naoVazio(t?.tddTests?.red) || !naoVazio(t?.tddTests?.green)) add('`tddTests.red` e `tddTests.green` são obrigatórios');
  if (t?.security?.mustCompleteBeforeStoryClose !== true) add('`security.mustCompleteBeforeStoryClose` tem que ser true');
  const esforco = t?.effortEstimate;
  if (!(esforco in DIAS_POR_ESFORCO)) add('`effortEstimate` fora de XS | S | M | L');
  else if (t.durationEstimatedDays !== DIAS_POR_ESFORCO[esforco]) {
    add(`\`durationEstimatedDays\` ${t.durationEstimatedDays} não bate com o esforço ${esforco} (= ${DIAS_POR_ESFORCO[esforco]} dia)`);
  }
  return a;
}

/**
 * A junção, em memória. Não lê nem grava arquivo.
 * @returns {{ doc: object, achados: object[], injetadas: Array<{id: string, storyId: string, substituiu: boolean}> }}
 */
export function injetar(docOriginal, tasksSec, { transversal = null, reprocessar = false, acrescentar = false, origem = null, versaoSkill = null, agora = new Date() } = {}) {
  const doc = structuredClone(docOriginal);
  const achados = [];
  if (doc.metadata?.securityReview && !reprocessar && !acrescentar) {
    achados.push({ code: 'NO_SILENT_REINJECTION', mensagem: 'o backlog já tem `metadata.securityReview` de uma revisão anterior — pergunte ao consultor (E.4) e rode com --reprocessar se ele decidir reprocessar' });
    return { doc: docOriginal, achados, injetadas: [] };
  }
  doc.stories = Array.isArray(doc.stories) ? doc.stories : [];
  const transversalNova = transversal && !doc.stories.some((s) => s?.id === transversal.id) ? transversal.id : null;
  if (transversalNova) {
    doc.stories.push({ ...structuredClone(transversal), tasks: Array.isArray(transversal.tasks) ? structuredClone(transversal.tasks) : [] });
  }
  const porStory = new Map(doc.stories.map((s) => [s?.id, s]));
  const idsExistentes = new Map();
  for (const s of doc.stories) for (const t of Array.isArray(s?.tasks) ? s.tasks : []) idsExistentes.set(t?.id, s.id);

  const vistos = new Set();
  for (const t of tasksSec) {
    achados.push(...conferirTaskSec(t));
    if (naoVazio(t?.id)) {
      if (vistos.has(t.id)) achados.push({ code: 'SEC_TASK_SHAPE_COMPLETE', task: t.id, mensagem: `${t.id}: repetida na entrada` });
      vistos.add(t.id);
      if (idsExistentes.has(t.id) && !reprocessar) {
        achados.push({ code: 'NO_SILENT_REINJECTION', task: t.id, mensagem: `${t.id}: já existe no backlog (story ${idsExistentes.get(t.id)}) — reinjeção só com --reprocessar` });
      }
    }
    if (naoVazio(t?.storyId) && !porStory.has(t.storyId)) {
      achados.push({ code: 'SEC_TASK_SHAPE_COMPLETE', task: t?.id, mensagem: `${t?.id}: story \`${t.storyId}\` não existe no tasks.json` });
    }
  }
  if (achados.length) return { doc: docOriginal, achados, injetadas: [] };

  // Remove as versões antigas (só chega aqui com --reprocessar) e injeta no início, na ordem dada.
  const injetadas = [];
  const porDestino = new Map();
  for (const t of tasksSec) {
    const substituiu = idsExistentes.has(t.id);
    if (substituiu) {
      const velha = porStory.get(idsExistentes.get(t.id));
      velha.tasks = velha.tasks.filter((x) => x?.id !== t.id);
    }
    if (!porDestino.has(t.storyId)) porDestino.set(t.storyId, []);
    const { _comment, ...limpa } = t;
    porDestino.get(t.storyId).push(limpa);
    injetadas.push({ id: t.id, storyId: t.storyId, substituiu });
  }
  for (const [storyId, novas] of porDestino) {
    const s = porStory.get(storyId);
    s.tasks = [...novas, ...(Array.isArray(s.tasks) ? s.tasks : [])];
  }
  const ordem = renumerarOrdem(doc, { novas: new Set(tasksSec.map((t) => t.id)), transversalNova });

  doc.metadata = doc.metadata ?? {};
  if (acrescentar) {
    // Task achada depois, numa auditoria (Decisão 74): a revisão (`securityReview`) fica como estava —
    // ou ausente, se nunca houve — e o acréscimo é registrado à parte. Criar um `securityReview` aqui
    // faria a revisão de verdade, depois, ser recusada como reinjeção.
    const extra = Array.isArray(doc.metadata.securityAdditions) ? doc.metadata.securityAdditions : [];
    doc.metadata.securityAdditions = [...extra, { addedAt: agora.toISOString(), ids: tasksSec.map((t) => t.id), source: origem ?? 'nao-informada' }];
    return { doc, achados, injetadas, ordem };
  }
  const severidades = tasksSec.map((t) => String(t?.security?.severity ?? '').toUpperCase());
  doc.metadata.securityReview = {
    reviewedAt: agora.toISOString(),
    skillVersion: versaoSkill ?? 'desconhecida',
    tasksInjected: tasksSec.length,
    findingsCritical: severidades.filter((s) => s.startsWith('CR')).length,
    findingsHigh: severidades.filter((s) => s === 'ALTO' || s === 'HIGH').length,
  };
  return { doc, achados, injetadas, ordem };
}

const temOrdem = (x) => typeof x?.executionOrder === 'number' && Number.isFinite(x.executionOrder);
const idsDe = (v) => arr(v).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());

/**
 * Renumera o `executionOrder` depois da injeção, na posição que o E.2 e o F.2 pedem — só quando o
 * backlog já tem a ordem do order-backlog da spec-tasks (backlog sem ela continua sem ela):
 *   · story: a transversal nova (`transversalNova`) vem primeiro (`mustImplementFirst: true`), a não
 *     ser que ela mesma dependa de outra; as demais mantêm a ordem em que estavam;
 *   · task (numeração do backlog inteiro, story a story): as tasks SEC novas (`novas`) abrem a
 *     story, na ordem em que foram injetadas; as outras mantêm a ordem em que estavam.
 * A ordenação é o `ordenar` do order-backlog (Kahn com desempate): dependência declarada continua
 * valendo. Na geração completa os arrays e o `sequence` das stories tocadas acompanham; no `_change`
 * (`metadata.changeMode`), como no order-backlog, só o `executionOrder` muda. Determinístico e
 * idempotente: sem task nova, renumerar de novo não muda nada.
 * O order-backlog lê os mesmos dois critérios (`mustImplementFirst` na story, task SEC no início da
 * story — critério 0 dele), então rodá-lo depois, como o Passo E da SKILL manda, não desfaz esta
 * ordem: só reordena o resto do backlog pela regra completa.
 * @param {object} doc  tasks.json, alterado no lugar
 * @param {{ novas?: Set<string>, transversalNova?: string | null }} [opts]
 */
export function renumerarOrdem(doc, { novas = new Set(), transversalNova = null } = {}) {
  const stories = arr(doc?.stories);
  const jaOrdenado = stories.some((s) => s?.id !== transversalNova && temOrdem(s))
    || stories.some((s) => arr(s?.tasks).some((t) => !novas.has(t?.id) && temOrdem(t)));
  if (!jaOrdenado) return { renumerada: false, motivo: 'o backlog não tem executionOrder (o order-backlog da spec-tasks não rodou) — nada a renumerar' };
  if (!ordenarGrafo) return { renumerada: false, motivo: 'TOOL_UNAVAILABLE:order-backlog — as tasks SEC ficaram sem executionOrder; rode o order-backlog da spec-tasks no tasks.json' };
  const change = doc?.metadata?.changeMode === true;

  // Stories: dependência declarada (na story ou nas tasks dela) vira aresta entre stories.
  const posStory = new Map(stories.map((s, i) => [s.id, i]));
  const storyDaTask = new Map(stories.flatMap((s) => arr(s.tasks).map((t) => [t?.id, s.id])));
  const storyDe = (d) => (posStory.has(d) ? d : storyDaTask.get(d));
  const arestasS = [];
  for (const s of stories) {
    for (const d of [s, ...arr(s.tasks)].flatMap((x) => [...idsDe(x?.dependencies), ...idsDe(x?.dependsOn)])) {
      const alvo = storyDe(d);
      if (alvo && alvo !== s.id) arestasS.push([alvo, s.id]);
    }
  }
  const chaveStory = (id) => {
    const s = stories[posStory.get(id)];
    return [id === transversalNova ? 0 : temOrdem(s) ? s.executionOrder : Infinity, posStory.get(id)];
  };
  const ordemStories = ordenarGrafo(stories.map((s) => s.id), arestasS, chaveStory).ordem;
  ordemStories.forEach((id, i) => { stories[posStory.get(id)].executionOrder = i + 1; });

  // Tasks: SEC nova primeiro, na ordem do array (a injeção as pôs no início); o resto como estava.
  let n = 0;
  for (const sid of ordemStories) {
    const s = stories[posStory.get(sid)];
    const tasks = arr(s.tasks);
    const posTask = new Map(tasks.map((t, i) => [t.id, i]));
    const arestasT = tasks.flatMap((t) => [...idsDe(t?.dependencies), ...idsDe(t?.dependsOn)]
      .filter((d) => posTask.has(d) && d !== t.id).map((d) => [d, t.id]));
    const chaveTask = (id) => {
      const t = tasks[posTask.get(id)];
      if (novas.has(id)) return [0, 0, posTask.get(id)];
      return [1, temOrdem(t) ? t.executionOrder : Infinity, posTask.get(id)];
    };
    const ordemTasks = ordenarGrafo(tasks.map((t) => t.id), arestasT, chaveTask).ordem;
    for (const id of ordemTasks) tasks[posTask.get(id)].executionOrder = ++n;
    const tocada = sid === transversalNova || tasks.some((t) => novas.has(t.id));
    if (!change && tocada) {
      s.tasks = ordemTasks.map((id) => tasks[posTask.get(id)]);
      s.tasks.forEach((t, i) => { t.sequence = i + 1; });
    }
  }
  if (!change && transversalNova) {
    // Geração completa: o array de stories fica na ordem de execução — a transversal sai do fim.
    doc.stories = ordemStories.map((id) => stories[posStory.get(id)]);
  }
  return { renumerada: true, stories: ordemStories.length, tasks: n };
}

/** Texto comparável: sem acento, sem marcação Markdown nem emoji, em maiúsculas. */
const comparavel = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s/().,-]/gu, ' ').toUpperCase().replace(/\s+/g, ' ').trim();

/**
 * Status de um SEC do kernel (`ABERTO` / `COBERTO` / `ADIADO`), em qualquer grafia: `**COBERTO**`,
 * `✅ COBERTO`, `coberto`. «Não coberto» e «parcial» querem dizer que o controle ainda falta. Nenhum
 * status ou mais de um (o placeholder `ABERTO / COBERTO / ADIADO` do template) → `null`.
 */
export function lerStatus(valor) {
  const t = comparavel(valor);
  if (/\bNAO\s+COBERTO\b|\bPARCIAL/.test(t)) return 'ABERTO';
  const achados = ['COBERTO', 'ADIADO', 'ABERTO'].filter((s) => new RegExp(`\\b${s}\\b`).test(t));
  return achados.length === 1 ? achados[0] : null;
}

/** Severidade de um SEC do kernel; nenhuma ou mais de uma (placeholder do template) → `null`. */
export function lerSeveridade(valor) {
  const t = comparavel(valor);
  const achados = [
    ['CRÍTICO', /\bCRITIC[OA]\b|\bCRITICAL\b/], ['ALTO', /\bALT[OA]\b|\bHIGH\b/],
    ['MÉDIO', /\bMEDI[OA]\b|\bMEDIUM\b/], ['BAIXO', /\bBAIX[OA]\b|\bLOW\b/],
  ].filter(([, re]) => re.test(t)).map(([s]) => s);
  return achados.length === 1 ? achados[0] : null;
}

/**
 * Quais SEC do kernel o tasks.json tem de ter como task — a regra do C.4 e do E.0-K da SKILL.md:
 * CRÍTICO e ALTO em aberto sempre; MÉDIO só com esforço XS ou S, que o kernel não diz (condicional:
 * não bloqueia, e o relatório lembra de decidir); BAIXO nunca; COBERTO não tem o que implementar;
 * ADIADO foi adiado no próprio kernel. Severidade que não se leu conta como obrigatória — na dúvida,
 * cobra.
 */
function classificar({ severidade, status }) {
  if (status === 'COBERTO') return { classe: 'dispensado', motivo: 'COBERTO no kernel — o controle já existe na spec' };
  if (status === 'ADIADO') return { classe: 'dispensado', motivo: 'ADIADO no kernel — registrar em «Findings não injetados» do security-review.md, com o motivo do adiamento' };
  if (severidade === 'BAIXO') return { classe: 'dispensado', motivo: 'BAIXO não é injetado (C.4) — registrar em «Findings não injetados» do security-review.md, como tech debt' };
  if (severidade === 'MÉDIO') return { classe: 'condicional', motivo: 'MÉDIO vira task só com esforço XS ou S (C.4); com M ou L, registrar em «Findings não injetados» do security-review.md' };
  return { classe: 'exigido', motivo: severidade ? `${severidade} em aberto` : 'severidade não lida no kernel — conta como obrigatório' };
}

const RE_TITULO_CATALOGO = /^(#{2,3})\s+(?:\d+(?:\.\d+)*[.)]?\s+)?Cat[aá]logo\b[^\n]*\bSEC\b/i;
const RE_SEC_INICIO = /^\W*(SEC-\d+)\b/;

/** Células de uma linha de tabela Markdown, ou `null` se a linha não é de tabela. */
const celulas = (linha) => (/^\s*\|.*\|\s*$/.test(linha) ? linha.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()) : null);
const ehSeparador = (cs) => cs.every((c) => /^:?-{2,}:?$/.test(c));

/** Severidade e status de um bloco `### SEC-NNN`: tabela «Campo | Valor» ou linhas «Status: …». */
function camposDoBloco(linhas) {
  const out = { severidade: null, status: null };
  const guardar = (chave, valor) => {
    const k = comparavel(chave);
    if (/^(SEVERIDADE|SEVERITY)$/.test(k) && !out.severidadeLida) { out.severidade = lerSeveridade(valor); out.severidadeLida = true; }
    if (/^(STATUS|SITUACAO)$/.test(k) && !out.statusLido) { out.status = lerStatus(valor); out.statusLido = true; }
  };
  for (const l of linhas) {
    const cs = celulas(l);
    if (cs && cs.length >= 2) { guardar(cs[0], cs.slice(1).join(' ')); continue; }
    const m = l.replace(/[*_]/g, '').match(/^\s*[-+]?\s*(Status|Situa[cç][aã]o|Severidade|Severity)\s*:\s*(.+)$/i);
    if (m) guardar(m[1], m[2]);
  }
  return { severidade: out.severidade, status: out.status };
}

/** SEC de uma tabela única do catálogo: uma linha por SEC, com as colunas Severidade e Status. */
function entradasDaTabela(linhas) {
  const out = [];
  for (let i = 0; i + 1 < linhas.length; i++) {
    const cab = celulas(linhas[i]);
    const sep = celulas(linhas[i + 1]);
    if (!cab || !sep || !ehSeparador(sep)) continue;
    const col = (re) => cab.findIndex((c) => re.test(comparavel(c)));
    const iSev = col(/^(SEVERIDADE|SEVERITY)\b/);
    const iSta = col(/^(STATUS|SITUACAO)\b/);
    for (let j = i + 2; j < linhas.length; j++) {
      const cs = celulas(linhas[j]);
      if (!cs) break;
      const id = cs.map((c) => c.replace(/[*_`[\]]/g, '').match(RE_SEC_INICIO)?.[1]).find(Boolean);
      if (!id) continue;
      out.push({ id, severidade: iSev >= 0 ? lerSeveridade(cs[iSev]) : null, status: iSta >= 0 ? lerStatus(cs[iSta]) : null });
    }
  }
  return out;
}

/**
 * O Catálogo SEC do kernel (`plano-de-seguranca.md`, formato do `templates/plano-de-seguranca.template.md`
 * da revisao-de-seguranca), lido sem depender da grafia exata: título `## Catálogo SEC` com ou sem
 * número e acento; um `### SEC-NNN` por controle (tabela «Campo | Valor» ou linhas «Status: …») ou
 * uma tabela única com as colunas Severidade e Status. A seção acaba no próximo título do mesmo nível
 * — o `SEC-NNN` do Mapa de aplicabilidade não é do catálogo.
 *
 * `idsNoArquivo` conta todo `SEC-NNN` do arquivo: kernel que cita SEC mas de onde nenhuma entrada foi
 * lida é kernel ilegível, não kernel vazio (o chamador recusa com exit 2).
 * @param {string} texto
 */
export function lerCatalogoKernel(texto) {
  const t = String(texto).replace(/\r\n/g, '\n');
  const idsNoArquivo = new Set(t.match(/\bSEC-\d+\b/g) ?? []).size;
  const linhas = t.split('\n');
  const ini = linhas.findIndex((l) => RE_TITULO_CATALOGO.test(l));
  if (ini < 0) return { idsNoArquivo, secaoAchada: false, entradas: [] };
  const nivel = linhas[ini].match(/^#+/)[0].length;
  const nivelDe = (l) => l.match(/^(#{1,6})\s/)?.[1].length ?? Infinity;
  const inicioBloco = (l) => l.match(/^#{2,6}\s+\W*(SEC-\d+)\b/)?.[1];
  // A seção acaba no próximo título do mesmo nível ou acima — que não seja o de um SEC.
  let fim = linhas.findIndex((l, i) => i > ini && nivelDe(l) <= nivel && !inicioBloco(l));
  if (fim < 0) fim = linhas.length;
  const secao = linhas.slice(ini + 1, fim);
  const brutas = [];
  const primeiro = secao.findIndex((l) => inicioBloco(l));
  brutas.push(...entradasDaTabela(primeiro < 0 ? secao : secao.slice(0, primeiro)));
  for (let i = 0; i < secao.length; i++) {
    const id = inicioBloco(secao[i]);
    if (!id) continue;
    // O bloco vai até o próximo SEC ou o próximo título do mesmo nível ou acima.
    let j = i + 1;
    while (j < secao.length && !inicioBloco(secao[j]) && nivelDe(secao[j]) > nivelDe(secao[i])) j++;
    brutas.push({ id, ...camposDoBloco(secao.slice(i + 1, j)) });
  }
  const vistos = new Set();
  const entradas = brutas.filter((e) => !vistos.has(e.id) && vistos.add(e.id)).map((e) => ({ ...e, ...classificar(e) }));
  return { idsNoArquivo, secaoAchada: true, entradas };
}

/**
 * Os `SEC-###` do kernel que precisam existir como task no tasks.json (KERNEL_CONSUMED).
 * @param {string} texto
 * @returns {string[]}
 */
export function secDoKernel(texto) {
  return lerCatalogoKernel(texto).entradas.filter((e) => e.classe === 'exigido').map((e) => e.id);
}

/** O que o relatório diz sobre o kernel: o que foi cobrado e o que ficou para o security-review.md. */
function resumoDoKernel(kernel, doc) {
  const presentes = new Set(arr(doc?.stories).flatMap((s) => arr(s?.tasks)).map((t) => t?.id));
  const de = (classe) => kernel.entradas.filter((e) => e.classe === classe);
  return {
    lidos: kernel.entradas.length,
    exigidos: de('exigido').map((e) => e.id),
    condicionaisSemTask: de('condicional').filter((e) => !presentes.has(e.id)).map(({ id, motivo }) => ({ id, motivo })),
    dispensados: de('dispensado').map(({ id, motivo }) => ({ id, motivo })),
  };
}

/** KERNEL_CONSUMED (Decisão 68): todo SEC do kernel que pede implementação existe como task. */
export function conferirKernel(doc, idsKernel) {
  const presentes = new Set(arr(doc?.stories).flatMap((s) => arr(s?.tasks)).map((t) => t?.id));
  return idsKernel.filter((id) => !presentes.has(id)).map((id) => ({
    code: 'KERNEL_CONSUMED', task: id,
    mensagem: `${id} está no Catálogo SEC do kernel e não virou task no tasks.json — injete-o com o mesmo ID (E.0-K)`,
  }));
}

const arr = (v) => (Array.isArray(v) ? v : []);

function versaoDaSkill() {
  try { return readFileSync(SKILL_MD, 'utf8').match(/^version:\s*"([^"]+)"/m)?.[1] ?? null; } catch { return null; }
}

function lerJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function main(argv) {
  const pos = [];
  let transversalArq = null;
  let kernelArq = null;
  let origem = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--transversal') transversalArq = argv[++i];
    else if (argv[i] === '--kernel') kernelArq = argv[++i];
    else if (argv[i] === '--origem') origem = argv[++i];
    else if (!argv[i].startsWith('--')) pos.push(argv[i]);
  }
  const acrescentar = argv.includes('--acrescentar');
  if (acrescentar && argv.includes('--reprocessar')) {
    process.stderr.write('inject-sec: --acrescentar e --reprocessar não andam juntos — acrescentar nunca substitui task.\n');
    return 2;
  }
  const [tasksArq, secArq] = pos;
  const json = argv.includes('--json');
  const sair = (codigo, relatorio) => {
    if (json) process.stdout.write(`${JSON.stringify(relatorio, null, 2)}\n`);
    else {
      process.stdout.write(`${relatorio.resumo}\n`);
      for (const a of relatorio.achados ?? []) process.stdout.write(`  [${a.code}] ${a.mensagem}\n`);
      const k = relatorio.kernel;
      if (k) {
        process.stdout.write(`  kernel: ${k.lidos} SEC lido(s) no catálogo; ${k.exigidos.length} cobrado(s) como task (${k.exigidos.join(', ') || 'nenhum'}).\n`);
        for (const x of k.condicionaisSemTask) process.stdout.write(`  kernel: ${x.id} ficou sem task — ${x.motivo}\n`);
        for (const x of k.dispensados) process.stdout.write(`  kernel: ${x.id} não é cobrado — ${x.motivo}\n`);
      }
    }
    return codigo;
  };
  if (!tasksArq || !secArq) {
    process.stderr.write('Uso: node inject-sec.mjs <tasks.json> <tasks-sec.json> [--transversal <story.json>] [--reprocessar | --acrescentar [--origem <skill>]] [--simular] [--json]\n');
    return 2;
  }
  let doc; let sec; let transversal = null; let kernel = null;
  try {
    for (const p of [tasksArq, secArq, transversalArq, kernelArq].filter(Boolean)) if (!existsSync(p)) throw new Error(`arquivo inexistente: ${p}`);
    if (kernelArq) kernel = lerCatalogoKernel(readFileSync(kernelArq, 'utf8'));
    doc = lerJson(tasksArq);
    const bruto = lerJson(secArq);
    sec = Array.isArray(bruto) ? bruto : bruto?.tasks;
    if (transversalArq) transversal = lerJson(transversalArq);
  } catch (e) {
    process.stderr.write(`inject-sec: entrada ilegível — ${e?.message || e}\n`);
    return 2;
  }
  if (!Array.isArray(doc?.stories) || doc.stories.length === 0 || !Array.isArray(sec) || sec.length === 0) {
    process.stderr.write('inject-sec: o tasks.json precisa ter stories[] e o arquivo de tasks SEC, ao menos uma task.\n');
    return 2;
  }
  if (kernel && kernel.idsNoArquivo > 0 && kernel.entradas.length === 0) {
    // Passar aqui seria conferir o KERNEL_CONSUMED contra uma lista vazia — e aprovar sem conferir nada.
    process.stderr.write(`inject-sec: não consegui ler o Catálogo SEC de ${kernelArq} — o arquivo cita ${kernel.idsNoArquivo} SEC-NNN, ` +
      `mas nenhum saiu ${kernel.secaoAchada ? 'da seção do catálogo' : '(não achei o título «## Catálogo SEC»)'}. ` +
      'O formato esperado é o do template da revisao-de-seguranca: um `### SEC-NNN — título` por controle, com as linhas ' +
      'Severidade e Status, ou uma tabela única com as colunas do ID, Severidade e Status. Corrija o kernel e rode de novo — ' +
      'sem isso o KERNEL_CONSUMED não é conferido.\n');
    return 2;
  }

  const r = injetar(doc, sec, { transversal, reprocessar: argv.includes('--reprocessar'), acrescentar, origem, versaoSkill: versaoDaSkill() });
  if (!r.achados.length && kernel) r.achados.push(...conferirKernel(r.doc, kernel.entradas.filter((e) => e.classe === 'exigido').map((e) => e.id)));
  if (r.achados.length) {
    return sair(1, { resumo: `inject-sec: RECUSADO — ${r.achados.length} achado(s); nada foi escrito.`, achados: r.achados, injetadas: [] });
  }

  // E.0 — escreve ao lado, valida, e só então substitui.
  const tmp = `${tasksArq}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(r.doc, null, 2)}\n`, 'utf8');
  const ids = new Set(r.injetadas.map((x) => x.id));
  let fatalSec = [];
  let fatalOutras = 0;
  let validador = 'ok';
  if (!existsSync(VALIDADOR)) validador = 'TOOL_UNAVAILABLE:validate-tasks-selfsufficiency';
  else {
    const v = spawnSync(process.execPath, [VALIDADOR, tmp], { encoding: 'utf8' });
    let rel = null;
    try { rel = v.stdout?.trim() ? JSON.parse(v.stdout) : null; } catch { rel = null; }
    if (v.status !== 0 && !rel) validador = `validador sem relatório (exit ${v.status})`;
    const erros = Array.isArray(rel?.errors) ? rel.errors : [];
    fatalSec = erros.filter((e) => ids.has(e.scope)).map((e) => ({ code: e.code, task: e.scope, mensagem: `${e.scope}: [${e.code}] ${e.message}` }));
    fatalOutras = erros.length - fatalSec.length;
  }
  if (fatalSec.length) {
    rmSync(tmp, { force: true });
    return sair(1, { resumo: `inject-sec: RECUSADO — o validador de auto-suficiência acusou ${fatalSec.length} FATAL nas tasks SEC; nada foi escrito.`, achados: fatalSec, injetadas: [] });
  }
  const relatorio = {
    resumo: `inject-sec: ${r.injetadas.length} task(s) SEC ${argv.includes('--simular') ? 'seriam injetadas (simulação — nada escrito)' : 'injetadas'}` +
      ` em ${new Set(r.injetadas.map((x) => x.storyId)).size} story(ies); validador: ${validador}` +
      (fatalOutras ? `; ${fatalOutras} FATAL em tasks que já estavam no backlog (não são deste passo)` : '') +
      (r.ordem?.renumerada ? '; executionOrder renumerado (tasks SEC no início da story)' : r.ordem?.motivo?.startsWith('TOOL_UNAVAILABLE') ? `; ${r.ordem.motivo}` : '') + '.',
    achados: [],
    injetadas: r.injetadas,
    ordem: r.ordem,
    securityReview: r.doc.metadata.securityReview,
    validador,
    fatalEmTasksPreexistentes: fatalOutras,
    ...(kernel ? { kernel: resumoDoKernel(kernel, r.doc) } : {}),
  };
  if (argv.includes('--simular')) {
    rmSync(tmp, { force: true });
    return sair(0, relatorio);
  }
  copyFileSync(tasksArq, `${tasksArq}.bak`);
  renameSync(tmp, tasksArq);
  return sair(0, relatorio);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
