// Harness Elo v2 — Validação do arquivo recém-escrito. Núcleo puro + entrada do despachante.
//
// Verificador INFORMATIVO do PostToolUse: a escrita já aconteceu, então negar não faz sentido.
// O valor está em devolver o erro na hora, enquanto o contexto está fresco, em vez de o
// consultor descobrir no fecho da fase que doze documentos têm o mesmo problema.
//
// GRAMÁTICA DE ID E TOKEN: este módulo NÃO tem tabela própria. Ele pergunta ao kit.mjs e ao
// tokens.mjs, que são as autoridades. Reimplementar regex de ID aqui seria a duplicação que a
// Task 8 da Fundação existiu para eliminar.
//
// CABEÇALHO DO DOCUMENTO: a afirmação acima NÃO vale, e dizer que valia era mentira. As duas
// regex de `conferirCabecalho` abaixo eram, até a rodada J, a única definição do contrato de
// cabeçalho no repositório inteiro — `grep` por `Changelog` em `.claude/rules`, `docs` e
// `CLAUDE.md` não devolvia nenhuma regra que exigisse versão ou changelog. Um contrato cuja única
// definição é uma regex de verificador não tem dono: ninguém o decidiu, e afrouxá-lo ou
// endurecê-lo era gratuito para a suíte. O contrato agora está escrito em
// `.claude/rules/harness/explore.md`, seção **Cabeçalho de todo documento do Explore**, e é DE LÁ
// que as duas regex abaixo derivam. Mudar uma sem a outra é divergência — ver o teste
// `o contrato de cabeçalho está ESCRITO na rule`.

import {
  validadorPara, acharMalFormados, acharProibidos, caminhoDaTool,
  FAMILIAS_EXPLORE, RAIZ_EXPLORE, ID_PADRAO, CODIGOS_DE_AUSENCIA_DE_DOCUMENTO,
} from './kit.mjs';
import { tokensSobreviventes, secoesVazias, CERCA_NAO_FECHADA } from './tokens.mjs';

/**
 * Ênfase markdown removida — `**`, `*` e `_` viram nada.
 *
 * A checagem de versão roda sobre o texto assim achatado, e não sobre o bruto, porque a pergunta é
 * *"o documento declara uma versão?"* e não *"o documento declara uma versão com exatamente a
 * marcação que o template usa?"*. As quatro formas que a rodada I mediu como recusadas —
 * `**Versão**: 0.1`, `*Versão:* 0.1`, `Versão: 0.1`, `**Versão :** 0.1` — colapsam todas em
 * `Versão: 0.1` depois disto, e uma regex só responde pelas cinco.
 */
function semEnfase(texto) {
  return String(texto || '').replace(/[*_]/g, '');
}

/**
 * O documento DECLARA uma versão? A palavra, dois-pontos, e algum valor na MESMA linha.
 *
 * `[ \t]*\S` e não `\s*\S`: `\s` casa quebra de linha, e aí um `**Versão:**` sem valor seria
 * satisfeito pela primeira linha não vazia abaixo dele. O valor tem que estar ao lado.
 *
 * O que continua sendo recusado é a AUSÊNCIA REAL — documento que não menciona versão nenhuma. O
 * cabeçalho da tabela do changelog (`| Versão | Data | Mudança |`) não tem dois-pontos e não
 * satisfaz a checagem, que é o certo: ele é a coluna, não a declaração.
 */
const RE_VERSAO = /vers(ã|a)o\s*:[ \t]*\S/i;

/**
 * A seção de changelog, em qualquer nível de `##` a `####`, em qualquer caixa, numerada como o
 * template numera as outras seções (`## 0. Changelog`), e com sufixo (`## Changelog do documento`).
 *
 * Era `/^##\s+Changelog\s*$/m` — nível, caixa, numeração e sufixo, todos exatos. Medido na rodada
 * I: 4 de 5 variantes que uma pessoa escreve eram acusadas. O que importa para o gate de
 * fechamento é que EXISTA uma seção de changelog; que ela seja `##` e não `###`, ou `CHANGELOG` e
 * não `Changelog`, não é informação que valha uma mensagem de erro ao consultor.
 *
 * `\b` no fim para não aceitar `## Changelogs internos do fornecedor`… na verdade aceita, porque
 * `\b` casa antes do `s`. Aceitar é a resposta certa aqui: sob o modelo de acidente, o custo de
 * aceitar um título parecido é zero, e o de recusar o título que a pessoa escreveu é a camada
 * desligada.
 */
