import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nomeDoRepo, parseManifesto, BRANCH_INTEGRACAO_DEFAULT, temRepoComPapel } from './workspace.mjs';

test('nomeDoRepo: url https do ADO', () => {
  assert.equal(nomeDoRepo('https://dev.azure.com/org/Projeto/_git/Projeto.Api'), 'projeto.api');
});

test('nomeDoRepo: url ssh do ADO', () => {
  assert.equal(nomeDoRepo('git@ssh.dev.azure.com:v3/org/Projeto/Projeto.Api'), 'projeto.api');
});

test('nomeDoRepo: sufixo .git e barra final somem', () => {
  assert.equal(nomeDoRepo('https://dev.azure.com/org/P/_git/wikiMaster.git'), 'wikimaster');
  assert.equal(nomeDoRepo('https://dev.azure.com/org/P/_git/wikiMaster/'), 'wikimaster');
});

test('nomeDoRepo: nome pelado (forma aceita na isencao)', () => {
  assert.equal(nomeDoRepo('wikiMaster'), 'wikimaster');
});

test('nomeDoRepo: vazio → null', () => {
  assert.equal(nomeDoRepo(''), null);
  assert.equal(nomeDoRepo(null), null);
});

const MANIFESTO_OK = `# Workspace

<!-- harness:workspace -->
- papel: docs
  repositorio: https://dev.azure.com/org/Projeto/_git/wikiMaster
- papel: codigo
  repositorio: https://dev.azure.com/org/Projeto/_git/Projeto.Api
  branch-de-integracao: master
- papel: prototipo
  repositorio: https://dev.azure.com/org/Projeto/_git/Projeto.Proto
<!-- /harness:workspace -->
`;

test('parseManifesto: entradas, nomes e branch de integracao', () => {
  const m = parseManifesto(MANIFESTO_OK);
  assert.equal(m.erro, null);
  assert.equal(m.entradas.length, 3);
  assert.deepEqual(m.entradas.map((e) => e.papel), ['docs', 'codigo', 'prototipo']);
  assert.deepEqual(m.entradas.map((e) => e.nome), ['wikimaster', 'projeto.api', 'projeto.proto']);
  assert.equal(m.entradas[1].branchIntegracao, 'master');
});

test('parseManifesto: branch de integracao default quando ausente', () => {
  const m = parseManifesto(MANIFESTO_OK);
  assert.equal(m.entradas[0].branchIntegracao, BRANCH_INTEGRACAO_DEFAULT);
});

test('parseManifesto: sem bloco → sem-manifesto', () => {
  const m = parseManifesto('# Workspace\n\nsem bloco aqui');
  assert.equal(m.erro, 'sem-manifesto');
  assert.deepEqual(m.entradas, []);
});

test('parseManifesto: manifesto sem repo de docs → invalido', () => {
  const m = parseManifesto('<!-- harness:workspace -->\n- papel: codigo\n  repositorio: x/App\n<!-- /harness:workspace -->');
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /exatamente um/i);
});

test('parseManifesto: dois repos de docs → invalido', () => {
  const txt = '<!-- harness:workspace -->\n- papel: docs\n  repositorio: x/A\n- papel: docs\n  repositorio: x/B\n<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /exatamente um/i);
});

test('parseManifesto: nome de repo duplicado → invalido', () => {
  const txt = '<!-- harness:workspace -->\n- papel: docs\n  repositorio: org/P/_git/App\n- papel: codigo\n  repositorio: outro/Q/_git/App\n<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /duplicad/i);
});

test('parseManifesto: papel fora do vocabulario → invalido', () => {
  const txt = '<!-- harness:workspace -->\n- papel: docs\n  repositorio: x/A\n- papel: infra\n  repositorio: x/B\n<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /infra/);
});

test('parseManifesto: entrada sem repositorio → invalido', () => {
  const txt = '<!-- harness:workspace -->\n- papel: docs\n<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /repositorio/i);
});

test('parseManifesto: so o repo de docs e valido (manifesto recem-criado no Explore)', () => {
  const txt = '<!-- harness:workspace -->\n- papel: docs\n  repositorio: org/P/_git/wikiMaster\n<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, null);
  assert.equal(m.entradas.length, 1);
});

// ————————————————— C1: placeholder de template não é repositório declarado —————————————————

test('parseManifesto: entrada com repositorio placeholder (<algo>) é ignorada', () => {
  const txt = '<!-- harness:workspace -->\n'
    + '- papel: docs\n  repositorio: https://dev.azure.com/org/P/_git/wikiMaster\n'
    + '- papel: codigo\n  repositorio: https://dev.azure.com/<org>/<projeto>/_git/<repo-codigo>\n'
    + '<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, null);
  assert.equal(m.entradas.length, 1);
  assert.equal(m.entradas[0].papel, 'docs');
});

test('parseManifesto: entrada real ao lado de placeholder mantém só a real', () => {
  const txt = '<!-- harness:workspace -->\n'
    + '- papel: docs\n  repositorio: https://dev.azure.com/org/P/_git/wikiMaster\n'
    + '- papel: codigo\n  repositorio: https://dev.azure.com/<org>/<projeto>/_git/<repo-codigo>\n'
    + '- papel: prototipo\n  repositorio: https://dev.azure.com/org/P/_git/Projeto.Proto\n'
    + '<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, null);
  assert.deepEqual(m.entradas.map((e) => e.papel), ['docs', 'prototipo']);
});

test('parseManifesto: manifesto 100% placeholder devolve erro template-nao-preenchido', () => {
  const txt = '<!-- harness:workspace -->\n'
    + '- papel: docs\n  repositorio: https://dev.azure.com/<org>/<projeto>/_git/<repo-docs>\n'
    + '<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'template-nao-preenchido');
  assert.match(m.detalhe, /<repo-docs>/);
  assert.match(m.detalhe, /workspace.md/i);
});

test('parseManifesto: bloco genuinamente vazio (nenhuma linha papel:) → manifesto-invalido', () => {
  const txt = '<!-- harness:workspace -->\n\n<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /nenhuma entrada/i);
});

test('parseManifesto: manifesto com múltiplos placeholders cita todos os tokens na mensagem', () => {
  const txt = '<!-- harness:workspace -->\n'
    + '- papel: docs\n  repositorio: <docs-url>\n'
    + '- papel: codigo\n  repositorio: <repo-codigo>\n'
    + '- papel: prototipo\n  repositorio: <proto-url>\n'
    + '<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'template-nao-preenchido');
  assert.match(m.detalhe, /<docs-url>/);
  assert.match(m.detalhe, /<repo-codigo>/);
  assert.match(m.detalhe, /<proto-url>/);
});

