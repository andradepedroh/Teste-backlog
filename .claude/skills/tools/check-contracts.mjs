#!/usr/bin/env node
/**
 * check-contracts.mjs — cruzamento determinístico api-contracts.yaml × api-contracts-supplement.json
 * da spec-api-contracts: os validators SUPPLEMENT_MATCHES_YAML e EVERY_OPERATION_TRACED, que até
 * aqui eram conferidos só pela própria IA que escreveu os dois arquivos.
 *
 * Uso:
 *   node ../tools/check-contracts.mjs <api-contracts.yaml|.json> <api-contracts-supplement.json> [--json]
 *
 * Funciona também no modo _change, sobre o par `api-contracts_change.yaml` ×
 * `api-contracts-supplement_change.json`: operação marcada `x-operation-type: REMOVED` — ou dentro
 * de um path marcado REMOVED — não é cobrada: a SKILL manda deixá-la no delta só com a marca, sem
 * `operationId`, e ela não precisa de entrada no suplemento nem de rastreio (entrada que exista só
 * para registrar a remoção também não é cobrada). `operationType` sem o `x-` vale como a marca, como
 * no `merge-contract-delta.py`.
 *
 * Sem dependência: contrato em JSON é lido com JSON.parse; em YAML, por um extrator de indentação
 * (o mesmo princípio do `check-flowmap.py --contracts`) que só olha `paths:` → `<path>:` →
 * `<método>:` → o `operationId:` FILHO DIRETO da operação — o `operationId` de `links:`, mais fundo,
 * é referência a outra operação e não conta.
 *
 * Entra como WARNING (princípio P4 do plano de melhoria das skills): os dois códigos continuam
 * FATAL na skill, e este script é a evidência — vira gate FATAL depois de rodar em projeto real
 * sem falso positivo.
 *
 * Exit codes (padrão dos validadores do kit):
 *   0 → os dois arquivos batem
 *   1 → há furo (lista no relatório)
 *   2 → entrada não aplicável: arquivo inexistente, ilegível ou sem nenhuma operação
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const METODOS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const RE_RF = /^RF-[A-Z0-9][A-Z0-9-]*$/;

const RE_MARCA = /^\s+(?:x-operation-type|operationType):\s*(.+)$/;

const indent = (l) => l.length - l.trimStart().length;
const valorEscalar = (s) => s.replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
const ehRemovedYaml = (linha) => {
  const m = linha.match(RE_MARCA);
  return Boolean(m) && valorEscalar(m[1]).toUpperCase() === 'REMOVED';
};
const ehRemovedJson = (o) => String(o?.['x-operation-type'] ?? o?.operationType ?? '').trim().toUpperCase() === 'REMOVED';

/**
 * Operações de um contrato em YAML, por indentação.
 * @param {string} texto
 * @returns {Array<{ metodo: string, path: string, operationId: string | null, removida: boolean }>}
 */
