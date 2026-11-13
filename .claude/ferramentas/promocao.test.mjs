import { test } from 'node:test';
import assert from 'node:assert/strict';

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  tabelasCom, lerFatos, lerConsumos, lerConsumosDeRegras, rastreavel, cruzar, formatarTexto,
  idsDoExplore, coletar, relatorioDe, IO_REAL,
  inserirCarimbo, congelar, formatarCongelamento, hojeISO,
} from './promocao.mjs';
import { montarCarimbo, lerCarimbo } from '../hooks/zonas.mjs';
import { MARCADOR_CONGELAMENTO, DOCS_EXPLORE } from '../hooks/kit.mjs';

const ESTE_DIR = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(ESTE_DIR, '..', '..');

// ————————————————————————— leitura de tabela markdown —————————————————————————

const CONTEXT_MAP = [
  '# Mapa de contexto — ingestão micro',
  '',
  '### Fonte: `especificacao-funcional.md`',
  '',
  '#### Fatos atômicos',
  '',
  '| ID | Fato | Âncora (linha § / minuto) | Domínio candidato | Conf. |',
  '|----|------|---------------------------|-------------------|-------|',
  '| F-001 | Cobrança recorrente | especificacao-funcional.md §3 MOD-PAG RF-007 | cobrança | alta |',
  '| F-002 | Estorno em 30 dias | especificacao-funcional.md §3 RF-008 | cobrança | alta |',
  '',
  '### Fonte: `CHAT-20260901-1`',
  '',
  '#### Fatos atômicos',
  '',
  '| ID | Fato | Âncora (linha § / minuto) | Domínio candidato | Conf. |',
  '|----|------|---------------------------|-------------------|-------|',
  '| F-003 | Prazo de 5 dias | CHAT-20260901-1 12:34 | operação | média |',
  '| F-004 | Multa de 2% | especificacao-funcional.md linha 214 | cobrança | alta |',
  '| F-005 | Sem fonte | | cobrança | baixa |',
].join('\n');

test('tabelasCom acha TODAS as tabelas com o cabeçalho, não só a primeira', () => {
  // O context-map tem uma tabela de fatos POR FONTE. Ler só a primeira perde tudo depois da
  // segunda `### Fonte:`, e o relatório fica silenciosamente parcial.
  const ts = tabelasCom(CONTEXT_MAP, 'Âncora');
  assert.equal(ts.length, 2);
  assert.equal(ts[0].linhas.length, 2);
  assert.equal(ts[1].linhas.length, 3);
});

test('tabelasCom descarta a linha separadora e não a confunde com dado', () => {
  const ts = tabelasCom(CONTEXT_MAP, 'Âncora');
  for (const t of ts) for (const l of t.linhas) assert.ok(!/^-+$/.test(l[0].trim()));
});

test('tabelasCom ignora tabela cujo cabeçalho não tem a agulha', () => {
  const t = '| A | B |\n|---|---|\n| 1 | 2 |';
  assert.deepEqual(tabelasCom(t, 'Âncora'), []);
});

// ————————————————————————— os fatos e suas âncoras —————————————————————————

test('lerFatos devolve id e âncora de cada fato, de todas as fontes', () => {
  const fatos = lerFatos(CONTEXT_MAP);
  assert.deepEqual(fatos.map((f) => f.id), ['F-001', 'F-002', 'F-003', 'F-004', 'F-005']);
  assert.equal(fatos[0].ancora, 'especificacao-funcional.md §3 MOD-PAG RF-007');
  assert.equal(fatos[4].ancora, '');
});

test('lerFatos pula linha cujo ID não é F-xxx — inclui a linha de exemplo do template', () => {
  const t = [
    '| ID | Fato | Âncora | Domínio | Conf. |',
    '|----|------|--------|---------|-------|',
    '| F-001 | real | especificacao-funcional.md §1 RF-001 | x | alta |',
    '| | vazio | | | |',
    '| [ID] | placeholder | | | |',
  ].join('\n');
  assert.deepEqual(lerFatos(t).map((f) => f.id), ['F-001']);
});

// ————————————————————————— rastreabilidade da âncora (Decisão 21) —————————————————————————

test('âncora com ID do Explore é rastreável', () => {
  assert.equal(rastreavel('especificacao-funcional.md §3 MOD-PAG RF-007'), true);
});

test('âncora fora do Explore é rastreável — minuto de transcrição continua certo', () => {
  // O cabeçalho do kit oferece `linha § / minuto`, e para fonte que não é documento do Explore
  // o minuto É a forma certa. Acusar isso seria falso positivo sobre a convenção do kit.
  assert.equal(rastreavel('CHAT-20260901-1 12:34'), true);
  assert.equal(rastreavel('inputs/contrato.pdf p. 14'), true);
});

test('âncora que cita documento do Explore SEM ID não é rastreável', () => {
  // É a forma `linha`, que a nossa rule proíbe: ela morre no primeiro rework do documento.
  assert.equal(rastreavel('especificacao-funcional.md linha 214'), false);
  assert.equal(rastreavel('hld-funcional.md §2'), false);
});

test('âncora vazia não é rastreável', () => {
  assert.equal(rastreavel(''), false);
  assert.equal(rastreavel('   '), false);
});

// ————————————————————————— os dois sites de Fato fonte (fato F2) —————————————————————————

const REQUISITOS = [
  '## Rastreabilidade global (RF / RNF)',
  '',
  '| ID | Tipo | Módulo | Domínio / categoria | Legacy / benchmark / vision | Fato fonte (F-xxx) |',
  '|----|------|--------|---------------------|-----------------------------|--------------------|',
  '| RF-MOD-PAG-001 | RF | MOD-PAG | cobrança | vision | F-001 |',
  '| RF-MOD-PAG-002 | RF | MOD-PAG | cobrança | vision | F-002, F-004 |',
  '',
  '## Requisitos funcionais por módulo',
  '',
  '## Módulo: Pagamentos (`MOD-PAG`)',
  '',
  '### RF-MOD-PAG-001: Cobrança recorrente',
  '',
  '**Regras de Negócio aplicáveis:** RN-NOVO-001',
  '**Rastreabilidade:** F-001',
  '',
  '### RF-MOD-PAG-002: Estorno',
  '',
  '**Rastreabilidade:** F-002',
  '',
  '### RF-MOD-PAG-003: Cobrança avulsa',
  '',
  '**Rastreabilidade:** F-011',
  '',
].join('\n');

test('lerConsumos une os dois sites de Fato fonte', () => {
  const c = lerConsumos(REQUISITOS);
  assert.deepEqual([...c.porFato.keys()].sort(), ['F-001', 'F-002', 'F-004', 'F-011']);
  assert.deepEqual([...c.porFato.get('F-004')], ['RF-MOD-PAG-002']);
});

test('a UNIÃO é a cobertura — fato conhecido SÓ pelo bloco também tem consumidor', () => {
  // Achado da revisão: nos fixtures antigos o que os blocos davam era subconjunto estrito do que
  // a tabela dava, então apagar o laço `for (const [req, fatos] of doBloco)` deixava `porFato`
  // idêntico e a suíte inteira verde — a invariante que o código chama de "A UNIÃO É A COBERTURA"
  // não estava medida. O `RF-MOD-PAG-003` existe só como bloco `###`, e o `F-011` só na linha
  // `**Rastreabilidade:**` dele: sem o laço do bloco, este fato não tem consumidor nenhum, e um
  // RF-nnn do Explore ancorado nele sairia como órfão falso.
  const c = lerConsumos(REQUISITOS);
  assert.deepEqual([...c.porFato.get('F-011')], ['RF-MOD-PAG-003']);
  // E isto NÃO é divergência: requisito presente em um site só é trabalho em andamento.
  assert.deepEqual(c.divergencias.map((d) => d.requisito), ['RF-MOD-PAG-002']);
});

test('divergência entre a tabela e o bloco do RF é achado PRÓPRIO, não silêncio', () => {
  // O F-004 está na tabela de rastreabilidade global do RF-MOD-PAG-002 e NÃO está no
  // `**Rastreabilidade:**` do bloco dele. Tolerar em silêncio é o modo de falha que este projeto
  // vem fechando; tratar como ausência seria pior ainda, porque o fato ESTÁ declarado num lugar.
  const c = lerConsumos(REQUISITOS);
  assert.deepEqual(c.divergencias, [
    { requisito: 'RF-MOD-PAG-002', soNaTabela: ['F-004'], soNoBloco: [] },
  ]);
});

test('divergência na direção inversa também é achada', () => {
  const t = REQUISITOS.replace('**Rastreabilidade:** F-002', '**Rastreabilidade:** F-002, F-009');
  const c = lerConsumos(t);
  assert.deepEqual(c.divergencias, [
    { requisito: 'RF-MOD-PAG-002', soNaTabela: ['F-004'], soNoBloco: ['F-009'] },
  ]);
});

test('requisito conhecido só pela tabela — bloco ainda não escrito — não é divergência', () => {
  // Achado da mutação B2 (Passo 10): nenhum caso de REQUISITOS cobria um requisito presente em
  // um site só, então remover o guard `!daTabela.has(req) || !doBloco.has(req)` não derrubava
  // nenhum teste. O próprio comentário do código já dizia que isto é trabalho em andamento, não
  // defeito — este teste é quem prende essa promessa.
  const t = [
    '| ID | Fato fonte (F-xxx) |',
    '|----|--------------------|',
    '| RF-MOD-PAG-003 | F-005 |',
  ].join('\n');
  assert.deepEqual(lerConsumos(t).divergencias, []);
});

// ————————————————————————— o RNF de negócio é consumidor legítimo —————————————————————————

// Na FORMA DO TEMPLATE REAL: os blocos de RNF vêm DEPOIS dos de RF, no mesmo arquivo, e cada um
// tem a sua própria linha `**Rastreabilidade:**`.
const COM_RNF = [
  '## Rastreabilidade global (RF / RNF)',
  '',
  '| ID | Tipo | Módulo | Domínio / categoria | Legacy / benchmark / vision | Fato fonte (F-xxx) |',
  '|----|------|--------|---------------------|-----------------------------|--------------------|',
  '| RF-MOD-PAG-001 | RF | MOD-PAG | cobrança | vision | F-001 |',
  '| RNF-PERF-001 | RNF | MOD-PAG | Desempenho | vision | F-050 |',
  '',
  '## Requisitos funcionais por módulo',
  '',
  '### RF-MOD-PAG-001: Cobrança recorrente',
  '',
  '**Rastreabilidade:** F-001',
  '',
  '## Requisitos Não Funcionais (negócio)',
  '',
  '### RNF-PERF-001: Latência da cobrança',
  '',
  '**Método de verificação:** teste de carga',
  '**Rastreabilidade:** F-050',
  '',
  '### RNF-SEG-002: Cifragem em trânsito',
  '',
  '**Método de verificação:** revisão de arquitetura',
  '**Rastreabilidade:** F-051',
  '',
].join('\n');

test('o bloco `### RNF-…` é do RNF, e não do último RF — a divergência falsa que isso gerava', () => {
  // Achado da revisão: enquanto o laço só reconhecia `### RF-MOD-…`, o heading do RNF não casava,
  // `atual` continuava apontando para o `RF-MOD-PAG-001` e o `F-050` era creditado a ELE. O
  // relatório acusava `{requisito:'RF-MOD-PAG-001', soNoBloco:['F-050']}` num documento
  // perfeitamente consistente — achado falso com aparência de autoridade, que é o pior resultado
  // possível deste executável.
  const c = lerConsumos(COM_RNF);
  assert.deepEqual([...c.porFato.get('F-050')], ['RNF-PERF-001']);
  assert.deepEqual([...c.porFato.get('F-001')], ['RF-MOD-PAG-001']);
  assert.deepEqual(c.divergencias, []);
  // O `RNF-SEG-002` existe SÓ como bloco, e o `F-051` só na linha `**Rastreabilidade:**` dele.
  // Sem reconhecer o heading do RNF, este fato não tem consumidor NENHUM — e um fato do Explore
  // ancorado nele sairia como "colhido e esquecido" tendo consumidor declarado. É este caso, e
  // não o `F-050`, que prende o reconhecimento: o `F-050` também está na tabela, que cobriria.
  assert.deepEqual([...c.porFato.get('F-051') || []], ['RNF-SEG-002']);
});

