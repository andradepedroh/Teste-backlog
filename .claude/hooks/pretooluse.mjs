// Harness Elo v2 — Ponto de entrada único do PreToolUse. Núcleo puro + casca de I/O.
//
// Decisão 14 da spec: seis verificadores atrás de dois pontos de entrada, em vez de seis
// comandos no settings.json. Um spawn de Node por tool call, e a latência passa a ser O(1)
// no número de verificações — acrescentar trava deixa de custar.
//
// A TABELA DE REGISTRO abaixo assume o papel de documentação que o settings.json cumpria
// quando havia seis comandos declarados nele. Sem ela, a camada perde legibilidade sem
// ganhar nada: quem quiser saber o que roda quando, lê aqui.

import { ehDoExplore, podeSerDoExplore, caminhoDaTool, relativizarComRecuo } from './kit.mjs';
import {
  avaliarZona, avaliarCongelamento, avaliarRaizIndeterminada, estaCongelado, souOTemplate,
  lerManifestoDaZona,
} from './zonas.mjs';
// A RAIZ DOS ARTEFATOS TEM UM DONO SÓ neste repositório, e é o `descobrirWorkspace`. A trava do
// congelamento passou a consultá-lo (conserto do I1 da Task 4) em vez de julgar contra a `cwd`; o
// `fecho-explore`, o `cadeia` e o `delivery-gate` já o consultavam. O `criarResolvedorDeArtefatos`
// é o adaptador dele para caminho relativo à `cwd`, e mora no `workspace.mjs` porque a trava do
// `Bash` (`escrita-bash.mjs`) consome exatamente a mesma resposta.
import { criarResolvedorDeArtefatos, ehCaminhoSobRaizDeArtefatos } from './workspace.mjs';
import { avaliar as avaliarEscritaBash, avaliarPowerShell } from './escrita-bash.mjs';
import { avaliar as cadeiaAvaliar } from './cadeia.mjs';
import { avaliar as fechoAvaliar } from './fecho-explore.mjs';
import { avaliar as gateAvaliar } from './delivery-gate.mjs';

/** Curinga de gatilho: casa qualquer tool. */
export const QUALQUER = '*';

/**
 * As tools que ESCREVEM em arquivo, e por isso passam pelas duas travas. Uma lista só, porque as
 * duas travas fiscalizam exatamente o mesmo conjunto de operações — duas listas divergiriam, e a
 * divergência seria uma trava cobrindo uma tool que a outra não cobre, em silêncio.
 */
const GATILHOS_DE_ESCRITA = ['Write', 'Edit', 'NotebookEdit'];

