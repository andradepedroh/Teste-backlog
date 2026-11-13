import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  CARIMBO_CONGELAMENTO, RE_CARIMBO, montarCarimbo, lerCarimbo, montarMarcador,
  avaliarZona, avaliarCongelamento, avaliarRaizIndeterminada, estaCongelado,
  MARCADOR_TEMPLATE, MANIFESTO_DA_ZONA, souOTemplate, paragrafoDoMaquinario, ehMarcadorDoTemplate,
  ehExtensaoDoProjeto, PASTA_DE_AGENTES, PASTA_DE_SKILLS,
} from './zonas.mjs';
import { spawnSync } from 'node:child_process';
import { MARCADOR_CONGELAMENTO, ehDoExplore, ehZonaImutavel } from './kit.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('montarCarimbo produz linha reconhecível por lerCarimbo', () => {
  const c = montarCarimbo('2026-08-25');
  const r = lerCarimbo('# HLD\n\n' + c + '\n\nTexto.');
  assert.equal(r.congelado, true);
  assert.equal(r.data, '2026-08-25');
});

test('o carimbo cita a palavra CONGELADO e o destino da mudança', () => {
  const c = montarCarimbo('2026-08-25');
  assert.match(c, /CONGELADO/);
  assert.match(c, /outputs\/spec/);
});

test('lerCarimbo devolve não-congelado em documento comum', () => {
  const r = lerCarimbo('# HLD Funcional\n\n> **Fase:** Explore\n\nTexto.');
  assert.equal(r.congelado, false);
  assert.equal(r.data, null);
});

test('lerCarimbo não confunde a palavra congelado em prosa', () => {
  const r = lerCarimbo('O documento será congelado depois do spec-product.');
  assert.equal(r.congelado, false);
});

test('lerCarimbo não confunde CONGELADO em maiúsculas fora do formato de carimbo', () => {
  // Este trecho não tem blockquote (`>`), nem negrito (`**`), nem data — é rejeitado por
  // faltarem esses elementos estruturais, não pela ancoragem de início de linha. Quem prova a
  // ancoragem de fato é o teste seguinte, que usa o formato COMPLETO do carimbo, só que fora do
  // início de linha.
  const r = lerCarimbo('Este trecho debate quando um documento fica CONGELADO em determinada fase.');
  assert.equal(r.congelado, false);
});

test('lerCarimbo rejeita o formato completo do carimbo quando não está ancorado no início da linha', () => {
  // Blockquote, negrito, "CONGELADO em" e data — todos os elementos estruturais presentes,
  // no formato exato que `montarCarimbo` produz. A única coisa errada é que o carimbo não abre
  // a linha: vem precedido de "Nota: " na mesma linha. Só a ancoragem `^` pode rejeitar isto.
  const meio = 'Nota: ' + montarCarimbo('2026-08-25');
  const r = lerCarimbo(meio);
  assert.equal(r.congelado, false);
});

test('lerCarimbo tolera texto vazio e nulo', () => {
  assert.equal(lerCarimbo('').congelado, false);
  assert.equal(lerCarimbo(null).congelado, false);
});

// ————— O que `lerCarimbo` responde sobre carimbo CITADO dentro de cerca de código —————
//
// HISTÓRICO, e ele explica por que estes testes continuam aqui depois do D1. Enquanto o
// congelamento morava na prosa dos documentos, esta era a pergunta que a TRAVA fazia, e um
// `gaps.md` documentando o procedimento de congelamento congelava o Explore inteiro. A cerca de
// código consertava a citação em bloco; a citação em blockquote, em prosa, não tinha conserto —
// é o mesmo texto do carimbo real. Por isso a verdade de máquina saiu daqui (ver `estaCongelado`).
//
// `lerCarimbo` continua existindo para quem ESCREVE e CONFERE o carimbo — o `promocao.mjs` do
// Plano 3 e o leitor humano — e para esses a resposta certa continua sendo "citação não é
// carimbo". O que mudou é que errar aqui não trava mais projeto nenhum.

test('carimbo citado dentro de cerca ``` não é lido como carimbo', () => {
  const texto = [
    '# GAPs',
    '',
    'Quando o `spec-product` fecha, cada documento recebe:',
    '',
    '```markdown',
    montarCarimbo('2026-08-26'),
    '```',
    '',
    'Ainda NÃO executamos o congelamento.',
  ].join('\n');
  assert.equal(lerCarimbo(texto).congelado, false);
});

test('carimbo citado dentro de cerca ```` que embrulha uma ``` não é lido como carimbo', () => {
  // A forma que um documento de verdade usa para citar um bloco markdown: quatro crases por fora,
  // três por dentro. Um rastreio de cerca por toggle ingênuo deixaria o carimbo de fora do bloco.
  const texto = [
    '# sync-log',
    '',
    '````',
    'Quando o `spec-product` fecha, cada documento recebe:',
    '',
    '```markdown',
    montarCarimbo('2026-08-26'),
    '```',
    '',
    'Ainda NÃO executamos o congelamento.',
    '````',
  ].join('\n');
  assert.equal(lerCarimbo(texto).congelado, false);
});

test('carimbo REAL antes de uma cerca que também cita o carimbo: a data vem do real', () => {
  const texto = [
    montarCarimbo('2026-08-25'),
    '',
    '# GAPs',
    '',
    '```markdown',
    montarCarimbo('2030-01-01'),
    '```',
  ].join('\n');
  const r = lerCarimbo(texto);
  assert.equal(r.congelado, true);
  assert.equal(r.data, '2026-08-25', 'a data tem que vir do carimbo real, não do citado');
});

