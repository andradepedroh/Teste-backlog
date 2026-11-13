// As invariantes da migração das duas skills do v1.
//
// Ele varre `.claude/skills/`, que a partir da Tarefa 7 contém TAMBÉM as 26 skills vendorizadas
// do kit — e é de propósito: um caminho morto do v1 é defeito onde ele estiver.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function markdown(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...markdown(p));
    else if (extname(e.name) === '.md') out.push(p);
  }
  return out;
}

test('as duas skills, as referências e os dois templates existem', () => {
  for (const rel of [
    '.claude/skills/auditoria-de-us/SKILL.md',
    '.claude/skills/auditoria-de-us/templates/relatorio-us.template.md',
    '.claude/skills/revisao-de-seguranca/SKILL.md',
    '.claude/skills/revisao-de-seguranca/templates/plano-de-seguranca.template.md',
    '.claude/references/seguranca/vetores.md',
    '.claude/templates/workspace.md',
    '.claude/templates/em-andamento.md',
    '.claude/templates/isencao.md',
  ]) {
    assert.ok(existsSync(join(RAIZ, rel)), `falta ${rel}`);
  }
});

test('o template de injeção ADO do modo por-us foi removido', () => {
  assert.ok(!existsSync(join(RAIZ, '.claude/skills/revisao-de-seguranca/templates/injecao-ado.template.md')));
});

test('a revisao-de-seguranca não menciona mais o modo por-us', () => {
  const txt = readFileSync(join(RAIZ, '.claude/skills/revisao-de-seguranca/SKILL.md'), 'utf8');
  assert.ok(!/por-us/i.test(txt), 'o modo por-us ainda é mencionado');
  assert.match(txt, /plano-geral/);
});

test('nenhum arquivo do template cita caminho aposentado', () => {
  // PONTA 1: o caminho velho sumiu — e sumiria também se alguém apagasse a linha inteira.
  const alvos = [
    ...markdown(join(RAIZ, '.claude/skills')),
    ...markdown(join(RAIZ, '.claude/templates')),
    ...markdown(join(RAIZ, '.claude/references')),
  ];
  for (const path of alvos) {
    const txt = readFileSync(path, 'utf8');
    for (const morto of ['docs/plan/', 'docs/deliver/', 'docs/explore/', '.claude/guides/']) {
      assert.ok(!txt.includes(morto), `${path} ainda cita ${morto}`);
    }
  }
});

// ————————————————— A DUAS PONTAS, e é o que separa "adaptado" de "apagado" —————————————————
//
// O teste acima prova que o caminho velho sumiu. Ele passaria também se alguém deletasse a linha
// inteira, deixando a skill sem dizer onde escrever. Os três abaixo exigem o caminho NOVO,
// nominalmente. É a mesma medição da regra C do `acharMalFormados`.

test('a revisao-de-seguranca escreve o kernel onde o cadeia.mjs o cobra', () => {
  const txt = readFileSync(join(RAIZ, '.claude/skills/revisao-de-seguranca/SKILL.md'), 'utf8');
  assert.match(txt, /outputs\/spec\/plano-de-seguranca\.md/,
    'a skill não diz mais onde escreve o kernel — e a tabela do cadeia.mjs o cobra em outputs/spec/');
});

