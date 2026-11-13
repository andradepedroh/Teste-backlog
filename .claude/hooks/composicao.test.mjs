// Harness Elo v2 — Teste de COMPOSIÇÃO: a camada inteira junta, pelo despachante de verdade.
//
// POR QUE ESTE ARQUIVO EXISTE, e a razão não é cobertura. Os dois achados **Critical** da Fundação
// viviam SÓ ENTRE MÓDULOS: o manifesto entregue conversando com `temRepoComPapel` conversando com
// `detectarFase`, e `norm()` recebendo o formato que o `PreToolUse` de fato entrega. Sete revisões
// de tarefa aprovaram cada peça isolada, com razão — nenhuma delas estava errada sozinha. Ninguém
// exercitava composição.
//
// A REGRA QUE VALE MAIS QUE A TABELA INTEIRA: **asserir `deny` não basta; cada cenário assere QUAL
// trava negou.** Na verificação manual da Task 10, dois pedidos que deveriam exercitar gatilhos
// diferentes caíram na MESMA trava, e a verificação pareceu completa com um gatilho sem prova
// nenhuma. Aqui o payload é nosso, então o que sobra do mesmo defeito é o outro lado: dois cenários
// satisfeitos pelo mesmo verificador deixam a tabela verde e um verificador nunca exercitado.
//
// A atribuição é feita DUAS VEZES, por caminhos independentes, e as duas têm que concordar:
//   1. por EXECUÇÃO — cada entrada do registro é embrulhada por uma testemunha que anota quem
//      devolveu o deny (ver `bancada`);
//   2. por MENSAGEM — `quemFalou` deduz o autor só do texto que o consultor lê (ver a tabela de
//      assinaturas). Foi ler a mensagem, e não o veredito, que revelou o defeito da Task 10.
// Se as duas divergirem, `veredito` falha. Uma trava que negasse com a mensagem de outra passaria
// pela asserção de execução sozinha, e é exatamente o autoengano que esta tarefa existe para pegar.
//
// O QUE ESTE ARQUIVO NÃO FAZ:
//   - **não mede tempo.** A Task 12 é que mede o orçamento de latência, e misturar as duas coisas
//     produz um teste que fica vermelho por ruído de máquina. Onde o custo importa — a pré-passagem
//     da rodada R —, o que se mede é I/O CONTADO (`leituras`), não relógio;
//   - **não chama predicado solto do `kit.mjs`.** `ehDestruicaoCatastrofica` LANÇA em caminho
//     absoluto (`exigirRelativo`), o que é correto — os verificadores relativizam antes de
//     perguntar. Um teste que o chamasse direto receberia exceção e a leria como defeito. Tudo aqui
//     entra pelo `despachar`, que é o caminho de produção;
//   - **não usa `process.chdir`.** O ponto de injeção é o `criarRegistro(io)`; `chdir` é estado
//     global e vaza entre testes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, utimesSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { criarRegistro, despachar, IO_REAL, REGISTRO } from './pretooluse.mjs';
import {
  RAIZ_EXPLORE, RAIZ_SPEC, DIR_AUDITORIAS, DIR_ISENCOES, MARCADOR_CONGELAMENTO, montarKickoff,
} from './kit.mjs';
import { montarCarimbo } from './zonas.mjs';
import { coletar } from './estado.mjs';

/**
 * Contrabarra literal, montada por código de caractere.
 *
 * NÃO É PREZIOSISMO. Esta série de rodadas perdeu seis execuções para o instrumento, duas delas
 * com caminho de Windows comido pelo shell — e uma aconteceu escrevendo justamente o cenário de
 * alias que está mais abaixo. Um `\` literal em fonte de teste é legível; um `\` literal que
 * atravessa um heredoc não sobrevive. A constante deixa a intenção sem ambiguidade nos dois casos.
 */
const BS = String.fromCharCode(92);

// ————————————————————————————— a bancada —————————————————————————————

/**
 * As ASSINATURAS DE MENSAGEM de cada trava, e o que cada uma prova.
 *
 * A ordem de teste importa: a mensagem do `escrita-bash` para um alvo na zona imutável CONTÉM a
 * frase "está na **zona imutável** do template", que é também a do `zonas`. O que as separa é que
 * o `escrita-bash` **cita o comando** (`\`rm\` escreve em …`) e o `zonas` **não cita nenhum** —
 * foi exatamente essa diferença que, na verificação manual da Task 10, mostrou que dois pedidos
 * tinham caído na mesma trava.
 */
/**
 * As travas que emitem a mensagem de RAIZ INDETERMINADA (`avaliarRaizIndeterminada`, zonas.mjs).
 *
 * É A ÚNICA ASSINATURA DESTA TABELA QUE NÃO PERTENCE A UMA TRAVA SÓ, e isso é desenho, não descuido:
 * `congelamento` e `escrita-bash` falam do MESMO fato pelo MESMO mecanismo, e a redação tem um dono
 * único justamente para que duas descrições do mesmo problema não mandem o consultor procurar dois
 * problemas. Logo, a atribuição por MENSAGEM não consegue separar os dois aqui — e o cross-check
 * continua valendo no que pode valer: quem executou tem que ser UM, e um dos dois emissores
 * possíveis. Quem precisa saber qual foi assere pela `trilha`, que vem no retorno do `nega`.
 */
const EMISSORES_DE_RAIZ_INDETERMINADA = new Set(['congelamento', 'escrita-bash']);

function quemFalou(motivo) {
  const m = String(motivo || '');
  if (/^O verificador `[^`]+` não conseguiu decidir/.test(m)) return 'falha-fechada';
  // A raiz indeterminada vem ANTES das assinaturas de trava: ela é do `zonas`, é compartilhada, e
  // não cita comando nenhum (a regra do `escrita-bash`, logo abaixo, não a pegaria).
  if (/^O caminho `[^`]+` contém `outputs\/explore\/`, mas não dá para dizer onde moram os artefatos/.test(m)) {
    return 'raiz-indeterminada';
  }
  if (/^Delivery gate:/.test(m)) return 'delivery-gate';
  if (/^Cadeia bloqueada \(/.test(m)) return 'cadeia';
  if (/^O Explore ainda não está fechado/.test(m)) return 'fecho-explore';
  // O `escrita-bash` sempre nomeia o COMANDO, ou explica a aspa que não fecha. As duas formas são
  // dele e de mais ninguém.
  if (/^Este comando tem uma \*\*aspa que não fecha\*\*/.test(m)) return 'escrita-bash';
  if (/ escreve em `| alcança tudo que está em `/.test(m)) return 'escrita-bash';
  // O `zonas` abre pelo CAMINHO, sem comando nenhum antes dele.
  if (/^`[^`]+` está na \*\*zona imutável\*\* do template\.$/m.test(m)) return 'zona-imutavel';
  if (/^`[^`]+` está em `[^`]+`, que foi \*\*congelado\*\*/m.test(m)) return 'congelamento';
  return null;
}

/**
 * Monta o registro REAL sobre um projeto temporário, com duas testemunhas presas nele.
 *
 * `io` é `IO_REAL` com o `cwd` trocado — a casca de produção inteira, menos a única coisa que
 * aponta para o projeto errado. Isso é o que o brief da tarefa pede em lugar de `process.chdir`:
 * o `chdir` é estado global, vaza entre testes, e num arquivo que roda projetos diferentes por
 * caso ele é a fonte de falha mais provável.
 *
 * `trilha` anota QUEM devolveu deny. `leituras` conta chamadas a `io.lerDiretorio` — e esse
 * contador não é decoração: num payload de `Bash` as outras quatro travas não estão nos gatilhos,
 * então quem pode lê-lo são só o `delivery-gate` e o `escrita-bash`. O `escrita-bash` passou a
 * lê-lo (Task 4b) para resolver a raiz dos artefatos, mas SÓ quando algum alvo do comando pode ser
 * do Explore — o pré-filtro puro `podeSerDoExplore` corta antes. Logo, num comando de `Bash` que
 * não fala do Explore, `leituras === 0` continua sendo prova de que o gate não chegou a tocar o
 * disco — que é como a pré-passagem da rodada R se mede sem cronômetro. Num comando que FALA do
 * Explore, o contador deixa de separar as duas travas, e nenhum caso deste arquivo o usa assim.
 */
function bancada(raiz) {
  const trilha = [];
  let leituras = 0;
  const io = {
    ...IO_REAL,
    cwd: () => raiz,
    lerDiretorio: (...args) => { leituras += 1; return IO_REAL.lerDiretorio(...args); },
  };
  const registro = criarRegistro(io).map((v) => ({
    ...v,
    executar: (payload) => {
      const r = v.executar(payload);
      if (r && r.acao === 'deny') trilha.push(v.nome);
      return r;
    },
  }));
  return { registro, trilha, leituras: () => leituras };
}

/** Despacha pelo registro real do projeto `raiz` e devolve veredito + quem falou + I/O contado. */
function veredito(raiz, payload, registroCustom) {
  const b = bancada(raiz);
  const r = despachar(payload, registroCustom || b.registro);
  const porMensagem = r.acao === 'deny' ? quemFalou(r.motivo) : null;
  if (r.acao === 'deny' && !registroCustom) {
    // As duas atribuições TÊM que concordar. Uma trava que negasse com a mensagem de outra passaria
    // pela asserção de execução sozinha — e é esse o autoengano que a tarefa existe para pegar.
    if (porMensagem === 'raiz-indeterminada') {
      // A exceção documentada: a mensagem é compartilhada por dois emissores por desenho (ver
      // `EMISSORES_DE_RAIZ_INDETERMINADA`). O que ainda dá para cobrar é que negou UMA trava, e que
      // ela é um dos dois — uma terceira trava com esta mensagem continua ficando vermelha.
      assert.equal(b.trilha.length, 1, `mais de uma trava negou: [${b.trilha.join(',')}]`);
      assert.ok(
        EMISSORES_DE_RAIZ_INDETERMINADA.has(b.trilha[0]),
        `\`${b.trilha[0]}\` não é emissor da mensagem de raiz indeterminada:\n${r.motivo}`,
      );
    } else {
      assert.deepEqual(
        b.trilha, [porMensagem],
        `execução diz [${b.trilha.join(',')}] e a mensagem diz "${porMensagem}":\n${r.motivo}`,
      );
    }
  }
  return { ...r, trava: porMensagem, trilha: b.trilha, leituras: b.leituras() };
}