export function operacoesDoYaml(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const ops = [];
  const pathsRemovidos = new Set();
  let emPaths = false;
  let indPath = null;
  let pathAtual = null;
  let indFilhoPath = null;
  let op = null;
  let indOp = null;
  let indFilho = null;
  for (const linha of linhas) {
    if (!linha.trim() || linha.trimStart().startsWith('#')) continue;
    const ind = indent(linha);
    if (ind === 0) {
      emPaths = /^paths:\s*(#.*)?$/.test(linha);
      indPath = null; pathAtual = null; op = null;
      continue;
    }
    if (!emPaths) continue;
    const mPath = linha.match(/^(\s+)(['"]?)(\/[^'":]*)\2:\s*(#.*)?$/);
    if (mPath && (indPath === null || ind === indPath)) {
      indPath = ind; pathAtual = mPath[3]; op = null; indFilhoPath = null;
      continue;
    }
    if (pathAtual === null) continue;
    if (indFilhoPath === null && ind > indPath) indFilhoPath = ind;
    // Marca no nível do path (filho direto, em qualquer posição — antes ou depois dos métodos):
    // o path inteiro sai, e toda operação dele conta como removida.
    if (ind === indFilhoPath && ehRemovedYaml(linha)) {
      pathsRemovidos.add(pathAtual); op = null;
      continue;
    }
    const mMet = linha.match(/^\s+([a-z]+):\s*(#.*)?$/);
    if (mMet && METODOS.has(mMet[1]) && ind > indPath && (op === null || ind <= indOp)) {
      op = { metodo: mMet[1].toUpperCase(), path: pathAtual, operationId: null, removida: false };
      ops.push(op);
      indOp = ind; indFilho = null;
      continue;
    }
    if (op === null || ind <= indOp) { if (op && ind <= indOp) op = null; continue; }
    if (indFilho === null) indFilho = ind;
    if (ind !== indFilho) continue;
    const mId = linha.match(/^\s+operationId:\s*(.+)$/);
    if (mId) op.operationId = valorEscalar(mId[1]);
    if (ehRemovedYaml(linha)) op.removida = true;
  }
  for (const o of ops) if (pathsRemovidos.has(o.path)) o.removida = true;
  return ops;
}

/** Operações de um contrato em JSON. */
export function operacoesDoJson(doc) {
  const ops = [];
  for (const [path, item] of Object.entries(doc?.paths ?? {})) {
    if (!item || typeof item !== 'object') continue;
    const pathRemovido = ehRemovedJson(item);
    for (const [metodo, o] of Object.entries(item)) {
      if (!METODOS.has(metodo) || !o || typeof o !== 'object') continue;
      ops.push({
        metodo: metodo.toUpperCase(), path,
        operationId: typeof o.operationId === 'string' ? o.operationId : null,
        removida: pathRemovido || ehRemovedJson(o),
      });
    }
  }
  return ops;
}

/**
 * O cruzamento. Função pura.
 * @param {ReturnType<typeof operacoesDoYaml>} ops
 * @param {{ operations?: unknown[] }} suplemento
 */
export function cruzar(ops, suplemento) {
  const achados = [];
  const add = (code, mensagem) => achados.push({ code, mensagem });
  const entradas = Array.isArray(suplemento?.operations) ? suplemento.operations : [];
  const doSup = new Map();
  for (const e of entradas) {
    const id = e && typeof e === 'object' && typeof e.operationId === 'string' ? e.operationId : null;
    if (!id) { add('SUPPLEMENT_MATCHES_YAML', 'entrada do suplemento sem `operationId`'); continue; }
    if (doSup.has(id)) add('SUPPLEMENT_MATCHES_YAML', `\`${id}\` aparece mais de uma vez no suplemento`);
    doSup.set(id, e);
  }
  const doYaml = new Set();
  const removidas = new Set();
  for (const o of ops) {
    const nome = `${o.metodo} ${o.path}`;
    // REMOVED (na operação ou no path): a SKILL manda deixá-la no delta só com a marca — sem
    // `operationId`, sem entrada no suplemento, sem rastreio. Não é operação viva a cruzar.
    if (o.removida) { if (o.operationId) removidas.add(o.operationId); continue; }
    if (!o.operationId) { add('SUPPLEMENT_MATCHES_YAML', `${nome} sem \`operationId\` no contrato — não dá para cruzar com o suplemento`); continue; }
    if (doYaml.has(o.operationId)) add('SUPPLEMENT_MATCHES_YAML', `\`${o.operationId}\` repetido no contrato (${nome})`);
    doYaml.add(o.operationId);
    if (!doSup.has(o.operationId)) add('SUPPLEMENT_MATCHES_YAML', `\`${o.operationId}\` (${nome}) está no contrato e não no suplemento`);
  }
  for (const [id, e] of doSup) {
    // Entrada que só registra a remoção (`deprecated`/`removedInChange`) — não é cobrada.
    if (!doYaml.has(id) && removidas.has(id)) continue;
    if (!doYaml.has(id)) add('SUPPLEMENT_MATCHES_YAML', `\`${id}\` está no suplemento e não no contrato`);
    const lr = Array.isArray(e.linkedRequirements) ? e.linkedRequirements : [];
    if (lr.length === 0) add('EVERY_OPERATION_TRACED', `\`${id}\` sem \`linkedRequirements\``);
    for (const r of lr) {
      if (typeof r !== 'string' || !RE_RF.test(r.trim())) {
        add('EVERY_OPERATION_TRACED', `\`${id}\`: \`linkedRequirements\` com valor que não é RF (\`${String(r)}\`)`);
      }
    }
  }
  return { operacoes: ops.length, entradasSuplemento: entradas.length, achados };
}

function main(argv) {
  const [contrato, suplemento] = argv.filter((a) => !a.startsWith('--'));
  if (!contrato || !suplemento) {
    process.stderr.write('Uso: node check-contracts.mjs <api-contracts.yaml|.json> <api-contracts-supplement.json> [--json]\n');
    return 2;
  }
  for (const p of [contrato, suplemento]) {
    if (!existsSync(p)) { process.stderr.write(`check-contracts: arquivo inexistente: ${p}\n`); return 2; }
  }
  let ops;
  let sup;
  try {
    const texto = readFileSync(contrato, 'utf8');
    ops = /\.json$/i.test(contrato) ? operacoesDoJson(JSON.parse(texto)) : operacoesDoYaml(texto);
    sup = JSON.parse(readFileSync(suplemento, 'utf8'));
  } catch (e) {
    process.stderr.write(`check-contracts: entrada ilegível — ${e?.message || e}\n`);
    return 2;
  }
  if (ops.length === 0) {
    process.stderr.write(`check-contracts: nenhuma operação em \`paths:\` de ${contrato} — nada a cruzar.\n`);
    return 2;
  }
  const r = cruzar(ops, sup);
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
  else {
    process.stdout.write(`check-contracts: ${r.operacoes} operação(ões) no contrato, ${r.entradasSuplemento} no suplemento — ${r.achados.length} achado(s).\n`);
    for (const a of r.achados) process.stdout.write(`  [${a.code}] ${a.mensagem}\n`);
  }
  return r.achados.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
