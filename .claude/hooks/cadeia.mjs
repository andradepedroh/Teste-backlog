// Harness Elo v2 — Pré-requisitos da cadeia de skills. Núcleo puro + casca de I/O.
//
// Materializa em trava os validadores que o Elo-Spec-Kit hoje só DECLARA no texto dos SKILL.md.
// Sem isso, `V-PRD-02` e companhia dependem de o modelo obedecer — que é a assimetria que a
// spec inteira existe para corrigir.
//
// ÂNCORA ÚNICA, só invocação de skill (Decisão 13). Âncora de arquivo aqui daria falso
// positivo: abrir data-model.json para corrigir um enum à mão não é rodar a spec-data-model.
// Errar por omissão custa artefato incompleto, que é visível; errar por excesso custa um
// consultor bloqueado sem entender por quê.
//
// Skill fora da tabela PASSA. Isto é verificação de dependência, não lista de permissão.

import { RAIZ_SPEC, RAIZ_EXPLORE, chave } from './kit.mjs';

/**
 * skill → artefatos que precisam existir antes dela, relativos a `outputs/spec/`, que é a raiz
 * ÚNICA do Plan.
 *
 * A FORMA DE CADA ENTRADA É A DO `inventariar`: caminho relativo à raiz, com barra normal, SEM
 * repetir o prefixo da raiz. Um nome escrito de outro jeito não casa nunca e produz falso
 * positivo permanente sem nenhum teste vermelho — por isso `nenhuma exigência repete a raiz...`
 * existe no teste.
 *
 * A ordem de `exige` é a ordem em que aparecem na mensagem de erro: do mais fundamental ao
 * mais derivado, porque é a ordem em que o usuário vai resolver.
 *
 * `exigeNoExplore` existe só para a spec-prototype, que no pré-projeto roda sobre o de-para da
 * rule `explore.md` em vez dos artefatos do kit.
 *
 * DUAS AUSÊNCIAS SÃO DECIDIDAS, NÃO ESQUECIDAS, e estão escritas aqui para que ninguém precise
 * redescobrir por que:
 *
 * 1. A `spec-test-plan`. A `RAZAO_EXTRA` da `spec-tasks` afirma que ela vem antes — e vem: a
 *    `plan.md` a numera 5, antes da `spec-tasks` (6). O `SKILL.md` dela declara
 *    `requirements.md`, `product-requirements.md` e `business-rules.md` como insumos, então uma
 *    entrada seria defensável. Fica de fora pela assimetria de custo desta trava: acrescentar
 *    linha a um BLOQUEANTE é ampliar a superfície de falso positivo, e quem decide a tabela é a
 *    spec, não o implementador. A dependência real que importa — `spec-tasks` sem `test-plan.md`
 *    — já está coberta pela linha da `spec-tasks`.
 *
 * 2. O ORQUESTRADOR `spec`. Ele chega nas DUAS formas — nua (`spec`) e prefixada (`plugin:spec`,
 *    porque skill servida por plugin é invocada como `plugin:skill`; `superpowers:` e
 *    `anthropic-skills:` são os exemplos vivos nesta máquina) —, e `avaliar` devolve `null` para
 *    ela em qualquer das duas, sem tocar o disco. Fica
 *    fora de propósito: o `/spec` roda `spec-ingest → spec-legacy → spec-benchmark → spec-product`
 *    por prosa, e cada filha é fiscalizada na PRÓPRIA invocação. Pôr o orquestrador aqui cobraria
 *    o artefato de uma etapa que talvez nem rode na execução em curso — falso positivo em cima de
 *    trabalho legítimo, que é o erro caro desta camada.
 *
 *    O LIMITE QUE ISSO DEIXA ABERTO, e ele é real: se o modelo delegar às filhas por prosa em vez
 *    de usar a tool `Skill`, nenhuma das doze entradas fala, e a cadeia inteira passa sem
 *    verificação. É o limite conhecido da âncora única (Decisão 13), e o orquestrador é o caso em
 *    que ele custa mais. Não se fecha acrescentando linha aqui; fecha-se com uma âncora que não
 *    seja de invocação de skill, o que é decisão de spec. Registrado, não consertado.
 */
