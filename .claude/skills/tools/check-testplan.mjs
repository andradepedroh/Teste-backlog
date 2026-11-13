#!/usr/bin/env node
/**
 * check-testplan.mjs — contagem e conferência determinísticas do `test-plan.md` da spec-test-plan.
 *
 * Até aqui os 14 validators da skill eram autoavaliados, e os números da linha `TESTPLAN_COVERAGE`
 * do sync-log eram contados pela mesma IA que escreveu o plano. Este script lê o documento no
 * formato do `templates/test-plan.template.md` e devolve: casos por categoria e por épica, a
 * cobertura RN × caso, a linha `TESTPLAN_COVERAGE` pronta e os achados dos validators que dá para
 * conferir por texto.
 *
 * Uso:
 *   node ../tools/check-testplan.mjs <test-plan.md> [--business-rules <business-rules.md>] [--json]
 *
 * Com `--business-rules`, as RNs em escopo são as PRÓPRIAS do `business-rules.md` (as que têm bloco
 * `### RN-…`); a RN do Explore citada só como Origem de uma RN-NOVO está coberta por ela e não entra
 * (ver `rnsDoBusinessRules`). Sem ele, as da tabela `## Cobertura RN × Caso` somadas às citadas nos casos.
 *
 * Conferidos aqui (o código é o mesmo da tabela de validators da skill):
 *   TC_HAS_STEPS (FATAL), TC_HAS_EXPECTED_RESULT (FATAL), EPIC_HAS_MINIMUM_COVERAGE (FATAL),
 *   NO_TECHNICAL_LANGUAGE (FATAL), TC_HAS_PRECONDITIONS, TC_HAS_TRACEABILITY, PLAN_HAS_COVERAGE_TABLE,
 *   RN_NOT_COVERED, EPIC_SIZE_SIGNAL (WARNING). Os demais (dado concreto, RN de derivação com valor
 *   calculado, matriz por RF) pedem julgamento e continuam com a skill.
 *
 * NO_TECHNICAL_LANGUAGE: «tabela» sozinha NÃO é acusada — numa homologação ela quase sempre é a
 * tabela da tela. Só «tabela do/no/de banco» conta. É a lição da rodada I do `gramatica.mjs`:
 * verificador que acusa o certo é desligado em uma semana.
 *
 * Entra como WARNING (princípio P4 do plano de melhoria das skills): a skill continua dona dos FATAL.
 *
 * Exit codes: 0 sem achado FATAL · 1 com achado FATAL · 2 entrada não aplicável (arquivo ausente
 * ou nenhum `### [TC-NNN]` no documento).
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CATEGORIAS = ['PRINCIPAL', 'VALIDAÇÃO', 'REGRA', 'ACESSO', 'ESTADO', 'INTEGRAÇÃO', 'BORDA'];
const SEM_ACENTO = { VALIDACAO: 'VALIDAÇÃO', INTEGRACAO: 'INTEGRAÇÃO' };
const FATAIS = new Set(['TC_HAS_STEPS', 'TC_HAS_EXPECTED_RESULT', 'EPIC_HAS_MINIMUM_COVERAGE', 'NO_TECHNICAL_LANGUAGE']);
const RE_ID_REGRA = /\b(R[NF])-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;
const TERMOS_TECNICOS = [
  /\b(?:POST|GET|PUT|DELETE|PATCH)\b/,
  /\b(?:HTTP|JSON|JWT|FK)\b/,
  /\b(?:schema|payload|nullable|endpoint|foreign key|status code)\b/i,
  /\bbanco de dados\b/i,
  /\btabela (?:do|no|de) banco\b/i,
];

const normCategoria = (c) => SEM_ACENTO[c.toUpperCase()] ?? c.toUpperCase();

/** Lê o documento. Função pura. */
export function lerPlano(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const casos = [];
  const cobertura = [];
  let epica = null;
  let caso = null;
  let secao = null;
  let naCobertura = false;
  for (const linha of linhas) {
    const mEpica = linha.match(/^## \[?(EPIC-[A-Za-z0-9-]+)\]?/);
    if (mEpica) { epica = mEpica[1]; caso = null; naCobertura = false; continue; }
    if (/^## Cobertura RN × Caso/.test(linha)) { naCobertura = true; caso = null; epica = null; continue; }
    if (/^## /.test(linha)) { naCobertura = false; caso = null; continue; }
    const mCaso = linha.match(/^### \[(TC-\d+)\]\s*(.*?)\s*\[([A-ZÇÃÕÉÍÓÚÂÊÔ]+)\]\s*$/);
    if (mCaso) {
      caso = { id: mCaso[1], titulo: mCaso[2], categoria: normCategoria(mCaso[3]), epica,
        regras: [], precondicoes: 0, passos: 0, esperados: 0, corpo: [] };
      casos.push(caso);
      secao = null;
      continue;
    }
    if (/^### /.test(linha)) { caso = null; continue; }
    if (naCobertura) {
      const m = linha.match(/^\|\s*(RN-[A-Za-z0-9-]+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/);
      if (m) cobertura.push({ rn: m[1], casos: (m[3].match(/TC-\d+/g) ?? []), status: m[4].trim() });
      continue;
    }
    if (!caso) continue;
    caso.corpo.push(linha);
    const mRel = linha.match(/^\|\s*\*\*RN\/RF relacionado\*\*\s*\|(.*)\|\s*$/);
    if (mRel) caso.regras.push(...(mRel[1].match(RE_ID_REGRA) ?? []));
    if (/^\*\*Pré-condições:\*\*/.test(linha)) { secao = 'pre'; continue; }
    if (/^\*\*Passos:\*\*/.test(linha)) { secao = 'passos'; continue; }
    if (/^\*\*Resultado esperado:\*\*/.test(linha)) { secao = 'esperado'; continue; }
    if (/^\*\*[^*]+:\*\*/.test(linha)) { secao = null; continue; }
    if (secao === 'pre' && /^\s*-\s+\S/.test(linha)) caso.precondicoes++;
    if (secao === 'passos' && /^\s*\d+\.\s+\S/.test(linha)) caso.passos++;
    if (secao === 'esperado' && linha.includes('✅')) caso.esperados++;
  }
  const total = texto.match(/\|\s*Total de casos de teste\s*\|\s*(\d+)\s*\|/);
  return { casos, cobertura, temCobertura: /^## Cobertura RN × Caso/m.test(texto), totalDeclarado: total ? Number(total[1]) : null };
}

const RE_RN = /\bRN(?:-NOVO)?-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;
const RE_BLOCO_RN = /^#{2,6}\s*\[?(RN(?:-NOVO)?-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b/;
const linhaDeOrigem = (l) => /^\|\s*\*\*Origem\*\*\s*\|/i.test(l) || /^Fonte\s*:/i.test(l);

/**
 * RNs PRÓPRIAS do business-rules.md — as que entram no escopo da cobertura. São as que têm bloco
 * (`#### RN-NOVO-DESCONTO-001: …`, `### RN-001 — …`), o formato do template da spec-product. A RN
 * preliminar do Explore (`RN-001`) citada no campo **Origem** de uma RN-NOVO, ou na linha `Fonte:`,
 * foi promovida a ela («Promoção de IDs», `plan.md`): está coberta pela RN-NOVO e não é RN própria
 * (D27 — contá-la dava «RNs cobertas=5/9» e a linha TESTPLAN_COVERAGE errada no sync-log). Sem nenhum
 * bloco (formato livre), vale todo ID citado fora das linhas de Origem e Fonte.
 */
export function rnsDoBusinessRules(texto) {
  const linhas = String(texto).replace(/\r\n/g, '\n').split('\n');
  const declaradas = linhas.map((l) => l.match(RE_BLOCO_RN)?.[1]).filter(Boolean);
  if (declaradas.length) return [...new Set(declaradas)];
  return [...new Set(linhas.filter((l) => !linhaDeOrigem(l)).flatMap((l) => l.match(RE_RN) ?? []))];
}

/**
 * RN do Explore → as RN próprias que a citam na Origem: `{ 'RN-001': ['RN-NOVO-DESCONTO-001'] }`.
 * Só informa (sai em `rns.promovidas`): a cobertura da RN do Explore é a da RN-NOVO que a promoveu.
 */
export function promocoesDoBusinessRules(texto) {
  const promovidas = {};
  let atual = null;
  for (const l of String(texto).replace(/\r\n/g, '\n').split('\n')) {
    const bloco = l.match(RE_BLOCO_RN);
    if (bloco) { atual = bloco[1]; continue; }
    if (/^#{1,6}\s/.test(l)) { atual = null; continue; }
    if (!atual || !/^\|\s*\*\*Origem\*\*\s*\|/i.test(l)) continue;
    for (const rn of l.match(RE_RN) ?? []) {
      if (rn === atual || rn.startsWith('RN-NOVO-')) continue;
      (promovidas[rn] ??= []).includes(atual) || promovidas[rn].push(atual);
    }
  }
  return promovidas;
}

export function conferir(plano, rnsEmEscopo = null, { promovidas = {} } = {}) {
  const achados = [];
  const add = (code, mensagem, onde = {}) => achados.push({ code, severidade: FATAIS.has(code) ? 'FATAL' : 'WARNING', ...onde, mensagem });

  const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]));
  const porEpica = {};
  for (const c of plano.casos) {
    porCategoria[c.categoria] = (porCategoria[c.categoria] ?? 0) + 1;
    const e = (porEpica[c.epica ?? '(sem épica)'] ??= { total: 0, porCategoria: {} });
    e.total++;
    e.porCategoria[c.categoria] = (e.porCategoria[c.categoria] ?? 0) + 1;
    if (!CATEGORIAS.includes(c.categoria)) add('TC_CATEGORY_UNKNOWN', `${c.id}: categoria [${c.categoria}] fora da tabela de categorias`, { tc: c.id });
    if (c.passos < 3) add('TC_HAS_STEPS', `${c.id}: ${c.passos} passo(s) numerado(s), mínimo 3`, { tc: c.id });
    if (c.esperados < 1) add('TC_HAS_EXPECTED_RESULT', `${c.id}: nenhum resultado esperado com ✅`, { tc: c.id });
    if (c.precondicoes < 1) add('TC_HAS_PRECONDITIONS', `${c.id}: nenhuma pré-condição listada`, { tc: c.id });
    if (c.regras.length < 1) add('TC_HAS_TRACEABILITY', `${c.id}: não referencia RF nem RN`, { tc: c.id });
    for (const l of c.corpo) {
      if (/^\|\s*Campo\s*\|/.test(l)) continue;
      const termo = TERMOS_TECNICOS.map((re) => l.match(re)?.[0]).find(Boolean);
      if (termo) { add('NO_TECHNICAL_LANGUAGE', `${c.id}: termo técnico «${termo}» — «${l.trim().slice(0, 80)}»`, { tc: c.id }); break; }
    }
  }
  for (const [ep, e] of Object.entries(porEpica)) {
    const falta = ['PRINCIPAL', 'VALIDAÇÃO', 'REGRA'].filter((c) => !e.porCategoria[c]);
    if (falta.length) add('EPIC_HAS_MINIMUM_COVERAGE', `${ep}: sem caso ${falta.map((c) => `[${c}]`).join(', ')}`, { epica: ep });
    if (e.total > 20) add('EPIC_SIZE_SIGNAL', `${ep}: ${e.total} casos — sinal para dividir a épica (não para cortar casos)`, { epica: ep });
  }

  // Cobertura RN × caso.
  const citadas = new Set(plano.casos.flatMap((c) => c.regras.filter((r) => r.startsWith('RN-'))));
  const naTabela = new Map(plano.cobertura.map((l) => [l.rn, l]));
  const escopo = rnsEmEscopo ?? [...new Set([...naTabela.keys(), ...citadas])];
  const cobertas = escopo.filter((rn) => citadas.has(rn) || (naTabela.get(rn)?.casos.length ?? 0) > 0);
  const justificadas = escopo.filter((rn) => !cobertas.includes(rn) && /justificativa\s*:/i.test(naTabela.get(rn)?.status ?? ''));
  const naoCobertas = escopo.filter((rn) => !cobertas.includes(rn) && !justificadas.includes(rn));
  for (const rn of naoCobertas) add('RN_NOT_COVERED', `${rn}: nenhum caso a exercita e não há justificativa na Tabela de Cobertura RN × Caso`, { rn });
  if (!plano.temCobertura) add('PLAN_HAS_COVERAGE_TABLE', 'falta a seção `## Cobertura RN × Caso`');
  else for (const rn of escopo.filter((r) => !naTabela.has(r))) add('PLAN_HAS_COVERAGE_TABLE', `${rn} em escopo e ausente da Tabela de Cobertura RN × Caso`, { rn });
  if (plano.totalDeclarado !== null && plano.totalDeclarado !== plano.casos.length) {
    add('TESTPLAN_COVERAGE', `Metadados dizem ${plano.totalDeclarado} caso(s); o documento tem ${plano.casos.length}`);
  }

  const pct = escopo.length ? Math.round((100 * cobertas.length) / escopo.length) : 100;
  const linhaSyncLog = `TESTPLAN_COVERAGE: casos=${plano.casos.length} (${CATEGORIAS.map((c) => `${c}=${porCategoria[c] ?? 0}`).join(', ')}) | RNs cobertas=${cobertas.length}/${escopo.length} (${pct}%)`;
  return {
    casos: plano.casos.length, porCategoria, porEpica,
    rns: { emEscopo: escopo.length, cobertas: cobertas.length, justificadas, naoCobertas, promovidas },
    linhaSyncLog, achados,
  };
}

function main(argv) {
  let br = null;
  let arq = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--business-rules') br = argv[++i] ?? null;
    else if (!argv[i].startsWith('--') && arq === null) arq = argv[i];
  }
  if (!arq || !existsSync(arq)) {
    process.stderr.write(`check-testplan: test-plan.md não encontrado${arq ? `: ${arq}` : ''}\nUso: node check-testplan.mjs <test-plan.md> [--business-rules <arquivo>] [--json]\n`);
    return 2;
  }
  if (br && !existsSync(br)) { process.stderr.write(`check-testplan: business-rules não encontrado: ${br}\n`); return 2; }
  const plano = lerPlano(readFileSync(arq, 'utf8'));
  if (plano.casos.length === 0) {
    process.stderr.write(`check-testplan: nenhum caso «### [TC-NNN] … [CATEGORIA]» em ${arq} — nada a conferir.\n`);
    return 2;
  }
  const textoBr = br ? readFileSync(br, 'utf8') : null;
  const r = conferir(plano, textoBr ? rnsDoBusinessRules(textoBr) : null, { promovidas: textoBr ? promocoesDoBusinessRules(textoBr) : {} });
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
  else {
    process.stdout.write(`${r.linhaSyncLog}\n`);
    for (const a of r.achados) process.stdout.write(`  [${a.severidade}] ${a.code} — ${a.mensagem}\n`);
  }
  return r.achados.some((a) => a.severidade === 'FATAL') ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
