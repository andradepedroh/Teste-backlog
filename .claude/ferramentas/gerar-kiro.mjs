// Harness Elo v2 — Gerador da versão Kiro (Decisão 46). Núcleo puro + casca de I/O.
//
// EXECUTÁVEL DE MÃO (Decisão 20), do lado de quem mantém o template. Produz `harness-elo-v2-kiro/`
// inteiro a partir deste repositório. A saída NUNCA é editada: quem precisa mudá-la muda a tabela,
// um remendo ou um conversor aqui, e gera de novo. `harness.json.geradoDe` na saída é a prova.
//
// Spec: docs/superpowers/specs/2026-09-11-harness-kiro-design.md, §3.

/**
 * Tabela de reescrita de caminhos, aplicada a TODO texto copiado. A ORDEM É DADO: do mais
 * específico para o mais genérico. A última linha é o que pega `join(raiz, '.claude', 'hooks')`
 * nos testes — o segmento escrito como token separado, que as anteriores não veem.
 */
export const REESCRITAS = [
  ['.claude/rules/harness/security.md', '.kiro/steering/harness-security.md'],
  // A de frontend vai para o STEERING, com `inclusion: fileMatch` (ver `converter`): carrega sozinha
  // ao tocar arquivo de tela. Em `.kiro/fases/` ela só entrava se o consultor a anexasse à mão.
  ['.claude/rules/harness/frontend.md', '.kiro/steering/harness-frontend.md'],
  [/\.claude\/rules\/harness\/(explore|plan|deliver)\.md/g, '.kiro/fases/harness-$1.md'],
  ['.claude/rules/harness/', '.kiro/fases/'],
  ['.claude/rules/harness', '.kiro/fases'],
  ['.claude/rules/', '.kiro/steering/'],
  ['.claude/rules', '.kiro/steering'],
  // `.claude/settings.json` não vai para a saída (EXCLUSOES) — mas referências a ele em PROSA (o
  // README, o MANUTENCAO, um teste que cita o caminho) continuam precisando virar o caminho do
  // agente Kiro, então a linha fica.
  ['.claude/settings.json', '.kiro/agents/harness-elo.json'],
  [/\bCLAUDE\.md\b/g, 'AGENTS.md'],
  // `CLAUDE\.md` — o mesmo nome dentro de um literal de regex escapado (`` /`CLAUDE\.md` está.../ ``),
  // que a linha anterior não alcança: o `\b` ali exige o ponto sem barra, e aqui há uma no meio.
  [/CLAUDE\\\.md/g, 'AGENTS\\.md'],
  // As duas linhas abaixo ficaram redundantes desde que a linha genérica final (`/\.claude(?!-plugin)/g`)
  // passou a pegar tudo que sobrasse — ela sozinha já cobre `.claude/` e `'.claude'`/`` `.claude` ``.
  // Ficam como documentação da intenção (o que cada forma precisava cobrir antes da genérica
  // existir) e porque os testes que as provam continuam em pé.
  ['.claude/', '.kiro/'],
  [/(['"`])\.claude\1/g, '$1.kiro$1'],
  [/(['"`])\.CLAUDE\1/g, '$1.KIRO$1'],
  // A MAIS GENÉRICA DE TODAS — o que sobrar depois de todas as anteriores: `.claude` dentro de um
  // literal de regex escapado (`\.claude\/hooks\/kit\.mjs`), colado a uma barra invertida de
  // caminho Windows (`.claude\hooks\kit.mjs`), ou solto em prosa sem aspas. `.claude-plugin` (nome
  // do upstream) continua de fora.
  [/\.claude(?!-plugin)/g, '.kiro'],
];

export function reescrever(texto) {
  let t = String(texto);
  for (const [de, para] of REESCRITAS) {
    t = typeof de === 'string' ? t.split(de).join(para) : t.replace(de, para);
  }
  return t;
}

/**
 * O `.claude` que a tabela não alcançou. `.claude-plugin` é nome do upstream e fica; qualquer
 * linha que cite `gerar-kiro.mjs` — o cabeçalho `gerado de <fonte> pelo .claude/ferramentas/
 * gerar-kiro.mjs`, mas também o comando de geração citado em prosa (o MANUTENCAO, por exemplo) —
 * cita a fonte DE PROPÓSITO e não conta: é o gerador se nomeando, não uma sobra.
 */
export function sobras(texto) {
  const out = [];
  for (const linha of String(texto).split(/\r?\n/)) {
    if (/gerar-kiro\.mjs/.test(linha)) continue;
    // O gerador irmão, citado no MANUTENCAO pelo caminho da FONTE (ver GERAR_CURSOR_*): mesma razão.
    if (/gerar-cursor\.mjs/.test(linha)) continue;
    // Mesma razão da linha acima: `converterManutencao` restaura `.claude/ferramentas/empacotar.mjs`
    // na seção "Gerar e publicar o zip" — o gerador ali citado é da FONTE, não uma sobra.
    if (/empacotar\.mjs/.test(linha)) continue;
    // A linha de EXCLUSOES do MANUTENCAO (revisão final, 2ª rodada — G4) nomeia de propósito
    // módulos "só do Claude Code", e converterManutencao restaura `.claude/settings.json` nela
    // depois da reescrita genérica — mesma classe de citação deliberada que a linha acima, só que
    // marcada por outro texto: a própria frase que introduz a lista, não o nome do gerador.
    if (/só faz sentido no Claude Code/.test(linha)) continue;
    out.push(...(linha.match(/(['"`]\.claude['"`])|(\.claude(?!-plugin)(?:\/[^\s'"`)\]]*)?)/g) || []));
  }
  return out;
}

/** Prefixos (terminados em `/`) e caminhos exatos que não vão para a saída. */
export const EXCLUSOES = [
  '.git/', '.superpowers/', '.claude/worktrees/', 'node_modules/', 'docs/', '.azuredevops/',
  '.harness-template',
  '.claude/hooks/wiring.test.mjs',              // lê o settings.json no formato do Claude Code; a K2 traz o wiring-kiro
  '.claude/ferramentas/gerar-kiro.mjs',         // um clone Kiro não gera nada
  '.claude/ferramentas/gerar-kiro.test.mjs',
  '.claude/ferramentas/gerar-cursor.mjs',       // um clone Kiro também não gera a versão Cursor
  '.claude/ferramentas/gerar-cursor.test.mjs',
  // exige CLAUDE.md/settings.json que a saída não tem; o zip do Kiro sai do pipeline publicar-kiro.yml.
  '.claude/ferramentas/empacotar.mjs',
  '.claude/ferramentas/empacotar.test.mjs',
  '.claude/settings.json',                      // formato do Claude Code; a K2 emite o agente de verdade
  // Os validadores e o corretor do `validar.mjs`. O Kiro TEM agentes próprios, em `.kiro/agents/`
  // (é ali que a K2 põe o `harness-elo.json`), mas no formato DELE: um JSON de configuração. Estes
  // estão no formato do Claude Code — markdown com frontmatter (`name`, `tools`, `model`) e o prompt
  // no corpo —, e copiá-los para `.kiro/agents/` daria arquivos que o Kiro não lê como agente. Não há
  // conversor deles para o JSON do Kiro, e por isso ficam de fora. O `validar.mjs` vai para a saída
  // mesmo assim: no Kiro o G3 roda em modo `--sem-agentes`, só com a varredura determinística.
  '.claude/agents/',
];

// O gerador anda o disco (IO_REAL.listar), não o índice do git — um `__pycache__` ou `.pyc`
// esquecido na fonte (ficou de um `python -c` numa revisão) não some do `listar` só por estar
// fora do índice, e ia inteiro para a saída e para o commit de lá. Por segmento e sufixo, em
// qualquer nível, não só na raiz — `EXCLUSOES` acima continua sendo a lista documentada.
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
 * vocabulário da FONTE (a tabela reescreve o resultado). Remendo que não casa é ERRO, não aviso:
 * a fonte mudou e a saída ficaria silenciosamente diferente do que este arquivo afirma.
 */
export const REMENDOS = [
  {
    arquivo: '.claude/hooks/gramatica.test.mjs',
    de: "join(RAIZ, '.claude', 'rules', 'harness', 'explore.md')",
    para: "join(RAIZ, '.kiro', 'fases', 'harness-explore.md')",
  },
  {
    arquivo: '.claude/ferramentas/ferramentas.test.mjs',
    de: "join(RAIZ, '.claude', 'rules', 'harness')",
    para: "join(RAIZ, '.kiro', 'fases')",
  },
  {
    // As três entradas de arquivo do steering entram na zona imutável do kit; o `harness.json`
    // gerado recebe as mesmas três (ver `gerarHarnessJson`), e o `kit.test.mjs` cruza os dois.
    arquivo: '.claude/hooks/kit.mjs',
    de: "  '.claude/skills/',\n];",
    para: "  '.claude/skills/',\n  '.kiro/steering/harness-security.md',\n  '.kiro/steering/harness-fase.md',\n  '.kiro/steering/harness-frontend.md',\n];",
  },
  {
    // A rule de frontend chega ao Kiro sem `paths:` — o `converterRule` o troca por `inclusion:
    // fileMatch` + `fileMatchPattern`, que é o que o Kiro lê. A cópia do teste cobra o formato do Kiro.
    arquivo: '.claude/hooks/estado.test.mjs',
    de: "  const fe = /^paths:\\s*\"([^\"]+)\"\\s*$/m.exec(frontmatter('.claude/rules/harness/frontend.md'));\n"
      + "  assert.ok(fe, 'frontend.md sem `paths:` entre aspas');\n"
      + "  const chaves = /^\\*\\*\\/\\*\\.\\{([a-z,]+)\\}$/.exec(fe[1]);\n"
      + "  assert.ok(chaves, `o paths: deixou de ser um glob só, com chaves: ${fe[1]}`);\n"
      + "  assert.deepEqual(new Set(chaves[1].split(',')), doPadrao);\n",
    para: "  // No Kiro o `paths:` vira `inclusion: fileMatch` + `fileMatchPattern` (converterRule do gerar-kiro).\n"
      + "  const fm = frontmatter('.claude/rules/harness/frontend.md');\n"
      + "  assert.match(fm, /^inclusion: fileMatch$/m, 'frontend sem `inclusion: fileMatch`');\n"
      + "  const fe = /^fileMatchPattern:\\s*(\\[.*\\])\\s*$/m.exec(fm);\n"
      + "  assert.ok(fe, 'frontend sem `fileMatchPattern` em lista');\n"
      + "  // As mesmas extensões do `frontend-default.mdc`, que ela substitui desde a Decisão 73.\n"
      + "  assert.deepEqual(new Set(JSON.parse(fe[1]).map((g) => /^\\*\\*\\/\\*\\.([a-z]+)$/.exec(g)?.[1])), doPadrao);\n"
      + "  assert.ok(!/^paths:/m.test(fm), 'o `paths:` não é do Kiro e não pode sobrar');\n",
  },
  {
    // Mesma família: a rule do Plan é montada por `juntar(..., '..', 'rules', 'harness', 'plan.md')`
    // — tokens separados, e na saída o arquivo mudou de pasta E de nome (`.kiro/fases/harness-plan.md`).
    arquivo: '.claude/hooks/sync-log.test.mjs',
    de: "const RULE_PLAN = juntar(pastaDe(urlPara(import.meta.url)), '..', 'rules', 'harness', 'plan.md');",
    para: "const RULE_PLAN = juntar(pastaDe(urlPara(import.meta.url)), '..', 'fases', 'harness-plan.md');",
  },
  {
    // Idem, a segunda leitura da mesma rule do Plan, noutro arquivo.
    arquivo: '.claude/hooks/zonas.test.mjs',
    de: "readFileSync(join(RAIZ, '.claude', 'rules', 'harness', 'plan.md'), 'utf8');",
    para: "readFileSync(join(RAIZ, '.kiro', 'fases', 'harness-plan.md'), 'utf8');",
  },
  {
    // `ehZonaImutavel` é insensível a caixa — o teste prova isso com variantes de caixa de
    // `.claude`/`CLAUDE.md` como FIXTURE, não como caminho real. A tabela não toca maiúsculas (de
    // propósito, para não confundir prosa); o equivalente Kiro é a mesma variação de caixa sobre
    // `.kiro`/`AGENTS.md`.
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "test('ehZonaImutavel é insensível a caixa no diretório — .CLAUDE/hooks/kit.mjs', () => {\n  assert.equal(ehZonaImutavel('.CLAUDE/hooks/kit.mjs'), true);\n});",
    para: "test('ehZonaImutavel é insensível a caixa no diretório — .KIRO/hooks/kit.mjs', () => {\n  assert.equal(ehZonaImutavel('.KIRO/hooks/kit.mjs'), true);\n});",
  },
  {
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "test('ehZonaImutavel é insensível a caixa em arquivo exato — claude.md', () => {\n  assert.equal(ehZonaImutavel('claude.md'), true);\n  assert.equal(ehZonaImutavel('Claude.MD'), true);\n});",
    para: "test('ehZonaImutavel é insensível a caixa em arquivo exato — agents.md', () => {\n  assert.equal(ehZonaImutavel('agents.md'), true);\n  assert.equal(ehZonaImutavel('Agents.MD'), true);\n});",
  },
  {
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "test('ehZonaImutavel casa o diretório sem barra final também com caixa trocada', () => {\n  assert.equal(ehZonaImutavel('.Claude/Hooks'), true);\n  assert.equal(ehZonaImutavel('.CLAUDE/SKILLS'), true);\n});",
    para: "test('ehZonaImutavel casa o diretório sem barra final também com caixa trocada', () => {\n  assert.equal(ehZonaImutavel('.Kiro/Hooks'), true);\n  assert.equal(ehZonaImutavel('.KIRO/SKILLS'), true);\n});",
  },
  {
    // A regressão nomeada do bypass 2/5 (caixa no diretório liberava a zona imutável) — o título já
    // é reescrito pela tabela (`.claude` minúsculo); só as duas fixtures em maiúscula precisam do
    // remendo.
    arquivo: '.claude/hooks/kit.test.mjs',
    de: "const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/.CLAUDE/hooks/kit.mjs');\n  assert.equal(rel, '.CLAUDE/hooks/kit.mjs');",
    para: "const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/.KIRO/hooks/kit.mjs');\n  assert.equal(rel, '.KIRO/hooks/kit.mjs');",
  },
  {
    // Revisão final, 2ª rodada (G1): `.claude/settings.json` virou EXCLUSOES — a saída não tem mais
    // nenhum arquivo equivalente até a K2 (o agente de verdade, ver MANUTENCAO.md). A 1ª rodada
    // apagava este teste em silêncio com `test.skip` — mas o README da própria saída diz "nunca
    // silenciam com `test.skip`" (doutrina, ver README.md), e um `test.skip` na saída contradiz a
    // doutrina que ela mesma carrega. Este remendo substitui o bloco pelo teste que AFIRMA a
    // ausência do agente: quando a K2 criar `.kiro/agents/harness-elo.json`, este teste fica
    // vermelho e cobra a volta da verificação de verdade (ferramenta vs. verificador).
    //
    // UM remendo só, não dois: os dois remendos da 1ª rodada (Task 8 — a leitura do settings.json;
    // F1 — o título do teste virando test.skip) mexiam no MESMO bloco, um dentro do outro — um
    // aplicado primeiro invalidava o literal do outro. Um `de` que cobre o bloco INTEIRO, do título
    // ao `});` de fechamento, elimina a sobreposição.
    arquivo: '.claude/ferramentas/ferramentas.test.mjs',
    de: "test('nenhuma ferramenta está registrada no settings.json', () => {\n"
      + "  // Se estivesse, ela seria verificador: passaria a rodar por evento, com uma tool call parada\n"
      + "  // esperando, e o orçamento de ≤50 ms da Decisão 14 passaria a valer sobre ela. Nenhuma foi\n"
      + "  // escrita para isso.\n"
      + "  const bruto = readFileSync(join(RAIZ, '.claude', 'settings.json'), 'utf8');\n"
      + "  for (const f of ferramentas()) {\n"
      + "    assert.ok(!bruto.includes(f), `${f} aparece no settings.json — ferramenta não é verificador`);\n"
      + "  }\n"
      + "});",
    para: "test('nenhum agente existe ainda — a verificação de ferramenta-vs-verificador chega na K2', () => {\n"
      + "  // Na FONTE este teste lê o wiring e prova que nenhuma ferramenta está registrada como\n"
      + "  // verificador. Aqui não há wiring: a K1 não emite agente (MANUTENCAO.md, \"O que a saída NÃO\n"
      + "  // tem, até a K2\"). O teste afirma essa ausência em vez de silenciar — quando a K2 criar o\n"
      + "  // agente, ele fica vermelho e cobra a volta da verificação de verdade.\n"
      + "  assert.ok(\n"
      + "    !existsSync(join(RAIZ, '.claude', 'settings.json')),\n"
      + "    'o agente apareceu: restaure a verificação de que nenhuma ferramenta está registrada nele (Plano K2)',\n"
      + "  );\n"
      + "});",
  },
  {
    // Revisão final (F5): o comando de geração no MANUTENCAO da SAÍDA passa a citar de propósito
    // `.claude/ferramentas/gerar-kiro.mjs` — o caminho da FONTE, não da saída (`converterManutencao`
    // desfaz a reescrita genérica só ali, ver comentário lá). Sem este remendo, a CÓPIA deste teste
    // em `.kiro/hooks/` teria o próprio literal da asserção reescrito pela linha genérica de
    // REESCRITAS (para `.kiro/ferramentas/gerar-kiro.mjs`) e ficaria vermelha contra o texto CERTO
    // que `converterManutencao` produz. A troca usa `+` para partir ".claude" em duas peças — de
    // propósito, para o literal sobreviver à reescrita genérica em vez de ser pego por ela de novo.
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

const GERADO_POR = 'pelo .claude/ferramentas/gerar-kiro.mjs — não edite; edite a fonte e gere de novo';
const avisoHtml = (origem) => `<!-- gerado de ${origem} ${GERADO_POR} -->`;
const avisoYaml = (origem) => `# gerado de ${origem} ${GERADO_POR}`;

/** A ÚNICA frase do CLAUDE.md que afirma comportamento de hook (conferido em 2026-09-11). */
// A frase seguinte da fonte («A rule de fase chega **só** por essa injeção…») entra no casamento,
// opcional: no Kiro a injeção não é o único caminho, e mantê-la contradiria a frase nova.
export const FRASE_HOOK = /O `estado` detecta a fase no início da sessão e\s+injeta a rule correspondente — você não precisa perguntar em que fase estamos\.(?:\s+A rule de fase chega\s+\*\*só\*\*\s+por essa injeção, e subagente não a recebe: quem lança um subagente que precise dela cita o\s+arquivo no prompt\.)?/;
export const FRASE_KIRO = 'Na CLI com o agente `harness-elo`, o `estado` detecta a fase e injeta a rule; fora dele, anexe a\n' +
  'rule da fase na primeira mensagem — ver `.kiro/steering/harness-fase.md`. Subagente não recebe a\n' +
  'rule de fase: quem lança um subagente que precise dela cita o arquivo no prompt.';

export function converterClaudeMd(texto) {
  if (!FRASE_HOOK.test(texto)) throw new Error('CLAUDE.md: o marcador da frase do hook não está na fonte');
  const out = texto.replace(FRASE_HOOK, FRASE_KIRO);
  return `${avisoHtml('CLAUDE.md')}\n\n${out}`;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** `*.{m,n}` → `*.m`, `*.n`. Chaves aninhadas não aparecem nas rules; não são tratadas. Mesma regra
 *  do `expandirChaves` do gerar-cursor, repetida aqui porque um gerador não depende do outro. */
export function expandirChaves(glob) {
  const m = /\{([^{}]*)\}/.exec(glob);
  if (!m) return [glob];
  const antes = glob.slice(0, m.index);
  const depois = glob.slice(m.index + m[0].length);
  return m[1].split(',').flatMap((op) => expandirChaves(`${antes}${op.trim()}${depois}`));
}

/**
 * Rule do harness → arquivo do Kiro. O Kiro não conhece `paths:`:
 *   - steering sempre carregado (`inclusion: always`, a de segurança) — os campos passam como estão;
 *   - steering por arquivo (`inclusion: fileMatch`, a de frontend) — o `paths:` da fonte VIRA o
 *     `fileMatchPattern` em LISTA, com as chaves expandidas (`*.{ts,tsx}` → `*.ts`, `*.tsx`): a
 *     documentação do Kiro mostra glob simples ou lista e não garante expansão de chaves, e uma
 *     chave não expandida faria a rule nunca carregar. Sem `paths:` na fonte é erro: não há o que
 *     casar;
 *   - rule de fase (sem `inclusion`) — fica fora do steering, em `.kiro/fases/`, e o `paths:` dela
 *     fica: inerte ali, e é o que a cópia do `estado.test.mjs` cobra para provar que ela não carrega
 *     sozinha no Claude Code.
 * Atenção conhecida (ver `gerarHarnessFase`; kiro.dev/docs/steering, 2026-10-19): a IDE e a CLI V3
 * honram os quatro modos; a CLI V1/V2 só carrega sozinha a `always` — lá a de frontend precisa ser
 * anexada.
 */
export function converterRule(texto, origem, { inclusion } = {}) {
  const m = FRONTMATTER.exec(texto);
  if (!m) throw new Error(`${origem}: rule sem frontmatter`);
  let campos = m[1].split(/\r?\n/);
  const extras = inclusion ? [`inclusion: ${inclusion}`] : [];
  if (inclusion === 'fileMatch') {
    const p = campos.map((l) => /^paths:\s*(.*)$/.exec(l)).find(Boolean);
    if (!p) throw new Error(`${origem}: inclusion fileMatch exige \`paths:\` na fonte`);
    // Parte só na vírgula FORA de chave: a de dentro é alternativa do glob, não separador.
    const globs = p[1].trim().replace(/^"(.*)"$/, '$1').split(/,(?![^{]*\})/).map((g) => g.trim())
      .filter(Boolean).flatMap(expandirChaves);
    extras.push(`fileMatchPattern: [${globs.map((g) => JSON.stringify(g)).join(', ')}]`);
    campos = campos.filter((l) => !/^paths:/.test(l));
  }
  const cabeca = ['---', avisoYaml(origem), ...extras, ...campos, '---'];
  return `${cabeca.join('\n')}\n${texto.slice(m[0].length)}`;
}

export function gerarHarnessFase() {
  return [
    '---',
    avisoYaml('(sem fonte — só existe na versão Kiro)'),
    'inclusion: always',
    'description: Como a fase entra na sessão quando não há hook para detectá-la.',
    '---',
    '',
    '# A fase desta sessão',
    '',
    'Fora do agente `harness-elo` (K2), o Kiro **não detecta** em que fase o projeto está. As rules de',
    'fase moram em `.kiro/fases/` — de propósito fora de `.kiro/steering/`, porque as três nunca valem',
    'juntas e o steering não tem um modo que escolha a da fase — e entram na sessão **quando você as anexa**.',
    '',
    '**Na primeira mensagem, anexe a rule da fase:**',
    '',
    '| Fase | CLI | IDE |',
    '|---|---|---|',
    '| 🔍 Explore | `@.kiro/fases/harness-explore.md` | seletor `#`, opção arquivo, `harness-explore.md` |',
    '| 📐 Plan | `@.kiro/fases/harness-plan.md` | idem, `harness-plan.md` |',
    '| 🚀 Deliver | `@.kiro/fases/harness-deliver.md` | idem, `harness-deliver.md` |',
    '',
    'A rule de frontend não é anexo: é `.kiro/steering/harness-frontend.md`, com `inclusion: fileMatch`,',
    'e entra sozinha quando a sessão toca arquivo de tela (`.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`,',
    '`.mdx`) — na IDE e na CLI V3. Na CLI V1/V2 só as rules `always` carregam sozinhas: anexe',
    '`#harness-frontend` quando for mexer em tela.',
    '',
    'Uma fase por sessão. Se você não sabe a fase, olhe `outputs/`: só `outputs/explore/` com conteúdo é',
    'Explore; escrita em `outputs/spec/` além do `sync-log.md` é Plan; `outputs/spec/em-andamento.md` é Deliver.',
    '',
    '## O que NÃO é deste harness',
    '',
    'O Kiro tem um fluxo próprio de specs (`.kiro/specs/`, com requirements/design/tasks). **Ele não é a',
    'cadeia deste harness.** A cadeia é o kit `spec-*` em `.kiro/skills/`, e os artefatos ficam em',
    '`outputs/spec/`. Não crie specs do Kiro para o trabalho do projeto.',
    '',
  ].join('\n');
}

export const RUNTIME_KIRO = {
  rotulo: 'Kiro (IDE ou CLI)',
  cli: 'kiro-cli',
  semCli: 'Se você usa só a IDE, isto é esperado e não é problema.',
};

export function gerarHarnessJson(fonte, sha) {
  const zonaImutavel = fonte.zonaImutavel.map(reescrever);
  return {
    nome: 'harness-elo-v2-kiro',
    versao: fonte.versao,
    kitVersao: fonte.kitVersao,
    geradoDe: sha,
    runtime: RUNTIME_KIRO,
    zonaImutavel: [...zonaImutavel, '.kiro/steering/harness-security.md', '.kiro/steering/harness-fase.md',
      '.kiro/steering/harness-frontend.md'],
    zonaMutavel: fonte.zonaMutavel.map(reescrever),
  };
}

const LINHA_RUNTIME = '| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |';
const LINHA_RUNTIME_KIRO = '| 1 | **Kiro** (IDE ou CLI) | runtime do agente — steering, skills, verificadores | sempre |';
const ABERTURA = 'Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.';

// "Estrutura" — a linha das rules do método já chega REESCRITA a converterReadme: em `gerar()` a
// fonte passa por `reescrever` ANTES do conversor (comentário na função `gerar`), e a essa altura
// `.claude/rules/harness/` já virou `.kiro/fases/`. O marcador tem que casar a forma JÁ REESCRITA,
// não a da fonte.
const LINHA_ESTRUTURA_FASES = '| `.kiro/fases/` | as cinco rules do método (zona imutável) |';
const LINHAS_ESTRUTURA_FASES_KIRO = [
  '| `.kiro/fases/` | as três rules de fase — anexadas por sessão, ver `.kiro/steering/harness-fase.md` (zona imutável) |',
  '| `.kiro/steering/` | `harness-security.md` e `harness-fase.md`, sempre carregados, e `harness-frontend.md`, carregado ao tocar arquivo de tela (`fileMatch`); o resto da pasta é do projeto (`spec-tech-rules`) |',
].join('\n');

const SECAO_KIRO = [
  '## Kiro — como abrir',
  '',
  '**IDE:** abra esta pasta como workspace. O `AGENTS.md` e o steering carregam sozinhos; a rule da fase',
  'você anexa na primeira mensagem — ver `.kiro/steering/harness-fase.md`.',
  '',
  '**CLI:** na raiz, `kiro-cli chat`, e anexe a rule da fase: `@.kiro/fases/harness-explore.md` (ou',
  '`-plan`, `-deliver`). A partir da K2, `kiro-cli chat --agent harness-elo` detecta a fase sozinho.',
  '',
  '> **Esta versão não tem travas até a K2.** Zona imutável e congelamento são doutrina escrita, não',
  '> fiscalizada. Os verificadores estão em `.kiro/hooks/` como biblioteca testada, sem agente que os dispare.',
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
    .split(LINHA_RUNTIME).join(LINHA_RUNTIME_KIRO)
    .split(LINHA_ESTRUTURA_FASES).join(LINHAS_ESTRUTURA_FASES_KIRO)
    .split(ABERTURA).join(`Abrir no Kiro — ver a seção **Kiro — como abrir** abaixo.\n\n${SECAO_KIRO.trimEnd()}`);
  return `${avisoHtml('README.md')}\n\n${out}`;
}

const GERAR_KIRO_REESCRITO = '.kiro/ferramentas/gerar-kiro.mjs';
const GERAR_KIRO_FONTE = '.claude/ferramentas/gerar-kiro.mjs';

// Plano 7 entrou no main antes da K1: o empacotador do zip do Claude Code. O procedimento da seção
// "Gerar e publicar o zip" cita `.claude/ferramentas/empacotar.mjs` — caminho da FONTE, mesma razão
// do par acima (o arquivo está em EXCLUSOES; `empacotar.mjs` exige CLAUDE.md/settings.json
// que a saída não tem; o zip do Kiro é publicado pelo pipeline `publicar-kiro.yml`). Ao contrário do par acima, a ausência
// deste caminho no texto não é erro: uma fonte futura pode deixar de citá-lo em prosa sem que isso
// signifique nada de errado — só o `.split/.join` roda, sem guarda.
const EMPACOTAR_REESCRITO = '.kiro/ferramentas/empacotar.mjs';
const EMPACOTAR_FONTE = '.claude/ferramentas/empacotar.mjs';

// A seção "Gerar a versão Cursor" do MANUTENCAO cita o gerador irmão pelo caminho da FONTE; ele está
// em EXCLUSOES (um clone Kiro não gera Cursor). Mesma técnica do empacotador: só o `.split/.join`,
// sem guarda — a ausência do comando no texto não significa nada de errado.
const GERAR_CURSOR_REESCRITO = '.kiro/ferramentas/gerar-cursor.mjs';
const GERAR_CURSOR_FONTE = '.claude/ferramentas/gerar-cursor.mjs';

// A seção do empacotador descreve o pacote `.zip` do Claude Code — inteira. Em vez de reescrever
// frase por frase, um aviso logo abaixo do
// título avisa quem lê a saída Kiro que o procedimento é da FONTE. O marcador é o título exato: ele
// não tem `.claude` e sobrevive à tabela de REESCRITAS sem mudar, então o mesmo texto serve de
// âncora antes e depois da reescrita.
const SECAO_ZIP_TITULO = '## Gerar e publicar o zip';
const SECAO_ZIP_AVISO = '> **Edição Claude Code.** O empacotador (`empacotar.mjs`) não acompanha a saída Kiro — este procedimento vale para o repositório fonte; o zip do Kiro é publicado pelo pipeline `.azuredevops/pipelines/publicar-kiro.yml` a partir do `gerar-kiro.mjs`.';

// Revisão final, 2ª rodada (G4): a linha de EXCLUSOES do MANUTENCAO nomeia `.claude/settings.json`
// como módulo "que só faz sentido no Claude Code" — a tabela de REESCRITAS já trocou esse caminho
// por `.kiro/agents/harness-elo.json` antes do conversor rodar (mesma regra que troca a referência
// em prosa em qualquer lugar, ver comentário em REESCRITAS), e onze linhas abaixo, na saída, esse
// MESMO caminho é nomeado como o agente que a K2 entrega. Sem desfazer a troca só nesta linha, a
// saída se contradiz: chama de "só do Claude Code" o arquivo que ela mesma, logo depois, chama de
// entregável da K2. Mesma técnica do comando de geração acima (GERAR_KIRO_*) — restaura o texto da
// FONTE só neste trecho.
// Plano 7 (empacotar.mjs) acrescentou uma linha na lista da FONTE (MANUTENCAO.md, tabela "três
// listas") — os dois pares abaixo seguem junto, senão o `.includes` da guarda não bate mais.
const EXCLUSOES_SETTINGS_REESCRITO = 'módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.kiro/agents/harness-elo.json`, `empacotar.mjs`, `empacotar.test.mjs`)';
const EXCLUSOES_SETTINGS_FONTE = 'módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.claude/settings.json`, `empacotar.mjs`, `empacotar.test.mjs`)';

export function converterManutencao(texto) {
  // `texto` já chega REESCRITO (gerar() roda reescrever() antes do conversor): o comando de
  // geração, que na fonte cita `.claude/ferramentas/gerar-kiro.mjs`, chega aqui apontando para
  // `.kiro/ferramentas/gerar-kiro.mjs` — um arquivo que a SAÍDA não tem (está em EXCLUSOES, porque
  // "um clone Kiro não gera nada"). Troca de volta para o caminho da FONTE, que é o que faz sentido
  // para quem lê o MANUTENCAO da saída como referência.
  if (!texto.includes(GERAR_KIRO_REESCRITO)) throw new Error(`MANUTENCAO.md: nenhum ${GERAR_KIRO_REESCRITO} (comando de geração, já reescrito) na fonte`);
  if (!texto.includes(EXCLUSOES_SETTINGS_REESCRITO)) throw new Error('MANUTENCAO.md: a linha de EXCLUSOES (settings.json, já reescrita) não está na fonte');
  if (!texto.includes(SECAO_ZIP_TITULO)) throw new Error(`MANUTENCAO.md: nenhum marcador "${SECAO_ZIP_TITULO}" na fonte`);
  const corpo = texto
    .split(GERAR_KIRO_REESCRITO).join(GERAR_KIRO_FONTE)
    .split(EMPACOTAR_REESCRITO).join(EMPACOTAR_FONTE)
    .split(GERAR_CURSOR_REESCRITO).join(GERAR_CURSOR_FONTE)
    .split(EXCLUSOES_SETTINGS_REESCRITO).join(EXCLUSOES_SETTINGS_FONTE)
    .split(SECAO_ZIP_TITULO).join(`${SECAO_ZIP_TITULO}\n\n${SECAO_ZIP_AVISO}`);
  return [
    avisoHtml('MANUTENCAO.md'),
    '',
    '> **Este repositório é GERADO.** A manutenção descrita abaixo acontece no `harness-elo-v2`, que é a',
    '> fonte; aqui ela vale como leitura. Toda mudança chega pela geração (`gerar-kiro.mjs`, no repositório',
    '> fonte), e `harness.json.geradoDe` diz de qual commit.',
    '',
    corpo,
  ].join('\n');
}

/** `name` ≠ pasta é erro (o Kiro exige); `description` > 1024 caracteres é aviso (medição 5 da K0 decide). */
export function validarSkill(pasta, skillMd) {
  const erros = [];
  const avisos = [];
  const m = FRONTMATTER.exec(skillMd);
  if (!m) return { erros: [`${pasta}: SKILL.md sem frontmatter`], avisos };
  const linhas = m[1].split(/\r?\n/);
  const nome = (linhas.find((l) => /^name:/.test(l)) || '').replace(/^name:\s*/, '').trim();
  if (nome !== pasta) erros.push(`${pasta}: name "${nome}" difere da pasta`);
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
  const n = [...desc].length;
  if (n > 1024) avisos.push(`${pasta}: description com ${n} caracteres (limite do Kiro: 1024)`);
  return { erros, avisos };
}

const RULES_DE_FASE = new Set(['explore', 'plan', 'deliver']);

/** Que classe é `rel` na FONTE, e para onde/como ele vai — puro, sem tocar disco. */
export function planejar(rel) {
  const r = String(rel).replace(/\\/g, '/');
  if (excluido(r)) return { tipo: 'excluir', destino: null };
  const conversiveis = new Set(['CLAUDE.md', 'harness.json', 'README.md', 'MANUTENCAO.md']);
  if (conversiveis.has(r) || /^\.claude\/rules\/harness\/[a-z]+\.md$/.test(r)) {
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

function converter(rel, texto, sha) {
  if (rel === 'CLAUDE.md') return converterClaudeMd(texto);
  if (rel === 'README.md') return converterReadme(texto);
  if (rel === 'MANUTENCAO.md') return converterManutencao(texto);
  if (rel === 'harness.json') return `${JSON.stringify(gerarHarnessJson(JSON.parse(texto), sha), null, 2)}\n`;
  const m = /^\.claude\/rules\/harness\/([a-z]+)\.md$/.exec(rel);
  if (m && m[1] === 'security') return converterRule(texto, rel, { inclusion: 'always' });
  if (m && m[1] === 'frontend') return converterRule(texto, rel, { inclusion: 'fileMatch' });
  if (m && RULES_DE_FASE.has(m[1])) return converterRule(texto, rel);
  throw new Error(`sem conversor para ${rel}`);
}

/**
 * O orquestrador — puro em relação ao `io` injetado. Valida TODAS as skills antes de escrever
 * qualquer coisa (uma inválida derruba a geração inteira, e a saída anterior fica de pé); depois
 * limpa a saída (menos `.git/`) e escreve tudo.
 */
export function gerar(fonte, saida, io) {
  const arquivos = io.listar(fonte).filter((r) => !excluido(r));
  const sha = io.sha(fonte);

  // 1. VALIDAR ANTES DE ESCREVER — uma skill inválida derruba tudo, e a saída anterior fica de pé.
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
    if (plano.tipo === 'converter') {
      // REESCREVE ANTES DE CONVERTER, e a ordem é dado: o conversor põe no topo a linha
      // `gerado de <fonte>`, e a fonte tem que continuar se chamando `CLAUDE.md`,
      // `.claude/rules/harness/security.md` — reescrever depois transformaria a citação da fonte
      // numa citação da própria saída, que é mentira.
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
  escreverTexto('.kiro/steering/harness-fase.md', gerarHarnessFase());
  // Por ÚLTIMO, sobre o que foi escrito: o manifesto descreve a saída, não a fonte (Decisão 67).
  // `.kiro/agents/` é onde o Kiro procura os agentes dele (JSON), e esta saída não leva nada ali: os
  // subagentes do Claude Code (markdown) ficam de fora — ver o comentário em EXCLUSOES — e o
  // `settings.json` também. A pasta continua na zona imutável do `harness.json` (a fonte declara
  // `.claude/agents/`, e o `kit.mjs` da saída confere a mesma lista), mas fica fora do manifesto:
  // lá, qualquer agente que o projeto criasse reprovaria no `verificar-zona` como arquivo novo.
  escreverTexto(MANIFESTO, manifestoDeArvore(conteudos, { foraDaVerificacao: ['.kiro/agents/'] }));
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
  /** A prova 2 da §3.2: a suíte da SAÍDA. Repassa PYTHON_REPORT — sem ela, 11 vermelhos por desenho. */
  rodarSuite: (saida) => {
    // `--test-reporter=tap`: o resumo e as falhas abaixo são lidos no formato TAP (`# tests`,
    // `not ok`). Sem ele, o Node 24 usa o reporter `spec` e a falha sai "(sem resumo)", sem nomes.
    const r = spawnSync('node', ['--test', '--test-reporter=tap', '.kiro/hooks/*.test.mjs', '.kiro/ferramentas/*.test.mjs'],
      { cwd: saida, encoding: 'utf8', env: process.env, timeout: 600000, shell: false });
    return { status: r.status, saida: `${r.stdout || ''}\n${r.stderr || ''}` };
  },
};

function main(argv) {
  const i = argv.indexOf('--saida');
  if (i < 0 || !argv[i + 1]) {
    process.stderr.write('Uso: node .claude/ferramentas/gerar-kiro.mjs --saida <dir> [--verificar] [--json]\n');
    return 2;
  }
  const saida = argv[i + 1];
  const fonte = process.cwd();
  const r = gerar(fonte, saida, IO_REAL);
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
    if (s.status !== 0) { status = 1; linhas.push(...s.saida.split('\n').filter((l) => /^not ok/.test(l)).map((l) => `  ${l}`)); }
  }
  process.stdout.write((argv.includes('--json') ? JSON.stringify(r, null, 2) : linhas.join('\n')) + '\n');
  return status;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
