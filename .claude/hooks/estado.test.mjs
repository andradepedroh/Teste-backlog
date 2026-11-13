import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { MARCADOR_US, RAIZ_SPEC, RAIZ_EXPLORE, faltantesExplore } from './kit.mjs';
import {
  ROTULO_FASE, PROXIMO_PASSO, RULE_DA_FASE, ORCAMENTO_CONTEXTO, corpoDaRule, montarContexto, emitir, coletar,
} from './estado.mjs';

// O caminho do módulo é DERIVADO de `import.meta.url`, nunca escrito à mão: caminho do Windows
// embutido em string perde as contrabarras em silêncio e o resultado sai plausível.
const ESTADO_MJS = fileURLToPath(new URL('./estado.mjs', import.meta.url));

/** Roda o `estado.mjs` como processo, a partir de `raiz`, como o SessionStart faria. */
function rodar(raiz) {
  return spawnSync(process.execPath, [ESTADO_MJS], { cwd: raiz, encoding: 'utf8' });
}

const BASE = {
  fase: 'explore',
  faltando: [],
  gapsAbertos: 0,
  versaoLocal: '2.0.0',
  manifestoValido: true,
  usAberta: null,
  apontamentos: 0,
};

test('ROTULO_FASE cobre as três fases com o emoji da spec', () => {
  assert.match(ROTULO_FASE.explore, /Explore/);
  assert.match(ROTULO_FASE.plan, /Plan/);
  assert.match(ROTULO_FASE.deliver, /Deliver/);
});

test('PROXIMO_PASSO tem uma frase para cada fase', () => {
  for (const f of ['explore', 'plan', 'deliver']) {
    assert.equal(typeof PROXIMO_PASSO[f], 'string');
    assert.ok(PROXIMO_PASSO[f].length > 10, f);
  }
});

test('o contexto sempre nomeia a fase detectada', () => {
  assert.match(montarContexto(BASE), /Explore/);
  assert.match(montarContexto({ ...BASE, fase: 'plan' }), /Plan/);
  assert.match(montarContexto({ ...BASE, fase: 'deliver' }), /Deliver/);
});

test('o contexto diz que a fase foi DETECTADA, não perguntada', () => {
  assert.match(montarContexto(BASE), /detectad/i);
});

test('Explore com documento faltando lista o que falta', () => {
  const t = montarContexto({ ...BASE, faltando: [{ caminho: 'gaps.md', rotulo: 'GAPs' }] });
  assert.match(t, /gaps\.md/);
});

test('Explore completo não lista falta nenhuma', () => {
  assert.ok(!/faltam|ausente/i.test(montarContexto(BASE)));
});

test('GAPs abertos aparecem quando existem', () => {
  assert.match(montarContexto({ ...BASE, gapsAbertos: 3 }), /3/);
});

test('manifesto inválido aparece como primeira coisa a resolver', () => {
  const t = montarContexto({ ...BASE, manifestoValido: false });
  assert.match(t, /workspace\.md|manifesto/i);
});

test('US aberta aparece no Deliver com branch e veredito', () => {
  const t = montarContexto({
    ...BASE, fase: 'deliver',
    usAberta: { id: 'US-123', branch: 'feat/us-123', head: 'abc1234', naoCommitados: 2, veredito: 'APROVADA' },
  });
  assert.match(t, /US-123/);
  assert.match(t, /feat\/us-123/);
  assert.match(t, /abc1234/);
  assert.match(t, /APROVADA/);
});

test('arquivo não commitado é sinalizado no Deliver', () => {
  const t = montarContexto({
    ...BASE, fase: 'deliver',
    usAberta: { id: 'US-1', branch: 'b', head: 'h', naoCommitados: 4, veredito: null },
  });
  assert.match(t, /4/);
});

test('sem US aberta o Deliver não inventa marcador', () => {
  const t = montarContexto({ ...BASE, fase: 'deliver', usAberta: null });
  assert.ok(!/US-/.test(t));
});

test('a versão local do template aparece no cabeçalho', () => {
  assert.match(montarContexto({ ...BASE, versaoLocal: '2.0.0' }), /2\.0\.0/);
});

test('sem versão legível o cabeçalho não inventa número nem quebra', () => {
  const t = montarContexto({ ...BASE, versaoLocal: null });
  assert.match(t, /HARNESS ELO v2/);
  assert.ok(!/null|undefined/.test(t));
});

