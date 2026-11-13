import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  lerAcrescimos, arvore, formatarTexto, montar, publicar, IO_REAL,
} from './wiki.mjs';
import { ARTEFATOS_DE_CONTRATO, RAIZ_EXPLORE, RAIZ_SPEC, LISTA_DE_ACRESCIMOS } from '../hooks/kit.mjs';

test('lerAcrescimos aceita lista markdown e ignora prosa', () => {
  const t = [
    '# Acréscimos à wiki',
    '',
    'Explicação em prosa, que não é caminho.',
    '',
    '- `outputs/spec/diagramas/contexto.png`',
    '- outputs/spec/anexos/contrato.pdf',
    '',
    '<!-- comentário -->',
  ].join('\n');
  assert.deepEqual(lerAcrescimos(t), [
    'outputs/spec/diagramas/contexto.png',
    'outputs/spec/anexos/contrato.pdf',
  ]);
});

test('lerAcrescimos de texto vazio devolve lista vazia', () => {
  assert.deepEqual(lerAcrescimos(''), []);
  assert.deepEqual(lerAcrescimos(null), []);
});

test('arvore inclui o que é contrato E existe, e nada mais', () => {
  const r = arvore({
    presentesExplore: new Set(['gaps.md', 'hld-funcional.md']),
    presentesSpec: new Set(['modules.md', 'revisao.json', 'auditorias/US-1.md']),
    acrescimos: [],
  });
  assert.deepEqual(r.incluidos.sort(), [
    'outputs/explore/gaps.md',
    'outputs/explore/hld-funcional.md',
    'outputs/spec/modules.md',
  ]);
});

test('artefato de máquina presente no disco NÃO entra — é o que a Decisão 19 compra', () => {
  const r = arvore({
    presentesExplore: new Set(),
    presentesSpec: new Set(['revisao.json', '_explore-congelado.md', 'screens-manifest.json']),
    acrescimos: [],
  });
  assert.deepEqual(r.incluidos, []);
  assert.deepEqual(r.ignorados.sort(), ['_explore-congelado.md', 'revisao.json', 'screens-manifest.json']);
});

test('artefato de contrato ausente no disco não é erro — publica menos', () => {
  const r = arvore({ presentesExplore: new Set(), presentesSpec: new Set(), acrescimos: [] });
  assert.deepEqual(r.incluidos, []);
  assert.deepEqual(r.faltando.length > 0, true, 'os ausentes saem nomeados, para quem quiser conferir');
});

test('acréscimo entra na árvore', () => {
  const r = arvore({
    presentesExplore: new Set(),
    presentesSpec: new Set(),
    acrescimos: ['outputs/spec/diagramas/contexto.png'],
  });
  assert.deepEqual(r.acrescentados, ['outputs/spec/diagramas/contexto.png']);
  assert.ok(r.incluidos.includes('outputs/spec/diagramas/contexto.png'));
});

test('acréscimo NÃO consegue remover artefato de contrato — a Decisão 24', () => {
  // ESTE É O TESTE QUE DEFINE A TAREFA. Uma lista que pudesse remover teria dois donos e uma
  // regra de precedência, e um `gaps.md` derrubado em silêncio da wiki do cliente é exatamente o
  // apodrecimento que a Decisão 19 rejeitou.
  const r = arvore({
    presentesExplore: new Set(['gaps.md']),
    presentesSpec: new Set(),
    acrescimos: ['-outputs/explore/gaps.md', '!outputs/explore/gaps.md', 'remover: outputs/explore/gaps.md'],
  });
  assert.ok(r.incluidos.includes('outputs/explore/gaps.md'), 'a lista removeu um artefato de contrato');
});

test('acréscimo duplicado de artefato que já é contrato não duplica a entrada', () => {
  const r = arvore({
    presentesExplore: new Set(['gaps.md']),
    presentesSpec: new Set(),
    acrescimos: ['outputs/explore/gaps.md'],
  });
  assert.equal(r.incluidos.filter((c) => c === 'outputs/explore/gaps.md').length, 1);
});

test('acréscimo em estilo Windows é armazenado com a mesma barra que foi checada', () => {
  // `dentroDoProjeto` normaliza `\` → `/` só para a checagem; se `arvore()` empurrasse o valor
  // ORIGINAL para `incluidos`/`acrescentados`, um acréscimo relativo em estilo Windows passaria a
  // checagem e seria armazenado com barra invertida — e `join(raiz, rel)` em `publicar` resolve
  // certo no Windows, mas quebra em POSIX, onde `\` é caractere de nome válido, não separador.
  const r = arvore({
    presentesExplore: new Set(),
    presentesSpec: new Set(),
    acrescimos: ['outputs\\spec\\diagramas\\x.png'],
  });
  assert.deepEqual(r.acrescentados, ['outputs/spec/diagramas/x.png']);
  assert.ok(r.incluidos.includes('outputs/spec/diagramas/x.png'));
  assert.ok(!r.incluidos.includes('outputs\\spec\\diagramas\\x.png'));
});

