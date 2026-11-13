import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGISTRO, criarRegistro, casaGatilho, despachar, emitirDeny, interpretarEntrada,
  IO_REAL,
} from './pretooluse.mjs';
import { montarCarimbo } from './zonas.mjs';
// `relativizarPorIdentidade` mudou de casa para o kit.mjs (Task 3, Step 0): os DOIS despachantes
// precisam da mesma resposta, e o `posttooluse.mjs` não pode importá-la do despachante irmão. Os
// usos abaixo ficaram como estavam — só a origem mudou. Não há reexportação no `pretooluse.mjs`
// "para compatibilidade": dois donos é justamente o defeito que aquela mudança consertou.
import { relativizar, relativizarPorIdentidade } from './kit.mjs';
import { join, dirname } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, readFileSync, statSync as realStat } from 'node:fs';
import { tmpdir } from 'node:os';

const okBloq = { nome: 'b-ok', gatilhos: ['Write'], bloqueia: true, executar: () => null };
const denyBloq = { nome: 'b-deny', gatilhos: ['Write'], bloqueia: true, executar: () => ({ acao: 'deny', motivo: 'negado pelo b-deny' }) };
const lancaBloq = { nome: 'b-lanca', gatilhos: ['Write'], bloqueia: true, executar: () => { throw new Error('explodiu'); } };
const lancaInfo = { nome: 'i-lanca', gatilhos: ['Write'], bloqueia: false, executar: () => { throw new Error('quebrou'); } };
const okInfo = { nome: 'i-ok', gatilhos: ['Write'], bloqueia: false, executar: () => null };

test('REGISTRO declara nome, gatilhos, bloqueia e executar em toda entrada', () => {
  for (const v of REGISTRO) {
    assert.equal(typeof v.nome, 'string');
    assert.ok(Array.isArray(v.gatilhos) && v.gatilhos.length > 0, v.nome);
    assert.equal(typeof v.bloqueia, 'boolean', v.nome);
    assert.equal(typeof v.executar, 'function', v.nome);
  }
});

test('REGISTRO não tem nome duplicado', () => {
  const nomes = REGISTRO.map((v) => v.nome);
  assert.equal(new Set(nomes).size, nomes.length);
});

test('casaGatilho reconhece a tool declarada', () => {
  assert.equal(casaGatilho({ gatilhos: ['Write', 'Edit'] }, 'Write'), true);
  assert.equal(casaGatilho({ gatilhos: ['Write', 'Edit'] }, 'Edit'), true);
  assert.equal(casaGatilho({ gatilhos: ['Write'] }, 'Bash'), false);
});

test('casaGatilho com curinga casa qualquer tool', () => {
  assert.equal(casaGatilho({ gatilhos: ['*'] }, 'QualquerCoisa'), true);
});

test('despachar libera quando nenhum verificador casa o gatilho', () => {
  const r = despachar({ tool_name: 'Bash' }, [okBloq]);
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('despachar libera quando todos passam', () => {
  const r = despachar({ tool_name: 'Write' }, [okBloq, okInfo]);
  assert.equal(r.acao, 'allow');
  assert.equal(r.motivo, null);
});

test('despachar nega quando um bloqueante devolve deny', () => {
  const r = despachar({ tool_name: 'Write' }, [okBloq, denyBloq]);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /negado pelo b-deny/);
});

test('bloqueante que lança FALHA FECHADO — nega com o erro na mensagem', () => {
  const r = despachar({ tool_name: 'Write' }, [lancaBloq]);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /b-lanca/);
  assert.match(r.motivo, /explodiu/);
});

test('informativo que lança FALHA ABERTO — registra e libera', () => {
  const r = despachar({ tool_name: 'Write' }, [lancaInfo]);
  assert.equal(r.acao, 'allow');
  assert.equal(r.falhas.length, 1);
  assert.equal(r.falhas[0].nome, 'i-lanca');
  assert.match(r.falhas[0].erro, /quebrou/);
});

test('informativo quebrado não impede bloqueante de rodar depois dele', () => {
  const r = despachar({ tool_name: 'Write' }, [lancaInfo, denyBloq]);
  assert.equal(r.acao, 'deny');
  assert.equal(r.falhas.length, 1);
});

test('o primeiro deny interrompe — verificador seguinte não roda', () => {
  let rodou = false;
  const espiao = { nome: 'espiao', gatilhos: ['Write'], bloqueia: true, executar: () => { rodou = true; return null; } };
  despachar({ tool_name: 'Write' }, [denyBloq, espiao]);
  assert.equal(rodou, false);
});

