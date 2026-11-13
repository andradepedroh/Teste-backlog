// Harness Elo v2 — Cobertura de promoção Explore→Plan (Decisões 15 e 21).
//
// EXECUTÁVEL DE MÃO (Decisão 20): roda por comando, no marco do Plan, quando a `spec-product`
// termina. Não é verificador — não entra no `settings.json`, nenhum despachante o importa, e não
// tem orçamento de latência.
//
// NÃO BLOQUEIA, e isso é desenho: descarte de requisito pode ser legítimo — o cliente cortou
// escopo. O que a Decisão 15 exige é linha no `gaps.md`, que é escrita humana e deliberada. Por
// isso ele SEMPRE sai com código 0: transformar contagem de órfãos em exit code criaria limiar, e
// limiar vira alvo. É a mesma razão pela qual o `revisao.mjs` relata e não trava.
//
// E O MODO RELATÓRIO NÃO ESCREVE ARQUIVO NENHUM — imprime no stdout. Quem escreve é o modo
// `--congelar`, e ele é o outro lado da Decisão 20: verificador não pode produzir arquivo,
// executável de mão pode. Ele carimba os cinco documentos do Explore, RELÊ o disco para conferir
// que nenhum ficou sem carimbo, e só então cria o marcador que liga a trava — nesta ordem, que é
// contrato e não estilo. Ver `congelar`.

import {
  RAIZ_EXPLORE, RAIZ_SPEC, DOCS_EXPLORE, chave,
  extrairIds, extrairIdsPlan, FAMILIAS_EXPLORE, ID_PADRAO_PLAN, ARTEFATOS_DE_PROMOCAO,
  REGRAS_DE_PROMOCAO, CODIGOS_DE_AUSENCIA_DE_DOCUMENTO, MARCADOR_CONGELAMENTO,
} from '../hooks/kit.mjs';
// A noção de «isto está dentro de cerca de código» tem dono, e é o `tokens.mjs`: um heading citado
// num bloco ``` não é seção do documento (âncora por seção, D12) nem bloco de regra (D14).
import { mapearCercas } from '../hooks/tokens.mjs';
// MÃO ÚNICA: a ferramenta importa do hook, nunca o contrário. O `zonas.mjs` é o DONO do conceito de
// congelamento — as duas representações (o carimbo e o marcador) são montadas por ele, e a regex
// que lê o carimbo é derivada de `montarCarimbo`. Nada aqui reescreve nenhum desses textos.
import { montarCarimbo, lerCarimbo, montarMarcador } from '../hooks/zonas.mjs';

// ————————————————————————————— leitura de tabela markdown —————————————————————————————

const ehSeparador = (celulas) => celulas.every((c) => /^:?-{2,}:?$/.test(c.trim()));

/**
 * As células de uma linha de tabela. O `slice` corta os vazios que as barras de borda produzem.
 * Não trata `\|` escapado: nenhum dos dois templates do kit usa, e tratar exigiria um parser de
 * markdown — que é dependência, e o harness não tem nenhuma.
 */
function partirLinha(linha) {
  const partes = linha.split('|');
  if (partes[0].trim() === '') partes.shift();
  if (partes.length && partes[partes.length - 1].trim() === '') partes.pop();
  return partes.map((c) => c.trim());
}

const normalizar = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * TODAS as tabelas cujo cabeçalho contém `agulha`, cada uma com colunas e linhas de dados.
 *
 * "TODAS" É O PONTO. O `context-map.md` tem uma tabela de fatos POR FONTE — uma para cada
 * `### Fonte:` —, e ler só a primeira produz relatório silenciosamente parcial: os fatos das
 * fontes seguintes viram órfãos sem que nada acuse. A comparação de cabeçalho é acento-insensível
 * porque `Âncora` e `Ancora` são a mesma coluna para quem preenche à mão.
 */
export function tabelasCom(texto, agulha) {
  const alvo = normalizar(agulha);
  const saida = [];
  let atual = null;
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha.startsWith('|')) { atual = null; continue; }
    const celulas = partirLinha(linha);
    if (!atual) {
      if (celulas.some((c) => normalizar(c).includes(alvo))) {
        atual = { colunas: celulas, linhas: [] };
        saida.push(atual);
      }
      continue;
    }
    if (ehSeparador(celulas)) continue;
    atual.linhas.push(celulas);
  }
  return saida;
}

/**
 * O índice da coluna cujo cabeçalho casa `agulha`, ou -1. Por substring, ou por igualdade quando
 * `exato`.
 *
 * `exato` EXISTE POR CAUSA DA COLUNA `ID`. Por substring, `Prioridade` e `Validade` contêm `id`, e
 * hoje isso não morde só porque `ID` é a primeira coluna nos dois templates do kit — uma coluna
 * acrescentada à mão ANTES dela deslocaria o índice em silêncio, e o relatório passaria a ler
 * prioridade onde espera requisito. Os cabeçalhos longos continuam por substring, porque é o
 * miolo deles que é estável: o kit escreve `Âncora (§ + ID da fonte / minuto)` e `Fato fonte
 * (F-xxx)`, e quem preenche à mão apara o parêntese (e o cabeçalho antigo, `Âncora (linha § /
 * minuto)`, de projetos anteriores ao item 10 da §8 do Plano 5 — por isso substring, não
 * igualdade).
 */
function indiceDa(colunas, agulha, exato = false) {
  const alvo = normalizar(agulha);
  return colunas.findIndex((c) => (exato ? normalizar(c) === alvo : normalizar(c).includes(alvo)));
}

/**
 * A célula é, inteira, um `F-xxx`?
 *
 * O padrão vem do `ID_PADRAO_PLAN.FATO` do kit e é ancorado aqui — escrever `/^F-\d{3,4}$/` à mão
 * criaria um SEGUNDO dono da gramática de `F-xxx`, que é exatamente o que a tabela de IDs do kit
 * existe para impedir. Ancorado porque aqui a pergunta é "a célula é um ID", não "há um ID no
 * meio do texto": `| F-001 e F-002 |` numa coluna `ID` é preenchimento errado, não dois fatos.
 */
const RE_FATO_INTEIRO = new RegExp(`^${ID_PADRAO_PLAN.FATO}$`);

/**
 * DECISÃO DO PASSO 8 (conferência contra os templates reais do kit): o template real de
 * `context-map.md` (`spec-ingest/templates/context-map.md`) traz a linha de exemplo
 * `| F-001 | | | | alta/média/baixa |` — ID válido, Fato e Âncora em branco. `ehFato` a aceita
 * (o ID casa o padrão de fato do kit de verdade), então `lerFatos` sobre o template intocado
 * devolve UM fato, não zero.
 *
 * ESCOLHA: o exemplo conta, e não recebe filtro extra. Um filtro que exigisse Fato OU Âncora
 * não vazios pareceria mais seguro, mas erraria o alvo: se um projeto real esquecer de apagar
 * este `F-001` de exemplo, a âncora dele CONTINUA vazia, e `rastreavel('')` já devolve `false` —
 * o relatório o classifica em `ancorasNaoRastreaveis`, nunca em `cobertos` nem em `orfaos`
 * (nenhum `idsExplore` casaria uma âncora vazia). Isso é verdade, não falso positivo: o fato foi
 * criado e nunca preenchido, e "não consigo seguir esta âncora" é exatamente a leitura certa —
 * a mesma razão de existir da quarta categoria (Decisão 21). Filtrar por "Fato ou Âncora não
 * vazios" esconderia esse caso real (fato com Fato preenchido mas Âncora esquecida em branco,
 * por exemplo) atrás da mesma regra que tentaria matar só o exemplo do template — as duas coisas
 * têm a mesma forma e não dá para distinguir sem uma segunda convenção. Não "conserte" isto
 * acrescentando o filtro sem decisão explícita.
 */
const ehFato = (s) => RE_FATO_INTEIRO.test(String(s == null ? '' : s).trim());

// ————————————————————————————— os fatos e suas âncoras —————————————————————————————

/** `[{ id, ancora }]` de todas as tabelas de fatos atômicos do `context-map.md`. */
export function lerFatos(texto) {
  const saida = [];
  for (const t of tabelasCom(texto, 'Âncora')) {
    const iId = indiceDa(t.colunas, 'ID', true);
    const iAncora = indiceDa(t.colunas, 'Âncora');
    if (iId < 0 || iAncora < 0) continue;
    for (const celulas of t.linhas) {
      const id = (celulas[iId] || '').trim();
      // Linha de exemplo do template (`| |` ou `| [ID] |`) e linha vazia caem aqui. O template em
      // branco não deve produzir achado — ele produz "nada foi preenchido", que é outra conversa.
      if (!ehFato(id)) continue;
      saida.push({ id, ancora: (celulas[iAncora] || '').trim() });
    }
  }
  return saida;
}

const NOMES_DO_EXPLORE = DOCS_EXPLORE.map((d) => d.caminho);

/**
 * A âncora nomeia algum documento do Explore?
 *
 * A comparação passa pelo `chave()` do kit, e não por `includes` cru, porque o resto do harness
 * compara caminho assim: `Especificacao-Funcional.md linha 214` é o MESMO arquivo neste sistema de
 * arquivos, e com `includes` sensível a caixa essa âncora passava como rastreável — a forma que a
 * rule proíbe entrando por diferença de maiúscula. Ninguém aqui escreve o segundo `toLowerCase()`
 * à mão.
 */
const citaDocDoExplore = (ancora) => {
  const alvo = chave(ancora);
  return NOMES_DO_EXPLORE.some((n) => alvo.includes(chave(n)));
};

/**
 * Esta âncora pode ser seguida de volta até um ID do Explore? (Decisão 21)
 *
 * QUATRO CASOS, e os dois últimos são o que a rule estreitou e depois o D12 corrigiu:
 *   - carrega ID de família do Explore  → SIM, é a forma que a rule fixa;
 *   - não cita documento do Explore     → SIM, e é importante que seja: o cabeçalho do kit oferece
 *                                         `linha § / minuto`, e para transcrição ou PDF de entrada
 *                                         o minuto/página É a forma certa. Acusar isso seria falso
 *                                         positivo sobre a convenção do próprio kit;
 *   - cita documento do Explore sem ID, → SIM, mas só com os documentos em mãos (`docs`). Ver
 *     por SEÇÃO, e a seção existe e      `ancoraDeSecaoSemId`;
 *     não tem ID
 *   - cita documento do Explore sem ID  → NÃO. É a forma `linha`, que a
 *     de qualquer outro jeito             `.claude/rules/harness/plan.md` proíbe porque ela morre
 *                                         no primeiro rework do documento.
 * Âncora vazia é o caso degenerado do último: não há como seguir nada.
 *
 * `docs` é OPCIONAL — `Map<nome do documento do Explore, texto>`, o `docsExplore` do `coletar`.
 * Sem ele a terceira forma não é medida e cai na quarta: quem chama sem os documentos não tem como
 * saber se a seção existe, e afirmar que sim seria aceitar a âncora sem ter olhado.
 */
export function rastreavel(ancora, docs = null) {
  const texto = String(ancora || '').trim();
  if (!texto) return false;
  for (const familia of FAMILIAS_EXPLORE) {
    if (extrairIds(familia, texto).length) return true;
  }
  if (!citaDocDoExplore(texto)) return true;
  return ancoraDeSecaoSemId(texto, docs);
}