/**
 * Monta a tabela de registro sobre um conjunto de operações de I/O — injetável para teste.
 *
 * Isto existe por duas razões, e as duas são o mesmo defeito visto de ângulos diferentes:
 *   - a restrição do módulo diz que o núcleo puro não lê disco, e os `executar` chamavam
 *     `process.cwd()` e `estaCongelado`/`readFileSync` direto, ACIMA do separador de casca;
 *   - sem ponto de injeção, testar o wiring exigiria `process.chdir`, e por isso ninguém testou:
 *     mutar `caminhoEscrito` para devolver `null` sempre — o que transforma as duas travas em
 *     no-op completo — deixava a suíte inteira verde.
 *
 * `io` precisa de SEIS operações:
 *   - `cwd()` → raiz do projeto;
 *   - `relativizar(raiz, caminhoBruto)` → caminho relativo à raiz, ou `null` se estiver fora do
 *     projeto. É I/O porque a resposta certa depende do sistema de arquivos — ver
 *     `relativizarComRecuo`, no kit.mjs;
 *   - `exploreCongelado(raiz)` → boolean;
 *   - `lerArquivo(abs, 'utf8')` → conteúdo, ou lança;
 *   - `lerDiretorio(dir, { withFileTypes: true })` → entradas, ou lança;
 *   - `statMs(abs)` → `mtimeMs`, ou lança.
 *
 * As três últimas entraram com o `fecho-explore`, que é o verificador mais pesado da tabela e o
 * único que lê o CONTEÚDO do projeto. Elas moram aqui pela mesma razão que as outras: um módulo de
 * verificação que importa `node:fs` é um módulo cuja casca ninguém testa.
 *
 * O `lerDiretorio` DEIXOU DE SER SÓ DO `fecho-explore`: as travas `congelamento` e `escrita-bash`
 * também o usam, para resolver a raiz dos artefatos pelo `descobrirWorkspace` antes de julgar
 * (conserto do I1 da Task 4, estendido ao gatilho `Bash` na Task 4b). Quem dublar o `io` para
 * testar as duas precisa fornecê-lo — e ele é consultado só quando o alvo pode ser do Explore,
 * nunca em toda escrita nem em todo comando.
 *
 * `lerAnterior` SAIU. Ela existia só para a exceção do autobloqueio de `avaliarCongelamento`, que
 * comparava o conteúdo declarado pela tool com o conteúdo anterior do arquivo. Com o congelamento
 * virando marcador, não há mais exceção nem comparação — e some com ela uma leitura de arquivo por
 * escrita dentro do Explore, mais a tradução do `EISDIR` que só era alcançável por esse caminho.
 *
 * Campos de cada entrada: `nome` para mensagem e log; `gatilhos` com os nomes de tool que ativam;
 * `bloqueia` define a postura de falha; `executar(payload)` devolve `null` para liberar ou
 * `{acao:'deny', motivo}` para negar.
 *
 * CADA VERIFICADOR RESOLVE O CAMINHO — E A RAIZ DOS ARTEFATOS — POR CONTA PRÓPRIA, e isso é
 * escolha, não descuido. Guardar o resultado num cache compartilhado economizaria uma resolução por
 * tool call — medida em 0,7 ms — ao preço de estado mutável compartilhado entre entradas da tabela,
 * que é justamente o que faz uma trava passar a depender de outra ter rodado antes.
 *
 * O QUE DOMINA O CUSTO desta tabela nas tools de escrita, medido nesta máquina depois do conserto
 * do I1 (p50 por chamada da entrada `congelamento`, isolada): escrita FORA do Explore 0,8 ms — o
 * pré-filtro puro corta antes de qualquer disco —, escrita DENTRO do Explore 1,5–2,1 ms em
 * mono-repo e 4,2–5,3 ms em multi-repo. O `exploreCongelado` continua sendo um `stat` só (0,03 ms),
 * contra os 28–44 ms que a varredura dos cinco documentos custava; o que entrou de novo é o
 * `descobrirWorkspace`, cujo custo é LINEAR no número de diretórios de primeiro nível do `cwd` (um
 * `lerDiretorio` mais dois `existsSync` por candidato). Medido no extremo, com 60 diretórios no
 * topo: p50 16,4 ms e p95 35,0 ms — dentro dos 50 ms da Decisão 14, e sem folga. Um repositório de
 * docs real tem entre dois e seis.
 *
 * A TASK 4d ACRESCENTOU UMA VARREDURA, e ela não mexe nesse dominante: quando existe candidata, o
 * `descobrirWorkspace` varre `<cwd>/outputs/explore` para saber se a `cwd` tem CONTEÚDO. É UM
 * `readdir` — o Explore é uma pasta rasa de documentos —, e ela é paga uma vez por descoberta, não
 * por candidato. Medido no mesmo extremo, com os 60 diretórios todos candidatos: p50 14,2 ms e p95
 * 39,1 ms, contra os 16,4/35,0 de antes; o custo continua sendo os 120 `existsSync` do laço de
 * candidatas. Isolada, a varredura custa 0,14 ms (mediana) num Explore de até 40 documentos e
 * 0,93 ms numa árvore de 6 níveis e 120 arquivos — o pior caso plausível, um Explore vendorizado.
 */
