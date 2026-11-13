// Harness Elo v2 — Zona imutável e congelamento do Explore. Núcleo puro + casca de I/O.
//
// Duas travas que a spec põe no despachante e que não pertencem a nenhum dos seis
// verificadores nomeados:
//
// Decisão 18 — o maquinário do template é ZONA IMUTÁVEL. Atualizar o harness é sobrescrever
// esses caminhos, e sobrescrita só não conflita se ninguém os editou. A trava é o que torna
// isso verdade em vez de esperança. No template (Decisão 67) ela abre: quem mantém o template
// edita exatamente essa zona, e a garantia dos clones passa a ser a verificação no PR.
//
// Decisão 16 — concluído o spec-product, outputs/explore/ vira histórico. Sem essa trava,
// ficam duas descrições do mesmo requisito e nenhuma regra de qual manda; elas divergem em
// semanas.

import { ehZonaImutavel, casaAlgum, ehDoExplore, RAIZ_EXPLORE, MARCADOR_CONGELAMENTO } from './kit.mjs';
import { mapearCercas } from './tokens.mjs';

/** Texto literal que abre a linha de carimbo. Reconhecível por humano e por regex. */
export const CARIMBO_CONGELAMENTO = 'CONGELADO em';

/** A linha a inserir no cabeçalho de cada documento do Explore, na conclusão do spec-product. */
export function montarCarimbo(dataISO) {
  return `> **${CARIMBO_CONGELAMENTO} ${dataISO}** — sucedido por \`outputs/spec/\`. ` +
    'Mudança vai para lá, ou para `spec-scope-change` se for virada de escopo.';
}

/**
 * O escape existe porque o texto do carimbo entra numa regex: hoje ele tem um `.` no fim, e quem
 * trocar a frase por algo com `(` ou `|` não deve descobrir isso por um casamento errado em
 * produção.
 */
const escaparRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * O molde da linha de carimbo é a saída de `montarCarimbo` INTEIRA, com a data trocada por um
 * grupo de captura. Nada aqui repete o texto do carimbo: monta-se a linha de verdade com uma
 * sentinela no lugar da data, escapa-se ela, e só então a sentinela vira `(\d{4}-\d{2}-\d{2})`.
 *
 * ISTO É O CONSERTO DO C2, e as duas metades importam:
 *   - a versão anterior ancorava só o PREFIXO (`^> **CONGELADO em <data>**`) e deixava o RESTO da
 *     linha livre. Enquanto a trava se apoiava no carimbo, a verificação de corpo preservado
 *     descartava TODA linha que casasse esse prefixo, sem limite: a linha de carimbo virava um
 *     canal de conteúdo arbitrário para dentro de um documento congelado. Aquele mecanismo saiu
 *     (ver `avaliarCongelamento`), mas a exigência de linha inteira continua valendo por si — quem
 *     escreve e quem lê o carimbo têm que concordar sobre o que é a linha;
 *   - derivar da própria `montarCarimbo`, e não escrever a regex à mão, é o que impede as duas de
 *     divergirem. Se divergissem, `montarCarimbo` gravaria um carimbo que `lerCarimbo` não
 *     reconhece, e o `promocao.mjs` não teria como conferir o que acabou de escrever.
 *
 * A cauda `[ \t]*` tolera espaço no fim da linha (editor que apara ou acrescenta), e `\r?` deixa o
 * `RE_CARIMBO` exportado servir também sobre texto CRLF inteiro. Não há tolerância à ESQUERDA: o
 * carimbo real abre a linha, e um carimbo indentado de quatro espaços é bloco de código markdown,
 * isto é, exemplo.
 *
 * A SENTINELA precisa de duas propriedades: atravessar `escaparRegex` sem mudar, e aparecer UMA
 * vez só na linha montada. `String.replace` com string troca a PRIMEIRA ocorrência, então uma
 * sentinela que também ocorresse no texto fixo do carimbo (um espaço, por exemplo) trocaria o
 * lugar errado e o molde deixaria de casar a linha que `montarCarimbo` produz.
 */