test('despachar sem tool_name não casa gatilho nenhum e libera sem falhas', () => {
  const r = despachar({}, REGISTRO);
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('REGISTRO exportado declara as travas nomeadas, montadas sobre a casca real', () => {
  // I3: o teste que ocupava este lugar era cópia literal do anterior — o comentário afirmava
  // provar que "REGISTRO tem entradas" e ele continuava verde com `REGISTRO` vazio, porque
  // `despachar({}, [])` também libera sem falhas. Um comentário afirmando garantia que o teste
  // não dá ensina errado quem for ler depois. Este aqui vai vermelho se o REGISTRO esvaziar, se
  // uma trava for removida, ou se ele deixar de ser montado por `criarRegistro`.
  //
  // A ORDEM É PARTE DA ASSERÇÃO: `escrita-bash` (Task 2B) vem por último, porque as mensagens das
  // duas primeiras são mais específicas quando a escrita chega por tool de arquivo. `fecho-explore`
  // (Task 5) entra depois das duas de escrita pelo mesmo critério: elas respondem sobre o ARQUIVO,
  // ele responde sobre a FASE, e quando as duas coisas valem a mensagem sobre o arquivo é a útil.
  //
  // `cadeia` (Task 6) entra ANTES do `fecho-explore` pelo mesmo critério aplicado uma vez mais:
  // ele responde sobre o ARTEFATO que falta, o fecho responde sobre a FASE, e quando as duas
  // coisas valem — `spec-product` dispara os dois — a mensagem que nomeia o arquivo é a útil.
  //
  // `delivery-gate` (Task 9) entra DEPOIS do `escrita-bash`, e é o segundo bloqueante do gatilho
  // `Bash`. Mesmo critério, terceira aplicação: o `escrita-bash` responde sobre o dano que o
  // COMANDO causa agora, o gate responde sobre o ESTADO do processo (falta auditoria), e quando
  // um comando composto morde nos dois a mensagem do dano imediato é a acionável. Some a isso o
  // custo: é o único verificador que dispara subprocesso de `git` em toda tool call de `Bash`, e
  // por último ele é dispensado por qualquer deny mais barato.
  const nomes = REGISTRO.map((v) => v.nome);
  assert.deepEqual(nomes, ['zona-imutavel', 'congelamento', 'cadeia', 'fecho-explore', 'escrita-bash',
    'escrita-powershell', 'delivery-gate']);
  for (const v of REGISTRO) {
    assert.equal(v.bloqueia, true, `${v.nome} precisa ser bloqueante`);
  }
  // As travas de arquivo fiscalizam as TRÊS tools de escrita; a de Bash fiscaliza o Bash; a da
  // cadeia fiscaliza só a invocação de skill. São conjuntos disjuntos de gatilho, e cada um tem
  // que continuar coberto.
  const SO_BASH = ['escrita-bash', 'delivery-gate'];
  for (const v of REGISTRO.filter((x) => ![...SO_BASH, 'escrita-powershell'].includes(x.nome) && x.nome !== 'cadeia')) {
    assert.ok(v.gatilhos.includes('NotebookEdit'), `${v.nome} precisa fiscalizar NotebookEdit`);
  }
  for (const nome of SO_BASH) {
    assert.deepEqual(REGISTRO.find((v) => v.nome === nome).gatilhos, ['Bash'], `${nome} fiscaliza só Bash`);
  }
  // A tool PowerShell do Claude Code escapava de toda trava: o gatilho dela é só dela.
  assert.deepEqual(REGISTRO.find((v) => v.nome === 'escrita-powershell').gatilhos, ['PowerShell']);
  // ÂNCORA ÚNICA na cadeia, e a lista fechada é a asserção: acrescentar `Write` aqui devolveria o
  // falso positivo que a Decisão 13 recusou — editar `data-model.json` à mão não é rodar a
  // `spec-data-model`.
  assert.deepEqual(REGISTRO.find((v) => v.nome === 'cadeia').gatilhos, ['Skill']);
  // O `fecho-explore` tem uma âncora a mais que as outras: a invocação de skill. Sem `Skill` no
  // gatilho, metade da Decisão 13 some — o `spec-product` invocado direto passaria batido, e a
  // única defesa restante seria a escrita de arquivo, que acontece DEPOIS do compromisso.
  assert.ok(REGISTRO.find((v) => v.nome === 'fecho-explore').gatilhos.includes('Skill'));
});

test('REGISTRO exportado nega de verdade, pela casca REAL — sem process.chdir', () => {
  // Os testes de wiring abaixo rodam sobre `criarRegistro(ioFalso)`, então sozinhos eles não
  // provariam que o REGISTRO que o `main()` usa está ligado ao `IO_REAL`. Este prova: o caminho é
  // montado a partir do `process.cwd()` de verdade (funciona de qualquer diretório, porque a raiz
  // e o alvo vêm da mesma fonte), e quem responde é a casca real. Se `REGISTRO` esvaziar, ou
  // deixar de ser montado sobre `IO_REAL.cwd`, isto fica vermelho.
  //
  // A cwd real pode ser o template (marcador presente) ou não, e desde a Decisão 67 o veredito
  // depende disso. As duas pernas provam a casca real: quem lê o marcador é o `IO_REAL.ehTemplate`.
  const alvo = join(process.cwd(), 'CLAUDE.md');
  const r = despachar({ tool_name: 'Write', tool_input: { file_path: alvo, content: 'x' } }, REGISTRO);
  if (IO_REAL.ehTemplate(process.cwd())) {
    assert.equal(r.acao, 'allow', 'no template a zona imutável abre');
  } else {
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /zona imutável/i);
  }
});

test('REGISTRO exportado aplica a CADEIA pela casca REAL, lendo o disco', () => {
  // Na Task 3 o `IO_REAL` do `posttooluse` estava ligado à política errada e a suíte inteira
  // ficava verde, porque todo teste de wiring rodava sobre dublê. Este dirige o `REGISTRO` que o
  // `main()` usa, contra um projeto de verdade: o veredito TEM que virar quando o artefato aparece
  // em disco. Se a entrada `cadeia` sumir do `criarRegistro`, ou deixar de receber o `io`, ou o
  // `IO_REAL` deixar de servi-la, o primeiro `assert` fica vermelho.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'cadeia-real-')));
  const invocacao = { tool_name: 'Skill', tool_input: { skill: 'spec-api-contracts' } };
  try {
    mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
    mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
    noDiretorio(raiz, () => {
      const antes = despachar(invocacao, REGISTRO);
      assert.equal(antes.acao, 'deny');
      assert.match(antes.motivo, /Cadeia bloqueada \(CADEIA-TEC-02\)/);
      assert.match(antes.motivo, /data-model\.json/);

      writeFileSync(join(raiz, 'outputs', 'spec', 'data-model.json'), '{}\n');
      const depois = despachar(invocacao, REGISTRO);
      assert.equal(depois.acao, 'allow', depois.motivo || '');
      assert.deepEqual(depois.falhas, []);
    });
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('REGISTRO exportado libera escrita fora da raiz do projeto, pela casca REAL', () => {
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '/algum-outro-repo/CLAUDE.md', content: 'x' } },
    REGISTRO,
  );
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

// ————————————————— B4: o wiring, exercitado com casca injetada —————————————————
//
// Antes desta rodada NENHUM teste chegava aqui: os `executar` chamavam `process.cwd()` e liam
// disco direto, sem ponto de injeção, e testá-los exigiria `process.chdir`. O resultado medido
// pela revisão adversarial: mutar `caminhoEscrito` para devolver `null` sempre — o que zera as
// DUAS travas — deixava a suíte inteira verde. Todo teste daqui para baixo roda por
// `despachar(payload, criarRegistro(ioFalso))`, sem tocar em `process.chdir`.

const RAIZ = '/proj';
const CARIMBO = montarCarimbo('2026-08-26');

/**
 * Casca falsa. `chamadas` registra o que foi consultado, para provar que fora do Explore o
 * congelamento não toca o disco (I6).
 *
 * `lerAnterior` SAIU junto com a exceção do autobloqueio: não há mais estado anterior a comparar,
 * e essa operação não voltou. As que existem estão listadas abaixo, cada uma com a razão de estar
 * aqui — contar quantas são no cabeçalho só produziu um número que envelheceu.
 */
/** Erro de I/O com `code`, como o `node:fs` levanta. */
function erroIO(code) {
  const e = new Error(code);
  e.code = code;
  throw e;
}

function ioFalso(opcoes = {}) {
  const chamadas = [];
  return {
    chamadas,
    cwd: () => RAIZ,
    // As três que o `fecho-explore` (Task 5) acrescentou ao `io`. A dublê modela um projeto
    // INEXISTENTE: tudo levanta `ENOENT`, que é ausência, e o gate decide com o que existe — nada.
    // Elas registram em `chamadas` como o `exploreCongelado`, então os testes de "não toca o disco"
    // continuam valendo, e agora sobre um `io` maior.
    lerArquivo: (caminho) => { chamadas.push(['lerArquivo', String(caminho)]); return erroIO('ENOENT'); },
    lerDiretorio: (caminho) => { chamadas.push(['lerDiretorio', String(caminho)]); return erroIO('ENOENT'); },
    statMs: (caminho) => { chamadas.push(['statMs', String(caminho)]); return erroIO('ENOENT'); },
    // C4 acrescentou `relativizar` às operações do `io`. A dublê usa a resolução TEXTUAL do
    // kit de propósito: os caminhos daqui (`/proj/...`) não existem em disco nenhum, e a
    // resolução por identidade — que é a de produção — precisa de disco para responder. O que
    // estes testes fixam é o wiring das duas travas, não a resolução de caminho; a resolução por
    // identidade tem os testes dela contra disco real, mais abaixo.
    relativizar: (raiz, bruto) => relativizar(raiz, bruto),
    exploreCongelado: (raiz) => {
      chamadas.push(['exploreCongelado', raiz]);
      return opcoes.congelado === true;
    },
    // Decisão 40. Registra em `chamadas` pela MESMA razão que o `exploreCongelado`: o que os testes
    // prendem não é só a resposta, é que ela só é PAGA dentro do deny por zona imutável.
    ehTemplate: (raiz) => {
      chamadas.push(['ehTemplate', String(raiz)]);
      return opcoes.template === true;
    },
    manifestoDaZona: (raiz) => {
      chamadas.push(['manifestoDaZona', String(raiz)]);
      return opcoes.manifesto || null;
    },
  };
}

const decidir = (payload, opcoes) => despachar(payload, criarRegistro(ioFalso(opcoes)));
const escrever = (caminho, content) => ({ tool_name: 'Write', tool_input: { file_path: caminho, content } });

test('wiring — Write na zona imutável é NEGADO', () => {
  const r = decidir(escrever(`${RAIZ}/CLAUDE.md`, 'qualquer coisa'));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('wiring — Write em outputs/spec/ FORA da whitelist atravessa a fronteira e o fecho NEGA', () => {
  // Este teste liberava, e liberava CERTO enquanto o `fecho-explore` não existia: as duas travas
  // de escrita não têm nada a dizer sobre `outputs/spec/`. Com a Task 5, escrever `modules.md` é
  // a âncora de arquivo da Decisão 13 — o primeiro compromisso irreversível com o Plan — e o
  // projeto de mentira desta seção não tem documento nenhum do Explore.
  const r = decidir(escrever(`${RAIZ}/outputs/spec/modules.md`, '# Módulos'));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Explore ainda não está fechado/i);
  assert.match(r.motivo, /hld-funcional/);
});

test('wiring — Write na WHITELIST do Explore, em outputs/spec/, continua liberado', () => {
  // A contrapartida do teste acima, e o que impede que ele seja lido como "toda escrita em
  // outputs/spec/ agora é negada". A `spec-ingest` do Plan roda ANTES do gate, de propósito:
  // escrever `context-map.md` em delta é não-destrutivo e re-executável.
  for (const f of ['sync-log.md', 'context-map.md', 'prototype.md', 'screens/login.png']) {
    const r = decidir(escrever(`${RAIZ}/outputs/spec/${f}`, 'x'));
    assert.equal(r.acao, 'allow', `${f}: ${r.motivo || ''}`);
    assert.deepEqual(r.falhas, []);
  }
});

/**
 * Um `lerDiretorio` de mentira que serve UMA árvore de arquivos relativos a `RAIZ`.
 *
 * Existe para os testes de ordem entre `cadeia` e `fecho-explore`: os dois casam o gatilho `Skill`
 * para `spec-product`, e separá-los exige um projeto onde os pré-requisitos da cadeia estejam
 * satisfeitos — o que o `ioFalso` padrão, que é um projeto INEXISTENTE, não sabe representar.
 */
function comArquivos(io, caminhos) {
  const norm = (p) => String(p).split('\\').join('/').replace(/\/+$/, '');
  return {
    ...io,
    lerDiretorio: (dir) => {
      const d = norm(dir);
      io.chamadas.push(['lerDiretorio', d]);
      const filhos = new Map();
      for (const f of caminhos) {
        const abs = `${RAIZ}/${f}`;
        if (!abs.startsWith(`${d}/`)) continue;
        const resto = abs.slice(d.length + 1);
        const i = resto.indexOf('/');
        if (i === -1) filhos.set(resto, false);
        else filhos.set(resto.slice(0, i), true);
      }
      if (!filhos.size) erroIO('ENOENT');
      return [...filhos].map(([name, ehDir]) => ({
        name, isDirectory: () => ehDir, isFile: () => !ehDir,
      }));
    },
  };
}

test('wiring — a invocação de `spec-product` é negada pela CADEIA, que vem antes do fecho', () => {
  // A outra metade da âncora dupla. `Skill` não é tool de escrita: sem entrada com esse gatilho no
  // `criarRegistro`, nenhum verificador casaria e a invocação passaria batida.
  //
  // `spec-product` dispara os DOIS verificadores — está na tabela do `cadeia` e no `SKILLS_DO_PLAN`
  // do fecho —, então este payload é onde a ordem do registro é observável. Num projeto zerado
  // quem fala é o `cadeia`, e é o certo: ele nomeia o ARQUIVO que falta, o fecho nomeia a FASE.
  // Mover a entrada `cadeia` para depois do `fecho-explore` deixa este teste vermelho.
  const r = decidir({ tool_name: 'Skill', tool_input: { skill: 'spec-product' } });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Cadeia bloqueada \(V-PRD-01\)/);
  assert.match(r.motivo, /context-map\.md/);
});

test('wiring — com a cadeia satisfeita, quem nega o `spec-product` é o fecho', () => {
  // A contrapartida do teste acima, e o que impede que a Task 6 seja lida como "o fecho parou de
  // valer para invocação de skill". Com `context-map.md` e `discovery-document.md` em disco, o
  // `cadeia` libera e o gate de fronteira volta a falar — sobre o Explore, que continua aberto.
  const io = comArquivos(
    ioFalso(),
    ['outputs/spec/context-map.md', 'outputs/spec/discovery-document.md'],
  );
  const r = despachar({ tool_name: 'Skill', tool_input: { skill: 'spec-product' } }, criarRegistro(io));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Explore ainda não está fechado/i);
});

test('wiring — a cadeia reconhece a skill servida por plugin', () => {
  // Skill servida por plugin é invocada como `plugin:skill` e chega PREFIXADA — `superpowers:` e
  // `anthropic-skills:` são prefixos vivos nesta máquina. Sem o `nomeDaSkill` do kit na casca do
  // `cadeia`, `algum-plugin:spec-implement` não casa a tabela e a trava inteira fica decorativa.
  const r = decidir({ tool_name: 'Skill', tool_input: { skill: 'algum-plugin:spec-implement' } });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /Cadeia bloqueada \(CADEIA-DEV-02\)/);
  assert.match(r.motivo, /tasks\.json/);

  // E a forma NUA, que é a que a vendorização produz. As duas pontas: sem esta, apagar o corte de
  // prefixo continuaria vermelho, mas apagar a ENTRADA da tabela ficaria verde por metade.
  const nu = decidir({ tool_name: 'Skill', tool_input: { skill: 'spec-implement' } });
  assert.equal(nu.acao, 'deny');
  assert.match(nu.motivo, /Cadeia bloqueada \(CADEIA-DEV-02\)/);
  assert.match(nu.motivo, /tasks\.json/);
});

test('wiring — `spec-ingest` NÃO é negada: a ingestão do Plan pode acontecer antes do gate', () => {
  const r = decidir({ tool_name: 'Skill', tool_input: { skill: 'spec-ingest' } });
  assert.equal(r.acao, 'allow', r.motivo || '');
  assert.deepEqual(r.falhas, []);
});

test('wiring — Write em outputs/explore/ com o Explore congelado é NEGADO', () => {
  const r = decidir(
    escrever(`${RAIZ}/outputs/explore/gaps.md`, '# GAPs\n\nreescrito'),
    { congelado: true },
  );
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /congelad/i);
});