export function criarRegistro(io) {
  return [
    {
      nome: 'zona-imutavel',
      gatilhos: GATILHOS_DE_ESCRITA,
      bloqueia: true,
      executar: (payload) => {
        const rel = caminhoEscrito(payload, io);
        if (!rel) return null;
        // O THUNK É O QUE FAZ A DETECÇÃO CUSTAR ZERO FORA DA ZONA (Decisão 40): o `avaliarZona` só o
        // chama quando o caminho é da zona imutável ou é o marcador, e é aí que a resposta decide
        // (Decisão 67 — no template a trava abre). Passar `io.ehTemplate(io.cwd())` como valor
        // pagaria um `existsSync` — e um `io.cwd()` — em TODA escrita de arquivo do projeto.
        //
        // Um `io` sem `ehTemplate` é clone, e nunca lança: o clone é o lado que nega.
        const ehTemplate = () => (typeof io.ehTemplate === 'function' ? io.ehTemplate(io.cwd()) : false);
        // O manifesto é o outro thunk, pela mesma razão: só é lido quando a escrita na zona já ia
        // ser negada num clone — é ele que deixa passar o agente ou a skill do PROJETO.
        const manifesto = () => (typeof io.manifestoDaZona === 'function' ? io.manifestoDaZona(io.cwd()) : null);
        return avaliarZona(rel, { ehTemplate, manifesto });
      },
    },
    {
      nome: 'congelamento',
      gatilhos: GATILHOS_DE_ESCRITA,
      bloqueia: true,
      executar: (payload) => {
        const cwd = io.cwd();
        const rel = caminhoEscrito(payload, io);
        if (!rel) return null;

        // ORDEM: pertencimento primeiro, I/O depois. `podeSerDoExplore` é puro; resolver a raiz e
        // ler o marcador tocam o disco. A ordem inversa consultaria o disco em TODA escrita de
        // qualquer arquivo do projeto, para produzir um valor que não pode mudar a decisão fora do
        // Explore — e o teste `I6` é quem prende isso.
        //
        // O PRÉ-FILTRO É O SUPERSET, e não o `ehDoExplore`, porque neste ponto a raiz dos artefatos
        // ainda não é conhecida: num workspace multi-repo o alvo chega como
        // `portal-docs/outputs/explore/gaps.md`, e `ehDoExplore` — ancorado em prefixo — responde
        // `false`. Um `true` daqui autoriza gastar disco; quem NEGA continua sendo `ehDoExplore`,
        // sobre o caminho já relativo à raiz certa.
        if (!podeSerDoExplore(rel)) return null;

        // A RAIZ DOS ARTEFATOS NÃO É A CWD, e este era o defeito I1 da Task 4: a trava relativizava
        // contra `io.cwd()` e perguntava `io.exploreCongelado(io.cwd())`, enquanto o marcador mora
        // em `<repo de docs>/outputs/spec/`. Em multi-repo — o layout que a rule do Explore trata
        // como normal, o `workspace.md` sendo o primeiro artefato que ela manda criar — a trava
        // LIBERAVA toda escrita num Explore congelado. E é ela que paga a dispensa de frescor da
        // Decisão 22 (ver o item 5 do `fecho-explore`): cega em multi-repo, a contrapartida da
        // dispensa não mordia, e depois do congelamento nenhuma trava perguntava se o Explore
        // mudou depois de revisado.
        //
        // A RAIZ VEM DO `descobrirWorkspace`, o MESMO mecanismo que o `fecho-explore` usa — uma
        // segunda noção de "raiz dos artefatos" divergiria da primeira, e travas divergindo sobre
        // onde é o projeto é a família de defeito que este projeto vem fechando (o C-1 da rodada K
        // é ela, dentro de um verificador só).
        //
        // A CONVERSÃO SAIU DAQUI PARA O `criarResolvedorDeArtefatos` (workspace.mjs), e não por
        // arrumação: o `escrita-bash.mjs` tinha a MESMA cegueira no gatilho `Bash` e precisa da
        // mesma resposta. Escrita duas vezes — uma aqui e uma lá — ela divergiria, e a que
        // divergisse seria a trava. O mono-repo continua saindo pelo caminho curto (o `rel` volta
        // intacto) e o `join(cwd, rel)` continua sendo o que devolve a escrita à forma absoluta
        // antes do segundo `relativizar`; as duas razões estão no JSDoc de lá.
        const artefatos = criarResolvedorDeArtefatos(cwd, io)(rel);
        // Sem raiz não há pergunta a fazer: falha fechado, com a mesma redação do `fecho-explore`.
        if (artefatos.motivo) return avaliarRaizIndeterminada(rel, artefatos.motivo, artefatos.detalhe);
        // OS DOIS CASOS NEGATIVOS DO `rel` SÃO LIDOS PELO DONO DELES, e não por falsidade de
        // string: `null` é "fora do repo de docs" e `''` é "é o próprio repo de docs". Ver
        // `ehCaminhoSobRaizDeArtefatos` (workspace.mjs) — a distinção está escrita lá, num lugar só.
        if (!ehCaminhoSobRaizDeArtefatos(artefatos) || !ehDoExplore(artefatos.rel)) return null;
        return avaliarCongelamento(artefatos.rel, io.exploreCongelado(artefatos.raiz));
      },
    },
    {
      // OS PRÉ-REQUISITOS DA CADEIA DE SKILLS (Task 6). Vem ANTES do `fecho-explore`, e a ordem é
      // observável de verdade: `spec-product` está nos gatilhos dos DOIS — na tabela do `cadeia` e
      // no `SKILLS_DO_PLAN` do fecho —, então num projeto zerado quem fala é quem vier primeiro.
      // Negar por falta de pré-requisito é mensagem mais específica que negar por fronteira de
      // fase: ela nomeia o arquivo que falta, e a de fase nomeia a fase.
      //
      // Gatilho só `Skill`, e só ele (Decisão 13). Âncora de arquivo aqui daria falso positivo —
      // abrir `data-model.json` para corrigir um enum à mão não é rodar a `spec-data-model`.
      nome: 'cadeia',
      gatilhos: ['Skill'],
      bloqueia: true,
      executar: (payload) => cadeiaAvaliar(payload, io),
    },
    {
      // O GATE DE FRONTEIRA Explore→Plan (Task 5). Vem DEPOIS das duas travas de escrita porque
      // elas respondem sobre o arquivo em si — zona imutável, Explore congelado — e este responde
      // sobre a FASE do projeto. Quando as duas coisas valem ao mesmo tempo, a mensagem específica
      // sobre o arquivo é a útil.
      //
      // É o primeiro bloqueante desta camada que nega trabalho de PRODUTO, e não maquinário: ele
      // nega o `spec-product`. Recebe o mesmo `io` das outras entradas — as três operações novas
      // (`lerArquivo`, `lerDiretorio`, `statMs`) entraram no `IO_REAL` por causa dele.
      nome: 'fecho-explore',
      gatilhos: ['Skill', ...GATILHOS_DE_ESCRITA],
      bloqueia: true,
      executar: (payload) => fechoAvaliar(payload, io),
    },
    {
      // As duas travas acima cobrem `Write`/`Edit`/`NotebookEdit` e deixavam o `Bash` livre —
      // verificado executando: `echo pwned > CLAUDE.md` e `sed -i .claude/hooks/kit.mjs` passavam.
      //
      // VEM DEPOIS DAS DUAS DE PROPÓSITO. As mensagens delas são mais específicas quando a escrita
      // chega por tool de arquivo; esta é a rede de baixo, e a ordem faz com que ela só fale quando
      // as outras não têm o que dizer. Recebe o MESMO `io` — uma casca só para a mesma pergunta.
      nome: 'escrita-bash',
      gatilhos: ['Bash'],
      bloqueia: true,
      executar: (payload) => avaliarEscritaBash(payload, io),
    },
    {
      // A TOOL `PowerShell` do Claude Code (Windows) escapava de TODA trava: o `matcher: "*"` do
      // settings.json já a entregava a este despachante, mas nenhuma entrada a tinha no gatilho.
      // A regra lê o alvo de cada instrução, como a do Bash, com a gramática mínima dos cmdlets; o
      // porquê está no topo da seção dela, no `escrita-bash.mjs`. Mesmo `io`, mesma pergunta de
      // template e de manifesto.
      nome: 'escrita-powershell',
      gatilhos: ['PowerShell'],
      bloqueia: true,
      executar: (payload) => avaliarPowerShell(payload, io),
    },
    {
      // O GATE DE ENTREGA (Task 9): integrar uma US — push de feature, PR para o branch de
      // integração — sem auditoria fresca aprovada. É o ÚNICO gate de push do projeto, e o
      // segundo bloqueante no gatilho `Bash`.
      //
      // VEM DEPOIS DO `escrita-bash`, e a ordem é observável: um comando composto
      // (`git push … && rm -rf .claude/hooks`) morde nos dois. Duas razões, na ordem em que
      // pesam:
      //   1. MENSAGEM. O `escrita-bash` fala do dano que o COMANDO causa agora — escrita em
      //      caminho protegido. Este fala do ESTADO do processo — falta auditoria. Quando as duas
      //      valem, a do dano imediato é a acionável, o mesmo critério que já pôs as travas de
      //      escrita antes do `fecho-explore`.
      //   2. CUSTO. É o único verificador da tabela que dispara subprocesso (`git rev-parse`,
      //      `git rev-list`, `git ls-tree`) em toda tool call de `Bash`. Deixá-lo por último faz
      //      com que um deny mais barato o dispense — `despachar` interrompe no primeiro deny.
      //
      // Recebe o `io` só pelo `cwd`: o resto do disco ele lê pela casca própria, herdada do v1
      // junto com a lógica de decisão. O `cwd` injetado é o que põe o wiring dentro da suíte.
      nome: 'delivery-gate',
      gatilhos: ['Bash'],
      bloqueia: true,
      executar: (payload) => gateAvaliar(payload, io),
    },
  ];
}

