// Harness Elo v2 — check-testplan.mjs (plano de melhoria das skills, Onda 3, item 3.2) e o caminho
// do business-rules.md lido pela spec-test-plan (item 1.11, achado da execução).
//
// Os números da linha `TESTPLAN_COVERAGE` e os validators da spec-test-plan eram contados pela
// mesma IA que escreveu o plano. O script lê o test-plan.md no formato do template; aqui: contagem
// por categoria e épica, cobertura RN × caso (com e sem business-rules), cada validator conferível
// por texto, a borda «tabela da tela» que NÃO é linguagem técnica, e o exit 2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(RAIZ, '.claude', 'skills', 'tools', 'check-testplan.mjs');

function tc(id, categoria, { rel = 'RF-MOD-PED-001, RN-001', pre = 1, passos = 3, esperados = 1, extra = '' } = {}) {
  return [
    `### [${id}] Caso ${id} [${categoria}]`, '',
    '| Campo | Conteúdo |', '|-------|----------|',
    '| **Objetivo** | Validar o pedido |', '| **Perfil do testador** | Atendente |',
    `| **RN/RF relacionado** | ${rel} |`, '',
    '**Pré-condições:**', ...Array.from({ length: pre }, (_, i) => `- Pré ${i + 1}`), '',
    '**Passos:**', ...Array.from({ length: passos }, (_, i) => `${i + 1}. Faça o passo ${i + 1} com \`valor\``), extra, '',
    '**Resultado esperado:**', ...Array.from({ length: esperados }, () => '- ✅ O pedido aparece na tabela da tela'), '',
    '**Resultado obtido:** [Preencher]', '', '---', '',
  ].join('\n');
}

const BOM = [
  '# Plano de Testes — Pedidos', '', '## Metadados', '', '| Campo | Valor |', '|---|---|',
  '| Total de casos de teste | 4 |', '',
  '## [EPIC-001] — Pedidos', '',
  tc('TC-001', 'PRINCIPAL'), tc('TC-002', 'VALIDAÇÃO'),
  tc('TC-003', 'REGRA', { rel: 'RN-002' }), tc('TC-004', 'BORDA', { rel: 'RF-MOD-PED-002' }),
  '## Cobertura RN × Caso', '', '| RN | Descrição curta | Casos que cobrem | Status |', '|---|---|---|---|',
  '| RN-001 | limite | TC-001, TC-002 | ✅ Coberta |', '| RN-002 | prazo | TC-003 | ✅ Coberta |',
  '| RN-003 | lote | — | ⚠️ Não coberta — justificativa: processamento noturno sem efeito visível |', '',
  '## Anexos', '',
].join('\n');

