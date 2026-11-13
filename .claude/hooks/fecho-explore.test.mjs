import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILLS_DO_PLAN, ehPrimeiraAcaoDoPlan, parseIsencao, decidir,
  avaliar, estadoRevisao, acharIsencao, montarIsencao, dentroDaRaiz,
} from './fecho-explore.mjs';
// A GRAMÁTICA DO KICKOFF VEM DO KIT, e não daqui. Ela morava neste arquivo (linhas 29–47) num
// formato — `> **KICKOFF YYYY-MM-DD** …` — que NÃO EXISTE no kit de referência, e o gate é
// BLOQUEANTE: um projeto iniciado corretamente pelo orquestrador tinha o fecho negado. Importar do
// kit é o conserto; não há reexportação por compatibilidade, e o teste logo abaixo prova isso.
import * as fecho from './fecho-explore.mjs';
import {
  MARCADOR_CONGELAMENTO, DIR_AUDITORIAS, DIR_ISENCOES, RAIZ_SPEC, RAIZ_EXPLORE,
  RE_KICKOFF, montarKickoff, lerKickoff, CABECALHO_SECAO_A, chave,
} from './kit.mjs';
import { REGISTRO, despachar, IO_REAL, criarRegistro } from './pretooluse.mjs';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, realpathSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const COMPLETO = {
  presentesExplore: new Set(['hld-funcional.md', 'especificacao-funcional.md', 'especificacao-tecnica.md', 'gaps.md']),
  presentesSpec: new Set(['sync-log.md', 'prototype.md', 'design-system.md', 'screens-manifest.json']),
  kickoff: { presente: true, legado: 'nao', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt' },
  manifestoValido: true,
  temPrototipo: true,
  // A fidelidade que o `prototype.md` declara (D9): o fecho só fecha o Explore com Alta.
  fidelidadePrototipo: 'alta',
  // Os opcionais ausentes SEM linha de dispensa no `gaps.md` (D8). Vazia: o `modelo-de-dados.md`
  // está ausente aqui (ver `presentesExplore`), e o projeto completo registrou a dispensa.
  dispensasFaltando: [],
  errosGramatica: [],
  // DOIS FATOS, e não um: o relatório existe, e é mais novo que o documento mais recente do
  // Explore. Eram um só campo (`revisaoExecutada`) até o conserto do I2 da Task 4 — e como
  // `revisaoFresca` respondia `false` tanto para "velho" quanto para `ENOENT`, a dispensa do
  // congelamento cobria os dois. A Decisão 22 dispensa só o FRESCOR.
  revisaoPresente: true,
  revisaoFresca: true,
  isencao: null,
};

// ————————————————————————— o piso: os 28 testes do plano —————————————————————————

test('a gramática do kickoff NÃO mora mais aqui, e não é reexportada', () => {
  // Reexportar por compatibilidade criaria DOIS caminhos de import para a mesma constante — que é
  // exatamente a divergência que esta tarefa fechou. As duas pontas: sumiu de lá, está aqui.
  for (const nome of ['RE_KICKOFF', 'montarKickoff', 'lerKickoff']) {
    assert.equal(fecho[nome], undefined, `${nome} não pode voltar a sair do fecho-explore`);
  }
  assert.equal(typeof montarKickoff, 'function');
  assert.equal(typeof lerKickoff, 'function');
  assert.ok(RE_KICKOFF instanceof RegExp);
});

test('o gate lê o kickoff NO FORMATO DO KIT — o formato inventado deixou de valer', () => {
  const doKit = montarKickoff({ legado: 'sim', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt' });
  const k = lerKickoff('# Sync Log\n\n' + doKit + '\n');
  assert.equal(k.presente, true);
  assert.equal(k.legado, 'sim');
  // O formato que este arquivo exigia até a Task 7. Ele nunca existiu no kit, e um projeto que o
  // orquestrador iniciou direito não o escreve nunca.
  const inventado = '> **KICKOFF 2026-08-25** · cliente: Acme · legado: sim · protótipo: obrigatório';
  assert.equal(lerKickoff('# Sync Log\n\n' + inventado + '\n').presente, false);
});

test('lerKickoff devolve ausente em sync-log sem a linha', () => {
  assert.equal(lerKickoff('# Sync Log\n\nSeção A\n').presente, false);
});

test('lerKickoff tolera texto vazio', () => {
  assert.equal(lerKickoff('').presente, false);
});

test('SKILLS_DO_PLAN contém spec-product e spec-tech-rules', () => {
  assert.ok(SKILLS_DO_PLAN.has('spec-product'));
  assert.ok(SKILLS_DO_PLAN.has('spec-tech-rules'));
});

test('u-1 — toda entrada do SKILLS_DO_PLAN já está em forma de `chave`', () => {
  // O invariante que a comparação por `chave` CRIA: a tabela virou o único lado não normalizado,
  // e uma entrada escrita com maiúscula não casaria NUNCA — o gate deixaria de morder naquela
  // skill em silêncio, com a suíte verde. É o mesmo tipo de armadilha que
  // `nenhuma exigência repete a raiz…` cobre na `PRE_REQUISITOS` do `cadeia.mjs`.
  for (const s of SKILLS_DO_PLAN) assert.equal(s, chave(s), s);
});

test('âncora de skill: spec-product é primeira ação do Plan', () => {
  assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: 'spec-product' } }, new Set()), true);
});

test('âncora de skill: spec-ingest NÃO dispara — ingestão vem antes do gate', () => {
  assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: 'spec-ingest' } }, new Set()), false);
});

test('âncora de skill: spec-benchmark é acelerador do Explore, não dispara', () => {
  assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: 'spec-benchmark' } }, new Set()), false);
});

test('âncora de arquivo: escrita fora da whitelist dispara', () => {
  const p = { tool_name: 'Write', tool_input: { file_path: 'outputs/spec/modules.md' } };
  assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), true);
});

test('âncora de arquivo: escrita na whitelist NÃO dispara', () => {
  for (const f of ['sync-log.md', 'context-map.md', 'prototype.md', 'screens/login.png']) {
    const p = { tool_name: 'Write', tool_input: { file_path: 'outputs/spec/' + f } };
    assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), false, f);
  }
});

test('D1 — âncora de arquivo: a saída da `spec-frame` NÃO dispara o fecho', () => {
  // A `spec-frame` é acelerador do Explore (pedido vago, antes da `spec-ingest`). Medido no teste
  // ponta a ponta da 2.6.0: `Write outputs/spec/frame.md` era NEGADO por este gate com «O Explore
  // ainda não está fechado» — a skill não conseguia gravar a própria saída na única fase onde roda.
  for (const f of ['frame.md', 'frame/pre-prototype/lista-de-pedidos.html']) {
    const p = { tool_name: 'Write', tool_input: { file_path: 'outputs/spec/' + f } };
    assert.equal(ehPrimeiraAcaoDoPlan(p), false, f);
  }
});

test('âncora de arquivo: escrita em outputs/explore NÃO dispara', () => {
  const p = { tool_name: 'Write', tool_input: { file_path: 'outputs/explore/gaps.md' } };
  assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), false);
});

test('âncora de skill: a skill VINDA DE PLUGIN também dispara', () => {
  // Skill servida por plugin é invocada como `plugin:skill` e chega PREFIXADA no payload —
  // `superpowers:` e `anthropic-skills:` são prefixos vivos nesta máquina. Comparando a string
  // inteira — como o plano escreveu — a âncora de skill NUNCA casa em produção: metade da
  // Decisão 13 fica decorativa, com a suíte verde, e sobra só a âncora de arquivo, que morde
  // depois de a skill já ter escrito. A forma NUA — a que a vendorização produz — é medida pelo
  // teste `âncora de skill: spec-product é primeira ação do Plan`, acima: as duas têm teste.
  for (const s of ['algum-plugin:spec-product', 'outro-plugin:spec-tech-rules']) {
    assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: s } }), true, s);
  }
});

test('âncora de skill: prefixo de plugin não faz qualquer skill disparar', () => {
  for (const s of ['algum-plugin:spec-ingest', 'x:spec-benchmark', 'spec-product:extra']) {
    assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: s } }), false, s);
  }
});

test('u-1 — o nome da skill é comparado por `chave`, como o caminho logo abaixo', () => {
  // MESMA POLÍTICA do corte de caminho desta função e do `ehExcecaoDeFronteira`: a caixa não
  // separa. Não é buraco observado — as skills reais são todas minúsculas e nenhuma das 68
  // invocações medidas nos transcritos traz maiúscula. É CONSISTÊNCIA: o `sync-log.mjs` já
  // compara nome de skill por `chave`, e este gate era a segunda cópia divergente da mesma
  // pergunta. AS DUAS skills do `SKILLS_DO_PLAN`, porque uma só não prova a outra.
  for (const s of ['Spec-Product', 'SPEC-PRODUCT', 'Spec-Tech-Rules', 'SPEC-TECH-RULES']) {
    assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: s } }), true, s);
  }
  // AS DUAS TRANSFORMAÇÕES JUNTAS: corte de prefixo de plugin E caixa.
  for (const s of ['algum-plugin:Spec-Product', 'outro-plugin:SPEC-TECH-RULES']) {
    assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: s } }), true, s);
  }
  // A OUTRA PONTA: sem ela, "insensível a caixa" e "dispara para tudo" passam pelo mesmo teste.
  for (const s of ['Spec-Ingest', 'SPEC-BENCHMARK', 'Spec-Report', 'algum-plugin:Spec-Ingest']) {
    assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Skill', tool_input: { skill: s } }), false, s);
  }
});

test('âncora de arquivo: `outputs/Spec/` com outra caixa é o MESMO diretório e dispara', () => {
  // Espelha o `wiring I5` do `pretooluse.test.mjs`. O corte do plano era sensível a caixa, e
  // `outputs/Spec/modules.md` — que no Windows é o mesmo arquivo — passava batido.
  const p = { tool_name: 'Write', tool_input: { file_path: 'outputs/Spec/modules.md' } };
  assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), true);
});

test('tool irrelevante não dispara', () => {
  assert.equal(ehPrimeiraAcaoDoPlan({ tool_name: 'Read', tool_input: { file_path: 'x' } }, new Set()), false);
});

test('decidir libera o Explore completo', () => {
  assert.equal(decidir(COMPLETO).acao, 'allow');
});

test('decidir nega quando falta documento obrigatório', () => {
  const r = decidir({ ...COMPLETO, presentesExplore: new Set(['hld-funcional.md']) });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /especificacao-funcional\.md/);
});

test('modelo-de-dados ausente COM a linha de dispensa NÃO bloqueia — é opcional', () => {
  assert.equal(decidir(COMPLETO).acao, 'allow');
  assert.ok(!/modelo-de-dados/.test(decidir(COMPLETO).motivo || ''));
});

test('D8 — modelo-de-dados ausente SEM a linha de dispensa bloqueia, e é a única coisa que a negação acusa', () => {
  // O par do teste acima. O fato vem do `avaliar` (`dispensasFaltando`); aqui se mede o que o
  // `decidir` faz com ele — e que ele não arrasta outro item junto.
  const r = decidir({ ...COMPLETO, dispensasFaltando: ['modelo-de-dados.md'] });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /`modelo-de-dados\.md` ausente e sem dispensa/);
  assert.ok(!/kickoff|Manifesto inválido|revisao\.json|Fidelidade/.test(r.motivo), r.motivo);
});

test('D9 — no `decidir`, só `alta` fecha; Média, Baixa, o template e a ausência negam', () => {
  for (const declarada of ['alta', 'Alta', 'ALTA (frontend completo)']) {
    assert.equal(decidir({ ...COMPLETO, fidelidadePrototipo: declarada }).acao, 'allow', declarada);
  }
  for (const declarada of ['média', 'baixa', 'baixa | média | alta', 'altíssima', null]) {
    const r = decidir({ ...COMPLETO, fidelidadePrototipo: declarada });
    assert.equal(r.acao, 'deny', String(declarada));
    assert.match(r.motivo, /[Ff]idelidade/, String(declarada));
  }
  // Sem o `prototype.md`, a fidelidade não é perguntada: o item do protótipo já diz o que falta.
  const semPrototipo = decidir({
    ...COMPLETO, fidelidadePrototipo: null, temPrototipo: false,
    presentesSpec: new Set(['sync-log.md', 'design-system.md', 'screens-manifest.json']),
  });
  assert.equal(semPrototipo.acao, 'deny');
  assert.ok(!/Fidelidade do protótipo não declarada/.test(semPrototipo.motivo), semPrototipo.motivo);
});

