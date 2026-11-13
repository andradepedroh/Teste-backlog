// Harness Elo v2 — O `sync-log.md` cobrado. Núcleo puro + entrada do despachante.
//
// O `sync-log.md` é a ÚNICA memória que atravessa as três fases. Este verificador cobra o
// registro, e cobra APENAS AVISANDO. Não bloqueia nada, e isso é desenho, não preguiça:
// preencher a Seção A automaticamente fabricaria decisão que ninguém tomou, e a Seção A existe
// justamente para registrar que ALGUÉM DECIDIU. Log de máquina sobre decisão humana é pior que
// log nenhum — ele parece evidência.
//
// A GRAMÁTICA NÃO MORA AQUI. Ela mora no `kit.mjs`, que é o vocabulário compartilhado, e é de lá
// que vêm as nove colunas, o formato do kickoff e as quatro regras anti-falso-positivo. Este
// arquivo escrevendo a própria versão do formato seria o segundo dono que a Task 7 existiu para
// eliminar.
//
// ————————————————————————— O GATILHO É ÂNCORA DE ARTEFATO —————————————————————————
//
// A spec e o plano descrevem o gatilho como "fim de skill". ESSE EVENTO NÃO EXISTE. Medido em 77
// transcritos reais, 67 invocações de `Skill`: o `PostToolUse` de `Skill` dispara no LANÇAMENTO, e
// o resultado da tool é sempre `"Launching skill: <nome>"`, 37 bytes. Com esse gatilho o
// verificador avisaria na PRIMEIRA execução — quando a linha ainda não podia existir — e CALARIA na
// segunda, quando a omissão seria real: dispararia invertido em relação ao que existe para
// detectar.
//
// Por isso a âncora é o ARTEFATO: `PostToolUse` em `Write`/`Edit`/`NotebookEdit`, olhando o caminho
// escrito. É a mesma dualidade da Decisão 13 da spec — *"este artefato pode existir?" é sobre o
// arquivo; "esta skill pode rodar?" é sobre o ator*. O `cadeia.mjs` continua com âncora de ator,
// porque a pergunta dele é a outra.

import {
  caminhoDaTool, nomeDaSkill, chave, RAIZ_SPEC,
  lerLinhasSecaoA, montarLinhaSecaoA, CABECALHO_SECAO_A,
  CODIGOS_DE_AUSENCIA_DE_DOCUMENTO,
} from './kit.mjs';

/**
 * As SETE skills que o KIT obriga a registrar, nominalmente (`spec/SKILL.md:334`, "Regra
 * obrigatória para TODAS as skills filhas"). Esta metade não é escolha nossa: é o contrato do kit.
 *
 * O número era `:283` e envelheceu quando o kit foi atualizado neste plano: a regra continua
 * nomeando as mesmas sete e só andou de lugar no arquivo. *Citação por número de linha em arquivo
 * de terceiro vence antes do resto do comentário* — se ela não bater, procure pelo texto citado.
 */
export const SKILLS_DO_KIT = new Set([
  'spec-ingest', 'spec-legacy', 'spec-benchmark', 'spec-product',
  'spec-prototype', 'spec-iterate', 'spec-report',
]);

/**
 * As OITO da cadeia técnica, que são POLÍTICA NOSSA — e a distinção importa daqui a seis meses.
 *
 * Medido nos `SKILL.md`, hoje: as oito TÊM seção própria `## Sync-log (obrigatório)` — a mesma
 * forma que a `spec-hld` usa. A frase que esteve aqui ("`spec-api-contracts`, `spec-test-plan`,
 * `spec-tasks`, `spec-security-review`, `spec-scaffold` e `spec-implement` não citam `sync-log`
 * uma única vez; `spec-tech-rules` e `spec-data-model` citam de passagem e não têm regra") é falsa
 * para as oito — não só para as três citadas. Era falsa já antes deste plano; este plano editou
 * este bloco por cima da frase falsa, e por isso o conserto é nosso.
 *
 * Cabe porque o verificador SÓ AVISA: o custo de um falso positivo aqui é uma linha de lembrete
 * lida e ignorada, e é por isso que a cobrança pode ser mais ampla que o que o kit obriga. Num
 * bloqueante, ampliar a lista assim seria inaceitável.
 *
 * PENDÊNCIA DO PLANO 5, registrada e não resolvida aqui: se o próprio `SKILL.md` de cada uma das
 * oito já se obriga a registrar no `sync-log`, para que serve ainda `SKILLS_NOSSAS` como conjunto
 * separado de `SKILLS_DO_KIT`? Não responder isso neste branch.
 */
