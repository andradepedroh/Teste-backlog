/**
 * Registro local da tag de regra de negócio que a PRÓPRIA spec-tasks-azure pôs no Azure DevOps.
 *
 * Por que existe: no modo `_change`, o item que a spec-tasks deixou de marcar (`businessRuleHeavy:
 * false`) perdia a tag `regra-de-negocio` a cada republicação — inclusive quando quem a pôs foi o
 * time, à mão, num item que a ferramenta nunca marcou. O ADO não guarda quem pôs uma tag; este
 * registro guarda. A tag só sai de item que está aqui.
 *
 * Onde fica: `<pasta do tasks.json>/ado-marcas-regra.json` — no layout padrão, `outputs/spec/`, ao
 * lado do `id-map.json` que o `--id-map` e as auditorias usam. Versione junto com o `tasks.json`: é
 * por ele que a próxima pessoa a publicar sabe o que a ferramenta marcou.
 *
 *   { "versao": 1,
 *     "projetos": { "<org>/<projeto>": { "<ID lógico>": { "adoId": 1234, "tag": "regra-de-negocio" } } } }
 *
 * Sem rede: o `--dry-run` (lib/publish-plan.mjs) lê o mesmo arquivo para dizer, antes, de quais
 * itens a tag sai.
 */

import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export const NOME_REGISTRO = 'ado-marcas-regra.json';

/** Caminho do registro para a pasta do tasks.json, ou `null` sem pasta (nada é lido nem gravado). */
export function caminhoDoRegistro(baseDir) {
  return typeof baseDir === 'string' && baseDir ? join(baseDir, NOME_REGISTRO) : null;
}

/** Chave do projeto no registro: o mesmo ID lógico pode ter sido publicado em dois projetos. */
export function chaveDoProjeto(config) {
  return config?.org && config?.project ? `${config.org}/${config.project}` : null;
}

/** Tags do ADO não diferenciam maiúsculas: o ADO reaproveita a grafia da primeira tag criada. */
export const mesmaTag = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * Lê o registro. Arquivo ausente → registro vazio. Arquivo ilegível → `{ ilegivel: true }`: nada sai
 * (sem prova de quem pôs a tag, ela fica) e nada é gravado por cima.
 * @param {string | null} caminho
 */
export function lerRegistro(caminho) {
  const vazio = { versao: 1, projetos: {} };
  if (!caminho || !existsSync(caminho)) return vazio;
  try {
    const r = JSON.parse(readFileSync(caminho, 'utf8'));
    if (!r || typeof r !== 'object' || typeof r.projetos !== 'object' || r.projetos === null) throw new Error('sem "projetos"');
    return { versao: 1, projetos: r.projetos };
  } catch (e) {
    return { ...vazio, ilegivel: true, erro: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * A marca que a ferramenta pôs neste item, ou `null`. Com `adoId`, só vale se for o mesmo work item
 * (item recriado no ADO é outro). Sem `projeto` (dry-run sem org/projeto no ambiente), procura em
 * todos os projetos do registro.
 * @returns {{ adoId: number, tag: string } | null}
 */
export function marcaDaFerramenta(registro, projeto, logicalId, adoId = null) {
  const projetos = projeto ? [registro?.projetos?.[projeto]] : Object.values(registro?.projetos ?? {});
  for (const p of projetos) {
    const m = p?.[logicalId];
    if (m && typeof m.tag === 'string' && (adoId == null || m.adoId === adoId)) return m;
  }
  return null;
}

/** A ferramenta pôs a tag neste item. */
export function registrarMarca(registro, projeto, logicalId, adoId, tag) {
  if (!registro || !projeto) return;
  (registro.projetos[projeto] ??= {})[logicalId] = { adoId, tag };
  registro.alterado = true;
}

/** A ferramenta tirou a tag deste item. */
export function esquecerMarca(registro, projeto, logicalId) {
  if (!registro?.projetos?.[projeto]?.[logicalId]) return;
  delete registro.projetos[projeto][logicalId];
  registro.alterado = true;
}

/** Grava o registro (só se mudou e se foi lido direito), escrevendo ao lado e trocando. */
export function gravarRegistro(caminho, registro) {
  if (!caminho || !registro?.alterado || registro.ilegivel) return false;
  const tmp = `${caminho}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ versao: 1, projetos: registro.projetos }, null, 2)}\n`, 'utf8');
  renameSync(tmp, caminho);
  return true;
}
