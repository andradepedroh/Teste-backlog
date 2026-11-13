import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRE_REQUISITOS, RAZAO_EXTRA, avaliarSkill, avaliar } from './cadeia.mjs';
import { RAIZ_SPEC, RAIZ_EXPLORE, montarKickoff, chave } from './kit.mjs';
import { criarRegistro, despachar, IO_REAL } from './pretooluse.mjs';
import { join } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

// ————————————————————————— o núcleo puro —————————————————————————
//
// Os quinze testes desta seção são os do plano, verbatim. Eles matam as nove mutações de núcleo,
// de exceção do Explore, de mensagem e de tabela — e NENHUMA das quatro da casca, que é por que a
// seção seguinte existe.

test('a tabela cobre a cadeia técnica do Plan e do Deliver', () => {
  for (const s of ['spec-product', 'spec-tech-rules', 'spec-data-model', 'spec-api-contracts',
                   'spec-tasks', 'spec-security-review', 'spec-estimate', 'spec-scaffold', 'spec-implement']) {
    assert.ok(PRE_REQUISITOS.has(s), s);
  }
});

test('toda entrada declara exige não vazio e validador', () => {
  for (const [nome, d] of PRE_REQUISITOS) {
    assert.ok(Array.isArray(d.exige) && d.exige.length, nome);
    assert.equal(typeof d.validador, 'string', nome);
    assert.ok(d.validador.length > 0, nome);
  }
});

test('skill fora da tabela passa — isto é dependência, não lista de permissão', () => {
  assert.equal(avaliarSkill('spec-ingest', new Set()), null);
  assert.equal(avaliarSkill('qualquer-coisa', new Set()), null);
  assert.equal(avaliarSkill('', new Set()), null);
  assert.equal(avaliarSkill(null, new Set()), null);
});

test('skill com pré-requisitos satisfeitos passa', () => {
  assert.equal(avaliarSkill('spec-api-contracts', new Set(['data-model.json'])), null);
});

test('skill sem pré-requisito é negada, listando o que falta', () => {
  const r = avaliarSkill('spec-api-contracts', new Set());
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /data-model\.json/);
});

test('a mensagem cita o código do validador de origem', () => {
  const r = avaliarSkill('spec-api-contracts', new Set());
  assert.match(r.motivo, new RegExp(PRE_REQUISITOS.get('spec-api-contracts').validador));
});

test('só o que falta aparece — o que já existe não polui a mensagem', () => {
  const r = avaliarSkill('spec-tasks', new Set(['data-model.json', 'api-contracts.yaml']));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /test-plan\.md/);
  assert.ok(!/data-model\.json/.test(r.motivo));
});

test('spec-tasks explica POR QUE o test-plan vem antes', () => {
  const r = avaliarSkill('spec-tasks', new Set(['data-model.json', 'api-contracts.yaml']));
  // A razão é a verdadeira: o test-plan alimenta os cenários de aceite das tasks. A versão antiga
  // prometia uma «Story de UAT», que a própria spec-tasks proíbe (`NO_UAT_BACKLOG`, FATAL).
  assert.match(r.motivo, /cenários de aceite/);
  assert.ok(!/Story de UAT/i.test(r.motivo), 'a razão voltou a prometer uma Story de UAT');
});

test('spec-security-review consome o kernel, não deriva sozinha', () => {
  const r = avaliarSkill('spec-security-review', new Set(['tasks.json']));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /plano-de-seguranca\.md/);
  assert.match(r.motivo, /consome|kernel/i);
});

test('a mensagem diz o que fazer, não só o que falta', () => {
  const r = avaliarSkill('spec-data-model', new Set());
  assert.match(r.motivo, /Produza|Rode|invoque/i);
});

test('spec-prototype no Explore usa o de-para, não os artefatos do kit', () => {
  const contexto = {
    fase: 'explore',
    presentesExplore: new Set(['hld-funcional.md', 'especificacao-funcional.md']),
  };
  assert.equal(avaliarSkill('spec-prototype', new Set(), contexto), null);
});

test('spec-prototype no Explore é negada sem os documentos do de-para', () => {
  const r = avaliarSkill('spec-prototype', new Set(), { fase: 'explore', presentesExplore: new Set() });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /hld-funcional\.md/);
  assert.match(r.motivo, /especificacao-funcional\.md/);
});

test('spec-prototype no Plan cobra os artefatos do kit', () => {
  const r = avaliarSkill('spec-prototype', new Set(), { fase: 'plan' });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /modules\.md/);
});

test('sem contexto, vale a semântica do Plan', () => {
  const r = avaliarSkill('spec-prototype', new Set());
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /modules\.md/);
});