function rodar(texto, { br = null, args = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'check-testplan-'));
  try {
    const p = join(dir, 'test-plan.md');
    writeFileSync(p, texto);
    const extra = [];
    if (br !== null) { writeFileSync(join(dir, 'br.md'), br); extra.push('--business-rules', join(dir, 'br.md')); }
    const r = spawnSync(process.execPath, [SCRIPT, p, ...extra, ...args, '--json'], { encoding: 'utf8' });
    return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('3.2 — caso bom: contagens, cobertura e a linha TESTPLAN_COVERAGE pronta para o sync-log', () => {
  const r = rodar(BOM);
  assert.equal(r.status, 0, JSON.stringify(r.out?.achados));
  assert.deepEqual(r.out.achados, []);
  assert.equal(r.out.casos, 4);
  assert.deepEqual(r.out.porEpica['EPIC-001'].porCategoria, { PRINCIPAL: 1, 'VALIDAÇÃO': 1, REGRA: 1, BORDA: 1 });
  assert.equal(r.out.linhaSyncLog,
    'TESTPLAN_COVERAGE: casos=4 (PRINCIPAL=1, VALIDAÇÃO=1, REGRA=1, ACESSO=0, ESTADO=0, INTEGRAÇÃO=0, BORDA=1) | RNs cobertas=2/3 (67%)');
  assert.deepEqual(r.out.rns.justificadas, ['RN-003']);
});

test('3.2 — com --business-rules, RN do escopo sem caso e sem justificativa é RN_NOT_COVERED', () => {
  const r = rodar(BOM, { br: '# Regras\n\n### RN-001 — limite\n### RN-002 — prazo\n### RN-003 — lote\n### RN-NOVO-004 — desconto\n' });
  assert.equal(r.status, 0, 'RN_NOT_COVERED é WARNING');
  const m = r.out.achados.map((a) => `${a.severidade} ${a.code} ${a.rn ?? ''}`.trim());
  assert.ok(m.includes('WARNING RN_NOT_COVERED RN-NOVO-004'));
  assert.ok(m.includes('WARNING PLAN_HAS_COVERAGE_TABLE RN-NOVO-004'));
  assert.match(r.out.linhaSyncLog, /RNs cobertas=2\/4 \(50%\)$/);
});

test('3.2 — cada validator conferível por texto acusa o caso ruim, com a severidade da skill', () => {
  const ruim = BOM
    .replace(tc('TC-002', 'VALIDAÇÃO'), tc('TC-002', 'VALIDAÇÃO', { passos: 2, esperados: 0, pre: 0, rel: '—' }))
    .replace(tc('TC-003', 'REGRA', { rel: 'RN-002' }), tc('TC-003', 'BORDA', { rel: 'RN-002', extra: '4. Envie o POST para o endpoint de pedidos' }))
    .replace('| Total de casos de teste | 4 |', '| Total de casos de teste | 9 |');
  const r = rodar(ruim);
  assert.equal(r.status, 1);
  const m = r.out.achados.map((a) => `${a.severidade} ${a.code}${a.tc ? ` ${a.tc}` : ''}${a.epica ? ` ${a.epica}` : ''}`);
  for (const esperado of [
    'FATAL TC_HAS_STEPS TC-002', 'FATAL TC_HAS_EXPECTED_RESULT TC-002', 'WARNING TC_HAS_PRECONDITIONS TC-002',
    'WARNING TC_HAS_TRACEABILITY TC-002', 'FATAL NO_TECHNICAL_LANGUAGE TC-003',
    'FATAL EPIC_HAS_MINIMUM_COVERAGE EPIC-001', 'WARNING TESTPLAN_COVERAGE',
  ]) assert.ok(m.includes(esperado), `faltou: ${esperado}\n${m.join('\n')}`);
});

test('3.2 — «tabela» da tela não é linguagem técnica; «tabela do banco» é', () => {
  assert.deepEqual(rodar(BOM).out.achados, [], 'o resultado esperado cita «tabela da tela» e não pode acusar');
  const r = rodar(BOM.replace('1. Faça o passo 1 com `valor`', '1. Confira a tabela do banco'));
  assert.ok(r.out.achados.some((a) => a.code === 'NO_TECHNICAL_LANGUAGE'));
});

test('3.2 — épica com mais de 20 casos é sinal de divisão (WARNING), não erro', () => {
  const muitos = Array.from({ length: 21 }, (_, i) => tc(`TC-${String(i + 1).padStart(3, '0')}`, ['PRINCIPAL', 'VALIDAÇÃO', 'REGRA'][i % 3])).join('\n');
  const r = rodar(`## [EPIC-002] — Grande\n\n${muitos}\n## Cobertura RN × Caso\n\n| RN | d | c | s |\n|---|---|---|---|\n| RN-001 | x | TC-001 | ok |\n`);
  assert.equal(r.status, 0);
  assert.ok(r.out.achados.some((a) => a.code === 'EPIC_SIZE_SIGNAL' && a.epica === 'EPIC-002'));
});

test('3.2 — sem caso nenhum (ou sem arquivo) é exit 2, não falso verde', () => {
  assert.equal(rodar('# Plano vazio\n').status, 2);
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'nao-existe.md'], { encoding: 'utf8' }).status, 2);
});

