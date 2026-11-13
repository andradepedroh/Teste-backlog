// Harness Elo v2 — Gerador da versão Cursor. Núcleo puro + casca de I/O, no molde do gerar-kiro.mjs.
//
// EXECUTÁVEL DE MÃO (Decisão 20), do lado de quem mantém o template — e do pipeline do Azure
// DevOps que publica o zip do Cursor a cada commit no main. Produz uma pasta autocontida, que o
// consultor abre direto no Cursor, a partir deste repositório. A saída NUNCA é editada: quem
// precisa mudá-la muda a tabela, um remendo ou um conversor aqui, e gera de novo.
// `harness.json.geradoDe` na saída é a prova.
//
// CONTRATO DE CLI (um pipeline depende dele — não mude sem mudar o pipeline junto):
//   node .claude/ferramentas/gerar-cursor.mjs --saida <dir> [--verificar] [--json]
// Sai com 0 só se a geração passou e, com `--verificar`, só se a suíte da SAÍDA ficou verde.
//
// O QUE O CURSOR LÊ (conferido na documentação do Cursor em 2026-10-16):
//   - `AGENTS.md` na raiz, markdown puro;
//   - rules em `.cursor/rules/**/*.mdc`, com frontmatter `description`, `globs`, `alwaysApply`;
//   - Agent Skills em `.cursor/skills/<nome>/SKILL.md` (`name` igual à pasta, `description`);
//   - subagentes em `.cursor/agents/*.md` (`name`, `description`, `model`, `readonly`, `is_background`);
//   - hooks em `.cursor/hooks.json` (`version: 1`), rodados da raiz do projeto, com os eventos
//     `sessionStart` (devolve `additional_context`) e `beforeShellExecution` (devolve `permission`),
//     entre outros.
//
// O MODELO DE INJEÇÃO DA FASE: o Cursor tem `sessionStart` com `additional_context`, então a fase
// chega como no Claude Code — o `estado.mjs` roda por um adaptador (`cursor-sessionstart.mjs`) e
// injeta a rule da fase detectada. As rules de fase ficam com `alwaysApply: false` e um `globs` que
// só casa com o próprio arquivo (o equivalente do `paths:` da fonte): não carregam sozinhas. A rule
// `harness-fase.mdc`, sempre aplicada e curta, é o recuo para quando o hook não rodou.

/**
 * Tabela de reescrita de caminhos, aplicada a TODO texto copiado. A ORDEM É DADO: do mais
 * específico para o mais genérico. As rules do harness mudam de extensão (`.md` → `.mdc`), porque
 * o Cursor ignora `.md` em `.cursor/rules/`; o resto de `.claude/` vira `.cursor/` pela linha final.
 */
