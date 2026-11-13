import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARTEFATO_TERMINAL, SKILLS_QUE_REGISTRAM, SKILLS_DO_KIT, SKILLS_NOSSAS,
  localizarArtefato, registrouDepois, montarLembrete, avaliar,
} from './sync-log.mjs';
// Namespaces só para provar que o conjunto de ausência NÃO é reexportado por nenhum dos dois
// consumidores — o teste `o conjunto de ausência NÃO está escrito duas vezes` é quem os usa.
import * as syncLogMod from './sync-log.mjs';
import * as gramaticaMod from './gramatica.mjs';
import {
  CABECALHO_SECAO_A, montarLinhaSecaoA, lerLinhasSecaoA, lerKickoff, RAIZ_SPEC,
} from './kit.mjs';
import { PRE_REQUISITOS } from './cadeia.mjs';

const RAIZ = '/proj';

/** Momento local, em ms. A coluna `Data/Hora` tem granularidade de MINUTO; o `mtime`, de ms. */
const ms = (h, min, seg = 0) => new Date(2026, 7, 25, h, min, seg).getTime();

const linha = (skill, hora, numero = 1) => montarLinhaSecaoA({
  numero, data: '2026-08-25', hora, skill, modo: '', inputs: '', outputs: '',
  decisoes: '', decisor: 'consultor', proximo: '',
});

const syncLog = (...linhas) => ['# Log de sincronização', '', '## Seção A', '', CABECALHO_SECAO_A, ...linhas, ''].join('\n');

/** `io` de mentira: nada toca o disco, e cada chamada fica registrada para ser contada. */
function ioFalso({ arquivos = {}, mtime = ms(14, 32, 40), erroLer = null, erroStat = null } = {}) {
  const chamadas = [];
  return {
    chamadas,
    cwd: () => RAIZ,
    relativizar: (r, bruto) => {
      const b = String(bruto || '').replace(/\\/g, '/');
      const rr = String(r || '').replace(/\\/g, '/').replace(/\/+$/, '');
      return b.startsWith(rr + '/') ? b.slice(rr.length + 1) : null;
    },
    lerArquivo: (abs) => {
      chamadas.push(['ler', abs]);
      if (erroLer) throw erroLer;
      const rel = String(abs).replace(RAIZ + '/', '');
      if (!(rel in arquivos)) { const e = new Error('ENOENT: no such file'); e.code = 'ENOENT'; throw e; }
      return arquivos[rel];
    },
    statear: (abs) => {
      chamadas.push(['stat', abs]);
      if (erroStat) throw erroStat;
      return { mtimeMs: mtime };
    },
  };
}

const escrever = (rel) => ({ tool_name: 'Write', tool_input: { file_path: `${RAIZ}/${rel}` } });

// ————————————————————————— a tabela —————————————————————————

test('SKILLS_QUE_REGISTRAM são as 7 do kit MAIS as 8 nossas, e as duas metades ficam separadas', () => {
  // O kit obriga sete, nominalmente (`spec/SKILL.md:334`, «Sync-log como memória cross-cutting»).
  // A cadeia técnica não está nessa lista — o kit não a nomeia —, e é a rule do Plan deste
  // harness que estende a obrigação a ela. Daqui a seis meses ninguém lembra qual metade é kit e
  // qual é política nossa.
  assert.deepEqual([...SKILLS_DO_KIT].sort(), [
    'spec-benchmark', 'spec-ingest', 'spec-iterate', 'spec-legacy',
    'spec-product', 'spec-prototype', 'spec-report',
  ]);
  assert.deepEqual([...SKILLS_NOSSAS].sort(), [
    'spec-api-contracts', 'spec-data-model', 'spec-implement', 'spec-scaffold',
    'spec-security-review', 'spec-tasks', 'spec-tech-rules', 'spec-test-plan',
  ]);
  assert.equal(SKILLS_DO_KIT.size, 7);
  assert.equal(SKILLS_NOSSAS.size, 8);
  assert.equal(SKILLS_QUE_REGISTRAM.size, 15);
  for (const s of [...SKILLS_DO_KIT, ...SKILLS_NOSSAS]) assert.ok(SKILLS_QUE_REGISTRAM.has(s), s);
  // As duas metades não se sobrepõem: uma skill em ambas seria a tabela mentindo sobre a fonte.
  for (const s of SKILLS_DO_KIT) assert.ok(!SKILLS_NOSSAS.has(s), s);
});

test('ARTEFATO_TERMINAL só aponta para skills que registram, e nenhum caminho repete a raiz', () => {
  assert.ok(ARTEFATO_TERMINAL.size > 0);
  for (const [caminho, skill] of ARTEFATO_TERMINAL) {
    assert.ok(SKILLS_QUE_REGISTRAM.has(skill), `${caminho} → ${skill} fora de SKILLS_QUE_REGISTRAM`);
    assert.ok(!caminho.startsWith(RAIZ_SPEC), `${caminho} repete a raiz`);
    // A raiz descontinuada continua proibida como PREFIXO, agora por literal: uma entrada escrita
    // com o prefixo antigo não casaria nunca, e sem esta linha o defeito seria silencioso.
    assert.ok(!caminho.startsWith('task-generator/'), `${caminho} repete a raiz descontinuada`);
    assert.equal(caminho, caminho.toLowerCase(), `${caminho} tem que estar em caixa de comparação`);
  }
});