test('3.2 — a spec-test-plan chama o script no passo G, como WARNING', () => {
  const t = readFileSync(join(RAIZ, '.claude/skills/spec-test-plan/SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(t, /node \.\.\/tools\/check-testplan\.mjs outputs\/spec\/test-plan\.md/);
  assert.match(t, /^\| `TESTPLAN_SCRIPT_CHECK` \|[^\n]*\| WARNING \|$/m);
});

test('1.11 — a spec-test-plan lê o business-rules.md onde a spec-product o grava', () => {
  const product = readFileSync(join(RAIZ, '.claude/skills/spec-product/SKILL.md'), 'utf8');
  const saida = product.match(/^\| `(outputs\/spec\/[\w/-]*business-rules\.md)` \|/m);
  assert.ok(saida, 'a tabela de saídas da spec-product não lista mais o business-rules.md');
  const testPlan = readFileSync(join(RAIZ, '.claude/skills/spec-test-plan/SKILL.md'), 'utf8');
  const lidos = [...testPlan.matchAll(/`(outputs\/spec\/[\w/-]*business-rules\.md)`/g)].map((m) => m[1]);
  assert.ok(lidos.length > 0, 'a spec-test-plan não cita mais o caminho do business-rules.md');
  assert.deepEqual([...new Set(lidos)], [saida[1]]);
});

// D27 (teste ponta a ponta de 2026-10-21): o business-rules.md cita as RN preliminares do Explore
// (RN-001…) no campo **Origem** das RN-NOVO e na linha `Fonte:`, como manda a «Promoção de IDs» do
// plan.md. O script as contava como RN próprias: «RNs cobertas=5/9 (56%)», 8 WARNING falsos e a linha
// TESTPLAN_COVERAGE errada no sync-log.
const BR_PROMOVIDO = [
  '# Regras de Negócio — Pedidos', '',
  'Fonte: prototype.md, outputs/explore/especificacao-funcional.md (RN-001 a RN-002)', '',
  '## Seção B — Regras do Novo Produto', '',
  '#### RN-NOVO-DESCONTO-001: Desconto por faixa', '', '| Campo | Conteúdo |', '|-------|----------|',
  '| **Origem** | F-031 (especificacao-funcional.md §3 MOD-PEDIDOS RN-001); prototype.md §/pedidos/novo |',
  '| **Conflitos** | Depende de RN-NOVO-CREDITO-001. |', '',
  '#### RN-NOVO-CREDITO-001: Crédito disponível', '', '| Campo | Conteúdo |', '|-------|----------|',
  '| **Origem** | F-032 (especificacao-funcional.md §3 MOD-CLIENTES RN-002) |', '',
  '## Questões em aberto', '', '| QA | RNs envolvidas | Descrição |', '|---|---|---|',
  '| QA-01 | RN-NOVO-DESCONTO-001 | arredondamento |', '',
].join('\n');

const PLANO_PROMOVIDO = [
  '## [EPIC-001] — Pedidos', '',
  tc('TC-001', 'PRINCIPAL', { rel: 'RF-MOD-PED-001, RN-NOVO-DESCONTO-001' }),
  tc('TC-002', 'VALIDAÇÃO', { rel: 'RF-MOD-PED-001' }),
  tc('TC-003', 'REGRA', { rel: 'RN-NOVO-CREDITO-001' }),
  '## Cobertura RN × Caso', '', '| RN | Descrição curta | Casos que cobrem | Status |', '|---|---|---|---|',
  '| RN-NOVO-DESCONTO-001 | desconto | TC-001 | ✅ Coberta |', '| RN-NOVO-CREDITO-001 | crédito | TC-003 | ✅ Coberta |', '',
].join('\n');

test('D27 — RN do Explore citada como Origem de uma RN-NOVO está coberta por ela: não é RN própria do escopo', () => {
  const r = rodar(PLANO_PROMOVIDO, { br: BR_PROMOVIDO });
  assert.equal(r.status, 0, JSON.stringify(r.out?.achados));
  assert.deepEqual(r.out.achados, [], 'RN_NOT_COVERED/PLAN_HAS_COVERAGE_TABLE para RN-001/RN-002 são falsos');
  assert.match(r.out.linhaSyncLog, /RNs cobertas=2\/2 \(100%\)$/);
  assert.deepEqual(r.out.rns.promovidas, { 'RN-001': ['RN-NOVO-DESCONTO-001'], 'RN-002': ['RN-NOVO-CREDITO-001'] });
  // A RN-NOVO própria continua cobrada: sem caso e sem linha na tabela, é RN_NOT_COVERED.
  const sem = rodar(PLANO_PROMOVIDO.replace('| **RN/RF relacionado** | RN-NOVO-CREDITO-001 |', '| **RN/RF relacionado** | RF-MOD-PED-002 |')
    .replace(/^\| RN-NOVO-CREDITO-001 .*$/m, ''), { br: BR_PROMOVIDO });
  assert.ok(sem.out.achados.some((a) => a.code === 'RN_NOT_COVERED' && a.rn === 'RN-NOVO-CREDITO-001'), JSON.stringify(sem.out.achados));
  assert.ok(!sem.out.achados.some((a) => /^RN-\d+$/.test(a.rn ?? '')), 'RN do Explore não volta ao escopo');
});

test('D27 — business-rules.md sem bloco por RN (formato livre): ID citado só em Origem/Fonte também não entra no escopo', () => {
  const livre = [
    'Fonte: especificacao-funcional.md (RN-001)', '',
    '| RN | Enunciado |', '|---|---|', '| RN-NOVO-DESCONTO-001 | desconto por faixa |', '',
    '| **Origem** | RN-001 |',
  ].join('\n');
  const r = rodar(PLANO_PROMOVIDO, { br: livre });
  assert.deepEqual(r.out.achados, []);
  assert.match(r.out.linhaSyncLog, /RNs cobertas=1\/1 \(100%\)$/);
});