test('a negação por kickoff ENSINA o formato do kit, e o que ela ensina é inerte', () => {
  // Trava bloqueante que não diz o que escrever manda o consultor adivinhar — e foi adivinhando
  // que este arquivo inventou o formato antigo. A linha citada é MONTADA pelo dono da gramática,
  // para não haver uma segunda cópia do formato aqui dentro.
  const r = decidir({ ...COMPLETO, kickoff: { presente: false } });
  assert.equal(r.acao, 'deny');
  for (const campo of [/kickoff: legado=/, /ramo=/, /ambiente=/, /inputs=/]) {
    assert.match(r.motivo, campo);
  }
  assert.ok(!/\*\*KICKOFF /.test(r.motivo), 'a mensagem não pode ensinar o formato inventado');
  // E colar a linha da mensagem sem preencher NÃO declara kickoff nenhum: ela é só placeholder.
  assert.equal(lerKickoff(r.motivo).presente, false);
});

test('a trava NÃO nega um `legado=` que termina em separador do kit', () => {
  // A CLASSE da `RE_KICKOFF` chega até aqui, e não é detalhe de formato: ela decide onde o valor de
  // `legado=` termina. `legado=Sim|Parcial` é a forma que a documentação do kit usa para dizer «Sim
  // ou Parcial», e a classe corta no `|` exatamente como a `KICKOFF_LEGACY_RE` do
  // `check-outputs.py:231` — o valor é `Sim` e a linha DECLARA.
  //
  // Afrouxar a classe para `\S+` faz o valor virar `Sim|Parcial` inteiro, o `limparValor` o descarta
  // como placeholder, `presente` cai para `false` — e esta trava BLOQUEANTE passa a NEGAR o fecho de
  // um projeto cujo sync-log está certo. É o mesmo falso positivo do formato inventado, na classe da
  // regex em vez de na estrutura dela; medido, a troca sobrevivia à suíte inteira.
  const k = lerKickoff('# Sync Log\n\nkickoff: legado=Sim|Parcial\n');
  assert.equal(k.presente, true);
  assert.equal(k.legado, 'sim');
  assert.equal(decidir({ ...COMPLETO, kickoff: k }).acao, 'allow');
  // A outra ponta: a trava continua fechando quando não há kickoff nenhum.
  assert.equal(decidir({ ...COMPLETO, kickoff: { presente: false } }).acao, 'deny');
});

test('este arquivo não guarda uma segunda cópia do formato do kickoff', () => {
  // A doutrina que esta tarefa impôs à `plan.md`, aplicada ao próprio verificador: fonte escrita
  // duas vezes diverge. O `fecho-explore.mjs` repetia a linha literal do kickoff num comentário
  // enquanto o `montarKickoff` a monta — e é justamente por ter escrito o formato por conta própria
  // que este arquivo inventou o antigo. Agora o comentário APONTA o dono da gramática.
  const fonte = readFileSync(new URL('./fecho-explore.mjs', import.meta.url), 'utf8');
  // O placeholder do `ambiente=` vem do formato canônico do kit (`task-pipeline.md` §4), não de um
  // literal daqui: quando o kit ganhou o `kiro` (plano de melhoria das skills, item 1.10), um
  // literal fixo neste teste teria ficado para trás em silêncio.
  const canonico = readFileSync(new URL('../skills/tools/references/task-pipeline.md', import.meta.url), 'utf8');
  const ambiente = canonico.match(/^kickoff: .*· ambiente=(<[^>]+>) ·/m)?.[1];
  assert.ok(ambiente, 'o task-pipeline.md §4 não traz mais a linha canônica do kickoff');
  const literal = montarKickoff({
    legado: '<Sim|Parcial|Não>', ramo: '<A|B>', ambiente, inputs: '<lista>',
  });
  assert.ok(!fonte.includes(literal), 'o formato do kickoff não pode estar escrito neste arquivo');
  // Os pedaços que dão para copiar sozinhos também não: `· ramo=` só aparece nessa linha.
  assert.ok(!/·\s*ramo=/.test(fonte), 'nem um trecho da linha pode estar copiado aqui');

  // A OUTRA PONTA: a mensagem de negação continua ENSINANDO a linha inteira, montada pelo dono.
  // Sem esta metade, apagar a citação da mensagem passaria — e trava que não diz o que escrever
  // manda o consultor adivinhar, que é como o formato inventado nasceu.
  const r = decidir({ ...COMPLETO, kickoff: { presente: false } });
  assert.equal(r.acao, 'deny');
  assert.ok(r.motivo.includes(literal), 'a mensagem tem que trazer a linha literal do kit');
});

test('decidir nega sem linha de kickoff', () => {
  const r = decidir({ ...COMPLETO, kickoff: { presente: false } });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /kickoff/i);
});

test('decidir nega sem manifesto válido', () => {
  const r = decidir({ ...COMPLETO, manifestoValido: false });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /workspace\.md|manifesto/i);
});

test('decidir nega sem protótipo', () => {
  const r = decidir({ ...COMPLETO, temPrototipo: false });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /prot(ó|o)tipo/i);
});

test('decidir nega com erro de gramática, citando o arquivo', () => {
  const r = decidir({ ...COMPLETO, errosGramatica: [{ arquivo: 'outputs/explore/gaps.md', erros: ['token <produto> não trocado'] }] });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /gaps\.md/);
  assert.match(r.motivo, /<produto>/);
});

test('decidir nega sem o relatório de revisão executado', () => {
  // As duas formas de "não executado" negam, e por mensagens DIFERENTES: quem nunca emitiu precisa
  // emitir, e quem emitiu antes da última edição precisa reemitir.
  const velho = decidir({ ...COMPLETO, revisaoFresca: false });
  assert.equal(velho.acao, 'deny');
  assert.match(velho.motivo, /revisao/i);
  const ausente = decidir({ ...COMPLETO, revisaoPresente: false, revisaoFresca: false });
  assert.equal(ausente.acao, 'deny');
  assert.match(ausente.motivo, /revisao/i);
});

test('GAP aberto NÃO bloqueia — é combustível do Plan', () => {
  const r = decidir({ ...COMPLETO, gapsAbertos: 7 });
  assert.equal(r.acao, 'allow');
});

test('isenção válida libera mesmo com tudo faltando', () => {
  const r = decidir({
    ...COMPLETO,
    presentesExplore: new Set(), temPrototipo: false, kickoff: { presente: false },
    isencao: { repositorio: 'https://dev.azure.com/o/p/_git/r', autor: 'Fulano', data: '2026-08-25', motivo: 'pré-projeto herdado de outro fornecedor' },
  });
  assert.equal(r.acao, 'allow');
  assert.match(r.motivo || '', /isen/i);
});

test('isenção sem motivo não vale', () => {
  const r = decidir({ ...COMPLETO, presentesExplore: new Set(), isencao: { repositorio: 'x', autor: 'y', data: '2026-08-25', motivo: '' } });
  assert.equal(r.acao, 'deny');
});

// ————— As duas mensagens NÃO podem prometer o ledger —————
//
// O texto do plano dizia "Registrada no ledger" e "o gate honra e registra". Medido:
// `LEDGER_GATE` existe no `kit.mjs` e não tem consumidor nenhum. O consultor lia aquilo,
// declarava isenção e concluía que havia trilha de auditoria das dispensas — e não havia.
//
// Estes dois testes existem para que a promessa não volte por acidente numa "melhoria de
// mensagem". Se alguém implementar o ledger de verdade, que mude os testes com justificativa,
// em vez de descobrir por acaso que a mensagem voltou a mentir.

test('a isenção honrada NÃO promete ledger — diz onde o registro de fato está', () => {
  const r = decidir({
    ...COMPLETO,
    presentesExplore: new Set(),
    isencao: { repositorio: 'https://dev.azure.com/o/p/_git/r', autor: 'Fulano', data: '2026-08-25', motivo: 'escopo herdado' },
  });
  assert.equal(r.acao, 'allow');
  assert.ok(!/ledger/i.test(r.motivo), `a mensagem promete ledger, que não existe: ${r.motivo}`);
  assert.match(r.motivo, new RegExp(DIR_ISENCOES.replace(/[/\\]/g, '.')));
  assert.match(r.motivo, /git/i);
});

test('a negação NÃO promete que o gate registra a isenção', () => {
  const r = decidir({ ...COMPLETO, presentesExplore: new Set() });
  assert.equal(r.acao, 'deny');
  assert.ok(!/honra e registra|no ledger/i.test(r.motivo), `a negação promete registro que não acontece: ${r.motivo}`);
  assert.match(r.motivo, /registro da decisão/i);
});

test('a negação lista TODOS os problemas, não só o primeiro', () => {
  const r = decidir({ ...COMPLETO, presentesExplore: new Set(), temPrototipo: false, kickoff: { presente: false } });
  assert.match(r.motivo, /kickoff/i);
  assert.match(r.motivo, /prot(ó|o)tipo/i);
  assert.match(r.motivo, /hld-funcional/);
});

test('parseIsencao lê os campos do bloco', () => {
  const t = [
    '<!-- gate:isencao -->',
    'repositorio: https://dev.azure.com/o/p/_git/r',
    'autor: Fulano',
    'data: 2026-08-25',
    'motivo: pré-projeto herdado',
    '<!-- /gate:isencao -->',
  ].join('\n');
  const i = parseIsencao(t);
  assert.equal(i.autor, 'Fulano');
  assert.equal(i.motivo, 'pré-projeto herdado');
});

test('parseIsencao devolve null sem o bloco', () => {
  assert.equal(parseIsencao('# Isenção\n\nsem bloco'), null);
});

// Os três que o plano exige em prosa, na seção da interação com o marcador de congelamento.

test('o MARCADOR de congelamento NÃO dispara o gate — escrevê-lo é a conclusão do Explore', () => {
  const p = { tool_name: 'Write', tool_input: { file_path: MARCADOR_CONGELAMENTO } };
  assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), false);
});

test('a exceção do marcador não afrouxou o resto: modules.md continua disparando', () => {
  const p = { tool_name: 'Write', tool_input: { file_path: 'outputs/spec/modules.md' } };
  assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), true);
});

test('NotebookEdit traz o caminho em notebook_path, e a âncora de arquivo o pega', () => {
  // `input.file_path` sozinho devolvia `null` para toda escrita de notebook, e o gate — com
  // `NotebookEdit` declarado no gatilho — liberava em silêncio. É o terceiro lugar do plano onde
  // o mesmo erro aparece; por isso a extração tem dono único no `kit.mjs`.
  const p = { tool_name: 'NotebookEdit', tool_input: { notebook_path: 'outputs/spec/modules.md' } };
  assert.equal(ehPrimeiraAcaoDoPlan(p, new Set()), true);
});

// ————————————————————————— a casca de I/O, com `io` injetado —————————————————————————
//
// A casca do plano chamava `process.cwd()` e o disco direto, sem ponto de injeção. Medido antes
// desta rodada: com os 28 testes acima, `avaliar` virando NO-OP COMPLETO — o gate inteiro
// desligado — deixava a suíte verde, e o mesmo valia para o frescor sempre `true` e
// `acharIsencao` nunca achando. É a restrição global 5 do plano, e é o defeito literal que ela
// nomeia. Tudo daqui para baixo roda por `avaliar(payload, io)`.

const ehWindows = process.platform === 'win32';
const RAIZ = ehWindows ? 'C:\\proj' : '/proj';