test('ARTEFATO_TERMINAL traz os obrigatórios do kit e NÃO traz os opcionais', () => {
  // Os quatro obrigatórios da `spec-product` são os do `check-outputs.py:ARTIFACTS`.
  for (const c of ['product-vision/product-vision.md', 'business-rules.md',
    'requirements/requirements.md', 'product-requirements/product-requirements.md']) {
    assert.equal(ARTEFATO_TERMINAL.get(c), 'spec-product', c);
  }
  assert.equal(ARTEFATO_TERMINAL.get('context-map.md'), 'spec-ingest');
  assert.equal(ARTEFATO_TERMINAL.get('benchmark.md'), 'spec-benchmark');
  assert.equal(ARTEFATO_TERMINAL.get('gaps.md'), 'spec-iterate');
  assert.equal(ARTEFATO_TERMINAL.get('tasks.json'), 'spec-tasks');
  // `modules.md` é OPTIONAL no kit — opcional não marca conclusão de nada, mesmo a nossa
  // `PRE_REQUISITOS` exigindo-o para a `spec-prototype`: são perguntas diferentes.
  assert.equal(ARTEFATO_TERMINAL.has('modules.md'), false);
  // `sync-log.md` é REQUIRED da `spec-iterate` no kit e mesmo assim fica fora: é o próprio log.
  assert.equal(ARTEFATO_TERMINAL.has('sync-log.md'), false);
  // A cadeia técnica vem da nossa `PRE_REQUISITOS`: o que a seguinte exige, a anterior produziu.
  assert.equal(ARTEFATO_TERMINAL.get('tech-rules/tech-rules-summary.md'), 'spec-tech-rules');
  assert.equal(ARTEFATO_TERMINAL.get('data-model.json'), 'spec-data-model');
  assert.equal(ARTEFATO_TERMINAL.get('api-contracts.yaml'), 'spec-api-contracts');
  assert.equal(ARTEFATO_TERMINAL.get('test-plan.md'), 'spec-test-plan');
});

test('o hld.md NAO ganha ancora terminal — mais uma ausencia decidida (Decisao 34)', () => {
  // O mapa responde "que artefato marca o FIM desta skill?", e artefato OPTIONAL aparecendo no
  // disco não significa que a skill terminou — é âncora ruim. `OPTIONAL` no kit é justamente o
  // que DESQUALIFICA, o mesmo motivo que já tira o `modules.md` deste mapa (linha acima).
  //
  // Diferente do `capa.md` do comentário da tabela — que nunca aparece em nenhuma exigência e por
  // isso nem chega a precisar de razão escrita —, o `hld.md` É produzido por uma skill nomeada,
  // registrada (`spec-hld`), que está na cadeia técnica. Fica no mesmo grupo do
  // `spec-security-review`: artefato único e nomeado, `OPTIONAL` no kit, e a nossa `PRE_REQUISITOS`
  // não exige nada que ele produza (ver teste em `cadeia.test.mjs`) — então não há fonte para uma
  // âncora aqui. A `spec-hld` registra no `sync-log.md` por obrigação da própria rule do Plan e do
  // seu `SKILL.md` — não por lembrete deste módulo, que por isso não a lista em
  // `SKILLS_QUE_REGISTRAM`.
  assert.equal(ARTEFATO_TERMINAL.has('hld.md'), false);
  assert.equal(PRE_REQUISITOS.get('spec-data-model').exige.includes('hld.md'), false);
});

test('o data-model.md NAO e ancora terminal — a spec-data-model ja tem uma (Plano 4, Tarefa 11)', () => {
  // O mapa responde "que artefato marca o fim desta skill?", e a resposta para a `spec-data-model`
  // já é `data-model.json` — está no mapa desde a vendorização (linha acima, "a nossa
  // PRE_REQUISITOS"). Acrescentar o markdown daria à MESMA skill duas âncoras, e o lembrete
  // dispararia DUAS VEZES na mesma execução: uma ao escrever o JSON no passo K, outra ao escrever
  // o markdown no passo O da `spec-data-model` (Tarefa 10). Ruído caindo exatamente sobre quem está
  // obedecendo — a mesma razão pela qual o `sync-log.md` também fica fora (JSDoc da tabela acima).
  //
  // NÃO é a mesma assimetria do `hld.md` do teste acima, e a diferença importa: lá a `spec-hld` não
  // tinha âncora nenhuma e ganhou a única que produz. Aqui a skill JÁ TEM âncora, e o markdown é
  // DERIVADO do artefato que já é ela — seria uma segunda âncora para a mesma fonte, não uma âncora
  // nova para uma skill que não tinha nenhuma.
  assert.equal(ARTEFATO_TERMINAL.get('data-model.json'), 'spec-data-model');
  assert.equal(ARTEFATO_TERMINAL.get('data-model.md'), undefined);
});