test('linha de RNF na tabela de rastreio conta — não é descartada em silêncio', () => {
  // O filtro exigia `RF_KIT` ou `RN_NOVO`, e `RNF-PERF-001` não casava nenhum: a linha inteira era
  // ignorada, e um fato citado SÓ por RNF via tabela saía como `fatosSemConsumidor` — "colhido e
  // esquecido" sobre um fato que tem consumidor declarado.
  const soTabela = [
    '| ID | Tipo | Fato fonte (F-xxx) |',
    '|----|------|--------------------|',
    '| RNF-SEG-002 | RNF | F-051 |',
  ].join('\n');
  const c = lerConsumos(soTabela);
  assert.deepEqual([...c.porFato.get('F-051')], ['RNF-SEG-002']);
});

test('heading `###` desconhecido zera o dono — nenhuma Rastreabilidade vaza para o anterior', () => {
  // O terceiro caso de `requisitoDoHeading`, e é ele que impede a PRÓXIMA família de reintroduzir
  // o defeito do RNF: heading que o laço não reconhece tem que zerar `atual`, senão o rastreio
  // que vem depois é creditado a quem não é dono.
  const t = [
    '### RF-MOD-PAG-001: Cobrança',
    '**Rastreabilidade:** F-001',
    '',
    '### Questões em aberto',
    '**Rastreabilidade:** F-099',
  ].join('\n');
  const c = lerConsumos(t);
  assert.deepEqual([...c.porFato.get('F-001')], ['RF-MOD-PAG-001']);
  assert.equal(c.porFato.has('F-099'), false, 'o F-099 vazou para o RF anterior');
});

test('heading de NÍVEL 2 desconhecido também zera o dono — o reset não vale só para `###`', () => {
  // Achado da revisão: o reset olhava `/^###\s/`, então uma seção de nível 2 não fechava o bloco e
  // o rastreio escrito nela era creditado ao último RF — o mesmo defeito do heading do RNF, um
  // nível acima. O template real fecha os blocos `### RNF-…` com a seção de nível 2
  // `## Questões em aberto`, e o comentário do reset prometia "o pior caso é não atribuí a
  // ninguém" sem qualificar o nível.
  const t = [
    '### RF-MOD-PAG-001: x',
    '**Rastreabilidade:** F-001',
    '',
    '## Questoes em aberto',
    '**Rastreabilidade:** F-099',
  ].join('\n');
  const c = lerConsumos(t);
  assert.deepEqual([...c.porFato.get('F-001')], ['RF-MOD-PAG-001']);
  assert.equal(c.porFato.has('F-099'), false, 'o F-099 vazou para o RF anterior');
  // Nível 1 fecha igual: `# Requisitos` abrindo outro documento concatenado não pode herdar dono.
  const umNivel = lerConsumos(['### RF-MOD-PAG-001: x', '# Outro documento', '**Rastreabilidade:** F-098'].join('\n'));
  assert.equal(umNivel.porFato.has('F-098'), false);
});

test('nível 4+ NÃO zera o dono — `#### Critérios de aceite` é subseção do bloco', () => {
  // O par do teste acima: se o reset descesse ao nível 4, o rastreio escrito depois de uma
  // subseção do próprio requisito ficaria sem dono, e o fato sairia "colhido e esquecido".
  const c = lerConsumos([
    '### RF-MOD-PAG-001: x',
    '#### Critérios de aceite',
    '**Rastreabilidade:** F-001',
  ].join('\n'));
  assert.deepEqual([...c.porFato.get('F-001')], ['RF-MOD-PAG-001']);
});

test('o heading usa a fronteira de ID do kit — `### RNF-PERF-001-A` não vira chave truncada', () => {
  // Achado da revisão: com `\b` depois do padrão, este heading produzia a chave `RNF-PERF-001` —
  // um requisito que NÃO existe no documento —, enquanto o `varrer` do kit não extrai ID nenhum de
  // `RNF-PERF-001-A` (hífen colando o ID a mais token é texto malformado). Duas noções de "onde o
  // ID termina" é meio dono da gramática, e os dois sites passam a conhecer requisitos diferentes.
  const c = lerConsumos(['### RNF-PERF-001-A: x', '**Rastreabilidade:** F-070'].join('\n'));
  assert.deepEqual([...c.porFato.keys()], [], 'a chave truncada voltou');
  // E o ID bem formado continua sendo reconhecido, senão o conserto teria matado a leitura.
  const bom = lerConsumos(['### RNF-PERF-001: x', '**Rastreabilidade:** F-070'].join('\n'));
  assert.deepEqual([...bom.porFato.get('F-070')], ['RNF-PERF-001']);
});

test('o heading só é dono quando o ID ABRE o título — prosa que cita o requisito não é bloco', () => {
  const c = lerConsumos(['### Notas sobre o RF-MOD-PAG-001', '**Rastreabilidade:** F-001'].join('\n'));
  assert.equal(c.porFato.has('F-001'), false);
});

test('a chave da tabela é o ID EXTRAÍDO, não a célula inteira', () => {
  // Achado da revisão: `| RNF-PERF-001 (perf) |` passava o filtro e virava a chave
  // `'RNF-PERF-001 (perf)'`, que nunca casa a chave `'RNF-PERF-001'` vinda do bloco: os dois sites
  // pareciam conhecer requisitos diferentes, o guard de divergência não disparava, e
  // `cobertos[].requisitos` listava o texto sujo como se fosse ID.
  const t = [
    '| ID | Fato fonte (F-xxx) |',
    '|----|--------------------|',
    '| RNF-PERF-001 (perf) | F-050, F-051 |',
    '',
    '### RNF-PERF-001: Latência',
    '**Rastreabilidade:** F-050',
  ].join('\n');
  const c = lerConsumos(t);
  assert.deepEqual([...c.porFato.get('F-050')], ['RNF-PERF-001'], 'a chave saiu suja');
  // E agora os dois sites falam do MESMO requisito, então a divergência real é apurada.
  assert.deepEqual(c.divergencias, [
    { requisito: 'RNF-PERF-001', soNaTabela: ['F-051'], soNoBloco: [] },
  ]);
});

test('coluna `ID` é casada por igualdade — `Prioridade` e `Validade` contêm "id"', () => {
  // Hoje não morde porque `ID` é a primeira coluna nos dois templates do kit. Uma coluna
  // acrescentada à mão ANTES dela deslocaria o índice em silêncio, e o relatório passaria a ler
  // prioridade onde espera requisito.
  const t = [
    '| Prioridade | ID | Fato fonte (F-xxx) |',
    '|------------|----|--------------------|',
    '| alta | RF-MOD-PAG-001 | F-001 |',
  ].join('\n');
  assert.deepEqual([...lerConsumos(t).porFato.get('F-001')], ['RF-MOD-PAG-001']);

  const fatos = [
    '| Validade | ID | Âncora (linha § / minuto) |',
    '|----------|----|---------------------------|',
    '| 2026 | F-001 | especificacao-funcional.md §3 RF-007 |',
  ].join('\n');
  assert.deepEqual(lerFatos(fatos), [{ id: 'F-001', ancora: 'especificacao-funcional.md §3 RF-007' }]);
});

test('o mesmo requisito em duas tabelas UNE os fatos, não sobrescreve', () => {
  const t = [
    '| ID | Fato fonte (F-xxx) |',
    '|----|--------------------|',
    '| RF-MOD-PAG-001 | F-001 |',
    '',
    'prosa que fecha a tabela',
    '',
    '| ID | Fato fonte (F-xxx) |',
    '|----|--------------------|',
    '| RF-MOD-PAG-001 | F-002 |',
  ].join('\n');
  const c = lerConsumos(t);
  assert.deepEqual([...c.porFato.keys()].sort(), ['F-001', 'F-002']);
});

test('âncora que cita documento do Explore com OUTRA CAIXA também não é rastreável', () => {
  // O resto do harness compara caminho por `chave()`. Com `includes` sensível a caixa,
  // `Especificacao-Funcional.md linha 214` passava como rastreável — a forma que a rule proíbe
  // entrando por diferença de maiúscula.
  assert.equal(rastreavel('Especificacao-Funcional.md linha 214'), false);
  assert.equal(rastreavel('HLD-Funcional.md §2'), false);
});

// ————————————————————————— o cruzamento —————————————————————————

function relatorioDoExemplo() {
  return cruzar({
    idsExplore: ['RF-007', 'RF-008', 'RF-009', 'RN-003'],
    fatos: lerFatos(CONTEXT_MAP),
    consumos: lerConsumos(REQUISITOS),
  });
}

test('cruzar separa coberto de órfão', () => {
  const r = relatorioDoExemplo();
  assert.deepEqual(r.cobertos.map((c) => c.id).sort(), ['RF-007', 'RF-008']);
  assert.deepEqual(r.orfaos.sort(), ['RF-009', 'RN-003']);
});

test('cruzar acusa fato ancorado no Explore que nenhum requisito cita', () => {
  const r = relatorioDoExemplo();
  // F-005 tem âncora vazia (não rastreável, não entra aqui); F-003 é de transcrição, fora do
  // Explore; F-004 é do Explore por `linha` — não rastreável. Sobra nenhum: F-001, F-002 e F-004
  // são citados. Acrescentar um fato do Explore sem consumidor tem que fazê-lo aparecer.
  assert.deepEqual(r.fatosSemConsumidor, []);

  const comOrfao = cruzar({
    idsExplore: ['RF-007'],
    fatos: [{ id: 'F-020', ancora: 'gaps.md §1 RF-007' }],
    consumos: lerConsumos(''),
  });
  assert.deepEqual(comOrfao.fatosSemConsumidor, ['F-020']);
});

test('cruzar separa âncora não rastreável de RF descartado — a Decisão 21', () => {
  const r = relatorioDoExemplo();
  assert.deepEqual(r.ancorasNaoRastreaveis.map((a) => a.id).sort(), ['F-004', 'F-005']);
  // E o RF-009 continua em `orfaos`, não migrou para cá: as duas categorias existem juntas.
  assert.ok(r.orfaos.includes('RF-009'));
});

test('projeto que ancorou TUDO por linha não lê "perdi tudo"', () => {
  // A razão de a quarta categoria existir. Sem ela, este relatório teria RF-007 em `orfaos` e
  // nada mais a dizer — e o consultor concluiria que o requisito foi descartado.
  const r = cruzar({
    idsExplore: ['RF-007'],
    fatos: [{ id: 'F-001', ancora: 'especificacao-funcional.md linha 88' }],
    consumos: lerConsumos(''),
  });
  assert.deepEqual(r.orfaos, ['RF-007']);
  assert.equal(r.ancorasNaoRastreaveis.length, 1);
  assert.match(formatarTexto(r), /âncora não rastreável/i);
});

test('cruzar não confunde RF-007 com RF-0071 no mesmo projeto — includes cru daria cobertura falsa', () => {
  // Achado da mutação B3 (Passo 10): os fixtures de cima não tinham dois IDs onde um é prefixo
  // textual do outro, então trocar `idsNaAncora(f.ancora).includes(id)` por
  // `f.ancora.includes(id)` ficava verde. Este caso é o que o brief pede para matar a mutação.
  const r = cruzar({
    idsExplore: ['RF-007', 'RF-0071'],
    fatos: [{ id: 'F-001', ancora: 'especificacao-funcional.md §3 RF-0071' }],
    consumos: lerConsumos([
      '| ID | Fato fonte (F-xxx) |',
      '|----|--------------------|',
      '| RF-MOD-PAG-001 | F-001 |',
      '',
      '### RF-MOD-PAG-001: t',
      '**Rastreabilidade:** F-001',
    ].join('\n')),
  });
  assert.deepEqual(r.orfaos, ['RF-007']);
  assert.deepEqual(r.cobertos.map((c) => c.id), ['RF-0071']);
});

test('relatório de projeto perfeito não inventa achado', () => {
  const r = cruzar({
    idsExplore: ['RF-007'],
    fatos: [{ id: 'F-001', ancora: 'especificacao-funcional.md §3 RF-007' }],
    consumos: lerConsumos([
      '| ID | Fato fonte (F-xxx) |',
      '|----|--------------------|',
      '| RF-MOD-PAG-001 | F-001 |',
      '',
      '### RF-MOD-PAG-001: t',
      '**Rastreabilidade:** F-001',
    ].join('\n')),
  });
  assert.deepEqual(r.orfaos, []);
  assert.deepEqual(r.fatosSemConsumidor, []);
  assert.deepEqual(r.ancorasNaoRastreaveis, []);
  assert.deepEqual(r.divergenciasDeRastreio, []);
  assert.equal(r.tudoFechado, true);
});

// ————————————————————————— a casca de I/O —————————————————————————

const barras = (p) => String(p).replace(/\\/g, '/');

