// As invariantes da vendorização (Decisão 7). Mora em `.claude/hooks/` e não em
// `.claude/ferramentas/` porque não é ferramenta nem tem ferramenta como alvo: é asserção sobre a
// forma do clone, irmã do `wiring.test.mjs`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR_SKILLS = join(RAIZ, '.claude', 'skills');

test('a cadeia spec-* foi vendorizada, com os validadores Python', () => {
  for (const rel of [
    'spec/SKILL.md',
    'spec-ingest/templates/context-map.md',
    'spec-product/templates/requirements-functional.md',
    'spec-prototype/SKILL.md',
    'spec-tech-rules/templates/frontend-default.mdc',
    'tools/check-flowmap.py',
    'tools/check-modules.py',
    'tools/check-outputs.py',
  ]) {
    assert.ok(existsSync(join(DIR_SKILLS, rel)), `falta .claude/skills/${rel}`);
  }
});

test('os dois templates que o promocao.mjs lê estão onde ele os procura', () => {
  // A DUAS PONTAS com o `ARTEFATOS_DE_PROMOCAO` do kit.mjs: aquele fixa o caminho no PROJETO, e
  // este prova que o TEMPLATE que produz aquele arquivo veio junto. Sem os dois, a Tarefa 2 pode
  // estar lendo o caminho certo de um artefato que nenhuma skill vendorizada sabe escrever.
  assert.ok(existsSync(join(DIR_SKILLS, 'spec-ingest/templates/context-map.md')));
  assert.ok(existsSync(join(DIR_SKILLS, 'spec-product/templates/requirements-functional.md')));
  const req = readFileSync(join(DIR_SKILLS, 'spec-product/templates/requirements-functional.md'), 'utf8');
  assert.match(req, /Fato fonte \(F-xxx\)/, 'a coluna que a Decisão 15 pressupõe não está no template vendorizado');
});

test('a spec-hld que produz o hld.md esta vendorizada, com o validador dela', () => {
  // A DUAS PONTAS com o contrato do kit.mjs: lá o nome do artefato é fixado, e aqui se prova que a
  // skill que sabe escrevê-lo veio junto. Sem os dois, o contrato pode estar prometendo o artefato
  // de uma skill que não existe no clone — que é exatamente o estado que o teste antigo do
  // `arquitetura-solucao.md` registrava, e que o Plano 4 vem encerrar.
  for (const rel of ['spec-hld/SKILL.md', 'spec-hld/templates/hld.md', 'tools/check-hld.py']) {
    assert.ok(existsSync(join(DIR_SKILLS, rel)), `falta .claude/skills/${rel}`);
  }
});

test('a spec-init NÃO foi vendorizada — o template já traz as rules preenchidas', () => {
  assert.ok(!existsSync(join(DIR_SKILLS, 'spec-init')));
});

test('o manifesto de plugin NÃO foi copiado', () => {
  // Copiá-lo é o que transformaria o clone num plugin meio-instalado: skill de plugin chega
  // PREFIXADA, e o nome curto deixaria de resolver para a versão local.
  assert.ok(!existsSync(join(DIR_SKILLS, '.claude-plugin')));
  assert.ok(!existsSync(join(RAIZ, '.claude-plugin')));
  assert.ok(!existsSync(join(DIR_SKILLS, 'CLAUDE.md')), 'o CLAUDE.md do kit colidiria com o nosso');
});

test('nenhuma skill vendorizada arrasta dependência npm para o harness', () => {
  // A restrição global é zero dependências. O único package.json do kit com `dependencies` é o
  // de `spec-tasks/templates/`, que é template do PROJETO GERADO — ele descreve o que o projeto
  // do cliente vai instalar, não o que o harness precisa. A asserção permite exatamente esse, por
  // caminho, e reprova qualquer outro.
  const permitido = join('spec-tasks', 'templates', 'package.json');
  const comDeps = [];
  (function andar(dir, rel) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      const r = rel ? join(rel, e.name) : e.name;
      if (e.isDirectory()) { andar(p, r); continue; }
      if (e.name !== 'package.json') continue;
      const pkg = JSON.parse(readFileSync(p, 'utf8'));
      if (Object.keys(pkg.dependencies || {}).length && r !== permitido) comDeps.push(r);
    }
  })(DIR_SKILLS, '');
  assert.deepEqual(comDeps, [], 'skill vendorizada com dependência npm');
});

