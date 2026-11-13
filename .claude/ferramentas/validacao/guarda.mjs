// Harness Elo v2 — Ninguém mexe na régua. Núcleo puro, sem I/O.
//
// O validador lê e escreve só o próprio resultado; o corretor muda código, mas não a especificação
// nem o maquinário. A defesa não é pedir — é conferir depois, pelo que mudou no disco: a rodada que
// tocou o que não devia é recusada e o ciclo para com a lista dos arquivos.

import { classificar } from './roteador.mjs';

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '');

/**
 * Quantos arquivos novos (fora de teste) um grupo de correção pode criar. Era 3; subiu para 5 na
 * revisão de 2026-10-21 (item 13.7): a correção que a própria varredura pede para `fetch-na-tela` e
 * `formato-no-jsx` é service + paths + hook + query-keys + mapper — cinco arquivos —, e com 3 a guarda
 * recusava a rodada que fazia exatamente o que a regra manda. Acima de 5 continua sendo refatoração.
 */
export const NOVOS_POR_GRUPO = 5;

/**
 * Manifesto e lock de dependências. O corretor NUNCA os muda, nem quando o arquivo é da entrega ou do
 * grupo: dependência nova é decisão humana (supply chain, licença, custo de manutenção). O item que
 * exige uma volta como "não corrigido: exige dependência", que o relatório leva a uma pessoa.
 */
export const DEPENDENCIAS = /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|yarn\.lock|bun\.lockb?|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|gradle\.lockfile|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Pipfile(\.lock)?|uv\.lock|go\.mod|go\.sum|Cargo\.(toml|lock)|Gemfile(\.lock)?|composer\.(json|lock)|[^/]*\.csproj|packages\.lock\.json|Directory\.Packages\.props)$/i;

const dentro = (p, pasta) => !!pasta && (p === pasta || p.startsWith(`${pasta}/`));

/**
 * @param {{mudados: string[], fase: 'validar'|'corrigir', pastaTrabalho?: string,
 *          escopo?: {arquivos: string[]}, novos?: string[]}} entrada — caminhos relativos à pasta do
 *   código (`--repo`); `pastaTrabalho` também, quando mora no mesmo repositório git (pode começar com
 *   `../`, se o `--repo` é uma subpasta).
 *   `escopo` — os arquivos que o grupo de correção pode mudar. Com ele, o corretor só muda esses
 *   arquivos, testes e até `NOVOS_POR_GRUPO` arquivos novos (`novos` = os que não existiam antes do
 *   grupo). Medido na recalibração de 2026-10-16: sem trava, o corretor refez o componente em uns dez
 *   arquivos, e as rodadas seguintes passaram a validar código que ninguém pediu.
 *   Escopo VAZIO não é "qualquer arquivo" (item 13.2, 2026-10-21): antes, o grupo sem arquivo — um
 *   comando que falhou, um NAO_CUMPRE sem evidência — deixava o corretor mexer em qualquer arquivo do
 *   código. Agora o `validar.mjs` passa para esse grupo os arquivos da entrega; e um escopo vazio que
 *   chegue aqui assim mesmo só deixa mudar testes e arquivos novos.
 * @returns {{arquivo: string, motivo: string}[]}
 */
export function violacoes({ mudados, fase, pastaTrabalho, escopo = null, novos = [] }) {
  const trabalho = pastaTrabalho ? norm(pastaTrabalho).replace(/\/$/, '') : '';
  const saida = [];
  const doGrupo = new Set(((escopo && escopo.arquivos) || []).map(norm));
  const novosSet = new Set(novos.map(norm));
  const vistos = new Set();
  let novosFora = 0;
  for (const bruto of mudados) {
    // `harness:` e `tasks:` são a régua do harness fotografada fora do repositório do código (ver
    // `fotografia` no `validar.mjs`): a pasta de trabalho já ficou de fora, então mudança ali é sempre
    // violação. Com harness e código no mesmo repositório, o mesmo arquivo chega pelos dois caminhos.
    const regua = /^(harness|tasks):/.test(String(bruto));
    const p = norm(String(bruto).replace(/^(harness|tasks):/, ''));
    if (vistos.has(p)) continue;
    vistos.add(p);
    if (!regua && dentro(p, trabalho)) continue;
    if (regua && fase === 'corrigir' && !/(^|\/)tasks\.json$|^outputs\/spec\/|^\.claude\//.test(p)) {
      saida.push({ arquivo: p, motivo: 'é especificação ou maquinário do harness; o corretor não a altera' });
      continue;
    }
    if (fase === 'validar') {
      saida.push({ arquivo: p, motivo: 'um validador só lê; nenhum arquivo pode mudar durante a validação' });
    } else if (/(^|\/)tasks\.json$/.test(p)) {
      saida.push({ arquivo: p, motivo: 'o tasks.json é a especificação; o corretor não a altera' });
    } else if (/^outputs\/spec\//.test(p)) {
      saida.push({ arquivo: p, motivo: 'outputs/spec/ é especificação e auditoria; o corretor não a altera' });
    } else if (/^\.claude\//.test(p)) {
      saida.push({ arquivo: p, motivo: '.claude/ é o maquinário do harness, incluindo os próprios validadores' });
    } else if (DEPENDENCIAS.test(p)) {
      saida.push({ arquivo: p, motivo: 'manifesto ou lock de dependências: dependência nova é decisão humana — o corretor registra "não corrigido: exige dependência"' });
    } else if (escopo && !doGrupo.has(p) && classificar(p) !== 'teste') {
      if (!novosSet.has(p)) {
        saida.push({ arquivo: p, motivo: 'fora do escopo do grupo: o corretor muda só os arquivos dos itens, os testes e arquivos novos' });
      } else if (++novosFora > NOVOS_POR_GRUPO) {
        saida.push({ arquivo: p, motivo: `mais de ${NOVOS_POR_GRUPO} arquivos novos num grupo: isso é refatoração, não correção` });
      }
    }
  }
  return saida;
}

/**
 * Fotografia → arquivos que mudaram. A fotografia é `{caminho: hash}` dos arquivos que o git vê como
 * alterados ou novos; o que não está nela é igual ao commit. Entrou, saiu ou mudou de hash = mudou.
 */
export function mudadosEntre(antes, depois) {
  const todos = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  return [...todos].filter((p) => antes[p] !== depois[p]).sort();
}