const RE_CHANGELOG = /^#{2,4}\s+(?:\d+[.)]?\s+)?changelog\b/im;

/**
 * Cabeçalho com versão e changelog — exigência do gate de fechamento, escrita em
 * `.claude/rules/harness/explore.md`. Ver o cabeçalho deste arquivo sobre quem é o dono do
 * contrato: até a rodada J, ninguém era.
 */
function conferirCabecalho(texto) {
  const erros = [];
  if (!RE_VERSAO.test(semEnfase(texto))) {
    erros.push('Cabeçalho sem versão — escreva `**Versão:** 0.1` na linha de cabeçalho. O gate de fechamento exige versão e changelog em todo documento do Explore.');
  }
  if (!RE_CHANGELOG.test(texto)) {
    erros.push('Falta a seção `## Changelog` — sem ela não há como saber o que mudou entre revisões do cliente.');
  }
  return erros;
}

/**
 * Como se escreve um ID de cada família, EM PROSA — uma frase por família, não um texto colado.
 *
 * Era um texto só, repetido nas quatro: *"numeração com três dígitos (`MOD-007`), código de módulo
 * em maiúsculas, dígitos e hífen"*. Nas três famílias numeradas, metade da frase é ruído (não há
 * "código de módulo" em `RF`/`RN`/`GAP`); na `MOD`, a outra metade ENSINA O ERRADO — `MOD` não é
 * numerada, e `MOD-007` **passa** na regex, então a mensagem de correção convidava o consultor a
 * escrever um código de módulo sem sentido nenhum e a ferramenta aplaudiria.
 *
 * Uma mensagem de verificador informativo é o produto inteiro: não há bloqueio, só o que ela diz.
 * Dizer o errado é pior do que calar, porque o consultor obedece.
 *
 * Estas frases NÃO são a gramática — a gramática é `ID_PADRAO`, no kit, e é ela que é interpolada
 * junto. Isto é a explicação em português do padrão que o kit define.
 */
const COMO_SE_ESCREVE = Object.freeze({
  MOD: 'código do módulo em MAIÚSCULAS, dígitos e hífen (`MOD-PAGAMENTOS`, `MOD-ACOMP-CARGA`) — a família `MOD` não é numerada: o código diz QUAL módulo é',
  RF: 'numeração com três dígitos (`RF-007`), quatro tolerados — o padding é o que faz o relatório ordenar certo',
  RN: 'numeração com três dígitos (`RN-007`), quatro tolerados — o padding é o que faz o relatório ordenar certo',
  GAP: 'numeração com três dígitos (`GAP-007`), quatro tolerados — o padding é o que faz o relatório ordenar certo',
});

/**
 * IDs mal formados, perguntando ao `kit.mjs` — que é a autoridade de gramática.
 * Este módulo NÃO define fronteira de token própria: ver o Step 0 desta tarefa.
 *
 * O laço percorre as QUATRO famílias de `FAMILIAS_EXPLORE`. Conferir só a `RF` foi mutação que
 * sobreviveu à suíte do plano, porque todos os casos de ID mal formado dela eram de `RF`; hoje há
 * um caso por família, e cada um morre se a sua sair do laço.
 */
function conferirIds(texto) {
  const erros = [];
  for (const familia of FAMILIAS_EXPLORE) {
    for (const bruto of acharMalFormados(familia, texto)) {
      erros.push(
        `\`${bruto}\` não é um ID válido da família \`${familia}\`. ` +
        `O padrão é \`${ID_PADRAO[familia]}\` — ${COMO_SE_ESCREVE[familia]}.`,
      );
    }
  }
  return [...new Set(erros)];
}