/** Nega, e a trava é `nome`. Todo cenário de deny deste arquivo passa por aqui. */
function nega(raiz, payload, nome, ...trechos) {
  const r = veredito(raiz, payload);
  assert.equal(r.acao, 'deny', 'esperava deny e veio allow');
  assert.equal(r.trava, nome, `esperava a trava \`${nome}\`:\n${r.motivo}`);
  for (const t of trechos) assert.match(r.motivo, t);
  assert.deepEqual(r.falhas, [], 'nenhum verificador pode ter falhado em silêncio');
  return r;
}

/** Libera, e sem falha silenciosa de verificador. */
function libera(raiz, payload) {
  const r = veredito(raiz, payload);
  assert.equal(r.acao, 'allow', `esperava allow:\n${r.motivo}`);
  assert.deepEqual(r.falhas, [], 'nenhum verificador pode ter falhado em silêncio');
  return r;
}

const escrever = (fp) => ({ tool_name: 'Write', tool_input: { file_path: fp, content: '# x\n' } });
const rodarBash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const invocar = (skill) => ({ tool_name: 'Skill', tool_input: { skill } });

// ————————————————————————————— os projetos de mentira —————————————————————————————
//
// `mkdtempSync` e arquivos REAIS, como o plano pede: é o que torna isto composição em vez de
// dublê conversando com dublê. `realpathSync.native` porque o `%TEMP%` do Windows chega em forma
// curta (`MURILO~1`) e a resolução por identidade compara caminho canônico.

function porArquivo(raiz, rel, texto, mtimeSeg) {
  const abs = join(raiz, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, texto);
  if (mtimeSeg != null) utimesSync(abs, mtimeSeg, mtimeSeg);
}

const novaRaiz = (prefixo) => realpathSync.native(mkdtempSync(join(tmpdir(), prefixo)));

/**
 * O ESQUELETO QUE O TEMPLATE ENTREGA, exatamente como o git o rastreia.
 *
 * `git ls-files` do template: `inputs/.gitkeep`, `outputs/explore/.gitkeep`,
 * `outputs/spec/.gitkeep` e `workspace.md`. Logo, a `cwd` de TODO clone — mono ou multi-repo — tem
 * as duas pastas de outputs, vazias. Um fixture que omite isso mede um layout que não existe, e foi
 * essa omissão que deixou passar o defeito que a Task 4d fechou: o `descobrirWorkspace` decidia
 * "quem é a raiz dos artefatos" por EXISTÊNCIA das duas pastas, e a resposta era a `cwd` sempre.
 */
function esqueletoDoTemplate(raiz, sub = '') {
  const p = (rel) => (sub ? `${sub}/${rel}` : rel);
  porArquivo(raiz, p('inputs/.gitkeep'), '', 1_700_000_000);
  porArquivo(raiz, p(`${RAIZ_EXPLORE}/.gitkeep`), '', 1_700_000_000);
  porArquivo(raiz, p(`${RAIZ_SPEC}/.gitkeep`), '', 1_700_000_000);
  porArquivo(raiz, p('workspace.md'), MANIFESTO_OK, 1_700_000_000);
}

const MANIFESTO_OK = [
  '# Workspace do projeto', '',
  '<!-- harness:workspace -->',
  '- papel: docs',
  '  repositorio: https://dev.azure.com/acme/portal/_git/portal-docs',
  '- papel: prototipo',
  '  repositorio: https://dev.azure.com/acme/portal/_git/portal-proto',
  '<!-- /harness:workspace -->', '',
].join('\n');

const CABECALHO = (titulo) => [
  `# ${titulo} — Portal de Cobrança`, '',
  '> **Fase:** Explore · **Versão:** 0.1', '',
  '## Changelog', '',
  '| Versão | Data | Mudança |', '|---|---|---|',
  '| 0.1 | 2026-08-20 | versão inicial |', '',
].join('\n');

/**
 * Os quatro documentos obrigatórios do Explore, bem escritos.
 *
 * Bem escritos IMPORTA: o `fecho-explore` roda o `gramatica.mjs` sobre eles, e ali um falso
 * positivo não é aviso — é `deny` de um bloqueante. Documento em branco NÃO passa (Decisão 17),
 * então um fixture preguiçoso faria o cenário de travessia legítima ficar verde pela razão errada.
 */
const DOCS_BONS = {
  'hld-funcional.md': CABECALHO('HLD Funcional') + [
    '## Visão geral', '',
    'O portal centraliza a emissão e o acompanhamento de boletos dos clientes corporativos.', '',
    '## Módulos', '',
    '| Código | Nome | O que faz |', '|---|---|---|',
    '| MOD-COBRANCA | Cobrança | emite, reemite e baixa boletos |',
    '| MOD-ACOMP-CARGA | Acompanhamento | acompanha a carga diária de retorno bancário |', '',
  ].join('\n'),
  'especificacao-funcional.md': CABECALHO('Especificação Funcional') + [
    '## Personas', '',
    'Analista de cobrança: emite e acompanha boletos da carteira corporativa.', '',
    '## Funcionalidades', '',
    '| ID | Nome | O que faz |', '|---|---|---|',
    '| RF-001 | Emitir boleto | gera o boleto a partir do título em aberto |',
    '| RF-002 | Reemitir boleto | reemite com nova data de vencimento |', '',
    '## Regras de negócio', '',
    '| ID | Enunciado |', '|---|---|',
    '| RN-001 | Boleto vencido há mais de 30 dias não pode ser reemitido. |', '',
  ].join('\n'),
  'especificacao-tecnica.md': CABECALHO('Especificação Técnica') + [
    '## Camadas', '', 'Front em Next.js, API em .NET, banco relacional gerenciado.', '',
    '## Integrações', '', 'Retorno bancário CNAB240 diário, consumido por job agendado.', '',
    '## Premissas', '', 'O ERP continua sendo a fonte de verdade dos títulos.', '',
  ].join('\n'),
  'gaps.md': CABECALHO('GAPs e Questões Abertas') + [
    '## Questões abertas', '',
    '| ID | Descrição | Status | Impacto | Responsável |', '|---|---|---|---|---|',
    '| GAP-001 | Prazo de vencimento padrão ainda não definido | ⏳ Aguardando | alto | Financeiro |', '',
    '## Dispensas registradas', '',
    '| Artefato dispensado | Motivo | Quem decidiu | Data |', '|---|---|---|---|',
    '| modelo-de-dados.md | o produto reusa o modelo do ERP atual | Comitê | 2026-08-20 |', '',
  ].join('\n'),
};

const KICKOFF = montarKickoff({
  legado: 'nao', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt',
});

const BLOCO_ISENCAO_VALIDO = [
  '# Isenção — pré-projeto herdado', '',
  '<!-- gate:isencao -->',
  'repositorio: https://dev.azure.com/acme/portal/_git/portal-docs',
  'autor: Fulana de Tal',
  'data: 2026-08-25',
  'motivo: pré-projeto herdado de outro fornecedor, já especificado em outro lugar',
  '<!-- /gate:isencao -->', '',
].join('\n');

