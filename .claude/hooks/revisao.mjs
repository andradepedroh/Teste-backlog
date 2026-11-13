// Harness Elo v2 — Listas mecânicas de revisão do Explore. Núcleo puro + casca de I/O.
//
// Módulo executável, não verificador: rodável à mão a qualquer momento e chamado pelo
// fecho-explore. Checar que seis artefatos existem não é revisão, é inventário — o que um
// humano de fato lê é o cruzamento entre eles.
//
// TODAS as listas são RELATÓRIO, nunca bloqueio. Cada uma tem caso legítimo: módulo declarado
// e ainda não detalhado, entidade preparada para o Plan. Transformar sinal de densidade em
// trava criaria limiar, e limiar vira alvo — as pessoas escrevem para o número.

import { extrairIds, RAIZ_EXPLORE, RAIZ_SPEC } from './kit.mjs';

export const VERSAO_RELATORIO = '1.0';

const TITULOS = {
  'modulo-sem-rf': 'Módulos sem nenhuma funcionalidade',
  'rf-sem-tela': 'Funcionalidades sem tela correspondente',
  'rf-sem-rn': 'Funcionalidades sem nenhuma regra de negócio',
  'rn-orfa': 'Regras de negócio que não referenciam funcionalidade',
  'modulo-fantasma': 'Módulos citados no protótipo e ausentes do HLD',
  'perfil-sem-tela': 'Perfis sem nenhuma tela visível',
  'entidade-sem-rf': 'Entidades sem funcionalidade que as use',
  'gaps-abertos': 'GAPs em aberto',
};

