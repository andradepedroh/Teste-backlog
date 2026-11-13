import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analisar, formatarTexto, formatarJson, carregarDocs } from './revisao.mjs';

function docs(over = {}) {
  return new Map(Object.entries({
    'hld-funcional.md': '## 2. Módulos\n| MOD-PAG | Pagamentos |\n| MOD-REL | Relatórios |\n',
    'especificacao-funcional.md': [
      '## 2. Navegação e telas',
      '| Tela | Rota | Conteúdo | Visível para |',
      '| Cobrança | /cob | lista | Operador |',
      '### MOD-PAG — Pagamentos',
      '| RF-001 | Emitir cobrança | Cobrança |',
      '| RN-001 | Valor mínimo | RF-001 |',
    ].join('\n'),
    'modelo-de-dados.md': '| Cobranca | fatura | id, valor | RF-001 |\n',
    'gaps.md': '| GAP-001 | Qual gateway? | ⏳ Aguardando | Alto | Cliente |\n',
    ...over,
  }));
}

test('analisar devolve as oito listas, sempre, mesmo vazias', () => {
  const a = analisar(docs());
  assert.equal(a.listas.length, 8);
  for (const l of a.listas) {
    assert.equal(typeof l.chave, 'string');
    assert.equal(typeof l.titulo, 'string');
    assert.ok(Array.isArray(l.itens));
  }
});

function itens(a, chave) {
  return a.listas.find((l) => l.chave === chave).itens;
}

test('módulo sem RF aparece na lista', () => {
  const a = analisar(docs());
  assert.ok(itens(a, 'modulo-sem-rf').some((i) => i.includes('MOD-REL')));
  assert.ok(!itens(a, 'modulo-sem-rf').some((i) => i.includes('MOD-PAG')));
});

test('RN que não referencia RF é órfã', () => {
  const a = analisar(docs({
    'especificacao-funcional.md': '### MOD-PAG — Pagamentos\n| RF-001 | x | y |\n| RN-009 | regra solta | — |\n',
  }));
  assert.ok(itens(a, 'rn-orfa').some((i) => i.includes('RN-009')));
});

test('RF sem nenhuma RN aparece na lista', () => {
  const a = analisar(docs({
    'especificacao-funcional.md': '### MOD-PAG — Pagamentos\n| RF-001 | x | y |\n| RF-002 | sem regra | z |\n| RN-001 | regra | RF-001 |\n',
  }));
  assert.ok(itens(a, 'rf-sem-rn').some((i) => i.includes('RF-002')));
  assert.ok(!itens(a, 'rf-sem-rn').some((i) => i.includes('RF-001')));
});

test('módulo citado no prototype e ausente do HLD é fantasma', () => {
  const a = analisar(docs({ 'prototype.md': '| MOD-FANTASMA | tela x |\n' }));
  assert.ok(itens(a, 'modulo-fantasma').some((i) => i.includes('MOD-FANTASMA')));
});

// ————— rf-sem-tela: a lista que a terceira revisão pegou vazia POR DEFEITO DE CÓDIGO —————
//
// Esta lista chegou ao plano sem nenhum teste, e o motivo era o mesmo de `perfil-sem-tela`:
// com o fixture do plano ela não conseguia produzir saída. A sondagem achou dois defeitos reais:
//
//   - `telasTexto.includes(rf)` não tem fronteira, e `ID_PADRAO.RF` aceita três OU quatro
//     dígitos: `RF-001` é substring de `RF-0012`, então uma tela citando o de quatro dígitos
//     apagava o de três da lista;
//   - cortar a seção com `funcional.split(/^##\s+3\./m)` presume que a seção de funcionalidades
//     é literalmente a "## 3.". Num documento numerado de outro jeito o corte não acontece,
//     `telasTexto` vira o documento inteiro, todo RF passa a "ter tela" e a lista fica VAZIA em
//     silêncio — pior do que não existir, porque diz "nada a olhar aqui".
//
// Os dois últimos testes são o que prende a correção. Sem eles, `String.includes` e o `## 3.`
// literal voltam na primeira "simplificação".

