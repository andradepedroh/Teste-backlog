import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarExplore, formatarRelatorio, avaliar } from './gramatica.mjs';
import { DOCS_EXPLORE } from './kit.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATES = join(RAIZ, '.claude', 'templates');

const BOM = [
  '# HLD Funcional — Portal de Pagamentos',
  '',
  '> **Fase:** Explore · **Versão:** 0.1 · **Status:** preliminar',
  '',
  '## Changelog',
  '| Versão | Data | Mudança |',
  '|---|---|---|',
  '| 0.1 | 2026-08-25 | versão inicial |',
  '',
  '## 1. Visão geral',
  '',
  'O portal centraliza pagamentos.',
  '',
  '## 2. Módulos',
  '',
  '| Código | Módulo |',
  '|---|---|',
  '| MOD-PAGAMENTOS | Pagamentos |',
].join('\n');

test('documento bem formado não gera erro nem aviso', () => {
  const r = validarExplore('outputs/explore/hld-funcional.md', BOM);
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.avisos, []);
});

test('falta de changelog é erro', () => {
  const semChangelog = BOM.replace('## Changelog', '## Outra coisa');
  const r = validarExplore('outputs/explore/hld-funcional.md', semChangelog);
  assert.ok(r.erros.some((e) => /changelog/i.test(e)));
});

test('falta de versão no cabeçalho é erro', () => {
  const semVersao = BOM.replace('**Versão:** 0.1 · ', '');
  const r = validarExplore('outputs/explore/hld-funcional.md', semVersao);
  assert.ok(r.erros.some((e) => /vers/i.test(e)));
});

// ————— Rodada J: as VARIANTES de cabeçalho que uma pessoa de verdade escreve —————
//
// Medido na rodada I: 4 de 5 variantes de versão e 4 de 5 de changelog eram ACUSADAS, e nenhuma
// das quatro mutações de forma (`M03`–`M06`) morria — a rigidez não tinha sido decidida por
// ninguém, ela só era. As duas listas abaixo são a decisão, e o par com os testes de AUSÊNCIA
// logo em seguida é o que impede a resposta preguiçosa ("aceite qualquer coisa").
//
// O contrato mora em `.claude/rules/harness/explore.md`, seção "Cabeçalho de todo documento do
// Explore" — ver o teste `o contrato de cabeçalho está ESCRITO na rule`, no fim deste arquivo.

const VARIANTES_DE_VERSAO = [
  ['a forma do template', '> **Fase:** Explore · **Versão:** 0.1 · **Status:** preliminar'],
  ['dois-pontos fora do negrito', '> **Fase:** Explore · **Versão**: 0.1'],
  ['ênfase simples', '> **Fase:** Explore · *Versão:* 0.1'],
  ['sem ênfase nenhuma', '> Fase: Explore · Versão: 0.1'],
  ['espaço antes dos dois-pontos', '> **Fase:** Explore · **Versão :** 0.1'],
  ['sem acento', '> **Versao:** 0.1'],
  ['versão de duas casas', '> **Versão:** 1.12'],
];

for (const [nome, linha] of VARIANTES_DE_VERSAO) {
  test(`cabeçalho — versão aceita: ${nome}`, () => {
    const texto = ['# HLD Funcional — Portal', '', linha, '', '## Changelog', '', '| 0.1 | 2026-08-27 | inicial |', '', '## 1. Visão', '', 'Texto.'].join('\n');
    const r = validarExplore('outputs/explore/hld-funcional.md', texto);
    assert.deepEqual(r.erros.filter((e) => /vers/i.test(e)), [], JSON.stringify(r.erros));
  });
}

const VARIANTES_DE_CHANGELOG = [
  ['a forma do template', '## Changelog'],
  ['numerado, como o template numera as outras seções', '## 0. Changelog'],
  ['nível três', '### Changelog'],
  ['caixa alta', '## CHANGELOG'],
  ['com sufixo', '## Changelog do documento'],
  ['nível quatro', '#### Changelog'],
];

