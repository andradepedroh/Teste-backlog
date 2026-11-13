import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  reescrever, sobras, excluido, aplicarRemendos, REMENDOS, EXCLUSOES,
  converterClaudeMd, converterRule, gerarHarnessFase, gerarHarnessJson, converterReadme,
  converterManutencao, converterSettings, converterAgente, validarSkill, FRASE_HOOK, FRASE_CURSOR,
  gerarAdaptadorShell, gerarAdaptadorSessionStart, HOOKS, GERADOS,
  planejar, gerar, IO_REAL,
} from './gerar-cursor.mjs';

test('reescrever: as rules do harness mudam de pasta E de extensão; o resto de .claude vira .cursor', () => {
  assert.equal(reescrever('.claude/rules/harness/security.md'), '.cursor/rules/harness/security.mdc');
  assert.equal(reescrever('.claude/rules/harness/explore.md'), '.cursor/rules/harness/explore.mdc');
  assert.equal(reescrever('.claude/rules/harness/frontend.md'), '.cursor/rules/harness/frontend.mdc');
  assert.equal(reescrever('.claude/rules/harness/'), '.cursor/rules/harness/');
  assert.equal(reescrever('raiz de `.claude/rules/`'), 'raiz de `.cursor/rules/`');
  assert.equal(reescrever('.claude/settings.json'), '.cursor/hooks.json');
  assert.equal(reescrever('CLAUDE.md'), 'AGENTS.md');
  assert.equal(reescrever('.claude/skills/spec/SKILL.md'), '.cursor/skills/spec/SKILL.md');
  assert.equal(reescrever('.claude/agents/corretor.md'), '.cursor/agents/corretor.md');
  assert.equal(reescrever('.claude/hooks/kit.mjs'), '.cursor/hooks/kit.mjs');
});

test('reescrever: token de join, caixa alta entre aspas, regex escapada, caminho Windows', () => {
  assert.equal(reescrever("join(raiz, '.claude', 'hooks', 'kit.mjs')"), "join(raiz, '.cursor', 'hooks', 'kit.mjs')");
  assert.equal(reescrever("protegidosContidosEm('.CLAUDE')"), "protegidosContidosEm('.CURSOR')");
  assert.equal(reescrever('/\\.claude\\/hooks\\/kit\\.mjs/'), '/\\.cursor\\/hooks\\/kit\\.mjs/');
  assert.equal(reescrever('.claude\\hooks\\kit.mjs'), '.cursor\\hooks\\kit.mjs');
  assert.equal(reescrever('/CLAUDE\\.md/'), '/AGENTS\\.md/');
});

test('reescrever: o que NÃO muda', () => {
  assert.equal(reescrever('.claude-plugin/marketplace.json'), '.claude-plugin/marketplace.json');
  assert.equal(reescrever('roda no Claude Code ou no Cursor'), 'roda no Claude Code ou no Cursor');
  assert.equal(reescrever('.claude/rules/harness/outra.md'), '.cursor/rules/harness/outra.md', 'só as cinco rules conhecidas ganham .mdc');
  assert.equal(reescrever('linha\r\ncom CRLF\r\n'), 'linha\r\ncom CRLF\r\n');
});

test('sobras: aponta o .claude que sobreviveu, e ignora as citações deliberadas da fonte', () => {
  assert.deepEqual(sobras('ok .cursor/x e .claude-plugin/y'), []);
  assert.deepEqual(sobras("x '.claude' y .claude/z"), ["'.claude'", '.claude/z']);
  assert.deepEqual(sobras('# gerado de .claude/rules/harness/security.md pelo .claude/ferramentas/gerar-cursor.mjs\nresto .claude/y'), ['.claude/y']);
  assert.deepEqual(sobras('node .claude/ferramentas/gerar-kiro.mjs --saida x'), []);
  assert.deepEqual(sobras('node .claude/ferramentas/empacotar.mjs --saida x'), []);
});