test('wiring — Write em outputs/explore/ com o Explore NÃO congelado é liberado', () => {
  const r = decidir(escrever(`${RAIZ}/outputs/explore/gaps.md`, '# GAPs\n\nrascunho'), { congelado: false });
  assert.equal(r.acao, 'allow');
});

test('wiring B1 — NotebookEdit carrega o caminho em notebook_path, e a zona imutável o pega', () => {
  // O schema do NotebookEdit não tem `file_path`: os campos são `notebook_path` e `new_source`.
  // `caminhoEscrito` lia só `file_path`, devolvia `null` para TODA escrita de notebook, e as duas
  // travas liberavam. `NotebookEdit` estava nos gatilhos desde sempre — nunca foi fiscalizado.
  const r = decidir({
    tool_name: 'NotebookEdit',
    tool_input: { notebook_path: `${RAIZ}/.claude/hooks/kit.ipynb`, new_source: 'print(1)' },
  });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('wiring B1 — NotebookEdit em outputs/explore/ congelado também é NEGADO', () => {
  const r = decidir(
    {
      tool_name: 'NotebookEdit',
      tool_input: { notebook_path: `${RAIZ}/outputs/explore/analise.ipynb`, new_source: 'print(1)' },
    },
    { congelado: true },
  );
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /congelad/i);
});

test('wiring — Edit com new_string na zona imutável é NEGADO', () => {
  const r = decidir({
    tool_name: 'Edit',
    tool_input: { file_path: `${RAIZ}/CLAUDE.md`, old_string: 'a', new_string: 'b' },
  });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('wiring D1 — no Explore congelado, as TRÊS tools de escrita são negadas, com qualquer conteúdo', () => {
  // O que estes casos exercitavam antes era a exceção do autobloqueio: arquivo novo nascendo
  // carimbado (B2), corpo trocado junto com o carimbo (B3), a transição legítima, e o par
  // Write/Edit que fixava `conteudoEhArquivoInteiro` (C5). Nada disso existe mais — não há
  // conteúdo que passe, e o `criarRegistro` nem lê o conteúdo do payload. O que sobra para
  // fiscalizar é que as três tools continuam cobertas.
  const novo = `# GAPs\n\n${CARIMBO}\n\n## GAP-001 — prazo do boleto\n\nQuestão aberta com o cliente.\n`;
  const payloads = [
    ['Write', escrever(`${RAIZ}/outputs/explore/gaps.md`, novo)],
    ['Write com arquivo novo carimbado', escrever(`${RAIZ}/outputs/explore/hld-funcional-v2.md`, `${CARIMBO}\n\n# HLD v2`)],
    ['Edit', { tool_name: 'Edit', tool_input: { file_path: `${RAIZ}/outputs/explore/gaps.md`, old_string: '# GAPs', new_string: novo } }],
    ['NotebookEdit', { tool_name: 'NotebookEdit', tool_input: { notebook_path: `${RAIZ}/outputs/explore/gaps.md`, new_source: novo } }],
  ];
  for (const [nome, p] of payloads) {
    const r = decidir(p, { congelado: true });
    assert.equal(r.acao, 'deny', nome);
    assert.match(r.motivo, /congelad/i, nome);
  }
});

test('wiring D1 — o congelamento não lê mais o conteúdo do payload: não existe `lerAnterior`', () => {
  // `lerAnterior` era I/O por escrita dentro do Explore, e saiu com a exceção do autobloqueio. Um
  // `io` que não a fornece tem que funcionar; se alguém a reintroduzir sem atualizar a dublê, isto
  // quebra. (O `io` cresceu de três para seis operações com o `fecho-explore`, e nenhuma delas é
  // ela: as três novas são do gate de fronteira, e o congelamento continua sem ler conteúdo.)
  const io = ioFalso({ congelado: true });
  assert.equal(io.lerAnterior, undefined);
  const r = despachar(escrever(`${RAIZ}/outputs/explore/gaps.md`, 'x'), criarRegistro(io));
  assert.equal(r.acao, 'deny');
  // O `lerDiretorio` é a RESOLUÇÃO DA RAIZ DOS ARTEFATOS (conserto do I1), e não leitura de
  // conteúdo: a trava pergunta ao `descobrirWorkspace` onde moram os artefatos antes de julgar.
  // Conteúdo de arquivo continua não sendo lido por esta trava, e é isso que o teste prende.
  assert.deepEqual(io.chamadas.map((c) => c[0]), ['lerDiretorio', 'exploreCongelado']);
});

test('wiring I5 — o Explore escrito com outra caixa é pego pelo congelamento', () => {
  const r = decidir(escrever(`${RAIZ}/outputs/Explore/gaps.md`, 'reescrito'), { congelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /congelad/i);
});

test('wiring — travessia que reentra no projeto é pega pela zona imutável', () => {
  const r = decidir(escrever(`${RAIZ}/outputs/../CLAUDE.md`, 'x'));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('wiring — payload sem caminho nenhum libera, sem falhas', () => {
  const r = decidir({ tool_name: 'Write', tool_input: { content: 'sem caminho' } });
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('wiring — payload sem tool_input libera, sem falhas', () => {
  const r = decidir({ tool_name: 'Write' });
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('wiring — caminho FORA da raiz do projeto libera: não é nosso para fiscalizar', () => {
  // `relativizar` devolve `null` para o absoluto que não está sob a raiz. A decisão é liberar, e
  // ela está certa: o harness governa este repositório, não o disco do consultor. Negar aqui
  // quebraria toda escrita legítima fora do projeto. A contrapartida — um `file_path` absoluto
  // num formato incompatível com a raiz também liberaria — deixou de ser silenciosa na rodada A:
  // `relativizar` passou a tratar caminho NÃO absoluto como já relativo à raiz, então `CLAUDE.md`
  // e `.\CLAUDE.md` chegam avaliáveis em vez de virarem `null`.
  const r = decidir(escrever('/outro-repo/CLAUDE.md', 'x'));
  assert.equal(r.acao, 'allow');
  assert.deepEqual(r.falhas, []);
});

test('wiring — file_path RELATIVO continua sendo fiscalizado', () => {
  const r = decidir(escrever('CLAUDE.md', 'x'));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('wiring — bloqueante que lança continua NEGANDO e dizendo que a falha é do harness', () => {
  // A `lerAnterior` que lançava `EACCES` ocupava este lugar. Ela saiu com a exceção do
  // autobloqueio, mas a postura assimétrica do `despachar` continua sendo o que garante o
  // fail-safe das duas travas, e o `exploreCongelado` do `IO_REAL` ainda pode lançar (o
  // `estaCongelado` relança o que não é ausência). Este é o caminho por onde isso vira deny.
  const erro = new Error('permission denied'); erro.code = 'EACCES';
  const io = { ...ioFalso({ congelado: true }), exploreCongelado: () => { throw erro; } };
  const r = despachar(escrever(`${RAIZ}/outputs/explore/gaps.md`, 'x'), criarRegistro(io));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /falha do harness/i);
  assert.match(r.motivo, /permission/i);
});

test('wiring I6 — fora do Explore, o congelamento NÃO toca o disco', () => {
  // A ordem antiga rodava `estaCongelado(process.cwd())` em TODA escrita de qualquer arquivo do
  // projeto, varrendo `outputs/explore/` inteiro para produzir um valor que não podia mudar a
  // decisão fora dali. Pertencimento é puro e barato; I/O vem depois.
  const io = ioFalso({ congelado: true });
  // SÓ A ENTRADA `congelamento`, e a isolação é o que faz o teste medir o que ele diz medir. O
  // `exploreCongelado` deixou de ter um consumidor só: desde a Decisão 22 o `fecho-explore` também
  // o consulta, e `outputs/spec/modules.md` é justamente a âncora de fronteira dele — pela tabela
  // inteira, a chamada que aparece é a DELE, e filtrar por nome de operação passaria a acusar a
  // trava errada. Isolar prende a ordem desta trava, e continua matando a mutação que a inverte.
  const soCongelamento = criarRegistro(io).filter((v) => v.nome === 'congelamento');
  assert.equal(soCongelamento.length, 1, 'a entrada `congelamento` saiu do registro ou trocou de nome');
  despachar(escrever(`${RAIZ}/outputs/spec/modules.md`, '# Módulos'), soCongelamento);
  // NENHUMA chamada, e não só nenhum `exploreCongelado`. Desde o conserto do I1 a trava também
  // resolve a raiz dos artefatos (um `lerDiretorio`), e é o pré-filtro puro `podeSerDoExplore` que
  // impede esse custo de aparecer em toda escrita do projeto. Filtrar por operação esconderia
  // exatamente a regressão que este teste existe para pegar.
  assert.deepEqual(io.chamadas, []);
});

test('wiring I6 — dentro do Explore, o disco é consultado uma vez por pergunta, na raiz certa', () => {
  const io = ioFalso({ congelado: true });
  despachar(escrever(`${RAIZ}/outputs/explore/gaps.md`, 'x'), criarRegistro(io));
  // Mono-repo (o `lerDiretorio` da dublê levanta `ENOENT`, que o `descobrirWorkspace` lê como
  // "nada existe → mono-repo"): a raiz dos artefatos é a `cwd`, e é ela que vai ao marcador.
  assert.deepEqual(io.chamadas, [['lerDiretorio', RAIZ], ['exploreCongelado', RAIZ]]);
});

test('wiring — Bash não dispara nenhuma das duas travas', () => {
  const io = ioFalso({ congelado: true });
  const r = despachar({ tool_name: 'Bash', tool_input: { command: 'ls' } }, criarRegistro(io));
  assert.equal(r.acao, 'allow');
  assert.deepEqual(io.chamadas, []);
});

// ————— DEFEITO 2: informativo não pode negar por retorno normal —————

test('informativo que devolve deny NÃO nega — é erro de configuração registrado em falhas', () => {
  const denyInfo = { nome: 'i-deny', gatilhos: ['Write'], bloqueia: false, executar: () => ({ acao: 'deny', motivo: 'nao deveria' }) };
  const r = despachar({ tool_name: 'Write' }, [denyInfo]);
  assert.equal(r.acao, 'allow');
  assert.equal(r.falhas.length, 1);
  assert.equal(r.falhas[0].nome, 'i-deny');
  assert.match(r.falhas[0].erro, /informativo/);
});

test('bloqueante que devolve deny continua negando, mesmo com a checagem de bloqueia', () => {
  const r = despachar({ tool_name: 'Write' }, [denyBloq]);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /negado pelo b-deny/);
});

test('informativo tentando negar seguido de bloqueante que nega resulta em deny do bloqueante, com o erro de configuração também registrado', () => {
  const denyInfo = { nome: 'i-deny', gatilhos: ['Write'], bloqueia: false, executar: () => ({ acao: 'deny', motivo: 'nao deveria' }) };
  const r = despachar({ tool_name: 'Write' }, [denyInfo, denyBloq]);
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /negado pelo b-deny/);
  assert.equal(r.falhas.length, 1);
  assert.equal(r.falhas[0].nome, 'i-deny');
});

// ————— DEFEITO 1: main()/interpretarEntrada não pode confundir ausência com corrupção —————

test('interpretarEntrada libera quando o conteúdo é vazio', () => {
  const r = interpretarEntrada('');
  assert.equal(r.acao, 'allow');
  assert.equal(r.payload, null);
});

test('interpretarEntrada libera quando o conteúdo é só espaço em branco', () => {
  const r = interpretarEntrada('   \n\t  ');
  assert.equal(r.acao, 'allow');
});

test('interpretarEntrada nega quando o conteúdo não é vazio e é JSON malformado', () => {
  const r = interpretarEntrada('{ isto nao eh json valido');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /harness|ambiente/i);
});

test('interpretarEntrada segue com o payload parseado quando o JSON é válido', () => {
  const r = interpretarEntrada('{"tool_name":"Write"}');
  assert.equal(r.acao, 'prosseguir');
  assert.deepEqual(r.payload, { tool_name: 'Write' });
});

test('emitirDeny devolve o JSON que o Claude Code espera', () => {
  const j = JSON.parse(emitirDeny('porque sim'));
  assert.equal(j.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(j.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(j.hookSpecificOutput.permissionDecisionReason, 'porque sim');
});

// ————— C6: `file_path` vazio não pode mascarar um `notebook_path` real —————

test('C6 — file_path vazio com notebook_path real continua sendo fiscalizado', () => {
  // `input.file_path ?? input.notebook_path` só cai no segundo campo quando o primeiro é
  // `null`/`undefined`. String VAZIA passa pelo `??`, cai no `if (!bruto) return null`, e `null`
  // aqui LIBERA — um payload com `file_path: ''` e `notebook_path` de verdade contornava as duas
  // travas. `||` fecha, e não perde nada: caminho vazio não é caminho, então não existe chamador
  // legítimo que queira dizer "" e ser levado a sério.
  const r = decidir({
    tool_name: 'NotebookEdit',
    tool_input: { file_path: '', notebook_path: `${RAIZ}/.claude/hooks/kit.ipynb`, new_source: 'x' },
  });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

// ——————————— C4: resolução de caminho por IDENTIDADE de arquivo (dev+ino) ———————————
//
// Sete formas de escrever o mesmo caminho contornavam as duas travas, e as sete escrevem no
// arquivo REAL (verificado executando `writeFileSync` em cada uma): `\\?\C:\...`, `\\.\C:\...`,
// `//?/C:/...`, `\\localhost\C$\...`, `\\127.0.0.1\C$\...`, `CLAUDE.md::$DATA` e `C:CLAUDE.md`.
// Some-se o nome curto 8.3 (`MURILO~1`), que a revisão não testou. Cinco delas continuam fechadas;
// as duas de UNC saíram no D2, por custo de I/O de rede — ver `aliasesDe`.
//
// NÃO se canoniza por string aqui. Três rodadas foram gastas assim e cada uma achou uma família
// nova de alias — `\\?\`, depois UNC administrativo, depois stream do NTFS. `realpathSync.native`
// também não basta: ele resolve 8.3, `\\?\` e `\\.\`, mas PRESERVA `\\localhost\C$\`. Quem sabe o
// que a string quer dizer é o sistema de arquivos, então a pergunta passa a ser feita a ele: sobe
// de pai em pai comparando `dev`+`ino` contra os da raiz. Isso fecha a família inteira de uma vez,
// inclusive as formas que ninguém enumerou ainda.

const ehWindows = process.platform === 'win32';

/** Projeto de mentira em disco real, com as duas zonas que as travas fiscalizam. */
function projetoTemporario() {
  // `realpathSync.native` de propósito: `tmpdir()` no Windows costuma vir em nome curto 8.3
  // (`C:\Users\MURILO~1\...`), e o teste do 8.3 precisa das DUAS formas para valer alguma coisa.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'pre-')));
  mkdirSync(join(raiz, 'outputs', 'explore', 'anexos'), { recursive: true });
  mkdirSync(join(raiz, '.claude', 'hooks'), { recursive: true });
  writeFileSync(join(raiz, 'CLAUDE.md'), '# CLAUDE\n');
  writeFileSync(join(raiz, '.claude', 'hooks', 'kit.mjs'), '// kit\n');
  return raiz;
}

/**
 * Roda `fn` com o `process.cwd()` apontando para `raiz`, e devolve a cwd anterior no fim.
 *
 * `process.chdir` é o único jeito de apontar o `IO_REAL.cwd` — que é `process.cwd()` — para um
 * fixture. Os testes de topo de um arquivo do `node:test` rodam em SÉRIE, então isto não corre com
 * nenhum outro teste deste arquivo; e o `finally` devolve a cwd mesmo se a asserção falhar, para
 * não contaminar os testes seguintes (o `REGISTRO exportado nega de verdade` depende da cwd real).
 */
function noDiretorio(raiz, fn) {
  const antes = process.cwd();
  process.chdir(raiz);
  try { return fn(); } finally { process.chdir(antes); }
}

/**
 * Formas alternativas de escrever `<raiz>\<rel>` que o Windows aceita e que escrevem no mesmo
 * arquivo.
 *
 * O D2 TIROU DAQUI `\\localhost\C$\...` e `\\127.0.0.1\C$\...`, e a perda é deliberada. Os dois
 * são UNC de REDE pela forma, e não existe jeito de saber que o host é local sem perguntar a ele —
 * perguntar é justamente o `statSync` que custa 2,87 s num host inexistente e 43,1 s num IP que
 * não responde. Sob o modelo de acidente, pendurar o gate por dezenas de segundos em cima de
 * trabalho legítimo é pior que deixar de reconhecer um alias que ninguém digita por engano. A
 * spec já registra a família de aliases como baixa prioridade sob este modelo.
 */
function aliasesDe(raiz, rel) {
  const w = raiz.replace(/\//g, '\\');
  const relW = rel.replace(/\//g, '\\');
  return [
    ['canônico', join(raiz, rel)],
    ['\\\\?\\', '\\\\?\\' + w + '\\' + relW],
    ['\\\\.\\', '\\\\.\\' + w + '\\' + relW],
    ['//?/', '//?/' + w.replace(/\\/g, '/') + '/' + rel],
    ['stream ::$DATA', join(raiz, rel) + '::$DATA'],
  ];
}

test('C4 — as formas de escrever CLAUDE.md são pegas pela zona imutável, pelo REGISTRO real', { skip: !ehWindows && 'aliases de caminho são específicos do Windows' }, () => {
  const raiz = projetoTemporario();
  noDiretorio(raiz, () => {
    for (const [nome, caminho] of aliasesDe(raiz, 'CLAUDE.md')) {
      const r = despachar({ tool_name: 'Write', tool_input: { file_path: caminho, content: 'x' } }, REGISTRO);
      assert.equal(r.acao, 'deny', `${nome} (${caminho}) devia ser negado`);
      assert.match(r.motivo, /zona imutável/i, nome);
    }
    // Mais uma: relativo à unidade (`C:CLAUDE.md`), que só faz sentido com a cwd na raiz.
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: raiz.slice(0, 2) + 'CLAUDE.md', content: 'x' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny', 'caminho relativo à unidade');
    assert.match(r.motivo, /zona imutável/i);
  });
});

test('C4 — o nome curto 8.3 do Windows também é pego', { skip: !ehWindows && 'nome curto 8.3 é específico do Windows' }, () => {
  // `C:\Users\MURILO~1\...` e `C:\Users\MuriloLopes\...` são o MESMO diretório para o SO e strings
  // completamente diferentes. `tmpdir()` já entrega o nome curto nesta máquina, então o par existe
  // sem precisar fabricá-lo. Se um dia não houver divergência entre as duas formas, o teste passa
  // por trivialidade — por isso ele afirma antes que as strings de fato diferem.
  const curto = mkdtempSync(join(tmpdir(), 'pre83-'));
  const longo = realpathSync.native(curto);
  if (curto === longo) return; // sem nome curto neste volume: nada a provar
  mkdirSync(join(longo, '.claude', 'hooks'), { recursive: true });
  writeFileSync(join(longo, 'CLAUDE.md'), '# CLAUDE\n');
  noDiretorio(longo, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(curto, 'CLAUDE.md'), content: 'x' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny', `nome curto ${curto} devia ser negado`);
    assert.match(r.motivo, /zona imutável/i);
  });
});

test('C4 — as formas alternativas também são pegas pelo CONGELAMENTO, não só pela zona imutável', { skip: !ehWindows && 'aliases de caminho são específicos do Windows' }, () => {
  const raiz = projetoTemporario();
  writeFileSync(join(raiz, 'outputs', 'explore', 'hld-funcional.md'), '# HLD\n\nCorpo.\n');
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec', '_explore-congelado.md'), '# Explore congelado\n');
  noDiretorio(raiz, () => {
    for (const [nome, caminho] of aliasesDe(raiz, 'outputs/explore/hld-funcional.md')) {
      const r = despachar({ tool_name: 'Write', tool_input: { file_path: caminho, content: 'reescrito' } }, REGISTRO);
      assert.equal(r.acao, 'deny', `${nome} (${caminho}) devia ser negado`);
      assert.match(r.motivo, /congelad/i, nome);
    }
  });
});

test('C4 — diretório que ainda NÃO existe não pode virar `null`: escrita criando árvore nova é pega', () => {
  // Devolver `null` aqui LIBERARIA a escrita. A subida acumula o nome do ancestral inexistente e
  // segue procurando um que exista, em vez de desistir no primeiro `ENOENT`.
  const raiz = projetoTemporario();
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(raiz, '.claude', 'hooks', 'novo', 'sub', 'y.mjs'), content: 'x' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /zona imutável/i);
  });
});

test('C4 — escrita FORA do projeto continua liberada: o harness governa este repositório, não o disco', () => {
  const raiz = projetoTemporario();
  const fora = realpathSync.native(mkdtempSync(join(tmpdir(), 'fora-')));
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(fora, 'CLAUDE.md'), content: 'x' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'allow', r.motivo || '');
    assert.deepEqual(r.falhas, []);
  });
});

test('C4 — a resolução por identidade devolve o relativo com a CAIXA que o chamador escreveu', () => {
  // A identidade decide PERTENCIMENTO; a string só aparece na mensagem de erro, e lá ela tem que
  // ser o que o usuário digitou. A comparação insensível a caixa do `casa()` cuida do resto.
  const raiz = projetoTemporario();
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  const r = relativizarPorIdentidade(raiz, join(raiz, 'outputs', 'Explore', 'gaps.md'));
  assert.equal(r.decidiu, true);
  assert.equal(r.rel, 'outputs/Explore/gaps.md');
});

test('C4 — a resolução por identidade responde os casos-base sem depender de plataforma', () => {
  const raiz = projetoTemporario();
  const casos = [
    ['canônico', join(raiz, 'CLAUDE.md'), 'CLAUDE.md'],
    ['subdiretório', join(raiz, '.claude', 'hooks', 'kit.mjs'), '.claude/hooks/kit.mjs'],
    ['travessia reentrante', join(raiz, 'outputs', '..', 'CLAUDE.md'), 'CLAUDE.md'],
    ['arquivo que não existe', join(raiz, 'outputs', 'explore', 'novo.md'), 'outputs/explore/novo.md'],
    ['árvore que não existe', join(raiz, 'outputs', 'explore', 'novo', 'sub', 'x.md'), 'outputs/explore/novo/sub/x.md'],
    ['fora do projeto', join(realpathSync.native(mkdtempSync(join(tmpdir(), 'fora2-'))), 'x.md'), null],
  ];
  for (const [nome, caminho, esperado] of casos) {
    const r = relativizarPorIdentidade(raiz, caminho);
    assert.equal(r.decidiu, true, nome);
    assert.equal(r.rel, esperado, nome);
  }
});

test('C4 — caminho relativo é resolvido contra a raiz informada, não contra o acaso da cwd', () => {
  const raiz = projetoTemporario();
  const r = relativizarPorIdentidade(raiz, 'CLAUDE.md');
  assert.equal(r.decidiu, true);
  assert.equal(r.rel, 'CLAUDE.md');
});

test('C4 — ancestral ILEGÍVEL não vira deny de "falha do harness": não decide, e a casca cai no texto', () => {
  // Medido executando: `statSync` sobre `\\servidor-que-nao-existe\share\x.md` levanta `UNKNOWN`,
  // que não é `ENOENT` nem `ENOTDIR`. Relançar ali produziria deny de "falha do harness, reporte"
  // sobre uma escrita FORA do projeto — o consultor sem VPN, ou com um share desmontado, receberia
  // ordem de caçar um bug que não existe. Antes desta rodada essa escrita simplesmente liberava,
  // então relançar seria REGREDIR o falso positivo em cima de trabalho legítimo.
  //
  // A saída não é engolir o erro: é dizer que a identidade não decidiu e deixar a resolução
  // TEXTUAL responder — que é o mesmo caminho de recuo do sistema de arquivos sem `ino`. O texto
  // sempre responde, e para o caminho canônico ele responde CERTO: a trava continua mordendo
  // dentro do projeto. O buraco residual exige, ao mesmo tempo, um alias do Windows E um ancestral
  // ilegível dentro do projeto — e nesse caso a defesa é exatamente a que existia antes do C4,
  // nunca pior que ela.
  const raiz = projetoTemporario();
  // O alvo tem que ter ancestral INTERMEDIÁRIO — é ele que fica ilegível. Se o pai do alvo já
  // fosse a raiz, a subida acertaria na primeira comparação e o ramo nem seria exercitado.
  const alvo = join(raiz, '.claude', 'hooks', 'kit.mjs');
  const statearRuim = (caminho, opcoes) => {
    if (String(caminho) === raiz) return realStat(caminho, opcoes);
    const e = new Error('unknown error'); e.code = 'UNKNOWN'; throw e;
  };
  const r = relativizarPorIdentidade(raiz, alvo, statearRuim);
  assert.equal(r.decidiu, false);
  // E a casca, com o `statSync` de verdade, continua decidindo e negando.
  const rr = despachar({ tool_name: 'Write', tool_input: { file_path: alvo, content: 'x' } }, criarRegistro({
    ...IO_REAL,
    cwd: () => raiz,
  }));
  assert.equal(rr.acao, 'deny');
  assert.match(rr.motivo, /zona imutável/i);
});

test('C4 — sem identidade disponível a função não decide, e a casca cai na resolução TEXTUAL', () => {
  // Sistema de arquivos que não fornece `ino`, ou raiz que não pôde ser consultada: `decidiu`
  // vem `false` e o chamador usa `relativizar` do kit. `decidiu:false` e `rel:null` são coisas
  // DIFERENTES de propósito — o protótipo devolvia `null` para as duas, e nessa forma quem chama
  // não consegue distinguir "está fora do projeto" (libera, e está certo) de "não consegui
  // decidir" (tem que cair no caminho de texto, não liberar).
  const inexistente = join(tmpdir(), 'raiz-que-nao-existe-' + Date.now());
  const r = relativizarPorIdentidade(inexistente, join(inexistente, 'CLAUDE.md'));
  assert.equal(r.decidiu, false);
  assert.equal(IO_REAL.relativizar(inexistente, join(inexistente, 'CLAUDE.md')), 'CLAUDE.md');
});

// ——————————— C3: as operações do IO_REAL, contra disco de verdade ———————————
//
// `criarRegistro(io)` nasceu porque o wiring não tinha ponto de injeção. O ponto foi criado e o
// DUBLÊ passou a ser testado; o objeto que o `main()` de fato usa, não. Medido pela revisão numa
// cópia do repositório inteiro, quatro mutações em `IO_REAL` derrubavam ZERO testes; três eram de
// `lerAnterior`, que saiu com a exceção do autobloqueio. Sobra `exploreCongelado` sempre `false`,
// que é a trava de congelamento virando no-op EM PRODUÇÃO, e é o que os testes abaixo matam.

/** Cria o marcador de congelamento em `raiz`, como o `promocao.mjs` fará. */
function congelarProjeto(raiz) {
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'spec', '_explore-congelado.md'), '# Explore congelado\n');
}

test('C3 — IO_REAL.exploreCongelado enxerga o MARCADOR em disco: escrita no Explore congelado é NEGADA', () => {
  const raiz = projetoTemporario();
  writeFileSync(join(raiz, 'outputs', 'explore', 'hld-funcional.md'), '# HLD\n\nCorpo.\n');
  congelarProjeto(raiz);
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: 'outputs/explore/hld-funcional.md', content: '# HLD\n\nOutro corpo.\n' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny');
    assert.match(r.motivo, /congelad/i);
    assert.match(r.motivo, /_explore-congelado\.md/, 'a saída anunciada tem que ser a de verdade');
  });
});

test('C3 — IO_REAL.exploreCongelado devolve false sem o marcador: escrita no Explore é liberada', () => {
  const raiz = projetoTemporario();
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), '# GAPs\n\nsem carimbo\n');
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: 'outputs/explore/gaps.md', content: '# GAPs\n\nrascunho\n' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'allow', r.motivo || '');
  });
});