/**
 * Caminho relativo à raiz do projeto, a partir do payload. `null` se não houver caminho ou se ele
 * estiver fora do projeto.
 *
 * QUAL CAMPO LER É PERGUNTA DO KIT, não deste arquivo. `caminhoDaTool` responde por `file_path` e
 * `notebook_path` — schemas diferentes, não sinônimos — e pelo `''` que mascarava o campo real;
 * o histórico dos dois defeitos está no JSDoc dela. Aqui não se repete a expressão, porque o
 * `posttooluse.mjs` vai fazer a mesma pergunta e duas cópias divergem.
 *
 * A resolução é do `io` porque a resposta certa depende do sistema de arquivos — ver
 * `relativizarComRecuo`, no kit.mjs. `null` (fora da raiz) LIBERA, e isso está certo: o harness
 * governa este repositório, não o disco inteiro. Negar aqui quebraria toda escrita legítima fora do
 * projeto. O que ERA ponto cego de verdade — `file_path` relativo virando `null` e escapando das
 * travas — deixou de existir na rodada A.
 */
function caminhoEscrito(payload, io) {
  const bruto = caminhoDaTool(payload && payload.tool_input);
  if (!bruto) return null;
  return io.relativizar(io.cwd(), bruto);
}

/** A tool casa algum gatilho deste verificador? */
export function casaGatilho(verificador, toolName) {
  const g = (verificador && verificador.gatilhos) || [];
  const t = String(toolName || '');
  return g.includes(QUALQUER) || g.includes(t);
}

