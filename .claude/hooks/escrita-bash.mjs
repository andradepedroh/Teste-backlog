// Harness Elo v2 — A escrita que vem por `Bash`. Núcleo puro + casca de I/O.
//
// As travas de zona imutável e congelamento cobrem `Write`, `Edit` e `NotebookEdit`. O `Bash`
// não estava nos gatilhos, e foi verificado executando: `echo pwned > CLAUDE.md`,
// `sed -i 's/x/y/' .claude/hooks/kit.mjs` e `rm -rf outputs/explore` passavam todos.
//
// Sob o modelo de ADVERSÁRIO isso seria um Nit — quem quer contornar tem caminhos mais fáceis.
// Sob o modelo de ACIDENTE E DERIVA, que é o adotado, é o vetor mais provável de todos: ninguém
// digita `\\?\C:\...` por engano, mas `sed -i` no arquivo errado é terça-feira.
//
// ————————————————— A REGRA, E A RODADA EM QUE ELA MUDOU DE LADO —————————————————
//
// **MENÇÃO É LIVRE. NEGA-SE EM POSIÇÃO DE ESCRITA.**
//
// A versão anterior negava quando um comando fora de uma lista de leitura MENCIONAVA um caminho
// protegido. Uma revisão adversarial sondou 263 comandos e achou 24 falsos positivos, e a lista
// deles é o argumento inteiro: `jq .hooks .claude/settings.json` menciona e lê; o corpo de um
// heredoc menciona e nem executa; `for f in .claude/hooks/*.mjs` menciona e itera; `cp origem
// destino` menciona a origem e escreve só no destino. O pior deles negava o PRIMEIRO PASSO que a
// `.claude/rules/harness/explore.md` prescreve — copiar o template de `.claude/templates/` para
// `outputs/explore/` — com uma mensagem que mandava fazer o oposto.
//
// Sob o modelo de ameaça desta trava, **falso positivo é pior que bypass exótico**: uma trava que
// nega o dia a dia é desligada na primeira semana, e trava desligada protege zero.
//
// As cinco posições de escrita, e nada além delas:
//
//   1. ALVO DE REDIREÇÃO — `> alvo`, `>> alvo`. Independe do comando; é a mais forte.
//   2. ALVO DE COMANDO QUE DESTRÓI A ÁRVORE — `rm`, `rmdir`, `mv` (a origem), `find`
//      (`ARVORE_INTEIRA`), com a contenção e a regra do glob.
//   3. DESTINO DE QUEM COPIA OU MOVE — o ÚLTIMO argumento de `cp`, `mv`, `install`, `ln`
//      (`COPIADORES`).
//   4. ARGUMENTO DE ESCRITOR IN-PLACE — `truncate`, `tee`, `shred`, `chmod`, `chown`
//      (`ESCRITORES_IN_PLACE`), e `sed`/`perl` quando têm `-i`.
//   5. `git` QUE REESCREVE A ÁRVORE DE TRABALHO — subcomando fora de `GIT_SO_LEITURA`.
//
// Mais duas regras que não dependem do comando: a OPÇÃO QUE NOMEIA A SAÍDA (`of=`, `--output`) e
// o GLOB que é o segmento inteiro (`*`), que transforma o alvo no diretório-pai.
//
// SIM, 2 A 4 SÃO ENUMERAÇÃO, e a restrição que proíbe enumerar continua valendo — ela proíbe
// enumerar EM VEZ DE declarar o que é permitido. Aqui o permitido está declarado, e é **tudo**:
// só se nega em posição de escrita. A enumeração descreve ONDE UM COMANDO ESCREVE, que é
// conhecimento estável e pequeno (a convenção origem→destino do shell tem cinquenta anos), e não
// QUAIS COMANDOS ESCREVEM, que é a lista que nunca fecha. E o custo de errar mudou de lado: um
// esquecimento aqui vira falso NEGATIVO, e a escrita que o agente faz por tool continua coberta
// pelas travas de `Write`/`Edit`/`NotebookEdit`.
//
// ————————————————— O QUE ESTA TRAVA DELIBERADAMENTE NÃO FAZ —————————————————
//
// Quem não souber disto vai achar que é bug:
//
//   - NÃO INTERPRETA SHELL DE VERDADE. Substituição de variável (`$ALVO`), substituição de
//     comando (`$(...)`), `eval` e concatenação (`ec""ho`) PASSAM. Interpretar shell no hook seria
//     reimplementar o bash, e o modelo de ameaça não pede isso.
//   - SEGUE `cd` (via `segmentarComando`, workspace.mjs), mas só a forma literal: `cd $DIR` e
//     `cd $(...)` não são resolvidos, e o segmento seguinte fica com o diretório anterior.
//   - NÃO COBRE tool de escrita que não seja `Write`/`Edit`/`NotebookEdit`/`Bash`/`PowerShell` —
//     `MultiEdit`, ferramentas MCP de arquivo, etc. Isso é dívida conhecida, registrada na spec. A
//     `PowerShell` tem trava própria no fim deste arquivo (`avaliarPowerShell`): a mesma regra de
//     posição de escrita, com a gramática mínima de alvo dos cmdlets.
//   - NÃO DESFAZ A ASPA ESCAPADA, e continua sem desfazer. `\` não é escape (decisão do
//     `workspace.mjs`, por causa do caminho do Windows), então em `echo "a\"b" && rm -rf
//     .claude/hooks` o parser dessincroniza e o `rm` vira token inerte — `alvosDoComando` não acha
//     alvo nenhum. O que MUDOU na rodada T é que o sinal `aspasAbertas` deixou de ser descartado:
//     ver A ASPA QUE NÃO FECHA, mais abaixo. A leitura continua quebrada; a trava é que parou de
//     tratar leitura quebrada como "não há nada aqui".
//
// ————————————————— OS FALSOS NEGATIVOS QUE ESTE DESENHO ASSUME —————————————————
//
// São o preço da inversão, e cada um tem teste nomeado em `escrita-bash.test.mjs`:
//
//   - LANÇADOR DE PROGRAMA. `npx prettier --write .claude/hooks/` e `code CLAUDE.md` LIBERAM.
//     Este é o mais doloroso: a versão anterior o pegava, e o cabeçalho dela dizia que ele era o
//     acidente-alvo. Só que pegá-lo custava negar `npx prettier --check`, `npx eslint --fix src/`
//     e `code <qualquer arquivo>`, porque separar os dois exige saber o que o programa lançado faz
//     com o caminho — a lista que nunca fecha, agora com preço de falso positivo diário.
//   - CRIAR DIRETÓRIO NOVO. `mkdir outputs/explore/novo` LIBERA: não destrói nem sobrescreve. A
//     exceção é o marcador do template (`mkdir .harness-template`), que é chave desde a Decisão 67.
//     `touch` SAIU deste item: ele era metade do bypass `rm harness-zona*` + `touch
//     .harness-template`, e hoje é escritor in-place (`ESCRITORES_IN_PLACE`).
//   - EXTRAIR ARQUIVO. `tar -xzf x.tgz -C .` e `unzip -o x.zip -d .` LIBERAM — o que eles escrevem
//     não está no comando, está dentro do pacote. Já liberavam antes desta rodada.
//   - EDITOR INTERATIVO. `vim`, `nano`, `code` LIBERAM. Um agente não usa editor interativo.
//   - CONTENÇÃO ATRAVÉS DA SUBPASTA DO REPO DE DOCS, em multi-repo. `rm -rf portal-docs/outputs`,
//     `rm -rf portal-docs` e `mv portal-docs/outputs velho` LIBERAM com o Explore congelado,
//     enquanto `rm -rf outputs` em mono-repo NEGA. O CONSTRANGIMENTO É O CONTRATO DO
//     `avaliarComando`, e não o kit: ele pergunta contenção sobre o `rel` relativo à `cwd` — é essa
//     forma que o `arvoreAlcancada` entrega ao `protegidosContidosEm` —, enquanto a raiz dos
//     ARTEFATOS só é resolvida um nível abaixo, dentro do `protegido`. Somado a isso o pré-filtro
//     corta antes: `podeSerDoExplore('portal-docs/outputs')` responde `false` (medido), então nem o
//     ramo que NOMEIA chega a resolver raiz. Fechar isto é converter a árvore alcançada para a raiz
//     dos artefatos ANTES de perguntar contenção, o que muda o contrato de `avaliarComando` — e não
//     é ensinar ao kit uma segunda noção de raiz, que foi a razão registrada aqui até a Task 4c e
//     mandava a próxima pessoa mexer no lugar errado. O que NOMEIA o caminho do Explore continua
//     negado nas seis famílias de alvo, e é esse o acidente-alvo (`M5`); este resíduo é o teste
//     `M11`, e foi registrado, não fechado.
//
// ————————————————— A RAIZ DOS ARTEFATOS NÃO É A CWD (Task 4b) —————————————————
//
// Esta trava julgava contra o `io.cwd()`, e em workspace MULTI-REPO — o layout que a rule do Explore
// trata como normal — liberava TODA escrita num Explore congelado, porque os artefatos moram em
// `<repo de docs>/outputs/` e o `ehDoExplore` é ancorado em prefixo. A raiz passou a vir do
// `criarResolvedorDeArtefatos` (workspace.mjs), o mesmo mecanismo da trava `congelamento`. O porquê
// inteiro, o custo, a falha fechada e o que a mensagem cita estão no JSDoc do `avaliar`, no fim
// deste arquivo — aqui fica só o aviso de que a pergunta "este caminho é do Explore?" não se
// responde contra a `cwd`.
//
// ————————————————— FALSOS POSITIVOS QUE SOBREVIVEM —————————————————
//
//   - `find <dir>` continua sendo lido como a árvore inteira, porque `find` é lançador
//     (`-delete`, `-exec`, `-execdir`). Custo: `find . -name x` na raiz e `find outputs -name x`
//     com o Explore congelado são negados, apesar de só lerem. Saída: `find src -name x`, `rg`,
//     ou a tool Glob. É o falso positivo mais caro que sobra, e o primeiro candidato a voltar à
//     mesa se incomodar mais do que o `find -delete` protege.
//   - `rm .git/index.lock` é negado junto com o resto do `.git/`. A saída é o terminal.
//   - Glob PARCIAL não é "o diretório inteiro" — isso negaria limpeza de temporário todo dia. Mas ele
//     DEIXOU de ser nome literal: casa por padrão contra a lista fechada do que é protegido
//     (`protegidosCasadosPorGlob`). `rm *.log` passa; `rm harness-zona*` e `rm -rf .cl*` negam.
//
// ————————————————— A ASPA QUE NÃO FECHA (rodada T) —————————————————
//
// O `segmentarComando` devolve `aspasAbertas`, o `delivery-gate` já o honrava (`aspas-nao-
// fechadas` → irresolvível) e esta trava o DESCARTAVA. Dois verificadores da mesma camada com
// posturas opostas sobre o mesmo sinal é a família "dois donos" que este projeto já pagou no
// `kit.mjs` e no formato do `sync-log.md` — foi esse o desempate, não o bypass.
//
// **QUANDO A LEITURA SE SABE QUEBRADA, MENÇÃO A CAMINHO PROTEGIDO VOLTA A CONTAR.** É a única
// situação em que esta trava olha o texto cru, e ela existe porque ali não há posição de escrita
// para olhar: o parser dessincronizou e `alvosDoComando` devolve vazio.
//
// O QUE ESTA REGRA NÃO É, e as duas formas descartadas foram MEDIDAS, não imaginadas:
//
//   - NÃO é falhar fechado em toda dessincronização. `echo it's ok` tem `aspasAbertas: true` —
//     um apóstrofo solto basta —, e negá-lo é falso positivo em texto comum, a pior categoria sob
//     o modelo de ameaça desta trava.
//   - NÃO é a regra estreita que exigia padrão destrutivo (`rm -rf`) junto. Prototipada e medida:
//     fechava 1 das 4 famílias, porque `>`, `sed -i` e `mv` não casam padrão de `rm`. Fecho
//     parcial de bypass é pior que fecho nenhum — faz o buraco parecer resolvido.
//
// E NÃO HÁ LISTA DE CAMINHOS PROTEGIDOS AQUI. A regra extrai fragmentos do texto e pergunta ao
// MESMO `protegido()` que o `avaliar` monta — então herda zona imutável, catástrofe e o
// congelamento de graça, com o memo do `io.exploreCongelado` incluso. Só a EXTRAÇÃO é textual; a
// decisão continua tendo um dono só. Uma terceira cópia da noção de "protegido" é o defeito que
// este projeto mais pagou: as duas raízes do Plan, o formato do `sync-log.md`, os separadores do
// kickoff.
//
// O FALSO POSITIVO É DECLARADO E ACEITO: `echo it's in .claude/hooks` é negado — apóstrofo E
// menção a caminho protegido na mesma linha. Foi pesado contra o ganho e o usuário decidiu por
// fechar. Por isso a mensagem NOMEIA a aspa como causa: quem cai aqui não adivinha, e com a causa
// dita a correção é de uma linha.
//
// O GATILHO ACIDENTAL É PRATICAMENTE UM SÓ, e isso foi medido antes de decidir: caminho do
// Windows entre aspas, caminho terminado em barra, JSON com aspas escapadas, commit com aspas
// escapadas e `sed` com aspas escapadas têm número PAR de aspas e não dessincronizam. Sobra o
// apóstrofo solto.
//
// RESÍDUO CONHECIDO, e ele é o preço de a regra perguntar só "este fragmento É protegido?": a
// CONTENÇÃO não atravessa. `echo "a\"b" && rm -rf .claude` LIBERA, porque `.claude` não é
// protegido — quem o negaria é `protegidosContidosEm`, e estendê-la para os fragmentos do texto
// cru faria um `.` solto (que relativiza para a raiz, e a raiz contém tudo) negar comandos como
// `echo it's ok && git add .`. Trocar o falso negativo raro por esse falso positivo diário é
// exatamente a troca que o modelo de ameaça proíbe. Fica registrado, não fechado.