const SENTINELA_DATA = 'DATA-DO-CARIMBO-SENTINELA';
const MOLDE_CARIMBO = escaparRegex(montarCarimbo(SENTINELA_DATA))
  .replace(SENTINELA_DATA, '(\\d{4}-\\d{2}-\\d{2})');

/**
 * Reconhece a linha de carimbo e captura a data, sobre texto de qualquer tamanho (flag `m`).
 * Exportada e usada pelos testes; ela NÃO sabe de bloco de código — a resposta que leva cerca em
 * conta é a de `lerCarimbo`, e é essa que o resto do módulo usa.
 */
export const RE_CARIMBO = new RegExp('^' + MOLDE_CARIMBO + '[ \\t]*\\r?$', 'm');

/** A mesma coisa, para uso linha a linha. */
const RE_CARIMBO_LINHA = new RegExp('^' + MOLDE_CARIMBO + '[ \\t]*$');

/**
 * O documento está carimbado? Devolve a data do PRIMEIRO carimbo de verdade quando sim.
 *
 * NENHUMA TRAVA DEPENDE DESTA FUNÇÃO. Quem decide congelamento é `estaCongelado`, que pergunta
 * pela existência do `MARCADOR_CONGELAMENTO` e não lê prosa nenhuma. Isto aqui serve a quem
 * ESCREVE e a quem CONFERE o carimbo — `promocao.mjs` (Plano 3), relatórios, e o leitor humano —
 * e é por isso que ela continua existindo depois que a exceção do autobloqueio saiu.
 *
 * A distinção importa para não reintroduzir o defeito por outra porta: enquanto a resposta desta
 * função valia como trava, não havia como separar o carimbo da CITAÇÃO do carimbo. A cerca de
 * código (abaixo) cobre a citação em bloco — a forma mais comum, `gaps.md` documentando o
 * procedimento — mas NÃO cobre a citação em blockquote, em prosa corrida, que é o mesmo texto do
 * carimbo real e portanto indistinguível dele. Isso é limite conhecido e agora inofensivo; se um
 * dia alguém quiser voltar a fazer decisão de trava a partir daqui, este parágrafo é a razão de
 * não fazer.
 *
 * A noção de cerca vem do `mapearCercas` (tokens.mjs), a mesma que `secoesVazias` usa. Duas
 * noções de cerca no mesmo repositório divergem; esta função não tem a sua.
 *
 * CERCA ABERTA E NUNCA FECHADA engole tudo que vem depois dela, inclusive um carimbo — logo, a
 * resposta é "não carimbado". A cerca não fechada já é relatada como defeito pelo
 * `CERCA_NAO_FECHADA` do `secoesVazias`, então o documento malformado não passa silencioso.
 */
export function lerCarimbo(texto) {
  const { linhas, dentro } = mapearCercas(texto);
  for (let i = 0; i < linhas.length; i++) {
    if (dentro[i]) continue;
    const m = RE_CARIMBO_LINHA.exec(linhas[i]);
    if (m) return { congelado: true, data: m[1] };
  }
  return { congelado: false, data: null };
}

/**
 * O conteúdo do `MARCADOR_CONGELAMENTO`.
 *
 * NENHUMA MÁQUINA LÊ ISTO. `estaCongelado` pergunta pela EXISTÊNCIA do arquivo e não abre o
 * conteúdo — foi essa a troca da Decisão 16, e ela é o que tirou a decisão de trava do terreno da
 * prosa. Este texto existe para o humano que abre o arquivo e precisa saber o que aconteceu, e
 * para o `git log` de quem herda o projeto.
 *
 * ELE MORA AQUI, e não no `promocao.mjs`, pelo mesmo motivo que `montarCarimbo` mora aqui: o
 * `zonas.mjs` é o dono do conceito de congelamento. Dois donos para a mesma representação é a
 * família de defeito que a gramática do `sync-log.md` pagou para fechar.
 *
 * E ELE MORA DEPOIS DO BLOCO DO CARIMBO, e não no meio dele: `montarCarimbo`, a sentinela,
 * `RE_CARIMBO` e `lerCarimbo` são uma unidade — a regex é DERIVADA do montador, e as duas mudam
 * juntas. Separá-las por 44 linhas de outra coisa esconde essa dependência de quem for editar uma
 * delas.
 *
 * A SAÍDA QUE ELE ANUNCIA É REMOVER O MARCADOR, e não a válvula de isenção. `DIR_ISENCOES` isenta
 * o gate de entrega, e NADA isenta a trava do congelamento: `avaliarCongelamento` não tem exceção,
 * de propósito. Mandar o consultor pela isenção seria anunciar porta que não abre — o mesmo defeito
 * que já foi corrigido na mensagem de negação e na rule do Plan, e este é o terceiro lugar onde o
 * texto podia reintroduzi-lo.
 */
