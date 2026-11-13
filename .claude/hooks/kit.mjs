// Harness Elo v2 — Inventário canônico das duas árvores de saída. Núcleo puro + casca de I/O.
//
// Autoridade única sobre oito perguntas. As cinco de sempre: o que o Explore precisa entregar, o
// que a whitelist do Explore permite em outputs/spec/, qual validador cobre qual arquivo, em que
// fase o projeto está, e o que é zona imutável. Mais três que este cabeçalho deixou de fora por
// tempo demais e que hoje têm dono aqui de propósito:
//   - onde termina um identificador (`CLASSE_ID` e as duas fronteiras). Fronteira escrita duas
//     vezes diverge — esta já levou quatro rodadas de correção;
//   - de que campo do `tool_input` sai o caminho que a tool vai escrever (`caminhoDaTool`). Ler só
//     `file_path` deixou a fiscalização de notebook inexistente com a suíte verde;
//   - qual oráculo de caminho manda, e em que ordem (`relativizarComRecuo`). Isto veio do
//     `pretooluse.mjs` com o argumento explícito de que os DOIS despachantes precisam da mesma
//     resposta sobre o mesmo caminho, e política escrita duas vezes diverge.
// Os verificadores leem daqui — nenhum duplica estas tabelas. Mudar o contrato do harness é mudar
// este arquivo. Se acrescentar uma nona, ela vem para esta lista junto.

export const RAIZ_EXPLORE = 'outputs/explore';
export const RAIZ_SPEC = 'outputs/spec';

// A RAIZ DO PLAN É UMA. Havia uma segunda, `RAIZ_PIPELINE`, com o layout que o kit descontinuou.
// Ela existia porque uma máquina podia servir `spec-*` de versão ANTERIOR à descontinuação, e numa
// trava bloqueante procurar numa raiz só transformaria isso em falso positivo permanente. Com o kit
// vendorizado em `.claude/skills/` (Decisão 7) não há mais versão desconhecida na jogada, e o
// gatilho de remoção estava declarado no `CLAUDE.md`. Não a reintroduza sem desfazer aquilo.

/** Os artefatos de outputs/explore/. Caminhos relativos a RAIZ_EXPLORE. */
export const DOCS_EXPLORE = [
  { caminho: 'hld-funcional.md', rotulo: 'HLD funcional — visão, módulos MOD-CODIGO, funcionalidades por módulo', obrigatorio: true },
  { caminho: 'especificacao-funcional.md', rotulo: 'Especificação funcional — personas, telas, RF-nnn e RN-nnn', obrigatorio: true },
  { caminho: 'especificacao-tecnica.md', rotulo: 'Especificação técnica preliminar — camadas, integrações, premissas', obrigatorio: true },
  { caminho: 'modelo-de-dados.md', rotulo: 'Modelo de dados preliminar — opcional; ausência exige dispensa no gaps.md', obrigatorio: false },
  { caminho: 'gaps.md', rotulo: 'GAPs e questões abertas — kernel de incerteza do pré-projeto', obrigatorio: true },
];

/**
 * O que o Explore pode escrever em outputs/spec/ sem disparar o fecho.
 * Entrada terminada em `/` é diretório: tudo abaixo dela é permitido.
 *
 * ESTA LISTA RESPONDE DUAS PERGUNTAS, e é por isso que ela é a casa certa do maquinário do gate:
 *   1. "isto atravessa a fronteira Explore→Plan?" (`ehPrimeiraAcaoDoPlan`, no `fecho-explore.mjs`);
 *   2. "isto caracteriza fase Plan?" (`detectarFase`, logo abaixo).
 * Uma lista que responda só a primeira deixa a segunda errada em silêncio — foi exatamente esse o
 * defeito C-1 da Task 6, medido: `revisao.json` e o arquivo de isenção estavam isentos da fronteira
 * por uma lista PRIVADA do `fecho-explore` (`EXCECOES_DE_FRONTEIRA`), mas continuavam fazendo
 * `detectarFase` responder `plan`. O consultor obedecia ao item 5 do gate — escrever
 * `outputs/spec/revisao.json` —, o projeto era declarado Plan, e a `spec-prototype`, que é
 * OBRIGATÓRIA no Explore, passava a cobrar quatro artefatos de Plan. Laço fechado: quem produz
 * esses quatro é a `spec-product`, negada pelo fecho porque o Explore não fechou, e o Explore não
 * fecha sem o `revisao.json` que causou a primeira negação.
 *
 * `revisao.json` e `auditorias/_isencoes/` entram aqui porque a resposta às DUAS perguntas é a
 * mesma: são arquivos que o PRÓPRIO gate exige (o relatório) ou oferece (a isenção), escritos
 * durante o Explore, e não são compromisso com o Plan.
 *
 * O MARCADOR DE CONGELAMENTO (`MARCADOR_CONGELAMENTO`) NÃO ENTRA, e a ausência é desenho: ele é
 * escrito na conclusão do `spec-product`, isto é, já no Plan, e é correto que caracterize fase
 * Plan. Ele continua isento da fronteira pela lista do `fecho-explore`, que hoje existe só para
 * ele — as duas perguntas dão respostas DIFERENTES nesse caso, e é a única razão de aquela lista
 * sobreviver. Ver o JSDoc de `MARCADOR_CONGELAMENTO`.
 *
 * `frame.md` e `frame/` SÃO A SAÍDA DA `spec-frame`, o acelerador opcional do Explore para pedido
 * vago (roda ANTES da `spec-ingest` — ver `.claude/rules/harness/explore.md`). Ficaram de fora até
 * o teste ponta a ponta da 2.6.0, e o efeito medido foi a skill não ter fase onde funcionasse: no
 * Explore o fecho negava `Write outputs/spec/frame.md` («o Plan é compromisso irreversível»), e com
 * o arquivo presente o `detectarFase` anunciava Plan. As duas perguntas desta lista têm a mesma
 * resposta para ela: é escrita do Explore, e não é compromisso com o Plan. `frame/` é diretório
 * (o pré-protótipo descartável mora em `frame/pre-prototype/`), e a barra final é o que impede
 * `frame-v2.md` de entrar de carona.
 */
export const WHITELIST_EXPLORE = [
  'sync-log.md',
  'revisao.json',
  'auditorias/_isencoes/',
  'frame.md',
  'frame/',
  'context-map.md',
  'discovery-document.md',
  'legacy.md',
  'legacy/',
  'architecture.md',
  'legacy-analysis.md',
  'threat-model.md',
  'benchmark.md',
  'prototype.md',
  'design-system.md',
  'screens-manifest.json',
  'screens/',
];

/** O arquivo da `spec-prototype` que DECLARA a fidelidade, na linha `Fidelidade:` do cabeçalho. */
export const PROTOTIPO_MD = 'prototype.md';

/** O que a spec-prototype tem que ter deixado em outputs/spec/ para o fecho passar. */
export const ARTEFATOS_PROTOTIPO = [PROTOTIPO_MD, 'design-system.md', 'screens-manifest.json'];

/**
 * A fidelidade que o Explore exige do protótipo — e a ÚNICA que fecha a fase sem isenção.
 *
 * Existe desde o D9 do teste ponta a ponta da 2.6.0. A `explore.md` sempre exigiu «alta
 * fidelidade», mas o fecho conferia só a PRESENÇA dos três `ARTEFATOS_PROTOTIPO`. E o
 * `design-system.md` só nasce no modo Geração (Passo 3.0.1 da `spec-prototype`), que a fidelidade
 * Média pula: quem escolhia Média tinha de adivinhar que precisava gerar o `design-system.md` por
 * fora — e aí o fecho passava um protótipo que a rule não aceita. Rule e fecho diziam coisas
 * diferentes; agora os dois leem daqui.
 */
export const FIDELIDADE_DO_EXPLORE = 'alta';

/**
 * O valor da linha `Fidelidade:` do `prototype.md`, COMO ESCRITO, ou `null` se não há linha (ou ela
 * está vazia). É a linha que o template da `spec-prototype` traz no cabeçalho
 * (`Fidelidade: baixa | média | alta`) e que o gate `MODE_FIDELITY_DECLARED` do kit cobra.
 *
 * A FORMA NÃO É O CONTRATO: ênfase (`**Fidelidade:** Alta`, `**Fidelidade**: alta`), citação (`> `)
 * e marcador de lista (`- `) são aceitos, e a caixa é livre — o que se lê é o valor. Vale a PRIMEIRA
 * linha que casa, que é a do cabeçalho; uma citação posterior («o template diz `Fidelidade: …`»)
 * não muda a declaração. Linha que começa com outra palavra («Escolha de fidelidade: Média») não é
 * declaração — o rótulo tem que abrir a linha.
 *
 * Só LÊ. Quem decide se o valor serve é `nivelDeFidelidade` — o valor como escrito vai para a
 * mensagem de negação, porque é o que o consultor vai procurar no arquivo.
 */
export function lerFidelidade(texto) {
  const re = /^[\s>*_-]*fidelidade[\s*_]*:[\s*_]*(.*?)[\s*_]*$/i;
  for (const linha of String(texto || '').split(/\r?\n/)) {
    const m = re.exec(linha);
    if (m) return m[1].trim() ? m[1].trim() : null;
  }
  return null;
}

/**
 * O nível que um valor declarado nomeia: `'alta'`, `'media'`, `'baixa'` ou `null`.
 *
 * Insensível a caixa e a acento (`Média` e `media` são o mesmo nível), e a crase/ênfase em volta.
 * Lê a PRIMEIRA palavra — `alta (frontend completo em src/)` é Alta. A linha intocada do template,
 * `baixa | média | alta`, é `null`: ela lista as opções, não escolhe uma — e se valesse a primeira
 * palavra, o template sem editar declararia Baixa, e se valesse a última, declararia Alta e
 * passaria no fecho sem ninguém ter decidido nada.
 */