// ————————————————————— âncora por seção sem ID (D12 do teste ponta a ponta da 2.6.0) —————————————————————
//
// O Explore tem quatro famílias de ID (MOD, RF, RN, GAP), e boa parte dele não tem ID nenhum: as
// personas e a matriz de acesso (§1 da `especificacao-funcional.md`), a tabela de telas quando não
// cita RF (§2), a `especificacao-tecnica.md` inteira. A convenção `<arquivo> §<seção> <ID>` acusava
// «ÂNCORA NÃO RASTREÁVEL» em todo fato colhido dali, e a única «correção» possível era pendurar um
// RF/RN qualquer na âncora — rastreio inventado, que é pior que rastreio ausente. A âncora
// `<arquivo> §<seção>` vale quando a seção EXISTE no documento e NÃO TEM ID: aí não há ID a
// carregar, e a seção é estável o bastante para ser seguida (é título, não número de linha).

/**
 * As famílias cujo ID, presente na seção, obriga a âncora a carregá-lo. GAP fica FORA: GAP-nnn é
 * pergunta em aberto, não entidade que o Plan promova, e uma persona que diz «sem acesso nesta fase
 * (GAP-003)» não vira seção de ID por citar a pergunta.
 */
const FAMILIAS_QUE_A_ANCORA_CARREGA = FAMILIAS_EXPLORE.filter((f) => f !== 'GAP');

const RE_HEADING_MD = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_NUMERO_DE_SECAO = /^(\d+(?:\.\d+)*)\.?(?=\s|$)/;

/**
 * O texto da seção que `referencia` (o que vem depois do `§` na âncora) nomeia — do heading dela,
 * inclusive, até o próximo heading de nível igual ou mais alto —, ou `null` se ela não existe.
 *
 * PELO NÚMERO, quando a referência começa com um (`1.1 Vendedor` acha `### 1.1 Personas`; `1` acha
 * `## 1. Personas…` e leva junto as subseções): é a forma que a `spec-ingest` escreve. SEM NÚMERO,
 * pelo título, com caixa e acento livres (`§Premissas tecnicas` acha `## 4. Premissas técnicas`).
 * O HEADING ENTRA no texto da seção: `### 3.1 MOD-PAG — Pagamentos` é seção com ID, e a âncora
 * `§3.1 Pagamentos` sem o `MOD-PAG` não pode passar por isso.
 *
 * Heading dentro de cerca de código não é seção (`mapearCercas`, o dono da noção de cerca).
 */
export function textoDaSecao(documento, referencia) {
  const ref = String(referencia || '').trim();
  if (!ref) return null;
  const { linhas, dentro } = mapearCercas(documento);
  const headings = [];
  linhas.forEach((l, i) => {
    if (dentro[i]) return;
    const m = RE_HEADING_MD.exec(l.trim());
    if (m) headings.push({ i, nivel: m[1].length, titulo: m[2] });
  });
  const numero = RE_NUMERO_DE_SECAO.exec(ref);
  let alvo;
  if (numero) {
    alvo = headings.find((h) => {
      const n = RE_NUMERO_DE_SECAO.exec(h.titulo);
      return n && n[1] === numero[1];
    });
  } else {
    const r = normalizar(ref);
    alvo = r.length >= 3 && headings.find((h) => {
      const t = normalizar(h.titulo.replace(RE_NUMERO_DE_SECAO, '')).trim();
      return t.length >= 3 && (r.startsWith(t) || t.startsWith(r));
    });
  }
  if (!alvo) return null;
  const fim = headings.find((h) => h.i > alvo.i && h.nivel <= alvo.nivel);
  return linhas.slice(alvo.i, fim ? fim.i : linhas.length).join('\n');
}

/**
 * A âncora é `<documento do Explore> §<seção>`, a seção existe, e não tem ID? Ver o bloco acima.
 * Documento que não foi lido (fora de `docs`) não é medido, e a resposta é `false` — a regra antiga.
 */
function ancoraDeSecaoSemId(ancora, docs) {
  if (!docs || typeof docs.get !== 'function') return false;
  const corte = ancora.indexOf('§');
  if (corte < 0) return false;
  const alvo = chave(ancora);
  const documento = NOMES_DO_EXPLORE.find((n) => alvo.includes(chave(n)));
  const texto = documento ? docs.get(documento) : null;
  if (!texto) return false;
  const secao = textoDaSecao(texto, ancora.slice(corte + 1));
  if (secao == null) return false;
  return !FAMILIAS_QUE_A_ANCORA_CARREGA.some((f) => extrairIds(f, secao).length);
}

// ————————————————————————————— quem consome cada fato —————————————————————————————

/**
 * As famílias que são REQUISITO do Plan, isto é, que podem consumir um fato.
 *
 * `FATO` fica fora de propósito, e é por isso que esta lista existe em vez de `FAMILIAS_PLAN`: o
 * `F-xxx` é o consumido, nunca o consumidor, e iterar a lista inteira do kit aceitaria uma célula
 * `F-001` na coluna `ID` como se fosse requisito.
 */
const FAMILIAS_DE_REQUISITO = ['RF_KIT', 'RN_NOVO', 'RNF'];

/**
 * As famílias que abrem BLOCO `###` de requisito no `requirements.md`.
 *
 * SÃO DUAS, E `FAMILIAS_DE_REQUISITO` TEM TRÊS, de propósito: o template real da `spec-product`
 * (`skills/spec-product/templates/requirements-functional.md`) só abre bloco para
 * `### RF-MOD-XXX-001: […]` e `### RNF-[CATEGORIA]-001: […]`, cada um com a sua própria linha
 * `**Rastreabilidade:**`. `RN_NOVO` continua aceita na TABELA, onde o consumo de regra nova de
 * fato aparece; reconhecê-la como dona de bloco aqui seria afirmar uma forma que o template não
 * escreve.
 */
const FAMILIAS_DE_BLOCO = ['RF_KIT', 'RNF'];

/**
 * O primeiro ID de requisito do Plan contido em `texto`, procurando `familias` em ordem, ou `null`.
 *
 * QUEM DECIDE ONDE UM ID TERMINA É O KIT, e é para isso que esta função existe em vez de uma regex
 * local. O heading montava `(${ID_PADRAO_PLAN.RF_KIT}|…)\b` e o `\b` DISCORDAVA da `FRONTEIRA_DIR`
 * do `varrer`: `\b` fecha o ID antes de um hífen, então `### RNF-PERF-001-A: x` produzia a chave
 * TRUNCADA `RNF-PERF-001` — um requisito que não existe naquele documento —, enquanto o kit não
 * extrai ID nenhum dali (hífen colando o ID a mais token é texto malformado, não ID). Chave
 * truncada num site e chave nenhuma no outro é meio dono da gramática de volta: os dois sites
 * passam a conhecer requisitos diferentes, o guard de divergência não dispara, e o relatório
 * lista texto que não é ID.
 */
function primeiroRequisito(texto, familias) {
  for (const familia of familias) {
    const [id] = extrairIdsPlan(familia, texto);
    if (id) return id;
  }
  return null;
}

/**
 * Todo heading de nível 1 a 3 — reconhecido ou não. Ver `requisitoDoHeading`.
 *
 * NÍVEL 1 A 3, E NÃO SÓ `###`: o reset de dono é a rede de segurança deste laço, e rede que cobre
 * um nível só não é rede. O template real fecha a lista de blocos `### RNF-…` com a seção de nível
 * 2 `## Questões em aberto`; com `/^###\s/`, um `**Rastreabilidade:**` escrito ali dentro era
 * creditado ao último RNF — o mesmo defeito do heading do RNF, um nível acima. O template intocado
 * não tem essa linha fora de bloco `###`, então isto não mordia hoje; o que estava errado era o
 * comentário do reset, que PROMETE "o pior caso é não atribuí a ninguém" sem qualificar o nível, e
 * promessa que o código não cumpre é a família de defeito que este projeto vem caçando.
 *
 * NÍVEL 4+ FICA FORA, também de propósito: `#### Critérios de aceite` é subseção DENTRO do bloco do
 * requisito, e zerar o dono ali perderia o rastreio que vem depois dela.
 */
const RE_HEADING = /^#{1,3}\s/;

/**
 * De quem é este heading? `undefined` = a linha NÃO é heading de nível 1 a 3, e o laço não mexe em
 * `atual`.
 *
 * Sendo heading, TRÊS RESULTADOS — e o terceiro é o que impede a próxima família de reintroduzir
 * o defeito:
 *   - `### RF-MOD-…-NNN`      → aquele RF;
 *   - `### RNF-CATEGORIA-NNN` → aquele RNF. O template real põe os blocos de RNF DEPOIS dos de
 *                               RF, no mesmo arquivo, cada um com a sua própria linha
 *                               `**Rastreabilidade:**`;
 *   - qualquer outro heading  → `null`, e este é o caso load-bearing. Enquanto só `### RF-MOD-…`
 *                               era reconhecido, o heading do RNF não casava, `atual` continuava
 *                               apontando para o último RF, e o rastreio do RNF era creditado a
 *                               quem não é dono: `F-050`, que é do `RNF-PERF-001`, saía como
 *                               `soNoBloco` do `RF-MOD-PAG-001` — divergência FALSA num documento
 *                               perfeitamente consistente. Zerar `atual` em heading desconhecido
 *                               faz o pior caso ser "não atribuí a ninguém", que é omissão, e não
 *                               achado inventado contra o requisito errado. Vale para os níveis 1
 *                               a 3, que é o que `RE_HEADING` reconhece.
 */