export const SKILLS_NOSSAS = new Set([
  'spec-tech-rules', 'spec-data-model', 'spec-api-contracts', 'spec-test-plan',
  'spec-tasks', 'spec-security-review', 'spec-scaffold', 'spec-implement',
]);

export const SKILLS_QUE_REGISTRAM = new Set([...SKILLS_DO_KIT, ...SKILLS_NOSSAS]);

/**
 * artefato terminal → skill que o produziu. Caminho relativo à raiz (`outputs/spec/`), em caixa de
 * comparação, SEM repetir o prefixo da raiz.
 *
 * DE ONDE VEIO CADA LINHA — as duas fontes, e nada de adivinhação:
 *
 * 1. `check-outputs.py:ARTIFACTS` (linha 97) e `PIPELINE_ARTIFACTS` (linha 149), nível `REQUIRED`.
 *    Só `REQUIRED`: artefato OPTIONAL não marca conclusão de coisa nenhuma — `gaps-answers.md` é
 *    escrito pelo CONSULTOR, `capa.md` pode nem existir, e `modules.md` é OPTIONAL no kit ainda que
 *    a nossa `PRE_REQUISITOS` o exija para a `spec-prototype` (são perguntas diferentes: "que
 *    artefato marca o fim desta skill?" e "que artefato a próxima skill precisa ler?").
 *
 * 2. A nossa `PRE_REQUISITOS` do `cadeia.mjs`, para a cadeia técnica, que não aparece em nenhuma
 *    das duas tabelas do kit. O princípio é **o que a skill seguinte exige é o que a anterior
 *    produziu**: `spec-data-model` exige `tech-rules/tech-rules-summary.md`, logo é a
 *    `spec-tech-rules` que o produz; `spec-api-contracts` exige `data-model.json`;
 *    `spec-tasks` exige `data-model.json`, `api-contracts.yaml` e `test-plan.md`.
 *
 * QUATRO AUSÊNCIAS DECIDIDAS, escritas para ninguém as redescobrir:
 *
 * - `sync-log.md` é `REQUIRED` da `spec-iterate` no kit e mesmo assim NÃO entra. Ele é o próprio
 *   log: usá-lo como âncora faria o verificador falar sobre si mesmo a cada linha escrita, e o
 *   ruído cairia exatamente sobre quem está obedecendo.
 * - `spec-legacy`, `spec-prototype`, `spec-report`, `spec-security-review`, `spec-scaffold` e
 *   `spec-implement` FICAM SEM ÂNCORA, e por isso nunca disparam este lembrete, mesmo estando em
 *   `SKILLS_QUE_REGISTRAM`. Não é esquecimento: no kit os artefatos delas são `OPTIONAL` ou
 *   `COND_LEGACY`/`COND_UI`, e a nossa `PRE_REQUISITOS` não exige nada que elas produzam. Inventar
 *   uma âncora para elas seria escolher um arquivo sem fonte — que é o defeito que esta tarefa
 *   inteira nasceu para consertar. Fica registrado como limite conhecido.
 * - `hld.md` (Decisão 34, `spec-hld`, Fase 6.6) FICA SEM ÂNCORA, e o motivo NÃO é o mesmo do
 *   `capa.md` do item 1 acima — `capa.md` nunca aparece em nenhum `exige` da `PRE_REQUISITOS` nem
 *   é `REQUIRED` no kit, então nem chega a precisar de uma linha de razão: ele simplesmente nunca
 *   é candidato. `hld.md` É candidato — é o artefato nomeado de uma skill real e registrada da
 *   cadeia técnica —, então entra no outro grupo, o do `spec-security-review` do item acima: fica
 *   fora por DECISÃO, não por irrelevância. `OPTIONAL` no kit é o que desqualifica, o mesmo motivo
 *   que já tira o `modules.md`: artefato opcional aparecendo no disco não significa que a skill
 *   terminou, e âncora que não marca fim não serve. A `PRE_REQUISITOS` também não exige `hld.md`
 *   de ninguém (ver `cadeia.mjs`) — a `spec-data-model` nova trata a ausência dele como WARNING
 *   `HLD_MISSING`, não bloqueio, e um gate bloqueante nosso exigindo-o seria mais estrito que o
 *   kit. A `spec-hld` registra a própria linha no `sync-log.md` por obrigação do `SKILL.md` dela e
 *   da rule do Plan — não por lembrete deste módulo, e por isso ela nem entra em
 *   `SKILLS_QUE_REGISTRAM`.
 * - `data-model.md` (Plano 4, passo O da `spec-data-model`) NÃO ENTRA, e a assimetria com o
 *   `hld.md` do item acima é DESENHO, não descuido. A `spec-data-model` JÁ TEM âncora nesta mesma
 *   tabela — `data-model.json`, desde a vendorização —; o markdown do passo O é DERIVADO dela, o
 *   mesmo modelo na forma que o cliente lê. Dar à mesma skill uma segunda âncora faria o lembrete
 *   disparar DUAS VEZES na mesma execução: uma ao escrever o JSON no passo K, outra ao escrever o
 *   markdown no passo O — ruído caindo exatamente sobre quem está obedecendo, a mesma razão pela
 *   qual o `sync-log.md` do primeiro item também fica fora. A `spec-hld` entrou no grupo anterior
 *   porque NÃO TINHA âncora nenhuma e ganhou a única que produz; aqui é o oposto — a skill já
 *   tinha âncora, e a pergunta "quem produziu isto" já tem resposta. Uma segunda casa para a mesma
 *   pergunta é a família "dois donos" que este harness já pagou para consertar.
 */