/**
 * Pré-projeto COMPLETO em disco: os seis itens do `fecho-explore` satisfeitos, mais os dois
 * artefatos da `spec-ingest` que o `cadeia` exige do `spec-product`.
 *
 * Os DOIS conjuntos precisam estar lá para que o cenário meça o que diz medir: sem
 * `context-map.md` e `discovery-document.md`, quem responde ao `spec-product` é o `cadeia`, que
 * vem ANTES na tabela — e o cenário do fecho passaria a exercitar outro verificador em silêncio.
 * É a mesma família de defeito da Task 10, dentro do fixture.
 *
 * `faltando` lista caminhos relativos que NÃO são criados.
 *
 * `sub` põe o pré-projeto inteiro sob uma subpasta do `cwd`, que é o layout MULTI-REPO — o repo de
 * docs é a única subpasta de primeiro nível com `outputs/explore/` e `outputs/spec/`. Vazio é
 * mono-repo, e continua sendo o default. O parâmetro entrou com o conserto do I1 (a trava do
 * congelamento julgava contra a `cwd` e em multi-repo nunca mordia); um segundo helper para o mesmo
 * fixture divergiria do primeiro, que é a família de defeito desta série.
 *
 * E COM `sub` A RAIZ RECEBE O ESQUELETO DO TEMPLATE, que é o conserto de fixture da Task 4d: um
 * clone do template tem `inputs/.gitkeep`, `outputs/explore/.gitkeep`, `outputs/spec/.gitkeep` e
 * `workspace.md` RASTREADOS no git, então a raiz de todo workspace multi-repo real TEM as duas
 * pastas de outputs — vazias. Sem essas quatro linhas, este fixture montava uma raiz que nenhum
 * clone real produz, e foi por isso que a suíte inteira ficou verde sobre um `descobrirWorkspace`
 * que respondia `multiRepo: false` em TODO clone multi-repo e liberava escrita no Explore congelado
 * do repo de docs. O fixture era o defeito.
 */
function preProjeto(prefixo, faltando = [], sub = '') {
  const raiz = novaRaiz(prefixo);
  const pular = new Set(faltando);
  const por = (rel, texto, mtime) => {
    if (!pular.has(rel)) porArquivo(raiz, sub ? `${sub}/${rel}` : rel, texto, mtime);
  };

  if (sub) esqueletoDoTemplate(raiz);
  por('workspace.md', MANIFESTO_OK, 1_700_000_000);
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    por(`${RAIZ_EXPLORE}/${nome}`, texto, 1_700_000_500);
  }
  por(`${RAIZ_SPEC}/sync-log.md`, '# Sync Log\n\n' + KICKOFF + '\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/context-map.md`, '# Context Map\n\nF-001 — fato ancorado.\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/discovery-document.md`, '# Discovery\n\nProblema central.\n', 1_700_000_000);
  // A linha `Fidelidade: alta` é o que o fecho confere desde o D9 do teste ponta a ponta: sem ela o
  // protótipo não declara fidelidade e o `spec-product` deste fixture passaria a ser negado.
  por(`${RAIZ_SPEC}/prototype.md`, '# Protótipo\n\nFidelidade: alta\n\nSeis estados por tela.\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/design-system.md`, '# Design System\n\nTokens e componentes.\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/screens-manifest.json`, '{"telas":[]}', 1_700_000_000);
  // Mais NOVO que o documento mais recente do Explore — `revisaoFresca` compara idade de verdade.
  por(`${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_900);
  return raiz;
}

// ————————————————————————————— A: a tabela do plano —————————————————————————————
//
// Cada linha abaixo de "Congelado" existe porque um bypass REAL foi reproduzido executando, e três
// deles passaram por revisões que os aprovaram. As linhas de `allow` importam tanto quanto as de
// `deny`: sem elas, um verificador que nega tudo passa na tabela inteira.

test('A1 — clone virgem: escrever no Explore libera, e o `estado.mjs` chama o projeto de Explore', () => {
  const raiz = novaRaiz('comp-virgem-');
  libera(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'hld-funcional.md')));
  // A OUTRA METADE DA COMPOSIÇÃO, e ela é do plano: o `SessionStart` e o `PreToolUse` são
  // processos separados que leem o MESMO projeto em disco. Um clone virgem em que a trava libera
  // e o anúncio dissesse "Plan" seria a camada contando duas histórias sobre o mesmo estado.
  assert.equal(coletar(raiz).fase, 'explore');
});

test('A2 — zona imutável com `file_path` ABSOLUTO: nega o `zonas`, e a mensagem não cita comando', () => {
  const raiz = preProjeto('comp-zona-');
  const r = nega(
    raiz, escrever(join(raiz, '.claude', 'hooks', 'kit.mjs')), 'zona-imutavel',
    /`\.claude\/hooks\/kit\.mjs` está na \*\*zona imutável\*\*/,
  );
  // O discriminante da Task 10, asserido de frente: a trava do `Bash` cita o comando, esta não.
  assert.doesNotMatch(r.motivo, / escreve em `/);
});

test('A3 — travessia prematura num projeto zerado: quem fala é o `cadeia`, com o código do validador', () => {
  const raiz = novaRaiz('comp-zerado-');
  nega(raiz, invocar('spec-product'), 'cadeia', /Cadeia bloqueada \(V-PRD-01\)/);
});

test('A3b — com os pré-requisitos da cadeia em disco, quem fala é o `fecho-explore`', () => {
  // A ORDEM `cadeia` → `fecho-explore` É OBSERVÁVEL, e este par é o que a prende. `spec-product`
  // dispara os DOIS; num projeto zerado responde o primeiro, e só satisfazendo o primeiro o
  // segundo chega a falar. Sem este par, A3 sozinho deixaria o fecho sem prova no gatilho `Skill`.
  const raiz = preProjeto('comp-fecho-', [`${RAIZ_EXPLORE}/gaps.md`]);
  nega(raiz, invocar('spec-product'), 'fecho-explore', /gaps\.md/);
});

test('A4 — travessia legítima: com o Explore completo em disco, o `spec-product` passa', () => {
  // A linha de allow do gate mais caro da camada. Sem ela, "nega tudo" passaria na tabela inteira.
  libera(preProjeto('comp-completo-'), invocar('spec-product'));
});

test('A5 — whitelist: `outputs/spec/sync-log.md` não atravessa a fronteira', () => {
  const raiz = preProjeto('comp-wl-', [`${RAIZ_EXPLORE}/gaps.md`]);
  libera(raiz, escrever(join(raiz, RAIZ_SPEC, 'sync-log.md')));
});

test('A6 — fora da whitelist: `outputs/spec/modules.md` com o Explore incompleto nega no `fecho-explore`', () => {
  const raiz = preProjeto('comp-fora-wl-', [`${RAIZ_EXPLORE}/gaps.md`]);
  nega(raiz, escrever(join(raiz, RAIZ_SPEC, 'modules.md')), 'fecho-explore', /gaps\.md/);
});

test('A7 — congelado: o marcador nega a escrita no Explore, diz como desfazer, e vira a fase', () => {
  const raiz = preProjeto('comp-congelado-');
  porArquivo(raiz, MARCADOR_CONGELAMENTO, 'congelado em 2026-08-25\n');
  nega(
    raiz, escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')), 'congelamento',
    /\*\*congelado\*\* na conclusão do `spec-product`/,
    /\*\*remova esse arquivo\*\*/,
  );
  // O MESMO arquivo que tranca a escrita é o que muda a fase anunciada. Duas leituras do mesmo
  // fato, por dois pontos de entrada diferentes, e elas têm que concordar.
  assert.equal(coletar(raiz).fase, 'plan');
});

test('A8 — carimbo SEM marcador não tranca nada', () => {
  // O defeito das três rodadas A–E, virado do avesso: enquanto a trava lia o carimbo na prosa,
  // documento carimbado bastava para trancar. Hoje quem decide é o marcador, e só ele.
  const raiz = preProjeto('comp-carimbo-');
  for (const nome of Object.keys(DOCS_BONS)) {
    porArquivo(raiz, `${RAIZ_EXPLORE}/${nome}`, montarCarimbo('2026-08-25') + '\n' + DOCS_BONS[nome], 1_700_000_500);
  }
  libera(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')));
});

test('A9 — citação do carimbo em PROSA não é decisão de máquina', () => {
  // `gaps.md` documentando o procedimento de congelamento chegou a congelar o projeto — e a
  // bloquear a correção do próprio `gaps.md`. Laço fechado, reproduzido executando.
  const raiz = preProjeto('comp-prosa-');
  porArquivo(raiz, `${RAIZ_EXPLORE}/gaps.md`, [
    DOCS_BONS['gaps.md'], '',
    '## Procedimento de congelamento', '',
    'Ao concluir o `spec-product`, cada documento recebe a linha:', '',
    montarCarimbo('2026-08-25'), '',
  ].join('\n'), 1_700_000_500);
  libera(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'hld-funcional.md')));
});