test('o kitVersao nomeia a base de upstream e diz que e mantido aqui (Decisao 30)', () => {
  // O PROPÓSITO é o mesmo desde a vendorização: os dois forks do kit se declaram 1.0.0, então um
  // campo com "1.0.0" não diria qual dos dois é. O que mudou é a GRAMÁTICA, porque a frase antiga
  // — "vendorizado de Contexto/Elo-spec-kit em <data>" — virou falsa: não há mais cópia em
  // Contexto/ de onde vendorizar. Há um snapshot datado que é BASE DE MERGE (MANUTENCAO.md), e a
  // cópia viva em .claude/skills/ é a fonte única de verdade.
  const h = JSON.parse(readFileSync(join(RAIZ, 'harness.json'), 'utf8'));
  assert.match(h.kitVersao, /base upstream \d{4}-\d{2}-\d{2}/, 'falta a data da entrega do upstream');
  assert.match(h.kitVersao, /mantido neste harness desde \d{4}-\d{2}-\d{2}/, 'falta desde quando é nosso');
  // A OUTRA PONTA: o rótulo velho tem que REPROVAR. Sem esta linha, o teste passa também se
  // alguém escrever as duas frases novas e deixar a antiga, mantendo a afirmação falsa no lugar.
  assert.doesNotMatch(h.kitVersao, /vendorizado de/, 'o rótulo ainda afirma um fluxo que a Decisão 30 encerrou');
  assert.ok(!/ainda nao vendorizado|ainda não vendorizado/i.test(h.kitVersao));
});

test('.claude/skills/ está na zona imutável do harness.json', () => {
  const h = JSON.parse(readFileSync(join(RAIZ, 'harness.json'), 'utf8'));
  assert.ok(h.zonaImutavel.includes('.claude/skills/'));
});

test('o README manda rodar o doutor na seção de pré-requisitos', () => {
  // A tabela de sete itens já está lá desde a Fundação. O que faltava era o comando que a
  // confere — sem ele, a tabela é uma lista para o leitor checar à mão, e o `doutor.mjs` fica
  // sendo um módulo que existe sem ninguém saber quando rodar.
  const txt = readFileSync(join(RAIZ, 'README.md'), 'utf8');
  const i = txt.indexOf('## Pré-requisitos');
  const j = txt.indexOf('\n## ', i + 1);
  const secao = txt.slice(i, j < 0 ? undefined : j);
  assert.match(secao, /node \.claude\/ferramentas\/doutor\.mjs/);
});