export const ARTEFATO_TERMINAL = new Map([
  // — ARTIFACTS, REQUIRED —
  ['context-map.md', 'spec-ingest'],
  ['discovery-document.md', 'spec-ingest'],
  ['benchmark.md', 'spec-benchmark'],
  ['product-vision/product-vision.md', 'spec-product'],
  ['business-rules.md', 'spec-product'],
  ['requirements/requirements.md', 'spec-product'],
  ['product-requirements/product-requirements.md', 'spec-product'],
  ['gaps.md', 'spec-iterate'],
  // — PIPELINE_ARTIFACTS, REQUIRED —
  ['tasks.json', 'spec-tasks'],
  // — a nossa PRE_REQUISITOS: o que a seguinte exige, a anterior produziu —
  ['tech-rules/tech-rules-summary.md', 'spec-tech-rules'],
  ['data-model.json', 'spec-data-model'],
  ['api-contracts.yaml', 'spec-api-contracts'],
  ['test-plan.md', 'spec-test-plan'],
]);

/**
 * A raiz onde artefato de skill nasce. Era duas até a vendorização do kit — ver `CLAUDE.md`.
 *
 * CONTINUA LISTA de propósito, com um elemento: `inicioDaRaiz` e o laço de `localizarArtefato`
 * trabalham sobre lista, e colapsar a forma alargaria a mudança para código que não precisava
 * mudar — vizinhança do único gate de push do projeto.
 */
const RAIZES = [RAIZ_SPEC];