test('A10 — reabertura: removido o marcador, a escrita volta e a fase volta junto', () => {
  // A saída ANUNCIADA pela mensagem de negação tem que funcionar. Uma trava bloqueante cuja
  // instrução de saída não satisfaz a própria trava é o falso positivo mais caro que existe.
  const raiz = preProjeto('comp-reabre-');
  porArquivo(raiz, MARCADOR_CONGELAMENTO, 'congelado em 2026-08-25\n');
  nega(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')), 'congelamento', /remova esse arquivo/);
  rmSync(join(raiz, MARCADOR_CONGELAMENTO));
  libera(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')));
  assert.equal(coletar(raiz).fase, 'explore');
});

test('A11 — `Bash` destrutivo: `sed -i` nega no `escrita-bash`, citando o comando e o caminho', () => {
  nega(
    preProjeto('comp-sed-'), rodarBash('sed -i s/a/b/ .claude/hooks/kit.mjs'), 'escrita-bash',
    /`sed` escreve em `\.claude\/hooks\/kit\.mjs`/,
  );
});

test('A12 — `Bash` de leitura: ler não é escrever', () => {
  libera(preProjeto('comp-cat-'), rodarBash('cat CLAUDE.md'));
});

test('A13 — `Bash` com `cd`: o `cd` é seguido, e a trava vê o alvo real', () => {
  nega(
    preProjeto('comp-cd-'), rodarBash('cd .claude/hooks && rm kit.mjs'), 'escrita-bash',
    /`rm` escreve em `\.claude\/hooks\/kit\.mjs`/,
  );
});

test('A14 — alias de prefixo estendido: identidade de arquivo, não string', () => {
  // `\\?\C:\…\CLAUDE.md` é o MESMO arquivo que `CLAUDE.md`. Uma trava que compara string libera.
  const raiz = preProjeto('comp-alias-');
  nega(raiz, escrever(BS + BS + '?' + BS + raiz + BS + 'CLAUDE.md'), 'zona-imutavel', /`CLAUDE\.md` está na \*\*zona imutável\*\*/);
});

test('A15 — `NotebookEdit` traz o caminho em `notebook_path`, e o gatilho não é decorativo', () => {
  // Campo DIFERENTE, não sinônimo. Ler só `file_path` com `NotebookEdit` declarado no gatilho já
  // custou a fiscalização de notebook inteira, em silêncio, na Task 2.
  const raiz = preProjeto('comp-nb-');
  nega(
    raiz,
    { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(raiz, '.claude', 'hooks', 'analise.ipynb') } },
    'zona-imutavel', /`\.claude\/hooks\/analise\.ipynb` está na \*\*zona imutável\*\*/,
  );
});

test('A16 — share de rede morta libera, sem I/O de rede no gate', () => {
  // O tempo NÃO se mede aqui (Task 12). O que se mede é que o veredito sai e é `allow`: um gate
  // que tentasse resolver o share pendura a sessão inteira em vez de responder.
  const raiz = preProjeto('comp-unc-');
  libera(raiz, escrever(BS + BS + 'host-inexistente-harness-v2' + BS + 'share' + BS + 'a.md'));
});

test('A17 — a válvula de isenção libera o `spec-product` num projeto vazio', () => {
  const raiz = novaRaiz('comp-isencao-');
  porArquivo(raiz, `${DIR_ISENCOES}/herdado.md`, BLOCO_ISENCAO_VALIDO);
  // A isenção é do FECHO, não da CADEIA: ela dispensa o Explore de estar completo, não dispensa a
  // `spec-product` de ter o que ela lê. Sem estes dois, quem responderia seria o `cadeia`.
  porArquivo(raiz, `${RAIZ_SPEC}/context-map.md`, '# Context Map\n');
  porArquivo(raiz, `${RAIZ_SPEC}/discovery-document.md`, '# Discovery\n');
  libera(raiz, invocar('spec-product'));
});

test('A20 — congelar troca uma trava por outra, e a que entra é mais dura', () => {
  // ESTE É O ARGUMENTO DA DECISÃO 22 EM FORMA EXECUTÁVEL. Um agente que forje o marcador para
  // escapar do frescor ganha, no mesmo ato, a proibição de escrever no Explore. O contorno se
  // paga com uma trava pior — e é isso que faltava na proposta "marcador ⇒ null".
  const raiz = preProjeto('comp-troca-travas-');

  // O `revisao.json` volta a ser mais VELHO que o documento mais recente do Explore, que o
  // `preProjeto` cria com 1_700_000_500. É assim que `revisaoFresca` fica falsa por IDADE REAL,
  // e não por dublê.
  porArquivo(raiz, `${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_100);

  nega(raiz, escrever(join(raiz, RAIZ_SPEC, 'modules.md')), 'fecho-explore', /Relatório de revisão/);

  // Carimbar e depois marcar — a ordem que o `promocao.mjs --congelar` executa, e a mesma que a
  // rule declara como contrato. O carimbo vem do dono (`montarCarimbo`), nunca escrito à mão.
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    porArquivo(raiz, `${RAIZ_EXPLORE}/${nome}`,
      `${montarCarimbo('2026-09-08')}\n\n${texto}`, 1_700_000_500);
  }
  porArquivo(raiz, MARCADOR_CONGELAMENTO, '# Explore congelado\n', 1_700_001_000);

  libera(raiz, escrever(join(raiz, RAIZ_SPEC, 'modules.md')));
  nega(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')), 'congelamento');
});

test('A21 — em MULTI-REPO a troca de travas TAMBÉM vale, e era exatamente aqui que ela não valia', () => {
  // O ARGUMENTO DA DECISÃO 22 NO LAYOUT QUE A RULE DO EXPLORE TRATA COMO NORMAL. Medido antes do
  // conserto do I1: a segunda metade deste teste LIBERAVA. A trava do congelamento relativizava
  // contra a `cwd` e perguntava `exploreCongelado(cwd)`, enquanto o marcador mora em
  // `<repo de docs>/outputs/spec/` — então forjar o marcador desligava o frescor e NÃO ligava
  // proibição nenhuma. Depois do congelamento, nenhuma trava perguntava se o Explore mudou.
  //
  // Prova por COMPOSIÇÃO, e não por leitura: o mesmo despachante, o mesmo `IO_REAL`, arquivos de
  // verdade em disco, e o `nega` cobrando qual trava falou.
  const DOCS = 'portal-docs';
  const raiz = preProjeto('comp-multi-troca-', [], DOCS);
  const docs = join(raiz, DOCS);
  // Irmão que NÃO é candidato a repo de docs, para o fixture distinguir "achou o repo de docs" de
  // "pegou a única subpasta que existe".
  porArquivo(raiz, 'portal-app/src/app.ts', 'export const x = 1;\n');

  porArquivo(raiz, `${DOCS}/${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_100);
  nega(raiz, escrever(join(docs, RAIZ_SPEC, 'modules.md')), 'fecho-explore', /Relatório de revisão/);

  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    porArquivo(raiz, `${DOCS}/${RAIZ_EXPLORE}/${nome}`,
      `${montarCarimbo('2026-09-08')}\n\n${texto}`, 1_700_000_500);
  }
  porArquivo(raiz, `${DOCS}/${MARCADOR_CONGELAMENTO}`, '# Explore congelado\n', 1_700_001_000);

  libera(raiz, escrever(join(docs, RAIZ_SPEC, 'modules.md')));
  nega(raiz, escrever(join(docs, RAIZ_EXPLORE, 'gaps.md')), 'congelamento');
  // E a trava não passou a negar tudo: fora do Explore, o irmão de código continua editável.
  libera(raiz, escrever(join(raiz, 'portal-app', 'src', 'app.ts')));
});

test('A22 — em MULTI-REPO a troca de travas vale pelo `Bash` também, que é o vetor ALTO', () => {
  // A METADE QUE FALTAVA DO A21. Ele prova a troca de travas da Decisão 22 para `Write`/`Edit`; o
  // `Bash` continuava com a MESMA cegueira multi-repo dentro do `escrita-bash.mjs`, e o modelo de
  // ameaça deste projeto põe o shell como o vetor ALTO — "`sed -i` no arquivo errado é terça-feira".
  // Enquanto isso valia, forjar o marcador em multi-repo desligava o frescor do `revisao.json` e
  // ligava proibição nenhuma para quem escrevesse por comando.
  //
  // Medido executando, antes do conserto: as três linhas de `nega` do fim deste teste LIBERAVAM.
  //
  // Prova por COMPOSIÇÃO: o mesmo despachante, o mesmo `IO_REAL`, arquivos de verdade em disco, e o
  // `nega` cobrando qual trava falou — a mensagem tem que ser a do `escrita-bash`, que cita o
  // comando, e não a do `congelamento`, que não cita nenhum.
  const DOCS = 'portal-docs';
  const raiz = preProjeto('comp-multi-bash-', [], DOCS);
  const docs = join(raiz, DOCS);
  // Irmão que NÃO é candidato a repo de docs, para o fixture distinguir "achou o repo de docs" de
  // "pegou a única subpasta que existe".
  porArquivo(raiz, 'portal-app/src/app.ts', 'export const x = 1;\n');

  // ANTES DE CONGELAR: o frescor está ligado (o `revisao.json` fica mais velho que o Explore) e a
  // escrita no Explore pelo `Bash` passa. As duas metades da troca, no estado inicial.
  porArquivo(raiz, `${DOCS}/${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_100);
  nega(raiz, escrever(join(docs, RAIZ_SPEC, 'modules.md')), 'fecho-explore', /Relatório de revisão/);
  libera(raiz, rodarBash(`sed -i s/a/b/ ${DOCS}/${RAIZ_EXPLORE}/gaps.md`));

  // Carimbar e depois marcar — a ordem que o `promocao.mjs --congelar` executa. O carimbo vem do
  // dono (`montarCarimbo`), nunca escrito à mão.
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    porArquivo(raiz, `${DOCS}/${RAIZ_EXPLORE}/${nome}`,
      `${montarCarimbo('2026-09-08')}\n\n${texto}`, 1_700_000_500);
  }
  porArquivo(raiz, `${DOCS}/${MARCADOR_CONGELAMENTO}`, '# Explore congelado\n', 1_700_001_000);

  // DEPOIS: o frescor foi dispensado (a trava que o agente queria contornar saiu)…
  libera(raiz, escrever(join(docs, RAIZ_SPEC, 'modules.md')));
  // …e a que entrou no lugar morde pelo `Bash`, nas QUATRO famílias de comando que o
  // `fecho-explore.mjs` nomeia — `sed -i`, redireção, `mv` e `rm -rf`. São quatro no laço abaixo e
  // quatro lá; a frase dizia três, e subdimensionar o que um bloqueante cobre é a imprecisão que
  // esta série já corrigiu cinco vezes.
  for (const comando of [
    `sed -i s/a/b/ ${DOCS}/${RAIZ_EXPLORE}/gaps.md`,
    `echo pwned > ${DOCS}/${RAIZ_EXPLORE}/gaps.md`,
    `mv ${DOCS}/${RAIZ_EXPLORE}/gaps.md antigo.md`,
    `rm -rf ${DOCS}/${RAIZ_EXPLORE}`,
  ]) {
    nega(raiz, rodarBash(comando), 'escrita-bash', /congelad/i, / escreve em `/);
  }
  // E não passou a negar tudo: o irmão de código e o `outputs/spec/` seguem escrevíveis por comando.
  libera(raiz, rodarBash('sed -i s/a/b/ portal-app/src/app.ts'));
  libera(raiz, rodarBash(`echo x > ${DOCS}/${RAIZ_SPEC}/nota.md`));
});