function requisitoDoHeading(linha) {
  if (!RE_HEADING.test(linha)) return undefined;
  const titulo = linha.replace(/^#{1,3}\s+/, '');
  const id = primeiroRequisito(titulo, FAMILIAS_DE_BLOCO);
  // O ID TEM QUE ABRIR O TÍTULO, como o `^###\s+ID` de antes exigia: `### Notas sobre o
  // RF-MOD-PAG-001` é prosa que CITA o requisito, não o bloco dele, e creditar a ele o rastreio
  // que vier depois seria inventar dono.
  return id && titulo.startsWith(id) ? id : null;
}

/**
 * Une `fatos` ao conjunto de `req`, criando o conjunto vazio se ele não existir.
 *
 * UNE, NÃO SOBRESCREVE: com `set`, o mesmo requisito citado em duas tabelas com coluna
 * `Fato fonte` (ou com dois headings `###` iguais, que acontece quando alguém duplica o bloco ao
 * reorganizar o documento) perdia o primeiro rastreio inteiro — e perder rastreio aqui vira fato
 * sem consumidor, que é achado falso. Registrar a chave com conjunto vazio também importa: é o
 * que diz "os dois sites conhecem este requisito", de que o guard de divergência depende.
 */
function unirEm(mapa, req, fatos) {
  if (!mapa.has(req)) mapa.set(req, new Set());
  for (const f of fatos) mapa.get(req).add(f);
}

/**
 * `{ porFato: Map<F-xxx, Set<requisito>>, divergencias: [...] }`, unindo os DOIS sites que o
 * template de requisitos tem (fato F2): a tabela `## Rastreabilidade global` e a linha
 * `**Rastreabilidade:**` de cada bloco `### RF-MOD-…` ou `### RNF-…`.
 *
 * A UNIÃO É A COBERTURA; A DIFERENÇA É ACHADO. Tomar só um dos sites deixaria a metade não lida
 * produzir órfão falso; tolerar a divergência em silêncio é o modo de falha que este projeto vem
 * fechando. Então: união para decidir cobertura, e a diferença sai no relatório com nome.
 */
export function lerConsumos(texto) {
  const daTabela = new Map();
  for (const t of tabelasCom(texto, 'Fato fonte')) {
    const iId = indiceDa(t.colunas, 'ID', true);
    const iFato = indiceDa(t.colunas, 'Fato fonte');
    if (iId < 0 || iFato < 0) continue;
    for (const celulas of t.linhas) {
      // A CHAVE É O ID EXTRAÍDO, NUNCA A CÉLULA. A célula `| RNF-PERF-001 (perf) |` passa o filtro,
      // e com o texto inteiro como chave ela NUNCA casaria o `RNF-PERF-001` que vem do bloco: os
      // dois sites passariam a conhecer requisitos diferentes, o guard de divergência não
      // dispararia, e `cobertos[].requisitos` listaria o texto sujo como se fosse ID.
      const req = primeiroRequisito(celulas[iId] || '', FAMILIAS_DE_REQUISITO);
      if (!req) continue;
      unirEm(daTabela, req, extrairIdsPlan('FATO', celulas[iFato] || ''));
    }
  }

  const doBloco = new Map();
  let atual = null;
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const linha = bruta.trim();
    const dono = requisitoDoHeading(linha);
    if (dono !== undefined) {
      atual = dono;
      if (atual) unirEm(doBloco, atual, []);
      continue;
    }
    if (atual && /^\*\*Rastreabilidade:\*\*/.test(linha)) {
      unirEm(doBloco, atual, extrairIdsPlan('FATO', bruta));
    }
  }

  const porFato = new Map();
  const acrescentar = (fato, req) => {
    if (!porFato.has(fato)) porFato.set(fato, new Set());
    porFato.get(fato).add(req);
  };
  for (const [req, fatos] of daTabela) for (const f of fatos) acrescentar(f, req);
  for (const [req, fatos] of doBloco) for (const f of fatos) acrescentar(f, req);

  const divergencias = [];
  for (const req of new Set([...daTabela.keys(), ...doBloco.keys()])) {
    const a = daTabela.get(req) || new Set();
    const b = doBloco.get(req) || new Set();
    // REQUISITO PRESENTE EM UM SITE SÓ NÃO É DIVERGÊNCIA DE RASTREIO. A tabela é resumo e pode
    // listar um RF cujo bloco ainda não foi escrito, e vice-versa; acusar isso transformaria
    // trabalho em andamento em defeito. O que se compara é o rastreio de um requisito que os
    // DOIS sites conhecem.
    if (!daTabela.has(req) || !doBloco.has(req)) continue;
    const soNaTabela = [...a].filter((f) => !b.has(f)).sort();
    const soNoBloco = [...b].filter((f) => !a.has(f)).sort();
    if (soNaTabela.length || soNoBloco.length) divergencias.push({ requisito: req, soNaTabela, soNoBloco });
  }
  divergencias.sort((x, y) => x.requisito.localeCompare(y.requisito));

  return { porFato, divergencias };
}

/**
 * `Map<F-xxx, Set<RN-NOVO-…>>` — quem consome cada fato no `business-rules.md` (D14).
 *
 * O SITE É A LINHA **Origem** do bloco de cada regra nova, e só ela. É o que o template da
 * `spec-product` declara («Toda regra nova deve ter origem identificável»: `| **Origem** | … F-xxx |`)
 * e é a linha onde o teste ponta a ponta encontrou F-031..F-034. Um `F-xxx` citado na Justificativa
 * ou nos Conflitos é contexto, não a origem da regra — contá-lo transformaria qualquer menção em
 * consumo, e «fato sem consumidor» deixaria de dizer alguma coisa.
 *
 * O DONO É O HEADING QUE ABRE COM `RN-NOVO-…` (o template usa `####`, e qualquer nível vale), e ele
 * ZERA no próximo heading de nível igual ou mais alto — `### Domínio: Crédito`, `## Tabela de
 * conflitos cruzados`. É a mesma rede de segurança do `lerConsumos`: linha **Origem** fora de um
 * bloco de regra não é atribuída a ninguém, em vez de ser creditada à última regra lida. O nível
 * mais baixo (`#####`) não zera, porque é subseção do bloco.
 *
 * As regras do LEGADO (`RN-<DOMÍNIO>-NNN`, Seção A do template) não entram: elas não são família do
 * Plan em `ID_PADRAO_PLAN`, e não são promoção do Explore — são o AS-IS.
 */
