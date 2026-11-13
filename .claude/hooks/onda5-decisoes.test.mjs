// Harness Elo v2 — Decisões 68 a 72 (plano de melhoria das skills, Onda 5: sobreposições estruturais).
// Cada teste prende a forma escrita de uma decisão nas skills; o comportamento dos scripts envolvidos
// tem teste próprio (inject-sec, varrer-entrega, estimate-report-agregador).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => readFileSync(join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

// ————————————————————————— Decisão 68 — segurança do backlog —————————————————————————

test('Decisão 68 — o kernel de segurança lê o hld.md, o gaps.md e a stack da tech-rules', () => {
  const t = ler('.claude/skills/revisao-de-seguranca/SKILL.md');
  const entradas = t.slice(t.indexOf('### Entradas'), t.indexOf('### Passos'));
  for (const arq of ['hld.md', 'gaps.md', 'tech-rules-summary.md']) assert.match(entradas, new RegExp(`\`${arq.replace('.', '\.')}\``), `${arq} fora das entradas`);
  assert.match(t, /`INT-NN`/, 'o PG-A/PG-B não usa as integrações do HLD');
  assert.match(t, /\| `HLD_MISSING` \|/);
  // A stack não é mais pergunta de kickoff.
  const kickoff = t.slice(t.indexOf('## Kickoff (K)'), t.indexOf('## MODO'));
  assert.match(kickoff, /\*\*não é perguntada\*\*/);
  // A especificacao-tecnica.md do Explore está congelada no Tempo B: a skill não manda editá-la.
  assert.ok(!/referenciado por ID\*\* a partir da `especificacao-tecnica\.md`/.test(t));
  assert.match(t, /Congelamento do Explore/);
});

test('Decisão 68 — o kernel lê o gaps.md vivo do Plan (outputs/spec/) e só cai no do Explore, congelado, sem ele', () => {
  // No Plan quem grava os GAPs é a spec-iterate, em outputs/spec/gaps.md (spec/SKILL.md); o do
  // Explore está congelado desde a promoção. Ler só o do Explore perdia todo GAP aberto no Plan.
  const t = ler('.claude/skills/revisao-de-seguranca/SKILL.md');
  const entradas = t.slice(t.indexOf('### Entradas'), t.indexOf('### Passos'));
  const linha = entradas.split('\n').find((l) => l.includes('`gaps.md`')) ?? '';
  assert.match(linha, /`outputs\/spec\/`/, 'a entrada gaps.md não aponta o arquivo vivo do Plan');
  assert.match(linha, /`outputs\/explore\/`/, 'sem o do Plan, a entrada não diz que cai no do Explore');
  assert.ok(linha.indexOf('outputs/spec/') < linha.indexOf('outputs/explore/'), 'o do Plan vem primeiro');
  const fonte = t.slice(t.indexOf('## Fonte da verdade'), t.indexOf('## Kickoff (K)'));
  assert.match(fonte, /`outputs\/spec\/gaps\.md`/, 'a fonte da verdade ainda aponta o gaps.md congelado');
  assert.match(ler('.claude/skills/spec/SKILL.md'), /spec-iterate → outputs\/spec\/gaps\.md/, 'premissa: no Plan a spec-iterate grava em outputs/spec/');
});

test('Decisão 68 — a spec-security-review: KERNEL_CONSUMED FATAL e conferido por script; sem as duas contradições', () => {
  const t = ler('.claude/skills/spec-security-review/SKILL.md');
  assert.match(t, /^\| `KERNEL_CONSUMED` \|[^\n]*inject-sec\.mjs --kernel[^\n]*\| FATAL \|$/m);
  assert.match(t, /--kernel outputs\/spec\/plano-de-seguranca\.md/);
  assert.ok(!/DREAD não é usado/.test(t), 'a frase que contradizia o kernel (que usa DREAD) voltou');
  assert.ok(!/Esta skill consome; não deriva sozinha/.test(t), 'o resíduo da tabela de irmãs voltou');
});

// ————————————————————————— Decisão 69 — auditoria de código: um motor, uma regra —————————————————————————