test('C3 — IO_REAL.cwd e IO_REAL.exploreCongelado leem a MESMA raiz: outro projeto não congela este', () => {
  // Mutação `cwd` devolvendo raiz errada: o congelamento passaria a consultar outro diretório.
  // Aqui o projeto A está congelado e o B não; trabalhar em B não pode ser bloqueado.
  const a = projetoTemporario();
  congelarProjeto(a);
  const b = projetoTemporario();
  noDiretorio(b, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(b, 'outputs', 'explore', 'gaps.md'), content: '# GAPs\n\nrascunho\n' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'allow', r.motivo || '');
  });
  noDiretorio(a, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: join(a, 'outputs', 'explore', 'gaps.md'), content: '# GAPs\n\nrascunho\n' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny');
  });
});

test('C3 — D1 ponta a ponta pela casca REAL: o `gaps.md` que documenta o congelamento NÃO congela o projeto', () => {
  // O pior defeito das rodadas anteriores sob o modelo de acidente, verificado onde ele de fato
  // acontecia. As DUAS formas de citação estão no documento: a que morava numa cerca de código, e
  // a que morava em blockquote solto — esta última era a que NÃO tinha conserto por regex, porque
  // é byte a byte o carimbo real. Com o marcador, nenhuma das duas decide nada.
  const raiz = projetoTemporario();
  writeFileSync(
    join(raiz, 'outputs', 'explore', 'gaps.md'),
    '# GAPs\n\nQuando o `spec-product` fecha, cada documento recebe:\n\n```markdown\n' +
      CARIMBO + '\n```\n\nOu, em prosa, a linha abaixo:\n\n' + CARIMBO +
      '\n\nAinda NÃO executamos o congelamento.\n',
  );
  noDiretorio(raiz, () => {
    // Editar OUTRO documento passa...
    const outro = despachar(
      { tool_name: 'Write', tool_input: { file_path: 'outputs/explore/hld-funcional.md', content: '# HLD\n\ncorpo\n' } },
      REGISTRO,
    );
    assert.equal(outro.acao, 'allow', outro.motivo || '');
    // ...e corrigir o PRÓPRIO `gaps.md` também. Era este o impasse: o documento que causava o
    // congelamento ficava ele mesmo inelegível para correção.
    const proprio = despachar(
      { tool_name: 'Write', tool_input: { file_path: 'outputs/explore/gaps.md', content: '# GAPs\n\nmais uma questão aberta\n' } },
      REGISTRO,
    );
    assert.equal(proprio.acao, 'allow', proprio.motivo || '');
  });
});