/** Um `io` injetável que REGISTRA todo caminho pedido, na ordem. */
function ioQueRegistra(arquivos = {}, erroPorCaminho = {}) {
  const registro = [];
  const io = {
    cwd: () => 'raiz',
    lerArquivo: (caminho) => {
      registro.push(caminho);
      const code = erroPorCaminho[barras(caminho)];
      if (code) { const e = new Error(code); e.code = code; throw e; }
      const achado = arquivos[barras(caminho)];
      if (achado === undefined) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; }
      return achado;
    },
  };
  return { io, registro };
}

// Os OITO caminhos, escritos à mão de propósito: compará-los com outro `join` seria tautologia, e
// este é o fato de fonte mais caro da tarefa — errar o subdiretório `requirements/` faz o
// relatório não achar requisito nenhum e reportar TODOS como órfãos, com aparência de autoridade.
// Eram sete até o D14 do teste ponta a ponta da 2.6.0: o `business-rules.md`, na RAIZ de
// `outputs/spec/` (a forma do `check-outputs.py`), é onde as RN-NOVO consomem fato.
const CAMINHOS_ESPERADOS = [
  'raiz/outputs/explore/hld-funcional.md',
  'raiz/outputs/explore/especificacao-funcional.md',
  'raiz/outputs/explore/especificacao-tecnica.md',
  'raiz/outputs/explore/modelo-de-dados.md',
  'raiz/outputs/explore/gaps.md',
  'raiz/outputs/spec/context-map.md',
  'raiz/outputs/spec/requirements/requirements.md',
  'raiz/outputs/spec/business-rules.md',
];

test('coletar pede exatamente os oito caminhos compostos, com os subdiretórios', () => {
  const { io, registro } = ioQueRegistra();
  const c = coletar('raiz', io);
  assert.deepEqual(registro.map(barras), CAMINHOS_ESPERADOS);
  // E os devolve, porque é o relatório que vai NOMEÁ-LOS quando não achar nada.
  assert.equal(barras(c.caminhos.contextMap), 'raiz/outputs/spec/context-map.md');
  assert.equal(barras(c.caminhos.requisitos), 'raiz/outputs/spec/requirements/requirements.md');
  assert.equal(barras(c.caminhos.regras), 'raiz/outputs/spec/business-rules.md');
});

test('coletar sem raiz resolve a partir do diretório corrente', () => {
  const { io, registro } = ioQueRegistra();
  coletar('', io);
  assert.equal(barras(registro[5]), 'outputs/spec/context-map.md');
});

test('coletar trata ausência como vazio e RELANÇA ilegibilidade', () => {
  const vazio = coletar('raiz', ioQueRegistra().io);
  assert.equal(vazio.contextMap, '');
  assert.equal(vazio.requisitos, '');
  assert.equal(vazio.docsExplore.size, 0);

  for (const code of ['ENOENT', 'ENOTDIR', 'EISDIR']) {
    const { io } = ioQueRegistra({}, { 'raiz/outputs/spec/context-map.md': code });
    assert.equal(coletar('raiz', io).contextMap, '', `${code} devia ser lido como ausência`);
  }
  // EACCES SOBE, e é o que separa "não há documento" de "há e eu não o li". Um relatório que
  // engole EACCES reporta órfão onde há arquivo ilegível — e o EBUSY/EPERM do sync do OneDrive é
  // o setup real deste usuário, não caso exótico.
  for (const code of ['EACCES', 'EBUSY', 'EPERM']) {
    const { io } = ioQueRegistra({}, { 'raiz/outputs/spec/context-map.md': code });
    assert.throws(() => coletar('raiz', io), new RegExp(code), `${code} devia subir`);
  }
});

test('IO_REAL é a leitura MAIS a escrita — e a escrita é o que distingue ferramenta de verificador', () => {
  // A lista cresceu na Tarefa 3, e o crescimento é a Decisão 20 aparecendo no código: verificador
  // NÃO escreve arquivo; executável de mão pode, e o `--congelar` é o primeiro que exerce isso.
  // A asserção é EXAUSTIVA de propósito — um `escrever` que entrasse aqui sem consumidor, ou um
  // consumidor que chamasse método que o `IO_REAL` não tem, é o par que ela pega.
  assert.deepEqual(
    Object.keys(IO_REAL).sort(),
    ['criarDiretorio', 'cwd', 'escrever', 'existe', 'lerArquivo'],
  );
  assert.equal(IO_REAL.cwd(), process.cwd());
  for (const nome of ['lerArquivo', 'escrever', 'criarDiretorio', 'existe']) {
    assert.equal(typeof IO_REAL[nome], 'function', nome);
  }
});

test('idsDoExplore une os documentos sem repetição, na ordem de aparição', () => {
  const docs = new Map([
    ['hld-funcional.md', 'O MOD-PAG cobre RF-009 e RF-007.'],
    ['especificacao-funcional.md', 'RF-007 de novo, mais RN-003 e RF-008.'],
    ['gaps.md', 'GAP-001 não é RF nem RN.'],
  ]);
  // `RF` antes de `RN` dentro de cada documento: é a ordem em que o laço varre as famílias, e o
  // relatório precisa sair estável entre rodadas.
  assert.deepEqual(idsDoExplore(docs), ['RF-009', 'RF-007', 'RF-008', 'RN-003']);
  assert.deepEqual(idsDoExplore(new Map()), []);
});

test('relatorioDe cruza ponta a ponta o que a casca leu dos caminhos certos', () => {
  const { io } = ioQueRegistra({
    'raiz/outputs/explore/especificacao-funcional.md': 'Tela de cobrança: RF-007 e RF-009.',
    'raiz/outputs/spec/context-map.md': CONTEXT_MAP,
    'raiz/outputs/spec/requirements/requirements.md': REQUISITOS,
  });
  const r = relatorioDe('raiz', io);
  assert.equal(r.semArtefatos, false);
  assert.deepEqual(r.cobertos.map((c) => c.id), ['RF-007']);
  assert.deepEqual(r.cobertos[0].requisitos, ['RF-MOD-PAG-001']);
  assert.deepEqual(r.orfaos, ['RF-009']);
  assert.deepEqual(r.ancorasNaoRastreaveis.map((a) => a.id), ['F-004', 'F-005']);
});

// ————————————————————————— as três mensagens do relatório —————————————————————————

test('formatarTexto NÃO dá atestado de saúde a projeto de que nada foi lido', () => {
  // O modo de falha real: um `io` que devolve ENOENT para tudo produzia zero de tudo, e o
  // relatório dizia "Nada a justificar. Todo RF-nnn e RN-nnn do Explore chegou ao backlog do
  // Plan". "Não consegui ler nada" afirmado como "está tudo certo" — as duas conclusões mais
  // distantes possíveis. Num executável de mão que resolve caminho por `process.cwd()`, errar o
  // diretório é o cenário NORMAL, não exótico.
  const { io, registro } = ioQueRegistra();
  const t = formatarTexto(relatorioDe('raiz', io));
  assert.equal(registro.length, 8, 'ele tentou ler, e é isso que dá sentido à mensagem');
  assert.match(t, /NENHUM ARTEFATO DO PLAN FOI LIDO/);
  assert.match(t, /NÃO diz que está tudo certo/);
  assert.doesNotMatch(t, /Nada a justificar/);
  // Nomeia OS DOIS caminhos, com o subdiretório: é o que faz quem errou a `cwd` reconhecer o erro
  // sem abrir o código.
  assert.match(t, /outputs[\\/]spec[\\/]context-map\.md/);
  assert.match(t, /outputs[\\/]spec[\\/]requirements[\\/]requirements\.md/);
  assert.match(t, /executável de mão e monta os caminhos a partir de onde foi chamado/);
  // E não lista categoria nenhuma: sem artefato, todo ID do Explore cairia em `orfaos` por
  // construção, e listá-los daria aparência de autoridade a uma lista que não mediu nada.
  assert.doesNotMatch(t, /ÓRFÃOS/);
});

// ————————————————————————— os QUATRO estados de artefato —————————————————————————

// Os cinco documentos do Explore, para que o "li N de 5" saia com N = 5 e o estado degradado seja
// inequivocamente de FASE, e não de `cwd` errada.
const CINCO_DO_EXPLORE = {
  'raiz/outputs/explore/hld-funcional.md': 'MOD-PAG cobre RF-007.',
  'raiz/outputs/explore/especificacao-funcional.md': 'Tela de cobrança: RF-007 e RF-008.',
  'raiz/outputs/explore/especificacao-tecnica.md': 'Camadas.',
  'raiz/outputs/explore/modelo-de-dados.md': 'Entidades.',
  // A `RN-003` existe para que o estado dos DOIS artefatos presentes tenha um órfão de verdade —
  // é o contraste que dá sentido à ausência de lista nominal nos estados degradados.
  'raiz/outputs/explore/gaps.md': 'GAP-001 sobre a RN-003.',
};
const CM = 'raiz/outputs/spec/context-map.md';
const RQ = 'raiz/outputs/spec/requirements/requirements.md';

/** O relatório de um dos quatro estados, sempre com os cinco documentos do Explore lidos. */
function estado({ contextMap = false, requisitos = false } = {}) {
  const arquivos = { ...CINCO_DO_EXPLORE };
  if (contextMap) arquivos[CM] = CONTEXT_MAP;
  if (requisitos) arquivos[RQ] = REQUISITOS;
  return relatorioDe('raiz', ioQueRegistra(arquivos).io);
}

test('os DOIS artefatos presentes: nada é suprimido, e as listas nominais saem', () => {
  const r = estado({ contextMap: true, requisitos: true });
  assert.deepEqual(r.ausentes, []);
  assert.deepEqual(r.suprimidos, []);
  assert.equal(r.semArtefatos, false);
  // A medição de verdade acontece, e com lista nominal: RF-007 e RF-008 cobertos pelos fatos que
  // os ancoram, RN-003 órfã porque nenhum fato a carrega.
  assert.deepEqual(r.cobertos.map((c) => c.id), ['RF-007', 'RF-008']);
  assert.deepEqual(r.orfaos, ['RN-003']);
  const t = formatarTexto(r);
  assert.match(t, /── ÓRFÃOS/);
  assert.match(t, /· RN-003/);
  assert.match(t, /── COBERTOS/);
  assert.doesNotMatch(t, /n\/d/);
  // Nenhum aviso de ausência DOS DOIS. O `business-rules.md` não está neste fixture, e desde o D14
  // isso sai numa linha própria — que não suprime nada, e é a que explica a RN-003 órfã.
  assert.doesNotMatch(t, /NÃO LI O `(context-map\.md|requirements\/requirements\.md)`/);
  assert.match(t, /NÃO LI O `business-rules\.md`/);
});

test('falta só o `requirements.md`: uma frase, e NENHUMA lista nominal de órfão ou de fato', () => {
  // O ACHADO BLOQUEANTE. O corte exigia os DOIS artefatos ausentes, e este estado — que é a ORDEM
  // NORMAL do pipeline, a `spec-ingest` escreve o mapa e a `spec-product` escreve depois — caía no
  // caminho normal e imprimia `RF-007 · RF-008` como órfãos e `F-001 · F-002` como "colhidos e
  // esquecidos", afirmando sobre cada um a prosa diagnóstica errada: linha no `gaps.md` para um
  // requisito que o cliente aprovou. A verdade é uma frase: o segundo artefato não existe.
  const r = estado({ contextMap: true });
  assert.deepEqual(r.ausentes, ['requisitos']);
  assert.deepEqual(r.suprimidos.sort(), ['cobertos', 'divergenciasDeRastreio', 'fatosSemConsumidor', 'orfaos']);
  assert.equal(r.semArtefatos, false, 'um artefato existe — não é o caso dos dois ausentes');
  // SUPRIMIDO, não zerado em silêncio: as listas vêm vazias E o relatório diz que foram suprimidas.
  assert.deepEqual(r.orfaos, []);
  assert.deepEqual(r.fatosSemConsumidor, []);
  assert.deepEqual(r.cobertos, []);
  assert.equal(r.tudoFechado, false);

  const t = formatarTexto(r);
  assert.match(t, /NÃO LI O `requirements\/requirements\.md`/);
  assert.match(t, /outputs[\\/]spec[\\/]requirements[\\/]requirements\.md/);
  assert.match(t, /Li 5 de 5 documentos do `outputs\/explore\/`/);
  assert.match(t, /SUPRIMI as categorias que saem dele, e NÃO as zerei/);
  assert.match(t, /órfãos: n\/d/);
  assert.doesNotMatch(t, /órfãos: 0/);
  // O QUE VALE ainda é dito, e é o que dá o que fazer agora.
  assert.match(t, /CONTINUA VALENDO âncora não rastreável/);
  assert.match(t, /O QUE FAZER: rode a `spec-product`/);
  // E O QUE NÃO PODE SAIR: nenhuma lista nominal das categorias sem base.
  assert.doesNotMatch(t, /── ÓRFÃOS/);
  assert.doesNotMatch(t, /── FATO SEM CONSUMIDOR/);
  // Nenhum ITEM de lista (`   · `) das categorias suprimidas. A âncora não rastreável CONTINUA
  // listando os seus (`· F-004`, `· F-005`), e é o único `·` de achado que pode sair aqui.
  assert.doesNotMatch(t, /· (RF-007|RF-008|RN-003|F-001|F-002)\b/);
  assert.doesNotMatch(t, /Nada a justificar/);
  assert.match(t, /· F-004 → "especificacao-funcional\.md linha 214"/);
});