// `typeof === 'string'` era fraco demais: com os fallbacks do cabeçalho removidos,
// `montarContexto({})` imprimia `**undefined**` e nenhum teste percebia. A asserção forte existia,
// mas só no teste que passa fatos COMPLETOS — justamente onde os fallbacks não são exercitados.
// Aqui ela mede o que a função promete: tolerar fatos incompletos SEM despejar `undefined` na tela.
test('montarContexto tolera fatos incompletos sem lançar e sem imprimir undefined', () => {
  for (const fatos of [{}, null, { fase: 'deliver' }]) {
    const t = montarContexto(fatos);
    assert.equal(typeof t, 'string');
    assert.match(t, /HARNESS ELO v2/);
    assert.ok(!/null|undefined/.test(t), `fatos ${JSON.stringify(fatos)} produziram: ${t}`);
  }
});

// Fase que o kit venha a devolver e que este módulo ainda não rotule: o texto mostra o nome cru,
// não `undefined`. Mede os fallbacks `ROTULO_FASE[fase] || fase` e `PROXIMO_PASSO[fase] || ''`,
// que o teste de fatos incompletos não alcança porque lá a fase cai no default `explore`.
test('fase sem rótulo conhecido aparece crua, e não como undefined', () => {
  const t = montarContexto({ fase: 'fase-que-o-kit-ainda-nao-tem' });
  assert.match(t, /fase-que-o-kit-ainda-nao-tem/);
  assert.ok(!/null|undefined/.test(t), t);
});

// A comparação é `=== false` de propósito: só avisa quando o fato diz explicitamente que o
// manifesto é inválido. Manifesto AUSENTE do objeto de fatos não é manifesto inválido — é
// coerente com a função tolerar fatos incompletos. Afrouxar para `!f.manifestoValido` sobrevivia
// à suíte inteira; este teste é o par que faltava do teste do lado `false`.
test('manifestoValido ausente ou undefined NÃO dispara o aviso; só o false explícito dispara', () => {
  const semCampo = { ...BASE };
  delete semCampo.manifestoValido;
  assert.ok(!/workspace\.md/.test(montarContexto(semCampo)));
  assert.ok(!/workspace\.md/.test(montarContexto({ ...BASE, manifestoValido: undefined })));
  assert.match(montarContexto({ ...BASE, manifestoValido: false }), /workspace\.md/);
});

test('emitir devolve o JSON de SessionStart que o Claude Code espera', () => {
  const j = JSON.parse(emitir('texto qualquer'));
  assert.equal(j.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(j.hookSpecificOutput.additionalContext, 'texto qualquer');
});

test('coletar detecta Explore em projeto recém-clonado', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'harness.json'), JSON.stringify({ versao: '2.0.0' }));
  assert.equal(coletar(raiz).fase, 'explore');
});

test('coletar detecta Plan quando há artefato fora da whitelist', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec', 'modules.md'), 'x');
  assert.equal(coletar(raiz).fase, 'plan');
});

test('coletar não lança em diretório sem nada', () => {
  assert.equal(typeof coletar(mkdtempSync(join(tmpdir(), 'est-'))).fase, 'string');
});

// O `detectarFase` exige `fatos.spec` com os caminhos JÁ PREFIXADOS por `outputs/spec/` — está no
// JSDoc dele, e é a única convenção aceita desde que a tolerância ao nome nu foi removida. O
// `inventariar` devolve nome relativo ao diretório inventariado (`sync-log.md`), então quem monta
// os fatos precisa prefixar. Sem prefixar, `ehWhitelistExplore` responde `false` para TODO caminho
// e a whitelist inteira do Explore fica inerte: qualquer arquivo em `outputs/spec/` viraria Plan.
test('coletar prefixa os caminhos de spec: artefato whitelistado do Explore não vira Plan', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC), { recursive: true });
  writeFileSync(join(raiz, RAIZ_SPEC, 'sync-log.md'), 'x');
  assert.equal(coletar(raiz).fase, 'explore');
});

test('coletar prefixa também o caminho aninhado: `legacy/` continua whitelistado', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC, 'legacy'), { recursive: true });
  writeFileSync(join(raiz, RAIZ_SPEC, 'legacy', 'a.md'), 'x');
  assert.equal(coletar(raiz).fase, 'explore');
});

