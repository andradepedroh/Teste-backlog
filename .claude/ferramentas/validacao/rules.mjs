// Harness Elo v2 — Os trechos de rule que cada agente precisa, já na entrada. Núcleo puro; o disco chega injetado.
//
// Medido na calibração de 2026-10-16: o validador de rules técnicas estourou o limite de voltas nas
// três rodadas, e o de segurança em uma, porque cada leitura de rule custava duas voltas (Grep pelo
// título, Read a partir dele) e cada volta reenvia o contexto inteiro. Retomar o agente para ele
// terminar custou mais ~123 mil tokens. O recorte por título é trabalho de código: o script o faz uma
// vez e o agente recebe pronto.
//
// Caminhos por extenso, e não montados com `join`: a tabela `REESCRITAS` do `gerar-kiro.mjs` só
// reconhece o caminho inteiro, e é ela que os troca pelos da versão Kiro.

const RULE_SEGURANCA = '.claude/rules/harness/security.md';
const VETORES = '.claude/references/seguranca/vetores.md';
const RULE_FRONTEND = '.claude/rules/harness/frontend.md';
const PASTA_RULES_DO_PROJETO = '.claude/rules';

export const LIMITE_TRECHOS = 14_000;

/**
 * As rules do PROJETO na pasta dele. No Kiro essa pasta (`.kiro/steering/`) é dividida com o
 * maquinário — `harness-security.md`, `harness-frontend.md`, `harness-fase.md` —, então o prefixo
 * `harness-` sai: rule do harness não é rule do projeto. No Claude Code e no Cursor o maquinário
 * mora numa subpasta e o filtro não muda nada.
 */
const rulesDoProjeto = (listar) => listar(PASTA_RULES_DO_PROJETO)
  .filter((n) => /\.mdc?$/i.test(n) && !/^harness-/i.test(n));

const CAMADAS_DE_SEGURANCA = /^Camada [ABCEFG] —/;
const SECOES_DE_FRONTEND = /^(MUST NOT \(lista compacta\)|Anti-patterns|Erros \(`AppError`\)|Server vs Client)/;
const SECOES_DE_RULE_DO_PROJETO = /MUST NOT|Anti-?patterns|Proibid/i;

/** Arquivo de tela ou de JavaScript/TypeScript — o que a rule de frontend rege. */
export const ehDeFrontend = (caminho) => /\.(m?[jt]sx?|cjs|css|html|mdx)$/i.test(String(caminho));

/**
 * As seções do markdown cujo título casa com `filtro`. Cada seção vai do título até o próximo título
 * de nível igual ou maior — as subseções vão junto. O frontmatter fica de fora, e `#` dentro de bloco
 * de código não é título (a `security.md` tem `### [SEC-NNN]` num exemplo).
 */
export function secoes(texto, filtro) {
  const linhas = String(texto || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').split(/\r?\n/);
  const saida = [];
  let nivelAberto = 0;
  let cerca = false;
  for (const linha of linhas) {
    if (/^\s*(```|~~~)/.test(linha)) cerca = !cerca;
    const m = cerca ? null : /^(#{1,6})\s+(.*)$/.exec(linha);
    if (m) {
      const nivel = m[1].length;
      if (nivelAberto && nivel <= nivelAberto) nivelAberto = 0;
      if (!nivelAberto && filtro.test(m[2].trim())) nivelAberto = nivel;
    }
    if (nivelAberto) saida.push(linha);
  }
  return saida.join('\n').trim();
}

/** Junta os blocos com a origem de cada um e corta no limite, dizendo que cortou. */
function montar(blocos, limite) {
  let texto = blocos.filter((b) => b.texto).map((b) => `<!-- de ${b.origem} -->\n${b.texto}`).join('\n\n');
  if (texto.length > limite) texto = `${texto.slice(0, limite)}\n\n(trecho cortado no limite — o resto está na rule citada acima)`;
  return texto;
}

/**
 * A rule de frontend Next.js do harness está em vigor neste projeto? Duas regras da varredura
 * (`fetch-na-tela`, `formato-no-jsx`) só se sustentam com ela. Em vigor quando a rule do harness
 * existe E nenhuma rule de frontend do projeto (raiz de `.claude/rules/`, nome com "frontend") a
 * contradiz — rule de projeto tem precedência, e uma rule de frontend que não fala de Next.js é de
 * outra stack (Angular, Vue…). É heurística de propósito simples; quem sabe mais passa
 * `--regras-frontend sim|nao` ao `validar.mjs`.
 */
export function regrasFrontendNextEmVigor({ ler, listar }) {
  if (!String(ler(RULE_FRONTEND) || '').trim()) return false;
  const doProjeto = rulesDoProjeto(listar).filter((n) => /frontend/i.test(n));
  return doProjeto.every((n) => /\bnext(\.js)?\b/i.test(String(ler(`${PASTA_RULES_DO_PROJETO}/${n}`) || '')));
}

/**
 * Os trechos que valem para um agente.
 *
 * @param {{dimensoes: string[], arquivos: string[], ler: (caminho: string) => string,
 *          listar: (pasta: string) => string[], limite?: number}} entrada
 *   `dimensoes` — as do agente (um validador tem uma; o corretor, as dos itens do grupo);
 *   `ler` devolve '' para arquivo ausente; `listar` devolve os nomes de arquivo da pasta, ou [].
 */
export function trechosDeRules({ dimensoes, arquivos, ler, listar, limite = LIMITE_TRECHOS }) {
  const blocos = [];
  if (dimensoes.includes('seguranca')) {
    blocos.push({ origem: VETORES, texto: String(ler(VETORES) || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim() });
    blocos.push({ origem: RULE_SEGURANCA, texto: secoes(ler(RULE_SEGURANCA), CAMADAS_DE_SEGURANCA) });
  }
  if (dimensoes.includes('rules-tecnicas')) {
    if (arquivos.some(ehDeFrontend)) blocos.push({ origem: RULE_FRONTEND, texto: secoes(ler(RULE_FRONTEND), SECOES_DE_FRONTEND) });
    // `.md` no Claude Code, `.mdc` na saída Cursor: as rules do projeto têm a extensão do ambiente.
    for (const nome of rulesDoProjeto(listar).sort()) {
      const caminho = `${PASTA_RULES_DO_PROJETO}/${nome}`;
      blocos.push({ origem: caminho, texto: secoes(ler(caminho), SECOES_DE_RULE_DO_PROJETO) });
    }
  }
  return montar(blocos, limite);
}
