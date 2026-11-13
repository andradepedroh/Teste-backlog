// Harness Elo v2 — O gerador do relatório do kit, contra fixtures em mkdtemp (Plano 5, Task 8).
//
// É a PRIMEIRA ferramenta do upstream que bifurcamos (Decisão 38), e a prova é executável: o
// script roda por subprocesso contra um outputs/spec/ montado aqui, e o HTML é lido de volta. A
// montagem por presença é o que se prende — domínio Revisão com revisao.json, sem ele sem domínio.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GERADOR = join(RAIZ, '.claude', 'skills', 'tools', 'generate-report.py');
const TEMPLATES = join(RAIZ, '.claude', 'skills', 'spec-report', 'templates');
const PYTHON = process.env.PYTHON_REPORT || 'python';

const REVISAO = {
  versao: '1.0',
  resumo: { documentos: 5, totalApontamentos: 2, gapsAbertos: 1 },
  listas: [
    { chave: 'modulo-sem-rf', titulo: 'Módulos sem RF', itens: [] },
    { chave: 'rf-sem-tela', titulo: 'RF sem tela', itens: ['RF-004 — sem tela na §2 nem menção no protótipo'] },
    { chave: 'rf-sem-rn', titulo: 'RF sem RN', itens: [] },
    { chave: 'rn-orfa', titulo: 'RN órfã', itens: [] },
    { chave: 'modulo-fantasma', titulo: 'Módulo fantasma', itens: [] },
    { chave: 'perfil-sem-tela', titulo: 'Perfil sem tela', itens: [] },
    { chave: 'entidade-sem-rf', titulo: 'Entidade sem RF', itens: [] },
    { chave: 'gaps-abertos', titulo: 'GAPs abertos', itens: ['GAP-002 — prazo de cancelamento (impacto: alto)'] },
  ],
};

function montar({ comRevisao, comTechRules }) {
  const raiz = mkdtempSync(join(tmpdir(), 'report-dom-'));
  const spec = join(raiz, 'outputs', 'spec');
  mkdirSync(spec, { recursive: true });
  // um capítulo qualquer, para o domínio Documentos existir e o build não ficar vazio
  writeFileSync(join(spec, 'business-rules.md'), '# Regras de Negócio — Fixture\n\n**Versão:** 0.1\n\n| ID | Regra |\n|---|---|\n| RN-001 | reserva exige sala livre |\n');
  if (comRevisao) writeFileSync(join(spec, 'revisao.json'), JSON.stringify(REVISAO, null, 2));
  if (comTechRules) {
    mkdirSync(join(spec, 'tech-rules'));
    writeFileSync(join(spec, 'tech-rules', 'tech-rules-summary.md'), '# Tech rules — resumo\n\n**Versão:** 0.1\n\n| Rule | Decisão |\n|---|---|\n| security.mdc | integral, sem modificação |\n| frontend.mdc | React + Vite |\n');
  }
  return { raiz, spec };
}

function gerar(spec) {
  // PYTHONIOENCODING: no Windows o Python escreve o stdout na codepage do console (cp1252), e
  // `encoding: 'utf8'` do spawnSync decodifica como UTF-8 — "Domínios" chegaria como "Dom?nios".
  // Sem isto a asserção sobre o stdout falha por mojibake, não por domínio ausente.
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  const r = spawnSync(PYTHON, [GERADOR, '--base-dir', spec, '--templates-dir', TEMPLATES], { encoding: 'utf8', env });
  // Fallback de rede de segurança: o teste de pré-voo (primeiro da suíte) já cobre isto e já
  // explica o PYTHON_REPORT — aqui só evita um traceback cru se a suíte rodar fora de ordem
  // (ex.: `--test-name-pattern` isolando um teste depois do pré-voo).
  const semMarkdown = /No module named 'markdown'/.test(r.stderr)
    || /pacote 'markdown' não instalado/.test(r.stderr);
  if (semMarkdown) {
    assert.fail(`o pacote Python \`markdown\` não está instalado no interpretador «${PYTHON}» — ver o teste de pré-voo`);
  }
  assert.equal(r.status, 0, `gerador saiu com ${r.status}\n${r.stderr}`);
  const html = join(spec, 'report', 'product-discovery-kit.html');
  assert.ok(existsSync(html));
  return { html: readFileSync(html, 'utf8'), stdout: r.stdout, stderr: r.stderr };
}

test('pré-voo: o interpretador Python tem o pacote markdown (PYTHON_REPORT)', () => {
  // Falha aqui, alto e claro, em vez de deixar as cinco montagens abaixo falharem uma a uma com
  // o mesmo ImportError — a suíte inteira depende deste pacote, e o diagnóstico é o mesmo sempre.
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  const r = spawnSync(PYTHON, ['-c', 'import markdown'], { encoding: 'utf8', env });
  if (r.status !== 0) {
    assert.fail(
      `o interpretador Python «${PYTHON}» não tem o pacote \`markdown\` instalado — os testes ` +
      'desta suíte rodam o gerador de verdade e dependem dele. Aponte PYTHON_REPORT para um ' +
      'interpretador que o tenha (ex.: um venv do tipo .venv/Scripts/python.exe) antes de rodar ' +
      `esta suíte; ver README.md » "Rodar os testes".\n${r.stderr}`
    );
  }
});

