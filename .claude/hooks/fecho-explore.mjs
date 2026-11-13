// Harness Elo v2 — Gate da fronteira Explore→Plan. Núcleo puro + casca de I/O.
//
// ÂNCORA DUPLA (Decisão 13): invocação de skill de fase Plan, OU escrita em outputs/spec/ fora
// da whitelist do Explore. As duas porque o PreToolUse casa invocação de skill de forma
// confiável, mas nem todo caminho para o Plan passa por uma invocação — e o path é informação
// que o hook tem com certeza.
//
// O gate NÃO morde na spec-ingest de propósito: escrever context-map.md em delta é
// não-destrutivo e re-executável, e a ingestão do Plan pode legitimamente acontecer antes.
// Ele morde no spec-product, primeiro compromisso irreversível.
//
// NÃO verifica profundidade. Documento preenchido e raso passa (Decisão 3); documento VAZIO
// não passa (Decisão 17). Raso é julgamento humano; vazio é fato mecânico.
//
// ESTE É O PRIMEIRO VERIFICADOR BLOQUEANTE DESTA CAMADA que nega trabalho de produto, e isso muda
// o cálculo de todo o resto do arquivo. O modelo de ameaça é acidente e deriva; um falso positivo
// aqui para o consultor no meio do trabalho, e a saída dele é desligar a camada. Duas escolhas
// saem daí e não são negociáveis: a negação lista TODOS os problemas de uma vez, e o gate não
// morde antes do `spec-product`.

// O KICKOFF SAIU DAQUI, e a saída consertou um FALSO POSITIVO EM TRAVA BLOQUEANTE — a categoria
// mais cara que este projeto conhece. Este arquivo definia, sozinho, `RE_KICKOFF`, `montarKickoff`
// e `lerKickoff` num formato — `> **KICKOFF YYYY-MM-DD** · cliente: … · legado: … · protótipo: …` —
// que NÃO EXISTE em lugar nenhum do kit de referência. O kit exige outra coisa, e a valida como
// FATAL (`KICKOFF_PERSISTED`, `spec/SKILL.md:258`), com o formato fixado em
// `tools/references/task-pipeline.md` §4 e lido pelo `check-outputs.py` (`KICKOFF_LEGACY_RE`, que
// decide se os quatro artefatos de legado são obrigatórios).
//
// O FORMATO NÃO ESTÁ ESCRITO AQUI, e a ausência é a mesma doutrina que esta tarefa impôs à
// `plan.md`: fonte escrita duas vezes diverge, e a cópia que diverge é a que alguém vai ler. Quem
// quiser ver a linha literal chama `montarKickoff` (no `kit.mjs`) — é o que a mensagem de negação
// deste gate faz, e é o que o teste `este arquivo não guarda uma segunda cópia do formato` mede.
//
// Consequência do formato inventado: um projeto iniciado CORRETAMENTE pelo orquestrador teria o
// fecho do Explore negado por este gate. A gramática mora agora no `kit.mjs`, que já é o
// vocabulário compartilhado — e não é reexportada daqui: dois caminhos de import para a mesma
// constante é a divergência que a mudança fechou.
import {
  faltantesExplore, ehWhitelistExplore, ARTEFATOS_PROTOTIPO, RAIZ_SPEC,
  caminhoDaTool, nomeDaSkill, chave as chaveDeComparacao,
  MARCADOR_CONGELAMENTO, DIR_ISENCOES, lerKickoff, montarKickoff,
  PROTOTIPO_MD, FIDELIDADE_DO_EXPLORE, lerFidelidade, nivelDeFidelidade,
} from './kit.mjs';
// A `chave` DO KIT ENTRA COM OUTRO NOME, de propósito: `lerCampo(corpo, chave)`, mais abaixo, já
// tem um parâmetro chamado `chave` — nome de campo do bloco `gate:isencao`, coisa completamente
// diferente. Importar como `chave` é legal em JS e a sombra silenciosa dentro daquela função é
// exatamente o tipo de armadilha que a próxima pessoa lê errado.

/** Skills cuja invocação caracteriza compromisso irreversível com o Plan. */
export const SKILLS_DO_PLAN = new Set(['spec-product', 'spec-tech-rules']);

/** O relatório que prova que alguém rodou o `revisao.mjs`. Ver `estadoRevisao`. */
export const RELATORIO_REVISAO = RAIZ_SPEC + '/revisao.json';

/** O comando que EMITE o relatório. A mensagem de negação cita este literal — ver `decidir`. */
export const COMANDO_REVISAO = `node .claude/hooks/revisao.mjs --json > ${RELATORIO_REVISAO}`;

/**
 * Escritas em `outputs/spec/` que NÃO são compromisso com o Plan, e por isso não disparam o gate.
 *
 * SOBROU UMA ENTRADA, e a razão de ela ser a única é o que esta lista significa hoje. Aqui mora o
 * caso em que as DUAS perguntas do harness sobre um arquivo de `outputs/spec/` dão respostas
 * DIFERENTES:
 *   - "isto atravessa a fronteira Explore→Plan?" — responde esta lista, mais a whitelist do kit;
 *   - "isto caracteriza fase Plan?" — responde SÓ a `WHITELIST_EXPLORE` (via `detectarFase`).
 *
 * `_explore-congelado.md` é o único arquivo em que elas divergem, e a divergência é desenho:
 *   - **não atravessa a fronteira**, porque é a CONCLUSÃO do Explore, não uma ação do Plan. O
 *     `promocao.mjs` carimba os documentos e SÓ ENTÃO escreve o marcador; se o gate mordesse aqui,
 *     um item que tivesse derivado negaria essa escrita e o projeto ficaria carimbado mas não
 *     marcado: congelamento pela metade, sem trava e sem como refazer. O gate já mordeu no
 *     `spec-product`; morder de novo na linha que registra o resultado dele é duplicidade que só
 *     pode causar dano;
 *   - **caracteriza fase Plan**, porque o congelamento acontece na conclusão do `spec-product`,
 *     isto é, já no Plan. Está escrito no JSDoc de `MARCADOR_CONGELAMENTO`, e é o que o mantém
 *     FORA da `WHITELIST_EXPLORE`.
 *
 * AS OUTRAS DUAS ENTRADAS SAÍRAM DAQUI E FORAM PARA A `WHITELIST_EXPLORE` do `kit.mjs` —
 * `revisao.json` e `auditorias/_isencoes/`. Não é arrumação: mantê-las aqui respondia só a primeira
 * pergunta, e a segunda ficava errada em silêncio. Medido na Task 6: o consultor obedecia ao item 5
 * do gate (`revisao.json`), `detectarFase` respondia `plan`, e a `spec-prototype` — obrigatória no
 * Explore — passava a cobrar artefatos de Plan cujo produtor o fecho negava. Laço fechado, sem
 * saída pelo lado do consultor. Para as duas, a resposta às duas perguntas é a MESMA — o gate as
 * exige ou as oferece, durante o Explore —, então a casa delas é a lista que governa as duas.
 *
 * A justificativa que autoriza uma entrada AQUI passou a ser mais estreita do que era: não basta
 * "é o próprio gate que exige, ou oferece, este arquivo" — isso manda para a whitelist do kit. Aqui
 * só entra o arquivo cuja escrita é do Explore e cuja EXISTÊNCIA é do Plan.
 *
 * Nota histórica, para o caso de a entrada de `_isencoes/` voltar a ser discutida: ela já foi
 * `auditorias/` INTEIRO e a rodada K a estreitou, porque `code-audit.md` e `security-review.md` são
 * saída de fase Plan como qualquer outra e estavam isentos de graça. O `LEDGER_GATE` do `kit.mjs`
 * mora lá também e não está em lista nenhuma, porque medido ele não tem consumidor.
 */
const EXCECOES_DE_FRONTEIRA = [MARCADOR_CONGELAMENTO];