test('acréscimo que escapa da árvore do projeto é recusado e sai nomeado', () => {
  const r = arvore({
    presentesExplore: new Set(),
    presentesSpec: new Set(),
    acrescimos: [
      '../../segredos/senha.txt',
      'C:/Windows/system32/config',
      '/etc/passwd',
      '\\\\servidor\\share\\arquivo.txt',
    ],
  });
  assert.deepEqual(r.acrescentados, []);
  assert.equal(r.recusados.length, 4, 'a forma UNC do Windows (\\\\servidor\\share) também é caminho absoluto');
});

test('ignorado que é estado de máquina do harness/gate é nomeado como tal, e o acréscimo continua oferecido', () => {
  // A mensagem original convidava a publicar QUALQUER ignorado, inclusive `revisao.json` — estado
  // de máquina do próprio harness/gate, não do kit. Isto tem que virar AVISO (nomear o artefato),
  // nunca TRAVA: o convite ao acréscimo continua de pé, para este e para os demais ignorados.
  const t = formatarTexto(arvore({
    presentesExplore: new Set(),
    presentesSpec: new Set(['revisao.json', 'notas-do-projeto.txt']),
    acrescimos: [],
  }));
  assert.match(t, /revisao\.json.{0,120}estado de m[aá]quina/is);
  assert.match(t, new RegExp(LISTA_DE_ACRESCIMOS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('o formato de publicação do ADO fica declarado fora de escopo, na saída', () => {
  // Não é TODO solto: é uma ausência com razão escrita, no lugar em que quem publica vai ler.
  const t = formatarTexto(arvore({ presentesExplore: new Set(['gaps.md']), presentesSpec: new Set(), acrescimos: [] }));
  assert.match(t, /\.order/);
  assert.match(t, /fora de escopo/i);
});

// ————————————————————————————— a casca, sobre arquivo real —————————————————————————————
//
// A TASK 5 ENSINOU ISTO: um teste que só exercita `arvore()` com Sets de mentira nunca chama
// `montar`/`publicar`/`lerAcrescimos` sobre um arquivo de verdade, e a composição de caminho —
// `join(base, LISTA_DE_ACRESCIMOS)`, `join(raiz, rel)` na cópia — fica sem trava nenhuma. Os
// testes abaixo usam um diretório temporário real e o `IO_REAL` de produção.

function projetoTemp() {
  const raiz = mkdtempSync(join(tmpdir(), 'wiki-teste-'));
  mkdirSync(join(raiz, RAIZ_EXPLORE), { recursive: true });
  mkdirSync(join(raiz, RAIZ_SPEC, 'product-vision'), { recursive: true });
  writeFileSync(join(raiz, RAIZ_EXPLORE, 'gaps.md'), '# gaps\n');
  writeFileSync(join(raiz, RAIZ_SPEC, 'modules.md'), '# modules\n');
  writeFileSync(join(raiz, RAIZ_SPEC, 'product-vision', 'product-vision.md'), '# visão\n');
  writeFileSync(join(raiz, RAIZ_SPEC, 'revisao.json'), '{}');
  return raiz;
}

test('montar lê o disco de verdade — inclui contrato presente, ignora o de máquina', () => {
  const raiz = projetoTemp();
  try {
    const r = montar(raiz, IO_REAL);
    assert.ok(r.incluidos.includes(`${RAIZ_EXPLORE}/gaps.md`));
    assert.ok(r.incluidos.includes(`${RAIZ_SPEC}/modules.md`));
    assert.ok(r.incluidos.includes(`${RAIZ_SPEC}/product-vision/product-vision.md`),
      'a composição de caminho do subdiretório é o fato mais caro desta família');
    assert.ok(!r.incluidos.some((c) => c.endsWith('revisao.json')));
    assert.ok(r.ignorados.includes('revisao.json'));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('montar lê LISTA_DE_ACRESCIMOS do disco quando ela existe', () => {
  const raiz = projetoTemp();
  try {
    mkdirSync(join(raiz, RAIZ_SPEC, 'diagramas'), { recursive: true });
    writeFileSync(join(raiz, RAIZ_SPEC, 'diagramas', 'contexto.png'), 'x');
    writeFileSync(join(raiz, LISTA_DE_ACRESCIMOS), '- outputs/spec/diagramas/contexto.png\n');
    const r = montar(raiz, IO_REAL);
    assert.deepEqual(r.acrescentados, ['outputs/spec/diagramas/contexto.png']);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('montar sem LISTA_DE_ACRESCIMOS não é erro — acréscimos vazio', () => {
  const raiz = projetoTemp();
  try {
    const r = montar(raiz, IO_REAL);
    assert.deepEqual(r.acrescentados, []);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('publicar copia SÓ o que arvore incluiu, preservando o subdiretório do artefato', () => {
  const raiz = projetoTemp();
  const saida = mkdtempSync(join(tmpdir(), 'wiki-saida-'));
  try {
    const r = publicar(raiz, saida, IO_REAL);
    assert.ok(r.incluidos.length > 0);
    for (const rel of r.incluidos) {
      const conteudo = readFileSync(join(saida, rel), 'utf8');
      assert.equal(conteudo, readFileSync(join(raiz, rel), 'utf8'));
    }
    // O que NÃO é contrato não foi copiado — um `copiar` que andasse o disco por conta própria
    // desfaria a lista de inclusão.
    assert.ok(!existsSync(join(saida, RAIZ_SPEC, 'revisao.json')));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
    rmSync(saida, { recursive: true, force: true });
  }
});