test('falta só o `context-map.md`: também não sai lista nominal, e o espelho é dito', () => {
  const r = estado({ requisitos: true });
  assert.deepEqual(r.ausentes, ['contextMap']);
  assert.deepEqual(r.suprimidos.sort(), ['ancorasNaoRastreaveis', 'cobertos', 'fatosSemConsumidor', 'orfaos']);
  assert.equal(r.semArtefatos, false);
  const t = formatarTexto(r);
  assert.match(t, /NÃO LI O `context-map\.md`/);
  assert.match(t, /outputs[\\/]spec[\\/]context-map\.md/);
  assert.match(t, /âncoras não rastreáveis: n\/d/);
  assert.match(t, /CONTINUA VALENDO divergência de rastreio/);
  assert.doesNotMatch(t, /── ÓRFÃOS/);
  assert.doesNotMatch(t, /── FATO SEM CONSUMIDOR/);
  assert.doesNotMatch(t, /── ÂNCORA NÃO RASTREÁVEL/);
  assert.doesNotMatch(t, /RF-007|RF-008/);
  // A divergência dos dois sites do `requirements.md` NÃO é suprimida: ela é interna ao artefato
  // que existe. Suprimi-la seria trocar achado falso por silêncio sobre achado verdadeiro.
  assert.match(t, /── DIVERGÊNCIA DE RASTREIO/);
  assert.match(t, /RF-MOD-PAG-002/);
});

test('nenhum dos dois: continua a mensagem dos dois ausentes, agora com o "li N de 5"', () => {
  const r = estado();
  assert.deepEqual(r.ausentes, ['contextMap', 'requisitos']);
  assert.equal(r.semArtefatos, true);
  assert.deepEqual(r.suprimidos.sort(), [
    'ancorasNaoRastreaveis', 'cobertos', 'divergenciasDeRastreio', 'fatosSemConsumidor', 'orfaos',
  ]);
  const t = formatarTexto(r);
  assert.match(t, /NENHUM ARTEFATO DO PLAN FOI LIDO/);
  // Os cinco documentos do Explore FORAM lidos aqui: é fase, não diretório, e a linha é quem diz.
  assert.match(t, /Li 5 de 5 documentos do `outputs\/explore\/`/);
  assert.doesNotMatch(t, /── ÓRFÃOS/);
  assert.doesNotMatch(t, /── FATO SEM CONSUMIDOR/);
});

test('a `cwd` errada se distingue da fase pelo "li 0 de 5" — o sinal mais direto', () => {
  // Sem esta linha, o consultor que errou o diretório e aquele cujo projeto ainda não chegou na
  // `spec-product` recebiam exatamente a mesma mensagem e tinham que adivinhar qual dos dois eram.
  const t = formatarTexto(relatorioDe('raiz', ioQueRegistra().io));
  assert.match(t, /Li 0 de 5 documentos do `outputs\/explore\/`/);
  assert.match(t, /0 de 5 → o DIRETÓRIO está errado/);
});

test('degradado em que o que sobrou não achou nada DIZ isso — silêncio não é atestado', () => {
  // A segunda pergunta da autorrevisão: suprimir categoria e não dizer nada trocaria um defeito
  // por outro. Aqui falta o `requirements.md`, a única categoria que sobra (âncora não rastreável)
  // está limpa, e sem esta frase o relatório terminaria no aviso — silêncio que leria como "no
  // resto está tudo bem".
  const arquivos = {
    ...CINCO_DO_EXPLORE,
    [CM]: [
      '| ID | Fato | Âncora (linha § / minuto) |',
      '|----|------|---------------------------|',
      '| F-001 | Cobrança | especificacao-funcional.md §3 RF-007 |',
    ].join('\n'),
  };
  const t = formatarTexto(relatorioDe('raiz', ioQueRegistra(arquivos).io));
  assert.match(t, /Nas categorias que SOBRARAM, não achei nada/);
  assert.match(t, /NÃO é atestado de saúde/);
  assert.doesNotMatch(t, /── ÂNCORA NÃO RASTREÁVEL/);
});

test('sem `docsLidos` a linha do Explore não sai — número inventado é pior que linha ausente', () => {
  const r = cruzar({
    idsExplore: ['RF-007'],
    fatos: [],
    consumos: lerConsumos(''),
    artefatos: { contextMap: '', requisitos: '', caminhos: { contextMap: 'a', requisitos: 'b' } },
  });
  assert.equal(r.docsExplore, null);
  assert.doesNotMatch(formatarTexto(r), /documentos do `outputs\/explore\/`/);
});

test('formatarTexto do caso bom afirma só o que foi medido, e MOSTRA os cobertos', () => {
  const consumos = lerConsumos([
    '| ID | Fato fonte (F-xxx) |',
    '|----|--------------------|',
    '| RF-MOD-PAG-001 | F-001 |',
    '',
    '### RF-MOD-PAG-001: t',
    '**Rastreabilidade:** F-001',
  ].join('\n'));
  const r = cruzar({
    idsExplore: ['RF-007'],
    fatos: [{ id: 'F-001', ancora: 'especificacao-funcional.md §3 RF-007' }],
    consumos,
    artefatos: { contextMap: '…', requisitos: '…', caminhos: { contextMap: 'a', requisitos: 'b' } },
  });
  assert.equal(r.tudoFechado, true);
  const t = formatarTexto(r);
  assert.match(t, /NO QUE FOI MEDIDO/);
  // A frase antiga dizia "todo fato colhido tem consumidor", e `fatosSemConsumidor` só olha fato
  // ancorado em DOCUMENTO DO EXPLORE: num projeto ingerido por transcrição — toda âncora no
  // formato `CHAT-… 12:34` —, ela era dita sem nunca ter sido medida.
  assert.match(t, /1 fato\(s\) ancorado\(s\) em documento do\nExplore têm consumidor/);
  assert.match(t, /NÃO foi medido/);
  assert.doesNotMatch(t, /todo fato colhido/);
  // E o early-return omitia a seção COBERTOS: no caso bom, o relatório tem que mostrar o que cobriu.
  assert.match(t, /── COBERTOS/);
  assert.match(t, /RF-007 → F-001 → RF-MOD-PAG-001/);
});

test('o cabeçalho de ÓRFÃOS cobre as DUAS formas de cair na lista', () => {
  // A antiga só nomeava a primeira ("não aparecem em nenhuma âncora rastreável"), e quem
  // recebesse a linha sobre um órfão do segundo tipo iria procurar uma âncora que está correta.
  const semAncora = cruzar({ idsExplore: ['RF-009'], fatos: [], consumos: lerConsumos('') });
  const semConsumidor = cruzar({
    idsExplore: ['RF-007'],
    fatos: [{ id: 'F-001', ancora: 'especificacao-funcional.md §3 RF-007' }],
    consumos: lerConsumos(''),
  });
  assert.deepEqual(semConsumidor.orfaos, ['RF-007'], 'este é o órfão do segundo tipo');
  for (const r of [semAncora, semConsumidor]) {
    const t = formatarTexto(r);
    assert.match(t, /DUAS FORMAS DE CAIR AQUI/);
    assert.match(t, /nenhum fato do `context-map\.md` tem âncora rastreável/);
    assert.match(t, /NENHUM requisito do Plan\n\s+cita esse fato/);
    assert.doesNotMatch(t, /não aparecem em nenhuma âncora rastreável/);
  }
});

// ————————————————————————— inserção do carimbo —————————————————————————

test('inserirCarimbo põe a linha depois do H1, e lerCarimbo a reconhece', () => {
  // A DUAS PONTAS, e é o par que o JSDoc do zonas.mjs pede: quem escreve e quem confere têm que
  // concordar sobre o que é a linha. Um teste que só verificasse `includes('CONGELADO em')`
  // passaria com uma linha que `lerCarimbo` não casa.
  const antes = '# HLD funcional\n\nTexto do documento.\n';
  const depois = inserirCarimbo(antes, '2026-09-08');
  assert.deepEqual(lerCarimbo(depois), { congelado: true, data: '2026-09-08' });
  const linhas = depois.split('\n');
  assert.equal(linhas[0], '# HLD funcional');
  assert.equal(linhas[2], montarCarimbo('2026-09-08'));
});

test('inserirCarimbo em documento sem H1 põe a linha no topo', () => {
  const depois = inserirCarimbo('Texto sem título.\n', '2026-09-08');
  assert.equal(lerCarimbo(depois).congelado, true);
  assert.equal(depois.split('\n')[0], montarCarimbo('2026-09-08'));
});

test('inserirCarimbo é idempotente — carimbar duas vezes não duplica', () => {
  const uma = inserirCarimbo('# T\n\nx\n', '2026-09-08');
  const duas = inserirCarimbo(uma, '2026-09-09');
  assert.equal(uma, duas, 'o segundo carimbo alterou o documento');
  assert.equal(lerCarimbo(duas).data, '2026-09-08', 'a data do primeiro carimbo mudou');
});

test('inserirCarimbo CARIMBA o documento que só CITA o carimbo dentro de cerca de código', () => {
  // O CASO REAL QUE MOTIVOU A DECISÃO 16, e o que separa "idempotente por `lerCarimbo`" de
  // "idempotente por procurar a string à mão": o `gaps.md` documenta o procedimento de
  // congelamento, e a linha do carimbo aparece dentro de um bloco de código. Uma guarda escrita
  // como `texto.includes('CONGELADO em')` leria isso como "já carimbado" e deixaria o documento
  // sem carimbo — e aí `congelar` recusaria marcar, corretamente, num projeto perfeitamente sadio.
  const citado = [
    '# GAPs e questões abertas',
    '',
    'Quando o `spec-product` fecha, cada documento do Explore recebe a linha:',
    '',
    '```markdown',
    montarCarimbo('2026-08-25'),
    '```',
    '',
    'Ainda NÃO executamos o congelamento.',
  ].join('\n');
  assert.equal(lerCarimbo(citado).congelado, false, 'o fixture tem que estar NÃO carimbado');

  const depois = inserirCarimbo(citado, '2026-09-08');
  assert.notEqual(depois, citado, 'a citação dentro de cerca foi lida como carimbo');
  assert.equal(lerCarimbo(depois).data, '2026-09-08');
  // E a citação continua lá, intacta: carimbar não é reescrever o documento.
  assert.ok(depois.includes(['```markdown', montarCarimbo('2026-08-25'), '```'].join('\n')));
});

test('inserirCarimbo preserva o CRLF do documento — nem EOL misto, nem linha em branco dobrada', () => {
  // O `split('\n')` anterior discordava da noção de linha DO REPOSITÓRIO (`/\r?\n/`, do
  // `mapearCercas` que o `lerCarimbo` usa): num documento CRLF cada elemento terminava em `\r`, a
  // comparação `depois[0] === ''` não casava porque o elemento era `'\r'`, e o arquivo saía com
  // `\r\n` e `\n` misturados MAIS a linha em branco que devia ter sido consumida. E documento CRLF
  // não é exótico neste projeto: o harness roda no Windows.
  const antes = '# HLD funcional\r\n\r\nTexto do documento.\r\n';
  const depois = inserirCarimbo(antes, '2026-09-08');

  // A DUAS PONTAS, como o teste do H1: quem escreve e quem confere têm que concordar sobre a linha.
  assert.deepEqual(lerCarimbo(depois), { congelado: true, data: '2026-09-08' });
  // NENHUM `\n` SEM `\r` ANTES — é a definição de "não há EOL misto" neste arquivo.
  assert.ok(!/[^\r]\n/.test(depois) && !/^\n/.test(depois), `saiu com EOL misto: ${JSON.stringify(depois)}`);
  // E a linha em branco não dobrou: uma só entre o H1 e o carimbo, e uma só depois dele.
  assert.deepEqual(depois.split('\r\n').slice(0, 5), [
    '# HLD funcional', '', montarCarimbo('2026-09-08'), '', 'Texto do documento.',
  ]);
  // O corpo intacto, e o mesmo documento em LF continua saindo em LF: preserva, não normaliza.
  assert.ok(depois.includes('Texto do documento.'));
  assert.ok(!/\r/.test(inserirCarimbo('# T\n\nx\n', '2026-09-08')), 'documento LF ganhou `\\r`');
});