export const PRE_REQUISITOS = new Map([
  ['spec-legacy', {
    exige: ['context-map.md'],
    validador: 'V-LEG-01',
  }],
  ['spec-benchmark', {
    exige: ['context-map.md', 'discovery-document.md'],
    validador: 'V-BEN-01',
  }],
  ['spec-product', {
    exige: ['context-map.md', 'discovery-document.md'],
    validador: 'V-PRD-01',
  }],
  ['spec-prototype', {
    exige: [
      'modules.md',
      'requirements/requirements.md',
      'business-rules.md',
      'product-requirements/product-requirements.md',
    ],
    exigeNoExplore: ['hld-funcional.md', 'especificacao-funcional.md'],
    validador: 'V-PRD-02',
  }],
  ['spec-tech-rules', {
    exige: ['requirements/requirements.md', 'product-requirements/product-requirements.md'],
    validador: 'CADEIA-TEC-00',
  }],
  ['spec-hld', {
    exige: ['tech-rules/tech-rules-summary.md'],
    validador: 'CADEIA-TEC-05',
  }],
  ['spec-data-model', {
    exige: ['tech-rules/tech-rules-summary.md'],
    validador: 'CADEIA-TEC-01',
  }],
  ['spec-api-contracts', {
    exige: ['data-model.json'],
    validador: 'CADEIA-TEC-02',
  }],
  ['spec-tasks', {
    exige: ['data-model.json', 'api-contracts.yaml', 'test-plan.md'],
    validador: 'CADEIA-TEC-03',
  }],
  ['spec-security-review', {
    exige: ['tasks.json', 'plano-de-seguranca.md'],
    validador: 'CADEIA-SEC-01',
  }],
  ['spec-estimate', {
    exige: ['tasks.json'],
    validador: 'CADEIA-TEC-04',
  }],
  ['spec-scaffold', {
    exige: ['tech-rules/tech-rules-summary.md', 'data-model.json', 'api-contracts.yaml'],
    validador: 'CADEIA-DEV-01',
  }],
  ['spec-implement', {
    exige: ['tasks.json'],
    validador: 'CADEIA-DEV-02',
  }],
]);

/**
 * Explicação extra, só onde a dependência não é óbvia por si.
 * "Falta o arquivo X" resolve o sintoma; a razão resolve a próxima vez.
 */
export const RAZAO_EXTRA = new Map([
  ['spec-tasks',
    'O `test-plan.md` é a fonte dos cenários de aceite das tasks (homologação não vira item de ' +
    'backlog — `NO_UAT_BACKLOG`). Rodar a `spec-tasks` antes dele deixa as tasks sem os cenários ' +
    'de negócio — e é por isso que neste harness a `spec-test-plan` vem ANTES, invertendo a ' +
    'numeração do kit.'],
  ['spec-security-review',
    'Neste harness a `spec-security-review` **consome** o kernel `plano-de-seguranca.md` em vez ' +
    'de derivar controles sozinha. Rode a `revisao-de-seguranca` no modo `plano-geral` primeiro.'],
  ['spec-prototype',
    'O modo Geração para sem esses artefatos de produto — o bloqueio aqui só antecipa a mensagem ' +
    'que a skill daria depois de já ter lido meio projeto.'],
]);

/**
 * A skill pode rodar agora? Puro.
 *
 * RECEBE O NOME NU. Cortar o prefixo de plugin é trabalho da casca, com o `nomeDaSkill` do
 * kit.mjs — a regra de qual campo do payload significa o quê mora lá, e escrita duas vezes ela
 * diverge.
 *
 * `contexto.fase` e `contexto.presentesExplore` só importam para a spec-prototype no Explore.
 * Sem contexto, vale a semântica do Plan — que é o caso da esmagadora maioria das skills.
 *
 * `contexto.repoDocs` é o NOME da subpasta que é o repo de docs, e só existe em workspace
 * multi-repo. Ver `PREFIXO DO REPO DE DOCS`, abaixo.
 */