test('D1 — coletar: a saída da `spec-frame` em disco não faz o projeto virar Plan', () => {
  // Medido no teste ponta a ponta da 2.6.0: com `outputs/spec/frame.md` presente, o `estado`
  // anunciava «Plan» e voltava a «Explore» quando o arquivo saía de lá.
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC, 'frame', 'pre-prototype'), { recursive: true });
  writeFileSync(join(raiz, RAIZ_SPEC, 'frame.md'), '# Enquadramento\n');
  writeFileSync(join(raiz, RAIZ_SPEC, 'frame', 'pre-prototype', 'lista.html'), '<html></html>');
  assert.equal(coletar(raiz).fase, 'explore');
});

test('coletar lê a US aberta do marcador e cai em Deliver', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC), { recursive: true });
  writeFileSync(
    join(raiz, MARCADOR_US),
    'us: US-77\nbranch: feat/us-77\nhead: dead123\nnao-commitados: 3\nveredito: APROVADA\n',
  );
  const f = coletar(raiz);
  assert.equal(f.fase, 'deliver');
  assert.equal(f.usAberta.id, 'US-77');
  assert.equal(f.usAberta.branch, 'feat/us-77');
  assert.equal(f.usAberta.head, 'dead123');
  assert.equal(f.usAberta.naoCommitados, 3);
  assert.equal(f.usAberta.veredito, 'APROVADA');
});

// A convenção de ausência do `campo` deste módulo é `null`, e não `''` como no `lerCampo` do
// `fecho-explore.mjs`. A diferença estava só no JSDoc: trocar `null` por `''` não quebrava teste
// nenhum, porque o fallback `|| '—'` do chamador trata os dois igual. Este teste é o consumidor
// que faltava para a promessa do comentário.
test('campo ausente no marcador vira null, não string vazia', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC), { recursive: true });
  writeFileSync(join(raiz, MARCADOR_US), 'us: US-9\n');
  const f = coletar(raiz);
  assert.strictEqual(f.usAberta.veredito, null);
  assert.equal(f.usAberta.branch, '—');
  assert.equal(f.usAberta.naoCommitados, 0);
});

// ————————— os outros cinco campos do `coletar`, cada um medido às DUAS pontas —————————
//
// Antes destes testes a suíte assseria só `.fase` e `.usAberta`: `faltando`, `gapsAbertos`,
// `apontamentos`, `manifestoValido` e `versaoLocal` podiam ser desligados com tudo verde — o
// harness passaria a anunciar SEMPRE "manifesto válido" sem uma linha vermelha. Cada teste traz o
// par: o valor que acusa e o valor que não acusa. Um teste só do lado que acusa passa também se a
// função devolver aquele valor sempre.

/** Projeto temporário com as duas raízes de artefato. `coletar` recebe a raiz — sem `chdir`. */
function projeto() {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_EXPLORE), { recursive: true });
  mkdirSync(join(raiz, RAIZ_SPEC), { recursive: true });
  return raiz;
}

const MANIFESTO_VALIDO = [
  '# Workspace', '',
  '<!-- harness:workspace -->',
  '- papel: docs',
  '  repositorio: https://dev.azure.com/org/P/_git/wikiMaster',
  '<!-- /harness:workspace -->', '',
].join('\n');

test('coletar.faltando lista os obrigatórios do Explore que não estão lá', () => {
  const raiz = projeto();
  const f = coletar(raiz);
  assert.ok(f.faltando.length >= 3, `esperava obrigatórios faltando, veio ${f.faltando.length}`);
  assert.ok(f.faltando.some((d) => d.caminho === 'gaps.md'));
  assert.ok(f.faltando.every((d) => typeof d.rotulo === 'string' && d.rotulo.length));
});

test('coletar.faltando fica vazio quando os obrigatórios do Explore estão todos lá', () => {
  const raiz = projeto();
  for (const nome of ['hld-funcional.md', 'especificacao-funcional.md',
    'especificacao-tecnica.md', 'gaps.md']) {
    writeFileSync(join(raiz, RAIZ_EXPLORE, nome), '# doc\n');
  }
  assert.deepEqual(coletar(raiz).faltando, []);
});

test('coletar.versaoLocal lê a versão do `harness.json`, e é null sem ele', () => {
  const comHarness = projeto();
  writeFileSync(join(comHarness, 'harness.json'), JSON.stringify({ versao: '2.4.1' }));
  assert.equal(coletar(comHarness).versaoLocal, '2.4.1');

  assert.strictEqual(coletar(projeto()).versaoLocal, null);
});

