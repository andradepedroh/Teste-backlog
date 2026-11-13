// Harness Elo v2 — correções de prosa das skills e das rules (plano de melhoria das skills, Onda 1).
//
// Cada teste prende um defeito confirmado na Onda 0 (MANUTENCAO.md, seção «Plano de melhoria das
// skills — Onda 1») e, sempre que dá, DERIVA o valor certo da fonte em vez de fixá-lo — para que a
// próxima renumeração do upstream fique vermelha aqui em vez de voltar a divergir em silêncio.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => readFileSync(join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

// ————————————————————————— 1.2 — nome de cliente real não entra no pacote —————————————————————————

test('1.2 — nenhum arquivo do maquinário nem do registro cita os nomes de cliente que estavam nos exemplos', () => {
  // Os nomes entram só como hash (SHA-256, 16 primeiros dígitos), para este próprio arquivo não
  // carregá-los: os quatro dos exemplos da spec-status-report e da spec-estimate-report, e dois que
  // identificavam o projeto de referência no conteúdo do `report-data.example.json` (revisão de riscos).
  // Comparação por palavra, sem caixa e sem acento.
  const proibidos = new Set(['09fdc8b0a4193b23', '47dbeeaa606a052a', 'fa822a2a83e4843a',
    '05a72eebcf26461f', '2d4370fb2f28d73a', '450cb26dd262af63']);
  const hash = (w) => createHash('sha256').update(w).digest('hex').slice(0, 16);
  const vistos = new Map();
  const proibida = (w) => { if (!vistos.has(w)) vistos.set(w, proibidos.has(hash(w))); return vistos.get(w); };
  const palavras = (l) => l.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]+/g) || [];
  const achados = [];
  const conferir = (p) => {
    readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
      if (palavras(l).some(proibida)) achados.push(`${relative(RAIZ, p)}:${i + 1}`);
    });
  };
  const varrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) { varrer(p); continue; }
      // `.patch` e `.tgz` do registro ficam fora: são pontos de controle locais, ignorados pelo git.
      if (!/\.(md|mdc|mjs|js|json|py|yml|yaml|html|css|txt)$/i.test(e.name)) continue;
      conferir(p);
    }
  };
  // `docs/` não viaja no zip, mas vai para o histórico do repositório no ADO.
  for (const raiz of ['.claude', 'docs', 'CLAUDE.md', 'README.md', 'MANUTENCAO.md', 'harness.json']) {
    const p = join(RAIZ, raiz);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) varrer(p);
    else conferir(p);
  }
  assert.deepEqual(achados, []);
});

// ————————————————————————— 1.3 — spec-benchmark × template da spec-ingest —————————————————————————

test('1.3 — o status quo da spec-benchmark sai da seção de Sistemas Existentes do discovery-document', () => {
  const tpl = ler('.claude/skills/spec-ingest/templates/discovery-document.md');
  const m = tpl.match(/^## (\d+)\. Sistemas Existentes/m);
  assert.ok(m, 'o template da spec-ingest não tem mais a seção "Sistemas Existentes"');
  const secao = m[1];
  const bench = ler('.claude/skills/spec-benchmark/SKILL.md');
  const frase = bench.match(/`discovery-document\.md` Seção (\d+)( \([^)]*\))? \(quando não há legacy\)/);
  assert.ok(frase, 'a frase do status quo sumiu da spec-benchmark');
  assert.equal(frase[1], secao, `a spec-benchmark aponta a Seção ${frase[1]}, mas Sistemas Existentes é a ${secao}`);
});

// ————————————————————————— 1.4 — Story de UAT × NO_UAT_BACKLOG —————————————————————————

test('1.4 — enquanto a spec-tasks proíbe backlog de UAT, nem a rule do Plan nem o hook prometem uma Story de UAT', () => {
  // SKILL.md + a tabela de validators, que saiu para references/ na Onda 4 (P5).
  const tasks = ler('.claude/skills/spec-tasks/SKILL.md') + ler('.claude/skills/spec-tasks/references/validators.md');
  // A premissa: o FATAL existe. Se o upstream o tirar, este teste precisa ser repensado — não só apagado.
  assert.match(tasks, /\| `NO_UAT_BACKLOG` \| \*\*FATAL\*\*/);
  for (const rel of ['.claude/rules/harness/plan.md', '.claude/hooks/cadeia.mjs']) {
    assert.ok(!/Story de UAT/i.test(ler(rel)), `${rel} ainda promete uma Story de UAT`);
  }
  // A OUTRA PONTA: a razão de a spec-test-plan vir antes continua dita — agora a verdadeira.
  const plan = ler('.claude/rules/harness/plan.md');
  assert.match(plan, /`test-plan\.md` é a fonte dos cenários de aceite/);
});