test('excluido: o que não vai para a saída', () => {
  for (const rel of ['.git/HEAD', '.superpowers/sdd/x.diff', '.claude/worktrees/a/b', '.harness-template',
    'docs/x.md', '.azuredevops/pipelines/cursor.yml', '.claude/hooks/wiring.test.mjs',
    '.claude/ferramentas/gerar-cursor.mjs', '.claude/ferramentas/gerar-cursor.test.mjs',
    '.claude/ferramentas/gerar-kiro.mjs', '.claude/ferramentas/gerar-kiro.test.mjs',
    '.claude/ferramentas/empacotar.mjs', '.claude/ferramentas/empacotar.test.mjs', 'node_modules/x',
    '.cursor/rules/do-projeto.mdc',
    '__pycache__/a.pyc', '.claude/skills/spec-tech-rules/tools/__pycache__/m.cpython-313.pyc', 'x/y/z.pyc']) {
    assert.equal(excluido(rel), true, rel);
  }
  // Ao contrário da versão Kiro: o Cursor tem subagentes e hooks, então os dois vão (convertidos).
  for (const rel of ['.claude/hooks/kit.mjs', '.claude/agents/corretor.md', '.claude/settings.json', 'README.md',
    'inputs/.gitkeep', '.claude/skills/tools/check-hld.py']) {
    assert.equal(excluido(rel), false, rel);
  }
  assert.ok(EXCLUSOES.includes('.claude/ferramentas/gerar-kiro.mjs'), 'um clone Cursor também não gera Kiro');
});

test('aplicarRemendos: troca o literal, e falha alto quando ele não está lá', () => {
  for (const r of REMENDOS) {
    const doMesmoArquivo = REMENDOS.filter((x) => x.arquivo === r.arquivo);
    const texto = doMesmoArquivo.map((x) => x.de).join('\n');
    assert.equal(aplicarRemendos(r.arquivo, texto), doMesmoArquivo.map((x) => x.para).join('\n'), r.arquivo);
    assert.throws(() => aplicarRemendos(r.arquivo, 'sem o literal'), /remendo órfão/, r.arquivo);
  }
  assert.equal(aplicarRemendos('README.md', 'x'), 'x');
});

test('remendos: todos os literais ainda estão na fonte deste repositório', () => {
  // A prova barata do alarme de remendo órfão: sem gerar nada, cada `de` tem que estar no arquivo dele.
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  for (const r of REMENDOS) {
    assert.ok(readFileSync(join(raiz, r.arquivo), 'utf8').includes(r.de), `remendo órfão: ${r.arquivo}`);
  }
});

test('remendo: a cópia do vendorizacao.test sobrevive à reescrita genérica (o comando aponta para a FONTE)', () => {
  const r = REMENDOS.find((x) => x.arquivo === '.claude/hooks/vendorizacao.test.mjs');
  assert.ok(r);
  assert.ok(!reescrever(r.para).includes('.cursor/ferramentas/gerar-kiro.mjs'));
  assert.ok(r.para.includes('partido em duas peças para sobreviver à reescrita'));
});

const CLAUDE_MD = '# Harness\n\nTrês fases. O `estado` detecta a fase no início da sessão e\ninjeta a rule correspondente — você não precisa perguntar em que fase estamos.\n\nResto.\n';

test('converterClaudeMd: a frase do hook ganha o evento do Cursor e o recuo, e avisa que é gerado', () => {
  const out = converterClaudeMd(CLAUDE_MD);
  assert.match(out, /^<!-- gerado de CLAUDE\.md pelo \.claude\/ferramentas\/gerar-cursor\.mjs/);
  assert.ok(!FRASE_HOOK.test(out));
  assert.ok(out.includes(FRASE_CURSOR));
  assert.match(out, /sessionStart/);
  assert.match(out, /harness-fase\.mdc/);
  assert.ok(out.includes('Resto.'));
  assert.throws(() => converterClaudeMd('# sem a frase\n'), /marcador/);
});