test('A23 — LAYOUT 2: a candidata NÃO rouba a raiz de uma `cwd` cujo Explore tem CONTEÚDO (I1)', () => {
  // O DEFEITO ERA `deny` → `allow` SILENCIOSO, e o gatilho é acidente de consultoria ordinário e
  // ordenado: congela em mono-repo, depois copia `outputs/` para `backup-antes-do-congelamento/` —
  // ou vendoriza um pré-projeto de exemplo. A cópia passava a ser lida como o repo de docs de um
  // workspace multi-repo, o `outputs/explore/gaps.md` DA RAIZ era relativizado contra ela, dava
  // `null`, e as duas travas bloqueantes liberavam escrita no Explore congelado sem dizer nada.
  //
  // Medido pelo despachante real antes do conserto, mesmo projeto e mesmo marcador:
  //   sem subpasta candidata:  Write deny  | sed -i deny
  //   com subpasta candidata:  Write allow | sed -i allow
  // A assimetria era a pior parte: UMA subpasta liberava calado, DUAS caíam em `ambiguo` e negavam
  // por falha fechada. O conserto está no `descobrirWorkspace`, que é o dono único da raiz dos
  // artefatos: quem tem CONTEÚDO no `outputs/explore/` ganha, e aqui os dois lados têm — a raiz
  // vence, e o layout é mono-repo. É o LAYOUT 2 da matriz da Task 4d; o LAYOUT 3, que é o clone
  // multi-repo de verdade, está no `A24`.
  const raiz = preProjeto('comp-cwd-ganha-');
  const BACKUP = 'backup-antes-do-congelamento';
  // O ESQUELETO QUE O TEMPLATE ENTREGA, na raiz, porque todo clone o tem: é ele que fazia o ramo
  // por existência responder "a `cwd` ganha" sempre. Aqui o veredito é o mesmo COM ou SEM ele — a
  // raiz tem documento de verdade —, e a linha existe para que o fixture não deixe de valer no dia
  // em que alguém trocar o critério de volta por existência.
  esqueletoDoTemplate(raiz);

  // A cópia é FIEL, como um `cp -r outputs/ backup.../` seria — inclusive o marcador. É o que a
  // torna candidata a repo de docs, e é o que fazia o defeito aparecer.
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    porArquivo(raiz, `${RAIZ_EXPLORE}/${nome}`,
      `${montarCarimbo('2026-09-08')}\n\n${texto}`, 1_700_000_500);
    porArquivo(raiz, `${BACKUP}/${RAIZ_EXPLORE}/${nome}`, texto, 1_700_000_500);
  }
  porArquivo(raiz, MARCADOR_CONGELAMENTO, '# Explore congelado\n', 1_700_001_000);
  porArquivo(raiz, `${BACKUP}/${MARCADOR_CONGELAMENTO}`, '# Explore congelado\n', 1_700_001_000);

  // AS DUAS TRAVAS BLOQUEANTES, que é onde o defeito doía: o gatilho de escrita e o gatilho `Bash`.
  nega(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')), 'congelamento');
  nega(raiz, rodarBash(`sed -i s/a/b/ ${RAIZ_EXPLORE}/gaps.md`), 'escrita-bash', /congelad/i);
  nega(raiz, rodarBash(`echo pwned > ${RAIZ_EXPLORE}/gaps.md`), 'escrita-bash', /congelad/i);

  // E O PLAN SEGUE DESTRAVADO, que é tudo o que esta linha mede: nenhuma das travas passou a negar
  // escrita em `outputs/spec/` por causa do layout. **A DISPENSA DE FRESCOR NÃO É MEDIDA AQUI** — o
  // `preProjeto` escreve o `revisao.json` com mtime 1_700_000_900 e este teste reescreve o Explore
  // com 1_700_000_500, então o relatório de revisão está MAIS NOVO que o Explore e o frescor está
  // satisfeito: este `libera` passaria com marcador ou sem, e a dispensa não é a razão dele. Quem
  // mede a dispensa são o `A20` (mono-repo) e o `A21`/`A22` (multi-repo), que rebaixam o
  // `revisao.json` de propósito (mtime 1_700_000_100) e assertam o `deny` do frescor ANTES de
  // congelar — as duas pontas da troca no mesmo projeto. A frase antiga dizia que a
  // dispensa "é medida aqui", e um teste que não mede o que a prosa dele afirma é pior que teste
  // nenhum: ele faz a cobertura parecer completa.
  libera(raiz, escrever(join(raiz, RAIZ_SPEC, 'modules.md')));

  // A RESSALVA DA TROCA, e ela é deliberada: com a `cwd` ganhando, a CÓPIA deixa de ser governada —
  // o Explore dela cai fora da raiz dos artefatos e fica escrivível. É a resposta certa sob o
  // modelo de ameaça (acidente e deriva, não adversário): quem carrega o Explore do projeto é o
  // `outputs/explore/` que tem DOCUMENTO, e negar escrita no backup seria falso positivo em trabalho
  // legítimo — apagar o próprio backup depois de conferi-lo. Antes do conserto era o inverso, e o
  // lado protegido era o errado: a cópia mordia e o Explore de verdade não.
  //
  // E É O MESMO LADO DA TROCA QUE A REGRA DE CONTEÚDO NÃO RESOLVE, escrito onde ele aparece: num
  // workspace multi-repo em que alguém põe documento no `outputs/explore/` DA RAIZ, a raiz ganha e a
  // candidata deixa de ser governada. Esta função não distingue "documento no Explore da raiz" de
  // "raiz de artefatos", e distinguir exigiria ler o manifesto — que mora no repo de docs, que é
  // justamente o que se está procurando. Ver o JSDoc do `descobrirWorkspace`.
  libera(raiz, escrever(join(raiz, BACKUP, RAIZ_EXPLORE, 'gaps.md')));
  libera(raiz, rodarBash(`rm -rf ${BACKUP}`));
});