test('coletar.manifestoValido é true com manifesto válido e false sem ele', () => {
  const comManifesto = projeto();
  writeFileSync(join(comManifesto, 'workspace.md'), MANIFESTO_VALIDO);
  assert.strictEqual(coletar(comManifesto).manifestoValido, true);

  assert.strictEqual(coletar(projeto()).manifestoValido, false);
});

test('D53 — repositório aninhado no de docs: o `estado` avisa na abertura da sessão', () => {
  // O teste ponta a ponta da 2.6.0 montou `codigo/` dentro do repo de docs; o harness ficou em
  // mono-repo e o `delivery-gate` negou o push do próprio repo de docs. Ninguém avisou antes do push.
  const raiz = projeto();
  writeFileSync(join(raiz, 'workspace.md'), [
    '| Papel | Repositório no ADO | Pasta local | Para que serve |',
    '|---|---|---|---|',
    '| docs | `portal-docs` | `.` | artefatos |',
    '| codigo | `portal-api` | `codigo/` | código |',
    '',
    '<!-- harness:workspace -->',
    '- papel: docs',
    '  repositorio: https://dev.azure.com/org/P/_git/portal-docs',
    '- papel: codigo',
    '  repositorio: https://dev.azure.com/org/P/_git/portal-api',
    '<!-- /harness:workspace -->',
  ].join('\n'));
  const f = coletar(raiz);
  assert.deepEqual(f.reposAninhados.map((r) => r.pasta), ['codigo']);
  const t = montarContexto(f);
  assert.match(t, /Repositório aninhado no repo de docs/);
  assert.match(t, /pasta-pai/);
  // A outra ponta: sem repositório aninhado, nada de aviso — nem em fatos sem o campo.
  assert.deepEqual(coletar(projeto()).reposAninhados, []);
  assert.doesNotMatch(montarContexto(BASE), /aninhado/);
});

test('coletar.manifestoValido é false com `workspace.md` presente mas inválido', () => {
  const raiz = projeto();
  writeFileSync(join(raiz, 'workspace.md'), '# Workspace sem o bloco harness:workspace\n');
  assert.strictEqual(coletar(raiz).manifestoValido, false);
});

test('coletar.gapsAbertos conta os GAPs aguardando, e é 0 quando todos foram respondidos', () => {
  const aberto = projeto();
  writeFileSync(join(aberto, RAIZ_EXPLORE, 'gaps.md'),
    '| GAP-001 | Qual gateway? | ⏳ Aguardando | Alto | Cliente |\n');
  assert.equal(coletar(aberto).gapsAbertos, 1);

  const fechado = projeto();
  writeFileSync(join(fechado, RAIZ_EXPLORE, 'gaps.md'),
    '| GAP-001 | Qual gateway? | ✅ Respondido | Alto | Cliente |\n');
  assert.equal(coletar(fechado).gapsAbertos, 0);
});

test('coletar.apontamentos conta o que a revisão achou, e é 0 em projeto vazio', () => {
  const comApontamento = projeto();
  // MOD declarado no HLD sem nenhum RF na especificação funcional: apontamento `modulo-sem-rf`.
  writeFileSync(join(comApontamento, RAIZ_EXPLORE, 'hld-funcional.md'), '# HLD\n\nMOD-PAGAMENTO\n');
  assert.ok(coletar(comApontamento).apontamentos > 0);

  assert.equal(coletar(projeto()).apontamentos, 0);
});

// ————————— `nao-commitados` ilegível: as duas pontas, no fato e no texto —————————
//
// `Number(campo(...) || 0)` não protegia contra valor não numérico: um marcador com
// `nao-commitados: 3 arquivos` — deriva plausível no produtor do marcador — punha
// `arquivos não commitados: NaN` no texto que o consultor lê. A ESCOLHA aqui é que o valor
// presente e incompreensível vira `null` e a LINHA SOME, em vez de virar `0`: `0` afirma
// "árvore limpa", que é falso e é justamente a afirmação em que o consultor se apoiaria para
// decidir que pode empurrar. Ausência do campo continua sendo `0` — é a distinção da Restrição
// Global 1 aplicada dentro de um campo: "não havia nada" não é "havia algo e eu não entendi".