for (const [nome, titulo] of VARIANTES_DE_CHANGELOG) {
  test(`cabeçalho — changelog aceito: ${nome}`, () => {
    const texto = ['# HLD Funcional — Portal', '', '> **Versão:** 0.1', '', titulo, '', '| 0.1 | 2026-08-27 | inicial |', '', '## 1. Visão', '', 'Texto.'].join('\n');
    const r = validarExplore('outputs/explore/hld-funcional.md', texto);
    assert.deepEqual(r.erros.filter((e) => /changelog/i.test(e)), [], JSON.stringify(r.erros));
  });
}

// ————— O outro lado do par: a AUSÊNCIA REAL continua recusada —————
//
// Sem estes três, "aceitar qualquer coisa" passaria em todos os doze testes acima. Afrouxar a
// forma não é o mesmo que abandonar o contrato.

test('cabeçalho — ausência REAL de versão continua sendo erro', () => {
  const texto = ['# HLD Funcional — Portal', '', '> **Fase:** Explore · **Status:** preliminar', '', '## Changelog', '', '| 0.1 | 2026-08-27 | inicial |'].join('\n');
  const r = validarExplore('outputs/explore/hld-funcional.md', texto);
  assert.ok(r.erros.some((e) => /vers/i.test(e)), JSON.stringify(r.erros));
});

test('cabeçalho — a COLUNA `Versão` da tabela de changelog não conta como versão declarada', () => {
  // A tabela do changelog tem sempre uma coluna chamada `Versão`. Se ela satisfizesse a checagem,
  // a exigência de versão viraria letra morta em todo documento que copiou o template — e o
  // afrouxamento da rodada J teria trocado um falso positivo por um falso negativo.
  const texto = ['# HLD Funcional — Portal', '', '## Changelog', '| Versão | Data | Mudança |', '|---|---|---|', '| 0.1 | 2026-08-27 | inicial |'].join('\n');
  const r = validarExplore('outputs/explore/hld-funcional.md', texto);
  assert.ok(r.erros.some((e) => /vers/i.test(e)), JSON.stringify(r.erros));
});

test('cabeçalho — ausência REAL de changelog continua sendo erro', () => {
  const texto = ['# HLD Funcional — Portal', '', '> **Versão:** 0.1', '', '## 1. Visão', '', 'Texto.'].join('\n');
  const r = validarExplore('outputs/explore/hld-funcional.md', texto);
  assert.ok(r.erros.some((e) => /changelog/i.test(e)), JSON.stringify(r.erros));
});

test('cabeçalho — `Versão:` sem valor nenhum na linha não conta', () => {
  // `[ \t]*\S` e não `\s*\S`: com `\s`, a primeira linha não vazia ABAIXO de um `**Versão:**` solto
  // satisfaria a checagem. O valor tem que estar ao lado da palavra.
  const texto = ['# HLD Funcional — Portal', '', '> **Versão:**', '', '0.1', '', '## Changelog', '', '| 0.1 | x | y |'].join('\n');
  const r = validarExplore('outputs/explore/hld-funcional.md', texto);
  assert.ok(r.erros.some((e) => /vers/i.test(e)), JSON.stringify(r.erros));
});

test('ID mal formado é erro e a mensagem mostra o certo', () => {
  const r = validarExplore('outputs/explore/especificacao-funcional.md', BOM + '\n\n| RF-7 | algo |\n');
  assert.ok(r.erros.some((e) => /RF-7/.test(e)));
  assert.ok(r.erros.some((e) => /RF-007|três dígitos/i.test(e)));
});

test('ID bem formado não gera erro', () => {
  const r = validarExplore('outputs/explore/especificacao-funcional.md', BOM + '\n\n| RF-007 | algo |\n');
  assert.deepEqual(r.erros.filter((e) => /RF-/.test(e)), []);
});

// ——————————— G11: as QUATRO famílias, não só a `RF` ———————————
//
// A mutação "só a família `RF` é conferida" sobrevivia à suíte do plano, porque os únicos casos de
// ID mal formado eram de `RF`. `FAMILIAS_EXPLORE` tem quatro entradas e o laço de `conferirIds`
// tem que percorrer as quatro — cada teste abaixo morre se a família dele sair do laço.
//
// Os casos respeitam a REDE ESTREITADA de `acharMalFormados` (rodada H): só é acusado o trecho
// cuja cauda tem dígito e não tem outro hífen. Por isso `MOD-pag` (minúscula sem dígito) NÃO
// aparece aqui — ele deixou de ser acusado por decisão registrada, e um teste esperando a acusação
// ficaria vermelho por erro de quem o escreveu, não do módulo.