test('a spec-hld entra na cadeia exigindo as rules tecnicas, e NINGUEM exige o hld.md', () => {
  // Decisão 34. A `spec-hld` (Fase 6.6) roda entre a `spec-tech-rules` (6.5) e a `spec-data-model`
  // (7a), e o princípio já usado no resto da tabela é "o que a seguinte exige é o que a anterior
  // produziu" — por isso ela exige `tech-rules/tech-rules-summary.md`, e não os outros insumos que
  // o `SKILL.md` da spec-hld também lista como obrigatórios (`modules.md`, `context-map.md`), que
  // já são cobrados transitivamente por quem já exige delas antes na cadeia.
  assert.deepEqual(PRE_REQUISITOS.get('spec-hld').exige, ['tech-rules/tech-rules-summary.md']);

  // A OUTRA PONTA, e é o coração da Decisão 34: o `check-outputs.py` do kit lista `hld.md` como
  // OPTIONAL, e a `spec-data-model` nova trata a ausência dele como WARNING (`HLD_MISSING`), não
  // bloqueio. Se alguma entrada da nossa tabela o exigir, este harness fica MAIS ESTRITO que o kit
  // num verificador BLOQUEANTE — falso positivo sobre trabalho legítimo. A ordem 6.6 → 7a vive na
  // rule do Plan, que orienta; o gate não a cobra.
  for (const [skill, cfg] of PRE_REQUISITOS) {
    assert.ok(!(cfg.exige ?? []).includes('hld.md'),
      `${skill} exige hld.md, e o kit o declara OPTIONAL`);
  }
});

test('RAZAO_EXTRA só existe para skill cuja dependência não é óbvia', () => {
  for (const nome of RAZAO_EXTRA.keys()) assert.ok(PRE_REQUISITOS.has(nome), nome);
});

// ————————————————— a forma da tabela, contra a forma do `inventariar` —————————————————
//
// O `inventariar` devolve caminhos RELATIVOS à raiz que recebe, com barra normal e sem prefixo.
// Uma entrada escrita com `outputs/spec/` na frente, com contrabarra, ou absoluta, nunca casaria
// — e o efeito é falso positivo PERMANENTE numa trava bloqueante, sem nenhum teste vermelho.

test('nenhuma exigência repete a raiz, usa contrabarra ou vem absoluta', () => {
  for (const [nome, d] of PRE_REQUISITOS) {
    for (const c of [...d.exige, ...(d.exigeNoExplore || [])]) {
      assert.ok(!c.includes('\\'), `${nome}: ${c} tem contrabarra`);
      assert.ok(!c.startsWith('/') && !/^[A-Za-z]:/.test(c), `${nome}: ${c} é absoluto`);
      assert.ok(!c.startsWith(`${RAIZ_SPEC}/`), `${nome}: ${c} repete a raiz`);
      assert.ok(!c.startsWith(`${RAIZ_EXPLORE}/`), `${nome}: ${c} repete a raiz`);
    }
  }
});

test('só a spec-prototype tem o segundo conjunto de pré-requisito', () => {
  const comExplore = [...PRE_REQUISITOS].filter(([, d]) => d.exigeNoExplore).map(([n]) => n);
  assert.deepEqual(comExplore, ['spec-prototype']);
});

// ———————————————————— o CONTEÚDO da tabela, e não só a forma dela ————————————————————
//
// SIM, ISTO É UM CHANGE-DETECTOR, E AQUI ISSO É O CERTO. Escrito de propósito, e a razão é o que
// esta tabela é: **dado de um bloqueante**. Cada linha é uma negação que um consultor vai receber
// na cara, e mudança silenciosa nela é mudança de POLÍTICA sem revisão.
//
// Não é opinião: a rodada L mediu oito mutações no conteúdo da tabela que sobrevivem à suíte
// inteira — trocar `tech-rules/tech-rules-summary.md` por `tech-rules-summary.md`, trocar
// `plano-de-seguranca.md` por `docs/plan/…`, APAGAR as entradas `spec-legacy` e `spec-benchmark`
// inteiras, tirar `discovery-document.md` da `spec-product`. O teste que existia media a FORMA do
// nome (barra, prefixo, absoluto) e nunca o NOME; o que listava as skills cobria nove das doze.
//
// Quem mudar a tabela de propósito atualiza este teste no MESMO commit — e é exatamente isso que
// se quer: o diff mostra a política mudando, com nome e sobrenome, em vez de a mudança passar
// escondida numa linha de dado. O custo é uma edição a mais por mudança deliberada; o benefício é
// nenhuma mudança acidental.
//
// A ORDEM de `exige` faz parte do que se fixa: o JSDoc afirma que ela é "a ordem em que o usuário
// vai resolver", e é a ordem em que os nomes aparecem na mensagem. Inverter a lista era a mutação
// M3 da rodada L, e sobrevivia.