export function montarMarcador({ data, documentos } = {}) {
  const lista = (documentos || []).map((d) => `- \`${RAIZ_EXPLORE}/${d}\``).join('\n');
  return [
    `# Explore congelado em ${data}`,
    '',
    'Este arquivo é o **marcador de máquina** do congelamento (Decisão 16). Enquanto ele existir,',
    `o harness nega escrita sob \`${RAIZ_EXPLORE}/\`.`,
    '',
    'Mudança de requisito vai para `outputs/spec/`. Virada de escopo vai para `spec-scope-change`.',
    '',
    '**Não apague este arquivo só para editar um documento do Explore.** Ele foi criado por',
    '`node .claude/ferramentas/promocao.mjs --congelar`, que antes de criá-lo releu os documentos',
    'abaixo e conferiu que todos receberam o carimbo. Apagá-lo sem descarimbar os documentos deixa',
    'as duas representações do congelamento discordando.',
    '',
    'Se o Explore precisa mesmo ser **reaberto** — o congelamento saiu por engano, ou o pré-projeto',
    'voltou a ser editável —, então remover este arquivo é a saída, e é a única: depois dele nenhuma',
    'escrita sob `outputs/explore/` passa, nem a de quem quisesse recarimbar.',
    '',
    'Documentos carimbados:',
    '',
    lista || '- (nenhum)',
    '',
  ].join('\n');
}

/**
 * O arquivo cuja PRESENÇA diz "este repositório é o template" (Decisão 40).
 *
 * Ignorado pelo git de propósito: arquivo ignorado não viaja num `git clone`, então um clone só o
 * tem se alguém o criar à mão. O mantenedor o cria uma vez em cada cópia de trabalho do template —
 * worktrees incluídas, porque worktree nova nasce sem arquivos ignorados. Esquecer dá a mensagem de
 * clone, que só manda o leitor para o template: o erro barato. O `vendorizacao.test.mjs` prende que
 * ele está no `.gitignore` e NÃO está versionado — versionado, ele viajaria e inverteria a detecção.
 *
 * Por que não o remote do git: o template não tem remote hoje, e quando for publicado o template e
 * todo clone terão o MESMO `origin`. O remote não distingue os dois no único cenário em que a
 * distinção importa.
 *
 * ELE MORA NO NÚCLEO PURO, e não na casca de I/O ao lado do `souOTemplate` que o consome: é o
 * `paragrafoDoMaquinario` — puro, e importado pelo `escrita-bash.mjs` — que cita o nome do arquivo
 * na mensagem. Declará-lo depois do separador deixaria uma função do núcleo dependendo de um `const`
 * da casca, que é exatamente a seta que o cabeçalho deste arquivo diz não existir.
 */
export const MARCADOR_TEMPLATE = '.harness-template';

/**
 * O manifesto da zona imutável (Decisão 67), o mesmo nome do `verificar-zona.mjs`. Ele vem em todo
 * pacote publicado e nunca existe no template: é o que impede o marcador de destravar um clone.
 */
export const MANIFESTO_DA_ZONA = 'harness-zona.lock.json';

/**
 * As duas pastas da zona onde o PROJETO pode estender o harness: um agente próprio, uma skill
 * própria. Literais inteiros de propósito — os geradores reescrevem `.claude` por regex em todo
 * texto, e assim estes nomes viram `.cursor/agents/` e `.kiro/skills/` nas outras saídas sem que
 * ninguém precise montá-los por partes. O `verificar-zona.mjs` repete os dois literais pela mesma
 * razão do `MARCADOR_TEMPLATE`, e um teste cruza as cópias.
 */