// ————————————————————————— 1.8 — spec-convert-prototype em português do Brasil —————————————————————————

test('1.8 — a spec-convert-prototype não tem mais português de Portugal na prosa', () => {
  const t = ler('.claude/skills/spec-convert-prototype/SKILL.md');
  // O inventário da Onda 0 (65 ocorrências). `COMMANDS_ACTUALLY_EXECUTED` é código de validador e
  // não casa: as formas abaixo são palavras inteiras da prosa.
  const ptpt = /Objectivo|projecto|\bexact[ao]|exactamente|correc[çt]|directamente|reflectir|\bregistar\b|\bregisto\b|\bcorr(er|em|ido)\b|intermédi|\brever\b|\baceite\b|\bpartilhad|rebentam|saltada|falhados|género|até ao\b|a meio\b|avançares|\bvais\b|\baceder\b/i;
  const linhas = t.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => ptpt.test(l));
  assert.deepEqual(linhas.map(([n, l]) => `${n}: ${l.match(ptpt)[0]}`), []);
  assert.match(t, /COMMANDS_ACTUALLY_EXECUTED/, 'o código do validador não pode ter sido tocado');
});

// ————————————————————————— 1.10 — o ambiente= do kickoff tem de onde vir —————————————————————————

test('1.10 — o orquestrador deriva o ambiente= do harness.json, e a regra cobre os três runtimes', () => {
  const t = ler('.claude/skills/spec/SKILL.md');
  const ini = t.indexOf('### Persistir o kickoff');
  const bloco = t.slice(ini, t.indexOf('\n---', ini));
  assert.ok(ini > 0, 'a seção "Persistir o kickoff" sumiu');
  assert.match(bloco, /ambiente=<cursor\|claude\|kiro\|ambos>/);
  assert.match(bloco, /`harness\.json`/);
  assert.match(bloco, /`runtime\.rotulo`/);
  // A regra escrita na skill: "começa com `X` → `y`".
  const regra = [...bloco.matchAll(/começa com `([^`]+)` → `([a-z]+)`/g)].map((m) => [m[1], m[2]]);
  assert.ok(regra.length >= 3, 'a regra de derivação não está escrita no formato "começa com `X` → `y`"');
  const derivar = (r) => regra.find(([prefixo]) => r.startsWith(prefixo))?.[1];
  // Os rótulos REAIS que cada versão grava: o da fonte (Claude Code) e os dos dois geradores.
  // Este teste também roda dentro das saídas Kiro e Cursor (`--verificar`), onde o harness.json é o
  // daquela versão — então o rótulo local só precisa cair num dos três, não ser o do Claude Code.
  assert.equal(derivar('Claude Code'), 'claude');
  // Os geradores só existem na fonte (não viajam nas saídas Kiro e Cursor).
  for (const [gerador, esperado] of [['gerar-cursor.mjs', 'cursor'], ['gerar-kiro.mjs', 'kiro']]) {
    const rel = `.claude/ferramentas/${gerador}`;
    if (existsSync(join(RAIZ, rel))) assert.equal(derivar(ler(rel).match(/rotulo: '([^']+)'/)[1]), esperado, gerador);
  }
  assert.ok(['claude', 'cursor', 'kiro'].includes(derivar(JSON.parse(ler('harness.json')).runtime.rotulo)),
    'o rótulo do harness.json desta versão não é coberto pela regra');
  // Sem harness.json, a pergunta existe — ninguém fica sem ter de onde tirar o valor.
  assert.match(bloco, /Sem `harness\.json`/);
  // O formato canônico (task-pipeline.md §4) e a mensagem do fecho-explore listam o kiro também.
  assert.match(ler('.claude/skills/tools/references/task-pipeline.md'), /ambiente=<cursor\|claude\|kiro\|ambos>/);
  assert.match(ler('.claude/hooks/fecho-explore.mjs'), /ambiente: '<cursor\|claude\|kiro\|ambos>'/);
});

// ————————————————————————— 1.5 — spec-code-audit: caminho e Regra de Ouro —————————————————————————

test('1.5a — o code-audit.md mora onde o paths.md do kit diz, e quem o procura o acha', () => {
  const paths = ler('.claude/skills/tools/references/paths.md');
  const linha = paths.match(/^\|\s*\d+\s*\|\s*spec-code-audit\s*\|\s*code-audit\.md\s*\|\s*`([^`]+)`\s*\|/m);
  assert.ok(linha, 'o paths.md não tem mais a linha da spec-code-audit');
  const esperado = `${linha[1].replace(/\/?$/, '/')}code-audit.md`;
  assert.equal(esperado, 'outputs/spec/code-audit.md', 'a raiz única é outputs/spec/ (CLAUDE.md)');

  const skill = ler('.claude/skills/spec-code-audit/SKILL.md');
  assert.match(skill, new RegExp(`^\\*\\*Path:\\*\\* \`${esperado.replace(/\./g, '\\.')}\``, 'm'));
  assert.ok(!/outputs\/code-audit\//.test(skill), 'sobrou o caminho fora da raiz única');

  // Os dois leitores: o check-outputs.py (relativo a outputs/spec) e o descobridor da status-report.
  const check = ler('.claude/skills/tools/check-outputs.py');
  assert.match(check, /\("code-audit\.md", OPTIONAL,/);
  assert.ok(!/\.\.\/code-audit/.test(check), 'o check-outputs.py ainda procura fora de outputs/spec/');
  const descobre = ler('.claude/skills/spec-status-report/lib/discover-artifacts.mjs');
  const aliases = descobre.match(/"code-audit\.md": \[([^\]]*)\]/);
  assert.ok(aliases && /"code-audit\.md"/.test(aliases[1]), 'a spec-status-report não acharia o relatório');
});

test('1.5b — a Regra de Ouro da spec-code-audit é cumprível pela própria skill e não afrouxa o deploy', () => {
  const skill = ler('.claude/skills/spec-code-audit/SKILL.md');
  const gate = skill.match(/^\| `GOLDEN_RULE_TRACEABILITY` \|([^\n]*)$/m);
  assert.ok(gate, 'o validador sumiu');
  assert.match(gate[1], /\| FATAL \|?\s*$/, 'continua FATAL');
  assert.match(gate[1], /proposto/, 'aceita o SEC-NNN proposto quando a task ainda não existe');
  assert.match(gate[1], /gaps-document\.md/, 'exige o GAP registrado');
  assert.match(gate[1], /BLOQUEADO/, 'o finding sem task no backlog continua bloqueando o deploy');
  // A condição 8 da Decisão de Deploy continua exigindo a task registrada — proposta não basta.
  const tpl = ler('.claude/skills/spec-code-audit/templates/code-audit.template.md');
  assert.match(tpl, /\| Todo SEC CRÍTICO\/ALTO tem task SEC registrada \(I\.3\) \| ✅ \/ ❌ \|/);
});

// ————————————————————————— 1.7 — um nível WCAG só, declarado na rule de frontend —————————————————————————

test('1.7 — WCAG 2.2 AA declarado na rule de frontend do harness e no padrão da spec-tech-rules', () => {
  // O CLAUDE.md diz que a rule de frontend é a dona do nível WCAG; a description dela também. Faltava o corpo.
  for (const rel of ['.claude/rules/harness/frontend.md', '.claude/skills/spec-tech-rules/templates/frontend-default.mdc']) {
    const t = ler(rel);
    const secao = t.slice(t.indexOf('## Acessibilidade'), t.indexOf('## Decisões: dados e mutações'));
    assert.ok(t.includes('## Acessibilidade'), `${rel} sem a seção Acessibilidade`);
    assert.match(secao, /\*\*MUST:\*\* nível mínimo \*\*WCAG 2\.2 AA\*\*/, rel);
  }
});

test('1.7 — a pergunta 9.2 da spec-tech-rules virou informação lida da rule de frontend', () => {
  const blocos = ler('.claude/skills/spec-tech-rules/references/kickoff-blocos.md');
  const p92 = blocos.slice(blocos.indexOf('**9.2 — Acessibilidade'), blocos.indexOf('**9.3 —'));
  assert.match(p92, /não é perguntada/);
  assert.match(p92, /WCAG 2\.2 AA/);
  // Endereço sem fixar a pasta: as saídas Kiro e Cursor reescrevem o caminho da rule do harness.
  assert.match(p92, /harness[/-]frontend\.mdc?/);
  assert.ok(!/Nível mínimo de acessibilidade\?/.test(p92), 'a pergunta antiga voltou');
  assert.ok(!/WCAG 2\.1 AA\s+←\s+recomendado/.test(blocos), 'a recomendação de 2.1 AA voltou');
  const ph = ler('.claude/skills/spec-tech-rules/references/placeholders.md').split('\n').find((l) => l.startsWith('| `{{A11Y_LEVEL}}` |'));
  assert.match(ph, /WCAG 2\.2 AA/);
  assert.ok(!/\| Decisão 9\.2 \|$/.test(ph), 'o placeholder ainda sai de uma decisão do kickoff');
});

// ————————————————— revisão de riscos, item 4 — a constituição de frontend chega a quem gera tela —————————————————

test('Revisão de riscos 4 — quem gera tela lê a constituição de frontend do harness explicitamente', () => {
  // Três mudanças do pacote se somavam: a `harness/frontend.md` ganhou `paths:` (só carrega ao abrir
  // arquivo de tela da raiz do harness — o código pode estar num repositório irmão, ou ainda não
  // existir); a Decisão 73 deixou de materializar o `frontend-default.mdc`; e o `frontend` da raiz é
  // o complemento do projeto, que remetia ao `frontend-default.mdc`. Quem gera tela não pode depender
  // do carregamento automático. Sem fixar a pasta: as saídas Kiro e Cursor reescrevem o endereço.
  const constituicao = /`[^`\s]*harness[/-]frontend\.mdc?`/;
  const pipeline = ler('.claude/skills/tools/references/task-pipeline.md');
  const secao3 = pipeline.slice(pipeline.indexOf('## 3. Resolução de rules'), pipeline.indexOf('## 4.'));
  assert.match(secao3, constituicao, 'a resolução de rules do kit não cita a constituição do harness');
  const prototype = ler('.claude/skills/spec-prototype/SKILL.md');
  const gate30 = prototype.slice(prototype.indexOf('### 3.0 — Gate de ARQUITETURA'), prototype.indexOf('### 3.0.1'));
  assert.match(gate30, constituicao, 'o Passo 3.0 da spec-prototype não cita a constituição do harness');
  const convert = ler('.claude/skills/spec-convert-prototype/SKILL.md');
  const resolucao = convert.slice(convert.indexOf('## Resolução da rule'), convert.indexOf('## Kickoff'));
  assert.match(resolucao, constituicao, 'a resolução da spec-convert-prototype não cita a constituição do harness');
  const implement = ler('.claude/skills/spec-implement/SKILL.md');
  const resolve = implement.slice(implement.indexOf('## Resolve rules location'), implement.indexOf('## B —'));
  assert.match(resolve, constituicao, 'o Resolve rules location da spec-implement não cita a constituição do harness');
  // O complemento do projeto remete à constituição, não só a um arquivo que não está mais lá.
  const stub = ler('.claude/skills/spec-tech-rules/templates/frontend.mdc');
  for (const l of stub.split('\n').filter((x) => /frontend-default\.mdc/.test(x))) assert.match(l, constituicao, l);
});

test('Revisão de riscos 7b — a auditoria-de-us lê o gaps.md vivo do Plan, não o congelado do Explore', () => {
  // No Deliver os GAPs vivem em outputs/spec/gaps.md (a spec-iterate os mantém desde o Plan); o do
  // Explore está congelado desde a promoção — GAP já fechado no Plan parecia aberto, e GAP novo sumia.
  const t = ler('.claude/skills/auditoria-de-us/SKILL.md');
  const entradas = t.slice(t.indexOf('## Entradas'), t.indexOf('\n## ', t.indexOf('## Entradas') + 3));
  const linha = entradas.split('\n').find((l) => l.includes('`gaps.md`')) ?? '';
  assert.match(linha, /`outputs\/spec\/`/, 'a entrada gaps.md da auditoria-de-us não aponta o arquivo vivo do Plan');
});