test('converterRule: paths vira globs sem aspas; alwaysApply explícito; corpo intacto', () => {
  const fase = converterRule('---\ndescription: Fase Explore.\npaths: ".cursor/rules/harness/explore.mdc"\n---\n\n# E\n', 'x.md');
  assert.match(fase, /^---\n# gerado de x\.md pelo/);
  assert.match(fase, /\ndescription: Fase Explore\.\n/);
  assert.match(fase, /\nglobs: \.cursor\/rules\/harness\/explore\.mdc\n/);
  assert.match(fase, /\nalwaysApply: false\n---\n/);
  assert.ok(!/paths:/.test(fase));
  assert.ok(fase.endsWith('\n# E\n'));
  // O Cursor lê o `globs:` como lista separada por vírgula: as chaves do glob da fonte, cujas vírgulas
  // ele partiria no meio (`**/*.{ts` e `tsx}`), viram a lista expandida, sem espaço.
  const fe = converterRule('---\ndescription: f\npaths: "**/*.{ts,tsx,js,jsx,html,css,mdx}"\n---\n# F\n', 'f.md');
  assert.match(fe, /\nglobs: \*\*\/\*\.ts,\*\*\/\*\.tsx,\*\*\/\*\.js,\*\*\/\*\.jsx,\*\*\/\*\.html,\*\*\/\*\.css,\*\*\/\*\.mdx\n/);
  const lista = converterRule('---\ndescription: f\npaths: "**/*.ts, src/{a,b}/*.md"\n---\n# F\n', 'f.md');
  assert.match(lista, /\nglobs: \*\*\/\*\.ts,src\/a\/\*\.md,src\/b\/\*\.md\n/);
  const sec = converterRule('---\ndescription: s\n---\n# S\n', 's.md', { alwaysApply: true });
  assert.match(sec, /\nalwaysApply: true\n/);
  assert.ok(!/globs:/.test(sec));
  assert.throws(() => converterRule('---\npaths: "x"\n---\n', 's.md', { alwaysApply: true }), /sempre aplicada/);
  assert.throws(() => converterRule('# sem frontmatter\n', 'x.md'), /frontmatter/);
});

test('gerarHarnessFase: sempre aplicada, as três rules de fase, e o aviso do subagente', () => {
  const t = gerarHarnessFase();
  assert.match(t, /^---\n# gerado de \(sem fonte/);
  assert.match(t, /\nalwaysApply: true\n/);
  for (const f of ['explore', 'plan', 'deliver']) assert.ok(t.includes(`.cursor/rules/harness/${f}.mdc`), f);
  assert.match(t, /sessionStart/);
  assert.match(t, /Subagente não recebe/);
  assert.deepEqual(sobras(t), []);
});

const SETTINGS = JSON.stringify({ hooks: {
  SessionStart: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/estado.mjs' }] }],
  PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/pretooluse.mjs' }] }],
  PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/posttooluse.mjs' }] }],
} });

test('converterSettings: os eventos do Claude Code viram os do Cursor pela tabela HOOKS', () => {
  const h = JSON.parse(converterSettings(SETTINGS));
  assert.equal(h.version, 1);
  assert.deepEqual(h.hooks, {
    sessionStart: [{ command: 'node .cursor/hooks/cursor-sessionstart.mjs' }],
    beforeShellExecution: [{ command: 'node .cursor/hooks/cursor-shell.mjs' }],
  });
  // Os adaptadores que o hooks.json chama são gerados — nenhum comando aponta para o vazio.
  for (const defs of Object.values(h.hooks)) {
    for (const d of defs) assert.ok(GERADOS[d.command.replace(/^node /, '')], d.command);
  }
});

test('converterSettings: hook novo na fonte derruba a geração até alguém decidir o equivalente', () => {
  assert.throws(() => converterSettings(JSON.stringify({ hooks: { Stop: [] } })), /Stop sem equivalente/);
  const outroComando = SETTINGS.replace('node .claude/hooks/estado.mjs', 'node .claude/hooks/outro.mjs');
  assert.throws(() => converterSettings(outroComando), /não é o da tabela HOOKS/);
  assert.equal(HOOKS.PostToolUse.comando, 'node .claude/hooks/posttooluse.mjs');
  assert.deepEqual(HOOKS.PostToolUse.cursor, {}, 'os avisos do PostToolUse ficam como biblioteca');
});

test('converterSettings: o settings.json DESTE repositório tem equivalente decidido', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  assert.doesNotThrow(() => converterSettings(readFileSync(join(raiz, '.claude', 'settings.json'), 'utf8')));
});

/** Os adaptadores, escritos ao lado de dublês de `estado.mjs` e `pretooluse.mjs`, e importados. */
async function adaptadores() {
  const dir = mkdtempSync(join(tmpdir(), 'gc-adapt-'));
  writeFileSync(join(dir, 'estado.mjs'), "export const coletar = () => ({ fase: 'plan' });\nexport const montarContexto = (f) => `fase ${f.fase}`;\n");
  writeFileSync(join(dir, 'pretooluse.mjs'),
    "export const REGISTRO = [];\n" +
    "export function interpretarEntrada(b) { const t = String(b || '').trim(); if (!t) return { acao: 'allow' }; try { return { acao: 'prosseguir', payload: JSON.parse(t) }; } catch { return { acao: 'deny', motivo: 'ilegível' }; } }\n" +
    "export function despachar(p, reg) { for (const v of reg) if (v.gatilhos.includes(p.tool_name)) { const r = v.executar(p); if (r) return r; } return { acao: 'allow', motivo: null }; }\n");
  writeFileSync(join(dir, 'cursor-shell.mjs'), gerarAdaptadorShell());
  writeFileSync(join(dir, 'cursor-sessionstart.mjs'), gerarAdaptadorSessionStart());
  return { dir, shell: await import(new URL(`file:///${join(dir, 'cursor-shell.mjs').replace(/\\/g, '/')}`)) };
}

test('adaptador do shell: payload do Cursor vira tool Bash, veredito volta como permission', async () => {
  const { shell } = await adaptadores();
  assert.deepEqual(shell.paraPayloadClaude({ command: 'git push', cwd: '/p' }), { tool_name: 'Bash', tool_input: { command: 'git push' }, cwd: '/p' });
  assert.deepEqual(shell.respostaCursor({ acao: 'allow' }), { permission: 'allow' });
  assert.deepEqual(shell.respostaCursor({ acao: 'deny', motivo: 'm' }), { permission: 'deny', user_message: 'm', agent_message: 'm' });
  assert.equal(shell.decidir('').permission, 'allow');
  assert.equal(shell.decidir('{x').permission, 'deny', 'payload ilegível falha fechado');
  const reg = [{ gatilhos: ['Bash'], executar: (p) => (p.tool_input.command.startsWith('rm') ? { acao: 'deny', motivo: 'não' } : null) }];
  assert.equal(shell.decidir(JSON.stringify({ command: 'rm -rf x' }), reg).permission, 'deny');
  assert.equal(shell.decidir(JSON.stringify({ command: 'ls' }), reg).permission, 'allow');
});

test('adaptador do sessionStart: o contexto do estado.mjs sai como additional_context', async () => {
  const { dir } = await adaptadores();
  const r = spawnSync('node', [join(dir, 'cursor-sessionstart.mjs')], { input: '{}', encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout), { additional_context: 'fase plan' });
});

test('converterAgente: model vira inherit; o resto do frontmatter e o corpo ficam', () => {
  const out = converterAgente('---\nname: v\ndescription: d\ntools: Read, Write\nmodel: sonnet\nomitClaudeMd: true\nmaxTurns: 8\n---\n\ncorpo\n', 'a.md');
  assert.equal(out, '---\nname: v\ndescription: d\ntools: Read, Write\nmodel: inherit\nomitClaudeMd: true\nmaxTurns: 8\n---\n\ncorpo\n');
  assert.throws(() => converterAgente('sem frontmatter', 'a.md'), /frontmatter/);
});

test('gerarHarnessJson: zonas reescritas sem duplicata, geradoDe, runtime do Cursor, nome', () => {
  const fonte = {
    nome: 'harness-elo-v2', versao: '2.5.0', kitVersao: 'k',
    zonaImutavel: ['CLAUDE.md', '.claude/hooks/', '.claude/settings.json', '.claude/rules/harness/', '.claude/agents/', '.claude/skills/'],
    zonaMutavel: ['inputs/', 'outputs/', '.claude/rules/', '.cursor/rules/'],
  };
  const h = gerarHarnessJson(fonte, 'abc1234');
  assert.equal(h.nome, 'harness-elo-v2-cursor');
  assert.equal(h.versao, '2.5.0');
  assert.equal(h.geradoDe, 'abc1234');
  assert.equal(h.runtime.rotulo, 'Cursor');
  assert.equal(h.runtime.cli, 'cursor-agent');
  assert.deepEqual(h.zonaImutavel, ['AGENTS.md', '.cursor/hooks/', '.cursor/hooks.json', '.cursor/rules/harness/', '.cursor/agents/', '.cursor/skills/']);
  assert.deepEqual(h.zonaMutavel, ['inputs/', 'outputs/', '.cursor/rules/']);
});

// Chega JÁ REESCRITO ao conversor, como em `gerar()`.
const README = '# Harness Elo v2\n\n' +
  '| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |\n\n' +
  'Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.\n\n' +
  '| `.cursor/rules/harness/` | as cinco rules do método (zona imutável) |\n';

test('converterReadme: a linha do runtime, a abertura, a linha das rules e a seção Cursor', () => {
  const out = converterReadme(README);
  assert.match(out, /^<!-- gerado de README\.md/);
  assert.ok(!out.includes('**Claude Code**'));
  assert.match(out, /\| 1 \| \*\*Cursor\*\* \(editor ou `cursor-agent`\) \|/);
  assert.match(out, /## Cursor — como abrir/);
  assert.match(out, /Travas parciais nesta versão/);
  assert.match(out, /harness-fase\.mdc` \(zona imutável\)/);
  assert.match(out, /ambiente \*\*Cursor\*\*/);
  assert.throws(() => converterReadme('# outro\n'), /marcador/);
  assert.throws(() => converterReadme(README.split('as cinco rules do método').join('sumiu')), /marcador/);
});

const MANUTENCAO = '# Manutenção\n\n' +
  '| `EXCLUSOES` | x | módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.cursor/hooks.json`, `empacotar.mjs`, `empacotar.test.mjs`) |\n\n' +
  'node .cursor/ferramentas/gerar-kiro.mjs --saida ../harness-elo-v2-kiro --verificar\n\n' +
  'node .cursor/ferramentas/gerar-cursor.mjs --saida ../harness-elo-v2-cursor --verificar\n\n' +
  '## Gerar e publicar o zip\n\n' +
  'node .cursor/ferramentas/empacotar.mjs --saida x\n\ncorpo\n';

test('converterManutencao: aviso de gerado, os comandos apontam para a FONTE, EXCLUSOES restaurada', () => {
  const out = converterManutencao(MANUTENCAO);
  assert.match(out, /^<!-- gerado de MANUTENCAO\.md/);
  assert.match(out, /Este repositório é GERADO/);
  assert.ok(!out.includes('.cursor/ferramentas/'), 'nenhum comando aponta para um arquivo que a saída não tem');
  assert.match(out, /node \.claude\/ferramentas\/gerar-kiro\.mjs --saida/);
  assert.match(out, /node \.claude\/ferramentas\/gerar-cursor\.mjs --saida/);
  assert.match(out, /node \.claude\/ferramentas\/empacotar\.mjs --saida x/);
  assert.match(out, /\(hoje: `wiring\.test\.mjs`, `\.claude\/settings\.json`, `empacotar\.mjs`, `empacotar\.test\.mjs`\)/);
  assert.match(out, /## Gerar e publicar o zip\n\n> \*\*Edição Claude Code\.\*\*/);
  assert.ok(out.endsWith('corpo\n'));
  assert.deepEqual(sobras(out), [], 'as citações deliberadas da fonte não contam como sobra');
  for (const marcador of ['.cursor/ferramentas/gerar-cursor.mjs', '.cursor/ferramentas/gerar-kiro.mjs', '.cursor/hooks.json', '## Gerar e publicar o zip']) {
    assert.throws(() => converterManutencao(MANUTENCAO.split(marcador).join('sumiu')), /MANUTENCAO\.md/, marcador);
  }
});

test('validarSkill: name ≠ pasta, name fora do formato e description vazia são erro; > 1024 é aviso', () => {
  const ok = '---\nname: spec-x\ndescription: >\n  linha um\n  linha dois\n---\n# x\n';
  assert.deepEqual(validarSkill('spec-x', ok), { erros: [], avisos: [] });
  assert.match(validarSkill('outro', ok).erros[0], /difere da pasta/);
  assert.ok(validarSkill('Spec_X', ok.replace('spec-x', 'Spec_X')).erros.some((e) => /formato do Cursor/.test(e)));
  assert.match(validarSkill('spec-x', '---\nname: spec-x\n---\n').erros[0], /sem description/);
  const longa = validarSkill('spec-x', `---\nname: spec-x\ndescription: >\n  ${'a'.repeat(1030)}\n---\n`);
  assert.deepEqual(longa.erros, []);
  assert.match(longa.avisos[0], /1030/);
  assert.match(validarSkill('spec-x', '# sem frontmatter').erros[0], /frontmatter/);
});

test('planejar: cada classe de arquivo sabe para onde vai e como', () => {
  assert.deepEqual(planejar('CLAUDE.md'), { tipo: 'converter', destino: 'AGENTS.md' });
  assert.deepEqual(planejar('.claude/rules/harness/security.md'), { tipo: 'converter', destino: '.cursor/rules/harness/security.mdc' });
  assert.deepEqual(planejar('.claude/rules/harness/plan.md'), { tipo: 'converter', destino: '.cursor/rules/harness/plan.mdc' });
  assert.deepEqual(planejar('.claude/settings.json'), { tipo: 'converter', destino: '.cursor/hooks.json' });
  assert.deepEqual(planejar('.claude/agents/corretor.md'), { tipo: 'converter', destino: '.cursor/agents/corretor.md' });
  assert.deepEqual(planejar('harness.json'), { tipo: 'converter', destino: 'harness.json' });
  assert.deepEqual(planejar('.claude/skills/spec/SKILL.md'), { tipo: 'copiar', destino: '.cursor/skills/spec/SKILL.md' });
  assert.deepEqual(planejar('.claude/hooks/kit.test.mjs'), { tipo: 'copiar', destino: '.cursor/hooks/kit.test.mjs' });
  assert.deepEqual(planejar('.claude/hooks/wiring.test.mjs'), { tipo: 'excluir', destino: null });
  assert.deepEqual(planejar('docs/x.md'), { tipo: 'excluir', destino: null });
});

/** Uma fonte MÍNIMA em disco, com um exemplar de cada classe. */
function fonteMinima() {
  const raiz = mkdtempSync(join(tmpdir(), 'gc-fonte-'));
  const w = (rel, txt) => { mkdirSync(dirname(join(raiz, rel)), { recursive: true }); writeFileSync(join(raiz, rel), txt); };
  w('CLAUDE.md', '# H\n\nO `estado` detecta a fase no início da sessão e\ninjeta a rule correspondente — você não precisa perguntar em que fase estamos.\n\n' +
    '| **Imutável** | `CLAUDE.md`, `.claude/hooks/` | nunca edite |\n');
  w('README.md', '# R\n\n' +
    '| 1 | **Claude Code** | runtime do agente — rules, skills, verificadores | sempre |\n\n' +
    'Abrir uma sessão do Claude Code na raiz. O `estado` detecta a fase e injeta a rule certa.\n\n' +
    '| `.claude/rules/harness/` | as cinco rules do método (zona imutável) |\n\n' +
    'Suíte: `node --test .claude/hooks/*.test.mjs .claude/ferramentas/*.test.mjs`\n');
  w('MANUTENCAO.md', '# M\n\n' +
    '| `EXCLUSOES` | x | módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.claude/settings.json`, `empacotar.mjs`, `empacotar.test.mjs`) |\n\n' +
    '```bash\nnode .claude/ferramentas/gerar-kiro.mjs --saida ../harness-elo-v2-kiro --verificar\n```\n\n' +
    '```bash\nnode .claude/ferramentas/gerar-cursor.mjs --saida ../harness-elo-v2-cursor --verificar\n```\n\n' +
    '## Gerar e publicar o zip\n\n```bash\nnode .claude/ferramentas/empacotar.mjs --saida <dir>\n```\n');
  w('harness.json', JSON.stringify({ nome: 'harness-elo-v2', versao: '2.5.0', kitVersao: 'k',
    zonaImutavel: ['CLAUDE.md', '.claude/settings.json', '.claude/skills/'], zonaMutavel: ['inputs/', '.claude/rules/', '.cursor/rules/'] }));
  w('.claude/settings.json', SETTINGS);
  w('.claude/rules/harness/security.md', '---\ndescription: s\n---\n\n# S\n');
  w('.claude/rules/harness/explore.md', '---\ndescription: e\npaths: ".claude/rules/harness/explore.md"\n---\n\n# E — veja `.claude/templates/gaps.md`\n');
  w('.claude/skills/spec-x/SKILL.md', '---\nname: spec-x\ndescription: d\n---\n# lê `.claude/rules/` e CLAUDE.md\r\n');
  w('.claude/agents/validador-x.md', '---\nname: validador-x\ndescription: d\nmodel: sonnet\n---\ncorpo\n');
  w('.claude/hooks/gramatica.test.mjs', "const r = join(RAIZ, '.claude', 'rules', 'harness', 'explore.md');\n");
  w('.claude/hooks/wiring.test.mjs', 'excluído\n');
  w('.claude/ferramentas/gerar-kiro.mjs', 'excluído\n');
  w('.claude/ferramentas/empacotar.mjs', 'excluído\n');
  w('.cursor/rules/do-projeto.mdc', 'não é da fonte\n');
  w('.gitattributes', '* text=auto eol=lf\n.claude/skills/** -text\n');
  w('docs/x.md', 'fora\n');
  w('inputs/.gitkeep', '');
  w('bin.dat', Buffer.from([0, 1, 2, 255]));
  return raiz;
}

const ioDeTeste = { ...IO_REAL, sha: () => 'deadbee', gitInit: () => {}, rodarSuite: () => ({ status: 0, saida: '' }) };

test('gerar: a saída inteira, a partir da fonte mínima', () => {
  const fonte = fonteMinima();
  const saida = mkdtempSync(join(tmpdir(), 'gc-saida-'));
  writeFileSync(join(saida, 'lixo-anterior.txt'), 'x');
  mkdirSync(join(saida, '.git')); writeFileSync(join(saida, '.git', 'HEAD'), 'ref');
  const r = gerar(fonte, saida, ioDeTeste);

  const ler = (rel) => readFileSync(join(saida, rel), 'utf8');
  assert.ok(!existsSync(join(saida, 'lixo-anterior.txt')), 'a geração anterior é apagada');
  assert.equal(ler('.git/HEAD'), 'ref', 'o .git fica');
  assert.match(ler('AGENTS.md'), /^<!-- gerado de CLAUDE\.md/);
  assert.match(ler('AGENTS.md'), /`AGENTS\.md`, `\.cursor\/hooks\/`/);
  assert.match(ler('.cursor/rules/harness/security.mdc'), /\nalwaysApply: true\n/);
  assert.match(ler('.cursor/rules/harness/explore.mdc'), /\nglobs: \.cursor\/rules\/harness\/explore\.mdc\nalwaysApply: false\n/);
  assert.match(ler('.cursor/rules/harness/explore.mdc'), /`\.cursor\/templates\/gaps\.md`/);
  assert.match(ler('.cursor/rules/harness/harness-fase.mdc'), /alwaysApply: true/);
  assert.equal(ler('.cursor/skills/spec-x/SKILL.md'), '---\nname: spec-x\ndescription: d\n---\n# lê `.cursor/rules/` e AGENTS.md\r\n', 'reescrito, CRLF preservado');
  assert.match(ler('.cursor/agents/validador-x.md'), /\nmodel: inherit\n/);
  assert.match(ler('.cursor/hooks/gramatica.test.mjs'), /'\.cursor', 'rules', 'harness', 'explore\.mdc'/);
  assert.deepEqual(Object.keys(JSON.parse(ler('.cursor/hooks.json')).hooks).sort(), ['beforeShellExecution', 'sessionStart']);
  for (const g of Object.keys(GERADOS)) assert.ok(existsSync(join(saida, g)), g);
  assert.ok(!existsSync(join(saida, '.cursor/rules/do-projeto.mdc')), 'nada da .cursor/ da fonte entra');
  assert.ok(!existsSync(join(saida, '.cursor/settings.json')));
  assert.ok(!existsSync(join(saida, '.cursor/hooks/wiring.test.mjs')));
  assert.ok(!existsSync(join(saida, '.cursor/ferramentas/gerar-kiro.mjs')));
  assert.ok(!existsSync(join(saida, '.cursor/ferramentas/empacotar.mjs')));
  assert.ok(!existsSync(join(saida, 'docs')));
  assert.match(ler('.gitattributes'), /\.cursor\/skills\/\*\* -text/);
  assert.match(ler('README.md'), /## Cursor — como abrir/);
  assert.match(ler('README.md'), /node --test \.cursor\/hooks\/\*\.test\.mjs \.cursor\/ferramentas\/\*\.test\.mjs/);
  assert.match(ler('MANUTENCAO.md'), /node \.claude\/ferramentas\/gerar-cursor\.mjs --saida \.\.\/harness-elo-v2-cursor --verificar/);
  assert.ok(existsSync(join(saida, 'inputs/.gitkeep')));
  assert.deepEqual([...readFileSync(join(saida, 'bin.dat'))], [0, 1, 2, 255], 'binário passa intacto');
  const h = JSON.parse(ler('harness.json'));
  assert.equal(h.geradoDe, 'deadbee');
  assert.deepEqual(h.zonaImutavel, ['AGENTS.md', '.cursor/hooks.json', '.cursor/skills/']);
  assert.deepEqual(h.zonaMutavel, ['inputs/', '.cursor/rules/']);

  assert.deepEqual(r.sobras, [], 'nenhum .claude sobreviveu');
  assert.deepEqual(r.avisos, []);
});

test('gerar: name ≠ pasta em UMA skill derruba a geração inteira, antes de escrever', () => {
  const fonte = fonteMinima();
  mkdirSync(join(fonte, '.claude', 'skills', 'spec-y'), { recursive: true });
  writeFileSync(join(fonte, '.claude', 'skills', 'spec-y', 'SKILL.md'), '---\nname: errado\ndescription: d\n---\n');
  const saida = mkdtempSync(join(tmpdir(), 'gc-saida-'));
  assert.throws(() => gerar(fonte, saida, ioDeTeste), /name "errado" difere da pasta/);
  assert.ok(!existsSync(join(saida, 'AGENTS.md')), 'a validação vem antes da escrita');
});

test('gerar: hook sem equivalente no settings.json derruba a geração, antes de escrever', () => {
  const fonte = fonteMinima();
  writeFileSync(join(fonte, '.claude', 'settings.json'), JSON.stringify({ hooks: { Stop: [] } }));
  const saida = mkdtempSync(join(tmpdir(), 'gc-saida-'));
  assert.throws(() => gerar(fonte, saida, ioDeTeste), /sem equivalente/);
  assert.ok(!existsSync(join(saida, 'AGENTS.md')));
});

test('CLI: sem --saida, uso e código 2 — o contrato de que o pipeline depende', () => {
  const r = spawnSync('node', [fileURLToPath(new URL('./gerar-cursor.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--saida <dir> \[--verificar\] \[--json\]/);
});
