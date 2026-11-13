// GÊMEO de ../../spec-tasks-azure/lib/load-tasks.mjs — manter em sincronia.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SUPPORTED_SCHEMA_PREFIX = 'tasks/';

/**
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
export function loadTasksDocument(filePath) {
  const abs = resolve(filePath);
  const raw = readFileSync(abs, 'utf8');
  const doc = JSON.parse(raw);
  validateTasksDocument(doc, abs);
  normalizeLabels(doc);
  return doc;
}

/**
 * `name` é a chave CANÔNICA de rótulo humano em Epic/Feature/Story (required em
 * tasks.schema-atual.json); `title` é alias opcional. O gerador emitia `title` e o renderer lia
 * só `name` — resultado medido: o corpo da story mostrava apenas o ID (a sidebar mostrava o
 * título, por outro caminho, o que tornava o defeito ainda mais difícil de notar).
 *
 * Normalizar na ENTRADA, uma vez, resolve todos os pontos de render de uma só vez. Nada é
 * sobrescrito: só preenche `name` quando está ausente/vazio. Ordem: name → title → id.
 *
 * GÊMEO de ../../spec-tasks-azure/lib/load-tasks.mjs — manter em sincronia.
 * @param {Record<string, unknown>} doc
 */
export function normalizeLabels(doc) {
  if (doc === null || typeof doc !== 'object') return doc;
  const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
  for (const key of ['epics', 'features', 'stories']) {
    const list = /** @type {Record<string, unknown>} */ (doc)[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = /** @type {Record<string, unknown>} */ (item);
      if (!nonEmpty(it.name)) {
        if (nonEmpty(it.title)) it.name = it.title;
        else if (nonEmpty(it.id)) it.name = it.id;
      }
    }
  }
  return doc;
}

/**
 * Valida conteúdo minimamente utilizável: metadata.schemaVersion reconhecível e ao menos
 * uma Story ou Epic.
 * @param {unknown} doc
 * @param {string} sourcePath
 */
function validateTasksDocument(doc, sourcePath) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`${sourcePath}: conteúdo não é um objeto JSON válido de tasks.json.`);
  }
  const metadata = /** @type {Record<string, unknown>} */ (doc).metadata;
  const schemaVersion =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? /** @type {Record<string, unknown>} */ (metadata).schemaVersion
      : undefined;
  if (typeof schemaVersion !== 'string' || !schemaVersion.trim()) {
    throw new Error(
      `${sourcePath}: metadata.schemaVersion ausente. Esperado algo como "tasks/v5.3" (produzido por spec-tasks).`
    );
  }
  if (!schemaVersion.startsWith(SUPPORTED_SCHEMA_PREFIX)) {
    throw new Error(
      `${sourcePath}: metadata.schemaVersion "${schemaVersion}" não reconhecido (esperado prefixo "${SUPPORTED_SCHEMA_PREFIX}").`
    );
  }
  const stories = Array.isArray(/** @type {Record<string, unknown>} */ (doc).stories)
    ? /** @type {unknown[]} */ (/** @type {Record<string, unknown>} */ (doc).stories)
    : [];
  const epics = Array.isArray(/** @type {Record<string, unknown>} */ (doc).epics)
    ? /** @type {unknown[]} */ (/** @type {Record<string, unknown>} */ (doc).epics)
    : [];
  if (stories.length === 0 && epics.length === 0) {
    throw new Error(
      `${sourcePath}: nenhuma story ou epic encontrada (stories[] e epics[] vazios). Nada a processar.`
    );
  }
}