/** `F-xxx` é fato atômico da spec-ingest e não pode aparecer em outputs/explore/ (Decisão 8). */
function conferirVocabulario(texto) {
  const proibidos = acharProibidos(texto);
  if (!proibidos.length) return [];
  return [
    `${proibidos.map((p) => `\`${p}\``).join(', ')} — a família \`F-\` é vocabulário do ` +
    '`Elo-Spec-Kit`, onde significa fato atômico com âncora de evidência, e a `spec-ingest` vai ' +
    `gerar os \`F-xxx\` **a partir** deste documento. Em \`${RAIZ_EXPLORE}/\` funcionalidade é ` +
    '`RF-nnn`. Dois `F` no mesmo arquivo destroem o rastreio exatamente onde ele importa.',
  ];
}

/**
 * Vazio é fato mecânico e entra como erro; raso é julgamento humano e não é conferido.
 *
 * A CERCA NÃO FECHADA TEM MENSAGEM PRÓPRIA, e não é enfeite. `secoesVazias` devolve
 * `CERCA_NAO_FECHADA` na mesma lista das seções, mas o fato é OUTRO: não é "esta seção ficou sem
 * corpo", é "daqui para baixo eu não consigo mais avaliar seção nenhuma". Escrever `A seção
 * \`[defeito] cerca de código...\` tem título e nenhum conteúdo.` manda o consultor procurar uma
 * seção que não existe e esconde a consequência real. Os dois ramos são cobertos por testes que se
 * afirmam pela ausência da frase do outro — afirmar só `/cerca/` casa com os dois e não testa nada.
 */
function conferirPreenchimento(relPath, texto) {
  const erros = [];
  const sobreviventes = tokensSobreviventes(relPath, texto);
  if (sobreviventes.length) {
    erros.push(
      `Token de preenchimento não trocado: ${sobreviventes.map((t) => `\`${t}\``).join(', ')}. ` +
      'Se o campo não se aplica, escreva por que não se aplica — não deixe o placeholder.',
    );
  }
  for (const s of secoesVazias(texto)) {
    if (s === CERCA_NAO_FECHADA) {
      erros.push('Há uma cerca de código (```) aberta e não fechada. Além de quebrar a renderização, ela esconde as seções seguintes da verificação de preenchimento.');
    } else {
      erros.push(`A seção \`${s}\` tem título e nenhum conteúdo.`);
    }
  }
  return erros;
}

/**
 * Valida um documento do Explore. Arquivo sem validador dedicado devolve resultado vazio —
 * isto é verificação de contrato, não lista de permissão.
 */
export function validarExplore(relPath, texto) {
  const vazio = { arquivo: relPath, erros: [], avisos: [] };
  if (validadorPara(relPath) !== 'check-explore') return vazio;
  const t = String(texto || '');
  return {
    arquivo: relPath,
    erros: [
      ...conferirCabecalho(t),
      ...conferirIds(t),
      ...conferirVocabulario(t),
      ...conferirPreenchimento(relPath, t),
    ],
    avisos: [],
  };
}

/** Texto para o agente. `null` quando não há nada a dizer — silêncio é a resposta correta. */
export function formatarRelatorio(r) {
  if (!r || (!r.erros.length && !r.avisos.length)) return null;
  const linhas = [`\`${r.arquivo}\` — ${r.erros.length} ponto(s) a corrigir:`];
  for (const e of r.erros) linhas.push(`  · ${e}`);
  for (const a of r.avisos) linhas.push(`  ~ ${a}`);
  return linhas.join('\n');
}

// ————————————————————————————— entrada do despachante —————————————————————————————