export const PASTA_DE_AGENTES = '.claude/agents/';
export const PASTA_DE_SKILLS = '.claude/skills/';

/** Glob de shell no caminho? Um padrão não nomeia arquivo nenhum — não pode ser "extensão". */
const RE_GLOB = /[*?[]/;

/**
 * Este caminho da zona imutável é EXTENSÃO DO PROJETO, e não maquinário? Puro.
 *
 * A zona inteira é `.claude/agents/` e `.claude/skills/`, e antes desta regra um agente ou uma skill
 * do PROJETO reprovava o PR (extra na zona) e era negado pelo hook — a única saída era um fork. A
 * regra separa pelo manifesto do pacote, que é a lista do que o harness entregou:
 *
 *   - `agents/<arquivo>` que o manifesto não lista é do projeto;
 *   - `skills/<nome>/…` em que NENHUM arquivo do manifesto mora sob `skills/<nome>/` é do projeto —
 *     a pasta inteira, inclusive ela mesma (apagar a própria skill é manutenção do projeto).
 *
 * O QUE CONTINUA NEGADO: todo arquivo que ESTÁ no manifesto, todo arquivo novo dentro de uma skill
 * do harness (seria edição do maquinário por acréscimo), a própria pasta `agents/`/`skills/`, e o
 * caminho com glob — `agents/*` alcança os agentes do harness junto.
 *
 * SÓ VALE COM A PASTA NA ZONA DO MANIFESTO. A saída Kiro tira `.kiro/agents/` da zona verificada
 * (é o lugar nativo dos agentes do Kiro, e ali mora o `harness-elo.json` do próprio harness); sem
 * esta condição, o arquivo do harness fora do manifesto viraria "extensão". Sem manifesto (clone de
 * antes da Decisão 67) a resposta é `false` — o comportamento de antes, que nega.
 *
 * A comparação passa por `casaAlgum` (caixa, `./`, `..`), a mesma de toda a zona.
 */
export function ehExtensaoDoProjeto(relPath, manifesto) {
  if (!manifesto || !Array.isArray(manifesto.zona) || !manifesto.arquivos) return false;
  const bruto = String(relPath == null ? '' : relPath);
  if (RE_GLOB.test(bruto)) return false;
  const doManifesto = Object.keys(manifesto.arquivos);
  if (casaAlgum(bruto, doManifesto)) return false;
  const naZonaDoManifesto = (pasta) => manifesto.zona.some((e) => casaAlgum(e, [pasta]) && casaAlgum(pasta, [e]));
  const resto = (pasta) => {
    // `casaAlgum` com a entrada de diretório casa a própria pasta e o conteúdo; o conteúdo é o que
    // tem segmento além dela. O recorte é sobre a forma normalizada que o `casaAlgum` também usa.
    if (!casaAlgum(bruto, [pasta]) || casaAlgum(bruto, [pasta.slice(0, -1)])) return null;
    const normal = bruto.replace(/\\/g, '/').split('/').filter((s) => s && s !== '.');
    const pilha = [];
    for (const s of normal) { if (s === '..') pilha.pop(); else pilha.push(s); }
    return pilha.slice(pasta.split('/').filter(Boolean).length);
  };

  const agente = resto(PASTA_DE_AGENTES);
  if (agente && agente.length && naZonaDoManifesto(PASTA_DE_AGENTES)) return true;

  const skill = resto(PASTA_DE_SKILLS);
  if (skill && skill.length && naZonaDoManifesto(PASTA_DE_SKILLS)) {
    const pastaDaSkill = `${PASTA_DE_SKILLS}${skill[0]}/`;
    return !doManifesto.some((rel) => casaAlgum(rel, [pastaDaSkill]));
  }
  return false;
}

/**
 * O caminho é o próprio marcador do template? Mesma normalização e casamento da zona imutável —
 * caixa, `./`, `..` —, porque `.HARNESS-TEMPLATE` no Windows é o mesmo arquivo.
 *
 * Desde a Decisão 67 o marcador ABRE a zona imutável, e isso faz dele uma chave: o agente que
 * pudesse criá-lo num clone se destravaria sozinho. Então, fora do template, criar o marcador é
 * negado pelas mesmas duas travas que guardam a zona. Quem marca uma cópia como template é o
 * mantenedor, pelo terminal.
 */
export function ehMarcadorDoTemplate(relPath) {
  return casaAlgum(relPath, [MARCADOR_TEMPLATE]);
}

/**
 * O parágrafo que diz PARA ONDE VAI a mudança negada por zona imutável. Um dono só, porque as
 * duas travas (`Write`/`Edit`/`NotebookEdit` aqui, `Bash` no `escrita-bash.mjs`) falam do mesmo
 * fato — e escrito duas vezes ele divergiu de verdade: uma dizia "não neste clone", a outra "não
 * aqui", e nenhuma das duas sabia se o leitor estava num clone.
 *
 * UM PÚBLICO SÓ, desde a Decisão 67. A Decisão 40 tinha dois textos para um veredito: no template a
 * trava também negava, e a mensagem mandava o mantenedor editar fora do agente. Agora a trava abre
 * no template, então quem lê esta negação é sempre um clone.
 *
 * PURO, de propósito: o `escrita-bash.mjs` importa daqui e não pode importar nada que toque disco
 * (restrição global 5).
 */
export function paragrafoDoMaquinario() {
  return [
    'Esses caminhos são maquinário do harness: a atualização do template os **sobrescreve**, ' +
    'e sobrescrita só não gera conflito se ninguém os editou localmente. Editar aqui ' +
    'transforma este projeto num fork do harness.',
    '',
    'Se a mudança é do projeto, ela vai para a zona mutável — `outputs/`, `inputs/`, ' +
    'ou a raiz de `.claude/rules/`. Se é do maquinário, ela muda no template, não aqui.',
  ];
}

/** O parágrafo da negação de quem tenta criar o marcador num clone. Um dono só, pelas duas travas. */
export function paragrafoDoMarcador() {
  return [
    `\`${MARCADOR_TEMPLATE}\` marca a cópia de trabalho do **template**, e no template a zona ` +
    'imutável fica aberta para manutenção. Criá-lo aqui destravaria o maquinário deste projeto.',
    '',
    'Se esta cópia é mesmo o template, crie o marcador **pelo terminal**, fora do agente ' +
    '(`MANUTENCAO.md`).',
  ];
}

/**
 * Escrita neste caminho invade o maquinário do template?
 *
 * NO TEMPLATE A TRAVA ABRE (Decisão 67). A zona é imutável para proteger os clones, e quem mantém o
 * template edita exatamente ela. Antes a trava negava também aqui e só a mensagem mudava, o que
 * obrigava toda manutenção a passar por patch aplicado fora do agente. A garantia dos clones não
 * depende desta trava: é a verificação da zona no PR do projeto, contra o manifesto publicado.
 *
 * `opts.ehTemplate` é uma FUNÇÃO, chamada só quando o caminho é da zona ou é o marcador: a resposta
 * custa um `existsSync`, e a Decisão 40 manda não pagá-lo em escrita nenhuma fora dali. Ausente,
 * vale `false` — todo `io` que não sabe responder é um clone, e o clone é o lado que nega.
 *
 * `opts.manifesto` é OUTRA FUNÇÃO, pela mesma razão de custo: devolve o manifesto da zona (ou
 * `null`) e só é chamada quando a escrita já ia ser negada por zona num clone. É ela que deixa
 * passar a extensão do projeto (`ehExtensaoDoProjeto`). Ausente, não há extensão — nega como antes.
 */
export function avaliarZona(relPath, opts = {}) {
  const marcador = ehMarcadorDoTemplate(relPath);
  if (!marcador && !ehZonaImutavel(relPath)) return null;
  const ehTemplate = typeof opts.ehTemplate === 'function' ? !!opts.ehTemplate() : false;
  if (ehTemplate) return null;
  if (!marcador && typeof opts.manifesto === 'function' && ehExtensaoDoProjeto(relPath, opts.manifesto())) {
    return null;
  }
  return {
    acao: 'deny',
    motivo: marcador
      ? [`\`${relPath}\` é o **marcador do template**.`, '', ...paragrafoDoMarcador()].join('\n')
      : [
        `\`${relPath}\` está na **zona imutável** do template.`,
        '',
        ...paragrafoDoMaquinario(),
      ].join('\n'),
  };
}

/**
 * Escrita neste caminho fere o congelamento do Explore?
 *
 * DUAS PERGUNTAS, e nada mais: o Explore está congelado, e o caminho é dele. Não há exceção.
 *
 * A EXCEÇÃO DO AUTOBLOQUEIO SAIU, e saiu por construção, não por conserto. Enquanto o congelamento
 * morava na prosa dos documentos, instalar o carimbo era escrever dentro da zona que o primeiro
 * carimbo acabara de trancar — e liberar essa escrita exigia distinguir "instalação do carimbo" de
 * "reescrita do documento" a partir do texto. Foram três rodadas e três defeitos reproduzidos:
 * presença do carimbo lida como instalação; arquivo NOVO nascendo carimbado; corpo trocado junto
 * com o carimbo. Cada correção acrescentava condição, e a condição seguinte achava o furo dela.
 *
 * Com o `MARCADOR_CONGELAMENTO` (kit.mjs), a ordem resolve o que a verificação não conseguia:
 * quem congela carimba os cinco documentos PRIMEIRO — escrita comum, o Explore ainda não está
 * congelado — e cria o marcador por ÚLTIMO. Não existe mais operação privilegiada, então não
 * existe mais mecanismo de exceção para ter defeito. Saíram junto `ehInstalacaoDoCarimbo`,
 * `corpoPreservado`, `separarCarimbo`, `conteudoEhArquivoInteiro` e o parâmetro `anterior` — e com
 * eles a leitura do estado anterior do arquivo, que era I/O por escrita.
 *
 * Consequência assumida: depois de congelado, NENHUMA escrita em `outputs/explore/` passa, nem a
 * de quem quisesse recarimbar. A saída é remover o marcador, e é isso que a mensagem diz.
 */
export function avaliarCongelamento(relPath, exploreCongelado) {
  if (!exploreCongelado) return null;
  // Pertencimento ao Explore é do `ehDoExplore` (kit.mjs), NUNCA de um `startsWith` local. O
  // `startsWith(RAIZ_EXPLORE + '/')` que morava aqui era sensível a caixa, não resolvia `..` e
  // exigia a barra final — e a soma dos três era a diferença entre esta trava existir e não
  // existir: `outputs/Explore/hld-funcional.md` no Windows grava no MESMO arquivo real.
  if (!ehDoExplore(relPath)) return null;
  return {
    acao: 'deny',
    motivo: [
      `\`${relPath}\` está em \`${RAIZ_EXPLORE}/\`, que foi **congelado** na conclusão do \`spec-product\`.`,
      '',
      'O pré-projeto virou histórico versionado. A versão que manda agora é a de `outputs/spec/`.',
      '',
      '**Aprofundamento** vai para `outputs/spec/`. **Virada de escopo** vai para ' +
      '`spec-scope-change`.',
      '',
      // A mensagem anterior mandava "correção de typo sair pela válvula de isenção". `DIR_ISENCOES`
      // e `BLOCO_ISENCAO` existem no kit e não têm consumidor nenhum em produção: sob o modelo de
      // acidente, a trava disparando errado deixava o consultor sem saída. Esta saída é concreta,
      // e o consultor consegue executá-la — o marcador está na zona mutável, de propósito.
      `Quem registra o congelamento é \`${MARCADOR_CONGELAMENTO}\`. Se ele foi criado por engano, ` +
      'ou se o Explore precisa mesmo ser reaberto, **remova esse arquivo** — a escrita volta a ' +
      'ser aceita na hora, e o carimbo no topo dos documentos continua contando a história.',
    ].join('\n'),
  };
}

/**
 * A escrita PARECE ser do Explore, e não se sabe onde moram os artefatos deste projeto.
 *
 * FALHA FECHADO, e é a política do `despachar` aplicada onde ela é decidível: a trava do
 * congelamento resolve a raiz dos artefatos pelo `descobrirWorkspace` (o mesmo mecanismo do
 * `fecho-explore`) antes de julgar, porque o marcador mora em `<raiz de artefatos>/outputs/spec/`.
 * Quando aquele mecanismo responde `ambiguo` ou `cwd-ilegivel`, não há raiz — e a pergunta "o
 * Explore está congelado?" não tem resposta. Liberar transformaria "não sei olhar" em "não está
 * congelado", que é o veredito oposto.
 *
 * ISTO NÃO É A NEGAÇÃO DE CONGELAMENTO, e por isso a mensagem é outra. A saída de lá — remover o
 * marcador — não serve aqui: nem se sabe em que repositório ele estaria. A saída daqui é resolver o
 * layout do workspace, e o comando que reporta exatamente este problema é o do `workspace.mjs`. A
 * regra é a mesma que já custou três correções neste projeto: instrução de bloqueante que não
 * satisfaz o bloqueante é o falso positivo mais caro que existe.
 *
 * A REDAÇÃO ESPELHA A DO `fecho-explore` de propósito — os dois bloqueantes falam do MESMO fato,
 * pelo mesmo mecanismo, e duas descrições diferentes do mesmo problema mandariam o consultor
 * procurar dois problemas. O que muda é a primeira linha, que nomeia o arquivo que ELE tentou
 * escrever, e o parágrafo final, que diz por que esta trava precisava da raiz.
 */
export function avaliarRaizIndeterminada(relPath, motivo, detalhe) {
  return {
    acao: 'deny',
    motivo: [
      `O caminho \`${relPath}\` contém \`${RAIZ_EXPLORE}/\`, mas não dá para dizer onde moram os ` +
      'artefatos deste projeto — e uma trava bloqueante que não sabe onde olhar não pode liberar.',
      '',
      `**Workspace indeterminado (\`${motivo}\`):** ${detalhe || 'sem detalhe'}.`,
      '',
      'Rode `node .claude/hooks/workspace.mjs --validar` — ele reporta exatamente este mesmo ' +
      'problema. Num workspace multi-repo, o repo de docs é a única subpasta de primeiro nível ' +
      'com `outputs/explore/` **e** `outputs/spec/`.',
      '',
      `O congelamento do Explore é registrado em \`<repo de docs>/${MARCADOR_CONGELAMENTO}\`; sem ` +
      'saber qual é o repo de docs, não há como perguntar se ele existe.',
    ].join('\n'),
  };
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Esta raiz É o template? O `MARCADOR_TEMPLATE` (núcleo puro) existe **e** o `MANIFESTO_DA_ZONA`
 * não. Conteúdo, tipo e data não entram, do mesmo jeito que o `estaCongelado` abaixo não abre o
 * marcador de congelamento.
 *
 * POR QUE O MANIFESTO ENTRA. Desde a Decisão 67 esta resposta é o veredito da trava: `true` abre a
 * zona imutável. Só o marcador seria uma chave que o agente de um clone cria sozinho — hoje as
 * travas do `Bash` e do `PowerShell` negam criá-lo, mas `node -e` e outros programas passam por
 * fora. Todo clone que veio de um
 * pacote tem o manifesto na raiz, e o template nunca o tem (ele nasce na publicação). Então, num
 * clone, criar o marcador não destrava nada.
 *
 * `existe` é ponto de injeção só para teste. O `existsSync` engole todo erro como `false`: sem
 * conseguir olhar o marcador, é clone (nega); sem conseguir olhar o manifesto, também é clone,
 * porque a ausência que abre a trava tem que ser afirmada, não suposta — por isso a pergunta pelo
 * manifesto usa `existe` do mesmo jeito e a dúvida cai do lado que nega.
 *
 * O DISCO SOZINHO NÃO BASTAVA, e foi reproduzido: `rm harness-zona*` (o glob passava pela trava do
 * Bash como nome literal) seguido de `touch .harness-template` satisfazia as duas condições, e a
 * zona abria. O manifesto de um clone é VERSIONADO; o do template nunca existiu no git. Então,
 * quando o disco diria "template", pergunta-se ao HEAD (`noHead`): manifesto lá ⇒ clone. Apagar o
 * arquivo da árvore não apaga o commit. O `git` só é chamado nesse caso — no template de verdade,
 * e no ataque —, nunca num clone íntegro (o `existe` do manifesto já respondeu).
 *
 * FALHA DO GIT É O COMPORTAMENTO DE ANTES: sem git, sem repositório, sem HEAD (repo recém-criado),
 * `noHead` responde `false` e o disco decide. Não é falhar aberto em silêncio: o que fica fora é o
 * clone sem histórico, e o PR do projeto (`verificar-zona.mjs`) continua sendo a garantia.
 */
export function souOTemplate(raiz, existe = existsSync, noHead = manifestoNoHead) {
  if (!existe(join(raiz, MARCADOR_TEMPLATE)) || existe(join(raiz, MANIFESTO_DA_ZONA))) return false;
  return !noHead(raiz);
}

/**
 * O `MANIFESTO_DA_ZONA` está no commit HEAD do repositório desta raiz? `HEAD:./<arquivo>` é relativo
 * à `cwd` — a raiz do projeto pode ser subpasta do repositório. Qualquer falha do `git` é `false`.
 */
export function manifestoNoHead(raiz) {
  try {
    const r = spawnSync('git', ['cat-file', '-e', `HEAD:./${MANIFESTO_DA_ZONA}`], {
      cwd: raiz, stdio: 'ignore', windowsHide: true, timeout: 5000,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * O manifesto da zona desta raiz, parseado, ou `null` (ausente, ilegível ou de forma inesperada).
 * Só a forma que `ehExtensaoDoProjeto` lê — `zona` e `arquivos`; quem valida o manifesto a fundo é
 * o `verificar-zona.mjs`. `null` é o lado que nega: sem manifesto confiável não há extensão.
 */
export function lerManifestoDaZona(raiz, ler = readFileSync) {
  try {
    const m = JSON.parse(String(ler(join(raiz, MANIFESTO_DA_ZONA), 'utf8')));
    return m && Array.isArray(m.zona) && m.arquivos && typeof m.arquivos === 'object' ? m : null;
  } catch {
    return null;
  }
}

/** Ausência de arquivo/diretório — não é ilegibilidade. Restrição global 1 do projeto. */
const ehAusencia = (erro) => !!erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR');

/**
 * O Explore deste projeto já foi congelado? O marcador existe ⇒ sim.
 *
 * UMA CHAMADA DE `stat`, e nenhuma leitura de conteúdo. A versão anterior varria
 * `outputs/explore/*.md` e lia os cinco documentos inteiros a CADA escrita dentro do Explore, para
 * procurar a linha de carimbo neles. Isso custava 28–44 ms no caso comum — o Explore NÃO congelado,
 * que é o estado durante todo o pré-projeto — quase o orçamento inteiro de 50 ms da Decisão 14,
 * para produzir sempre a mesma resposta. E custava pior que isso: não havia como distinguir o
 * carimbo da CITAÇÃO do carimbo, então documentar o procedimento de congelamento no `gaps.md`
 * congelava o projeto e bloqueava a correção do próprio `gaps.md`. Ver `MARCADOR_CONGELAMENTO`.
 *
 * EXISTÊNCIA, não tipo. Não se pergunta `isFile()`: qualquer coisa naquele caminho é o marcador.
 * A guarda de tipo custaria uma condição sem teste que a defenda e responderia "não congelado"
 * para um caso ambíguo — e das duas leituras de um caminho ocupado por algo estranho, a
 * conservadora é negar, não liberar. A saída continua sendo remover o que está lá.
 *
 * `statear` é ponto de injeção só para teste — mesmo padrão do `lerDiretorio` de `inventariar`.
 * Ausência (`ENOENT`/`ENOTDIR`) é `false`: não há congelamento registrado, e `outputs/spec/` pode
 * nem existir ainda. Qualquer OUTRO erro é RELANÇADO — um bloqueante não pode receber "não achei"
 * quando na verdade não conseguiu olhar.
 */
export function estaCongelado(raizProjeto, statear = statSync) {
  try {
    statear(join(raizProjeto || '.', MARCADOR_CONGELAMENTO));
    return true;
  } catch (erro) {
    if (ehAusencia(erro)) return false;
    throw erro;
  }
}