function normal(p) {
  return String(p).replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Caminho relativo à RAIZ de mentira, ou `null` quando está fora dela. */
function relDe(abs) {
  const alvo = normal(abs);
  const base = normal(RAIZ);
  if (alvo.toLowerCase() === base.toLowerCase()) return '';
  if (!alvo.toLowerCase().startsWith(base.toLowerCase() + '/')) return null;
  return alvo.slice(base.length + 1);
}

function erro(code) {
  const e = new Error(code);
  e.code = code;
  throw e;
}

/**
 * Sistema de arquivos de mentira: mapa de caminho relativo (POSIX) → `{ texto, mtime, erro }`.
 * `chamadas` registra o que a casca consultou, para que teste de desempenho e de ordem tenha
 * como afirmar. `dirIlegivel` simula `EACCES` num diretório que EXISTE — o outro lado da
 * restrição 1.
 */
function ioFalso(arquivos, opcoes = {}) {
  const nomes = Object.keys(arquivos);
  const chamadas = [];
  const ehDir = (rel) => rel === '' || nomes.some((n) => n.startsWith(rel + '/'));
  return {
    chamadas,
    cwd: () => RAIZ,
    lerArquivo(abs) {
      const rel = relDe(abs);
      chamadas.push(['lerArquivo', rel]);
      if (rel === null || !(rel in arquivos)) erro('ENOENT');
      if (arquivos[rel].erro) erro(arquivos[rel].erro);
      return arquivos[rel].texto;
    },
    lerDiretorio(dir) {
      const rel = relDe(dir);
      chamadas.push(['lerDiretorio', rel]);
      if (rel !== null && opcoes.dirIlegivel === rel) erro('EACCES');
      if (rel === null || !ehDir(rel)) erro('ENOENT');
      const filhos = new Map();
      for (const n of nomes) {
        if (rel !== '' && !n.startsWith(rel + '/')) continue;
        const resto = rel === '' ? n : n.slice(rel.length + 1);
        const partes = resto.split('/');
        if (!filhos.has(partes[0])) filhos.set(partes[0], partes.length > 1);
      }
      return [...filhos].map(([name, dirq]) => ({
        name, isDirectory: () => dirq, isFile: () => !dirq,
      }));
    },
    statMs(abs) {
      const rel = relDe(abs);
      chamadas.push(['statMs', rel]);
      if (rel === null || !(rel in arquivos)) erro('ENOENT');
      if (arquivos[rel].erro) erro(arquivos[rel].erro);
      return arquivos[rel].mtime == null ? 1000 : arquivos[rel].mtime;
    },
    // A QUINTA OPERAÇÃO, e ela LÊ O MESMO DISCO DE MENTIRA. Entrou com a Decisão 22, quando o
    // `fecho-explore` virou o segundo consumidor do `io.exploreCongelado` — sem ela, `avaliar`
    // chama `undefined` e TODO teste de casca deste arquivo quebra com `TypeError`, medido.
    //
    // DERIVADA DO MAPA, e não `() => false` fixo, por duas razões. A primeira é honestidade: o
    // `IO_REAL.exploreCongelado` faz um `stat` no marcador, então a dublê que responde pela
    // presença dele no mapa é a que modela a mesma coisa. A segunda é neutralidade: nenhum fixture
    // existente tem o marcador, então a resposta é `false` para os testes de casca já verdes e o
    // veredito deles não muda — conferido rodando. Um `() => false` fixo mentiria no dia em que um
    // fixture pusesse o marcador no mapa, e mentiria em silêncio.
    exploreCongelado(raizProjeto) {
      const rel = relDe(raizProjeto);
      chamadas.push(['exploreCongelado', rel]);
      if (rel === null) return false;
      return (rel ? `${rel}/${MARCADOR_CONGELAMENTO}` : MARCADOR_CONGELAMENTO) in arquivos;
    },
  };
}

const MANIFESTO_OK = [
  '# Workspace do projeto',
  '',
  '<!-- harness:workspace -->',
  '- papel: docs',
  '  repositorio: https://dev.azure.com/acme/portal/_git/portal-docs',
  '- papel: prototipo',
  '  repositorio: https://dev.azure.com/acme/portal/_git/portal-proto',
  '<!-- /harness:workspace -->',
  '',
].join('\n');

const CABECALHO = (titulo) => [
  `# ${titulo} — Portal de Cobrança`,
  '',
  '> **Fase:** Explore · **Versão:** 0.1',
  '',
  '## Changelog',
  '',
  '| Versão | Data | Mudança |',
  '|---|---|---|',
  '| 0.1 | 2026-08-20 | versão inicial |',
  '',
].join('\n');

/** Os quatro documentos obrigatórios, bem escritos — nenhum token de template, nenhuma seção vazia. */
const DOCS_BONS = {
  'hld-funcional.md': CABECALHO('HLD Funcional') + [
    '## Visão geral',
    '',
    'O portal centraliza a emissão e o acompanhamento de boletos dos clientes corporativos.',
    '',
    '## Módulos',
    '',
    '| Código | Nome | O que faz |',
    '|---|---|---|',
    '| MOD-COBRANCA | Cobrança | emite, reemite e baixa boletos |',
    '| MOD-ACOMP-CARGA | Acompanhamento | acompanha a carga diária de retorno bancário |',
    '',
  ].join('\n'),
  'especificacao-funcional.md': CABECALHO('Especificação Funcional') + [
    '## Personas',
    '',
    'Analista de cobrança: emite e acompanha boletos do carteira corporativa.',
    '',
    '## Funcionalidades',
    '',
    '| ID | Nome | O que faz |',
    '|---|---|---|',
    '| RF-001 | Emitir boleto | gera o boleto a partir do título em aberto |',
    '| RF-002 | Reemitir boleto | reemite com nova data de vencimento |',
    '',
    '## Regras de negócio',
    '',
    '| ID | Enunciado |',
    '|---|---|',
    '| RN-001 | Boleto vencido há mais de 30 dias não pode ser reemitido. |',
    '',
  ].join('\n'),
  'especificacao-tecnica.md': CABECALHO('Especificação Técnica') + [
    '## Camadas',
    '',
    'Front em Next.js, API em .NET, banco relacional gerenciado.',
    '',
    '## Integrações',
    '',
    'Retorno bancário CNAB240 diário, consumido por job agendado.',
    '',
    '## Premissas',
    '',
    'O ERP continua sendo a fonte de verdade dos títulos.',
    '',
  ].join('\n'),
  'gaps.md': CABECALHO('GAPs e Questões Abertas') + [
    '## Questões abertas',
    '',
    '| ID | Descrição | Status | Impacto | Responsável |',
    '|---|---|---|---|---|',
    '| GAP-001 | Prazo de vencimento padrão ainda não definido | ⏳ Aguardando | alto | Financeiro |',
    '',
    '## Dispensas registradas',
    '',
    '| Artefato dispensado | Motivo | Quem decidiu | Data |',
    '|---|---|---|---|',
    '| modelo-de-dados.md | o produto reusa o modelo do ERP atual | Comitê | 2026-08-20 |',
    '',
  ].join('\n'),
};

const KICKOFF = montarKickoff({ legado: 'nao', ramo: 'A', ambiente: 'claude', inputs: 'inputs/reuniao-01.txt' });

/** O que este gate EXIGIA até a Task 7, e que o kit nunca conheceu. Fixture do contraexemplo. */
const KICKOFF_INVENTADO = '> **KICKOFF 2026-08-25** · cliente: Acme · legado: nao · protótipo: obrigatório';

/**
 * O `prototype.md` de um protótipo que FECHA o Explore: a linha `Fidelidade:` do cabeçalho do
 * template da `spec-prototype` declara Alta. Desde o D9 do teste ponta a ponta o fecho confere essa
 * linha, e o fixture sem ela — o que vigorou até aqui — passou a ser um protótipo que não declara
 * fidelidade nenhuma, que o gate nega.
 */
const PROTOTIPO_ALTA = '# Protótipo\n\nModo: geração\nFidelidade: alta\n\nSeis estados por tela.\n';

/** Projeto de mentira COMPLETO: os seis itens do gate satisfeitos. */
function projetoCompleto(extras = {}) {
  const arq = {
    'workspace.md': { texto: MANIFESTO_OK, mtime: 100 },
    'outputs/spec/sync-log.md': { texto: '# Sync Log\n\n' + KICKOFF + '\n', mtime: 100 },
    'outputs/spec/prototype.md': { texto: PROTOTIPO_ALTA, mtime: 100 },
    'outputs/spec/design-system.md': { texto: '# Design System\n\nTokens e componentes.\n', mtime: 100 },
    'outputs/spec/screens-manifest.json': { texto: '{"telas":[]}', mtime: 100 },
    'outputs/spec/revisao.json': { texto: '{"versao":"1.0"}', mtime: 900 },
  };
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    arq[`${RAIZ_EXPLORE}/${nome}`] = { texto, mtime: 500 };
  }
  return { ...arq, ...extras };
}

const escrever = (caminho) => ({ tool_name: 'Write', tool_input: { file_path: caminho } });
const PROD = { tool_name: 'Skill', tool_input: { skill: 'spec-product' } };

test('casca — ação que NÃO atravessa a fronteira devolve null, e não toca o disco', () => {
  // F15 em outra forma: se `avaliar` liberasse cedo demais ou tarde demais, este teste e o
  // seguinte discordariam. `null` é "não é comigo"; `allow` é "olhei e está tudo certo".
  const io = ioFalso(projetoCompleto());
  assert.equal(avaliar(escrever(`${RAIZ}/outputs/spec/sync-log.md`), io), null);
  assert.equal(avaliar({ tool_name: 'Skill', tool_input: { skill: 'spec-ingest' } }, io), null);
  assert.deepEqual(io.chamadas, [], 'fora da fronteira não pode haver I/O nenhum');
});

test('casca — projeto de mentira COMPLETO libera o spec-product', () => {
  const r = avaliar(PROD, ioFalso(projetoCompleto()));
  assert.equal(r.acao, 'allow', r && r.motivo);
});

test('casca — o sync-log DO KIT libera; o do formato inventado NEGA (a trava mudou de lado)', () => {
  // Esta é a mudança de comportamento de uma trava BLOQUEANTE, medida onde ela morde. Antes da
  // Task 7 as duas linhas trocavam de veredito: o projeto iniciado corretamente pelo orquestrador
  // (`KICKOFF_PERSISTED`, `spec/SKILL.md:258`) era NEGADO, e o formato que nós inventamos passava.
  const comOKit = avaliar(PROD, ioFalso(projetoCompleto()));
  assert.equal(comOKit.acao, 'allow', comOKit && comOKit.motivo);

  const comOInventado = avaliar(PROD, ioFalso(projetoCompleto({
    'outputs/spec/sync-log.md': { texto: '# Sync Log\n\n' + KICKOFF_INVENTADO + '\n', mtime: 100 },
  })));
  assert.equal(comOInventado.acao, 'deny');
  assert.match(comOInventado.motivo, /kickoff/i);
});

test('casca — registro legítimo com `HH:MM` em OUTRA célula não é exemplo, e o gate LIBERA', () => {
  // A regra 3 do kit restringe o placeholder de data à SEGUNDA célula, e é AQUI que a proteção
  // paga: casar `HH:MM` em qualquer ponto da linha — o `_is_template_row` ingênuo, regressão que o
  // próprio kit documenta — apaga a linha do escopo, o kickoff desaparece e esta trava BLOQUEANTE
  // nega um projeto que registrou corretamente. Falso positivo sobre trabalho correto, na trava.
  const linha = [
    '| 1 | 2026-08-25 14:32 | spec-ingest |', KICKOFF, '| inputs/reuniao-01.txt |',
    'context-map.md | janela de corte declarada no formato HH:MM | consultor | spec-legacy |',
  ].join(' ');
  const r = avaliar(PROD, ioFalso(projetoCompleto({
    'outputs/spec/sync-log.md': {
      texto: '# Sync Log\n\n## Seção A\n\n' + CABECALHO_SECAO_A + '\n' + linha + '\n',
      mtime: 100,
    },
  })));
  assert.equal(r.acao, 'allow', r && r.motivo);

  // A OUTRA PONTA: a MESMA linha com o placeholder NA COLUNA DE DATA é a linha de exemplo do
  // template, não declara kickoff nenhum, e o gate volta a negar. Sem esta metade, "nunca é
  // exemplo" passaria — e o template passaria a satisfazer o gate sozinho.
  const comoExemplo = linha.replace('2026-08-25 14:32', 'YYYY-MM-DD HH:MM');
  const r2 = avaliar(PROD, ioFalso(projetoCompleto({
    'outputs/spec/sync-log.md': {
      texto: '# Sync Log\n\n## Seção A\n\n' + CABECALHO_SECAO_A + '\n' + comoExemplo + '\n',
      mtime: 100,
    },
  })));
  assert.equal(r2.acao, 'deny');
  assert.match(r2.motivo, /kickoff/i);
});

