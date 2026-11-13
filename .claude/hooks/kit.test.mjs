import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  RAIZ_EXPLORE, RAIZ_SPEC, DOCS_EXPLORE, WHITELIST_EXPLORE, ARTEFATOS_PROTOTIPO, ZONA_IMUTAVEL,
  ehWhitelistExplore, ehZonaImutavel, faltantesExplore, detectarFase, validadorPara, inventariar,
  relativizar, ehDoExplore, podeSerDoExplore, protegidosContidosEm, MARCADOR_CONGELAMENTO,
  CODIGOS_DE_AUSENCIA_DE_DOCUMENTO,
  PROTOTIPO_MD, FIDELIDADE_DO_EXPLORE, lerFidelidade, nivelDeFidelidade,
} from './kit.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function fatos(over = {}) {
  return { spec: new Set(), temMarcadorUS: false, temRepoCodigo: false, ...over };
}

test('as raízes são outputs/explore e outputs/spec', () => {
  assert.equal(RAIZ_EXPLORE, 'outputs/explore');
  assert.equal(RAIZ_SPEC, 'outputs/spec');
});

test('DOCS_EXPLORE tem cinco artefatos, com modelo-de-dados opcional', () => {
  assert.equal(DOCS_EXPLORE.length, 5);
  const porCaminho = new Map(DOCS_EXPLORE.map((d) => [d.caminho, d]));
  assert.equal(porCaminho.get('hld-funcional.md').obrigatorio, true);
  assert.equal(porCaminho.get('especificacao-funcional.md').obrigatorio, true);
  assert.equal(porCaminho.get('especificacao-tecnica.md').obrigatorio, true);
  assert.equal(porCaminho.get('gaps.md').obrigatorio, true);
  assert.equal(porCaminho.get('modelo-de-dados.md').obrigatorio, false);
});

test('todo DOCS_EXPLORE tem rótulo legível', () => {
  for (const d of DOCS_EXPLORE) assert.ok(d.rotulo && d.rotulo.length > 3, d.caminho);
});

test('ZONA_IMUTAVEL bate com o harness.json — uma fonte só', () => {
  const h = JSON.parse(readFileSync(join(RAIZ, 'harness.json'), 'utf8'));
  assert.deepEqual([...ZONA_IMUTAVEL].sort(), [...h.zonaImutavel].sort());
});

test('ehZonaImutavel reconhece caminho de maquinário', () => {
  assert.equal(ehZonaImutavel('.claude/hooks/kit.mjs'), true);
  assert.equal(ehZonaImutavel('.claude/templates/gaps.md'), true);
  assert.equal(ehZonaImutavel('.claude/rules/harness/explore.md'), true);
  assert.equal(ehZonaImutavel('CLAUDE.md'), true);
  assert.equal(ehZonaImutavel('.claude/skills/spec-product/SKILL.md'), true);
  assert.equal(ehZonaImutavel('.claude/ferramentas/promocao.mjs'), true);
});

test('ehZonaImutavel libera a zona mutável', () => {
  assert.equal(ehZonaImutavel('outputs/explore/gaps.md'), false);
  assert.equal(ehZonaImutavel('outputs/spec/modules.md'), false);
  assert.equal(ehZonaImutavel('inputs/briefing.docx'), false);
  assert.equal(ehZonaImutavel('.claude/rules/frontend.md'), false);
  assert.equal(ehZonaImutavel('workspace.md'), false);
});

test('ehZonaImutavel normaliza barra invertida do Windows', () => {
  assert.equal(ehZonaImutavel('.claude\\hooks\\kit.mjs'), true);
  assert.equal(ehZonaImutavel('outputs\\explore\\gaps.md'), false);
});

test('ehZonaImutavel não confunde prefixo parcial', () => {
  assert.equal(ehZonaImutavel('.claude/rules/harness-do-projeto.md'), false);
  assert.equal(ehZonaImutavel('skills-extras/x.md'), false);
});

test('ehZonaImutavel casa o próprio diretório, sem barra final (N5)', () => {
  assert.equal(ehZonaImutavel('.claude/hooks'), true);
  assert.equal(ehZonaImutavel('.claude/templates'), true);
  assert.equal(ehZonaImutavel('.claude/skills'), true);
});

test('ehZonaImutavel lança em caminho absoluto Windows', () => {
  assert.throws(() => ehZonaImutavel('C:\\repo\\CLAUDE.md'), /absoluto/);
  assert.throws(() => ehZonaImutavel('C:/repo/CLAUDE.md'), /absoluto/);
});

test('ehZonaImutavel lança em caminho absoluto POSIX', () => {
  assert.throws(() => ehZonaImutavel('/repo/CLAUDE.md'), /absoluto/);
});

test('ehWhitelistExplore lança em caminho absoluto Windows e POSIX', () => {
  assert.throws(() => ehWhitelistExplore('C:\\repo\\outputs\\spec\\sync-log.md'), /absoluto/);
  assert.throws(() => ehWhitelistExplore('/repo/outputs/spec/sync-log.md'), /absoluto/);
});

test('validadorPara lança em caminho absoluto Windows e POSIX', () => {
  assert.throws(() => validadorPara('C:\\repo\\outputs\\explore\\gaps.md'), /absoluto/);
  assert.throws(() => validadorPara('/repo/outputs/explore/gaps.md'), /absoluto/);
});

test('detectarFase lança em caminho absoluto Windows e POSIX', () => {
  assert.throws(
    () => detectarFase(fatos({ spec: new Set(['C:\\repo\\outputs\\spec\\sync-log.md']) })),
    /absoluto/,
  );
  assert.throws(
    () => detectarFase(fatos({ spec: new Set(['/repo/outputs/spec/sync-log.md']) })),
    /absoluto/,
  );
});

test('detectarFase lança em nome nu, sem o prefixo outputs/spec/', () => {
  // O defeito que esta guarda fecha já mordeu DUAS tarefas: `fatos.spec` montado com o retorno
  // cru de `inventariar(join(raiz, RAIZ_SPEC))` faz `ehWhitelistExplore` responder `false` para
  // TUDO, a WHITELIST_EXPLORE fica inerte, e o `sync-log.md` que o próprio kickoff escreve passa
  // a caracterizar fase Plan num projeto que está em Explore. Errar em silêncio era o problema;
  // agora a função recusa em voz alta.
  assert.throws(
    () => detectarFase(fatos({ spec: new Set(['modules.md']) })),
    /não está sob outputs\/spec/,
  );
  assert.throws(
    () => detectarFase(fatos({ spec: new Set(['sync-log.md']) })),
    /não está sob outputs\/spec/,
  );
});

test('a mensagem da guarda do prefixo nomeia o caminho recebido e diz o que usar', () => {
  assert.throws(
    () => detectarFase(fatos({ spec: new Set(['sync-log.md']) })),
    (e) => {
      // Quem lê a mensagem precisa das três coisas: quem recusou, o que chegou — com a caixa
      // exata que o chamador escreveu, senão a mensagem aponta para string que ninguém digitou —
      // e o que fazer no lugar. É o mesmo contrato da mensagem do `exigirRelativo`.
      assert.match(e.message, /^detectarFase:/);
      assert.match(e.message, /"sync-log\.md"/);
      assert.match(e.message, /inventariar/);
      assert.match(e.message, /outputs\/spec/);
      return true;
    },
  );
});

test('a guarda do prefixo NÃO rejeita caixa alta nem travessia', () => {
  // A armadilha desta guarda, e o teste existe para prendê-la: `rel.startsWith('outputs/spec/')`
  // recusaria `outputs/SPEC/sync-log.md`, que a whitelist whitelista hoje — falso positivo dentro
  // de um verificador BLOQUEANTE (`cadeia.mjs`), a pior categoria sob o modelo de ameaça deste
  // projeto. A guarda tem que reusar a mesma normalização de `ehWhitelistExplore`.
  assert.doesNotThrow(() => detectarFase(fatos({ spec: new Set(['outputs/SPEC/sync-log.md']) })));
  assert.doesNotThrow(
    () => detectarFase(fatos({ spec: new Set(['outputs/spec/legacy/../context-map.md']) })),
  );
  // A travessia que ESCAPA da raiz do spec continua sendo nome nu depois de normalizada, e a
  // guarda tem que enxergar isso: `outputs/spec/../sync-log.md` é `sync-log.md`.
  assert.throws(
    () => detectarFase(fatos({ spec: new Set(['outputs/spec/../sync-log.md']) })),
    /não está sob outputs\/spec/,
  );
});

test('relativizar: devolve o caminho relativo à raiz, com barra normal', () => {
  assert.equal(relativizar('C:/repo', 'C:/repo/outputs/explore/gaps.md'), 'outputs/explore/gaps.md');
  assert.equal(relativizar('/repo', '/repo/CLAUDE.md'), 'CLAUDE.md');
});

test('relativizar: devolve null para caminho fora da raiz', () => {
  assert.equal(relativizar('C:/repo', 'C:/outro/gaps.md'), null);
  assert.equal(relativizar('/repo', '/outro/gaps.md'), null);
});

test('relativizar: normaliza barra invertida do Windows', () => {
  assert.equal(relativizar('C:\\repo', 'C:\\repo\\outputs\\explore\\gaps.md'), 'outputs/explore/gaps.md');
});

test('WHITELIST_EXPLORE tem os caminhos que o Explore pode escrever em outputs/spec', () => {
  for (const c of ['sync-log.md', 'context-map.md', 'benchmark.md', 'prototype.md',
                   'design-system.md', 'screens-manifest.json']) {
    assert.ok(WHITELIST_EXPLORE.includes(c), c);
  }
});

test('D1 — a saída da `spec-frame` é do Explore: `frame.md` e `frame/` na whitelist, e a fase fica Explore', () => {
  // O teste ponta a ponta da 2.6.0 mediu: a `spec-frame` (acelerador do Explore para pedido vago)
  // grava `outputs/spec/frame.md` e `outputs/spec/frame/pre-prototype/`, a whitelist não tinha
  // nenhum dos dois, o fecho NEGAVA a escrita e, com o arquivo presente, o `estado` anunciava Plan.
  // A skill não tinha fase onde funcionasse. As DUAS perguntas que a lista responde, medidas aqui.
  assert.ok(WHITELIST_EXPLORE.includes('frame.md'));
  assert.ok(WHITELIST_EXPLORE.includes('frame/'));
  assert.equal(ehWhitelistExplore('outputs/spec/frame.md'), true);
  assert.equal(ehWhitelistExplore('outputs/spec/frame/pre-prototype/lista-de-pedidos.html'), true);
  assert.equal(detectarFase(fatos({
    spec: new Set([
      'outputs/spec/sync-log.md',
      'outputs/spec/frame.md',
      'outputs/spec/frame/pre-prototype/lista-de-pedidos.html',
    ]),
  })), 'explore');
  // A outra ponta: `frame/` é diretório, não prefixo de nome — `frame-v2.md` não entra de carona.
  assert.equal(ehWhitelistExplore('outputs/spec/frame-v2.md'), false);
});

test('D9 — lerFidelidade lê a linha `Fidelidade:` do cabeçalho do prototype.md, em qualquer forma', () => {
  // A forma do template da `spec-prototype` e as variações que um consultor escreve à mão.
  assert.equal(lerFidelidade('# Protótipo\n\nModo: geração\nFidelidade: alta\n'), 'alta');
  assert.equal(lerFidelidade('**Fidelidade:** Alta'), 'Alta');
  assert.equal(lerFidelidade('> **Fidelidade**: média'), 'média');
  assert.equal(lerFidelidade('- Fidelidade: baixa'), 'baixa');
  // A primeira declaração vale; citação depois do cabeçalho não muda nada.
  assert.equal(lerFidelidade('Fidelidade: alta\n\n> o template diz «Fidelidade: baixa | média | alta»'), 'alta');
  // Sem declaração: linha ausente, linha vazia, e rótulo que não abre a linha.
  assert.equal(lerFidelidade('# Protótipo\n\nSeis estados.\n'), null);
  assert.equal(lerFidelidade('Fidelidade:   \n'), null);
  assert.equal(lerFidelidade('> Escolha de fidelidade do teste: **Média**'), null);
  assert.equal(lerFidelidade(''), null);
});

test('D9 — nivelDeFidelidade: caixa e acento livres; o template intocado não escolhe nível', () => {
  assert.equal(nivelDeFidelidade('alta'), 'alta');
  assert.equal(nivelDeFidelidade('ALTA (frontend completo em `src/`)'), 'alta');
  assert.equal(nivelDeFidelidade('Média'), 'media');
  assert.equal(nivelDeFidelidade('media'), 'media');
  assert.equal(nivelDeFidelidade('baixa'), 'baixa');
  // A linha do template lista as opções — nem a primeira (baixa) nem a última (alta) vale.
  assert.equal(nivelDeFidelidade('baixa | média | alta'), null);
  assert.equal(nivelDeFidelidade('altíssima'), null);
  assert.equal(nivelDeFidelidade(null), null);
  assert.equal(FIDELIDADE_DO_EXPLORE, 'alta');
  assert.ok(ARTEFATOS_PROTOTIPO.includes(PROTOTIPO_MD));
});

test('ehWhitelistExplore aceita arquivo whitelistado', () => {
  assert.equal(ehWhitelistExplore('outputs/spec/sync-log.md'), true);
  assert.equal(ehWhitelistExplore('outputs/spec/prototype.md'), true);
});

test('ehWhitelistExplore aceita arquivo dentro de diretório whitelistado', () => {
  assert.equal(ehWhitelistExplore('outputs/spec/screens/login.png'), true);
  assert.equal(ehWhitelistExplore('outputs/spec/legacy/dim-08.md'), true);
});

test('ehWhitelistExplore recusa artefato de fase Plan', () => {
  assert.equal(ehWhitelistExplore('outputs/spec/modules.md'), false);
  assert.equal(ehWhitelistExplore('outputs/spec/business-rules.md'), false);
  assert.equal(ehWhitelistExplore('outputs/spec/tech-rules/security.mdc'), false);
  assert.equal(ehWhitelistExplore('outputs/spec/data-model.json'), false);
});

test('ehWhitelistExplore recusa caminho fora de outputs/spec', () => {
  assert.equal(ehWhitelistExplore('outputs/explore/gaps.md'), false);
});

// ————— o maquinário do gate na whitelist: a Parte 1 da opção A′ (C-1 da rodada L) —————

test('ehWhitelistExplore aceita o relatório de revisão e o arquivo de isenção', () => {
  // Os dois são escritos DURANTE o Explore, e é o próprio gate do fecho que exige um e oferece o
  // outro. Antes da rodada M eles estavam isentos só da fronteira, por uma lista privada do
  // `fecho-explore`, e `detectarFase` continuava respondendo `plan` para eles — o C-1: obedecer ao
  // item 5 do gate declarava o projeto em Plan e derrubava a `spec-prototype`, que é obrigatória
  // no Explore. Tirar qualquer uma das duas linhas da `WHITELIST_EXPLORE` reabre o laço.
  assert.equal(ehWhitelistExplore('outputs/spec/revisao.json'), true);
  assert.equal(ehWhitelistExplore('outputs/spec/auditorias/_isencoes/isencao-acme.md'), true);
});

test('ehWhitelistExplore recusa auditorias/code-audit.md — a rodada K estreitou de propósito', () => {
  // A whitelist cobre `auditorias/_isencoes/`, não `auditorias/` inteiro. `code-audit.md` e
  // `security-review.md` são saída de fase Plan como qualquer outra; alargar a entrada para a
  // pasta os isentaria de graça e faria um Plan em andamento parecer Explore.
  assert.equal(ehWhitelistExplore('outputs/spec/auditorias/code-audit.md'), false);
  assert.equal(ehWhitelistExplore('outputs/spec/auditorias/security-review.md'), false);
  assert.equal(ehWhitelistExplore('outputs/spec/auditorias/_gate-ledger.md'), false);
});

// ————— e a MESMA lista vista pela segunda pergunta que ela responde: a fase —————
//
// A suíte media bem a FRONTEIRA e não media FASE nenhuma sobre estes arquivos — foi por aí que o
// C-1 passou. Os três abaixo fixam o de-para inteiro: maquinário ⇒ explore, artefato de Plan ⇒
// plan, e o marcador ⇒ plan mesmo sendo escrito no fim do Explore.

test('detectarFase: só maquinário do Explore em outputs/spec ⇒ explore', () => {
  assert.equal(detectarFase(fatos({
    spec: new Set([
      'outputs/spec/sync-log.md',
      'outputs/spec/revisao.json',
      'outputs/spec/auditorias/_isencoes/isencao-acme.md',
    ]),
  })), 'explore');
});

test('detectarFase: maquinário mais UM artefato de Plan ⇒ plan', () => {
  // O par do teste acima: a fase não é "explore" por o maquinário estar lá, é "explore" enquanto
  // NADA fora da whitelist tiver sido escrito. Sem este, alargar a whitelist passaria batido.
  assert.equal(detectarFase(fatos({
    spec: new Set([
      'outputs/spec/sync-log.md',
      'outputs/spec/revisao.json',
      'outputs/spec/modules.md',
    ]),
  })), 'plan');
});