test('`nao-commitados` não numérico vira null no fato e some do texto — nunca NaN', () => {
  const raiz = projeto();
  writeFileSync(join(raiz, MARCADOR_US), 'us: US-5\nbranch: b\nhead: h\nnao-commitados: 3 arquivos\n');
  const f = coletar(raiz);
  assert.strictEqual(f.usAberta.naoCommitados, null);

  const t = montarContexto(f);
  assert.ok(!/NaN|null|undefined/.test(t), t);
  assert.ok(!/commitados/.test(t), 'a linha some em vez de afirmar zero');
  assert.match(t, /US-5/, 'o resto do bloco da US continua na tela');
});

test('`nao-commitados` numérico continua chegando ao texto', () => {
  const raiz = projeto();
  writeFileSync(join(raiz, MARCADOR_US), 'us: US-6\nbranch: b\nhead: h\nnao-commitados: 7\n');
  const f = coletar(raiz);
  assert.strictEqual(f.usAberta.naoCommitados, 7);
  assert.match(montarContexto(f), /arquivos não commitados: 7/);
});

test('`nao-commitados` ausente continua sendo 0, e o zero aparece', () => {
  const raiz = projeto();
  writeFileSync(join(raiz, MARCADOR_US), 'us: US-7\n');
  assert.strictEqual(coletar(raiz).usAberta.naoCommitados, 0);
  assert.match(montarContexto(coletar(raiz)), /arquivos não commitados: 0/);
});

// ————————— a outra ponta da Restrição Global 1: fonte PRESENTE e ILEGÍVEL —————————
//
// `coletar` tinha três testes do lado da ausência (diretório vazio, sem `harness.json`) e ZERO do
// lado da ilegibilidade, que é o que a Restrição Global 1 exige nominalmente. Estes provam que ele
// RELANÇA — não engole, não devolve vazio. É o par do teste de processo do `main()`: aqui a casca
// levanta, lá o `main()` relata.

test('coletar RELANÇA com `harness.json` malformado — não devolve fatos vazios', () => {
  const raiz = projeto();
  writeFileSync(join(raiz, 'harness.json'), '{"versao"');
  assert.throws(() => coletar(raiz), (e) => e instanceof SyntaxError);
});

test('coletar RELANÇA com `harness.json` sendo diretório', () => {
  const raiz = projeto();
  mkdirSync(join(raiz, 'harness.json'));
  assert.throws(() => coletar(raiz), (e) => e.code === 'EISDIR' || e.code === 'EPERM');
});

test('coletar RELANÇA com o marcador de US sendo diretório', () => {
  const raiz = projeto();
  mkdirSync(join(raiz, MARCADOR_US));
  assert.throws(() => coletar(raiz), (e) => e.code === 'EISDIR' || e.code === 'EPERM');
});

test('e a ponta oposta: fonte AUSENTE não lança — devolve os fatos do projeto vazio', () => {
  const f = coletar(projeto());
  assert.equal(f.fase, 'explore');
  assert.strictEqual(f.versaoLocal, null);
  assert.strictEqual(f.usAberta, null);
});

// O default `cwd || process.cwd()` só é alcançável por chamador externo — o `main()` sempre passa
// a raiz. O teste honesto do default é a equivalência, e é o que este faz.
test('coletar sem argumento é o mesmo que coletar(process.cwd())', () => {
  assert.deepEqual(coletar(), coletar(process.cwd()));
});

// ————————————————————————————— o wiring: `main()` como processo —————————————————————————————
//
// A Restrição Global 5 exige que o wiring tenha teste que uma mutação derrube. Aqui o `main()` É o
// wiring — nenhum outro módulo importa o `estado.mjs` —, e sem estes dois testes ele pode virar
// no-op completo com a suíte inteira verde. As DUAS pontas da Restrição Global 1: fonte ausente
// (projeto vazio, emite normalmente) e fonte presente e ilegível (`harness.json` corrompido,
// relata em stderr).

test('main: projeto legível emite o JSON de SessionStart no stdout, com exit 0', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC), { recursive: true });
  writeFileSync(join(raiz, 'harness.json'), JSON.stringify({ versao: '2.0.0' }));

  const r = rodar(raiz);
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(j.hookSpecificOutput.additionalContext, /HARNESS ELO v2/);
  assert.match(j.hookSpecificOutput.additionalContext, /Explore/);
});