test('inserirCarimbo preserva o corpo inteiro', () => {
  const corpo = '# T\n\n## §1\n\n- RF-007\n\n```\ncodigo\n```\n';
  const depois = inserirCarimbo(corpo, '2026-09-08');
  for (const pedaco of ['## §1', '- RF-007', '```\ncodigo\n```']) {
    assert.ok(depois.includes(pedaco), `perdeu ${pedaco}`);
  }
});

// ————————————————————————— congelar: a ordem e a invariante —————————————————————————

/**
 * Um `io` de memória com a mesma forma do IO_REAL do promocao.mjs.
 *
 * `ops` REGISTRA A SEQUÊNCIA de leituras e escritas por caminho, e não só as escritas: é o que
 * permite perguntar "este documento foi lido DEPOIS de ter sido escrito?", que é a invariante.
 * `barras` normaliza o separador porque `join` produz `\` no Windows e o fixture é escrito com `/`.
 */
function ioFalso(arquivos) {
  const disco = new Map(Object.entries(arquivos));
  const escritas = [];
  const ops = [];
  return {
    disco,
    escritas,
    ops,
    cwd: () => '/proj',
    lerArquivo: (c) => {
      const k = barras(c);
      ops.push({ op: 'ler', caminho: k });
      if (!disco.has(k)) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; }
      return disco.get(k);
    },
    escrever: (c, t) => {
      const k = barras(c);
      ops.push({ op: 'escrever', caminho: k });
      escritas.push(k);
      disco.set(k, t);
    },
    criarDiretorio: () => {},
    existe: (c) => disco.has(barras(c)),
  };
}

const CINCO = ['hld-funcional.md', 'especificacao-funcional.md', 'especificacao-tecnica.md', 'modelo-de-dados.md', 'gaps.md'];
const noExplore = (n) => `/proj/outputs/explore/${n}`;
const MARCADOR = '/proj/outputs/spec/_explore-congelado.md';

function discoCompleto() {
  const a = {};
  for (const n of CINCO) a[noExplore(n)] = `# ${n}\n\ncorpo\n`;
  return a;
}

test('congelar carimba os cinco e cria o marcador, NESTA ordem', () => {
  const io = ioFalso(discoCompleto());
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'congelado');
  assert.deepEqual(r.carimbados.sort(), [...CINCO].sort());
  // A ORDEM É A ASSERÇÃO. O marcador é a ÚLTIMA escrita; se ele vier antes de qualquer carimbo,
  // a trava liga com documento sem carimbo e nem carimbar passa mais.
  assert.equal(io.escritas[io.escritas.length - 1], MARCADOR);
  assert.equal(io.escritas.filter((c) => c === MARCADOR).length, 1);
  // E o marcador nomeia os cinco: quem o abre depois precisa saber o que foi conferido.
  for (const n of CINCO) assert.ok(io.disco.get(MARCADOR).includes(n), `o marcador não nomeia ${n}`);
});

test('congelar RECUSA marcar quando um documento ficou sem carimbo — a invariante', () => {
  const io = ioFalso(discoCompleto());
  // Simula o modo de falha real: um documento cuja escrita não pega. Nada mais realista que
  // permissão negada num arquivo aberto noutro editor.
  const original = io.escrever;
  io.escrever = (c, t) => { if (barras(c) === noExplore('gaps.md')) return; original(c, t); };

  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'recusado');
  assert.deepEqual(r.semCarimbo, ['gaps.md']);
  assert.equal(r.marcador, null);
  assert.ok(!io.escritas.includes(MARCADOR), 'criou o marcador com documento sem carimbo');
});

test('a invariante é conferida LENDO O DISCO, não confiando na própria escrita', () => {
  // ESTE TESTE É O QUE SEPARA "conferiu" de "achou que conferiu". Um `congelar` que marcasse
  // `carimbados` a partir do retorno de `escrever` passaria no teste acima enquanto `escrever` não
  // lançasse — e é justamente esse o caso em que a escrita silenciosamente não pega.
  //
  // A MEDIDA É POR DOCUMENTO, e não uma contagem global de "leituras depois da primeira escrita".
  // A contagem global media a coisa errada: a etapa de carimbar já lê o documento 2 DEPOIS de
  // escrever o documento 1, então quatro dos cinco documentos entravam na conta sem nenhuma
  // releitura ter acontecido, e a asserção sobrevivia por um. O que a invariante exige é que CADA
  // documento escrito seja lido OUTRA VEZ depois da sua própria escrita.
  const io = ioFalso(discoCompleto());
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'congelado');
  for (const nome of CINCO) {
    const seq = io.ops.filter((o) => o.caminho === noExplore(nome)).map((o) => o.op);
    const iEscrita = seq.indexOf('escrever');
    assert.notEqual(iEscrita, -1, `${nome} não foi escrito`);
    assert.ok(
      seq.slice(iEscrita + 1).includes('ler'),
      `congelar não releu ${nome} depois de carimbar — a conferência é sobre o disco, e não sobre o retorno de escrever`,
    );
  }
});

test('congelar é idempotente: rodar de novo não recarimba nem reescreve o marcador', () => {
  const io = ioFalso(discoCompleto());
  congelar('/proj', io, '2026-09-08');
  const antes = [...io.escritas];
  const r = congelar('/proj', io, '2026-09-09');
  assert.equal(r.acao, 'ja-congelado');
  assert.deepEqual(io.escritas, antes, 'a segunda execução escreveu algo');
});

test('congelar NÃO recarimba documento que já tinha carimbo, e ele conta como carimbado', () => {
  // O caso parcial: alguém carimbou um documento à mão, ou uma execução anterior recusou depois de
  // carimbar quatro dos cinco. A segunda execução tem que fechar o que falta e contar o que já
  // estava — a data do primeiro carimbo é a que vale, e reescrever o documento por nada é ruído no
  // diff de um arquivo que virou histórico.
  const a = discoCompleto();
  a[noExplore('gaps.md')] = inserirCarimbo(a[noExplore('gaps.md')], '2026-08-25');
  const io = ioFalso(a);
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'congelado');
  assert.deepEqual(r.jaCarimbados, ['gaps.md']);
  assert.ok(!io.escritas.includes(noExplore('gaps.md')), 'recarimbou documento que já tinha carimbo');
  assert.deepEqual(r.carimbados.sort(), [...CINCO].sort(), 'o já carimbado tem que contar como carimbado');
  assert.equal(lerCarimbo(io.disco.get(noExplore('gaps.md'))).data, '2026-08-25');
});

test('documento ausente não impede o congelamento, e sai nomeado', () => {
  // O `modelo-de-dados.md` é OPCIONAL (`DOCS_EXPLORE`), e sua ausência já é tratada pelo gate com
  // dispensa no gaps.md. Recusar congelar por causa dele travaria o marco do Plan de todo projeto
  // que legitimamente não tem modelo de dados.
  const a = discoCompleto();
  delete a[noExplore('modelo-de-dados.md')];
  const io = ioFalso(a);
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'congelado');
  assert.deepEqual(r.ausentes, ['modelo-de-dados.md']);
  assert.ok(!r.carimbados.includes('modelo-de-dados.md'));
  assert.ok(io.escritas.includes(MARCADOR));
});

/** Os obrigatórios vêm do kit, e não de uma lista escrita aqui — mesma razão do código. */
const OBRIGATORIOS = DOCS_EXPLORE.filter((d) => d.obrigatorio).map((d) => d.caminho);

test('sem NENHUM documento obrigatório, congelar RECUSA e não cria o marcador', () => {
  // O CASO DO DISCO VAZIO, e é o pior que este comando tinha. Rodado numa `cwd` sem
  // `outputs/explore/` — que num executável de mão é o erro normal —, ele carimbava zero
  // documentos, criava o marcador, e escrevia nele "releu os documentos abaixo e conferiu que todos
  // receberam o carimbo" seguido de `- (nenhum)`: atestado sobre conjunto vazio. E o efeito era
  // pior que a prosa: a trava ligava e passava a NEGAR escrita sob `outputs/explore/` de um projeto
  // que ainda não escreveu nada lá, com a saída sendo remover o marcador à mão.
  const io = ioFalso({});
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'recusado');
  assert.equal(r.motivo, 'explore-ausente');
  assert.equal(r.marcador, null);
  assert.deepEqual(io.escritas, [], 'a recusa por Explore ausente não pode escrever nada');
  assert.deepEqual(r.ausentes.sort(), [...CINCO].sort());
});

test('o corte é "todos os OBRIGATÓRIOS ausentes": um Explore que só tem o opcional não é Explore', () => {
  // `modelo-de-dados.md` é o único opcional no `DOCS_EXPLORE`. Um diretório que só tem ele não é um
  // Explore escrito — e o teste vizinho ("documento ausente não impede") prende a outra metade da
  // decisão: a ausência DELE, com os obrigatórios presentes, continua não impedindo nada.
  const io = ioFalso({ [noExplore('modelo-de-dados.md')]: '# modelo\n\ncorpo\n' });
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.motivo, 'explore-ausente');
  assert.deepEqual(io.escritas, [], 'carimbou o opcional de um projeto sem Explore');
  // E UM SÓ OBRIGATÓRIO PRESENTE JÁ TIRA DA RECUSA: o corte é "todos", não "algum".
  const comUm = ioFalso({ [noExplore(OBRIGATORIOS[0])]: `# ${OBRIGATORIOS[0]}\n\ncorpo\n` });
  const r2 = congelar('/proj', comUm, '2026-09-08');
  assert.equal(r2.acao, 'congelado', 'um obrigatório presente é Explore encontrado');
  assert.deepEqual(r2.carimbados, [OBRIGATORIOS[0]]);
});

test('as DUAS recusas são distinguíveis: "não achei o Explore" não é "a escrita não pegou"', () => {
  // São causas diferentes com ações diferentes. Quem recebe a mensagem errada procura permissão num
  // arquivo que não existe, ou procura o diretório certo num arquivo aberto no editor.
  const ausente = formatarCongelamento(congelar('/proj', ioFalso({}), '2026-09-08'));
  assert.match(ausente, /RECUSADO/);
  assert.match(ausente, /não achei o Explore/i);
  assert.match(ausente, /Procurei exatamente aqui: /, 'a mensagem tem que NOMEAR o caminho procurado');
  // As duas causas prováveis, separadas — é o que o modo relatório faz com o "li N de 5".
  assert.match(ausente, /DIRETÓRIO/);
  assert.match(ausente, /FASE/);
  assert.match(ausente, /idempotente/);
  // E ela NÃO manda conferir permissão nem arquivo aberto no editor, que é o outro conserto.
  assert.doesNotMatch(ausente, /permissão/i, 'a recusa por Explore ausente não é falha de escrita');

  const io = ioFalso(discoCompleto());
  const original = io.escrever;
  io.escrever = (c, t) => { if (barras(c) === noExplore('gaps.md')) return; original(c, t); };
  const semCarimbo = formatarCongelamento(congelar('/proj', io, '2026-09-08'));
  assert.match(semCarimbo, /não têm carimbo depois da tentativa de escrita/);
  assert.match(semCarimbo, /permissão/i);
  assert.doesNotMatch(semCarimbo, /não achei o Explore/i);
});