test('detectarFase: o marcador de congelamento ⇒ plan, e isso é desenho', () => {
  // O marcador é escrito na conclusão do `spec-product`, já no Plan (ver o JSDoc de
  // `MARCADOR_CONGELAMENTO`). Ele fica FORA da `WHITELIST_EXPLORE` de propósito, e continua isento
  // só da FRONTEIRA, pela `EXCECOES_DE_FRONTEIRA` do `fecho-explore`. Este teste é o que impede a
  // whitelist de crescer por simetria: acrescentar o marcador a ela faria um projeto congelado
  // voltar a parecer Explore.
  assert.equal(ehWhitelistExplore(MARCADOR_CONGELAMENTO), false);
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/spec/sync-log.md', MARCADOR_CONGELAMENTO]),
  })), 'plan');
});

test('faltantesExplore devolve vazio com os quatro obrigatórios presentes', () => {
  const presentes = new Set(['hld-funcional.md', 'especificacao-funcional.md',
                             'especificacao-tecnica.md', 'gaps.md']);
  assert.deepEqual(faltantesExplore(presentes), []);
});

test('faltantesExplore não cobra o modelo-de-dados opcional', () => {
  const presentes = new Set(['hld-funcional.md', 'especificacao-funcional.md',
                             'especificacao-tecnica.md', 'gaps.md']);
  assert.ok(!faltantesExplore(presentes).some((f) => f.caminho === 'modelo-de-dados.md'));
});

test('faltantesExplore aponta o que falta com rótulo', () => {
  const presentes = new Set(['hld-funcional.md', 'gaps.md']);
  const f = faltantesExplore(presentes);
  assert.deepEqual(f.map((x) => x.caminho).sort(),
    ['especificacao-funcional.md', 'especificacao-tecnica.md']);
  assert.ok(f.every((x) => x.rotulo.length > 3));
});

test('detectarFase: projeto zerado é explore', () => {
  assert.equal(detectarFase(fatos()), 'explore');
});

test('detectarFase: whitelist escrita ainda é explore', () => {
  // Convenção única (pós-C2): fatos.spec traz o caminho completo, relativo à raiz do projeto,
  // com o prefixo outputs/spec/ — igual ao que ehWhitelistExplore exige. A tolerância ao nome
  // nu (sem prefixo) foi removida de propósito; ver detectarFase em kit.mjs.
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/spec/sync-log.md', 'outputs/spec/context-map.md', 'outputs/spec/prototype.md']),
  })), 'explore');
});

test('detectarFase: escrita fora da whitelist é plan', () => {
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/spec/sync-log.md', 'outputs/spec/modules.md']),
  })), 'plan');
});

test('detectarFase: fatos.spec com caminho completo whitelistado ainda é explore', () => {
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/spec/sync-log.md']),
  })), 'explore');
});

test('detectarFase: fatos.spec com caminho completo não whitelistado é plan', () => {
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/spec/modules.md']),
  })), 'plan');
});

test('detectarFase: marcador de US aberta é deliver', () => {
  assert.equal(detectarFase(fatos({ temMarcadorUS: true })), 'deliver');
});

// Os dois casos abaixo passavam `fatos.spec` em nome nu (`'modules.md'`) e continuavam verdes
// depois da guarda do prefixo, porque o curto-circuito do `deliver` devolve antes de olhar o
// `spec`. Foram prefixados assim mesmo: nome nu deixou de ser entrada legítima de `fatos.spec`, e
// teste que exibe a forma proibida como se fosse normal é documentação que mente. O que estes dois
// medem — a precedência `deliver` sobre `plan` — não muda com o prefixo: o veredito vem do outro
// campo, e continua vermelho se a precedência for invertida.
test('detectarFase: repositório com papel codigo é deliver', () => {
  assert.equal(
    detectarFase(fatos({ spec: new Set(['outputs/spec/modules.md']), temRepoCodigo: true })),
    'deliver',
  );
});

test('detectarFase: deliver vence plan', () => {
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/spec/modules.md', 'outputs/spec/tasks.json']), temMarcadorUS: true,
  })), 'deliver');
});

test('validadorPara: flow-map usa check-flowmap', () => {
  assert.equal(validadorPara('outputs/spec/flow-map.md'), 'check-flowmap');
});

test('validadorPara: prototype e modules usam check-modules', () => {
  assert.equal(validadorPara('outputs/spec/prototype.md'), 'check-modules');
  assert.equal(validadorPara('outputs/spec/modules.md'), 'check-modules');
});

test('validadorPara: documento do Explore usa o validador do Explore', () => {
  assert.equal(validadorPara('outputs/explore/hld-funcional.md'), 'check-explore');
  assert.equal(validadorPara('outputs/explore/gaps.md'), 'check-explore');
});

test('validadorPara: arquivo sem validador dedicado devolve null', () => {
  assert.equal(validadorPara('outputs/spec/benchmark.md'), null);
  assert.equal(validadorPara('qualquer/coisa.txt'), null);
});

test('validadorPara: normaliza barra invertida do Windows', () => {
  assert.equal(validadorPara('outputs\\spec\\flow-map.md'), 'check-flowmap');
});

test('ARTEFATOS_PROTOTIPO são os três que a spec-prototype deixa', () => {
  assert.deepEqual([...ARTEFATOS_PROTOTIPO].sort(),
    ['design-system.md', 'prototype.md', 'screens-manifest.json']);
});

test('inventariar lista arquivos recursivamente com barra normal', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'kit-'));
  mkdirSync(join(raiz, 'screens'), { recursive: true });
  writeFileSync(join(raiz, 'sync-log.md'), 'x');
  writeFileSync(join(raiz, 'screens', 'login.png'), 'x');
  const presentes = inventariar(raiz);
  assert.ok(presentes.has('sync-log.md'));
  assert.ok(presentes.has('screens/login.png'));
});

test('inventariar devolve conjunto vazio para raiz inexistente', () => {
  assert.equal(inventariar(join(tmpdir(), 'nao-existe-mesmo-123')).size, 0);
});

test('inventariar propaga erro de I/O que não seja ausência de raiz', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'kit-'));
  // Simula falha de permissão/I/O numa raiz que EXISTE, via injeção de leitor — não pode virar
  // conjunto vazio silenciosamente, senão um verificador que falha fechado libera indevidamente.
  const lerDiretorioComFalha = () => {
    const erro = new Error('EACCES: permission denied');
    erro.code = 'EACCES';
    throw erro;
  };
  assert.throws(() => inventariar(raiz, lerDiretorioComFalha), /EACCES/);
});

// ————————————————— Task 8: contratos executáveis —————————————————

import {
  ID_PADRAO, ID_PROIBIDO_NO_EXPLORE, FAMILIAS_EXPLORE,
  validarId, extrairIds, acharProibidos,
  MARCADOR_US, DIR_AUDITORIAS, DIR_ISENCOES, LEDGER_GATE, BLOCO_ISENCAO,
  lerVersaoTemplate,
} from './kit.mjs';

test('FAMILIAS_EXPLORE são exatamente as quatro do vocabulário', () => {
  assert.deepEqual([...FAMILIAS_EXPLORE].sort(), ['GAP', 'MOD', 'RF', 'RN']);
});

test('ID_PADRAO cobre as quatro famílias', () => {
  for (const f of FAMILIAS_EXPLORE) assert.ok(ID_PADRAO[f], f);
});

test('validarId: módulo aceita código longo e com hífen', () => {
  assert.equal(validarId('MOD', 'MOD-PAGAMENTOS'), true);
  assert.equal(validarId('MOD', 'MOD-ACOMP-CARGA'), true);
  assert.equal(validarId('MOD', 'MOD-PAG'), true);
  assert.equal(validarId('MOD', 'MOD-A1'), true);
});

test('validarId: módulo recusa minúscula, código vazio e hífen sobrando', () => {
  assert.equal(validarId('MOD', 'MOD-pagamentos'), false);
  assert.equal(validarId('MOD', 'MOD-'), false);
  assert.equal(validarId('MOD', 'MOD'), false);
  assert.equal(validarId('MOD', 'MOD-PAG-'), false);
});

test('validarId: RF exige três dígitos e tolera quatro', () => {
  assert.equal(validarId('RF', 'RF-007'), true);
  assert.equal(validarId('RF', 'RF-120'), true);
  assert.equal(validarId('RF', 'RF-1200'), true);
});

test('validarId: RF recusa um e dois dígitos — o padding é contratual', () => {
  assert.equal(validarId('RF', 'RF-7'), false);
  assert.equal(validarId('RF', 'RF-07'), false);
});

test('validarId: RF recusa cinco dígitos e sufixo', () => {
  assert.equal(validarId('RF', 'RF-00007'), false);
  assert.equal(validarId('RF', 'RF-007a'), false);
});

test('validarId: RN e GAP seguem a mesma regra do RF', () => {
  assert.equal(validarId('RN', 'RN-001'), true);
  assert.equal(validarId('RN', 'RN-1'), false);
  assert.equal(validarId('GAP', 'GAP-042'), true);
  assert.equal(validarId('GAP', 'GAP-42'), false);
});

test('validarId: família desconhecida devolve false em vez de lançar', () => {
  assert.equal(validarId('XPTO', 'XPTO-001'), false);
});

test('extrairIds acha na ordem de aparição, sem duplicata', () => {
  const t = 'A RF-010 depende de RF-002. Ver RF-010 de novo.';
  assert.deepEqual(extrairIds('RF', t), ['RF-010', 'RF-002']);
});

test('extrairIds de módulo não confunde com ID já promovido pelo kit', () => {
  const t = 'O MOD-PAGAMENTOS tem RF-MOD-PAGAMENTOS-003 no Plan.';
  assert.deepEqual(extrairIds('MOD', t), ['MOD-PAGAMENTOS']);
});

test('extrairIds não captura hífen sobrando no fim', () => {
  assert.deepEqual(extrairIds('MOD', 'veja MOD-PAG- e pronto'), ['MOD-PAG']);
});

// ————— Task de revisão: buraco do hífen na fronteira à direita de varrer() —————
//
// O lookahead antigo, `(?![A-Za-z0-9])`, bloqueava letra e dígito colados mas não hífen: um ID
// formalmente válido (`RF-007`, `MOD-PAG`) era podado de um token malformado (`RF-007-abc`,
// `MOD-PAG-abc`) e devolvido como se fosse referência correta. O invariante "todo ID extraído
// passa em validarId" não pega este caso porque a poda produz um ID que validarId aceita — a
// fonte única concorda consigo mesma sobre um resultado que já está errado antes de chegar lá.
//
// A correção distingue hífen-antes-de-alfanumérico (token malformado, não extrai nada) de
// hífen-antes-de-espaço/pontuação/fim (lixo tipográfico tolerado, extrai o ID).

test('extrairIds não extrai quando hífen depois do ID é seguido de alfanumérico — RF-007-abc', () => {
  assert.deepEqual(extrairIds('RF', 'RF-007-abc'), []);
});

test('extrairIds não extrai quando hífen depois do ID é seguido de alfanumérico — MOD-PAG-abc', () => {
  assert.deepEqual(extrairIds('MOD', 'MOD-PAG-abc'), []);
});

test('extrairIds não extrai quando hífen depois do ID é seguido de dígito — MOD-PAG-1abc', () => {
  assert.deepEqual(extrairIds('MOD', 'MOD-PAG-1abc'), []);
});

test('acharProibidos não extrai quando hífen depois do ID é seguido de alfanumérico — F-001-abc', () => {
  assert.deepEqual(acharProibidos('F-001-abc no texto'), []);
});

test('extrairIds continua extraindo quando hífen depois do ID é seguido de espaço — armadilha da correção', () => {
  // Este é o caso que uma correção ingênua (bloquear todo hífen no lookahead) quebraria: aqui o
  // hífen é pontuação solta antes de espaço, não continuação de token, e o ID tem que sair.
  assert.deepEqual(extrairIds('MOD', 'veja MOD-PAG- e pronto'), ['MOD-PAG']);
});

test('extrairIds extrai módulo com múltiplos segmentos hifenizados seguido de espaço', () => {
  assert.deepEqual(extrairIds('MOD', 'MOD-ACOMP-CARGA na tabela'), ['MOD-ACOMP-CARGA']);
});

test('extrairIds ignora o miolo promovido pelo kit mesmo com texto ao redor', () => {
  assert.deepEqual(
    extrairIds('MOD', 'O MOD-PAGAMENTOS virou RF-MOD-PAGAMENTOS-003'),
    ['MOD-PAGAMENTOS'],
  );
});

test('extrairIds extrai RF isolado por barra de tabela markdown', () => {
  assert.deepEqual(extrairIds('RF', '| RF-001 | RN-012 |'), ['RF-001']);
});

test('extrairIds extrai RF seguido de ponto final de frase', () => {
  assert.deepEqual(extrairIds('RF', '- RF-007.'), ['RF-007']);
});

test('extrairIds extrai RF sozinho, sem nenhum vizinho', () => {
  assert.deepEqual(extrairIds('RF', 'RF-007'), ['RF-007']);
});

test('extrairIds: regra geral — prefixo válido seguido de hífen+alfanumérico nunca é extraído, nas quatro famílias', () => {
  const casosPorFamilia = {
    RF: ['RF-007-abc', 'RF-007-1'],
    RN: ['RN-001-abc', 'RN-001-9'],
    GAP: ['GAP-042-abc', 'GAP-042-9'],
    MOD: ['MOD-PAG-abc', 'MOD-PAG-1abc', 'MOD-ACOMP-CARGA-extra'],
  };
  for (const familia of FAMILIAS_EXPLORE) {
    for (const texto of casosPorFamilia[familia]) {
      assert.deepEqual(
        extrairIds(familia, texto),
        [],
        `${familia}: "${texto}" tem prefixo válido colado por hífen a alfanumérico — não devia extrair nada`,
      );
    }
  }
});

test('extrairIds devolve vazio quando não há nenhum', () => {
  assert.deepEqual(extrairIds('RF', 'texto sem identificador'), []);
});

test('extrairIds ignora ID mal formado', () => {
  assert.deepEqual(extrairIds('RF', 'RF-7 e RF-07 são inválidos'), []);
});

test('extrairIds de família desconhecida devolve vazio', () => {
  assert.deepEqual(extrairIds('XPTO', 'XPTO-001'), []);
});

test('extrairIds não poda sufixo de letra em ID malformado — RF-007a não é extraído', () => {
  // Defeito: o lookahead antigo só bloqueava dígito depois do ID, não letra. `RF-007a` era
  // podado para `RF-007` e devolvido como válido, embora validarId('RF','RF-007a') seja false.
  assert.deepEqual(extrairIds('RF', 'texto com RF-007a'), []);
  assert.equal(validarId('RF', 'RF-007a'), false);
});

test('extrairIds não poda sufixo de letra em ID malformado — MOD-PAGx não é extraído', () => {
  assert.deepEqual(extrairIds('MOD', 'texto com MOD-PAGx'), []);
  assert.equal(validarId('MOD', 'MOD-PAGx'), false);
});

test('extrairIds não casa ID colado a letra minúscula antes — xRF-007 não é extraído', () => {
  // Versão espelhada, menor: o lookbehind antigo bloqueava [A-Z0-9-] mas não minúscula.
  assert.deepEqual(extrairIds('RF', 'xRF-007'), []);
});

test('extrairIds: invariante — todo ID devolvido passa em validarId da mesma família', () => {
  // O contrato que interessa não é a regex específica, é isto: extrairIds e validarId nunca
  // podem discordar sobre o mesmo texto, porque quatro consumidores (dois bloqueantes) leem
  // esta fonte única esperando que concordem entre si.
  const textos = {
    RF: 'RF-007 válido, RF-007a malformado, xRF-010 malformado, RF-12 malformado, RF-0100 válido.',
    RN: 'RN-001 válido, RN-001x malformado, aRN-002 malformado.',
    GAP: 'GAP-042 válido, GAP-042b malformado, zGAP-005 malformado.',
    MOD: 'MOD-PAGAMENTOS válido, MOD-PAGx malformado, xMOD-COBRANCA malformado, MOD-PAG- typo tolerado.',
  };
  for (const familia of FAMILIAS_EXPLORE) {
    const achados = extrairIds(familia, textos[familia]);
    assert.ok(achados.length > 0, `${familia}: esperava ao menos um ID válido extraído`);
    for (const id of achados) {
      assert.ok(validarId(familia, id), `${familia}: extrairIds devolveu "${id}", que validarId recusa`);
    }
  }
});

test('acharProibidos encontra F-xxx, que é vocabulário do kit', () => {
  assert.deepEqual(acharProibidos('ancorado em F-001 e F-042'), ['F-001', 'F-042']);
});

test('acharProibidos não confunde com RF nem com o ID promovido', () => {
  assert.deepEqual(acharProibidos('RF-007 e RF-MOD-PAG-003'), []);
});

// ————————— Task 8, rodada 3: fronteira de letra acentuada (Unicode) —————————
//
// Defeito: os lookarounds de `varrer` usavam só [A-Za-z0-9], que não cobre acento. Num documento
// em português, palavra iniciada por vogal acentuada é a norma (`área`, `índice`, `único`,
// `água`), não exceção — um espaço faltante produzindo `RF-007área` era pelo menos tão plausível
// quanto o `RF-007a` já tratado como bloqueante nas rodadas anteriores. `extrairIds` podava o
// sufixo acentuado e devolvia um ID "limpo"; `validarId` recusava o token bruto — a mesma
// divergência entre verificador e relatório, só que no alfabeto que o harness de fato usa.

test('extrairIds não extrai quando o ID é seguido de letra acentuada, sem hífen — RF-007área', () => {
  assert.deepEqual(extrairIds('RF', 'RF-007área de risco'), []);
});