export function lerConsumosDeRegras(texto) {
  const porFato = new Map();
  const { linhas, dentro } = mapearCercas(texto);
  let dono = null;
  let nivelDoDono = 0;
  linhas.forEach((bruta, i) => {
    if (dentro[i]) return;
    const linha = bruta.trim();
    const h = RE_HEADING_MD.exec(linha);
    if (h) {
      const [id] = extrairIdsPlan('RN_NOVO', h[2]);
      if (id && h[2].startsWith(id)) { dono = id; nivelDoDono = h[1].length; }
      else if (dono && h[1].length <= nivelDoDono) dono = null;
      return;
    }
    if (!dono || !linha.startsWith('|')) return;
    const celulas = partirLinha(linha);
    if (normalizar(celulas[0]).replace(/[*_`]/g, '').trim() !== 'origem') return;
    for (const fato of extrairIdsPlan('FATO', celulas.slice(1).join(' | '))) {
      if (!porFato.has(fato)) porFato.set(fato, new Set());
      porFato.get(fato).add(dono);
    }
  });
  return porFato;
}

// ————————————————————————————— o cruzamento —————————————————————————————

/** Os `RF-nnn`/`RN-nnn` do Explore, na ordem em que aparecem, sem repetição. */
export function idsDoExplore(docs) {
  const vistos = [];
  for (const texto of docs.values()) {
    for (const familia of ['RF', 'RN']) {
      for (const id of extrairIds(familia, texto)) if (!vistos.includes(id)) vistos.push(id);
    }
  }
  return vistos;
}

/**
 * O rótulo humano de cada categoria — FONTE ÚNICA para o resumo e para a lista de suprimidas.
 * Escrevê-los duas vezes faria o aviso nomear categoria com nome que o resumo não usa.
 */
const ROTULO_DA_CATEGORIA = Object.freeze({
  cobertos: 'cobertos',
  orfaos: 'órfãos',
  fatosSemConsumidor: 'fatos sem consumidor',
  ancorasNaoRastreaveis: 'âncoras não rastreáveis',
  divergenciasDeRastreio: 'divergências de rastreio',
});

/**
 * As categorias que cada artefato do Plan ALIMENTA — e que, na ausência dele, NÃO PODEM SER
 * CALCULADAS. Cada entrada é uma afirmação sobre de onde o número vem, e é ela que decide o corte:
 *
 *   - `contextMap` é a ÚNICA fonte de fato e de âncora. Sem ele não há `F-xxx` para cruzar nem
 *     âncora para seguir: `cobertos` sai vazio, `fatosSemConsumidor` também, e `orfaos` sairia com
 *     TODO `RF-nnn`/`RN-nnn` do Explore dentro — lista nominal que é puro efeito da ausência, não
 *     descarte de escopo;
 *   - `requisitos` é o ÚNICO lugar onde um fato ganha consumidor, e é o backlog. Sem ele, todo
 *     fato sai "sem consumidor" e todo ID do Explore sai "órfão" pela mesma razão: não existe nada
 *     que pudesse tê-los consumido. `orfaos` é o caso menos óbvio da lista e o mais importante —
 *     "órfão" quer dizer "não chegou ao backlog", e o backlog é justamente o arquivo que falta. E
 *     `divergenciasDeRastreio` compara os DOIS sites deste mesmo arquivo, então morre com ele.
 *
 * O QUE ESTÁ FORA DE CADA LISTA É TÃO DELIBERADO QUANTO O QUE ESTÁ DENTRO, porque suprimir
 * categoria que TEM base trocaria achado falso por silêncio sobre achado verdadeiro:
 *   - `ancorasNaoRastreaveis` NÃO cai com `requisitos`: ela sai inteira do `context-map.md` — a
 *     pergunta é "consigo seguir esta âncora de volta?", que não menciona requisito nenhum;
 *   - `divergenciasDeRastreio` NÃO cai com `contextMap`: ela é interna ao `requirements.md` e não
 *     olha fato do mapa de contexto.
 */
const CATEGORIAS_POR_ARTEFATO = Object.freeze({
  contextMap: ['cobertos', 'orfaos', 'fatosSemConsumidor', 'ancorasNaoRastreaveis'],
  requisitos: ['cobertos', 'orfaos', 'fatosSemConsumidor', 'divergenciasDeRastreio'],
});

/**
 * O cruzamento. `artefatos` é OPCIONAL e vale `{ contextMap, requisitos, caminhos, docsLidos }`,
 * com os textos brutos dos dois artefatos do Plan, os caminhos de onde eles foram lidos e quantos
 * documentos do Explore a casca conseguiu ler.
 *
 * ELE EXISTE PARA QUE "NÃO ACHEI ARTEFATO" NÃO SAIA COMO "ESTÁ TUDO FECHADO". Sem ele, um `io` que
 * devolve `ENOENT` para tudo — o que acontece sempre que a `cwd` está errada, e num executável de
 * mão isso é o cenário normal — produz zero de tudo e `tudoFechado === true`: as duas conclusões
 * mais distantes possíveis afirmadas uma pela outra. Quem chama sem `artefatos` está dizendo "não
 * tenho essa informação", e aí nada é suprimido — é o caso dos testes de unidade, que montam os
 * insumos à mão e para quem a pergunta não existe.
 *
 * O CORTE É POR ARTEFATO, e não pelo par. Ele já exigiu os DOIS ausentes, e o caso PARCIAL era o
 * pior resultado deste executável: com o `context-map.md` presente e o `requirements.md` em
 * `ENOENT`, o relatório imprimia LISTA NOMINAL — `RF-007`, `RF-008` como órfãos, `F-001`, `F-002`
 * como "colhidos e esquecidos" — e afirmava sobre cada item a prosa diagnóstica errada, pedindo
 * linha no `gaps.md` para um requisito que o cliente aprovou. A verdade era uma frase: o segundo
 * artefato não existe. E o caso não é exótico — a ordem normal do pipeline é a `spec-ingest`
 * escrever o mapa de contexto e só DEPOIS a `spec-product` escrever os requisitos.
 */
export function cruzar({
  idsExplore = [], fatos = [],
  consumos = { porFato: new Map(), divergencias: [] },
  artefatos = null,
  // Os documentos do Explore, para a âncora por seção sem ID (D12). Sem eles a forma não é medida
  // e cai em «não rastreável», como sempre caiu — ver `rastreavel`.
  docsExplore = null,
} = {}) {
  const ehRastreavel = (f) => rastreavel(f.ancora, docsExplore);
  const ancorasNaoRastreaveis = fatos.filter((f) => !ehRastreavel(f));
  const bons = fatos.filter(ehRastreavel);

  const cobertos = [];
  const orfaos = [];
  for (const id of idsExplore) {
    // O `\b` das fronteiras do `extrairIds` não vale aqui, porque a âncora é texto livre; o teste
    // de contenção é feito extraindo os IDs da âncora, e não com `includes` — `RF-007` está
    // contido em `RF-0071`, e um `includes` cru daria cobertura falsa.
    const emAncora = bons.filter((f) => idsNaAncora(f.ancora).includes(id));
    if (!emAncora.length) { orfaos.push(id); continue; }
    const comConsumidor = emAncora.filter((f) => (consumos.porFato.get(f.id) || new Set()).size > 0);
    if (comConsumidor.length) {
      cobertos.push({
        id,
        fatos: comConsumidor.map((f) => f.id),
        requisitos: [...new Set(comConsumidor.flatMap((f) => [...consumos.porFato.get(f.id)]))].sort(),
      });
    } else {
      orfaos.push(id);
    }
  }

  // SÓ FATO ANCORADO EM DOCUMENTO DO EXPLORE, POR ID, ENTRA AQUI, e a frase de fecho do relatório
  // não pode dizer mais do que isto: fato cuja âncora é transcrição, PDF ou outra fonte de fora não
  // é medido — não há ID do Explore para cruzar, e a âncora dele é legítima. O fato ancorado por
  // SEÇÃO SEM ID (D12) também não: persona e premissa técnica são consumidas por artefato que este
  // relatório não lê (product-vision, hld, tech-rules), e chamá-lo de «colhido e esquecido» seria
  // trocar o falso «não rastreável» de antes por outro falso. Antes do D12 os dois filtros davam o
  // mesmo conjunto — todo fato rastreável que citava o Explore carregava ID.
  const ancoradosNoExplore = new Set(
    bons.filter((f) => citaDocDoExplore(f.ancora) && idsNaAncora(f.ancora).length).map((f) => f.id),
  );
  const fatosSemConsumidor = [...ancoradosNoExplore]
    .filter((f) => !(consumos.porFato.get(f) || new Set()).size)
    .sort();

  const relatorio = {
    cobertos,
    orfaos,
    fatosSemConsumidor,
    ancorasNaoRastreaveis,
    divergenciasDeRastreio: consumos.divergencias,
    fatosMedidos: ancoradosNoExplore.size,
  };

  // QUAL DOS DOIS ARTEFATOS NÃO FOI LIDO — a lista vem das chaves do próprio
  // `ARTEFATOS_DE_PROMOCAO` do kit, para não haver segunda lista dos dois nomes neste arquivo.
  const ausentes = artefatos
    ? Object.keys(ARTEFATOS_DE_PROMOCAO).filter((k) => !artefatos[k])
    : [];
  relatorio.ausentes = ausentes;
  relatorio.semArtefatos = ausentes.length === Object.keys(ARTEFATOS_DE_PROMOCAO).length;
  relatorio.caminhos = (artefatos && artefatos.caminhos) || null;
  // O `business-rules.md` foi lido? COMPLEMENTAR — não suprime categoria nenhuma (ver
  // `REGRAS_DE_PROMOCAO` no kit). `null` quando o chamador não informou, como o `docsExplore`.
  relatorio.regrasLidas = artefatos ? !!artefatos.regras : null;
  // QUANTOS DOCUMENTOS DO EXPLORE FORAM LIDOS — o sinal mais direto para separar as duas causas de
  // artefato ausente: `0 de 5` é `cwd` errada, `5 de 5` é fase (a `spec-product` ainda não
  // escreveu). Fica `null` quando o chamador não informa, e aí a linha não sai: número inventado
  // aqui seria pior que linha ausente.
  relatorio.docsExplore = artefatos && Number.isInteger(artefatos.docsLidos)
    ? { lidos: artefatos.docsLidos, total: DOCS_EXPLORE.length }
    : null;

  // SUPRIMIR, E NÃO ZERAR — a diferença é o relatório inteiro. Categoria suprimida sai como `n/d`
  // no resumo, com o aviso do artefato que a alimentava, e não imprime lista nominal nenhuma;
  // zerada em silêncio, ela trocaria a lista de achados falsos por "0 achados", que é a MESMA
  // mentira do caso dos dois artefatos ausentes, só mais curta. Ver `CATEGORIAS_POR_ARTEFATO` para
  // a razão de cada categoria estar (ou não estar) na lista de cada artefato.
  relatorio.suprimidos = [...new Set(ausentes.flatMap((k) => CATEGORIAS_POR_ARTEFATO[k]))];
  for (const c of relatorio.suprimidos) relatorio[c] = [];

  relatorio.tudoFechado = !ausentes.length
    && !orfaos.length && !fatosSemConsumidor.length
    && !ancorasNaoRastreaveis.length && !consumos.divergencias.length;
  return relatorio;
}

function idsNaAncora(ancora) {
  const saida = [];
  for (const familia of FAMILIAS_EXPLORE) saida.push(...extrairIds(familia, ancora));
  return saida;
}

// ————————————————————————————— o carimbo (Decisão 16) —————————————————————————————

/**
 * O documento com a linha de carimbo instalada, ou o documento intacto se já estava carimbado.
 *
 * A LINHA É MONTADA PELO DONO — `montarCarimbo` do `zonas.mjs` —, nunca escrita aqui. O JSDoc de
 * lá diz por quê: a regex de leitura (`RE_CARIMBO`) é DERIVADA dessa função por sentinela, e uma
 * segunda cópia do texto faria `montarCarimbo` gravar um carimbo que `lerCarimbo` não reconhece —
 * e aí `congelar` não teria como conferir o que acabou de escrever.
 *
 * IDEMPOTENTE por consulta ao `lerCarimbo`, e não por procurar a string à mão: o `lerCarimbo` sabe
 * de cerca de código, e um documento que CITA o carimbo dentro de um bloco (o `gaps.md`
 * registrando o procedimento — exatamente o que esse documento existe para registrar) não conta
 * como carimbado. Procurar a string crua carimbaria de MENOS, e o resultado seria `congelar`
 * recusando marcar, corretamente, num projeto perfeitamente sadio.
 *
 * POSIÇÃO: depois do H1, quando há um — o carimbo é para o humano que abre o arquivo, e acima do
 * título ele fica antes de o leitor saber que documento é. Sem H1, vai para o topo.
 *
 * O DOCUMENTO É REMONTADO NO EOL DOMINANTE — `eolDominante`, abaixo —, e não necessariamente no que
 * ele já tinha: um CRLF com um `\n` solto no meio sai todo `\r\n`, e um empate cai em `\n`. A noção
 * de linha usada para separar é a DO REPOSITÓRIO — `/\r?\n/`, a mesma do `mapearCercas` (tokens.mjs)
 * de que o `lerCarimbo` depende. Com `split('\n')`, num documento CRLF cada elemento terminava em
 * `\r`: a comparação `depois[0] === ''` não casava (o elemento era `'\r'`), a linha em branco
 * existente não era consumida, e o arquivo saía com `\r\n` e `\n` MISTURADOS mais uma linha em
 * branco dobrada. Duas noções de linha no mesmo arquivo é a família de defeito que este repositório
 * fecha em toda parte; aqui ela chegava pelo `join`.
 */
export function inserirCarimbo(texto, dataISO) {
  if (lerCarimbo(texto).congelado) return texto;
  const linha = montarCarimbo(dataISO);
  const bruto = String(texto == null ? '' : texto);
  const linhas = bruto.split(/\r?\n/);
  const eol = eolDominante(bruto);
  const iH1 = linhas.findIndex((l) => /^#\s+\S/.test(l));
  if (iH1 < 0) return [linha, '', ...linhas].join(eol);
  const depois = linhas.slice(iH1 + 1);
  // Come uma linha em branco existente para não empilhar duas.
  if (depois[0] === '') depois.shift();
  return [...linhas.slice(0, iH1 + 1), '', linha, '', ...depois].join(eol);
}

/**
 * O terminador de linha com que este documento é remontado.
 *
 * DOMINANTE, e não o do primeiro par: um documento com uma linha `\n` solta no meio de cem `\r\n`
 * continua sendo CRLF, e remontá-lo em `\n` reescreveria o arquivo inteiro — diff de arquivo
 * inteiro num documento que acabou de virar histórico versionado. Documento sem quebra nenhuma cai
 * no `\n`, que é o EOL em que o repositório escreve.
 */
function eolDominante(bruto) {
  const crlf = (bruto.match(/\r\n/g) || []).length;
  const total = bruto.split('\n').length - 1;
  return crlf > total - crlf ? '\r\n' : '\n';
}

// ————————————————————————————— o congelamento —————————————————————————————

/**
 * Ausência de DOCUMENTO, sob o conjunto de códigos do kit. Ver o JSDoc de `lerOuVazio`, que usa o
 * mesmo predicado: escrever a lista literal aqui seria a terceira cópia dela no repositório, e a
 * segunda já foi consolidada com medição — remover `EISDIR` de uma delas sobrevivia à suíte.
 */
const ehAusenciaDeDocumento = (erro) => !!erro && CODIGOS_DE_AUSENCIA_DE_DOCUMENTO.has(erro.code);

/**
 * Os documentos do Explore cuja ausência é legítima. A resposta vem do campo `obrigatorio` do
 * `DOCS_EXPLORE`, e não de uma lista com `modelo-de-dados.md` escrita aqui: o kit é o dono de quem
 * é opcional, e uma segunda lista discordaria dele no dia em que outro documento virar opcional.
 */
const DOCS_OPCIONAIS = new Set(DOCS_EXPLORE.filter((d) => !d.obrigatorio).map((d) => d.caminho));

/**
 * Os documentos do Explore cuja ausência NÃO é legítima — o complemento do `DOCS_OPCIONAIS`, e
 * derivado do mesmo campo `obrigatorio` do kit pela mesma razão: quem decide o que é obrigatório é
 * o `DOCS_EXPLORE`, e uma lista escrita à mão aqui discordaria dele na primeira mudança.
 *
 * FALTAREM TODOS ELES É "NÃO ACHEI O EXPLORE", e é a condição de recusa do `congelar`. Ver o JSDoc
 * de lá.
 */
const DOCS_OBRIGATORIOS = DOCS_EXPLORE.filter((d) => d.obrigatorio).map((d) => d.caminho);

/**
 * Quem tem carimbo NO DISCO, quem não tem, e quem não está lá. É a conferência da invariante
 * "marcador existe ⇒ todos carimbados", e ela tem DOIS chamadores: a etapa 2 do congelamento, sobre
 * os documentos que ele acabou de escrever, e o caminho `ja-congelado`, sobre os cinco.
 *
 * O SEGUNDO CHAMADOR É O QUE FALTAVA. Enquanto o `ja-congelado` era retorno antecipado cego, a
 * invariante só era conferida NO ATO da criação do marcador: um marcador criado à mão — o que a
 * rule do Plan passou a proibir — recebia "nada a fazer" para sempre, e o único verificador da
 * invariante que este repositório tem nunca o examinava.
 *
 * ILEGIBILIDADE SOBE POR PADRÃO, ausência não: mesma fronteira do `lerOuVazio` e do `estaCongelado`.
 * Quem quiser tratar "desapareceu entre a escrita e a releitura" como sem carimbo junta `ausentes` a
 * `semCarimbo` — é o que a etapa 2 faz, e o JSDoc dela diz por quê.
 *
 * `relancarIlegivel: false` MUDA ISSO PARA O `ja-congelado`, e só para ele. Naquele caminho não há
 * escrita entre ler e reler — é uma leitura pura sobre os cinco documentos do disco —, então um
 * `EBUSY`/`EPERM` do sync do OneDrive (o setup real deste usuário, não caso exótico: ver o JSDoc de
 * `congelar`) não é o "escrita que não pegou" que a etapa 2 precisa detectar. Relançar ali não
 * protege invariante nenhuma: não há marcador a impedir de nascer, porque ele já existe. O único
 * custo de um documento ilegível NESTE caminho é não poder relatá-lo, e é o que a terceira lista,
 * `ilegiveis`, existe para dizer. A etapa 2 continua no padrão (relança) de propósito — ali sim há
 * escrita entre ler e reler, e confundir "não consegui reler" com "não carimbou" esconderia o modo
 * de falha que a Decisão 16 existe para pegar.
 */
function conferirCarimbos(base, io, nomes, { relancarIlegivel = true } = {}) {
  const carimbados = [];
  const semCarimbo = [];
  const ausentes = [];
  const ilegiveis = [];
  for (const nome of nomes) {
    let texto = null;
    try {
      texto = io.lerArquivo(join(base, RAIZ_EXPLORE, nome), 'utf8');
    } catch (erro) {
      if (ehAusenciaDeDocumento(erro)) { ausentes.push(nome); continue; }
      if (relancarIlegivel) throw erro;
      ilegiveis.push({ documento: nome, erro: (erro && erro.message) || String(erro) });
      continue;
    }
    if (lerCarimbo(texto).congelado) carimbados.push(nome);
    else semCarimbo.push(nome);
  }
  carimbados.sort();
  semCarimbo.sort();
  return { carimbados, semCarimbo, ausentes, ilegiveis };
}

/**
 * Carimba, CONFERE, e só então marca. As três etapas, nesta ordem, e a do meio é a que não existia.
 *
 * POR QUE A ORDEM É CONTRATO, E NÃO ESTILO: o marcador liga a trava que nega escrita sob
 * `outputs/explore/`. Criá-lo antes de carimbar tranca o Explore com os documentos ainda sem
 * carimbo — e aí nem carimbar passa mais. É recuperável removendo o marcador, mas é retrabalho num
 * caminho que o consultor percorre uma vez por projeto.
 *
 * POR QUE A CONFERÊNCIA LÊ O DISCO: confiar no retorno de `escrever` responde "eu mandei escrever",
 * não "o carimbo está lá". O modo de falha que separa as duas é escrita que não pega — permissão,
 * arquivo aberto noutro editor, disco cheio —, e é justamente nele que a invariante "marcador
 * existe ⇒ todos carimbados" quebraria em silêncio. Reler custa cinco `readFileSync` num comando
 * que roda uma vez por projeto; não há orçamento a defender aqui.
 *
 * DOCUMENTO AUSENTE NÃO IMPEDE O CONGELAMENTO, e sai nomeado em `ausentes`: o `modelo-de-dados.md`
 * é opcional no `DOCS_EXPLORE`, e o gate já cobra dispensa no `gaps.md`. Recusar por causa dele
 * travaria o marco do Plan de todo projeto que legitimamente não tem modelo de dados. Documento
 * PRESENTE E ILEGÍVEL é outra coisa, e sobe: marcar sem ter conseguido ler é a invariante não
 * verificada com aparência de verificada.
 *
 * FALTANDO TODOS OS OBRIGATÓRIOS, ELE RECUSA — e esta é a segunda das duas recusas. Rodado numa
 * `cwd` sem `outputs/explore/`, a versão anterior carimbava zero documentos, criava o marcador, e
 * escrevia nele "releu os documentos abaixo e conferiu que todos receberam o carimbo" seguido de
 * `- (nenhum)`: atestado sobre conjunto vazio. Pior que a prosa, o efeito — a trava ligava e passava
 * a negar escrita sob `outputs/explore/` de um projeto que ainda não escreveu NADA lá, e a saída era
 * remover o marcador à mão. O corte é "todos os OBRIGATÓRIOS ausentes", e não "todos os cinco":
 * `modelo-de-dados.md` é opcional no `DOCS_EXPLORE`, e um Explore que só tem ele não é um Explore.
 * A ausência do opcional continua não impedindo nada.
 *
 * ESCRITA DE DOCUMENTO QUE LANÇA NÃO É EXCEÇÃO, É A RECUSA. A mensagem de recusa nomeia
 * "permissão, arquivo aberto em outro editor" — e no `node:fs` real esses casos não são escrita
 * silenciosa: `writeFileSync` LANÇA `EPERM`/`EACCES`. Deixar o erro subir dava um stack trace de
 * Node e código de saída não-zero exatamente no caso para o qual a mensagem foi escrita, e a
 * recusa ficava inalcançável na prática. O `catch` aqui NÃO decide nada: o documento entra em
 * `tentados` de todo modo, a etapa 2 o relê, e é o disco que responde. O erro sai nomeado em
 * `falhasDeEscrita` para a mensagem poder dizer o que aconteceu.
 *
 * A ESCRITA DO PRÓPRIO MARCADOR (etapa 3) continua subindo, e a assimetria é deliberada: ali não
 * há resultado parcial para relatar — o congelamento simplesmente não aconteceu, o diretório
 * acabou de ser criado por esta função, e um erro naquele ponto é inesperado de verdade.
 *
 * `lerCarimbo` sai de ZERO consumidores de produção nesta função. Ela esperava por isto desde a
 * Task 2 do Plano 2.
 */
export function congelar(raiz, io, hoje) {
  const base = raiz || '.';
  const caminhoMarcador = join(base, MARCADOR_CONGELAMENTO);
  // O CAMINHO PROCURADO VAI NO RETORNO porque as duas recusas precisam NOMEÁ-LO: quem errou a `cwd`
  // só reconhece o erro vendo o caminho que foi procurado. Mesma razão do `caminhos` do `coletar`.
  const caminhoExplore = join(base, RAIZ_EXPLORE);

  if (io.existe(caminhoMarcador)) {
    // O MARCADOR EXISTE, E A INVARIANTE É CONFERIDA MESMO ASSIM. Não se recusa nem se recarimba: a
    // trava já está ligada, e escrever no Explore congelado é justamente o que ela nega. O valor
    // deste caminho é DIZER A VERDADE — se algum documento está sem carimbo, as duas representações
    // do congelamento discordam, e quem lê precisa saber. Custa cinco leituras num comando que roda
    // uma vez por projeto.
    // NÃO RELANÇA: aqui não há escrita entre ler e reler, então um documento ilegível — o
    // `EBUSY`/`EPERM` do sync do OneDrive, ver o JSDoc de `conferirCarimbos` — vira uma TERCEIRA
    // lista (`ilegiveis`) em vez de subir. Deixar subir daria stack trace de Node e saída
    // não-zero bem na reexecução idempotente que a própria mensagem de recusa manda o consultor
    // fazer, e sem proteger invariante nenhuma: não há marcador a impedir de nascer.
    const conf = conferirCarimbos(base, io, NOMES_DO_EXPLORE, { relancarIlegivel: false });
    return {
      acao: 'ja-congelado', motivo: null,
      carimbados: conf.carimbados,
      // NADA FOI ESCRITO AGORA, então todo carimbo encontrado já estava lá — é o que
      // `jaCarimbados` quer dizer nas outras ações, e aqui ele coincide com `carimbados`.
      jaCarimbados: conf.carimbados,
      semCarimbo: conf.semCarimbo, ausentes: conf.ausentes, ilegiveis: conf.ilegiveis,
      falhasDeEscrita: [],
      marcador: caminhoMarcador, caminhoExplore,
    };
  }

  // ——— etapa 0: ler os cinco, e conferir que o Explore FOI ENCONTRADO ———
  //
  // A LEITURA VEM ANTES DE QUALQUER ESCRITA de propósito: a recusa por Explore ausente não pode
  // deixar rastro. Fundir este laço com o de carimbar carimbaria o `modelo-de-dados.md` de um
  // projeto sobre o qual a função está a um passo de dizer "não achei o Explore aqui".
  const ausentes = [];
  const lidos = [];
  for (const d of DOCS_EXPLORE) {
    const caminho = join(base, RAIZ_EXPLORE, d.caminho);
    try {
      lidos.push({ nome: d.caminho, caminho, texto: io.lerArquivo(caminho, 'utf8') });
    } catch (erro) {
      if (ehAusenciaDeDocumento(erro)) { ausentes.push(d.caminho); continue; }
      throw erro;
    }
  }

  if (DOCS_OBRIGATORIOS.length && DOCS_OBRIGATORIOS.every((n) => ausentes.includes(n))) {
    return {
      acao: 'recusado', motivo: 'explore-ausente',
      carimbados: [], jaCarimbados: [], semCarimbo: [], ausentes, ilegiveis: [], falhasDeEscrita: [],
      marcador: null, caminhoExplore,
    };
  }

  // ——— etapa 1: carimbar ———
  const jaCarimbados = [];
  const tentados = [];
  const falhasDeEscrita = [];
  for (const { nome, caminho, texto } of lidos) {
    if (lerCarimbo(texto).congelado) { jaCarimbados.push(nome); continue; }
    try {
      io.escrever(caminho, inserirCarimbo(texto, hoje));
    } catch (erro) {
      falhasDeEscrita.push({ documento: nome, erro: (erro && erro.message) || String(erro) });
    }
    tentados.push(nome);
  }

  // ——— etapa 2: conferir a invariante, LENDO O DISCO ———
  const conf = conferirCarimbos(base, io, [...tentados, ...jaCarimbados]);
  const carimbados = conf.carimbados;
  // DESAPARECIDO ENTRE A ETAPA 0 E A RELEITURA CONTA COMO SEM CARIMBO, que é a leitura
  // conservadora: este documento foi lido com sucesso há instantes, então "não está mais lá" não é
  // a ausência legítima que a etapa 0 tratou — e o marcador não pode nascer sobre ele.
  const semCarimbo = [...conf.semCarimbo, ...conf.ausentes].sort();

  if (semCarimbo.length) {
    return {
      acao: 'recusado', motivo: 'sem-carimbo',
      carimbados, jaCarimbados, semCarimbo, ausentes, ilegiveis: [], falhasDeEscrita,
      marcador: null, caminhoExplore,
    };
  }

  // ——— etapa 3: marcar ———
  io.criarDiretorio(dirname(caminhoMarcador));
  io.escrever(caminhoMarcador, montarMarcador({ data: hoje, documentos: carimbados }));
  return {
    acao: 'congelado', motivo: null,
    carimbados, jaCarimbados, semCarimbo: [], ausentes, ilegiveis: [], falhasDeEscrita,
    marcador: caminhoMarcador, caminhoExplore,
  };
}

/**
 * A mensagem do modo `--congelar`, nas três ações — e nas DUAS recusas, que pedem consertos
 * diferentes e por isso não podem sair com o mesmo texto.
 *
 * A DE RECUSA TEM QUE BASTAR SOZINHA: o comando sai com 0 mesmo recusando (a recusa é resultado
 * legítimo e completo, não erro do comando), então quem lê esta mensagem é o único a decidir o que
 * fazer. Ela nomeia os documentos, diz por que o marcador não foi criado, e diz que rodar de novo é
 * seguro.
 *
 * ELA REPORTA O QUE MEDIU, INCLUSIVE NO SUCESSO. O `--json` carrega os campos todos, mas o
 * destinatário desta mensagem é humano: falha de escrita e documento que já estava carimbado saíam
 * só no JSON, e o consultor lia `EXPLORE CONGELADO.` sobre um documento possivelmente truncado.
 */
export function formatarCongelamento(r) {
  if (r.acao === 'ja-congelado') return mensagemDeJaCongelado(r);
  if (r.acao === 'recusado' && r.motivo === 'explore-ausente') return mensagemDeExploreAusente(r);
  if (r.acao === 'recusado') {
    const l = [
      'CONGELAMENTO RECUSADO — o marcador NÃO foi criado.',
      '',
      'Estes documentos não têm carimbo depois da tentativa de escrita:',
      ...r.semCarimbo.map((n) => `  · ${RAIZ_EXPLORE}/${n}`),
    ];
    // O ERRO DA ESCRITA, QUANDO HOUVE UM, e é ele que diz o que corrigir. Sem esta lista o
    // consultor lê "não tem carimbo" e não sabe se o arquivo está aberto no editor, se falta
    // permissão, ou se o disco encheu — e a linha seguinte manda justamente corrigir isso.
    if (r.falhasDeEscrita && r.falhasDeEscrita.length) {
      l.push('');
      l.push('A escrita falhou com:');
      for (const f of r.falhasDeEscrita) l.push(`  · ${RAIZ_EXPLORE}/${f.documento} — ${f.erro}`);
    }
    l.push('');
    l.push('Criar o marcador agora ligaria a trava com documento sem carimbo, e a partir daí nem');
    l.push('carimbar passaria. Corrija o que impediu a escrita — permissão, arquivo aberto em outro');
    l.push('editor — e rode de novo. O comando é idempotente.');
    return l.join('\n');
  }
  const l = ['EXPLORE CONGELADO.', ''];
  if (r.carimbados.length) {
    l.push('Carimbados:');
    // QUEM JÁ TINHA CARIMBO SAI MARCADO NA MESMA LISTA, e não numa segunda: `carimbados` contém os
    // dois grupos — a etapa 2 confere todos —, então uma lista separada nomearia o mesmo documento
    // duas vezes. O que faltava era a DISTINÇÃO, não a informação: "carimbei agora" e "já estava
    // carimbado, com data anterior" pedem leituras diferentes de quem confere o histórico do
    // documento, e a segunda execução de um congelamento parcial é exatamente esse caso.
    const ja = new Set(r.jaCarimbados || []);
    for (const n of r.carimbados) {
      const nota = ja.has(n) ? ' — já tinha carimbo; a data do primeiro é a que vale' : '';
      l.push(`  · ${RAIZ_EXPLORE}/${n}${nota}`);
    }
  }
  // A FALHA DE ESCRITA SAI NO SUCESSO TAMBÉM, e é o achado que este bloco fecha. `writeFileSync` que
  // lança DEPOIS de já ter gravado o começo do arquivo — `ENOSPC`, `EIO` — deixa o carimbo, que é a
  // terceira linha (depois do H1 e da linha em branco que `inserirCarimbo` insere), e perde o corpo.
  // A releitura acha o carimbo, a invariante está de pé, o marcador
  // nasce corretamente, e o consultor lia `EXPLORE CONGELADO.` e mais nada sobre um documento
  // possivelmente truncado. A invariante continua verdadeira; o que se quebrava era a promessa de
  // que o comando reporta o que mediu.
  if (r.falhasDeEscrita && r.falhasDeEscrita.length) {
    l.push('');
    l.push('MAS A ESCRITA FALHOU NESTES, e eles podem estar TRUNCADOS:');
    for (const f of r.falhasDeEscrita) l.push(`  · ${RAIZ_EXPLORE}/${f.documento} — ${f.erro}`);
    l.push('');
    l.push('A releitura ACHOU o carimbo neles — ele é a terceira linha do arquivo, depois do H1 e da');
    l.push('linha em branco —, então a invariante está de pé e o marcador foi criado. O que não se');
    l.push('sabe é se o CORPO chegou inteiro ao disco: erro no meio da escrita grava o começo e perde');
    l.push('o resto.');
    l.push('O QUE FAZER: abra os arquivos acima e confira o fim do texto contra o `git diff`. Se o');
    l.push('corpo se perdeu, restaure-o do git — e como a trava já está ligada, remova');
    l.push(`\`${MARCADOR_CONGELAMENTO}\` antes de reescrever o documento e rode \`--congelar\` de`);
    l.push('novo depois.');
  }
  if (r.ausentes.length) {
    // "AUSENTE E ACEITO" NÃO VALE PARA TODOS OS CINCO. Só o `modelo-de-dados.md` é opcional no
    // `DOCS_EXPLORE`; os outros quatro o fecho do Explore já cobrou, e não achá-los AQUI é sinal de
    // `cwd` errada — a mesma causa que o modo relatório separa com o "0 de 5". Uma linha única
    // dizendo "isto é aceito" sobre um documento obrigatório seria o relatório atestando o que não
    // mediu, com o marcador já criado.
    const semCarimboPorAusencia = r.ausentes.filter((n) => !DOCS_OPCIONAIS.has(n));
    l.push('');
    l.push('Não achei estes, e a ausência não impede o congelamento:');
    for (const n of r.ausentes) {
      const nota = DOCS_OPCIONAIS.has(n) ? ' — opcional; a ausência exige dispensa no `gaps.md`' : '';
      l.push(`  · ${RAIZ_EXPLORE}/${n}${nota}`);
    }
    if (semCarimboPorAusencia.length) {
      l.push('');
      l.push('OS QUE NÃO ESTÃO MARCADOS COMO OPCIONAIS SÃO OBRIGATÓRIOS, e não achá-los não é');
      l.push('normal — o fecho do Explore já os cobrou. A causa comum é o DIRETÓRIO: este é um');
      l.push('executável de mão e monta os caminhos a partir de onde foi chamado. Se você não');
      l.push('rodou na raiz do projeto (a que contém `outputs/`), o congelamento acima carimbou');
      l.push('menos documentos do que deveria. Remova o marcador e rode de novo no lugar certo.');
    }
  }
  l.push('');
  l.push(`Marcador criado: \`${MARCADOR_CONGELAMENTO}\`. A partir de agora, escrita sob`);
  l.push(`\`${RAIZ_EXPLORE}/\` é negada. Mudança vai para \`${RAIZ_SPEC}/\`.`);
  return l.join('\n');
}

/**
 * A recusa por Explore NÃO ENCONTRADO — a outra causa, e o outro conserto.
 *
 * ELA TEM QUE SER DISTINGUÍVEL DA RECUSA POR DOCUMENTO SEM CARIMBO. Aquela diz "a escrita não
 * pegou, conserte a permissão e rode de novo"; esta diz "não achei o Explore, e não há o que
 * congelar" — quem recebe uma agindo como se fosse a outra procura permissão num arquivo que não
 * existe.
 *
 * AS DUAS CAUSAS PROVÁVEIS SÃO SEPARADAS AQUI, como o modo relatório separa com o "li N de 5": `cwd`
 * errada e fase que ainda não chegou produzem a mesma ausência e pedem consertos opostos. O caminho
 * procurado é NOMEADO, porque é o que faz quem errou o diretório reconhecer o erro.
 */
function mensagemDeExploreAusente(r) {
  const l = [
    'CONGELAMENTO RECUSADO — não achei o Explore, e o marcador NÃO foi criado.',
    '',
  ];
  if (r.caminhoExplore) l.push(`Procurei exatamente aqui: ${r.caminhoExplore}`);
  l.push('Nenhum dos documentos OBRIGATÓRIOS do Explore está lá:');
  for (const n of DOCS_OBRIGATORIOS) l.push(`  · ${RAIZ_EXPLORE}/${n}`);
  l.push('');
  l.push('DUAS CAUSAS PROVÁVEIS, e elas pedem consertos diferentes:');
  l.push('  · o DIRETÓRIO está errado — este é um executável de mão e monta os caminhos a partir');
  l.push('    de onde foi chamado. Rode de novo na raiz do projeto, a que contém `outputs/`;');
  l.push('  · a FASE ainda não chegou — o Explore não foi escrito, e não há o que congelar. O');
  l.push('    congelamento é o marco do Plan, depois de a `spec-product` fechar.');
  l.push('');
  l.push('Criar o marcador agora trancaria a escrita sob `outputs/explore/` de um projeto onde nenhum');
  l.push('documento OBRIGATÓRIO foi encontrado — e a única saída seria removê-lo à mão. O comando é');
  l.push('idempotente: conserte o que estiver errado e rode de novo.');
  return l.join('\n');
}

/**
 * "Já congelado" — e, quando a conferência acha documento sem carimbo OU documento ilegível, a
 * verdade sobre isso.
 *
 * O MARCADOR SIGNIFICA "FOI VERIFICADO", e é isso que o torna seguro como sinal. Enquanto este
 * caminho era retorno antecipado cego, um marcador criado à mão — o que a rule do Plan passou a
 * proibir — recebia "nada a fazer" para sempre, e o único verificador da invariante que este
 * repositório tem nunca o examinava.
 *
 * ELE RELATA, E NÃO CONSERTA. Recarimbar exigiria escrever no Explore que a trava já nega, e recusar
 * não teria efeito nenhum — o marcador já existe. O que este caminho pode fazer é dizer o que achou,
 * e dizer qual é a sequência que acerta.
 *
 * `ilegiveis` É INFORMATIVA, NÃO A INVARIANTE QUEBRADA: um `EBUSY`/`EPERM` do sync do OneDrive não
 * diz que o documento está sem carimbo — diz só que não deu para saber. Por isso ela sai numa seção
 * própria, sem o texto "A INVARIANTE ESTÁ QUEBRADA" quando é a única coisa a relatar.
 *
 * `ausentes` TAMBÉM SAI, pela mesma razão que fez `ilegiveis` existir: um Explore congelado e depois
 * esvaziado — `hld-funcional.md` apagado do disco depois do congelamento — fazia este caminho dizer
 * "Nada a fazer.", e o comando cujo propósito é dizer a verdade calava sobre um documento obrigatório
 * que sumiu. A ausência aqui não impede nada nem quebra a invariante do carimbo — só informa.
 */
function mensagemDeJaCongelado(r) {
  const semCarimbo = (r.semCarimbo || []);
  const ilegiveis = (r.ilegiveis || []);
  const ausentes = (r.ausentes || []);
  if (!semCarimbo.length && !ilegiveis.length && !ausentes.length) {
    return `Já congelado — \`${MARCADOR_CONGELAMENTO}\` existe. Nada a fazer.`;
  }
  const l = [`Já congelado — \`${MARCADOR_CONGELAMENTO}\` existe, e nada foi carimbado agora.`];
  if (semCarimbo.length) {
    l.push('');
    l.push('MAS A INVARIANTE ESTÁ QUEBRADA: o marcador existe e estes documentos NÃO têm carimbo:');
    for (const n of semCarimbo) l.push(`  · ${RAIZ_EXPLORE}/${n}`);
  }
  if (ilegiveis.length) {
    l.push('');
    l.push('NÃO CONSEGUI LER estes documentos, então não dá para saber se têm carimbo — a trava já');
    l.push('está ligada e nada foi escrito agora; o único custo de um documento ilegível aqui é não');
    l.push('poder relatá-lo:');
    for (const f of ilegiveis) l.push(`  · ${RAIZ_EXPLORE}/${f.documento} — ${f.erro}`);
  }
  if (ausentes.length) {
    l.push('');
    l.push('E ESTES NÃO ESTÃO MAIS NO DISCO — a ausência não impede nada nem quebra a invariante do');
    l.push('carimbo, mas quem abrir o Explore congelado precisa saber que sumiram:');
    for (const n of ausentes) {
      const nota = DOCS_OPCIONAIS.has(n)
        ? ' — opcional; a ausência exige dispensa no `gaps.md`'
        : ' — OBRIGATÓRIO; não achá-lo aqui não é normal';
      l.push(`  · ${RAIZ_EXPLORE}/${n}${nota}`);
    }
  }
  if (semCarimbo.length) {
    l.push('');
    l.push('O marcador quer dizer "foi conferido que todos receberam o carimbo" — e aqui não foi. As');
    l.push('duas representações do congelamento discordam. A causa comum é marcador criado À MÃO, que');
    l.push('é o que a rule do Plan proíbe justamente por isto.');
    l.push('O QUE FAZER: a trava já está ligada, e por isso este comando não conserta sozinho —');
    l.push('carimbar agora seria escrever no Explore congelado. A sequência que acerta é remover');
    l.push(`\`${MARCADOR_CONGELAMENTO}\` e rodar \`--congelar\` de novo: ele carimba o que falta,`);
    l.push('confere, e recria o marcador. Se em vez disso o Explore deve ficar como está, saiba que');
    l.push('os documentos acima seguem sem a linha que conta essa história ao leitor.');
  } else if (ilegiveis.length) {
    l.push('');
    l.push('O QUE FAZER: confira o arquivo à mão — permissão, sync do OneDrive em andamento — e rode');
    l.push('`--congelar` de novo depois; este caminho só relê, nunca escreve.');
  }
  return l.join('\n');
}

// ————————————————————————————— saída legível —————————————————————————————

/**
 * A linha do "li N de M documentos do `outputs/explore/`" e a leitura dela — o sinal mais direto
 * para separar as DUAS causas de artefato ausente, e o que faltava nas mensagens.
 *
 * `0 de 5` É `cwd` ERRADA; `5 de 5` É FASE. Sem este número, o consultor que errou o diretório e o
 * consultor cujo projeto ainda não chegou na `spec-product` recebem exatamente a mesma mensagem e
 * têm que adivinhar qual dos dois são. Vazio quando o chamador não informou (os testes de unidade),
 * porque número inventado aqui é pior do que linha ausente.
 */
function linhasDoExplore(r, recuo = '') {
  if (!r.docsExplore) return [];
  const { lidos, total } = r.docsExplore;
  return [
    `${recuo}Li ${lidos} de ${total} documentos do \`outputs/explore/\` — é o número que separa as causas:`,
    `${recuo}   · 0 de ${total} → o DIRETÓRIO está errado; rode de novo na raiz (a que contém \`outputs/\`);`,
    `${recuo}   · ${total} de ${total} → o diretório está certo, e o artefato ainda não foi escrito.`,
  ];
}

/**
 * O aviso de UM artefato ausente. Um por artefato, e ANTES de qualquer categoria.
 *
 * A MENSAGEM TEM QUE BASTAR: nomeia o arquivo, quais categorias foram suprimidas e por quê, o que
 * continua valendo, e o que fazer agora — quem recebe isto precisa decidir sem abrir este código.
 * O caminho procurado e a contagem do Explore saem quando o chamador os informou (`relatorioDe`
 * sempre informa); montá-los aqui seria inventar caminho e número.
 */
function avisoDeAusencia(r, chave) {
  const l = [];
  const nome = ARTEFATOS_DE_PROMOCAO[chave];
  const caminho = r.caminhos && r.caminhos[chave];
  const suprimidas = CATEGORIAS_POR_ARTEFATO[chave].map((c) => ROTULO_DA_CATEGORIA[c]).join(', ');
  l.push(`── NÃO LI O \`${nome}\` — e o que falta abaixo é consequência disso, não achado`);
  if (caminho) l.push(`   Procurei exatamente aqui: ${caminho}`);
  for (const linha of linhasDoExplore(r, '   ')) l.push(linha);
  l.push('   SUPRIMI as categorias que saem dele, e NÃO as zerei — `0` leria como "nada faltando",');
  l.push('   e a verdade é que não houve medição. Elas saem como `n/d` no resumo acima:');
  l.push(`      · ${suprimidas}`);
  if (chave === 'requisitos') {
    l.push('   POR QUE: este arquivo É o backlog, e é o único lugar onde um fato ganha consumidor.');
    l.push('   Sem ele, TODO `RF-nnn`/`RN-nnn` do Explore cairia em "órfão" e TODO fato em "colhido');
    l.push('   e esquecido" pela mesma razão — não existe nada que pudesse tê-los consumido. E');
    l.push('   "órfão" quer dizer "não chegou ao backlog": o backlog é justamente o que falta.');
    l.push('   CONTINUA VALENDO âncora não rastreável, que sai inteira do `context-map.md` — a');
    l.push('   pergunta "consigo seguir esta âncora de volta?" não menciona requisito nenhum. Se');
    l.push('   houver alguma, ela sai abaixo, e consertá-la agora adianta o cruzamento de depois.');
    l.push('   O QUE FAZER: rode a `spec-product` (ou confira o diretório, acima) e rode isto de');
    l.push('   novo. Até então, este relatório não tem o que dizer sobre cobertura.');
  } else {
    l.push('   POR QUE: este arquivo é a única fonte de fato e de âncora. Sem ele não há `F-xxx`');
    l.push('   para cruzar nem âncora para seguir, e a lista de órfãos sairia com TODO');
    l.push('   `RF-nnn`/`RN-nnn` do Explore dentro — efeito da ausência, não descarte de escopo.');
    l.push('   CONTINUA VALENDO divergência de rastreio, que é interna ao `requirements.md` (a');
    l.push('   tabela contra o bloco) e não olha fato do mapa de contexto. Se houver alguma, ela');
    l.push('   sai abaixo.');
    l.push('   O QUE FAZER: o `requirements.md` foi escrito sem o mapa de contexto da');
    l.push('   `spec-ingest`, ou o mapa saiu do lugar. Reponha-o (ou confira o diretório, acima) e');
    l.push('   rode isto de novo.');
  }
  l.push('');
  return l;
}

export function formatarTexto(r) {
  const l = [];
  const suprimidos = r.suprimidos || [];
  const ausentes = r.ausentes || [];
  l.push('COBERTURA DE PROMOÇÃO — Explore → Plan');
  l.push('');
  // `n/d` E NÃO `0` NA CATEGORIA SUPRIMIDA. "órfãos: 0" é afirmação sobre o projeto, e seria falsa:
  // o número não foi medido, porque a fonte dele não foi lida. Ver `CATEGORIAS_POR_ARTEFATO`.
  const conta = (k) => (suprimidos.includes(k) ? 'n/d' : String(r[k].length));
  const resumo = Object.entries(ROTULO_DA_CATEGORIA)
    .map(([k, rotulo]) => `${rotulo}: ${conta(k)}`)
    .join(' · ');
  l.push(resumo.charAt(0).toUpperCase() + resumo.slice(1));
  if (suprimidos.length) {
    l.push('`n/d` = NÃO DETERMINADO: a fonte daquela categoria não foi lida. Não é zero. Ver o(s)');
    l.push('aviso(s) abaixo.');
  }
  l.push('');

  // "NÃO ACHEI ARTEFATO" É A PRIMEIRA PERGUNTA, e ela sai ANTES de qualquer categoria: sem os dois
  // artefatos do Plan, todo ID do Explore cai em `orfaos` por construção, e listá-los seria dar
  // aparência de autoridade a uma lista que não mediu nada.
  if (r.semArtefatos) {
    l.push('NENHUM ARTEFATO DO PLAN FOI LIDO — este relatório NÃO diz que está tudo certo.');
    l.push('Não há número para ler acima: `n/d` é "não cheguei a medir", e não "zero achados".');
    l.push('');
    l.push('Procurei exatamente estes dois arquivos:');
    for (const c of [r.caminhos && r.caminhos.contextMap, r.caminhos && r.caminhos.requisitos]) {
      if (c) l.push(`   · ${c}`);
    }
    l.push('');
    for (const linha of linhasDoExplore(r)) l.push(linha);
    l.push('');
    l.push('Nenhum dos dois existe, ou os dois estão vazios. A causa comum é o DIRETÓRIO: este é um');
    l.push('executável de mão e monta os caminhos a partir de onde foi chamado. Confira se os');
    l.push('caminhos acima são os do seu projeto — se não forem, rode de novo na raiz (a que contém');
    l.push('`outputs/`). Se forem, a `spec-product` ainda não escreveu estes artefatos.');
    return l.join('\n');
  }

  // UM AVISO POR ARTEFATO AUSENTE, e as categorias que ele alimenta já vieram vazias de `cruzar`.
  for (const chave of ausentes) for (const linha of avisoDeAusencia(r, chave)) l.push(linha);

  // O `business-rules.md` NÃO LIDO NÃO SUPRIME NADA (D14) — ele é complementar, ver
  // `REGRAS_DE_PROMOCAO` no kit —, mas muda o que «órfão» quer dizer para as RN, e isso tem que estar
  // escrito antes da lista. Só sai quando o `requirements.md` FOI lido: sem ele, o aviso de cima já
  // diz que não há o que medir sobre consumo, e esta linha seria ruído.
  if (r.regrasLidas === false && !ausentes.includes('requisitos')) {
    l.push(`── NÃO LI O \`${REGRAS_DE_PROMOCAO}\` — as regras novas (\`RN-NOVO-…\`) não entraram como consumidoras`);
    if (r.caminhos && r.caminhos.regras) l.push(`   Procurei exatamente aqui: ${r.caminhos.regras}`);
    l.push('   Uma RN do Explore cuja regra promovida só existe nele sai abaixo como órfã por ISTO, e não');
    l.push('   por descarte. Rode a `spec-product` (ela escreve o arquivo) e rode isto de novo.');
    l.push('');
  }

  // E SE O QUE SOBROU NÃO ACHOU NADA, ISSO TAMBÉM PRECISA SER DITO. Sem esta frase, o relatório
  // degradado terminaria no aviso e o silêncio abaixo dele leria como "e no resto está tudo bem" —
  // que é a mentira que este arquivo inteiro existe para não contar.
  const achados = r.orfaos.length + r.ancorasNaoRastreaveis.length
    + r.fatosSemConsumidor.length + r.divergenciasDeRastreio.length;
  if (ausentes.length && !achados) {
    l.push('Nas categorias que SOBRARAM, não achei nada — e isto NÃO é atestado de saúde: as');
    l.push('suprimidas acima continuam sem medição nenhuma.');
    l.push('');
  }

  if (r.tudoFechado) {
    l.push('Nada a justificar NO QUE FOI MEDIDO: todo RF-nnn e RN-nnn do Explore chegou ao backlog');
    l.push(`do Plan por âncora rastreável, e os ${r.fatosMedidos} fato(s) ancorado(s) em documento do`);
    l.push('Explore têm consumidor.');
    l.push('');
    l.push('NÃO foi medido: fato cuja âncora é transcrição, PDF ou outra fonte de fora do Explore, nem');
    l.push('fato ancorado numa seção do Explore que não tem ID (persona, premissa técnica). A âncora');
    l.push('dele é legítima e não há ID do Explore para cruzar — este relatório não tem o que dizer');
    l.push('sobre ele, nem a favor nem contra.');
    l.push('');
  }

  if (r.orfaos.length) {
    l.push('── ÓRFÃOS — o relatório não conseguiu ligar estes IDs do Explore a requisito do Plan');
    l.push('   DUAS FORMAS DE CAIR AQUI, e elas pedem consertos diferentes:');
    l.push('   (1) nenhum fato do `context-map.md` tem âncora rastreável carregando este ID; ou');
    l.push('   (2) existe fato com âncora rastreável carregando o ID, mas NENHUM requisito do Plan');
    l.push('       cita esse fato — a âncora está certa, o que falta é o consumo.');
    l.push('   Descarte pode ser legítimo (o cliente cortou escopo), e por isso isto NÃO bloqueia.');
    l.push('   O que a Decisão 15 exige é uma linha no `gaps.md` dizendo o que aconteceu com cada um.');
    for (const id of r.orfaos) l.push(`   · ${id}`);
    l.push('');
  }

  if (r.ancorasNaoRastreaveis.length) {
    l.push('── ÂNCORA NÃO RASTREÁVEL — o relatório não consegue seguir estes fatos de volta');
    l.push('   ISTO NÃO É DESCARTE. A âncora está vazia ou cita um documento do Explore sem');
    l.push('   carregar o ID — a forma `linha`, que a `.claude/rules/harness/plan.md` proíbe');
    // "ÓRFÃO PODE SER EFEITO DISTO", e não "parte dos órfãos ACIMA": faltando o `requirements.md`,
    // a lista de órfãos é suprimida e não sai acima — a frase antiga mandava o leitor procurar uma
    // seção que não está lá.
    l.push('   porque ela morre no primeiro rework. Conserte a âncora e rode de novo: órfão pode');
    l.push('   ser efeito disto, e não perda de escopo.');
    l.push('   Forma correta: `<arquivo> §<seção> <ID>` — ex.: `especificacao-funcional.md §3 RF-007`.');
    // A SEGUNDA FORMA (D12): sem ela, a mensagem mandava pendurar um ID qualquer na âncora de uma
    // persona — rastreio inventado. Ela só vale quando a seção existe e não tem ID, e é por isso que
    // a âncora `§2 Telas` de uma tabela que cita RF continua aqui.
    l.push('   Seção SEM ID (personas, telas que não citam RF, especificação técnica):');
    l.push('   `<arquivo> §<seção>` — ex.: `especificacao-funcional.md §1.1 Vendedor`. Vale quando a');
    l.push('   seção existe no documento e nenhum MOD, RF ou RN aparece nela.');
    for (const a of r.ancorasNaoRastreaveis) l.push(`   · ${a.id} → ${a.ancora ? `"${a.ancora}"` : '(vazia)'}`);
    l.push('');
  }

  if (r.fatosSemConsumidor.length) {
    l.push('── FATO SEM CONSUMIDOR — ancorado no Explore, e nenhum requisito do Plan o cita');
    l.push('   O fato foi colhido e esquecido: nem `RF-MOD-…`, nem `RN-NOVO-…`, nem `RNF-…` o');
    l.push('   referencia.');
    for (const f of r.fatosSemConsumidor) l.push(`   · ${f}`);
    l.push('');
  }

  if (r.divergenciasDeRastreio.length) {
    l.push('── DIVERGÊNCIA DE RASTREIO — os dois sites do `requirements.md` discordam');
    l.push('   A tabela `## Rastreabilidade global` e a linha `**Rastreabilidade:**` do bloco do');
    // "O CRUZAMENTO USA", e não "a cobertura ACIMA usou": faltando o `context-map.md`, a cobertura
    // é suprimida e não sai acima — a frase antiga apontava para uma seção que não está lá.
    l.push('   requisito listam fatos diferentes. O cruzamento usa a UNIÃO dos dois sites; isto');
    l.push('   aqui é o que sobra para alguém decidir.');
    for (const d of r.divergenciasDeRastreio) {
      const partes = [];
      if (d.soNaTabela.length) partes.push(`só na tabela: ${d.soNaTabela.join(', ')}`);
      if (d.soNoBloco.length) partes.push(`só no bloco: ${d.soNoBloco.join(', ')}`);
      l.push(`   · ${d.requisito} — ${partes.join(' | ')}`);
    }
    l.push('');
  }

  if (r.cobertos.length) {
    l.push('── COBERTOS');
    for (const c of r.cobertos) l.push(`   · ${c.id} → ${c.fatos.join(', ')} → ${c.requisitos.join(', ')}`);
  }
  return l.join('\n').replace(/\n+$/, '');
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * A casca de uma FERRAMENTA, e por isso ela ESCREVE — o que nenhum verificador pode fazer
 * (Decisão 20). Os nomes que coincidem com o `IO_REAL` do `pretooluse.mjs` têm a mesma forma de
 * propósito: um dublê escrito para um serve para o outro.
 *
 * A escrita entrou aqui pelo modo `--congelar`, e só ele a usa: o modo relatório continua sem
 * produzir arquivo nenhum, e há teste que roda o executável de verdade para prender isso.
 */
export const IO_REAL = {
  cwd: () => process.cwd(),
  lerArquivo: readFileSync,
  escrever: (caminho, texto) => writeFileSync(caminho, texto, 'utf8'),
  criarDiretorio: (caminho) => mkdirSync(caminho, { recursive: true }),
  existe: existsSync,
};

/**
 * O conteúdo do arquivo, ou string vazia se ele não existe.
 *
 * O CONJUNTO DE CÓDIGOS VEM DO KIT (`CODIGOS_DE_AUSENCIA_DE_DOCUMENTO`) e não é copiado aqui: o
 * JSDoc daquela constante registra que esta mesma cópia literal já foi consolidada uma vez neste
 * repositório, com a medição — remover `EISDIR` da cópia do `sync-log` sobrevivia à suíte inteira.
 * Não é o mesmo conjunto de quem anda por DIRETÓRIO (`inventariar` e o `carregarDocs` do
 * `revisao.mjs` cortam em `ENOENT`/`ENOTDIR` e param aí): a pergunta aqui é sobre DOCUMENTO, e
 * um diretório chamado `context-map.md` é a inexistência do documento sob outra forma.
 *
 * Qualquer outro erro SOBE. Um relatório que engole `EACCES` reporta órfão onde há arquivo
 * ilegível — e no setup real deste usuário o `EBUSY`/`EPERM` do sync do OneDrive não é exótico.
 */
const lerOuVazio = (io, caminho) => {
  try {
    return io.lerArquivo(caminho, 'utf8');
  } catch (erro) {
    if (ehAusenciaDeDocumento(erro)) return '';
    throw erro;
  }
};

/**
 * Os textos dos oito arquivos que o cruzamento lê, e os caminhos de onde eles vieram.
 *
 * OS CAMINHOS SAEM DAQUI porque o relatório precisa NOMEÁ-LOS quando não acha nada: quem errou a
 * `cwd` só reconhece o erro vendo o caminho que foi procurado. E os subdiretórios não são enfeite
 * — `ARTEFATOS_DE_PROMOCAO.requisitos` é `requirements/requirements.md`, e ler a raiz do
 * `outputs/spec/` em vez dela devolveria vazio e reportaria TODOS os requisitos como órfãos.
 *
 * O OITAVO É O `business-rules.md` (D14), lido por último: é onde as RN-NOVO consomem fato. Ver
 * `REGRAS_DE_PROMOCAO` no kit para a razão de ele não estar em `ARTEFATOS_DE_PROMOCAO`.
 */
export function coletar(raiz, io) {
  const base = raiz || '.';
  const caminhos = {
    contextMap: join(base, RAIZ_SPEC, ARTEFATOS_DE_PROMOCAO.contextMap),
    requisitos: join(base, RAIZ_SPEC, ARTEFATOS_DE_PROMOCAO.requisitos),
    regras: join(base, RAIZ_SPEC, REGRAS_DE_PROMOCAO),
  };
  const docsExplore = new Map();
  for (const d of DOCS_EXPLORE) {
    const texto = lerOuVazio(io, join(base, RAIZ_EXPLORE, d.caminho));
    if (texto) docsExplore.set(d.caminho, texto);
  }
  return {
    docsExplore,
    caminhos,
    contextMap: lerOuVazio(io, caminhos.contextMap),
    requisitos: lerOuVazio(io, caminhos.requisitos),
    regras: lerOuVazio(io, caminhos.regras),
  };
}

export function relatorioDe(raiz, io) {
  const { docsExplore, caminhos, contextMap, requisitos, regras } = coletar(raiz, io);
  // AS RN-NOVO ENTRAM NO MESMO `porFato` DOS RF (D14): «quem consome este fato» é uma pergunta só,
  // e o `cruzar` não precisa saber de que arquivo veio o consumidor. As divergências continuam só
  // do `requirements.md` — elas comparam os dois sites DELE.
  const consumos = lerConsumos(requisitos);
  for (const [fato, regrasQueConsomem] of lerConsumosDeRegras(regras)) {
    if (!consumos.porFato.has(fato)) consumos.porFato.set(fato, new Set());
    for (const rn of regrasQueConsomem) consumos.porFato.get(fato).add(rn);
  }
  return cruzar({
    idsExplore: idsDoExplore(docsExplore),
    fatos: lerFatos(contextMap),
    consumos,
    // `docsLidos` VAI JUNTO porque é o que a mensagem de artefato ausente usa para separar "errei
    // o diretório" de "a fase ainda não chegou" — as duas causas que produzem a mesma ausência.
    artefatos: { contextMap, requisitos, regras, caminhos, docsLidos: docsExplore.size },
    docsExplore,
  });
}

/**
 * A data de hoje, `AAAA-MM-DD`, em HORA LOCAL. Fica na casca porque relógio é I/O, e o núcleo recebe
 * `hoje` injetado.
 *
 * LOCAL, E NÃO UTC — decisão do dono do projeto, e ela é a razão de a formatação sair dos
 * componentes `getFullYear`/`getMonth`/`getDate` em vez de `toISOString`, que converte para UTC
 * antes de cortar. O carimbo é PROSA PARA HUMANO, num documento que o cliente lê e que vira
 * histórico versionado: em UTC, quem carimba às 21h em Brasília grava a data de AMANHÃ, e quem abrir
 * o arquivo amanhã lê uma data que não foi o dia em que aquilo aconteceu.
 *
 * NENHUM CONSUMIDOR COMPARA ESTA DATA, e é isso que torna a troca segura. `lerCarimbo` a CAPTURA e
 * devolve; nada neste repositório a compara com outra data, ordena por ela, nem decide coisa alguma
 * a partir dela — não há, portanto, decisão de máquina que dependa do fuso. Não "conserte" isto de
 * volta para UTC por parecer mais canônico: a escolha foi feita sabendo das duas coisas.
 *
 * Exportada só para teste — o `main` é o único chamador de produção, e sempre sem argumento.
 */
export const hojeISO = (agora = new Date()) => {
  const dois = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
};

function main(argv) {
  const io = IO_REAL;
  const raiz = io.cwd();
  const json = argv.includes('--json');

  if (argv.includes('--congelar')) {
    const r = congelar(raiz, io, hojeISO());
    process.stdout.write((json ? JSON.stringify(r, null, 2) : formatarCongelamento(r)) + '\n');
    // MESMO NO MODO QUE ESCREVE, SEMPRE 0 — mas por outra razão que no modo relatório: aqui a
    // recusa é um resultado legítimo e completo, não um erro do comando. Quem quiser tratar
    // programaticamente lê o `acao` do `--json`, e há teste que roda o executável para prender que
    // esta frase é verdade.
    return 0;
  }

  const r = relatorioDe(raiz, io);
  // Sem replacer: o retorno de `cruzar` não tem `Set` nem `Map` — `cobertos[].requisitos` já sai
  // array e `consumos` nunca entra no objeto. Se o `--json` voltar a carregar coleção, o replacer
  // volta junto, com consumidor.
  process.stdout.write((json ? JSON.stringify(r, null, 2) : formatarTexto(r)) + '\n');
  // SEMPRE 0. Ver o cabeçalho: limiar vira alvo.
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