// —————————— a PROCEDÊNCIA da tabela, cruzada com as duas fontes ——————————
//
// MEDIDO na revisão adversarial: `discovery-document.md` podia ser APAGADA da `ARTEFATO_TERMINAL`
// com a suíte inteira verde, e acrescentar `capa.md → spec-report` também passava. O JSDoc da tabela
// DECLARA de onde vem cada linha; até aqui isso era promessa, não medição. Um teste por entrada
// seriam treze, e treze testes envelhecem em bloco — este PERCORRE a tabela e a cruza com as duas
// fontes, de modo que entrada nova, entrada apagada ou entrada apontando para a skill errada quebra
// sozinha.

/**
 * FONTE 1 — os `REQUIRED` do kit, nominalmente: `check-outputs.py:ARTIFACTS` (linha 97) e
 * `PIPELINE_ARTIFACTS` (linha 149). Fixture de ORÁCULO, não segunda cópia de regra nossa: o kit é
 * externo a este repositório, e a única forma de o cruzamento existir é pinar aqui o que ele diz.
 * Conferido por leitura do arquivo do kit nesta rodada, `REQUIRED` a `REQUIRED`.
 */
const KIT_REQUIRED = new Map([
  ['context-map.md', 'spec-ingest'],
  ['discovery-document.md', 'spec-ingest'],
  ['benchmark.md', 'spec-benchmark'],
  ['product-vision/product-vision.md', 'spec-product'],
  ['business-rules.md', 'spec-product'],
  ['requirements/requirements.md', 'spec-product'],
  ['product-requirements/product-requirements.md', 'spec-product'],
  ['gaps.md', 'spec-iterate'],
  ['sync-log.md', 'spec-iterate'],
  ['tasks.json', 'spec-tasks'], // PIPELINE_ARTIFACTS
]);

/** O que o kit exige e a tabela NÃO traz, com a razão. Ausência sem razão escrita é esquecimento. */
const FORA_POR_DECISAO = new Map([
  ['sync-log.md', 'é o próprio log: usá-lo como âncora faria o verificador falar sobre si mesmo'],
]);

/** O que a nossa `PRE_REQUISITOS` exige e a tabela NÃO traz, com a razão. */
const EXIGIDO_SEM_ANCORA = new Map([
  ['modules.md', 'OPTIONAL no kit — opcional não marca conclusão de nada'],
  ['plano-de-seguranca.md', 'produzido pela `revisao-de-seguranca`, que não é uma `spec-*`'],
]);

test('ARTEFATO_TERMINAL: a tabela inteira cruzada com o kit e com a nossa PRE_REQUISITOS', () => {
  const exigidos = new Set();
  for (const { exige } of PRE_REQUISITOS.values()) for (const a of exige || []) exigidos.add(a);

  // 1. NADA INVENTADO: cada entrada é justificada por uma das duas fontes. É o que faz
  //    `capa.md → spec-report` — OPTIONAL no kit e exigido por ninguém — dar vermelho.
  for (const [caminho, skill] of ARTEFATO_TERMINAL) {
    const doKit = KIT_REQUIRED.has(caminho);
    assert.ok(
      doKit || exigidos.has(caminho),
      `\`${caminho}\` não é REQUIRED do kit nem aparece em nenhum \`exige\` da PRE_REQUISITOS`,
    );
    if (doKit) assert.equal(skill, KIT_REQUIRED.get(caminho), `\`${caminho}\` aponta para a skill errada`);
  }

  // 2. NADA FALTANDO DO KIT: todo `REQUIRED` está na tabela, ou tem ausência DECIDIDA e escrita.
  //    É o que faz apagar `discovery-document.md` dar vermelho.
  for (const [caminho] of KIT_REQUIRED) {
    if (FORA_POR_DECISAO.has(caminho)) {
      assert.equal(ARTEFATO_TERMINAL.has(caminho), false, `\`${caminho}\` está declarado FORA e entrou`);
      continue;
    }
    assert.ok(ARTEFATO_TERMINAL.has(caminho), `\`${caminho}\` é REQUIRED do kit e não está na tabela`);
  }

  // 3. NADA FALTANDO DO NOSSO LADO: todo artefato que uma `spec-*` exige tem âncora, ou tem ausência
  //    escrita. Acrescentar um `exige` novo sem decidir sobre a tabela passa a dar vermelho.
  for (const caminho of exigidos) {
    if (KIT_REQUIRED.has(caminho) || EXIGIDO_SEM_ANCORA.has(caminho)) continue;
    assert.ok(ARTEFATO_TERMINAL.has(caminho), `\`${caminho}\` é exigido e não tem âncora nem razão escrita`);
  }

  // 4. NINGUÉM PRODUZ O QUE CONSOME: se a skill apontada exige o próprio artefato, a procedência
  //    está invertida. É o que pega `test-plan.md → spec-tasks` em vez de `→ spec-test-plan`.
  for (const [caminho, skill] of ARTEFATO_TERMINAL) {
    const pre = PRE_REQUISITOS.get(skill);
    if (!pre) continue;
    assert.ok(!(pre.exige || []).includes(caminho), `\`${skill}\` CONSOME \`${caminho}\`; não pode produzi-lo`);
  }

  // 5. E o tamanho fecha, para entrada acrescentada em silêncio não passar por descuido dos quatro
  //    laços acima: dez REQUIRED do kit menos a ausência decidida, mais as quatro da cadeia técnica.
  assert.equal(ARTEFATO_TERMINAL.size, KIT_REQUIRED.size - FORA_POR_DECISAO.size + 4);
});