test('rf-sem-tela não aponta RF que a seção de telas cita', () => {
  const a = analisar(docs({
    'especificacao-funcional.md': [
      '## 2. Navegação e telas',
      '| Tela | Rota | Conteúdo | Visível para |',
      '|---|---|---|---|',
      '| Cobrança | /cob | RF-005 | Operador |',
      '## 3. Funcionalidades',
      '### MOD-PAG — Pagamentos',
      '| RF-005 | Emitir cobrança | x |',
    ].join('\n'),
  }));
  assert.deepEqual(itens(a, 'rf-sem-tela'), [], 'RF-005 está na tabela de telas');
});

test('rf-sem-tela aponta RF que nenhuma tela cita', () => {
  const a = analisar(docs({
    'especificacao-funcional.md': [
      '## 2. Navegação e telas',
      '| Tela | Rota | Conteúdo | Visível para |',
      '|---|---|---|---|',
      '| Cobrança | /cob | lista | Operador |',
      '## 3. Funcionalidades',
      '### MOD-PAG — Pagamentos',
      '| RF-005 | Emitir cobrança | x |',
    ].join('\n'),
  }));
  assert.ok(itens(a, 'rf-sem-tela').some((i) => i.startsWith('RF-005')), 'RF-005 não tem tela');
});

test('rf-sem-tela compara por ID exato — `RF-0012` numa tela não cobre `RF-001`', () => {
  // Com `String.includes`, `telasTexto.includes('RF-001')` é verdadeiro porque `RF-0012`
  // contém `RF-001`, e o RF sem tela nenhuma sumiria da lista que existe para achá-lo.
  const a = analisar(docs({
    'especificacao-funcional.md': [
      '## 2. Navegação e telas',
      '| Tela | Rota | Conteúdo | Visível para |',
      '|---|---|---|---|',
      '| Painel | /p | RF-0012 | Operador |',
      '## 3. Funcionalidades',
      '### MOD-PAG — Pagamentos',
      '| RF-001 | Emitir cobrança | x |',
      '| RF-0012 | Ver painel | y |',
    ].join('\n'),
  }));
  const l = itens(a, 'rf-sem-tela');
  assert.ok(l.some((i) => i.startsWith('RF-001 —')), '`RF-001` sozinho não tem tela e tem que aparecer');
  assert.ok(!l.some((i) => i.startsWith('RF-0012')), '`RF-0012` tem tela');
});

test('rf-sem-tela não depende da seção de funcionalidades ser a `## 3.`', () => {
  // Corte por número literal: num documento onde as funcionalidades são a `## 4.`, o split não
  // casa, `telasTexto` vira o documento inteiro e a lista fica vazia em silêncio.
  const a = analisar(docs({
    'especificacao-funcional.md': [
      '## 2. Navegação e telas',
      '| Tela | Rota | Conteúdo | Visível para |',
      '|---|---|---|---|',
      '| Cobrança | /cob | lista | Operador |',
      '## 4. Funcionalidades',
      '### MOD-PAG — Pagamentos',
      '| RF-007 | Emitir cobrança | x |',
    ].join('\n'),
  }));
  assert.ok(itens(a, 'rf-sem-tela').some((i) => i.startsWith('RF-007')), 'RF-007 não tem tela');
});

// ————— perfil-sem-tela: a lista que a revisão do plano pegou vazia —————
//
// A primeira redação desta tarefa tinha `itens['perfil-sem-tela'] = []` literal, com a variável
// `perfis` computada logo acima e nunca usada. A correção implementou a lista de verdade — e a
// SEGUNDA revisão pegou que ela continuava sem teste positivo: o fixture não tem matriz de
// acesso, então a lista saía vazia de qualquer jeito e a vacuidade só tinha mudado de lugar.
// Estes quatro testes são o que torna a implementação verificável.

