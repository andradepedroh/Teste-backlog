// Harness Elo v2 — Ponto de entrada único do PostToolUse. Núcleo puro + casca de I/O.
//
// Espelha o pretooluse, com uma diferença de contrato: aqui a ação JÁ ACONTECEU. Negar não
// faz sentido — o arquivo já foi escrito, a skill já rodou. Por isso todo verificador deste
// registro é informativo, e `despachar` nunca devolve deny.

import { relativizarComRecuo } from './kit.mjs';
import { avaliar as gramaticaAvaliar } from './gramatica.mjs';
import { avaliar as syncLogAvaliar } from './sync-log.mjs';

export const QUALQUER = '*';

/**
 * Gatilhos de escrita: lista única. Duas listas divergiriam em silêncio — e o `pretooluse.mjs`
 * tem uma constante homônima com o mesmo conteúdo, porque "que tool escreve arquivo?" é a mesma
 * pergunta nos dois eventos.
 */
const GATILHOS_DE_ESCRITA = ['Write', 'Edit', 'NotebookEdit'];

/**
 * Monta a tabela sobre um conjunto de operações de I/O — injetável para teste.
 *
 * Este arquivo tinha `REGISTRO = []` literal e ganha aqui, junto com o primeiro verificador do
 * PostToolUse, o desenho que o `pretooluse.mjs` recebeu na rodada B. O motivo é o de lá, e não é
 * simetria estética: sem ponto de injeção, testar o wiring exigiria `process.chdir`, e por isso
 * ninguém testava — mutar a entrada da tabela para no-op deixava a suíte inteira verde.
 *
 * Campos de cada entrada, iguais aos do irmão: `nome` para mensagem e log; `gatilhos` com os nomes
 * de tool que ativam; `bloqueia` define a postura de falha; `executar(payload)` devolve `null` para
 * calar ou `{aviso}` para falar. Aqui `bloqueia` é sempre `false` — no PostToolUse a ação já
 * ocorreu, e negar não é resposta possível.
 */
export function criarRegistro(io) {
  return [
    {
      nome: 'gramatica',
      gatilhos: GATILHOS_DE_ESCRITA,
      bloqueia: false,
      executar: (payload) => gramaticaAvaliar(payload, io),
    },
    // DEPOIS DO `gramatica`, e a ordem é dado: o `gramatica` fala do arquivo que ACABOU de ser
    // escrito — o defeito está no que está na tela —, e o `sync-log` fala do que ainda falta fazer.
    // Inverter põe a pendência antes do defeito.
    {
      nome: 'sync-log',
      gatilhos: GATILHOS_DE_ESCRITA,
      bloqueia: false,
      executar: (payload) => syncLogAvaliar(payload, io),
    },
  ];
}

export function casaGatilho(verificador, toolName) {
  const g = (verificador && verificador.gatilhos) || [];
  const t = String(toolName || '');
  return g.includes(QUALQUER) || g.includes(t);
}

/**
 * Roda os verificadores que casam o gatilho. Nunca nega: no PostToolUse a ação já ocorreu.
 * Verificador que lança é registrado em `falhas` e a execução segue.
 * O que os verificadores produzem são MENSAGENS, devolvidas em `avisos` para o agente ler.
 */
export function despachar(payload, registro) {
  const p = payload || {};
  const tool = String(p.tool_name || '');
  const falhas = [];
  const avisos = [];

  for (const v of registro || []) {
    if (!casaGatilho(v, tool)) continue;
    try {
      const r = v.executar(p);
      if (r && r.aviso) avisos.push({ nome: v.nome, aviso: r.aviso });
    } catch (erro) {
      falhas.push({ nome: v.nome, erro: (erro && erro.message) || String(erro) });
    }
  }

  return { acao: 'allow', motivo: null, avisos, falhas };
}