test('main: `harness.json` corrompido relata em stderr e NÃO derruba a sessão', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'est-'));
  mkdirSync(join(raiz, RAIZ_SPEC), { recursive: true });
  writeFileSync(join(raiz, 'harness.json'), '{"versao"');

  const r = rodar(raiz);
  // Informativo: a sessão continua. Mas a falha deixa de ser silenciosa.
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /harness\.json/i);
  assert.match(r.stderr, /contexto/i);
});

// ————————————————————————————— a rule da fase —————————————————————————————
//
// As três rules de fase deixaram de carregar sozinhas (têm `paths:` que só casa com o próprio
// arquivo) e entram pela injeção deste hook. Se a injeção quebrar, a sessão fica SEM rule de fase
// e nada mais avisa — por isso os dois lados têm teste: o texto chega, e a ausência vira aviso.

const COM_FRONTMATTER = '---\ndescription: x\npaths: ".claude/rules/harness/explore.md"\n---\n\n# Explore\n\ncorpo da rule\n';

test('corpoDaRule tira o frontmatter (LF e CRLF) e mantém o corpo', () => {
  assert.equal(corpoDaRule(COM_FRONTMATTER), '# Explore\n\ncorpo da rule');
  assert.equal(corpoDaRule(COM_FRONTMATTER.replace(/\n/g, '\r\n')), '# Explore\r\n\r\ncorpo da rule');
  assert.equal(corpoDaRule('# sem frontmatter\n'), '# sem frontmatter');
  assert.equal(corpoDaRule(''), '');
});

test('RULE_DA_FASE aponta uma rule para cada fase', () => {
  for (const f of ['explore', 'plan', 'deliver']) assert.match(RULE_DA_FASE[f], new RegExp(`${f}\\.md$`));
});

test('com a rule lida, o contexto traz o corpo dela e diz de onde veio', () => {
  const t = montarContexto({ ...BASE, fase: 'plan', ruleDaFase: '# Plan\n\nTempo B' });
  assert.ok(t.includes('# Plan\n\nTempo B'), t);
  assert.ok(t.includes(RULE_DA_FASE.plan), t);
  assert.ok(t.indexOf('Próximo passo') < t.indexOf('# Plan'), 'o estado vem antes da rule');
});

test('rule AUSENTE (string vazia) vira aviso; fato ausente não afirma nada', () => {
  const ausente = montarContexto({ ...BASE, ruleDaFase: '' });
  assert.match(ausente, /não foi encontrada/);
  assert.ok(ausente.includes(RULE_DA_FASE.explore), ausente);
  const semFato = montarContexto(BASE);
  assert.ok(!/Rule da fase|não foi encontrada/.test(semFato), semFato);
});

test('fase sem rule conhecida não injeta nada nem imprime undefined', () => {
  const t = montarContexto({ fase: 'fase-que-o-kit-ainda-nao-tem', ruleDaFase: 'qualquer' });
  assert.ok(!/Rule da fase|qualquer|null|undefined/.test(t), t);
});

/** Escreve a rule da fase no projeto temporário, no caminho que o próprio `RULE_DA_FASE` declara. */
function escreverRule(raiz, fase, texto) {
  const alvo = join(raiz, RULE_DA_FASE[fase]);
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, texto);
  return alvo;
}

test('coletar lê a rule da fase detectada, sem o frontmatter', () => {
  const raiz = projeto();
  escreverRule(raiz, 'explore', COM_FRONTMATTER);
  assert.equal(coletar(raiz).ruleDaFase, '# Explore\n\ncorpo da rule');
});

test('coletar devolve string vazia quando a rule da fase não existe', () => {
  assert.strictEqual(coletar(projeto()).ruleDaFase, '');
});

test('coletar RELANÇA com a rule da fase sendo diretório — presente e ilegível não é ausente', () => {
  const raiz = projeto();
  mkdirSync(join(raiz, RULE_DA_FASE.explore), { recursive: true });
  assert.throws(() => coletar(raiz), /EISDIR|illegal operation/i);
});

test('main: a rule da fase chega ao additionalContext', () => {
  const raiz = projeto();
  escreverRule(raiz, 'explore', COM_FRONTMATTER);
  const r = rodar(raiz);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.includes('corpo da rule'));
});