test('parseManifesto: o workspace.md do template recém-clonado não produz papel codigo', () => {
  // O clone virgem tem placeholder em TODAS as entradas (docs e prototipo também carregam
  // <org>/<projeto> não preenchidos) — parseManifesto pode rejeitar o manifesto inteiro
  // (0 entradas → manifesto-invalido) ou aceitar só o que não é placeholder; o que importa
  // para o C1 é a garantia que faz o clone virgem parar de detectar fase Deliver:
  // temRepoComPapel(m, 'codigo') nunca é true enquanto <repo-codigo> não for preenchido.
  const raizProjeto = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const textoRaiz = readFileSync(join(raizProjeto, 'workspace.md'), 'utf8');
  const textoTemplate = readFileSync(join(raizProjeto, '.claude', 'templates', 'workspace.md'), 'utf8');
  for (const texto of [textoRaiz, textoTemplate]) {
    const m = parseManifesto(texto);
    assert.equal(temRepoComPapel(m, 'codigo'), false);
  }
});

// ————————————————————— N6: chave desconhecida invalida o manifesto —————————————————————

test('parseManifesto: chave desconhecida (typo) na entrada → invalido', () => {
  const txt = '<!-- harness:workspace -->\n'
    + '- papel: docs\n  repositorio: org/P/_git/wikiMaster\n'
    + '- papel: codigo\n  repositorio: org/P/_git/App\n  branch-integracao: master\n'
    + '<!-- /harness:workspace -->';
  const m = parseManifesto(txt);
  assert.equal(m.erro, 'manifesto-invalido');
  assert.match(m.detalhe, /branch-integracao/);
  assert.match(m.detalhe, /codigo/);
});

import { resolverDiretorioDoComando } from './workspace.mjs';
import { resolve } from 'node:path';

const CWD = resolve('/ws');
const MULTI = { multiRepo: true };

test('resolverDiretorio: git -C explicito', () => {
  const r = resolverDiretorioDoComando('git -C app push origin feat-x', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: cd antes do push', () => {
  const r = resolverDiretorioDoComando('cd docs && git push origin wikiMaster', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'docs'));
});

test('resolverDiretorio: cd encadeado usa o ultimo', () => {
  const r = resolverDiretorioDoComando('cd a && cd b && git push origin feat-x', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'a', 'b'));
});

test('resolverDiretorio: push pelado em multi-repo → irresolvivel', () => {
  const r = resolverDiretorioDoComando('git push origin feat-x', CWD, MULTI);
  assert.equal(r.irresolvivel, true);
  assert.equal(r.diretorio, null);
});

test('resolverDiretorio: push pelado em mono-repo → cwd', () => {
  const r = resolverDiretorioDoComando('git push origin feat-x', CWD, { multiRepo: false });
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, CWD);
});

test('resolverDiretorio: --git-dir e --work-tree → irresolvivel', () => {
  assert.equal(resolverDiretorioDoComando('git --git-dir=x/.git push origin f', CWD, MULTI).irresolvivel, true);
  assert.equal(resolverDiretorioDoComando('git --work-tree=x push origin f', CWD, MULTI).irresolvivel, true);
});