// ————————————————————————— a âncora de artefato —————————————————————————

test('localizarArtefato acha a skill, e o sync-log ao lado do artefato', () => {
  const r = localizarArtefato(`${RAIZ_SPEC}/business-rules.md`);
  assert.equal(r.skill, 'spec-product');
  assert.equal(r.syncLog, `${RAIZ_SPEC}/sync-log.md`);
  // Multi-repo: o artefato mora em `<repo-docs>/outputs/spec/`, e o sync-log mora ao lado dele.
  const multi = localizarArtefato(`repo-docs/${RAIZ_SPEC}/business-rules.md`);
  assert.equal(multi.skill, 'spec-product');
  assert.equal(multi.syncLog, `repo-docs/${RAIZ_SPEC}/sync-log.md`);
});

test('localizarArtefato não reconhece mais o layout descontinuado', () => {
  // PONTA 1: `task-generator/outputs/` saiu com a vendorização do kit.
  assert.equal(localizarArtefato('task-generator/outputs/tasks.json'), null);
  // A OUTRA PONTA, no mesmo teste, porque é o par que dá sentido à primeira asserção: sem ela,
  // `localizarArtefato` devolvendo `null` para tudo — o verificador cego — também passaria.
  const ok = localizarArtefato(`${RAIZ_SPEC}/tasks.json`);
  assert.equal(ok && ok.skill, 'spec-tasks');
  assert.equal(ok && ok.syncLog, `${RAIZ_SPEC}/sync-log.md`);
});

test('localizarArtefato ignora caixa — no FS deste harness é o MESMO arquivo', () => {
  const r = localizarArtefato('outputs/Spec/Business-Rules.md');
  assert.equal(r.skill, 'spec-product');
});

test('localizarArtefato casa o caminho INTEIRO dentro da raiz, não só o nome do arquivo', () => {
  // MEDIDO: trocar o recorte por "o último segmento do caminho" sobrevivia à suíte inteira. Quatro
  // das treze entradas são caminhos ANINHADOS, e nenhuma delas era exercitada aqui — a tabela era
  // conferida por `get`, que não passa pelo recorte.
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/product-vision/product-vision.md`).skill, 'spec-product');
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/requirements/requirements.md`).skill, 'spec-product');
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/product-requirements/product-requirements.md`).skill, 'spec-product');
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/tech-rules/tech-rules-summary.md`).skill, 'spec-tech-rules');
  // E a outra ponta: o mesmo NOME noutra pasta não é artefato terminal de ninguém. Casar só o
  // basename transformaria um rascunho num marco de conclusão.
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/rascunhos/business-rules.md`), null);
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/product-vision.md`), null);
});

test('localizarArtefato cala fora da tabela', () => {
  assert.equal(localizarArtefato(`${RAIZ_SPEC}/modules.md`), null);
  assert.equal(localizarArtefato('CLAUDE.md'), null);
  assert.equal(localizarArtefato('outputs/explore/gaps.md'), null, 'o `gaps.md` do Explore não é da spec-iterate');
});

// ————————————————————————— a regra de recência —————————————————————————

test('recência: compara no MINUTO, não no milissegundo', () => {
  // Linha às 14:32 e artefato às 14:32:40 são a MESMA execução. Sem truncar, quem registrou
  // direito seria avisado — falso positivo em cima de trabalho correto.
  assert.equal(registrouDepois([{ skill: 'spec-product', minuto: ms(14, 32) }], 'spec-product', ms(14, 32, 40)), true);
  // E a ponta oposta: um minuto ANTES não é esta execução.
  assert.equal(registrouDepois([{ skill: 'spec-product', minuto: ms(14, 31) }], 'spec-product', ms(14, 32, 40)), false);
});