// O lado do Claude Code: se uma rule de fase perder o `paths:`, as três voltam a carregar juntas em
// toda sessão e a injeção passa a duplicar a da fase — sem nenhum outro sinal. A `security.md` é o
// contrário: tem que carregar sempre, então não pode ganhar `paths:`. Os caminhos são escritos por
// extenso para a tabela REESCRITAS do `gerar-kiro.mjs` os trocar na versão Kiro.
function frontmatter(caminhoNoRepo) {
  const texto = readFileSync(fileURLToPath(new URL(`../../${caminhoNoRepo}`, import.meta.url)), 'utf8');
  return (/^---\r?\n([\s\S]*?)\r?\n---/.exec(texto) || [])[1] || '';
}

test('as rules de fase só carregam pela injeção: `paths:` entre aspas, apontando o próprio arquivo', () => {
  for (const f of ['explore', 'plan', 'deliver']) {
    const m = /^paths:\s*"([^"]+)"\s*$/m.exec(frontmatter(RULE_DA_FASE[f]));
    assert.ok(m, `${f}: sem \`paths:\` entre aspas`);
    assert.equal(m[1], RULE_DA_FASE[f]);
  }
});

test('a rule de frontend só carrega com arquivo de frontend; a de segurança carrega sempre', () => {
  // Desde a Decisão 73 esta rule toma o lugar do `frontend-default.mdc`, que não é mais materializado
  // no projeto. Então ela cobre as MESMAS extensões que ele cobria — derivadas do `globs:` dele, não
  // fixadas aqui. O `**/*.canvas.tsx` de lá já está dentro do `tsx`.
  const padrao = /^globs:\s*"([^"]+)"\s*$/m.exec(frontmatter('.claude/skills/spec-tech-rules/templates/frontend-default.mdc'));
  assert.ok(padrao, 'o frontend-default.mdc da spec-tech-rules não tem mais `globs:`');
  const doPadrao = new Set(padrao[1].split(',').map((g) => /^\*\*\/\*\.([a-z]+)$/.exec(g.trim())?.[1]).filter(Boolean));
  // Um glob só, com chaves, entre aspas — a forma documentada do Claude Code. A lista separada por
  // vírgula numa string única não é documentada, e nada garante que ele a parta.
  const fe = /^paths:\s*"([^"]+)"\s*$/m.exec(frontmatter('.claude/rules/harness/frontend.md'));
  assert.ok(fe, 'frontend.md sem `paths:` entre aspas');
  const chaves = /^\*\*\/\*\.\{([a-z,]+)\}$/.exec(fe[1]);
  assert.ok(chaves, `o paths: deixou de ser um glob só, com chaves: ${fe[1]}`);
  assert.deepEqual(new Set(chaves[1].split(',')), doPadrao);
  assert.ok(!/^paths:/m.test(frontmatter('.claude/rules/harness/security.md')), 'security.md não pode ter `paths:`');
});

// ————————————————————————— o orçamento do additionalContext —————————————————————————
//
// O Claude Code corta o `additionalContext` do SessionStart em ~10.000 caracteres: acima disso o
// texto vai para um arquivo e a sessão recebe só uma prévia de ~2 KB. Com a rule do Explore (~10 KB)
// no FIM da mensagem, a prévia levava o estado e nada da rule — a sessão abria sem a rule da fase e
// sem nenhum sinal disso. Os testes abaixo usam as rules REAIS do repositório, não fixtures: é o
// tamanho delas que decide o caminho.

/** O corpo real da rule da fase, lido do repositório como o `coletar` lê. */
function ruleReal(fase) {
  return corpoDaRule(readFileSync(fileURLToPath(new URL(`../../${RULE_DA_FASE[fase]}`, import.meta.url)), 'utf8'));
}

/** O estado mais carregado que um projeto real produz em cada fase. */
function fatosCheios(fase) {
  return {
    ...BASE,
    fase,
    manifestoValido: false,
    gapsAbertos: 42,
    apontamentos: 17,
    faltando: fase === 'explore' ? faltantesExplore(new Set()) : [],
    usAberta: fase === 'deliver'
      ? { id: 'US-1234', branch: 'feature/us-1234', head: 'abc1234', naoCommitados: 3, veredito: 'APROVADO' }
      : null,
    ruleDaFase: ruleReal(fase),
  };
}