test('resolverDiretorio: prefixo de env var nao atrapalha', () => {
  const r = resolverDiretorioDoComando('GIT_TRACE=1 git -C app push origin feat-x', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: -C com aspas', () => {
  const r = resolverDiretorioDoComando('git -C "app" push origin feat-x', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: git -C vence o cd anterior por ser explicito', () => {
  const r = resolverDiretorioDoComando('cd docs && git -C ../app push origin feat-x', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'docs', '../app'));
});

test('resolverDiretorio: comando irrelevante → cwd, resolvivel', () => {
  const r = resolverDiretorioDoComando('ls -la', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, CWD);
});

test('resolverDiretorio: az repos pr create herda o cd', () => {
  const r = resolverDiretorioDoComando('cd app && az repos pr create --target-branch main', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: commit -C nao e confundido com git -C', () => {
  const r = resolverDiretorioDoComando('cd app && git commit -C HEAD@{1} && git push origin feat-x', CWD, MULTI);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: git nao-push antes do push canonico resolve o push', () => {
  const r = resolverDiretorioDoComando('git fetch origin && git -C app push origin feat-x', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: git status intermediario nao rouba o diretorio do git -C', () => {
  const r = resolverDiretorioDoComando('cd a && git status && git -C b push origin x', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, resolve(CWD, 'a', 'b'));
});

// ————————————————— segmentarComando (extraída na Task 2B) —————————————————
//
// A leitura de shell que estava dentro de `resolverDiretorioDoComando` virou função exportada
// porque `escrita-bash.mjs` precisa da MESMA leitura: quais tokens o comando executa e em que
// diretório. Duas leituras de shell no mesmo repositório divergem, e a que divergisse por último
// seria a trava. Os testes de `resolverDiretorio` acima continuam sendo a prova de que a extração
// não mudou comportamento — eles não foram tocados.

import { segmentarComando } from './workspace.mjs';

const tokensDe = (cmd, cwd = CWD) => segmentarComando(cmd, cwd).segmentos.map((s) => s.tokens);

test('segmentarComando: parte por &&, ||, ; e |', () => {
  assert.deepEqual(tokensDe('a && b || c ; d | e'), [['a'], ['b'], ['c'], ['d'], ['e']]);
});

test('segmentarComando: parte por nova linha', () => {
  assert.deepEqual(tokensDe('ls\ncat x'), [['ls'], ['cat', 'x']]);
});

test('segmentarComando: cd NÃO vira segmento, mas muda o diretório dos seguintes', () => {
  const r = segmentarComando('cd docs && ls', CWD);
  assert.deepEqual(r.segmentos.map((s) => s.tokens), [['ls']]);
  assert.equal(r.segmentos[0].dir, resolve(CWD, 'docs'));
  assert.equal(r.houveCd, true);
});

test('segmentarComando: cd encadeado acumula', () => {
  const r = segmentarComando('cd a && cd b && ls', CWD);
  assert.equal(r.segmentos[0].dir, resolve(CWD, 'a', 'b'));
});

test('segmentarComando: sem cd, todo segmento fica no cwd e houveCd é false', () => {
  const r = segmentarComando('ls && cat x', CWD);
  assert.deepEqual(r.segmentos.map((s) => s.dir), [CWD, CWD]);
  assert.equal(r.houveCd, false);
});

test('segmentarComando: `houveCd` de cada segmento é o estado NAQUELE ponto, não no fim', () => {
  // `resolverDiretorioDoComando` decide push pelado em multi-repo por este campo. Se ele fosse o
  // valor final, um `cd` DEPOIS do push tornaria resolvível um push que era irresolvível.
  const r = segmentarComando('git push origin x && cd app && ls', CWD);
  assert.equal(r.segmentos[0].houveCd, false);
  assert.equal(r.segmentos[1].houveCd, true);
  assert.equal(r.houveCd, true);
});

test('segmentarComando: prefixo de variável de ambiente sai do segmento', () => {
  assert.deepEqual(tokensDe('GIT_TRACE=1 FOO=bar git status'), [['git', 'status']]);
});

test('segmentarComando: aspas simples e duplas somem do token', () => {
  assert.deepEqual(tokensDe(`sed -i 's/a/b/' "meu arquivo.md"`), [['sed', '-i', 's/a/b/', 'meu arquivo.md']]);
});

test('segmentarComando: separador DENTRO de aspas não parte o comando', () => {
  assert.deepEqual(tokensDe('grep -rn "kit|zona" .claude/hooks/'), [['grep', '-rn', 'kit|zona', '.claude/hooks/']]);
  assert.deepEqual(tokensDe(`echo "a && b"`), [['echo', 'a && b']]);
});

test('segmentarComando: redireção vira token próprio, com ou sem espaço', () => {
  assert.deepEqual(tokensDe('echo x > f'), [['echo', 'x', '>', 'f']]);
  assert.deepEqual(tokensDe('echo x>>f'), [['echo', 'x', '>>', 'f']]);
  assert.deepEqual(tokensDe('tee f < x'), [['tee', 'f', '<', 'x']]);
});

test('segmentarComando: barra invertida NÃO é escape — caminho de Windows sobrevive', () => {
  // Tratar `\` como escape no shell transformaria `.claude\hooks\kit.mjs` em
  // `.claudehookskit.mjs`, que não casa a zona imutável — a trava sumiria no sistema onde ela roda.
  assert.deepEqual(tokensDe('sed -i s/a/b/ .claude\\hooks\\kit.mjs'),
    [['sed', '-i', 's/a/b/', '.claude\\hooks\\kit.mjs']]);
});

test('segmentarComando: comando vazio ou só separador não produz segmento', () => {
  assert.deepEqual(segmentarComando('', CWD).segmentos, []);
  assert.deepEqual(segmentarComando('   ;  && ', CWD).segmentos, []);
  assert.deepEqual(segmentarComando(null, CWD).segmentos, []);
});

test('segmentarComando: `cd` sozinho não é troca de diretório — continua sendo um segmento', () => {
  // Comportamento herdado de `resolverDiretorioDoComando`: sem argumento, o `cd` cai no ramo
  // "qualquer outro comando". Mantido idêntico de propósito.
  const r = segmentarComando('cd', CWD);
  assert.deepEqual(r.segmentos.map((s) => s.tokens), [['cd']]);
  assert.equal(r.houveCd, false);
});

// ————————————————— o parser: heredoc, comentário e palavra-chave —————————————————
//
// Três coisas que o parser não sabia ler, e cada uma produzia falso positivo na trava do `Bash`
// — a que consome esta mesma leitura. Elas são de LEITURA DE SHELL, então moram aqui, no módulo
// dono, e não na trava: duas leituras divergem, e a que divergisse por último seria a trava.

test('segmentarComando: o CORPO do heredoc é dado, não comando — some da leitura', () => {
  // Era o pior falso positivo de custo e de veredito: cada linha do corpo virava tokens, e um
  // caminho citado na PROSA de um documento negava a escrita do documento.
  const r = segmentarComando("cat > f.md <<'EOF'\nveja .claude/hooks/kit.mjs\nrm -rf .claude\nEOF\nls", CWD);
  assert.deepEqual(r.segmentos.map((s) => s.tokens), [['cat', '>', 'f.md', '<<', 'EOF'], ['ls']]);
});

test('segmentarComando: heredoc com delimitador sem aspas e com `<<-`', () => {
  assert.deepEqual(tokensDe('cat > f.md <<EOF\ncorpo ?\nEOF'), [['cat', '>', 'f.md', '<<', 'EOF']]);
  // `<<-` come as tabulações do fim: o delimitador pode vir indentado.
  assert.deepEqual(tokensDe('cat > f.md <<-FIM\n\tcorpo\n\tFIM\nls'), [['cat', '>', 'f.md', '<<', 'FIM'], ['ls']]);
});

test('segmentarComando: heredoc sem terminador consome o resto — não há comando depois', () => {
  assert.deepEqual(tokensDe("cat > f.md <<'EOF'\nrm -rf .claude/hooks"), [['cat', '>', 'f.md', '<<', 'EOF']]);
});

test('segmentarComando: `#` no início de palavra abre comentário e encerra a linha', () => {
  assert.deepEqual(tokensDe('npm run build # nao rode rm -rf .claude/hooks'), [['npm', 'run', 'build']]);
  assert.deepEqual(tokensDe('ls # comentário\ncat x'), [['ls'], ['cat', 'x']]);
});

test('segmentarComando: `#` no MEIO de uma palavra é literal, e dentro de aspas também', () => {
  assert.deepEqual(tokensDe('rm -rf a#b'), [['rm', '-rf', 'a#b']]);
  assert.deepEqual(tokensDe('grep -c "#" f.md'), [['grep', '-c', '#', 'f.md']]);
});

test('segmentarComando: palavra-chave de shell não é comando — é pulada', () => {
  // `for`, `if` e `[` viravam "o comando do segmento", e a trava chegava a dizer "`done` toca
  // outputs/explore/gaps.md", nomeando como comando algo que não existe.
  assert.deepEqual(tokensDe('for f in x; do rm -rf y; done'), [['f', 'in', 'x'], ['rm', '-rf', 'y']]);
  assert.deepEqual(tokensDe('if [ -f CLAUDE.md ]; then echo existe; fi'), [['-f', 'CLAUDE.md', ']'], ['echo', 'existe']]);
  assert.deepEqual(tokensDe('while read l; do echo x; done < gaps.md'), [['read', 'l'], ['echo', 'x'], ['<', 'gaps.md']]);
});

test('segmentarComando: pular a palavra-chave NÃO esconde o comando real que vem depois', () => {
  // A prova de que a regra não é um bypass: quem escreve continua sendo lido.
  assert.deepEqual(tokensDe('time rm -rf .claude/hooks'), [['rm', '-rf', '.claude/hooks']]);
  assert.deepEqual(tokensDe('do sed -i s/a/b/ CLAUDE.md'), [['sed', '-i', 's/a/b/', 'CLAUDE.md']]);
});

test('segmentarComando: aspa que não fecha é sinalizada — o parser sabe que dessincronizou', () => {
  // `\` não é escape (decisão registrada: caminho de Windows). A consequência é que `"a\"b"`
  // deixa o parser DENTRO de aspas, e tudo que vem depois vira token inerte. Quem consome
  // precisa poder saber disso em vez de receber uma leitura silenciosamente incompleta.
  assert.equal(segmentarComando('echo "a\\"b" && git push', CWD).aspasAbertas, true);
  assert.equal(segmentarComando("git commit -m 'it'\\''s ok' && git push", CWD).aspasAbertas, true);
  assert.equal(segmentarComando('echo ok && git push', CWD).aspasAbertas, false);
  assert.equal(segmentarComando('git commit -m "fix: don\'t break"', CWD).aspasAbertas, false);
});

test('resolverDiretorio: aspa que não fecha é IRRESOLVÍVEL — o push pode estar escondido', () => {
  // REGRESSÃO MEDIDA na extração de `segmentarComando`: o split por regex do código anterior via
  // dois segmentos e devolvia `{diretorio: null, irresolvivel: true}`; o parser com aspas engole
  // o `&& git push` inteiro e devolvia `{diretorio: cwd, irresolvivel: false}` — em multi-repo
  // isso troca "push pelado → deny" por "segue". Nenhum dos 20 testes cobria aspa dentro de aspa.
  const r = resolverDiretorioDoComando('echo "a\\"b" && git push', CWD, MULTI);
  assert.equal(r.irresolvivel, true);
  assert.equal(r.diretorio, null);
  assert.equal(r.motivo, 'aspas-nao-fechadas');

  const s = resolverDiretorioDoComando("git commit -m 'it'\\''s ok' && git push", CWD, MULTI);
  assert.equal(s.irresolvivel, true);
  assert.equal(s.motivo, 'aspas-nao-fechadas');
});

test('resolverDiretorio: aspa que não fecha vale também em mono-repo e sem push visível', () => {
  // A leitura é a mesma nos dois modos: o gate não pode afirmar "não há push aqui" a partir de
  // uma leitura que ele sabe estar quebrada.
  assert.equal(resolverDiretorioDoComando('echo "a\\"b"', CWD, { multiRepo: false }).irresolvivel, true);
});

test('resolverDiretorio: push dentro de `do ... done` é visto — a palavra-chave não o esconde', () => {
  const r = resolverDiretorioDoComando('for r in a b; do git push origin main; done', CWD, MULTI);
  assert.equal(r.irresolvivel, true); // push pelado em multi-repo
  const s = resolverDiretorioDoComando('cd app && time git push origin main', CWD, MULTI);
  assert.equal(s.diretorio, resolve(CWD, 'app'));
});

import { classificarRepo } from './workspace.mjs';

const MANIFESTO = parseManifesto(MANIFESTO_OK);

test('classificarRepo: repo de docs', () => {
  const r = classificarRepo(MANIFESTO, 'https://dev.azure.com/org/Projeto/_git/wikiMaster');
  assert.equal(r.papel, 'docs');
  assert.equal(r.nome, 'wikimaster');
  assert.equal(r.motivo, null);
});

test('classificarRepo: repo de codigo carrega o branch de integracao declarado', () => {
  const r = classificarRepo(MANIFESTO, 'https://dev.azure.com/org/Projeto/_git/Projeto.Api');
  assert.equal(r.papel, 'codigo');
  assert.equal(r.branchIntegracao, 'master');
});

test('classificarRepo: casa url ssh contra manifesto escrito em https', () => {
  const r = classificarRepo(MANIFESTO, 'git@ssh.dev.azure.com:v3/org/Projeto/Projeto.Api');
  assert.equal(r.papel, 'codigo');
});

test('classificarRepo: repo nao declarado', () => {
  const r = classificarRepo(MANIFESTO, 'https://dev.azure.com/org/Projeto/_git/Outro');
  assert.equal(r.papel, 'desconhecido');
  assert.equal(r.motivo, 'repo-nao-declarado');
  assert.equal(r.nome, 'outro');
});

test('classificarRepo: sem remote', () => {
  const r = classificarRepo(MANIFESTO, '');
  assert.equal(r.papel, 'desconhecido');
  assert.equal(r.motivo, 'sem-remote');
});

test('classificarRepo: branch de integracao default quando o manifesto omite', () => {
  const r = classificarRepo(MANIFESTO, 'https://dev.azure.com/org/Projeto/_git/Projeto.Proto');
  assert.equal(r.papel, 'prototipo');
  assert.equal(r.branchIntegracao, BRANCH_INTEGRACAO_DEFAULT);
});

import {
  descobrirWorkspace, lerManifesto, papelDoDiretorio, MANIFESTO_REL,
  criarResolvedorDeArtefatos, ehCaminhoSobRaizDeArtefatos,
} from './workspace.mjs';
import { relativizar as relativizarDoKit } from './kit.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

function gitEm(dir, args) {
  execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'ignore', 'ignore'] });
}