/**
 * Roda os verificadores que casam o gatilho, cada um no seu próprio try/catch.
 *
 * POSTURA ASSIMÉTRICA, e é o coração desta função:
 * - bloqueante que devolve deny  → nega, e interrompe (o resto não roda)
 * - bloqueante que LANÇA         → nega também. Falha fechado: não conseguiu determinar, não libera
 * - informativo que lança        → registra em `falhas` e SEGUE. Falha aberto: um verificador
 *                                  informativo quebrado não pode derrubar escrita legítima
 * - informativo que devolve deny → NÃO nega. Um verificador sem `bloqueia: true` não tem
 *                                  autoridade para negar; devolver `deny` por retorno normal
 *                                  (não por exceção) é erro de configuração do verificador,
 *                                  registrado em `falhas`, e a execução SEGUE.
 *
 * Puro: recebe o payload e a tabela, devolve veredito. Não lê disco, não escreve em stdout.
 */
export function despachar(payload, registro) {
  const p = payload || {};
  const tool = String(p.tool_name || '');
  const falhas = [];

  for (const v of registro || []) {
    if (!casaGatilho(v, tool)) continue;
    let r = null;
    try {
      r = v.executar(p);
    } catch (erro) {
      const msg = (erro && erro.message) || String(erro);
      if (v.bloqueia) {
        return {
          acao: 'deny',
          motivo: `O verificador \`${v.nome}\` não conseguiu decidir e por segurança a ação foi negada.\n\nErro: ${msg}\n\nIsto é falha do harness, não do seu trabalho. Reporte com esta mensagem.`,
          falhas,
        };
      }
      falhas.push({ nome: v.nome, erro: msg });
      continue;
    }
    if (r && r.acao === 'deny') {
      if (v.bloqueia) return { acao: 'deny', motivo: r.motivo, falhas };
      // Informativo não pode negar. Retorno normal com deny é bug de configuração do
      // verificador, não uma negação legítima — registra e segue, nunca interrompe.
      falhas.push({
        nome: v.nome,
        erro: `verificador informativo devolveu deny (motivo: "${r.motivo || 'sem motivo'}"), mas só verificador com bloqueia:true pode negar. Corrija o verificador \`${v.nome}\` para devolver null/aviso em vez de deny.`,
      });
      continue;
    }
  }

  return { acao: 'allow', motivo: null, falhas };
}