test('cerca aberta e NUNCA fechada engole o carimbo que vem depois dela', () => {
  // Documento malformado: a cerca vaza até o fim e o carimbo cai dentro dela. A leitura é "não
  // carimbado", e a cerca não fechada já é relatada como defeito por `secoesVazias` /
  // `CERCA_NAO_FECHADA` — o documento malformado não passa silencioso pelo fecho.
  const texto = '# GAPs\n\n```markdown\n' + montarCarimbo('2026-08-26') + '\n\nsem fechar a cerca';
  assert.equal(lerCarimbo(texto).congelado, false);
});

test('documento SEM cerca nenhuma continua sendo lido como carimbado', () => {
  const texto = '# HLD\n\n' + montarCarimbo('2026-08-26') + '\n\nCorpo do documento.';
  const r = lerCarimbo(texto);
  assert.equal(r.congelado, true);
  assert.equal(r.data, '2026-08-26');
});

// ————— C2: a linha de carimbo é a linha INTEIRA —————

test('C2 — RE_CARIMBO exige a linha INTEIRA, não só o prefixo', () => {
  // Antes, a regex ancorava só o começo da linha e o resto era livre. Enquanto o carimbo decidia
  // trava, isso era um canal de conteúdo arbitrário para dentro de documento congelado. Hoje é o
  // `promocao.mjs` que depende de escrever e reconhecer exatamente a mesma linha.
  const cauda = '> **CONGELADO em 2026-08-26** O prazo do boleto passa a ser 30 dias.';
  assert.equal(RE_CARIMBO.test(cauda), false);
  assert.equal(lerCarimbo(cauda).congelado, false);
});

test('C2 — RE_CARIMBO é derivada de montarCarimbo: casa a linha que ela produz, e só ela', () => {
  assert.equal(RE_CARIMBO.test(montarCarimbo('2026-08-26')), true);
  // Prefixo sozinho — o formato que a regex antiga aceitava — não casa mais.
  assert.equal(RE_CARIMBO.test(`> **${CARIMBO_CONGELAMENTO} 2026-08-26**`), false);
  // Palavra a menos no meio do texto fixo também não casa.
  assert.equal(RE_CARIMBO.test(montarCarimbo('2026-08-26').replace('sucedido por ', '')), false);
});

test('avaliarZona nega escrita no maquinário do template', () => {
  const r = avaliarZona('.claude/hooks/kit.mjs');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('avaliarZona explica o que fazer, não só o que falhou', () => {
  const r = avaliarZona('CLAUDE.md');
  // Não basta citar "template" — a mensagem precisa apontar um destino alternativo concreto
  // para a mudança (a zona mutável), não só nomear a zona que falhou.
  assert.match(r.motivo, /zona mutável/i);
  assert.match(r.motivo, /outputs\//);
});

test('avaliarZona libera a zona mutável', () => {
  assert.equal(avaliarZona('outputs/explore/gaps.md'), null);
  assert.equal(avaliarZona('outputs/spec/modules.md'), null);
  assert.equal(avaliarZona('.claude/rules/frontend.md'), null);
  assert.equal(avaliarZona('inputs/briefing.md'), null);
});

test('avaliarCongelamento nega escrita no Explore congelado', () => {
  const r = avaliarCongelamento('outputs/explore/hld-funcional.md', true);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /congelad/i);
});

test('a mensagem de congelamento diz para onde a mudança vai', () => {
  const r = avaliarCongelamento('outputs/explore/gaps.md', true);
  assert.match(r.motivo, /outputs\/spec/);
  assert.match(r.motivo, /spec-scope-change/);
});

test('avaliarCongelamento libera enquanto o Explore não está congelado', () => {
  assert.equal(avaliarCongelamento('outputs/explore/hld-funcional.md', false), null);
});

test('avaliarCongelamento não toca em caminho fora do Explore', () => {
  assert.equal(avaliarCongelamento('outputs/spec/modules.md', true), null);
  assert.equal(avaliarCongelamento('inputs/x.md', true), null);
});

// ————— I1: a trava sem raiz de artefatos NEGA, e diz o que corrigir —————
//
// A trava do congelamento passou a resolver a raiz dos artefatos antes de julgar (conserto do I1),
// pelo `descobrirWorkspace` — o mesmo mecanismo do `fecho-explore`. Quando ele não sabe responder
// (`ambiguo`, `cwd-ilegivel`), um bloqueante não pode liberar: o marcador mora em
// `<repo de docs>/outputs/spec/`, e "não sei qual é o repo de docs" viraria "não está congelado".
// A mensagem mora aqui, e não na casca do despachante, pela mesma razão que a de congelamento: o
// `zonas.mjs` é o dono do veredito, e mensagem escrita na casca é mensagem sem teste.

test('avaliarRaizIndeterminada nega, nomeia o motivo e manda rodar o `--validar`', () => {
  const r = avaliarRaizIndeterminada('portal-docs/outputs/explore/gaps.md', 'ambiguo', 'pastas candidatas a repo de docs: portal-docs, outro-docs');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /portal-docs\/outputs\/explore\/gaps\.md/);
  assert.match(r.motivo, /workspace indeterminado/i);
  assert.match(r.motivo, /ambiguo/);
  assert.match(r.motivo, /outro-docs/);
  assert.match(r.motivo, /workspace\.mjs --validar/);
  // A saída anunciada tem que ser a que RESOLVE este problema. Mandar remover o marcador — a saída
  // da outra negação desta trava — seria instrução que não satisfaz o gate: nem se sabe onde ele
  // está. Instrução de bloqueante que não destrava é o falso positivo mais caro que existe.
  assert.doesNotMatch(r.motivo, /remova esse arquivo/);
});

test('avaliarRaizIndeterminada não inventa detalhe quando não recebe um', () => {
  const r = avaliarRaizIndeterminada('outputs/explore/gaps.md', 'cwd-ilegivel', null);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /cwd-ilegivel/);
  assert.match(r.motivo, /sem detalhe/);
});