/**
 * Comparação insensível a caixa, como o `casa()` do kit — `outputs/Spec/` é o mesmo diretório.
 * Sem o `toLowerCase()`, num FS insensível a caixa `outputs/Spec/_explore-congelado.md` sai da
 * exceção e o `promocao.mjs` deixa de conseguir fechar o Explore que ele mesmo carimbou.
 *
 * SÓ ARQUIVO EXATO, sem o ramo de diretório-prefixo que esta função tinha. O ramo existia para a
 * entrada `auditorias/_isencoes/`, que foi para a `WHITELIST_EXPLORE`; com a lista reduzida ao
 * marcador ele virou código que nenhuma entrada alcança — e mutá-lo não derrubava teste nenhum,
 * medido. Uma entrada de diretório aqui traria o ramo de volta junto, e com teste; guardá-lo vazio
 * à espera dela é o mesmo tipo de cópia inerte que esta rodada removeu da lista.
 */
function ehExcecaoDeFronteira(rel) {
  const k = String(rel || '').toLowerCase();
  return EXCECOES_DE_FRONTEIRA.some((e) => k === e.toLowerCase());
}

/**
 * Esta ação atravessa a fronteira para o Plan?
 *
 * O segundo parâmetro do plano (`_presentesSpec`) SAIU. Ele nunca foi lido — o sublinhado no nome
 * dizia isso —, e alimentá-lo custava um `inventariar(outputs/spec)` em TODA invocação de `Skill`,
 * `Write`, `Edit` e `NotebookEdit`, inclusive a esmagadora maioria que não atravessa fronteira
 * nenhuma. Medido nesta máquina, num `outputs/spec/` de 171 arquivos: p50 0,49 ms, p95 1,92 ms por
 * chamada. Dentro dos 50 ms da Decisão 14, então nunca foi urgente — mas era trabalho morto, e
 * chamadores que ainda passem o argumento antigo continuam funcionando, sem efeito.
 *
 * O QUE CUSTA DE VERDADE é a travessia, e ela NÃO É RARA — este parágrafo dizia o contrário até a
 * rodada K, e era falso. Medido: `modules.md`, `product-vision.md`, `business-rules.md`,
 * `data-model.json`, `api-contracts.yaml` e `tasks.json` — a superfície de saída do Plan inteira —
 * não estão na `WHITELIST_EXPLORE`. Logo TODA escrita do Plan atravessa a fronteira, e cada uma
 * paga o gate inteiro e é RE-JULGADA por ele. Não existe estado de "já passou": o marcador de
 * congelamento não é consultado AQUI, e continua não sendo — desde a Decisão 22 ele é consultado
 * no `avaliar`, e dispensa UMA das seis exigências (o frescor do relatório), não a travessia.
 *
 * Medido pelo `REGISTRO` real, num `outputs/spec/` de 171 arquivos: escrita FORA da fronteira p50
 * 3,05 ms (nada disso roda), escrita NA fronteira p50 32,11 ms / p95 37,62 ms, `Skill
 * spec-product` p50 26,58 ms / p95 42,33 ms. Remedido na rodada K, neste repositório (que tem um
 * `outputs/spec/` quase vazio, e por isso os números não são comparáveis com os de cima): fronteira
 * p50 7,6 ms / p95 13,4 ms, fora da fronteira p50 0,6 ms, fora da RAIZ p50 0,4 ms — a contenção
 * corta antes de qualquer disco.
 *
 * O custo cabe nos 50 ms da Decisão 14, então não é o problema. O PERFIL DE RISCO era: qualquer
 * drift num artefato do Explore — o `mtime` que `estadoRevisao` compara era o candidato mais
 * provável — congelava o Plan INTEIRO, e não só a primeira ação dele. A Decisão 22 fechou esse
 * caso: com o marcador presente, o FRESCOR do relatório deixa de valer. Parar de RE-JULGAR os
 * outros cinco itens continua sendo mudança de desenho não feita — e a diferença importa, porque
 * re-julgar é o que mantém as cinco exigências valendo depois do congelamento.
 *
 * O QUE A DISPENSA COBRE FOI ESTREITADO DUAS VEZES, e as duas correções são da revisão da Task 4.
 * Ela não dispensa a PRESENÇA do relatório, só a idade dele (I2): `estadoRevisao` respondia `false`
 * para "velho" e para `ENOENT` no mesmo booleano, e dispensar aquele booleano dispensava também
 * "ninguém nunca rodou o `revisao.mjs`" — caso que a justificativa da decisão não cobre e que era
 * alcançável com comandos legítimos. Ver o item 5 no `decidir`.
 *
 * E A CONTRAPARTIDA QUE PAGA A DISPENSA PASSOU A VALER EM MULTI-REPO (I1). O argumento da Decisão
 * 22 é uma troca de travas — forjar o marcador desliga o frescor e LIGA a proibição de escrita sob
 * `outputs/explore/` —, e a trava que entra julgava contra a `cwd`: num workspace multi-repo ela
 * não reconhecia `portal-docs/outputs/explore/gaps.md` e não achava o marcador, então a troca não
 * acontecia e depois do congelamento nenhuma trava perguntava se o Explore mudou. Ela agora resolve
 * a raiz dos artefatos pelo `descobrirWorkspace`, o mesmo mecanismo que este arquivo usa, e o teste
 * `A21` do `composicao.test.mjs` prende a troca no layout multi-repo.
 *
 * E O GATILHO `Bash` TAMBÉM ESTÁ COBERTO, desde o commit seguinte: o `escrita-bash.mjs` (a rede de
 * baixo) tinha a MESMA cegueira e resolve a raiz pelo `criarResolvedorDeArtefatos`, o mesmo
 * mecanismo. Este parágrafo dizia que ela "continua aberta" e que
 * `sed -i portal-docs/outputs/explore/gaps.md` num Explore congelado ainda passava — falso, e
 * verificado por execução: o `A22` do `composicao.test.mjs` prende as quatro famílias de comando
 * (`sed -i`, redireção, `mv`, `rm -rf`) negando em multi-repo. A dependência desta dispensa está
 * satisfeita nos QUATRO gatilhos, não só nos três de escrita.
 *
 * A RESSALVA QUE SOBRA, e ela é de layout, não de gatilho: quando o `outputs/explore/` da própria
 * `cwd` tem CONTEÚDO — documento de verdade, não o `.gitkeep` que o template entrega —, a `cwd`
 * GANHA da subpasta candidata (o `descobrirWorkspace` decide isso, e sem esse ramo as duas travas
 * liberavam o Explore da raiz — ver o I1 da Task 4c). O preço é que uma subpasta candidata deixa de
 * ser governada nesse layout: um Explore congelado dentro de `backup-antes-do-congelamento/` ou de
 * um pré-projeto vendorizado fica escrivível. É deliberado — quem carrega o Explore do projeto é o
 * `outputs/explore/` que tem documento, e negar escrita numa cópia de backup seria falso positivo
 * em trabalho legítimo. Prendido pelo `A23`.
 *
 * O CRITÉRIO É CONTEÚDO, E NÃO EXISTÊNCIA DAS PASTAS, desde a Task 4d — e a diferença não é sutil:
 * o template entrega `outputs/explore/.gitkeep` e `outputs/spec/.gitkeep` RASTREADOS no git, então
 * por existência a `cwd` ganhava em TODO clone, multi-repo ficava desligado por padrão, e o Explore
 * congelado do repo de docs aceitava `Write`, `sed -i` e `rm -rf`. Prendido pelo `A24`.
 *
 * ESTE É O ÚNICO VERIFICADOR QUE NÃO USA `relativizar`, e é deliberado: ele é núcleo puro e não
 * pode chamar `process.cwd()`. Resolve o caminho por outra via — procura o segmento `outputs/spec/`
 * dentro do path e reconstrói o relativo a partir dali —, o que funciona igual para absoluto de
 * Windows, absoluto POSIX e relativo. É a razão de a função não lançar em caminho absoluto como as
 * do `kit.mjs` fazem.
 *
 * E É A RAZÃO DE ELA NÃO CONTER O CAMINHO DENTRO DA RAIZ: a justificativa acima vale para RESOLVER
 * o relativo, não para decidir se o arquivo é deste projeto. Sozinha, esta função responde `true`
 * para `D:/outro-repo/outputs/spec/modules.md`. A contenção mora no `avaliar`, que é quem tem a
 * raiz — ver `dentroDaRaiz`. Quem chamar esta função direto está perguntando "este caminho, se for
 * deste projeto, atravessa a fronteira?", e não "esta ação é do meu projeto?".
 *
 * O corte usa `lastIndexOf`, e não `indexOf`, porque o PREFIXO é que pode conter o segmento por
 * acidente: a raiz do projeto pode morar em `.../outputs/spec/algo/`, e aí o relativo verdadeiro
 * começa na ÚLTIMA ocorrência. O preço é simétrico e está escrito para não ser redescoberto: uma
 * subárvore `outputs/spec/legacy/outputs/spec/` dentro do próprio projeto seria lida como
 * `outputs/spec/…`, perdendo o `legacy/` que a whitelist cobre. Resolver os dois casos de uma vez
 * exige a raiz aqui dentro, isto é, mudar a assinatura — decisão relatada, não tomada.
 */