/**
 * Onde a raiz começa, comparando SEGMENTO A SEGMENTO por `chave`.
 *
 * Segmento, e não `indexOf` sobre a string em caixa baixa: baixar a caixa pode mudar o COMPRIMENTO
 * de caracteres não-ASCII, e um índice medido na string transformada não vale na original. É a
 * mesma cautela que o `sob` do kit documenta.
 */
function inicioDaRaiz(segmentos, raiz) {
  const alvo = raiz.split('/');
  for (let i = 0; i + alvo.length < segmentos.length; i += 1) {
    if (alvo.every((s, k) => chave(s) === chave(segmentos[i + k]))) return i;
  }
  return null;
}

/**
 * `{skill, artefato, syncLog}` para um artefato terminal, ou `null`.
 *
 * O SYNC-LOG É LOCALIZADO A PARTIR DO PRÓPRIO ARTEFATO, e não da `cwd`. Num workspace multi-repo
 * o consultor está na raiz do workspace e os artefatos moram em `<repo-docs>/outputs/spec/` — o
 * `workspace.md` é o primeiro artefato que a rule do Explore manda criar, então multi-repo não é
 * exótico. Tomar a `cwd` como raiz faria o verificador procurar o sync-log num caminho que não
 * existe e avisar TODA vez, inclusive quem registrou direito. Derivando do artefato, a resposta é
 * certa nos dois casos sem precisar descobrir workspace nenhum.
 */
export function localizarArtefato(rel) {
  const segmentos = String(rel || '').replace(/\\/g, '/').split('/').filter(Boolean);
  for (const raiz of RAIZES) {
    const i = inicioDaRaiz(segmentos, raiz);
    if (i === null) continue;
    const dentro = segmentos.slice(i + raiz.split('/').length).join('/');
    // SEM GUARDA CONTRA `SKILLS_QUE_REGISTRAM` AQUI, e a ausência é decidida: toda entrada da
    // tabela aponta para uma skill da lista, e o teste `ARTEFATO_TERMINAL só aponta para skills que
    // registram` prova isso a cada execução. Um `if` sobre entrada inalcançável é o código
    // decorativo que este projeto passou cinco rodadas caçando — e, pior, seria uma segunda regra
    // silenciosa: quem acrescentasse uma linha à tabela sem pôr a skill na lista veria a entrada
    // simplesmente não funcionar, sem nenhum vermelho. O teste dá o vermelho.
    const skill = ARTEFATO_TERMINAL.get(chave(dentro));
    if (!skill) continue;
    const prefixo = segmentos.slice(0, i).join('/');
    return {
      skill,
      artefato: (prefixo ? prefixo + '/' : '') + raiz + '/' + dentro,
      // O sync-log mora em `outputs/spec/`, derivado do PREFIXO do artefato e não da raiz da tool:
      // em multi-repo o artefato está em `<repo-docs>/outputs/spec/`, e o sync-log ao lado dele.
      syncLog: (prefixo ? prefixo + '/' : '') + RAIZ_SPEC + '/sync-log.md',
    };
  }
  return null;
}

/** Milissegundos truncados ao MINUTO — a granularidade da coluna `Data/Hora`. */
const aoMinuto = (ms) => Math.floor(Number(ms) / 60000) * 60000;

