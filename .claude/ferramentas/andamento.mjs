// Harness Elo v2 — Andamento da entrega: dependências e status da task, e o marcador da US. Casca de I/O.
//
// Três passos da `spec-implement` que o agente fazia de cabeça — e que o teste ponta a ponta de
// 2026-10-21 pegou esquecidos (D48 e D49):
//
//   node .claude/ferramentas/andamento.mjs conferir --task TASK-014 [--tasks outputs/spec/tasks.json]
//   node .claude/ferramentas/andamento.mjs abrir-us --us STORY-003 --repositorios <repo1,repo2>
//        [--task TASK-014] [--proximo-passo "<texto>"]
//   node .claude/ferramentas/andamento.mjs concluir --task TASK-014 [--tasks outputs/spec/tasks.json]
//        [--relatorio outputs/spec/auditorias/TASK-014.validacao.json]
//
// - `conferir`, antes de qualquer código: a task depende de trabalho não concluído? Lê `dependencies`
//   (e o apelido `dependsOn`) da task e dos níveis acima dela — story, feature, epic —, as stories com
//   `mustImplementFirst: true` e o `executionOrder`.
// - `abrir-us`, na primeira task da US: cria `outputs/spec/em-andamento.md` (o `MARCADOR_US`) a partir
//   de `.claude/templates/em-andamento.md`, na raiz de artefatos do workspace — o repositório de docs,
//   onde o `delivery-gate` o procura. Quem o apaga é a `auditoria-de-us`, ao fechar a US.
// - `concluir`, depois do G3 em `fim`: grava `status: "DONE"` na task do `tasks.json`. Recusa sem o
//   relatório do G3 aprovado para ESTA task (`outputs/spec/auditorias/<TASK>.validacao.json`), menos
//   em task `spike`, cuja entrega é uma decisão e não código.
//
// "Concluída" é `status: "DONE"`. O schema da `spec-tasks` (`tasks.schema-atual.json`) declara `status`
// como string livre com padrão `PENDING`; `DONE` é o valor que este script grava e o único que ele lê
// como concluído. Ausente, `PENDING` ou qualquer outro valor conta como aberto — na dúvida, pergunta.
//
// `tasks.json` e relatório do G3 seguem o `validar.mjs`: relativos à pasta de onde se roda (a raiz do
// harness). O marcador segue o `delivery-gate`: raiz de artefatos do `descobrirWorkspace`.
//
// Cada chamada imprime UMA linha JSON com `acao`. Exit 0: siga (`seguir`, `criado`, `ja-aberta`,
// `concluida`, `ja-concluida`). Exit 1: pare e pergunte ao usuário (`perguntar`), ou nada foi gravado
// (`recusar`). Exit 2: uso errado, task fora do backlog ou arquivo ilegível.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { localizarTask } from './validacao/task.mjs';
import { MARCADOR_US } from '../hooks/kit.mjs';
import { descobrirWorkspace } from '../hooks/workspace.mjs';

export const STATUS_CONCLUIDA = 'DONE';
const TEMPLATE_MARCADOR = fileURLToPath(new URL('../templates/em-andamento.md', import.meta.url));
const TASKS_PADRAO = join('outputs', 'spec', 'tasks.json');
/** Quantos ids de `antesNaOrdem` saem na linha JSON — o total vai inteiro. */
const MAX_IDS_NA_ORDEM = 10;

const lista = (v) => (Array.isArray(v) ? v : []);
const barra = (p) => p.split('\\').join('/');
export const concluida = (item) => !!item && typeof item.status === 'string'
  && item.status.trim().toUpperCase() === STATUS_CONCLUIDA;

/** Opção de texto obrigatória: flag sem valor (`'true'`) ou vazia é ausência. */
function obrigatoria(op, chave) {
  const v = op[chave];
  if (typeof v !== 'string' || !v.trim() || v === 'true') throw new Error(`--${chave} é obrigatório`);
  return v.trim();
}

/** Valor que vai para uma linha `chave: valor` do marcador: quebra de linha criaria outro campo. */
function umaLinha(chave, valor) {
  if (/[\r\n]/.test(valor)) throw new Error(`--${chave} tem de caber numa linha só`);
  return valor;
}

function lerJson(caminho, oQue) {
  let texto;
  try { texto = readFileSync(caminho, 'utf8'); } catch (erro) {
    throw new Error(`não consegui ler ${oQue} em ${barra(caminho)}: ${erro.code || erro.message}`);
  }
  const bom = texto.charCodeAt(0) === 0xfeff;
  try { return { texto, bom, doc: JSON.parse(bom ? texto.slice(1) : texto) }; } catch (erro) {
    throw new Error(`${oQue} em ${barra(caminho)} não é JSON válido: ${erro.message}`);
  }
}