export function ehPrimeiraAcaoDoPlan(payload) {
  const p = payload || {};
  const tool = String(p.tool_name || '');
  const input = p.tool_input || {};

  if (tool === 'Skill') {
    // POR `chave`, como o corte de caminho logo abaixo e como o `ehExcecaoDeFronteira`: a caixa
    // não separa em lugar nenhum deste arquivo, e a âncora de skill era a última exceção. Não é
    // guarda nova contra buraco observado — medido, as 26 skills reais do kit têm `name:`
    // minúsculo e as 68 invocações da tool `Skill` nos transcritos não trazem uma maiúscula. É
    // consistência: `cadeia.mjs` e `sync-log.mjs` respondem "que skill é esta?" assim, e a mesma
    // noção com três respostas divergentes é a classe de defeito que este projeto mais pagou.
    // A superfície de falso positivo é nula: a única entrada que passa a disparar é a MESMA skill
    // escrita com outra caixa, que já deveria disparar.
    return SKILLS_DO_PLAN.has(chaveDeComparacao(nomeDaSkill(input.skill || input.name)));
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    // `caminhoDaTool` e nao `input.file_path`: o `NotebookEdit` traz o caminho em
    // `notebook_path`. Ler so o primeiro campo com `NotebookEdit` declarado no gatilho ja
    // custou a fiscalizacao de notebook inteira, em silencio, na Task 2. Esta e a terceira vez
    // que o mesmo erro aparece neste plano — por isso a extracao tem um dono unico no kit.mjs.
    const bruto = caminhoDaTool(input);
    const caminho = String(bruto || '').replace(/\\/g, '/');
    if (!caminho.toLowerCase().includes(RAIZ_SPEC + '/')) return false;
    const corte = caminho.toLowerCase().lastIndexOf(RAIZ_SPEC + '/');
    const rel = RAIZ_SPEC + '/' + caminho.slice(corte + RAIZ_SPEC.length + 1);

    if (ehExcecaoDeFronteira(rel)) return false;

    return !ehWhitelistExplore(rel);
  }
  return false;
}

/**
 * O caminho está DENTRO da raiz que o harness governa?
 *
 * Existe porque `ehPrimeiraAcaoDoPlan` responde sobre o caminho, não sobre o projeto, e sozinha
 * ela dispara para `D:/outro-repo/outputs/spec/modules.md`. O invariante que o `pretooluse.mjs`
 * documenta em prosa é o contrário disso: *"`null` (fora da raiz) LIBERA — o harness governa este
 * repositório, não o disco inteiro"*. As outras três entradas do `REGISTRO` o respeitam via
 * `io.relativizar`; esta não podia, porque o núcleo puro não chama `process.cwd()`. A raiz chega
 * aqui pelo `avaliar`, que a tem pelo `io` injetado, e a função continua pura.
 *
 * Caminho RELATIVO é, por definição, relativo à raiz: dentro. Caminho ABSOLUTO precisa começar na
 * raiz. A comparação é insensível a caixa como o resto deste arquivo (`ehExcecaoDeFronteira`, o
 * corte de `ehPrimeiraAcaoDoPlan`) — é o comportamento certo no FS onde este harness roda, e
 * discordar disso num FS sensível a caixa erra para o lado de o gate morder demais, nunca de
 * menos.
 *
 * O QUE ISTO NÃO RESOLVE, e fica escrito: `.claude/worktrees/<branch>/outputs/spec/modules.md` e
 * `node_modules/<pacote>/outputs/spec/modules.md` estão FISICAMENTE dentro da raiz, e continuam
 * disparando. O primeiro é hoje inobservável — `.claude/` é `ZONA_IMUTAVEL`, e aquela trava vem
 * antes desta no `REGISTRO`. O segundo exigiria uma lista de pastas-que-não-são-o-projeto, que é
 * política de outro dono (o `descobrirWorkspace` tem a dele em `IGNORAR`).
 */