export const REESCRITAS = [
  [/\.claude\/rules\/harness\/(security|explore|plan|deliver|frontend)\.md/g, '.cursor/rules/harness/$1.mdc'],
  // `.claude/settings.json` vira o `.cursor/hooks.json` montado por `converterSettings` — as
  // referências em PROSA (README, MANUTENCAO, um teste que cita o caminho) seguem junto.
  ['.claude/settings.json', '.cursor/hooks.json'],
  [/\bCLAUDE\.md\b/g, 'AGENTS.md'],
  // O mesmo nome dentro de um literal de regex escapado (`` /`CLAUDE\.md` está.../ ``), que a linha
  // anterior não alcança (mesma razão da linha irmã no gerar-kiro.mjs).
  [/CLAUDE\\\.md/g, 'AGENTS\\.md'],
  [/(['"`])\.CLAUDE\1/g, '$1.CURSOR$1'],
  // A MAIS GENÉRICA DE TODAS — o que sobrar: `.claude/`, `'.claude'` como token de `join`, dentro de
  // regex escapada, colado a barra invertida de caminho Windows ou solto em prosa. `.claude-plugin`
  // (nome do upstream) continua de fora.
  [/\.claude(?!-plugin)/g, '.cursor'],
];

export function reescrever(texto) {
  let t = String(texto);
  for (const [de, para] of REESCRITAS) {
    t = typeof de === 'string' ? t.split(de).join(para) : t.replace(de, para);
  }
  return t;
}

/**
 * O `.claude` que a tabela não alcançou. Mesmas exceções do gerar-kiro.mjs: `.claude-plugin` é nome
 * do upstream, e a linha que cita um gerador ou o empacotador cita a FONTE de propósito.
 */
export function sobras(texto) {
  const out = [];
  for (const linha of String(texto).split(/\r?\n/)) {
    if (/gerar-(cursor|kiro)\.mjs/.test(linha)) continue;
    if (/empacotar\.mjs/.test(linha)) continue;
    // A linha de EXCLUSOES do MANUTENCAO, que `converterManutencao` restaura para o texto da fonte.
    if (/só faz sentido no Claude Code/.test(linha)) continue;
    out.push(...(linha.match(/(['"`]\.claude['"`])|(\.claude(?!-plugin)(?:\/[^\s'"`)\]]*)?)/g) || []));
  }
  return out;
}

/** Prefixos (terminados em `/`) e caminhos exatos que não vão para a saída. */
export const EXCLUSOES = [
  '.git/', '.superpowers/', '.claude/worktrees/', 'node_modules/', 'docs/', '.azuredevops/',
  '.harness-template',
  // Uma pasta do Cursor na fonte seria misturada à gerada — e a raiz de `.cursor/rules/` é zona
  // MUTÁVEL do projeto, não maquinário. Nada da fonte entra lá.
  '.cursor/',
  '.claude/hooks/wiring.test.mjs',              // lê o settings.json do Claude Code; a saída traz o cursor-wiring.test.mjs
  '.claude/ferramentas/gerar-cursor.mjs',       // um clone Cursor não gera nada
  '.claude/ferramentas/gerar-cursor.test.mjs',
  '.claude/ferramentas/gerar-kiro.mjs',
  '.claude/ferramentas/gerar-kiro.test.mjs',
  // exige CLAUDE.md/settings.json que a saída não tem; o zip do Cursor é feito pelo pipeline.
  '.claude/ferramentas/empacotar.mjs',
  '.claude/ferramentas/empacotar.test.mjs',
];

// O gerador anda o disco, não o índice do git (mesma razão do gerar-kiro.mjs).
export const SEGMENTOS_EXCLUIDOS = ['__pycache__'];
export const SUFIXOS_EXCLUIDOS = ['.pyc'];

export function excluido(rel) {
  const r = String(rel).replace(/\\/g, '/');
  if (EXCLUSOES.some((e) => (e.endsWith('/') ? r.startsWith(e) : r === e))) return true;
  const partes = r.split('/');
  if (partes.some((p) => SEGMENTOS_EXCLUIDOS.includes(p))) return true;
  const nome = partes[partes.length - 1];
  return SUFIXOS_EXCLUIDOS.some((suf) => nome.endsWith(suf));
}

/**
 * Remendos: literal exato → substituto, por arquivo, aplicados ANTES da tabela e escritos no
 * vocabulário da FONTE (a tabela reescreve o resultado). Remendo que não casa é ERRO, não aviso.
 */
export const REMENDOS = [
  {
    // Caminho montado em tokens separados: a linha genérica troca `.claude` por `.cursor`, mas a
    // extensão `.md` → `.mdc` só a linha das rules faz, e ela não vê tokens soltos.
    arquivo: '.claude/hooks/gramatica.test.mjs',
    de: "join(RAIZ, '.claude', 'rules', 'harness', 'explore.md')",
    para: "join(RAIZ, '.claude', 'rules', 'harness', 'explore.mdc')",
  },
  {
    arquivo: '.claude/hooks/sync-log.test.mjs',
    de: "const RULE_PLAN = juntar(pastaDe(urlPara(import.meta.url)), '..', 'rules', 'harness', 'plan.md');",
    para: "const RULE_PLAN = juntar(pastaDe(urlPara(import.meta.url)), '..', 'rules', 'harness', 'plan.mdc');",
  },
  {
    arquivo: '.claude/hooks/zonas.test.mjs',
    de: "readFileSync(join(RAIZ, '.claude', 'rules', 'harness', 'plan.md'), 'utf8');",
    para: "readFileSync(join(RAIZ, '.claude', 'rules', 'harness', 'plan.mdc'), 'utf8');",
  },
  {
    // `ehZonaImutavel` é insensível a caixa — fixtures de caixa trocada, que a tabela deixa de
    // propósito fora (mesma família dos remendos do gerar-kiro.mjs).
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "test('ehZonaImutavel é insensível a caixa no diretório — .CLAUDE/hooks/kit.mjs', () => {\n  assert.equal(ehZonaImutavel('.CLAUDE/hooks/kit.mjs'), true);\n});",
    para: "test('ehZonaImutavel é insensível a caixa no diretório — .CURSOR/hooks/kit.mjs', () => {\n  assert.equal(ehZonaImutavel('.CURSOR/hooks/kit.mjs'), true);\n});",
  },
  {
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "test('ehZonaImutavel é insensível a caixa em arquivo exato — claude.md', () => {\n  assert.equal(ehZonaImutavel('claude.md'), true);\n  assert.equal(ehZonaImutavel('Claude.MD'), true);\n});",
    para: "test('ehZonaImutavel é insensível a caixa em arquivo exato — agents.md', () => {\n  assert.equal(ehZonaImutavel('agents.md'), true);\n  assert.equal(ehZonaImutavel('Agents.MD'), true);\n});",
  },
  {
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "test('ehZonaImutavel casa o diretório sem barra final também com caixa trocada', () => {\n  assert.equal(ehZonaImutavel('.Claude/Hooks'), true);\n  assert.equal(ehZonaImutavel('.CLAUDE/SKILLS'), true);\n});",
    para: "test('ehZonaImutavel casa o diretório sem barra final também com caixa trocada', () => {\n  assert.equal(ehZonaImutavel('.Cursor/Hooks'), true);\n  assert.equal(ehZonaImutavel('.CURSOR/SKILLS'), true);\n});",
  },
  {
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/.CLAUDE/hooks/kit.mjs');\n  assert.equal(rel, '.CLAUDE/hooks/kit.mjs');",
    para: "const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/.CURSOR/hooks/kit.mjs');\n  assert.equal(rel, '.CURSOR/hooks/kit.mjs');",
  },
  {
    // O wiring na saída é o `.cursor/hooks.json`; o caminho em tokens separados não passa pela linha
    // do `settings.json` da tabela. A verificação continua de verdade, contra o arquivo do Cursor.
    arquivo: '.claude/ferramentas/ferramentas.test.mjs',
    de: "const bruto = readFileSync(join(RAIZ, '.claude', 'settings.json'), 'utf8');",
    para: "const bruto = readFileSync(join(RAIZ, '.claude', 'hooks.json'), 'utf8');",
  },
  {
    arquivo: '.claude/hooks/estado.test.mjs',
    de: "for (const f of ['explore', 'plan', 'deliver']) assert.match(RULE_DA_FASE[f], new RegExp(`${f}\\\\.md$`));",
    para: "for (const f of ['explore', 'plan', 'deliver']) assert.match(RULE_DA_FASE[f], new RegExp(`${f}\\\\.mdc$`));",
  },
  {
    // O lado do Cursor da mesma garantia: no lugar do `paths:` entre aspas do Claude Code, o `globs:`
    // sem aspas e o `alwaysApply` explícito que `converterRule` escreve.
    arquivo: '.claude/hooks/estado.test.mjs',
    de: "test('as rules de fase só carregam pela injeção: `paths:` entre aspas, apontando o próprio arquivo', () => {\n"
      + "  for (const f of ['explore', 'plan', 'deliver']) {\n"
      + "    const m = /^paths:\\s*\"([^\"]+)\"\\s*$/m.exec(frontmatter(RULE_DA_FASE[f]));\n"
      + "    assert.ok(m, `${f}: sem \\`paths:\\` entre aspas`);\n"
      + "    assert.equal(m[1], RULE_DA_FASE[f]);\n"
      + "  }\n"
      + "});\n"
      + "\n"
      + "test('a rule de frontend só carrega com arquivo de frontend; a de segurança carrega sempre', () => {\n"
      + "  // Desde a Decisão 73 esta rule toma o lugar do `frontend-default.mdc`, que não é mais materializado\n"
      + "  // no projeto. Então ela cobre as MESMAS extensões que ele cobria — derivadas do `globs:` dele, não\n"
      + "  // fixadas aqui. O `**/*.canvas.tsx` de lá já está dentro do `tsx`.\n"
      + "  const padrao = /^globs:\\s*\"([^\"]+)\"\\s*$/m.exec(frontmatter('.claude/skills/spec-tech-rules/templates/frontend-default.mdc'));\n"
      + "  assert.ok(padrao, 'o frontend-default.mdc da spec-tech-rules não tem mais `globs:`');\n"
      + "  const doPadrao = new Set(padrao[1].split(',').map((g) => /^\\*\\*\\/\\*\\.([a-z]+)$/.exec(g.trim())?.[1]).filter(Boolean));\n"
      + "  // Um glob só, com chaves, entre aspas — a forma documentada do Claude Code. A lista separada por\n"
      + "  // vírgula numa string única não é documentada, e nada garante que ele a parta.\n"
      + "  const fe = /^paths:\\s*\"([^\"]+)\"\\s*$/m.exec(frontmatter('.claude/rules/harness/frontend.md'));\n"
      + "  assert.ok(fe, 'frontend.md sem `paths:` entre aspas');\n"
      + "  const chaves = /^\\*\\*\\/\\*\\.\\{([a-z,]+)\\}$/.exec(fe[1]);\n"
      + "  assert.ok(chaves, `o paths: deixou de ser um glob só, com chaves: ${fe[1]}`);\n"
      + "  assert.deepEqual(new Set(chaves[1].split(',')), doPadrao);\n"
      + "  assert.ok(!/^paths:/m.test(frontmatter('.claude/rules/harness/security.md')), 'security.md não pode ter `paths:`');\n"
      + "});",
    para: "test('as rules de fase só carregam pela injeção: `globs:` apontando o próprio arquivo, `alwaysApply: false`', () => {\n"
      + "  for (const f of ['explore', 'plan', 'deliver']) {\n"
      + "    const fm = frontmatter(RULE_DA_FASE[f]);\n"
      + "    const m = /^globs:\\s*(\\S+)\\s*$/m.exec(fm);\n"
      + "    assert.ok(m, `${f}: sem \\`globs:\\``);\n"
      + "    assert.equal(m[1], RULE_DA_FASE[f]);\n"
      + "    assert.match(fm, /^alwaysApply: false$/m, `${f}: sem \\`alwaysApply: false\\``);\n"
      + "  }\n"
      + "});\n"
      + "\n"
      + "test('a rule de frontend só carrega com arquivo de frontend; a de segurança carrega sempre', () => {\n"
      + "  const padrao = /^globs:\\s*\"([^\"]+)\"\\s*$/m.exec(frontmatter('.claude/skills/spec-tech-rules/templates/frontend-default.mdc'));\n"
      + "  assert.ok(padrao, 'o frontend-default.mdc da spec-tech-rules não tem mais `globs:`');\n"
      + "  const doPadrao = new Set(padrao[1].split(',').map((g) => /^\\*\\*\\/\\*\\.([a-z]+)$/.exec(g.trim())?.[1]).filter(Boolean));\n"
      + "  const fm = frontmatter('.claude/rules/harness/frontend.md');\n"
      + "  const fe = /^globs:\\s*(.+)$/m.exec(fm);\n"
      + "  assert.ok(fe && fe[1].split(',').includes('**/*.tsx'), 'frontend sem `globs:` em lista expandida');\n"
      + "  assert.ok(!/[{}]/.test(fe[1]), 'o Cursor parte o `globs:` na vírgula: chave de glob não pode sobrar');\n"
      + "  // As mesmas extensões do `frontend-default.mdc`, que ela substitui desde a Decisão 73.\n"
      + "  assert.deepEqual(new Set(fe[1].split(',').map((g) => /^\\*\\*\\/\\*\\.([a-z]+)$/.exec(g.trim())?.[1])), doPadrao);\n"
      + "  assert.match(fm, /^alwaysApply: false$/m);\n"
      + "  const sec = frontmatter('.claude/rules/harness/security.md');\n"
      + "  assert.ok(!/^globs:/m.test(sec), 'a de segurança não pode ter `globs:`');\n"
      + "  assert.match(sec, /^alwaysApply: true$/m);\n"
      + "});",
  },
  {
    // A rule do Plan tem um terceiro endereço, o da saída Cursor — com a extensão `.mdc`, que a
    // alternância do original (`...plan|...harness-plan)\.md`) não admite.
    arquivo: '.claude/hooks/skills-prosa.test.mjs',
    de: "assert.match(t, /`(\\.claude\\/rules\\/harness\\/plan|\\.kiro\\/fases\\/harness-plan)\\.md`/);",
    para: "assert.match(t, /`\\.claude\\/rules\\/harness\\/plan\\.mdc`/);",
  },
  {
    // O comando de geração do Kiro no MANUTENCAO da saída cita de propósito o gerador na FONTE
    // (`converterManutencao` desfaz a reescrita ali). Sem este remendo, a CÓPIA deste teste teria o
    // literal reescrito para `.cursor/...` e ficaria vermelha contra o texto CERTO. O `+` parte
    // ".claude" em duas peças para o literal sobreviver à reescrita genérica.
    arquivo: '.claude/hooks/vendorizacao.test.mjs',
    de: "assert.match(secao, /node \\.claude\\/ferramentas\\/gerar-kiro\\.mjs --saida \\.\\.\\/harness-elo-v2-kiro --verificar/);",
    para: "// partido em duas peças para sobreviver à reescrita — o comando aponta para o gerador na FONTE\n"
      + "assert.ok(secao.includes('node ' + '.cla' + 'ude/ferramentas/gerar-kiro.mjs --saida ../harness-elo-v2-kiro --verificar'), 'o comando de geração não aponta para o gerador na FONTE');",
  },
];

export function aplicarRemendos(rel, texto) {
  let t = String(texto);
  for (const r of REMENDOS) {
    if (r.arquivo !== rel) continue;
    if (!t.includes(r.de)) {
      throw new Error(`remendo órfão em ${rel}: o literal não está mais na fonte —\n${r.de}`);
    }
    t = t.split(r.de).join(r.para);
  }
  return t;
}

const GERADO_POR = 'pelo .claude/ferramentas/gerar-cursor.mjs — não edite; edite a fonte e gere de novo';
const avisoHtml = (origem) => `<!-- gerado de ${origem} ${GERADO_POR} -->`;
const avisoYaml = (origem) => `# gerado de ${origem} ${GERADO_POR}`;
const avisoJs = (origem) => `// gerado de ${origem} ${GERADO_POR}`;

/** A ÚNICA frase do CLAUDE.md que afirma comportamento de hook. No Cursor ela continua verdadeira. */
export const FRASE_HOOK = /O `estado` detecta a fase no início da sessão e\s+injeta a rule correspondente — você não precisa perguntar em que fase estamos\./;
export const FRASE_CURSOR = 'O `estado` detecta a fase no início da sessão (hook `sessionStart` de `.cursor/hooks.json`) e\n' +
  'injeta a rule correspondente — você não precisa perguntar em que fase estamos. Se a sessão começou\n' +
  'sem o bloco "HARNESS ELO v2 — fase detectada", ver `.cursor/rules/harness/harness-fase.mdc`.';

export function converterClaudeMd(texto) {
  if (!FRASE_HOOK.test(texto)) throw new Error('CLAUDE.md: o marcador da frase do hook não está na fonte');
  return `${avisoHtml('CLAUDE.md')}\n\n${texto.replace(FRASE_HOOK, FRASE_CURSOR)}`;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** `a/{x,y}/*.{m,n}` → as quatro combinações. Chaves aninhadas não aparecem nas rules; não são tratadas. */
export function expandirChaves(glob) {
  const m = /\{([^{}]*)\}/.exec(glob);
  if (!m) return [glob];
  const antes = glob.slice(0, m.index);
  const depois = glob.slice(m.index + m[0].length);
  return m[1].split(',').flatMap((op) => expandirChaves(`${antes}${op.trim()}${depois}`));
}

/** Parte na vírgula que está FORA de chave — a de dentro é alternativa do glob, não separador. */
function partirLista(valor) {
  const out = [];
  let nivel = 0;
  let atual = '';
  for (const c of valor) {
    if (c === '{') nivel++;
    if (c === '}') nivel = Math.max(0, nivel - 1);
    if (c === ',' && nivel === 0) { out.push(atual); atual = ''; continue; }
    atual += c;
  }
  out.push(atual);
  return out.map((g) => g.trim()).filter(Boolean);
}

/**
 * Rule do harness → `.mdc` do Cursor. O `paths:` da fonte vira `globs:` (o Cursor não conhece
 * `paths`), SEM aspas: é o formato que o próprio Cursor grava, e o valor é lido como texto
 * separado por vírgula. Por isso as chaves do glob da fonte (um glob só, com alternativas entre
 * chaves — a forma documentada do Claude Code) são EXPANDIDAS em lista: deixadas como estão, o Cursor partiria o glob nas vírgulas
 * de dentro da chave. A lista sai sem espaço depois da vírgula. `alwaysApply` é explícito nas duas
 * pontas, para a rule nunca cair no tipo "o agente decide" por ausência de campo.
 */
export function converterRule(texto, origem, { alwaysApply = false } = {}) {
  const m = FRONTMATTER.exec(texto);
  if (!m) throw new Error(`${origem}: rule sem frontmatter`);
  const campos = [];
  for (const linha of m[1].split(/\r?\n/)) {
    const p = /^paths:\s*(.*)$/.exec(linha);
    if (p) {
      const globs = partirLista(p[1].trim().replace(/^"(.*)"$/, '$1')).flatMap(expandirChaves);
      campos.push(`globs: ${globs.join(',')}`);
    }
    else if (!/^(alwaysApply|globs):/.test(linha)) campos.push(linha);
  }
  if (alwaysApply && campos.some((c) => c.startsWith('globs:'))) {
    throw new Error(`${origem}: rule sempre aplicada não pode ter paths — o Cursor ignoraria o globs`);
  }
  const cabeca = ['---', avisoYaml(origem), ...campos, `alwaysApply: ${alwaysApply}`, '---'];
  return `${cabeca.join('\n')}\n${texto.slice(m[0].length)}`;
}

export function gerarHarnessFase() {
  return [
    '---',
    avisoYaml('(sem fonte — só existe na versão Cursor)'),
    'description: Como a fase do harness entra na sessão, e o que fazer se ela não entrou.',
    'alwaysApply: true',
    '---',
    '',
    '# A fase desta sessão',
    '',
    'O hook `sessionStart` (`.cursor/hooks.json`) detecta a fase pelos artefatos e injeta a rule dela no',
    'início da sessão — a mensagem começa com **HARNESS ELO v2 — fase detectada**. As rules de fase',
    'moram em `.cursor/rules/harness/` com `alwaysApply: false` e não carregam sozinhas: só uma vale',
    'por sessão.',
    '',
    '**Se o bloco não veio** (hooks desligados, agente em segundo plano, subagente), anexe a rule da',
    'fase com `@` na primeira mensagem:',
    '',
    '| Fase | Anexe |',
    '|---|---|',
    '| 🔍 Explore | `.cursor/rules/harness/explore.mdc` |',
    '| 📐 Plan | `.cursor/rules/harness/plan.mdc` |',
    '| 🚀 Deliver | `.cursor/rules/harness/deliver.mdc` |',
    '',
    'Não sabe a fase? Olhe `outputs/`: só `outputs/explore/` com conteúdo é Explore; escrita em',
    '`outputs/spec/` além do `sync-log.md` é Plan; `outputs/spec/em-andamento.md` é Deliver.',
    '',
    'Subagente não recebe o contexto do `sessionStart`. Quem lança um subagente que precise da rule',
    'da fase cita o arquivo dela no prompt.',
    '',
  ].join('\n');
}

// ———————————————————————————— hooks ————————————————————————————

/**
 * O que cada hook da fonte vira no Cursor. A chave é o evento do `settings.json` do Claude Code,
 * com o comando que ele roda; `converterSettings` recusa evento ou comando fora desta tabela — hook
 * novo na fonte derruba a geração até alguém decidir, aqui, o que ele é no Cursor.
 *
 * - `SessionStart` → `sessionStart`, pelo adaptador: mesmo `estado.mjs`, saída `additional_context`.
 * - `PreToolUse` → `beforeShellExecution`, pelo adaptador, SÓ para as travas de gatilho `Bash`
 *   (`escrita-bash`, `delivery-gate`): o payload do shell (`command`, `cwd`) é documentado pelo
 *   Cursor. As travas de gatilho `Write`/`Edit`/`Skill` (`zona-imutavel`, `congelamento`, `cadeia`,
 *   `fecho-explore`) ficam como biblioteca testada: o Cursor não documenta o `tool_input` da tool
 *   `Write`, e não tem tool de skill — uma trava ligada às cegas seria no-op silencioso.
 * - `PostToolUse` → nada. `gramatica` e `sync-log` são avisos; o `afterFileEdit` do Cursor não tem
 *   canal de volta para o agente, e o `postToolUse` cairia no mesmo `tool_input` não documentado.
 */
export const HOOKS = {
  SessionStart: { comando: 'node .claude/hooks/estado.mjs', cursor: { sessionStart: 'node .cursor/hooks/cursor-sessionstart.mjs' } },
  PreToolUse: { comando: 'node .claude/hooks/pretooluse.mjs', cursor: { beforeShellExecution: 'node .cursor/hooks/cursor-shell.mjs' } },
  PostToolUse: { comando: 'node .claude/hooks/posttooluse.mjs', cursor: {} },
};

export function converterSettings(texto) {
  const s = JSON.parse(texto);
  const hooks = {};
  for (const [evento, grupos] of Object.entries((s && s.hooks) || {})) {
    const h = HOOKS[evento];
    if (!h) throw new Error(`settings.json: evento ${evento} sem equivalente decidido no gerar-cursor.mjs (tabela HOOKS)`);
    for (const g of grupos) {
      for (const c of g.hooks || []) {
        if (c.command !== h.comando) throw new Error(`settings.json: comando "${c.command}" em ${evento} não é o da tabela HOOKS ("${h.comando}")`);
      }
    }
    for (const [ev, comando] of Object.entries(h.cursor)) hooks[ev] = [{ command: comando }];
  }
  return `${JSON.stringify({ version: 1, hooks }, null, 2)}\n`;
}

/** Adaptador do `sessionStart`: o `estado.mjs` intacto, só a forma da saída muda. */
export function gerarAdaptadorSessionStart() {
  return [
    avisoJs('(sem fonte — só existe na versão Cursor)'),
    '//',
    '// Adaptador do hook `sessionStart` do Cursor para o `estado.mjs`. O Claude Code espera',
    '// `hookSpecificOutput.additionalContext`; o Cursor espera `additional_context`. O resto — detectar',
    '// a fase, montar o contexto, ler a rule da fase — é o `estado.mjs`, sem cópia.',
    "import { pathToFileURL } from 'node:url';",
    "import { coletar, montarContexto } from './estado.mjs';",
    '',
    'export function emitirCursor(texto) {',
    '  return JSON.stringify({ additional_context: texto });',
    '}',
    '',
    'function main() {',
    '  try {',
    '    process.stdout.write(emitirCursor(montarContexto(coletar(process.cwd()))));',
    '  } catch (erro) {',
    '    // Informativo, como no Claude Code: sessão sem contexto é ruim, não fatal. Mas não silencia.',
    '    const msg = (erro && (erro.message || erro.code)) || String(erro);',
    "    try { process.stderr.write(`Harness Elo v2 — o contexto da sessão não pôde ser entregue; a sessão começa sem ele.\\nErro: ${msg}\\n`); } catch { /* sem stderr */ }",
    '  }',
    '  return 0;',
    '}',
    '',
    "if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {",
    '  process.exitCode = main();',
    '}',
    '',
  ].join('\n');
}

/** Adaptador do `beforeShellExecution`: a tabela do `pretooluse.mjs`, vista como tool `Bash`. */
export function gerarAdaptadorShell() {
  return [
    avisoJs('(sem fonte — só existe na versão Cursor)'),
    '//',
    '// Adaptador do hook `beforeShellExecution` do Cursor para a tabela do `pretooluse.mjs`. O Cursor',
    '// manda `{ command, cwd }`; a tabela espera o payload do Claude Code (`tool_name: "Bash"`,',
    '// `tool_input.command`). Só as travas de gatilho `Bash` casam — `escrita-bash` e `delivery-gate`.',
    '// A resposta volta no formato do Cursor: `permission` "allow" ou "deny", com a mensagem.',
    "import { readFileSync } from 'node:fs';",
    "import { pathToFileURL } from 'node:url';",
    "import { despachar, interpretarEntrada, REGISTRO } from './pretooluse.mjs';",
    '',
    'export function paraPayloadClaude(entrada) {',
    '  const e = entrada || {};',
    "  return { tool_name: 'Bash', tool_input: { command: String(e.command || '') }, cwd: e.cwd };",
    '}',
    '',
    'export function respostaCursor(veredito) {',
    "  if (veredito && veredito.acao === 'deny') {",
    "    return { permission: 'deny', user_message: veredito.motivo, agent_message: veredito.motivo };",
    '  }',
    "  return { permission: 'allow' };",
    '}',
    '',
    'export function decidir(bruto, registro = REGISTRO) {',
    '  const entrada = interpretarEntrada(bruto);',
    "  if (entrada.acao !== 'prosseguir') return respostaCursor(entrada);",
    '  return respostaCursor(despachar(paraPayloadClaude(entrada.payload), registro));',
    '}',
    '',
    'function main() {',
    "  let bruto = '';",
    "  try { bruto = readFileSync(0, 'utf8'); } catch { /* sem stdin: nada a decidir */ }",
    '  const r = decidir(bruto);',
    '  try {',
    '    process.stdout.write(JSON.stringify(r));',
    '    return 0;',
    '  } catch {',
    "    try { process.stderr.write(`${r.user_message || ''}\\n`); } catch { /* noop */ }",
    "    return r.permission === 'deny' ? 2 : 0;",
    '  }',
    '}',
    '',
    "if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {",
    '  process.exitCode = main();',
    '}',
    '',
  ].join('\n');
}

/**
 * O teste do wiring na SAÍDA — o lugar do `wiring.test.mjs`, que lê o `settings.json` do Claude
 * Code e por isso fica de fora. Roda na suíte da saída, então o `--verificar` o cobra.
 */
export function gerarTesteWiring() {
  return [
    avisoJs('(sem fonte — só existe na versão Cursor)'),
    "import { test } from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { readFileSync, existsSync } from 'node:fs';",
    "import { spawnSync } from 'node:child_process';",
    "import { join } from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "import { paraPayloadClaude, respostaCursor, decidir } from './cursor-shell.mjs';",
    "import { emitirCursor } from './cursor-sessionstart.mjs';",
    '',
    "const RAIZ = fileURLToPath(new URL('../../', import.meta.url));",
    "const HOOKS = JSON.parse(readFileSync(join(RAIZ, '.cursor', 'hooks.json'), 'utf8'));",
    '',
    "test('hooks.json: versão 1, e todo comando aponta para um adaptador que existe', () => {",
    '  assert.equal(HOOKS.version, 1);',
    "  assert.deepEqual(Object.keys(HOOKS.hooks).sort(), ['beforeShellExecution', 'sessionStart']);",
    '  for (const [evento, defs] of Object.entries(HOOKS.hooks)) {',
    '    for (const d of defs) {',
    '      const m = /^node (\\S+)$/.exec(d.command);',
    '      assert.ok(m, `${evento}: comando fora do formato "node <arquivo>"`);',
    '      assert.ok(existsSync(join(RAIZ, m[1])), `${evento}: ${m[1]} não existe`);',
    '    }',
    '  }',
    '});',
    '',
    "test('cursor-shell: o payload do Cursor vira tool Bash, e o veredito volta como permission', () => {",
    "  assert.deepEqual(paraPayloadClaude({ command: 'git push', cwd: '/p' }), { tool_name: 'Bash', tool_input: { command: 'git push' }, cwd: '/p' });",
    "  assert.deepEqual(respostaCursor({ acao: 'allow' }), { permission: 'allow' });",
    "  assert.deepEqual(respostaCursor({ acao: 'deny', motivo: 'm' }), { permission: 'deny', user_message: 'm', agent_message: 'm' });",
    "  assert.equal(decidir('').permission, 'allow', 'sem payload não há o que decidir');",
    "  assert.equal(decidir('{não é json').permission, 'deny', 'payload ilegível falha fechado');",
    '});',
    '',
    "test('cursor-shell: só as travas de gatilho Bash da tabela rodam', () => {",
    '  const visto = [];',
    "  const registro = [{ nome: 'x', gatilhos: ['Bash'], bloqueia: true, executar: (p) => { visto.push(p.tool_input.command); return { acao: 'deny', motivo: 'não' }; } },",
    "    { nome: 'y', gatilhos: ['Write'], bloqueia: true, executar: () => { throw new Error('não devia rodar'); } }];",
    "  assert.deepEqual(decidir(JSON.stringify({ command: 'rm x' }), registro), { permission: 'deny', user_message: 'não', agent_message: 'não' });",
    "  assert.deepEqual(visto, ['rm x']);",
    '});',
    '',
    "test('cursor-shell, de ponta a ponta: comando inócuo passa; apagar o maquinário é negado', () => {",
    "  const rodar = (command) => JSON.parse(spawnSync('node', [join('.cursor', 'hooks', 'cursor-shell.mjs')],",
    "    { cwd: RAIZ, input: JSON.stringify({ command, cwd: RAIZ }), encoding: 'utf8' }).stdout);",
    "  assert.equal(rodar('git status').permission, 'allow');",
    "  assert.equal(rodar('rm -rf .cursor/hooks').permission, 'deny');",
    '});',
    '',
    "test('cursor-sessionstart: a saída é additional_context com o contexto do estado.mjs', () => {",
    "  assert.equal(emitirCursor('t'), JSON.stringify({ additional_context: 't' }));",
    "  const r = spawnSync('node', [join('.cursor', 'hooks', 'cursor-sessionstart.mjs')], { cwd: RAIZ, input: '{}', encoding: 'utf8' });",
    '  assert.equal(r.status, 0);',
    '  assert.match(JSON.parse(r.stdout).additional_context, /HARNESS ELO v2/);',
    '});',
    '',
  ].join('\n');
}

// ———————————————————————————— os demais conversores ————————————————————————————

export const RUNTIME_CURSOR = {
  rotulo: 'Cursor',
  cli: 'cursor-agent',
  semCli: 'Se você usa só o editor do Cursor, isto é esperado e não é problema.',
};

export function gerarHarnessJson(fonte, sha) {
  return {
    nome: 'harness-elo-v2-cursor',
    versao: fonte.versao,
    kitVersao: fonte.kitVersao,
    geradoDe: sha,
    runtime: RUNTIME_CURSOR,
    zonaImutavel: [...new Set(fonte.zonaImutavel.map(reescrever))],
    // `.claude/rules/` e `.cursor/rules/` da fonte viram a MESMA pasta — uma entrada só.
    zonaMutavel: [...new Set(fonte.zonaMutavel.map(reescrever))],
  };
}

/**
 * Subagente do Claude Code → subagente do Cursor. O formato é o mesmo (markdown + frontmatter com
 * `name` e `description`); só o `model` muda — o Cursor aceita `inherit` ou um ID de modelo dele, e
 * apelidos do Claude Code (`sonnet`) não são IDs. Os campos que o Cursor não conhece (`tools`,
 * `omitClaudeMd`, `maxTurns`) ficam: ele os ignora, e o `validacao.test.mjs` da saída os cobra.
 */
export function converterAgente(texto, origem) {
  const m = FRONTMATTER.exec(texto);
  if (!m) throw new Error(`${origem}: agente sem frontmatter`);
  const campos = m[1].split(/\r?\n/).map((l) => (/^model:/.test(l) ? 'model: inherit' : l));
  return `---\n${campos.join('\n')}\n---\n${texto.slice(m[0].length)}`;
}

const LINHA_RUNTIME = '| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |';
const LINHA_RUNTIME_CURSOR = '| 1 | **Cursor** (editor ou `cursor-agent`) | runtime do agente — rules, skills, subagentes, hooks | sempre |';
const ABERTURA = 'Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.';

// A linha já chega REESCRITA ao conversor (`gerar()` roda `reescrever` antes — comentário lá).
const LINHA_ESTRUTURA_FASES = '| `.cursor/rules/harness/` | as cinco rules do método (zona imutável) |';
const LINHA_ESTRUTURA_FASES_CURSOR = '| `.cursor/rules/harness/` | as cinco rules do método, mais `harness-fase.mdc` (zona imutável); o resto de `.cursor/rules/` é do projeto (`spec-tech-rules`) |';

const SECAO_CURSOR = [
  '## Cursor — como abrir',
  '',
  'Abra esta pasta no Cursor. O `AGENTS.md`, a rule de segurança e a `harness-fase.mdc` carregam',
  'sozinhos; o hook `sessionStart` detecta a fase e injeta a rule dela. Se a primeira mensagem não',
  'trouxer o bloco **HARNESS ELO v2 — fase detectada**, ver `.cursor/rules/harness/harness-fase.mdc`.',
  '',
  'As skills do kit estão em `.cursor/skills/`, e os validadores do `validar.mjs` em `.cursor/agents/`.',
  'Na `spec-tech-rules`, escolha o ambiente **Cursor**.',
  '',
  '> **Travas parciais nesta versão.** Do `.cursor/hooks.json` rodam a detecção de fase e as duas',
  '> travas de comando de shell (`escrita-bash`, `delivery-gate`). As travas de escrita de arquivo e de',
  '> skill (zona imutável, congelamento, cadeia, fecho do Explore) estão em `.cursor/hooks/` como',
  '> biblioteca testada, sem evento que as dispare: ali elas são doutrina escrita, não fiscalizada.',
  '',
  'Este repositório é **gerado** do `harness-elo-v2` (`harness.json`, campo `geradoDe`). Não edite a',
  'zona imutável aqui: a próxima geração sobrescreve.',
  '',
].join('\n');

export function converterReadme(texto) {
  if (!texto.includes(LINHA_RUNTIME)) throw new Error('README.md: o marcador da linha do runtime não está na fonte');
  if (!texto.includes(ABERTURA)) throw new Error('README.md: o marcador do parágrafo de abertura não está na fonte');
  if (!texto.includes(LINHA_ESTRUTURA_FASES)) throw new Error('README.md: o marcador (já reescrito) da linha das rules de fase não está na fonte');
  const out = texto
    .split(LINHA_RUNTIME).join(LINHA_RUNTIME_CURSOR)
    .split(LINHA_ESTRUTURA_FASES).join(LINHA_ESTRUTURA_FASES_CURSOR)
    .split(ABERTURA).join(`Abrir no Cursor — ver a seção **Cursor — como abrir** abaixo.\n\n${SECAO_CURSOR.trimEnd()}`);
  return `${avisoHtml('README.md')}\n\n${out}`;
}

// O MANUTENCAO cita os geradores e o empacotador pelo caminho da FONTE; a reescrita genérica os
// manda para `.cursor/ferramentas/`, onde a saída não os tem (EXCLUSOES). Volta para a fonte.
const RESTAURAR_FONTE = ['gerar-cursor.mjs', 'gerar-kiro.mjs', 'empacotar.mjs']
  .map((f) => [`.cursor/ferramentas/${f}`, `.claude/ferramentas/${f}`]);
const OBRIGATORIOS = ['.cursor/ferramentas/gerar-cursor.mjs', '.cursor/ferramentas/gerar-kiro.mjs'];

// A linha de EXCLUSOES do MANUTENCAO nomeia `.claude/settings.json` como módulo "só do Claude Code";
// a tabela o trocou por `.cursor/hooks.json`, que a saída TEM. Restaura o texto da fonte ali.
const EXCLUSOES_SETTINGS_REESCRITO = 'módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.cursor/hooks.json`, `empacotar.mjs`, `empacotar.test.mjs`)';
const EXCLUSOES_SETTINGS_FONTE = 'módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.claude/settings.json`, `empacotar.mjs`, `empacotar.test.mjs`)';

const SECAO_ZIP_TITULO = '## Gerar e publicar o zip';
const SECAO_ZIP_AVISO = '> **Edição Claude Code.** O empacotador (`empacotar.mjs`) não acompanha a saída Cursor — este procedimento vale para o repositório fonte; o zip do Cursor é publicado pelo pipeline a partir do `gerar-cursor.mjs`.';

export function converterManutencao(texto) {
  for (const o of OBRIGATORIOS) {
    if (!texto.includes(o)) throw new Error(`MANUTENCAO.md: nenhum ${o} (comando de geração, já reescrito) na fonte`);
  }
  if (!texto.includes(EXCLUSOES_SETTINGS_REESCRITO)) throw new Error('MANUTENCAO.md: a linha de EXCLUSOES (settings.json, já reescrita) não está na fonte');
  if (!texto.includes(SECAO_ZIP_TITULO)) throw new Error(`MANUTENCAO.md: nenhum marcador "${SECAO_ZIP_TITULO}" na fonte`);
  let corpo = texto;
  for (const [de, para] of RESTAURAR_FONTE) corpo = corpo.split(de).join(para);
  corpo = corpo
    .split(EXCLUSOES_SETTINGS_REESCRITO).join(EXCLUSOES_SETTINGS_FONTE)
    .split(SECAO_ZIP_TITULO).join(`${SECAO_ZIP_TITULO}\n\n${SECAO_ZIP_AVISO}`);
  return [
    avisoHtml('MANUTENCAO.md'),
    '',
    '> **Este repositório é GERADO.** A manutenção descrita abaixo acontece no `harness-elo-v2`, que é a',
    '> fonte; aqui ela vale como leitura. Toda mudança chega pela geração (`gerar-cursor.mjs`, no',
    '> repositório fonte), e `harness.json.geradoDe` diz de qual commit.',
    '',
    corpo,
  ].join('\n');
}

/**
 * Regras do Cursor para Agent Skills: `name` só com minúsculas, dígitos e hífen, igual à pasta;
 * `description` obrigatória. Os dois são erro. `description` acima de 1024 caracteres é aviso — é o
 * limite do padrão Agent Skills, que a documentação do Cursor não repete.
 */
export function validarSkill(pasta, skillMd) {
  const erros = [];
  const avisos = [];
  const m = FRONTMATTER.exec(skillMd);
  if (!m) return { erros: [`${pasta}: SKILL.md sem frontmatter`], avisos };
  const linhas = m[1].split(/\r?\n/);
  const nome = (linhas.find((l) => /^name:/.test(l)) || '').replace(/^name:\s*/, '').trim();
  if (nome !== pasta) erros.push(`${pasta}: name "${nome}" difere da pasta`);
  if (!/^[a-z0-9-]+$/.test(nome)) erros.push(`${pasta}: name "${nome}" fora do formato do Cursor (minúsculas, dígitos e hífen)`);
  const i = linhas.findIndex((l) => /^description:/.test(l));
  let desc = '';
  if (i >= 0) {
    const primeira = linhas[i].replace(/^description:\s*/, '');
    if (/^[>|]/.test(primeira)) {
      const acc = [];
      for (let j = i + 1; j < linhas.length && /^\s+\S/.test(linhas[j]); j++) acc.push(linhas[j].trim());
      desc = acc.join(' ');
    } else {
      desc = primeira.replace(/^"(.*)"$/, '$1');
    }
  }
  if (!desc.trim()) erros.push(`${pasta}: sem description (o Cursor exige)`);
  const n = [...desc].length;
  if (n > 1024) avisos.push(`${pasta}: description com ${n} caracteres (limite do padrão Agent Skills: 1024)`);
  return { erros, avisos };
}

const RULE_HARNESS = /^\.claude\/rules\/harness\/([a-z]+)\.md$/;
const AGENTE = /^\.claude\/agents\/[^/]+\.md$/;

/** Que classe é `rel` na FONTE, e para onde/como ele vai — puro, sem tocar disco. */
export function planejar(rel) {
  const r = String(rel).replace(/\\/g, '/');
  if (excluido(r)) return { tipo: 'excluir', destino: null };
  const conversiveis = new Set(['CLAUDE.md', 'harness.json', 'README.md', 'MANUTENCAO.md', '.claude/settings.json']);
  if (conversiveis.has(r) || RULE_HARNESS.test(r) || AGENTE.test(r)) {
    return { tipo: 'converter', destino: reescrever(r) };
  }
  return { tipo: 'copiar', destino: reescrever(r) };
}

/** Texto se o buffer é UTF-8 limpo; `null` se é binário ou não decodifica sem perda. */
function comoTexto(buf) {
  if (buf.includes(0)) return null;
  const t = buf.toString('utf8');
  return Buffer.from(t, 'utf8').equals(buf) ? t : null;
}

const RULES_DE_FASE = new Set(['explore', 'plan', 'deliver', 'frontend']);

function converter(rel, texto, sha) {
  if (rel === 'CLAUDE.md') return converterClaudeMd(texto);
  if (rel === 'README.md') return converterReadme(texto);
  if (rel === 'MANUTENCAO.md') return converterManutencao(texto);
  if (rel === 'harness.json') return `${JSON.stringify(gerarHarnessJson(JSON.parse(texto), sha), null, 2)}\n`;
  if (AGENTE.test(rel)) return converterAgente(texto, rel);
  const m = RULE_HARNESS.exec(rel);
  if (m && m[1] === 'security') return converterRule(texto, rel, { alwaysApply: true });
  if (m && RULES_DE_FASE.has(m[1])) return converterRule(texto, rel);
  throw new Error(`sem conversor para ${rel}`);
}

/** Os arquivos que só existem na saída — sem fonte, gerados por função. */
export const GERADOS = {
  '.cursor/rules/harness/harness-fase.mdc': gerarHarnessFase,
  '.cursor/hooks/cursor-sessionstart.mjs': gerarAdaptadorSessionStart,
  '.cursor/hooks/cursor-shell.mjs': gerarAdaptadorShell,
  '.cursor/hooks/cursor-wiring.test.mjs': gerarTesteWiring,
};

/**
 * O orquestrador — puro em relação ao `io` injetado. Valida TODAS as skills e o `settings.json`
 * antes de escrever qualquer coisa (um inválido derruba a geração inteira, e a saída anterior fica
 * de pé); depois limpa a saída (menos `.git/`) e escreve tudo.
 */
export function gerar(fonte, saida, io) {
  const arquivos = io.listar(fonte).filter((r) => !excluido(r));
  const sha = io.sha(fonte);

  // 1. VALIDAR ANTES DE ESCREVER.
  const erros = [];
  const avisos = [];
  for (const rel of arquivos) {
    const m = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/.exec(rel);
    if (!m) continue;
    const v = validarSkill(m[1], io.ler(join(fonte, rel)).toString('utf8'));
    erros.push(...v.erros);
    avisos.push(...v.avisos);
  }
  if (erros.length) throw new Error(`geração abortada — ${erros.length} erro(s) de skill:\n${erros.join('\n')}`);
  // Hook sem equivalente decidido na tabela HOOKS também derruba a geração antes de escrever.
  if (arquivos.includes('.claude/settings.json')) converterSettings(io.ler(join(fonte, '.claude/settings.json')).toString('utf8'));

  // 2. LIMPAR E ESCREVER.
  io.limpar(saida);
  const escritos = [];
  const conteudos = []; // [destino, buffer] — base do manifesto da zona (Decisão 67)
  const sobrasPorArquivo = [];
  const escreverTexto = (destino, texto) => {
    const s = sobras(texto);
    if (s.length) sobrasPorArquivo.push({ arquivo: destino, ocorrencias: s });
    const buf = Buffer.from(texto, 'utf8');
    io.escrever(join(saida, destino), buf);
    escritos.push(destino);
    conteudos.push([destino, buf]);
  };
  for (const rel of arquivos) {
    const plano = planejar(rel);
    const buf = io.ler(join(fonte, rel));
    if (rel === '.claude/settings.json') {
      // O `hooks.json` é montado da tabela HOOKS, não reescrito: o texto da fonte não entra.
      escreverTexto(plano.destino, converterSettings(buf.toString('utf8')));
      continue;
    }
    if (plano.tipo === 'converter') {
      // REESCREVE ANTES DE CONVERTER — a linha `gerado de <fonte>` que o conversor põe no topo tem
      // que continuar citando o nome da FONTE (mesma razão do gerar-kiro.mjs).
      escreverTexto(plano.destino, converter(rel, reescrever(buf.toString('utf8')), sha));
      continue;
    }
    const texto = comoTexto(buf);
    if (texto === null) {
      io.escrever(join(saida, plano.destino), buf);
      escritos.push(plano.destino);
      conteudos.push([plano.destino, buf]);
      continue;
    }
    escreverTexto(plano.destino, reescrever(aplicarRemendos(rel, texto)));
  }
  for (const [destino, fn] of Object.entries(GERADOS)) escreverTexto(destino, fn());
  // Por ÚLTIMO, sobre o que foi escrito: o manifesto descreve a saída, não a fonte (Decisão 67).
  escreverTexto(MANIFESTO, manifestoDeArvore(conteudos));
  io.gitInit(saida);

  return { escritos: escritos.sort(), avisos, sobras: sobrasPorArquivo };
}

// ————————————————————————————— casca de I/O —————————————————————————————
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MANIFESTO, manifestoDeArvore } from './verificar-zona.mjs';

/** Todos os arquivos sob `dir`, relativos a `raiz`, com `/`; ocultos entram, só `.git/` fica de fora. */
function listarRec(raiz, dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    const rel = relative(raiz, abs).replace(/\\/g, '/');
    if (rel === '.git' || rel.startsWith('.git/')) continue;
    if (e.isDirectory()) listarRec(raiz, abs, out);
    else out.push(rel);
  }
  return out;
}

export const IO_REAL = {
  listar: (raiz) => listarRec(raiz, raiz, []).sort(),
  ler: (abs) => readFileSync(abs),
  escrever: (abs, buf) => { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, buf); },
  limpar: (saida) => {
    mkdirSync(saida, { recursive: true });
    for (const e of readdirSync(saida)) if (e !== '.git') rmSync(join(saida, e), { recursive: true, force: true });
  },
  sha: (raiz) => {
    const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: raiz, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git rev-parse falhou em ${raiz}: ${r.stderr}`);
    return r.stdout.trim();
  },
  gitInit: (saida) => {
    if (existsSync(join(saida, '.git'))) return;
    const r = spawnSync('git', ['init', '-q'], { cwd: saida, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git init falhou: ${r.stderr}`);
  },
  /**
   * A suíte da SAÍDA. Repassa PYTHON_REPORT — sem ela, o report-dominios dá vermelhos por desenho.
   * Reporter TAP explícito: o padrão do Node mudou para `spec`, e o resumo (`# pass`, `not ok`) que o
   * `main` lê só existe no TAP.
   */
  rodarSuite: (saida) => {
    const r = spawnSync('node', ['--test', '--test-reporter=tap', '.cursor/hooks/*.test.mjs', '.cursor/ferramentas/*.test.mjs'],
      { cwd: saida, encoding: 'utf8', env: process.env, timeout: 600000, shell: false });
    return { status: r.status, saida: `${r.stdout || ''}\n${r.stderr || ''}` };
  },
};

function main(argv) {
  const i = argv.indexOf('--saida');
  if (i < 0 || !argv[i + 1]) {
    process.stderr.write('Uso: node .claude/ferramentas/gerar-cursor.mjs --saida <dir> [--verificar] [--json]\n');
    return 2;
  }
  const saida = argv[i + 1];
  const fonte = process.cwd();
  let r;
  try {
    r = gerar(fonte, saida, IO_REAL);
  } catch (erro) {
    // Num pipeline, a mensagem precisa ir para o log e o código tem que ser não zero — sem pilha.
    process.stderr.write(`${(erro && erro.message) || erro}\n`);
    return 1;
  }
  const linhas = [
    `Gerado em \`${saida}\` a partir de ${IO_REAL.sha(fonte)} — ${r.escritos.length} arquivos.`,
    ...(r.avisos.length ? ['', `Avisos (${r.avisos.length}):`, ...r.avisos.map((a) => `  · ${a}`)] : []),
    ...(r.sobras.length ? ['', `SOBRAS de .claude (${r.sobras.length} arquivo(s)) — acrescente linha na tabela ou remendo:`,
      ...r.sobras.map((s) => `  · ${s.arquivo}: ${s.ocorrencias.join(', ')}`)] : []),
  ];
  let status = r.sobras.length ? 1 : 0;
  if (argv.includes('--verificar')) {
    const s = IO_REAL.rodarSuite(saida);
    const resumo = (s.saida.match(/^# (tests|pass|fail) .*$/gm) || []).join(' · ');
    linhas.push('', `Suíte da saída: ${resumo || '(sem resumo)'}`);
    r.suite = { status: s.status, resumo };
    if (s.status !== 0) { status = 1; linhas.push(...s.saida.split('\n').filter((l) => /^not ok/.test(l)).map((l) => `  ${l}`)); }
  }
  process.stdout.write((argv.includes('--json') ? JSON.stringify(r, null, 2) : linhas.join('\n')) + '\n');
  return status;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