/** Seções `### MOD-XXX — nome` da funcional, com o texto de cada uma. */
function seccionarPorModulo(funcional) {
  const secoes = new Map();
  const partes = String(funcional || '').split(/^###\s+/m);
  for (const p of partes.slice(1)) {
    const mods = extrairIds('MOD', p.split('\n')[0]);
    if (mods.length) secoes.set(mods[0], p);
  }
  return secoes;
}

/**
 * Trecho sob o primeiro título (de qualquer nível) que casa `re`, até o próximo título de nível
 * MENOR OU IGUAL. É o que separa "a tabela de telas" das outras tabelas do documento: contar
 * colunas não separa, e duas tabelas diferentes de quatro colunas se misturariam.
 *
 * É o ÚNICO mecanismo de fatiar seção deste módulo, e isso é deliberado: dois jeitos de
 * responder à mesma pergunta divergem — a lição que este projeto já pagou no `kit.mjs`.
 */
function trechoDaSecao(texto, re) {
  const ls = String(texto || '').split(/\r?\n/);
  const i = ls.findIndex((l) => /^#{1,6}\s/.test(l) && re.test(l));
  if (i < 0) return '';
  const nivel = ls[i].match(/^#+/)[0].length;
  const out = [];
  for (let j = i + 1; j < ls.length; j++) {
    const m = ls[j].match(/^(#{1,6})\s/);
    if (m && m[1].length <= nivel) break;
    out.push(ls[j]);
  }
  return out.join('\n');
}

/** Perfis do cabeçalho da matriz de acesso: a primeira coluna é a ação, as demais são perfis. */
function perfisDaMatriz(funcional) {
  const cab = linhasDeTabela(trechoDaSecao(funcional, /matriz de acesso/i))[0] || [];
  return cab.slice(1).map((x) => x.trim()).filter(Boolean);
}

/** Perfis citados na coluna "Visível para" da tabela de telas, como conjunto de valores exatos. */
function perfisComTela(funcional) {
  const ls = linhasDeTabela(trechoDaSecao(funcional, /navega|telas/i));
  const col = (ls[0] || []).findIndex((x) => /vis[íi]vel para/i.test(x));
  const vistos = new Set();
  if (col < 0) return vistos;
  for (const c of ls.slice(1)) {
    for (const bruto of String(c[col] || '').split(/[,;/]/)) {
      const v = bruto.trim();
      if (v && !/^[—-]$/.test(v)) vistos.add(v);
    }
  }
  return vistos;
}

/**
 * A notação de exemplo dos templates do kit — `MOD-XXX`, `MOD-YYY`, `MOD-EXEMPLO`,
 * `MOD-EXEMPLO-A`, `MOD-CODIGO` — quer dizer «um código de módulo qualquer», não um módulo. O
 * template antigo do protótipo trazia o cabeçalho «Domínio (MOD-XXX)», que fica no documento de
 * quem seguiu o template à risca, e a lista de fantasmas o acusava (D10, teste ponta a ponta de
 * 2026-10-21).
 *
 * Vive AQUI, e não no `kit.mjs`, porque é filtro de relatório: o `extrairIds` alimenta código
 * bloqueante, e a gramática do Explore continua enxergando o literal. O mesmo padrão está no
 * `check-modules.py` do kit (`PLACEHOLDER_MODULE`); `modulo-placeholder.test.mjs` prova que os
 * dois concordam.
 */
const NOTACAO_DE_EXEMPLO = /^MOD-(?:X+|Y+|Z+|EXEMPLO(?:-[A-Z0-9]+)*|CODIGO)$/;

function ehNotacaoDeExemplo(codigo) {
  return NOTACAO_DE_EXEMPLO.test(codigo);
}

/** Linhas de tabela markdown, já divididas em células. */
function linhasDeTabela(texto) {
  return String(texto || '').split(/\r?\n/)
    .filter((l) => l.trim().startsWith('|') && !/^\s*\|[\s|:-]+\|\s*$/.test(l))
    .map((l) => l.split('|').map((c) => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1));
}

export function analisar(docs) {
  const d = docs || new Map();
  const hld = d.get('hld-funcional.md') || '';
  const funcional = d.get('especificacao-funcional.md') || '';
  const modelo = d.get('modelo-de-dados.md') || '';
  const gaps = d.get('gaps.md') || '';
  const proto = d.get('prototype.md') || '';

  const modsHld = extrairIds('MOD', hld);
  const secoes = seccionarPorModulo(funcional);
  const rfs = extrairIds('RF', funcional);

  const itens = {};

  itens['modulo-sem-rf'] = modsHld
    .filter((m) => extrairIds('RF', secoes.get(m) || '').length === 0)
    .map((m) => `${m} — declarado no HLD, sem nenhum RF na especificação funcional`);

  // A seção de telas sai do MESMO `trechoDaSecao` que a lista de perfis usa, e os IDs saem do
  // `extrairIds` do kit. As duas coisas são correção, não estilo:
  //
  //   - cortar por `funcional.split(/^##\s+3\./m)` presume que a seção de funcionalidades é
  //     literalmente a "## 3.". Num documento numerado de outro jeito o corte não acontece,
  //     `telasTexto` vira o documento inteiro, todo RF passa a "ter tela" e a lista fica VAZIA
  //     em silêncio — que é pior do que não existir, porque diz "nada a olhar aqui";
  //   - `String.includes` não tem fronteira: `RF-001` é substring de `RF-0012`, e o padrão
  //     do kit aceita três OU quatro dígitos. Um RF de quatro dígitos numa tela faz o de três
  //     desaparecer da lista. É a mesma classe de defeito que o comentário de `perfil-sem-tela`
  //     descreve duas listas abaixo, e que custou quatro rodadas na fronteira do `kit.mjs`.
  const telasTexto = trechoDaSecao(funcional, /navega|telas/i) + '\n' + proto;
  const rfComTela = new Set(extrairIds('RF', telasTexto));
  itens['rf-sem-tela'] = rfs
    .filter((rf) => !rfComTela.has(rf))
    .map((rf) => `${rf} — sem tela na §2 nem menção no protótipo`);

  const rnLinhas = linhasDeTabela(funcional).filter((c) => c.some((x) => extrairIds('RN', x).length));
  const rfCitadosPorRn = new Set(rnLinhas.flatMap((c) => c.flatMap((x) => extrairIds('RF', x))));
  itens['rf-sem-rn'] = rfs
    .filter((rf) => !rfCitadosPorRn.has(rf))
    .map((rf) => `${rf} — nenhuma RN o referencia`);

  itens['rn-orfa'] = rnLinhas
    .filter((c) => c.every((x) => extrairIds('RF', x).length === 0))
    .map((c) => `${extrairIds('RN', c.join(' '))[0]} — não declara qual RF ela afeta`);

  // A notação de exemplo do template do protótipo (`Domínio (MOD-XXX)`, no template anterior à
  // correção do D10) não é módulo citado — ver `ehNotacaoDeExemplo`.
  const setHld = new Set(modsHld);
  itens['modulo-fantasma'] = [...new Set(extrairIds('MOD', proto))]
    .filter((m) => !ehNotacaoDeExemplo(m))
    .filter((m) => !setHld.has(m))
    .map((m) => `${m} — citado no prototype.md, ausente do hld-funcional.md`);

  // Perfis vêm do cabeçalho da matriz de acesso (§1.2); telas declaram quem as vê na coluna
  // "Visível para" (§2). As duas leituras são FATIADAS POR SEÇÃO, e a comparação é por VALOR
  // EXATO de célula. Nenhuma das duas coisas é detalhe:
  //
  //   - Varrer `linhasDeTabela(funcional)` inteiro e filtrar por número de colunas mistura
  //     tabelas: qualquer outra tabela de quatro colunas entra como se fosse tela, e o perfil
  //     aparece coberto por uma tela que não existe.
  //   - Comparar com `String.includes` sobre o documento não tem fronteira: o perfil `Operador`
  //     sairia como coberto por uma tela visível apenas para `Operador Master`, e a lista
  //     silenciaria exatamente o caso que ela existe para achar. É a mesma classe de defeito da
  //     fronteira de token do `kit.mjs`, que custou quatro rodadas de correção.
  //
  // Uma tela pode listar vários perfis numa célula (`Operador, Gestor`), então a célula é
  // dividida por vírgula, ponto-e-vírgula ou barra antes da comparação.
  const perfis = perfisDaMatriz(funcional);
  const comTela = perfisComTela(funcional);
  itens['perfil-sem-tela'] = perfis
    .filter((p) => !comTela.has(p))
    .map((p) => `${p} — declarado na matriz de acesso, sem nenhuma tela que o liste como visível`);

  itens['entidade-sem-rf'] = linhasDeTabela(modelo)
    .filter((c) => c.length >= 2 && c[0] && !/entidade/i.test(c[0]))
    .filter((c) => extrairIds('RF', c.join(' ')).length === 0)
    .map((c) => `${c[0]} — nenhuma RF declarada como consumidora`);

  itens['gaps-abertos'] = linhasDeTabela(gaps)
    .filter((c) => extrairIds('GAP', c.join(' ')).length && /Aguardando|Parcialmente/i.test(c.join(' ')))
    .map((c) => `${extrairIds('GAP', c.join(' '))[0]} — ${c[1] || ''} (impacto: ${c[3] || 'não declarado'})`);

  const listas = Object.keys(TITULOS).map((chave) => ({
    chave, titulo: TITULOS[chave], itens: itens[chave] || [],
  }));

  return {
    listas,
    resumo: {
      documentos: d.size,
      totalApontamentos: listas.reduce((s, l) => s + l.itens.length, 0),
      gapsAbertos: itens['gaps-abertos'].length,
    },
  };
}

/**
 * Texto para humano: OMITE as listas vazias, porque oito cabeçalhos zerados escondem os dois
 * apontamentos que importam. O JSON faz o oposto — ver `formatarJson`.
 */
export function formatarTexto(analise) {
  const naoVazias = analise.listas.filter((l) => l.itens.length);
  if (!naoVazias.length) {
    return `Revisão de \`${RAIZ_EXPLORE}/\`: nenhum apontamento. ${analise.resumo.documentos} documento(s) lido(s).`;
  }
  const linhas = [
    `Revisão de \`${RAIZ_EXPLORE}/\` — ${analise.resumo.totalApontamentos} apontamento(s) em ${analise.resumo.documentos} documento(s).`,
    '',
    'Nenhum deles bloqueia o fecho. São o que um humano precisa olhar antes de mandar para o cliente.',
  ];
  for (const l of naoVazias) {
    linhas.push('', `## ${l.titulo} (${l.itens.length})`);
    for (const i of l.itens) linhas.push(`  · ${i}`);
  }
  return linhas.join('\n');
}

/**
 * JSON: traz AS OITO listas, sempre, inclusive as vazias. É contrato do `fecho-explore` e do
 * domínio Revisão da `spec-report`, e contrato com campo que às vezes some é contrato quebrado.
 */
export function formatarJson(analise) {
  return { versao: VERSAO_RELATORIO, resumo: analise.resumo, listas: analise.listas };
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DOCS_EXPLORE } from './kit.mjs';

const DO_SPEC = ['prototype.md'];

/**
 * Carrega os documentos que a análise cruza. Ausência de arquivo é normal — nem todo projeto
 * tem modelo de dados ou protótipo. Qualquer outro erro é RELANÇADO.
 */
export function carregarDocs(raizProjeto, lerArquivo = readFileSync) {
  const m = new Map();
  const alvos = [
    ...DOCS_EXPLORE.map((d) => [join(raizProjeto || '.', RAIZ_EXPLORE, d.caminho), d.caminho]),
    ...DO_SPEC.map((n) => [join(raizProjeto || '.', RAIZ_SPEC, n), n]),
  ];
  for (const [caminho, chave] of alvos) {
    try {
      m.set(chave, lerArquivo(caminho, 'utf8'));
    } catch (erro) {
      if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) continue;
      throw erro;
    }
  }
  return m;
}

function main(argv) {
  const analise = analisar(carregarDocs(process.cwd()));
  const json = argv.includes('--json');
  process.stdout.write((json ? JSON.stringify(formatarJson(analise), null, 2) : formatarTexto(analise)) + '\n');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