export function dentroDaRaiz(raiz, bruto) {
  const alvo = String(bruto || '').replace(/\\/g, '/');
  if (!alvo) return false;
  // `/x`, `C:/x` e `//servidor/share/x` são absolutos; qualquer outra coisa é relativa à raiz.
  if (!/^(?:[a-zA-Z]:)?\//.test(alvo)) return true;
  const base = String(raiz || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!base) return false;
  const a = alvo.toLowerCase();
  const b = base.toLowerCase();
  return a === b || a.startsWith(b + '/');
}

/**
 * Um campo do bloco, e ele NÃO ATRAVESSA A LINHA. `[^\S\r\n]` é "espaço horizontal": espaço e
 * tabulação, nunca quebra de linha.
 *
 * Com `\s*` — como estava até a rodada K — um campo deixado em branco engolia a linha seguinte:
 *
 *     repositorio:
 *     autor: Fulana de Tal
 *
 * lia `repositorio` como `"autor: Fulana de Tal"`. Truthy, e portanto isenção válida pela regra
 * antiga. Medido escrevendo o teste do campo em branco, campo a campo — o campo vazio não é um
 * caso de laboratório: é o formato mais provável de um bloco preenchido pela metade, e ele abria
 * a válvula em vez de fechá-la. Nem `ehPlaceholder` pega isso, porque o valor roubado é real.
 *
 * O `trim()` fecha a outra metade do mesmo buraco: `repositorio: ` com um espaço sobrando (é o que
 * `montarIsencao` produz para campo vazio) devolvia `" "`, que é truthy. Campo só de espaço é
 * campo não preenchido.
 */
function lerCampo(corpo, chave) {
  const h = '[^\\S\\r\\n]*';
  const m = String(corpo || '').match(new RegExp('^' + h + chave + h + ':' + h + '(.+?)' + h + '$', 'im'));
  return m ? m[1].trim() : '';
}

/** Bloco `gate:isencao` — mesma convenção do delivery-gate: o nome do arquivo é cosmético. */
export function parseIsencao(texto) {
  const m = String(texto || '').match(/<!--\s*gate:isencao\s*-->([\s\S]*?)<!--\s*\/gate:isencao\s*-->/);
  if (!m) return null;
  return {
    repositorio: lerCampo(m[1], 'repositorio'),
    autor: lerCampo(m[1], 'autor'),
    data: lerCampo(m[1], 'data'),
    motivo: lerCampo(m[1], 'motivo'),
  };
}

/**
 * O bloco que o consultor precisa escrever, montado a partir dos campos. Par de `parseIsencao`.
 *
 * Existe pelo mesmo motivo que `montarKickoff`: o formato que a mensagem de negação ENSINA e o
 * formato que o gate LÊ têm que ser um só. Enquanto o exemplo da mensagem for uma string escrita
 * à mão em outro lugar do arquivo, ele diverge do parser na primeira mudança, e a divergência
 * aparece como "fiz exatamente o que você mandou e você negou de novo".
 *
 * Os quatro campos são exatamente os que a `.claude/rules/harness/explore.md` promete ao
 * consultor, seção **Marco da fase**: *repositório, autor, data e motivo*.
 */
export function montarIsencao({ repositorio, autor, data, motivo }) {
  return [
    '<!-- gate:isencao -->',
    `repositorio: ${repositorio}`,
    `autor: ${autor}`,
    `data: ${data}`,
    `motivo: ${motivo}`,
    '<!-- /gate:isencao -->',
  ].join('\n');
}

// `ehPlaceholder` é a política de "este campo ainda não foi preenchido de verdade", e o dono dela
// é o `workspace.mjs`, que a usa desde o manifesto do template. Ela era privada; a rodada K a
// exportou — mudança aditiva — em vez de duplicar a regex aqui. Duas escritas da mesma política
// divergem, e a que divergisse por último decidiria quem entra no Plan.
import { ehPlaceholder } from './workspace.mjs';

/**
 * A isenção é uma trilha de auditoria, não um botão de desligar — e por isso os QUATRO campos
 * precisam estar preenchidos DE VERDADE.
 *
 * Antes da rodada K esta função só testava se os campos eram *truthy*, e a consequência foi
 * medida executando: colar o bloco que a PRÓPRIA MENSAGEM DE NEGAÇÃO imprime, sem editar uma
 * letra, liberava um projeto vazio. `<url do repositório de docs>` é truthy. O gradiente todo
 * abria: só o motivo preenchido, tudo com hífen, data absurda.
 *
 * Isso é o pior formato possível de falha nesta camada. O modelo de ameaça é acidente e deriva,
 * não adversário, e o comportamento mais literal-obediente que existe — ler "com o bloco abaixo
 * preenchido", copiar o bloco abaixo, colar — abria a única saída de emergência do único
 * verificador BLOQUEANTE da camada. Ninguém precisava querer burlar nada.
 *
 * O que NÃO se checa aqui, e é deliberado: formato de data, URL bem-formada, autor que exista.
 * Isso é julgamento humano sobre uma decisão humana, e um gate que reprova `2026-13-45` gasta
 * falso positivo em cima de quem está declarando a isenção de boa-fé. O que se checa é o fato
 * mecânico: o campo foi escrito, e não é o token que o gate mandou trocar.
 */
function isencaoValida(i) {
  if (!i) return false;
  const campos = [i.repositorio, i.autor, i.data, i.motivo];
  return campos.every((c) => !!c && !ehPlaceholder(c));
}

// ————— a dispensa de documento opcional (D8 do teste ponta a ponta da 2.6.0) —————
//
// A `explore.md` diz que a ausência do `modelo-de-dados.md` «exige linha de dispensa no `gaps.md`»,
// e o template do `gaps.md` diz «o fecho verifica». Ninguém verificava: medido no teste ponta a
// ponta, a linha foi removida e o fecho continuou liberando. Promessa de verificação que o código
// não cumpre é a família de defeito que este arquivo mais conhece — e aqui ela estava escrita na
// rule e no template que o consultor lê.
//
// O NOME «DISPENSA» JÁ TEM OUTRO USO NESTE ARQUIVO, e as duas coisas não se confundem: a dispensa do
// FRESCOR (Decisão 22, ver o item 5 no `decidir`) é do maquinário; esta é a LINHA que o consultor
// escreve na tabela «Dispensas registradas» do `gaps.md`, registrando que o projeto decidiu não
// produzir um documento opcional.

/** As colunas da tabela «Dispensas registradas» do template `.claude/templates/gaps.md`. */
const COLUNA_ARTEFATO = 'artefato dispensado';
const COLUNAS_DA_DECISAO = ['motivo', 'quem decidiu', 'data'];

const semAcento = (s) => String(s == null ? '' : s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** As células de uma linha de tabela markdown, sem os vazios que as barras de borda produzem. */
function celulasDaLinha(linha) {
  const partes = linha.split('|');
  if (partes[0].trim() === '') partes.shift();
  if (partes.length && partes[partes.length - 1].trim() === '') partes.pop();
  return partes.map((c) => c.trim());
}

/**
 * A célula foi preenchida DE VERDADE? Vazia, só traço (`—`, `-`: em tabela markdown é a forma
 * convencional de «nada aqui», e a matriz de acesso do próprio template a usa assim) e token de
 * exemplo `<…>` não contam. A política de token é a do `ehPlaceholder` — a mesma que a isenção usa.
 */
function celulaPreenchida(c) {
  const t = String(c == null ? '' : c).trim();
  return !!t && !/^[-—–\s]+$/.test(t) && !ehPlaceholder(t);
}

/**
 * O `gaps.md` registra a dispensa de `artefato`?
 *
 * Procura TODA tabela cujo cabeçalho tenha a coluna «Artefato dispensado» (acento e caixa livres:
 * é o cabeçalho do template), e nela uma linha cuja célula de artefato NOMEIE o arquivo — com ou sem
 * `.md`, com ou sem crase ou link — e cujas colunas da decisão (Motivo, Quem decidiu, Data) estejam
 * preenchidas de verdade. A coluna Motivo é obrigatória; as outras duas contam quando existem.
 *
 * POR QUE OS CAMPOS PRECISAM ESTAR PREENCHIDOS, e não basta o nome: a linha é o registro de uma
 * decisão — «decisão não registrada é decisão não tomada», diz a rule —, e a linha que a negação
 * ENSINA (`montarLinhaDeDispensa` com os `<…>`) não pode satisfazer o gate se colada sem editar. É o
 * mesmo cuidado do K/M-1 com o bloco de isenção.
 *
 * O QUE NÃO SE CONFERE é o conteúdo: motivo plausível, data válida, quem decidiu existir. É
 * julgamento humano sobre decisão humana, como na isenção.
 */
export function dispensaRegistrada(textoGaps, artefato) {
  const nome = semAcento(artefato).replace(/\.md$/, '');
  if (!nome) return false;
  let colunas = null;
  for (const bruta of String(textoGaps || '').split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha.startsWith('|')) { colunas = null; continue; }
    const cs = celulasDaLinha(linha);
    if (!colunas) {
      if (cs.some((c) => semAcento(c).includes(COLUNA_ARTEFATO))) colunas = cs.map(semAcento);
      continue;
    }
    if (cs.every((c) => /^:?-{2,}:?$/.test(c))) continue; // a linha separadora do cabeçalho
    const iArtefato = colunas.findIndex((c) => c.includes(COLUNA_ARTEFATO));
    if (!semAcento(cs[iArtefato]).replace(/[`*]/g, '').includes(nome)) continue;
    const indices = COLUNAS_DA_DECISAO.map((k) => colunas.findIndex((c) => c.includes(k)));
    if (indices[0] < 0) continue; // sem coluna Motivo não há decisão registrada
    if (indices.every((i) => i < 0 || celulaPreenchida(cs[i]))) return true;
  }
  return false;
}

/**
 * A linha que a negação ENSINA, montada pelo mesmo arquivo que a lê — par de `dispensaRegistrada`,
 * pela razão de `montarIsencao`: o exemplo da mensagem e o formato que o gate lê têm que ser um só.
 * As colunas são as da tabela «Dispensas registradas» do template do `gaps.md`.
 */
export function montarLinhaDeDispensa({ artefato, motivo, quem, data }) {
  return `| ${artefato} | ${motivo} | ${quem} | ${data} |`;
}

/**
 * Decide passa/não passa. Puro: recebe fatos, devolve veredito. Não lê disco.
 * Lista TODOS os problemas de uma vez — descobrir um, corrigir, descobrir o próximo é o
 * padrão que faz gate ser odiado.
 *
 * A MENSAGEM NÃO PROMETE LEDGER, e isso é correção deliberada. O texto do plano dizia "Registrada
 * no ledger" e "o gate honra e registra" — e `LEDGER_GATE` existe no `kit.mjs` sem nenhum
 * consumidor, medido. O consultor lia aquilo, declarava isenção e concluía que havia trilha de
 * auditoria das dispensas. Não havia. Numa consultoria, isenção sem registro é exatamente o que se
 * quer ter registrado: é o momento em que alguém decidiu pular o fecho do pré-projeto.
 *
 * Este projeto gastou cinco rodadas em comentários que deixaram de dizer a verdade. Mensagem que
 * não diz a verdade é pior, porque quem lê é o consultor e não o próximo desenvolvedor.
 *
 * O que se diz agora é o que de fato acontece: o registro é o **próprio arquivo de declaração**,
 * que fica versionado no git com autor e data. É trilha de auditoria de verdade — só não é um
 * ledger agregado. Se um dia o `LEDGER_GATE` ganhar consumidor, a mensagem volta a poder
 * prometê-lo; escrever nele daqui seria efeito colateral num verificador cujo trabalho é decidir.
 */
export function decidir(ctx) {
  const c = ctx || {};

  // O GATE NÃO SABE ONDE OLHAR. Único caso: duas ou mais pastas candidatas a repo de docs
  // (`motivo: 'ambiguo'`, `raizArtefatos: null`), ou a raiz ilegível (`cwd-ilegivel`).
  //
  // Sai por aqui, sozinho, e é a única exceção à regra de listar TODOS os problemas de uma vez —
  // porque os outros cinco itens só teriam o que dizer sobre uma raiz ARBITRADA, e acusar
  // "hld-funcional.md ausente" sobre um projeto que não é o do consultor é exatamente o defeito
  // C-1 desta rodada em outra forma. Também não há isenção que valha: o arquivo de isenção mora
  // sob a raiz dos artefatos, e não sabemos qual é.
  //
  // Antes da rodada K este caso caía em "Manifesto inválido", que é mentira: o manifesto pode
  // estar perfeito. O comando continua sendo `--validar`, porque ele reporta ESTE problema com
  // estas palavras — só o rótulo é que estava errado.
  if (c.workspace && c.workspace.motivo) {
    return {
      acao: 'deny',
      motivo: [
        'Não dá para dizer onde moram os artefatos deste projeto, e um gate bloqueante que não ' +
        'sabe onde olhar não pode liberar nem acusar.',
        '',
        `**Workspace indeterminado (\`${c.workspace.motivo}\`):** ${c.workspace.detalhe || 'sem detalhe'}.`,
        '',
        'Rode `node .claude/hooks/workspace.mjs --validar` — ele reporta exatamente este mesmo ' +
        'problema. Num workspace multi-repo, o repo de docs é a única subpasta de primeiro nível ' +
        'com `outputs/explore/` **e** `outputs/spec/`.',
      ].join('\n'),
    };
  }

  if (isencaoValida(c.isencao)) {
    return {
      acao: 'allow',
      motivo: `Isenção honrada — ${c.isencao.motivo} (${c.isencao.autor}, ${c.isencao.data}). ` +
        `O registro é o próprio arquivo em \`${DIR_ISENCOES}/\`, versionado no git.`,
    };
  }

  const problemas = [];

  const faltando = faltantesExplore(c.presentesExplore || new Set());
  if (faltando.length) {
    problemas.push(
      `**Documentos do Explore ausentes (${faltando.length}):**\n` +
      faltando.map((f) => `  · \`${f.caminho}\` — ${f.rotulo}`).join('\n'),
    );
  }

  // O DOCUMENTO OPCIONAL AUSENTE SEM A LINHA DE DISPENSA (D8). O fato vem pronto do `avaliar` —
  // quais opcionais faltam E não têm linha no `gaps.md` —, porque ler o `gaps.md` é I/O. Campo
  // ausente é lista vazia: quem chama sem ele está dizendo que não mediu, como nos testes puros.
  // É parte do item dos DOCUMENTOS, e não uma sétima exigência: a contagem de «seis» que os
  // comentários deste arquivo usam continua certa, e o congelamento também não a dispensa.
  for (const artefato of c.dispensasFaltando || []) {
    problemas.push(
      `**\`${artefato}\` ausente e sem dispensa no \`gaps.md\`.** O documento é opcional, mas a ` +
      'ausência é uma decisão — e decisão não registrada é decisão não tomada. Acrescente à tabela ' +
      `«Dispensas registradas» de \`${RAIZ_EXPLORE}/gaps.md\` a linha abaixo, com os três campos ` +
      'depois do nome preenchidos de verdade (colada com os `<…>` ela não conta):\n\n    ' +
      montarLinhaDeDispensa({
        artefato, motivo: '<por que não se aplica>', quem: '<quem decidiu>', data: '<AAAA-MM-DD>',
      }) +
      `\n\nOu escreva o \`${artefato}\` preliminar a partir do template em \`.claude/templates/\`.`,
    );
  }

  if (!c.manifestoValido) {
    problemas.push('**Manifesto inválido.** Rode `node .claude/hooks/workspace.mjs --validar` e corrija o `workspace.md` da raiz.');
  }

  if (!c.kickoff || !c.kickoff.presente) {
    // A LINHA CITADA É MONTADA PELO DONO DA GRAMÁTICA, e não escrita de novo aqui: uma segunda
    // cópia do formato diverge, e foi por não haver formato nenhum escrito que este arquivo
    // inventou o seu. Os `<…>` são placeholders do kit e são INERTES — colar sem preencher não
    // satisfaz o gate, pela mesma regra que impede a linha de exemplo do template de declarar.
    problemas.push(
      '**`outputs/spec/sync-log.md` sem linha de kickoff.** Ela é a memória cronológica das três '
      + 'fases, pré-requisito da `spec-prototype`, e o gate `KICKOFF_PERSISTED` do kit a exige na '
      + 'primeira linha da Seção A. Escreva, na célula `Modo / contexto`:\n\n    '
      + montarKickoff({
        legado: '<Sim|Parcial|Não>', ramo: '<A|B>',
        ambiente: '<cursor|claude|kiro|ambos>', inputs: '<lista>',
      }),
    );
  }

  if (!c.temPrototipo) {
    const faltamArtefatos = ARTEFATOS_PROTOTIPO.filter((a) => !(c.presentesSpec || new Set()).has(a));
    problemas.push(
      '**Protótipo de alta fidelidade ausente ou incompleto.**' +
      (faltamArtefatos.length ? ` Faltam em \`${RAIZ_SPEC}/\`: ${faltamArtefatos.map((a) => `\`${a}\``).join(', ')}.` : '') +
      ' Ele é o principal instrumento de revisão do Explore — clicar em tela real encontra erro de entendimento mais rápido que ler documento.',
    );
  }

  // A FIDELIDADE DECLARADA (D9). Os três arquivos acima não bastam: o `design-system.md` só nasce no
  // modo Geração, e quem escolhia Média e o gerava por fora passava com um protótipo que a rule não
  // aceita. Só se pergunta com o `prototype.md` presente — sem ele, o item acima já diz o que falta,
  // e «fidelidade não declarada» sobre um arquivo que não existe seria a mesma falta dita duas vezes.
  //
  // RE-JULGADO DEPOIS DO CONGELAMENTO, como os outros itens: a Decisão 22 dispensa só o frescor. Se
  // no Plan alguém regerar o protótipo em fidelidade menor, o fecho volta a negar — e a saída é a
  // mesma isenção que a mensagem aponta. É parte do item do PROTÓTIPO, não uma exigência nova.
  if ((c.presentesSpec || new Set()).has(PROTOTIPO_MD)) {
    const declarada = c.fidelidadePrototipo == null ? null : String(c.fidelidadePrototipo);
    if (declarada == null) {
      problemas.push(
        `**Fidelidade do protótipo não declarada no \`${RAIZ_SPEC}/${PROTOTIPO_MD}\`.** O Explore exige ` +
        `protótipo de fidelidade **Alta**, e o fecho a confere pela linha \`Fidelidade:\` do cabeçalho ` +
        '— a que a `spec-prototype` escreve e o gate `MODE_FIDELITY_DECLARED` do kit cobra. Se o ' +
        'protótipo é de fato de alta fidelidade (frontend navegável em `src/`, com o ' +
        '`design-system.md`), escreva no cabeçalho:\n\n    ' +
        `Fidelidade: ${FIDELIDADE_DO_EXPLORE}\n\n` +
        'Se não é, o caminho é gerá-lo em Alta ou declarar a isenção abaixo.',
      );
    } else if (nivelDeFidelidade(declarada) !== FIDELIDADE_DO_EXPLORE) {
      // O valor sai COMO ESCRITO, porque é o que o consultor vai procurar no arquivo — encurtado,
      // porque é texto livre do documento entrando numa mensagem de negação.
      const mostrado = declarada.length > 60 ? `${declarada.slice(0, 59)}…` : declarada;
      problemas.push(
        `**Protótipo declarado em \`Fidelidade: ${mostrado}\`, e o Explore exige Alta.** ` +
        'Fidelidade Média ou Baixa não fecha o Explore: o protótipo de alta fidelidade — o frontend ' +
        'navegável em `src/`, com o `design-system.md` do Passo 3.0.1 — é o principal instrumento de ' +
        'revisão da fase. Gere-o em Alta (`spec-prototype`, modo Geração). Se o pré-projeto foi ' +
        'legitimamente reduzido a um protótipo de fidelidade menor, declare a isenção com o bloco abaixo.',
      );
    }
  }

  const eg = c.errosGramatica || [];
  if (eg.length) {
    problemas.push(
      `**Documentos mal formados ou não preenchidos (${eg.length}):**\n` +
      eg.map((e) => `  · \`${e.arquivo}\`: ${e.erros.join('; ')}`).join('\n'),
    );
  }

  // ————— o item 5: o relatório de revisão —————
  //
  // O FRESCOR DEIXA DE VALER DEPOIS DO CONGELAMENTO (Decisão 22), e a razão é de RELEVÂNCIA, não
  // de custo: o frescor são seis `stat`. O `revisao.json` fala SOBRE o Explore, e depois do
  // congelamento o Explore não muda mais — um `mtime` mexido num dos cinco documentos (um
  // `git checkout`, um editor que salva sem alterar) passaria a negar TODA escrita do Plan até
  // alguém reemitir um relatório sobre um pacote que ninguém mais vai editar.
  //
  // SE O EXPLORE MUDAR MESMO ASSIM, QUEM NEGA É A TRAVA DE CONGELAMENTO, não esta exigência: a
  // pergunta "o Explore mudou depois de revisado?" tem outro dono a partir daqui.
  //
  // E O OUTRO DONO ERA CEGO EM MULTI-REPO — consertado, e fica escrito porque a troca de travas é
  // o argumento desta dispensa e não vale prometer mais do que ela entrega. Medido antes: a trava
  // `congelamento` relativizava contra `io.cwd()` e perguntava `ehDoExplore(rel)`; num workspace
  // multi-repo o alvo chega como `portal-docs/outputs/explore/gaps.md`, `ehDoExplore` devolvia
  // `false` (contra `true` do caminho mono-repo) e o `exploreCongelado(cwd)` também não achava o
  // marcador, que mora em `<repo de docs>/outputs/spec/`. A dispensa valia — este `avaliar` sempre
  // leu o marcador na raiz dos ARTEFATOS — e a trava que a compensa não mordia. Ela agora resolve a
  // raiz pelo `descobrirWorkspace`, o mesmo mecanismo daqui, e o `A21` do `composicao.test.mjs`
  // prende a troca em multi-repo.
  //
  // E O GATILHO `Bash` ESTÁ COBERTO TAMBÉM, que é o vetor ALTO deste projeto — "`sed -i` no arquivo
  // errado é terça-feira". Este bloco dizia que o `escrita-bash.mjs` "continua julgando contra a
  // `cwd`" e que `sed -i portal-docs/outputs/explore/gaps.md` num Explore congelado "ainda passa":
  // falso desde o commit que resolveu a raiz também lá, e verificado por execução. Esta dispensa
  // DEPENDE da trava de escrita, e a dependência está satisfeita nos QUATRO gatilhos —
  // `Write`/`Edit`/`NotebookEdit` pela trava `congelamento` (`A21`) e `Bash` pelo `escrita-bash`
  // (`A22`), os dois resolvendo a raiz dos artefatos pelo MESMO `descobrirWorkspace` daqui.
  //
  // A RESSALVA É DE LAYOUT, e não de gatilho: com a `cwd` tendo `outputs/explore/` E `outputs/spec/`,
  // ela ganha da subpasta candidata, e um Explore congelado DENTRO de uma subpasta candidata (uma
  // cópia de backup, um pré-projeto vendorizado) deixa de ser governado. Deliberado, e o inverso —
  // que valia antes do I1 da Task 4c — protegia o lado errado: a cópia mordia e o Explore de verdade
  // não. Ver o JSDoc de `descobrirWorkspace` e o `A23`.
  //
  // SÓ O FRESCOR CAI. As outras cinco exigências continuam valendo com o marcador presente — é o
  // que o teste `congelado NÃO perdoa as outras cinco exigências` prende —, e a PRESENÇA do
  // relatório também. Presença e frescor eram uma exigência só, por um campo só, até o conserto do
  // I2 desta rodada: `estadoRevisao` respondia `false` para "velho" E para `ENOENT`, então a
  // dispensa — escrita para ruído de `mtime` num pacote congelado — cobria também "ninguém nunca
  // rodou o `revisao.mjs`". A justificativa da decisão não cobre esse caso, e ele era alcançável
  // com comandos legítimos. Ver o JSDoc de `estadoRevisao`.
  //
  // POR QUE ISTO NÃO É A PROPOSTA "MARCADOR ⇒ null", que foi recusada: aquela desligaria o gate
  // INTEIRO — o único bloqueante da camada — mediante a criação de um arquivo que o gate,
  // necessariamente, não vigia. Esta desliga UMA exigência, e o incentivo se inverte por
  // construção: forjar o marcador para se destravar LIGA a negação de escrita sob
  // `outputs/explore/`. O contorno se paga com uma trava pior. Somado a isso, desde o
  // `promocao.mjs --congelar` o marcador tem produtor que confere a invariante antes de criá-lo —
  // ele é sinal de "foi verificado". Do CARIMBO, e não da revisão: é por isso que a presença do
  // relatório não pode se apoiar nele.
  if (!c.revisaoPresente) {
    // A CAUSA MANDA NA AÇÃO, e é por isso que as duas negações são frases diferentes. Esta é
    // "nunca emitido", e a ação é emitir — com o comando que de fato PRODUZ o arquivo. A redação
    // do plano mandava "rode `node .claude/hooks/revisao.mjs` e leia o resultado", o que NÃO cria
    // o `revisao.json`: o consultor obedecia e era negado de novo, para sempre. Instrução de gate
    // bloqueante que não satisfaz o gate é o falso positivo mais caro que existe, porque parece
    // desobediência da ferramenta.
    problemas.push(
      `**Relatório de revisão nunca emitido (\`${RELATORIO_REVISAO}\`).** ` +
      `Emita com \`${COMANDO_REVISAO}\` e leia o resultado antes de avançar. ` +
      'O congelamento do Explore **não** dispensa esta exigência: ele dispensa a idade do ' +
      'relatório, não a existência dele — sem o arquivo, a revisão nunca foi feita.',
    );
  } else if (!c.revisaoFresca && !c.exploreCongelado) {
    // E esta é "desatualizado", cuja ação é REEMITIR — e é o único ramo que o marcador dispensa.
    problemas.push(
      `**Relatório de revisão desatualizado (\`${RELATORIO_REVISAO}\`).** ` +
      'Ele é mais velho que o documento mais recente do Explore, então já não descreve o que está ' +
      `em disco. Reemita com \`${COMANDO_REVISAO}\` e leia o resultado antes de avançar.`,
    );
  }

  if (!problemas.length) return { acao: 'allow', motivo: null };

  return {
    acao: 'deny',
    motivo: [
      'O Explore ainda não está fechado, e o Plan é compromisso irreversível.',
      '',
      ...problemas,
      '',
      '---',
      'GAP em aberto **não** é problema: GAP aberto é combustível do Plan.',
      '',
      'Se este pré-projeto foi legitimamente reduzido — escopo herdado, produto já especificado ' +
      `em outro lugar — declare isenção em \`${DIR_ISENCOES}/\` (o nome do arquivo é livre) com o ` +
      'bloco abaixo preenchido. O gate honra na hora, e o arquivo fica como registro da decisão.',
      '',
      '```markdown',
      montarIsencao({
        repositorio: '<url do repositório de docs>',
        autor: '<quem decidiu>',
        data: '<AAAA-MM-DD>',
        motivo: '<por que o pré-projeto foi reduzido>',
      }),
      '```',
    ].join('\n'),
  };
}

// ————————————————————————————— casca de I/O —————————————————————————————
//
// ESTE ARQUIVO NÃO IMPORTA `node:fs`, e a ausência é a restrição global 5 do plano em forma
// executável. A casca do plano fazia `const raiz = process.cwd()` e chamava `readFileSync`,
// `statSync` e `readdirSync` direto; a entrada de registro que ele mandava acrescentar seria a
// ÚNICA das cinco do `REGISTRO` sem `io`. Medido: com os 28 testes do plano, `avaliar` virando
// no-op COMPLETO — o gate inteiro desligado — deixava a suíte verde. É literalmente a mutação que
// a restrição 5 nomeia, repetida pela segunda vez no mesmo plano.
//
// `io` precisa de CINCO operações, e as operações reais moram no `IO_REAL` do `pretooluse.mjs`:
//   - `cwd()`                            → raiz do projeto;
//   - `lerArquivo(abs, 'utf8')`          → conteúdo, ou lança;
//   - `lerDiretorio(dir, { withFileTypes: true })` → entradas, ou lança;
//   - `statMs(abs)`                      → `mtimeMs`, ou lança;
//   - `exploreCongelado(raiz)`           → boolean, ou lança.
//
// A quinta NÃO É NOVA no `io`: ela já existia para a trava `congelamento`, e este arquivo é o
// segundo consumidor dela (Decisão 22 — ver o bloco do frescor no `decidir`). Se ela LANÇAR, a
// exceção sobe: bloqueante que não conseguiu determinar não pode liberar, e o `despachar` a
// transforma em deny de "falha do harness, reporte".
//
// Não há `relativizar` aqui: este verificador resolve o caminho no núcleo puro, por segmento — ver
// `ehPrimeiraAcaoDoPlan`.

import { join } from 'node:path';
import { inventariar, DOCS_EXPLORE, RAIZ_EXPLORE } from './kit.mjs';
import { descobrirWorkspace, parseManifesto, MANIFESTO_REL } from './workspace.mjs';
import { carregarDocs } from './revisao.mjs';
import { validarExplore } from './gramatica.mjs';

/**
 * Ausência devolve vazio; presente e ILEGÍVEL relança.
 *
 * O corte é o mesmo do `inventariar` e do `carregarDocs`, e num BLOQUEANTE ele pesa mais que em
 * qualquer outro lugar: quem não conseguiu olhar não pode liberar, e também não pode negar
 * fingindo que olhou. Relançar faz o `despachar` virar deny de "falha do harness, reporte" — que
 * é a resposta honesta. `EACCES`/`EBUSY` de arquivo travado pelo sync do OneDrive é o setup real
 * deste usuário; calar sobre ele transformaria "não li" em "está tudo certo".
 */
function lerOuVazio(io, caminho) {
  try {
    return io.lerArquivo(caminho, 'utf8');
  } catch (erro) {
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return '';
    throw erro;
  }
}

/**
 * DOIS FATOS sobre o relatório de revisão, do MESMO par de `stat`: ele existe (`presente`), e é
 * mais novo que o documento mais recente do Explore (`fresca`).
 *
 * A SEPARAÇÃO É O CONSERTO DO I2 DA TASK 4, e ela existe porque a dispensa do congelamento era
 * mais larga que a justificativa dela. A função devolvia um booleano só, `false` tanto para
 * "relatório velho" quanto para `ENOENT` — e a Decisão 22, ao dispensar aquele booleano, dispensava
 * os dois. A decisão diz "só a checagem de FRESCOR deixa de valer", e a justificativa escrita cobre
 * exclusivamente ruído de `mtime` num pacote congelado: nada nela cobre "ninguém nunca rodou o
 * `revisao.mjs`". E o caminho era alcançável com comandos legítimos — o `promocao.mjs --congelar`
 * confere só a invariante do carimbo, a escrita do marcador é isenta do gate (ver
 * `EXCECOES_DE_FRONTEIRA`), e o `cadeia` não pede o `revisao.json`. Explore completo mais
 * `--congelar` sem nunca emitir o relatório, e o item 5 do gate nunca era cobrado.
 *
 * O PRODUTOR DO MARCADOR NÃO FIA A REVISÃO, e isso é o que fecha o argumento: ele confere que os
 * cinco documentos receberam o CARIMBO antes de criar o marcador. Carimbo não é revisão.
 *
 * A primeira redação deste plano checava `analisar(docs).resumo.documentos > 0` — ou seja,
 * "existe algum documento". Isso é **verdadeiro sempre que os outros itens do gate já passam**,
 * então o item 5 ficava sem enforcement nenhum. A revisão do plano pegou isso.
 *
 * O que o item de fato exige é que alguém tenha **rodado** o `revisao.mjs` e olhado o resultado.
 * Prova disso é o JSON existir e ser mais novo que o material que ele analisou: relatório
 * emitido antes da última edição já não descreve o que está em disco.
 *
 * Emitir com: ver `COMANDO_REVISAO`.
 *
 * ESTA FUNÇÃO SÓ MEDE, e é o `decidir` que decide se cada resposta importa: com o marcador de
 * congelamento presente, o FRESCOR deixa de ser exigência (Decisão 22) e a PRESENÇA continua
 * valendo. A dispensa mora lá, e não aqui, porque aqui se responde fato — "existe?", "é mais
 * novo?" — e quem sabe se um fato ainda é relevante é o gate. Ela é exportada e tem testes
 * próprios.
 *
 * NÃO HÁ TOLERÂNCIA DE RELÓGIO, e a decisão é da rodada K. A comparação é `>=` e mais nada: o
 * `>=` existe para o caso em que relatório e documento são escritos no MESMO tick, ou num FS de
 * granularidade grossa — igualdade não é evidência de que o relatório é velho. Folga além disso
 * foi considerada e recusada. O falso positivo real (sync do OneDrive, `git checkout`, restore de
 * backup: arquivo byte-idêntico, só o `mtime` andou) desloca o `mtime` para o instante do evento,
 * que pode estar horas ou dias à frente do relatório — nenhuma janela de segundos o cobriria, e
 * qualquer janela grande o bastante para cobri-lo aceitaria como fresco um relatório de verdade
 * obsoleto, que é justamente o enforcement que este item existe para ter. Os dois custos não são
 * simétricos: o do falso positivo é reemitir o relatório com o comando que a própria negação
 * imprime, idempotente e de menos de um segundo; o da janela é o item 5 voltar a não valer nada,
 * que é o defeito que a revisão do plano já pegou uma vez.
 *
 * ASSIMETRIA CONHECIDA, e ela erra para o lado permissivo: a comparação é só contra
 * `DOCS_EXPLORE`, e a gramática do gate também cobre o `outputs/spec/prototype.md`. Editar o
 * protótipo depois de emitir o relatório NÃO invalida o relatório. Fica assim de propósito nesta
 * rodada — num BLOQUEANTE, ampliar o conjunto que pode negar é o movimento que precisa de
 * evidência, e ela não existe; e o relatório do `revisao.mjs` fala sobre os documentos do
 * Explore, não sobre o protótipo.
 */
export function estadoRevisao(raiz, io) {
  let mtimeRelatorio = 0;
  try {
    mtimeRelatorio = io.statMs(join(raiz, RELATORIO_REVISAO));
  } catch (erro) {
    // AUSENTE NÃO É VELHO. `fresca: false` acompanha `presente: false` porque relatório que não
    // existe não descreve nada — mas quem lê os dois campos separadamente não pode confundir as
    // duas causas, que têm ações diferentes: emitir, contra reemitir.
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return { presente: false, fresca: false };
    throw erro;
  }
  let maisRecente = 0;
  for (const d of DOCS_EXPLORE) {
    try {
      maisRecente = Math.max(maisRecente, io.statMs(join(raiz, RAIZ_EXPLORE, d.caminho)));
    } catch (erro) {
      if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) continue;
      throw erro;
    }
  }
  return { presente: true, fresca: mtimeRelatorio >= maisRecente };
}

