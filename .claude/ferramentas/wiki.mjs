// Harness Elo v2 — Árvore de publicação da wiki do Azure DevOps (Decisões 19 e 24).
//
// EXECUTÁVEL DE MÃO (Decisão 20). Escreve arquivo — copia a árvore para o diretório de saída.
//
// O QUE ESTÁ DECLARADAMENTE FORA DE ESCOPO: o formato de publicação do ADO — arquivos `.order`,
// convenção de nome de página, `.attachments/`. Ele NÃO TEM FONTE neste repositório, e inventá-lo
// é o erro que custou três rodadas no kickoff do `fecho-explore`: formato decidido sem abrir a
// fonte. Esta ferramenta entrega a ÁRVORE DE ARQUIVOS, correta e auditável, e a publicação fica
// para quem tiver a documentação do ADO ou uma wiki já publicada na mão.
//
// CONDIÇÃO DE FECHO, para não virar TODO eterno: abrir uma wiki do ADO já publicada, ler os
// `.order` reais, e só então gerar. Enquanto isso não acontecer, a saída DIZ que não gera — em
// vez de gerar algo plausível e errado.

import {
  RAIZ_EXPLORE, RAIZ_SPEC, ARTEFATOS_DE_CONTRATO, LISTA_DE_ACRESCIMOS, inventariar,
  MARCADOR_CONGELAMENTO, DIR_AUDITORIAS, ARTEFATOS_PROTOTIPO,
} from '../hooks/kit.mjs';
// `RELATORIO_REVISAO` vem de `fecho-explore.mjs`, não de `kit.mjs`: é onde o `revisao.json` tem
// nome próprio (ver o JSDoc dele ali — "o relatório que prova que alguém rodou o revisao.mjs").
// `kit.mjs` só CITA o literal dentro de `WHITELIST_EXPLORE`, misturado com artefato de contrato —
// puxar de lá seria escrever a mesma string à mão de novo, exatamente o que este import evita.
import { RELATORIO_REVISAO } from '../hooks/fecho-explore.mjs';

/**
 * Os quatro nomes, relativos a `RAIZ_SPEC` — a mesma forma que `ignorados` guarda (ver `arvore`).
 * DERIVADOS das constantes acima, nunca escritos à mão: fronteira/nome escrito duas vezes diverge
 * (é a lição que `CLASSE_ID` já pagou em `kit.mjs`, quatro rodadas de correção).
 *
 * `screens-manifest.json` não tem constante própria em lugar nenhum — só aparece dentro de
 * `ARTEFATOS_PROTOTIPO`, ao lado de `prototype.md` e `design-system.md`, que SÃO contrato. O
 * filtro abaixo separa os dois: o único item de `ARTEFATOS_PROTOTIPO` que não é contrato é
 * `screens-manifest.json`.
 */
const semRaizSpec = (c) => (c.startsWith(`${RAIZ_SPEC}/`) ? c.slice(RAIZ_SPEC.length + 1) : c);
const NOME_MARCADOR_CONGELAMENTO = semRaizSpec(MARCADOR_CONGELAMENTO);
const NOME_DIR_AUDITORIAS = semRaizSpec(DIR_AUDITORIAS);
const NOME_RELATORIO_REVISAO = semRaizSpec(RELATORIO_REVISAO);
const [NOME_SCREENS_MANIFEST] = ARTEFATOS_PROTOTIPO.filter((a) => !ARTEFATOS_DE_CONTRATO.spec.includes(a));

/**
 * Este ignorado é estado de máquina do PRÓPRIO harness ou do gate — não do kit?
 *
 * A DISTINÇÃO É O PONTO INTEIRO deste predicado, e NÃO é a lista de exclusão que a Decisão 19
 * rejeita: o apodrecimento que a Decisão 19 teme é sobre artefato do KIT, que cresce sem avisar
 * (é a história de `screens-manifest.json`, `revisao.json` e `_explore-congelado.md` no JSDoc de
 * `ARTEFATOS_DE_CONTRATO`, em `kit.mjs`). Estes quatro são NOSSOS: o harness é quem os cria
 * (`MARCADOR_CONGELAMENTO`, `DIR_AUDITORIAS`, `RELATORIO_REVISAO`) ou o gate (`screens-manifest.json`,
 * gate `SCREENS_MANIFEST_EMITTED`) — nomeá-los aqui não apodrece, porque a lista não deixa de
 * enumerar o que EXISTE: ela é fixa, quatro nomes, e cresce só quando o próprio harness ganhar um
 * artefato de máquina novo.
 */
function ehEstadoDeMaquinaDoHarness(nome) {
  return nome === NOME_MARCADOR_CONGELAMENTO
    || nome === NOME_RELATORIO_REVISAO
    || nome === NOME_SCREENS_MANIFEST
    || nome === NOME_DIR_AUDITORIAS
    || nome.startsWith(`${NOME_DIR_AUDITORIAS}/`);
}