function abrirBacklog(op, raiz) {
  const id = obrigatoria(op, 'task');
  const caminho = resolve(raiz, op.tasks && op.tasks !== 'true' ? op.tasks : TASKS_PADRAO);
  const lido = lerJson(caminho, 'o tasks.json');
  const alvo = localizarTask(lido.doc, id);
  if (!alvo) throw new Error(`a task ${id} não está em ${barra(relative(raiz, caminho) || caminho)} (procurei em stories[].tasks[])`);
  return { id, caminho, ...lido, alvo };
}

/** Ids de `dependencies` e do apelido `dependsOn` — os dois que o `order-backlog.mjs` da `spec-tasks` lê. */
const idsDeDependencia = (x) => [...lista(x && x.dependencies), ...lista(x && x.dependsOn)]
  .filter((d) => typeof d === 'string' && d.trim()).map((d) => d.trim());

/**
 * O backlog nos quatro níveis, com a mesma ligação do `order-backlog.mjs`: story → feature pelo
 * `featureId`, feature → epic pelo `epicId`, e story sem feature → epic pelo `epicId` dela.
 */
function indexar(doc) {
  const stories = lista(doc.stories).filter(Boolean);
  const features = new Map(lista(doc.features).filter((f) => f && f.id).map((f) => [f.id, f]));
  const epics = new Map(lista(doc.epics).filter((e) => e && e.id).map((e) => [e.id, e]));
  const featureDa = (s) => (s.featureId && features.has(s.featureId) ? s.featureId : null);
  const epicDa = (s) => {
    const f = featureDa(s);
    const e = f ? features.get(f).epicId : s.epicId;
    return e && epics.has(e) ? e : null;
  };
  return { stories, features, epics, featureDa, epicDa };
}

/**
 * Situação de um id citado como dependência, em qualquer nível: task pelo próprio status; story,
 * feature ou epic pelas tasks de dentro (todas DONE). `null` = concluída. A própria task em trabalho
 * não conta contra si mesma.
 */
function situacao(idx, id, propria) {
  for (const s of idx.stories) {
    const task = lista(s.tasks).find((t) => t && t.id === id);
    if (task) return concluida(task) ? null : { id, tipo: 'dependencia', status: task.status ?? null };
  }
  let nivel = null;
  let item = null;
  let dentro = [];
  const s = idx.stories.find((x) => x.id === id);
  if (s) { nivel = 'story'; item = s; dentro = [s]; }
  else if (idx.features.has(id)) { nivel = 'feature'; item = idx.features.get(id); dentro = idx.stories.filter((x) => idx.featureDa(x) === id); }
  else if (idx.epics.has(id)) { nivel = 'epic'; item = idx.epics.get(id); dentro = idx.stories.filter((x) => idx.epicDa(x) === id); }
  if (!nivel) return { id, tipo: 'dependencia', status: null, situacao: 'não encontrada no tasks.json' };
  const tasks = dentro.flatMap((x) => lista(x.tasks)).filter((t) => t && t.id !== propria);
  if (!tasks.length) return concluida(item) ? null : { id, tipo: 'dependencia', nivel, status: item.status ?? null };
  const abertas = tasks.filter((t) => !concluida(t)).map((t) => t.id);
  return abertas.length ? { id, tipo: 'dependencia', nivel, naoConcluidas: abertas } : null;
}

function descrever(p) {
  if (p.tipo === 'ja-concluida') return `a própria ${p.id} já está ${p.status} no tasks.json`;
  if (p.tipo === 'mustImplementFirst') return `a story ${p.id} deve ser implementada antes das demais e tem ${p.naoConcluidas.length} task(s) aberta(s): ${p.naoConcluidas.join(', ')}`;
  if (p.naoConcluidas) return `${p.id} (${p.nivel}) tem task(s) aberta(s): ${p.naoConcluidas.join(', ')}`;
  if (p.situacao) return `${p.id} ${p.situacao}`;
  return `${p.id} está ${p.status || 'sem status'}`;
}

