// module-codes.mjs — lista de módulos conhecidos e a forma canônica de um código MOD-XXX.
//
// Usado em dois lugares que precisam da MESMA resposta: a atribuição de módulo dos bugs
// (bug-modules.mjs) e o agrupamento por área de «O que falta testar» (lacunas-teste.mjs).
// Duas cópias dessa normalização divergiriam, e o mesmo item cairia num módulo numa aba e
// noutro módulo na outra.
//
// O problema que ela resolve: o código do módulo aparece embutido nos IDs de requisito do
// kit (`RF-MOD-HOME-002`), e quem lê o documento extrai `MOD-HOME-002` como se fosse módulo.
// A forma canônica corta o número do requisito e, quando há lista de módulos, cai no módulo
// conhecido do qual o código é sub-código (`MOD-CADASTRO-ENDERECO-001` → `MOD-CADASTRO`).

/** Código de módulo bem formado: `MOD-XXX`, em maiúsculas. */
export const MOD_CODE = /^MOD-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * Módulos que algum artefato do projeto nomeou: o `modules.md` e, como nem todo projeto o
 * tem, os códigos que os documentos de negócio e as épicas do `tasks.json` declaram.
 * Nenhum módulo é deduzido de texto livre.
 */
export function knownModules({ business, tasks } = {}) {
  const map = new Map();
  const add = (code, name = null) => {
    const c = String(code || "").trim().toUpperCase();
    if (!MOD_CODE.test(c)) return;
    const prev = map.get(c);
    if (!prev) map.set(c, { code: c, name: name || null });
    else if (!prev.name && name) prev.name = name;
  };
  for (const m of business?.modules || []) add(m.id, m.name);
  for (const e of tasks?.epics || []) for (const c of e.modules || []) add(c);
  for (const list of [
    business?.rules, business?.requirements?.functional,
    business?.requirements?.nonFunctional, business?.productRequirements,
  ]) {
    for (const r of list || []) if (r && r.module) add(stripRequirementSuffix(r.module));
  }
  return map;
}

/**
 * `MOD-HOME-002` (o módulo extraído de um `RF-MOD-HOME-002`) → `MOD-HOME`.
 * Só corta segmento numérico final quando sobram pelo menos dois: `MOD-001` é o código de
 * módulo do modelo do kit e continua inteiro.
 */
export function stripRequirementSuffix(code) {
  const segs = String(code || "").toUpperCase().split("-");
  while (segs.length > 2 && /^\d+$/.test(segs[segs.length - 1])) segs.pop();
  return segs.join("-");
}

/**
 * Código de módulo dentro de um texto, solto (`MOD-PAINEL quebra`) ou embutido num ID com
 * QUALQUER prefixo (`RF-MOD-HOME-002`, `STORY-MOD-HOME-002`, `TC-MOD-ESTOQUE-014`).
 *
 * A fronteira à direita (`(?![A-Za-z0-9])`) impede que o código engula o começo de uma
 * palavra: em `MOD-CAT-Api`, sem ela, saía `MOD-CAT-A`. Quando o código vem embutido num ID,
 * o número final é do item, não do módulo, e é cortado. Com lista de módulos, a forma
 * canônica decide (`MOD-CAT-API` → `MOD-CAT` quando `MOD-CAT` é conhecido); sem lista, um
 * código com sufixo em letras (`MOD-ACOMP-CARGA`) é legítimo e fica inteiro.
 */
const MOD_IN_TEXT = /(?<![A-Za-z0-9])((?:[A-Za-z][A-Za-z0-9]*-)+)?(MOD-[A-Z0-9]+(?:-[A-Z0-9]+)*)(?![A-Za-z0-9])/g;

/** Os módulos citados num texto, na forma canônica, com o trecho que os citou. */
export function modulesInText(text, known) {
  const out = [];
  const re = new RegExp(MOD_IN_TEXT.source, "g");
  let m;
  while ((m = re.exec(String(text || "")))) {
    const embedded = Boolean(m[1]);
    out.push({ code: canonical(embedded ? stripRequirementSuffix(m[2]) : m[2], known), cited: `${m[1] || ""}${m[2]}` });
  }
  return out;
}

/** Código explícito → forma canônica: o próprio, ou o módulo conhecido do qual ele é sub-código. */
export function canonical(code, known) {
  const c = String(code || "").toUpperCase();
  if (known.has(c)) return c;
  let best = null;
  for (const k of known.keys()) if (c.startsWith(`${k}-`) && (!best || k.length > best.length)) best = k;
  return best || c;
}

/** Módulo de um item de documento: corta o número do requisito e canoniza. */
export function canonicalModule(code, known) {
  if (!code) return null;
  return canonical(stripRequirementSuffix(code), known);
}

export function normToken(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Nome ou sigla → código do módulo, só com correspondência EXATA e única.
 * Tenta o texto inteiro e, depois, a parte antes do separador (`CAD - Clientes` →
 * `CAD`). Empate entre dois módulos devolve nada: decidir seria adivinhar.
 */
export function resolveName(text, known) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const head = raw.split(/\s+[-–—|]\s+|\s*:\s*/)[0];
  for (const cand of [...new Set([normToken(raw), normToken(head)])].filter(Boolean)) {
    const hits = [...known.values()].filter((k) => k.code === cand || k.code.slice(4) === cand || (k.name && normToken(k.name) === cand));
    if (hits.length === 1) return hits[0].code;
    if (hits.length > 1) return null;
  }
  return null;
}

/** «Nome (MOD-X)» quando o modules.md dá o nome; senão, o código. */
export function moduleLabel(code, known) {
  if (!code) return null;
  const k = known.get(code);
  return k && k.name ? `${k.name} (${code})` : code;
}