test('ID mal formado da família MOD é erro', () => {
  const r = validarExplore('outputs/explore/hld-funcional.md', BOM + '\n\nO módulo MOD-pag1 está minúsculo.\n');
  assert.ok(r.erros.some((e) => /MOD-pag1/.test(e)), JSON.stringify(r.erros));
  assert.ok(r.erros.some((e) => /família `MOD`/.test(e)), JSON.stringify(r.erros));
});

test('ID mal formado da família RN é erro', () => {
  const r = validarExplore('outputs/explore/especificacao-funcional.md', BOM + '\n\n| RN-7 | regra |\n');
  assert.ok(r.erros.some((e) => /RN-7/.test(e)), JSON.stringify(r.erros));
  assert.ok(r.erros.some((e) => /família `RN`/.test(e)), JSON.stringify(r.erros));
});

test('ID mal formado da família GAP é erro', () => {
  const r = validarExplore('outputs/explore/gaps.md', BOM + '\n\n| GAP-00777 | questão |\n');
  assert.ok(r.erros.some((e) => /GAP-00777/.test(e)), JSON.stringify(r.erros));
  assert.ok(r.erros.some((e) => /família `GAP`/.test(e)), JSON.stringify(r.erros));
});

// ————— MJ-4: cada família tem a SUA frase, e a da `MOD` não ensina numeração —————
//
// Era um texto só, colado nas quatro: "numeração com três dígitos (`MOD-007`), código de módulo em
// maiúsculas, dígitos e hífen". `MOD` NÃO é numerada — e `MOD-007` passa na regex, então a
// mensagem de correção convidava o consultor a escrever um código de módulo sem sentido nenhum, e
// a ferramenta aplaudiria. Simetricamente, "código de módulo em maiúsculas" é ruído em `RF`, `RN`
// e `GAP`. Num verificador informativo a mensagem é o produto inteiro: dizer o errado é pior que
// calar, porque o consultor obedece.
//
// A mutação `M49` (a mensagem de todas as famílias usa o padrão da `RF`) sobrevivia à suíte. Os
// dois testes abaixo a matam pelos dois lados: o que a mensagem da `MOD` tem que dizer, e o que
// ela não pode dizer.

test('MJ-4 — a mensagem da família MOD ensina CÓDIGO, não numeração', () => {
  const r = validarExplore('outputs/explore/hld-funcional.md', BOM + '\n\nO módulo MOD-pag1 está minúsculo.\n');
  const msg = r.erros.find((e) => /MOD-pag1/.test(e));
  assert.ok(msg, JSON.stringify(r.erros));
  assert.match(msg, /MOD-PAGAMENTOS/, 'a mensagem tem que mostrar um código de módulo de verdade');
  assert.match(msg, /não é numerada/i);
  assert.doesNotMatch(msg, /MOD-007/, '`MOD-007` PASSA na regex e é um código sem sentido — a mensagem não pode ensiná-lo');
  assert.doesNotMatch(msg, /três dígitos/i, 'numeração é das outras três famílias, não da MOD');
});

test('MJ-4 — as mensagens das famílias numeradas ensinam numeração e não falam em código de módulo', () => {
  const casos = [
    ['RF', 'outputs/explore/especificacao-funcional.md', '| RF-7 | algo |', /RF-007/],
    ['RN', 'outputs/explore/especificacao-funcional.md', '| RN-7 | regra |', /RN-007/],
    ['GAP', 'outputs/explore/gaps.md', '| GAP-00777 | questão |', /GAP-007/],
  ];
  for (const [familia, arquivo, linha, exemplo] of casos) {
    const r = validarExplore(arquivo, BOM + '\n\n' + linha + '\n');
    const msg = r.erros.find((e) => new RegExp('família `' + familia + '`').test(e));
    assert.ok(msg, `${familia}: ${JSON.stringify(r.erros)}`);
    assert.match(msg, exemplo, familia);
    assert.match(msg, /três dígitos/i, familia);
    assert.doesNotMatch(msg, /código do módulo|código de módulo/i, `${familia} não tem código de módulo — é ruído na mensagem`);
  }
});