test('M-3 — a tabela inteira, por deepEqual: 12 skills, nomes, ordem, validador', () => {
  const esperada = [
    ['spec-legacy', {
      exige: ['context-map.md'],
      validador: 'V-LEG-01',
    }],
    ['spec-benchmark', {
      exige: ['context-map.md', 'discovery-document.md'],
      validador: 'V-BEN-01',
    }],
    ['spec-product', {
      exige: ['context-map.md', 'discovery-document.md'],
      validador: 'V-PRD-01',
    }],
    ['spec-prototype', {
      exige: [
        'modules.md',
        'requirements/requirements.md',
        'business-rules.md',
        'product-requirements/product-requirements.md',
      ],
      exigeNoExplore: ['hld-funcional.md', 'especificacao-funcional.md'],
      validador: 'V-PRD-02',
    }],
    ['spec-tech-rules', {
      exige: ['requirements/requirements.md', 'product-requirements/product-requirements.md'],
      validador: 'CADEIA-TEC-00',
    }],
    ['spec-hld', {
      exige: ['tech-rules/tech-rules-summary.md'],
      validador: 'CADEIA-TEC-05',
    }],
    ['spec-data-model', {
      exige: ['tech-rules/tech-rules-summary.md'],
      validador: 'CADEIA-TEC-01',
    }],
    ['spec-api-contracts', {
      exige: ['data-model.json'],
      validador: 'CADEIA-TEC-02',
    }],
    ['spec-tasks', {
      exige: ['data-model.json', 'api-contracts.yaml', 'test-plan.md'],
      validador: 'CADEIA-TEC-03',
    }],
    ['spec-security-review', {
      exige: ['tasks.json', 'plano-de-seguranca.md'],
      validador: 'CADEIA-SEC-01',
    }],
    ['spec-estimate', {
      exige: ['tasks.json'],
      validador: 'CADEIA-TEC-04',
    }],
    ['spec-scaffold', {
      exige: ['tech-rules/tech-rules-summary.md', 'data-model.json', 'api-contracts.yaml'],
      validador: 'CADEIA-DEV-01',
    }],
    ['spec-implement', {
      exige: ['tasks.json'],
      validador: 'CADEIA-DEV-02',
    }],
  ];
  assert.deepEqual([...PRE_REQUISITOS], esperada);
});

test('M-3 — a tabela não ganha nem perde skill sem alguém dizer o número', () => {
  // Redundante com o `deepEqual` de propósito: quando ele falhar, esta linha diz em uma frase se o
  // que mudou foi o TAMANHO da política (entrada nova, entrada apagada) ou só o conteúdo de uma.
  assert.equal(PRE_REQUISITOS.size, 13);
});

// ————————————————————— o TEXTO da mensagem, que é o produto desta trava —————————————————————
//
// Três dos treze sobreviventes da rodada L estavam aqui, e o M-2 (Major) também: o que a negação
// DIZ não tinha asserção nenhuma. Num bloqueante o texto não é enfeite — é a única coisa que o
// consultor recebe, e uma mensagem que promete mecanismo inexistente custa mais que nenhuma.

test('M-2 — a mensagem NÃO promete prosseguimento depois de registrar no sync-log', () => {
  // O texto antigo: "Se a ausência for deliberada — escopo reduzido, artefato herdado de outro
  // fornecedor — registre a decisão no `sync-log.md` ANTES DE SEGUIR". Não havia "seguir":
  // registrar não muda esta decisão, e o consultor que obedecia era negado igual. Mesma classe do
  // defeito que o `33552a5` consertou na Task 5.
  const r = avaliarSkill('spec-data-model', new Set());
  assert.ok(!/antes de seguir/i.test(r.motivo), 'a promessa de prosseguimento voltou à mensagem');
  assert.match(r.motivo, /não muda esta decisão/i);
});

test('M-2 — a mensagem diz ONDE pôr o artefato herdado, com o caminho', () => {
  // A metade que TEM saída real, e a saída é concreta: o arquivo existe, só não foi esta cadeia
  // que o produziu. Esta trava pergunta uma coisa só — o artefato existe? —, então copiá-lo para
  // a raiz onde ela olha resolve de verdade.
  const r = avaliarSkill('spec-data-model', new Set());
  assert.match(r.motivo, /herdado/i);
  assert.match(r.motivo, new RegExp(`\`${RAIZ_SPEC}/\``));
  assert.match(r.motivo, /sync-log\.md/);
});

test('M-2 — e admite que escopo reduzido não tem saída, em vez de insinuar que tem', () => {
  const r = avaliarSkill('spec-data-model', new Set());
  assert.match(r.motivo, /escopo reduzido/i);
  assert.match(r.motivo, /não há saída|não tem como rodar/i);
});

test('m-1 — em multi-repo a mensagem nomeia o repo de docs; em mono-repo, não', () => {
  // O consultor está na raiz do WORKSPACE; o artefato mora em `<cwd>/<repo-docs>/outputs/spec/`.
  // Imprimir `outputs/spec/` cru manda olhar num caminho que não existe a partir de onde ele está.
  const multi = avaliarSkill('spec-data-model', new Set(), { repoDocs: 'docs-do-projeto' });
  assert.match(multi.motivo, new RegExp(`\`docs-do-projeto/${RAIZ_SPEC}/\``));

  const mono = avaliarSkill('spec-data-model', new Set());
  assert.ok(!/docs-do-projeto/.test(mono.motivo));
  assert.match(mono.motivo, new RegExp(`\`${RAIZ_SPEC}/\``));
});

