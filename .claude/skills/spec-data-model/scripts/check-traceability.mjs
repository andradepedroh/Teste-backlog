#!/usr/bin/env node
/**
 * check-traceability.mjs — três FATAL da spec-data-model que o schema não alcança e que até aqui
 * eram autoavaliados: TRACEABILITY_PRESENT, ALTER_HAS_CURRENT_STATE e HYBRID_HAS_NOTES.
 *
 * Arquivo à parte, e não extensão do validate-data-model.mjs, de propósito: aquele é byte-idêntico
 * ao do upstream, e cada edição nossa num arquivo do upstream vira conflito na próxima entrega
 * (MANUTENCAO.md, «Atualizar é merge de três pontas»). Aqui é arquivo novo; o SKILL.md só ganha a
 * linha que o chama.
 *
 * Uso:
 *   node <dir-desta-skill>/scripts/check-traceability.mjs [outputs/spec/data-model.json] [--json]
 *
 * O que confere, entidade por entidade (em todos os `boundedContexts[].entities[]`):
 *   TRACEABILITY_PRESENT    — `traceability[]` com ≥1 item que cite RF ou RN (`itemId` ou `excerpt`).
 *                             Entidade `EXISTING_REF` (legado só referenciado) fica de fora: ela não
 *                             nasce de um requisito novo.
 *   ALTER_HAS_CURRENT_STATE — `operationType: ALTER` com `currentStateIfAlter` não vazio; coluna
 *                             `ALTER_MODIFY`/`ALTER_DROP` com `notes` dizendo o antes e o depois.
 *   HYBRID_HAS_NOTES        — `dataOwnership.mode: HYBRID` com `dataOwnership.notes` preenchido
 *                             (nem vazio, nem «—»).
 *
 * Entra como WARNING (princípio P4 do plano de melhoria das skills): os códigos continuam FATAL na
 * skill, e este script é a evidência deles.
 *
 * Exit codes: 0 nada a apontar · 1 há achado · 2 entrada não aplicável (sem arquivo, JSON ilegível
 * ou nenhuma entidade).
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const RE_REQ = /\b(?:RF|RN)(?:-[A-Z0-9]+)+\b/;
const vazio = (s) => typeof s !== 'string' || s.trim() === '' || s.trim() === '—' || s.trim() === '-';

/** Achados do modelo. Função pura. */
export function conferirModelo(modelo) {
  const achados = [];
  let entidades = 0;
  for (const bc of Array.isArray(modelo?.boundedContexts) ? modelo.boundedContexts : []) {
    for (const e of Array.isArray(bc?.entities) ? bc.entities : []) {
      entidades++;
      const nome = `${bc.name ?? '?'}.${e.name ?? '?'}`;
      const add = (code, mensagem) => achados.push({ code, entidade: nome, mensagem });
      if (e.operationType !== 'EXISTING_REF') {
        const tr = Array.isArray(e.traceability) ? e.traceability : [];
        const citaRequisito = tr.some((t) => RE_REQ.test(String(t?.itemId ?? '')) || RE_REQ.test(String(t?.excerpt ?? '')));
        if (!citaRequisito) add('TRACEABILITY_PRESENT', `${nome}: \`traceability[]\` sem nenhum item que cite RF ou RN`);
      }
      if (e.operationType === 'ALTER') {
        const atual = e.currentStateIfAlter;
        if (!atual || typeof atual !== 'object' || Object.keys(atual).length === 0) {
          add('ALTER_HAS_CURRENT_STATE', `${nome}: entidade ALTER sem \`currentStateIfAlter\``);
        }
      }
      for (const c of Array.isArray(e.columns) ? e.columns : []) {
        if ((c?.operationType === 'ALTER_MODIFY' || c?.operationType === 'ALTER_DROP') && vazio(c.notes)) {
          add('ALTER_HAS_CURRENT_STATE', `${nome}.${c.name ?? '?'}: coluna ${c.operationType} sem \`notes\` com o antes e o depois`);
        }
      }
      if (e.dataOwnership?.mode === 'HYBRID' && vazio(e.dataOwnership.notes)) {
        add('HYBRID_HAS_NOTES', `${nome}: \`dataOwnership.mode\` HYBRID sem \`notes\` dizendo o que é externo e o que é nosso`);
      }
    }
  }
  return { entidades, achados };
}

function main(argv) {
  const arq = argv.find((a) => !a.startsWith('--'))
    ?? ['outputs/spec/data-model.json', 'outputs/data-model.json'].find((p) => existsSync(p));
  if (!arq || !existsSync(arq)) {
    process.stderr.write('check-traceability: data-model.json não encontrado (outputs/spec/ → outputs/).\n');
    return 2;
  }
  let modelo;
  try { modelo = JSON.parse(readFileSync(arq, 'utf8')); } catch (e) {
    process.stderr.write(`check-traceability: JSON ilegível em ${arq} — ${e?.message || e}\n`);
    return 2;
  }
  const r = conferirModelo(modelo);
  if (r.entidades === 0) {
    process.stderr.write(`check-traceability: nenhuma entidade em ${arq} — nada a conferir.\n`);
    return 2;
  }
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
  else {
    process.stdout.write(`check-traceability: ${r.entidades} entidade(s), ${r.achados.length} achado(s).\n`);
    for (const a of r.achados) process.stdout.write(`  [${a.code}] ${a.mensagem}\n`);
  }
  return r.achados.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