test('F-xxx em outputs/explore é erro — vocabulário do kit', () => {
  const r = validarExplore('outputs/explore/hld-funcional.md', BOM + '\n\nAncorado em F-001.\n');
  assert.ok(r.erros.some((e) => /F-001/.test(e)));
  assert.ok(r.erros.some((e) => /spec-ingest|kit|proibid/i.test(e)));
});

test('token de preenchimento sobrevivente é erro', () => {
  const r = validarExplore('outputs/explore/hld-funcional.md', BOM.replace('Portal de Pagamentos', '<produto>'));
  assert.ok(r.erros.some((e) => /<produto>/.test(e)));
});

test('seção sem conteúdo é erro, com a mensagem GENÉRICA', () => {
  const vazia = BOM + '\n\n## 3. Integrações\n\n## 4. Fim\n\nTexto.\n';
  const r = validarExplore('outputs/explore/hld-funcional.md', vazia);
  const secao = r.erros.find((e) => /3\. Integrações/.test(e));
  assert.ok(secao, JSON.stringify(r.erros));
  assert.match(secao, /tem título e nenhum conteúdo/);
});

// ——————————— G8: a cerca, distinguida DE VERDADE ———————————
//
// O teste do plano afirmava `/cerca|```/i` sobre o erro. Isso não distingue nada: a mensagem
// GENÉRICA interpola `CERCA_NAO_FECHADA`, cujo texto é `[defeito] cerca de código (```) aberta e
// não fechada até o fim do documento` — ou seja, ela também contém "cerca", e o regex casava com
// os dois ramos. Removendo o ramo próprio, a suíte do plano ficava verde.
//
// Aqui o teste afirma a ausência da frase da mensagem genérica e a presença da frase que só o
// ramo próprio escreve. O par com o teste acima (`mensagem GENÉRICA`) prende os DOIS lados.
test('cerca de código não fechada tem erro PRÓPRIO, não a mensagem de seção vazia', () => {
  const r = validarExplore('outputs/explore/especificacao-tecnica.md', BOM + '\n\n## 3. Diagrama\n\n```mermaid\nflowchart TD\n');
  const cerca = r.erros.find((e) => /cerca/i.test(e));
  assert.ok(cerca, JSON.stringify(r.erros));
  assert.match(cerca, /esconde as seções seguintes/);
  assert.doesNotMatch(cerca, /tem título e nenhum conteúdo/);
});

test('arquivo fora de outputs/explore não é validado por este validador', () => {
  const r = validarExplore('outputs/spec/benchmark.md', '<produto> sem nada');
  assert.deepEqual(r.erros, []);
});

test('arquivo do Explore que não é documento do contrato não é validado', () => {
  const r = validarExplore('outputs/explore/rascunho.md', '<produto>');
  assert.deepEqual(r.erros, []);
});

test('formatarRelatorio devolve null quando não há nada a dizer', () => {
  assert.equal(formatarRelatorio({ arquivo: 'x.md', erros: [], avisos: [] }), null);
});

test('formatarRelatorio nomeia o arquivo e lista os erros', () => {
  const t = formatarRelatorio({ arquivo: 'outputs/explore/gaps.md', erros: ['erro um', 'erro dois'], avisos: [] });
  assert.match(t, /gaps\.md/);
  assert.match(t, /erro um/);
  assert.match(t, /erro dois/);
});

test('avaliar devolve null para payload sem file_path', () => {
  assert.equal(avaliar(null), null);
});

// ——————————————— a CASCA de `avaliar`, com `io` de mentira ———————————————
//
// Três mutações sobreviviam à suíte do plano por aqui: `avaliar` virar no-op completo, `avaliar`
// deixar de enxergar `notebook_path`, e a casca engolir qualquer erro (inclusive `EACCES`). As
// três morrem abaixo, sem depender dos testes de wiring do `posttooluse.test.mjs` — `avaliar` é
// injetável de propósito, então testá-la direto é o barato.
//
// `io` traz TRÊS operações, e `relativizar` é uma delas porque a resposta certa depende do sistema
// de arquivos: a política mora em `relativizarComRecuo`, no kit.mjs, e é a mesma que o
// `pretooluse.mjs` usa. Se este módulo chamasse o `relativizar` textual importado, os dois
// despachantes responderiam diferente sobre o MESMO `file_path`.