/**
 * Escreve um arquivo com o caminho relativo, criando as pastas do meio.
 *
 * OS FIXTURES DE LAYOUT PRECISAM DE ARQUIVOS, e não de `mkdirSync` só: o critério do
 * `descobrirWorkspace` é CONTEÚDO no `outputs/explore/`, e uma pasta vazia (ou com só o `.gitkeep`
 * do esqueleto) é justamente o caso negativo. Fixture que só cria diretório mede a pergunta antiga.
 */
function porArquivoNoWs(raiz, rel, texto) {
  const abs = join(raiz, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, texto);
}

/** Cria um repo git com um commit e um `origin` apontando para `url`. */
function repoFake(raiz, nome, url) {
  const dir = join(raiz, nome);
  mkdirSync(dir, { recursive: true });
  gitEm(dir, ['init', '-q']);
  gitEm(dir, ['config', 'user.email', 't@t']);
  gitEm(dir, ['config', 'user.name', 'T']);
  gitEm(dir, ['remote', 'add', 'origin', url]);
  writeFileSync(join(dir, 'README.md'), '# ' + nome + '\n');
  gitEm(dir, ['add', '.']);
  gitEm(dir, ['commit', '-q', '-m', 'inicial']);
  return dir;
}

/** Workspace multi-repo completo: raiz sem git, repo de docs com manifesto, repo de codigo. */
function workspaceFake() {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  const docs = repoFake(raiz, 'docs-repo', 'https://dev.azure.com/org/P/_git/wikiMaster');
  mkdirSync(join(docs, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(docs, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(docs, MANIFESTO_REL), [
    '# Workspace', '',
    '<!-- harness:workspace -->',
    '- papel: docs',
    '  repositorio: https://dev.azure.com/org/P/_git/wikiMaster',
    '- papel: codigo',
    '  repositorio: https://dev.azure.com/org/P/_git/App',
    '<!-- /harness:workspace -->', '',
  ].join('\n'));
  const codigo = repoFake(raiz, 'app', 'https://dev.azure.com/org/P/_git/App');
  return { raiz, docs, codigo };
}

test('descobrirWorkspace: acha o repo de docs por outputs/explore + outputs/spec', () => {
  const { raiz, docs } = workspaceFake();
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, true);
  assert.equal(ws.docsDir, docs);
  assert.equal(ws.raizArtefatos, docs);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: sem candidata → mono-repo legado, raiz = cwd', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.raizArtefatos, raiz);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: erro de I/O que não seja ausência do cwd propaga motivo (I2)', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  const lerDiretorioComFalha = () => {
    const erro = new Error('EACCES: permission denied');
    erro.code = 'EACCES';
    throw erro;
  };
  const ws = descobrirWorkspace(raiz, lerDiretorioComFalha);
  assert.equal(ws.motivo, 'cwd-ilegivel');
  assert.match(ws.detalhe, /EACCES/);
});

test('descobrirWorkspace: ENOENT do cwd continua motivo null (mono-repo)', () => {
  const lerDiretorioEnoent = () => {
    const erro = new Error('ENOENT: no such file or directory');
    erro.code = 'ENOENT';
    throw erro;
  };
  const ws = descobrirWorkspace(join(tmpdir(), 'nao-existe-mesmo-456'), lerDiretorioEnoent);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: duas candidatas → ambiguo', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  for (const nome of ['a', 'b']) {
    mkdirSync(join(raiz, nome, 'outputs', 'explore'), { recursive: true });
    mkdirSync(join(raiz, nome, 'outputs', 'spec'), { recursive: true });
  }
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.motivo, 'ambiguo');
  assert.equal(ws.docsDir, null);
  assert.match(ws.detalhe, /a/);
  assert.match(ws.detalhe, /b/);
});