/**
 * Lê o arquivo recém-escrito e devolve o relatório.
 *
 * Recebe `io` em vez de chamar `process.cwd()`/`readFileSync` direto — é a **restrição global 5**:
 * o wiring que não tem ponto de injeção é o wiring que ninguém testa, e foi assim que as travas
 * da Task 2 ficaram contornáveis com a suíte verde. Por isso este arquivo NÃO importa `node:fs`:
 * as operações reais moram no `IO_REAL` do `posttooluse.mjs`, que é a casca dos dois.
 *
 * `io` precisa de TRÊS operações — `cwd()`, `relativizar(raiz, bruto)` e `lerArquivo(abs, enc)`.
 * A resolução de caminho é do `io`, e não do `relativizar` textual do kit, porque a resposta certa
 * depende do sistema de arquivos: a política é `relativizarComRecuo` (identidade primeiro, texto
 * como recuo), e é a MESMA que o `pretooluse.mjs` injeta. Chamar o textual aqui faria os dois
 * despachantes responderem diferente sobre o mesmo `file_path` — que é exatamente o que a família
 * de aliases do Windows explorou, e que nenhuma canonização por string fechou em três tentativas.
 *
 * QUAL CAMPO LER TAMBÉM É PERGUNTA DO KIT. `caminhoDaTool` responde por `file_path` e
 * `notebook_path` — schemas diferentes, não sinônimos. Ler só o primeiro já deixou a fiscalização
 * de notebook inexistente uma vez, com o gatilho declarado e o teste verde.
 *
 * Ausência do arquivo devolve `null` — pode ter sido removido entre a escrita e o hook.
 * Qualquer outro erro é RELANÇADO; o despachante trata como falha de verificador informativo,
 * registra e segue, sem derrubar a escrita. Engolir tudo aqui transformaria "não consegui ler"
 * em "está tudo certo", que são as duas conclusões mais distantes possíveis.
 *
 * QUAIS CÓDIGOS são ausência é pergunta do `CODIGOS_DE_AUSENCIA_DE_DOCUMENTO` do `kit.mjs`, e a
 * justificativa de cada um está lá, junto da definição. Aqui ela não é repetida de propósito: este
 * módulo e o `sync-log.mjs` guardavam cada um a sua CÓPIA do conjunto — a mesma fonte escrita duas
 * vezes que esta tarefa proibiu na `plan.md` —, e as duas já podiam divergir sem que nada avisasse.
 *
 * O que fica registrado aqui, porque é específico DESTE verificador: relançar no ramo de ausência
 * produziria uma entrada em `falhas` que o `main()` descarta sem log nem stderr, ou seja, efeito
 * observável zero com o custo de uma falha fantasma no dia em que alguém ligar o log. (A rodada D
 * tinha removido este tratamento por o caminho ser inalcançável; a leitura de arquivo por escrita
 * voltou em `4111622` e o alcança de novo.)
 */
export function avaliar(payload, io) {
  const abs = caminhoDaTool((payload && payload.tool_input) || {});
  if (!abs) return null;
  const rel = io.relativizar(io.cwd(), abs);
  // ESTE GUARDA VEM ANTES DA LEITURA, e não é redundante com o de `validarExplore`.
  // Semanticamente as duas ordens dão o mesmo resultado — `validarExplore` também devolve vazio
  // para arquivo sem validador —, e por isso removê-lo daqui é INVISÍVEL para a resposta. O que
  // muda é que o hook passa a ler do disco TODO arquivo escrito em qualquer lugar do projeto, em
  // toda tool call de escrita. Medido na rodada I, sobre um `screens-manifest.json` de 1,9 MB:
  // p50 de 0,70 ms sobe para 11,88 ms — 17×. O teste `avaliar NÃO lê o disco fora de
  // outputs/explore` conta as leituras pelo `io` de mentira, porque um guarda que só existe para
  // desempenho não é prendível por asserção sobre o valor devolvido.
  if (!rel || validadorPara(rel) !== 'check-explore') return null;

  let texto = '';
  try {
    texto = io.lerArquivo(abs, 'utf8');
  } catch (erro) {
    if (erro && CODIGOS_DE_AUSENCIA_DE_DOCUMENTO.has(erro.code)) return null;
    throw erro;
  }

  const aviso = formatarRelatorio(validarExplore(rel, texto));
  return aviso ? { aviso } : null;
}