// ————— D1: NÃO existe mais exceção ao autobloqueio —————
//
// A exceção liberava a instalação do carimbo dentro de um Explore já congelado, e para isso
// precisava distinguir "instalar carimbo" de "reescrever documento" a partir do texto. Foram três
// rodadas e três bypasses reproduzidos — presença do carimbo lida como instalação, arquivo NOVO
// nascendo carimbado, corpo trocado junto com o carimbo. Com o marcador, quem congela carimba
// ANTES de criar o marcador: a operação privilegiada deixa de existir, e com ela o mecanismo.
//
// `avaliarCongelamento` passa a ter DOIS parâmetros. Estes testes fixam que nenhum terceiro
// argumento reabre a porta.

test('D1 — nenhuma forma de conteúdo reabre a escrita num Explore congelado', () => {
  const carimbo = montarCarimbo('2026-08-26');
  const corpo = '# GAPs\n\n## GAP-001 — prazo do boleto\n\nQuestão aberta com o cliente.\n';
  const tentativas = [
    ['conteúdo com o carimbo no topo', `${carimbo}\n\n${corpo}`],
    ['corpo anterior intacto mais a linha do carimbo', `# GAPs\n\n${carimbo}\n\n## GAP-001 — prazo do boleto\n\nQuestão aberta com o cliente.\n`],
    ['só a linha do carimbo', carimbo],
    ['edição comum, sem carimbo', '# GAPs\n\noutra coisa'],
  ];
  for (const [nome, conteudoNovo] of tentativas) {
    // O terceiro argumento é o pacote que a exceção consumia. Ele não existe mais na assinatura;
    // passá-lo assim mesmo tem que ser inócuo. Se alguém reintroduzir a exceção, isto fica vermelho.
    const r = avaliarCongelamento('outputs/explore/gaps.md', true, {
      conteudoNovo,
      anterior: { existe: true, conteudo: corpo },
      conteudoEhArquivoInteiro: true,
    });
    assert.equal(r && r.acao, 'deny', nome);
  }
});

test('D1 — `avaliarCongelamento` decide com dois argumentos: não há mais estado anterior a ler', () => {
  assert.equal(avaliarCongelamento('outputs/explore/gaps.md', true).acao, 'deny');
  assert.equal(avaliarCongelamento('outputs/explore/gaps.md', false), null);
});

// ————— D1: o congelamento é um MARCADOR, não prosa dentro dos documentos —————
//
// Enquanto a verdade de máquina morava na linha de carimbo, não existia padrão capaz de separar o
// carimbo da CITAÇÃO do carimbo — são o mesmo texto. Documentar o procedimento de congelamento no
// `gaps.md`, que é exatamente o que esse documento existe para fazer, congelava o projeto e
// bloqueava a própria correção. A cerca de código consertava a citação em bloco; o blockquote em
// prosa não tem conserto por regex.
//
// A troca por um arquivo que existe ou não existe elimina o falso positivo por CONSTRUÇÃO, torna
// `estaCongelado` O(1), e dispensa a exceção do autobloqueio: instalar o carimbo passa a ser
// escrita comum, feita ANTES de o marcador existir.

/** Cria o marcador de congelamento em `raiz`, como o `promocao.mjs` fará. */
function congelar(raiz) {
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec', '_explore-congelado.md'), '# Explore congelado\n');
}

test('D1 — o marcador congela o Explore, e o conteúdo dos documentos não é consultado', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), '# GAPs\n\nsem carimbo nenhum\n');
  assert.equal(estaCongelado(raiz), false);
  congelar(raiz);
  assert.equal(estaCongelado(raiz), true);
});

test('D1 — o carimbo em PROSA, fora de cerca, NÃO congela mais: é o falso positivo que fechou o projeto', () => {
  // O caso reproduzido no briefing e que não tinha conserto por regex: o `gaps.md` registra o
  // procedimento de congelamento em blockquote, em prosa — a mesma linha, no mesmo formato, sem
  // cerca de código em volta. Isso congelava os cinco documentos e negava a correção do próprio
  // `gaps.md`. Com o marcador, o texto do documento deixou de decidir qualquer coisa.
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  writeFileSync(
    join(raiz, 'outputs', 'explore', 'gaps.md'),
    '# GAPs\n\nQuando o `spec-product` fecha, cada documento recebe a linha abaixo:\n\n' +
      montarCarimbo('2026-08-26') + '\n\nAinda NÃO executamos o congelamento.\n',
  );
  assert.equal(estaCongelado(raiz), false, 'citação nua do carimbo não pode congelar o projeto');
  // E `lerCarimbo` — que continua existindo para o `promocao.mjs` e para o leitor humano — segue
  // reconhecendo a linha. As duas representações têm donos diferentes, e é isso que as separa.
  assert.equal(lerCarimbo(readFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), 'utf8')).congelado, true);
});

test('D1 — o marcador vive FORA de `outputs/explore/`: a zona que ele tranca não pode contê-lo', () => {
  // Dentro do Explore, o marcador ficaria sob a própria trava — remover o congelamento exigiria
  // escrever na zona congelada, que é o autobloqueio de novo, por outra porta.
  assert.equal(ehDoExplore(MARCADOR_CONGELAMENTO), false);
  assert.equal(ehZonaImutavel(MARCADOR_CONGELAMENTO), false, 'tem que ser removível pelo consultor');
  assert.equal(MARCADOR_CONGELAMENTO, 'outputs/spec/_explore-congelado.md');
});

test('D1 — documento carimbado SEM o marcador não congela: quem manda é o marcador', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), '# GAPs\n\n' + montarCarimbo('2026-08-25'));
  assert.equal(estaCongelado(raiz), false);
});

test('D1 — remover o marcador REABRE o Explore, que é a saída que a mensagem de negação promete', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  congelar(raiz);
  assert.equal(estaCongelado(raiz), true);
  rmSync(join(raiz, 'outputs', 'spec', '_explore-congelado.md'));
  assert.equal(estaCongelado(raiz), false);
});