// ————— a desambiguação `cwd` × subpasta candidata: QUEM TEM CONTEÚDO GANHA —————
//
// DOIS DEFEITOS `deny` → `allow` SILENCIOSO passaram por aqui, e a regra atual é a que fecha os
// dois com um critério só:
//
//   1. SEM RAMO NENHUM (até a Task 4c): UMA subpasta de primeiro nível com `outputs/explore/` E
//      `outputs/spec/` fazia esta função devolver `multiRepo: true` com a raiz na SUBPASTA, mesmo
//      quando a `cwd` era obviamente a raiz. As duas travas bloqueantes que resolvem a raiz por
//      aqui — `congelamento` (pretooluse.mjs) e `escrita-bash` — relativizavam o caminho do Explore
//      DA RAIZ contra a subpasta, recebiam `null`, e LIBERAVAM escrita num Explore congelado sem
//      mensagem nenhuma. Gatilho: congelar em mono-repo e depois copiar `outputs/` para
//      `backup-antes-do-congelamento/`, ou vendorizar um pré-projeto de exemplo;
//   2. COM O RAMO POR EXISTÊNCIA (Task 4c → 4d): o template ENTREGA o esqueleto —
//      `inputs/.gitkeep`, `outputs/explore/.gitkeep` e `outputs/spec/.gitkeep` são RASTREADOS no
//      git —, então a `cwd` de todo clone tem as duas pastas e a `cwd` ganhava SEMPRE. Multi-repo
//      ficava desligado em todo clone do template, e o Explore congelado do repo de docs aceitava
//      `Write`, `sed -i` e `rm -rf`. Não era caso de borda: era o padrão. Nenhum teste pegou porque
//      os fixtures de multi-repo montavam a raiz SEM `outputs/`, o que nenhum clone real faz.
//
// O CRITÉRIO É CONTEÚDO NO `outputs/explore/` DA `cwd` — documento de verdade, e `.gitkeep` não
// conta (quem anda o diretório é o `inventariar` do kit, que já o ignora). SÓ o `outputs/explore/`:
// um Explore recém-começado tem um documento lá e nada no `outputs/spec/`, e ele é projeto de
// verdade — exigir conteúdo nas DUAS pastas deixaria a raiz dele de fora até o primeiro artefato de
// Plan. Esse é o caso que a mutação "conteúdo nas duas" mata, e ele tem teste próprio abaixo.

test('descobrirWorkspace: cwd com CONTEÚDO no Explore GANHA da candidata → mono-repo (I1)', () => {
  // Layout 2: mono-repo congelado que ganhou um `backup-antes-do-congelamento/`. Os DOIS lados têm
  // conteúdo, e quem ganha é a raiz.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'outputs/explore/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/spec/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'backup-antes-do-congelamento/outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'backup-antes-do-congelamento/outputs/spec/sync-log.md', '# log\n');
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.docsDir, raiz);
  assert.equal(ws.raizArtefatos, raiz);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: cwd com conteúdo ganha até de DUAS candidatas (sem ambiguidade)', () => {
  // A ambiguidade só existe quando a `cwd` não responde. Respondendo ela, não há o que desempatar —
  // e o veredito melhora de `deny` por falha fechada para `deny` que nomeia o congelamento.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'outputs/spec/.gitkeep', '');
  for (const nome of ['a-docs', 'b-docs']) {
    porArquivoNoWs(raiz, `${nome}/outputs/explore/gaps.md`, '# GAPs\n');
    porArquivoNoWs(raiz, `${nome}/outputs/spec/sync-log.md`, '# log\n');
  }
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.raizArtefatos, raiz);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: o ESQUELETO do template na cwd NÃO ganha — é o clone multi-repo real', () => {
  // O CASO QUE FALTAVA, e é o padrão: `inputs/.gitkeep`, `outputs/explore/.gitkeep`,
  // `outputs/spec/.gitkeep` e `workspace.md` na raiz, como todo clone do template tem, e o
  // pré-projeto no repo de docs. A MUTAÇÃO QUE ESTE CASO MATA: fazer o ramo voltar a olhar só
  // EXISTÊNCIA das pastas. Com ela, a raiz ganha e multi-repo fica desligado em todo clone.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'inputs/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/explore/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/spec/.gitkeep', '');
  porArquivoNoWs(raiz, MANIFESTO_REL, '# Workspace\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/spec/sync-log.md', '# log\n');
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, true);
  assert.equal(ws.docsDir, join(raiz, 'portal-docs'));
  assert.equal(ws.raizArtefatos, join(raiz, 'portal-docs'));
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: UM documento no Explore da cwd basta — Explore recém-começado ganha', () => {
  // A MUTAÇÃO QUE ESTE CASO MATA: exigir conteúdo nas DUAS pastas em vez de só no
  // `outputs/explore/`. O `outputs/spec/` só se enche no Plan, então um Explore recém-começado tem
  // um documento e mais nada — e ele é projeto de verdade, com raiz de artefatos na `cwd`. Com a
  // mutação, a raiz dele perderia para o exemplo vendorizado e o Explore de verdade ficaria fora da
  // raiz dos artefatos, que é a forma nova do mesmo defeito.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'outputs/explore/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/spec/.gitkeep', ''); // esqueleto: o Plan ainda não começou
  porArquivoNoWs(raiz, 'outputs/explore/hld-funcional.md', '# HLD\n');
  porArquivoNoWs(raiz, 'exemplo-vendorizado/outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'exemplo-vendorizado/outputs/spec/sync-log.md', '# log\n');
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.raizArtefatos, raiz);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: só `outputs/spec` com conteúdo na cwd NÃO ganha da candidata', () => {
  // A outra metade da escolha: o critério é o Explore, e conteúdo só no `outputs/spec/` não faz a
  // `cwd` ganhar. Sem este caso, a mutação "olhar `outputs/spec/` em vez de `outputs/explore/`"
  // sobreviveria.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'outputs/explore/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/spec/sync-log.md', '# log\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/spec/sync-log.md', '# log\n');
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, true);
  assert.equal(ws.raizArtefatos, join(raiz, 'portal-docs'));
});