test('m-5/M13 — a mensagem manda procurar em UMA raiz, e nomeia a certa', () => {
  // A MENSAGEM É A INSTRUÇÃO QUE O CONSULTOR SEGUE. Ela nomeava duas raízes enquanto a segunda
  // existia; depois da vendorização, mandar procurar em `task-generator/outputs/` seria falso
  // positivo em bloqueante disfarçado de ajuda — o consultor iria olhar num lugar que não existe
  // e concluir que a trava está quebrada.
  const r = avaliarSkill('spec-api-contracts', new Set());
  assert.match(r.motivo, new RegExp(`\`${RAIZ_SPEC}/\``));
  assert.ok(!r.motivo.includes('task-generator'), 'a mensagem manda procurar num lugar que não existe mais');
  assert.ok(!/ ou \`/.test(r.motivo), 'a mensagem ainda oferece duas raízes');
});

test('m-5/M22 — no Explore a mensagem aponta para outputs/explore, e só para ela', () => {
  // No Explore a `spec-prototype` roda sobre o de-para da `explore.md`, cujos documentos moram em
  // `outputs/explore/`. Mandar olhar em `outputs/spec/` ali é mandar olhar no lugar errado.
  const r = avaliarSkill('spec-prototype', new Set(), { fase: 'explore', presentesExplore: new Set() });
  assert.match(r.motivo, new RegExp(`\`${RAIZ_EXPLORE}/\``));
  assert.ok(!r.motivo.includes(`\`${RAIZ_SPEC}/\``), 'a mensagem do Explore não pode citar a raiz do Plan');
  assert.ok(!r.motivo.includes('task-generator'), 'nem a raiz descontinuada, que já nem existe');
});

test('m-5/M29 — a RAZAO_EXTRA da spec-prototype chega à mensagem', () => {
  const r = avaliarSkill('spec-prototype', new Set());
  assert.match(r.motivo, /modo Geração/i);
});

test('m-5/M3 — a mensagem lista o que falta na ORDEM da tabela, do fundamental ao derivado', () => {
  // O JSDoc de `PRE_REQUISITOS` afirma que a ordem de `exige` "é a ordem em que o usuário vai
  // resolver". O `deepEqual` da seção acima fixa a ordem no DADO; este fixa que ela sobrevive até
  // o texto. Sem os dois, `.reverse()` no ponto de uso continua verde — medido: com só o
  // `deepEqual`, essa mutação sobrevivia.
  const r = avaliarSkill('spec-tasks', new Set());
  const posicoes = ['data-model.json', 'api-contracts.yaml', 'test-plan.md']
    .map((c) => r.motivo.indexOf(c));
  assert.ok(posicoes.every((p) => p >= 0), r.motivo);
  assert.deepEqual(posicoes, [...posicoes].sort((a, b) => a - b), `fora de ordem:\n${r.motivo}`);
});

test('m-2 — o nome do artefato é comparado por `chave`, como o resto do harness', () => {
  // O FS do Windows, onde este harness roda, é insensível a caixa: `outputs/spec/Data-Model.json`
  // EXISTE e o SO o encontra. Com `Set.has` cru a trava dizia que faltava `data-model.json` —
  // falso positivo em cima de trabalho legítimo.
  assert.equal(avaliarSkill('spec-api-contracts', new Set(['Data-Model.json'])), null);
  assert.equal(avaliarSkill('spec-api-contracts', new Set(['DATA-MODEL.JSON'])), null);
  assert.equal(avaliarSkill('spec-data-model', new Set(['Tech-Rules/Tech-Rules-Summary.md'])), null);
  // E não afrouxa: nome DIFERENTE continua faltando.
  assert.equal(avaliarSkill('spec-api-contracts', new Set(['data-model.yaml'])).acao, 'deny');
});

test('u-1 — o NOME da skill é comparado por `chave`, do mesmo jeito que o artefato', () => {
  // MESMA RAZÃO DO TESTE ACIMA, outro lado da mesma função. NÃO é buraco observado em produção:
  // as 26 skills reais têm `name:` minúsculo, e 68 invocações medidas nos transcritos não trazem
  // uma maiúscula. A justificativa é CONSISTÊNCIA — quatro lugares desta camada perguntam "que
  // skill é esta?", e o `sync-log.mjs` já responde por `chave` desde a Task 7. Noção duplicada
  // com respostas divergentes é a classe de defeito que este projeto mais pagou.
  const nu = avaliarSkill('spec-data-model', new Set());
  const caixa = avaliarSkill('Spec-Data-Model', new Set());
  assert.ok(caixa, 'a mesma skill em outra caixa tem que ser fiscalizada');
  assert.equal(caixa.acao, nu.acao);
  assert.match(caixa.motivo, /CADEIA-TEC-01/);
  assert.equal(avaliarSkill('SPEC-API-CONTRACTS', new Set()).acao, 'deny');
  // E o resto da avaliação segue valendo: com o artefato no lugar, a caixa não inventa bloqueio.
  assert.equal(avaliarSkill('SPEC-API-CONTRACTS', new Set(['data-model.json'])), null);

  // A OUTRA PONTA, sem a qual "insensível a caixa" e "casa tudo" passam pelo mesmo teste: skill
  // fora da tabela continua passando em QUALQUER caixa.
  assert.equal(avaliarSkill('spec-report', new Set()), null);
  assert.equal(avaliarSkill('Spec-Report', new Set()), null);
  assert.equal(avaliarSkill('SPEC-REPORT', new Set()), null);
});

test('u-1 — a RAZAO_EXTRA também é achada em outra caixa, e não some pelo caminho', () => {
  // A `RAZAO_EXTRA` é a TERCEIRA tabela indexada por nome de skill dentro deste arquivo, e ela
  // não está na `PRE_REQUISITOS`: consertar só as duas primeiras faria a skill ser bloqueada
  // CORRETAMENTE mas sem a explicação de POR QUÊ — o pedaço da mensagem que existe para o
  // consultor não redescobrir a razão na próxima vez. Falha silenciosa, e nenhum teste vermelho.
  assert.match(avaliarSkill('Spec-Prototype', new Set()).motivo, /modo Geração/i);
  assert.match(avaliarSkill('SPEC-TASKS', new Set()).motivo, /test-plan/i);
  assert.match(avaliarSkill('Spec-Security-Review', new Set()).motivo, /plano-geral/i);
});