/** O JSON de negação que o Claude Code espera no PreToolUse. */
export function emitirDeny(motivo) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: motivo,
    },
  });
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * As operações de disco de que o registro precisa. É a única coisa neste arquivo que toca o
 * sistema de arquivos; tudo acima do separador é puro e testável sem `process.chdir`.
 *
 * Exportada para que os testes exercitem o objeto que o `main()` de fato usa — e não só o dublê.
 * Houve uma rodada em que quatro mutações aqui derrubavam ZERO testes: três em `lerAnterior`, que
 * saiu junto com a exceção do autobloqueio, e `exploreCongelado` sempre `false`, que transforma a
 * trava de congelamento em no-op EM PRODUÇÃO. Essa última já NÃO sobrevive — medido de novo numa
 * cópia do repositório inteiro, ela sai com QUATRO testes vermelhos (um `C4`, três `C3`), porque
 * eles montam o registro sobre esta casca e leem o marcador do disco em vez de injetar a resposta.
 */
export const IO_REAL = {
  cwd: () => process.cwd(),

  /**
   * Identidade primeiro, texto como recuo — a POLÍTICA mora no kit (`relativizarComRecuo`), não
   * aqui. Ela saiu deste arquivo porque o `posttooluse.mjs` faz a mesma pergunta sobre o mesmo
   * caminho, e escrita duas vezes ela diverge: os dois despachantes passariam a responder
   * diferente sobre o MESMO `file_path`.
   */
  relativizar: (raiz, bruto) => relativizarComRecuo(raiz, bruto),

  exploreCongelado: (raiz) => estaCongelado(raiz),

  // Decisão 40 — "esta raiz é o template?" Um `existsSync`, pago só dentro do deny por zona
  // imutável: as duas travas que consomem esta operação recebem um THUNK, não o valor, e só o
  // chamam depois de a negação estar decidida. Ver `souOTemplate` (zonas.mjs).
  ehTemplate: (raiz) => souOTemplate(raiz),

  // O manifesto da zona (Decisão 67), para a extensão do projeto: um `readFileSync` + `JSON.parse`,
  // pago só dentro do deny por zona num clone. Ausente ou ilegível é `null` — o lado que nega.
  manifestoDaZona: (raiz) => lerManifestoDaZona(raiz),

  // ——— as três que o `fecho-explore` acrescentou ———
  //
  // Elas moram AQUI, e não dentro do `fecho-explore.mjs`, pela restrição global 5: o
  // `fecho-explore.mjs` não importa `node:fs`, e por isso não existe caminho por onde ELE leia o
  // disco sem passar por este objeto — o que não vale para a tabela inteira, já que o
  // `delivery-gate.mjs` importa `node:fs` e `node:child_process` desde a Task 9 e lê e spawna por
  // casca própria, decisão justificada na entrada dele na tabela de registro. Foi assim que a
  // casca do `fecho-explore` deixou de ser a parte não testada.
  //
  // `statMs` devolve só o `mtimeMs` — o verificador compara idade de relatório contra idade de
  // documento e não precisa do resto do `Stats`. Um `io` que devolve número é dublável em uma
  // linha; um que devolve `Stats` convida a dublê parcial, que passa até o dia em que o
  // verificador ler outro campo.
  lerArquivo: readFileSync,
  lerDiretorio: readdirSync,
  statMs: (caminho) => statSync(caminho).mtimeMs,
};