import {
  ehZonaImutavel, ehDoExplore, podeSerDoExplore, ehDestruicaoCatastrofica, relativizar,
  protegidosContidosEm, MARCADOR_CONGELAMENTO, RAIZ_EXPLORE,
} from './kit.mjs';
import {
  segmentarComando, analisarGit, criarResolvedorDeArtefatos, ehCaminhoSobRaizDeArtefatos,
} from './workspace.mjs';
// DUAS MENSAGENS COM DONO NO `zonas.mjs`, e as duas por não poderem ter dois donos:
//
//   - A RAIZ INDETERMINADA. Três bloqueantes falam desse mesmo fato — este, a trava `congelamento`
//     e o `fecho-explore` —, e três redações do mesmo problema mandariam o consultor procurar três
//     problemas. Ver `avaliarRaizIndeterminada`.
//   - O PARÁGRAFO DO MAQUINÁRIO (Decisão 40), que diz para onde vai a mudança negada por zona
//     imutável. Escrito duas vezes ele JÁ divergiu: esta trava dizia "não neste clone" e o
//     `avaliarZona` dizia "não aqui". Agora é uma função só. Ver `paragrafoDoMaquinario`. O mesmo
//     vale para o parágrafo do marcador do template (Decisão 67), `paragrafoDoMarcador`.
//
// O que se importa dali é PURO — monta texto e não toca disco. A restrição global 5 continua
// valendo para este arquivo no que ela pede: a casca dele é o `io` injetado. Mas a frase antiga
// dizia "ele não importa `node:fs`", e isso só vale para import DIRETO: o grafo de módulos já
// alcançava `node:fs` pelo `workspace.mjs` e agora também pelo `zonas.mjs`. A diferença não é
// acadêmica — o `existsSync` do `descobrirWorkspace` NÃO é ponto de injeção, e vai ao disco real
// mesmo sob dublê. É por isso que os testes de layout de workspace desta trava precisam de árvore
// de verdade em `mkdtemp`, e não de `io.lerDiretorio` dublado: quem decide candidata a repo de docs
// é o disco.
//
// A METADE QUE PASSA PELO `io`, para o mapa ficar completo: desde a Task 4d o `descobrirWorkspace`
// também pergunta se o `outputs/explore/` da `cwd` tem CONTEÚDO, e essa pergunta anda pelo
// `inventariar` com o `lerDiretorio` INJETADO. Então "quem é candidata" é disco real e "a `cwd`
// ganha da candidata?" é dublável — duas metades da mesma decisão, por caminhos diferentes.
import {
  avaliarRaizIndeterminada, paragrafoDoMaquinario, paragrafoDoMarcador, ehMarcadorDoTemplate,
  ehExtensaoDoProjeto, MARCADOR_TEMPLATE,
} from './zonas.mjs';
import { resolve, join, isAbsolute } from 'node:path';

/**
 * `git` precisa de granularidade: `git log` lê, `git checkout -- <path>` sobrescreve. É a única
 * lista de LEITURA que sobrou nesta trava, e ela sobrevive por uma razão que não vale para o
 * resto: em `git`, a posição do argumento não diz nada — quem escreve na árvore de trabalho é o
 * SUBCOMANDO, e são dezenas.
 *
 * O critério de entrada é ESTREITO de propósito — "não altera o conteúdo dos caminhos que nomeia".
 * `commit`, `add`, `push` e `fetch` entram por ele: os quatro mexem no repositório, nenhum toca
 * arquivo da árvore de trabalho. Sem `commit` aqui, `git commit -m ".claude/hooks/kit.mjs: ..."`
 * é NEGADO — a mensagem de commit é texto livre e cita caminho o tempo todo, e negar um commit
 * pela prosa dele é exatamente o falso positivo que atrapalha trabalho legítimo. `grep` entrou
 * nesta rodada pelo mesmo argumento: `git grep -n "RF-" outputs/explore` só lê.
 *
 * Ficam de fora, e continuam sendo negados quando tocam caminho protegido: `checkout`, `restore`,
 * `reset`, `clean`, `apply`, `stash`, `rm`, `mv`, `switch`, `merge`, `pull`, `revert`,
 * `cherry-pick` — todos capazes de reescrever arquivo da árvore.
 */
export const GIT_SO_LEITURA = new Set(['log', 'diff', 'show', 'status', 'blame', 'ls-files',
  'rev-parse', 'describe', 'remote', 'commit', 'add', 'push', 'fetch', 'grep']);

/**
 * Comandos para os quais um argumento de DIRETÓRIO significa "tudo que está dentro dele".
 *
 * A pergunta que esta lista responde é "para quem o diretório é a ÁRVORE, e não o DESTINO?":
 *
 *   - DESTRÓI OU PERCORRE A ÁRVORE — `rm`, `rmdir` (removem o diretório e o conteúdo), `mv` (leva
 *     a árvore embora; onde ela estava não sobra nada), `find` (DESCE em cada nó e age nele:
 *     `-delete`, `-exec`). Para os quatro, apontar para um diretório é apontar para tudo que está
 *     lá dentro, e a contenção vale.
 *   - ESCREVE DENTRO DA ÁRVORE — `cp`, `tar -x`, `unzip`, `install`, `ln`, `tee`. Para esses, o
 *     diretório é ONDE a coisa vai parar. `cp relatorio.md .` é operação legítima e diária.
 *
 * `mv` está nas DUAS listas, e é isso que a aridade resolve: a ORIGEM de um `mv` é árvore (some de
 * onde estava), o DESTINO é destino (`mv relatorio.md outputs/` não destrói `outputs/`).
 *
 * AUSÊNCIAS JUSTIFICADAS:
 *   - `shred` não recursa: `shred <dir>` falha. O caso real dele é `shred *`, pego pela regra do
 *     glob, que vale para todo alvo de escrita.
 *   - `git` fica fora. Os subcomandos que escrevem (`checkout`, `restore`, `clean`) restauram ou
 *     limpam a partir do próprio repositório, e o maquinário do template é versionado: `git
 *     checkout -- .` não destrói a zona imutável, ele a devolve ao HEAD.
 *
 * Se um dia esta lista crescer além de meia dúzia, isso é sinal de que a formulação está errada —
 * volte para a pergunta, não acrescente a linha.
 */
export const ARVORE_INTEIRA = new Set(['rm', 'rmdir', 'mv', 'find']);

/**
 * Quem escreve no ÚLTIMO argumento. A convenção `origem… destino` do shell é a mais estável que
 * existe, e é ela que faz `cp .claude/templates/hld-funcional.md outputs/explore/hld-funcional.md`
 * — o primeiro passo que a rule do Explore prescreve — passar, enquanto `cp novo.md CLAUDE.md`
 * continua negado.
 *
 * `rsync` entrou por sondagem própria: `rsync -av novo/ .claude/hooks/` liberava, e ele é `cp` com
 * outro nome. Aridade idêntica, mesma convenção.
 *
 * CUSTO ASSUMIDO: quem inverte a ordem por opção (`cp -t <dir> <origem>`, `install --target-
 * directory`) engana a regra, e o destino real vira menção livre. É falso negativo, não positivo.
 */
export const COPIADORES = new Set(['cp', 'mv', 'install', 'ln', 'rsync']);

/**
 * Escritores in-place: o caminho que eles nomeiam É o alvo escrito, sem redireção e sem destino.
 *
 * `dd` não está aqui porque o alvo dele é `of=`, que a regra da OPÇÃO QUE NOMEIA A SAÍDA já cobre
 * — e cobre para qualquer comando, não só `dd`.
 *
 * `chmod` e `chown` mudam permissão, não conteúdo, e a versão anterior os deixava de fora por
 * isso. Entraram nesta rodada por decisão do briefing: sob o modelo de acidente, um `chmod -R` no
 * maquinário do template é dano real, e negar custa pouco — ninguém faz `chmod` em caminho
 * protegido no dia a dia.
 */
export const ESCRITORES_IN_PLACE = new Set(['truncate', 'tee', 'shred', 'chmod', 'chown', 'touch']);

/**
 * Quem CRIA diretório. `mkdir` não destrói nem sobrescreve, e por isso continua livre em toda a
 * zona — com UMA exceção: o marcador do template. Desde a Decisão 67 a existência dele (arquivo ou
 * diretório, tanto faz para o `souOTemplate`) abre a zona imutável, e então criá-lo é escrever a
 * chave. Os argumentos de `mkdir` só contam quando o rótulo é `marcador-template`.
 *
 * `touch` foi para `ESCRITORES_IN_PLACE`, e não para cá: ele cria ARQUIVO e altera data de arquivo
 * existente — no Explore congelado isso mexe na idade que o `fecho-explore` compara. Ele era a
 * outra metade do bypass reproduzido (`rm harness-zona*` + `touch .harness-template`).
 */
export const CRIADORES_DE_DIRETORIO = new Set(['mkdir']);

/**
 * Programas cuja escrita depende do `-i`: sem ele não escrevem em arquivo nenhum. É a única regra
 * desta trava que olha FLAG, e ela existe porque `sed` sem `-i` é leitura pura — `sed -n '1,50p'
 * arquivo` era um dos 24 falsos positivos, e é o idioma mais comum de ler trecho de arquivo.
 *
 * A detecção é larga de propósito (`-i`, `-i.bak`, `-ni`, `--in-place`, `--in-place=.bak`): errar
 * para o lado de "isto escreve" aqui só custa negar um `sed` que não escrevia, e é barato. Não
 * usar `/i` no regex é deliberado — `perl -Ilib script.pl` tem `-I` maiúsculo, que é caminho de
 * include, e casá-lo transformaria `script.pl` em alvo de escrita.
 */
export const IN_PLACE_COM_FLAG = new Set(['sed', 'perl']);

/**
 * Opções que NOMEIAM o arquivo escrito, em qualquer comando. `dd if=/dev/zero of=CLAUDE.md`
 * LIBERAVA — medido —, e `git diff --output=CLAUDE.md` liberava mesmo com a versão anterior,
 * porque `diff` é subcomando de leitura. As duas fecham aqui, sem enumerar comando nenhum.
 *
 * `-o` NÃO entra, e a ausência é medida, não esquecimento: `ls -o`, `find . -name a -o -name b` e
 * `docker run -o` usam a mesma letra para outra coisa, e um `ls -o .claude/hooks/` negado seria
 * falso positivo diário. O preço é que `curl -o CLAUDE.md` passa enquanto `curl --output
 * CLAUDE.md` nega.
 */
const OPCOES_QUE_ESCREVEM = new Set(['of', 'output', 'out-file', 'output-file']);

/**
 * Raiz fictícia para quando o chamador não informa a real. Ela existe para que o NÚCLEO seja puro:
 * `segmentarComando` resolve `cd` com `path.resolve`, que sem uma raiz absoluta cairia no
 * `process.cwd()` — leitura de ambiente dentro do núcleo. Como o caminho volta a ser relativizado
 * contra a MESMA raiz, ela se cancela e o resultado é o caminho relativo ao projeto.
 *
 * A casca passa a raiz DE VERDADE (`io.cwd()`), e é isso que faz um caminho absoluto de dentro do
 * projeto (`C:/.../harness-elo-v2/CLAUDE.md`) ser reconhecido em produção.
 */
export const RAIZ_NEUTRA = resolve('/__raiz-do-projeto__');

/** Nome do comando, sem diretório e sem `.exe`: `/usr/bin/rm` e `C:\...\rm.exe` são `rm`. */
function nomeDoComando(token) {
  const s = String(token == null ? '' : token);
  const base = s.split(/[\\/]/).pop() || s;
  return base.replace(/\.exe$/i, '').toLowerCase();
}

/** O comando edita no lugar por causa de um `-i`? Ver `IN_PLACE_COM_FLAG`. */
function temFlagInPlace(tokens) {
  return tokens.some((t) => /^-[a-z]*i/.test(t) || /^--in-place/.test(t));
}

/**
 * O token é uma opção que nomeia o arquivo de saída? Devolve `{valor, consumiu}` ou `null`.
 * `consumiu` diz se o VALOR estava no token seguinte (`--output alvo`) ou colado (`of=alvo`).
 */
function opcaoQueEscreve(token, proximo) {
  const colada = /^-{0,2}([\w-]+)=(.+)$/.exec(token);
  if (colada) {
    return OPCOES_QUE_ESCREVEM.has(colada[1].toLowerCase()) ? { valor: colada[2], consumiu: 0 } : null;
  }
  const longa = /^--([\w-]+)$/.exec(token);
  if (longa && OPCOES_QUE_ESCREVEM.has(longa[1].toLowerCase()) && proximo != null && !proximo.startsWith('-')) {
    return { valor: proximo, consumiu: 1 };
  }
  return null;
}

/**
 * As POSIÇÕES DE ESCRITA de um comando, já resolvidas contra o diretório em vigor.
 *
 * Cada alvo carrega: `comando` (o executável daquele segmento, com o subcomando quando é `git`),
 * `token` (como o usuário escreveu), `caminho` (absoluto, com `cd` e `git -C` aplicados) e `tipo`
 * (`redirecao`, `opcao`, `arvore`, `destino`, `in-place`, `git`, `criacao`).
 *
 * O QUE NÃO ESTÁ EM POSIÇÃO DE ESCRITA NÃO APARECE AQUI. É a inversão desta rodada, e é o que
 * torna o resto simples: `avaliarComando` não precisa mais perdoar ninguém depois, e a pergunta
 * cara — `protegido()`, que pode custar disco — passou a ser feita só sobre o que se escreve.
 *
 * O primeiro token não é candidato: ele é o comando, e executar um arquivo não é escrever nele.
 * Um `>` no início do segmento (`> CLAUDE.md`, que TRUNCA) continua sendo lido como redireção.
 */
export function alvosDoComando(comando, opts = {}) {
  const raiz = opts.raiz || RAIZ_NEUTRA;
  const { segmentos } = segmentarComando(comando, raiz);
  const alvos = [];

  for (const segmento of segmentos) {
    const { tokens } = segmento;
    const nome = nomeDoComando(tokens[0]);
    let dir = segmento.dir;
    let rotuloDoComando = nome;
    let tipoDoArgumento = null; // o que os argumentos comuns significam para ESTE comando

    if (nome === 'git') {
      // O subcomando e o `-C` saem do `analisarGit` (workspace.mjs), a mesma leitura que o
      // delivery-gate usa. Uma segunda cópia divergiria, e a que divergisse seria a trava.
      const { sub, cDir } = analisarGit(tokens);
      if (cDir) dir = resolve(dir, cDir);
      if (sub) rotuloDoComando = `git ${sub}`;
      if (!GIT_SO_LEITURA.has(String(sub == null ? '' : sub).toLowerCase())) tipoDoArgumento = 'git';
    } else if (ARVORE_INTEIRA.has(nome)) {
      tipoDoArgumento = 'arvore';
    } else if (ESCRITORES_IN_PLACE.has(nome) || (IN_PLACE_COM_FLAG.has(nome) && temFlagInPlace(tokens))) {
      tipoDoArgumento = 'in-place';
    } else if (CRIADORES_DE_DIRETORIO.has(nome)) {
      tipoDoArgumento = 'criacao';
    }

    const registrar = (token, tipo) => {
      alvos.push({ comando: rotuloDoComando, token, caminho: resolve(dir, token), tipo });
    };

    const args = []; // argumentos-caminho, na ordem: quem decide o papel deles é a aridade
    let redir = false;
    let emExpressaoDoFind = false;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === '>' || t === '>>') { redir = true; continue; }
      // `<` e `<<` LEEM. O token seguinte é a FONTE (ou o delimitador do heredoc), nunca alvo —
      // sem esta linha, `tee f.md < entrada.md` trataria `entrada.md` como escrita.
      if (t === '<' || t === '<<') { i += 1; continue; }
      if (redir) { registrar(t, 'redirecao'); redir = false; continue; }
      const saida = opcaoQueEscreve(t, tokens[i + 1]);
      if (saida) { registrar(saida.valor, 'opcao'); i += saida.consumiu; continue; }
      if (i === 0) continue; // o comando não é caminho
      if (t.startsWith('-')) { emExpressaoDoFind = true; continue; } // opção não é caminho
      // `find [caminhos…] [expressão]`: depois do primeiro `-algo`, todo argumento pertence à
      // EXPRESSÃO, e ali um caminho é referência de leitura, não raiz de busca. Sondado: `find src
      // -name "*.ts" -newer .claude/hooks/kit.mjs` negava por causa do arquivo de referência do
      // `-newer`. A gramática do find é dele; para os demais comandos, argumento depois de opção
      // continua sendo caminho (`rm -rf x`).
      if (emExpressaoDoFind && nome === 'find') continue;
      args.push(t);
    }

    // A ARIDADE, aplicada na ORDEM em que o usuário escreveu: o último argumento de quem copia é
    // o destino; os demais são o que o comando faz com eles (origem de `mv` é árvore, origem de
    // `cp` é leitura livre). A ordem importa para a mensagem — nega-se pelo primeiro alvo que
    // esbarra num caminho protegido, e ele deve ser o que o leitor vê primeiro no comando.
    const iDestino = COPIADORES.has(nome) && args.length > 0 ? args.length - 1 : -1;
    args.forEach((a, k) => {
      const tipo = k === iDestino ? 'destino' : tipoDoArgumento;
      if (tipo) registrar(a, tipo);
    });
  }

  return alvos;
}