export function nivelDeFidelidade(valor) {
  const v = String(valor == null ? '' : valor)
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[`*_]/g, '').trim().toLowerCase();
  if (!v || v.includes('|')) return null;
  const m = /^(alta|media|baixa)\b/.exec(v);
  return m ? m[1] : null;
}

/**
 * Zona imutável — maquinário do template. Espelha harness.json; o teste cruza os dois.
 * Entrada terminada em `/` é diretório; sem barra é arquivo exato.
 *
 * `harness-zona.lock.json` é o manifesto da zona (Decisão 67): nasce na publicação e não existe no
 * template. Está aqui para o agente de um clone não o reescrever junto com a zona; o próprio
 * manifesto não entra no hash dele (`verificar-zona.mjs`).
 */
export const ZONA_IMUTAVEL = [
  'CLAUDE.md',
  'harness-zona.lock.json',
  '.claude/hooks/',
  '.claude/ferramentas/',
  '.claude/settings.json',
  '.claude/templates/',
  '.claude/rules/harness/',
  '.claude/agents/',
  '.claude/skills/',
];

/**
 * O caminho é absoluto? Três formas, e a fronteira é a mesma para todo o módulo: `exigirRelativo`
 * e `relativizar` leem daqui, e nenhum reimplementa o teste — duas definições de "absoluto" que
 * divergem produzem exatamente o furo que uma delas existe para fechar.
 *   - POSIX: começa com `/` (o que inclui o UNC já normalizado, `//servidor/share`)
 *   - UNC bruto, ainda com barra invertida: `\\servidor\share`
 *   - Windows com unidade: `C:/` ou `C:\`
 * `C:relativo` (sem barra depois da unidade) NÃO é absoluto — é caminho relativo à pasta atual
 * daquela unidade, e tratá-lo como absoluto faria as funções de decisão lançarem sobre entrada
 * que elas conseguem avaliar.
 */
function ehAbsoluto(p) {
  const s = String(p == null ? '' : p);
  return /^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('/') || /^\\\\/.test(s);
}

/**
 * Forma canônica do caminho: barra normal, `.` e `..` resolvidos, separador repetido colapsado,
 * barra final removida. TEXTUAL e PURA — não toca o disco, não consulta `process.cwd()`, e por
 * isso não resolve link simbólico. Isso é limitação assumida: o núcleo puro não pode ler disco
 * (restrição do módulo), e a defesa que interessa aqui é contra variação de escrita do caminho,
 * não contra travessia por link.
 *
 * Antes, `norm` normalizava barra e `./` e mais nada. Cada coisa que faltava era um bypass
 * reproduzido das travas: `outputs/../CLAUDE.md` não casava `CLAUDE.md`, `.claude//hooks/kit.mjs`
 * não casava `.claude/hooks/`. `path.normalize` do Node NÃO serve como substituto: ele é
 * dependente de plataforma (no Linux não trata `\` como separador), o que faria a trava responder
 * diferente conforme onde o CI roda.
 *
 * O PREFIXO ABSOLUTO é preservado intacto, e é a parte mais fácil de quebrar por engano:
 *   - `//servidor/share` mantém as DUAS barras. Colapsar `//` cegamente transformaria uma raiz de
 *     rede num caminho local homônimo, e os dois passariam a relativizar um contra o outro.
 *   - `C:/a` mantém a letra de unidade. Sem ela, `D:/repo` e `C:/repo` viram o mesmo projeto.
 *   - `/a/b` mantém a barra inicial, senão deixa de ser absoluto.
 *
 * `..` que sobe ALÉM da raiz da string é DESCARTADO, não propagado. A alternativa ingênua —
 * devolver `../CLAUDE.md` — faria a trava liberar, porque `../CLAUDE.md` não casa nenhuma entrada
 * da ZONA_IMUTAVEL. As funções de decisão recebem caminho já relativo à raiz do projeto: para
 * elas não existe "acima da raiz", e subir demais é entrada malformada cuja leitura conservadora
 * é a própria raiz. Quem precisa distinguir "fora do projeto" é `relativizar`, que trabalha com
 * absoluto: lá o `..` consome segmentos reais do caminho, o resultado deixa de estar sob a raiz,
 * e a resposta é `null` — como sempre foi.
 */
function norm(p) {
  const bruto = String(p == null ? '' : p).replace(/\\/g, '/');
  let prefixo = '';
  let resto = bruto;
  const unidade = /^([a-zA-Z]:)\//.exec(bruto);
  if (bruto.startsWith('//')) { prefixo = '//'; resto = bruto.slice(2); }
  else if (unidade) { prefixo = unidade[1] + '/'; resto = bruto.slice(unidade[0].length); }
  else if (bruto.startsWith('/')) { prefixo = '/'; resto = bruto.slice(1); }

  const segmentos = [];
  for (const seg of resto.split('/')) {
    // Segmento vazio é `//` colapsando ou barra final; `.` é ruído. Nenhum dos dois vira nada.
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { segmentos.pop(); continue; } // pop em vazio é no-op: o `..` é descartado
    segmentos.push(seg);
  }
  return prefixo + segmentos.join('/');
}

/**
 * Chave de comparação de caminho. DECISÃO DELIBERADA: insensível a caixa em TODA plataforma, não
 * só onde o sistema de arquivos é. Duas razões, e as duas valem sozinhas:
 *
 * 1. Uma trava cujo comportamento depende da plataforma é uma trava que passa no CI do Linux e
 *    falha na máquina do consultor no Windows — que é onde ela de fato roda. Foi assim que
 *    `outputs/Explore/hld-funcional.md` liberava escrita: o SO gravava no arquivo real, e na época
 *    em que o congelamento era lido da PROSA dos documentos isso apagava o carimbo — repetido nos
 *    cinco, o congelamento se desativava de vez. Hoje o congelamento é um marcador
 *    (`MARCADOR_CONGELAMENTO`) e esse caminho específico fechou; a escrita continua sendo negada
 *    pela mesma razão, e o argumento sobre plataforma vale igual.
 * 2. É uma sobre-aproximação SEGURA. No Linux, `outputs/Explore/` seria de fato outro diretório,
 *    e negar escrita nele é conservador e inofensivo — nenhum projeto sadio tem os dois.
 *
 * A chave é só para COMPARAR. O valor que `relativizar` devolve preserva a caixa original, porque
 * a mensagem de erro da trava tem que mostrar o caminho como o usuário o escreveu.
 *
 * RESSALVA — "segura" só vale do lado que NEGA. O texto acima afirmava "sobre-aproximação SEGURA"
 * sem separar os dois lados, e ela não é a mesma coisa nos dois.
 *
 * Onde a resposta `true` FECHA uma porta (`ehZonaImutavel`, `ehDoExplore`), a sobre-aproximação é
 * conservadora e inofensiva: negar escrita em `outputs/Explore/` num Linux que de fato tem os dois
 * diretórios custa nada, porque nenhum projeto sadio tem os dois.
 *
 * Onde a resposta `true` PERMITE (`ehWhitelistExplore`, e através dele `detectarFase`), ela
 * AFROUXA. Num Linux, `outputs/spec/Legacy/a.md` é um diretório DIFERENTE de `outputs/spec/legacy/`
 * e não deveria estar na whitelist do Explore; a comparação por `chave` o whitelista assim mesmo,
 * então escrever ali não caracteriza a fase Plan e o fecho do Explore não morde. No Windows — onde
 * o harness de fato roda — os dois são o mesmo diretório e não há diferença nenhuma.
 *
 * A assimetria é conhecida e aceita: o custo de errar para o lado permissivo aqui é um fecho que
 * não dispara num ambiente que este harness não usa, contra o custo de uma trava que se desativa
 * sozinha no ambiente que ele usa. Não "conserte" tornando `chave` dependente de plataforma sem
 * decisão explícita — foi exatamente essa dependência que produziu o bypass do item 1.
 *
 * É EXPORTADA porque a política é do harness inteiro, não deste módulo. O `cadeia.mjs` comparava
 * nome de artefato com `Set.has` cru e, medido, `outputs/spec/Data-Model.json` — o MESMO arquivo
 * neste FS — não casava `data-model.json`: falso positivo em cima de trabalho legítimo, que é o
 * pior erro deste harness. Quem precisar comparar caminho usa esta função; ninguém escreve o
 * segundo `toLowerCase()` à mão.
 */
export const chave = (p) => norm(p).toLowerCase();

/**
 * `p` está sob o diretório `dir`? Devolve o resto do caminho COM A CAIXA ORIGINAL, ou `null`.
 *
 * A comparação recorta `p` pelo tamanho do prefixo e só então aplica `chave` aos dois lados, em
 * vez de comparar `chave(p).startsWith(chave(prefixo))`. A forma é a mesma de `relativizar`, e é
 * LÁ que a justificativa vale — ver o JSDoc daquela função. Aqui o perigo não pode ocorrer: `sob`
 * só é chamada com `RAIZ_EXPLORE` e `RAIZ_SPEC`, que são constantes ASCII deste módulo, e nenhuma
 * letra ASCII muda de comprimento ao baixar a caixa. A forma é mantida idêntica de propósito, para
 * que as duas funções não pareçam discordar sobre como se compara prefixo de caminho — e para que
 * `sob` continue certa se um dia receber diretório vindo de fora.
 */
function sob(p, dir) {
  const prefixo = dir + '/';
  if (chave(p.slice(0, prefixo.length)) !== chave(prefixo)) return null;
  return p.slice(prefixo.length);
}

/**
 * Casa `rel` contra uma lista de entradas arquivo-exato ou diretório-prefixo.
 * Toda comparação passa por `chave` — normalizada e sem sensibilidade a caixa. Nenhum chamador
 * precisa lembrar de normalizar antes; esquecer disso era metade dos bypasses.
 */
function casa(rel, entradas) {
  const r = chave(rel);
  return entradas.some((entrada) => {
    const e = chave(entrada);
    // `chave` come a barra final, então o marcador de "isto é diretório" tem que ser lido na
    // entrada BRUTA, antes de normalizar — senão `.claude/hooks/` vira arquivo exato e a trava
    // deixa de cobrir o conteúdo do diretório.
    if (!entrada.endsWith('/')) return r === e;
    // Diretório: casa tanto o conteúdo (`r.startsWith(e + '/')`) quanto o próprio diretório sem
    // barra final (`r === e`) — um comando que move ou remove a pasta inteira não escapa da trava
    // só porque não terminou o argumento com `/`.
    return r === e || r.startsWith(e + '/');
  });
}

/**
 * As cinco funções de decisão deste módulo (`ehZonaImutavel`, `ehWhitelistExplore`, `ehDoExplore`,
 * `detectarFase`, `validadorPara`) só aceitam caminho relativo à raiz do projeto: repassar o
 * absoluto sem tratar já causou os dois lados do mesmo defeito — a zona imutável libera escrita
 * (porque nada bate com `C:/repo/CLAUDE.md`) e o gate de fase nega artefato legítimo (porque
 * `outputs/explore/...` também não bate). Falhar fechado aqui significa lançar, não adivinhar.
 *
 * O FORMATO OBSERVADO de `tool_input.file_path` no PreToolUse do Claude Code é absoluto. Isso é
 * observação, não garantia do protocolo, e a defesa NÃO depende dela: `relativizar` trata caminho
 * não-absoluto como já relativo à raiz do projeto e o devolve normalizado, de modo que um
 * `file_path` relativo continua chegando aqui em forma avaliável. A versão anterior deste
 * comentário afirmava "só entrega ABSOLUTO — nunca relativo" como fato, e a trava inteira se
 * apoiava nisso: `relativizar` devolvia `null` para relativo, e `null` no `pretooluse.mjs` LIBERA.
 * `file_path: 'CLAUDE.md'` contornava as duas travas por causa dessa premissa.
 *
 * O teste roda sobre a entrada BRUTA, de propósito: a mensagem de erro tem que mostrar o caminho
 * exatamente como o chamador o passou, senão ela aponta para uma string que ninguém escreveu.
 */
function exigirRelativo(p, nomeFuncao) {
  if (ehAbsoluto(p)) {
    throw new Error(
      `${nomeFuncao}: recebeu caminho absoluto ("${String(p == null ? '' : p)}"); as funções de ` +
      'decisão do kit só aceitam caminho relativo à raiz do projeto — use ' +
      'relativizar(raizProjeto, caminho) antes de chamar.',
    );
  }
}

/**
 * O caminho está sob `outputs/spec/`? Se não, LANÇA dizendo o que usar no lugar.
 *
 * Irmã do `exigirRelativo`, e existe pela mesma razão: a convenção de `fatos.spec` — caminho
 * relativo à raiz do projeto COM o prefixo `outputs/spec/` — era só documentação, e documentação
 * não impediu que o defeito acontecesse DUAS vezes. O `inventariar` devolve o nome SEM o prefixo;
 * quem esquece de mapear não quebra nada visivelmente: `ehWhitelistExplore` responde `false` para
 * tudo, a `WHITELIST_EXPLORE` fica INERTE, e qualquer arquivo em `outputs/spec/` — o `sync-log.md`
 * que o próprio kickoff escreve, inclusive — passa a caracterizar fase Plan num projeto que está
 * em Explore. O `cadeia.mjs` achou e consertou isso na Task 6; o bloco de plano correspondente não
 * foi atualizado, e a Task 8 copiou dali e redescobriu o mesmo defeito do zero.
 *
 * NÃO troque isto por `p.startsWith(RAIZ_SPEC + '/')`, e esta é a parte importante. A whitelist
 * normaliza caixa e travessia de propósito — `outputs/SPEC/sync-log.md` e
 * `outputs/spec/legacy/../context-map.md` são caminhos válidos que `ehWhitelistExplore` aceita
 * hoje, com teste que prende os dois. Um `startsWith` cru recusaria os dois e produziria FALSO
 * POSITIVO dentro de um verificador bloqueante (o `cadeia.mjs`), que sob o modelo de ameaça deste
 * projeto — acidente e deriva, não adversário — é pior que qualquer bypass exótico. Por isso a
 * guarda reusa exatamente o `sob(norm(p), RAIZ_SPEC)` que o `ehWhitelistExplore` usa uma linha
 * abaixo: a mesma normalização decide as duas perguntas, e elas não podem divergir.
 *
 * Tem um chamador só (`detectarFase`) contra os três do `exigirRelativo`. Continua sendo função
 * nomeada, e não código inline, por duas razões: a simetria com o `exigirRelativo` diz ao próximo
 * leitor que validar a entrada é o mecanismo normal desta família, e este JSDoc precisa de um lugar
 * onde quem for editar a guarda o encontre antes de "simplificá-la" para um `startsWith`.
 *
 * A mensagem cita a entrada BRUTA, como o `exigirRelativo`: ela tem que mostrar o caminho como o
 * chamador o escreveu, senão aponta para uma string que ninguém digitou.
 */
function exigirSobSpec(p, nomeFuncao) {
  if (sob(norm(p), RAIZ_SPEC) == null) {
    throw new Error(
      `${nomeFuncao}: recebeu "${String(p == null ? '' : p)}", que não está sob ${RAIZ_SPEC}. ` +
      'fatos.spec exige o caminho relativo à raiz do projeto COM o prefixo — monte o Set com ' +
      'new Set([...inventariar(join(raiz, RAIZ_SPEC))].map((r) => `${RAIZ_SPEC}/${r}`)).',
    );
  }
}

/**
 * Caminho de `caminho` relativo a `raizProjeto`, com barra normal e travessia resolvida. Esta é a
 * única conversão que existe entre o `file_path` que o PreToolUse entrega e o caminho relativo que
 * `ehZonaImutavel`, `ehWhitelistExplore`, `ehDoExplore`, `detectarFase` e `validadorPara` exigem —
 * chame isto primeiro, sempre.
 *
 * Três respostas, e a diferença entre elas é a trava inteira:
 *   - caminho NÃO absoluto → ele já é relativo à raiz do projeto; devolve normalizado. Nunca
 *     `null`. Antes devolvia `null` (não começava com a raiz), e `null` no `pretooluse.mjs`
 *     LIBERA: era o bypass de `file_path: 'CLAUDE.md'`.
 *   - absoluto sob a raiz → o trecho relativo, COM A CAIXA ORIGINAL preservada. A comparação com
 *     a raiz é por `chave` (ver ali), então raiz e caminho podem divergir na caixa; o que volta é
 *     o texto do usuário, porque é ele que aparece na mensagem de erro da trava.
 *   - absoluto fora da raiz → `null`. Inclui o caminho cuja travessia ESCAPA da raiz
 *     (`C:/repo/../outro/x.md`): `norm` já o resolveu para `C:/outro/x.md`, que não está sob a
 *     raiz. Antes, sem resolver `..`, ele passava no `startsWith` e voltava como `../outro/x.md`
 *     — um caminho fora do projeto entregue às travas como se estivesse dentro.
 *
 * O RECORTE VEM ANTES DE BAIXAR A CAIXA, e não o contrário. `toLowerCase()` pode MUDAR O
 * COMPRIMENTO da string em Unicode (`'İ'.toLowerCase().length === 2`), e a raiz do projeto é um
 * caminho de disco arbitrário — `C:/İrepo` é entrada perfeitamente possível, ao contrário do
 * diretório que `sob` recebe, que é sempre constante ASCII deste módulo. A versão ingênua
 * (`chave(c).startsWith(chave(prefixo))` e depois `c.slice(chave(prefixo).length)`) mede o índice
 * na string MINÚSCULA e recorta a ORIGINAL: com `İ` na raiz o índice anda uma posição a mais e o
 * relativo devolvido perde a primeira letra — `LAUDE.md` em vez de `CLAUDE.md`, que não casa
 * `CLAUDE.md` na ZONA_IMUTAVEL e portanto LIBERA a escrita no maquinário do template.
 *
 * ESTA É A RESOLUÇÃO TEXTUAL, e ela é o caminho de RECUO. A resolução de produção é por identidade
 * de arquivo (`relativizarPorIdentidade`, na casca de I/O deste mesmo módulo): ela pergunta ao
 * sistema de arquivos quem é quem, e é ela que fecha a família de aliases do Windows (`\\?\`,
 * `\\.\`, UNC administrativo, stream do NTFS, nome curto 8.3) que NENHUMA canonização por string
 * fechou em três tentativas. Esta função continua valendo, e é usada, quando a identidade não pode
 * responder — sistema de arquivos sem `ino` confiável, por exemplo. Ali a defesa volta a ser
 * textual, com as limitações que isso traz. Não tente reabsorver a resolução de aliases para cá: o
 * núcleo puro não lê disco, e sem ler disco a resposta certa não existe.
 */
export function relativizar(raizProjeto, caminho) {
  const raiz = norm(raizProjeto); // `norm` já remove a barra final
  const c = norm(caminho);
  if (!ehAbsoluto(c)) return c;
  if (chave(c) === chave(raiz)) return '';
  // Raiz no topo do sistema de arquivos (`/`, `C:/`, `//`) já termina em barra; concatenar outra
  // produziria `//` e o prefixo nunca casaria.
  const prefixo = raiz.endsWith('/') ? raiz : raiz + '/';
  if (chave(c.slice(0, prefixo.length)) !== chave(prefixo)) return null;
  return c.slice(prefixo.length);
}

/**
 * O caminho está na whitelist do Explore? Recebe caminho relativo à raiz do projeto, COM o
 * prefixo `outputs/spec/` — mesma convenção usada por `ehZonaImutavel`, `detectarFase` e
 * `validadorPara`. Só responde sobre caminhos dentro de outputs/spec/; fora disso devolve `false`.
 * Lança se `relPath` vier absoluto — ver `exigirRelativo`.
 */
export function ehWhitelistExplore(relPath) {
  exigirRelativo(relPath, 'ehWhitelistExplore');
  const dentro = sob(norm(relPath), RAIZ_SPEC);
  if (dentro == null) return false;
  return casa(dentro, WHITELIST_EXPLORE);
}

/** O caminho é maquinário do template? Recebe caminho relativo à raiz do projeto; lança se vier
 * absoluto — ver `exigirRelativo`. */
export function ehZonaImutavel(relPath) {
  exigirRelativo(relPath, 'ehZonaImutavel');
  return casa(norm(relPath), ZONA_IMUTAVEL);
}

/** O caminho casa alguma destas entradas? A MESMA normalização e o mesmo casamento da zona
 * imutável, para quem precisa guardar um caminho avulso — o marcador do template (zonas.mjs) — sem
 * reimplementar caixa, `./` e `..`. Lança se vier absoluto — ver `exigirRelativo`. */
export function casaAlgum(relPath, entradas) {
  exigirRelativo(relPath, 'casaAlgum');
  return casa(norm(relPath), entradas);
}

/**
 * O caminho é o diretório do Explore ou algo dentro dele? Relativo à raiz; lança se absoluto.
 *
 * Existe para que ninguém mais escreva `p.startsWith(RAIZ_EXPLORE + '/')` à mão — `zonas.mjs` e
 * `pretooluse.mjs` fazem isso hoje, em dois lugares, e perdem o que `casa()` já garante: casar
 * também o DIRETÓRIO sem barra final, para que um comando que move ou remove a pasta inteira não
 * escape da trava só porque não terminou o argumento com `/`. A troca desses dois `startsWith` é
 * da rodada B do wiring; esta função só nasce aqui.
 */
export function ehDoExplore(relPath) {
  exigirRelativo(relPath, 'ehDoExplore');
  return casa(norm(relPath), [RAIZ_EXPLORE + '/']);
}

/**
 * O caminho PODERIA ser do Explore de alguma raiz de artefatos? Superset de `ehDoExplore`.
 *
 * A DIFERENÇA ENTRE AS DUAS É A ÂNCORA. `ehDoExplore` ancora no começo do caminho, porque quem o
 * chama já resolveu a raiz dos artefatos — e é ele que DECIDE. Esta aceita o segmento em qualquer
 * profundidade, porque quem a chama ainda NÃO resolveu a raiz: num workspace multi-repo os
 * artefatos moram em `<cwd>/<repo-de-docs>/outputs/…`, e `portal-docs/outputs/explore/gaps.md`
 * relativo à `cwd` é `outputs/explore/gaps.md` relativo à raiz dos artefatos.
 *
 * PARA QUE ELA SERVE, e é uma coisa só: decidir se vale gastar disco. A trava do congelamento
 * (`pretooluse.mjs`) precisa da raiz dos artefatos para julgar, e descobri-la custa um
 * `lerDiretorio`. Pagar isso em TODA escrita do projeto é o que a ordem "pertencimento primeiro,
 * I/O depois" existe para evitar — então a trava pergunta primeiro aqui, que é puro, e só continua
 * se a resposta for `true`. O que ela NUNCA faz é decidir a trava: um `true` autoriza olhar, não
 * negar. Quem nega é `ehDoExplore` sobre o caminho já relativo à raiz certa.
 *
 * SUPERSET, E A DIREÇÃO IMPORTA: ela aceita mais do que `ehDoExplore`, nunca menos. Um `false`
 * daqui libera a escrita sem consultar o disco, então errar para o lado estreito seria abrir a
 * trava; errar para o lado largo custa um `lerDiretorio` desnecessário e mais nada.
 *
 * A comparação passa por `norm` (resolve `..`, unifica separador) e por `casa`/`chave` (caixa), como
 * todas as outras deste módulo. O `..` não é detalhe: um pré-filtro escrito sobre o texto BRUTO
 * deixaria passar `outputs/spec/../explore/gaps.md`, que É do Explore, e a trava liberaria.
 */
export function podeSerDoExplore(relPath) {
  exigirRelativo(relPath, 'podeSerDoExplore');
  const p = norm(relPath);
  if (casa(p, [RAIZ_EXPLORE + '/'])) return true;
  // Qualquer prefixo de diretório, e não só um segmento: a resposta é "vale olhar", e restringir a
  // um nível seria embutir aqui uma suposição sobre o layout que só o `descobrirWorkspace` conhece.
  const k = chave(p);
  const alvo = chave(RAIZ_EXPLORE);
  return k.includes(`/${alvo}/`) || k.endsWith(`/${alvo}`);
}

/**
 * Destruição catastrófica — o que não volta. Hoje é uma linha só: o histórico do repositório.
 *
 * ISTO NÃO É `ZONA_IMUTAVEL`, e a separação é de desenho, não de arrumação. A semântica de lá é
 * "maquinário do template, atualizado por sobrescrita", e a mensagem que ela produz manda a
 * mudança para o template e o `git checkout` de volta ao HEAD — as duas coisas erradas para o
 * `.git`, que não é maquinário e cuja perda o próprio git não desfaz. Enfiar `.git/` naquela
 * tabela pouparia cinco linhas e devolveria ao consultor uma instrução impossível.
 *
 * A pergunta que esta tabela responde é outra e é curta: **o que, destruído, não é recuperável
 * por nenhuma das saídas que o harness conhece?** `outputs/` volta do git; a zona imutável volta
 * do template; `.git` não volta de lugar nenhum. Se um dia esta lista crescer, cada linha nova
 * precisa passar por essa pergunta — não por "também seria chato perder".
 *
 * CUSTO ASSUMIDO: `rm .git/index.lock`, que é manutenção legítima de repositório travado, passa a
 * ser negado. A saída é o terminal, fora do agente, e a mensagem do consumidor a diz.
 */
export const DESTRUICAO_CATASTROFICA = ['.git/'];

/** O caminho é o histórico do repositório, ou parte dele? Relativo à raiz; lança se absoluto. */
export function ehDestruicaoCatastrofica(relPath) {
  exigirRelativo(relPath, 'ehDestruicaoCatastrofica');
  return casa(norm(relPath), DESTRUICAO_CATASTROFICA);
}

/**
 * As raízes que este harness protege. `ZONA_IMUTAVEL` e `DESTRUICAO_CATASTROFICA` são protegidas
 * SEMPRE; `outputs/explore/` só quando o marcador de congelamento existe — e é por isso que esta
 * lista é de CANDIDATOS, não de veredito. Quem pergunta ao disco é a casca; o núcleo puro não
 * sabe se o Explore está congelado.
 *
 * `.git/` entra aqui, e não só em `ehDestruicaoCatastrofica`, porque a política é a mesma lida na
 * outra direção: `rm -rf .` alcança o histórico do mesmo jeito que alcança o `CLAUDE.md`. Política
 * mora no módulo de autoridade; consumidor não decide sozinho que uma tabela vale para nomeação e
 * não vale para contenção.
 *
 * `RAIZ_SPEC` NÃO entra: a whitelist do Explore governa em que FASE se pode escrever ali, não
 * imutabilidade. Apagar `outputs/spec/` é perder trabalho do projeto, e o dono dessa decisão é o
 * git, não esta trava.
 */
const RAIZES_PROTEGIDAS = [...ZONA_IMUTAVEL, RAIZ_EXPLORE + '/', ...DESTRUICAO_CATASTROFICA];

/**
 * Os caminhos protegidos que estão DENTRO de `relPath`. Relativo à raiz; `''`, `.` e `./` são a
 * raiz do projeto e contêm todos. Lança se `relPath` vier absoluto — ver `exigirRelativo`.
 *
 * A DIREÇÃO DE CONTENÇÃO, e por que ela precisa existir. `ehZonaImutavel` e `ehDoExplore`
 * respondem "este caminho É protegido?", e quem NOMEIA um caminho protegido é pego por elas.
 * Medido executando: `rm -rf .`, `rm -rf *`, `rm -rf ./` e `cd .. && rm -rf <projeto>` não nomeiam
 * nada — a zona imutável lista caminhos DENTRO do projeto, e a raiz não é nenhum deles. Os quatro
 * passavam. Remover uma árvore que contém caminho protegido é remover o caminho protegido; isso
 * não é regra nova, é a mesma regra lida na outra direção.
 *
 * DEVOLVE CAMINHOS, NÃO BOOLEANO, e essa é a decisão de desenho desta função. Um `contém: sim/não`
 * seria mais curto e estaria errado por dois motivos:
 *   - o Explore só está protegido quando o marcador existe. Com booleano, o chamador teria que
 *     reimplementar "isto aqui é do Explore? então pergunte ao disco" — uma SEGUNDA cópia da
 *     política, ao lado da que já existe em `protegido()`. Devolvendo o caminho, o chamador
 *     REPERGUNTA ao mesmo oráculo, e a contenção herda o congelamento em vez de duplicá-lo;
 *   - a mensagem de negação precisa dizer O QUE está lá dentro. "`rm -rf .` contém `CLAUDE.md`"
 *     é acionável; "o alvo contém algo protegido" manda o consultor adivinhar.
 *
 * A BARRA EM `dentro` FAZ DUAS COISAS, e as duas são a função inteira:
 *   - impede prefixo parcial. Sem ela, `skill` "conteria" `skills/` e `.claude/hook` conteria
 *     `.claude/hooks/` — o mesmo defeito que `casa()` evita do outro lado da comparação;
 *   - faz CONTER SER ESTRITO: o caminho não contém a si mesmo, porque `.claude/hooks` não começa
 *     com `.claude/hooks/`. Isso está certo — quem responde "este caminho É protegido" é
 *     `ehZonaImutavel`. Duas funções respondendo a mesma pergunta divergem, e a que divergisse por
 *     último seria a trava. (Uma guarda explícita `k !== alvo` foi tentada e é MORTA: a barra já
 *     garante isso, e mutação sobre ela não derruba teste nenhum. Não a acrescente de volta.)
 */
export function protegidosContidosEm(relPath) {
  exigirRelativo(relPath, 'protegidosContidosEm');
  const alvo = chave(relPath);
  const dentro = alvo === '' ? '' : alvo + '/'; // a raiz normaliza para '' e contém tudo
  return RAIZES_PROTEGIDAS.filter((p) => chave(p).startsWith(dentro));
}

/** Documentos obrigatórios do Explore que ainda não existem. */
export function faltantesExplore(presentesExplore) {
  const presentes = presentesExplore || new Set();
  return DOCS_EXPLORE
    .filter((d) => d.obrigatorio && !presentes.has(d.caminho))
    .map((d) => ({ caminho: d.caminho, rotulo: d.rotulo }));
}

/**
 * Em que fase o projeto está. Precedência: deliver > plan > explore.
 *
 * Deliver: existe marcador de US aberta, ou o manifesto declara repositório com papel `codigo`.
 * Plan: houve escrita em outputs/spec/ FORA da whitelist do Explore — o primeiro compromisso
 *       irreversível. Escrever context-map.md em delta é não-destrutivo e não caracteriza Plan.
 * Explore: todo o resto, inclusive projeto zerado.
 *
 * Convenção única: `fatos.spec` contém caminhos relativos à RAIZ DO PROJETO, com o prefixo
 * `outputs/spec/` — o mesmo formato que `ehWhitelistExplore`, `ehZonaImutavel` e `validadorPara`
 * exigem. Não existe mais tolerância de segunda convenção (nome nu relativo a `outputs/spec/`
 * sem prefixo); quem monta `fatos.spec` a partir de `inventariar('outputs/spec')` precisa
 * prefixar cada nome com `outputs/spec/` antes de colocar no Set.
 *
 * A convenção é VERIFICADA, não só documentada: lança se algum caminho do Set vier absoluto (ver
 * `exigirRelativo`) e lança se algum não estiver sob `outputs/spec/` (ver `exigirSobSpec` — e leia
 * o JSDoc de lá antes de mexer na guarda). Documentar a convenção é o que já existia, e não
 * impediu que o mesmo defeito acontecesse duas vezes; esquecer o prefixo não quebrava nada
 * visivelmente, só deixava a `WHITELIST_EXPLORE` inerte e transformava todo projeto com kickoff
 * em fase Plan.
 *
 * Pacote de fatos: `{ spec: Set, temMarcadorUS: boolean, temRepoCodigo: boolean }`.
 */
export function detectarFase(fatos) {
  const f = fatos || {};
  if (f.temMarcadorUS || f.temRepoCodigo) return 'deliver';
  const spec = f.spec || new Set();
  for (const rel of spec) {
    exigirRelativo(rel, 'detectarFase');
    exigirSobSpec(rel, 'detectarFase');
    if (!ehWhitelistExplore(rel)) return 'plan';
  }
  return 'explore';
}

/** Qual validador cobre este arquivo. Recebe caminho relativo à raiz do projeto; lança se vier
 * absoluto — ver `exigirRelativo`. `null` = nenhum dedicado. */
export function validadorPara(relPath) {
  exigirRelativo(relPath, 'validadorPara');
  const p = norm(relPath);
  // Toda comparação por `chave`: qual validador cobre um arquivo não pode depender da caixa com
  // que o caminho foi escrito, senão `outputs/Explore/gaps.md` passa sem validador nenhum.
  const noExplore = sob(p, RAIZ_EXPLORE);
  if (noExplore != null) {
    return DOCS_EXPLORE.some((d) => chave(d.caminho) === chave(noExplore)) ? 'check-explore' : null;
  }
  const naSpec = sob(p, RAIZ_SPEC);
  if (naSpec == null) return null;
  const rel = chave(naSpec);
  if (rel === 'flow-map.md') return 'check-flowmap';
  if (rel === 'prototype.md' || rel === 'modules.md') return 'check-modules';
  return null;
}

/**
 * Gramática dos IDs do Explore. Fonte única — `fecho-explore`, `gramatica`, `revisao.mjs` e
 * `promocao.mjs` leem daqui, e nenhum reimplementa.
 *
 * Módulo é DERIVADO da regex do validador do kit (`check-modules.py`), não uma cópia literal: o
 * kit usa `MOD-[A-Z0-9\-]+`, que ACEITA terminar em hífen; aqui usamos `MOD-[A-Z0-9-]*[A-Z0-9]`,
 * que PROÍBE. A divergência é deliberada — `MOD-PAG-` é typo de digitação, não código de módulo,
 * e o Explore recusa o que o kit aceitaria. `MOD-PAGAMENTOS` e `MOD-ACOMP-CARGA` são válidos nos
 * dois lados — `MOD-XXX` sempre foi notação de placeholder, nunca restrição de três letras;
 * o que muda é só o caractere final. Consequência assumida: existe string que `check-modules.py`
 * aceitaria e este harness recusa. Isso é escolha de endurecimento, não descuido de sincronização
 * — não "conserte" reaproximando as duas regex sem decisão explícita.
 *
 * Numeração com três dígitos, quatro tolerados. Documento de pré-projeto passa de 99 RF, e
 * padding fixo é o que faz relatório ordenar certo: sem ele, `RF-010` vem antes de `RF-007`.
 * Espelha o kit, que numera `RF-MOD-COBRANCA-014` por módulo — a promoção fica contínua.
 *
 * O último caractere do código de módulo não pode ser hífen: `MOD-PAG-` é typo, não código.
 */
export const ID_PADRAO = Object.freeze({
  MOD: 'MOD-[A-Z0-9-]*[A-Z0-9]',
  RF: 'RF-\\d{3,4}',
  RN: 'RN-\\d{3,4}',
  GAP: 'GAP-\\d{3,4}',
});

/** `F-xxx` é fato atômico da `spec-ingest` e é PROIBIDO em outputs/explore/ (Decisão 8). */
export const ID_PROIBIDO_NO_EXPLORE = 'F-\\d{3,4}';

export const FAMILIAS_EXPLORE = Object.freeze(['MOD', 'RF', 'RN', 'GAP']);

/**
 * As famílias de ID que o kit produz no Plan. Tabela IRMÃ de `ID_PADRAO`, e separada dela de
 * propósito: `extrairIds` é consultado por código bloqueante, e alargar a tabela dele mudaria o
 * que uma trava enxerga. Duas tabelas, dois extratores, uma única `varrer` — as fronteiras de
 * palavra são as mesmas nos dois.
 *
 * `FATO` NÃO REPETE O PADRÃO: ele aponta para `ID_PROIBIDO_NO_EXPLORE`, que já é a definição de
 * `F-xxx` neste arquivo. O mesmo padrão com dois nomes é intencional — no Explore ele é o que se
 * PROÍBE, no Plan é o que se EXTRAI —, mas com uma definição só, senão os dois divergem.
 *
 * `RNF` ESPELHA A FORMA DE `RF_KIT`, trocando o segmento `MOD-` pela categoria ISO/IEC 25010. A
 * fonte é o template real da `spec-product`
 * (`skills/spec-product/templates/requirements-functional.md`): a seção
 * `## Requisitos Não Funcionais (negócio)` abre blocos `### RNF-[CATEGORIA]-001: [Título]` — donde
 * `RNF-PERF-001`, `RNF-SEG-002` —, cada bloco com a SUA PRÓPRIA linha `**Rastreabilidade:**`, e a
 * tabela de rastreio global tem cabeçalho `Rastreabilidade global (RF / RNF)` com uma coluna
 * `Tipo` que oferece `RF` ou `RNF`. Um RNF que cita um `F-xxx` é consumidor legítimo daquele fato,
 * e sem esta entrada ele era descartado em silêncio: o fato saía como "colhido e esquecido"
 * embora tivesse consumidor declarado.
 *
 * `RN_NOVO` ACEITA O DOMÍNIO, com a mesma gramática do código de módulo, e ele é OPCIONAL. O
 * template real da `spec-product` (`skills/spec-product/templates/business-rules.md`) abre
 * `#### RN-NOVO-[DOMÍNIO]-001` — donde `RN-NOVO-DESCONTO-001`, `RN-NOVO-CREDITO-002` —, e o padrão
 * `RN-NOVO-\d{2,4}` que estava aqui não reconhecia essa forma: no teste ponta a ponta da 2.6.0 as
 * regras novas do projeto inteiro não existiam para a promoção (D14). A forma sem domínio
 * (`RN-NOVO-004`), que o kit também usa em exemplos, continua valendo. O domínio não termina em
 * hífen (`RN-NOVO-DESCONTO--001` é typo, como `MOD-PAG-`), e o placeholder do template
 * (`RN-NOVO-[DOMÍNIO]-001`) não casa — um template intocado não consome fato.
 */
export const ID_PADRAO_PLAN = Object.freeze({
  RF_KIT: 'RF-MOD-[A-Z0-9-]*[A-Z0-9]-\\d{2,4}',
  RN_NOVO: 'RN-NOVO-(?:[A-Z0-9-]*[A-Z0-9]-)?\\d{2,4}',
  RNF: 'RNF-[A-Z0-9-]*[A-Z0-9]-\\d{2,4}',
  FATO: ID_PROIBIDO_NO_EXPLORE,
});

export const FAMILIAS_PLAN = Object.freeze(['RF_KIT', 'RN_NOVO', 'RNF', 'FATO']);

/** IDs de família do Plan presentes no texto. Espelha `extrairIds`, sobre a tabela irmã. */
export function extrairIdsPlan(familia, texto) {
  const p = ID_PADRAO_PLAN[familia];
  return p ? varrer(p, texto) : [];
}

/**
 * Os dois artefatos do Plan que a cobertura de promoção cruza, relativos a `RAIZ_SPEC`.
 *
 * OS SUBDIRETÓRIOS NÃO SÃO ENFEITE, e errá-los produz relatório 100% falso com aparência de
 * autoridade. A fonte é a tabela `ARTIFACTS` do `skills/tools/check-outputs.py` do kit, que é o
 * validador que REPROVA; o `paths.md` do mesmo kit lista `requirements.md` na raiz e está errado.
 * Entre prosa e validador, manda o validador.
 */
export const ARTEFATOS_DE_PROMOCAO = Object.freeze({
  contextMap: 'context-map.md',
  requisitos: 'requirements/requirements.md',
});

/**
 * O terceiro artefato que a promoção LÊ, relativo a `RAIZ_SPEC` — e que fica FORA de
 * `ARTEFATOS_DE_PROMOCAO` de propósito.
 *
 * É onde as regras novas consomem fato: o `RN-nnn` do Explore vira `RN-NOVO-<DOMÍNIO>-NNN` aqui, com
 * o `F-xxx` na linha **Origem** do bloco (template `spec-product/templates/business-rules.md`). Até
 * o D14 do teste ponta a ponta da 2.6.0 a promoção só lia o `requirements.md`, e as RN do Explore
 * saíam ÓRFÃS com o `business-rules.md` completo.
 *
 * POR QUE NÃO ENTRA NA TABELA DE CIMA: aquela é a lista de artefatos cuja AUSÊNCIA suprime
 * categoria do relatório (sem eles, órfão e fato sem consumidor são efeito da ausência, não achado).
 * Este é complementar: sem ele as RN-NOVO só deixam de contar como consumidoras, e o relatório diz
 * isso em uma linha em vez de suprimir o que o `requirements.md` mediu. A raiz de `outputs/spec/`
 * é a forma que o `check-outputs.py` cobra (`"business-rules.md"`, obrigatório).
 */
export const REGRAS_DE_PROMOCAO = 'business-rules.md';

/**
 * O que vai para a wiki do cliente (Decisão 19: lista de INCLUSÃO, nunca de exclusão).
 *
 * POR QUE INCLUSÃO: lista de exclusão apodrece em silêncio. O dia em que o kit ganhar um artefato
 * de máquina novo — e ele ganhou `screens-manifest.json`, `revisao.json` e
 * `_explore-congelado.md` sem que nada avisasse —, uma lista de exclusão publica esse artefato na
 * wiki do cliente e ninguém percebe até o cliente perguntar o que é.
 *
 * OS DO EXPLORE VÊM DE `DOCS_EXPLORE`, não são reescritos: uma segunda lista dos mesmos cinco
 * documentos diverge no primeiro dia em que um deles mudar de nome.
 *
 * OS DO PLAN SÃO NOMEADOS, e a ausência de `revisao.json`, `screens-manifest.json`,
 * `_explore-congelado.md` e `auditorias/` é DELIBERADA — são artefatos de máquina, do harness ou
 * do gate, e não têm por que chegar ao cliente.
 *
 * A FONTE DE CADA CAMINHO É `skills/tools/check-outputs.py` (a tabela `ARTIFACTS` +
 * `PIPELINE_ARTIFACTS`) e, onde aquele script não cobre o artefato, o `SKILL.md` da skill que o
 * produz — nunca o `paths.md` do mesmo kit, que erra a forma de três artefatos da `spec-product`
 * (lista plana onde o validador exige subdiretório). CORREÇÕES SOBRE UM PRIMEIRO LEVANTAMENTO
 * DESTA LISTA, medidas contra essas fontes e não contra a prosa de nenhum resumo:
 *   - `tech-rules-summary.md` mora em `tech-rules/tech-rules-summary.md`, não na raiz —
 *     `spec-tech-rules/SKILL.md` nomeia o subdiretório duas vezes;
 *   - `estimate-report.md` mora em `estimate/estimate-report.md`, não na raiz — é a própria forma
 *     que `check-outputs.py` cobra (`"estimate/estimate-report.md"` na tabela `ARTIFACTS`);
 *   - `plano-de-seguranca.md` ENTRA: é o kernel TO-BE que a skill `revisao-de-seguranca` (migrada
 *     do v1) escreve em `outputs/spec/plano-de-seguranca.md`, e `cadeia.mjs` já o cobra de
 *     `spec-security-review` (a `RAZAO_EXTRA` do mesmo arquivo diz que esta skill CONSOME o
 *     kernel em vez de derivar) — entregável, mesmo a skill que o produz ainda não tendo chegado
 *     neste harness;
 *   - `security-review.md` SAI: é relatório de auditoria interno (findings, análise por story,
 *     cross-cutting — `spec-security-review/SKILL.md`), não o plano de segurança. Uma lista de
 *     inclusão carrega o que se escolheu; ele tinha entrado por engano no lugar do kernel;
 *   - `threat-model.md` ENTRA: é `COND_LEGACY` em `check-outputs.py` junto com `legacy.md`,
 *     `architecture.md` e `legacy-analysis.md` — as quatro são entregáveis do mesmo pacote de
 *     legado, e as outras três já estavam aqui.
 *   - `capa.md` e `report/product-discovery-kit.html` ENTRAM: moram em `"spec-report (opcional)"`
 *     em `check-outputs.py:140-141` — mas "opcional" NÃO É RAZÃO DE EXCLUSÃO desta lista:
 *     `modules.md`, `test-plan.md`, `design-system.md`, `prototype.md` e `gaps-document.md` já
 *     estão aqui sendo `OPTIONAL` na mesma tabela, e o critério de inclusão é "é entregável
 *     escolhido para o cliente", nunca obrigatoriedade. O `product-discovery-kit.html` é o
 *     entregável de cliente mais explícito do kit: este harness já o chama de entregável do Plan
 *     em dois lugares (`explore.md:162` — "O `product-discovery-kit.html` não é entregável do
 *     Explore — é do Plan" — e `plan.md:22`), e é a entrega compilada para o cliente. `capa.md` é
 *     o insumo dele — sem capa não há kit compilado. O subdiretório `report/` é a forma exata que
 *     `check-outputs.py` cobra; `capa.md` fica na raiz de `outputs/spec/`.
 *   - `hld.md` ENTRA, e ele é a resposta ao que este comentário reservava para
 *     `arquitetura-solucao.md`. O item 1 da seção 8 pedia que a `spec-tech-rules` emitisse a face
 *     para stakeholder e wiki que a Decisão 6 diz faltar; **o produtor chegou com outro nome, do
 *     upstream em vez de nós** (Decisão 33 do Plano 4): a `spec-hld` (Fase 6.6) emite `hld.md` com
 *     C4 níveis 1 e 2 em Mermaid, RNF → tática e ADRs, e o `check-outputs.py` o cobra como
 *     `OPTIONAL` com gate `HLD_VALID`. `arquitetura-solucao.md` morreu como ideia, e não é
 *     omissão desta lista: adotar o nome do kit em vez de batizar o artefato dele com nome nosso
 *     é o que evita dois donos de um nome. Mora na raiz de `outputs/spec/`.
 *
 * FICAM DE FORA, e por quê (para ninguém "consertar" isso de novo sem saber):
 *   - `security-review.md`: fica fora por SER relatório de auditoria interno, não por não
 *     existir — ver acima.
 *   - `report/tasks.html`, `data-model.json` e `api-contracts.yaml`: FICAM DE FORA POR DECISÃO,
 *     não por omissão. São artefato de TIME TÉCNICO — HTML de acompanhamento de backlog
 *     (`tasks.html`) e contratos em JSON/YAML de dado e API —, não narrativa de cliente. Registrar
 *     aqui é o que evita que alguém os "encontre faltando" de novo e os acrescente por engano.
 *
 *     E a partir do Plano 4 há a IRMÃ desta exclusão, que a explica melhor do que ela se explicava
 *     sozinha: `data-model.md` ENTRA. É o MESMO modelo, na forma que o cliente lê — gerado do JSON
 *     pelo passo O da `spec-data-model`, nunca editado à mão. A razão que exclui o JSON (contrato
 *     técnico, consumido por `spec-api-contracts` e `spec-tasks`) é exatamente a que admite o
 *     markdown (narrativa). Os dois não competem: um é a autoridade, o outro é a leitura dela.
 */
export const ARTEFATOS_DE_CONTRATO = Object.freeze({
  explore: Object.freeze(DOCS_EXPLORE.map((d) => d.caminho)),
  spec: Object.freeze([
    'discovery-document.md',
    'context-map.md',
    'legacy.md',
    'architecture.md',
    'legacy-analysis.md',
    'threat-model.md',
    'benchmark.md',
    'modules.md',
    'business-rules.md',
    'flow-map.md',
    'product-vision/product-vision.md',
    'requirements/requirements.md',
    'product-requirements/product-requirements.md',
    'tech-rules/tech-rules-summary.md',
    'hld.md',
    'data-model.md',
    'test-plan.md',
    'plano-de-seguranca.md',
    'estimate/estimate-report.md',
    'prototype.md',
    'design-system.md',
    'gaps-document.md',
    'sync-log.md',
    'capa.md',
    'report/product-discovery-kit.html',
  ]),
});

/**
 * Onde o projeto declara ACRÉSCIMOS à árvore da wiki (Decisão 24). Zona MUTÁVEL — é do projeto.
 * Fora de `outputs/spec/`, de propósito: ali a escrita atravessa a fronteira Explore→Plan, e uma
 * lista de publicação não é compromisso com o Plan.
 */
export const LISTA_DE_ACRESCIMOS = 'outputs/wiki-inclusao.md';

/** O texto inteiro é um ID válido desta família? Família desconhecida devolve false. */
export function validarId(familia, texto) {
  const p = ID_PADRAO[familia];
  if (!p) return false;
  return new RegExp('^' + p + '$').test(String(texto || ''));
}

/**
 * Os caracteres que podem fazer parte de um identificador — FONTE ÚNICA das duas fronteiras.
 *
 * Existem como constante, e não escritos à mão em cada regex, porque este módulo já provou que
 * fronteira escrita duas vezes diverge: a fronteira original levou quatro rodadas de correção
 * (ASCII → minúscula → hífen+alfanumérico → letra Unicode acentuada), e a primeira versão de
 * `acharMalFormados` reintroduziu a divergência escrevendo `\p{N}` onde aqui está `0-9`.
 *
 * `\p{L}` e não `[A-Za-z]`: o harness opera em português. `0-9` e não `\p{N}`: numeral romano
 * (`Ⅷ`) e dígito arábico-índico não são numeração de ID, e ampliar a classe faria as duas
 * funções discordarem sobre o mesmo trecho de texto. `_` fica DELIBERADAMENTE fora — ver o
 * comentário de `varrer`.
 */
const CLASSE_ID = '\\p{L}0-9';

/** Fronteira à esquerda: nada que possa ser parte de identificador (hífen incluído) antes do ID. */
const FRONTEIRA_ESQ = `(?<![${CLASSE_ID}-])`;

/** Fronteira à direita: nem alfanumérico colado, nem hífen colando o ID a mais token. */
const FRONTEIRA_DIR = `(?![${CLASSE_ID}]|-[${CLASSE_ID}])`;

/**
 * Varredura sem duplicata, na ordem de aparição. Compartilhada por extrairIds e acharProibidos.
 *
 * As duas fronteiras vêm de `CLASSE_ID` (ver ali) e NÃO são escritas à mão aqui: `acharMalFormados`
 * monta as dela sobre as mesmas constantes, e é isso que faz as duas funções particionarem o texto
 * em vez de discordarem sobre ele.
 *
 * Fronteira à esquerda: um ID só é reconhecido quando está isolado de qualquer caractere que
 * poderia fazer parte de um identificador (letra Unicode, maiúscula ou minúscula, acentuada ou
 * não, dígito, ou hífen).
 *
 * Fronteira à direita — duas regras, não uma, porque hífen depois do ID é ambíguo:
 *   - hífen seguido de alfanumérico (`RF-007-abc`, `MOD-PAG-abc`, `MOD-PAG-1abc`) → o hífen está
 *     colando o ID a mais token — o texto-fonte está malformado e não há ID isolado ali. NÃO
 *     extrair nada, mesmo que a poda até o hífen produzisse um ID formalmente válido.
 *   - hífen seguido de espaço, pontuação ou fim de texto (`MOD-PAG- e pronto`) → é lixo
 *     tipográfico solto, não continuação de código. Extrair o ID e deixar o hífen de fora.
 * Só letra ou dígito colado direto (sem hífen) sempre bloqueia, como já bloqueava.
 *
 * A classe de letra usa `\p{L}` (com a flag `u`), não `[A-Za-z]`: o harness opera em português,
 * onde palavra começando por vogal acentuada é a norma (`área`, `índice`, `único`, `água`), não
 * exceção. Sem isso, `RF-007área` podava para `RF-007` e era devolvido como ID válido — a mesma
 * poda silenciosa que motivou a fronteira ASCII, só que no alfabeto que o documento de fato usa.
 * `_` fica DELIBERADAMENTE fora da classe — avaliado e aceito como risco baixo (não é gramática
 * de ID; em prosa de negócio é escolha estilística, não erro de digitação), então `RF-007_abc`
 * continua extraindo `RF-007`. Não ampliar para cobrir `_` sem decisão explícita.
 *
 * Isto é o que garante o invariante do módulo: todo ID que `extrairIds` devolve passa em
 * `validarId` para a mesma família. Antes da fronteira à esquerda, `RF-007a` e `MOD-PAGx` eram
 * podados para `RF-007` e `MOD-PAG` e devolvidos como válidos. Antes da regra de hífen+alfanumérico
 * à direita, `RF-007-abc` e `MOD-PAG-abc` sofriam a mesma poda silenciosa pelo lado do hífen. Antes
 * da classe `\p{L}`, `RF-007área` e `MOD-PAGçãoAlgo` sofriam a mesma poda pelo lado da letra
 * acentuada — a fonte única discordando de si mesma em três frentes diferentes da mesma fronteira.
 */
function varrer(padrao, texto) {
  const re = new RegExp(FRONTEIRA_ESQ + padrao + FRONTEIRA_DIR, 'gu');
  const achados = [];
  for (const m of String(texto || '').matchAll(re)) {
    if (!achados.includes(m[0])) achados.push(m[0]);
  }
  return achados;
}

/**
 * IDs desta família presentes no texto.
 * A `FRONTEIRA_ESQ` (`(?<![\p{L}0-9-])`, e NÃO `(?<![A-Z0-9-])`, como este comentário afirmou por
 * cinco rodadas) impede casar o miolo de um ID já promovido pelo kit:
 * `RF-MOD-PAGAMENTOS-003` não contém um `MOD-PAGAMENTOS` solto para efeito de catálogo do Explore.
 */
export function extrairIds(familia, texto) {
  const p = ID_PADRAO[familia];
  return p ? varrer(p, texto) : [];
}

/** Ocorrências de `F-xxx` — vocabulário do kit, proibido em outputs/explore/. */
export function acharProibidos(texto) {
  return varrer(ID_PROIBIDO_NO_EXPLORE, texto);
}

/**
 * Trechos que COMEÇAM como ID desta família e não produzem ID válido ali — `RF-7`, `RF-007área`,
 * `RF-007-abc`, `MOD-pag`.
 *
 * A pergunta não é "este trecho é um ID válido?" e sim "`varrer` teria extraído um ID a partir
 * desta posição?". A diferença importa: há casos em que `varrer` extrai um ID válido de dentro de
 * um trecho maior por decisão deliberada — `MOD-PAG- e pronto` devolve `MOD-PAG`, com o hífen
 * final descartado como lixo tipográfico. Perguntar "o trecho inteiro é válido?" acusaria
 * `MOD-PAG-` e contradiria a fonte única no mesmo repositório. Por isso `reValidoAqui` reusa
 * `FRONTEIRA_DIR`: é literalmente o mesmo teste que `varrer` faz, na posição do candidato.
 *
 * Consequência: esta função e `extrairIds` PARTICIONAM o texto. Nada que uma devolve a outra
 * devolve, e nada devolvido aqui passa em `validarId`. O teste de invariante cobra isso — mas leia
 * a ressalva escrita lá antes de confiar nele como trava de fronteira: ele é consequência da forma
 * deste código, não medida dela.
 *
 * A REDE DO CANDIDATO É ESTREITADA DE PROPÓSITO — a cauda precisa de dígito e não pode ter outro
 * hífen. Sem esse filtro, `${familia}-[${CLASSE_ID}-]*` pesca qualquer coisa que comece com o
 * prefixo da família, e isso inclui texto que não é tentativa de ID nenhuma:
 *   - nome de arquivo — `Ver outputs/explore/RF-007-login-do-consultor.md`;
 *   - link markdown — `[RF-007](./requisitos/RF-007-login.md)`;
 *   - palavra composta — `a GAP-analysis do processo`;
 *   - faixa — `os requisitos RF-001-005 foram aprovados`;
 *   - data — `a ata RN-2026-08-27 registra a decisão`;
 *   - e o pior: a NOTAÇÃO DE PLACEHOLDER dos próprios templates (`RF-<nnn>`, `MOD-<CODIGO>`). `<`
 *     não está em `[${CLASSE_ID}-]`, então o candidato parava no prefixo nu e a função acusava
 *     `MOD-`, `RF-`, `RN-`, `GAP-` — nove acusações nos cinco documentos obrigatórios AINDA EM
 *     BRANCO, que a `explore.md` manda o consultor copiar como primeiro passo. Uma trava que acusa
 *     o documento em branco é desligada antes de proteger qualquer coisa, e sob o modelo de
 *     ACIDENTE (não de adversário) o falso positivo é o dano maior. Medido depois do filtro: zero
 *     acusações nos cinco templates pristinos.
 *
 * A leitura em português da regra é curta: *só acuso o que parece tentativa de numerar alguma
 * coisa.*
 *
 * O QUE SE PERDE, e por que é a fronteira do decidível e não preguiça. `RF-007-abc` deixa de ser
 * acusado, e tem exatamente a mesma forma de `RF-007-login`. `RF-MOD-PAGAMENTOS-003` deixa de ser
 * acusado, e tem exatamente a mesma forma de `RN-2026-08-27`. Não existe regra que acuse um e
 * libere o outro — ali o harness não tem informação, e o silêncio é a resposta certa. A perda real,
 * a única que não é ambígua, é `MOD-pag`: minúscula sem dígito nenhum. Fica sem acusação, e isso é
 * escolha registrada. Não "conserte" afrouxando o filtro sem decisão explícita — o custo já foi
 * medido e é o documento em branco acusado.
 *
 * O `*` DO `reCandidato` DEIXOU DE IMPORTAR, e isto fica escrito para a próxima rodada não gastar
 * tempo procurando o teste que o prende. Antes do filtro, `*` e `+` produziam saídas diferentes: o
 * `*` casava o prefixo nu (`RF-` de `RF-<nnn>`) e o acusava, o `+` não. Com o filtro, cauda vazia
 * não tem dígito e é descartada de todo jeito, e as duas formas passam a ser EQUIVALENTES — não
 * "não testadas", equivalentes. A razão é estrutural: as únicas casadas a mais pelo `*` são as de
 * cauda vazia, e depois de uma delas o próximo candidato é o mesmo nos dois, porque candidato só
 * começa em `MOD-`/`RF-`/`RN-`/`GAP-` e nenhum desses prefixos começa no MEIO de si mesmo. Medido
 * por comparação diferencial das duas versões sobre 800.440 pares (os 62 arquivos de texto do
 * repositório, 48 strings adversariais e 200 mil strings de fuzz sobre o alfabeto relevante):
 * ZERO divergências. Nenhum teste pode matar essa mutação, e é por isso que não existe um.
 */
export function acharMalFormados(familia, texto) {
  const p = ID_PADRAO[familia];
  if (!p) return [];
  const t = String(texto || '');
  const reCandidato = new RegExp(`${FRONTEIRA_ESQ}${familia}-[${CLASSE_ID}-]*`, 'gu');
  const reValidoAqui = new RegExp(`^(?:${p})${FRONTEIRA_DIR}`, 'u');
  const achados = [];
  for (const m of t.matchAll(reCandidato)) {
    if (reValidoAqui.test(t.slice(m.index))) continue;
    // Só acusa o que parece tentativa de numerar alguma coisa — ver o JSDoc acima.
    const cauda = m[0].slice(familia.length + 1);
    if (!/[0-9]/.test(cauda) || cauda.includes('-')) continue;
    if (!achados.includes(m[0])) achados.push(m[0]);
  }
  return achados;
}

/**
 * O arquivo que registra o congelamento do Explore (Decisão 16). Existe ⇒ congelado.
 *
 * DUAS REPRESENTAÇÕES, DONOS DIFERENTES — está na spec, seção "Nota sobre a Decisão 16":
 *   - o CARIMBO no topo de cada `outputs/explore/*.md` é para o HUMANO que abre o arquivo e
 *     precisa saber que ele foi sucedido. Nenhuma decisão do harness o lê;
 *   - este MARCADOR é para a MÁQUINA. `estaCongelado` (zonas.mjs) pergunta se ele existe, e nada
 *     mais.
 *
 * POR QUE NÃO PODE SER PROSA. A versão anterior varria `outputs/explore/*.md` procurando a linha
 * de carimbo, e bastava um documento CITAR essa linha para o Explore inteiro congelar — que é o
 * que acontece quando o `gaps.md` registra o procedimento de congelamento, exatamente o que esse
 * documento existe para fazer. Não existe regex que separe o carimbo da citação do carimbo, porque
 * são o mesmo texto: a correção por cerca de código resolvia a citação em bloco e deixava passar a
 * citação em blockquote. E o resultado era impasse — o documento que causou o congelamento ficava
 * ele próprio inelegível para correção. Um arquivo que existe ou não existe não é ambíguo.
 *
 * O CAMINHO, e as três restrições que ele satisfaz:
 *   - FORA de `outputs/explore/`: a zona que ele tranca não pode contê-lo, senão removê-lo exigiria
 *     escrever na zona congelada — o autobloqueio de volta por outra porta;
 *   - FORA da ZONA_IMUTAVEL: removê-lo é a saída honesta que a mensagem de negação anuncia, e ela
 *     tem que ser executável pelo consultor;
 *   - em `outputs/spec/`, com o prefixo `_` das demais convenções de máquina daquela árvore
 *     (`_isencoes`, `_gate-ledger.md`). Deliberadamente FORA da `WHITELIST_EXPLORE`: o
 *     congelamento acontece na conclusão do `spec-product`, isto é, já no Plan, e é correto que a
 *     existência deste arquivo caracterize a fase Plan em `detectarFase`.
 *
 * ORDEM DE ESCRITA, para quem for instalar o congelamento (`promocao.mjs`, Plano 3): carimba os
 * cinco documentos PRIMEIRO — escrita comum, o Explore ainda não está congelado — e cria este
 * arquivo por ÚLTIMO. É essa ordem que dispensa a exceção do autobloqueio: não existe mais
 * "instalação do carimbo" como operação privilegiada da trava. A rule que ensina essa ordem a quem
 * congela à mão é `.claude/rules/harness/plan.md`, seção "Congelamento do Explore"; um teste do
 * `zonas.test.mjs` cruza o caminho acima com o texto dela para que as duas não divirjam.
 *
 * A INVARIANTE "marcador existe ⇒ documentos carimbados" NÃO É VERIFICADA POR NINGUÉM HOJE. Se a
 * ordem for invertida, ou se o processo morrer entre uma coisa e outra, o Explore fica trancado com
 * documentos sem carimbo — reproduzido; a recuperação (remover este arquivo) funciona e a mensagem
 * de negação a ensina, então é retrabalho, não impasse. Quem deve verificá-la é o `promocao.mjs`
 * do Plano 3, e a ferramenta já existe: `lerCarimbo` (zonas.mjs) responde exatamente "este
 * documento está carimbado?" e hoje não tem consumidor de produção nenhum. Não implemente a
 * verificação aqui — este módulo é núcleo puro e a checagem precisa ler os cinco documentos.
 */
export const MARCADOR_CONGELAMENTO = 'outputs/spec/_explore-congelado.md';

/**
 * Caminhos do Deliver. A convenção de isenção vem do `harness-elo`: o nome do arquivo é
 * cosmético e o gate casa pelos CAMPOS dentro do bloco, com chave composta repositório + branch.
 */
export const MARCADOR_US = 'outputs/spec/em-andamento.md';
export const DIR_AUDITORIAS = 'outputs/spec/auditorias';
export const DIR_ISENCOES = 'outputs/spec/auditorias/_isencoes';
export const LEDGER_GATE = 'outputs/spec/auditorias/_gate-ledger.md';
export const BLOCO_ISENCAO = 'gate:isencao';

/**
 * Caminho que a tool vai escrever, a partir do `tool_input`. `null` quando não é escrita.
 *
 * `Write` e `Edit` trazem `file_path`; `NotebookEdit` traz `notebook_path`. São schemas
 * DIFERENTES, não sinônimos — e ler só o primeiro já deixou a fiscalização de notebook
 * inexistente sem ninguém perceber, com o gatilho declarado e a suíte verde. Enquanto isto for a
 * fonte única, corrigir aqui corrige os dois despachantes; se cada um extrair o caminho por conta
 * própria, o mesmo erro nasce de novo no segundo.
 *
 * `||` E NÃO `??`: um payload com `file_path: ''` e `notebook_path` de verdade escolhia a string
 * vazia com `??` e LIBERAVA — o campo vazio mascarava o real. Caminho vazio não é caminho, e não
 * existe chamador legítimo que queira dizer `''` e ser levado a sério. O preço de `||` seria
 * descartar um `file_path` falsy legítimo, e não existe nenhum: `0` e `false` também não são
 * caminhos.
 *
 * O par `conteudoDaTool` NÃO existe ainda, de propósito: hoje nenhum módulo lê conteúdo do
 * payload, e ela nasceria sem consumidor. Entra junto com o primeiro que precisar — e aí mora
 * aqui, ao lado desta, porque as duas são metades do mesmo fato.
 */
export function caminhoDaTool(toolInput) {
  const i = toolInput || {};
  return i.file_path || i.notebook_path || null;
}

/**
 * O nome NU da skill, sem o prefixo de plugin. `''` quando não há nome.
 *
 * Skill que vem de plugin é invocada como `plugin:skill`, e é ASSIM que o payload a traz —
 * `superpowers:writing-plans` e `anthropic-skills:pptx` são os exemplos vivos nesta máquina, e
 * qualquer `spec-*` servida por plugin chega como `algum-plugin:spec-product`. Comparar a string
 * inteira contra uma tabela indexada
 * pelo nome nu faz a verificação NUNCA casar em produção, com a suíte verde: foi assim que a
 * âncora de skill do `fecho-explore` nasceu decorativa, e medido, seria assim que as **doze**
 * entradas da tabela do `cadeia.mjs` passariam sem verificação nenhuma.
 *
 * Corta no ÚLTIMO `:`, o que aceita as duas formas e não afrouxa nada: invocar uma skill cujo
 * nome nu é `spec-product` é exatamente o evento que se quer pegar, venha ela de plugin, de
 * `.claude/skills/` ou de onde for.
 *
 * MORA AQUI, e não no verificador que precisou dela primeiro, porque é a mesma classe de fato que
 * `caminhoDaTool`: **qual campo do payload significa o quê**. O `fecho-explore` a escreveu privada
 * e o `cadeia` precisaria da mesma regra — duplicar diverge, e um verificador importar do outro
 * criaria dependência entre pares, que é o que a Parte E do Step 0 existiu para evitar.
 */
export function nomeDaSkill(bruto) {
  const t = String(bruto == null ? '' : bruto).trim();
  return t.slice(t.lastIndexOf(':') + 1).trim();
}

// ——————————————————————— a gramática do `sync-log.md` ———————————————————————
//
// DONO ÚNICO. O `sync-log.md` é a única memória que atravessa as três fases, e até a Task 7 ele
// tinha DOIS donos: o kickoff morava no `fecho-explore.mjs` e a Seção A nasceria no
// `sync-log.mjs`. Fonte escrita duas vezes diverge, e a cópia que diverge é a que alguém vai ler.
// A gramática inteira mora aqui — o kit já é o vocabulário compartilhado e já lista `sync-log.md`
// no inventário —, e os dois verificadores importam daqui. NÃO reexporte de lá: dois caminhos de
// import para a mesma constante é a divergência que esta seção fechou.
//
// A FONTE É O KIT DE REFERÊNCIA, e não a nossa memória. O formato de quatro colunas que o plano
// descrevia era invenção nossa, e escrever nele QUEBRARIA o kit — é a coluna `Modo / contexto` que
// carrega `LEGACY_SKIPPED`, `FLOWMAP_SKIPPED` e a própria linha de kickoff. Cada peça abaixo diz
// de onde veio:
//   · nove colunas e as quatro regras — `spec-iterate/templates/sync-log.md`;
//   · o gate FATAL `KICKOFF_PERSISTED` — `spec/SKILL.md:258`;
//   · o formato da linha de kickoff — `tools/references/task-pipeline.md` §4;
//   · a leitura (`KICKOFF_LEGACY_RE`, `KICKOFF_NO_LEGACY_PROSE_RE`, `strip_code_blocks`,
//     `TEMPLATE_DATE_PLACEHOLDER_RE`, `_is_template_row`, `declaration_scope`,
//     `iter_table_data_cells`, `_payload_declares`) — `tools/check-outputs.py`.
//
// AS QUATRO REGRAS ANTI-FALSO-POSITIVO são do kit, e valem aqui na íntegra porque o mesmo template
// que documenta o formato é o arquivo de onde todo `sync-log.md` nasce:
//   1. o marcador só declara ABRINDO a linha ou a célula — citá-lo no meio de uma frase não conta;
//   2. em tabela, só vale na coluna certa (`Modo / contexto`), nunca numa coluna que DOCUMENTA;
//   3. linha que ainda traga `YYYY-MM-DD` ou `HH:MM` na coluna de data é EXEMPLO, não registro —
//      a linha de exemplo do template registra `spec-ingest`, e um leitor ingênuo concluiria que a
//      skill rodou sem ela nunca ter rodado;
//   4. nada dentro de cerca de código (``` ou indentação de quatro espaços) é declaração.

/** As nove colunas da Seção A, na ordem do template do kit. Quatro era chute; nove é o template. */
export const COLUNAS_SECAO_A = Object.freeze([
  '#', 'Data/Hora', 'Skill', 'Modo / contexto', 'Inputs consumidos',
  'Outputs gerados ou atualizados', 'Decisões-chave (1–3 bullets)', 'Decisor',
  'Próximo passo recomendado',
]);

/** Cabeçalho + delimitador da tabela da Seção A, como o template do kit os escreve. */
export const CABECALHO_SECAO_A = [
  `| ${COLUNAS_SECAO_A.join(' | ')} |`,
  '|--:|-----------|-------|-----------------|-------------------|-------------------------------|------------------------------|---------|---------------------------|',
].join('\n');

// —— regra 4: cerca de código não é declaração ——
// Gêmeo do `strip_code_blocks` do `check-outputs.py`, e preserva a CONTAGEM DE LINHAS de propósito:
// as regras seguintes trabalham por linha, e apagar linhas desalinharia o que sobra.
const RE_CERCA_ABRE = /^[ \t]{0,3}(`{3,}|~{3,})/;
const RE_CODIGO_INDENTADO = /^(?: {4}|\t)/;

function semBlocosDeCodigo(texto) {
  const saida = [];
  let cerca = null;
  let indentado = false;
  let anteriorVazia = true;
  for (const linha of String(texto || '').split('\n')) {
    if (cerca !== null) {
      saida.push('');
      const t = linha.trim();
      if (t.startsWith(cerca) && [...t].every((c) => c === cerca[0] || c === ' ' || c === '\t')) cerca = null;
      continue;
    }
    const abriu = linha.match(RE_CERCA_ABRE);
    if (abriu) {
      cerca = abriu[1];
      saida.push('');
      anteriorVazia = false;
      indentado = false;
      continue;
    }
    const vazia = !linha.trim();
    if (indentado) {
      if (vazia || RE_CODIGO_INDENTADO.test(linha)) { saida.push(''); continue; }
      indentado = false;
    } else if (anteriorVazia && RE_CODIGO_INDENTADO.test(linha)) {
      indentado = true;
      saida.push('');
      anteriorVazia = false;
      continue;
    }
    saida.push(linha);
    anteriorVazia = vazia;
  }
  return saida.join('\n');
}

// —— regra 3: placeholder de data é exemplo, não registro ——
// O placeholder só desqualifica quando está na COLUNA DE DATA (2ª célula). Casar em qualquer ponto
// da linha apagaria registro legítimo — é a mesma correção que o `_is_template_row` do kit carrega.
const RE_PLACEHOLDER_DATA = /\bYYYY[-/]MM[-/]DD\b|\bAAAA[-/]MM[-/]DD\b|\bHH:MM\b/i;

function ehLinhaDeExemplo(linha) {
  if (linha.includes('|')) {
    const celulas = dividirLinhaDeTabela(linha);
    return RE_PLACEHOLDER_DATA.test(celulas.length > 1 ? celulas[1] : '');
  }
  return RE_PLACEHOLDER_DATA.test(linha);
}

/**
 * O texto reduzido ao que pode ser lido como DECLARAÇÃO: sem blocos de código (regra 4) e sem as
 * linhas de exemplo do template (regra 3). Idempotente, e preserva a contagem de linhas.
 */
export function escopoDeDeclaracao(texto) {
  return semBlocosDeCodigo(texto)
    .split('\n')
    .map((l) => (ehLinhaDeExemplo(l) ? '' : l))
    .join('\n');
}

// —— regra 2: em tabela, a coluna decide ——
const RE_LINHA_DE_TABELA = /^[ \t]{0,3}\|/;
const RE_CELULA_DELIMITADORA = /^:?-{2,}:?$/;

function dividirLinhaDeTabela(linha) {
  let s = String(linha).trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim());
}

function ehLinhaDelimitadora(linha) {
  const c = dividirLinhaDeTabela(linha);
  return c.length > 0 && c.every((x) => RE_CELULA_DELIMITADORA.test(x));
}

/** `[cabeçalho, célula]` de cada célula de DADOS de tabela Markdown. Sem cabeçalho não dá para
 *  distinguir a coluna `Modo / contexto` (que declara) da coluna `Marcador` (que documenta). */
function* celulasDeDadosDeTabela(texto) {
  const linhas = String(texto || '').split('\n');
  let i = 0;
  while (i < linhas.length) {
    if (RE_LINHA_DE_TABELA.test(linhas[i]) && i + 1 < linhas.length && ehLinhaDelimitadora(linhas[i + 1])) {
      const cabecalhos = dividirLinhaDeTabela(linhas[i]);
      let j = i + 2;
      while (j < linhas.length && RE_LINHA_DE_TABELA.test(linhas[j]) && !ehLinhaDelimitadora(linhas[j])) {
        const celulas = dividirLinhaDeTabela(linhas[j]);
        for (let k = 0; k < celulas.length; k += 1) yield [k < cabecalhos.length ? cabecalhos[k] : '', celulas[k]];
        j += 1;
      }
      i = j;
    } else {
      i += 1;
    }
  }
}

function semAcentos(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// A coluna onde a declaração VALE, e as colunas que só a documentam (estas vencem).
const RE_COLUNA_CANONICA = /\bmodo\b|\bcontexto\b/i;
const RE_COLUNA_DOCUMENTAL = /marcador|anti-?padr|nao[ -]fazer|nao[ -]faca|nunca|errado|evitar|incorret|proibid|contraexemplo|exemplo|formato|sintaxe|quem escreve|efeito|quando/i;

function colunaDeclara(cabecalho) {
  const norm = semAcentos(cabecalho).trim().replace(/^[`*_ ]+|[`*_ ]+$/g, '').toLowerCase();
  if (!norm || RE_COLUNA_DOCUMENTAL.test(norm)) return false;
  return RE_COLUNA_CANONICA.test(norm);
}

// —— o kickoff ——
//
// O FORMATO É O DO KIT, e este é o conserto de um falso positivo em trava BLOQUEANTE: até a Task 7
// o `fecho-explore.mjs` exigia `> **KICKOFF YYYY-MM-DD** …`, que NÃO EXISTE em lugar nenhum do kit.
// Um projeto iniciado corretamente pelo orquestrador — que grava a linha do `KICKOFF_PERSISTED` —
// tinha o fecho do Explore NEGADO. É a mesma família de erro que o `estado.md` registra em letras
// grandes: formato decidido sem abrir o kit de referência.

/** A linha canônica do kickoff, com `legado=` PREENCHIDO. Espelha a `KICKOFF_LEGACY_RE` do kit. */
export const RE_KICKOFF = /kickoff[`*_ \t]*:[^\n]*?\blegado\s*=\s*([^\s·|,;]+)/i;

/** A variante em PROSA do template (`kickoff: … sem legado …`). O `check-outputs.py:233` a aceita;
 *  negá-la aqui seria falso positivo NOSSO sobre um projeto que o kit considera correto. */
export const RE_KICKOFF_SEM_LEGADO = /kickoff[`*_ \t]*:[^\n]*?\bsem legado\b/i;

/** Regra 1: `kickoff:` ABRINDO a linha (bullet, citação, `código` e **negrito** aceitos). */
const RE_KICKOFF_ABRE = /^[ \t]*(?:[>*\-+][ \t]*)*[`*_]{0,3}kickoff[`*_]{0,3}[ \t]*:/i;

function* fragmentosDeKickoff(texto) {
  const escopo = escopoDeDeclaracao(texto);
  for (const linha of escopo.split('\n')) {
    if (RE_LINHA_DE_TABELA.test(linha)) continue;
    if (RE_KICKOFF_ABRE.test(linha)) yield linha;
  }
  for (const [cabecalho, celula] of celulasDeDadosDeTabela(escopo)) {
    if (colunaDeclara(cabecalho) && /kickoff/i.test(celula)) yield celula;
  }
}

/**
 * Valor PREENCHIDO de `chave=…`, ou `null`. Placeholder do template não declara nada: valor que
 * abre com `<` ou traz `|` (a alternação `<Sim|Parcial|Não>`) é o FORMATO, não a decisão. Mesma
 * regra do `_payload_declares` do kit — sem ela, copiar a linha do template ligaria o gate.
 */
function limparValor(bruto) {
  if (bruto === null || bruto === undefined) return null;
  const v = String(bruto).trim().replace(/^[`*_]+|[`*_]+$/g, '').trim();
  if (!v || v.startsWith('<') || v.includes('|')) return null;
  return v;
}

function valorDoCampo(fragmento, chave, ateOSeparador = false) {
  const corpo = ateOSeparador ? '[^·|\\n]+' : '[^\\s·|,;]+';
  const m = String(fragmento).match(new RegExp(`\\b${chave}\\s*=\\s*(${corpo})`, 'i'));
  return m ? limparValor(m[1]) : null;
}

/**
 * O `legado=` do fragmento, lido PELA `RE_KICKOFF`.
 *
 * Passa por ela de propósito. Constante exportada que ninguém consome é decoração: afrouxá-la
 * sairia de graça, e é justamente ela que impede o formato inventado de voltar. Aqui ela tem
 * consumidor de verdade — quem a afrouxar quebra a leitura junto, não só uma asserção de formato.
 */
function legadoDoFragmento(fragmento) {
  const m = String(fragmento).match(RE_KICKOFF);
  return m ? limparValor(m[1]) : null;
}

const CAIXA_LEGADO = Object.freeze({ sim: 'Sim', parcial: 'Parcial', nao: 'Não' });

function normalizarLegado(v) {
  if (v === null || v === undefined || v === '') return null;
  return semAcentos(String(v)).trim().toLowerCase();
}

/** A linha do gate `KICKOFF_PERSISTED`, no formato de `task-pipeline.md` §4. */
export function montarKickoff({ legado, ramo, ambiente, inputs } = {}) {
  const norm = normalizarLegado(legado);
  const l = CAIXA_LEGADO[norm] || (norm ? String(legado) : '—');
  const lista = Array.isArray(inputs) ? inputs.join(', ') : String(inputs == null ? '' : inputs);
  return `kickoff: legado=${l} · ramo=${ramo || '—'} · ambiente=${ambiente || '—'} · inputs=${lista || '—'}`;
}

/**
 * `{presente, legado, ramo, ambiente, inputs}` — `legado` normalizado para `sim`/`parcial`/`nao`.
 *
 * `presente` exige pelo menos UM campo de verdade (ou a variante em prosa): a linha do template,
 * inteirinha de placeholder, é o FORMATO copiado, não uma decisão tomada — e este gate existe para
 * registrar que ALGUÉM DECIDIU.
 *
 * A PRECEDÊNCIA É A DO KIT: `legado=` estruturado vence a prosa `sem legado`.
 */
export function lerKickoff(texto) {
  const fragmentos = [...fragmentosDeKickoff(texto)];
  const vazio = { presente: false, legado: null, ramo: null, ambiente: null, inputs: null };
  if (!fragmentos.length) return vazio;

  let presente = false;
  let legado = null;
  let ramo = null;
  let ambiente = null;
  let inputs = null;

  for (const f of fragmentos) {
    const estruturado = legadoDoFragmento(f);
    const prosa = RE_KICKOFF_SEM_LEGADO.test(f);
    const r = valorDoCampo(f, 'ramo');
    const a = valorDoCampo(f, 'ambiente');
    const i = valorDoCampo(f, 'inputs', true);
    if (!estruturado && !prosa && !r && !a && !i) continue;
    presente = true;
    if (legado === null && estruturado) legado = normalizarLegado(estruturado);
    if (ramo === null) ramo = r;
    if (ambiente === null) ambiente = a;
    if (inputs === null) inputs = i;
  }
  if (!presente) return vazio;
  if (legado === null) {
    for (const f of fragmentos) if (RE_KICKOFF_SEM_LEGADO.test(f)) { legado = 'nao'; break; }
  }
  return { presente, legado, ramo, ambiente, inputs };
}

// —— a linha da Seção A ——

/**
 * Uma linha de DADOS da Seção A: nove células, `#` numérico e `Data/Hora` em `YYYY-MM-DD HH:MM`.
 *
 * As nove são o que separa registro de qualquer outra tabela do arquivo: a tabela de marcadores do
 * template tem quatro colunas e a Seção B tem sete, e nenhuma das duas abre com um número seguido
 * de data e hora. A granularidade de MINUTO desta coluna é o motivo de a regra de recência do
 * `sync-log.mjs` truncar o `mtime` — comparar minuto com milissegundo avisaria quem registrou certo.
 *
 * PIPE ESCAPADO ATRAVESSA. As sete células de conteúdo aceitam `\|`, e não é tolerância: a
 * `montarLinhaSecaoA` logo abaixo ESCAPA `|` como `\|` — convenção do Markdown, e a mesma do
 * `_CELL_SPLIT_RE` do `check-outputs.py` —, e com `([^|\n]*)` a função não conseguia ler a linha que
 * ela mesma escrevia. Não era caso exótico: o template do kit escreve `doc→proto \| proto→doc` na
 * Seção B e `motivo=<API pura|batch|worker>` na coluna `Modo / contexto`, e quem registrasse direito
 * usando um pipe recebia o lembrete de novo — falso positivo em cima de trabalho correto.
 *
 * A ALTERNÂNCIA É DETERMINÍSTICA de propósito: `[^\\|\n]` EXCLUI a contrabarra, então em cada
 * posição vale exatamente uma das duas alternativas (`\` só abre par escapado; qualquer outro
 * caractere só casa a classe), o ponto de corte da célula é sempre o pipe NU, e a leitura da cadeia
 * é ÚNICA. A forma óbvia — `(?:\\\||[^|\n])*`, com a contrabarra casando pelos dois lados — deixa
 * cada `\|` ser também um fim de célula, e com sete células isso é retrocesso polinomial de grau
 * alto. MEDIDO nesta máquina, numa linha que não fecha (o pior caso), com `n` pares `\|`:
 *   n=40 → 3,1 s · n=60 → 3,8 s · n=80 → 28,3 s   (a forma abaixo: 0 ms em todos, e em n=2000)
 * Pipe NU continua rejeitado, e é isso que mantém linha com as colunas deslocadas fora.
 */
export const RE_LINHA_SECAO_A =
  /^[ \t]{0,3}\|[ \t]*(\d+)[ \t]*\|[ \t]*(\d{4}-\d{2}-\d{2})[ \t]+([01]\d|2[0-3]):([0-5]\d)[ \t]*\|((?:[^\\|\n]|\\.)*)\|((?:[^\\|\n]|\\.)*)\|((?:[^\\|\n]|\\.)*)\|((?:[^\\|\n]|\\.)*)\|((?:[^\\|\n]|\\.)*)\|((?:[^\\|\n]|\\.)*)\|((?:[^\\|\n]|\\.)*)\|[ \t]*$/;

/**
 * O `\|` de volta a `|`. Gêmeo exato do escape de `montarLinhaSecaoA`, e SÓ ele: `\n` numa célula é
 * a sequência de dois caracteres que o autor escreveu, e transformá-la em quebra de linha destruiria
 * a linha. Sem este desescape o consumidor vê texto que ninguém escreveu — e a coluna `Skill` é
 * comparada por IGUALDADE na regra de recência do `sync-log.mjs`, onde `spec\|product` nunca casaria.
 *
 * LIMITE CONHECIDO, escrito para ninguém o redescobrir como bug: um valor que JÁ contenha a
 * sequência literal `\|` sai da montagem como `\\|` e a linha fica ilegível. Era assim antes desta
 * correção também (a regex rejeitava qualquer pipe), e escapar a contrabarra junto divergiria da
 * convenção do kit, que escapa só o pipe.
 */
const desescaparCelula = (v) => String(v == null ? '' : v).replace(/\\\|/g, '|');

/** Uma linha da Seção A, nas nove colunas do template. `|` no conteúdo é escapado. */
export function montarLinhaSecaoA(campos) {
  const c = campos || {};
  const cel = (v) => String(v == null ? '' : v).replace(/\|/g, '\\|').trim();
  return `| ${cel(c.numero)} | ${cel(c.data)} ${cel(c.hora)} | ${cel(c.skill)} | ${cel(c.modo)} `
    + `| ${cel(c.inputs)} | ${cel(c.outputs)} | ${cel(c.decisoes)} | ${cel(c.decisor)} | ${cel(c.proximo)} |`;
}

/**
 * As linhas de execução da Seção A, já filtradas pelas quatro regras.
 *
 * `minuto` é a data/hora em milissegundos de HORA LOCAL, truncada ao minuto pela própria
 * granularidade da coluna. É com ela que a regra de recência compara o `mtime` do artefato — o
 * `mtime` também é lido em hora local, e é por isso que a comparação fecha.
 */
export function lerLinhasSecaoA(texto) {
  const lidas = [];
  for (const linha of escopoDeDeclaracao(texto).split('\n')) {
    const m = linha.match(RE_LINHA_SECAO_A);
    if (!m) continue;
    const celulas = dividirLinhaDeTabela(linha);
    if (celulas.length !== COLUNAS_SECAO_A.length) continue;
    const [ano, mes, dia] = m[2].split('-').map(Number);
    lidas.push({
      numero: Number(m[1]),
      data: m[2],
      hora: `${m[3]}:${m[4]}`,
      minuto: new Date(ano, mes - 1, dia, Number(m[3]), Number(m[4])).getTime(),
      skill: desescaparCelula(celulas[2]),
      modo: desescaparCelula(celulas[3]),
      inputs: desescaparCelula(celulas[4]),
      outputs: desescaparCelula(celulas[5]),
      decisoes: desescaparCelula(celulas[6]),
      decisor: desescaparCelula(celulas[7]),
      proximo: desescaparCelula(celulas[8]),
    });
  }
  return lidas;
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

/**
 * Os códigos de erro que significam "NÃO HÁ DOCUMENTO AQUI" para um verificador que ia ler um
 * ARQUIVO. Mora aqui porque os verificadores de documento do PostToolUse — `gramatica.mjs` e
 * `sync-log.mjs` — fazem a MESMA pergunta sobre o mesmo tipo de caminho, e cada um guardava a sua
 * cópia literal do conjunto, com o comentário de um apontando o do outro em vez de importá-lo.
 * Medido na rodada O: remover `EISDIR` da cópia do `sync-log` sobrevivia à suíte inteira, então as
 * duas já podiam divergir em silêncio.
 *
 * O CORTE É "não há documento aqui" contra "há um documento e eu não o li":
 *
 * - `ENOENT` — não existe. Ausência.
 * - `ENOTDIR` — um componente do meio do caminho é arquivo, então o alvo não existe. Ausência.
 * - `EISDIR` — o alvo é um DIRETÓRIO. Ausência, e este é o ramo que a rodada J decidiu. Um
 *   diretório chamado `gaps.md` não é um documento mal escrito: é a inexistência do documento sob
 *   outra forma, o espelho exato do `ENOTDIR` (arquivo onde se esperava diretório × diretório onde
 *   se esperava arquivo), e não existe correção que o consultor possa fazer no CONTEÚDO. Sob o
 *   modelo de acidente, e num verificador que não bloqueia nada, "não havia documento para
 *   conferir" é a leitura defensável.
 * - `EACCES`, `EBUSY`, `EPERM` — o arquivo ESTÁ lá e não foi lido. Ilegibilidade, e quem lê
 *   RELANÇA. O `EBUSY`/`EPERM` de arquivo travado pelo sync do OneDrive é o setup real deste
 *   usuário e não tem nada de exótico; calar sobre ele transformaria "não li" em "está tudo certo",
 *   que são as duas conclusões mais distantes possíveis.
 *
 * NÃO É o conjunto de quem anda por DIRETÓRIO. `inventariar`, `ehAusencia` e os pares do
 * `zonas.mjs`/`workspace.mjs` cortam em `ENOENT`/`ENOTDIR` e param aí, porque para quem esperava um
 * diretório encontrar um diretório não é ausência de nada. São perguntas diferentes sobre erros de
 * nome parecido, e juntá-las mudaria comportamento em vez de remover cópia.
 */
export const CODIGOS_DE_AUSENCIA_DE_DOCUMENTO = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

/**
 * Arquivos sob `raiz`, recursivamente, como caminhos relativos com barra normal.
 * `lerDiretorio` é ponto de injeção só para teste (simular erro de I/O sem depender de
 * permissão real de sistema de arquivos); chamadores de produção usam o default.
 */
export function inventariar(raiz, lerDiretorio = readdirSync) {
  const encontrados = new Set();
  function andar(dir, prefixo) {
    let entradas = [];
    try {
      entradas = lerDiretorio(dir, { withFileTypes: true });
    } catch (erro) {
      // Só ausência de diretório é "nada existe". Qualquer outro erro (permissão, I/O, etc.)
      // é relançado — um verificador que falha fechado não pode receber conjunto vazio
      // quando na verdade não conseguiu olhar.
      if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return;
      throw erro;
    }
    for (const e of entradas) {
      if (e.name === '.gitkeep') continue;
      const rel = prefixo ? prefixo + '/' + e.name : e.name;
      if (e.isDirectory()) andar(join(dir, e.name), rel);
      else encontrados.add(rel);
    }
  }
  andar(raiz, '');
  return encontrados;
}

/**
 * Versão do template clonado, lida de `harness.json` na raiz informada. Espelha `inventariar`:
 * `null` só quando o arquivo está de fato AUSENTE (`ENOENT`/`ENOTDIR`). Qualquer outro erro —
 * permissão, I/O, JSON malformado — é RELANÇADO; quem chama aplica a política de falha, mas só
 * decide algo se "ausente" e "existe e está ilegível" chegarem como coisas diferentes. Antes,
 * os dois casos devolviam o mesmo `null` e ninguém conseguia distinguir.
 *
 * `lerArquivo` é ponto de injeção só para teste, espelhando o `lerDiretorio` de `inventariar`.
 * Existe porque o ramo `ENOTDIR` não se produz de forma portável — no Windows, um componente-arquivo
 * no meio do caminho levanta `ENOENT` —, e sem injeção ele ficava sem teste nenhum. Chamadores de
 * produção usam o default.
 */
export function lerVersaoTemplate(raiz, lerArquivo = readFileSync) {
  let bruto;
  try {
    bruto = lerArquivo(join(raiz, 'harness.json'), 'utf8');
  } catch (erro) {
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return null;
    throw erro;
  }
  const h = JSON.parse(bruto); // JSON malformado lança aqui — não é engolido
  return { versao: String(h.versao || ''), kitVersao: String(h.kitVersao || '') };
}


// ————————————— resolução de caminho por identidade de arquivo —————————————
//
// MORA AQUI, e não dentro de um despachante, porque os DOIS despachantes precisam da mesma
// resposta sobre o mesmo caminho. Enquanto isto vivia no `pretooluse.mjs`, as opções para o
// `posttooluse.mjs` eram todas ruins: usar a resolução TEXTUAL faria os dois responderem diferente
// sobre o mesmo caminho, e importar do despachante irmão criaria dependência entre despachantes.
// A textual (`relativizar`, no núcleo puro) é o caminho de RECUO; a de identidade é a que fechou a
// família de aliases do Windows que NENHUMA canonização por string fechou em três tentativas.

/** Ausência de arquivo/diretório — não é ilegibilidade. Restrição global 1 do projeto. */
const ehAusencia = (erro) => !!erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR');

/**
 * Guarda de profundidade da subida. Nenhum caminho legítimo deste harness chega perto de 64
 * segmentos; um que chegue é entrada patológica, e o que se devolve nesse caso é "não decidi" —
 * o chamador cai na resolução textual, que sempre responde.
 */
const MAX_SUBIDA = 64;

/**
 * Identidade do arquivo/diretório: o par `dev`+`ino`, que é o que o sistema de arquivos usa para
 * dizer que duas strings nomeiam a MESMA coisa. `null` quando o sistema de arquivos não fornece um
 * `ino` confiável (`0`).
 *
 * `bigint: true` de propósito: o ID de arquivo do NTFS tem 64 bits, e como `Number` ele perde
 * precisão acima de 2^53 — dois arquivos DIFERENTES passariam a comparar iguais, que é o erro
 * exatamente na direção errada (liberar o que devia negar). Com `BigInt` a comparação é exata.
 */
function idDe(caminho, statear) {
  const st = statear(caminho, { bigint: true });
  return st.ino === 0n ? null : { dev: st.dev, ino: st.ino };
}

const mesmoArquivo = (a, b) => !!a && !!b && a.dev === b.dev && a.ino === b.ino;

/**
 * Remove o sufixo de STREAM ALTERNATIVO do NTFS do nome de arquivo (`CLAUDE.md::$DATA`).
 *
 * `CLAUDE.md::$DATA` escreve no MESMO arquivo que `CLAUDE.md` — verificado executando — mas a
 * string não casa `CLAUDE.md` na ZONA_IMUTAVEL, e por isso liberava. O corte é APLICADO SÓ NO
 * ÚLTIMO SEGMENTO, e por dois motivos: é onde a escrita de fato aterrissa; e um stream num
 * segmento do MEIO não nomeia nada gravável (`<raiz>\.claude::$DATA\hooks\x.mjs` falha com
 * `ENOENT` — também verificado executando), então não é bypass.
 *
 * O JSDoc já dizia isso e o código não fazia: `semStream` era aplicado também a cada ancestral
 * acumulado na subida. Consequência reproduzida — inalcançável no Windows, onde `:` não é válido
 * em nome de diretório, e FALSO POSITIVO REAL em macOS/Linux, onde é:
 *   `<raiz>/skills:backup/notas.md` → rel `skills/notas.md` → casa `skills/` → DENY falso;
 *   `<raiz>/reuniao 10:30/ata.md`   → rel `reuniao 10/ata.md` → caminho errado na mensagem.
 * Sob o modelo de acidente, negar trabalho legítimo por um caminho que o próprio harness
 * reescreveu é pior que qualquer um dos aliases que o corte fecha. Quem chama esta função é só a
 * montagem do primeiro segmento; os ancestrais vão para `partes` com o nome que têm.
 */
function semStream(nome) {
  const i = nome.indexOf(':');
  return i > 0 ? nome.slice(0, i) : nome;
}

/**
 * O caminho é UNC DE REDE? Se for, a subida por identidade NÃO o toca.
 *
 * MEDIDO NESTA MÁQUINA: `statSync` sobre `\\host-inexistente\share\a.md` custa 2,87 s e sobre
 * `\\192.0.2.77\share\a.md` custa 43,1 s — os dois levantam `UNKNOWN` no fim. A subida por
 * identidade pagava isso a cada `Write` cujo alvo estivesse numa share fora do ar, e como ela sobe
 * de pai em pai, pagava mais de uma vez. O consultor fora da VPN penduraria o `PreToolUse` por
 * dezenas de segundos em cima de uma escrita que nem é do projeto.
 *
 * Sob o modelo de ACIDENTE a escolha é fácil: quem responde por caminho de rede é a resolução
 * TEXTUAL, na hora, e a resposta dela é "fora do projeto" — que é a resposta certa em todo caso
 * plausível. O que se PERDE é o alias `\\localhost\C$\...` (e `\\127.0.0.1\C$\...`) apontando para
 * um caminho local deste projeto: ele deixa de ser reconhecido como de dentro. Ninguém digita isso
 * por engano, e a spec já registra a família de aliases como baixa prioridade sob este modelo.
 *
 * O CRITÉRIO É A FORMA, porque não existe jeito de saber se um host responde sem perguntar a ele —
 * e perguntar é o custo que se quer evitar. Duas armadilhas:
 *   - `\\?\C:\...` e `\\.\C:\...` NÃO são rede. São o namespace de dispositivo do Win32 para um
 *     caminho LOCAL, e precisam continuar na subida: é ali que mora metade da família de aliases
 *     que o C4 fechou;
 *   - `\\?\UNC\servidor\share\...` É rede — é a forma estendida de um caminho UNC — e volta a ser
 *     recusada mesmo tendo o prefixo de dispositivo.
 *
 * PROJETO HOSPEDADO NUMA SHARE — o comentário anterior afirmava aqui que ele "continua resolvendo
 * por identidade, porque a share da `cwd` está viva por construção". MEDIDO com espião contando
 * `statSync`, é o contrário: quem esta guarda testa é o ALVO, e o formato observado de `file_path`
 * é ABSOLUTO. Num projeto cuja raiz é UNC, todo alvo de escrita também é UNC, casa aqui, e a
 * subida por identidade NUNCA roda — `statSync: 0`, para escrita nenhuma. O projeto inteiro cai
 * permanentemente no recuo textual, e não só as escritas de fora dele.
 *
 * ISSO NÃO DESLIGA A TRAVA, e a diferença importa para a próxima rodada não "consertar" o que não
 * está quebrado. O recuo textual (`relativizar`, no núcleo puro acima) responde CERTO sobre a forma
 * canônica — medido: raiz `\\servidor\share\proj` com alvo `\\servidor\share\proj\CLAUDE.md`
 * devolve `CLAUDE.md`, e o alvo em `outputs\explore\` devolve `outputs/explore/gaps.md`. O que se
 * perde num projeto em share é o fechamento da FAMÍLIA DE ALIASES, que só a identidade fecha.
 *
 * COROLÁRIO, contra a leitura de "antes de qualquer I/O" como "nenhum I/O de rede": com
 * `file_path` RELATIVO num projeto UNC, esta guarda NÃO morde — a string não começa com `\\` — e a
 * subida stateia a RAIZ, que é de rede. `statSync: 1`, medido. Fica em uma chamada, e a raiz de um
 * projeto aberto está viva na prática, mas não é zero.
 */
function ehCaminhoDeRede(p) {
  const s = String(p == null ? '' : p).replace(/\//g, '\\');
  if (!s.startsWith('\\\\')) return false;
  const resto = s.slice(2);
  // Namespace de dispositivo (`\\?\`, `\\.\`): local, exceto quando o que vem depois é `UNC\`.
  if (/^[?.]\\/.test(resto)) return /^UNC(\\|$)/i.test(resto.slice(2));
  return true;
}

/**
 * Caminho relativo à raiz do projeto, decidido pela IDENTIDADE dos diretórios e não pela forma da
 * string. Devolve `{ decidiu, rel }`.
 *
 * POR QUE NÃO CANONIZAR POR STRING. Três rodadas foram gastas assim e cada uma achou uma família
 * nova de alias do Windows. As sete formas abaixo escrevem no MESMO arquivo real (verificado
 * executando `writeFileSync` em cada uma) e nenhuma casava a raiz do projeto por texto:
 * `\\?\C:\...`, `\\.\C:\...`, `//?/C:/...`, `\\localhost\C$\...`, `\\127.0.0.1\C$\...`,
 * `CLAUDE.md::$DATA` e `C:CLAUDE.md` (relativo à unidade). Some-se o nome curto 8.3 (`MURILO~1`).
 * `realpathSync.native` também NÃO basta: ele resolve 8.3, `\\?\` e `\\.\`, mas PRESERVA
 * `\\localhost\C$\`. Quem sabe o que a string quer dizer é o sistema de arquivos; então a pergunta
 * passa a ser feita a ele, e a família inteira fecha de uma vez — inclusive as formas que ninguém
 * enumerou ainda.
 *
 * O ALGORITMO: sobe de pai em pai a partir do alvo, comparando `dev`+`ino` de cada ancestral
 * contra os da raiz e acumulando os nomes. Achou a raiz, devolve o relativo; chegou no topo do
 * sistema de arquivos sem achar, devolve `rel: null` — está fora do projeto, de verdade.
 *
 * QUATRO DETALHES QUE PARECEM DISPENSÁVEIS E NÃO SÃO:
 *   - DIRETÓRIO QUE AINDA NÃO EXISTE (escrita criando árvore nova) não pode virar `null`: `null`
 *     LIBERA a escrita. `ENOENT`/`ENOTDIR` num ancestral faz subir mais um nível acumulando o
 *     nome, até achar um ancestral que exista;
 *   - ANCESTRAL ILEGÍVEL (qualquer erro que não seja ausência) devolve `decidiu: false`, e NÃO
 *     relança. Medido executando: `statSync` sobre `\\servidor-que-nao-existe\share\x.md` levanta
 *     `UNKNOWN`. Relançar ali produziria deny de "falha do harness, reporte" sobre uma escrita
 *     FORA do projeto — o consultor sem VPN, ou com um share desmontado, seria mandado caçar um
 *     bug que não existe, e antes desta rodada essa escrita simplesmente liberava. Isto NÃO é
 *     engolir o erro (restrição global 1 fala de confundir ausência com ilegibilidade ao ler
 *     CONTEÚDO, e aqui não se devolve "vazio" nenhum): é dizer que este oráculo não respondeu e
 *     deixar o outro — a resolução textual — responder, que é o mesmo recuo do caso sem `ino`. O
 *     texto sempre responde, e para o caminho canônico ele responde CERTO. O buraco residual exige
 *     ao mesmo tempo um alias do Windows E um ancestral ilegível DENTRO do projeto; nesse caso a
 *     defesa é a que existia antes do C4, nunca pior que ela;
 *   - o relativo devolvido preserva a CAIXA que o chamador escreveu. A identidade decide
 *     pertencimento; a string só aparece na mensagem de erro, e lá ela tem que ser o que o usuário
 *     digitou. A comparação insensível a caixa do `casa()` cuida do resto;
 *   - `decidiu: false` e `rel: null` são coisas DIFERENTES. "Não consegui decidir" (sistema de
 *     arquivos sem `ino`, raiz ilegível, profundidade estourada) tem que cair na resolução TEXTUAL
 *     (`relativizar`), não liberar. Um único `null` para as duas — como no protótipo — apagaria
 *     essa distinção no ponto onde ela decide se a trava existe.
 *
 * O alvo em si NUNCA é consultado no disco: só o nome dele é acumulado. Isso é o que faz a função
 * responder igual para arquivo que existe e arquivo que está sendo criado agora.
 *
 * Caminho não absoluto é resolvido contra `raizAbs`, mesma convenção do `relativizar` acima.
 * Custo medido: mediana 0,71 ms, p95 1,6 ms por chamada — folgado dentro dos 50 ms da Decisão 14.
 *
 * `statear` é ponto de injeção só para teste — mesmo padrão do `statear` de `estaCongelado` e do
 * `lerDiretorio` de `inventariar`. Existe porque erro de I/O que não seja ausência não se produz
 * de forma portável, e sem ele o recuo acima fica sem teste.
 */
export function relativizarPorIdentidade(raizAbs, caminhoBruto, statear = statSync) {
  const NAO_DECIDIU = { decidiu: false, rel: null };
  const bruto = String(caminhoBruto == null ? '' : caminhoBruto);
  if (!bruto) return { decidiu: true, rel: null };

  // ANTES DE QUALQUER I/O — ver `ehCaminhoDeRede`. Um share fora do ar custa de 2,9 s a 43 s por
  // `stat`, e o gate inteiro não pode depender de a VPN estar de pé.
  if (ehCaminhoDeRede(bruto)) return NAO_DECIDIU;

  let idRaiz;
  try {
    idRaiz = idDe(raizAbs, statear);
  } catch {
    return NAO_DECIDIU; // raiz ilegível: quem responde é o texto, não o silêncio
  }
  if (!idRaiz) return NAO_DECIDIU; // sistema de arquivos sem `ino` confiável

  let abs;
  try {
    abs = resolve(raizAbs, bruto);
  } catch {
    return NAO_DECIDIU; // caminho que o próprio `resolve` recusa
  }

  const partes = [semStream(basename(abs))];
  let atual = dirname(abs);

  for (let i = 0; i < MAX_SUBIDA; i++) {
    let idAtual;
    try {
      idAtual = idDe(atual, statear);
    } catch (erro) {
      if (!ehAusencia(erro)) return NAO_DECIDIU; // ancestral ilegível: quem responde é o texto
      const pai = dirname(atual);
      if (pai === atual) return { decidiu: true, rel: null };
      partes.push(basename(atual)); // ancestral vai com o nome que tem — ver `semStream`
      atual = pai;
      continue;
    }
    if (!idAtual) return NAO_DECIDIU;
    if (mesmoArquivo(idAtual, idRaiz)) return { decidiu: true, rel: partes.slice().reverse().join('/') };
    const pai = dirname(atual);
    if (pai === atual) return { decidiu: true, rel: null };
    partes.push(basename(atual)); // ancestral vai com o nome que tem — ver `semStream`
    atual = pai;
  }
  return NAO_DECIDIU;
}

/**
 * A resposta de PRODUÇÃO para "que caminho é este, relativo à raiz do projeto?".
 *
 * Identidade primeiro; o texto é o recuo, e só entra quando a identidade não pôde responder —
 * sistema de arquivos sem `ino`, raiz ilegível, profundidade patológica, caminho de rede. Ali a
 * defesa volta a ser comparação de string, com os aliases do Windows abertos de novo: é recuo
 * assumido e não silencioso, e é preferível a não decidir nada, porque não decidir nada libera.
 *
 * `decidiu: false` e `rel: null` são coisas DIFERENTES, e é aqui que a distinção rende: "decidi
 * que está fora do projeto" devolve `null` e o texto NÃO é consultado; "não consegui decidir" cai
 * no texto. Colapsar as duas apagaria a distinção no ponto exato onde ela decide se a trava existe.
 *
 * MORA AQUI, e não na casca de cada despachante, porque isto é POLÍTICA — qual oráculo manda, e em
 * que ordem. Escrita duas vezes, ela diverge, e os dois despachantes passariam a responder
 * diferente sobre o MESMO caminho. É a mesma razão pela qual `DESTRUICAO_CATASTROFICA` mora neste
 * módulo e não em quem a consome.
 *
 * `statear` É PONTO DE INJEÇÃO SÓ PARA TESTE, repassado inteiro à `relativizarPorIdentidade` —
 * mesmo padrão do `statear` de `estaCongelado` (zonas.mjs) e do `lerDiretorio` de `inventariar`.
 * Existe porque o RECUO só é alcançável quando a identidade falha, e erro de I/O que não seja
 * ausência não se produz de forma portável: sem ele, o `else` desta linha fica sem teste e a
 * política vira uma linha que ninguém consegue observar. Chamadores de produção passam dois
 * argumentos — `IO_REAL.relativizar` (pretooluse.mjs) é um arrow de dois parâmetros e nem chega a
 * mencionar o terceiro. Isso NÃO é código morto a ser removido: é a mesma decisão de desenho das
 * duas irmãs acima, e quem o remover tira o único teste que prova que a identidade vem primeiro.
 */
export function relativizarComRecuo(raiz, bruto, statear = statSync) {
  const r = relativizarPorIdentidade(raiz, bruto, statear);
  return r.decidiu ? r.rel : relativizar(raiz, bruto);
}