test('`ja-congelado` CONFERE a invariante e relata documento sem carimbo', () => {
  // A INVARIANTE ERA CONFERIDA SÓ NO ATO DA CRIAÇÃO. Um marcador criado à mão — o que a rule do
  // Plan passou a proibir — recebia "Já congelado, nada a fazer" para sempre, e o único
  // verificador da invariante que este repositório tem nunca o examinava.
  const a = discoCompleto();
  a[MARCADOR] = '# Explore congelado\n';
  for (const n of CINCO) if (n !== 'gaps.md') a[noExplore(n)] = inserirCarimbo(a[noExplore(n)], '2026-08-25');
  const io = ioFalso(a);

  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'ja-congelado');
  assert.deepEqual(r.semCarimbo, ['gaps.md']);
  assert.deepEqual(r.carimbados, CINCO.filter((n) => n !== 'gaps.md').sort());
  // NÃO RECUSA E NÃO RECARIMBA: o marcador já existe e a trava já está ligada — carimbar agora
  // seria escrever no Explore congelado. O valor deste caminho é DIZER A VERDADE.
  assert.deepEqual(io.escritas, [], 'o caminho `ja-congelado` escreveu algo');
  assert.equal(barras(r.marcador), MARCADOR, 'o marcador que existe continua nomeado no retorno');

  const t = formatarCongelamento(r);
  assert.match(t, /Já congelado/);
  assert.match(t, /INVARIANTE ESTÁ QUEBRADA/);
  assert.match(t, /outputs\/explore\/gaps\.md/);
  assert.match(t, /à mão/i, 'a causa comum tem que ser nomeada');
  assert.match(t, /remover/i, 'a sequência que acerta tem que estar dita');
  assert.doesNotMatch(t, /Nada a fazer/, 'há o que fazer, e a mensagem não pode dizer o contrário');
});

test('`ja-congelado` com os cinco carimbados continua sendo "nada a fazer"', () => {
  // A outra metade: conferir a invariante não pode transformar o caminho sadio em alarme.
  const a = discoCompleto();
  a[MARCADOR] = '# Explore congelado\n';
  for (const n of CINCO) a[noExplore(n)] = inserirCarimbo(a[noExplore(n)], '2026-08-25');
  const r = congelar('/proj', ioFalso(a), '2026-09-08');
  assert.equal(r.acao, 'ja-congelado');
  assert.deepEqual(r.semCarimbo, []);
  assert.match(formatarCongelamento(r), /Nada a fazer/);
});

test('`ja-congelado` NÃO RELANÇA documento ilegível — relata numa terceira lista, e sai com 0', () => {
  // A REGRESSÃO: o conserto anterior fez `ja-congelado` chamar `conferirCarimbos`, que relança tudo
  // que não é ausência. Um `EBUSY`/`EPERM` do sync do OneDrive num dos cinco — o setup real deste
  // usuário, não caso exótico — virava stack trace de Node e saída não-zero bem na reexecução
  // idempotente que a própria mensagem de recusa manda o consultor fazer. E o relançamento aqui não
  // protege invariante nenhuma: não há escrita neste caminho, e o marcador já existe.
  const a = discoCompleto();
  a[MARCADOR] = '# Explore congelado\n';
  for (const n of CINCO) if (n !== 'gaps.md') a[noExplore(n)] = inserirCarimbo(a[noExplore(n)], '2026-08-25');
  const io = ioFalso(a);
  const original = io.lerArquivo;
  io.lerArquivo = (c) => {
    if (barras(c) === noExplore('gaps.md')) { const e = new Error('EBUSY: resource busy or locked'); e.code = 'EBUSY'; throw e; }
    return original(c);
  };

  let r;
  assert.doesNotThrow(() => { r = congelar('/proj', io, '2026-09-08'); }, 'ja-congelado relançou em vez de relatar');
  assert.equal(r.acao, 'ja-congelado');
  assert.deepEqual(r.semCarimbo, [], 'gaps.md não foi lido, então não pode entrar em semCarimbo');
  assert.deepEqual(r.ilegiveis.map((f) => f.documento), ['gaps.md']);
  assert.match(r.ilegiveis[0].erro, /EBUSY/);
  assert.deepEqual(io.escritas, [], 'ja-congelado escreveu algo');

  const t = formatarCongelamento(r);
  assert.match(t, /Já congelado/);
  assert.match(t, /outputs\/explore\/gaps\.md/);
  assert.match(t, /EBUSY/);
  assert.doesNotMatch(t, /Nada a fazer/, 'há um documento ilegível para relatar');
  assert.doesNotMatch(t, /INVARIANTE ESTÁ QUEBRADA/, 'ilegível não é o mesmo que sem carimbo');
});

test('`ja-congelado` RELATA documento OBRIGATÓRIO apagado do disco depois do congelamento', () => {
  // `mensagemDeJaCongelado` nunca olhava `ausentes`: um Explore congelado e depois esvaziado —
  // `hld-funcional.md` apagado do disco — imprimia "Nada a fazer.", e o `ausentes` morria no
  // `--json`. O comando cujo propósito é dizer a verdade dizia que não havia nada a dizer.
  const a = discoCompleto();
  a[MARCADOR] = '# Explore congelado\n';
  for (const n of CINCO) a[noExplore(n)] = inserirCarimbo(a[noExplore(n)], '2026-08-25');
  delete a[noExplore('hld-funcional.md')];
  const r = congelar('/proj', ioFalso(a), '2026-09-08');

  assert.equal(r.acao, 'ja-congelado');
  assert.deepEqual(r.semCarimbo, []);
  assert.deepEqual(r.ausentes, ['hld-funcional.md']);

  const t = formatarCongelamento(r);
  assert.doesNotMatch(t, /Nada a fazer/, 'um documento obrigatório sumiu; não é "nada a fazer"');
  assert.match(t, /outputs\/explore\/hld-funcional\.md/);
  assert.match(t, /OBRIGATÓRIO/, 'hld-funcional.md não é o modelo-de-dados opcional');
});

test('congelar RELANÇA ilegibilidade: presente e ilegível não é ausente', () => {
  // Mesma fronteira do `lerOuVazio` e do `estaCongelado`. Congelar em cima de um documento que não
  // se conseguiu LER produziria marcador com invariante não verificada — e o EBUSY/EPERM do sync
  // do OneDrive é o setup real deste usuário, não caso exótico.
  const io = ioFalso(discoCompleto());
  const original = io.lerArquivo;
  io.lerArquivo = (c) => {
    if (barras(c) === noExplore('gaps.md')) { const e = new Error('EBUSY'); e.code = 'EBUSY'; throw e; }
    return original(c);
  };
  assert.throws(() => congelar('/proj', io, '2026-09-08'), /EBUSY/);
  assert.ok(!io.escritas.includes(MARCADOR), 'criou o marcador sem ter conseguido ler tudo');
});

test('escrita que LANÇA cai na recusa, e não num stack trace de Node', () => {
  // O MODO DE FALHA QUE A MENSAGEM DE RECUSA NOMEIA. "permissão, arquivo aberto em outro editor"
  // não é escrita silenciosa no `node:fs` real: `writeFileSync` LANÇA EPERM/EACCES. Enquanto o erro
  // subia, o consultor recebia um stack trace e saída não-zero exatamente no caso para o qual a
  // recusa foi escrita — a recusa era inalcançável na prática. O `catch` não decide nada: quem
  // responde continua sendo a releitura do disco.
  const io = ioFalso(discoCompleto());
  const original = io.escrever;
  io.escrever = (c, t) => {
    if (barras(c) === noExplore('gaps.md')) {
      const e = new Error("EPERM: operation not permitted, open 'gaps.md'");
      e.code = 'EPERM';
      throw e;
    }
    original(c, t);
  };

  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(r.acao, 'recusado');
  assert.deepEqual(r.semCarimbo, ['gaps.md']);
  assert.equal(r.marcador, null);
  assert.ok(!io.escritas.includes(MARCADOR), 'criou o marcador com documento sem carimbo');
  assert.deepEqual(r.falhasDeEscrita.map((f) => f.documento), ['gaps.md']);
  assert.match(r.falhasDeEscrita[0].erro, /EPERM/);
  // E a mensagem NOMEIA o erro: sem isso o consultor lê "não tem carimbo" e não sabe o que corrigir.
  const t = formatarCongelamento(r);
  assert.match(t, /A escrita falhou com:/);
  assert.match(t, /EPERM/);
});

test('congelar monta o caminho do marcador a partir do kit, e não de uma cópia literal', () => {
  const io = ioFalso(discoCompleto());
  const r = congelar('/proj', io, '2026-09-08');
  assert.equal(barras(r.marcador), '/proj/' + MARCADOR_CONGELAMENTO);
});

// ————————————————————————— a mensagem do congelamento —————————————————————————

test('formatarCongelamento diz o que aconteceu em cada uma das três ações', () => {
  const feito = formatarCongelamento({
    acao: 'congelado', carimbados: ['gaps.md'], jaCarimbados: [], semCarimbo: [],
    ausentes: ['modelo-de-dados.md'], marcador: 'x',
  });
  assert.match(feito, /EXPLORE CONGELADO/);
  assert.match(feito, /outputs\/explore\/gaps\.md/);
  assert.match(feito, /Não achei estes, e a ausência não impede o congelamento/);
  assert.match(feito, /outputs\/explore\/modelo-de-dados\.md/);
  assert.ok(feito.includes(MARCADOR_CONGELAMENTO), 'a mensagem tem que nomear o marcador criado');

  const recusado = formatarCongelamento({
    acao: 'recusado', carimbados: [], jaCarimbados: [], semCarimbo: ['gaps.md'],
    ausentes: [], marcador: null,
  });
  // A MENSAGEM DE RECUSA TEM QUE BASTAR: o comando sai com 0, então quem a lê é o único a decidir.
  assert.match(recusado, /RECUSADO/);
  assert.match(recusado, /NÃO foi criado/);
  assert.match(recusado, /outputs\/explore\/gaps\.md/);
  assert.match(recusado, /idempotente/, 'quem recebe a recusa precisa saber que pode rodar de novo');

  const ja = formatarCongelamento({
    acao: 'ja-congelado', carimbados: [], jaCarimbados: [], semCarimbo: [], ausentes: [], marcador: 'x',
  });
  assert.match(ja, /Já congelado/);
  assert.ok(ja.includes(MARCADOR_CONGELAMENTO));
});

test('a mensagem NÃO chama de "aceita" a ausência de documento OBRIGATÓRIO', () => {
  // Só o `modelo-de-dados.md` é opcional no `DOCS_EXPLORE`. Uma linha única dizendo "ausentes, e
  // isto é aceito" sobre `hld-funcional.md` seria o relatório atestando o que não mediu — com o
  // marcador JÁ criado. E o caso não é exótico: `cwd` errada produz exatamente isso, que é a mesma
  // causa que o modo relatório separa com o "0 de 5".
  const soOpcional = formatarCongelamento({
    acao: 'congelado', carimbados: ['gaps.md'], jaCarimbados: [], semCarimbo: [],
    ausentes: ['modelo-de-dados.md'], falhasDeEscrita: [], marcador: 'x',
  });
  assert.match(soOpcional, /modelo-de-dados\.md — opcional/);
  assert.doesNotMatch(soOpcional, /OBRIGATÓRIOS/, 'não havia obrigatório ausente para avisar');

  const comObrigatorio = formatarCongelamento({
    acao: 'congelado', carimbados: ['gaps.md'], jaCarimbados: [], semCarimbo: [],
    ausentes: ['hld-funcional.md', 'modelo-de-dados.md'], falhasDeEscrita: [], marcador: 'x',
  });
  assert.match(comObrigatorio, /OBRIGATÓRIOS/);
  assert.match(comObrigatorio, /DIRETÓRIO/, 'a mensagem tem que nomear a causa comum');
  assert.match(comObrigatorio, /Remova o marcador e rode de novo/);
  // E o obrigatório NÃO ganha a nota de opcional.
  assert.doesNotMatch(comObrigatorio, /hld-funcional\.md — opcional/);
});

test('a mensagem de SUCESSO nomeia a falha de escrita, e diz que o documento pode estar TRUNCADO', () => {
  // O CASO REAL: escrita que lança DEPOIS de ter gravado o topo — `ENOSPC`, `EIO` — deixa o
  // carimbo, que é a primeira linha, e perde o corpo. A releitura acha o carimbo, `acao=congelado`,
  // marcador criado, e o consultor lia `EXPLORE CONGELADO.` e nada mais sobre um documento
  // truncado. A invariante continua verdadeira; o que quebrava era a promessa de que o comando
  // reporta o que mediu — e o branch de recusa já nomeava `falhasDeEscrita` por escrito.
  const io = ioFalso(discoCompleto());
  const original = io.escrever;
  io.escrever = (c, t) => {
    if (barras(c) === noExplore('gaps.md')) {
      // Grava o TOPO e lança: é a forma do `ENOSPC` no meio da escrita.
      original(c, inserirCarimbo(io.disco.get(barras(c)), '2026-09-08').split('\n').slice(0, 3).join('\n') + '\n');
      const e = new Error('ENOSPC: no space left on device, write');
      e.code = 'ENOSPC';
      throw e;
    }
    original(c, t);
  };

  const r = congelar('/proj', io, '2026-09-08');
  // O congelamento ACONTECEU — o carimbo está lá, e a invariante é sobre o carimbo.
  assert.equal(r.acao, 'congelado');
  assert.ok(io.escritas.includes(MARCADOR));
  assert.deepEqual(r.falhasDeEscrita.map((f) => f.documento), ['gaps.md']);

  const t = formatarCongelamento(r);
  assert.match(t, /EXPLORE CONGELADO/);
  assert.match(t, /TRUNCAD/, 'a mensagem de sucesso tem que dizer que o corpo pode ter se perdido');
  assert.match(t, /outputs\/explore\/gaps\.md — ENOSPC/);
  assert.match(t, /git diff/, 'e tem que dizer O QUE FAZER');
  assert.ok(t.includes(MARCADOR_CONGELAMENTO), 'a saída passa por remover o marcador antes de reescrever');
});