test('u-1 — as chaves das duas tabelas já estão em forma de `chave`', () => {
  // O invariante que a comparação por `chave` CRIA: as tabelas viraram o único lado não
  // normalizado. Uma entrada escrita com maiúscula não casaria NUNCA, e o efeito seria uma skill
  // deixar de ser fiscalizada — ou perder a sua RAZAO_EXTRA — em silêncio, com a suíte verde.
  for (const k of PRE_REQUISITOS.keys()) assert.equal(k, chave(k), k);
  for (const k of RAZAO_EXTRA.keys()) assert.equal(k, chave(k), k);
});

test('u-1 — a mensagem ecoa o nome CRU, não a chave de comparação', () => {
  // `chave()` na COMPARAÇÃO; `nome` cru na MENSAGEM — é a forma do `sob()` do kit, que compara
  // por `chave` e devolve o resto com a caixa original. Pôr o `toLowerCase` dentro do
  // `nomeDaSkill` resolveria os três sites de uma vez e mataria isto: o consultor leria de volta
  // um nome que ele não digitou, e mensagem irreconhecível é mensagem inacionável. Este é o único
  // teste que separa as duas implementações.
  const r = avaliarSkill('Spec-Data-Model', new Set());
  assert.match(r.motivo, /`Spec-Data-Model`/);
  assert.ok(!r.motivo.includes('spec-data-model'), `a caixa original sumiu da mensagem:\n${r.motivo}`);
});

// ————————————————————————— a casca de I/O —————————————————————————
//
// Nenhum dos quinze acima chega aqui: `avaliar` virando no-op COMPLETO — a trava desligada em
// produção — deixava os quinze verdes. Toda a seção roda sobre um `io` injetado, mais dois
// testes contra disco de verdade onde a resposta certa depende do sistema de arquivos.

const RAIZ = '/proj';

function normalizar(p) {
  return String(p).split('\\').join('/').replace(/\/+$/, '');
}

function erroIO(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

/**
 * Um `lerDiretorio` de mentira sobre uma lista de caminhos relativos a `RAIZ`.
 *
 * Diretório sem nenhum arquivo abaixo levanta `ENOENT` — que é o que o `node:fs` faz e o que o
 * `inventariar` traduz para conjunto vazio. `opcoes.ilegiveis` levanta `EACCES` no caminho pedido,
 * para exercitar o outro lado da restrição 1: presente e ilegível RELANÇA.
 */
function lerDiretorioDe(caminhos, opcoes = {}) {
  const ilegiveis = new Set((opcoes.ilegiveis || []).map((c) => normalizar(`${RAIZ}/${c}`)));
  return (dir) => {
    const d = normalizar(dir);
    if (ilegiveis.has(d) || (opcoes.cwdIlegivel && d === RAIZ)) throw erroIO('EACCES');
    const prefixo = `${d}/`;
    const filhos = new Map();
    for (const f of caminhos) {
      const abs = `${RAIZ}/${f}`;
      if (abs === d) throw erroIO('ENOTDIR');
      if (!abs.startsWith(prefixo)) continue;
      const resto = abs.slice(prefixo.length);
      const i = resto.indexOf('/');
      if (i === -1) filhos.set(resto, false);
      else filhos.set(resto.slice(0, i), true);
    }
    if (!filhos.size) throw erroIO('ENOENT');
    return [...filhos].map(([name, ehDir]) => ({
      name,
      isDirectory: () => ehDir,
      isFile: () => !ehDir,
    }));
  };
}

function ioFalso(caminhos = [], opcoes = {}) {
  const chamadas = [];
  const ler = lerDiretorioDe(caminhos, opcoes);
  return {
    chamadas,
    cwd: () => { chamadas.push(['cwd']); return RAIZ; },
    lerDiretorio: (dir, ops) => { chamadas.push(['lerDiretorio', normalizar(dir)]); return ler(dir, ops); },
  };
}

const invocar = (skill) => ({ tool_name: 'Skill', tool_input: { skill } });

test('casca — payload que não é Skill devolve null e NÃO consulta o io', () => {
  const io = ioFalso([`${RAIZ_SPEC}/data-model.json`]);
  assert.equal(avaliar({ tool_name: 'Write', tool_input: { file_path: 'x.md' } }, io), null);
  assert.equal(avaliar({}, io), null);
  assert.equal(avaliar(null, io), null);
  assert.deepEqual(io.chamadas, []);
});

test('casca — skill fora da tabela devolve null e NÃO consulta o io', () => {
  const io = ioFalso([`${RAIZ_SPEC}/data-model.json`]);
  assert.equal(avaliar(invocar('spec-ingest'), io), null);
  assert.equal(avaliar(invocar(''), io), null);
  assert.deepEqual(io.chamadas, []);
});

test('casca — skill da tabela com os artefatos presentes passa', () => {
  const io = ioFalso([`${RAIZ_SPEC}/data-model.json`]);
  assert.equal(avaliar(invocar('spec-api-contracts'), io), null);
  assert.ok(io.chamadas.some(([op]) => op === 'lerDiretorio'), 'o io tem que ter sido consultado');
});

test('casca — skill da tabela sem os artefatos é negada, citando o que falta', () => {
  const io = ioFalso([`${RAIZ_SPEC}/sync-log.md`]);
  const r = avaliar(invocar('spec-api-contracts'), io);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /data-model\.json/);
  assert.match(r.motivo, /CADEIA-TEC-02/);
});