/** `conferir`: antes de começar, a task depende de trabalho não concluído? */
export function conferir(op, raiz) {
  const { id, doc, alvo } = abrirBacklog(op, raiz);
  const { task, story } = alvo;
  const pendentes = [];
  if (concluida(task)) pendentes.push({ id, tipo: 'ja-concluida', status: task.status });

  // Dependência declarada em qualquer nível acima da task também a prende: a da story, a da feature
  // e a do epic dela (o `order-backlog.mjs` sobe as arestas do mesmo jeito).
  const idx = indexar(doc);
  const feature = story ? idx.featureDa(story) : null;
  const epic = story ? idx.epicDa(story) : null;
  const acima = [story, feature && idx.features.get(feature), epic && idx.epics.get(epic)];
  const proprios = new Set([id, story && story.id, feature, epic].filter(Boolean));
  const deps = [...new Set([task, ...acima].flatMap(idsDeDependencia))].filter((d) => !proprios.has(d));
  for (const d of deps) {
    const s = situacao(idx, d, id);
    if (s) pendentes.push(s);
  }
  for (const s of lista(doc.stories)) {
    if (!s || s.mustImplementFirst !== true || (story && s.id === story.id)) continue;
    const abertas = lista(s.tasks).filter((t) => t && !concluida(t)).map((t) => t.id);
    if (abertas.length) pendentes.push({ id: s.id, tipo: 'mustImplementFirst', naoConcluidas: abertas });
  }

  // `executionOrder` é recomendação de ordem (dependência, camada, etapa, prioridade e ID): a task
  // anterior ainda aberta é AVISO, não pergunta. Dependência de verdade é a declarada acima.
  let antesNaOrdem = null;
  if (Number.isInteger(task.executionOrder)) {
    const ids = lista(doc.stories).flatMap((s) => lista(s && s.tasks))
      .filter((t) => t && t.id !== id && Number.isInteger(t.executionOrder) && t.executionOrder < task.executionOrder && !concluida(t))
      .sort((a, b) => a.executionOrder - b.executionOrder)
      .map((t) => t.id);
    if (ids.length) antesNaOrdem = { total: ids.length, ids: ids.slice(0, MAX_IDS_NA_ORDEM) };
  }

  const acao = pendentes.length ? 'perguntar' : 'seguir';
  const mensagem = pendentes.length
    ? `${id} depende de trabalho não concluído: ${pendentes.map(descrever).join('; ')}. Pergunte ao usuário se segue mesmo assim antes de começar.`
    : `Nenhuma dependência aberta para ${id}.${antesNaOrdem ? ` Aviso: ${antesNaOrdem.total} task(s) anterior(es) na ordem do backlog ainda aberta(s).` : ''}`;
  return {
    acao, task: id, story: story ? story.id : null, status: task.status ?? null,
    pendentes, antesNaOrdem, concluidaQuando: `status: "${STATUS_CONCLUIDA}"`, mensagem,
  };
}