test('casca — projeto VAZIO nega, e o motivo cita cada item que falta', () => {
  // F15: com `avaliar` virando no-op este é o primeiro a ficar vermelho.
  const r = avaliar(PROD, ioFalso({}));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /hld-funcional\.md/);
  assert.match(r.motivo, /especificacao-funcional\.md/);
  assert.match(r.motivo, /especificacao-tecnica\.md/);
  assert.match(r.motivo, /gaps\.md/);
  assert.match(r.motivo, /kickoff/i);
  assert.match(r.motivo, /prot(ó|o)tipo/i);
  assert.match(r.motivo, /manifesto|workspace\.md/i);
  assert.match(r.motivo, /revisao/i);
});

test('casca — cada item do gate, removido sozinho do projeto completo, NEGA por si', () => {
  const casos = [
    ['documento do Explore', [`${RAIZ_EXPLORE}/gaps.md`], /gaps\.md/],
    ['manifesto', ['workspace.md'], /manifesto|workspace\.md/i],
    ['kickoff', ['outputs/spec/sync-log.md'], /kickoff/i],
    ['protótipo', ['outputs/spec/screens-manifest.json'], /prot(ó|o)tipo/i],
    ['relatório de revisão', ['outputs/spec/revisao.json'], /revisao/i],
  ];
  for (const [nome, remover, esperado] of casos) {
    const arq = projetoCompleto();
    for (const r of remover) delete arq[r];
    const r = avaliar(PROD, ioFalso(arq));
    assert.equal(r.acao, 'deny', nome);
    assert.match(r.motivo, esperado, nome);
  }
});

test('casca — documento mal formado do Explore NEGA, citando arquivo e defeito', () => {
  const arq = projetoCompleto();
  arq[`${RAIZ_EXPLORE}/gaps.md`] = { texto: '# GAPs — <produto>\n\n> **Versão:** 0.1\n\n## Changelog\n\n| 0.1 | <data> | inicial |\n\n## Questões abertas\n\nnada ainda\n', mtime: 500 };
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /gaps\.md/);
  assert.match(r.motivo, /<produto>/);
});

test('casca — o `prototype.md` de outputs/spec NÃO é validado como documento do Explore', () => {
  // O `carregarDocs` devolve `prototype.md` (de outputs/spec) na mesma lista dos quatro do
  // Explore. Ele tem validador `check-modules`, não `check-explore`, e por isso um token de
  // template dentro dele NÃO pode virar negação do fecho — a gramática do Explore não é o
  // contrato dele.
  //
  // O que este teste NÃO prova é a raiz do rótulo (`outputs/spec/` vs `outputs/explore/`): medido,
  // as duas formas devolvem lista vazia hoje, e a mutação que fixa `RAIZ_EXPLORE` é EQUIVALENTE.
  // Ver o comentário em `avaliar`.
  const arq = projetoCompleto();
  arq['outputs/spec/prototype.md'] = { texto: '# Protótipo — <produto>\n\nFidelidade: alta\n', mtime: 100 };
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'allow', r && r.motivo);
});

// ————— D8 do teste ponta a ponta: a dispensa do `modelo-de-dados.md` —————
//
// A `explore.md` e o template do `gaps.md` prometiam que a ausência do modelo de dados exige linha
// de dispensa e que «o fecho verifica». Medido: tirada a linha, o fecho continuava liberando — o
// `kit.mjs` marca o documento `obrigatorio: false` e ninguém lia o `gaps.md` procurando a dispensa.

/** O `gaps.md` bom, com a dispensa trocada pela de OUTRO artefato: a seção continua preenchida. */
const GAPS_SEM_DISPENSA_DO_MODELO = DOCS_BONS['gaps.md'].replace(
  '| modelo-de-dados.md | o produto reusa o modelo do ERP atual | Comitê | 2026-08-20 |',
  '| benchmark.md | o cliente não tem concorrente direto no segmento | Comitê | 2026-08-20 |',
);

test('D8 — `dispensaRegistrada`: a linha do template com o nome e os três campos de verdade conta', () => {
  const tabela = (linha) => [
    '## Dispensas registradas', '',
    '| Artefato dispensado | Motivo | Quem decidiu | Data |', '|---|---|---|---|', linha, '',
  ].join('\n');
  const conta = (linha) => fecho.dispensaRegistrada(tabela(linha), 'modelo-de-dados.md');
  // As formas que contam: nome nu, com crase, sem `.md`, com link; cabeçalho sem acento.
  assert.equal(conta('| modelo-de-dados.md | nasce da spec-data-model | Consultor | 2026-10-21 |'), true);
  assert.equal(conta('| `modelo-de-dados.md` | nasce da spec-data-model | Consultor | 2026-10-21 |'), true);
  assert.equal(conta('| [modelo-de-dados](./modelo-de-dados.md) | nasce da spec-data-model | Consultor | 2026-10-21 |'), true);
  assert.equal(fecho.dispensaRegistrada(tabela('| Modelo-de-Dados | x | y | 2026-10-21 |')
    .replace('Artefato dispensado', 'ARTEFATO DISPENSADO'), 'modelo-de-dados.md'), true);
  // As que não contam: outro artefato, campo de exemplo, campo vazio, campo só com traço.
  assert.equal(conta('| benchmark.md | sem concorrente | Consultor | 2026-10-21 |'), false);
  assert.equal(conta('| <artefato> | <por que não se aplica> | <quem> | <data> |'), false);
  assert.equal(conta('| modelo-de-dados.md | <por que não se aplica> | Consultor | 2026-10-21 |'), false);
  assert.equal(conta('| modelo-de-dados.md |  | Consultor | 2026-10-21 |'), false);
  assert.equal(conta('| modelo-de-dados.md | nasce da spec-data-model | — | 2026-10-21 |'), false);
  // Sem a tabela — a prosa citando o arquivo não é registro de decisão.
  assert.equal(fecho.dispensaRegistrada('O modelo-de-dados.md foi dispensado pelo comitê.\n', 'modelo-de-dados.md'), false);
  assert.equal(fecho.dispensaRegistrada('', 'modelo-de-dados.md'), false);
});

test('D8/D9 — a rule do Explore e o template do `gaps.md` dizem o que o fecho de fato confere', () => {
  // O defeito dos dois itens era este: a rule prometia uma conferência que o fecho não fazia. O
  // teste prende as duas pontas ao MESMO texto — se uma mudar sem a outra, fica vermelho.
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const rule = readFileSync(join(raiz, '.claude/rules/harness/explore.md'), 'utf8');
  // `\s+`: a rule quebra linha em ~100 colunas, e a quebra pode cair entre as duas palavras.
  assert.match(rule, /Dispensas\s+registradas/, 'a rule não diz onde mora a linha de dispensa');
  assert.match(rule, /o fecho confere/i);
  assert.match(rule, /`Fidelidade: alta`/, 'a rule não diz qual linha do prototype.md o fecho lê');
  assert.match(rule, /isenção/);
  // O template: a tabela dele, com a linha de exemplo trocada por uma preenchida, é o que o gate lê.
  const template = readFileSync(join(raiz, '.claude/templates/gaps.md'), 'utf8');
  const preenchido = template.replace(
    /^\| <artefato> \|.*$/m,
    fecho.montarLinhaDeDispensa({ artefato: 'modelo-de-dados.md', motivo: 'nasce no Plan', quem: 'Comitê', data: '2026-10-21' }),
  );
  assert.notEqual(preenchido, template, 'a linha de exemplo do template mudou de forma');
  assert.equal(fecho.dispensaRegistrada(preenchido, 'modelo-de-dados.md'), true);
  // E o template intocado não dispensa nada: a linha de exemplo é só `<…>`.
  assert.equal(fecho.dispensaRegistrada(template, 'modelo-de-dados.md'), false);
});

test('D8 — `montarLinhaDeDispensa` e `dispensaRegistrada` são o mesmo formato', () => {
  // As duas pontas do mesmo contrato: o que a negação ensina, preenchido, é o que o gate lê.
  const linha = fecho.montarLinhaDeDispensa({
    artefato: 'modelo-de-dados.md', motivo: 'nasce da spec-data-model', quem: 'Consultor', data: '2026-10-21',
  });
  const gaps = '| Artefato dispensado | Motivo | Quem decidiu | Data |\n|---|---|---|---|\n' + linha + '\n';
  assert.equal(fecho.dispensaRegistrada(gaps, 'modelo-de-dados.md'), true);
});

test('D8 — sem `modelo-de-dados.md` e sem a linha de dispensa no `gaps.md`, o fecho NEGA e ensina a linha', () => {
  const arq = projetoCompleto({ [`${RAIZ_EXPLORE}/gaps.md`]: { texto: GAPS_SEM_DISPENSA_DO_MODELO, mtime: 500 } });
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /modelo-de-dados\.md/);
  assert.match(r.motivo, /Dispensas registradas/);
  // A linha que a negação ENSINA tem a forma da tabela do template: quatro colunas.
  assert.match(r.motivo, /\| modelo-de-dados\.md \| <[^>|]+> \| <[^>|]+> \| <[^>|]+> \|/);
});

test('D8 — com o `modelo-de-dados.md` presente, a dispensa não é cobrada', () => {
  const arq = projetoCompleto({
    [`${RAIZ_EXPLORE}/gaps.md`]: { texto: GAPS_SEM_DISPENSA_DO_MODELO, mtime: 500 },
    [`${RAIZ_EXPLORE}/modelo-de-dados.md`]: {
      texto: CABECALHO('Modelo de Dados') + '## Entidades principais\n\nTítulo, boleto e cliente corporativo.\n',
      mtime: 500,
    },
  });
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'allow', r && r.motivo);
});

test('D8 — a linha que a negação imprime, colada SEM EDITAR, não conta como dispensa', () => {
  // O mesmo cuidado do K/M-1 com a isenção: o comportamento mais literal-obediente — copiar a linha
  // de exemplo e colar — não pode satisfazer o gate, senão a dispensa vira botão de desligar.
  const negado = avaliar(PROD, ioFalso(projetoCompleto({
    [`${RAIZ_EXPLORE}/gaps.md`]: { texto: GAPS_SEM_DISPENSA_DO_MODELO, mtime: 500 },
  })));
  const linha = negado.motivo.match(/^\s*(\| modelo-de-dados\.md \|[^\n]*\|)\s*$/m);
  assert.ok(linha, 'a negação deixou de imprimir a linha de dispensa');
  const colado = GAPS_SEM_DISPENSA_DO_MODELO.replace(
    '| benchmark.md | o cliente não tem concorrente direto no segmento | Comitê | 2026-08-20 |',
    '| benchmark.md | o cliente não tem concorrente direto no segmento | Comitê | 2026-08-20 |\n' + linha[1],
  );
  const r = avaliar(PROD, ioFalso(projetoCompleto({ [`${RAIZ_EXPLORE}/gaps.md`]: { texto: colado, mtime: 500 } })));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /modelo-de-dados\.md/);
});

// ————— D9 do teste ponta a ponta: a fidelidade declarada do protótipo —————
//
// A `explore.md` exige protótipo de ALTA fidelidade, e o fecho só conferia a presença de três
// arquivos. O `design-system.md` só nasce no modo Geração, que a fidelidade Média pula: quem
// escolhia Média tinha de adivinhar que precisava gerar o `design-system.md` por fora, e aí passava.

const comPrototipo = (texto) => projetoCompleto({ 'outputs/spec/prototype.md': { texto, mtime: 100 } });