test('Decisão 69 — uma regra de rastreio SEC, citada pelas duas auditorias e pela rule do Deliver', () => {
  const regra = ler('.claude/references/seguranca/rastreio-sec.md');
  assert.match(regra, /task `SEC-NNN` registrada no\s+backlog/);
  // Desde a Decisão 74 o GAP é o caminho do «não» (o usuário não quis criar a task agora).
  assert.match(regra, /registrar o `GAP-NNN` em `outputs\/spec\/gaps-document\.md`/);
  assert.match(regra, /BLOQUEADA/);
  for (const rel of ['.claude/skills/auditoria-de-us/SKILL.md', '.claude/skills/spec-code-audit/SKILL.md', '.claude/rules/harness/deliver.md']) {
    assert.match(ler(rel), /\.claude\/references\/seguranca\/rastreio-sec\.md/, `${rel} não cita a regra única`);
  }
  // As duas auditorias aceitam o mesmo par (SEC proposto + GAP) e bloqueiam sem a task no backlog.
  const us = ler('.claude/skills/auditoria-de-us/SKILL.md').match(/^\| `GOLDEN_RULE_GAP` \|([^\n]*)$/m)[1];
  const repo = ler('.claude/skills/spec-code-audit/SKILL.md').match(/^\| `GOLDEN_RULE_TRACEABILITY` \|([^\n]*)$/m)[1];
  for (const linha of [us, repo]) {
    assert.match(linha, /proposto/);
    assert.match(linha, /gaps-document\.md/);
    assert.match(linha, /BLOQUEAD[AO]/);
  }
});

test('Decisão 69 — o mesmo motor determinístico nos três escopos', () => {
  assert.match(ler('.claude/skills/auditoria-de-us/SKILL.md'), /varrer-entrega\.mjs --desde-o-ramo/);
  assert.match(ler('.claude/skills/spec-code-audit/SKILL.md'), /varrer-entrega\.mjs --tudo/);
  assert.match(ler('.claude/skills/spec-implement/SKILL.md'), /validar\.mjs/);
});

// ————————————————————————— Decisão 71 — spec-frame fora do fluxo padrão —————————————————————————

test('Decisão 71 — a spec-frame fica no kit, mas fora do fluxo padrão', () => {
  // Mantida: a skill continua lá, e o orquestrador a oferece só como opcional.
  assert.match(ler('.claude/skills/spec-frame/SKILL.md'), /^name: spec-frame$/m);
  const spec = ler('.claude/skills/spec/SKILL.md');
  assert.match(spec, /\[spec-frame\] → spec-ingest/, 'o orquestrador deixou de marcá-la opcional');
  // Neste harness o pré-projeto do Explore é o enquadramento: o Plan não a roda. A linha dizia só
  // «Não roda:», e o teste ponta a ponta da 2.6.0 achou o efeito (D2): lida junto com a `explore.md`,
  // que não a citava, a skill não tinha fase nenhuma. Agora a linha diz QUE fase não é a dela e
  // aponta a que é.
  const linhaDoPlan = ler('.claude/rules/harness/plan.md').match(/^\| `spec-frame` \|([^\n]*)$/m);
  assert.ok(linhaDoPlan, 'a spec-frame sumiu da tabela do Tempo A');
  assert.match(linhaDoPlan[1], /^ Não roda no Plan: /);
  assert.match(linhaDoPlan[1], /explore\.md/, 'a linha do Plan não aponta onde a skill roda');
});