/**
 * O segmento significa "tudo que está neste diretório"? Só o glob que é o segmento INTEIRO conta:
 * `*`, `**`, `?`, `.*`.
 *
 * A restrição é o que separa esta regra de um falso positivo diário. `rm *.log`, `rm build-*` e
 * `mv relatorio-*.md outputs/` nomeiam um SUBCONJUNTO do diretório, e a trava não tem como saber
 * qual — tratá-los como "tudo que está aqui" negaria limpeza de arquivo temporário na raiz do
 * projeto todo santo dia. `*` sozinho não tem essa ambiguidade: ele é o diretório inteiro.
 *
 * O ponto inicial entra porque `.*` é o idioma de "todos os ocultos", e na raiz do projeto os
 * ocultos incluem `.claude/` e `.git/`. Custo: `rm .*` na raiz passa a ser negado — resposta certa.
 *
 * O regex é UM só, e isso é de propósito. A versão anterior eram dois testes em série (`^[.*?]+$`
 * e `[*?]`), e o segundo era inalcançável — `rel` chega normalizado, e `norm` já comeu os
 * segmentos `.` e `..`. Mutação sobre ele sobrevivia. Num regex único, tirar qualquer pedaço
 * derruba um teste: `*` e `.*` negam, `*.log` e `.` não.
 *
 * O GLOB PARCIAL não é desta função: ele não é "tudo que está aqui", e sim um padrão que pode casar
 * um caminho protegido específico. Quem responde por ele é `protegidosCasadosPorGlob`, abaixo.
 */
function ehSegmentoTudo(seg) {
  return /^\.*[*?][.*?]*$/.test(seg);
}