test('extrairIds não extrai quando o ID é seguido de letra acentuada no meio da frase — RF-007ção', () => {
  assert.deepEqual(extrairIds('RF', 'o requisito RF-007ção precisa'), []);
});

test('extrairIds não extrai módulo colado a letra acentuada — MOD-PAGçãoAlgo', () => {
  assert.deepEqual(extrairIds('MOD', 'MOD-PAGçãoAlgo'), []);
});

test('extrairIds não extrai quando hífen depois do ID é seguido de letra acentuada — RF-007-ção', () => {
  assert.deepEqual(extrairIds('RF', 'RF-007-ção'), []);
});

test('extrairIds: hífen+ASCII e sufixo ASCII continuam recusados após a ampliação Unicode', () => {
  assert.deepEqual(extrairIds('RF', 'RF-007-abc'), []);
  assert.deepEqual(extrairIds('RF', 'RF-007a'), []);
  assert.deepEqual(extrairIds('MOD', 'MOD-PAG-abc'), []);
});

test('acharProibidos continua recusando hífen+alfanumérico após a ampliação Unicode', () => {
  assert.deepEqual(acharProibidos('F-001-abc no texto'), []);
});

test('extrairIds continua extraindo quando o acento vem ANTES do ID, separado por espaço', () => {
  assert.deepEqual(extrairIds('RF', 'o RF-007 único e a área de risco'), ['RF-007']);
  assert.deepEqual(extrairIds('RF', 'a RF-007, na área'), ['RF-007']);
});

test('extrairIds continua extraindo os casos-base depois da ampliação Unicode — hífen+espaço, multi-hífen, miolo promovido, tabela, ponto final, isolado, quatro dígitos, underscore', () => {
  assert.deepEqual(extrairIds('MOD', 'veja MOD-PAG- e pronto'), ['MOD-PAG']);
  assert.deepEqual(extrairIds('MOD', 'MOD-ACOMP-CARGA na tabela'), ['MOD-ACOMP-CARGA']);
  assert.deepEqual(extrairIds('MOD', 'O MOD-PAGAMENTOS virou RF-MOD-PAGAMENTOS-003'), ['MOD-PAGAMENTOS']);
  assert.deepEqual(extrairIds('RF', '| RF-001 | RN-012 |'), ['RF-001']);
  assert.deepEqual(extrairIds('RF', '- RF-007.'), ['RF-007']);
  assert.deepEqual(extrairIds('RF', 'RF-007'), ['RF-007']);
  assert.deepEqual(extrairIds('RF', 'RF-0071'), ['RF-0071']);
  assert.deepEqual(extrairIds('RF', 'RF-00071'), []);
  assert.deepEqual(extrairIds('RF', 'RF-007_abc'), ['RF-007']);
});

test('validarId recusa o token bruto com sufixo acentuado — RF-007área', () => {
  assert.equal(validarId('RF', 'RF-007área'), false);
});

test('extrairIds: regra geral — ID seguido imediatamente de letra Unicode (acentuada), com ou sem hífen no meio, não é extraído, nas quatro famílias', () => {
  const casos = {
    RF: ['RF-007área', 'RF-007-área', 'RF-007ção', 'RF-007-ção'],
    RN: ['RN-001índice', 'RN-001-índice'],
    GAP: ['GAP-042único', 'GAP-042-único'],
    MOD: ['MOD-PAGçãoAlgo', 'MOD-PAG-çãoAlgo'],
  };
  for (const [familia, textos] of Object.entries(casos)) {
    for (const texto of textos) {
      assert.deepEqual(
        extrairIds(familia, `prefixo ${texto} sufixo`),
        [],
        `${familia}: "${texto}" deveria ter sido recusado por letra Unicode colada`,
      );
    }
  }
});

test('os caminhos do Deliver apontam para outputs/spec', () => {
  assert.equal(MARCADOR_US, 'outputs/spec/em-andamento.md');
  assert.equal(DIR_AUDITORIAS, 'outputs/spec/auditorias');
  assert.equal(DIR_ISENCOES, 'outputs/spec/auditorias/_isencoes');
  assert.equal(LEDGER_GATE, 'outputs/spec/auditorias/_gate-ledger.md');
});

test('BLOCO_ISENCAO é o nome do bloco que o gate casa dentro do arquivo', () => {
  assert.equal(BLOCO_ISENCAO, 'gate:isencao');
});

test('lerVersaoTemplate lê o harness.json do repositório — valores reais, não stub', () => {
  // Fixa contra o harness.json de verdade: uma implementação-stub que devolvesse
  // {versao:'x', kitVersao:'y'} sem ler nada passaria em `assert.ok(v)`. Comparar com o que o
  // próprio harness.json do repo contém prova que houve leitura real.
  const h = JSON.parse(readFileSync(join(RAIZ, 'harness.json'), 'utf8'));
  const v = lerVersaoTemplate(RAIZ);
  assert.deepEqual(v, { versao: String(h.versao), kitVersao: String(h.kitVersao) });
});

test('lerVersaoTemplate devolve null quando não há harness.json', () => {
  assert.equal(lerVersaoTemplate(join(tmpdir(), 'nao-existe-mesmo-456')), null);
});

test('lerVersaoTemplate lança (não devolve null) quando harness.json está corrompido', () => {
  // Espelha inventariar: ausência é null, mas "existe e está ilegível" (aqui, JSON malformado)
  // não pode virar o mesmo null — quem chama falharia aberto sem saber que não conseguiu ler.
  const dir = mkdtempSync(join(tmpdir(), 'kit-vt-'));
  writeFileSync(join(dir, 'harness.json'), '{ isto nao e json');
  assert.throws(() => lerVersaoTemplate(dir));
});

// ————— Correção A: comparação de caminho — travessia, separador repetido e caixa —————
//
// Uma revisão adversarial reproduziu, executando, que as duas travas do pretooluse.mjs (zona
// imutável e congelamento do Explore) eram contornáveis por variações triviais do `file_path`.
// A raiz era uma só: `norm()` normalizava barra e `./` e mais nada — não resolvia `..`, não
// colapsava `//`, comparava com sensibilidade a caixa, e `relativizar` devolvia `null` para
// caminho relativo (e `null` no pretooluse.mjs LIBERA).
//
// O caso da caixa era o pior dos cinco, e não é um bypass por escrita: no Windows o SO grava no
// arquivo real, então uma escrita "liberada" em `outputs/Explore/hld-funcional.md` remove o
// carimbo de `outputs/explore/hld-funcional.md`. Repetido nos cinco documentos, `estaCongelado`
// volta a `false` e a trava deixa de existir INCLUSIVE pelo caminho canônico — desativação
// permanente do mecanismo, não escape pontual.

test('ehZonaImutavel resolve travessia — outputs/../CLAUDE.md é CLAUDE.md', () => {
  assert.equal(ehZonaImutavel('outputs/../CLAUDE.md'), true);
});

test('ehZonaImutavel colapsa separador repetido — .claude//hooks/kit.mjs', () => {
  assert.equal(ehZonaImutavel('.claude//hooks/kit.mjs'), true);
});

test('ehZonaImutavel continua resolvendo ./ inicial', () => {
  assert.equal(ehZonaImutavel('./CLAUDE.md'), true);
});

test('ehZonaImutavel resolve travessia encadeada — a/b/../../CLAUDE.md', () => {
  assert.equal(ehZonaImutavel('a/b/../../CLAUDE.md'), true);
});

test('ehZonaImutavel: `..` que sobe além da raiz da string é DESCARTADO, não propagado', () => {
  // Escolha deliberada. A alternativa ingênua — deixar `../CLAUDE.md` sair como `../CLAUDE.md` —
  // faria a trava liberar, porque `../CLAUDE.md` não casa nenhuma entrada da ZONA_IMUTAVEL. Como
  // estas funções recebem caminho JÁ relativo à raiz do projeto, não existe "acima da raiz" para
  // elas: subir demais é entrada malformada, e a leitura conservadora é tratá-la como a raiz.
  // Quem precisa distinguir "fora do projeto" é `relativizar`, que trabalha com absoluto e
  // devolve `null` — e lá o `..` que escapa da raiz de fato produz caminho fora, logo `null`.
  assert.equal(ehZonaImutavel('../CLAUDE.md'), true);
  assert.equal(ehZonaImutavel('../../.claude/hooks/kit.mjs'), true);
});

test('ehZonaImutavel não passa a negar o que é legítimo depois da resolução de travessia', () => {
  assert.equal(ehZonaImutavel('outputs/spec/modules.md'), false);
  assert.equal(ehZonaImutavel('outputs/explore/../spec/modules.md'), false);
  assert.equal(ehZonaImutavel('inputs//briefing.docx'), false);
});

test('ehZonaImutavel é insensível a caixa no diretório — .CLAUDE/hooks/kit.mjs', () => {
  assert.equal(ehZonaImutavel('.CLAUDE/hooks/kit.mjs'), true);
});

test('ehZonaImutavel é insensível a caixa no segmento interno — .claude/HOOKS/kit.mjs', () => {
  assert.equal(ehZonaImutavel('.claude/HOOKS/kit.mjs'), true);
});

test('ehZonaImutavel é insensível a caixa em arquivo exato — claude.md', () => {
  assert.equal(ehZonaImutavel('claude.md'), true);
  assert.equal(ehZonaImutavel('Claude.MD'), true);
});

test('ehZonaImutavel casa o diretório sem barra final também com caixa trocada', () => {
  assert.equal(ehZonaImutavel('.Claude/Hooks'), true);
  assert.equal(ehZonaImutavel('.CLAUDE/SKILLS'), true);
});

test('ehZonaImutavel: insensibilidade a caixa não cria falso positivo em prefixo parcial', () => {
  assert.equal(ehZonaImutavel('.claude/rules/HARNESS-DO-PROJETO.md'), false);
  assert.equal(ehZonaImutavel('SKILLS-EXTRAS/x.md'), false);
});

test('ehWhitelistExplore e validadorPara também comparam sem sensibilidade a caixa', () => {
  // Coerência: uma trava cujo comportamento muda com a caixa do diretório é uma trava que
  // responde diferente para o MESMO arquivo no Windows. `outputs/SPEC/sync-log.md` e
  // `outputs/spec/sync-log.md` são o mesmo arquivo lá; responder `false` no primeiro faria
  // `detectarFase` declarar `plan` e disparar o fecho do Explore sem que nada de Plan tenha
  // acontecido.
  assert.equal(ehWhitelistExplore('outputs/SPEC/sync-log.md'), true);
  assert.equal(ehWhitelistExplore('outputs/spec/Sync-Log.md'), true);
  assert.equal(ehWhitelistExplore('outputs/Spec/Modules.md'), false);
  assert.equal(validadorPara('outputs/SPEC/flow-map.md'), 'check-flowmap');
  assert.equal(validadorPara('outputs/Explore/GAPS.md'), 'check-explore');
});

test('ehWhitelistExplore e validadorPara resolvem travessia', () => {
  assert.equal(ehWhitelistExplore('outputs/spec/legacy/../sync-log.md'), true);
  assert.equal(ehWhitelistExplore('outputs/explore/../spec/modules.md'), false);
  assert.equal(validadorPara('outputs/spec/auditorias/../flow-map.md'), 'check-flowmap');
});

test('detectarFase enxerga o caminho whitelistado mesmo com caixa e travessia', () => {
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/SPEC/sync-log.md', 'outputs/spec/legacy/../context-map.md']),
  })), 'explore');
  assert.equal(detectarFase(fatos({
    spec: new Set(['outputs/Spec/Modules.md']),
  })), 'plan');
});

test('relativizar: raiz com letra que MUDA DE COMPRIMENTO ao baixar a caixa ainda recorta certo', () => {
  // C6: a justificativa do `'İ'.toLowerCase().length === 2` morava no JSDoc de `sob`, onde o
  // perigo não pode ocorrer — `sob` só recebe constantes ASCII (`outputs/explore`, `outputs/spec`)
  // como diretório. Onde ele PODE ocorrer é aqui, porque a raiz do projeto é um caminho de disco
  // arbitrário, e um consultor turco ou um diretório com `İ` no nome é entrada perfeitamente
  // possível. A implementação já estava certa (recorta por comprimento e só então baixa a caixa)
  // e não tinha teste nenhum.
  //
  // A versão ingênua — `chave(c).startsWith(chave(prefixo))` e depois
  // `c.slice(chave(prefixo).length)` — usa um índice medido na string MINÚSCULA para recortar a
  // ORIGINAL. Com `İ` na raiz a minúscula é um caractere mais longa, o índice anda demais, e o
  // relativo devolvido perde a primeira letra: `LAUDE.md` em vez de `CLAUDE.md` — que não casa
  // `CLAUDE.md` na ZONA_IMUTAVEL e portanto LIBERA a escrita no maquinário do template.
  assert.equal('İ'.toLowerCase().length, 2, 'premissa do teste: baixar a caixa desta letra alonga a string');
  assert.equal(relativizar('C:/İrepo', 'C:/İrepo/CLAUDE.md'), 'CLAUDE.md');
  assert.equal(ehZonaImutavel(relativizar('C:/İrepo', 'C:/İrepo/CLAUDE.md')), true);
  assert.equal(relativizar('C:/İrepo', 'C:/İrepo/outputs/explore/gaps.md'), 'outputs/explore/gaps.md');
});

test('relativizar: preserva a CAIXA ORIGINAL no valor devolvido', () => {
  // A chave de comparação é insensível a caixa, mas o valor devolvido não pode ser: a mensagem
  // de erro da trava mostra este caminho, e tem que mostrá-lo como o usuário escreveu.
  assert.equal(relativizar('C:/Repo', 'C:/Repo/Outputs/Explore/x.md'), 'Outputs/Explore/x.md');
});

