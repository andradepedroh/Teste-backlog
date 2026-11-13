import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  reescrever, sobras, excluido, aplicarRemendos, REMENDOS,
  converterClaudeMd, converterRule, gerarHarnessFase, gerarHarnessJson, converterReadme,
  converterManutencao, validarSkill, FRASE_HOOK, FRASE_KIRO,
  planejar, gerar, IO_REAL,
} from './gerar-kiro.mjs';

test('reescrever: do mais específico ao mais genérico — a ordem é o que separa fases de steering', () => {
  assert.equal(reescrever('.claude/rules/harness/security.md'), '.kiro/steering/harness-security.md');
  assert.equal(reescrever('.claude/rules/harness/explore.md'), '.kiro/fases/harness-explore.md');
  assert.equal(reescrever('.claude/rules/harness/plan.md'), '.kiro/fases/harness-plan.md');
  // A de frontend vai para o STEERING (com `fileMatch`), não para `.kiro/fases/`: em `fases/` ela só
  // entrava se o consultor a anexasse à mão.
  assert.equal(reescrever('.claude/rules/harness/frontend.md'), '.kiro/steering/harness-frontend.md');
  assert.equal(reescrever('.claude/rules/harness/'), '.kiro/fases/');
  assert.equal(reescrever('raiz de `.claude/rules/`'), 'raiz de `.kiro/steering/`');
  assert.equal(reescrever('`.claude/rules` e pronto'), '`.kiro/steering` e pronto');
  assert.equal(reescrever('.claude/settings.json'), '.kiro/agents/harness-elo.json');
  assert.equal(reescrever('CLAUDE.md'), 'AGENTS.md');
  assert.equal(reescrever('.claude/skills/spec/SKILL.md'), '.kiro/skills/spec/SKILL.md');
  assert.equal(reescrever('.claude/hooks/kit.mjs'), '.kiro/hooks/kit.mjs');
});

test('reescrever: o token isolado dos testes — join(raiz, ".claude", "hooks")', () => {
  assert.equal(reescrever("join(raiz, '.claude', 'hooks', 'kit.mjs')"), "join(raiz, '.kiro', 'hooks', 'kit.mjs')");
  assert.equal(reescrever("protegidosContidosEm('.CLAUDE')"), "protegidosContidosEm('.KIRO')");
  assert.equal(reescrever('`~/.claude/rules/`'), '`~/.kiro/steering/`');
});

test('reescrever: o que NÃO muda', () => {
  assert.equal(reescrever('.claude-plugin/marketplace.json'), '.claude-plugin/marketplace.json');
  assert.equal(reescrever('roda no Claude Code ou no Cursor'), 'roda no Claude Code ou no Cursor');
  assert.equal(reescrever('linha\r\ncom CRLF\r\n'), 'linha\r\ncom CRLF\r\n');
});

test('reescrever: a linha genérica final — regex escapada, caminho Windows, prosa solta e token colado', () => {
  // A REGRA MAIS GENÉRICA, aprendida na primeira geração real: nenhuma das linhas específicas
  // via barra (`/`) casa um `.claude` dentro de um literal de regex escapado, colado a uma barra
  // invertida de caminho Windows, ou solto em prosa sem aspas — e a sobra apontava os quatro.
  assert.equal(reescrever('/\\.claude\\/hooks\\/kit\\.mjs/'), '/\\.kiro\\/hooks\\/kit\\.mjs/');
  assert.equal(reescrever('.claude\\hooks\\kit.mjs'), '.kiro\\hooks\\kit.mjs');
  assert.equal(reescrever('rm -rf .claude` LIBERA'), 'rm -rf .kiro` LIBERA');
  assert.equal(reescrever('.claudehookskit.mjs'), '.kirohookskit.mjs');
  assert.equal(reescrever('.claude-plugin/marketplace.json'), '.claude-plugin/marketplace.json');
});

test('reescrever: CLAUDE\\.md dentro de um literal de regex escapado (a suíte da saída, prova 2)', () => {
  // `/\bCLAUDE\.md\b/g` exige o ponto sem barra; um teste que cita a mensagem de negação como
  // regex fonte (`` /`CLAUDE\.md` está.../ ``) tem o ponto ESCAPADO no meio, e essa forma escapou
  // da tabela na primeira rodada da suíte da saída (Task 6) — `.kiro/hooks/composicao.test.mjs`
  // e `escrita-bash.test.mjs` continuavam esperando `CLAUDE.md` na mensagem já reescrita.
  assert.equal(reescrever('/CLAUDE\\.md/'), '/AGENTS\\.md/');
  assert.equal(reescrever('assert.match(r.motivo, /CLAUDE\\.md/);'), 'assert.match(r.motivo, /AGENTS\\.md/);');
});

test('sobras: aponta o .claude que sobreviveu, e ignora o .claude-plugin e a linha "gerado de"', () => {
  assert.deepEqual(sobras('ok .kiro/x e .claude-plugin/y'), []);
  assert.deepEqual(sobras("x '.claude' y .claude/z"), ["'.claude'", '.claude/z']);
  // O cabeçalho dos arquivos gerados cita a FONTE de propósito — e a fonte tem `.claude/`.
  assert.deepEqual(sobras('<!-- gerado de CLAUDE.md pelo .claude/ferramentas/gerar-kiro.mjs -->\ncorpo .kiro/x'), []);
  assert.deepEqual(sobras('# gerado de .claude/rules/harness/security.md pelo .claude/ferramentas/gerar-kiro.mjs\nresto .claude/y'), ['.claude/y']);
  // F5: qualquer linha que cite o nome do próprio gerador — não só o cabeçalho "gerado de" — cita
  // a fonte de propósito (o comando de geração no MANUTENCAO, por exemplo) e não conta como sobra.
  assert.deepEqual(sobras('node .claude/ferramentas/gerar-kiro.mjs --saida x'), []);
  // K1 pós-merge (Plano 7): mesma razão, para o comando do empacotador restaurado pelo
  // converterManutencao na seção "Gerar e publicar o zip".
  assert.deepEqual(sobras('node .claude/ferramentas/empacotar.mjs --saida x'), []);
});

