import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOKENS_POR_TEMPLATE, TOKENS_UNIVERSAIS, tokensSobreviventes, secoesVazias, CERCA_NAO_FECHADA,
  mapearCercas,
} from './tokens.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATES = join(RAIZ, '.claude', 'templates');

test('TOKENS_POR_TEMPLATE cobre os seis templates do Explore', () => {
  assert.deepEqual(
    [...TOKENS_POR_TEMPLATE.keys()].sort(),
    [
      'especificacao-funcional.md', 'especificacao-tecnica.md', 'gaps.md',
      'hld-funcional.md', 'modelo-de-dados.md', 'workspace.md',
    ],
  );
});

// ————— Rodada J: a data placeholder é `<data>`, e `AAAA-MM-DD` deixou de ser token —————
//
// INVERSÃO DELIBERADA. Este teste afirmava `TOKENS_UNIVERSAIS.includes('AAAA-MM-DD')` e ficou
// vermelho de propósito. A razão não é estética:
//
// `AAAA-MM-DD` é ao mesmo tempo um placeholder de template E a maneira correta de documentar um
// formato de data. Um `modelo-de-dados.md` bem preenchido escreve `| vencimento | data |
// AAAA-MM-DD |` porque é literalmente a função daquele documento — e a rodada I mediu o
// verificador acusando esse documento correto, com a mensagem "escreva por que não se aplica"
// sobre texto perfeitamente preenchido. É a única das quatro famílias de falso positivo que
// SOBREVIVE AO PREENCHIMENTO: não há nada que o consultor escreva que a cale.
//
// `<data>` alinha com a convenção de todo o resto do repositório (`<produto>`, `<nnn>`,
// `<artefato>`), mantém a captura do changelog em branco, e elimina a família inteira sem exceção
// nem heurística. O template foi trocado junto — os dois literais são um par.
test('TOKENS_UNIVERSAIS tem a data placeholder, e ela é `<data>`', () => {
  assert.ok(TOKENS_UNIVERSAIS.includes('<data>'));
  assert.ok(
    !TOKENS_UNIVERSAIS.includes('AAAA-MM-DD'),
    'AAAA-MM-DD é conteúdo legítimo de modelo-de-dados.md — não pode voltar a ser token',
  );
});

test('`AAAA-MM-DD` num documento preenchido NÃO é mais acusado — o falso positivo que sobrevivia ao preenchimento', () => {
  // O caso exato da rodada I: a tabela de atributos de um `modelo-de-dados.md` bem escrito.
  const texto = [
    '# Modelo de Dados — Portal',
    '',
    '| Entidade | Atributo | Tipo | Formato |',
    '|---|---|---|---|',
    '| Cobranca | vencimento | data | AAAA-MM-DD |',
  ].join('\n');
  assert.deepEqual(tokensSobreviventes('outputs/explore/modelo-de-dados.md', texto), []);
});

test('todo token catalogado existe de fato no template — nenhum token fantasma', () => {
  for (const [arquivo, tokens] of TOKENS_POR_TEMPLATE) {
    const texto = readFileSync(join(TEMPLATES, arquivo), 'utf8');
    for (const t of tokens) {
      assert.ok(texto.includes(t), `token ${t} catalogado mas ausente de ${arquivo}`);
    }
  }
});

test('todo token UNIVERSAL existe de fato nos seis templates', () => {
  // O par do teste acima, para a outra tabela. `TOKENS_UNIVERSAIS` diz "todo template embarca
  // isto"; se um template deixar de embarcar, a afirmação é falsa e o token universal vira letra
  // morta. Foi o que quase aconteceu na rodada J: trocar `AAAA-MM-DD` por `<data>` na constante
  // sem trocar nos seis templates deixaria a captura do changelog em branco valendo zero.
  for (const arquivo of TOKENS_POR_TEMPLATE.keys()) {
    const texto = readFileSync(join(TEMPLATES, arquivo), 'utf8');
    for (const t of TOKENS_UNIVERSAIS) {
      assert.ok(texto.includes(t), `token universal ${t} ausente de ${arquivo}`);
    }
  }
});