test('D9 — protótipo declarado em fidelidade Média NEGA, mesmo com os três artefatos, e aponta a isenção', () => {
  const r = avaliar(PROD, ioFalso(comPrototipo('# Protótipo\n\nModo: análise+geração\nFidelidade: média\n')));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Fidelidade: média/);
  assert.match(r.motivo, /exige Alta/);
  assert.match(r.motivo, /isenção/);
  assert.match(r.motivo, /<!--\s*gate:isencao\s*-->/, 'a isenção apontada tem que vir com o bloco');
});

test('D9 — `prototype.md` sem a linha de fidelidade NEGA, e ensina a linha', () => {
  const r = avaliar(PROD, ioFalso(comPrototipo('# Protótipo\n\nSeis estados por tela.\n')));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /não declarada/);
  assert.match(r.motivo, /Fidelidade: alta/);
});

test('D9 — a linha intocada do template («baixa | média | alta») não declara fidelidade nenhuma', () => {
  const r = avaliar(PROD, ioFalso(comPrototipo('# Protótipo\n\nFidelidade: baixa | média | alta\n')));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /fidelidade/i);
});

test('D9 — `**Fidelidade:** Alta`, com ênfase e maiúscula, libera — a forma não é o contrato', () => {
  for (const linha of ['**Fidelidade:** Alta', '> **Fidelidade**: alta (frontend completo em `src/`)', '- Fidelidade: ALTA']) {
    const r = avaliar(PROD, ioFalso(comPrototipo(`# Protótipo\n\n${linha}\n`)));
    assert.equal(r.acao, 'allow', `${linha}: ${r && r.motivo}`);
  }
});

test('D9 — Média COM isenção libera: a saída que a mensagem aponta funciona', () => {
  const arq = comPrototipo('# Protótipo\n\nFidelidade: média\n');
  arq[`${DIR_ISENCOES}/prototipo-medio.md`] = {
    texto: montarIsencao({
      repositorio: 'https://dev.azure.com/acme/portal/_git/portal-docs',
      autor: 'Fulana de Tal', data: '2026-10-21',
      motivo: 'o cliente aprovou protótipo de fidelidade média para este pré-projeto',
    }),
  };
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'allow', r && r.motivo);
});

// ————————————————————————— F16: `estadoRevisao` —————————————————————————
//
// DOIS FATOS DO MESMO PAR DE `stat`, e a separação é o conserto do I2 da Task 4: `presente` e
// `fresca` respondiam por um booleano só, e a dispensa do congelamento (Decisão 22) — escrita para
// cobrir ruído de `mtime` — acabava cobrindo também "ninguém nunca rodou o `revisao.mjs`".

test('estadoRevisao — relatório mais VELHO que o documento: presente, e NÃO fresco', () => {
  const arq = projetoCompleto();
  arq['outputs/spec/revisao.json'] = { texto: '{}', mtime: 100 }; // docs são 500
  assert.deepEqual(estadoRevisao(RAIZ, ioFalso(arq)), { presente: true, fresca: false });
});

test('estadoRevisao — relatório mais NOVO que o documento: presente e fresco', () => {
  assert.deepEqual(estadoRevisao(RAIZ, ioFalso(projetoCompleto())), { presente: true, fresca: true });
});

test('estadoRevisao — relatório ausente: nem presente nem fresco, e sem lançar', () => {
  const arq = projetoCompleto();
  delete arq['outputs/spec/revisao.json'];
  assert.deepEqual(estadoRevisao(RAIZ, ioFalso(arq)), { presente: false, fresca: false });
});

test('estadoRevisao — relatório velho NEGA pelo gate inteiro, com a instrução de como emitir', () => {
  // F16: `fresca` sempre `true` mata este e os dois acima. E o motivo tem que ensinar o
  // comando que de fato PRODUZ o arquivo — mandar rodar `revisao.mjs` sem redirecionar o JSON
  // deixa o consultor repetir a mesma negação para sempre.
  const arq = projetoCompleto();
  arq['outputs/spec/revisao.json'] = { texto: '{}', mtime: 100 };
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /revisao\.json/);
  assert.match(r.motivo, /--json/);
});

// ————————————————————————— F17: a válvula de isenção —————————————————————————

const BLOCO_VALIDO = [
  '# Isenção — pré-projeto herdado',
  '',
  '<!-- gate:isencao -->',
  'repositorio: https://dev.azure.com/acme/portal/_git/portal-docs',
  'autor: Fulana de Tal',
  'data: 2026-08-25',
  'motivo: pré-projeto herdado de outro fornecedor, já especificado em outro lugar',
  '<!-- /gate:isencao -->',
  '',
].join('\n');

test('acharIsencao — bloco válido no diretório injetado é encontrado', () => {
  const io = ioFalso({ [`${DIR_ISENCOES}/herdado.md`]: { texto: BLOCO_VALIDO } });
  const i = acharIsencao(RAIZ, io);
  assert.equal(i.autor, 'Fulana de Tal');
});

test('acharIsencao — diretório ausente devolve null, sem lançar', () => {
  assert.equal(acharIsencao(RAIZ, ioFalso({})), null);
});

test('acharIsencao — bloco INCOMPLETO não é honrado', () => {
  const semMotivo = BLOCO_VALIDO.replace(/^motivo:.*$/m, 'motivo:');
  const io = ioFalso({ [`${DIR_ISENCOES}/herdado.md`]: { texto: semMotivo } });
  assert.equal(acharIsencao(RAIZ, io), null);
});

test('a válvula LIBERA um projeto vazio, e diz que liberou por isenção', () => {
  // F17: `acharIsencao` nunca achando deixa a válvula inalcançável — a promessa que a
  // `explore.md` faz ao consultor vira letra morta, com a suíte verde.
  const io = ioFalso({ [`${DIR_ISENCOES}/herdado.md`]: { texto: BLOCO_VALIDO } });
  const r = avaliar(PROD, io);
  assert.equal(r.acao, 'allow');
  assert.match(r.motivo, /isen/i);
  assert.match(r.motivo, /Fulana de Tal/);
});

test('a isenção é procurada no diretório que a mensagem de negação ANUNCIA', () => {
  // Se as duas divergirem, o consultor escreve o arquivo no lugar que a mensagem mandou e o gate
  // continua negando — a pior forma de falso positivo, porque parece desobediência da ferramenta.
  const negacao = avaliar(PROD, ioFalso({})).motivo;
  assert.match(negacao, new RegExp(DIR_ISENCOES.replace(/\//g, '\\/')));
  const io = ioFalso({ [`${DIR_ISENCOES}/x.md`]: { texto: BLOCO_VALIDO } });
  assert.equal(avaliar(PROD, io).acao, 'allow');
});

test('montarIsencao produz um bloco que parseIsencao lê de volta', () => {
  const t = montarIsencao({
    repositorio: 'https://dev.azure.com/acme/portal/_git/portal-docs',
    autor: 'Fulana', data: '2026-08-25', motivo: 'escopo herdado',
  });
  const i = parseIsencao(t);
  assert.equal(i.repositorio, 'https://dev.azure.com/acme/portal/_git/portal-docs');
  assert.equal(i.autor, 'Fulana');
  assert.equal(i.data, '2026-08-25');
  assert.equal(i.motivo, 'escopo herdado');
});

// ——————————— restrição 1: ausência devolve vazio, ILEGÍVEL relança ———————————
//
// Um bloqueante que NÃO CONSEGUIU OLHAR não pode liberar, e também não pode negar em silêncio
// fingindo que olhou. Relançar é o que faz o despachante transformar a falha em deny de "falha do
// harness" — a postura assimétrica do `despachar`.

test('restrição 1 — projeto AUSENTE não lança: o gate decide com o que existe (nada)', () => {
  const r = avaliar(PROD, ioFalso({}));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /hld-funcional/);
});

test('restrição 1 — outputs/spec ILEGÍVEL relança em vez de virar "nada existe"', () => {
  const io = ioFalso(projetoCompleto(), { dirIlegivel: RAIZ_SPEC });
  assert.throws(() => avaliar(PROD, io), (e) => e.code === 'EACCES');
});

test('restrição 1 — outputs/explore ILEGÍVEL relança', () => {
  const io = ioFalso(projetoCompleto(), { dirIlegivel: RAIZ_EXPLORE });
  assert.throws(() => avaliar(PROD, io), (e) => e.code === 'EACCES');
});

test('restrição 1 — documento do Explore presente e ILEGÍVEL relança', () => {
  const arq = projetoCompleto();
  arq[`${RAIZ_EXPLORE}/gaps.md`] = { texto: '', erro: 'EACCES', mtime: 500 };
  assert.throws(() => avaliar(PROD, ioFalso(arq)), (e) => e.code === 'EACCES');
});

test('restrição 1 — o diretório de isenções ILEGÍVEL relança: a válvula não pode falhar calada', () => {
  const io = ioFalso(projetoCompleto(), { dirIlegivel: DIR_ISENCOES });
  assert.throws(() => avaliar(PROD, io), (e) => e.code === 'EACCES');
});

test('restrição 1 — o relatório de revisão presente e ILEGÍVEL relança', () => {
  const arq = projetoCompleto();
  arq['outputs/spec/revisao.json'] = { texto: '{}', erro: 'EACCES', mtime: 900 };
  assert.throws(() => avaliar(PROD, ioFalso(arq)), (e) => e.code === 'EACCES');
});

test('restrição 1 — o manifesto presente e ILEGÍVEL relança, em vez de virar "sem manifesto"', () => {
  // `lerManifesto` (workspace.mjs) degrada `EACCES` para `sem-manifesto`: para o `estado`, que só
  // informa, isso está certo. Para um BLOQUEANTE, não: negar por "manifesto inválido" um projeto
  // cujo manifesto está perfeito e apenas travado pelo sync do OneDrive é falso positivo em cima
  // de trabalho legítimo, com a mensagem errada. É por isso que a casca lê o arquivo ela mesma e
  // passa o texto para `parseManifesto`.
  const arq = projetoCompleto();
  arq['workspace.md'] = { texto: '', erro: 'EACCES', mtime: 100 };
  assert.throws(() => avaliar(PROD, ioFalso(arq)), (e) => e.code === 'EACCES');
});

test('restrição 1 — o MARCADOR ilegível relança, e o despachar transforma em deny do harness', () => {
  // A QUINTA OPERAÇÃO DO `io` (`exploreCongelado`) ERA A ÚNICA SEM ESTE TESTE, e o comentário da
  // casca AFIRMA o comportamento: "se ela LANÇAR, a exceção sobe, e o `despachar` a transforma em
  // deny de falha do harness". Afirmação de comentário sem quem a defenda é a família de defeito
  // que esta série já corrigiu três vezes — aqui está quem a defende.
  //
  // As DUAS pontas, porque só a exceção não prova a política: `avaliar` relança (não engole, não
  // trata "não consegui olhar" como "não está congelado", que LIBERARIA o frescor), e a casca de
  // produção nega com a mensagem que manda reportar.
  const io = ioFalso(projetoCompleto());
  io.exploreCongelado = () => { const e = new Error('permission denied'); e.code = 'EACCES'; throw e; };
  assert.throws(() => avaliar(PROD, io), (e) => e.code === 'EACCES');

  const raiz = projetoEmDisco();
  const r = despachar(PROD, criarRegistro({
    ...IO_REAL,
    cwd: () => raiz,
    exploreCongelado: () => { const e = new Error('permission denied'); e.code = 'EACCES'; throw e; },
  }));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /falha do harness/i);
  assert.match(r.motivo, /permission denied/);
});

// ——————— os artefatos que o PRÓPRIO gate exige não podem ser barrados por ele ———————
//
// Medido, não suposto: sem isenção, o gate exige um arquivo cuja criação ele mesmo nega — impasse
// fechado, sem saída pelo lado do consultor. O mesmo vale para o arquivo de isenção, que a
// mensagem de negação manda escrever.
//
// QUEM ISENTA OS DOIS É A `WHITELIST_EXPLORE` do `kit.mjs`, e não mais a lista privada deste
// arquivo. A troca é da rodada M (opção A′ do C-1): a lista privada respondia só "atravessa a
// fronteira?" e deixava `detectarFase` responder `plan` para um projeto que estava no Explore —
// o laço que derrubava a `spec-prototype`. A resposta observável aqui não mudou; o mecanismo, sim.
// Estes testes continuam sendo o cinto: desfazer o conserto os derruba.

test('escrever o RELATÓRIO DE REVISÃO não atravessa a fronteira', () => {
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${RAIZ_SPEC}/revisao.json`), new Set()), false);
});

test('escrever a ISENÇÃO que a negação manda escrever não atravessa a fronteira', () => {
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${DIR_ISENCOES}/herdado.md`), new Set()), false);
});