test('excluido: o que não vai para a saída', () => {
  for (const rel of ['.git/HEAD', '.superpowers/sdd/x.diff', '.claude/worktrees/a/b', '.harness-template',
    'docs/um-registro-qualquer.md', '.azuredevops/pull_request_template.md', '.claude/hooks/wiring.test.mjs',
    '.claude/ferramentas/gerar-kiro.mjs', '.claude/ferramentas/gerar-kiro.test.mjs', 'node_modules/x',
    // Caches do Python, em qualquer nível — o gerador anda o disco (IO_REAL.listar), não o índice
    // do git, e um `__pycache__` ou `.pyc` esquecido na fonte iria para a saída e seria commitado lá.
    '__pycache__/a.pyc', '.claude/skills/spec-tech-rules/tools/__pycache__/m.cpython-313.pyc', 'x/y/z.pyc',
    // Revisão final (I1): o wiring do Claude Code (settings.json) não vai para a saída.
    '.claude/settings.json',
    // K1 pós-merge: o empacotador do Plano 7 exige CLAUDE.md/settings.json que a saída
    // não tem — o zip do Kiro sai do pipeline `publicar-kiro.yml`.
    '.claude/ferramentas/empacotar.mjs', '.claude/ferramentas/empacotar.test.mjs',
    // O gerador irmão, da versão Cursor: um clone Kiro também não o roda.
    '.claude/ferramentas/gerar-cursor.mjs', '.claude/ferramentas/gerar-cursor.test.mjs']) {
    assert.equal(excluido(rel), true, rel);
  }
  for (const rel of ['.claude/hooks/kit.mjs', '.claude/hooks/kit.test.mjs', 'README.md', 'inputs/.gitkeep',
    '.claude/skills/tools/check-hld.py']) {
    assert.equal(excluido(rel), false, rel);
  }
});

test('aplicarRemendos: troca o literal, e falha alto quando ele não está lá', () => {
  const r = REMENDOS.find((x) => x.arquivo === '.claude/hooks/gramatica.test.mjs');
  assert.ok(r, 'o remendo da gramatica.test existe');
  assert.equal(aplicarRemendos(r.arquivo, `a ${r.de} b`), `a ${r.para} b`);
  assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/);
  // Arquivo sem remendo passa intacto.
  assert.equal(aplicarRemendos('README.md', 'x'), 'x');
});

// ————— Os remendos que a suíte da SAÍDA revelou (Task 6, prova 2 da §3.2) — um por teste que —————
// hard-codava um caminho em tokens separados (que a tabela de reescrita não alcança) ou uma
// fixture de caixa (que a tabela deixa de propósito fora).

test('remendo: sync-log.test.mjs — RULE_PLAN em juntar(..., "rules", "harness", "plan.md")', () => {
  const r = REMENDOS.find((x) => x.arquivo === '.claude/hooks/sync-log.test.mjs');
  assert.ok(r, 'o remendo do RULE_PLAN existe');
  assert.equal(aplicarRemendos(r.arquivo, r.de), r.para);
  assert.match(r.para, /'\.\.', 'fases', 'harness-plan\.md'/);
  assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/);
});

test('remendo: zonas.test.mjs — a segunda leitura da mesma rule do Plan, em tokens separados', () => {
  const r = REMENDOS.find((x) => x.arquivo === '.claude/hooks/zonas.test.mjs');
  assert.ok(r, 'o remendo da rule do Plan em zonas.test existe');
  assert.equal(aplicarRemendos(r.arquivo, r.de), r.para);
  assert.match(r.para, /'\.kiro', 'fases', 'harness-plan\.md'/);
  assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/);
});

test('remendo: kit.test.mjs — as quatro fixtures de caixa que a tabela deixa de propósito fora', () => {
  // Os quatro remendos vivem no MESMO arquivo — aplicarRemendos roda os quatro em sequência sobre
  // o texto inteiro, então o teste junta os quatro literais antes de aplicar (senão os três que
  // faltam acusam órfão sobre um texto que só tem o de um).
  const remendosKit = REMENDOS.filter((x) => x.arquivo === '.claude/hooks/kit.test.mjs');
  assert.equal(remendosKit.length, 4, 'os quatro blocos de teste de caixa têm remendo');
  const texto = remendosKit.map((r) => r.de).join('\n');
  const esperado = remendosKit.map((r) => r.para).join('\n');
  assert.equal(aplicarRemendos('.claude/hooks/kit.test.mjs', texto), esperado);
  assert.throws(() => aplicarRemendos('.claude/hooks/kit.test.mjs', 'sem nenhum dos literais'), /remendo órfão/);
  // As fixtures viram Kiro preservando a MESMA variação de caixa que provava a insensibilidade.
  assert.ok(remendosKit.some((r) => r.para.includes("'.KIRO/hooks/kit.mjs'")));
  assert.ok(remendosKit.some((r) => r.para.includes("'agents.md'") && r.para.includes("'Agents.MD'")));
  assert.ok(remendosKit.some((r) => r.para.includes("'.Kiro/Hooks'") && r.para.includes("'.KIRO/SKILLS'")));
  assert.ok(remendosKit.some((r) => r.para.includes("'C:/repo/.KIRO/hooks/kit.mjs'")));
});