test('Decisão 71 — fora do fluxo PADRÃO não é proibida: no Explore ela é acelerador opcional, antes da spec-ingest', () => {
  // A Decisão 71 tirou a spec-frame do fluxo padrão e não a proibiu. O lugar dela é o Explore, para
  // pedido vago, ANTES da spec-ingest — é a ordem que o orquestrador do kit usa e a que a skill pede
  // («Fase 1»). Sem a frase na rule do Explore, a whitelist que deixa gravar `frame.md` (kit.mjs)
  // seria maquinário sem contrato.
  const explore = ler('.claude/rules/harness/explore.md');
  const ordem = explore.slice(explore.indexOf('## Ordem interna'), explore.indexOf('## Aceleradores opcionais'));
  assert.ok(ordem.includes('`spec-frame`'), 'a ordem interna do Explore não cita a spec-frame');
  assert.ok(ordem.indexOf('`spec-frame`') < ordem.indexOf('`spec-ingest`'), 'a spec-frame tem que vir antes da spec-ingest');
  const acel = explore.slice(explore.indexOf('## Aceleradores opcionais'), explore.indexOf('## Protótipo'));
  assert.match(acel, /`spec-frame`/);
  assert.match(acel, /vago/, 'a rule não diz quando a spec-frame se aplica');
  assert.match(acel, /Decisão 71/);
  assert.match(acel, /fluxo padrão/, 'a rule não diz que ela está fora do fluxo padrão');
  assert.match(acel, /`outputs\/spec\/frame\.md`/, 'a rule não diz onde a saída mora');
});

// ————————————————————————— Decisão 72 — spec-convert-prototype —————————————————————————

test('Decisão 72 — a spec-convert-prototype converte protótipo externo e grava em outputs/spec/', () => {
  const t = ler('.claude/skills/spec-convert-prototype/SKILL.md');
  assert.match(t, /## Âmbito — quando usar esta skill \(Decisão 72\)/);
  assert.ok(!/(^|[^/])docs\//m.test(t), 'sobrou artefato em docs/');
  for (const arq of ['pending-legacy.md', 'pending-rule.md', 'legacy-parity-matrix.md', 'frontend-md-verification.md']) {
    assert.ok(t.includes(`outputs/spec/convert-prototype/${arq}`), `${arq} fora de outputs/spec/convert-prototype/`);
  }
  assert.match(t, /--verification <RAIZ>\/outputs\/spec\/convert-prototype\/frontend-md-verification\.md/);
  assert.ok(!ler('.claude/skills/spec-convert-prototype/templates/verify-frontend-md-compliance.mjs').includes('docs/'));
  // O protótipo de fidelidade Alta já nasce no padrão: não passa pela convert, nas duas skills.
  assert.match(t, /em fidelidade \*\*Alta\*\* não passa por aqui/);
  const proto = ler('.claude/skills/spec-prototype/SKILL.md');
  assert.ok(!/base para `spec-convert-prototype`\/`spec-implement`/.test(proto));
  assert.ok(!/serviços reais é do `spec-convert-prototype`/.test(proto));
  assert.match(proto, /o de fidelidade Alta não passa por ela/);
});

// ————————————————————————— Decisão 74 — perguntar e criar a task SEC pelo MCP —————————————————————————

test('Decisão 74 — achado SEC sem task: a auditoria pergunta se cria; com sim, cria no tasks.json e no ADO pelo MCP', () => {
  const regra = ler('.claude/references/seguranca/rastreio-sec.md');
  assert.match(regra, /Decisão 74/);
  assert.match(regra, /\*\*Perguntar\*\* ao usuário/);
  assert.match(regra, /inject-sec\.mjs outputs\/spec\/tasks\.json .* --acrescentar/);
  assert.match(regra, /MCP do Azure DevOps/);
  assert.match(regra, /`logical-id:SEC-NNN`/);
  assert.match(regra, /`outputs\/spec\/id-map\.json`/);
  // Com «não», ou com o MCP falhando, o achado continua aberto — o bloqueio da Decisão 69 fica.
  assert.match(regra, /\*\*Não\*\*/);
  assert.match(regra, /BLOQUEADA/);
  assert.ok(!/Quem audita não cria task no backlog/.test(regra), 'a frase antiga contradiz o fluxo novo');
  for (const rel of ['.claude/skills/auditoria-de-us/SKILL.md', '.claude/skills/spec-code-audit/SKILL.md']) {
    const t = ler(rel);
    assert.match(t, /pergunta[^.]*se\s+quer\s+criar/, `${rel} não pergunta`);
    assert.match(t, /Decisão 74/, rel);
  }
  assert.ok(!/esta skill \*\*não\*\* escreve em `tasks\.json` nem\s+cria work items no ADO/.test(ler('.claude/skills/spec-code-audit/SKILL.md')));
  assert.match(ler('.claude/rules/harness/deliver.md'), /pergunta se cria a task/);
});