const RAIZ_FALSA = '/proj';

/** Documento do Explore com quatro defeitos: sem versão, sem changelog, ID mal formado, F-xxx. */
const RUIM = [
  '# HLD Funcional',
  '',
  '## 1. Visão geral',
  '',
  'Ancorado em F-001 e na RF-7.',
].join('\n');

/**
 * `io` de mentira. `relativizar` faz o recorte por prefixo — não é a política de produção, e não
 * precisa ser: o que este dublê prova é que `avaliar` PERGUNTA ao `io`, e o teste do espião abaixo
 * prende isso explicitamente.
 */
function ioFalso({ texto = RUIM, erro = null, raiz = RAIZ_FALSA } = {}) {
  return {
    cwd: () => raiz,
    relativizar: (r, bruto) => {
      const b = String(bruto || '').replace(/\\/g, '/');
      const rr = String(r || '').replace(/\\/g, '/').replace(/\/+$/, '');
      return b.startsWith(rr + '/') ? b.slice(rr.length + 1) : null;
    },
    lerArquivo: () => {
      if (erro) throw erro;
      return texto;
    },
  };
}

function erroDe(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

test('avaliar: Write num documento do Explore mal formado devolve aviso', () => {
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/hld-funcional.md', content: RUIM } },
    ioFalso(),
  );
  assert.ok(r && r.aviso, 'esperava aviso');
  assert.match(r.aviso, /hld-funcional\.md/);
  assert.match(r.aviso, /RF-7/);
  assert.match(r.aviso, /F-001/);
  assert.match(r.aviso, /Changelog/i);
});

test('avaliar: NotebookEdit é lido por `notebook_path`, não por `file_path`', () => {
  // O campo que já deixou a fiscalização de notebook INEXISTENTE uma vez, com o gatilho declarado
  // e o teste verde. `NotebookEdit` não tem `file_path` — o schema traz `notebook_path`.
  const r = avaliar(
    { tool_name: 'NotebookEdit', tool_input: { notebook_path: '/proj/outputs/explore/gaps.md', new_source: RUIM } },
    ioFalso(),
  );
  assert.ok(r && r.aviso, 'esperava aviso — o caminho vem de `notebook_path`');
  assert.match(r.aviso, /gaps\.md/);
});

test('avaliar: escrita fora de outputs/explore não produz aviso', () => {
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/spec/benchmark.md', content: RUIM } },
    ioFalso(),
  );
  assert.equal(r, null);
});

test('avaliar: escrita fora da raiz do projeto não produz aviso', () => {
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/outro/outputs/explore/gaps.md', content: RUIM } },
    ioFalso(),
  );
  assert.equal(r, null);
});

test('avaliar: arquivo ausente (ENOENT) é null — pode ter sido removido depois da escrita', () => {
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
    ioFalso({ erro: erroDe('ENOENT') }),
  );
  assert.equal(r, null);
});

test('avaliar: componente-arquivo no meio do caminho (ENOTDIR) é null — também é ausência', () => {
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
    ioFalso({ erro: erroDe('ENOTDIR') }),
  );
  assert.equal(r, null);
});

test('avaliar: alvo que é DIRETÓRIO (EISDIR) é null — ausência, não ilegibilidade', () => {
  // Decisão da rodada J, e escrita no JSDoc de `avaliar`. Um diretório chamado `gaps.md` não é um
  // documento mal escrito: é a inexistência do documento sob outra forma — o espelho exato do
  // `ENOTDIR`, que já era tratado assim. Não há correção que o consultor faça no CONTEÚDO, então
  // não há o que avisar. E relançar teria efeito observável ZERO: viraria uma entrada em `falhas`
  // que o `main()` descarta sem log nem stderr, com o custo de uma falha fantasma no dia em que
  // alguém ligar o log. O corte é "não há documento aqui" × "há um documento e eu não o li" —
  // `EACCES`/`EBUSY`/`EPERM` continuam do lado de lá, ver o teste seguinte.
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
    ioFalso({ erro: erroDe('EISDIR') }),
  );
  assert.equal(r, null);
});

