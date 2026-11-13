#!/usr/bin/env node
/**
 * check-rules.mjs — os dois FATAL triviais da spec-tech-rules, conferidos por máquina em vez de pela
 * IA que gerou as rules: NO_PLACEHOLDER_LEFT e SECURITY_UNMODIFIED.
 *
 * Uso (caminhos relativos a este SKILL.md, como o mdc_to_md.py):
 *   node tools/check-rules.mjs <pasta_mdc> [<pasta materializada> ...] [--data-model <arquivo>] [--json]
 *   ex.: node tools/check-rules.mjs outputs/spec/tech-rules .claude/rules
 *
 *   NO_PLACEHOLDER_LEFT — nenhum `{{NOME}}` em nenhum `.mdc` da pasta-fonte nem em nenhum `.md`/`.mdc`
 *                         das pastas materializadas (a varredura não desce em subpastas: a
 *                         `.claude/rules/harness/` do harness não é saída desta skill).
 *   SECURITY_UNMODIFIED — `<pasta_mdc>/security.mdc` idêntico a `templates/security.mdc` desta skill.
 *                         Fim de linha não conta (o git pode convertê-lo no checkout); qualquer outro
 *                         byte conta. Ausente também é achado: a skill gera a security sempre.
 *   RULES_CONTRADICTION — duas contradições que dá para ver por texto (D46, teste ponta a ponta de
 *                         2026-10-21; o código é o mesmo da `spec-scaffold`, que as achava depois):
 *     · módulo (`tipo: 'modulo'`): pasta de módulo citada numa rule (`src/modules/acesso/…`) ou
 *       módulo do `data-model.json` (`boundedContexts[].moduleIds`; o nome do contexto quando ele
 *       não tem `moduleIds`) que não está na lista de módulos da `architecture.mdc` — as pastas
 *       debaixo de `modules/` (ou `modulos/`, `features/`, `domains/`…) da árvore, e os `MOD-…`
 *       citados nela. Sem essa árvore não há lista contra a qual conferir, e nada é acusado.
 *     · dependência (`tipo: 'dependencia'`): uma rule diz «sem dependências de runtime» e a
 *       `database.mdc` escolhe um banco servidor (PostgreSQL, MySQL, SQL Server, MongoDB…), cujo
 *       driver É dependência de runtime. A linha que declara a exceção («… além do driver») não conta.
 *     `security.mdc` e `frontend-default.mdc` ficam fora: são cópia do template, não decisão do projeto.
 *     O `data-model.json` é o `<pasta_mdc>/../data-model.json` (o `outputs/spec/`), ou `--data-model`.
 *
 * Entra como WARNING (princípio P4 do plano de melhoria das skills): os dois primeiros continuam
 * FATAL na skill, e este script é a evidência deles.
 *
 * Exit codes: 0 nada a apontar · 1 há achado · 2 pasta-fonte inexistente ou sem nenhum `.mdc`.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TEMPLATE_SECURITY = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'security.mdc');
const RE_PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/g;
const semCR = (s) => s.replace(/\r\n/g, '\n');

const arquivos = (dir, exts) => readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isFile() && exts.some((x) => e.name.endsWith(x)))
  .map((e) => join(dir, e.name))
  .sort();

// ——————————————————————————— contradições entre rules (D46) ———————————————————————————

const COPIA_DO_TEMPLATE = new Set(['security.mdc', 'frontend-default.mdc']);
const CONTAINERS = ['modules', 'modulos', 'módulos', 'features', 'domains', 'dominios', 'domínios', 'contexts', 'bounded-contexts'];
const RE_CONTAINER = new RegExp(`(?:^|/)(${CONTAINERS.join('|')})/$`, 'i');
const RE_MOD = /\bMOD-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** `src/modules/acesso/http/x.js` → `acesso`; `modules/*` e `modules/<nome>` não são módulo. */
const reCitacao = (containers) => new RegExp(`(?:^|[^\\w-])(?:${containers.map(escapar).join('|')})/([A-Za-z0-9][\\w-]*)(?=/|[\\s\`'"),;:]|$)`, 'gi');
/** Chave de comparação: sem acento, sem `MOD-`, só letra e dígito, sem o plural (`clientes` = `MOD-CLIENTES` = `Cliente`). */
const chave = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/^mod-/, '').replace(/[^a-z0-9]/g, '').replace(/s$/, '');
const nomeDoModulo = (s) => String(s).replace(/^MOD-/i, '').toLowerCase();

/**
 * A lista de módulos da `architecture.mdc`: as pastas filhas do contêiner de módulos (`modules/`,
 * `features/`…) na árvore de pastas, os caminhos `modules/<nome>/` que ela mesma cita e os `MOD-…`.
 * Devolve `{ containers, modulos: Map(chave → nome) }`; `modulos` vazio = a architecture não lista
 * módulos, e não há o que conferir.
 */