test('C3 — pela casca REAL, o Explore congelado nega e o arquivo em disco não muda', () => {
  const raiz = projetoTemporario();
  const corpo = '# GAPs\n\n## GAP-001 — prazo do boleto\n\nQuestão aberta com o cliente.\n';
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), corpo);
  congelarProjeto(raiz);
  noDiretorio(raiz, () => {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: 'outputs/explore/gaps.md', content: corpo + '\n' + CARIMBO + '\n' } },
      REGISTRO,
    );
    assert.equal(r.acao, 'deny');
    assert.equal(readFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), 'utf8'), corpo);
  });
});

// ————— I1: a trava julgava contra a `cwd`, e em MULTI-REPO ela nunca mordia —————
//
// Medido na fonte e por execução, antes do conserto:
//   ehDoExplore('outputs/explore/gaps.md')              : true
//   ehDoExplore('portal-docs/outputs/explore/gaps.md')  : false
//   estaCongelado('X', stat) / estaCongelado('X/portal-docs', stat) : false / true
//   avaliarCongelamento('portal-docs/outputs/explore/gaps.md', true) : null   ← liberava
//
// A assimetria era DUPLA: `ehDoExplore` é ancorado em prefixo, e não reconhecia o caminho prefixado
// pela subpasta do repo de docs; e a trava relativizava contra `io.cwd()` e perguntava
// `io.exploreCongelado(io.cwd())`, enquanto o `fecho-explore` lia `ws.raizArtefatos` — os dois
// olhando raízes diferentes.
//
// POR QUE ISSO NÃO ERA SÓ UM CANTO. Multi-repo é o layout que a rule do Explore trata como normal
// (o `workspace.md` é o primeiro artefato que ela manda criar), e é a trava do congelamento que
// PAGA a dispensa de frescor da Decisão 22: forjar o marcador desliga o frescor e liga a proibição
// de escrita no Explore. Cega em multi-repo, a contrapartida não mordia, e depois do congelamento
// nenhuma trava perguntava se o Explore mudou.
//
// A RAIZ VEM DO `descobrirWorkspace`, o MESMO mecanismo do `fecho-explore` — uma segunda noção de
// "raiz dos artefatos" divergiria da primeira, que é a família de defeito que esta série fechou.