/**
 * Existe, na Seção A, linha desta skill com `Data/Hora` IGUAL OU POSTERIOR ao minuto do artefato?
 *
 * TRÊS CONSEQUÊNCIAS, e as três têm teste:
 *
 * 1. **Compare no minuto, não no milissegundo.** A coluna tem granularidade de minuto; o `mtime`,
 *    de milissegundo. Linha às `14:32` e artefato às `14:32:40` são a MESMA execução, e comparar
 *    sem truncar produziria aviso em quem registrou direito — falso positivo em cima de trabalho
 *    correto, que é o erro caro deste harness.
 * 2. **Um aviso por execução, sempre.** O artefato é escrito ANTES da linha, então no instante da
 *    escrita não há linha posterior. O aviso é verdadeiro nesse instante, e é por isso que a
 *    mensagem é LEMBRETE e não acusação.
 * 3. **A refatoração volta a avisar, que é o ponto.** Reexecutar a skill dá `mtime` novo ao
 *    artefato e a linha antiga fica para trás. É o caso que a âncora de artefato existe para pegar,
 *    e é a razão de a regra ser RECÊNCIA e não "já apareceu alguma vez".
 *
 * O nome da skill na coluna passa pelo `nomeDaSkill` e por `chave`: a caixa não separa (o FS deste
 * harness não é sensível a ela) e uma skill anotada com prefixo de plugin continua sendo a mesma.
 *
 * O CORTE DE PREFIXO FICA NOS DOIS LADOS, e a assimetria das duas pontas está DECLARADA aqui porque
 * a revisão adversarial mostrou que ela não estava:
 *   - LADO DA COLUNA (`l.skill`): alcançável hoje. A Seção A é escrita À MÃO, e quem invocou a skill
 *     a viu no payload como `plugin:skill`; anotar `algum-plugin:spec-product` na coluna é registro
 *     CORRETO, e avisar em cima dele é falso positivo sobre trabalho correto;
 *   - LADO DO ARGUMENTO (`skill`): entrada HIPOTÉTICA hoje. O único produtor é a `ARTEFATO_TERMINAL`,
 *     e ela só tem nome nu. Fica, e não é decoração: esta função é EXPORTADA e o contrato dela é
 *     "compare nomes de skill". Um chamador com âncora de ATOR — que é como a spec descrevia este
 *     verificador — passaria o nome do payload, que chega PREFIXADO, e cortar só um lado deixaria a
 *     comparação silenciosamente errada. Foi exatamente assim que a âncora de skill do
 *     `fecho-explore` nasceu decorativa.
 * As duas pontas têm teste, e a terceira também: prefixo NÃO faz uma skill valer por outra.
 */
export function registrouDepois(linhas, skill, mtimeMs) {
  const alvo = chave(nomeDaSkill(skill));
  const piso = aoMinuto(mtimeMs);
  return (linhas || []).some((l) => chave(nomeDaSkill(l.skill)) === alvo && l.minuto >= piso);
}

/**
 * O lembrete, com a linha de nove colunas pronta para colar.
 *
 * O ESQUELETO É INERTE, e isso não é detalhe: ele vai dentro de cerca de código E com
 * `YYYY-MM-DD HH:MM` nos campos de data, então as regras 4 e 3 do kit o descartam. Colá-lo sem
 * preencher NÃO desliga este verificador nem declara kickoff nenhum — é o que o teste
 * `a mensagem é INERTE` mede, passando a própria mensagem para `lerLinhasSecaoA`.
 *
 * A última frase diz por que ninguém preenche por você. Ela não é ornamento: um agente que lê
 * "registre a linha" e não lê o motivo conclui que pode inventar a decisão, e decisão fabricada por
 * máquina parece evidência sem ser.
 */
export function montarLembrete(skill, artefato, syncLog) {
  const esqueleto = montarLinhaSecaoA({
    numero: 'N', data: 'YYYY-MM-DD', hora: 'HH:MM', skill,
    modo: 'modo desta execução (`delta` se for reexecução)',
    inputs: 'o que foi lido', outputs: 'o que foi escrito',
    decisoes: 'o que MUDOU o entendimento do projeto',
    decisor: 'consultor / cliente / nome', proximo: 'o que invocar depois',
  });
  // DE ONDE VEM A OBRIGAÇÃO, dito a quem lê. As duas listas pesam diferente: uma é contrato do
  // kit, a outra é decisão deste harness, e quem recebe o aviso tem direito de saber qual das duas
  // está falando. É também o que dá consumidor de verdade às duas — lista que só o teste lê é
  // decoração, e mudá-la sairia de graça.
  const origem = SKILLS_DO_KIT.has(skill)
    ? 'O kit obriga esta linha — `spec/SKILL.md`, «Sync-log como memória cross-cutting»: não '
      + 'declarar a skill concluída sem ela.'
    : 'Esta cobrança é política deste harness: o kit só nomeia sete skills nessa regra, e é a rule '
      + 'do Plan que estende a obrigação à cadeia técnica — sem o registro a memória cronológica '
      + 'para na fronteira do Plan.';
  return [
    `Você escreveu \`${artefato}\`, artefato terminal da \`${skill}\`. Ao terminar a skill, `
    + `registre a execução na Seção A de \`${syncLog}\` — sem essa linha, a próxima skill não tem `
    + `como saber de onde viemos. ${origem}`,
    '',
    '```',
    CABECALHO_SECAO_A,
    esqueleto,
    '```',
    '',
    'Ninguém preenche por você, e isso é desenho: a Seção A registra que **alguém decidiu**, e '
    + 'decisão fabricada por máquina parece evidência sem ser.',
  ].join('\n');
}

