// Harness Elo v2 — Onda 4 do plano de melhoria das skills: SKILL.md mais curto, sem perder regra.
//
// Nove skills tiveram trechos movidos para `references/` (ou para o MAINTENANCE.md). A base
// `preservacao-onda4.base.json` foi tirada ANTES da mudança pelo `preservacao.mjs`:
// todo código de validador, toda linha com FATAL/MUST/NUNCA e todo ID do SKILL.md de então. Aqui se
// confere que cada um continua em algum arquivo da pasta da skill, e que cada reference é citada no
// SKILL.md dizendo quando lê-la (princípio P5).
//
// Se uma atualização do kit mudar uma dessas regras DE PROPÓSITO, a base precisa ser tirada de novo
// (`node .claude/ferramentas/preservacao.mjs --base .claude/ferramentas/preservacao-onda4.base.json ...`, com
// as mesmas skills e pastas extras que estão no arquivo) e a troca registrada no MANUTENCAO.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { conferir, atomos, normalizar } from './preservacao.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = JSON.parse(readFileSync(join(RAIZ, '.claude', 'ferramentas', 'preservacao-onda4.base.json'), 'utf8'));
const ler = (rel) => readFileSync(join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

test('P5 — nenhuma regra sumiu das nove skills reorganizadas, e toda reference diz quando é lida', () => {
  assert.deepEqual(Object.keys(BASE.skills).sort(), [
    'spec-implement', 'spec-legacy', 'spec-product', 'spec-report', 'spec-scaffold',
    'spec-security-review', 'spec-status-report', 'spec-tasks', 'spec-tech-rules',
  ]);
  const achados = conferir(RAIZ, BASE);
  assert.deepEqual(achados.map((a) => a.mensagem), []);
});

test('P5 — a ferramenta acusa o átomo que sumiu e a reference que ninguém manda ler', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'preservacao-'));
  try {
    const dir = join(raiz, '.claude', 'skills', 'x');
    mkdirSync(join(dir, 'references'), { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), '# x\n\n| `GATE_X` | FATAL |\n\nVer TASK-014.\n');
    const base = { skills: { x: { pastas: ['.claude/skills/x'], ...Object.fromEntries(Object.entries(atomos(readFileSync(join(dir, 'SKILL.md'), 'utf8'))).map(([k, v]) => [k, [...v]])) } } };
    assert.deepEqual(conferir(raiz, base), []);
    // Some a linha FATAL (e o código), e entra uma reference sem citação.
    writeFileSync(join(dir, 'SKILL.md'), '# x\n\nVer TASK-014.\n');
    writeFileSync(join(dir, 'references', 'r.md'), '# r\n');
    const tipos = conferir(raiz, base).map((a) => a.tipo).sort();
    assert.deepEqual(tipos, ['citacao', 'codigos', 'normas']);
    // Citada sem condição ainda é achado; com condição no parágrafo, não.
    writeFileSync(join(dir, 'SKILL.md'), '# x\n\n| `GATE_X` | FATAL |\n\nVer TASK-014 em [r](references/r.md).\n');
    assert.deepEqual(conferir(raiz, base).map((a) => a.tipo), ['condicao']);
    writeFileSync(join(dir, 'SKILL.md'), '# x\n\n| `GATE_X` | FATAL |\n\nAo gerar,\nler TASK-014 em [r](references/r.md).\n');
    assert.deepEqual(conferir(raiz, base), []);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('P5 — a linha normativa é comparada sem marcador de lista nem espaços a mais', () => {
  assert.equal(normalizar('  4. **Triagem**  é   FATAL '), '**Triagem** é FATAL');
  assert.equal(normalizar('> - NUNCA isso'), 'NUNCA isso');
});

// ————————————————————— Decisão 73: o que o harness já carrega não é materializado de novo —————————————————————

test('Decisão 73 — a spec-tech-rules não materializa security nem frontend-default onde o harness já as tem', () => {
  const t = ler('.claude/skills/spec-tech-rules/SKILL.md');
  assert.match(t, /Projeto com o harness Elo — o que o harness já carrega não é materializado de novo \(Decisão 73/);
  // Sem fixar a pasta: as saídas Kiro e Cursor reescrevem o endereço da rule do harness
  // (`.kiro/steering/harness-security.md`, `.cursor/rules/harness/security.mdc`).
  assert.match(t, /`[^`\s]*harness[/-]security\.mdc?`/);
  assert.match(t, /`[^`\s]*harness[/-]frontend\.mdc?`/);
  assert.match(t, /o `mdc_to_md\.py --dir` faz isso sozinho e imprime `PULADA`/);
  // O SECURITY_UNMODIFIED continua conferindo a fonte em outputs/spec/tech-rules/.
  assert.match(t, /continuam em `outputs\/spec\/tech-rules\/` — o `SECURITY_UNMODIFIED` confere lá/);
  // A rule do Plan diz o mesmo, sem a redação antiga de «sobrescreve».
  const plan = ler('.claude/rules/harness/plan.md');
  assert.match(plan, /não\*\* são materializados de novo em `[^`]+` —\n  carregariam duas vezes \(Decisão 73\)/);
  assert.ok(!/sobrescreve `frontend` na raiz/.test(plan));
});

test('Decisão 73 — o corpo das rules do harness é o mesmo dos templates da spec-tech-rules', () => {
  // A premissa da decisão: se um dia divergirem, pular a materialização perderia regra.
  const corpo = (rel) => ler(rel).split('---').slice(2).join('---').trim();
  assert.equal(corpo('.claude/rules/harness/security.md'), corpo('.claude/skills/spec-tech-rules/templates/security.mdc'));
  assert.equal(corpo('.claude/rules/harness/frontend.md'), corpo('.claude/skills/spec-tech-rules/templates/frontend-default.mdc'));
});

// ————————————————————— spec-scaffold: todas as rules do projeto, mais as do harness —————————————————————

test('Revisão de riscos — a spec-scaffold lê todas as rules do projeto e as duas do harness explicitamente', () => {
  const t = ler('.claude/skills/spec-scaffold/SKILL.md');
  // A leitura dirigida da Onda 4 deixava auth, observability e integrations de fora, e a tabela de
  // cobertura da própria skill manda tratar o tema que as rules lidas não citam como fora de escopo:
  // o scaffold saía sem auth/CORS, sem a pasta de adapters e com log fora do formato decidido.
  assert.ok(!/leitura dirigida/i.test(t), 'a leitura dirigida voltou');
  assert.match(t, /ler \*\*todos\*\* os\s+arquivos `\.mdc`, `\.md` ou `\.txt` do diretório/);
  // Tema por tema da tabela de cobertura: a rule que o cobre não pode ficar fora da leitura.
  for (const r of ['auth', 'observability', 'integrations']) assert.ok(!new RegExp(`demais \\([^)]*\`${r}\``).test(t), `${r} voltou a ficar de fora`);
  // As do harness não são materializadas na raiz (Decisão 73) e a de frontend tem `paths:` — o
  // scaffold cria arquivo de tela, não abre um, então ela não carregaria sozinha. Sem fixar a pasta:
  // as saídas Kiro e Cursor reescrevem o endereço.
  assert.match(t, /`[^`\s]*harness[/-]security\.mdc?`/);
  assert.match(t, /`[^`\s]*harness[/-]frontend\.mdc?`/);
  assert.match(t, /python3 \.\.\/tools\/check-hld\.py outputs\/spec\/hld\.md --json/);
  assert.ok(!/Eng_Proc/.test(t) && !/plugin\s+eng-proc-spec/.test(t), 'o parágrafo Eng_Proc/Cowork voltou');
});

test('Decisão 32 — a reorganização não mudou o fim de linha dos arquivos do upstream', () => {
  // A Onda 4 gravou estes dois em LF; no upstream eles são CRLF, e o merge de três pontas depende
  // de byte-identidade com o pacote recebido.
  for (const rel of ['.claude/skills/spec-scaffold/SKILL.md', '.claude/skills/tools/vale-styles/README.md']) {
    const b = readFileSync(join(RAIZ, rel));
    const crlf = b.toString('latin1').split('\r\n').length - 1;
    const lf = b.toString('latin1').split('\n').length - 1;
    assert.equal(crlf, lf, `${rel}: ${lf - crlf} linha(s) sem CR`);
  }
});
