// Harness Elo v2 — check-rules.mjs da spec-tech-rules (plano de melhoria das skills, Onda 3, item 3.4).
//
// NO_PLACEHOLDER_LEFT e SECURITY_UNMODIFIED são FATAL e eram autoavaliados. Aqui: caso bom (security
// copiada do template, inclusive com outro fim de linha), placeholder na fonte e na pasta
// materializada, security alterada ou ausente, subpasta `harness/` ignorada, exit 2.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILL = join(RAIZ, '.claude', 'skills', 'spec-tech-rules');
const SCRIPT = join(SKILL, 'tools', 'check-rules.mjs');
const SECURITY = readFileSync(join(SKILL, 'templates', 'security.mdc'), 'utf8');

function cenario(fn) {
  const raiz = mkdtempSync(join(tmpdir(), 'tech-rules-check-'));
  try {
    const fonte = join(raiz, 'outputs', 'spec', 'tech-rules');
    const dest = join(raiz, '.claude', 'rules');
    mkdirSync(fonte, { recursive: true });
    mkdirSync(join(dest, 'harness'), { recursive: true });
    writeFileSync(join(fonte, 'security.mdc'), SECURITY.replace(/\r?\n/g, '\r\n'));  // outro fim de linha
    writeFileSync(join(fonte, 'architecture.mdc'), '---\nalwaysApply: true\n---\n# Arquitetura do Pedidos\n');
    writeFileSync(join(dest, 'architecture.md'), '# Arquitetura do Pedidos\n');
    writeFileSync(join(dest, 'harness', 'plan.md'), 'texto do harness com {{ISTO_NAO_E_SAIDA_DA_SKILL}}\n');
    const rodar = () => {
      const r = spawnSync(process.execPath, [SCRIPT, fonte, dest, '--json'], { encoding: 'utf8' });
      return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null };
    };
    return fn({ fonte, dest, rodar });
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

test('3.4 — caso bom: security igual ao template (fim de linha não conta) e nada sem preencher', () => {
  cenario(({ rodar }) => {
    const r = rodar();
    assert.equal(r.status, 0, JSON.stringify(r.out));
    assert.deepEqual(r.out.achados, [], 'a subpasta harness/ não é saída da skill e não pode ser varrida');
  });
});

test('3.4 — placeholder na fonte e na pasta materializada é NO_PLACEHOLDER_LEFT, com linha', () => {
  cenario(({ fonte, dest, rodar }) => {
    writeFileSync(join(fonte, 'database.mdc'), '---\nglobs: "**/*.sql"\n---\n# Banco {{DB_ENGINE}}\n');
    writeFileSync(join(dest, 'database.md'), '# Banco\n\nversão {{DB_VERSION}}\n');
    const r = rodar();
    assert.equal(r.status, 1);
    const m = r.out.achados.map((a) => `${a.code} ${a.arquivo.split(/[\\/]/).pop()}:${a.linha}`);
    assert.deepEqual(m.sort(), ['NO_PLACEHOLDER_LEFT database.md:3', 'NO_PLACEHOLDER_LEFT database.mdc:4']);
  });
});

test('3.4 — security alterada (uma linha) ou ausente é SECURITY_UNMODIFIED', () => {
  cenario(({ fonte, rodar }) => {
    writeFileSync(join(fonte, 'security.mdc'), SECURITY.replace('Argon2id', 'bcrypt'));
    let r = rodar();
    assert.equal(r.status, 1);
    assert.match(r.out.achados[0].mensagem, /difere de templates\/security\.mdc a partir da linha \d+/);
    rmSync(join(fonte, 'security.mdc'));
    r = rodar();
    assert.match(r.out.achados.map((a) => a.mensagem).join('\n'), /security\.mdc ausente/);
  });
});

test('3.4 — pasta-fonte inexistente ou vazia é exit 2', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'nao-existe'], { encoding: 'utf8' }).status, 2);
  const vazia = mkdtempSync(join(tmpdir(), 'tech-rules-vazia-'));
  try {
    assert.equal(spawnSync(process.execPath, [SCRIPT, vazia], { encoding: 'utf8' }).status, 2);
  } finally {
    rmSync(vazia, { recursive: true, force: true });
  }
});