/** Grava o JSON com a indentação, o fim de linha, o BOM e a quebra final do original. Atômico. */
function regravar(caminho, original, bom, doc) {
  const m = /^\uFEFF?[[{]\r?\n([ \t]+)\S/.exec(original);
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let saida = JSON.stringify(doc, null, m ? m[1] : 2);
  if (eol !== '\n') saida = saida.split('\n').join(eol);
  if (/\n$/.test(original)) saida += eol;
  const tmp = `${caminho}.${process.pid}.tmp`;
  writeFileSync(tmp, (bom ? '\uFEFF' : '') + saida, 'utf8');
  renameSync(tmp, caminho);
}

/** `concluir`: depois do G3 em `fim`, a task fica `DONE` no `tasks.json`. */
export function concluir(op, raiz) {
  const { id, caminho, texto, bom, doc, alvo } = abrirBacklog(op, raiz);
  const { task } = alvo;
  const arquivo = barra(relative(raiz, caminho) || caminho);
  if (concluida(task)) return { acao: 'ja-concluida', task: id, status: task.status, arquivo };

  let g3;
  if (task.class === 'spike') {
    g3 = { dispensado: 'spike' };
  } else {
    const rel = resolve(raiz, op.relatorio && op.relatorio !== 'true'
      ? op.relatorio : join('outputs', 'spec', 'auditorias', `${id}.validacao.json`));
    const nome = barra(relative(raiz, rel) || rel);
    const recusar = (motivo) => ({ acao: 'recusar', task: id, motivo, arquivo });
    if (!existsSync(rel)) return recusar(`sem o relatório do G3 em ${nome}: rode o validar.mjs até \`fim\` antes de concluir`);
    let r;
    try { r = lerJson(rel, 'o relatório do G3').doc; } catch (erro) { return recusar(erro.message); }
    if (!r || r.task !== id) return recusar(`o relatório ${nome} é da task ${r && r.task}, não da ${id}`);
    if (!/^APROVADO/.test(String(r.veredito || ''))) return recusar(`o G3 da ${id} está ${r.veredito || 'sem veredito'} em ${nome}: só APROVADO conclui a task`);
    g3 = { veredito: r.veredito, modo: r.modo ?? null };
  }

  const anterior = task.status ?? null;
  task.status = STATUS_CONCLUIDA;
  regravar(caminho, texto, bom, doc);
  return { acao: 'concluida', task: id, anterior, status: STATUS_CONCLUIDA, arquivo, g3 };
}

/** O valor de `chave:` no marcador — a mesma leitura do `campo` do `estado.mjs`. */
function campo(texto, chave) {
  const m = String(texto || '').match(new RegExp(`^\\s*${chave}\\s*:\\s*(.+?)\\s*$`, 'im'));
  return m ? m[1] : null;
}

/** Preenche o bloco `estado:us` do template e tira o bullet de exemplo dos passos fechados. */
function preencher(modelo, { us, repositorios, proximo }) {
  return modelo
    .replace(/^us:.*$/m, () => `us: ${us}`)
    .replace(/^repositorios:.*$/m, () => `repositorios: ${repositorios}`)
    .replace(/^proximo-passo:.*$/m, () => `proximo-passo: ${proximo}`)
    .replace(/^bloqueios:.*$/m, 'bloqueios: nenhum')
    .replace(/^- <[^<>\n]*>[ \t]*\r?\n?/gm, '');
}

/** `abrir-us`: cria o marcador da US aberta, onde o `delivery-gate` e a `auditoria-de-us` o leem. */
export function abrirUs(op, raiz) {
  const us = umaLinha('us', obrigatoria(op, 'us'));
  const repositorios = umaLinha('repositorios', obrigatoria(op, 'repositorios'))
    .split(',').map((r) => r.trim()).filter(Boolean).join(', ');
  if (!repositorios) throw new Error('--repositorios é obrigatório');
  const task = op.task && op.task !== 'true' ? umaLinha('task', op.task.trim()) : null;
  const proximo = op['proximo-passo'] && op['proximo-passo'] !== 'true'
    ? umaLinha('proximo-passo', op['proximo-passo'].trim())
    : `implementar ${task || 'a primeira task da US'}`;

  const ws = descobrirWorkspace(raiz);
  if (!ws.raizArtefatos) throw new Error(`não achei o repositório de docs a partir de ${barra(raiz)}: ${ws.motivo}${ws.detalhe ? ` — ${ws.detalhe}` : ''}`);
  const destino = join(ws.raizArtefatos, MARCADOR_US);
  const marcador = barra(relative(raiz, destino));

  if (existsSync(destino)) {
    const aberta = campo(readFileSync(destino, 'utf8'), 'us');
    if (aberta === us) return { acao: 'ja-aberta', us, marcador };
    return {
      acao: 'perguntar', us, aberta, marcador,
      motivo: `a US ${aberta || '(sem identificador)'} está aberta em ${marcador}: o marcador é de uma US só, e sai na auditoria-de-us dela`,
    };
  }

  const modelo = readFileSync(TEMPLATE_MARCADOR, 'utf8');
  // As duas pontas com o template: se ele ganhar um placeholder que este script não preenche, o
  // marcador nasceria com `<...>` — melhor falhar aqui do que gravar um marcador meio preenchido.
  const esqueleto = preencher(modelo, { us: '', repositorios: '', proximo: '' }).replace(/<!--[\s\S]*?-->/g, '');
  const sobra = esqueleto.match(/<[^<>\n]{1,60}>/);
  if (sobra) throw new Error(`o template ${barra(TEMPLATE_MARCADOR)} tem um campo que o abrir-us não preenche: ${sobra[0]}`);

  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, preencher(modelo, { us, repositorios, proximo }), 'utf8');
  return {
    acao: 'criado', us, marcador, repositorioDeDocs: barra(ws.raizArtefatos),
    mensagem: `Commite ${MARCADOR_US} no repositório de docs, na branch da US: o delivery-gate lê a árvore do commit, não a pasta.`,
  };
}

/** `perguntar` e `recusar` param o agente (exit 1); o resto segue (exit 0). */
export function codigoDeSaida(resultado) {
  return resultado && (resultado.acao === 'perguntar' || resultado.acao === 'recusar') ? 1 : 0;
}

/** `--chave valor` → `{chave: valor}`; flag sem valor vira 'true'. Mesma leitura do `validar.mjs`. */
export function lerOpcoes(args) {
  const op = {};
  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith('--')) continue;
    const prox = args[i + 1];
    op[args[i].slice(2)] = prox !== undefined && !prox.startsWith('--') ? args[++i] : 'true';
  }
  return op;
}

function main(argv) {
  const [comando, ...resto] = argv;
  const fn = { conferir, 'abrir-us': abrirUs, concluir }[comando];
  if (!fn) {
    process.stderr.write('Uso: node .claude/ferramentas/andamento.mjs conferir|abrir-us|concluir [opções] — ver o cabeçalho do arquivo.\n');
    return 2;
  }
  try {
    const r = fn(lerOpcoes(resto), process.cwd());
    process.stdout.write(`${JSON.stringify(r)}\n`);
    return codigoDeSaida(r);
  } catch (erro) {
    process.stderr.write(`andamento.mjs ${comando}: ${erro.message}\n`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