export function avaliarSkill(skill, presentes, contexto = {}) {
  // O NOME É COMPARADO POR `chave`, E A MENSAGEM ECOA O NOME CRU. É a forma do `sob()` do kit, e
  // as duas metades importam:
  //   - `nomeChave` decide QUAIS pré-requisitos valem — três tabelas deste harness são indexadas
  //     por nome de skill e o `sync-log.mjs` já as consulta assim desde a Task 7. Não é guarda
  //     nova contra buraco observado: medido, as 26 skills reais do kit têm `name:` minúsculo e
  //     as 68 invocações da tool `Skill` nos transcritos não trazem uma maiúscula. É consistência
  //     — a mesma noção respondida de dois jeitos em quatro lugares é a classe de defeito que
  //     este projeto mais pagou, e aqui a superfície de falso positivo é nula: a única entrada
  //     que passa a ser fiscalizada é a MESMA skill escrita com outra caixa.
  //   - `nome` cru vai para a mensagem. O consultor tem que ler ali o nome como ELE o invocou;
  //     mensagem que ecoa um nome que ele não digitou é mensagem que ele não reconhece. É por
  //     isso que o `toLowerCase` NÃO mora dentro do `nomeDaSkill`, onde resolveria os três sites
  //     de uma vez — ver o teste `a mensagem ecoa o nome CRU`.
  const nome = String(skill || '').trim();
  const nomeChave = chave(nome);
  const def = PRE_REQUISITOS.get(nomeChave);
  if (!def) return null;

  const noExplore = contexto.fase === 'explore' && def.exigeNoExplore;
  const exigidos = noExplore ? def.exigeNoExplore : def.exige;
  const disponiveis = noExplore ? (contexto.presentesExplore || new Set()) : (presentes || new Set());

  // PREFIXO DO REPO DE DOCS. Num workspace multi-repo o consultor está na raiz do workspace e os
  // artefatos moram em `<cwd>/<repo-docs>/outputs/…`; imprimir `outputs/spec/` cru manda olhar num
  // caminho que não existe a partir de onde ele está, e o efeito é o consultor concluir que a
  // trava está quebrada. `avaliar` já tem a resposta pelo `descobrirWorkspace` — é só dizê-la.
  // Em mono-repo o prefixo é vazio e a mensagem fica exatamente como era.
  const prefixo = contexto.repoDocs ? `${contexto.repoDocs}/` : '';

  // Onde o consultor tem que procurar. A RAIZ DO PLAN É UMA — `outputs/spec/`. Ela era duas
  // enquanto havia plugin `spec-*` de versão desconhecida na jogada, escrevendo no layout que o
  // kit descontinuou; com o kit vendorizado em `.claude/skills/` (Decisão 7) isso deixou de ser
  // possível, e o gatilho de remoção estava declarado no `CLAUDE.md`. Manter o fallback agora seria
  // manter caminho morto numa trava bloqueante — e, pior aqui, mandar o consultor procurar num
  // lugar que não existe, que é falso positivo disfarçado de ajuda.
  const raizes = (noExplore ? [RAIZ_EXPLORE] : [RAIZ_SPEC]).map((r) => `${prefixo}${r}/`);
  const ondeProcurar = raizes.map((r) => `\`${r}\``).join(' ou ');

  // COMPARAÇÃO POR `chave`, e não `Set.has` cru. O `kit.mjs` compara caminho assim em toda parte,
  // com a justificativa escrita no JSDoc de `chave` — e esta trava era a exceção. Medido: o FS do
  // Windows, onde este harness roda, é insensível a caixa, então `outputs/spec/Data-Model.json`
  // existe, o SO o encontra, e o `Set.has` respondia que faltava `data-model.json`. Falso positivo
  // em cima de trabalho legítimo, que é o erro caro do modelo de ameaça desta camada.
  const presentesPorChave = new Set([...disponiveis].map((c) => chave(c)));
  const faltando = exigidos.filter((c) => !presentesPorChave.has(chave(c)));
  if (!faltando.length) return null;

  // Pela MESMA chave da `PRE_REQUISITOS`, e não pelo nome cru: consertar só a tabela de cima
  // bloquearia certo mas sem a explicação de POR QUÊ — perda silenciosa, sem teste vermelho.
  const extra = RAZAO_EXTRA.get(nomeChave);
  return {
    acao: 'deny',
    motivo: [
      `Cadeia bloqueada (${def.validador}): \`${nome}\` depende de artefatos que ainda não existem.`,
      '',
      `Faltam em ${ondeProcurar}: ${faltando.map((c) => `\`${c}\``).join(', ')}.`,
      ...(extra ? ['', extra] : []),
      '',
      'Produza o que falta e invoque de novo.',
      '',
      // A ÚLTIMA LINHA NÃO PROMETE MAIS O QUE NÃO EXISTE. Ela dizia "se a ausência for deliberada
      // — escopo reduzido, artefato herdado de outro fornecedor — registre a decisão no
      // `sync-log.md` antes de seguir". Não havia "seguir": registrar não muda a decisão desta
      // trava, e o consultor que obedecia era negado de novo, igual. É a mesma classe do defeito
      // que o `33552a5` consertou na Task 5, e agravava por contraste — o `fecho-explore`, no
      // mesmo registro, oferece uma isenção REAL e ensina onde escrevê-la.
      //
      // O que se diz agora é o que de fato acontece, e é útil nos dois casos que o texto antigo
      // misturava. Esta trava pergunta UMA coisa: o artefato existe? Então artefato herdado tem
      // saída concreta — pôr o arquivo onde ela olha, que é literalmente o caso de uso —, e
      // escopo reduzido não tem saída nenhuma, e a mensagem admite em vez de insinuar. Não há
      // válvula de isenção aqui de propósito: criar uma é decisão de spec, não de implementação.
      `Artefato **herdado** de outro fornecedor tem saída: coloque o arquivo em \`${raizes[0]}\` ` +
      'com o nome acima e registre a origem no `sync-log.md` — esta trava só pergunta se o ' +
      'artefato existe, não quem o produziu.',
      '',
      'Se a ausência for de **escopo reduzido**, não há saída por aqui: a dependência é real e ' +
      'esta skill não tem como rodar sem ela. Registrar no `sync-log.md` não muda esta decisão.',
    ].join('\n'),
  };
}