const RE_ITEM = /^[-*]\s+`?([^`\s][^`]*?)`?\s*$/;

/**
 * Os caminhos declarados numa lista markdown de acréscimos. Prosa, título e comentário são
 * ignorados: o arquivo existe para o projeto EXPLICAR o que está acrescentando, e uma lista que
 * não aceita explicação vira lista sem explicação.
 */
export function lerAcrescimos(texto) {
  const saida = [];
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const m = RE_ITEM.exec(bruta.trim());
    if (!m) continue;
    const caminho = m[1].trim();
    if (caminho && !saida.includes(caminho)) saida.push(caminho);
  }
  return saida;
}

/**
 * O caminho é relativo e fica dentro da árvore do projeto?
 *
 * Um acréscimo é texto escrito à mão, e a ferramenta COPIA o que ele aponta. Caminho que escapa
 * copiaria arquivo de fora do projeto para dentro de um pacote que vai para o cliente — e é o
 * único lugar deste plano em que a entrada não vem do harness.
 *
 * A FORMA UNC DO WINDOWS (`\\servidor\share\...`) TAMBÉM É ABSOLUTA, e a normalização de barra
 * cuida dela sem regra própria: trocando `\` por `/`, `\\servidor\share` vira `//servidor/share`,
 * que já casa `c.startsWith('/')` — a mesma linha que recusa `/etc/passwd`. Não é acidente: as
 * duas são "caminho que não começa dentro do projeto", e tratá-las com o mesmo teste evita uma
 * segunda noção de "absoluto" que divergiria da primeira no primeiro caractere exótico.
 */
/**
 * `\` → `/`. FONTE ÚNICA — `dentroDoProjeto` normaliza para CHECAR, e `arvore()` usa a mesma
 * função para o valor que vai ARMAZENAR em `incluidos`/`acrescentados`. As duas precisam
 * concordar: um acréscimo relativo em estilo Windows (`outputs\spec\x.png`, sem ser UNC) passa a
 * checagem, e se o valor armazenado fosse o original com `\`, `join(raiz, rel)` em `publicar`
 * resolveria certo no Windows mas quebraria em POSIX, onde `\` é caractere de nome válido, não
 * separador.
 */
function normalizarBarra(caminho) {
  return String(caminho || '').replace(/\\/g, '/');
}

function dentroDoProjeto(caminho) {
  const c = normalizarBarra(caminho);
  if (!c || c.startsWith('/') || /^[A-Za-z]:/.test(c)) return false;
  const segmentos = c.split('/');
  return !segmentos.includes('..') && !segmentos.includes('.');
}

/**
 * A árvore de publicação: o que é contrato E existe, mais os acréscimos válidos.
 *
 * SÓ-ACRÉSCIMO (Decisão 24). Não há sintaxe de remoção, e não é omissão: uma lista que pudesse
 * remover teria dois donos e uma regra de precedência, e um `gaps.md` derrubado em silêncio da
 * wiki do cliente é o apodrecimento que a Decisão 19 rejeitou. Uma linha como `-outputs/...` é
 * lida como um caminho começando com `-`, que não existe, e é recusada como qualquer outra —
 * nunca interpretada como comando.
 */
export function arvore({ presentesExplore = new Set(), presentesSpec = new Set(), acrescimos = [] } = {}) {
  const incluidos = [];
  const faltando = [];
  const juntar = (c) => { if (!incluidos.includes(c)) incluidos.push(c); };

  for (const nome of ARTEFATOS_DE_CONTRATO.explore) {
    const rel = `${RAIZ_EXPLORE}/${nome}`;
    if (presentesExplore.has(nome)) juntar(rel); else faltando.push(rel);
  }
  for (const nome of ARTEFATOS_DE_CONTRATO.spec) {
    const rel = `${RAIZ_SPEC}/${nome}`;
    if (presentesSpec.has(nome)) juntar(rel); else faltando.push(rel);
  }

  // O que existe no disco e NÃO é contrato. Sai nomeado para que a decisão de não publicar seja
  // visível — a alternativa é o consultor descobrir a ausência pela pergunta do cliente.
  const ignorados = [];
  for (const [presentes, raiz, contrato] of [
    [presentesExplore, RAIZ_EXPLORE, ARTEFATOS_DE_CONTRATO.explore],
    [presentesSpec, RAIZ_SPEC, ARTEFATOS_DE_CONTRATO.spec],
  ]) {
    for (const nome of presentes) {
      if (!contrato.includes(nome) && !acrescimos.includes(`${raiz}/${nome}`)) ignorados.push(nome);
    }
  }
  ignorados.sort();

  const acrescentados = [];
  const recusados = [];
  for (const bruto of acrescimos) {
    if (!dentroDoProjeto(bruto)) { recusados.push(bruto); continue; }
    // Armazena normalizado — o MESMO valor que passou na checagem acima, não o original.
    const c = normalizarBarra(bruto);
    if (!incluidos.includes(c)) acrescentados.push(c);
    juntar(c);
  }

  return { incluidos, acrescentados, recusados, ignorados, faltando };
}