/** O JSON de contexto adicional que o Claude Code aceita no PostToolUse. */
export function emitirAviso(texto) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: texto },
  });
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * As três operações de disco de que o registro precisa. É a única coisa neste arquivo que toca o
 * sistema de arquivos; tudo acima do separador é puro e testável sem `process.chdir`.
 *
 * São TRÊS, e não duas, por causa do `relativizar`. A resolução de caminho depende do sistema de
 * arquivos, então ela é I/O — e a política é a MESMA do `pretooluse.mjs`, chamada pela mesma
 * função: `relativizarComRecuo`, no kit.mjs, identidade primeiro e texto como recuo. Se este
 * arquivo chamasse o `relativizar` textual do kit, os dois despachantes passariam a responder
 * DIFERENTE sobre o mesmo `file_path` — que é a família de aliases do Windows que nenhuma
 * canonização por string fechou em três tentativas. Não é "duas cascas escritas com cuidado":
 * é uma função só, com dois chamadores.
 *
 * Exportada para que os testes exercitem o objeto que o `main()` de fato usa — e não só o dublê.
 */
export const IO_REAL = {
  cwd: () => process.cwd(),
  relativizar: (raiz, bruto) => relativizarComRecuo(raiz, bruto),
  lerArquivo: readFileSync,
  // A QUARTA, e entrou com o `sync-log`: a regra de recência dele compara a coluna `Data/Hora` da
  // Seção A com o `mtime` do artefato escrito. Sem ela não há o que comparar, e o verificador
  // avisaria SEMPRE — inclusive quem acabou de registrar direito.
  statear: statSync,
};

/**
 * A tabela que o `main()` usa. Mesma forma que `criarRegistro` sempre devolve, então `despachar`
 * e `main()` não sabem que a casca foi extraída.
 */
export const REGISTRO = criarRegistro(IO_REAL);

/**
 * Interpreta o conteúdo bruto do stdin, distinguindo os dois casos que a restrição global do
 * projeto exige separar (fixada em `680f100` e `de3f5e1`): ausência devolve vazio, qualquer
 * outro erro relança/sinaliza. Espelha o `pretooluse.mjs`, mas aqui a ação JÁ OCORREU — não há
 * como negar, então o caso "presente e ilegível" vira AVISO, não deny. Silêncio ali seria a
 * mesma omissão que negar tudo seria no pretooluse.
 *
 * - conteúdo vazio (ou só espaço)  → 'allow': nada a decidir.
 * - conteúdo presente e ILEGÍVEL   → 'aviso': existe algo, mas não foi possível entendê-lo; a
 *                                    verificação de pós-execução não rodou e isso é sinalizado.
 * - conteúdo presente e válido     → 'prosseguir', com o payload já parseado.
 *
 * Puro: não lê disco, não escreve em stdout.
 */
export function interpretarEntrada(bruto) {
  const texto = String(bruto || '').trim();
  if (!texto) return { acao: 'allow', payload: null, aviso: null };

  try {
    const payload = JSON.parse(texto);
    return { acao: 'prosseguir', payload, aviso: null };
  } catch (erro) {
    const msg = (erro && erro.message) || String(erro);
    return {
      acao: 'aviso',
      payload: null,
      aviso: `O payload recebido pelo PostToolUse não é JSON válido; a verificação de pós-execução não rodou.\n\nErro: ${msg}`,
    };
  }
}

function main() {
  let bruto = '';
  try { bruto = readFileSync(0, 'utf8'); } catch { return 0; }

  const entrada = interpretarEntrada(bruto);
  if (entrada.acao === 'allow') return 0;
  if (entrada.acao === 'aviso') {
    try { process.stdout.write(emitirAviso(entrada.aviso)); } catch { /* noop */ }
    return 0;
  }

  const r = despachar(entrada.payload, REGISTRO);
  if (r.avisos.length) {
    const texto = r.avisos.map((a) => `[${a.nome}] ${a.aviso}`).join('\n');
    try { process.stdout.write(emitirAviso(texto)); } catch { /* noop */ }
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main();
}