test('a isenção dos artefatos do gate é ESTREITA: outros arquivos de outputs/spec continuam disparando', () => {
  for (const f of ['modules.md', 'product-vision.md', 'auditoriax.md', 'revisao.md']) {
    assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${RAIZ_SPEC}/${f}`), new Set()), true, f);
  }
});

// ——————————————— o gate contra um documento realista e bem escrito ———————————————
//
// A rodada J fechou quatro famílias de falso positivo do `gramatica.mjs` — uma delas acusava os
// cinco templates obrigatórios ainda em branco. Aqui o consumo daquela função é BLOQUEANTE: um
// falso positivo deixou de ser aviso e virou `deny`. Estes dois testes são a medição.

test('realista — o gate LIBERA um Explore bem escrito', () => {
  const r = avaliar(PROD, ioFalso(projetoCompleto()));
  assert.equal(r.acao, 'allow', r && r.motivo);
  assert.equal(r.motivo, null);
});

test('realista — os TEMPLATES em branco são negados, e a negação nomeia o token esquecido', () => {
  // O contrário do teste acima, e o que dá sentido a ele: documento em branco NÃO passa
  // (Decisão 17), e a mensagem diz o que trocar. Sem este par, "libera o bem escrito" poderia ser
  // só o gate desligado.
  // A partir DESTE arquivo, e não de `process.cwd()`: a seção de disco real abaixo troca a cwd, e
  // um fixture que depende de onde o `node --test` foi chamado quebra por motivo errado.
  const raizTemplates = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
  const arq = projetoCompleto();
  for (const nome of ['hld-funcional.md', 'especificacao-funcional.md', 'especificacao-tecnica.md', 'gaps.md']) {
    arq[`${RAIZ_EXPLORE}/${nome}`] = { texto: readFileSync(join(raizTemplates, nome), 'utf8'), mtime: 500 };
  }
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /<produto>/);
});

// ——————————————— o passeio de diretório desperdiçado ———————————————

// ——————— o REGISTRO exportado, contra disco de verdade, pela casca REAL ———————
//
// Tudo acima roda sobre `io` de mentira, então sozinho não prova que o `REGISTRO` que o `main()`
// usa está ligado à casca certa. Isto NÃO é teoria: na Task 3 o `IO_REAL` do `posttooluse` estava
// ligado à política errada e a suíte inteira ficava verde. As três operações novas do `IO_REAL`
// (`lerArquivo`, `lerDiretorio`, `statMs`) só têm defesa aqui.

/** Escreve um arquivo, criando a árvore, e fixa o mtime em segundos desde a época. */
function porArquivo(raiz, rel, texto, mtimeSeg) {
  const abs = join(raiz, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, texto);
  if (mtimeSeg != null) utimesSync(abs, mtimeSeg, mtimeSeg);
}

/**
 * Escreve o pré-projeto completo sob `raiz/sub` — `sub` vazio é mono-repo, `sub` preenchido é o
 * repo de docs de um workspace multi-repo. `faltando` lista os caminhos que NÃO são criados.
 */
function escreverPreProjeto(raiz, sub, faltando = []) {
  const pular = new Set(faltando);
  const por = (rel, texto, mtime) => {
    if (!pular.has(rel)) porArquivo(raiz, sub ? `${sub}/${rel}` : rel, texto, mtime);
  };

  por('workspace.md', MANIFESTO_OK, 1_700_000_000);
  for (const [nome, texto] of Object.entries(DOCS_BONS)) {
    por(`${RAIZ_EXPLORE}/${nome}`, texto, 1_700_000_500);
  }
  por(`${RAIZ_SPEC}/sync-log.md`, '# Sync Log\n\n' + KICKOFF + '\n', 1_700_000_000);
  // OS DOIS ARTEFATOS DA `spec-ingest` ENTRARAM COM A TASK 6, e não mudam nada do que estes testes
  // medem: ambos estão na `WHITELIST_EXPLORE`, então a fase continua Explore e o veredito do fecho
  // é o mesmo com ou sem eles. Estão aqui porque o `cadeia` passou a rodar ANTES no `REGISTRO` e o
  // `spec-product` dispara os DOIS verificadores — sem os pré-requisitos em disco, quem responderia
  // ao `PROD` seria o `cadeia`, e estes testes deixariam de exercitar o fecho.
  por(`${RAIZ_SPEC}/context-map.md`, '# Context Map\n\nF-001 — fato ancorado.\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/discovery-document.md`, '# Discovery\n\nProblema central.\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/prototype.md`, PROTOTIPO_ALTA, 1_700_000_000);
  por(`${RAIZ_SPEC}/design-system.md`, '# Design System\n\nTokens e componentes.\n', 1_700_000_000);
  por(`${RAIZ_SPEC}/screens-manifest.json`, '{"telas":[]}', 1_700_000_000);
  por(`${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_900);
}

/** Projeto REAL em disco. `faltando` é a lista de caminhos relativos que NÃO são criados. */
function projetoEmDisco(faltando = []) {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'fecho-')));
  escreverPreProjeto(raiz, '', faltando);
  return raiz;
}

/** Roda `fn` com o `process.cwd()` no fixture — o único jeito de apontar o `IO_REAL.cwd`. */
function noDiretorio(raiz, fn) {
  const antes = process.cwd();
  process.chdir(raiz);
  try { return fn(); } finally { process.chdir(antes); }
}

test('REGISTRO real — o Explore completo em DISCO libera o spec-product', () => {
  const raiz = projetoEmDisco();
  noDiretorio(raiz, () => {
    const r = despachar(PROD, REGISTRO);
    assert.equal(r.acao, 'allow', r.motivo || '');
    assert.deepEqual(r.falhas, []);
  });
});

test('REGISTRO real — o Explore incompleto em DISCO NEGA o spec-product', () => {
  const raiz = projetoEmDisco([`${RAIZ_EXPLORE}/gaps.md`, `${RAIZ_SPEC}/screens-manifest.json`]);
  noDiretorio(raiz, () => {
    const r = despachar(PROD, REGISTRO);
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /gaps\.md/);
    assert.match(r.motivo, /screens-manifest\.json/);
  });
});

test('REGISTRO real — o `IO_REAL.statMs` compara idade DE VERDADE: relatório velho nega', () => {
  // Mata a mutação `statMs` devolvendo constante, e o frescor sempre `true`, na casca de
  // PRODUÇÃO. O projeto é o mesmo dos dois testes acima; só o mtime do relatório muda.
  const raiz = projetoEmDisco();
  porArquivo(raiz, `${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_100);
  noDiretorio(raiz, () => {
    const r = despachar(PROD, REGISTRO);
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /revisao\.json/);
  });
});

test('REGISTRO real — a VÁLVULA funciona em disco: o arquivo de isenção libera o projeto vazio', () => {
  // Mata `lerDiretorio`/`lerArquivo` do `IO_REAL` desligados, e prova que a promessa da
  // `explore.md` é alcançável pelo consultor, não só pelo dublê.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'fecho-isen-')));
  porArquivo(raiz, `${DIR_ISENCOES}/herdado.md`, BLOCO_VALIDO);
  // A ISENÇÃO É DO FECHO, NÃO DA CADEIA, e a Task 6 tornou isso observável: os pré-requisitos do
  // `spec-product` precisam existir para que a pergunta deste teste — "a válvula libera?" — chegue
  // a ser feita. São coisas diferentes de propósito: a isenção dispensa o Explore de estar
  // COMPLETO, não dispensa a `spec-product` de ter o que ela lê.
  porArquivo(raiz, `${RAIZ_SPEC}/context-map.md`, '# Context Map\n');
  porArquivo(raiz, `${RAIZ_SPEC}/discovery-document.md`, '# Discovery\n');
  noDiretorio(raiz, () => {
    const r = despachar(PROD, REGISTRO);
    assert.equal(r.acao, 'allow', r.motivo || '');
  });
});

test('REGISTRO real — a escrita que atravessa a fronteira é negada pela âncora de ARQUIVO', () => {
  const raiz = projetoEmDisco([`${RAIZ_EXPLORE}/hld-funcional.md`]);
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(raiz, RAIZ_SPEC, 'modules.md'), content: '# Módulos' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /hld-funcional\.md/);
  });
});

test('REGISTRO real — os artefatos que o gate EXIGE podem ser escritos com ele negando', () => {
  // O impasse, medido pela casca de produção: sem a isenção — hoje a `WHITELIST_EXPLORE` do
  // `kit.mjs`, ver a nota da seção acima —, o consultor que segue a instrução da negação (emitir o
  // relatório, declarar a isenção) tem a escrita negada pelo mesmo gate que a pediu, e não existe
  // ordem de operações que o resolva.
  const raiz = projetoEmDisco([`${RAIZ_EXPLORE}/gaps.md`, `${RAIZ_SPEC}/revisao.json`]);
  noDiretorio(raiz, () => {
    for (const alvo of [`${RAIZ_SPEC}/revisao.json`, `${DIR_ISENCOES}/herdado.md`]) {
      const r = despachar(
        { tool_name: 'Write', tool_input: { file_path: join(raiz, alvo), content: '{}' } },
        REGISTRO,
      );
      assert.equal(r.acao, 'allow', `${alvo}: ${r.motivo || ''}`);
    }
  });
});

test('REGISTRO real — bloqueante que não conseguiu OLHAR nega, e diz que a falha é do harness', () => {
  // A ponta final da restrição 1. O `lerDiretorio` levanta `EACCES` sobre um diretório que
  // existe; a casca relança, e a postura assimétrica do `despachar` transforma em deny. Um
  // bloqueante que não conseguiu olhar não pode liberar.
  const raiz = projetoEmDisco();
  const io = {
    ...IO_REAL,
    cwd: () => raiz,
    lerDiretorio: (caminho, opcoes) => {
      if (String(caminho).replace(/\\/g, '/').toLowerCase().endsWith(RAIZ_EXPLORE)) {
        const e = new Error('permission denied'); e.code = 'EACCES'; throw e;
      }
      return IO_REAL.lerDiretorio(caminho, opcoes);
    },
  };
  const r = despachar(PROD, criarRegistro(io));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /falha do harness/i);
  assert.match(r.motivo, /permission denied/);
});

test('desempenho — a ação que não atravessa a fronteira não paga inventário nenhum', () => {
  // O `avaliar` do plano chamava `inventariar(outputs/spec)` ANTES de perguntar se o gate se
  // aplica, e alimentava com isso um parâmetro que `ehPrimeiraAcaoDoPlan` ignora. Um passeio de
  // diretório em toda invocação de `Skill`, `Write`, `Edit` e `NotebookEdit` — inclusive a
  // esmagadora maioria que não atravessa fronteira nenhuma.
  const io = ioFalso(projetoCompleto());
  avaliar(escrever(`${RAIZ}/outputs/explore/gaps.md`), io);
  avaliar({ tool_name: 'Read', tool_input: { file_path: 'x' } }, io);
  avaliar({ tool_name: 'Skill', tool_input: { skill: 'spec-benchmark' } }, io);
  assert.deepEqual(io.chamadas, []);
});

// ═══════════════════════ rodada K — os cinco achados da revisão ═══════════════════════

// ————— C-1: o gate lia o manifesto no lugar certo e os documentos no lugar errado —————
//
// `descobrirWorkspace` devolve `raizArtefatos`, e `avaliar` o ignorava: `inventariar`,
// `carregarDocs`, `estadoRevisao` e `acharIsencao` recebiam `io.cwd()` cru. Num workspace
// multi-repo isso NEGA um pré-projeto completo e correto, com uma mensagem que descreve um
// projeto que não é o do consultor — e "Manifesto inválido" ausente da lista, porque o manifesto
// era o único item que sabia onde procurar.
//
// Estes testes têm que ir a DISCO: `descobrirWorkspace` decide quem é candidato com `existsSync`,
// que não é injetável. Sobre o `io` de mentira, cujo cwd não existe, todo workspace parece
// mono-repo — que foi exatamente por que a suíte de 751 não viu o buraco.