test('descobrirWorkspace: DUAS candidatas com conteúdo e raiz só esqueleto → ambiguo', () => {
  // Layout 4, com a raiz montada como clone de verdade. A versão anterior deste caso montava a raiz
  // SEM `outputs/`, e por isso não pegava o ramo por existência.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'inputs/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/explore/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/spec/.gitkeep', '');
  for (const nome of ['portal-docs', 'outro-docs']) {
    porArquivoNoWs(raiz, `${nome}/outputs/explore/gaps.md`, '# GAPs\n');
    porArquivoNoWs(raiz, `${nome}/outputs/spec/sync-log.md`, '# log\n');
  }
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.motivo, 'ambiguo');
  assert.equal(ws.raizArtefatos, null);
});

test('descobrirWorkspace: DIA 1 — clone recém-feito, nada preenchido → mono-repo, raiz = cwd', () => {
  // O ESTADO DO DIA 1 DE TODO PROJETO, e ele tem que ser mono-repo com a raiz na `cwd`: é o único
  // veredito que não é falso positivo em bloqueante. Sem candidata o ramo do conteúdo nem é
  // consultado — mas prender o veredito importa, porque é o layout mais comum que existe e o
  // Explore aqui NÃO está congelado, então as travas liberam trabalho legítimo. A outra metade
  // (as travas liberando de fato) é medida pelo despachante real, em `composicao.test.mjs`.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'inputs/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/explore/.gitkeep', '');
  porArquivoNoWs(raiz, 'outputs/spec/.gitkeep', '');
  porArquivoNoWs(raiz, MANIFESTO_REL, '# Workspace\n');
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.docsDir, raiz);
  assert.equal(ws.raizArtefatos, raiz);
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: M3 — `outputs/explore` como ARQUIVO na cwd não faz a cwd ganhar', () => {
  // O `existsSync` do ramo antigo não distinguia arquivo de diretório: `outputs/explore` e
  // `outputs/spec` como ARQUIVOS faziam a `cwd` ganhar (medido). O critério novo lê CONTEÚDO, e
  // arquivo no lugar de diretório levanta `ENOTDIR`/`ENOENT`, que o `inventariar` trata como
  // ausência — conjunto vazio, a `cwd` não ganha. Morre de graça, e o teste é o que prova.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  mkdirSync(join(raiz, 'outputs'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore'), 'nao sou diretorio\n');
  writeFileSync(join(raiz, 'outputs', 'spec'), 'nem eu\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/spec/sync-log.md', '# log\n');
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, true);
  assert.equal(ws.raizArtefatos, join(raiz, 'portal-docs'));
  assert.equal(ws.motivo, null);
});

test('descobrirWorkspace: Explore da cwd ILEGÍVEL falha FECHADO — não degrada para "sem conteúdo"', () => {
  // O RAMO NÃO ERA FALHA-FECHADA-COMPATÍVEL (M2): `existsSync` devolve `false` para QUALQUER erro e
  // não passa pelo `io`, então pasta que não pudesse ser verificada fazia o ramo não disparar em
  // silêncio — e o veredito voltava a ser o do defeito, `allow` num bloqueante. Não há resposta
  // segura por omissão: supor "sem conteúdo" deixa o Explore da raiz sem trava, supor "com
  // conteúdo" deixa o da candidata. Quem não sabe onde está a raiz NOMEIA o fato.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  porArquivoNoWs(raiz, 'portal-docs/outputs/explore/gaps.md', '# GAPs\n');
  porArquivoNoWs(raiz, 'portal-docs/outputs/spec/sync-log.md', '# log\n');
  // A listagem do `cwd` funciona (é ela que acha a candidata); o que falha é a varredura do
  // `outputs/explore` DA RAIZ, que é a pergunta do ramo.
  const lerDiretorio = (dir, opcoes) => {
    if (String(dir) === join(raiz, 'outputs', 'explore')) {
      const erro = new Error('EACCES: permission denied');
      erro.code = 'EACCES';
      throw erro;
    }
    return readdirSync(dir, opcoes);
  };
  const ws = descobrirWorkspace(raiz, lerDiretorio);
  assert.equal(ws.motivo, 'cwd-ilegivel');
  assert.match(ws.detalhe, /EACCES/);
  assert.match(ws.detalhe, /outputs\/explore/);
});

// ————— M3: os dois casos negativos do `rel` são DIFERENTES, e a distinção é explícita —————
//
// `null` é "FORA do repo de docs" e `''` é "É o próprio repo de docs". Os dois consumidores —
// `congelamento` (pretooluse.mjs) e `escrita-bash` — liam os dois por FALSIDADE DE STRING, num
// caminho de decisão de trava bloqueante. Estava certo, e é o tipo de acerto que quebra em silêncio:
// a distinção passou a ter dono (`ehCaminhoSobRaizDeArtefatos`) e teste.

test('ehCaminhoSobRaizDeArtefatos: separa "fora do repo de docs" de "é o repo de docs"', () => {
  assert.equal(ehCaminhoSobRaizDeArtefatos({ rel: null }), false, 'null = fora do repo de docs');
  assert.equal(ehCaminhoSobRaizDeArtefatos({ rel: '' }), false, "'' = o próprio repo de docs");
  assert.equal(ehCaminhoSobRaizDeArtefatos({ rel: 'outputs/explore/gaps.md' }), true);
  // Robustez de contrato: um resultado sem o campo não vira `true` por acidente.
  assert.equal(ehCaminhoSobRaizDeArtefatos({}), false);
  assert.equal(ehCaminhoSobRaizDeArtefatos(null), false);
});

test('criarResolvedorDeArtefatos: produz os DOIS casos negativos, e eles chegam distintos', () => {
  // Multi-repo de verdade em disco — a resposta vem do `descobrirWorkspace`, não de dublê.
  const raiz = mkdtempSync(join(tmpdir(), 'ws-res-'));
  mkdirSync(join(raiz, 'portal-docs', 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'portal-docs', 'outputs', 'spec'), { recursive: true });
  // O `relativizar` TEXTUAL do kit, e não um dublê escrito aqui: ele é o resolvedor que as duas
  // travas injetam nos próprios testes, e é ele que devolve `''` para a própria raiz (o `IO_REAL`
  // devolve `null` — os dois discordam, e é por isso que os dois casos negativos existem).
  const resolver = criarResolvedorDeArtefatos(raiz, { relativizar: relativizarDoKit });

  const dentro = resolver('portal-docs/outputs/explore/gaps.md');
  assert.equal(dentro.rel, 'outputs/explore/gaps.md');
  assert.equal(ehCaminhoSobRaizDeArtefatos(dentro), true);

  const aRaiz = resolver('portal-docs');
  assert.equal(aRaiz.rel, '', 'a própria raiz dos artefatos relativiza para string vazia');
  assert.equal(ehCaminhoSobRaizDeArtefatos(aRaiz), false);

  const fora = resolver('portal-app/src/app.ts');
  assert.equal(fora.rel, null, 'fora do repo de docs é null');
  assert.equal(ehCaminhoSobRaizDeArtefatos(fora), false);
});