test('3.4 — a spec-tech-rules chama o script antes do PASSO 5, como WARNING', () => {
  const t = readFileSync(join(SKILL, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const passo4 = t.slice(t.indexOf('## PASSO 4'), t.indexOf('## PASSO 5'));
  assert.match(passo4, /node tools\/check-rules\.mjs outputs\/spec\/tech-rules/);
  const warning = t.slice(t.indexOf('### WARNING — não bloqueia, registrar e seguir'), t.indexOf('\n## ', t.indexOf('### WARNING — não bloqueia, registrar e seguir')));
  assert.match(warning, /^\| `RULES_SCRIPT_CHECK` \|/m);
});

// D46 (teste ponta a ponta de 2026-10-21): as rules geradas se contradiziam e o script dava exit 0 —
// `architecture` com dois módulos × `auth` e `data-model.json` com o módulo `acesso`; «sem
// dependências de runtime» × PostgreSQL. Só a spec-scaffold notou, depois.
const ARQ_DOIS_MODULOS = [
  '---', 'description: "Node.js 22 (JavaScript ESM, sem dependências de runtime na v1) — monolito modular"', '---',
  '# Arquitetura — Pedidos', '', '## Estrutura de Pastas', '', '```',
  'codigo/', '  src/', '    modules/', '      clientes/', '        domain/ application/ infrastructure/ http/',
  '      pedidos/', '        domain/        # desconto.js', '    shared/', '  test/', '```', '',
  '**MUST NOT:** `modules/pedidos` importar `modules/clientes/domain` direto.', '',
].join('\n');
const AUTH_ACESSO = '---\nalwaysApply: false\n---\n# Auth\n\n**MUST:** sessão validada em `src/modules/acesso/http/require-session.js`.\n';
const TESTES = "---\n---\n# Testes\n\n| Unitário | `test/modules/*/domain` |\n\n```js\nimport { desconto } from '../../src/modules/pedidos/domain/desconto.js';\n```\n";
const DATA_MODEL = { boundedContexts: [
  { id: 'BC-001', name: 'Clientes', moduleIds: ['MOD-CLIENTES'] },
  { id: 'BC-002', name: 'Pedidos', moduleIds: ['MOD-PEDIDOS'] },
  { id: 'BC-003', name: 'Acesso', moduleIds: [] },
] };
const BANCO = '---\ndescription: "PostgreSQL 16 — snake_case, PK uuid"\n---\n# Banco\n';
const contradicoes = (r) => r.out.achados.filter((a) => a.code === 'RULES_CONTRADICTION');

test('D46 — módulo citado nas rules ou no data-model.json fora da lista da architecture é RULES_CONTRADICTION (exit 1), com a lista', () => {
  cenario(({ fonte, rodar }) => {
    writeFileSync(join(fonte, 'architecture.mdc'), ARQ_DOIS_MODULOS);
    writeFileSync(join(fonte, 'auth.mdc'), AUTH_ACESSO);
    writeFileSync(join(fonte, 'test-strategy.mdc'), TESTES);
    writeFileSync(join(fonte, '..', 'data-model.json'), JSON.stringify(DATA_MODEL));
    const r = rodar();
    assert.equal(r.status, 1, JSON.stringify(r.out));
    const c = contradicoes(r).filter((a) => a.tipo === 'modulo');
    assert.deepEqual(c.map((a) => a.modulo), ['acesso'], 'clientes e pedidos estão na architecture; o glob `modules/*` não é módulo');
    assert.match(c[0].mensagem, /módulos da architecture: clientes, pedidos/);
    assert.match(c[0].mensagem, /auth\.mdc:6/);
    assert.match(c[0].mensagem, /data-model\.json \(BC-003 «Acesso»\)/);
  });
});

test('D46 — o módulo declarado na architecture (pasta ou MOD-) não é contradição; architecture sem pasta de módulos não é conferida', () => {
  cenario(({ fonte, rodar }) => {
    writeFileSync(join(fonte, 'architecture.mdc'), ARQ_DOIS_MODULOS.replace('      pedidos/', '      acesso/\n      pedidos/'));
    writeFileSync(join(fonte, 'auth.mdc'), AUTH_ACESSO);
    writeFileSync(join(fonte, '..', 'data-model.json'), JSON.stringify(DATA_MODEL));
    assert.deepEqual(contradicoes(rodar()).filter((a) => a.tipo === 'modulo'), []);
    // Sem a árvore de módulos não há lista contra a qual conferir: na dúvida, não acusa.
    writeFileSync(join(fonte, 'architecture.mdc'), '---\nalwaysApply: true\n---\n# Arquitetura em camadas\n');
    assert.deepEqual(contradicoes(rodar()), []);
  });
});

test('D46 — «sem dependências de runtime» × banco que exige driver é RULES_CONTRADICTION; com a exceção declarada, não', () => {
  cenario(({ fonte, rodar }) => {
    writeFileSync(join(fonte, 'architecture.mdc'), ARQ_DOIS_MODULOS);
    writeFileSync(join(fonte, 'database.mdc'), BANCO);
    let r = rodar();
    assert.equal(r.status, 1);
    const d = contradicoes(r).filter((a) => a.tipo === 'dependencia');
    assert.equal(d.length, 1, JSON.stringify(r.out.achados));
    assert.match(d[0].mensagem, /architecture\.mdc:2/);
    assert.match(d[0].mensagem, /PostgreSQL/);
    writeFileSync(join(fonte, 'architecture.mdc'), ARQ_DOIS_MODULOS.replace('sem dependências de runtime', 'sem dependências de runtime além do driver do PostgreSQL'));
    r = rodar();
    assert.deepEqual(contradicoes(r).filter((a) => a.tipo === 'dependencia'), []);
    // O `domain` «sem dependências» é regra de CAMADA, não de projeto: não conflita com o banco.
    writeFileSync(join(fonte, 'architecture.mdc'), '---\n---\n# Arquitetura\n\n| `domain` | regras puras | sem dependências externas |\n');
    assert.deepEqual(contradicoes(rodar()), []);
  });
});