/**
 * A primeira isenção válida do diretório de isenções, ou `null`.
 *
 * Diretório AUSENTE é `null` — o caso comum, e é o certo. Diretório presente e ILEGÍVEL relança:
 * a válvula é a saída de emergência do consultor, e uma saída de emergência que falha calada é
 * pior que uma que não existe.
 */
export function acharIsencao(raiz, io) {
  const dir = join(raiz, DIR_ISENCOES);
  let entradas = [];
  try {
    entradas = io.lerDiretorio(dir, { withFileTypes: true });
  } catch (erro) {
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return null;
    throw erro;
  }
  for (const e of entradas) {
    if (!e.isFile()) continue;
    const i = parseIsencao(lerOuVazio(io, join(dir, e.name)));
    if (isencaoValida(i)) return i;
  }
  return null;
}

/** Nomes que moram em `outputs/explore/`, para rotular o documento com a raiz CERTA. */
const NOMES_DO_EXPLORE = new Set(DOCS_EXPLORE.map((d) => d.caminho.toLowerCase()));

/**
 * Manifesto do repo de docs, lido pela casca.
 *
 * NÃO usa `lerManifesto` do `workspace.mjs`, e a razão não é estilo: aquela função (a) não tem
 * ponto de injeção, o que devolveria este arquivo ao defeito da restrição 5, e (b) degrada
 * `EACCES` para `sem-manifesto`. Para o `estado`, que só informa, degradar está certo; para um
 * BLOQUEANTE, não — negar por "manifesto inválido" um projeto cujo manifesto está perfeito e
 * apenas travado pelo sync do OneDrive é falso positivo com a mensagem errada. Aqui a casca lê o
 * texto (ausência → vazio, ilegível → relança) e entrega a `parseManifesto`, que é a autoridade
 * de formato. Texto vazio produz o mesmo `sem-manifesto` que a função original produziria.
 *
 * RECEBE O `docsDir` PRONTO, e não a raiz. Até a rodada K ela mesma chamava `descobrirWorkspace`,
 * e era a ÚNICA no arquivo que o fazia: o manifesto era lido no lugar certo e todo o resto do
 * gate no lugar errado. Ver `avaliar`.
 */