// ————————————————————————— entrada do despachante —————————————————————————

/**
 * Recebe `io` em vez de chamar `process.cwd()`/`readFileSync`/`statSync` direto — restrição
 * global 5. O plano escrevia `avaliar(payload)` lendo o disco: é o defeito que as Tasks 5 e 6 já
 * pagaram DUAS vezes. Sem ponto de injeção, testar o wiring exigiria `process.chdir`, ninguém
 * testa, e mutar a entrada da tabela para no-op deixa a suíte inteira verde.
 *
 * `io` precisa de QUATRO operações: `cwd()`, `relativizar(raiz, bruto)`, `statear(abs)` — de onde
 * sai o `mtime` do artefato — e `lerArquivo(abs, enc)`. As reais moram no `IO_REAL` do
 * `posttooluse.mjs`, que é a casca de todos os verificadores deste evento.
 *
 * O GUARDA DA TABELA VEM ANTES DE TODO I/O: `Write` é a tool mais frequente do harness, e a
 * esmagadora maioria das escritas não é artefato terminal de nada. Passear pelo disco para depois
 * descobrir que não era comigo é custo em cima de trabalho que este verificador não fiscaliza.
 */
export function avaliar(payload, io) {
  const abs = caminhoDaTool((payload && payload.tool_input) || {});
  if (!abs) return null;
  const rel = io.relativizar(io.cwd(), abs);
  if (!rel) return null;

  const alvo = localizarArtefato(rel);
  if (!alvo) return null;

  let mtimeMs = null;
  try {
    mtimeMs = io.statear(abs).mtimeMs;
  } catch (erro) {
    // O artefato pode ter sumido entre a escrita e o hook. Sem `mtime` não há pergunta de
    // recência a fazer, e inventar `agora` responderia outra coisa.
    if (erro && CODIGOS_DE_AUSENCIA_DE_DOCUMENTO.has(erro.code)) return null;
    throw erro;
  }

  // O caminho absoluto do sync-log é montado com barra normal e sem `node:path`: o `rel` que o
  // `io` devolveu já é relativo à `cwd`, e concatenar aqui mantém a mesma convenção de barra que
  // todo o resto do harness usa para comparar caminho.
  const raizAbs = String(io.cwd()).replace(/\\/g, '/').replace(/\/+$/, '');
  let texto = '';
  try {
    texto = io.lerArquivo(`${raizAbs}/${alvo.syncLog}`, 'utf8');
  } catch (erro) {
    // SYNC-LOG AUSENTE É O CASO MAIS COMUM DE OMISSÃO, não um erro: o projeto ainda não tem
    // memória nenhuma. Calar aqui seria calar exatamente quando o lembrete mais vale.
    if (!erro || !CODIGOS_DE_AUSENCIA_DE_DOCUMENTO.has(erro.code)) throw erro;
    texto = '';
  }

  if (registrouDepois(lerLinhasSecaoA(texto), alvo.skill, mtimeMs)) return null;
  return { aviso: montarLembrete(alvo.skill, alvo.artefato, alvo.syncLog) };
}