test('a mensagem de sucesso distingue quem foi carimbado AGORA de quem já tinha carimbo', () => {
  // A SEGUNDA EXECUÇÃO DE UM CONGELAMENTO PARCIAL: `jaCarimbados` existia no retorno e chegava só
  // ao `--json`. O consultor lia uma lista `Carimbados:` sem saber quais documentos ele mesmo
  // acabara de carimbar e quais já traziam data anterior — que é a leitura de que ele precisa para
  // conferir o histórico do documento.
  const t = formatarCongelamento({
    acao: 'congelado', motivo: null,
    carimbados: ['gaps.md', 'hld-funcional.md'], jaCarimbados: ['gaps.md'], semCarimbo: [],
    ausentes: [], falhasDeEscrita: [], marcador: 'x',
  });
  assert.match(t, /outputs\/explore\/gaps\.md — já tinha carimbo/);
  assert.match(t, /outputs\/explore\/hld-funcional\.md$/m, 'o carimbado agora sai sem a nota');
  // E o mesmo documento NÃO sai duas vezes: `carimbados` já contém `jaCarimbados`.
  assert.equal(t.split('\n').filter((n) => n.includes('gaps.md')).length, 1);
});

// ————————————————————————— a data do carimbo é HORA LOCAL —————————————————————————

test('hojeISO formata a data LOCAL — 21h em Brasília não grava a data de amanhã', () => {
  // `toISOString` converte para UTC antes de cortar, e o carimbo é PROSA PARA HUMANO num documento
  // que o cliente lê: às 21h em Brasília o carimbo dizia o dia seguinte. Nenhum consumidor compara
  // esta data — `lerCarimbo` só a captura —, então a troca não tem efeito de máquina nenhum.
  assert.equal(hojeISO(new Date(2026, 8, 8, 21, 30)), '2026-09-08');
  assert.equal(hojeISO(new Date(2026, 0, 3, 0, 5)), '2026-01-03', 'mês e dia com zero à esquerda');
});

test('hojeISO é travado numa fonte sem `toISOString` — a asserção que separa as duas fórmulas em QUALQUER fuso', () => {
  // A ASSERÇÃO ANTERIOR AQUI ERA "para cada hora do dia, hojeISO(d) bate com o dia local calculado
  // à mão a partir do mesmo `Date`" — e o comentário dizia que NENHUM teste podia separar essa
  // fórmula de `toISOString().slice(0, 10)`. Isso era FALSO: numa máquina em UTC (offset zero — o
  // caso de `TZ=UTC`, que é como muito CI roda) as duas fórmulas coincidem para TODA hora do dia,
  // porque não há conversão de fuso a fazer. Restaurar `toISOString().slice(0, 10)` em `hojeISO`
  // fazia as três asserções daquele teste passarem sob `TZ=UTC` — a Decisão 2 podia reverter em
  // silêncio, e a suíte continuava toda verde.
  //
  // O QUE SEPARA AS DUAS FÓRMULAS, INDEPENDENTE DE FUSO: uma fonte que TEM os três getters locais
  // que `hojeISO` usa e NÃO TEM `toISOString`. A implementação local só chama `getFullYear`,
  // `getMonth` e `getDate` — devolve a data normalmente. A implementação por `toISOString` chama um
  // método que este objeto não tem — lança `TypeError`, em qualquer fuso, porque a asserção não
  // compara datas: ela testa QUAIS MÉTODOS são chamados.
  const fonteSemToISOString = { getFullYear: () => 2026, getMonth: () => 8, getDate: () => 8 };
  assert.equal(hojeISO(fonteSemToISOString), '2026-09-08');
});

// ————————————————————— a casca de verdade, num diretório de verdade —————————————————————

const rodarNa = (raiz, args) => execFileSync(
  process.execPath, [join(ESTE_DIR, 'promocao.mjs'), ...args],
  { cwd: raiz, encoding: 'utf8' },
);