test('relativizar: raiz com caixa diferente do caminho ainda relativiza', () => {
  assert.equal(relativizar('C:/Repo', 'c:/repo/CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('c:/repo', 'C:/REPO/outputs/explore/gaps.md'), 'outputs/explore/gaps.md');
});

test('relativizar: caminho relativo é devolvido normalizado, não null', () => {
  // Mudança de contrato deliberada (A3). Antes, caminho relativo não começava com a raiz e saía
  // como `null` — e `null` no pretooluse.mjs LIBERA. `file_path: 'CLAUDE.md'` contornava as duas
  // travas. Caminho não-absoluto já É relativo à raiz do projeto; devolvê-lo é o único
  // tratamento que não inventa informação.
  assert.equal(relativizar('C:/repo', 'CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('C:/repo', './CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('C:/repo', 'outputs/../CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('C:/repo', 'outputs\\explore\\gaps.md'), 'outputs/explore/gaps.md');
});

test('relativizar: resolve travessia dentro do caminho absoluto', () => {
  assert.equal(relativizar('C:/repo', 'C:/repo/outputs/../CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('C:/repo', 'C:/repo/outputs/spec/../explore/x.md'), 'outputs/explore/x.md');
  assert.equal(relativizar('C:/repo', 'C:/repo/outputs/.//explore/x.md'), 'outputs/explore/x.md');
});

test('relativizar: travessia que ESCAPA da raiz continua devolvendo null', () => {
  // O contraponto do teste de `..` descartado em ehZonaImutavel: aqui existe raiz de verdade
  // contra a qual comparar, então subir acima dela é sair do projeto — `null`, como sempre foi.
  assert.equal(relativizar('C:/repo', 'C:/repo/../outro/x.md'), null);
  assert.equal(relativizar('C:/repo', 'C:/repo/../repo-outro/x.md'), null);
});

test('relativizar: o caminho da própria raiz devolve string vazia, inclusive com caixa trocada', () => {
  assert.equal(relativizar('C:/repo', 'C:/repo'), '');
  assert.equal(relativizar('C:/Repo', 'c:/repo'), '');
  assert.equal(relativizar('C:/repo', 'C:\\repo\\'), '');
});

test('relativizar: prefixo POSIX preservado — raiz no topo do sistema de arquivos', () => {
  assert.equal(relativizar('/', '/CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('/repo', '/repo/outputs/../CLAUDE.md'), 'CLAUDE.md');
});

test('relativizar: prefixo de unidade preservado — outra unidade não é a raiz', () => {
  // Se `norm` perdesse a letra de unidade, `D:/repo/...` viraria `/repo/...` e passaria a
  // relativizar contra `C:/repo`. Duas unidades diferentes viram o mesmo projeto.
  assert.equal(relativizar('C:/repo', 'D:/repo/CLAUDE.md'), null);
});

test('relativizar: prefixo UNC preservado — as duas barras iniciais não colapsam', () => {
  // Se `norm` colapsasse `//` cegamente, `//servidor/share` viraria `/servidor/share` e um
  // caminho local homônimo passaria a relativizar contra a raiz de rede.
  assert.equal(relativizar('//servidor/share', '//servidor/share/CLAUDE.md'), 'CLAUDE.md');
  assert.equal(relativizar('//servidor/share', '/servidor/share/CLAUDE.md'), null);
});

// ————————— ehDoExplore: pertencimento ao Explore sai do `startsWith` manual —————————
//
// `zonas.mjs` e `pretooluse.mjs` testam pertencimento ao Explore com
// `p.startsWith(RAIZ_EXPLORE + '/')`, escrito à mão em dois lugares. Isso reimplementa o que
// `casa()` já garante e perde a parte que o comentário do próprio `casa()` registra: casar
// também o DIRETÓRIO sem barra final, para que um comando que move ou remove a pasta inteira
// não escape da trava só porque não terminou o argumento com `/`. A troca dos dois `startsWith`
// é da rodada B; aqui a função só nasce e é testada.

test('ehDoExplore aceita arquivo dentro do Explore', () => {
  assert.equal(ehDoExplore('outputs/explore/gaps.md'), true);
  assert.equal(ehDoExplore('outputs/explore/subpasta/anexo.png'), true);
});

test('ehDoExplore casa o próprio diretório, SEM barra final — o caso que o startsWith manual perde', () => {
  assert.equal(ehDoExplore('outputs/explore'), true);
  assert.equal(ehDoExplore('outputs/explore/'), true);
});

test('ehDoExplore não confunde prefixo parcial — o que o startsWith manual acerta por acidente', () => {
  assert.equal(ehDoExplore('outputs/explorezinho/x.md'), false);
  assert.equal(ehDoExplore('outputs/spec/benchmark.md'), false);
  assert.equal(ehDoExplore('CLAUDE.md'), false);
});

test('ehDoExplore é insensível a caixa e resolve travessia, como as demais', () => {
  assert.equal(ehDoExplore('outputs/Explore/gaps.md'), true);
  assert.equal(ehDoExplore('OUTPUTS/EXPLORE'), true);
  assert.equal(ehDoExplore('outputs/spec/../explore/gaps.md'), true);
  assert.equal(ehDoExplore('outputs/explore/../spec/modules.md'), false);
});

test('ehDoExplore lança em caminho absoluto, como as demais funções de decisão', () => {
  assert.throws(() => ehDoExplore('C:\\repo\\outputs\\explore\\gaps.md'), /absoluto/);
  assert.throws(() => ehDoExplore('/repo/outputs/explore/gaps.md'), /absoluto/);
});

// ————————— podeSerDoExplore: o SUPERSET, para quem ainda não sabe qual é a raiz —————————
//
// `ehDoExplore` é ancorado na raiz dos artefatos, e é o certo: é ele que decide. Mas a trava do
// congelamento recebe o caminho relativo à `cwd`, e num workspace multi-repo a raiz dos artefatos
// é uma subpasta — `portal-docs/outputs/explore/gaps.md`, que `ehDoExplore` recusa. Descobrir a
// raiz custa disco, e pagar esse custo em TODA escrita do projeto é o que a ordem "pertencimento
// primeiro, I/O depois" existe para evitar. Este predicado é o pré-filtro: quem ele recusa não
// pode estar no Explore de raiz nenhuma, então a trava para ali sem tocar o disco.
//
// SUPERSET, e é isso que o torna seguro: ele aceita mais do que `ehDoExplore`, nunca menos —
// um `false` aqui autoriza liberar, e um `true` só autoriza gastar um `lerDiretorio`.

test('podeSerDoExplore aceita o que `ehDoExplore` aceita', () => {
  for (const p of ['outputs/explore', 'outputs/explore/', 'outputs/explore/gaps.md', 'outputs/explore/sub/anexo.png']) {
    assert.equal(podeSerDoExplore(p), true, p);
    assert.equal(ehDoExplore(p), true, p);
  }
});

test('podeSerDoExplore aceita também o caminho PREFIXADO pelo repo de docs — o caso do multi-repo', () => {
  for (const p of ['portal-docs/outputs/explore/gaps.md', 'portal-docs/outputs/explore', 'a/b/outputs/explore/x.md']) {
    assert.equal(podeSerDoExplore(p), true, p);
    assert.equal(ehDoExplore(p), false, `${p}: o superset existe justamente porque este é false`);
  }
});

test('podeSerDoExplore recusa quem não pode estar no Explore de raiz nenhuma', () => {
  for (const p of ['CLAUDE.md', 'outputs/spec/modules.md', 'outputs/explorezinho/x.md',
    'meus-outputs/explore/x.md', '.claude/hooks/kit.mjs', '', 'portal-docs/outputs/spec/modules.md']) {
    assert.equal(podeSerDoExplore(p), false, p);
  }
});

test('podeSerDoExplore é insensível a caixa e resolve travessia, como `ehDoExplore`', () => {
  assert.equal(podeSerDoExplore('portal-docs/outputs/Explore/gaps.md'), true);
  assert.equal(podeSerDoExplore('PORTAL-DOCS/OUTPUTS/EXPLORE'), true);
  // A travessia importa: um pré-filtro textual ingênuo sobre o caminho BRUTO deixaria passar
  // `outputs/spec/../explore/gaps.md` — que É do Explore — e a trava liberaria a escrita.
  assert.equal(podeSerDoExplore('portal-docs/outputs/spec/../explore/gaps.md'), true);
  assert.equal(podeSerDoExplore('outputs/explore/../spec/modules.md'), false);
});

test('podeSerDoExplore lança em caminho absoluto, como `ehDoExplore`', () => {
  assert.throws(() => podeSerDoExplore('/repo/outputs/explore/gaps.md'), /absoluto/);
});

// ————————— protegidosContidosEm: a direção de CONTENÇÃO —————————
//
// `ehZonaImutavel` e `ehDoExplore` respondem "o caminho É protegido?". Falta a pergunta oposta:
// "o caminho CONTÉM algum protegido?". Sem ela, `rm -rf .` não nomeia nada e passa — medido.
//
// A função devolve CAMINHOS, não booleano, e isso é a decisão de desenho: quem chama precisa
// saber QUAL protegido está lá dentro, para (a) reperguntar ao mesmo oráculo se aquele caminho
// está protegido AGORA — o congelamento depende de disco — e (b) nomeá-lo na mensagem de negação.

test('protegidosContidosEm: a raiz do projeto contém tudo', () => {
  for (const raiz of ['', '.', './', '.\\']) {
    const contidos = protegidosContidosEm(raiz);
    assert.ok(contidos.includes('CLAUDE.md'), `${JSON.stringify(raiz)} → ${contidos.join(' ')}`);
    assert.ok(contidos.includes('.claude/hooks/'), `${JSON.stringify(raiz)} → ${contidos.join(' ')}`);
    assert.ok(contidos.includes('.claude/skills/'), `${JSON.stringify(raiz)} → ${contidos.join(' ')}`);
  }
});

test('protegidosContidosEm: `.claude` contém `.claude/hooks/` e os demais do maquinário', () => {
  const contidos = protegidosContidosEm('.claude');
  assert.ok(contidos.includes('.claude/hooks/'));
  assert.ok(contidos.includes('.claude/settings.json'));
  assert.ok(contidos.includes('.claude/rules/harness/'));
  assert.ok(!contidos.includes('CLAUDE.md'), 'CLAUDE.md não está dentro de .claude/');
});

test('protegidosContidosEm: `outputs` contém o Explore — o congelamento é do chamador, não daqui', () => {
  // O Explore só é protegido quando o marcador existe, e isso é disco. O núcleo puro devolve o
  // CANDIDATO; quem pergunta ao disco se ele está congelado agora é a casca.
  assert.deepEqual(protegidosContidosEm('outputs'), ['outputs/explore/']);
  assert.deepEqual(protegidosContidosEm('outputs/spec'), []);
});

test('protegidosContidosEm: `src` não contém nada — o caso que impede um verificador que nega tudo', () => {
  assert.deepEqual(protegidosContidosEm('src'), []);
  assert.deepEqual(protegidosContidosEm('build'), []);
  assert.deepEqual(protegidosContidosEm('outputs/spec/rascunho.md'), []);
});

test('protegidosContidosEm: CONTER é estrito — o caminho não contém a si mesmo', () => {
  // Quem responde "este caminho É protegido" é `ehZonaImutavel`/`ehDoExplore`. Devolver o próprio
  // caminho aqui duplicaria a decisão em dois lugares, e duas decisões divergem.
  assert.deepEqual(protegidosContidosEm('.claude/hooks'), []);
  assert.deepEqual(protegidosContidosEm('.claude/hooks/'), []);
  assert.deepEqual(protegidosContidosEm('CLAUDE.md'), []);
  assert.deepEqual(protegidosContidosEm('outputs/explore'), []);
});

test('protegidosContidosEm: normaliza como as demais — barra invertida, caixa e travessia', () => {
  assert.deepEqual(protegidosContidosEm('.CLAUDE'), protegidosContidosEm('.claude'));
  assert.deepEqual(protegidosContidosEm('outputs\\..\\outputs'), ['outputs/explore/']);
  assert.deepEqual(protegidosContidosEm('OUTPUTS'), ['outputs/explore/']);
});

test('protegidosContidosEm: não confunde prefixo parcial', () => {
  assert.deepEqual(protegidosContidosEm('.claude-antigo'), []);
  assert.deepEqual(protegidosContidosEm('outputs-velho'), []);
  assert.deepEqual(protegidosContidosEm('.claude/skills-extras'), []);
  // Estes três são o prefixo pelo LADO CURTO, e é o que a barra em `dentro` existe para barrar.
  // Sem eles, comparar sem a barra sobrevive à mutação: `skill` "conteria" `skills/`.
  assert.deepEqual(protegidosContidosEm('.claude/skill'), []);
  assert.deepEqual(protegidosContidosEm('.claude/hook'), []);
  assert.deepEqual(protegidosContidosEm('outputs/expl'), []);
});

test('protegidosContidosEm lança em caminho absoluto, como as demais funções de decisão', () => {
  assert.throws(() => protegidosContidosEm('C:\\repo'), /absoluto/);
  assert.throws(() => protegidosContidosEm('/repo'), /absoluto/);
});

// ————————— destruição catastrófica: `.git/` —————————
//
// `.git/` NÃO entra na ZONA_IMUTAVEL, e a distinção é de desenho, não de arrumação. A semântica
// de lá é "maquinário do template, atualizado por sobrescrita", e a mensagem correspondente manda
// a mudança para o template — as duas coisas erradas para o histórico do repositório. Aqui a
// pergunta é outra: o que, se for destruído, não volta.

import { DESTRUICAO_CATASTROFICA, ehDestruicaoCatastrofica } from './kit.mjs';

test('ehDestruicaoCatastrofica: `.git/` e o que está dentro dele', () => {
  assert.equal(ehDestruicaoCatastrofica('.git'), true);
  assert.equal(ehDestruicaoCatastrofica('.git/'), true);
  assert.equal(ehDestruicaoCatastrofica('.git/objects'), true);
  assert.equal(ehDestruicaoCatastrofica('.git/index.lock'), true);
  assert.equal(ehDestruicaoCatastrofica('.GIT\\config'), true, 'normaliza como as demais');
});

test('ehDestruicaoCatastrofica: não é a zona imutável, e não confunde prefixo', () => {
  assert.equal(ehDestruicaoCatastrofica('CLAUDE.md'), false);
  assert.equal(ehDestruicaoCatastrofica('.claude/hooks/kit.mjs'), false);
  assert.equal(ehDestruicaoCatastrofica('.gitignore'), false, 'prefixo parcial não conta');
  assert.equal(ehDestruicaoCatastrofica('.github/workflows/ci.yml'), false);
  assert.equal(ehZonaImutavel('.git/config'), false, '`.git` não é maquinário do template');
  assert.ok(!ZONA_IMUTAVEL.includes('.git/'), 'a semântica das duas tabelas é diferente');
  assert.deepEqual(DESTRUICAO_CATASTROFICA, ['.git/']);
});

test('ehDestruicaoCatastrofica lança em caminho absoluto, como as demais', () => {
  assert.throws(() => ehDestruicaoCatastrofica('C:\\repo\\.git'), /absoluto/);
});

test('a contenção também vale para `.git/` — apagar a árvore que o contém é apagá-lo', () => {
  // Política mora no módulo de autoridade: o consumidor não decide que `.git` é protegido, e
  // também não decide que ele conta na direção de contenção.
  assert.ok(protegidosContidosEm('').includes('.git/'), 'a raiz contém o histórico');
  assert.deepEqual(protegidosContidosEm('.git'), [], 'CONTER continua sendo estrito');
  assert.deepEqual(protegidosContidosEm('outputs'), ['outputs/explore/'], 'e não vaza para outras árvores');
});

// ————————— Regressão nomeada: as cinco linhas do bypass reproduzido —————————
//
// Uma linha por entrada da tabela da revisão adversarial. Cada uma foi reproduzida EXECUTANDO
// contra a implementação anterior e devolveu `allow` onde devia devolver `deny`. São o registro
// executável de que a trava fechou; se alguma voltar a passar, o bypass voltou.
//
// A composição testada é a mesma do despachante: `relativizar(raiz, file_path)` e, sobre o
// resultado, a trava. `relativizar` devolvendo `null` é o que LIBERA no pretooluse.mjs — por
// isso cada caso afirma também que o `rel` não é `null`.

const RAIZ_FICTICIA = 'C:/repo';

test('bypass reproduzido 1/5: caixa no diretório do Explore desativava o congelamento', () => {
  // O pior dos cinco. No Windows o SO grava no arquivo real, então a escrita "liberada" em
  // outputs/Explore/hld-funcional.md removia o carimbo de outputs/explore/hld-funcional.md.
  // Repetido nos cinco documentos, estaCongelado voltava a false e a trava deixava de existir
  // inclusive pelo caminho canônico — desativação permanente, não escape pontual.
  const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/outputs/Explore/hld-funcional.md');
  assert.equal(rel, 'outputs/Explore/hld-funcional.md');
  assert.equal(ehDoExplore(rel), true);
});

test('bypass reproduzido 2/5: caixa no diretório .claude liberava a zona imutável', () => {
  const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/.CLAUDE/hooks/kit.mjs');
  assert.equal(rel, '.CLAUDE/hooks/kit.mjs');
  assert.equal(ehZonaImutavel(rel), true);
});

test('bypass reproduzido 3/5: travessia `..` liberava a zona imutável', () => {
  const rel = relativizar(RAIZ_FICTICIA, 'C:/repo/outputs/../CLAUDE.md');
  assert.equal(rel, 'CLAUDE.md');
  assert.equal(ehZonaImutavel(rel), true);
});

test('bypass reproduzido 4/5: file_path relativo virava null, e null LIBERA', () => {
  const rel = relativizar(RAIZ_FICTICIA, 'CLAUDE.md');
  assert.notEqual(rel, null);
  assert.equal(rel, 'CLAUDE.md');
  assert.equal(ehZonaImutavel(rel), true);
});

test('bypass reproduzido 5/5: diretório do Explore sem barra final escapava do congelamento', () => {
  const rel = relativizar(RAIZ_FICTICIA, 'outputs/explore');
  assert.equal(rel, 'outputs/explore');
  assert.equal(ehDoExplore(rel), true);
});

// ————————————————— Task 3, Step 0: `acharMalFormados` e a fronteira única —————————————————
//
// A pergunta que esta função responde NÃO é "este trecho é um ID válido?", e sim "`varrer` teria
// extraído um ID a partir desta posição?". A diferença é o caso `MOD-PAG-`: `extrairIds` devolve
// `MOD-PAG` dali por decisão deliberada (o hífen final é lixo tipográfico), então acusar
// `MOD-PAG-` como mal formado faria a fonte única contradizer a si mesma no mesmo repositório.
//
// Os valores abaixo foram medidos contra o módulo real, não supostos.

import { acharMalFormados } from './kit.mjs';

// Cada linha traz `nota` quando o valor esperado NÃO é o óbvio — ela vira a mensagem da asserção,
// para que a justificativa apareça no output da falha e não só na leitura do arquivo.
const CASOS_FRONTEIRA = [
  { texto: 'A RF-7 falta digito.', familia: 'RF', ids: [], malformados: ['RF-7'] },
  { texto: 'A RF-007 esta certa.', familia: 'RF', ids: ['RF-007'], malformados: [] },
  { texto: 'A RF-007área acentuada.', familia: 'RF', ids: [], malformados: ['RF-007área'] },
  {
    // INVERTIDO na rodada H, e a inversão é DECISÃO, não regressão. Este caso esperava
    // `['RF-007-abc']`. A regra do candidato passou a exigir cauda com dígito e SEM outro hífen,
    // porque sem esse filtro a função acusava nove trechos nos cinco documentos obrigatórios ainda
    // EM BRANCO — a notação de placeholder dos próprios templates — além de nome de arquivo, link
    // markdown, faixa e data. `RF-007-abc` cai junto porque tem exatamente a mesma forma de
    // `RF-007-login`, que é referência legítima a `RF-007-login.md`. Não existe regra que acuse um
    // e libere o outro: ali o harness não tem informação, e sob o modelo de ACIDENTE o silêncio é
    // a resposta certa. Decisão do usuário, medida e registrada em `docs/execucao/
    // rodada-h-revisao-step0.md` (as três regras candidatas, coluna "FP nas 9 sondas").
    texto: 'A RF-007-abc colada.',
    familia: 'RF',
    ids: [],
    malformados: [],
    nota: 'regra C: cauda `007-abc` tem outro hífen — indistinguível de `RF-007-login`',
  },
  { texto: 'A RF-00777 digitos demais.', familia: 'RF', ids: [], malformados: ['RF-00777'] },
  { texto: 'A RF-007_abc sublinhado.', familia: 'RF', ids: ['RF-007'], malformados: [] },
  { texto: 'A RF-007Ⅷ numeral romano.', familia: 'RF', ids: ['RF-007'], malformados: [] },
  { texto: 'Ver MOD-PAG- e pronto.', familia: 'MOD', ids: ['MOD-PAG'], malformados: [] },
  { texto: 'Modulo MOD-PAGAMENTOS ok.', familia: 'MOD', ids: ['MOD-PAGAMENTOS'], malformados: [] },
  {
    // INVERTIDO na rodada H. Este caso esperava `['MOD-pag']`, e é a ÚNICA perda não ambígua da
    // regra nova — `MOD-pag` não tem dígito nenhum, logo não parece tentativa de numerar coisa
    // alguma, e o filtro o solta junto com `GAP-analysis` e com o `MOD-` nu dos templates em
    // branco. A revisão mediu e nomeou esta perda como o preço da regra: silenciar um typo real
    // para não acusar o documento vazio que a `explore.md` manda copiar. Aceito conscientemente;
    // quem quiser recuperá-lo precisa de uma regra que distinga `MOD-pag` de `GAP-analysis`, e
    // essa regra não foi encontrada.
    texto: 'codigo MOD-pag minusculo',
    familia: 'MOD',
    ids: [],
    malformados: [],
    nota: 'regra C: cauda `pag` não tem dígito — perda assumida, ver comentário',
  },
];

for (const caso of CASOS_FRONTEIRA) {
  test(`fronteira única — ${caso.familia} em "${caso.texto}"`, () => {
    assert.deepEqual(extrairIds(caso.familia, caso.texto), caso.ids, 'extrairIds');
    assert.deepEqual(
      acharMalFormados(caso.familia, caso.texto),
      caso.malformados,
      caso.nota || 'acharMalFormados',
    );
  });
}

test('acharMalFormados NÃO acusa o ID promovido pelo kit — RF-MOD-PAGAMENTOS-003 é uma data', () => {
  // INVERTIDO na rodada H, e esta é a inversão que o plano previu e exigiu justificar.
  //
  // A versão anterior deste teste esperava `['RF-MOD-PAGAMENTOS-003']` e dizia, textualmente, que
  // FIXAVA a decisão: "quem quiser silenciá-la muda o teste com justificativa, em vez de descobrir
  // por acidente". É exatamente o que está acontecendo aqui — a mudança é deliberada, não acidente,
  // e a justificativa é esta:
  //
  // `RF-MOD-PAGAMENTOS-003` tem EXATAMENTE a mesma forma de texto que `RN-2026-08-27` (prefixo de
  // família, cauda com dígitos e hifens internos). A revisão adversarial mediu as três regras
  // candidatas contra os mesmos corpora e nenhuma acusa um sem acusar o outro. Manter a acusação
  // custava nove falsos positivos nos cinco documentos obrigatórios AINDA EM BRANCO — a trava
  // acusava o template que a `explore.md:41` manda copiar como primeiro passo —, e trava que acusa
  // o documento em branco é desligada antes de proteger qualquer coisa.
  //
  // A decisão é do usuário, tomada depois de ver as três regras medidas, e está registrada em
  // `docs/execucao/rodada-h-revisao-step0.md`, seção "As três regras candidatas". O que substitui
  // esta trava é o `gramatica.mjs` (Steps 1-6), que valida o CATÁLOGO de IDs do Explore em vez de
  // adivinhar intenção em prosa: lá `RF-MOD-PAGAMENTOS-003` não é um ID do Explore e some pela
  // porta certa.
  assert.deepEqual(acharMalFormados('RF', 'promovido: RF-MOD-PAGAMENTOS-003 no texto'), []);
  // O par que prova que a razão é a AMBIGUIDADE DE FORMA e não um caso especial: a data também
  // fica calada, e é o texto legítimo que a acusação teria quebrado.
  assert.deepEqual(acharMalFormados('RN', 'A ata RN-2026-08-27 registra a decisão.'), []);
});

test('acharMalFormados de família desconhecida devolve vazio', () => {
  assert.deepEqual(acharMalFormados('XPTO', 'XPTO-1'), []);
});

test('acharMalFormados: numeral romano NÃO é numeração de ID — a classe é `0-9`, não `\\p{N}`', () => {
  // A divergência que o plano quase cometeu: escrever `\p{N}` na classe faria `Ⅷ` (U+2167, que é
  // Nl e não L) entrar na fronteira, e `RF-007Ⅷ` passaria a ser acusado — contradizendo
  // `extrairIds`, que extrai `RF-007` dali.
  assert.deepEqual(extrairIds('RF', 'A RF-007Ⅷ numeral romano.'), ['RF-007']);
  assert.deepEqual(acharMalFormados('RF', 'A RF-007Ⅷ numeral romano.'), []);
});

// ————— A regra do candidato, presa NAS DUAS DIREÇÕES: nem afrouxar, nem apertar em silêncio —————
//
// `acharMalFormados` só acusa quando a cauda TEM dígito e NÃO TEM outro hífen. As duas metades
// existem por razões diferentes e cada uma tem aqui os casos que a matam se ela sumir:
//   - EXIGIR DÍGITO mata o prefixo nu dos templates (`RF-<nnn>`, `MOD-<CODIGO>`) e a palavra
//     composta (`GAP-analysis`), porque `<` não entra na classe de identificador e o candidato
//     parava no prefixo;
//   - PROIBIR OUTRO HÍFEN mata nome de arquivo, link markdown, faixa e data.
// Remover UMA das duas deixa metade da tabela abaixo vermelha, e é de propósito: a revisão mediu
// que a regra sozinha é um caractere de distância de voltar a acusar o documento em branco.

const SONDAS_FALSO_POSITIVO = [
  { familia: 'RF', texto: 'Ver `outputs/explore/RF-007-login-do-consultor.md`.', porque: 'nome de arquivo' },
  { familia: 'RF', texto: 'Detalhe em [RF-007](./requisitos/RF-007-login.md).', porque: 'link markdown' },
  { familia: 'GAP', texto: 'Fizemos a GAP-analysis do processo com o cliente.', porque: 'palavra composta' },
  { familia: 'MOD', texto: 'O modulo MOD-COBRANÇA fatura mensalmente.', porque: 'código de módulo em prosa' },
  { familia: 'RF', texto: 'Os requisitos RF-001-005 foram aprovados.', porque: 'faixa' },
  { familia: 'RN', texto: 'A ata RN-2026-08-27 registra a decisão.', porque: 'data' },
  { familia: 'RF', texto: '| RF-<nnn> | descrição |', porque: 'placeholder do template' },
  { familia: 'MOD', texto: '## MOD-<CODIGO> — nome do módulo', porque: 'placeholder do template' },
  { familia: 'GAP', texto: '### GAP-<nnn>: título', porque: 'placeholder do template' },
];

for (const sonda of SONDAS_FALSO_POSITIVO) {
  test(`sem falso positivo (${sonda.porque}) — ${sonda.familia} em "${sonda.texto}"`, () => {
    assert.deepEqual(acharMalFormados(sonda.familia, sonda.texto), [], sonda.porque);
  });
}

test('a regra do candidato NÃO ficou frouxa: o que parece numeração errada continua acusado', () => {
  // O outro lado. Se a tabela acima fosse a única trava, apagar a função inteira passaria.
  assert.deepEqual(acharMalFormados('RF', 'A RF-7 falta digito.'), ['RF-7']);
  assert.deepEqual(acharMalFormados('RF', 'A RF-00777 digitos demais.'), ['RF-00777']);
  assert.deepEqual(acharMalFormados('RF', 'A RF-007área acentuada.'), ['RF-007área']);
  assert.deepEqual(acharMalFormados('GAP', 'O GAP-4 ficou aberto.'), ['GAP-4']);
  assert.deepEqual(acharMalFormados('RN', 'A RN-12 nao existe.'), ['RN-12']);
});

test('os cinco documentos obrigatórios do Explore, EM BRANCO, não recebem acusação nenhuma', () => {
  // A razão de existir da regra, e a única que não é sobre gosto. A `explore.md` manda copiar estes
  // templates de `.claude/templates/` para `outputs/explore/` e preencher — antes da rodada H, a
  // função produzia NOVE acusações sobre eles ainda em branco (`MOD-`, `RF-`, `RN-`, `GAP-`,
  // `RF-nnn`, `GAP-nnn`). Uma trava que acusa o documento em branco é desligada antes de proteger
  // qualquer coisa. Este teste lê os templates REAIS: se alguém reintroduzir a acusação, ou trocar
  // a notação de placeholder por uma que a regra pesque, ele fica vermelho aqui e não em produção.
  const dir = join(RAIZ, '.claude', 'templates');
  for (const doc of DOCS_EXPLORE) {
    const t = readFileSync(join(dir, doc.caminho), 'utf8');
    for (const familia of FAMILIAS_EXPLORE) {
      assert.deepEqual(acharMalFormados(familia, t), [], `${doc.caminho} / ${familia}`);
    }
  }
});

// ————————— A fronteira ESQUERDA do candidato, que nenhum teste via (N3 da revisão) —————————
//
// `FRONTEIRA_ESQ` no `reCandidato` não tinha um único teste: removê-la deixava a suíte inteira
// verde, enquanto a MESMA fronteira do lado do `extrairIds` tinha três. Ela é o que impede acusar o
// MIOLO de um token maior — e sob o modelo de acidente isso é defesa ANTI-FALSO-POSITIVO, que é a
// direção que mais importa aqui, não menos.

const SONDAS_FRONTEIRA_ESQ = [
  { familia: 'RF', texto: 'anexoRF-7 no rodapé', semFronteira: 'RF-7' },
  { familia: 'RF', texto: 'ver ANEXO-RF-7 na pasta', semFronteira: 'RF-7' },
  { familia: 'GAP', texto: 'a coluna 3GAP-4 da planilha', semFronteira: 'GAP-4' },
];

for (const s of SONDAS_FRONTEIRA_ESQ) {
  test(`fronteira ESQUERDA do candidato — "${s.texto}" não vira acusação de ${s.semFronteira}`, () => {
    assert.deepEqual(
      acharMalFormados(s.familia, s.texto),
      [],
      `sem FRONTEIRA_ESQ isto acusaria ${s.semFronteira} — letra, dígito e hífen colados à esquerda`,
    );
  });
}

test('acharMalFormados DEDUPLICA: o mesmo trecho mal formado repetido sai uma vez só', () => {
  // X4 da revisão: `if (!achados.includes(m[0])) achados.push(m[0])` podia virar `push` puro e
  // nenhum caso da tabela notava, porque nenhum repetia um token. Em documento real a repetição é a
  // NORMA — `RF-<nnn>` em toda linha de tabela — e a mensagem sairia com o mesmo item N vezes.
  assert.deepEqual(acharMalFormados('RF', 'A RF-7 aqui, e a RF-7 de novo, e RF-7 mais uma vez.'), ['RF-7']);
  assert.equal(acharMalFormados('RF', 'RF-7 e RF-7').length, 1);
  // A dedup não pode virar "só o primeiro": trechos DIFERENTES continuam saindo os dois, na ordem.
  assert.deepEqual(acharMalFormados('RF', 'A RF-7 e a RF-00777 e a RF-7 outra vez.'), ['RF-7', 'RF-00777']);
});

test('INVARIANTE DE PARTIÇÃO: extrairIds e acharMalFormados particionam o texto, nas quatro famílias', () => {
  // Escrito como teste PRÓPRIO, sobre o texto inteiro concatenado, e não como asserção repetida
  // dentro de cada caso: é ele que pega regressão futura na fronteira, e só tem valor olhando o
  // texto todo de uma vez, com os casos vizinhos interferindo uns nos outros.
  //
  // RESSALVA MEDIDA NA RODADA H — NÃO CONFIE NESTE TESTE COMO TRAVA DE FRONTEIRA. A frase acima era
  // a intenção do plano; a revisão adversarial mediu e ela não se realiza. Em 21 mutações este
  // invariante ficou vermelho UMA vez, e nessa acompanhado de doze outros vermelhos — nunca foi
  // detector solitário de nada.
  //
  // E não é azar do texto escolhido, é ESTRUTURA: `acharMalFormados` só devolve candidato que
  // FALHOU `reValidoAqui`, logo nunca é válido, logo a segunda metade deste laço é tautológica e a
  // primeira nunca colide. Uma `FRONTEIRA_ESQ` ausente produz acusações A MAIS, todas inválidas — e
  // este invariante fica verde por construção enquanto o defeito passa.
  //
  // Ele fica porque custa pouco e documenta a intenção. A trava de verdade contra regressão na
  // fronteira são os casos NOMEADOS acima (CASOS_FRONTEIRA, SONDAS_FALSO_POSITIVO,
  // SONDAS_FRONTEIRA_ESQ), não este laço. Quem for acrescentar cobertura, acrescente caso nomeado.
  const T = CASOS_FRONTEIRA.map((c) => c.texto).join(' ')
    + ' promovido RF-MOD-PAGAMENTOS-003 e GAP-042 e GAP-4 e RN-001índice e MOD-ACOMP-CARGA.';

  for (const familia of FAMILIAS_EXPLORE) {
    const validos = extrairIds(familia, T);
    const maus = acharMalFormados(familia, T);

    for (const id of validos) {
      assert.ok(
        !maus.includes(id),
        `${familia}: "${id}" foi devolvido pelas DUAS funções — elas deixaram de particionar`,
      );
      assert.ok(validarId(familia, id), `${familia}: extrairIds devolveu "${id}", que validarId recusa`);
    }
    for (const mau of maus) {
      assert.ok(
        !validarId(familia, mau),
        `${familia}: acharMalFormados devolveu "${mau}", que validarId ACEITA`,
      );
    }
  }
});

// ————————————————— Task 3, Step 0: `caminhoDaTool`, o campo de caminho com dono —————————————————
//
// `Write` e `Edit` trazem `file_path`; `NotebookEdit` traz `notebook_path`. São schemas DIFERENTES,
// não sinônimos — ler só o primeiro já deixou a fiscalização de notebook inexistente sem ninguém
// perceber, com o gatilho declarado e o teste verde. A função mora no kit porque o `pretooluse.mjs`
// e o `posttooluse.mjs` precisam da MESMA resposta; escrita duas vezes, ela diverge.

import { caminhoDaTool } from './kit.mjs';

test('caminhoDaTool: Write e Edit trazem o caminho em file_path', () => {
  assert.equal(caminhoDaTool({ file_path: 'C:/repo/CLAUDE.md', content: 'x' }), 'C:/repo/CLAUDE.md');
  assert.equal(caminhoDaTool({ file_path: 'a/b.md', old_string: 'x', new_string: 'y' }), 'a/b.md');
});

test('caminhoDaTool: NotebookEdit traz o caminho em notebook_path', () => {
  assert.equal(caminhoDaTool({ notebook_path: 'a/b.ipynb', new_source: 'x' }), 'a/b.ipynb');
});

test('caminhoDaTool: payload sem caminho nenhum devolve null', () => {
  assert.equal(caminhoDaTool({}), null);
  assert.equal(caminhoDaTool({ command: 'ls' }), null);
});

test('caminhoDaTool: null e undefined devolvem null, sem lançar', () => {
  assert.equal(caminhoDaTool(null), null);
  assert.equal(caminhoDaTool(undefined), null);
});

test('caminhoDaTool: com os dois campos presentes, vence file_path', () => {
  assert.equal(caminhoDaTool({ file_path: 'a.md', notebook_path: 'b.ipynb' }), 'a.md');
});

test('caminhoDaTool: file_path VAZIO não mascara um notebook_path real — `||`, não `??`', () => {
  // O caso do D1. O `??` só cai no segundo campo quando o primeiro é `null`/`undefined`: uma
  // string vazia passa por ele, o chamador cai no `if (!bruto) return null`, e `null` LIBERA — o
  // campo vazio mascarava o campo real. Caminho vazio não é caminho, e não existe chamador
  // legítimo que queira dizer '' e ser levado a sério.
  assert.equal(caminhoDaTool({ file_path: '', notebook_path: 'a.ipynb' }), 'a.ipynb');
});

// ————————————————— `nomeDaSkill`: o nome nu, sem o prefixo de plugin —————————————————
//
// Mudou de casa vindo do `fecho-explore.mjs`, onde era privada. O `cadeia.mjs` (Task 6) precisa da
// MESMA regra: a tabela de pré-requisitos dele é indexada pelo nome nu, e medido, com o payload
// prefixado as DOZE entradas dela passariam sem verificação nenhuma — a tarefa inteira decorativa,
// com a suíte verde. Duplicar a regra diverge; um verificador importar do outro criaria dependência
// entre pares, que é o que a Parte E do Step 0 existiu para evitar. Política mora no kit.

import { nomeDaSkill } from './kit.mjs';

test('nomeDaSkill: corta o prefixo de plugin, e aceita o nome nu', () => {
  // `superpowers:` é prefixo VIVO nesta máquina — skill de plugin chega sempre como
  // `plugin:skill`. A forma nua é a que a vendorização produz, e as duas têm que funcionar.
  assert.equal(nomeDaSkill('superpowers:writing-plans'), 'writing-plans');
  assert.equal(nomeDaSkill('algum-plugin:spec-product'), 'spec-product');
  assert.equal(nomeDaSkill('spec-product'), 'spec-product');
});

test('nomeDaSkill: corta no ÚLTIMO `:` — prefixo com dois-pontos no meio não engana', () => {
  assert.equal(nomeDaSkill('org:plugin:spec-tasks'), 'spec-tasks');
});

test('nomeDaSkill: espaço não conta, nem em volta nem depois do corte', () => {
  assert.equal(nomeDaSkill('  plugin: spec-tasks  '), 'spec-tasks');
});

test('nomeDaSkill: ausência devolve string vazia e não lança', () => {
  for (const v of [null, undefined, '', '   ']) assert.equal(nomeDaSkill(v), '');
});

// ————————————————— Task 3, Step 0: o ramo `ENOTDIR` que nenhum teste defendia —————————————————
//
// As duas cascas tratam `ENOENT` e `ENOTDIR` como AUSÊNCIA — a restrição global 1 do projeto. Só o
// `ENOENT` estava preso por teste: medido, remover `ENOTDIR` das duas deixava a suíte inteira verde,
// e a palavra não aparecia uma vez sequer neste arquivo.
//
// No Windows o erro não ocorre naturalmente: um componente-arquivo no meio do caminho levanta
// `ENOENT`, não `ENOTDIR`. Ou seja, o ramo é correto mas MORTO na plataforma onde o harness roda, e
// indefeso na plataforma onde ele importa. Fabricá-lo pelo sistema de arquivos não funciona aqui;
// injeta-se, como o teste de `EACCES` acima já faz.

const lerComENOTDIR = () => { const e = new Error('não é diretório'); e.code = 'ENOTDIR'; throw e; };

test('inventariar trata ENOTDIR como AUSÊNCIA — conjunto vazio, não exceção', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'kit-notdir-'));
  assert.equal(inventariar(raiz, lerComENOTDIR).size, 0);
});

test('lerVersaoTemplate trata ENOTDIR como AUSÊNCIA — null, não exceção', () => {
  // A raiz EXISTE e tem harness.json válido: sem a injeção, a leitura real teria sucesso e o teste
  // não provaria nada sobre o ramo. É o parâmetro `lerArquivo` que torna o ramo alcançável — a
  // irmã `inventariar` já tinha o dela desde sempre.
  const dir = mkdtempSync(join(tmpdir(), 'kit-vt-notdir-'));
  writeFileSync(join(dir, 'harness.json'), '{"versao":"1.0.0","kitVersao":"2.0.0"}');
  assert.equal(lerVersaoTemplate(dir, lerComENOTDIR), null);
});

test('CODIGOS_DE_AUSENCIA_DE_DOCUMENTO é o conjunto, e ele mora AQUI — em um lugar só', () => {
  // O conjunto estava escrito DUAS vezes, literal: `gramatica.mjs` e `sync-log.mjs`, com o
  // comentário do segundo APONTANDO o gêmeo em vez de importá-lo. Medido antes desta rodada:
  // remover `EISDIR` da cópia do `sync-log` sobrevivia à suíte inteira, 891 asserções — ou seja,
  // as duas cópias já podiam divergir sem que nada avisasse. Fonte escrita duas vezes é a doutrina
  // que esta própria tarefa impôs à `plan.md`; com fonte única a divergência deixa de existir como
  // possibilidade, em vez de ficar dependendo de um teste que a persiga.
  assert.deepEqual([...CODIGOS_DE_AUSENCIA_DE_DOCUMENTO].sort(), ['EISDIR', 'ENOENT', 'ENOTDIR']);
  // A OUTRA PONTA, que é o corte inteiro: ilegibilidade NÃO entra. `EACCES`/`EBUSY`/`EPERM` são
  // "o arquivo ESTÁ lá e eu não o li", e engolir isso viraria "está tudo certo".
  for (const c of ['EACCES', 'EBUSY', 'EPERM']) {
    assert.equal(CODIGOS_DE_AUSENCIA_DE_DOCUMENTO.has(c), false, c);
  }
});

test('lerVersaoTemplate: o leitor injetado é de fato usado, e erro que não é ausência RELANÇA', () => {
  // Espelha `inventariar propaga erro de I/O que não seja ausência`. Sem este par, um
  // `lerArquivo` ignorado passaria despercebido no teste acima quando o diretório não existisse.
  const dir = mkdtempSync(join(tmpdir(), 'kit-vt-eacces-'));
  writeFileSync(join(dir, 'harness.json'), '{"versao":"1.0.0","kitVersao":"2.0.0"}');
  const lerComEACCES = () => { const e = new Error('EACCES: permission denied'); e.code = 'EACCES'; throw e; };
  assert.throws(() => lerVersaoTemplate(dir, lerComEACCES), /EACCES/);
});

// ————————————— Task 3, Step 0: `relativizarComRecuo`, a POLÍTICA dos dois oráculos —————————————
//
// Identidade primeiro; o texto é o recuo, e só entra quando a identidade não pôde responder. A
// política mora no kit e não na casca de cada despachante porque é isto que decide QUAL ORÁCULO
// MANDA — escrita duas vezes, ela diverge, e os dois despachantes passariam a responder diferente
// sobre o MESMO caminho.

import { relativizarComRecuo, relativizarPorIdentidade } from './kit.mjs';

test('relativizarComRecuo usa a IDENTIDADE, não o texto, quando ela decide', () => {
  // Discriminador: `CLAUDE.md::$DATA` (stream alternativo do NTFS) escreve no MESMO arquivo que
  // `CLAUDE.md`, e só a identidade sabe disso — o texto devolve a string com o sufixo, que não casa
  // `CLAUDE.md` na ZONA_IMUTAVEL e portanto LIBERA. Se esta asserção passar a valer
  // 'CLAUDE.md::$DATA', a política caiu no texto e o alias voltou a abrir.
  const raiz = realpathSync(mkdtempSync(join(tmpdir(), 'kit-recuo-')));
  const alvo = join(raiz, 'CLAUDE.md') + '::$DATA';
  assert.equal(relativizar(raiz, alvo), 'CLAUDE.md::$DATA', 'pré-condição: o texto NÃO resolve o stream');
  assert.equal(relativizarComRecuo(raiz, alvo), 'CLAUDE.md');
});

test('relativizarComRecuo cai no TEXTO quando a identidade não decide', () => {
  // "Não decidi" não pode virar `null`: `null` no despachante LIBERA. O texto sempre responde, e
  // para o caminho canônico ele responde certo — é recuo assumido, não silêncio.
  //
  // O ALVO TEM QUE SER UM CAMINHO EM QUE OS DOIS ORÁCULOS DISCORDEM, e a versão anterior deste
  // teste não tinha isso: ela usava `CLAUDE.md` nu, para o qual identidade e texto respondem os
  // dois `'CLAUDE.md'`. O teste passava igual se a injeção fosse honrada ou IGNORADA — medido,
  // mutar `relativizarComRecuo` para não repassar o `statear` deixava a suíte inteira verde.
  // `CLAUDE.md::$DATA` é o discriminador: a identidade resolve o stream do NTFS e devolve
  // `CLAUDE.md`; o texto não sabe o que é isso e devolve a string com o sufixo.
  const raiz = realpathSync(mkdtempSync(join(tmpdir(), 'kit-recuo-')));
  const alvo = join(raiz, 'CLAUDE.md') + '::$DATA';
  const statearRuim = () => { const e = new Error('UNKNOWN'); e.code = 'UNKNOWN'; throw e; };
  assert.equal(relativizarPorIdentidade(raiz, alvo, statearRuim).decidiu, false);
  // Com a injeção ruim, a identidade não responde e quem responde é o TEXTO.
  assert.equal(relativizarComRecuo(raiz, alvo, statearRuim), 'CLAUDE.md::$DATA');
  // Sem injeção, sobre o MESMO caminho, quem responde é a IDENTIDADE. Os dois lados juntos são o
  // teste: um só não distingue "o recuo funciona" de "o `statear` foi para o lixo".
  assert.equal(relativizarComRecuo(raiz, alvo), 'CLAUDE.md');
});

test('relativizarComRecuo devolve null quando a identidade DECIDE que está fora do projeto', () => {
  // `decidiu: true, rel: null` é resposta, não ausência de resposta: o harness governa este
  // repositório, não o disco inteiro. O texto não é consultado aqui.
  const raiz = realpathSync(mkdtempSync(join(tmpdir(), 'kit-recuo-')));
  const fora = realpathSync(mkdtempSync(join(tmpdir(), 'kit-fora-')));
  assert.equal(relativizarComRecuo(raiz, join(fora, 'a.md')), null);
});

test('os templates do Explore usam a notação nova', () => {
  const dir = join(RAIZ, '.claude', 'templates');
  for (const f of readdirSync(dir)) {
    const t = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/(RF|RN|GAP)-<nn>/.test(t), `${f} ainda usa a notação de dois dígitos`);
    assert.ok(!/MOD-<XXX>/.test(t), `${f} ainda usa MOD-<XXX>`);
  }
});

// ————————————————— a gramática do `sync-log.md` —————————————————
//
// DONO ÚNICO. O kickoff morava no `fecho-explore.mjs` e a Seção A nasceria no `sync-log.mjs`: dois
// donos para o mesmo arquivo, que é a família de defeito que este projeto já pagou caro. A
// gramática inteira mora aqui, e os dois verificadores importam daqui.
//
// A FONTE É O KIT DE REFERÊNCIA, não a nossa memória: `spec-iterate/templates/sync-log.md` (as
// nove colunas), `spec/SKILL.md:258` (o gate FATAL `KICKOFF_PERSISTED`),
// `tools/references/task-pipeline.md` §4 (o formato da linha de kickoff) e `tools/check-outputs.py`
// (as quatro regras anti-falso-positivo, e a `KICKOFF_LEGACY_RE` que lê `legado=`).

import {
  RE_KICKOFF, montarKickoff, lerKickoff,
  CABECALHO_SECAO_A, COLUNAS_SECAO_A, RE_LINHA_SECAO_A, montarLinhaSecaoA, lerLinhasSecaoA,
  escopoDeDeclaracao,
} from './kit.mjs';

/** O formato que este harness INVENTOU e que o kit não conhece. Nada pode voltar a aceitá-lo. */
const KICKOFF_VELHO = '> **KICKOFF 2026-08-25** · cliente: Acme · legado: nao · protótipo: obrigatório';

/** A linha de EXEMPLO da Seção A, copiada do template do kit — placeholder de data incluído. */
const LINHA_EXEMPLO_DO_TEMPLATE =
  '| 1 | YYYY-MM-DD HH:MM | spec-ingest | kickoff: sem legado · 3 transcrições · 1 PDF normativo ' +
  '| inputs/reuniao-01.txt, inputs/norma-X.pdf | context-map.md, discovery-document.md (8 seções) ' +
  '| Domínio central = X | consultor | spec-legacy (skip) → spec-benchmark |';

/** A MESMA linha com data de verdade: é isto que separa exemplo de registro. */
const LINHA_REGISTRO = LINHA_EXEMPLO_DO_TEMPLATE.replace('YYYY-MM-DD HH:MM', '2026-08-25 14:32');

const comTabela = (linhas) => [CABECALHO_SECAO_A, ...linhas].join('\n');

test('CABECALHO_SECAO_A tem as NOVE colunas do template do kit, na ordem', () => {
  // Quatro colunas foi o que o plano chutou, e escrever assim quebraria o `check-outputs.py`: é a
  // coluna `Modo / contexto` que carrega `LEGACY_SKIPPED`, `FLOWMAP_SKIPPED` e o kickoff.
  assert.deepEqual(COLUNAS_SECAO_A, [
    '#', 'Data/Hora', 'Skill', 'Modo / contexto', 'Inputs consumidos',
    'Outputs gerados ou atualizados', 'Decisões-chave (1–3 bullets)', 'Decisor',
    'Próximo passo recomendado',
  ]);
  for (const c of COLUNAS_SECAO_A) assert.ok(CABECALHO_SECAO_A.includes(c), c);
  const [cab, delim] = CABECALHO_SECAO_A.split('\n');
  assert.equal(cab.split('|').length - 2, 9, 'o cabeçalho tem nove células');
  assert.equal(delim.split('|').length - 2, 9, 'o delimitador tem nove células');
});

test('montarKickoff emite o formato do KIT — e o formato velho deixou de ser reconhecido', () => {
  const l = montarKickoff({ legado: 'sim', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt' });
  // A ponta do CERTO: o formato de `task-pipeline.md` §4, literal.
  assert.equal(l, 'kickoff: legado=Sim · ramo=A · ambiente=claude · inputs=inputs/reuniao-01.txt');
  assert.match(l, RE_KICKOFF);
  const k = lerKickoff('# Sync Log\n\n' + l + '\n');
  assert.equal(k.presente, true);
  assert.equal(k.legado, 'sim');
  assert.equal(k.ramo, 'A');
  assert.equal(k.ambiente, 'claude');
  assert.equal(k.inputs, 'inputs/reuniao-01.txt');
  // A ponta do ERRADO: um teste que só provasse a linha acima passaria com a função apagada.
  assert.doesNotMatch(KICKOFF_VELHO, RE_KICKOFF);
  assert.equal(lerKickoff('# Sync Log\n\n' + KICKOFF_VELHO + '\n').presente, false);
});

test('lerKickoff normaliza legado para sim/parcial/nao', () => {
  const ler = (v) => lerKickoff(`kickoff: legado=${v} · ramo=A · ambiente=claude · inputs=x`).legado;
  assert.equal(ler('Sim'), 'sim');
  assert.equal(ler('Parcial'), 'parcial');
  assert.equal(ler('Não'), 'nao');
  assert.equal(ler('nao'), 'nao');
});

test('a CLASSE da RE_KICKOFF corta nos separadores do KIT — o valor não é `\\S+`', () => {
  // MEDIDO nesta rodada: trocar a classe `[^\s·|,;]+` por `(\S+)` sobrevivia à suíte INTEIRA, 889
  // asserções. A ESTRUTURA da regex estava presa (o `kickoff:` que abre, o `\blegado`); a classe,
  // que é quem decide ONDE o valor termina, não estava.
  //
  // A FONTE É O KIT, e não a memória de quem escreve o teste — `tools/check-outputs.py:231`:
  //   KICKOFF_LEGACY_RE = re.compile(r"kickoff:[^\n]*?legado\s*=\s*([^\s·|,;]+)", re.IGNORECASE)
  // São QUATRO separadores — `·`, `|`, `,`, `;` — mais o espaço em branco do `\s`. Cada caso abaixo
  // foi rodado contra essa regex do kit em Python antes de virar asserção, e nos cinco ela captura
  // `Sim`. É o mesmo valor que se exige daqui: porte fiel, não reinvenção.
  for (const sep of ['·', ',', ';']) {
    const linha = `kickoff: legado=Sim${sep}ramo=A`;
    // O corte na CLASSE, medido na captura crua — sem espaço em volta do separador, que é
    // justamente onde `\S+` divergiria.
    assert.equal(linha.match(RE_KICKOFF)[1], 'Sim', `captura crua com \`${sep}\``);
    // E a MESMA coisa na ponta que decide: o valor chega normalizado a quem lê o kickoff.
    assert.equal(lerKickoff('# Sync Log\n\n' + linha + '\n').legado, 'sim', `legado com \`${sep}\``);
  }
  // O espaço em branco — o único separador que `\S+` também respeita. Sem esta linha, os casos
  // acima poderiam passar por acidente de espaçamento no dia em que a classe mudasse.
  assert.equal(lerKickoff('# Sync Log\n\nkickoff: legado=Sim · ramo=A\n').legado, 'sim');
  // O `|`. `legado=Sim|Parcial` é a forma que a própria documentação do kit usa (`tools/README.md`)
  // para dizer «Sim ou Parcial», e a classe corta nele: o kit lê `Sim` e a linha DECLARA legado.
  // Com a classe afrouxada o valor lido vira `Sim|Parcial` inteiro, e aí o `limparValor` o descarta
  // como placeholder — a linha para de declarar qualquer coisa.
  const pipe = lerKickoff('# Sync Log\n\nkickoff: legado=Sim|Parcial\n');
  assert.equal(pipe.presente, true, 'o corte no pipe é o que faz esta linha declarar');
  assert.equal(pipe.legado, 'sim');
  // A outra ponta, que impede a leitura acima de virar "aceita qualquer coisa": o placeholder do
  // template abre com `<` e continua INERTE, com classe ou sem ela.
  assert.equal(lerKickoff('# Sync Log\n\nkickoff: legado=<Sim|Parcial|Não> · ramo=<A|B>\n').presente, false);
});

test('lerKickoff aceita a variante em PROSA do template — negá-la seria falso positivo nosso', () => {
  // `check-outputs.py:233` (`KICKOFF_NO_LEGACY_PROSE_RE`) aceita `kickoff: … sem legado …`. Se o
  // kit aceita, recusar aqui reprovaria um projeto que o orquestrador iniciou corretamente.
  const k = lerKickoff('kickoff: sem legado · 3 transcrições · 1 PDF normativo');
  assert.equal(k.presente, true);
  assert.equal(k.legado, 'nao');
});

test('regra 1/2 — `kickoff:` no MEIO de uma frase não conta; abrindo a linha, conta', () => {
  // Mesmo defeito que a rodada D consertou no carimbo de congelamento. A frase abaixo existe no
  // template do kit e no `spec-legacy/SKILL.md`: lida como declaração, ela tornava os quatro
  // artefatos do AS-IS obrigatórios em todo projeto nascido do template.
  const prosa = 'A regra diz que `kickoff: legado=Sim` tem precedência sobre `LEGACY_SKIPPED`.\n';
  assert.equal(lerKickoff(prosa).presente, false);
  // E a mesma string ABRINDO a linha declara — sem esta metade, apagar a função passaria.
  assert.equal(lerKickoff(prosa + 'kickoff: legado=Parcial · ramo=B · ambiente=ambos · inputs=x\n').legado, 'parcial');
});

test('regra 2 — em tabela o kickoff só declara na coluna `Modo / contexto`', () => {
  const doc = [
    '| Marcador | Quem escreve |',
    '|---|---|',
    '| kickoff: legado=Sim · ramo=A · ambiente=claude · inputs=x | spec |',
  ].join('\n');
  assert.equal(lerKickoff(doc).presente, false, 'coluna de documentação não declara');
  assert.equal(lerKickoff(comTabela([LINHA_REGISTRO])).presente, true, 'a coluna canônica declara');
});

test('regra 2 — a coluna que DOCUMENTA vence a canônica, e cada termo da lista é medido', () => {
  // `RE_COLUNA_DOCUMENTAL` é porte fiel do `DOC_MARKER_COLUMN_RE` do kit, com a MESMA lista de
  // termos e a MESMA precedência sobre a coluna canônica — e é a precedência que a torna alcançável:
  // `Modo / contexto` casa a canônica, e um cabeçalho que também documenta (`… (exemplo)`) tem que
  // deixar de declarar. Sem o porte, uma tabela que só ILUSTRA o formato declararia `legado=Sim`
  // sobre um projeto que não decidiu nada — e o `legado=` liga os quatro artefatos do AS-IS.
  const TERMOS = [
    'marcador', 'anti-padrão', 'antipadr', 'não fazer', 'nao-fazer', 'não faça', 'nunca', 'errado',
    'evitar', 'incorreto', 'proibido', 'contraexemplo', 'exemplo', 'formato', 'sintaxe',
    'quem escreve', 'efeito', 'quando',
  ];
  const tabela = (cabecalho) => [
    `| # | Data/Hora | ${cabecalho} |`,
    '|---|---|---|',
    '| 1 | 2026-08-25 14:32 | kickoff: legado=Sim · ramo=A · ambiente=claude · inputs=x |',
  ].join('\n');

  // A PONTA DO CERTO, primeiro: sem termo documental, a coluna canônica DECLARA. Sem ela, uma
  // `RE_COLUNA_DOCUMENTAL` que casasse tudo passaria no laço abaixo.
  assert.equal(lerKickoff(tabela('Modo / contexto')).legado, 'sim');
  assert.equal(lerKickoff(tabela('`**Modo / contexto**`')).legado, 'sim', 'crase e negrito são aparados');

  // E cada termo, nominalmente. MEDIDO apagando um alternante por vez, os dezesseis: quinze dão
  // vermelho aqui. `contraexemplo` SOBREVIVE, e não é lacuna deste teste — ele está contido em
  // `exemplo`, que vem logo depois na mesma alternância, então apagá-lo não muda a linguagem que a
  // regex aceita. O alternante é redundante no `DOC_MARKER_COLUMN_RE` do PRÓPRIO kit, e fica aqui
  // porque este é porte FIEL: divergir da lista do kit é o que faz as duas leituras discordarem.
  for (const t of TERMOS) {
    assert.equal(
      lerKickoff(tabela(`Modo / contexto — ${t}`)).presente, false,
      `o termo \`${t}\` tem que fazer a coluna DOCUMENTAR, não declarar`,
    );
  }
  // Cabeçalho vazio também não declara — coluna sem nome não é a coluna certa.
  assert.equal(lerKickoff(tabela('')).presente, false);
});

test('regra 3 — a linha de EXEMPLO do template não é registro, e a mesma com data real é', () => {
  // A linha do template registra `spec-ingest`. Um leitor ingênuo concluiria que a skill rodou.
  assert.deepEqual(lerLinhasSecaoA(comTabela([LINHA_EXEMPLO_DO_TEMPLATE])), []);
  assert.equal(lerKickoff(comTabela([LINHA_EXEMPLO_DO_TEMPLATE])).presente, false);
  const lidas = lerLinhasSecaoA(comTabela([LINHA_REGISTRO]));
  assert.equal(lidas.length, 1);
  assert.equal(lidas[0].skill, 'spec-ingest');
  assert.equal(lidas[0].data, '2026-08-25');
  assert.equal(lidas[0].hora, '14:32');
});

test('regra 3 — o placeholder só desqualifica na COLUNA DE DATA; `HH:MM` em outra célula é registro', () => {
  // A PROTEÇÃO da regra 3, que fica dentro de uma trava BLOQUEANTE. `ehLinhaDeExemplo` restringe o
  // placeholder à SEGUNDA célula; casar em qualquer ponto da linha — que é o `_is_template_row`
  // ingênuo, e a regressão que o próprio kit documenta — apaga registro legítimo. Medido com o
  // mutante: `lerKickoff` devolve `presente: false` e `lerLinhasSecaoA` lê zero linhas para a linha
  // abaixo, e o `fecho-explore` NEGA um projeto que registrou corretamente.
  const legitima = montarLinhaSecaoA({
    numero: 1, data: '2026-08-25', hora: '14:32', skill: 'spec-ingest',
    modo: montarKickoff({ legado: 'nao', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt' }),
    inputs: 'inputs/reuniao-01.txt', outputs: 'context-map.md',
    decisoes: 'janela de corte declarada no formato HH:MM, não em minutos',
    decisor: 'consultor', proximo: 'spec-legacy',
  });
  const lidas = lerLinhasSecaoA(comTabela([legitima]));
  assert.equal(lidas.length, 1, '`HH:MM` fora da coluna de data não faz da linha um exemplo');
  assert.equal(lidas[0].skill, 'spec-ingest');
  assert.equal(lerKickoff(comTabela([legitima])).legado, 'nao', 'o kickoff dessa linha continua declarando');

  // A OUTRA PONTA, sem a qual "nunca é exemplo" passaria: com o placeholder NA COLUNA DE DATA, a
  // MESMA linha volta a ser exemplo — e é isso que impede o template de declarar por si.
  const comoExemplo = legitima.replace('2026-08-25 14:32', 'YYYY-MM-DD HH:MM');
  assert.deepEqual(lerLinhasSecaoA(comTabela([comoExemplo])), []);
  assert.equal(lerKickoff(comTabela([comoExemplo])).presente, false);
  // E fora de tabela a regra vale para a linha inteira — é a linha de prosa do template.
  assert.equal(lerKickoff('kickoff: legado=Sim · ramo=A · ambiente=claude · inputs=YYYY-MM-DD').presente, false);
});

test('regra 4 — nada dentro de cerca de código declara, nem indentado por quatro espaços', () => {
  const cercado = comTabela([]) + '\n\n```\n' + LINHA_REGISTRO + '\n```\n';
  assert.deepEqual(lerLinhasSecaoA(cercado), []);
  assert.equal(lerKickoff('# t\n\n```\nkickoff: legado=Sim · ramo=A · ambiente=claude · inputs=x\n```\n').presente, false);
  const indentado = '# t\n\n    kickoff: legado=Sim · ramo=A · ambiente=claude · inputs=x\n';
  assert.equal(lerKickoff(indentado).presente, false);
  // Fora da cerca, a MESMA linha é lida — sem esta metade, `lerLinhasSecaoA` podendo devolver
  // sempre `[]` passaria nos três de cima.
  assert.equal(lerLinhasSecaoA(comTabela([LINHA_REGISTRO]) + '\n\n```\ntexto\n```\n').length, 1);
});

test('placeholder do kit não declara: `legado=<Sim|Parcial|Não>` é o formato, não a decisão', () => {
  const k = lerKickoff('kickoff: legado=<Sim|Parcial|Não> · ramo=<A|B> · ambiente=<cursor|claude|ambos> · inputs=<lista>');
  assert.equal(k.legado, null);
  assert.equal(k.presente, false, 'linha inteiramente de placeholder não é kickoff persistido');
});

test('montarLinhaSecaoA produz linha que RE_LINHA_SECAO_A casa e lerLinhasSecaoA lê de volta', () => {
  const campos = {
    numero: 3, data: '2026-08-25', hora: '09:07', skill: 'spec-product', modo: 'delta',
    inputs: 'context-map.md', outputs: 'requirements/requirements.md', decisoes: 'escopo fechado',
    decisor: 'consultor', proximo: 'spec-prototype',
  };
  const l = montarLinhaSecaoA(campos);
  assert.match(l, RE_LINHA_SECAO_A);
  assert.equal(l.split('|').length - 2, 9, 'a linha tem nove células');
  const [r] = lerLinhasSecaoA(comTabela([l]));
  assert.equal(r.numero, 3);
  assert.equal(r.skill, 'spec-product');
  assert.equal(r.modo, 'delta');
  assert.equal(r.decisor, 'consultor');
  assert.equal(r.proximo, 'spec-prototype');
  // O formato de QUATRO colunas do plano quebraria o kit: sem a coluna `Modo / contexto` não há
  // onde escrever `delta`, `LEGACY_SKIPPED` nem o kickoff.
  assert.doesNotMatch('| 3 | 2026-08-25 09:07 | spec-product | delta |', RE_LINHA_SECAO_A);
});

test('lerLinhasSecaoA devolve SÓ campos com consumidor — nada decorativo no objeto', () => {
  // Havia aqui um campo `linha` — a linha crua, escape incluído — com um comentário afirmando que
  // ele existia "para aparecer em mensagem e para casar o texto original". Nenhuma mensagem o
  // usava: `grep` por consumo devolvia ZERO em produção e em teste, e apagá-lo do objeto sobrevivia
  // às quatro suítes. Ele foi escrito na própria rodada que varreu o repositório por comentário
  // afirmando o que não é — a mesma família de defeito, reintroduzida durante a varredura.
  //
  // A asserção é sobre o CONJUNTO INTEIRO de chaves, e não sobre a ausência de uma: assim ela
  // prende o PRÓXIMO campo sem consumidor, e não só o que já foi removido. Quem acrescentar campo
  // aqui passa por esta linha, e ao passar declara que alguém o lê.
  const [r] = lerLinhasSecaoA(comTabela([LINHA_REGISTRO]));
  assert.deepEqual(Object.keys(r).sort(), [
    'data', 'decisoes', 'decisor', 'hora', 'inputs',
    'minuto', 'modo', 'numero', 'outputs', 'proximo', 'skill',
  ]);
});

test('pipe ESCAPADO na célula: a linha volta a ser legível, e o valor devolvido traz o pipe NU', () => {
  // A função ESCREVIA o que não conseguia LER: `montarLinhaSecaoA` escapa `|` como `\|` — convenção
  // do Markdown, e a mesma do `_CELL_SPLIT_RE` do `check-outputs.py` — e a `RE_LINHA_SECAO_A`
  // rejeitava QUALQUER pipe nas sete células de conteúdo. Não é caso exótico: o próprio template do
  // kit escreve `doc→proto \| proto→doc` na Seção B e `motivo=<API pura|batch|worker>` na coluna
  // `Modo / contexto`. Quem registrava direito e usava um pipe recebia o lembrete de novo — falso
  // positivo em cima de trabalho correto.
  const l = montarLinhaSecaoA({
    numero: 1, data: '2026-08-25', hora: '14:32', skill: 'spec-product', modo: 'delta',
    inputs: 'a.md', outputs: 'b.md', decisoes: 'ramo A|B decidido', decisor: 'consultor',
    proximo: 'spec-iterate',
  });
  assert.ok(l.includes('ramo A\\|B decidido'), 'a montagem escapa o pipe');
  assert.match(l, RE_LINHA_SECAO_A);
  const lidas = lerLinhasSecaoA(comTabela([l]));
  assert.equal(lidas.length, 1, 'a linha que a própria função escreveu tem que ser legível');
  // A SEGUNDA METADE, que é a que se esquece: sem desescapar, o consumidor vê texto que ninguém
  // escreveu — e a coluna `Skill` é comparada por IGUALDADE na regra de recência do `sync-log.mjs`.
  assert.equal(lidas[0].decisoes, 'ramo A|B decidido');
  assert.equal(lidas[0].skill, 'spec-product');
  // O escape do pipe é o ÚNICO que se desfaz. `\n` numa célula é a sequência de dois caracteres que
  // o autor escreveu, e virar quebra de linha destruiria a linha.
  const comBarra = montarLinhaSecaoA({
    numero: 2, data: '2026-08-25', hora: '14:33', skill: 'spec-iterate', modo: 'C:\\projeto',
    inputs: 'a.md', outputs: 'b.md', decisoes: 'regex \\n literal', decisor: 'consultor',
    proximo: 'spec-report',
  });
  const [b] = lerLinhasSecaoA(comTabela([comBarra]));
  assert.equal(b.modo, 'C:\\projeto');
  assert.equal(b.decisoes, 'regex \\n literal');
});

test('pipe SEM escape continua sendo linha malformada — a outra ponta da mesma regex', () => {
  // Sem esta metade, trocar as sete células por `(.*)` passaria no teste de cima: "aceita pipe
  // escapado" e "aceita qualquer coisa" são gramáticas diferentes, e só a segunda lê como registro
  // uma linha com as colunas DESLOCADAS.
  const dezCelulas =
    '| 1 | 2026-08-25 14:32 | spec-product | delta | a.md | b.md | ramo A|B | consultor | spec-iterate |';
  assert.doesNotMatch(dezCelulas, RE_LINHA_SECAO_A);
  assert.deepEqual(lerLinhasSecaoA(comTabela([dezCelulas])), []);
  // E a gramática continua LINEAR: a alternância aceita `\` só como início de par escapado, então
  // o corte da célula é sempre o pipe NU e a leitura da cadeia é única. MEDIDO: com a forma óbvia
  // `((?:\\\||[^|\n])*)`, onde cada `\|` também pode encerrar a célula, 80 pares numa linha que não
  // fecha custam 28,3 s; com a forma abaixo, 0 ms até 2000 pares.
  const longa = '| 1 | 2026-08-25 14:32 | s | m | i | o | ' + 'a\\|'.repeat(400) + 'X | d | p ';
  const t0 = Date.now();
  assert.doesNotMatch(longa, RE_LINHA_SECAO_A, 'sem o pipe final a linha não fecha');
  assert.ok(Date.now() - t0 < 500, `a regex tem que responder em tempo linear (levou ${Date.now() - t0}ms)`);
});

test('a guarda de NOVE colunas: linha que casa a regex mas não se divide em nove NÃO é registro', () => {
  // A regex e o `dividirLinhaDeTabela` discordam num ponto, e a guarda é o que impede a discordância
  // de virar registro com as colunas DESLOCADAS. Duas contrabarras coladas no delimitador: a regex
  // consome `\\` como par escapado e lê o `|` seguinte como delimitador; o `dividirLinhaDeTabela`
  // (gêmeo do `_CELL_SPLIT_RE` do kit, `(?<!\\)\|`) vê um `|` precedido de contrabarra e NÃO divide
  // ali. Resultado medido: a regex casa e saem OITO células. Sem a guarda, `celulas[8]` é
  // `undefined`, `Skill` passa a ser a coluna errada e o registro entra torto — sem nenhum vermelho.
  const oitoCelulas =
    '| 1 | 2026-08-25 14:32 | spec-ingest | delta | a.md | b.md | ramo A\\\\| consultor | spec-iterate |';
  assert.match(oitoCelulas, RE_LINHA_SECAO_A, 'a premissa da guarda: a regex CASA esta linha');
  assert.deepEqual(lerLinhasSecaoA(comTabela([oitoCelulas])), [], 'e mesmo assim ela não é lida');

  // A OUTRA PONTA: a linha bem formada, com as nove, continua entrando. Sem esta metade, uma guarda
  // que rejeitasse tudo passaria no assert de cima.
  const nove = montarLinhaSecaoA({
    numero: 1, data: '2026-08-25', hora: '14:32', skill: 'spec-ingest', modo: 'delta',
    inputs: 'a.md', outputs: 'b.md', decisoes: 'ramo A', decisor: 'consultor', proximo: 'spec-iterate',
  });
  const [r] = lerLinhasSecaoA(comTabela([nove]));
  assert.equal(r.skill, 'spec-ingest');
  assert.equal(r.proximo, 'spec-iterate');
});

test('lerLinhasSecaoA devolve o minuto comparável, em hora local', () => {
  const [r] = lerLinhasSecaoA(comTabela([montarLinhaSecaoA({
    numero: 1, data: '2026-08-25', hora: '14:32', skill: 'spec-ingest', modo: '', inputs: '',
    outputs: '', decisoes: '', decisor: '', proximo: '',
  })]));
  assert.equal(r.minuto, new Date(2026, 7, 25, 14, 32).getTime());
});

test('lerLinhasSecaoA ignora a Seção B e a tabela de marcadores do template', () => {
  const doc = [
    comTabela([LINHA_REGISTRO]),
    '',
    '| Marcador | Quem escreve | Quando | Efeito |',
    '|---|---|---|---|',
    '| `LEGACY_SKIPPED: motivo=<…>` | spec-legacy | sem legado | vira ⬜ |',
    '',
    '| Data | Direção | GAP fechado | Origem | Artefatos | Resumo | Decisor |',
    '|---|---|---|---|---|---|---|',
    '| 2026-08-25 | doc→proto | GAP-001 | chat | gaps.md | resumo | consultor |',
  ].join('\n');
  const lidas = lerLinhasSecaoA(doc);
  assert.equal(lidas.length, 1, 'só a linha da Seção A é registro de execução');
  assert.equal(lidas[0].skill, 'spec-ingest');
});

test('escopoDeDeclaracao preserva a contagem de linhas — é idempotente', () => {
  const doc = '# t\n\n```\nkickoff: legado=Sim\n```\n\n' + LINHA_EXEMPLO_DO_TEMPLATE + '\n';
  const uma = escopoDeDeclaracao(doc);
  assert.equal(uma.split('\n').length, doc.split('\n').length);
  assert.equal(escopoDeDeclaracao(uma), uma);
  assert.ok(!uma.includes('spec-ingest'), 'a linha de exemplo saiu do escopo');
});


// ————————————————— a raiz do Plan é UMA, e a segunda saiu com a vendorização —————————————————
//
// `RAIZ_PIPELINE` era a compatibilidade com o layout `task-generator/outputs/`, que o kit
// descontinuou: um plugin `spec-*` instalado ANTES da descontinuação escrevia ali, e numa trava
// bloqueante procurar numa raiz só transformaria isso em falso positivo permanente. Com o kit
// vendorizado em `.claude/skills/` (Decisão 7) não há mais plugin de versão desconhecida na
// jogada, e o gatilho de remoção estava declarado no `CLAUDE.md`.
//
// A MEDIÇÃO É A DUAS PONTAS de propósito. Ponta 1 proíbe o caminho velho; ponta 2 exige o novo
// NOMINALMENTE, com o valor. Sem a ponta 2, apagar a checagem inteira — a trava desligada —
// também passaria, e a Task 4 deste mesmo plano já pagou por essa exata omissão.

import * as cadeia from './cadeia.mjs';
import * as syncLog from './sync-log.mjs';
import * as kitNs from './kit.mjs';

const DIR_HOOKS = join(RAIZ, '.claude', 'hooks');

test('RAIZ_PIPELINE não existe mais — o kit vendorizado matou a compatibilidade', () => {
  // PONTA 1: o caminho velho sumiu, nos três módulos que o conheciam.
  assert.equal(kitNs.RAIZ_PIPELINE, undefined);
  assert.equal(cadeia.RAIZ_PIPELINE, undefined);
  assert.equal(syncLog.RAIZ_PIPELINE, undefined);
});

test('nenhum módulo da camada cita task-generator', () => {
  // PONTA 1, por varredura: a constante pode ter saído e o LITERAL ter ficado — num comentário,
  // numa mensagem de negação, numa lista escrita à mão.
  //
  // VARRE SÓ O QUE É NOSSO. `.claude/skills/` é o kit vendorizado, e o kit documenta a própria
  // compatibilidade — varrer lá acharia ocorrência legítima e a asserção viraria ruído.
  let vistos = 0;
  for (const nome of readdirSync(DIR_HOOKS)) {
    if (!nome.endsWith('.mjs') || nome.endsWith('.test.mjs')) continue;
    vistos += 1;
    const src = readFileSync(join(DIR_HOOKS, nome), 'utf8');
    assert.ok(!src.includes('task-generator'), `${nome} ainda cita task-generator`);
  }
  // Sem isto, um `DIR_HOOKS` errado deixaria a varredura verde por não ler arquivo nenhum.
  assert.ok(vistos >= 6, `a varredura leu só ${vistos} módulos — DIR_HOOKS está apontando errado`);
});

test('RAIZ_SPEC é a raiz do Plan, e é exigida NOMINALMENTE', () => {
  // PONTA 2, e é a que falta na maioria das remoções: sem ela, apagar a linha inteira também
  // passaria. Aqui se exige que a raiz certa esteja lá, com o valor certo.
  assert.equal(RAIZ_SPEC, 'outputs/spec');
  // Os dois valores foram MEDIDOS chamando a função, não deduzidos da tabela: `data-model.json` e
  // `api-contracts.yaml` mapeiam para `null`, e quem tem validador é `flow-map.md` e `modules.md`.
  assert.equal(validadorPara(`${RAIZ_SPEC}/flow-map.md`), 'check-flowmap');
  assert.equal(validadorPara(`${RAIZ_SPEC}/modules.md`), 'check-modules');
});


// ————————————————— Task 2 (Plano 3): o vocabulário do Plan —————————————————

import { ID_PADRAO_PLAN, FAMILIAS_PLAN, extrairIdsPlan, ARTEFATOS_DE_PROMOCAO } from './kit.mjs';

test('extrairIdsPlan acha as famílias promovidas do kit', () => {
  const t = 'O RF-MOD-PAGAMENTOS-003 e o RF-MOD-PAG-12 cobrem a RN-NOVO-004, com fonte F-001.';
  assert.deepEqual(extrairIdsPlan('RF_KIT', t), ['RF-MOD-PAGAMENTOS-003', 'RF-MOD-PAG-12']);
  assert.deepEqual(extrairIdsPlan('RN_NOVO', t), ['RN-NOVO-004']);
  assert.deepEqual(extrairIdsPlan('FATO', t), ['F-001']);
});

test('D14 — RN-NOVO com domínio, a forma do template da spec-product, é um ID inteiro', () => {
  // O template `spec-product/templates/business-rules.md` abre `#### RN-NOVO-[DOMÍNIO]-001`, e o
  // padrão `RN-NOVO-\d{2,4}` não reconhecia `RN-NOVO-DESCONTO-001`: as regras novas do projeto do
  // teste ponta a ponta da 2.6.0 simplesmente não existiam para a promoção. As duas formas valem.
  const t = 'A RN-NOVO-DESCONTO-001, a RN-NOVO-ACOMP-CARGA-12 e a RN-NOVO-004.';
  assert.deepEqual(extrairIdsPlan('RN_NOVO', t), ['RN-NOVO-DESCONTO-001', 'RN-NOVO-ACOMP-CARGA-12', 'RN-NOVO-004']);
  // O placeholder do template não é ID — senão um template intocado consumiria fato.
  assert.deepEqual(extrairIdsPlan('RN_NOVO', 'RN-NOVO-[DOMÍNIO]-001'), []);
  // Hífen colando o ID a mais token é texto malformado, e nada é extraído — nem a poda.
  assert.deepEqual(extrairIdsPlan('RN_NOVO', 'RN-NOVO-DESCONTO-001-A'), []);
  // Domínio terminando em hífen é typo, como no código de módulo.
  assert.deepEqual(extrairIdsPlan('RN_NOVO', 'RN-NOVO-DESCONTO--001'), []);
  // E a forma com domínio não vaza para as famílias vizinhas.
  for (const outra of ['RF_KIT', 'RNF', 'FATO']) {
    assert.deepEqual(extrairIdsPlan(outra, 'RN-NOVO-DESCONTO-001'), [], outra);
  }
});

test('extrairIdsPlan acha o RNF de negócio — o template abre `### RNF-[CATEGORIA]-NNN`', () => {
  const t = 'O RNF-PERF-001 e o RNF-SEG-002 nascem do F-050.';
  assert.deepEqual(extrairIdsPlan('RNF', t), ['RNF-PERF-001', 'RNF-SEG-002']);
});

test('as duas tabelas de ID não se confundem — é o que separa Explore de Plan', () => {
  // ESTA É A ASSERÇÃO QUE IMPORTA. `RF-\d{3,4}` do Explore não pode casar o miolo de um ID
  // promovido, e `RF-MOD-…` do Plan não pode casar um ID do Explore. Se um dos dois lados vazar,
  // a cobertura de promoção passa a comparar um ID consigo mesmo e reporta 100% de cobertura.
  const promovido = 'RF-MOD-PAGAMENTOS-003';
  const doExplore = 'RF-007';
  assert.deepEqual(extrairIds('RF', promovido), [], 'o padrão do Explore vazou para o do Plan');
  assert.deepEqual(extrairIdsPlan('RF_KIT', doExplore), [], 'o padrão do Plan vazou para o do Explore');
  assert.deepEqual(extrairIds('RN', 'RN-NOVO-004'), [], 'RN-NOVO não é RN do Explore');

  // O RNF é a família nova, e é a que tem mais vizinho de forma parecida: `RNF-` começa com o
  // `RF`/`RN` das outras duas, e o `F-\d{3,4}` do fato está contido no sufixo `…PERF-001`.
  assert.deepEqual(extrairIdsPlan('RNF', 'RF-MOD-PAG-001'), [], 'RNF vazou para o RF do kit');
  assert.deepEqual(extrairIdsPlan('RF_KIT', 'RNF-PERF-001'), [], 'o RF do kit vazou para o RNF');
  assert.deepEqual(extrairIds('RN', 'RNF-PERF-001'), [], 'o RN-\\d{3,4} do Explore casou RNF-');
  // O placeholder do template NÃO é ID: se casasse, `promocao.mjs` sobre um template intocado
  // reportaria consumo por um requisito que ninguém escreveu.
  assert.deepEqual(extrairIdsPlan('RNF', 'RNF-[CATEGORIA]-001'), [], 'o placeholder virou ID');
});

test('nenhuma família do Plan casa o exemplar de outra — a matriz inteira, sobre FAMILIAS_PLAN', () => {
  // Este é o consumidor de `FAMILIAS_PLAN`: acrescentar uma família à tabela e esquecer a lista
  // (ou o contrário) quebra aqui, e a matriz cobre o par novo sem que ninguém o escreva à mão.
  const exemplar = {
    RF_KIT: 'RF-MOD-PAG-001',
    RN_NOVO: 'RN-NOVO-004',
    RNF: 'RNF-PERF-001',
    FATO: 'F-001',
  };
  assert.deepEqual([...FAMILIAS_PLAN].sort(), Object.keys(ID_PADRAO_PLAN).sort(),
    'FAMILIAS_PLAN e ID_PADRAO_PLAN discordam sobre quais famílias existem');
  for (const familia of FAMILIAS_PLAN) {
    assert.ok(exemplar[familia], `falta exemplar para a família ${familia}`);
    assert.deepEqual(extrairIdsPlan(familia, exemplar[familia]), [exemplar[familia]],
      `${familia} não reconheceu o próprio exemplar`);
    for (const outra of FAMILIAS_PLAN) {
      if (outra === familia) continue;
      assert.deepEqual(extrairIdsPlan(familia, exemplar[outra]), [],
        `${familia} casou o exemplar de ${outra} — as famílias se confundem`);
    }
  }
});

test('FATO e ID_PROIBIDO_NO_EXPLORE são a MESMA definição, com dois nomes', () => {
  assert.equal(ID_PADRAO_PLAN.FATO, ID_PROIBIDO_NO_EXPLORE);
});

test('os artefatos de promoção carregam os subdiretórios que o check-outputs.py cobra', () => {
  // Se alguém "simplificar" para `requirements.md`, o promocao.mjs deixa de achar qualquer RF e
  // reporta TODOS como órfãos — relatório falso que parece autoridade. Fonte: a tabela ARTIFACTS
  // do skills/tools/check-outputs.py.
  assert.equal(ARTEFATOS_DE_PROMOCAO.requisitos, 'requirements/requirements.md');
  assert.equal(ARTEFATOS_DE_PROMOCAO.contextMap, 'context-map.md');
});

import { ARTEFATOS_DE_CONTRATO, LISTA_DE_ACRESCIMOS } from './kit.mjs';

test('ARTEFATOS_DE_CONTRATO deriva os do Explore de DOCS_EXPLORE — uma fonte só', () => {
  assert.deepEqual([...ARTEFATOS_DE_CONTRATO.explore], DOCS_EXPLORE.map((d) => d.caminho));
});

test('nenhum artefato de MÁQUINA está no contrato da wiki', () => {
  // A lista é de inclusão exatamente para que este teste seja possível. Com lista de exclusão,
  // a asserção correta seria sobre o que NÃO está lá — e não há como enumerar o que ainda não
  // existe.
  for (const maquina of ['revisao.json', 'screens-manifest.json', '_explore-congelado.md']) {
    assert.ok(!ARTEFATOS_DE_CONTRATO.spec.includes(maquina), `${maquina} vazaria para a wiki do cliente`);
  }
  assert.ok(!ARTEFATOS_DE_CONTRATO.spec.some((a) => a.startsWith('auditorias/')));
});

test('os artefatos do Plan com subdiretório usam a forma que o check-outputs.py cobra', () => {
  for (const a of ['requirements/requirements.md', 'product-requirements/product-requirements.md', 'product-vision/product-vision.md']) {
    assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes(a), `falta ${a}`);
  }
});

test('tech-rules-summary.md e estimate-report.md moram nos subdiretórios que a fonte cobra', () => {
  // Defeito medido no primeiro levantamento desta lista: os dois entraram na raiz de outputs/spec/,
  // mas `spec-tech-rules/SKILL.md` e a tabela ARTIFACTS de check-outputs.py nomeiam subdiretório
  // para os dois. Uma wiki que copiasse a forma plana copiaria de um caminho que não existe.
  assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes('tech-rules/tech-rules-summary.md'));
  assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes('estimate/estimate-report.md'));
  assert.ok(!ARTEFATOS_DE_CONTRATO.spec.includes('tech-rules-summary.md'));
  assert.ok(!ARTEFATOS_DE_CONTRATO.spec.includes('estimate-report.md'));
});

test('o produtor chegou com outro nome: hld.md entra, arquitetura-solucao.md nunca existe (Decisao 33)', () => {
  // O item 1 da seção 8 pedia que a `spec-tech-rules` emitisse `arquitetura-solucao.md` — a face
  // para stakeholder e wiki que a Decisão 6 diz faltar. O upstream resolveu a MESMA necessidade
  // com skill separada: `spec-hld` (Fase 6.6) emite `hld.md`, com C4 em Mermaid e ADRs, validado
  // por `tools/check-hld.py`. Adotamos o nome do kit; batizar o artefato dele com nome nosso
  // criaria dois donos de um nome.
  //
  // AS DUAS PONTAS, e a segunda não é enfeite: um teste que só exigisse `hld.md` passaria também
  // se alguém acrescentasse os DOIS, e aí o contrato prometeria um artefato que nenhuma skill
  // escreve — falso positivo permanente no relatório do `wiki.mjs`.
  assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes('hld.md'), 'hld.md não entrou no contrato');
  assert.ok(!ARTEFATOS_DE_CONTRATO.spec.includes('arquitetura-solucao.md'), 'o nome morto voltou');
});

test('o data-model.md entra no contrato e o data-model.json continua fora — a mesma simetria do hld.md', () => {
  // A razão que exclui um é a que admite o outro: o `data-model.json` é contrato TÉCNICO,
  // consumido pela `spec-api-contracts` e pela `spec-tasks` (ver `cadeia.mjs`); o `data-model.md`
  // é o MESMO modelo, na forma que o cliente lê — gerado do JSON pelo passo O da `spec-data-model`,
  // nunca editado à mão (Tarefa 10). Um é a autoridade, o outro é a leitura dela.
  //
  // AS DUAS PONTAS, pelo mesmo motivo do teste do hld.md acima: sem a segunda, acrescentar os
  // DOIS passaria — e a wiki do cliente ganharia um JSON de contrato técnico junto da leitura dele.
  assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes('data-model.md'), 'data-model.md não entrou no contrato');
  assert.ok(!ARTEFATOS_DE_CONTRATO.spec.includes('data-model.json'), 'o JSON entrou na narrativa de cliente');
});

test('o kernel de seguranca esta no contrato, e o relatorio de auditoria NAO', () => {
  // O `plano-de-seguranca.md` e o kernel TO-BE que a `revisao-de-seguranca` escreve e que o
  // `cadeia.mjs` cobra de `spec-security-review` — entregavel. O `security-review.md` e relatorio
  // de auditoria (findings por story), interno. Uma lista de INCLUSAO carrega o que se escolheu.
  assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes('plano-de-seguranca.md'));
  assert.ok(!ARTEFATOS_DE_CONTRATO.spec.includes('security-review.md'));
});

test('as quatro condicionais de legado entram juntas no contrato', () => {
  // Sao COND_LEGACY no check-outputs.py do kit e sao entregaveis do mesmo pacote; tres delas
  // estavam na lista e a quarta faltava por omissao. Se uma sair, as outras tres tambem devem.
  for (const a of ['legacy.md', 'architecture.md', 'legacy-analysis.md', 'threat-model.md']) {
    assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes(a), `falta ${a}`);
  }
});

test('capa.md e report/product-discovery-kit.html entram — o mais explícito entregável de cliente', () => {
  // "Opcional" em check-outputs.py NÃO é razão de exclusão desta lista: modules.md, test-plan.md,
  // design-system.md, prototype.md e gaps-document.md já estão aqui sendo OPTIONAL na mesma
  // tabela. A lista distingue por "é entregável escolhido para o cliente", nunca por
  // obrigatoriedade — e o product-discovery-kit.html é o caso mais explícito: dois lugares deste
  // harness (explore.md:162, plan.md:22) já o chamam de entregável do Plan, e é a "entrega
  // compilada para o cliente". `capa.md` é o insumo dele — sem capa não há kit compilado. Ambos
  // moram em "spec-report (opcional)", check-outputs.py:140-141, forma exata (capa.md na raiz,
  // product-discovery-kit.html em report/).
  assert.ok(ARTEFATOS_DE_CONTRATO.spec.includes('capa.md'), 'falta capa.md');
  assert.ok(
    ARTEFATOS_DE_CONTRATO.spec.includes('report/product-discovery-kit.html'),
    'falta report/product-discovery-kit.html',
  );
});

test('LISTA_DE_ACRESCIMOS fica fora de outputs/spec/', () => {
  // Ali a escrita atravessa a fronteira Explore→Plan; uma lista de publicação não é compromisso
  // com o Plan.
  assert.equal(LISTA_DE_ACRESCIMOS, 'outputs/wiki-inclusao.md');
  assert.ok(!LISTA_DE_ACRESCIMOS.startsWith(RAIZ_SPEC));
});