// ————————————————————————————— casca de I/O —————————————————————————————
//
// ESTE ARQUIVO NÃO IMPORTA `node:fs`, e a ausência é a restrição global 5 do plano em forma
// executável. A casca do plano fazia `const raiz = process.cwd()` e chamava `inventariar` sem
// injeção; a entrada de registro que ele mandava acrescentar seria a ÚNICA das cinco do
// `REGISTRO` sem `io`. Medido pelo brief desta tarefa: com os quinze testes do plano, `avaliar`
// virando no-op COMPLETO — a trava desligada — deixava a suíte verde. É a segunda vez que a
// mesma restrição é violada pelo mesmo plano, e a Task 5 já pagou por ela.
//
// `io` precisa de DUAS operações, e as reais moram no `IO_REAL` do `pretooluse.mjs`:
//   - `cwd()`                                      → raiz do workspace;
//   - `lerDiretorio(dir, { withFileTypes: true })`  → entradas, ou lança.
//
// Não há `lerArquivo` nem `statMs`: esta trava só pergunta se o artefato EXISTE. Conteúdo é
// pergunta de outro verificador.

import { join, basename } from 'node:path';
import { inventariar, detectarFase, nomeDaSkill } from './kit.mjs';
// `chave` já vem do import do topo — a política é a mesma nos dois lados deste arquivo.
import { descobrirWorkspace } from './workspace.mjs';

/**
 * Entrada do despachante. `null` quando não é invocação de skill ou quando a skill pode rodar.
 *
 * A PERGUNTA "É COMIGO?" VEM ANTES DE TODO I/O, e não é economia de milissegundo: `Skill` é o
 * gatilho de TODA invocação, e a esmagadora maioria delas não está na tabela. Passear por três
 * diretórios para depois descobrir que a skill não é fiscalizada seria custo em cima de trabalho
 * que esta trava não tem nada a dizer sobre.
 *
 * O NOME VEM PELO `nomeDaSkill` DO KIT, e é o que impede a tarefa inteira de ser decorativa.
 * Skill servida por plugin é invocada como `plugin:skill`, e o payload traz o nome PREFIXADO —
 * `superpowers:` e `anthropic-skills:` são os exemplos vivos nesta máquina, e enquanto qualquer
 * `spec-*` puder vir de plugin o payload pode trazer `algum-plugin:spec-data-model`. Comparar a
 * string inteira contra uma tabela indexada pelo nome nu faria as DOZE entradas passarem sem
 * verificação nenhuma, com a suíte verde.
 * É o mesmo defeito que a âncora de skill do `fecho-explore` teve na Task 5, e por isso a função
 * mudou de casa para o kit em `63bdf5b` — não escreva uma segunda versão dela aqui.
 *
 * A RAIZ DOS ARTEFATOS NÃO É A CWD. Num workspace multi-repo eles moram em
 * `<cwd>/<repo-docs>/outputs/…` — o `workspace.md` é o primeiro artefato que a `explore.md` manda
 * criar, então multi-repo não é exótico. Tomar a `cwd` como raiz negaria um Plan completo e
 * correto, que é exatamente o falso positivo que a Task 5 mediu e consertou no gate irmão.
 *
 * Workspace que não pôde ser resolvido LANÇA. O `despachar` transforma isso em deny de "falha do
 * harness, reporte", que é a resposta honesta: um bloqueante que não conseguiu olhar não pode
 * liberar, e também não pode negar fingindo que olhou.
 */