test('remendo: ferramentas.test.mjs — dois remendos: a leitura de rules/harness (Task 5), e o teste do agente ausente (G1)', () => {
  // Este arquivo tem DOIS remendos — os dois literais precisam estar presentes ao mesmo tempo,
  // senão o outro acusa órfão sobre um texto que nunca teve o literal dele (mesmo padrão do teste
  // "kit.test.mjs — as quatro fixtures de caixa", acima).
  const remendosFerramentas = REMENDOS.filter((x) => x.arquivo === '.claude/ferramentas/ferramentas.test.mjs');
  assert.equal(remendosFerramentas.length, 2, 'os dois remendos deste arquivo estão registrados');
  const rRules = remendosFerramentas.find((x) => /'rules', 'harness'/.test(x.de));
  assert.ok(rRules, 'o remendo de join(RAIZ, rules, harness) existe');
  assert.match(rRules.para, /'\.kiro', 'fases'/);
  const rAgente = remendosFerramentas.find((x) => /existsSync/.test(x.para));
  assert.ok(rAgente, 'o remendo do teste do agente ausente existe');
  const texto = remendosFerramentas.map((x) => x.de).join('\n');
  const esperado = remendosFerramentas.map((x) => x.para).join('\n');
  assert.equal(aplicarRemendos(rAgente.arquivo, texto), esperado);
  assert.throws(() => aplicarRemendos(rAgente.arquivo, 'sem nenhum dos literais'), /remendo órfão/);
});