test('sanidade: o gerador roda contra o fixture mínimo, sem placeholder sobrando', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    const { html } = gerar(spec);
    assert.ok((html.match(/data-domain="/g) || []).length > 0);
    assert.equal((html.match(/-PLACEHOLDER -->/g) || []).length, 0);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Revisão: presente com revisao.json, com os apontamentos do JSON', () => {
  const { raiz, spec } = montar({ comRevisao: true, comTechRules: false });
  try {
    const { html, stdout } = gerar(spec);
    assert.match(html, /<section class="domain" data-domain="revisao"/);
    assert.match(html, /RF-004 — sem tela na §2/);
    assert.match(html, /GAP-002 — prazo de cancelamento/);
    assert.match(stdout, /Domínios: .*revisao/);
    // listas vazias NÃO viram seção vazia — célula sem valor é "—", seção sem item não existe
    assert.doesNotMatch(html, /id="rev-rn-orfa"/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Revisão: AUSENTE sem revisao.json — montagem por presença', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    const { html, stdout } = gerar(spec);
    assert.doesNotMatch(html, /data-domain="revisao"/);
    assert.doesNotMatch(stdout, /Domínios:.*revisao/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Técnico: tech-rules-summary.md basta para o domínio existir, e vira capítulo', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: true });
  try {
    const { html } = gerar(spec);
    assert.match(html, /<section class="domain" data-domain="tecnico"/);
    assert.match(html, /id="tech-rules"/);
    assert.match(html, /security\.mdc/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Técnico: sem data-model, SVG ou tech-rules, continua ausente', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    const { html } = gerar(spec);
    assert.doesNotMatch(html, /data-domain="tecnico"/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Revisão: revisao.json ilegível → domínio omitido com AVISO, e o build NÃO aborta', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    // JSON truncado de propósito — erro de sintaxe, não erro de shape (o cenário 6 da
    // MAINTENANCE.md já promete isto; faltava o teste).
    writeFileSync(join(spec, 'revisao.json'), '{"versao": "1.0", "listas": [');
    const { html, stderr } = gerar(spec);
    assert.doesNotMatch(html, /data-domain="revisao"/);
    assert.match(stderr, /AVISO: revisao\.json ilegível/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Revisão: revisao.json de topo não-objeto ([]) → domínio omitido com AVISO, e o build NÃO aborta', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    // JSON sintaticamente válido, mas o topo é uma lista — antes do Important 1 isto explodia
    // com AttributeError dentro de rev.get(...) e o gerador saía com status != 0 (RED).
    writeFileSync(join(spec, 'revisao.json'), '[]');
    const { html, stderr } = gerar(spec);
    assert.doesNotMatch(html, /data-domain="revisao"/);
    assert.match(stderr, /AVISO: revisao\.json ilegível/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Revisão: resumo que não é objeto degrada para "—" e o build NÃO aborta', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    // resumo é uma string, não um objeto — sintaticamente válido, mas antes do conserto pós-
    // revisão 2 isto explodia com AttributeError dentro de resumo.get(...), fora do try/except
    // (que só cobria o parse do JSON). As listas estão bem-formadas: o domínio deve sobreviver.
    writeFileSync(join(spec, 'revisao.json'), JSON.stringify({
      versao: '1.0',
      resumo: 'nao-e-um-objeto',
      listas: [{ chave: 'gaps-abertos', titulo: 'GAPs abertos', itens: ['GAP-002 — x'] }],
    }));
    const { html } = gerar(spec);
    assert.match(html, /<section class="domain" data-domain="revisao"/);
    assert.match(html, /<strong>—<\/strong> documento\(s\) lido\(s\)/);
    assert.match(html, /<strong>—<\/strong> apontamento\(s\)/);
    assert.match(html, /<strong>—<\/strong> GAP\(s\) em aberto/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Revisão: lista com `itens` escalar é PULADA, e as listas boas continuam', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: false });
  try {
    // `itens: 5` é sintaticamente válido e passa pelo `or []` (5 é truthy) — antes do conserto da
    // revisão final, len(5) explodia com TypeError e derrubava o build inteiro. Uma lista ruim
    // não pode custar o domínio: a lista boa ao lado tem que continuar aparecendo.
    writeFileSync(join(spec, 'revisao.json'), JSON.stringify({
      versao: '1.0',
      resumo: { documentos: 3, totalApontamentos: 1, gapsAbertos: 1 },
      listas: [
        { chave: 'rf-sem-tela', titulo: 'RF sem tela', itens: 5 },
        { chave: 'gaps-abertos', titulo: 'GAPs abertos', itens: ['GAP-002 — prazo de cancelamento'] },
      ],
    }));
    const { html } = gerar(spec);
    assert.match(html, /<section class="domain" data-domain="revisao"/);
    assert.match(html, /GAP-002 — prazo de cancelamento/);
    // a lista escalar não vira seção nem <li> — não há o que listar
    assert.doesNotMatch(html, /id="rev-rf-sem-tela"/);
    assert.doesNotMatch(html, /<li>5<\/li>/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('domínio Técnico: tech-rules-summary.md com bytes inválidos → AVISO, capítulo omitido, build segue', () => {
  const { raiz, spec } = montar({ comRevisao: false, comTechRules: true });
  try {
    // 0xff 0xfe não é UTF-8 válido: o read_file estoura UnicodeDecodeError, que NÃO é OSError —
    // antes do conserto da revisão final o except não pegava e o build morria com traceback.
    writeFileSync(join(spec, 'tech-rules', 'tech-rules-summary.md'), Buffer.from([0xff, 0xfe, 0x41]));
    // o data-model garante que o domínio Técnico exista mesmo sem o capítulo de regras
    writeFileSync(join(spec, 'data-model.json'), JSON.stringify({
      entities: [{ name: 'Reserva', fields: [{ name: 'id', type: 'uuid' }] }],
    }));
    const { html, stderr } = gerar(spec);
    assert.match(stderr, /AVISO: tech-rules-summary\.md ilegível/);
    assert.doesNotMatch(html, /id="tech-rules"/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