test('lerManifesto: le o manifesto do repo de docs', () => {
  const { docs } = workspaceFake();
  const m = lerManifesto(docs);
  assert.equal(m.erro, null);
  assert.deepEqual(m.entradas.map((e) => e.nome), ['wikimaster', 'app']);
});

test('lerManifesto: arquivo ausente → sem-manifesto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ws-'));
  assert.equal(lerManifesto(dir).erro, 'sem-manifesto');
});

test('papelDoDiretorio: repo de codigo real', () => {
  const { docs, codigo } = workspaceFake();
  const r = papelDoDiretorio(codigo, lerManifesto(docs));
  assert.equal(r.papel, 'codigo');
  assert.equal(r.nome, 'app');
  // Compara por identidade de arquivo (realpath), nao por igualdade de string: no Windows o
  // `git rev-parse --show-toplevel` resolve nomes curtos 8.3 (ex.: MURILO~1) para a forma longa,
  // enquanto o `codigo` construido via node:fs/node:path preserva a forma original do TEMP do SO.
  assert.equal(realpathSync.native(r.toplevel), realpathSync.native(codigo));
});

test('papelDoDiretorio: repo de docs real', () => {
  const { docs } = workspaceFake();
  assert.equal(papelDoDiretorio(docs, lerManifesto(docs)).papel, 'docs');
});

test('papelDoDiretorio: diretorio fora de repo git → desconhecido/sem-remote', () => {
  const { docs } = workspaceFake();
  const fora = mkdtempSync(join(tmpdir(), 'nao-repo-'));
  const r = papelDoDiretorio(fora, lerManifesto(docs));
  assert.equal(r.papel, 'desconhecido');
  assert.equal(r.motivo, 'sem-remote');
});

test('CLI --docs imprime o caminho do repo de docs', () => {
  const { raiz, docs } = workspaceFake();
  const cli = fileURLToPath(new URL('./workspace.mjs', import.meta.url));
  const out = execFileSync('node', [cli, '--docs'], { cwd: raiz, encoding: 'utf8' });
  assert.equal(out.trim(), docs);
});

test('CLI --validar aprova manifesto correto', () => {
  const { raiz } = workspaceFake();
  const cli = fileURLToPath(new URL('./workspace.mjs', import.meta.url));
  const out = execFileSync('node', [cli, '--validar'], { cwd: raiz, encoding: 'utf8' });
  assert.match(out, /ok/i);
});

test('resolverDiretorio: dois pushes na cadeia em multi-repo → irresolvivel (multiplos-push)', () => {
  const r = resolverDiretorioDoComando('git -C docs push origin main && git -C app push origin feat-x', CWD, MULTI);
  assert.equal(r.irresolvivel, true);
  assert.equal(r.motivo, 'multiplos-push');
});

test('resolverDiretorio: um push so em multi-repo continua resolvendo', () => {
  const r = resolverDiretorioDoComando('git fetch origin && git -C app push origin feat-x', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: dois pushes em mono-repo NAO viram irresolvivel', () => {
  const r = resolverDiretorioDoComando('git push origin main && git push origin feat-x', CWD, { multiRepo: false });
  assert.equal(r.irresolvivel, false);
});

test('resolverDiretorio: dois pushes ao MESMO repo (retry) NAO viram multiplos-push', () => {
  const r = resolverDiretorioDoComando('git -C app push origin feat-x && git -C app push --force', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

test('resolverDiretorio: push + PR no mesmo repo (via cd) NAO vira multiplos-push', () => {
  const r = resolverDiretorioDoComando('cd app && git push origin feat-x && gh pr create --base main', CWD, MULTI);
  assert.equal(r.irresolvivel, false);
  assert.equal(r.diretorio, resolve(CWD, 'app'));
});

// ————————————————— mudanças do V2 —————————————————

const MANIFESTO_VALIDO = `<!-- harness:workspace -->
- papel: docs
  repositorio: https://dev.azure.com/elo/Projeto/_git/wikiMaster
- papel: prototipo
  repositorio: https://dev.azure.com/elo/Projeto/_git/Projeto.Proto
<!-- /harness:workspace -->
`;

test('V2: o manifesto vive na raiz, não em docs/', () => {
  assert.equal(MANIFESTO_REL, 'workspace.md');
});

test('V2: descobrirWorkspace acha o repo de docs por outputs/explore + outputs/spec', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  mkdirSync(join(raiz, 'wikiMaster', 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'wikiMaster', 'outputs', 'spec'), { recursive: true });
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, true);
  assert.equal(ws.docsDir, join(raiz, 'wikiMaster'));
});

test('V2: descobrirWorkspace trata árvore sem candidata como mono-repo', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  const ws = descobrirWorkspace(raiz);
  assert.equal(ws.multiRepo, false);
  assert.equal(ws.raizArtefatos, raiz);
});

test('V2: descobrirWorkspace marca ambiguidade com duas candidatas', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'ws-'));
  for (const nome of ['docsA', 'docsB']) {
    mkdirSync(join(raiz, nome, 'outputs', 'explore'), { recursive: true });
    mkdirSync(join(raiz, nome, 'outputs', 'spec'), { recursive: true });
  }
  assert.equal(descobrirWorkspace(raiz).motivo, 'ambiguo');
});

test('V2: lerManifesto lê workspace.md da raiz do repo de docs', () => {
  const docsDir = mkdtempSync(join(tmpdir(), 'ws-'));
  writeFileSync(join(docsDir, 'workspace.md'), MANIFESTO_VALIDO);
  const m = lerManifesto(docsDir);
  assert.equal(m.erro, null);
  assert.equal(m.entradas.length, 2);
});

test('V2: temRepoComPapel acha o papel declarado', () => {
  const m = parseManifesto(MANIFESTO_VALIDO);
  assert.equal(temRepoComPapel(m, 'docs'), true);
  assert.equal(temRepoComPapel(m, 'prototipo'), true);
  assert.equal(temRepoComPapel(m, 'codigo'), false);
});

test('V2: temRepoComPapel devolve false para manifesto inválido', () => {
  assert.equal(temRepoComPapel({ entradas: [], erro: 'sem-manifesto' }, 'codigo'), false);
  assert.equal(temRepoComPapel(null, 'codigo'), false);
});