// ————————————— os layouts 3, 4 e 5: o CLONE DE VERDADE, que era o que faltava —————————————
//
// O `A23` prende o layout 2 (mono-repo + backup). Os três testes abaixo prendem os outros três, e o
// primeiro deles é o que provava o defeito Critical da Task 4d: o ramo "a `cwd` ganha" decidia por
// EXISTÊNCIA de `outputs/explore` e `outputs/spec`, o template ENTREGA as duas pastas rastreadas no
// git (`git ls-files`: `inputs/.gitkeep`, `outputs/explore/.gitkeep`, `outputs/spec/.gitkeep`,
// `workspace.md`), e por isso a `cwd` ganhava em TODO clone — multi-repo ficava desligado por
// padrão, e o Explore congelado do repo de docs aceitava as três formas de escrita.
//
// Nenhum teste pegou porque todos os fixtures de multi-repo montavam a raiz SEM `outputs/`. Daí o
// `esqueletoDoTemplate`: a fidelidade do fixture é a parte que estava faltando, não a asserção.

test('A24 — LAYOUT 3: clone MULTI-REPO de verdade, e o Explore congelado do repo de docs NEGA', () => {
  // O CRITICAL DA TASK 4d, medido pelo despachante real antes do conserto — esqueleto na raiz,
  // `workspace.md` declarando `portal-docs`, Explore congelado dentro dele:
  //   descobrirWorkspace : multiRepo: false, raizArtefatos = <raiz do workspace>
  //   Write no Explore CONGELADO do repo de docs  => allow
  //   Bash  sed -i no mesmo caminho               => allow
  //   Bash  rm -rf no Explore congelado           => allow
  // Não era caso de borda: era o padrão de todo clone. Depois do conserto, `multiRepo: true` com a
  // raiz em `portal-docs`, e os três negam.
  const DOCS = 'portal-docs';
  const raiz = preProjeto('comp-clone-multi-', [], DOCS); // o `sub` já deita o esqueleto na raiz
  const docs = join(raiz, DOCS);
  // Irmão que NÃO é candidato, para o fixture distinguir "achou o repo de docs" de "pegou a única
  // subpasta que existe".
  porArquivo(raiz, 'portal-app/src/app.ts', 'export const x = 1;\n');

  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    porArquivo(raiz, `${DOCS}/${RAIZ_EXPLORE}/${nome}`,
      `${montarCarimbo('2026-09-08')}\n\n${texto}`, 1_700_000_500);
  }
  porArquivo(raiz, `${DOCS}/${MARCADOR_CONGELAMENTO}`, '# Explore congelado\n', 1_700_001_000);

  // AS DUAS TOOLS, que é onde o defeito doía. As quatro famílias de comando do `Bash` juntas,
  // porque o shell é o vetor ALTO deste modelo de ameaça.
  nega(raiz, escrever(join(docs, RAIZ_EXPLORE, 'gaps.md')), 'congelamento');
  for (const comando of [
    `sed -i s/a/b/ ${DOCS}/${RAIZ_EXPLORE}/gaps.md`,
    `echo pwned > ${DOCS}/${RAIZ_EXPLORE}/gaps.md`,
    `mv ${DOCS}/${RAIZ_EXPLORE}/gaps.md antigo.md`,
    `rm -rf ${DOCS}/${RAIZ_EXPLORE}`,
  ]) {
    nega(raiz, rodarBash(comando), 'escrita-bash', /congelad/i, / escreve em `| alcança tudo que está em `/);
  }

  // E NÃO PASSOU A NEGAR TUDO — sem esta metade, uma trava que negasse tudo em multi-repo passaria
  // nas asserções de cima. O `outputs/explore/` DA RAIZ, que é só o esqueleto, também segue
  // escrivível: ele não é a raiz dos artefatos deste projeto, e negar ali seria falso positivo.
  libera(raiz, escrever(join(raiz, 'portal-app', 'src', 'app.ts')));
  libera(raiz, escrever(join(docs, RAIZ_SPEC, 'modules.md')));
  libera(raiz, escrever(join(raiz, RAIZ_EXPLORE, 'rascunho.md')));
  libera(raiz, rodarBash('sed -i s/a/b/ portal-app/src/app.ts'));
});

test('A24b — RESÍDUO DECLARADO: documento solto no Explore DA RAIZ desliga o multi-repo', () => {
  // O QUE A REGRA DE CONTEÚDO DELIBERADAMENTE NÃO RESOLVE, medido e prendido — porque resíduo que
  // só existe em comentário fica stale em silêncio no dia em que alguém o fechar, e é essa a
  // família de defeito que esta série vem corrigindo.
  //
  // Num workspace multi-repo, UM documento solto no `outputs/explore/` da raiz faz a raiz ganhar, e
  // o Explore congelado do repo de docs volta a ficar escrivível pelas duas tools. É o mesmo lado da
  // troca que o `A23` faz de propósito: esta função não distingue "documento no Explore da raiz" de
  // "raiz de artefatos", e distinguir exigiria ler o manifesto — que mora no repo de docs, que é
  // justamente o que se está procurando.
  //
  // A ALTERNATIVA FOI PESADA E RECUSADA: exigir conteúdo nas DUAS pastas fecharia este resíduo, mas
  // deixaria de reconhecer a raiz de um Explore recém-começado (documento no Explore, `outputs/spec/`
  // ainda vazio) — que é projeto de verdade, e é o layout de todo início de pré-projeto. Sob o modelo
  // de ameaça (acidente e deriva, não adversário), trocar um caso comum por um caso de deriva seria
  // o negócio errado. Se alguém fechar isto um dia, este teste fica vermelho e a decisão volta à
  // mesa.
  const DOCS = 'portal-docs';
  const raiz = preProjeto('comp-residuo-raiz-', [], DOCS);
  const docs = join(raiz, DOCS);
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    porArquivo(raiz, `${DOCS}/${RAIZ_EXPLORE}/${nome}`,
      `${montarCarimbo('2026-09-08')}\n\n${texto}`, 1_700_000_500);
  }
  porArquivo(raiz, `${DOCS}/${MARCADOR_CONGELAMENTO}`, '# Explore congelado\n', 1_700_001_000);

  // A ÂNCORA DO OUTRO LADO, e sem ela este teste não prova nada: com a raiz só no esqueleto, as
  // duas tools NEGAM (é o `A24`). O que muda daqui para lá é uma linha de deriva.
  nega(raiz, escrever(join(docs, RAIZ_EXPLORE, 'gaps.md')), 'congelamento');

  porArquivo(raiz, `${RAIZ_EXPLORE}/nota-solta.md`, '# nota de reunião\n', 1_700_000_600);

  libera(raiz, escrever(join(docs, RAIZ_EXPLORE, 'gaps.md')));
  libera(raiz, rodarBash(`sed -i s/a/b/ ${DOCS}/${RAIZ_EXPLORE}/gaps.md`));
  libera(raiz, rodarBash(`rm -rf ${DOCS}/${RAIZ_EXPLORE}`));
});

test('A25 — LAYOUT 4: duas candidatas com conteúdo e raiz só esqueleto → falha FECHADA', () => {
  // A raiz não responde (só o esqueleto), e não há como desempatar duas subpastas com pré-projeto.
  // Bloqueante que não sabe onde olhar NÃO libera: a mensagem é a do `avaliarRaizIndeterminada`
  // (zonas.mjs), e a saída que ela dá é executável — o `--validar` reporta este mesmo problema.
  //
  // O par deste caso é o `A23`: lá a `cwd` responde, e a ambiguidade deixa de existir. Antes do
  // conserto da Task 4d este layout também caía no ramo "a `cwd` ganha" — o esqueleto bastava — e
  // liberava as três escritas em silêncio.
  const raiz = novaRaiz('comp-duas-candidatas-');
  esqueletoDoTemplate(raiz);
  for (const sub of ['portal-docs', 'outro-docs']) {
    esqueletoDoTemplate(raiz, sub);
    for (const [nome, texto] of Object.entries(DOCS_BONS)) {
      porArquivo(raiz, `${sub}/${RAIZ_EXPLORE}/${nome}`, texto, 1_700_000_500);
    }
    porArquivo(raiz, `${sub}/${MARCADOR_CONGELAMENTO}`, '# Explore congelado\n', 1_700_001_000);
  }

  // AS DUAS TOOLS. A mensagem é a mesma nas duas (um dono só para a redação deste fato), então quem
  // separa os dois é a `trilha` — a atribuição por EXECUÇÃO, que é a outra metade da bancada.
  for (const [trava, payload] of [
    ['congelamento', escrever(join(raiz, 'portal-docs', RAIZ_EXPLORE, 'gaps.md'))],
    ['escrita-bash', rodarBash(`sed -i s/a/b/ portal-docs/${RAIZ_EXPLORE}/gaps.md`)],
  ]) {
    const r = nega(raiz, payload, 'raiz-indeterminada', /workspace indeterminado/i, /ambiguo/, /--validar/);
    assert.deepEqual(r.trilha, [trava], `esperava o deny da trava \`${trava}\``);
    assert.match(r.motivo, /portal-docs/);
    assert.match(r.motivo, /outro-docs/);
  }
});