test('avaliar: EBUSY (arquivo travado pelo sync do OneDrive) RELANÇA — o arquivo ESTÁ lá', () => {
  // O par do EISDIR, e não é hipotético: o setup real deste usuário é OneDrive. Calar aqui seria
  // transformar "não consegui ler" em "está tudo certo".
  assert.throws(
    () => avaliar(
      { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
      ioFalso({ erro: erroDe('EBUSY') }),
    ),
    /EBUSY/,
  );
});

test('avaliar: arquivo ILEGÍVEL (EACCES) RELANÇA — ausência e ilegibilidade são opostos', () => {
  // O outro lado do par. Engolir tudo faz o verificador virar no-op silencioso justamente quando
  // há algo que ele não conseguiu ler; quem decide o que fazer com a falha é o despachante.
  assert.throws(
    () => avaliar(
      { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/gaps.md', content: RUIM } },
      ioFalso({ erro: erroDe('EACCES') }),
    ),
    /EACCES/,
  );
});

test('avaliar: documento do Explore bem formado devolve null — silêncio é a resposta certa', () => {
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/hld-funcional.md', content: BOM } },
    ioFalso({ texto: BOM }),
  );
  assert.equal(r, null);
});

test('avaliar resolve o caminho pelo `io`, não pelo `relativizar` textual importado', () => {
  // A trava da divergência de desenho. O `pretooluse.mjs` injeta `relativizarComRecuo` — identidade
  // primeiro, texto como recuo — e este módulo tem que fazer a mesma pergunta pela mesma porta.
  // Se alguém voltar a chamar o `relativizar` importado, o espião não é chamado e isto fica
  // vermelho.
  const chamadas = [];
  const io = ioFalso();
  const espiao = {
    ...io,
    relativizar: (r, bruto) => { chamadas.push([r, bruto]); return io.relativizar(r, bruto); },
  };
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/hld-funcional.md', content: RUIM } },
    espiao,
  );
  assert.equal(chamadas.length, 1);
  assert.deepEqual(chamadas[0], [RAIZ_FALSA, '/proj/outputs/explore/hld-funcional.md']);
  assert.ok(r && r.aviso);
});

// ————— O guarda `check-explore` de `avaliar`, que é SÓ de desempenho e ninguém prendia —————
//
// Removê-lo é semanticamente INVISÍVEL: `validarExplore` também devolve vazio para arquivo sem
// validador, então a resposta de `avaliar` não muda em nenhum caso, e a suíte inteira segue verde.
// O que muda é que o hook passa a ler do disco TODO arquivo escrito em qualquer lugar do projeto,
// em toda tool call de escrita. Medido na rodada I sobre um `screens-manifest.json` de 1,9 MB:
// p50 de 0,70 ms → 11,88 ms, 17×.
//
// Um guarda que não muda o valor devolvido não é prendível por asserção sobre o valor devolvido.
// Prende-se contando as leituras — que é a coisa que ele de fato evita.

/** `io` que conta as chamadas a `lerArquivo`. */
function ioContado(opcoes = {}) {
  const base = ioFalso(opcoes);
  const leituras = [];
  return { io: { ...base, lerArquivo: (abs, enc) => { leituras.push(abs); return base.lerArquivo(abs, enc); } }, leituras };
}

test('avaliar NÃO lê o disco para arquivo fora de outputs/explore — o guarda vem ANTES da leitura', () => {
  const { io, leituras } = ioContado();
  for (const caminho of [
    '/proj/outputs/spec/screens-manifest.json',
    '/proj/src/components/Tabela.tsx',
    '/proj/outputs/explore/rascunho.md', // no Explore, mas não é documento do contrato
    '/proj/README.md',
  ]) {
    assert.equal(avaliar({ tool_name: 'Write', tool_input: { file_path: caminho } }, io), null, caminho);
  }
  assert.deepEqual(leituras, [], 'nenhuma destas escritas justifica abrir o arquivo');
});