const INSTRUCAO_DE_LEITURA = /Leia AGORA, inteiro, o arquivo `([^`]+)`/;

test('o contexto de cada fase, com a rule real e o estado cheio, fica dentro do orçamento', () => {
  for (const fase of ['explore', 'plan', 'deliver']) {
    const t = montarContexto(fatosCheios(fase));
    assert.ok(t.length <= ORCAMENTO_CONTEXTO, `${fase}: ${t.length} caracteres > ${ORCAMENTO_CONTEXTO}`);
  }
});

test('o orçamento fica abaixo do corte do Claude Code (~10.000), com folga', () => {
  assert.ok(ORCAMENTO_CONTEXTO <= 9500, String(ORCAMENTO_CONTEXTO));
});

test('rule que não cabe: a instrução de leitura vem nos 2.000 primeiros caracteres, com o caminho exato', () => {
  for (const fase of ['explore', 'plan']) {
    const t = montarContexto(fatosCheios(fase));
    const m = INSTRUCAO_DE_LEITURA.exec(t.slice(0, 2000));
    assert.ok(m, `${fase}: sem instrução de leitura no topo:\n${t.slice(0, 2000)}`);
    assert.equal(m[1], RULE_DA_FASE[fase]);
    assert.match(t.slice(0, 2000), /subagente/i, `${fase}: o topo não diz o que fazer com subagente`);
    assert.ok(!t.includes(ruleReal(fase).slice(0, 200)), `${fase}: o corpo da rule não devia ir inline`);
    assert.ok(!/vem no fim desta mensagem/.test(t), `${fase}: promete a rule no fim, e ela não vem`);
  }
});

test('rule que cabe (Deliver) continua inline, sem instrução de leitura', () => {
  const t = montarContexto(fatosCheios('deliver'));
  assert.ok(t.includes(ruleReal('deliver')), 'o corpo da rule do Deliver devia ir inline');
  assert.ok(!INSTRUCAO_DE_LEITURA.test(t), t.slice(0, 600));
});

test('estado que sozinho estoura o orçamento é enxugado — e a instrução continua no topo', () => {
  const faltando = Array.from({ length: 400 }, (_, i) => ({ caminho: `outputs/explore/doc-${i}.md`, rotulo: `documento ${i} `.repeat(4) }));
  const t = montarContexto({ ...fatosCheios('explore'), faltando });
  assert.ok(t.length <= ORCAMENTO_CONTEXTO, `${t.length} > ${ORCAMENTO_CONTEXTO}`);
  assert.ok(INSTRUCAO_DE_LEITURA.test(t.slice(0, 2000)));
  assert.match(t, /e mais \d+/, 'a lista enxugada tem que dizer quantos ficaram de fora');
  assert.match(t, /\(400\)/, 'a contagem total continua honesta');
});

test('nem com campo de marcador gigante o contexto passa do orçamento', () => {
  const us = { id: 'US-'.padEnd(20000, 'x'), branch: 'b', head: 'h', naoCommitados: 0, veredito: null };
  const t = montarContexto({ ...fatosCheios('deliver'), usAberta: us });
  assert.ok(t.length <= ORCAMENTO_CONTEXTO, `${t.length} > ${ORCAMENTO_CONTEXTO}`);
  assert.match(t.slice(0, 200), /HARNESS ELO v2/);
});

test('main: projeto em Explore com a rule real emite contexto dentro do orçamento', () => {
  const raiz = projeto();
  escreverRule(raiz, 'explore', readFileSync(fileURLToPath(new URL(`../../${RULE_DA_FASE.explore}`, import.meta.url)), 'utf8'));
  const r = rodar(raiz);
  assert.equal(r.status, 0, r.stderr);
  const t = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.ok(t.length <= ORCAMENTO_CONTEXTO, String(t.length));
  assert.ok(INSTRUCAO_DE_LEITURA.test(t.slice(0, 2000)), t.slice(0, 2000));
});

test('corpoDaRule ignora o BOM UTF-8 antes do frontmatter', () => {
  assert.equal(corpoDaRule(`﻿${COM_FRONTMATTER}`), '# Explore\n\ncorpo da rule');
  assert.equal(corpoDaRule(`﻿${COM_FRONTMATTER.replace(/\n/g, '\r\n')}`), '# Explore\r\n\r\ncorpo da rule');
  assert.equal(corpoDaRule('﻿# sem frontmatter\n'), '# sem frontmatter');
});