/** Workspace multi-repo REAL: `portal-docs` é o repo de docs, `portal-app` é um irmão. */
function workspaceMultiRepo(faltando = []) {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'fecho-multi-')));
  escreverPreProjeto(raiz, 'portal-docs', faltando);
  // Irmão que NÃO é candidato: não tem `outputs/explore` nem `outputs/spec`.
  porArquivo(raiz, 'portal-app/src/app.ts', 'export const x = 1;\n');
  return raiz;
}

const ioNaRaiz = (raiz) => ({ ...IO_REAL, cwd: () => raiz });

test('K/C-1 — workspace MULTI-REPO completo LIBERA o spec-product', () => {
  const raiz = workspaceMultiRepo();
  const r = avaliar(PROD, ioNaRaiz(raiz));
  assert.equal(r.acao, 'allow', r && r.motivo);
  assert.equal(r.motivo, null);
});

test('K/C-1 — workspace MULTI-REPO incompleto nega pelo motivo CERTO, e só por ele', () => {
  // A assinatura do defeito era negar CINCO itens de um projeto correto. Aqui falta um documento
  // só, e a negação tem que citar esse — e nenhum dos outros cinco.
  const raiz = workspaceMultiRepo([`${RAIZ_EXPLORE}/gaps.md`]);
  const r = avaliar(PROD, ioNaRaiz(raiz));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /gaps\.md/);
  assert.ok(!/Manifesto inválido/.test(r.motivo), r.motivo);
  assert.ok(!/kickoff/i.test(r.motivo), r.motivo);
  assert.ok(!/prot(ó|o)tipo/i.test(r.motivo), r.motivo);
  assert.ok(!/revisao\.json/.test(r.motivo), r.motivo);
  assert.ok(!/hld-funcional/.test(r.motivo), r.motivo);
});

test('K/C-1 — em multi-repo a ÂNCORA DE ARQUIVO julga o projeto do repo de docs', () => {
  const raiz = workspaceMultiRepo();
  const alvo = join(raiz, 'portal-docs', RAIZ_SPEC, 'modules.md');
  const r = avaliar({ tool_name: 'Write', tool_input: { file_path: alvo, content: '# Módulos' } }, ioNaRaiz(raiz));
  assert.equal(r.acao, 'allow', r && r.motivo);
});

test('K/C-1 — a VÁLVULA de isenção também é procurada no repo de docs', () => {
  // `acharIsencao` recebia `io.cwd()`: em multi-repo o consultor escrevia a isenção onde a
  // mensagem manda — dentro do repo de docs — e o gate continuava negando.
  const raiz = workspaceMultiRepo([`${RAIZ_EXPLORE}/gaps.md`]);
  porArquivo(raiz, `portal-docs/${DIR_ISENCOES}/herdado.md`, BLOCO_VALIDO);
  const r = avaliar(PROD, ioNaRaiz(raiz));
  assert.equal(r.acao, 'allow', r && r.motivo);
  assert.match(r.motivo, /Fulana de Tal/);
});

test('K/C-1 — workspace AMBÍGUO nega dizendo a verdade, e não acusa documento nenhum', () => {
  // `docsDir: null`. Antes isto caía em "Manifesto inválido", que pode ser mentira — e mandava
  // rodar `--validar`, que reporta ambiguidade de LAYOUT, não erro de manifesto (m-1). O comando
  // continua certo; o rótulo é que estava errado.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'fecho-ambiguo-')));
  escreverPreProjeto(raiz, 'portal-docs');
  escreverPreProjeto(raiz, 'outro-docs');
  const r = avaliar(PROD, ioNaRaiz(raiz));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /workspace indeterminado/i);
  assert.match(r.motivo, /ambiguo/);
  assert.match(r.motivo, /portal-docs/);
  assert.match(r.motivo, /outro-docs/);
  assert.match(r.motivo, /--validar/);
  assert.ok(!/Manifesto inválido/.test(r.motivo), r.motivo);
  assert.ok(!/hld-funcional/.test(r.motivo), r.motivo);
});

// ————— M-1: a saída de emergência abria com copiar-colar —————
//
// `isencaoValida` só testava *truthy*, e `<quem decidiu>` é truthy. Colar o bloco que a PRÓPRIA
// negação imprime, sem editar uma letra, liberava um projeto vazio. É a única porta de saída do
// único bloqueante da camada, e ela abria com o comportamento mais literal-obediente possível.

const ISENCAO_REAL = {
  repositorio: 'https://dev.azure.com/acme/portal/_git/portal-docs',
  autor: 'Fulana de Tal',
  data: '2026-08-25',
  motivo: 'pré-projeto herdado de outro fornecedor',
};

const isencaoEmDisco = (i) => ioFalso({ [`${DIR_ISENCOES}/herdado.md`]: { texto: montarIsencao(i) } });

test('K/M-1 — colar o bloco que a NEGAÇÃO imprime, sem editar, NÃO libera', () => {
  // O bloco sai da mensagem de verdade, não de uma cópia escrita à mão aqui: se o exemplo da
  // negação mudar, este teste continua medindo o que o consultor de fato tem na tela.
  const negacao = avaliar(PROD, ioFalso({})).motivo;
  const bloco = negacao.match(/<!--\s*gate:isencao\s*-->[\s\S]*?<!--\s*\/gate:isencao\s*-->/);
  assert.ok(bloco, 'a negação deixou de imprimir o bloco de isenção');
  const io = ioFalso({ [`${DIR_ISENCOES}/herdado.md`]: { texto: bloco[0] } });
  assert.equal(acharIsencao(RAIZ, io), null);
  assert.equal(avaliar(PROD, io).acao, 'deny');
});

test('K/M-1 — CADA um dos quatro campos, sozinho em placeholder, invalida a isenção', () => {
  // Um por campo, e é o que mata a mutação que exige só o `motivo`: `repositorio`, `autor` e
  // `data` são o que faz a isenção ser trilha de auditoria, e tinham zero enforcement.
  const tokens = {
    repositorio: '<url do repositório de docs>',
    autor: '<quem decidiu>',
    data: '<AAAA-MM-DD>',
    motivo: '<por que o pré-projeto foi reduzido>',
  };
  for (const campo of Object.keys(ISENCAO_REAL)) {
    const io = isencaoEmDisco({ ...ISENCAO_REAL, [campo]: tokens[campo] });
    assert.equal(acharIsencao(RAIZ, io), null, campo);
    assert.equal(avaliar(PROD, io).acao, 'deny', campo);
  }
});

test('K/M-1 — CADA um dos quatro campos, sozinho em branco, invalida a isenção', () => {
  for (const campo of Object.keys(ISENCAO_REAL)) {
    const io = isencaoEmDisco({ ...ISENCAO_REAL, [campo]: '' });
    assert.equal(acharIsencao(RAIZ, io), null, campo);
  }
});

test('K/M-1 — a isenção DE VERDADE continua liberando: a válvula não foi soldada', () => {
  const io = isencaoEmDisco(ISENCAO_REAL);
  const r = avaliar(PROD, io);
  assert.equal(r.acao, 'allow', r && r.motivo);
  assert.match(r.motivo, /Fulana de Tal/);
});

// ————— M-2: o frescor barrava quem não mudou nada —————

test('K/M-2 — relatório e documento com o MESMO mtime é FRESCO', () => {
  // A igualdade é o guarda contra relógio de granularidade grossa e contra relatório e documento
  // escritos no mesmo tick. `>` no lugar de `>=` transforma isso em negação.
  const arq = projetoCompleto();
  arq['outputs/spec/revisao.json'] = { texto: '{}', mtime: 500 }; // os documentos também são 500
  assert.equal(estadoRevisao(RAIZ, ioFalso(arq)).fresca, true);
});

test('K/M-2 — QUALQUER documento do Explore mais novo derruba, não só o primeiro', () => {
  // Todos os testes anteriores faziam do `hld-funcional.md` o mais novo, e o laço olhando só
  // `DOCS_EXPLORE[0]` passava. Os outros quatro nunca eram o gatilho.
  for (const nome of Object.keys(DOCS_BONS)) {
    const arq = projetoCompleto();
    for (const n of Object.keys(DOCS_BONS)) arq[`${RAIZ_EXPLORE}/${n}`].mtime = 100;
    arq[`${RAIZ_EXPLORE}/${nome}`].mtime = 950; // o relatório é 900
    assert.equal(estadoRevisao(RAIZ, ioFalso(arq)).fresca, false, nome);
  }
});

// ————— M-3: a âncora mordia arquivo que não é deste projeto —————

test('K/M-3 — dentroDaRaiz: relativo é de dentro, absoluto precisa começar na raiz', () => {
  assert.equal(dentroDaRaiz(RAIZ, 'outputs/spec/modules.md'), true);
  assert.equal(dentroDaRaiz(RAIZ, `${RAIZ}/outputs/spec/modules.md`), true);
  assert.equal(dentroDaRaiz(RAIZ, `${RAIZ}\\outputs\\spec\\modules.md`), true);
  // Irmão cujo nome COMEÇA com o da raiz: `proj-outro` não está dentro de `proj`.
  assert.equal(dentroDaRaiz(RAIZ, `${RAIZ}-outro/outputs/spec/modules.md`), false);
  assert.equal(dentroDaRaiz(RAIZ, '/outro-repo/outputs/spec/modules.md'), false);
  assert.equal(dentroDaRaiz(RAIZ, 'D:/outro-repo/outputs/spec/modules.md'), false);
  assert.equal(dentroDaRaiz(RAIZ, ''), false);
});

test('K/M-3 — o gate NÃO morde escrita em outro repositório do disco', () => {
  // O invariante que o `pretooluse.mjs` documenta: fora da raiz LIBERA — o harness governa este
  // repositório, não o disco inteiro. O estado do projeto A não pode negar escrita no projeto B.
  const raiz = projetoEmDisco([`${RAIZ_EXPLORE}/gaps.md`]); // projeto que NEGA
  const io = ioNaRaiz(raiz);
  const fora = `${raiz}-outro/${RAIZ_SPEC}/modules.md`.replace(/\\/g, '/');
  assert.equal(avaliar({ tool_name: 'Write', tool_input: { file_path: fora } }, io), null);
  // e o de dentro continua sendo julgado
  const dentro = join(raiz, RAIZ_SPEC, 'modules.md');
  assert.equal(avaliar({ tool_name: 'Write', tool_input: { file_path: dentro } }, io).acao, 'deny');
});

test('K/M-3 — o corte do relativo usa a ÚLTIMA ocorrência de `outputs/spec/`', () => {
  // O PREFIXO é que pode conter o segmento por acidente — a raiz do projeto pode morar em
  // `.../outputs/spec/algo/`. Com `indexOf`, o relativo sairia com um `outputs/spec/` a mais na
  // frente e a whitelist deixaria de casar: uma tela vira compromisso com o Plan.
  const base = 'C:/w/outputs/spec/portal';
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${base}/outputs/spec/screens/login.png`)), false);
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${base}/outputs/spec/sync-log.md`)), false);
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${base}/outputs/spec/modules.md`)), true);
});

// ————— m-2 e m-3: a isenção da fronteira, estreitada e com as duas metades medidas —————
//
// Os três testes abaixo nasceram na rodada K contra a `EXCECOES_DE_FRONTEIRA` deste arquivo. A
// rodada M mudou o MECANISMO de dois dos casos — `revisao.json` e `_isencoes/` passaram para a
// `WHITELIST_EXPLORE` do `kit.mjs`, onde as duas metades são garantidas pelo `casa()` — e não
// mudou nenhuma resposta. Continuam aqui, e continuam certos: quem pergunta é o
// `ehPrimeiraAcaoDoPlan`, e é a resposta DELE que o consultor sente.

test('K/m-2 — a isenção cobre `_isencoes/`, não `auditorias/` inteiro', () => {
  // A justificativa escrita é "é o próprio gate que exige, ou oferece, este arquivo". Ela cobre o
  // arquivo de isenção; `code-audit.md` e `security-review.md` são saída de fase Plan como
  // qualquer outra, e estavam isentos de graça.
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${DIR_ISENCOES}/herdado.md`)), false);
  for (const f of ['code-audit.md', 'security-review.md']) {
    assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${DIR_AUDITORIAS}/${f}`)), true, f);
  }
});

test('K/m-3 — a isenção é insensível a CAIXA, como o resto do arquivo', () => {
  // Num FS insensível a caixa, `outputs/spec/Revisao.json` é o MESMO arquivo que o item 5 do gate
  // exige. Baixar a caixa é o que impede que ele saia da isenção e caia no impasse que ela existe
  // para desfazer. Vale para as três: as duas primeiras pelo `chave()` do kit, o marcador pelo
  // `toLowerCase()` do `ehExcecaoDeFronteira`.
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${RAIZ_SPEC}/Revisao.json`)), false);
  assert.equal(ehPrimeiraAcaoDoPlan(escrever('outputs/spec/auditorias/_Isencoes/herdado.md')), false);
  assert.equal(ehPrimeiraAcaoDoPlan(escrever('outputs/spec/_Explore-Congelado.md')), false);
});