test('recência, e não "já apareceu alguma vez" — a refatoração volta a avisar', () => {
  const antiga = [{ skill: 'spec-product', minuto: ms(14, 32) }];
  // Reexecutar dá `mtime` novo ao artefato, e a linha antiga fica para trás. É o caso que a
  // âncora de artefato existe para pegar.
  assert.equal(registrouDepois(antiga, 'spec-product', ms(15, 10)), false);
  assert.equal(registrouDepois([...antiga, { skill: 'spec-product', minuto: ms(15, 10) }], 'spec-product', ms(15, 10, 5)), true);
});

test('recência: a linha de OUTRA skill não conta, e a caixa do nome não separa', () => {
  const linhas = [{ skill: 'spec-ingest', minuto: ms(16, 0) }];
  assert.equal(registrouDepois(linhas, 'spec-product', ms(14, 32)), false);
  assert.equal(registrouDepois([{ skill: 'Spec-Product', minuto: ms(16, 0) }], 'spec-product', ms(14, 32)), true);
});

test('recência: o prefixo de plugin na coluna `Skill` é TOLERÂNCIA DELIBERADA, nas duas pontas', () => {
  // A ESCOLHA, declarada para ninguém a relitigar: o corte de prefixo fica NOS DOIS LADOS, com
  // teste, em vez de ser removido do lado inalcançável. Ver o JSDoc de `registrouDepois`.
  //
  // LADO DA COLUNA — alcançável hoje, e por isso medido ponta a ponta em `avaliar` logo abaixo: a
  // Seção A é escrita À MÃO, e quem invocou a skill a viu no payload como `plugin:skill`. Anotar
  // `algum-plugin:spec-product` na coluna é registro CORRETO, e avisar em cima dele é falso positivo.
  assert.equal(
    registrouDepois([{ skill: 'algum-plugin:spec-product', minuto: ms(16, 0) }], 'spec-product', ms(14, 32)),
    true,
  );

  // LADO DO ARGUMENTO — entrada HIPOTÉTICA hoje: o único produtor é a `ARTEFATO_TERMINAL`, que só
  // tem nome nu. Fica porque `registrouDepois` é exportada e o contrato dela é "compare nomes de
  // skill": um chamador futuro com âncora de ATOR passaria o nome do payload, que chega PREFIXADO —
  // é exatamente assim que a âncora de skill do `fecho-explore` nasceu decorativa.
  assert.equal(
    registrouDepois([{ skill: 'spec-product', minuto: ms(16, 0) }], 'algum-plugin:spec-product', ms(14, 32)),
    true,
  );

  // A PONTA QUE IMPEDE A TOLERÂNCIA DE VIRAR BURACO: prefixo não faz uma skill valer por outra. Sem
  // esta asserção, `nomeDaSkill` devolvendo `''` — tudo igual a tudo — passaria nas duas de cima e
  // o verificador calaria para sempre.
  assert.equal(
    registrouDepois([{ skill: 'algum-plugin:spec-ingest', minuto: ms(16, 0) }], 'spec-product', ms(14, 32)),
    false,
  );
  assert.equal(
    registrouDepois([{ skill: 'spec-product:extra', minuto: ms(16, 0) }], 'spec-product', ms(14, 32)),
    false,
    'o corte é no ÚLTIMO `:`; `spec-product:extra` nomeia `extra`, não `spec-product`',
  );
});

test('avaliar CALA para a linha anotada com prefixo de plugin — a tolerância vale ponta a ponta', () => {
  const io = ioFalso({
    arquivos: { [`${RAIZ_SPEC}/sync-log.md`]: syncLog(linha('algum-plugin:spec-product', '14:32')) },
    mtime: ms(14, 32, 40),
  });
  assert.equal(avaliar(escrever(`${RAIZ_SPEC}/business-rules.md`), io), null);

  // E a outra ponta pelo mesmo caminho: prefixo de OUTRA skill não cala nada.
  const outra = ioFalso({
    arquivos: { [`${RAIZ_SPEC}/sync-log.md`]: syncLog(linha('algum-plugin:spec-ingest', '14:32')) },
    mtime: ms(14, 32, 40),
  });
  const r = avaliar(escrever(`${RAIZ_SPEC}/business-rules.md`), outra);
  assert.ok(r, 'a linha de outra skill não satisfaz esta');
  assert.match(r.aviso, /spec-product/);
});

// ————————————————————————— a mensagem —————————————————————————

test('a mensagem é LEMBRETE, não acusação — no instante da escrita a linha ainda não podia existir', () => {
  const m = montarLembrete('spec-product', `${RAIZ_SPEC}/business-rules.md`, `${RAIZ_SPEC}/sync-log.md`);
  assert.match(m, /business-rules\.md/);
  assert.match(m, /spec-product/);
  assert.match(m, /registre/i);
  assert.ok(!/n[ãa]o registrou/i.test(m), m);
  assert.ok(!/rodou e n[ãa]o/i.test(m), m);
  // A última frase diz POR QUE ninguém preenche por você.
  assert.match(m, /decidiu/i);
});