function lerManifestoDaCasca(docsDir, io) {
  return parseManifesto(lerOuVazio(io, join(docsDir, MANIFESTO_REL)));
}

/**
 * Entrada do despachante. `null` quando a ação não atravessa a fronteira.
 *
 * A PERGUNTA "É COMIGO?" VEM PRIMEIRO, e antes de todo I/O. O `avaliar` do plano inventariava
 * `outputs/spec/` para alimentar um parâmetro ignorado, e só então perguntava — um passeio de
 * diretório em toda escrita e toda invocação de skill do projeto. `io.cwd()` não é I/O de disco, e
 * por isso a contenção pela raiz cabe antes do `descobrirWorkspace` sem custar passeio nenhum.
 *
 * A RAIZ DOS ARTEFATOS NÃO É A CWD, e resolvê-la é a primeira coisa que o gate faz. Num workspace
 * multi-repo os artefatos moram em `<cwd>/<repo-docs>/outputs/…`, e até a rodada K só o manifesto
 * era lido lá: `inventariar`, `carregarDocs`, `estadoRevisao` e `acharIsencao` recebiam `io.cwd()`
 * cru. O efeito medido era um pré-projeto multi-repo COMPLETO E CORRETO sendo negado por cinco
 * itens, com "Manifesto inválido" ausente da lista — a assinatura do defeito, porque era o único
 * item que sabia onde procurar. Multi-repo não é exótico: o `workspace.md` é o primeiro artefato
 * que a `explore.md` manda criar.
 */