// INVERSÃO DELIBERADA (rodada J). Este teste ficou vermelho fazendo exatamente o trabalho dele: o
// `<data>` novo dos templates casa com o `<[^<>\n]{1,60}>` da varredura e não estava em
// `TOKENS_POR_TEMPLATE`. A correção NÃO é repetir `<data>` nas seis listas — ele é universal, e
// duplicá-lo seis vezes é a tabela que diverge no primeiro que alguém esquecer. A correção é a
// varredura passar a olhar as DUAS tabelas, que juntas são "o catálogo". O que o teste protege
// continua igual: token novo no template sem entrada no catálogo fica vermelho.
//
// A VARREDURA É SÓ DOS SEIS TEMPLATES DO EXPLORE (`TOKENS_POR_TEMPLATE.keys()`), não de
// `readdirSync(TEMPLATES)` — Task 9 mediu a diferença: `em-andamento.md` e `isencao.md` (Deliver)
// vivem no MESMO diretório `.claude/templates/`, mas não participam deste catálogo — quem os
// preenche é o consultor seguindo a prosa da skill/rule, e `tokensSobreviventes` (o verificador
// que de fato roda, no fecho Explore→Plan) só é chamado com caminhos `outputs/explore/*`. Varrer
// o diretório inteiro acusava `<nnn>` de `em-andamento.md` como "token esquecido" — falso
// positivo sobre um arquivo que este catálogo nunca teve a intenção de cobrir. `deepEqual` das
// seis chaves, no teste acima, já é quem garante que a tabela não perde nenhum dos seis.
test('todo token do template está catalogado — nenhum token esquecido', () => {
  for (const arquivo of TOKENS_POR_TEMPLATE.keys()) {
    const texto = readFileSync(join(TEMPLATES, arquivo), 'utf8');
    const semComentarios = texto.replace(/<!--[\s\S]*?-->/g, '');
    const achados = new Set(semComentarios.match(/<[^<>\n]{1,60}>/g) || []);
    const catalogados = new Set([...(TOKENS_POR_TEMPLATE.get(arquivo) || []), ...TOKENS_UNIVERSAIS]);
    for (const a of achados) {
      assert.ok(catalogados.has(a), `token ${a} presente em ${arquivo} mas não catalogado`);
    }
  }
});

test('tokensSobreviventes acha o token que ficou', () => {
  const texto = '# HLD Funcional — <produto>\n\nTexto preenchido.\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/hld-funcional.md', texto), ['<produto>']);
});

test('tokensSobreviventes devolve vazio em documento preenchido', () => {
  const texto = '# HLD Funcional — Portal de Pagamentos\n\nTexto preenchido.\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/hld-funcional.md', texto), []);
});

test('tokensSobreviventes ignora token dentro de comentário HTML', () => {
  const texto = '# HLD Funcional — Portal\n<!-- exemplo: <produto> vira o nome real -->\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/hld-funcional.md', texto), []);
});

test('tokensSobreviventes NÃO ignora token dentro de bloco de código', () => {
  const texto = '# Modelo de Dados — Portal\n\n```mermaid\nerDiagram\n  <ENTIDADE_A> ||--o{ X : "y"\n```\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/modelo-de-dados.md', texto), ['<ENTIDADE_A>']);
});

test('tokensSobreviventes não confunde generics nem comparação', () => {
  const texto = '# Especificação Técnica — Portal\n\nUsa `List<String>` e latência <10 ms.\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/especificacao-tecnica.md', texto), []);
});

test('tokensSobreviventes normaliza barra invertida do Windows', () => {
  const texto = '# HLD — <produto>\n';
  assert.deepEqual(tokensSobreviventes('outputs\\explore\\hld-funcional.md', texto), ['<produto>']);
});

test('tokensSobreviventes devolve vazio para arquivo sem template conhecido', () => {
  assert.deepEqual(tokensSobreviventes('outputs/spec/benchmark.md', 'qualquer <coisa>'), []);
});

test('tokensSobreviventes não repete token que aparece duas vezes', () => {
  const texto = '# <produto>\n\nO <produto> faz coisas.\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/hld-funcional.md', texto), ['<produto>']);
});

// INVERSÃO DELIBERADA (rodada J). Afirmava o literal antigo. O que o teste PROVA continua sendo o
// mesmo e é o que importa: a linha de changelog do template, não preenchida, é pescada — o token
// universal não depende de estar na lista específica do arquivo. Só o literal mudou, e o teste
// acima (`AAAA-MM-DD num documento preenchido`) é o par que prende o outro lado da troca.
test('tokensSobreviventes pega a data placeholder universal', () => {
  const texto = '# HLD — Portal\n\n| 0.1 | <data> | inicial |\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/hld-funcional.md', texto), ['<data>']);
});

// ————— Rodada J: a divergência de CAIXA entre `kit.mjs` e `tokens.mjs` —————