export function formatarTexto(r) {
  const l = ['ÁRVORE DE PUBLICAÇÃO DA WIKI', ''];
  l.push(`Incluídos: ${r.incluidos.length} · acrescentados pelo projeto: ${r.acrescentados.length} · ` +
    `ignorados por não serem contrato: ${r.ignorados.length} · recusados: ${r.recusados.length}`);
  l.push('');
  for (const c of r.incluidos) l.push(`  + ${c}`);
  if (r.ignorados.length) {
    l.push('');
    l.push('Não publicados — existem no disco e não são artefato de contrato (Decisão 19):');
    for (const c of r.ignorados) l.push(`  - ${c}`);
    const doHarness = r.ignorados.filter(ehEstadoDeMaquinaDoHarness);
    if (doHarness.length) {
      l.push('');
      l.push(
        `${doHarness.join(', ')}: estado de máquina do próprio harness ou do gate, não do kit — ` +
        'normalmente não há razão para publicar na wiki do cliente.',
      );
    }
    // AVISO, NÃO TRAVA (mesmo para os de estado de máquina acima): o acréscimo funciona igual
    // para todos — se o consultor insistir, publica. Nomeá-los não é a lista de exclusão que a
    // Decisão 19 rejeita porque o risco que ela mira é o artefato do KIT que cresce sem avisar;
    // estes quatro são nossos, e um aviso sobre eles não vira proibição.
    l.push(`  Para publicar algum deles, acrescente em \`${LISTA_DE_ACRESCIMOS}\`.`);
  }
  if (r.recusados.length) {
    l.push('');
    l.push('RECUSADOS — caminho absoluto ou escapando da árvore do projeto:');
    for (const c of r.recusados) l.push(`  ! ${c}`);
  }
  l.push('');
  l.push('Os arquivos `.order` e a convenção de nome de página do Azure DevOps NÃO são gerados:');
  l.push('está **fora de escopo** declarado, porque o formato não tem fonte neste repositório e');
  l.push('inventá-lo produziria algo plausível e errado. Publique a árvore com o processo do ADO');
  l.push('que a sua organização já usa.');
  return l.join('\n');
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const IO_REAL = {
  cwd: () => process.cwd(),
  lerArquivo: readFileSync,
  lerDiretorio: readdirSync,
  criarDiretorio: (c) => mkdirSync(c, { recursive: true }),
  copiar: copyFileSync,
  escrever: (c, t) => writeFileSync(c, t, 'utf8'),
};

/**
 * Ausência de DOCUMENTO — mesmo conjunto do resto do harness (`CODIGOS_DE_AUSENCIA_DE_DOCUMENTO`
 * do kit não é importado aqui só porque `montar` testa três códigos e não precisa do Set inteiro;
 * o conjunto É o mesmo, não uma segunda definição).
 */
function ehAusenciaDeDocumento(erro) {
  return !!erro && ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(erro.code);
}

export function montar(raiz, io) {
  const base = raiz || '.';
  let listaBruta = '';
  try {
    listaBruta = io.lerArquivo(join(base, LISTA_DE_ACRESCIMOS), 'utf8');
  } catch (erro) {
    if (!ehAusenciaDeDocumento(erro)) throw erro;
  }
  return arvore({
    presentesExplore: inventariar(join(base, RAIZ_EXPLORE), io.lerDiretorio),
    presentesSpec: inventariar(join(base, RAIZ_SPEC), io.lerDiretorio),
    acrescimos: lerAcrescimos(listaBruta),
  });
}

/**
 * Copia SÓ o que `montar` incluiu — nunca anda o disco por conta própria. Um `copiar` que
 * varresse diretório desfaria a lista de inclusão que é o ponto inteiro da Decisão 19: bastaria
 * um artefato de máquina estar fisicamente sob `outputs/` para ele reaparecer na saída.
 */
export function publicar(raiz, saida, io) {
  const r = montar(raiz, io);
  for (const rel of r.incluidos) {
    const destino = join(saida, rel);
    io.criarDiretorio(dirname(destino));
    io.copiar(join(raiz || '.', rel), destino);
  }
  return r;
}

function main(argv) {
  const i = argv.indexOf('--saida');
  const saida = i >= 0 ? argv[i + 1] : null;
  const raiz = IO_REAL.cwd();
  const r = saida ? publicar(raiz, saida, IO_REAL) : montar(raiz, IO_REAL);
  process.stdout.write(
    (argv.includes('--json') ? JSON.stringify(r, null, 2) : formatarTexto(r)) +
    (saida ? `\n\nCopiado para \`${saida}\`.` : '\n\nNada foi copiado — passe `--saida <dir>` para montar a árvore em disco.') + '\n',
  );
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