test('casca — o prefixo de plugin é cortado; sem isso as doze entradas passariam batidas', () => {
  // Skill servida por plugin é invocada como `plugin:skill`, e o payload traz o nome PREFIXADO —
  // `superpowers:` é prefixo vivo nesta máquina. Comparar a string inteira contra a tabela nunca
  // casa — a Task 6 inteira ficaria decorativa com os quinze do plano verdes.
  const semArtefato = ioFalso([`${RAIZ_SPEC}/sync-log.md`]);
  const r = avaliar(invocar('algum-plugin:spec-api-contracts'), semArtefato);
  assert.ok(r, 'a skill de plugin tem que ser reconhecida');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /data-model\.json/);

  const comArtefato = ioFalso([`${RAIZ_SPEC}/data-model.json`]);
  assert.equal(avaliar(invocar('algum-plugin:spec-api-contracts'), comArtefato), null);
});

test('casca u-1 — a pré-filtragem por nome também é por `chave`, e combina com o prefixo', () => {
  // A pré-filtragem de `avaliar` é um SEGUNDO site da mesma pergunta: ela decide, antes de todo
  // I/O, se a skill é fiscalizada. Sensível a caixa ali, `avaliarSkill` nem chega a ser chamado e
  // o conserto do núcleo fica decorativo em produção.
  const semArtefato = ioFalso([`${RAIZ_SPEC}/sync-log.md`]);
  const r = avaliar(invocar('Spec-Api-Contracts'), semArtefato);
  assert.ok(r, 'a skill em outra caixa tem que atravessar a pré-filtragem');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /data-model\.json/);
  // A mensagem que sai da casca ecoa o nome como o consultor o invocou.
  assert.match(r.motivo, /`Spec-Api-Contracts`/);

  // AS DUAS TRANSFORMAÇÕES JUNTAS, não só cada uma: corte de prefixo de plugin E caixa.
  const comPrefixo = avaliar(invocar('algum-plugin:Spec-Api-Contracts'), ioFalso([`${RAIZ_SPEC}/sync-log.md`]));
  assert.ok(comPrefixo, 'prefixo de plugin + caixa tem que casar');
  assert.equal(comPrefixo.acao, 'deny');
  assert.match(comPrefixo.motivo, /`Spec-Api-Contracts`/);

  // E não vira lista de permissão invertida: skill fora da tabela continua passando sem I/O.
  const intocado = ioFalso([`${RAIZ_SPEC}/sync-log.md`]);
  assert.equal(avaliar(invocar('Spec-Report'), intocado), null);
  assert.deepEqual(intocado.chamadas, []);
});

test('casca — o payload pode trazer o nome em `name` em vez de `skill`', () => {
  const io = ioFalso([`${RAIZ_SPEC}/sync-log.md`]);
  const r = avaliar({ tool_name: 'Skill', tool_input: { name: 'spec-data-model' } }, io);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /tech-rules-summary\.md/);
});

test('casca — a raiz do Plan é uma: artefato só conta em outputs/spec/', () => {
  // A DUAS PONTAS, e é o eixo desta tarefa. Havia uma segunda raiz, `task-generator/outputs/`,
  // aceita por compatibilidade enquanto uma máquina pudesse servir `spec-*` de versão ANTERIOR à
  // descontinuação do layout pelo kit. Com o kit vendorizado em `.claude/skills/` (Decisão 7) esse
  // regime deixou de existir, e o gatilho de remoção estava declarado no `CLAUDE.md`.
  //
  // PONTA 1: o layout antigo deixa de satisfazer o pré-requisito.
  const noAntigo = ioFalso(['task-generator/outputs/data-model.json']);
  const r = avaliar(invocar('spec-api-contracts'), noAntigo);
  assert.equal(r.acao, 'deny', 'o layout descontinuado ainda satisfaz o pré-requisito');
  assert.match(r.motivo, /data-model\.json/);

  // PONTA 2, e é ela que dá sentido à primeira: a raiz certa SATISFAZ. Sem esta asserção, apagar a
  // checagem de pré-requisito inteira — a trava desligada — passaria neste teste também.
  const noNovo = ioFalso([`${RAIZ_SPEC}/data-model.json`]);
  assert.equal(avaliar(invocar('spec-api-contracts'), noNovo), null);
});