test('D1 — a mensagem de negação diz onde o congelamento está registrado, e não promete isenção', () => {
  // A mensagem antiga mandava o consultor usar a "válvula de isenção" para corrigir typo.
  // `DIR_ISENCOES` e `BLOCO_ISENCAO` existem no kit e não têm NENHUM consumidor em produção: sob o
  // modelo de acidente, a trava disparando errado deixava o consultor sem saída nenhuma. Agora a
  // saída é concreta e verificável — o arquivo que registra o congelamento, e removê-lo.
  const r = avaliarCongelamento('outputs/explore/gaps.md', true);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, new RegExp(MARCADOR_CONGELAMENTO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(r.motivo, /remov/i);
  assert.doesNotMatch(r.motivo, /isen/i, 'não anunciar saída que não existe em produção');
});

// ————— E1: a rule que o agente lê em runtime × a constante que a trava lê —————
//
// A mensagem de negação já foi corrigida (teste acima), mas quem NUNCA foi negado não a vê: ele
// lê `.claude/rules/harness/plan.md` e faz o que está escrito lá. Enquanto a rule mandava só
// carimbar os cinco documentos, quem a seguisse deixava o marcador por criar e o congelamento
// virava decoração — a trava nunca ligava. É o mesmo cruzamento do teste que confere
// `ZONA_IMUTAVEL` contra o `harness.json`: duas cópias do mesmo contrato, uma verificação que as
// obriga a mudar juntas. Mude `MARCADOR_CONGELAMENTO` sem mexer na rule e isto fica vermelho.

/** A seção "Congelamento do Explore" da rule do Plan, do título até o próximo `## `. */
function secaoCongelamentoDaRule() {
  const texto = readFileSync(join(RAIZ, '.claude', 'rules', 'harness', 'plan.md'), 'utf8');
  const i = texto.indexOf('## Congelamento do Explore');
  assert.notEqual(i, -1, 'a rule do Plan precisa da seção "Congelamento do Explore"');
  const resto = texto.slice(i + 1); // +1 para o próximo `\n## ` não casar o próprio título
  const fim = resto.indexOf('\n## ');
  return fim === -1 ? resto : resto.slice(0, fim);
}

test('E1 — a rule do Plan cita o caminho literal do marcador que liga a trava', () => {
  // Carimbar os cinco documentos não congela nada: quem decide é a existência deste arquivo.
  assert.ok(
    secaoCongelamentoDaRule().includes(MARCADOR_CONGELAMENTO),
    `a seção "Congelamento do Explore" tem que citar \`${MARCADOR_CONGELAMENTO}\` — sem ele, quem ` +
    'segue a rule carimba os documentos e deixa o Explore destrancado',
  );
});

test('E1 — a rule não manda o consultor pela válvula de isenção, que não tem consumidor', () => {
  // Mesma razão do teste da mensagem de negação, na outra ponta: `DIR_ISENCOES`/`BLOCO_ISENCAO`
  // não são lidos por nada em produção. A saída real é remover o marcador, e é ela que a rule
  // tem que ensinar.
  const secao = secaoCongelamentoDaRule();
  assert.doesNotMatch(secao, /isen/i, 'a rule não pode anunciar saída que não existe em produção');
  assert.match(secao, /remov/i, 'a rule tem que ensinar a saída real: remover o marcador');
});

test('E1 — a linha de carimbo que a rule manda escrever é a que `montarCarimbo` produz', () => {
  // A rule é o único manual de quem carimba à mão — `promocao.mjs` (Plano 3) ainda não existe.
  // Se a rule ditasse uma linha diferente da que `montarCarimbo` monta, o documento nasceria com
  // um carimbo que `lerCarimbo` não reconhece, e o conferidor do Plano 3 acusaria falso negativo.
  // `AAAA-MM-DD` é o lugar da data, e não casa `RE_CARIMBO` — o exemplo na rule não é um carimbo.
  assert.ok(
    secaoCongelamentoDaRule().includes(montarCarimbo('AAAA-MM-DD')),
    'a linha de exemplo da rule tem que ser, literalmente, a saída de `montarCarimbo`',
  );
});

test('D1 — `estaCongelado` NÃO LÊ o conteúdo do marcador: só a existência decide', () => {
  // A asserção prende a DECISÃO, não o texto. Se alguém fizer `estaCongelado` abrir o conteúdo, a
  // Decisão 16 volta a depender de interpretar prosa — que é o travamento que ela pagou para
  // remover. `estaCongelado` recebe `statear`, não um leitor de conteúdo, e é isso que se verifica.
  //
  // ELE NÃO EXERCITA `montarMarcador`, e é por isso que mora AQUI, na vizinhança do `estaCongelado`,
  // e não na seção do formato do marcador: enquanto ele se chamava "montarMarcador NÃO é lido por
  // máquina", o nome prometia medir o montador e o corpo media o leitor — passaria com
  // `montarMarcador` deletada. Quem exercita `montarMarcador` de verdade são os três testes da
  // seção F1, que a chamam.
  //
  // A ARIDADE NÃO SERVE COMO MEDIDA: `statear` tem valor padrão, e parâmetro com padrão não conta
  // em `Function.prototype.length` — `estaCongelado.length` é 1, não 2. Um teste escrito sobre a
  // aridade ficaria vermelho sem defeito nenhum. O que se lê é a lista de parâmetros.
  const src = readFileSync(new URL('./zonas.mjs', import.meta.url), 'utf8');
  const i = src.indexOf('export function estaCongelado');
  assert.notEqual(i, -1, 'estaCongelado deixou de ser exportada por declaração');
  const [, params] = /export function estaCongelado\(([^)]*)\)/.exec(src.slice(i));
  assert.match(params, /statear/, 'estaCongelado mudou de assinatura: ela recebe `statear`');
  assert.doesNotMatch(params, /lerArquivo|conteudo|texto/, 'estaCongelado passou a receber leitor de conteúdo');
  const corpo = src.slice(i, i + 400);
  assert.ok(!/lerArquivo|readFileSync/.test(corpo), 'estaCongelado passou a LER o marcador');
});