test('tokensSobreviventes reconhece o arquivo com a caixa trocada, como o `validadorPara` do kit', () => {
  // Falso NEGATIVO silencioso, medido na rodada I. Para `outputs/explore/Gaps.md` o kit responde
  // `check-explore` (ele compara por `chave()`, que baixa a caixa), então a `gramatica` ENTRA no
  // arquivo e confere cabeçalho, IDs e vocabulário — e este módulo devolvia `[]`, porque comparava
  // o nome cru. Resultado: o único documento em que o consultor mais precisa do aviso de
  // preenchimento era justamente o que não o recebia, sem sinal nenhum de que a checagem não
  // rodou. Dois módulos da Fundação discordando sobre "que documento é este" é a patologia que o
  // Step 0 existiu para eliminar.
  const texto = '# GAPs — Portal\n\n| GAP-001 | <questão em aberto> | x |\n';
  assert.deepEqual(tokensSobreviventes('outputs/explore/Gaps.md', texto), ['<questão em aberto>']);
  assert.deepEqual(tokensSobreviventes('outputs/explore/GAPS.MD', texto), ['<questão em aberto>']);
});

test('secoesVazias acha seção só com comentário', () => {
  const texto = '## 1. Visão geral\n<!-- descreva aqui -->\n\n## 2. Módulos\n\nTem conteúdo.\n';
  assert.deepEqual(secoesVazias(texto), ['1. Visão geral']);
});

test('secoesVazias acha seção sem nada até o próximo título', () => {
  const texto = '## 1. Visão geral\n\n## 2. Módulos\n\nTem conteúdo.\n';
  assert.deepEqual(secoesVazias(texto), ['1. Visão geral']);
});

test('secoesVazias aceita tabela como conteúdo', () => {
  const texto = '## 1. Módulos\n\n| A | B |\n|---|---|\n| x | y |\n';
  assert.deepEqual(secoesVazias(texto), []);
});

test('secoesVazias considera o título final quando o arquivo termina vazio', () => {
  const texto = '## 1. Módulos\n\nConteúdo.\n\n## 2. Pendências\n\n<!-- nada ainda -->\n';
  assert.deepEqual(secoesVazias(texto), ['2. Pendências']);
});

test('secoesVazias ignora título dentro de bloco de código', () => {
  const texto = '## 1. Exemplo\n\n```markdown\n## Isto é exemplo\n```\n';
  assert.deepEqual(secoesVazias(texto), []);
});

test('secoesVazias devolve vazio em documento inteiramente preenchido', () => {
  const texto = '## 1. A\n\nTexto.\n\n### 1.1 B\n\nMais texto.\n';
  assert.deepEqual(secoesVazias(texto), []);
});

// ————— Rodada J: a seção acaba no próximo título de nível MENOR OU IGUAL —————
//
// A pior das quatro famílias de falso positivo da rodada I, porque SOBREVIVE AO PREENCHIMENTO: o
// documento está certo, bem estruturado, e o aviso não sai. Não havia correção do lado do
// consultor — só apaziguamento com uma frase de enchimento sob o título do pai.
//
// Os três testes abaixo são um trio, e é o trio que decide: sem o segundo e o terceiro, "nunca
// acusar nada" passaria pelo primeiro.

test('secoesVazias: seção-pai cujo conteúdo está na SUBSEÇÃO não é vazia', () => {
  // O caso medido, e a estrutura dos templates que o próprio harness distribui — três seções
  // assim em `hld-funcional.md` e `especificacao-funcional.md`.
  const texto = [
    '## 2. Visão por módulo',
    '',
    '### MOD-COBRANCA — Cobrança',
    '',
    'Emite e concilia boletos.',
  ].join('\n');
  assert.deepEqual(secoesVazias(texto), []);
});

test('secoesVazias: seção de fato vazia CONTINUA acusada — o recorte por nível não afrouxou tudo', () => {
  const texto = [
    '## 2. Visão por módulo',
    '',
    '### MOD-COBRANCA — Cobrança',
    '',
    'Emite e concilia boletos.',
    '',
    '## 3. Integrações',
    '',
    '## 4. Premissas',
    '',
    'Nenhuma.',
  ].join('\n');
  assert.deepEqual(secoesVazias(texto), ['3. Integrações']);
});

test('secoesVazias: subseção de fato vazia é acusada como SUBSEÇÃO, não como o pai', () => {
  // O título do filho não conta como corpo do pai — senão qualquer pai com um filho vazio ficaria
  // "preenchido" pelo texto do próprio filho, e o defeito real sumiria. O pai aqui tem conteúdo
  // (o texto da segunda subseção); quem está vazia é a primeira.
  const texto = [
    '## 2. Visão por módulo',
    '',
    '### MOD-COBRANCA — Cobrança',
    '',
    '### MOD-PAGAMENTOS — Pagamentos',
    '',
    'Processa pagamentos.',
  ].join('\n');
  assert.deepEqual(secoesVazias(texto), ['MOD-COBRANCA — Cobrança']);
});