test('casca — a fase detectada de verdade muda o veredito da spec-prototype', () => {
  // Mesmos documentos de Explore nos dois casos. O que muda é UM arquivo em `outputs/spec/`:
  // `sync-log.md` está na whitelist do Explore e não caracteriza Plan; `modules.md` não está.
  //
  // Este teste também mata o defeito de convenção: `detectarFase` exige os caminhos COM o
  // prefixo `outputs/spec/`, e alimentá-lo com o retorno cru do `inventariar` faz QUALQUER
  // arquivo em `outputs/spec/` — o `sync-log.md` do kickoff, inclusive — virar fase Plan.
  const docs = [
    `${RAIZ_EXPLORE}/hld-funcional.md`,
    `${RAIZ_EXPLORE}/especificacao-funcional.md`,
  ];

  const noExplore = ioFalso([...docs, `${RAIZ_SPEC}/sync-log.md`]);
  assert.equal(avaliar(invocar('spec-prototype'), noExplore), null);

  const noPlan = ioFalso([...docs, `${RAIZ_SPEC}/sync-log.md`, `${RAIZ_SPEC}/modules.md`]);
  const r = avaliar(invocar('spec-prototype'), noPlan);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /business-rules\.md/);
});

test('casca — projeto vazio: ausência devolve vazio e a avaliação segue até a negação', () => {
  const io = ioFalso([]);
  const r = avaliar(invocar('spec-implement'), io);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /tasks\.json/);
});

test('casca — presente e ILEGÍVEL relança; um bloqueante que não olhou não libera', () => {
  const io = ioFalso([`${RAIZ_SPEC}/data-model.json`], { ilegiveis: [RAIZ_SPEC] });
  assert.throws(() => avaliar(invocar('spec-api-contracts'), io), /EACCES/);
});

test('casca — cwd ilegível relança em vez de decidir sobre um projeto que não conseguiu ler', () => {
  const io = ioFalso([`${RAIZ_SPEC}/data-model.json`], { cwdIlegivel: true });
  assert.throws(() => avaliar(invocar('spec-api-contracts'), io), /cwd-ilegivel/);
});

// ————————————————— contra disco de verdade: a raiz dos artefatos —————————————————
//
// `descobrirWorkspace` decide por `existsSync`, que não é injetável. Estes dois exercitam o
// caminho de produção: num workspace multi-repo os artefatos moram em
// `<cwd>/<repo-docs>/outputs/…`, e tomar a `cwd` como raiz nega um Plan COMPLETO E CORRETO.