/** Workspace multi-repo REAL: `portal-docs` é o único candidato a repo de docs. */
function workspaceMultiRepo({ congelado = true } = {}) {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'pre-multi-')));
  mkdirSync(join(raiz, 'portal-docs', 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'portal-docs', 'outputs', 'spec'), { recursive: true });
  writeFileSync(join(raiz, 'portal-docs', 'outputs', 'explore', 'gaps.md'), '# GAPs\n\nCorpo.\n');
  if (congelado) congelarProjeto(join(raiz, 'portal-docs'));
  // Irmão que NÃO é candidato: não tem `outputs/explore` nem `outputs/spec`. Sem ele o fixture não
  // distinguiria "achou o repo de docs" de "pegou a única subpasta que existe".
  mkdirSync(join(raiz, 'portal-app', 'src'), { recursive: true });
  writeFileSync(join(raiz, 'portal-app', 'src', 'app.ts'), 'export const x = 1;\n');
  return raiz;
}

const soTrava = (nome, io) => criarRegistro(io).filter((v) => v.nome === nome);

test('I1 — MULTI-REPO congelado: a escrita no Explore do repo de docs é NEGADA', () => {
  const raiz = workspaceMultiRepo();
  const io = { ...IO_REAL, cwd: () => raiz };
  // AS DUAS FORMAS DE `file_path` que o PreToolUse entrega, porque o segundo `relativizar` é contra
  // a raiz dos ARTEFATOS e a forma do caminho é o que decide se ele acerta: absoluto (com o
  // separador nativo, que o `join` produz) e relativo à `cwd` — este último é o que o `C3` mostra
  // ser real, e é justamente a forma que uma composição ingênua leria como relativa ao repo de docs.
  for (const alvo of [
    join(raiz, 'portal-docs', 'outputs', 'explore', 'gaps.md'),
    'portal-docs/outputs/explore/gaps.md',
    './portal-docs/outputs/explore/novo.md',
  ]) {
    const r = despachar(
      { tool_name: 'Write', tool_input: { file_path: alvo, content: '# outro\n' } },
      soTrava('congelamento', io),
    );
    assert.equal(r.acao, 'deny', alvo);
    assert.match(r.motivo, /congelad/i);
    // O caminho citado é relativo à raiz dos ARTEFATOS, e não à `cwd`: a mensagem de um bloqueante
    // é a instrução que o consultor segue, e ela tem que falar do arquivo em que ele mexeu.
    assert.match(r.motivo, /`outputs\/explore\//, r.motivo);
    assert.match(r.motivo, /_explore-congelado\.md/);
  }
});

test('I1 — MULTI-REPO sem o marcador: a MESMA escrita libera — a outra ponta', () => {
  // Sem este par, uma trava que passasse a negar tudo em multi-repo satisfaria o teste de cima.
  const raiz = workspaceMultiRepo({ congelado: false });
  const io = { ...IO_REAL, cwd: () => raiz };
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: join(raiz, 'portal-docs', 'outputs', 'explore', 'gaps.md'), content: '# outro\n' } },
    soTrava('congelamento', io),
  );
  assert.equal(r.acao, 'allow', r.motivo || '');
});

test('I1 — MULTI-REPO: FORA do Explore continua liberando, e sem tocar o disco', () => {
  // A TERCEIRA PONTA, e sem ela as duas de cima passariam com uma trava que nega tudo. Ela mede
  // duas coisas de uma vez: o veredito, e que o pré-filtro puro corta ANTES do disco — o custo do
  // `descobrirWorkspace` não pode aparecer em toda escrita do projeto (ver `I6`).
  const raiz = workspaceMultiRepo();
  const chamadas = [];
  const io = {
    ...IO_REAL,
    cwd: () => raiz,
    lerDiretorio: (...a) => { chamadas.push('lerDiretorio'); return IO_REAL.lerDiretorio(...a); },
    exploreCongelado: (...a) => { chamadas.push('exploreCongelado'); return IO_REAL.exploreCongelado(...a); },
  };
  for (const alvo of [
    join(raiz, 'portal-app', 'src', 'app.ts'),
    join(raiz, 'portal-docs', 'outputs', 'spec', 'modules.md'),
    join(raiz, 'portal-docs', 'CLAUDE.md'),
  ]) {
    const r = despachar({ tool_name: 'Write', tool_input: { file_path: alvo, content: 'x' } }, soTrava('congelamento', io));
    assert.equal(r.acao, 'allow', `${alvo}: ${r.motivo || ''}`);
  }
  assert.deepEqual(chamadas, [], 'fora do Explore a trava não pode tocar o disco');
});

test('I1 — MONO-REPO não mudou de veredito: congelado nega, não congelado libera', () => {
  // A exigência explícita do dono: há muitos testes verdes sobre o mono-repo (o `A7` da composição
  // entre eles), e o conserto não pode movê-lo. Aqui as duas pontas, pela casca real.
  const congelado = projetoTemporario();
  congelarProjeto(congelado);
  const io = (raiz) => ({ ...IO_REAL, cwd: () => raiz });
  const escrita = (raiz) => ({
    tool_name: 'Write',
    tool_input: { file_path: join(raiz, 'outputs', 'explore', 'gaps.md'), content: '# x\n' },
  });
  const negado = despachar(escrita(congelado), soTrava('congelamento', io(congelado)));
  assert.equal(negado.acao, 'deny');
  assert.match(negado.motivo, /congelad/i);

  const livre = projetoTemporario();
  const liberado = despachar(escrita(livre), soTrava('congelamento', io(livre)));
  assert.equal(liberado.acao, 'allow', liberado.motivo || '');
});

test('I1 — workspace AMBÍGUO nega: bloqueante que não sabe onde olhar não libera', () => {
  // FALHA FECHADO, e é coerente com o `fecho-explore`, que já nega com "workspace indeterminado"
  // nesse caso. Liberar seria pior aqui do que lá: o marcador mora num dos candidatos, e a
  // resposta "não achei" seria lida como "não está congelado".
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'pre-ambiguo-')));
  for (const sub of ['portal-docs', 'outro-docs']) {
    mkdirSync(join(raiz, sub, 'outputs', 'explore'), { recursive: true });
    mkdirSync(join(raiz, sub, 'outputs', 'spec'), { recursive: true });
  }
  const io = { ...IO_REAL, cwd: () => raiz };
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: join(raiz, 'portal-docs', 'outputs', 'explore', 'gaps.md'), content: 'x' } },
    soTrava('congelamento', io),
  );
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /workspace indeterminado/i);
  assert.match(r.motivo, /ambiguo/);
  assert.match(r.motivo, /portal-docs/);
  assert.match(r.motivo, /outro-docs/);
  assert.match(r.motivo, /--validar/);
});

test('I1 — raiz ILEGÍVEL nega, e é o `io.lerDiretorio` da trava que responde', () => {
  // Duas coisas: a outra metade da falha fechada (`cwd-ilegivel`), e o wiring — a trava tem que
  // passar o `io.lerDiretorio` ao `descobrirWorkspace`, e não deixá-lo cair no `readdirSync`
  // default, que leria o disco de verdade e responderia "mono-repo" sobre uma raiz ilegível.
  const raiz = projetoTemporario();
  const io = {
    ...IO_REAL,
    cwd: () => raiz,
    lerDiretorio: () => { const e = new Error('permission denied'); e.code = 'EACCES'; throw e; },
  };
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: join(raiz, 'outputs', 'explore', 'gaps.md'), content: 'x' } },
    soTrava('congelamento', io),
  );
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /workspace indeterminado/i);
  assert.match(r.motivo, /cwd-ilegivel/);
});

// ————————— D2: I/O de REDE não acontece dentro do gate —————————
//
// Medido nesta máquina, com `statSync` sobre share fora do ar: `\\host-inexistente\share\a.md`
// custa 2,87 s e `\\192.0.2.77\share\a.md` custa 43,1 s. A subida por identidade pagava isso a
// cada `Write` cujo alvo estivesse numa share morta — o consultor fora da VPN penduraria o gate
// por dezenas de segundos, em cima de uma escrita que nem é do projeto.
//
// Sob o modelo de ACIDENTE a escolha é fácil: caminho UNC de rede não entra na subida; cai na
// resolução textual, que responde na hora e devolve "fora do projeto". O que se perde é o alias
// `\\localhost\C$\...` para um caminho local, que ninguém digita por engano.

/** Uma casca real com a raiz apontada para o fixture, e com `statear` injetável na resolução. */
function ioSobre(raiz, statear) {
  return {
    ...IO_REAL,
    cwd: () => raiz,
    relativizar: (rz, bruto) => {
      const r = statear
        ? relativizarPorIdentidade(rz, bruto, statear)
        : relativizarPorIdentidade(rz, bruto);
      return r.decidiu ? r.rel : relativizar(rz, bruto);
    },
  };
}

test('D2 — caminho UNC de REDE não faz nenhum `statSync`: a identidade recusa antes de tocar a rede', () => {
  const raiz = projetoTemporario();
  let chamadas = 0;
  const contando = (caminho, opcoes) => { chamadas++; return realStat(caminho, opcoes); };
  const r = relativizarPorIdentidade(raiz, '\\\\192.0.2.77\\share\\a.md', contando);
  assert.equal(r.decidiu, false, 'rede é "não decidi", para o texto responder');
  assert.equal(chamadas, 0, 'nenhum statSync pode ser emitido sobre caminho de rede');
});

test('D2 — as formas de UNC de rede que importam são todas recusadas pela subida', () => {
  const raiz = projetoTemporario();
  // `statear` REAL, e contado: a recusa tem que vir da forma do caminho, não de um dublê que
  // lança. Uma dublê que lançasse daria `decidiu:false` por acidente, sem provar nada.
  let chamadas = 0;
  const contando = (caminho, opcoes) => { chamadas++; return realStat(caminho, opcoes); };
  const deRede = [
    '\\\\192.0.2.77\\share\\a.md',
    '\\\\host-inexistente\\share\\a.md',
    '//192.0.2.77/share/a.md',
    '\\\\localhost\\C$\\Windows\\notepad.exe',
    '\\\\?\\UNC\\192.0.2.77\\share\\a.md',
  ];
  for (const p of deRede) {
    const r = relativizarPorIdentidade(raiz, p, contando);
    assert.equal(r.decidiu, false, p);
  }
  assert.equal(chamadas, 0, 'nenhuma das formas de rede pode emitir statSync');
});

test('N2 — `\\\\?\\unc\\` em MINÚSCULAS também é rede: a flag `i` do casamento é o que garante isso', () => {
  // Windows não liga para a caixa do prefixo, e `\\?\unc\servidor\share\a.md` grava no mesmo lugar
  // que a forma maiúscula. Sem a flag `i`, esta forma volta a ser classificada como caminho LOCAL
  // de dispositivo, entra na subida e paga o `statSync` na rede — 2,9 s a 43 s numa share morta.
  // As cinco formas maiúsculas do teste acima sobrevivem à remoção da flag; esta não.
  const raiz = projetoTemporario();
  let chamadas = 0;
  const contando = (caminho, opcoes) => { chamadas++; return realStat(caminho, opcoes); };
  for (const p of ['\\\\?\\unc\\192.0.2.77\\share\\a.md', '\\\\?\\Unc\\servidor\\share\\a.md']) {
    const r = relativizarPorIdentidade(raiz, p, contando);
    assert.equal(r.decidiu, false, p);
  }
  assert.equal(chamadas, 0, 'forma minúscula de UNC não pode emitir statSync');
});

// ————— E2: o que acontece num projeto que MORA numa share, medido —————
//
// O JSDoc de `ehCaminhoDeRede` afirmava que um projeto hospedado em share "continua resolvendo por
// identidade, porque a share da `cwd` está viva por construção". É falso, e estes dois testes são
// a medição que o desmente — eles fixam o comportamento real para que o comentário corrigido tenha
// quem o defenda.

const RAIZ_EM_SHARE = '\\\\servidor\\share\\proj';

/** Espião que conta e recusa como share morta recusa (`UNKNOWN`), sem tocar em rede nenhuma. */
function statMorto() {
  let n = 0;
  const f = () => { n++; const e = new Error('UNKNOWN'); e.code = 'UNKNOWN'; throw e; };
  f.chamadas = () => n;
  return f;
}

test('E2 — projeto em share com alvo ABSOLUTO: a identidade nunca roda, e o texto responde CERTO', () => {
  const stat = statMorto();
  const alvo = RAIZ_EM_SHARE + '\\CLAUDE.md';
  const r = relativizarPorIdentidade(RAIZ_EM_SHARE, alvo, stat);
  assert.equal(r.decidiu, false, 'o ALVO é UNC, e é o alvo que a guarda testa');
  assert.equal(stat.chamadas(), 0, 'nem a raiz é stateada: a guarda vem antes de todo I/O');
  // E a trava CONTINUA valendo, porque o recuo textual acerta a forma canônica. O que se perde
  // num projeto em share é o fechamento da família de aliases, não a trava.
  assert.equal(relativizar(RAIZ_EM_SHARE, alvo), 'CLAUDE.md');
  assert.equal(
    relativizar(RAIZ_EM_SHARE, RAIZ_EM_SHARE + '\\outputs\\explore\\gaps.md'),
    'outputs/explore/gaps.md',
  );
});

test('E2 — projeto em share com alvo RELATIVO: a guarda não morde e a rede É consultada uma vez', () => {
  // Corolário que o comentário antigo também errava ao ser lido como "nenhum I/O de rede": a
  // string relativa não começa com `\\`, então a subida começa e stateia a RAIZ, que é de rede.
  const stat = statMorto();
  const r = relativizarPorIdentidade(RAIZ_EM_SHARE, 'outputs/explore/gaps.md', stat);
  assert.equal(r.decidiu, false, 'raiz ilegível: quem responde é o texto');
  assert.equal(stat.chamadas(), 1, 'uma chamada, na raiz — não zero');
  assert.equal(relativizar(RAIZ_EM_SHARE, 'outputs/explore/gaps.md'), 'outputs/explore/gaps.md');
});

test('D2 — `\\\\?\\C:\\...` e `\\\\.\\C:\\...` NÃO são rede: continuam na subida por identidade', () => {
  // Prefixo estendido do Win32 para um caminho LOCAL. Confundi-lo com UNC devolveria a família
  // inteira de aliases que o C4 fechou — é o furo que este teste existe para impedir.
  const raiz = projetoTemporario();
  const w = raiz.replace(/\//g, '\\');
  for (const p of ['\\\\?\\' + w + '\\CLAUDE.md', '\\\\.\\' + w + '\\CLAUDE.md']) {
    const r = relativizarPorIdentidade(raiz, p);
    assert.equal(r.decidiu, true, p);
    assert.equal(r.rel, 'CLAUDE.md', p);
  }
});

test('D2 — escrita numa share fora do ar responde em menos de 100 ms, pelo REGISTRO montado sobre a casca real', () => {
  const raiz = projetoTemporario();
  const registro = criarRegistro(ioSobre(raiz));
  const inicio = process.hrtime.bigint();
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: '\\\\host-inexistente-xyz\\share\\a.md', content: 'x' } },
    registro,
  );
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
  assert.equal(r.acao, 'allow', r.motivo || '');
  assert.ok(ms < 100, `o gate levou ${ms.toFixed(1)} ms — share morta não pode pendurar o PreToolUse`);
});

// ————————— D3: `semStream` corta só o ÚLTIMO segmento, como o JSDoc sempre disse —————————

test('D3 — `:` em nome de DIRETÓRIO é preservado: o corte de stream é só no último segmento', () => {
  // O JSDoc afirma "o corte é só no ÚLTIMO segmento… cortar segmento do meio reescreveria nome de
  // diretório legítimo"; o código cortava todos. Inalcançável no Windows (`:` não é válido em nome
  // de diretório), FALSO POSITIVO REAL em macOS/Linux, onde é. `statear` é injetado porque o
  // diretório não pode ser criado nesta plataforma — o que se exercita é a montagem do relativo.
  const raiz = projetoTemporario();
  const alvo = join(raiz, 'skills:backup', 'notas.md');
  const soARaiz = (caminho, opcoes) => {
    if (String(caminho) === raiz) return realStat(caminho, opcoes);
    const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e;
  };
  const r = relativizarPorIdentidade(raiz, alvo, soARaiz);
  assert.equal(r.decidiu, true);
  assert.equal(r.rel, 'skills:backup/notas.md');
});

test('D3 — cortar segmento do meio produzia DENY FALSO na zona imutável', () => {
  // `.claude/skills:backup/notas.md` virava `.claude/skills/notas.md`, que casa `.claude/skills/`
  // na ZONA_IMUTAVEL. Sob o
  // modelo de acidente este é o pior tipo de defeito: trabalho legítimo negado por um caminho que
  // o próprio harness reescreveu.
  const raiz = projetoTemporario();
  const alvo = join(raiz, '.claude', 'skills:backup', 'notas.md');
  const soARaiz = (caminho, opcoes) => {
    if (String(caminho) === raiz) return realStat(caminho, opcoes);
    const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e;
  };
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: alvo, content: 'x' } },
    criarRegistro(ioSobre(raiz, soARaiz)),
  );
  assert.equal(r.acao, 'allow', r.motivo || '');
});

test('D3 — o sufixo de stream do NTFS continua sendo cortado no último segmento', () => {
  // A contrapartida: o corte que o C4 introduziu não pode sumir junto. `CLAUDE.md::$DATA` escreve
  // no MESMO arquivo que `CLAUDE.md`, e sem o corte a string não casa a ZONA_IMUTAVEL.
  const raiz = projetoTemporario();
  const r = relativizarPorIdentidade(raiz, join(raiz, 'CLAUDE.md') + '::$DATA');
  assert.equal(r.decidiu, true);
  assert.equal(r.rel, 'CLAUDE.md');
});

// ————————— D4: as guardas que o JSDoc chama de load-bearing e nenhum teste defendia —————————

test('D4 — `ino` zerado NÃO decide: sem a guarda as duas travas somem em silêncio', () => {
  // `st.ino === 0n → null` existe porque um sistema de arquivos que devolve `ino: 0` devolve o
  // MESMO par para tudo. Sem a guarda, `mesmoArquivo` casa no PRIMEIRO ancestral, o relativo
  // devolvido encolhe para o nome do arquivo (`kit.mjs`), e `kit.mjs` não casa `.claude/hooks/` na
  // ZONA_IMUTAVEL: a trava desaparece sem uma linha de erro.
  const raiz = projetoTemporario();
  const alvo = join(raiz, '.claude', 'hooks', 'kit.mjs');
  const semIno = () => ({ dev: 7n, ino: 0n });

  const r = relativizarPorIdentidade(raiz, alvo, semIno);
  assert.equal(r.decidiu, false);

  // E a consequência: a casca cai no texto, que responde certo, e a trava continua mordendo.
  const rr = despachar(
    { tool_name: 'Write', tool_input: { file_path: alvo, content: 'x' } },
    criarRegistro(ioSobre(raiz, semIno)),
  );
  assert.equal(rr.acao, 'deny');
  assert.match(rr.motivo, /zona imutável/i);
});

test('D4 — `dev` faz parte da identidade: `ino` igual em volume diferente não é o mesmo diretório', () => {
  // Sem `dev` na comparação, dois diretórios de VOLUMES diferentes com o mesmo número de inode
  // passam a ser "o mesmo diretório" — e um caminho de fora do projeto vira caminho de dentro.
  // `ino` só é único DENTRO de um volume; é por isso que a identidade é o par.
  const raiz = projetoTemporario();
  const irmao = join(dirname(raiz), 'outro-volume-' + Date.now());
  const alvo = join(irmao, 'sub', 'x.md');
  const doisVolumes = (caminho) => {
    const s = String(caminho);
    if (s === raiz) return { dev: 1n, ino: 5n };
    if (s === irmao) return { dev: 2n, ino: 5n }; // MESMO ino, volume diferente
    const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e;
  };
  const r = relativizarPorIdentidade(raiz, alvo, doisVolumes);
  assert.equal(r.decidiu, true);
  assert.equal(r.rel, null, '`ino` igual em `dev` diferente não é o mesmo diretório');
});

test('D4 — profundidade acima de MAX_SUBIDA é "não decidi", nunca "libera"', () => {
  // Trocar o `return NAO_DECIDIU` do fim do laço por "libera" (`rel: null` com `decidiu: true`)
  // abre a zona imutável para qualquer caminho com mais de 64 níveis — `null` no `caminhoEscrito`
  // LIBERA. A resposta certa é recuar para o texto, que sempre responde.
  const raiz = projetoTemporario();
  const fundo = join(raiz, '.claude', 'hooks', ...new Array(70).fill('n'), 'x.mjs');
  const r = relativizarPorIdentidade(raiz, fundo);
  assert.equal(r.decidiu, false);

  const rr = despachar(
    { tool_name: 'Write', tool_input: { file_path: fundo, content: 'x' } },
    criarRegistro(ioSobre(raiz)),
  );
  assert.equal(rr.acao, 'deny');
  assert.match(rr.motivo, /zona imutável/i);
});

// ————————————————————————————— Decisão 40: a trava aprende onde está —————————————————————————————

test('Decisão 67: Write e Edit na zona imutável — negam no clone, passam no template', () => {
  const alvo = `${RAIZ}/.claude/skills/spec-report/SKILL.md`;
  const editar = { tool_name: 'Edit', tool_input: { file_path: alvo, old_string: 'a', new_string: 'b' } };
  for (const payload of [escrever(alvo, 'x'), editar]) {
    const clone = decidir(payload);
    assert.equal(clone.acao, 'deny', payload.tool_name);
    assert.match(clone.motivo, /muda no template, não aqui/);
    assert.equal(decidir(payload, { template: true }).acao, 'allow', `${payload.tool_name} no template`);
  }
});

test('Decisão 67: Write do marcador é negado no clone e livre no template', () => {
  const marcador = escrever(`${RAIZ}/.harness-template`, '');
  const clone = decidir(marcador);
  assert.equal(clone.acao, 'deny');
  assert.match(clone.motivo, /marcador do template/);
  assert.equal(decidir(marcador, { template: true }).acao, 'allow');
});

test('Decisão 40: Write fora da zona não pergunta ehTemplate', () => {
  const io = ioFalso({ template: true });
  despachar(escrever(`${RAIZ}/inputs/briefing.md`, 'x'), criarRegistro(io));
  assert.equal(io.chamadas.filter((c) => c[0] === 'ehTemplate').length, 0);
});

test('Decisão 40: o IO_REAL responde pelo marcador em disco', () => {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'tpl-real-')));
  try {
    assert.equal(IO_REAL.ehTemplate(raiz), false);
    writeFileSync(join(raiz, '.harness-template'), '');
    assert.equal(IO_REAL.ehTemplate(raiz), true);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

// ————————————————————— PowerShell e extensões do projeto, pelo despachante —————————————————————

test('wiring — a tool PowerShell passa pela trava da zona (antes escapava de todas)', () => {
  const r = decidir({ tool_name: 'PowerShell', tool_input: { command: 'Remove-Item harness-zona.lock.json' } });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /PowerShell/);
  const m = decidir({ tool_name: 'PowerShell', tool_input: { command: 'New-Item .harness-template' } });
  assert.equal(m.acao, 'deny');
  assert.match(m.motivo, /marcador do template/);
});

test('wiring — Write de agente próprio passa no clone com manifesto; agente do pacote não', () => {
  const manifesto = { zona: ['.claude/agents/', '.claude/skills/'], arquivos: { '.claude/agents/corretor.md': 'h' } };
  assert.equal(decidir(escrever(`${RAIZ}/.claude/agents/meu.md`, 'x'), { manifesto }).acao, 'allow');
  assert.equal(decidir(escrever(`${RAIZ}/.claude/skills/minha/SKILL.md`, 'x'), { manifesto }).acao, 'allow');
  assert.equal(decidir(escrever(`${RAIZ}/.claude/agents/corretor.md`, 'x'), { manifesto }).acao, 'deny');
  assert.equal(decidir(escrever(`${RAIZ}/.claude/agents/meu.md`, 'x')).acao, 'deny', 'sem manifesto nega como antes');
  const io = ioFalso({ manifesto });
  despachar(escrever(`${RAIZ}/inputs/a.md`, 'x'), criarRegistro(io));
  assert.equal(io.chamadas.filter((c) => c[0] === 'manifestoDaZona').length, 0, 'fora da zona não lê o manifesto');
});

test('o IO_REAL lê o manifesto da raiz, e null quando falta ou está ilegível', () => {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'manif-real-')));
  try {
    assert.equal(IO_REAL.manifestoDaZona(raiz), null);
    writeFileSync(join(raiz, 'harness-zona.lock.json'), 'não é json');
    assert.equal(IO_REAL.manifestoDaZona(raiz), null);
    writeFileSync(join(raiz, 'harness-zona.lock.json'), JSON.stringify({ formato: 1, zona: ['a/'], arquivos: {} }));
    assert.deepEqual(IO_REAL.manifestoDaZona(raiz).zona, ['a/']);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