test('K/m-3 — a isenção de diretório casa com a BARRA, não por prefixo de nome', () => {
  // Sem a barra final, qualquer irmão de nome parecido entraria junto.
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${DIR_ISENCOES}x.md`)), true);
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${RAIZ_SPEC}/revisao.json.bak`)), true);
  assert.equal(ehPrimeiraAcaoDoPlan(escrever(`${MARCADOR_CONGELAMENTO}.bak`)), true);
});

test('K/m-3 — a VÁLVULA não quebra com subdiretório dentro de `_isencoes/`', () => {
  // Sem o guarda `isFile()`, ler o subdiretório levanta `EISDIR`, que não é ausência: a casca
  // relança e o `despachar` responde "falha do harness" — sobre um projeto que só não tem isenção.
  //
  // O diretório é a ÚNICA entrada de propósito. A primeira redação deste teste punha um arquivo de
  // isenção válido ao lado, e a mutação SOBREVIVEU: a ordem do `readdir` no NTFS devolve
  // `herdado.md` antes de `_rascunhos`, a isenção era achada primeiro e o subdiretório nunca era
  // lido. Depender de ordem de `readdir` é depender do sistema de arquivos.
  const raiz = projetoEmDisco([`${RAIZ_EXPLORE}/gaps.md`]);
  mkdirSync(join(raiz, DIR_ISENCOES, 'rascunhos'), { recursive: true });
  const r = avaliar(PROD, ioNaRaiz(raiz));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /gaps\.md/);
});

test('K/m-3 — e a isenção ao lado do subdiretório continua sendo honrada', () => {
  const raiz = projetoEmDisco([`${RAIZ_EXPLORE}/gaps.md`]);
  mkdirSync(join(raiz, DIR_ISENCOES, 'rascunhos'), { recursive: true });
  porArquivo(raiz, `${DIR_ISENCOES}/herdado.md`, BLOCO_VALIDO);
  const r = avaliar(PROD, ioNaRaiz(raiz));
  assert.equal(r.acao, 'allow', r && r.motivo);
});

test('K/m-3 — `parseIsencao` lê UM bloco, não do primeiro abre ao último fecha', () => {
  // Guloso, dois blocos no mesmo arquivo viram um só, com os campos misturados: um rascunho
  // abandonado emprestaria o `motivo` para o bloco de cima, que não tem nenhum.
  const doisBlocos = [
    '<!-- gate:isencao -->',
    'repositorio: https://dev.azure.com/acme/portal/_git/portal-docs',
    'autor: Fulana de Tal',
    'data: 2026-08-25',
    '<!-- /gate:isencao -->',
    '',
    '## Rascunho abandonado',
    '',
    '<!-- gate:isencao -->',
    'motivo: escopo herdado',
    '<!-- /gate:isencao -->',
  ].join('\n');
  const i = parseIsencao(doisBlocos);
  assert.equal(i.autor, 'Fulana de Tal');
  assert.equal(i.motivo, '', 'o motivo veio do segundo bloco: a leitura é gulosa');
  const io = ioFalso({ [`${DIR_ISENCOES}/herdado.md`]: { texto: doisBlocos } });
  assert.equal(acharIsencao(RAIZ, io), null);
});

// ═══════ Task 4 — o frescor deixa de valer depois do congelamento (Decisão 22) ═══════
//
// A razão é de RELEVÂNCIA, não de custo: o `revisao.json` fala SOBRE o Explore, e depois do
// congelamento o Explore não muda mais. Cada teste abaixo vem em PAR — congelado e não congelado —,
// porque sem a outra ponta a mudança passaria também se alguém tivesse apagado a exigência.

test('congelado: o gate passa com revisao.json velho — só o frescor deixou de valer', () => {
  assert.equal(decidir({ ...COMPLETO, revisaoFresca: false, exploreCongelado: true }).acao, 'allow');
});

test('NÃO congelado: o mesmo ctx continua sendo negado pelo frescor — a outra ponta', () => {
  const r = decidir({ ...COMPLETO, revisaoFresca: false, exploreCongelado: false });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Relatório de revisão desatualizado/);
});

// ————— I2: a dispensa era mais larga que a justificativa —————
//
// `revisaoFresca` devolvia `false` para "velho" E para `ENOENT`, e a Task 4 dispensou o sinal
// inteiro. A Decisão 22 diz "só a checagem de FRESCOR deixa de valer", e a justificativa escrita
// cobre exclusivamente ruído de `mtime` num pacote congelado — nada nela cobre "ninguém nunca
// rodou o `revisao.mjs`". E o caminho era alcançável com comandos legítimos: o
// `promocao.mjs --congelar` confere só a invariante do carimbo, a escrita do marcador é isenta do
// gate, e o `cadeia` não pede o `revisao.json`. Explore completo + `--congelar` sem nunca emitir o
// relatório ⇒ o item 5 nunca era cobrado.

test('congelado NÃO dispensa a PRESENÇA do relatório: nunca emitido continua negando', () => {
  const r = decidir({ ...COMPLETO, revisaoPresente: false, revisaoFresca: false, exploreCongelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Relatório de revisão nunca emitido/);
  // A ação certa para ESTA causa é emitir, e a mensagem tem que trazer o comando que produz o
  // arquivo — a outra causa (relatório velho num Explore congelado) não pede ação nenhuma.
  assert.match(r.motivo, /--json/);
});

test('congelado + relatório AUSENTE em disco: o gate nega pela casca, não só pelo núcleo', () => {
  // A ponta de CASCA da mesma exigência: é `estadoRevisao` quem separa `ENOENT` de "velho", e sem
  // este teste a separação podia existir no `decidir` e nunca ser alimentada.
  const arq = projetoCompleto({ [MARCADOR_CONGELAMENTO]: { texto: '# Explore congelado\n', mtime: 1000 } });
  delete arq['outputs/spec/revisao.json'];
  const r = avaliar(PROD, ioFalso(arq));
  assert.equal(r && r.acao, 'deny');
  assert.match(r.motivo, /Relatório de revisão nunca emitido/);
});

test('congelado NÃO perdoa as outras cinco exigências', () => {
  // A Decisão 22 diz "só o frescor". Um congelamento que perdoasse documento ausente ou protótipo
  // incompleto seria a proposta "marcador ⇒ null" entrando pela porta de trás.
  const base = { ...COMPLETO, exploreCongelado: true };
  const casos = [
    [{ presentesExplore: new Set() }, /Documentos do Explore ausentes/],
    [{ manifestoValido: false }, /Manifesto inválido/],
    [{ kickoff: { presente: false } }, /sem linha de kickoff/],
    [{ temPrototipo: false }, /Protótipo de alta fidelidade/],
    [{ errosGramatica: [{ arquivo: 'gaps.md', erros: ['token'] }] }, /mal formados/],
  ];
  for (const [delta, esperado] of casos) {
    const r = decidir({ ...base, ...delta });
    assert.equal(r.acao, 'deny', JSON.stringify(delta));
    assert.match(r.motivo, esperado);
  }
});

test('avaliar CONSULTA o io.exploreCongelado — o wiring', () => {
  // A MEDIÇÃO DO WIRING: sem ela, `avaliar` podia esquecer de ler o marcador e a suíte ficaria
  // verde medindo só a função pura. O que este teste tem e o de baixo não: o CONTADOR. É ele que
  // mata a mutação "apagar `exploreCongelado: io.exploreCongelado(raiz)` do `avaliar`".
  //
  // O PAR "sem o marcador ⇒ deny" ERA UM TESTE SEPARADO com a mesma lambda, e saiu no M4 desta
  // rodada: as duas pontas estão no teste de baixo, que as mede pelo `ioFalso` — disco de mentira,
  // não lambda escrita à mão. O que não estava lá era o contador, e é só ele que sobrevive aqui.
  //
  // O `mtime` do `revisao.json` volta para 100 — mais VELHO que os documentos do Explore, que o
  // `projetoCompleto` cria com 500. É assim que o frescor fica falso de verdade, em vez de por
  // dublê: `estadoRevisao` compara idade, e o fixture tem que produzir a idade errada.
  const io = ioFalso(projetoCompleto({
    'outputs/spec/revisao.json': { texto: '{"versao":"1.0"}', mtime: 100 },
  }));
  let perguntou = 0;
  io.exploreCongelado = () => { perguntou += 1; return true; };
  const r = avaliar(PROD, io);
  assert.ok(perguntou >= 1, 'avaliar não consultou io.exploreCongelado');
  assert.equal(r && r.acao, 'allow', r && r.motivo);
});

test('o dublê lê o MARCADOR do mesmo disco de mentira que o resto da casca', () => {
  // A terceira ponta, e ela mede o `ioFalso` em vez de uma dublê escrita à mão no teste: o marcador
  // PRESENTE no fixture libera o relatório velho, e a `raiz` que o `avaliar` consulta é a dos
  // artefatos. Sem isto, os dois testes acima provariam só que uma lambda devolve o que devolve.
  const velho = { 'outputs/spec/revisao.json': { texto: '{"versao":"1.0"}', mtime: 100 } };
  const semMarcador = avaliar(PROD, ioFalso(projetoCompleto(velho)));
  assert.equal(semMarcador.acao, 'deny');
  assert.match(semMarcador.motivo, /Relatório de revisão/);

  const comMarcador = avaliar(PROD, ioFalso(projetoCompleto({
    ...velho,
    [MARCADOR_CONGELAMENTO]: { texto: '# Explore congelado\n', mtime: 1000 },
  })));
  assert.equal(comMarcador.acao, 'allow', comMarcador && comMarcador.motivo);
});

test('REGISTRO real — em DISCO, o marcador dispensa o relatório velho, e a ausência dele nega', () => {
  // A ponta de PRODUÇÃO: o `IO_REAL.exploreCongelado` é quem responde, e o marcador é um arquivo
  // de verdade. O fixture é o mesmo do teste `IO_REAL.statMs compara idade DE VERDADE`, que nega —
  // aqui só o marcador entra, e é ele que muda o veredito.
  const raiz = projetoEmDisco();
  porArquivo(raiz, `${RAIZ_SPEC}/revisao.json`, '{"versao":"1.0"}', 1_700_000_100);
  noDiretorio(raiz, () => {
    // O MOTIVO É NOMEADO (M1 desta rodada): sem isto, um deny por QUALQUER outra razão — fixture
    // que parou de satisfazer os outros cinco itens, por exemplo — satisfaria a asserção, e a
    // segunda metade do teste passaria a medir outra coisa.
    const antes = despachar(PROD, REGISTRO);
    assert.equal(antes.acao, 'deny');
    assert.match(antes.motivo, /Relatório de revisão desatualizado/);
    porArquivo(raiz, MARCADOR_CONGELAMENTO, '# Explore congelado\n', 1_700_001_000);
    const r = despachar(PROD, REGISTRO);
    assert.equal(r.acao, 'allow', r.motivo || '');
  });
});