export function modulosDaArquitetura(texto) {
  const containers = new Set();
  const modulos = new Map();
  const add = (nome) => { if (!modulos.has(chave(nome))) modulos.set(chave(nome), nomeDoModulo(nome)); };
  let codigo = false;
  let pai = null; // { recuo, recuoFilho }
  for (const bruta of semCR(texto).split('\n')) {
    if (/^\s*```/.test(bruta)) { codigo = !codigo; pai = null; continue; }
    for (const m of bruta.matchAll(RE_MOD)) add(m[0]);
    if (!codigo) continue;
    const l = bruta.replace(/[│├└┬┌─]/g, ' ').replace(/\s(#|\/\/).*$/, '');
    const token = l.trim().split(/\s+/)[0] ?? '';
    if (!token) continue;
    const recuo = l.length - l.trimStart().length;
    if (pai && recuo <= pai.recuo) pai = null;
    if (pai) {
      pai.recuoFilho ??= recuo;
      if (recuo === pai.recuoFilho && /^[A-Za-z0-9][\w-]*\/?$/.test(token)) add(token.replace(/\/$/, ''));
      continue;
    }
    const c = RE_CONTAINER.exec(token);
    if (c) { containers.add(c[1].toLowerCase()); pai = { recuo, recuoFilho: null }; }
  }
  for (const c of CONTAINERS) if (new RegExp(`(?:^|[^\\w-])${escapar(c)}/[A-Za-z0-9]`, 'i').test(texto)) containers.add(c);
  if (containers.size) for (const m of semCR(texto).matchAll(reCitacao([...containers]))) add(m[1]);
  return { containers: [...containers], modulos };
}

/** Os módulos que o `data-model.json` declara: `moduleIds` de cada contexto, ou o nome do contexto sem `moduleIds`. */
export function modulosDoDataModel(dm) {
  const saida = [];
  for (const bc of Array.isArray(dm?.boundedContexts) ? dm.boundedContexts : []) {
    const ids = (Array.isArray(bc?.moduleIds) ? bc.moduleIds : []).filter((x) => typeof x === 'string' && x);
    if (ids.length) for (const id of ids) saida.push({ nome: nomeDoModulo(id), onde: `data-model.json (${bc.id ?? '?'} ${id})` });
    else if (typeof bc?.name === 'string' && bc.name) saida.push({ nome: nomeDoModulo(bc.name), onde: `data-model.json (${bc.id ?? '?'} «${bc.name}»)` });
  }
  return saida;
}

const SEM_DEPENDENCIAS = /\b(?:sem|zero|nenhuma)\s+depend[eê]ncias?\s+(?:de\s+)?(?:runtime|produ[cç][aã]o)\b|\b(?:no|zero)\s+(?:runtime|production)\s+dependenc(?:y|ies)\b/i;
const COM_EXCECAO = /\b(?:exceto|salvo|al[eé]m\s+d[oae]s?|fora\s+[oa]s?|a\s+n[aã]o\s+ser|menos\s+[oa]s?|except|other\s+than|besides|apart\s+from)\s/i;
const BANCO_SERVIDOR = /\b(PostgreSQL|Postgres|MySQL|MariaDB|SQL\s*Server|Oracle|MongoDB|Redis|Cassandra|CockroachDB|DynamoDB)\b/i;

/** RULES_CONTRADICTION de módulo e de dependência sobre os `.mdc` da pasta-fonte. Lê disco; não escreve. */
export function contradicoes(fonte, dataModel = join(fonte, '..', 'data-model.json')) {
  const achados = [];
  const rules = arquivos(fonte, ['.mdc']).filter((a) => !COPIA_DO_TEMPLATE.has(basename(a)))
    .map((a) => ({ arq: a, nome: basename(a), linhas: semCR(readFileSync(a, 'utf8')).split('\n') }));
  const arquitetura = rules.find((r) => r.nome === 'architecture.mdc');

  if (arquitetura) {
    const { containers, modulos } = modulosDaArquitetura(arquitetura.linhas.join('\n'));
    if (modulos.size) {
      const citados = new Map(); // chave → { nome, onde[] }
      const citar = (nome, onde) => {
        const k = chave(nome);
        if (modulos.has(k)) return;
        const c = citados.get(k) ?? { nome, onde: [] };
        if (!c.onde.includes(onde)) c.onde.push(onde);
        citados.set(k, c);
      };
      const re = reCitacao(containers);
      for (const r of containers.length ? rules.filter((x) => x !== arquitetura) : []) {
        r.linhas.forEach((l, i) => { for (const m of l.matchAll(re)) citar(m[1].toLowerCase(), `${r.nome}:${i + 1}`); });
      }
      if (dataModel && existsSync(dataModel)) {
        let dm = null;
        try { dm = JSON.parse(readFileSync(dataModel, 'utf8')); } catch { /* data-model ilegível: a spec-data-model tem verificador próprio */ }
        for (const { nome, onde } of modulosDoDataModel(dm)) citar(nome, onde);
      }
      const lista = [...modulos.values()].sort().join(', ');
      for (const { nome, onde } of citados.values()) {
        achados.push({ code: 'RULES_CONTRADICTION', tipo: 'modulo', modulo: nome, arquivo: arquitetura.arq,
          mensagem: `módulo «${nome}» citado em ${onde.join(', ')}, fora dos módulos da architecture: ${lista} — acrescentar o módulo à architecture.mdc (árvore e comunicação entre módulos) ou corrigir quem o cita` });
      }
    }
  }

  const banco = rules.find((r) => r.nome === 'database.mdc');
  const iBanco = banco ? banco.linhas.findIndex((l) => BANCO_SERVIDOR.test(l)) : -1;
  if (iBanco >= 0) {
    const motor = BANCO_SERVIDOR.exec(banco.linhas[iBanco])[1];
    for (const r of rules) {
      r.linhas.forEach((l, i) => {
        const m = SEM_DEPENDENCIAS.exec(l);
        if (!m || COM_EXCECAO.test(l)) return;
        achados.push({ code: 'RULES_CONTRADICTION', tipo: 'dependencia', arquivo: r.arq, linha: i + 1,
          mensagem: `${r.nome}:${i + 1} diz «${m[0]}», mas database.mdc:${iBanco + 1} escolhe ${motor} — o driver do banco é dependência de runtime. Declarar a exceção na rule (ex.: «${m[0]} além do driver do ${motor}») ou rever a escolha` });
      });
    }
  }
  return achados;
}

/** Achados das pastas. Lê disco; não escreve nada. */
export function conferirRules(fonte, materializadas = [], templateSecurity = TEMPLATE_SECURITY, { dataModel } = {}) {
  const achados = [];
  const mdc = arquivos(fonte, ['.mdc']);
  const alvos = [...mdc, ...materializadas.filter((d) => existsSync(d) && statSync(d).isDirectory()).flatMap((d) => arquivos(d, ['.md', '.mdc']))];
  for (const arq of alvos) {
    semCR(readFileSync(arq, 'utf8')).split('\n').forEach((l, i) => {
      for (const m of l.matchAll(RE_PLACEHOLDER)) {
        achados.push({ code: 'NO_PLACEHOLDER_LEFT', arquivo: arq, linha: i + 1, mensagem: `${arq}:${i + 1} — ${m[0]} não foi preenchido` });
      }
    });
  }
  const sec = join(fonte, 'security.mdc');
  if (!existsSync(sec)) {
    achados.push({ code: 'SECURITY_UNMODIFIED', arquivo: sec, mensagem: `${sec} ausente — a security é gerada sempre` });
  } else if (semCR(readFileSync(sec, 'utf8')) !== semCR(readFileSync(templateSecurity, 'utf8'))) {
    const a = semCR(readFileSync(sec, 'utf8')).split('\n');
    const b = semCR(readFileSync(templateSecurity, 'utf8')).split('\n');
    const i = a.findIndex((l, k) => l !== b[k]);
    const onde = i < 0 ? a.length + 1 : i + 1;
    achados.push({ code: 'SECURITY_UNMODIFIED', arquivo: sec, linha: onde, mensagem: `${sec} difere de templates/security.mdc a partir da linha ${onde}` });
  }
  achados.push(...contradicoes(fonte, dataModel ?? join(fonte, '..', 'data-model.json')));
  return { arquivos: alvos.length, achados };
}

function main(argv) {
  const i = argv.indexOf('--data-model');
  const dataModel = i >= 0 ? argv[i + 1] : undefined;
  const pos = argv.filter((a, k) => !a.startsWith('--') && !(i >= 0 && k === i + 1));
  const [fonte, ...materializadas] = pos;
  if (!fonte || !existsSync(fonte) || !statSync(fonte).isDirectory()) {
    process.stderr.write(`check-rules: pasta-fonte inexistente${fonte ? `: ${fonte}` : ''}\nUso: node tools/check-rules.mjs <pasta_mdc> [<pasta materializada> ...] [--json]\n`);
    return 2;
  }
  if (arquivos(fonte, ['.mdc']).length === 0) {
    process.stderr.write(`check-rules: nenhum .mdc em ${fonte} — nada a conferir.\n`);
    return 2;
  }
  const r = conferirRules(fonte, materializadas, TEMPLATE_SECURITY, { dataModel });
  if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
  else {
    process.stdout.write(`check-rules: ${r.arquivos} arquivo(s), ${r.achados.length} achado(s).\n`);
    for (const a of r.achados) process.stdout.write(`  [${a.code}] ${a.mensagem}\n`);
  }
  return r.achados.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