function workspaceTemporario({ multiRepo, artefatos }) {
  const raiz = realpathSync(mkdtempSync(join(tmpdir(), 'cadeia-')));
  const base = multiRepo ? join(raiz, 'docs-do-projeto') : raiz;
  mkdirSync(join(base, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(base, 'outputs', 'spec'), { recursive: true });
  for (const a of artefatos) {
    const alvo = join(base, 'outputs', 'spec', a);
    mkdirSync(join(alvo, '..'), { recursive: true });
    writeFileSync(alvo, 'conteúdo\n');
  }
  return raiz;
}

const ioDeDisco = (raiz) => ({ cwd: () => raiz, lerDiretorio: readdirSync });

test('disco — mono-repo: os artefatos da cwd valem', () => {
  const raiz = workspaceTemporario({ multiRepo: false, artefatos: ['data-model.json'] });
  try {
    assert.equal(avaliar(invocar('spec-api-contracts'), ioDeDisco(raiz)), null);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('disco — multi-repo: a raiz dos artefatos NÃO é a cwd', () => {
  const raiz = workspaceTemporario({ multiRepo: true, artefatos: ['data-model.json'] });
  try {
    assert.equal(avaliar(invocar('spec-api-contracts'), ioDeDisco(raiz)), null);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }

  const vazio = workspaceTemporario({ multiRepo: true, artefatos: [] });
  try {
    const r = avaliar(invocar('spec-api-contracts'), ioDeDisco(vazio));
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /data-model\.json/);
  } finally {
    rmSync(vazio, { recursive: true, force: true });
  }
});

test('disco — m-1: em multi-repo a negação NOMEIA o repo de docs onde o artefato tem que ir', () => {
  // A metade do m-1 que o `avaliarSkill` sozinho não mede: quem sabe que o workspace é multi-repo
  // e como a subpasta se chama é a casca, pelo `descobrirWorkspace`. Sem o wiring, a mensagem sai
  // com o prefixo vazio e manda o consultor olhar em `outputs/spec/` a partir de um diretório que
  // não tem essa pasta.
  const vazio = workspaceTemporario({ multiRepo: true, artefatos: [] });
  try {
    const r = avaliar(invocar('spec-api-contracts'), ioDeDisco(vazio));
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, new RegExp(`\`docs-do-projeto/${RAIZ_SPEC}/\``));
  } finally {
    rmSync(vazio, { recursive: true, force: true });
  }

  // E o mono-repo continua sem prefixo nenhum — o consultor JÁ está na raiz dos artefatos.
  const mono = workspaceTemporario({ multiRepo: false, artefatos: [] });
  try {
    const r = avaliar(invocar('spec-api-contracts'), ioDeDisco(mono));
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, new RegExp(`\`${RAIZ_SPEC}/\``));
  } finally {
    rmSync(mono, { recursive: true, force: true });
  }
});

// ——————————— o laço do C-1, pelo REGISTRO de produção e contra disco real ———————————
//
// A revisão da rodada L reprovou a Task 6 por um falso positivo que FECHAVA EM LAÇO no caminho
// obrigatório do Explore, disparado por o consultor OBEDECER à instrução que o gate irmão imprime.
// Os três testes abaixo são o laço, dirigidos pela casca de produção inteira — `criarRegistro` com o
// `IO_REAL` e só a `cwd` injetada —, e não pelo `io` de mentira: o defeito não estava no `avaliar`
// nem na tabela, estava na conversa entre `detectarFase` e as duas listas, e um `io` falso mediria
// o mesmo lado que já estava certo.
//
// O caminho, medido: `spec-prototype` é OBRIGATÓRIA no Explore (`explore.md`, passo 6). O item 5
// do gate do fecho manda escrever `outputs/spec/revisao.json`. Antes do conserto esse arquivo não
// estava na `WHITELIST_EXPLORE`, então `detectarFase` respondia `plan`, a `spec-prototype` passava
// a cobrar os quatro artefatos do kit, e quem os produz — `spec-product` — era negada pelo fecho
// porque o Explore não fechou; e o Explore não fecha sem o `revisao.json` que causou a negação.
// Três negações, nenhuma delas mencionando fase, e a única saída era apagar o arquivo que o outro
// gate exige.

function projetoNoExplore() {
  const raiz = realpathSync(mkdtempSync(join(tmpdir(), 'cadeia-laco-')));
  const escrever = (rel, texto) => {
    const alvo = join(raiz, rel);
    mkdirSync(join(alvo, '..'), { recursive: true });
    writeFileSync(alvo, texto);
  };
  for (const d of ['hld-funcional.md', 'especificacao-funcional.md', 'especificacao-tecnica.md',
                   'modelo-de-dados.md', 'gaps.md']) {
    escrever(`${RAIZ_EXPLORE}/${d}`, 'conteúdo preenchido\n');
  }
  // O KICKOFF NO FORMATO DO KIT (`task-pipeline.md` §4). O `cadeia` não o lê — só olha se o
  // arquivo existe —, mas um fixture que escreve um formato que o harness não conhece mais é a
  // segunda cópia divergente que a Task 7 existiu para apagar.
  escrever(`${RAIZ_SPEC}/sync-log.md`,
    montarKickoff({ legado: 'nao', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt' }) + '\n');
  return { raiz, escrever };
}

// DUAS FORMAS, e as duas atravessam o registro. Skill servida por plugin é invocada como
// `plugin:skill` e chega PREFIXADA — `superpowers:` e `anthropic-skills:` são prefixos vivos nesta
// máquina, e enquanto qualquer `spec-*` puder vir de plugin o corte de prefixo tem que funcionar.
// Depois da vendorização a forma correta é a NUA. Medir só uma delas deixa a outra sem teste: a
// nua entra AO LADO da prefixada, e os casos abaixo escolhem.
const despacharSkill = (raiz, nome) => despachar(
  { tool_name: 'Skill', tool_input: { skill: nome } },
  criarRegistro({ ...IO_REAL, cwd: () => raiz }),
);

const invocarPeloRegistro = (raiz, skill) => despacharSkill(raiz, `algum-plugin:${skill}`);
const invocarNuPeloRegistro = (raiz, skill) => despacharSkill(raiz, skill);

test('C-1 — spec-prototype no Explore com o revisao.json que o GATE EXIGE escrito: allow', () => {
  const { raiz, escrever } = projetoNoExplore();
  try {
    escrever(`${RAIZ_SPEC}/revisao.json`, '{"ok":true}');
    const r = invocarPeloRegistro(raiz, 'spec-prototype');
    assert.equal(r.acao, 'allow', r.motivo || '');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('C-1 — spec-prototype no Explore com a ISENÇÃO que a negação oferece escrita: allow', () => {
  const { raiz, escrever } = projetoNoExplore();
  try {
    escrever(`${RAIZ_SPEC}/revisao.json`, '{"ok":true}');
    escrever('outputs/spec/auditorias/_isencoes/isencao-acme.md',
      'gate:isencao\nmotivo: escopo reduzido\n');
    const r = invocarPeloRegistro(raiz, 'spec-prototype');
    assert.equal(r.acao, 'allow', r.motivo || '');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('C-1 — o conserto NÃO afrouxa: com artefato de Plan escrito, a fase vira plan e a cobrança volta', () => {
  // O contrapeso dos dois acima. Sem ele, "allow" poderia ser a trava desligada: basta um artefato
  // fora da whitelist em `outputs/spec/` para o projeto sair do Explore, e aí a `spec-prototype`
  // volta a cobrar os quatro artefatos do kit — que é o comportamento certo no Plan.
  const { raiz, escrever } = projetoNoExplore();
  try {
    escrever(`${RAIZ_SPEC}/revisao.json`, '{"ok":true}');
    escrever(`${RAIZ_SPEC}/modules.md`, '# Módulos\n');
    const r = invocarPeloRegistro(raiz, 'spec-prototype');
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /V-PRD-02/);
    assert.match(r.motivo, /business-rules\.md/);

    // A MESMA cobrança pela forma NUA, que é a que a vendorização produz. As duas pontas: se o
    // corte de prefixo sumisse, a linha acima ficaria vermelha; se a tabela parasse de casar o
    // nome nu, esta ficaria. Nenhuma das duas sozinha prova que as duas formas chegam.
    const nu = invocarNuPeloRegistro(raiz, 'spec-prototype');
    assert.equal(nu.acao, 'deny');
    assert.match(nu.motivo, /V-PRD-02/);
    assert.match(nu.motivo, /business-rules\.md/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