export function avaliar(payload, io) {
  const p = payload || {};
  if (String(p.tool_name || '') !== 'Skill') return null;
  const input = p.tool_input || {};
  const skill = nomeDaSkill(input.skill || input.name);
  // A PRÉ-FILTRAGEM USA A MESMA `chave` DO NÚCLEO, e a coincidência não é cosmética: ela decide,
  // antes de todo I/O, se a skill é fiscalizada. Sensível a caixa aqui, `avaliarSkill` nem chega
  // a ser chamado e o `chave` de lá fica decorativo em produção — dois sites da mesma pergunta
  // divergindo, que é exatamente o que esta rodada fecha. O nome que segue para `avaliarSkill` é
  // o CRU, porque é dele que a mensagem de negação sai.
  if (!skill || !PRE_REQUISITOS.has(chave(skill))) return null;

  const ws = descobrirWorkspace(io.cwd(), io.lerDiretorio);
  if (ws.motivo) {
    throw new Error(
      `não foi possível resolver a raiz dos artefatos (${ws.motivo}${ws.detalhe ? `: ${ws.detalhe}` : ''})`,
    );
  }
  const raiz = ws.raizArtefatos;

  const noKit = inventariar(join(raiz, RAIZ_SPEC), io.lerDiretorio);
  const presentesExplore = inventariar(join(raiz, RAIZ_EXPLORE), io.lerDiretorio);

  // `detectarFase` EXIGE os caminhos com o prefixo `outputs/spec/` — é a convenção única que o
  // kit fixou, e o `inventariar` devolve o nome relativo SEM ele. Entregar o retorno cru faz
  // `ehWhitelistExplore` responder `false` para tudo, e aí QUALQUER arquivo em `outputs/spec/` —
  // o `sync-log.md` que o kickoff escreve, inclusive — caracteriza fase Plan. O efeito seria a
  // `spec-prototype` do Explore cobrando os artefatos do kit em todo projeto que já teve kickoff.
  //
  // `temMarcadorUS`/`temRepoCodigo` ficam em `false` de propósito: separam Deliver de Plan, e as
  // duas fases dão o MESMO veredito aqui — só o Explore tem tabela própria. Ler o manifesto para
  // produzir um valor que não pode mudar a decisão custaria `lerArquivo` no `io` sem comprar nada.
  const fase = detectarFase({
    spec: new Set([...noKit].map((rel) => `${RAIZ_SPEC}/${rel}`)),
    temMarcadorUS: false,
    temRepoCodigo: false,
  });

  // A MENSAGEM TEM QUE NOMEAR O REPO DE DOCS quando ele não é a `cwd`. `ws.multiRepo` é exatamente
  // essa pergunta, e o nome da subpasta é o que o consultor precisa digitar a partir de onde ele
  // está. Em mono-repo isto é `null` e a mensagem não ganha prefixo nenhum.
  const repoDocs = ws.multiRepo && ws.docsDir ? basename(ws.docsDir) : null;

  // `noKit` VAI CRU, e já é um `Set` vindo do `inventariar` — não há segundo conjunto para unir,
  // e reenvolvê-lo em `new Set(...)` seria cópia decorativa. Medido chamando a função: `avaliarSkill`
  // não muta o conjunto que recebe (ele só o espalha num `Set` novo para comparar por `chave`), então
  // compartilhá-lo com o `detectarFase` acima é seguro.
  return avaliarSkill(skill, noKit, { fase, presentesExplore, repoDocs });
}