test('o README documenta as duas pastas de maquinário, com a diferença entre elas', () => {
  const txt = readFileSync(join(RAIZ, 'README.md'), 'utf8');
  assert.match(txt, /\.claude\/hooks\//);
  assert.match(txt, /\.claude\/ferramentas\//);
  assert.match(txt, /\.claude\/skills\//);
  // A DIFERENÇA, e não só a presença: um README que lista as duas pastas sem dizer o que separa
  // uma da outra convida o próximo módulo a nascer na pasta errada.
  assert.match(txt, /por evento|disparad/i);
  assert.match(txt, /por comando|à mão|a mão/i);
});

test('a zona das skills nao sofre conversao de fim de linha (Decisao 32)', () => {
  // O `* text=auto eol=lf` da raiz (desde 3cd26fd) já fazia o checkout escrever LF; nunca houve
  // CRLF na cópia viva por conversão no checkout. O defeito real era outro: 13 arquivos do
  // pacote do upstream carregam CRLF de verdade, e o `text=auto` normaliza para LF no momento do
  // `git add` — gravando esses 13 como LF no blob e tornando a cópia vendorizada diferente,
  // byte a byte, do pacote (medido: 13 arquivos divergentes num `diff -r` cru contra o pacote
  // antes desta regra, 0 depois). É essa identidade byte a byte que o passo "o que NÓS mudamos"
  // do merge de três pontas (MANUTENCAO.md) precisa, porque ele roda o `diff` cru, sem
  // `--strip-trailing-cr`.
  const r = spawnSync('git', ['check-attr', 'text', '--', '.claude/skills/spec/SKILL.md'], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `git check-attr falhou: ${r.stderr}`);
  assert.match(r.stdout, /text: unset/, 'a zona das skills está sujeita à conversão de fim de linha');
});

test('e o resto do repositorio CONTINUA sob a conversao — controle negativo', () => {
  // A OUTRA PONTA, e ela não é enfeite: um `.gitattributes` com `** -text` na raiz passaria no
  // teste acima e mudaria o fim de linha do harness inteiro, incluindo os `.mjs` do maquinário.
  //
  // Asserção POSITIVA, não só "não é unset": o valor de hoje é `text: auto`, do `* text=auto`
  // de 3cd26fd (M1). Travar o valor exato declara a intenção — "o resto do repositório segue sob
  // a normalização de M1" — em vez de só proibir o valor nomeado do ataque. E não fica mais
  // frágil por isso: se o `.gitattributes` da raiz um dia trocar de mecanismo de normalização,
  // é exatamente essa invariante que este teste existe para proteger, então ele DEVE quebrar
  // nesse dia e obrigar quem mexeu a atualizar a asserção de propósito, não por acidente.
  const r = spawnSync('git', ['check-attr', 'text', '--', 'README.md'], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `git check-attr falhou: ${r.stderr}`);
  assert.match(r.stdout, /text: auto/, `o resto do repositorio saiu da normalizacao de M1: ${r.stdout.trim()}`);
});

test('o procedimento de atualizacao do kit esta escrito, e o README aponta para ele', () => {
  // A Decisão 31 é exceção NOMEADA à Decisão 18, e ela governa toda entrega futura do upstream.
  // Procedimento que só existe em contexto de conversa não existe: a próxima entrega seria
  // tratada por quem estivesse por perto, do jeito que parecesse razoável na hora, e as edições
  // de skill do Plano 5 iriam embora sem ninguém notar.
  //
  // AS MARCAS SÃO ESTRUTURAIS, NÃO FRASES DE PROSA — decisão de pré-voo do usuário, 2026-09-09.
  // Uma versão anterior deste teste exigia frases soltas ("o que o upstream mudou"), e reescrever
  // a frase derrubaria o teste sem nada ter piorado. Títulos de seção são contrato de estrutura, e
  // é assim que o próprio kit valida artefato markdown: o `check-hld.py` cobra as seções do
  // `hld.md` por título exato. Os três nomes de skill entram porque são as três diferenças
  // deliberadas — o dado que a próxima atualização precisa preservar, e o único conteúdo deste
  // documento cuja perda causa dano silencioso.
  const man = readFileSync(join(RAIZ, 'MANUTENCAO.md'), 'utf8');
  for (const marca of [
    '## O kit vendorizado é a fonte única de verdade',
    '## Atualizar é merge de três pontas — exceção nomeada à Decisão 18',
    '## As três diferenças deliberadas — preserve-as',
    '## Duas ferramentas do upstream que a nossa cópia NÃO tem',
    'spec-init',
    'auditoria-de-us',
    'revisao-de-seguranca',
  ]) {
    assert.ok(man.includes(marca), `MANUTENCAO.md não tem "${marca}"`);
  }
  // E o ponteiro, porque documento que ninguém encontra é documento que ninguém segue.
  const readme = readFileSync(join(RAIZ, 'README.md'), 'utf8');
  assert.match(readme, /MANUTENCAO\.md/, 'o README não aponta para o MANUTENCAO.md');
});

test('K1 Task 8: a seção "Gerar a versão Kiro" diz o comando, a regra de nunca editar, e a tabela de reescrita', () => {
  const man = readFileSync(join(RAIZ, 'MANUTENCAO.md'), 'utf8');
  const i = man.indexOf('## Gerar a versão Kiro');
  assert.ok(i >= 0);
  const j = man.indexOf('\n## ', i + 1);
  const secao = man.slice(i, j < 0 ? undefined : j);
  assert.match(secao, /node \.claude\/ferramentas\/gerar-kiro\.mjs --saida \.\.\/harness-elo-v2-kiro --verificar/);
  assert.match(secao, /nunca (é|se) edita/i);
  assert.match(secao, /geradoDe/);
  assert.match(secao, /REESCRITAS/);
  assert.match(secao, /REMENDOS/);
  assert.match(secao, /PYTHON_REPORT/);
  assert.ok(!/seção completa na Task 8/.test(secao), 'a linha provisória sumiu');
});

test('Decisão 40: o marcador de template está no .gitignore e NÃO está versionado', () => {
  // AS DUAS PONTAS SÃO UMA SÓ INVARIANTE VISTA DOS DOIS LADOS, e nenhuma delas basta sozinha. Se o
  // `.harness-template` sair do `.gitignore`, ele passa a aparecer no `git status` de todo clone e
  // alguém o comita por engano; se ele estiver VERSIONADO, viaja no `git clone` e a detecção
  // INVERTE — todo clone passa a receber a mensagem de mantenedor, que manda seguir um documento de
  // manutenção de template que o clone não deveria seguir. O segundo é o dano caro, e é ele que
  // justifica a asserção existir num teste de forma-do-clone em vez de num teste de trava.
  const ignorado = spawnSync('git', ['check-ignore', '-q', '.harness-template'], { cwd: RAIZ });
  assert.equal(ignorado.status, 0, '`.harness-template` precisa estar ignorado — versionado, viaja no clone');
  const versionado = spawnSync('git', ['ls-files', '--error-unmatch', '.harness-template'], { cwd: RAIZ, encoding: 'utf8' });
  assert.notEqual(versionado.status, 0, '`.harness-template` está versionado — a detecção inverte em todo clone');
  // E A TERCEIRA PONTA, que é uma referência cruzada e não uma frase: a mensagem de mantenedor manda
  // o leitor seguir o `MANUTENCAO.md` (prendido no `zonas.test.mjs`), e um `MANUTENCAO.md` que não
  // explica o marcador manda esse leitor para um documento que não responde a pergunta dele.
  const man = readFileSync(join(RAIZ, 'MANUTENCAO.md'), 'utf8');
  assert.ok(man.includes('.harness-template'), 'o MANUTENCAO.md não ensina a criar o marcador');
  // As duas frases que descreviam a Decisão 40 como pendência ABERTA foram removidas quando a
  // decisão fechou — se qualquer uma delas voltar, é sinal de que um merge ou um copiar-e-colar
  // trouxe de volta um texto que já foi corrigido.
  assert.doesNotMatch(man, /fica pendente para o Plano 5/);
  assert.doesNotMatch(man, /o registro da pendência, não a resolução/);
});