test('A26 — LAYOUT 5: o DIA 1 de todo projeto não é falso positivo em bloqueante nenhum', () => {
  // CLONE RECÉM-FEITO, NADA PREENCHIDO: só o esqueleto que o git rastreia. É o layout mais comum
  // que existe, e o veredito prendido aqui é `allow` para trabalho legítimo — o Explore não está
  // congelado, então não há o que negar, e uma trava que negasse seria o pior erro possível sob
  // este modelo de ameaça (falso positivo atrapalhando trabalho legítimo é PIOR que bypass
  // exótico). A raiz dos artefatos é a `cwd`, e o `A1` já prende a outra metade — o `estado.mjs`
  // chamando o projeto de Explore —, só que sobre um diretório vazio, que nenhum clone produz.
  const raiz = novaRaiz('comp-dia-1-');
  esqueletoDoTemplate(raiz);

  // Escrever os documentos do Explore é EXATAMENTE o trabalho do dia 1.
  for (const nome of Object.keys(DOCS_BONS)) {
    libera(raiz, escrever(join(raiz, RAIZ_EXPLORE, nome)));
  }
  libera(raiz, rodarBash(`echo '# HLD' > ${RAIZ_EXPLORE}/hld-funcional.md`));
  libera(raiz, rodarBash(`sed -i s/a/b/ ${RAIZ_EXPLORE}/hld-funcional.md`));
  libera(raiz, escrever(join(raiz, 'inputs', 'reuniao-01.txt')));
  // E o esqueleto não faz o projeto parecer adiantado: continua sendo Explore.
  assert.equal(coletar(raiz).fase, 'explore');
  // A trava do congelamento não é a única coisa viva: a zona imutável segue negando, então o
  // `allow` de cima não é "nada está ligado neste layout".
  nega(raiz, escrever(join(raiz, '.claude', 'hooks', 'kit.mjs')), 'zona-imutavel');
});

// Os dois cenários que exigem REGISTRO PRÓPRIO: a postura assimétrica não é observável com a
// tabela real, porque nenhum verificador real lança de propósito. `despachar` é puro e recebe a
// tabela, então a tabela é o dublê. **Os dois lados são asseridos** — só o deny não distingue
// falha fechada de falha em tudo.

test('A18 — informativo que LANÇA falha ABERTO: libera, e o erro fica em `falhas`', () => {
  const raiz = preProjeto('comp-info-');
  const b = bancada(raiz);
  const quebrado = {
    nome: 'informativo-quebrado', gatilhos: ['Write'], bloqueia: false,
    executar: () => { throw new Error('quebrou'); },
  };
  const r = despachar(escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')), [quebrado, ...b.registro]);
  assert.equal(r.acao, 'allow');
  assert.equal(r.falhas.length, 1);
  assert.equal(r.falhas[0].nome, 'informativo-quebrado');
  assert.match(r.falhas[0].erro, /quebrou/);
});

test('A19 — bloqueante que LANÇA falha FECHADO: nega, e diz que a falha é do harness', () => {
  const raiz = preProjeto('comp-bloq-');
  const b = bancada(raiz);
  const quebrado = {
    nome: 'bloqueante-quebrado', gatilhos: ['Write'], bloqueia: true,
    executar: () => { throw new Error('explodiu'); },
  };
  const r = despachar(escrever(join(raiz, RAIZ_EXPLORE, 'gaps.md')), [quebrado, ...b.registro]);
  assert.equal(r.acao, 'deny');
  assert.equal(quemFalou(r.motivo), 'falha-fechada');
  assert.match(r.motivo, /`bloqueante-quebrado`/);
  assert.match(r.motivo, /explodiu/);
  assert.match(r.motivo, /falha do harness, não do seu trabalho/);
});

// ————————————————————————————— B: o `delivery-gate` —————————————————————————————
//
// A TABELA DO PLANO NÃO O MENCIONA UMA ÚNICA VEZ. Ela foi escrita antes da Task 9: varrida a
// seção inteira, zero ocorrências de "push", "delivery", "auditoria", "aspasAbertas" ou
// "pré-passagem". Ele é bloqueante, é o único gate de push do projeto, é o verificador mais novo,
// e a composição dele com os outros nunca foi exercitada — que é literalmente o que esta tarefa
// existe para fazer.

function gitEm(dir, args) {
  execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'ignore', 'ignore'] });
}

/**
 * Repositório git de verdade, mono-repo, com um commit de feature à frente do `main`.
 *
 * Precisa ser git DE VERDADE: o gate pergunta ao `git` pelo branch corrente, pelos commits de
 * saída e pela árvore do repo de docs. Um dublê responderia o que quiséssemos e o cenário deixaria
 * de medir composição.
 */
function repoDeFeature(prefixo) {
  const raiz = novaRaiz(prefixo);
  mkdirSync(join(raiz, RAIZ_EXPLORE), { recursive: true });
  mkdirSync(join(raiz, DIR_AUDITORIAS), { recursive: true });
  gitEm(raiz, ['init', '-q', '-b', 'main']);
  gitEm(raiz, ['config', 'user.email', 'teste@harness']);
  gitEm(raiz, ['config', 'user.name', 'Teste']);
  gitEm(raiz, ['remote', 'add', 'origin', 'https://dev.azure.com/acme/portal/_git/App']);
  writeFileSync(join(raiz, 'README.md'), '# repo\n');
  gitEm(raiz, ['add', '.']);
  gitEm(raiz, ['commit', '-q', '-m', 'inicial']);
  gitEm(raiz, ['checkout', '-q', '-b', 'feat/us-1']);
  writeFileSync(join(raiz, 'novo.txt'), 'x\n');
  gitEm(raiz, ['add', '.']);
  gitEm(raiz, ['commit', '-q', '-m', 'feature']);
  return raiz;
}

/**
 * Um repositório só para todos os cenários que não escrevem auditoria — subir processo custa, e o
 * brief é explícito: dois ou três pushes bastam para provar a composição.
 */
let _semAuditoria = null;
const semAuditoria = () => (_semAuditoria || (_semAuditoria = repoDeFeature('comp-gate-')));

test('B1 — push de feature sem auditoria: nega o `delivery-gate`, que se nomeia na mensagem', () => {
  nega(
    semAuditoria(), rodarBash('git push origin feat/us-1'), 'delivery-gate',
    /^Delivery gate: nenhuma auditoria cobre os commits deste push/,
    /auditoria-de-us/,
  );
});

test('B2 — push para o branch de integração não é push de feature: libera', () => {
  libera(semAuditoria(), rodarBash('git push origin main'));
});

test('B3 — a linha de ALLOW do gate: auditoria ancorada e aprovada deixa o push passar', () => {
  // Sem esta, "o gate nega todo push" passaria em B1 e B4 sem ninguém notar.
  const raiz = repoDeFeature('comp-gate-ok-');
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: raiz, encoding: 'utf8' }).trim();
  porArquivo(raiz, `${DIR_AUDITORIAS}/US-001.md`, [
    '<!-- gate:status -->',
    'veredito: APROVADA',
    `commits-auditados: App@${sha}`,
    'achados-bloqueantes: nenhum',
    '<!-- /gate:status -->', '',
  ].join('\n'));
  libera(raiz, rodarBash('git push origin feat/us-1'));
});

// ——————————— C: composição pura — os DOIS bloqueantes de `Bash` no MESMO comando ———————————
//
// O CENÁRIO MAIS VALIOSO DESTA TAREFA, e ele não está no plano. `git push origin feat/x &&
// rm -rf .claude/hooks` morde no `escrita-bash` E no `delivery-gate`. A tabela de registro
// justifica POR ESCRITO qual vem primeiro (`pretooluse.mjs`: `escrita-bash` na entrada anterior,
// `delivery-gate` na seguinte) por duas razões, na ordem em que pesam: a mensagem do dano
// imediato é a acionável, e o gate é o único verificador que sobe subprocesso.
//
// Sem um cenário que prenda isso, alguém reordena a tabela e NADA fica vermelho — e o teste de
// composição estaria medindo verificadores um a um, que é o que a suíte já fazia.