test('avaliar lê o disco UMA vez para documento do contrato — o guarda não fechou demais', () => {
  const { io, leituras } = ioContado();
  const r = avaliar(
    { tool_name: 'Write', tool_input: { file_path: '/proj/outputs/explore/hld-funcional.md' } },
    io,
  );
  assert.ok(r && r.aviso);
  assert.deepEqual(leituras, ['/proj/outputs/explore/hld-funcional.md']);
});

// ————— O cross-test contra os templates REAIS que o harness distribui —————
//
// `kit.test.mjs:1091`, `tokens.test.mjs` e `workspace.test.mjs:166` já fazem isto; a `gramatica`
// era o único contrato novo sem ele, e aplicá-lo teria pegado a família 2 (o `gaps.md` que nascia
// com `Versão 0.1` solto, quando os outros quatro escrevem `**Versão:** 0.1`) sozinho.
//
// A `explore.md` manda copiar estes arquivos para `outputs/explore/` e preencher. A ÚNICA coisa
// que o verificador pode dizer sobre eles em branco é "troque os placeholders" — que é ele
// funcionando. Cabeçalho, ID, vocabulário e seção vazia têm que estar em silêncio, porque um
// aviso ali é sobre um defeito do template, não do trabalho do consultor.

test('CROSS-TEST — os cinco documentos do Explore, EM BRANCO, só são acusados de token não trocado', () => {
  for (const doc of DOCS_EXPLORE) {
    const texto = readFileSync(join(TEMPLATES, doc.caminho), 'utf8');
    const r = validarExplore('outputs/explore/' + doc.caminho, texto);
    const forcaDeTrabalho = r.erros.filter((e) => !/^Token de preenchimento não trocado/.test(e));
    assert.deepEqual(forcaDeTrabalho, [], `${doc.caminho}: só token de preenchimento é acusação legítima aqui`);
    assert.equal(r.erros.length, 1, `${doc.caminho}: o aviso de token TEM que sair — ${JSON.stringify(r.erros)}`);
  }
});

test('CROSS-TEST — os cinco templates declaram versão e changelog da forma que o verificador exige', () => {
  // A afirmação positiva do teste acima, escrita por dentro: não basta "não acusa", tem que ser
  // "não acusa porque está certo". Foi assim que o `gaps.md` divergiu dos outros quatro sem
  // ninguém notar — ele escrevia `Versão 0.1` solto, sem dois-pontos.
  for (const doc of DOCS_EXPLORE) {
    const texto = readFileSync(join(TEMPLATES, doc.caminho), 'utf8');
    assert.match(texto, /\*\*Vers(ã|a)o:\*\*\s*\d/, `${doc.caminho} tem que trazer **Versão:** na linha de cabeçalho`);
    assert.match(texto, /^##\s+Changelog\s*$/m, `${doc.caminho} tem que trazer a seção ## Changelog`);
  }
});

// ————— O contrato de cabeçalho tem DONO, e o dono é a rule —————

test('o contrato de cabeçalho está ESCRITO na rule, e não só nas duas regex deste módulo', () => {
  // O cabeçalho do `gramatica.mjs` afirmava: "Este módulo NÃO tem tabela própria de gramática. Ele
  // pergunta ao kit.mjs e ao tokens.mjs, que são as autoridades." Para o contrato de CABEÇALHO
  // isso era falso — `grep` por `Changelog` em `.claude/rules`, `docs` e `CLAUDE.md` não devolvia
  // nenhuma regra que exigisse versão ou changelog, e as duas regex eram a única definição no
  // repositório inteiro. Comentário que deixou de dizer a verdade é a categoria que este projeto
  // já pagou caro cinco vezes.
  //
  // Este teste é o que impede a rule de sumir de novo. Ele não confere a redação — confere que a
  // seção existe e que ela diz as duas exigências e o que NÃO é aceito.
  const rule = readFileSync(join(RAIZ, '.claude', 'rules', 'harness', 'explore.md'), 'utf8');
  assert.match(rule, /^##\s+Cabeçalho de todo documento do Explore\s*$/m);
  assert.match(rule, /\*\*Vers(ã|a)o:\*\*/);
  assert.match(rule, /Changelog/);
  assert.match(rule, /ausência/i, 'a rule tem que dizer o que continua sendo recusado, não só o que é aceito');
});