test('a auditoria-de-us escreve o relatório no DIR_AUDITORIAS', () => {
  const txt = readFileSync(join(RAIZ, '.claude/skills/auditoria-de-us/SKILL.md'), 'utf8');
  assert.match(txt, /outputs\/spec\/auditorias\//);
  assert.match(txt, /outputs\/spec\/em-andamento\.md/, 'o marcador da US mudou de caminho e a skill tem que saber');
});

test('a auditoria-de-us parou de afirmar que não usa outputs/spec/ nem tasks.json', () => {
  // O AJUSTE DE PREMISSA, e é o mais fácil de esquecer porque não é caminho: é uma AFIRMAÇÃO.
  // No v2 o Plan É o kit, e a ficha da US mora no tasks.json. Uma skill que ensina a ignorar a
  // fonte que o harness declara como dona é pior que uma skill com caminho errado.
  const txt = readFileSync(join(RAIZ, '.claude/skills/auditoria-de-us/SKILL.md'), 'utf8');
  assert.ok(!/sem depender de plugin/i.test(txt), 'a premissa de independência do kit continua escrita');
  assert.match(txt, /tasks\.json/, 'a skill tem que dizer que a ficha da US vem do tasks.json');
});

test('o template de workspace aponta o manifesto para a raiz, não para docs/', () => {
  const txt = readFileSync(join(RAIZ, '.claude/templates/workspace.md'), 'utf8');
  assert.ok(!txt.includes('docs/workspace.md'), 'o template ainda aponta docs/workspace.md');
});

test('o bloco de isenção do template é o que o gate reconhece', () => {
  // A DUAS PONTAS com o dono da gramática: o `montarIsencao` do `fecho-explore.mjs` monta o bloco
  // e o `parseIsencao` o lê. Um template com o bloco escrito à mão divergiria em silêncio, e o
  // consultor preencheria um arquivo que o gate não honra — falso positivo em bloqueante, a pior
  // categoria sob o modelo de ameaça.
  const txt = readFileSync(join(RAIZ, '.claude/templates/isencao.md'), 'utf8');
  assert.match(txt, /<!--\s*gate:isencao\s*-->/);
  assert.match(txt, /<!--\s*\/gate:isencao\s*-->/);
});

test('nenhuma rule nem template promete o arquitetura-solucao.md, e a spec-hld esta na tabela do Plan', () => {
  // Quatro sites vivos, varridos em 2026-09-09. As Tarefas 5 e 6 fecharam os dois do kit.mjs;
  // este teste fecha os dois de texto — e o segundo é o que se perde: um comentário HTML dentro
  // de um template do Explore, que nenhum outro teste lê. Sem esta asserção, o template continua
  // dizendo que é ancestral de um artefato que nenhuma skill escreve.
  const plan = readFileSync(join(RAIZ, '.claude/rules/harness/plan.md'), 'utf8');
  const tecnica = readFileSync(join(RAIZ, '.claude/templates/especificacao-tecnica.md'), 'utf8');

  assert.ok(!plan.includes('arquitetura-solucao'), 'a rule do Plan ainda promete o nome morto');
  assert.ok(!tecnica.includes('arquitetura-solucao'), 'o template do Explore ainda cita o nome morto');

  // AS DUAS PONTAS: sem estas, apagar o nome morto e não pôr nada no lugar passaria.
  assert.match(plan, /`spec-hld`/, 'a spec-hld não aparece na rule do Plan');
  assert.match(plan, /`hld\.md`/, 'o hld.md não aparece na rule do Plan');
  assert.match(tecnica, /`hld\.md`/, 'o template do Explore não diz de quem é ancestral');
});

// ————— Achado da Tarefa 7 (revisão): a renumeração da tabela do Tempo B ficou conferida SÓ —————
// ————— dentro da própria plan.md. A revisao-de-seguranca cita a ordem em texto, noutro —————
// ————— arquivo, e ficou desalinhada. O guarda abaixo DERIVA a ordem esperada da tabela — —————
// ————— não a fixa como literal — para não virar a mesma duplicação num terceiro lugar. —————

function extrairOrdemDaTabelaTempoB(planTxt) {
  // Isola só a seção "## Tempo B" (até o próximo "## "), para não pegar linha de outra tabela.
  const inicio = planTxt.indexOf('## Tempo B');
  assert.ok(inicio >= 0, 'a seção "## Tempo B" sumiu da plan.md');
  const fimRel = planTxt.slice(inicio + 1).indexOf('\n## ');
  const secao = fimRel >= 0 ? planTxt.slice(inicio, inicio + 1 + fimRel) : planTxt.slice(inicio);

  const porSkill = new Map();
  const linhaRe = /^\|\s*(\d+)\s*\|\s*`([a-z0-9-]+)`/gm;
  let m;
  while ((m = linhaRe.exec(secao)) !== null) {
    porSkill.set(m[2], Number(m[1]));
  }
  return porSkill;
}

test('a tabela do Tempo B tem revisao-de-seguranca e spec-tasks numeradas (pré-condição do guarda)', () => {
  const plan = readFileSync(join(RAIZ, '.claude/rules/harness/plan.md'), 'utf8');
  const ordem = extrairOrdemDaTabelaTempoB(plan);
  assert.ok(ordem.has('revisao-de-seguranca'), 'a tabela não lista a revisao-de-seguranca');
  assert.ok(ordem.has('spec-tasks'), 'a tabela não lista a spec-tasks');
});

test('a revisao-de-seguranca cita a MESMA ordem que a tabela do Tempo B diz, sempre que a tabela mudar', () => {
  // Achado da revisão da Tarefa 7: a renumeração (spec-hld entrando como ordem 2) empurrou a
  // revisao-de-seguranca de 2→3 e a spec-tasks de 6→7 — e o SKILL.md, que cita as duas em prosa,
  // ficou com "ordem 2"/"ordem 6" desatualizados nos quatro sites abaixo. A auto-revisão da
  // Tarefa 7 só conferiu a renumeração DENTRO da plan.md; este teste é a segunda ponta, no outro
  // arquivo. Ele não fixa "3" nem "7": deriva os dois da própria tabela, então uma renumeração
  // futura sem atualizar a prosa também vai vermelho aqui — sem precisar editar este teste.
  const plan = readFileSync(join(RAIZ, '.claude/rules/harness/plan.md'), 'utf8');
  const ordem = extrairOrdemDaTabelaTempoB(plan);
  const ordemSelf = ordem.get('revisao-de-seguranca');
  const ordemSpecTasks = ordem.get('spec-tasks');
  assert.ok(Number.isInteger(ordemSelf), 'ordem da revisao-de-seguranca não é um número');
  assert.ok(Number.isInteger(ordemSpecTasks), 'ordem da spec-tasks não é um número');

  const skillTxt = readFileSync(join(RAIZ, '.claude/skills/revisao-de-seguranca/SKILL.md'), 'utf8');

  // Site 1 — frontmatter: "logo após a spec-hld" (adjacência, não número — vira ordemSelf-1;
  // conferido separadamente pelo teste de adjacência abaixo).

  // Site 2 — "> **Posição no harness:** ... (ordem N: depois da spec-tech-rules...".
  const site2 = skillTxt.match(/Posição no harness:.*?\(ordem (\d+):/s);
  assert.ok(site2, 'site 2 (bloco "Posição no harness") não citou "(ordem N:" mais');
  assert.equal(Number(site2[1]), ordemSelf,
    `site 2 cita ordem ${site2[1]}, a tabela diz ${ordemSelf} para revisao-de-seguranca`);

  // Site 3 — "esta skill roda ANTES da `spec-tasks` (Tempo B, ordem N contra ordem M)".
  const site3 = skillTxt.match(/ANTES da `spec-tasks` \(Tempo B, ordem (\d+) contra ordem (\d+)\)/);
  assert.ok(site3, 'site 3 ("ordem N contra ordem M") não foi encontrado');
  assert.equal(Number(site3[1]), ordemSelf,
    `site 3 cita ordem própria ${site3[1]}, a tabela diz ${ordemSelf}`);
  assert.equal(Number(site3[2]), ordemSpecTasks,
    `site 3 cita ordem ${site3[2]} para a spec-tasks, a tabela diz ${ordemSpecTasks}`);

  // Site 4 — "## MODO `plano-geral` (Tempo B, ordem N — macro)".
  const site4 = skillTxt.match(/## MODO `plano-geral` \(Tempo B, ordem (\d+) — macro\)/);
  assert.ok(site4, 'site 4 (título do modo plano-geral) não citou "ordem N — macro"');
  assert.equal(Number(site4[1]), ordemSelf,
    `site 4 cita ordem ${site4[1]}, a tabela diz ${ordemSelf}`);

  // Site 5 — "...na `spec-tasks` (ordem N), então ainda não existe destino...".
  const site5 = skillTxt.match(/na `spec-tasks` \(ordem (\d+)\)/);
  assert.ok(site5, 'site 5 ("spec-tasks (ordem N)") não foi encontrado');
  assert.equal(Number(site5[1]), ordemSpecTasks,
    `site 5 cita ordem ${site5[1]} para a spec-tasks, a tabela diz ${ordemSpecTasks}`);
});

test('a revisao-de-seguranca continua "logo após" quem a tabela do Tempo B põe imediatamente antes dela', () => {
  // A frase de adjacência do frontmatter ("logo após a X") é a mesma classe de citação de posição
  // que os quatro sites acima — só que em nome de skill, não em número. Deriva-se também da
  // tabela: quem está na ordem imediatamente anterior à da revisao-de-seguranca.
  const plan = readFileSync(join(RAIZ, '.claude/rules/harness/plan.md'), 'utf8');
  const ordem = extrairOrdemDaTabelaTempoB(plan);
  const ordemSelf = ordem.get('revisao-de-seguranca');
  const anterior = [...ordem.entries()].find(([, n]) => n === ordemSelf - 1);
  assert.ok(anterior, `nenhuma skill ocupa a ordem ${ordemSelf - 1} (logo antes da revisao-de-seguranca)`);

  const skillTxt = readFileSync(join(RAIZ, '.claude/skills/revisao-de-seguranca/SKILL.md'), 'utf8');
  const site1 = skillTxt.match(/logo após a ([a-z0-9-]+) e antes da\s*\n?\s*spec-tasks/);
  assert.ok(site1, 'site 1 (frontmatter, "logo após a X e antes da spec-tasks") não foi encontrado');
  assert.equal(site1[1], anterior[0],
    `frontmatter diz "logo após a ${site1[1]}", a tabela diz que quem vem logo antes é "${anterior[0]}"`);
});