/** O texto tem metacaractere de glob do shell? `*`, `?` e a classe `[...]`. */
const RE_GLOB = /[*?[]/;

/**
 * Um segmento de glob vira regex de segmento: `*` → qualquer sequência sem `/`, `?` → um caractere,
 * `[...]`/`[!...]` → classe; o resto é literal. Sem caixa, como toda comparação de caminho do kit.
 *
 * O PONTO INICIAL segue o bash: padrão que não começa com `.` não casa nome oculto. Sem isso,
 * `rm -f build-*\/x` e `*\/*.tmp` passariam a alcançar `.git` e `.claude` — falso positivo que o shell
 * não teria, porque ele mesmo não expandiria o glob para lá.
 */
function casaSegmentoGlob(padrao, nome) {
  if (!RE_GLOB.test(padrao)) return padrao.toLowerCase() === nome.toLowerCase();
  if (nome.startsWith('.') && !padrao.startsWith('.')) return false;
  let re = '';
  for (let i = 0; i < padrao.length; i++) {
    const c = padrao[i];
    if (c === '*') { re += '.*'; continue; }
    if (c === '?') { re += '.'; continue; }
    if (c === '[') {
      const fim = padrao.indexOf(']', i + 2);
      if (fim !== -1) {
        const classe = padrao.slice(i + 1, fim).replace(/^!/, '^').replace(/[\\\]]/g, '\\$&');
        re += `[${classe}]`;
        i = fim;
        continue;
      }
    }
    re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i').test(nome);
}

/**
 * Os caminhos protegidos que um GLOB alcança, por correspondência de padrão — não por nome literal.
 *
 * O BYPASS QUE ISTO FECHA foi reproduzido: `rm harness-zona*` era lido como o nome `harness-zona*`,
 * que não é protegido, e o shell o expandia para o manifesto. Com o manifesto fora do disco e
 * `touch .harness-template`, a zona imutável abria num clone (Decisão 67). Tratar todo glob parcial
 * como "o diretório inteiro" negaria limpeza de temporário todo dia (ver `ehSegmentoTudo`); casar o
 * padrão contra a lista FECHADA do que é protegido não tem esse custo — `rm *.log` não casa nada.
 *
 * Os candidatos são as raízes protegidas do kit (`protegidosContidosEm('')` devolve todas: a zona,
 * o manifesto dentro dela, o Explore e o `.git/`) mais o marcador do template. Três relações:
 *   - `nomeia`: o padrão tem o tamanho do candidato e casa segmento a segmento (`harness-zona*`);
 *   - `nomeia` também quando o padrão DESCE abaixo de um candidato-diretório (`.cl?ude/hooks/x`): o
 *     caminho devolvido é o candidato seguido do resto do padrão, e a pergunta `protegido()` sobre
 *     ele responde pelo prefixo;
 *   - `contem`: o padrão é mais curto e casa um ANCESTRAL do candidato (`.cl*` alcança `.claude/`).
 *     Só destrói quem trata o diretório como árvore — o chamador decide pelo `tipo` do alvo.
 *
 * A decisão continua sendo do `protegido()`: esta função só traduz o padrão em caminhos concretos.
 */
function protegidosCasadosPorGlob(rel) {
  if (!RE_GLOB.test(rel)) return [];
  const p = rel.split(/[\\/]/).filter(Boolean);
  const achados = [];
  for (const candidato of [...protegidosContidosEm(''), MARCADOR_TEMPLATE]) {
    const ehDiretorio = candidato.endsWith('/');
    const c = candidato.split('/').filter(Boolean);
    const n = Math.min(p.length, c.length);
    let casa = true;
    for (let i = 0; i < n && casa; i++) casa = casaSegmentoGlob(p[i], c[i]);
    if (!casa) continue;
    if (p.length === c.length) achados.push({ caminho: c.join('/'), relacao: 'nomeia' });
    else if (p.length > c.length) {
      if (ehDiretorio) achados.push({ caminho: [...c, ...p.slice(c.length)].join('/'), relacao: 'nomeia' });
    } else achados.push({ caminho: c.join('/'), relacao: 'contem' });
  }
  return achados;
}

/**
 * O diretório cuja árvore inteira o alvo alcança, ou `null` se ele não alcança árvore nenhuma.
 *
 * Duas portas, e a primeira NÃO depende do comando:
 *
 *   1. GLOB. Um segmento que é só `*` nomeia tudo que está no diretório-pai, então o alvo da
 *      contenção passa a ser esse pai. Isto não é afirmação sobre o comando, é sobre o TOKEN.
 *      Fecha de uma vez a família que passava inteira: `sed -i 's/a/b/' *`, `truncate -s 0 *` e
 *      `shred *` na raiz do projeto.
 *   2. DIRETÓRIO NOMEADO, só para quem trata o diretório como árvore (`ARVORE_INTEIRA`, via o
 *      `tipo` do alvo).
 *
 * O DESTINO NÃO ALCANÇA ÁRVORE, e é a metade que impede a contenção de virar "nega tudo":
 * escrever DENTRO de um diretório não destrói o que está lá. É o que faz `cp relatorio.md .` e
 * `mv relatorio.md outputs/` passarem — operação legítima e diária.
 *
 * O glob vem primeiro porque é mais preciso: em `rm -rf .claude/*` o alvo da contenção é
 * `.claude`, não a raiz.
 */
function arvoreAlcancada(alvo, rel) {
  if (alvo.tipo === 'destino') return null;
  // Barra invertida também parte segmento: o `rel` vem de dois resolvedores diferentes, e um deles
  // pode entregar caminho ainda no formato do Windows. `protegidosContidosEm` normaliza o que
  // sobra; aqui a divisão precisa estar certa antes disso.
  const segmentos = rel === '' ? [] : rel.split(/[\\/]/);
  const i = segmentos.findIndex(ehSegmentoTudo);
  if (i !== -1) return segmentos.slice(0, i).join('/');
  return alvo.tipo === 'arvore' ? rel : null;
}

/**
 * O que o consultor faz agora, em cada um dos três casos.
 *
 * `contencao` é `null` quando o alvo NOMEIA o caminho protegido, e `{arvore, contido}` quando ele
 * apenas o contém. A mensagem mostra a ÁRVORE, não o token: em `rm -rf *` a árvore alcançada é o
 * diretório em vigor, e escrever "a árvore de `*`" mandaria o leitor procurar um diretório
 * chamado `*`.
 *
 * O VERBO É "ESCREVE", e não "toca", porque agora só chega aqui quem escreve. A versão anterior
 * dizia "`done` toca `outputs/explore/gaps.md`" e "`qual ?` alcança tudo que está em `.`" —
 * nomeando como comando uma palavra-chave de shell e uma palavra de prosa dentro de um heredoc.
 *
 * Quem chega com `zona-imutavel` ou `marcador-template` é sempre um clone: no template esses dois
 * rótulos nem são devolvidos pelo `protegido` (Decisão 67).
 */
function montarMotivo(alvo, rel, rotulo, contencao) {
  // A raiz do projeto relativiza para `''`, e uma mensagem que mostra string vazia é muda.
  const nomear = (p) => (p === '' ? '.' : p);
  const contido = contencao && contencao.contido;
  const oQueFaz = contencao && contencao.glob
    ? `\`${alvo.comando} ${alvo.token}\` é um padrão (glob) que o shell expande, e ele alcança ` +
      `\`${contido}\``
    : contencao
    ? `\`${alvo.comando} ${alvo.token}\` alcança tudo que está em \`${nomear(contencao.arvore)}\`, ` +
      `e lá dentro está \`${contido}\``
    : alvo.tipo === 'redirecao'
      ? `A redireção de \`${alvo.comando}\` escreve em \`${nomear(rel)}\``
      : `\`${alvo.comando}\` escreve em \`${nomear(rel)}\``;

  // Destruir uma árvore que contém caminho protegido é destruir o caminho protegido. Quem caiu
  // aqui quase nunca queria o protegido: a saída é estreitar o alvo, e ela vem antes das demais.
  const saidaDaContencao = contencao
    ? ['', '**Aponte o comando para o alvo exato**, em vez do diretório inteiro — qualquer alvo ' +
        `que não inclua \`${contido}\` passa direto.`]
    : [];

  if (rotulo === 'catastrofe') {
    return [
      `${oQueFaz}, que é o **histórico do repositório**.`,
      ...saidaDaContencao,
      '',
      'Perder o `.git/` é o acidente irreversível deste projeto: não existe cópia de onde ' +
      'restaurar, nem commit anterior para voltar — o histórico É o que se perdeu.',
      '',
      'Se a intenção era destravar um `index.lock` de um git interrompido, ou refazer o ' +
      'repositório do zero, faça isso **pelo terminal**, fora do agente, olhando o que vai apagar.',
    ].join('\n');
  }

  if (rotulo === 'zona-imutavel') {
    return [
      `${oQueFaz}, que está na **zona imutável** do template.`,
      ...saidaDaContencao,
      '',
      'Para **ler** o arquivo, use a tool Read — ela não passa por esta trava.',
      '',
      ...paragrafoDoMaquinario(),
    ].join('\n');
  }

  if (rotulo === 'marcador-template') {
    return [`${oQueFaz}, que é o **marcador do template**.`, '', ...paragrafoDoMarcador()].join('\n');
  }

  return [
    contencao
      ? `${oQueFaz}, que foi **congelado** na conclusão do \`spec-product\`.`
      : `${oQueFaz}, em \`${RAIZ_EXPLORE}/\`, que foi **congelado** na conclusão do \`spec-product\`.`,
    ...saidaDaContencao,
    '',
    'O pré-projeto virou histórico versionado. A versão que manda agora é a de `outputs/spec/`.',
    '',
    'Para **ler**, use a tool Read. **Aprofundamento** vai para `outputs/spec/`; **virada de ' +
    'escopo** vai para `spec-scope-change`.',
    '',
    `Quem registra o congelamento é \`${MARCADOR_CONGELAMENTO}\`. Se ele foi criado por engano, ` +
    'ou se o Explore precisa mesmo ser reaberto, **remova esse arquivo** — a escrita volta a ser ' +
    'aceita na hora.',
  ].join('\n');
}

/**
 * Os fragmentos do TEXTO CRU que podem ser caminho, sem repetição.
 *
 * Só roda quando a leitura do comando se sabe quebrada (ver A ASPA QUE NÃO FECHA, no topo). O
 * corte é pelos caracteres que NÃO podem estar dentro de um caminho num comando de shell:
 * espaço, aspa, crase, `;`, `|`, `&`, `<`, `>`, parêntese, colchete, chave, `=` e vírgula.
 *
 * EXTRAÇÃO GENEROSA É SEGURA, e é por isso que ela erra para o lado de sobrar: quem decide é o
 * `protegido()`, que devolve `null` para o que não é protegido. Um fragmento a mais custa uma
 * chamada de função pura; um fragmento a MENOS custa o bypass. Por isso `=` corta (`--output=
 * CLAUDE.md` vira dois fragmentos) e `:` NÃO corta (`C:/repo/CLAUDE.md` tem que continuar inteiro,
 * senão vira `C` e um absoluto de outra unidade).
 *
 * O `*` também não corta, e isso é medido, não esquecimento: `.claude/hooks/*` já casa a zona
 * imutável por prefixo, então cortar não ganharia nada — e `.claude/*` continuaria de fora, que é
 * o resíduo de contenção declarado no topo.
 */
function fragmentosDeCaminho(texto) {
  const bruto = String(texto == null ? '' : texto);
  return [...new Set(bruto.split(/[\s"'`;|&<>()[\]{}=,]+/).filter(Boolean))];
}

/**
 * A mensagem da ASPA QUE NÃO FECHA, e ela é a diferença desta rodada para as anteriores.
 *
 * O falso positivo aceito é `echo it's in .claude/hooks`. O consultor vê isso negado e NÃO vai
 * adivinhar que o problema é a aspa — sem essa mensagem ele fica olhando para um `echo`. Então a
 * mensagem diz, nesta ordem: (1) a aspa não fecha; (2) por isso o resto não pôde ser lido; (3)
 * qual caminho protegido apareceu no texto; (4) feche a aspa. É o oposto do caso da rodada S, em
 * que o comando estava certo e não havia o que corrigir.
 *
 * As três frases de rótulo repetem prosa do `montarMotivo`, e isso é deliberado: o que não pode
 * ter duas cópias é a NOÇÃO de protegido — e ela não está aqui, está no `protegido()` injetado.
 * O que se diz ao consultor sobre `.git/` é o mesmo nos dois lugares porque é a mesma verdade.
 */
function montarMotivoDaAspa(rel, rotulo) {
  const oQueE = rotulo === 'catastrofe'
    ? 'o **histórico do repositório**'
    : rotulo === 'zona-imutavel'
      ? 'a **zona imutável** do template'
      : rotulo === 'marcador-template'
        ? 'o **marcador do template**'
        : `parte de \`${RAIZ_EXPLORE}/\`, **congelado** na conclusão do \`spec-product\``;

  return [
    'Este comando tem uma **aspa que não fecha**, e por isso o resto dele não pôde ser lido com ' +
    'segurança: a partir da aspa aberta tudo vira um texto só, e a trava deixa de enxergar o que ' +
    'o comando escreve.',
    '',
    `E o texto menciona \`${rel}\`, que é ${oQueE}. Com a leitura quebrada não dá para saber se ` +
    'isso é menção ou escrita, e a resposta segura é parar.',
    '',
    '**Feche a aspa e mande o comando de novo.** Se ele só mencionava o caminho, passa direto — ' +
    'menção é livre nesta trava; o que se nega é posição de escrita.',
    '',
    'As duas causas, e as duas têm saída de uma linha:',
    '',
    '- **Apóstrofo em texto comum** (`echo it\'s ok`) — o `\'` abre aspa e nunca fecha. Ponha ' +
    'aspas duplas por fora: `echo "it\'s ok"`.',
    '- **Aspa escapada com `\\`** (`echo "a\\"b"`) — aqui o `\\` **não é escape**, é separador de ' +
    'caminho do Windows, por decisão registrada em `workspace.mjs`. Use aspas simples por fora ' +
    '(`echo \'a"b\'`) ou parta o comando em dois.',
  ].join('\n');
}

/**
 * A rede de baixo: o comando cuja leitura se sabe quebrada menciona caminho protegido?
 *
 * Recebe o MESMO `protegido()` e o MESMO resolvedor de caminho que o laço de alvos usa. Isso não
 * é economia de linha: é o que faz esta regra e o resto da trava responderem igual sobre o mesmo
 * caminho — inclusive sobre o congelamento, que depende de disco e é memoizado lá em cima.
 */
function avaliarAspaAberta(comando, protegido, raiz, paraRelativo) {
  if (!segmentarComando(comando, raiz).aspasAbertas) return null;

  for (const fragmento of fragmentosDeCaminho(comando)) {
    const rel = relativoOuNulo(paraRelativo, raiz, resolve(raiz, fragmento));
    if (rel === null) continue; // fora do projeto: o harness não governa o disco inteiro
    const rotulo = protegido(rel);
    if (rotulo) return { acao: 'deny', motivo: montarMotivoDaAspa(rel, rotulo) };
  }
  return null;
}

/**
 * O comando pode rodar? `null` libera; `{acao:'deny', motivo}` nega.
 *
 * `protegido(rel)` devolve o rótulo da proteção (`'catastrofe'`, `'zona-imutavel'`,
 * `'congelamento'`) ou `null`. É por ela que o congelamento — que depende de disco — entra sem que
 * o núcleo leia disco; mesmo desenho do `criarRegistro(io)`.
 *
 * "Sou o template?" (Decisões 40 e 67) não entra aqui: ela decide se a zona é protegida, então
 * mora dentro do `protegido` que o `avaliar` monta.
 *
 * A REGRA, por alvo: todo alvo que chega aqui está em POSIÇÃO DE ESCRITA (ver `alvosDoComando`),
 * e um caminho protegido em posição de escrita é negado. Não há mais "mas este comando só lê" —
 * quem só lê nem produziu alvo.
 *
 * DEPOIS DE NOMEAR, CONTER. Um alvo que não é caminho protegido ainda pode CONTÊ-LO, e aí destruir
 * a árvore é destruir o protegido. A contenção não pergunta nada novo: ela pega os caminhos
 * protegidos que estão dentro do alvo (`protegidosContidosEm`, kit.mjs) e REPERGUNTA a mesma
 * `protegido()` sobre cada um. É isso que faz `rm -rf outputs` negar quando o Explore está
 * congelado e liberar quando não está, sem que esta função saiba o que é congelamento.
 */
export function avaliarComando(comando, protegido, opts = {}) {
  const raiz = opts.raiz || RAIZ_NEUTRA;
  const paraRelativo = opts.relativizar || relativizar;

  for (const alvo of alvosDoComando(comando, { raiz })) {
    const rel = relativoOuNulo(paraRelativo, raiz, alvo.caminho);
    if (rel === null) continue; // fora do projeto: o harness não governa o disco inteiro

    const rotulo = protegido(rel); // o alvo NOMEIA um caminho protegido?
    // `mkdir` só escreve a chave: criar diretório no resto da zona continua livre (ver
    // `CRIADORES_DE_DIRETORIO`). Por isso ele não segue para glob nem contenção.
    if (alvo.tipo === 'criacao') {
      if (rotulo === 'marcador-template') return { acao: 'deny', motivo: montarMotivo(alvo, rel, rotulo, null) };
      continue;
    }
    if (rotulo) return { acao: 'deny', motivo: montarMotivo(alvo, rel, rotulo, null) };

    // ...ou é um GLOB que o shell expande para um caminho protegido? `contem` só vale para quem
    // trata o diretório como árvore, pela mesma razão de `arvoreAlcancada`.
    for (const { caminho, relacao } of protegidosCasadosPorGlob(rel)) {
      if (relacao === 'contem' && alvo.tipo !== 'arvore') continue;
      const rotuloGlob = protegido(caminho);
      if (rotuloGlob) {
        return {
          acao: 'deny',
          motivo: montarMotivo(alvo, rel, rotuloGlob, { arvore: rel, contido: caminho, glob: true }),
        };
      }
    }

    const arvore = arvoreAlcancada(alvo, rel); // ...ou CONTÉM um?
    if (arvore === null) continue;
    for (const contido of protegidosContidosEm(arvore)) {
      const rotuloContido = protegido(contido);
      if (rotuloContido) {
        return {
          acao: 'deny',
          motivo: montarMotivo(alvo, rel, rotuloContido, { arvore, contido }),
        };
      }
    }
  }

  // A ASPA QUE NÃO FECHA vem DEPOIS do laço, e a ordem é o que a impede de roubar decisão: quando
  // o comando é legível, quem decide é quem já decidia, com a mensagem específica que nomeia o
  // comando e o alvo. Esta regra só fala quando não há alvo para olhar. E o `segmentarComando`
  // extra só é pago por comando que chegou até aqui sem nenhuma negação.
  return avaliarAspaAberta(comando, protegido, raiz, paraRelativo);
}

/**
 * O caminho relativo à raiz, `''` para a PRÓPRIA raiz e `null` para fora do projeto.
 *
 * OS DOIS RESOLVEDORES DISCORDAM SOBRE A RAIZ, e isso foi medido, não deduzido: o `relativizar`
 * textual do kit devolve `''` para ela; o `relativizarComRecuo` que o `IO_REAL` usa devolve
 * `null` — ele sobe de ancestral em ancestral procurando a raiz, e a raiz nunca é ancestral de si
 * mesma. `IO_REAL.relativizar(raiz, raiz) === null`, verificado executando.
 *
 * Sem esta reconciliação, a contenção da raiz (`rm -rf .`, `mv . ../outro`) ficaria VERDE nos
 * testes — que injetam o resolvedor textual — e MORTA em produção. Que é o pior resultado
 * possível: uma trava que o teste diz existir e que não existe onde ela roda.
 *
 * A segunda pergunta é textual e pura de propósito. "Este caminho é a raiz?" não é a pergunta de
 * alias do Windows que motivou a resolução por identidade — a raiz é o `io.cwd()` do próprio
 * processo, e o alvo veio de `resolve(dir, token)` sobre ela. Um alias da raiz (`\\?\C:\repo`)
 * continua escapando, exatamente como escapava antes desta rodada; não pioramos nada.
 */
function relativoOuNulo(paraRelativo, raiz, caminho) {
  const rel = paraRelativo(raiz, caminho);
  if (rel != null) return rel;
  return relativizar(raiz, caminho) === '' ? '' : null;
}

// ————————————————————————————— casca de I/O —————————————————————————————

/**
 * As duas perguntas de disco da zona imutável, memoizadas por comando: "sou o template?" (Decisões
 * 40 e 67) e "qual é o manifesto?" (para a extensão do projeto). Um dono só para as travas do
 * `Bash` e do `PowerShell` — duas cópias do memo divergiriam no custo, e o custo é o que os testes
 * de "o allow não paga a detecção" prendem.
 *
 * As duas são PREGUIÇOSAS: só são feitas quando um caminho da zona já ia ser negado. `io` sem
 * `ehTemplate` é clone; `io` sem `manifestoDaZona` não tem extensão — os dois lados que negam.
 */
function criarPerguntasDaZona(raiz, io) {
  let template = null; // memo: `null` = ainda não perguntei
  let manifesto; // memo: `undefined` = ainda não perguntei
  const ehTemplate = () => {
    if (template === null) template = typeof io.ehTemplate === 'function' ? !!io.ehTemplate(raiz) : false;
    return template;
  };
  const ehExtensao = (rel) => {
    if (manifesto === undefined) {
      manifesto = typeof io.manifestoDaZona === 'function' ? io.manifestoDaZona(raiz) : null;
    }
    return ehExtensaoDoProjeto(rel, manifesto);
  };
  return { ehTemplate, ehExtensao };
}

/**
 * Veredito sobre um payload de `Bash`. `io` é o MESMO objeto que o `criarRegistro` do
 * `pretooluse.mjs` monta — `cwd()`, `relativizar(raiz, bruto)`, `exploreCongelado(raiz)`,
 * `ehTemplate(raiz)` e `lerDiretorio` — de propósito: duas cascas de I/O para a mesma pergunta
 * divergiriam, e uma trava passaria a responder diferente da outra sobre o mesmo caminho.
 *
 * `ehTemplate` É OPCIONAL, e a ausência dele vale `false`: um `io` que não sabe responder é um
 * clone, e o clone é o lado que nega. Desde a Decisão 67 a resposta não escolhe mais redação:
 * no template a zona imutável e o marcador deixam de ser protegidos.
 *
 * A ORDEM DAS QUATRO PERGUNTAS é por custo: destruição catastrófica e zona imutável são puras, e o
 * `podeSerDoExplore` também. Só depois delas vem disco — a resolução da raiz dos artefatos (um
 * `lerDiretorio` do `cwd`, mais dois `existsSync` por subpasta candidata, mais uma varredura de
 * `<cwd>/outputs/explore` quando existe candidata) e o `exploreCongelado` (um `stat`)
 * —, cada um no máximo uma vez por comando, por causa dos dois memos. Um comando que não fala do
 * Explore não paga disco nenhum, e é isso que os testes de wiring prendem.
 *
 * O `ehTemplate` SÓ É PERGUNTADO quando um alvo cai na zona imutável ou é o marcador, e no máximo
 * uma vez por comando (memo). Comando sem alvo protegido, e comando negado por outro rótulo, pagam
 * zero. O teste "o allow não paga a detecção" é quem prende isso.
 *
 * ————————————————— A RAIZ DOS ARTEFATOS NÃO É A CWD (Task 4b) —————————————————
 *
 * Esta trava perguntava `ehDoExplore(rel)` sobre o caminho relativo à `cwd` e
 * `io.exploreCongelado(io.cwd())`. Num workspace MULTI-REPO — o layout que a rule do Explore trata
 * como normal, sendo o `workspace.md` o primeiro artefato que ela manda criar — os artefatos moram
 * em `<repo de docs>/outputs/`, o alvo chega como `portal-docs/outputs/explore/gaps.md`, e o
 * `ehDoExplore` é ancorado em PREFIXO: respondia `false`, e a trava LIBERAVA `sed -i`, `echo >`,
 * `rm -rf` e `mv` sobre um Explore congelado. Medido executando, antes e depois.
 *
 * Não é canto exótico: é a trava do congelamento que PAGA a dispensa de frescor da Decisão 22 —
 * forjar o marcador desliga a exigência de `revisao.json` fresco e liga a proibição de escrita no
 * Explore. Enquanto esta trava era cega, essa troca valia para `Write`/`Edit` e não para `Bash`, e
 * o modelo de ameaça deste projeto põe o shell como o vetor ALTO, não o baixo.
 *
 * O `criarResolvedorDeArtefatos` (workspace.mjs) é o MESMO mecanismo que a trava `congelamento` usa,
 * e por baixo dele está o `descobrirWorkspace`, que o `fecho-explore`, o `cadeia` e o
 * `delivery-gate` já consultavam. Uma segunda noção de "raiz dos artefatos" divergiria das outras,
 * e travas divergindo sobre onde é o projeto é a família de defeito que esta série vem fechando.
 *
 * QUEM NEGA CONTINUA SENDO O `ehDoExplore`, sobre o caminho já relativo à raiz certa. O
 * `podeSerDoExplore` é só o pré-filtro puro que autoriza gastar disco — um `true` dele não nega
 * nada. Em mono-repo o resolvedor devolve o `rel` intacto, então o veredito não muda: há muitos
 * testes verdes sobre esse layout, e nenhum deles se move.
 *
 * A MENSAGEM CONTINUA CITANDO O CAMINHO RELATIVO À `cwd`, e isso é escolha. A trava do
 * `congelamento` cita o caminho relativo à raiz dos artefatos porque o `file_path` de uma tool de
 * escrita é absoluto e o consultor não o digitou; aqui ele DIGITOU
 * `sed -i … portal-docs/outputs/explore/gaps.md`, e a mensagem tem que ecoar o comando dele.
 *
 * ————————————————— FALHA FECHADO, E POR QUE A DECISÃO SAI DEPOIS DO LAÇO —————————————————
 *
 * Raiz indeterminada (`ambiguo`, `cwd-ilegivel`) NEGA: um bloqueante que não sabe onde olhar não
 * pode liberar, porque "não sei" seria lido como "não está congelado". A mensagem é a do
 * `avaliarRaizIndeterminada` (zonas.mjs), a mesma que a trava `congelamento` devolve — um dono só
 * para a redação desse fato.
 *
 * `protegido` não pode devolvê-la, porque o contrato dele é rótulo-ou-`null` e o rótulo não carrega
 * `motivo` nem `detalhe`. Então ele ANOTA a indeterminação e responde `null`, e a negação sai depois
 * do `avaliarComando` — pela mesma razão que a regra da aspa também sai depois dele: quando existe
 * um deny mais específico (a zona imutável, o `.git/`), é ELE o acionável. Anotado e não negado
 * nunca vira `allow`: se o laço não negou, esta função nega.
 *
 * Se `exploreCongelado` ou `lerDiretorio` lançarem, a exceção SOBE — o `descobrirWorkspace` só
 * converte ausência do `cwd` em "mono-repo", e qualquer outro erro dele vira `cwd-ilegivel`. Esta
 * trava é bloqueante e o `despachar` transforma exceção de bloqueante em deny.
 */
export function avaliar(payload, io) {
  const input = (payload && payload.tool_input) || {};
  const comando = input.command;
  if (!comando) return null;

  const raiz = io.cwd();
  const paraArtefatos = criarResolvedorDeArtefatos(raiz, io);
  let congelado = null; // memo: `null` = ainda não perguntei
  let indeterminada = null; // a PRIMEIRA raiz indeterminada que apareceu, e o alvo que a provocou
  const { ehTemplate, ehExtensao } = criarPerguntasDaZona(raiz, io);

  const protegido = (rel) => {
    if (ehDestruicaoCatastrofica(rel)) return 'catastrofe';
    if (ehZonaImutavel(rel)) return ehTemplate() || ehExtensao(rel) ? null : 'zona-imutavel';
    if (ehMarcadorDoTemplate(rel)) return ehTemplate() ? null : 'marcador-template';
    if (!podeSerDoExplore(rel)) return null;
    const artefatos = paraArtefatos(rel);
    if (artefatos.motivo) {
      if (!indeterminada) indeterminada = { rel, motivo: artefatos.motivo, detalhe: artefatos.detalhe };
      return null;
    }
    // `rel` nulo é caminho FORA do repo de docs (o irmão de código, em multi-repo) e `''` é o
    // PRÓPRIO repo de docs, que não nomeia arquivo: nenhum dos dois é do Explore de ninguém, e o
    // `ehDoExplore` nem chega a ser perguntado. Quem discrimina os dois é o dono do contrato
    // (`ehCaminhoSobRaizDeArtefatos`, workspace.mjs), e não um teste de falsidade sobre string
    // repetido aqui e na trava `congelamento` — repetido, ele divergiria.
    if (!ehCaminhoSobRaizDeArtefatos(artefatos) || !ehDoExplore(artefatos.rel)) return null;
    if (congelado === null) congelado = !!io.exploreCongelado(artefatos.raiz);
    return congelado ? 'congelamento' : null;
  };

  const veredito = avaliarComando(comando, protegido, {
    raiz,
    relativizar: io.relativizar,
  });
  if (veredito) return veredito;
  if (indeterminada) {
    return avaliarRaizIndeterminada(indeterminada.rel, indeterminada.motivo, indeterminada.detalhe);
  }
  return null;
}

// ————————————————————————————— a tool PowerShell —————————————————————————————
//
// O Claude Code no Windows tem uma tool `PowerShell` além da `Bash`, e ela escapava de TODA trava:
// o despachante só entregava o comando a esta trava quando a tool era `Bash`. `Remove-Item
// harness-zona.lock.json` e `New-Item .harness-template` passavam, e com eles a chave do template.
//
// ————————————————— A REGRA GROSSA, E POR QUE ELA SAIU —————————————————
//
// A primeira versão desta trava era mais grossa que a do Bash, de propósito: VERBO DE ESCRITA EM
// QUALQUER PONTO DO COMANDO + CAMINHO DA ZONA EM QUALQUER PONTO = nega. A razão registrada era não
// reimplementar a gramática do PowerShell. O preço apareceu num CLONE — no template a trava abre pelo
// marcador (Decisão 67), e por isso ninguém viu: `New-Item -ItemType Directory -Force outputs/x;
// node .claude/skills/<skill>/cli.mjs …` negava pelo `cli.mjs` da skill, `node --test .claude/hooks/
// 2>&1 | Out-File outputs/t.txt` negava pela pasta dos testes, `Copy-Item <template da skill>
// outputs/…` negava pela ORIGEM da cópia, e `git commit -m 'copy CLAUDE.md'` negava pelo `copy`
// dentro da mensagem. É o fluxo diário das skills, e sob o modelo de ameaça desta trava falso
// positivo diário é pior que bypass exótico (ver o topo deste arquivo).
//
// **AGORA CONTA O ALVO, POR INSTRUÇÃO** — a mesma inversão que o Bash fez ("menção é livre, nega-se
// em posição de escrita"), com a gramática mínima do PowerShell que ela pede:
//
//   1. O comando é partido em INSTRUÇÕES (`;`, `&&`, `||`, quebra de linha) e cada instrução em
//      ESTÁGIOS de pipeline (`|`), sempre fora de aspas e na profundidade 0 de `()`/`{}`. Um `;`
//      dentro de `ForEach-Object { … }` não separa: o bloco é lido como lista de instruções própria,
//      e avaliado também — `if ($?) { Remove-Item CLAUDE.md }` executa. Ver `lerPowerShell`.
//   2. Em cada estágio só o verbo de escrita DAQUELE estágio e os argumentos DELE contam, ligados
//      pela gramática do cmdlet (`ALVOS_POWERSHELL`): parâmetro nomeado, posição, `-Param:valor`,
//      lista com vírgula. `node`, `python`, `git`, `Select-String` não escrevem, e o que eles citam
//      é livre.
//   3. `Copy-Item`: a origem é leitura; conta o destino — e o destino somado ao nome da origem,
//      porque `Copy-Item outputs/CLAUDE.md .` escreve `./CLAUDE.md`. `Move-Item` e `Rename-Item`
//      contam a origem (some de onde estava, e por isso vale a contenção) e o destino.
//   4. PIPELINE QUE ALIMENTA QUEM DESTRÓI. Em PowerShell o pipe carrega o OBJETO: `Get-ChildItem
//      .claude/hooks | Remove-Item` apaga a zona sem que o estágio do verbo cite caminho nenhum.
//      Quando um estágio destrói (remove, move, renomeia, `.Delete()`, `[IO.File]::Delete`) ou
//      escreve num alvo que veio do pipe (sem alvo próprio, ou `$_`), os caminhos de TODOS os
//      estágios contam, com contenção — é a regra grossa de antes, mantida só onde ela protege.
//      `Out-File`, `Tee-Object`, `Copy-Item` e todo escritor com alvo próprio contam só o alvo.
//   5. `Set-Location`/`cd`/`Push-Location`/`Pop-Location` com caminho literal são acompanhados: o
//      relativo e o glob das instruções seguintes resolvem a partir da pasta nova. Pasta que não dá
//      para resolver (variável desconhecida, `~`, `-`) devolve a base à raiz, como era antes.
//   6. A redireção (`>`, `>>`, `2>`…) conta só o alvo — e agora só fora de aspas.
//   7. VARIÁVEL ATRIBUÍDA NO MESMO COMANDO vale os caminhos que a atribuição citou (`$f =
//      '.claude/hooks/kit.mjs'; Remove-Item $f`), e `$PWD` vale a pasta em vigor. Sem isso, trocar a
//      regra grossa pela leitura de alvo abriria o caso mais comum de caminho em variável — que a
//      grossa pegava por acaso, porque o literal estava no comando.
//
// LEITURA QUEBRADA VOLTA À REGRA GROSSA (`avaliarGrosso`). Aspa, parêntese, chave ou here-string
// que não fecha dessincroniza a leitura, e aí não há alvo confiável para olhar — a mesma postura da
// ASPA QUE NÃO FECHA do Bash, no topo deste arquivo. O PowerShell nem executa um comando que não
// fecha, então o custo é negar comando que não rodaria.
//
// O ESCOPO É SÓ A CHAVE E O MAQUINÁRIO: nem congelamento do Explore nem `.git/` entram aqui. Os dois
// continuam cobertos pelas travas de `Write`/`Edit` e de `Bash`; a fresta que se fecha é a que
// destravava a zona inteira.
//
// O QUE NÃO PEGA, e está escrito para ninguém achar que pega: caminho MONTADO (`'CLAU' + 'DE.md'`;
// uma variável vale só pelos pedaços literais da atribuição), variável vinda de fora do comando,
// splatting (`Remove-Item @p`), `git` que reescreve a árvore (`git checkout -- <zona>`: a trava do
// Bash o pega, esta não), `bash -c '…'`, `node -e`, `-EncodedCommand`, `Invoke-WebRequest -OutFile`,
// e qualquer programa externo que escreva sozinho. É o mesmo modelo de ameaça do Bash: acidente e
// deriva, não adversário — e a garantia dos clones continua sendo o `verificar-zona.mjs` no PR.

/**
 * Verbos de escrita/remoção do PowerShell, com os aliases de fábrica. É a lista da REGRA GROSSA,
 * que só vale com a leitura quebrada (`avaliarGrosso`). A leitura por alvo usa `ALVOS_POWERSHELL`
 * pelo nome canônico, e todo nome desta lista tem de chegar lá por `ALIASES_POWERSHELL` — o teste
 * de paridade prende isso. `mkdir`/`md` entram porque diretório no lugar do marcador também é chave
 * (ver `CRIADORES_DE_DIRETORIO`).
 */
export const VERBOS_DE_ESCRITA_POWERSHELL = [
  'remove-item', 'ri', 'rm', 'rmdir', 'rd', 'del', 'erase',
  'move-item', 'mi', 'mv', 'move', 'rename-item', 'rni', 'ren',
  'new-item', 'ni', 'mkdir', 'md',
  'set-content', 'sc', 'add-content', 'ac', 'clear-content', 'clc', 'out-file', 'tee-object', 'tee',
  'copy-item', 'cpi', 'cp', 'copy', 'set-item', 'si',
];

/** Alias de fábrica → nome canônico do cmdlet. `mkdir`/`md` são a função que chama `New-Item`. */
export const ALIASES_POWERSHELL = {
  ri: 'remove-item', rm: 'remove-item', rmdir: 'remove-item', rd: 'remove-item', del: 'remove-item',
  erase: 'remove-item', mi: 'move-item', mv: 'move-item', move: 'move-item', rni: 'rename-item',
  ren: 'rename-item', ni: 'new-item', mkdir: 'new-item', md: 'new-item', sc: 'set-content',
  ac: 'add-content', clc: 'clear-content', tee: 'tee-object', cpi: 'copy-item', cp: 'copy-item',
  copy: 'copy-item', si: 'set-item',
};

/**
 * ONDE CADA VERBO ESCREVE — a gramática de alvo, pelo nome canônico. É o equivalente do
 * `COPIADORES`/`ARVORE_INTEIRA` do Bash para um shell de parâmetros nomeados.
 *
 *   - `posicionais`: os parâmetros que recebem argumento por POSIÇÃO, na ordem. Parâmetro dado pelo
 *     nome sai da fila, como no PowerShell (`Copy-Item -Path a b` liga `b` ao destino).
 *   - `papeis`: o que o valor de cada parâmetro é para a trava — `remove` (leva embora: vale a
 *     contenção), `origem` (Move/Rename: idem), `alvo` (escreve nele), `destino` (escreve nele ou
 *     dentro dele), `nome` (`-NewName`/`-Name`: nome relativo a outra pasta), `leitura` (só lê) e
 *     `valor` (consome o token seguinte e não é caminho).
 *   - `doPipe`: o alvo aceita vir do pipeline quando não é dado (`Get-ChildItem x | Remove-Item`).
 *     `Out-File` e `Tee-Object` recebem do pipe o CONTEÚDO, nunca o arquivo; `Copy-Item` recebe a
 *     origem, que é leitura.
 *
 * PARÂMETRO FORA DA TABELA É SWITCH: não consome o token seguinte. É o lado seguro — um switch lido
 * como parâmetro de valor comeria o caminho (`Remove-Item -Force CLAUDE.md` passaria). O custo é o
 * inverso: valor de parâmetro desconhecido vira posicional, e no pior caso um alvo a mais.
 */
export const ALVOS_POWERSHELL = {
  'remove-item': { posicionais: ['path'], papeis: { path: 'remove', literalpath: 'remove' }, doPipe: true },
  'move-item': {
    posicionais: ['path', 'destination'],
    papeis: { path: 'origem', literalpath: 'origem', destination: 'destino' },
    doPipe: true,
  },
  'rename-item': {
    posicionais: ['path', 'newname'], papeis: { path: 'origem', literalpath: 'origem', newname: 'nome' }, doPipe: true,
  },
  'copy-item': {
    posicionais: ['path', 'destination'],
    papeis: { path: 'leitura', literalpath: 'leitura', destination: 'destino' },
    doPipe: false,
  },
  'new-item': {
    posicionais: ['path'],
    papeis: { path: 'alvo', name: 'nome', itemtype: 'valor', type: 'valor', value: 'valor', target: 'valor' },
    doPipe: true,
  },
  'set-content': { posicionais: ['path', 'value'], papeis: { path: 'alvo', literalpath: 'alvo', value: 'valor' }, doPipe: true },
  'add-content': { posicionais: ['path', 'value'], papeis: { path: 'alvo', literalpath: 'alvo', value: 'valor' }, doPipe: true },
  'clear-content': { posicionais: ['path'], papeis: { path: 'alvo', literalpath: 'alvo' }, doPipe: true },
  'set-item': { posicionais: ['path', 'value'], papeis: { path: 'alvo', literalpath: 'alvo', value: 'valor' }, doPipe: true },
  'out-file': {
    posicionais: ['filepath', 'encoding'],
    papeis: { filepath: 'alvo', path: 'alvo', literalpath: 'alvo', width: 'valor', inputobject: 'valor' },
    doPipe: false,
  },
  'tee-object': {
    posicionais: ['filepath'],
    papeis: { filepath: 'alvo', path: 'alvo', literalpath: 'alvo', variable: 'valor', inputobject: 'valor' },
    doPipe: false,
  },
};

/** Os que levam a árvore embora: só eles fazem a CONTENÇÃO valer na regra grossa. */
const VERBOS_QUE_DESTROEM_ARVORE = new Set([
  'remove-item', 'ri', 'rm', 'rmdir', 'rd', 'del', 'erase', 'move-item', 'mi', 'mv', 'move',
  'rename-item', 'rni', 'ren',
]);

/** Os mesmos, pelo nome canônico — quem, num estágio de pipeline, contamina a pipeline inteira. */
const CANONICOS_QUE_DESTROEM = new Set(['remove-item', 'move-item', 'rename-item']);

/** Os papéis que são ESCRITA: um valor com um deles é alvo. */
const PAPEIS_DE_ALVO = new Set(['remove', 'origem', 'alvo', 'destino', 'nome']);

/**
 * Parâmetros que consomem o token seguinte em qualquer cmdlet, e cujo valor nunca é o alvo: filtros
 * e os parâmetros comuns. Sem eles na lista, `-Filter *.md` faria do `*.md` um posicional — e um
 * glob em posição de alvo casa `CLAUDE.md`.
 */
const PARAMETROS_COM_VALOR = new Set([
  'filter', 'include', 'exclude', 'stream', 'encoding', 'credential', 'tosession', 'fromsession',
  'stackname', 'depth', 'attributes', 'erroraction', 'warningaction', 'informationaction',
  'progressaction', 'errorvariable', 'warningvariable', 'informationvariable', 'outvariable',
  'outbuffer', 'pipelinevariable',
]);

/** Os switches conhecidos. Só servem para a abreviação desempatar (`-r` é `-Recurse`). */
const SWITCHES_POWERSHELL = new Set([
  'recurse', 'force', 'passthru', 'container', 'append', 'noclobber', 'nonewline', 'asbytestream',
  'whatif', 'confirm', 'verbose', 'debug',
]);

/** Apelidos de parâmetro que a abreviação por prefixo não alcança. */
const APELIDOS_DE_PARAMETRO = {
  ea: 'erroraction', ev: 'errorvariable', wa: 'warningaction', wv: 'warningvariable',
  infa: 'informationaction', iv: 'informationvariable', ov: 'outvariable', ob: 'outbuffer',
  pv: 'pipelinevariable', lp: 'literalpath', pspath: 'literalpath', fullname: 'literalpath',
};

/** Parâmetros cujo VALOR nunca é caminho de objeto, para quem varre a pipeline inteira (item 4). */
const VALOR_QUE_NAO_E_CAMINHO = new Set([
  'filter', 'include', 'exclude', 'pattern', 'value', 'encoding', 'itemtype', 'type', 'depth',
  'attributes',
]);

/** Quem LISTA objetos do disco. Sem caminho, a listagem é a pasta em vigor. */
const LISTADORES = new Set(['get-childitem', 'gci', 'ls', 'dir', 'get-item', 'gi']);
const GRAMATICA_DO_LISTADOR = {
  posicionais: ['path'], papeis: { path: 'lista', literalpath: 'lista', name: 'valor' }, doPipe: false,
};

/** Quem troca a pasta em vigor (item 5). */
const TROCA_DE_PASTA = new Set(['set-location', 'sl', 'cd', 'chdir', 'push-location', 'pushd']);
const VOLTA_DE_PASTA = new Set(['pop-location', 'popd']);
const GRAMATICA_DA_PASTA = { posicionais: ['path'], papeis: { path: 'lugar', literalpath: 'lugar' }, doPipe: false };

/**
 * Quem recebe OUTRO COMANDO em texto: `cmd /c del CLAUDE.md` negava pela regra grossa (o `del`
 * solto no meio), e sem reler o texto a leitura por alvo o perderia. A sintaxe de `del`, `copy`,
 * `move`, `ren`, `rd` e `md` do `cmd` cabe na mesma gramática — são aliases do PowerShell.
 */
const LANCADORES = {
  cmd: /^\/[ck]$/i,
  powershell: /^-c(o(m(m(a(n(d)?)?)?)?)?)?$/i,
  pwsh: /^-c(o(m(m(a(n(d)?)?)?)?)?)?$/i,
};
const AVALIA_TEXTO = new Set(['invoke-expression', 'iex']);

/** Método do .NET que escreve ou apaga: `[IO.File]::WriteAllText`, `[System.IO.Directory]::Delete`…
 * Só a leitura (`Read*`, `Exists`, `Get*`) fica de fora. O grupo 2 é o nome do método. */
const RE_DOTNET_ESCRITA = /\[(?:system\.)?io\.(?:file|directory)\]::(?!read|exists|get)(\w+)/gi;
/** O mesmo, ancorado no fim de um pedaço de texto da leitura por alvo (o `(` vem como grupo). */
const RE_DOTNET_FIM = /\[(?:system\.)?io\.(file|directory)\]::(\w+)$/i;
/** Membro que destrói o próprio objeto: `$_.Delete()`, `(Get-Item x).MoveTo(y)`. */
const RE_MEMBRO_QUE_DESTROI = /\.(delete|moveto)$/i;

/** Alvo de redireção: `>`, `>>`, `2>`, `*>`. `$null` e `&1` não são arquivo. Só da regra grossa. */
const RE_REDIRECAO_PS = /(?:^|[^-<>=])(?:[1-6*])?>>?\s*(?!\$null\b|&\d)([^\s;|&)]+)/gi;

/** Fronteira de palavra de comando em PowerShell: início, espaço, `;`, `|`, `&`, `(`, `{`. */
const RE_VERBO_PS = new RegExp(
  `(?:^|[\\s;|&({])(${VERBOS_DE_ESCRITA_POWERSHELL.join('|')})(?=$|[\\s;|&)}])`, 'gi',
);

/**
 * Os fragmentos de um texto que podem ser caminho. O corte é generoso, como o do Bash
 * (`fragmentosDeCaminho`): quem decide é a pergunta de zona, que responde "não" para o resto.
 * Parâmetro com valor colado (`-LiteralPath:CLAUDE.md`) perde o nome; parâmetro solto e variável
 * não são caminho. `[` NÃO corta: a classe de glob (`jso[n]`) tem que chegar inteira.
 */
function fragmentosPowerShell(texto) {
  const out = new Set();
  for (const bruto of String(texto).split(/[\s"'`;|&<>(){},=]+/)) {
    if (!bruto) continue;
    const colado = /^-[\w-]+:(.+)$/.exec(bruto);
    const f = colado ? colado[1] : bruto;
    if (f.startsWith('-') || f.startsWith('$')) continue;
    out.add(f);
  }
  return [...out];
}

// ————————————————— a leitura: instruções, estágios, argumentos —————————————————

/**
 * Lê um comando PowerShell numa árvore: `{ instrucoes, quebrado }`.
 *
 *   instrucao = { estagios: [estagio] }               — separadas por `;`, `&&`, `||`, quebra de linha
 *   estagio   = { itens: [item], chamada }            — separados por `|`; `chamada` = veio depois de `&`
 *   item      = { tipo: 'arg', valores: [valor] }     — vírgula junta valores no MESMO argumento
 *             | { tipo: 'redir', alvo: valor | null }
 *   valor     = [pedaço]                              — pedaços colados, sem espaço entre eles
 *   pedaço    = { texto, aspas } | { abre, corpo: [instrucao] }   — `(`, `{`, `$(`, `@(`, `@{`
 *
 * É GRAMÁTICA MÍNIMA, não um parser do PowerShell: aspas simples (`''` escapa), aspas duplas (crase
 * escapa, `$(…)` dentro vira grupo), here-string, crase fora de aspas, comentário `#` e `<# #>`, e
 * a profundidade de `()`/`{}`. O resto — operadores, tipos, membros — fica como texto de palavra, e
 * a avaliação só olha o que precisa.
 *
 * `quebrado` é a leitura que se sabe errada: aspa, grupo ou here-string que não fecha, ou um `)`/`}`
 * que fecha o que não abriu. Com ele a trava volta à regra grossa (`avaliarGrosso`).
 *
 * Todo ramo do laço AVANÇA `i` — é o que impede um texto malformado de travar o hook, que roda em
 * toda chamada de ferramenta.
 */
export function lerPowerShell(texto) {
  const s = String(texto == null ? '' : texto);
  let i = 0;
  let quebrado = false;

  const lerAspasSimples = () => {
    i += 1;
    let out = '';
    while (i < s.length) {
      if (s[i] === "'") {
        if (s[i + 1] === "'") { out += "'"; i += 2; continue; }
        i += 1;
        return out;
      }
      out += s[i];
      i += 1;
    }
    quebrado = true;
    return out;
  };

  const lerAspasDuplas = (pedacos) => {
    i += 1;
    let out = '';
    let empurrou = false;
    const despejar = () => {
      if (out) { pedacos.push({ texto: out, aspas: true }); empurrou = true; out = ''; }
    };
    while (i < s.length) {
      const c = s[i];
      if (c === '`' && i + 1 < s.length) { out += s[i + 1]; i += 2; continue; }
      if (c === '"') {
        if (s[i + 1] === '"') { out += '"'; i += 2; continue; }
        i += 1;
        despejar();
        if (!empurrou) pedacos.push({ texto: '', aspas: true });
        return;
      }
      if (c === '$' && s[i + 1] === '(') {
        despejar();
        i += 2;
        pedacos.push({ abre: '$(', corpo: lerInstrucoes(')') });
        empurrou = true;
        continue;
      }
      out += c;
      i += 1;
    }
    quebrado = true;
    despejar();
  };

  // Here-string: `@'` ou `@"` no início de um valor, seguido de quebra de linha; fecha com `'@` /
  // `"@` no começo de uma linha. O conteúdo é texto, nunca comando.
  const lerHereString = () => {
    const aspa = s[i + 1];
    const inicio = s.indexOf('\n', i + 2) + 1;
    const fim = s.indexOf(`\n${aspa}@`, inicio - 1);
    if (fim === -1) { quebrado = true; i = s.length; return s.slice(inicio); }
    i = fim + 3;
    return s.slice(inicio, fim).replace(/\r$/, '');
  };

  function lerInstrucoes(fecha) {
    const instrucoes = [];
    let estagios = [];
    let itens = [];
    let pedacos = null; // o valor em construção
    let continua = false; // a vírgula anterior pede que o próximo valor entre no MESMO argumento
    let redir = null; // a redireção que espera o alvo
    let chamada = false;

    const fecharValor = () => {
      if (!pedacos) return;
      const valor = pedacos;
      pedacos = null;
      if (redir) { redir.alvo = valor; redir = null; continua = false; return; }
      const ultimo = itens[itens.length - 1];
      if (continua && ultimo && ultimo.tipo === 'arg') ultimo.valores.push(valor);
      else itens.push({ tipo: 'arg', valores: [valor] });
      continua = false;
    };
    const fecharEstagio = () => {
      fecharValor();
      if (itens.length) estagios.push({ itens, chamada });
      itens = [];
      redir = null;
      continua = false;
      chamada = false;
    };
    const fecharInstrucao = () => {
      fecharEstagio();
      if (estagios.length) instrucoes.push({ estagios });
      estagios = [];
    };
    const letra = (ch) => {
      pedacos = pedacos || [];
      const ultimo = pedacos[pedacos.length - 1];
      if (ultimo && ultimo.texto !== undefined && !ultimo.aspas) ultimo.texto += ch;
      else pedacos.push({ texto: ch, aspas: false });
    };
    const grupo = (abre, fechaGrupo) => {
      (pedacos = pedacos || []).push({ abre, corpo: lerInstrucoes(fechaGrupo) });
    };

    while (i < s.length) {
      const c = s[i];
      const d = s[i + 1];
      if (fecha && c === fecha) { i += 1; fecharInstrucao(); return instrucoes; }
      if (c === ')' || c === '}') { quebrado = true; i += 1; continue; }
      if (c === '\n' || c === ';') { i += 1; fecharInstrucao(); continue; }
      if (c === ' ' || c === '\t' || c === '\r') { fecharValor(); i += 1; continue; }
      if (c === '`') {
        // crase no fim da linha continua a instrução; antes de outro caractere, escapa-o
        if (d === '\n' || (d === '\r' && s[i + 2] === '\n')) { fecharValor(); i += d === '\r' ? 3 : 2; continue; }
        if (d !== undefined) letra(d);
        i += 2;
        continue;
      }
      if (c === '#' && !pedacos) { while (i < s.length && s[i] !== '\n') i += 1; continue; }
      if (c === '<' && d === '#' && !pedacos) {
        const fim = s.indexOf('#>', i + 2);
        if (fim === -1) { quebrado = true; i = s.length; } else i = fim + 2;
        continue;
      }
      if (c === '|') {
        if (d === '|') { i += 2; fecharInstrucao(); continue; }
        i += 1;
        fecharEstagio();
        continue;
      }
      if (c === '&') {
        if (d === '&') { i += 2; fecharInstrucao(); continue; }
        i += 1;
        if (!pedacos && !itens.length) { chamada = true; continue; } // operador de chamada
        fecharInstrucao(); // `&` no fim: segundo plano — a instrução roda do mesmo jeito
        continue;
      }
      if (c === '>') {
        // `2>`, `*>`: o número do fluxo chegou como palavra colada ao `>`
        if (pedacos && pedacos.length === 1 && !pedacos[0].aspas && /^[1-6*]$/.test(pedacos[0].texto || '')) pedacos = null;
        else fecharValor();
        i += d === '>' ? 2 : 1;
        if (s[i] === '&' && /[1-6]/.test(s[i + 1] || '')) { i += 2; continue; } // `2>&1`: junta fluxos
        const r = { tipo: 'redir', alvo: null };
        itens.push(r);
        redir = r;
        continue;
      }
      if (c === ',') { fecharValor(); continua = true; i += 1; continue; }
      if (c === "'") { const t = lerAspasSimples(); (pedacos = pedacos || []).push({ texto: t, aspas: true }); continue; }
      if (c === '"') { pedacos = pedacos || []; lerAspasDuplas(pedacos); continue; }
      if (c === '@' && (d === "'" || d === '"') && !pedacos && /^[ \t]*\r?\n/.test(s.slice(i + 2, i + 64))) {
        const t = lerHereString();
        pedacos = [{ texto: t, aspas: true }];
        continue;
      }
      if (c === '$' && d === '(') { i += 2; grupo('$(', ')'); continue; }
      if (c === '@' && (d === '(' || d === '{')) { i += 2; grupo(`@${d}`, d === '(' ? ')' : '}'); continue; }
      if (c === '$' && d === '{') { // `${nome com espaço}` é variável, não bloco
        const fim = s.indexOf('}', i + 2);
        if (fim === -1) { quebrado = true; letra(s.slice(i)); i = s.length; continue; }
        letra(s.slice(i, fim + 1));
        i = fim + 1;
        continue;
      }
      if (c === '(' || c === '{') { i += 1; grupo(c, c === '(' ? ')' : '}'); continue; }
      letra(c);
      i += 1;
    }
    if (fecha) quebrado = true; // o texto acabou com o grupo aberto
    fecharInstrucao();
    return instrucoes;
  }

  const instrucoes = lerInstrucoes(null);
  return { instrucoes, quebrado };
}

/** A chave é PRÓPRIA do objeto? Um comando chamado `constructor` não pode achar `Object` na tabela. */
function proprio(objeto, chave) {
  return Object.prototype.hasOwnProperty.call(objeto, chave) ? objeto[chave] : undefined;
}

/** Variáveis automáticas: atribuir a elas não cria caminho (`$null = …`), e `$PWD` é a pasta. */
const VARIAVEIS_AUTOMATICAS = new Set(['null', 'true', 'false', '_', 'psitem', 'pwd', 'input', 'args', 'this']);

/** Os textos de um valor, em qualquer profundidade (pedaços de texto e o que há dentro dos grupos). */
function* textosDoValor(valor) {
  for (const p of valor) {
    if (p.texto !== undefined) yield p.texto;
    else for (const inst of p.corpo) for (const e of inst.estagios) for (const it of e.itens) {
      for (const v of it.tipo === 'arg' ? it.valores : it.alvo ? [it.alvo] : []) yield* textosDoValor(v);
    }
  }
}

/** O valor cita o objeto do pipe (`$_`, `$PSItem`)? */
function referePipe(valor) {
  for (const t of textosDoValor(valor)) if (/\$(_|psitem)\b/i.test(t)) return true;
  return false;
}

/** Os corpos de grupo de um estágio, na ordem em que aparecem — blocos e subexpressões executam. */
function gruposDoEstagio(estagio) {
  const out = [];
  for (const it of estagio.itens) {
    for (const v of it.tipo === 'arg' ? it.valores : it.alvo ? [it.alvo] : []) {
      for (const p of v) if (p.corpo) out.push(p.corpo);
    }
  }
  return out;
}

/**
 * O comando de um estágio: o texto como foi escrito, o nome (sem pasta, sem `.exe`, minúsculo), o
 * canônico e os argumentos. String entre aspas só é comando depois de `&` — sem ele, `'x' | Out-File`
 * começa por uma expressão.
 */
function comandoDoEstagio(estagio) {
  const args = estagio.itens.filter((it) => it.tipo === 'arg');
  const p0 = args[0] && args[0].valores[0] && args[0].valores[0][0];
  const texto = p0 && p0.texto !== undefined && (!p0.aspas || estagio.chamada) ? p0.texto : '';
  const nome = texto ? nomeDoComando(texto) : '';
  return { texto, nome, canon: proprio(ALIASES_POWERSHELL, nome) || nome, args: args.slice(1) };
}

/** O argumento é um parâmetro (`-Nome`, `-Nome:valor`, `--`)? `{ nome, colado }` ou `null`. */
function parametroDe(arg) {
  const [v0, ...outros] = arg.valores;
  const p0 = v0 && v0[0];
  if (!p0 || p0.texto === undefined || p0.aspas) return null;
  if (p0.texto === '--' && v0.length === 1 && !outros.length) return { nome: '', colado: null };
  const m = /^-([A-Za-z_?][\w-]*)(:?)(.*)$/s.exec(p0.texto);
  if (!m) return null;
  if (!m[2]) return v0.length === 1 && !outros.length && !m[3] ? { nome: m[1], colado: null } : null;
  const primeiro = [...(m[3] ? [{ texto: m[3], aspas: false }] : []), ...v0.slice(1)];
  return { nome: m[1], colado: [primeiro, ...outros].filter((v) => v.length) };
}

/**
 * O papel de um parâmetro neste cmdlet, com a abreviação do PowerShell (`-Dest` é `-Destination`).
 * Desconhecido ou AMBÍGUO é switch — ver o porquê em `ALVOS_POWERSHELL`.
 */
function resolverParametro(nome, gramatica) {
  const n = nome.toLowerCase();
  const papeis = gramatica.papeis;
  const papelDe = (canon) => proprio(papeis, canon) || (PARAMETROS_COM_VALOR.has(canon) ? 'valor' : 'switch');
  const apelido = proprio(APELIDOS_DE_PARAMETRO, n);
  if (apelido) return { canon: apelido, papel: papelDe(apelido) };
  const todos = new Set([...Object.keys(papeis), ...PARAMETROS_COM_VALOR, ...SWITCHES_POWERSHELL]);
  if (todos.has(n)) return { canon: n, papel: papelDe(n) };
  const casam = [...todos].filter((t) => t.startsWith(n));
  return casam.length === 1 ? { canon: casam[0], papel: papelDe(casam[0]) } : { canon: n, papel: 'switch' };
}

/**
 * Liga os argumentos de um estágio aos parâmetros do cmdlet: `[{ canon, papel, valores }]`, na
 * ordem do comando. Posicional que sobra além da gramática vira `alvo` — o PowerShell recusaria o
 * comando, e na dúvida o argumento conta.
 */
function ligarArgumentos(args, gramatica) {
  const nomeados = [];
  const soltos = [];
  let soPosicional = false;
  for (let k = 0; k < args.length; k++) {
    const p = soPosicional ? null : parametroDe(args[k]);
    if (!p) { soltos.push(args[k].valores); continue; }
    if (p.nome === '') { soPosicional = true; continue; }
    const { canon, papel } = resolverParametro(p.nome, gramatica);
    if (papel === 'switch') continue;
    let valores = p.colado;
    if (!valores) { valores = args[k + 1] ? args[k + 1].valores : []; k += 1; }
    nomeados.push({ canon, papel, valores });
  }
  const ligado = new Set(nomeados.map((x) => x.canon));
  // `-LiteralPath` e `-Path` (e o `-FilePath` do `Out-File`) disputam a mesma primeira posição
  const primeiraOcupada = ['path', 'literalpath', 'filepath'].some((x) => ligado.has(x));
  const livres = gramatica.posicionais.filter((x, idx) => !ligado.has(x) && !(idx === 0 && primeiraOcupada));
  const posicionais = soltos.map((valores, idx) => {
    const canon = livres[idx] || null;
    return { canon, papel: canon ? proprio(gramatica.papeis, canon) || 'valor' : 'alvo', valores };
  });
  return [...nomeados, ...posicionais];
}

/** O último segmento de um caminho em texto, ou `''`. */
function folhaDe(texto) {
  return String(texto).replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || '';
}

/** A pasta de um caminho em texto (`'.'` quando não há). */
function pastaDe(texto) {
  const t = String(texto).replace(/\\/g, '/').replace(/\/+$/, '');
  const k = t.lastIndexOf('/');
  return k === -1 ? '.' : t.slice(0, k) || '/';
}

// ————————————————— a avaliação —————————————————

/**
 * Os caminhos que um valor de argumento nomeia, em texto, ainda relativos à pasta em vigor.
 *
 * Valor só de texto é UM caminho — `'my file.md'` continua inteiro —, com a variável do começo
 * expandida (`expandirVariavel`). Valor com grupo (`(Get-ChildItem x)`, `$(...)`) não tem caminho
 * literal: valem os fragmentos de dentro dele, como na regra grossa.
 */
function caminhosDoValor(valor, ctx) {
  if (valor.some((p) => p.corpo)) return fragmentosDoValor(valor, ctx);
  return expandirVariavel(valor.map((p) => p.texto).join(''), ctx);
}

/**
 * `$PWD` é a pasta em vigor; variável atribuída neste comando vale o literal dela (com o resto do
 * texto colado: `"$base/x.md"`) ou, sem literal, os fragmentos da atribuição. Variável que este
 * comando não atribuiu — `$_`, `$env:X`, a de uma chamada anterior — não nomeia nada.
 */
function expandirVariavel(texto, ctx) {
  if (!texto.startsWith('$')) return [texto];
  const m = /^\$(?:\{([^}]*)\}|([\w:?]+))(.*)$/s.exec(texto);
  if (!m) return [];
  const nome = (m[1] !== undefined ? m[1] : m[2]).toLowerCase();
  if (nome === 'pwd') return [ctx.local.dir + m[3]];
  const v = ctx.vars.get(nome);
  if (!v) return [];
  return v.literal != null ? [v.literal + m[3]] : v.fragmentos;
}

/** Os fragmentos que podem ser caminho dentro de um valor, em qualquer profundidade. */
function fragmentosDoValor(valor, ctx) {
  const out = [];
  for (const p of valor) {
    if (p.corpo) { out.push(...fragmentosDasInstrucoes(p.corpo, ctx)); continue; }
    if (p.texto.startsWith('$')) { out.push(...expandirVariavel(p.texto, ctx)); continue; }
    out.push(...fragmentosPowerShell(p.texto));
  }
  return out;
}

/**
 * Os fragmentos de uma lista de instruções, para quem varre a pipeline inteira (item 4). Pula o
 * valor de filtro (`-Filter *.md` não é caminho de objeto) e, para quem lista sem caminho, põe a
 * pasta em vigor: `Get-ChildItem -Recurse | Remove-Item` lista TUDO que está aqui.
 */
function fragmentosDasInstrucoes(instrucoes, ctx) {
  const out = [];
  for (const inst of instrucoes) for (const e of inst.estagios) out.push(...fragmentosDoEstagio(e, ctx));
  return out;
}

function fragmentosDoEstagio(estagio, ctx) {
  const out = [];
  const { nome, args } = comandoDoEstagio(estagio);
  const todos = estagio.itens.filter((it) => it.tipo === 'arg');
  for (let k = 0; k < todos.length; k++) {
    const p = k === 0 ? null : parametroDe(todos[k]);
    if (p) {
      if (VALOR_QUE_NAO_E_CAMINHO.has(p.nome.toLowerCase())) { if (!p.colado) k += 1; continue; }
      if (p.colado) for (const v of p.colado) out.push(...fragmentosDoValor(v, ctx));
      continue;
    }
    for (const v of todos[k].valores) out.push(...fragmentosDoValor(v, ctx));
  }
  if (LISTADORES.has(nome) && !ligarArgumentos(args, GRAMATICA_DO_LISTADOR).some((l) => l.papel !== 'valor')) {
    out.push(ctx.local.dir);
  }
  return out;
}

/**
 * Os alvos de um verbo de escrita: `[{ caminho, destroi }]`, em texto. O papel decide:
 * `remove`/`origem` destroem (vale a contenção); `alvo`/`destino`/`nome` escrevem. O destino ganha a
 * folha de cada origem literal, porque destino que é pasta recebe o arquivo com o nome da origem — e
 * sem destino a pasta é a em vigor.
 */
function alvosDoVerbo(canon, ligados, ctx) {
  const doPapel = (papel) => ligados.filter((l) => l.papel === papel)
    .flatMap((l) => l.valores.flatMap((v) => caminhosDoValor(v, ctx)));
  const out = [];
  for (const c of [...doPapel('remove'), ...doPapel('origem')]) out.push({ caminho: c, destroi: true });

  const nomes = doPapel('nome');
  if (canon === 'new-item' && nomes.length) {
    // `New-Item -Path <pasta> -Name <nome>`: o `-Path` é a PASTA, e o item é a pasta + o nome
    const pastas = doPapel('alvo');
    for (const p of pastas.length ? pastas : ['.']) for (const n of nomes) out.push({ caminho: join(p, n), destroi: false });
  } else {
    for (const c of doPapel('alvo')) out.push({ caminho: c, destroi: false });
    const origens = doPapel('origem');
    for (const n of nomes) out.push({ caminho: join(pastaDe(origens[0] || '.'), n), destroi: false });
  }

  if (canon === 'copy-item' || canon === 'move-item') {
    const destinos = doPapel('destino');
    for (const d of destinos) out.push({ caminho: d, destroi: false });
    const folhas = [...doPapel('leitura'), ...doPapel('origem')].map(folhaDe)
      .filter((f) => f && f !== '.' && f !== '..' && !RE_GLOB.test(f));
    for (const d of destinos.length ? destinos : ['.']) for (const f of folhas) out.push({ caminho: join(d, f), destroi: false });
  }
  return out;
}

/** Os argumentos de uma chamada `metodo(a, b)`: os valores do primeiro argumento do grupo. */
function argumentosDaChamada(corpo) {
  const e = corpo[0] && corpo[0].estagios[0];
  const a = e && e.itens.find((it) => it.tipo === 'arg');
  return a ? a.valores : [];
}

/**
 * As chamadas de método que escrevem, num estágio: `[IO.File]::Metodo(...)` e `<objeto>.Delete()` /
 * `.MoveTo(...)`. `{ rotulo, destroi, alvos: [{ valor, destroi }] }`. Só a profundidade 0 do
 * estágio — dentro de grupo, quem responde é a avaliação do grupo.
 */
function chamadasDoEstagio(estagio) {
  const out = [];
  for (const it of estagio.itens) {
    if (it.tipo !== 'arg') continue;
    for (const valor of it.valores) {
      valor.forEach((p, idx) => {
        const prox = valor[idx + 1];
        if (p.texto === undefined || p.aspas || !prox || prox.abre !== '(') return;
        const args = argumentosDaChamada(prox.corpo);
        const dn = RE_DOTNET_FIM.exec(p.texto);
        if (dn) {
          const metodo = dn[2].toLowerCase();
          if (/^(read|exists|get)/.test(metodo)) return;
          const rotulo = `[IO.${dn[1]}]::${dn[2]}`;
          // a posição do caminho escrito em cada método; o padrão (`Write*`, `Append*`, `Create*`) é o 1º
          const posicoes = proprio({ delete: [[0, true]], move: [[0, true], [1, false]], copy: [[1, false]],
            replace: [[1, false], [2, false]] }, metodo) || [[0, false]];
          const alvos = posicoes.filter(([k]) => args[k]).map(([k, destroi]) => ({ valor: args[k], destroi }));
          out.push({ rotulo, destroi: metodo === 'delete' || metodo === 'move', alvos, dotnet: true });
          return;
        }
        const membro = RE_MEMBRO_QUE_DESTROI.exec(p.texto);
        if (membro) {
          const resto = p.texto.slice(0, -membro[0].length);
          const sujeito = [...valor.slice(0, idx), ...(resto ? [{ texto: resto, aspas: false }] : [])];
          const alvos = sujeito.length ? [{ valor: sujeito, destroi: true }] : [];
          if (membro[1].toLowerCase() === 'moveto' && args[0]) alvos.push({ valor: args[0], destroi: false });
          out.push({ rotulo: `.${membro[1]}()`, destroi: true, alvos, dotnet: false });
        }
      });
    }
  }
  return out;
}

/**
 * Quem, nesta pipeline, consome o objeto do pipe destruindo ou escrevendo nele (item 4). Rótulo do
 * verbo ou `null`. Desce nos blocos: `… | ForEach-Object { Remove-Item $_ }` é o caso típico.
 */
function consumidorDoPipe(estagios) {
  for (let k = 0; k < estagios.length; k++) {
    const r = consumidorNoEstagio(estagios[k], k > 0, 0);
    if (r) return r;
  }
  return null;
}

function consumidorNoEstagio(estagio, alimentado, profundidade) {
  const { texto, canon, args } = comandoDoEstagio(estagio);
  if (CANONICOS_QUE_DESTROEM.has(canon)) return texto;
  const destroi = chamadasDoEstagio(estagio).find((c) => c.destroi);
  if (destroi) return destroi.rotulo;
  const gramatica = proprio(ALVOS_POWERSHELL, canon);
  if (gramatica && gramatica.doPipe) {
    const alvos = ligarArgumentos(args, gramatica).filter((l) => PAPEIS_DE_ALVO.has(l.papel));
    if (alimentado && profundidade === 0 && !alvos.length) return texto; // sem alvo próprio: vem do pipe
    if (alvos.some((l) => l.valores.some(referePipe))) return texto; // `Set-Content $_.FullName`
  }
  for (const corpo of gruposDoEstagio(estagio)) {
    for (const inst of corpo) {
      for (let j = 0; j < inst.estagios.length; j++) {
        const r = consumidorNoEstagio(inst.estagios[j], j > 0, profundidade + 1);
        if (r) return r;
      }
    }
  }
  return null;
}

/**
 * A atribuição no começo da instrução: `$x = …`, `$x += …`, `[tipo]$x = …`, `$x='…'`. Devolve
 * `{ nome, op, estagios }` com a atribuição tirada do primeiro estágio, ou `null`.
 */
function separarAtribuicao(estagios) {
  const e0 = estagios[0];
  const args = e0.itens.filter((it) => it.tipo === 'arg');
  const v0 = args[0] && args[0].valores.length === 1 ? args[0].valores[0] : null;
  const p0 = v0 && v0[0];
  if (!p0 || p0.texto === undefined || p0.aspas) return null;
  const m = /^(?:\[[^\]]*\])*\$(\{[^}]*\}|[\w:?]+)(?:((?:[-+*/%]|\?\?)?=)(.*))?$/s.exec(p0.texto);
  if (!m) return null;
  const nome = m[1].replace(/^\{|\}$/g, '').toLowerCase();
  let op = m[2];
  let tirar = [args[0]];
  let trocar = null;
  if (op === undefined) {
    const p1 = args[1] && args[1].valores.length === 1 && args[1].valores[0].length === 1 ? args[1].valores[0][0] : null;
    if (v0.length !== 1 || !p1 || p1.aspas || !/^(?:[-+*/%]|\?\?)?=$/.test(p1.texto || '')) return null;
    op = p1.texto;
    tirar = [args[0], args[1]];
  } else {
    const resto = [...(m[3] ? [{ texto: m[3], aspas: false }] : []), ...v0.slice(1)];
    if (resto.length) { trocar = { tipo: 'arg', valores: [resto] }; tirar = []; }
  }
  const itens = e0.itens.filter((it) => !tirar.includes(it)).map((it) => (it === args[0] && trocar ? trocar : it));
  return { nome, op, estagios: [{ ...e0, itens }, ...estagios.slice(1)] };
}

/** Registra a variável: o literal, quando o lado direito é UM valor de texto, e os fragmentos dele. */
function registrarVariavel(ctx, nome, op, estagios) {
  const fragmentos = fragmentosDasInstrucoes([{ estagios }], ctx);
  let literal = null;
  const args = estagios.length === 1 ? estagios[0].itens.filter((it) => it.tipo === 'arg') : [];
  if (op === '=' && args.length === 1 && args[0].valores.length === 1 && args[0].valores[0].every((p) => p.texto !== undefined)) {
    const t = args[0].valores[0].map((p) => p.texto).join('');
    if (!t.startsWith('$')) literal = t;
  }
  if (VARIAVEIS_AUTOMATICAS.has(nome)) return; // `$null = …` não faz de `2>$null` um caminho
  const anterior = op === '=' || op === 'laco' ? null : ctx.vars.get(nome);
  const antes = anterior ? anterior.fragmentos : [];
  ctx.vars.set(nome, literal != null ? { literal, fragmentos: [literal] } : { literal: null, fragmentos: [...antes, ...fragmentos] });
}

/** `foreach ($f in <expr>)`: a variável do laço vale o que o cabeçalho cita. */
function registrarVariavelDoLaco(estagio, ctx) {
  const cabecalho = gruposDoEstagio(estagio)[0];
  const inst = cabecalho && cabecalho[0];
  if (!inst) return;
  const [a0, a1, ...resto] = inst.estagios[0].itens;
  const t0 = a0 && a0.tipo === 'arg' && a0.valores[0].length === 1 ? a0.valores[0][0].texto || '' : '';
  const t1 = a1 && a1.tipo === 'arg' && a1.valores[0].length === 1 ? a1.valores[0][0].texto || '' : '';
  const m = /^\$([\w:?]+)$/.exec(t0);
  if (!m || t1.toLowerCase() !== 'in') return;
  registrarVariavel(ctx, m[1].toLowerCase(), 'laco', [{ itens: resto, chamada: false }, ...inst.estagios.slice(1)]);
}

/** `Set-Location`/`Push-Location`/`Pop-Location`: a pasta em vigor das instruções seguintes. */
function mudarDePasta(nome, args, ctx) {
  if (VOLTA_DE_PASTA.has(nome)) { ctx.local.dir = ctx.local.pilha.pop() || ctx.raiz; return; }
  if (nome === 'push-location' || nome === 'pushd') ctx.local.pilha.push(ctx.local.dir);
  const lugar = ligarArgumentos(args, GRAMATICA_DA_PASTA).find((l) => l.papel === 'lugar');
  const valor = lugar && lugar.valores.length === 1 ? lugar.valores[0] : null;
  const caminhos = valor && !valor.some((p) => p.corpo) ? caminhosDoValor(valor, ctx) : [];
  const t = caminhos.length === 1 ? caminhos[0].replace(/\\/g, '/') : '';
  if (!t || t === '-' || t === '+' || t === '~' || t.startsWith('~/')) { ctx.local.dir = ctx.raiz; return; }
  ctx.local.dir = isAbsolute(t) || /^[a-zA-Z]:\//.test(t) ? t : join(ctx.local.dir, t);
}

/** O texto de comando que um lançador recebe (`cmd /c …`, `pwsh -c …`, `iex '…'`), ou `null`. */
function textoDoLancador(nome, args) {
  const texto = (arg) => arg.valores.map((v) => v.filter((p) => p.texto !== undefined).map((p) => p.texto).join('')).join(',');
  if (AVALIA_TEXTO.has(nome)) {
    const a = args.find((x) => !parametroDe(x));
    return a ? texto(a) : null;
  }
  const marca = proprio(LANCADORES, nome);
  const k = args.findIndex((x) => marca.test(texto(x)));
  return k === -1 ? null : args.slice(k + 1).map(texto).join(' ');
}

/**
 * Avalia uma lista de instruções na ordem, com a pasta e as variáveis em vigor em `ctx`. Devolve o
 * primeiro achado (`{ rel, rotulo, tipo, verbo }`) ou `null`.
 */
function avaliarInstrucoes(instrucoes, ctx) {
  for (const inst of instrucoes) {
    const achado = avaliarPipeline(inst.estagios, ctx);
    if (achado) return achado;
  }
  return null;
}

function avaliarPipeline(estagiosOriginais, ctx) {
  const atribuicao = separarAtribuicao(estagiosOriginais);
  const estagios = atribuicao ? atribuicao.estagios : estagiosOriginais;
  const dirNoInicio = ctx.local.dir;

  for (let k = 0; k < estagios.length; k++) {
    const achado = avaliarEstagio(estagios[k], k, ctx);
    if (achado) return achado;
  }

  // Item 4: alguém consome o objeto do pipe destruindo ou escrevendo nele — todo estágio conta.
  const consumidor = estagios.length > 1 ? consumidorDoPipe(estagios) : null;
  if (consumidor) {
    const local = { ...ctx, local: { ...ctx.local, dir: dirNoInicio } };
    for (const f of fragmentosDasInstrucoes([{ estagios }], local)) {
      const achado = ctx.checar(f, dirNoInicio, true);
      if (achado) return { ...achado, tipo: 'pipeline', verbo: consumidor };
    }
  }

  if (atribuicao) registrarVariavel(ctx, atribuicao.nome, atribuicao.op, atribuicao.estagios);
  return null;
}

function avaliarEstagio(estagio, k, ctx) {
  const { texto, nome, canon, args } = comandoDoEstagio(estagio);

  for (const it of estagio.itens) { // item 6: a redireção conta só o alvo
    if (it.tipo !== 'redir' || !it.alvo) continue;
    for (const c of caminhosDoValor(it.alvo, ctx)) {
      const achado = ctx.checar(c, ctx.local.dir, false);
      if (achado) return { ...achado, tipo: 'redirecao', verbo: '>' };
    }
  }

  if (k === 0 && nome === 'foreach') registrarVariavelDoLaco(estagio, ctx);

  if (TROCA_DE_PASTA.has(nome) || VOLTA_DE_PASTA.has(nome)) {
    mudarDePasta(nome, args, ctx);
  } else if (proprio(LANCADORES, nome) || AVALIA_TEXTO.has(nome)) {
    const t = textoDoLancador(nome, args);
    const achado = t ? avaliarTexto(t, ctx) : null;
    if (achado) return achado;
  } else if (proprio(ALVOS_POWERSHELL, canon)) {
    for (const alvo of alvosDoVerbo(canon, ligarArgumentos(args, ALVOS_POWERSHELL[canon]), ctx)) {
      const achado = ctx.checar(alvo.caminho, ctx.local.dir, alvo.destroi);
      if (achado) return { ...achado, tipo: 'alvo', verbo: texto };
    }
  }

  for (const chamada of chamadasDoEstagio(estagio)) {
    for (const { valor, destroi } of chamada.alvos) {
      // O .NET resolve relativo pela pasta do PROCESSO, que o `Set-Location` não move: as duas contam.
      const bases = chamada.dotnet ? [...new Set([ctx.local.dir, ctx.raiz])] : [ctx.local.dir];
      for (const c of caminhosDoValor(valor, ctx)) {
        for (const base of bases) {
          const achado = ctx.checar(c, base, destroi);
          if (achado) return { ...achado, tipo: 'alvo', verbo: chamada.rotulo };
        }
      }
    }
  }

  for (const corpo of gruposDoEstagio(estagio)) { // blocos e subexpressões executam
    const achado = avaliarInstrucoes(corpo, ctx);
    if (achado) return achado;
  }
  return null;
}

/** Lê e avalia um texto de comando; leitura quebrada vai para a regra grossa. */
function avaliarTexto(texto, ctx) {
  const { instrucoes, quebrado } = lerPowerShell(texto);
  return quebrado ? avaliarGrosso(texto, ctx) : avaliarInstrucoes(instrucoes, ctx);
}

/**
 * A REGRA GROSSA, que era a trava inteira até esta rodada e agora só vale com a leitura quebrada:
 * verbo de escrita em qualquer ponto + caminho da zona em qualquer ponto, e a redireção pelo alvo.
 * Resolve contra a RAIZ e ignora a própria raiz — o `.` solto de `git add .` não pode negar.
 */
function avaliarGrosso(comando, ctx) {
  const relDaRaiz = (f) => {
    const rel = ctx.relDe(f.replace(/^['"]|['"]$/g, ''), ctx.raiz);
    return rel === '' ? null : rel;
  };
  for (const m of comando.matchAll(RE_REDIRECAO_PS)) {
    const rel = relDaRaiz(m[1]);
    const achado = rel && ctx.alcanca(rel, false);
    if (achado) return { ...achado, tipo: 'grosso', verbo: '>' };
  }
  const verbos = [...comando.matchAll(RE_VERBO_PS)].map((m) => m[1]); // como foi escrito, para a mensagem
  const metodos = [...comando.matchAll(RE_DOTNET_ESCRITA)].map((m) => m[1].toLowerCase());
  if (!verbos.length && !metodos.length) return null;
  const verbo = verbos[0] || `::${metodos[0]}`;
  const destroi = verbos.some((v) => VERBOS_QUE_DESTROEM_ARVORE.has(v.toLowerCase())) ||
    metodos.some((m) => m === 'delete' || m === 'move');
  for (const fragmento of fragmentosPowerShell(comando)) {
    const rel = relDaRaiz(fragmento);
    const achado = rel && ctx.alcanca(rel, destroi);
    if (achado) return { ...achado, tipo: 'grosso', verbo };
  }
  return null;
}

/** A mensagem da trava do PowerShell. Termina no parágrafo do dono, como as outras duas travas. */
function montarMotivoPowerShell({ rel, rotulo, tipo, verbo }) {
  const oQueE = rotulo === 'marcador-template'
    ? 'é o **marcador do template**'
    : 'está na **zona imutável** do template';
  const abertura = {
    alvo: `Este comando da tool **PowerShell** escreve ou remove com \`${verbo}\`, e o alvo alcança ` +
      `\`${rel}\`, que ${oQueE}.`,
    redirecao: `Este comando da tool **PowerShell** redireciona a saída (\`${verbo}\`) para \`${rel}\`, ` +
      `que ${oQueE}.`,
    pipeline: `Este comando da tool **PowerShell** alimenta \`${verbo}\` pelo pipeline, e a pipeline ` +
      `alcança \`${rel}\`, que ${oQueE}.`,
    grosso: 'Este comando da tool **PowerShell** tem aspa, parêntese ou chave que **não fecha**, e com ' +
      'a leitura quebrada a trava não enxerga o alvo de cada instrução. Vale então a regra grossa: o ' +
      `comando tem verbo de escrita ou remoção (\`${verbo}\`) e alcança \`${rel}\`, que ${oQueE}.`,
  }[tipo];
  const explicacao = {
    alvo: 'Esta trava lê o **alvo** de cada instrução — o caminho do verbo de escrita, o destino de ' +
      '`Copy-Item`, a origem e o destino de `Move-Item`, o alvo de `>` —, acompanhando ' +
      '`Set-Location`. Citar a zona fora do alvo é livre. Para **ler** o caminho, use a tool Read.',
    pipeline: 'Em PowerShell o pipe carrega o objeto: quando um estágio remove, move ou escreve no que ' +
      'recebe pelo pipe, o alvo dele é o que os outros estágios listam, e os caminhos de todos eles ' +
      'contam. **Aponte o verbo para o alvo exato**, ou liste fora da zona.',
    grosso: '**Feche a aspa ou o grupo e mande o comando de novo** — o PowerShell nem executaria o ' +
      'comando assim. Se ele só **lê** o caminho, use a tool Read.',
  };
  return [
    abertura,
    '',
    explicacao[tipo === 'redirecao' ? 'alvo' : tipo],
    '',
    ...(rotulo === 'marcador-template' ? paragrafoDoMarcador() : paragrafoDoMaquinario()),
  ].join('\n');
}

/**
 * Veredito sobre um payload da tool `PowerShell` (`tool_input.command`). Mesmo `io` do Bash.
 *
 * ORDEM POR CUSTO: a leitura é pura; a pergunta "este caminho é da zona?" também; só quando ela
 * responde "sim" se pergunta ao disco se esta raiz é o template (memo por comando), e o manifesto só
 * é lido se, além disso, o caminho puder ser extensão do projeto. Menção à zona FORA do alvo nem
 * chega a perguntar — é o que o teste "não paga a detecção" prende.
 */
export function avaliarPowerShell(payload, io) {
  const input = (payload && payload.tool_input) || {};
  const comando = String(input.command || '');
  if (!comando) return null;

  const raiz = io.cwd();
  const paraRelativo = io.relativizar || relativizar;
  const { ehTemplate, ehExtensao } = criarPerguntasDaZona(raiz, io);
  // O caminho relativo à raiz (`''` para ela mesma) ou `null` para fora do projeto. `join`, e não
  // `resolve`: `resolve` poria a unidade do processo na frente de uma raiz sem unidade (`/proj` vira
  // `C:proj`), e a raiz deixaria de ser prefixo do caminho. A barra invertida vira `/` antes: o
  // PowerShell aceita as duas em qualquer sistema, e o `join` do POSIX não as separa.
  const relDe = (fragmento, dir) => {
    const f = String(fragmento).replace(/\\/g, '/');
    if (!f) return null;
    const abs = isAbsolute(f) || /^[a-zA-Z]:\//.test(f) ? f : join(dir, f);
    const rel = relativoOuNulo(paraRelativo, raiz, abs);
    // `C:x` (relativo a outra unidade) e afins não são caminho do projeto — e o kit lançaria
    return rel === null || /^[a-zA-Z]:|^\//.test(rel) ? null : rel;
  };
  // O rótulo da zona para UM caminho concreto, ou `null`. Mesma pergunta do `protegido` do Bash,
  // restrita à zona e ao marcador (ver o escopo, no topo desta seção).
  const daZona = (rel) => {
    if (ehMarcadorDoTemplate(rel)) return ehTemplate() ? null : 'marcador-template';
    if (ehZonaImutavel(rel)) return ehTemplate() || ehExtensao(rel) ? null : 'zona-imutavel';
    return null;
  };
  // O caminho alcança a zona — nomeando, por glob, ou (só para quem destrói) contendo?
  const alcanca = (rel, destroi) => {
    const direto = daZona(rel);
    if (direto) return { rel, rotulo: direto };
    for (const { caminho, relacao } of protegidosCasadosPorGlob(rel)) {
      if (relacao === 'contem' && !destroi) continue;
      const r = daZona(caminho);
      if (r) return { rel: caminho, rotulo: r };
    }
    if (destroi && !RE_GLOB.test(rel)) {
      for (const contido of protegidosContidosEm(rel)) {
        const r = daZona(contido);
        if (r) return { rel: contido, rotulo: r };
      }
    }
    return null;
  };
  const checar = (caminho, dir, destroi) => {
    const rel = relDe(caminho, dir);
    return rel === null ? null : alcanca(rel, destroi);
  };

  const ctx = { raiz, local: { dir: raiz, pilha: [] }, vars: new Map(), relDe, alcanca, checar };
  const achado = avaliarTexto(comando, ctx);
  return achado ? { acao: 'deny', motivo: montarMotivoPowerShell(achado) } : null;
}