test('secoesVazias: os SEIS templates reais, em branco, não recebem acusação de seção vazia', () => {
  // O cross-test que o repositório já faz três vezes (`kit.test.mjs`, aqui, `workspace.test.mjs`),
  // aplicado a esta função. Antes da rodada J eram TRÊS acusações sobre os templates que a
  // `explore.md` manda copiar como primeiro passo. Verificador que acusa o documento em branco que
  // ele mesmo distribui é desligado antes de proteger qualquer coisa.
  for (const arquivo of readdirSync(TEMPLATES)) {
    const texto = readFileSync(join(TEMPLATES, arquivo), 'utf8');
    assert.deepEqual(secoesVazias(texto), [], arquivo);
  }
});

// ————————————————————————— M4: cerca de código não balanceada —————————————————————————

test('secoesVazias: cerca aberta e não fechada até o fim do documento é defeito, não [] (M4)', () => {
  const texto = '## 1. Módulos\n\nTexto normal.\n\n## 2. Diagrama\n\n```mermaid\nerDiagram\n  A ||--o{ B : x\n';
  const r = secoesVazias(texto);
  assert.ok(r.includes(CERCA_NAO_FECHADA), 'defeito de cerca aberta tem que aparecer na lista');
});

test('secoesVazias: cerca fechada normalmente NÃO produz o marcador de defeito', () => {
  const texto = '## 1. Diagrama\n\n```mermaid\nerDiagram\n  A ||--o{ B : x\n```\n';
  assert.ok(!secoesVazias(texto).includes(CERCA_NAO_FECHADA));
});

test('secoesVazias: cerca aberta some com o array vazio de antes — não aprova documento vazio', () => {
  // Reproduz o cenário do M4: um documento de fato vazio (só título e cerca aberta) tinha que
  // bloquear o gate, mas o bug fazia secoesVazias devolver [] (aprovado). Com o fix, o array
  // nunca fica vazio quando a cerca vaza até o fim.
  const texto = '## 1. Só isto\n\n```\nsem fechar';
  const r = secoesVazias(texto);
  assert.notDeepEqual(r, []);
  assert.ok(r.includes(CERCA_NAO_FECHADA));
});

// ————————————————————————— C1: a noção de cerca tem UM dono —————————————————————————
//
// `secoesVazias` rastreava cerca com um booleano local. O `zonas.mjs` precisa da MESMA pergunta
// ("esta linha está dentro de bloco de código?") para não confundir um carimbo CITADO com um
// carimbo INSTALADO. Duas noções de cerca no mesmo repositório divergem, então ela vira função
// nomeada aqui e os dois lados importam esta. `secoesVazias` continua respondendo a sua própria
// pergunta em cima dela — o que é compartilhado é a varredura, não a decisão.

test('mapearCercas: documento sem cerca nenhuma não marca linha nenhuma', () => {
  const r = mapearCercas('# Título\n\nTexto comum.\n');
  assert.deepEqual(r.dentro, [false, false, false, false]);
  assert.equal(r.naoFechada, false);
});

test('mapearCercas: cerca ``` marca os delimitadores e o miolo', () => {
  const r = mapearCercas('antes\n```\nmiolo\n```\ndepois');
  assert.deepEqual(r.dentro, [false, true, true, true, false]);
  assert.equal(r.naoFechada, false);
});

test('mapearCercas: cerca ```` só fecha com cerca de comprimento >= — a ``` de dentro é conteúdo', () => {
  // O caso do briefing e o mais provável de todos: documentar o procedimento do harness exige
  // uma cerca de quatro crases embrulhando uma de três. Um toggle ingênuo (qualquer linha com
  // ``` inverte o estado) faria a ``` interna FECHAR a cerca externa, e tudo depois dela voltaria
  // a contar como texto do documento — que é exatamente onde o carimbo citado mora.
  const texto = '````\ntexto\n```markdown\ncitação\n```\nmais texto\n````\nfora';
  const r = mapearCercas(texto);
  assert.deepEqual(r.dentro, [true, true, true, true, true, true, true, false]);
  assert.equal(r.naoFechada, false);
});