export function avaliar(payload, io) {
  if (!ehPrimeiraAcaoDoPlan(payload)) return null;

  const cwd = io.cwd();

  // Fora da raiz LIBERA — o harness governa este repositório, não o disco inteiro. Ver
  // `dentroDaRaiz`. Vale só para a âncora de ARQUIVO; a de skill não traz caminho nenhum.
  const alvo = caminhoDaTool((payload || {}).tool_input);
  if (alvo && !dentroDaRaiz(cwd, alvo)) return null;

  const ws = descobrirWorkspace(cwd, io.lerDiretorio);
  if (ws.motivo) return decidir({ workspace: ws });

  const raiz = ws.raizArtefatos;
  const presentesSpec = inventariar(join(raiz, RAIZ_SPEC), io.lerDiretorio);
  const presentesExplore = inventariar(join(raiz, RAIZ_EXPLORE), io.lerDiretorio);
  const docs = carregarDocs(raiz, io.lerArquivo);

  const errosGramatica = [];
  for (const [nome, texto] of docs) {
    // A RAIZ DO RÓTULO NÃO É SEMPRE `outputs/explore/`. O `carregarDocs` devolve também o
    // `prototype.md`, que mora em `outputs/spec/`; prefixar tudo com a raiz do Explore produz um
    // caminho que não existe, e o rótulo entra na mensagem de negação — num bloqueante, a mensagem
    // é a instrução que o consultor segue.
    //
    // NENHUM TESTE MATA A MUTAÇÃO QUE VOLTA ISTO A `RAIZ_EXPLORE` FIXO, e fica escrito para a
    // próxima rodada não gastar tempo procurando. Medido: `validadorPara` devolve `null` para
    // `outputs/explore/prototype.md` e `check-modules` para `outputs/spec/prototype.md`, e
    // `validarExplore` devolve lista vazia nos DOIS casos — só `check-explore` produz erro. Como
    // `DO_SPEC` (revisao.mjs) hoje tem `prototype.md` e mais nada, as duas formas são
    // EQUIVALENTES, não "não testadas". Deixa de ser equivalente no dia em que `DO_SPEC` ganhar um
    // arquivo com validador `check-explore`, e aí o rótulo errado vira instrução errada.
    const raizDoDoc = NOMES_DO_EXPLORE.has(nome.toLowerCase()) ? RAIZ_EXPLORE : RAIZ_SPEC;
    const r = validarExplore(`${raizDoDoc}/${nome}`, texto);
    if (r.erros.length) errosGramatica.push({ arquivo: r.arquivo, erros: r.erros });
  }

  // O OPCIONAL AUSENTE PRECISA DE LINHA NO `gaps.md` (D8). Quem é opcional é o `DOCS_EXPLORE` que
  // diz — campo `obrigatorio` —, e não uma lista com `modelo-de-dados.md` escrita aqui: o dia em que
  // outro documento virar opcional, a exigência vem junto. O `gaps.md` já foi lido pelo
  // `carregarDocs`; ausente, ele cai em `faltantesExplore` e aqui vira texto vazio.
  const textoGaps = docs.get('gaps.md') || '';
  const dispensasFaltando = DOCS_EXPLORE
    .filter((d) => !d.obrigatorio && !presentesExplore.has(d.caminho))
    .filter((d) => !dispensaRegistrada(textoGaps, d.caminho))
    .map((d) => d.caminho);

  const manifesto = lerManifestoDaCasca(ws.docsDir, io);
  // UM PAR DE `stat`, DOIS FATOS. Presença e frescor saem da mesma medição e vão separados para o
  // `decidir`, porque a dispensa do congelamento pega um e deixa o outro de pé (ver o item 5 lá).
  // Juntos num booleano só, o gate não tinha como distinguir "nunca emitido" de "emitido e velho"
  // — e a mensagem de um bloqueante é a instrução que o consultor segue.
  const revisao = estadoRevisao(raiz, io);

  return decidir({
    presentesExplore,
    presentesSpec,
    kickoff: lerKickoff(lerOuVazio(io, join(raiz, RAIZ_SPEC, 'sync-log.md'))),
    manifestoValido: !manifesto.erro,
    temPrototipo: ARTEFATOS_PROTOTIPO.every((a) => presentesSpec.has(a)),
    // O `prototype.md` também já veio do `carregarDocs` (é o `DO_SPEC` do `revisao.mjs`).
    fidelidadePrototipo: lerFidelidade(docs.get(PROTOTIPO_MD) || ''),
    dispensasFaltando,
    errosGramatica,
    revisaoPresente: revisao.presente,
    revisaoFresca: revisao.fresca,
    // AO LADO DOS DOIS de propósito: o FRESCOR é a única exigência do gate que este campo
    // dispensa, e ver os três juntos é o que evita que alguém mexa numa sem ver a outra — foi
    // exatamente por não vê-las separadas que a dispensa nasceu larga demais. `raiz`, e não
    // `io.cwd()`: o marcador mora em `<raizArtefatos>/outputs/spec/`, como todo o resto que este
    // `avaliar` consulta — num workspace multi-repo a `cwd` não é o repo de docs (ver o defeito
    // C-1 da rodada K).
    exploreCongelado: io.exploreCongelado(raiz),
    isencao: acharIsencao(raiz, io),
  });
}