const FUNCIONAL_COM_MATRIZ = [
  '### 1.2 Matriz de acesso',
  '| Ação | Operador | Gestor |',
  '|---|:---:|:---:|',
  '| Emitir cobrança | ✅ | — |',
  '',
  '## 2. Navegação e telas',
  '| Tela/Aba | Rota | Conteúdo | Visível para |',
  '|---|---|---|---|',
  '| Cobrança | /cob | lista | Operador |',
].join('\n');

test('perfil-sem-tela acha o perfil da matriz que nenhuma tela lista', () => {
  const a = analisar(docs({ 'especificacao-funcional.md': FUNCIONAL_COM_MATRIZ }));
  assert.ok(itens(a, 'perfil-sem-tela').some((i) => i.startsWith('Gestor')), 'Gestor não tem tela');
  assert.ok(!itens(a, 'perfil-sem-tela').some((i) => i.startsWith('Operador')), 'Operador tem tela');
});

test('perfil-sem-tela compara por valor exato — `Operador` não é coberto por `Operador Master`', () => {
  // Com `String.includes` sobre o documento inteiro, `Operador` seria dado como coberto pela
  // tela de `Operador Master` e sumiria da lista. É a fronteira do kit.mjs, de novo.
  const a = analisar(docs({
    'especificacao-funcional.md': [
      '### 1.2 Matriz de acesso',
      '| Ação | Operador | Operador Master |',
      '| Emitir | ✅ | ✅ |',
      '## 2. Navegação e telas',
      '| Tela/Aba | Rota | Conteúdo | Visível para |',
      '| Painel | /p | x | Operador Master |',
    ].join('\n'),
  }));
  const l = itens(a, 'perfil-sem-tela');
  assert.ok(l.some((i) => i.startsWith('Operador —')), '`Operador` sozinho não tem tela e tem que aparecer');
  assert.ok(!l.some((i) => i.startsWith('Operador Master')), '`Operador Master` tem tela');
});

test('perfil-sem-tela entende célula com vários perfis', () => {
  const a = analisar(docs({
    'especificacao-funcional.md': FUNCIONAL_COM_MATRIZ.replace('lista | Operador |', 'lista | Operador, Gestor |'),
  }));
  assert.deepEqual(itens(a, 'perfil-sem-tela'), [], 'os dois perfis são citados na mesma célula');
});

test('tabela de quatro colunas em outra seção não conta como tabela de telas', () => {
  // Sem o fatiamento por seção, esta tabela de RF entraria como se fosse tela e a coluna
  // `Cobrança` faria `Gestor` parecer coberto. O fatiamento é o que impede isso.
  const a = analisar(docs({
    'especificacao-funcional.md': [
      '### 1.2 Matriz de acesso',
      '| Ação | Operador | Gestor |',
      '| Emitir | ✅ | — |',
      '## 3. Funcionalidades',
      '### MOD-PAG — Pagamentos',
      '| ID | Funcionalidade | Descrição | Visível para |',
      '| RF-001 | Emitir | faz algo | Gestor |',
    ].join('\n'),
  }));
  const l = itens(a, 'perfil-sem-tela');
  assert.ok(l.some((i) => i.startsWith('Gestor')), 'não há seção de telas — nenhum perfil tem tela');
  assert.ok(l.some((i) => i.startsWith('Operador')));
});

test('GAP aberto entra na lista com o impacto', () => {
  const a = analisar(docs());
  const g = itens(a, 'gaps-abertos');
  assert.ok(g.some((i) => i.includes('GAP-001')));
  assert.ok(g.some((i) => /Alto/i.test(i)));
});

test('GAP respondido não entra', () => {
  const a = analisar(docs({ 'gaps.md': '| GAP-001 | x | ✅ Respondido | Alto | Cliente |\n' }));
  assert.deepEqual(itens(a, 'gaps-abertos'), []);
});