test('mapearCercas: cerca aberta e nunca fechada marca tudo até o fim e sinaliza naoFechada', () => {
  const r = mapearCercas('antes\n```\nmiolo\nmais miolo');
  assert.deepEqual(r.dentro, [false, true, true, true]);
  assert.equal(r.naoFechada, true);
});

test('mapearCercas: cerca de til (~~~) também é cerca', () => {
  // Markdown aceita as duas formas, e um documento que cita blocos com crase costuma usar til
  // para embrulhá-los. Reconhecer só a crase deixaria a metade mais provável do caso de citação
  // de fora.
  const r = mapearCercas('antes\n~~~\n```\ndentro\n~~~\nfora');
  assert.deepEqual(r.dentro, [false, true, true, true, true, false]);
  assert.equal(r.naoFechada, false);
});

test('mapearCercas: crase no rótulo da cerca não abre bloco — é código em linha', () => {
  // ```` `algo` ```` numa linha é código EM LINHA (delimitador com rótulo contendo crase), não
  // abertura de bloco. Tratá-lo como abertura marcaria o resto do documento como cerca.
  const r = mapearCercas('``` `x` ```\ndepois');
  assert.deepEqual(r.dentro, [false, false]);
  assert.equal(r.naoFechada, false);
});

test('mapearCercas: linha de fechamento com rótulo não fecha — só delimitador nu fecha', () => {
  const r = mapearCercas('```js\ncorpo\n```js\nainda dentro\n```\nfora');
  assert.deepEqual(r.dentro, [true, true, true, true, true, false]);
});

test('mapearCercas tolera texto vazio e nulo', () => {
  assert.deepEqual(mapearCercas('').dentro, [false]);
  assert.equal(mapearCercas(null).naoFechada, false);
});

// ————————— D4: as duas guardas de `tokens.mjs` que o JSDoc chama de load-bearing —————————

test('D4 — `secoesVazias` ignora título dentro de cerca AO PONTO DE MUDAR A RESPOSTA', () => {
  // O teste `secoesVazias ignora título dentro de bloco de código` acima leva o nome desta guarda
  // e passa SEM ela: nas duas leituras nenhuma seção fica com corpo vazio, então o array devolvido
  // é `[]` de qualquer jeito. Aqui a diferença aparece no resultado.
  //
  // Sem a consulta a `dentro[i]`, `## Exemplo` abre seção e a linha seguinte já é outro título:
  // a seção falsa nasce com corpo VAZIO e `secoesVazias` devolve `['Exemplo']` — um defeito
  // inventado, apontando para um título que não existe no documento. Com a guarda, as cinco linhas
  // da cerca são corpo da seção `1. Um`, e não há seção vazia nenhuma.
  const texto = [
    '## 1. Um',
    '',
    '```markdown',
    '## Exemplo',
    '## Outro exemplo',
    '```',
    '',
    'texto',
  ].join('\n');
  assert.deepEqual(secoesVazias(texto), []);
});

test('D4 — cerca indentada de QUATRO espaços é cerca: a divergência deliberada do CommonMark', () => {
  // `RE_DELIMITADOR` aceita `^\s*` de indentação, e não as até-três-colunas do CommonMark. A
  // justificativa está no JSDoc e nenhum teste a defendia: cerca dentro de item de lista vem
  // indentada de quatro espaços, e é cerca de verdade. Trocar por `^ {0,3}` faz o conteúdo dela
  // voltar a contar como texto do documento — que é onde o título de exemplo e o carimbo citado
  // moram.
  const texto = [
    '- passo:',
    '',
    '    ```markdown',
    '    ## Exemplo',
    '    ```',
    '',
    'depois',
  ].join('\n');
  const r = mapearCercas(texto);
  assert.deepEqual(r.dentro, [false, false, true, true, true, false, false]);
  assert.equal(r.naoFechada, false);
});

test('D4 — a cerca indentada muda a RESPOSTA de `secoesVazias`, não só o mapa de linhas', () => {
  // A consequência da guarda acima, medida onde ela decide. Com `^ {0,3}` a cerca indentada de
  // quatro espaços deixa de ser cerca: ela nunca abre, portanto nunca fica aberta, e o defeito
  // `CERCA_NAO_FECHADA` desaparece — o documento truncado no meio de um diagrama passa a ser
  // APROVADO em silêncio, que é exatamente o M4 de volta.
  const texto = '## 1. Diagrama\n\n- passo:\n\n    ```mermaid\n    erDiagram\n      A ||--o{ B : x\n';
  assert.ok(secoesVazias(texto).includes(CERCA_NAO_FECHADA));
});