test('C1 — cada bloqueante sozinho morde o comando que é dele', () => {
  const raiz = semAuditoria();
  nega(raiz, rodarBash('git push origin feat/us-1'), 'delivery-gate', /^Delivery gate:/);
  nega(raiz, rodarBash('rm -rf .claude/hooks'), 'escrita-bash', /`rm` escreve em `\.claude\/hooks`/);
});

test('C2 — os dois no MESMO comando: fala o `escrita-bash`, porque o dano imediato vem antes', () => {
  const r = nega(
    semAuditoria(), rodarBash('git push origin feat/us-1 && rm -rf .claude/hooks'), 'escrita-bash',
    /`rm` escreve em `\.claude\/hooks`/,
  );
  // A SEGUNDA RAZÃO DA ORDEM, medida em vez de prometida: `despachar` interrompe no primeiro deny,
  // então o gate — o único verificador que sobe subprocesso de `git` — nem chega a tocar o disco.
  // Num payload de `Bash` ele é o único consumidor de `io.lerDiretorio`, e por isso zero é prova.
  assert.equal(r.leituras, 0, 'o `delivery-gate` não podia ter rodado depois de um deny mais barato');
});

test('C3 — a ordem é OBSERVÁVEL: invertida no registro, o mesmo comando é negado pelo `delivery-gate`', () => {
  // ESTE É O FECHO DA TAREFA. Se reordenar a tabela de registro não mudasse a resposta, a
  // justificativa escrita no `pretooluse.mjs` não estaria presa por nada, e C2 estaria medindo o
  // `escrita-bash` sozinho em vez da composição dos dois.
  const raiz = semAuditoria();
  const comando = rodarBash('git push origin feat/us-1 && rm -rf .claude/hooks');

  const real = criarRegistro({ ...IO_REAL, cwd: () => raiz });
  const iEscrita = real.findIndex((v) => v.nome === 'escrita-bash');
  const iGate = real.findIndex((v) => v.nome === 'delivery-gate');
  assert.ok(iEscrita !== -1 && iGate !== -1, 'as duas travas de `Bash` têm que existir no registro');
  assert.ok(iEscrita < iGate, 'o `escrita-bash` vem ANTES do `delivery-gate` — ver a tabela de registro');

  const invertido = real.slice();
  invertido[iEscrita] = real[iGate];
  invertido[iGate] = real[iEscrita];

  const r = despachar(comando, invertido);
  assert.equal(r.acao, 'deny');
  assert.equal(quemFalou(r.motivo), 'delivery-gate', `com a ordem invertida quem fala é o gate:\n${r.motivo}`);
});

// ————————————————————————— D: a pré-passagem (rodada R) —————————————————————————
//
// O `gatherContext` disparava `git rev-parse` INCONDICIONALMENTE: `echo ola` pagava o spawn para o
// `parseGitTarget` responder, três linhas depois, que o comando era irrelevante. A pré-passagem é
// a pergunta barata que vem antes da cara.
//
// AQUI NÃO SE MEDE TEMPO — mede-se I/O CONTADO. `io.lerDiretorio` é a PRIMEIRA leitura de disco do
// gate, e no gatilho `Bash` ele é o único consumidor dela.

test('D1 — `echo ola` não paga nem uma leitura de diretório', () => {
  const r = libera(semAuditoria(), rodarBash('echo ola'));
  assert.equal(r.leituras, 0);
});

test('D2 — mas um push de verdade paga: a pré-passagem é superconjunto, não atalho cego', () => {
  // O par de D1. Sem ele, `podeSerRelevante` devolvendo `false` sempre — que desliga o único gate
  // de push do projeto — passaria em D1 e em D3 sem uma linha vermelha.
  const r = libera(semAuditoria(), rodarBash('git push origin main'));
  assert.ok(r.leituras > 0, 'o gate tinha que ter olhado o disco para descartar este push');
});

test('D3 — o falso positivo que a rodada S consertou continua liberado', () => {
  // `git push` DENTRO da mensagem de commit não é um push. Era `deny` antes da rodada S.
  const r = libera(semAuditoria(), rodarBash('git commit -m "corrige a; git push origin feat/x"'));
  assert.equal(r.leituras, 0);
});

// ————————————————————————— E: `aspasAbertas` (rodada T) —————————————————————————

test('E1 — aspa que não fecha + caminho protegido: nega, e a mensagem explica a aspa', () => {
  // Quatro famílias escapavam atrás de uma aspa não fechada. O consultor que vê um `echo` negado
  // não adivinha que o problema é a aspa — por isso a mensagem, e não só o veredito, é asserida.
  nega(
    preProjeto('comp-aspa-'),
    rodarBash('echo "a' + BS + '"b" && rm -rf .claude/hooks'),
    'escrita-bash',
    /\*\*aspa que não fecha\*\*/,
    /`\.claude\/hooks`/,
  );
});

test('E2 — aspa que não fecha SEM caminho protegido não é fecho cego', () => {
  libera(preProjeto('comp-aspa-ok-'), rodarBash("echo it's ok"));
});

// ——————————————————— F: caminho absoluto — o Step 2, e o defeito Critical da Fundação ———————————————————
//
// *"O defeito Critical da Fundação foi exatamente este."* O `norm()` recebia o formato que o
// `PreToolUse` de fato entrega e respondia diferente do formato que os testes usavam.

test('F1 — o MESMO alvo em três grafias dá o mesmo veredito e a MESMA trava (zona imutável)', () => {
  const raiz = preProjeto('comp-abs-zona-');
  const grafias = [
    ['relativo', '.claude/hooks/kit.mjs'],
    ['absoluto Windows', join(raiz, '.claude', 'hooks', 'kit.mjs')],
    ['absoluto com barra normal', raiz.split(BS).join('/') + '/.claude/hooks/kit.mjs'],
  ];
  for (const [rotulo, caminho] of grafias) {
    const r = veredito(raiz, escrever(caminho));
    assert.equal(r.acao, 'deny', rotulo);
    assert.equal(r.trava, 'zona-imutavel', rotulo);
    assert.match(r.motivo, /`\.claude\/hooks\/kit\.mjs` está na \*\*zona imutável\*\*/, rotulo);
  }
});

test('F2 — o mesmo, para o verificador que responde sobre a FASE e não sobre o arquivo', () => {
  // O `fecho-explore` recebe o caminho por outra porta (`ehPrimeiraAcaoDoPlan` + `dentroDaRaiz`),
  // e por isso ele precisa da própria medição — não basta o `zonas` estar certo.
  const raiz = preProjeto('comp-abs-fecho-', [`${RAIZ_EXPLORE}/gaps.md`]);
  const grafias = [
    'outputs/spec/modules.md',
    './outputs/spec/modules.md',
    join(raiz, RAIZ_SPEC, 'modules.md'),
    raiz.split(BS).join('/') + '/outputs/spec/modules.md',
  ];
  for (const caminho of grafias) {
    const r = veredito(raiz, escrever(caminho));
    assert.equal(r.acao, 'deny', caminho);
    assert.equal(r.trava, 'fecho-explore', caminho);
  }
});

test('F3 — absoluto de FORA do projeto libera: o harness governa este repositório, não o disco', () => {
  // O invariante que o `pretooluse.mjs` documenta em prosa. Negar aqui quebraria toda escrita
  // legítima fora do projeto — e as duas formas de absoluto precisam concordar.
  const raiz = preProjeto('comp-abs-fora-');
  libera(raiz, escrever('/home/outro-projeto/.claude/hooks/kit.mjs'));
  libera(raiz, escrever('D:/outro-projeto/.claude/hooks/kit.mjs'));
});

// ————————————————————————— G: a tabela de registro em si —————————————————————————

test('G1 — o `REGISTRO` de produção declara as sete travas, e o `Bash` tem exatamente duas', () => {
  // Amarra a tabela ao que os cenários acima afirmam sobre ela. Uma entrada removida deixaria os
  // cenários dela verdes por vacuidade se eles fossem escritos como "não nega" — não são, mas a
  // tabela é o objeto da tarefa e merece asserção direta.
  const nomes = REGISTRO.map((v) => v.nome);
  assert.deepEqual(nomes, [
    'zona-imutavel', 'congelamento', 'cadeia', 'fecho-explore', 'escrita-bash', 'escrita-powershell',
    'delivery-gate',
  ]);
  const doBash = REGISTRO.filter((v) => v.gatilhos.includes('Bash')).map((v) => v.nome);
  assert.deepEqual(doBash, ['escrita-bash', 'delivery-gate']);
  for (const v of REGISTRO) assert.equal(v.bloqueia, true, `${v.nome} é bloqueante`);
});