test('entidade sem RF aparece na lista', () => {
  const a = analisar(docs({ 'modelo-de-dados.md': '| Auditoria | log | id | — |\n' }));
  assert.ok(itens(a, 'entidade-sem-rf').some((i) => i.includes('Auditoria')));
});

// A guarda de linha separadora do `linhasDeTabela` existe desde a primeira redação e nunca foi
// medida — sem estes dois testes, apagá-la faz cada `|---|---|` de modelo de dados virar uma
// "entidade sem RF", e a lista mais mecânica do relatório vira ruído.

test('a linha separadora `|---|---|` não vira entidade', () => {
  const a = analisar(docs({
    'modelo-de-dados.md': [
      '| Entidade | Tabela | Campos | RFs |',
      '|---|---|---|---|',
      '| Auditoria | log | id | — |',
    ].join('\n'),
  }));
  const l = itens(a, 'entidade-sem-rf');
  assert.ok(l.some((i) => i.startsWith('Auditoria')), 'a entidade de verdade entra');
  assert.ok(!l.some((i) => i.startsWith('-')), `separadora virou item: ${JSON.stringify(l)}`);
});

test('a linha separadora com alinhamento e espaços também não vira entidade', () => {
  const a = analisar(docs({
    'modelo-de-dados.md': [
      '| Entidade | Tabela | Campos | RFs |',
      '| --- | :---: | ---: | --- |',
      '| Auditoria | log | id | — |',
    ].join('\n'),
  }));
  const l = itens(a, 'entidade-sem-rf');
  assert.ok(l.some((i) => i.startsWith('Auditoria')), 'a entidade de verdade entra');
  assert.ok(!l.some((i) => i.startsWith('-')), `separadora virou item: ${JSON.stringify(l)}`);
});

test('documento ausente não quebra a análise', () => {
  const a = analisar(new Map([['hld-funcional.md', '| MOD-PAG | Pagamentos |\n']]));
  assert.equal(a.listas.length, 8);
});

test('mapa vazio não quebra', () => {
  const a = analisar(new Map());
  assert.equal(a.listas.length, 8);
  assert.equal(a.resumo.totalApontamentos, 0);
});

test('resumo conta os apontamentos e os documentos lidos', () => {
  const a = analisar(docs());
  assert.equal(typeof a.resumo.totalApontamentos, 'number');
  assert.ok(a.resumo.documentos >= 4);
});

test('formatarTexto nomeia cada lista não vazia e omite as vazias', () => {
  const t = formatarTexto(analisar(docs()));
  assert.match(t, /MOD-REL/);
  assert.ok(!/perfil-sem-tela/.test(t));
});

test('formatarTexto diz claramente quando não há apontamento', () => {
  const t = formatarTexto(analisar(new Map()));
  assert.match(t, /nenhum apontamento|nada a apontar/i);
});

test('formatarJson tem versão, resumo e as oito listas', () => {
  const j = formatarJson(analisar(docs()));
  assert.equal(typeof j.versao, 'string');
  assert.ok(j.resumo);
  assert.equal(j.listas.length, 8);
});

test('carregarDocs lê os documentos do Explore e o prototype do spec', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'rev-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), 'conteudo gaps');
  writeFileSync(join(raiz, 'outputs', 'spec', 'prototype.md'), 'conteudo proto');
  const m = carregarDocs(raiz);
  assert.equal(m.get('gaps.md'), 'conteudo gaps');
  assert.equal(m.get('prototype.md'), 'conteudo proto');
});

test('carregarDocs devolve mapa vazio quando não há nada', () => {
  assert.equal(carregarDocs(join(tmpdir(), 'nao-existe-rev-1')).size, 0);
});

test('carregarDocs RELANÇA erro que não seja de ausência', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'rev-'));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), 'x');
  const lerRuim = () => { const e = new Error('sem permissão'); e.code = 'EACCES'; throw e; };
  assert.throws(() => carregarDocs(raiz, lerRuim), /EACCES|permiss/i);
});