// ————————— `ehPlaceholder` é pública, e a política é uma só (rodada K) —————————
//
// Ela nasceu privada, para o manifesto do template. O `fecho-explore.mjs` passou a precisar da
// MESMA resposta sobre os quatro campos do bloco `gate:isencao`: a mensagem de negação dele
// imprime `<quem decidiu>` e afins, e colar aquele bloco sem editar abria a única saída de
// emergência do único verificador bloqueante da camada. Estes testes existem para que a
// exportação não seja desfeita por acidente e para fixar o que a política de fato responde.

import { ehPlaceholder } from './workspace.mjs';

test('K: ehPlaceholder reconhece token de preenchimento em qualquer posição', () => {
  for (const s of ['<repo-docs>', '<quem decidiu>', '<AAAA-MM-DD>', 'https://x/<repo>', 'a <b> c']) {
    assert.equal(ehPlaceholder(s), true, s);
  }
});

test('K: ehPlaceholder NÃO acusa valor real, nem vazio, nem nulo', () => {
  for (const s of ['https://dev.azure.com/acme/portal/_git/portal-docs', 'Fulana de Tal',
    '2026-08-25', 'escopo herdado', '', null, undefined, '- ', 'a > b < c']) {
    assert.equal(ehPlaceholder(s), false, String(s));
  }
});

test('K: exportar ehPlaceholder não mudou o que o manifesto faz com placeholder', () => {
  // A mudança é ADITIVA: `parseManifesto` continua ignorando entrada com placeholder e
  // continua distinguindo "bloco vazio" de "bloco todo placeholder".
  const m = parseManifesto([
    '<!-- harness:workspace -->',
    '- papel: docs',
    '  repositorio: <repo-docs>',
    '<!-- /harness:workspace -->',
  ].join('\n'));
  assert.equal(m.erro, 'template-nao-preenchido');
  assert.match(m.detalhe, /<repo-docs>/);
});

// ————————————— D53 do teste ponta a ponta (2.6.0): repositório ANINHADO no de docs —————————————
//
// O multi-repo só liga com a sessão na PASTA-PAI e os repositórios lado a lado
// (`descobrirWorkspace`). Com o repo de código em `codigo/`, DENTRO do repo de docs, a `cwd` é o
// repo de docs, o harness cai em mono-repo, e o `delivery-gate` trata todo push como código: o push
// do próprio repo de docs foi negado com «nenhuma auditoria cobre os commits deste push», embora o
// manifesto diga que `docs` é livre. A coluna «Pasta local» do manifesto era só descritiva.

const MANIFESTO_ANINHADO = [
  '# Workspace do projeto', '',
  '## Repositórios', '',
  '| Papel | Repositório no ADO | Pasta local | Para que serve |',
  '|---|---|---|---|',
  '| docs | `portal-pedidos-docs` | `.` | artefatos de fase |',
  '| codigo | `portal-pedidos-api` | `codigo/` | código da solução |',
  '| prototipo | `portal-pedidos-proto` | `../portal-pedidos-proto/` | protótipo |',
  '',
  '<!-- harness:workspace -->',
  '- papel: docs',
  '  repositorio: https://dev.azure.com/acme/P/_git/portal-pedidos-docs',
  '- papel: codigo',
  '  repositorio: https://dev.azure.com/acme/P/_git/portal-pedidos-api',
  '- papel: prototipo',
  '  repositorio: https://dev.azure.com/acme/P/_git/portal-pedidos-proto',
  '<!-- /harness:workspace -->', '',
].join('\n');

test('D53 — pastasLocais lê a coluna «Pasta local» da tabela de repositórios', async () => {
  const { pastasLocais } = await import('./workspace.mjs');
  assert.deepEqual(pastasLocais(MANIFESTO_ANINHADO), [
    { papel: 'docs', repositorio: 'portal-pedidos-docs', pasta: '.' },
    { papel: 'codigo', repositorio: 'portal-pedidos-api', pasta: 'codigo' },
    { papel: 'prototipo', repositorio: 'portal-pedidos-proto', pasta: '../portal-pedidos-proto' },
  ]);
  // O template intocado (`<pasta>`) não declara pasta nenhuma.
  const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'workspace.md'), 'utf8');
  assert.deepEqual(pastasLocais(template), []);
});

test('D53 — reposAninhados acha o repo DENTRO da pasta do de docs, e só ele', async () => {
  const { reposAninhados } = await import('./workspace.mjs');
  // `codigo/` dentro de `.` é aninhado; `../portal-pedidos-proto/` é irmão.
  assert.deepEqual(reposAninhados(MANIFESTO_ANINHADO).map((r) => r.pasta), ['codigo']);
  // O layout suportado: a sessão na pasta-pai, os três lado a lado.
  const irmaos = MANIFESTO_ANINHADO
    .replace('| `.` |', '| `portal-pedidos-docs/` |')
    .replace('| `codigo/` |', '| `portal-pedidos-api/` |');
  assert.deepEqual(reposAninhados(irmaos), []);
  // Aninhado também quando a pasta do de docs é nomeada e a do outro começa por ela.
  const nomeado = irmaos.replace('| `portal-pedidos-api/` |', '| `portal-pedidos-docs/api/` |');
  assert.deepEqual(reposAninhados(nomeado).map((r) => r.repositorio), ['portal-pedidos-api']);
});

test('D53 — avisoDeAninhamento ensina o layout suportado', async () => {
  const { reposAninhados, avisoDeAninhamento } = await import('./workspace.mjs');
  const t = avisoDeAninhamento(reposAninhados(MANIFESTO_ANINHADO));
  assert.match(t, /`codigo\/`/);
  assert.match(t, /portal-pedidos-api/);
  assert.match(t, /pasta-pai/);
  assert.match(t, /delivery-gate/);
  assert.equal(avisoDeAninhamento([]), null);
  // O aviso manda ler o template: ele tem que de fato descrever o layout — e a explore.md também,
  // que é onde o `workspace.md` nasce.
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  for (const rel of ['.claude/templates/workspace.md', '.claude/rules/harness/explore.md']) {
    const doc = readFileSync(join(raiz, rel), 'utf8');
    assert.match(doc, /pasta-pai/, `${rel} não descreve o layout suportado`);
    assert.match(doc, /aninhado/, `${rel} não diz que o repositório aninhado não é suportado`);
  }
});

test('D53 — `--validar` AVISA o repo aninhado, e continua saindo com 0 (o manifesto é válido)', () => {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'ws-aninhado-')));
  writeFileSync(join(raiz, 'workspace.md'), MANIFESTO_ANINHADO);
  const WORKSPACE_MJS = fileURLToPath(new URL('./workspace.mjs', import.meta.url));
  const saida = execFileSync(process.execPath, [WORKSPACE_MJS, '--validar'], { cwd: raiz, encoding: 'utf8' });
  assert.match(saida, /^ok — 3 entrada\(s\)/);
  assert.match(saida, /aninhado/i);
  assert.match(saida, /`codigo\/`/);
});