test('remendo (revisão final, 2ª rodada — G1): o teste sem agente AFIRMA a ausência, não silencia com test.skip', () => {
  // A 1ª rodada apagava este teste em silêncio (`test.skip`) — mas o README da própria saída
  // afirma a doutrina "nunca silenciam com `test.skip`" (README.md, seção do PYTHON_REPORT), e um
  // `test.skip` na saída contradiz a doutrina que ela mesma carrega. Substituído por um teste que
  // AFIRMA a ausência do agente: quando a K2 criar `.kiro/agents/harness-elo.json`, este teste fica
  // vermelho.
  const r = REMENDOS.find((x) => x.arquivo === '.claude/ferramentas/ferramentas.test.mjs' && /existsSync/.test(x.para));
  assert.ok(r, 'o remendo do teste do agente ausente existe');
  assert.match(r.de, /^test\('nenhuma ferramenta está registrada no settings\.json', \(\) => \{/);
  assert.match(r.para, /^test\('nenhum agente existe ainda/);
  assert.match(r.para, /existsSync\(join\(RAIZ, '\.claude', 'settings\.json'\)\)/);
  assert.doesNotMatch(r.para, /test\.skip/);
  assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/);
});

test('remendo: kit.mjs — um só remendo (as duas entradas do steering entram na zona imutável)', () => {
  const remendosKitMjs = REMENDOS.filter((x) => x.arquivo === '.claude/hooks/kit.mjs');
  assert.equal(remendosKitMjs.length, 1, 'o remendo do steering é o único do kit.mjs');
  const [r] = remendosKitMjs;
  assert.match(r.para, /harness-security\.md/);
  assert.equal(aplicarRemendos(r.arquivo, r.de), r.para);
  assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/);
});

test('remendo: estado.test.mjs — na saída, a rule de frontend é cobrada pelo `fileMatch` do steering', () => {
  const r = REMENDOS.find((x) => x.arquivo === '.claude/hooks/estado.test.mjs');
  assert.ok(r, 'o remendo do estado.test.mjs existe');
  const fonte = readFileSync(new URL('../hooks/estado.test.mjs', import.meta.url), 'utf8');
  assert.ok(fonte.includes(r.de), 'remendo órfão: o literal não está mais no estado.test.mjs');
  assert.match(r.para, /inclusion: fileMatch/);
  assert.match(r.para, /fileMatchPattern/);
});

test('remendo (revisão final, F5): vendorizacao.test.mjs — o comando de geração sobrevive à reescrita genérica', () => {
  const r = REMENDOS.find((x) => x.arquivo === '.claude/hooks/vendorizacao.test.mjs');
  assert.ok(r, 'o remendo do vendorizacao.test.mjs existe');
  assert.equal(aplicarRemendos(r.arquivo, r.de), r.para);
  assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/);
  // A troca sobrevive à própria reescrever(): nenhuma REESCRITA acha ".claude" no texto novo,
  // porque ele está partido em duas peças concatenadas — exatamente o ponto do remendo.
  assert.ok(!reescrever(r.para).includes('.kiro/ferramentas/gerar-kiro.mjs'));
  assert.ok(reescrever(r.para).includes("'.cla' + 'ude/ferramentas/gerar-kiro.mjs"));
  // Minor #5 (2ª rodada): o truque de concatenação carrega um comentário explicando por quê —
  // sem ele, quem ler a saída vê uma expressão estranha (`'.cla' + 'ude/...'`) sem contexto.
  assert.ok(r.para.includes('partido em duas peças para sobreviver à reescrita'), 'falta o comentário do truque de concatenação');
});

const CLAUDE_MD = '# Harness\n\nTrês fases. O `estado` detecta a fase no início da sessão e\ninjeta a rule correspondente — você não precisa perguntar em que fase estamos.\n\n' +
  '| **Imutável** | `CLAUDE.md`, `.claude/hooks/` | nunca edite |\n\nResto.\n';

test('converterClaudeMd: troca a frase do hook por marcador, e avisa que é gerado', () => {
  const out = converterClaudeMd(CLAUDE_MD);
  assert.match(out, /^<!-- gerado de CLAUDE\.md pelo \.claude\/ferramentas\/gerar-kiro\.mjs/);
  assert.ok(!FRASE_HOOK.test(out), 'a frase velha sumiu');
  assert.ok(out.includes(FRASE_KIRO), 'a frase nova está lá');
  assert.ok(out.includes('Resto.'), 'o resto ficou');
  assert.throws(() => converterClaudeMd('# sem a frase\n'), /marcador/);
});

const RULE = '---\ndescription: Fase Explore — x.\n---\n\n# Explore\n\ncorpo\n';

test('converterRule: steering ganha inclusion, fase não; o corpo é idêntico; o aviso vai no frontmatter', () => {
  const st = converterRule(RULE, '.claude/rules/harness/security.md', { inclusion: 'always' });
  assert.match(st, /^---\n# gerado de \.claude\/rules\/harness\/security\.md pelo/);
  assert.match(st, /\ninclusion: always\n/);
  assert.ok(st.endsWith('\n# Explore\n\ncorpo\n'), 'corpo intacto');
  const fase = converterRule(RULE, '.claude/rules/harness/explore.md');
  assert.ok(!/inclusion:/.test(fase));
  assert.match(fase, /description: Fase Explore/);
  assert.throws(() => converterRule('# sem frontmatter\n', 'x.md'), /frontmatter/);
});

test('converterRule: `paths:` de arquivo vira `inclusion: fileMatch` + `fileMatchPattern` — o Kiro não conhece `paths`', () => {
  const fe = converterRule('---\ndescription: f\npaths: "**/*.{ts,tsx,js,jsx,html,css,mdx}"\n---\n# F\n', '.claude/rules/harness/frontend.md', { inclusion: 'fileMatch' });
  // Lista explícita, sem chaves: a documentação do Kiro mostra glob simples ou lista, e não garante
  // expansão de `{a,b}` — com chave não expandida a rule de frontend nunca carregaria.
  assert.match(fe, /\ninclusion: fileMatch\nfileMatchPattern: \["\*\*\/\*\.ts", "\*\*\/\*\.tsx", "\*\*\/\*\.js", "\*\*\/\*\.jsx", "\*\*\/\*\.html", "\*\*\/\*\.css", "\*\*\/\*\.mdx"\]\n/);
  assert.ok(!/^paths:/m.test(fe), 'o `paths:` inerte não pode ficar');
  assert.match(fe, /\ndescription: f\n/);
  assert.ok(fe.endsWith('\n# F\n'));
  assert.throws(() => converterRule('---\ndescription: f\n---\n# F\n', 'f.md', { inclusion: 'fileMatch' }), /fileMatch.*paths/);
  // A de fase fica fora do steering (`.kiro/fases/`), e o `paths:` dela fica: inerte ali, e é o que o
  // `estado.test.mjs` da saída cobra para provar que a rule de fase não carrega sozinha.
  const fase = converterRule('---\ndescription: e\npaths: ".kiro/fases/harness-explore.md"\n---\n# E\n', 'e.md');
  assert.match(fase, /\npaths: "\.kiro\/fases\/harness-explore\.md"\n/);
  assert.ok(!/inclusion:/.test(fase));
});

test('gerarHarnessFase: sempre incluído, os três anexos, as duas sintaxes, e o aviso sobre .kiro/specs', () => {
  const t = gerarHarnessFase();
  assert.match(t, /^---\n# gerado de \(sem fonte/);
  assert.match(t, /inclusion: always/);
  for (const f of ['explore', 'plan', 'deliver']) assert.ok(t.includes(`@.kiro/fases/harness-${f}.md`), f);
  assert.ok(!t.includes('.kiro/fases/harness-frontend.md'), 'a de frontend não é anexo: está no steering');
  assert.match(t, /`\.kiro\/steering\/harness-frontend\.md`/);
  assert.match(t, /seletor `#`/);
  assert.match(t, /\.kiro\/specs\//);
  assert.match(t, /harness-elo/);
});

test('gerarHarnessJson: zonas reescritas + as duas do steering, geradoDe, runtime Kiro, nome', () => {
  const fonte = {
    nome: 'harness-elo-v2', versao: '2.0.0', kitVersao: 'eng-proc-spec — base upstream 2026-09-09 (Eng_Proc), mantido neste harness desde 2026-09-09 (Decisão 30)',
    runtime: { rotulo: 'Claude Code', cli: 'claude', semCli: 'x' },
    zonaImutavel: ['CLAUDE.md', '.claude/hooks/', '.claude/ferramentas/', '.claude/settings.json', '.claude/templates/', '.claude/rules/harness/', '.claude/skills/'],
    zonaMutavel: ['inputs/', 'outputs/', '.claude/rules/', '.cursor/rules/'],
  };
  const h = gerarHarnessJson(fonte, 'abc1234');
  assert.equal(h.nome, 'harness-elo-v2-kiro');
  assert.equal(h.versao, '2.0.0');
  assert.equal(h.kitVersao, fonte.kitVersao);
  assert.equal(h.geradoDe, 'abc1234');
  assert.equal(h.runtime.cli, 'kiro-cli');
  assert.deepEqual(h.zonaImutavel, [
    'AGENTS.md', '.kiro/hooks/', '.kiro/ferramentas/', '.kiro/agents/harness-elo.json', '.kiro/templates/',
    '.kiro/fases/', '.kiro/skills/', '.kiro/steering/harness-security.md', '.kiro/steering/harness-fase.md',
    '.kiro/steering/harness-frontend.md',
  ]);
  assert.deepEqual(h.zonaMutavel, ['inputs/', 'outputs/', '.kiro/steering/', '.cursor/rules/']);
});

const README = '# Harness Elo v2\n\n' +
  'Harness único de método e produção. Entregue como **pacote `.zip`**: extraia numa pasta vazia. O guia do usuário é distribuído à parte.\n\n' +
  '## Pré-requisitos\n\n| # | Dependência | Para quê | Quando morde |\n|---|---|---|---|\n| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |\n\n' +
  '## Instalação\n\n```bash\ngit clone x\n```\n\n' +
  'Confira que **não** veio `.git/` nem `.harness-template`.\n\n' +
  'Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.\n\n' +
  '## Estrutura\n\n| Caminho | O que é |\n|---|---|\n' +
  // Esta linha já chega REESCRITA a converterReadme — em `gerar()` a fonte passa por `reescrever`
  // antes do conversor, e `.claude/rules/harness/` já virou `.kiro/fases/` a essa altura.
  '| `.kiro/fases/` | as cinco rules do método (zona imutável) |\n\n' +
  '## As duas zonas\n\n| Zona | Caminho | Regra |\n|---|---|---|\n' +
  '| **Imutável** | `CLAUDE.md`, `.claude/hooks/` | nunca edite — a atualização sobrescreve |\n';

test('converterReadme: a linha do runtime, o parágrafo de abertura, e a seção Kiro — às duas pontas', () => {
  const out = converterReadme(README);
  assert.ok(!out.includes('**Claude Code**'));
  assert.match(out, /\| 1 \| \*\*Kiro\*\* \(IDE ou CLI\) \|/);
  assert.ok(!out.includes('Abrir uma sessão do Claude Code na raiz.'));
  assert.match(out, /## Kiro — como abrir/);
  assert.match(out, /kiro-cli chat --agent harness-elo/);
  assert.match(out, /não tem travas até a K2/);
  assert.match(out, /@\.kiro\/fases\/harness-explore\.md/);
  assert.match(out, /^<!-- gerado de README\.md/);
  assert.throws(() => converterReadme('# outro\n'), /marcador/);
});

test('converterReadme (revisão final, F3): a linha das rules de fase (Estrutura) ganha a linha do steering', () => {
  const out = converterReadme(README);
  assert.ok(!out.includes('| `.kiro/fases/` | as cinco rules do método (zona imutável) |'));
  assert.match(out, /\| `\.kiro\/fases\/` \| as três rules de fase — anexadas por sessão, ver `\.kiro\/steering\/harness-fase\.md` \(zona imutável\) \|/);
  assert.match(out, /\| `\.kiro\/steering\/` \| `harness-security\.md` e `harness-fase\.md`, sempre carregados, e `harness-frontend\.md`, carregado ao tocar arquivo de tela \(`fileMatch`\); o resto da pasta é do projeto \(`spec-tech-rules`\) \|/);
  assert.throws(() => converterReadme(README.split('as cinco rules do método').join('sumiu')), /marcador/);
});

// A FONTE já chega REESCRITA ao conversor (gerar() roda reescrever() antes — comentário lá). Este
// fixture cobre os TRÊS marcadores que converterManutencao exige: o comando de geração
// (GERAR_KIRO_*), a linha de EXCLUSOES (G4), e o título "Gerar e publicar o zip" (K1 pós-merge,
// Plano 7) — os três precisam estar presentes ao mesmo tempo, senão o marcador que falta derruba a
// conversão inteira antes de chegar nos outros (mesmo padrão de converterReadme, acima).
const MANUTENCAO_FONTE = '# Manutenção\n\n' +
  '## Gerar a versão Kiro\n\n' +
  '| `EXCLUSOES` | x | módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.kiro/agents/harness-elo.json`, `empacotar.mjs`, `empacotar.test.mjs`) |\n\n' +
  'rode `node .kiro/ferramentas/gerar-kiro.mjs --saida x --verificar`\n\n' +
  '## Gerar e publicar o zip\n\n' +
  'node .kiro/ferramentas/empacotar.mjs --saida x\n\n' +
  'corpo\n';

test('converterManutencao: aviso de gerado no topo, o resto intacto, e o comando aponta para a FONTE', () => {
  const out = converterManutencao(MANUTENCAO_FONTE);
  assert.match(out, /^<!-- gerado de MANUTENCAO\.md/);
  assert.match(out, /Este repositório é GERADO/);
  assert.match(out, /harness-elo-v2/);
  assert.ok(!out.includes('.kiro/ferramentas/gerar-kiro.mjs'), 'o comando ainda aponta para um arquivo que a saída não tem');
  assert.match(out, /node \.claude\/ferramentas\/gerar-kiro\.mjs --saida x --verificar/);
  assert.ok(out.endsWith('corpo\n'));
  assert.throws(() => converterManutencao('# Manutenção\n\nsem tudo\n'), /gerar-kiro\.mjs/);
});

test('converterManutencao (revisão final, 2ª rodada — G4): a linha de EXCLUSOES não chama o agente da K2 de "só Claude Code"', () => {
  // A linha de EXCLUSOES nomeia `.claude/settings.json` como módulo "só do Claude Code" — a tabela
  // de REESCRITAS já trocou isso para `.kiro/agents/harness-elo.json` antes do conversor rodar, e
  // onze linhas abaixo esse MESMO caminho é nomeado como o agente que a K2 entrega. Sem desfazer a
  // troca aqui, a saída se contradiz.
  const out = converterManutencao(MANUTENCAO_FONTE);
  assert.match(out, /\(hoje: `wiring\.test\.mjs`, `\.claude\/settings\.json`, `empacotar\.mjs`, `empacotar\.test\.mjs`\)/);
  assert.ok(!out.includes('.kiro/agents/harness-elo.json'), 'a linha de EXCLUSOES não pode citar o caminho que a K2 entrega');
  assert.throws(() => converterManutencao(MANUTENCAO_FONTE.split('.kiro/agents/harness-elo.json').join('sumiu')), /EXCLUSOES/);
});

test('converterManutencao (K1 pós-merge — Plano 7): o comando do empacotador aponta para a FONTE, e a seção ganha o aviso de edição Claude Code', () => {
  const out = converterManutencao(MANUTENCAO_FONTE);
  assert.ok(!out.includes('.kiro/ferramentas/empacotar.mjs'), 'o comando ainda aponta para um arquivo que a saída não tem');
  assert.match(out, /node \.claude\/ferramentas\/empacotar\.mjs --saida x/);
  // O aviso vem IMEDIATAMENTE depois do título — não em qualquer lugar da seção.
  assert.match(
    out,
    /## Gerar e publicar o zip\n\n> \*\*Edição Claude Code\.\*\* O empacotador \(`empacotar\.mjs`\) não acompanha a saída Kiro — este procedimento vale para o repositório fonte; o zip do Kiro é publicado pelo pipeline `\.azuredevops\/pipelines\/publicar-kiro\.yml` a partir do `gerar-kiro\.mjs`\.\n/,
  );
  assert.throws(() => converterManutencao(MANUTENCAO_FONTE.split('## Gerar e publicar o zip').join('sumiu')), /marcador/);
  // Ao contrário do comando de geração (gerar-kiro.mjs, obrigatório), a ausência do comando do
  // empacotador no texto não derruba a conversão — só o `.split/.join` não encontra nada para trocar.
  const semEmpacotar = MANUTENCAO_FONTE.split('node .kiro/ferramentas/empacotar.mjs --saida x\n\n').join('');
  assert.doesNotThrow(() => converterManutencao(semEmpacotar));
});

test('converterManutencao: o comando do gerador Cursor também aponta para a FONTE, e não é sobra', () => {
  // A seção "Gerar a versão Cursor" cita `.claude/ferramentas/gerar-cursor.mjs`; a reescrita genérica
  // o manda para `.kiro/ferramentas/`, onde a saída não o tem (EXCLUSOES). Sem guarda, como o empacotador.
  const out = converterManutencao(`${MANUTENCAO_FONTE}\nnode .kiro/ferramentas/gerar-cursor.mjs --saida y\n`);
  assert.ok(!out.includes('.kiro/ferramentas/gerar-cursor.mjs'));
  assert.match(out, /node \.claude\/ferramentas\/gerar-cursor\.mjs --saida y/);
  assert.deepEqual(sobras('node .claude/ferramentas/gerar-cursor.mjs --saida y'), []);
});

test('validarSkill: name ≠ pasta é erro; description > 1024 é aviso; dobrado com > conta como uma linha', () => {
  const ok = '---\nname: spec-x\ndescription: >\n  linha um\n  linha dois\nversion: "1"\n---\n# x\n';
  assert.deepEqual(validarSkill('spec-x', ok), { erros: [], avisos: [] });
  const nome = validarSkill('outro', ok);
  assert.equal(nome.erros.length, 1);
  assert.match(nome.erros[0], /name/);
  const longa = '---\nname: spec-x\ndescription: >\n' + '  ' + 'a'.repeat(1030) + '\n---\n';
  const r = validarSkill('spec-x', longa);
  assert.deepEqual(r.erros, []);
  assert.equal(r.avisos.length, 1);
  assert.match(r.avisos[0], /1030/);
  assert.match(validarSkill('spec-x', '# sem frontmatter').erros[0], /frontmatter/);
});

test('planejar: cada classe de arquivo sabe para onde vai e como', () => {
  assert.deepEqual(planejar('CLAUDE.md'), { tipo: 'converter', destino: 'AGENTS.md' });
  assert.deepEqual(planejar('.claude/rules/harness/security.md'), { tipo: 'converter', destino: '.kiro/steering/harness-security.md' });
  assert.deepEqual(planejar('.claude/rules/harness/plan.md'), { tipo: 'converter', destino: '.kiro/fases/harness-plan.md' });
  assert.deepEqual(planejar('.claude/rules/harness/frontend.md'), { tipo: 'converter', destino: '.kiro/steering/harness-frontend.md' });
  assert.deepEqual(planejar('harness.json'), { tipo: 'converter', destino: 'harness.json' });
  assert.deepEqual(planejar('README.md'), { tipo: 'converter', destino: 'README.md' });
  assert.deepEqual(planejar('MANUTENCAO.md'), { tipo: 'converter', destino: 'MANUTENCAO.md' });
  assert.deepEqual(planejar('.claude/skills/spec/SKILL.md'), { tipo: 'copiar', destino: '.kiro/skills/spec/SKILL.md' });
  assert.deepEqual(planejar('.claude/hooks/kit.test.mjs'), { tipo: 'copiar', destino: '.kiro/hooks/kit.test.mjs' });
  assert.deepEqual(planejar('.gitattributes'), { tipo: 'copiar', destino: '.gitattributes' });
  assert.deepEqual(planejar('.claude/hooks/wiring.test.mjs'), { tipo: 'excluir', destino: null });
  assert.deepEqual(planejar('docs/x.md'), { tipo: 'excluir', destino: null });
});

/** Uma fonte MÍNIMA em disco, com um exemplar de cada classe. */
function fonteMinima() {
  const raiz = mkdtempSync(join(tmpdir(), 'gk-fonte-'));
  const w = (rel, txt) => { mkdirSync(dirname(join(raiz, rel)), { recursive: true }); writeFileSync(join(raiz, rel), txt); };
  w('CLAUDE.md', '# H\n\nO `estado` detecta a fase no início da sessão e\ninjeta a rule correspondente — você não precisa perguntar em que fase estamos.\n\n' +
    '| **Imutável** | `CLAUDE.md`, `.claude/hooks/` | nunca edite |\n');
  w('README.md', '# R\n\n' +
    'Entregue como **pacote `.zip`**: extraia numa pasta vazia. O guia do usuário é distribuído à parte.\n\n' +
    '| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |\n\n' +
    'Confira que **não** veio `.git/` nem `.harness-template`.\n\n' +
    'Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.\n\n' +
    '| `.claude/rules/harness/` | as cinco rules do método (zona imutável) |\n\n' +
    '| **Imutável** | `CLAUDE.md`, `.claude/hooks/` | nunca edite — a atualização sobrescreve |\n\n' +
    'Suíte: `node --test .claude/hooks/*.test.mjs .claude/ferramentas/*.test.mjs`\n');
  w('MANUTENCAO.md', '# M\n\n' +
    '1. Rode a suíte inteira.\n' +
    '2. Confira `harness.json`.\n\n' +
    '| `EXCLUSOES` | x | módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.claude/settings.json`, `empacotar.mjs`, `empacotar.test.mjs`) |\n\n' +
    '```bash\nnode .claude/ferramentas/gerar-kiro.mjs --saida ../harness-elo-v2-kiro --verificar\n```\n\n' +
    '## Gerar e publicar o zip\n\n' +
    'O pacote `.zip` sai do HEAD, sem `.git/` nem `.harness-template`.\n\n' +
    '```bash\nnode .claude/ferramentas/empacotar.mjs --saida <dir>\n```\n');
  w('harness.json', JSON.stringify({ nome: 'harness-elo-v2', versao: '2.0.0', kitVersao: 'k', zonaImutavel: ['CLAUDE.md', '.claude/skills/'], zonaMutavel: ['inputs/'] }));
  w('.claude/rules/harness/security.md', '---\ndescription: s\n---\n\n# S\n');
  w('.claude/rules/harness/explore.md', '---\ndescription: e\n---\n\n# E — veja `.claude/templates/gaps.md`\n');
  w('.claude/rules/harness/frontend.md', '---\ndescription: f\npaths: "**/*.{ts,tsx}"\n---\n\n# F\n');
  w('.claude/skills/spec-x/SKILL.md', '---\nname: spec-x\ndescription: d\n---\n# lê `.claude/rules/` e CLAUDE.md\r\n');
  w('.claude/hooks/kit.mjs', "export const Z = ['CLAUDE.md',\n  '.claude/hooks/',\n  '.claude/skills/',\n];\n");
  w('.claude/hooks/gramatica.test.mjs', "const r = join(RAIZ, '.claude', 'rules', 'harness', 'explore.md');\n");
  w('.claude/hooks/wiring.test.mjs', 'excluído\n');
  w('.claude/ferramentas/ferramentas.test.mjs', "const D = join(RAIZ, '.claude', 'rules', 'harness');\n" +
    "test('nenhuma ferramenta está registrada no settings.json', () => {\n" +
    "  // Se estivesse, ela seria verificador: passaria a rodar por evento, com uma tool call parada\n" +
    "  // esperando, e o orçamento de ≤50 ms da Decisão 14 passaria a valer sobre ela. Nenhuma foi\n" +
    "  // escrita para isso.\n" +
    "  const bruto = readFileSync(join(RAIZ, '.claude', 'settings.json'), 'utf8');\n" +
    "  for (const f of ferramentas()) {\n" +
    "    assert.ok(!bruto.includes(f), `${f} aparece no settings.json — ferramenta não é verificador`);\n" +
    "  }\n" +
    "});\n");
  // Revisão final (I1): o wiring do Claude Code, que fica de fora da saída.
  w('.claude/settings.json', '{"hooks": {}}\n');
  // K1 pós-merge (Plano 7): o empacotador do zip, que exige o settings.json acima e por isso
  // também fica de fora da saída Kiro (K2 decide se ela ganha um empacotador próprio).
  w('.claude/ferramentas/empacotar.mjs', 'exige CLAUDE.md e .claude/settings.json\n');
  w('.claude/ferramentas/empacotar.test.mjs', 'excluído\n');
  w('.gitattributes', '* text=auto eol=lf\n.claude/skills/** -text\n');
  w('docs/x.md', 'fora\n');
  w('.superpowers/sdd/x.diff', 'fora\n');
  w('inputs/.gitkeep', '');
  w('bin.dat', Buffer.from([0, 1, 2, 255]));
  return raiz;
}

/** O `io` real, com `sha`, `gitInit` e `rodarSuite` dublados — a suíte real é a Task 6. */
const ioDeTeste = { ...IO_REAL, sha: () => 'deadbee', gitInit: () => {}, rodarSuite: () => ({ status: 0, saida: '' }) };

test('gerar: a saída inteira, a partir da fonte mínima', () => {
  const fonte = fonteMinima();
  const saida = mkdtempSync(join(tmpdir(), 'gk-saida-'));
  writeFileSync(join(saida, 'lixo-anterior.txt'), 'x'); // a geração anterior é apagada
  mkdirSync(join(saida, '.git')); writeFileSync(join(saida, '.git', 'HEAD'), 'ref'); // e o .git fica
  const r = gerar(fonte, saida, ioDeTeste);

  const ler = (rel) => readFileSync(join(saida, rel), 'utf8');
  assert.ok(!existsSync(join(saida, 'lixo-anterior.txt')));
  assert.equal(ler('.git/HEAD'), 'ref');
  assert.match(ler('AGENTS.md'), /^<!-- gerado de CLAUDE\.md/);
  assert.match(ler('.kiro/steering/harness-security.md'), /inclusion: always/);
  assert.match(ler('.kiro/fases/harness-explore.md'), /`\.kiro\/templates\/gaps\.md`/);
  assert.match(ler('.kiro/steering/harness-frontend.md'), /\ninclusion: fileMatch\nfileMatchPattern: \["\*\*\/\*\.ts", "\*\*\/\*\.tsx"\]\n/);
  assert.ok(!existsSync(join(saida, '.kiro/fases/harness-frontend.md')), 'a de frontend não fica em fases/');
  assert.match(ler('.kiro/steering/harness-fase.md'), /@\.kiro\/fases\/harness-plan\.md/);
  assert.equal(ler('.kiro/skills/spec-x/SKILL.md'), '---\nname: spec-x\ndescription: d\n---\n# lê `.kiro/steering/` e AGENTS.md\r\n', 'reescrito, CRLF preservado');
  assert.match(ler('.kiro/hooks/kit.mjs'), /'\.kiro\/steering\/harness-frontend\.md',\n\];/, 'remendo do kit aplicado e reescrito');
  assert.match(ler('.kiro/hooks/gramatica.test.mjs'), /'\.kiro', 'fases', 'harness-explore\.md'/);
  assert.match(ler('.kiro/ferramentas/ferramentas.test.mjs'), /'\.kiro', 'fases'\)/);
  // Revisão final, 2ª rodada (G1): o teste sem settings.json/agente afirma a ausência em vez de
  // silenciar com test.skip — a doutrina do README diz "nunca silenciam com test.skip".
  assert.match(ler('.kiro/ferramentas/ferramentas.test.mjs'), /existsSync\(join\(RAIZ, '\.kiro', 'settings\.json'\)\)/, 'remendo do agente ausente aplicado e reescrito (G1)');
  assert.match(ler('.kiro/ferramentas/ferramentas.test.mjs'), /nenhum agente existe ainda/, 'G1: o teste afirma a ausência do agente');
  assert.ok(!ler('.kiro/ferramentas/ferramentas.test.mjs').includes('test.skip'), 'G1: nenhum test.skip na saída — contradiria a doutrina do próprio README');
  assert.ok(!existsSync(join(saida, '.kiro/hooks/wiring.test.mjs')));
  assert.ok(!existsSync(join(saida, 'docs')));
  assert.ok(!existsSync(join(saida, '.superpowers')));
  assert.match(ler('.gitattributes'), /\.kiro\/skills\/\*\* -text/);
  assert.match(ler('README.md'), /## Kiro — como abrir/);
  assert.match(ler('README.md'), /node --test \.kiro\/hooks\/\*\.test\.mjs \.kiro\/ferramentas\/\*\.test\.mjs/);
  // Revisão final (I1): o wiring do Claude Code não vai para a saída.
  assert.ok(!existsSync(join(saida, '.kiro/agents')), 'nenhum agente do Claude Code sobrou na saída');
  // K1 pós-merge (Plano 7): o empacotador do zip do Claude Code também não vai — exige o
  // settings.json, que a saída não tem.
  assert.ok(!existsSync(join(saida, '.kiro/ferramentas/empacotar.mjs')));
  assert.ok(!existsSync(join(saida, '.kiro/ferramentas/empacotar.test.mjs')));
  assert.match(ler('README.md'), /as três rules de fase/);
  assert.match(ler('MANUTENCAO.md'), /GERADO/);
  // F5: o comando de geração no MANUTENCAO da saída continua citando o gerador na FONTE.
  assert.match(ler('MANUTENCAO.md'), /node \.claude\/ferramentas\/gerar-kiro\.mjs --saida \.\.\/harness-elo-v2-kiro --verificar/);
  // Revisão final, 2ª rodada (G4): a linha de EXCLUSOES continua citando `.claude/settings.json` —
  // não o caminho do agente que a K2 entrega, onze linhas abaixo.
  assert.match(ler('MANUTENCAO.md'), /`\.claude\/settings\.json`, `empacotar\.mjs`, `empacotar\.test\.mjs`/);
  // K1 pós-merge (Plano 7): o comando do empacotador na saída continua citando a FONTE, e a seção
  // ganha o aviso de que o procedimento não vale para esta versão Kiro.
  assert.match(ler('MANUTENCAO.md'), /node \.claude\/ferramentas\/empacotar\.mjs --saida <dir>/);
  assert.match(ler('MANUTENCAO.md'), /## Gerar e publicar o zip\n\n> \*\*Edição Claude Code\.\*\*/);
  assert.ok(existsSync(join(saida, 'inputs/.gitkeep')));
  assert.deepEqual([...readFileSync(join(saida, 'bin.dat'))], [0, 1, 2, 255], 'binário passa intacto');
  const h = JSON.parse(ler('harness.json'));
  assert.equal(h.geradoDe, 'deadbee');
  assert.deepEqual(h.zonaImutavel, ['AGENTS.md', '.kiro/skills/', '.kiro/steering/harness-security.md', '.kiro/steering/harness-fase.md', '.kiro/steering/harness-frontend.md']);

  assert.deepEqual(r.sobras, [], 'nenhum .claude sobreviveu');
  assert.equal(r.avisos.length, 0);
  assert.ok(r.escritos.includes('AGENTS.md'));
});

test('gerar: name ≠ pasta em UMA skill derruba a geração inteira, antes de escrever', () => {
  const fonte = fonteMinima();
  mkdirSync(join(fonte, '.claude', 'skills', 'spec-y'), { recursive: true });
  writeFileSync(join(fonte, '.claude', 'skills', 'spec-y', 'SKILL.md'), '---\nname: errado\ndescription: d\n---\n');
  const saida = mkdtempSync(join(tmpdir(), 'gk-saida-'));

  assert.throws(() => gerar(fonte, saida, ioDeTeste), /name "errado" difere da pasta/);
  assert.ok(!existsSync(join(saida, 'AGENTS.md')), 'a validação vem antes da escrita — nada foi gravado');
});