test('a mensagem é INERTE: colada sem preencher, não registra ninguém nem declara kickoff', () => {
  // O esqueleto vai dentro de cerca de código e com `YYYY-MM-DD HH:MM` nos campos de data —
  // regras 4 e 3 do kit. Sem isso, colar a mensagem desligaria o próprio verificador.
  const m = montarLembrete('spec-product', `${RAIZ_SPEC}/business-rules.md`, `${RAIZ_SPEC}/sync-log.md`);
  assert.deepEqual(lerLinhasSecaoA(m), []);
  assert.equal(lerKickoff(m).presente, false);
  // E a ponta oposta: o esqueleto é uma linha de NOVE colunas de verdade, não um texto qualquer.
  assert.match(m, /\| Data\/Hora \| Skill \| Modo \/ contexto \|/);
});

test('a inércia da mensagem é DUAS camadas, e cada uma bastaria sozinha', () => {
  // MEDIDO: o teste acima sozinho declarava sobreviventes duas mutações — tirar a cerca de código
  // e trocar o placeholder de data por uma data real. Cada defesa cobria a outra, e por isso
  // remover QUALQUER UMA das duas não produzia vermelho nenhum. Um teste que só afirma o
  // resultado não mede as camadas que o produzem.
  const m = montarLembrete('spec-product', `${RAIZ_SPEC}/business-rules.md`, `${RAIZ_SPEC}/sync-log.md`);

  // Camada 4 (cerca) sozinha: com número e data preenchidos, a cerca ainda tem que segurar.
  const preenchida = m.replace('| N |', '| 1 |').replace('YYYY-MM-DD HH:MM', '2026-08-25 14:32');
  assert.deepEqual(lerLinhasSecaoA(preenchida), [], 'a cerca de código sozinha tem que bastar');

  // Camada 3 (placeholder de data) sozinha: sem cerca nenhuma, o `YYYY-MM-DD HH:MM` tem que segurar.
  const semCerca = m.split('\n').filter((l) => l.trim() !== '```').join('\n').replace('| N |', '| 1 |');
  assert.deepEqual(lerLinhasSecaoA(semCerca), [], 'o placeholder de data sozinho tem que bastar');

  // E as duas estão lá, nominalmente — comportamento defendido duas vezes esconde a remoção de uma.
  assert.match(m, /^```$/m, 'o esqueleto tem que ir dentro de cerca de código');
  assert.match(m, /\| YYYY-MM-DD HH:MM \|/, 'a coluna de data tem que trazer o placeholder do kit');
});

// ————————————————————————— `avaliar(payload, io)` —————————————————————————

test('avaliar cala quando a tool não escreve, e quando o arquivo não é artefato terminal', () => {
  assert.equal(avaliar({ tool_name: 'Bash', tool_input: { command: 'ls' } }, ioFalso()), null);
  const io = ioFalso();
  assert.equal(avaliar(escrever(`${RAIZ_SPEC}/modules.md`), io), null);
  assert.deepEqual(io.chamadas, [], 'fora da tabela não pode haver I/O nenhum');
});

test('avaliar AVISA quando o sync-log não tem linha desta skill', () => {
  const io = ioFalso({ arquivos: { [`${RAIZ_SPEC}/sync-log.md`]: syncLog(linha('spec-ingest', '14:00')) } });
  const r = avaliar(escrever(`${RAIZ_SPEC}/business-rules.md`), io);
  assert.ok(r, 'tinha que avisar');
  assert.match(r.aviso, /spec-product/);
  assert.match(r.aviso, /business-rules\.md/);
});

test('avaliar CALA quando a linha da skill é do mesmo minuto do artefato', () => {
  // A outra ponta do teste acima. Sem ela, `avaliar` devolvendo sempre `{aviso}` passaria.
  const io = ioFalso({
    arquivos: { [`${RAIZ_SPEC}/sync-log.md`]: syncLog(linha('spec-product', '14:32')) },
    mtime: ms(14, 32, 40),
  });
  assert.equal(avaliar(escrever(`${RAIZ_SPEC}/business-rules.md`), io), null);
});

test('avaliar volta a avisar na REEXECUÇÃO: mtime novo, linha antiga', () => {
  const arquivos = { [`${RAIZ_SPEC}/sync-log.md`]: syncLog(linha('spec-product', '14:32')) };
  assert.equal(avaliar(escrever(`${RAIZ_SPEC}/business-rules.md`), ioFalso({ arquivos, mtime: ms(14, 32, 40) })), null);
  const r = avaliar(escrever(`${RAIZ_SPEC}/business-rules.md`), ioFalso({ arquivos, mtime: ms(15, 10) }));
  assert.ok(r, 'a reexecução tem que voltar a avisar');
});

test('avaliar ignora a linha de EXEMPLO do template — ela registra `spec-ingest` sem ninguém ter rodado', () => {
  const exemplo = '| 1 | YYYY-MM-DD HH:MM | spec-ingest | kickoff: sem legado | inputs/a.txt | context-map.md | — | consultor | spec-legacy |';
  const io = ioFalso({
    arquivos: { [`${RAIZ_SPEC}/sync-log.md`]: syncLog(exemplo) },
    mtime: ms(14, 32),
  });
  const r = avaliar(escrever(`${RAIZ_SPEC}/context-map.md`), io);
  assert.ok(r, 'o exemplo do template não pode calar o verificador');
  assert.match(r.aviso, /spec-ingest/);
});

test('avaliar avisa quando o sync-log NÃO EXISTE — ausência é o caso mais comum de omissão', () => {
  const r = avaliar(escrever(`${RAIZ_SPEC}/benchmark.md`), ioFalso({ arquivos: {} }));
  assert.ok(r);
  assert.match(r.aviso, /spec-benchmark/);
});

test('avaliar RELANÇA erro que não é ausência — "não li" não pode virar "está tudo certo"', () => {
  const eacces = new Error('EACCES: permission denied');
  eacces.code = 'EACCES';
  assert.throws(
    () => avaliar(escrever(`${RAIZ_SPEC}/benchmark.md`), ioFalso({ erroLer: eacces })),
    /EACCES/,
  );
});

test('avaliar trata artefato SUMIDO entre a escrita e o hook como ausência, não como erro', () => {
  const enoent = new Error('ENOENT: no such file');
  enoent.code = 'ENOENT';
  assert.equal(avaliar(escrever(`${RAIZ_SPEC}/benchmark.md`), ioFalso({ erroStat: enoent })), null);
});

test('avaliar trata EISDIR como ausência nos DOIS caminhos de I/O — não só no `stat`', () => {
  // O `EISDIR` do lado do `gramatica.mjs` tinha teste próprio; o daqui, nenhum. Medido: removê-lo
  // da cópia deste módulo sobrevivia às 891 asserções da suíte. Um diretório chamado `benchmark.md`
  // não é um artefato mal escrito — é a inexistência do artefato sob outra forma, e é o ramo que a
  // rodada J decidiu. Relançar aqui faria o despachante registrar falha de verificador informativo
  // por causa de um caminho que simplesmente não existe como arquivo.
  const eisdir = () => { const e = new Error('EISDIR: illegal operation on a directory'); e.code = 'EISDIR'; return e; };
  // 1 — o `stat` do ARTEFATO. Sem `mtime` não há pergunta de recência a fazer.
  assert.equal(avaliar(escrever(`${RAIZ_SPEC}/benchmark.md`), ioFalso({ erroStat: eisdir() })), null);
  // 2 — a LEITURA do sync-log, que é o outro caminho e usa o mesmo corte: sync-log inexistente é o
  // caso mais comum de omissão, e é exatamente quando o lembrete mais vale. Calar aqui seria calar
  // no melhor momento de falar.
  const r = avaliar(escrever(`${RAIZ_SPEC}/benchmark.md`), ioFalso({ erroLer: eisdir() }));
  assert.ok(r, 'sync-log que é diretório é sync-log ausente, e ausente rende aviso');
  assert.match(r.aviso, /spec-benchmark/);
});

test('o conjunto de ausência NÃO está escrito duas vezes — a fonte é o kit, e só ele', () => {
  // Este módulo guardava a segunda cópia literal, com o comentário apontando o gêmeo do
  // `gramatica.mjs`. As duas metades desta asserção: nenhum dos dois declara o conjunto de novo, e
  // os dois buscam o do kit. Sem a segunda metade, apagar o import e passar a aceitar qualquer erro
  // passaria batido; sem a primeira, uma cópia nova ao lado do import passaria.
  for (const mod of ['gramatica.mjs', 'sync-log.mjs']) {
    const fonte = readFileSync(new URL('./' + mod, import.meta.url), 'utf8');
    assert.ok(
      !/new Set\(\[[^\]\n]{0,120}EISDIR/.test(fonte),
      `${mod} não pode declarar o conjunto de ausência outra vez`,
    );
    assert.ok(
      fonte.includes('CODIGOS_DE_AUSENCIA_DE_DOCUMENTO'),
      `${mod} tem que usar o conjunto do kit`,
    );
  }
  // E SEM REEXPORTAÇÃO POR COMPATIBILIDADE — a regra que valeu quando a raiz do pipeline mudou de
  // casa: dois caminhos de import para a mesma constante são a divergência que se acabou de fechar.
  for (const [nome, mod] of [['gramatica.mjs', gramaticaMod], ['sync-log.mjs', syncLogMod]]) {
    assert.equal(mod.AUSENCIA, undefined, `${nome} não pode exportar AUSENCIA`);
    assert.equal(mod.CODIGOS_DE_AUSENCIA_DE_DOCUMENTO, undefined, `${nome} não pode reexportar o do kit`);
  }
});

test('avaliar usa o `io` injetado — não chama process.cwd() nem lê o disco por conta própria', () => {
  // Sem ponto de injeção, testar o wiring exigiria `process.chdir`, ninguém testa, e mutar a
  // entrada da tabela para no-op deixa a suíte inteira verde. As Tasks 5 e 6 já pagaram isso.
  const io = ioFalso({ arquivos: { [`${RAIZ_SPEC}/sync-log.md`]: syncLog() } });
  avaliar(escrever(`${RAIZ_SPEC}/benchmark.md`), io);
  assert.deepEqual(io.chamadas.map((c) => c[0]), ['stat', 'ler']);
  assert.equal(io.chamadas[0][1], `${RAIZ}/${RAIZ_SPEC}/benchmark.md`);
  assert.equal(io.chamadas[1][1], `${RAIZ}/${RAIZ_SPEC}/sync-log.md`);
});

test('avaliar lê o sync-log DO REPO DE DOCS em workspace multi-repo', () => {
  const io = ioFalso({ arquivos: { [`docs/${RAIZ_SPEC}/sync-log.md`]: syncLog(linha('spec-product', '14:32')) }, mtime: ms(14, 32, 10) });
  assert.equal(avaliar(escrever(`docs/${RAIZ_SPEC}/business-rules.md`), io), null);
  assert.equal(io.chamadas[1][1], `${RAIZ}/docs/${RAIZ_SPEC}/sync-log.md`);
});

test('o lembrete diz DE ONDE vem a obrigação — do kit, ou política nossa', () => {
  // `SKILLS_DO_KIT` e `SKILLS_NOSSAS` eram duas listas que só o teste lia: constante exportada sem
  // consumidor é decoração, e mudar uma delas sairia de graça. Agora a distinção chega a quem lê o
  // aviso, que é quem precisa dela — "o kit exige" e "nós decidimos exigir" pesam diferente.
  const doKit = montarLembrete('spec-product', 'outputs/spec/business-rules.md', 'outputs/spec/sync-log.md');
  assert.match(doKit, /kit obriga/i);
  assert.ok(!/política deste harness/i.test(doKit), doKit);

  const nossa = montarLembrete('spec-tasks', 'outputs/spec/tasks.json', 'outputs/spec/sync-log.md');
  assert.match(nossa, /política deste harness/i);
  assert.ok(!/kit obriga/i.test(nossa), nossa);
});

// ————————————— a REGRA que este verificador cobra tem que existir escrita —————————————
//
// Mesmo princípio do `o contrato de cabeçalho está ESCRITO na rule`, do `gramatica.test.mjs`: um
// contrato cuja única definição é o código de um verificador não tem dono — ninguém o decidiu, e
// afrouxá-lo ou endurecê-lo sai de graça. Até a Task 7 a `plan.md` tinha 130 linhas e NÃO citava
// `sync-log` uma única vez: o verificador cobrava uma obrigação que nenhuma regra escreveu.

import { readFileSync as lerRule } from 'node:fs';
import { join as juntar, dirname as pastaDe } from 'node:path';
import { fileURLToPath as urlPara } from 'node:url';

const RULE_PLAN = juntar(pastaDe(urlPara(import.meta.url)), '..', 'rules', 'harness', 'plan.md');

test('a rule do Plan manda a cadeia técnica registrar — as OITO, nominalmente', () => {
  const texto = lerRule(RULE_PLAN, 'utf8');
  assert.match(texto, /sync-log/);
  for (const s of SKILLS_NOSSAS) {
    // Substring LITERAL, e não `new RegExp(...)`: a asserção é "a rule cita este nome", que é
    // exatamente o que `includes` pergunta. Havia aqui um `s.replace(/-/g, '\-')` que PARECIA
    // escapar o nome para uso em regex e não escapava nada — em string JS `'\-'` é só `'-'`, e o
    // `replace` era no-op. Inofensivo por acidente (hífen não é especial fora de classe de
    // caractere), e os nomes destas oito skills não têm metacaractere nenhum; sem a regex no meio
    // não há mais nada para dar errado no dia em que um nome tiver.
    assert.ok(texto.includes(s), `a rule não cita \`${s}\``);
  }
});

test('a rule APONTA o template do kit em vez de repetir o formato — fonte escrita duas vezes diverge', () => {
  const texto = lerRule(RULE_PLAN, 'utf8');
  assert.match(texto, /spec-iterate\/templates\/sync-log\.md/, 'a rule tem que apontar o template');
  assert.match(texto, /Modo \/ contexto/, 'a coluna do `delta` e dos marcadores tem que ser nomeada');
  assert.match(texto, /delta/);
  // E a ponta que importa: o cabeçalho de nove colunas NÃO pode ser copiado para cá. Copiado, ele
  // vira a segunda cópia do formato — que é exatamente o defeito que esta tarefa consertou.
  const [cabecalho] = CABECALHO_SECAO_A.split('\n');
  assert.ok(!texto.includes(cabecalho), 'a rule copiou o cabeçalho em vez de apontar o template');
});