test('--congelar escreve nos caminhos reais e sai com 0, e a segunda execução não mexe em nada', () => {
  // A CASCA TEM QUE SER EXERCITADA COM `node:fs` DE VERDADE. Todo o resto desta seção roda contra
  // um `io` de memória, e um `io` de memória não pode errar a composição do caminho: `join` com o
  // subdiretório trocado, ou o `mkdirSync` que falta, só aparecem aqui. É o mesmo motivo do teste
  // dos sete caminhos do `coletar`.
  const raiz = mkdtempSync(join(tmpdir(), 'promocao-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  for (const n of CINCO) writeFileSync(join(raiz, 'outputs', 'explore', n), `# ${n}\n\ncorpo\n`, 'utf8');

  const saida = rodarNa(raiz, ['--congelar']);
  assert.match(saida, /EXPLORE CONGELADO/);
  // Os cinco documentos, carimbados no disco de verdade — e o marcador, no caminho do kit.
  for (const n of CINCO) {
    const texto = readFileSync(join(raiz, 'outputs', 'explore', n), 'utf8');
    assert.equal(lerCarimbo(texto).congelado, true, `${n} ficou sem carimbo`);
  }
  assert.ok(existsSync(join(raiz, MARCADOR_CONGELAMENTO)), 'o marcador não foi criado onde o kit diz');

  // Idempotência ponta a ponta: nada muda na segunda execução.
  const antes = CINCO.map((n) => readFileSync(join(raiz, 'outputs', 'explore', n), 'utf8'));
  const marcadorAntes = readFileSync(join(raiz, MARCADOR_CONGELAMENTO), 'utf8');
  assert.match(rodarNa(raiz, ['--congelar']), /Já congelado/);
  assert.deepEqual(CINCO.map((n) => readFileSync(join(raiz, 'outputs', 'explore', n), 'utf8')), antes);
  assert.equal(readFileSync(join(raiz, MARCADOR_CONGELAMENTO), 'utf8'), marcadorAntes);
});

test('--congelar --json entrega o `acao` que a mensagem promete para quem trata programaticamente', () => {
  // O comentário do `main` diz "quem quiser tratar programaticamente lê o `acao` do `--json`". Sem
  // este modo, essa frase seria promessa que o código não cumpre — a família de defeito que este
  // projeto vem caçando. Aqui ela vale.
  // O FIXTURE TEM OS QUATRO OBRIGATÓRIOS de propósito. Ele tinha só o `gaps.md`, e afirmava
  // `acao: 'congelado'` com quatro obrigatórios ausentes — que é exatamente o caso que agora RECUSA.
  // Consertar a expectativa em vez do fixture cimentaria o comportamento antigo: o que este teste
  // existe para medir é o `--json` entregar o `acao`, e para isso ele precisa de um projeto sadio.
  const raiz = mkdtempSync(join(tmpdir(), 'promocao-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  for (const n of OBRIGATORIOS) {
    writeFileSync(join(raiz, 'outputs', 'explore', n), `# ${n}\n\ncorpo\n`, 'utf8');
  }

  const r = JSON.parse(rodarNa(raiz, ['--congelar', '--json']));
  assert.equal(r.acao, 'congelado');
  assert.deepEqual(r.carimbados, [...OBRIGATORIOS].sort());
  // O opcional que este projeto de teste não tem sai nomeado, e não impede nada.
  assert.deepEqual(r.ausentes, ['modelo-de-dados.md']);
  assert.equal(barras(r.marcador).endsWith(MARCADOR_CONGELAMENTO), true);
});

test('--congelar num diretório SEM Explore recusa, sai com 0, e não deixa marcador no disco', () => {
  // A DECISÃO 1 PONTA A PONTA, com `node:fs` de verdade: é o caso do consultor que rodou na `cwd`
  // errada, ou antes de a fase chegar. O `io` de memória não pode provar que nenhum arquivo nasceu.
  const raiz = mkdtempSync(join(tmpdir(), 'promocao-'));
  const saida = rodarNa(raiz, ['--congelar']);
  assert.match(saida, /RECUSADO/);
  assert.match(saida, /não achei o Explore/i);
  assert.equal(existsSync(join(raiz, MARCADOR_CONGELAMENTO)), false, 'trancou um Explore que não existe');
  const r = JSON.parse(rodarNa(raiz, ['--congelar', '--json']));
  assert.equal(r.acao, 'recusado');
  assert.equal(r.motivo, 'explore-ausente');
  assert.equal(r.marcador, null);
});

test('o modo relatório continua NÃO escrevendo arquivo nenhum', () => {
  // A Decisão 20 na outra ponta: a ferramenta ganhou escrita, e é fácil ela vazar para o modo que
  // só relata. Rodar sem `--congelar` num projeto cru não pode criar nem carimbo nem marcador.
  const raiz = mkdtempSync(join(tmpdir(), 'promocao-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), '# GAPs\n\nRF-007 pendente.\n', 'utf8');

  rodarNa(raiz, []);
  assert.equal(readFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), 'utf8'), '# GAPs\n\nRF-007 pendente.\n');
  assert.equal(existsSync(join(raiz, MARCADOR_CONGELAMENTO)), false, 'o modo relatório criou o marcador');
});

// ————————————————————————————— Item 10 (Plano 5): casamento template↔ferramenta —————————————————————————————

test('item 10 (Plano 5): o promocao.mjs acha a coluna Âncora com o cabeçalho que o template usa — e NÃO acha sem ela', () => {
  // O cabeçalho vem do TEMPLATE vendorizado, não de uma string daqui: é o casamento entre os dois
  // que se prende. Se alguém renomear a coluna no template sem olhar esta ferramenta, este teste diz.
  const template = readFileSync(join(RAIZ, '.claude', 'skills', 'spec-ingest', 'templates', 'context-map.md'), 'utf8');
  const cabecalho = (template.match(/\| (Âncora[^|]*) \|/) || [])[1];
  assert.ok(cabecalho, 'o template não tem mais uma coluna Âncora');
  assert.doesNotMatch(cabecalho, /linha/, 'o cabeçalho voltou a oferecer âncora por linha (item 10 da §8)');
  const com = ['| ID | Fato | ' + cabecalho + ' | Domínio | Conf. |', '|---|---|---|---|---|', '| F-001 | x | §2 RF-001 | y | alta |'].join('\n');
  assert.deepEqual(lerFatos(com), [{ id: 'F-001', ancora: '§2 RF-001' }]);
  const sem = com.replace(cabecalho, 'Origem');
  assert.deepEqual(lerFatos(sem), [], 'sem a palavra Âncora a coluna não é reconhecida');
});

// ————————————————————— D12 do teste ponta a ponta (2.6.0): âncora por SEÇÃO sem ID —————————————————————
//
// O Explore só tem quatro famílias de ID (MOD, RF, RN, GAP). Personas (§1), a tabela de telas (§2)
// e a especificação técnica inteira não têm ID nenhum, e a convenção `<arquivo> §<seção> <ID>`
// acusava «ÂNCORA NÃO RASTREÁVEL» sobre elas — a única correção era pendurar um RF/RN qualquer na
// âncora, que é rastreio inventado. A âncora `<arquivo> §<seção>` passa a valer quando a seção
// EXISTE no documento e NÃO TEM ID — e só então.

const ESPEC_FUNCIONAL = [
  '# Especificação Funcional — Portal de Pedidos',
  '',
  '## 1. Personas e perfis de acesso',
  '',
  '### 1.1 Personas',
  '| Persona | Perfil | Papel no processo |',
  '|---|---|---|',
  '| Vendedor | Vendedor | Monta e envia o pedido. |',
  '| Financeiro | Sem acesso | Confere o pagamento fora do sistema (GAP-003). |',
  '',
  '### 1.2 Matriz de acesso',
  '| Ação | Vendedor |',
  '|---|:---:|',
  '| Enviar pedido | ✅ |',
  '',
  '## 2. Navegação e telas',
  '',
  '| Tela | Rota | Conteúdo |',
  '|---|---|---|',
  '| Pedidos | /pedidos | (RF-006) Lista de pedidos. |',
  '',
  '## 3. Funcionalidades e regras de negócio, por módulo',
  '',
  '### MOD-PEDIDOS — Pedidos',
  '',
  '| ID | Funcionalidade | Descrição |',
  '|---|---|---|',
  '| RF-006 | Listar pedidos | lista com filtro |',
  '',
  '```markdown',
  '## 9. Seção dentro de cerca de código não é seção',
  '```',
].join('\n');

const ESPEC_TECNICA = [
  '# Especificação Técnica — Portal de Pedidos',
  '',
  '## 1. Visão em camadas',
  '',
  'Front em Next.js, API em Node.',
  '',
  '## 4. Premissas técnicas',
  '',
  'PostgreSQL 16 (premissa do GAP-007).',
].join('\n');

const DOCS_D12 = new Map([
  ['especificacao-funcional.md', ESPEC_FUNCIONAL],
  ['especificacao-tecnica.md', ESPEC_TECNICA],
]);

test('D12 — `<arquivo> §<seção>` sem ID é rastreável quando a seção existe e não tem ID', () => {
  // Por número de seção (o que a `spec-ingest` escreve) e por título, com caixa e acento livres.
  assert.equal(rastreavel('especificacao-funcional.md §1.1 Vendedor', DOCS_D12), true);
  assert.equal(rastreavel('especificacao-funcional.md §1.2 Enviar pedido', DOCS_D12), true);
  assert.equal(rastreavel('especificacao-tecnica.md §4 PostgreSQL', DOCS_D12), true);
  assert.equal(rastreavel('especificacao-tecnica.md §Premissas tecnicas', DOCS_D12), true);
  // GAP mencionado NA seção não a torna seção de ID: GAP é pergunta, não entidade a promover.
  assert.equal(rastreavel('especificacao-funcional.md §1.1 Financeiro', DOCS_D12), true);
});

test('D12 — a seção que TEM ID continua exigindo o ID na âncora, e seção inexistente não vale', () => {
  // A §2 cita RF-006, a §3 define RF-006 e MOD-PEDIDOS, a §1 inclui a 1.1 e a 1.2 (sem ID): só a §1
  // passa. Sem esta metade, «seção existe» viraria salvo-conduto para a forma que a rule proíbe.
  assert.equal(rastreavel('especificacao-funcional.md §2 Telas', DOCS_D12), false);
  assert.equal(rastreavel('especificacao-funcional.md §3 Pedidos', DOCS_D12), false);
  assert.equal(rastreavel('especificacao-funcional.md §1 Personas', DOCS_D12), true);
  // Seção que não existe, seção que só existe dentro de cerca de código, âncora por linha, e
  // documento citado que não foi lido.
  assert.equal(rastreavel('especificacao-funcional.md §7 Relatórios', DOCS_D12), false);
  assert.equal(rastreavel('especificacao-funcional.md §9 Seção', DOCS_D12), false);
  assert.equal(rastreavel('especificacao-funcional.md linha 214', DOCS_D12), false);
  assert.equal(rastreavel('hld-funcional.md §1 Visão', DOCS_D12), false);
  // E sem os documentos a regra antiga continua de pé — quem chama sem eles não mediu.
  assert.equal(rastreavel('especificacao-funcional.md §1.1 Vendedor'), false);
});

test('D12 — relatorioDe: fato ancorado em seção sem ID não é «não rastreável» nem «sem consumidor»', () => {
  // As duas categorias erradas em que o fato caía. «Sem consumidor» também não: a promoção mede
  // RF/RN, e persona ou premissa técnica é consumida por artefato que este relatório não lê
  // (product-vision, hld, tech-rules). É a mesma razão do fato de transcrição — fora da medição.
  const contextMap = [
    '| ID | Fato | Âncora (§ + ID da fonte / minuto) | Domínio | Conf. |',
    '|---|---|---|---|---|',
    '| F-035 | O vendedor monta e envia o pedido. | especificacao-funcional.md §1.1 Vendedor | Acesso | alta |',
    '| F-041 | O banco é PostgreSQL 16. | especificacao-tecnica.md §4 Premissas técnicas | Infra | média |',
    '| F-030 | Lista de pedidos com filtro. | especificacao-funcional.md §3 MOD-PEDIDOS RF-006 | Pedidos | alta |',
  ].join('\n');
  const requisitos = [
    '| ID | Fato fonte (F-xxx) |', '|---|---|', '| RF-MOD-PEDIDOS-001 | F-030 |', '',
    '### RF-MOD-PEDIDOS-001: Listar pedidos', '**Rastreabilidade:** F-030', '',
  ].join('\n');
  const { io } = ioQueRegistra({
    'raiz/outputs/explore/especificacao-funcional.md': ESPEC_FUNCIONAL,
    'raiz/outputs/explore/especificacao-tecnica.md': ESPEC_TECNICA,
    'raiz/outputs/spec/context-map.md': contextMap,
    'raiz/outputs/spec/requirements/requirements.md': requisitos,
  });
  const r = relatorioDe('raiz', io);
  assert.deepEqual(r.ancorasNaoRastreaveis, []);
  assert.deepEqual(r.fatosSemConsumidor, []);
  assert.deepEqual(r.cobertos.map((c) => c.id), ['RF-006']);
  assert.equal(r.tudoFechado, true);
});

// ————————————————————— D14 do teste ponta a ponta (2.6.0): as regras novas consomem fato —————————————————————
//
// A promoção só lia `requirements/requirements.md`. As RN do Explore viram `RN-NOVO-<DOMÍNIO>-NNN`
// no `business-rules.md`, com o fato na linha **Origem** — e o relatório marcava RN-001 e RN-002
// como ÓRFÃS e F-031..F-034 como «fato sem consumidor» com o `business-rules.md` completo.

const REGRAS = [
  '# Regras de Negócio — Portal de Pedidos',
  '',
  '## Seção B — Regras do Novo Produto',
  '',
  '### Domínio: Desconto',
  '',
  '#### RN-NOVO-DESCONTO-001: Desconto por faixa',
  '',
  '| Campo | Conteúdo |',
  '|-------|----------|',
  '| **Módulo** | MOD-PEDIDOS |',
  '| **Origem** | F-031 (especificacao-funcional.md §3 MOD-PEDIDOS RN-001); prototype.md §/pedidos/novo |',
  '| **Justificativa** | Hoje o desconto muda de vendedor para vendedor (F-004). |',
  '',
  '### Domínio: Crédito',
  '',
  '#### RN-NOVO-CREDITO-001: Crédito disponível',
  '',
  '| Campo | Conteúdo |',
  '|-------|----------|',
  '| **Origem** | F-032 (especificacao-funcional.md §3 MOD-CLIENTES RN-002) |',
  '',
  '## Tabela de conflitos cruzados',
  '',
  '| RN A | RN B | Tema | Resolução |',
  '|---|---|---|---|',
  '| **Origem** | F-099 | uma linha fora de bloco de RN não é de ninguém | — |',
].join('\n');

test('D14 — relatorioDe lê o `business-rules.md`: a RN do Explore promovida a RN-NOVO-<DOMÍNIO> é coberta', () => {
  const contextMap = [
    '| ID | Fato | Âncora (§ + ID da fonte / minuto) | Domínio | Conf. |',
    '|---|---|---|---|---|',
    '| F-031 | Desconto por faixa. | especificacao-funcional.md §3 MOD-PEDIDOS RN-001 | Desconto | alta |',
    '| F-032 | Crédito disponível. | especificacao-funcional.md §3 MOD-CLIENTES RN-002 | Crédito | alta |',
  ].join('\n');
  const { io } = ioQueRegistra({
    'raiz/outputs/explore/especificacao-funcional.md': '| RN-001 | desconto | RF-003 |\n| RN-002 | crédito | RF-004 |\n',
    'raiz/outputs/spec/context-map.md': contextMap,
    'raiz/outputs/spec/requirements/requirements.md': '# Requisitos\n',
    'raiz/outputs/spec/business-rules.md': REGRAS,
  });
  const r = relatorioDe('raiz', io);
  assert.deepEqual(r.orfaos, ['RF-003', 'RF-004'], 'só os RF, que ninguém promoveu, ficam órfãos');
  assert.deepEqual(r.fatosSemConsumidor, []);
  assert.deepEqual(r.cobertos.map((c) => [c.id, c.requisitos]), [
    ['RN-001', ['RN-NOVO-DESCONTO-001']],
    ['RN-002', ['RN-NOVO-CREDITO-001']],
  ]);
});

test('D12/D14 — o texto do relatório ensina a âncora por seção e diz quando o `business-rules.md` não foi lido', () => {
  // O `requirements.md` lido e o `business-rules.md` ausente: o relatório não suprime nada (o
  // arquivo é complementar), mas DIZ que as RN-NOVO não contaram — órfão de RN pode ser efeito disso.
  const { io } = ioQueRegistra({
    'raiz/outputs/explore/especificacao-funcional.md': ESPEC_FUNCIONAL,
    'raiz/outputs/spec/context-map.md': [
      '| ID | Fato | Âncora | Domínio | Conf. |', '|---|---|---|---|---|',
      '| F-050 | Algo. | especificacao-funcional.md §2 Telas | x | alta |',
    ].join('\n'),
    'raiz/outputs/spec/requirements/requirements.md': '# Requisitos\n',
  });
  const r = relatorioDe('raiz', io);
  assert.equal(r.regrasLidas, false);
  const t = formatarTexto(r);
  assert.match(t, /NÃO LI O `business-rules\.md`/);
  assert.match(t, /outputs[\\/]spec[\\/]business-rules\.md/);
  // A §2 tem RF: a âncora sem ID não vale, e a mensagem ensina as DUAS formas.
  assert.deepEqual(r.ancorasNaoRastreaveis.map((a) => a.id), ['F-050']);
  assert.match(t, /`<arquivo> §<seção>` — ex\.: `especificacao-funcional\.md §1\.1 Vendedor`/);
  // E com o `business-rules.md` lido a linha some.
  const lido = relatorioDe('raiz', ioQueRegistra({
    'raiz/outputs/spec/context-map.md': '| ID | Fato | Âncora |\n|---|---|---|\n',
    'raiz/outputs/spec/requirements/requirements.md': '# Requisitos\n',
    'raiz/outputs/spec/business-rules.md': REGRAS,
  }).io);
  assert.equal(lido.regrasLidas, true);
  assert.doesNotMatch(formatarTexto(lido), /NÃO LI O `business-rules\.md`/);
});

test('D12/D14 — a rule do Plan diz o que o `promocao.mjs` aceita: âncora por seção sem ID e a Origem do business-rules', () => {
  // A convenção de âncora é contrato da rule; a ferramenta só a confere. As duas mudaram juntas, e
  // este teste é o que impede uma de voltar sem a outra. O caminho vai numa string só: é assim que
  // o gerar-kiro e o gerar-cursor o reescrevem para o endereço da rule na saída deles.
  const plan = readFileSync(join(RAIZ, '.claude/rules/harness/plan.md'), 'utf8');
  const ancora = plan.slice(plan.indexOf('## Convenção de âncora'), plan.indexOf('## Promoção de IDs'));
  assert.match(ancora, /`<arquivo> §<seção>`/, 'a rule não documenta a âncora por seção sem ID');
  assert.match(ancora, /especificacao-funcional\.md §1\.1 Vendedor/);
  const promocao = plan.slice(plan.indexOf('## Promoção de IDs'), plan.indexOf('## Congelamento do Explore'));
  assert.match(promocao, /business-rules\.md/, 'a rule não diz que a RN-NOVO consome pela Origem do business-rules.md');
  assert.match(promocao, /Origem/);
});

test('D14 — a linha Origem é o site do consumo: fora do bloco de uma RN-NOVO, ninguém consome', () => {
  // A linha **Origem** solta na tabela de conflitos não é de RN nenhuma — o dono zera no `##`.
  const c = lerConsumosDeRegras(REGRAS);
  assert.deepEqual([...c.keys()].sort(), ['F-031', 'F-032']);
  assert.deepEqual([...c.get('F-031')], ['RN-NOVO-DESCONTO-001']);
  // F-004 está na Justificativa, não na Origem: não é o site que o template declara para o fato.
  assert.equal(c.has('F-004'), false);
  assert.equal(c.has('F-099'), false);
  // O template intocado (`RN-NOVO-[DOMÍNIO]-001`) não consome nada.
  assert.equal(lerConsumosDeRegras('#### RN-NOVO-[DOMÍNIO]-001: [Título]\n| **Origem** | F-001 |\n').size, 0);
});