/**
 * A tabela que o `main()` usa. Mesma forma que `criarRegistro` sempre devolve, então `despachar`
 * e `main()` não sabem que a casca foi extraída.
 */
export const REGISTRO = criarRegistro(IO_REAL);

/**
 * Interpreta o conteúdo bruto do stdin, distinguindo os dois casos que a restrição global do
 * projeto exige separar (fixada em `680f100` e `de3f5e1`): ausência devolve vazio, qualquer
 * outro erro relança/sinaliza.
 *
 * - conteúdo vazio (ou só espaço)  → 'allow': nada a decidir. Sem tool call não há o que
 *                                    fiscalizar, e negar aqui tornaria a sessão inutilizável
 *                                    por detalhe de ambiente (stdin não é pipe, invocação manual).
 * - conteúdo presente e ILEGÍVEL   → 'deny': existe algo, mas não foi possível entendê-lo. Isto
 *                                    é falha do harness/ambiente, não ausência — falhar fechado.
 * - conteúdo presente e válido     → 'prosseguir', com o payload já parseado.
 *
 * Puro: não lê disco, não escreve em stdout.
 */
export function interpretarEntrada(bruto) {
  const texto = String(bruto || '').trim();
  if (!texto) return { acao: 'allow', payload: null, motivo: null };

  try {
    const payload = JSON.parse(texto);
    return { acao: 'prosseguir', payload, motivo: null };
  } catch (erro) {
    const msg = (erro && erro.message) || String(erro);
    return {
      acao: 'deny',
      payload: null,
      motivo: `O payload recebido pelo PreToolUse não é JSON válido e a verificação não pôde rodar.\n\nErro: ${msg}\n\nIsto é falha do harness ou do ambiente, não do seu trabalho. Reporte com esta mensagem.`,
    };
  }
}

function main() {
  let bruto = '';
  try {
    bruto = readFileSync(0, 'utf8');
  } catch {
    return 0; // sem stdin: nada a decidir
  }

  const entrada = interpretarEntrada(bruto);
  if (entrada.acao === 'allow') return 0;
  if (entrada.acao === 'deny') {
    try {
      process.stdout.write(emitirDeny(entrada.motivo));
      return 0;
    } catch {
      try { process.stderr.write(entrada.motivo + '\n'); } catch { /* noop */ }
      return 2;
    }
  }

  const r = despachar(entrada.payload, REGISTRO);
  if (r.acao === 'deny') {
    try {
      process.stdout.write(emitirDeny(r.motivo));
      return 0;
    } catch {
      try { process.stderr.write(r.motivo + '\n'); } catch { /* noop */ }
      return 2;
    }
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main();
}