test('D1 — `estaCongelado` RELANÇA o que não for ausência: presente e ilegível não é ausente', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  const statearRuim = () => { const e = new Error('sem permissão'); e.code = 'EACCES'; throw e; };
  assert.throws(() => estaCongelado(raiz, statearRuim), /EACCES|permiss/i);
});

test('D1 — `estaCongelado` RELANÇA o que o `statSync` REAL recusa, e não só o que a dublê lança', () => {
  // O byte nulo faz o PRÓPRIO `statSync` real recusar o caminho com `ERR_INVALID_ARG_VALUE` — não
  // é ENOENT nem ENOTDIR, então tem que subir. Escolhido em vez de injetar `statear` porque
  // exercita o `statSync` de verdade, e não uma dublê que poderia divergir dele. Trocar o `throw`
  // do `catch` por `return false` é o congelamento inteiro virando no-op silencioso.
  assert.throws(() => estaCongelado('raiz\0invalida'), /null bytes|ERR_INVALID_ARG_VALUE/);
});

test('D1 — `estaCongelado` devolve false quando o caminho do marcador não existe', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  assert.equal(estaCongelado(raiz), false, 'projeto zerado');
  // `outputs/spec` ocupado por um ARQUIVO: o marcador não pode existir sob ele, e isso é ausência,
  // não falha. QUAL erro o `stat` levanta VARIA POR PLATAFORMA, e o comentário anterior afirmava
  // só metade: no Windows — onde o harness roda — é `ENOENT` (medido); em POSIX é `ENOTDIR`. Por
  // isso este teste passa pelo ramo `ENOENT` aqui, e quem cobre o outro ramo é o teste abaixo, que
  // INJETA o erro. Sem ele, remover `ENOTDIR` de `ehAusencia` sobrevivia à suíte inteira.
  mkdirSync(join(raiz, 'outputs'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec'), 'isto é um arquivo, não um diretório');
  assert.equal(estaCongelado(raiz), false);
});

test('E4 — `ENOTDIR` também é ausência: o ramo POSIX de `ehAusencia`, injetado', () => {
  // O ramo está CERTO — é POSIX que levanta `ENOTDIR` quando um componente do caminho é arquivo,
  // e a restrição global 1 nomeia os dois códigos. O que faltava era teste: no Windows o erro não
  // ocorre naturalmente, então ele é injetado em vez de fabricado pelo sistema de arquivos.
  // Remover `ENOTDIR` de `ehAusencia` transforma isto num throw, e o harness passaria a negar
  // escrita com "falha do harness" onde só falta um diretório.
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  const statearNotDir = () => { const e = new Error('ENOTDIR'); e.code = 'ENOTDIR'; throw e; };
  assert.equal(estaCongelado(raiz, statearNotDir), false);
  // E o par: `ENOENT` injetado responde igual, para os dois ramos ficarem fixados no mesmo lugar.
  const statearNoEnt = () => { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; };
  assert.equal(estaCongelado(raiz, statearNoEnt), false);
});

test('N1 — DIRETÓRIO no caminho do marcador congela: `estaCongelado` pergunta existência, não tipo', () => {
  // A ausência da guarda `isFile()` é decisão documentada e conservadora: das duas leituras de um
  // caminho ocupado por algo estranho, negar a escrita é a que erra para o lado barato, e a saída
  // continua sendo remover o que está lá. Estava indefesa nos DOIS sentidos — acrescentar
  // `isFile()` deixava a suíte verde, e tirá-lo depois também. Este teste fixa a decisão: trocá-la
  // passa a exigir trocar isto aqui, de propósito.
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  mkdirSync(join(raiz, 'outputs', 'spec', '_explore-congelado.md'), { recursive: true });
  assert.equal(estaCongelado(raiz), true, 'qualquer coisa naquele caminho é o marcador');
  assert.equal(avaliarCongelamento('outputs/explore/gaps.md', estaCongelado(raiz)).acao, 'deny');
});

test('D1 — `estaCongelado` lê a raiz que recebeu: o marcador de outro projeto não congela este', () => {
  const a = mkdtempSync(join(tmpdir(), 'zonas-a-'));
  const b = mkdtempSync(join(tmpdir(), 'zonas-b-'));
  congelar(a);
  assert.equal(estaCongelado(a), true);
  assert.equal(estaCongelado(b), false);
});

// ————— I5: pertencimento ao Explore é do `ehDoExplore`, não de `startsWith` à mão —————

test('avaliarCongelamento pega o Explore escrito com outra caixa', () => {
  // O `startsWith(RAIZ_EXPLORE + '/')` que morava aqui era sensível a caixa. No Windows, onde o
  // harness de fato roda, `outputs/Explore/hld-funcional.md` grava NO MESMO arquivo real.
  const r = avaliarCongelamento('outputs/Explore/hld-funcional.md', true);
  assert.equal(r.acao, 'deny');
});

test('avaliarCongelamento pega o diretório do Explore SEM barra final', () => {
  // `casa()` casa também o diretório nu; o `startsWith(RAIZ_EXPLORE + '/')` anterior exigia a
  // barra, então um comando que movesse ou removesse a pasta inteira (alvo `outputs/explore`,
  // sem `/`) escapava da trava só por não ter terminado o argumento com barra.
  const r = avaliarCongelamento('outputs/explore', true);
  assert.equal(r.acao, 'deny');
});

test('avaliarCongelamento pega travessia que reentra no Explore', () => {
  // `outputs/spec/../explore/gaps.md` é `outputs/explore/gaps.md`. Sem `norm`, o `startsWith`
  // anterior não reconhecia o destino e liberava.
  const r = avaliarCongelamento('outputs/spec/../explore/gaps.md', true);
  assert.equal(r.acao, 'deny');
});

test('avaliarCongelamento não confunde diretório de nome parecido com o Explore', () => {
  // `outputs/explore-antigo/` NÃO está sob `outputs/explore/`. Um `startsWith` sem a barra
  // separadora pegaria este caminho por engano; `casa()` exige a fronteira de segmento.
  assert.equal(avaliarCongelamento('outputs/explore-antigo/gaps.md', true), null);
});

// ————— N3: o literal do carimbo tem UM dono —————

test('RE_CARIMBO reconhece a linha montada a partir de CARIMBO_CONGELAMENTO', () => {
  // N3: a regex repetia o literal `CONGELADO em` em vez de derivá-lo da constante. Duas cópias do
  // mesmo literal divergem na primeira vez que alguém edita uma — e a divergência aqui significa
  // `montarCarimbo` gravando um carimbo que `lerCarimbo` não reconhece, em silêncio. Este teste
  // amarra os três: constante, regex e montador.
  assert.match(RE_CARIMBO.source, new RegExp(CARIMBO_CONGELAMENTO));
  assert.equal(RE_CARIMBO.test(montarCarimbo('2026-08-26')), true);
  assert.match(montarCarimbo('2026-08-26'), new RegExp(CARIMBO_CONGELAMENTO));
  assert.equal(lerCarimbo(montarCarimbo('2026-08-26')).congelado, true);
});

test('RE_CARIMBO não reconhece um literal parecido mas diferente', () => {
  assert.equal(RE_CARIMBO.test('> **CONGELADA em 2026-08-26**'), false);
  assert.equal(RE_CARIMBO.test('> **CONGELADO na 2026-08-26**'), false);
});

test('cenário completo: carimbar os cinco documentos passa; depois do marcador, nada mais passa', () => {
  // A ORDEM é o que substitui a exceção do autobloqueio, e é ela que este cenário fixa. Quem
  // congela carimba os documentos PRIMEIRO — escrita comum, o Explore ainda não está congelado —
  // e cria o marcador por ÚLTIMO. A versão anterior deste cenário provava que a exceção deixava
  // passar o segundo e o terceiro carimbo depois que o primeiro já havia congelado o projeto;
  // esse problema não existe mais porque essa situação não acontece mais.
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-'));
  const dirExplore = join(raiz, 'outputs', 'explore');
  mkdirSync(dirExplore, { recursive: true });

  const carimbo = montarCarimbo('2026-08-26');
  const docs = ['hld-funcional.md', 'especificacao-funcional.md', 'gaps.md'];
  for (const doc of docs) writeFileSync(join(dirExplore, doc), `# ${doc}\n\nConteúdo sem carimbo.`);

  // Fase 1 — carimbar. Nenhuma dessas escritas é negada, porque nada congelou ainda.
  for (const doc of docs) {
    assert.equal(
      avaliarCongelamento(`outputs/explore/${doc}`, estaCongelado(raiz)), null,
      `carimbar ${doc} antes do marcador não pode ser negado`,
    );
    writeFileSync(join(dirExplore, doc), `# ${doc}\n\n${carimbo}\n\nConteúdo sem carimbo.`);
  }
  assert.equal(estaCongelado(raiz), false, 'carimbo em documento não congela nada por si só');

  // Fase 2 — o marcador. A partir daqui a trava morde, e morde tudo.
  congelar(raiz);
  assert.equal(estaCongelado(raiz), true);
  for (const doc of [...docs, 'hld-funcional-v2.md', 'anexos/rascunho.md']) {
    const r = avaliarCongelamento(`outputs/explore/${doc}`, estaCongelado(raiz));
    assert.equal(r.acao, 'deny', doc);
  }
  // E a saída continua aberta: o marcador está na zona mutável.
  rmSync(join(raiz, 'outputs', 'spec', '_explore-congelado.md'));
  assert.equal(avaliarCongelamento('outputs/explore/gaps.md', estaCongelado(raiz)), null);
});

// ————————————————————————— F1: o formato do marcador —————————————————————————
//
// O marcador tem DOIS leitores, e só um deles é máquina — `estaCongelado`, que pergunta pela
// EXISTÊNCIA do arquivo. O conteúdo é para o humano que o abre e para o `git log` de quem herda o
// projeto. Ele mora aqui, e não no `promocao.mjs`, pelo mesmo motivo que `montarCarimbo` mora aqui.

test('montarMarcador nomeia a data e todos os documentos carimbados', () => {
  const t = montarMarcador({ data: '2026-09-08', documentos: ['gaps.md', 'hld-funcional.md'] });
  assert.match(t, /Explore congelado em 2026-09-08/);
  assert.match(t, /outputs\/explore\/gaps\.md/);
  assert.match(t, /outputs\/explore\/hld-funcional\.md/);
});

test('montarMarcador sem documentos não produz lista vazia silenciosa', () => {
  assert.match(montarMarcador({ data: '2026-09-08', documentos: [] }), /\(nenhum\)/);
  assert.match(montarMarcador(), /\(nenhum\)/);
});

test('montarMarcador não anuncia a válvula de isenção, que não destranca o Explore', () => {
  // Mesma razão da mensagem de negação (`avaliarCongelamento`) e da rule do Plan, na terceira
  // ponta: NENHUM mecanismo isenta escrita sob `outputs/explore/` depois do marcador — a trava não
  // tem exceção, de propósito. Mandar o consultor pela isenção é anunciar porta que não abre. A
  // saída real é remover o marcador, e é ela que o texto do marcador tem que ensinar.
  const t = montarMarcador({ data: '2026-09-08', documentos: ['gaps.md'] });
  assert.doesNotMatch(t, /isen/i, 'o marcador não pode anunciar saída que não existe em produção');
  assert.match(t, /remov/i, 'o marcador tem que ensinar a saída real');
});

test('E1 — a rule do Plan manda rodar o comando, e não criar o marcador à mão', () => {
  // A rule é o que o agente lê em runtime, e ela é a terceira cópia deste contrato — a primeira é
  // a ordem dentro de `congelar`, a segunda é a mensagem de negação. Enquanto ela ensinar o
  // procedimento manual, quem a seguir pode criar o marcador ANTES de carimbar e trancar o Explore
  // com os documentos crus, que é exatamente o que a ordem do comando existe para impedir.
  const secao = secaoCongelamentoDaRule();
  assert.match(secao, /promocao\.mjs --congelar/, 'a rule tem que nomear o comando que congela');
  assert.match(secao, /não crie o marcador à mão/i, 'a rule tem que proibir o marcador manual');
  // E a ordem, escrita: carimbar antes de marcar.
  //
  // OS DOIS ÍNDICES TÊM QUE EXISTIR ANTES DE SEREM COMPARADOS. Com a comparação nua, `carimb`
  // desaparecendo da seção dava `-1 < n`, que é VERDADEIRO: a asserção ficava verde afirmando uma
  // ordem entre um texto presente e um ausente. Exatamente o caso que ela existe para pegar — uma
  // rule que só manda criar o marcador — passava.
  const iCarimbo = secao.indexOf('carimb');
  const iMarcador = secao.indexOf(MARCADOR_CONGELAMENTO);
  assert.notEqual(iCarimbo, -1, 'a rule deixou de falar do carimbo — não há ordem para conferir');
  assert.notEqual(iMarcador, -1, 'a rule deixou de citar o marcador — não há ordem para conferir');
  assert.ok(iCarimbo < iMarcador, 'a rule tem que falar do carimbo ANTES do marcador');
});

// ————————————————————————————— Decisão 40: o template se reconhece —————————————————————————————

test('souOTemplate responde pela EXISTÊNCIA do marcador, e só por ela', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-tpl-'));
  try {
    assert.equal(souOTemplate(raiz), false, 'sem marcador é clone');
    writeFileSync(join(raiz, MARCADOR_TEMPLATE), '');
    assert.equal(souOTemplate(raiz), true, 'com marcador é template — conteúdo não importa');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('Decisão 67: num clone (com manifesto), criar o marcador não destrava — touch, mkdir ou PowerShell', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-clone-'));
  try {
    writeFileSync(join(raiz, MANIFESTO_DA_ZONA), '{}');
    writeFileSync(join(raiz, MARCADOR_TEMPLATE), '');
    assert.equal(souOTemplate(raiz), false, 'marcador + manifesto é clone: o marcador sozinho não é chave');
    rmSync(join(raiz, MARCADOR_TEMPLATE));
    mkdirSync(join(raiz, MARCADOR_TEMPLATE));
    assert.equal(souOTemplate(raiz), false, 'marcador como diretório também não destrava um clone');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('Decisão 67: avaliarZona nega no clone e abre no template', () => {
  const clone = avaliarZona('.claude/skills/spec-report/SKILL.md');
  const template = avaliarZona('.claude/skills/spec-report/SKILL.md', { ehTemplate: () => true });
  assert.equal(clone.acao, 'deny');
  assert.match(clone.motivo, /muda no template, não aqui/);
  assert.equal(template, null, 'no template a zona imutável é editável');
  for (const rel of ['CLAUDE.md', '.claude/settings.json', '.claude/hooks/kit.mjs', '.claude/rules/harness/plan.md']) {
    assert.equal(avaliarZona(rel, { ehTemplate: () => true }), null, rel);
    assert.equal(avaliarZona(rel).acao, 'deny', rel);
  }
});

test('Decisão 67: criar o marcador é negado no clone — senão o agente se destravaria sozinho', () => {
  for (const rel of [MARCADOR_TEMPLATE, './.harness-template', '.HARNESS-TEMPLATE', 'x/../.harness-template']) {
    const r = avaliarZona(rel);
    assert.equal(r && r.acao, 'deny', rel);
    assert.match(r.motivo, /marcador do template/);
    assert.match(r.motivo, /pelo terminal/);
    assert.equal(avaliarZona(rel, { ehTemplate: () => true }), null, `${rel}: no template o marcador é livre`);
  }
  // só o marcador da RAIZ é chave: um homônimo em subpasta não marca nada
  assert.equal(avaliarZona('docs/.harness-template'), null);
  assert.equal(ehMarcadorDoTemplate('docs/.harness-template'), false);
});

test('avaliarZona sem opts.ehTemplate é clone, e não lança', () => {
  assert.doesNotThrow(() => avaliarZona('CLAUDE.md'));
  assert.doesNotThrow(() => avaliarZona('CLAUDE.md', {}));
  assert.match(avaliarZona('CLAUDE.md', {}).motivo, /muda no template, não aqui/);
});

test('avaliarZona só pergunta ehTemplate quando o caminho é da zona ou é o marcador', () => {
  let perguntas = 0;
  const ehTemplate = () => { perguntas += 1; return true; };
  assert.equal(avaliarZona('outputs/spec/modules.md', { ehTemplate }), null);
  assert.equal(perguntas, 0, 'caminho fora da zona não paga a pergunta');
  avaliarZona('.claude/hooks/kit.mjs', { ehTemplate });
  assert.equal(perguntas, 1);
  avaliarZona(MARCADOR_TEMPLATE, { ehTemplate });
  assert.equal(perguntas, 2);
});

test('o parágrafo do maquinário explica para onde vai a mudança, e não fala do template', () => {
  const texto = paragrafoDoMaquinario().join('\n');
  assert.match(texto, /zona mutável/i); // o teste antigo "explica o que fazer" continua verdade
  assert.match(texto, /outputs\//);
  // a mensagem antiga do mantenedor ("a trava não abre") não pode voltar: hoje ela mentiria
  assert.doesNotMatch(texto, /não abre/);
});

// ————————————————————— a chave apagada: manifesto fora do disco, mas no HEAD —————————————————————

const gitEm = (raiz, ...args) => {
  const r = spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: raiz, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
};

test('souOTemplate: manifesto apagado do disco mas presente no HEAD é CLONE — rm + touch não destrava', () => {
  // O bypass reproduzido: `rm harness-zona*` (o glob passava pela trava do Bash como nome literal)
  // seguido de `touch .harness-template`. As duas condições do `souOTemplate` ficavam satisfeitas
  // e a zona imutável abria. O HEAD do git é a testemunha que o agente não apaga com um `rm`.
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-head-'));
  try {
    gitEm(raiz, 'init', '-q');
    writeFileSync(join(raiz, MANIFESTO_DA_ZONA), '{}');
    gitEm(raiz, 'add', MANIFESTO_DA_ZONA);
    gitEm(raiz, 'commit', '-q', '-m', 'pacote');
    rmSync(join(raiz, MANIFESTO_DA_ZONA));
    writeFileSync(join(raiz, MARCADOR_TEMPLATE), '');
    assert.equal(souOTemplate(raiz), false, 'o manifesto está no HEAD: isto é um clone');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('souOTemplate: repositório sem o manifesto no HEAD continua sendo template', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'zonas-head-tpl-'));
  try {
    gitEm(raiz, 'init', '-q');
    writeFileSync(join(raiz, 'README.md'), 'x');
    gitEm(raiz, 'add', 'README.md');
    gitEm(raiz, 'commit', '-q', '-m', 'template');
    writeFileSync(join(raiz, MARCADOR_TEMPLATE), '');
    assert.equal(souOTemplate(raiz), true);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('souOTemplate: a pergunta ao HEAD é injetável, e só é feita quando o disco diria "template"', () => {
  let perguntas = 0;
  const noHead = () => { perguntas += 1; return true; };
  const existe = (abs) => abs.endsWith(MARCADOR_TEMPLATE);
  assert.equal(souOTemplate('/r', existe, noHead), false, 'manifesto no HEAD vence o disco');
  assert.equal(perguntas, 1);
  assert.equal(souOTemplate('/r', () => false, noHead), false);
  assert.equal(perguntas, 1, 'sem marcador não há o que perguntar ao git');
  assert.equal(souOTemplate('/r', existe, () => false), true, 'falha do git = comportamento de antes');
});

// ————————————————————— extensões legítimas do projeto na zona —————————————————————

const MANIFESTO_FAKE = {
  zona: ['CLAUDE.md', PASTA_DE_AGENTES, PASTA_DE_SKILLS, '.claude/hooks/'],
  arquivos: {
    [`${PASTA_DE_AGENTES}corretor.md`]: 'h',
    [`${PASTA_DE_SKILLS}spec-report/SKILL.md`]: 'h',
    [`${PASTA_DE_SKILLS}spec-report/lib/a.mjs`]: 'h',
    '.claude/hooks/kit.mjs': 'h',
  },
};

test('ehExtensaoDoProjeto: agente novo e skill nova são do projeto; o que está no manifesto não', () => {
  for (const rel of [`${PASTA_DE_AGENTES}meu-agente.md`, `${PASTA_DE_SKILLS}minha-skill/SKILL.md`,
    `${PASTA_DE_SKILLS}minha-skill`, `./${PASTA_DE_SKILLS}Minha-Skill/x/y.md`]) {
    assert.equal(ehExtensaoDoProjeto(rel, MANIFESTO_FAKE), true, rel);
  }
  for (const rel of [`${PASTA_DE_AGENTES}corretor.md`, `${PASTA_DE_AGENTES}CORRETOR.md`,
    `${PASTA_DE_SKILLS}spec-report/SKILL.md`, `${PASTA_DE_SKILLS}spec-report/novo.md`,
    `${PASTA_DE_SKILLS}SPEC-REPORT/novo.md`, PASTA_DE_AGENTES, PASTA_DE_SKILLS, '.claude/hooks/novo.mjs',
    'CLAUDE.md', `${PASTA_DE_AGENTES}*`, `${PASTA_DE_SKILLS}minha-*/SKILL.md`,
    `${PASTA_DE_SKILLS}x/../spec-report/SKILL.md`]) {
    assert.equal(ehExtensaoDoProjeto(rel, MANIFESTO_FAKE), false, rel);
  }
  // sem manifesto (clone antigo) não há extensão: o comportamento de antes, que nega
  assert.equal(ehExtensaoDoProjeto(`${PASTA_DE_AGENTES}meu.md`, null), false);
  // a pasta de agentes fora da zona do manifesto (o Kiro tira `.kiro/agents/` dela) não vira livre
  const semAgentes = { zona: [PASTA_DE_SKILLS], arquivos: {} };
  assert.equal(ehExtensaoDoProjeto(`${PASTA_DE_AGENTES}harness-elo.json`, semAgentes), false);
});

test('avaliarZona: no clone, extensão do projeto passa e arquivo do manifesto continua negado', () => {
  const opts = { manifesto: () => MANIFESTO_FAKE };
  assert.equal(avaliarZona(`${PASTA_DE_AGENTES}meu-agente.md`, opts), null);
  assert.equal(avaliarZona(`${PASTA_DE_SKILLS}minha-skill/SKILL.md`, opts), null);
  assert.equal(avaliarZona(`${PASTA_DE_AGENTES}corretor.md`, opts).acao, 'deny');
  assert.equal(avaliarZona(`${PASTA_DE_SKILLS}spec-report/SKILL.md`, opts).acao, 'deny');
  assert.equal(avaliarZona(`${PASTA_DE_AGENTES}meu-agente.md`).acao, 'deny', 'sem manifesto, nega como antes');
  let perguntas = 0;
  avaliarZona('outputs/x.md', { manifesto: () => { perguntas += 1; return MANIFESTO_FAKE; } });
  assert.equal(perguntas, 0, 'fora da zona o manifesto não é lido');
});
